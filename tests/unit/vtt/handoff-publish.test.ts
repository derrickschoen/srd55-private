import { mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from '../../helpers/test-filesystem';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { publishCore } from '../../../tools/vtt-handoff/publish';

function root(): string {
  return mkdtempSync(join(tmpdir(), 'vtt-handoff-publish-'));
}

describe('immutable VTT core publication', () => {
  it('publishes schemas, declarations, real fixtures, manifest, and READY last', () => {
    const handoffRoot = root();
    const result = publishCore({ repositoryRoot: process.cwd(), handoffRoot });
    expect(result).toMatchObject({ status: 'published', files: 7 });
    const manifest = JSON.parse(readFileSync(join(handoffRoot, 'contracts/v1/manifest.json'), 'utf8')) as {
      readonly entries: readonly { readonly path: string; readonly sha256: string; readonly length: number }[];
    };
    expect(manifest.entries).toHaveLength(5);
    for (const entry of manifest.entries) {
      const bytes = readFileSync(join(handoffRoot, entry.path));
      expect(entry.sha256).toBe(createHash('sha256').update(bytes).digest('hex'));
      expect(entry.length).toBe(bytes.length);
      expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/u);
    }
    expect(JSON.parse(readFileSync(join(handoffRoot, 'contracts/v1/READY.json'), 'utf8'))).toEqual({ core: 'ready', examples: 'pending' });
    expect(statSync(join(handoffRoot, 'contracts/v1/READY.json')).mtimeMs).toBeGreaterThanOrEqual(statSync(join(handoffRoot, 'contracts/v1/manifest.json')).mtimeMs);
  });

  it('makes identical republication a no-op and detects all conflicts before writes', () => {
    const handoffRoot = root();
    publishCore({ repositoryRoot: process.cwd(), handoffRoot });
    const readyPath = join(handoffRoot, 'contracts/v1/READY.json');
    const before = statSync(readyPath).mtimeMs;
    expect(publishCore({ repositoryRoot: process.cwd(), handoffRoot }).status).toBe('unchanged');
    expect(statSync(readyPath).mtimeMs).toBe(before);
    writeFileSync(join(handoffRoot, 'contracts/v1/contracts.d.ts'), 'conflict\n');
    expect(() => publishCore({ repositoryRoot: process.cwd(), handoffRoot })).toThrow('IMMUTABLE_BUNDLE_CONFLICT');
    expect(statSync(readyPath).mtimeMs).toBe(before);
  });

  it('has a strictly read-only check mode', () => {
    const handoffRoot = root();
    expect(() => publishCore({ repositoryRoot: process.cwd(), handoffRoot, check: true })).toThrow('IMMUTABLE_BUNDLE_MISSING');
    publishCore({ repositoryRoot: process.cwd(), handoffRoot });
    expect(publishCore({ repositoryRoot: process.cwd(), handoffRoot, check: true }).status).toBe('verified');
    mkdirSync(join(handoffRoot, 'contracts/v1/manifest.entries'), { recursive: true });
  });
});
