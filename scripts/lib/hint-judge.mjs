// scripts/lib/hint-judge.mjs
//
// The two AI-side judges the generator runs on every clue. Both are shared by
// scripts/hint-probe.mjs (which scores) and scripts/generate-hints.mjs (which ships),
// so the probe can only ever measure the gate the generator actually uses.
//
//   1. the discrimination judge — the only check that can see a *semantic* give-away.
//      "It means to let something happen" shares no letters with "allow", so no regex
//      will ever call that a leak, but a learner given it has nothing left to guess.
//      The model sees the clue and nothing else and has to name the word it describes.
//
//   2. the sentence judge — reads the two clues and the example with its gap filled, and asks
//      of each whether it is grammatical. Nothing else in the pipeline can catch a broken
//      one, and the fifty-word pilot shipped two: the clue for "be" carried "You must calm and
//      patient when you ___ with young children" and the clue for "afraid" "The little boy was
//      when he saw the big dog". No regex sees either.
//
// An earlier revision of judge 1 listed eight candidate words and asked the model to pick
// one. It passed "The baby lies quietly in bed after a long morning" as a clue for "awake":
// "asleep" is one of thirty same-band adjectives and simply did not make the draw. The list
// also carried the generation's own self-declared "nearest", so a reply naming a weak
// synonym was examined against a weak opponent. Naming blind closes both holes — the rival
// is whatever the model reaches for unprompted.
//
// Blind naming alone still left one hole: a clue that points at *nothing* passed, because
// only a named rival was a rejection. The pilot shipped "back up" with a clue about a fire
// alarm sounding again — no learner reaches "back up" from that, and the model, naming
// nothing, was not asked to. So a clue now has to let the judge reach the target. Demanding
// the exact name was the first attempt and it was wrong: it rejected "adequate" for
// "acceptable" and "beauty" for "beautiful", four good clues in five. A name the morphology
// cannot place instead goes to a meaning arbiter, and only a name that means something else
// is a fault — with a name that never comes.

import { createHash } from 'node:crypto';

import { key, tokens } from '../hint-validators.mjs';

const JUDGE_SYSTEM =
  'A learner hears one spoken clue and must guess a single English word. ' +
  'Reply with JSON only: {"word":"<the English word you guess>"}';

// Grammar only, and said so explicitly. The first version asked whether each sentence was
// "grammatical English" and the model read that as "good English": it flagged "Unlike repeat,
// the computer saves a file so that someone can use it again later" and "The special lights
// that photographers use can release a huge amount of air", both of which are perfectly
// well-formed. Judging sense instead of form turns a grammar gate into a taste gate, and a
// taste gate has no ground truth to converge on.
const SENTENCE_SYSTEM =
  'You check English sentences for grammar. Reply with JSON only: ' +
  '{"ok":[<true or false per sentence>]}, one entry for each sentence in the order given. ' +
  'Judge grammar alone: whether the sentence has every word it needs, in the right order and ' +
  'the right form. Judge each sentence on its own. Ignore whether the statement is true, ' +
  'useful or sensible, and ignore the topic. A well-formed sentence is true even when it is ' +
  'odd, vague, or says something impossible.';

// The arbiter for the awkward middle: the model named a word that is neither the target nor
// a morphological cousin of it. "adequate" for "acceptable" and "beauty" for "beautiful" are
// the clue pointing at the right idea; "envy" for "admire" is the clue pointing at the wrong
// one, and only a meaning comparison can tell those apart. No regex can, and treating every
// different name as a fault rejected four good clues out of five.
const SAME_SYSTEM =
  'You judge whether two English words mean the same thing. ' +
  'Reply with JSON only: {"same":true} when they mean the same, {"same":false} when they do not.';

// JSON Mode shapes, mirroring what each system prompt already asks for. This is the
// request side only: GATE_ID hashes the prompts above, so adding a schema cannot
// invalidate a single cached clue.
const WORD_SCHEMA = {
  type: 'object',
  properties: { word: { type: 'string' } },
  required: ['word'],
};
const SENTENCE_SCHEMA = {
  type: 'object',
  properties: { ok: { type: 'array', items: { type: 'boolean' } } },
  required: ['ok'],
};
const SAME_SCHEMA = {
  type: 'object',
  properties: { same: { type: 'boolean' } },
  required: ['same'],
};

// The three sentences the judge reads, in the order it reads them, so a false at index i can
// be reported as the part it names.
const SENTENCE_PARTS = ['clue 1', 'clue 2', 'example'];

// The generator names its cache after this id as well as the prompt id: a clue an
// earlier, weaker gate accepted is not a clue this gate accepts, and the cache must not
// be able to say otherwise.
export const GATE_ID = createHash('sha1')
  .update(JUDGE_SYSTEM + SENTENCE_SYSTEM + SAME_SYSTEM)
  .digest('hex')
  .slice(0, 10);

