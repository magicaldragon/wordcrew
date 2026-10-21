import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  DISPLAY_NAME_MAX,
  DISPLAY_NAME_MIN,
  displayNameCooldownEndsAt,
  useAuth,
} from '../contexts/AuthContext';
import { LanguageToggle } from './LanguageToggle';
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
import {
  CHECK_VOCABULARY,
  toolFreeUntilLabel,
  toolAccess,
  toolsVisible,
} from '../services/tools';
import type { ClassAssignment } from '../services/classes';
import { classFreeUntilLabel, classConsoleAccess } from '../services/classAccess';
import { useT } from '../i18n/useT';
import { describeError } from '../i18n/errors';
import { useLocale } from '../i18n/useLocale';

/** Loaded on demand — the leaderboard is opt-in, so it stays out of the entry chunk. */
const SoloLeaderboardPanel = lazy(() => import('./SoloLeaderboardPanel'));
/** Both class panels are Firestore-heavy and only one role ever opens either of them. */
const ClassTeacherPanel = lazy(() =>
  import('./ClassTeacherPanel').then((module) => ({ default: module.ClassTeacherPanel })),
);
const ClassStudentPanel = lazy(() =>
  import('./ClassStudentPanel').then((module) => ({ default: module.ClassStudentPanel })),
);

type SectionId = 'games' | 'tools' | 'class' | 'progress' | 'account' | 'admin' | 'accounts';

interface DashboardProps {
  /** True once a licence has been activated on this device. */
  isUnlocked: boolean;
  /** Products the signed-in account owns. Empty while signed out. */
  entitlements: EntitlementItem[];
  /** Enter the WordCrew game (demo or full, decided by the game itself). */
  onPlayGame: () => void;
  /** Jump straight into Today's Challenge — the one run that is the same for everyone. */
  onStartDaily: () => void;
  /** Open Tool 1: Check Vocabulary — level-locked tests and pasted decks, no leaderboard. */
  onOpenTeacher: () => void;
  /** Open one assignment from My Class in the focused work screen. */
  onOpenAssignment: (classId: string, assignment: ClassAssignment) => void;
  /** Bumped when the work screen closes so the class lists re-read their counts. */
  classRefreshKey?: number;
  /** Start the paid path — the app gates this behind sign-in. */
  onUnlock: () => void;
  /** Re-checks what the account owns — lets a freshly reconciled purchase unlock live. */
  onRefreshAccount: () => void;
}

interface GameEntry {
  id: string;
  name: string;
  icon: IconName;
}

/**
 * The catalogue. WordCrew is the first title; the placeholder keeps the grid's shape
 * honest — more games land here over time. Copy lives in the dictionary.
 */
