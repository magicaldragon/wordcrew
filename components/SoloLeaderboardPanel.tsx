import React, { useEffect, useMemo, useState } from 'react';
import { AuthDialog } from './AuthDialog';
import { Icon } from './Icon';
import { useAuth } from '../contexts/AuthContext';
import { SOLO_FREE_TRACK_ID, SOLO_TRACKS, shortLevel } from '../services/solo';
import {
  fetchSoloLeaderboard,
  readLocalSoloBest,
  type SoloScoreEntry,
} from '../services/soloLeaderboard';

interface SoloLeaderboardPanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** Drives the lock badge on the tracks that ship with the Full Version. */
  isUnlocked: boolean;
}

const MEDALS = ['🥇', '🥈', '🥉'];

/**
 * The Solo board, opened from the dashboard hero.
 *
 * One board per track (not one global board), so a beginner and a B2 student
 * compete like-for-like. The device best is shown straight from localStorage, so
 * the panel is useful signed out and offline; the shared Firestore board only
 * loads once there is a signed-in player to highlight.
 */
export const SoloLeaderboardPanel: React.FC<SoloLeaderboardPanelProps> = ({
  isOpen,
  onClose,
  isUnlocked,
}) => {
  const { user } = useAuth();
  const [trackId, setTrackId] = useState(SOLO_TRACKS[0].id);
  const [board, setBoard] = useState<SoloScoreEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const track = useMemo(
    () => SOLO_TRACKS.find((item) => item.id === trackId) ?? SOLO_TRACKS[0],
    [trackId],
  );
  const localBest = useMemo(() => (isOpen ? readLocalSoloBest(trackId) : null), [isOpen, trackId]);
  const isTrackLocked = !isUnlocked && track.id !== SOLO_FREE_TRACK_ID;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !user) {
      setBoard(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const rows = await fetchSoloLeaderboard(trackId, 10);
      if (cancelled) return;
      setBoard(rows);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, user, trackId]);

  if (!isOpen) return null;

  const renderBoard = () => {
    if (!user) {
      return (
        <div className="text-center">
          <p className="text-xs text-[var(--wn-9)]">
            Sign in to post a score and race other players. Your device best is kept either way.
          </p>
          <button
            type="button"
            onClick={() => setShowAuth(true)}
            className="wc-btn wc-btn-secondary wc-btn-sm mt-3"
          >
            <Icon name="user" size={15} />
            Sign in
          </button>
        </div>
      );
    }
    if (loading) {
      return <p className="animate-subtlePulse text-center text-xs text-[var(--wn-9)]">Loading…</p>;
    }
    if (!board) {
      return (
        <p className="text-center text-xs text-[var(--wn-9)]">
          Leaderboard is unavailable right now.
        </p>
      );
    }
    if (board.length === 0) {
      return (
        <p className="text-center text-xs text-[var(--wn-9)]">No scores yet — you’re first!</p>
      );
    }
    return (
      <ol className="space-y-1">
        {board.map((row, index) => {
          const isMe = row.uid === user.uid;
          return (
            <li
              key={row.uid}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                isMe ? 'bg-[var(--wa-3)] font-semibold text-[var(--wn-12)]' : 'text-[var(--wn-10)]'
              }`}
            >
              <span className="w-5 shrink-0 text-center font-bold text-[var(--wa-10)]">
                {MEDALS[index] ?? index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {row.name}
                {isMe ? ' (you)' : ''}
              </span>
              <span className="shrink-0 font-bold tabular-nums text-[var(--wn-12)]">
                {row.score.toLocaleString()}
              </span>
            </li>
          );
        })}
      </ol>
    );
  };

  return (
    <div
      className="wc-theme fixed inset-0 z-[var(--z-dialog)] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="soloLeaderboardTitle"
      onClick={onClose}
    >
      <div
        className="wc-card wc-scroll max-h-[92vh] w-full max-w-md overflow-y-auto p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="soloLeaderboardTitle"
              className="flex items-center gap-2 text-xl font-bold tracking-wide text-[var(--wn-12)]"
            >
              <Icon name="trophy" size={20} />
              Solo leaderboard
            </h2>
            <p className="mt-1 text-xs text-[var(--wn-9)]">
              Every track keeps its own board, so the run is judged against the same word set.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 -mt-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--wn-9)] transition hover:bg-[var(--wn-3)] hover:text-[var(--wn-12)]"
            aria-label="Close"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Choose a track">
          {SOLO_TRACKS.map((item) => {
            const isActive = item.id === trackId;
            const locked = !isUnlocked && item.id !== SOLO_FREE_TRACK_ID;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTrackId(item.id)}
                aria-pressed={isActive}
                className={`wc-btn wc-btn-sm ${isActive ? 'wc-btn-primary' : 'wc-btn-ghost'}`}
              >
                <span aria-hidden="true">{item.emoji}</span>
                {item.name}
                {locked ? <Icon name="lock" size={13} /> : null}
              </button>
            );
          })}
        </div>

        <p className="mt-2 text-xs text-[var(--wn-9)]">
          {track.tagline} · {track.levels.map(shortLevel).join(' → ')}
        </p>

        {localBest && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[var(--wn-4)] bg-[var(--field-bg)] px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--wn-9)]">
              Your best here
            </span>
            <span className="text-sm font-bold tabular-nums text-[var(--wn-12)]">
              {localBest.score.toLocaleString()}
              <span className="ml-2 font-normal text-[var(--wn-9)]">
                {localBest.wordsGuessed} words
              </span>
            </span>
          </div>
        )}

        <div className="mt-3 rounded-xl border border-[var(--wn-4)] bg-[var(--card-bg)] p-3">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-[var(--wa-10)]">
            {track.emoji} {track.name} board
          </p>
          {renderBoard()}
        </div>

        {isTrackLocked && (
          <p className="mt-3 text-center text-xs text-[var(--wn-9)]">
            This track is part of the Full Version — unlock to post a score on it.
          </p>
        )}
      </div>

      <AuthDialog
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        reason="Sign in to save your solo scores and join the leaderboard."
      />
    </div>
  );
};

export default SoloLeaderboardPanel;
