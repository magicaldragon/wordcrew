import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameSettings, CustomSoundFile, GameMode } from '../types';
import { DEFAULT_TOTAL_TIME_LIMIT, MIN_TOTAL_TIME_LIMIT, MAX_TOTAL_TIME_LIMIT, DEMO_POLICY } from '../constants';
import { FileUploadButton, ACCEPTED_AUDIO_ACCEPT_ATTR, ACCEPTED_AUDIO_FORMATS_LABEL, MAX_AUDIO_FILE_SIZE_MB } from './FileUploadButton';
import { UnlockDialog } from './UnlockDialog';
import type { UnlockOutcome } from '../services/payments';
import { VolumeControls } from './VolumeControls';
import { CEFRLevel, cefrWordLists, formatWordsForTextarea, WordListCategories, WORD_COUNT_OPTIONS } from '../cefrWordLists';

interface SetupScreenProps {
  initialGameMode: GameMode;
  isUnlocked: boolean;
  onUnlock: (code: string) => Promise<UnlockOutcome>;
  onGameStart: (settings: GameSettings) => void;
  musicVolume: number;
  onMusicVolumeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  effectsVolume: number;
  onEffectsVolumeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  customBackgroundMusic: CustomSoundFile | null;
  setCustomBackgroundMusic: (file: CustomSoundFile | null) => void;
  customGameMusic: CustomSoundFile | null;
  setCustomGameMusic: (file: CustomSoundFile | null) => void;
  customCorrectSounds: CustomSoundFile[];
  setCustomCorrectSounds: (files: CustomSoundFile[]) => void;
  customSkipSounds: CustomSoundFile[];
  setCustomSkipSounds: (files: CustomSoundFile[]) => void;
  customStartGameSound: CustomSoundFile | null;
  setCustomStartGameSound: (file: CustomSoundFile | null) => void;
  customPlayAgainSound: CustomSoundFile | null;
  setCustomPlayAgainSound: (file: CustomSoundFile | null) => void;
  customTimesUpSound: CustomSoundFile | null;
  setCustomTimesUpSound: (file: CustomSoundFile | null) => void;
  customGameOverSound: CustomSoundFile | null;
  setCustomGameOverSound: (file: CustomSoundFile | null) => void;
  customCountdownGoSound: CustomSoundFile | null;
  setCustomCountdownGoSound: (file: CustomSoundFile | null) => void;
  customPowerupCollectedSound: CustomSoundFile | null;
  setCustomPowerupCollectedSound: (file: CustomSoundFile | null) => void;
  customPowerupTimeFreezeSound: CustomSoundFile | null;
  setCustomPowerupTimeFreezeSound: (file: CustomSoundFile | null) => void;
  customPowerupSkipFreebieUsedSound: CustomSoundFile | null;
  setCustomPowerupSkipFreebieUsedSound: (file: CustomSoundFile | null) => void;
  customRushHourActivationSound: CustomSoundFile | null;
  setCustomRushHourActivationSound: (file: CustomSoundFile | null) => void;
  customRushHourMusicLoop: CustomSoundFile | null;
  setCustomRushHourMusicLoop: (file: CustomSoundFile | null) => void;
}

interface SelectedWordTypes {
  nouns: boolean;
  verbs: boolean;
  adjectives: boolean;
  phrasalVerbs: boolean;
}

const DEFAULT_SELECTED_WORD_TYPES: SelectedWordTypes = {
  nouns: true,
  verbs: true,
  adjectives: true,
  phrasalVerbs: true,
};

const WORD_TYPE_LABELS: Record<keyof SelectedWordTypes, string> = {
  nouns: 'Nouns',
  verbs: 'Verbs',
  adjectives: 'Adjectives',
  phrasalVerbs: 'Phrasal Verbs',
};

const TIME_PER_WORD_OPTIONS = [10, 15, 20, 25, 30, 45];

// App-like wizard: the setup is split into sequential panels so the primary action
// is always reachable without scrolling through one long form.
const WIZARD_STEPS = ['Mode', 'Words', 'Settings'] as const;

// Preview of the upload slots shown while custom sounds are still locked, so the
// Settings step communicates what the Full Version adds instead of looking empty.
const CUSTOM_SOUND_SLOTS = [
  'Setup Music', 'Game Music', 'Start Game', 'Countdown "GO!"', 'Correct Guess',
  'Skip Word', "Time's Up", 'Game Over (Win)', 'Play Again', 'Collected',
  'Time Freeze', 'Skip Freebie', 'Rush Hour Activate', 'Rush Hour Music',
];

