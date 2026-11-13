import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';
import { toast } from './Feedback';
import { DeckReviewDialog } from './DeckReviewDialog';
import { useT } from '../i18n/useT';
import {
  deckWarnings,
  guessPartOfSpeech,
  MAX_DECK_WORDS,
  newTeacherDeckId,
  parseTeacherWords,
  partOfSpeech,
  reportMissingGlosses,
  type TeacherDeck,
  type TeacherDeckStatus,
  type TeacherWord,
} from '../services/teacherDeck';

interface TeacherDeckEditorProps {
  /** Deck being edited, or null when the teacher is starting a new one. */
  deck: TeacherDeck | null;
  /** Returns true when the deck was stored — the caller owns the sign-in gate. */
  onSave: (deck: TeacherDeck) => boolean;
  onCancel: () => void;
  /** Only offered for a saved deck. */
  onDelete?: (deck: TeacherDeck) => void;
}

/**
 * Step one of building a deck: get the words in.
 *
 * Pasting is the only required action — glosses come from the bundled dictionary. Checking
 * what the class will actually see happens in the review dialog, so this screen stays a
 * single paste box no matter how long the deck gets.
 */
export const TeacherDeckEditor: React.FC<TeacherDeckEditorProps> = ({
  deck,
  onSave,
  onCancel,
  onDelete,
}) => {
  const t = useT('teacher');
  const { delete: deleteLabel } = useT('common');
  const [name, setName] = useState(deck?.name ?? '');
  const [words, setWords] = useState<TeacherWord[]>(deck?.words ?? []);
  const [paste, setPaste] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const pasteRef = useRef<HTMLTextAreaElement | null>(null);
  const warnings = useMemo(() => deckWarnings(words), [words]);
  const missing = [...warnings.values()].filter((warning) => warning === 'Missing meaning').length;
  /** What the paste box would add if the teacher pressed the button right now. */
  const detected = useMemo(() => (paste.trim() ? parseTeacherWords(paste).length : 0), [paste]);

  // The box grows with the list instead of trapping it behind a scrollbar: a 40-line
  // paste is reviewable at a glance, and pasting never hides the bulk of what arrived.
  useEffect(() => {
    const box = pasteRef.current;
    if (!box) return;
    box.style.height = 'auto';
    box.style.height = `${Math.min(box.scrollHeight, 240)}px`;
  }, [paste]);

  const addFromPaste = () => {
    const parsed = parseTeacherWords(paste);
    if (parsed.length === 0) {
      toast(t.editor.noWordsInList, 'error');
      return;
    }
    const known = new Set(words.map((entry) => entry.word.toLowerCase()));
    const fresh = parsed.filter((entry) => !known.has(entry.word.toLowerCase()));
    const room = MAX_DECK_WORDS - words.length;
    if (room <= 0) {
      toast(t.editor.deckFull(MAX_DECK_WORDS), 'error');
      return;
    }
    if (fresh.length === 0) {
      toast(t.editor.alreadyInDeck, 'error');
      return;
    }
    const added = fresh.slice(0, room);
    const unglossed = added.filter((entry) => !entry.meaning);
    setWords([...words, ...added]);
    setPaste('');
    // Words the bundled dictionary could not gloss; the server ranks them for the next
    // build of the offline map (see reportMissingGlosses).
    reportMissingGlosses(unglossed.map((entry) => entry.word));
    toast(
      unglossed.length > 0
        ? t.editor.wordsAddedMissing(added.length, unglossed.length)
        : t.editor.wordsAdded(added.length),
      unglossed.length > 0 ? 'info' : 'success',
    );
  };

  const updateWord = (index: number, patch: Partial<TeacherWord>) => {
    setWords((prev) => prev.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  };

  const removeWord = (index: number) => {
    setWords((prev) => prev.filter((_, i) => i !== index));
  };

  const openReview = () => {
    if (words.length === 0) {
      toast(t.editor.addAtLeastOne, 'error');
      return;
    }
    setReviewOpen(true);
  };

  const handleSave = (status: TeacherDeckStatus): boolean => {
    const cleaned = words
      .map((entry) => {
        const word = entry.word.trim();
        const pos = (entry.pos ?? guessPartOfSpeech(word)) || undefined;
        return { ...entry, word, meaning: entry.meaning.trim(), pos };
      })
      .filter((entry) => entry.word);
    if (cleaned.length === 0) {
      toast(t.editor.addAtLeastOne, 'error');
      return false;
    }
    if (cleaned.some((entry) => !entry.meaning)) {
      toast(t.editor.everyWordNeedsMeaning, 'error');
      return false;
    }
    const now = Date.now();
    return onSave({
      id: deck?.id ?? newTeacherDeckId(),
      name: name.trim() || t.editor.untitled,
      words: cleaned,
      createdAt: deck?.createdAt ?? now,
      updatedAt: now,
      status,
    });
  };

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4 animate-fadeInScaleUp">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="deck-name" className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-text">
            {t.editor.nameLabel}
          </label>
          <input
            id="deck-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t.editor.namePlaceholder}
            className="futuristic-input mt-1 w-full min-h-[44px] px-3 py-2 text-sm"
            maxLength={60}
          />
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="mt-5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-text hover:bg-cyber-purple/40 hover:text-light-text"
          aria-label={t.editor.closeAria}
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      <div className="rounded-lg border border-electric-blue/30 bg-dark-metal/50 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs font-semibold text-electric-blue">
            {t.editor.pasteTitle}
          </p>
          <span className="shrink-0 text-[0.7rem] tabular-nums text-muted-text">
            {t.editor.wordCount(words.length, MAX_DECK_WORDS)}
          </span>
        </div>
        <p className="mt-1 text-[0.7rem] leading-relaxed text-muted-text">
          <code className="text-light-text">journey</code> {t.editor.pasteHelpOr}{' '}
          <code className="text-light-text">journey - chuyến đi</code>{t.editor.pasteHelpTail}
        </p>
        <textarea
          ref={pasteRef}
          value={paste}
          onChange={(event) => setPaste(event.target.value)}
          rows={3}
          placeholder={'journey\nluggage - hành lý\ndeparture'}
          className="futuristic-input mt-2 min-h-[5rem] w-full resize-none overflow-y-auto px-3 py-2 font-mono text-xs leading-relaxed"
          aria-label={t.editor.pasteAria}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[0.7rem] tabular-nums text-electric-blue">
            {detected > 0 ? t.editor.detectedWords(detected) : ''}
          </span>
          <button
            type="button"
            onClick={addFromPaste}
            disabled={!paste.trim()}
            className="wc-btn wc-btn-secondary min-h-[44px] px-4 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="check" size={16} />
            {t.editor.addToDeck}
          </button>
        </div>
      </div>

      {/* The deck so far, not just its size: a chip per word means the teacher can see
          what actually landed — and spot the red ones — without opening the review sheet.
          Tapping a chip opens that sheet, which is where any word is edited. */}
      {words.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2">
            <p className="text-xs font-semibold text-light-text">{t.editor.previewTitle}</p>
            <p className="text-[0.65rem] text-muted-text">{t.editor.previewHint}</p>
          </div>
          <ul className="mt-2 flex max-h-44 flex-wrap gap-1.5 overflow-y-auto pr-1">
            {words.map((entry, index) => {
              const pos = partOfSpeech(entry);
              const noMeaning = !entry.meaning.trim();
              return (
                <li key={`${entry.word}-${index}`}>
                  <button
                    type="button"
                    onClick={openReview}
                    title={entry.meaning || t.editor.warningMissing}
                    className={`flex min-h-[44px] items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs transition-colors ${
                      noMeaning
                        ? 'border-danger-red/50 bg-danger-red/10 text-danger-red hover:bg-danger-red/20'
                        : 'border-white/10 bg-white/[0.06] text-light-text hover:border-electric-blue/50 hover:bg-white/[0.12]'
                    }`}
                  >
                    <span className="font-semibold">{entry.word}</span>
                    {pos && <span className="text-[0.65rem] font-normal opacity-70">{pos}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Only the words that still need a gloss are called out here: the total already
          sits in the paste card's header, so repeating it would be a third copy of the
          same number on one screen. */}
      {missing > 0 && (
        <p className="rounded-md border border-danger-red/40 bg-danger-red/10 px-3 py-2 text-[0.7rem] text-danger-red">
          {t.editor.warningsLeft(missing)}
        </p>
      )}

      {/* Save stays reachable: a 30-word deck is taller than any phone screen, so the
          action bar is pinned to the bottom of the scroll area instead of trailing the
          list — the teacher never has to scroll to the end to keep the deck. */}
      <div className="sticky bottom-0 z-10 -mx-3 -mb-3 mt-1 flex items-center gap-2 border-t border-white/10 bg-dark-metal/95 px-3 py-2 backdrop-blur sm:-mx-4 sm:-mb-4 sm:px-4">
        <button type="button" onClick={openReview} className="wc-btn wc-btn-primary min-h-[44px] flex-1 px-4">
          <Icon name="save" size={16} />
          {t.editor.openReview(words.length)}
        </button>
        {onDelete && deck && (
          <button
            type="button"
            onClick={() => onDelete(deck)}
            className="wc-btn wc-btn-secondary min-h-[44px] px-4 text-danger-red"
          >
            <Icon name="ban" size={16} />
            {deleteLabel}
          </button>
        )}
      </div>

      <DeckReviewDialog
        isOpen={reviewOpen}
        deckName={name}
        words={words}
        onUpdateWord={updateWord}
        onRemoveWord={removeWord}
        onSave={handleSave}
        onClose={() => setReviewOpen(false)}
      />
    </div>
  );
};
