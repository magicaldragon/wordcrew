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
   * Teacher access code that unlocks the full game on a classroom machine without an
   * account. Kept as a Worker secret so the master code never ships in the JS bundle.
   */
  ACCESS_CODE?: string;
  /**
   * Firebase project id used to validate ID tokens (`aud`/`iss`) on the paid path.
   * Blank disables the check — local dev only, production must set it.
   */
  FIREBASE_PROJECT_ID?: string;
  /**
   * Comma-separated Firebase emails allowed into the admin endpoints (revenue overview,
   * granting and revoking access). Blank closes the admin surface entirely.
   */
  ADMIN_EMAILS?: string;
  /**
   * Workers AI. Used only by the speech fallback for devices without the Web Speech
   * API, so a Chrome/Edge/Safari session never touches it.
   */
  AI: Ai;
}

const DEFAULT_PRICE_VND = 199000;
const ORDER_TTL_MS = 30 * 60 * 1000;
const ORDERS_PER_IP_PER_HOUR = 5;
/** Speech fallback: `whisper-large-v3-turbo` at $0.00051 per audio minute. */
const ASR_MODEL = '@cf/openai/whisper-large-v3-turbo';
/**
 * Cap on an uploaded clip. The recorder sends mono Opus at 32 kbit/s and stops on
 * silence, so an honest answer is a few kB and even a full six-second clip is about
 * 24 kB; anything near this is a hand-crafted request rather than a player talking.
 */
const MAX_CLIP_BYTES = 128_000;
/**
 * Speech quota, so the account cannot be used as a free Whisper proxy. The route needs
 * no account (Solo has none), so the meter is per IP and per UTC day: a player talks
 * for a few seconds per word and never approaches these, while a script running the
 * fallback in a loop is stopped long before it can spend real money.
 */
const ASR_PER_IP_PER_MINUTE = 30;
const ASR_PER_IP_PER_DAY = 1_000;
/** Whole-app ceiling: roughly 130 audio minutes a day, about $2 a month if it is ever hit. */
const ASR_PER_DAY = 4_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const PRODUCT = {
  id: 'pro',
  name: 'WordCrew Full Version',
  blurb: 'Hell Mode, all 5 extra word packs, 60 words / 10 minutes and custom sounds.',
} as const;

/**
 * Display names for everything we sell, keyed by the `product_id` stored on orders.
 * The portal's Account tab lists a customer's purchases against these, so adding a game
 * later is one line here plus its own catalogue entry.
 */
const PRODUCT_LABELS: Record<string, string> = {
  [PRODUCT.id]: PRODUCT.name,
};
const productLabel = (id: string): string => PRODUCT_LABELS[id] || id;

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

/**
 * A failed request carries two fields: `error` for people reading logs or a raw API
 * response, and `code` for the portal. The portal translates the code into the reader's
 * language, so a Vietnamese checkout never shows an English sentence.
 */
