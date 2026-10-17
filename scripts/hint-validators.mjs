// scripts/hint-validators.mjs
//
// The quality gate for generated spoken hints. Pure and offline on purpose: it
// must be possible to score a clue in milliseconds, thousands of times, with no
// network call, so the generator can reject bad output instead of shipping it.
//
// Why this exists: version 1 of the leak check compared single tokens against the
// target, which is blind to every multi-word target. It happily accepted "the
// meeting will officially be over" as a clue for "be over" — the answer, verbatim,
// in the clue. Phrasal verbs (146 of them) and compound nouns (90+) are exactly
// the words a learner struggles with, so a blind spot there is not a rounding
// error. Everything below exists to make that class of bug impossible.
//
// Two severities:
//   hard — the clue is broken (leaks the answer, dictionary voice, wrong shape).
//          The generator must discard it and try again.
//   warn — the clue is usable but weak (vague "this" subject, template echo).
//          Counted and reported, so prompt changes can be judged on numbers.
//
// Deterministic checks cannot see a *semantic* give-away ("It means to let
// something happen" for "allow" — no shared letters with the answer). That is the
// job of the discrimination gate in scripts/lib/hint-judge.mjs, which shows the AI
// the clue alone and rejects it when the AI names a different word that is also in
// the bank. Lexical here, semantic there.
//
// Sentence completeness is deliberately NOT checked, here or in hint-probe.mjs.
// It was tried twice and failed twice:
//   - a verb lexicon built from the CEFR bank flagged "stores", "used", "stored",
//     "outperforms", "train" and "won" as non-verbs — more false positives than
//     real fragments;
//   - asking the judging model which clue was not a sentence flagged 15 of 18
//     clues, including "Unlike lunch, this meal happens when people first wake up".
// Telling a finite verb from a participle needs part-of-speech tags, which the bank
// does not carry. The consequence is covered instead: a fractured clue carries too
// little for the discrimination gate to win, and that gate is trustworthy.
//
// Self-check: node scripts/hint-validators.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export const LEVEL_ORDER = ['STARTERS', 'MOVERS', 'FLYERS', 'KET', 'PET', 'PRE_IELTS'];
export const BUCKETS = ['nouns', 'verbs', 'adjectives', 'phrasalVerbs'];
export const POS_OF_BUCKET = {
  nouns: 'noun',
  verbs: 'verb',
  adjectives: 'adjective',
  phrasalVerbs: 'phrasalVerb',
};

// ── word lists ──────────────────────────────────────────────────────────────

// The lists are a TypeScript literal, so they are read as text rather than
// imported. Same trick as scripts/generate-glosses.mjs, and it keeps the script
// runnable with plain `node` — no ts-node, no build step.
export const parseWordLists = (src) => {
  const byLevelPos = new Map();
  const list = [];
  for (const level of LEVEL_ORDER) {
    const start = src.indexOf(`[CEFRLevel.${level}]:`);
    if (start === -1) throw new Error(`Pack not found in cefrWordLists.ts: ${level}`);
    const next = src.indexOf('[CEFRLevel.', start + 5);
    const body = src.slice(start, next === -1 ? src.length : next);
    const byPos = new Map();
    for (const bucket of BUCKETS) {
      const m = body.match(new RegExp(`${bucket}:\\s*\\[([^\\]]*)\\]`));
      const words = m ? [...m[1].matchAll(/"([^"]+)"/g)].map((lit) => lit[1]) : [];
      byPos.set(POS_OF_BUCKET[bucket], words);
      for (const word of words) list.push({ word, pos: POS_OF_BUCKET[bucket], level });
    }
    byLevelPos.set(level, byPos);
  }
  return { list, byLevelPos };
};

export const readWordLists = (path = join(root, 'cefrWordLists.ts')) => parseWordLists(readFileSync(path, 'utf8'));

// ── lexical identity ────────────────────────────────────────────────────────

