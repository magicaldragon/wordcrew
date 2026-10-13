import React, { useCallback, useEffect, useState } from 'react';
import { createOrder, fetchOrder, formatPrice, type OrderDraft } from '../services/payments';
import { FULL_VERSION_PERKS } from '../constants';
import { useAuth } from '../contexts/AuthContext';

interface PurchaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Fired once the order is paid, handing the freshly issued licence key to the app. */
  onLicensed: (licenseKey: string) => void;
  /** Shown on the CTA before the order exists; keeps the price visible without a second fetch. */
  priceLabel?: string | null;
}

type Phase = 'loading' | 'awaiting' | 'paid' | 'error';

// Bank transfers land in seconds to a couple of minutes, so a light poll is enough
// to reveal the licence without the teacher ever pressing refresh.
const POLL_INTERVAL_MS = 4000;

export const PurchaseDialog: React.FC<PurchaseDialogProps> = ({
  isOpen,
  onClose,
  onLicensed,
  priceLabel,
}) => {
  const { getIdToken } = useAuth();
  const [phase, setPhase] = useState<Phase>('loading');
  const [order, setOrder] = useState<OrderDraft | null>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const startOrder = useCallback(async () => {
    setPhase('loading');
    setError('');
    try {
      // The worker rejects token-less orders, so a stale/absent session is caught here
      // rather than surfacing as a confusing 401.
      const token = await getIdToken();
      if (!token) {
        setError('Your session expired. Please sign in again to continue.');
        setPhase('error');
        return;
      }
      setOrder(await createOrder('pro', token));
      setPhase('awaiting');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the order.');
      setPhase('error');
    }
  }, [getIdToken]);

  useEffect(() => {
    if (!isOpen) return;
    setLicenseKey('');
    setCopied('');
    setOrder(null);
    void startOrder();
  }, [isOpen, startOrder]);

  useEffect(() => {
    if (!isOpen || phase !== 'awaiting' || !order) return;
    let cancelled = false;
    const timer = window.setInterval(async () => {
      try {
        const state = await fetchOrder(order.code);
        if (cancelled) return;
        if (state.status === 'paid' && state.licenseKey) {
          setLicenseKey(state.licenseKey);
          setPhase('paid');
        } else if (state.status === 'expired') {
          setError('This QR code has expired. Start a new one to continue.');
          setPhase('error');
        }
      } catch {
        // Transient network hiccup: keep polling rather than dropping the order.
      }
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isOpen, phase, order]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const copy = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(field);
    } catch {
      setCopied('');
    }
  };

  if (!isOpen) return null;

  const amountLabel = order ? formatPrice(order.amount) : priceLabel;

  return (
    <div
      className="wc-theme fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="purchaseDialogTitle"
      onClick={onClose}
    >
      <div
        className="wc-card wc-scroll max-h-[92vh] w-full max-w-md overflow-y-auto p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="purchaseDialogTitle" className="text-xl font-bold tracking-wide text-[var(--wn-12)]">
            Unlock Full Version
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 -mt-1 rounded-full px-2 py-1 text-sm leading-none text-[var(--wn-9)] transition hover:text-[var(--wn-12)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {amountLabel && (
          <p className="mt-1 text-2xl font-bold text-[var(--wa-11)]">
            {amountLabel}
            <span className="ml-2 text-xs font-normal uppercase tracking-wider text-[var(--wn-9)]">
              one-time · yours forever
            </span>
          </p>
        )}

        <ul className="mt-3 space-y-1.5 text-left text-xs text-[var(--wn-10)]">
          {FULL_VERSION_PERKS.map((perk) => (
            <li key={perk}>{perk}</li>
          ))}
        </ul>

        {phase === 'loading' && (
          <p className="mt-5 text-center text-sm text-[var(--wn-9)]">Preparing your QR code…</p>
        )}

        {phase === 'error' && (
          <div className="mt-5 text-center">
            <p role="alert" className="text-sm text-[var(--danger)]">
              {error}
            </p>
            <button type="button" onClick={() => void startOrder()} className="wc-btn wc-btn-secondary mt-3">
              Try again
            </button>
          </div>
        )}

        {phase === 'awaiting' && order && (
          <div className="mt-4">
            <img
              src={order.qrUrl}
              alt={`VietQR code for order ${order.code}`}
              width={208}
              height={208}
              className="mx-auto h-52 w-52 rounded-lg bg-white p-2"
            />
            <p className="mt-3 text-center text-xs text-[var(--wn-9)]">
              Scan with any banking app, or transfer manually to
            </p>
            <p className="mt-1 text-center text-sm text-[var(--wn-12)]">
              <span className="font-semibold">{order.bank.name}</span> · {order.bank.accountNumber}
            </p>

            <div className="mt-3 rounded-xl border border-[var(--wn-4)] bg-[var(--field-bg)] p-3">
              <p className="text-[0.7rem] uppercase tracking-wider text-[var(--wn-9)]">
                Transfer memo — keep it exactly as shown
              </p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <code className="text-base font-bold tracking-wider text-[var(--wa-11)]">{order.code}</code>
                <button
                  type="button"
                  onClick={() => void copy(order.code, 'code')}
                  className="wc-btn wc-btn-secondary wc-btn-sm"
                >
                  {copied === 'code' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="mt-2 text-[0.7rem] text-[var(--wn-9)]">
                The licence is issued automatically the moment the transfer arrives.
              </p>
            </div>

            <p className="mt-3 text-center text-xs text-[var(--wn-9)]">⏳ Waiting for your transfer…</p>
          </div>
        )}

        {phase === 'paid' && (
          <div className="mt-4 text-center">
            <p className="text-3xl" role="img" aria-hidden="true">
              🎉
            </p>
            <p className="mt-1 text-sm text-[var(--wa-11)]">
              Payment received — here is your licence key.
            </p>
            <code className="mt-3 block rounded-xl border border-[var(--wa-4)] bg-[var(--field-bg)] px-3 py-3 text-lg tracking-[0.15em] text-[var(--wn-12)]">
              {licenseKey}
            </code>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => void copy(licenseKey, 'key')}
                className="wc-btn wc-btn-secondary flex-1"
              >
                {copied === 'key' ? 'Copied' : 'Copy key'}
              </button>
              <button
                type="button"
                onClick={() => onLicensed(licenseKey)}
                className="wc-btn wc-btn-primary flex-1"
              >
                Unlock this device
              </button>
            </div>
            <p className="mt-2 text-[0.7rem] text-[var(--wn-9)]">
              Keep this key — it also unlocks the game on your other devices.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
