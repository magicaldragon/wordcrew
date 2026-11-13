import React, { useState } from 'react';
import { confirmDialog } from '../Feedback';
import { useT } from '../../i18n/useT';
import type { ClassAssignment } from '../../services/classes';

interface WritingWorkProps {
  assignment: ClassAssignment;
  onSubmit: (text: string) => void;
}

const countWords = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

/**
 * Tool 2 — writing — run as homework. The text stays in the box until the student confirms,
 * so a stray tap cannot hand in a half-finished draft to the teacher.
 */
export const WritingWork: React.FC<WritingWorkProps> = ({ assignment, onSubmit }) => {
  const t = useT('myClass');
  const common = useT('common');
  const [text, setText] = useState('');
  const words = countWords(text);
  const short = words < assignment.minWords;

  const askThenSubmit = async () => {
    const ok = await confirmDialog(t.work.writing.confirmAsk, {
      confirmLabel: t.work.writing.submit,
      cancelLabel: common.cancel,
    });
    if (ok) onSubmit(text);
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-3">
      <div className="rounded-xl border border-[var(--hairline-strong)] bg-dark-metal/60 p-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-electric-blue">
          {t.work.writing.promptLabel}
        </p>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-light-text">{assignment.prompt}</p>
      </div>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={10}
        placeholder={t.work.writing.placeholder}
        className="futuristic-input min-h-[14rem] w-full flex-1 px-3 py-2 text-sm leading-relaxed"
      />
      <div className="flex items-center justify-between text-xs">
        <span className={short ? 'text-warning-yellow' : 'text-neon-green'}>
          {t.work.writing.wordCount(words, assignment.minWords)}
        </span>
        <span className="text-muted-text">{t.work.writing.gradedByTeacher}</span>
      </div>
      <button
        type="button"
        onClick={() => void askThenSubmit()}
        disabled={short}
        className="wc-btn wc-btn-primary min-h-[48px] w-full disabled:opacity-40"
      >
        {short ? t.work.writing.moreWords(assignment.minWords - words) : t.work.writing.submit}
      </button>
    </div>
  );
};
