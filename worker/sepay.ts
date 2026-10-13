/**
 * Sepay-facing helpers: order codes, licence keys, QR construction and the parsing
 * rules used to recognise an order from a bank transfer memo.
 *
 * Kept apart from the HTTP layer so the matching rules can be reviewed in one place —
 * getting them wrong means a paying customer's order never gets fulfilled.
 */

// Order codes travel through banking apps by hand, so they must survive being
// uppercased and stripped of punctuation: letters + digits only.
const ORDER_CODE_PREFIX = 'WC';
const ORDER_CODE_LENGTH = 7;

// Ambiguous glyphs (I/O/0/1) are excluded so codes can be read aloud or retyped
// without a support round-trip.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const randomCode = (length: number): string => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const byte of bytes) out += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return out;
};

/** e.g. `WC7KQ4M2` — quoted in the transfer memo and matched back by the webhook. */
export const generateOrderCode = (): string =>
  `${ORDER_CODE_PREFIX}${randomCode(ORDER_CODE_LENGTH)}`;

/** e.g. `WC-7KQ4-M2NP-9XRT` — handed to the buyer after payment. */
export const generateLicenseKey = (): string =>
  `WC-${randomCode(4)}-${randomCode(4)}-${randomCode(4)}`;

const LICENSE_BODY_LENGTH = 12;

/**
 * Rewrites whatever the buyer pasted into the canonical key form, so
 * `wc 7kq4m2np9xrt` and `WC-7KQ4-M2NP-9XRT` both resolve to the same value.
 * Returns an empty string when the input could never be a licence key, which is how
 * the caller tells a licence key apart from the legacy teacher access code.
 */
export const normalizeLicenseKey = (raw: string): string => {
  const compact = String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const body = compact.startsWith(ORDER_CODE_PREFIX)
    ? compact.slice(ORDER_CODE_PREFIX.length)
    : compact;
  if (body.length !== LICENSE_BODY_LENGTH) return '';
  return `WC-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}`;
};

/**
 * Finds the order code inside the bank webhook's `code` / `content` fields.
 * The explicit word boundaries are what keep a licence key (`WC-7KQ4-…`) from being
 * mistaken for an order code.
 */
export const extractOrderCode = (...texts: (string | null | undefined)[]): string | null => {
  for (const text of texts) {
    const match = String(text || '')
      .toUpperCase()
      .match(/(?:^|[^A-Z0-9])WC([A-Z0-9]{7})(?![A-Z0-9])/);
    if (match) return `${ORDER_CODE_PREFIX}${match[1]}`;
  }
  return null;
};

export interface QrParams {
  accountNumber: string;
  bankName: string;
  amount: number;
  description: string;
}

/** Sepay renders the VietQR image for us; no API token is needed for this step. */
export const buildQrUrl = ({ accountNumber, bankName, amount, description }: QrParams): string => {
  const params = new URLSearchParams({
    acc: accountNumber,
    bank: bankName,
    amount: String(Math.round(amount)),
    des: description,
  });
  return `https://qr.sepay.vn/img?${params.toString()}`;
};

/** Constant-time comparison so a webhook key cannot be guessed byte by byte. */
export const safeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};
