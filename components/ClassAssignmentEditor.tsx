import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { toast } from './Feedback';
import { useAuth } from '../contexts/AuthContext';
import { useT } from '../i18n/useT';
import {
  MAX_ASSIGNMENT_WORDS,
  MAX_QUIZ_QUESTIONS,
  type ClassKind,
  type NewAssignment,
  type QuizQuestion,
  type VocabWord,
} from '../services/classes';
import {
  TEACHER_LEVELS,
  TEACHER_TEST_MODES,
  TEACHER_WORD_COUNTS,
  buildLevelTest,
  countLevelWords,
  deckStatus,
  deckWarnings,
  loadTeacherDecks,
  orderTeacherModes,
  parseTeacherWords,
  type TeacherDeck,
  type TeacherLevelId,
  type TeacherTestMode,
} from '../services/teacherDeck';

interface ClassAssignmentEditorProps {
  /** Every class the teacher owns, so one piece of work can go to several at once. */
  classes: { id: string; name: string }[];
  /** The class whose tab is open — selected by default. */
  activeClassId: string;
  onCancel: () => void;
  onCreate: (input: NewAssignment, classIds: string[]) => Promise<void>;
}

const emptyQuestion = (): QuizQuestion => ({ prompt: '', choices: ['', '', '', ''], answer: 0 });