export const SetupScreen: React.FC<SetupScreenProps> = ({
  initialGameMode,
  isUnlocked,
  onUnlock,
  onGameStart,
  musicVolume, onMusicVolumeChange,
  effectsVolume, onEffectsVolumeChange,
  customBackgroundMusic, setCustomBackgroundMusic,
  customGameMusic, setCustomGameMusic,
  customCorrectSounds, setCustomCorrectSounds,
  customSkipSounds, setCustomSkipSounds,
  customStartGameSound, setCustomStartGameSound,
  customPlayAgainSound, setCustomPlayAgainSound,
  customTimesUpSound, setCustomTimesUpSound,
  customGameOverSound, setCustomGameOverSound,
  customCountdownGoSound, setCustomCountdownGoSound,
  customPowerupCollectedSound, setCustomPowerupCollectedSound,
  customPowerupTimeFreezeSound, setCustomPowerupTimeFreezeSound,
  customPowerupSkipFreebieUsedSound, setCustomPowerupSkipFreebieUsedSound,
  customRushHourActivationSound, setCustomRushHourActivationSound,
  customRushHourMusicLoop, setCustomRushHourMusicLoop,
}) => {
  const [wordsInput, setWordsInput] = useState<string>('');
  const [totalTimeLimit, setTotalTimeLimit] = useState<number>(DEFAULT_TOTAL_TIME_LIMIT);
  const [timePerWord, setTimePerWord] = useState<number>(20);
  const [error, setError] = useState<string>('');
  const [displayDevUtils, setDisplayDevUtils] = useState<boolean>(false);
  const [step, setStep] = useState<number>(0);

  const [selectedPreset, setSelectedPreset] = useState<CEFRLevel | ''>('');
  const [selectedWordTypes, setSelectedWordTypes] = useState<SelectedWordTypes>({ ...DEFAULT_SELECTED_WORD_TYPES });
  const [selectedWordCountForPreset, setSelectedWordCountForPreset] = useState<number>(WORD_COUNT_OPTIONS[2]);
  const [gameMode, setGameMode] = useState<GameMode>(initialGameMode);
  // Two explicit word-entry flows: let the app suggest words to curate, or type your own.
  const [entryMode, setEntryMode] = useState<'suggest' | 'manual'>('suggest');
  const [showUnlockDialog, setShowUnlockDialog] = useState<boolean>(false);
  // The custom-sound uploaders are 14 rows tall, so they stay folded away to keep the
  // Settings step on a single screen; players open them only when they want them.
  const [showCustomSounds, setShowCustomSounds] = useState<boolean>(false);

  const updateWordsFromPreset = useCallback(() => {
    if (selectedPreset === '' || !cefrWordLists[selectedPreset]) {
        setWordsInput('');
        setError(selectedPreset !== '' ? 'Selected preset not found.' : '');
        return;
    }

    const levelData: WordListCategories = cefrWordLists[selectedPreset];
    let combinedWords: string[] = [];

    if (selectedWordTypes.nouns) combinedWords = combinedWords.concat(levelData.nouns);
    if (selectedWordTypes.verbs) combinedWords = combinedWords.concat(levelData.verbs);
    if (selectedWordTypes.adjectives) combinedWords = combinedWords.concat(levelData.adjectives);
    if (selectedWordTypes.phrasalVerbs && levelData.phrasalVerbs) combinedWords = combinedWords.concat(levelData.phrasalVerbs);

    if (combinedWords.length === 0) {
        setWordsInput('');
        setError(`No words available for the selected types in ${selectedPreset}. Please select at least one word type.`);
        return;
    }
    setError('');

    const shuffledWords = [...combinedWords].sort(() => 0.5 - Math.random());
    const actualWordCountToUse = Math.min(selectedWordCountForPreset, shuffledWords.length);
    const wordsToUse = shuffledWords.slice(0, actualWordCountToUse);

    setWordsInput(formatWordsForTextarea(wordsToUse));
  }, [selectedPreset, selectedWordTypes, selectedWordCountForPreset]);


  useEffect(() => {
    if (selectedPreset) {
      updateWordsFromPreset();
    }
  }, [selectedPreset, selectedWordTypes, selectedWordCountForPreset, updateWordsFromPreset]);

  // Demo guard: keep the time limit and game mode inside the free allowance.
  const effectiveMaxTimeLimit = isUnlocked ? MAX_TOTAL_TIME_LIMIT : DEMO_POLICY.maxTotalTimeLimit;

  useEffect(() => {
    setTotalTimeLimit(prev => Math.min(prev, effectiveMaxTimeLimit));
  }, [effectiveMaxTimeLimit]);

  useEffect(() => {
    if (!isUnlocked && !DEMO_POLICY.freeModes.includes(gameMode)) {
      setGameMode(GameMode.NORMAL);
    }
  }, [isUnlocked, gameMode]);

  // Words currently in the textarea, used for the live counter and validation.
  const parsedWordCount = wordsInput
    .split(/[\n,]+/)
    .map(word => word.trim())
    .filter(word => word.length > 0).length;
  const isOverDemoWordCap = !isUnlocked && parsedWordCount > DEMO_POLICY.maxWordsPerGame;

  // Demo tasting default: pre-fill a ready-to-play STARTERS list exactly once, so a
  // first-time visitor can hit Start without touching a single setting.
  const didApplyDemoDefault = useRef(false);
  useEffect(() => {
    if (didApplyDemoDefault.current) return;
    if (!isUnlocked && entryMode === 'suggest' && !selectedPreset) {
      didApplyDemoDefault.current = true;
      setSelectedPreset(DEMO_POLICY.freePresets[0]);
    }
  }, [isUnlocked, entryMode, selectedPreset]);

  const handleEntryModeChange = (mode: 'suggest' | 'manual') => {
    if (mode === entryMode) return;
    setEntryMode(mode);
    setError('');
    if (mode === 'manual') {
      // Hand-written list: blank the textarea but keep the picked pack so that
      // switching back to "Suggest & Curate" can restore the suggestions.
      setWordsInput('');
    } else if (selectedPreset) {
      // Returning to the suggest flow: repopulate the list from the kept pack.
      updateWordsFromPreset();
    }
  };


  const handleStartGame = useCallback(() => {
    const gameWords: string[] = wordsInput
        .split(/[\n,]+/)
        .map(word => word.trim())
        .filter(word => word.length > 0 && word.length < 50);

    if (gameWords.length < 3) {
      setError('Please enter at least 3 valid words (max 50 characters each). Or select a valid preset with enough words for your chosen types.');
      return;
    }

    if (!isUnlocked && gameWords.length > DEMO_POLICY.maxWordsPerGame) {
      setError(`The free demo plays up to ${DEMO_POLICY.maxWordsPerGame} words per game. Unlock the Full Version for up to 60.`);
      return;
    }

    if (gameMode !== GameMode.TEAM && (totalTimeLimit < MIN_TOTAL_TIME_LIMIT || totalTimeLimit > effectiveMaxTimeLimit)) {
      setError(`Game time must be between ${MIN_TOTAL_TIME_LIMIT / 60} and ${effectiveMaxTimeLimit / 60} minutes.`);
      return;
    }

    const isPresetEffectivelyActive = selectedPreset !== '';
    const levelHasPhrasalVerbs = !!cefrWordLists[selectedPreset as CEFRLevel]?.phrasalVerbs?.length;
    const noWordTypesSelected =
        !selectedWordTypes.nouns && !selectedWordTypes.verbs && !selectedWordTypes.adjectives &&
        !(levelHasPhrasalVerbs && selectedWordTypes.phrasalVerbs);

    if (isPresetEffectivelyActive && noWordTypesSelected) {
        setError('Please select at least one word type when using a preset.');
        return;
    }

    setError('');
    onGameStart({ words: gameWords, totalTimeLimit, gameMode, timePerWord });
  }, [wordsInput, totalTimeLimit, onGameStart, gameMode, selectedPreset, selectedWordTypes, timePerWord, isUnlocked, effectiveMaxTimeLimit]);

  const handlePresetSelect = (level: CEFRLevel) => {
    setSelectedPreset(level);
    // Reset word types and count to defaults when a new pack is picked.
    setSelectedWordTypes({ ...DEFAULT_SELECTED_WORD_TYPES });
    setSelectedWordCountForPreset(WORD_COUNT_OPTIONS[2]);
    setError('');
  };

  const handleWordTypeChange = (type: keyof SelectedWordTypes) => {
    setSelectedWordTypes(prev => {
        const newTypes = { ...prev, [type]: !prev[type] };
        const isPresetModeActive = selectedPreset !== '';
        const levelHasPhrasalVerbs = !!cefrWordLists[selectedPreset as CEFRLevel]?.phrasalVerbs?.length;
        const noTypes =
            !newTypes.nouns && !newTypes.verbs && !newTypes.adjectives &&
            !(levelHasPhrasalVerbs && newTypes.phrasalVerbs);

        if (isPresetModeActive && noTypes) {
            setError('Please select at least one word type.');
        } else {
            setError('');
        }
        return newTypes;
    });
  };

  const handleClearPreset = () => {
    setWordsInput('');
    setSelectedPreset('');
    setError('');
  };

  const handleGameModeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newMode = event.target.value as GameMode;
    setGameMode(newMode);
    setError('');
    // Clear settings when switching modes to avoid confusion
    setSelectedPreset(''); 
    setWordsInput('');    
    setSelectedWordTypes({ ...DEFAULT_SELECTED_WORD_TYPES });
    setSelectedWordCountForPreset(WORD_COUNT_OPTIONS[2]);
  };


  const customSoundCount =
    [
      customBackgroundMusic, customGameMusic, customStartGameSound, customCountdownGoSound,
      customTimesUpSound, customGameOverSound, customPlayAgainSound, customPowerupCollectedSound,
      customPowerupTimeFreezeSound, customPowerupSkipFreebieUsedSound, customRushHourActivationSound,
      customRushHourMusicLoop,
    ].filter(Boolean).length + customCorrectSounds.length + customSkipSounds.length;
  const hasAnyCustomSound = customSoundCount > 0;

  const handleResetAllCustomSounds = () => {
    if (!window.confirm('Remove every custom sound and go back to the built-in defaults?')) return;
    setCustomBackgroundMusic(null);
    setCustomGameMusic(null);
    setCustomStartGameSound(null);
    setCustomCountdownGoSound(null);
    setCustomTimesUpSound(null);
    setCustomGameOverSound(null);
    setCustomPlayAgainSound(null);
    setCustomPowerupCollectedSound(null);
    setCustomPowerupTimeFreezeSound(null);
    setCustomPowerupSkipFreebieUsedSound(null);
    setCustomRushHourActivationSound(null);
    setCustomRushHourMusicLoop(null);
    setCustomCorrectSounds([]);
    setCustomSkipSounds([]);
  };

  const renderSoundUploader = (
    id: string,
    label: string,
    currentSound: CustomSoundFile | null,
    setSound: (file: CustomSoundFile | null) => void,
    buttonText: string = 'Upload Sound'
  ) => (
    <div className="mb-2 p-2 border border-cyber-purple/30 rounded-lg">
      <label className="block text-xs font-semibold text-electric-blue mb-0.5">{label}:</label>
      {currentSound ? (
        <div className="flex items-center justify-between text-xs bg-dark-metal p-1.5 rounded">
          <span className="truncate" title={currentSound.name}>{currentSound.name}</span>
          <button onClick={() => setSound(null)} className="ml-2 text-danger-red hover:text-red-400 text-xs p-1">Clear</button>
        </div>
      ) : (
         <p className="text-xs text-muted-text mb-0.5">Default sound.</p>
      )}
      <FileUploadButton
        id={id}
        label={`Upload ${label}`}
        accept={ACCEPTED_AUDIO_ACCEPT_ATTR}
        onFileUpload={(file) => setSound(file)}
        buttonText={buttonText}
      />
    </div>
  );

  const renderMultiSoundUploader = (
    idPrefix: string,
    label: string,
    currentSounds: CustomSoundFile[],
    setSounds: (files: CustomSoundFile[]) => void
  ) => (
    <div className="mb-2 p-2 border border-cyber-purple/30 rounded-lg">
      <label className="block text-xs font-semibold text-electric-blue mb-0.5">{label}:</label>
      {currentSounds.length > 0 ? (
        <ul className="list-disc list-inside text-xs mb-1 max-h-16 overflow-y-auto bg-dark-metal p-1.5 rounded">
          {currentSounds.map((sound, index) => (
            <li key={`${idPrefix}-${index}`} className="flex justify-between items-center mb-0.5">
              <span className="truncate" title={sound.name}>{sound.name}</span>
              <button
                onClick={() => setSounds(currentSounds.filter((_, i) => i !== index))}
                className="ml-2 text-danger-red hover:text-red-400 text-xs p-1"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
         <p className="text-xs text-muted-text mb-0.5">Default sounds.</p>
      )}
      <FileUploadButton
        id={`${idPrefix}-uploader`}
        label={`Add ${label}`}
        accept={ACCEPTED_AUDIO_ACCEPT_ATTR}
        onFileUpload={(file) => setSounds([...currentSounds, file])}
        buttonText={`Add Custom ${label.replace(' Sounds', ' Sound')}`}
      />
    </div>
  );

  const handleCopyToClipboard = (data: string, soundName: string) => {
    navigator.clipboard.writeText(data)
      .then(() => alert(`${soundName} base64 data copied to clipboard!`))
      .catch(err => {
        console.error('Failed to copy base64 data: ', err);
        alert(`Failed to copy ${soundName} data. See console for details.`);
      });
  };

  const renderBase64Exporter = (soundFile: CustomSoundFile | null, name: string) => {
    if (!soundFile) return null;
    return (
      <div className="my-1 p-1.5 border border-muted-text/30 rounded text-left">
        <p className="text-xs text-light-text font-semibold">{name}: <span className="font-normal italic text-muted-text">{soundFile.name}</span></p>
        <button
          type="button"
          onClick={() => handleCopyToClipboard(soundFile.data, name)}
          className="text-xs bg-electric-blue/70 hover:bg-electric-blue text-dark-metal py-0.5 px-1.5 rounded mt-0.5 futuristic-button"
        >
          Copy Base64 Data
        </button>
      </div>
    );
  };

  const renderMultiBase64Exporter = (soundFiles: CustomSoundFile[], namePrefix: string) => {
    return soundFiles.map((soundFile, index) => (
        <div key={`${namePrefix}-${index}`} className="my-1 p-1.5 border border-muted-text/30 rounded text-left">
            <p className="text-xs text-light-text font-semibold">{`${namePrefix} #${index + 1}`}: <span className="font-normal italic text-muted-text">{soundFile.name}</span></p>
            <button
            type="button"
            onClick={() => handleCopyToClipboard(soundFile.data, `${namePrefix} #${index + 1}`)}
            className="text-xs bg-electric-blue/70 hover:bg-electric-blue text-dark-metal py-0.5 px-1.5 rounded mt-0.5 futuristic-button"
            >
            Copy Base64 Data
            </button>
        </div>
    ));
  };

  // Helper booleans for the start button's disabled logic
  const isWordsInputEmpty = wordsInput.trim().length === 0;
  const isTimeLimitInvalid = gameMode !== GameMode.TEAM && (totalTimeLimit < MIN_TOTAL_TIME_LIMIT || totalTimeLimit > effectiveMaxTimeLimit);
  
  const isPresetEffectivelyActive = selectedPreset !== '';

  // Phrasal verbs are only curated for the higher bands (B1+), so the toggle is
  // shown (and counted) only when the selected pack actually carries them.
  const levelHasPhrasalVerbs = isPresetEffectivelyActive && !!cefrWordLists[selectedPreset as CEFRLevel]?.phrasalVerbs?.length;

  const visibleWordTypeKeys = (Object.keys(selectedWordTypes) as Array<keyof SelectedWordTypes>)
    .filter(type => type !== 'phrasalVerbs' || levelHasPhrasalVerbs);

  const noWordTypesSelected =
    !selectedWordTypes.nouns && !selectedWordTypes.verbs && !selectedWordTypes.adjectives &&
    !(levelHasPhrasalVerbs && selectedWordTypes.phrasalVerbs);

  const disableStartDueToPresetAndNoTypes = isPresetEffectivelyActive && noWordTypesSelected;

  // Wizard navigation
  const isLastStep = step === WIZARD_STEPS.length - 1;
  const startDisabled =
    isWordsInputEmpty ||
    isTimeLimitInvalid ||
    isOverDemoWordCap ||
    disableStartDueToPresetAndNoTypes;

  const goToStep = (next: number) => {
    setError('');
    setStep(Math.max(0, Math.min(next, WIZARD_STEPS.length - 1)));
  };

  const handlePrimaryAction = () => {
    if (isLastStep) {
      handleStartGame();
    } else {
      goToStep(step + 1);
    }
  };

  // Everything held back from the free demo, surfaced as tappable chips so players
  // discover what the Full Version adds without digging through closed dropdowns.
  // Split in two rows: headline extras first, then the locked word packs.
  const lockedFeaturePerks: string[] = [
    '💀 Hell Mode',
    '🔢 Up to 60 words',
    '⏱️ Up to 10 minutes',
    '🎵 Custom Sounds',
  ];
  const lockedPackPerks: string[] = [
    CEFRLevel.MOVERS,
    CEFRLevel.FLYERS,
    CEFRLevel.KET,
    CEFRLevel.PET,
    CEFRLevel.PRE_IELTS,
  ].map(level => `📚 ${level.split(' (')[0]} pack`);

  const renderPerkChips = (perks: string[]) =>
    perks.map(perk => (
      <button
        key={perk}
        type="button"
        onClick={() => setShowUnlockDialog(true)}
        className="futuristic-button rounded-full border border-warning-yellow/40 bg-dark-metal/60 px-1.5 py-0.5 text-[0.6rem] text-warning-yellow/90 hover:border-warning-yellow hover:text-warning-yellow"
      >
        {perk} 🔒
      </button>
    ));

  return (
    <div className="flex h-full flex-col items-center text-light-text">
      <h2 className="text-2xl sm:text-3xl font-heading font-semibold text-electric-blue setup-screen-title">Game Setup</h2>

      {/* Wizard step indicator — tap a step to jump straight to it. */}
      <div className="my-2 flex w-full items-center justify-center gap-1.5 sm:gap-2" role="tablist" aria-label="Setup steps">
        {WIZARD_STEPS.map((label, index) => {
          const isActive = index === step;
          const isDone = index < step;
          return (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => goToStep(index)}
              className={`futuristic-button flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.7rem] sm:text-xs ${
                isActive
                  ? 'bg-gradient-to-r from-cyber-purple to-electric-blue font-semibold text-dark-metal'
                  : isDone
                  ? 'bg-electric-blue/20 text-electric-blue'
                  : 'bg-dark-metal text-muted-text hover:text-electric-blue'
              }`}
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-dark-metal/60 text-[0.6rem] font-bold text-light-text">
                {isDone ? '✓' : index + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Panel area — one step at a time; scrolls only if a single step is tall. */}
      <div key={step} className="flex min-h-0 w-full flex-1 flex-col items-center gap-2 overflow-y-auto overflow-x-hidden animate-fadeInScaleUp sm:gap-3">
      {step === 0 && (
      <>
      {!isUnlocked && (
        <div className="w-full rounded-lg border border-warning-yellow/40 bg-warning-yellow/10 px-2.5 py-1.5 text-left">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[0.7rem] leading-tight text-warning-yellow">
              <strong className="font-heading tracking-wider">DEMO</strong> · Normal + Team · ≤{DEMO_POLICY.maxWordsPerGame} words · ≤{DEMO_POLICY.maxTotalTimeLimit / 60} min
            </p>
            <button
              type="button"
              onClick={() => setShowUnlockDialog(true)}
              className="futuristic-button shrink-0 rounded-md bg-cyber-purple/70 px-2.5 py-1 text-[0.7rem] font-semibold text-light-text hover:bg-cyber-purple"
            >
              Unlock
            </button>
          </div>
          <div className="mt-1 flex flex-col gap-1">
            <div className="flex flex-wrap gap-1">{renderPerkChips(lockedFeaturePerks)}</div>
            <div className="flex flex-wrap gap-1">{renderPerkChips(lockedPackPerks)}</div>
          </div>
        </div>
      )}

      {/* Game Mode + Game Time — side by side (2 columns) to keep the step compact */}
      <div className="grid w-full grid-cols-2 gap-2">
        <div className="rounded-lg border border-cyber-purple/30 p-2 text-left sm:p-3">
          <label htmlFor="gameModeSelect" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-electric-blue setup-screen-label sm:text-sm">
            Game Mode:
          </label>
          <select
            id="gameModeSelect"
            value={gameMode}
            onChange={handleGameModeChange}
            className="w-full rounded-lg p-2 shadow-sm futuristic-input text-xs transition duration-150 ease-in-out focus:border-neon-green focus:ring-2 focus:ring-neon-green setup-screen-input sm:text-sm"
          >
            {[
              { value: GameMode.NORMAL, label: '😊 Normal' },
              { value: GameMode.TEAM, label: '🤝 Team' },
              { value: GameMode.HELL, label: '💀 Hell' },
            ].map(({ value, label }) => {
              const locked = !isUnlocked && !DEMO_POLICY.freeModes.includes(value);
              return (
                <option key={value} value={value} disabled={locked}>
                  {label}{locked ? ' 🔒' : ''}
                </option>
              );
            })}
          </select>
        </div>

        <div className="rounded-lg border border-cyber-purple/30 p-2 text-left sm:p-3">
          {gameMode === GameMode.TEAM ? (
            <>
              <label htmlFor="timePerWord" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-electric-blue setup-screen-label sm:text-sm">
                Time / Word:
              </label>
              <select
                id="timePerWord"
                value={timePerWord}
                onChange={(e) => setTimePerWord(Number(e.target.value))}
                className="w-full rounded-lg p-2 shadow-sm futuristic-input text-xs setup-screen-input sm:text-sm"
              >
                {TIME_PER_WORD_OPTIONS.map(time => (
                  <option key={time} value={time}>{time} seconds</option>
                ))}
              </select>
            </>
          ) : (
            <>
              <label htmlFor="totalTimeLimit" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-electric-blue setup-screen-label sm:text-sm">
                Game Time:
              </label>
              <input
                id="totalTimeLimit"
                type="number"
                value={totalTimeLimit}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    setTotalTimeLimit(Math.min(val, effectiveMaxTimeLimit));
                  } else if (e.target.value === '') {
                    setTotalTimeLimit(MIN_TOTAL_TIME_LIMIT);
                  }
                }}
                min={MIN_TOTAL_TIME_LIMIT}
                max={effectiveMaxTimeLimit}
                step="30"
                className="w-full rounded-lg p-2 shadow-sm futuristic-input text-xs setup-screen-input sm:text-sm"
                aria-label="Set total game time in seconds"
              />
              <p className="mt-1 text-left text-[0.6rem] leading-tight text-muted-text setup-screen-small-text">
                {Math.floor(totalTimeLimit / 60)}m {totalTimeLimit % 60}s · {MIN_TOTAL_TIME_LIMIT / 60}-{effectiveMaxTimeLimit / 60}m
                {!isUnlocked && ' · Unlock 10m'}
              </p>
            </>
          )}
        </div>
      </div>

      {gameMode === GameMode.TEAM && (
        <p className="w-full text-left text-[0.7rem] text-cyan-300 setup-screen-small-text">Two teams take turns guessing words. Rack up points and sabotage your rivals!</p>
      )}
      {gameMode === GameMode.HELL && (
        <p className="w-full text-left text-[0.7rem] text-warning-yellow setup-screen-small-text">Hell Mode has special rules like skip penalties and intense rush hours. Check instructions!</p>
      )}

      {/* Word Pack — compact dropdown, only relevant to the "Suggest & Curate" flow */}
      {entryMode === 'suggest' && (
      <div className="w-full rounded-lg border border-cyber-purple/30 p-2 sm:p-3">
        <label htmlFor="wordPackSelect" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-electric-blue text-left setup-screen-label sm:text-sm">
          Word Pack (suggests words):
        </label>
        <select
          id="wordPackSelect"
          value={selectedPreset}
          onChange={(e) => {
            const level = e.target.value as CEFRLevel | '';
            if (level === '') return;
            handlePresetSelect(level);
          }}
          className="w-full rounded-lg p-2 shadow-sm futuristic-input text-xs setup-screen-input sm:text-sm"
        >
          <option value="" disabled>Choose a word pack…</option>
          {Object.values(CEFRLevel).map(level => {
            const locked = !isUnlocked && !DEMO_POLICY.freePresets.includes(level);
            return (
              <option key={level} value={level} disabled={locked}>
                {level}{locked ? ' 🔒 Full Version' : ''}
              </option>
            );
          })}
        </select>
        <p className="mt-1 text-left text-[0.7rem] text-muted-text setup-screen-small-text">
          {selectedPreset
            ? 'Words are suggested from this pack — refine them in the next step.'
            : 'Pick a pack for a ready-to-play word list, or type your own in the next step.'}
        </p>
      </div>
      )}
      </>
      )}

      {step === 1 && (
      <>
      {/* Word entry flow selector */}
      <div className="w-full">
        <span className="mb-2 block text-sm font-semibold text-electric-blue text-left uppercase tracking-wider setup-screen-label">
          Word List
        </span>
        <div className="grid grid-cols-2 gap-2 px-2" role="tablist" aria-label="How to build your word list">
          <button
            type="button"
            role="tab"
            aria-selected={entryMode === 'suggest'}
            onClick={() => handleEntryModeChange('suggest')}
            className={`futuristic-button hover-lift rounded-lg py-1.5 px-3 text-xs sm:text-sm ${entryMode === 'suggest' ? 'bg-electric-blue text-dark-metal' : 'bg-dark-metal text-electric-blue hover:bg-cyber-purple/30'}`}
          >
            🎲 Suggestion
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={entryMode === 'manual'}
            onClick={() => handleEntryModeChange('manual')}
            className={`futuristic-button hover-lift rounded-lg py-1.5 px-3 text-xs sm:text-sm ${entryMode === 'manual' ? 'bg-electric-blue text-dark-metal' : 'bg-dark-metal text-electric-blue hover:bg-cyber-purple/30'}`}
          >
            ✍️ Enter your word list
          </button>
        </div>
        <p className="mt-2 text-left text-xs text-muted-text setup-screen-small-text">
          {entryMode === 'suggest'
            ? 'Words are suggested from your pack — edit freely below.'
            : 'Type your own list — comma or new line separated.'}
        </p>
      </div>

      {/* Curate the suggested words — two columns to save vertical space */}
      {entryMode === 'suggest' && isPresetEffectivelyActive && (
      <div className="w-full rounded-lg border border-cyber-purple/30 p-2 animate-fadeInScaleUp">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="text-left">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-electric-blue setup-screen-label sm:text-sm">
              Word Types:
            </label>
            <div className="flex flex-col gap-1">
              {visibleWordTypeKeys.map(type => (
                <label key={type} className="flex items-center cursor-pointer text-xs setup-screen-checkbox-label sm:text-sm">
                  <input
                    type="checkbox"
                    checked={selectedWordTypes[type]}
                    onChange={() => handleWordTypeChange(type)}
                    className="custom-checkbox"
                    aria-labelledby={`word-type-label-${type}`}
                  />
                  <span id={`word-type-label-${type}`}>{WORD_TYPE_LABELS[type]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="text-left">
            <label htmlFor="wordCountPreset" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-electric-blue setup-screen-label sm:text-sm">
              Number of Words:
            </label>
            <select
              id="wordCountPreset"
              value={selectedWordCountForPreset}
              onChange={(e) => setSelectedWordCountForPreset(Number(e.target.value))}
              className="w-full rounded-lg p-2 shadow-sm futuristic-input text-xs setup-screen-input sm:text-sm"
              aria-label="Select number of words from preset pool"
              disabled={noWordTypesSelected}
            >
              {WORD_COUNT_OPTIONS.map(count => {
                const locked = !isUnlocked && !DEMO_POLICY.freeWordCounts.includes(count);
                return (
                  <option key={count} value={count} disabled={locked}>
                    {count} words{locked ? ' 🔒' : ''}
                  </option>
                );
              })}
            </select>
            <div className="mt-1.5 flex gap-2">
              <button
                type="button"
                onClick={updateWordsFromPreset}
                disabled={noWordTypesSelected}
                className="futuristic-button flex-1 rounded-md bg-dark-metal hover:bg-cyber-purple/30 text-electric-blue py-1.5 px-2 text-xs sm:text-sm disabled:opacity-40"
                title="Shuffle a new set of words from this pack"
              >
                🎲 Shuffle
              </button>
              <button
                type="button"
                onClick={handleClearPreset}
                className="futuristic-button flex-1 rounded-md bg-danger-red/70 hover:bg-danger-red text-light-text py-1.5 px-2 text-xs sm:text-sm"
                title="Clear the loaded pack from the word list"
              >
                Clear pack
              </button>
            </div>
            {noWordTypesSelected && (
              <p className="mt-1 text-[0.7rem] text-danger-red setup-screen-small-text">Select a word type.</p>
            )}
          </div>
        </div>
      </div>
      )}

      <div className="w-full">
        <label htmlFor="wordsInput" className="block text-sm font-semibold text-electric-blue mb-2 text-left uppercase tracking-wider setup-screen-label">
          Your Words
          <span className={`text-xs normal-case ${isOverDemoWordCap ? 'text-danger-red font-semibold' : 'text-muted-text'}`}>
            {' '}({parsedWordCount} {parsedWordCount === 1 ? 'word' : 'words'}, min 3{!isUnlocked ? `, demo max ${DEMO_POLICY.maxWordsPerGame}` : ''})
          </span>:
        </label>
        <textarea
          id="wordsInput"
          value={wordsInput}
          onChange={(e) => {
            setWordsInput(e.target.value);
          }}
          rows={entryMode === 'manual' ? 6 : 3}
          className="w-full p-2 sm:p-3 rounded-lg shadow-sm futuristic-input text-sm sm:text-base setup-screen-input"
          placeholder={
            entryMode === 'suggest'
              ? "Words from the pack appear here — edit them freely..."
              : "E.g., Apple, Banana, Cherry"
          }
          aria-label="Word list for the game"
        />
        <p className="text-xs text-muted-text mt-2 text-left setup-screen-small-text">
          {entryMode === 'suggest'
            ? (selectedPreset
                ? 'Suggested from your pack. Edit freely, or press 🎲 Shuffle for a new set.'
                : 'Pick a pack in the previous step to get suggestions, or just type your own words.')
            : 'One word per line, or separated by commas.'}
        </p>
      </div>
      </>
      )}

      {step === 2 && (
      <>
      {/* Audio levels live here and in the in-game pause menu (Esc). */}
      <div className="w-full rounded-lg border border-electric-blue/30 p-2 sm:p-3">
        <p className="mb-2 text-left text-xs font-semibold uppercase tracking-wider text-electric-blue">
          Sound
        </p>
        <VolumeControls
          idPrefix="setup"
          musicVolume={musicVolume}
          onMusicVolumeChange={onMusicVolumeChange}
          effectsVolume={effectsVolume}
          onEffectsVolumeChange={onEffectsVolumeChange}
        />
      </div>

      {/* Custom sounds — folded by default: the 14 uploaders would otherwise push this
          step past one screen. Volume/SFX above stay visible at all times. */}
      <div className="w-full">
        <button
          type="button"
          onClick={() => setShowCustomSounds(!showCustomSounds)}
          className="futuristic-button flex w-full items-center justify-between gap-2 rounded-lg border border-electric-blue/30 bg-dark-metal/40 px-3 py-2 text-left"
          aria-expanded={showCustomSounds}
          aria-controls="custom-sounds-panel"
          title="Upload your own audio for every moment of the game"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-electric-blue sm:text-sm">
            🎵 Custom Sounds
          </span>
          <span className="flex items-center gap-2 text-[0.7rem] text-muted-text">
            {!isUnlocked ? '🔒 Full version' : customSoundCount > 0 ? `${customSoundCount} uploaded` : 'Optional'}
            <span aria-hidden="true">{showCustomSounds ? '▴' : '▾'}</span>
          </span>
        </button>

        {showCustomSounds && (
        <div id="custom-sounds-panel" className="mt-2 flex animate-fadeInScaleUp flex-col gap-2">
        {!isUnlocked ? (
          <div className="rounded-lg border border-electric-blue/30 p-2 sm:p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-left text-[0.7rem] italic leading-tight text-muted-text">
                Upload your own audio for every moment of the game.
              </p>
              <button
                type="button"
                onClick={() => setShowUnlockDialog(true)}
                className="futuristic-button shrink-0 rounded-md bg-cyber-purple/70 px-2.5 py-1 text-[0.7rem] font-semibold text-light-text hover:bg-cyber-purple"
              >
                🔒 Unlock
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {CUSTOM_SOUND_SLOTS.map(slot => (
                <div key={slot} className="flex items-center justify-between gap-1 rounded-md border border-cyber-purple/30 bg-dark-metal/40 px-1.5 py-1 text-[0.6rem] text-muted-text">
                  <span className="truncate">{slot}</span>
                  <span aria-hidden="true">🔒</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-h-[46vh] overflow-y-auto rounded-lg border border-electric-blue/30 p-2 sm:p-3">
            <p className="text-xs text-muted-text mb-2 italic">Upload audio ({ACCEPTED_AUDIO_FORMATS_LABEL}, max {MAX_AUDIO_FILE_SIZE_MB}MB each). Stored in this browser — Clear on a sound restores the default.</p>
            {renderSoundUploader('setupMusicUpload', 'Setup Music', customBackgroundMusic, setCustomBackgroundMusic, 'Upload Setup Music')}
            {renderSoundUploader('gameMusicUpload', 'Game Music', customGameMusic, setCustomGameMusic, 'Upload Game Music')}
            {renderSoundUploader('startGameSoundUpload', 'Start Game', customStartGameSound, setCustomStartGameSound)}
            {renderSoundUploader('countdownGoSoundUpload', 'Countdown "GO!"', customCountdownGoSound, setCustomCountdownGoSound)}
            {renderMultiSoundUploader('correctSoundsUpload', 'Correct Guess', customCorrectSounds, setCustomCorrectSounds)}
            {renderMultiSoundUploader('skipSoundsUpload', 'Skip Word', customSkipSounds, setCustomSkipSounds)}
            {renderSoundUploader('timesUpSoundUpload', 'Time\'s Up', customTimesUpSound, setCustomTimesUpSound)}
            {renderSoundUploader('gameOverSoundUpload', 'Game Over (Win)', customGameOverSound, setCustomGameOverSound)}
            {renderSoundUploader('playAgainSoundUpload', 'Play Again', customPlayAgainSound, setCustomPlayAgainSound)}

            <h4 className="text-sm font-semibold text-neon-green mt-3 mb-1 border-t border-electric-blue/20 pt-2">Power-Up Sounds:</h4>
            {renderSoundUploader('powerupCollectedSoundUpload', 'Collected', customPowerupCollectedSound, setCustomPowerupCollectedSound)}
            {renderSoundUploader('powerupTimeFreezeSoundUpload', 'Time Freeze', customPowerupTimeFreezeSound, setCustomPowerupTimeFreezeSound)}
            {renderSoundUploader('powerupSkipFreebieUsedSoundUpload', 'Skip Freebie Used', customPowerupSkipFreebieUsedSound, setCustomPowerupSkipFreebieUsedSound)}
            {renderSoundUploader('rushHourActivationSoundUpload', 'Rush Hour Activate', customRushHourActivationSound, setCustomRushHourActivationSound)}
            {renderSoundUploader('rushHourMusicLoopUpload', 'Rush Hour Music', customRushHourMusicLoop, setCustomRushHourMusicLoop)}

            {hasAnyCustomSound && (
              <button
                type="button"
                onClick={handleResetAllCustomSounds}
                className="futuristic-button mt-2 w-full rounded-md bg-danger-red/70 py-1.5 px-3 text-xs text-light-text hover:bg-danger-red sm:text-sm"
                title="Remove every custom sound and go back to the built-in defaults"
              >
                ♻️ Reset all to default sounds
              </button>
            )}


            <div className="mt-3 sm:mt-4 border-t border-electric-blue/20 pt-2 sm:pt-3">
                 <button
                    type="button"
                    onClick={() => setDisplayDevUtils(!displayDevUtils)}
                    className="futuristic-button bg-dark-metal hover:bg-cyber-purple/30 text-neon-green py-1.5 px-3 sm:py-2 sm:px-4 rounded-md text-xs sm:text-sm w-full mb-1"
                    aria-expanded={displayDevUtils}
                    aria-controls="dev-utils-panel"
                >
                    {displayDevUtils ? 'Hide' : 'Show'} Dev Utilities {displayDevUtils ? '▴' : '▾'}
                </button>
                {displayDevUtils && (
                    <div id="dev-utils-panel" className="mt-1 p-2 border border-neon-green/30 rounded-lg animate-fadeInScaleUp max-h-32 sm:max-h-40 overflow-y-auto">
                        <h4 className="text-sm font-semibold text-neon-green mb-1">Export Custom Sound Data</h4>
                        <p className="text-xs text-muted-text mb-2">Copy Base64 to embed in `constants.ts`.</p>
                        {renderBase64Exporter(customBackgroundMusic, 'Setup Music')}
                        {renderBase64Exporter(customGameMusic, 'Game Music')}
                        {renderBase64Exporter(customStartGameSound, 'Start Game')}
                        {renderBase64Exporter(customCountdownGoSound, 'Countdown "GO!"')}
                        {renderMultiBase64Exporter(customCorrectSounds, 'Correct Guess')}
                        {renderMultiBase64Exporter(customSkipSounds, 'Skip Word')}
                        {renderBase64Exporter(customTimesUpSound, 'Time\'s Up')}
                        {renderBase64Exporter(customGameOverSound, 'Game Over (Win)')}
                        {renderBase64Exporter(customPlayAgainSound, 'Play Again')}
                        {renderBase64Exporter(customPowerupCollectedSound, 'Collected')}
                        {renderBase64Exporter(customPowerupTimeFreezeSound, 'Time Freeze')}
                        {renderBase64Exporter(customPowerupSkipFreebieUsedSound, 'Skip Freebie Used')}
                        {renderBase64Exporter(customRushHourActivationSound, 'Rush Hour Activate')}
                        {renderBase64Exporter(customRushHourMusicLoop, 'Rush Hour Music')}

                        {!hasAnyCustomSound && <p className="text-xs text-muted-text">No custom sounds uploaded yet.</p>}
                    </div>
                )}
            </div>
          </div>
        )}
        </div>
        )}
      </div>
      </>
      )}
      </div>

      {error && <p className="text-danger-red text-xs sm:text-sm bg-red-500/20 p-1.5 sm:p-2 rounded-md border border-danger-red mt-2 flex-shrink-0">{error}</p>}

      {/* Wizard navigation — the primary action stays docked at the bottom. */}
      <div className="mt-2 flex w-full flex-shrink-0 items-center gap-2">
        {step > 0 && (
          <button
            type="button"
            onClick={() => goToStep(step - 1)}
            className="futuristic-button shrink-0 rounded-lg bg-dark-metal px-3 py-2.5 text-sm text-electric-blue hover:bg-cyber-purple/30 sm:px-5"
          >
            ◂ Back
          </button>
        )}
        <button
          type="button"
          onClick={handlePrimaryAction}
          disabled={isLastStep && startDisabled}
          className="flex-1 rounded-lg bg-gradient-to-r from-cyber-purple to-electric-blue hover:from-electric-blue hover:to-neon-green text-dark-metal font-bold py-2.5 px-6 shadow-md hover:shadow-lg futuristic-button text-md sm:text-lg setup-screen-button disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={isLastStep ? 'Start game button' : `Go to ${WIZARD_STEPS[step + 1]} step`}
        >
          {isLastStep ? 'Start Game!' : `Next: ${WIZARD_STEPS[step + 1]} ▸`}
        </button>
      </div>

      <UnlockDialog
        isOpen={showUnlockDialog}
        onClose={() => setShowUnlockDialog(false)}
        onUnlock={onUnlock}
      />
    </div>
  );
};