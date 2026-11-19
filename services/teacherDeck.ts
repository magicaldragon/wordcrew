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

import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { CEFRLevel, cefrWordLists } from '../cefrWordLists';
import { getVietnameseMeaning } from '../vietnameseMeanings';
import { db } from './firebase';
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

/** Preset counts kept for the class-assignment editor, which is a different flow. */
export const TEACHER_WORD_COUNTS = [5, 10, 15, 20, 25, 30];

/**
 * Words per test. A lesson check is 10 words, a revision sweep can be the whole unit,
 * so the teacher types the number instead of picking from a handful of presets. The
 * ceiling matches the deck ceiling — one vocabulary set, one limit.
 */
export const MIN_TEST_WORDS = 5;
export const MAX_TEST_WORDS = 300;

/** Keeps a typed count inside the allowed band; an empty/garbled box falls back. */
export const clampTestWords = (count: number): number => {
  if (!Number.isFinite(count)) return MIN_TEST_WORDS;
  return Math.min(MAX_TEST_WORDS, Math.max(MIN_TEST_WORDS, Math.round(count)));
};

export const MAX_DECK_WORDS = 300;
export const MAX_DECKS = 40;

/**
 * The parts of speech the review table offers. Kept as dictionary-style abbreviations
 * so the column stays narrow on a phone and matches a printed vocabulary list.
 */
export const TEACHER_POS = ['n.', 'v.', 'adj.', 'adv.', 'phr. v.'] as const;
export type TeacherPos = (typeof TEACHER_POS)[number];

export interface TeacherWord {
  word: string;
  /** Vietnamese prompt shown to the student. */
  meaning: string;
  /** Part of speech — guessed on paste, editable by the teacher before saving. */
  pos?: TeacherPos;
  /** Band the word came from, when it came from the bank. */
  level?: CEFRLevel;
}

export interface TeacherDeck {
  id: string;
  name: string;
  words: TeacherWord[];
  createdAt: number;
  updatedAt: number;
  /**
   * A deck being prepared is a draft: it stays in My decks but is not offered when a
   * class assignment is built. Missing on decks saved before the flag existed — those
   * are treated as ready.
   */
  status?: TeacherDeckStatus;
  /**
   * A deleted deck is kept as a tombstone instead of being dropped from the shelf: a
   * device that never saw the delete would otherwise push its stale copy back up and the
   * deck would return. Readers hide tombstones; they are pruned after a while.
   */
  deletedAt?: number;
}

export type TeacherDeckStatus = 'draft' | 'ready';

/** Old decks have no status; they were already in use, so they stay assignable. */
export const deckStatus = (deck: TeacherDeck): TeacherDeckStatus => deck.status ?? 'ready';

/**
 * How a run asks each word. Chosen per run and kept on the session, so the report can
 * say what was actually tested — spelling, listening, recognition or pronunciation.
 *
 *   listen  — the word is spoken, the student writes it (listening + spelling)
 *   choice  — the word is shown, the student picks its Vietnamese meaning
 *   letters — the meaning is shown with the first letter and one box per letter
 *   read    — the word is shown; the student says it and the microphone checks it
 *
 * All four are scored. Reading aloud used to be practice, which meant a part with no
 * verdict; it is now judged from the transcript (fuzzy spelling, then phonemes, the way
 * Solo judges a spoken answer), so the part counts like every other one.
 */
export type TeacherTestMode = 'listen' | 'choice' | 'letters' | 'read';

export const TEACHER_TEST_MODES: TeacherTestMode[] = ['listen', 'choice', 'letters', 'read'];

export const isTeacherTestMode = (value: string): value is TeacherTestMode =>
  (TEACHER_TEST_MODES as string[]).includes(value);

/**
 * The styles build on each other: recognising a meaning is easier than recalling a word
 * from a Vietnamese prompt, which is easier than hearing it and spelling it. Reading the
 * word aloud comes last — it consolidates the word once the others have established it.
 * A set that includes several modes is always asked in this order, whatever order the
 * teacher ticked them.
 */
export const TEACHER_MODE_LADDER: TeacherTestMode[] = ['choice', 'letters', 'listen', 'read'];

/** Keeps the chosen styles, drops duplicates and unknown values, and sorts them by ladder. */
export const orderTeacherModes = (modes: TeacherTestMode[]): TeacherTestMode[] =>
  TEACHER_MODE_LADDER.filter((mode) => modes.includes(mode));

/** Where a session's words came from. Screens turn this into localized text. */
export type TeacherSessionOrigin =
  | { kind: 'level'; levelId: TeacherLevelId }
  | { kind: 'deck'; name: string };

export interface TeacherSession {
  /** Level or deck the words came from. */
  origin: TeacherSessionOrigin;
  /** Question style for this run. */
  mode: TeacherTestMode;
  /** True when the run only replays the words missed in the previous one. */
  retry?: boolean;
  words: TeacherWord[];
}

