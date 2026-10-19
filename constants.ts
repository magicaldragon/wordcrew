

import { CustomSoundFile, GameMode } from './types';
import { CEFRLevel } from './cefrWordLists';

export const DEFAULT_TOTAL_TIME_LIMIT = 180; // seconds (e.g., 3 minutes)
export const MIN_TOTAL_TIME_LIMIT = 60;    // seconds (e.g., 1 minute)
export const MAX_TOTAL_TIME_LIMIT = 600;   // seconds (e.g., 10 minutes)

// Combo Streak Feature Constants
export const COMBO_ACTIVATION_THRESHOLD = 3; // Min streak to activate combo point bonus
export const COMBO_POINT_BONUS = 50;         // Extra points awarded per word when combo is active
export const COMBO_TIME_BONUS_THRESHOLD = 5; // Streak needed to get a time bonus
export const COMBO_TIME_BONUS_SECONDS = 5;   // Seconds added to timer for time bonus
export const MAX_COMBO_TIME_BONUS_APPLICATIONS = 1; // How many times the time bonus can be applied per game

// Word Power Boosts (Power-Ups) Constants
export const POWERUP_TIME_FREEZE_SECONDS = 5;   // Seconds added by Time Freeze power-up
export const RUSH_HOUR_DURATION_SECONDS = 30; // Duration of Rush Hour mode

// The closing stretch of a round: the clock turns red and the "Hurry up!" announcer
// callout fires once.
export const FINAL_COUNTDOWN_SECONDS = 10;

// Hell Mode Constants
export const HELL_MODE_INITIAL_SKIPS = 3;
export const HELL_MODE_SKIP_PENALTY = 200;
export const HELL_MODE_LUCKY_SKIP_PENALTY = 500;


// Default Sounds - self-hosted in /public/audio so the app works fully offline.
// Relative paths resolve against the document URL, so they also work from file:// in the APK.
export const AUDIO_BASE = './audio/';

// ** 1. SETUP SCREEN MUSIC (Previously Background Music) **
// Array of URLs for setup screen music. One will be chosen randomly.
export const BACKGROUND_MUSIC_URL = [
  AUDIO_BASE + 'setup-music-1.m4a',
  AUDIO_BASE + 'setup-music-2.m4a',
  AUDIO_BASE + 'setup-music-3.m4a',
];

// ** 2. GAME PLAY MUSIC **
// Array of URLs for game play music. One will be chosen randomly.
export const GAME_MUSIC_URL = [
  AUDIO_BASE + 'game-music-1.m4a',
  AUDIO_BASE + 'game-music-2.m4a',
  AUDIO_BASE + 'game-music-3.m4a',
];

export const DEFAULT_MUSIC_VOLUME = 0.5; // 50%
export const DEFAULT_EFFECTS_VOLUME = 0.7; // 70% for sound effects

// Access code that unlocks the full (non-demo) experience on a device — handy for
// using the full game on a classroom machine without installing anything.
// The code itself lives as a Worker secret and is checked server-side (see
// `/api/access-code/verify`), so it never ships inside the JS bundle.
export const UNLOCK_STORAGE_KEY = 'wordcrew_unlocked';
// What the licence unlocks. Shared by the buy dialog and the code-entry dialog so
// both always quote the same offer.
export const FULL_VERSION_PERKS = [
  '💀 Hell Mode — brutal skips & double Rush Hour',
  '📚 4 extra word packs (A2 · A2 Key · B1 · B2)',
  '⏱️ Up to 60 words & 10 minutes per game',
  '🎵 Custom sounds — upload your own music & SFX',
] as const;
// How many demo rounds this device has played. Drives the escalating pitch on the
// results screen (a returning player gets a firmer nudge than a first-timer).
export const DEMO_ROUNDS_STORAGE_KEY = 'wordcrew_demo_rounds';

