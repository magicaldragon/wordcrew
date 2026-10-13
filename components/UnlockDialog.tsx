import React, { useEffect, useRef, useState } from 'react';

interface UnlockDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlock: (code: string) => boolean;
}

const PERKS = [
  '💀 Hell Mode — brutal skips & double Rush Hour',
  '📚 5 extra word packs (A1 · A2 · A2 Key · B1 · B2)',
  '⏱️ Up to 60 words & 10 minutes per game',
  '🎵 Custom sounds — upload your own music & SFX',
];

// Shared modal for entering the teacher access code. Used from the landing screen and
// the game setup screen so the unlock flow stays identical everywhere.
export const UnlockDialog: React.FC<UnlockDialogProps> = ({ isOpen, onClose, onUnlock }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setError('');
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (onUnlock(code)) {
      onClose();
    } else {
      setError('Invalid access code. Please try again.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlockDialogTitle"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-cyber-purple/40 bg-dark-metal p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="unlockDialogTitle"
          className="font-heading text-xl font-bold tracking-wide text-warning-yellow"
        >
          🔓 Unlock Full Version
        </h2>
        <ul className="mt-3 space-y-1.5 text-left font-sans text-xs text-muted-text">
          {PERKS.map((perk) => (
            <li key={perk}>{perk}</li>
          ))}
        </ul>

        <form onSubmit={handleSubmit} className="mt-4">
          <label htmlFor="unlockCodeInput" className="mb-1 block text-left font-sans text-xs text-muted-text">
            Teacher access code
          </label>
          <div className="flex gap-2">
            <input
              id="unlockCodeInput"
              ref={inputRef}
              type="password"
              autoComplete="off"
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                if (error) setError('');
              }}
              className="futuristic-input min-w-0 flex-grow rounded-lg px-3 py-2.5 text-sm"
              placeholder="Enter code"
              aria-describedby={error ? 'unlockCodeError' : undefined}
            />
            <button
              type="submit"
              className="futuristic-button rounded-lg bg-cyber-purple/70 px-4 py-2.5 text-sm font-semibold text-light-text hover:bg-cyber-purple"
            >
              Unlock
            </button>
          </div>
          {error && (
            <p
              id="unlockCodeError"
              role="alert"
              className="mt-1.5 text-left font-sans text-xs text-danger-red"
            >
              {error}
            </p>
          )}
        </form>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 font-sans text-xs text-muted-text underline decoration-dotted underline-offset-4 transition hover:text-electric-blue"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
};
