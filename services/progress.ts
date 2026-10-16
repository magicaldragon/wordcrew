// Per-account play history.
//
// The portal's "My progress" tab reads the counters straight off `users/{uid}` — rounds
// played, best score, words guessed, best streak and a day streak — and this module is
// the only place that writes them. Either game (pass-and-play or Solo) reports a
// finished round here.
//
// Every call is best-effort, like the rest of the Firestore side: a signed-out player, an
// offline device or a rules rejection must never interrupt a round that just ended, so
// failures are swallowed and the run still counts for the session.

import { doc, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { addDays, localDateId } from './periods';

export interface RoundStats {
  /** Final score of the round (the winning team's points in Team Mode). */
  score: number;
  /** Words answered correctly during the round. */
  wordsGuessed: number;
  /** Longest run of consecutive correct answers. */
  bestStreak: number;
}

/** The counters as they live on `users/{uid}` — read back before each write. */
interface StoredProgress {
  roundsPlayed?: number;
  bestScore?: number;
  wordsGuessed?: number;
  bestStreak?: number;
  /** Local day id of the last finished round, and the streak it belongs to. */
  lastPlayedDate?: string;
  playStreak?: number;
}

/**
 * The day streak after finishing a round today. Playing twice in a day keeps the count
 * where it is; playing the day after the last round extends it; a gap of a day or more
 * starts again at 1.
 */
const nextPlayStreak = (lastPlayedDate: string | undefined, playStreak: number | undefined): number => {
  const today = localDateId();
  const yesterday = localDateId(addDays(new Date(), -1));
  if (lastPlayedDate === today) return playStreak ?? 1;
  return lastPlayedDate === yesterday ? (playStreak ?? 0) + 1 : 1;
};

/**
 * Folds one finished round into the account's lifetime counters. A transaction is used
 * because the "best" fields are maxima: two devices finishing at once must not let the
 * lower score overwrite the higher one. Keeping the streak on the same document too
 * means one read and one write covers both.
 */
export const recordRound = async (uid: string | null | undefined, stats: RoundStats): Promise<void> => {
  if (!db || !uid) return;
  try {
    const ref = doc(db, 'users', uid);
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(ref);
      const data = (snapshot.data() ?? {}) as StoredProgress;
      transaction.set(
        ref,
        {
          roundsPlayed: (data.roundsPlayed ?? 0) + 1,
          wordsGuessed: (data.wordsGuessed ?? 0) + Math.max(0, Math.round(stats.wordsGuessed)),
          bestScore: Math.max(data.bestScore ?? 0, Math.round(stats.score)),
          bestStreak: Math.max(data.bestStreak ?? 0, Math.round(stats.bestStreak)),
          playStreak: nextPlayStreak(data.lastPlayedDate, data.playStreak),
          lastPlayedDate: localDateId(),
        },
        { merge: true },
      );
    });
  } catch (error) {
    // Rules or network — the round simply does not reach the counters.
    console.warn('[WordCrew] Could not record the round.', error);
  }
};