export const readUnlockFlag = (): boolean => {
  try {
    return localStorage.getItem(UNLOCK_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

export const writeUnlockFlag = (): void => {
  try {
    localStorage.setItem(UNLOCK_STORAGE_KEY, '1');
  } catch {
    /* Storage unavailable: the unlock simply lasts for this session. */
  }
};

export const readDemoRounds = (): number => {
  try {
    const raw = localStorage.getItem(DEMO_ROUNDS_STORAGE_KEY);
    const parsed = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
};

export const incrementDemoRounds = (): number => {
  const next = readDemoRounds() + 1;
  try {
    localStorage.setItem(DEMO_ROUNDS_STORAGE_KEY, String(next));
  } catch {
    /* Storage unavailable: the nudge simply stays at its first-time intensity. */
  }
  return next;
};

// Limits of the free demo. Anything outside this is unlocked by a valid access code.
// The demo is meant to showcase the real classroom loop (Normal + Team modes with
// all power-ups, Rush Hour, combos and results) while withholding the content that
// is worth paying for (Hell Mode, extra word packs, longer games, power-user settings).
export const DEMO_POLICY = {
  freeModes: [GameMode.NORMAL, GameMode.TEAM] as GameMode[],
  freePresets: [CEFRLevel.STARTERS, CEFRLevel.MOVERS] as CEFRLevel[],
  freeWordCounts: [5, 10, 20] as number[],
  maxWordsPerGame: 20,      // full version goes up to 60
  maxTotalTimeLimit: 180,   // full version goes up to 600 seconds
} as const;

// ** 3. CORRECT GUESS SOUNDS **
// This is an array of URLs. Add more URLs for multiple random correct sounds.
export const CORRECT_SOUNDS = [
  AUDIO_BASE + 'correct-sound.wav',
];

// ** 4. SKIP WORD SOUNDS **
// This is an array of URLs, similar to CORRECT_SOUNDS.
export const SKIP_SOUNDS = [
  AUDIO_BASE + 'skip-sound.wav',
];

// ** 5. OTHER SINGLE SOUND EFFECTS **
// This is an object where each key has a URL to a specific sound effect.
export const SINGLE_SOUND_EFFECTS = {
  // ** 5a. TIME'S UP SOUND **
  TIMES_UP_WORD: AUDIO_BASE + 'times-up.wav',
  
  // ** 5b. GAME OVER SOUND (for when the game ends, typically a win/completion) **
  GAME_OVER: AUDIO_BASE + 'result.wav',
  
  // ** 5c. START GAME SOUND (for the button in setup screen) **
  START_GAME_SOUND: AUDIO_BASE + 'start.wav',
  
  // ** 5d. PLAY AGAIN SOUND (for the button in results screen) **
  PLAY_AGAIN_SOUND: AUDIO_BASE + 'try-again.wav',
  
  // COUNTDOWN_TICK remains null. Provide via custom upload or new URL if needed.
  COUNTDOWN_TICK: null as string | null, 
  
  // ** 5e. COUNTDOWN GO SOUND (for the "GO!" in the countdown) **
  COUNTDOWN_GO: AUDIO_BASE + 'countdown-go.mp3',

  // ** 5f. POWER-UP RELATED SOUNDS **
  POWERUP_COLLECTED: (AUDIO_BASE + 'powerup-collected.mp3') as string | null, 
  POWERUP_TIME_FREEZE: (AUDIO_BASE + 'time-freeze.mp3') as string | null, 
  POWERUP_SKIP_FREEBIE_USED: (AUDIO_BASE + 'skip-freebie-used.mp3') as string | null, 
  RUSH_HOUR_ACTIVATED: (AUDIO_BASE + 'points-doubler.mp3') as string | null,
  RUSH_HOUR_MUSIC_LOOP: [
    AUDIO_BASE + 'rush-hour-1.m4a',
    AUDIO_BASE + 'rush-hour-2.m4a',
    AUDIO_BASE + 'rush-hour-3.m4a',
  ] as string[], // Type refined to string[] as it's always initialized with an array
};

// ** 6. ANNOUNCER CALLOUTS **
// Pre-rendered voice lines shipped in /public/audio (same self-hosted, offline-first
// approach as the music tracks). They fire the instant a milestone lands — no network
// round-trip, no AI fetch at runtime. The lines are Deepgram Aura renders, produced
// offline by scripts/generate-announcer.mjs. Milestones are deliberately sparse so a
// callout stays a reward rather than constant chatter.
export const ANNOUNCER_CALLOUTS = {
  COMBO: AUDIO_BASE + 'announcer-combo.wav',
  ON_FIRE: AUDIO_BASE + 'announcer-on-fire.wav',
  UNSTOPPABLE: AUDIO_BASE + 'announcer-unstoppable.wav',
  HURRY_UP: AUDIO_BASE + 'announcer-hurry-up.wav',
};

// Streak counts that trigger a callout. Kept here so gameplay and any future mode
// agree on the same ladder.
export const ANNOUNCER_STREAK_MILESTONES = {
  COMBO: COMBO_ACTIVATION_THRESHOLD,
  ON_FIRE: 5,
  UNSTOPPABLE: 8,
};

// --- Helper function to play sounds ---
// This function handles both URLs and Base64 data (from custom uploads).
//
// Sound effects fire constantly (every correct/skip), so each URL keeps one warm
// HTMLAudioElement here. The browser fetches and decodes it once; replays just rewind.
// When the same effect is already sounding, a throwaway clone plays instead so the
// previous hit is not cut off. The map is bounded so uploaded data-URLs cannot pile up.
const audioEffectCache = new Map<string, HTMLAudioElement>();
const MAX_CACHED_EFFECTS = 48;

const getCachedEffect = (soundUrl: string): HTMLAudioElement => {
  let audio = audioEffectCache.get(soundUrl);
  if (!audio) {
    audio = new Audio(soundUrl);
    audio.preload = 'auto';
    if (audioEffectCache.size >= MAX_CACHED_EFFECTS) {
      const oldestKey = audioEffectCache.keys().next().value;
      if (oldestKey !== undefined) audioEffectCache.delete(oldestKey);
    }
    audioEffectCache.set(soundUrl, audio);
  }
  return audio;
};

const clampVolume = (volume?: number): number =>
  typeof volume === 'number' && volume >= 0 && volume <= 1 ? volume : 1;

const playAudioElement = (audio: HTMLAudioElement, volume?: number) => {
  audio.volume = clampVolume(volume);
  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.catch(error => {
      if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
        console.warn("Error playing sound:", error.name, error.message);
      }
    });
  }
};

export const playSound = (
  soundSource: string | string[] | CustomSoundFile | CustomSoundFile[] | null | undefined,
  volume?: number
) => {
  let soundUrl: string | undefined;

  if (!soundSource) {
    return;
  }

  if (Array.isArray(soundSource)) {
    if (soundSource.length > 0) {
      const randomIndex = Math.floor(Math.random() * soundSource.length);
      const selectedItem = soundSource[randomIndex];
      if (typeof selectedItem === 'string') {
        soundUrl = selectedItem;
      } else if (selectedItem && typeof selectedItem === 'object' && 'data' in selectedItem && typeof (selectedItem as CustomSoundFile).data === 'string') {
        soundUrl = (selectedItem as CustomSoundFile).data;
      }
    }
  } else if (typeof soundSource === 'string') {
    soundUrl = soundSource;
  } else if (typeof soundSource === 'object' && 'data' in soundSource && typeof (soundSource as CustomSoundFile).data === 'string') {
    soundUrl = (soundSource as CustomSoundFile).data;
  }

  if (soundUrl) {
    const isAllowedUrl =
      soundUrl.startsWith('data:audio') ||
      soundUrl.startsWith('http://') ||
      soundUrl.startsWith('https://') ||
      soundUrl.startsWith('./') ||
      soundUrl.startsWith('../') ||
      soundUrl.startsWith('/');
    if (!isAllowedUrl) {
        console.warn("playSound: Invalid sound URL format provided. URL must start with 'data:audio', 'http(s)://', or a relative path ('./', '../', '/'). Snippet:", soundUrl.substring(0, 100));
        return;
    }
    try {
        const audio = getCachedEffect(soundUrl);
        if (!audio.paused && !audio.ended) {
          // Same effect still ringing — let it finish and play a detached clone for this hit.
          playAudioElement(audio.cloneNode(true) as HTMLAudioElement, volume);
          return;
        }
        audio.currentTime = 0;
        playAudioElement(audio, volume);
    } catch (e: any) {
        console.error("Error playing sound with URL:", soundUrl.substring(0,100), e.name, e.message);
    }
  }
};

// ── Announcer callouts ──────────────────────────────────────────────────────
// The milestone lines ("COMBO!", "ON FIRE!", "UNSTOPPABLE!") are the emotional
// peak of a streak, so they get their own signal chain instead of the shared SFX
// path: a low shelf for chest weight, a compressor so the whole line sits forward,
// and extra gain so it cuts through the music. The music is ducked for the length
// of the line (BackgroundMusicPlayer listens for this event), which is what makes
// the voice read as an announcer rather than just another sound effect.
export const AUDIO_DUCK_EVENT = 'wordcrew:duck-audio';

const ANNOUNCER_GAIN = 1.9;      // effects volume 0.7 → a full-scale line
const ANNOUNCER_DUCK_MS = 1700;  // roughly the length of a one-word callout

let announcerContext: AudioContext | null = null;
const announcerBuffers = new Map<string, AudioBuffer>();
const announcerLoads = new Map<string, Promise<AudioBuffer | null>>();
let liveAnnouncer: AudioBufferSourceNode | null = null;

const getAnnouncerContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    announcerContext ??= new Ctor();
    if (announcerContext.state === 'suspended') void announcerContext.resume().catch(() => undefined);
    return announcerContext;
  } catch {
    return null;
  }
};

