import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  DISPLAY_NAME_MAX,
  DISPLAY_NAME_MIN,
  displayNameCooldownEndsAt,
  useAuth,
} from '../contexts/AuthContext';
import { LoginButton } from './LoginButton';
import { ThemeToggle } from './ThemeToggle';
import { confirmDialog, toast } from './Feedback';
import { Icon, type IconName } from './Icon';
import { AdminAccountsPanel, AdminMonthlyRecords } from './AdminAccountsPanel';
import { db } from '../services/firebase';
import {
  fetchAdminOverview,
  fetchMyOrders,
  formatPrice,
  grantAccess,
  reconcileOrder,
  revokeAccess,
  type AdminOverview,
  type EntitlementItem,
  type MyOrder,
} from '../services/payments';
import { cefrWordLists } from '../cefrWordLists';
import { isDailyDoneToday } from '../services/solo';
import { localDateId } from '../services/periods';
import { DAILY_FREEZES_PER_MONTH, dailyMilestone } from '../services/dailyHabit';
import { fetchMyDailyHistory, type DailyHistoryRow } from '../services/soloLeaderboard';

/** Loaded on demand — the leaderboard is opt-in, so it stays out of the entry chunk. */
const SoloLeaderboardPanel = lazy(() => import('./SoloLeaderboardPanel'));

type SectionId = 'games' | 'progress' | 'account' | 'admin' | 'accounts';

interface DashboardProps {
  /** True once a licence has been activated on this device. */
  isUnlocked: boolean;
  /** Products the signed-in account owns. Empty while signed out. */
  entitlements: EntitlementItem[];
  /** Enter the WordCrew game (demo or full, decided by the game itself). */
  onPlayGame: () => void;
  /** Jump straight into Today's Challenge — the one run that is the same for everyone. */
  onStartDaily: () => void;
  /** Start the paid path — the app gates this behind sign-in. */
  onUnlock: () => void;
  /** Re-checks what the account owns — lets a freshly reconciled purchase unlock live. */
  onRefreshAccount: () => void;
}

interface GameEntry {
  id: string;
  name: string;
  tagline: string;
  icon: IconName;
  meta: string;
  available: boolean;
}

/**
 * The catalogue. WordCrew is the first title; the placeholder keeps the grid's shape
 * honest — more games land here over time.
 */
const GAMES: GameEntry[] = [
  {
    id: 'wordcrew',
    name: 'WordCrew',
    tagline: 'One player describes the word, the crew guesses it before time runs out.',
    icon: 'type',
    meta: 'Normal, Hell, Team and Solo modes',
    available: true,
  },
];

/** Word totals read straight from the word data, so the copy can never over-claim. */
const WORD_COUNT = Object.values(cefrWordLists).reduce(
  (total, list) =>
    total + list.nouns.length + list.verbs.length + list.adjectives.length + (list.phrasalVerbs?.length ?? 0),
  0,
);
const PACK_COUNT = Object.keys(cefrWordLists).length;
/** Normal, Hell, Team and Solo — the modes the game ships with. */
const GAME_MODE_COUNT = 4;

const HOME_STATS = [
  { label: 'Words ready', value: WORD_COUNT },
  { label: 'CEFR packs', value: PACK_COUNT },
  { label: 'Game modes', value: GAME_MODE_COUNT },
];

const HOME_CHIPS = [
  'Levels Pre-A1 to B2',
  `${WORD_COUNT.toLocaleString()} words`,
  'Pass-and-play',
  'Works offline',
];

const HOME_PERKS = [
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
];

/** A round in play — the hero's one bold element. Purely decorative. */
const SAMPLE_ROUND = {
  word: 'Lighthouse',
  clue: 'It warns ships away from the rocks at night.',
  timer: '0:38',
  round: 'Round 3 of 8',
  progress: 40,
};

const SECTIONS: { id: SectionId; label: string; icon: IconName; title: string; subtitle: string }[] = [
  { id: 'games', label: 'Games', icon: 'gamepad', title: 'Game collection', subtitle: 'Pick a game and start a round.' },
  { id: 'progress', label: 'My progress', icon: 'chart', title: 'My progress', subtitle: 'Your rounds, scores and streaks.' },
  { id: 'account', label: 'Account', icon: 'user', title: 'Account', subtitle: 'Sign-in status and this device.' },
];

