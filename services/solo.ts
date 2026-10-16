// Solo mode domain logic.
//
// Solo is the single-player counterpart of the pass-and-play game: here the *player*
// is the guesser. The app shows a clue (the Vietnamese gloss) and the player answers
// by typing or talking. Words are drawn from a ladder of CEFR packs and always played
// in ascending difficulty, so every run ramps up from the easiest band the track
// covers to its hardest.
//
// A run is endless: it only stops when the player runs out of hearts. The player
// starts with a fixed set of hearts and a few free skips, earns points for correct
// guesses (with streak bonuses) and pays for mistakes with hearts and points.

import { CEFRLevel, cefrWordLists } from '../cefrWordLists';
import { localDateId } from './periods';
import { checkSpokenPhonemes, loadPronunciations } from './pronunciation';

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
    glow: 'hover:shadow-[var(--elev-3)]',
  },
  {
    id: 'explorer',
    name: 'Explorer',
    emoji: '🚀',
    tagline: 'Everyday words up to A2 — Starters through Key.',
    levels: [L.STARTERS, L.MOVERS, L.FLYERS, L.KET],
    accentText: 'text-electric-blue',
    accentBorder: 'border-electric-blue/40 hover:border-electric-blue',
    glow: 'hover:shadow-[var(--elev-3)]',
  },
  {
    id: 'challenger',
    name: 'Challenger',
    emoji: '🔥',
    tagline: 'Push into B1 territory — Starters through PET.',
    levels: [L.STARTERS, L.MOVERS, L.FLYERS, L.KET, L.PET],
    accentText: 'text-warning-yellow',
    accentBorder: 'border-warning-yellow/40 hover:border-warning-yellow',
    glow: 'hover:shadow-[var(--elev-3)]',
  },
  {
    id: 'master',
    name: 'Master',
    emoji: '👑',
    tagline: 'The full ladder — Pre-A1 all the way to B2.',
    levels: [L.STARTERS, L.MOVERS, L.FLYERS, L.KET, L.PET, L.PRE_IELTS],
    accentText: 'text-cyber-purple',
    accentBorder: 'border-cyber-purple/40 hover:border-cyber-purple',
    glow: 'hover:shadow-[var(--elev-3)]',
  },
];

export const getSoloTrack = (id: string | null | undefined): SoloTrack | undefined =>
  SOLO_TRACKS.find((track) => track.id === id);

/** The one track every player gets for free; the rest are part of the Full Version. */
export const SOLO_FREE_TRACK_ID = 'rookie';

// ── Today's Challenge ──────────────────────────────────────────────────────
/** The board Today's Challenge posts to; the daily run is not one of the four tracks. */
export const DAILY_BOARD_ID = 'daily';

/**
 * Today's Challenge. Everyone plays the same ladder on the same day: the word source is
 * a *seeded* shuffle (see `createSoloSequence`), so the order is identical for every
 * player and the daily board is a like-for-like race rather than a luck draw.
 */
export const DAILY_TRACK: SoloTrack = {
  id: DAILY_BOARD_ID,
  name: "Today's Challenge",
  emoji: '🌅',
  tagline: 'One seeded ladder a day — the same words for every player.',
  levels: [L.STARTERS, L.MOVERS, L.FLYERS, L.KET],
  accentText: 'text-warning-yellow',
  accentBorder: 'border-warning-yellow/40 hover:border-warning-yellow',
  glow: 'hover:shadow-[var(--elev-3)]',
};

const DAILY_DONE_KEY = 'wordcrew_daily_done';

/** The day id of the last completed challenge, or null. */
export const readDailyDoneDate = (): string | null => {
  try {
    return localStorage.getItem(DAILY_DONE_KEY);
  } catch {
    return null;
  }
};

/** True once today's challenge has been finished on this device. */
export const isDailyDoneToday = (): boolean => readDailyDoneDate() === localDateId();

export const markDailyDone = (dateId: string = localDateId()): void => {
  try {
    localStorage.setItem(DAILY_DONE_KEY, dateId);
  } catch {
    /* Storage blocked — the badge simply will not stick. */
  }
};