/** End of the chosen day, local time — a due date of "today" still means today. */
const dueDateToMs = (value: string): number | null => {
  if (!value) return null;
  const parsed = new Date(`${value}T23:59:59`).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

const LABEL = 'text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--wn-9)]';
const SECTION = 'flex flex-col gap-2 rounded-[var(--r-md)] border border-[var(--wn-4)] p-3';

interface DialogProps {
  labelledBy: string;
  onClose: () => void;
  /** Wider card for the form; the type picker and the parts sheet stay narrow. */
  wide?: boolean;
  children: React.ReactNode;
}

/**
 * One modal shell for all three steps. A phone gets a full-height sheet that rises from
 * the bottom edge; a tablet or laptop gets a centred card capped at 92dvh. Only the body
 * scrolls, so the title and the Assign button never leave the screen.
 */
const Dialog: React.FC<DialogProps> = ({ labelledBy, onClose, wide, children }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  // Portalled to <body>: the class panel sits inside an animated card, and a transformed
  // ancestor would trap `fixed` inside that card instead of the viewport.
  return createPortal(
    <div
      className="fixed inset-0 z-[var(--z-dialog)] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClick={onClose}
    >
      <div
        className={`wc-theme flex h-[100dvh] w-full flex-col overflow-hidden bg-[var(--surface-2)] shadow-[var(--elev-4)] sm:h-auto sm:border sm:border-[var(--hairline-strong)] sm:rounded-[var(--r-xl)] ${
          wide ? 'sm:max-h-[92dvh] sm:max-w-3xl' : 'sm:max-h-[88dvh] sm:max-w-lg'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
};

/**
 * Builds one assignment. Creating work now happens in two short layers instead of one
 * long page: first the teacher picks the kind (word set, quiz, writing), then only the
 * fields that kind needs are shown. The word set keeps its per-part settings — which
 * test styles, in which order — in their own sheet, so the form itself stays a single
 * screen on a phone, a tablet and a laptop alike.
 */
export const ClassAssignmentEditor: React.FC<ClassAssignmentEditorProps> = ({
  classes,
  activeClassId,
  onCancel,
  onCreate,
}) => {
  const t = useT('myClass');
  const common = useT('common');
  const teacherT = useT('teacher');
  const { user } = useAuth();
  const owner = user?.uid ?? 'guest';

  const kindTabs: { id: ClassKind; label: string; icon: 'type' | 'list' | 'pencil'; hint: string }[] = [
    {
      id: 'vocabulary',
      label: t.kinds.vocabulary,
      icon: 'type',
      hint: t.editor.kindHints.vocabulary,
    },
    { id: 'quiz', label: t.kinds.quiz, icon: 'list', hint: t.editor.kindHints.quiz },
    { id: 'writing', label: t.kinds.writing, icon: 'pencil', hint: t.editor.kindHints.writing },
  ];

  /** 'pick' is the small type chooser; 'form' is the modal for the chosen kind. */
  const [step, setStep] = useState<'pick' | 'form'>('pick');
  const [kind, setKind] = useState<ClassKind>('vocabulary');
  const [partsOpen, setPartsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [due, setDue] = useState('');
  const [passScore, setPassScore] = useState(80);
  const [busy, setBusy] = useState(false);
  const [targets, setTargets] = useState<string[]>([activeClassId]);

  const toggleTarget = (classId: string) =>
    setTargets((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId],
    );

  // vocabulary
  const [source, setSource] = useState<'level' | 'deck' | 'paste'>('level');
  const [levelId, setLevelId] = useState<TeacherLevelId>('A1');
  const [count, setCount] = useState(10);
  const [modes, setModes] = useState<TeacherTestMode[]>(['listen']);
  const [deckId, setDeckId] = useState('');
  const [pasted, setPasted] = useState('');
  // Only finished decks can be assigned; drafts stay in My decks until the teacher is ready.
  // The shelf lives on the teacher's account, so it arrives a moment after the tab opens.
  const [decks, setDecks] = useState<TeacherDeck[]>([]);
  useEffect(() => {
    let alive = true;
    void loadTeacherDecks(owner).then((list) => {
      if (alive) setDecks(list.filter((deck) => deckStatus(deck) === 'ready'));
    });
    return () => {
      alive = false;
    };
  }, [owner]);

  // quiz
  const [questions, setQuestions] = useState<QuizQuestion[]>([emptyQuestion()]);

  // writing
  const [prompt, setPrompt] = useState('');
  const [minWords, setMinWords] = useState(60);

  const pastedWords = useMemo(() => parseTeacherWords(pasted), [pasted]);
  const pastedWarnings = useMemo(() => deckWarnings(pastedWords), [pastedWords]);

  /** The level's real pool — the buttons must not promise 30 words for a level of 12. */
  const poolCap = countLevelWords(levelId);
  const levelCount = Math.min(count, poolCap);

  const orderedModes = useMemo(() => orderTeacherModes(modes), [modes]);

  const words = useMemo<VocabWord[]>(() => {
    if (kind !== 'vocabulary') return [];
    if (source === 'level') {
      return buildLevelTest(levelId, levelCount).map((word) => ({ term: word.word, gloss: word.meaning }));
    }
    if (source === 'deck') {
      const deck = decks.find((item) => item.id === deckId);
      return deck
        ? deck.words
            .slice(0, MAX_ASSIGNMENT_WORDS)
            .map((word) => ({ term: word.word, gloss: word.meaning }))
        : [];
    }
    return pastedWords
      .slice(0, MAX_ASSIGNMENT_WORDS)
      .map((word) => ({ term: word.word, gloss: word.meaning }));
  }, [kind, source, levelId, levelCount, decks, deckId, pastedWords]);

  const validQuestion = (question: QuizQuestion) =>
    question.prompt.trim().length > 0 && question.choices.filter((choice) => choice.trim()).length === 4;

  const readyQuestions = questions.filter(validQuestion);

  const problem = (): string | null => {
    if (!title.trim()) return t.editor.problems.title;
    if (kind === 'vocabulary') {
      if (words.length < 3) return t.editor.problems.tooFewWords;
      if (words.some((word) => !word.gloss.trim())) return t.editor.problems.missingMeaning;
      if (source === 'deck' && !deckId) return t.editor.problems.pickDeck;
    }
    if (kind === 'quiz') {
      if (!readyQuestions.length) return t.editor.problems.noQuestions;
    }
    if (kind === 'writing' && !prompt.trim()) return t.editor.problems.noPrompt;
    return null;
  };

  const handleCreate = async () => {
    const message = problem();
    if (message) {
      toast(message, 'error');
      return;
    }
    if (!targets.length) {
      toast(t.editor.pickClass, 'error');
      return;
    }
    setBusy(true);
    try {
      await onCreate({
        kind,
        modes: kind === 'vocabulary' ? orderedModes : undefined,
        title,
        instructions,
        dueAt: dueDateToMs(due),
        passScore: kind === 'writing' ? null : passScore,
        words: kind === 'vocabulary' ? words : [],
        questions: kind === 'quiz' ? readyQuestions.map((question) => ({
          prompt: question.prompt.trim(),
          choices: question.choices.map((choice) => choice.trim()),
          answer: question.answer,
        })) : [],
        prompt: kind === 'writing' ? prompt : '',
        minWords,
      }, targets);
    } finally {
      setBusy(false);
    }
  };

  const updateQuestion = (index: number, patch: Partial<QuizQuestion>) => {
    setQuestions((prev) => prev.map((item, at) => (at === index ? { ...item, ...patch } : item)));
  };

  const updateChoice = (index: number, choiceIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((item, at) =>
        at === index
          ? { ...item, choices: item.choices.map((choice, c) => (c === choiceIndex ? value : choice)) }
          : item,
      ),
    );
  };

  const toggleMode = (id: TeacherTestMode) =>
    setModes((current) => {
      if (!current.includes(id)) return orderTeacherModes([...current, id]);
      // One style must remain, otherwise there is no test to run.
      return current.length === 1 ? current : current.filter((item) => item !== id);
    });

  /** Escape, the backdrop and the X all land here; the parts sheet closes first. */
  const closeForm = () => {
    if (partsOpen) {
      setPartsOpen(false);
      return;
    }
    onCancel();
  };

  if (step === 'pick') {
    return (
      <Dialog labelledBy="assignmentPickTitle" onClose={onCancel}>
        <header className="flex items-start justify-between gap-2 border-b border-[var(--wn-4)] px-4 py-3">
          <div className="min-w-0">
            <h2 id="assignmentPickTitle" className="text-base font-bold text-[var(--wn-12)]">
              {t.editor.title}
            </h2>
            <p className="text-xs leading-snug text-[var(--wn-9)]">{t.editor.pickHint}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="wc-icon-btn h-9 w-9 shrink-0"
            aria-label={t.editor.closeAria}
          >
            <Icon name="close" size={16} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-2" role="group" aria-label={t.editor.typeAria}>
            {kindTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setKind(tab.id);
                  setStep('form');
                }}
                className="group flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--wn-4)] p-3 text-left transition-colors hover:border-electric-blue/60 hover:bg-electric-blue/5"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--wn-3)] text-[var(--wn-11)]">
                  <Icon name={tab.icon} size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-[var(--wn-12)]">{tab.label}</span>
                  <span className="block text-xs leading-snug text-[var(--wn-9)]">{tab.hint}</span>
                </span>
                <Icon name="arrowRight" size={16} />
              </button>
            ))}
          </div>
        </div>

        <footer className="border-t border-[var(--wn-4)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">
          <button type="button" onClick={onCancel} className="wc-btn wc-btn-secondary min-h-[44px] w-full sm:w-auto">
            {common.cancel}
          </button>
        </footer>
      </Dialog>
    );
  }

  const delivery = (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className={LABEL}>
          {t.editor.noteLabel} <span className="normal-case text-[var(--wn-8)]">{t.editor.optional}</span>
        </span>
        <textarea
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          rows={2}
          placeholder={t.editor.notePlaceholder}
          className="futuristic-input w-full px-3 py-2 text-sm"
        />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className={LABEL}>{t.editor.dueLabel}</span>
          <input
            type="date"
            value={due}
            onChange={(event) => setDue(event.target.value)}
            className="futuristic-input min-h-[44px] w-full px-3 text-sm"
          />
        </label>
        {kind === 'writing' ? (
          <label className="flex flex-col gap-1">
            <span className={LABEL}>{t.editor.minWordsLabel}</span>
            <input
              type="number"
              min={20}
              max={400}
              step={10}
              value={minWords}
              onChange={(event) => setMinWords(Number(event.target.value))}
              className="futuristic-input min-h-[44px] w-full px-3 text-sm"
            />
          </label>
        ) : (
          <label className="flex flex-col gap-1">
            <span className={LABEL}>{t.editor.passLineLabel(passScore)}</span>
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={passScore}
              onChange={(event) => setPassScore(Number(event.target.value))}
              className="h-11 w-full accent-neon-green"
              aria-label={t.editor.passLineAria}
            />
          </label>
        )}
      </div>

      {/* One piece of work often belongs to several rooms at once, so the class
          list is part of the form rather than something chosen beforehand. */}
      <div className="flex flex-col gap-1.5">
        <span className={LABEL}>{t.editor.classesLabel}</span>
        <div className="flex flex-wrap gap-1.5">
          {classes.map((item) => {
            const on = targets.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleTarget(item.id)}
                className={`min-h-[44px] rounded-full border px-3 text-xs font-semibold transition-colors ${
                  on
                    ? 'border-neon-green/60 bg-neon-green/10 text-neon-green'
                    : 'border-[var(--wn-4)] text-[var(--wn-10)] hover:border-[var(--wn-6)]'
                }`}
              >
                {item.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Dialog labelledBy="assignmentFormTitle" onClose={closeForm} wide>
        <header className="flex items-center gap-1 border-b border-[var(--wn-4)] px-2 py-2 sm:px-3">
          <button
            type="button"
            onClick={() => setStep('pick')}
            className="wc-icon-btn h-10 w-10 shrink-0"
            aria-label={t.editor.changeTypeAria}
          >
            <Icon name="arrowLeft" size={16} />
          </button>
          <div className="min-w-0 flex-1">
            <h2 id="assignmentFormTitle" className="truncate text-sm font-bold text-[var(--wn-12)]">
              {t.kinds[kind]}
            </h2>
            <p className="truncate text-[0.7rem] text-[var(--wn-9)]">{t.editor.kindHints[kind]}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="wc-icon-btn h-10 w-10 shrink-0"
            aria-label={t.editor.closeAria}
          >
            <Icon name="close" size={16} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          <label className="mb-4 flex flex-col gap-1">
            <span className={LABEL}>{t.editor.titleLabel}</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={
                kind === 'writing' ? t.editor.titlePlaceholderWriting : t.editor.titlePlaceholder
              }
              className="futuristic-input min-h-[44px] w-full px-3 text-sm"
            />
          </label>

          {/* Words on the left, delivery on the right at laptop width. On a phone the
              single column runs title → words → note, due and classes. */}
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_19rem]">
            <div className="flex flex-col gap-3">
              {kind === 'vocabulary' && (
                <>
                  <section className={SECTION}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={LABEL}>{t.editor.wordsTitle}</span>
                      <span className="text-[0.7rem] tabular-nums text-[var(--wn-9)]">
                        {t.editor.setSummary(words.length, orderedModes.length)}
                      </span>
                    </div>

                    <div className="flex rounded-[var(--r-md)] bg-[var(--wn-2)] p-1">
                      {([
                        ['level', t.editor.source.level],
                        ['deck', t.editor.source.deck],
                        ['paste', t.editor.source.paste],
                      ] as const).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setSource(id)}
                          className={`min-h-[40px] flex-1 rounded-[calc(var(--r-md)-2px)] px-2 text-xs font-semibold transition-colors ${
                            source === id
                              ? 'bg-[var(--surface-2)] text-[var(--wn-12)] shadow-sm'
                              : 'text-[var(--wn-9)] hover:text-[var(--wn-11)]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {source === 'level' && (
                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-4 gap-1.5">
                          {TEACHER_LEVELS.map((level) => (
                            <button
                              key={level.id}
                              type="button"
                              onClick={() => {
                                setLevelId(level.id);
                                setCount(Math.min(count, countLevelWords(level.id)));
                              }}
                              className={`min-h-[44px] rounded-md border text-sm font-bold transition-colors ${
                                levelId === level.id
                                  ? 'border-electric-blue bg-electric-blue/15 text-electric-blue'
                                  : 'border-[var(--wn-4)] text-[var(--wn-10)]'
                              }`}
                            >
                              {level.id}
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {TEACHER_WORD_COUNTS.map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setCount(Math.min(value, poolCap))}
                              disabled={value > poolCap}
                              className={`min-h-[44px] min-w-[44px] rounded-md border px-2 text-xs font-semibold ${
                                value > poolCap
                                  ? 'cursor-not-allowed border-[var(--wn-3)] text-[var(--wn-6)]'
                                  : count === value
                                    ? 'border-neon-green/60 text-neon-green'
                                    : 'border-[var(--wn-4)] text-[var(--wn-10)]'
                              }`}
                            >
                              {value}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {source === 'deck' && (
                      decks.length ? (
                        <select
                          value={deckId}
                          onChange={(event) => setDeckId(event.target.value)}
                          className="futuristic-input min-h-[44px] w-full px-3 text-sm"
                          aria-label={t.editor.deckAria}
                        >
                          <option value="">{t.editor.deckPlaceholder}</option>
                          {decks.map((deck) => (
                            <option key={deck.id} value={deck.id}>
                              {t.editor.deckOption(deck.name, deck.words.length)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-xs text-[var(--wn-9)]">{t.editor.noDecks}</p>
                      )
                    )}

                    {source === 'paste' && (
                      <div className="flex flex-col gap-1">
                        <textarea
                          value={pasted}
                          onChange={(event) => setPasted(event.target.value)}
                          rows={5}
                          placeholder={t.editor.pastePlaceholder}
                          className="futuristic-input w-full px-3 py-2 font-mono text-xs"
                        />
                        <p className="text-[0.7rem] text-[var(--wn-9)]">
                          {t.editor.pasteSummary(
                            pastedWords.length,
                            pastedWarnings.size,
                            MAX_ASSIGNMENT_WORDS,
                          )}
                        </p>
                      </div>
                    )}
                  </section>

                  <section className={SECTION}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={LABEL}>{t.editor.partsTitle}</span>
                      <button
                        type="button"
                        onClick={() => setPartsOpen(true)}
                        className="min-h-[36px] rounded-md px-2 text-xs font-semibold text-electric-blue hover:bg-electric-blue/10"
                      >
                        {t.editor.partsEdit}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {orderedModes.map((id, at) => (
                        <span
                          key={id}
                          className="rounded-full border border-electric-blue/40 bg-electric-blue/10 px-2.5 py-1 text-[0.7rem] font-semibold text-electric-blue"
                        >
                          {at + 1}. {teacherT.setup.modes[id].label}
                        </span>
                      ))}
                    </div>
                    <p className="text-[0.7rem] leading-snug text-[var(--wn-8)]">{t.editor.partsSummary}</p>
                  </section>
                </>
              )}

              {kind === 'quiz' && (
                <div className="flex flex-col gap-3">
                  {questions.map((question, index) => (
                    <div key={index} className={SECTION}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[0.7rem] font-bold uppercase tracking-wider text-[var(--wn-9)]">
                          {t.editor.question(index + 1)}
                        </span>
                        {questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setQuestions((prev) => prev.filter((_, at) => at !== index))}
                            className="wc-icon-btn h-9 w-9"
                            aria-label={t.editor.removeQuestionAria(index + 1)}
                          >
                            <Icon name="close" size={14} />
                          </button>
                        )}
                      </div>
                      <input
                        value={question.prompt}
                        onChange={(event) => updateQuestion(index, { prompt: event.target.value })}
                        placeholder={t.editor.questionPlaceholder}
                        className="futuristic-input min-h-[44px] w-full px-3 text-sm"
                      />
                      <div className="flex flex-col gap-1.5">
                        {question.choices.map((choice, choiceIndex) => (
                          <div key={choiceIndex} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateQuestion(index, { answer: choiceIndex })}
                              aria-label={t.editor.correctOptionAria(choiceIndex + 1)}
                              aria-pressed={question.answer === choiceIndex}
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                                question.answer === choiceIndex
                                  ? 'border-neon-green bg-neon-green/15 text-neon-green'
                                  : 'border-[var(--wn-4)] text-[var(--wn-9)]'
                              }`}
                            >
                              {String.fromCharCode(65 + choiceIndex)}
                            </button>
                            <input
                              value={choice}
                              onChange={(event) => updateChoice(index, choiceIndex, event.target.value)}
                              placeholder={t.editor.optionPlaceholder(String.fromCharCode(65 + choiceIndex))}
                              className="futuristic-input min-h-[44px] w-full px-3 text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {questions.length < MAX_QUIZ_QUESTIONS && (
                    <button
                      type="button"
                      onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}
                      className="wc-btn wc-btn-secondary min-h-[44px]"
                    >
                      <Icon name="plus" size={16} />
                      {t.editor.addQuestion}
                    </button>
                  )}
                </div>
              )}

              {kind === 'writing' && (
                <section className={SECTION}>
                  <span className={LABEL}>{t.editor.promptLabel}</span>
                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    rows={7}
                    placeholder={t.editor.promptPlaceholder}
                    className="futuristic-input w-full px-3 py-2 text-sm"
                  />
                </section>
              )}
            </div>

            <div>{delivery}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-[var(--wn-4)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">
          <button type="button" onClick={onCancel} className="wc-btn wc-btn-secondary min-h-[44px]">
            {common.cancel}
          </button>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={busy}
            className="wc-btn wc-btn-primary min-h-[44px] flex-1 disabled:opacity-50 sm:flex-none"
          >
            {busy ? t.editor.assigning : t.editor.assignTo(targets.length)}
          </button>
        </div>
      </Dialog>

      {/* Per-part settings live in their own sheet: the form keeps one line per part and
          stays readable, while the four styles get the room they need to explain themselves. */}
      {partsOpen && (
        <Dialog labelledBy="partsSheetTitle" onClose={() => setPartsOpen(false)}>
          <header className="flex items-start justify-between gap-2 border-b border-[var(--wn-4)] px-4 py-3">
            <div className="min-w-0">
              <h2 id="partsSheetTitle" className="text-base font-bold text-[var(--wn-12)]">
                {t.editor.partsTitle}
              </h2>
              <p className="text-xs leading-snug text-[var(--wn-9)]">{t.editor.modesHint}</p>
            </div>
            <button
              type="button"
              onClick={() => setPartsOpen(false)}
              className="wc-icon-btn h-9 w-9 shrink-0"
              aria-label={t.editor.closeAria}
            >
              <Icon name="close" size={16} />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {TEACHER_TEST_MODES.map((id) => {
                const active = orderedModes.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleMode(id)}
                    className={`flex min-h-[64px] items-start gap-2.5 rounded-[var(--r-md)] border p-3 text-left transition-colors ${
                      active
                        ? 'border-electric-blue bg-electric-blue/10'
                        : 'border-[var(--wn-4)] hover:border-[var(--wn-6)]'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[0.6rem] font-bold ${
                        active
                          ? 'border-electric-blue bg-electric-blue text-white'
                          : 'border-[var(--wn-6)] text-transparent'
                      }`}
                    >
                      {active ? orderedModes.indexOf(id) + 1 : ''}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block text-xs font-semibold ${
                          active ? 'text-electric-blue' : 'text-[var(--wn-11)]'
                        }`}
                      >
                        {teacherT.setup.modes[id].label}
                      </span>
                      <span className="block text-[0.65rem] leading-snug text-[var(--wn-8)]">
                        {teacherT.setup.modes[id].hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <footer className="flex items-center justify-between gap-2 border-t border-[var(--wn-4)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">
            <span className="text-[0.7rem] text-[var(--wn-9)]">
              {t.editor.setSummary(words.length, orderedModes.length)}
            </span>
            <button type="button" onClick={() => setPartsOpen(false)} className="wc-btn wc-btn-primary min-h-[44px]">
              {t.editor.partsDone}
            </button>
          </footer>
        </Dialog>
      )}
    </>
  );
};
