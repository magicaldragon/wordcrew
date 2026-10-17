// scripts/generate-hints.mjs
//
// Renders the spoken clue for every word in the CEFR bank. Offline and one-off:
// the clues ship as static data, so the game never calls a model at runtime and
// never pays for the same word twice.
//
// Every clue has to clear two gates before it is written:
//   1. checkClue (scripts/hint-validators.mjs) — free, offline. Rejects a clue that
//      leaks the target, speaks in dictionary voice, or has the wrong shape.
//   2. the AI gate (scripts/lib/hint-judge.mjs) — three questions, each the only check
//      that sees its kind of fault. Naming the clue blind catches a *semantic* give-away
//      no regex can: a name that is a different bank word is a rival, and a name that
//      reaches neither the target nor a bank word means the clue points at nothing. The
//      third question reads the two clues and the example with its gap filled, and asks
//      whether each is a complete, correct English sentence — the one fault no regex sees,
//      and the one that shipped "The little boy was when he saw the big dog".
// A rejected clue is regenerated with the reason attached, so the model converges
// instead of repeating the same mistake. A handful of tries, then the word is reported as
// a hole rather than silently shipped.
//
// Usage:
//   node scripts/generate-hints.mjs                     the whole bank
//   node scripts/generate-hints.mjs --sample=50         a balanced 50-word pilot
//   node scripts/generate-hints.mjs --level=PET         one CEFR band
//   node scripts/generate-hints.mjs --only=breakfast    one word
//   node scripts/generate-hints.mjs --concurrency=16    words rendered at once (default 10)
//   node scripts/generate-hints.mjs --force             ignore the cache and redo
//
// Progress is cached in scripts/.cache/hint-clues.<prompt>.<gate>.json, so an interrupted
// run resumes where it stopped instead of paying for the same words again.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createJudge, GATE_ID } from './lib/hint-judge.mjs';
import { HINT_EXAMPLES, HINT_PROMPT, HINT_SCHEMA, HINT_TEMPERATURE, hintMessages } from './lib/hint-prompt.mjs';
import { createWorkersAi, readDevVars } from './lib/workers-ai.mjs';
import { checkClue, readWordLists } from './hint-validators.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = join(root, 'hintClues.generated.ts');

// The cache is named after the prompt that filled it and the gate that accepted it. A
// rendered clue is only valid for the prompt that wrote it and the checks that passed it,
// so hashing both into the filename means an edited rule or a tightened gate can never be
// answered with clues the previous ones cleared. A superseded file is left where it lies —
// harmless, gitignored, and a record of what shipped before.
const PROMPT_ID = createHash('sha1').update(HINT_PROMPT).digest('hex').slice(0, 10);
const CACHE_FILE = join(root, 'scripts', '.cache', `hint-clues.${PROMPT_ID}.${GATE_ID}.json`);

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const has = (name) => process.argv.includes(`--${name}`);

// Words rendered at once. A word costs one generation plus two or three judge calls, and the
// judge waits on the generation, so a batch is latency-bound rather than rate-limited: at six
// the pilot managed about one word every eleven seconds, which put the whole bank at close to
// nine hours. Ten keeps the request rate under the account's per-minute ceiling, and the one
// status that ceiling produces, 429, is already retried with a backoff. Raise it with
// --concurrency=N when the run is the only thing using the account.
const CONCURRENCY = Number(arg('concurrency') ?? 10);

// Eight tries. The gate rejects for several unrelated reasons — a leak, a rival word, a
// missing verb, a clue that runs long or short — and the model tends to fix one while
// breaking another, so a stubborn word often survives only after several rounds of being
// told. A retry costs a fraction of a cent and fires only for words already failing; the
// alternative is a hole, and a hole is a word with no clue at all.
const ATTEMPTS = 8;

// ── target selection ────────────────────────────────────────────────────────

// Round-robin one word at a time from every (band, part of speech) group, so a
// small pilot still covers all six bands and all four buckets instead of being all
// STARTERS nouns. A pilot that only sees easy words flatters the prompt.
const stratified = (rows, size) => {
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.level}/${row.pos}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const buckets = [...groups.values()];
  const deepest = Math.max(...buckets.map((b) => b.length));
  const out = [];
  for (let i = 0; i < deepest && out.length < size; i += 1) {
    for (const bucket of buckets) {
      if (i < bucket.length && out.length < size) out.push(bucket[i]);
    }
  }
  return out;
};

// Targets a spoken clue cannot describe, because describing them means using them. "be" fills
// nearly every English sentence ("he is", "they were"), so every clue leaks it, and the
// example's gap needs a finite form no clue for it can supply. "have" and "may" are function
// words whose meaning is grammatical rather than lexical — the judge kept reaching for a
// different word, and the bank tags "may" a noun while every learner reads it as a modal, so
// the clue and the meaning can never meet. Eight attempts each cleared neither. The runtime
// falls back to the Vietnamese gloss for these instead of shipping a broken clue. "do", "get"
// and "only" are function words too but describe cleanly, so they stay.
const SKIP = new Set(['be', 'have', 'may']);

