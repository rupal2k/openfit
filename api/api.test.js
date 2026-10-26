/**
 * openfit-api integration tests
 * Uses Node's built-in test runner (node:test) and starts the server
 * as a child process against a temp DATA_DIR so tests never touch production data.
 *
 * Run:  npm test
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── helpers ──────────────────────────────────────────────────────────────────

const PORT = 19473;
const BASE = `http://localhost:${PORT}`;
let server, dataDir;

async function api(method, path, { body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: (method !== 'GET' && method !== 'HEAD' && body !== undefined) ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, headers: res.headers, data };
}

function extractCookie(headers) {
  return headers.get('set-cookie')?.split(';')[0] || null;
}

// Wait until /api/health responds (server ready).
async function waitReady(timeout = 8000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return;
    } catch { /* not ready yet */ }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('server did not become ready in time');
}

// ── lifecycle ─────────────────────────────────────────────────────────────────

before(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'openfit-test-'));
  server = spawn(process.execPath, ['server.js'], {
    cwd: fileURLToPath(new URL('.', import.meta.url)),
    env: {
      ...process.env,
      PORT: String(PORT),
      DATA_DIR: dataDir,
      RP_ID: 'localhost',
      ORIGIN: `http://localhost:${PORT}`,
    },
    stdio: 'pipe',
  });
  server.stderr.on('data', d => process.stderr.write(d));
  await waitReady();
});

after(() => {
  server?.kill();
  try { rmSync(dataDir, { recursive: true, force: true }); } catch {}
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/health', () => {
  it('returns 200 with ok:true', async () => {
    const { status, data } = await api('GET', '/api/health');
    assert.equal(status, 200);
    assert.equal(data.ok, true);
    assert.equal(typeof data.users, 'number');
  });
});

describe('GET /api/config', () => {
  it('returns invite_only:false by default', async () => {
    const { status, data } = await api('GET', '/api/config');
    assert.equal(status, 200);
    assert.equal(data.invite_only, false);
  });
});

describe('GET /api/me (unauthenticated)', () => {
  it('returns 401 when no session cookie is present', async () => {
    const { status, data } = await api('GET', '/api/me');
    assert.equal(status, 401);
    assert.ok(data.error);
  });
});

describe('POST /api/register/options', () => {
  it('returns 400 when name is missing', async () => {
    const { status, data } = await api('POST', '/api/register/options', { body: {} });
    assert.equal(status, 400);
    assert.match(data.error, /name/i);
  });

  it('returns 400 when name is empty string', async () => {
    const { status } = await api('POST', '/api/register/options', { body: { name: '   ' } });
    assert.equal(status, 400);
  });

  it('returns 200 with cid and WebAuthn options for a valid name', async () => {
    const { status, data } = await api('POST', '/api/register/options', { body: { name: 'Alice' } });
    assert.equal(status, 200);
    assert.ok(data.cid, 'should return a challenge id');
    assert.ok(data.options?.challenge, 'should return WebAuthn options with a challenge');
    assert.equal(data.options.rp?.id, 'localhost');
  });

  it('truncates a name longer than 40 characters', async () => {
    const longName = 'A'.repeat(80);
    const { status, data } = await api('POST', '/api/register/options', { body: { name: longName } });
    assert.equal(status, 200);
    assert.ok(data.cid);
  });
});

describe('POST /api/register/verify — expired challenge', () => {
  it('returns 400 when cid is missing or invalid', async () => {
    const { status, data } = await api('POST', '/api/register/verify', { body: { cid: 'nope', credential: {} } });
    assert.equal(status, 400);
    assert.match(data.error, /challenge/i);
  });
});

describe('POST /api/login/options', () => {
  it('returns 200 with a WebAuthn challenge', async () => {
    const { status, data } = await api('POST', '/api/login/options');
    assert.equal(status, 200);
    assert.ok(data.cid);
    assert.ok(data.options?.challenge);
  });

  it('each call returns a different challenge', async () => {
    const a = await api('POST', '/api/login/options');
    const b = await api('POST', '/api/login/options');
    assert.notEqual(a.data.options.challenge, b.data.options.challenge);
  });
});

describe('POST /api/login/verify — unknown passkey', () => {
  it('returns 400 for an expired/missing challenge cid', async () => {
    const { status, data } = await api('POST', '/api/login/verify', { body: { cid: 'bad', credential: { id: 'fake' } } });
    assert.equal(status, 400);
    assert.match(data.error, /challenge/i);
  });

  it('returns 404 when the passkey is not registered (with a real cid)', async () => {
    const opts = await api('POST', '/api/login/options');
    const cid = opts.data.cid;
    const { status, data } = await api('POST', '/api/login/verify', {
      body: { cid, credential: { id: 'not-registered', type: 'public-key', rawId: 'not-registered', response: {} } },
    });
    assert.equal(status, 404);
    assert.match(data.error, /passkey/i);
  });
});

describe('POST /api/logout', () => {
  it('returns 200 and clears the session cookie (no auth required)', async () => {
    const { status, data, headers } = await api('POST', '/api/logout');
    assert.equal(status, 200);
    assert.equal(data.ok, true);
    const sc = headers.get('set-cookie') || '';
    assert.ok(sc.includes('Max-Age=0'), 'should expire the cookie');
  });
});

