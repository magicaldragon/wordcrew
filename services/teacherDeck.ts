// Teacher Mode domain logic.
//
// Teacher Mode is the classroom counterpart of Solo: the teacher picks *one* level and
// the class is tested on that level only, never on a ladder that climbs from easy to
// hard. Two word sources feed it —
//
//   • a level test, drawn straight from the bundled Cambridge CEFR bank, and
//   • a deck the teacher pastes in (this week's lesson, a reading, a revision list).
//
// A pasted list only needs the words: the Vietnamese gloss is filled from the bundled
// dictionary, and the teacher reviews/edits every row before the deck is saved. That
// review pass is deliberate — a word can carry several senses, and the gloss that
// matters is the one from the lesson, not the most common one.

import { CEFRLevel, cefrWordLists } from '../cefrWordLists';
import { getVietnameseMeaning } from '../vietnameseMeanings';
import { levenshtein, normalizeAnswer } from './solo';

/** The four levels a teacher can test, mapped onto the bands the app ships. */
export type TeacherLevelId = 'A1' | 'A2' | 'B1' | 'B2';

export interface TeacherLevel {
  id: TeacherLevelId;
  emoji: string;
  /** Bands the level draws from. A level may span two packs (A2 = Flyers + Key). */
  bands: CEFRLevel[];
  tagline: string;
}

export const TEACHER_LEVELS: TeacherLevel[] = [
  {
    id: 'A1',
    emoji: '🌱',
    bands: [CEFRLevel.MOVERS],
    tagline: 'Movers — everyday words, one step past the very first list.',
  },
  {
    id: 'A2',
    emoji: '🚀',
    bands: [CEFRLevel.FLYERS, CEFRLevel.KET],
    tagline: 'Flyers + A2 Key — the two A2 packs together.',
  },
  {
    id: 'B1',
    emoji: '🔥',
    bands: [CEFRLevel.PET],
    tagline: 'B1 Preliminary — abstract words, phrasal verbs included.',
  },
  {
    id: 'B2',
    emoji: '👑',
    bands: [CEFRLevel.PRE_IELTS],
    tagline: 'B2 / Pre-IELTS — the top band of the bank.',
  },
];

export const getTeacherLevel = (id: TeacherLevelId): TeacherLevel =>
  TEACHER_LEVELS.find((level) => level.id === id) ?? TEACHER_LEVELS[0];

/** Words per test. Short enough for the last ten minutes of a lesson. */
export const TEACHER_WORD_COUNTS = [5, 10, 15, 20, 25, 30];

export const MAX_DECK_WORDS = 100;
export const MAX_DECKS = 40;

export interface TeacherWord {
  word: string;
  /** Vietnamese prompt shown to the student. */
  meaning: string;
  /** Band the word came from, when it came from the bank. */
  level?: CEFRLevel;
}

export interface TeacherDeck {
  id: string;
  name: string;
  words: TeacherWord[];
  createdAt: number;
  updatedAt: number;
}

export interface TeacherSession {
  /** Heading on the test screen. */
  title: string;
  /** Where the words came from — shown on the report. */
  source: string;
  words: TeacherWord[];
}

export interface TeacherAnswer {
  word: TeacherWord;
  guess: string;
  correct: boolean;
}

// ── Level tests ────────────────────────────────────────────────────────────
const shuffle = <T,>(input: T[], rng: () => number): T[] => {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const wordsOfBand = (band: CEFRLevel): string[] => {
  const bucket = cefrWordLists[band];
  return [...bucket.nouns, ...bucket.verbs, ...bucket.adjectives, ...(bucket.phrasalVerbs ?? [])];
};

/** A level-locked test: every word comes from that level's bands and nothing above it.
 * Words without a gloss are skipped (nothing to show), and only one word per gloss is
 * kept — two different words with the same Vietnamese prompt would make the question
 * unanswerable.
 */
export const buildLevelTest = (
  levelId: TeacherLevelId,
  count: number,
  rng: () => number = Math.random,
): TeacherWord[] => {
  const level = getTeacherLevel(levelId);
  const seenWords = new Set<string>();
  const seenMeanings = new Set<string>();
  const pool: TeacherWord[] = [];

  for (const band of level.bands) {
    for (const word of wordsOfBand(band)) {
      const wordKey = word.toLowerCase();
      if (seenWords.has(wordKey)) continue;
      const meaning = getVietnameseMeaning(word);
      if (!meaning) continue;
      const meaningKey = normalizeAnswer(meaning);
      if (!meaningKey || seenMeanings.has(meaningKey)) continue;
      seenWords.add(wordKey);
      seenMeanings.add(meaningKey);
      pool.push({ word, meaning, level: band });
    }
  }

  const take = Math.max(1, Math.min(count, pool.length));
  return shuffle(pool, rng).slice(0, take);
};

// ── Decks ──────────────────────────────────────────────────────────────────
const DECKS_KEY = 'wordcrew_teacher_decks_v1';

// One word per line. The separator is a tab, a colon/equals sign, or a spaced dash —
// a bare hyphen stays part of the word ("well-known", "ice-cream"), which is what a
// teacher pasting a list expects.
const LINE_PREFIX = /^\s*(?:\d+[.)]\s*|[-*•]\s*)/;
const LINE_SPLIT = /\t|\s*[:=]\s*|\s+[-–—]\s+/;

