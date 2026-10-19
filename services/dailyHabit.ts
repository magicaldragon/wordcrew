// Daily-challenge habit.
//
// Today's Challenge is the one run that is identical for every player, so the habit
// metric is not the score — it is *showing up*. This module owns the day streak that
// lives on `users/{uid}`:
//
//   dailyStreak        consecutive days with a finished challenge
//   dailyBestStreak    the longest streak ever reached
//   lastDailyDate      the day id the streak last counted (`YYYY-MM-DD`)
//   dailyFreezeMonth   month the freeze allowance below belongs to (`YYYY-MM`)
//   dailyFreezesUsed   freezes spent in that month
//
// A missed day would normally reset the streak to 1, which is exactly the moment a
// player quits. Two freezes per calendar month silently cover up to two missed days,
// so one busy evening does not throw away three weeks of habit. Freezes are consumed
// automatically — there is no inventory to manage and no button to forget.
//
// Like the rest of the Firestore side this is best-effort: a guest, an offline device
// or a rules rejection must never interrupt a finished run.

import { doc, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { localDateId } from './periods';

/** Freezes granted per calendar month. */
export const DAILY_FREEZES_PER_MONTH = 2;

/**
 * Streak milestones. A badge is derived from `dailyBestStreak`, so unlocking one needs
 * no extra field and no migration — the number *is* the badge.
 */
export const DAILY_MILESTONES = [
  { at: 3, label: 'Regular', emoji: '🌱' },
  { at: 7, label: 'Committed', emoji: '🔥' },
  { at: 14, label: 'Unstoppable', emoji: '⚡' },
  { at: 30, label: 'Legend', emoji: '🏅' },
  { at: 60, label: 'Icon', emoji: '👑' },
] as const;

export type DailyMilestone = (typeof DAILY_MILESTONES)[number];

/** The highest badge earned and the one still ahead (either can be null). */
export const dailyMilestone = (
  bestStreak: number | null | undefined,
): { current: DailyMilestone | null; next: DailyMilestone | null } => {
  const best = Math.max(0, Math.round(bestStreak ?? 0));
  let current: DailyMilestone | null = null;
  let next: DailyMilestone | null = null;
  for (const milestone of DAILY_MILESTONES) {
    if (best >= milestone.at) current = milestone;
    else if (!next) next = milestone;
  }
  return { current, next };
};

/** What a finished challenge did to the habit — shown on the results screen. */
export interface DailyCompletionOutcome {
  streak: number;
  bestStreak: number;
  /** Freezes this run consumed (0 unless the player skipped days). */
  freezesSpent: number;
  /** Freezes still available this month. */
  freezesLeft: number;
}

interface HabitDoc {
  dailyStreak?: number;
  dailyBestStreak?: number;
  lastDailyDate?: string;
  dailyFreezeMonth?: string;
  dailyFreezesUsed?: number;
}

/** Parses a local `YYYY-MM-DD` id into a local midnight Date (null when malformed). */
const parseDateId = (id: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(id);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

/** Whole days from `from` to `to`; rounded so DST does not shift the count. */
const daysBetween = (from: string, to: string): number => {
  const start = parseDateId(from);
  const end = parseDateId(to);
  if (!start || !end) return 0;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
};

/**
 * Folds today's finished challenge into the streak. Completing the same day twice is a
 * no-op; missing days are paid for with the month's freezes when there are enough,
 * otherwise the streak starts again at 1. Returns what changed, or null when nothing did.
 */
export const recordDailyCompletion = async (
  uid: string | null | undefined,
  dateId: string = localDateId(),
): Promise<DailyCompletionOutcome | null> => {
  if (!db || !uid || !parseDateId(dateId)) return null;
  try {
    const ref = doc(db, 'users', uid);
    return await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(ref);
      const data = (snapshot.data() ?? {}) as HabitDoc;
      if (data.lastDailyDate === dateId) return null;

      const month = dateId.slice(0, 7);
      const sameMonth = data.dailyFreezeMonth === month;
      const usedBefore = sameMonth ? Math.max(0, Math.round(data.dailyFreezesUsed ?? 0)) : 0;
      let freezesUsed = usedBefore;
      let streak = Math.max(0, Math.round(data.dailyStreak ?? 0));

      if (!data.lastDailyDate) {
        streak = 1;
      } else {
        const gap = daysBetween(data.lastDailyDate, dateId);
        // Same day, or the device clock jumped backwards — leave the streak alone.
        if (gap <= 0) return null;
        const missed = gap - 1;
        if (missed <= DAILY_FREEZES_PER_MONTH - freezesUsed) {
          freezesUsed += missed;
          streak = Math.max(1, streak) + 1;
        } else {
          streak = 1;
        }
      }

      const bestStreak = Math.max(Math.round(data.dailyBestStreak ?? 0), streak);
      transaction.set(
        ref,
        {
          dailyStreak: streak,
          dailyBestStreak: bestStreak,
          lastDailyDate: dateId,
          dailyFreezeMonth: month,
          dailyFreezesUsed: freezesUsed,
        },
        { merge: true },
      );

      return {
        streak,
        bestStreak,
        freezesSpent: freezesUsed - usedBefore,
        freezesLeft: Math.max(0, DAILY_FREEZES_PER_MONTH - freezesUsed),
      };
    });
  } catch (error) {
    // Rules or network — the run still counts for this session.
    console.warn('[WordCrew] Could not record the daily streak.', error);
    return null;
  }
};
