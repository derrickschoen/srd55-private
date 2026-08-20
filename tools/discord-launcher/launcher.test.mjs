import assert from 'node:assert/strict';
import test from 'node:test';
import { cloudflaredUrl, parseEnv, validatePort } from './launcher-lib.mjs';

test('parses comments, values containing equals, and quoted values', () => {
  assert.deepEqual(parseEnv('# comment\nPORT=5173\nTOKEN="a=b"\nEMPTY=\n'), { PORT: '5173', TOKEN: 'a=b', EMPTY: '' });
});

test('rejects malformed environment names', () => {
  assert.throws(() => parseEnv('bad-name=value'), /invalid \.env name/);
});

test('extracts only a cloudflared quick-tunnel URL', () => {
  assert.equal(cloudflaredUrl('Visit https://kind-moon.trycloudflare.com now'), 'https://kind-moon.trycloudflare.com');
  assert.equal(cloudflaredUrl('https://example.com'), null);
});

test('validates the three-port range', () => {
  assert.equal(validatePort('5173'), 5173);
  assert.throws(() => validatePort('65534'), /invalid PORT/);
  assert.throws(() => validatePort('5x'), /invalid PORT/);
});
