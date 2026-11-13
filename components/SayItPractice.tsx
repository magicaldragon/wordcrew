import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { useT } from '../i18n/useT';
import { cloudSpeechSupported, recordClipForPlayback, type ClipRecording } from '../services/asr';

interface SayItPracticeProps {
  /** The word on the card. Its clip and its self-mark belong to it alone. */
  word: string;
}

/**
 * Pronunciation practice, in the review pass.
 *
 * Reading aloud is not a question: nothing is typed, nothing is uploaded, and no verdict
 * is stored. The student hears the Kokoro model (the speaker buttons on the card), records
 * themselves here, plays it back, and decides with their own ear whether it matched. That
 * keeps the graded pass clean — every part of the test has a score — while the practice
 * that actually improves pronunciation stays where it belongs.
 *
 * The clip never leaves the device: it is encoded locally and played from a blob URL.
 */
export const SayItPractice: React.FC<SayItPracticeProps> = ({ word }) => {
  const t = useT('teacher');
  const [recording, setRecording] = useState(false);
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [mark, setMark] = useState<'good' | 'again' | null>(null);
  const captureRef = useRef<ClipRecording | null>(null);
  const urlRef = useRef<string | null>(null);

  /** Drops the take in hand, releases the mic and frees the blob. */
  const clearTake = () => {
    captureRef.current?.cancel();
    captureRef.current = null;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setRecording(false);
    setClipUrl(null);
    setFailed(false);
    setMark(null);
  };

  // A new card starts clean: nothing said about the previous word may leak into this one.
  useEffect(() => {
    clearTake();
    return () => {
      captureRef.current?.cancel();
      captureRef.current = null;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word]);

  // No mic, or an insecure page where the browser refuses to open one.
  if (!cloudSpeechSupported()) {
    // Hiding the panel on an http:// page is what makes a tablet look "unable to
    // record" — say what is actually missing instead.
    if (typeof window === 'undefined' || window.isSecureContext) return null;
    return (
      <p className="rounded-xl border border-[var(--hairline)] bg-dark-metal/40 p-2.5 text-[0.65rem] leading-relaxed text-muted-text">
        {t.review.recordInsecure}
      </p>
    );
  }

  const start = () => {
    if (captureRef.current) return;
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setClipUrl(null);
    setFailed(false);
    setMark(null);

    const capture = recordClipForPlayback();
    captureRef.current = capture;
    setRecording(true);

    void capture.url.then((url) => {
      // A newer take (or a card change) already owns the panel.
      if (captureRef.current !== capture) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      captureRef.current = null;
      setRecording(false);
      if (!url) {
        setFailed(true);
        return;
      }
      urlRef.current = url;
      setClipUrl(url);
    });
  };

  const toggleRecording = () => {
    if (recording) {
      captureRef.current?.stop();
      return;
    }
    start();
  };

  return (
    <div className="rounded-xl border border-[var(--hairline)] bg-dark-metal/40 p-2.5">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1">
          <span className="block text-[0.65rem] font-semibold uppercase tracking-widest text-muted-text">
            {t.review.sayTitle}
          </span>
          <span className="block text-[0.65rem] leading-snug text-muted-text">{t.review.sayHint}</span>
        </span>
        <button
          type="button"
          onClick={toggleRecording}
          aria-pressed={recording}
          className={`flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors ${
            recording
              ? 'border-danger-red/70 bg-danger-red/15 text-danger-red'
              : 'border-electric-blue/40 bg-electric-blue/10 text-electric-blue hover:bg-electric-blue/25'
          }`}
        >
          <Icon name={recording ? 'ban' : 'mic'} size={16} />
          {recording ? t.review.recordStop : clipUrl ? t.review.recordAgain : t.review.record}
        </button>
      </div>

      {clipUrl && (
        <div className="mt-2 flex flex-col gap-1.5">
          <audio controls src={clipUrl} className="h-9 w-full" aria-label={t.review.playBackAria} />
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[0.65rem] text-muted-text">{t.review.selfCheck}</span>
            <button
              type="button"
              aria-pressed={mark === 'good'}
              onClick={() => setMark('good')}
              className={`min-h-[32px] rounded-full border px-2.5 text-[0.65rem] font-semibold transition-colors ${
                mark === 'good'
                  ? 'border-neon-green bg-neon-green/15 text-neon-green'
                  : 'border-white/15 text-muted-text hover:border-neon-green/50 hover:text-light-text'
              }`}
            >
              {t.review.selfGood}
            </button>
            <button
              type="button"
              aria-pressed={mark === 'again'}
              onClick={() => setMark('again')}
              className={`min-h-[32px] rounded-full border px-2.5 text-[0.65rem] font-semibold transition-colors ${
                mark === 'again'
                  ? 'border-warning-yellow bg-warning-yellow/15 text-warning-yellow'
                  : 'border-white/15 text-muted-text hover:border-warning-yellow/50 hover:text-light-text'
              }`}
            >
              {t.review.selfAgain}
            </button>
          </div>
        </div>
      )}

      {failed && <p className="mt-1.5 text-[0.65rem] text-warning-yellow">{t.review.recordFailed}</p>}
    </div>
  );
};

export default SayItPractice;
