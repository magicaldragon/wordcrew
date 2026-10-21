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
    startTest: (level: string, count: number) => `Start ${level} test · ${count} words`,
    levelLocked: (level: string) =>
      `Level-locked: every word comes from ${level} only. The student types the English word for the Vietnamese prompt.`,

    savedOnDevice: 'Saved on this device',
    newDeck: 'New deck',
    noDecksTitle: 'No decks yet',
    noDecksBody:
      'Paste this week’s word list — one word per line. Meanings are filled in automatically and you review them before the class sees the test.',
    buildFirstDeck: 'Build the first deck',

    deckMeta: (count: number, date: string) => `${count} words · edited ${date}`,
    editDeckAria: (name: string) => `Edit ${name}`,
    deleteDeckAria: (name: string) => `Delete ${name}`,
    testDeck: 'Test this deck',

    savedToast: 'Deck saved on this device.',
    deletedToast: 'Deck deleted.',
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
    addToDeck: 'Add to deck',

    reviewTitle: 'Review · the prompt is what the student sees',
    wordAria: (index: number) => `Word ${index}`,
    meaningAria: (word: string) => `Vietnamese meaning for ${word}`,
    meaningPlaceholder: 'Vietnamese meaning',
    removeAria: (word: string) => `Remove ${word}`,
    warningMissing: 'Missing meaning',
    warningDuplicate: 'Another word has the same meaning — the question may be ambiguous.',

    saveDeck: 'Save deck',
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

  test: {
    leaveAsk: 'Leave this test? The answers so far are not saved.',
    leaveLabel: 'Leave',
    leaveAria: 'Leave the test',
    direction: 'Vietnamese → English',
    answerPlaceholder: 'Type the English word',
    answerAria: 'Your answer',
    check: 'Check',
    finish: 'Finish & see report',
    correct: '✅ Correct',
    incorrect: '❌ Not this time',
    youWrote: (guess: string) => `You wrote “${guess}”`,
    reveal: 'I don’t know — show the answer',
  },

  report: {
    score: (correct: number, total: number) => `${correct} / ${total} correct`,
    toRevisit: (missed: number) => `· ${missed} to revisit`,
    wrote: (guess: string) => `Wrote “${guess}”`,
    noAnswer: 'No answer',
    retryMissed: (missed: number) => `Retry ${missed} missed`,
    testAgain: 'Test again',
  },
};
