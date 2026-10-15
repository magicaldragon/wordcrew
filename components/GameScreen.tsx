
import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { GameSettings, CustomSoundFile, GameMode } from '../types'; 
import CircularTimer from './CircularTimer'; // Import CircularTimer
import { VolumeControls } from './VolumeControls';
import { Icon } from './Icon';
import { 
    playSound, CORRECT_SOUNDS, SKIP_SOUNDS, SINGLE_SOUND_EFFECTS,
    COMBO_ACTIVATION_THRESHOLD, COMBO_POINT_BONUS, 
    COMBO_TIME_BONUS_THRESHOLD, COMBO_TIME_BONUS_SECONDS, MAX_COMBO_TIME_BONUS_APPLICATIONS,
    POWERUP_TIME_FREEZE_SECONDS, RUSH_HOUR_DURATION_SECONDS, FINAL_COUNTDOWN_SECONDS,
    HELL_MODE_INITIAL_SKIPS, HELL_MODE_SKIP_PENALTY, HELL_MODE_LUCKY_SKIP_PENALTY,
    ANNOUNCER_CALLOUTS, ANNOUNCER_STREAK_MILESTONES
} from '../constants';
import { resolveVietnameseHint } from '../vietnameseMeanings';
import { resolveEnglishSynonym } from '../services/synonyms';

type WordDisplayStatus = 'default' | 'correct' | 'skipped'; 
type Team = 'A' | 'B';

interface PointsAwardedAnimation {
    points: number;
    isLucky: boolean;
    isCombo: boolean;
    isRushHourBonus: boolean;
    isPenalty?: boolean; // For Hell Mode skips
    key: number; // Links animation to a specific word key
}

// FIX: Add missing interface definition for component state.
interface CatAnimationPosition {
  top: number;
  left: number;
}

// FIX: Add missing interface definition for component state.
interface StarEffect {
  id: number;
  x: string;
  y: string;
  delay: string;
}


interface WordCardProps {
  word: string;
  wordKey: number; 
  animationClass?: string; 
  animationKey?: number; 
  status: WordDisplayStatus; 
  isBouncing?: boolean; 
  pointsAwardedAnim: PointsAwardedAnimation | null;
  pointAnimationKey: number;
  wordCardRef: React.RefObject<HTMLDivElement>;
  isTeamMode: boolean;
  textColorClass?: string;
  isWordVisible: boolean;
  // Shown under the word once the describer has been stuck for a while: a mild
  // English synonym first, then the Vietnamese gloss. Kept out of the auto-fit box
  // so a long hint can never shrink the word itself.
  meaningHint?: string;
}

const WordCardBase: React.FC<WordCardProps> = ({ word, wordKey, animationClass, animationKey, status, isBouncing, pointsAwardedAnim, pointAnimationKey, wordCardRef, isTeamMode, textColorClass, isWordVisible, meaningHint }) => {
  const getCardStyling = () => { 
    switch (status) { 
      case 'correct':
        return 'animate-correctFlash'; 
      case 'skipped':
        return 'animate-skipFlash'; 
      default:
        return '';
    }
  };
  
  // Auto-fit: measure the available box and scale the word so it never spills out of
  // the card, regardless of word length or viewport size. Replaces the old fixed
  // clamp(vw) sizing that overflowed for wide words (e.g. "mother").
  const measureBoxRef = useRef<HTMLDivElement>(null);
  const wordTextRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const box = measureBoxRef.current;
    const textEl = wordTextRef.current;
    if (!box || !textEl || !isWordVisible || !word) return;

    const fit = () => {
      const availableW = box.clientWidth;
      const availableH = box.clientHeight;
      if (availableW <= 0 || availableH <= 0) return;

      // Measure the word at a fixed reference size, then scale it to fit both axes.
      const REFERENCE_PX = 100;
      textEl.style.setProperty('font-size', `${REFERENCE_PX}px`, 'important');
      const textW = textEl.scrollWidth;
      const textH = textEl.scrollHeight;
      if (textW <= 0 || textH <= 0) return;

      const scale = Math.min((availableW * 0.9) / textW, (availableH * 0.85) / textH);
      const fitted = Math.max(14, Math.round(REFERENCE_PX * scale));
      // Inline !important so it also wins over the short-landscape CSS override.
      textEl.style.setProperty('font-size', `${fitted}px`, 'important');
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    // Webfonts change the metrics after first paint — re-fit once Orbitron is ready.
    if (document.fonts?.ready) {
      document.fonts.ready.then(fit).catch(() => {});
    }
    return () => observer.disconnect();
  }, [word, isWordVisible, animationKey]);

  const getPointsAnimationEmoji = () => {
    if (!pointsAwardedAnim) return "";
    if (pointsAwardedAnim.isPenalty) return "💔";
    let emoji = "";
    if (isTeamMode && pointsAwardedAnim.isCombo) { // Repurposed for speed bonus
      emoji += "⚡";
    }
    if (pointsAwardedAnim.isLucky) emoji += "🌟";
    if (!isTeamMode && pointsAwardedAnim.isCombo) { // Original combo
      emoji += "🔥";
    }
    if (pointsAwardedAnim.isRushHourBonus) emoji += "💎";
    if (!emoji && pointsAwardedAnim.points > 0) emoji = "👍";
    return emoji;
  };

  const getPointsClassName = () => {
    if (!pointsAwardedAnim) return '';
    return `${
        pointsAwardedAnim.isPenalty ? 'text-danger-red font-extrabold text-3xl sm:text-4xl' :
        (pointsAwardedAnim.isLucky || pointsAwardedAnim.isCombo || pointsAwardedAnim.isRushHourBonus) 
        ? 'text-warning-yellow font-extrabold text-3xl sm:text-4xl' 
        : 'text-neon-green font-bold text-2xl sm:text-3xl'
    }`;
  };


  const cardFlashClass = getCardStyling();
  const bounceClass = isBouncing ? 'animate-rushHourBounce' : '';
  const wordStyle = {
    textShadow: isTeamMode
      ? '0 2px 8px rgba(0, 0, 0, 0.7)' // Darker shadow for better contrast on colors
      : '0 0 12px rgba(234, 234, 234, 0.6)' // Original light glow
  };

  return (
    <div
      key={wordKey}
      ref={wordCardRef}
      className={`relative futuristic-card text-light-text p-2 sm:p-2 md:p-3 rounded-[var(--r-xl)] w-full h-full flex items-center justify-center animate-fadeInScaleUp ${cardFlashClass} ${bounceClass} word-card-animated-border`}
    >
      <div ref={measureBoxRef} className="word-animation-container flex items-center justify-center">
        <div className="relative max-w-full">
            <p
              key={animationKey} 
              ref={wordTextRef}
              className={`font-heading font-bold text-center leading-none whitespace-nowrap ${animationClass || ''} ${textColorClass || 'text-light-text'}`}
              style={wordStyle}
            >
              {isWordVisible ? word : ''}
            </p>
            {pointsAwardedAnim && pointsAwardedAnim.key === wordKey && (
                <span 
                key={pointAnimationKey}
                className={`absolute top-0 left-full z-20 whitespace-nowrap animate-floatUpAndAway ${getPointsClassName()}`}
                aria-hidden="true"
                >
                {getPointsAnimationEmoji()}
                {pointsAwardedAnim.points > 0 && !pointsAwardedAnim.isPenalty ? "+" : ""}
                {pointsAwardedAnim.points}
                </span>
            )}
        </div>
      </div>
      {isWordVisible && meaningHint && (
        <p
          className="absolute bottom-8 left-1/2 z-10 max-w-[92%] -translate-x-1/2 text-center text-sm font-semibold text-neon-green sm:text-lg animate-fadeInScaleUp pointer-events-none"
          style={{ textShadow: '0 1px 6px rgba(0, 0, 0, 0.85)' }}
        >
          {meaningHint}
        </p>
      )}
      {!isWordVisible && (
        <p className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs text-light-text/50 tracking-wide select-none pointer-events-none">
          Hold SPACE or the card to reveal
        </p>
      )}
    </div>
  );
};

// Memoised: the parent re-renders every clock tick, but the card only changes when its own
// props do (word, status, reveal state, hint) — so it skips those re-renders entirely.
const WordCard = React.memo(WordCardBase);

// ... (other interfaces)

