import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon';
import { confirmDialog, toast } from './Feedback';
import { ClassAssignmentEditor } from './ClassAssignmentEditor';
import { TeacherDeckEditor } from './TeacherDeckEditor';
import { TeacherModeDialog } from './TeacherModeDialog';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../i18n/useLocale';
import { useT } from '../i18n/useT';
import { createAssignment, fetchAssignments, fetchTeacherClasses, type SchoolClass } from '../services/classes';
import {
  cachedTeacherDecks,
  clampTestWords,
  countLevelWords,
  deckStatus,
  deleteTeacherDeck,
  loadTeacherDecks,
  MAX_DECKS,
  MAX_TEST_WORDS,
  MIN_TEST_WORDS,
  newTeacherDeckId,
  saveTeacherDeck,
  TEACHER_LEVELS,
  TEACHER_TEST_MODES,
  type TeacherDeck,
  type TeacherDeckSync,
  type TeacherLevelId,
  type TeacherTestMode,
  watchTeacherDecks,
} from '../services/teacherDeck';

interface TeacherSetupScreenProps {
  onStartLevel: (levelId: TeacherLevelId, count: number, mode: TeacherTestMode) => void;
  /** Study the deck's cards first; the test is offered once the last card is reached. */
  onStartDeck: (deck: TeacherDeck) => void;
  /** Skip the cards and run the deck test straight away, in the chosen question style. */
  onTestDeck: (deck: TeacherDeck, mode: TeacherTestMode) => void;
  onExit: () => void;
  /** Opens the sign-in dialog; only decks that are kept need an account. */
  onRequireSignIn: () => void;
}

type TabId = 'level' | 'decks';
type DeckFilter = 'all' | 'ready' | 'draft';

/**
 * Teacher Mode's front door. Two sources, one shape of test: pick a level and the words
 * come from that band only, or pick a deck the teacher built from this week's lesson.
 * Nothing here touches the leaderboard, the hearts or the Memory Anchors.
 */