/**
 * Reads a pasted list. Every line is `word` or `word <separator> meaning`; a line with
 * no meaning is filled from the bundled gloss. Duplicate words are dropped, the order
 * is preserved, and the list is capped at `MAX_DECK_WORDS`.
 */
export const parseTeacherWords = (raw: string): TeacherWord[] => {
  const seen = new Set<string>();
  const out: TeacherWord[] = [];

  for (const line of raw.split(/\r?\n/)) {
    const cleaned = line.replace(LINE_PREFIX, '').trim();
    if (!cleaned) continue;
    const parts = cleaned.split(LINE_SPLIT);
    const word = (parts.shift() ?? '').replace(/\s+/g, ' ').trim();
    if (!word) continue;
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const typed = parts.join(' ').replace(/\s+/g, ' ').trim();
    out.push({ word, meaning: typed || getVietnameseMeaning(word) || '' });
    if (out.length >= MAX_DECK_WORDS) break;
  }

  return out;
};

/** Problems the review table highlights — the rows a teacher must look at. */
export const deckWarnings = (words: TeacherWord[]): Map<number, string> => {
  const warnings = new Map<number, string>();
  const meanings = new Map<string, number[]>();

  words.forEach((entry, index) => {
    if (!entry.meaning.trim()) warnings.set(index, 'Missing meaning');
    const key = normalizeAnswer(entry.meaning);
    if (!key) return;
    const bucket = meanings.get(key);
    if (bucket) bucket.push(index);
    else meanings.set(key, [index]);
  });

  for (const indexes of meanings.values()) {
    if (indexes.length < 2) continue;
    for (const index of indexes) {
      if (!warnings.has(index)) warnings.set(index, 'Duplicate meaning');
    }
  }

  return warnings;
};

/** True when the answer is the word, allowing a one/two-letter typo. */
export const matchesTeacherWord = (guess: string, target: string): boolean => {
  const typed = normalizeAnswer(guess);
  const answer = normalizeAnswer(target);
  if (!typed || !answer) return false;
  if (typed === answer) return true;
  // Same tolerance as Solo's fuzzy match, but without the "answer inside a longer
  // phrase" rule: "category" must not be accepted for "cat" in a graded test.
  return levenshtein(typed, answer) <= (answer.length <= 4 ? 1 : 2);
};

const isDeck = (value: unknown): value is TeacherDeck => {
  if (!value || typeof value !== 'object') return false;
  const deck = value as TeacherDeck;
  return (
    typeof deck.id === 'string' &&
    typeof deck.name === 'string' &&
    Array.isArray(deck.words) &&
    deck.words.every((item) => item && typeof item.word === 'string' && typeof item.meaning === 'string')
  );
};

/** Decks saved on this device, newest first. */
export const readTeacherDecks = (): TeacherDeck[] => {
  try {
    const raw = localStorage.getItem(DECKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isDeck).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
};

/** Saves (or replaces) a deck and returns the full, persisted list. */
export const saveTeacherDeck = (deck: TeacherDeck): TeacherDeck[] => {
  const rest = readTeacherDecks().filter((item) => item.id !== deck.id);
  const next = [deck, ...rest].slice(0, MAX_DECKS);
  try {
    localStorage.setItem(DECKS_KEY, JSON.stringify(next));
  } catch {
    /* Storage blocked — the deck simply will not survive a reload. */
  }
  return next;
};

export const deleteTeacherDeck = (id: string): TeacherDeck[] => {
  const next = readTeacherDecks().filter((item) => item.id !== id);
  try {
    localStorage.setItem(DECKS_KEY, JSON.stringify(next));
  } catch {
    /* Storage blocked. */
  }
  return next;
};

export const newTeacherDeckId = (): string =>
  `deck-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** A deck test: the deck's own words, shuffled, so the order is not the lesson's. */
export const buildDeckTest = (deck: TeacherDeck, rng: () => number = Math.random): TeacherSession => ({
  title: deck.name,
  source: `${deck.words.length} words · your deck`,
  words: shuffle(deck.words, rng),
});

export const buildLevelSession = (
  levelId: TeacherLevelId,
  count: number,
  rng: () => number = Math.random,
): TeacherSession => ({
  title: `${levelId} level test`,
  source: `${levelId} · ${count} words`,
  words: buildLevelTest(levelId, count, rng),
});

/** Rebuilds a session with only the words the student missed. */
export const buildRetrySession = (session: TeacherSession, answers: TeacherAnswer[]): TeacherSession => ({
  title: `${session.title} · retry`,
  source: `Retry ${answers.filter((answer) => !answer.correct).length} missed`,
  words: answers.filter((answer) => !answer.correct).map((answer) => answer.word),
});

/** The same test again, in a new order. */
export const reshuffleSession = (session: TeacherSession, rng: () => number = Math.random): TeacherSession => ({
  ...session,
  words: shuffle(session.words, rng),
});
