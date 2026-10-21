import { useLanguage } from '../contexts/LanguageContext';

/**
 * The locale for dates and numbers. It sits next to `useT` because one decision drives
 * both: the language the UI speaks and how its dates and figures are written. A
 * Vietnamese page must not print "30 November 2026" in the middle of a sentence.
 */
export function useLocale(): string {
  const { lang } = useLanguage();
  return lang === 'vi' ? 'vi-VN' : 'en-GB';
}
