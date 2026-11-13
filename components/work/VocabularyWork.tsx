import React, { useMemo, useState } from 'react';
import { Icon } from '../Icon';
import { FlashcardReviewScreen } from '../FlashcardReviewScreen';
import { TeacherTestScreen } from '../TeacherTestScreen';
import { useT } from '../../i18n/useT';
import { assignmentModes, assignmentWords, percent, type ClassAssignment } from '../../services/classes';
import {
  type TeacherAnswer,
  type TeacherDeck,
  type TeacherSession,
  type TeacherTestMode,
} from '../../services/teacherDeck';

interface VocabularyWorkProps {
  assignment: ClassAssignment;
  /** Answers kept from an earlier visit — the student continues where they stopped. */
  initialAnswers?: TeacherAnswer[];
  /** The working copy, saved after every part so another device can pick it up. */
  onDraft: (answers: TeacherAnswer[], score: number) => void;
  /** Hands the finished set in. */
  onSubmit: (answers: TeacherAnswer[], score: number) => void;
  onExit: () => void;
}

/**
 * Tool 1 — Vocabulary Check — run as homework.
 *
 * The assignment does not reimplement the vocabulary check: it hands the teacher's word
 * list to the same study-then-test flow the Teaching tools screen uses, so a student who
 * practised a deck this morning meets the same cards tonight.
 *
 * The teacher may ask the set one to four ways. The cards always come first — a Vietnamese
 * prompt with no prior exposure measures memory, not vocabulary — and then each style is
 * its own part with its own tab. A part is finished, saved, and the student is offered a
 * rest before the next one; nobody is pushed through all the parts in one sitting. Every
 * part is scored, reading aloud included, so the hand-in means the same thing each time.
 *
 * This file is the whole of "vocabulary homework". A multiple-choice assignment and a
 * writing assignment each have their own module (QuizWork, WritingWork); ClassWorkScreen
 * knows only the shell around them.
 */
