import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon';
import { confirmDialog, toast } from './Feedback';
import { ClassAssignmentEditor } from './ClassAssignmentEditor';
import { ClassAssignmentReview } from './ClassAssignmentReview';
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

const KIND_LABEL: Record<ClassAssignment['kind'], string> = {
  vocabulary: 'Word set',
  quiz: 'Multiple choice',
  writing: 'Writing',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formatDue = (dueAt: number | null): string =>
  dueAt === null
    ? 'No due date'
    : `Due ${new Date(dueAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;

/**
 * The teacher console: one class at a time, its roster, and the work that has been set.
 * A teacher may run several classes (different years, different rooms), so the header is a
 * rail of classes rather than a single embedded one.
 */
export const ClassTeacherPanel: React.FC<ClassTeacherPanelProps> = ({ viewer, refreshKey = 0 }) => {
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

  const loadClasses = useCallback(async () => {
    try {
      const list = await fetchTeacherClasses(viewer.uid);
      setClasses(list);
    } catch {
      setClasses([]);
      toast('Could not load your classes.', 'error');
    }
  }, [viewer.uid]);

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
      toast('Could not load that class.', 'error');
    }
  }, []);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    if (active) void loadClassData(active.id);
  }, [active, refreshKey, loadClassData]);

  const handleCreateClass = async () => {
    if (!newClassName.trim()) {
      toast('Give the class a name.', 'error');
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
      toast(`Class created. Code ${created.joinCode}.`, 'success');
    } catch {
      toast('Could not create the class. Check that your account has the teacher role.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleInvite = async () => {
    if (!active) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      toast('That does not look like an email address.', 'error');
      return;
    }
    if (members.some((member) => member.email === email)) {
      toast('That student is already on the roster.', 'error');
      return;
    }
    setBusy(true);
    try {
      await addMember(active.id, { email, name: inviteName });
      setInviteEmail('');
      setInviteName('');
      await loadClassData(active.id);
    } catch {
      toast('Could not add that student.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (member: ClassMember) => {
    if (!active) return;
    const ok = await confirmDialog(`Remove ${member.name} from this class? Their submitted work stays.`, {
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    try {
      await removeMember(active.id, member.email);
      await loadClassData(active.id);
    } catch {
      toast('Could not remove that student.', 'error');
    }
  };

  const handleDeleteClass = async () => {
    if (!active) return;
    const ok = await confirmDialog(
      `Delete “${active.name}”? Assignments and submissions go with it.`,
      { confirmLabel: 'Delete class', destructive: true },
    );
    if (!ok) return;
    try {
      await deleteClass(active);
      setMode({ kind: 'overview' });
      setActiveId(null);
      await loadClasses();
    } catch {
      toast('Could not delete that class.', 'error');
    }
  };

  const handleCreateAssignment = async (input: NewAssignment) => {
    if (!active) return;
    await createAssignment(active.id, input);
    await loadClassData(active.id);
    setMode({ kind: 'overview' });
    toast('Assignment sent to the class.', 'success');
  };

  const handleDeleteAssignment = async (assignment: ClassAssignment) => {
    if (!active) return;
    const ok = await confirmDialog(`Delete “${assignment.title}”? Submitted answers go with it.`, {
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteAssignment(active.id, assignment.id);
      await loadClassData(active.id);
    } catch {
      toast('Could not delete that assignment.', 'error');
    }
  };

  const copyCode = async () => {
    if (!active) return;
    try {
      await navigator.clipboard.writeText(active.joinCode);
      toast('Class code copied.', 'success');
    } catch {
      toast(`Class code: ${active.joinCode}`, 'success');
    }
  };

  if (classes === null) {
    return (
      <div className="wc-card flex items-center justify-center p-8" role="status" aria-live="polite">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--wn-4)] border-t-electric-blue" />
        <span className="sr-only">Loading classes…</span>
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
            <h3 className="text-lg font-bold text-[var(--wn-12)]">Start your first class</h3>
            <p className="text-sm text-[var(--wn-10)]">
              Add students by email, set work, and read the report. Students join with a six-letter code.
            </p>
          </div>
        </div>
        <input
          value={newClassName}
          onChange={(event) => setNewClassName(event.target.value)}
          maxLength={CLASS_NAME_MAX}
          placeholder="Class 8A · Thursday evening"
          className="futuristic-input min-h-[44px] w-full px-3 text-sm"
        />
        <button
          type="button"
          onClick={() => void handleCreateClass()}
          disabled={busy}
          className="wc-btn wc-btn-primary min-h-[44px] self-start disabled:opacity-50"
        >
          <Icon name="plus" size={16} />
          Create class
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
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Your classes">
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
              {members.length} {members.length === 1 ? 'student' : 'students'} ·{' '}
              {members.filter((member) => member.status === 'active').length} joined
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => void copyCode()}
              className="wc-btn wc-btn-secondary min-h-[44px] px-3 text-xs"
              title="Copy the class code"
            >
              <Icon name="folder" size={14} />
              {active.joinCode}
            </button>
            <button
              type="button"
              onClick={() => void handleDeleteClass()}
              className="wc-icon-btn"
              aria-label="Delete this class"
              title="Delete this class"
            >
              <Icon name="ban" size={16} />
            </button>
          </div>
        </div>

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
            placeholder="student@school.edu"
            className="futuristic-input min-h-[44px] w-full px-3 text-sm sm:flex-[2]"
            aria-label="Student email"
          />
          <input
            value={inviteName}
            onChange={(event) => setInviteName(event.target.value)}
            placeholder="Name (optional)"
            className="futuristic-input min-h-[44px] w-full px-3 text-sm sm:flex-1"
            aria-label="Student name"
          />
          <button type="submit" disabled={busy} className="wc-btn wc-btn-secondary min-h-[44px] px-3 disabled:opacity-50">
            <Icon name="plus" size={16} />
            Add
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
                    {member.status === 'active' ? 'Joined' : 'Invited'}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleRemove(member)}
                    className="wc-icon-btn h-9 w-9"
                    aria-label={`Remove ${member.name}`}
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
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--wn-9)]">Assignments</h3>
          <button
            type="button"
            onClick={() => setMode({ kind: 'editor' })}
            className="wc-btn wc-btn-primary min-h-[44px] px-3 text-xs"
          >
            <Icon name="plus" size={14} />
            New
          </button>
        </div>

        {assignments.length === 0 ? (
          <p className="text-sm text-[var(--wn-9)]">
            Nothing set yet. A word set, a multiple-choice quiz or a writing prompt — all three end in a report.
          </p>
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
                        {KIND_LABEL[assignment.kind]} · {formatDue(assignment.dueAt)}
                        {assignment.kind === 'vocabulary' ? ` · ${assignment.words.length} words` : ''}
                        {assignment.kind === 'quiz' ? ` · ${assignment.questions.length} questions` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-right text-xs tabular-nums text-[var(--wn-9)]">
                      {stats.submitted}/{members.length} done
                      <span className="block text-neon-green">{stats.passed} passed</span>
                    </span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMode({ kind: 'review', assignment })}
                      className="wc-btn wc-btn-secondary min-h-[44px] flex-1 text-xs"
                    >
                      Open report
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteAssignment(assignment)}
                      className="wc-icon-btn"
                      aria-label={`Delete ${assignment.title}`}
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
