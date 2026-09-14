import { createHash } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import {
  mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync,
} from '../../helpers/test-filesystem';
import {
  createExistingDistServer, safeDistPath, validateExistingDist,
} from '../../../tools/vtt-handoff/serve-existing-dist.mjs';

const temporaryDirectories: string[] = [];

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'vtt-handoff-dist-test-'));
  temporaryDirectories.push(root);
  mkdirSync(join(root, 'assets'));
  writeFileSync(join(root, 'index.html'), '<h1>stamped</h1>');
  const worker = Buffer.from('self.onmessage = () => undefined;\n');
  writeFileSync(join(root, 'assets/worker-entry-test.js'), worker);
  writeFileSync(join(root, 'vtt-handoff-artifact.json'), `${JSON.stringify({
    artifact: 'dist',
    commit: 'a'.repeat(40),
    worker: {
      url: '/assets/worker-entry-test.js',
      sha256: createHash('sha256').update(worker).digest('hex'),
    },
  })}\n`);
  return root;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('serve-existing-dist', () => {
  it('serves only an existing stamped dist without invoking a build', async () => {
    const root = fixture();
    const server = createExistingDistServer(root);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${String(address.port)}/vtt-handoff`);
    expect(await response.text()).toBe('<h1>stamped</h1>');
    await new Promise<void>((resolve, reject) => server.close((error) => error === undefined ? resolve() : reject(error)));
    const source = readFileSync('tools/vtt-handoff/serve-existing-dist.mjs', 'utf8');
    expect(source).not.toMatch(/(?:exec|spawn)(?:File|Sync)?\s*\(/u);
  });

  it('refuses missing, unstamped, and tampered dist trees', () => {
    const missing = join(tmpdir(), `vtt-handoff-missing-${String(process.pid)}`);
    expect(() => validateExistingDist(missing)).toThrow('missing dist');
    const root = fixture();
    rmSync(join(root, 'vtt-handoff-artifact.json'));
    expect(() => validateExistingDist(root)).toThrow('unstamped dist');
    const tampered = fixture();
    writeFileSync(join(tampered, 'assets/worker-entry-test.js'), 'changed');
    expect(() => validateExistingDist(tampered)).toThrow('hash disagrees');
  });

  it('rejects traversal while retaining ordinary asset resolution', () => {
    const root = fixture();
    expect(safeDistPath(root, '/assets/worker-entry-test.js')).toBe(join(root, 'assets/worker-entry-test.js'));
    expect(safeDistPath(root, '/%2e%2e/%2e%2e/etc/passwd')).toBeNull();
    expect(safeDistPath(root, '/bad%00path')).toBeNull();
  });

  it('does not serve a symlink that escapes the stamped dist', async () => {
    const root = fixture();
    const outside = mkdtempSync(join(tmpdir(), 'vtt-handoff-dist-outside-'));
    temporaryDirectories.push(outside);
    writeFileSync(join(outside, 'secret.txt'), 'not part of dist');
    symlinkSync(join(outside, 'secret.txt'), join(root, 'leak.txt'));
    const server = createExistingDistServer(root);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${String(address.port)}/leak.txt`);
    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid path.');
    await new Promise<void>((resolve, reject) => server.close((error) => error === undefined ? resolve() : reject(error)));
  });
});
