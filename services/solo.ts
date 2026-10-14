// Solo mode domain logic.
//
// Solo is the single-player counterpart of the pass-and-play game: here the *player*
// is the guesser. The app shows a clue (the Vietnamese gloss, plus a mild English
// synonym) and the player answers by typing or talking. Words are drawn from a
// ladder of CEFR packs and always played in ascending difficulty, so every run
// ramps up from the easiest band the track covers to its hardest.

import { CEFRLevel, cefrWordLists } from '../cefrWordLists';

export interface SoloTrack {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  /** Contiguous CEFR bands, always ordered easiest → hardest. */
  levels: CEFRLevel[];
  accentText: string;
  accentBorder: string;
  glow: string;
}

const L = CEFRLevel;

// Four tracks share the same easy → hard shape; they differ in how far up the CEFR
// ladder they climb. The leaderboard is per track, so a beginner and a B2 student
// each compete on a fair, like-for-like word set.
export const SOLO_TRACKS: SoloTrack[] = [
  {
    id: 'rookie',
    name: 'Rookie',
    emoji: '🌱',
    tagline: 'Warm up on everyday words — Starters up to Movers.',
    levels: [L.STARTERS, L.MOVERS],
    accentText: 'text-neon-green',
    accentBorder: 'border-neon-green/40 hover:border-neon-green',
    glow: 'hover:shadow-[0_0_25px_rgba(57,255,20,0.35)]',
  },
  {
    id: 'explorer',
    name: 'Explorer',
    emoji: '🚀',
    tagline: 'Everyday words up to A2 — Starters through Key.',
    levels: [L.STARTERS, L.MOVERS, L.FLYERS, L.KET],
    accentText: 'text-electric-blue',
    accentBorder: 'border-electric-blue/40 hover:border-electric-blue',
    glow: 'hover:shadow-[0_0_25px_rgba(0,255,255,0.35)]',
  },
  {
    id: 'challenger',
    name: 'Challenger',
    emoji: '🔥',
    tagline: 'Push into B1 territory — Starters through PET.',
    levels: [L.STARTERS, L.MOVERS, L.FLYERS, L.KET, L.PET],
    accentText: 'text-warning-yellow',
    accentBorder: 'border-warning-yellow/40 hover:border-warning-yellow',
    glow: 'hover:shadow-[0_0_25px_rgba(255,214,0,0.35)]',
  },
  {
    id: 'master',
    name: 'Master',
    emoji: '👑',
    tagline: 'The full ladder — Pre-A1 all the way to B2.',
    levels: [L.STARTERS, L.MOVERS, L.FLYERS, L.KET, L.PET, L.PRE_IELTS],
    accentText: 'text-cyber-purple',
    accentBorder: 'border-cyber-purple/40 hover:border-cyber-purple',
    glow: 'hover:shadow-[0_0_25px_rgba(191,0,255,0.35)]',
  },
];

export const getSoloTrack = (id: string | null | undefined): SoloTrack | undefined =>
  SOLO_TRACKS.find((track) => track.id === id);

/** Words played in a single run (kept fixed so scores are comparable per track). */
export const SOLO_WORDS_PER_RUN = 20;
/** Seconds allowed to guess each word before it is revealed and the run moves on. */
export const SOLO_TIME_PER_WORD = 15;
/** Base points for a correct guess before the speed bonus. */
export const SOLO_BASE_POINTS = 100;
/** Points added per second left on the per-word clock. */
export const SOLO_SPEED_POINTS_PER_SECOND = 6;
/** Flat bonus awarded on the 3rd consecutive correct guess and every one after. */
export const SOLO_STREAK_BONUS = 50;
/** Wrong guesses allowed before the answer is revealed. */
export const SOLO_MAX_ATTEMPTS = 3;

export interface SoloWord {
  word: string;
  level: CEFRLevel;
}

export interface SoloRunResult {
  trackId: string;
  score: number;
  wordsGuessed: number;
  bestStreak: number;
  total: number;
  timePerWord: number;
}