const fail = (code: string, message: string, status: number): Response =>
  json({ error: message, code }, status);

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
  if (requestedId !== PRODUCT.id) return fail('unknownProduct', 'Unknown product', 400);

  // Checkout is gated behind sign-in: the order is bound to a *verified* Firebase
  // account so the customer record (email/uid) survives for later campaigns. The game
  // itself needs no account — only the paid path does.
  let buyer: FirebaseUser | null = null;
  const projectId = String(env.FIREBASE_PROJECT_ID || '').trim();
  if (projectId) {
    const token = extractBearerToken(request);
    if (!token) return fail('signInRequired', 'Please sign in before checking out.', 401);
    buyer = await verifyFirebaseIdToken(token, projectId);
    if (!buyer) return fail('sessionExpired', 'Your session has expired. Please sign in again.', 401);
  }

  const bankName = String(env.SEPAY_BANK_NAME || '').trim();
  const accountNumber = String(env.SEPAY_BANK_ACCOUNT || '').trim();
  if (!bankName || !accountNumber) {
    return fail('paymentsNotConfigured', 'Payments are not configured yet', 503);
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
      return fail('tooManyOrders', 'Too many orders from this device. Please try again later.', 429);
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

/**
 * Polled by the buy dialog; the licence key is only exposed once the order is paid.
 *
 * The order code is not a secret — it is printed in the QR memo and typed into banking
 * apps — so the licence is released only to the account that placed the order. Any
 * other caller (or an anonymous one) gets the same 404 an unknown code returns, which
 * stops codes from being probed for live licences.
 */
const getOrder = async (request: Request, code: string, env: Env): Promise<Response> => {
  let uid: string | null = null;
  const projectId = String(env.FIREBASE_PROJECT_ID || '').trim();
  if (projectId) {
    const token = extractBearerToken(request);
    if (!token) return fail('signInRequired', 'Please sign in.', 401);
    const user = await verifyFirebaseIdToken(token, projectId);
    if (!user) return fail('sessionExpired', 'Your session has expired. Please sign in again.', 401);
    uid = user.uid;
  }

  const row = await env.DB.prepare(
    'SELECT code, amount, status, license_key, expires_at, user_id FROM orders WHERE code = ?',
  )
    .bind(code)
    .first<{
      code: string;
      amount: number;
      status: string;
      license_key: string | null;
      expires_at: number;
      user_id: string | null;
    }>();

  if (!row) return fail('orderNotFound', 'Order not found', 404);
  if (uid && row.user_id !== uid) return fail('orderNotFound', 'Order not found', 404);

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

/**
 * The signed-in account's own orders, newest first.
 *
 * This is what lets a buyer recover a transfer code they closed the QR on, and see
 * whether a payment has been matched yet. Scoped to the verified ID token exactly like
 * the entitlement lookup, so one account can never read another's orders.
 */
const listOrders = async (request: Request, env: Env): Promise<Response> => {
  const token = extractBearerToken(request);
  if (!token) return fail('signInRequired', 'Please sign in.', 401);

  const projectId = String(env.FIREBASE_PROJECT_ID || '').trim();
  if (!projectId) return json({ orders: [] });

  const user = await verifyFirebaseIdToken(token, projectId);
  if (!user) return fail('sessionExpired', 'Your session has expired. Please sign in again.', 401);

  const email = user.emailVerified && user.email ? user.email.trim().toLowerCase() : '';
  const statement = email
    ? env.DB.prepare(
        `SELECT code, product_id, amount, status, license_key, created_at, expires_at, paid_at
           FROM orders
          WHERE user_id = ? OR LOWER(user_email) = ?
          ORDER BY created_at DESC
          LIMIT 20`,
      ).bind(user.uid, email)
    : env.DB.prepare(
        `SELECT code, product_id, amount, status, license_key, created_at, expires_at, paid_at
           FROM orders
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT 20`,
      ).bind(user.uid);

  const { results } = await statement.all<{
    code: string;
    product_id: string;
    amount: number;
    status: string;
    license_key: string | null;
    created_at: number;
    expires_at: number;
    paid_at: number | null;
  }>();

  const now = Date.now();
  return json({
    orders: (results ?? []).map((row) => {
      // The stored status only flips to `expired` when someone polls the order, so the
      // list derives it here for a truthful read without writing on every request.
      const status =
        row.status === 'pending' && now > row.expires_at ? 'expired' : row.status;
      return {
        code: row.code,
        productId: row.product_id,
        productName: productLabel(row.product_id),
        amount: row.amount,
        status,
        licenseKey: status === 'paid' ? row.license_key : null,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        paidAt: row.paid_at,
      };
    }),
  });
};

/**
 * What a signed-in account already owns. The Full Version belongs to the *account*,
 * not the browser, so a customer who switches device just signs in and gets it back.
 * The account is resolved from the verified ID token — never from anything the client
 * sends about itself.
 */
const getEntitlement = async (request: Request, env: Env): Promise<Response> => {
  const token = extractBearerToken(request);
  if (!token) return fail('signInRequired', 'Please sign in.', 401);

  const projectId = String(env.FIREBASE_PROJECT_ID || '').trim();
  if (!projectId) return json({ entitled: false });

  const user = await verifyFirebaseIdToken(token, projectId);
  if (!user) return fail('sessionExpired', 'Your session has expired. Please sign in again.', 401);

  // One entry per product the account owns; a repeat buyer keeps the newest licence.
  // Orders are matched on uid, or on a *verified* email so an admin can hand a licence
  // to someone before they ever sign in.
  const email = user.emailVerified && user.email ? user.email.trim().toLowerCase() : '';
  const statement = email
    ? env.DB.prepare(
        `SELECT product_id, license_key, paid_at
           FROM orders
          WHERE status = 'paid' AND license_key IS NOT NULL
            AND (user_id = ? OR LOWER(user_email) = ?)
          ORDER BY paid_at DESC`,
      ).bind(user.uid, email)
    : env.DB.prepare(
        `SELECT product_id, license_key, paid_at
           FROM orders
          WHERE user_id = ? AND status = 'paid' AND license_key IS NOT NULL
          ORDER BY paid_at DESC`,
      ).bind(user.uid);

  const { results } = await statement.all<{
    product_id: string;
    license_key: string;
    paid_at: number | null;
  }>();

  const seen = new Set<string>();
  const entitlements: { productId: string; name: string; licenseKey: string; paidAt: number | null }[] = [];
  for (const row of results ?? []) {
    if (seen.has(row.product_id)) continue;
    seen.add(row.product_id);
    entitlements.push({
      productId: row.product_id,
      name: productLabel(row.product_id),
      licenseKey: row.license_key,
      paidAt: row.paid_at,
    });
  }

  return json({ entitled: entitlements.length > 0, entitlements });
};

/**
 * Teacher access code check. The code used to live in the client bundle, where anyone
 * could read it; it is now compared here against a Worker secret instead.
 */
const verifyAccessCode = async (request: Request, env: Env): Promise<Response> => {
  const body = await readJson(request);
  const provided = String(body.code || '').trim().toLowerCase();
  const expected = String(env.ACCESS_CODE || '').trim().toLowerCase();
  if (!expected) return json({ valid: false });
  return json({ valid: Boolean(provided) && safeEqual(provided, expected) });
};

const extractApiKey = (request: Request): string => {
  const authorization = request.headers.get('Authorization') || '';
  const fromHeader = authorization.match(/^(?:apikey|bearer|api-key)\s+(.+)$/i);
  if (fromHeader?.[1]) return fromHeader[1].trim();
  return (request.headers.get('x-api-key') || '').trim();
};

/**
 * Owner-only surface. The allow-list is a secret, so a non-admin cannot even discover
 * these routes: they are answered with the same 404 an unknown path returns.
 */
const requireAdmin = async (request: Request, env: Env): Promise<FirebaseUser | Response> => {
  const allowList = String(env.ADMIN_EMAILS || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  if (allowList.length === 0) return fail('notFound', 'Not found', 404);

  const token = extractBearerToken(request);
  if (!token) return fail('signInRequired', 'Please sign in.', 401);

  const projectId = String(env.FIREBASE_PROJECT_ID || '').trim();
  if (!projectId) return fail('signInNotConfigured', 'Sign-in is not configured.', 503);

  const user = await verifyFirebaseIdToken(token, projectId);
  if (!user) return fail('sessionExpired', 'Your session has expired. Please sign in again.', 401);

  const email = String(user.email || '').trim().toLowerCase();
  if (!email || !allowList.includes(email)) return fail('notFound', 'Not found', 404);

  return user;
};

/** Revenue, order counts and the most recent orders for the admin overview. */
const getAdminOverview = async (request: Request, env: Env): Promise<Response> => {
  const denied = await requireAdmin(request, env);
  if (denied instanceof Response) return denied;

  const totals = await env.DB.prepare(
    `SELECT
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS revenue,
        COALESCE(SUM(CASE WHEN status = 'paid' AND amount > 0 THEN 1 ELSE 0 END), 0) AS paid_count,
        COALESCE(SUM(CASE WHEN status = 'paid' AND amount = 0 THEN 1 ELSE 0 END), 0) AS granted_count,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_count
       FROM orders`,
  ).first<{ revenue: number; paid_count: number; granted_count: number; pending_count: number }>();

  const { results } = await env.DB.prepare(
    `SELECT code, product_id, amount, status, license_key, user_email, created_at, paid_at
       FROM orders
      ORDER BY created_at DESC
      LIMIT 100`,
  ).all<{
    code: string;
    product_id: string;
    amount: number;
    status: string;
    license_key: string | null;
    user_email: string | null;
    created_at: number;
    paid_at: number | null;
  }>();

  return json({
    stats: {
      revenue: totals?.revenue ?? 0,
      paidCount: totals?.paid_count ?? 0,
      grantedCount: totals?.granted_count ?? 0,
      pendingCount: totals?.pending_count ?? 0,
    },
    orders: (results ?? []).map((row) => ({
      code: row.code,
      productId: row.product_id,
      productName: productLabel(row.product_id),
      amount: row.amount,
      status: row.status,
      licenseKey: row.license_key,
      email: row.user_email,
      createdAt: row.created_at,
      paidAt: row.paid_at,
    })),
  });
};

/**
 * Who owns a paid product, for the admin's account management tab. The directory of
 * accounts (names, presence) lives in Firestore; this route only answers the money
 * question from D1's paid orders, and the dashboard joins the two.
 */
const getAdminAccounts = async (request: Request, env: Env): Promise<Response> => {
  const denied = await requireAdmin(request, env);
  if (denied instanceof Response) return denied;

  const { results } = await env.DB.prepare(
    `SELECT user_id, LOWER(user_email) AS email, product_id,
            MAX(COALESCE(paid_at, created_at)) AS paid_at
       FROM orders
      WHERE status = 'paid' AND license_key IS NOT NULL
      GROUP BY user_id, LOWER(user_email), product_id
      ORDER BY paid_at DESC`,
  ).all<{
    user_id: string | null;
    email: string | null;
    product_id: string;
    paid_at: number | null;
  }>();

  return json({
    accounts: (results ?? []).map((row) => ({
      uid: row.user_id,
      email: row.email,
      productId: row.product_id,
      productName: productLabel(row.product_id),
      paidAt: row.paid_at,
    })),
  });
};

/**
 * Hands a product to an account without a bank transfer — the mechanism behind gift
 * licences and support fixes. The order is written already paid, so it flows through
 * the exact same entitlement lookup as a real purchase.
 */
const grantAccess = async (request: Request, env: Env): Promise<Response> => {
  const denied = await requireAdmin(request, env);
  if (denied instanceof Response) return denied;

  const body = await readJson(request);
  const email = String(body.email || '').trim().toLowerCase();
  const productId = String(body.productId || PRODUCT.id);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return fail('invalidEmail', 'Enter a valid email address.', 400);
  }
  if (productId !== PRODUCT.id) return fail('unknownProduct', 'Unknown product', 400);

  const existing = await env.DB.prepare(
    "SELECT code FROM orders WHERE LOWER(user_email) = ? AND product_id = ? AND status = 'paid' LIMIT 1",
  )
    .bind(email, productId)
    .first<{ code: string }>();
  if (existing) return fail('emailOwnsProduct', 'That email already owns this product.', 409);

  const now = Date.now();
  const code = generateOrderCode();
  const licenseKey = generateLicenseKey();

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO orders (code, product_id, amount, status, license_key, paid_at, created_at, expires_at, user_email, webhook_received)
       VALUES (?, ?, 0, 'paid', ?, ?, ?, ?, ?, 1)`,
    ).bind(code, productId, licenseKey, now, now, now, email),
    env.DB.prepare(
      'INSERT OR IGNORE INTO licenses (key, product_id, order_code, created_at) VALUES (?, ?, ?, ?)',
    ).bind(licenseKey, productId, code, now),
  ]);

  return json({ ok: true, code, email, productId, licenseKey });
};

/**
 * Takes a licence back: the licence row is flagged revoked (typed keys stop working)
 * and its order stops counting as paid (the account loses auto-unlock on sign-in).
 */
const revokeAccess = async (request: Request, env: Env): Promise<Response> => {
  const denied = await requireAdmin(request, env);
  if (denied instanceof Response) return denied;

  const body = await readJson(request);
  const key = normalizeLicenseKey(String(body.licenseKey || ''));
  if (!key) return fail('invalidLicenceKey', 'That does not look like a licence key.', 400);

  const [licenseResult, orderResult] = await env.DB.batch([
    env.DB.prepare('UPDATE licenses SET revoked = 1 WHERE key = ?').bind(key),
    env.DB.prepare("UPDATE orders SET status = 'revoked' WHERE license_key = ?").bind(key),
  ]);

  if (!(licenseResult?.meta.changes ?? 0) && !(orderResult?.meta.changes ?? 0)) {
    return fail('licenceNotFound', 'Licence key not found.', 404);
  }
  return json({ ok: true });
};

/**
 * The manual safety net for a transfer the Sepay webhook never delivered: the admin
 * checks the bank statement, then marks the order paid here and its licence is issued on
 * the spot. It writes exactly what the webhook would, so the buyer's next entitlement
 * lookup (and any device they sign in on) picks the purchase up normally.
 */
const reconcileOrder = async (request: Request, env: Env): Promise<Response> => {
  const denied = await requireAdmin(request, env);
  if (denied instanceof Response) return denied;

  const body = await readJson(request);
  const code = String(body.code || '').trim().toUpperCase();
  if (!/^WC[A-Z0-9]{7}$/.test(code)) return fail('unknownOrderCode', 'Unknown order code.', 400);

  const order = await env.DB.prepare(
    'SELECT code, product_id, status, license_key FROM orders WHERE code = ?',
  )
    .bind(code)
    .first<{ code: string; product_id: string; status: string; license_key: string | null }>();

  if (!order) return fail('orderNotFound', 'Order not found.', 404);
  // Idempotent: re-running on an already paid order hands the same key back, so the admin
  // cannot mint a second licence by clicking twice.
  if (order.status === 'paid') {
    return json({ ok: true, code, status: 'paid', licenseKey: order.license_key, alreadyPaid: true });
  }
  if (order.status === 'revoked') return fail('orderRevoked', 'That order was revoked.', 409);

  const licenseKey = generateLicenseKey();
  const now = Date.now();
  const updated = await env.DB.prepare(
    `UPDATE orders
        SET status = 'paid', license_key = ?, paid_at = ?, webhook_received = 1
      WHERE code = ? AND status IN ('pending', 'expired')`,
  )
    .bind(licenseKey, now, code)
    .run();
  if (!updated.meta.changes) return fail('orderUpdateFailed', 'Could not update that order.', 409);

  await env.DB.prepare(
    'INSERT OR IGNORE INTO licenses (key, product_id, order_code, created_at) VALUES (?, ?, ?, ?)',
  )
    .bind(licenseKey, order.product_id, code, now)
    .run();

  return json({ ok: true, code, status: 'paid', licenseKey });
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
      return fail('unauthorized', 'Unauthorized', 401);
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

  // Accepts `pending` as well as `expired`: the order TTL is only a UI hint, and a
  // transfer that lands after it must still be fulfilled — otherwise the money arrives
  // and the licence never does. `revoked` is deliberately left out, and the guard makes
  // fulfilment idempotent: whichever delivery wins the UPDATE owns the licence key,
  // everyone else reports it as done.
  const updated = await env.DB.prepare(
    `UPDATE orders
        SET status = 'paid', license_key = ?, sepay_tx_id = ?, paid_at = ?, webhook_received = 1
      WHERE code = ? AND status IN ('pending', 'expired')`,
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
  if (!key) return json({ valid: false, error: 'That does not look like a licence key.', code: 'invalidLicenceKey' }, 400);

  const row = await env.DB.prepare(
    'SELECT key, product_id FROM licenses WHERE key = ? AND revoked = 0',
  )
    .bind(key)
    .first<{ key: string; product_id: string }>();

  if (!row) return json({ valid: false, error: 'Licence key not found.', code: 'licenceNotFound' }, 404);
  return json({ valid: true, productId: row.product_id });
};

/** Base64 is what the Whisper binding takes, and Workers has no streaming encoder. */
const toBase64 = (bytes: Uint8Array): string => {
  const CHUNK = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
};

/**
 * Books one speech call against the per-IP and whole-app quotas. Returns the refusal
 * response when a ceiling is reached, or null once the call has been counted.
 *
 * The counters are rows in `asr_calls` rather than an in-memory counter: isolates are
 * short-lived and spread across colos, so only the database sees the whole picture.
 * The insert also prunes rows older than two days, which is longer than either window.
 */
const reserveAsrCall = async (request: Request, env: Env): Promise<Response | null> => {
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const now = Date.now();
  const today = new Date(now);
  const dayStart = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

  try {
    const counts = await env.DB.prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN client_ip = ? AND created_at > ? THEN 1 ELSE 0 END), 0) AS ip_minute,
         COALESCE(SUM(CASE WHEN client_ip = ? AND created_at > ? THEN 1 ELSE 0 END), 0) AS ip_day,
         COUNT(*) AS day
       FROM asr_calls
       WHERE created_at > ?`,
    )
      .bind(ip, now - 60_000, ip, dayStart, dayStart)
      .first<{ ip_minute: number; ip_day: number; day: number }>();

    if ((counts?.ip_minute ?? 0) >= ASR_PER_IP_PER_MINUTE) {
      return fail('voiceRateLimited', 'Too many voice answers in a row. Wait a minute or type the word.', 429);
    }
    if ((counts?.ip_day ?? 0) >= ASR_PER_IP_PER_DAY) {
      return fail('voiceDailyLimit', 'Voice answers from this device are finished for today. Type the word instead.', 429);
    }
    if ((counts?.day ?? 0) >= ASR_PER_DAY) {
      return fail('voiceCapacity', 'Voice answers are at capacity today. Type the word instead.', 503);
    }

    await env.DB.batch([
      env.DB.prepare('INSERT INTO asr_calls (client_ip, created_at) VALUES (?, ?)').bind(ip, now),
      env.DB.prepare('DELETE FROM asr_calls WHERE created_at < ?').bind(dayStart - DAY_MS),
    ]);
    return null;
  } catch (error) {
    // A database that has not had schema.sql applied yet must not take the mic away
    // from the browsers that have no other way to answer: let the call through and
    // leave the byte cap as the only guard until the migration runs.
    console.error('asr quota check failed', error);
    return null;
  }
};

