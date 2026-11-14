/**
 * Client for the WordCrew API worker. The static site and `/api/*` share one origin,
 * so no base URL configuration is needed.
 *
 * Every call here is allowed to fail: the game must keep working offline and simply
 * degrade to "buying is unavailable right now".
 */

import { AppError } from './apiError';

export interface Product {
  id: string;
  name: string;
  blurb: string;
  amount: number;
}

/**
 * One row of the price list. `days` is the length of the term and `null` means the plan
 * never expires; `seats` is how many teachers a school plan covers.
 */
export interface PricingPlan {
  id: string;
  name: string;
  days: number | null;
  seats: number;
  amount: number;
}

export interface BankDetails {
  name: string;
  accountNumber: string;
}

export interface Pricing {
  currency: string;
  products: Product[];
  /** The full table; `products` is the legacy single-offer shape. */
  plans: PricingPlan[];
  bank: BankDetails;
}

export interface OrderDraft {
  code: string;
  amount: number;
  productName: string;
  plan: string;
  bank: BankDetails;
  transferDescription: string;
  qrUrl: string;
  expiresAt: number;
}

export type OrderStatus = 'pending' | 'paid' | 'expired';

export interface OrderState {
  code: string;
  amount: number;
  status: OrderStatus;
  licenseKey: string | null;
}

/**
 * What the dialogs report back to the app after the player submits a code. When `ok` is
 * false, `code` names the reason and the dialog translates it — the server's English
 * sentence never reaches a Vietnamese reader.
 *
 * `accessUntil` is the end of the licence's paid window; `null` means it never expires.
 */
export type UnlockOutcome = { ok: boolean; code?: string; accessUntil?: number | null };

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
    const message = typeof record.error === 'string' ? record.error : 'Something went wrong. Please try again.';
    throw new AppError(typeof record.code === 'string' ? record.code : 'generic', message);
  }
  return payload as T;
};

export const fetchPricing = (): Promise<Pricing> => request<Pricing>('/pricing');

/**
 * Mints an order. The worker requires a Firebase ID token here — checkout is gated
 * behind sign-in so every paid order carries a real customer record.
 *
 * `plan` picks the billing term ('month', 'year', 'lifetime', a school plan). The price
 * is always recomputed on the worker, so the amount sent by a browser can never decide
 * what is charged.
 */
export const createOrder = (
  productId: string,
  idToken?: string | null,
  plan = 'pro',
): Promise<OrderDraft> =>
  request<OrderDraft>('/orders', {
    method: 'POST',
    body: JSON.stringify({ productId, plan }),
    ...(idToken ? { headers: { Authorization: `Bearer ${idToken}` } } : {}),
  });

/**
 * Polls an order. The worker only releases the licence to the account that owns it, so
 * the same ID token used at checkout has to come along — the order code alone is not
 * enough to read a key back.
 */
export const fetchOrder = (code: string, idToken?: string | null): Promise<OrderState> =>
  request<OrderState>(`/orders/${encodeURIComponent(code)}`, {
    ...(idToken ? { headers: { Authorization: `Bearer ${idToken}` } } : {}),
  });

/** One order the signed-in account placed, as the Account tab lists it. */
export interface MyOrder {
  code: string;
  productId: string;
  productName: string;
  amount: number;
  status: OrderStatus;
  licenseKey: string | null;
  createdAt: number;
  expiresAt: number;
  paidAt: number | null;
}

/**
 * The signed-in account's own orders, newest first, so a buyer who closed the QR can
 * find the transfer code again and check whether it has been matched. Fails soft (empty
 * list) like the entitlement lookup — the Account tab must render while offline.
 */
