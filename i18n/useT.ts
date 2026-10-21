import { useLanguage } from '../contexts/LanguageContext';
import { dictionaries } from './index';
import type { Dictionary, Namespace } from './types';

/**
 * The copy for one area, already in the reader's language.
 *
 *     const t = useT('dashboard');
 *     <h1>{t.sections.games.title}</h1>
 *
 * Returning the whole namespace object (instead of a `t('some.key')` call) keeps every
 * label typed and greppable: a typo is a compile error, and "where is this string used?"
 * is a normal IDE search.
 */
export function useT<K extends Namespace>(namespace: K): Dictionary[K] {
  const { lang } = useLanguage();
  return dictionaries[lang][namespace];
}