/** Owner-only section, appended to the nav only once the admin probe succeeds. */
const ADMIN_SECTION: { id: SectionId; label: string; icon: IconName; title: string; subtitle: string } = {
  id: 'admin',
  label: 'Admin',
  icon: 'wrench',
  title: 'Admin',
  subtitle: 'Orders, revenue, access grants and Solo records.',
};

/** Owner-only account directory: FREE/PRO, presence and renames. */
const ADMIN_ACCOUNTS_SECTION: { id: SectionId; label: string; icon: IconName; title: string; subtitle: string } = {
  id: 'accounts',
  label: 'Account management',
  icon: 'user',
  title: 'Account management',
  subtitle: 'Every account, FREE vs PRO, who is online and last sign-in.',
};

const INPUT_CLASS =
  'w-full rounded-[var(--r-md)] border border-[var(--wn-4)] bg-[var(--field-bg)] px-4 py-3 text-sm text-[var(--wn-12)] outline-none transition placeholder:text-[var(--wn-8)] focus:border-[var(--wa-5)] focus:ring-2 focus:ring-[var(--wa-4)]';

/** Minimal shape of `users/{uid}` — the Firestore side of the user/progress split. */
interface ProgressDoc {
  roundsPlayed?: number;
  bestScore?: number;
  wordsGuessed?: number;
  bestStreak?: number;
  /** Consecutive days with at least one finished round, and the last such day. */
  playStreak?: number;
  lastPlayedDate?: string;
  /** Today's Challenge habit — written by services/dailyHabit.ts. */
  dailyStreak?: number;
  dailyBestStreak?: number;
  lastDailyDate?: string;
  dailyFreezeMonth?: string;
  dailyFreezesUsed?: number;
}

const useProgressDoc = (): ProgressDoc | null => {
  const { user } = useAuth();
  const [data, setData] = useState<ProgressDoc | null>(null);

  useEffect(() => {
    if (!db || !user) {
      setData(null);
      return;
    }
    return onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => setData(snapshot.exists() ? (snapshot.data() as ProgressDoc) : null),
      () => setData(null),
    );
  }, [user]);

  return data;
};

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Eases a number up to its target on mount — the "numbers feel alive" touch. */
const useCountUp = (target: number, durationMs = 1100): number => {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
};

const StatValue: React.FC<{ value: number; className?: string }> = ({ value, className }) => {
  const shown = useCountUp(value);
  return <p className={className}>{shown.toLocaleString()}</p>;
};