const SUFFIX = /(ing|ings|ed|es|s|ly|er|est|'s)$/;

// Irregular forms the suffix stripper cannot reach. Not decoration: the bank holds
// 146 phrasal verbs and a phrasal verb's first element is usually irregular
// ("be over" -> "is over", "get over" -> "got over"). Without this table the leak
// check calls a clue clean while it spells the answer out in another tense.
const LEMMA = new Map(
  Object.entries({
    am: 'be', is: 'be', are: 'be', was: 'be', were: 'be', been: 'be', being: 'be',
    got: 'get', gotten: 'get', went: 'go', gone: 'go', came: 'come', took: 'take', taken: 'take',
    gave: 'give', given: 'give', made: 'make', ran: 'run', saw: 'see', seen: 'see',
    does: 'do', did: 'do', done: 'do', has: 'have', had: 'have', found: 'find', held: 'hold',
    kept: 'keep', left: 'leave', brought: 'bring', bought: 'buy', thought: 'think', taught: 'teach',
    caught: 'catch', told: 'tell', said: 'say', felt: 'feel', met: 'meet', sent: 'send',
    spent: 'spend', built: 'build', lost: 'lose', won: 'win', sat: 'sit', stood: 'stand',
    understood: 'understand', wrote: 'write', written: 'write', spoke: 'speak', spoken: 'speak',
    broke: 'break', broken: 'break', chose: 'choose', chosen: 'choose', drove: 'drive', driven: 'drive',
    ate: 'eat', eaten: 'eat', fell: 'fall', fallen: 'fall', forgot: 'forget', forgotten: 'forget',
    grew: 'grow', grown: 'grow', knew: 'know', known: 'know', led: 'lead', paid: 'pay',
    rode: 'ride', ridden: 'ride', rose: 'rise', risen: 'rise', sold: 'sell', shook: 'shake',
    shaken: 'shake', slept: 'sleep', swam: 'swim', swum: 'swim', threw: 'throw', thrown: 'throw',
    wore: 'wear', worn: 'wear', woke: 'wake', woken: 'wake',
  }),
);

// Crude stemmer, deliberately biased towards over-matching: a false positive
// costs one regeneration, a false negative ships the answer to the learner.
export const key = (value) => {
  const raw = String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z']/g, '');
  const stem = raw.replace(SUFFIX, '');
  const base = stem.length >= 3 ? stem : raw;
  return LEMMA.get(base) ?? base;
};

// "dominate" and "dominating" both reduce to a shared prefix, "ends" meets "end".
// The length floor keeps words like "age" from matching "manage".
export const sameFamily = (a, b) => {
  const [x, y] = [key(a), key(b)];
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.length >= 4 && long.startsWith(short);
};

export const tokens = (text) => String(text ?? '').toLowerCase().match(/[a-z']+/g) ?? [];

const words = (text) => tokens(text).length;

// ── clue checks ─────────────────────────────────────────────────────────────

const HARD_VOICE = [
  [/^(it means|it is a|it's a|it is not|it's not|it refers to|this describes|it describes)\b/i, 'dictionary opener'],
  [/\b(it means|refers to|is defined as|which means)\b/i, 'dictionary phrasing'],
  [/^(it is not|it's not|not)\b/i, 'bare negation'],
];
// Kept to genuinely empty subjects only. "Unlike X, this <noun> ..." is the shape
// the prompt mandates, so "this meal" or "this space" is the required contrast
// frame, not a vagueness fault — penalising it made the scoreboard argue with the
// spec it was measuring.
const WARN_VOICE = [
  [/\b(a person who|someone who|people who|a thing that|something that)\b/i, 'defining frame'],
  [/\b(this|that) thing\b|\bdo this\b/i, 'vague pronoun object'],
  [/^(this|that)\b/i, 'clue opens on a pronoun'],
];

const HARD_NEGATION = /^(it is not|it's not|not)\b/i;

export const MIN_DEF_WORDS = 6;
export const MAX_DEF_WORDS = 20;

// Longest run of shared tokens between two strings, used to catch the model
// echoing a few-shot example instead of writing a fresh clue. Returns the phrase.
export const longestSharedNgram = (a, b, n = 4) => {
  const [x, y] = [tokens(a), tokens(b)];
  for (let size = Math.min(n + 2, x.length, y.length); size >= n; size -= 1) {
    for (let i = 0; i + size <= x.length; i += 1) {
      const slice = x.slice(i, i + size).join(' ');
      for (let j = 0; j + size <= y.length; j += 1) {
        if (y.slice(j, j + size).join(' ') === slice) return slice;
      }
    }
  }
  return null;
};

/**
 * Score one clue.
 *
 * @param {{word: string, pos: string}} entry  the target word and its part of speech
 * @param {{nearest?: string, defs?: string[], example?: string}} clue
 * @param {{examples?: string[]}} [options]
 *        examples: the few-shot lines the prompt showed the model
 */
export const checkClue = (entry, clue, options = {}) => {
  const { examples = [] } = options;
  const hard = [];
  const warn = [];
  const add = (list, code, detail) => list.push({ code, detail });

  const defs = Array.isArray(clue?.defs) ? clue.defs.map((d) => String(d ?? '').trim()) : [];
  const example = String(clue?.example ?? '').trim();
  const nearest = String(clue?.nearest ?? '').trim();

  // ── shape ──
  if (defs.length !== 2 || defs.some((d) => !d)) {
    add(hard, 'shape.defs', `expected 2 definitions, got ${defs.length}`);
  }
  defs.forEach((def, i) => {
    const count = words(def);
    if (count < MIN_DEF_WORDS || count > MAX_DEF_WORDS) {
      add(hard, 'shape.length', `def${i + 1} is ${count} words (want ${MIN_DEF_WORDS}-${MAX_DEF_WORDS})`);
    }
  });
  if (!example) add(hard, 'shape.example', 'missing example sentence');
  else {
    const gaps = example.match(/_{2,}/g)?.length ?? 0;
    if (gaps === 0) add(hard, 'shape.example', 'example has no ___ gap for the target');
    else if (gaps > 1) add(hard, 'shape.example', `example has ${gaps} gaps, want exactly 1`);
  }
  // The blank belongs to the example and nowhere else: the clues are read aloud,
  // and v4.1 shipped "a meeting that ___ might resume tomorrow" as a clue.
  defs.forEach((def, i) => {
    if (/_{2,}/.test(def)) add(hard, 'shape.gap', `def${i + 1} contains a ___ gap: "${def.slice(0, 48)}..."`);
  });

  // ── leak: the target itself ──
  const parts = tokens(entry.word);
  const clueTokens = tokens([...defs, example].join(' '));
  if (parts.length > 1) {
    // Windows over the token stream, so "be over" is caught inside "will be over".
    for (let i = 0; i + parts.length <= clueTokens.length; i += 1) {
      if (parts.every((part, offset) => sameFamily(clueTokens[i + offset], part))) {
        add(hard, 'leak.target', `clue contains the target: "${clueTokens.slice(i, i + parts.length).join(' ')}"`);
        break;
      }
    }
    for (const part of parts) {
      if (key(part).length >= 4 && clueTokens.some((t) => t === part)) {
        add(warn, 'leak.part', `clue uses one word of the target: "${part}"`);
      }
    }
  } else if (clueTokens.some((t) => sameFamily(t, entry.word))) {
    const hit = clueTokens.find((t) => sameFamily(t, entry.word));
    add(hard, 'leak.target', `clue contains "${hit}", built from the target's root`);
  }

  // ── nearest: the model's own declared synonym ──
  // Required, because it doubles as the hard negative for the discrimination gate
  // and as a self-report of what the model thought the word meant.
  if (!nearest) add(hard, 'nearest.missing', 'no "nearest" word in the reply');
  else if (/\s/.test(nearest)) add(hard, 'nearest.multiword', `"nearest" must be one word, got "${nearest}"`);
  else if (sameFamily(nearest, entry.word)) add(hard, 'nearest.is-target', `"nearest" is the target: "${nearest}"`);
  else {
    const inDef1 = tokens(defs[0]).some((t) => sameFamily(t, nearest));
    if (inDef1) add(hard, 'nearest.in-def1', `def1 defines the word with its synonym "${nearest}"`);
    // The prompt fixes clue 2's shape: "Unlike X, this ...", with X being the declared
    // "nearest". A model that contrasts some other word has quietly changed its mind
    // about what the target means, and the runtime offers "nearest" to a stuck learner,
    // so the two halves have to agree. Only the contrast clause counts: the pilot shipped
    // "accompany" declaring "follow" and contrasting a bodyguard, with "follow" sitting two
    // clauses away in "a friend who follows you", and a check over the whole sentence
    // called that clean.
    const contrast = (defs[1] ?? '').split(',')[0];
    if (!tokens(contrast).some((t) => sameFamily(t, nearest))) {
      add(hard, 'nearest.unused', `def2 does not contrast with the declared "nearest" ("${nearest}")`);
    }
    const hits = [...tokens(defs.join(' ')), ...tokens(example)].filter((t) => sameFamily(t, nearest));
    if (hits.length > 1) add(warn, 'nearest.repeated', `"${nearest}" appears ${hits.length} times`);
    if (!inDef1 && tokens(example).some((t) => sameFamily(t, nearest))) {
      add(warn, 'nearest.in-example', `"${nearest}" appears in the example, narrowing the guess`);
    }
  }

  // ── voice ──
  defs.forEach((def, i) => {
    for (const [pattern, label] of HARD_VOICE) {
      if (pattern.test(def)) add(hard, 'voice.dictionary', `def${i + 1}: ${label} — "${def.slice(0, 48)}..."`);
    }
    for (const [pattern, label] of WARN_VOICE) {
      if (pattern.test(def)) add(warn, 'voice.vague', `def${i + 1}: ${label}`);
    }
    if (i === 1 && HARD_NEGATION.test(def)) add(hard, 'voice.negation', `def2 is a bare negation`);
  });

  // ── templating: did the model echo a few-shot line, or itself? ──
  if (examples.length) {
    for (const def of defs) {
      for (const line of examples) {
        const shared = longestSharedNgram(def, line, 4);
        if (shared) add(warn, 'copy.example', `def repeats a prompt example: "${shared}"`);
      }
    }
  }
  if (defs.length === 2) {
    const shared = longestSharedNgram(defs[0], defs[1], 5);
    if (shared) add(warn, 'shape.repeat', `the two definitions repeat: "${shared}"`);
  }

  return { hard, warn };
};

// ── self-check ──────────────────────────────────────────────────────────────
// Regression cases for the bugs that actually shipped a broken clue during
// development. Run with `node scripts/hint-validators.mjs`.

const has = (findings, code) => findings.some((f) => f.code === code);

const SELF_CHECK = () => {
  const { list, byLevelPos } = readWordLists();
  // The exact two lines prompt v4 showed the model. Kept verbatim here because
  // the copy detector is the guard against the model echoing them.
  const FEW_SHOT = [
    'A family climbs up into this dusty space to store old boxes above the bedrooms',
    'Unlike the attic, this space sits above the top floor, right under the roof',
  ];
  const expect = (label, clue, entry, wanted, forbidden = []) => {
    const { hard, warn } = checkClue(entry, clue, { examples: FEW_SHOT });
    const missing = wanted.filter((code) => !has(hard, code) && !has(warn, code));
    const extra = forbidden.filter((code) => has(hard, code) || has(warn, code));
    const ok = missing.length === 0 && extra.length === 0;
    const detail = [
      missing.length ? `missing ${missing.join(',')}` : '',
      extra.length ? `unexpected ${extra.join(',')}` : '',
    ]
      .filter(Boolean)
      .join('; ');
    console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
    return ok;
  };

  const beOver = { word: 'be over', pos: 'phrasalVerb' };
  const basement = { word: 'basement', pos: 'noun' };
  const breakfast = { word: 'breakfast', pos: 'noun' };
  const allow = { word: 'allow', pos: 'verb' };

  const results = [
    // The bug that motivated this file: v4 wrote the answer into its own clue and
    // the old token-by-token check reported it as clean.
    expect(
      'two-word target written inside the clue',
      {
        nearest: 'end',
        defs: [
          'The party stops when the music is turned off at midnight',
          'Unlike the party ending, the meeting will officially be over when the boss leaves',
        ],
        example: 'The concert will ___ after the final song.',
      },
      beOver,
      ['leak.target'],
    ),
    // The other bug: the model echoed a prompt example verbatim, which at bank
    // scale would repeat the same sentence across hundreds of words.
    expect(
      'clue echoes a few-shot example',
      {
        nearest: 'attic',
        defs: [
          'A family stores old furniture down here under the living room',
          'Unlike the attic, this space sits below ground level',
        ],
        example: 'The kids like to play in the ___ on rainy days.',
      },
      basement,
      ['copy.example'],
    ),
    // Lexical leak through an inflected form rather than the exact word.
    expect(
      'inflected form of the target',
      {
        nearest: 'permit',
        defs: [
          'The teacher allows you to do something by saying yes to your request',
          'Unlike refusing, this means your answer to the request is yes',
        ],
        example: 'The guard will ___ visitors into the building after nine.',
      },
      allow,
      ['leak.target'],
    ),
    // Dictionary voice plus a definition that is nothing but a negation.
    expect(
      'dictionary voice and bare negation',
      {
        nearest: 'control',
        defs: ['It means to have control over something or someone', 'It is not being equal or sharing power'],
        example: 'The company will ___ the market with its new product.',
      },
      { word: 'dominate', pos: 'verb' },
      ['voice.dictionary', 'voice.negation'],
    ),
    // v4.1 leaked its own input format into a clue: the ___ gap belongs to the
    // example, and the clues are read aloud to the learner.
    expect(
      'gap left inside a clue',
      {
        nearest: 'end',
        defs: [
          'The party will stop when the music finishes playing',
          'Unlike a party that ends, a meeting that ___ might resume tomorrow',
        ],
        example: 'The conference will ___ once the chairman closes it.',
      },
      beOver,
      ['shape.gap'],
    ),
    // The synonym carrying def1 gives the answer away without ever naming it.
    expect(
      'synonym inside def1',
      {
        nearest: 'end',
        defs: [
          'The party ends when the music stops and everyone goes home',
          'Unlike dinner, a meal before lunch and after waking up',
        ],
        example: 'The meeting will ___ by the time we arrive.',
      },
      beOver,
      ['nearest.in-def1'],
    ),
    // The best clue produced during tuning: short, concrete, no leaked words.
    expect(
      'good clue passes clean',
      {
        nearest: 'lunch',
        defs: ['The family eats together at seven in the kitchen before school', 'Unlike lunch, this meal starts the day'],
        example: 'We will eat ___ before going to school.',
      },
      breakfast,
      [],
      ['leak.target', 'voice.dictionary', 'shape.length', 'nearest.in-def1', 'copy.example'],
    ),
    // Straight from the fifty-word pilot: clue 2 contrasted a word the reply had not
    // declared, so "nearest" and the clue disagreed about what the target meant.
    expect(
      'clue 2 contrasts a word other than "nearest"',
      {
        nearest: 'follow',
        defs: [
          "The bride's father walks with her down the aisle on her wedding day",
          'Unlike a bodyguard, a friend who walks with you does not protect you',
        ],
        example: "Her mother will ___ her to the doctor's office.",
      },
      { word: 'accompany', pos: 'verb' },
      ['nearest.unused'],
    ),
  ];

  const pools = LEVEL_ORDER.map((lvl) => `${lvl}:${[...byLevelPos.get(lvl).values()].reduce((n, w) => n + w.length, 0)}`);
  console.log(`\nword banks — ${pools.join(' ')}  (total ${list.length})`);

  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  return failed === 0;
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(SELF_CHECK() ? 0 : 1);
}
