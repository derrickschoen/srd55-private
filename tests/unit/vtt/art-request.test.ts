import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync,
} from '../../helpers/test-filesystem';
import { artRequestSchema } from '../../../src/vtt/handoff/v1/contracts';
import { ART_REQUEST_DEFINITIONS, writeArtRequests } from '../../../tools/vtt-handoff/art-request';
import { createUuidV7Generator } from '../../../tools/vtt-handoff/uuidv7';

function root(): string {
  return mkdtempSync(join(tmpdir(), 'vtt-art-request-'));
}

function generator() {
  let random = 0;
  return createUuidV7Generator({
    now: () => 1_725_984_123_456,
    randomBytes: (size) => new Uint8Array(size).fill(random++),
  });
}

describe('handoff art requests', () => {
  it('exclusively creates the nine schema-valid clean-room requests through partial rename', () => {
    const handoffRoot = root();
    const result = writeArtRequests({ handoffRoot, generator: generator(), nonce: () => 'fixed' });
    expect(result.status).toBe('created');
    expect(result.requestFiles).toHaveLength(9);
    expect(new Set(result.requestFiles).size).toBe(9);
    const requests = result.requestFiles.map((name) => artRequestSchema.parse(
      JSON.parse(readFileSync(join(handoffRoot, 'art/outbox', name), 'utf8')) as unknown,
    ));
    expect(requests.map((request) => request.assetId).sort())
      .toEqual(ART_REQUEST_DEFINITIONS.map((entry) => entry.assetId).sort());
    for (const request of requests) {
      expect(request.views).toEqual(['top-down', 'isometric']);
      expect(request.pixelsPerCell).toBe(128);
      expect(request.brief).toContain('ground-centre pivot at [width/2,height]');
      expect(request.brief).toContain('0, 90, 180 and 270 degree facings');
      expect(request.brief).not.toMatch(/copyright|franchise|studio|artist|product/u);
    }
    for (const id of ['barrel', 'table', 'pillar', 'torch', 'adventurer', 'goblin']) {
      expect(requests.find((request) => request.assetId === id)?.brief).toContain('Background must be transparent');
    }
    for (const id of ['tile', 'wall', 'door']) {
      expect(requests.find((request) => request.assetId === id)?.brief).toContain('Background may be opaque');
    }
    expect(readdirSync(join(handoffRoot, 'art/outbox')).some((name) => name.includes('.partial'))).toBe(false);
    expect(writeArtRequests({ handoffRoot, check: true })).toMatchObject({ status: 'verified', requestFiles: result.requestFiles });
  });

  it('refuses a final collision without changing existing bytes', () => {
    const handoffRoot = root();
    const firstId = generator().next();
    const outbox = join(handoffRoot, 'art/outbox');
    mkdirSync(outbox, { recursive: true });
    const destination = join(outbox, `${firstId}.request.json`);
    writeFileSync(destination, 'owner bytes\n');
    expect(() => writeArtRequests({ handoffRoot, generator: generator(), nonce: () => 'fixed' }))
      .toThrow('ART_REQUEST_COLLISION');
    expect(readFileSync(destination, 'utf8')).toBe('owner bytes\n');
    expect(existsSync(`${destination}.partial.fixed`)).toBe(false);
  });
});
