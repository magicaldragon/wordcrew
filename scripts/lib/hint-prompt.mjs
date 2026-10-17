// scripts/lib/hint-prompt.mjs
//
// The clue-writing prompt, in one place. scripts/hint-probe.mjs scores it and
// scripts/generate-hints.mjs ships it. Kept shared because a probe measuring a
// prompt the generator does not use is worse than no probe at all.
//
// The prompt is v4.2 of the tuning series, locked on numbers rather than taste.
// Over three scored runs against the nine-word regression suite, v4.1 never leaked a
// target semantically while the v4 control leaked in two of the three. Everything else
// the gate caught on it (a "___" gap smuggled into a clue) is mechanical, and the gate
// rejects and regenerates, so the prompt does not have to be perfect.
//
// v4.2 adds the two rules the fifty-word pilot asked for. Naming the clues blind — no
// candidate list — showed a clue can survive every lexical check and still fit a
// different word ("air" described as the thin layer the plane flies through is
// "atmosphere"); hence the self-test rule. And several clues held one meaning of the
// target while "nearest" was borrowed from another ("admit" answered as "confess"
// while the clue described letting someone in); hence the one-meaning rule.
//
// Tuning history, each rule a response to a specific shipped defect:
//   * contrast with a declared "nearest" — the model must name the word it is
//     distinguishing from, which stops it describing a whole word family and hands
//     the gate a hard negative to test with;
//   * few-shot lines come from words in no CEFR pack. v4 used "attic"/"basement"
//     and the model copied the sentence onto "basement", a real target;
//   * the target ban is per word and applies to both clues and the example. "Never
//     write the target" was read as advice about single words, so "be over" was
//     answered with "a meeting that is over";
//   * the ___ gap belongs to the example only — clues are read aloud.

export const HINT_JSON_SHAPE = `Reply with JSON only:
{"nearest":"<the one English word closest in meaning to the target>","defs":["<clue 1>","<clue 2>"],"example":"<sentence with ___ for the word>"}`;

/**
 * JSON Mode copy of the shape above. The prompt still spells it out — the model reads
 * the example that way — but the schema is what the runtime enforces, so a reply that
 * misses the shape is rejected before it can cost a parse-and-retry round trip.
 */
export const HINT_SCHEMA = {
  type: 'object',
  properties: {
    nearest: { type: 'string' },
    defs: { type: 'array', items: { type: 'string' } },
    example: { type: 'string' },
  },
  required: ['nearest', 'defs', 'example'],
};

// Every line here is checked by the copy detector in hint-validators.mjs, so they
// are kept verbatim in sync with what the prompt shows.
export const HINT_EXAMPLES = [
  'You push soft cooked fruit through this in the kitchen to catch the juice below',
  'Unlike a colander, this one has a fine mesh, so only liquid slips through it',
  'You move along the pavement slowly, with no hurry and no clear destination',
  'Unlike a stroll, this one has a lazy daydreaming rhythm, and you may stop for no reason',
];

// Warm enough that 2,842 clues do not read as one template, cool enough that the
// gate rarely has to reject.
export const HINT_TEMPERATURE = 0.4;

export const HINT_PROMPT = `You write the spoken clue a vocabulary game gives a learner who must guess an English word.
${HINT_JSON_SHAPE}

Two clues that meet the standard:
Target "sieve" (noun) ->
{"nearest":"colander","defs":["You push soft cooked fruit through this in the kitchen to catch the juice below","Unlike a colander, this one has a fine mesh, so only liquid slips through it"],"example":"She pushed the berries through a ___ to take out the pips."}
Target "saunter" (verb) ->
{"nearest":"stroll","defs":["You move along the pavement slowly, with no hurry and no clear destination","Unlike a stroll, this one has a lazy daydreaming rhythm, and you may stop for no reason"],"example":"He ___ed past the shop windows with his hands in his pockets."}

Rules:
- "nearest" is required: one real English word, never the target, never a word built from it.
- The learner must be able to rule "nearest" out. That is the entire job of clue 1.
- clue 1: a concrete situation - who does what, where, at which moment. One detail in it
  must fit only the target.
- Test clue 1 before answering: could a learner answer a different everyday word just as
  well? If so it is too vague, so name the moment, object or action that fits no other word.
- Write for one meaning of the target only. Most targets carry several, so keep the meaning
  a learner meets first and hold it in all three parts. "nearest" must compete with that
  same meaning, never a word borrowed from a different meaning of the target.
- clue 2: contrast with "nearest", as a full sentence with a subject and a verb, in the
  shape "Unlike X, this ... <verb> ...".
- clue 1 must not contain "nearest" or a word built from it. Name it in clue 2 only.
- Never write the target anywhere - not in clue 1, not in clue 2, not in the example - and
  never a word built from its root. When the target is more than one word, each of those
  words is banned on its own as well: for "be over" never write "over", for "ice cream"
  never write "cream". Rephrase around it even if the sentence feels less natural.
- Dictionary voice is banned: no "it means", "it is a", "it is not", "it refers to".
- Only "example" carries the ___ gap. Both clues are read aloud word for word, so they
  must be plain sentences with no blanks and no placeholder marks.
- Do not lean on "this" or "do this" as the subject of a whole clue.
- Each clue is one complete sentence, 6-18 words. No fragments, no trailing lists.
- Only everyday words a beginner knows. Do not mention syllables or part of speech.`;

export const hintMessages = (entry) => [
  { role: 'system', content: HINT_PROMPT },
  { role: 'user', content: `Target word: "${entry.word}" (${entry.pos}). Write the clue.` },
];
