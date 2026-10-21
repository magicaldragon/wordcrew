import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon';
import { confirmDialog, toast } from './Feedback';
import { ClassAssignmentEditor } from './ClassAssignmentEditor';
import { ClassAssignmentReview } from './ClassAssignmentReview';
import { useT } from '../i18n/useT';
import { useLocale } from '../i18n/useLocale';
import {
  CLASS_NAME_MAX,
  addMember,
  assignmentStats,
  createAssignment,
  createClass,
  deleteAssignment,
  deleteClass,
  fetchAssignments,
  fetchMembers,
  fetchSubmissions,
  fetchTeacherClasses,
  removeMember,
  type ClassAssignment,
  type ClassMember,
  type ClassSubmission,
  type NewAssignment,
  type SchoolClass,
} from '../services/classes';

interface ClassTeacherPanelProps {
  viewer: { uid: string; email: string; name: string };
  /** Bumped by the dashboard when a student's work screen closes, so counts refresh. */
  refreshKey?: number;
}

type Mode = { kind: 'overview' } | { kind: 'editor' } | { kind: 'review'; assignment: ClassAssignment };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The teacher console: one class at a time, its roster, and the work that has been set.
 * A teacher may run several classes (different years, different rooms), so the header is a
 * rail of classes rather than a single embedded one.
 */
