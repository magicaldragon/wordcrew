// My Class — the assignment side of the teacher tools.
//
// A class is a *teacher-owned* document, and every permission in the rules flows from it:
// a teacher may touch only classes where `teacherUid` is their own uid, a student may read
// an assignment only if a member document with their email exists, and a submission may be
// written only by the student it belongs to. Nobody — teacher included — needs read access
// to another user's `users/{uid}` profile, so adding a student to a class never widens what
// that teacher can see elsewhere.
//
// Three assignment kinds, one submission shape:
//
//   vocabulary  a word list, Vietnamese prompt → English answer, scored like Teacher Mode
//   quiz        four-choice questions, order and options shuffled per student
//   writing     a prompt with a minimum word count, graded by the teacher
//
// Vocabulary and quiz are scored on submit; writing waits for the teacher. Every kind keeps
// the best attempt, so a student can retry until the pass line is met without losing an
// earlier, better result.

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import type { TeacherWord } from './teacherDeck';

const CLASSES = 'classes';
const CODES = 'classCodes';
const JOINED_KEY = 'wordcrew_class_joined_v1';

export const CLASS_NAME_MAX = 40;
export const MAX_MEMBERS = 200;
export const MAX_ASSIGNMENT_WORDS = 60;
export const MAX_QUIZ_QUESTIONS = 30;

// ── Shapes ─────────────────────────────────────────────────────────────────

export type ClassKind = 'vocabulary' | 'quiz' | 'writing';

export interface SchoolClass {
  id: string;
  name: string;
  /** Six characters the teacher hands out so a student can find the class. */
  joinCode: string;
  teacherUid: string;
  teacherEmail: string;
  teacherName: string;
  createdAt: number;
}

export interface ClassMember {
  /** Lowercased email — it is also the document id, so lookups need no index. */
  email: string;
  name: string;
  uid: string | null;
  status: 'invited' | 'active';
  addedAt: number;
  joinedAt: number | null;
}

export interface VocabWord {
  term: string;
  gloss: string;
}

export interface QuizQuestion {
  prompt: string;
  choices: string[];
  /** Index into `choices`. */
  answer: number;
}

export interface ClassAssignment {
  id: string;
  kind: ClassKind;
  title: string;
  /** Teacher's note shown above the work. */
  instructions: string;
  createdAt: number;
  dueAt: number | null;
  /** Percent a student must reach; null for writing, which the teacher grades. */
  passScore: number | null;
  /** vocabulary only. */
  words: VocabWord[];
  /** quiz only. */
  questions: QuizQuestion[];
  /** writing only. */
  prompt: string;
  minWords: number;
}

export interface VocabAnswer {
  term: string;
  gloss: string;
  guess: string;
  correct: boolean;
}

export interface WorkDetail {
  /** vocabulary */
  answers: VocabAnswer[];
  /** quiz — the option index the student picked, -1 when skipped. */
  responses: number[];
  /** writing */
  text: string;
}

export interface ClassSubmission {
  id: string;
  assignmentId: string;
  uid: string;
  email: string;
  name: string;
  kind: ClassKind;
  /** Best attempt, 0–100. Writing stays at 0 until the teacher grades it. */
  score: number;
  passed: boolean;
  attempts: number;
  detail: WorkDetail;
  submittedAt: number;
  graded: boolean;
  feedback: string;
}

export interface NewAssignment {
  kind: ClassKind;
  title: string;
  instructions: string;
  dueAt: number | null;
  passScore: number | null;
  words: VocabWord[];
  questions: QuizQuestion[];
  prompt: string;
  minWords: number;
}

const emptyDetail = (): WorkDetail => ({ answers: [], responses: [], text: '' });

/** Percent, rounded — the only score format the UI ever shows. */
export const percent = (correct: number, total: number): number =>
  total > 0 ? Math.round((correct / total) * 100) : 0;

// ── Reading documents ──────────────────────────────────────────────────────

const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

const toClass = (id: string, data: Record<string, unknown>): SchoolClass => ({
  id,
  name: asString(data.name),
  joinCode: asString(data.joinCode),
  teacherUid: asString(data.teacherUid),
  teacherEmail: asString(data.teacherEmail),
  teacherName: asString(data.teacherName),
  createdAt: asNumber(data.createdAt),
});

const toMember = (email: string, data: Record<string, unknown>): ClassMember => ({
  email,
  name: asString(data.name) || email,
  uid: typeof data.uid === 'string' ? data.uid : null,
  status: data.status === 'active' ? 'active' : 'invited',
  addedAt: asNumber(data.addedAt),
  joinedAt: typeof data.joinedAt === 'number' ? data.joinedAt : null,
});

