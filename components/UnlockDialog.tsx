import React, { useEffect, useRef, useState } from 'react';
import { FULL_VERSION_PERKS } from '../constants';
import type { UnlockOutcome } from '../services/payments';

interface UnlockDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlock: (code: string) => Promise<UnlockOutcome>;
}

// Shared modal for entering a licence key (or the legacy teacher access code). Used
// from the landing, setup and results screens so the unlock flow stays identical.
export const UnlockDialog: React.FC<UnlockDialogProps> = ({ isOpen, onClose, onUnlock }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setError('');
      setIsSubmitting(false);
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError('');
    const outcome = await onUnlock(code);
    setIsSubmitting(false);
    if (outcome.ok) {
      onClose();
    } else {
      setError(outcome.message ?? 'That code did not work. Please check it and try again.');
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
          {FULL_VERSION_PERKS.map((perk) => (
            <li key={perk}>{perk}</li>
          ))}
        </ul>

        <form onSubmit={handleSubmit} className="mt-4">
          <label htmlFor="unlockCodeInput" className="mb-1 block text-left font-sans text-xs text-muted-text">
            Licence key or teacher access code
          </label>
          <div className="flex gap-2">
            <input
              id="unlockCodeInput"
              ref={inputRef}
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                if (error) setError('');
              }}
              className="futuristic-input min-w-0 flex-grow rounded-lg px-3 py-2.5 text-sm uppercase tracking-wider"
              placeholder="WC-XXXX-XXXX-XXXX"
              aria-describedby={error ? 'unlockCodeError' : undefined}
            />
            <button
              type="submit"
              disabled={isSubmitting || !code.trim()}
              className="futuristic-button rounded-lg bg-cyber-purple/70 px-4 py-2.5 text-sm font-semibold text-light-text hover:bg-cyber-purple"
            >
              {isSubmitting ? '…' : 'Unlock'}
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
