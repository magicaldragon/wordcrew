// scripts/hint-probe.mjs
//
// Scores candidate prompts against the quality gate, instead of judging clues by
// eye. Two halves, because they catch different faults:
//
//   1. scripts/hint-validators.mjs — deterministic, offline. Leaks, dictionary
//      voice, wrong shape, prompt echo.
//   2. the AI gate in lib/hint-judge.mjs — the only checks that see *semantic* faults.
//      The model is shown the clue alone and has to name the word it describes; a name the
//      morphology cannot place goes to a meaning arbiter, so "adequate" for "acceptable" is
//      a pass while "envy" for "admire" is the clue pointing at the wrong word. A third
//      question fills the example's gap and asks whether the result is grammatical English,
//      the one fault no regex catches. The gate lives in the lib so this file only ever
//      measures what the generator will use.
//
// Usage:
//   node scripts/hint-probe.mjs                 both candidates, full scoreboard
//   node scripts/hint-probe.mjs --only=locked   just the shipped prompt
//   node scripts/hint-probe.mjs --quiet         scoreboard only, no clue text
//
// Costs roughly 900 neurons (~$0.01) for the full run: two gates per clue, not one.

import { readDevVars, createWorkersAi } from './lib/workers-ai.mjs';
import { HINT_PROMPT, HINT_EXAMPLES, HINT_SCHEMA, HINT_TEMPERATURE } from './lib/hint-prompt.mjs';
import { createJudge } from './lib/hint-judge.mjs';
import { checkClue, readWordLists, tokens } from './hint-validators.mjs';

const CONCURRENCY = 6;
const JSON_SHAPE = `Reply with JSON only:
{"nearest":"<the one English word closest in meaning to the target>","defs":["<clue 1>","<clue 2>"],"example":"<sentence with ___ for the word>"}`;

// ── the control: the prompt whose output exposed the multi-word leak ─────────
const V4_EXAMPLES = [
  'A family climbs up into this dusty space to store old boxes above the bedrooms',
  'Unlike the basement, this space sits above the top floor, right under the roof',
];

const v4 = `You write the spoken clue a vocabulary game gives a learner who must guess an English word.
${JSON_SHAPE}

Two clues that meet the standard:
Target "attic" (noun) ->
{"nearest":"basement","defs":["A family climbs up into this dusty space to store old boxes above the bedrooms","Unlike the basement, this space sits above the top floor, right under the roof"],"example":"Grandma kept her photo albums in the ___."}
Target "watch" (verb) ->
{"nearest":"see","defs":["You sit still and give your full attention to a film from the first minute to the last","Unlike seeing, this takes time and is something you choose to start and keep doing"],"example":"We will ___ a movie together after dinner."}

Rules:
- "nearest" is required, must be one real English word, and must not be the target.
- def 1: a concrete situation - name the moment, the place, or who is doing it. It must
  hold one detail that fits only the target, not a whole family of words.
- def 2: contrast with "nearest", written as a FULL sentence with a subject and a verb,
  in the shape "Unlike X, this ... <verb> ...".
- Never write the target word, nor any word built from its root.
- Never let a synonym or near-synonym carry the clue: if one word already gives the
  answer away, the learner has nothing left to guess. Ban "it means", "it is a", "it is not".
- Do not let "this" or "do this" be the whole clue: the situation itself must point at
  the target.
- Each definition is one complete sentence of 12-18 words. No fragments.
- Only everyday words a beginner knows. Do not mention syllables or part of speech.`;

// ── the candidates ──────────────────────────────────────────────────────────
// The control is the v4 prompt that exposed the multi-word leak, kept here to
// prove the gate still catches it. The candidate is the shipped prompt itself,
// imported so this file can only ever measure what the generator will use.
const CANDIDATES = [
  { id: 'v4', system: v4, examples: [...V4_EXAMPLES], temperature: 0.4 },
  { id: 'locked', system: HINT_PROMPT, examples: [...HINT_EXAMPLES], temperature: HINT_TEMPERATURE },
];

// ── sample ──────────────────────────────────────────────────────────────────
// Nine words, chosen because each one already broke a previous prompt. The
// sample is the regression suite: pos and level are resolved from the word lists
// so a typo here fails loudly instead of silently scoring the wrong band.
const SAMPLE = [
  { word: 'be over', why: 'two-word target; v4 wrote "will be over" into its own clue' },
  { word: 'look after', why: 'two-word target with confusable siblings (look for, look up)' },
  { word: 'ice cream', why: 'compound noun; both halves are ordinary words' },
  { word: 'breakfast', why: 'confusable with lunch and dinner' },
  { word: 'watch', why: 'noun whose form is also a common verb' },
  { word: 'basement', why: 'the word v4 copied the few-shot sentence onto' },
  { word: 'advice', why: 'abstract and uncountable' },
  { word: 'dominate', why: 'abstract verb; v4 invented a football scene for it' },
  { word: 'competitive', why: 'v4 declared "nearest: strong" and fell back to dictionary voice' },
];

const resolve = (lists) => {
  const byWord = new Map(lists.list.map((w) => [w.word, w]));
  return SAMPLE.map((sample) => {
    const found = byWord.get(sample.word);
    if (!found) throw new Error(`sample word is not in any CEFR pack: "${sample.word}"`);
    return { ...found, why: sample.why };
  });
};

// ── run ─────────────────────────────────────────────────────────────────────

