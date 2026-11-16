import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { confirmDialog, toast } from './Feedback';
import { TeacherDeckEditor } from './TeacherDeckEditor';
import { TeacherModeDialog } from './TeacherModeDialog';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../i18n/useLocale';
import { useT } from '../i18n/useT';
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
  saveTeacherDeck,
  TEACHER_LEVELS,
  TEACHER_TEST_MODES,
  type TeacherDeck,
  type TeacherLevelId,
  type TeacherTestMode,
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
  // null = list, 'new' = a deck being built, a deck = that deck being edited.
  const [editing, setEditing] = useState<TeacherDeck | 'new' | null>(null);
  /** The deck whose "Test this deck" button opened the question-style dialog. */
  const [testingDeck, setTestingDeck] = useState<TeacherDeck | null>(null);

  // The account owns its decks. The device cache paints first, the account shelf replaces
  // it a moment later — signing in (even mid-edit) reloads that shelf.
  useEffect(() => {
    let alive = true;
    setDecksLoading(true);
    void loadTeacherDecks(owner)
      .then((list) => {
        if (alive) setDecks(list);
      })
      .finally(() => {
        if (alive) setDecksLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [owner]);

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
      .then(setDecks)
      .catch(() => toast(t.setup.syncFailed, 'error'));
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
      toast(t.setup.deletedToast, 'success');
    } catch {
      toast(t.setup.syncFailed, 'error');
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
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-text">
              {t.setup.savedOnDevice}
            </p>
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
          ) : (
            <ul className="flex flex-col gap-2">
              {decks.map((deck) => (
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
                </li>
              ))}
            </ul>
          )}
        </>
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
