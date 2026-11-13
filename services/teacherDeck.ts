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

const wordsOfBand = (band: CEFRLevel): Array<{ word: string; pos: TeacherPos }> => {
  const bucket = cefrWordLists[band];
  return [
    ...bucket.nouns.map((word) => ({ word, pos: 'n.' as TeacherPos })),
    ...bucket.verbs.map((word) => ({ word, pos: 'v.' as TeacherPos })),
    ...bucket.adjectives.map((word) => ({ word, pos: 'adj.' as TeacherPos })),
    ...(bucket.phrasalVerbs ?? []).map((word) => ({ word, pos: 'phr. v.' as TeacherPos })),
  ];
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
    for (const entry of wordsOfBand(band)) {
      const wordKey = entry.word.toLowerCase();
      if (seenWords.has(wordKey)) continue;
      const meaning = getVietnameseMeaning(entry.word);
      if (!meaning) continue;
      const meaningKey = normalizeAnswer(meaning);
      if (!meaningKey || seenMeanings.has(meaningKey)) continue;
      seenWords.add(wordKey);
      seenMeanings.add(meaningKey);
      pool.push({ word: entry.word, meaning, pos: entry.pos, level: band });
    }
  }

  const take = Math.max(1, Math.min(count, pool.length));
  return shuffle(pool, rng).slice(0, take);
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
const DECKS_KEY = 'wordcrew_teacher_decks_v1';

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
