// Solo leaderboard.
//
// Two layers, mirroring the app's offline-first stance:
//   1. A per-device best score in localStorage — always available, even signed out
//      or offline, and it is what the setup screen shows before a run.
//   2. A shared Firestore board so signed-in players compete across devices. Every
//      Firestore call is best-effort: if the rules or the network say no, the game
//      carries on with the local result.
//
// Boards reset on a period. A track board is monthly (`2026-10`), the daily challenge
// is daily (`2026-10-16`). Scores live *under* their period
// (`soloLeaderboards/{boardId}/periods/{period}/scores/{uid}`), so a new period is a
// new competition and every finished month stays on disk for the admin's monthly
// records — no cron, no cleanup job, no second collection.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { addDays, localDateId, monthId } from './periods';

export interface SoloScoreEntry {
  uid: string;
  name: string;
  score: number;
  wordsGuessed: number;
  bestStreak: number;
  updatedAt: number;
  /** `YYYY-MM` on a track board, `YYYY-MM-DD` on the daily one. */
  period: string;
}

export interface SoloBoard {
  /** Top rows for the period, highest first (already sliced to the requested size). */
  rows: SoloScoreEntry[];
  /** How many players are on the board this period — the basis for `rank`. */
  total: number;
  /** The signed-in player's 1-based rank, or null when they have no score yet. */
  rank: number | null;
}

const LOCAL_PREFIX = 'wordcrew_solo_best_';
const COLLECTION = 'soloLeaderboards';

/**
 * Every board a score can be posted to. Kept as plain ids (rather than importing the
 * game's track list) so this service stays light enough for the auth context to use.
 */
const LEADERBOARD_BOARD_IDS = ['rookie', 'explorer', 'challenger', 'master', 'daily'];

/**
 * How many entries are pulled for one period. Firestore cannot filter by period and
 * sort by score without a composite index, and the app cannot create one from the
 * client. Boards here are classroom-sized, so scanning a slice of the top scores of a
 * period — which is already a narrow collection path — avoids that requirement.
 */
const BOARD_SCAN_LIMIT = 100;

/** The period a board's scores belong to right now. */
export const currentPeriod = (boardId: string): string =>
  boardId === 'daily' ? localDateId() : monthId();

const scoreRef = (boardId: string, period: string, uid: string) =>
  doc(db!, COLLECTION, boardId, 'periods', period, 'scores', uid);

