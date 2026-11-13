import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';
import { SpeakButton } from './SpeakButton';
import { confirmDialog } from './Feedback';
import { useSpeechInput } from './useSpeechInput';
import { useT } from '../i18n/useT';
import { ipaOf, loadPronouncingDictionary } from '../services/ipa';
import { checkSpokenAnswer } from '../services/solo';
import { speakWord, stopPlayback, warmWords } from '../services/tts';
import {
  buildChoiceOptions,
  judgeLetterAnswer,
  judgeMeaningChoice,
  judgeTeacherAnswer,
  type TeacherAnswer,
  type TeacherMatch,
  type TeacherSession,
} from '../services/teacherDeck';

interface TeacherTestScreenProps {
  session: TeacherSession;
  onFinish: (answers: TeacherAnswer[]) => void;
  onExit: () => void;
}

const statusTone = (answer: TeacherAnswer): string =>
  answer.correct ? 'text-neon-green' : answer.spelling ? 'text-warning-yellow' : 'text-danger-red';

const cardTone = (answer: TeacherAnswer | null): string => {
  if (!answer) return 'border-electric-blue/30';
  if (answer.correct) return 'border-neon-green/70';
  return answer.spelling ? 'border-warning-yellow/70' : 'border-danger-red/70';
};

const isLetter = (char: string): boolean => /[a-zA-Z]/.test(char);

/**
 * The test itself. The words are fixed; the question style is chosen before the run:
 *
 *   listen  — the word is spoken, the student writes it (listening + spelling)
 *   choice  — the word is shown, the student picks its Vietnamese meaning
 *   letters — the meaning, the first letter and one box per letter (spelling)
 *   read    — the word is shown; the student says it aloud and the mic checks it
 *
 * Every mode is scored, reading aloud included: the microphone hears one word, the
 * transcript is compared the way Solo compares a spoken answer (fuzzy spelling first,
 * phonemes second, so "wear" passes for "where"), and the word counts as right or wrong.
 *
 * No hearts, no clock — the output is a right/wrong report the teacher can act on. After
 * each answer the student presses Continue, so the class can talk about the word before
 * moving on. A near miss is flagged as a spelling slip: the answer is not counted
 * correct, and the report keeps it apart from words not known.
 *
 * A first miss is not final: the student gets one retry, a hint, or may skip and see
 * the answer. Every retry and hint is counted, so the report can tell a word the
 * student knew from one they only got on the second pass with help.
 */