const StatCard: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="wc-card p-4">
    <StatValue value={value} className="text-2xl font-bold tabular-nums text-[var(--wn-12)]" />
    <p className="mt-1 text-xs font-medium text-[var(--wn-9)]">{label}</p>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ isUnlocked, entitlements, onPlayGame, onStartDaily, onUnlock, onRefreshAccount }) => {
  const { user, profile, loading, getIdToken, updateDisplayName } = useAuth();
  const [section, setSection] = useState<SectionId>('games');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [admin, setAdmin] = useState<AdminOverview | null>(null);
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminNotice, setAdminNotice] = useState('');
  const [grantEmail, setGrantEmail] = useState('');
  const [showSoloBoard, setShowSoloBoard] = useState(false);
  const [myOrders, setMyOrders] = useState<MyOrder[]>([]);
  const [nameDraft, setNameDraft] = useState('');
  const [nameBusy, setNameBusy] = useState(false);
  const [dailyHistory, setDailyHistory] = useState<DailyHistoryRow[] | null>(null);
  const progress = useProgressDoc();

  // The rename form starts from the stored profile name and follows live updates.
  useEffect(() => {
    setNameDraft(profile?.displayName ?? '');
  }, [profile?.displayName]);

  // The account's own orders — pending ones carry the transfer code a buyer needs to keep.
  const loadOrders = useCallback(async () => {
    if (!user) {
      setMyOrders([]);
      return;
    }
    setMyOrders(await fetchMyOrders(await getIdToken()));
  }, [user, getIdToken]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  // Probing the owner-only endpoint is how the portal learns whether the Admin section
  // belongs in the nav at all: everyone else gets a 404, which reads as null here.
  const loadAdmin = useCallback(async () => {
    if (!user) {
      setAdmin(null);
      return;
    }
    setAdmin(await fetchAdminOverview(await getIdToken()));
  }, [user, getIdToken]);

  useEffect(() => {
    void loadAdmin();
  }, [loadAdmin]);

  const navSections = useMemo(
    () => (admin ? [...SECTIONS, ADMIN_SECTION, ADMIN_ACCOUNTS_SECTION] : SECTIONS),
    [admin],
  );
  // A section can disappear while it is open (sign-out, revoked admin); fall back to Games.
  const current = (section === 'admin' || section === 'accounts') && !admin ? 'games' : section;
  const active = useMemo(
    () => navSections.find((item) => item.id === current) ?? navSections[0],
    [navSections, current],
  );

  const today = localDateId();
  const dailyDoneToday = profile?.lastDailyDate === today || isDailyDoneToday();
  const freezesUsed =
    progress?.dailyFreezeMonth === today.slice(0, 7) ? progress?.dailyFreezesUsed ?? 0 : 0;
  const freezesLeft = Math.max(0, DAILY_FREEZES_PER_MONTH - freezesUsed);
  const dailyBest = progress?.dailyBestStreak ?? 0;
  const dailyBadge = dailyMilestone(dailyBest);

  // The seven-day strip is only needed while My progress is open, and it is re-read each
  // time the tab is visited so a run finished a minute ago shows up.
  useEffect(() => {
    if (current !== 'progress' || !user) {
      setDailyHistory(null);
      return;
    }
    let cancelled = false;
    void fetchMyDailyHistory(user.uid, 7).then((rows) => {
      if (!cancelled) setDailyHistory(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [current, user]);

  const copyKey = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(value);
      window.setTimeout(() => setCopiedKey((currentKey) => (currentKey === value ? null : currentKey)), 1500);
    } catch {
      /* Clipboard blocked — the key stays visible so it can be copied by hand. */
    }
  };

  const handleGrant = async () => {
    const email = grantEmail.trim();
    if (!email || adminBusy) return;
    const token = await getIdToken();
    if (!token) return;
    setAdminBusy(true);
    setAdminNotice('');
    try {
      const result = await grantAccess(token, email);
      setGrantEmail('');
      setAdminNotice(`Granted to ${result.email} · ${result.licenseKey}`);
      await loadAdmin();
    } catch (err) {
      setAdminNotice(err instanceof Error ? err.message : 'Could not grant access.');
    } finally {
      setAdminBusy(false);
    }
  };

  const handleRevoke = async (licenseKey: string) => {
    if (adminBusy) return;
    if (!(await confirmDialog(`Revoke ${licenseKey}? The licence stops unlocking immediately.`, { confirmLabel: 'Revoke' }))) return;
    const token = await getIdToken();
    if (!token) return;
    setAdminBusy(true);
    setAdminNotice('');
    try {
      await revokeAccess(token, licenseKey);
      setAdminNotice(`Revoked ${licenseKey}.`);
      await loadAdmin();
    } catch (err) {
      setAdminNotice(err instanceof Error ? err.message : 'Could not revoke that licence.');
    } finally {
      setAdminBusy(false);
    }
  };

  // The safety net for a transfer Sepay's webhook never delivered: check the bank first,
  // then mark the order paid here and its licence is issued on the spot.
  const handleReconcile = async (code: string) => {
    if (adminBusy) return;
    if (
      !(await confirmDialog(
        `Mark ${code} as paid and issue its licence? Only do this once the money is in the bank.`,
        { confirmLabel: 'Mark as paid' },
      ))
    )
      return;
    const token = await getIdToken();
    if (!token) return;
    setAdminBusy(true);
    setAdminNotice('');
    try {
      const result = await reconcileOrder(token, code);
      setAdminNotice(
        result.alreadyPaid
          ? `${code} was already paid.`
          : `Marked ${code} as paid · ${result.licenseKey}`,
      );
      await loadAdmin();
    } catch (err) {
      setAdminNotice(err instanceof Error ? err.message : 'Could not update that order.');
    } finally {
      setAdminBusy(false);
    }
  };

  // Self-service rename: the context re-checks the cooldown against a fresh read, so the
  // date shown here is only there to save the player a doomed round-trip.
  const cooldownEndsAt = displayNameCooldownEndsAt(profile);
  const renameLockedUntil = cooldownEndsAt && cooldownEndsAt > Date.now() ? cooldownEndsAt : null;

  const handleRename = async () => {
    if (nameBusy || !user) return;
    setNameBusy(true);
    try {
      await updateDisplayName(nameDraft);
      toast('Display name updated.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not update your name.', 'error');
    } finally {
      setNameBusy(false);
    }
  };

  const greetingName =
    profile?.displayName?.trim().split(/\s+/)[0] || user?.displayName?.trim().split(/\s+/)[0] || user?.email?.split('@')[0] || '';

  // Orders the account placed that are not paid yet — surfaced so the transfer code is
  // never lost once the QR dialog closes.
  const pendingOrders = myOrders.filter(
    (order) => order.status === 'pending' || order.status === 'expired',
  );

  const renderGames = () => (
    <div className="flex flex-col gap-5 lg:h-full">
      {/* The one nudge on this screen: the daily is the only run everybody shares, so it
          is worth a banner until it has been played today. */}
      {!dailyDoneToday && (
        <section
          className="flex flex-col gap-3 rounded-[var(--r-lg)] border border-[var(--wa-5)] bg-[var(--wa-2)] p-4 sm:flex-row sm:items-center sm:justify-between"
          aria-label="Today's Challenge"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">
              🌅
            </span>
            <div>
              <p className="text-sm font-bold text-[var(--wn-12)]">Today’s Challenge is waiting</p>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--wn-10)]">
                {(progress?.dailyStreak ?? 0) > 0
                  ? `🔥 ${progress?.dailyStreak}-day streak — keep it alive. Same ladder for everyone, about 90 seconds.`
                  : 'Same ladder for everyone. One run a day, about 90 seconds.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onStartDaily}
            className="wc-btn wc-btn-primary shrink-0"
          >
            <Icon name="play" size={16} />
            Play today’s
          </button>
        </section>
      )}

      {/* Hero — the sample round is the focal point; the copy stays quiet around it. */}
      <section className="wc-hero p-5 sm:p-6 lg:shrink-0">
        <div className="grid gap-6 md:grid-cols-[1.05fr_0.95fr] md:items-center">
          <div>
            <h2 className="max-w-lg text-2xl font-bold leading-tight text-[var(--wn-12)]">
              {greetingName
                ? `Welcome back, ${greetingName}.`
                : 'The word game your class shouts over.'}
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--wn-10)]">
              One player describes the word; everyone else guesses before the timer runs out. Pass
              one screen around the room — the crew needs no accounts and no extra devices.
            </p>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={onPlayGame}
                className="wc-btn wc-btn-primary flex-1 sm:flex-none sm:px-8"
              >
                <Icon name="play" size={16} />
                {isUnlocked ? 'Play full version' : 'Play free demo'}
              </button>
              {isUnlocked ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--wa-11)]">
                  <Icon name="unlock" size={18} />
                  Full version
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onUnlock}
                  className="wc-icon-btn"
                  aria-label="Unlock full version"
                  title="Unlock full version"
                >
                  <Icon name="lock" size={20} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowSoloBoard(true)}
                className="wc-icon-btn"
                aria-label="Open the Solo leaderboard"
                title="Solo leaderboard"
              >
                <Icon name="trophy" size={20} />
              </button>
            </div>
          </div>

          {/* A round in play — decorative, the one bold element on the page. */}
          <div className="wc-round" aria-hidden="true">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-xs font-semibold text-[var(--wa-11)]">
                <span className="wc-live-dot" />
                Describe this word
              </span>
              <span className="text-sm font-semibold tabular-nums text-[var(--wn-9)]">
                {SAMPLE_ROUND.timer}
              </span>
            </div>

            <p className="wc-round-word">{SAMPLE_ROUND.word}</p>
            <p className="wc-round-clue">“{SAMPLE_ROUND.clue}”</p>

            <div className="flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--wn-3)]">
                <span
                  className="block h-full rounded-full bg-[var(--wa-8)]"
                  style={{ width: `${SAMPLE_ROUND.progress}%` }}
                />
              </div>
              <span className="shrink-0 text-xs font-medium text-[var(--wn-9)]">
                {SAMPLE_ROUND.round}
              </span>
            </div>
          </div>
        </div>
      </section>

      <Suspense fallback={null}>
        <SoloLeaderboardPanel
          isOpen={showSoloBoard}
          onClose={() => setShowSoloBoard(false)}
          isUnlocked={isUnlocked}
        />
      </Suspense>

      {/* Proof, not decoration: real counts straight from the word data. */}
      <section className="wc-stats lg:shrink-0" aria-label="What is in the box">
        {HOME_STATS.map((stat) => (
          <div key={stat.label} className="wc-stat">
            <StatValue
              value={stat.value}
              className="text-xl font-bold tabular-nums text-[var(--wn-12)]"
            />
            <p className="mt-0.5 text-xs text-[var(--wn-9)]">{stat.label}</p>
          </div>
        ))}
      </section>

      {/* One row on a laptop: the title and the classroom notes, nothing to scroll. */}
      <div className="grid gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-[1.55fr_1fr]">
        {GAMES.map((game) => (
          <article key={game.id} className="wc-tile overflow-hidden lg:h-full">
            <div className="flex h-full flex-col md:flex-row">
              <div
                className="wc-cover flex h-32 items-center justify-center md:h-auto md:w-48 md:shrink-0"
                aria-hidden="true"
              >
                <Icon name={game.icon} size={56} className="text-[var(--wa-9)]" />
              </div>

              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-xl font-bold text-[var(--wn-12)]">{game.name}</h3>
                    <p className="mt-1 text-xs text-[var(--wn-9)]">{game.meta}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[0.7rem] font-semibold ${
                      isUnlocked
                        ? 'bg-[var(--wa-2)] text-[var(--wa-11)]'
                        : 'bg-[var(--wn-3)] text-[var(--wn-9)]'
                    }`}
                  >
                    {isUnlocked ? 'Full version' : 'Free demo'}
                  </span>
                </div>

                <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--wn-10)]">{game.tagline}</p>

                <ul className="mt-4 flex flex-wrap gap-2">
                  {HOME_CHIPS.map((chip) => (
                    <li
                      key={chip}
                      className="rounded-full border border-[var(--wn-4)] px-2.5 py-1 text-[0.7rem] font-medium text-[var(--wn-10)]"
                    >
                      {chip}
                    </li>
                  ))}
                </ul>

                {/* Secondary: the hero above already owns the primary action. */}
                <button
                  type="button"
                  onClick={onPlayGame}
                  className="wc-btn wc-btn-secondary mt-4 w-full"
                >
                  <Icon name="play" size={16} />
                  Play
                </button>
              </div>
            </div>
          </article>
        ))}

        {/* Why it holds up in a real classroom */}
        <div className="grid content-start gap-4 sm:grid-cols-3 lg:grid-cols-1 lg:content-center lg:gap-5">
          {HOME_PERKS.map((perk) => (
            <div key={perk.title} className="border-t border-[var(--wn-4)] pt-3">
              <p className="text-sm font-semibold text-[var(--wn-12)]">{perk.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--wn-9)]">{perk.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderProgress = () => {
    if (!loading && !user) {
      return (
        <div className="wc-card flex flex-col items-center gap-3 p-8 text-center">
          <Icon name="chart" size={30} className="text-[var(--wn-10)]" />
          <p className="text-sm text-[var(--wn-10)]">
            Sign in to sync your rounds and scores across devices.
          </p>
          <LoginButton />
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {/* The streak leads: it is the one counter that measures coming back, not playing. */}
          <StatCard label="Day streak" value={progress?.playStreak ?? 0} />
          <StatCard label="Rounds played" value={progress?.roundsPlayed ?? 0} />
          <StatCard label="Best score" value={progress?.bestScore ?? 0} />
          <StatCard label="Words guessed" value={progress?.wordsGuessed ?? 0} />
          <StatCard label="Best streak" value={progress?.bestStreak ?? 0} />
        </div>

        {/* The daily habit: streak, freezes and the week at a glance. This is the screen
            that answers "is it worth coming back tomorrow?". */}
        <div className="wc-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[var(--wn-12)]">🌅 Daily challenge</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--wn-9)]">
                One seeded ladder a day — the same words for every player. A missed day is
                covered by a freeze, up to {DAILY_FREEZES_PER_MONTH} a month.
              </p>
            </div>
            <button
              type="button"
              onClick={onStartDaily}
              className="wc-btn wc-btn-secondary wc-btn-sm shrink-0"
            >
              <Icon name="play" size={14} />
              {dailyDoneToday ? 'Play again' : 'Play today'}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-[var(--r-md)] border border-[var(--wn-4)] bg-[var(--field-bg)] p-2">
              <p className="text-lg font-bold tabular-nums text-[var(--wn-12)]">
                {progress?.dailyStreak ?? 0}
              </p>
              <p className="text-[0.65rem] text-[var(--wn-9)]">Day streak</p>
            </div>
            <div className="rounded-[var(--r-md)] border border-[var(--wn-4)] bg-[var(--field-bg)] p-2">
              <p className="text-lg font-bold tabular-nums text-[var(--wn-12)]">
                {dailyBest}
              </p>
              <p className="text-[0.65rem] text-[var(--wn-9)]">Best streak</p>
            </div>
            <div className="rounded-[var(--r-md)] border border-[var(--wn-4)] bg-[var(--field-bg)] p-2">
              <p className="text-lg font-bold tabular-nums text-[var(--wn-12)]">{freezesLeft}</p>
              <p className="text-[0.65rem] text-[var(--wn-9)]">Freezes left</p>
            </div>
          </div>

          {/* Badges are derived from the best streak — no inventory, just a milestone. */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {dailyBadge.current && (
              <span className="rounded-full border border-[var(--wa-7)] bg-[var(--wa-3)] px-2.5 py-1 text-[0.7rem] font-bold text-[var(--wa-11)]">
                {dailyBadge.current.emoji} {dailyBadge.current.label}
              </span>
            )}
            <p className="text-[0.7rem] text-[var(--wn-9)]">
              {dailyBadge.next
                ? `${dailyBadge.next.at - dailyBest} more day${
                    dailyBadge.next.at - dailyBest === 1 ? '' : 's'
                  } to ${dailyBadge.next.emoji} ${dailyBadge.next.label}`
                : 'Every badge unlocked — legendary.'}
            </p>
          </div>

          <div className="mt-4">
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--wn-9)]">
              Last 7 days
            </p>
            {dailyHistory === null ? (
              <p className="mt-2 animate-subtlePulse text-xs text-[var(--wn-9)]">Loading…</p>
            ) : dailyHistory.every((row) => row.score === null) ? (
              <p className="mt-2 text-xs text-[var(--wn-9)]">
                No daily runs in the last 7 days. Today is a good day to start.
              </p>
            ) : (
              <div className="mt-2 flex items-end gap-1.5">
                {[...dailyHistory].reverse().map((row, index, week) => {
                  const isTodayBar = index === week.length - 1;
                  const peak = Math.max(1, ...week.map((item) => item.score ?? 0));
                  const height =
                    row.score === null ? 4 : Math.max(8, Math.round((row.score / peak) * 56));
                  const label = new Date(`${row.period}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: 'short',
                  });
                  return (
                    <div
                      key={row.period}
                      className="flex min-w-0 flex-1 flex-col items-center gap-1"
                      title={`${label}: ${row.score === null ? 'no run' : row.score.toLocaleString()}`}
                    >
                      <span
                        className={`w-full rounded-t ${
                          row.score === null
                            ? 'bg-[var(--wn-4)]'
                            : isTodayBar
                              ? 'bg-[var(--wa-8)]'
                              : 'bg-[var(--wa-5)]'
                        }`}
                        style={{ height }}
                        aria-hidden="true"
                      />
                      <span
                        className={`text-[0.6rem] ${
                          isTodayBar ? 'font-bold text-[var(--wa-11)]' : 'text-[var(--wn-8)]'
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAccount = () => (
    <div className="wc-card max-w-lg p-6">
      <div className="flex items-center gap-3">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--wa-2)] text-[var(--wa-11)]"
          aria-hidden="true"
        >
          <Icon name="user" size={22} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--wn-12)]">
            {user ? profile?.displayName || user.displayName || 'Signed in' : 'Not signed in'}
          </p>
          <p className="truncate text-xs text-[var(--wn-9)]">
            {user ? user.email : 'Playing as a guest on this device.'}
          </p>
        </div>
      </div>

      {user && (
        <>
          <div className="my-5 h-px bg-[var(--wn-4)]" />

          <p className="text-sm font-semibold text-[var(--wn-12)]">Display name</p>
          <p className="mt-1 text-xs text-[var(--wn-9)]">
            This is the name shown on the Solo leaderboards. You can change it once every 30 days;
            contact the admin if you need it sooner.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="accountDisplayName" className="sr-only">
              Display name
            </label>
            <input
              id="accountDisplayName"
              type="text"
              autoComplete="nickname"
              maxLength={DISPLAY_NAME_MAX}
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              disabled={Boolean(renameLockedUntil) || nameBusy}
              className={INPUT_CLASS}
              placeholder="Your name"
            />
            <button
              type="button"
              onClick={() => void handleRename()}
              disabled={
                Boolean(renameLockedUntil) ||
                nameBusy ||
                nameDraft.trim().length < DISPLAY_NAME_MIN ||
                nameDraft.trim() === (profile?.displayName ?? '')
              }
              className="wc-btn wc-btn-primary shrink-0"
            >
              {nameBusy ? 'Saving…' : 'Save name'}
            </button>
          </div>
          {renameLockedUntil && (
            <p className="mt-2 text-xs text-[var(--wn-10)]">
              You can change your name again on{' '}
              {new Date(renameLockedUntil).toLocaleDateString()}. Contact the admin if you need it
              sooner.
            </p>
          )}
        </>
      )}

      <div className="my-5 h-px bg-[var(--wn-4)]" />

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--wn-12)]">This device</p>
          <p className="text-xs text-[var(--wn-9)]">
            {isUnlocked ? 'Full version unlocked.' : 'Running the free demo.'}
          </p>
        </div>
        {!isUnlocked && (
          <button
            type="button"
            onClick={onUnlock}
            className="wc-icon-btn"
            aria-label="Unlock full version"
            title="Unlock full version"
          >
            <Icon name="lock" size={20} />
          </button>
        )}
      </div>

      {entitlements.length > 0 && (
        <>
          <div className="my-5 h-px bg-[var(--wn-4)]" />

          <p className="text-sm font-semibold text-[var(--wn-12)]">Your purchases</p>
          <ul className="mt-3 space-y-3">
            {entitlements.map((item) => (
              <li key={item.productId} className="rounded-[var(--r-md)] border border-[var(--wn-4)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--wn-12)]">{item.name}</p>
                    <p className="text-xs text-[var(--wn-9)]">
                      {item.paidAt ? `Purchased ${new Date(item.paidAt).toLocaleDateString()}` : 'Purchased'}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--wa-2)] px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--wa-11)]">
                    Owned
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg bg-[var(--wn-3)] px-2.5 py-1.5 text-xs text-[var(--wn-10)]">
                    {item.licenseKey}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copyKey(item.licenseKey)}
                    className="wc-btn wc-btn-secondary wc-btn-sm shrink-0"
                  >
                    {copiedKey === item.licenseKey ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {pendingOrders.length > 0 && (
        <>
          <div className="my-5 h-px bg-[var(--wn-4)]" />

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--wn-12)]">Pending transfers</p>
            <button
              type="button"
              onClick={() => {
                void loadOrders();
                onRefreshAccount();
              }}
              className="wc-btn wc-btn-secondary wc-btn-sm"
            >
              Refresh
            </button>
          </div>
          <p className="mt-1 text-xs text-[var(--wn-9)]">
            Transfers we have not matched to an order yet. Keep the code below for support.
          </p>
          <ul className="mt-3 space-y-3">
            {pendingOrders.map((order) => (
              <li key={order.code} className="rounded-[var(--r-md)] border border-[var(--wn-4)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--wn-12)]">
                      {order.productName}
                    </p>
                    <p className="text-xs text-[var(--wn-9)]">
                      {order.status === 'expired' ? 'Expired' : 'Awaiting transfer'} ·{' '}
                      {formatPrice(order.amount)} · {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--wn-3)] px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--wn-9)]">
                    {order.status}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg bg-[var(--wn-3)] px-2.5 py-1.5 text-xs tracking-wider text-[var(--wa-11)]">
                    {order.code}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copyKey(order.code)}
                    className="wc-btn wc-btn-secondary wc-btn-sm shrink-0"
                  >
                    {copiedKey === order.code ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-5">
        <LoginButton variant="block" />
      </div>
    </div>
  );

  const renderAdmin = () => {
    if (!admin) return null;
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="wc-card p-4">
            <p className="text-2xl font-bold text-[var(--wn-12)]">{formatPrice(admin.stats.revenue)}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[var(--wn-9)]">
              Revenue
            </p>
          </div>
          <StatCard label="Paid orders" value={admin.stats.paidCount} />
          <StatCard label="Granted" value={admin.stats.grantedCount} />
          <StatCard label="Pending" value={admin.stats.pendingCount} />
        </div>

        <div className="wc-card p-5">
          <p className="text-sm font-semibold text-[var(--wn-12)]">Grant access</p>
          <p className="mt-1 text-xs text-[var(--wn-9)]">
            Issues a lifetime licence to an email without a payment. The account picks it up the next time
            it signs in on any device.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="adminGrantEmail" className="sr-only">
              Email to grant access
            </label>
            <input
              id="adminGrantEmail"
              type="email"
              autoComplete="off"
              value={grantEmail}
              onChange={(event) => setGrantEmail(event.target.value)}
              placeholder="student@example.com"
              className={INPUT_CLASS}
            />
            <button
              type="button"
              onClick={() => void handleGrant()}
              disabled={adminBusy || !grantEmail.trim()}
              className="wc-btn wc-btn-primary shrink-0"
            >
              {adminBusy ? 'Working…' : 'Grant'}
            </button>
          </div>
          {adminNotice && (
            <p role="status" className="mt-2 break-all text-xs text-[var(--wn-10)]">
              {adminNotice}
            </p>
          )}
        </div>

        <div className="wc-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--wn-12)]">Recent orders</p>
            <button
              type="button"
              onClick={() => void loadAdmin()}
              className="wc-btn wc-btn-secondary wc-btn-sm"
            >
              Refresh
            </button>
          </div>

          {admin.orders.length === 0 ? (
            <p className="mt-3 text-xs text-[var(--wn-9)]">No orders yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {admin.orders.map((order) => (
                <li key={order.code} className="rounded-[var(--r-md)] border border-[var(--wn-4)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--wn-12)]">
                        {order.email || 'Unknown account'}
                      </p>
                      <p className="truncate text-xs text-[var(--wn-9)]">
                        {order.productName} · {order.code} · {new Date(order.createdAt).toLocaleString()}
                      </p>
                      {order.licenseKey && (
                        <code className="mt-1 block truncate text-xs text-[var(--wn-10)]">
                          {order.licenseKey}
                        </code>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider ${
                          order.status === 'paid'
                            ? 'bg-[var(--wa-2)] text-[var(--wa-11)]'
                            : 'bg-[var(--wn-3)] text-[var(--wn-9)]'
                        }`}
                      >
                        {order.status}
                      </span>
                      <p className="mt-1 text-xs text-[var(--wn-9)]">{formatPrice(order.amount)}</p>
                    </div>
                  </div>

                  {order.status === 'paid' && order.licenseKey && (
                    <button
                      type="button"
                      onClick={() => void handleRevoke(order.licenseKey as string)}
                      disabled={adminBusy}
                      className="wc-btn wc-btn-secondary wc-btn-sm mt-3"
                    >
                      Revoke
                    </button>
                  )}

                  {(order.status === 'pending' || order.status === 'expired') && (
                    <button
                      type="button"
                      onClick={() => void handleReconcile(order.code)}
                      disabled={adminBusy}
                      className="wc-btn wc-btn-secondary wc-btn-sm mt-3"
                    >
                      Mark as paid
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <AdminMonthlyRecords />
      </div>
    );
  };

  return (
    <div className="wc-theme flex h-full w-full flex-col bg-[var(--page-bg)] md:flex-row">
      {/* Left column — menu */}
      <aside className="flex w-full shrink-0 flex-col border-b border-[var(--wn-4)] bg-[var(--rail-bg)] p-4 md:w-64 md:border-b-0 md:border-r">
        <div className="mb-4 flex items-center gap-2 px-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--btn-primary-bg)] text-base font-black text-[var(--on-accent)]">
            W
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-wide text-[var(--wn-12)]">WordCrew</p>
            <p className="truncate text-[0.65rem] uppercase tracking-[0.2em] text-[var(--wn-9)]">Portal</p>
          </div>
        </div>

        <div className="wc-nav-fade">
          <nav
            className="flex gap-1 overflow-x-auto pr-6 md:flex-col md:overflow-visible md:pr-0"
            aria-label="Dashboard sections"
          >
            {navSections.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className="wc-nav-item whitespace-nowrap md:whitespace-normal"
                aria-current={current === item.id ? 'page' : undefined}
              >
                <Icon name={item.icon} size={18} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-4 hidden md:block md:mt-auto md:pt-4">
          <LoginButton variant="block" />
        </div>
      </aside>

      {/* Right column — working area */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--wn-4)] px-5 py-4 md:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-[var(--wn-12)] md:text-xl">{active.title}</h1>
            <p className="truncate text-xs text-[var(--wn-9)]">{active.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="md:hidden">
              <LoginButton />
            </div>
          </div>
        </header>

        <div className="wc-scroll min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
          {current === 'games' && renderGames()}
          {current === 'progress' && renderProgress()}
          {current === 'account' && renderAccount()}
          {current === 'admin' && renderAdmin()}
          {current === 'accounts' && <AdminAccountsPanel />}
        </div>
      </main>
    </div>
  );
};