const readRaw = (boardId: string): SoloScoreEntry | null => {
  try {
    const raw = localStorage.getItem(LOCAL_PREFIX + boardId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SoloScoreEntry;
    if (!parsed || typeof parsed.score !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
};

/** The best score this device has ever recorded on a board (or null). */
export const readLocalSoloBest = (boardId: string): SoloScoreEntry | null => readRaw(boardId);

/** Stores the entry when it beats the stored best; returns the winning entry. */
export const saveLocalSoloBest = (boardId: string, entry: SoloScoreEntry): SoloScoreEntry => {
  const current = readRaw(boardId);
  const winner = current && current.score >= entry.score ? current : entry;
  try {
    localStorage.setItem(LOCAL_PREFIX + boardId, JSON.stringify(winner));
  } catch {
    /* Storage unavailable — the run still counts for this session. */
  }
  return winner;
};

/**
 * Publishes a run to the shared board. A worse score in the *same* period never erases
 * a personal best; it only refreshes the stored display name if the player renamed.
 */
export const submitSoloScore = async (boardId: string, entry: SoloScoreEntry): Promise<void> => {
  if (!db) return;
  try {
    const ref = scoreRef(boardId, entry.period, entry.uid);
    // The period document is the record the admin dashboard lists months from. It is
    // written alongside the score so an empty month never needs to appear anywhere.
    const periodRef = doc(db, COLLECTION, boardId, 'periods', entry.period);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      const data = existing.data() as SoloScoreEntry;
      if (data.name !== entry.name) {
        // A rename only touches the name; the score stays the personal best.
        await updateDoc(ref, { name: entry.name });
      }
      if ((data.score ?? 0) >= entry.score) {
        await setDoc(periodRef, { period: entry.period, updatedAt: Date.now() }, { merge: true });
        return;
      }
    }
    await setDoc(ref, entry);
    await setDoc(periodRef, { period: entry.period, updatedAt: Date.now() }, { merge: true });
  } catch (error) {
    // Rules or network — the local best still stands.
    console.warn('[WordCrew] Could not publish the solo score.', error);
  }
};

/**
 * The board for one period, plus where `uid` stands on it. Returns null when the board
 * is unavailable (offline, or the rules said no).
 */
export const fetchSoloBoard = async (
  boardId: string,
  period: string,
  uid: string | null,
  max = 10,
): Promise<SoloBoard | null> => {
  if (!db) return null;
  try {
    const board = collection(db, COLLECTION, boardId, 'periods', period, 'scores');
    const snapshot = await getDocs(query(board, orderBy('score', 'desc'), limit(BOARD_SCAN_LIMIT)));
    const ranked = snapshot.docs.map((item) => item.data() as SoloScoreEntry);
    const position = uid ? ranked.findIndex((entry) => entry.uid === uid) : -1;
    return {
      rows: ranked.slice(0, max),
      total: ranked.length,
      rank: position >= 0 ? position + 1 : null,
    };
  } catch (error) {
    console.warn('[WordCrew] Could not load the solo leaderboard.', error);
    return null;
  }
};

/**
 * Every month (or day, for the daily board) that has at least one score, newest first.
 * This is what the admin's monthly records pick from.
 */
export const listSoloPeriods = async (boardId: string): Promise<string[]> => {
  if (!db) return [];
  try {
    const snapshot = await getDocs(collection(db, COLLECTION, boardId, 'periods'));
    return snapshot.docs.map((item) => item.id).sort().reverse();
  } catch (error) {
    console.warn('[WordCrew] Could not list the solo periods.', error);
    return [];
  }
};

/**
 * The signed-in player's own daily results for the last `days` days, newest first.
 * Every day is returned, with `score: null` for a day without a run, so the caller can
 * draw the whole week — gaps included. Daily boards are archived under their day id,
 * which is what makes this a handful of point reads rather than a collection scan.
 */
export interface DailyHistoryRow {
  period: string;
  /** Null when the player did not finish a challenge that day. */
  score: number | null;
  wordsGuessed: number;
  bestStreak: number;
}

export const fetchMyDailyHistory = async (
  uid: string | null,
  days = 7,
): Promise<DailyHistoryRow[]> => {
  if (!db || !uid) return [];
  const today = new Date();
  const periods = Array.from({ length: days }, (_, index) =>
    localDateId(addDays(today, -index)),
  );
  return Promise.all(
    periods.map(async (period) => {
      try {
        const snapshot = await getDoc(scoreRef('daily', period, uid));
        if (!snapshot.exists()) {
          return { period, score: null, wordsGuessed: 0, bestStreak: 0 };
        }
        const data = snapshot.data() as SoloScoreEntry;
        return {
          period,
          score: data.score ?? 0,
          wordsGuessed: data.wordsGuessed ?? 0,
          bestStreak: data.bestStreak ?? 0,
        };
      } catch {
        return { period, score: null, wordsGuessed: 0, bestStreak: 0 };
      }
    }),
  );
};

/**
 * Re-labels a player's entries for the current period after a rename, so a board they
 * already scored on shows the new name without waiting for another run. Old months are
 * deliberately left untouched — they are records of what the board looked like then.
 */
export const refreshSoloDisplayName = async (uid: string, name: string): Promise<void> => {
  if (!db) return;
  await Promise.all(
    LEADERBOARD_BOARD_IDS.map(async (boardId) => {
      try {
        await updateDoc(scoreRef(boardId, currentPeriod(boardId), uid), { name });
      } catch {
        /* No entry on that board this period — nothing to rename. */
      }
    }),
  );
};
