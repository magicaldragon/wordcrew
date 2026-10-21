/**
 * The landing page, the sign-in panel and the two purchase dialogs. They share one
 * namespace because the landing screen opens the other three, and the same offer copy
 * ("Unlock Full Version", the perk list) is quoted in all of them.
 */
export const auth = {
  unlockFull: 'Unlock Full Version',

  landing: {
    back: 'Dashboard',
    eyebrow: 'Only Talented Guessers',
    heroBodyBefore:
      'One player describes the word. The crew guesses. The fast, loud classroom word game for',
    heroPlayers: '2 or more players',
    heroBodyAfter: 'on a single screen.',
    playFull: 'Play Full Version',
    playDemo: 'Play Free Demo',
    freeBadges: 'Free · No sign-up · Works offline',
    unlockedNote: 'Full version unlocked on this device',
    alreadyBought: 'Already bought? Enter your licence key',
    modesTitle: 'Four ways to play',
    modesSubtitle: 'Tap a mode to jump straight in',
    fullBadge: 'Full',
    playModeAria: (mode: string) => `Play ${mode} mode`,
    unlockModeAria: (mode: string) => `Unlock ${mode} mode (Full Version)`,
    modes: {
      normal: {
        title: 'Normal',
        players: '2+ players',
        tagline:
          'The classic run. Lucky words, combo streaks and time bonuses — great for any classroom.',
      },
      hell: {
        title: 'Hell',
        players: '2+ players',
        tagline: 'Only 3 skips, brutal penalties and double Rush Hour. Survive — or don’t.',
      },
      team: {
        title: 'Team',
        players: '4+ players',
        tagline:
          'Two teams battle in turns. Speed bonuses and surprise boxes — sabotage your rivals.',
      },
      solo: {
        title: 'Solo',
        players: '1 player',
        tagline:
          'Play alone. Guess each word from its letter boxes and a Vietnamese clue — endless until your hearts run out.',
      },
    },
    madeBy: (name: string) => `Made by ${name}`,
    heartAria: 'heart',
  },

  signIn: {
    title: 'Sign in to WordCrew',
    signUpTitle: 'Create your account',
    firebaseNoticeBefore:
      'Firebase is not configured on this build, so sign-in is disabled. Add your',
    firebaseNoticeKeysTo: 'keys to',
    firebaseNoticeAfter: '.',
    openingGoogle: 'Opening Google…',
    continueWithGoogle: 'Continue with Google',
    emailDivider: 'or use email',
    name: 'Name',
    namePlaceholder: 'Ms. Lan',
    email: 'Email',
    password: 'Password',
    error: 'Could not sign in.',
    pleaseWait: 'Please wait…',
    createAccount: 'Create account',
    newHere: 'New to WordCrew?',
    haveAccount: 'Already have an account?',
    createAccountLink: 'Create an account',
  },

  account: {
    defaultLabel: 'Account',
    signedInLabel: 'Signed in',
  },

  purchase: {
    oneTime: 'one-time · yours forever',
    continueToPayment: 'Continue to payment',
    signInAndContinue: 'Sign in and continue',
    bankTransferNote: 'Bank transfer — a QR code appears on the next step.',
    preparingQr: 'Preparing your QR code…',
    sessionExpired: 'Your session expired. Please sign in again to continue.',
    orderFailed: 'Could not start the order.',
    qrExpired: 'This QR code has expired. Start a new one to continue.',
    qrAlt: (code: string) => `VietQR code for order ${code}`,
    scanHint: 'Scan with any banking app, or transfer manually to',
    transferMemo: 'Transfer memo — keep it exactly as shown',
    copyKey: 'Copy key',
    licenceAuto: 'The licence is issued automatically the moment the transfer arrives.',
    waiting: '⏳ Waiting for your transfer…',
    paymentReceived: 'Payment received — here is your licence key.',
    unlockDevice: 'Unlock this device',
    keepKey: 'Keep this key — it also unlocks the game on your other devices.',
  },

  unlock: {
    licenceLabel: 'Licence key or teacher access code',
    submit: 'Unlock',
    failure: 'That code did not work. Please check it and try again.',
    later: 'Maybe later',
  },

  perks: [
    '💀 Hell Mode — brutal skips & double Rush Hour',
    '📚 4 extra word packs (A2 · A2 Key · B1 · B2)',
    '⏱️ Up to 60 words & 10 minutes per game',
    '🎵 Custom sounds — upload your own music & SFX',
  ],
};