const selectTargets = (lists) => {
  let targets = lists.list;
  const level = arg('level');
  if (level) targets = targets.filter((row) => row.level === level);
  const only = arg('only');
  // --only names a word on purpose, so it overrides the skip list and lets a skipped word be
  // re-tested; a plain bank run takes the list.
  if (only) targets = targets.filter((row) => row.word === only.toLowerCase());
  else targets = targets.filter((row) => !SKIP.has(row.word));
  targets = dedupeByWord(targets);
  const sample = Number(arg('sample') ?? 0);
  if (sample) targets = stratified(targets, sample);
  if (!targets.length) throw new Error('no word matches those filters');
  return targets;
};

// Twenty-nine words are listed twice, once per part of speech — "account" is a PET noun
// and a PRE_IELTS verb. HINT_CLUES is keyed by the word, so the two would collide and
// one sense would silently wear the other's clue; rendered blind, that is exactly what
// happened to "academic", which got a clue about a person under its adjective entry.
// Keep the lowest band, the sense a learner meets first.
const dedupeByWord = (rows) => {
  const seen = new Set();
  return rows.filter((row) => {
    if (seen.has(row.word)) return false;
    seen.add(row.word);
    return true;
  });
};

// ── render one word ─────────────────────────────────────────────────────────

const render = async (ai, judge, entry) => {
  const messages = hintMessages(entry);
  let rejected = 'unknown';
  let last = null;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    let clue;
    try {
      clue = await ai.call(messages, {
        maxTokens: 300,
        temperature: HINT_TEMPERATURE,
        schema: HINT_SCHEMA,
      });
    } catch (error) {
      // A whole-bank render runs for hours; one dead model node must cost a word, not
      // the batch. The client already retried, so treat this as a failed attempt.
      rejected = `api: ${error.message}`;
      continue;
    }
    last = clue;

    const verdict = checkClue(entry, clue, { examples: HINT_EXAMPLES });
    if (verdict.hard.length) {
      rejected = verdict.hard.map((f) => f.code).join(', ');
      messages.push(
        { role: 'assistant', content: JSON.stringify(clue) },
        { role: 'user', content: `Rejected: ${verdict.hard.map((f) => f.detail).join('; ')}. Fix it and write a new clue.` },
      );
      continue;
    }

    let guess;
    try {
      guess = await judge(entry, clue);
    } catch (error) {
      rejected = `judge api: ${error.message}`;
      continue;
    }

    // Two ways the AI gate can fault a clue, each with its own correction so the model
    // converges instead of repeating the same mistake. Both name the exact thing that is
    // wrong — the word the learner reached for, or which of the three sentences broke —
    // because a correction the model cannot place is a correction it cannot act on.
    const broken = guess.broken.join(' and ');
    const fault = !guess.pointed
      ? `A learner given only this clue answered "${guess.named || 'nothing'}" instead of "${entry.word}". ` +
        'Make clue 1 fit the target alone and name the word they answered in clue 2'
      : guess.broken.length
        ? `${broken[0].toUpperCase()}${broken.slice(1)} ${guess.broken.length > 1 ? 'are' : 'is'} not complete, ` +
          'correct English — a word it needs is missing or out of place. Rewrite it as one natural sentence'
        : null;
    if (fault) {
      rejected = guess.pointed ? broken : `unpointed (named "${guess.named || '—'}")`;
      messages.push({ role: 'assistant', content: JSON.stringify(clue) }, { role: 'user', content: `${fault}. Write a new clue.` });
      continue;
    }

    return { clue, attempts: attempt };
  }
  return { clue: null, attempts: ATTEMPTS, rejected, last };
};

// ── output ──────────────────────────────────────────────────────────────────

// The gate accepts any run of underscores, and the model's runs vary from three to ten
// of them. The runtime only has to know one shape, so the shipped data carries one:
// exactly three underscores, one per missing word.
const gap = (text) => String(text).replace(/_{2,}/g, '___');

const writeOutput = (cache) => {
  const entries = Object.keys(cache)
    .sort()
    .map(
      (word) =>
        `  ${JSON.stringify(word)}: { nearest: ${JSON.stringify(cache[word].nearest)}, ` +
        `defs: [${cache[word].defs.map((d) => JSON.stringify(d)).join(', ')}], ` +
        `example: ${JSON.stringify(gap(cache[word].example))} },`,
    )
    .join('\n');

  writeFileSync(
    OUT_FILE,
    `// AUTO-GENERATED by scripts/generate-hints.mjs — do not edit by hand.
//
// The spoken clue for every word in the CEFR bank, rendered offline so the game
// never calls a model at runtime. Each clue cleared the lexical gate in
// scripts/hint-validators.mjs and the discrimination judge in
// scripts/lib/hint-judge.mjs before it was written.
//
// Keyed by the lowercase word. "nearest" is the near-synonym the clue contrasts
// with, so the runtime can offer it as a lifeline when the learner is stuck.
//
// Rendered with prompt ${PROMPT_ID} and gate ${GATE_ID} (sha1 of HINT_PROMPT and of the
// judge systems in scripts/lib/hint-judge.mjs). A clue here cleared both.

export interface HintClue {
  nearest: string;
  defs: [string, string];
  example: string;
}

export const HINT_CLUES: Record<string, HintClue> = {
${entries}
};
`,
    'utf8',
  );
};

