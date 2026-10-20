import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { GameSettings, CustomSoundFile, GameMode } from '../types';
import { DEFAULT_TOTAL_TIME_LIMIT, MIN_TOTAL_TIME_LIMIT, MAX_TOTAL_TIME_LIMIT, DEMO_POLICY } from '../constants';
import { FileUploadButton, ACCEPTED_AUDIO_ACCEPT_ATTR, ACCEPTED_AUDIO_FORMATS_LABEL, MAX_AUDIO_FILE_SIZE_MB } from './FileUploadButton';
import { UnlockDialog } from './UnlockDialog';
import { Icon } from './Icon';
import type { UnlockOutcome } from '../services/payments';
import { VolumeControls } from './VolumeControls';
import { CEFRLevel, cefrWordLists, formatWordsForTextarea, WORD_COUNT_OPTIONS } from '../cefrWordLists';
import { addWordSet, readWordSets, removeWordSet, type SavedWordSet } from '../services/wordSets';
import { SOLO_FREE_SKIPS, SOLO_FREE_TRACK_ID, SOLO_START_HEARTS, SOLO_STYLES, SOLO_STYLE_TIME, SOLO_TIMER_FLOOR, SOLO_TRACKS, DAILY_TRACK, isDailyDoneToday, shortLevel, type SoloTrack, type SoloStyle } from '../services/solo';
import { readLocalSoloBest } from '../services/soloLeaderboard';
import { readDueReviews, reviewCount } from '../services/review';
import { confirmDialog, toast } from './Feedback';

interface SetupScreenProps {
  /** Solo is a mode choice, so it arrives through this same container. */
  initialGameMode: GameMode | 'solo';
  isUnlocked: boolean;
  onUnlock: (code: string) => Promise<UnlockOutcome>;
  onGameStart: (settings: GameSettings) => void;
  /** Solo is offered as a fourth mode; this container collects its track before launch. */
  onStartSolo: (track: SoloTrack, style: SoloStyle) => void;
  /** Today's Challenge launches straight from its card — no track, no settings. */
  onStartDaily: () => void;
  /** Whether the player is signed in — used for the Solo leaderboard footnote. */
  isSignedIn: boolean;
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

/** Friendly "Pre-A1 → A2" label for a track's difficulty span. */
const soloRangeLabel = (track: SoloTrack): string => {
  const first = shortLevel(track.levels[0]);
  const last = shortLevel(track.levels[track.levels.length - 1]);
  return first === last ? first : `${first} → ${last}`;
};

// App-like wizard: the setup is split into sequential panels so the primary action
// is always reachable without scrolling through one long form.
const PASS_AND_PLAY_STEPS = ['Mode', 'Words', 'Settings'] as const;
// Solo needs no word list — it draws its own endless words — so that step is swapped
// for the track picker, letting a run be fully configured without leaving this shell.
const SOLO_STEPS = ['Mode', 'Pick a track', 'Settings'] as const;
/** Solo is a first-class mode choice, but it is not a `GameMode` value. */
type SetupMode = GameMode | 'solo';

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
  onStartSolo,
  onStartDaily,
  isSignedIn,
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