interface GameScreenProps {
  settings: GameSettings;
  onGameEnd: (details: { baseScore: number; timeLeftSeconds: number } | { teamAScore: number; teamBScore: number }) => void;
  effectsVolume: number; 
  customCorrectSounds: CustomSoundFile[];
  customSkipSounds: CustomSoundFile[];
  customCountdownGoSound: CustomSoundFile | null; 
  customPowerupCollectedSound?: CustomSoundFile | null;
  customPowerupTimeFreezeSound?: CustomSoundFile | null;
  customPowerupSkipFreebieUsedSound?: CustomSoundFile | null;
  customRushHourActivationSound?: CustomSoundFile | null;
  customRushHourMusicLoop?: CustomSoundFile | null; 
  setActiveMusicOverride: (url: string | null) => void; 
  onSetRushHourActiveVisuals: (isActive: boolean) => void; 
  isAppRushHourActive: boolean; 
  isDemo?: boolean;
  musicVolume: number;
  onMusicVolumeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onEffectsVolumeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

// ... (constants and helper functions)
const COUNTDOWN_STEPS = ["3", "2", "1", "GO!"];
const LUCKY_STAR_MULTIPLIERS = [3]; 
const TARGET_LUCKY_STARS = 4;
// Anti-cheat: from ẩn sau khi hiện trong bao lâu (ms). Giữ Space hoặc nhấn giữ card để xem lại.
const WORD_AUTO_HIDE_MS = 4000;
// Struggle hint, in two tiers: after STRUGGLE_HINT_AFTER_MS a mild English synonym is
// unlocked, and after STRUGGLE_HINT_FULL_AFTER_MS the Vietnamese gloss unlocks too.
// Both only surface while the describer is peeking, so a confident player never sees them.
const STRUGGLE_HINT_AFTER_MS = 12000;
const STRUGGLE_HINT_FULL_AFTER_MS = 18000;

const getCountdownAnimationClass = (text: string): string => {
    const mainNumericStyle = "text-8xl sm:text-9xl md:text-9xl font-extrabold font-heading text-light-text"; // Increased font size and set color to white
    if (["3", "2", "1"].includes(text)) {
      return `animate-countdownPulse ${mainNumericStyle}`;
    }
    if (text === "GO!") {
      return `animate-goEffect ${mainNumericStyle}`;
    }
    return ''; 
  };
// ... (GameMessage interface and getMessageStyling)
interface GameMessage {
    text: string;
    key: number;
    type: 'comboActivate' | 'timeBonus' | 'powerUpFeedback' | 'rushHour' | 'rushHourOver' | 'hellModeWarning';
}

interface WordTextAnimationState {
  type: 'correct' | 'skip';
  key: number;
}
const getMessageStyling = (type: GameMessage['type']): string => {
    switch (type) {
        case 'rushHour':
            return 'text-2xl sm:text-3xl md:text-4xl font-heading font-extrabold text-danger-red animate-fastRushTextGlow filter drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)]';
        case 'rushHourOver':
            return 'text-2xl sm:text-3xl md:text-4xl font-heading font-extrabold text-danger-red animate-flash filter drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)] [text-shadow:0_0_8px_#F87171]';
        case 'comboActivate':
            return 'bg-orange-500/90 text-white animate-comboActivatePop text-lg sm:text-xl md:text-2xl font-bold p-1.5 sm:p-2 rounded-lg';
        case 'timeBonus':
            return 'bg-blue-500/90 text-white animate-timeBonusFloatUp text-base sm:text-lg md:text-xl font-semibold p-1.5 sm:p-2 rounded-lg';
        case 'powerUpFeedback':
            return 'bg-purple-600/90 text-white animate-powerUpAppear text-base sm:text-lg font-semibold p-1.5 sm:p-2 rounded-lg';
        case 'hellModeWarning':
            return 'bg-red-700/90 text-white animate-powerUpAppear text-base sm:text-lg font-semibold p-1.5 sm:p-2 rounded-lg border-2 border-red-400';
        default:
            return 'text-base p-1 sm:p-1.5 rounded-lg'; 
    }
};

export const GameScreen: React.FC<GameScreenProps> = ({ 
    settings, 
    onGameEnd,
    effectsVolume, 
    customCorrectSounds,
    customSkipSounds,
    customCountdownGoSound,
    // ... (rest of props)
    customPowerupCollectedSound,
    customPowerupTimeFreezeSound,
    customPowerupSkipFreebieUsedSound,
    customRushHourActivationSound,
    customRushHourMusicLoop, 
    setActiveMusicOverride, 
    onSetRushHourActiveVisuals,
    isAppRushHourActive, 
    isDemo = false,
    musicVolume,
    onMusicVolumeChange,
    onEffectsVolumeChange,
}) => {
  const isTeamMode = settings.gameMode === GameMode.TEAM;
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [shuffledWords, setShuffledWords] = useState<string[]>([]); 
  const [wordKey, setWordKey] = useState(0); 
  const [gameTimeLeft, setGameTimeLeft] = useState(settings.totalTimeLimit);
  const [wordStatus, setWordStatus] = useState<WordDisplayStatus>('default'); 
  const [isProcessingWord, setIsProcessingWord] = useState(false);

  const [countdownStepIndex, setCountdownStepIndex] = useState(0);
  const [showGameUI, setShowGameUI] = useState(false);
  
  const [pointsAwardedAnim, setPointsAwardedAnim] = useState<PointsAwardedAnimation | null>(null);
  const [pointAnimationKey, setPointAnimationKey] = useState(0);
  const wordCardRef = useRef<HTMLDivElement>(null);

  const [catAnimationType, setCatAnimationType] = useState<'happy' | 'sad' | null>(null);
  const [catAnimPosition, setCatAnimPosition] = useState<CatAnimationPosition | null>(null);
  const catAnimationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [starEffects, setStarEffects] = useState<StarEffect[]>([]);
  const starEffectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownAudioRef = useRef<HTMLAudioElement | null>(null);
  const [gameMessage, setGameMessage] = useState<GameMessage | null>(null);
  const gameMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [wordTextAnimation, setWordTextAnimation] = useState<WordTextAnimationState | null>(null);
  const wordTextAnimationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [timeUpEffect, setTimeUpEffect] = useState(false);

  // == Single Player Mode State ==
  const [currentScore, setCurrentScore] = useState(0);
  const [luckyWordMultipliers, setLuckyWordMultipliers] = useState<Map<number, number>>(new Map());
  const [currentComboStreak, setCurrentComboStreak] = useState(0);
  const [isComboActive, setIsComboActive] = useState(false);
  const [comboTimeBonusesAppliedThisGame, setComboTimeBonusesAppliedThisGame] = useState(0);
  const [isTimerFrozen, setIsTimerFrozen] = useState(false); 
  const [skipFreebiesAvailable, setSkipFreebiesAvailable] = useState(0); 
  const [lastTimeFreezeComboMilestone, setLastTimeFreezeComboMilestone] = useState(0);
  const [lastSkipFreebieComboMilestone, setLastSkipFreebieComboMilestone] = useState(0);
  const [isRushHourActiveState, setIsRushHourActiveState] = useState(false); 
  const [rushHourEndTime, setRushHourEndTime] = useState<number | null>(null);
  const [lastRushHourTriggerFlag, setLastRushHourTriggerFlag] = useState(0); 
  const wasRushHourActivePrev = useRef(false); 
  const [remainingSkipsHellMode, setRemainingSkipsHellMode] = useState(0);

  // == Team Mode State ==
  const [teamScores, setTeamScores] = useState({ A: 0, B: 0 });
  const [currentTurn, setCurrentTurn] = useState<Team>('A');
  const [wordStartTime, setWordStartTime] = useState<number>(0);
  const [teamMilestones, setTeamMilestones] = useState({ A: 0, B: 0 });
  const [permanentBuffs, setPermanentBuffs] = useState({
    A: { extraPointsPerWord: 0, pointsFromOpponentSkip: 0 },
    B: { extraPointsPerWord: 0, pointsFromOpponentSkip: 0 },
  });
  const [isGamePaused, setIsGamePaused] = useState(false);
  const [surpriseBoxInfo, setSurpriseBoxInfo] = useState<{ team: Team } | null>(null);
  // Player-facing pause menu (Esc / ⏸ button) + in-game "end game?" confirmation.
  const [isPauseMenuOpen, setIsPauseMenuOpen] = useState(false);
  const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);
  // Anything that must freeze the timers and block round input.
  const isPaused = isGamePaused || isPauseMenuOpen || showEndGameConfirm;
  const [revealedEffect, setRevealedEffect] = useState<{ id: string; description: string } | null>(null);
  const [turnTimeLeft, setTurnTimeLeft] = useState(settings.timePerWord ?? 20);

  // Anti-cheat (hot-seat): từ chỉ hiện tạm thời rồi ẩn; giữ để xem lại.
  const [isWordAutoRevealed, setIsWordAutoRevealed] = useState(false);
  const [isPeeking, setIsPeeking] = useState(false);


  const gameTimerIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turnTimerIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wordProcessingTimerIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onGameEndRef = useRef(onGameEnd);
  const setActiveMusicOverrideRef = useRef(setActiveMusicOverride);
  // Latest volume / countdown sound, read by the round-reset effect *without* being a
  // dependency of it. Otherwise dragging the Effects slider in the pause menu would
  // re-run the reset effect and restart the round from scratch.
  const effectsVolumeRef = useRef(effectsVolume);
  const customCountdownGoSoundRef = useRef(customCountdownGoSound);
  // A round must only ever be scored once (timer, pool exhaustion, manual end).
  const endedRef = useRef(false);

  const gameScreenRootRef = useRef<HTMLDivElement>(null);
  const correctButtonRef = useRef<HTMLButtonElement>(null);
  const skipButtonRef = useRef<HTMLButtonElement>(null);
  const teamAScoreBoxRef = useRef<HTMLDivElement>(null);
  const teamBScoreBoxRef = useRef<HTMLDivElement>(null);

    // ... (useEffect for onGameEndRef and setActiveMusicOverrideRef)
  useEffect(() => {
    onGameEndRef.current = onGameEnd;
  }, [onGameEnd]);

  useEffect(() => {
    setActiveMusicOverrideRef.current = setActiveMusicOverride;
  }, [setActiveMusicOverride]);

  // Mirror the two props the reset effect reads into refs, so the reset only fires on a
  // genuine new round (settings / mode) rather than on every volume tweak.
  useEffect(() => {
    effectsVolumeRef.current = effectsVolume;
    customCountdownGoSoundRef.current = customCountdownGoSound;
  }, [effectsVolume, customCountdownGoSound]);


  useEffect(() => {
    endedRef.current = false;
    const array = [...settings.words]; 
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    setShuffledWords(array); 

    // Reset all state
    setCurrentWordIndex(0);
    setGameTimeLeft(settings.totalTimeLimit);
    setWordKey(k => k + 1);
    setWordStatus('default');
    setIsProcessingWord(false);
    setCountdownStepIndex(0); 
    setShowGameUI(false);
    setCatAnimationType(null);
    setCatAnimPosition(null);
    setStarEffects([]);
    setPointsAwardedAnim(null);
    setGameMessage(null);
    setWordTextAnimation(null);
    setTimeUpEffect(false);
    onSetRushHourActiveVisuals(false); 
    setActiveMusicOverrideRef.current(null);
    setIsPauseMenuOpen(false);
    setShowEndGameConfirm(false);

    if (isTeamMode) {
        setTurnTimeLeft(settings.timePerWord ?? 20);
        setTeamScores({ A: 0, B: 0 });
        setCurrentTurn('A');
        setTeamMilestones({ A: 0, B: 0 });
        setPermanentBuffs({
            A: { extraPointsPerWord: 0, pointsFromOpponentSkip: 0 },
            B: { extraPointsPerWord: 0, pointsFromOpponentSkip: 0 },
        });
        setIsGamePaused(false);
        setSurpriseBoxInfo(null);
        setRevealedEffect(null);
    } else {
        // ... (single player reset logic)
        setCurrentScore(0);
        const numWords = array.length;
        const targetLuckyCount = Math.min(TARGET_LUCKY_STARS, numWords);
        const newLuckyMultipliers = new Map<number, number>();
        const availableIndices = Array.from({ length: numWords }, (_, i) => i);
        const shuffledForPhase1 = [...availableIndices].sort(() => 0.5 - Math.random());
        for (const index of shuffledForPhase1) {
            if (newLuckyMultipliers.size >= targetLuckyCount) break;
            const isConsecutive = newLuckyMultipliers.has(index - 1) || newLuckyMultipliers.has(index + 1);
            if (!newLuckyMultipliers.has(index) && !isConsecutive) {
                const multiplier = LUCKY_STAR_MULTIPLIERS[Math.floor(Math.random() * LUCKY_STAR_MULTIPLIERS.length)];
                newLuckyMultipliers.set(index, multiplier);
            }
        }
        if (newLuckyMultipliers.size < targetLuckyCount) {
            const remainingNeeded = targetLuckyCount - newLuckyMultipliers.size;
            const stillAvailableForPicking = availableIndices.filter(i => !newLuckyMultipliers.has(i));
            const shuffledForPhase2 = stillAvailableForPicking.sort(() => 0.5 - Math.random());
            for (let i = 0; i < Math.min(remainingNeeded, shuffledForPhase2.length); i++) {
                const indexToSet = shuffledForPhase2[i];
                const multiplier = LUCKY_STAR_MULTIPLIERS[Math.floor(Math.random() * LUCKY_STAR_MULTIPLIERS.length)];
                newLuckyMultipliers.set(indexToSet, multiplier);
                if (newLuckyMultipliers.size >= targetLuckyCount) break;
            }
        }
        setLuckyWordMultipliers(newLuckyMultipliers);
        setCurrentComboStreak(0);
        setIsComboActive(false);
        setComboTimeBonusesAppliedThisGame(0);
        setIsTimerFrozen(false);
        setSkipFreebiesAvailable(0); 
        setLastTimeFreezeComboMilestone(0);
        setLastSkipFreebieComboMilestone(0);
        setIsRushHourActiveState(false);
        setRushHourEndTime(null);
        setLastRushHourTriggerFlag(0); 
        wasRushHourActivePrev.current = false;
        if (settings.gameMode === GameMode.HELL) {
          setRemainingSkipsHellMode(HELL_MODE_INITIAL_SKIPS);
        } else {
          setRemainingSkipsHellMode(0);
        }
    }

    const soundUrl = customCountdownGoSoundRef.current?.data || SINGLE_SOUND_EFFECTS.COUNTDOWN_GO;
    if (soundUrl) {
      if (countdownAudioRef.current && countdownAudioRef.current.src === soundUrl) {
        if (countdownAudioRef.current.paused && countdownAudioRef.current.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
            countdownAudioRef.current.load(); 
        }
        countdownAudioRef.current.volume = effectsVolumeRef.current; 
      } else {
        if (countdownAudioRef.current) {
          countdownAudioRef.current.pause(); 
        }
        countdownAudioRef.current = new Audio(soundUrl);
        countdownAudioRef.current.preload = 'auto';
        countdownAudioRef.current.volume = effectsVolumeRef.current; 
        countdownAudioRef.current.load(); 
      }
    } else {
      if (countdownAudioRef.current) {
        countdownAudioRef.current.pause();
        countdownAudioRef.current.src = ''; 
      }
    }

    return () => {
      if (gameTimerIdRef.current) clearInterval(gameTimerIdRef.current);
      if (turnTimerIdRef.current) clearInterval(turnTimerIdRef.current);
      if (countdownTimerIdRef.current) clearTimeout(countdownTimerIdRef.current);
      if (wordProcessingTimerIdRef.current) clearTimeout(wordProcessingTimerIdRef.current);
      if (catAnimationTimerRef.current) clearTimeout(catAnimationTimerRef.current);
      if (starEffectTimerRef.current) clearTimeout(starEffectTimerRef.current);
      if (gameMessageTimerRef.current) clearTimeout(gameMessageTimerRef.current);
      if (wordTextAnimationTimerRef.current) clearTimeout(wordTextAnimationTimerRef.current);
      onSetRushHourActiveVisuals(false); 
      setActiveMusicOverrideRef.current(null); 
    };
  }, [settings, isTeamMode, onSetRushHourActiveVisuals]); 

