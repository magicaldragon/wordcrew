import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { useT } from '../i18n/useT';
import {
  deckWarnings,
  MAX_DECK_WORDS,
  partOfSpeech,
  TEACHER_POS,
  type TeacherDeckStatus,
  type TeacherPos,
  type TeacherWord,
} from '../services/teacherDeck';

interface DeckReviewDialogProps {
  isOpen: boolean;
  /** Only used as a subtitle — the deck itself is still a draft until it is saved. */
  deckName: string;
  words: TeacherWord[];
  /** Edits are applied to the draft the caller owns, so closing loses nothing. */
  onUpdateWord: (index: number, patch: Partial<TeacherWord>) => void;
  onRemoveWord: (index: number) => void;
  /** Returns true when the deck was actually saved, which is what closes the dialog. */
  onSave: (status: TeacherDeckStatus) => boolean;
  onClose: () => void;
}

/**
 * The second half of building a deck: the words are in, now the teacher checks what the
 * class will actually see. It is a wide sheet dropped from the top edge, because every row
 * is one line on a laptop (word · type · meaning) and that is the fastest way to scan 30
 * words. The page behind it is dimmed and blurred so nothing competes with the list.
 */
export const DeckReviewDialog: React.FC<DeckReviewDialogProps> = ({
  isOpen,
  deckName,
  words,
  onUpdateWord,
  onRemoveWord,
  onSave,
  onClose,
}) => {
  const t = useT('teacher');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    // The sheet covers the page, so the page behind it must not scroll with it.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const warnings = deckWarnings(words);
  const missing = [...warnings.values()].filter((warning) => warning === 'Missing meaning').length;

  const handleSave = (status: TeacherDeckStatus) => {
    if (onSave(status)) onClose();
  };

  // Portalled to <body> on purpose: the deck editor sits inside an animated card, and a
  // transformed ancestor would trap `fixed` inside that card instead of the viewport.
  return createPortal(
    <div
      className="fixed inset-0 z-[var(--z-dialog)] flex items-start justify-center overflow-hidden bg-black/60 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deckReviewTitle"
      onClick={onClose}
    >
      <div
        className="flex h-[100dvh] w-full max-w-5xl flex-col overflow-hidden border-x border-b border-[var(--hairline-strong)] bg-[var(--surface-2)] shadow-[var(--elev-4)] sm:h-auto sm:max-h-[92dvh] sm:rounded-b-[var(--r-xl)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-white/10 px-3 py-2.5 sm:px-5 sm:py-3">
          <div className="min-w-0">
            <h2
              id="deckReviewTitle"
              className="font-heading text-base font-bold tracking-wide text-light-text sm:text-lg"
            >
              {t.editor.reviewDialogTitle}
            </h2>
            <p className="mt-0.5 truncate text-[0.7rem] text-muted-text">
              {deckName.trim() || t.editor.untitled} · {t.editor.wordCount(words.length, MAX_DECK_WORDS)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-text hover:bg-cyber-purple/40 hover:text-light-text"
            aria-label={t.editor.closeAria}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-4 sm:py-3">
          <p className="hidden px-1 pb-1.5 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-text sm:grid sm:grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1.4fr)_2.75rem] sm:gap-1.5">
            <span>{t.editor.wordLabel}</span>
            <span>{t.editor.posLabel}</span>
            <span>{t.editor.meaningLabel}</span>
            <span className="sr-only">{t.editor.removeLabel}</span>
          </p>
          <div className="flex flex-col gap-1">
            {words.map((entry, index) => {
              const warning = warnings.get(index);
              const pos = partOfSpeech(entry);
              return (
                <div
                  key={index}
                  className={`rounded-md px-1.5 py-1.5 ${
                    index % 2 === 0 ? 'bg-white/[0.04]' : 'bg-white/[0.09]'
                  }`}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_2.75rem] gap-1.5 sm:grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1.4fr)_2.75rem]">
                    <input
                      value={entry.word}
                      onChange={(event) => onUpdateWord(index, { word: event.target.value })}
                      className="futuristic-input col-start-1 row-start-1 min-h-[44px] min-w-0 px-2 py-1.5 text-sm font-semibold"
                      aria-label={t.editor.wordAria(index + 1)}
                    />
                    <select
                      value={pos}
                      onChange={(event) =>
                        onUpdateWord(index, {
                          pos: (event.target.value || undefined) as TeacherPos | undefined,
                        })
                      }
                      className="futuristic-input col-start-2 row-start-1 min-h-[44px] w-full px-1 py-1.5 text-xs font-semibold"
                      aria-label={t.editor.posAria(entry.word || `#${index + 1}`)}
                    >
                      <option value="">—</option>
                      {TEACHER_POS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <input
                      value={entry.meaning}
                      onChange={(event) => onUpdateWord(index, { meaning: event.target.value })}
                      className={`futuristic-input col-span-3 row-start-2 min-h-[44px] w-full min-w-0 px-2 py-1.5 text-sm sm:col-span-1 sm:col-start-3 sm:row-start-1 ${
                        warning === 'Missing meaning' ? 'border-danger-red/70' : ''
                      }`}
                      aria-label={t.editor.meaningAria(entry.word)}
                      placeholder={t.editor.meaningPlaceholder}
                    />
                    <button
                      type="button"
                      onClick={() => onRemoveWord(index)}
                      className="col-start-3 row-start-1 flex h-11 w-full items-center justify-center rounded-md text-muted-text hover:bg-danger-red/20 hover:text-danger-red sm:col-start-4"
                      aria-label={t.editor.removeAria(entry.word)}
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </div>
                  {warning && (
                    <p
                      className={`mt-1 px-1 text-[0.65rem] ${
                        warning === 'Missing meaning' ? 'text-danger-red' : 'text-warning-yellow'
                      }`}
                    >
                      {warning === 'Duplicate meaning'
                        ? t.editor.warningDuplicate
                        : t.editor.warningMissing}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-white/10 px-3 py-2.5 sm:px-5 sm:py-3">
          {missing > 0 && (
            <span className="w-full text-[0.7rem] text-danger-red sm:mr-auto sm:w-auto">
              {t.editor.warningsLeft(missing)}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="wc-btn wc-btn-secondary min-h-[44px] px-4"
          >
            {t.editor.reviewBack}
          </button>
          <button
            type="button"
            onClick={() => handleSave('draft')}
            className="wc-btn wc-btn-secondary min-h-[44px] px-4"
          >
            {t.editor.saveDraft}
          </button>
          <button
            type="button"
            onClick={() => handleSave('ready')}
            className="wc-btn wc-btn-primary min-h-[44px] flex-1 px-4"
          >
            <Icon name="save" size={16} />
            {t.editor.saveReady}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