  const [selectedPresets, setSelectedPresets] = useState<CEFRLevel[]>([]);
  const [selectedWordTypes, setSelectedWordTypes] = useState<SelectedWordTypes>({ ...DEFAULT_SELECTED_WORD_TYPES });
  const [selectedWordCountForPreset, setSelectedWordCountForPreset] = useState<number>(WORD_COUNT_OPTIONS[2]);
  const [gameMode, setGameMode] = useState<SetupMode>(initialGameMode);
  // Solo's track picker is a step of this same wizard, so the choice is held here.
  const [selectedSoloTrackId, setSelectedSoloTrackId] = useState<string>(SOLO_FREE_TRACK_ID);
  // The two Solo play styles train different skills, so the choice is made on the Mode
  // step rather than hidden in settings. 'meaning' is the shape Solo shipped as, so a
  // player who never touches the picker gets the mode they already know.
  const [soloStyle, setSoloStyle] = useState<SoloStyle>('meaning');
  // Two explicit word-entry flows: let the app suggest words to curate, or type your own.
  const [entryMode, setEntryMode] = useState<'suggest' | 'manual'>('suggest');
  const [showUnlockDialog, setShowUnlockDialog] = useState<boolean>(false);
  // Saved lists the teacher can reload in one tap instead of retyping a topic's words.
  const [wordSets, setWordSets] = useState<SavedWordSet[]>(() => readWordSets());
  const [setNameInput, setSetNameInput] = useState<string>('');
  const [setsNotice, setSetsNotice] = useState<string>('');
  // Save/Load open as focused dialogs instead of an always-on panel, so the step stays clean.
  const [saveDialogOpen, setSaveDialogOpen] = useState<boolean>(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState<boolean>(false);
  // When set, Save updates this exact set (even if renamed) instead of creating a new one.
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  // The custom-sound uploaders are 14 rows tall, so they stay folded away to keep the
  // Settings step on a single screen; players open them only when they want them.
  const [showCustomSounds, setShowCustomSounds] = useState<boolean>(false);

  // Solo keeps the demo allowance: it is free for everyone, only its tracks are gated.
  const isSoloMode = gameMode === 'solo';
  const wizardSteps: readonly string[] = isSoloMode ? SOLO_STEPS : PASS_AND_PLAY_STEPS;

  // Local bests are device-scoped; read them once per mount for the track picker.
  const soloBests = useMemo(
    () => Object.fromEntries(SOLO_TRACKS.map((track) => [track.id, readLocalSoloBest(track.id)])),
    [],
  );
  // Today's Challenge state and the Memory Anchor pile, read once per visit to the step.
  const dailyStatus = useMemo(
    () => ({ done: isDailyDoneToday(), anchors: reviewCount(), due: readDueReviews().length }),
    [],
  );
  const selectedSoloTrack = SOLO_TRACKS.find((track) => track.id === selectedSoloTrackId) ?? SOLO_TRACKS[0];

  const updateWordsFromPreset = useCallback(() => {
    if (selectedPresets.length === 0) {
        setWordsInput('');
        setError('');
        return;
    }

    let combinedWords: string[] = [];
    selectedPresets.forEach((level) => {
        const levelData = cefrWordLists[level];
        if (!levelData) return;
        if (selectedWordTypes.nouns) combinedWords = combinedWords.concat(levelData.nouns);
        if (selectedWordTypes.verbs) combinedWords = combinedWords.concat(levelData.verbs);
        if (selectedWordTypes.adjectives) combinedWords = combinedWords.concat(levelData.adjectives);
        if (selectedWordTypes.phrasalVerbs && levelData.phrasalVerbs) combinedWords = combinedWords.concat(levelData.phrasalVerbs);
    });

    // Packs overlap — a word can sit in two bands — so the merged pool is de-duplicated
    // before it is shuffled and sliced.
    const pool = Array.from(new Set(combinedWords));

    if (pool.length === 0) {
        setWordsInput('');
        setError('No words available for the selected types in these packs. Please select at least one word type.');
        return;
    }
    setError('');

    const shuffledWords = [...pool].sort(() => 0.5 - Math.random());
    const actualWordCountToUse = Math.min(selectedWordCountForPreset, shuffledWords.length);
    const wordsToUse = shuffledWords.slice(0, actualWordCountToUse);

    setWordsInput(formatWordsForTextarea(wordsToUse));
  }, [selectedPresets, selectedWordTypes, selectedWordCountForPreset]);


  useEffect(() => {
    if (selectedPresets.length > 0) {
      updateWordsFromPreset();
    }
  }, [selectedPresets, selectedWordTypes, selectedWordCountForPreset, updateWordsFromPreset]);

  // Demo guard: keep the time limit and game mode inside the free allowance.
  const effectiveMaxTimeLimit = isUnlocked ? MAX_TOTAL_TIME_LIMIT : DEMO_POLICY.maxTotalTimeLimit;

  useEffect(() => {
    setTotalTimeLimit(prev => Math.min(prev, effectiveMaxTimeLimit));
  }, [effectiveMaxTimeLimit]);

  useEffect(() => {
    if (isUnlocked || gameMode === 'solo') return;
    if (!DEMO_POLICY.freeModes.includes(gameMode)) {
      setGameMode(GameMode.NORMAL);
    }
  }, [isUnlocked, gameMode]);

  // Words currently in the textarea, used for the live counter, validation and saving.
  const parsedWords = wordsInput
    .split(/[\n,]+/)
    .map(word => word.trim())
    .filter(word => word.length > 0);
  const parsedWordCount = parsedWords.length;
  const isOverDemoWordCap = !isUnlocked && parsedWordCount > DEMO_POLICY.maxWordsPerGame;

  // Demo tasting default: pre-fill a ready-to-play STARTERS list exactly once, so a
  // first-time visitor can hit Start without touching a single setting.
  const didApplyDemoDefault = useRef(false);
  useEffect(() => {
    if (didApplyDemoDefault.current) return;
    if (!isUnlocked && entryMode === 'suggest' && selectedPresets.length === 0) {
      didApplyDemoDefault.current = true;
      // The demo lands on the youngest pack only — a short, familiar list to react to.
      setSelectedPresets([DEMO_POLICY.freePresets[0]]);
    }
  }, [isUnlocked, entryMode, selectedPresets]);

  const handleEntryModeChange = (mode: 'suggest' | 'manual') => {
    if (mode === entryMode) return;
    setEntryMode(mode);
    setError('');
    if (mode === 'manual') {
      // Hand-written list: blank the textarea but keep the picked packs so that
      // switching back to "Suggest & Curate" can restore the suggestions.
      setWordsInput('');
    } else if (selectedPresets.length > 0) {
      // Returning to the suggest flow: repopulate the list from the kept packs.
      updateWordsFromPreset();
    }
  };

  // Save opens a dialog so a teacher can name a brand-new set or pick an existing one to edit.
  const openSaveDialog = () => {
    setEditingSetId(null);
    setSetNameInput('');
    setSetsNotice('');
    setSaveDialogOpen(true);
  };

  const openLoadDialog = () => {
    setSetsNotice('');
    setLoadDialogOpen(true);
  };

  // Picking an existing set turns Save into an edit: that id is overwritten even if the
  // name changes, so renaming never leaves a stale copy behind.
  const startEditingWordSet = (set: SavedWordSet) => {
    setEditingSetId(set.id);
    setSetNameInput(set.name);
  };

  // Saving keeps the exact list on screen, so a teacher can drop a topic and reload it later.
  const handleSaveWordSet = () => {
    if (parsedWords.length === 0) {
      setSetsNotice('Add some words first, then save them as a set.');
      return;
    }
    const base = editingSetId ? wordSets.filter((set) => set.id !== editingSetId) : wordSets;
    setWordSets(addWordSet(base, setNameInput, parsedWords));
    setSetsNotice(`Saved “${setNameInput.trim() || 'Untitled set'}” · ${parsedWords.length} words`);
    setSetNameInput('');
    setEditingSetId(null);
    setSaveDialogOpen(false);
  };

  const handleLoadWordSet = (set: SavedWordSet) => {
    // Loading hands the list over as a hand-written one, so a later pack change cannot
    // quietly overwrite what the teacher just picked.
    setEntryMode('manual');
    setWordsInput(formatWordsForTextarea(set.words));
    setError('');
    setSetsNotice(`Loaded “${set.name}” · ${set.words.length} words`);
    setLoadDialogOpen(false);
  };

  const handleDeleteWordSet = async (set: SavedWordSet) => {
    if (!(await confirmDialog(`Delete the saved set “${set.name}”?`, { confirmLabel: 'Delete' }))) return;
    setWordSets(removeWordSet(wordSets, set.id));
    setSetsNotice(`Deleted “${set.name}”.`);
    if (editingSetId === set.id) {
      setEditingSetId(null);
      setSetNameInput('');
    }
  };

  // Escape closes whichever save/load dialog is open, matching the unlock dialog.
  useEffect(() => {
    if (!saveDialogOpen && !loadDialogOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSaveDialogOpen(false);
        setLoadDialogOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveDialogOpen, loadDialogOpen]);


  const handleStartGame = useCallback(() => {
    // Solo never reaches here — it launches through `onStartSolo` — but the guard
    // also narrows the mode back to a `GameMode` for the settings object below.
    if (gameMode === 'solo') return;
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

    const isPresetEffectivelyActive = selectedPresets.length > 0;
    const levelHasPhrasalVerbs = selectedPresets.some(level => !!cefrWordLists[level]?.phrasalVerbs?.length);
    const noWordTypesSelected =
        !selectedWordTypes.nouns && !selectedWordTypes.verbs && !selectedWordTypes.adjectives &&
        !(levelHasPhrasalVerbs && selectedWordTypes.phrasalVerbs);

    if (isPresetEffectivelyActive && noWordTypesSelected) {
        setError('Please select at least one word type when using a preset.');
        return;
    }

    setError('');
    onGameStart({ words: gameWords, totalTimeLimit, gameMode, timePerWord });
  }, [wordsInput, totalTimeLimit, onGameStart, gameMode, selectedPresets, selectedWordTypes, timePerWord, isUnlocked, effectiveMaxTimeLimit]);

  // Multi-select: tapping a pack adds or removes it from the pool the suggestions draw on.
  const togglePreset = (level: CEFRLevel) => {
    if (!isUnlocked && !DEMO_POLICY.freePresets.includes(level)) {
      setShowUnlockDialog(true);
      return;
    }
    setSelectedPresets(prev =>
      prev.includes(level) ? prev.filter(selected => selected !== level) : [...prev, level],
    );
    setError('');
  };

  const handleWordTypeChange = (type: keyof SelectedWordTypes) => {
    setSelectedWordTypes(prev => {
        const newTypes = { ...prev, [type]: !prev[type] };
        const isPresetModeActive = selectedPresets.length > 0;
        const levelHasPhrasalVerbs = selectedPresets.some(level => !!cefrWordLists[level]?.phrasalVerbs?.length);
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
    setSelectedPresets([]);
    setError('');
  };

  const handleGameModeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newMode = event.target.value as SetupMode;
    setGameMode(newMode);
    setError('');
    // Mode is chosen on the first step; going back there also covers the case where
    // the new mode has fewer steps than the old one.
    setStep(0);
    // Clear settings when switching modes to avoid confusion
    setSelectedPresets([]); 
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

  const handleResetAllCustomSounds = async () => {
    if (!(await confirmDialog('Remove every custom sound and go back to the built-in defaults?', { confirmLabel: 'Remove all' }))) return;
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
      <label className="block text-sm font-semibold text-electric-blue mb-0.5">{label}:</label>
      {currentSound ? (
        <div className="flex items-center justify-between text-sm bg-dark-metal p-1.5 rounded">
          <span className="truncate" title={currentSound.name}>{currentSound.name}</span>
          <button onClick={() => setSound(null)} className="ml-2 text-danger-red hover:text-red-400 text-sm p-1">Clear</button>
        </div>
      ) : (
         <p className="text-sm text-muted-text mb-0.5">Default sound.</p>
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
      <label className="block text-sm font-semibold text-electric-blue mb-0.5">{label}:</label>
      {currentSounds.length > 0 ? (
        <ul className="list-disc list-inside text-sm mb-1 max-h-16 overflow-y-auto bg-dark-metal p-1.5 rounded">
          {currentSounds.map((sound, index) => (
            <li key={`${idPrefix}-${index}`} className="flex justify-between items-center mb-0.5">
              <span className="truncate" title={sound.name}>{sound.name}</span>
              <button
                onClick={() => setSounds(currentSounds.filter((_, i) => i !== index))}
                className="ml-2 text-danger-red hover:text-red-400 text-sm p-1"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
         <p className="text-sm text-muted-text mb-0.5">Default sounds.</p>
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
      .then(() => toast(`${soundName} base64 data copied to clipboard!`, 'success'))
      .catch(err => {
        console.error('Failed to copy base64 data: ', err);
        toast(`Failed to copy ${soundName} data. See console for details.`, 'error');
      });
  };

  const renderBase64Exporter = (soundFile: CustomSoundFile | null, name: string) => {
    if (!soundFile) return null;
    return (
      <div className="my-1 p-1.5 border border-muted-text/30 rounded text-left">
        <p className="text-sm text-light-text font-semibold">{name}: <span className="font-normal italic text-muted-text">{soundFile.name}</span></p>
        <button
          type="button"
          onClick={() => handleCopyToClipboard(soundFile.data, name)}
          className="text-sm bg-electric-blue/70 hover:bg-electric-blue text-dark-metal py-0.5 px-1.5 rounded mt-0.5 futuristic-button"
        >
          Copy Base64 Data
        </button>
      </div>
    );
  };

  const renderMultiBase64Exporter = (soundFiles: CustomSoundFile[], namePrefix: string) => {
    return soundFiles.map((soundFile, index) => (
        <div key={`${namePrefix}-${index}`} className="my-1 p-1.5 border border-muted-text/30 rounded text-left">
            <p className="text-sm text-light-text font-semibold">{`${namePrefix} #${index + 1}`}: <span className="font-normal italic text-muted-text">{soundFile.name}</span></p>
            <button
            type="button"
            onClick={() => handleCopyToClipboard(soundFile.data, `${namePrefix} #${index + 1}`)}
            className="text-sm bg-electric-blue/70 hover:bg-electric-blue text-dark-metal py-0.5 px-1.5 rounded mt-0.5 futuristic-button"
            >
            Copy Base64 Data
            </button>
        </div>
    ));
  };

  // Helper booleans for the start button's disabled logic. The word rule mirrors
  // `handleStartGame` (and the Words step gate): 3 valid words are the minimum.
  const hasTooFewWords = parsedWords.length < 3;
  const isTimeLimitInvalid =
    !isSoloMode && gameMode !== GameMode.TEAM && (totalTimeLimit < MIN_TOTAL_TIME_LIMIT || totalTimeLimit > effectiveMaxTimeLimit);
  
  const isPresetEffectivelyActive = selectedPresets.length > 0;

  // Phrasal verbs are only curated for the higher bands (B1+), so the toggle is
  // shown (and counted) only when at least one picked pack actually carries them.
  const levelHasPhrasalVerbs = isPresetEffectivelyActive && selectedPresets.some(level => !!cefrWordLists[level]?.phrasalVerbs?.length);

  const visibleWordTypeKeys = (Object.keys(selectedWordTypes) as Array<keyof SelectedWordTypes>)
    .filter(type => type !== 'phrasalVerbs' || levelHasPhrasalVerbs);

  const noWordTypesSelected =
    !selectedWordTypes.nouns && !selectedWordTypes.verbs && !selectedWordTypes.adjectives &&
    !(levelHasPhrasalVerbs && selectedWordTypes.phrasalVerbs);

  const disableStartDueToPresetAndNoTypes = isPresetEffectivelyActive && noWordTypesSelected;

  // Wizard navigation
  const currentStep = wizardSteps[step];
  const isLastStep = step === wizardSteps.length - 1;
  const startDisabled = isSoloMode
    ? false
    : hasTooFewWords ||
      isTimeLimitInvalid ||
      isOverDemoWordCap ||
      disableStartDueToPresetAndNoTypes;

  // The Words step is the only place a list is produced. Both flows (suggested packs
  // or a typed list) are valid, but leaving it with fewer than 3 words is a dead end,
  // so the wizard refuses to advance rather than silently shipping an empty game.
  const wordsStepIncomplete = !isSoloMode && currentStep === 'Words' && hasTooFewWords;

  const goToStep = (next: number) => {
    setError('');
    setStep(Math.max(0, Math.min(next, wizardSteps.length - 1)));
  };

  const handlePrimaryAction = () => {
    if (isLastStep) {
      if (isSoloMode) onStartSolo(selectedSoloTrack, soloStyle);
      else handleStartGame();
    } else {
      goToStep(step + 1);
    }
  };

  // Everything held back from the free demo, surfaced as tappable chips so players
  // discover what the Full Version adds without digging through closed dropdowns.
  // Split in two rows: headline extras first, then the locked word packs.
  const lockedFeaturePerks: string[] = [
    '💀 Hell Mode',
    '🎯 Solo tracks',
    '🔢 Up to 60 words',
    '⏱️ Up to 10 minutes',
    '🎵 Custom Sounds',
  ];
  const lockedPackPerks: string[] = [
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
        className="futuristic-button rounded-full border border-warning-yellow/40 bg-dark-metal/60 px-2 py-1 text-sm text-warning-yellow/90 hover:border-warning-yellow hover:text-warning-yellow"
      >
        {perk} 🔒
      </button>
    ));

  return (
    <div className="flex h-full flex-col items-center text-light-text">
      <h2 className="text-2xl sm:text-3xl font-heading font-semibold text-electric-blue setup-screen-title">Game Setup</h2>

      {/* Wizard step indicator — tap a step to jump straight to it. */}
      <div className="my-1.5 flex w-full items-center justify-center gap-1.5 sm:gap-2" role="tablist" aria-label="Setup steps">
        {wizardSteps.map((label, index) => {
          const isActive = index === step;
          const isDone = index < step;
          return (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => goToStep(index)}
              className={`futuristic-button setup-screen-tab flex items-center gap-1.5 rounded-full px-3.5 py-2 ${
                isActive
                  ? 'bg-gradient-to-r from-cyber-purple to-electric-blue font-semibold text-dark-metal'
                  : isDone
                  ? 'bg-electric-blue/20 text-electric-blue'
                  : 'bg-dark-metal text-muted-text hover:text-electric-blue'
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-dark-metal/60 text-xs font-bold text-light-text">
                {isDone ? <Icon name="check" size={10} /> : index + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Panel area — one step at a time; scrolls only if a single step is tall. */}
      <div key={step} className="setup-wizard-panel flex min-h-0 w-full flex-1 flex-col items-center gap-1.5 overflow-y-auto overflow-x-hidden animate-fadeInScaleUp">
      {currentStep === 'Mode' && (
      <>
      {!isUnlocked && (
        <div className="setup-demo-banner w-full rounded-lg border border-warning-yellow/40 bg-warning-yellow/10 px-2.5 py-1 text-left">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm leading-tight text-warning-yellow">
              <strong className="font-heading tracking-wider">DEMO</strong> · Normal + Team + Solo · ≤{DEMO_POLICY.maxWordsPerGame} words · ≤{DEMO_POLICY.maxTotalTimeLimit / 60} min
            </p>
            <button
              type="button"
              onClick={() => setShowUnlockDialog(true)}
              className="futuristic-button shrink-0 rounded-md bg-cyber-purple/70 px-2.5 py-1 text-sm font-semibold text-light-text hover:bg-cyber-purple"
            >
              Unlock
            </button>
          </div>
          <div className="mt-0.5 flex flex-col gap-1">
            <div className="flex flex-wrap gap-1">{renderPerkChips(lockedFeaturePerks)}</div>
            <div className="flex flex-wrap gap-1">{renderPerkChips(lockedPackPerks)}</div>
          </div>
        </div>
      )}

      {/* Game Mode + Game Time — side by side (2 columns) to keep the step compact */}
      <div className="grid w-full grid-cols-2 gap-2">
        <div className="setup-mode-card rounded-lg border border-cyber-purple/30 p-2 text-left sm:p-3">
          <label htmlFor="gameModeSelect" className="mb-1 block text-sm font-semibold uppercase tracking-wider text-electric-blue setup-screen-label sm:text-base">
            Game Mode:
          </label>
          <select
            id="gameModeSelect"
            value={gameMode}
            onChange={handleGameModeChange}
            className="w-full rounded-lg p-2 shadow-sm futuristic-input text-sm transition duration-150 ease-in-out focus:border-neon-green focus:ring-2 focus:ring-neon-green setup-screen-input sm:text-base"
          >
            {([
              { value: GameMode.NORMAL, label: '😊 Normal' },
              { value: GameMode.TEAM, label: '🤝 Team' },
              { value: GameMode.HELL, label: '💀 Hell' },
              { value: 'solo', label: '🎯 Solo' },
            ] as { value: SetupMode; label: string }[]).map(({ value, label }) => {
              const locked = !isUnlocked && value !== 'solo' && !DEMO_POLICY.freeModes.includes(value);
              return (
                <option key={value} value={value} disabled={locked}>
                  {label}{locked ? ' 🔒' : ''}
                </option>
              );
            })}
          </select>
        </div>

        <div className="setup-mode-card rounded-lg border border-cyber-purple/30 p-2 text-left sm:p-3">
          {isSoloMode ? (
            <>
              <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-electric-blue setup-screen-label sm:text-base">
                Solo Rundown:
              </p>
              <p className="text-sm leading-snug text-muted-text setup-screen-small-text">
                Start with {SOLO_START_HEARTS} hearts · {SOLO_FREE_SKIPS} free skips · {SOLO_STYLE_TIME[soloStyle]}s per
                word, tightening to {SOLO_TIMER_FLOOR[soloStyle]}s as the run goes on.
              </p>
              <p className="mt-1 text-sm leading-snug text-muted-text setup-screen-small-text">
                Right: +10 points. Wrong? Try again — only running out of time costs −10 points and −1 heart. Losing every heart ends the run.
              </p>
            </>
          ) : gameMode === GameMode.TEAM ? (
            <>
              <label htmlFor="timePerWord" className="mb-1 block text-sm font-semibold uppercase tracking-wider text-electric-blue setup-screen-label sm:text-base">
                Time / Word:
              </label>
              <select
                id="timePerWord"
                value={timePerWord}
                onChange={(e) => setTimePerWord(Number(e.target.value))}
                className="w-full rounded-lg p-2 shadow-sm futuristic-input text-sm setup-screen-input sm:text-base"
              >
                {TIME_PER_WORD_OPTIONS.map(time => (
                  <option key={time} value={time}>{time} seconds</option>
                ))}
              </select>
            </>
          ) : (
            <>
              <label htmlFor="totalTimeLimit" className="mb-1 block text-sm font-semibold uppercase tracking-wider text-electric-blue setup-screen-label sm:text-base">
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
                className="w-full rounded-lg p-2 shadow-sm futuristic-input text-sm setup-screen-input sm:text-base"
                aria-label="Set total game time in seconds"
              />
              <p className="mt-1 text-left text-sm leading-tight text-muted-text setup-screen-small-text">
                {Math.floor(totalTimeLimit / 60)}m {totalTimeLimit % 60}s · {MIN_TOTAL_TIME_LIMIT / 60}-{effectiveMaxTimeLimit / 60}m
                {!isUnlocked && ' · Unlock 10m'}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Solo play style — the one choice this mode actually needs. Two skills, two
          cards: comprehension (English clue first) and spelling (Vietnamese gloss first).
          The help ladder is printed on each card so the difference is visible before the
          first word, not discovered halfway through a run. */}
      {isSoloMode && (
        <div className="w-full" role="radiogroup" aria-labelledby="soloStyleLabel">
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span id="soloStyleLabel" className="text-sm font-semibold uppercase tracking-wider text-electric-blue setup-screen-label sm:text-base">
              Play style:
            </span>
            <span className="text-sm text-muted-text setup-screen-small-text">pick the skill you want to train</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {SOLO_STYLES.map((option) => {
              const selected = soloStyle === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setSoloStyle(option.id)}
                  className={`futuristic-button flex min-h-[6rem] flex-col items-start rounded-xl border-2 p-2.5 text-left transition sm:p-3 ${
                    selected
                      ? 'border-neon-green bg-neon-green/10'
                      : 'border-cyber-purple/40 bg-dark-metal/60 hover:border-electric-blue'
                  }`}
                >
                  <span className="flex w-full items-center gap-1.5 text-sm font-bold text-light-text sm:text-base">
                    <span aria-hidden="true">{option.emoji}</span>
                    <span className="min-w-0 flex-1">{option.name}</span>
                    {selected && <Icon name="check" size={12} />}
                  </span>
                  <span className="mt-1 block text-[0.7rem] leading-snug text-muted-text sm:text-xs">
                    {option.tagline}
                  </span>
                  <span className={`mt-1.5 block text-[0.6rem] font-semibold uppercase tracking-wider ${selected ? 'text-neon-green' : 'text-electric-blue/80'}`}>
                    {option.ladder}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {gameMode === GameMode.TEAM && (
        <p className="w-full text-left text-sm text-electric-blue setup-screen-small-text">Two teams take turns guessing words. Rack up points and sabotage your rivals!</p>
      )}
      {gameMode === GameMode.HELL && (
        <p className="w-full text-left text-sm text-warning-yellow setup-screen-small-text">Hell Mode has special rules like skip penalties and intense rush hours. Check instructions!</p>
      )}

      {isSoloMode && (
        <p className="w-full text-left text-sm text-cyber-purple setup-screen-small-text">
          {soloStyle === 'describe'
            ? 'Hear an English description, then type or say the word. Stuck? Open the hint, then the Vietnamese meaning — that last rung ends your streak.'
            : 'Play alone against the clock — pick a track in the next step, then type or say each word from its Vietnamese meaning.'}
        </p>
      )}

      {/* Word Pack — multi-select chips so several bands can feed one list */}
      {!isSoloMode && entryMode === 'suggest' && (
      <div className="w-full rounded-lg border border-cyber-purple/30 p-2 sm:p-3">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold uppercase tracking-wider text-electric-blue setup-screen-label sm:text-base">
            Word Packs
          </span>
          <span className="text-sm text-muted-text setup-screen-small-text">
            {selectedPresets.length > 0 ? `${selectedPresets.length} selected` : 'pick one or more'}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Word packs to suggest words from">
          {Object.values(CEFRLevel).map(level => {
            const locked = !isUnlocked && !DEMO_POLICY.freePresets.includes(level);
            const selected = selectedPresets.includes(level);
            return (
              <button
                key={level}
                type="button"
                onClick={() => togglePreset(level)}
                aria-pressed={selected}
                className={`futuristic-button rounded-full border px-2.5 py-1 text-sm ${
                  selected
                    ? 'border-electric-blue bg-electric-blue font-semibold text-dark-metal'
                    : locked
                    ? 'border-warning-yellow/40 bg-dark-metal/60 text-warning-yellow/80 hover:border-warning-yellow hover:text-warning-yellow'
                    : 'border-cyber-purple/40 bg-dark-metal text-electric-blue hover:border-electric-blue'
                }`}
                title={locked ? 'Unlock the Full Version to play this pack' : `Toggle ${level}`}
              >
                {level.split(' (')[0]}
                {locked ? ' 🔒' : selected ? ' ✓' : ''}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-left text-sm leading-tight text-muted-text setup-screen-small-text">
          {selectedPresets.length > 0
            ? 'Suggestions are merged from every pack you pick — you refine the list on the next step.'
            : 'Pick one or more packs for a ready-to-play list, or leave them blank and type your own words on the next step.'}
        </p>
      </div>
      )}
      </>
      )}

      {currentStep === 'Pick a track' && (
      <>
      {/* Today's Challenge — one tap, no track and no settings: the words are the same
          for every player today, so the only variable is how far you get. */}
      <div className="w-full rounded-lg border border-warning-yellow/40 bg-[var(--surface-1)] p-2.5 sm:p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-left">
            <p className="flex items-center gap-1.5 font-heading text-base font-bold text-warning-yellow">
              <span className="text-xl" role="img" aria-hidden="true">{DAILY_TRACK.emoji}</span>
              {DAILY_TRACK.name}
              {dailyStatus.done && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-neon-green/40 bg-neon-green/10 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-neon-green">
                  <Icon name="check" size={11} />
                  Done
                </span>
              )}
            </p>
            <p className="mt-0.5 text-sm leading-snug text-muted-text setup-screen-small-text">
              {DAILY_TRACK.tagline} Resets at midnight.
            </p>
          </div>
          <button
            type="button"
            onClick={onStartDaily}
            className="futuristic-button shrink-0 rounded-[var(--r-md)] min-h-[44px] bg-warning-yellow px-5 py-2 text-sm font-bold text-dark-metal hover:brightness-110"
          >
            {dailyStatus.done ? 'Replay' : 'Play'}
          </button>
        </div>
      </div>

      {dailyStatus.anchors > 0 && (
        <p className="w-full text-left text-sm leading-snug text-warning-yellow setup-screen-small-text">
          📌 {dailyStatus.due > 0
            ? `${dailyStatus.due} word${dailyStatus.due === 1 ? '' : 's'} from earlier slips will lead your next run.`
            : `${dailyStatus.anchors} word${dailyStatus.anchors === 1 ? '' : 's'} in your review pile — they come back as they fall due.`}
        </p>
      )}

      <div className="w-full rounded-lg border border-cyber-purple/30 p-2 sm:p-3">
        <span className="mb-2 block text-left text-sm font-semibold uppercase tracking-wider text-electric-blue setup-screen-label sm:text-base">
          Track:
        </span>
        <div className="grid w-full grid-cols-2 gap-2">
          {SOLO_TRACKS.map((track) => {
            const isSelected = track.id === selectedSoloTrackId;
            const best = soloBests[track.id];
            // Solo itself is free for everyone; only the Rookie track ships with it.
            const locked = !isUnlocked && track.id !== SOLO_FREE_TRACK_ID;
            return (
              <button
                key={track.id}
                type="button"
                onClick={() => (locked ? setShowUnlockDialog(true) : setSelectedSoloTrackId(track.id))}
                aria-pressed={isSelected}
                aria-disabled={locked}
                title={locked ? 'Unlock the Full Version to play this track' : undefined}
                className={`group flex min-w-0 flex-col items-start rounded-[var(--r-lg)] border bg-[var(--surface-1)] p-2.5 text-left shadow-[var(--elev-2)] transition duration-200 hover:-translate-y-0.5 ${track.accentBorder} ${track.glow} ${
                  isSelected ? 'ring-2 ring-electric-blue' : ''
                } ${locked ? 'opacity-60' : ''}`}
              >
                <span className="flex w-full min-w-0 items-center gap-1.5">
                  <span className="text-xl sm:text-2xl" role="img" aria-hidden="true">
                    {track.emoji}
                  </span>
                  <span className={`truncate font-heading text-base font-bold ${track.accentText}`}>
                    {track.name}
                  </span>
                </span>
                <span className="mt-0.5 flex w-full items-center justify-between gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-text/80">
                    {soloRangeLabel(track)}
                  </span>
                  {locked ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-warning-yellow/40 bg-[var(--surface-3)] px-1.5 py-0.5 text-xs font-semibold text-warning-yellow">
                      <Icon name="lock" size={12} />
                      Full
                    </span>
                  ) : best && best.score > 0 ? (
                    <span
                      className="inline-flex shrink-0 items-center rounded-full bg-[var(--surface-3)] px-1.5 py-0.5 text-xs font-semibold text-warning-yellow"
                      title="Your best score on this track"
                    >
                      ★ {best.score.toLocaleString()}
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 text-sm leading-snug text-muted-text setup-screen-small-text">{track.tagline}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-left text-sm leading-snug text-muted-text setup-screen-small-text">
          {isUnlocked
            ? 'Every track is unlocked.'
            : 'Rookie is free — unlock the Full Version to play Explorer, Challenger and Master.'}{' '}
          {isSignedIn
            ? 'Your best score is saved to the leaderboard.'
            : 'Sign in to join the shared leaderboard.'}
        </p>
      </div>
      </>
      )}

      {currentStep === 'Words' && (
      <>
      {/* Word entry flow selector — the two options label themselves, so no
          heading is needed and the step keeps 28px of vertical budget. */}
      <div className="w-full">
        <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="How to build your word list">
          <button
            type="button"
            role="tab"
            aria-selected={entryMode === 'suggest'}
            onClick={() => handleEntryModeChange('suggest')}
            className={`futuristic-button hover-lift inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-3 text-sm sm:text-base ${entryMode === 'suggest' ? 'bg-electric-blue text-dark-metal' : 'bg-dark-metal text-electric-blue hover:bg-cyber-purple/30'}`}
          >
            <Icon name="shuffle" size={15} />
            Suggestion
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={entryMode === 'manual'}
            onClick={() => handleEntryModeChange('manual')}
            className={`futuristic-button hover-lift inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-3 text-sm sm:text-base ${entryMode === 'manual' ? 'bg-electric-blue text-dark-metal' : 'bg-dark-metal text-electric-blue hover:bg-cyber-purple/30'}`}
          >
            <Icon name="pencil" size={15} />
            Enter your word list
          </button>
        </div>
      </div>

      {/* Curate the suggested words — two columns to save vertical space */}
      {entryMode === 'suggest' && isPresetEffectivelyActive && (
      <div className="w-full rounded-lg border border-cyber-purple/30 p-2 animate-fadeInScaleUp">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="text-left">
            <label className="mb-1 block text-sm font-semibold uppercase tracking-wider text-electric-blue setup-screen-label sm:text-base">
              Word Types:
            </label>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              {visibleWordTypeKeys.map(type => (
                <label key={type} className="flex items-center cursor-pointer text-sm setup-screen-checkbox-label sm:text-base">
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
            <label htmlFor="wordCountPreset" className="mb-1 block text-sm font-semibold uppercase tracking-wider text-electric-blue setup-screen-label sm:text-base">
              Number of Words:
            </label>
            <div className="flex items-center gap-1.5">
              <select
                id="wordCountPreset"
                value={selectedWordCountForPreset}
                onChange={(e) => setSelectedWordCountForPreset(Number(e.target.value))}
                className="min-w-0 flex-1 rounded-lg p-2 shadow-sm futuristic-input text-sm setup-screen-input sm:text-base"
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
              <button
                type="button"
                onClick={updateWordsFromPreset}
                disabled={noWordTypesSelected}
                className="futuristic-button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-dark-metal hover:bg-cyber-purple/30 text-electric-blue py-2 px-2.5 text-sm sm:text-base disabled:opacity-40"
                title="Shuffle a new set of words from this pack"
              >
                <Icon name="shuffle" size={15} />
                Shuffle
              </button>
              <button
                type="button"
                onClick={handleClearPreset}
                className="futuristic-button shrink-0 rounded-md bg-danger-red/70 hover:bg-danger-red text-light-text py-2 px-2.5 text-sm sm:text-base"
                title="Clear the loaded pack from the word list"
              >
                Clear
              </button>
            </div>
            {noWordTypesSelected && (
              <p className="mt-1 text-sm text-danger-red setup-screen-small-text">Select a word type.</p>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Type-your-words first, then the saved-set manager stacked right under the list. */}
      <div className="flex w-full flex-col gap-2">
      <div className="w-full">
        <label htmlFor="wordsInput" className="block text-base font-semibold text-electric-blue mb-2 text-left uppercase tracking-wider setup-screen-label">
          Your Words
          <span className={`text-sm normal-case ${isOverDemoWordCap ? 'text-danger-red font-semibold' : 'text-muted-text'}`}>
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
          className="w-full max-h-[20vh] p-2 sm:p-3 rounded-lg shadow-sm futuristic-input text-base sm:text-lg setup-screen-input"
          placeholder={
            entryMode === 'suggest'
              ? "Words from the pack appear here — edit them freely..."
              : "E.g., Apple, Banana, Cherry"
          }
          aria-label="Word list for the game"
        />
        <p className="text-sm text-muted-text mt-2 text-left setup-screen-small-text">
          {entryMode === 'suggest'
            ? (selectedPresets.length > 0
                ? 'Suggested from your packs. Edit freely, or press 🎲 Shuffle for a new set.'
                : 'Pick a pack in the previous step to get suggestions, or just type your own words.')
            : 'One word per line, or separated by commas.'}
        </p>
      </div>

      {/* Favorite sets belong to the typed-list flow only: in "Suggest" mode the
          packs already regenerate a list, so a saved-set manager there was noise. */}
      {entryMode === 'manual' && (
      <div className="w-full">
        <div className="flex w-full gap-2">
          <button
            type="button"
            onClick={openSaveDialog}
            disabled={parsedWords.length === 0}
            className="futuristic-button inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-neon-green/80 px-3 py-2 text-sm font-semibold text-dark-metal hover:bg-neon-green disabled:opacity-40 sm:text-base"
            title="Save the words currently in the list as a set"
          >
            <Icon name="save" size={15} />
            Save
          </button>
          <button
            type="button"
            onClick={openLoadDialog}
            className="futuristic-button inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-electric-blue/80 px-3 py-2 text-sm font-semibold text-dark-metal hover:bg-electric-blue sm:text-base"
            title="Load a saved set into the word list"
          >
            <Icon name="folder" size={15} />
            Load
          </button>
        </div>
        {setsNotice && (
          <p className="mt-1 text-sm text-neon-green setup-screen-small-text">{setsNotice}</p>
        )}
      </div>
      )}
      </div>
      </>
      )}

      {currentStep === 'Settings' && (
      <>
      {/* Audio levels live here and in the in-game pause menu (Esc). */}
      <div className="w-full rounded-lg border border-electric-blue/30 p-2 sm:p-3">
        <p className="mb-2 text-left text-sm font-semibold uppercase tracking-wider text-electric-blue">
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
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-electric-blue sm:text-base">
            <Icon name="music" size={15} />
            Custom Sounds
          </span>
          <span className="flex items-center gap-2 text-sm text-muted-text">
            {!isUnlocked ? (
              <span className="inline-flex items-center gap-1">
                <Icon name="lock" size={12} />
                Full version
              </span>
            ) : customSoundCount > 0 ? (
              `${customSoundCount} uploaded`
            ) : (
              'Optional'
            )}
            <span aria-hidden="true">{showCustomSounds ? '▴' : '▾'}</span>
          </span>
        </button>

        {showCustomSounds && (
        <div id="custom-sounds-panel" className="mt-2 flex animate-fadeInScaleUp flex-col gap-2">
        {!isUnlocked ? (
          <div className="rounded-lg border border-electric-blue/30 p-2 sm:p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-left text-sm italic leading-tight text-muted-text">
                Upload your own audio for every moment of the game.
              </p>
              <button
                type="button"
                onClick={() => setShowUnlockDialog(true)}
                className="futuristic-button inline-flex shrink-0 items-center gap-1 rounded-md bg-cyber-purple/70 px-2.5 py-1 text-sm font-semibold text-light-text hover:bg-cyber-purple"
              >
                <Icon name="lock" size={12} />
                Unlock
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {CUSTOM_SOUND_SLOTS.map(slot => (
                <div key={slot} className="flex items-center justify-between gap-1 rounded-md border border-cyber-purple/30 bg-dark-metal/40 px-1.5 py-1 text-xs text-muted-text">
                  <span className="truncate">{slot}</span>
                  <span aria-hidden="true">🔒</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-h-[46vh] overflow-y-auto rounded-lg border border-electric-blue/30 p-2 sm:p-3">
            <p className="text-sm text-muted-text mb-2 italic">Upload audio ({ACCEPTED_AUDIO_FORMATS_LABEL}, max {MAX_AUDIO_FILE_SIZE_MB}MB each). Stored in this browser — Clear on a sound restores the default.</p>
            {renderSoundUploader('setupMusicUpload', 'Setup Music', customBackgroundMusic, setCustomBackgroundMusic, 'Upload Setup Music')}
            {renderSoundUploader('gameMusicUpload', 'Game Music', customGameMusic, setCustomGameMusic, 'Upload Game Music')}
            {renderSoundUploader('startGameSoundUpload', 'Start Game', customStartGameSound, setCustomStartGameSound)}
            {renderSoundUploader('countdownGoSoundUpload', 'Countdown "GO!"', customCountdownGoSound, setCustomCountdownGoSound)}
            {renderMultiSoundUploader('correctSoundsUpload', 'Correct Guess', customCorrectSounds, setCustomCorrectSounds)}
            {renderMultiSoundUploader('skipSoundsUpload', 'Skip Word', customSkipSounds, setCustomSkipSounds)}
            {renderSoundUploader('timesUpSoundUpload', 'Time\'s Up', customTimesUpSound, setCustomTimesUpSound)}
            {renderSoundUploader('gameOverSoundUpload', 'Game Over (Win)', customGameOverSound, setCustomGameOverSound)}
            {renderSoundUploader('playAgainSoundUpload', 'Play Again', customPlayAgainSound, setCustomPlayAgainSound)}

            <h4 className="text-base font-semibold text-neon-green mt-3 mb-1 border-t border-electric-blue/20 pt-2">Power-Up Sounds:</h4>
            {renderSoundUploader('powerupCollectedSoundUpload', 'Collected', customPowerupCollectedSound, setCustomPowerupCollectedSound)}
            {renderSoundUploader('powerupTimeFreezeSoundUpload', 'Time Freeze', customPowerupTimeFreezeSound, setCustomPowerupTimeFreezeSound)}
            {renderSoundUploader('powerupSkipFreebieUsedSoundUpload', 'Skip Freebie Used', customPowerupSkipFreebieUsedSound, setCustomPowerupSkipFreebieUsedSound)}
            {renderSoundUploader('rushHourActivationSoundUpload', 'Rush Hour Activate', customRushHourActivationSound, setCustomRushHourActivationSound)}
            {renderSoundUploader('rushHourMusicLoopUpload', 'Rush Hour Music', customRushHourMusicLoop, setCustomRushHourMusicLoop)}

            {hasAnyCustomSound && (
              <button
                type="button"
                onClick={handleResetAllCustomSounds}
                className="futuristic-button mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-danger-red/70 py-2 px-3 text-sm text-light-text hover:bg-danger-red sm:text-base"
                title="Remove every custom sound and go back to the built-in defaults"
              >
                <Icon name="rotate" size={14} />
                Reset all to default sounds
              </button>
            )}


            <div className="mt-3 sm:mt-4 border-t border-electric-blue/20 pt-2 sm:pt-3">
                 <button
                    type="button"
                    onClick={() => setDisplayDevUtils(!displayDevUtils)}
                    className="futuristic-button bg-dark-metal hover:bg-cyber-purple/30 text-neon-green py-2 px-3 sm:py-2 sm:px-4 rounded-md text-sm sm:text-base w-full mb-1"
                    aria-expanded={displayDevUtils}
                    aria-controls="dev-utils-panel"
                >
                    {displayDevUtils ? 'Hide' : 'Show'} Dev Utilities {displayDevUtils ? '▴' : '▾'}
                </button>
                {displayDevUtils && (
                    <div id="dev-utils-panel" className="mt-1 p-2 border border-neon-green/30 rounded-lg animate-fadeInScaleUp max-h-32 sm:max-h-40 overflow-y-auto">
                        <h4 className="text-base font-semibold text-neon-green mb-1">Export Custom Sound Data</h4>
                        <p className="text-sm text-muted-text mb-2">Copy Base64 to embed in `constants.ts`.</p>
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

                        {!hasAnyCustomSound && <p className="text-sm text-muted-text">No custom sounds uploaded yet.</p>}
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

      {error && <p className="text-danger-red text-sm sm:text-base bg-red-500/20 p-1.5 sm:p-2 rounded-md border border-danger-red mt-2 flex-shrink-0">{error}</p>}

      {/* Wizard navigation — the primary action stays docked at the bottom. */}
      <div className="mt-2 flex w-full flex-shrink-0 items-center gap-2">
        {step > 0 && (
          <button
            type="button"
            onClick={() => goToStep(step - 1)}
            className="futuristic-button setup-screen-button inline-flex shrink-0 items-center gap-1.5 rounded-[var(--r-md)] min-h-[44px] bg-[var(--surface-2)] px-3 py-2.5 text-base text-electric-blue hover:bg-cyber-purple/30 sm:px-5"
          >
            <Icon name="arrowLeft" size={16} />
            Back
          </button>
        )}
        <button
          type="button"
          onClick={handlePrimaryAction}
          disabled={(isLastStep && startDisabled) || wordsStepIncomplete}
          title={wordsStepIncomplete ? 'Add at least 3 words to continue' : undefined}
          className="futuristic-button inline-flex flex-1 items-center justify-center gap-2 rounded-[var(--r-md)] min-h-[44px] bg-neon-green hover:bg-emerald-400 text-dark-metal font-bold py-2.5 px-6 text-lg sm:text-xl setup-screen-button disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={isLastStep ? (isSoloMode ? 'Start solo run button' : 'Start game button') : `Go to ${wizardSteps[step + 1]} step`}
        >
          {isLastStep ? (
            <>
              <Icon name="play" size={18} />
              {isSoloMode ? 'Start Solo!' : 'Start Game!'}
            </>
          ) : (
            <>
              Next: {wizardSteps[step + 1]}
              <Icon name="arrowRight" size={18} />
            </>
          )}
        </button>
      </div>

      <UnlockDialog
        isOpen={showUnlockDialog}
        onClose={() => setShowUnlockDialog(false)}
        onUnlock={onUnlock}
      />

      {/* Save dialog: name a new set, or pick an existing one to rename/update. */}
      {saveDialogOpen && (
        <div
          className="fixed inset-0 z-[var(--z-dialog)] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="saveSetDialogTitle"
          onClick={() => setSaveDialogOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-[var(--r-xl)] border border-neon-green/40 bg-[var(--surface-2)] p-5 shadow-[var(--elev-4)]"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="saveSetDialogTitle" className="flex items-center gap-2 font-heading text-lg font-bold tracking-wide text-neon-green">
              <Icon name="save" size={18} />
              Save Word Set
            </h2>
            <p className="mt-1 text-left font-sans text-sm text-muted-text">
              Name this set to create a new one, or pick a saved set below to rename and update it.
            </p>

            <label htmlFor="setNameField" className="mt-3 block text-left font-sans text-sm text-muted-text">
              Set name
            </label>
            <input
              id="setNameField"
              type="text"
              autoComplete="off"
              value={setNameInput}
              onChange={(event) => setSetNameInput(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); handleSaveWordSet(); } }}
              placeholder="E.g., Animals — Unit 3"
              maxLength={40}
              className="futuristic-input mt-1 w-full rounded-lg px-3 py-2 text-sm"
            />
            {editingSetId && (
              <p className="mt-1 text-left font-sans text-sm text-warning-yellow">
                Editing an existing set — saving will replace it.
              </p>
            )}

            {wordSets.length > 0 && (
              <div className="mt-3">
                <p className="mb-1 text-left font-sans text-sm uppercase tracking-wider text-muted-text">
                  Existing sets
                </p>
                <ul className="flex max-h-32 flex-col gap-1 overflow-y-auto">
                  {wordSets.map(set => (
                    <li key={set.id}>
                      <button
                        type="button"
                        onClick={() => startEditingWordSet(set)}
                        className={`w-full truncate rounded-md border px-3 py-2 text-left font-sans text-sm transition ${
                          editingSetId === set.id
                            ? 'border-warning-yellow/60 bg-warning-yellow/10 text-warning-yellow'
                            : 'border-cyber-purple/30 bg-dark-metal/40 text-light-text hover:border-neon-green/50'
                        }`}
                        title={set.words.join(', ')}
                      >
                        {editingSetId === set.id && <Icon name="pencil" size={12} className="mr-1" />}
                        {set.name} <span className="text-muted-text">· {set.words.length} words</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setSaveDialogOpen(false)}
                className="futuristic-button flex-1 rounded-lg bg-dark-metal px-3 py-2.5 text-sm text-muted-text hover:bg-cyber-purple/30"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveWordSet}
                disabled={parsedWords.length === 0}
                className="futuristic-button flex-1 rounded-lg bg-neon-green/80 px-3 py-2.5 text-sm font-semibold text-dark-metal hover:bg-neon-green disabled:opacity-40"
              >
                {editingSetId ? 'Update set' : 'Save new set'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load dialog: pick a saved set to drop straight into the word list. */}
      {loadDialogOpen && (
        <div
          className="fixed inset-0 z-[var(--z-dialog)] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="loadSetDialogTitle"
          onClick={() => setLoadDialogOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-[var(--r-xl)] border border-electric-blue/40 bg-[var(--surface-2)] p-5 shadow-[var(--elev-4)]"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="loadSetDialogTitle" className="flex items-center gap-2 font-heading text-lg font-bold tracking-wide text-electric-blue">
              <Icon name="folder" size={18} />
              Load Word Set
            </h2>
            {wordSets.length > 0 ? (
              <ul className="mt-3 flex max-h-64 flex-col gap-1.5 overflow-y-auto">
                {wordSets.map(set => (
                  <li key={set.id} className="flex items-center gap-1.5 rounded-md border border-cyber-purple/30 bg-dark-metal/40 px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => handleLoadWordSet(set)}
                      className="min-w-0 flex-1 truncate px-1 py-1.5 text-left font-sans text-sm text-light-text transition hover:text-neon-green"
                      title={set.words.join(', ')}
                    >
                      {set.name} <span className="text-muted-text">· {set.words.length} words</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteWordSet(set)}
                      className="futuristic-button inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-danger-red/60 text-light-text hover:bg-danger-red"
                      aria-label={`Delete saved set ${set.name}`}
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-left font-sans text-sm italic text-muted-text">
                No saved sets yet — save your word list first.
              </p>
            )}
            <button
              type="button"
              onClick={() => setLoadDialogOpen(false)}
              className="mt-4 font-sans text-sm text-muted-text underline decoration-dotted underline-offset-4 transition hover:text-electric-blue"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};