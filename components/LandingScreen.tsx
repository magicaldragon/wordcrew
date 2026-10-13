import React, { useState } from 'react';
import { GameMode } from '../types';
import { ACCESS_CODE, UNLOCK_STORAGE_KEY } from '../constants';

interface LandingScreenProps {
  onPlay: (mode: GameMode) => void;
}

interface ModeInfo {
  mode: GameMode;
  emoji: string;
  title: string;
  players: string;
  tagline: string;
  accentBorder: string;
  accentText: string;
  glow: string;
}

// Order matters: it is the order shown to first-time visitors.
const MODES: ModeInfo[] = [
  {
    mode: GameMode.NORMAL,
    emoji: '😊',
    title: 'Normal',
    players: '2+ players',
    tagline: 'The classic run. Lucky words, combo streaks and time bonuses — great for any classroom.',
    accentBorder: 'border-neon-green/40 hover:border-neon-green',
    accentText: 'text-neon-green',
    glow: 'hover:shadow-[0_0_25px_rgba(57,255,20,0.35)]',
  },
  {
    mode: GameMode.HELL,
    emoji: '💀',
    title: 'Hell',
    players: '2+ players',
    tagline: 'Only 3 skips, brutal penalties and double Rush Hour. Survive — or don’t.',
    accentBorder: 'border-danger-red/40 hover:border-danger-red',
    accentText: 'text-danger-red',
    glow: 'hover:shadow-[0_0_25px_rgba(255,65,54,0.35)]',
  },
  {
    mode: GameMode.TEAM,
    emoji: '🤝',
    title: 'Team',
    players: '4+ players',
    tagline: 'Two teams battle in turns. Speed bonuses and surprise boxes — sabotage your rivals.',
    accentBorder: 'border-electric-blue/40 hover:border-electric-blue',
    accentText: 'text-electric-blue',
    glow: 'hover:shadow-[0_0_25px_rgba(0,255,255,0.35)]',
  },
];

