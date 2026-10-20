import React, { useMemo, useState } from 'react';
import { Icon } from './Icon';
import { toast } from './Feedback';
import {
  deckWarnings,
  MAX_DECK_WORDS,
  newTeacherDeckId,
  parseTeacherWords,
  type TeacherDeck,
  type TeacherWord,
} from '../services/teacherDeck';

interface TeacherDeckEditorProps {
  /** Deck being edited, or null when the teacher is starting a new one. */
  deck: TeacherDeck | null;
  onSave: (deck: TeacherDeck) => void;
  onCancel: () => void;
  /** Only offered for a saved deck. */
  onDelete?: (deck: TeacherDeck) => void;
}

/**
 * Paste → review → save. The paste box is the only required step: glosses are filled
 * from the bundled dictionary, and the table is where the teacher fixes the words whose
 * meaning in this lesson is not the most common one.
 */
export const TeacherDeckEditor: React.FC<TeacherDeckEditorProps> = ({
  deck,
  onSave,
  onCancel,
  onDelete,
}) => {
  const [name, setName] = useState(deck?.name ?? '');
  const [words, setWords] = useState<TeacherWord[]>(deck?.words ?? []);
  const [paste, setPaste] = useState('');
  const warnings = useMemo(() => deckWarnings(words), [words]);

  const addFromPaste = () => {
    const parsed = parseTeacherWords(paste);
    if (parsed.length === 0) {
      toast('No words found in the list.', 'error');
      return;
    }
    const known = new Set(words.map((entry) => entry.word.toLowerCase()));
    const fresh = parsed.filter((entry) => !known.has(entry.word.toLowerCase()));
    const room = MAX_DECK_WORDS - words.length;
    if (room <= 0) {
      toast(`A deck holds at most ${MAX_DECK_WORDS} words.`, 'error');
      return;
    }
    if (fresh.length === 0) {
      toast('Those words are already in the deck.', 'error');
      return;
    }
    setWords([...words, ...fresh.slice(0, room)]);
    setPaste('');
    const auto = fresh.filter((entry) => !entry.meaning).length;
    toast(
      `${Math.min(fresh.length, room)} words added${auto > 0 ? ` · ${auto} still need a meaning` : ''}.`,
      auto > 0 ? 'info' : 'success',
    );
  };

  const updateWord = (index: number, patch: Partial<TeacherWord>) => {
    setWords((prev) => prev.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  };

  const removeWord = (index: number) => {
    setWords((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const cleaned = words
      .map((entry) => ({
        ...entry,
        word: entry.word.trim(),
        meaning: entry.meaning.trim(),
      }))
      .filter((entry) => entry.word);
    if (cleaned.length === 0) {
      toast('Add at least one word first.', 'error');
      return;
    }
    if (cleaned.some((entry) => !entry.meaning)) {
      toast('Every word needs a meaning — fix the rows marked in red.', 'error');
      return;
    }
    const now = Date.now();
    onSave({
      id: deck?.id ?? newTeacherDeckId(),
      name: name.trim() || 'Untitled deck',
      words: cleaned,
      createdAt: deck?.createdAt ?? now,
      updatedAt: now,
    });
  };

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4 animate-fadeInScaleUp">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="deck-name" className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-text">
            Deck name
          </label>
          <input
            id="deck-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Unit 4 — Travel"
            className="futuristic-input mt-1 w-full min-h-[44px] px-3 py-2 text-sm"
            maxLength={60}
          />
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="mt-5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-text hover:bg-cyber-purple/40 hover:text-light-text"
          aria-label="Close the deck editor"
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      <div className="rounded-lg border border-electric-blue/30 bg-dark-metal/50 p-3">
        <p className="text-xs font-semibold text-electric-blue">
          Paste a list — one word per line
        </p>
        <p className="mt-1 text-[0.7rem] leading-relaxed text-muted-text">
          <code className="text-light-text">journey</code> or{' '}
          <code className="text-light-text">journey - chuyến đi</code>. Meanings you leave
          out are filled from the built-in dictionary.
        </p>
        <textarea
          value={paste}
          onChange={(event) => setPaste(event.target.value)}
          rows={4}
          placeholder={'journey\nluggage - hành lý\ndeparture'}
          className="futuristic-input mt-2 w-full resize-y px-3 py-2 font-mono text-xs leading-relaxed"
          aria-label="Words to add, one per line"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[0.7rem] text-muted-text">
            {words.length}/{MAX_DECK_WORDS} words
          </span>
          <button
            type="button"
            onClick={addFromPaste}
            disabled={!paste.trim()}
            className="wc-btn wc-btn-secondary min-h-[44px] px-4 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="check" size={16} />
            Add to deck
          </button>
        </div>
      </div>

      {words.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-text">
            Review · the prompt is what the student sees
          </p>
          {words.map((entry, index) => {
            const warning = warnings.get(index);
            return (
              <div key={`${entry.word}-${index}`} className="rounded-md border border-white/10 bg-dark-metal/40 p-2">
                <div className="flex items-center gap-1.5">
                  <input
                    value={entry.word}
                    onChange={(event) => updateWord(index, { word: event.target.value })}
                    className="futuristic-input min-h-[44px] w-[42%] min-w-0 px-2 py-1.5 text-sm font-semibold"
                    aria-label={`Word ${index + 1}`}
                  />
                  <input
                    value={entry.meaning}
                    onChange={(event) => updateWord(index, { meaning: event.target.value })}
                    className={`futuristic-input min-h-[44px] min-w-0 flex-1 px-2 py-1.5 text-sm ${
                      warning === 'Missing meaning' ? 'border-danger-red/70' : ''
                    }`}
                    aria-label={`Vietnamese meaning for ${entry.word}`}
                    placeholder="Nghĩa tiếng Việt"
                  />
                  <button
                    type="button"
                    onClick={() => removeWord(index)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-text hover:bg-danger-red/20 hover:text-danger-red"
                    aria-label={`Remove ${entry.word}`}
                  >
                    <Icon name="close" size={16} />
                  </button>
                </div>
                {warning && (
                  <p className={`mt-1 text-[0.65rem] ${warning === 'Missing meaning' ? 'text-danger-red' : 'text-warning-yellow'}`}>
                    {warning === 'Duplicate meaning'
                      ? 'Another word has the same meaning — the question may be ambiguous.'
                      : warning}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={handleSave} className="wc-btn wc-btn-primary min-h-[44px] flex-1 px-4">
          <Icon name="save" size={16} />
          Save deck
        </button>
        {onDelete && deck && (
          <button
            type="button"
            onClick={() => onDelete(deck)}
            className="wc-btn wc-btn-secondary min-h-[44px] px-4 text-danger-red"
          >
            <Icon name="ban" size={16} />
            Delete
          </button>
        )}
      </div>
    </div>
  );
};
