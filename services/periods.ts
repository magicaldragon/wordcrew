// Calendar periods the app groups play by.
//
// Two periods matter, and both are plain strings so they can travel to Firestore as a
// single field:
//   * the local month — "2026-10" — what the Solo leaderboards reset on
//   * the local day   — "2026-10-16" — what Today's Challenge is seeded from
//
// Everything is computed from the player's own clock (both the day and the month are
// local, so a board flips at the player's midnight). Both are cheap and dependency-free.

/** Local calendar day as `YYYY-MM-DD`. */
export const localDateId = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** `date` shifted by whole days (used to detect a streak continuing). */
export const addDays = (date: Date, days: number): Date => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

/** Local calendar month as `YYYY-MM` — the period a track leaderboard resets on. */
export const monthId = (date: Date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