export const LandingScreen: React.FC<LandingScreenProps> = ({ onPlay }) => {
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem(UNLOCK_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [showCodeBox, setShowCodeBox] = useState<boolean>(false);
  const [codeInput, setCodeInput] = useState<string>('');
  const [codeError, setCodeError] = useState<string>('');

  const handleUnlock = (event: React.FormEvent) => {
    event.preventDefault();
    if (codeInput.trim().toLowerCase() === ACCESS_CODE) {
      setUnlocked(true);
      try {
        localStorage.setItem(UNLOCK_STORAGE_KEY, '1');
      } catch {
        /* Storage unavailable: the unlock simply lasts for this session. */
      }
      setCodeError('');
      setCodeInput('');
      setShowCodeBox(false);
    } else {
      setCodeError('Invalid access code. Please try again.');
    }
  };

  return (
    <div className="relative h-full w-full bg-dark-metal">
      {/* Ambient neon glows — decorative only */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-24 -top-32 h-96 w-96 rounded-full bg-electric-blue/20 blur-[120px]" />
        <div className="absolute -right-24 top-1/3 h-[28rem] w-[28rem] rounded-full bg-cyber-purple/30 blur-[130px]" />
        <div className="absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-neon-green/10 blur-[130px]" />
      </div>

      <div className="relative z-10 h-full overflow-y-auto overflow-x-hidden">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center px-5 py-10 sm:py-14">
          {/* HERO */}
          <section className="flex w-full flex-col items-center text-center">
            <span className="mb-3 font-sans text-[0.7rem] uppercase tracking-[0.4em] text-electric-blue/80 sm:text-xs">
              Only Talented Guessers
            </span>
            <h1 className="font-heading text-[clamp(3rem,14vw,5.5rem)] font-bold leading-none tracking-wider text-warning-yellow animate-goldPulseGlow">
              WordCrew
            </h1>
            <p className="mt-5 max-w-xl font-sans text-base leading-relaxed text-muted-text sm:text-lg">
              One player describes the word. The crew guesses. The fast, loud classroom word game for{' '}
              <strong className="text-light-text">2 or more players</strong> on a single screen.
            </p>

            <button
              type="button"
              onClick={() => onPlay(GameMode.NORMAL)}
              className={`futuristic-button mt-8 w-full max-w-xs rounded-xl bg-gradient-to-r px-8 py-4 font-bold text-dark-metal shadow-lg transition sm:w-auto ${
                unlocked
                  ? 'from-neon-green to-electric-blue hover:from-electric-blue hover:to-neon-green'
                  : 'from-cyber-purple to-electric-blue hover:from-electric-blue hover:to-neon-green'
              }`}
            >
              <span className="font-heading text-base tracking-wide sm:text-lg">
                {unlocked ? '▶ Play Full Version' : '▶ Play Free Demo'}
              </span>
            </button>
            <p className="mt-3 font-sans text-xs text-muted-text">Free · No sign-up · Works offline</p>

            {unlocked ? (
              <p className="mt-4 font-sans text-xs text-neon-green">
                <span role="img" aria-hidden="true">
                  🔓
                </span>{' '}
                Full version unlocked on this device
              </p>
            ) : showCodeBox ? (
              <form onSubmit={handleUnlock} className="mt-5 w-full max-w-xs">
                <label
                  htmlFor="accessCode"
                  className="mb-1 block text-left font-sans text-xs text-muted-text"
                >
                  Teacher access code
                </label>
                <div className="flex gap-2">
                  <input
                    id="accessCode"
                    type="password"
                    autoComplete="off"
                    value={codeInput}
                    onChange={(e) => {
                      setCodeInput(e.target.value);
                      if (codeError) setCodeError('');
                    }}
                    className="futuristic-input min-w-0 flex-grow rounded-lg px-3 py-3 text-sm"
                    placeholder="Enter code"
                    aria-describedby={codeError ? 'accessCodeError' : undefined}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="futuristic-button rounded-lg bg-cyber-purple/70 px-4 py-3 text-sm font-semibold text-light-text hover:bg-cyber-purple"
                  >
                    Unlock
                  </button>
                </div>
                {codeError && (
                  <p
                    id="accessCodeError"
                    role="alert"
                    className="mt-1.5 text-left font-sans text-xs text-danger-red"
                  >
                    {codeError}
                  </p>
                )}
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowCodeBox(true)}
                className="mt-5 font-sans text-xs text-muted-text underline decoration-dotted underline-offset-4 transition hover:text-electric-blue"
              >
                🔑 Have a teacher access code?
              </button>
            )}
          </section>

          {/* MODES */}
          <section className="mt-14 w-full">
            <h2 className="mb-1 text-center font-heading text-xl tracking-wide text-light-text sm:text-2xl">
              Three ways to play
            </h2>
            <p className="mb-6 text-center font-sans text-sm text-muted-text">
              Tap a mode to jump straight in
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {MODES.map((m) => (
                <button
                  key={m.mode}
                  type="button"
                  onClick={() => onPlay(m.mode)}
                  aria-label={`Play ${m.title} mode`}
                  className={`group flex flex-col items-start rounded-xl border bg-white/5 p-5 text-left backdrop-blur-sm transition duration-200 hover:-translate-y-1 ${m.accentBorder} ${m.glow}`}
                >
                  <span className="text-3xl" role="img" aria-hidden="true">
                    {m.emoji}
                  </span>
                  <span className={`mt-2 font-heading text-lg font-bold ${m.accentText}`}>{m.title}</span>
                  <span className="font-sans text-[0.7rem] uppercase tracking-wider text-muted-text/80">
                    {m.players}
                  </span>
                  <span className="mt-1.5 font-sans text-sm leading-snug text-muted-text">{m.tagline}</span>
                </button>
              ))}
            </div>
          </section>

          <footer className="mt-auto pt-14 pb-2 font-sans text-xs text-muted-text">
            Made by Mr. C{' '}
            <span role="img" aria-label="heart" className="text-danger-red">
              ❤️
            </span>
          </footer>
        </div>
      </div>
    </div>
  );
};