const GAMES: GameEntry[] = [
  {
    id: 'wordcrew',
    name: 'WordCrew',
    icon: 'type',
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

/** Decorative sample round — only the numbers live here; the words come from the dictionary. */
const SAMPLE_ROUND = { word: 'Lighthouse', timer: '0:38', progress: 40 };

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
  const locale = useLocale();
  const shown = useCountUp(value);
  return <p className={className}>{shown.toLocaleString(locale)}</p>;
};

const StatCard: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="wc-card p-4">
    <StatValue value={value} className="text-2xl font-bold tabular-nums text-[var(--wn-12)]" />
    <p className="mt-1 text-xs font-medium text-[var(--wn-9)]">{label}</p>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ isUnlocked, entitlements, onPlayGame, onStartDaily, onOpenTeacher, onOpenAssignment, classRefreshKey = 0, onUnlock, onRefreshAccount }) => {
  const { user, profile, loading, getIdToken, updateDisplayName } = useAuth();
  const t = useT('dashboard');
  const common = useT('common');
  const errors = useT('errors');
  // Dates follow the chosen interface language, not the browser's, so a Vietnamese page
  // never shows "Mon, Tue" in the middle of it.
  const locale = useLocale();
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

  // Tool access is a single dial (services/tools.ts): open during launch, teacher-only
  // when the gate closes, paid when it becomes a product. Nav, card and locked state all
  // derive from it, so flipping the mode is the only change needed.
  const toolViewer = useMemo(
    () => ({
      isTeacher: profile?.role === 'teacher',
      isAdmin: admin !== null,
      isPro: isUnlocked || entitlements.length > 0,
    }),
    [profile?.role, admin, isUnlocked, entitlements.length],
  );
  const toolGate = useMemo(() => toolAccess(toolViewer), [toolViewer]);
  const showTools = toolsVisible(toolGate);

  const navSections = useMemo(() => {
    // Labels and subtitles come from the dictionary, so switching language re-renders the
    // whole rail — the section ids never change, only the words around them.
    const items: { id: SectionId; label: string; icon: IconName; title: string; subtitle: string }[] = [
      { id: 'games', label: t.nav.games, icon: 'gamepad', ...t.sections.games },
      { id: 'progress', label: t.nav.progress, icon: 'chart', ...t.sections.progress },
      { id: 'account', label: t.nav.account, icon: 'user', ...t.sections.account },
    ];
    // Class sits next to the tools: both are the teaching side of the portal. The tab
    // is listed even when signed out on purpose — that shelf is where a brand-new
    // student is told to sign in, so hiding it would hide the only door into a class.
    items.splice(1, 0, { id: 'class', label: t.nav.class, icon: 'user', ...t.sections.class });
    if (showTools) {
      items.splice(1, 0, { id: 'tools', label: t.nav.tools, icon: 'wrench', ...t.sections.tools });
    }
    if (admin) {
      items.push({ id: 'admin', label: t.nav.admin, icon: 'wrench', ...t.sections.admin });
      items.push({ id: 'accounts', label: t.nav.accounts, icon: 'user', ...t.sections.accounts });
    }
    return items;
  }, [admin, showTools, t]);
  // A section can disappear while it is open (sign-out, revoked admin, the tool gate
  // closing); fall back to Games.
  const current =
    ((section === 'admin' || section === 'accounts') && !admin) ||
    (section === 'tools' && !showTools)
      ? 'games'
      : section;
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
      setAdminNotice(t.admin.grantDone(result.email, result.licenseKey));
      await loadAdmin();
    } catch (err) {
      setAdminNotice(describeError(errors, err, t.admin.grantFailed));
    } finally {
      setAdminBusy(false);
    }
  };

  const handleRevoke = async (licenseKey: string) => {
    if (adminBusy) return;
    if (!(await confirmDialog(t.admin.revokeAsk(licenseKey), { confirmLabel: t.admin.revokeLabel }))) return;
    const token = await getIdToken();
    if (!token) return;
    setAdminBusy(true);
    setAdminNotice('');
    try {
      await revokeAccess(token, licenseKey);
      setAdminNotice(t.admin.revoked(licenseKey));
      await loadAdmin();
    } catch (err) {
      setAdminNotice(describeError(errors, err, t.admin.revokeFailed));
    } finally {
      setAdminBusy(false);
    }
  };

  // The safety net for a transfer Sepay's webhook never delivered: check the bank first,
  // then mark the order paid here and its licence is issued on the spot.
  const handleReconcile = async (code: string) => {
    if (adminBusy) return;
    if (
      !(await confirmDialog(t.admin.reconcileAsk(code), { confirmLabel: t.admin.reconcileLabel }))
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
          ? t.admin.alreadyPaid(code)
          : t.admin.reconcileDone(code, result.licenseKey),
      );
      await loadAdmin();
    } catch (err) {
      setAdminNotice(describeError(errors, err, t.admin.reconcileFailed));
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
      toast(t.account.updated, 'success');
    } catch (err) {
      toast(describeError(errors, err, t.account.updateFailed), 'error');
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

  const renderGames = () => {
    const homeStats = [
      { label: t.games.stats.words, value: WORD_COUNT },
      { label: t.games.stats.packs, value: PACK_COUNT },
      { label: t.games.stats.modes, value: GAME_MODE_COUNT },
    ];
    const homeChips = [
      t.games.chips.levels,
      t.games.chips.words(WORD_COUNT.toLocaleString(locale)),
      t.games.chips.passAndPlay,
      t.games.chips.offline,
    ];

    return (
    <div className="flex flex-col gap-5 lg:h-full">
      {/* The one nudge on this screen: the daily is the only run everybody shares, so it
          is worth a banner until it has been played today. */}
      {!dailyDoneToday && (
        <section
          className="flex flex-col gap-3 rounded-[var(--r-lg)] border border-[var(--wa-5)] bg-[var(--wa-2)] p-4 sm:flex-row sm:items-center sm:justify-between"
          aria-label={t.games.dailyAria}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">
              🌅
            </span>
            <div>
              <p className="text-sm font-bold text-[var(--wn-12)]">{t.games.dailyTitle}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--wn-10)]">
                {(progress?.dailyStreak ?? 0) > 0
                  ? t.games.dailyStreak(progress?.dailyStreak ?? 0)
                  : t.games.dailyFresh}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onStartDaily}
            className="wc-btn wc-btn-primary shrink-0"
          >
            <Icon name="play" size={16} />
            {t.games.playToday}
          </button>
        </section>
      )}

      {/* Hero — the sample round is the focal point; the copy stays quiet around it. */}
      <section className="wc-hero p-5 sm:p-6 lg:shrink-0">
        <div className="grid gap-6 md:grid-cols-[1.05fr_0.95fr] md:items-center">
          <div>
            <h2 className="max-w-lg text-2xl font-bold leading-tight text-[var(--wn-12)]">
              {greetingName ? t.games.welcomeBack(greetingName) : t.games.heroTitle}
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--wn-10)]">
              {t.games.heroBody}
            </p>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={onPlayGame}
                className="wc-btn wc-btn-primary flex-1 sm:flex-none sm:px-8"
              >
                <Icon name="play" size={16} />
                {isUnlocked ? t.games.playFull : t.games.playDemo}
              </button>
              {isUnlocked ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--wa-11)]">
                  <Icon name="unlock" size={18} />
                  {t.games.fullVersion}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onUnlock}
                  className="wc-icon-btn"
                  aria-label={t.games.unlockFull}
                  title={t.games.unlockFull}
                >
                  <Icon name="lock" size={20} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowSoloBoard(true)}
                className="wc-icon-btn"
                aria-label={t.games.leaderboardAria}
                title={t.games.leaderboard}
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
                {t.games.describe}
              </span>
              <span className="text-sm font-semibold tabular-nums text-[var(--wn-9)]">
                {SAMPLE_ROUND.timer}
              </span>
            </div>

            <p className="wc-round-word">{SAMPLE_ROUND.word}</p>
            <p className="wc-round-clue">“{t.games.sampleClue}”</p>

            <div className="flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--wn-3)]">
                <span
                  className="block h-full rounded-full bg-[var(--wa-8)]"
                  style={{ width: `${SAMPLE_ROUND.progress}%` }}
                />
              </div>
              <span className="shrink-0 text-xs font-medium text-[var(--wn-9)]">
                {t.games.sampleRound}
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
      <section className="wc-stats lg:shrink-0" aria-label={t.games.statsAria}>
        {homeStats.map((stat) => (
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
                    <p className="mt-1 text-xs text-[var(--wn-9)]">{t.games.game.meta}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[0.7rem] font-semibold ${
                      isUnlocked
                        ? 'bg-[var(--wa-2)] text-[var(--wa-11)]'
                        : 'bg-[var(--wn-3)] text-[var(--wn-9)]'
                    }`}
                  >
                    {isUnlocked ? t.games.fullVersion : t.games.freeDemo}
                  </span>
                </div>

                <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--wn-10)]">
                  {t.games.game.tagline}
                </p>

                <ul className="mt-4 flex flex-wrap gap-2">
                  {homeChips.map((chip) => (
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
                  {t.games.play}
                </button>
              </div>
            </div>
          </article>
        ))}

        {/* Why it holds up in a real classroom */}
        <div className="grid content-start gap-4 sm:grid-cols-3 lg:grid-cols-1 lg:content-center lg:gap-5">
          {t.games.perks.map((perk) => (
            <div key={perk.title} className="border-t border-[var(--wn-4)] pt-3">
              <p className="text-sm font-semibold text-[var(--wn-12)]">{perk.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--wn-9)]">{perk.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
    );
  };

  /**
   * The tool shelf. One card per tool; the gate decides whether it opens, asks for a
   * teacher account, or sells the full version. Nothing on this shelf is a game — no
   * score, no leaderboard, no CEFR ladder.
   */
  const renderTools = () => {
    if (!toolGate.allowed) {
      const needsPayment = toolGate.denial === 'payment';
      return (
        <div className="wc-card flex flex-col items-start gap-4 p-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-[var(--r-md)] bg-[var(--wn-3)] text-[var(--wn-10)]">
            <Icon name="lock" size={22} />
          </span>
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[var(--wn-9)]">
              {t.tools.definition.slot}
            </p>
            <h3 className="mt-0.5 text-lg font-bold text-[var(--wn-12)]">
              {t.tools.definition.name}
            </h3>
            <p className="mt-1 max-w-prose text-sm leading-relaxed text-[var(--wn-10)]">
              {needsPayment ? t.tools.lockedPayment : t.tools.lockedRole}
            </p>
          </div>
          {needsPayment && (
            <button type="button" onClick={onUnlock} className="wc-btn wc-btn-primary">
              <Icon name="unlock" size={16} />
              {t.tools.unlockFull}
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        <section className="wc-card overflow-hidden" aria-label={t.tools.definition.name}>
          <div className="flex items-start gap-4 p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-[var(--wa-2)] text-[var(--wa-11)]">
              <Icon name={CHECK_VOCABULARY.icon} size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[var(--wn-9)]">
                {t.tools.definition.slot}
              </p>
              <h3 className="mt-0.5 text-lg font-bold text-[var(--wn-12)]">
                {t.tools.definition.name}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--wn-10)]">
                {t.tools.definition.summary}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {t.tools.definition.meta.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[var(--wn-4)] px-2.5 py-1 text-[0.7rem] font-medium text-[var(--wn-10)]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-[var(--wn-4)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[var(--wn-9)]">
              {toolGate.mode === 'open'
                ? t.tools.footerFree(toolFreeUntilLabel(locale))
                : toolGate.mode === 'paid'
                  ? t.tools.footerPaid
                  : t.tools.footerRole}
            </p>
            <button type="button" onClick={onOpenTeacher} className="wc-btn wc-btn-primary">
              <Icon name="play" size={16} />
              {t.tools.open(t.tools.definition.slot)}
            </button>
          </div>
        </section>
        <p className="text-xs text-[var(--wn-9)]">{t.tools.more}</p>
      </div>
    );
  };

  /**
   * My Class. The role decides which half of the feature opens: a teacher gets the roster
   * and the assignment console, a student gets the list of work and nothing about
   * classmates. Signing in is the only requirement to see the tab, because the join form
   * has to live somewhere a brand-new student can reach.
   *
   * Only the console is ever gated. A student never pays to open the class their teacher
   * already set up — the whole loop dies if the learner is asked for money at the door.
   */
  const renderClass = () => {
    if (!user) {
      return (
        <div className="wc-card flex flex-col items-center gap-3 p-8 text-center">
          <Icon name="user" size={30} className="text-[var(--wn-10)]" />
          <p className="max-w-sm text-sm text-[var(--wn-10)]">{t.class.signIn}</p>
          <LoginButton />
        </div>
      );
    }

    const viewer = {
      uid: user.uid,
      email: user.email ?? '',
      name: profile?.displayName || user.displayName || user.email || 'Student',
    };
    // Admins count as teachers everywhere else, so the console opens for them too.
    const isTeacher = profile?.role === 'teacher' || admin !== null;
    const consoleAccess = classConsoleAccess(toolViewer);

    if (isTeacher && !consoleAccess.allowed) {
      return (
        <div className="wc-card flex flex-col gap-4 p-5">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-[var(--wn-3)] text-[var(--wn-10)]">
              <Icon name="lock" size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[var(--wn-9)]">
                {t.class.teacherConsole}
              </p>
              <h3 className="mt-0.5 text-lg font-bold text-[var(--wn-12)]">{t.sections.class.title}</h3>
              <p className="mt-1 max-w-prose text-sm leading-relaxed text-[var(--wn-10)]">
                {t.class.locked}
              </p>
            </div>
          </div>
          <button type="button" onClick={onUnlock} className="wc-btn wc-btn-primary self-start">
            <Icon name="unlock" size={16} />
            {t.class.unlockFull}
          </button>
        </div>
      );
    }

    return (
      <Suspense
        fallback={
          <div className="wc-card flex items-center justify-center p-8" role="status" aria-live="polite">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--wn-4)] border-t-electric-blue" />
            <span className="sr-only">{common.loading}</span>
          </div>
        }
      >
        {isTeacher ? (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-[var(--wn-9)]">
              {consoleAccess.mode === 'open'
                ? t.class.footerFree(classFreeUntilLabel(locale))
                : t.class.footerPaid}
            </p>
            <ClassTeacherPanel viewer={viewer} refreshKey={classRefreshKey} />
          </div>
        ) : (
          <ClassStudentPanel viewer={viewer} onOpenAssignment={onOpenAssignment} refreshKey={classRefreshKey} />
        )}
      </Suspense>
    );
  };

  const renderProgress = () => {
    if (!loading && !user) {
      return (
        <div className="wc-card flex flex-col items-center gap-3 p-8 text-center">
          <Icon name="chart" size={30} className="text-[var(--wn-10)]" />
          <p className="text-sm text-[var(--wn-10)]">{t.progress.signIn}</p>
          <LoginButton />
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {/* The streak leads: it is the one counter that measures coming back, not playing. */}
          <StatCard label={t.progress.stats.streak} value={progress?.playStreak ?? 0} />
          <StatCard label={t.progress.stats.rounds} value={progress?.roundsPlayed ?? 0} />
          <StatCard label={t.progress.stats.best} value={progress?.bestScore ?? 0} />
          <StatCard label={t.progress.stats.guessed} value={progress?.wordsGuessed ?? 0} />
          <StatCard label={t.progress.stats.bestStreak} value={progress?.bestStreak ?? 0} />
        </div>

        {/* The daily habit: streak, freezes and the week at a glance. This is the screen
            that answers "is it worth coming back tomorrow?". */}
        <div className="wc-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[var(--wn-12)]">{t.progress.dailyTitle}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--wn-9)]">
                {t.progress.dailyBody(DAILY_FREEZES_PER_MONTH)}
              </p>
            </div>
            <button
              type="button"
              onClick={onStartDaily}
              className="wc-btn wc-btn-secondary wc-btn-sm shrink-0"
            >
              <Icon name="play" size={14} />
              {dailyDoneToday ? t.progress.playAgain : t.progress.playToday}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-[var(--r-md)] border border-[var(--wn-4)] bg-[var(--field-bg)] p-2">
              <p className="text-lg font-bold tabular-nums text-[var(--wn-12)]">
                {progress?.dailyStreak ?? 0}
              </p>
              <p className="text-[0.65rem] text-[var(--wn-9)]">{t.progress.dayStreak}</p>
            </div>
            <div className="rounded-[var(--r-md)] border border-[var(--wn-4)] bg-[var(--field-bg)] p-2">
              <p className="text-lg font-bold tabular-nums text-[var(--wn-12)]">
                {dailyBest}
              </p>
              <p className="text-[0.65rem] text-[var(--wn-9)]">{t.progress.bestStreak}</p>
            </div>
            <div className="rounded-[var(--r-md)] border border-[var(--wn-4)] bg-[var(--field-bg)] p-2">
              <p className="text-lg font-bold tabular-nums text-[var(--wn-12)]">{freezesLeft}</p>
              <p className="text-[0.65rem] text-[var(--wn-9)]">{t.progress.freezesLeft}</p>
            </div>
          </div>

          {/* Badges are derived from the best streak — no inventory, just a milestone. */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {dailyBadge.current && (
              <span className="rounded-full border border-[var(--wa-7)] bg-[var(--wa-3)] px-2.5 py-1 text-[0.7rem] font-bold text-[var(--wa-11)]">
                {dailyBadge.current.emoji}{' '}
                {t.progress.badges[dailyBadge.current.label] ?? dailyBadge.current.label}
              </span>
            )}
            <p className="text-[0.7rem] text-[var(--wn-9)]">
              {dailyBadge.next
                ? t.progress.badgeNext(
                    dailyBadge.next.at - dailyBest,
                    dailyBadge.next.emoji,
                    t.progress.badges[dailyBadge.next.label] ?? dailyBadge.next.label,
                  )
                : t.progress.badgeAll}
            </p>
          </div>

          <div className="mt-4">
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--wn-9)]">
              {t.progress.last7}
            </p>
            {dailyHistory === null ? (
              <p className="mt-2 animate-subtlePulse text-xs text-[var(--wn-9)]">{common.loading}</p>
            ) : dailyHistory.every((row) => row.score === null) ? (
              <p className="mt-2 text-xs text-[var(--wn-9)]">{t.progress.noRuns}</p>
            ) : (
              <div className="mt-2 flex items-end gap-1.5">
                {[...dailyHistory].reverse().map((row, index, week) => {
                  const isTodayBar = index === week.length - 1;
                  const peak = Math.max(1, ...week.map((item) => item.score ?? 0));
                  const height =
                    row.score === null ? 4 : Math.max(8, Math.round((row.score / peak) * 56));
                  const label = new Date(`${row.period}T00:00:00`).toLocaleDateString(locale, {
                    weekday: 'short',
                  });
                  return (
                    <div
                      key={row.period}
                      className="flex min-w-0 flex-1 flex-col items-center gap-1"
                      title={`${label}: ${row.score === null ? t.progress.noRun : row.score.toLocaleString(locale)}`}
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
            {user ? profile?.displayName || user.displayName || t.account.signedIn : t.account.notSignedIn}
          </p>
          <p className="truncate text-xs text-[var(--wn-9)]">
            {user ? user.email : t.account.guest}
          </p>
        </div>
      </div>

      {user && (
        <>
          <div className="my-5 h-px bg-[var(--wn-4)]" />

          <p className="text-sm font-semibold text-[var(--wn-12)]">{t.account.displayName}</p>
          <p className="mt-1 text-xs text-[var(--wn-9)]">
            {t.account.displayNameBody}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="accountDisplayName" className="sr-only">
              {t.account.displayName}
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
              placeholder={t.account.yourName}
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
              {nameBusy ? common.saving : t.account.saveName}
            </button>
          </div>
          {renameLockedUntil && (
            <p className="mt-2 text-xs text-[var(--wn-10)]">
              {t.account.cooldown(new Date(renameLockedUntil).toLocaleDateString(locale))}
            </p>
          )}
        </>
      )}

      <div className="my-5 h-px bg-[var(--wn-4)]" />

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--wn-12)]">{t.account.thisDevice}</p>
          <p className="text-xs text-[var(--wn-9)]">
            {isUnlocked ? t.account.unlocked : t.account.demo}
          </p>
        </div>
        {!isUnlocked && (
          <button
            type="button"
            onClick={onUnlock}
            className="wc-icon-btn"
            aria-label={t.games.unlockFull}
            title={t.games.unlockFull}
          >
            <Icon name="lock" size={20} />
          </button>
        )}
      </div>

      {entitlements.length > 0 && (
        <>
          <div className="my-5 h-px bg-[var(--wn-4)]" />

          <p className="text-sm font-semibold text-[var(--wn-12)]">{t.account.purchases}</p>
          <ul className="mt-3 space-y-3">
            {entitlements.map((item) => (
              <li key={item.productId} className="rounded-[var(--r-md)] border border-[var(--wn-4)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--wn-12)]">{item.name}</p>
                    <p className="text-xs text-[var(--wn-9)]">
                      {item.paidAt
                        ? t.account.purchasedOn(new Date(item.paidAt).toLocaleDateString(locale))
                        : t.account.purchased}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--wa-2)] px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--wa-11)]">
                    {t.account.owned}
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
                    {copiedKey === item.licenseKey ? common.copied : common.copy}
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
            <p className="text-sm font-semibold text-[var(--wn-12)]">{t.account.pending}</p>
            <button
              type="button"
              onClick={() => {
                void loadOrders();
                onRefreshAccount();
              }}
              className="wc-btn wc-btn-secondary wc-btn-sm"
            >
              {t.account.refresh}
            </button>
          </div>
          <p className="mt-1 text-xs text-[var(--wn-9)]">
            {t.account.pendingBody}
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
                      {order.status === 'expired' ? t.account.expired : t.account.awaiting} ·{' '}
                      {formatPrice(order.amount)} · {new Date(order.createdAt).toLocaleDateString(locale)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--wn-3)] px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--wn-9)]">
                    {t.account.status[order.status] ?? order.status}
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
                    {copiedKey === order.code ? common.copied : common.copy}
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
              {t.admin.revenue}
            </p>
          </div>
          <StatCard label={t.admin.paidOrders} value={admin.stats.paidCount} />
          <StatCard label={t.admin.granted} value={admin.stats.grantedCount} />
          <StatCard label={t.admin.pending} value={admin.stats.pendingCount} />
        </div>

        <div className="wc-card p-5">
          <p className="text-sm font-semibold text-[var(--wn-12)]">{t.admin.grant}</p>
          <p className="mt-1 text-xs text-[var(--wn-9)]">
            {t.admin.grantBody}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="adminGrantEmail" className="sr-only">
              {t.admin.grant}
            </label>
            <input
              id="adminGrantEmail"
              type="email"
              autoComplete="off"
              value={grantEmail}
              onChange={(event) => setGrantEmail(event.target.value)}
              placeholder={t.admin.grantPlaceholder}
              className={INPUT_CLASS}
            />
            <button
              type="button"
              onClick={() => void handleGrant()}
              disabled={adminBusy || !grantEmail.trim()}
              className="wc-btn wc-btn-primary shrink-0"
            >
              {adminBusy ? t.admin.working : t.admin.grantButton}
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
            <p className="text-sm font-semibold text-[var(--wn-12)]">{t.admin.recentOrders}</p>
            <button
              type="button"
              onClick={() => void loadAdmin()}
              className="wc-btn wc-btn-secondary wc-btn-sm"
            >
              {t.admin.refresh}
            </button>
          </div>

          {admin.orders.length === 0 ? (
            <p className="mt-3 text-xs text-[var(--wn-9)]">{t.admin.noOrders}</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {admin.orders.map((order) => (
                <li key={order.code} className="rounded-[var(--r-md)] border border-[var(--wn-4)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--wn-12)]">
                        {order.email || t.admin.unknown}
                      </p>
                      <p className="truncate text-xs text-[var(--wn-9)]">
                        {order.productName} · {order.code} · {new Date(order.createdAt).toLocaleString(locale)}
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
                        {t.account.status[order.status] ?? order.status}
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
                      {t.admin.revoke}
                    </button>
                  )}

                  {(order.status === 'pending' || order.status === 'expired') && (
                    <button
                      type="button"
                      onClick={() => void handleReconcile(order.code)}
                      disabled={adminBusy}
                      className="wc-btn wc-btn-secondary wc-btn-sm mt-3"
                    >
                      {t.admin.markPaid}
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
            <p className="truncate text-sm font-bold tracking-wide text-[var(--wn-12)]">{t.brand.product}</p>
            <p className="truncate text-[0.65rem] uppercase tracking-[0.2em] text-[var(--wn-9)]">{t.brand.portal}</p>
          </div>
        </div>

        <div className="wc-nav-fade">
          <nav
            className="flex gap-1 overflow-x-auto pr-6 md:flex-col md:overflow-visible md:pr-0"
            aria-label={t.navAria}
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
            <LanguageToggle />
            <ThemeToggle />
            <div className="md:hidden">
              <LoginButton />
            </div>
          </div>
        </header>

        <div className="wc-scroll min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
          {current === 'games' && renderGames()}
          {current === 'tools' && renderTools()}
          {current === 'class' && renderClass()}
          {current === 'progress' && renderProgress()}
          {current === 'account' && renderAccount()}
          {current === 'admin' && renderAdmin()}
          {current === 'accounts' && <AdminAccountsPanel />}
        </div>
      </main>
    </div>
  );
};
