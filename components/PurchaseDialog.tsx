import React, { useCallback, useEffect, useState } from 'react';
import {
  createOrder,
  fetchOrder,
  fetchPricing,
  formatPrice,
  type OrderDraft,
  type PricingPlan,
} from '../services/payments';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from './Icon';
import { useT } from '../i18n/useT';
import { describeError } from '../i18n/errors';

interface PurchaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Fired once the order is paid, handing the freshly issued licence key to the app. */
  onLicensed: (licenseKey: string) => void;
  /** Opens the portal sign-in panel; the buyer comes back here to finish the order. */
  onRequireSignIn: () => void;
  /** Shown on the CTA before the order exists; keeps the price visible without a second fetch. */
  priceLabel?: string | null;
  /** True while the sign-in panel sits on top — this dialog must not answer Escape then. */
  suspendEscape?: boolean;
}

type Phase = 'intro' | 'loading' | 'awaiting' | 'paid' | 'error';

// Bank transfers land in seconds to a couple of minutes, so a light poll is enough
// to reveal the licence without the teacher ever pressing refresh.
const POLL_INTERVAL_MS = 4000;

/** The plan the dialog opens on: the yearly one, since it is the offer we want picked. */
const PREFERRED_PLAN = 'year';

export const PurchaseDialog: React.FC<PurchaseDialogProps> = ({
  isOpen,
  onClose,
  onLicensed,
  onRequireSignIn,
  priceLabel,
  suspendEscape = false,
}) => {
  const { user, getIdToken } = useAuth();
  const t = useT('auth');
  const common = useT('common');
  const errors = useT('errors');
  const [phase, setPhase] = useState<Phase>('intro');
  const [order, setOrder] = useState<OrderDraft | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  // Set the moment the buyer commits to the price; the order waits for an account.
  const [intent, setIntent] = useState(false);
  // Single-teacher plans only: school licences are invoiced and granted by hand, so a
  // self-service QR would charge the wrong thing. `planId` is what the worker bills.
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [planId, setPlanId] = useState('pro');

  const startOrder = useCallback(async () => {
    setPhase('loading');
    setError('');
    try {
      // The worker rejects token-less orders, so a stale/absent session is caught here
      // rather than surfacing as a confusing 401.
      const token = await getIdToken();
      if (!token) {
        setError(t.purchase.sessionExpired);
        setPhase('error');
        return;
      }
      setSessionToken(token);
      // The price is recomputed on the worker from `planId`, so the browser never decides
      // what is charged.
      setOrder(await createOrder('pro', token, planId));
      setPhase('awaiting');
    } catch (err) {
      setError(describeError(errors, err, t.purchase.orderFailed));
      setPhase('error');
    }
  }, [getIdToken, planId, t, errors]);

  // Price first: opening shows what the licence covers. The QR only starts once the
  // buyer commits, and sign-in is asked for at that point rather than on the way in.
  useEffect(() => {
    if (!isOpen) return;
    setLicenseKey('');
    setCopied('');
    setOrder(null);
    setSessionToken(null);
    setIntent(false);
    setError('');
    setPhase('intro');
  }, [isOpen]);

  // The term list is quoted once per opening. An unreachable API simply leaves the
  // single legacy price in place, which is still a valid (lifetime) purchase.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void (async () => {
      try {
        const pricing = await fetchPricing();
        if (cancelled) return;
        const offered = pricing.plans.filter((plan) => plan.seats <= 1);
        if (offered.length === 0) return;
        setPlans(offered);
        setPlanId(
          offered.some((plan) => plan.id === PREFERRED_PLAN) ? PREFERRED_PLAN : offered[0].id,
        );
      } catch {
        /* Pricing unavailable — the dialog keeps the price label it was given. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // The sign-in panel sits on top of this one. Once it closes with an account present,
  // the checkout that was waiting on it carries on by itself.
  useEffect(() => {
    if (isOpen && intent && user && phase === 'intro') void startOrder();
  }, [isOpen, intent, user, phase, startOrder]);

  useEffect(() => {
    if (!isOpen || phase !== 'awaiting' || !order || !sessionToken) return;
    let cancelled = false;
    const timer = window.setInterval(async () => {
      try {
        // Ownership is checked server-side, so the polling call carries the same token
        // the order was created with.
        const state = await fetchOrder(order.code, sessionToken);
        if (cancelled) return;
        if (state.status === 'paid' && state.licenseKey) {
          setLicenseKey(state.licenseKey);
          setPhase('paid');
        } else if (state.status === 'expired') {
          setError(t.purchase.qrExpired);
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
  }, [isOpen, phase, order, sessionToken, t]);

  useEffect(() => {
    if (!isOpen || suspendEscape) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, suspendEscape, onClose]);

  const copy = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(field);
    } catch {
      setCopied('');
    }
  };

  // Committing to the price is what starts an order; anyone without an account is asked
  // to sign in first, and the order resumes the moment that panel closes.
  const beginCheckout = () => {
    if (user) {
      void startOrder();
      return;
    }
    setIntent(true);
    onRequireSignIn();
  };

  if (!isOpen) return null;

  const selectedPlan = plans.find((plan) => plan.id === planId) ?? null;
  const amountLabel = order
    ? formatPrice(order.amount)
    : selectedPlan
      ? formatPrice(selectedPlan.amount)
      : priceLabel;
  // The term sits next to the price so a monthly plan never reads as "yours forever".
  const termLabel =
    selectedPlan && selectedPlan.days !== null
      ? selectedPlan.days <= 31
        ? t.purchase.perMonth
        : t.purchase.perYear
      : t.purchase.oneTime;

  return (
    <div
      className="wc-theme fixed inset-0 z-[var(--z-dialog)] flex items-center justify-center bg-black/70 p-4"
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
            {t.unlockFull}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 -mt-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--wn-9)] transition hover:bg-[var(--wn-3)] hover:text-[var(--wn-12)]"
            aria-label={common.close}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {amountLabel && (
          <p className="mt-1 text-2xl font-bold text-[var(--wa-11)]">
            {amountLabel}
            <span className="ml-2 text-xs font-normal uppercase tracking-wider text-[var(--wn-9)]">
              {termLabel}
            </span>
          </p>
        )}

        <ul className="mt-3 space-y-1.5 text-left text-xs text-[var(--wn-10)]">
          {t.perks.map((perk) => (
            <li key={perk}>{perk}</li>
          ))}
        </ul>

        {phase === 'intro' && plans.length > 0 && (
          <div className="mt-4" role="radiogroup" aria-label={t.purchase.choosePlan}>
            <p className="text-[0.7rem] uppercase tracking-wider text-[var(--wn-9)]">
              {t.purchase.choosePlan}
            </p>
            <div className="mt-2 space-y-2">
              {plans.map((plan) => {
                const active = plan.id === planId;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setPlanId(plan.id)}
                    className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition ${
                      active
                        ? 'border-[var(--wa-6)] bg-[var(--wa-2)] font-semibold text-[var(--wn-12)]'
                        : 'border-[var(--wn-4)] text-[var(--wn-10)] hover:bg-[var(--wn-3)]'
                    }`}
                  >
                    <span>{t.purchase.planNames[plan.id] ?? plan.name}</span>
                    <span className="shrink-0 tabular-nums">{formatPrice(plan.amount)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {phase === 'intro' && (
          <div className="mt-5">
            <button type="button" onClick={beginCheckout} className="wc-btn wc-btn-primary w-full">
              {user ? t.purchase.continueToPayment : t.purchase.signInAndContinue}
            </button>
            <p className="mt-2 text-center text-[0.7rem] text-[var(--wn-9)]">
              {t.purchase.bankTransferNote}
            </p>
          </div>
        )}

        {phase === 'loading' && (
          <p className="mt-5 text-center text-sm text-[var(--wn-9)]">{t.purchase.preparingQr}</p>
        )}

        {phase === 'error' && (
          <div className="mt-5 text-center">
            <p role="alert" className="text-sm text-[var(--danger)]">
              {error}
            </p>
            <button type="button" onClick={() => void startOrder()} className="wc-btn wc-btn-secondary mt-3">
              {common.tryAgain}
            </button>
          </div>
        )}

        {phase === 'awaiting' && order && (
          <div className="mt-4">
            <img
              src={order.qrUrl}
              alt={t.purchase.qrAlt(order.code)}
              width={208}
              height={208}
              className="mx-auto h-52 w-52 rounded-lg bg-white p-2"
            />
            <p className="mt-3 text-center text-xs text-[var(--wn-9)]">
              {t.purchase.scanHint}
            </p>
            <p className="mt-1 text-center text-sm text-[var(--wn-12)]">
              <span className="font-semibold">{order.bank.name}</span> · {order.bank.accountNumber}
            </p>

            <div className="mt-3 rounded-xl border border-[var(--wn-4)] bg-[var(--field-bg)] p-3">
              <p className="text-[0.7rem] uppercase tracking-wider text-[var(--wn-9)]">
                {t.purchase.transferMemo}
              </p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <code className="text-base font-bold tracking-wider text-[var(--wa-11)]">{order.code}</code>
                <button
                  type="button"
                  onClick={() => void copy(order.code, 'code')}
                  className="wc-btn wc-btn-secondary wc-btn-sm"
                >
                  {copied === 'code' ? common.copied : common.copy}
                </button>
              </div>
              <p className="mt-2 text-[0.7rem] text-[var(--wn-9)]">
                {t.purchase.licenceAuto}
              </p>
            </div>

            <p className="mt-3 text-center text-xs text-[var(--wn-9)]">{t.purchase.waiting}</p>
          </div>
        )}

        {phase === 'paid' && (
          <div className="mt-4 text-center">
            <p className="text-3xl" role="img" aria-hidden="true">
              🎉
            </p>
            <p className="mt-1 text-sm text-[var(--wa-11)]">
              {t.purchase.paymentReceived}
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
                {copied === 'key' ? common.copied : t.purchase.copyKey}
              </button>
              <button
                type="button"
                onClick={() => onLicensed(licenseKey)}
                className="wc-btn wc-btn-primary flex-1"
              >
                {t.purchase.unlockDevice}
              </button>
            </div>
            <p className="mt-2 text-[0.7rem] text-[var(--wn-9)]">
              {t.purchase.keepKey}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