  // ... (countdown useEffect)
    useEffect(() => {
    if (countdownTimerIdRef.current) clearTimeout(countdownTimerIdRef.current);
    if (countdownStepIndex >= COUNTDOWN_STEPS.length) { 
      setShowGameUI(true);
      if (isTeamMode) setWordStartTime(Date.now());
      return; 
    }
    
    if (countdownStepIndex === 0) { 
      const currentSoundUrl = customCountdownGoSoundRef.current?.data || SINGLE_SOUND_EFFECTS.COUNTDOWN_GO;
      if (countdownAudioRef.current && countdownAudioRef.current.src && countdownAudioRef.current.src === currentSoundUrl) {
        countdownAudioRef.current.currentTime = 0; 
        countdownAudioRef.current.volume = effectsVolumeRef.current; 
        const playPromise = countdownAudioRef.current.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
                }
            });
        }
      } else if (currentSoundUrl) { 
        playSound(currentSoundUrl, effectsVolumeRef.current); 
      }
    }

    countdownTimerIdRef.current = setTimeout(() => {
      setCountdownStepIndex(prev => prev + 1);
    }, 1000); 

    return () => {
      if (countdownTimerIdRef.current) clearTimeout(countdownTimerIdRef.current);
    };
  }, [countdownStepIndex, isTeamMode]); 

  // FIX: Hoisted helper functions (`triggerGameMessage`, `triggerHappyAnimations`, `triggerSadAnimation`) to be declared before they are used inside the `advanceWord` useCallback hook, resolving a block-scoped variable error.
  const triggerGameMessage = useCallback((text: string, type: GameMessage['type'], duration: number = 2000) => {
    setGameMessage({ text, key: Date.now(), type });
    if (gameMessageTimerRef.current) clearTimeout(gameMessageTimerRef.current);
    const actualDuration = (type === 'rushHour' || type === 'rushHourOver') ? Math.max(duration, 1500) : duration;
    gameMessageTimerRef.current = setTimeout(() => setGameMessage(null), actualDuration);
  }, []);

  const triggerHappyAnimations = useCallback(() => {
    if (!correctButtonRef.current || !gameScreenRootRef.current) return;
    const buttonRect = correctButtonRef.current.getBoundingClientRect();
    const gameAreaRect = gameScreenRootRef.current.getBoundingClientRect();
    const catEmojiHeight = 60; 
    const catEmojiWidth = 80; 
    setCatAnimPosition({
      top: buttonRect.top - gameAreaRect.top - catEmojiHeight, 
      left: buttonRect.left - gameAreaRect.left + (buttonRect.width / 2) - (catEmojiWidth / 2),
    });
    setCatAnimationType('happy');
    if (catAnimationTimerRef.current) clearTimeout(catAnimationTimerRef.current);
    catAnimationTimerRef.current = setTimeout(() => {
      setCatAnimationType(null);
      setCatAnimPosition(null);
    }, 800);

    const buttonCenterXRel = buttonRect.left - gameAreaRect.left + buttonRect.width / 2;
    const buttonTopRel = buttonRect.top - gameAreaRect.top;
    const numStars = 5;
    const starBaseSpread = 40;
    const newStarsArray: StarEffect[] = Array.from({ length: numStars }).map((_, i) => ({
      id: Date.now() + i,
      x: `${((buttonCenterXRel + (Math.random() * starBaseSpread) - (starBaseSpread / 2)) / gameAreaRect.width) * 100}%`,
      y: `${((buttonTopRel - (Math.random() * starBaseSpread * 0.2)) / gameAreaRect.height) * 100}%`,
      delay: `${Math.random() * 0.3}s`,
    }));
    setStarEffects(newStarsArray);
    if (starEffectTimerRef.current) clearTimeout(starEffectTimerRef.current);
    starEffectTimerRef.current = setTimeout(() => setStarEffects([]), 1000);
  }, []);

  const triggerSadAnimation = useCallback(() => {
     if (!skipButtonRef.current || !gameScreenRootRef.current) return;
    const buttonRect = skipButtonRef.current.getBoundingClientRect();
    const gameAreaRect = gameScreenRootRef.current.getBoundingClientRect();
    const sadEmojiHeight = 60; 
    const sadEmojiWidth = 80; 
    setCatAnimPosition({
      top: buttonRect.top - gameAreaRect.top - sadEmojiHeight,
      left: buttonRect.left - gameAreaRect.left + (buttonRect.width / 2) - (sadEmojiWidth / 2),
    });
    setCatAnimationType('sad');
    if (catAnimationTimerRef.current) clearTimeout(catAnimationTimerRef.current);
    catAnimationTimerRef.current = setTimeout(() => {
        setCatAnimationType(null);
        setCatAnimPosition(null);
    }, 800);
  }, []);

  // Scores the round exactly once. Every end path (clock, word pool, manual) funnels
  // through here so a double-fire can never post two results.
  const endGameOnce = useCallback((details: { baseScore: number; timeLeftSeconds: number } | { teamAScore: number; teamBScore: number }) => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (gameTimerIdRef.current) clearInterval(gameTimerIdRef.current);
    if (turnTimerIdRef.current) clearInterval(turnTimerIdRef.current);
    onGameEndRef.current(details);
  }, []);

  // Rush Hour can start from a score milestone (Normal) or off the clock (Hell). One
  // helper keeps the activation song, banner and music override in sync for both.
  const startRushHour = useCallback(() => {
    setIsRushHourActiveState(true);
    setRushHourEndTime(Date.now() + RUSH_HOUR_DURATION_SECONDS * 1000);
    playSound(customRushHourActivationSound || SINGLE_SOUND_EFFECTS.RUSH_HOUR_ACTIVATED, effectsVolumeRef.current);
    triggerGameMessage("💎 RUSH HOUR !", 'rushHour', RUSH_HOUR_DURATION_SECONDS * 1000);

    let musicToPlay: string | null = null;
    const rushMusicSource = customRushHourMusicLoop?.data || SINGLE_SOUND_EFFECTS.RUSH_HOUR_MUSIC_LOOP;
    if (Array.isArray(rushMusicSource) && rushMusicSource.length > 0) {
        musicToPlay = rushMusicSource[Math.floor(Math.random() * rushMusicSource.length)];
    } else if (typeof rushMusicSource === 'string') {
        musicToPlay = rushMusicSource;
    }
    if (musicToPlay) setActiveMusicOverrideRef.current(musicToPlay);
  }, [customRushHourActivationSound, customRushHourMusicLoop, triggerGameMessage]);

  // FIX: Moved 'advanceWord' declaration before its usage in useEffect hooks.
  const advanceWord = useCallback((isCorrectGuess: boolean) => {
    if (isProcessingWord || !showGameUI) return;
    
    if (isTeamMode) {
        if (isPaused) return;
        setIsProcessingWord(true);
        if (turnTimerIdRef.current) clearInterval(turnTimerIdRef.current);
        let awardedPointsThisTurn = 0;
        let wasSpeedBonus = false;

        if (isCorrectGuess) {
            const wordDurationSeconds = (Date.now() - wordStartTime) / 1000;
            let basePoints = 100 + permanentBuffs[currentTurn].extraPointsPerWord;
            let speedBonus = 0;
            if (wordDurationSeconds < 5) {
                speedBonus = 50; wasSpeedBonus = true;
            } else if (wordDurationSeconds <= 10) {
                speedBonus = 20; wasSpeedBonus = true;
            }
            awardedPointsThisTurn = basePoints + speedBonus;
            setWordStatus('correct');
            setWordTextAnimation({ type: 'correct', key: Date.now() });
            triggerHappyAnimations();
        } else { // Skipped
            playSound(customSkipSounds.length > 0 ? customSkipSounds : SKIP_SOUNDS, effectsVolume);
            // A skip must never push a team's score below zero: the 30-point penalty
            // is capped at whatever the team still has.
            awardedPointsThisTurn = -Math.min(30, Math.max(0, teamScores[currentTurn]));
            const opponent: Team = currentTurn === 'A' ? 'B' : 'A';
            const opponentBonus = permanentBuffs[opponent].pointsFromOpponentSkip;
            if (opponentBonus > 0) {
                setTeamScores(prev => ({ ...prev, [opponent]: prev[opponent] + opponentBonus }));
            }
            setWordStatus('skipped');
            setWordTextAnimation({ type: 'skip', key: Date.now() });
            triggerSadAnimation();
        }
        
        // A fully-absorbed penalty (team already at 0) awards nothing, so there is no
        // floating number worth showing.
        if (awardedPointsThisTurn !== 0) {
          setPointAnimationKey(prevKey => prevKey + 1);
          setPointsAwardedAnim({
              points: awardedPointsThisTurn,
              isLucky: false,
              isCombo: wasSpeedBonus,
              isRushHourBonus: false,
              isPenalty: awardedPointsThisTurn < 0,
              key: wordKey,
          });
          setTimeout(() => setPointsAwardedAnim(null), 1500);
        }

        setTeamScores(prev => ({ ...prev, [currentTurn]: Math.max(0, prev[currentTurn] + awardedPointsThisTurn) }));
        
        const scoreAfterThisTurn = Math.max(0, teamScores[currentTurn] + awardedPointsThisTurn);
        const lastMilestone = teamMilestones[currentTurn];
        const nextMilestone = (Math.floor(lastMilestone / 500) + 1) * 500;

        if (isCorrectGuess && scoreAfterThisTurn >= nextMilestone && nextMilestone > 0) {
            setTeamMilestones(prev => ({ ...prev, [currentTurn]: nextMilestone }));
            setIsGamePaused(true);
            setSurpriseBoxInfo({ team: currentTurn });
            setIsProcessingWord(false);
        } else {
            wordProcessingTimerIdRef.current = setTimeout(() => {
                const isGameOver = currentWordIndex + 1 >= shuffledWords.length;
                if (isGameOver) {
                    const finalTeamScores = { ...teamScores };
                    finalTeamScores[currentTurn] += awardedPointsThisTurn;
                    endGameOnce({ teamAScore: finalTeamScores.A, teamBScore: finalTeamScores.B });
                } else {
                    setCurrentWordIndex(prev => prev + 1);
                    setWordKey(prev => prev + 1);
                    setCurrentTurn(prev => (prev === 'A' ? 'B' : 'A'));
                    setWordStartTime(Date.now());
                    setTurnTimeLeft(settings.timePerWord ?? 20);
                    setIsProcessingWord(false);
                }
            }, 800);
        }
        return;
    }


    // --- Single Player Logic ---
    setIsProcessingWord(true);
    let newScore = currentScore;
    let awardedPointsThisTurn = 0;
    let wasLucky = false;
    let wasComboBonus = false;
    let wasRushHourBonusThisTurn = false; 
    let wasPenalty = false;
    const scoreBeforeThisWord = currentScore; 

    if (isCorrectGuess) {
      let basePointsForWord = 100;
      if (luckyWordMultipliers.has(currentWordIndex)) {
        wasLucky = true;
        const multiplier = luckyWordMultipliers.get(currentWordIndex) || 1;
        basePointsForWord = 100 * multiplier;
      }
      awardedPointsThisTurn += basePointsForWord;
      const newStreak = currentComboStreak + 1;
      setCurrentComboStreak(newStreak);
      if (newStreak >= COMBO_ACTIVATION_THRESHOLD) {
        if (!isComboActive) {
             playSound(customPowerupCollectedSound || SINGLE_SOUND_EFFECTS.POWERUP_COLLECTED, effectsVolume); 
             triggerGameMessage(`COMBO ${newStreak}x ACTIVE!`, 'comboActivate');
        }
        setIsComboActive(true);
        awardedPointsThisTurn += COMBO_POINT_BONUS;
        wasComboBonus = true;
        if (settings.gameMode === GameMode.NORMAL && newStreak === COMBO_TIME_BONUS_THRESHOLD && comboTimeBonusesAppliedThisGame < MAX_COMBO_TIME_BONUS_APPLICATIONS) {
          const newTime = Math.min(settings.totalTimeLimit, gameTimeLeft + COMBO_TIME_BONUS_SECONDS);
          setGameTimeLeft(newTime);
          setComboTimeBonusesAppliedThisGame(prev => prev + 1);
          playSound(customPowerupTimeFreezeSound || SINGLE_SOUND_EFFECTS.POWERUP_TIME_FREEZE, effectsVolume); 
          triggerGameMessage(`+${COMBO_TIME_BONUS_SECONDS} SECONDS!`, 'timeBonus');
        }
      }
      // Announcer callouts land exactly on the ladder rungs. The lines are pre-rendered
      // audio shipped in /public/audio, so they fire with no network round-trip. Kept
      // sparse (3 / 5 / 8) so the line stays a reward rather than constant chatter.
      if (
        newStreak === ANNOUNCER_STREAK_MILESTONES.COMBO ||
        newStreak === ANNOUNCER_STREAK_MILESTONES.ON_FIRE ||
        newStreak === ANNOUNCER_STREAK_MILESTONES.UNSTOPPABLE
      ) {
        const callout =
          newStreak === ANNOUNCER_STREAK_MILESTONES.UNSTOPPABLE
            ? ANNOUNCER_CALLOUTS.UNSTOPPABLE
            : newStreak === ANNOUNCER_STREAK_MILESTONES.ON_FIRE
              ? ANNOUNCER_CALLOUTS.ON_FIRE
              : ANNOUNCER_CALLOUTS.COMBO;
        playSound(callout, effectsVolume);
      }
      if (isRushHourActiveState) {
        awardedPointsThisTurn *= 2;
        wasRushHourBonusThisTurn = true;
      }
      newScore += awardedPointsThisTurn;
      setCurrentScore(newScore); 
      setWordStatus('correct'); 
      setWordTextAnimation({ type: 'correct', key: Date.now() }); 
      setPointAnimationKey(prevKey => prevKey + 1); 
      setPointsAwardedAnim({ points: awardedPointsThisTurn, isLucky: wasLucky, isCombo: wasComboBonus, isRushHourBonus: wasRushHourBonusThisTurn, key: wordKey });
      setTimeout(() => setPointsAwardedAnim(null), 1500); 
      triggerHappyAnimations();

      if (newStreak >= 10 && newStreak % 10 === 0 && newStreak > lastTimeFreezeComboMilestone) {
        setGameTimeLeft(prev => Math.min(settings.totalTimeLimit, prev + POWERUP_TIME_FREEZE_SECONDS));
        setLastTimeFreezeComboMilestone(newStreak);
        setIsTimerFrozen(true); 
        setTimeout(() => setIsTimerFrozen(false), POWERUP_TIME_FREEZE_SECONDS * 1000); 
        playSound(customPowerupTimeFreezeSound || SINGLE_SOUND_EFFECTS.POWERUP_TIME_FREEZE, effectsVolume);
        triggerGameMessage(`❄️ TIME FREEZE! +${POWERUP_TIME_FREEZE_SECONDS}s`, 'powerUpFeedback');
      }
      if (newStreak >= 5 && newStreak % 10 === 5 && newStreak > lastSkipFreebieComboMilestone) {
        setSkipFreebiesAvailable(prev => prev + 1); 
        setLastSkipFreebieComboMilestone(newStreak);
        playSound(customPowerupCollectedSound || SINGLE_SOUND_EFFECTS.POWERUP_COLLECTED, effectsVolume);
        triggerGameMessage("↪️ SKIP FREEBIE EARNED!", 'powerUpFeedback');
      }
      
      // Normal Mode earns Rush Hour from score milestones. Hell Mode instead triggers it
      // off the clock (see the time-based effect below), so it is not handled here.
      if (settings.gameMode !== GameMode.HELL) {
          const nextRushHourScoreMilestone = (Math.floor(lastRushHourTriggerFlag / 2000) + 1) * 2000;
          if (newScore >= nextRushHourScoreMilestone && scoreBeforeThisWord < nextRushHourScoreMilestone && !isRushHourActiveState && rushHourEndTime === null) {
              setLastRushHourTriggerFlag(nextRushHourScoreMilestone);
              startRushHour();
          }
      }

    } else { // Word is skipped
      if (settings.gameMode === GameMode.HELL) {
        if (skipFreebiesAvailable > 0) {
            setSkipFreebiesAvailable(prev => prev - 1);
            playSound(customPowerupSkipFreebieUsedSound || SINGLE_SOUND_EFFECTS.POWERUP_SKIP_FREEBIE_USED, effectsVolume);
            triggerGameMessage("↪️ SKIP FREEBIE USED!", 'powerUpFeedback');
        } else if (remainingSkipsHellMode > 0) {
          setRemainingSkipsHellMode(prev => prev - 1);
          let penalty = HELL_MODE_SKIP_PENALTY;
          if (luckyWordMultipliers.has(currentWordIndex)) {
            penalty = HELL_MODE_LUCKY_SKIP_PENALTY;
          }
          // Never let the score go negative: the skip penalty is capped at the
          // points the player still has left.
          const appliedPenalty = Math.min(penalty, Math.max(0, newScore));
          newScore -= appliedPenalty;
          awardedPointsThisTurn = -appliedPenalty;
          wasPenalty = appliedPenalty > 0;
          setCurrentScore(newScore);
          playSound(customSkipSounds.length > 0 ? customSkipSounds : SKIP_SOUNDS, effectsVolume);
        } else {
          setIsProcessingWord(false); return; 
        }
      } else { // Normal Mode skip logic
        if (skipFreebiesAvailable > 0) {
          setSkipFreebiesAvailable(prev => prev - 1); 
          playSound(customPowerupSkipFreebieUsedSound || SINGLE_SOUND_EFFECTS.POWERUP_SKIP_FREEBIE_USED, effectsVolume);
          triggerGameMessage("↪️ SKIP FREEBIE USED!", 'powerUpFeedback');
        } else {
          setCurrentComboStreak(0); 
          setIsComboActive(false);
          playSound(customSkipSounds.length > 0 ? customSkipSounds : SKIP_SOUNDS, effectsVolume);
        }
      }
      setWordStatus('skipped'); 
      setWordTextAnimation({ type: 'skip', key: Date.now() }); 
      if (wasPenalty) {
        setPointAnimationKey(prevKey => prevKey + 1);
        setPointsAwardedAnim({ points: awardedPointsThisTurn, isLucky: luckyWordMultipliers.has(currentWordIndex) && wasPenalty, isCombo: false, isRushHourBonus: false, isPenalty: true, key: wordKey });
        setTimeout(() => setPointsAwardedAnim(null), 1500);
      }
      triggerSadAnimation();
    }

    if (wordProcessingTimerIdRef.current) clearTimeout(wordProcessingTimerIdRef.current);
    const processingDelay = isCorrectGuess ? 500 : 650; 
    wordProcessingTimerIdRef.current = setTimeout(() => {
      if (currentWordIndex + 1 >= shuffledWords.length) {
        onSetRushHourActiveVisuals(false); 
        endGameOnce({ baseScore: newScore, timeLeftSeconds: gameTimeLeft });
      } else {
        setCurrentWordIndex(prevIndex => prevIndex + 1);
        setWordKey(prevKey => prevKey + 1); 
        setWordStatus('default'); 
      }
      setIsProcessingWord(false);
    }, processingDelay); 
  }, [
    isTeamMode, currentWordIndex, shuffledWords.length, gameTimeLeft, currentScore, isProcessingWord, showGameUI, 
    luckyWordMultipliers, currentComboStreak, isComboActive, comboTimeBonusesAppliedThisGame, settings,
    skipFreebiesAvailable, isRushHourActiveState, rushHourEndTime, lastRushHourTriggerFlag, 
    lastTimeFreezeComboMilestone, lastSkipFreebieComboMilestone, 
    effectsVolume, remainingSkipsHellMode, wordKey,
    customPowerupCollectedSound, customPowerupTimeFreezeSound, customPowerupSkipFreebieUsedSound, 
    customRushHourActivationSound, customRushHourMusicLoop, onSetRushHourActiveVisuals,
    teamScores, currentTurn, wordStartTime, teamMilestones, permanentBuffs, isPaused, customSkipSounds,
    onGameEndRef, setActiveMusicOverrideRef, triggerGameMessage, triggerHappyAnimations, triggerSadAnimation,
    endGameOnce, startRushHour
  ]);

  // Latest values the timers/effects read without taking them as dependencies, so the
  // intervals are not torn down and rebuilt on every tick.
  const gameTimeLeftRef = useRef(gameTimeLeft);
  gameTimeLeftRef.current = gameTimeLeft;
  const turnTimeLeftRef = useRef(turnTimeLeft);
  turnTimeLeftRef.current = turnTimeLeft;
  const advanceWordRef = useRef(advanceWord);
  advanceWordRef.current = advanceWord;

  // Single Player Game Timer — the interval only decrements the clock. Ending the round
  // lives in its own effect below, so no state updater carries a side effect (that used
  // to let the game end twice: once from the tick, once from re-running the effect).
  useEffect(() => {
    if (isTeamMode || !showGameUI || isProcessingWord || isTimerFrozen || isPaused) {
        if (gameTimerIdRef.current) clearInterval(gameTimerIdRef.current);
        return;
    }
    if (gameTimeLeftRef.current <= 0) return;

    if (gameTimerIdRef.current) clearInterval(gameTimerIdRef.current);
    const intervalDuration = isRushHourActiveState ? 500 : 1000;
    gameTimerIdRef.current = setInterval(() => {
        setGameTimeLeft(prevTime => Math.max(0, prevTime - 1));
    }, intervalDuration);

    return () => {
        if (gameTimerIdRef.current) clearInterval(gameTimerIdRef.current);
    };
  }, [showGameUI, isProcessingWord, isTimerFrozen, isRushHourActiveState, isTeamMode, isPaused]);

  // Single Player: the round ends the moment the clock hits zero. `endGameOnce` makes
  // this idempotent, so it can never post two results.
  useEffect(() => {
    if (isTeamMode || !showGameUI) return;
    if (gameTimeLeft > 0) return;
    setTimeUpEffect(true);
    onSetRushHourActiveVisuals(false);
    endGameOnce({ baseScore: currentScore, timeLeftSeconds: 0 });
  }, [gameTimeLeft, isTeamMode, showGameUI, currentScore, onSetRushHourActiveVisuals, endGameOnce]);

  // Hell Mode: Rush Hour is tied to the clock, not to correct guesses — so a player who
  // keeps skipping still gets both Rush Hours, exactly as the instructions promise.
  useEffect(() => {
    if (isTeamMode || !showGameUI || isPaused) return;
    if (settings.gameMode !== GameMode.HELL) return;
    if (isRushHourActiveState || rushHourEndTime !== null) return;
    const oneThirdTimeMark = settings.totalTimeLimit / 3;
    const twoThirdsTimeMark = (settings.totalTimeLimit * 2) / 3;
    if (lastRushHourTriggerFlag === 0 && gameTimeLeft <= twoThirdsTimeMark && gameTimeLeft > oneThirdTimeMark) {
        setLastRushHourTriggerFlag(1);
        startRushHour();
    } else if (lastRushHourTriggerFlag === 1 && gameTimeLeft <= oneThirdTimeMark && gameTimeLeft > 0) {
        setLastRushHourTriggerFlag(2);
        startRushHour();
    }
  }, [gameTimeLeft, isTeamMode, showGameUI, isPaused, settings.gameMode, settings.totalTimeLimit, isRushHourActiveState, rushHourEndTime, lastRushHourTriggerFlag, startRushHour]);

  // Closing seconds: voice the "Hurry up!" callout once when the clock drops into the
  // final window. The ref latches so it fires a single time per descent into the window
  // and is cleared again above it (start of a round / a rematch).
  const hurryUpCalledRef = useRef(false);
  useEffect(() => {
    if (isTeamMode || !showGameUI || isPaused) return;
    if (gameTimeLeft > FINAL_COUNTDOWN_SECONDS) {
      hurryUpCalledRef.current = false;
      return;
    }
    if (gameTimeLeft <= 0 || hurryUpCalledRef.current) return;
    hurryUpCalledRef.current = true;
    playSound(ANNOUNCER_CALLOUTS.HURRY_UP, effectsVolumeRef.current);
  }, [gameTimeLeft, isTeamMode, showGameUI, isPaused]);

    // Team Mode Turn Timer — ticks only; the auto-skip on expiry is a separate effect so
    // the interval is not rebuilt every second.
    useEffect(() => {
        if (!isTeamMode || !showGameUI || isProcessingWord || isPaused) {
            if (turnTimerIdRef.current) clearInterval(turnTimerIdRef.current);
            return;
        }
        if (turnTimeLeftRef.current <= 0) return;

        if (turnTimerIdRef.current) clearInterval(turnTimerIdRef.current);
        turnTimerIdRef.current = setInterval(() => {
            setTurnTimeLeft(prev => Math.max(0, prev - 1));
        }, 1000);

        return () => {
            if (turnTimerIdRef.current) clearInterval(turnTimerIdRef.current);
        };
    }, [isTeamMode, showGameUI, isProcessingWord, isPaused]);

    // A team turn that runs out is auto-skipped.
    useEffect(() => {
        if (!isTeamMode || !showGameUI || isProcessingWord || isPaused) return;
        if (turnTimeLeft > 0) return;
        advanceWordRef.current(false);
    }, [isTeamMode, showGameUI, isProcessingWord, isPaused, turnTimeLeft]);


  // ... (Rush Hour useEffect, wordTextAnimation useEffect, wordStatus useEffect)
    // Rush Hour End Timer & Visuals Control
  useEffect(() => {
      if (isRushHourActiveState && rushHourEndTime && !isTeamMode) {
          onSetRushHourActiveVisuals(true); 
          const remainingRushTime = rushHourEndTime - Date.now();
          if (remainingRushTime <= 0) {
              setIsRushHourActiveState(false);
              setRushHourEndTime(null);
              setActiveMusicOverrideRef.current(null); 
              onSetRushHourActiveVisuals(false);
              triggerGameMessage("RUSH HOUR OVER!", 'rushHourOver', 3500); 
          } else {
              const timer = setTimeout(() => {
                  setIsRushHourActiveState(false);
                  setRushHourEndTime(null);
                  setActiveMusicOverrideRef.current(null); 
                  onSetRushHourActiveVisuals(false);
                  triggerGameMessage("RUSH HOUR OVER!", 'rushHourOver', 3500);
              }, remainingRushTime);
              return () => clearTimeout(timer);
          }
      } else if (!isRushHourActiveState && wasRushHourActivePrev.current) {
          onSetRushHourActiveVisuals(false); 
      }
      wasRushHourActivePrev.current = isRushHourActiveState;
  }, [isRushHourActiveState, rushHourEndTime, onSetRushHourActiveVisuals, isTeamMode]);

  useEffect(() => {
    if (wordTextAnimation) {
      if (wordTextAnimationTimerRef.current) clearTimeout(wordTextAnimationTimerRef.current);
      wordTextAnimationTimerRef.current = setTimeout(() => {
        setWordTextAnimation(null);
      }, 700); 
    }
    return () => {
      if (wordTextAnimationTimerRef.current) clearTimeout(wordTextAnimationTimerRef.current);
    };
  }, [wordTextAnimation]);

  useEffect(() => {
    if (wordStatus === 'correct' || wordStatus === 'skipped') {
      const timer = setTimeout(() => {
        setWordStatus('default');
      }, 600); 
      return () => clearTimeout(timer);
    }
  }, [wordStatus]);
    
