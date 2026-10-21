/**
 * The portal shell: navigation, the Games shelf, the tool card, My Class, My progress,
 * Account and the admin console. Anything a visitor sees before a round starts lives here.
 */
export const dashboard = {
  brand: { product: 'WordCrew', portal: 'Portal' },
  navAria: 'Dashboard sections',

  nav: {
    games: 'Games',
    tools: 'Teaching tools',
    class: 'My Class',
    progress: 'My progress',
    account: 'Account',
    admin: 'Admin',
    accounts: 'Account management',
  },

  sections: {
    games: { title: 'Game collection', subtitle: 'Pick a game and start a round.' },
    tools: {
      title: 'Teaching tools',
      subtitle: 'Classroom tools that sit beside the game — no scores, no leaderboards.',
    },
    class: {
      title: 'My Class',
      subtitle: 'Set work, hand it in, and see what the class actually got wrong.',
    },
    progress: { title: 'My progress', subtitle: 'Your rounds, scores and streaks.' },
    account: { title: 'Account', subtitle: 'Sign-in status and this device.' },
    admin: {
      title: 'Admin',
      subtitle: 'Orders, revenue, access grants and Solo records.',
    },
    accounts: {
      title: 'Account management',
      subtitle: 'Every account, FREE vs PRO, who is online and who can open the tools.',
    },
  },

  games: {
    dailyAria: "Today's Challenge",
    dailyTitle: 'Today’s Challenge is waiting',
    dailyStreak: (days: number) =>
      `🔥 ${days}-day streak — keep it alive. Same ladder for everyone, about 90 seconds.`,
    dailyFresh: 'Same ladder for everyone. One run a day, about 90 seconds.',
    playToday: 'Play today’s',

    welcomeBack: (name: string) => `Welcome back, ${name}.`,
    heroTitle: 'The word game your class shouts over.',
    heroBody:
      'One player describes the word; everyone else guesses before the timer runs out. Pass one screen around the room — the crew needs no accounts and no extra devices.',
    playFull: 'Play full version',
    playDemo: 'Play free demo',
    fullVersion: 'Full version',
    freeDemo: 'Free demo',
    unlockFull: 'Unlock full version',
    leaderboard: 'Solo leaderboard',
    leaderboardAria: 'Open the Solo leaderboard',

    describe: 'Describe this word',
    sampleClue: 'It warns ships away from the rocks at night.',
    sampleRound: 'Round 3 of 8',

    statsAria: 'What is in the box',
    stats: { words: 'Words ready', packs: 'CEFR packs', modes: 'Game modes' },
    chips: {
      levels: 'Levels Pre-A1 to B2',
      words: (count: string) => `${count} words`,
      passAndPlay: 'Pass-and-play',
      offline: 'Works offline',
    },
    game: {
      tagline: 'One player describes the word, the crew guesses it before time runs out.',
      meta: 'Normal, Hell, Team and Solo modes',
    },
    perks: [
      {
        title: 'Cambridge CEFR packs',
        body: 'Starters to B2 First. Pick a level for the class and the word list is ready.',
      },
      {
        title: 'Keeps running offline',
        body: 'Install it on the classroom laptop once; it still works when the wifi drops.',
      },
      {
        title: 'Nothing to set up',
        body: 'Players just pick up the screen. No accounts, no invites, no extra devices.',
      },
    ],
    play: 'Play',
  },

  tools: {
    // The tool card itself — the definition lives in services/tools.ts, the words live here.
    definition: {
      slot: 'Tool 1',
      name: 'Check Vocabulary',
      summary:
        'Test one CEFR level, A1 to B2, or paste this week’s word list. Meanings are filled in for you to review, and the student gets a report instead of a score.',
      meta: ['Levels A1–B2', 'Your own word list', 'Report per student'],
    },
    lockedPayment:
      'This tool is part of the full version. Unlock it once and it keeps working offline on this device.',
    lockedRole:
      'This tool is for teacher accounts. Ask an admin to mark your account as a teacher in Account management.',
    unlockFull: 'Unlock full version',
    footerFree: (date: string) => `Free for everyone until ${date}.`,
    footerPaid: 'Included in the full version.',
    footerRole: 'Included with a teacher account.',
    open: (slot: string) => `Open ${slot}`,
    more: 'More tools will appear on this shelf.',
  },

  class: {
    signIn:
      'Sign in to join your class. Your teacher either adds this email or gives you a six-letter class code — the work shows up here either way.',
    teacherConsole: 'Teacher console',
    locked:
      'Opening classes and setting work is part of the full version. Your students always join for free — the licence pays for the console, never for the classroom.',
    unlockFull: 'Unlock full version',
    footerFree: (date: string) =>
      `Free for teachers until ${date}. Students stay free after that.`,
    footerPaid: 'Included in the full version. Your students join free.',
  },

  progress: {
    signIn: 'Sign in to sync your rounds and scores across devices.',
    stats: {
      streak: 'Day streak',
      rounds: 'Rounds played',
      best: 'Best score',
      guessed: 'Words guessed',
      bestStreak: 'Best streak',
    },
    dailyTitle: '🌅 Daily challenge',
    dailyBody: (freezes: number) =>
      `One seeded ladder a day — the same words for every player. A missed day is covered by a freeze, up to ${freezes} a month.`,
    playAgain: 'Play again',
    playToday: 'Play today',
    dayStreak: 'Day streak',
    bestStreak: 'Best streak',
    freezesLeft: 'Freezes left',
    badgeNext: (days: number, emoji: string, label: string) =>
      `${days} more day${days === 1 ? '' : 's'} to ${emoji} ${label}`,
    badgeAll: 'Every badge unlocked — legendary.',
    badges: {
      Regular: 'Regular',
      Committed: 'Committed',
      Unstoppable: 'Unstoppable',
      Legend: 'Legend',
      Icon: 'Icon',
    } as Record<string, string>,
    last7: 'Last 7 days',
    noRuns: 'No daily runs in the last 7 days. Today is a good day to start.',
    noRun: 'no run',
  },

  account: {
    signedIn: 'Signed in',
    notSignedIn: 'Not signed in',
    guest: 'Playing as a guest on this device.',
    displayName: 'Display name',
    displayNameBody:
      'This is the name shown on the Solo leaderboards. You can change it once every 30 days; contact the admin if you need it sooner.',
    yourName: 'Your name',
    saveName: 'Save name',
    cooldown: (date: string) =>
      `You can change your name again on ${date}. Contact the admin if you need it sooner.`,
    thisDevice: 'This device',
    unlocked: 'Full version unlocked.',
    demo: 'Running the free demo.',
    purchases: 'Your purchases',
    purchasedOn: (date: string) => `Purchased ${date}`,
    purchased: 'Purchased',
    owned: 'Owned',
    pending: 'Pending transfers',
    refresh: 'Refresh',
    pendingBody: 'Transfers we have not matched to an order yet. Keep the code below for support.',
    expired: 'Expired',
    awaiting: 'Awaiting transfer',
    status: { paid: 'Paid', pending: 'Pending', expired: 'Expired' } as Record<string, string>,
    updated: 'Display name updated.',
    updateFailed: 'Could not update your name.',
  },

  admin: {
    revenue: 'Revenue',
    paidOrders: 'Paid orders',
    granted: 'Granted',
    pending: 'Pending',
    grant: 'Grant access',
    grantBody:
      'Issues a lifetime licence to an email without a payment. The account picks it up the next time it signs in on any device.',
    grantPlaceholder: 'student@example.com',
    working: 'Working…',
    grantButton: 'Grant',
    recentOrders: 'Recent orders',
    refresh: 'Refresh',
    noOrders: 'No orders yet.',
    unknown: 'Unknown account',
    revoke: 'Revoke',
    markPaid: 'Mark as paid',
    grantDone: (email: string, key: string) => `Granted to ${email} · ${key}`,
    grantFailed: 'Could not grant access.',
    revokeAsk: (key: string) => `Revoke ${key}? The licence stops unlocking immediately.`,
    revokeLabel: 'Revoke',
    revoked: (key: string) => `Revoked ${key}.`,
    revokeFailed: 'Could not revoke that licence.',
    reconcileAsk: (code: string) =>
      `Mark ${code} as paid and issue its licence? Only do this once the money is in the bank.`,
    reconcileLabel: 'Mark as paid',
    alreadyPaid: (code: string) => `${code} was already paid.`,
    reconcileDone: (code: string, key: string) => `Marked ${code} as paid · ${key}`,
    reconcileFailed: 'Could not update that order.',
  },
};