export const TeacherSetupScreen: React.FC<TeacherSetupScreenProps> = ({
  onStartLevel,
  onStartDeck,
  onTestDeck,
  onExit,
  onRequireSignIn,
}) => {
  const t = useT('teacher');
  const { delete: deleteLabel, loading: loadingLabel } = useT('common');
  const { user } = useAuth();
  const locale = useLocale();
  const owner = user?.uid ?? 'guest';
  const [tab, setTab] = useState<TabId>('level');
  const [levelId, setLevelId] = useState<TeacherLevelId>('A1');
  const [mode, setMode] = useState<TeacherTestMode>('listen');
  const [count, setCount] = useState(10);
  // The box is a draft so the teacher can clear it and retype without the value
  // snapping back mid-keystroke; it is clamped on blur and before the test starts.
  const [countDraft, setCountDraft] = useState('10');
  const [decks, setDecks] = useState<TeacherDeck[]>(() => cachedTeacherDecks(owner));
  const [decksLoading, setDecksLoading] = useState(true);
  /** null while the account has not answered yet; the badge tells the teacher the truth. */
  const [sync, setSync] = useState<TeacherDeckSync | null>(null);
  // null = list, 'new' = a deck being built, a deck = that deck being edited.
  const [editing, setEditing] = useState<TeacherDeck | 'new' | null>(null);
  /** The deck whose "Test this deck" button opened the question-style dialog. */
  const [testingDeck, setTestingDeck] = useState<TeacherDeck | null>(null);
  /** Search and filter keep a shelf of up to 40 lists usable instead of a long scroll. */
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<DeckFilter>('all');
  /** The deck whose "Assign" button is opening the class picker. */
  const [assigning, setAssigning] = useState<string | null>(null);
  const [assign, setAssign] = useState<{ deck: TeacherDeck; classes: SchoolClass[] } | null>(null);
  /** deckId → how many live class assignments were built from it. */
  const [deckUsage, setDeckUsage] = useState<Record<string, number>>({});

  // The account owns its decks. The device cache paints first, then the account shelf
  // follows it live — a save or delete on another device lands here without a reload.
  useEffect(() => {
    let alive = true;
    setDecksLoading(true);
    // One explicit read as well as the stream: a stream that is waiting for the network
    // stays silent, and the badge would keep claiming "synced" while offline.
    void loadTeacherDecks(owner)
      .then((shelf) => {
        if (!alive) return;
        setDecks(shelf.decks);
        setSync(shelf.sync);
      })
      .finally(() => {
        if (alive) setDecksLoading(false);
      });
    const stop = watchTeacherDecks(owner, (shelf) => {
      if (!alive) return;
      setDecks(shelf.decks);
      setSync(shelf.sync);
      setDecksLoading(false);
    });
    // The cache is already on screen; never let a hung stream hide it behind a spinner.
    setDecksLoading(false);
    return () => {
      alive = false;
      stop();
    };
  }, [owner]);

  /** A failed read/write is retryable — the teacher should not have to reload the app. */
  const retrySync = () => {
    setDecksLoading(true);
    void loadTeacherDecks(owner)
      .then((shelf) => {
        setDecks(shelf.decks);
        setSync(shelf.sync);
      })
      .finally(() => setDecksLoading(false));
  };

  // Where each deck has been given. This is a hint on the card, so a class that cannot be
  // read is skipped instead of taking the whole shelf down with it — and it is only loaded
  // while the decks tab is open, because it costs a read per class assignment.
  useEffect(() => {
    if (!user || tab !== 'decks') {
      setDeckUsage({});
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const classes = await fetchTeacherClasses(user.uid);
        const lists = await Promise.all(
          classes.map((item) => fetchAssignments(item.id).catch(() => [])),
        );
        if (!alive) return;
        const counts: Record<string, number> = {};
        for (const list of lists) {
          for (const assignment of list) {
            if (!assignment.deckId || assignment.archivedAt) continue;
            counts[assignment.deckId] = (counts[assignment.deckId] ?? 0) + 1;
          }
        }
        setDeckUsage(counts);
      } catch {
        /* Usage is a hint; the shelf must not fail because a class could not be read. */
      }
    })();
    return () => {
      alive = false;
    };
  }, [user, tab]);

  // The shelf at a glance: how full it is, and what the search box is filtering.
  const totalWords = decks.reduce((sum, deck) => sum + deck.words.length, 0);
  const draftDeckCount = decks.filter((deck) => deckStatus(deck) === 'draft').length;
  const visibleDecks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return decks.filter((deck) => {
      if (filter === 'ready' && deckStatus(deck) !== 'ready') return false;
      if (filter === 'draft' && deckStatus(deck) !== 'draft') return false;
      if (!needle) return true;
      return (
        deck.name.toLowerCase().includes(needle) ||
        deck.words.some((word) => word.word.toLowerCase().includes(needle))
      );
    });
  }, [decks, filter, query]);

  /** The level's real pool — A1 has fewer usable words than the 300 ceiling. */
  const maxWords = countLevelWords(levelId);
  const draftCount = (): number =>
    Math.min(clampTestWords(countDraft === '' ? Number.NaN : Number(countDraft)), maxWords);

  // An empty box falls back to the last good count instead of silently jumping to the minimum.
  const planned = countDraft === '' ? Math.min(count, maxWords) : draftCount();

  const commitCount = (): number => {
    setCount(planned);
    setCountDraft(String(planned));
    return planned;
  };

  const chooseLevel = (next: TeacherLevelId) => {
    setLevelId(next);
    const cap = countLevelWords(next);
    const current = countDraft === '' ? count : Number(countDraft);
    if (Number.isFinite(current) && current > cap) {
      setCount(cap);
      setCountDraft(String(cap));
    }
  };

  // Building and testing a deck is free; keeping it needs an account, because a deck is a
  // thing the teacher expects to still be there next week. The dialog opens instead of a
  // silent failure, and the review keeps the words already typed.
  const handleSave = (deck: TeacherDeck): boolean => {
    if (!user) {
      onRequireSignIn();
      return false;
    }
    const isNew = !decks.some((item) => item.id === deck.id);
    if (isNew && decks.length >= MAX_DECKS) {
      toast(t.setup.deckLimit(MAX_DECKS), 'error');
      return false;
    }
    // The shelf updates on the spot and the account copy is written behind it, so a slow
    // network never keeps the editor open on a deck that is already safe on this device.
    setDecks((prev) => [deck, ...prev.filter((item) => item.id !== deck.id)]);
    setEditing(null);
    toast(t.setup.savedToast, 'success');
    void saveTeacherDeck(owner, deck)
      .then((list) => {
        setDecks(list);
        setSync('cloud');
      })
      .catch(() => {
        // The device copy is written first, so the deck survives — but say it did not
        // reach the account, otherwise it silently goes missing on the next device.
        setSync('error');
        toast(t.setup.syncFailed, 'error');
      });
    return true;
  };

  const handleDelete = async (deck: TeacherDeck) => {
    const ok = await confirmDialog(t.setup.deleteAsk(deck.name, deck.words.length), {
      confirmLabel: deleteLabel,
      destructive: true,
    });
    if (!ok) return;
    setDecks((prev) => prev.filter((item) => item.id !== deck.id));
    setEditing(null);
    try {
      setDecks(await deleteTeacherDeck(owner, deck.id));
      setSync('cloud');
      toast(t.setup.deletedToast, 'success');
    } catch {
      setSync('error');
      toast(t.setup.syncFailed, 'error');
    }
  };

  /** Teachers reuse last week's list with a few edits — a copy beats rebuilding it. */
  const handleDuplicate = (deck: TeacherDeck) => {
    if (!user) {
      onRequireSignIn();
      return;
    }
    if (decks.length >= MAX_DECKS) {
      toast(t.setup.deckLimit(MAX_DECKS), 'error');
      return;
    }
    const now = Date.now();
    const copy: TeacherDeck = {
      id: newTeacherDeckId(),
      name: t.setup.copyName(deck.name),
      words: deck.words.map((word) => ({ ...word })),
      createdAt: now,
      updatedAt: now,
      ...(deck.status ? { status: deck.status } : {}),
    };
    setDecks((prev) => [copy, ...prev]);
    toast(t.setup.duplicatedToast(copy.name), 'success');
    void saveTeacherDeck(owner, copy)
      .then((list) => {
        setDecks(list);
        setSync('cloud');
      })
      .catch(() => {
        setSync('error');
        toast(t.setup.syncFailed, 'error');
      });
  };

  /** A deck exists to be given to a class, so the picker opens straight from its card. */
  const handleAssign = async (deck: TeacherDeck) => {
    if (!user) {
      onRequireSignIn();
      return;
    }
    setAssigning(deck.id);
    try {
      const classes = await fetchTeacherClasses(user.uid);
      if (classes.length === 0) {
        toast(t.setup.assignNoClasses, 'error');
        return;
      }
      setAssign({ deck, classes });
    } catch {
      toast(t.setup.assignFailed, 'error');
    } finally {
      setAssigning(null);
    }
  };

  if (editing) {
    return (
      <TeacherDeckEditor
        // The editor seeds its draft from the deck once. Keying it by deck id guarantees
        // that a different deck always opens with its own name and words.
        key={editing === 'new' ? 'new' : editing.id}
        deck={editing === 'new' ? null : editing}
        onSave={handleSave}
        onCancel={() => setEditing(null)}
        onDelete={editing === 'new' ? undefined : handleDelete}
      />
    );
  }

  // Where the shelf actually is. Saying "saved to your account" while the write is
  // failing is what made teachers believe their lists travelled to another device.
  const syncLabel =
    sync === 'cloud'
      ? t.setup.syncCloud
      : sync === 'device'
        ? t.setup.syncDevice
        : sync === 'error'
          ? t.setup.syncError
          : t.setup.syncChecking;
  const syncDot =
    sync === 'cloud'
      ? 'bg-neon-green'
      : sync === 'device'
        ? 'bg-warning-yellow'
        : sync === 'error'
          ? 'bg-danger-red'
          : 'animate-pulse bg-muted-text';

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs leading-relaxed text-muted-text">
            {t.setup.subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-semibold text-muted-text hover:bg-cyber-purple/30 hover:text-light-text"
        >
          <Icon name="arrowLeft" size={16} />
          {t.dashboard}
        </button>
      </div>

      <div className="flex gap-1 rounded-lg border border-white/10 bg-dark-metal/40 p-1" role="tablist" aria-label={t.setup.sourceAria}>
        {([
          { id: 'level' as TabId, label: t.setup.tabs.level, emoji: '🎯' },
          { id: 'decks' as TabId, label: decks.length ? t.setup.tabs.decksCount(decks.length) : t.setup.tabs.decks, emoji: '🗂️' },
        ]).map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`min-h-[44px] flex-1 rounded-md px-3 text-sm font-semibold transition-colors ${
              tab === item.id
                ? 'bg-electric-blue/20 text-electric-blue'
                : 'text-muted-text hover:text-light-text'
            }`}
          >
            <span aria-hidden="true">{item.emoji}</span> {item.label}
          </button>
        ))}
      </div>

      {tab === 'level' ? (
        <>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t.setup.levelAria}>
            {TEACHER_LEVELS.map((level) => {
              const active = level.id === levelId;
              return (
                <button
                  key={level.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => chooseLevel(level.id)}
                  className={`flex min-h-[44px] flex-col items-start gap-0.5 rounded-lg border-2 p-3 text-left transition-colors ${
                    active
                      ? 'border-neon-green bg-neon-green/10'
                      : 'border-white/10 bg-dark-metal/40 hover:border-electric-blue/60'
                  }`}
                >
                  <span className={`text-sm font-bold ${active ? 'text-neon-green' : 'text-light-text'}`}>
                    <span aria-hidden="true">{level.emoji}</span> {level.id}
                  </span>
                  <span className="text-[0.7rem] leading-snug text-muted-text">{t.setup.levelTaglines[level.id]}</span>
                </button>
              );
            })}
          </div>

          <div>
            <label
              htmlFor="teacher-word-count"
              className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-widest text-muted-text"
            >
              {t.setup.wordsInTest}
            </label>
            <div className="flex items-center gap-2">
              <input
                id="teacher-word-count"
                type="number"
                inputMode="numeric"
                min={MIN_TEST_WORDS}
                max={maxWords}
                step={1}
                value={countDraft}
                onChange={(event) => setCountDraft(event.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                onBlur={() => commitCount()}
                className="futuristic-input min-h-[44px] w-24 px-3 py-2 text-center text-base font-semibold tabular-nums"
              />
              <span className="text-[0.7rem] text-muted-text">
                {t.setup.wordsInTestRange(MIN_TEST_WORDS, Math.min(MAX_TEST_WORDS, maxWords))}
              </span>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-text">
              {t.setup.modeTitle}
            </p>
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={t.setup.modeTitle}>
              {TEACHER_TEST_MODES.map((id) => {
                const active = id === mode;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setMode(id)}
                    className={`flex min-h-[44px] flex-col items-start gap-0.5 rounded-lg border-2 p-2.5 text-left transition-colors ${
                      active
                        ? 'border-electric-blue bg-electric-blue/10'
                        : 'border-white/10 bg-dark-metal/40 hover:border-electric-blue/60'
                    }`}
                  >
                    <span className={`text-xs font-bold ${active ? 'text-electric-blue' : 'text-light-text'}`}>
                      {t.setup.modes[id].label}
                    </span>
                    <span className="text-[0.7rem] leading-snug text-muted-text">{t.setup.modes[id].hint}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[0.7rem] text-muted-text">{t.setup.modeHint}</p>
          </div>

          <button
            type="button"
            onClick={() => onStartLevel(levelId, commitCount(), mode)}
            className="wc-btn wc-btn-primary min-h-[48px] w-full"
          >
            <Icon name="play" size={16} />
            {t.setup.startTest(levelId, planned)}
          </button>
          <p className="text-center text-[0.7rem] leading-relaxed text-muted-text">
            {t.setup.levelLocked(levelId)}
          </p>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${syncDot}`} />
              <p className="truncate text-[0.7rem] font-medium text-muted-text" role="status">
                {syncLabel}
              </p>
              {sync === 'error' && user && (
                <button
                  type="button"
                  onClick={retrySync}
                  disabled={decksLoading}
                  className="min-h-[44px] shrink-0 px-1.5 text-[0.7rem] font-semibold text-electric-blue disabled:opacity-50"
                >
                  {t.setup.syncRetry}
                </button>
              )}
            </div>
            {/* The empty state below already carries this action, so it only appears once
                there is a list to add to. */}
            {decks.length > 0 && (
              <button
                type="button"
                onClick={() => setEditing('new')}
                className="wc-btn wc-btn-secondary min-h-[44px] px-3"
              >
                <Icon name="save" size={16} />
                {t.setup.newDeck}
              </button>
            )}
          </div>

          {decks.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-text">
                {t.setup.shelfSummary(decks.length, MAX_DECKS, totalWords)}
              </p>
              {/* A short shelf needs no search box; a term's worth of decks does. */}
              {decks.length >= 5 && (
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t.setup.searchPlaceholder}
                  aria-label={t.setup.searchAria}
                  className="futuristic-input min-h-[44px] w-full px-3 py-2 text-sm"
                />
              )}
              {draftDeckCount > 0 && (
                <div
                  role="group"
                  aria-label={t.setup.filterAria}
                  className="flex gap-1 rounded-lg border border-white/10 bg-dark-metal/40 p-1"
                >
                  {([
                    { id: 'all' as DeckFilter, label: t.setup.filterAll },
                    { id: 'ready' as DeckFilter, label: t.setup.filterReady },
                    { id: 'draft' as DeckFilter, label: t.setup.filterDraft },
                  ]).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={filter === item.id}
                      onClick={() => setFilter(item.id)}
                      className={`min-h-[44px] flex-1 rounded-md px-2 text-xs font-semibold transition-colors ${
                        filter === item.id
                          ? 'bg-electric-blue/20 text-electric-blue'
                          : 'text-muted-text hover:text-light-text'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {decksLoading && decks.length === 0 ? (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 p-5">
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--hairline-strong)] border-t-electric-blue"
                aria-hidden="true"
              />
              <p className="text-xs text-muted-text">{loadingLabel}</p>
            </div>
          ) : decks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/15 p-5 text-center">
              <p className="text-sm font-semibold text-light-text">{t.setup.noDecksTitle}</p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-text">
                {t.setup.noDecksBody}
              </p>
              <button
                type="button"
                onClick={() => setEditing('new')}
                className="wc-btn wc-btn-primary mt-3 min-h-[44px] px-4"
              >
                {t.setup.buildFirstDeck}
              </button>
              {!user && (
                <p className="mx-auto mt-2 max-w-sm text-[0.7rem] leading-relaxed text-muted-text">
                  {t.setup.guestNote}
                </p>
              )}
            </div>
          ) : visibleDecks.length === 0 ? (
            <p className="rounded-lg border border-dashed border-white/15 p-5 text-center text-xs text-muted-text">
              {t.setup.noMatches}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {visibleDecks.map((deck) => (
                <li key={deck.id} className="rounded-lg border border-white/10 bg-dark-metal/40 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-light-text">
                        {deck.name}
                        {deckStatus(deck) === 'draft' && (
                          <span className="ml-1.5 rounded bg-warning-yellow/15 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-warning-yellow">
                            {t.setup.draftBadge}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-[0.7rem] text-muted-text">
                        {t.setup.deckMeta(deck.words.length, new Date(deck.updatedAt).toLocaleDateString(locale))}
                        {(deckUsage[deck.id] ?? 0) > 0 && (
                          <span className="ml-1.5 font-semibold text-electric-blue">
                            · {t.setup.usedIn(deckUsage[deck.id])}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(deck)}
                        className="flex h-11 w-11 items-center justify-center rounded-md text-muted-text hover:bg-electric-blue/20 hover:text-electric-blue"
                        aria-label={t.setup.editDeckAria(deck.name)}
                      >
                        <Icon name="pencil" size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(deck)}
                        className="flex h-11 w-11 items-center justify-center rounded-md text-muted-text hover:bg-neon-green/20 hover:text-neon-green"
                        aria-label={t.setup.duplicateDeckAria(deck.name)}
                      >
                        <Icon name="copy" size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(deck)}
                        className="flex h-11 w-11 items-center justify-center rounded-md text-muted-text hover:bg-danger-red/20 hover:text-danger-red"
                        aria-label={t.setup.deleteDeckAria(deck.name)}
                      >
                        <Icon name="ban" size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => onStartDeck(deck)}
                      className="wc-btn wc-btn-primary min-h-[44px] flex-1"
                    >
                      <Icon name="list" size={16} />
                      {t.setup.testDeck}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestingDeck(deck)}
                      className="wc-btn wc-btn-secondary min-h-[44px] flex-1"
                    >
                      <Icon name="play" size={16} />
                      {t.setup.startDeckTest}
                    </button>
                  </div>
                  {/* Study actions stay together; giving the list to a class is a separate
                      step, so it gets its own row instead of a third crowded button. */}
                  {deckStatus(deck) === 'ready' && deck.words.length >= 3 && (
                    <button
                      type="button"
                      onClick={() => void handleAssign(deck)}
                      disabled={assigning === deck.id}
                      className="wc-btn wc-btn-secondary mt-2 min-h-[44px] w-full text-sm disabled:opacity-50"
                    >
                      <Icon name="folder" size={16} />
                      {t.setup.assignDeck}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* The class picker opens with this deck already chosen; the teacher only sets the
          class, the due date and how the words are asked. */}
      {assign && (
        <ClassAssignmentEditor
          classes={assign.classes.map((item) => ({ id: item.id, name: item.name }))}
          activeClassId={assign.classes[0].id}
          initialDeckId={assign.deck.id}
          onCancel={() => setAssign(null)}
          onCreate={async (input, classIds) => {
            try {
              await Promise.all(classIds.map((classId) => createAssignment(classId, input)));
              const deckId = assign.deck.id;
              setDeckUsage((prev) => ({
                ...prev,
                [deckId]: (prev[deckId] ?? 0) + classIds.length,
              }));
              setAssign(null);
              toast(
                classIds.length > 1
                  ? t.setup.assignedMany(classIds.length)
                  : t.setup.assignedOne,
                'success',
              );
            } catch {
              toast(t.setup.assignFailed, 'error');
            }
          }}
        />
      )}

      <TeacherModeDialog
        isOpen={testingDeck !== null}
        wordCount={testingDeck?.words.length ?? 0}
        onCancel={() => setTestingDeck(null)}
        onStart={(mode) => {
          const deck = testingDeck;
          setTestingDeck(null);
          if (deck) onTestDeck(deck, mode);
        }}
      />
    </div>
  );
};
