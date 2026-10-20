import React, { useState } from 'react';
import { Icon } from './Icon';
import { confirmDialog, toast } from './Feedback';
import { TeacherDeckEditor } from './TeacherDeckEditor';
import {
  deleteTeacherDeck,
  readTeacherDecks,
  saveTeacherDeck,
  TEACHER_LEVELS,
  TEACHER_WORD_COUNTS,
  type TeacherDeck,
  type TeacherLevelId,
} from '../services/teacherDeck';

interface TeacherSetupScreenProps {
  onStartLevel: (levelId: TeacherLevelId, count: number) => void;
  onStartDeck: (deck: TeacherDeck) => void;
  onExit: () => void;
}

type TabId = 'level' | 'decks';

/**
 * Teacher Mode's front door. Two sources, one shape of test: pick a level and the words
 * come from that band only, or pick a deck the teacher built from this week's lesson.
 * Nothing here touches the leaderboard, the hearts or the Memory Anchors.
 */
export const TeacherSetupScreen: React.FC<TeacherSetupScreenProps> = ({
  onStartLevel,
  onStartDeck,
  onExit,
}) => {
  const [tab, setTab] = useState<TabId>('level');
  const [levelId, setLevelId] = useState<TeacherLevelId>('A1');
  const [count, setCount] = useState(10);
  const [decks, setDecks] = useState<TeacherDeck[]>(() => readTeacherDecks());
  // null = list, 'new' = a deck being built, a deck = that deck being edited.
  const [editing, setEditing] = useState<TeacherDeck | 'new' | null>(null);

  const handleSave = (deck: TeacherDeck) => {
    setDecks(saveTeacherDeck(deck));
    setEditing(null);
    toast('Deck saved on this device.', 'success');
  };

  const handleDelete = async (deck: TeacherDeck) => {
    const ok = await confirmDialog(`Delete “${deck.name}” and its ${deck.words.length} words?`, {
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    setDecks(deleteTeacherDeck(deck.id));
    setEditing(null);
    toast('Deck deleted.', 'success');
  };

  if (editing) {
    return (
      <TeacherDeckEditor
        deck={editing === 'new' ? null : editing}
        onSave={handleSave}
        onCancel={() => setEditing(null)}
        onDelete={editing === 'new' ? undefined : handleDelete}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs leading-relaxed text-muted-text">
            One level per test, fixed length, a report at the end — no hearts, no score.
          </p>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-semibold text-muted-text hover:bg-cyber-purple/30 hover:text-light-text"
        >
          <Icon name="arrowLeft" size={16} />
          Dashboard
        </button>
      </div>

      <div className="flex gap-1 rounded-lg border border-white/10 bg-dark-metal/40 p-1" role="tablist" aria-label="Teacher word source">
        {([
          { id: 'level' as TabId, label: 'Level test', emoji: '🎯' },
          { id: 'decks' as TabId, label: `My decks${decks.length ? ` (${decks.length})` : ''}`, emoji: '🗂️' },
        ]).map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`min-h-[44px] flex-1 rounded-md px-3 text-sm font-semibold transition-colors ${
              tab === item.id
                ? 'bg-electric-blue/20 text-electric-blue'
                : 'text-muted-text hover:text-light-text'
            }`}
          >
            <span aria-hidden="true">{item.emoji}</span> {item.label}
          </button>
        ))}
      </div>

      {tab === 'level' ? (
        <>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Level">
            {TEACHER_LEVELS.map((level) => {
              const active = level.id === levelId;
              return (
                <button
                  key={level.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setLevelId(level.id)}
                  className={`flex min-h-[44px] flex-col items-start gap-0.5 rounded-lg border-2 p-3 text-left transition-colors ${
                    active
                      ? 'border-neon-green bg-neon-green/10'
                      : 'border-white/10 bg-dark-metal/40 hover:border-electric-blue/60'
                  }`}
                >
                  <span className={`text-sm font-bold ${active ? 'text-neon-green' : 'text-light-text'}`}>
                    <span aria-hidden="true">{level.emoji}</span> {level.id}
                  </span>
                  <span className="text-[0.7rem] leading-snug text-muted-text">{level.tagline}</span>
                </button>
              );
            })}
          </div>

          <div>
            <p className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-text">
              Words in this test
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TEACHER_WORD_COUNTS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCount(option)}
                  aria-pressed={count === option}
                  className={`min-h-[44px] min-w-[44px] rounded-md border px-3 text-sm font-semibold tabular-nums transition-colors ${
                    count === option
                      ? 'border-neon-green bg-neon-green/15 text-neon-green'
                      : 'border-white/10 text-muted-text hover:border-electric-blue/60 hover:text-light-text'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onStartLevel(levelId, count)}
            className="wc-btn wc-btn-primary min-h-[48px] w-full"
          >
            <Icon name="play" size={16} />
            Start {levelId} test · {count} words
          </button>
          <p className="text-center text-[0.7rem] leading-relaxed text-muted-text">
            Level-locked: every word comes from {levelId} only. The student types the
            English word for the Vietnamese prompt.
          </p>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-text">
              Saved on this device
            </p>
            <button
              type="button"
              onClick={() => setEditing('new')}
              className="wc-btn wc-btn-secondary min-h-[44px] px-3"
            >
              <Icon name="save" size={16} />
              New deck
            </button>
          </div>

          {decks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/15 p-5 text-center">
              <p className="text-sm font-semibold text-light-text">No decks yet</p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-text">
                Paste this week’s word list — one word per line. Meanings are filled in
                automatically and you review them before the class sees the test.
              </p>
              <button
                type="button"
                onClick={() => setEditing('new')}
                className="wc-btn wc-btn-primary mt-3 min-h-[44px] px-4"
              >
                Build the first deck
              </button>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {decks.map((deck) => (
                <li key={deck.id} className="rounded-lg border border-white/10 bg-dark-metal/40 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-light-text">{deck.name}</p>
                      <p className="mt-0.5 text-[0.7rem] text-muted-text">
                        {deck.words.length} words · edited {new Date(deck.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(deck)}
                        className="flex h-11 w-11 items-center justify-center rounded-md text-muted-text hover:bg-electric-blue/20 hover:text-electric-blue"
                        aria-label={`Edit ${deck.name}`}
                      >
                        <Icon name="pencil" size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(deck)}
                        className="flex h-11 w-11 items-center justify-center rounded-md text-muted-text hover:bg-danger-red/20 hover:text-danger-red"
                        aria-label={`Delete ${deck.name}`}
                      >
                        <Icon name="ban" size={16} />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onStartDeck(deck)}
                    className="wc-btn wc-btn-primary mt-2 min-h-[44px] w-full"
                  >
                    <Icon name="play" size={16} />
                    Test this deck
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};
