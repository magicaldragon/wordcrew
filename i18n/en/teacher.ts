/**
 * Teacher Mode: setup, deck editor, the test itself and the report. The vocabulary
 * words on the screen are the learning content and stay in English — only the chrome
 * around them is translated here.
 */
export const teacher = {
  dashboard: 'Dashboard',

  setup: {
    subtitle: 'One level per test, fixed length, a report at the end — no hearts, no score.',
    sourceAria: 'Teacher word source',

    tabs: {
      level: 'Level test',
      decks: 'My decks',
      decksCount: (count: number) => `My decks (${count})`,
    },

    levelAria: 'Level',
    levelTaglines: {
      A1: 'Movers — everyday words, one step past the very first list.',
      A2: 'Flyers + A2 Key — the two A2 packs together.',
      B1: 'B1 Preliminary — abstract words, phrasal verbs included.',
      B2: 'B2 / Pre-IELTS — the top band of the bank.',
    },

    wordsInTest: 'Words in this test',
    wordsInTestRange: (min: number, max: number) => `Type any number from ${min} to ${max}.`,
    startTest: (level: string, count: number) => `Start ${level} test · ${count} words`,
    levelLocked: (level: string) => `Level-locked: every word comes from ${level} only.`,

    modeTitle: 'How to ask each word',
    modeHint: 'The same words, asked three ways. Pick one for this run.',
    modes: {
      listen: {
        label: 'Listen & write',
        hint: 'The word is spoken; the student writes the spelling.',
      },
      choice: {
        label: 'Word → meaning',
        hint: 'The English word is shown; the student picks the Vietnamese meaning.',
      },
      letters: {
        label: 'Meaning → letters',
        hint: 'The meaning, the first letter and one box per letter.',
      },
    },

    savedOnDevice: 'Saved on this device',
    newDeck: 'New deck',
    noDecksTitle: 'No decks yet',
    noDecksBody:
      'Paste this week’s word list — one word per line. Meanings are filled in automatically and you review them before the class sees the test.',
    buildFirstDeck: 'Build the first deck',
    guestNote:
      'You can build and test a deck without an account. Signing in is only needed to keep it — guests lose their decks when the tab closes.',

    deckMeta: (count: number, date: string) => `${count} words · edited ${date}`,
    draftBadge: 'Draft',
    editDeckAria: (name: string) => `Edit ${name}`,
    deleteDeckAria: (name: string) => `Delete ${name}`,
    testDeck: 'Review this deck',

    savedToast: 'Deck saved on this device.',
    deletedToast: 'Deck deleted.',
    deckLimit: (max: number) =>
      `This device holds up to ${max} decks. Delete one before adding another.`,
    deleteAsk: (name: string, count: number) => `Delete “${name}” and its ${count} words?`,
  },

  editor: {
    nameLabel: 'Deck name',
    namePlaceholder: 'e.g. Unit 4 — Travel',
    closeAria: 'Close the deck editor',

    pasteTitle: 'Paste a list — one word per line',
    pasteHelpOr: 'or',
    pasteHelpTail: '. Meanings you leave out are filled from the built-in dictionary.',
    pasteAria: 'Words to add, one per line',
    wordCount: (count: number, max: number) => `${count}/${max} words`,
    detectedWords: (count: number) =>
      count === 1 ? '1 word ready to add' : `${count} words ready to add`,
    addToDeck: 'Add to deck',
    previewTitle: 'In this deck',
    previewHint: 'Tap a word to review & edit it',

    wordLabel: 'Word',
    posLabel: 'Type',
    meaningLabel: 'Meaning (what the student sees)',
    removeLabel: 'Remove',
    openReview: (count: number) => `Review & save · ${count} ${count === 1 ? 'word' : 'words'}`,
    reviewDialogTitle: 'Review the deck',
    reviewBack: 'Back to the list',
    warningsLeft: (count: number) => (count === 1 ? '1 word still missing a meaning' : `${count} words still missing a meaning`),
    wordAria: (index: number) => `Word ${index}`,
    posAria: (word: string) => `Part of speech for ${word}`,
    meaningAria: (word: string) => `Vietnamese meaning for ${word}`,
    meaningPlaceholder: 'Vietnamese meaning',
    removeAria: (word: string) => `Remove ${word}`,
    warningMissing: 'Missing meaning',
    warningDuplicate: 'Another word has the same meaning — the question may be ambiguous.',

    saveDeck: 'Save deck',
    saveDraft: 'Save as draft',
    saveReady: 'Save & mark ready',
    untitled: 'Untitled deck',

    noWordsInList: 'No words found in the list.',
    deckFull: (max: number) => `A deck holds at most ${max} words.`,
    alreadyInDeck: 'Those words are already in the deck.',
    wordsAdded: (count: number) => `${count} words added.`,
    wordsAddedMissing: (count: number, missing: number) =>
      `${count} words added · ${missing} still need a meaning.`,
    addAtLeastOne: 'Add at least one word first.',
    everyWordNeedsMeaning: 'Every word needs a meaning — fix the rows marked in red.',
  },

  review: {
    exitAria: 'Back to the deck list',
    progress: (current: number, total: number) => `Card ${current} of ${total}`,
    shuffleAria: 'Shuffle the cards',
    showWord: 'Show the word',
    showMeaning: 'Show the meaning',
    tapToFlip: 'Tap the card to see the meaning',
    tapToHide: 'Tap the card to go back',
    noPos: 'word',
    previous: 'Previous',
    next: 'Next',
    startTest: (count: number) => `Start the test · ${count} words`,
  },

  test: {
    leaveAsk: 'Leave this test? The answers so far are not saved.',
    leaveLabel: 'Leave',
    leaveAria: 'Leave the test',
    empty: 'This test has no words to ask.',
    listenPrompt: 'Listen, then write the English word',
    choicePrompt: 'What does this word mean?',
    lettersPrompt: 'Write the English word',
    play: 'Play the word',
    lettersHint: (count: number) => `${count} letters`,
    continue: 'Continue',
    levelTitle: (level: string) => `${level} level test`,
    retrySuffix: ' · retry',
    sourceLevel: (level: string, count: number) => `${level} · ${count} words`,
    sourceDeck: (count: number) => `${count} words · your deck`,
    sourceRetry: (count: number) => `Retry ${count} missed`,
    answerPlaceholder: 'Type the English word',
    answerAria: 'Your answer',
    check: 'Check',
    finish: 'Finish & see report',
    correct: '✅ Correct',
    spelling: '⚠️ Almost — check the spelling',
    incorrect: '❌ Not this time',
    youWrote: (guess: string) => `You wrote “${guess}”`,
    reveal: 'I don’t know — show the answer',
    retryAsk: 'Try once more, or skip to see the answer.',
    retry: 'Try again',
    skip: 'Skip — show the answer',
    hint: 'Hint',
    hintClue: (first: string, count: number) =>
      `Starts with “${first}” · ${count} ${count === 1 ? 'letter' : 'letters'}`,
  },

  report: {
    score: (correct: number, total: number) => `${correct} / ${total} correct`,
    toRevisit: (missed: number) => `· ${missed} to revisit`,
    wrote: (guess: string) => `Wrote “${guess}”`,
    chose: (guess: string) => `Chose “${guess}”`,
    noAnswer: 'No answer',
    spellingTag: 'Spelling',
    spellingNote: (count: number) => `· ${count} right word, misspelled`,
    attemptTag: (attempts: number) => `Attempt ${attempts}`,
    hintTag: (hints: number) => `${hints} ${hints === 1 ? 'hint' : 'hints'}`,
    skippedTag: 'Skipped',
    effort: (retried: number, hints: number, skipped: number) => {
      const parts = [
        retried > 0 ? `${retried} ${retried === 1 ? 'word' : 'words'} retried` : '',
        hints > 0 ? `${hints} ${hints === 1 ? 'hint' : 'hints'} used` : '',
        skipped > 0 ? `${skipped} skipped` : '',
      ].filter(Boolean);
      return parts.join(' · ');
    },
    exportCsv: 'Export results (CSV)',
    csv: {
      word: 'Word',
      meaning: 'Meaning',
      answer: 'Answer',
      result: 'Result',
      attempts: 'Attempts',
      hints: 'Hints',
      skipped: 'Skipped',
    },
    result: { correct: 'Correct', spelling: 'Spelling', wrong: 'Wrong' },
    retryMissed: (missed: number) => `Retry ${missed} missed`,
    testAgain: 'Test again',
  },
};
