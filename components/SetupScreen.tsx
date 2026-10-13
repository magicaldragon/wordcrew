import React, { useState, useCallback, useEffect } from 'react';
import { GameSettings, CustomSoundFile, GameMode } from '../types';
import { DEFAULT_TOTAL_TIME_LIMIT, MIN_TOTAL_TIME_LIMIT, MAX_TOTAL_TIME_LIMIT } from '../constants';
import { FileUploadButton } from './FileUploadButton';
import { CEFRLevel, cefrWordLists, formatWordsForTextarea, WordListCategories, WORD_COUNT_OPTIONS } from '../cefrWordLists';

interface SetupScreenProps {
  initialGameMode: GameMode;
  onGameStart: (settings: GameSettings) => void;
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
}

const TIME_PER_WORD_OPTIONS = [10, 15, 20, 25, 30, 45];

export const SetupScreen: React.FC<SetupScreenProps> = ({
  initialGameMode,
  onGameStart,
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
  const [displaySoundSettingsSection, setDisplaySoundSettingsSection] = useState<boolean>(false);
  const [displayDevUtils, setDisplayDevUtils] = useState<boolean>(false);

  const [selectedPreset, setSelectedPreset] = useState<CEFRLevel | ''>('');
  const [selectedWordTypes, setSelectedWordTypes] = useState<SelectedWordTypes>({
    nouns: true,
    verbs: true,
    adjectives: true,
  });
  const [selectedWordCountForPreset, setSelectedWordCountForPreset] = useState<number>(WORD_COUNT_OPTIONS[2]);
  const [gameMode, setGameMode] = useState<GameMode>(initialGameMode);

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


  const handleStartGame = useCallback(() => {
    const gameWords: string[] = wordsInput
        .split(/[\n,]+/)
        .map(word => word.trim())
        .filter(word => word.length > 0 && word.length < 50);

    if (gameWords.length < 3) {
      setError('Please enter at least 3 valid words (max 50 characters each). Or select a valid preset with enough words for your chosen types.');
      return;
    }

    if (gameMode !== GameMode.TEAM && (totalTimeLimit < MIN_TOTAL_TIME_LIMIT || totalTimeLimit > MAX_TOTAL_TIME_LIMIT)) {
      setError(`Game time must be between ${MIN_TOTAL_TIME_LIMIT / 60} and ${MAX_TOTAL_TIME_LIMIT / 60} minutes.`);
      return;
    }

    const isPresetEffectivelyActive = selectedPreset !== '';
    const noWordTypesSelected = !selectedWordTypes.nouns && !selectedWordTypes.verbs && !selectedWordTypes.adjectives;

    if (isPresetEffectivelyActive && noWordTypesSelected) {
        setError('Please select at least one word type (Noun, Verb, or Adjective) when using a preset.');
        return;
    }

    setError('');
    onGameStart({ words: gameWords, totalTimeLimit, gameMode, timePerWord });
  }, [wordsInput, totalTimeLimit, onGameStart, gameMode, selectedPreset, selectedWordTypes, timePerWord]);

  const handlePresetChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const valueFromSelect = event.target.value as CEFRLevel | '';
    
    setSelectedPreset(valueFromSelect);
    if (valueFromSelect === '') { // Cleared preset selection in any mode
        setError('');
        setWordsInput(''); // Clear words from textarea
    } else {
        // When a preset is chosen, reset word types and count to defaults
        setSelectedWordTypes({ nouns: true, verbs: true, adjectives: true });
        setSelectedWordCountForPreset(WORD_COUNT_OPTIONS[2]); // Default count
    }
  };

  const handleWordTypeChange = (type: keyof SelectedWordTypes) => {
    setSelectedWordTypes(prev => {
        const newTypes = { ...prev, [type]: !prev[type] };
        const isPresetModeActive = selectedPreset !== '';
        
        if (isPresetModeActive && !newTypes.nouns && !newTypes.verbs && !newTypes.adjectives) {
            setError('Please select at least one word type (Noun, Verb, or Adjective).');
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
    const selectElement = document.getElementById('cefrPreset') as HTMLSelectElement | null;
    if (selectElement) {
      selectElement.value = "";
    }
  };

  const handleGameModeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newMode = event.target.value as GameMode;
    setGameMode(newMode);
    setError('');
    // Clear settings when switching modes to avoid confusion
    setSelectedPreset(''); 
    setWordsInput('');    
    setSelectedWordTypes({ nouns: true, verbs: true, adjectives: true });
    setSelectedWordCountForPreset(WORD_COUNT_OPTIONS[2]);
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
        accept="audio/*"
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
        accept="audio/*"
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
  const isTimeLimitInvalid = gameMode !== GameMode.TEAM && (totalTimeLimit < MIN_TOTAL_TIME_LIMIT || totalTimeLimit > MAX_TOTAL_TIME_LIMIT);
  
  const isPresetEffectivelyActive = selectedPreset !== '';
  
  const noWordTypesSelected = !selectedWordTypes.nouns && !selectedWordTypes.verbs && !selectedWordTypes.adjectives;
  
  const disableStartDueToPresetAndNoTypes = isPresetEffectivelyActive && noWordTypesSelected;
  const isWordsTextareaReadOnly: boolean = selectedPreset !== '';


  return (
    <div className="flex flex-col space-y-3 sm:space-y-4 items-center text-light-text h-full">
      <h2 className="text-2xl sm:text-3xl font-heading font-semibold text-electric-blue mb-1 sm:mb-2 setup-screen-title">Game Setup</h2>

      {/* Game Mode Selection */}
      <div className="w-full mb-1 p-2 sm:p-3 border border-cyber-purple/30 rounded-lg">
        <label htmlFor="gameModeSelect" className="block text-sm font-semibold text-electric-blue mb-1 text-left uppercase tracking-wider setup-screen-label">
          Select Game Mode:
        </label>
        <select
          id="gameModeSelect"
          value={gameMode}
          onChange={handleGameModeChange}
          className="w-full p-2 sm:p-3 rounded-lg shadow-sm focus:ring-2 focus:ring-neon-green focus:border-neon-green transition duration-150 ease-in-out futuristic-input text-sm sm:text-base setup-screen-input"
        >
          <option value={GameMode.NORMAL}>😊 Normal Mode</option>
          <option value={GameMode.TEAM}>🤝 Team Mode</option>
          <option value={GameMode.HELL}>💀 Hell Mode</option>
        </select>
        {gameMode === GameMode.TEAM && (
            <p className="text-xs text-cyan-300 mt-1 text-left setup-screen-small-text">Two teams take turns guessing words. Rack up points and sabotage your rivals!</p>
        )}
        {gameMode === GameMode.HELL && (
            <p className="text-xs text-warning-yellow mt-1 text-left setup-screen-small-text">Hell Mode has special rules like skip penalties and intense rush hours. Check instructions!</p>
        )}
      </div>

      {/* CEFR Preset Section */}
      <div className="w-full mb-1 p-2 sm:p-3 border border-cyber-purple/30 rounded-lg">
        <label htmlFor="cefrPreset" className="block text-sm font-semibold text-electric-blue mb-1 text-left uppercase tracking-wider setup-screen-label">
          Load Word Preset (Optional):
        </label>
        <div className="flex space-x-2 items-center mb-2">
          <select
            id="cefrPreset"
            value={selectedPreset}
            onChange={handlePresetChange}
            className={`flex-grow p-2 sm:p-3 rounded-lg shadow-sm focus:ring-2 focus:ring-neon-green focus:border-neon-green transition duration-150 ease-in-out futuristic-input text-sm sm:text-base setup-screen-input`}
            aria-label="Select CEFR word preset"
          >
            <option value="">-- Select a Level --</option>
            {Object.values(CEFRLevel).map(level => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          {selectedPreset && (
            <button
              type="button"
              onClick={handleClearPreset}
              className="futuristic-button bg-danger-red/70 hover:bg-danger-red text-light-text py-2 px-3 sm:py-2.5 sm:px-4 rounded-md text-xs sm:text-sm"
              title="Clear loaded preset from textarea"
            >
              Clear
            </button>
          )}
        </div>

        {isPresetEffectivelyActive && (
          <div className="animate-fadeInScaleUp">
            <div className="mb-2 text-left">
              <label className="block text-xs sm:text-sm font-semibold text-electric-blue mb-1 uppercase tracking-wider setup-screen-label">
                Include Word Types:
              </label>
              <div className="flex flex-wrap gap-x-3 gap-y-1 sm:gap-x-4 sm:gap-y-2 justify-center">
                {(Object.keys(selectedWordTypes) as Array<keyof SelectedWordTypes>).map(type => (
                  <label key={type} className="flex items-center cursor-pointer text-xs sm:text-sm setup-screen-checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedWordTypes[type]}
                      onChange={() => handleWordTypeChange(type)}
                      className="custom-checkbox"
                      aria-labelledby={`word-type-label-${type}`}
                    />
                    <span id={`word-type-label-${type}`}>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-2 text-left">
              <label htmlFor="wordCountPreset" className="block text-xs sm:text-sm font-semibold text-electric-blue mb-1 uppercase tracking-wider setup-screen-label">
                Number of Words:
              </label>
              <select
                id="wordCountPreset"
                value={selectedWordCountForPreset}
                onChange={(e) => setSelectedWordCountForPreset(Number(e.target.value))}
                className="w-full p-2 sm:p-3 rounded-lg shadow-sm futuristic-input text-sm sm:text-base setup-screen-input"
                aria-label="Select number of words from preset pool"
                disabled={!selectedWordTypes.nouns && !selectedWordTypes.verbs && !selectedWordTypes.adjectives}
              >
                {WORD_COUNT_OPTIONS.map(count => (
                  <option key={count} value={count}>{count} words</option>
                ))}
              </select>
               {(!selectedWordTypes.nouns && !selectedWordTypes.verbs && !selectedWordTypes.adjectives) && (
                <p className="text-xs text-danger-red mt-1 setup-screen-small-text">Select word type(s) to choose count.</p>
              )}
            </div>
          </div>
        )}
      </div>


      <div className="w-full">
        <label htmlFor="wordsInput" className="block text-sm font-semibold text-electric-blue mb-1 text-left uppercase tracking-wider setup-screen-label">
          Enter Your Words
          <span className="text-xs text-muted-text normal-case"> (comma/new line, min 3, or load preset)</span>:
        </label>
        <textarea
          id="wordsInput"
          value={wordsInput}
          onChange={(e) => {
            setWordsInput(e.target.value);
          }}
          rows={4} /* Reduced rows */
          className="w-full p-2 sm:p-3 rounded-lg shadow-sm futuristic-input text-sm sm:text-base setup-screen-input"
          placeholder={
            isWordsTextareaReadOnly
              ? "Words (based on preset) appear here..."
              : "E.g., Apple, Banana, Cherry OR Load a preset"
          }
          aria-label="Enter words for the game or view preset words"
          readOnly={isWordsTextareaReadOnly}
        />
         {selectedPreset !== '' && (
            <p className="text-xs text-muted-text mt-1 text-left setup-screen-small-text">
                Words loaded from preset. Clear preset to enter words manually.
            </p>
        )}
      </div>

      <div className="w-full">
        {gameMode === GameMode.TEAM ? (
            <div>
                 <label htmlFor="timePerWord" className="block text-sm font-semibold text-electric-blue mb-1 text-left uppercase tracking-wider setup-screen-label">
                    Time per word (seconds):
                </label>
                <select
                    id="timePerWord"
                    value={timePerWord}
                    onChange={(e) => setTimePerWord(Number(e.target.value))}
                    className="w-full p-2 sm:p-3 rounded-lg shadow-sm futuristic-input text-sm sm:text-base setup-screen-input"
                >
                    {TIME_PER_WORD_OPTIONS.map(time => (
                        <option key={time} value={time}>{time} seconds</option>
                    ))}
                </select>
            </div>
        ) : (
            <div>
                <label htmlFor="totalTimeLimit" className="block text-sm font-semibold text-electric-blue mb-1 text-left uppercase tracking-wider setup-screen-label">
                    Total Game Time (seconds):
                </label>
                <input
                    id="totalTimeLimit"
                    type="number"
                    value={totalTimeLimit}
                    onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                        setTotalTimeLimit(val);
                        } else if (e.target.value === '') {
                        setTotalTimeLimit(MIN_TOTAL_TIME_LIMIT);
                        }
                    }}
                    min={MIN_TOTAL_TIME_LIMIT}
                    max={MAX_TOTAL_TIME_LIMIT}
                    step="30"
                    className="w-full p-2 sm:p-3 rounded-lg shadow-sm futuristic-input text-sm sm:text-base setup-screen-input"
                    aria-label="Set total game time in seconds"
                />
                <p className="text-xs text-muted-text mt-1 text-left setup-screen-small-text">
                    {Math.floor(totalTimeLimit / 60)}m {totalTimeLimit % 60}s. ({MIN_TOTAL_TIME_LIMIT/60}m - {MAX_TOTAL_TIME_LIMIT/60}m)
                </p>
            </div>
        )}
      </div>

      <div className="w-full border-t border-cyber-purple/20 pt-2 sm:pt-3 mt-1 sm:mt-2">
        <div className="flex flex-col sm:flex-row sm:space-x-2 mb-2 w-full">
          <button
            type="button"
            onClick={() => setDisplaySoundSettingsSection(!displaySoundSettingsSection)}
            className="flex-grow futuristic-button bg-dark-metal hover:bg-cyber-purple/30 text-electric-blue py-1.5 px-3 sm:py-2 sm:px-4 rounded-md text-xs sm:text-sm w-full mb-1 sm:mb-0"
            aria-expanded={displaySoundSettingsSection}
            aria-controls="custom-sound-settings-panel"
          >
            {displaySoundSettingsSection ? 'Hide' : 'Show'} Custom Sounds {displaySoundSettingsSection ? '▴' : '▾'}
          </button>
        </div>

        {displaySoundSettingsSection && (
          <div id="custom-sound-settings-panel" className="border border-electric-blue/30 p-2 sm:p-3 rounded-lg animate-fadeInScaleUp max-h-40 sm:max-h-48 overflow-y-auto">
            <p className="text-xs text-muted-text mb-2 italic">Upload audio (MP3, WAV, OGG). Saved to browser. Use Dev Utils for Base64.</p>
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

                        {(
                            !customBackgroundMusic && !customGameMusic && !customStartGameSound && !customCountdownGoSound &&
                            customCorrectSounds.length === 0 && customSkipSounds.length === 0 &&
                            !customTimesUpSound && !customGameOverSound && !customPlayAgainSound &&
                            !customPowerupCollectedSound && !customPowerupTimeFreezeSound &&
                            !customPowerupSkipFreebieUsedSound && !customRushHourActivationSound && !customRushHourMusicLoop
                         ) && <p className="text-xs text-muted-text">No custom sounds uploaded yet.</p>
                        }
                    </div>
                )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-danger-red text-xs sm:text-sm bg-red-500/20 p-1.5 sm:p-2 rounded-md border border-danger-red mt-2 sm:mt-3">{error}</p>}

      <div className="w-full flex flex-col items-center mt-2 sm:mt-3">
        <button
          type="button"
          onClick={handleStartGame}
          disabled={
            isWordsInputEmpty ||
            isTimeLimitInvalid ||
            disableStartDueToPresetAndNoTypes
          }
          className="w-full bg-gradient-to-r from-cyber-purple to-electric-blue hover:from-electric-blue hover:to-neon-green text-dark-metal font-bold py-2.5 sm:py-3 px-6 rounded-lg shadow-md hover:shadow-lg futuristic-button text-md sm:text-lg setup-screen-button"
          aria-label="Start game button"
        >
          Start Game!
        </button>
      </div>
    </div>
  );
};