export interface TeacherAnswer {
  word: TeacherWord;
  guess: string;
  correct: boolean;
  /** The right word with a small spelling slip — reported, but not counted as correct. */
  spelling?: boolean;
  /** 1 = answered once; 2 = needed the single retry. */
  attempts: number;
  /** Hint presses used on this word (0–2). */
  hints: number;
  /** The student chose to see the answer instead of answering. */
  skipped?: boolean;
  /** Which question style produced this answer — a class set may ask several. */
  mode?: TeacherTestMode;
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

const wordsOfBand = (band: CEFRLevel): Array<{ word: string; pos: TeacherPos }> => {
  const bucket = cefrWordLists[band];
  return [
    ...bucket.nouns.map((word) => ({ word, pos: 'n.' as TeacherPos })),
    ...bucket.verbs.map((word) => ({ word, pos: 'v.' as TeacherPos })),
    ...bucket.adjectives.map((word) => ({ word, pos: 'adj.' as TeacherPos })),
    ...(bucket.phrasalVerbs ?? []).map((word) => ({ word, pos: 'phr. v.' as TeacherPos })),
  ];
};

/**
 * Vietnamese meanings are text, not English answers: they are compared with their
 * letters intact. `normalizeAnswer` keeps only a–z, so a gloss made entirely of
 * accented letters ("đá", "ô", "độ") collapsed to an empty string and could never
 * match its own meaning, while different glosses ("cá" / "cà") collided. Folding
 * case, Unicode form and spacing is all a meaning needs.
 */
const normalizeMeaning = (value: string): string =>
  value.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();

/** The usable pool for a level: unique words, each with a gloss and a unique meaning. */
const poolCache = new Map<TeacherLevelId, TeacherWord[]>();

const levelPool = (levelId: TeacherLevelId): TeacherWord[] => {
  const cached = poolCache.get(levelId);
  if (cached) return cached;

  const level = getTeacherLevel(levelId);
  const seenWords = new Set<string>();
  const seenMeanings = new Set<string>();
  const pool: TeacherWord[] = [];

  for (const band of level.bands) {
    for (const entry of wordsOfBand(band)) {
      const wordKey = entry.word.toLowerCase();
      if (seenWords.has(wordKey)) continue;
      const meaning = getVietnameseMeaning(entry.word);
      if (!meaning) continue;
      const meaningKey = normalizeMeaning(meaning);
      if (!meaningKey || seenMeanings.has(meaningKey)) continue;
      seenWords.add(wordKey);
      seenMeanings.add(meaningKey);
      pool.push({ word: entry.word, meaning, pos: entry.pos, level: band });
    }
  }

  poolCache.set(levelId, pool);
  return pool;
};

/** How many words a level can actually offer — the number the setup screen must show. */
export const countLevelWords = (levelId: TeacherLevelId): number => levelPool(levelId).length;

/**
 * A level-locked test: every word comes from that level's bands and nothing above it.
 * The count is capped at the usable pool, so the screen never promises 300 words for a
 * level that only has 275.
 */
export const buildLevelTest = (
  levelId: TeacherLevelId,
  count: number,
  rng: () => number = Math.random,
): TeacherWord[] => {
  const pool = levelPool(levelId);
  const take = Math.max(1, Math.min(count, pool.length));
  return shuffle(pool, rng).slice(0, take);
};

/** Every level's usable pool, for distractors when the run itself is too short. */
let allPoolCache: TeacherWord[] | null = null;

const allTeacherPool = (): TeacherWord[] => {
  if (!allPoolCache) {
    const seen = new Set<string>();
    const all: TeacherWord[] = [];
    for (const level of TEACHER_LEVELS) {
      for (const word of levelPool(level.id)) {
        const key = `${word.word.toLowerCase()}|${normalizeMeaning(word.meaning)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        all.push(word);
      }
    }
    allPoolCache = all;
  }
  return allPoolCache;
};

export const CHOICE_OPTIONS = 4;

/**
 * Four Vietnamese meanings for a multiple-choice question: the right one plus three
 * distractors, taken from the same run first so the options stay inside the lesson.
 * A retry of one word still gets three options, drawn from the bank.
 */
export const buildChoiceOptions = (
  word: TeacherWord,
  sessionWords: TeacherWord[],
  rng: () => number = Math.random,
): string[] => {
  const seen = new Set([normalizeMeaning(word.meaning)]);
  const distractors: string[] = [];

  const collect = (pool: TeacherWord[]) => {
    for (const entry of shuffle(pool, rng)) {
      if (distractors.length >= CHOICE_OPTIONS - 1) return;
      const key = normalizeMeaning(entry.meaning);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      distractors.push(entry.meaning);
    }
  };

  collect(sessionWords);
  if (distractors.length < CHOICE_OPTIONS - 1) collect(allTeacherPool());

  return shuffle([word.meaning, ...distractors], rng);
};

/** The picked option is right when it is the same meaning — no spelling involved. */
export const judgeMeaningChoice = (guess: string, meaning: string): boolean => {
  const picked = normalizeMeaning(guess);
  return Boolean(picked) && picked === normalizeMeaning(meaning);
};

// ── Parts of speech ────────────────────────────────────────────────────────
// Pasted lists used to arrive as bare words, so the teacher typed the part of speech
// by hand (or skipped it and the column stayed empty). The app already knows the
// answer for every word in the CEFR bank — those lists are curated *by* part of
// speech — so the guess reads that first and only falls back to English morphology
// for words from outside the bank. A guess is never final: the editor row is a
// selector, and what the teacher picks is what gets saved.

/** Bucket order is the tie-breaker, matching the bank's own noun > verb > adj rule. */
const POS_BUCKETS: Array<['nouns' | 'verbs' | 'adjectives' | 'phrasalVerbs', TeacherPos]> = [
  ['nouns', 'n.'],
  ['verbs', 'v.'],
  ['adjectives', 'adj.'],
  ['phrasalVerbs', 'phr. v.'],
];

let bankPos: Map<string, TeacherPos> | null = null;

const bankPosIndex = (): Map<string, TeacherPos> => {
  if (!bankPos) {
    bankPos = new Map();
    for (const [bucket, pos] of POS_BUCKETS) {
      for (const categories of Object.values(cefrWordLists)) {
        for (const word of categories[bucket] ?? []) {
          const key = word.toLowerCase();
          if (!bankPos.has(key)) bankPos.set(key, pos);
        }
      }
    }
  }
  return bankPos;
};

/** Verb forms the bank lists, so an inflected verb can be traced back to its base. */
let bankVerbs: Set<string> | null = null;

const bankVerbSet = (): Set<string> => {
  if (!bankVerbs) {
    bankVerbs = new Set();
    for (const categories of Object.values(cefrWordLists)) {
      for (const word of categories.verbs ?? []) bankVerbs.add(word.toLowerCase());
    }
  }
  return bankVerbs;
};

/** `-ly` words that look like adverbs but are adjectives ("friendly", "lonely"). */
const ADJECTIVE_LY = new Set([
  'friendly', 'lovely', 'lonely', 'lively', 'likely', 'silly', 'ugly', 'early', 'daily',
  'weekly', 'elderly', 'cowardly',
]);

/**
 * Other `-ly` words that are nouns or verbs ("fly", "family"). Left unguessed rather
 * than mislabelled — the teacher's selector is one tap away.
 */
const NOT_ADVERBS = new Set([
  'fly', 'reply', 'apply', 'supply', 'rely', 'multiply', 'bully', 'jelly', 'belly',
  'rally', 'ally', 'delay', 'display', 'holiday', 'family', 'only',
]);

const NOUN_ENDING = /(tion|sion|ment|ness|ity|ance|ence|ship|hood|ism|ology|graphy|ist|ian|ics|ee|dom|tude)$/;
const ADJECTIVE_ENDING = /(ous|ful|less|able|ible|ive|ical|ic|ish)$/;
const VERB_ENDING = /(ize|ise|ify)$/;
const DOUBLED_ENDING = /([b-df-hj-np-tv-z])\1$/;

/** Particles that turn a verb into a phrasal verb ("look **after**", "give **up**"). */
const PARTICLES = new Set([
  'up', 'down', 'off', 'on', 'in', 'out', 'away', 'back', 'over', 'through', 'around',
  'about', 'along', 'across', 'into', 'onto', 'upon', 'for', 'with', 'to', 'at', 'by',
  'from', 'of', 'after', 'against', 'under', 'without',
]);

/**
 * Spellings of the base word a pasted entry may hide behind: "berries" → "berry",
 * "running" → "run", "bigger" → "big", "boxes" → "box".
 */
const baseForms = (key: string): string[] => {
  const forms: string[] = [];
  const add = (form: string) => {
    if (form && form !== key && !forms.includes(form)) forms.push(form);
  };

  if (/ies$/.test(key)) add(key.slice(0, -3) + 'y');
  if (/(ches|shes|sses|xes|zes|oes)$/.test(key)) add(key.slice(0, -2));
  else if (/[^s]s$/.test(key)) add(key.slice(0, -1));

  if (/ing$/.test(key) && key.length > 5) {
    const stem = key.slice(0, -3);
    add(stem);
    add(stem + 'e');
    if (DOUBLED_ENDING.test(stem)) add(stem.slice(0, -1));
  }

  if (/ied$/.test(key)) add(key.slice(0, -3) + 'y');
  else if (/ed$/.test(key) && key.length > 4) {
    const stem = key.slice(0, -2);
    add(stem);
    add(stem + 'e');
    if (DOUBLED_ENDING.test(stem)) add(stem.slice(0, -1));
  }

  return forms;
};

/** Comparative stems ("faster" → "fast", "bigger" → "big") checked against adjectives. */
const comparisonForms = (key: string): string[] => {
  const forms: string[] = [];
  const add = (form: string) => {
    if (form && form !== key && !forms.includes(form)) forms.push(form);
  };

  if (/ier$/.test(key)) add(key.slice(0, -3) + 'y');
  if (/iest$/.test(key)) add(key.slice(0, -4) + 'y');
  if (/(er|est)$/.test(key)) {
    const stem = key.replace(/(er|est)$/, '');
    add(stem);
    add(stem + 'e');
    if (DOUBLED_ENDING.test(stem)) add(stem.slice(0, -1));
  }
  return forms;
};

/**
 * Best guess at the part of speech: the CEFR bank first (exact), then the bank again
 * through the word's inflections ("berries" → "berry", "running" → "run"), then a
 * conservative suffix rule, then nothing. Deliberately quiet: a wrong tag in a study
 * list is worse than an empty one, so endings that swing both ways stay unguessed.
 */
export const guessPartOfSpeech = (word: string): TeacherPos | '' => {
  const cleaned = word.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!cleaned) return '';

  const bank = bankPosIndex();
  const exact = bank.get(cleaned);
  if (exact) return exact;

  // "ice-cream" is listed as "ice cream" in the bank; read the compound as a phrase.
  if (cleaned.includes('-')) {
    return guessPartOfSpeech(cleaned.replace(/-/g, ' '));
  }

  // Multi-word entry: "look after" is a phrasal verb, while "ice cream" takes its head.
  if (cleaned.includes(' ')) {
    const tokens = cleaned.split(' ');
    if (bank.get(tokens[0]) === 'v.' && tokens.slice(1).some((token) => PARTICLES.has(token))) {
      return 'phr. v.';
    }
    return guessPartOfSpeech(tokens[tokens.length - 1]);
  }

  // Inflections. A participle of a known verb is still a verb for the list's purpose.
  const verbs = bankVerbSet();
  const isParticiple = /(ing|ed)$/.test(cleaned);
  for (const base of baseForms(cleaned)) {
    if (isParticiple && verbs.has(base)) return 'v.';
    const pos = bank.get(base);
    if (pos) return pos;
  }

  if (ADJECTIVE_LY.has(cleaned)) return 'adj.';
  if (NOT_ADVERBS.has(cleaned)) return '';
  if (cleaned.length > 3 && cleaned.endsWith('ly')) return 'adv.';
  if (NOUN_ENDING.test(cleaned)) return 'n.';

  // Comparatives first, otherwise every "-er" would read as an agent noun.
  if (/(er|est)$/.test(cleaned)) {
    for (const stem of comparisonForms(cleaned)) {
      if (bank.get(stem) === 'adj.' || ADJECTIVE_ENDING.test(stem)) return 'adj.';
    }
  }

  // Agent nouns only when the stem is a verb the bank knows ("teach" → "teacher").
  if (/er$/.test(cleaned) && cleaned.length > 4) {
    const stem = cleaned.slice(0, -2);
    if (verbs.has(stem) || verbs.has(stem + 'e')) return 'n.';
    return '';
  }
  if (/or$/.test(cleaned) && cleaned.length > 4) return 'n.';

  if (ADJECTIVE_ENDING.test(cleaned)) return 'adj.';
  if (VERB_ENDING.test(cleaned)) return 'v.';
  return '';
};

/** The tag to show for a word: the teacher's pick, or the automatic guess. */
export const partOfSpeech = (entry: TeacherWord): TeacherPos | '' =>
  entry.pos ?? guessPartOfSpeech(entry.word);

// ── Decks ──────────────────────────────────────────────────────────────────
// Decks belong to an account, not just to a device: a shared classroom laptop must
// never show one teacher's lists to the next person who signs in, and a deck built at
// school must be there at home.
//
// The account copy lives in Firestore at `teacherDecks/{uid}` — one document holding the
// whole shelf. A teacher keeps at most MAX_DECKS lists, so opening the tab costs one read.
// localStorage stays as the offline cache, and as the only store a guest can use.
const DECKS_KEY_PREFIX = 'wordcrew_teacher_decks_v2';
const LEGACY_DECKS_KEY = 'wordcrew_teacher_decks_v1';
/**
 * The shelf version this device last reconciled with the account. A deck missing from a
 * newer account shelf is only pushed back when it was touched after this point; anything
 * older was already uploaded once and is gone because another device deleted it.
 */
const SEEN_KEY_PREFIX = 'wordcrew_teacher_decks_seen_v2';
const DECKS_COLLECTION = 'teacherDecks';
const decksKey = (owner: string): string => `${DECKS_KEY_PREFIX}:${owner || 'guest'}`;
const seenKey = (owner: string): string => `${SEEN_KEY_PREFIX}:${owner || 'guest'}`;

// One word per line. The separator is a tab, a colon/equals sign, or a spaced dash —
// a bare hyphen stays part of the word ("well-known", "ice-cream"), which is what a
// teacher pasting a list expects.
const LINE_PREFIX = /^\s*(?:\d+[.)]\s*|[-*•]\s*)/;
const LINE_SPLIT = /\t|\s*[:=]\s*|\s+[-–—]\s+/;

// Textbook lists print the part of speech next to the word — "bank (n.)", "abandon v."
// — so it is worth reading rather than discarding: it is the teacher's own answer, and
// it beats any guess made from the spelling.
const BRACKETED_POS = /[\s]*[\(\[]\s*(phr\.\s*v\.?|n|v|adj|adv)\.?\s*[\)\]][\s]*$/i;
const TRAILING_POS = /\s+(phr\.\s*v|n|v|adj|adv)\.$/i;

const posFromLabel = (raw: string): TeacherPos | undefined => {
  const label = raw.toLowerCase().replace(/[.\s]/g, '');
  if (label === 'n') return 'n.';
  if (label === 'v') return 'v.';
  if (label === 'adj') return 'adj.';
  if (label === 'adv') return 'adv.';
  if (label === 'phrv') return 'phr. v.';
  return undefined;
};

/** Pulls a trailing POS label off a word; returns the bare word and the label, if any. */
const splitPosLabel = (word: string): { word: string; pos?: TeacherPos } => {
  const match = word.match(BRACKETED_POS) ?? word.match(TRAILING_POS);
  if (!match) return { word };
  const pos = posFromLabel(match[1]);
  if (!pos) return { word };
  return { word: word.slice(0, match.index ?? 0).trim(), pos };
};

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
    // A textbook row can bundle two items under one number: "environment (n) / pollution
    // (n.)". Reading it as one word found no gloss and shipped an empty meaning. A row
    // that does carry a meaning separator keeps its slash — there it belongs to the
    // meaning the teacher typed, not to a second word.
    const rows = LINE_SPLIT.test(cleaned) ? [cleaned] : cleaned.split(/\s*\/\s*/);
    for (const row of rows) {
      const parts = row.split(LINE_SPLIT);
      const parsed = splitPosLabel((parts.shift() ?? '').replace(/\s+/g, ' ').trim());
      // Lesson lists write verbs as "to abandon"; the answer key wants "abandon".
      const word = parsed.word.replace(/^to\s+(?=\S)/i, '').trim();
      if (!word) continue;
      const key = word.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const typed = parts.join(' ').replace(/\s+/g, ' ').trim();
      const pos = parsed.pos ?? guessPartOfSpeech(word);
      out.push({
        word,
        meaning: typed || getVietnameseMeaning(word) || '',
        ...(pos ? { pos } : {}),
      });
      if (out.length >= MAX_DECK_WORDS) break;
    }
    if (out.length >= MAX_DECK_WORDS) break;
  }

  return out;
};

/** Matches the route's cap: a report is a hint for us, not a data dump. */
const GLOSS_REPORT_MAX = 60;

/**
 * Tells the server which pasted words had no gloss, so the bundled map can grow where
 * teachers actually need it. Fire-and-forget: the deck is already built, and a failed
 * report costs us one data point rather than the teacher's work. Only the bare words
 * leave the device — no deck name, no class, no account.
 */
export const reportMissingGlosses = (words: string[]): void => {
  if (words.length === 0) return;
  void fetch('/api/glosses/missing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ words: words.slice(0, GLOSS_REPORT_MAX) }),
    keepalive: true,
  }).catch(() => {
    /* Offline or blocked: the report is optional. */
  });
};

/** Problems the review table highlights — the rows a teacher must look at. */
export const deckWarnings = (words: TeacherWord[]): Map<number, string> => {
  const warnings = new Map<number, string>();
  const meanings = new Map<string, number[]>();

  words.forEach((entry, index) => {
    if (!entry.meaning.trim()) warnings.set(index, 'Missing meaning');
    const key = normalizeMeaning(entry.meaning);
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

export type TeacherMatch = 'correct' | 'spelling' | 'wrong';

/**
 * How close an answer is. Only an exact spelling is "correct"; a small typo becomes
 * "spelling", which the report shows separately from a word the student did not know.
 * Short words are never fuzzy — "cut" is not "cat", "shop" is not "ship" — because a
 * graded vocabulary check must not pass a different word.
 */
export const judgeTeacherAnswer = (guess: string, target: string): TeacherMatch => {
  const typed = normalizeAnswer(guess);
  const answer = normalizeAnswer(target);
  if (!typed || !answer) return 'wrong';
  if (typed === answer) return 'correct';

  // "ice cream" vs "ice-cream" vs "icecream" is a spacing/style slip, not another word.
  const compact = (value: string) => value.replace(/[\s-]/g, '');
  if (compact(typed) === compact(answer)) return 'spelling';

  const typedWords = typed.split(' ');
  const answerWords = answer.split(' ');
  if (answerWords.length > 1) {
    if (typedWords.length !== answerWords.length) return 'wrong';
    let near = false;
    for (let i = 0; i < answerWords.length; i += 1) {
      if (typedWords[i] === answerWords[i]) continue;
      // A phrasal verb is a unit: "get on" must not pass for "get up".
      if (answerWords[i].length >= 5 && levenshtein(typedWords[i], answerWords[i]) === 1) {
        near = true;
        continue;
      }
      return 'wrong';
    }
    return near ? 'spelling' : 'correct';
  }

  if (answer.length <= 4) return 'wrong';
  const distance = levenshtein(typed, answer);
  if (answer.length <= 7) return distance === 1 ? 'spelling' : 'wrong';
  return distance <= 2 ? 'spelling' : 'wrong';
};

/**
 * The letter-box answer. The boxes show letters and a gap between words, so a phrase
 * typed without its space ("icecream") is right, not a misspelling. Typos still count.
 */
export const judgeLetterAnswer = (guess: string, target: string): TeacherMatch => {
  const compact = (value: string) => normalizeAnswer(value).replace(/[\s-]/g, '');
  const typed = compact(guess);
  const answer = compact(target);
  if (!typed || !answer) return 'wrong';
  if (typed === answer) return 'correct';
  if (answer.length <= 4) return 'wrong';
  const distance = levenshtein(typed, answer);
  if (answer.length <= 7) return distance === 1 ? 'spelling' : 'wrong';
  return distance <= 2 ? 'spelling' : 'wrong';
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

/**
 * The previous release kept every deck under one device-wide key. Move that list to the
 * first account that signs in, so an upgrade does not make existing decks disappear.
 */
const adoptLegacyDecks = (owner: string): void => {
  if (!owner || owner === 'guest') return;
  try {
    const legacy = localStorage.getItem(LEGACY_DECKS_KEY);
    if (!legacy) return;
    const key = decksKey(owner);
    if (!localStorage.getItem(key)) localStorage.setItem(key, legacy);
    localStorage.removeItem(LEGACY_DECKS_KEY);
  } catch {
    /* Storage blocked — nothing to migrate. */
  }
};

const sortDecks = (decks: TeacherDeck[]): TeacherDeck[] =>
  [...decks].sort((a, b) => b.updatedAt - a.updatedAt);

/** What the teacher sees: tombstones are bookkeeping, not lists. */
const liveDecks = (decks: TeacherDeck[]): TeacherDeck[] =>
  decks.filter((deck) => !deck.deletedAt);

/**
 * How long a tombstone travels. Long enough for a teacher to open the app on every device
 * they use, short enough that a shelf never fills up with ghosts.
 */
const TOMBSTONE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

const pruneDecks = (decks: TeacherDeck[], now = Date.now()): TeacherDeck[] =>
  decks.filter((deck) => !deck.deletedAt || now - deck.deletedAt < TOMBSTONE_TTL_MS);

/** The cache on this device — what the tab can paint before the account answers. */
const readLocalDecks = (owner: string): TeacherDeck[] => {
  try {
    const raw = localStorage.getItem(decksKey(owner));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return sortDecks(parsed.filter(isDeck));
  } catch {
    return [];
  }
};

const writeLocalDecks = (owner: string, decks: TeacherDeck[]): void => {
  try {
    localStorage.setItem(decksKey(owner), JSON.stringify(decks));
  } catch {
    /* Storage blocked — the account copy is still the source of truth. */
  }
};

/** null when this device has never completed a sync for the account. */
const readSeenVersion = (owner: string): number | null => {
  try {
    const raw = localStorage.getItem(seenKey(owner));
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
};

const writeSeenVersion = (owner: string, version: number): void => {
  try {
    // Only ever forward: a device whose clock runs behind must not lower the baseline and
    // make decks it already synced look unsynced again.
    const previous = readSeenVersion(owner) ?? 0;
    if (version <= previous) return;
    localStorage.setItem(seenKey(owner), String(version));
  } catch {
    /* Storage blocked — the next read falls back to keeping local decks. */
  }
};

/** Firestore refuses `undefined` inside an array, so every word is rebuilt with no holes. */
const plainDeck = (deck: TeacherDeck): TeacherDeck => ({
  id: deck.id,
  name: deck.name,
  createdAt: deck.createdAt,
  updatedAt: deck.updatedAt,
  ...(deck.status ? { status: deck.status } : {}),
  ...(deck.deletedAt ? { deletedAt: deck.deletedAt } : {}),
  words: deck.words.map((entry) => ({
    word: entry.word,
    meaning: entry.meaning,
    ...(entry.pos ? { pos: entry.pos } : {}),
    ...(entry.level ? { level: entry.level } : {}),
  })),
});

/** A guest has no account to write to; without a configured project there is nowhere to write. */
const canSync = (owner: string): boolean => Boolean(db) && Boolean(owner) && owner !== 'guest';

/** The account document as stored: the shelf plus the version stamp of the whole document. */
interface RemoteShelf {
  decks: TeacherDeck[];
  version: number;
}

/** The account shelf and its version, or null when this account has never saved one. */
const fetchRemoteShelf = async (owner: string): Promise<RemoteShelf | null> => {
  const snap = await getDoc(doc(db!, DECKS_COLLECTION, owner));
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, unknown>;
  const raw = Array.isArray(data.decks) ? data.decks : [];
  return {
    decks: sortDecks(raw.filter(isDeck)),
    // A document written before the version existed reads as 0: every local deck is then
    // newer, so the first merge keeps everything instead of dropping unseen work.
    version: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
  };
};

const writeRemoteDecks = async (owner: string, decks: TeacherDeck[]): Promise<void> => {
  const now = Date.now();
  const live = sortDecks(liveDecks(pruneDecks(decks, now))).slice(0, MAX_DECKS);
  // Tombstones only take the slots the live shelf leaves free, so a busy delete history
  // can never push a real deck out of the document — and the 40-deck rule still holds.
  const dead = sortDecks(pruneDecks(decks, now).filter((deck) => deck.deletedAt)).slice(
    0,
    MAX_DECKS - live.length,
  );
  await setDoc(doc(db!, DECKS_COLLECTION, owner), {
    decks: [...live, ...dead].map(plainDeck),
    updatedAt: now,
  });
  // Recorded only after the write lands: a failed sync must leave the old version in
  // place, or decks saved during the outage would look "already synced" and be dropped.
  writeSeenVersion(owner, now);
};

/**
 * Decks already cached on this device, for an instant first paint. Never the final word:
 * `loadTeacherDecks` follows and replaces it with the account shelf.
 */
export const cachedTeacherDecks = (owner: string): TeacherDeck[] => {
  adoptLegacyDecks(owner);
  return sortDecks(liveDecks(readLocalDecks(owner)));
};

/**
 * Where the shelf currently lives. Guests (and a build without Firebase) only ever have
 * the device copy, so the tab must say so instead of promising an account.
 */
export type TeacherDeckSync = 'cloud' | 'device' | 'error';

export interface TeacherDeckShelf {
  decks: TeacherDeck[];
  sync: TeacherDeckSync;
}

/**
 * Last writer wins per deck, and a tombstone is a writer like any other — that is what
 * makes a delete on one device retire the stale copy on the next.
 *
 * A deck the account has no record of is only re-uploaded when it was touched after this
 * device's last completed sync (`seen`). A tombstone is pruned 90 days after the delete,
 * so a device that stayed offline longer than that would otherwise see "unknown deck" and
 * push a copy that was deliberately deleted. Anything older than `seen` was already on the
 * account once and is missing now because another device deleted it.
 *
 * `changed` means the shelf document is out of date; `needPush` is narrower: a *live*
 * deck exists only here. The listener must not re-upload tombstones the cap has no room
 * for, or it would push, get the pruned snapshot back, and loop forever.
 */
const mergeShelves = (
  local: TeacherDeck[],
  remote: TeacherDeck[],
  seen: number | null,
): { decks: TeacherDeck[]; changed: boolean; needPush: boolean } => {
  const byId = new Map(remote.map((deck) => [deck.id, deck]));
  let changed = false;
  let needPush = false;
  for (const deck of local) {
    const stored = byId.get(deck.id);
    if (stored) {
      if (stored.updatedAt < deck.updatedAt) {
        byId.set(deck.id, deck);
        changed = true;
        if (!deck.deletedAt) needPush = true;
      }
      continue;
    }
    // No record on the account. Before the first completed sync there is no yardstick, so
    // keeping the deck is the safe choice; afterwards only newer work is ours.
    if (seen !== null && deck.updatedAt <= seen) continue;
    byId.set(deck.id, deck);
    changed = true;
    if (!deck.deletedAt) needPush = true;
  }
  return { decks: sortDecks(pruneDecks([...byId.values()])), changed, needPush };
};

/**
 * The shelf for this account: the account copy when there is one, the cached copy offline.
 * A deck that only exists on this device (saved before lists synced, or while the network
 * was down) is pushed up rather than dropped, and a deck edited later on either side wins.
 *
 * The sync state comes back with the list so the tab can show whether the account copy is
 * real — a silent fallback to the cache is what made decks "disappear" on another device.
 */
export const loadTeacherDecks = async (owner: string): Promise<TeacherDeckShelf> => {
  adoptLegacyDecks(owner);
  const local = readLocalDecks(owner);
  if (!canSync(owner)) return { decks: sortDecks(liveDecks(local)), sync: 'device' };

  try {
    const remote = await fetchRemoteShelf(owner);
    if (remote === null) {
      if (local.length > 0) await writeRemoteDecks(owner, local);
      return { decks: sortDecks(liveDecks(local)), sync: 'cloud' };
    }

    const merged = mergeShelves(local, remote.decks, readSeenVersion(owner));
    writeLocalDecks(owner, merged.decks);
    if (merged.changed) await writeRemoteDecks(owner, merged.decks);
    else writeSeenVersion(owner, remote.version);
    return { decks: sortDecks(liveDecks(merged.decks)), sync: 'cloud' };
  } catch {
    // Offline, or the rules have not been published yet — the cached shelf still opens,
    // but the tab has to tell the teacher it is not on the account.
    return { decks: sortDecks(liveDecks(local)), sync: 'error' };
  }
};

/**
 * The live shelf: the account document is followed, so a deck saved or deleted on another
 * device shows up here without reopening the tab. The cache is painted by the component
 * before this runs; every emission after that is the account's answer.
 */
export const watchTeacherDecks = (
  owner: string,
  onShelf: (shelf: TeacherDeckShelf) => void,
): (() => void) => {
  adoptLegacyDecks(owner);
  if (!canSync(owner)) {
    onShelf({ decks: sortDecks(liveDecks(readLocalDecks(owner))), sync: 'device' });
    return () => {};
  }

  return onSnapshot(
    doc(db!, DECKS_COLLECTION, owner),
    (snap) => {
      const local = readLocalDecks(owner);
      if (!snap.exists()) {
        // First sign-in on a device that already had a cache: this is the backfill.
        if (local.length > 0) void writeRemoteDecks(owner, local).catch(() => {});
        onShelf({ decks: sortDecks(liveDecks(local)), sync: 'cloud' });
        return;
      }
      const data = snap.data() as Record<string, unknown>;
      const remote = Array.isArray(data.decks) ? data.decks.filter(isDeck) : [];
      const version = typeof data.updatedAt === 'number' ? data.updatedAt : 0;
      const merged = mergeShelves(local, remote, readSeenVersion(owner));
      writeLocalDecks(owner, merged.decks);
      if (merged.needPush) void writeRemoteDecks(owner, merged.decks).catch(() => {});
      else writeSeenVersion(owner, version);
      onShelf({ decks: sortDecks(liveDecks(merged.decks)), sync: 'cloud' });
    },
    () => {
      // Offline or the rules reject the read: keep showing the cache and say so.
      onShelf({ decks: sortDecks(liveDecks(readLocalDecks(owner))), sync: 'error' });
    },
  );
};

/**
 * Saves (or replaces) a deck and returns the full, persisted list. The caller enforces
 * `MAX_DECKS` before calling this, so saving never silently drops the oldest list.
 *
 * The device copy is written first so the tab never loses the save, then the account copy;
 * a rejected sync throws, and the caller can say so while the deck stays cached.
 */
export const saveTeacherDeck = async (owner: string, deck: TeacherDeck): Promise<TeacherDeck[]> => {
  const next = pruneDecks(
    sortDecks([deck, ...readLocalDecks(owner).filter((item) => item.id !== deck.id)]),
  );
  writeLocalDecks(owner, next);
  if (canSync(owner)) await writeRemoteDecks(owner, next);
  return sortDecks(liveDecks(next));
};

/**
 * Deleting leaves a dated tombstone rather than dropping the entry: other devices merge
 * by `updatedAt`, and without a newer record they would keep — and re-upload — the deck.
 */
export const deleteTeacherDeck = async (owner: string, id: string): Promise<TeacherDeck[]> => {
  const now = Date.now();
  const local = readLocalDecks(owner);
  const target = local.find((item) => item.id === id);
  const next = pruneDecks(
    sortDecks([
      ...local.filter((item) => item.id !== id),
      ...(target ? [{ ...target, words: [], deletedAt: now, updatedAt: now }] : []),
    ]),
  );
  writeLocalDecks(owner, next);
  if (canSync(owner)) await writeRemoteDecks(owner, next);
  return sortDecks(liveDecks(next));
};

export const newTeacherDeckId = (): string =>
  `deck-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** A deck test: the deck's own words, shuffled, so the order is not the lesson's. */
export const buildDeckTest = (
  deck: TeacherDeck,
  mode: TeacherTestMode = 'listen',
  rng: () => number = Math.random,
): TeacherSession => ({
  origin: { kind: 'deck', name: deck.name },
  mode,
  words: shuffle(deck.words, rng),
});

/**
 * A fresh order for the flashcard pass. Shuffled on its own so that studying a deck
 * never teaches the answer *sequence* — the test shuffles again when it starts.
 */
export const shuffledDeckWords = (
  words: TeacherWord[],
  rng: () => number = Math.random,
): TeacherWord[] => shuffle(words, rng);

export const buildLevelSession = (
  levelId: TeacherLevelId,
  count: number,
  mode: TeacherTestMode = 'listen',
  rng: () => number = Math.random,
): TeacherSession => {
  const words = buildLevelTest(levelId, count, rng);
  // The delivered count, not the requested one — A1 tops out below the 300 ceiling.
  return { origin: { kind: 'level', levelId }, mode, words };
};

/** Rebuilds a session with only the words the student missed. */
export const buildRetrySession = (session: TeacherSession, answers: TeacherAnswer[]): TeacherSession => ({
  ...session,
  retry: true,
  words: answers.filter((answer) => !answer.correct).map((answer) => answer.word),
});

/** The same test again, in a new order. */
export const reshuffleSession = (session: TeacherSession, rng: () => number = Math.random): TeacherSession => ({
  ...session,
  words: shuffle(session.words, rng),
});
