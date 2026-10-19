import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CircularTimer from './CircularTimer';
import { CustomSoundFile } from '../types';
import { playSound, playAnnouncer, CORRECT_SOUNDS, ANNOUNCER_CALLOUTS, ANNOUNCER_STREAK_MILESTONES } from '../constants';
import { getVietnameseMeaning } from '../vietnameseMeanings';
import {
  buildLetterBoxes,
  buildSpellingHint,
  checkSpokenAnswer,
  createSoloSequence,
  dailySeed,
  isExactSoloAnswer,
  letterCount,
  seededRng,
  shortLevel,
  soloStreakBonus,
  SOLO_CORRECT_POINTS,
  SOLO_FREE_SKIPS,
  SOLO_HEART_MILESTONES,
  SOLO_MIN_SCORE,
  SOLO_START_HEARTS,
  SOLO_STYLE_TIME,
  SOLO_WRONG_PENALTY,
  type SoloRunResult,
  type SoloSequence,
  type SoloStyle,
  type SoloTrack,
  type SoloWord,
} from '../services/solo';
import type { HintClue } from '../hintClues.generated';
import { monthId } from '../services/periods';
import { addMissedWords, markReviewCorrect, readDueReviews, REVIEW_PER_RUN } from '../services/review';
import { Icon } from './Icon';
import { SpeakButton } from './SpeakButton';
import { stopSpeaking } from '../services/speech';
import { cloudSpeechSupported, listenOnce, type CloudListen } from '../services/asr';

interface SoloGameScreenProps {
  track: SoloTrack;
  /** Which skill this run trains: an English clue first, or the Vietnamese gloss first. */
  style: SoloStyle;
  effectsVolume: number;
  customCorrectSounds: CustomSoundFile[];
  /** Set for Today's Challenge: the run is seeded from this day id and posts to the daily board. */
  dailyDateId?: string;
  onEnd: (result: SoloRunResult) => void;
  onExit: () => void;
}

type Phase = 'guessing' | 'correct' | 'revealed';

interface SoloStats {
  hearts: number;
  score: number;
  streak: number;
  bestStreak: number;
  guessed: number;
  /** Words resolved so far (guessed, skipped or timed out). */
  played: number;
  freeSkips: number;
  /** How many heart milestones have already paid out. */
  milestones: number;
  /** Help rungs opened this run: hints and Vietnamese glosses. */
  hints: number;
}

const pick = <T,>(items: T[]): T | undefined =>
  items.length ? items[Math.floor(Math.random() * items.length)] : undefined;

// ── Speech input ───────────────────────────────────────────────────────────
// Voice used to be one fragile utterance per tap: on Android the recognition object
// would occasionally never fire `onstart`, leaving the button looking frozen, and
// nothing released it when the word changed. This is now a small state machine — every
// session is created fresh, a watchdog kills one that never starts or never ends, and
// the run can listen hands-free so the player is not tapping per word.
//
// There are two tiers behind the same interface. Tier 1 is the Web Speech API, which
// answers inside the browser for free and is what Chrome, Edge and Safari get. Tier 2,
// used only when `SpeechRecognition` is missing (Firefox, older Android WebViews),
// records a short clip and has it transcribed by the worker — see services/asr.ts.
interface SpeechInput {
  supported: boolean;
  listening: boolean;
  /** A clip is being transcribed on the worker; the mic is already closed. */
  transcribing: boolean;
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  /** Hard reset: drop any session and clear status (used when the word changes). */
  reset: () => void;
  clearError: () => void;
}

/** No `onstart` within this long → the engine is dead on this device; stop pretending.
 *  Generous on purpose: a cold engine on a budget Android phone can take a couple of
 *  seconds, and killing it there is one of the ways the mic used to feel unresponsive. */
const SPEECH_START_WATCHDOG_MS = 3200;
/** Safety stop, so a session that never ends cannot hang "Listening…" forever. */
const SPEECH_MAX_LISTEN_MS = 15000;
/** First gap before hands-free mode reopens the mic after a session ends. */
const SPEECH_AUTO_RESTART_MS = 300;
/**
 * Cap on consecutive hands-free restarts. High enough that a player who pauses to think
 * is never cut off — Chrome ends a silent session after a few seconds — while a truly
 * broken engine still cannot spin forever.
 */
const SPEECH_MAX_AUTO_RESTARTS = 60;

/**
 * Mic permission state when the browser exposes it, 'unknown' otherwise. Needed because a
 * first-run permission dialog also delays `onstart` — the start watchdog must not mistake
 * a pending prompt for a dead engine.
 */
const micPermissionState = async (): Promise<string> => {
  const permissions = (navigator as unknown as { permissions?: { query?: (d: unknown) => Promise<{ state: string }> } })
    ?.permissions;
  if (!permissions?.query) return 'unknown';
  try {
    const status = await permissions.query({ name: 'microphone' });
    return status.state;
  } catch {
    return 'unknown';
  }
};

