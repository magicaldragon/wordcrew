import React, { useCallback, useEffect, useState } from 'react';
import { createOrder, fetchOrder, formatPrice, type OrderDraft } from '../services/payments';
import { FULL_VERSION_PERKS } from '../constants';

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
  const [phase, setPhase] = useState<Phase>('loading');
  const [order, setOrder] = useState<OrderDraft | null>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const startOrder = useCallback(async () => {
    setPhase('loading');
    setError('');
    try {
      setOrder(await createOrder('pro'));
      setPhase('awaiting');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the order.');
      setPhase('error');
    }
  }, []);

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="purchaseDialogTitle"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-cyber-purple/40 bg-dark-metal p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="purchaseDialogTitle"
            className="font-heading text-xl font-bold tracking-wide text-warning-yellow"
          >
            🔓 Unlock Full Version
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-1.5 py-0.5 text-sm leading-none text-muted-text hover:text-light-text"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {amountLabel && (
          <p className="mt-1 font-heading text-2xl font-bold text-neon-green">
            {amountLabel}
            <span className="ml-2 font-sans text-xs font-normal uppercase tracking-wider text-muted-text">
              one-time · yours forever
            </span>
          </p>
        )}

        <ul className="mt-3 space-y-1.5 text-left font-sans text-xs text-muted-text">
          {FULL_VERSION_PERKS.map((perk) => (
            <li key={perk}>{perk}</li>
          ))}
        </ul>

        {phase === 'loading' && (
          <p className="mt-5 text-center font-sans text-sm text-muted-text animate-subtlePulse">
            Preparing your QR code…
          </p>
        )}

        {phase === 'error' && (
          <div className="mt-5 text-center">
            <p role="alert" className="font-sans text-sm text-danger-red">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void startOrder()}
              className="futuristic-button mt-3 rounded-lg bg-cyber-purple/70 px-4 py-2 text-sm font-semibold text-light-text hover:bg-cyber-purple"
            >
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
            <p className="mt-3 text-center font-sans text-xs text-muted-text">
              Scan with any banking app, or transfer manually to
            </p>
            <p className="mt-1 text-center font-sans text-sm text-light-text">
              <span className="font-semibold">{order.bank.name}</span> · {order.bank.accountNumber}
            </p>

            <div className="mt-3 rounded-lg border border-electric-blue/30 bg-white/5 p-3">
              <p className="font-sans text-[0.7rem] uppercase tracking-wider text-muted-text">
                Transfer memo — keep it exactly as shown
              </p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <code className="font-heading text-base tracking-wider text-electric-blue">
                  {order.code}
                </code>
                <button
                  type="button"
                  onClick={() => void copy(order.code, 'code')}
                  className="rounded-md border border-electric-blue/40 px-2 py-1 font-sans text-[0.7rem] text-light-text hover:bg-electric-blue/10"
                >
                  {copied === 'code' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="mt-2 font-sans text-[0.7rem] text-muted-text">
                The licence is issued automatically the moment the transfer arrives.
              </p>
            </div>

            <p className="mt-3 text-center font-sans text-xs text-muted-text animate-subtlePulse">
              ⏳ Waiting for your transfer…
            </p>
          </div>
        )}

        {phase === 'paid' && (
          <div className="mt-4 text-center">
            <p className="text-3xl" role="img" aria-hidden="true">
              🎉
            </p>
            <p className="mt-1 font-sans text-sm text-neon-green">
              Payment received — here is your licence key.
            </p>
            <code className="mt-3 block rounded-lg border border-neon-green/40 bg-white/5 px-3 py-3 font-heading text-lg tracking-[0.15em] text-light-text">
              {licenseKey}
            </code>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => void copy(licenseKey, 'key')}
                className="futuristic-button flex-1 rounded-lg border border-electric-blue/40 px-4 py-2.5 font-sans text-sm text-light-text hover:bg-electric-blue/10"
              >
                {copied === 'key' ? 'Copied' : 'Copy key'}
              </button>
              <button
                type="button"
                onClick={() => onLicensed(licenseKey)}
                className="futuristic-button flex-1 rounded-lg bg-gradient-to-r from-neon-green to-electric-blue px-4 py-2.5 font-bold text-dark-metal"
              >
                Unlock this device
              </button>
            </div>
            <p className="mt-2 font-sans text-[0.7rem] text-muted-text">
              Keep this key — it also unlocks the game on your other devices.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
