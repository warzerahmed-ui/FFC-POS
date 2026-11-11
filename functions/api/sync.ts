interface D1PreparedStatementLike {
  bind: (...values: unknown[]) => D1PreparedStatementLike;
  all: <T = Record<string, unknown>>() => Promise<{ results: T[] }>;
}

interface D1DatabaseLike {
  prepare: (query: string) => D1PreparedStatementLike;
  batch: (statements: D1PreparedStatementLike[]) => Promise<unknown[]>;
}

interface Env {
  DB?: D1DatabaseLike;
}

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

const CORS_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

const ensureTable = async (db: D1DatabaseLike) => {
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

export const onRequestGet = async (context: { env: Env }) => {
  const db = context.env.DB;
  if (!db) {
    return new Response(JSON.stringify({ ok: false, error: 'D1 binding missing' }), {
      status: 503,
      headers: CORS_HEADERS,
    });
  }

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
        state[row.state_key] = JSON.parse(row.payload);
        if (row.updated_at && row.updated_at > latestUpdatedAt) {
          latestUpdatedAt = row.updated_at;
        }
      } catch {
        // Ignore corrupted JSON row
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        empty: Object.keys(state).length === 0,
        serverUpdatedAt: latestUpdatedAt || null,
        state,
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to read D1 state',
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const db = context.env.DB;
  if (!db) {
    return new Response(JSON.stringify({ ok: false, error: 'D1 binding missing' }), {
      status: 503,
      headers: CORS_HEADERS,
    });
  }

  try {
    await ensureTable(db);
    const body = (await context.request.json()) as { state?: Record<string, unknown> };
    const incoming = body?.state;
    if (!incoming || typeof incoming !== 'object') {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid payload' }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    const statements: D1PreparedStatementLike[] = [];
    for (const [key, value] of Object.entries(incoming)) {
      if (!ALLOWED_KEYS.has(key) || value === undefined) continue;
      const serialized = JSON.stringify(value);
      statements.push(
        db
          .prepare(
            `INSERT INTO app_state (state_key, payload, updated_at)
             VALUES (?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(state_key) DO UPDATE SET
               payload = excluded.payload,
               updated_at = CURRENT_TIMESTAMP`
          )
          .bind(key, serialized)
      );
    }

    if (statements.length > 0) {
      await db.batch(statements);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        savedKeys: statements.length,
        serverUpdatedAt: new Date().toISOString(),
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to write D1 state',
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
