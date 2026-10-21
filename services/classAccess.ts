/**
 * The My Class gate.
 *
 * Two sides, two rules:
 *
 *   students  free, forever. A class the teacher has already opened costs the student
 *             nothing — charging both ends of a classroom would kill the loop before it
 *             starts, and a student is exactly the person we want to upgrade to Pro later.
 *   teachers  free until the launch date, then part of the full version. Opening a class,
 *             keeping a roster and setting work is the product teachers pay for.
 *
 * The date lives in one place, and the gate closes by itself when it passes, so the
 * promise holds even if nobody deploys on the day.
 */
export type ClassConsoleAccessMode = 'open' | 'paid';

/**
 * Mutable on purpose: a plain `const` literal would be narrowed to `'open'` at compile
 * time, so the `'paid'` branch would drop out of the build entirely.
 */
export const CLASS_GATE: { mode: ClassConsoleAccessMode; freeUntil: string } = {
  mode: 'open',
  freeUntil: '2026-11-30T23:59:59+07:00',
};

/** The deadline as it prints in the UI — derived, never retyped. */
export const CLASS_FREE_UNTIL_LABEL = new Date(CLASS_GATE.freeUntil).toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export const classGateMode = (): ClassConsoleAccessMode =>
  CLASS_GATE.mode === 'open' && Date.now() > Date.parse(CLASS_GATE.freeUntil)
    ? 'paid'
    : CLASS_GATE.mode;

export interface ClassConsoleViewer {
  /** Role-based: only a teacher ever reaches this check. */
  isTeacher: boolean;
  isAdmin: boolean;
  /** This device or account already owns the full version. */
  isPro: boolean;
}

export interface ClassConsoleAccess {
  mode: ClassConsoleAccessMode;
  allowed: boolean;
}

export const classConsoleAccess = (viewer: ClassConsoleViewer): ClassConsoleAccess => {
  const mode = classGateMode();
  if (viewer.isAdmin) return { mode, allowed: true };
  if (!viewer.isTeacher) return { mode, allowed: false };
  return { mode, allowed: mode === 'open' || viewer.isPro };
};