// ── progress ────────────────────────────────────────────────────────────────

const mmss = (seconds) => {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  return minutes ? `${minutes}m ${String(total % 60).padStart(2, '0')}s` : `${total}s`;
};

// A whole-bank render runs for hours, and the plain counter it used to print said nothing
// about how far through it was or how long was left. The rate is measured over the run so
// far, so the estimate sharpens as the easy words give way to the stubborn ones.
const BAR_WIDTH = 24;
const progress = (done, total, startedAt) => {
  const elapsed = (Date.now() - startedAt) / 1000;
  const perWord = done ? elapsed / done : 0;
  const eta = done ? mmss(perWord * (total - done)) : '—';
  const filled = Math.round((done / total) * BAR_WIDTH);
  return `${'█'.repeat(filled)}${'░'.repeat(BAR_WIDTH - filled)} ${done}/${total} · ETA ${eta}`;
};

// Redraw the bar in place on a terminal. When the output is a pipe or a file, a carriage
// return would leave one overlong line and no history, so print a plain line per batch there
// instead — a run redirected to render.log still shows where it got to.
const isTty = process.stdout.isTTY === true;
const draw = (line) => (isTty ? process.stdout.write(`\r${line}   `) : console.log(line));

// ── main ────────────────────────────────────────────────────────────────────

const lists = readWordLists();
const targets = selectTargets(lists);
const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: accountId } = readDevVars();
const ai = createWorkersAi({ token, accountId });
const judge = createJudge({ ai, lists });

mkdirSync(dirname(CACHE_FILE), { recursive: true });
const cache = has('force') || !existsSync(CACHE_FILE) ? {} : JSON.parse(readFileSync(CACHE_FILE, 'utf8'));

const todo = targets.filter((row) => !cache[row.word]);
console.log(`${targets.length} words selected, ${targets.length - todo.length} already cached, ${todo.length} to render.`);
if (!todo.length) {
  writeOutput(cache);
  console.log(`Nothing to do. Wrote ${Object.keys(cache).length} entries to ${OUT_FILE}`);
  process.exit(0);
}

const flush = () => {
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 0), 'utf8');
  writeOutput(cache);
};
// A whole-bank render runs for hours. Losing it to a closed laptop lid would mean
// paying for every word twice.
process.on('SIGINT', () => {
  flush();
  console.log(`\nInterrupted. Cached ${Object.keys(cache).length} entries; re-run to resume.`);
  process.exit(130);
});

const holes = [];
let done = 0;
let retried = 0;
const startedAt = Date.now();
for (let i = 0; i < todo.length; i += CONCURRENCY) {
  const batch = todo.slice(i, i + CONCURRENCY);
  const results = await Promise.all(
    batch.map(async (entry) => ({ entry, ...(await render(ai, judge, entry)) })),
  );
  for (const { entry, clue, attempts, rejected, last } of results) {
    done += 1;
    if (clue) {
      cache[entry.word] = { nearest: clue.nearest, defs: clue.defs, example: clue.example };
      if (attempts > 1) retried += 1;
    } else {
      holes.push({ word: entry.word, rejected, last });
    }
  }
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 0), 'utf8');
  const stats = `${Object.keys(cache).length} ok · ${retried} retry · ${holes.length} holes`;
  draw(`${progress(done, todo.length, startedAt)} · ${stats}`);
}

if (isTty) process.stdout.write('\n');

flush();

console.log(`\n\n${Object.keys(cache).length} clues in ${OUT_FILE}`);
if (retried) console.log(`${retried} of ${done} needed more than one attempt.`);
if (holes.length) {
  // A hole is a word with no clue, and the reason alone rarely says why six attempts could
  // not satisfy it. The last rejected attempt is printed under its reason so the failure can
  // be read rather than guessed at.
  console.log(`\n${holes.length} words never cleared the gates:`);
  for (const hole of holes) {
    console.log(`  ${hole.word} — ${hole.rejected}`);
    if (hole.last) {
      console.log(`      nearest: ${JSON.stringify(hole.last.nearest ?? '—')}`);
      hole.last.defs?.forEach((d, n) => console.log(`      clue${n + 1}: ${d}`));
      if (hole.last.example) console.log(`      example: ${hole.last.example}`);
    }
  }
}
console.log(`\n${ai.report()}`);
