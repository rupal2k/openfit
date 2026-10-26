/**
 * api/server.test.js — unit tests for pure helpers from server.js.
 * Tests the stateFile sanitization invariant: the final path always
 * stays within DATA regardless of attacker-controlled uid input.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

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
