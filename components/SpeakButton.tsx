import React from 'react';
import { Icon } from './Icon';
import { useT } from '../i18n/useT';
import { speak, speechSupported } from '../services/speech';

interface SpeakButtonProps {
  /** The word (or phrase) to say out loud. */
  word: string;
  /** Accessible label / tooltip; defaults to a "hear this word" phrasing. */
  label?: string;
  iconSize?: number;
  className?: string;
}

/**
 * The "Listen" affordance. Renders nothing on a browser without speech synthesis, so
 * callers can drop it next to any revealed word without a feature check of their own.
 */
export const SpeakButton: React.FC<SpeakButtonProps> = ({
  word,
  label,
  iconSize = 18,
  className = '',
}) => {
  const t = useT('common');
  if (!speechSupported()) return null;
  const text = label ?? t.hearWord(word);
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        speak(word);
      }}
      aria-label={text}
      title={text}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-electric-blue/40 bg-electric-blue/10 text-electric-blue transition hover:bg-electric-blue/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric-blue ${className}`}
    >
      <Icon name="volume" size={iconSize} />
    </button>
  );
};

export default SpeakButton;