export const TeacherTestScreen: React.FC<TeacherTestScreenProps> = ({ session, onFinish, onExit }) => {
  const t = useT('teacher');
  const { cancel: cancelLabel } = useT('common');
  const { mode } = session;
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [answers, setAnswers] = useState<TeacherAnswer[]>([]);
  const [revealed, setRevealed] = useState<TeacherAnswer | null>(null);
  /** The first miss, held while the student decides: try once more, or give up. */
  const [missed, setMissed] = useState<{ guess: string } | null>(null);
  /** 1 = first go; 2 = the single retry. */
  const [attempt, setAttempt] = useState(1);
  /** Hint presses on the current word. */
  const [hints, setHints] = useState(0);
  const [ipaTick, setIpaTick] = useState(0);
  /** What the microphone heard on the current read-aloud card; null = nothing tried yet. */
  const [heardText, setHeardText] = useState<string | null>(null);
  /** A transcript is being checked against the target word. */
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const total = session.words.length;
  const word = session.words[index];

  useEffect(() => {
    let alive = true;
    void loadPronouncingDictionary().then(() => {
      if (alive) setIpaTick((value) => value + 1);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Clips for the words just ahead are fetched while this one is being answered.
  useEffect(() => {
    warmWords(session.words.slice(0, 8).map((entry) => entry.word));
  }, [session.words]);

  useEffect(() => () => stopPlayback(), []);

  useEffect(() => {
    inputRef.current?.focus();
  }, [index]);

  // A listening question is asked as soon as it appears; the speaker repeats it on demand.
  useEffect(() => {
    if (mode !== 'listen') return;
    const current = session.words[index];
    if (current) void speakWord(current.word);
  }, [index, mode, session.words]);

  // The letter box starts with the first letter already filled in.
  useEffect(() => {
    const current = session.words[index];
    setInput(mode === 'letters' && current ? current.word.slice(0, 1) : '');
  }, [index, mode, session.words]);

  const options = useMemo(
    () => (word && mode === 'choice' ? buildChoiceOptions(word, session.words) : []),
    [word, mode, session.words],
  );

  // A hint in choice mode removes one wrong meaning; in the other modes it reveals a
  // letter, so "hint" always narrows the answer without giving it away.
  const pickedOption = revealed?.guess ?? missed?.guess ?? null;
  const hiddenOption =
    word && mode === 'choice' && hints > 0
      ? options.find(
          (option) =>
            !judgeMeaningChoice(option, word.meaning) && option !== pickedOption,
        ) ?? null
      : null;
  const shownOptions =
    revealed || !hiddenOption ? options : options.filter((option) => option !== hiddenOption);

  const maxHints = mode === 'letters' ? 2 : mode === 'read' ? 0 : 1;
  const canHint = !revealed && hints < maxHints;

  const ipa = useMemo(() => (word ? ipaOf(word.word) : null), [word, ipaTick]);

  /** Writes one answered word and reveals its verdict. */
  const commit = (value: string, match: TeacherMatch, skipped: boolean) => {
    if (revealed || !word) return;

    // The first miss is a pause, not a verdict: hold it and let the student choose.
    if (!skipped && match === 'wrong' && attempt === 1) {
      setMissed({ guess: value.trim() });
      // Whatever they do next — press Try again, or just read into the mic again —
      // the word is on its second attempt, and the report must say so.
      setAttempt(2);
      return;
    }

    const answer: TeacherAnswer = {
      word,
      guess: value.trim(),
      correct: match === 'correct',
      spelling: match === 'spelling',
      attempts: attempt,
      hints,
      skipped: skipped || undefined,
      mode,
    };
    setAnswers((prev) => [...prev, answer]);
    setRevealed(answer);
    setMissed(null);
  };

  /**
   * One reading, judged the way Solo judges a spoken answer: the best transcript and
   * every alternative the engine offered are checked — fuzzy spelling first, phonemes
   * second — so a recogniser that writes "wear" for "where" still counts.
   */
  const judgeReading = async (transcript: string, alternatives: string[]) => {
    if (!word) return;
    setHeardText(transcript);
    setChecking(true);
    let correct = false;
    try {
      for (const candidate of [transcript, ...alternatives]) {
        if (await checkSpokenAnswer(candidate, word.word)) {
          correct = true;
          break;
        }
      }
    } finally {
      setChecking(false);
    }
    commit(transcript, correct ? 'correct' : 'wrong', false);
  };

  const speech = useSpeechInput((transcript, alternatives) => {
    void judgeReading(transcript, alternatives);
  });

  // A new word starts with a clean mic: the previous card's session must not keep
  // listening, and its verdict must not leak into this one.
  useEffect(() => {
    speech.reset();
    setHeardText(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const recordAnswer = (value: string, options?: { skipped?: boolean }) => {
    if (!word) return;
    const match: TeacherMatch =
      mode === 'choice'
        ? judgeMeaningChoice(value, word.meaning)
          ? 'correct'
          : 'wrong'
        : mode === 'letters'
          ? judgeLetterAnswer(value, word.word)
          : judgeTeacherAnswer(value, word.word);
    commit(value, match, options?.skipped ?? false);
  };

  /** One more go at the same word; the attempt count is what the report records. */
  const handleRetry = () => {
    if (!word) return;
    setAttempt(2);
    setMissed(null);
    setInput(mode === 'letters' ? word.word.slice(0, 1 + hints) : '');
    if (mode === 'read') {
      speech.reset();
      setHeardText(null);
      return;
    }
    inputRef.current?.focus();
  };

  /** Letters mode reveals the next letter by pre-filling it; other modes show a clue. */
  const handleHint = () => {
    if (!word || !canHint) return;
    const next = hints + 1;
    setHints(next);
    if (mode === 'letters') setInput(word.word.slice(0, 1 + next));
    inputRef.current?.focus();
  };

  const advance = () => {
    if (index + 1 >= total) {
      onFinish(answers);
      return;
    }
    setIndex((current) => current + 1);
    setRevealed(null);
    setMissed(null);
    setAttempt(1);
    setHints(0);
  };

  // Enter moves on once the answer is on screen. Buttons keep their own Enter handling,
  // so the focused Continue button is not clicked twice.
  const advanceRef = useRef(advance);
  advanceRef.current = advance;
  useEffect(() => {
    if (!revealed) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.metaKey || event.ctrlKey || event.altKey) return;
      if ((event.target as HTMLElement | null)?.closest('button')) return;
      event.preventDefault();
      advanceRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revealed]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (revealed) {
      advance();
      return;
    }
    if (missed || !input.trim()) return;
    recordAnswer(input);
  };

  const handleExit = async () => {
    const ok = await confirmDialog(t.test.leaveAsk, {
      confirmLabel: t.test.leaveLabel,
      cancelLabel,
      destructive: true,
    });
    if (ok) onExit();
  };

  if (!word) {
    return (
      <div className="flex flex-grow flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-text">{t.test.empty}</p>
        <button type="button" onClick={onExit} className="wc-btn wc-btn-secondary min-h-[44px] px-4">
          <Icon name="arrowLeft" size={16} />
          {t.dashboard}
        </button>
      </div>
    );
  }

  const heading =
    session.origin.kind === 'level' ? t.test.levelTitle(session.origin.levelId) : session.origin.name;
  const title = session.retry ? `${heading}${t.test.retrySuffix}` : heading;
  const source = session.retry
    ? t.test.sourceRetry(total)
    : session.origin.kind === 'level'
      ? t.test.sourceLevel(session.origin.levelId, total)
      : t.test.sourceDeck(total);
  const progress = Math.round((index / total) * 100);
  const correctCount = answers.filter((answer) => answer.correct).length;

  /** Heading, word counter and the bar every mode shares. */
  const header = (
    <>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => void handleExit()}
          className="flex h-11 w-11 items-center justify-center rounded-full text-muted-text hover:bg-danger-red/20 hover:text-danger-red"
          aria-label={t.test.leaveAria}
        >
          <Icon name="close" size={18} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-semibold text-light-text">{title}</p>
          <p className="text-[0.7rem] text-muted-text">
            {source} · {index + 1} / {total}
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
    </>
  );

  /** One box per letter of the target; the first one is given, the input fills the rest. */
  const letterSlots = (target: string) => {
    const typed = input.replace(/[^a-zA-Z]/g, '');
    let cursor = 0;
    return Array.from(target).map((char, position) => {
      if (!isLetter(char)) return <span key={position} className="w-2" aria-hidden="true" />;
      const value = typed[cursor] ?? '';
      cursor += 1;
      const hinted = position < 1 + hints;
      return (
        <span
          key={position}
          className={`flex h-10 w-8 items-center justify-center rounded-md border text-lg font-bold uppercase ${
            hinted
              ? 'border-neon-green/60 bg-neon-green/10 text-neon-green'
              : value
                ? 'border-electric-blue/60 bg-electric-blue/10 text-light-text'
                : 'border-white/15 text-transparent'
          }`}
        >
          {value || '·'}
        </span>
      );
    });
  };

  const letterCount = Array.from(word.word).filter(isLetter).length;
  const listeningNow = speech.listening || speech.transcribing;
  /** Reading aloud reports what the mic heard; the other modes report what was typed. */
  const answerLabel = mode === 'read' ? t.test.youSaid : t.test.youWrote;

  return (
    <div className="flex min-h-0 flex-grow flex-col gap-3 p-3 sm:p-4">
      {header}

      <div
        className={`flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border-2 bg-dark-metal/60 p-4 text-center transition-colors ${cardTone(revealed)}`}
      >
        <span className="rounded-full border border-electric-blue/40 bg-electric-blue/10 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-electric-blue">
          {t.setup.modes[mode].label}
        </span>

        {mode === 'listen' && (
          <>
            <SpeakButton word={word.word} size="lg" label={t.test.play} />
            <p className="text-sm font-semibold text-light-text">{t.test.listenPrompt}</p>
          </>
        )}

        {mode === 'choice' && (
          <>
            <p className="break-words font-heading text-3xl font-bold tracking-wide text-light-text sm:text-4xl">
              {word.word}
            </p>
            <SpeakButton word={word.word} size="lg" />
            <p className="text-sm font-semibold text-light-text">{t.test.choicePrompt}</p>
          </>
        )}

        {mode === 'letters' && (
          <>
            <p className="break-words text-2xl font-bold leading-snug text-light-text sm:text-3xl">
              {word.meaning}
            </p>
            <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-muted-text">
              {t.test.lettersHint(letterCount)}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5" aria-hidden="true">
              {letterSlots(word.word)}
            </div>
          </>
        )}

        {mode === 'read' && (
          <>
            <p className="break-words font-heading text-3xl font-bold tracking-wide text-light-text sm:text-4xl">
              {word.word}
            </p>
            <p className="text-sm font-semibold text-light-text">{t.test.readPrompt}</p>
            {speech.supported ? (
              <button
                type="button"
                onClick={() => (listeningNow ? speech.stop() : speech.start())}
                disabled={Boolean(revealed) || checking}
                className="wc-btn wc-btn-secondary min-h-[52px] min-w-[14rem] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icon name={listeningNow ? 'ban' : 'mic'} size={16} />
                {checking || speech.transcribing
                  ? t.test.readChecking
                  : speech.listening
                    ? t.test.readListening
                    : heardText !== null
                      ? t.test.readRetry
                      : t.test.readStart}
              </button>
            ) : (
              <p className="max-w-sm rounded-md border border-white/10 px-3 py-2 text-[0.7rem] leading-relaxed text-muted-text">
                {t.test.readNoMic}
              </p>
            )}
            {speech.error && (
              <p role="status" aria-live="polite" className="text-[0.7rem] text-warning-yellow">
                {t.test.speech[speech.error]}
              </p>
            )}
            {!speech.error && heardText !== null && (
              <p className="text-xs text-light-text" role="status" aria-live="polite">
                {heardText ? t.test.readHeard(heardText) : t.test.readNotHeard}
              </p>
            )}
          </>
        )}

        {mode === 'choice' && (
          <div className="grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
            {shownOptions.map((option) => {
              const isRight = judgeMeaningChoice(option, word.meaning);
              const picked = (revealed?.guess ?? missed?.guess) === option;
              const state = revealed
                ? isRight
                  ? 'border-neon-green bg-neon-green/15 text-neon-green'
                  : picked
                    ? 'border-danger-red bg-danger-red/15 text-danger-red'
                    : 'border-white/10 text-muted-text opacity-60'
                : picked
                  ? 'border-danger-red bg-danger-red/15 text-danger-red'
                  : 'border-white/15 bg-dark-metal/60 text-light-text hover:border-electric-blue/60';
              return (
                <button
                  key={option}
                  type="button"
                  disabled={Boolean(revealed) || Boolean(missed)}
                  onClick={() => recordAnswer(option)}
                  className={`min-h-[48px] rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-colors ${state}`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        )}

        {/* Reading aloud is typed when the device cannot listen — no mic, or the mic is
            blocked — so the part can still be finished and scored. */}
        {mode !== 'choice' && (mode !== 'read' || !speech.supported || Boolean(speech.error)) && (
          <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={Boolean(revealed) || Boolean(missed)}
              placeholder={t.test.answerPlaceholder}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="futuristic-input min-h-[48px] w-full px-3 text-center text-lg font-semibold disabled:opacity-70"
              aria-label={t.test.answerAria}
            />
            <button
              type="submit"
              disabled={!input.trim() || Boolean(revealed) || Boolean(missed)}
              className="wc-btn wc-btn-primary min-h-[48px] w-full disabled:cursor-not-allowed disabled:opacity-40"
            >
              {index + 1 >= total ? t.test.finish : t.test.check}
            </button>
          </form>
        )}

        {revealed ? (
          <div className="w-full">
            <div className="min-h-[3rem]" role="status" aria-live="polite">
              <p className={`text-sm font-bold ${statusTone(revealed)}`}>
                {revealed.correct ? t.test.correct : revealed.spelling ? t.test.spelling : t.test.incorrect}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center justify-center gap-2">
                <p className="text-sm text-light-text">
                  {word.word}
                  <span className="text-muted-text"> · {word.meaning}</span>
                </p>
                <SpeakButton word={word.word} />
              </div>
              {ipa && <p className="mt-0.5 font-mono text-xs text-electric-blue">/{ipa}/</p>}
              {!revealed.correct && revealed.guess && (
                <p className="mt-0.5 truncate text-[0.7rem] text-muted-text">
                  {answerLabel(revealed.guess)}
                </p>
              )}
            </div>
            <button
              type="button"
              autoFocus
              onClick={advance}
              className="wc-btn wc-btn-primary mt-3 min-h-[44px] w-full max-w-xs"
            >
              {index + 1 >= total ? t.test.finish : t.test.continue}
              <Icon name="arrowRight" size={16} />
            </button>
          </div>
        ) : missed ? (
          <div className="w-full" role="status" aria-live="polite">
            <p className="text-sm font-bold text-danger-red">{t.test.incorrect}</p>
            {missed.guess && (
              <p className="mt-0.5 truncate text-[0.7rem] text-muted-text">
                {answerLabel(missed.guess)}
              </p>
            )}
            <p className="mt-1 text-xs text-light-text">{t.test.retryAsk}</p>
            {hints > 0 && mode !== 'letters' && (
              <p className="mt-1 text-xs font-semibold text-electric-blue">
                {t.test.hintClue(word.word.slice(0, 1), letterCount)}
              </p>
            )}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                autoFocus
                onClick={handleRetry}
                className="wc-btn wc-btn-primary min-h-[44px] flex-1"
              >
                <Icon name="rotate" size={16} />
                {t.test.retry}
              </button>
              <button
                type="button"
                onClick={() => recordAnswer(missed.guess, { skipped: true })}
                className="wc-btn wc-btn-secondary min-h-[44px] flex-1"
              >
                {t.test.skip}
              </button>
            </div>
            {canHint && (
              <button
                type="button"
                onClick={handleHint}
                className="mt-2 min-h-[44px] w-full rounded-md text-xs font-semibold text-electric-blue hover:text-light-text"
              >
                {t.test.hint}
              </button>
            )}
          </div>
        ) : (
          <div className="flex w-full flex-col items-center gap-1">
            {hints > 0 && mode !== 'letters' && (
              <p className="text-xs font-semibold text-electric-blue">
                {t.test.hintClue(word.word.slice(0, 1), letterCount)}
              </p>
            )}
            {canHint && (
              <button
                type="button"
                onClick={handleHint}
                className="min-h-[44px] rounded-md px-3 text-xs font-semibold text-electric-blue hover:text-light-text"
              >
                {t.test.hint}
              </button>
            )}
            <button
              type="button"
              onClick={() => recordAnswer('', { skipped: true })}
              className="min-h-[44px] rounded-md px-3 text-xs font-semibold text-muted-text hover:text-light-text"
            >
              {t.test.reveal}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
