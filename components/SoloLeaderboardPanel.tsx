import React, { useEffect, useMemo, useState } from 'react';
import { AuthDialog } from './AuthDialog';
import { Icon } from './Icon';
import { useAuth } from '../contexts/AuthContext';
import { DAILY_TRACK, SOLO_FREE_TRACK_ID, SOLO_TRACKS, shortLevel, type SoloTrack } from '../services/solo';
import { addDays, localDateId } from '../services/periods';
import {
  currentPeriod,
  fetchSoloBoard,
  readLocalSoloBest,
  type SoloBoard,
} from '../services/soloLeaderboard';

interface SoloLeaderboardPanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** Drives the lock badge on the tracks that ship with the Full Version. */
  isUnlocked: boolean;
}

const MEDALS = ['🥇', '🥈', '🥉'];

/** How many days of the daily board stay one tap away in the archive. */
const DAILY_ARCHIVE_DAYS = 7;

const dailyDateLabel = (dateId: string, index: number): string => {
  if (index === 0) return 'Today';
  if (index === 1) return 'Yest.';
  return new Date(`${dateId}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' });
};

const longDate = (dateId: string): string =>
  new Date(`${dateId}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

/** Every board the panel can show: the four CEFR tracks, then the challenge of the day. */
const BOARDS: SoloTrack[] = [...SOLO_TRACKS, DAILY_TRACK];

/**
 * The Solo board, opened from the dashboard hero.
 *
 * One board per track (not one global board), so a beginner and a B2 student
 * compete like-for-like — plus Today's Challenge, which is the same seeded run for
 * everyone. Boards reset on a period (monthly for the tracks, daily for the challenge);
 * the tracks show the current month, while the daily board keeps the last week
 * selectable so a missed day can still be looked up — the score itself is archived
 * under its own day id in Firestore.
 *
 * The device best is shown straight from localStorage, so the panel is useful signed
 * out and offline; the shared Firestore board only loads once there is a signed-in
 * player to highlight.
 */
export const SoloLeaderboardPanel: React.FC<SoloLeaderboardPanelProps> = ({
  isOpen,
  onClose,
  isUnlocked,
}) => {
  const { user } = useAuth();
  const [boardId, setBoardId] = useState(SOLO_TRACKS[0].id);
  const [board, setBoard] = useState<SoloBoard | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  // Which day of the daily archive is open; reset to today every time the panel opens.
  const [dailyDate, setDailyDate] = useState(() => localDateId());

  const track = useMemo(() => BOARDS.find((item) => item.id === boardId) ?? BOARDS[0], [boardId]);
  const isDaily = track.id === DAILY_TRACK.id;
  const period = isDaily ? dailyDate : currentPeriod(boardId);
  const isToday = dailyDate === localDateId();
  const dailyDates = useMemo(
    () =>
      isOpen
        ? Array.from({ length: DAILY_ARCHIVE_DAYS }, (_, index) =>
            localDateId(addDays(new Date(), -index)),
          )
        : [],
    [isOpen],
  );
  const localBest = useMemo(() => (isOpen ? readLocalSoloBest(boardId) : null), [isOpen, boardId]);
  const isTrackLocked = !isUnlocked && !isDaily && track.id !== SOLO_FREE_TRACK_ID;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setDailyDate(localDateId());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !user) {
      setBoard(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const rows = await fetchSoloBoard(boardId, period, user.uid, 10);
      if (cancelled) return;
      setBoard(rows);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, user, boardId, period]);

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
    if (board.rows.length === 0) {
      return (
        <p className="text-center text-xs text-[var(--wn-9)]">
          {isDaily && !isToday ? 'No scores on that day.' : 'No scores yet — you’re first!'}
        </p>
      );
    }
    return (
      <>
        <ol className="space-y-1">
          {board.rows.map((row, index) => {
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
        {board.rank !== null && board.rank > board.rows.length && (
          <p className="mt-2 text-center text-xs font-semibold text-[var(--wa-10)]">
            You’re #{board.rank} of {board.total}{' '}
            {isDaily ? (isToday ? 'today' : 'that day') : 'this month'}.
          </p>
        )}
      </>
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
              Every board keeps its own scores, so a run is judged against the same word set.
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

        <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Choose a board">
          {BOARDS.map((item) => {
            const isActive = item.id === boardId;
            const locked = !isUnlocked && item.id !== DAILY_TRACK.id && item.id !== SOLO_FREE_TRACK_ID;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setBoardId(item.id)}
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

        {isDaily && (
          <div className="mt-3">
            <p className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--wn-9)]">
              Daily archive
            </p>
            <div
              className="wc-scroll -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
              role="group"
              aria-label="Choose a day"
            >
              {dailyDates.map((date, index) => {
                const isActive = date === dailyDate;
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setDailyDate(date)}
                    aria-pressed={isActive}
                    className={`wc-btn wc-btn-sm shrink-0 ${isActive ? 'wc-btn-primary' : 'wc-btn-ghost'}`}
                  >
                    {dailyDateLabel(date, index)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <p className="mt-2 text-xs text-[var(--wn-9)]">
          {track.tagline} · {track.levels.map(shortLevel).join(' → ')}
        </p>
        <p className="mt-1 text-xs font-semibold text-[var(--wa-10)]">
          {isDaily
            ? isToday
              ? 'Today only — resets at midnight. Past days stay in the archive.'
              : `Archived board · ${longDate(dailyDate)}`
            : 'This month — resets on the 1st.'}
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