const useSpeechInput = (
  onFinal: (text: string, alternatives: string[]) => void,
  autoListenRef: React.MutableRefObject<boolean>,
): SpeechInput => {
  const Ctor =
    typeof window !== 'undefined'
      ? ((window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any })
          .SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition)
      : undefined;
  // Tier 1 is the browser engine; tier 2 is the worker, and only for devices without it.
  const browserTier = Boolean(Ctor);
  const cloudTier = !browserTier && cloudSpeechSupported();
  const supported = browserTier || cloudTier;

  const recRef = useRef<any>(null);
  const cloudRef = useRef<CloudListen | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const watchdogRef = useRef<number | null>(null);
  const maxListenRef = useRef<number | null>(null);
  const restartRef = useRef<number | null>(null);
  const autoRestartsRef = useRef(0);
  const manualStopRef = useRef(false);

  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);

  const clearTimers = useCallback(() => {
    if (watchdogRef.current !== null) {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
    if (maxListenRef.current !== null) {
      window.clearTimeout(maxListenRef.current);
      maxListenRef.current = null;
    }
    if (restartRef.current !== null) {
      window.clearTimeout(restartRef.current);
      restartRef.current = null;
    }
  }, []);

  /** Retry gaps grow gently, so a flaky engine backs off instead of hammering the mic. */
  const restartDelay = useCallback(
    (): number => Math.min(1200, SPEECH_AUTO_RESTART_MS + autoRestartsRef.current * 120),
    [],
  );

  const teardown = useCallback(() => {
    clearTimers();
    const rec = recRef.current;
    recRef.current = null;
    if (rec) {
      try {
        rec.abort?.();
      } catch {
        /* already stopped */
      }
    }
    const cloud = cloudRef.current;
    cloudRef.current = null;
    cloud?.cancel();
  }, [clearTimers]);

  // Tier 2: record one clip and let the worker transcribe it. There is no interim
  // transcript and no retry inside a session, so a miss is re-armed by the caller
  // through the same `listenTick` path used after a wrong answer.
  const beginCloud = useCallback(() => {
    manualStopRef.current = false;
    teardown();
    setError(null);
    setInterim('');
    setTranscribing(false);

    const session = listenOnce(() => {
      if (cloudRef.current !== session) return;
      setListening(false);
      setTranscribing(true);
    });
    cloudRef.current = session;
    setListening(true);

    void session.outcome.then((result) => {
      if (cloudRef.current !== session) return;
      cloudRef.current = null;
      setListening(false);
      setTranscribing(false);

      if (result.kind === 'cancelled') return;
      if (result.kind === 'heard') {
        onFinalRef.current(result.transcript, []);
        return;
      }
      if (result.kind === 'mic-blocked') {
        manualStopRef.current = true;
        setError('Microphone access was blocked — allow it or type instead.');
        return;
      }
      if (result.kind === 'network') {
        setError('Couldn’t reach the recogniser — try again, or type your answer.');
        return;
      }
      if (result.kind === 'limited') {
        manualStopRef.current = true;
        setError('Voice answers are resting for now — type your answer instead.');
        return;
      }
      // Nothing was recognised in the clip. Hands-free simply listens again, exactly as a
      // silent browser session does, and without costing a heart.
      if (!autoListenRef.current) {
        setError('Didn’t catch that — try again.');
        return;
      }
      if (autoRestartsRef.current < SPEECH_MAX_AUTO_RESTARTS) {
        autoRestartsRef.current += 1;
        restartRef.current = window.setTimeout(() => {
          if (autoListenRef.current && !manualStopRef.current) beginRef.current(false);
        }, restartDelay());
      }
    });
  }, [teardown, autoListenRef, restartDelay]);

  // `onend` needs to reopen the mic for hands-free mode, so the starter lives in a ref
  // to avoid a declaration cycle. `user` starts a fresh restart budget; hands-free
  // restarts keep theirs so a stuck engine cannot loop forever.
  const beginRef = useRef<(user: boolean) => void>(() => {});

  const begin = useCallback(
    (user: boolean) => {
      // A hands-free re-arm can race the previous session's own `onend`: the first one
      // already reopened the mic, and tearing it down here would clip the player's next
      // word. If a session is alive, there is nothing to re-arm.
      if (!user && (recRef.current || cloudRef.current)) return;
      if (cloudTier) {
        if (user) autoRestartsRef.current = 0;
        beginCloud();
        return;
      }
      if (!Ctor) return;
      manualStopRef.current = false;
      if (user) autoRestartsRef.current = 0;
      teardown();
      setError(null);
      setInterim('');

      let rec: any;
      try {
        rec = new Ctor();
      } catch {
        setError('Could not start the microphone.');
        return;
      }
      recRef.current = rec;
      rec.lang = 'en-US';
      rec.interimResults = true;
      rec.maxAlternatives = 5;
      // Continuous keeps one session open across a pause for thought and across several
      // attempts on the same word. Previously every final result (or a silent timeout)
      // ended the session and the player had to speak again into a fresh mic — which
      // read as "the mic is not sensitive".
      rec.continuous = true;

      rec.onstart = () => {
        if (recRef.current !== rec) return;
        if (watchdogRef.current !== null) {
          window.clearTimeout(watchdogRef.current);
          watchdogRef.current = null;
        }
        setListening(true);
        // The mic is only truly open now, so the safety stop is measured from here.
        maxListenRef.current = window.setTimeout(() => {
          if (recRef.current !== rec) return;
          try {
            rec.stop?.();
          } catch {
            /* already stopping */
          }
        }, SPEECH_MAX_LISTEN_MS);
      };
      rec.onresult = (event: any) => {
        if (recRef.current !== rec) return;
        let finalText = '';
        let interimText = '';
        const alternatives: string[] = [];
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (result.isFinal) {
            finalText += result[0].transcript;
            for (let j = 0; j < result.length; j += 1) {
              if (result[j].transcript) alternatives.push(result[j].transcript);
            }
          } else {
            interimText += result[0].transcript;
          }
        }
        setInterim(finalText ? '' : interimText.trim());
        if (finalText) {
          onFinalRef.current(finalText.trim(), alternatives);
        }
      };
      rec.onerror = (event: any) => {
        if (recRef.current !== rec) return;
        // Any event means the engine is alive — the start watchdog has done its job.
        if (watchdogRef.current !== null) {
          window.clearTimeout(watchdogRef.current);
          watchdogRef.current = null;
        }
        const code = event?.error || '';
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          manualStopRef.current = true;
          setError('Microphone access was blocked — allow it or type instead.');
        } else if (code === 'network') {
          setError('Network hiccup — try again or type your answer.');
        } else if (code === 'no-speech' && !autoListenRef.current) {
          setError('Didn’t catch that — try again.');
        }
        setListening(false);
      };
      rec.onend = () => {
        if (recRef.current !== rec) return;
        recRef.current = null;
        setListening(false);
        clearTimers();
        if (
          autoListenRef.current &&
          !manualStopRef.current &&
          autoRestartsRef.current < SPEECH_MAX_AUTO_RESTARTS
        ) {
          autoRestartsRef.current += 1;
          restartRef.current = window.setTimeout(() => {
            if (autoListenRef.current && !manualStopRef.current) beginRef.current(false);
          }, restartDelay());
        }
      };

      try {
        rec.start();
      } catch {
        recRef.current = null;
        setError('Could not start the microphone.');
        return;
      }

      // `onstart` never firing is what used to leave the button looking frozen. Watch for
      // it — but the browser's permission dialog also delays `onstart`, so while the state
      // is still 'prompt' the check re-arms instead of declaring the device broken.
      const checkStarted = () => {
        if (recRef.current !== rec) return;
        void micPermissionState().then((state) => {
          if (recRef.current !== rec) return;
          if (state === 'prompt') {
            watchdogRef.current = window.setTimeout(checkStarted, SPEECH_START_WATCHDOG_MS);
            return;
          }
          teardown();
          setListening(false);
          setError('Voice input is not responding on this device — type the word instead.');
        });
      };

      watchdogRef.current = window.setTimeout(checkStarted, SPEECH_START_WATCHDOG_MS);
    },
    [Ctor, teardown, autoListenRef, cloudTier, beginCloud, restartDelay],
  );

  beginRef.current = begin;

  const start = useCallback(() => begin(true), [begin]);

  const stop = useCallback(() => {
    manualStopRef.current = true;
    teardown();
    setListening(false);
    setTranscribing(false);
    setInterim('');
  }, [teardown]);

  const reset = useCallback(() => {
    manualStopRef.current = true;
    teardown();
    autoRestartsRef.current = 0;
    setListening(false);
    setTranscribing(false);
    setInterim('');
    setError(null);
  }, [teardown]);

  useEffect(
    () => () => {
      manualStopRef.current = true;
      teardown();
    },
    [teardown],
  );

  return {
    supported,
    listening,
    transcribing,
    interim,
    error,
    start,
    stop,
    reset,
    clearError: () => setError(null),
  };
};

