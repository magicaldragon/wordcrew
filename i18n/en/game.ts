/**
 * The WordCrew game flow: setup wizard, the round itself, the result card and the
 * per-mode rule sheets. Word lists, player names and mode names are data, not copy.
 *
 * Sentences that need inline emphasis carry `**…**` markers; the screens render them
 * as bold spans so a translated sentence stays one whole string.
 */
export const game = {
  audio: {
    music: 'Music',
    effects: 'Effects',
    musicVolumeAria: 'Music volume',
    effectsVolumeAria: 'Effects volume',
  },

  setup: {
    title: 'Game Setup',
    stepsAria: 'Setup steps',
    steps: {
      mode: 'Mode',
      words: 'Words',
      settings: 'Settings',
      track: 'Track',
    },

    errors: {
      noWordsForTypes: 'No words in the chosen packs match these word types. Try another type or pack.',
      tooFewWords: 'Add at least 3 words to start.',
      demoWordCap: (max: number) => `The demo is capped at ${max} words.`,
      timeRange: (min: number, max: number) => `Game time must be between ${min} and ${max} minutes.`,
      selectTypePreset: 'Your packs need at least one word type selected.',
      selectType: 'Select at least one word type.',
    },

    sets: {
      addWordsFirst: 'Add some words first.',
      untitled: 'Untitled set',
      savedNotice: (name: string, count: number) => `Saved “${name}” (${count} words).`,
      loadedNotice: (name: string, count: number) => `Loaded “${name}” (${count} words).`,
      deleteConfirm: (name: string) => `Delete “${name}”?`,
      deleteConfirmLabel: 'Delete',
      deletedNotice: (name: string) => `Deleted “${name}”.`,
    },

    settings: {
      soundLabel: 'Sound',
      resetAllConfirm: 'Remove every custom sound and go back to the built-in defaults?',
      resetAllConfirmLabel: 'Reset',
    },

    sounds: {
      upload: 'Upload',
      clear: 'Clear',
      defaultSound: 'Default sound',
      defaultSounds: 'Default sounds',
      uploadNamed: (label: string) => `Upload ${label}`,
      addNamed: (label: string) => `Add ${label}`,
      addCustom: (label: string) => `Add custom ${label}`,
      remove: 'Remove',
      copied: (name: string) => `Copied ${name}.`,
      copyFailed: (name: string) => `Could not copy ${name}.`,
      copyBase64: 'Copy Base64',
      panelTitle: 'Custom Sounds',
      panelTitleHint: 'Upload your own audio for every moment of the game',
      lockedBody: 'Upload your own audio for every moment of the game.',
      unlock: 'Unlock',
      fullVersion: 'Full version',
      uploaded: (count: number) => `${count} uploaded`,
      optional: 'Optional',
      intro: (formats: string, maxMb: number) =>
        `Upload audio (${formats}, max ${maxMb}MB each). Stored in this browser — Clear on a sound restores the default.`,
      powerUpsHeading: 'Power-Up Sounds:',
      resetAll: 'Reset all to default sounds',
      resetAllTitle: 'Remove every custom sound and go back to the built-in defaults',
      showDev: 'Show Dev Utilities',
      hideDev: 'Hide Dev Utilities',
      devHeading: 'Export Custom Sound Data',
      devHelp: 'Copy Base64 to embed in `constants.ts`.',
      noneUploaded: 'No custom sounds uploaded yet.',
      uploadFile: 'Upload File',
      errType: (formats: string) => `Unsupported file type. Please choose an audio file: ${formats}.`,
      errCannotPlay: (type: string, formats: string) =>
        `This browser cannot play "${type}" audio. Please choose: ${formats}.`,
      errTooLarge: (maxMb: number) =>
        `File size exceeds ${maxMb}MB limit. Please pick a shorter clip or a lower bitrate file.`,
      errRead: 'Error reading file. The file data could not be processed.',
      errReadRetry: 'Error reading file. Please try again or select a different file.',
      slots: {
        setupMusic: 'Setup Music',
        gameMusic: 'Game Music',
        startGame: 'Start Game',
        countdownGo: 'Countdown "GO!"',
        correctGuess: 'Correct Guess',
        skipWord: 'Skip Word',
        timesUp: 'Time\'s Up',
        gameOverWin: 'Game Over (Win)',
        playAgain: 'Play Again',
        collected: 'Collected',
        timeFreeze: 'Time Freeze',
        skipFreebieUsed: 'Skip Freebie Used',
        rushHourActivate: 'Rush Hour Activate',
        rushHourMusic: 'Rush Hour Music',
      },
    },

    demo: {
      badge: 'DEMO',
      freeModes: 'Normal / Hell / Team',
      words: (count: number) => `${count} words`,
      minutes: (count: number) => `${count} min`,
      unlock: 'Unlock',
      perks: {
        soloTracks: 'All solo tracks',
        upTo60Words: 'Up to 60 words',
        upTo10Minutes: 'Up to 10 minutes',
        customSounds: 'Custom sounds',
      },
      packPerk: (name: string) => `${name} pack`,
    },

    modeLabel: 'Game Mode',
    modes: {
      normal: 'Normal',
      team: 'Team',
      hell: 'Hell',
      solo: 'Solo',
    },

    solo: {
      rundownLabel: 'Run rules',
      rundown: (hearts: number, skips: number, seconds: number, floor: number) =>
        `${hearts} hearts · ${skips} free skips · ${seconds}s per word, down to ${floor}s`,
      scoring: 'Every correct word scores, plus streak bonuses and extra hearts along the way.',
      playStyleLabel: 'Play style:',
      playStyleHint: 'pick the skill you want to train',
      blurbDescribe:
        'Hear an English description, then type or say the word. Stuck? Open the hint, then the Vietnamese meaning — that last rung ends your streak.',
      blurbMeaning:
        'Play alone against the clock — pick a track in the next step, then type or say each word from its Vietnamese meaning.',
      styles: {
        describe: {
          name: 'Listen & guess',
          tagline: 'An English description first — no Vietnamese until you ask.',
          ladder: 'clue → hint → meaning',
        },
        meaning: {
          name: 'Meaning & spell',
          tagline: 'The Vietnamese meaning from the start. Pure spelling practice.',
          ladder: 'meaning → spell',
        },
      },
    },

    teamBlurb: 'Two teams take turns guessing words. Rack up points and sabotage your rivals!',
    hellBlurb:
      'Hell Mode has special rules like skip penalties and intense rush hours. Check instructions!',

    packs: {
      label: 'Word Packs',
      selected: (count: number) => `${count} selected`,
      pickOneOrMore: 'pick one or more',
      groupAria: 'Word packs to suggest words from',
      lockedTitle: 'Unlock the Full Version to play this pack',
      toggleTitle: (level: string) => `Toggle ${level}`,
      helpMerged:
        'Suggestions are merged from every pack you pick — you refine the list on the next step.',
      helpEmpty:
        'Pick one or more packs for a ready-to-play list, or leave them blank and type your own words on the next step.',
    },

    tracks: {
      rookie: {
        name: 'Rookie',
        tagline: 'Warm up on everyday words — Starters up to Movers.',
      },
      explorer: {
        name: 'Explorer',
        tagline: 'Everyday words up to A2 — Starters through Key.',
      },
      challenger: {
        name: 'Challenger',
        tagline: 'Push into B1 territory — Starters through PET.',
      },
      master: {
        name: 'Master',
        tagline: 'The full ladder — Pre-A1 all the way to B2.',
      },
      daily: {
        name: "Today's Challenge",
        tagline: 'One seeded ladder a day — the same words for every player.',
      },
    },

    track: {
      done: 'Done',
      replay: 'Replay',
      play: 'Play',
      dailyLine: (tagline: string) => `${tagline} Resets at midnight.`,
      dueNotice: (count: number) => `📌 ${count} words from earlier slips will lead your next run.`,
      pileNotice: (count: number) =>
        `📌 ${count} words in your review pile — they come back as they fall due.`,
      label: 'Track:',
      lockedTitle: 'Unlock the Full Version to play this track',
      lockedBadge: 'Full',
      bestTitle: 'Your best score on this track',
      footnote: (unlocked: boolean, signedIn: boolean) => {
        const access = unlocked
          ? 'Every track is unlocked.'
          : 'Rookie is free — unlock the Full Version to play Explorer, Challenger and Master.';
        const board = signedIn
          ? 'Your best score is saved to the leaderboard.'
          : 'Sign in to join the shared leaderboard.';
        return `${access} ${board}`;
      },
    },

    words: {
      tabsAria: 'How to build your word list',
      suggestion: 'Suggestion',
      manual: 'Enter your word list',
      typesLabel: 'Word Types:',
      types: {
        nouns: 'Nouns',
        verbs: 'Verbs',
        adjectives: 'Adjectives',
        phrasalVerbs: 'Phrasal verbs',
      },
      countLabel: 'Number of Words:',
      countAria: 'Select number of words from preset pool',
      countOption: (count: number) => `${count} words`,
      shuffle: 'Shuffle',
      shuffleTitle: 'Shuffle a new set of words from this pack',
      clear: 'Clear',
      clearTitle: 'Clear the loaded pack from the word list',
      selectType: 'Select a word type.',
      yourWords: 'Your Words',
      counter: (count: number, min: number, demoMax: number | null) =>
        `(${count} ${count === 1 ? 'word' : 'words'}, min ${min}${demoMax ? `, demo max ${demoMax}` : ''})`,
      placeholderSuggest: 'Words from the pack appear here — edit them freely...',
      placeholderManual: 'E.g., Apple, Banana, Cherry',
      listAria: 'Word list for the game',
      helpSuggested: 'Suggested from your packs. Edit freely, or press 🎲 Shuffle for a new set.',
      helpPickPack: 'Pick a pack in the previous step to get suggestions, or just type your own words.',
      helpManual: 'One word per line, or separated by commas.',
      save: 'Save',
      saveTitle: 'Save the words currently in the list as a set',
      load: 'Load',
      loadTitle: 'Load a saved set into the word list',
    },

    timePerWordLabel: 'Time per Word',
    secondsOption: (seconds: number) => `${seconds} seconds`,
    gameTimeLabel: 'Game Time (seconds)',
    gameTimeAria: 'Total game time in seconds',
    gameTimeSummary: (
      minutes: number,
      seconds: number,
      minMinutes: number,
      maxMinutes: number,
      locked: boolean,
    ) =>
      `${minutes}m ${seconds}s total · ${minMinutes}–${maxMinutes} min${locked ? ' on the demo' : ''}`,

    footer: {
      back: 'Back',
      startSolo: 'Start Solo!',
      startGame: 'Start Game!',
      next: (step: string) => `Next: ${step}`,
      startSoloAria: 'Start solo run button',
      startGameAria: 'Start game button',
      goToStepAria: (step: string) => `Go to ${step} step`,
      needWords: 'Add at least 3 words to continue',
    },

    saveDialog: {
      title: 'Save Word Set',
      body: 'Name this set to create a new one, or pick a saved set below to rename and update it.',
      nameLabel: 'Set name',
      namePlaceholder: 'E.g., Animals — Unit 3',
      editing: 'Editing an existing set — saving will replace it.',
      existing: 'Existing sets',
      wordsCount: (count: number) => `${count} words`,
      cancel: 'Cancel',
      update: 'Update set',
      saveNew: 'Save new set',
    },

    loadDialog: {
      title: 'Load Word Set',
      empty: 'No saved sets yet — save your word list first.',
      close: 'Close',
      deleteAria: (name: string) => `Delete saved set ${name}`,
    },
  },

  play: {
    revealHint: 'Hold SPACE or the card to reveal',
    rushHour: '💎 RUSH HOUR !',
    comboActive: (streak: number) => `COMBO ${streak}x ACTIVE!`,
    timeBonus: (seconds: number) => `+${seconds} SECONDS!`,
    timeFreeze: (seconds: number) => `❄️ TIME FREEZE! +${seconds}s`,
    skipFreebieEarned: '↪️ SKIP FREEBIE EARNED!',
    skipFreebieUsed: '↪️ SKIP FREEBIE USED!',
    rushHourOver: 'RUSH HOUR OVER!',

    pauseAria: 'Pause game',
    pauseTitle: 'Pause (Esc)',
    pausedAria: 'Game paused',
    paused: 'Paused',
    resume: '▶️ Resume',
    endGameSeeScore: '⏹️ End Game & See Score',
    escToResume: 'Press Esc to resume',

    endConfirmAria: 'Confirm ending the game',
    endConfirmTitle: 'End the game now?',
    endConfirmTeam: 'The current team scores will go to the results screen.',
    endConfirmSingle: 'Your current score will go to the results screen.',
    cancel: 'Cancel',
    endGame: 'End Game',

    teamA: 'Team A',
    teamB: 'Team B',
    teamMilestone: (team: string) => `Team ${team} hit a milestone!`,
    chooseBox: 'Choose a surprise box!',
    youGot: 'You got:',
    teamTurn: (team: string) => `Team ${team}'s Turn!`,

    boxEffects: {
      add50: '+50 Points!',
      add100: '+100 Points!',
      add200: '+200 Points!',
      sub50: '-50 Points!',
      permaBonus: '+10 Points Per Correct Word!',
      swapScores: 'Scores Swapped!',
      steal: "Steal 20% of Opponent's Points!",
      opponentSkip: '+30 Pts When Opponent Skips!',
      perishTogether: 'PERISH TOGETHER!',
    },

    wordOf: (current: number, total: number) => `Word ${current} of ${total}`,
    calculating: 'Calculating Score...',
    correct: 'CORRECT',
    skip: 'SKIP',
    endGameButton: 'End Game & See Score',
    demo: 'Demo',
    points: 'POINTS:',
    timeLabel: 'Time',
    timeLabelLong: 'TIME:',
    timeRemainingAria: 'Game time remaining',
    timerFrozenAria: 'Timer Frozen',
    frozen: 'FROZEN',
    skipFreebiesTitle: (count: number) => `Skip Freebies: ${count}`,
    combo: (streak: number) => `🔥 Combo: x${streak}`,
    usedSkipHeart: 'Used Skip Heart',
    availableSkipHeart: 'Available Skip Heart',
    lucky: (multiplier: number) => `Lucky x${multiplier}!`,
    happyEmojiAria: 'Happy cheering emoji',
    sadEmojiAria: 'Sad emoji',
    correctAria: 'Correct guess (Left Arrow)',
    passAria: 'Pass word (Right Arrow)',
    endGameAria: 'End game and see score',
  },

  results: {
    gameOver: 'Game Over!',
    resultEmojiAria: 'result emoji',
    yourScore: 'Your Score:',
    timeBonus: (seconds: number) => `Time Bonus: +${seconds}`,
    draw: "It's a Draw! 🤝",
    win: (team: string, emoji: string) => `${team} Wins! ${emoji}`,
    teamA: 'Team A',
    teamB: 'Team B',
    homeAria: 'Back to home',
    home: 'Home',

    demoRounds: (rounds: number) => `🔥 ${rounds} rounds — ready for more?`,
    demoOnly: '🔥 That was only the demo',
    demoPitchRounds: 'Hell 💀 and 4 more word packs are one code away.',
    demoPitchUnlock: 'Unlock **Hell 💀** and **4 more word packs**.',
    unlockCta: 'Unlock Full Version',

    compliments: {
      tier0: {
        emoji: '😔',
        messages: [
          'No words guessed correctly. Better luck next time!',
          'A fresh start awaits! Try again?',
          'Every expert was once a beginner. Keep going!',
          'Zero points? The only way is up!',
          "Don't worry, even a blank slate can become a masterpiece!",
        ],
      },
      tier1: {
        emoji: '👍',
        messages: [
          'Good start! Keep practicing!',
          "You're just getting warmed up!",
          'A promising beginning! More rounds?',
          'Nice first steps into the game!',
          "Keep at it, you're building momentum!",
        ],
      },
      tier2: {
        emoji: '😊',
        messages: [
          "Nice job! You're getting good at this.",
          "Solid effort! You're improving!",
          'That was a good round. Keep it up!',
          "You're definitely on the right track!",
          'Getting the hang of it, I see!',
        ],
      },
      tier3: {
        emoji: '🎉',
        messages: [
          "Great score! You're a fantastic guesser!",
          "Impressive! You've got some skills!",
          'Wow, over 1000 points! Well done!',
          "That's a solid performance!",
          "You're making this look easy!",
        ],
      },
      tier4: {
        emoji: '🚀',
        messages: [
          "Amazing work! You've got serious skills!",
          "Over 2000! You're soaring!",
          "That's some top-tier guessing!",
          'Truly fantastic! Keep this energy!',
          "You're a natural at this game!",
        ],
      },
      tier5: {
        emoji: '🔥',
        messages: [
          "Outstanding! You're on fire!",
          'Phenomenal score! Absolutely crushing it!',
          "You're blazing through these words!",
          'Remarkable! That was a masterclass!',
          'Is it hot in here, or is it just your score?',
        ],
      },
      tier6: {
        emoji: '🏆✨',
        messages: [
          "Incredible! You're a WordCrew champion!",
          'Legendary status almost unlocked!',
          'Masterful performance! Truly top-tier!',
          'That score is breathtaking! Well played!',
          "You're in a league of your own!",
        ],
      },
      tier7: {
        emoji: '🌟👑',
        messages: [
          'WordCrew GOD! Simply unmatched!',
          "UNBELIEVABLE! You've conquered the game!",
          'Perfection! A score for the history books!',
          "Is there anything you can't guess? True legend!",
          "You didn't just play, you DOMINATED!",
        ],
      },
    },
  },

  instructions: {
    pager: {
      sectionsAria: 'Instruction sections',
      previous: 'Previous section',
      next: 'Next section',
    },
    tabs: {
      gameplay: 'Gameplay',
      scoring: 'Scoring',
      penalties: 'Penalties',
    },
    footer: {
      backAria: 'Go back to game setup',
      backToSetup: 'Back to Setup',
      startAria: 'Start playing the game',
      enterHell: 'Enter Hell!',
      startBattle: 'Start Battle!',
      letsPlay: "Let's Play!",
    },

    normal: {
      title: '🚀 NORMAL MODE: YOUR MISSION 🚀',
      goalTitle: '🎯 The Goal',
      goalBody:
        "One player describes the word on screen—no gestures, spelling, or 'sounds like' clues. The crew guesses as many as they can before time runs out!",
      howTitle: '🎮 How to Play',
      correctLabel: '✔️ CORRECT:',
      correctBody: 'They got it right — hit CORRECT or press **⬅️ Left Arrow**.',
      skipLabel: '✖️ SKIP:',
      skipBody: 'Stuck on a word? Hit SKIP or press **➡️ Right Arrow**.',
      timerLabel: '⏰ TIMER:',
      timerBody: 'Watch the clock — the game ends at zero.',
      peekTitle: '🙈 Peek-Proof Word Card',
      peekBody:
        'Each word stays visible for **4 seconds**, then hides. Hold **SPACE** (or press and hold the card) to reveal it again — release to hide.',
      scoringTitle: '💰 Scoring & Bonuses',
      standardLabel: 'Standard Guess:',
      standardBody: '+100 points.',
      luckyLabel: '🌟 Lucky Word:',
      luckyBody: 'Some words are special and grant a **3x points multiplier!**',
      comboLabel: '🔥 Combo Streak:',
      comboBody: '3+ correct in a row earns **+50 per word**; a 5-streak adds **+5 seconds**!',
      timeBonusLabel: '⏱️ Time Bonus:',
      timeBonusBody: 'Any time left on the clock adds to your final score!',
      powerUpsTitle: '✨ Power-Ups',
      freezeLabel: '❄️ Time Freeze:',
      freezeBody: 'A **10-correct streak** adds **+5 seconds** and freezes the timer!',
      skipFreebieLabel: '↪️ Skip Freebie:',
      skipFreebieBody:
        'Hit **streak milestones (5, 15...)** for a free skip that keeps your combo alive.',
      rushHourLabel: '💎 RUSH HOUR:',
      rushHourBody:
        'Reach **score milestones (2000, 4000...)** for 30s of double speed — correct answers score **DOUBLE POINTS!**',
    },

    hell: {
      title: '🔥 HELL MODE: CAN YOU SURVIVE? 🔥',
      challengeTitle: '👹 The Challenge',
      challengeBody:
        'This is the ultimate test of skill using your chosen word list. Score as high as possible before the **TIME BAR** at the top vanishes. There is no time bonus — only survival!',
      peekTitle: '🙈 Peek-Proof Word Card',
      peekBody:
        'Words auto-hide after **4 seconds**. Hold **SPACE** (or press and hold the card) to reveal the word again — release to hide it.',
      clockTitle: '⏳ The Clock is Your Enemy',
      rushHourLabel: '💎 RUSH HOUR:',
      rushHourBody: 'This triggers **twice per game** as time passes.',
      rushHourFastBody:
        'During Rush Hour, the time bar depletes **TWICE AS FAST**, but correct answers earn **DOUBLE POINTS!**',
      skipsTitle: '💔 Skips Are Costly',
      skipStartBody:
        "You start with **ONLY 3 SKIPS**, shown as ❤️ hearts. When they're gone, the skip button is disabled.",
      skipPenaltyLabel: 'Standard Skip Penalty:',
      skipPenaltyBody: '**-200 points.**',
      luckySkipLabel: '🌟 Lucky Word Skip Penalty:',
      luckySkipBody: '**-500 points!**',
      floorLabel: 'Score Floor:',
      floorBody: 'a penalty never pushes your score below **0**.',
      freebieLabel: '↪️ Skip Freebies',
      freebieBody: '(earned via streaks) **DO NOT** use a ❤️ or deduct points.',
      goodLuck: "Good luck... you'll need it. 😈",
    },

    team: {
      title: '🤝 TEAM MODE: RULES 🤝',
      goalTitle: '🎯 The Goal',
      goalBody:
        'Two teams take turns guessing words. After one team answers, the turn **immediately passes to the other team**. Play continues until **every word in the list has been used** — the highest score then wins!',
      peekTitle: '🙈 Peek-Proof Word Card',
      peekBody:
        "The active word auto-hides after **4 seconds**. Hold **SPACE** (or press and hold the card) to reveal it again — release to hide it, so guessers can't cheat via screen reflections.",
      boxesTitle: '🎁 Surprise Boxes!',
      boxesBody:
        "When your team's score hits a **milestone (500, 1000, 1500...)**, the game pauses and you pick one of three mystery boxes. They can hold powerful buffs or disruptive debuffs that could change the game entirely!",
      scoringTitle: '💰 Scoring',
      correctLabel: 'Correct Guess:',
      correctBody: '+100 points.',
      skipLabel: 'Skip Word:',
      skipBody: '-30 points (never below 0).',
      speedLabel: '⚡ Speed Bonus:',
      speedFast: 'Guess under 5 seconds for a **+50 point bonus!**',
      speedMid: 'Guess in 5-10 seconds for a **+20 point bonus.**',
      note: 'Note: No combo bonuses or lucky words in this mode!',
    },
  },
};
