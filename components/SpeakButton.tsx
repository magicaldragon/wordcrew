import React, { useState } from 'react';
import { Icon } from './Icon';
import { useT } from '../i18n/useT';
import { playbackSupported, speakWord } from '../services/tts';

interface SpeakButtonProps {
  /** The word (or phrase) to say out loud. */
  word: string;
  /** Accessible label / tooltip; defaults to a "hear this word" phrasing. */
  label?: string;
  iconSize?: number;
  /** `lg` is the card-sized control used by the flashcard review. */
  size?: 'sm' | 'lg';
  className?: string;
}

/**
 * The "Listen" affordance. Renders nothing when the device can play nothing at all, so
 * callers can drop it next to any revealed word without a feature check of their own.
 *
 * The clip comes from the Kokoro "Heart" voice (see services/tts.ts) — the same voice on
 * every device, which matters when the phone and the classroom projector disagree. It
 * falls back to the browser's speech synthesiser if that service cannot be reached.
 */
export const SpeakButton: React.FC<SpeakButtonProps> = ({
  word,
  label,
  iconSize = 18,
  size = 'sm',
  className = '',
}) => {
  const t = useT('common');
  const [busy, setBusy] = useState(false);
  if (!playbackSupported()) return null;
  const text = label ?? t.hearWord(word);

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (busy) return;
    setBusy(true);
    void speakWord(word).finally(() => setBusy(false));
  };

  const box = size === 'lg' ? 'h-14 w-14' : 'h-8 w-8';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={text}
      title={text}
      aria-busy={busy}
      className={`inline-flex ${box} shrink-0 items-center justify-center rounded-full border border-electric-blue/40 bg-electric-blue/10 text-electric-blue transition hover:bg-electric-blue/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric-blue ${
        busy ? 'animate-subtlePulse' : ''
      } ${className}`}
    >
      <Icon name="volume" size={size === 'lg' ? 24 : iconSize} />
    </button>
  );
};

export default SpeakButton;