/**
 * Decoded once per URL and kept for the session. Decoding avoids the HTMLAudioElement
 * path, which is what lets the callout run through the compressor/EQ chain below.
 */
const loadAnnouncerBuffer = (ctx: AudioContext, url: string): Promise<AudioBuffer | null> => {
  const cached = announcerBuffers.get(url);
  if (cached) return Promise.resolve(cached);
  let pending = announcerLoads.get(url);
  if (!pending) {
    pending = fetch(url)
      .then((response) => (response.ok ? response.arrayBuffer() : null))
      .then((data) => (data ? ctx.decodeAudioData(data) : null))
      .catch(() => null)
      .then((decoded) => {
        if (decoded) announcerBuffers.set(url, decoded);
        announcerLoads.delete(url);
        return decoded;
      });
    announcerLoads.set(url, pending);
  }
  return pending;
};

/** Ducks the looping music under the voice line. */
const duckMusic = () => {
  try {
    window.dispatchEvent(new CustomEvent(AUDIO_DUCK_EVENT, { detail: { ms: ANNOUNCER_DUCK_MS } }));
  } catch {
    /* CustomEvent unsupported — the line simply plays over the music. */
  }
};

/**
 * Plays a pre-rendered announcer callout at full presence. Falls back to a boosted
 * `playSound` when the Web Audio API or the fetch is unavailable (file:// APKs,
 * very old WebViews), so a callout is never silently lost.
 */
