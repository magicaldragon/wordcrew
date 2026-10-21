import { AppError } from '../services/apiError';
import type { Dictionary } from './types';

type ErrorCopy = Dictionary['errors'];
type Entry = string | ((detail: string) => string);

/**
 * Turns a known code into a sentence. Codes without an entry keep the caller's fallback,
 * so a new server code can ship before this dictionary knows about it.
 */
function lookup(copy: ErrorCopy, code: string, detail: string, fallback: string): string {
  const entry = (copy as Record<string, Entry | undefined>)[code];
  if (typeof entry === 'function') return entry(detail);
  return entry ?? fallback;
}

/**
 * Turns anything thrown into a sentence the reader can act on.
 *
 * Known codes come from `AppError` (which the API's `{ code }` and the service layer
 * both produce). Anything else — a Firestore failure, a bug — keeps the caller's
 * fallback, because a raw English SDK message is worse than a short honest one.
 */
export function describeError(copy: ErrorCopy, error: unknown, fallback: string): string {
  if (!(error instanceof AppError)) return fallback;
  return lookup(copy, error.code, error.detail ?? '', fallback);
}

/** The same lookup for a bare code, e.g. the `code` on an `UnlockOutcome`. */
export function describeCode(copy: ErrorCopy, code: string | undefined, fallback: string): string {
  return code ? lookup(copy, code, '', fallback) : fallback;
}
