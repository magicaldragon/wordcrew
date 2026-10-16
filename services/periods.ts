// Calendar periods the app groups play by.
//
// Two periods matter, and both are plain strings so they can travel to Firestore as a
// single indexed-free field:
//   * the ISO week  — "2026-W42" — what the Solo leaderboards reset on
//   * the local day — "2026-10-16" — what Today's Challenge is seeded from
//
// Everything is computed from the player's own clock (the day id is local, so a
// challenge flips at the player's midnight; the week id is ISO, so it is stable
// worldwide). Both are cheap and dependency-free.

const DAY_MS = 86_400_000;

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

/** ISO-8601 week as `YYYY-Www` — the Monday-based week that owns the given date. */
export const isoWeekId = (date: Date = new Date()): string => {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Thursday of this week decides which year the week belongs to.
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = Date.UTC(target.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((target.getTime() - yearStart) / DAY_MS + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};