/** Stable 32-bit seed for a day id, so the same day always yields the same ladder. */
export const dailySeed = (dateId: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < dateId.length; i += 1) {
    hash ^= dateId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

/** Small deterministic PRNG (mulberry32) — same seed, same word order, every device. */
export const seededRng = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Friendly "A2 Key" → "KET" label used in compact UI spots. */
export const shortLevel = (level: CEFRLevel): string => level.replace(/\s*\(.*\)\s*$/, '');

// ── Run rules ──────────────────────────────────────────────────────────────
/** Hearts the player starts with; the run ends at zero. */
export const SOLO_START_HEARTS = 10;
/** Skips that cost nothing; later skips cost a heart instead. */
export const SOLO_FREE_SKIPS = 3;
/** Points for a correct guess. */
export const SOLO_CORRECT_POINTS = 10;
/** Points lost (and one heart, alongside) on a wrong guess or a timeout. */
export const SOLO_WRONG_PENALTY = 10;
/** Points lost for a wrong guess are floored here so a score never goes negative. */
export const SOLO_MIN_SCORE = 0;
/** A streak bonus lands on every Nth consecutive correct guess. */
export const SOLO_STREAK_STEP = 5;
/** Seconds allowed to answer before the word counts as a miss. */
export const SOLO_TIME_PER_WORD = 15;
/** Words played on one band before the ladder steps up to the next one. */
export const SOLO_WORDS_PER_BAND = 8;
/**
 * Score marks that refund a heart, so a long clean run can absorb a few slips.
 * Tuned so the first lands around word 8-9, the second around word 20 and the
 * third around word 35 — reachable for a strong run, out of reach for a sloppy one.
 */
export const SOLO_HEART_MILESTONES = [100, 250, 500] as const;

/** Bonus points awarded when a streak reaches `streak` (0 when it is not a milestone). */
export const soloStreakBonus = (streak: number): number =>
  streak > 0 && streak % SOLO_STREAK_STEP === 0 ? streak : 0;

export interface SoloWord {
  word: string;
  level: CEFRLevel;
}

export interface SoloRunResult {
  trackId: string;
  /** Board the run posts to: a track id, or `DAILY_BOARD_ID` for Today's Challenge. */
  boardId: string;
  /** Period the score belongs to (`YYYY-Www` for a track, `YYYY-MM-DD` for the daily). */
  period: string;
  score: number;
  wordsGuessed: number;
  bestStreak: number;
  /** Words the player actually resolved (guessed, skipped or timed out). */
  wordsPlayed: number;
  /** Hardest band the player reached before the run ended. */
  levelReached: CEFRLevel;
  timePerWord: number;
  /** Words the player got wrong or timed out on — the run's Memory Anchors. */
  missedWords: SoloWord[];
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
 * An endless word source for a track. It plays `SOLO_WORDS_PER_BAND` words on the
 * easiest band, then steps up one band, and plateaus on the hardest band so the run
 * keeps the track's ceiling. Each band draws from its own shuffled bag that is
 * reshuffled once exhausted, so words only repeat after the whole band is used.
 */
export interface SoloSequence {
  next: () => SoloWord;
}

export const createSoloSequence = (
  track: SoloTrack,
  rng: () => number = Math.random,
  /**
   * Words to serve before the shuffled bag — the Memory Anchors the player is still
   * relearning. Only words whose band the track actually visits are used; anything
   * above the track's ceiling would never be reached and is dropped up front.
   */
  priority: SoloWord[] = [],
): SoloSequence => {
  const bands = track.levels;
  const bags = new Map<CEFRLevel, string[]>();
  const queued = new Map<CEFRLevel, string[]>();
  for (const item of priority) {
    if (!bands.includes(item.level)) continue;
    const bucket = queued.get(item.level);
    if (bucket) bucket.push(item.word);
    else queued.set(item.level, [item.word]);
  }
  let step = 0;

  const draw = (level: CEFRLevel): string => {
    const anchor = queued.get(level);
    if (anchor && anchor.length > 0) return anchor.shift() as string;
    let bag = bags.get(level);
    if (!bag || bag.length === 0) {
      bag = shuffle(wordsOfLevel(level), rng);
      bags.set(level, bag);
    }
    return bag.pop() as string;
  };

  return {
    next: (): SoloWord => {
      const bandIndex = Math.min(Math.floor(step / SOLO_WORDS_PER_BAND), bands.length - 1);
      step += 1;
      const level = bands[bandIndex];
      return { word: draw(level), level };
    },
  };
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
 * Voice answers are judged by *sound*, not spelling. The transcript is first put
 * through the same tolerant spelling match used for typing, and if that fails it is
 * compared phoneme-by-phoneme so homophones ("wear"/"where") and small accent slips
 * are accepted — the reason voice answers used to feel "too strict".
 */
export const checkSpokenAnswer = async (transcript: string, target: string): Promise<boolean> => {
  if (checkSoloAnswer(transcript, target)) return true;
  const dict = await loadPronunciations();
  return checkSpokenPhonemes(dict, transcript, target);
};

// ── Letter-shape hint ──────────────────────────────────────────────────────
/**
 * Splits a word into letter groups for the boxed hint: one group per word (hyphens
 * and apostrophes act as separators), each group a list of single letters where the
 * first is revealed and the rest are blanks to be filled in.
 */
export const buildLetterBoxes = (word: string): string[][] => {
  const groups = word
    .toLowerCase()
    .replace(/[^a-z]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return groups.map((group) => group.split('').map((char, i) => (i === 0 ? char.toUpperCase() : '')));
};

/** Total number of letters in a word, ignoring spaces, hyphens and apostrophes. */
export const letterCount = (word: string): number => (word.toLowerCase().match(/[a-z]/g) || []).length;
