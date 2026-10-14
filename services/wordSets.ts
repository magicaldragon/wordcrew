/**
 * Word sets a teacher keeps on this device. They sit in localStorage beside the other
 * device-scoped settings, so a classroom laptop reuses a curated list in one tap instead
 * of retyping it — and it keeps working with no network.
 */
export interface SavedWordSet {
  id: string;
  name: string;
  words: string[];
  createdAt: number;
}

const STORAGE_KEY = 'wordcrew_word_sets';
// Enough for a term's worth of topics without letting the list grow unbounded.
const MAX_SETS = 60;

export const readWordSets = (): SavedWordSet[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedWordSet =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as SavedWordSet).id === 'string' &&
        typeof (item as SavedWordSet).name === 'string' &&
        Array.isArray((item as SavedWordSet).words),
    );
  } catch {
    return [];
  }
};

const writeWordSets = (sets: SavedWordSet[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
  } catch {
    /* Storage unavailable: the set simply lasts for this session. */
  }
};

/** Saves a list under `name`, replacing any set that already carries that name. */
export const addWordSet = (sets: SavedWordSet[], name: string, words: string[]): SavedWordSet[] => {
  const trimmed = name.trim() || 'Untitled set';
  const next: SavedWordSet[] = [
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: trimmed,
      words,
      createdAt: Date.now(),
    },
    // A re-save under the same name is an edit, not a duplicate.
    ...sets.filter((set) => set.name.toLowerCase() !== trimmed.toLowerCase()),
  ].slice(0, MAX_SETS);
  writeWordSets(next);
  return next;
};

export const removeWordSet = (sets: SavedWordSet[], id: string): SavedWordSet[] => {
  const next = sets.filter((set) => set.id !== id);
  writeWordSets(next);
  return next;
};