const initialStats = (): SoloStats => ({
  hearts: SOLO_START_HEARTS,
  score: 0,
  streak: 0,
  bestStreak: 0,
  guessed: 0,
  played: 0,
  freeSkips: SOLO_FREE_SKIPS,
  milestones: 0,
  hints: 0,
});

// The rendered clues are about a megabyte of generated text, so they live in their own
// chunk: a meaning-mode run never downloads them, and the browser keeps the module once
// a describe run has fetched it. A failed fetch clears the memo so one bad chunk load
// cannot blank every later word.
let hintBank: Promise<Record<string, HintClue>> | null = null;
const loadHintClue = async (word: string): Promise<HintClue | null> => {
  hintBank ??= import('../hintClues.generated').then((module) => module.HINT_CLUES);
  try {
    return (await hintBank)[word] ?? null;
  } catch {
    hintBank = null;
    return null;
  }
};

export const SoloGameScreen: React.FC<SoloGameScreenProps> = ({
  track,
  style,
  effectsVolume,
  customCorrectSounds,
  dailyDateId,
  onEnd,
  onExit,
}) => {
  // Endless word source, drawn from the track's ladder and stepping up in difficulty.
  // Two things bend the source: Today's Challenge seeds the shuffle from the day id, so
  // every player meets the same words in the same order; a normal run opens with the
  // Memory Anchors the player still has to relearn. A daily run deliberately skips the
  // anchors — they are personal, and the race of the day has to be the same for everyone.
  const seqRef = useRef<SoloSequence | null>(null);
  if (!seqRef.current) {
    const priority = dailyDateId
      ? []
      : readDueReviews()
          .slice(0, REVIEW_PER_RUN)
          .map((item) => ({ word: item.word, level: item.level }));
    const rng = dailyDateId ? seededRng(dailySeed(dailyDateId)) : Math.random;
    seqRef.current = createSoloSequence(track, rng, priority);
  }
  // The board the run posts to is simply the track, and the period is frozen at mount —
  // a run that straddles midnight still scores inside one month (or one day).
  const periodRef = useRef(dailyDateId ?? monthId());
  // Words missed during this run (a timeout, a skip, or the last ladder rung), collected
  // for review. A wrong attempt is recoverable and deliberately not recorded here.
  const missedRef = useRef<SoloWord[]>([]);
  // A described word is two sentences to read before the first key, so the clock is the
  // style's clock, frozen for the run.
  const timePerWord = SOLO_STYLE_TIME[style];

  const [current, setCurrent] = useState<SoloWord>(() => seqRef.current!.next());
  const [wordNo, setWordNo] = useState(1);
  const [phase, setPhase] = useState<Phase>('guessing');
  const [stats, setStats] = useState<SoloStats>(initialStats);
  const [timeLeft, setTimeLeft] = useState(timePerWord);
  const [input, setInput] = useState('');
  const [points, setPoints] = useState<{ value: number; bonus: number; key: number } | null>(null);
  // The gloss ships with the app, so it is ready the moment the word changes — there is
  // nothing to load and no request to race.
  const vietnamese = getVietnameseMeaning(current.word);
  // Describe mode only: the rendered clue, and how far up the help ladder the player is
  // (0 = the description alone, 1 = the contrast hint, 2 = the Vietnamese meaning).
  const [hint, setHint] = useState<HintClue | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [rung, setRung] = useState(0);
  // Wrong attempt: what the player thought they heard/said, and the masked target when
  // the miss was close enough to show which letters landed. Drives both the red flash
  // and the hint line, so a miss is never silent — typed or spoken.
  const [wrong, setWrong] = useState<{ key: number; message: string; hint: string } | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [heartToast, setHeartToast] = useState<number | null>(null);
  // A run is worth a confirmation before it is thrown away: tapping Quit opens an
  // "Quit this run?" overlay and freezes the clock while it is up.
  const [confirmQuit, setConfirmQuit] = useState(false);
  // The run also freezes itself the moment the page is hidden (switching apps, locking the
  // phone), so the clock never drains while the player is not looking.
  const [autoPaused, setAutoPaused] = useState(false);
  // Any overlay freezes the clock and blocks round input.
  const overlayOpen = confirmQuit || autoPaused;
  // Hands-free mode: the mic reopens by itself on every new word (and after a miss), so
  // the player does not tap per word. `listenTick` re-arms it after a wrong spoken answer.
  const [autoListen, setAutoListen] = useState(false);
  const [listenTick, setListenTick] = useState(0);

  const answer = current.word;
  const letterGroups = useMemo(() => buildLetterBoxes(answer), [answer]);
  const totalLetters = useMemo(() => letterCount(answer), [answer]);
  const longestGroup = useMemo(
    () => letterGroups.reduce((max, group) => Math.max(max, group.length), 0),
    [letterGroups],
  );
  const boxClass =
    longestGroup <= 5
      ? 'h-14 w-11 text-3xl'
      : longestGroup <= 8
        ? 'h-12 w-9 text-2xl'
        : 'h-10 w-7 text-xl';

  // Refs mirror the latest values for the timer / speech callbacks.
  const statsRef = useRef<SoloStats>(stats);
  const phaseRef = useRef(phase);
  const currentRef = useRef(current);
  const autoListenRef = useRef(autoListen);
  const resolvedRef = useRef(false);
  const endedRef = useRef(false);
  const levelRef = useRef(current.level);
  const maxBandRef = useRef(track.levels.indexOf(current.level));
  const advanceTimer = useRef<number | null>(null);
  const bannerTimer = useRef<number | null>(null);
  const toastTimer = useRef<number | null>(null);
  const wrongTimer = useRef<number | null>(null);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { currentRef.current = current; }, [current]);
  useEffect(() => { autoListenRef.current = autoListen; }, [autoListen]);
  useEffect(() => () => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    if (bannerTimer.current) window.clearTimeout(bannerTimer.current);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    if (wrongTimer.current) window.clearTimeout(wrongTimer.current);
    // Leaving the run must not leave a pronunciation talking over the results screen.
    stopSpeaking();
  }, []);

  // Updates state and the mirror together so the timer callbacks never read stale values.
  const applyStats = useCallback((updater: (prev: SoloStats) => SoloStats) => {
    const next = updater(statsRef.current);
    statsRef.current = next;
    setStats(next);
  }, []);

  // A missed word becomes a Memory Anchor twice over: it joins the run's review list for
  // the results screen, and it is written to the local anchor store so the next run
  // serves it back. Written per miss rather than at the end, so quitting mid-run still
  // keeps the words the player struggled with.
  const noteMiss = useCallback(() => {
    const word = currentRef.current;
    if (!missedRef.current.some((item) => item.word === word.word)) missedRef.current.push(word);
    addMissedWords([word]);
  }, []);

  const showBanner = useCallback((text: string) => {
    setBanner(text);
    if (bannerTimer.current) window.clearTimeout(bannerTimer.current);
    bannerTimer.current = window.setTimeout(() => setBanner(null), 1800);
  }, []);

  const showHeartToast = useCallback(() => {
    setHeartToast(Date.now());
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setHeartToast(null), 1800);
  }, []);

  /**
   * The visible half of a miss: the screen pulses red, the letter boxes shake, and the
   * hint line says what landed (the heard transcript, or the masked letters). A wrong
   * guess stays recoverable — it never costs a heart — but it must never feel ignored.
   */
  const showWrong = useCallback((message: string, hint = '') => {
    setWrong({ key: Date.now(), message, hint });
    if (wrongTimer.current) window.clearTimeout(wrongTimer.current);
    wrongTimer.current = window.setTimeout(() => setWrong(null), 2400);
  }, []);

  /** Blanks are spaced out so kept letters read as chunks: "televi_ion" → "televi _ ion". */
  const prettifyMask = (mask: string) =>
    mask.replace(/_+/g, (run) => ` ${run.split('').join(' ')} `).trim();

  // `handleCorrect` needs to stop the mic, but the mic hook is created below it —
  // the stop function is reached through a ref to avoid a declaration cycle.
  const speechStopRef = useRef<() => void>(() => {});
  const speechStartRef = useRef<() => void>(() => {});
  // Hard reset (drop the session, clear status) — fired when a new word is dealt, so a
  // stale "Listening…" or a wedged session can never leak into the next word.
  const speechResetRef = useRef<() => void>(() => {});

  const endGame = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    speechStopRef.current();
    const s = statsRef.current;
    onEnd({
      trackId: track.id,
      boardId: track.id,
      period: periodRef.current,
      style,
      score: s.score,
      wordsGuessed: s.guessed,
      bestStreak: s.bestStreak,
      hintsUsed: s.hints,
      wordsPlayed: s.played,
      levelReached: levelRef.current,
      timePerWord,
      missedWords: missedRef.current,
    });
  }, [onEnd, track.id, style, timePerWord]);

  const scheduleAdvance = useCallback(
    (delay: number) => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
      advanceTimer.current = window.setTimeout(() => {
        if (statsRef.current.hearts <= 0) {
          endGame();
          return;
        }
        const nextWord = seqRef.current!.next();
        const bandIndex = track.levels.indexOf(nextWord.level);
        if (bandIndex > maxBandRef.current) {
          maxBandRef.current = bandIndex;
          showBanner(`⬆️ Level up — ${shortLevel(nextWord.level)}`);
        }
        levelRef.current = nextWord.level;
        resolvedRef.current = false;
        // Wipe the speech state as the new word is dealt — hands-free mode then reopens
        // the mic from a clean session instead of inheriting the previous word's.
        speechResetRef.current();
        setCurrent(nextWord);
        setWordNo((n) => n + 1);
        setPhase('guessing');
        setInput('');
        setTimeLeft(timePerWord);
        setPoints(null);
        // The help ladder starts over with the word: the old clue and the old rung must
        // never appear over the new word, even for a frame.
        setHint(null);
        setRung(0);
        setWrong(null);
      }, delay);
    },
    [endGame, showBanner, track.levels, timePerWord],
  );

  const handleCorrect = useCallback(
    () => {
      if (resolvedRef.current || phaseRef.current !== 'guessing') return;
      resolvedRef.current = true;

      const s = statsRef.current;
      const nextStreak = s.streak + 1;
      const bonus = soloStreakBonus(nextStreak);
      const gained = SOLO_CORRECT_POINTS + bonus;

      let hearts = s.hearts;
      let milestones = s.milestones;
      let heartGained = false;
      while (milestones < SOLO_HEART_MILESTONES.length && s.score + gained >= SOLO_HEART_MILESTONES[milestones]) {
        if (hearts < SOLO_START_HEARTS) {
          hearts += 1;
          heartGained = true;
        }
        milestones += 1;
      }

      applyStats((prev) => ({
        ...prev,
        score: prev.score + gained,
        hearts,
        milestones,
        streak: nextStreak,
        bestStreak: Math.max(prev.bestStreak, nextStreak),
        guessed: prev.guessed + 1,
        played: prev.played + 1,
      }));

      if (heartGained) showHeartToast();

      setPhase('correct');
      setWrong(null);
      // Echo the target, never the raw answer: both typed near-misses and accepted
      // homophones are marked correct, and the field must then read the word the
      // player was actually guessing.
      setInput(currentRef.current.word);
      setPoints({ value: gained, bonus, key: Date.now() });
      speechStopRef.current();
      // Getting it right pushes an anchored word one rung up the review ladder.
      markReviewCorrect(currentRef.current.word);
      const sound = pick(customCorrectSounds)?.data || pick(CORRECT_SOUNDS);
      if (sound) playSound(sound, effectsVolume);
      // Pre-rendered announcer callout on the same streak ladder as the shared modes.
      const callout =
        nextStreak === ANNOUNCER_STREAK_MILESTONES.UNSTOPPABLE
          ? ANNOUNCER_CALLOUTS.UNSTOPPABLE
          : nextStreak === ANNOUNCER_STREAK_MILESTONES.ON_FIRE
            ? ANNOUNCER_CALLOUTS.ON_FIRE
            : nextStreak === ANNOUNCER_STREAK_MILESTONES.COMBO
              ? ANNOUNCER_CALLOUTS.COMBO
              : null;
      if (callout) playAnnouncer(callout, effectsVolume);
      scheduleAdvance(1000);
    },
    [applyStats, customCorrectSounds, effectsVolume, scheduleAdvance, showHeartToast],
  );

  // A wrong guess is not a failure state for either input: the word stays open, nothing
  // is deducted, and the clock is the only cost. It still gets a visible sign though —
  // a red pulse, a shake, and the part of the word that did land.
  const handleWrong = useCallback(
    (message = 'Not quite — try again.', hint = '') => {
      if (resolvedRef.current || phaseRef.current !== 'guessing') return;
      setInput('');
      showWrong(message, hint);
    },
    [showWrong],
  );

  const handleTimeout = useCallback(() => {
    if (resolvedRef.current || phaseRef.current !== 'guessing') return;
    resolvedRef.current = true;
    noteMiss();
    applyStats((prev) => ({
      ...prev,
      hearts: prev.hearts - 1,
      score: Math.max(SOLO_MIN_SCORE, prev.score - SOLO_WRONG_PENALTY),
      streak: 0,
      played: prev.played + 1,
    }));
    setPhase('revealed');
    scheduleAdvance(2200);
  }, [applyStats, noteMiss, scheduleAdvance]);

  // A skip ends the word immediately; free skips cover the first few, later ones cost
  // a heart. Either way it is the only tap that forfeits the round without a timeout.
  const handleSkip = useCallback(() => {
    if (resolvedRef.current || phaseRef.current !== 'guessing') return;
    resolvedRef.current = true;
    if (statsRef.current.freeSkips > 0) {
      applyStats((prev) => ({ ...prev, freeSkips: prev.freeSkips - 1, streak: 0, played: prev.played + 1 }));
    } else {
      applyStats((prev) => ({ ...prev, hearts: prev.hearts - 1, streak: 0, played: prev.played + 1 }));
    }
    setPhase('revealed');
    scheduleAdvance(1800);
  }, [applyStats, scheduleAdvance]);

  // Voice answers are judged by *sound*, not spelling, so homophones ("wear"/"where")
  // and small accent slips land instead of being rejected. Every alternative the engine
  // offered is tried before the answer is marked wrong.
  const speech = useSpeechInput((text, alternatives) => {
    void (async () => {
      const candidates = [text, ...alternatives].map((value) => value.trim()).filter(Boolean);
      if (!candidates.length || phaseRef.current !== 'guessing' || resolvedRef.current) return;
      const target = currentRef.current.word;
      let matched = '';
      for (const candidate of candidates) {
        if (await checkSpokenAnswer(candidate, target)) {
          matched = candidate;
          break;
        }
      }
      // Loading the pronunciation dictionary is async — the round may have moved on.
      if (phaseRef.current !== 'guessing' || resolvedRef.current) return;
      if (matched) {
        // The screen shows the word being guessed, not the transcript: phoneme
        // matching accepts homophones ("where" for "wear"), and echoing the
        // transcript would leave the input reading "where" while the letter boxes
        // spell "wear" — the screen must agree with the answer it just marked correct.
        handleCorrect();
      } else {
        // Show what the recogniser heard and which letters of the target it got right.
        // A miss with no explanation was the part that felt like nothing happened.
        const heard = candidates[0] ?? '';
        const mask = heard ? buildSpellingHint(target, heard) ?? '' : '';
        handleWrong(
          heard ? `Heard “${heard}” — try again.` : 'Didn’t catch that — try again.',
          mask,
        );
        // Hands-free: re-arm the mic so the player can simply try again. With a
        // continuous session the mic is already open — bumping the tick would abort it
        // and clip the retry, which is exactly the "say it 2–3 times" bug.
        if (autoListenRef.current && !speech.listening && statsRef.current.hearts > 0) {
          setListenTick((tick) => tick + 1);
        }
      }
    })();
  }, autoListenRef);
  speechStopRef.current = speech.stop;
  speechStartRef.current = speech.start;
  speechResetRef.current = speech.reset;

  // Hands-free microphone: opens on each new word and re-opens after a miss. Any overlay
  // (pause / quit) silences it whether or not hands-free is on. The hook itself restarts
  // sessions that end without a result.
  useEffect(() => {
    if (overlayOpen) {
      speechStopRef.current();
      return;
    }
    if (!autoListen || !speech.supported) return;
    if (phase !== 'guessing') {
      speechStopRef.current();
      return;
    }
    speechStartRef.current();
  }, [autoListen, phase, wordNo, listenTick, overlayOpen, speech.supported]);

  // Per-word clock: runs only while the player is guessing and no overlay is up.
  // The clock freezes while a spoken clip is being transcribed on the worker: that
  // wait is server latency the player cannot influence, so charging for it would
  // make voice answers cost a second or two more than typing. The open-mic phase
  // still ticks — holding the mic is a choice, and thinking time must stay urgent.
  useEffect(() => {
    if (phase !== 'guessing' || overlayOpen || speech.transcribing) return;
    const id = window.setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, current, overlayOpen, speech.transcribing]);

  // Auto-pause when the page is hidden; the player taps Resume when they return.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') setAutoPaused(true);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const timeoutRef = useRef<() => void>(() => {});
  timeoutRef.current = handleTimeout;
  useEffect(() => {
    if (phase === 'guessing' && timeLeft === 0) timeoutRef.current();
  }, [phase, timeLeft]);

  // Describe mode: fetch the rendered clue for this word. A word the bank has no clue
  // for yet (still rendering, or one the gate could not pass) falls back to the
  // Vietnamese gloss above — a shorter ladder, not a dead round.
  useEffect(() => {
    if (style !== 'describe') return;
    let cancelled = false;
    setHintLoading(true);
    void loadHintClue(current.word).then((loaded) => {
      if (cancelled) return;
      setHint(loaded);
      setHintLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [current, style]);

  // The help ladder. Rung 1 (the contrast sentence) is free: it narrows the field without
  // ending the learning. Rung 2 (the Vietnamese gloss) is the last resort — the player
  // could not get there from English, so the streak ends and the word is filed for review,
  // but no heart is lost and the round can still be won.
  const revealHint = useCallback(() => {
    if (rung >= 1) return;
    setRung(1);
    applyStats((prev) => ({ ...prev, hints: prev.hints + 1 }));
  }, [applyStats, rung]);

  const revealMeaning = useCallback(() => {
    if (rung >= 2) return;
    setRung(2);
    applyStats((prev) => ({ ...prev, streak: 0, hints: prev.hints + 1 }));
    noteMiss();
  }, [applyStats, noteMiss, rung]);

  const onCheck = () => {
    const value = input.trim();
    if (!value || phase !== 'guessing') return;
    // Typing is judged on the exact spelling; voice keeps its sound-based tolerance.
    if (isExactSoloAnswer(value, answer)) {
      setWrong(null);
      handleCorrect();
      return;
    }
    // Stay on the word: the clock, not the attempt, is what costs a heart. The mask
    // shows which letters landed, so a near miss points at its own fix.
    handleWrong('Not quite — check the spelling.', buildSpellingHint(answer, value) ?? '');
  };

  const lastHeartIndex = stats.hearts - 1;
  const skipCostsHeart = stats.freeSkips <= 0;

  return (
    <div className="relative flex h-full min-h-0 flex-col items-center gap-3 px-1 py-2 text-light-text animate-fadeInScaleUp">
      {/* Top bar: score · track / streak · clock */}
      <div className="flex w-full shrink-0 items-center justify-between gap-2">
        <div className="min-w-[4.5rem]">
          <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-muted-text">Score</p>
          <p className="text-xl font-bold tabular-nums text-neon-green sm:text-2xl">{stats.score.toLocaleString()}</p>
          {stats.streak >= 2 && (
            <p className="mt-0.5 text-[0.7rem] font-semibold text-danger-red">🔥 {stats.streak} in a row</p>
          )}
        </div>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-xs font-semibold text-muted-text">
            {track.emoji} {track.name} · {shortLevel(current.level)} · Word {wordNo}
          </p>
          <p className="mt-0.5 text-[0.7rem] text-muted-text/70">
            {style === 'describe' ? '🎧 Listen & guess' : '🇻🇳 Meaning & spell'} · Endless
          </p>
        </div>
        <div className="flex min-w-[4.5rem] justify-end">
          <CircularTimer
            timeLeft={timeLeft}
            totalTime={timePerWord}
            isFrozen={speech.transcribing}
            isRushHour={false}
            size={56}
            strokeWidth={6}
          />
        </div>
      </div>

      {/* Hearts */}
      <div className="flex w-full shrink-0 items-center gap-0.5 text-sm" aria-label={`${stats.hearts} of ${SOLO_START_HEARTS} hearts left`}>
        {Array.from({ length: SOLO_START_HEARTS }).map((_, i) => (
          <span key={i} className={i <= lastHeartIndex ? 'text-base' : 'text-base opacity-25 grayscale'} aria-hidden="true">
            ❤️
          </span>
        ))}
      </div>

      {/* Clue card — letter boxes centred, Vietnamese meaning right below */}
      <div
        key={wordNo}
        className={`relative flex w-full min-h-0 flex-grow flex-col items-center justify-center gap-3 rounded-xl border-2 bg-dark-metal/60 p-3 text-center sm:p-5 ${
          phase === 'correct'
            ? 'border-neon-green/80 shadow-lg shadow-neon-green/30'
            : phase === 'revealed'
              ? 'border-danger-red/70 shadow-lg shadow-danger-red/20'
              : 'border-electric-blue/30'
        }`}
      >
        <span className="rounded-full border border-electric-blue/40 bg-electric-blue/10 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-electric-blue">
          {shortLevel(current.level)}
        </span>

        {/* The letter boxes: first letter revealed, the rest blank, count spelled out.
            Exo 2 (the body face) is used here instead of Orbitron: Orbitron's geometric
            D and O are near-identical at tile size, which made the single revealed
            letter genuine guesswork. Exo 2 has a flat, unmistakable D stem. */}
        <div
          key={wrong ? `boxes-${wrong.key}` : 'boxes'}
          className={`flex flex-wrap items-end justify-center gap-x-3 gap-y-2 ${
            wrong ? 'animate-wrongShake' : ''
          }`}
        >
          {letterGroups.map((group, gi) => (
            <div key={gi} className="flex gap-1.5">
              {group.map((char, ci) => (
                <span
                  key={ci}
                  className={`flex ${boxClass} items-center justify-center rounded-md border-2 border-electric-blue/40 bg-dark-metal font-sans font-bold uppercase leading-none tracking-[0.02em] text-light-text ${
                    phase === 'revealed' ? 'border-danger-red/50' : ''
                  }`}
                >
                  {char}
                </span>
              ))}
            </div>
          ))}
        </div>
        <p className="text-[0.7rem] uppercase tracking-widest text-muted-text/70">
          {totalLetters} letters
        </p>

        {/* The clue itself. Describe mode opens with the English situation only; the
            contrast sentence and then the Vietnamese gloss are opened by the player, so
            the help they need is never paid for in advance. */}
        {style === 'describe' ? (
          hint || vietnamese ? (
            <div className="flex w-full flex-col items-center gap-2">
              <div className="flex w-full items-start justify-center gap-2">
                {hint && (
                  <SpeakButton
                    word={rung >= 1 ? `${hint.defs[0]}. ${hint.defs[1]}` : hint.defs[0]}
                    label="Hear the clue"
                    className="mt-1"
                  />
                )}
                <p className="min-w-0 px-1 font-heading text-xl font-bold leading-snug text-neon-green sm:text-2xl">
                  {hint ? hint.defs[0] : `🇻🇳 ${vietnamese}`}
                </p>
              </div>

              {rung >= 1 && hint && (
                <p className="max-w-xl animate-fadeInScaleUp px-2 text-sm leading-snug text-electric-blue sm:text-base">
                  💡 {hint.defs[1]}
                </p>
              )}

              {rung >= 2 && vietnamese && (
                <p className="animate-fadeInScaleUp font-heading text-xl font-bold text-warning-yellow sm:text-2xl">
                  🇻🇳 {vietnamese}
                </p>
              )}

              {(rung < 1 && hint) || (rung < 2 && vietnamese) ? (
                <div className="mt-0.5 flex flex-wrap items-center justify-center gap-2">
                  {rung < 1 && hint && (
                    <button
                      type="button"
                      onClick={revealHint}
                      disabled={phase !== 'guessing'}
                      className="futuristic-button flex min-h-[2.75rem] items-center rounded-lg border border-electric-blue/50 bg-electric-blue/10 px-4 py-2 text-xs font-semibold text-electric-blue hover:bg-electric-blue/20 disabled:opacity-40"
                    >
                      💡 Hint
                    </button>
                  )}
                  {rung < 2 && vietnamese && (
                    <button
                      type="button"
                      onClick={revealMeaning}
                      disabled={phase !== 'guessing'}
                      className="futuristic-button flex min-h-[2.75rem] items-center rounded-lg border border-warning-yellow/50 bg-warning-yellow/10 px-4 py-2 text-xs font-semibold text-warning-yellow hover:bg-warning-yellow/20 disabled:opacity-40"
                    >
                      🇻🇳 Meaning
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          ) : hintLoading ? (
            <p className="animate-subtlePulse text-lg text-muted-text">Loading clue…</p>
          ) : (
            <p className="px-2 font-heading text-lg font-bold text-muted-text">🤔 No clue yet — trust the letters</p>
          )
        ) : (
          <p className="px-2 font-heading text-2xl font-bold leading-tight text-neon-green sm:text-3xl">
            {vietnamese ? `🇻🇳 ${vietnamese}` : '🤔 No translation yet — trust the letters'}
          </p>
        )}

        {phase === 'revealed' && (
          <div className="mt-1 flex animate-fadeInScaleUp items-center justify-center gap-2">
            <p className="font-heading text-xl font-bold text-danger-red sm:text-2xl">
              Answer: {answer}
            </p>
            {/* Hear it once it is on screen — the cheapest way to make a miss stick. */}
            <SpeakButton word={answer} />
          </div>
        )}

        {points && phase === 'correct' && (
          <span
            key={points.key}
            className="absolute right-4 top-4 animate-floatUpAndAway text-2xl font-extrabold text-warning-yellow sm:text-3xl"
            aria-hidden="true"
          >
            +{points.value}
            {points.bonus > 0 && <span className="ml-1 text-base text-danger-red">🔥</span>}
          </span>
        )}

        {banner && (
          <span className="pointer-events-none absolute inset-x-0 top-3 animate-fadeInScaleUp text-sm font-bold text-warning-yellow">
            {banner}
          </span>
        )}

        {heartToast && (
          <span
            key={heartToast}
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 animate-floatUpAndAway text-3xl font-extrabold text-danger-red"
            aria-hidden="true"
          >
            ❤️ +1
          </span>
        )}
      </div>

      {/* Answer input — type it or say it */}
      <div className="flex w-full shrink-0 flex-col gap-2">
        <div className="flex items-stretch gap-2">
          <input
            type="text"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              // The mask describes the previous attempt; editing makes it stale.
              setWrong(null);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !overlayOpen) onCheck();
            }}
            disabled={phase !== 'guessing' || overlayOpen}
            placeholder={speech.transcribing ? 'Checking…' : speech.listening ? 'Listening…' : 'Type the word…'}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Your answer"
            className={`min-w-0 flex-1 rounded-xl border-2 bg-dark-metal px-4 py-3 text-center text-lg font-semibold outline-none transition placeholder:text-muted-text/60 focus:border-electric-blue disabled:opacity-70 ${
              phase === 'correct'
                ? 'border-neon-green text-neon-green'
                : phase === 'revealed'
                  ? 'border-danger-red text-danger-red'
                  : 'border-cyber-purple/40 text-light-text'
            }`}
          />
          <button
            type="button"
            onClick={speech.listening ? speech.stop : speech.start}
            disabled={!speech.supported || phase !== 'guessing' || overlayOpen || speech.transcribing}
            title={
              speech.listening
                ? 'Listening — tap to stop'
                : speech.supported
                  ? 'Answer by voice'
                  : 'Voice input needs Chrome, Edge or Safari'
            }
            aria-label={speech.listening ? 'Stop listening' : 'Answer by voice'}
            aria-pressed={speech.listening}
            className={`flex h-auto min-w-[3.4rem] items-center justify-center rounded-[var(--r-md)] border-2 text-xl transition disabled:opacity-40 ${
              speech.listening
                ? 'border-danger-red bg-danger-red text-dark-metal shadow-lg shadow-danger-red/40 ring-4 ring-danger-red/25'
                : speech.transcribing
                  ? 'border-electric-blue bg-electric-blue text-dark-metal'
                  : 'border-electric-blue/50 bg-transparent text-electric-blue hover:bg-electric-blue/10'
            }`}
          >
            <Icon name="mic" size={20} />
          </button>
          {speech.supported && (
            <button
              type="button"
              onClick={() => setAutoListen((on) => !on)}
              disabled={overlayOpen}
              aria-pressed={autoListen}
              title={
                autoListen
                  ? 'Hands-free is on — tap to turn it off'
                  : 'Hands-free: the mic reopens on every word, so you never tap'
              }
              className={`flex h-auto min-w-[3.4rem] items-center justify-center rounded-[var(--r-md)] border-2 text-[0.65rem] font-bold uppercase tracking-wider transition disabled:opacity-40 ${
                autoListen
                  ? 'border-neon-green bg-neon-green text-dark-metal shadow-lg shadow-neon-green/30'
                  : 'border-cyber-purple/50 bg-transparent text-cyber-purple hover:bg-cyber-purple/10'
              }`}
            >
              Auto
            </button>
          )}
          <button
            type="button"
            onClick={onCheck}
            disabled={!input.trim() || phase !== 'guessing' || overlayOpen}
            className="futuristic-button shrink-0 rounded-[var(--r-md)] bg-neon-green px-5 py-3 text-sm font-bold text-dark-metal hover:bg-emerald-400 disabled:opacity-40"
          >
            Check
          </button>
        </div>

        {/* Live transcript + mic hint. A miss takes this line over — it says what was
            heard and which letters landed, so the retry has something to aim at. */}
        <div className="flex items-center gap-2 text-[0.7rem]">
          {wrong ? (
            <div
              key={wrong.key}
              role="status"
              className="flex w-full animate-fadeInScaleUp flex-col gap-0.5 rounded-lg border border-danger-red/50 bg-danger-red/10 px-2.5 py-1"
            >
              <span className="truncate font-bold text-danger-red">❌ {wrong.message}</span>
              {wrong.hint && (
                <span className="truncate font-mono text-[0.72rem] tracking-[0.16em] text-light-text">
                  Try again: {prettifyMask(wrong.hint)}
                </span>
              )}
            </div>
          ) : !speech.supported ? (
            <span className="text-muted-text/70">
              {typeof window !== 'undefined' && !window.isSecureContext
                ? '🎤 Voice needs a secure page (https://) — type the word instead.'
                : '🎤 Voice isn’t available in this browser on this device — type the word instead.'}
            </span>
          ) : speech.error ? (
            <span role="status" className="truncate text-warning-yellow">{speech.error}</span>
          ) : speech.transcribing ? (
            <span className="text-electric-blue">Checking what we heard…</span>
          ) : speech.listening ? (
            <span className="truncate text-electric-blue">
              {speech.interim ? `“${speech.interim}”` : 'Listening…'}
            </span>
          ) : (
            <span className="text-muted-text/70">
              {autoListen
                ? 'Hands-free on — the mic reopens on each word'
                : 'Enter to check · 🎤 to speak · Auto for hands-free'}
            </span>
          )}
        </div>
      </div>

      <div className="flex w-full shrink-0 gap-2">
        <button
          type="button"
          onClick={() => setConfirmQuit(true)}
          disabled={overlayOpen || phase === 'correct'}
          className="futuristic-button rounded-lg border border-cyber-purple/50 bg-cyber-purple/30 px-4 py-2 text-xs font-semibold text-light-text/80 hover:bg-cyber-purple/50 disabled:opacity-40"
        >
          Quit
        </button>
        <button
          type="button"
          onClick={handleSkip}
          disabled={phase !== 'guessing' || overlayOpen}
          className="futuristic-button flex-grow rounded-lg border border-warning-yellow/50 bg-warning-yellow/10 px-4 py-2 text-xs font-semibold text-warning-yellow hover:bg-warning-yellow/20 disabled:opacity-40"
        >
          {skipCostsHeart ? 'Skip word → (−1 ❤️)' : `Skip word → (${stats.freeSkips} free)`}
        </button>
      </div>

      {/* Wrong-answer sign: a red pulse across the whole screen. Pointer-transparent, so
          it marks the miss without swallowing the next attempt. */}
      {wrong && (
        <div
          key={`flash-${wrong.key}`}
          className="pointer-events-none fixed inset-0 z-40 animate-wrongFlash"
          style={{
            background:
              'radial-gradient(circle at center, rgba(248,113,113,0.10) 0%, rgba(248,113,113,0.45) 100%)',
          }}
          aria-hidden="true"
        />
      )}

      {autoPaused && !confirmQuit && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Run paused"
        >
          <div className="w-full max-w-sm rounded-xl border border-electric-blue/50 bg-dark-metal p-4 text-center animate-fadeInScaleUp">
            <p className="font-heading text-lg font-bold text-electric-blue">Paused</p>
            <p className="mt-1 text-sm text-muted-text">The clock is stopped while you are away.</p>
            <button
              type="button"
              onClick={() => setAutoPaused(false)}
              className="futuristic-button mt-4 w-full rounded-[var(--r-md)] bg-neon-green px-4 py-2.5 font-bold text-dark-metal hover:bg-emerald-400"
            >
              ▶️ Resume
            </button>
          </div>
        </div>
      )}

      {confirmQuit && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm quitting the run"
        >
          <div className="w-full max-w-sm rounded-xl border border-warning-yellow/50 bg-dark-metal p-4 text-center animate-fadeInScaleUp">
            <p className="font-heading text-lg font-bold text-warning-yellow">Quit this run?</p>
            <p className="mt-1 text-sm text-muted-text">
              Your score of <strong className="text-light-text">{stats.score.toLocaleString()}</strong> will be lost.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmQuit(false)}
                className="futuristic-button rounded-[var(--r-md)] bg-neon-green px-4 py-2.5 font-bold text-dark-metal hover:bg-emerald-400"
              >
                Keep playing
              </button>
              <button
                type="button"
                onClick={onExit}
                className="futuristic-button rounded-[var(--r-md)] border border-cyber-purple/60 bg-cyber-purple/40 px-4 py-2.5 font-semibold text-light-text hover:bg-cyber-purple/60"
              >
                Quit run
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SoloGameScreen;
