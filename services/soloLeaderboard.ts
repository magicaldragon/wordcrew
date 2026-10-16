// Solo leaderboard.
//
// Two layers, mirroring the app's offline-first stance:
//   1. A per-device best score in localStorage — always available, even signed out
//      or offline, and it is what the setup screen shows before a run.
//   2. A shared Firestore board (one document per player per board) so signed-in
//      players compete across devices. Every Firestore call is best-effort: if the
//      rules or the network say no, the game carries on with the local result.
//
// Boards reset on a period. A track board is weekly (`2026-W42`), the daily challenge
// is daily (`2026-10-16`); the period is a plain field on the entry, so the weekly
// reset needs no cron, no cleanup job and no second collection — last week's rows are
// simply not shown. One document per player per board means a new period overwrites
// the previous score, which the rules allow (see firestore.rules).

import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { isoWeekId, localDateId } from './periods';

export interface SoloScoreEntry {
  uid: string;
  name: string;
  score: number;
  wordsGuessed: number;
  bestStreak: number;
  updatedAt: number;
  /** `YYYY-Www` on a track board, `YYYY-MM-DD` on the daily one. */
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
 * How many entries are pulled before the period filter is applied. Firestore cannot
 * filter by period and sort by score without a composite index, and the app cannot
 * create one from the client. Boards here are classroom-sized, so scanning a slice of
 * the top scores and filtering in memory avoids that requirement entirely.
 */
const BOARD_SCAN_LIMIT = 100;

/** The period a board's scores belong to right now. */
export const currentPeriod = (boardId: string): string =>
  boardId === 'daily' ? localDateId() : isoWeekId();

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
 * Publishes a run to the shared board. Two things stop a write: a worse score in the
 * *same* period (a personal best is never erased), and the Firestore rules. A new
 * period is a new competition, so a lower score there is written normally.
 */
export const submitSoloScore = async (boardId: string, entry: SoloScoreEntry): Promise<void> => {
  if (!db) return;
  try {
    const ref = doc(db, COLLECTION, boardId, 'scores', entry.uid);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      const data = existing.data() as SoloScoreEntry;
      if (data.period === entry.period && (data.score ?? 0) >= entry.score) return;
    }
    await setDoc(ref, entry);
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
    const board = collection(db, COLLECTION, boardId, 'scores');
    const snapshot = await getDocs(query(board, orderBy('score', 'desc'), limit(BOARD_SCAN_LIMIT)));
    const ranked = snapshot.docs
      .map((item) => item.data() as SoloScoreEntry)
      .filter((entry) => entry.period === period);
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
