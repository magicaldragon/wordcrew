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
  score: number;
  wordsGuessed: number;
  bestStreak: number;
  /** Words the player actually resolved (guessed, skipped or timed out). */
  wordsPlayed: number;
  /** Hardest band the player reached before the run ended. */
  levelReached: CEFRLevel;
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
): SoloSequence => {
  const bands = track.levels;
  const bags = new Map<CEFRLevel, string[]>();
  let step = 0;

  const draw = (level: CEFRLevel): string => {
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
