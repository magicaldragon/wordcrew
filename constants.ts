

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
// NOTE: this is a convenience gate only. It ships inside the JS bundle and is NOT
// a security boundary; a real licence check must be verified server-side.
export const ACCESS_CODE = 'skillup';
export const UNLOCK_STORAGE_KEY = 'wordcrew_unlocked';
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

export const isUnlockCodeValid = (code: string): boolean =>
  code.trim().toLowerCase() === ACCESS_CODE;

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
// The demo is meant to feel generous for a single round (full Normal Mode loop with
// all power-ups, Rush Hour, combos and results) while withholding the content that
// is worth paying for (extra modes, word packs, longer games, power-user settings).
export const DEMO_POLICY = {
  freeModes: [GameMode.NORMAL] as GameMode[],
  freePresets: [CEFRLevel.STARTERS] as CEFRLevel[],
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

// --- Helper function to play sounds ---
// This function handles both URLs and Base64 data (from custom uploads).
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
        const audio = new Audio(soundUrl);
        if (typeof volume === 'number' && volume >= 0 && volume <= 1) {
          audio.volume = volume;
        } else {
          audio.volume = 1; // Default to full volume if not specified or invalid
        }
        audio.play().catch(error => {
          if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
            console.warn("Error playing sound:", error.name, error.message, "URL snippet:", soundUrl.substring(0, 100));
          }
        });
    } catch (e: any) {
        console.error("Error creating Audio object with URL:", soundUrl.substring(0,100), e.name, e.message);
    }
  }
};
