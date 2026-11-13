import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon';
import { SpeakButton } from './SpeakButton';
import { useT } from '../i18n/useT';
import { ipaOf, loadPronouncingDictionary } from '../services/ipa';
import { warmWords } from '../services/tts';
import { partOfSpeech, shuffledDeckWords, TEACHER_TEST_MODES, type TeacherDeck, type TeacherTestMode } from '../services/teacherDeck';

interface FlashcardReviewScreenProps {
  deck: TeacherDeck;
  /** The deck is studied — move on to the graded pass, in the chosen question style. */
  onStartTest: (mode: TeacherTestMode) => void;
  onExit: () => void;
  /**
   * Homework sets this: the teacher already chose the question style on the assignment,
   * so the student studies the cards but does not pick how the test asks them.
   */
  lockedMode?: TeacherTestMode;
  /** Review after the work is handed in: cards only, no test to start. */
  reviewOnly?: boolean;
}

/**
 * The study pass that sits between a deck and its test.
 *
 * A Vietnamese prompt with no prior exposure is a memory test, not a vocabulary check.
 * So each deck opens on its cards first: the English word, its IPA and part of speech,
 * a speaker that says it in the same voice on every device, and the meaning on the back.
 * Nothing is scored and nothing is timed — the test that follows is what produces the
 * report.
 *
 * The cards are shuffled on their own, and the test shuffles again when it starts, so
 * studying a deck never hands over the answer order.
 */
export const FlashcardReviewScreen: React.FC<FlashcardReviewScreenProps> = ({
  deck,
  onStartTest,
  onExit,
  lockedMode,
  reviewOnly = false,
}) => {
  const t = useT('teacher');
  const [cards, setCards] = useState(() => shuffledDeckWords(deck.words));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  // The test that follows can ask the same words three ways; the class picks before it starts.
  const [pickedMode, setPickedMode] = useState<TeacherTestMode>('listen');
  const mode = lockedMode ?? pickedMode;
  // Bumped once the pronunciation dictionary resolves; `ipaOf` reads a module-level
  // cache, so this counter is what makes the card re-render with its IPA line.
  const [ipaTick, setIpaTick] = useState(0);

  useEffect(() => {
    let alive = true;
    void loadPronouncingDictionary().then(() => {
      if (alive) setIpaTick((value) => value + 1);
    });
    return () => {
      alive = false;
    };
  }, []);

  const card = cards[index];
  const ipa = useMemo(() => (card ? ipaOf(card.word) : null), [card, ipaTick]);

  // The order is already decided, so the audio ahead is warmed two clips at a time
  // while the reader is still on this card. Tapping the speaker then costs nothing.
  useEffect(() => {
    warmWords(cards.slice(index, index + 6).map((entry) => entry.word));
  }, [cards, index]);

  if (!card) return null;

  const go = (delta: number) => {
    setIndex((current) => Math.min(cards.length - 1, Math.max(0, current + delta)));
    setFlipped(false);
  };

  const shuffle = () => {
    setCards(shuffledDeckWords(deck.words));
    setIndex(0);
    setFlipped(false);
  };

  const toggleFlip = () => setFlipped((value) => !value);

  const pos = partOfSpeech(card);
  const progress = Math.round(((index + 1) / cards.length) * 100);

  return (
    <div className="flex min-h-0 flex-grow flex-col gap-3 p-3 sm:p-4 animate-fadeInScaleUp">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onExit}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-text hover:bg-cyber-purple/40 hover:text-light-text"
          aria-label={t.review.exitAria}
        >
          <Icon name="arrowLeft" size={18} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-semibold text-light-text">{deck.name}</p>
          <p className="text-[0.7rem] text-muted-text">{t.review.progress(index + 1, cards.length)}</p>
        </div>
        <button
          type="button"
          onClick={shuffle}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-text hover:bg-electric-blue/20 hover:text-electric-blue"
          aria-label={t.review.shuffleAria}
          title={t.review.shuffleAria}
        >
          <Icon name="shuffle" size={18} />
        </button>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        <span
          className="block h-full rounded-full bg-electric-blue transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={toggleFlip}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          toggleFlip();
        }}
        aria-label={flipped ? t.review.showWord : t.review.showMeaning}
        aria-pressed={flipped}
        className="flex min-h-[15rem] flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-electric-blue/30 bg-dark-metal/60 p-5 text-center transition-colors hover:border-electric-blue/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric-blue"
      >
        {flipped ? (
          <>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted-text">
              {card.word}
            </p>
            <p className="break-words text-2xl font-bold leading-snug text-neon-green sm:text-3xl">
              {card.meaning}
            </p>
            {ipa && <p className="font-mono text-sm text-electric-blue">/{ipa}/</p>}
            <SpeakButton word={card.word} size="lg" />
            <p className="text-[0.7rem] text-muted-text">{t.review.tapToHide}</p>
          </>
        ) : (
          <>
            <span className="rounded-full border border-electric-blue/40 bg-electric-blue/10 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-electric-blue">
              {pos || t.review.noPos}
            </span>
            <p className="break-words font-heading text-3xl font-bold tracking-wide text-light-text sm:text-4xl">
              {card.word}
            </p>
            {ipa && <p className="font-mono text-base text-electric-blue">/{ipa}/</p>}
            <SpeakButton word={card.word} size="lg" />
            <p className="text-[0.7rem] text-muted-text">{t.review.tapToFlip}</p>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={index === 0}
          className="wc-btn wc-btn-secondary min-h-[48px] flex-1 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon name="arrowLeft" size={16} />
          {t.review.previous}
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={index >= cards.length - 1}
          className="wc-btn wc-btn-secondary min-h-[48px] flex-1 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t.review.next}
          <Icon name="arrowRight" size={16} />
        </button>
      </div>

      {!reviewOnly && (
        <div>
          <p className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-text">
            {t.setup.modeTitle}
          </p>
          {lockedMode ? (
            <p className="rounded-lg border-2 border-white/10 bg-dark-metal/40 px-2 py-2 text-center text-[0.7rem] font-bold text-electric-blue">
              {t.setup.modes[lockedMode].label}
              <span className="mt-0.5 block font-normal text-muted-text">
                {t.setup.modes[lockedMode].hint}
              </span>
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label={t.setup.modeTitle}>
                {TEACHER_TEST_MODES.map((id) => {
                  const active = id === mode;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setPickedMode(id)}
                      className={`min-h-[44px] rounded-lg border-2 px-2 text-[0.7rem] font-bold leading-tight transition-colors ${
                        active
                          ? 'border-electric-blue bg-electric-blue/10 text-electric-blue'
                          : 'border-white/10 bg-dark-metal/40 text-muted-text hover:border-electric-blue/60'
                      }`}
                    >
                      {t.setup.modes[id].label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-center text-[0.7rem] text-muted-text">{t.setup.modes[mode].hint}</p>
            </>
          )}
        </div>
      )}

      {reviewOnly ? (
        <button
          type="button"
          onClick={onExit}
          className="wc-btn wc-btn-primary min-h-[48px] w-full"
        >
          {t.review.done}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onStartTest(mode)}
          className="wc-btn wc-btn-primary min-h-[48px] w-full"
        >
          <Icon name="play" size={16} />
          {t.review.startTest(cards.length)}
        </button>
      )}
    </div>
  );
};
