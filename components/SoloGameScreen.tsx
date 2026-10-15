import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CircularTimer from './CircularTimer';
import { CustomSoundFile } from '../types';
import { playSound, CORRECT_SOUNDS, ANNOUNCER_CALLOUTS, ANNOUNCER_STREAK_MILESTONES } from '../constants';
import { resolveVietnameseHint } from '../vietnameseMeanings';
import {
  buildLetterBoxes,
  checkSoloAnswer,
  createSoloSequence,
  letterCount,
  shortLevel,
  soloStreakBonus,
  SOLO_CORRECT_POINTS,
  SOLO_FREE_SKIPS,
  SOLO_HEART_MILESTONES,
  SOLO_MIN_SCORE,
  SOLO_START_HEARTS,
  SOLO_TIME_PER_WORD,
  SOLO_WRONG_PENALTY,
  type SoloRunResult,
  type SoloSequence,
  type SoloTrack,
  type SoloWord,
} from '../services/solo';
import { Icon } from './Icon';

interface SoloGameScreenProps {
  track: SoloTrack;
  effectsVolume: number;
  customCorrectSounds: CustomSoundFile[];
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
}

const pick = <T,>(items: T[]): T | undefined =>
  items.length ? items[Math.floor(Math.random() * items.length)] : undefined;

// ── Speech input (Web Speech API) ──────────────────────────────────────────
// One utterance per tap, mirroring the notebook's dictation exercise: the player
// taps the mic, says the word, and the transcript is checked with the same fuzzy
// matcher used for typing. `maxAlternatives` lets a near-miss transcript still win.
interface SpeechInput {
  supported: boolean;
  listening: boolean;
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  clearError: () => void;
}

const useSpeechInput = (onFinal: (text: string, alternatives: string[]) => void): SpeechInput => {
  const Ctor =
    typeof window !== 'undefined'
      ? ((window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any })
          .SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition)
      : undefined;
  const supported = Boolean(Ctor);

  const recRef = useRef<any>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    try {
      recRef.current?.abort?.();
    } catch {
      /* already stopped */
    }
    recRef.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (!Ctor) return;
    setError(null);
    setInterim('');
    if (recRef.current) {
      try {
        recRef.current.abort();
      } catch {
        /* ignore */
      }
      recRef.current = null;
    }

    const rec = new Ctor();
    recRef.current = rec;
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    rec.continuous = false;

    rec.onstart = () => setListening(true);
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
      setInterim((finalText || interimText).trim());
      if (finalText) onFinalRef.current(finalText.trim(), alternatives);
    };
    rec.onerror = (event: any) => {
      const code = event?.error || '';
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        setError('Microphone access was blocked — allow it or type instead.');
      } else if (code === 'network') {
        setError('Network hiccup — try again or type your answer.');
      } else if (code === 'no-speech') {
        setError('Didn’t catch that — try again.');
      }
      setListening(false);
    };
    rec.onend = () => {
      if (recRef.current === rec) recRef.current = null;
      setListening(false);
    };

    try {
      rec.start();
    } catch {
      setError('Could not start the microphone.');
    }
  }, [Ctor]);

  useEffect(() => () => {
    try {
      recRef.current?.abort?.();
    } catch {
      /* unmounting */
    }
  }, []);

  return { supported, listening, interim, error, start, stop, clearError: () => setError(null) };
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
});

