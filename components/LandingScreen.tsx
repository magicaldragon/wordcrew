import React, { useState } from 'react';
import { GameMode } from '../types';
import { DEMO_POLICY } from '../constants';
import { UnlockDialog } from './UnlockDialog';
import { Icon } from './Icon';
import type { UnlockOutcome } from '../services/payments';

interface LandingScreenProps {
  isUnlocked: boolean;
  onUnlock: (code: string) => Promise<UnlockOutcome>;
  /** Start the paid path. The app gates this behind sign-in. */
  onUpgrade: () => void;
  /**
   * Opens the game setup container with this mode pre-selected. Solo is a mode
   * choice too, so it enters through the very same container as the other three
   * instead of jumping to a second, differently-shaped setup screen.
   */
  onPlay: (mode: GameMode | 'solo') => void;
  /** Return to the portal dashboard. */
  onBack: () => void;
}

interface ModeInfo {
  /** Solo is a mode choice without being a `GameMode` value. */
  mode: GameMode | 'solo';
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
    glow: 'hover:shadow-[var(--elev-3)]',
  },
  {
    mode: GameMode.HELL,
    emoji: '💀',
    title: 'Hell',
    players: '2+ players',
    tagline: 'Only 3 skips, brutal penalties and double Rush Hour. Survive — or don’t.',
    accentBorder: 'border-danger-red/40 hover:border-danger-red',
    accentText: 'text-danger-red',
    glow: 'hover:shadow-[var(--elev-3)]',
  },
  {
    mode: GameMode.TEAM,
    emoji: '🤝',
    title: 'Team',
    players: '4+ players',
    tagline: 'Two teams battle in turns. Speed bonuses and surprise boxes — sabotage your rivals.',
    accentBorder: 'border-electric-blue/40 hover:border-electric-blue',
    accentText: 'text-electric-blue',
    glow: 'hover:shadow-[var(--elev-3)]',
  },
  {
    mode: 'solo',
    emoji: '🎯',
    title: 'Solo',
    players: '1 player',
    tagline: 'Play alone. Guess each word from its letter boxes and a Vietnamese clue — endless until your hearts run out.',
    accentBorder: 'border-cyber-purple/40 hover:border-cyber-purple',
    accentText: 'text-cyber-purple',
    glow: 'hover:shadow-[var(--elev-3)]',
  },
];

