import React, { useMemo, useState } from 'react';
import { SOLO_TRACKS, SOLO_WORDS_PER_RUN, SOLO_TIME_PER_WORD, type SoloTrack } from '../services/solo';
import { readLocalSoloBest } from '../services/soloLeaderboard';

interface SoloSetupScreenProps {
  onStart: (track: SoloTrack) => void;
  onExit: () => void;
  isSignedIn: boolean;
}

/** Friendly "Pre-A1 → A2" label for a track's difficulty span. */
const rangeLabel = (track: SoloTrack): string => {
  const short = (level: string): string => level.replace(/\s*\(.*\)\s*$/, '');
  const first = short(track.levels[0]);
  const last = short(track.levels[track.levels.length - 1]);
  return first === last ? first : `${first} → ${last}`;
};

export const SoloSetupScreen: React.FC<SoloSetupScreenProps> = ({ onStart, onExit, isSignedIn }) => {
  const [selectedId, setSelectedId] = useState<string>(SOLO_TRACKS[0].id);

  // Local bests are device-scoped; read them once per mount.
  const bests = useMemo(
    () => Object.fromEntries(SOLO_TRACKS.map((track) => [track.id, readLocalSoloBest(track.id)])),
    [],
  );

  const selected = SOLO_TRACKS.find((track) => track.id === selectedId) ?? SOLO_TRACKS[0];

  return (
    <div className="flex h-full min-h-0 flex-col items-center gap-4 overflow-y-auto px-1 py-2 text-light-text animate-fadeInScaleUp">
      <div className="w-full shrink-0 text-center">
        <h2 className="text-2xl font-bold tracking-wide text-cyber-purple font-heading sm:text-3xl">
          🎯 SOLO MODE
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-text">
          You are the guesser. Each word comes with a clue — type your answer or say it out loud.
          Words start easy and get harder as you climb.
        </p>
      </div>

      <div className="grid w-full shrink-0 gap-3 sm:grid-cols-2">
        {SOLO_TRACKS.map((track) => {
          const isSelected = track.id === selectedId;
          const best = bests[track.id];
          return (
            <button
              key={track.id}
              type="button"
              onClick={() => setSelectedId(track.id)}
              aria-pressed={isSelected}
              className={`group relative flex flex-col items-start rounded-xl border bg-white/5 p-4 text-left backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 ${track.accentBorder} ${track.glow} ${
                isSelected ? 'ring-2 ring-electric-blue' : ''
              }`}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="text-3xl" role="img" aria-hidden="true">
                  {track.emoji}
                </span>
                {best && (
                  <span className="shrink-0 rounded-full bg-dark-metal/70 px-2 py-0.5 text-[0.65rem] font-semibold text-warning-yellow">
                    ★ {best.score.toLocaleString()}
                  </span>
                )}
              </div>
              <span className={`mt-2 font-heading text-lg font-bold ${track.accentText}`}>{track.name}</span>
              <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-text/80">
                {rangeLabel(track)}
              </span>
              <span className="mt-1.5 text-xs leading-snug text-muted-text">{track.tagline}</span>
            </button>
          );
        })}
      </div>

      <div className="w-full shrink-0 rounded-xl border border-electric-blue/30 bg-dark-metal/50 p-3 text-center">
        <p className="text-xs text-muted-text">
          <strong className="text-light-text">{SOLO_WORDS_PER_RUN} words</strong> ·{' '}
          <strong className="text-light-text">{SOLO_TIME_PER_WORD}s</strong> per word · guess by
          typing or speaking 🎤
        </p>
        <p className="mt-1 text-[0.7rem] text-muted-text/80">
          {isSignedIn
            ? 'Your score is saved to the leaderboard.'
            : 'Playing offline — sign in to join the shared leaderboard.'}
        </p>
      </div>

      <div className="flex w-full shrink-0 flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onExit}
          className="futuristic-button w-full rounded-lg border border-cyber-purple/60 bg-cyber-purple/40 px-6 py-2.5 text-sm font-semibold text-light-text/90 hover:bg-cyber-purple/60 sm:w-auto"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => onStart(selected)}
          className="futuristic-button w-full flex-grow rounded-lg bg-gradient-to-r from-cyber-purple to-electric-blue px-8 py-2.5 text-md font-bold text-dark-metal shadow-md hover:shadow-lg"
        >
          ▶ Start {selected.name} run
        </button>
      </div>
    </div>
  );
};
