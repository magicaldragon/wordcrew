/**
 * Shared admin controls for handing PRO out and taking it back.
 *
 * The accounts list and the Admin tab both render these, so a grant always asks for the
 * same term (10 days / 1 month / 3 months / 1 year, lifetime, or a typed number of days)
 * and a revoke always follows the licence key of the row it was pressed on.
 */

import React, { useState } from 'react';
import { GRANT_MAX_DAYS, GRANT_TERMS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { describeError } from '../i18n/errors';
import { useT } from '../i18n/useT';
import { grantAccess, revokeAccess } from '../services/payments';
import { confirmDialog, toast } from './Feedback';

const FIELD_CLASS =
  'w-full rounded-[var(--r-md)] border border-[var(--wn-4)] bg-[var(--field-bg)] px-3 py-2 text-sm text-[var(--wn-12)] outline-none transition placeholder:text-[var(--wn-8)] focus:border-[var(--wa-5)] focus:ring-2 focus:ring-[var(--wa-4)]';

/** Copies an address to the clipboard; the text is the feedback, so no toast is needed. */
export const CopyEmailButton: React.FC<{ email: string; className?: string }> = ({
  email,
  className,
}) => {
  const common = useT('common');
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* Clipboard blocked — the address stays on screen so it can be copied by hand. */
    }
  };

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className={`wc-btn wc-btn-secondary wc-btn-sm shrink-0 ${className ?? ''}`}
      aria-label={`${common.copy} ${email}`}
    >
      {copied ? common.copied : common.copy}
    </button>
  );
};

/**
 * Term picker for a hand-made grant. Presets and lifetime commit on click; the typed
 * number needs its own confirm button, because a half-typed "1" must not be sent.
 */
export const GrantProDialog: React.FC<{
  /** Display name in the accounts list, email in the Admin tab. */
  account: string;
  busy?: boolean;
  onCancel: () => void;
  onGrant: (days: number | null) => void;
}> = ({ account, busy, onCancel, onGrant }) => {
  const t = useT('admin');
  const common = useT('common');
  const [custom, setCustom] = useState('');
  const parsed = Number(custom.trim());
  const customValid =
    custom.trim() !== '' && Number.isInteger(parsed) && parsed >= 1 && parsed <= GRANT_MAX_DAYS;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.directory.grantPro}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className="wc-card w-full max-w-sm p-5">
        <p className="text-sm font-semibold text-[var(--wn-12)]">{t.directory.grantPro}</p>
        <p className="mt-1 text-xs text-[var(--wn-9)]">{t.directory.grantProAsk(account)}</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {GRANT_TERMS.map((term) => (
            <button
              key={term.days}
              type="button"
              onClick={() => onGrant(term.days)}
              disabled={busy}
              className="wc-btn wc-btn-secondary"
            >
              {common.terms[term.key]}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onGrant(null)}
          disabled={busy}
          className="wc-btn wc-btn-secondary mt-2 w-full"
        >
          {t.directory.grantProLifetime}
        </button>

        <p className="mt-4 text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--wn-9)]">
          {t.directory.grantProCustom}
        </p>
        <div className="mt-2 flex items-start gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={GRANT_MAX_DAYS}
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            placeholder={t.directory.grantProCustomPlaceholder}
            aria-label={t.directory.grantProCustomAria}
            className={FIELD_CLASS}
          />
          <button
            type="button"
            onClick={() => onGrant(parsed)}
            disabled={busy || !customValid}
            className="wc-btn wc-btn-primary shrink-0 disabled:opacity-60"
          >
            {busy ? common.saving : t.directory.grantProApply}
          </button>
        </div>
        {custom.trim() !== '' && !customValid && (
          <p className="mt-1 text-[0.7rem] text-danger-red">{t.directory.grantProInvalid}</p>
        )}

        <button
          type="button"
          onClick={onCancel}
          className="mt-3 w-full text-xs font-semibold text-[var(--wn-9)] transition-colors hover:text-[var(--wn-11)]"
        >
          {common.cancel}
        </button>
      </div>
    </div>
  );
};

/**
 * One button per row: "Cấp PRO" opens the term picker, "Thu PRO" revokes the licence the
 * row is showing. The worker call is the same one the Admin tab uses.
 */
export const ProGrantButton: React.FC<{
  /** Who the licence belongs to: display name in the accounts list, email in the Admin tab. */
  label: string;
  /** Null hides the button — there is nobody to grant to. */
  email: string | null;
  pro: boolean;
  /** Licence the revoke takes back; null while the row has no live licence behind it. */
  licenseKey: string | null;
  onChanged: () => void | Promise<void>;
  className?: string;
}> = ({ label, email, pro, licenseKey, onChanged, className }) => {
  const { getIdToken } = useAuth();
  const t = useT('admin');
  const common = useT('common');
  const errors = useT('errors');
  const [busy, setBusy] = useState(false);
  const [choosing, setChoosing] = useState(false);

  const grant = async (days: number | null) => {
    if (busy || !email) return;
    setChoosing(false);
    setBusy(true);
    try {
      const token = await getIdToken();
      if (!token) {
        toast(t.directory.proGrantFailed, 'error');
        return;
      }
      await grantAccess(token, email, days);
      toast(t.directory.proGranted(email), 'success');
      await onChanged();
    } catch (err) {
      toast(describeError(errors, err, t.directory.proGrantFailed), 'error');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    if (busy || !licenseKey) return;
    const confirmed = await confirmDialog(t.directory.revokeProAsk(label), {
      confirmLabel: t.directory.revokePro,
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      const token = await getIdToken();
      if (!token) {
        toast(t.directory.proRevokeFailed, 'error');
        return;
      }
      await revokeAccess(token, licenseKey);
      toast(t.directory.proRevoked(email || label), 'success');
      await onChanged();
    } catch (err) {
      toast(describeError(errors, err, t.directory.proRevokeFailed), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!email) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => (pro ? void revoke() : setChoosing(true))}
        disabled={busy || (pro && !licenseKey)}
        title={pro ? t.directory.revokeProTitle : t.directory.grantProTitle}
        className={`min-h-[44px] shrink-0 rounded-md border px-2 text-[0.7rem] font-semibold transition-colors disabled:opacity-60 ${
          pro
            ? 'border-[var(--wn-4)] text-[var(--wn-10)] hover:border-danger-red/60 hover:text-danger-red'
            : 'border-[var(--wa-5)] text-[var(--wa-11)] hover:border-[var(--wa-7)]'
        } ${className ?? ''}`}
      >
        {busy ? common.saving : pro ? t.directory.revokePro : t.directory.grantPro}
      </button>

      {choosing && (
        <GrantProDialog
          account={label}
          busy={busy}
          onCancel={() => setChoosing(false)}
          onGrant={(days) => void grant(days)}
        />
      )}
    </>
  );
};
