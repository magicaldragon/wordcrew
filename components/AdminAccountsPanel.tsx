/**
 * Admin — account management and the Solo monthly records.
 *
 * Both panels read the *directory* from Firestore (`users/{uid}`: name, presence,
 * last login) and join it with D1's paid orders (`/api/admin/accounts`) to label each
 * account FREE or PRO. The join key is the Firebase uid, with the verified email as a
 * fallback so a licence granted before the first sign-in still shows up.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type Timestamp,
} from 'firebase/firestore';
import {
  DISPLAY_NAME_MAX,
  DISPLAY_NAME_MIN,
  useAuth,
} from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { fetchAdminAccountAccess, type AdminAccountAccess } from '../services/payments';
import {
  currentPeriod,
  fetchSoloBoard,
  listSoloPeriods,
  refreshSoloDisplayName,
  type SoloScoreEntry,
} from '../services/soloLeaderboard';
import { DAILY_TRACK, SOLO_TRACKS, type SoloTrack } from '../services/solo';
import { toast } from './Feedback';
import { Icon } from './Icon';

/** A tab is considered live while its heartbeat is this fresh. */
const ONLINE_WINDOW_MS = 3 * 60 * 1000;

const INPUT_CLASS =
  'w-full rounded-[var(--r-md)] border border-[var(--wn-4)] bg-[var(--field-bg)] px-3 py-2 text-sm text-[var(--wn-12)] outline-none transition placeholder:text-[var(--wn-8)] focus:border-[var(--wa-5)] focus:ring-2 focus:ring-[var(--wa-4)]';

const toMillis = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object') {
    const candidate = value as Timestamp;
    if (typeof candidate.toMillis === 'function') return candidate.toMillis();
  }
  return null;
};

const relativeTime = (ms: number | null): string => {
  if (!ms) return 'Never';
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} d ago`;
  return new Date(ms).toLocaleDateString();
};

const initialsOf = (label: string): string =>
  label
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';

interface DirectoryRow {
  uid: string;
  email: string;
  displayName: string;
  lastSeenAt: number | null;
  lastLoginAt: number | null;
  createdAt: number | null;
  onlineFlag: boolean;
}

interface AccountRow extends DirectoryRow {
  pro: boolean;
  proSince: number | null;
  online: boolean;
}

type TierFilter = 'all' | 'free' | 'pro';

const FILTERS: { id: TierFilter; label: string }[] = [
  { id: 'all', label: 'All accounts' },
  { id: 'free', label: 'FREE' },
  { id: 'pro', label: 'PRO' },
];

const TierBadge: React.FC<{ pro: boolean }> = ({ pro }) => (
  <span
    className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider ${
      pro
        ? 'bg-[var(--wa-2)] text-[var(--wa-11)]'
        : 'bg-[var(--wn-3)] text-[var(--wn-9)]'
    }`}
  >
    {pro ? 'PRO' : 'FREE'}
  </span>
);

