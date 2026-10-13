/**
 * WordCrew API worker.
 *
 * The game itself is a static PWA, so this worker only owns the paid path:
 * quoting a price, minting an order + VietQR, receiving Sepay's bank webhook and
 * handing back a licence key the client can verify. Orders and licences live in D1.
 */

import {
  buildQrUrl,
  extractOrderCode,
  generateLicenseKey,
  generateOrderCode,
  normalizeLicenseKey,
  safeEqual,
} from './sepay';
import { extractBearerToken, verifyFirebaseIdToken, type FirebaseUser } from './firebase';

export interface Env {
  /** Static build output — every non-/api route is served straight from here. */
  ASSETS: Fetcher;
  DB: D1Database;
  /** Shared secret configured on the Sepay webhook; blank disables the check (local dev only). */
  SEPAY_WEBHOOK_API_KEY?: string;
  /** Bank short code understood by qr.sepay.vn (e.g. MBBank, Vietcombank, TPBank). */
  SEPAY_BANK_NAME?: string;
  SEPAY_BANK_ACCOUNT?: string;
  /** Price in VND. Kept in config so pricing can change without rebuilding the app. */
  PRICE_VND?: string;
  /** Public site URL, used to sanity-check the webhook origin when present. */
  PUBLIC_ORIGIN?: string;
  /**
   * Firebase project id used to validate ID tokens (`aud`/`iss`) on the paid path.
   * Blank disables the check — local dev only, production must set it.
   */
  FIREBASE_PROJECT_ID?: string;
}

const DEFAULT_PRICE_VND = 199000;
const ORDER_TTL_MS = 30 * 60 * 1000;
const ORDERS_PER_IP_PER_HOUR = 5;
const PRODUCT = {
  id: 'pro',
  name: 'WordCrew Full Version',
  blurb: 'Hell Mode, all 5 extra word packs, 60 words / 10 minutes and custom sounds.',
} as const;

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

