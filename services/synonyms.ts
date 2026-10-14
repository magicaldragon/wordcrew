// services/synonyms.ts
//
// English synonym lookup for the FIRST tier of the struggle hint. Uses the key-less
// Datamuse API (client-side, CORS-enabled) and caches each result locally so a word is
// only ever looked up once per device. Returns undefined when there is nothing useful
// (e.g. phrasal verbs), so the hint can fall straight through to the Vietnamese gloss.

const CACHE_PREFIX = 'wordcrew_syn_';
const MEMO = new Map<string, string | undefined>();
const MAX_SYNONYMS = 3;

const normalize = (word: string): string => word.trim().toLowerCase();

// null = cache miss, '' = cached "no synonym", anything else = the value.
const readCached = (key: string): string | null => {
  try {
    return localStorage.getItem(CACHE_PREFIX + key);
  } catch {
    return null;
  }
};

const writeCached = (key: string, value: string | undefined): void => {
  try {
    localStorage.setItem(CACHE_PREFIX + key, value ?? '');
  } catch {
    /* quota exceeded — the in-memory memo still covers this session */
  }
};

export async function resolveEnglishSynonym(
  word: string | undefined | null,
): Promise<string | undefined> {
  if (!word) return undefined;
  const key = normalize(word);
  if (MEMO.has(key)) return MEMO.get(key);

  const cached = readCached(key);
  if (cached !== null) {
    const value = cached || undefined;
    MEMO.set(key, value);
    return value;
  }

  let result: string | undefined;
  try {
    const response = await fetch(
      `https://api.datamuse.com/words?rel_syn=${encodeURIComponent(key)}&max=${MAX_SYNONYMS}`,
    );
    if (response.ok) {
      const data = (await response.json()) as Array<{ word?: string }>;
      const words = Array.isArray(data)
        ? data
            .map((entry) => (entry.word ?? '').trim())
            .filter((w) => w && w.toLowerCase() !== key && !w.includes(' '))
        : [];
      result = words.length ? words.slice(0, MAX_SYNONYMS).join(' / ') : undefined;
    }
  } catch (error) {
    // Offline or blocked: leave result undefined and let the gloss tier carry the hint.
    console.warn('Datamuse synonym lookup failed', error);
  }

  MEMO.set(key, result);
  writeCached(key, result);
  return result;
}
