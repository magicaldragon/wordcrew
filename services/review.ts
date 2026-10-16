// Memory Anchors — the words a player got wrong, kept and re-asked until they stick.
//
// Deliberately local-first: the list lives in localStorage, so it works signed out,
// offline, and without touching Firestore or the security rules. It is also the only
// place a run's missed words go.
//
// The schedule is a small Leitner ladder. A missed word is due immediately and rides
// along on the next few Solo runs (the sequence serves due words first); every correct
// recall pushes it further out, and it graduates off the list after enough of them.

import type { CEFRLevel } from '../cefrWordLists';

export interface ReviewItem {
  word: string;
  level: CEFRLevel;
  /** Times missed since the last graduation — the word's "weight". */
  misses: number;
  /** Correct recalls in a row since the last miss; indexes the interval ladder. */
  stage: number;
  lastSeen: number;
  /** Epoch ms the word becomes due again. */
  dueAt: number;
}

const STORAGE_KEY = 'wordcrew_review_v1';
/** Upper bound on the list, so a long losing streak cannot bloat storage. */
const MAX_ITEMS = 200;
/** Due words folded into one run. Enough to matter, few enough to not hijack it. */
export const REVIEW_PER_RUN = 8;
const DAY_MS = 86_400_000;
/**
 * Days until the next ask, indexed by `stage`. Stage 0 is "just missed" (due now); a
 * word graduates once its stage runs past the end of the ladder.
 */
const INTERVAL_DAYS = [0, 1, 3, 7, 16, 35];

const read = (): ReviewItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ReviewItem[]) : [];
  } catch {
    return [];
  }
};

const write = (items: ReviewItem[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* Storage full or blocked — reviewing is a bonus, never a blocker. */
  }
};

/** How many words are on the anchor list right now. */
export const reviewCount = (): number => read().length;

/** Anchored words that are due to be asked again, soonest first. */
export const readDueReviews = (now: number = Date.now()): ReviewItem[] =>
  read()
    .filter((item) => item.dueAt <= now)
    .sort((a, b) => a.dueAt - b.dueAt);

/**
 * Records words the player just missed: each is re-anchored (stage reset) and made due
 * immediately, so it comes back on the very next run.
 */
export const addMissedWords = (words: { word: string; level: CEFRLevel }[]): void => {
  if (words.length === 0) return;
  const now = Date.now();
  const items = read();
  const byWord = new Map(items.map((item) => [item.word.toLowerCase(), item]));

  for (const { word, level } of words) {
    const key = word.toLowerCase();
    const existing = byWord.get(key);
    if (existing) {
      existing.misses += 1;
      existing.stage = 0;
      existing.level = level;
      existing.lastSeen = now;
      existing.dueAt = now;
    } else {
      byWord.set(key, { word, level, misses: 1, stage: 0, lastSeen: now, dueAt: now });
    }
  }

  let values = [...byWord.values()];
  if (values.length > MAX_ITEMS) {
    // Keep the ones that still need work: drop the most-relearned first.
    values = values.sort((a, b) => a.stage - b.stage || a.dueAt - b.dueAt).slice(0, MAX_ITEMS);
  }
  write(values);
};

/**
 * Records a correct answer for a word under review, moving it one rung up the ladder.
 * Words that were never anchored are ignored, so this can be called for every correct
 * guess without a lookup of its own.
 */
export const markReviewCorrect = (word: string, now: number = Date.now()): void => {
  const key = word.toLowerCase();
  const items = read();
  const item = items.find((entry) => entry.word.toLowerCase() === key);
  if (!item) return;
  item.stage += 1;
  item.lastSeen = now;
  if (item.stage >= INTERVAL_DAYS.length) {
    write(items.filter((entry) => entry !== item));
    return;
  }
  item.dueAt = now + INTERVAL_DAYS[item.stage] * DAY_MS;
  write(items);
};

/** Forgets every anchor (offered on the results screen). */
export const clearReviews = (): void => write([]);