const readJson = async (request: Request): Promise<Record<string, unknown>> => {
  try {
    const parsed = await request.json();
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};

const priceVnd = (env: Env): number => {
  const parsed = Number(env.PRICE_VND);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : DEFAULT_PRICE_VND;
};

const transferDescription = (orderCode: string): string => `WordCrew ${orderCode}`;

const getPricing = (env: Env): Response =>
  json({
    currency: 'VND',
    products: [{ ...PRODUCT, amount: priceVnd(env) }],
    bank: {
      name: String(env.SEPAY_BANK_NAME || '').trim(),
      accountNumber: String(env.SEPAY_BANK_ACCOUNT || '').trim(),
    },
  });

/**
 * Mints a pending order and the VietQR the buyer scans. The order code is quoted in
 * the transfer memo, which is how the webhook later recognises the payment.
 */
const createOrder = async (request: Request, env: Env): Promise<Response> => {
  const body = await readJson(request);
  const requestedId = String(body.productId || PRODUCT.id);
  if (requestedId !== PRODUCT.id) return json({ error: 'Unknown product' }, 400);

  // Checkout is gated behind sign-in: the order is bound to a *verified* Firebase
  // account so the customer record (email/uid) survives for later campaigns. The game
  // itself needs no account — only the paid path does.
  let buyer: FirebaseUser | null = null;
  const projectId = String(env.FIREBASE_PROJECT_ID || '').trim();
  if (projectId) {
    const token = extractBearerToken(request);
    if (!token) return json({ error: 'Please sign in before checking out.' }, 401);
    buyer = await verifyFirebaseIdToken(token, projectId);
    if (!buyer) return json({ error: 'Your session has expired. Please sign in again.' }, 401);
  }

  const bankName = String(env.SEPAY_BANK_NAME || '').trim();
  const accountNumber = String(env.SEPAY_BANK_ACCOUNT || '').trim();
  if (!bankName || !accountNumber) {
    return json({ error: 'Payments are not configured yet' }, 503);
  }

  const clientIp = request.headers.get('CF-Connecting-IP') || '';
  if (clientIp) {
    const since = Date.now() - 60 * 60 * 1000;
    const recent = await env.DB.prepare(
      'SELECT COUNT(*) AS total FROM orders WHERE client_ip = ? AND created_at > ?',
    )
      .bind(clientIp, since)
      .first<{ total: number }>();
    if ((recent?.total ?? 0) >= ORDERS_PER_IP_PER_HOUR) {
      return json({ error: 'Too many orders from this device. Please try again later.' }, 429);
    }
  }

  const amount = priceVnd(env);
  const now = Date.now();
  const code = generateOrderCode();
  const expiresAt = now + ORDER_TTL_MS;

  await env.DB.prepare(
    `INSERT INTO orders (code, product_id, amount, status, created_at, expires_at, client_ip, user_id, user_email)
     VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
  )
    .bind(
      code,
      PRODUCT.id,
      amount,
      now,
      expiresAt,
      clientIp,
      buyer?.uid ?? null,
      buyer?.email ?? null,
    )
    .run();

  return json({
    code,
    amount,
    productName: PRODUCT.name,
    bank: { name: bankName, accountNumber },
    transferDescription: transferDescription(code),
    qrUrl: buildQrUrl({
      accountNumber,
      bankName,
      amount,
      description: transferDescription(code),
    }),
    expiresAt,
  });
};

/** Polled by the buy dialog; the licence key is only exposed once the order is paid. */
const getOrder = async (code: string, env: Env): Promise<Response> => {
  const row = await env.DB.prepare(
    'SELECT code, amount, status, license_key, expires_at FROM orders WHERE code = ?',
  )
    .bind(code)
    .first<{
      code: string;
      amount: number;
      status: string;
      license_key: string | null;
      expires_at: number;
    }>();

  if (!row) return json({ error: 'Order not found' }, 404);

  let status = row.status;
  if (status === 'pending' && Date.now() > row.expires_at) {
    status = 'expired';
    await env.DB.prepare("UPDATE orders SET status = 'expired' WHERE code = ? AND status = 'pending'")
      .bind(code)
      .run();
  }

  return json({
    code: row.code,
    amount: row.amount,
    status,
    licenseKey: status === 'paid' ? row.license_key : null,
  });
};

const extractApiKey = (request: Request): string => {
  const authorization = request.headers.get('Authorization') || '';
  const fromHeader = authorization.match(/^(?:apikey|bearer|api-key)\s+(.+)$/i);
  if (fromHeader?.[1]) return fromHeader[1].trim();
  return (request.headers.get('x-api-key') || '').trim();
};

/**
 * Sepay's "money in" bank webhook. Matches the transfer memo back to an order,
 * then fulfils it exactly once: a second delivery finds the order already paid.
 */
const handleSepayWebhook = async (request: Request, env: Env): Promise<Response> => {
  const expectedKey = String(env.SEPAY_WEBHOOK_API_KEY || '').trim();
  if (expectedKey) {
    const provided = extractApiKey(request);
    if (!provided || !safeEqual(provided, expectedKey)) {
      return json({ error: 'Unauthorized' }, 401);
    }
  }

  const root = await readJson(request);
  const payload =
    root.data && typeof root.data === 'object'
      ? (root.data as Record<string, unknown>)
      : root;

  const transferType = String(
    payload.transferType ?? payload.transfer_type ?? payload.transfer_type_text ?? '',
  ).toLowerCase();
  if (transferType && transferType !== 'in') {
    return json({ success: true, ignored: 'not_incoming' });
  }

  const amount = Number(
    payload.transferAmount ?? payload.transfer_amount ?? payload.amount_in ?? payload.amountIn,
  );
  const code = extractOrderCode(
    payload.code as string,
    payload.payment_code as string,
    payload.content as string,
    payload.transaction_content as string,
    payload.description as string,
    payload.remark as string,
  );
  if (!code) return json({ success: true, ignored: 'no_order_code' });

  const order = await env.DB.prepare(
    'SELECT code, amount, product_id, status FROM orders WHERE code = ?',
  )
    .bind(code)
    .first<{ code: string; amount: number; product_id: string; status: string }>();

  // Unrelated transfers (and codes from other products) are acknowledged so Sepay
  // stops retrying, but never fulfilled.
  if (!order) return json({ success: true, ignored: 'unknown_order' });
  if (order.status === 'paid') return json({ success: true, message: 'Already processed' });
  if (!Number.isFinite(amount) || amount < order.amount) {
    return json({ success: true, ignored: 'amount_too_low', expected: order.amount });
  }

  const licenseKey = generateLicenseKey();
  const sepayTxId = payload.id == null ? null : String(payload.id);
  const now = Date.now();

  // The `status = 'pending'` guard makes fulfilment idempotent: whichever delivery
  // wins the UPDATE owns the licence key, everyone else reports it as done.
  const updated = await env.DB.prepare(
    `UPDATE orders
        SET status = 'paid', license_key = ?, sepay_tx_id = ?, paid_at = ?, webhook_received = 1
      WHERE code = ? AND status = 'pending'`,
  )
    .bind(licenseKey, sepayTxId, now, code)
    .run();

  if (!updated.meta.changes) return json({ success: true, message: 'Already processed' });

  await env.DB.prepare(
    'INSERT OR IGNORE INTO licenses (key, product_id, order_code, created_at) VALUES (?, ?, ?, ?)',
  )
    .bind(licenseKey, order.product_id, code, now)
    .run();

  return json({ success: true, message: 'Webhook processed' });
};

/** Called by the app when a licence key is typed in. */
const verifyLicense = async (request: Request, env: Env): Promise<Response> => {
  const body = await readJson(request);
  const key = normalizeLicenseKey(String(body.key || ''));
  if (!key) return json({ valid: false, error: 'That does not look like a licence key.' }, 400);

  const row = await env.DB.prepare(
    'SELECT key, product_id FROM licenses WHERE key = ? AND revoked = 0',
  )
    .bind(key)
    .first<{ key: string; product_id: string }>();

  if (!row) return json({ valid: false, error: 'Licence key not found.' }, 404);
  return json({ valid: true, productId: row.product_id });
};

const handleApi = async (request: Request, env: Env, url: URL): Promise<Response> => {
  const { pathname } = url;
  const method = request.method.toUpperCase();

  if (pathname === '/api/pricing' && method === 'GET') return getPricing(env);
  if (pathname === '/api/orders' && method === 'POST') return createOrder(request, env);
  if (pathname === '/api/licenses/verify' && method === 'POST') return verifyLicense(request, env);
  if (pathname === '/api/sepay/webhook' && method === 'POST') return handleSepayWebhook(request, env);

  const orderMatch = pathname.match(/^\/api\/orders\/([A-Za-z0-9]+)$/);
  if (orderMatch && method === 'GET') return getOrder(orderMatch[1].toUpperCase(), env);

  return json({ error: 'Not found' }, 404);
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    // Only /api/* is routed here (see `run_worker_first` in wrangler.jsonc); every
    // other request is served directly from static assets.
    if (url.pathname.startsWith('/api/')) return handleApi(request, env, url);
    return env.ASSETS.fetch(request);
  },
};
