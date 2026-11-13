import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon';
import { toast } from './Feedback';
import { useT } from '../i18n/useT';
import { describeError } from '../i18n/errors';
import { useLocale } from '../i18n/useLocale';
import {
  fetchAssignments,
  fetchMyClasses,
  fetchSubmissions,
  handInWork,
  isOverdue,
  joinClassByCode,
  normalizeCode,
  type ClassAssignment,
  type ClassSubmission,
  type SchoolClass,
} from '../services/classes';

interface ClassStudentPanelProps {
  viewer: { uid: string; email: string; name: string };
  onOpenAssignment: (classId: string, assignment: ClassAssignment) => void;
  /** Bumped when the work screen closes, so scores and statuses refresh. */
  refreshKey?: number;
}

/**
 * The student side: one list of what is still owed, and nothing else. A student cannot see
 * classmates, scores or the roster — only their own work and their own results.
 */
export const ClassStudentPanel: React.FC<ClassStudentPanelProps> = ({
  viewer,
  onOpenAssignment,
  refreshKey = 0,
}) => {
  const t = useT('myClass');
  const common = useT('common');
  const errors = useT('errors');
  const locale = useLocale();

  const [classes, setClasses] = useState<SchoolClass[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
  const [submissions, setSubmissions] = useState<ClassSubmission[]>([]);
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const active = useMemo(
    () => classes?.find((item) => item.id === activeId) ?? classes?.[0] ?? null,
    [classes, activeId],
  );

  const formatDue = (dueAt: number | null): string =>
    dueAt === null
      ? t.meta.noDueDate
      : new Date(dueAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' });

  /** Everything worth saying about a deadline that is still missing — days out, hours out,
   *  or already gone. A date three weeks away is left to the metadata line. */
  const dueState = (assignment: ClassAssignment): string | null => {
    if (assignment.dueAt === null) return null;
    const left = assignment.dueAt - Date.now();
    if (left < 0) return t.student.overdue;
    const hours = Math.ceil(left / 3_600_000);
    if (hours < 24) return t.student.dueInHours(hours);
    const days = Math.ceil(left / 86_400_000);
    if (days === 1) return t.student.dueTomorrow;
    return days <= 3 ? t.student.dueInDays(days) : null;
  };

  /** Work that still needs the student: untouched, pending, or attempted without clearing the line. */
  const owesWork = (assignment: ClassAssignment): boolean => {
    const submission = submissions.find((item) => item.assignmentId === assignment.id);
    return (
      !submission ||
      submission.status === 'pending' ||
      (!submission.passed && !submission.graded)
    );
  };

  // Both doors lead here: the roster line the teacher wrote, or the one this student
  // created with the code. One query covers them, so a class added a minute ago appears
  // without the student having to type anything.
  const loadClasses = useCallback(async () => {
    try {
      setClasses(await fetchMyClasses(viewer.email, viewer.uid, viewer.name));
    } catch {
      setClasses([]);
    }
  }, [viewer.email, viewer.uid, viewer.name]);

  const loadWork = useCallback(async (classId: string) => {
    try {
      const [work, results] = await Promise.all([
        fetchAssignments(classId),
        fetchSubmissions(classId, viewer.uid),
      ]);
      // A deadline that passed while the app was closed hands in the pending attempt the
      // moment the student comes back. Nothing on the server watches the clock, so this is
      // the only chance to save that work.
      const late = results.filter(
        (item) =>
          item.status === 'pending' &&
          work.some(
            (assignment) => assignment.id === item.assignmentId && isOverdue(assignment),
          ),
      );
      const settled = await Promise.all(
        late.map((item) => handInWork(classId, item, true).catch(() => item)),
      );
      const byId = new Map(settled.map((item) => [item.id, item]));
      setAssignments(work);
      setSubmissions(results.map((item) => byId.get(item.id) ?? item));
    } catch {
      toast(t.student.loadFailed, 'error');
    }
  }, [viewer.uid, t]);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses, refreshKey]);

  useEffect(() => {
    if (active) void loadWork(active.id);
  }, [active, refreshKey, loadWork]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const joined = await joinClassByCode(code, {
        email: viewer.email,
        uid: viewer.uid,
        name: viewer.name,
      });
      setCode('');
      setShowJoin(false);
      await loadClasses();
      setActiveId(joined.id);
      toast(t.student.joinedClass(joined.name), 'success');
    } catch (error) {
      toast(describeError(errors, error, t.student.joinFailed), 'error');
    } finally {
      setJoining(false);
    }
  };

  const joinForm = (
    <div className="wc-card flex flex-col gap-3 p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-[var(--r-md)] bg-[var(--wa-2)] text-[var(--wa-11)]">
          <Icon name="user" size={22} />
        </span>
        <div>
          <h3 className="text-lg font-bold text-[var(--wn-12)]">{t.student.joinTitle}</h3>
          <p className="text-sm text-[var(--wn-10)]">{t.student.joinBody}</p>
        </div>
      </div>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          void handleJoin();
        }}
      >
        <input
          value={code}
          onChange={(event) => setCode(normalizeCode(event.target.value))}
          placeholder="ABC123"
          autoCapitalize="characters"
          spellCheck={false}
          aria-label={t.student.codeAria}
          className="futuristic-input min-h-[44px] w-full px-3 text-center font-mono text-lg uppercase tracking-[0.3em] sm:flex-1"
        />
        <button
          type="submit"
          disabled={joining || code.length !== 6}
          className="wc-btn wc-btn-primary min-h-[44px] px-4 disabled:opacity-50"
        >
          {joining ? t.student.joining : t.student.join}
        </button>
      </form>
    </div>
  );

  if (classes === null) {
    return (
      <div className="wc-card flex items-center justify-center p-8" role="status" aria-live="polite">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--wn-4)] border-t-electric-blue" />
        <span className="sr-only">{t.student.loading}</span>
      </div>
    );
  }

  if (!classes.length) return joinForm;
  if (!active) return null;

  const done = submissions.filter(
    (item) => item.status === 'submitted' && (item.passed || item.graded),
  ).length;
  // The reminder only names work that is both unfinished and close to its deadline — a
  // banner that lists everything is a banner nobody reads.
  const reminders = assignments.filter(
    (assignment) => owesWork(assignment) && dueState(assignment) !== null,
  );
  const overdue = reminders.some((assignment) => isOverdue(assignment));

  return (
    <div className="flex flex-col gap-4">
      {classes.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t.student.classesAria}>
          {classes.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === active.id}
              onClick={() => setActiveId(item.id)}
              className={`min-h-[44px] rounded-full border px-3 text-xs font-semibold transition-colors ${
                item.id === active.id
                  ? 'border-neon-green/60 bg-neon-green/10 text-neon-green'
                  : 'border-[var(--wn-4)] text-[var(--wn-10)]'
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}

      <section className="wc-card flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold text-[var(--wn-12)]">{active.name}</h3>
          <p className="text-xs text-[var(--wn-9)]">
            {t.student.classSummary(
              active.teacherName || t.student.teacherFallback,
              done,
              assignments.length,
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowJoin((value) => !value)}
          className="wc-btn wc-btn-secondary min-h-[44px] shrink-0 px-3 text-xs"
        >
          {t.student.joinAnother}
        </button>
      </section>

      {showJoin && joinForm}

      {reminders.length > 0 && (
        <section
          className={`wc-card flex flex-col gap-1.5 border p-4 ${
            overdue ? 'border-danger-red/40' : 'border-warning-yellow/40'
          }`}
        >
          <p className={`text-sm font-bold ${overdue ? 'text-danger-red' : 'text-warning-yellow'}`}>
            {t.student.reminderTitle(reminders.length)}
          </p>
          <ul className="flex flex-col gap-1">
            {reminders.map((assignment) => (
              <li key={assignment.id} className="flex items-baseline justify-between gap-2 text-xs">
                <span className="min-w-0 truncate text-[var(--wn-11)]">{assignment.title}</span>
                <span
                  className={`shrink-0 font-semibold ${
                    isOverdue(assignment) ? 'text-danger-red' : 'text-warning-yellow'
                  }`}
                >
                  {dueState(assignment)}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-[var(--wn-9)]">{t.student.reminderBody}</p>
        </section>
      )}

      {assignments.length === 0 ? (
        <p className="text-sm text-[var(--wn-9)]">{t.student.noAssignments}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {assignments.map((assignment) => {
            const submission = submissions.find((item) => item.assignmentId === assignment.id);
            const late = isOverdue(assignment);
            const due = owesWork(assignment) ? dueState(assignment) : null;
            return (
              <li key={assignment.id} className="wc-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[var(--wn-12)]">{assignment.title}</p>
                    <p className="text-xs text-[var(--wn-9)]">
                      {t.student.metaLine(
                        t.kinds[assignment.kind],
                        formatDue(assignment.dueAt),
                        assignment.passScore,
                      )}
                    </p>
                    {due && (
                      <p
                        className={`text-xs font-semibold ${
                          late ? 'text-danger-red' : 'text-warning-yellow'
                        }`}
                      >
                        {due}
                      </p>
                    )}
                  </div>
                  {submission ? (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${
                        submission.status === 'pending'
                          ? 'bg-[var(--wn-3)] text-[var(--wn-10)]'
                          : submission.passed
                            ? 'bg-neon-green/15 text-neon-green'
                            : submission.graded
                              ? 'bg-warning-yellow/15 text-warning-yellow'
                              : 'bg-[var(--wn-3)] text-[var(--wn-10)]'
                      }`}
                    >
                      {submission.status === 'pending'
                        ? t.student.inProgress
                        : submission.kind === 'writing' && !submission.graded
                          ? t.student.waitingForTeacher
                          : `${submission.score}%`}
                    </span>
                  ) : (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${
                        late ? 'bg-danger-red/15 text-danger-red' : 'bg-[var(--wn-3)] text-[var(--wn-9)]'
                      }`}
                    >
                      {late ? t.student.overdue : t.student.todo}
                    </span>
                  )}
                </div>

                {assignment.instructions && (
                  <p className="mt-1.5 whitespace-pre-wrap text-xs text-[var(--wn-10)]">{assignment.instructions}</p>
                )}

                {submission?.graded && submission.feedback && (
                  <p className="mt-1.5 rounded-md bg-[var(--wn-2)] p-2 text-xs text-[var(--wn-10)]">
                    <span className="font-semibold text-[var(--wn-11)]">{t.student.teacherFeedback}</span>
                    {submission.feedback}
                  </p>
                )}

                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-[var(--wn-9)]">
                    {!submission
                      ? t.student.notStarted
                      : submission.status === 'pending'
                        ? t.student.pendingLine(submission.attempts, submission.score)
                        : t.student.attempt(submission.attempts)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenAssignment(active.id, assignment)}
                    className={`wc-btn min-h-[44px] px-3 text-xs ${
                      owesWork(assignment) ? 'wc-btn-primary' : 'wc-btn-secondary'
                    }`}
                  >
                    {!submission
                      ? common.start
                      : submission.status === 'pending'
                        ? t.student.continueWork
                        : submission.kind === 'writing'
                          ? submission.graded
                            ? t.student.readFeedback
                            : common.open
                          : submission.passed
                            ? t.student.practiceAgain
                            : t.student.retryForPass}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
