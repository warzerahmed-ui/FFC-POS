import {
  D1PreparedStatementLike,
  Env,
  hashPassword,
  jsonResponse,
  requireSession,
} from '../_lib/auth';

const ALLOWED_KEYS = new Set([
  'products',
  'intakes',
  'yields',
  'customers',
  'suppliers',
  'dispatches',
  'returns',
  'expenses',
  'vouchers',
  'posSales',
  'branchStock',
  'branchDeliveries',
  'branchExpenses',
  'custodyTransfers',
  'settlements',
  'users',
  'factorySettings',
  'trashItems',
  'activityLogs',
]);

// Only these roles may change accounts / factory settings.
const ADMIN_ONLY_KEYS = new Set(['users', 'factorySettings']);
const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN']);
const MAX_BODY_CHARS = 4_000_000;

interface UserRecord {
  id?: string;
  role?: string;
  isSuperAdmin?: boolean;
  password?: unknown;
  hasPassword?: boolean;
  [k: string]: unknown;
}

const ensureTable = async (db: NonNullable<Env['DB']>) => {
  await db.batch([
    db.prepare(
      `CREATE TABLE IF NOT EXISTS app_state (
        state_key TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ),
  ]);
};

const isSuper = (u: UserRecord) => u.isSuperAdmin === true || u.role === 'SUPER_ADMIN';

export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;
  const auth = await requireSession(request, env);
  if ('error' in auth) return auth.error;

  const db = env.DB;
  if (!db) return jsonResponse({ ok: false, error: 'D1 binding missing' }, 503);

  try {
    await ensureTable(db);
    const { results } = await db
      .prepare('SELECT state_key, payload, updated_at FROM app_state')
      .all<{ state_key: string; payload: string; updated_at: string }>();

    const state: Record<string, unknown> = {};
    let latestUpdatedAt = '';

    for (const row of results || []) {
      if (!ALLOWED_KEYS.has(row.state_key)) continue;
      try {
        let value: unknown = JSON.parse(row.payload);
        if (row.state_key === 'users' && Array.isArray(value)) {
          // Never send password hashes to the browser.
          value = (value as UserRecord[]).map(u => {
            const { password, ...rest } = u;
            return { ...rest, hasPassword: typeof password === 'string' && password.length > 0 };
          });
        }
        state[row.state_key] = value;
        if (row.updated_at && row.updated_at > latestUpdatedAt) {
          latestUpdatedAt = row.updated_at;
        }
      } catch {
        // Ignore corrupted JSON row
      }
    }

    return jsonResponse({
      ok: true,
      empty: Object.keys(state).length === 0,
      serverUpdatedAt: latestUpdatedAt || null,
      state,
    });
  } catch {
    return jsonResponse({ ok: false, error: 'Failed to read state' }, 500);
  }
};

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;
  const auth = await requireSession(request, env);
  if ('error' in auth) return auth.error;
  const role = auth.session.role;
  const isAdmin = ADMIN_ROLES.has(role);

  const db = env.DB;
  if (!db) return jsonResponse({ ok: false, error: 'D1 binding missing' }, 503);

  try {
    await ensureTable(db);

    const text = await request.text();
    if (text.length > MAX_BODY_CHARS) {
      return jsonResponse({ ok: false, error: 'Payload too large' }, 413);
    }
    let body: { state?: Record<string, unknown> };
    try {
      body = JSON.parse(text);
    } catch {
      return jsonResponse({ ok: false, error: 'Invalid payload' }, 400);
    }
    const incoming = body?.state;
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
      return jsonResponse({ ok: false, error: 'Invalid payload' }, 400);
    }

    const statements: D1PreparedStatementLike[] = [];
    for (const [key, rawValue] of Object.entries(incoming)) {
      if (!ALLOWED_KEYS.has(key) || rawValue === undefined) continue;
      if (ADMIN_ONLY_KEYS.has(key) && !isAdmin) continue;

      let value: unknown = rawValue;

      if (key === 'users') {
        if (!Array.isArray(rawValue)) continue;
        const existingRows = await db
          .prepare("SELECT payload FROM app_state WHERE state_key = 'users'")
          .all<{ payload: string }>();
        let existing: UserRecord[] = [];
        try {
          const parsed = JSON.parse(existingRows.results?.[0]?.payload || '[]');
          if (Array.isArray(parsed)) existing = parsed as UserRecord[];
        } catch {
          existing = [];
        }
        const existingById = new Map(existing.filter(u => u && u.id).map(u => [u.id as string, u]));

        const next: UserRecord[] = [];
        for (const raw of rawValue as UserRecord[]) {
          if (!raw || typeof raw !== 'object' || !raw.id) continue;
          const prev = existingById.get(raw.id);
          // Only the Super Admin can create/modify Super Admin-level accounts.
          if (role !== 'SUPER_ADMIN') {
            if (prev && isSuper(prev)) continue; // re-added below untouched
            if (isSuper(raw)) continue;
          }
          const { password, hasPassword: _hp, ...rest } = raw;
          void _hp;
          const plain = typeof password === 'string' ? password.trim() : '';
          let stored: unknown = prev?.password;
          if (plain) stored = await hashPassword(plain);
          next.push(stored ? { ...rest, password: stored } : { ...rest });
        }
        if (role !== 'SUPER_ADMIN') {
          for (const prev of existing) {
            if (prev && isSuper(prev)) next.push(prev);
          }
        }
        value = next;
      }

      statements.push(
        db
          .prepare(
            `INSERT INTO app_state (state_key, payload, updated_at)
             VALUES (?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(state_key) DO UPDATE SET
               payload = excluded.payload,
               updated_at = CURRENT_TIMESTAMP`
          )
          .bind(key, JSON.stringify(value))
      );
    }

    if (statements.length > 0) {
      await db.batch(statements);
    }

    return jsonResponse({
      ok: true,
      savedKeys: statements.length,
      serverUpdatedAt: new Date().toISOString(),
    });
  } catch {
    return jsonResponse({ ok: false, error: 'Failed to write state' }, 500);
  }
};