/**
 * Speech-to-text for devices with no Web Speech API — Firefox and older Android
 * WebViews, where the mic used to be dead. Chrome, Edge and Safari answer inside the
 * browser and never call this, so the free Workers AI daily allocation (10,000 Neurons,
 * roughly 215 audio minutes) normally covers every request.
 *
 * Solo needs no account, so this route is open. Three things keep it from becoming a
 * free Whisper proxy: the client sends a short, silence-trimmed clip; the clip is
 * capped by size here; and every accepted call is metered per IP and per day.
 */
const transcribeClip = async (request: Request, env: Env): Promise<Response> => {
  const declared = Number(request.headers.get('content-length') || '0');
  if (declared > MAX_CLIP_BYTES) return fail('clipTooLong', 'Clip too long', 413);

  const buffer = await request.arrayBuffer();
  if (!buffer.byteLength) return fail('noAudio', 'No audio received', 400);
  if (buffer.byteLength > MAX_CLIP_BYTES) return fail('clipTooLong', 'Clip too long', 413);

  const refused = await reserveAsrCall(request, env);
  if (refused) return refused;

  try {
    const result = await env.AI.run(ASR_MODEL, {
      audio: toBase64(new Uint8Array(buffer)),
      language: 'en',
      task: 'transcribe',
    });
    return json({ transcript: String(result?.text || '').trim() });
  } catch {
    return fail('transcriptionFailed', 'Could not transcribe that clip.', 502);
  }
};

