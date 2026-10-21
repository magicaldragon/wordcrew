import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { useT } from '../i18n/useT';
import { describeCode } from '../i18n/errors';
import type { UnlockOutcome } from '../services/payments';

interface UnlockDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlock: (code: string) => Promise<UnlockOutcome>;
}

// Shared modal for entering a licence key (or the legacy teacher access code). Used
// from the landing, setup and results screens so the unlock flow stays identical.
export const UnlockDialog: React.FC<UnlockDialogProps> = ({ isOpen, onClose, onUnlock }) => {
  const t = useT('auth');
  const errors = useT('errors');
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
      setError(describeCode(errors, outcome.code, t.unlock.failure));
    }
  };

  return (
    <div
      className="fixed inset-0 z-[var(--z-dialog)] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlockDialogTitle"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[var(--r-xl)] border border-[var(--hairline-strong)] bg-[var(--surface-2)] p-5 shadow-[var(--elev-4)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="unlockDialogTitle"
          className="flex items-center gap-2 font-heading text-xl font-bold tracking-wide text-warning-yellow"
        >
          <Icon name="unlock" size={22} />
          {t.unlockFull}
        </h2>
        <ul className="mt-3 space-y-1.5 text-left font-sans text-xs text-muted-text">
          {t.perks.map((perk) => (
            <li key={perk}>{perk}</li>
          ))}
        </ul>

        <form onSubmit={handleSubmit} className="mt-4">
          <label htmlFor="unlockCodeInput" className="mb-1 block text-left font-sans text-xs text-muted-text">
            {t.unlock.licenceLabel}
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
              className="futuristic-input min-w-0 flex-grow rounded-[var(--r-md)] px-3 py-3 text-sm uppercase tracking-wider"
              placeholder="WC-XXXX-XXXX-XXXX"
              aria-describedby={error ? 'unlockCodeError' : undefined}
            />
            <button
              type="submit"
              disabled={isSubmitting || !code.trim()}
              className="futuristic-button min-h-[48px] rounded-[var(--r-md)] bg-cyber-purple/70 px-4 py-3 text-sm font-semibold text-light-text hover:bg-cyber-purple"
            >
              {isSubmitting ? '…' : t.unlock.submit}
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
          {t.unlock.later}
        </button>
      </div>
    </div>
  );
};
