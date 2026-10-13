import React, { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { LoginButton } from './LoginButton';
import { ThemeToggle } from './ThemeToggle';
import { db } from '../services/firebase';

type SectionId = 'games' | 'progress' | 'account';

interface DashboardProps {
  /** True once a licence has been activated on this device. */
  isUnlocked: boolean;
  /** Enter the WordCrew game (demo or full, decided by the game itself). */
  onPlayGame: () => void;
  /** Start the paid path — the app gates this behind sign-in. */
  onUnlock: () => void;
  /** Quoted price for the CTA, or null while the pricing API is unreachable. */
  priceLabel: string | null;
}

interface GameEntry {
  id: string;
  name: string;
  tagline: string;
  emoji: string;
  meta: string;
  available: boolean;
}

/**
 * The catalogue. WordCrew is the first title; the two placeholders keep the grid's
 * shape honest — more games land here over time.
 */
const GAMES: GameEntry[] = [
  {
    id: 'wordcrew',
    name: 'WordCrew',
    tagline: 'One player describes the word, the crew guesses it before time runs out.',
    emoji: '🔤',
    meta: 'Normal · Hell · Team',
    available: true,
  },
];

const SECTIONS: { id: SectionId; label: string; icon: string; title: string; subtitle: string }[] = [
  { id: 'games', label: 'Games', icon: '🎮', title: 'Game collection', subtitle: 'Pick a game and start a round.' },
  { id: 'progress', label: 'My progress', icon: '📈', title: 'My progress', subtitle: 'Your rounds, scores and streaks.' },
  { id: 'account', label: 'Account', icon: '👤', title: 'Account', subtitle: 'Sign-in status and this device.' },
];

/** Minimal shape of `users/{uid}` — the Firestore side of the user/progress split. */
interface ProgressDoc {
  roundsPlayed?: number;
  bestScore?: number;
  wordsGuessed?: number;
  bestStreak?: number;
}

const useProgressDoc = (): ProgressDoc | null => {
  const { user } = useAuth();
  const [data, setData] = useState<ProgressDoc | null>(null);

  useEffect(() => {
    if (!db || !user) {
      setData(null);
      return;
    }
    return onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => setData(snapshot.exists() ? (snapshot.data() as ProgressDoc) : null),
      () => setData(null),
    );
  }, [user]);

  return data;
};

const StatCard: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="wc-card p-4">
    <p className="text-2xl font-bold text-[var(--wn-12)]">{value.toLocaleString()}</p>
    <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[var(--wn-9)]">{label}</p>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ isUnlocked, onPlayGame, onUnlock, priceLabel }) => {
  const { user, loading } = useAuth();
  const [section, setSection] = useState<SectionId>('games');
  const progress = useProgressDoc();

  const active = useMemo(() => SECTIONS.find((item) => item.id === section) ?? SECTIONS[0], [section]);

  const renderGames = () => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {GAMES.map((game) => (
        <article key={game.id} className="wc-tile flex flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--wa-2)] text-2xl"
              aria-hidden="true"
            >
              {game.emoji}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider ${
                isUnlocked
                  ? 'bg-[var(--wa-2)] text-[var(--wa-11)]'
                  : 'bg-[var(--wn-3)] text-[var(--wn-9)]'
              }`}
            >
              {isUnlocked ? 'Full version' : 'Free demo'}
            </span>
          </div>

          <h3 className="mt-4 text-lg font-bold text-[var(--wn-12)]">{game.name}</h3>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[var(--wn-9)]">{game.meta}</p>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--wn-10)]">{game.tagline}</p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={onPlayGame} className="wc-btn wc-btn-primary flex-1">
              ▶ Play
            </button>
            {!isUnlocked && (
              <button type="button" onClick={onUnlock} className="wc-btn wc-btn-secondary flex-1">
                Unlock{priceLabel ? ` · ${priceLabel}` : ''}
              </button>
            )}
          </div>
        </article>
      ))}

      {[0, 1].map((slot) => (
        <article
          key={`soon-${slot}`}
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--wn-4)] p-6 text-center"
        >
          <span className="text-2xl opacity-40" aria-hidden="true">
            ✨
          </span>
          <p className="mt-2 text-sm font-semibold text-[var(--wn-9)]">More games coming soon</p>
          <p className="mt-1 text-xs text-[var(--wn-8)]">New titles land here over time.</p>
        </article>
      ))}
    </div>
  );

  const renderProgress = () => {
    if (!loading && !user) {
      return (
        <div className="wc-card flex flex-col items-center gap-3 p-8 text-center">
          <span className="text-3xl" aria-hidden="true">
            📈
          </span>
          <p className="text-sm text-[var(--wn-10)]">
            Sign in to sync your rounds and scores across devices.
          </p>
          <LoginButton />
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Rounds played" value={progress?.roundsPlayed ?? 0} />
        <StatCard label="Best score" value={progress?.bestScore ?? 0} />
        <StatCard label="Words guessed" value={progress?.wordsGuessed ?? 0} />
        <StatCard label="Best streak" value={progress?.bestStreak ?? 0} />
      </div>
    );
  };

  const renderAccount = () => (
    <div className="wc-card max-w-lg p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--wa-2)] text-xl" aria-hidden="true">
          👤
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--wn-12)]">
            {user ? user.displayName || 'Signed in' : 'Not signed in'}
          </p>
          <p className="truncate text-xs text-[var(--wn-9)]">
            {user ? user.email : 'Playing as a guest on this device.'}
          </p>
        </div>
      </div>

      <div className="my-5 h-px bg-[var(--wn-4)]" />

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--wn-12)]">This device</p>
          <p className="text-xs text-[var(--wn-9)]">
            {isUnlocked ? 'Full version unlocked.' : 'Running the free demo.'}
          </p>
        </div>
        {!isUnlocked && (
          <button type="button" onClick={onUnlock} className="wc-btn wc-btn-primary wc-btn-sm">
            Unlock{priceLabel ? ` · ${priceLabel}` : ''}
          </button>
        )}
      </div>

      <div className="mt-5">
        <LoginButton variant="block" />
      </div>
    </div>
  );

  return (
    <div className="wc-theme flex h-full w-full flex-col bg-[var(--page-bg)] md:flex-row">
      {/* Left column — menu */}
      <aside className="flex w-full shrink-0 flex-col border-b border-[var(--wn-4)] bg-[var(--rail-bg)] p-4 md:w-64 md:border-b-0 md:border-r">
        <div className="mb-4 flex items-center gap-2 px-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--btn-primary-bg)] text-base font-black text-[var(--on-accent)]">
            W
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-wide text-[var(--wn-12)]">WordCrew</p>
            <p className="truncate text-[0.65rem] uppercase tracking-[0.2em] text-[var(--wn-9)]">Portal</p>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible" aria-label="Dashboard sections">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className="wc-nav-item whitespace-nowrap md:whitespace-normal"
              aria-current={section === item.id ? 'page' : undefined}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-4 hidden md:block md:mt-auto md:pt-4">
          <LoginButton variant="block" />
        </div>
      </aside>

      {/* Right column — working area */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--wn-4)] px-5 py-4 md:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-[var(--wn-12)] md:text-xl">{active.title}</h1>
            <p className="truncate text-xs text-[var(--wn-9)]">{active.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="md:hidden">
              <LoginButton />
            </div>
          </div>
        </header>

        <div className="wc-scroll min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
          {section === 'games' && renderGames()}
          {section === 'progress' && renderProgress()}
          {section === 'account' && renderAccount()}
        </div>
      </main>
    </div>
  );
};
