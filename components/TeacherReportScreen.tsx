import React from 'react';
import { Icon } from './Icon';
import type { TeacherAnswer, TeacherSession } from '../services/teacherDeck';

interface TeacherReportScreenProps {
  session: TeacherSession;
  answers: TeacherAnswer[];
  onRetryMissed: () => void;
  onRetryAll: () => void;
  onHome: () => void;
}

/**
 * What the teacher takes away from a test: the score, then every word with the answer
 * the student gave — enough to decide whether the lesson needs another pass.
 */
export const TeacherReportScreen: React.FC<TeacherReportScreenProps> = ({
  session,
  answers,
  onRetryMissed,
  onRetryAll,
  onHome,
}) => {
  const total = answers.length;
  const correct = answers.filter((answer) => answer.correct).length;
  const missed = total - correct;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const tone = accuracy >= 80 ? 'text-neon-green' : accuracy >= 50 ? 'text-warning-yellow' : 'text-danger-red';

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4 animate-fadeInScaleUp">
      <div className="text-center">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-muted-text">
          {session.title}
        </p>
        <p className={`mt-1 text-4xl font-bold tabular-nums ${tone}`}>{accuracy}%</p>
        <p className="mt-1 text-sm text-light-text">
          {correct} / {total} correct
          {missed > 0 && <span className="text-muted-text"> · {missed} to revisit</span>}
        </p>
        <div className="mx-auto mt-2 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          <span className={`block h-full rounded-full ${accuracy >= 80 ? 'bg-neon-green' : accuracy >= 50 ? 'bg-warning-yellow' : 'bg-danger-red'}`} style={{ width: `${accuracy}%` }} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {answers.map((answer, index) => (
          <div
            key={`${answer.word.word}-${index}`}
            className={`flex items-start gap-2 rounded-lg border p-2.5 ${
              answer.correct ? 'border-neon-green/25 bg-neon-green/5' : 'border-danger-red/30 bg-danger-red/5'
            }`}
          >
            <span className="mt-0.5 shrink-0 text-sm" aria-hidden="true">
              {answer.correct ? '✅' : '❌'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-light-text">{answer.word.word}</p>
              <p className="text-xs text-muted-text">{answer.word.meaning}</p>
              {!answer.correct && (
                <p className="mt-0.5 truncate text-[0.7rem] text-danger-red">
                  {answer.guess ? `Wrote “${answer.guess}”` : 'No answer'}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        {missed > 0 && (
          <button type="button" onClick={onRetryMissed} className="wc-btn wc-btn-primary min-h-[48px] flex-1">
            <Icon name="rotate" size={16} />
            Retry {missed} missed
          </button>
        )}
        <button type="button" onClick={onRetryAll} className="wc-btn wc-btn-secondary min-h-[48px] flex-1">
          <Icon name="shuffle" size={16} />
          Test again
        </button>
        <button type="button" onClick={onHome} className="wc-btn wc-btn-secondary min-h-[48px] flex-1">
          <Icon name="arrowLeft" size={16} />
          Dashboard
        </button>
      </div>
    </div>
  );
};
