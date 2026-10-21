/**
 * The Solo mode: the run itself, the result card and the leaderboard panel. Track names
 * and taglines live on `services/solo.ts` — they are data, not interface copy.
 */
export const solo = {
  /** Shown in the auth dialog opened from the result card and the board. */
  signInReason: 'Sign in to save your solo scores and join the leaderboard.',
  /** Marks the signed-in player's own row on either board. */
  youSuffix: ' (you)',
  badges: {
    Regular: 'Regular',
    Committed: 'Committed',
    Unstoppable: 'Unstoppable',
    Legend: 'Legend',
    Icon: 'Icon',
  } as Record<string, string>,

  game: {
    score: 'Score',
    streak: (count: number) => `🔥 ${count} in a row`,
    wordNumber: (count: number) => `Word ${count}`,
    styleDescribe: '🎧 Listen & guess',
    styleMeaning: '🇻🇳 Meaning & spell',
    clock: (seconds: number) => `${seconds}s`,
    heartsAria: (left: number, total: number) => `${left} of ${total} hearts left`,
    letters: (count: number) => `${count} letters`,
    levelUp: (level: string) => `⬆️ Level up — ${level}`,

    hearClue: 'Hear the clue',
    hint: '💡 Hint',
    meaning: '🇻🇳 Meaning',
    loadingClue: 'Loading clue…',
    noClue: '🤔 No clue yet — trust the letters',
    noTranslation: '🤔 No translation yet — trust the letters',
    answer: (word: string) => `Answer: ${word}`,

    placeholderChecking: 'Checking…',
    placeholderListening: 'Listening…',
    placeholderType: 'Type the word…',
    inputAria: 'Your answer',
    micStopTitle: 'Listening — tap to stop',
    micStartTitle: 'Answer by voice',
    micNeedsBrowserTitle: 'Voice input needs Chrome, Edge or Safari',
    micStopAria: 'Stop listening',
    micStartAria: 'Answer by voice',
    auto: 'Auto',
    autoOnTitle: 'Hands-free is on — tap to turn it off',
    autoOffTitle: 'Hands-free: the mic reopens on every word, so you never tap',
    check: 'Check',

    retryMask: (mask: string) => `Try again: ${mask}`,
    insecureHint: '🎤 Voice needs a secure page (https://) — type the word instead.',
    unsupportedHint:
      '🎤 Voice isn’t available in this browser on this device — type the word instead.',
    checkingHeard: 'Checking what we heard…',
    listening: 'Listening…',
    handsFreeOn: 'Hands-free on — the mic reopens on each word',
    inputHelp: 'Enter to check · 🎤 to speak · Auto for hands-free',

    wrongTryAgain: 'Not quite — try again.',
    wrongSpelling: 'Not quite — check the spelling.',
    heardWrong: (heard: string) => `Heard “${heard}” — try again.`,

    quit: 'Quit',
    skipCostsHeart: 'Skip word → (−1 ❤️)',
    skipFree: (count: number) => `Skip word → (${count} free)`,

    pausedAria: 'Run paused',
    paused: 'Paused',
    pausedBody: 'The clock is stopped while you are away.',
    resume: '▶️ Resume',
    quitAria: 'Confirm quitting the run',
    quitTitle: 'Quit this run?',
    quitLost: (score: string) => `Your score of ${score} will be lost.`,
    keepPlaying: 'Keep playing',
    quitRun: 'Quit run',

    speech: {
      micBlocked: 'Microphone access was blocked — allow it or type instead.',
      recogniserUnreachable: 'Couldn’t reach the recogniser — try again, or type your answer.',
      voiceResting: 'Voice answers are resting for now — type your answer instead.',
      notCaught: 'Didn’t catch that — try again.',
      micStartFailed: 'Could not start the microphone.',
      network: 'Network hiccup — try again or type your answer.',
      unresponsive: 'Voice input is not responding on this device — type the word instead.',
    },
  },

  results: {
    titleDaily: 'Challenge complete 🌅',
    title: 'Run Over 🎯',
    reached: (level: string) => `reached ${level}`,
    finalScore: 'Final score',
    newBest: '⭐ New personal best!',
    streak: (days: number) => `🔥 ${days}-day streak — play tomorrow to keep it`,
    badgeUnlocked: (emoji: string, label: string) => `🎉 ${emoji} ${label} badge unlocked`,
    badgeBest: (emoji: string, label: string, days: number) =>
      `${emoji} ${label} · best ${days} days`,
    freezeUsed: (left: number) => `❄️ Streak freeze used — ${left} left this month`,

    wordsGuessed: 'Words guessed',
    bestStreak: 'Best streak',
    accuracy: 'Accuracy',

    reviewTitle: '📌 Words to review',
    reviewBody: 'Anchored on this device — they come back in your next runs until they stick.',

    trackBoard: (name: string) => `🏆 ${name} leaderboard`,
    periodDaily: 'Today only — a fresh board tomorrow.',
    periodMonth: 'This month — a fresh board on the 1st.',
    signInPrompt: 'Sign in to save your score and race other players.',
    noScores: 'No scores yet — you’re first!',
    unavailable: 'Leaderboard is unavailable right now.',
    rankDay: (rank: number, total: number) => `You’re #${rank} of ${total} this day.`,
    rankMonth: (rank: number, total: number) => `You’re #${rank} of ${total} this month.`,

    home: 'Home',
    playAgain: '▶ Play again',
  },

  board: {
    title: 'Solo leaderboard',
    subtitle: 'Every board keeps its own scores, so a run is judged against the same word set.',
    chooseBoardAria: 'Choose a board',
    chooseDayAria: 'Choose a day',
    archive: 'Daily archive',
    today: 'Today',
    yesterday: 'Yest.',

    signInPrompt:
      'Sign in to post a score and race other players. Your device best is kept either way.',
    unavailable: 'Leaderboard is unavailable right now.',
    noScoresDay: 'No scores on that day.',
    noScores: 'No scores yet — you’re first!',
    rankToday: (rank: number, total: number) => `You’re #${rank} of ${total} today.`,
    rankThatDay: (rank: number, total: number) => `You’re #${rank} of ${total} that day.`,
    rankMonth: (rank: number, total: number) => `You’re #${rank} of ${total} this month.`,

    todayOnly: 'Today only — resets at midnight. Past days stay in the archive.',
    archived: (date: string) => `Archived board · ${date}`,
    thisMonth: 'This month — resets on the 1st.',
    yourBest: 'Your best here',
    words: (count: number) => `${count} words`,
    boardOf: (name: string) => `${name} board`,
    trackLocked: 'This track is part of the Full Version — unlock to post a score on it.',
  },
};
