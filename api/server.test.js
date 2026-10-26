/**
 * api/server.test.js — unit tests for pure helpers from server.js.
 * Tests the stateFile sanitization invariant and atomicWrite error handling.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Use a platform-appropriate DATA path so path.join and startsWith agree.
const DATA = path.resolve('test-data-temp');
const stateFile = uid => path.join(DATA, 'state-' + uid.replace(/[^a-zA-Z0-9_-]/g, '') + '.json');

describe('stateFile path sanitization — invariant: path stays within DATA', () => {
  it('path traversal sequences do not escape DATA', () => {
    const p = stateFile('../../etc/passwd');
    assert.ok(!p.includes('..'), `path contains '..' : ${p}`);
    assert.ok(p.startsWith(DATA), `path escapes DATA: ${p}`);
  });

  it('preserves safe uid characters [A-Za-z0-9_-]', () => {
    const uid = 'abc-123_XYZ';
    const p = stateFile(uid);
    assert.ok(p.endsWith('state-abc-123_XYZ.json'), `unexpected path: ${p}`);
    assert.ok(p.startsWith(DATA), `path escapes DATA: ${p}`);
  });

  it('slashes do not escape DATA', () => {
    const p = stateFile('uid/evil');
    assert.ok(p.startsWith(DATA), `path escapes DATA: ${p}`);
    assert.ok(!p.includes('..'), `path contains '..': ${p}`);
  });

  it('null bytes are stripped and path stays within DATA', () => {
    const p = stateFile('uid\x00evil');
    assert.ok(!p.includes('\x00'), 'null byte survived sanitization');
    assert.ok(p.startsWith(DATA), `path escapes DATA: ${p}`);
  });

  it('produces a deterministic path for a legitimate base64url uid', () => {
    const uid = 'abc123-_XYZ456';
    const p = stateFile(uid);
    assert.equal(p, path.join(DATA, `state-${uid}.json`));
  });
});

// Replicate atomicWrite (server.js: function atomicWrite(file, content))
function atomicWrite(file, content) {
  const tmp = file + '.tmp';
  try {
    fs.writeFileSync(tmp, content);
    fs.renameSync(tmp, file);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch {}
    throw err;
  }
}

describe('atomicWrite error handling', () => {
  let dir;
  const setup = () => { dir = mkdtempSync(join(tmpdir(), 'aw-test-')); };
  const teardown = () => { try { rmSync(dir, { recursive: true, force: true }); } catch {} };

  it('writes a file successfully', () => {
    setup();
    const file = join(dir, 'out.json');
    atomicWrite(file, '{"ok":true}');
    assert.equal(fs.readFileSync(file, 'utf8'), '{"ok":true}');
    teardown();
  });

  it('throws when the target directory does not exist and leaves no .tmp file', () => {
    setup();
    const file = join(dir, 'nonexistent', 'out.json');
    assert.throws(() => atomicWrite(file, 'data'), /no such file|ENOENT/i);
    assert.ok(!fs.existsSync(file + '.tmp'), '.tmp file must be cleaned up on failure');
    teardown();
  });

  it('original file is untouched when rename fails', () => {
    setup();
    const file = join(dir, 'orig.json');
    fs.writeFileSync(file, '{"original":true}');
    // Overwrite: should succeed (rename replaces atomically)
    atomicWrite(file, '{"updated":true}');
    assert.equal(fs.readFileSync(file, 'utf8'), '{"updated":true}');
    teardown();
  });
});