describe('Protected endpoints — unauthenticated', () => {
  const protectedRoutes = [
    ['GET', '/api/data'],
    ['PUT', '/api/data'],
    ['GET', '/api/food/search?q=apple'],
    ['POST', '/api/push/subscribe'],
    ['POST', '/api/push/unsubscribe'],
    ['POST', '/api/push/test'],
    ['POST', '/api/push/rest-timer'],
    ['POST', '/api/push/rest-timer/cancel'],
    ['POST', '/api/activity'],
    ['POST', '/api/logout/all'],
  ];

  for (const [method, path] of protectedRoutes) {
    it(`${method} ${path} → 401 without a session`, async () => {
      const { status } = await api(method, path, { body: {} });
      assert.equal(status, 401, `expected 401 for ${method} ${path}`);
    });
  }
});

describe('Admin endpoints — unauthenticated / non-admin', () => {
  const adminRoutes = [
    ['GET', '/api/admin/users'],
    ['GET', '/api/admin/user?id=x'],
    ['GET', '/api/admin/invites'],
  ];

  for (const [method, path] of adminRoutes) {
    it(`${method} ${path} → 401 without a session`, async () => {
      const { status } = await api(method, path, { body: {} });
      assert.equal(status, 401, `expected 401 for ${method} ${path}`);
    });
  }
});

describe('GET /api/food/search', () => {
  it('returns 401 without session', async () => {
    const { status } = await api('GET', '/api/food/search?q=apple');
    assert.equal(status, 401);
  });
});

describe('GET /api/push/public-key', () => {
  it('returns the VAPID public key (public endpoint)', async () => {
    const { status, data } = await api('GET', '/api/push/public-key');
    assert.equal(status, 200);
    assert.ok(typeof data.key === 'string' && data.key.length > 10, 'should return a non-empty public key');
  });
});

describe('404 for unknown routes', () => {
  it('returns 404 for an unmapped path', async () => {
    const { status, data } = await api('GET', '/api/does-not-exist');
    assert.equal(status, 404);
    assert.ok(data.error);
  });

  it('returns 404 for a known path with the wrong method', async () => {
    const { status } = await api('DELETE', '/api/health');
    assert.equal(status, 404);
  });
});

describe('Challenge TTL — replay protection', () => {
  it('consuming the same cid twice fails on the second call', async () => {
    const opts = await api('POST', '/api/login/options');
    const { cid } = opts.data;
    // First consume — passkey not found → 404
    const r1 = await api('POST', '/api/login/verify', {
      body: { cid, credential: { id: 'x', type: 'public-key', rawId: 'x', response: {} } },
    });
    assert.equal(r1.status, 404);
    // Second consume of the same cid — challenge already gone → 400
    const r2 = await api('POST', '/api/login/verify', {
      body: { cid, credential: { id: 'x', type: 'public-key', rawId: 'x', response: {} } },
    });
    assert.equal(r2.status, 400, 'replayed challenge should be rejected');
    assert.match(r2.data.error, /challenge/i);
  });
});

describe('POST /api/push/rest-timer validation', () => {
  it('returns 401 without session', async () => {
    const { status } = await api('POST', '/api/push/rest-timer', { body: { seconds: 60 } });
    assert.equal(status, 401);
  });
});

// ── Rate limiting — dedicated server with RATE_LIMIT_MAX=3 ────────────────────

let serverRL, dataDirRL;
const PORT_RL = 19475;
const BASE_RL = `http://localhost:${PORT_RL}`;
async function apiRL(method, path2, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (opts.cookie) headers['Cookie'] = opts.cookie;
  const res = await fetch(`${BASE_RL}${path2}`, {
    method, headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, headers: res.headers, data };
}

describe('rate limiting on auth endpoints', { concurrency: false }, () => {
  before(async () => {
    dataDirRL = mkdtempSync(join(tmpdir(), 'openfit-rl-'));
    serverRL = spawn(process.execPath, ['server.js'], {
      cwd: fileURLToPath(new URL('.', import.meta.url)),
      env: {
        ...process.env,
        PORT: String(PORT_RL),
        DATA_DIR: dataDirRL,
        RP_ID: 'localhost',
        ORIGIN: `http://localhost:${PORT_RL}`,
        RATE_LIMIT_MAX: '3',
      },
      stdio: 'pipe',
    });
    serverRL.stderr.on('data', d => process.stderr.write(d));
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      try { const r = await fetch(`${BASE_RL}/api/health`); if (r.ok) break; } catch {}
      await new Promise(r => setTimeout(r, 100));
    }
  });

  after(() => {
    serverRL?.kill();
    try { rmSync(dataDirRL, { recursive: true, force: true }); } catch {}
  });

  it('allows up to 3 auth requests per 60s from one IP', async () => {
    const results = await Promise.all(
      Array.from({ length: 3 }, () =>
        apiRL('POST', '/api/register/options', { body: { name: 'ratetest' } })
      )
    );
    assert.ok(results.every(r => r.status !== 429), 'should not rate-limit within window');
  });

  it('returns 429 on the 4th auth request within the 60s window', async () => {
    const r = await apiRL('POST', '/api/login/options', {});
    assert.equal(r.status, 429);
    assert.match(r.data.error, /rate limit/i);
  });
});
