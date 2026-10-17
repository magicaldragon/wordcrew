
import React, { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { Dashboard } from './components/Dashboard';
import { AuthDialog } from './components/AuthDialog';
import { PurchaseDialog } from './components/PurchaseDialog';
import { useAuth } from './contexts/AuthContext';
import { DAILY_TRACK, markDailyDone, type SoloTrack, type SoloRunResult, type SoloStyle } from './services/solo';
import { localDateId } from './services/periods';
import { BackgroundMusicPlayer } from './components/BackgroundMusicPlayer';
import { FeedbackHost, toast } from './components/Feedback';
import { Icon } from './components/Icon';

// The portal dashboard is the entry point, so it ships in the initial bundle.
// Every game-side screen is loaded on first navigation instead — the setup wizard
// and the two play screens are the bulk of the app and most sessions never open them.
const LandingScreen = lazy(() => import('./components/LandingScreen').then((m) => ({ default: m.LandingScreen })));
const SetupScreen = lazy(() => import('./components/SetupScreen').then((m) => ({ default: m.SetupScreen })));
const InstructionScreen = lazy(() => import('./components/InstructionScreen').then((m) => ({ default: m.InstructionScreen })));
const GameScreen = lazy(() => import('./components/GameScreen').then((m) => ({ default: m.GameScreen })));
const ResultsScreen = lazy(() => import('./components/ResultsScreen').then((m) => ({ default: m.ResultsScreen })));
const SoloGameScreen = lazy(() => import('./components/SoloGameScreen').then((m) => ({ default: m.SoloGameScreen })));
const SoloResultsScreen = lazy(() => import('./components/SoloResultsScreen').then((m) => ({ default: m.SoloResultsScreen })));

/** Neutral placeholder shown for the instant a split screen chunk is still loading. */
const ScreenFallback: React.FC = () => (
  <div className="flex h-full min-h-[12rem] w-full items-center justify-center" role="status" aria-live="polite">
    <span className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--hairline-strong)] border-t-electric-blue" />
    <span className="sr-only">Loading…</span>
  </div>
);
import { GamePhase, GameSettings, CustomSoundFile, GameMode } from './types';
import { 
    playSound, SINGLE_SOUND_EFFECTS, DEFAULT_MUSIC_VOLUME, CORRECT_SOUNDS, 
    SKIP_SOUNDS, BACKGROUND_MUSIC_URL, GAME_MUSIC_URL, DEFAULT_EFFECTS_VOLUME,
    readUnlockFlag, writeUnlockFlag,
    readDemoRounds, incrementDemoRounds
} from './constants';
import { isMajorUpgrade, fetchRemoteVersion, readDismissedUpdateVersion, writeDismissedUpdateVersion } from './version';
import { verifyLicenseKey, verifyAccessCode, fetchPricing, fetchEntitlement, formatPrice, type EntitlementItem, type UnlockOutcome } from './services/payments';
import { recordRound } from './services/progress';

interface GameEndDetails {
  baseScore?: number; 
  timeBonus?: number;
  finalScore?: number;
  teamAScore?: number;
  teamBScore?: number;
}

/**
 * The name shown on the public solo board. A Google display name is used as-is; an
 * account without one falls back to the email's local part, never the address itself,
 * because anyone can read the board. Capped at 40 characters to match the Firestore
 * rule — a longer name would be rejected there and the score would be silently dropped.
 */
const leaderboardName = (displayName: string | null, email: string | null): string | null => {
  const raw = (displayName || email?.split('@')[0] || '').trim();
  return raw.slice(0, 40) || null;
};

// Custom hook to get the previous value of a prop or state
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined); // Changed: Explicitly pass undefined
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

