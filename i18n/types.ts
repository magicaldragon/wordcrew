import type { en } from './en';

/** The two languages the portal ships with. */
export type Language = 'en' | 'vi';

/**
 * The English dictionary is the shape every other language must match, so a missing key
 * is a compile error instead of a blank label in production.
 */
export type Dictionary = typeof en;

/** One file per area of the app — see `en/index.ts`. */
export type Namespace = keyof Dictionary;
