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

export const createOrder = (productId: string): Promise<OrderDraft> =>
  request<OrderDraft>('/orders', { method: 'POST', body: JSON.stringify({ productId }) });

export const fetchOrder = (code: string): Promise<OrderState> =>
  request<OrderState>(`/orders/${encodeURIComponent(code)}`);

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
