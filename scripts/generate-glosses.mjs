// scripts/generate-glosses.mjs
//
// Build-time generator for the Vietnamese hint. It collects every word that has no
// hand-curated entry — the CEFR packs, the frequency and school-topic lists — and
// machine-translates them (en → vi) in batches through the key-less Google endpoint.
// Proper nouns (countries, cities, people, brands) are skipped: see
// scripts/data/proper-nouns.txt. The result is committed to
// vietnameseGlosses.generated.ts, so the hint resolves offline with no per-word network
// round-trip and no runtime API cost.
//
// Re-run only when the word lists change:  node scripts/generate-glosses.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Packs whose glosses are NOT hand-curated yet (see VIETNAMESE_MEANINGS).
const PACKS = ['FLYERS', 'KET', 'PET', 'PRE_IELTS'];
const BUCKETS = ['nouns', 'verbs', 'adjectives', 'phrasalVerbs'];
const BATCH_SIZE = 80;
const OUT_FILE = join(root, 'vietnameseGlosses.generated.ts');

// Everyday English beyond the CEFR packs. Teachers paste textbook vocabulary that the
// exam lists miss, and a missing gloss there is what makes a deck feel unfinished.
// The NGSL is exactly the core a textbook assumes (~2,800 words, ~92% of general text);
// NAWL, TSL and BSL add the academic, TOEIC and business vocabulary exam classes use;
// the web corpus is broad but skips a lot of school vocabulary (no "habit" or
// "waterfall"), so it comes last, trimmed by its frequency order. NGSL-first also means
// the cap only ever trims that long tail. `phrases` marks the one hand-curated file where
// a multi-word entry is expected: "run out of" is a vocabulary item, a bare "ice cream"
// scraped from a corpus is not. `corpus` marks the one list that is not a vocabulary
// list at all: it is web frequency, so it also carries proper nouns and brands, which
// the echo check below has to drop.
const EXTRA_WORDS_FILES = [
  { name: 'NGSL', file: join(root, 'scripts/data/ngsl.txt'), limit: Infinity },
  { name: 'NAWL', file: join(root, 'scripts/data/nawl.txt'), limit: Infinity },
  { name: 'TSL', file: join(root, 'scripts/data/tsl.txt'), limit: Infinity },
  { name: 'BSL', file: join(root, 'scripts/data/bsl.txt'), limit: Infinity },
  { name: 'school topics', file: join(root, 'scripts/data/school-topics.txt'), limit: Infinity, phrases: true },
  { name: 'common list', file: join(root, 'scripts/data/common-words.txt'), limit: 6000, corpus: true },
];

