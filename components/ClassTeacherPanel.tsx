import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  fetchMembers,
  fetchTeacherClasses,
  handInLateWork,
  isOverdue,
  removeMember,
  setAssignmentArchived,
  watchClass,
  type ClassAssignment,
  type ClassMember,
  type ClassSnapshot,
  type ClassSubmission,
  type NewAssignment,
  type SchoolClass,
} from '../services/classes';

interface ClassTeacherPanelProps {
  viewer: { uid: string; email: string; name: string };
  /** Bumped by the dashboard when a student's work screen closes, so counts refresh. */
  refreshKey?: number;
}

type Mode =
  | { kind: 'overview' }
  | { kind: 'editor' }
  | { kind: 'review'; assignment: ClassAssignment; focusEmail?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Shared empties so a class that is still loading keeps referential stability. */
const NO_MEMBERS: ClassMember[] = [];
const NO_ASSIGNMENTS: ClassAssignment[] = [];
const NO_SUBMISSIONS: ClassSubmission[] = [];

/** How many visited classes stay live at once. A teacher runs rooms, not a campus. */
const LIVE_CLASS_LIMIT = 8;

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
  /**
   * Live snapshots keyed by class. Flipping between rooms must not re-download a class,
   * so each visited class keeps its listener and only changed documents are read.
   */
  const [byClass, setByClass] = useState<Record<string, ClassSnapshot>>({});
  const watchers = useRef(new Map<string, () => void>());
  const recent = useRef<string[]>([]);
  /** Drafts already being handed in, so a racing snapshot cannot send them twice. */
  const settling = useRef(new Set<string>());
  const [mode, setMode] = useState<Mode>({ kind: 'overview' });
  /** Which half of the open class is showing: the roster, the work, or the class report. */
  const [pane, setPane] = useState<'roster' | 'work' | 'report'>('roster');
  /** Finished work is put away by default; this reveals it again. */
  const [showArchived, setShowArchived] = useState(false);
  /** The report's chips: the whole class, the essays waiting on a human, or who still owes work. */
  const [reportView, setReportView] = useState<'all' | 'toGrade' | 'missing'>('all');
  const [busy, setBusy] = useState(false);

  const [newClassName, setNewClassName] = useState('');
  const [creating, setCreating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');

  const active = useMemo(
    () => classes?.find((item) => item.id === activeId) ?? classes?.[0] ?? null,
    [classes, activeId],
  );

  /** What the open tab knows right now. `undefined` means the first snapshot is landing. */
  const data = active ? byClass[active.id] : undefined;
  const members = data?.members ?? NO_MEMBERS;
  const assignments = data?.assignments ?? NO_ASSIGNMENTS;
  const submissions = data?.submissions ?? NO_SUBMISSIONS;

  /**
   * Work still on the class. Archived assignments stay on the server but are out of the
   * report, the grading queue and every count — and their answers are never downloaded.
   */
  const activeAssignments = useMemo(
    () => assignments.filter((item) => item.archivedAt === null),
    [assignments],
  );
  const archivedAssignments = useMemo(
    () => assignments.filter((item) => item.archivedAt !== null),
    [assignments],
  );

  /**
   * The report reads one cell per student per assignment, so the rows are indexed once
   * by assignment and then by email rather than scanned inside every cell.
   */
  const cells = useMemo(() => {
    const index = new Map<string, Map<string, ClassSubmission>>();
    for (const item of submissions) {
      const roster = index.get(item.assignmentId) ?? new Map<string, ClassSubmission>();
      roster.set(item.email, item);
      index.set(item.assignmentId, roster);
    }
    return index;
  }, [submissions]);

  /**
   * Writing that has been handed in but not scored is the only work waiting on a human.
   * Oldest first, so nobody is left waiting because their essay landed on a busy day.
   */
  const gradingQueue = useMemo(
    () =>
      submissions
        .filter((item) => item.status === 'submitted' && item.kind === 'writing' && !item.graded)
        .sort((a, b) => a.submittedAt - b.submittedAt)
        .flatMap((submission) => {
          const assignment = activeAssignments.find((item) => item.id === submission.assignmentId);
          return assignment ? [{ submission, assignment }] : [];
        }),
    [submissions, activeAssignments],
  );

  /** Students who still owe at least one assignment. Invited students cannot owe work yet. */
  const missing = useMemo(
    () =>
      members.filter(
        (member) =>
          member.status === 'active' &&
          activeAssignments.some(
            (assignment) => cells.get(assignment.id)?.get(member.email)?.status !== 'submitted',
          ),
      ).length,
    [members, activeAssignments, cells],
  );

  /** The matrix rows after the chip on top has had its say. */
  const reportRows = useMemo(
    () =>
      members
        .map((member) => ({
          member,
          row: activeAssignments.map(
            (assignment) => cells.get(assignment.id)?.get(member.email) ?? null,
          ),
        }))
        .filter(({ member, row }) => {
          if (reportView === 'missing') {
            return member.status === 'active' && row.some((item) => item?.status !== 'submitted');
          }
          if (reportView === 'toGrade') {
            return row.some(
              (item) =>
                item?.status === 'submitted' && item.kind === 'writing' && !item.graded,
            );
          }
          return true;
        }),
    [members, activeAssignments, cells, reportView],
  );

  const formatDue = (dueAt: number | null): string =>
    dueAt === null
      ? t.meta.noDueDate
      : t.meta.dueOn(
          new Date(dueAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
        );

  const formatSubmitted = (ms: number): string =>
    new Date(ms).toLocaleString(locale, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  const loadClasses = useCallback(async () => {
    try {
      const list = await fetchTeacherClasses(viewer.uid);
      setClasses(list);
    } catch {
      setClasses([]);
      toast(t.teacher.loadClassesFailed, 'error');
    }
  }, [viewer.uid, t]);

  /**
   * Opens (or reuses) the live listeners for one class. Listeners are kept for the last
   * few rooms a teacher visited, so coming back is instant and costs no reads; the oldest
   * room is dropped instead, which keeps a teacher with many classes from piling them up.
   */
  const openClass = useCallback(
    (classId: string) => {
      if (watchers.current.has(classId)) {
        recent.current = [classId, ...recent.current.filter((id) => id !== classId)];
        return;
      }
      const stop = watchClass(
        classId,
        (snapshot) => setByClass((prev) => ({ ...prev, [classId]: snapshot })),
        () => toast(t.teacher.loadClassFailed, 'error'),
      );
      watchers.current.set(classId, stop);
      recent.current = [classId, ...recent.current];
      while (recent.current.length > LIVE_CLASS_LIMIT) {
        const dropped = recent.current.pop();
        if (!dropped) break;
        watchers.current.get(dropped)?.();
        watchers.current.delete(dropped);
        setByClass((prev) => {
          const next = { ...prev };
          delete next[dropped];
          return next;
        });
      }
    },
    [t],
  );

  /** Stops the listeners for a class that is about to disappear. */
  const closeClass = useCallback((classId: string) => {
    watchers.current.get(classId)?.();
    watchers.current.delete(classId);
    recent.current = recent.current.filter((id) => id !== classId);
    setByClass((prev) => {
      const next = { ...prev };
      delete next[classId];
      return next;
    });
  }, []);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    if (active) openClass(active.id);
  }, [active, openClass, refreshKey]);

  // Closing the panel stops the listeners; they are per-class, not per-session.
  useEffect(
    () => () => {
      watchers.current.forEach((stop) => stop());
      watchers.current.clear();
    },
    [],
  );

  /**
   * The deadline is enforced by whichever side opens the class first. A whole class can
   * owe drafts at once, so they are handed in as one batch rather than one request each.
   */
  useEffect(() => {
    if (!active || !data) return;
    const late = data.submissions.filter(
      (item) =>
        item.status === 'pending' &&
        !settling.current.has(item.id) &&
        data.assignments.some(
          (assignment) => assignment.id === item.assignmentId && isOverdue(assignment),
        ),
    );
    if (late.length === 0) return;
    // Marked before the write lands: a second snapshot can arrive while the batch is still
    // in flight, and handing the same draft in twice would be a wasted write.
    late.forEach((item) => settling.current.add(item.id));
    void handInLateWork(active.id, late)
      .catch(() => late.forEach((item) => settling.current.delete(item.id)));
  }, [active, data]);

  /** Writes come straight back through the listeners, so nothing needs re-fetching. */
  const refresh = useCallback(() => undefined, []);

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
      setCreating(false);
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
      closeClass(active.id);
      await deleteClass(active);
      setMode({ kind: 'overview' });
      setActiveId(null);
      await loadClasses();
    } catch {
      toast(t.teacher.deleteClassFailed, 'error');
    }
  };

  const handleCreateAssignment = async (input: NewAssignment, classIds: string[]) => {
    if (!active) return;
    // The same work is written into each chosen roster; one wait covers them all.
    await Promise.all(classIds.map((classId) => createAssignment(classId, input)));
    setMode({ kind: 'overview' });
    toast(
      classIds.length > 1
        ? t.teacher.assignmentSentMany(classIds.length)
        : t.teacher.assignmentSent,
      'success',
    );
  };

  const handleMove = async (member: ClassMember, destId: string) => {
    if (!active || !destId) return;
    const dest = classes?.find((item) => item.id === destId);
    if (!dest) return;
    setBusy(true);
    try {
      const destRoster = await fetchMembers(destId);
      if (destRoster.some((entry) => entry.email === member.email)) {
        toast(t.teacher.alreadyInClass(dest.name), 'error');
        return;
      }
      // A roster line is the only membership record, so copy it across before
      // deleting the old one — a failed second write would otherwise lose the student.
      await addMember(destId, { email: member.email, name: member.name });
      await removeMember(active.id, member.email);
      toast(t.teacher.movedMember(member.name, dest.name), 'success');
    } catch {
      toast(t.teacher.moveFailed, 'error');
    } finally {
      setBusy(false);
    }
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
    } catch {
      toast(t.teacher.deleteAssignmentFailed, 'error');
    }
  };

  /** Written work waiting on a person has to be scored before its lesson is put away. */
  const hasUngraded = (assignmentId: string): boolean =>
    submissions.some(
      (item) =>
        item.assignmentId === assignmentId &&
        item.status === 'submitted' &&
        item.kind === 'writing' &&
        !item.graded,
    );

  const handleArchive = async (assignment: ClassAssignment, archived: boolean) => {
    if (!active) return;
    if (archived && hasUngraded(assignment.id)) {
      toast(t.teacher.archiveBlocked, 'error');
      return;
    }
    try {
      await setAssignmentArchived(active.id, assignment.id, archived);
      toast(archived ? t.teacher.archiveDone : t.teacher.restoreDone, 'success');
    } catch {
      toast(t.teacher.archiveFailed, 'error');
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
          className="futuristic-input min-h-[48px] w-full px-3 text-base"
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
    // The editor draws its own dialogs, so it must not sit inside a card — a transformed
    // ancestor would trap the fixed overlay inside that card.
    return (
      <ClassAssignmentEditor
        classes={classes.map((item) => ({ id: item.id, name: item.name }))}
        activeClassId={active.id}
        onCancel={() => setMode({ kind: 'overview' })}
        onCreate={handleCreateAssignment}
      />
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
          initialOpenEmail={mode.focusEmail ?? null}
          onRefresh={refresh}
          onBack={() => setMode({ kind: 'overview' })}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* One tab per class. A teacher with a dozen rooms scrolls this rail sideways
          instead of stacking a dozen cards down the page. */}
      <div className="flex items-center gap-2 border-b border-[var(--wn-4)]">
        <div
          className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label={t.teacher.classesAria}
        >
          {classes.map((item) => {
            const selected = item.id === active.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`classTab-${item.id}`}
                aria-selected={selected}
                aria-controls="classPanel"
                onClick={() => {
                  setActiveId(item.id);
                  setMode({ kind: 'overview' });
                }}
                className={`-mb-px max-w-[12rem] shrink-0 truncate border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
                  selected
                    ? 'border-neon-green text-[var(--wn-12)]'
                    : 'border-transparent text-[var(--wn-9)] hover:text-[var(--wn-11)]'
                }`}
              >
                {item.name}
              </button>
            );
          })}
        </div>
        {/* A teacher runs several rooms and years at once, so a second class must be
            one tap away — not hidden behind having none. */}
        <button
          type="button"
          onClick={() => setCreating((open) => !open)}
          aria-expanded={creating}
          aria-label={t.teacher.createClass}
          className="mb-1 flex min-h-[40px] shrink-0 items-center gap-1 rounded-full border border-dashed border-[var(--wn-6)] px-3 text-xs font-semibold text-[var(--wn-10)] transition-colors hover:border-neon-green/60 hover:text-neon-green"
        >
          <Icon name="plus" size={14} />
          <span className="hidden sm:inline">{t.teacher.createClass}</span>
        </button>
      </div>

      {creating && (
        <form
          className="wc-card flex flex-col gap-2 p-4 sm:flex-row sm:items-center"
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreateClass();
          }}
        >
          <input
            value={newClassName}
            onChange={(event) => setNewClassName(event.target.value)}
            maxLength={CLASS_NAME_MAX}
            placeholder={t.teacher.classNamePlaceholder}
            aria-label={t.teacher.createClass}
            className="futuristic-input min-h-[48px] w-full px-3 text-base sm:flex-1"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="wc-btn wc-btn-primary min-h-[44px] flex-1 px-3 text-sm disabled:opacity-50 sm:flex-none"
            >
              {t.teacher.createClass}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setNewClassName('');
              }}
              className="wc-btn wc-btn-secondary min-h-[44px] flex-1 px-3 text-xs sm:flex-none"
            >
              {common.cancel}
            </button>
          </div>
        </form>
      )}

      <section
        id="classPanel"
        role="tabpanel"
        aria-labelledby={`classTab-${active.id}`}
        className="wc-card flex flex-col"
      >
        <div className="flex flex-col gap-3 border-b border-[var(--wn-4)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold text-[var(--wn-12)]">{active.name}</h3>
              <p className="text-sm text-[var(--wn-10)]">
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
                className="wc-btn wc-btn-secondary min-h-[44px] px-3 text-sm"
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

          <div
            className="flex rounded-[var(--r-md)] bg-[var(--wn-3)] p-1"
            role="group"
            aria-label={t.teacher.sectionsAria}
          >
            {([
              ['roster', t.teacher.rosterTab(members.length)],
              ['work', t.teacher.workTab(activeAssignments.length)],
              ['report', t.teacher.progressTab],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={pane === id}
                onClick={() => setPane(id)}
                className={`min-h-[44px] flex-1 truncate rounded-[calc(var(--r-md)-2px)] px-2 text-[0.8125rem] font-semibold transition-colors sm:px-3 sm:text-sm ${
                  pane === id
                    ? 'bg-[var(--card-bg)] text-[var(--wn-12)] shadow-sm'
                    : 'text-[var(--wn-9)] hover:text-[var(--wn-12)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {!data ? (
          <div className="flex items-center justify-center gap-2 p-8" role="status" aria-live="polite">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--wn-4)] border-t-electric-blue" />
            <span className="text-sm text-[var(--wn-10)]">{t.teacher.loading}</span>
          </div>
        ) : pane === 'roster' ? (
          <div className="flex flex-col gap-3 p-4">
            <p className="text-sm text-[var(--wn-10)]">{t.teacher.addBody}</p>

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
                className="futuristic-input min-h-[48px] w-full px-3 text-base sm:flex-[2]"
                aria-label={t.teacher.emailAria}
              />
              <input
                value={inviteName}
                onChange={(event) => setInviteName(event.target.value)}
                placeholder={t.teacher.studentNamePlaceholder}
                className="futuristic-input min-h-[48px] w-full px-3 text-base sm:flex-1"
                aria-label={t.teacher.studentNameAria}
              />
              <button
                type="submit"
                disabled={busy}
                className="wc-btn wc-btn-secondary min-h-[48px] px-4 text-sm disabled:opacity-50"
              >
                <Icon name="plus" size={16} />
                {common.add}
              </button>
            </form>

            {members.length > 0 && (
              <ul className="flex flex-col divide-y divide-[var(--wn-4)]">
                {members.map((member) => (
                  <li key={member.email} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-[var(--wn-12)]">
                        {member.name}
                      </span>
                      <span className="block truncate text-xs text-[var(--wn-9)]">{member.email}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {classes.length > 1 && (
                        /* A student can sit in several classes at once, so moving one is a
                           copy-then-remove, not a transfer that empties this roster. */
                        <select
                          value=""
                          onChange={(event) => void handleMove(member, event.target.value)}
                          disabled={busy}
                          aria-label={t.teacher.moveAria(member.name)}
                          className="futuristic-input h-10 min-h-[40px] px-2 text-xs"
                        >
                          <option value="">{t.teacher.moveTo}</option>
                          {classes
                            .filter((item) => item.id !== active.id)
                            .map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                        </select>
                      )}
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
          </div>
        ) : pane === 'work' ? (
          <div className="flex flex-col gap-3 p-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setMode({ kind: 'editor' })}
                className="wc-btn wc-btn-primary min-h-[44px] w-full px-3 text-sm sm:w-auto"
              >
                <Icon name="plus" size={16} />
                {t.teacher.newAssignment}
              </button>
            </div>

            {activeAssignments.length === 0 ? (
              <p className="text-sm text-[var(--wn-10)]">
                {assignments.length === 0
                  ? t.teacher.noAssignments
                  : t.teacher.noActiveAssignments}
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {activeAssignments.map((assignment) => {
                  const stats = assignmentStats(submissions, assignment.id);
                  return (
                    <li
                      key={assignment.id}
                      className="rounded-[var(--r-md)] border border-[var(--wn-4)] bg-[var(--field-bg)] p-3.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[0.9375rem] font-semibold text-[var(--wn-12)]">
                            {assignment.title}
                          </p>
                          <p className="text-xs text-[var(--wn-9)]">
                            {t.teacher.metaLine(
                              t.kinds[assignment.kind],
                              formatDue(assignment.dueAt),
                              assignment.kind === 'vocabulary' ? assignment.words.length : null,
                              assignment.kind === 'quiz' ? assignment.questions.length : null,
                            )}
                          </p>
                        </div>
                        <span className="shrink-0 text-right text-xs tabular-nums text-[var(--wn-10)]">
                          {t.teacher.doneOf(stats.submitted, members.length)}
                          <span className="block text-neon-green">
                            {t.teacher.passedCount(stats.passed)}
                          </span>
                        </span>
                      </div>
                      <div className="mt-2.5 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setMode({ kind: 'review', assignment })}
                          className="wc-btn wc-btn-secondary min-h-[44px] flex-1 text-sm"
                        >
                          {t.teacher.openReport}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleArchive(assignment, true)}
                          disabled={hasUngraded(assignment.id)}
                          title={
                            hasUngraded(assignment.id) ? t.teacher.archiveBlocked : undefined
                          }
                          className="wc-btn wc-btn-secondary min-h-[44px] shrink-0 px-3 text-sm disabled:opacity-50"
                        >
                          <Icon name="folder" size={14} />
                          {t.teacher.archive}
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

            {archivedAssignments.length > 0 && (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setShowArchived((open) => !open)}
                  aria-expanded={showArchived}
                  className="flex min-h-[44px] items-center gap-2 rounded-[var(--r-md)] border border-dashed border-[var(--wn-4)] px-3 text-left text-xs font-semibold text-[var(--wn-10)] transition-colors hover:border-[var(--wn-6)] hover:text-[var(--wn-12)]"
                >
                  <Icon
                    name="arrowRight"
                    size={14}
                    className={showArchived ? 'rotate-90 transition-transform' : 'transition-transform'}
                  />
                  {t.teacher.archivedToggle(archivedAssignments.length)}
                </button>
                {showArchived && (
                  <ul className="flex flex-col gap-2.5">
                    {archivedAssignments.map((assignment) => (
                      <li
                        key={assignment.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--r-md)] border border-[var(--wn-4)] bg-[var(--field-bg)] p-3.5"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-[var(--wn-11)]">
                            {assignment.title}
                          </span>
                          <span className="block truncate text-xs text-[var(--wn-9)]">
                            {t.teacher.metaLine(
                              t.kinds[assignment.kind],
                              formatDue(assignment.dueAt),
                              assignment.kind === 'vocabulary' ? assignment.words.length : null,
                              assignment.kind === 'quiz' ? assignment.questions.length : null,
                            )}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleArchive(assignment, false)}
                            className="wc-btn wc-btn-secondary min-h-[44px] px-3 text-sm"
                          >
                            {t.teacher.restore}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteAssignment(assignment)}
                            className="wc-icon-btn"
                            aria-label={t.teacher.deleteAssignmentAria(assignment.title)}
                          >
                            <Icon name="ban" size={16} />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h4 className="text-sm font-bold text-[var(--wn-12)]">{t.teacher.report.title}</h4>
              <p className="text-xs text-[var(--wn-10)]">
                {t.teacher.report.summary(
                  members.length,
                  activeAssignments.length,
                  gradingQueue.length,
                )}
              </p>
            </div>

            {members.length === 0 || activeAssignments.length === 0 ? (
              <p className="text-sm text-[var(--wn-10)]">
                {activeAssignments.length === 0
                  ? t.teacher.report.nothingYet
                  : t.review.noStudents}
              </p>
            ) : (
              <>
                {/* Three questions, three chips: the whole class, who is waiting on me,
                    and who still owes work. */}
                <div
                  className="flex flex-wrap gap-1.5"
                  role="group"
                  aria-label={t.teacher.report.viewsAria}
                >
                  {([
                    ['all', t.teacher.report.filterAll],
                    ['toGrade', t.teacher.report.filterToGrade(gradingQueue.length)],
                    ['missing', t.teacher.report.filterMissing(missing)],
                  ] as const).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={reportView === id}
                      onClick={() => setReportView(id)}
                      className={`min-h-[40px] rounded-full border px-3 text-xs font-semibold transition-colors ${
                        reportView === id
                          ? 'border-electric-blue bg-electric-blue/10 text-electric-blue'
                          : 'border-[var(--wn-4)] text-[var(--wn-10)] hover:border-[var(--wn-6)] hover:text-[var(--wn-12)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Written work is the only kind that waits on a person, so it gets its
                    own short inbox: oldest first, one tap into the grader. */}
                {gradingQueue.length > 0 && (
                  <section className="flex flex-col gap-2">
                    <h5 className="text-[0.65rem] font-bold uppercase tracking-[0.15em] text-electric-blue">
                      {t.teacher.report.queueTitle(gradingQueue.length)}
                    </h5>
                    <ul className="flex flex-col gap-2">
                      {gradingQueue.map(({ submission, assignment }) => (
                        <li
                          key={submission.id}
                          className="flex items-start justify-between gap-3 rounded-[var(--r-md)] border border-[var(--wn-4)] bg-[var(--field-bg)] p-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--wn-12)]">
                              {submission.name}
                            </p>
                            <p className="truncate text-xs text-[var(--wn-10)]">
                              {assignment.title}
                            </p>
                            <p className="text-[0.65rem] text-[var(--wn-9)]">
                              {t.teacher.report.queueSubmitted(
                                formatSubmitted(submission.submittedAt),
                              )}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setMode({
                                kind: 'review',
                                assignment,
                                focusEmail: submission.email,
                              })
                            }
                            className="wc-btn wc-btn-primary min-h-[40px] shrink-0 px-3 text-xs"
                          >
                            {t.review.gradeThis}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <p className="text-xs leading-snug text-[var(--wn-10)]">{t.teacher.report.hint}</p>
                {/* A matrix rather than two lists: every student against every assignment.
                    The name column stays pinned so a class of thirty never loses its labels. */}
                <div className="max-h-[65vh] overflow-auto rounded-[var(--r-md)] border border-[var(--wn-4)]">
                  <table className="w-full border-separate border-spacing-0 text-left">
                    <thead>
                      <tr>
                        <th
                          scope="col"
                          className="sticky left-0 top-0 z-30 min-w-[9rem] border-b border-r border-[var(--wn-4)] bg-[var(--field-bg)] px-3 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--wn-10)]"
                        >
                          {t.teacher.report.student}
                        </th>
                        {activeAssignments.map((assignment) => (
                          <th
                            key={assignment.id}
                            scope="col"
                            className="sticky top-0 z-20 min-w-[7rem] border-b border-l border-[var(--wn-4)] bg-[var(--field-bg)] p-0 align-bottom"
                          >
                            <button
                              type="button"
                              onClick={() => setMode({ kind: 'review', assignment })}
                              title={assignment.title}
                              className="flex w-full flex-col gap-0.5 px-2.5 py-2 text-left transition-colors hover:bg-[var(--wn-3)]"
                            >
                              <span className="line-clamp-2 text-xs font-semibold text-[var(--wn-12)]">
                                {assignment.title}
                              </span>
                              <span className="text-[0.65rem] text-[var(--wn-9)]">
                                {t.teacher.doneOf(
                                  assignmentStats(submissions, assignment.id).submitted,
                                  members.length,
                                )}
                              </span>
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="[&>tr:last-child>*]:border-b-0">
                      {reportRows.length === 0 && (
                        <tr>
                          <td
                            colSpan={activeAssignments.length + 1}
                            className="px-3 py-6 text-center text-sm text-[var(--wn-10)]"
                          >
                            {reportView === 'missing'
                              ? t.teacher.report.missingEmpty
                              : t.teacher.report.queueEmpty}
                          </td>
                        </tr>
                      )}
                      {reportRows.map(({ member, row }) => {
                        const handedIn = row.filter((item) => item?.status === 'submitted').length;
                        return (
                          <tr key={member.email}>
                            <th
                              scope="row"
                              className="sticky left-0 z-10 min-w-[9rem] border-b border-r border-[var(--wn-4)] bg-[var(--card-bg)] px-3 py-2 text-left align-middle"
                            >
                              <span className="block max-w-[8rem] truncate text-sm font-medium text-[var(--wn-12)]">
                                {member.name}
                              </span>
                              <span className="block text-[0.65rem] text-[var(--wn-9)]">
                                {t.teacher.doneOf(handedIn, activeAssignments.length)}
                              </span>
                            </th>
                            {row.map((submission, index) => {
                              const assignment = activeAssignments[index];
                              const submitted = submission?.status === 'submitted';
                              const label =
                                submission === null
                                  ? t.review.notDone
                                  : !submitted
                                    ? t.teacher.report.inProgress
                                    : submission.kind === 'writing' && !submission.graded
                                      ? t.review.toGrade
                                      : `${submission.score}%`;
                              return (
                                <td
                                  key={assignment.id}
                                  className="border-b border-l border-[var(--wn-4)] p-0 text-center"
                                >
                                  <button
                                    type="button"
                                    onClick={() => setMode({ kind: 'review', assignment })}
                                    aria-label={t.teacher.report.cellAria(
                                      member.name,
                                      assignment.title,
                                      label,
                                    )}
                                    className="flex min-h-[48px] w-full flex-col items-center justify-center gap-0.5 px-2 transition-colors hover:bg-[var(--wn-3)]"
                                  >
                                    {submission === null ? (
                                      <span className="text-sm text-[var(--wn-8)]">–</span>
                                    ) : !submitted ? (
                                      <span className="flex items-center gap-1 text-[0.65rem] font-semibold text-warning-yellow">
                                        <span className="h-1.5 w-1.5 rounded-full bg-warning-yellow" />
                                        {t.teacher.report.inProgress}
                                      </span>
                                    ) : submission.kind === 'writing' && !submission.graded ? (
                                      <span className="rounded-full bg-electric-blue/15 px-2 py-0.5 text-[0.65rem] font-bold text-electric-blue">
                                        {t.review.toGrade}
                                      </span>
                                    ) : (
                                      <span
                                        className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold tabular-nums ${
                                          submission.passed
                                            ? 'bg-neon-green/15 text-neon-green'
                                            : 'bg-warning-yellow/15 text-warning-yellow'
                                        }`}
                                      >
                                        {submission.score}%
                                      </span>
                                    )}
                                    {submitted && submission.autoSubmitted && (
                                      <span className="text-[0.6rem] text-[var(--wn-9)]">
                                        {t.teacher.report.auto}
                                      </span>
                                    )}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
