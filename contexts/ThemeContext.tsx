import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  /** True when the portal should render its dark palette. */
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ isDark: false, toggleTheme: () => {} });

/**
 * Dark/light for the portal, mirroring WiseSpeak: the choice is remembered in
 * `localStorage` and otherwise follows the OS setting. Everything flips through the
 * `.dark` class on <html>, which drives both the `.wc-theme` tokens and Tailwind's
 * `dark:` utilities.
 */
const readInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = window.localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Private mode / blocked storage — fall through to the OS preference.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      window.localStorage.setItem('theme', theme);
    } catch {
      // Persisting is a nicety; a blocked storage must not break rendering.
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark: theme === 'dark', toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => useContext(ThemeContext);