const generate = (ai, candidate, entry) =>
  ai.call(
    [
      { role: 'system', content: candidate.system },
      { role: 'user', content: `Target word: "${entry.word}" (${entry.pos}). Write the clue.` },
    ],
    { maxTokens: 300, temperature: candidate.temperature, schema: HINT_SCHEMA },
  );

const runCandidate = async (ai, judge, candidate, entries, quiet) => {
  console.log(`\n${'='.repeat(78)}\n${candidate.id}\n${'='.repeat(78)}`);
  const rows = [];
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const slice = entries.slice(i, i + CONCURRENCY);
    const done = await Promise.all(
      slice.map(async (entry) => {
        try {
          const clue = await generate(ai, candidate, entry);
          const verdict = checkClue(entry, clue, { examples: candidate.examples });
          const guess = await judge(entry, clue);
          return { entry, clue, verdict, guess, error: null };
        } catch (error) {
          return { entry, error: error.message };
        }
      }),
    );
    rows.push(...done);
  }

  for (const row of rows) {
    const { entry } = row;
    if (row.error) {
      console.log(`\n${entry.word} (${entry.pos}, ${entry.level}) — ERROR ${row.error}`);
      continue;
    }
    const { clue, verdict, guess } = row;
    const flags = [...verdict.hard.map((f) => `!! ${f.code}`), ...verdict.warn.map((f) => `~ ${f.code}`)];
    if (!quiet) {
      console.log(`\n${entry.word} (${entry.pos}, ${entry.level})  nearest: "${clue.nearest ?? '—'}"`);
      clue.defs.forEach((d, n) => console.log(`   clue${n + 1}: ${d}`));
      console.log(`   example: ${clue.example}`);
    }
    const gate = guess.pointed
      ? 'ok'
      : guess.rival
        ? `a rival in the bank ("${guess.named}")`
        : `the model answered "${guess.named || 'nothing'}"`;
    console.log(
      `   ${entry.word.padEnd(14)} ${verdict.hard.length ? 'HARD' : 'ok  '} ` +
        `disc ${guess.pointed ? '✅' : '❌'} named "${guess.named}" (${gate})` +
        `${guess.defsOk ? '' : ' · clue UNGRAMMATICAL'}` +
        `${guess.exampleOk ? '' : ' · example UNGRAMMATICAL'}` +
        `${flags.length ? `  [${flags.join(' | ')}]` : ''}`,
    );
    for (const finding of verdict.hard) console.log(`      !! ${finding.code}: ${finding.detail}`);
    for (const finding of verdict.warn) console.log(`      ~  ${finding.code}: ${finding.detail}`);
  }

  const scored = rows.filter((r) => !r.error);
  const summary = {
    id: candidate.id,
    words: entries.length,
    hard: scored.filter((r) => r.verdict.hard.length).length,
    warn: scored.filter((r) => r.verdict.warn.length).length,
    disc: scored.filter((r) => r.guess.pointed).length,
    // One count for both sentence faults — a clue that is not a sentence and an example that
    // is not one once the gap is filled are the same failure from the learner's seat.
    grammar: scored.filter((r) => !r.guess.defsOk || !r.guess.exampleOk).length,
    errors: rows.length - scored.length,
    meanTokens: tokens(scored.flatMap((r) => r.clue.defs).join(' ')).length / (scored.length * 2),
  };
  console.log(
    `\n${candidate.id}: hard ${summary.hard}/${summary.words} · weak ${summary.warn}/${summary.words} · ` +
      `discrimination ${summary.disc}/${summary.words} · bad grammar ${summary.grammar}/${summary.words} · ` +
      `mean clue ${summary.meanTokens.toFixed(1)} words`,
  );
  return summary;
};

// ── main ────────────────────────────────────────────────────────────────────

const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
const quiet = process.argv.includes('--quiet');
const candidates = only ? CANDIDATES.filter((c) => c.id === only) : CANDIDATES;
if (!candidates.length) throw new Error(`no candidate matches --only=${only} (have: ${CANDIDATES.map((c) => c.id).join(', ')})`);

const lists = readWordLists();
const entries = resolve(lists);
const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: accountId } = readDevVars();
const ai = createWorkersAi({ token, accountId, log: (m) => console.warn(m) });

console.log(`scoring ${entries.length} words x ${candidates.length} candidate prompt(s)`);
const judge = createJudge({ ai, lists });
const summaries = [];
for (const candidate of candidates) {
  summaries.push(await runCandidate(ai, judge, candidate, entries, quiet));
}

if (summaries.length > 1) {
  console.log(`\n${'='.repeat(78)}\nscoreboard\n${'='.repeat(78)}`);
  const pad = (s) => String(s).padEnd(16);
  console.log(`${pad('')}${summaries.map((s) => pad(s.id)).join('')}`);
  console.log(`${pad('hard failures')}${summaries.map((s) => pad(`${s.hard}/${s.words}`)).join('')}`);
  console.log(`${pad('weak clues')}${summaries.map((s) => pad(`${s.warn}/${s.words}`)).join('')}`);
  console.log(`${pad('discrimination')}${summaries.map((s) => pad(`${s.disc}/${s.words}`)).join('')}`);
  console.log(`${pad('bad grammar')}${summaries.map((s) => pad(`${s.grammar}/${s.words}`)).join('')}`);
  console.log(`${pad('mean clue words')}${summaries.map((s) => pad(s.meanTokens.toFixed(1))).join('')}`);
}

console.log(`\n${ai.report()}`);