// Plain single words for the frequency lists; words or short phrases for the curated file.
const EXTRA_WORD = /^[a-z]{3,}$/;
const EXTRA_PHRASE = /^[a-z][a-z' -]{2,39}$/;

// Names are not vocabulary: a flashcard for "France" or "Toyota" has nothing to teach.
// The file is curated by hand because no automatic signal survives — the translator turns
// "Africa" into "Châu Phi" (so its output cannot be matched against the English key) and
// a capital letter is normal Vietnamese orthography ("coast" → "Bờ biển", "portrait" →
// "Chân dung"). See the file header for the line it draws and the words it keeps.
const properNouns = new Set(
  readFileSync(join(root, 'scripts/data/proper-nouns.txt'), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line && !line.startsWith('#')),
);

// The corpus also carries the plural of a name ("americans", "christians"), and a plural
// is still a name. Only the plain -s is stripped: a real plural of a blocked word is the
// same name, and no vocabulary word is lost because its singular is not in the list.
const isProperNoun = (key) => properNouns.has(key) || properNouns.has(key.replace(/s$/, ''));

// Function words top the frequency list but are never a vocabulary item, and translated
// alone they read as nonsense ("the" → "cái", "may" → "tháng năm"), so they stay out.
// A wrong hint is worse than no hint: the teacher would ship it to the class unseen.
const FUNCTION_WORDS = new Set(`
  a an the and or but nor so yet if then than that this these those there here
  when where why how what which who whom whose whether while because although though
  since until unless before after as at by for from in into of off on onto out over up
  down with within without about above across against along among around behind below
  beneath beside between beyond during except inside outside through throughout toward
  towards under upon via
  i you he she it we they me him her us them my your his its our their mine yours hers
  ours theirs myself yourself himself herself itself ourselves themselves
  each every both few many much some any all none no not only own same other another
  such more most less least very too also just even still again ever never always often
  sometimes usually already almost
  be am is are was were been being have has had having do does did done doing
  will would shall should can could may might must ought
  one thing things something anything nothing everything someone anyone everyone
  nobody somebody anybody everybody ok okay please thanks thank
`.split(/\s+/).filter(Boolean));

const normalize = (word) => word.trim().toLowerCase();

// ── 1. Collect the words that still need a gloss ────────────────────────────
const listsSrc = readFileSync(join(root, 'cefrWordLists.ts'), 'utf8');
const curatedSrc = readFileSync(join(root, 'vietnameseMeanings.ts'), 'utf8');

// Hand-curated keys win, so skip anything we already have a human gloss for.
const curated = new Set([...curatedSrc.matchAll(/"([^"]+)"\s*:/g)].map((m) => normalize(m[1])));

const words = new Set();
const skippedNames = new Set();
for (const level of PACKS) {
  const start = listsSrc.indexOf(`[CEFRLevel.${level}]:`);
  if (start === -1) throw new Error(`Pack not found in cefrWordLists.ts: ${level}`);
  const next = listsSrc.indexOf('[CEFRLevel.', start + 5);
  const body = listsSrc.slice(start, next === -1 ? listsSrc.length : next);
  for (const bucket of BUCKETS) {
    const match = body.match(new RegExp(`${bucket}:\\s*\\[([^\\]]*)\\]`));
    if (!match) continue;
    for (const literal of match[1].matchAll(/"([^"]+)"/g)) {
      const key = normalize(literal[1]);
      if (isProperNoun(key)) {
        skippedNames.add(key);
        continue;
      }
      if (!curated.has(key) && !FUNCTION_WORDS.has(key)) words.add(key);
    }
  }
}
const packCount = words.size;

// The extra lists are the bulk of the coverage; only plain single words survive here,
// because a bare "ice cream" or "self-esteem" scraped from a corpus would translate out
// of context. The curated file is the exception, and it holds the phrases that are
// themselves vocabulary items.
const added = [];
// Web-frequency-only words, kept so their echoes can be dropped after translating. In a
// vocabulary list an echo means a borrowed word ("pizza"); in the corpus it is a proper
// noun the translator does not translate ("aaron" → "aaron", "bangkok" → "bangkok").
const corpusOnly = new Set();
for (const source of EXTRA_WORDS_FILES) {
  const pattern = source.phrases ? EXTRA_PHRASE : EXTRA_WORD;
  let count = 0;
  for (const line of readFileSync(source.file, 'utf8').split(/\r?\n/)) {
    if (count >= source.limit) break;
    const key = line.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!key || key.startsWith('#') || !pattern.test(key)) continue;
    if (curated.has(key) || words.has(key) || FUNCTION_WORDS.has(key)) continue;
    if (isProperNoun(key)) {
      skippedNames.add(key);
      continue;
    }
    words.add(key);
    if (source.corpus) corpusOnly.add(key);
    count += 1;
  }
  added.push(`${count} from ${source.name}`);
}

const list = [...words].sort();
console.log(
  `Translating ${list.length} words (${packCount} from packs, ${added.join(', ')}; ` +
    `${skippedNames.size} proper nouns skipped).`,
);

// ── 2. Batch translate (newline-joined, one request per batch) ──────────────

// The endpoint echoes the line break it was given, so a one-word reply arrives as
// "rừng\n", and when two short lines merge it arrives as "rừng\nnông dân". Trimming only
// the ends left the newline inside, and a translation with a newline used to be thrown
// away — which silently dropped common singulars (forest, farmer, nurse, doctor) while
// their plurals survived, and made the map differ from run to run. Collapse the
// whitespace instead: a gloss is a phrase, never a line break.
const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

