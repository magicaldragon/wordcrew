import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { confirmDialog } from './Feedback';
import { matchesTeacherWord, type TeacherAnswer, type TeacherSession } from '../services/teacherDeck';

interface TeacherTestScreenProps {
  session: TeacherSession;
  onFinish: (answers: TeacherAnswer[]) => void;
  onExit: () => void;
}

const ADVANCE_MS = 1300;

/**
 * The test itself: prompt in Vietnamese, answer in English, one attempt per word.
 * No hearts, no clock, no score — the only output is a right/wrong report the teacher
 * can act on. A near miss (one or two letters) still counts, since the question is
 * vocabulary recall rather than spelling.
 */
export const TeacherTestScreen: React.FC<TeacherTestScreenProps> = ({ session, onFinish, onExit }) => {
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [answers, setAnswers] = useState<TeacherAnswer[]>([]);
  const [revealed, setRevealed] = useState<TeacherAnswer | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const timerRef = useRef<number | null>(null);

  const total = session.words.length;
  const word = session.words[index];
  const correctCount = answers.filter((answer) => answer.correct).length;

  useEffect(() => {
    inputRef.current?.focus();
  }, [index]);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const recordAnswer = (value: string) => {
    if (revealed || !word) return;
    const answer: TeacherAnswer = {
      word,
      guess: value.trim(),
      correct: matchesTeacherWord(value, word.word),
    };
    setAnswers((prev) => [...prev, answer]);
    setRevealed(answer);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      if (index + 1 >= total) {
        onFinish([...answers, answer]);
        return;
      }
      setIndex((current) => current + 1);
      setInput('');
      setRevealed(null);
    }, ADVANCE_MS);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim() || revealed) return;
    recordAnswer(input);
  };

  const handleExit = async () => {
    const ok = await confirmDialog('Leave this test? The answers so far are not saved.', {
      confirmLabel: 'Leave',
      destructive: true,
    });
    if (ok) onExit();
  };

  if (!word) return null;

  const progress = Math.round((index / total) * 100);

  return (
    <div className="flex min-h-0 flex-grow flex-col gap-3 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => void handleExit()}
          className="flex h-11 w-11 items-center justify-center rounded-full text-muted-text hover:bg-danger-red/20 hover:text-danger-red"
          aria-label="Leave the test"
        >
          <Icon name="close" size={18} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-semibold text-light-text">{session.title}</p>
          <p className="text-[0.7rem] text-muted-text">
            {session.source} · {index + 1} / {total}
          </p>
        </div>
        <div className="w-11 shrink-0 text-right text-sm font-bold tabular-nums text-neon-green">
          {correctCount}
        </div>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        <span
          className="block h-full rounded-full bg-neon-green transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div
        className={`flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border-2 bg-dark-metal/60 p-4 text-center transition-colors ${
          revealed
            ? revealed.correct
              ? 'border-neon-green/70'
              : 'border-danger-red/70'
            : 'border-electric-blue/30'
        }`}
      >
        <span className="rounded-full border border-electric-blue/40 bg-electric-blue/10 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-electric-blue">
          Vietnamese → English
        </span>
        <p className="text-2xl font-bold leading-snug text-light-text sm:text-3xl">{word.meaning}</p>

        <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={Boolean(revealed)}
            placeholder="Type the English word"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="futuristic-input min-h-[48px] w-full px-3 text-center text-lg font-semibold disabled:opacity-70"
            aria-label="Your answer"
          />
          <button
            type="submit"
            disabled={!input.trim() || Boolean(revealed)}
            className="wc-btn wc-btn-primary min-h-[48px] w-full disabled:cursor-not-allowed disabled:opacity-40"
          >
            {index + 1 >= total ? 'Finish & see report' : 'Check'}
          </button>
        </form>

        {revealed ? (
          <div className="min-h-[3rem]" role="status" aria-live="polite">
            <p className={`text-sm font-bold ${revealed.correct ? 'text-neon-green' : 'text-danger-red'}`}>
              {revealed.correct ? '✅ Correct' : '❌ Not this time'}
            </p>
            <p className="mt-0.5 text-sm text-light-text">
              {word.word}
              <span className="text-muted-text"> · {word.meaning}</span>
            </p>
            {!revealed.correct && revealed.guess && (
              <p className="mt-0.5 truncate text-[0.7rem] text-muted-text">You wrote “{revealed.guess}”</p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => recordAnswer('')}
            className="min-h-[44px] rounded-md px-3 text-xs font-semibold text-muted-text hover:text-light-text"
          >
            I don’t know — show the answer
          </button>
        )}
      </div>
    </div>
  );
};
