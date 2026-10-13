/**
 * Firebase ID-token verification inside the Worker.
 *
 * Google signs ID tokens with RS256; the matching public keys are published as a JWK
 * set. Verifying locally (WebCrypto) keeps the worker free of the Admin SDK and adds
 * no extra network hop beyond the cached JWKS fetch. This is the check Firebase's own
 * docs recommend for backends that cannot use the Admin SDK.
 *
 * https://firebase.google.com/docs/auth/admin/verify-id-tokens
 */

const JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

// Small clock-skew allowance (seconds) when checking `iat`.
const CLOCK_SKEW_SECONDS = 300;

export interface FirebaseUser {
  uid: string;
  email: string | null;
  name: string | null;
}

interface Jwk extends JsonWebKey {
  kid?: string;
}

interface IdTokenPayload {
  aud?: unknown;
  iss?: unknown;
  sub?: unknown;
  exp?: unknown;
  iat?: unknown;
  email?: unknown;
  name?: unknown;
}

let jwksCache: { keys: Jwk[]; expiresAt: number } | null = null;

const decodeBase64Url = (input: string): Uint8Array => {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const decodeJson = <T>(input: string): T => JSON.parse(new TextDecoder().decode(decodeBase64Url(input))) as T;

/** Google rotates these keys; honour the response's Cache-Control so we refetch at the right time. */
const loadKeys = async (): Promise<Jwk[]> => {
  const now = Date.now();
  if (jwksCache && jwksCache.expiresAt > now) return jwksCache.keys;

  const response = await fetch(JWKS_URL);
  if (!response.ok) throw new Error(`JWKS fetch failed (${response.status})`);
  const body = (await response.json()) as { keys?: Jwk[] };
  const maxAge = Number((response.headers.get('Cache-Control') || '').match(/max-age=(\d+)/)?.[1]);
  const ttlMs = Number.isFinite(maxAge) && maxAge > 0 ? maxAge * 1000 : 60 * 60 * 1000;

  const keys = Array.isArray(body.keys) ? body.keys : [];
  jwksCache = { keys, expiresAt: now + ttlMs };
  return keys;
};

const findKey = async (kid: string | undefined, forceRefresh: boolean): Promise<Jwk | undefined> => {
  if (forceRefresh) jwksCache = null;
  const keys = await loadKeys();
  return keys.find((key) => key.kid === kid);
};

const importKey = (jwk: Jwk): Promise<CryptoKey> =>
  crypto.subtle.importKey(
    'jwk',
    // Copied with explicit fields: the published JWK carries `use`/`key_ops` hints that
    // would otherwise be forwarded to SubtleCrypto.
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );

/**
 * Returns the token's identity when the signature and every claim check out, or `null`
 * for any tampering, expiry or audience mismatch. Never throws for a bad token.
 */
export const verifyFirebaseIdToken = async (
  idToken: string,
  projectId: string,
): Promise<FirebaseUser | null> => {
  if (!projectId) return null;

  const parts = idToken.split('.');
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  try {
    const header = decodeJson<{ alg?: string; kid?: string }>(encodedHeader);
    if (header.alg !== 'RS256') return null;

    // A key that is not in the cache may simply be a freshly rotated one: refetch once.
    const key = (await findKey(header.kid, false)) ?? (await findKey(header.kid, true));
    if (!key) return null;

    const cryptoKey = await importKey(key);
    const signatureValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      decodeBase64Url(encodedSignature),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
    );
    if (!signatureValid) return null;

    const payload = decodeJson<IdTokenPayload>(encodedPayload);
    const now = Math.floor(Date.now() / 1000);

    if (payload.aud !== projectId) return null;
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
    if (typeof payload.exp !== 'number' || payload.exp <= now) return null;
    if (typeof payload.iat !== 'number' || payload.iat > now + CLOCK_SKEW_SECONDS) return null;
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) return null;

    return {
      uid: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : null,
      name: typeof payload.name === 'string' ? payload.name : null,
    };
  } catch {
    return null;
  }
};

/** Extracts the ID token from an `Authorization: Bearer <token>` header. */
export const extractBearerToken = (request: Request): string => {
  const header = request.headers.get('Authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
};
