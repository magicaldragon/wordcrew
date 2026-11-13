import React, { useMemo, useState } from 'react';
import { Icon } from '../Icon';
import { useT } from '../../i18n/useT';
import type { ClassAssignment } from '../../services/classes';

interface QuizWorkProps {
  assignment: ClassAssignment;
  /** Answers in the teacher's question order, each an index into that question's choices. */
  onSubmit: (responses: number[]) => void;
}

const shuffle = <T,>(input: T[]): T[] => {
  const array = [...input];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

/**
 * Tool 3 — multiple choice — run as homework. One question at a time, a review list before
 * the answers leave the device, and nothing revealed while answering.
 *
 * The display order is fixed for this attempt: questions and options are both shuffled, and
 * every option remembers the index it had in the teacher's list, so the report can be read
 * against the teacher's own numbering.
 */
export const QuizWork: React.FC<QuizWorkProps> = ({ assignment, onSubmit }) => {
  const t = useT('myClass');
  const common = useT('common');

  const view = useMemo(
    () =>
      shuffle(assignment.questions.map((_, index) => index)).map((original) => {
        const question = assignment.questions[original];
        const order = shuffle(question.choices.map((_, index) => index));
        return {
          original,
          prompt: question.prompt,
          choices: order.map((choice) => ({ text: question.choices[choice], original: choice })),
        };
      }),
    [assignment],
  );

  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<number[]>(() => view.map(() => -1));
  const [reviewing, setReviewing] = useState(false);

  const question = view[index];
  const picked = responses[index];
  const last = index + 1 >= view.length;
  const answered = responses.filter((value) => value >= 0).length;

  const choose = (original: number) => {
    setResponses((prev) => prev.map((value, at) => (at === index ? original : value)));
  };

  // The stored detail is read back against the teacher's question order, so the shuffled
  // display order never leaks into the report.
  const submit = () =>
    onSubmit(
      assignment.questions.map((_, original) => {
        const at = view.findIndex((entry) => entry.original === original);
        return at >= 0 ? responses[at] : -1;
      }),
    );

  if (reviewing) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-3">
        <div>
          <p className="text-sm font-semibold text-light-text">{t.work.quiz.reviewTitle}</p>
          <p className="text-xs text-muted-text">{t.work.quiz.reviewHint}</p>
        </div>

        <ul className="flex flex-col gap-2">
          {view.map((entry, at) => {
            const chosen = entry.choices.find((choice) => choice.original === responses[at]);
            return (
              <li key={entry.original}>
                <button
                  type="button"
                  onClick={() => {
                    setIndex(at);
                    setReviewing(false);
                  }}
                  className="flex min-h-[44px] w-full items-start justify-between gap-3 rounded-lg border border-[var(--hairline-strong)] px-3 py-2 text-left transition-colors hover:border-electric-blue/60"
                >
                  <span className="min-w-0">
                    <span className="block text-sm text-light-text">
                      {at + 1}. {entry.prompt}
                    </span>
                    <span className="block truncate text-xs text-muted-text">
                      {chosen ? chosen.text : t.work.quiz.skipped}
                    </span>
                  </span>
                  <Icon name="pencil" size={14} />
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setReviewing(false)}
            className="wc-btn wc-btn-secondary min-h-[48px] flex-1"
          >
            {t.work.quiz.backToQuestions}
          </button>
          <button type="button" onClick={submit} className="wc-btn wc-btn-primary min-h-[48px] flex-1">
            {t.work.quiz.submit}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-muted-text">
        <span>{t.work.quiz.counter(index + 1, view.length)}</span>
        <span>{t.work.quiz.answered(answered)}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        <span
          className="block h-full rounded-full bg-electric-blue transition-[width] duration-300"
          style={{ width: `${Math.round((answered / view.length) * 100)}%` }}
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 rounded-xl border-2 border-electric-blue/30 bg-dark-metal/60 p-4">
        <p className="text-lg font-semibold leading-snug text-light-text">{question.prompt}</p>
        <div className="flex flex-col gap-2">
          {question.choices.map((choice, at) => {
            const selected = picked === choice.original;
            return (
              <button
                key={choice.original}
                type="button"
                onClick={() => choose(choice.original)}
                aria-pressed={selected}
                className={`flex min-h-[52px] items-center gap-3 rounded-lg border px-3 text-left text-sm transition-colors ${
                  selected
                    ? 'border-electric-blue bg-electric-blue/15 text-light-text'
                    : 'border-[var(--hairline-strong)] text-muted-text hover:border-electric-blue/60 hover:text-light-text'
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                    selected ? 'border-electric-blue text-electric-blue' : 'border-[var(--hairline-strong)]'
                  }`}
                >
                  {String.fromCharCode(65 + at)}
                </span>
                {choice.text}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
          disabled={index === 0}
          className="wc-btn wc-btn-secondary min-h-[48px] flex-1 disabled:opacity-40"
        >
          {common.back}
        </button>
        {last ? (
          <button
            type="button"
            onClick={() => setReviewing(true)}
            disabled={picked < 0}
            className="wc-btn wc-btn-primary min-h-[48px] flex-[2] disabled:opacity-40"
          >
            {t.work.quiz.review}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIndex((value) => value + 1)}
            disabled={picked < 0}
            className="wc-btn wc-btn-primary min-h-[48px] flex-[2] disabled:opacity-40"
          >
            {common.next}
          </button>
        )}
      </div>
    </div>
  );
};
