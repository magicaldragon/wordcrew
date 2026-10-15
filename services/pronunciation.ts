// Phoneme-aware comparison for spoken answers.
//
// A speech engine hands back *spelling*, not sound. A learner who says "wear" is
// routinely transcribed as "where", and an accented vowel comes back as a different
// word altogether — judged by spelling those look wrong even though the English was
// right. So voice answers are judged by sound instead: the CMU Pronouncing Dictionary
// gives every word an ARPAbet phone sequence, and true homophones ("wear"/"where",
// "sea"/"see", "flour"/"flower") collapse to the *same* sequence and match for free.
//
// The dictionary is ~4.7 MB, so it is loaded lazily on the first voice answer and
// cached for the rest of the session; the typed-only flow never pays for it.

type PhoneMap = Record<string, string>;

let dictPromise: Promise<PhoneMap> | null = null;

/** Loads the pronunciation dictionary once; later calls reuse the same promise. */
export const loadPronunciations = (): Promise<PhoneMap> => {
  if (!dictPromise) {
    dictPromise = import('cmu-pronouncing-dictionary').then((mod) => mod.dictionary as PhoneMap);
  }
  return dictPromise;
};

const STRESS = /[0-9]/g;
const NON_LETTERS = /[^a-z]+/g;

/** ARPAbet phones for one word, stress marks stripped; null when the word is unknown. */
export const phonesOf = (dict: PhoneMap, word: string): string[] | null => {
  const raw = dict[word.toLowerCase()];
  if (!raw) return null;
  return raw.split(' ').map((phone) => phone.replace(STRESS, ''));
};

/** Levenshtein distance over two phone sequences (edit distance in sounds, not letters). */
const phoneDistance = (a: string[], b: string[]): number => {
  const n = a.length;
  const m = b.length;
  if (n === 0) return m;
  if (m === 0) return n;
  let prev = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= n; i += 1) {
    const curr = new Array<number>(m + 1);
    curr[0] = i;
    for (let j = 1; j <= m; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[m];
};

/**
 * How many phones may differ and still count as the same word. Short words get no
 * slack — so "three"/"tree" is still caught as the real error it is — while longer
 * words tolerate a small accent slip, which is what "the app is too strict" was
 * really about.
 */
const toleranceFor = (phones: number): number => (phones <= 3 ? 0 : phones <= 5 ? 1 : 2);

/** True when two words sound the same (homophones) or close enough (small accent slip). */
export const phonesMatch = (dict: PhoneMap, heard: string, target: string): boolean => {
  if (heard === target) return true;
  const heardPhones = phonesOf(dict, heard);
  const targetPhones = phonesOf(dict, target);
  if (!heardPhones || !targetPhones) return false;
  return phoneDistance(heardPhones, targetPhones) <= toleranceFor(targetPhones.length);
};

const tokens = (value: string): string[] =>
  value
    .toLowerCase()
    .replace(NON_LETTERS, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

/**
 * Sound-based match of a spoken transcript against the target word: every word of a
 * multi-word target must be heard somewhere in the transcript, and extra words the
 * engine added ("it's a …") are ignored.
 */
export const checkSpokenPhonemes = (dict: PhoneMap, transcript: string, target: string): boolean => {
  const heard = tokens(transcript);
  const wanted = tokens(target);
  if (!wanted.length || !heard.length) return false;
  return wanted.every((want) => heard.some((say) => phonesMatch(dict, say, want)));
};
