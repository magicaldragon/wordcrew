import React, { useMemo, useState } from 'react';
import { Icon } from './Icon';
import { toast } from './Feedback';
import { TeacherTestScreen } from './TeacherTestScreen';
import { useAuth } from '../contexts/AuthContext';
import {
  assignmentWords,
  percent,
  submitWork,
  type ClassAssignment,
  type ClassSubmission,
  type VocabAnswer,
  type WorkDetail,
} from '../services/classes';
import type { TeacherAnswer, TeacherSession } from '../services/teacherDeck';

interface ClassWorkScreenProps {
  classId: string;
  assignment: ClassAssignment;
  onClose: () => void;
}

const KIND_LABEL: Record<ClassAssignment['kind'], string> = {
  vocabulary: 'Word set',
  quiz: 'Multiple choice',
  writing: 'Writing',
};

const shuffle = <T,>(input: T[]): T[] => {
  const array = [...input];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

/**
 * A homework run: one assignment, one student, no scoreboard.
 *
 * The question order and the option order are shuffled per student, so two people sitting
 * together cannot trade "number 3 is B" — the letter means something different on each
 * screen. Nothing is revealed mid-test; the result screen is the only place answers appear,
 * which keeps the pass line honest when the student retries.
 */
export const ClassWorkScreen: React.FC<ClassWorkScreenProps> = ({ classId, assignment, onClose }) => {
  const { user, profile } = useAuth();
  const [roundKey, setRoundKey] = useState(0);
  const [result, setResult] = useState<ClassSubmission | null>(null);
  const [busy, setBusy] = useState(false);

  const student = user?.email
    ? { uid: user.uid, email: user.email, name: profile?.displayName || user.displayName || user.email }
    : null;

  const submit = async (detail: WorkDetail, score: number) => {
    if (!student || busy) return;
    setBusy(true);
    try {
      setResult(await submitWork({ classId, assignment, student, detail, score }));
    } catch {
      toast('Could not submit. Check your connection and try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="fixed inset-0 z-50 flex flex-col bg-dark-metal">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--hairline)] px-3 py-2">
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full text-muted-text hover:bg-danger-red/20 hover:text-danger-red"
          aria-label="Leave this assignment"
        >
          <Icon name="close" size={18} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-semibold text-light-text">{assignment.title}</p>
          <p className="text-[0.7rem] text-muted-text">
            {KIND_LABEL[assignment.kind]}
            {assignment.passScore !== null ? ` · pass ${assignment.passScore}%` : ''}
            {assignment.dueAt ? ` · due ${new Date(assignment.dueAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
          </p>
        </div>
        <span className="h-11 w-11" aria-hidden="true" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3 sm:px-4">{children}</div>
    </div>
  );

  if (!student) {
    return shell(
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <Icon name="lock" size={28} className="text-muted-text" />
        <p className="max-w-xs text-sm text-muted-text">
          Sign in with the email your teacher added to the class to do this assignment.
        </p>
        <button type="button" onClick={onClose} className="wc-btn wc-btn-secondary min-h-[44px]">
          Back
        </button>
      </div>,
    );
  }

  if (result) {
    return shell(
      <ResultView
        assignment={assignment}
        result={result}
        busy={busy}
        onRetry={() => {
          setResult(null);
          setRoundKey((key) => key + 1);
        }}
        onClose={onClose}
      />,
    );
  }

  if (assignment.kind === 'vocabulary') {
    const session: TeacherSession = {
      title: assignment.title,
      source: `${assignment.words.length} words · class assignment`,
      words: assignmentWords(assignment),
    };
    return shell(
      <TeacherTestScreen
        key={roundKey}
        session={session}
        onFinish={(answers: TeacherAnswer[]) => {
          const correct = answers.filter((answer) => answer.correct).length;
          const detail: WorkDetail = {
            answers: answers.map<VocabAnswer>((answer) => ({
              term: answer.word.word,
              gloss: answer.word.meaning,
              guess: answer.guess,
              correct: answer.correct,
            })),
            responses: [],
            text: '',
          };
          void submit(detail, percent(correct, answers.length));
        }}
        onExit={onClose}
      />,
    );
  }

  if (assignment.kind === 'quiz') {
    return shell(
      <QuizRunner
        key={roundKey}
        assignment={assignment}
        onSubmit={(responses, correct) =>
          void submit(
            { answers: [], responses, text: '' },
            percent(correct, assignment.questions.length),
          )
        }
      />,
    );
  }

  return shell(
    <WritingRunner
      key={roundKey}
      assignment={assignment}
      onSubmit={(text) => void submit({ answers: [], responses: [], text }, 0)}
    />,
  );
};

// ── Quiz ───────────────────────────────────────────────────────────────────

interface QuizRunnerProps {
  assignment: ClassAssignment;
  onSubmit: (responses: number[], correct: number) => void;
}

const QuizRunner: React.FC<QuizRunnerProps> = ({ assignment, onSubmit }) => {
  // The display order is fixed for this attempt: questions shuffled, options shuffled,
  // and every option remembers the index it had in the teacher's own list.
  const view = useMemo(
    () =>
      shuffle(assignment.questions).map((question) => {
        const order = shuffle(question.choices.map((_, index) => index));
        return {
          prompt: question.prompt,
          answer: question.answer,
          choices: order.map((original) => ({ text: question.choices[original], original })),
        };
      }),
    [assignment],
  );

  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<number[]>(() => view.map(() => -1));

  const question = view[index];
  const picked = responses[index];
  const last = index + 1 >= view.length;
  const answered = responses.filter((value) => value >= 0).length;

  const choose = (original: number) => {
    setResponses((prev) => prev.map((value, at) => (at === index ? original : value)));
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-muted-text">
        <span>
          Question {index + 1} / {view.length}
        </span>
        <span>{answered} answered</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        <span
          className="block h-full rounded-full bg-electric-blue transition-[width] duration-300"
          style={{ width: `${Math.round((answered / view.length) * 100)}%` }}
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 rounded-xl border-2 border-electric-blue/30 bg-dark-metal/60 p-4">
        <p className="text-lg font-semibold leading-snug text-light-text">{question.prompt}</p>
        <div className="flex flex-col gap-2">
          {question.choices.map((choice, at) => {
            const selected = picked === choice.original;
            return (
              <button
                key={choice.original}
                type="button"
                onClick={() => choose(choice.original)}
                aria-pressed={selected}
                className={`flex min-h-[52px] items-center gap-3 rounded-lg border px-3 text-left text-sm transition-colors ${
                  selected
                    ? 'border-electric-blue bg-electric-blue/15 text-light-text'
                    : 'border-[var(--hairline-strong)] text-muted-text hover:border-electric-blue/60 hover:text-light-text'
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                    selected ? 'border-electric-blue text-electric-blue' : 'border-[var(--hairline-strong)]'
                  }`}
                >
                  {String.fromCharCode(65 + at)}
                </span>
                {choice.text}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
          disabled={index === 0}
          className="wc-btn wc-btn-secondary min-h-[48px] flex-1 disabled:opacity-40"
        >
          Back
        </button>
        {last ? (
          <button
            type="button"
            onClick={() =>
              onSubmit(responses, responses.filter((response, at) => response === view[at].answer).length)
            }
            disabled={picked < 0}
            className="wc-btn wc-btn-primary min-h-[48px] flex-[2] disabled:opacity-40"
          >
            Submit answers
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIndex((value) => value + 1)}
            disabled={picked < 0}
            className="wc-btn wc-btn-primary min-h-[48px] flex-[2] disabled:opacity-40"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

// ── Writing ────────────────────────────────────────────────────────────────

interface WritingRunnerProps {
  assignment: ClassAssignment;
  onSubmit: (text: string) => void;
}

const countWords = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

const WritingRunner: React.FC<WritingRunnerProps> = ({ assignment, onSubmit }) => {
  const [text, setText] = useState('');
  const words = countWords(text);
  const short = words < assignment.minWords;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-3">
      <div className="rounded-xl border border-[var(--hairline-strong)] bg-dark-metal/60 p-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-electric-blue">Prompt</p>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-light-text">{assignment.prompt}</p>
      </div>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={10}
        placeholder="Write your answer here…"
        className="futuristic-input min-h-[14rem] w-full flex-1 px-3 py-2 text-sm leading-relaxed"
      />
      <div className="flex items-center justify-between text-xs">
        <span className={short ? 'text-warning-yellow' : 'text-neon-green'}>
          {words} / {assignment.minWords} words
        </span>
        <span className="text-muted-text">Your teacher grades this one.</span>
      </div>
      <button
        type="button"
        onClick={() => onSubmit(text)}
        disabled={short}
        className="wc-btn wc-btn-primary min-h-[48px] w-full disabled:opacity-40"
      >
        {short ? `Write ${assignment.minWords - words} more words` : 'Submit to my teacher'}
      </button>
    </div>
  );
};

// ── Result ─────────────────────────────────────────────────────────────────

interface ResultViewProps {
  assignment: ClassAssignment;
  result: ClassSubmission;
  busy: boolean;
  onRetry: () => void;
  onClose: () => void;
}

const ResultView: React.FC<ResultViewProps> = ({ assignment, result, busy, onRetry, onClose }) => {
  if (assignment.kind === 'writing') {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-electric-blue/15 text-electric-blue">
          <Icon name="check" size={30} />
        </span>
        <p className="text-xl font-bold text-light-text">Submitted</p>
        <p className="max-w-sm text-sm text-muted-text">
          Your teacher will read it and send a score back. You can open this assignment again to
          see the feedback.
        </p>
        {result.attempts > 1 && (
          <p className="text-xs text-muted-text">Attempt {result.attempts}</p>
        )}
        <button type="button" onClick={onClose} className="wc-btn wc-btn-primary min-h-[48px] w-full max-w-xs">
          Back to My Class
        </button>
      </div>
    );
  }

  const passLine = assignment.passScore ?? 0;
  const passed = result.passed;
  const missed = result.detail.answers.filter((answer) => !answer.correct);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 text-center">
      <span
        className={`flex h-16 w-16 items-center justify-center rounded-full ${
          passed ? 'bg-neon-green/15 text-neon-green' : 'bg-warning-yellow/15 text-warning-yellow'
        }`}
      >
        <Icon name={passed ? 'check' : 'rotate'} size={30} />
      </span>
      <p className="text-4xl font-bold tabular-nums text-light-text">{result.score}%</p>
      <p className={`text-sm font-bold ${passed ? 'text-neon-green' : 'text-warning-yellow'}`}>
        {passed ? 'Passed' : `Pass line is ${passLine}%`}
      </p>
      <p className="text-xs text-muted-text">
        Attempt {result.attempts} · {Math.max(0, result.detail.answers.length || assignment.questions.length)} questions
      </p>

      {missed.length > 0 && (
        <div className="w-full rounded-md border border-[var(--hairline-strong)] bg-dark-metal/60 p-3 text-left">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-danger-red">
            Worth another look
          </p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {missed.slice(0, 8).map((answer) => (
              <li key={answer.term} className="text-xs text-light-text">
                {answer.term}
                <span className="text-muted-text"> · {answer.gloss}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex w-full flex-col gap-2 sm:flex-row">
        {!passed && (
          <button
            type="button"
            onClick={onRetry}
            disabled={busy}
            className="wc-btn wc-btn-secondary min-h-[48px] flex-1 disabled:opacity-50"
          >
            Try again
          </button>
        )}
        <button type="button" onClick={onClose} className="wc-btn wc-btn-primary min-h-[48px] flex-1">
          Back to My Class
        </button>
      </div>
    </div>
  );
};
