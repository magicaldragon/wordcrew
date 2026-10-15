import React, { useEffect, useMemo, useState } from 'react';
import { AuthDialog } from './AuthDialog';
import { Icon } from './Icon';
import type { SoloRunResult, SoloTrack } from '../services/solo';
import { shortLevel } from '../services/solo';
import {
  fetchSoloLeaderboard,
  saveLocalSoloBest,
  submitSoloScore,
  type SoloScoreEntry,
} from '../services/soloLeaderboard';

interface SoloResultsScreenProps {
  track: SoloTrack;
  result: SoloRunResult;
  userId: string | null;
  userName: string | null;
  onPlayAgain: () => void;
  onHome: () => void;
}

const useCountUp = (target: number, durationMs = 900): number => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);
  return value;
};

export const SoloResultsScreen: React.FC<SoloResultsScreenProps> = ({
  track,
  result,
  userId,
  userName,
  onPlayAgain,
  onHome,
}) => {
  const shownScore = useCountUp(result.score);
  const [board, setBoard] = useState<SoloScoreEntry[] | null>(null);
  const [loadingBoard, setLoadingBoard] = useState(Boolean(userId));
  const [showAuth, setShowAuth] = useState(false);
  const [localBest, setLocalBest] = useState<number>(result.score);

  const accuracy = result.wordsPlayed > 0 ? Math.round((result.wordsGuessed / result.wordsPlayed) * 100) : 0;

  // Persist the run and, when signed in, publish it to the shared board.
  useEffect(() => {
    const entry: SoloScoreEntry = {
      uid: userId ?? 'local',
      name: userName ?? 'You',
      score: result.score,
      wordsGuessed: result.wordsGuessed,
      bestStreak: result.bestStreak,
      updatedAt: Date.now(),
    };
    const best = saveLocalSoloBest(track.id, entry);
    setLocalBest(best.score);

    if (!userId) {
      setLoadingBoard(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      await submitSoloScore(track.id, entry);
      const rows = await fetchSoloLeaderboard(track.id, 10);
      if (cancelled) return;
      setBoard(rows);
      setLoadingBoard(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [track.id, result, userId, userName]);

  const isNewBest = useMemo(() => result.score >= localBest && result.score > 0, [result.score, localBest]);

  return (
    <div className="flex h-full min-h-0 flex-col items-center gap-3 overflow-y-auto py-2 text-light-text animate-fadeInScaleUp">
      <h2 className="shrink-0 text-center text-2xl font-bold text-electric-blue font-heading sm:text-3xl">
        Run Over 🎯
      </h2>
      <p className="shrink-0 text-center text-sm text-muted-text">
        {track.emoji} {track.name} track · reached {shortLevel(result.levelReached)}
      </p>

      <p className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-muted-text">
        Final score
      </p>
      <p className="font-heading text-6xl font-extrabold text-neon-green sm:text-7xl">
        {shownScore.toLocaleString()}
      </p>
      {isNewBest && (
        <span className="rounded-full border border-warning-yellow/50 bg-warning-yellow/10 px-3 py-1 text-xs font-bold text-warning-yellow">
          ⭐ New personal best!
        </span>
      )}

      <div className="grid w-full shrink-0 grid-cols-3 gap-2 text-center">
        <div className="rounded-[var(--r-lg)] border border-[var(--hairline)] bg-[var(--surface-1)] p-2">
          <p className="text-lg font-bold text-light-text">{result.wordsGuessed}</p>
          <p className="text-[0.65rem] text-muted-text">Words guessed</p>
        </div>
        <div className="rounded-[var(--r-lg)] border border-[var(--hairline)] bg-[var(--surface-1)] p-2">
          <p className="text-lg font-bold text-danger-red">{result.bestStreak}</p>
          <p className="text-[0.65rem] text-muted-text">Best streak</p>
        </div>
        <div className="rounded-[var(--r-lg)] border border-[var(--hairline)] bg-[var(--surface-1)] p-2">
          <p className="text-lg font-bold text-neon-green">{accuracy}%</p>
          <p className="text-[0.65rem] text-muted-text">Accuracy</p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="w-full shrink-0 rounded-[var(--r-lg)] border border-electric-blue/30 bg-[var(--surface-1)] p-3">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-electric-blue">
          🏆 {track.name} leaderboard
        </p>

        {!userId ? (
          <div className="text-center">
            <p className="text-xs text-muted-text">
              Sign in to save your score and race other players.
            </p>
            <button
              type="button"
              onClick={() => setShowAuth(true)}
              className="futuristic-button mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-neon-green/50 bg-neon-green/10 px-4 py-2 text-xs font-semibold text-neon-green hover:bg-neon-green/20"
            >
              <Icon name="user" size={15} />
              Sign in
            </button>
          </div>
        ) : loadingBoard ? (
          <p className="animate-subtlePulse text-center text-xs text-muted-text">Loading…</p>
        ) : !board || board.length === 0 ? (
          <p className="text-center text-xs text-muted-text">
            {board ? 'No scores yet — you’re first!' : 'Leaderboard is unavailable right now.'}
          </p>
        ) : (
          <ol className="space-y-1">
            {board.map((row, i) => {
              const isMe = row.uid === userId;
              return (
                <li
                  key={row.uid}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                    isMe ? 'bg-electric-blue/20 text-light-text' : 'text-muted-text'
                  }`}
                >
                  <span className="w-5 shrink-0 text-center font-bold text-warning-yellow">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{row.name}{isMe ? ' (you)' : ''}</span>
                  <span className="shrink-0 font-bold tabular-nums text-light-text">
                    {row.score.toLocaleString()}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="flex w-full shrink-0 gap-2">
        <button
          type="button"
          onClick={onHome}
          className="futuristic-button w-full rounded-lg border border-cyber-purple/60 bg-cyber-purple/40 px-6 py-2.5 text-sm font-semibold text-light-text/90 hover:bg-cyber-purple/60"
        >
          Home
        </button>
        <button
          type="button"
          onClick={onPlayAgain}
          className="futuristic-button w-full flex-grow rounded-[var(--r-md)] min-h-[44px] bg-neon-green px-8 py-2.5 text-base font-bold text-dark-metal hover:bg-emerald-400"
        >
          ▶ Play again
        </button>
      </div>

      <AuthDialog
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        reason="Sign in to save your solo scores and join the leaderboard."
      />
    </div>
  );
};

export default SoloResultsScreen;
