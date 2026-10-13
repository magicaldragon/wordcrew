
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { LandingScreen } from './components/LandingScreen';
import { SetupScreen } from './components/SetupScreen';
import { InstructionScreen } from './components/InstructionScreen'; 
import { GameScreen } from './components/GameScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { BackgroundMusicPlayer } from './components/BackgroundMusicPlayer';
import { GamePhase, GameSettings, CustomSoundFile, GameMode } from './types';
import { 
    playSound, SINGLE_SOUND_EFFECTS, DEFAULT_MUSIC_VOLUME, CORRECT_SOUNDS, 
    SKIP_SOUNDS, BACKGROUND_MUSIC_URL, GAME_MUSIC_URL, DEFAULT_EFFECTS_VOLUME,
    readUnlockFlag, writeUnlockFlag, isUnlockCodeValid,
    readDemoRounds, incrementDemoRounds
} from './constants';

interface GameEndDetails {
  baseScore?: number; 
  timeBonus?: number;
  finalScore?: number;
  teamAScore?: number;
  teamBScore?: number;
}

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
  const previousGamePhase = usePrevious(gamePhase);

  // Landing (marketing) screen is shown before the game shell on a fresh load.
  const [showLanding, setShowLanding] = useState<boolean>(true);
  // Mode the player picked on the landing screen; pre-selected in SetupScreen.
  const [initialGameMode, setInitialGameMode] = useState<GameMode>(GameMode.NORMAL);
  // Single source of truth for the demo/full state. Mirrored to localStorage so a
  // classroom machine stays unlocked between sessions.
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => readUnlockFlag());
  // Demo rounds played on this device, used to escalate the results-screen nudge.
  const [demoRounds, setDemoRounds] = useState<number>(() => readDemoRounds());

  const handleUnlock = useCallback((code: string): boolean => {
    if (!isUnlockCodeValid(code)) return false;
    setIsUnlocked(true);
    writeUnlockFlag();
    return true;
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
  
  useEffect(() => {
    let newActiveMusicUrl: string | null = null; // Default to null (stop music / no change)

    if (gamePhase === GamePhase.PLAYING) {
        if (customGameMusic?.data) {
            newActiveMusicUrl = customGameMusic.data;
        } else if (Array.isArray(GAME_MUSIC_URL) && GAME_MUSIC_URL.length > 0) {
            newActiveMusicUrl = GAME_MUSIC_URL[Math.floor(Math.random() * GAME_MUSIC_URL.length)];
        } else if (typeof GAME_MUSIC_URL === 'string') {
            newActiveMusicUrl = GAME_MUSIC_URL;
        }
    } else if (gamePhase === GamePhase.SETUP) {
        // Set setup music if:
        // 1. Coming from a phase that isn't INSTRUCTION (e.g., RESULTS, PLAYING, or initial undefined)
        // 2. Or if custom background music has changed.
        if (previousGamePhase !== GamePhase.INSTRUCTION || (customBackgroundMusic && customBackgroundMusic.data !== activeMusicUrl)) {
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
    } else if (gamePhase === GamePhase.INSTRUCTION) {
        // If coming from SETUP, keep the current music.
        // Otherwise (e.g., direct navigation or custom music change), select setup music.
        if (previousGamePhase === GamePhase.SETUP) {
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
    // For GamePhase.RESULTS, newActiveMusicUrl remains its initial null, so music stops.
    // (Handled by default unless one of the above conditions sets it)

    if (newActiveMusicUrl !== activeMusicUrl) {
        setActiveMusicUrl(newActiveMusicUrl);
    }
  }, [gamePhase, customBackgroundMusic, customGameMusic, previousGamePhase, activeMusicUrl]);


  const saveJSON = useCallback((key: string, value: any) => {
    if (!initialLoadDone.current) return;
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error(`Error saving ${key} to localStorage:`, e);
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
  const handleEnterGame = useCallback((mode: GameMode = GameMode.NORMAL) => {
    setInitialGameMode(mode);
    setShowLanding(false);
  }, []);

  const handleBackToSetupFromInstruction = useCallback(() => {
    setIsAppRushHourActive(false); 
    setGamePhase(GamePhase.SETUP);
  }, []);


  const handleGameEnd = useCallback((details: { baseScore?: number; timeLeftSeconds?: number; teamAScore?: number; teamBScore?: number; }) => {
    let achievedScore = 0;
    // FIX: Replaced 'settings' with 'gameSettings' which is the correct state variable.
    let timeLeft = gameSettings?.totalTimeLimit ?? 0;

    if (gameSettings?.gameMode === GameMode.TEAM && details.teamAScore !== undefined && details.teamBScore !== undefined) {
      setGameEndDetails({
        teamAScore: details.teamAScore,
        teamBScore: details.teamBScore,
      });
      achievedScore = Math.max(details.teamAScore, details.teamBScore);
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
      timeLeft = timeLeftSeconds;
    }

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
  }, [customTimesUpSound, customGameOverSound, effectsVolume, gameSettings]);

  const handlePlayAgain = useCallback(() => {
    setGameSettings(null);
    setGameEndDetails(null);
    setIsAppRushHourActive(false); 
    setGamePhase(GamePhase.SETUP);
    playSound(customPlayAgainSound?.data || SINGLE_SOUND_EFFECTS.PLAY_AGAIN_SOUND, effectsVolume);
    setActiveMusicOverride(null); 
  }, [customPlayAgainSound, effectsVolume]);

  // Results screen "Home" button: return to the marketing/landing page.
  const handleGoHome = useCallback(() => {
    setGameSettings(null);
    setGameEndDetails(null);
    setIsAppRushHourActive(false);
    setActiveMusicOverride(null);
    setShowLanding(true);
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
            ? 'rush-hour-active-visuals border-2 border-danger-red/80 shadow-xl shadow-danger-red/40' // More intense for Hell Mode Rush
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
                  isFullscreen={isFullscreen}
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
  
  const rushHourBounceClass = isAppRushHourActive && gamePhase === GamePhase.PLAYING ? 'animate-rushHourBounce' : '';

  return (
    <div className={`h-screen bg-dark-metal flex flex-col items-center text-light-text selection:bg-cyber-purple selection:text-white overflow-hidden justify-center ${isFullscreen || showLanding ? 'p-0' : 'p-2 sm:p-3'}`}>
      <BackgroundMusicPlayer 
        volume={musicVolume} 
        musicUrl={showLanding ? null : (activeMusicOverride || activeMusicUrl)} 
      />
      {showLanding ? (
        <LandingScreen isUnlocked={isUnlocked} onUnlock={handleUnlock} onPlay={handleEnterGame} />
      ) : (
      <div className="container mx-auto w-full flex flex-col h-full max-w-4xl">
        <header className={`mb-3 sm:mb-4 flex-shrink-0 text-center ${rushHourBounceClass}`}>
          <span className="block text-[0.65rem] sm:text-xs font-sans uppercase tracking-[0.35em] text-electric-blue/80 mb-1">
            Only Talented Guessers
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-wider text-warning-yellow animate-goldPulseGlow">
            WordCrew
          </h1>
          <p className="mt-1 sm:mt-2 text-md sm:text-lg text-muted-text font-sans">
            Describe the word on screen to your partner before time runs out!
          </p>
        </header>
        <main 
          className={`futuristic-card shadow-2xl rounded-xl w-full flex-grow overflow-y-auto ${getMainCardClass()}`}
        >
          {renderScreen()}
        </main>
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
    </div>
  );
};

export default App;