const toAssignment = (id: string, data: Record<string, unknown>): ClassAssignment => {
  const kind: ClassKind =
    data.kind === 'quiz' || data.kind === 'writing' ? data.kind : 'vocabulary';
  const rawWords = Array.isArray(data.words) ? data.words : [];
  const rawQuestions = Array.isArray(data.questions) ? data.questions : [];
  return {
    id,
    kind,
    title: asString(data.title),
    instructions: asString(data.instructions),
    createdAt: asNumber(data.createdAt),
    dueAt: typeof data.dueAt === 'number' ? data.dueAt : null,
    passScore: typeof data.passScore === 'number' ? data.passScore : null,
    words: rawWords.map((item) => {
      const row = (item ?? {}) as Record<string, unknown>;
      return { term: asString(row.term), gloss: asString(row.gloss) };
    }),
    questions: rawQuestions.map((item) => {
      const row = (item ?? {}) as Record<string, unknown>;
      return {
        prompt: asString(row.prompt),
        choices: Array.isArray(row.choices) ? row.choices.map(asString) : [],
        answer: asNumber(row.answer),
      };
    }),
    prompt: asString(data.prompt),
    minWords: asNumber(data.minWords, 0),
  };
};

const toSubmission = (id: string, data: Record<string, unknown>): ClassSubmission => {
  const detail = (data.detail ?? {}) as Record<string, unknown>;
  const answers = Array.isArray(detail.answers) ? detail.answers : [];
  return {
    id,
    assignmentId: asString(data.assignmentId),
    uid: asString(data.uid),
    email: asString(data.email),
    name: asString(data.name),
    kind: data.kind === 'quiz' || data.kind === 'writing' ? data.kind : 'vocabulary',
    score: asNumber(data.score),
    passed: data.passed === true,
    attempts: asNumber(data.attempts, 1),
    detail: {
      answers: answers.map((item) => {
        const row = (item ?? {}) as Record<string, unknown>;
        return {
          term: asString(row.term),
          gloss: asString(row.gloss),
          guess: asString(row.guess),
          correct: row.correct === true,
        };
      }),
      responses: Array.isArray(detail.responses) ? detail.responses.map((n) => asNumber(n, -1)) : [],
      text: asString(detail.text),
    },
    submittedAt: asNumber(data.submittedAt),
    graded: data.graded === true,
    feedback: asString(data.feedback),
  };
};

// ── Codes ──────────────────────────────────────────────────────────────────

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Six characters, no O/0/I/1 — a code gets read aloud across a classroom. */
export const newJoinCode = (): string =>
  Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');

export const normalizeCode = (raw: string): string => raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

export const memberKey = (email: string): string => email.trim().toLowerCase();

