/**
 * Client for the WordCrew API worker. The static site and `/api/*` share one origin,
 * so no base URL configuration is needed.
 *
 * Every call here is allowed to fail: the game must keep working offline and simply
 * degrade to "buying is unavailable right now".
 */

export interface Product {
  id: string;
  name: string;
  blurb: string;
  amount: number;
}

export interface BankDetails {
  name: string;
  accountNumber: string;
}

export interface Pricing {
  currency: string;
  products: Product[];
  bank: BankDetails;
}

export interface OrderDraft {
  code: string;
  amount: number;
  productName: string;
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
 * What the dialogs report back to the app after the player submits a code. `message`
 * carries the human-readable reason when `ok` is false.
 */
export type UnlockOutcome = { ok: boolean; message?: string };

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && typeof (payload as { error?: unknown }).error === 'string'
        ? (payload as { error: string }).error
        : 'Something went wrong. Please try again.';
    throw new Error(message);
  }
  return payload as T;
};

export const fetchPricing = (): Promise<Pricing> => request<Pricing>('/pricing');

/**
 * Mints an order. The worker requires a Firebase ID token here — checkout is gated
 * behind sign-in so every paid order carries a real customer record.
 */
export const createOrder = (productId: string, idToken?: string | null): Promise<OrderDraft> =>
  request<OrderDraft>('/orders', {
    method: 'POST',
    body: JSON.stringify({ productId }),
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

/** One product the signed-in account has paid for. */
export interface EntitlementItem {
  productId: string;
  /** Human label for the purchase, e.g. "WordCrew Full Version". */
  name: string;
  licenseKey: string;
  paidAt: number | null;
}

/** Everything the signed-in account owns, resolved from the verified ID token. */
export interface Entitlement {
  entitled: boolean;
  entitlements: EntitlementItem[];
}

const NO_ENTITLEMENT: Entitlement = { entitled: false, entitlements: [] };

/**
 * Asks the worker what the signed-in account owns, so purchases follow the customer
 * across devices. Any failure (offline, expired session) resolves to "not entitled"
 * rather than throwing — the game must never hard-block on this check.
 */
export const fetchEntitlement = async (idToken: string | null): Promise<Entitlement> => {
  if (!idToken) return NO_ENTITLEMENT;
  try {
    const response = await fetch('/api/entitlements', {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!response.ok) return NO_ENTITLEMENT;
    const payload = (await response.json()) as { entitled?: unknown; entitlements?: unknown };
    if (payload.entitled !== true || !Array.isArray(payload.entitlements)) return NO_ENTITLEMENT;
    const entitlements = payload.entitlements
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map((item) => ({
        productId: String(item.productId ?? ''),
        name: typeof item.name === 'string' ? item.name : String(item.productId ?? ''),
        licenseKey: String(item.licenseKey ?? ''),
        paidAt: typeof item.paidAt === 'number' ? item.paidAt : null,
      }))
      .filter((item) => item.productId && item.licenseKey);
    return entitlements.length > 0
      ? { entitled: true, entitlements }
      : NO_ENTITLEMENT;
  } catch {
    return NO_ENTITLEMENT;
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
    if (response.ok && record.valid === true) return { ok: true };
    return {
      ok: false,
      message:
        typeof record.error === 'string'
          ? record.error
          : 'Licence key not found. Check the key from your purchase email.',
    };
  } catch {
    return { ok: false, message: 'Could not reach the licence server. Check your connection.' };
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

/** Issues a licence to an email without a payment. Throws with the worker's reason. */
export const grantAccess = (
  idToken: string,
  email: string,
  productId = 'pro',
): Promise<{ code: string; email: string; licenseKey: string }> =>
  request('/admin/grant', {
    method: 'POST',
    body: JSON.stringify({ email, productId }),
    headers: { Authorization: `Bearer ${idToken}` },
  });

/** Revokes a licence so it stops unlocking — typed keys and auto-restore both stop. */
export const revokeAccess = (idToken: string, licenseKey: string): Promise<{ ok: boolean }> =>
  request('/admin/revoke', {
    method: 'POST',
    body: JSON.stringify({ licenseKey }),
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
