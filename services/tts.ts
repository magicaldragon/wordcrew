// Pronunciation playback through the Kokoro voice the WiseSpeak app already runs.
//
// The browser's own speech synthesiser is free and offline but robotic, and the voice
// differs on every device — on a classroom projector one machine says "journey" and
// another mumbles it. Kokoro's `af_heart` voice is the same everywhere and is what the
// rest of the product uses for teaching audio.
//
// Three tiers, because the endpoint cannot always be reached:
//
//   1. `/api/tts` — the app's own Worker, which proxies the VPS. Required in
//      production: the page is served over HTTPS and the TTS host is plain HTTP, which
//      a browser would block as mixed content.
//   2. The VPS directly — only when this page is itself `http:`/`file:` (a dev server
//      or the offline APK), where there is no mixed-content rule and no Worker in front.
//   3. The browser speech synthesiser — the old behaviour, so the speaker button never
//      goes dead.
//
// Clips are cached per phrase as blob URLs, so flipping back to a card or tapping a
// word twice is instant and costs no request.

import { speak, speechSupported, stopSpeaking } from './speech';

/** The "Heart" voice — the same id the WiseSpeak app sends. */
const HEART_VOICE = 'af_heart';
const PROXY_URL = '/api/tts';
/**
 * Only reachable from an insecure page. Kept in sync with `KOKORO_TTS_URL` in
 * wrangler.jsonc, which is what the Worker actually calls.
 */
const DIRECT_URL = 'http://160.191.89.103:8880/v1/audio/speech';

/** Enough cards to make a review pass feel instant; small enough to stay in memory. */
const MAX_CACHED_CLIPS = 60;

const clips = new Map<string, string>();
/** Phrases already being fetched, so two callers never synthesise the same word twice. */
const inFlight = new Set<string>();

let currentAudio: HTMLAudioElement | null = null;
let inflight: AbortController | null = null;
/** Bumped on every request, so a late clip never overrides a newer tap. */
let token = 0;

/** True when this device can play a clip at all — the button is hidden otherwise. */
export const playbackSupported = (): boolean =>
  typeof window !== 'undefined' && (typeof Audio !== 'undefined' || speechSupported());

export const stopPlayback = (): void => {
  token += 1;
  inflight?.abort();
  inflight = null;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  stopSpeaking();
};

/**
 * Kokoro drops the final consonant of a bare word ("busi" for "busy"); a full stop
 * makes it read the word as a word. The Worker does the same for its own upstream
 * call — this copy covers the direct tier.
 */
const asSentence = (text: string): string => (/[.!?]$/.test(text) ? text : `${text}.`);

const remember = (key: string, url: string): void => {
  clips.set(key, url);
  if (clips.size <= MAX_CACHED_CLIPS) return;
  const oldest = clips.keys().next().value;
  if (oldest === undefined) return;
  const stale = clips.get(oldest);
  clips.delete(oldest);
  if (stale) URL.revokeObjectURL(stale);
};

const fetchClip = async (phrase: string, signal?: AbortSignal): Promise<Blob> => {
  const endpoints = window.location.protocol === 'https:' ? [PROXY_URL] : [PROXY_URL, DIRECT_URL];
  let lastError: unknown = null;

  for (const endpoint of endpoints) {
    const body =
      endpoint === PROXY_URL
        ? { text: phrase, voice: HEART_VOICE }
        : { model: 'kokoro', input: asSentence(phrase), voice: HEART_VOICE, response_format: 'mp3' };
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      });
      if (!response.ok) throw new Error(`tts ${response.status}`);
      // A dev server with no Worker in front answers `/api/tts` with the app's HTML
      // shell and a 200 — treat anything that is not audio as a failed tier so the
      // next endpoint is tried and no HTML blob is ever cached as a clip.
      const type = response.headers.get('content-type') ?? '';
      if (!type.startsWith('audio/')) throw new Error(`tts content-type ${type}`);
      const clip = await response.blob();
      if (!clip.size) throw new Error('tts empty clip');
      return clip;
    } catch (error) {
      lastError = error;
      // Only a cancelled playback stops the ladder — a warm-up has no signal and must
      // still fall through to the next endpoint.
      if (signal?.aborted) break;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('tts unavailable');
};

/**
 * Says one word or phrase. Never rejects: if the voice service is unreachable the
 * browser speech synthesiser takes over, which is exactly what the app did before.
 */
export const speakWord = async (text: string, options?: { rate?: number }): Promise<void> => {
  const phrase = text.trim();
  if (!phrase) return;

  stopPlayback();
  const mine = ++token;
  const key = phrase.toLowerCase();
  const controller = new AbortController();
  inflight = controller;

  try {
    let url = clips.get(key);
    if (!url) {
      const clip = await fetchClip(phrase, controller.signal);
      if (mine !== token) return;
      url = URL.createObjectURL(clip);
      remember(key, url);
    }
    if (mine !== token) return;

    const audio = new Audio(url);
    audio.playbackRate = options?.rate ?? 1;
    currentAudio = audio;
    await audio.play();
  } catch {
    if (mine !== token) return;
    speak(phrase, options);
  } finally {
    if (inflight === controller) inflight = null;
  }
};

const warmOne = async (phrase: string): Promise<void> => {
  const key = phrase.toLowerCase();
  if (clips.has(key) || inFlight.has(key)) return;
  inFlight.add(key);
  try {
    const clip = await fetchClip(phrase);
    if (!clips.has(key)) remember(key, URL.createObjectURL(clip));
  } catch {
    // Silent: a warm-up that fails only means the speaker button pays the latency.
  } finally {
    inFlight.delete(key);
  }
};

/**
 * A cold word costs the VPS a second or two (the "AI is warming up" wait). The review
 * screen knows the whole order in advance, so it hands the first few cards here while
 * the reader is still on card one — by the time a speaker is tapped the clip is a
 * local blob. Two at a time keeps the single VPS responsive; every request lands in
 * the Worker cache, so a deck is paid for once, not once per student.
 */
export const warmWords = (words: string[], concurrency = 2): void => {
  const seen = new Set<string>();
  const queue: string[] = [];

  for (const word of words) {
    const phrase = word.trim();
    if (!phrase) continue;
    const key = phrase.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    queue.push(phrase);
  }

  const workers = Math.min(concurrency, queue.length);
  for (let worker = 0; worker < workers; worker += 1) {
    void (async () => {
      for (let phrase = queue.shift(); phrase; phrase = queue.shift()) {
        await warmOne(phrase);
      }
    })();
  }
};