/** Classes this browser has joined, so a student does not re-enter the code each time. */
export const readJoinedClasses = (): string[] => {
  try {
    const raw = localStorage.getItem(JOINED_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

export const rememberJoinedClass = (classId: string): void => {
  const next = [classId, ...readJoinedClasses().filter((id) => id !== classId)].slice(0, 10);
  try {
    localStorage.setItem(JOINED_KEY, JSON.stringify(next));
  } catch {
    /* Storage blocked — the class simply has to be re-entered next time. */
  }
};

export const forgetJoinedClass = (classId: string): void => {
  try {
    localStorage.setItem(JOINED_KEY, JSON.stringify(readJoinedClasses().filter((id) => id !== classId)));
  } catch {
    /* Storage blocked. */
  }
};

// ── Classes ────────────────────────────────────────────────────────────────

const collectionRef = () => {
  if (!db) throw new Error('Firestore is not configured.');
  return collection(db, CLASSES);
};

export const createClass = async (input: {
  name: string;
  teacherUid: string;
  teacherEmail: string;
  teacherName: string;
}): Promise<SchoolClass> => {
  const ref = doc(collectionRef());
  const joinCode = newJoinCode();
  const createdAt = Date.now();
  const record: SchoolClass = {
    id: ref.id,
    name: input.name.trim().slice(0, CLASS_NAME_MAX),
    joinCode,
    teacherUid: input.teacherUid,
    teacherEmail: memberKey(input.teacherEmail),
    teacherName: input.teacherName,
    createdAt,
  };
  await setDoc(ref, {
    name: record.name,
    joinCode,
    teacherUid: record.teacherUid,
    teacherEmail: record.teacherEmail,
    teacherName: record.teacherName,
    createdAt,
  });
  // The code is a public phone book entry: it maps a spoken code to a class id and
  // nothing else. Membership is still checked separately, so a leaked code opens no data.
  await setDoc(doc(db!, CODES, joinCode), { classId: ref.id, createdAt });
  return record;
};

export const fetchTeacherClasses = async (teacherUid: string): Promise<SchoolClass[]> => {
  const snap = await getDocs(query(collectionRef(), where('teacherUid', '==', teacherUid)));
  return snap.docs
    .map((item) => toClass(item.id, item.data() as Record<string, unknown>))
    .sort((a, b) => b.createdAt - a.createdAt);
};

export const fetchClass = async (classId: string): Promise<SchoolClass | null> => {
  const snap = await getDoc(doc(db!, CLASSES, classId));
  return snap.exists() ? toClass(snap.id, snap.data() as Record<string, unknown>) : null;
};

export const deleteClass = async (item: SchoolClass): Promise<void> => {
  await deleteDoc(doc(db!, CODES, item.joinCode)).catch(() => undefined);
  await deleteDoc(doc(db!, CLASSES, item.id));
  forgetJoinedClass(item.id);
};

// ── Roster ─────────────────────────────────────────────────────────────────

export const fetchMembers = async (classId: string): Promise<ClassMember[]> => {
  const snap = await getDocs(collection(db!, CLASSES, classId, 'members'));
  return snap.docs
    .map((item) => toMember(item.id, item.data() as Record<string, unknown>))
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const addMember = async (
  classId: string,
  input: { email: string; name: string },
): Promise<void> => {
  const key = memberKey(input.email);
  await setDoc(doc(db!, CLASSES, classId, 'members', key), {
    email: key,
    name: input.name.trim() || key,
    uid: null,
    status: 'invited',
    addedAt: Date.now(),
    joinedAt: null,
  });
};

export const removeMember = async (classId: string, email: string): Promise<void> => {
  await deleteDoc(doc(db!, CLASSES, classId, 'members', memberKey(email)));
};

/**
 * A student redeems the code the teacher handed out. The lookup goes through the public
 * code document, then the member document decides whether this email is actually on the
 * roster — a code alone never grants access to someone who was not added.
 */
export const joinClassByCode = async (
  code: string,
  identity: { email: string; uid: string; name: string },
): Promise<SchoolClass> => {
  const normalized = normalizeCode(code);
  if (normalized.length !== 6) throw new Error('Enter the six-character class code.');
  const codeSnap = await getDoc(doc(db!, CODES, normalized));
  if (!codeSnap.exists()) throw new Error('That code does not match any class.');
  const classId = asString((codeSnap.data() as Record<string, unknown>).classId);
  const key = memberKey(identity.email);
  const memberSnap = await getDoc(doc(db!, CLASSES, classId, 'members', key));
  if (!memberSnap.exists()) {
    throw new Error('That class does not have your email on its roster. Ask your teacher to add it.');
  }
  await updateDoc(doc(db!, CLASSES, classId, 'members', key), {
    uid: identity.uid,
    name: identity.name || key,
    status: 'active',
    joinedAt: Date.now(),
  });
  const found = await fetchClass(classId);
  if (!found) throw new Error('That class is no longer available.');
  rememberJoinedClass(classId);
  return found;
};

// ── Assignments ────────────────────────────────────────────────────────────

export const fetchAssignments = async (classId: string): Promise<ClassAssignment[]> => {
  const snap = await getDocs(collection(db!, CLASSES, classId, 'assignments'));
  return snap.docs
    .map((item) => toAssignment(item.id, item.data() as Record<string, unknown>))
    .sort((a, b) => a.createdAt - b.createdAt);
};

export const createAssignment = async (
  classId: string,
  input: NewAssignment,
): Promise<void> => {
  await addDoc(collection(db!, CLASSES, classId, 'assignments'), {
    kind: input.kind,
    title: input.title.trim(),
    instructions: input.instructions.trim(),
    createdAt: Date.now(),
    dueAt: input.dueAt,
    passScore: input.kind === 'writing' ? null : input.passScore,
    words: input.kind === 'vocabulary' ? input.words.slice(0, MAX_ASSIGNMENT_WORDS) : [],
    questions: input.kind === 'quiz' ? input.questions.slice(0, MAX_QUIZ_QUESTIONS) : [],
    prompt: input.kind === 'writing' ? input.prompt.trim() : '',
    minWords: input.kind === 'writing' ? input.minWords : 0,
  });
};

export const deleteAssignment = async (classId: string, assignmentId: string): Promise<void> => {
  await deleteDoc(doc(db!, CLASSES, classId, 'assignments', assignmentId));
};

// ── Submissions ────────────────────────────────────────────────────────────

export const submissionId = (assignmentId: string, uid: string): string => `${assignmentId}__${uid}`;

/**
 * Submissions for one class. Passing `uid` narrows the query to that student's own work —
 * the rules only grant a student a *filtered* list, never the whole collection, so the
 * filter has to live in the query rather than in the component.
 */
export const fetchSubmissions = async (classId: string, uid?: string): Promise<ClassSubmission[]> => {
  const source = collection(db!, CLASSES, classId, 'submissions');
  const snap = await getDocs(uid ? query(source, where('uid', '==', uid)) : source);
  return snap.docs.map((item) => toSubmission(item.id, item.data() as Record<string, unknown>));
};

export interface SubmitInput {
  classId: string;
  assignment: ClassAssignment;
  student: { uid: string; email: string; name: string };
  detail: WorkDetail;
  score: number;
}

/**
 * Records an attempt. The best score survives, the answer detail is always the latest
 * attempt, and a pass is sticky — a student who once cleared the line keeps the badge.
 */
export const submitWork = async ({ classId, assignment, student, detail, score }: SubmitInput): Promise<ClassSubmission> => {
  const id = submissionId(assignment.id, student.uid);
  const ref = doc(db!, CLASSES, classId, 'submissions', id);
  const existing = await getDoc(ref);
  const previous = existing.exists() ? toSubmission(id, existing.data() as Record<string, unknown>) : null;
  const passed = assignment.passScore === null ? false : score >= assignment.passScore;

  const next: Omit<ClassSubmission, 'id'> = {
    assignmentId: assignment.id,
    uid: student.uid,
    email: memberKey(student.email),
    name: student.name,
    kind: assignment.kind,
    score: Math.max(score, previous?.score ?? 0),
    passed: passed || (previous?.passed ?? false),
    attempts: (previous?.attempts ?? 0) + 1,
    detail,
    submittedAt: Date.now(),
    graded: previous?.graded ?? false,
    feedback: previous?.feedback ?? '',
  };
  await setDoc(ref, next, { merge: true });
  return { id, ...next };
};

/** Writing submissions wait for a human; the teacher sets the score and a note. */
export const gradeSubmission = async (
  classId: string,
  submissionIdValue: string,
  grade: { score: number; feedback: string; passScore: number | null },
): Promise<void> => {
  await setDoc(
    doc(db!, CLASSES, classId, 'submissions', submissionIdValue),
    {
      score: grade.score,
      passed: grade.passScore === null ? true : grade.score >= grade.passScore,
      graded: true,
      feedback: grade.feedback.trim(),
    },
    { merge: true },
  );
};

// ── Derived views ──────────────────────────────────────────────────────────

export interface WeakWord {
  term: string;
  gloss: string;
  missed: number;
  attempts: number;
}

/**
 * The words a class got wrong most often, across every vocabulary submission. This is the
 * report a teacher can act on tomorrow — not a scoreboard, a teaching list.
 */
export const weakestWords = (submissions: ClassSubmission[], limit = 6): WeakWord[] => {
  const tally = new Map<string, WeakWord>();
  for (const submission of submissions) {
    if (submission.kind !== 'vocabulary') continue;
    for (const answer of submission.detail.answers) {
      const key = answer.term.toLowerCase();
      const row = tally.get(key) ?? { term: answer.term, gloss: answer.gloss, missed: 0, attempts: 0 };
      row.attempts += 1;
      if (!answer.correct) row.missed += 1;
      tally.set(key, row);
    }
  }
  return [...tally.values()]
    .filter((row) => row.missed > 0)
    .sort((a, b) => b.missed - a.missed || b.missed / b.attempts - a.missed / a.attempts)
    .slice(0, limit);
};

export interface AssignmentStats {
  submitted: number;
  passed: number;
  average: number;
}

export const assignmentStats = (
  submissions: ClassSubmission[],
  assignmentId: string,
): AssignmentStats => {
  const rows = submissions.filter((item) => item.assignmentId === assignmentId);
  const gradedRows = rows.filter((item) => item.kind !== 'writing' || item.graded);
  const total = gradedRows.reduce((sum, item) => sum + item.score, 0);
  return {
    submitted: rows.length,
    passed: rows.filter((item) => item.passed).length,
    average: gradedRows.length ? Math.round(total / gradedRows.length) : 0,
  };
};

/** Word list → the shape Teacher Mode already knows how to test. */
export const assignmentWords = (assignment: ClassAssignment): TeacherWord[] =>
  assignment.words.map((word) => ({ word: word.term, meaning: word.gloss }));

export const isOverdue = (assignment: ClassAssignment, now = Date.now()): boolean =>
  assignment.dueAt !== null && now > assignment.dueAt;

export const emptyWorkDetail = emptyDetail;

/** What a student still owes, in the order the teacher created it. */
export const pendingAssignments = (
  assignments: ClassAssignment[],
  submissions: ClassSubmission[],
): ClassAssignment[] => {
  const done = new Set(submissions.filter((item) => item.passed || item.graded).map((item) => item.assignmentId));
  return assignments.filter((item) => !done.has(item.id));
};