export const LandingScreen: React.FC<LandingScreenProps> = ({
  isUnlocked,
  onUnlock,
  onUpgrade,
  onPlay,
  onBack,
}) => {
  const [showUnlockDialog, setShowUnlockDialog] = useState<boolean>(false);

  const handleModeClick = (mode: GameMode | 'solo') => {
    if (mode === 'solo') {
      onPlay('solo');
      return;
    }
    const isLocked = !DEMO_POLICY.freeModes.includes(mode);
    if (isLocked && !isUnlocked) {
      setShowUnlockDialog(true);
      return;
    }
    onPlay(mode);
  };

  return (
    <div className="relative h-full w-full bg-dark-metal">
      <div className="relative z-10 h-full overflow-y-auto overflow-x-hidden">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center px-5 py-10 sm:py-14">
          {/* Back to the portal dashboard */}
          <button
            type="button"
            onClick={onBack}
            className="futuristic-button mb-6 inline-flex min-h-[44px] items-center gap-1.5 self-start rounded-[var(--r-md)] border border-electric-blue/30 px-4 py-2.5 font-sans text-xs text-muted-text transition hover:text-electric-blue"
          >
            <Icon name="arrowLeft" />
            Dashboard
          </button>

          {/* HERO */}
          <section className="flex w-full flex-col items-center text-center">
            <span className="mb-3 font-sans text-[0.7rem] uppercase tracking-[0.4em] text-electric-blue/80 sm:text-xs">
              Only Talented Guessers
            </span>
            <h1 className="font-heading text-[clamp(3rem,14vw,5.5rem)] font-bold leading-none tracking-wider text-warning-yellow">
              WordCrew
            </h1>
            <p className="mt-5 max-w-xl font-sans text-base leading-relaxed text-muted-text sm:text-lg">
              One player describes the word. The crew guesses. The fast, loud classroom word game for{' '}
              <strong className="text-light-text">2 or more players</strong> on a single screen.
            </p>

            <button
              type="button"
              onClick={() => onPlay(GameMode.NORMAL)}
              className="futuristic-button mt-8 inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-[var(--r-lg)] bg-neon-green px-8 py-4 font-bold text-dark-metal transition hover:bg-emerald-400 sm:w-auto"
            >
              <Icon name="play" size={20} />
              <span className="font-heading text-base tracking-wide sm:text-lg">
                {isUnlocked ? 'Play Full Version' : 'Play Free Demo'}
              </span>
            </button>
            <p className="mt-3 font-sans text-xs text-muted-text">Free · No sign-up · Works offline</p>

            {isUnlocked ? (
              <p className="mt-4 inline-flex items-center gap-1.5 font-sans text-xs text-neon-green">
                <Icon name="unlock" />
                Full version unlocked on this device
              </p>
            ) : (
              <div className="mt-6 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={onUpgrade}
                  className="futuristic-button inline-flex items-center gap-2 rounded-xl border border-neon-green/50 bg-neon-green/10 px-6 py-3 font-sans text-sm font-semibold text-neon-green transition hover:bg-neon-green/20"
                >
                  <Icon name="unlock" size={18} />
                  Unlock Full Version
                </button>
                <button
                  type="button"
                  onClick={() => setShowUnlockDialog(true)}
                  className="font-sans text-xs text-muted-text underline decoration-dotted underline-offset-4 transition hover:text-electric-blue"
                >
                  Already bought? Enter your licence key
                </button>
              </div>
            )}
          </section>

          {/* MODES */}
          <section className="mt-14 w-full">
            <h2 className="mb-1 text-center font-heading text-xl tracking-wide text-light-text sm:text-2xl">
              Four ways to play
            </h2>
            <p className="mb-6 text-center font-sans text-sm text-muted-text">
              Tap a mode to jump straight in
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {MODES.map((m) => {
                const isLocked = m.mode !== 'solo' && !DEMO_POLICY.freeModes.includes(m.mode) && !isUnlocked;
                return (
                  <button
                    key={m.mode}
                    type="button"
                    onClick={() => handleModeClick(m.mode)}
                    aria-label={isLocked ? `Unlock ${m.title} mode (Full Version)` : `Play ${m.title} mode`}
                    className={`group relative flex flex-col items-start rounded-[var(--r-lg)] border bg-[var(--surface-1)] p-5 text-left shadow-[var(--elev-2)] transition duration-200 hover:-translate-y-1 ${m.accentBorder} ${m.glow}`}
                  >
                    {isLocked && (
                      <span className="absolute right-3 top-3 inline-flex items-center gap-1 font-sans text-[0.6rem] uppercase tracking-widest text-muted-text/80">
                        <Icon name="lock" size={11} />
                        Full
                      </span>
                    )}
                    <span className="text-3xl" role="img" aria-hidden="true">
                      {m.emoji}
                    </span>
                    <span className={`mt-2 font-heading text-lg font-bold ${m.accentText}`}>{m.title}</span>
                    <span className="font-sans text-[0.7rem] uppercase tracking-wider text-muted-text/80">
                      {m.players}
                    </span>
                    <span className="mt-1.5 font-sans text-sm leading-snug text-muted-text">{m.tagline}</span>
                  </button>
                );
              })}
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

      <UnlockDialog
        isOpen={showUnlockDialog}
        onClose={() => setShowUnlockDialog(false)}
        onUnlock={onUnlock}
      />
    </div>
  );
};
