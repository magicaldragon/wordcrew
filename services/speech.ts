// Pronunciation playback.
//
// "Listen" is the cheapest learning feature the app can offer: a revealed answer is
// only worth something if the learner also hears how it sounds. The browser's speech
// synthesiser does that for free and offline — no audio files to ship, no API quota —
// so every revealed word gets a speaker button instead of a downloaded clip.
//
// Voices load asynchronously in most browsers (an empty list on the first call, then a
// `voiceschanged` event). The list is cached, and the first English voice is used until
// a better match shows up, so the button works from the very first tap.

const PREFERRED_VOICES = [
  'Google US English',
  'Google UK English Female',
  'Samantha',
  'Microsoft Aria Online (Natural) - English (United States)',
  'Microsoft Zira - English (United States)',
];

let cachedVoices: SpeechSynthesisVoice[] = [];

/** True when this browser can speak at all. */
export const speechSupported = (): boolean =>
  typeof window !== 'undefined' &&
  'speechSynthesis' in window &&
  typeof window.SpeechSynthesisUtterance !== 'undefined';

const readVoices = (): SpeechSynthesisVoice[] => {
  if (!speechSupported()) return [];
  try {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) cachedVoices = voices;
  } catch {
    /* Some browsers throw before the engine is ready — keep the previous cache. */
  }
  return cachedVoices;
};

if (speechSupported()) {
  // Fire-and-forget: the list is a cache, the button does not wait for it.
  window.speechSynthesis.onvoiceschanged = () => {
    readVoices();
  };
}

const pickVoice = (): SpeechSynthesisVoice | null => {
  const english = readVoices().filter((voice) => voice.lang?.toLowerCase().startsWith('en'));
  if (english.length === 0) return null;
  for (const name of PREFERRED_VOICES) {
    const match = english.find((voice) => voice.name === name);
    if (match) return match;
  }
  return english.find((voice) => voice.lang.toLowerCase().startsWith('en-us')) ?? english[0];
};

/**
 * Says `text` out loud. Any line already playing is cut off first — a learner tapping
 * through a review list expects the newest word, not a queue.
 */
export const speak = (text: string, options?: { rate?: number }): void => {
  const phrase = text.trim();
  if (!speechSupported() || !phrase) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(phrase);
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || 'en-US';
    // A touch under natural speed: these are learners listening for the shape of a word.
    utterance.rate = options?.rate ?? 0.9;
    utterance.pitch = 1;
    synth.speak(utterance);
  } catch {
    /* Speaking is a bonus — never let it break the screen it lives on. */
  }
};

/** Stops anything currently being spoken (used when a screen unmounts). */
export const stopSpeaking = (): void => {
  if (!speechSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* Nothing was speaking. */
  }
};