export const SoloGameScreen: React.FC<SoloGameScreenProps> = ({
  track,
  effectsVolume,
  customCorrectSounds,
  onEnd,
  onExit,
}) => {
  // Endless word source, drawn from the track's ladder and stepping up in difficulty.
  const seqRef = useRef<SoloSequence | null>(null);
  if (!seqRef.current) seqRef.current = createSoloSequence(track);

  const [current, setCurrent] = useState<SoloWord>(() => seqRef.current!.next());
  const [wordNo, setWordNo] = useState(1);
  const [phase, setPhase] = useState<Phase>('guessing');
  const [stats, setStats] = useState<SoloStats>(initialStats);
  const [timeLeft, setTimeLeft] = useState(SOLO_TIME_PER_WORD);
  const [input, setInput] = useState('');
  const [points, setPoints] = useState<{ value: number; bonus: number; key: number } | null>(null);
  const [clue, setClue] = useState<{ vi?: string; loading: boolean }>({ loading: true });
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
  const resolvedRef = useRef(false);
  const endedRef = useRef(false);
  const levelRef = useRef(current.level);
  const maxBandRef = useRef(track.levels.indexOf(current.level));
  const advanceTimer = useRef<number | null>(null);
  const bannerTimer = useRef<number | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { currentRef.current = current; }, [current]);
  useEffect(() => () => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    if (bannerTimer.current) window.clearTimeout(bannerTimer.current);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  // Updates state and the mirror together so the timer callbacks never read stale values.
  const applyStats = useCallback((updater: (prev: SoloStats) => SoloStats) => {
    const next = updater(statsRef.current);
    statsRef.current = next;
    setStats(next);
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

  // `handleCorrect` needs to stop the mic, but the mic hook is created below it —
  // the stop function is reached through a ref to avoid a declaration cycle.
  const speechStopRef = useRef<() => void>(() => {});

  const endGame = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    speechStopRef.current();
    const s = statsRef.current;
    onEnd({
      trackId: track.id,
      score: s.score,
      wordsGuessed: s.guessed,
      bestStreak: s.bestStreak,
      wordsPlayed: s.played,
      levelReached: levelRef.current,
      timePerWord: SOLO_TIME_PER_WORD,
    });
  }, [onEnd, track.id]);

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
        setCurrent(nextWord);
        setWordNo((n) => n + 1);
        setPhase('guessing');
        setInput('');
        setTimeLeft(SOLO_TIME_PER_WORD);
        setPoints(null);
      }, delay);
    },
    [endGame, showBanner, track.levels],
  );

  const handleCorrect = useCallback(
    (value?: string) => {
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
      setInput(value ?? '');
      setPoints({ value: gained, bonus, key: Date.now() });
      speechStopRef.current();
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
      if (callout) playSound(callout, effectsVolume);
      scheduleAdvance(1000);
    },
    [applyStats, customCorrectSounds, effectsVolume, scheduleAdvance, showHeartToast],
  );

  const handleWrong = useCallback(
    () => {
      if (resolvedRef.current || phaseRef.current !== 'guessing') return;
      setInput('');
      const hearts = statsRef.current.hearts - 1;
      applyStats((prev) => ({
        ...prev,
        hearts,
        score: Math.max(SOLO_MIN_SCORE, prev.score - SOLO_WRONG_PENALTY),
        streak: 0,
        played: prev.played + 1,
      }));
      if (hearts <= 0) {
        resolvedRef.current = true;
        setPhase('revealed');
        scheduleAdvance(2000);
      }
    },
    [applyStats, scheduleAdvance],
  );

  const handleTimeout = useCallback(() => {
    if (resolvedRef.current || phaseRef.current !== 'guessing') return;
    resolvedRef.current = true;
    applyStats((prev) => ({
      ...prev,
      hearts: prev.hearts - 1,
      score: Math.max(SOLO_MIN_SCORE, prev.score - SOLO_WRONG_PENALTY),
      streak: 0,
      played: prev.played + 1,
    }));
    setPhase('revealed');
    scheduleAdvance(2200);
  }, [applyStats, scheduleAdvance]);

  // A skip is free while free skips last, and costs a heart afterwards (still
  // gentler than a wrong guess, which also forfeits points).
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

  const speech = useSpeechInput((text, alternatives) => {
    const value = text || alternatives[0] || '';
    if (!value || phaseRef.current !== 'guessing' || resolvedRef.current) return;
    const target = currentRef.current.word;
    if (checkSoloAnswer(value, target) || alternatives.some((alt) => checkSoloAnswer(alt, target))) {
      handleCorrect(value);
    } else {
      handleWrong();
    }
  });
  speechStopRef.current = speech.stop;

  // Per-word clock: runs only while the player is guessing and no overlay is up.
  useEffect(() => {
    if (phase !== 'guessing' || overlayOpen) return;
    const id = window.setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, current, overlayOpen]);

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

  // Clue resolution: the Vietnamese gloss only — the English synonym tier used to
  // leak the answer (e.g. "pyjama" for "pajama"), so it is gone from Solo.
  useEffect(() => {
    let cancelled = false;
    setClue({ loading: true });
    void (async () => {
      const vi = await resolveVietnameseHint(current.word);
      if (cancelled) return;
      setClue({ vi: vi || undefined, loading: false });
    })();
    return () => {
      cancelled = true;
    };
  }, [current]);

  const onCheck = () => {
    const value = input.trim();
    if (!value || phase !== 'guessing') return;
    if (checkSoloAnswer(value, answer)) handleCorrect(value);
    else handleWrong();
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
          <p className="mt-0.5 text-[0.7rem] text-muted-text/70">Endless — survive as long as you can</p>
        </div>
        <div className="flex min-w-[4.5rem] justify-end">
          <CircularTimer
            timeLeft={timeLeft}
            totalTime={SOLO_TIME_PER_WORD}
            isFrozen={false}
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

        {/* The letter boxes: first letter revealed, the rest blank, count spelled out */}
        <div className="flex flex-wrap items-end justify-center gap-x-3 gap-y-2">
          {letterGroups.map((group, gi) => (
            <div key={gi} className="flex gap-1.5">
              {group.map((char, ci) => (
                <span
                  key={ci}
                  className={`flex ${boxClass} items-center justify-center rounded-md border-2 border-electric-blue/40 bg-dark-metal font-heading font-bold uppercase text-light-text ${
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

        {/* The clue itself — Vietnamese meaning only, centred under the boxes */}
        {clue.loading ? (
          <p className="animate-subtlePulse text-lg text-muted-text">Loading clue…</p>
        ) : (
          <p className="px-2 font-heading text-2xl font-bold leading-tight text-neon-green sm:text-3xl">
            {clue.vi ? `🇻🇳 ${clue.vi}` : '🤔 No translation yet — trust the letters'}
          </p>
        )}

        {phase === 'revealed' && (
          <p className="mt-1 animate-fadeInScaleUp font-heading text-xl font-bold text-danger-red sm:text-2xl">
            Answer: {answer}
          </p>
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
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !overlayOpen) onCheck();
            }}
            disabled={phase !== 'guessing' || overlayOpen}
            placeholder={speech.listening ? 'Listening…' : 'Type the word…'}
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
            disabled={!speech.supported || phase !== 'guessing' || overlayOpen}
            title={speech.supported ? 'Answer by voice' : 'Voice input needs Chrome, Edge or Safari'}
            aria-label={speech.listening ? 'Stop listening' : 'Answer by voice'}
            className={`flex h-auto min-w-[3.4rem] items-center justify-center rounded-[var(--r-md)] border-2 text-xl transition disabled:opacity-40 ${
              speech.listening
                ? 'animate-pulse border-danger-red bg-danger-red/20 text-danger-red'
                : 'border-electric-blue/50 bg-electric-blue/10 text-electric-blue hover:bg-electric-blue/20'
            }`}
          >
              <Icon name="mic" size={20} />
            </button>
          <button
            type="button"
            onClick={onCheck}
            disabled={!input.trim() || phase !== 'guessing' || overlayOpen}
            className="futuristic-button shrink-0 rounded-[var(--r-md)] bg-neon-green px-5 py-3 text-sm font-bold text-dark-metal hover:bg-emerald-400 disabled:opacity-40"
          >
            Check
          </button>
        </div>

        {/* Live transcript + mic hint */}
        <div className="flex items-center gap-2 text-[0.7rem]">
          {speech.error ? (
            <span role="status" className="truncate text-warning-yellow">{speech.error}</span>
          ) : speech.listening && speech.interim ? (
            <span className="truncate text-electric-blue">“{speech.interim}”</span>
          ) : (
            <span className="text-muted-text/70">Enter to check · 🎤 to speak · −1 ❤️ per wrong guess</span>
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
