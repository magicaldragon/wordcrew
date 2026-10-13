import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Sun/moon switch for the portal app bar. Ported from the WiseSpeak header control:
 * a 44px round target so it stays comfortable to tap on a tablet.
 */
export const ThemeToggle: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--wn-4)] bg-[var(--wn-2)] text-[var(--wn-11)] transition hover:border-[var(--wn-5)] hover:bg-[var(--wn-3)] hover:text-[var(--wn-12)]"
      aria-label={label}
      title={label}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" />
          <path
            strokeLinecap="round"
            d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4L17 7M7 17l-1.6 1.6"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a6.8 6.8 0 0 0 10.7 10.7Z" />
        </svg>
      )}
    </button>
  );
};