export const playAnnouncer = (
  soundSource: string | CustomSoundFile | null | undefined,
  volume?: number,
) => {
  const url = typeof soundSource === 'string' ? soundSource : soundSource?.data;
  if (!url) return;
  const base = clampVolume(volume);
  if (base <= 0) return;
  const gainValue = Math.min(1, base * ANNOUNCER_GAIN);

  duckMusic();

  const ctx = getAnnouncerContext();
  if (!ctx) {
    playSound(url, gainValue);
    return;
  }

  void loadAnnouncerBuffer(ctx, url).then((buffer) => {
    if (!buffer || ctx.state !== 'running') {
      playSound(url, gainValue);
      return;
    }
    try {
      // A new milestone should replace the previous line, not layer two voices.
      if (liveAnnouncer) {
        try {
          liveAnnouncer.stop();
        } catch {
          /* already ended */
        }
        liveAnnouncer = null;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      // A hair of pitch lift adds urgency without changing the voice's character.
      source.playbackRate.value = 1.03;

      const weight = ctx.createBiquadFilter();
      weight.type = 'lowshelf';
      weight.frequency.value = 170;
      weight.gain.value = 5;

      const presence = ctx.createBiquadFilter();
      presence.type = 'highshelf';
      presence.frequency.value = 2600;
      presence.gain.value = 2;

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 12;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.22;

      const gain = ctx.createGain();
      gain.gain.value = gainValue;

      source
        .connect(weight)
        .connect(presence)
        .connect(compressor)
        .connect(gain)
        .connect(ctx.destination);

      liveAnnouncer = source;
      source.onended = () => {
        if (liveAnnouncer === source) liveAnnouncer = null;
      };
      source.start();
    } catch {
      playSound(url, gainValue);
    }
  });
};

