import React, { useMemo, useState } from 'react';
import { Icon } from './Icon';
import { toast } from './Feedback';
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
  TEACHER_WORD_COUNTS,
  buildLevelTest,
  deckWarnings,
  parseTeacherWords,
  readTeacherDecks,
  type TeacherLevelId,
} from '../services/teacherDeck';

interface ClassAssignmentEditorProps {
  onCancel: () => void;
  onCreate: (input: NewAssignment) => Promise<void>;
}

const emptyQuestion = (): QuizQuestion => ({ prompt: '', choices: ['', '', '', ''], answer: 0 });

/** End of the chosen day, local time — a due date of "today" still means today. */
const dueDateToMs = (value: string): number | null => {
  if (!value) return null;
  const parsed = new Date(`${value}T23:59:59`).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Builds one assignment. The three kinds share the same shell — title, note, due date —
 * and differ only in the body, so a teacher learns the screen once.
 */
export const ClassAssignmentEditor: React.FC<ClassAssignmentEditorProps> = ({ onCancel, onCreate }) => {
  const t = useT('myClass');
  const common = useT('common');

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

  const [kind, setKind] = useState<ClassKind>('vocabulary');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [due, setDue] = useState('');
  const [passScore, setPassScore] = useState(80);
  const [busy, setBusy] = useState(false);

  // vocabulary
  const [source, setSource] = useState<'level' | 'deck' | 'paste'>('level');
  const [levelId, setLevelId] = useState<TeacherLevelId>('A1');
  const [count, setCount] = useState(10);
  const [deckId, setDeckId] = useState('');
  const [pasted, setPasted] = useState('');
  const decks = useMemo(() => readTeacherDecks(), []);

  // quiz
  const [questions, setQuestions] = useState<QuizQuestion[]>([emptyQuestion()]);

  // writing
  const [prompt, setPrompt] = useState('');
  const [minWords, setMinWords] = useState(60);

  const pastedWords = useMemo(() => parseTeacherWords(pasted), [pasted]);
  const pastedWarnings = useMemo(() => deckWarnings(pastedWords), [pastedWords]);

  const words = useMemo<VocabWord[]>(() => {
    if (kind !== 'vocabulary') return [];
    if (source === 'level') {
      return buildLevelTest(levelId, count).map((word) => ({ term: word.word, gloss: word.meaning }));
    }
    if (source === 'deck') {
      const deck = decks.find((item) => item.id === deckId);
      return deck ? deck.words.map((word) => ({ term: word.word, gloss: word.meaning })) : [];
    }
    return pastedWords
      .slice(0, MAX_ASSIGNMENT_WORDS)
      .map((word) => ({ term: word.word, gloss: word.meaning }));
  }, [kind, source, levelId, count, decks, deckId, pastedWords]);

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
    setBusy(true);
    try {
      await onCreate({
        kind,
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
      });
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onCancel} className="wc-icon-btn" aria-label={t.editor.backAria}>
          <Icon name="arrowLeft" size={16} />
        </button>
        <h3 className="text-base font-bold text-[var(--wn-12)]">{t.editor.title}</h3>
        <span className="w-11" />
      </div>

      <div className="grid grid-cols-3 gap-2" role="tablist" aria-label={t.editor.typeAria}>
        {kindTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={kind === tab.id}
            onClick={() => setKind(tab.id)}
            className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-[var(--r-md)] border px-2 text-xs font-semibold transition-colors ${
              kind === tab.id
                ? 'border-neon-green/60 bg-neon-green/10 text-neon-green'
                : 'border-[var(--wn-4)] text-[var(--wn-10)] hover:border-[var(--wn-6)]'
            }`}
          >
            <Icon name={tab.icon} size={14} />
            {tab.label}
          </button>
        ))}
      </div>
      <p className="-mt-2 text-xs text-[var(--wn-9)]">{kindTabs.find((tab) => tab.id === kind)?.hint}</p>

      <label className="flex flex-col gap-1">
        <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--wn-9)]">
          {t.editor.titleLabel}
        </span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={
            kind === 'writing' ? t.editor.titlePlaceholderWriting : t.editor.titlePlaceholder
          }
          className="futuristic-input min-h-[44px] w-full px-3 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--wn-9)]">
          {t.editor.noteLabel}{' '}
          <span className="normal-case text-[var(--wn-8)]">{t.editor.optional}</span>
        </span>
        <textarea
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          rows={2}
          placeholder={t.editor.notePlaceholder}
          className="futuristic-input w-full px-3 py-2 text-sm"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--wn-9)]">
            {t.editor.dueLabel}
          </span>
          <input
            type="date"
            value={due}
            onChange={(event) => setDue(event.target.value)}
            className="futuristic-input min-h-[44px] w-full px-3 text-sm"
          />
        </label>
        {kind !== 'writing' ? (
          <label className="flex flex-col gap-1">
            <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--wn-9)]">
              {t.editor.passLineLabel(passScore)}
            </span>
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
        ) : (
          <label className="flex flex-col gap-1">
            <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--wn-9)]">
              {t.editor.minWordsLabel}
            </span>
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
        )}
      </div>

      {kind === 'vocabulary' && (
        <div className="flex flex-col gap-3 rounded-[var(--r-md)] border border-[var(--wn-4)] p-3">
          <div className="flex gap-1.5">
            {([
              ['level', t.editor.source.level],
              ['deck', t.editor.source.deck],
              ['paste', t.editor.source.paste],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setSource(id)}
                className={`min-h-[44px] flex-1 rounded-md px-2 text-xs font-semibold transition-colors ${
                  source === id ? 'bg-[var(--wn-3)] text-[var(--wn-12)]' : 'text-[var(--wn-9)] hover:text-[var(--wn-11)]'
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
                    onClick={() => setLevelId(level.id)}
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
                    onClick={() => setCount(value)}
                    className={`min-h-[44px] min-w-[44px] rounded-md border px-2 text-xs font-semibold ${
                      count === value
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
              <p className="text-xs text-[var(--wn-9)]">
                {t.editor.pasteSummary(
                  pastedWords.length,
                  pastedWarnings.size,
                  MAX_ASSIGNMENT_WORDS,
                )}
              </p>
            </div>
          )}

          <p className="text-xs text-[var(--wn-9)]">{t.editor.setSummary(words.length)}</p>
        </div>
      )}

      {kind === 'quiz' && (
        <div className="flex flex-col gap-3">
          {questions.map((question, index) => (
            <div key={index} className="flex flex-col gap-2 rounded-[var(--r-md)] border border-[var(--wn-4)] p-3">
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
        <div className="flex flex-col gap-2 rounded-[var(--r-md)] border border-[var(--wn-4)] p-3">
          <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--wn-9)]">
            {t.editor.promptLabel}
          </span>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={4}
            placeholder={t.editor.promptPlaceholder}
            className="futuristic-input w-full px-3 py-2 text-sm"
          />
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-[var(--wn-4)] pt-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="wc-btn wc-btn-secondary min-h-[44px]">
          {common.cancel}
        </button>
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={busy}
          className="wc-btn wc-btn-primary min-h-[44px] disabled:opacity-50"
        >
          {busy ? t.editor.assigning : t.editor.assign}
        </button>
      </div>
    </div>
  );
};
