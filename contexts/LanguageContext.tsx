import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { dictionaries } from '../i18n';
import type { Language } from '../i18n/types';

interface LanguageContextValue {
  /** The language every screen should render in. */
  lang: Language;
  setLang: (language: Language) => void;
  toggleLang: () => void;
}

const STORAGE_KEY = 'wordcrew_language_v1';

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
  toggleLang: () => {},
});

/**
 * UI language for the whole app.
 *
 * The choice lives in `localStorage` so a tablet in a classroom keeps its language after
 * a reload. On the very first visit the browser's own language decides: a Vietnamese
 * teacher lands on a Vietnamese portal, everyone else gets English. The toggle then
 * overrides it for good.
 *
 * `<html lang>` is kept in sync because screen readers and the browser's own spellcheck
 * use it; without it a Vietnamese page is still announced with English phonemes.
 */
const readInitialLanguage = (): Language => {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'vi') return saved;
  } catch {
    // Private mode / blocked storage — fall through to the browser's preference.
  }
  // Keep this rule in step with the pre-mount script in index.html.
  return (window.navigator.language ?? '').toLowerCase().startsWith('vi') ? 'vi' : 'en';
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(readInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = lang;
    // The tab title is UI copy too — it is what a teacher sees while the game is open.
    document.title = dictionaries[lang].shell.documentTitle;
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Persisting is a nicety; a blocked storage must not break rendering.
    }
  }, [lang]);

  const setLang = useCallback((language: Language) => setLangState(language), []);
  const toggleLang = useCallback(
    () => setLangState((current) => (current === 'en' ? 'vi' : 'en')),
    [],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextValue => useContext(LanguageContext);