// The bank lists a few words separately that no learner can tell apart, so the judge
// naming one for the other is a pass, not a miss: "ad", "advert" and "advertisement"
// are all KET nouns for the same thing.
const SAME_MEANING = new Set(['ad|advert', 'ad|advertisement', 'advert|advertisement']);
const identical = (a, b) => {
  const [x, y] = [key(a), key(b)].sort();
  return x === y || SAME_MEANING.has(`${x}|${y}`);
};

// Did the judge's reply aim at the target? Two relaxations, each answering a reply the
// suite actually produced rather than a hypothetical one.
//
// key() strips inflection but not derivation, so "dominance" and "dominate" stay apart and
// the model naming the cousin reads as pointing nowhere. One more pass over the
// derivational tails puts them back in a family for this test only; the leak check keeps
// the narrower key(), where over-matching is already the deliberate bias.
const DERIVED = /(ations?|itions?|tions?|sions?|ments?|ness|ities?|ity|ances?|ences?|ancy|ency|ates?|ants?|ents?|ives?|ous|ists?|isms?|ures?|ages?|als?|ics?|ly|ers?|ors?)$/;
const bare = (value) => {
  const stripped = key(value).replace(DERIVED, '');
  return stripped.length >= 3 ? stripped : key(value);
};
const kin = (a, b) => {
  const [x, y] = [bare(a), bare(b)];
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.length >= 4 && long.startsWith(short);
};

// A multi-word target also counts when the reply names any of its parts: "be over"
// answered with "over", "ice cream" with "cream". Naming a component shows the clue
// pointed at the target, which is all this gate asks.
const pointsAt = (named, target) => {
  if (!named) return false;
  return kin(named, target) || identical(named, target) || tokens(target).some((part) => kin(named, part));
};

/**
 * @param {{ai: {call: Function}, lists: {list: Array<{word: string}>}}} deps
 * @returns {(entry: {word: string, pos: string, level: string}, clue: object) => Promise<{
 *   named: string, pointed: boolean, rival: boolean, exampleOk: boolean
 * }>}
 */
export const createJudge = ({ ai, lists }) => {
  const inBank = new Set(lists.list.map((row) => row.word));
  return async (entry, clue) => {
    const [answer, sentence] = await Promise.all([
      ai.call(
        [
          { role: 'system', content: JUDGE_SYSTEM },
          { role: 'user', content: `Clue: ${clue.defs.join(' / ')}` },
        ],
        { maxTokens: 20, temperature: 0, schema: WORD_SCHEMA },
      ),
      // Filling the gap hands the sentence judge the target, so it can never be the
      // call that names the word — the naming judge above never sees it.
      ai.call(
        [
          { role: 'system', content: SENTENCE_SYSTEM },
          {
            role: 'user',
            content: [clue.defs[0], clue.defs[1], String(clue.example ?? '').replace(/_{2,}/g, entry.word)]
              .map((line, i) => `${i + 1}. ${line}`)
              .join('\n'),
          },
        ],
        { maxTokens: 20, temperature: 0, schema: SENTENCE_SCHEMA },
      ),
    ]);

    const flags = Array.isArray(sentence?.ok) ? sentence.ok : [];
    const named = String(answer?.word ?? '')
      .trim()
      .toLowerCase();
    let pointed = pointsAt(named, entry.word);
    // Only the ambiguous case costs a third call: a name the morphology cannot place is
    // sent to the meaning arbiter, and an empty answer is a refusal, not a match.
    if (named && !pointed) {
      const verdict = await ai.call(
        [
          { role: 'system', content: SAME_SYSTEM },
          { role: 'user', content: `"${named}" and "${entry.word}"` },
        ],
        { maxTokens: 10, temperature: 0, schema: SAME_SCHEMA },
      );
      pointed = verdict?.same === true;
    }
    // Which parts broke, by name, so the retry can say "clue 2 is not a sentence" instead of
    // "one of them is not" — the same specificity that lets the unpointed fault converge.
    const broken = SENTENCE_PARTS.filter((_, i) => flags[i] === false);
    return {
      named,
      pointed,
      // Diagnostic only: a name the arbiter refused that is also a word the game asks for.
      // The worse of the two faults, because the learner's wrong answer is one the game
      // itself lists, so it reads as a fair guess.
      rival: !!named && !pointed && inBank.has(named),
      // A missing entry in the reply is not a finding: the judge saying nothing about a
      // sentence is not the judge calling it broken.
      defsOk: flags[0] !== false && flags[1] !== false,
      exampleOk: flags[2] !== false,
      broken,
    };
  };
};