// ... (rest of advanceWord and other functions)
  const handleCorrect = useCallback(() => {
    if (isProcessingWord || !showGameUI) return;
    if (!isTeamMode && gameTimeLeft <= 0) return;
    if (isTeamMode && turnTimeLeft <= 0) return;
    playSound(customCorrectSounds.length > 0 ? customCorrectSounds : CORRECT_SOUNDS, effectsVolume);
    advanceWord(true);
  }, [advanceWord, isProcessingWord, gameTimeLeft, turnTimeLeft, customCorrectSounds, showGameUI, effectsVolume, isTeamMode]);

  const handleSkip = useCallback(() => {
    if (isProcessingWord || !showGameUI) return;
    if (!isTeamMode && gameTimeLeft <= 0) return;
    if (isTeamMode && turnTimeLeft <= 0) return;
    if (settings.gameMode === GameMode.HELL && remainingSkipsHellMode <= 0 && skipFreebiesAvailable <= 0) return;
    advanceWord(false);
  }, [
    advanceWord, isProcessingWord, gameTimeLeft, turnTimeLeft, showGameUI, settings.gameMode, 
    remainingSkipsHellMode, skipFreebiesAvailable, isTeamMode
  ]);
// ... (useEffect for keydown)
  // The handlers change identity every render (they capture the live score/clock). Holding
  // them in refs lets the key listener subscribe once per word instead of every second.
  const handleCorrectRef = useRef(handleCorrect);
  handleCorrectRef.current = handleCorrect;
  const handleSkipRef = useRef(handleSkip);
  handleSkipRef.current = handleSkip;

   useEffect(() => {
    if (!showGameUI || isProcessingWord) return;

    // Don't hijack typing or native button activation (Enter on a focused button).
    const isInteractiveTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      return !!el && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(el.tagName);
    };

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (isPaused) return;
      // Both handlers re-check the clock themselves, so no time guard is needed here.

      // Team Mode shortcuts: Enter = Correct, S = Skip.
      const isTeamCorrectKey = isTeamMode && event.key === 'Enter' && !isInteractiveTarget(event.target);
      const isTeamSkipKey = isTeamMode && (event.key === 's' || event.key === 'S') && !isInteractiveTarget(event.target);

      if (event.key === 'ArrowLeft' || isTeamCorrectKey) {
        event.preventDefault();
        handleCorrectRef.current();
      } else if (event.key === 'ArrowRight' || isTeamSkipKey) {
        event.preventDefault();
        handleSkipRef.current();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [showGameUI, isProcessingWord, isTeamMode, isPaused]);

  // Anti-cheat (hot-seat): tự hiện từ trong WORD_AUTO_HIDE_MS rồi ẩn đi.
  useEffect(() => {
    if (!showGameUI) {
      setIsWordAutoRevealed(false);
      setIsPeeking(false);
      return;
    }
    setIsPeeking(false);
    setIsWordAutoRevealed(true);
    const timer = window.setTimeout(() => setIsWordAutoRevealed(false), WORD_AUTO_HIDE_MS);
    return () => window.clearTimeout(timer);
  }, [wordKey, showGameUI]);

  // Anti-cheat (hot-seat): giữ phím Space để xem lại từ.
  useEffect(() => {
    if (!showGameUI) return;
    const isTypingTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      return !!el && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(el.tagName);
    };
    const handleRevealKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || isPaused || isTypingTarget(event.target)) return;
      event.preventDefault();
      setIsPeeking(true);
    };
    const handleRevealKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || isTypingTarget(event.target)) return;
      event.preventDefault();
      setIsPeeking(false);
    };
    document.addEventListener('keydown', handleRevealKeyDown);
    document.addEventListener('keyup', handleRevealKeyUp);
    return () => {
      document.removeEventListener('keydown', handleRevealKeyDown);
      document.removeEventListener('keyup', handleRevealKeyUp);
    };
  }, [showGameUI, isPaused]);

  const handleWordPointerDown = useCallback(() => {
    if (!showGameUI || isPaused || isProcessingWord) return;
    setIsPeeking(true);
  }, [showGameUI, isPaused, isProcessingWord]);

  const handleWordPointerUp = useCallback(() => setIsPeeking(false), []);

  const isWordVisible = isWordAutoRevealed || isPeeking;

  // == Struggle hint (two tiers) ==
  // Hidden by default: the timer re-arms on every new word and only unlocks tier 1
  // (a mild English synonym) after STRUGGLE_HINT_AFTER_MS and tier 2 (the Vietnamese
  // gloss) after STRUGGLE_HINT_FULL_AFTER_MS, so a confident describer never sees them.
  const [hintStage, setHintStage] = useState<0 | 1 | 2>(0);
  const [hintSynonym, setHintSynonym] = useState<string | undefined>(undefined);
  const [hintMeaning, setHintMeaning] = useState<string | undefined>(undefined);

  useEffect(() => {
    setHintStage(0);
    if (!showGameUI) return;
    const synonymTimer = window.setTimeout(() => setHintStage(1), STRUGGLE_HINT_AFTER_MS);
    const glossTimer = window.setTimeout(() => setHintStage(2), STRUGGLE_HINT_FULL_AFTER_MS);
    return () => {
      window.clearTimeout(synonymTimer);
      window.clearTimeout(glossTimer);
    };
  }, [wordKey, showGameUI]);

  // Warm the current and upcoming hints in the background as soon as a word appears, so
  // the tiers surface instantly when they unlock instead of stalling on the network.
  useEffect(() => {
    if (!showGameUI) return;
    const current = shuffledWords[currentWordIndex];
    const next = shuffledWords[currentWordIndex + 1];
    resolveVietnameseHint(current);
    resolveEnglishSynonym(current);
    if (next) {
      resolveVietnameseHint(next);
      resolveEnglishSynonym(next);
    }
  }, [showGameUI, currentWordIndex, shuffledWords]);

  // Resolve tier 1: an English synonym (Datamuse, cached) that nudges without spoiling.
  useEffect(() => {
    if (!showGameUI || hintStage < 1) {
      setHintSynonym(undefined);
      return;
    }
    let cancelled = false;
    resolveEnglishSynonym(shuffledWords[currentWordIndex]).then(synonym => {
      if (!cancelled) setHintSynonym(synonym);
    });
    return () => { cancelled = true; };
  }, [showGameUI, hintStage, currentWordIndex, shuffledWords]);

  // Resolve tier 2: the bundled Vietnamese gloss (instant and offline-capable).
  useEffect(() => {
    if (!showGameUI || hintStage < 2) {
      setHintMeaning(undefined);
      return;
    }
    let cancelled = false;
    resolveVietnameseHint(shuffledWords[currentWordIndex]).then(meaning => {
      if (!cancelled) setHintMeaning(meaning);
    });
    return () => { cancelled = true; };
  }, [showGameUI, hintStage, currentWordIndex, shuffledWords]);

  // Tier 2 wins when available; tier 1 fills the gap until the gloss unlocks (or when the
  // word has no synonym). Only ever rendered while the word is being revealed.
  const visibleHint = !isWordVisible
    ? undefined
    : hintMeaning
      ? `🇻🇳 ${hintMeaning}`
      : hintSynonym
        ? `💬 ${hintSynonym}`
        : undefined;


  // == In-game pause menu (Esc on desktop, ⏸ button on touch) ==
  const openPauseMenu = useCallback(() => {
    if (isProcessingWord || surpriseBoxInfo) return;
    setShowEndGameConfirm(false);
    setIsPauseMenuOpen(true);
    setIsGamePaused(true);
  }, [isProcessingWord, surpriseBoxInfo]);

  const closePauseMenu = useCallback(() => {
    setIsPauseMenuOpen(false);
    setIsGamePaused(false);
  }, []);

  useEffect(() => {
    if (!showGameUI) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (isProcessingWord || surpriseBoxInfo) return;
      event.preventDefault();
      if (isPauseMenuOpen) {
        closePauseMenu();
      } else {
        openPauseMenu();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showGameUI, isProcessingWord, surpriseBoxInfo, isPauseMenuOpen, openPauseMenu, closePauseMenu]);

  // Leaving the tab mid-round must not burn the clock. The moment the page is hidden the
  // game pauses behind the pause menu, so the player resumes deliberately on their return
  // instead of coming back to a round that quietly expired in the background.
  useEffect(() => {
    if (!showGameUI) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'hidden') return;
      setShowEndGameConfirm(false);
      setIsPauseMenuOpen(true);
      setIsGamePaused(true);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [showGameUI]);

  // "End Game" now opens an in-game confirmation instead of a browser dialog.
  const requestEndGame = useCallback(() => {
    if (!showGameUI || isProcessingWord) return;
    const isTimeUp = isTeamMode ? false : gameTimeLeft <= 0; // Team mode ends on words, not time
    if (isTimeUp) return;
    setShowEndGameConfirm(true);
    setIsGamePaused(true);
  }, [showGameUI, isProcessingWord, isTeamMode, gameTimeLeft]);

  const cancelEndGame = useCallback(() => {
    setShowEndGameConfirm(false);
    // Keep the game paused only if the pause menu sits behind this dialog.
    if (!isPauseMenuOpen) setIsGamePaused(false);
  }, [isPauseMenuOpen]);

  const confirmEndGame = useCallback(() => {
    onSetRushHourActiveVisuals(false);
    setShowEndGameConfirm(false);
    setIsPauseMenuOpen(false);
    if (isTeamMode) {
        endGameOnce({ teamAScore: teamScores.A, teamBScore: teamScores.B });
    } else {
        endGameOnce({ baseScore: currentScore, timeLeftSeconds: 0 });
    }
    setActiveMusicOverrideRef.current(null);
  }, [currentScore, onSetRushHourActiveVisuals, isTeamMode, teamScores, endGameOnce]);

  // ... (Team Mode functions)
  // == Team Mode Specific Functions ==
  const handleBoxChoice = useCallback((team: Team) => {
    const effects = [
      { id: 'ADD_50', description: '+50 Points!', apply: (t: Team) => setTeamScores(p => ({...p, [t]: p[t] + 50})) },
      { id: 'ADD_100', description: '+100 Points!', apply: (t: Team) => setTeamScores(p => ({...p, [t]: p[t] + 100})) },
      { id: 'ADD_200', description: '+200 Points!', apply: (t: Team) => setTeamScores(p => ({...p, [t]: p[t] + 200})) },
      { id: 'SUB_50', description: '-50 Points!', apply: (t: Team) => setTeamScores(p => ({...p, [t]: Math.max(0, p[t] - 50)})) },
      { id: 'PERMA_BONUS_10', description: '+10 Points Per Correct Word!', apply: (t: Team) => setPermanentBuffs(p => ({...p, [t]: {...p[t], extraPointsPerWord: p[t].extraPointsPerWord + 10 }})) },
      { id: 'SWAP_SCORES', description: 'Scores Swapped!', apply: () => setTeamScores(s => ({ A: s.B, B: s.A })) },
      { id: 'STEAL_20', description: "Steal 20% of Opponent's Points!", apply: (t: Team) => {
          const opponent = t === 'A' ? 'B' : 'A';
          const stolen = Math.floor(teamScores[opponent] * 0.2);
          setTeamScores(s => ({ ...s, [t]: s[t] + stolen, [opponent]: Math.max(0, s[opponent] - stolen) }));
      }},
      { id: 'OPP_SKIP_BONUS', description: "+30 Pts When Opponent Skips!", apply: (t: Team) => setPermanentBuffs(p => ({...p, [t]: {...p[t], pointsFromOpponentSkip: p[t].pointsFromOpponentSkip + 30 }})) },
    ];
    
    // Add "Perish Together" if conditions met
    if (teamScores.A > 1000 || teamScores.B > 1000) {
        effects.push({ id: 'PERISH_TOGETHER', description: 'PERISH TOGETHER!', apply: () => setTeamScores({ A: 0, B: 0 }) });
    }

    const chosenEffect = effects[Math.floor(Math.random() * effects.length)];
    chosenEffect.apply(team);
    setRevealedEffect(chosenEffect);

    setTimeout(() => {
        setSurpriseBoxInfo(null);
        setRevealedEffect(null);
        setIsGamePaused(false);

        // Resume game flow
        const nextTurn: Team = currentTurn === 'A' ? 'B' : 'A';
        setIsProcessingWord(true); // Prevent clicks during transition
        wordProcessingTimerIdRef.current = setTimeout(() => {
            if (currentWordIndex + 1 >= shuffledWords.length) {
                endGameOnce({ teamAScore: teamScores.A, teamBScore: teamScores.B });
            } else {
                setCurrentWordIndex(prev => prev + 1);
                setWordKey(prev => prev + 1);
                setCurrentTurn(nextTurn);
                setWordStartTime(Date.now());
                setTurnTimeLeft(settings.timePerWord ?? 20);
                setIsProcessingWord(false);
            }
        }, 600);
    }, 3000); // Show effect for 3 seconds
  }, [teamScores, currentTurn, currentWordIndex, shuffledWords.length, settings.timePerWord, endGameOnce]);


  const formatTime = (seconds: number) => { 
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };
  
  const wordForCardDisplay = shuffledWords[currentWordIndex]; 
  const currentCountdownText = COUNTDOWN_STEPS[countdownStepIndex];
  


  const getTextAnimationClass = () => {
    if (!wordTextAnimation) return '';
    return wordTextAnimation.type === 'correct' ? 'animate-word-correct-effect' : 'animate-word-skip-effect';
  };
  
  const rushHourBounceClass = isAppRushHourActive && showGameUI ? 'animate-rushHourBounce' : '';
  const isHellModeSkipDisabled = settings.gameMode === GameMode.HELL && remainingSkipsHellMode <= 0 && skipFreebiesAvailable <= 0;

  // Floating pause control (touch-friendly 44px target) + the pause / confirm overlays.
  // Rendered in both the Team and single-player layouts.
  const pauseButton = showGameUI ? (
    <button
      type="button"
      onClick={openPauseMenu}
      className="futuristic-button absolute right-1 top-1 z-30 flex h-11 w-11 items-center justify-center rounded-lg border border-electric-blue/40 bg-dark-metal/80 text-lg text-light-text hover:bg-cyber-purple/50"
      aria-label="Pause game"
      title="Pause (Esc)"
    >
      ⏸️
    </button>
  ) : null;

  const pauseOverlays = (
    <>
      {isPauseMenuOpen && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-dark-metal/95 p-4 animate-fadeInScaleUp"
          role="dialog"
          aria-modal="true"
          aria-label="Game paused"
        >
          <h2 className="font-heading text-3xl font-bold text-electric-blue">Paused</h2>
          <div className="w-full max-w-xs rounded-lg border border-cyber-purple/40 bg-dark-metal/60 p-3">
            <p className="mb-2 text-left text-xs font-semibold uppercase tracking-wider text-electric-blue">Sound</p>
            <VolumeControls
              idPrefix="pause"
              musicVolume={musicVolume}
              onMusicVolumeChange={onMusicVolumeChange}
              effectsVolume={effectsVolume}
              onEffectsVolumeChange={onEffectsVolumeChange}
            />
          </div>
          <div className="flex w-full max-w-xs flex-col gap-2">
            <button
              type="button"
              onClick={closePauseMenu}
              className="futuristic-button w-full rounded-[var(--r-md)] bg-neon-green px-4 py-2.5 font-bold text-dark-metal hover:bg-emerald-400"
            >
              ▶️ Resume
            </button>
            <button
              type="button"
              onClick={requestEndGame}
              className="futuristic-button w-full rounded-lg bg-cyber-purple/70 px-4 py-2.5 font-semibold text-light-text hover:bg-cyber-purple"
            >
              ⏹️ End Game &amp; See Score
            </button>
          </div>
          <p className="text-xs text-muted-text">Press Esc to resume</p>
        </div>
      )}

      {showEndGameConfirm && (
        <div
          className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm ending the game"
        >
          <div className="w-full max-w-sm rounded-xl border border-warning-yellow/50 bg-dark-metal p-4 text-center animate-fadeInScaleUp">
            <p className="font-heading text-lg font-bold text-warning-yellow">End the game now?</p>
            <p className="mt-1 text-sm text-muted-text">
              {isTeamMode
                ? 'The current team scores will go to the results screen.'
                : 'Your current score will go to the results screen.'}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={cancelEndGame}
                className="futuristic-button rounded-lg bg-dark-metal px-4 py-2 text-sm text-light-text hover:bg-cyber-purple/30"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmEndGame}
                className="futuristic-button rounded-[var(--r-md)] bg-danger-red px-4 py-2 text-sm font-bold text-light-text hover:bg-red-400"
              >
                End Game
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (isTeamMode) {
    const teamAClasses = currentTurn === 'A' && !isPaused ? 'border-cyan-400 animate-teamAPulse' : 'border-[var(--hairline)]';
    const teamBClasses = currentTurn === 'B' && !isPaused ? 'border-orange-400 animate-teamBPulse' : 'border-[var(--hairline)]';
    const teamColorClass = currentTurn === 'A' ? 'text-cyan-400' : 'text-orange-400';

    return (
        <div ref={gameScreenRootRef} className="relative flex flex-col items-center space-y-2 text-light-text w-full h-full overflow-hidden">
            {pauseButton}
            {pauseOverlays}
            {/* Surprise Box Modal */}
            {surpriseBoxInfo && (
                <div className="absolute inset-0 bg-dark-metal/90 z-40 flex flex-col items-center justify-center animate-fadeInScaleUp" role="dialog" aria-modal="true">
                    {!revealedEffect ? (
                        <>
                            <h2 className="text-2xl sm:text-3xl font-heading mb-2">Team <span className={surpriseBoxInfo.team === 'A' ? 'text-cyan-400' : 'text-orange-400'}>{surpriseBoxInfo.team}</span> hit a milestone!</h2>
                            <p className="text-lg sm:text-xl text-muted-text mb-6">Choose a surprise box!</p>
                            <div className="flex gap-4">
                                {[1, 2, 3].map(i => (
                                    <button key={i} onClick={() => handleBoxChoice(surpriseBoxInfo.team)} className="text-5xl sm:text-6xl p-6 sm:p-8 bg-cyber-purple rounded-lg shadow-lg animate-subtlePulse hover:scale-110 transition-transform futuristic-button">
                                        🎁
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center p-4 animate-stamp-effect">
                            <h2 className="text-xl sm:text-2xl font-heading mb-4 text-warning-yellow">You got:</h2>
                            <p className="text-5xl sm:text-6xl font-bold bg-black/30 p-4 rounded-lg animate-pulseOnce">{revealedEffect.description}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Top Row: Scores and Timer */}
            <div className={`w-full grid grid-cols-3 items-center gap-2 flex-shrink-0 ${showGameUI ? 'pr-12' : ''}`}>
                <div ref={teamAScoreBoxRef} className={`text-center p-2 border-2 rounded-lg transition-all duration-300 ${teamAClasses}`}>
                    <p className="text-base sm:text-lg font-semibold text-cyan-300">Team A</p>
                    <p className="text-3xl sm:text-4xl font-bold font-heading">{teamScores.A}</p>
                </div>
                <div className="text-center">
                    {showGameUI && <CircularTimer timeLeft={turnTimeLeft} totalTime={settings.timePerWord ?? 20} isFrozen={false} isRushHour={false} size={70} strokeWidth={6} />}
                </div>
                <div ref={teamBScoreBoxRef} className={`text-center p-2 border-2 rounded-lg transition-all duration-300 ${teamBClasses}`}>
                    <p className="text-base sm:text-lg font-semibold text-orange-300">Team B</p>
                    <p className="text-3xl sm:text-4xl font-bold font-heading">{teamScores.B}</p>
                </div>
            </div>
            
             {/* Turn Indicator */}
            <div className="h-8 flex items-center justify-center w-full relative">
                {showGameUI && !isPaused && <p className="text-2xl sm:text-3xl font-bold animate-fadeInScaleUp">Team <span className={currentTurn === 'A' ? 'text-cyan-400' : 'text-orange-400'}>{currentTurn}</span>'s Turn!</p>}
            </div>
            
             {/* Word Counter */}
            {showGameUI && (
              <div className="h-6 flex items-center justify-center w-full text-sm sm:text-base text-muted-text -mt-1 flex-shrink-0">
                  Word {Math.min(currentWordIndex + 1, shuffledWords.length)} of {shuffledWords.length}
              </div>
            )}

            {/* Word Card */}
            <div className="w-full flex flex-col items-center justify-center relative flex-grow">
                {!showGameUI && currentCountdownText ? (
                    <div className="countdown-text"><span className={getCountdownAnimationClass(currentCountdownText)}>{currentCountdownText}</span></div>
                ) : showGameUI && wordForCardDisplay ? (
                    <div
                        className="relative w-full h-full touch-none select-none"
                        onPointerDown={handleWordPointerDown}
                        onPointerUp={handleWordPointerUp}
                        onPointerLeave={handleWordPointerUp}
                        onPointerCancel={handleWordPointerUp}
                    >
                         <WordCard 
                            word={wordForCardDisplay} 
                            wordKey={wordKey} 
                            animationClass={getTextAnimationClass()}
                            animationKey={wordTextAnimation?.key}
                            status={wordStatus}
                            isBouncing={false}
                            pointsAwardedAnim={pointsAwardedAnim}
                            pointAnimationKey={pointAnimationKey}
                            wordCardRef={wordCardRef}
                            isTeamMode={isTeamMode}
                            textColorClass={teamColorClass}
                            isWordVisible={isWordVisible}
                            meaningHint={visibleHint}
                        />
                    </div>
                ) : showGameUI && !wordForCardDisplay ? ( 
                    <p className="text-center text-lg sm:text-xl text-muted-text animate-subtlePulse">Calculating Score...</p>
                ) : null}
            </div>

            {/* Buttons */}
             {showGameUI && (
                <div className="w-full flex-shrink-0 mt-auto pt-2">
                    <div className="grid grid-cols-2 gap-2 sm:gap-2.5 w-full gamescreen-buttons">
                        <button ref={correctButtonRef} type="button" onClick={handleCorrect} disabled={!wordForCardDisplay || turnTimeLeft <= 0 || isProcessingWord || isPaused} className="inline-flex w-full items-center justify-center gap-1.5 bg-neon-green hover:bg-emerald-400 text-dark-metal font-bold py-2 sm:py-2.5 px-3 sm:px-4 rounded-[var(--r-md)] futuristic-button text-base sm:text-lg">
                            CORRECT
                            <Icon name="check" size={18} />
                        </button>
                        <button ref={skipButtonRef} type="button" onClick={handleSkip} disabled={!wordForCardDisplay || turnTimeLeft <= 0 || isProcessingWord || isPaused} className="inline-flex w-full items-center justify-center gap-1.5 bg-warning-yellow hover:bg-amber-400 text-dark-metal font-bold py-2 sm:py-2.5 px-3 sm:px-4 rounded-[var(--r-md)] futuristic-button text-base sm:text-lg">
                            SKIP
                            <Icon name="close" size={18} />
                        </button>
                    </div>
                     <div className="w-full mt-1.5 sm:mt-2 gamescreen-buttons">
                        <button type="button" onClick={requestEndGame} disabled={!wordForCardDisplay || isProcessingWord || isPaused} className="w-full bg-cyber-purple/60 hover:bg-cyber-purple/80 border border-cyber-purple/80 text-light-text/90 font-semibold py-2 sm:py-2.5 px-4 rounded-[var(--r-md)] futuristic-button text-base sm:text-lg">
                            End Game & See Score
                        </button>
                    </div>
                </div>
             )}
        </div>
    );
  }

  // == Default (Single Player) Render ==
  const getTimerBorderColor = () => {
    if (isTimerFrozen) return 'border-cyan-300 animate-frostyPulse';
    if (isRushHourActiveState) return 'border-danger-red animate-rushHourGlow';
    return 'border-electric-blue/50';
  };
  const getTimerTextColor = () => {
      const progressRatio = gameTimeLeft / settings.totalTimeLimit;
      if (isTimerFrozen) return 'text-cyan-300 animate-timerFreezeEffect';
      if (isRushHourActiveState) return 'text-danger-red';
      if (gameTimeLeft <= 10 && gameTimeLeft > 0) return 'text-danger-red animate-pingOnce';
      if (gameTimeLeft === 0) return 'text-danger-red';
      if (progressRatio <= 0.40) return 'text-warning-yellow';
      return 'text-electric-blue';
  };

  return (
    <div ref={gameScreenRootRef} className="relative flex flex-col items-center space-y-1 sm:space-y-1.5 text-light-text w-full h-full">
      {pauseButton}
      {pauseOverlays}
      {isDemo && (
        <span className="pointer-events-none absolute right-14 top-2 z-20 rounded bg-cyber-purple/25 px-1.5 py-0.5 font-sans text-[0.6rem] uppercase tracking-widest text-light-text/40">
          Demo
        </span>
      )}
      {/* Top Row: Points and Timer */}
      <div className={`w-full flex justify-between items-center px-1 sm:px-1.5 gap-2 flex-shrink-0 ${rushHourBounceClass} ${showGameUI ? 'pr-12' : ''}`}>
        <div className="text-base sm:text-lg font-semibold text-neon-green text-left relative flex-1 score-display">
          POINTS: <span className="text-xl sm:text-2xl font-bold">{currentScore}</span>
        </div>

        {settings.gameMode === GameMode.HELL && showGameUI ? (
            <div className="flex-1 w-full px-1 sm:px-1.5">
                <div
                className={`w-full hell-mode-timebar-container ${timeUpEffect ? 'time-depleted-spark' : ''}`}
                role="progressbar"
                aria-valuenow={gameTimeLeft}
                aria-valuemin={0}
                aria-valuemax={settings.totalTimeLimit}
                aria-label="Game time remaining"
                >
                <div
                    className={`h-full rounded-full transition-all duration-200 ease-linear ${
                    isRushHourActiveState ? 'bg-gradient-to-r from-red-400 via-danger-red to-red-700 animate-pulseOnce' :
                    (gameTimeLeft / settings.totalTimeLimit) > 0.5 ? 'bg-gradient-to-r from-neon-green to-green-500' :
                    (gameTimeLeft / settings.totalTimeLimit) > 0.2 ? 'bg-gradient-to-r from-warning-yellow to-amber-500' :
                    'bg-gradient-to-r from-danger-red to-red-700'
                    }`}
                    style={{ width: `${Math.max(0, (gameTimeLeft / settings.totalTimeLimit) * 100)}%` }}
                ></div>
                </div>
                <p className="text-xs text-center mt-0.5 text-muted-text">Time</p>
            </div>
            ) : showGameUI && settings.gameMode === GameMode.NORMAL ? (
                <div className="flex-1"></div>
            ) : ( 
            <div className="text-base sm:text-lg font-semibold text-right flex-1 text-electric-blue opacity-0"> 
                TIME: <span className="text-xl sm:text-2xl font-bold">{formatTime(gameTimeLeft)}</span>
            </div>
        )}
      </div>

      {settings.gameMode === GameMode.NORMAL && showGameUI && (
        <div className={`flex justify-center items-center my-1 flex-shrink-0 ${rushHourBounceClass}`}>
            {isTimerFrozen && (
                <div className="timer-frozen-display mr-2" aria-label="Timer Frozen">
                    <Icon name="snowflake" size={18} className="text-cyan-400" />
                    <span className="ml-1 text-xs font-semibold text-light-text hidden sm:inline">FROZEN</span>
                </div>
            )}
            <div className={`py-1 px-3 sm:py-2 sm:px-4 rounded-lg border-2 shadow-lg ${getTimerBorderColor()}`}>
                <span className={`font-heading font-bold text-4xl sm:text-5xl transition-colors duration-300 ${getTimerTextColor()}`}>
                    {formatTime(gameTimeLeft)}
                </span>
            </div>
        </div>
      )}
      
      {showGameUI && (
         <div className={`flex justify-between items-center w-full text-xs sm:text-sm text-muted-text mb-0.5 px-1 sm:px-1.5 flex-shrink-0 score-display ${rushHourBounceClass}`}>
            <span>Word {Math.min(currentWordIndex + 1, shuffledWords.length)} of {shuffledWords.length}</span>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
                {skipFreebiesAvailable > 0 && (
                  <span className="inline-flex items-center gap-1 text-lg sm:text-xl text-yellow-400" title={`Skip Freebies: ${skipFreebiesAvailable}`}>
                    <Icon name="skip" size={18} /> x{skipFreebiesAvailable}
                  </span>
                )}
                {currentComboStreak > 0 && (
                    <span className={`font-bold ${isComboActive ? 'text-orange-400' : 'text-muted-text'}`}>
                        🔥 Combo: x{currentComboStreak}
                    </span>
                )}
            </div>
        </div>
      )}

      {settings.gameMode === GameMode.HELL && showGameUI && (
        <div className={`flex justify-center items-center space-x-1 sm:space-x-1.5 my-0.5 h-5 sm:h-6 flex-shrink-0 ${rushHourBounceClass}`}> 
            {Array.from({ length: HELL_MODE_INITIAL_SKIPS }).map((_, i) => (
            <span
                key={i}
                className={`text-2xl sm:text-3xl transition-colors duration-300 ${i < HELL_MODE_INITIAL_SKIPS - remainingSkipsHellMode ? 'text-muted-text/40' : 'text-danger-red animate-subtlePulse'}`}
                role="img"
                aria-label={i < HELL_MODE_INITIAL_SKIPS - remainingSkipsHellMode ? "Used Skip Heart" : "Available Skip Heart"}
            >
                {i < HELL_MODE_INITIAL_SKIPS - remainingSkipsHellMode ? '🖤' : '❤️'}
            </span>
            ))}
        </div>
      )}

      <div className={`w-full h-8 sm:h-10 md:h-12 flex items-center justify-center my-0.5 flex-shrink-0 game-message-display ${rushHourBounceClass}`}>
        {gameMessage && showGameUI && (
          <div
            key={gameMessage.key}
            className={`text-center ${getMessageStyling(gameMessage.type)}`}
            role="alert"
          >
            {gameMessage.text}
          </div>
        )}
      </div>
      
      <div className="w-full flex flex-col items-center justify-center relative flex-grow">
        {!showGameUI && currentCountdownText ? (
            <div className="countdown-text"> 
                <span className={`${getCountdownAnimationClass(currentCountdownText)}`}>
                  {currentCountdownText}
                </span>
            </div>
        ) : showGameUI && wordForCardDisplay ? ( 
          <div
            className="relative w-full h-full flex flex-col items-center justify-center touch-none select-none"
            onPointerDown={handleWordPointerDown}
            onPointerUp={handleWordPointerUp}
            onPointerLeave={handleWordPointerUp}
            onPointerCancel={handleWordPointerUp}
          >
            <WordCard 
                word={wordForCardDisplay} 
                wordKey={wordKey} 
                animationClass={getTextAnimationClass()}
                animationKey={wordTextAnimation?.key}
                status={wordStatus}
                isBouncing={isAppRushHourActive} 
                pointsAwardedAnim={pointsAwardedAnim}
                pointAnimationKey={pointAnimationKey}
                wordCardRef={wordCardRef}
                isTeamMode={isTeamMode}
                isWordVisible={isWordVisible}
                meaningHint={visibleHint}
            />
            {luckyWordMultipliers.has(currentWordIndex) && !isProcessingWord && !wordTextAnimation && ( 
              <div 
                className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-black bg-opacity-50 p-1 sm:p-1.5 rounded-lg shadow-lg z-10 animate-flash flex items-center"
                aria-live="polite"
                role="status"
              >
                <span className="text-warning-yellow text-base sm:text-lg drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" aria-hidden="true">🌟</span>
                <span className="ml-1 text-xs sm:text-sm font-bold text-warning-yellow uppercase tracking-wider drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                  Lucky x{luckyWordMultipliers.get(currentWordIndex)}!
                </span>
              </div>
            )}
          </div>
        ) : showGameUI && !wordForCardDisplay ? ( 
          <p className="text-center text-lg sm:text-xl text-muted-text animate-subtlePulse">Calculating Score...</p>
        ) : null }
      </div>
      
      {catAnimationType && catAnimPosition && (
        <div
          className={`cat-animation-container animate-${catAnimationType === 'happy' ? 'catHappyJump' : 'catSadAppear'}`}
          style={{
            position: 'absolute',
            top: `${catAnimPosition.top}px`,
            left: `${catAnimPosition.left}px`,
          }}
          aria-hidden="true"
        >
          {catAnimationType === 'happy' ? (
            <div className="text-4xl sm:text-5xl p-1.5 sm:p-2 bg-green-500/80 rounded-full shadow-lg transform scale-75 sm:scale-100">
              <span role="img" aria-label="Happy cheering emoji">🥳</span><span className="inline-block transform translate-y-[-2px] ml-0.5 sm:ml-1">👍</span>
            </div>
          ) : (
            <div className="text-4xl sm:text-5xl p-1.5 sm:p-2 bg-red-500/80 rounded-full shadow-lg transform scale-75 sm:scale-100">
              <span role="img" aria-label="Sad emoji">😥</span>
              <span className="inline-block py-0.5 px-1 sm:px-1.5 text-xl sm:text-2xl bg-white text-danger-red border-2 border-danger-red ml-0.5 sm:ml-1 rounded font-bold align-middle">X</span>
            </div>
          )}
        </div>
      )}

      {starEffects.length > 0 && starEffects.map(star => (
        <div
          key={star.id}
          className="absolute text-warning-yellow text-xl sm:text-2xl animate-starPop pointer-events-none"
          style={{ top: star.y, left: star.x, animationDelay: star.delay, zIndex: 35 }}
          aria-hidden="true"
        >
          ★
        </div>
      ))}

      {showGameUI && (
        <div className={`w-full flex-shrink-0 mt-1 sm:mt-1.5 ${rushHourBounceClass}`}>
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5 w-full mt-1.5 sm:mt-2 gamescreen-buttons">
            <div className="flex flex-col items-center">
                <button
                ref={correctButtonRef}
                type="button"
                onClick={handleCorrect}
                disabled={!wordForCardDisplay || gameTimeLeft <= 0 || isProcessingWord || !!wordTextAnimation}
                className="inline-flex w-full items-center justify-center gap-1.5 bg-neon-green hover:bg-emerald-400 text-dark-metal font-bold py-2 sm:py-2.5 px-3 sm:px-4 rounded-[var(--r-md)] futuristic-button text-base sm:text-lg"
                aria-label="Correct guess (Left Arrow)"
                >
                CORRECT <Icon name="check" size={18} />
                </button>
            </div>
            <div className="flex flex-col items-center">
                <button
                ref={skipButtonRef}
                type="button"
                onClick={handleSkip}
                disabled={!wordForCardDisplay || gameTimeLeft <= 0 || isProcessingWord || !!wordTextAnimation || isHellModeSkipDisabled}
                className={`inline-flex w-full items-center justify-center gap-1.5 font-bold py-2 sm:py-2.5 px-3 sm:px-4 rounded-[var(--r-md)] futuristic-button text-base sm:text-lg ${
                    isHellModeSkipDisabled 
                    ? 'bg-[var(--surface-2)] text-muted-text cursor-not-allowed opacity-80 border border-[var(--hairline)]'
                    : 'bg-warning-yellow hover:bg-amber-400 text-dark-metal'
                }`}
                aria-label="Pass word (Right Arrow)"
                >
                SKIP {isHellModeSkipDisabled ? <Icon name="ban" size={18} className="text-danger-red" /> : <Icon name="close" size={18} />}
                </button>
            </div>
            </div>
            <div className="w-full mt-1.5 sm:mt-2 gamescreen-buttons">
                <button
                    type="button"
                    onClick={requestEndGame}
                    disabled={!wordForCardDisplay || gameTimeLeft <= 0 || isProcessingWord || !!wordTextAnimation}
                    className="w-full bg-cyber-purple/60 hover:bg-cyber-purple/80 border border-cyber-purple/80 text-light-text/90 font-semibold py-2 sm:py-2.5 px-4 rounded-[var(--r-md)] futuristic-button text-base sm:text-lg"
                    aria-label="End game and see score"
                >
                    End Game & See Score
                </button>
            </div>
        </div>
      )}
    </div>
  );
};