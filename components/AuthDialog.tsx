import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from './Icon';

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Fired after a successful sign-in/up so the caller can resume what needed auth. */
  onSuccess?: () => void;
  /** Explains why the dialog appeared, e.g. "Sign in to continue to checkout". */
  reason?: string | null;
}

type Mode = 'signin' | 'signup';

/**
 * Sign-in panel for the portal. Email/password plus Google; styled with the WiseSpeak
 * derived tokens so it matches the dashboard rather than the arcade game.
 */
export const AuthDialog: React.FC<AuthDialogProps> = ({ isOpen, onClose, onSuccess, reason }) => {
  const { signInWithGoogle, signInWithEmail, registerWithEmail, configured } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'google' | 'email' | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setMode('signin');
    setName('');
    setEmail('');
    setPassword('');
    setError('');
    setBusy(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const finish = () => {
    onClose();
    onSuccess?.();
  };

  const handleGoogle = async () => {
    setError('');
    setBusy('google');
    try {
      await signInWithGoogle();
      finish();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
      setBusy(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy('email');
    try {
      if (mode === 'signup') {
        await registerWithEmail(name, email, password);
      } else {
        await signInWithEmail(email, password);
      }
      finish();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
      setBusy(null);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-[var(--wn-4)] bg-[var(--field-bg)] px-4 py-3 text-sm text-[var(--wn-12)] outline-none transition placeholder:text-[var(--wn-8)] focus:border-[var(--wa-5)] focus:ring-2 focus:ring-[var(--wa-4)]';

  return (
    <div
      className="wc-theme fixed inset-0 z-[var(--z-dialog)] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="authDialogTitle"
      onClick={onClose}
    >
      <div
        className="wc-card wc-scroll max-h-[92vh] w-full max-w-md overflow-y-auto p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="authDialogTitle" className="text-xl font-bold tracking-wide text-[var(--wn-12)]">
              {mode === 'signin' ? 'Sign in to WordCrew' : 'Create your account'}
            </h2>
            {reason && <p className="mt-1 text-xs text-[var(--wn-9)]">{reason}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 -mt-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--wn-9)] transition hover:bg-[var(--wn-3)] hover:text-[var(--wn-12)]"
            aria-label="Close"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {!configured && (
          <p className="mt-4 rounded-xl border border-[#c9952e]/40 bg-[#c9952e]/10 px-3 py-2 text-xs text-[var(--wn-11)]">
            Firebase is not configured on this build, so sign-in is disabled. Add your
            <code className="mx-1">VITE_FIREBASE_*</code> keys to <code>.env.local</code>.
          </p>
        )}

        <button
          type="button"
          onClick={() => void handleGoogle()}
          disabled={!configured || busy !== null}
          className="wc-btn wc-btn-secondary mt-5 w-full"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.63h6.2a5.3 5.3 0 0 1-2.3 3.48v2.89h3.72c2.18-2 3.44-4.96 3.44-8.55Z"
            />
            <path
              fill="#34A853"
              d="M12 23.5c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.55-2.03-6.46-4.75H1.7v2.98A11.5 11.5 0 0 0 12 23.5Z"
            />
            <path
              fill="#FBBC05"
              d="M5.54 14.17a6.9 6.9 0 0 1 0-4.34V6.85H1.7a11.5 11.5 0 0 0 0 10.3l3.84-2.98Z"
            />
            <path
              fill="#EA4335"
              d="M12 5.08c1.69 0 3.21.58 4.4 1.72l3.3-3.3C17.72 1.6 15.11.5 12 .5A11.5 11.5 0 0 0 1.7 6.85l3.84 2.98C6.45 7.11 9 5.08 12 5.08Z"
            />
          </svg>
          {busy === 'google' ? 'Opening Google…' : 'Continue with Google'}
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-[var(--wn-8)]">
          <span className="h-px flex-1 bg-[var(--wn-4)]" />
          or use email
          <span className="h-px flex-1 bg-[var(--wn-4)]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <label htmlFor="authName" className="mb-1 block text-xs font-semibold text-[var(--wn-10)]">
                Name
              </label>
              <input
                id="authName"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={inputClass}
                placeholder="Ms. Lan"
              />
            </div>
          )}

          <div>
            <label htmlFor="authEmail" className="mb-1 block text-xs font-semibold text-[var(--wn-10)]">
              Email
            </label>
            <input
              id="authEmail"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
              placeholder="you@school.edu"
            />
          </div>

          <div>
            <label htmlFor="authPassword" className="mb-1 block text-xs font-semibold text-[var(--wn-10)]">
              Password
            </label>
            <input
              id="authPassword"
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs text-[var(--danger)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!configured || busy !== null}
            className="wc-btn wc-btn-primary w-full"
          >
            {busy === 'email'
              ? 'Please wait…'
              : mode === 'signin'
                ? 'Sign in'
                : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-[var(--wn-9)]">
          {mode === 'signin' ? 'New to WordCrew?' : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError('');
            }}
            className="font-semibold text-[var(--wa-11)] underline decoration-dotted underline-offset-4 hover:text-[var(--wa-10)]"
          >
            {mode === 'signin' ? 'Create an account' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
};
