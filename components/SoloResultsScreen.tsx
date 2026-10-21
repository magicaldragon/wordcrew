import React, { useEffect, useMemo, useState } from 'react';
import { AuthDialog } from './AuthDialog';
import { Icon } from './Icon';
import { SpeakButton } from './SpeakButton';
import { DAILY_BOARD_ID, shortLevel } from '../services/solo';
import type { SoloRunResult, SoloTrack } from '../services/solo';
import { dailyMilestone, type DailyCompletionOutcome } from '../services/dailyHabit';
import {
  fetchSoloBoard,
  saveLocalSoloBest,
  submitSoloScore,
  type SoloBoard,
  type SoloScoreEntry,
} from '../services/soloLeaderboard';
import { useT } from '../i18n/useT';
import { trackText } from '../i18n/tracks';
import { useLocale } from '../i18n/useLocale';

interface SoloResultsScreenProps {
  track: SoloTrack;
  result: SoloRunResult;
  userId: string | null;
  userName: string | null;
  /** Consecutive daily runs, shown on the challenge result to make tomorrow matter. */
  dailyStreak?: number;
  /** Longest streak ever — the source of the milestone badge. */
  dailyBestStreak?: number;
  /** What this run did to the habit; null for a replay or an offline run. */
  dailyOutcome?: DailyCompletionOutcome | null;
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
  dailyStreak = 0,
  dailyBestStreak = 0,
  dailyOutcome = null,
  onPlayAgain,
  onHome,
}) => {
  const t = useT('solo');
  const common = useT('common');
  const gameTracks = useT('game').setup.tracks;
  const trackName = trackText(gameTracks, track).name;
  const locale = useLocale();
  const shownScore = useCountUp(result.score);
  const [board, setBoard] = useState<SoloBoard | null>(null);
  const [loadingBoard, setLoadingBoard] = useState(Boolean(userId));
  const [showAuth, setShowAuth] = useState(false);
  const [localBest, setLocalBest] = useState<number>(result.score);

  const accuracy = result.wordsPlayed > 0 ? Math.round((result.wordsGuessed / result.wordsPlayed) * 100) : 0;
  const isDaily = result.boardId === DAILY_BOARD_ID;
  const missed = result.missedWords;
  // The fresh outcome beats the profile snapshot, which may still be one write behind.
  const streak = dailyOutcome?.streak ?? dailyStreak;
  const bestStreak = dailyOutcome?.bestStreak ?? dailyBestStreak;
  const { current: badge } = dailyMilestone(bestStreak);
  // Best only ever grows by one, so equality means the badge was earned by this run.
  const badgeUnlockedNow = Boolean(dailyOutcome && badge && dailyOutcome.bestStreak === badge.at);

  // Persist the run and, when signed in, publish it to the board for this period.
  useEffect(() => {
    const entry: SoloScoreEntry = {
      uid: userId ?? 'local',
      name: userName ?? 'You',
      score: result.score,
      wordsGuessed: result.wordsGuessed,
      bestStreak: result.bestStreak,
      updatedAt: Date.now(),
      period: result.period,
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
      const rows = await fetchSoloBoard(track.id, result.period, userId, 10);
      if (cancelled) return;
      setBoard(rows);
      setLoadingBoard(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [track.id, result, userId, userName]);

  const isNewBest = useMemo(() => result.score >= localBest && result.score > 0, [result.score, localBest]);
  // A rank below the visible top 10 still matters: it is the player's standing, not the
  // leaderboard's contents, that brings them back tomorrow.
  const rankOutsideTop = Boolean(board && board.rank && board.rank > (board.rows.length || 10));

  return (
    <div className="flex h-full min-h-0 flex-col items-center gap-3 overflow-y-auto py-2 text-light-text animate-fadeInScaleUp">
      <h2 className="shrink-0 text-center text-2xl font-bold text-electric-blue font-heading sm:text-3xl">
        {isDaily ? t.results.titleDaily : t.results.title}
      </h2>
      <p className="shrink-0 text-center text-sm text-muted-text">
        {track.emoji} {trackName} · {t.results.reached(shortLevel(result.levelReached))}
      </p>

      <p className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-muted-text">
        {t.results.finalScore}
      </p>
      <p className="font-heading text-6xl font-extrabold text-neon-green sm:text-7xl">
        {shownScore.toLocaleString(locale)}
      </p>
      {isNewBest && (
        <span className="rounded-full border border-warning-yellow/50 bg-warning-yellow/10 px-3 py-1 text-xs font-bold text-warning-yellow">
          {t.results.newBest}
        </span>
      )}
      {isDaily && userId && streak > 0 && (
        <span className="rounded-full border border-danger-red/40 bg-danger-red/10 px-3 py-1 text-xs font-bold text-danger-red">
          {t.results.streak(streak)}
        </span>
      )}
      {isDaily && userId && badge && (
        <span
          className={`rounded-full border px-3 py-1 text-xs font-bold ${
            badgeUnlockedNow
              ? 'border-warning-yellow/60 bg-warning-yellow/15 text-warning-yellow'
              : 'border-cyber-purple/50 bg-cyber-purple/20 text-light-text/90'
          }`}
        >
          {badgeUnlockedNow
            ? t.results.badgeUnlocked(badge.emoji, t.badges[badge.label] ?? badge.label)
            : t.results.badgeBest(badge.emoji, t.badges[badge.label] ?? badge.label, bestStreak)}
        </span>
      )}
      {isDaily && userId && dailyOutcome && dailyOutcome.freezesSpent > 0 && (
        <span className="rounded-full border border-electric-blue/40 bg-electric-blue/10 px-3 py-1 text-xs font-bold text-electric-blue">
          {t.results.freezeUsed(dailyOutcome.freezesLeft)}
        </span>
      )}

      <div className="grid w-full shrink-0 grid-cols-3 gap-2 text-center">
        <div className="rounded-[var(--r-lg)] border border-[var(--hairline)] bg-[var(--surface-1)] p-2">
          <p className="text-lg font-bold text-light-text">{result.wordsGuessed}</p>
          <p className="text-[0.65rem] text-muted-text">{t.results.wordsGuessed}</p>
        </div>
        <div className="rounded-[var(--r-lg)] border border-[var(--hairline)] bg-[var(--surface-1)] p-2">
          <p className="text-lg font-bold text-danger-red">{result.bestStreak}</p>
          <p className="text-[0.65rem] text-muted-text">{t.results.bestStreak}</p>
        </div>
        <div className="rounded-[var(--r-lg)] border border-[var(--hairline)] bg-[var(--surface-1)] p-2">
          <p className="text-lg font-bold text-neon-green">{accuracy}%</p>
          <p className="text-[0.65rem] text-muted-text">{t.results.accuracy}</p>
        </div>
      </div>

      {/* Memory Anchors — the words missed this run, each one playable out loud. */}
      {missed.length > 0 && (
        <div className="w-full shrink-0 rounded-[var(--r-lg)] border border-warning-yellow/30 bg-[var(--surface-1)] p-3">
          <p className="mb-1 text-center text-xs font-semibold uppercase tracking-widest text-warning-yellow">
            {t.results.reviewTitle}
          </p>
          <p className="mb-2 text-center text-[0.7rem] text-muted-text">
            {t.results.reviewBody}
          </p>
          <ul className="space-y-1">
            {missed.map((item) => (
              <li
                key={item.word}
                className="flex items-center gap-2 rounded-lg bg-dark-metal/40 px-2 py-1.5"
              >
                <span className="min-w-0 flex-1 truncate font-heading text-base font-bold text-light-text">
                  {item.word}
                </span>
                <span className="shrink-0 rounded-full border border-electric-blue/30 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-electric-blue">
                  {shortLevel(item.level)}
                </span>
                <SpeakButton word={item.word} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Leaderboard */}
      <div className="w-full shrink-0 rounded-[var(--r-lg)] border border-electric-blue/30 bg-[var(--surface-1)] p-3">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-electric-blue">
          {t.results.trackBoard(trackName)}
        </p>
        <p className="-mt-1 mb-2 text-center text-[0.65rem] text-muted-text">
          {isDaily ? t.results.periodDaily : t.results.periodMonth}
        </p>

        {!userId ? (
          <div className="text-center">
            <p className="text-xs text-muted-text">
              {t.results.signInPrompt}
            </p>
            <button
              type="button"
              onClick={() => setShowAuth(true)}
              className="futuristic-button mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-neon-green/50 bg-neon-green/10 px-4 py-2 text-xs font-semibold text-neon-green hover:bg-neon-green/20"
            >
              <Icon name="user" size={15} />
              {common.signIn}
            </button>
          </div>
        ) : loadingBoard ? (
          <p className="animate-subtlePulse text-center text-xs text-muted-text">{common.loading}</p>
        ) : !board || board.rows.length === 0 ? (
          <p className="text-center text-xs text-muted-text">
            {board ? t.results.noScores : t.results.unavailable}
          </p>
        ) : (
          <>
            <ol className="space-y-1">
              {board.rows.map((row, i) => {
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
                    <span className="min-w-0 flex-1 truncate">{row.name}{isMe ? t.youSuffix : ''}</span>
                    <span className="shrink-0 font-bold tabular-nums text-light-text">
                      {row.score.toLocaleString(locale)}
                    </span>
                  </li>
                );
              })}
            </ol>
            {rankOutsideTop && (
              <p className="mt-2 text-center text-xs font-semibold text-warning-yellow">
                {isDaily
                  ? t.results.rankDay(board.rank as number, board.total)
                  : t.results.rankMonth(board.rank as number, board.total)}
              </p>
            )}
          </>
        )}
      </div>

      <div className="flex w-full shrink-0 gap-2">
        <button
          type="button"
          onClick={onHome}
          className="futuristic-button w-full rounded-lg border border-cyber-purple/60 bg-cyber-purple/40 px-6 py-2.5 text-sm font-semibold text-light-text/90 hover:bg-cyber-purple/60"
        >
          {t.results.home}
        </button>
        <button
          type="button"
          onClick={onPlayAgain}
          className="futuristic-button w-full flex-grow rounded-[var(--r-md)] min-h-[44px] bg-neon-green px-8 py-2.5 text-base font-bold text-dark-metal hover:bg-emerald-400"
        >
          {t.results.playAgain}
        </button>
      </div>

      <AuthDialog
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        reason={t.signInReason}
      />
    </div>
  );
};

export default SoloResultsScreen;