const translateBatch = async (batch) => {
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=' +
    encodeURIComponent(batch.join('\n'));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const segments = data?.[0] ?? [];
  if (segments.length === batch.length) return segments.map((seg) => clean(seg?.[0]));
  // The endpoint occasionally merges two short lines, so a 80-word batch can come back
  // with 79 segments and every word after the merge would shift one place. Halving the
  // batch keeps the alignment local; a single word can only return one segment.
  if (batch.length === 1) return [clean(segments.map((seg) => seg?.[0] ?? '').join(' '))];
  throw new Error(`segment mismatch: got ${segments.length}, expected ${batch.length}`);
};

// A handful of Vietnamese words *are* the English word — "pizza", "vitamin", "ion",
// "yoga", "fax" — and the endpoint echoes those back unchanged. Dropping every identical
// translation therefore left those decks with an empty meaning, which is the whole thing
// this map exists to prevent. Every candidate comes from a curated or frequency list, so
// an echo there is a borrowed word, not a failed request. The web corpus is the exception:
// it is ranked by frequency anywhere on the web, so "amazon", "adidas" and "aaron" rank
// high as brands and names, and an echo from there is a proper noun with no gloss to give.
// Only empty and over-long replies are thrown away; the echo check is corpus-only.
const isUseful = (word, translation) =>
  Boolean(translation) &&
  translation.length <= 80 &&
  !(corpusOnly.has(word) && translation.toLowerCase() === word);

const translateWithRetry = async (batch) => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await translateBatch(batch);
    } catch (error) {
      if (attempt >= 4) {
        if (batch.length === 1) {
          console.warn(`Skipping "${batch[0]}": ${error.message}`);
          // An empty slot, not an empty array: the caller addresses results by position,
          // and dropping one would shift every word after it onto the wrong gloss.
          return [''];
        }
        return [
          ...(await translateWithRetry(batch.slice(0, Math.ceil(batch.length / 2)))),
          ...(await translateWithRetry(batch.slice(Math.ceil(batch.length / 2)))),
        ];
      }
      console.warn(`Batch @${batch[0]} failed (${error.message}); retry ${attempt}`);
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
    }
  }
};

const results = {};
for (let i = 0; i < list.length; i += BATCH_SIZE) {
  const batch = list.slice(i, i + BATCH_SIZE);
  const translated = await translateWithRetry(batch);
  batch.forEach((word, idx) => {
    if (isUseful(word, translated[idx])) results[word] = translated[idx];
  });
  process.stdout.write(`\rTranslated ${Math.min(i + BATCH_SIZE, list.length)}/${list.length}`);
  await new Promise((resolve) => setTimeout(resolve, 300));
}
process.stdout.write('\n');

// ── 3. Write the generated map ──────────────────────────────────────────────
const entries = Object.entries(results)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`)
  .join('\n');

const file = `// AUTO-GENERATED by scripts/generate-glosses.mjs — do not edit by hand.
//
// Vietnamese glosses for every word that has no hand-curated entry: the CEFR packs
// (FLYERS, KET, PET, PRE-IELTS), the NGSL core, the NAWL/TSL/BSL academic, TOEIC and
// business lists, a curated set of school topics and phrasal verbs, and the head of a
// general web corpus — so a teacher's pasted vocabulary resolves offline too. Proper
// nouns (countries, cities, capitals, people, brands) are excluded on purpose; a name
// has no gloss to learn. getVietnameseMeaning always prefers the curated
// VIETNAMESE_MEANINGS first, then falls back to this map.

export const GENERATED_VIETNAMESE_MEANINGS: Record<string, string> = {
${entries}
};
`;

writeFileSync(OUT_FILE, file, 'utf8');
console.log(`Wrote ${Object.keys(results).length} entries to ${OUT_FILE}`);