const handleApi = async (request: Request, env: Env, url: URL): Promise<Response> => {
  const { pathname } = url;
  const method = request.method.toUpperCase();

  if (pathname === '/api/pricing' && method === 'GET') return getPricing(env);
  if (pathname === '/api/asr' && method === 'POST') return transcribeClip(request, env);
  if (pathname === '/api/orders' && method === 'POST') return createOrder(request, env);
  if (pathname === '/api/orders' && method === 'GET') return listOrders(request, env);
  if (pathname === '/api/licenses/verify' && method === 'POST') return verifyLicense(request, env);
  if (pathname === '/api/entitlements' && method === 'GET') return getEntitlement(request, env);
  if (pathname === '/api/access-code/verify' && method === 'POST') return verifyAccessCode(request, env);
  if (pathname === '/api/sepay/webhook' && method === 'POST') return handleSepayWebhook(request, env);
  if (pathname === '/api/admin/overview' && method === 'GET') return getAdminOverview(request, env);
  if (pathname === '/api/admin/accounts' && method === 'GET') return getAdminAccounts(request, env);
  if (pathname === '/api/admin/grant' && method === 'POST') return grantAccess(request, env);
  if (pathname === '/api/admin/revoke' && method === 'POST') return revokeAccess(request, env);
  if (pathname === '/api/admin/reconcile' && method === 'POST') return reconcileOrder(request, env);

  const orderMatch = pathname.match(/^\/api\/orders\/([A-Za-z0-9]+)$/);
  if (orderMatch && method === 'GET') return getOrder(request, orderMatch[1].toUpperCase(), env);

  return fail('notFound', 'Not found', 404);
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