export const VocabularyWork: React.FC<VocabularyWorkProps> = ({
  assignment,
  initialAnswers,
  onDraft,
  onSubmit,
  onExit,
}) => {
  const t = useT('myClass');
  const teacherT = useT('teacher');

  const modes = useMemo(() => assignmentModes(assignment), [assignment]);
  const deck = useMemo<TeacherDeck>(
    () => ({
      id: assignment.id,
      name: assignment.title,
      words: assignmentWords(assignment),
      createdAt: assignment.createdAt,
      updatedAt: assignment.createdAt,
    }),
    [assignment],
  );
  const words = deck.words;

  const [answers, setAnswers] = useState<TeacherAnswer[]>(() => initialAnswers ?? []);
  /** Which part is open; null is the rest screen between parts. */
  const [active, setActive] = useState<number | null>(() => (initialAnswers?.length ? null : 0));
  const [studying, setStudying] = useState(() => !initialAnswers?.length);
  /** The cards are being re-read from the rest screen rather than before the first test. */
  const [reviewOnly, setReviewOnly] = useState(false);

  /** Finished when every word was answered in that style. */
  const partStats = (mode: TeacherTestMode) => {
    const rows = answers.filter((answer) => answer.mode === mode);
    return {
      done: words.length > 0 && rows.length >= words.length,
      correct: rows.filter((answer) => answer.correct).length,
      total: rows.length,
    };
  };

  const remaining = modes.filter((mode) => !partStats(mode).done);
  const doneCount = modes.length - remaining.length;

  /** Unanswered words count as zero, so a half-done draft never reads as 100%. */
  const scoreOf = (list: TeacherAnswer[]): number => {
    if (modes.length === 0) return 0;
    const correct = list.filter((answer) => answer.correct).length;
    return percent(correct, modes.length * words.length);
  };

  const score = scoreOf(answers);
  const overall = modes.length > 0 ? Math.round((doneCount / modes.length) * 100) : 0;
  const canSubmit = assignment.passScore === null || score >= assignment.passScore;

  /** One finished part: replace whatever that style produced before, save, and rest. */
  const commitPart = (mode: TeacherTestMode, tabAnswers: TeacherAnswer[]) => {
    const next = [...answers.filter((answer) => answer.mode !== mode), ...tabAnswers];
    setAnswers(next);
    setActive(null);
    onDraft(next, scoreOf(next));
  };

  if (studying) {
    return (
      <FlashcardReviewScreen
        deck={deck}
        lockedMode={modes[0]}
        reviewOnly={reviewOnly}
        onStartTest={() => {
          setStudying(false);
          setReviewOnly(false);
        }}
        onExit={() => {
          // Re-reading the cards is a detour; leaving the first pass leaves the work.
          if (reviewOnly) {
            setStudying(false);
            setReviewOnly(false);
            return;
          }
          onExit();
        }}
      />
    );
  }

  if (active === null) {
    const nextMode = remaining[0];
    return (
      <div className="flex min-h-0 flex-grow flex-col gap-3 p-3 sm:p-4">
        <div>
          <div className="flex items-center justify-between text-[0.7rem] text-muted-text">
            <span>{t.work.tabs.progress(doneCount, modes.length)}</span>
            <span className="font-semibold text-light-text">{t.work.tabs.overall(overall)}</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10" aria-hidden="true">
            <span
              className="block h-full rounded-full bg-neon-green transition-[width] duration-300"
              style={{ width: `${overall}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-[var(--hairline)] bg-dark-metal/60 p-3">
          <p className="text-sm font-bold text-light-text">{t.work.tabs.breakTitle}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-text">{t.work.tabs.breakBody}</p>
        </div>

        <ul className="flex flex-col gap-2">
          {modes.map((mode, at) => {
            const stat = partStats(mode);
            return (
              <li key={mode}>
                <button
                  type="button"
                  onClick={() => setActive(at)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg border-2 p-3 text-left transition-colors ${
                    stat.done
                      ? 'border-neon-green/40 bg-neon-green/5'
                      : 'border-white/10 bg-dark-metal/40 hover:border-electric-blue/60'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-light-text">
                      {teacherT.setup.modes[mode].label}
                    </span>
                    <span className="block text-[0.7rem] text-muted-text">
                      {stat.done ? t.work.tabs.done : t.work.tabs.todo}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-light-text">
                    {stat.done ? (
                      t.work.tabs.score(stat.correct, stat.total)
                    ) : (
                      <Icon name="play" size={16} />
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              setReviewOnly(true);
              setStudying(true);
            }}
            className="wc-btn wc-btn-secondary min-h-[44px] w-full"
          >
            {t.work.tabs.review}
          </button>
          {nextMode ? (
            <button
              type="button"
              onClick={() => setActive(modes.indexOf(nextMode))}
              className="wc-btn wc-btn-primary min-h-[48px] w-full"
            >
              <Icon name="play" size={16} />
              {t.work.tabs.next(teacherT.setup.modes[nextMode].label)}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSubmit(answers, score)}
              disabled={!canSubmit}
              className="wc-btn wc-btn-primary min-h-[48px] w-full disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t.work.tabs.submit}
            </button>
          )}
          <p className="text-center text-[0.7rem] leading-relaxed text-muted-text">
            {nextMode
              ? t.work.tabs.needsAll(remaining.length)
              : canSubmit
                ? t.work.tabs.pendingHint
                : t.work.tabs.submitBelow(assignment.passScore ?? 0)}
          </p>
        </div>
      </div>
    );
  }

  const mode = modes[Math.min(active, modes.length - 1)];
  const session: TeacherSession = {
    origin: { kind: 'deck', name: assignment.title },
    mode,
    words,
  };

  return (
    <div className="flex min-h-0 flex-grow flex-col">
      <div className="flex items-center gap-2 px-3 pt-3 text-[0.7rem] text-muted-text sm:px-4">
        <span className="shrink-0">{t.work.tabs.part(active + 1, modes.length)}</span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          <span
            className="block h-full rounded-full bg-electric-blue transition-[width] duration-300"
            style={{ width: `${overall}%` }}
          />
        </div>
        <span className="shrink-0 font-semibold text-light-text">{overall}%</span>
      </div>
      <TeacherTestScreen
        key={`${mode}-${active}`}
        session={session}
        onFinish={(tabAnswers) => commitPart(mode, tabAnswers)}
        onExit={() => setActive(null)}
      />
    </div>
  );
};
