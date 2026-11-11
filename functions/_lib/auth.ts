export interface D1PreparedStatementLike {
  bind: (...values: unknown[]) => D1PreparedStatementLike;
  all: <T = Record<string, unknown>>() => Promise<{ results: T[] }>;
  run: () => Promise<unknown>;
}

export interface D1DatabaseLike {
  prepare: (query: string) => D1PreparedStatementLike;
  batch: (statements: D1PreparedStatementLike[]) => Promise<unknown[]>;
}

export interface Env {
  DB?: D1DatabaseLike;
  AUTH_SECRET?: string;
  SUPER_ADMIN_PHONE?: string;
  SUPER_ADMIN_PASSWORD?: string;
}

export interface SessionPayload {
  uid: string;
  role: string;
  exp: number;
}

export const SESSION_TTL_SECONDS = 12 * 60 * 60;
const PBKDF2_ITERATIONS = 100000;
const encoder = new TextEncoder();

export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
};

export const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: SECURITY_HEADERS });

const toB64Url = (bytes: Uint8Array): string => {
  let s = '';
  bytes.forEach(b => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromB64Url = (str: string): Uint8Array => {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (str.length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

export const timingSafeEqual = (a: string, b: string): boolean => {
  const ab = encoder.encode(a);
  const bb = encoder.encode(b);
  let diff = ab.length ^ bb.length;
  const len = Math.max(ab.length, bb.length);
  for (let i = 0; i < len; i++) diff |= (ab[i] || 0) ^ (bb[i] || 0);
  return diff === 0;
};

const hmacKey = (secret: string) =>
  crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);

export const signToken = async (payload: SessionPayload, secret: string): Promise<string> => {
  const body = toB64Url(encoder.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(body));
  return `${body}.${toB64Url(new Uint8Array(sig))}`;
};

export const verifyToken = async (token: string, secret: string): Promise<SessionPayload | null> => {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  try {
    const ok = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret),
      fromB64Url(parts[1]) as BufferSource,
      encoder.encode(parts[0])
    );
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64Url(parts[0]))) as SessionPayload;
    if (!payload || typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
};

const pbkdf2 = async (plain: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> => {
  const key = await crypto.subtle.importKey('raw', encoder.encode(plain), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, 256);
  return new Uint8Array(bits);
};

export const hashPassword = async (plain: string): Promise<string> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(plain, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toB64Url(salt)}$${toB64Url(hash)}`;
};

export const verifyPassword = async (plain: string, stored: unknown): Promise<boolean> => {
  if (typeof stored !== 'string') return false;
  const [scheme, iterStr, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'pbkdf2' || !iterStr || !saltB64 || !hashB64) return false;
  const iterations = parseInt(iterStr, 10);
  if (!Number.isFinite(iterations) || iterations < 1 || iterations > PBKDF2_ITERATIONS) return false;
  try {
    const derived = await pbkdf2(plain, fromB64Url(saltB64), iterations);
    return timingSafeEqual(toB64Url(derived), hashB64);
  } catch {
    return false;
  }
};

/** Returns the verified session payload, or a ready-made error Response. */
export const requireSession = async (
  request: Request,
  env: Env
): Promise<{ session: SessionPayload } | { error: Response }> => {
  if (!env.AUTH_SECRET) {
    return { error: jsonResponse({ ok: false, error: 'Server auth not configured' }, 503) };
  }
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const session = token ? await verifyToken(token, env.AUTH_SECRET) : null;
  if (!session) {
    return { error: jsonResponse({ ok: false, error: 'Unauthorized' }, 401) };
  }
  return { session };
};
