import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { toast } from './Feedback';
import { FlashcardReviewScreen } from './FlashcardReviewScreen';
import { QuizWork } from './work/QuizWork';
import { VocabularyWork } from './work/VocabularyWork';
import { WritingWork } from './work/WritingWork';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../i18n/useLocale';
import { useT } from '../i18n/useT';
import {
  assignmentWords,
  fetchSubmissions,
  handInWork,
  percent,
  submitWork,
  type ClassAssignment,
  type ClassSubmission,
  type VocabAnswer,
  type WorkDetail,
} from '../services/classes';
import type { TeacherAnswer, TeacherDeck } from '../services/teacherDeck';

interface ClassWorkScreenProps {
  classId: string;
  assignment: ClassAssignment;
  onClose: () => void;
}

/**
 * A homework run: one assignment, one student, no scoreboard.
 *
 * This screen is only the shell — heading, submission, and the result. The work itself
 * belongs to a tool: VocabularyWork is Vocabulary Check (Tool 1), QuizWork is multiple
 * choice, WritingWork is the essay. Adding a fourth tool later means adding one module and
 * one branch here, not touching the other three.
 *
 * Finishing a round does not hand anything to the teacher. Every attempt is saved as a
 * pending submission the student can beat, and only the Submit button — or the deadline —
 * turns the best attempt in. That is the difference between practising and being graded.
 */