export const fetchMyOrders = async (idToken: string | null): Promise<MyOrder[]> => {
  if (!idToken) return [];
  try {
    const response = await fetch('/api/orders', {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as { orders?: unknown };
    if (!Array.isArray(payload.orders)) return [];
    return payload.orders
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map((item) => ({
        code: String(item.code ?? ''),
        productId: String(item.productId ?? ''),
        productName:
          typeof item.productName === 'string' ? item.productName : String(item.productId ?? ''),
        amount: typeof item.amount === 'number' ? item.amount : 0,
        status: (
          item.status === 'paid' ? 'paid' : item.status === 'expired' ? 'expired' : 'pending'
        ) as OrderStatus,
        licenseKey: typeof item.licenseKey === 'string' ? item.licenseKey : null,
        createdAt: typeof item.createdAt === 'number' ? item.createdAt : 0,
        expiresAt: typeof item.expiresAt === 'number' ? item.expiresAt : 0,
        paidAt: typeof item.paidAt === 'number' ? item.paidAt : null,
      }))
      .filter((item) => item.code);
  } catch {
    return [];
  }
};

/** One account that owns a paid product, as the admin's account tab needs it. */
export interface AdminAccountAccess {
  uid: string | null;
  email: string | null;
  productId: string;
  productName: string;
  /** The newest licence behind this row — what the admin's revoke button takes back. */
  licenseKey: string | null;
  /** End of the paid window; `null` means the licence never expires. */
  accessUntil: number | null;
  paidAt: number | null;
}

/**
 * Who owns a paid product, straight from D1. The account directory (names, presence)
 * is read from Firestore in the dashboard and joined with this on uid/email.
 *
 * `null` means the question could not be answered (signed out, API down, caller not an
 * admin) — an empty list would otherwise be read as "nobody owns anything".
 */
export const fetchAdminAccountAccess = async (
  idToken: string | null,
): Promise<AdminAccountAccess[] | null> => {
  if (!idToken) return null;
  try {
    const payload = await request<{ accounts?: unknown }>('/admin/accounts', {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!Array.isArray(payload.accounts)) return null;
    return payload.accounts
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map((item) => ({
        uid: typeof item.uid === 'string' ? item.uid : null,
        email: typeof item.email === 'string' ? item.email.toLowerCase() : null,
        productId: String(item.productId ?? ''),
        productName: typeof item.productName === 'string' ? item.productName : '',
        licenseKey: typeof item.licenseKey === 'string' ? item.licenseKey : null,
        accessUntil: typeof item.accessUntil === 'number' ? item.accessUntil : null,
        paidAt: typeof item.paidAt === 'number' ? item.paidAt : null,
      }))
      .filter((item) => item.uid || item.email);
  } catch {
    return null;
  }
};

/** One product the signed-in account has paid for. */
export interface EntitlementItem {
  productId: string;
  /** Human label for the purchase, e.g. "WordCrew Full Version". */
  name: string;
  /** Billing term: 'pro' (legacy one-off), 'month', 'year', 'lifetime', 'school10'… */
  plan: string;
  licenseKey: string;
  paidAt: number | null;
  /** End of the paid window; `null` means lifetime. */
  accessUntil: number | null;
  /** Whether the window is still open right now, as judged by the worker's clock. */
  active: boolean;
}

/**
 * The furthest end among live entitlements, for the device unlock flag.
 *
 * `null` = a lifetime licence (the flag never expires), `undefined` = nothing is live
 * right now (an expired subscription must not unlock anything).
 */
export const activeAccessUntil = (
  entitlements: EntitlementItem[],
): number | null | undefined => {
  const live = entitlements.filter((item) => item.active);
  if (live.length === 0) return undefined;
  if (live.some((item) => item.accessUntil === null)) return null;
  return Math.max(...live.map((item) => item.accessUntil ?? 0));
};

/** Everything the signed-in account owns, resolved from the verified ID token. */
export interface Entitlement {
  /** True when at least one purchase is still inside its paid window. */
  entitled: boolean;
  /** Every purchase on record, lapsed ones included. */
  entitlements: EntitlementItem[];
}

const NO_ENTITLEMENT: Entitlement = { entitled: false, entitlements: [] };

/**
 * Asks the worker what the signed-in account owns, so purchases follow the customer
 * across devices.
 *
 * Returns `null` — not "owns nothing" — when the question could not be answered
 * (offline, expired session, API down). The caller must treat that as "no news": an
 * account is only downgraded on an answer, never on a failed lookup, or a paying
 * customer would lose the full version the moment the wifi drops.
 */
export const fetchEntitlement = async (idToken: string | null): Promise<Entitlement | null> => {
  if (!idToken) return null;
  try {
    const response = await fetch('/api/entitlements', {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { entitled?: unknown; entitlements?: unknown };
    // Lapsed purchases are still listed: the Account tab shows them as expired, which is
    // where a renewal starts. Only a missing list means the answer was unusable.
    if (!Array.isArray(payload.entitlements)) return null;
    const entitlements = payload.entitlements
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map((item) => ({
        productId: String(item.productId ?? ''),
        name: typeof item.name === 'string' ? item.name : String(item.productId ?? ''),
        plan: typeof item.plan === 'string' ? item.plan : 'pro',
        licenseKey: String(item.licenseKey ?? ''),
        paidAt: typeof item.paidAt === 'number' ? item.paidAt : null,
        accessUntil: typeof item.accessUntil === 'number' ? item.accessUntil : null,
        // The worker always sends `active`; the fallback only matters against a stale
        // deployment, where "no end date" is the old lifetime licence.
        active: typeof item.active === 'boolean' ? item.active : item.accessUntil == null,
      }))
      .filter((item) => item.productId && item.licenseKey);
    return entitlements.length > 0
      ? { entitled: entitlements.some((item) => item.active), entitlements }
      : NO_ENTITLEMENT;
  } catch {
    return null;
  }
};

/**
 * Validates the teacher access code against the worker. The code is a server secret, so
 * it never appears in the bundle. Fails closed (false) when the network is unavailable.
 */
export const verifyAccessCode = async (code: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/access-code/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (!response.ok) return false;
    const payload = (await response.json()) as { valid?: unknown };
    return payload.valid === true;
  } catch {
    return false;
  }
};

export const verifyLicenseKey = async (key: string): Promise<UnlockOutcome> => {
  try {
    const response = await fetch('/api/licenses/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    const payload: unknown = await response.json().catch(() => null);
    const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
    if (response.ok && record.valid === true) {
      return {
        ok: true,
        accessUntil: typeof record.accessUntil === 'number' ? record.accessUntil : null,
      };
    }
    return {
      ok: false,
      code: typeof record.code === 'string' ? record.code : 'licenceNotFound',
    };
  } catch {
    return { ok: false, code: 'networkError' };
  }
};

/** One order as the admin overview reports it. */
export interface AdminOrder {
  code: string;
  productId: string;
  productName: string;
  amount: number;
  status: string;
  licenseKey: string | null;
  email: string | null;
  createdAt: number;
  paidAt: number | null;
}

export interface AdminOverview {
  stats: { revenue: number; paidCount: number; grantedCount: number; pendingCount: number };
  orders: AdminOrder[];
}

/**
 * Loads the owner-only overview. Non-admins (and signed-out visitors) get the same
 * "not found" the worker answers for unknown routes, which resolves to null here so the
 * portal can simply hide the section.
 */
export const fetchAdminOverview = async (idToken: string | null): Promise<AdminOverview | null> => {
  if (!idToken) return null;
  try {
    const payload = await request<{ stats?: unknown; orders?: unknown }>('/admin/overview', {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.orders)) return null;
    const stats = (payload.stats ?? {}) as Record<string, unknown>;
    return {
      stats: {
        revenue: typeof stats.revenue === 'number' ? stats.revenue : 0,
        paidCount: typeof stats.paidCount === 'number' ? stats.paidCount : 0,
        grantedCount: typeof stats.grantedCount === 'number' ? stats.grantedCount : 0,
        pendingCount: typeof stats.pendingCount === 'number' ? stats.pendingCount : 0,
      },
      orders: payload.orders as AdminOrder[],
    };
  } catch {
    return null;
  }
};

/**
 * Issues a licence to an email without a payment. Throws with the worker's reason.
 *
 * `days` must be one of `GRANT_TERMS`; `null` keeps the legacy lifetime grant.
 */
export const grantAccess = (
  idToken: string,
  email: string,
  days: number | null = null,
  productId = 'pro',
): Promise<{ code: string; email: string; licenseKey: string; accessUntil: number | null }> =>
  request('/admin/grant', {
    method: 'POST',
    body: JSON.stringify({ email, productId, days }),
    headers: { Authorization: `Bearer ${idToken}` },
  });

/** Revokes a licence so it stops unlocking — typed keys and auto-restore both stop. */
export const revokeAccess = (idToken: string, licenseKey: string): Promise<{ ok: boolean }> =>
  request('/admin/revoke', {
    method: 'POST',
    body: JSON.stringify({ licenseKey }),
    headers: { Authorization: `Bearer ${idToken}` },
  });

/**
 * Marks a verified bank transfer as paid by hand, issuing its licence — the safety net for
 * a transfer Sepay's webhook never delivered. Only an admin can call this.
 */
export const reconcileOrder = (
  idToken: string,
  code: string,
): Promise<{ ok: boolean; code: string; status: string; licenseKey: string | null; alreadyPaid?: boolean }> =>
  request('/admin/reconcile', {
    method: 'POST',
    body: JSON.stringify({ code }),
    headers: { Authorization: `Bearer ${idToken}` },
  });

export const formatPrice = (amount: number, currency = 'VND'): string => {
  try {
    return new Intl.NumberFormat(currency === 'VND' ? 'vi-VN' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString('vi-VN')} ${currency}`;
  }
};