const App: React.FC = () => {
  const [gamePhase, setGamePhase] = useState<GamePhase>(GamePhase.SETUP);
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
  const [gameEndDetails, setGameEndDetails] = useState<GameEndDetails | null>(null);
  const [isAppRushHourActive, setIsAppRushHourActive] = useState<boolean>(false); 
  
  const [musicVolume, setMusicVolume] = useState<number>(() => {
    const storedVolume = localStorage.getItem('musicVolume');
    const numVolume = storedVolume ? parseFloat(storedVolume) : DEFAULT_MUSIC_VOLUME;
    return !isNaN(numVolume) && numVolume >= 0 && numVolume <=1 ? numVolume : DEFAULT_MUSIC_VOLUME;
  });

  const [effectsVolume, setEffectsVolume] = useState<number>(() => {
    const storedVolume = localStorage.getItem('effectsVolume');
    const numVolume = storedVolume ? parseFloat(storedVolume) : DEFAULT_EFFECTS_VOLUME;
    return !isNaN(numVolume) && numVolume >= 0 && numVolume <=1 ? numVolume : DEFAULT_EFFECTS_VOLUME;
  });

  const [customBackgroundMusic, setCustomBackgroundMusic] = useState<CustomSoundFile | null>(null);
  const [customGameMusic, setCustomGameMusic] = useState<CustomSoundFile | null>(null);
  const [customCorrectSounds, setCustomCorrectSounds] = useState<CustomSoundFile[]>([]);
  const [customSkipSounds, setCustomSkipSounds] = useState<CustomSoundFile[]>([]);
  const [customStartGameSound, setCustomStartGameSound] = useState<CustomSoundFile | null>(null);
  const [customPlayAgainSound, setCustomPlayAgainSound] = useState<CustomSoundFile | null>(null);
  const [customTimesUpSound, setCustomTimesUpSound] = useState<CustomSoundFile | null>(null);
  const [customGameOverSound, setCustomGameOverSound] = useState<CustomSoundFile | null>(null);
  const [customCountdownGoSound, setCustomCountdownGoSound] = useState<CustomSoundFile | null>(null);
  const [customPowerupCollectedSound, setCustomPowerupCollectedSound] = useState<CustomSoundFile | null>(null);
  const [customPowerupTimeFreezeSound, setCustomPowerupTimeFreezeSound] = useState<CustomSoundFile | null>(null);
  const [customPowerupSkipFreebieUsedSound, setCustomPowerupSkipFreebieUsedSound] = useState<CustomSoundFile | null>(null);
  const [customRushHourActivationSound, setCustomRushHourActivationSound] = useState<CustomSoundFile | null>(null);
  const [customRushHourMusicLoop, setCustomRushHourMusicLoop] = useState<CustomSoundFile | null>(null); 
  
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [activeMusicUrl, setActiveMusicUrl] = useState<string | null>(null);
  const [activeMusicOverride, setActiveMusicOverride] = useState<string | null>(null); 
  const initialLoadDone = useRef(false);
  // Custom sounds are base64 audio stored in localStorage; warn once per session when the
  // (small) quota is full, otherwise the upload would silently vanish on the next reload.
  const storageWarningShown = useRef(false);

  // The portal dashboard is the app's home; the game is one destination inside it.
  const [view, setView] = useState<'dashboard' | 'game' | 'solo'>('dashboard');
  // Landing (marketing) screen shown when entering a game, before its setup shell.
  const [showLanding, setShowLanding] = useState<boolean>(true);
  // Mode the player picked on the landing screen; pre-selected in SetupScreen.
  const [initialGameMode, setInitialGameMode] = useState<GameMode | 'solo'>(GameMode.NORMAL);
  // Single source of truth for the demo/full state. Mirrored to localStorage so a
  // classroom machine stays unlocked between sessions.
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => readUnlockFlag());
  // Demo rounds played on this device, used to escalate the results-screen nudge.
  const [demoRounds, setDemoRounds] = useState<number>(() => readDemoRounds());
  // Quoted once for every CTA (dashboard + game landing).
  const [priceLabel, setPriceLabel] = useState<string | null>(null);
  // Purchases owned by the signed-in account, surfaced on the Account tab.
  const [entitlements, setEntitlements] = useState<EntitlementItem[]>([]);

  // == Solo mode state ==
  // Solo is a self-contained single-player flow (the player is the guesser), so it keeps
  // its own phase machine rather than borrowing the pass-and-play GamePhase/GameMode.
  const [soloPhase, setSoloPhase] = useState<'playing' | 'results' | null>(null);
  const [soloTrack, setSoloTrack] = useState<SoloTrack | null>(null);
  // Chosen on the Mode step and frozen for the run, so "Play again" replays the same skill.
  const [soloStyle, setSoloStyle] = useState<SoloStyle>('meaning');
  const [soloResult, setSoloResult] = useState<SoloRunResult | null>(null);
  // Bumped on each new run so the endless game screen remounts with a fresh word source.
  const [soloRunId, setSoloRunId] = useState(0);
  // Set while the current run is Today's Challenge: the day id seeds the word order and
  // is the period the score is posted under. Null for an ordinary track run.
  const [soloDailyDateId, setSoloDailyDateId] = useState<string | null>(null);

  const { user, getIdToken } = useAuth();
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const grantFullVersion = useCallback(() => {
    setIsUnlocked(true);
    writeUnlockFlag();
  }, []);

  // The Full Version is owned by the account, not the browser: as soon as a signed-in
  // customer is seen, ask the worker what they own and restore it on this device too.
  // This is what lets a buyer switch device or sign back in and keep the unlock.
  // Also called from the Account tab's refresh, so a purchase reconciled while the buyer
  // waits unlocks without a full reload.
  const refreshEntitlements = useCallback(async () => {
    const token = await getIdToken();
    if (!token) {
      setEntitlements([]);
      return;
    }
    const entitlement = await fetchEntitlement(token);
    setEntitlements(entitlement.entitlements);
    if (entitlement.entitled) grantFullVersion();
  }, [getIdToken, grantFullVersion]);

  useEffect(() => {
    if (!user) {
      setEntitlements([]);
      return;
    }
    void refreshEntitlements();
  }, [user, refreshEntitlements]);

  // Unlock paths: both the purchased licence key and the teacher access code are checked
  // against the API worker — the access code lives only as a server secret now.
  const handleUnlock = useCallback(
    async (code: string): Promise<UnlockOutcome> => {
      if (await verifyAccessCode(code)) {
        grantFullVersion();
        return { ok: true };
      }
      const outcome = await verifyLicenseKey(code);
      if (outcome.ok) grantFullVersion();
      return outcome;
    },
    [grantFullVersion],
  );

  // Called by the buy dialog once a transfer has been matched to an order: the key it
  // hands over was just issued by the same backend, so no second round-trip is needed.
  const handleLicensed = useCallback(() => {
    grantFullVersion();
  }, [grantFullVersion]);

  // Quoted once on load for every "Unlock" CTA. Silently stays hidden when the API is
  // unreachable (offline install), where the CTA still reads fine without a price.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const pricing = await fetchPricing();
        const product = pricing.products[0];
        if (!cancelled && product) setPriceLabel(formatPrice(product.amount, pricing.currency));
      } catch {
        /* Pricing API unavailable — keep the label empty. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // The price leads: the dialog opens for everyone and explains what the licence covers.
  // Sign-in is only asked for at the point an order has to be created, because the worker
  // refuses to mint one without a valid ID token.
  const requestPurchase = useCallback(() => {
    setShowPurchaseDialog(true);
  }, []);

  // Raised by the purchase dialog when the buyer has no account yet; the dialog stays put
  // underneath and resumes by itself once an account appears.
  const requestSignInForPurchase = useCallback(() => {
    setShowAuthDialog(true);
  }, []);

  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, []);

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  useEffect(() => {
    if (isFullscreen) {
        document.body.classList.add('fullscreen-active');
    } else {
        document.body.classList.remove('fullscreen-active');
    }
  }, [isFullscreen]);

  const isCustomSoundFile = (data: any): data is CustomSoundFile | null =>
    data === null || (typeof data === 'object' && data !== null && 'name' in data && typeof data.name === 'string' && 'data' in data && typeof data.data === 'string');
  
  const isCustomSoundFileArray = (data: any): data is CustomSoundFile[] =>
    Array.isArray(data) && data.every(item => item && typeof item === 'object' && 'name' in item && typeof item.name === 'string' && 'data' in item && typeof item.data === 'string');

  useEffect(() => {
    const loadJSON = <T,>(
        key: string, 
        setter: (value: T) => void, 
        defaultValue: T, 
        validator: (data: any) => data is T
    ): void => {
        const storedValue = localStorage.getItem(key);
        if (storedValue) {
            try {
                const parsed = JSON.parse(storedValue);
                if (validator(parsed)) {
                    setter(parsed);
                } else {
                    console.warn(`Invalid data structure for ${key} in localStorage. Resetting to default.`);
                    setter(defaultValue);
                    localStorage.removeItem(key);
                }
            } catch (e) {
                console.error(`Error parsing ${key} from localStorage:`, e);
                setter(defaultValue);
                localStorage.removeItem(key);
            }
        } else {
            if (typeof defaultValue !== 'undefined') {
                 setter(defaultValue);
            }
        }
    };

    const storedMusicVol = localStorage.getItem('musicVolume');
    if (storedMusicVol) {
        const numVolume = parseFloat(storedMusicVol);
        if (!isNaN(numVolume) && numVolume >= 0 && numVolume <= 1) {
            setMusicVolume(numVolume);
        } else {
            localStorage.removeItem('musicVolume'); 
            setMusicVolume(DEFAULT_MUSIC_VOLUME); 
        }
    } else {
        setMusicVolume(DEFAULT_MUSIC_VOLUME);
    }

    const storedEffectsVol = localStorage.getItem('effectsVolume');
    if (storedEffectsVol) {
        const numVolume = parseFloat(storedEffectsVol);
        if (!isNaN(numVolume) && numVolume >= 0 && numVolume <= 1) {
            setEffectsVolume(numVolume);
        } else {
            localStorage.removeItem('effectsVolume');
            setEffectsVolume(DEFAULT_EFFECTS_VOLUME);
        }
    } else {
        setEffectsVolume(DEFAULT_EFFECTS_VOLUME);
    }

    loadJSON<CustomSoundFile | null>('customBackgroundMusic', setCustomBackgroundMusic, null, isCustomSoundFile);
    loadJSON<CustomSoundFile | null>('customGameMusic', setCustomGameMusic, null, isCustomSoundFile); 
    loadJSON<CustomSoundFile[]>('customCorrectSounds', setCustomCorrectSounds, [], isCustomSoundFileArray);
    loadJSON<CustomSoundFile[]>('customSkipSounds', setCustomSkipSounds, [], isCustomSoundFileArray);
    loadJSON<CustomSoundFile | null>('customStartGameSound', setCustomStartGameSound, null, isCustomSoundFile);
    loadJSON<CustomSoundFile | null>('customPlayAgainSound', setCustomPlayAgainSound, null, isCustomSoundFile);
    loadJSON<CustomSoundFile | null>('customTimesUpSound', setCustomTimesUpSound, null, isCustomSoundFile);
    loadJSON<CustomSoundFile | null>('customGameOverSound', setCustomGameOverSound, null, isCustomSoundFile);
    loadJSON<CustomSoundFile | null>('customCountdownGoSound', setCustomCountdownGoSound, null, isCustomSoundFile);
    loadJSON<CustomSoundFile | null>('customPowerupCollectedSound', setCustomPowerupCollectedSound, null, isCustomSoundFile);
    loadJSON<CustomSoundFile | null>('customPowerupTimeFreezeSound', setCustomPowerupTimeFreezeSound, null, isCustomSoundFile);
    loadJSON<CustomSoundFile | null>('customPowerupSkipFreebieUsedSound', setCustomPowerupSkipFreebieUsedSound, null, isCustomSoundFile);
    loadJSON<CustomSoundFile | null>('customRushHourActivationSound', setCustomRushHourActivationSound, null, isCustomSoundFile);
    loadJSON<CustomSoundFile | null>('customRushHourMusicLoop', setCustomRushHourMusicLoop, null, isCustomSoundFile); 

    initialLoadDone.current = true;
  }, []);
  
  // Which screen the shared track belongs to. A Solo run lives on its own view while
  // `gamePhase` stays at SETUP, so a run is folded in here as PLAYING — without this the
  // setup track would keep looping for the whole run.
  const musicPhase: GamePhase | 'SILENT' =
    view === 'solo'
      ? (soloPhase === 'playing' ? GamePhase.PLAYING : 'SILENT')
      : gamePhase;
  const previousMusicPhase = usePrevious(musicPhase);

  useEffect(() => {
    let newActiveMusicUrl: string | null = null; // Default to null (stop music / no change)

    if (musicPhase === GamePhase.PLAYING) {
        if (customGameMusic?.data) {
            newActiveMusicUrl = customGameMusic.data;
        } else if (previousMusicPhase !== GamePhase.PLAYING) {
            // Entering gameplay: roll exactly one track from the pool. Rolling on the
            // transition only (never on every render) is what stops the track re-shuffling.
            if (Array.isArray(GAME_MUSIC_URL) && GAME_MUSIC_URL.length > 0) {
                newActiveMusicUrl = GAME_MUSIC_URL[Math.floor(Math.random() * GAME_MUSIC_URL.length)];
            } else if (typeof GAME_MUSIC_URL === 'string') {
                newActiveMusicUrl = GAME_MUSIC_URL;
            }
        } else {
            // Mid-round: keep the track that was rolled on entry.
            newActiveMusicUrl = activeMusicUrl;
        }
    } else if (musicPhase === GamePhase.SETUP) {
        // Set setup music if:
        // 1. Coming from a phase that isn't INSTRUCTION (e.g., RESULTS, PLAYING, or initial undefined)
        // 2. Or if custom background music has changed.
        if (previousMusicPhase !== GamePhase.INSTRUCTION || (customBackgroundMusic && customBackgroundMusic.data !== activeMusicUrl)) {
            if (customBackgroundMusic?.data) {
                newActiveMusicUrl = customBackgroundMusic.data;
            } else if (Array.isArray(BACKGROUND_MUSIC_URL) && BACKGROUND_MUSIC_URL.length > 0) {
                newActiveMusicUrl = BACKGROUND_MUSIC_URL[Math.floor(Math.random() * BACKGROUND_MUSIC_URL.length)];
            } else if (typeof BACKGROUND_MUSIC_URL === 'string') {
                newActiveMusicUrl = BACKGROUND_MUSIC_URL;
            }
        } else {
            // Coming from INSTRUCTION to SETUP, keep current music.
            newActiveMusicUrl = activeMusicUrl;
        }
    } else if (musicPhase === GamePhase.INSTRUCTION) {
        // If coming from SETUP, keep the current music.
        // Otherwise (e.g., direct navigation or custom music change), select setup music.
        if (previousMusicPhase === GamePhase.SETUP) {
            newActiveMusicUrl = activeMusicUrl;
        } else if (customBackgroundMusic && customBackgroundMusic.data !== activeMusicUrl) {
             if (customBackgroundMusic?.data) {
                newActiveMusicUrl = customBackgroundMusic.data;
            } else if (Array.isArray(BACKGROUND_MUSIC_URL) && BACKGROUND_MUSIC_URL.length > 0) {
                newActiveMusicUrl = BACKGROUND_MUSIC_URL[Math.floor(Math.random() * BACKGROUND_MUSIC_URL.length)];
            } else if (typeof BACKGROUND_MUSIC_URL === 'string') {
                newActiveMusicUrl = BACKGROUND_MUSIC_URL;
            }
        } else if (activeMusicUrl === null) { // Handles initial load to INSTRUCTION or coming from a phase where music stopped (like RESULTS)
            if (customBackgroundMusic?.data) {
                newActiveMusicUrl = customBackgroundMusic.data;
            } else if (Array.isArray(BACKGROUND_MUSIC_URL) && BACKGROUND_MUSIC_URL.length > 0) {
                newActiveMusicUrl = BACKGROUND_MUSIC_URL[Math.floor(Math.random() * BACKGROUND_MUSIC_URL.length)];
            } else if (typeof BACKGROUND_MUSIC_URL === 'string') {
                newActiveMusicUrl = BACKGROUND_MUSIC_URL;
            }
        } else {
            // If no conditions met to change/set, keep current
            newActiveMusicUrl = activeMusicUrl;
        }
    }
    // For RESULTS / SILENT (e.g. a Solo run's results screen), newActiveMusicUrl stays
    // null, so the music stops.

    if (newActiveMusicUrl !== activeMusicUrl) {
        setActiveMusicUrl(newActiveMusicUrl);
    }
  }, [musicPhase, previousMusicPhase, customBackgroundMusic, customGameMusic, activeMusicUrl]);


  const saveJSON = useCallback((key: string, value: any) => {
    if (!initialLoadDone.current) return;
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error(`Error saving ${key} to localStorage:`, e);
        if (key.startsWith('custom') && !storageWarningShown.current) {
            storageWarningShown.current = true;
            toast('Browser storage is full, so this audio could not be saved and would be lost on reload. Remove a custom sound (or use "Reset all to default sounds") and upload a smaller file.', 'error');
        }
    }
  }, []); 

  useEffect(() => {
    if (!initialLoadDone.current) return;
    localStorage.setItem('musicVolume', musicVolume.toString());
  }, [musicVolume]);

  useEffect(() => {
    if (!initialLoadDone.current) return;
    localStorage.setItem('effectsVolume', effectsVolume.toString());
  }, [effectsVolume]);

  useEffect(() => saveJSON('customBackgroundMusic', customBackgroundMusic), [customBackgroundMusic, saveJSON]);
  useEffect(() => saveJSON('customGameMusic', customGameMusic), [customGameMusic, saveJSON]); 
  useEffect(() => saveJSON('customCorrectSounds', customCorrectSounds), [customCorrectSounds, saveJSON]);
  useEffect(() => saveJSON('customSkipSounds', customSkipSounds), [customSkipSounds, saveJSON]);
  useEffect(() => saveJSON('customStartGameSound', customStartGameSound), [customStartGameSound, saveJSON]);
  useEffect(() => saveJSON('customPlayAgainSound', customPlayAgainSound), [customPlayAgainSound, saveJSON]);
  useEffect(() => saveJSON('customTimesUpSound', customTimesUpSound), [customTimesUpSound, saveJSON]);
  useEffect(() => saveJSON('customGameOverSound', customGameOverSound), [customGameOverSound, saveJSON]);
  useEffect(() => saveJSON('customCountdownGoSound', customCountdownGoSound), [customCountdownGoSound, saveJSON]);
  useEffect(() => saveJSON('customPowerupCollectedSound', customPowerupCollectedSound), [customPowerupCollectedSound, saveJSON]);
  useEffect(() => saveJSON('customPowerupTimeFreezeSound', customPowerupTimeFreezeSound), [customPowerupTimeFreezeSound, saveJSON]);
  useEffect(() => saveJSON('customPowerupSkipFreebieUsedSound', customPowerupSkipFreebieUsedSound), [customPowerupSkipFreebieUsedSound, saveJSON]);
  useEffect(() => saveJSON('customRushHourActivationSound', customRushHourActivationSound), [customRushHourActivationSound, saveJSON]);
  useEffect(() => saveJSON('customRushHourMusicLoop', customRushHourMusicLoop), [customRushHourMusicLoop, saveJSON]); 


  const handleGameStart = useCallback((settings: GameSettings) => {
    setGameSettings({ ...settings, isDemo: !isUnlocked });
    setGameEndDetails(null); 
    playSound(customStartGameSound?.data || SINGLE_SOUND_EFFECTS.START_GAME_SOUND, effectsVolume);
    setIsAppRushHourActive(false); 
    setGamePhase(GamePhase.INSTRUCTION); 
    setActiveMusicOverride(null); 
  }, [customStartGameSound, effectsVolume, isUnlocked]);

  const handleProceedToPlaying = useCallback(() => {
    setIsAppRushHourActive(false); 
    setGamePhase(GamePhase.PLAYING);
  }, []);

  // Leaving the landing screen and entering the game setup with the chosen mode.
  const handleEnterGame = useCallback((mode: GameMode | 'solo' = GameMode.NORMAL) => {
    setInitialGameMode(mode);
    setShowLanding(false);
  }, []);

  // Dashboard "Play" — open the game (its own landing screen first).
  const handlePlayGame = useCallback(() => {
    setGamePhase(GamePhase.SETUP);
    setGameSettings(null);
    setGameEndDetails(null);
    setShowLanding(true);
    setView('game');
  }, []);

  // == Solo mode handlers ==
  // The run is fully configured inside the game setup wizard (mode → track → settings),
  // so starting one is a single call carrying the chosen track.
  const handleStartSolo = useCallback((track: SoloTrack, style: SoloStyle) => {
    setSoloTrack(track);
    setSoloStyle(style);
    setSoloDailyDateId(null);
    setSoloResult(null);
    setSoloRunId((id) => id + 1);
    setView('solo');
    setSoloPhase('playing');
  }, []);

  // Today's Challenge: the same seeded ladder for everyone, one board per day.
  // The daily board is shared, so the style is fixed to the one every existing score was
  // set in; letting the player pick here would put two different games on one board.
  const handleStartDaily = useCallback(() => {
    setSoloTrack(DAILY_TRACK);
    setSoloStyle('meaning');
    setSoloDailyDateId(localDateId());
    setSoloResult(null);
    setSoloRunId((id) => id + 1);
    setView('solo');
    setSoloPhase('playing');
  }, []);

  const handleSoloEnd = useCallback((result: SoloRunResult) => {
    setSoloResult(result);
    setSoloPhase('results');
    // The challenge is "done" the moment it ends, so the setup card can say so.
    if (result.boardId === DAILY_TRACK.id) markDailyDone(result.period);
    // A solo run counts towards the same lifetime counters as a pass-and-play round.
    void recordRound(user?.uid, {
      score: result.score,
      wordsGuessed: result.wordsGuessed,
      bestStreak: result.bestStreak,
    });
  }, [user]);

  // "Play again" rebuilds the same track so the player can try to beat their own run —
  // and replays the *same* daily ladder while the day has not turned over.
  const handleSoloPlayAgain = useCallback(() => {
    if (!soloTrack) return;
    setSoloResult(null);
    setSoloRunId((id) => id + 1);
    setSoloPhase('playing');
  }, [soloTrack]);

  // Leaving a run (Quit / Home) always lands back on the portal dashboard.
  // `showLanding` is reset here too: the portal is a silent screen, exactly as it is
  // when leaving the pass-and-play game — without this the setup music kept looping
  // on the dashboard after a Solo exit.
  const handleSoloExit = useCallback(() => {
    setSoloPhase(null);
    setSoloTrack(null);
    setSoloResult(null);
    setSoloDailyDateId(null);
    setActiveMusicOverride(null);
    setShowLanding(true);
    setView('dashboard');
  }, []);

  // Returning from the instructions screen drops back into the setup wizard.
  const handleBackToSetupFromInstruction = useCallback(() => {
    setIsAppRushHourActive(false); 
    setGamePhase(GamePhase.SETUP);
  }, []);


  const handleGameEnd = useCallback((details: { baseScore?: number; timeLeftSeconds?: number; teamAScore?: number; teamBScore?: number; wordsGuessed: number; bestStreak: number; }) => {
    let achievedScore = 0;
    // What the progress counters record. For Normal/Hell that is the score the results
    // screen shows (base + time bonus); for Team it is the winning team's points.
    let roundScore = 0;
    // FIX: Replaced 'settings' with 'gameSettings' which is the correct state variable.
    let timeLeft = gameSettings?.totalTimeLimit ?? 0;

    if (gameSettings?.gameMode === GameMode.TEAM && details.teamAScore !== undefined && details.teamBScore !== undefined) {
      setGameEndDetails({
        teamAScore: details.teamAScore,
        teamBScore: details.teamBScore,
      });
      achievedScore = Math.max(details.teamAScore, details.teamBScore);
      roundScore = achievedScore;
      timeLeft = 0; // Team mode ends when timer hits 0
    } else if (details.baseScore !== undefined && details.timeLeftSeconds !== undefined) {
      const { baseScore, timeLeftSeconds } = details;
      const timeBonusValue = gameSettings?.gameMode === GameMode.NORMAL ? Math.max(0, timeLeftSeconds * 10) : 0;
      const calculatedFinalScore = baseScore + timeBonusValue;
      setGameEndDetails({
        baseScore,
        timeBonus: timeBonusValue,
        finalScore: calculatedFinalScore,
      });
      achievedScore = baseScore;
      roundScore = calculatedFinalScore;
      timeLeft = timeLeftSeconds;
    }

    // Fold the finished round into the account's lifetime counters. Best-effort: it only
    // reaches Firestore for a signed-in player, and a failure never blocks the results.
    void recordRound(user?.uid, {
      score: roundScore,
      wordsGuessed: details.wordsGuessed,
      bestStreak: details.bestStreak,
    });

    setIsAppRushHourActive(false);
    setGamePhase(GamePhase.RESULTS);
    setActiveMusicOverride(null);

    // Count the finished demo round so the upsell can escalate from the 2nd round on.
    if (gameSettings?.isDemo) {
      setDemoRounds(incrementDemoRounds());
    }

    if (timeLeft <= 0 && achievedScore > 0) {
      playSound(customTimesUpSound?.data || SINGLE_SOUND_EFFECTS.TIMES_UP_WORD, effectsVolume);
    } else if (timeLeft <= 0 && achievedScore <= 0) {
      playSound(customTimesUpSound?.data || SINGLE_SOUND_EFFECTS.TIMES_UP_WORD, effectsVolume);
    } else {
      playSound(customGameOverSound?.data || SINGLE_SOUND_EFFECTS.GAME_OVER, effectsVolume);
    }
    // FIX: Removed redundant 'settings' from dependency array.
  }, [customTimesUpSound, customGameOverSound, effectsVolume, gameSettings, user]);

  // == Version check: only a MAJOR release is worth interrupting the player for ==
  // Minor/patch releases are applied silently by the auto-updating service worker
  // on the next launch, so the player is never asked to reload for them.
  const [majorUpdateVersion, setMajorUpdateVersion] = useState<string | null>(null);
  const [dismissedUpdateVersion, setDismissedUpdateVersion] = useState<string | null>(() => readDismissedUpdateVersion());

  useEffect(() => {
    let cancelled = false;
    const checkForMajorUpdate = async () => {
      const remoteVersion = await fetchRemoteVersion();
      if (cancelled || !remoteVersion) return;
      if (isMajorUpgrade(remoteVersion)) setMajorUpdateVersion(remoteVersion);
    };
    void checkForMajorUpdate();
    // Re-check whenever the player returns to the app (tab focus / PWA resume).
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void checkForMajorUpdate();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, []);

  // == Service-worker update watcher ==
  // Minor/patch builds are installed silently by the auto-updating service worker, so
  // instead of reloading mid-game we surface a small reload offer — and only while the
  // player is on a static screen. Reloading then serves the freshly precached build,
  // which removes the "I deployed but the tab still shows the old build" confusion.
  const [pwaUpdateReady, setPwaUpdateReady] = useState(false);
  const [dismissedPwaUpdate, setDismissedPwaUpdate] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let registration: ServiceWorkerRegistration | undefined;

    const watchInstalling = (worker: ServiceWorker | null) => {
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        // 'installed' while a controller already exists means an UPDATE (not the very
        // first install) has finished and will serve the new build on the next load.
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          setPwaUpdateReady(true);
        }
      });
    };

    const track = async () => {
      registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;
      if (registration.waiting && navigator.serviceWorker.controller) setPwaUpdateReady(true);
      registration.addEventListener('updatefound', () => watchInstalling(registration?.installing ?? null));
      watchInstalling(registration.installing);
    };
    void track();

    // A tab can stay open for a whole lesson, so re-check when it regains focus.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void registration?.update().catch(() => {});
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Refresh the service worker first so the reload picks up the new build.
  const handleReloadForUpdate = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      await registration?.update();
    } catch {
      // Offline or unsupported: a plain reload is still the best attempt.
    }
    window.location.reload();
  }, []);

  const handleDismissUpdateNotice = useCallback(() => {
    if (!majorUpdateVersion) return;
    writeDismissedUpdateVersion(majorUpdateVersion);
    setDismissedUpdateVersion(majorUpdateVersion);
  }, [majorUpdateVersion]);

  const handlePlayAgain = useCallback(() => {
    setGameSettings(null);
    setGameEndDetails(null);
    setIsAppRushHourActive(false); 
    setGamePhase(GamePhase.SETUP);
    playSound(customPlayAgainSound?.data || SINGLE_SOUND_EFFECTS.PLAY_AGAIN_SOUND, effectsVolume);
    setActiveMusicOverride(null); 
  }, [customPlayAgainSound, effectsVolume]);

  // Results screen "Home" button: return to the portal dashboard.
  const handleGoHome = useCallback(() => {
    setGameSettings(null);
    setGameEndDetails(null);
    setIsAppRushHourActive(false);
    setActiveMusicOverride(null);
    setShowLanding(true);
    setGamePhase(GamePhase.SETUP);
    setView('dashboard');
  }, []);

  const handleMusicVolumeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value);
    if (!isNaN(newVolume) && newVolume >= 0 && newVolume <= 1) {
      setMusicVolume(newVolume);
    }
  }, []);

  const handleEffectsVolumeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value);
    if (!isNaN(newVolume) && newVolume >= 0 && newVolume <= 1) {
      setEffectsVolume(newVolume);
    }
  }, []);
  
  const getInstructionCardClass = () => {
    if (gamePhase !== GamePhase.INSTRUCTION || !gameSettings) return '';
    if (gameSettings.gameMode === GameMode.HELL) {
        return 'border-2 border-danger-red/70 shadow-lg shadow-danger-red/30';
    }
    if (gameSettings.gameMode === GameMode.TEAM) {
        return 'border-2 border-cyan-400/70 shadow-lg shadow-cyan-400/20';
    }
    return 'border-2 border-neon-green/70 shadow-lg shadow-neon-green/20';
  };

  const getMainCardClass = () => {
    if (gamePhase === GamePhase.RESULTS) return 'results-card-animation';
    if (gamePhase === GamePhase.INSTRUCTION) return getInstructionCardClass();
    if (isAppRushHourActive && gamePhase === GamePhase.PLAYING) {
        return gameSettings?.gameMode === GameMode.HELL 
            ? 'rush-hour-active-visuals shadow-[var(--elev-3)]' // Hell Mode Rush keeps the same pulses
            : 'rush-hour-active-visuals'; // Normal Rush
    }
    return ''; // Default card style
  };


  const renderScreen = () => {
    switch (gamePhase) {
      case GamePhase.SETUP:
        return <SetupScreen 
                  initialGameMode={initialGameMode}
                  isUnlocked={isUnlocked}
                  onUnlock={handleUnlock}
                  onGameStart={handleGameStart}
                  onStartSolo={handleStartSolo}
                  onStartDaily={handleStartDaily}
                  isSignedIn={Boolean(user)}
                  musicVolume={musicVolume}
                  onMusicVolumeChange={handleMusicVolumeChange}
                  effectsVolume={effectsVolume}
                  onEffectsVolumeChange={handleEffectsVolumeChange}
                  customBackgroundMusic={customBackgroundMusic}
                  setCustomBackgroundMusic={setCustomBackgroundMusic}
                  customGameMusic={customGameMusic} 
                  setCustomGameMusic={setCustomGameMusic} 
                  customCorrectSounds={customCorrectSounds}
                  setCustomCorrectSounds={setCustomCorrectSounds}
                  customSkipSounds={customSkipSounds}
                  setCustomSkipSounds={setCustomSkipSounds}
                  customStartGameSound={customStartGameSound}
                  setCustomStartGameSound={setCustomStartGameSound}
                  customPlayAgainSound={customPlayAgainSound}
                  setCustomPlayAgainSound={setCustomPlayAgainSound}
                  customTimesUpSound={customTimesUpSound}
                  setCustomTimesUpSound={setCustomTimesUpSound}
                  customGameOverSound={customGameOverSound}
                  setCustomGameOverSound={setCustomGameOverSound}
                  customCountdownGoSound={customCountdownGoSound}
                  setCustomCountdownGoSound={setCustomCountdownGoSound}
                  customPowerupCollectedSound={customPowerupCollectedSound}
                  setCustomPowerupCollectedSound={setCustomPowerupCollectedSound}
                  customPowerupTimeFreezeSound={customPowerupTimeFreezeSound}
                  setCustomPowerupTimeFreezeSound={setCustomPowerupTimeFreezeSound}
                  customPowerupSkipFreebieUsedSound={customPowerupSkipFreebieUsedSound}
                  setCustomPowerupSkipFreebieUsedSound={setCustomPowerupSkipFreebieUsedSound}
                  customRushHourActivationSound={customRushHourActivationSound}
                  setCustomRushHourActivationSound={setCustomRushHourActivationSound}
                  customRushHourMusicLoop={customRushHourMusicLoop} 
                  setCustomRushHourMusicLoop={setCustomRushHourMusicLoop} 
                />;
      case GamePhase.INSTRUCTION: 
        if (!gameSettings) { 
            handlePlayAgain(); 
            return <p className="text-danger-red">Error: Game settings missing for instructions. Returning to setup...</p>;
        }
        return <InstructionScreen 
                  gameMode={gameSettings.gameMode}
                  onStartPlaying={handleProceedToPlaying} 
                  onGoBackToSetup={handleBackToSetupFromInstruction} 
                />;
      case GamePhase.PLAYING:
        if (!gameSettings) {
            handlePlayAgain(); 
            return <p className="text-danger-red">Error: Game settings missing. Returning to setup...</p>;
        }
        return <GameScreen 
                  settings={gameSettings} 
                  isDemo={!!gameSettings.isDemo}
                  onGameEnd={handleGameEnd} 
                  effectsVolume={effectsVolume} 
                  musicVolume={musicVolume}
                  onMusicVolumeChange={handleMusicVolumeChange}
                  onEffectsVolumeChange={handleEffectsVolumeChange}
                  customCorrectSounds={customCorrectSounds}
                  customSkipSounds={customSkipSounds}
                  customCountdownGoSound={customCountdownGoSound}
                  customPowerupCollectedSound={customPowerupCollectedSound}
                  customPowerupTimeFreezeSound={customPowerupTimeFreezeSound}
                  customPowerupSkipFreebieUsedSound={customPowerupSkipFreebieUsedSound}
                  customRushHourActivationSound={customRushHourActivationSound}
                  customRushHourMusicLoop={customRushHourMusicLoop} 
                  setActiveMusicOverride={setActiveMusicOverride} 
                  onSetRushHourActiveVisuals={setIsAppRushHourActive} 
                  isAppRushHourActive={isAppRushHourActive}
                />;
      case GamePhase.RESULTS:
        if (!gameEndDetails || !gameSettings) { // Ensure gameSettings is also available for gameMode
            handlePlayAgain();
            return <p className="text-light-text animate-subtlePulse">Loading results...</p>;
        }
        return <ResultsScreen 
                  {...gameEndDetails}
                  onHome={handleGoHome}
                  gameMode={gameSettings.gameMode}
                  isUnlocked={isUnlocked}
                  onUnlock={handleUnlock}
                  demoRounds={demoRounds}
                />;
      default:
        return <p className="text-light-text animate-subtlePulse">Initializing Interface...</p>;
    }
  };

  const renderSoloScreen = () => {
    if (soloPhase === 'playing' && soloTrack) {
      return (
        <SoloGameScreen
          key={soloRunId}
          track={soloTrack}
          style={soloStyle}
          effectsVolume={effectsVolume}
          customCorrectSounds={customCorrectSounds}
          dailyDateId={soloDailyDateId ?? undefined}
          onEnd={handleSoloEnd}
          onExit={handleSoloExit}
        />
      );
    }
    if (soloPhase === 'results' && soloTrack && soloResult) {
      return (
        <SoloResultsScreen
          track={soloTrack}
          result={soloResult}
          userId={user?.uid ?? null}
          userName={leaderboardName(user?.displayName ?? null, user?.email ?? null)}
          onPlayAgain={handleSoloPlayAgain}
          onHome={handleSoloExit}
        />
      );
    }
    return null;
  };
  
  const rushHourBounceClass = isAppRushHourActive && gamePhase === GamePhase.PLAYING ? 'animate-rushHourBounce' : '';
  const isSolo = view === 'solo';
  // Solo now configures itself inside the shared setup wizard, so the header simply
  // frames that wizard as solo while the mode is pre-selected.
  const isSoloSetup = !isSolo && !showLanding && gamePhase === GamePhase.SETUP && initialGameMode === 'solo';
  // Never interrupt an active round: a pending major update is announced once the
  // player is back on a static screen.
  const isRoundInProgress =
    (view === 'game' && !showLanding && gamePhase === GamePhase.PLAYING) ||
    (isSolo && soloPhase === 'playing');

  // A live round is painful to lose to a stray refresh, Cmd+W or a mis-swiped tab, so ask
  // the browser to confirm before the page unloads. Browsers only honour the prompt once
  // the page has been interacted with — always true while a round is being played — and
  // they show their own generic wording, which is the most we can control.
  useEffect(() => {
    if (!isRoundInProgress) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRoundInProgress]);
  // Escape hatch back to the portal, offered on the setup wizard only so a live round
  // (in either mode) can never be abandoned by a stray tap on the header.
  const canExitToHome = !isSolo && !showLanding && gamePhase === GamePhase.SETUP;
  const showMajorUpdateNotice = Boolean(majorUpdateVersion && majorUpdateVersion !== dismissedUpdateVersion);
  // The minor/patch reload offer is surfaced on a static screen only — never while a
  // round is being played — and steps aside for the louder MAJOR notice when both are due.
  const isStaticScreen =
    view === 'dashboard' ||
    showLanding ||
    (!isSolo && gamePhase === GamePhase.SETUP);
  const showPwaUpdatePill = pwaUpdateReady && !dismissedPwaUpdate && isStaticScreen && !showMajorUpdateNotice;

  return (
    <div className={`h-screen flex flex-col items-center text-light-text selection:bg-cyber-purple selection:text-white overflow-hidden justify-center ${view === 'dashboard' ? 'wc-theme bg-[var(--page-bg)]' : 'bg-[var(--surface-0)]'} ${isFullscreen || view === 'dashboard' || showLanding ? 'p-0' : 'p-2 sm:p-3'}`}>
      <BackgroundMusicPlayer 
        volume={musicVolume} 
        musicUrl={showLanding ? null : (activeMusicOverride || activeMusicUrl)} 
      />
      <FeedbackHost />
      {showMajorUpdateNotice && !isRoundInProgress && (
        <div className="pointer-events-none fixed inset-x-0 top-2 z-[200] flex justify-center px-2">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-electric-blue/50 bg-dark-metal/95 px-3 py-1.5 shadow-[var(--elev-3)] animate-fadeInScaleUp sm:gap-3 sm:px-4 sm:py-2">
            <span className="text-base sm:text-lg" aria-hidden="true">🎉</span>
            <p className="font-sans text-xs text-light-text sm:text-sm">
              <span className="font-heading tracking-wide text-electric-blue">WordCrew {majorUpdateVersion}</span> is available.
            </p>
            <button
              type="button"
              onClick={handleReloadForUpdate}
              className="futuristic-button rounded-full bg-electric-blue px-3 py-1 text-xs font-bold text-dark-metal hover:bg-sky-400 sm:text-sm"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={handleDismissUpdateNotice}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-text hover:text-light-text"
              aria-label="Dismiss update notice"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        </div>
      )}
      {showPwaUpdatePill && (
        <div className="pointer-events-none fixed inset-x-0 top-2 z-[190] flex justify-center px-2">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-neon-green/50 bg-dark-metal/95 px-3 py-1.5 shadow-[var(--elev-3)] animate-fadeInScaleUp sm:gap-3 sm:px-4 sm:py-2">
            <span className="text-base sm:text-lg" aria-hidden="true">✨</span>
            <p className="font-sans text-xs text-light-text sm:text-sm">
              A new build is ready.
            </p>
            <button
              type="button"
              onClick={handleReloadForUpdate}
              className="futuristic-button rounded-full bg-neon-green px-3 py-1 text-xs font-bold text-dark-metal hover:bg-emerald-400 sm:text-sm"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={() => setDismissedPwaUpdate(true)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-text hover:text-light-text"
              aria-label="Dismiss update offer"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        </div>
      )}
      {view === 'dashboard' ? (
        <Dashboard
          isUnlocked={isUnlocked}
          entitlements={entitlements}
          onPlayGame={handlePlayGame}
          onUnlock={requestPurchase}
          onRefreshAccount={refreshEntitlements}
        />
      ) : showLanding ? (
        <Suspense fallback={<ScreenFallback />}>
          <LandingScreen
            isUnlocked={isUnlocked}
            onUnlock={handleUnlock}
            onUpgrade={requestPurchase}
            onPlay={handleEnterGame}
            onBack={handleGoHome}
          />
        </Suspense>
      ) : (
      <div className="container mx-auto w-full flex flex-col h-full max-w-4xl">
        <header className={`mb-3 sm:mb-4 flex-shrink-0 text-center ${rushHourBounceClass}`}>
          <span className="block text-[0.65rem] sm:text-xs font-sans uppercase tracking-[0.35em] text-electric-blue/80 mb-1">
            {isSolo || isSoloSetup ? 'Solo Challenge' : 'Only Talented Guessers'}
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-wider text-warning-yellow animate-goldPulseGlow">
            {canExitToHome ? (
              <button
                type="button"
                onClick={handleGoHome}
                className="cursor-pointer rounded-md transition-transform duration-200 hover:scale-[1.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-electric-blue"
                title="Back to home"
                aria-label="WordCrew — back to home"
              >
                WordCrew
              </button>
            ) : (
              'WordCrew'
            )}
          </h1>
          <p className="mt-1 sm:mt-2 text-base sm:text-lg text-muted-text font-sans">
            {isSolo || isSoloSetup
              ? soloPhase === 'playing' && soloTrack
                ? `${soloTrack.emoji} ${soloTrack.name} — type or say your guess before time runs out!`
                : 'Play solo, climb the CEFR ladder and top the leaderboard.'
              : 'Describe the word on screen to your partner before time runs out!'}
          </p>
        </header>
        <div className="relative flex min-h-0 w-full flex-grow flex-col">
          <main 
            className={`futuristic-card shadow-2xl rounded-xl w-full min-h-0 flex-grow overflow-y-auto ${getMainCardClass()}`}
          >
            <Suspense fallback={<ScreenFallback />}>
              {isSolo ? renderSoloScreen() : renderScreen()}
            </Suspense>
          </main>
          {canExitToHome && (
            <button
              type="button"
              onClick={handleGoHome}
              className="absolute right-1.5 top-1.5 z-10 flex h-11 w-11 items-center justify-center rounded-full text-muted-text transition-colors hover:bg-cyber-purple/40 hover:text-light-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-electric-blue"
              aria-label="Exit setup and return home"
              title="Exit setup"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-5 w-5 sm:h-6 sm:w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <footer className={`mt-3 sm:mt-4 text-xs sm:text-sm text-muted-text flex justify-between items-center w-full px-1 flex-shrink-0 ${rushHourBounceClass} max-w-4xl`}>
          <p className="footer-credit">Made by Mr. C <span role="img" aria-label="heart" className="text-danger-red">❤️</span></p>
          <div className="flex items-center fullscreen-toggle-container">
              <button
                  type="button"
                  onClick={toggleFullScreen}
                  className="p-1.5 rounded-full text-muted-text hover:text-light-text hover:bg-cyber-purple/50 transition-colors"
                  aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
                  title={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
              >
                  {isFullscreen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-4 w-4 sm:h-5 sm:w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25" />
                  </svg>
                  ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-4 w-4 sm:h-5 sm:w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9m11.25 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15m-11.25 4.5v-4.5m0 4.5h4.5m-4.5 0L9 15m11.25-11.25v4.5m0-4.5h-4.5m4.5 0L15 9" />
                  </svg>
                  )}
              </button>
          </div>
        </footer>
      </div>
      )}

      {/* Portal-level dialogs: reachable from the dashboard and from a game. */}
      <AuthDialog
        isOpen={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
        reason="Sign in to continue to checkout."
      />
      <PurchaseDialog
        isOpen={showPurchaseDialog}
        onClose={() => setShowPurchaseDialog(false)}
        onLicensed={() => {
          setShowPurchaseDialog(false);
          handleLicensed();
        }}
        onRequireSignIn={requestSignInForPurchase}
        suspendEscape={showAuthDialog}
        priceLabel={priceLabel}
      />
    </div>
  );
};

export default App;