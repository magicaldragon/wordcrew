/**
 * The My Class gate.
 *
 * My Class is free for everyone, with no deadline and no purchase: a teacher opens the
 * console because their account carries the teacher role, and every student joins at no
 * cost. Charging to run a classroom would put the paywall on the wrong side of the loop —
 * the students are the ones who keep playing, and a class that cannot be set up is a class
 * that never sees the product.
 *
 * The role check stays: roles are granted by an admin, so a student account still cannot
 * open a class of their own. That is a permission, not a price.
 */
export interface ClassConsoleViewer {
  /** Role-based: only a teacher ever reaches this check. */
  isTeacher: boolean;
  isAdmin: boolean;
}

export interface ClassConsoleAccess {
  allowed: boolean;
}

export const classConsoleAccess = (viewer: ClassConsoleViewer): ClassConsoleAccess => ({
  allowed: viewer.isTeacher || viewer.isAdmin,
});