export const ClassWorkScreen: React.FC<ClassWorkScreenProps> = ({ classId, assignment, onClose }) => {
  const t = useT('myClass');
  const common = useT('common');
  const locale = useLocale();
  const { user, profile } = useAuth();
  const [roundKey, setRoundKey] = useState(0);
  const [result, setResult] = useState<ClassSubmission | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  /** A vocabulary draft left half-done on this or another device, waiting to be continued. */
  const [draft, setDraft] = useState<TeacherAnswer[] | null>(null);
  const [draftLoading, setDraftLoading] = useState(assignment.kind === 'vocabulary');

  const student = user?.email
    ? { uid: user.uid, email: user.email, name: profile?.displayName || user.displayName || user.email }
    : null;

  // Each part of a vocabulary assignment is saved as it finishes, so "Continue" on another
  // device must reopen the parts already done instead of asking for them again.
  useEffect(() => {
    if (assignment.kind !== 'vocabulary' || !student) {
      setDraftLoading(false);
      return;
    }
    let alive = true;
    void fetchSubmissions(classId, student.uid)
      .then((list) => {
        const mine = list.find((item) => item.assignmentId === assignment.id);
        if (!alive || !mine || mine.status !== 'pending') return;
        const byTerm = new Map(assignmentWords(assignment).map((word) => [word.word, word]));
        const restored = mine.detail.answers.flatMap<TeacherAnswer>((row) => {
          const word = byTerm.get(row.term);
          if (!word) return [];
          return [{
            word,
            guess: row.guess,
            correct: row.correct,
            attempts: row.attempts ?? 1,
            hints: row.hints ?? 0,
            skipped: row.skipped,
            mode: row.mode,
          }];
        });
        if (restored.length > 0) setDraft(restored);
      })
      .catch(() => {
        // Offline: start the run again rather than block the homework.
      })
      .finally(() => {
        if (alive) setDraftLoading(false);
      });
    return () => {
      alive = false;
    };
    // Only the assignment identity matters — `assignmentWords` is derived from it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, assignment.id, student?.uid]);

  /** Stores one attempt. A working copy is saved quietly; a finished run takes the screen. */
  const record = async (
    detail: WorkDetail,
    score: number,
    { submit = false, countAttempt = true }: { submit?: boolean; countAttempt?: boolean } = {},
  ) => {
    if (!student || busy) return;
    setBusy(true);
    try {
      const saved = await submitWork({
        classId,
        assignment,
        student,
        detail,
        score,
        submit,
        countAttempt,
      });
      if (countAttempt) setResult(saved);
    } catch {
      toast(t.work.submitFailed, 'error');
    } finally {
      setBusy(false);
    }
  };

  /** The student's decision — or the clock's — that the best attempt is final. */
  const handIn = async (auto = false) => {
    if (!result || busy) return;
    setBusy(true);
    try {
      const handedIn = await handInWork(classId, result, auto);
      setResult(handedIn);
      if (!auto) toast(t.work.result.handedIn, 'success');
    } catch {
      toast(t.work.submitFailed, 'error');
    } finally {
      setBusy(false);
    }
  };

  // The deadline can arrive while the result is on screen. Hand in what the student has
  // already earned rather than lose the attempt — nothing on the server watches the clock.
  useEffect(() => {
    if (!result || result.status === 'submitted' || assignment.dueAt === null) return;
    const left = assignment.dueAt - Date.now();
    if (left <= 0) {
      void handIn(true);
      return;
    }
    const timer = window.setTimeout(() => void handIn(true), Math.min(left, 2_147_483_647));
    return () => window.clearTimeout(timer);
    // `handIn` reads the result this effect depends on, so re-arming on result change is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, assignment.dueAt]);

  const shell = (children: React.ReactNode) => (
    <div className="fixed inset-0 z-50 flex flex-col bg-dark-metal">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--hairline)] px-3 py-2">
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full text-muted-text hover:bg-danger-red/20 hover:text-danger-red"
          aria-label={t.work.leaveAria}
        >
          <Icon name="close" size={18} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-semibold text-light-text">{assignment.title}</p>
          <p className="text-[0.7rem] text-muted-text">
            {t.work.headerMeta(
              t.kinds[assignment.kind],
              assignment.passScore,
              assignment.dueAt
                ? new Date(assignment.dueAt).toLocaleDateString(locale, {
                    day: 'numeric',
                    month: 'short',
                  })
                : null,
            )}
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
        <p className="max-w-xs text-sm text-muted-text">{t.work.notSignedIn}</p>
        <button type="button" onClick={onClose} className="wc-btn wc-btn-secondary min-h-[44px]">
          {common.back}
        </button>
      </div>,
    );
  }

  // Revisiting the cards after the work is in: nothing is scored, and leaving puts the
  // student back on the result they came from.
  if (reviewing) {
    const deck: TeacherDeck = {
      id: assignment.id,
      name: assignment.title,
      words: assignmentWords(assignment),
      createdAt: assignment.createdAt,
      updatedAt: assignment.createdAt,
    };
    return shell(
      <FlashcardReviewScreen
        deck={deck}
        reviewOnly
        onStartTest={() => setReviewing(false)}
        onExit={() => setReviewing(false)}
      />,
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
        onReview={() => setReviewing(true)}
        onHandIn={() => void handIn()}
        onClose={onClose}
      />,
    );
  }

  if (assignment.kind === 'vocabulary') {
    // Undefined fields never travel to Firestore — it refuses them inside arrays.
    const detailOf = (answers: TeacherAnswer[]): WorkDetail => ({
      answers: answers.map<VocabAnswer>((answer) => {
        const row: VocabAnswer = {
          term: answer.word.word,
          gloss: answer.word.meaning,
          guess: answer.guess,
          correct: answer.correct,
          attempts: answer.attempts,
          hints: answer.hints,
        };
        if (answer.skipped) row.skipped = true;
        if (answer.mode) row.mode = answer.mode;
        return row;
      }),
      responses: [],
      text: '',
    });

    if (draftLoading) {
      return shell(
        <div className="flex flex-1 items-center justify-center">
          <span
            className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--hairline-strong)] border-t-electric-blue"
            aria-hidden="true"
          />
        </div>,
      );
    }

    return shell(
      <VocabularyWork
        key={roundKey}
        assignment={assignment}
        initialAnswers={roundKey === 0 ? draft ?? undefined : undefined}
        onDraft={(answers, score) =>
          void record(detailOf(answers), score, { countAttempt: false })
        }
        // The Submit button on the rest screen is the hand-in itself: it only appears once
        // every part is done and the pass line is cleared.
        onSubmit={(answers, score) =>
          void record(detailOf(answers), score, { submit: true })
        }
        onExit={onClose}
      />,
    );
  }

  if (assignment.kind === 'quiz') {
    return shell(
      <QuizWork
        key={roundKey}
        assignment={assignment}
        onSubmit={(responses) => {
          const correct = responses.filter(
            (response, at) => response === assignment.questions[at]?.answer,
          ).length;
          void record(
            { answers: [], responses, text: '' },
            percent(correct, assignment.questions.length),
          );
        }}
      />,
    );
  }

  return shell(
    <WritingWork
      key={roundKey}
      assignment={assignment}
      // An essay is not a test: there is no pass line to beat, so handing it in is the
      // end of the work and the teacher grades what was written.
      onSubmit={(text) => void record({ answers: [], responses: [], text }, 0, { submit: true })}
    />,
  );
};

// ── Result ─────────────────────────────────────────────────────────────────

interface ResultViewProps {
  assignment: ClassAssignment;
  result: ClassSubmission;
  busy: boolean;
  onRetry: () => void;
  /** Vocabulary only — reopen the cards without scoring anything. */
  onReview: () => void;
  /** Hand the best attempt to the teacher. */
  onHandIn: () => void;
  onClose: () => void;
}

