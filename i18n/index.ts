import { en } from './en';
import { vi } from './vi';
import type { Dictionary, Language } from './types';

export const dictionaries: Record<Language, Dictionary> = { en, vi };

/** Order matters: the toggle cycles through this list. */
export const LANGUAGES: Language[] = ['en', 'vi'];

export type { Dictionary, Language, Namespace } from './types';