const shuffle = <T,>(input: T[], rng: () => number): T[] => {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const wordsOfLevel = (level: CEFRLevel): string[] => {
  const bucket = cefrWordLists[level];
  return [...bucket.nouns, ...bucket.verbs, ...bucket.adjectives, ...(bucket.phrasalVerbs ?? [])];
};

/**
 * Builds one run: `SOLO_WORDS_PER_RUN` words drawn evenly across the track's bands,
 * appended in ascending difficulty so the ramp is felt word by word. Every band is
 * guaranteed a slot (the remainder is handed to the harder bands) so the hardest
 * pack of the track is never dropped.
 */
export const buildSoloRun = (
  track: SoloTrack,
  rng: () => number = Math.random,
): SoloWord[] => {
  const bands = track.levels;
  if (bands.length === 0) return [];

  const base = Math.floor(SOLO_WORDS_PER_RUN / bands.length);
  const remainder = SOLO_WORDS_PER_RUN - base * bands.length;

  const run: SoloWord[] = [];
  bands.forEach((level, index) => {
    // Harder bands (at the end of the list) absorb the remainder first.
    const count = base + (index >= bands.length - remainder ? 1 : 0);
    const pool = shuffle(wordsOfLevel(level), rng);
    pool.slice(0, count).forEach((word) => run.push({ word, level }));
  });

  return run;
};

// ── Answer checking ────────────────────────────────────────────────────────
// Same approach as the notebook's dictation exercise: normalise, allow a small
// edit distance (tighter for short words), and match multi-word targets token by
// token so a spoken "get along" is accepted however the transcript is spaced.

const STOP_WORDS = new Set(['a', 'an', 'the']);

export const normalizeAnswer = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const levenshtein = (a: string, b: string): number => {
  const s = a;
  const t = b;
  const n = s.length;
  const m = t.length;
  if (n === 0) return m;
  if (m === 0) return n;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 0; i <= n; i += 1) dp[i][0] = i;
  for (let j = 0; j <= m; j += 1) dp[0][j] = j;
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[n][m];
};

const fuzzyEqual = (input: string, target: string): boolean => {
  if (input === target) return true;
  const maxDist = target.length <= 4 ? 1 : 2;
  return levenshtein(input, target) <= maxDist;
};

const tokenize = (value: string): string[] =>
  normalizeAnswer(value)
    .split(' ')
    .filter((token) => token && !STOP_WORDS.has(token));

/**
 * True when `input` (typed or transcribed) is an acceptable spelling of `target`:
 * exact match, the target appearing inside a longer phrase, an all-tokens match for
 * multi-word entries, or a small edit distance on the whole string.
 */
export const checkSoloAnswer = (input: string, target: string): boolean => {
  const guess = normalizeAnswer(input);
  const answer = normalizeAnswer(target);
  if (!guess || !answer) return false;
  if (guess === answer) return true;
  if (guess.includes(answer)) return true;

  const targetTokens = tokenize(answer);
  const guessTokens = tokenize(guess);

  if (targetTokens.length > 1) {
    if (guessTokens.length === 0) return false;
    const joined = guessTokens.join('');
    const allHit = targetTokens.every(
      (tt) => guessTokens.some((gt) => fuzzyEqual(gt, tt)) || joined.includes(tt),
    );
    if (allHit) return true;
  } else if (targetTokens.length === 1) {
    if (guessTokens.some((gt) => fuzzyEqual(gt, targetTokens[0]))) return true;
  }

  return fuzzyEqual(guess, answer);
};

/**
 * A light letter-shape hint for the guesser: the first letter of every word stays,
 * the rest become blanks. Multi-word entries keep each word's opening letter.
 */
export const maskWord = (word: string): string =>
  normalizeAnswer(word)
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0) + ' ' + '_'.repeat(Math.max(0, part.length - 1)))
    .join('   ')
    .trim();
