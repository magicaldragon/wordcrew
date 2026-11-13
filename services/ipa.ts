// IPA for the flashcard's pronunciation line.
//
// A learner who only sees "journey" cannot tell where the stress falls, and a speaker
// button alone does not survive a quiet classroom. IPA answers both questions at a
// glance — so each card prints it under the word.
//
// The transcription is derived, not shipped: the app already carries the CMU
// pronouncing dictionary for a different job (grading spoken answers by sound), and
// its ARPAbet phones convert to IPA with a fixed table. Reusing that dictionary means
// no new data file and no network round-trip, and the chunk is the one the voice
// answers already load — see the `pronunciations` split in vite.config.ts.

type PhoneMap = Record<string, string>;

/** ARPAbet phone → IPA symbol (General American). */
const PHONE_IPA: Record<string, string> = {
  AA: 'ɑ',
  AE: 'æ',
  AH: 'ʌ',
  AO: 'ɔ',
  AW: 'aʊ',
  AY: 'aɪ',
  B: 'b',
  CH: 'tʃ',
  D: 'd',
  DH: 'ð',
  EH: 'ɛ',
  ER: 'ɝ',
  EY: 'eɪ',
  F: 'f',
  G: 'ɡ',
  HH: 'h',
  IH: 'ɪ',
  IY: 'i',
  JH: 'dʒ',
  K: 'k',
  L: 'l',
  M: 'm',
  N: 'n',
  NG: 'ŋ',
  OW: 'oʊ',
  OY: 'ɔɪ',
  P: 'p',
  R: 'r',
  S: 's',
  SH: 'ʃ',
  T: 't',
  TH: 'θ',
  UH: 'ʊ',
  UW: 'u',
  V: 'v',
  W: 'w',
  Y: 'j',
  Z: 'z',
  ZH: 'ʒ',
};

const VOWELS = new Set([
  'AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW',
]);

let dictionary: PhoneMap | null = null;
let loading: Promise<void> | null = null;

/** Loads the ARPAbet dictionary once per session; later calls reuse the promise. */
export const loadPronouncingDictionary = (): Promise<void> => {
  if (dictionary) return Promise.resolve();
  if (!loading) {
    loading = import('cmu-pronouncing-dictionary')
      .then((mod) => {
        dictionary = mod.dictionary as PhoneMap;
      })
      .catch(() => {
        // Offline and not yet cached: the card simply shows no IPA line.
      });
  }
  return loading;
};

interface Phone {
  ipa: string;
  vowel: boolean;
  /** 1 = primary, 2 = secondary, 0 = unstressed, -1 = consonant. */
  stress: number;
}

const toPhones = (arpabet: string[]): Phone[] =>
  arpabet.map((raw) => {
    const stress = raw.match(/\d/);
    const base = raw.replace(/\d/g, '');
    const vowel = VOWELS.has(base);
    let ipa = PHONE_IPA[base] ?? base.toLowerCase();
    // Reduced vowels: a dictionary writes AH0/ER0, a reader expects the schwa.
    if (base === 'AH' && stress?.[0] === '0') ipa = 'ə';
    if (base === 'ER' && stress?.[0] === '0') ipa = 'ɚ';
    return { ipa, vowel, stress: stress ? Number(stress[0]) : -1 };
  });

/**
 * Places the stress mark at the *syllable* onset, not on the vowel: walking back over
 * the consonants in front of the stressed vowel turns "dʒɝˈni" into "ˈdʒɝni".
 */
const markStress = (phones: Phone[]): string => {
  for (let index = 0; index < phones.length; index += 1) {
    const phone = phones[index];
    if (!phone.vowel || (phone.stress !== 1 && phone.stress !== 2)) continue;
    let onset = index;
    while (onset > 0 && !phones[onset - 1].vowel) onset -= 1;
    phones[onset].ipa = (phone.stress === 1 ? 'ˈ' : 'ˌ') + phones[onset].ipa;
  }
  return phones.map((phone) => phone.ipa).join('');
};

/**
 * IPA for a single word, without slashes — or null while the dictionary is still
 * loading, or for a word it does not carry (names, slang, invented words).
 */
export const ipaOf = (word: string): string | null => {
  if (!dictionary) return null;
  const key = word.trim().toLowerCase();
  if (!key) return null;
  const raw = dictionary[key];
  if (!raw) return null;
  return markStress(toPhones(raw.split(' ')));
};
