import React, { useMemo, useState } from 'react';
import { Icon } from './Icon';
import { toast } from './Feedback';
import { useT } from '../i18n/useT';
import { useLocale } from '../i18n/useLocale';
import {
  assignmentStats,
  gradeSubmission,
  weakestWords,
  type ClassAssignment,
  type ClassMember,
  type ClassSubmission,
} from '../services/classes';

interface ClassAssignmentReviewProps {
  classId: string;
  assignment: ClassAssignment;
  members: ClassMember[];
  submissions: ClassSubmission[];
  onRefresh: () => Promise<void> | void;
  onBack: () => void;
}

/**
 * One assignment, seen from the teacher's side: who has done it, what the class got wrong,
 * and — for writing — the place where a human score is entered. The vocabulary report is
 * the reason this screen exists: it names the words to reteach tomorrow instead of handing
 * out a percentage and leaving the teacher to guess.
 */
export const ClassAssignmentReview: React.FC<ClassAssignmentReviewProps> = ({
  classId,
  assignment,
  members,
  submissions,
  onRefresh,
  onBack,
}) => {
  const t = useT('myClass');
  const common = useT('common');
  const locale = useLocale();

  const [openId, setOpenId] = useState<string | null>(null);
  const [grading, setGrading] = useState<{ id: string; score: number; feedback: string } | null>(null);

  const formatDate = (ms: number): string =>
    new Date(ms).toLocaleString(locale, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  const rows = useMemo(() => {
    const mine = submissions.filter((item) => item.assignmentId === assignment.id);
    return members.map((member) => ({
      member,
      submission: mine.find((item) => item.email === member.email) ?? null,
    }));
  }, [members, submissions, assignment.id]);

  const mine = useMemo(
    () => submissions.filter((item) => item.assignmentId === assignment.id),
    [submissions, assignment.id],
  );
  const stats = assignmentStats(submissions, assignment.id);
  const weak = assignment.kind === 'vocabulary' ? weakestWords(mine) : [];

  const saveGrade = async () => {
    if (!grading) return;
    try {
      await gradeSubmission(classId, grading.id, {
        score: Math.max(0, Math.min(100, grading.score)),
        feedback: grading.feedback,
        passScore: assignment.passScore,
      });
      toast(t.review.scoreSaved, 'success');
      setGrading(null);
      await onRefresh();
    } catch {
      toast(t.review.saveFailed, 'error');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onBack} className="wc-icon-btn" aria-label={t.review.backAria}>
          <Icon name="arrowLeft" size={16} />
        </button>
        <div className="min-w-0 text-center">
          <h3 className="truncate text-base font-bold text-[var(--wn-12)]">{assignment.title}</h3>
          <p className="text-xs text-[var(--wn-9)]">
            {t.review.headerMeta(t.kinds[assignment.kind], assignment.passScore)}
          </p>
        </div>
        <span className="w-11" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-[var(--r-md)] border border-[var(--wn-4)] p-2 text-center">
          <p className="text-lg font-bold tabular-nums text-[var(--wn-12)]">
            {stats.submitted}/{members.length}
          </p>
          <p className="text-[0.6rem] uppercase tracking-wider text-[var(--wn-9)]">
            {t.review.submitted}
          </p>
        </div>
        <div className="rounded-[var(--r-md)] border border-[var(--wn-4)] p-2 text-center">
          <p className="text-lg font-bold tabular-nums text-neon-green">{stats.passed}</p>
          <p className="text-[0.6rem] uppercase tracking-wider text-[var(--wn-9)]">
            {t.review.passed}
          </p>
        </div>
        <div className="rounded-[var(--r-md)] border border-[var(--wn-4)] p-2 text-center">
          <p className="text-lg font-bold tabular-nums text-[var(--wn-12)]">{stats.average}%</p>
          <p className="text-[0.6rem] uppercase tracking-wider text-[var(--wn-9)]">
            {t.review.average}
          </p>
        </div>
      </div>

      {weak.length > 0 && (
        <section className="rounded-[var(--r-md)] border border-warning-yellow/40 bg-warning-yellow/5 p-3">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.15em] text-warning-yellow">
            {t.review.wordsToReteach}
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {weak.map((word) => (
              <li key={word.term} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-[var(--wn-12)]">
                  {word.term}
                  <span className="text-[var(--wn-9)]"> · {word.gloss}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-[var(--wn-9)]">
                  {t.review.missed(word.missed, word.attempts)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-col gap-2">
        {rows.length === 0 && (
          <p className="text-sm text-[var(--wn-9)]">{t.review.noStudents}</p>
        )}
        {rows.map(({ member, submission }) => {
          const expanded = openId === member.email;
          return (
            <div key={member.email} className="rounded-[var(--r-md)] border border-[var(--wn-4)]">
              <button
                type="button"
                onClick={() => setOpenId(expanded ? null : member.email)}
                className="flex min-h-[44px] w-full items-center justify-between gap-2 px-3 py-2 text-left"
                aria-expanded={expanded}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[var(--wn-11)]">{member.name}</span>
                  <span className="block truncate text-xs text-[var(--wn-9)]">{member.email}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {submission ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${
                        submission.passed
                          ? 'bg-neon-green/15 text-neon-green'
                          : submission.kind === 'writing' && !submission.graded
                            ? 'bg-electric-blue/15 text-electric-blue'
                            : 'bg-warning-yellow/15 text-warning-yellow'
                      }`}
                    >
                      {submission.kind === 'writing' && !submission.graded
                        ? t.review.toGrade
                        : `${submission.score}%`}
                    </span>
                  ) : (
                    <span className="rounded-full bg-[var(--wn-3)] px-2 py-0.5 text-[0.65rem] font-bold text-[var(--wn-9)]">
                      {member.status === 'active' ? t.review.notDone : t.review.invited}
                    </span>
                  )}
                </span>
              </button>

              {expanded && submission && (
                <div className="flex flex-col gap-2 border-t border-[var(--wn-4)] px-3 py-2">
                  <p className="text-xs text-[var(--wn-9)]">
                    {t.review.attemptLine(submission.attempts, formatDate(submission.submittedAt))}
                  </p>

                  {submission.kind === 'vocabulary' && (
                    <ul className="flex flex-col gap-1">
                      {submission.detail.answers.map((answer) => (
                        <li key={answer.term} className="flex items-baseline justify-between gap-2 text-xs">
                          <span className={answer.correct ? 'text-[var(--wn-10)]' : 'text-danger-red'}>
                            {answer.term}
                            <span className="text-[var(--wn-8)]"> · {answer.gloss}</span>
                          </span>
                          <span className="shrink-0 text-[var(--wn-9)]">
                            {answer.correct
                              ? '✓'
                              : answer.guess
                                ? t.review.wrote(answer.guess)
                                : t.review.blank}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {submission.kind === 'quiz' && (
                    <ul className="flex flex-col gap-1">
                      {assignment.questions.map((question, index) => {
                        const picked = submission.detail.responses[index] ?? -1;
                        const right = picked === question.answer;
                        return (
                          <li key={index} className="text-xs">
                            <span className={right ? 'text-[var(--wn-10)]' : 'text-danger-red'}>
                              {index + 1}. {question.prompt}
                            </span>
                            <span className="block text-[var(--wn-9)]">
                              {t.review.quizAnswer(
                                picked >= 0 ? question.choices[picked] : null,
                                right ? null : question.choices[question.answer],
                              )}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {submission.kind === 'writing' && (
                    <div className="flex flex-col gap-2">
                      <p className="whitespace-pre-wrap rounded-md bg-[var(--wn-2)] p-2 text-sm text-[var(--wn-11)]">
                        {submission.detail.text || t.review.emptyText}
                      </p>
                      {submission.graded ? (
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-neon-green">
                            {t.review.gradedLine(submission.score, submission.passed)}
                          </span>
                          <span className="truncate text-[var(--wn-9)]">{submission.feedback}</span>
                        </div>
                      ) : null}
                      {grading?.id === submission.id ? (
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center gap-2 text-xs text-[var(--wn-9)]">
                            {t.review.scoreLabel}
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={grading.score}
                              onChange={(event) =>
                                setGrading({ ...grading, score: Number(event.target.value) })
                              }
                              className="futuristic-input min-h-[44px] w-20 px-2 text-sm"
                            />
                          </label>
                          <textarea
                            value={grading.feedback}
                            onChange={(event) => setGrading({ ...grading, feedback: event.target.value })}
                            rows={2}
                            placeholder={t.review.feedbackPlaceholder}
                            className="futuristic-input w-full px-3 py-2 text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setGrading(null)}
                              className="wc-btn wc-btn-secondary min-h-[44px] flex-1"
                            >
                              {common.cancel}
                            </button>
                            <button
                              type="button"
                              onClick={() => void saveGrade()}
                              className="wc-btn wc-btn-primary min-h-[44px] flex-1"
                            >
                              {t.review.saveScore}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setGrading({
                              id: submission.id,
                              score: submission.graded ? submission.score : 80,
                              feedback: submission.feedback,
                            })
                          }
                          className="wc-btn wc-btn-secondary min-h-[44px]"
                        >
                          {submission.graded ? t.review.changeScore : t.review.gradeThis}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
