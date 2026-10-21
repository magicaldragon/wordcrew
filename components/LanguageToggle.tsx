import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useT } from '../i18n/useT';
import { Icon } from './Icon';

/**
 * EN/VI switch for the portal app bar.
 *
 * The label always names the language you would switch *to*, matching the sun/moon
 * control beside it, and the code shown is the language you are reading right now.
 */
export const LanguageToggle: React.FC = () => {
  const { lang, toggleLang } = useLanguage();
  const t = useT('common');
  const label = lang === 'en' ? t.switchToVietnamese : t.switchToEnglish;

  return (
    <button
      type="button"
      onClick={toggleLang}
      className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-[var(--wn-4)] bg-[var(--wn-2)] px-3 text-[var(--wn-11)] transition hover:border-[var(--wn-5)] hover:bg-[var(--wn-3)] hover:text-[var(--wn-12)]"
      aria-label={label}
      title={label}
    >
      <Icon name="globe" size={18} />
      <span className="text-xs font-bold uppercase tracking-wider">{lang}</span>
    </button>
  );
};