const ResultView: React.FC<ResultViewProps> = ({
  assignment,
  result,
  busy,
  onRetry,
  onReview,
  onHandIn,
  onClose,
}) => {
  const t = useT('myClass');
  const common = useT('common');
  const locale = useLocale();

  if (assignment.kind === 'writing') {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-electric-blue/15 text-electric-blue">
          <Icon name="check" size={30} />
        </span>
        <p className="text-xl font-bold text-light-text">{t.work.result.submitted}</p>
        <p className="max-w-sm text-sm text-muted-text">{t.work.result.submittedBody}</p>
        {result.attempts > 1 && (
          <p className="text-xs text-muted-text">{t.work.result.attempt(result.attempts)}</p>
        )}
        <button type="button" onClick={onClose} className="wc-btn wc-btn-primary min-h-[48px] w-full max-w-xs">
          {t.work.result.backToClass}
        </button>
      </div>
    );
  }

  const passLine = assignment.passScore ?? 0;
  const passed = result.passed;
  // A pending attempt is practice: the teacher sees nothing until it is handed in.
  const pending = result.status === 'pending';
  // No pass line at all (an older assignment) must never trap the student — there is
  // nothing to clear, so Submit stays available.
  const canHandIn = assignment.passScore === null || passed;
  const dueLabel =
    assignment.dueAt !== null
      ? new Date(assignment.dueAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
      : null;
  // A multi-round assignment asks the same word several ways, so the "worth another look"
  // list is by word, not by answer row.
  const missed = Array.from(
    new Map(
      result.detail.answers.filter((answer) => !answer.correct).map((answer) => [answer.term, answer]),
    ).values(),
  );
  const wordCount = new Set(result.detail.answers.map((answer) => answer.term)).size;

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
        {passed ? t.work.result.passed : t.work.result.passLine(passLine)}
      </p>
      <p className="text-xs text-muted-text">
        {t.work.result.attemptLine(
          result.attempts,
          Math.max(0, wordCount || assignment.questions.length),
        )}
      </p>

      {pending ? (
        <div className="w-full rounded-md border border-[var(--hairline-strong)] bg-dark-metal/60 p-3 text-left">
          <p className="text-xs font-bold text-light-text">{t.work.result.pendingTitle}</p>
          <p className="mt-1 text-xs text-muted-text">
            {canHandIn
              ? t.work.result.pendingPassed
              : t.work.result.pendingBelow(passLine)}
          </p>
          {dueLabel !== null && (
            <p className="mt-1 text-xs text-muted-text">{t.work.result.autoNote(dueLabel)}</p>
          )}
        </div>
      ) : (
        <p className="text-xs font-semibold text-neon-green">
          {result.autoSubmitted
            ? t.work.result.autoHandedIn(dueLabel)
            : t.work.result.handedIn}
        </p>
      )}

      {missed.length > 0 && (
        <div className="w-full rounded-md border border-[var(--hairline-strong)] bg-dark-metal/60 p-3 text-left">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-danger-red">
            {t.work.result.worthAnotherLook}
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

      {assignment.kind === 'quiz' && result.detail.responses.length > 0 && (
        <div className="w-full rounded-md border border-[var(--hairline-strong)] bg-dark-metal/60 p-3 text-left">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-electric-blue">
            {t.work.result.answersTitle}
          </p>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {assignment.questions.map((question, at) => {
              const picked = result.detail.responses[at] ?? -1;
              const right = picked === question.answer;
              return (
                <li key={at} className="text-xs">
                  <span className={right ? 'text-light-text' : 'text-danger-red'}>
                    {at + 1}. {question.prompt}
                  </span>
                  <span className="block text-muted-text">
                    {t.work.result.yourAnswer(picked >= 0 ? question.choices[picked] : null)}
                    {right ? null : ` · ${t.work.result.correctAnswer(question.choices[question.answer])}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex w-full flex-col gap-2 sm:flex-row">
        {assignment.kind === 'vocabulary' && (
          <button
            type="button"
            onClick={onReview}
            disabled={busy}
            className="wc-btn wc-btn-secondary min-h-[48px] flex-1 disabled:opacity-50"
          >
            {t.work.result.reviewWords}
          </button>
        )}
        <button
          type="button"
          onClick={onRetry}
          disabled={busy}
          className="wc-btn wc-btn-secondary min-h-[48px] flex-1 disabled:opacity-50"
        >
          {pending ? common.tryAgain : t.work.result.practiseAgain}
        </button>
        {pending ? (
          <button
            type="button"
            onClick={onHandIn}
            disabled={busy || !canHandIn}
            className="wc-btn wc-btn-primary min-h-[48px] flex-1 disabled:opacity-40"
          >
            {t.work.result.handIn}
          </button>
        ) : (
          <button type="button" onClick={onClose} className="wc-btn wc-btn-primary min-h-[48px] flex-1">
            {t.work.result.backToClass}
          </button>
        )}
      </div>
      {pending && (
        <button type="button" onClick={onClose} className="text-xs text-muted-text underline">
          {t.work.result.later}
        </button>
      )}
    </div>
  );
};
