/**
 * The admin console: the account directory (FREE vs PRO, presence, roles) and the
 * archived Solo boards.
 */
export const admin = {
  stats: {
    accounts: 'Accounts',
    pro: 'PRO',
    free: 'FREE',
    onlineNow: 'Online now',
  },

  /** Row badges. The tier and role identifiers stay as data; only their labels live here. */
  badges: {
    pro: 'PRO',
    free: 'FREE',
    admin: 'ADMIN',
    teacher: 'TEACHER',
    student: 'STUDENT',
  },

  relative: {
    never: 'Never',
    justNow: 'Just now',
    minutesAgo: (count: number) => `${count} min ago`,
    hoursAgo: (count: number) => `${count} h ago`,
    daysAgo: (count: number) => `${count} d ago`,
  },

  directory: {
    title: 'Accounts',
    subtitle:
      'FREE upgrades to PRO automatically once a paid order is matched to the account (uid or verified email).',
    refresh: 'Refresh PRO',
    refreshing: 'Refreshing…',
    filterAria: 'Filter accounts',
    filters: {
      all: 'All accounts',
      free: 'FREE',
      pro: 'PRO',
    },
    searchLabel: 'Search accounts',
    searchPlaceholder: 'Search name or email…',
    loadFailed:
      'Could not read the account directory. Check that the admin email in firestore.rules matches ADMIN_EMAILS.',
    loading: 'Loading accounts…',
    empty: 'No accounts match this view.',

    nameLength: (min: number, max: number) => `Names need ${min}–${max} characters.`,
    renamed: (account: string, name: string) => `Renamed ${account} to ${name}.`,
    renameFailed: 'Could not rename that account. The admin rules may not be deployed yet.',
    promoted: (account: string) => `${account} can open the tools now.`,
    demoted: (account: string) => `${account} is back to a student.`,
    roleFailed: 'Could not change that role. Check that the admin email is in the Firestore rules.',

    displayNameAria: (account: string) => `Display name for ${account}`,
    renameAria: (account: string) => `Rename ${account}`,
    renameTitle: 'Rename this account',
    noDisplayName: '(no display name)',
    noEmail: 'No email on file',
    online: 'Online',
    lastSeen: (value: string) => `Last seen: ${value}`,
    lastLogin: (value: string) => `Last login: ${value}`,
    joined: (value: string) => `Joined: ${value}`,
    unknown: 'Unknown',
    proSince: (value: string) => `PRO since: ${value}`,
    makeTeacher: 'Make teacher',
    makeStudent: 'Make student',
    grantToolsTitle: 'Give teacher tool access',
    revokeToolsTitle: 'Remove teacher tool access',
  },

  monthly: {
    title: 'Monthly records',
    subtitle:
      'Every finished month stays on file. Today’s Challenge keeps a board per day.',
    monthAria: 'Choose a month',
    boardsAria: 'Choose a board',

    /** The board summary under the track chips: board · month · player count. */
    dailyBoard: (period: string | null, players: number | null) => {
      const parts = ['Daily board'];
      if (period) parts.push(period);
      if (players !== null) parts.push(`${players} ${players === 1 ? 'player' : 'players'}`);
      return parts.join(' · ');
    },
    monthlyBoard: (period: string | null, players: number | null) => {
      const parts = ['Monthly board'];
      if (period) parts.push(period);
      if (players !== null) parts.push(`${players} ${players === 1 ? 'player' : 'players'}`);
      return parts.join(' · ');
    },

    loading: 'Loading records…',
    empty: 'No scores on this board yet.',
    words: (count: number) => `${count} words`,
  },
};
