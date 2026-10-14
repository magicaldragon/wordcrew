import React, { useCallback, useEffect, useRef, useState } from 'react';
import CircularTimer from './CircularTimer';
import { CustomSoundFile } from '../types';
import { playSound, CORRECT_SOUNDS } from '../constants';
import { resolveVietnameseHint } from '../vietnameseMeanings';
import { resolveEnglishSynonym } from '../services/synonyms';
import {
  SOLO_BASE_POINTS,
  SOLO_MAX_ATTEMPTS,
  SOLO_SPEED_POINTS_PER_SECOND,
  SOLO_STREAK_BONUS,
  SOLO_TIME_PER_WORD,
  checkSoloAnswer,
  maskWord,
  type SoloRunResult,
  type SoloTrack,
  type SoloWord,
} from '../services/solo';

interface SoloGameScreenProps {
  track: SoloTrack;
  words: SoloWord[];
  effectsVolume: number;
  customCorrectSounds: CustomSoundFile[];
  onEnd: (result: SoloRunResult) => void;
  onExit: () => void;
}

type Phase = 'guessing' | 'correct' | 'revealed';

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

export const SoloGameScreen: React.FC<SoloGameScreenProps> = ({
  track,
  words,
  effectsVolume,
  customCorrectSounds,
  onEnd,
  onExit,
}) => {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('guessing');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [guessed, setGuessed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SOLO_TIME_PER_WORD);
  const [input, setInput] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [wrongFlash, setWrongFlash] = useState(0);
  const [points, setPoints] = useState<{ value: number; key: number } | null>(null);
  const [clue, setClue] = useState<{ vi?: string; syn?: string; loading: boolean }>({ loading: true });

  const current = words[index];
  const answer = current?.word ?? '';

  // Refs mirror state for the timeout callbacks, which must not close over stale values.
  const indexRef = useRef(index);
  const phaseRef = useRef(phase);
  const timeLeftRef = useRef(timeLeft);
  const attemptsRef = useRef(attempts);
  const streakRef = useRef(streak);
  const statsRef = useRef({ score: 0, guessed: 0, bestStreak: 0 });
  const resolvedRef = useRef(false);
  const advanceTimer = useRef<number | null>(null);

  useEffect(() => { indexRef.current = index; }, [index]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
  useEffect(() => { attemptsRef.current = attempts; }, [attempts]);
  useEffect(() => { streakRef.current = streak; }, [streak]);
  useEffect(() => {
    statsRef.current = { score, guessed, bestStreak };
  }, [score, guessed, bestStreak]);
  useEffect(() => () => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
  }, []);

  // ── Clue resolution: Vietnamese gloss first, English synonym as a second nudge ──
  useEffect(() => {
    const word = words[index]?.word;
    const nextWord = words[index + 1]?.word;
    if (!word) return;
    let cancelled = false;
    setClue({ loading: true });
    void (async () => {
      const [vi, syn] = await Promise.all([resolveVietnameseHint(word), resolveEnglishSynonym(word)]);
      if (cancelled) return;
      setClue({ vi: vi || undefined, syn: syn || undefined, loading: false });
      // Warm the next card so the ramp feels instant.
      if (nextWord) {
        void resolveVietnameseHint(nextWord);
        void resolveEnglishSynonym(nextWord);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [index, words]);

  const finish = useCallback(() => {
    onEnd({
      trackId: track.id,
      score: statsRef.current.score,
      wordsGuessed: statsRef.current.guessed,
      bestStreak: statsRef.current.bestStreak,
      total: words.length,
      timePerWord: SOLO_TIME_PER_WORD,
    });
  }, [onEnd, track.id, words.length]);

  const scheduleAdvance = useCallback(
    (delay: number) => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
      advanceTimer.current = window.setTimeout(() => {
        const next = indexRef.current + 1;
        if (next >= words.length) {
          finish();
          return;
        }
        resolvedRef.current = false;
        setIndex(next);
        setPhase('guessing');
        setInput('');
        setAttempts(0);
        setTimeLeft(SOLO_TIME_PER_WORD);
        setPoints(null);
      }, delay);
    },
    [finish, words.length],
  );

  const reveal = useCallback(
    (delay: number) => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      setPhase('revealed');
      setStreak(0);
      scheduleAdvance(delay);
    },
    [scheduleAdvance],
  );

  // `handleCorrect` needs to stop the mic, but the mic hook is created below it —
  // the stop function is reached through a ref to avoid a declaration cycle.
  const speechStopRef = useRef<() => void>(() => {});

  const handleCorrect = useCallback(
    (value?: string) => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      const gained =
        SOLO_BASE_POINTS +
        timeLeftRef.current * SOLO_SPEED_POINTS_PER_SECOND +
        (streakRef.current + 1 >= 3 ? SOLO_STREAK_BONUS : 0);
      setPhase('correct');
      setInput(value ?? '');
      setPoints({ value: gained, key: Date.now() });
      setScore((prev) => prev + gained);
      setGuessed((prev) => prev + 1);
      setStreak((prev) => {
        const next = prev + 1;
        setBestStreak((best) => Math.max(best, next));
        return next;
      });
      speechStopRef.current();
      const sound = pick(customCorrectSounds)?.data || pick(CORRECT_SOUNDS);
      if (sound) playSound(sound, effectsVolume);
      scheduleAdvance(1000);
    },
    [customCorrectSounds, effectsVolume, scheduleAdvance],
  );

  const handleWrong = useCallback((value: string) => {
    setInput(value);
    setWrongFlash((prev) => prev + 1);
    const next = attemptsRef.current + 1;
    setAttempts(next);
    if (next >= SOLO_MAX_ATTEMPTS) reveal(2200);
  }, [reveal]);

  const speech = useSpeechInput((text, alternatives) => {
    const value = text || alternatives[0] || '';
    if (!value || phaseRef.current !== 'guessing') return;
    const target = words[indexRef.current]?.word ?? '';
    if (checkSoloAnswer(value, target) || alternatives.some((alt) => checkSoloAnswer(alt, target))) {
      handleCorrect(value);
    } else {
      handleWrong(value);
    }
  });
  speechStopRef.current = speech.stop;

  // Per-word clock: runs only while the player is guessing.
  useEffect(() => {
    if (phase !== 'guessing') return;
    setTimeLeft(SOLO_TIME_PER_WORD);
    const id = window.setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [index, phase]);

  useEffect(() => {
    if (phase === 'guessing' && timeLeft === 0) reveal(2200);
  }, [timeLeft, phase, reveal]);

  const onCheck = () => {
    const value = input.trim();
    if (!value || phase !== 'guessing') return;
    if (checkSoloAnswer(value, answer)) handleCorrect(value);
    else handleWrong(value);
  };

  const progressPct = words.length > 0 ? ((index + (phase === 'guessing' ? 0 : 1)) / words.length) * 100 : 0;

  return (
    <div className="flex h-full min-h-0 flex-col items-center gap-3 px-1 py-2 text-light-text animate-fadeInScaleUp">
      {/* Top bar: score · progress · clock */}
      <div className="flex w-full shrink-0 items-center justify-between gap-2">
        <div className="min-w-[4.5rem]">
          <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-muted-text">Score</p>
          <p className="text-xl font-bold tabular-nums text-neon-green sm:text-2xl">{score.toLocaleString()}</p>
        </div>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-xs font-semibold text-muted-text">
            {track.emoji} {track.name} · Word {Math.min(index + 1, words.length)} / {words.length}
          </p>
          <div className="mx-auto mt-1 h-1.5 w-full max-w-[16rem] overflow-hidden rounded-full bg-dark-metal">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-cyber-purple to-electric-blue transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {streak >= 2 && (
            <p className="mt-0.5 text-[0.7rem] font-semibold text-orange-400">🔥 {streak} in a row</p>
          )}
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

      {/* Clue card — the word itself stays hidden from the guesser */}
      <div
        key={index}
        className={`relative flex w-full min-h-0 flex-grow flex-col items-center justify-center gap-2 rounded-xl border-2 bg-dark-metal/60 p-3 text-center sm:p-5 ${
          phase === 'correct'
            ? 'border-neon-green/80 shadow-lg shadow-neon-green/30'
            : phase === 'revealed'
              ? 'border-danger-red/70 shadow-lg shadow-danger-red/20'
              : 'border-electric-blue/30'
        }`}
      >
        <span className="rounded-full border border-electric-blue/40 bg-electric-blue/10 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-electric-blue">
          {current?.level}
        </span>

        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-muted-text/70">Clue</p>

        {clue.loading ? (
          <p className="animate-subtlePulse text-lg text-muted-text">Loading clue…</p>
        ) : (
          <>
            <p className="font-heading text-2xl font-bold leading-tight text-neon-green sm:text-3xl">
              {clue.vi ? `🇻🇳 ${clue.vi}` : '🤔 No translation — use the shape below'}
            </p>
            {clue.syn && (
              <p className="text-sm text-cyan-300 sm:text-base">💬 {clue.syn}</p>
            )}
          </>
        )}

        <p className="mt-1 font-mono text-base tracking-[0.35em] text-light-text/70 sm:text-lg">
          {maskWord(answer)}
        </p>

        {phase === 'revealed' && (
          <p className="mt-2 animate-fadeInScaleUp font-heading text-xl font-bold text-danger-red sm:text-2xl">
            Answer: {answer}
          </p>
        )}

        {points && phase === 'correct' && (
          <span
            key={points.key}
            className="absolute right-4 top-4 animate-floatUpAndAway text-2xl font-extrabold text-yellow-400 sm:text-3xl"
            aria-hidden="true"
          >
            +{points.value}
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
              if (event.key === 'Enter') onCheck();
            }}
            disabled={phase !== 'guessing'}
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
            disabled={!speech.supported || phase !== 'guessing'}
            title={speech.supported ? 'Answer by voice' : 'Voice input needs Chrome, Edge or Safari'}
            aria-label={speech.listening ? 'Stop listening' : 'Answer by voice'}
            className={`flex h-auto min-w-[3.4rem] items-center justify-center rounded-xl border-2 text-xl transition disabled:opacity-40 ${
              speech.listening
                ? 'animate-pulse border-danger-red bg-danger-red/20 text-danger-red'
                : 'border-cyan-400/50 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20'
            }`}
          >
            🎤
          </button>
          <button
            type="button"
            onClick={onCheck}
            disabled={!input.trim() || phase !== 'guessing'}
            className="futuristic-button shrink-0 rounded-xl bg-gradient-to-r from-neon-green to-electric-blue px-5 py-3 text-sm font-bold text-dark-metal disabled:opacity-40"
          >
            Check
          </button>
        </div>

        {/* Attempt dots + live transcript + mic hint */}
        <div className="flex items-center justify-between gap-2 text-[0.7rem]">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: SOLO_MAX_ATTEMPTS }).map((_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full ${i < attempts ? 'bg-danger-red' : 'bg-dark-metal border border-muted-text/40'}`}
              />
            ))}
            <span key={wrongFlash} className={wrongFlash ? 'ml-1 text-danger-red animate-pulseOnce' : 'hidden'}>
              Not quite — try again
            </span>
          </div>
          {speech.error ? (
            <span role="status" className="truncate text-warning-yellow">{speech.error}</span>
          ) : speech.listening && speech.interim ? (
            <span className="truncate text-cyan-300">“{speech.interim}”</span>
          ) : (
            <span className="text-muted-text/70">Enter to check · 🎤 to speak</span>
          )}
        </div>
      </div>

      <div className="flex w-full shrink-0 gap-2">
        <button
          type="button"
          onClick={onExit}
          className="futuristic-button rounded-lg border border-cyber-purple/50 bg-cyber-purple/30 px-4 py-2 text-xs font-semibold text-light-text/80 hover:bg-cyber-purple/50"
        >
          Quit
        </button>
        <button
          type="button"
          onClick={() => reveal(1800)}
          disabled={phase !== 'guessing'}
          className="futuristic-button flex-grow rounded-lg border border-warning-yellow/50 bg-warning-yellow/10 px-4 py-2 text-xs font-semibold text-warning-yellow hover:bg-warning-yellow/20 disabled:opacity-40"
        >
          Skip word →
        </button>
      </div>
    </div>
  );
};

export default SoloGameScreen;