export const ClassTeacherPanel: React.FC<ClassTeacherPanelProps> = ({ viewer, refreshKey = 0 }) => {
  const t = useT('myClass');
  const common = useT('common');
  const locale = useLocale();

  const [classes, setClasses] = useState<SchoolClass[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
  const [submissions, setSubmissions] = useState<ClassSubmission[]>([]);
  const [mode, setMode] = useState<Mode>({ kind: 'overview' });
  const [busy, setBusy] = useState(false);

  const [newClassName, setNewClassName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');

  const active = useMemo(
    () => classes?.find((item) => item.id === activeId) ?? classes?.[0] ?? null,
    [classes, activeId],
  );

  const formatDue = (dueAt: number | null): string =>
    dueAt === null
      ? t.meta.noDueDate
      : t.meta.dueOn(
          new Date(dueAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
        );

  const loadClasses = useCallback(async () => {
    try {
      const list = await fetchTeacherClasses(viewer.uid);
      setClasses(list);
    } catch {
      setClasses([]);
      toast(t.teacher.loadClassesFailed, 'error');
    }
  }, [viewer.uid, t]);

  const loadClassData = useCallback(async (classId: string) => {
    try {
      const [roster, work, results] = await Promise.all([
        fetchMembers(classId),
        fetchAssignments(classId),
        fetchSubmissions(classId),
      ]);
      setMembers(roster);
      setAssignments(work);
      setSubmissions(results);
    } catch {
      toast(t.teacher.loadClassFailed, 'error');
    }
  }, [t]);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    if (active) void loadClassData(active.id);
  }, [active, refreshKey, loadClassData]);

  const handleCreateClass = async () => {
    if (!newClassName.trim()) {
      toast(t.teacher.nameRequired, 'error');
      return;
    }
    setBusy(true);
    try {
      const created = await createClass({
        name: newClassName,
        teacherUid: viewer.uid,
        teacherEmail: viewer.email,
        teacherName: viewer.name,
      });
      setNewClassName('');
      await loadClasses();
      setActiveId(created.id);
      toast(t.teacher.classCreated(created.joinCode), 'success');
    } catch {
      toast(t.teacher.createFailed, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleInvite = async () => {
    if (!active) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      toast(t.teacher.emailInvalid, 'error');
      return;
    }
    if (members.some((member) => member.email === email)) {
      toast(t.teacher.alreadyAdded, 'error');
      return;
    }
    setBusy(true);
    try {
      await addMember(active.id, { email, name: inviteName });
      setInviteEmail('');
      setInviteName('');
      await loadClassData(active.id);
    } catch {
      toast(t.teacher.addFailed, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (member: ClassMember) => {
    if (!active) return;
    const ok = await confirmDialog(t.teacher.removeAsk(member.name), {
      confirmLabel: common.remove,
      cancelLabel: common.cancel,
      destructive: true,
    });
    if (!ok) return;
    try {
      await removeMember(active.id, member.email);
      await loadClassData(active.id);
    } catch {
      toast(t.teacher.removeFailed, 'error');
    }
  };

  const handleDeleteClass = async () => {
    if (!active) return;
    const ok = await confirmDialog(t.teacher.deleteClassAsk(active.name), {
      confirmLabel: t.teacher.deleteClassLabel,
      cancelLabel: common.cancel,
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteClass(active);
      setMode({ kind: 'overview' });
      setActiveId(null);
      await loadClasses();
    } catch {
      toast(t.teacher.deleteClassFailed, 'error');
    }
  };

  const handleCreateAssignment = async (input: NewAssignment) => {
    if (!active) return;
    await createAssignment(active.id, input);
    await loadClassData(active.id);
    setMode({ kind: 'overview' });
    toast(t.teacher.assignmentSent, 'success');
  };

  const handleDeleteAssignment = async (assignment: ClassAssignment) => {
    if (!active) return;
    const ok = await confirmDialog(t.teacher.deleteAssignmentAsk(assignment.title), {
      confirmLabel: common.delete,
      cancelLabel: common.cancel,
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteAssignment(active.id, assignment.id);
      await loadClassData(active.id);
    } catch {
      toast(t.teacher.deleteAssignmentFailed, 'error');
    }
  };

  const copyCode = async () => {
    if (!active) return;
    try {
      await navigator.clipboard.writeText(active.joinCode);
      toast(t.teacher.codeCopied, 'success');
    } catch {
      toast(t.teacher.codeIs(active.joinCode), 'success');
    }
  };

  if (classes === null) {
    return (
      <div className="wc-card flex items-center justify-center p-8" role="status" aria-live="polite">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--wn-4)] border-t-electric-blue" />
        <span className="sr-only">{t.teacher.loading}</span>
      </div>
    );
  }

  if (!classes.length) {
    return (
      <div className="wc-card flex flex-col gap-3 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-[var(--r-md)] bg-[var(--wa-2)] text-[var(--wa-11)]">
            <Icon name="user" size={22} />
          </span>
          <div>
            <h3 className="text-lg font-bold text-[var(--wn-12)]">{t.teacher.emptyTitle}</h3>
            <p className="text-sm text-[var(--wn-10)]">{t.teacher.emptyBody}</p>
          </div>
        </div>
        <input
          value={newClassName}
          onChange={(event) => setNewClassName(event.target.value)}
          maxLength={CLASS_NAME_MAX}
          placeholder={t.teacher.classNamePlaceholder}
          className="futuristic-input min-h-[44px] w-full px-3 text-sm"
        />
        <button
          type="button"
          onClick={() => void handleCreateClass()}
          disabled={busy}
          className="wc-btn wc-btn-primary min-h-[44px] self-start disabled:opacity-50"
        >
          <Icon name="plus" size={16} />
          {t.teacher.createClass}
        </button>
      </div>
    );
  }

  if (!active) return null;

  if (mode.kind === 'editor') {
    return (
      <div className="wc-card p-4">
        <ClassAssignmentEditor onCancel={() => setMode({ kind: 'overview' })} onCreate={handleCreateAssignment} />
      </div>
    );
  }

  if (mode.kind === 'review') {
    return (
      <div className="wc-card p-4">
        <ClassAssignmentReview
          classId={active.id}
          assignment={mode.assignment}
          members={members}
          submissions={submissions}
          onRefresh={() => loadClassData(active.id)}
          onBack={() => setMode({ kind: 'overview' })}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {classes.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t.teacher.classesAria}>
          {classes.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === active.id}
              onClick={() => {
                setActiveId(item.id);
                setMode({ kind: 'overview' });
              }}
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

      <section className="wc-card flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-[var(--wn-12)]">{active.name}</h3>
            <p className="text-xs text-[var(--wn-9)]">
              {t.teacher.summary(
                members.length,
                members.filter((member) => member.status === 'active').length,
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => void copyCode()}
              className="wc-btn wc-btn-secondary min-h-[44px] px-3 text-xs"
              title={t.teacher.copyCodeTitle}
            >
              <Icon name="folder" size={14} />
              {active.joinCode}
            </button>
            <button
              type="button"
              onClick={() => void handleDeleteClass()}
              className="wc-icon-btn"
              aria-label={t.teacher.deleteClassAria}
              title={t.teacher.deleteClassAria}
            >
              <Icon name="ban" size={16} />
            </button>
          </div>
        </div>

        <p className="text-xs text-[var(--wn-9)]">{t.teacher.addBody}</p>

        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void handleInvite();
          }}
        >
          <input
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            type="email"
            placeholder={t.teacher.emailPlaceholder}
            className="futuristic-input min-h-[44px] w-full px-3 text-sm sm:flex-[2]"
            aria-label={t.teacher.emailAria}
          />
          <input
            value={inviteName}
            onChange={(event) => setInviteName(event.target.value)}
            placeholder={t.teacher.studentNamePlaceholder}
            className="futuristic-input min-h-[44px] w-full px-3 text-sm sm:flex-1"
            aria-label={t.teacher.studentNameAria}
          />
          <button type="submit" disabled={busy} className="wc-btn wc-btn-secondary min-h-[44px] px-3 disabled:opacity-50">
            <Icon name="plus" size={16} />
            {common.add}
          </button>
        </form>

        {members.length > 0 && (
          <ul className="flex flex-col divide-y divide-[var(--wn-4)]">
            {members.map((member) => (
              <li key={member.email} className="flex items-center justify-between gap-2 py-1.5">
                <span className="min-w-0">
                  <span className="block truncate text-sm text-[var(--wn-11)]">{member.name}</span>
                  <span className="block truncate text-xs text-[var(--wn-9)]">{member.email}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider ${
                      member.status === 'active'
                        ? 'bg-neon-green/15 text-neon-green'
                        : 'bg-[var(--wn-3)] text-[var(--wn-9)]'
                    }`}
                  >
                    {member.status === 'active' ? t.teacher.joined : t.teacher.invited}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleRemove(member)}
                    className="wc-icon-btn h-9 w-9"
                    aria-label={t.teacher.removeAria(member.name)}
                  >
                    <Icon name="close" size={14} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="wc-card flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--wn-9)]">
            {t.teacher.assignments}
          </h3>
          <button
            type="button"
            onClick={() => setMode({ kind: 'editor' })}
            className="wc-btn wc-btn-primary min-h-[44px] px-3 text-xs"
          >
            <Icon name="plus" size={14} />
            {t.teacher.newAssignment}
          </button>
        </div>

        {assignments.length === 0 ? (
          <p className="text-sm text-[var(--wn-9)]">{t.teacher.noAssignments}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {assignments.map((assignment) => {
              const stats = assignmentStats(submissions, assignment.id);
              return (
                <li key={assignment.id} className="rounded-[var(--r-md)] border border-[var(--wn-4)] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--wn-11)]">{assignment.title}</p>
                      <p className="text-xs text-[var(--wn-9)]">
                        {t.teacher.metaLine(
                          t.kinds[assignment.kind],
                          formatDue(assignment.dueAt),
                          assignment.kind === 'vocabulary' ? assignment.words.length : null,
                          assignment.kind === 'quiz' ? assignment.questions.length : null,
                        )}
                      </p>
                    </div>
                    <span className="shrink-0 text-right text-xs tabular-nums text-[var(--wn-9)]">
                      {t.teacher.doneOf(stats.submitted, members.length)}
                      <span className="block text-neon-green">{t.teacher.passedCount(stats.passed)}</span>
                    </span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMode({ kind: 'review', assignment })}
                      className="wc-btn wc-btn-secondary min-h-[44px] flex-1 text-xs"
                    >
                      {t.teacher.openReport}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteAssignment(assignment)}
                      className="wc-icon-btn"
                      aria-label={t.teacher.deleteAssignmentAria(assignment.title)}
                    >
                      <Icon name="ban" size={16} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};