export const AdminAccountsPanel: React.FC = () => {
  const { getIdToken } = useAuth();
  const [directory, setDirectory] = useState<DirectoryRow[]>([]);
  const [access, setAccess] = useState<AdminAccountAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessLoading, setAccessLoading] = useState(true);
  const [filter, setFilter] = useState<TierFilter>('all');
  const [search, setSearch] = useState('');
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  // Live directory: names, presence and last login all come from the profile docs.
  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    return onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        setDirectory(
          snapshot.docs.map((item) => {
            const data = item.data() as Record<string, unknown>;
            return {
              uid: item.id,
              email: typeof data.email === 'string' ? data.email : '',
              displayName: typeof data.displayName === 'string' ? data.displayName : '',
              lastSeenAt: toMillis(data.lastSeenAt),
              lastLoginAt: toMillis(data.lastLoginAt),
              createdAt: toMillis(data.createdAt),
              onlineFlag: data.online === true,
            };
          }),
        );
        setError('');
        setLoading(false);
      },
      () => {
        setLoading(false);
        setError(
          'Could not read the account directory. Check that the admin email in firestore.rules matches ADMIN_EMAILS.',
        );
      },
    );
  }, []);

  const loadAccess = useCallback(async () => {
    setAccessLoading(true);
    const rows = await fetchAdminAccountAccess(await getIdToken());
    setAccess(rows);
    setAccessLoading(false);
  }, [getIdToken]);

  useEffect(() => {
    void loadAccess();
  }, [loadAccess]);

  const rows = useMemo<AccountRow[]>(() => {
    const proByUid = new Map<string, number | null>();
    const proByEmail = new Map<string, number | null>();
    for (const item of access) {
      if (item.uid) proByUid.set(item.uid, item.paidAt);
      if (item.email) proByEmail.set(item.email.trim().toLowerCase(), item.paidAt);
    }

    return directory
      .map((item) => {
        const email = item.email.trim().toLowerCase();
        const pro = proByUid.has(item.uid) || (Boolean(email) && proByEmail.has(email));
        const proSince = proByUid.get(item.uid) ?? (email ? proByEmail.get(email) ?? null : null);
        const online =
          item.onlineFlag &&
          item.lastSeenAt !== null &&
          Date.now() - item.lastSeenAt < ONLINE_WINDOW_MS;
        return { ...item, pro, proSince, online };
      })
      .sort((a, b) => {
        if (a.online !== b.online) return a.online ? -1 : 1;
        return (a.displayName || a.email).localeCompare(b.displayName || b.email);
      });
  }, [directory, access]);

  const stats = useMemo(() => {
    const pro = rows.filter((row) => row.pro).length;
    return {
      total: rows.length,
      pro,
      free: rows.length - pro,
      online: rows.filter((row) => row.online).length,
    };
  }, [rows]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === 'pro' && !row.pro) return false;
      if (filter === 'free' && row.pro) return false;
      if (!needle) return true;
      return (
        row.displayName.toLowerCase().includes(needle) ||
        row.email.toLowerCase().includes(needle)
      );
    });
  }, [rows, filter, search]);

  const startEdit = (row: AccountRow) => {
    setEditingUid(row.uid);
    setDraft(row.displayName || row.email.split('@')[0] || '');
  };

  const saveName = async (row: AccountRow) => {
    if (!db || saving) return;
    const name = draft.trim().replace(/\s+/g, ' ');
    if (name.length < DISPLAY_NAME_MIN || name.length > DISPLAY_NAME_MAX) {
      toast(`Names need ${DISPLAY_NAME_MIN}–${DISPLAY_NAME_MAX} characters.`, 'error');
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', row.uid), {
        displayName: name,
        displayNameUpdatedAt: serverTimestamp(),
      });
      // The player's current-period board rows follow the admin rename too.
      void refreshSoloDisplayName(row.uid, name);
      toast(`Renamed ${row.email || row.uid} to ${name}.`, 'success');
      setEditingUid(null);
    } catch {
      toast('Could not rename that account. The admin rules may not be deployed yet.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="wc-card p-4">
          <p className="text-2xl font-bold tabular-nums text-[var(--wn-12)]">{stats.total}</p>
          <p className="mt-1 text-xs font-medium text-[var(--wn-9)]">Accounts</p>
        </div>
        <div className="wc-card p-4">
          <p className="text-2xl font-bold tabular-nums text-[var(--wa-11)]">{stats.pro}</p>
          <p className="mt-1 text-xs font-medium text-[var(--wn-9)]">PRO</p>
        </div>
        <div className="wc-card p-4">
          <p className="text-2xl font-bold tabular-nums text-[var(--wn-12)]">{stats.free}</p>
          <p className="mt-1 text-xs font-medium text-[var(--wn-9)]">FREE</p>
        </div>
        <div className="wc-card p-4">
          <p className="flex items-center gap-2 text-2xl font-bold tabular-nums text-[var(--wn-12)]">
            {stats.online > 0 && <span className="wc-live-dot" aria-hidden="true" />}
            {stats.online}
          </p>
          <p className="mt-1 text-xs font-medium text-[var(--wn-9)]">Online now</p>
        </div>
      </div>

      <div className="wc-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[var(--wn-12)]">Accounts</p>
            <p className="mt-1 text-xs text-[var(--wn-9)]">
              FREE upgrades to PRO automatically once a paid order is matched to the account
              (uid or verified email).
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadAccess()}
            className="wc-btn wc-btn-secondary wc-btn-sm"
          >
            {accessLoading ? 'Refreshing…' : 'Refresh PRO'}
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter accounts">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                aria-pressed={filter === item.id}
                className={`wc-btn wc-btn-sm ${filter === item.id ? 'wc-btn-primary' : 'wc-btn-ghost'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="sm:ml-auto sm:w-64">
            <label htmlFor="adminAccountSearch" className="sr-only">
              Search accounts
            </label>
            <input
              id="adminAccountSearch"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name or email…"
              className={INPUT_CLASS}
            />
          </div>
        </div>

        {error && (
          <p role="status" className="mt-3 text-xs text-[var(--danger)]">
            {error}
          </p>
        )}

        {loading ? (
          <p className="mt-4 animate-subtlePulse text-xs text-[var(--wn-9)]">Loading accounts…</p>
        ) : visible.length === 0 ? (
          <p className="mt-4 text-xs text-[var(--wn-9)]">No accounts match this view.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {visible.map((row) => {
              const label = row.displayName || row.email || row.uid;
              const isEditing = editingUid === row.uid;
              return (
                <li
                  key={row.uid}
                  className="rounded-[var(--r-md)] border border-[var(--wn-4)] bg-[var(--card-bg)] p-3"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--wa-2)] text-xs font-bold text-[var(--wa-11)]"
                      aria-hidden="true"
                    >
                      {initialsOf(label)}
                    </span>

                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            type="text"
                            value={draft}
                            maxLength={DISPLAY_NAME_MAX}
                            onChange={(event) => setDraft(event.target.value)}
                            aria-label={`Display name for ${row.email || row.uid}`}
                            className={INPUT_CLASS}
                            autoFocus
                          />
                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => void saveName(row)}
                              disabled={saving}
                              className="wc-btn wc-btn-primary wc-btn-sm"
                            >
                              {saving ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingUid(null)}
                              className="wc-btn wc-btn-secondary wc-btn-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-[var(--wn-12)]">
                            {row.displayName || '(no display name)'}
                          </p>
                          <TierBadge pro={row.pro} />
                          {row.online && (
                            <span className="inline-flex shrink-0 items-center gap-1 text-[0.65rem] font-semibold text-[var(--wa-11)]">
                              <span className="wc-live-dot" aria-hidden="true" />
                              Online
                            </span>
                          )}
                        </div>
                      )}

                      <p className="mt-0.5 truncate text-xs text-[var(--wn-9)]">
                        {row.email || 'No email on file'}
                      </p>
                      <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.7rem] text-[var(--wn-8)]">
                        <span>Last seen: {relativeTime(row.lastSeenAt)}</span>
                        <span>Last login: {relativeTime(row.lastLoginAt)}</span>
                        <span>Joined: {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : 'Unknown'}</span>
                        {row.pro && <span>PRO since: {relativeTime(row.proSince)}</span>}
                      </p>
                    </div>

                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        className="wc-icon-btn shrink-0"
                        aria-label={`Rename ${label}`}
                        title="Rename this account"
                      >
                        <Icon name="pencil" size={16} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

const RECORD_BOARDS: SoloTrack[] = [...SOLO_TRACKS, DAILY_TRACK];

const formatPeriod = (period: string): string => {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return period;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

/** The archived Solo boards: every month that has scores, per track, read-only. */
export const AdminMonthlyRecords: React.FC = () => {
  const [boardId, setBoardId] = useState(RECORD_BOARDS[0].id);
  const [periods, setPeriods] = useState<string[]>([]);
  const [period, setPeriod] = useState<string | null>(null);
  const [rows, setRows] = useState<SoloScoreEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const isDaily = boardId === DAILY_TRACK.id;

  useEffect(() => {
    let cancelled = false;
    setPeriods([]);
    setPeriod(null);
    setRows([]);
    setLoading(true);
    void (async () => {
      const found = await listSoloPeriods(boardId);
      if (cancelled) return;
      setPeriods(found);
      const now = currentPeriod(boardId);
      setPeriod(found.includes(now) ? now : found[0] ?? now);
    })();
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  useEffect(() => {
    if (!period) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const board = await fetchSoloBoard(boardId, period, null, 10);
      if (cancelled) return;
      setRows(board?.rows ?? []);
      setTotal(board?.total ?? 0);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [boardId, period]);

  return (
    <div className="wc-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--wn-12)]">Monthly records</p>
          <p className="mt-1 text-xs text-[var(--wn-9)]">
            Every finished month stays on file. Today&apos;s Challenge keeps a board per day.
          </p>
        </div>
        {period && (
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            aria-label="Choose a month"
            className="shrink-0 rounded-[var(--r-md)] border border-[var(--wn-4)] bg-[var(--field-bg)] px-2.5 py-1.5 text-xs font-semibold text-[var(--wn-11)] outline-none focus:border-[var(--wa-5)]"
          >
            {periods.length === 0 && <option value={period}>{formatPeriod(period)}</option>}
            {periods.map((item) => (
              <option key={item} value={item}>
                {isDaily ? item : formatPeriod(item)}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Choose a board">
        {RECORD_BOARDS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setBoardId(item.id)}
            aria-pressed={boardId === item.id}
            className={`wc-btn wc-btn-sm ${boardId === item.id ? 'wc-btn-primary' : 'wc-btn-ghost'}`}
          >
            <span aria-hidden="true">{item.emoji}</span>
            {item.name}
          </button>
        ))}
      </div>

      <p className="mt-2 text-xs font-semibold text-[var(--wa-10)]">
        {isDaily ? 'Daily board' : 'Monthly board'}
        {period ? ` · ${formatPeriod(period)}` : ''}
        {!loading && total > 0 ? ` · ${total} player${total === 1 ? '' : 's'}` : ''}
      </p>

      {loading ? (
        <p className="mt-3 animate-subtlePulse text-xs text-[var(--wn-9)]">Loading records…</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-xs text-[var(--wn-9)]">No scores on this board yet.</p>
      ) : (
        <ol className="mt-3 space-y-1">
          {rows.map((row, index) => (
            <li
              key={row.uid}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--wn-10)] odd:bg-[var(--wn-2)]"
            >
              <span className="w-5 shrink-0 text-center font-bold text-[var(--wa-10)]">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate">{row.name}</span>
              <span className="shrink-0 text-xs text-[var(--wn-8)]">{row.wordsGuessed} words</span>
              <span className="w-16 shrink-0 text-right font-bold tabular-nums text-[var(--wn-12)]">
                {row.score.toLocaleString()}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};
