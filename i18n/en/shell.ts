/**
 * The frame around a game: the banner above it, the exit/full-screen controls, and the
 * update notices that float over every screen. Anything that is not inside a game
 * screen itself but is visible while one is running belongs here.
 */
export const shell = {
  /** Browser tab title — set by the language provider so it matches the page. */
  documentTitle: 'WordCrew — Only Talented Guessers',

  banner: {
    solo: 'Solo Challenge',
    party: 'Only Talented Guessers',
  },

  header: {
    backHome: 'Back to home',
    homeAria: 'WordCrew — back to home',
    teacherRunning: (title: string) => `${title} — type the English word for each prompt.`,
    teacherIdle: 'One level or one deck. A report at the end — no hearts, no score.',
    soloRunning: (emoji: string, name: string) =>
      `${emoji} ${name} — type or say your guess before time runs out!`,
    soloIdle: 'Play solo, climb the CEFR ladder and top the leaderboard.',
    party: 'Describe the word on screen to your partner before time runs out!',
    exitSetup: 'Exit setup',
    exitSetupAria: 'Exit setup and return home',
  },

  fullscreen: {
    enter: 'Enter full screen',
    exit: 'Exit full screen',
  },

  update: {
    majorName: (version: string) => `WordCrew ${version}`,
    majorTail: ' is available.',
    ready: 'A new build is ready.',
    reload: 'Reload',
    dismissMajorAria: 'Dismiss update notice',
    dismissMinorAria: 'Dismiss update offer',
  },

  footer: {
    credit: 'Made by Mr. C',
    heartAria: 'heart',
  },

  storageFull:
    'Browser storage is full, so this audio could not be saved and would be lost on reload. Remove a custom sound (or use "Reset all to default sounds") and upload a smaller file.',
  signInForCheckout: 'Sign in to continue to checkout.',
};
