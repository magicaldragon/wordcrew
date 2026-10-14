// Solo leaderboard.
//
// Two layers, mirroring the app's offline-first stance:
//   1. A per-device best score in localStorage — always available, even signed out
//      or offline, and it is what the setup screen shows before a run.
//   2. A shared Firestore board (one document per player per track) so signed-in
//      players compete across devices. Every Firestore call is best-effort: if the
//      rules or the network say no, the game carries on with the local result.

import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface SoloScoreEntry {
  uid: string;
  name: string;
  score: number;
  wordsGuessed: number;
  bestStreak: number;
  updatedAt: number;
}

const LOCAL_PREFIX = 'wordcrew_solo_best_';
const COLLECTION = 'soloLeaderboards';

const readRaw = (trackId: string): SoloScoreEntry | null => {
  try {
    const raw = localStorage.getItem(LOCAL_PREFIX + trackId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SoloScoreEntry;
    if (!parsed || typeof parsed.score !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
};

/** The best score this device has ever recorded on a track (or null). */
export const readLocalSoloBest = (trackId: string): SoloScoreEntry | null => readRaw(trackId);

/** Stores the entry when it beats the stored best; returns the winning entry. */
export const saveLocalSoloBest = (trackId: string, entry: SoloScoreEntry): SoloScoreEntry => {
  const current = readRaw(trackId);
  const winner = current && current.score >= entry.score ? current : entry;
  try {
    localStorage.setItem(LOCAL_PREFIX + trackId, JSON.stringify(winner));
  } catch {
    /* Storage unavailable — the run still counts for this session. */
  }
  return winner;
};

/**
 * Publishes a run to the shared board. Only overwrites the player's own document
 * when the new score is higher, so a bad run never erases a personal best.
 */
export const submitSoloScore = async (trackId: string, entry: SoloScoreEntry): Promise<void> => {
  if (!db) return;
  try {
    const ref = doc(db, COLLECTION, trackId, 'scores', entry.uid);
    const existing = await getDoc(ref);
    if (existing.exists() && ((existing.data() as SoloScoreEntry).score ?? 0) >= entry.score) return;
    await setDoc(ref, entry);
  } catch (error) {
    // Rules or network — the local best still stands.
    console.warn('[WordCrew] Could not publish the solo score.', error);
  }
};

/** Top scores for a track, highest first. Returns null when the board is unavailable. */
export const fetchSoloLeaderboard = async (
  trackId: string,
  max = 10,
): Promise<SoloScoreEntry[] | null> => {
  if (!db) return null;
  try {
    const board = collection(db, COLLECTION, trackId, 'scores');
    const snapshot = await getDocs(query(board, orderBy('score', 'desc'), limit(max)));
    return snapshot.docs.map((item) => item.data() as SoloScoreEntry);
  } catch (error) {
    console.warn('[WordCrew] Could not load the solo leaderboard.', error);
    return null;
  }
};
