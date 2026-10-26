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
  it('returns 200 with ok:true and no user count', async () => {
    const { status, data } = await api('GET', '/api/health');
    assert.equal(status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.users, undefined, 'health should not expose user count to unauthenticated callers');
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
    assert.ok(sc.startsWith('gymsid='), 'HTTP test server must use plain gymsid= (no __Host- prefix on HTTP)');
    assert.ok(!sc.startsWith('__Host-'), 'should not have __Host- prefix on HTTP');
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

// ── INVITE_ONLY — dedicated server on port 19474 ─────────────────────────────

let serverInv, dataDirInv;
const PORT_INV = 19474;
const BASE_INV = `http://localhost:${PORT_INV}`;
async function apiInv(method, path2, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (opts.cookie) headers['Cookie'] = opts.cookie;
  const res = await fetch(`${BASE_INV}${path2}`, {
    method, headers,
    body: (method !== 'GET' && method !== 'HEAD' && opts.body !== undefined) ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, headers: res.headers, data };
}

describe('INVITE_ONLY registration gate', { concurrency: false }, () => {
  before(async () => {
    dataDirInv = mkdtempSync(join(tmpdir(), 'openfit-inv-'));
    serverInv = spawn(process.execPath, ['server.js'], {
      cwd: fileURLToPath(new URL('.', import.meta.url)),
      env: {
        ...process.env,
        PORT: String(PORT_INV),
        DATA_DIR: dataDirInv,
        RP_ID: 'localhost',
        ORIGIN: `http://localhost:${PORT_INV}`,
        INVITE_ONLY: '1',
      },
      stdio: 'pipe',
    });
    serverInv.stderr.on('data', d => process.stderr.write(d));
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      try { const r = await fetch(`${BASE_INV}/api/health`); if (r.ok) break; } catch {}
      await new Promise(r => setTimeout(r, 100));
    }
  });

  after(() => {
    serverInv?.kill();
    try { rmSync(dataDirInv, { recursive: true, force: true }); } catch {}
  });

  it('GET /api/config reports invite_only:true', async () => {
    const { status, data } = await apiInv('GET', '/api/config');
    assert.equal(status, 200);
    assert.equal(data.invite_only, true);
  });

  it('POST /api/register/options returns 403 with invite message when no code supplied', async () => {
    const { status, data } = await apiInv('POST', '/api/register/options', { body: { name: 'testuser' } });
    assert.equal(status, 403);
    assert.match(data.error, /invite/i);
  });

  it('POST /api/register/options returns 403 for a blank invite code', async () => {
    const { status, data } = await apiInv('POST', '/api/register/options', { body: { name: 'testuser', code: '' } });
    assert.equal(status, 403);
    assert.match(data.error, /invite/i);
  });
});

// ── Session version bump — auth boundary tests ───────────────────────────────

describe('POST /api/logout/all — requires session', () => {
  it('returns 401 without a session cookie', async () => {
    const { status } = await api('POST', '/api/logout/all');
    assert.equal(status, 401);
  });
});

describe('admin routes — additional auth boundary checks', () => {
  it('POST /api/admin/user/disable returns 401 without session', async () => {
    const { status } = await api('POST', '/api/admin/user/disable', { body: { id: 'x' } });
    assert.equal(status, 401);
  });

  it('POST /api/admin/invites/new returns 401 without session', async () => {
    const { status } = await api('POST', '/api/admin/invites/new', { body: {} });
    assert.equal(status, 401);
  });

  it('POST /api/admin/invites/revoke returns 401 without session', async () => {
    const { status } = await api('POST', '/api/admin/invites/revoke', { body: { code: 'AABBCCDD' } });
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

// ── Auth event logging — dedicated server on port 19476, stderr captured ──────

let serverLog, dataDirLog;
const PORT_LOG = 19476;
const BASE_LOG = `http://localhost:${PORT_LOG}`;
let stderrLog = '';
async function apiLog(method, path2, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (opts.cookie) headers['Cookie'] = opts.cookie;
  const res = await fetch(`${BASE_LOG}${path2}`, {
    method, headers,
    body: (method !== 'GET' && method !== 'HEAD' && opts.body !== undefined) ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, headers: res.headers, data };
}

describe('auth event logging', { concurrency: false }, () => {
  before(async () => {
    dataDirLog = mkdtempSync(join(tmpdir(), 'openfit-log-'));
    serverLog = spawn(process.execPath, ['server.js'], {
      cwd: fileURLToPath(new URL('.', import.meta.url)),
      env: {
        ...process.env,
        PORT: String(PORT_LOG),
        DATA_DIR: dataDirLog,
        RP_ID: 'localhost',
        ORIGIN: `http://localhost:${PORT_LOG}`,
      },
      stdio: 'pipe',
    });
    serverLog.stderr.on('data', d => { stderrLog += d.toString(); });
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      try { const r = await fetch(`${BASE_LOG}/api/health`); if (r.ok) break; } catch {}
      await new Promise(r => setTimeout(r, 100));
    }
  });

  after(() => {
    serverLog?.kill();
    try { rmSync(dataDirLog, { recursive: true, force: true }); } catch {}
  });

  it('emits a structured REGISTER event on successful registration', async () => {
    stderrLog = '';
    await apiLog('POST', '/api/register/options', { body: { name: 'logtest' } });
    await new Promise(r => setTimeout(r, 50));
    const lines = stderrLog.split('\n').filter(l => l.trim().startsWith('{'));
    const evt = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).find(e => e?.event === 'REGISTER_OPTIONS');
    assert.ok(evt, 'expected a REGISTER_OPTIONS log line in stderr');
    assert.ok(evt.ts, 'log entry must have ts field');
  });

  it('emits a structured LOGIN_FAIL event on unknown passkey', async () => {
    stderrLog = '';
    const optRes = await apiLog('POST', '/api/login/options', {});
    // Attempt verify with a malformed/unknown credential
    await apiLog('POST', '/api/login/verify', { body: { cid: optRes.data?.cid, credential: { id: 'unknown', type: 'public-key', response: {} } } });
    await new Promise(r => setTimeout(r, 50));
    const lines = stderrLog.split('\n').filter(l => l.trim().startsWith('{'));
    const evt = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).find(e => e?.event === 'LOGIN_FAIL');
    assert.ok(evt, 'expected a LOGIN_FAIL log line in stderr');
    assert.ok(evt.reason, 'LOGIN_FAIL must have a reason field');
  });
});
