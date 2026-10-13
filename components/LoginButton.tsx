import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AuthDialog } from './AuthDialog';

interface LoginButtonProps {
  /** `pill` for the top bar, `block` for the sidebar footer. */
  variant?: 'pill' | 'block';
}

const initialsOf = (label: string): string =>
  label
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';

/**
 * Compact account control, mirroring the WiseSpeak header button: a pill when signed
 * out, an avatar + menu when signed in. Keeps its own `AuthDialog` so it can be dropped
 * anywhere without extra wiring.
 */
export const LoginButton: React.FC<LoginButtonProps> = ({ variant = 'pill' }) => {
  const { user, loading, signOutUser } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showMenu) return;
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [showMenu]);

  const label = user?.displayName || user?.email || 'Account';
  const block = variant === 'block';
  const baseClass = block ? 'wc-nav-item' : 'rounded-full border border-[var(--wn-4)] bg-[var(--wn-2)] px-3 py-1.5';
  const interactionClass = block ? '' : 'transition hover:border-[var(--wn-5)] hover:bg-[var(--wn-3)]';

  if (loading) {
    return <div className={`${baseClass} ${interactionClass} h-10 w-24 animate-pulse opacity-40`} aria-hidden="true" />;
  }

  if (!user) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowDialog(true)}
          className={`${baseClass} ${interactionClass} inline-flex items-center gap-2 text-sm font-semibold text-[var(--wn-11)]`}
        >
          <span aria-hidden="true">👤</span>
          Sign in
        </button>
        <AuthDialog isOpen={showDialog} onClose={() => setShowDialog(false)} />
      </>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setShowMenu((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={showMenu}
        className={`${baseClass} ${interactionClass} inline-flex items-center gap-2 text-sm font-semibold text-[var(--wn-11)]`}
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="" className="h-7 w-7 rounded-full object-cover" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--wa-3)] text-xs font-bold text-[var(--wa-11)]">
            {initialsOf(label)}
          </span>
        )}
        <span className="max-w-[10rem] truncate">{label}</span>
      </button>

      {showMenu && (
        <div
          role="menu"
          className="wc-card absolute right-0 z-50 mt-2 w-64 overflow-hidden p-2"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-[var(--wn-12)]">
              {user.displayName || 'Signed in'}
            </p>
            <p className="truncate text-xs text-[var(--wn-9)]">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-[var(--wn-4)]" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setShowMenu(false);
              void signOutUser();
            }}
            className="wc-nav-item"
          >
            <span aria-hidden="true">↩︎</span>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
};
