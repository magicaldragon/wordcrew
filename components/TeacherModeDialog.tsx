import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { useT } from '../i18n/useT';
import { TEACHER_TEST_MODES, type TeacherTestMode } from '../services/teacherDeck';

interface TeacherModeDialogProps {
  isOpen: boolean;
  /** How many words the run will ask — shown on the start button. */
  wordCount: number;
  onCancel: () => void;
  onStart: (mode: TeacherTestMode) => void;
}

/**
 * The question style is picked once, at the moment a deck test is about to start, so
 * studying the cards and testing them are two separate decisions.
 */
export const TeacherModeDialog: React.FC<TeacherModeDialogProps> = ({
  isOpen,
  wordCount,
  onCancel,
  onStart,
}) => {
  const t = useT('teacher');
  const { cancel } = useT('common');
  const [mode, setMode] = useState<TeacherTestMode>('listen');

  // Every opening starts from the same default, so a previous choice never leaks in.
  useEffect(() => {
    if (isOpen) setMode('listen');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[var(--z-dialog)] flex items-center justify-center bg-black/60 p-3 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="teacherModeTitle"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl border border-[var(--hairline-strong)] bg-[var(--surface-2)] p-4 shadow-[var(--elev-4)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2
              id="teacherModeTitle"
              className="font-heading text-base font-bold tracking-wide text-light-text"
            >
              {t.setup.modeTitle}
            </h2>
            <p className="mt-0.5 text-[0.7rem] leading-relaxed text-muted-text">{t.setup.modeHint}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label={cancel}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-text hover:bg-cyber-purple/40 hover:text-light-text"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="mt-3 grid gap-2" role="radiogroup" aria-label={t.setup.modeTitle}>
          {TEACHER_TEST_MODES.map((id) => {
            const active = id === mode;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setMode(id)}
                className={`flex min-h-[44px] flex-col items-start gap-0.5 rounded-lg border-2 p-2.5 text-left transition-colors ${
                  active
                    ? 'border-electric-blue bg-electric-blue/10'
                    : 'border-white/10 bg-dark-metal/40 hover:border-electric-blue/60'
                }`}
              >
                <span className={`text-xs font-bold ${active ? 'text-electric-blue' : 'text-light-text'}`}>
                  {t.setup.modes[id].label}
                </span>
                <span className="text-[0.7rem] leading-snug text-muted-text">{t.setup.modes[id].hint}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="wc-btn wc-btn-secondary min-h-[44px] flex-1"
          >
            {cancel}
          </button>
          <button
            type="button"
            onClick={() => onStart(mode)}
            className="wc-btn wc-btn-primary min-h-[44px] flex-1"
          >
            <Icon name="play" size={16} />
            {t.review.startTest(wordCount)}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
