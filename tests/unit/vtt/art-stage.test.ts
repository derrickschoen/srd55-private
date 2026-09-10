import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, renameSync, rmSync, symlinkSync,
  truncateSync, writeFileSync,
} from '../../helpers/test-filesystem';
import { encodePng } from '../../../src/assets/png';
import type { ArtRequest, ArtResult } from '../../../src/vtt/handoff/v1/contracts';
import { checkArtStage, stageArtResult } from '../../../tools/vtt-handoff/art-stage';

const requestId = '018f47a2-7b3c-7abc-8def-0123456789ab';

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

interface Fixture {
  readonly root: string;
  readonly requestPath: string;
  readonly resultPath: string;
  readonly resultAbsolute: string;
  readonly bundle: string;
  readonly source: string;
  readonly firstImage: string;
}

function fixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), 'vtt-art-stage-'));
  const outbox = join(root, 'art/outbox');
  const inbox = join(root, 'art/inbox');
  const bundle = join(inbox, requestId);
  mkdirSync(outbox, { recursive: true });
  mkdirSync(bundle, { recursive: true });
  const request: ArtRequest = {
    schemaVersion: 1, requestId, assetId: 'tile.stone.floor', brief: 'clean-room fixture',
    views: ['top-down', 'isometric'], passes: ['albedo'], pixelsPerCell: 128,
    footprint: { w: 1, h: 1 },
  };
  const requestPath = join(outbox, `${requestId}.request.json`);
  writeFileSync(requestPath, `${JSON.stringify(request)}\n`);
  const png = Buffer.from(encodePng(1, 1, Uint8Array.of(1, 2, 3, 255)));
  const files: { path: string; sha256: string }[] = [];
  const frames: ArtResult['assets'][number]['frames'][number][] = [];
  let frameIndex = 0;
  for (const view of ['top-down', 'isometric'] as const) {
    for (const facing of [0, 90, 180, 270]) {
      const path = `${requestId}__tile-${view}-${String(facing)}.png`;
      writeFileSync(join(bundle, path), png);
      files.push({ path, sha256: sha256(png) });
      frames.push({ facing, frameIndex, view, width: 1, height: 1, pivotPx: [0.5, 1], albedo: path });
      frameIndex += 1;
    }
  }
  const source = `${requestId}__source.txt`;
  const sourceBytes = Buffer.from('source bytes\n');
  writeFileSync(join(bundle, source), sourceBytes);
  files.push({ path: source, sha256: sha256(sourceBytes) });
  const result: ArtResult = {
    schemaVersion: 1, requestId, status: 'complete',
    assets: [{ assetId: 'tile.stone.floor', footprint: { w: 1, h: 1 }, heightCells: 1, pixelsPerCell: 128, frames }],
    provenance: { sourceFiles: [source], files, normalMapConvention: 'none', tool: 'clean-room test tool', notes: '' },
    errors: [],
  };
  const resultPath = `art/inbox/${requestId}.result.json`;
  const resultAbsolute = join(root, resultPath);
  writeFileSync(resultAbsolute, `${JSON.stringify(result)}\n`);
  return { root, requestPath, resultPath, resultAbsolute, bundle, source, firstImage: frames[0]!.albedo };
}

function manifestPath(root: string): string {
  return join(root, 'art/review', requestId, 'review-manifest.json');
}

describe('descriptor-anchored art staging', () => {
  it('copies through partial files, revalidates, and writes the review manifest strictly last', () => {
    const value = fixture();
    let observedLast = false;
    const staged = stageArtResult({
      handoffRoot: value.root, resultRelativePath: value.resultPath, nonce: () => 'fixed',
      hooks: {
        beforeManifest: () => {
          const directory = join(value.root, 'art/review', requestId);
          expect(existsSync(join(directory, 'request.json'))).toBe(true);
          expect(existsSync(join(directory, 'result.json'))).toBe(true);
          expect(existsSync(join(directory, 'files', value.firstImage))).toBe(true);
          expect(existsSync(manifestPath(value.root))).toBe(false);
          observedLast = true;
        },
      },
    });
    expect(observedLast).toBe(true);
    expect(staged).toMatchObject({ requestId, files: 9, manifest: `art/review/${requestId}/review-manifest.json` });
    const manifest = JSON.parse(readFileSync(manifestPath(value.root), 'utf8')) as { readonly files: readonly { readonly path: string; readonly sha256: string }[] };
    expect(manifest.files).toHaveLength(9);
    expect(manifest.files.find((entry) => entry.path === value.firstImage)?.sha256)
      .toBe(sha256(readFileSync(join(value.bundle, value.firstImage))));
    expect(checkArtStage({ handoffRoot: value.root })).toEqual({ status: 'verified', completedResults: 1, completedReviews: 1 });
  });

  it('rejects changed or stale request/result manifests and publishes no completion', () => {
    for (const target of ['request', 'result'] as const) {
      const value = fixture();
      expect(() => stageArtResult({
        handoffRoot: value.root, resultRelativePath: value.resultPath, nonce: () => 'fixed',
        hooks: {
          afterInitialValidation: () => {
            const path = target === 'request' ? value.requestPath : value.resultAbsolute;
            writeFileSync(path, `${readFileSync(path, 'utf8').trim()}  \n`);
          },
        },
      })).toThrow(/STAGE_SOURCE_CHANGED|ART_/u);
      expect(existsSync(manifestPath(value.root))).toBe(false);
    }
  });

  it('rejects a changed provenance source and a same-byte inode swap', () => {
    const changed = fixture();
    expect(() => stageArtResult({
      handoffRoot: changed.root, resultRelativePath: changed.resultPath, nonce: () => 'fixed',
      hooks: { afterCopy: (path) => { if (path === changed.source) writeFileSync(join(changed.bundle, path), 'changed\n'); } },
    })).toThrow('ART_PROVENANCE_HASH_MISMATCH');
    expect(existsSync(manifestPath(changed.root))).toBe(false);

    const swapped = fixture();
    const image = join(swapped.bundle, swapped.firstImage);
    const identical = readFileSync(image);
    expect(() => stageArtResult({
      handoffRoot: swapped.root, resultRelativePath: swapped.resultPath, nonce: () => 'fixed',
      hooks: {
        beforeFinalValidation: () => {
          const replacement = `${image}.replacement`;
          writeFileSync(replacement, identical);
          renameSync(replacement, image);
        },
      },
    })).toThrow('STAGE_SOURCE_CHANGED');
    expect(existsSync(manifestPath(swapped.root))).toBe(false);
  });

  it('refuses final-file and parent-directory symlink swaps without following outside content', () => {
    const finalSwap = fixture();
    const outside = join(finalSwap.root, 'outside.png');
    writeFileSync(outside, readFileSync(join(finalSwap.bundle, finalSwap.firstImage)));
    expect(() => stageArtResult({
      handoffRoot: finalSwap.root, resultRelativePath: finalSwap.resultPath, nonce: () => 'fixed',
      hooks: {
        beforeFinalValidation: () => {
          const image = join(finalSwap.bundle, finalSwap.firstImage);
          rmSync(image);
          symlinkSync(outside, image);
        },
      },
    })).toThrow(/ELOOP|REGULAR_FILE_REQUIRED/u);
    expect(existsSync(manifestPath(finalSwap.root))).toBe(false);

    const parentSwap = fixture();
    const held = `${parentSwap.bundle}.held`;
    const outsideDirectory = join(parentSwap.root, 'outside-directory');
    mkdirSync(outsideDirectory);
    expect(() => stageArtResult({
      handoffRoot: parentSwap.root, resultRelativePath: parentSwap.resultPath, nonce: () => 'fixed',
      hooks: {
        beforeFinalValidation: () => {
          renameSync(parentSwap.bundle, held);
          symlinkSync(outsideDirectory, parentSwap.bundle, 'dir');
        },
      },
    })).toThrow(/ELOOP|ENOTDIR/u);
    expect(readFileSync(join(held, requestId + '__source.txt'), 'utf8')).toBe('source bytes\n');
    expect(existsSync(manifestPath(parentSwap.root))).toBe(false);
  });

  it('rejects an oversized sparse source before reading and a destination collision without overwrite', () => {
    const oversized = fixture();
    truncateSync(join(oversized.bundle, oversized.source), 64 * 1024 * 1024 + 1);
    expect(() => stageArtResult({ handoffRoot: oversized.root, resultRelativePath: oversized.resultPath }))
      .toThrow('FILE_SIZE_LIMIT');
    expect(existsSync(manifestPath(oversized.root))).toBe(false);

    const collision = fixture();
    const review = join(collision.root, 'art/review', requestId);
    mkdirSync(review, { recursive: true });
    writeFileSync(join(review, 'owner.txt'), 'owner bytes\n');
    expect(() => stageArtResult({ handoffRoot: collision.root, resultRelativePath: collision.resultPath }))
      .toThrow('DESTINATION_COLLISION');
    expect(readFileSync(join(review, 'owner.txt'), 'utf8')).toBe('owner bytes\n');
  });

  it('detects post-copy destination tampering before manifest publication', () => {
    const value = fixture();
    expect(() => stageArtResult({
      handoffRoot: value.root, resultRelativePath: value.resultPath, nonce: () => 'fixed',
      hooks: {
        afterCopy: (path) => {
          if (path === value.firstImage) writeFileSync(join(value.root, 'art/review', requestId, 'files', path), 'tampered\n');
        },
      },
    })).toThrow('STAGE_POSTCOPY_MISMATCH');
    expect(existsSync(manifestPath(value.root))).toBe(false);
  });

  it('atomically promotes staged files without an empty completion or overwrite window', () => {
    const interrupted = fixture();
    expect(() => stageArtResult({
      handoffRoot: interrupted.root, resultRelativePath: interrupted.resultPath, nonce: () => 'fixed',
      hooks: { beforePromotion: () => { throw new Error('SIMULATED_INTERRUPTION'); } },
    })).toThrow('SIMULATED_INTERRUPTION');
    expect(existsSync(join(interrupted.root, 'art/review', requestId, 'request.json'))).toBe(false);
    expect(existsSync(manifestPath(interrupted.root))).toBe(false);

    const substituted = fixture();
    const completion = manifestPath(substituted.root);
    expect(() => stageArtResult({
      handoffRoot: substituted.root, resultRelativePath: substituted.resultPath, nonce: () => 'fixed',
      hooks: {
        beforePromotion: (path) => {
          if (path.endsWith('/review-manifest.json')) writeFileSync(completion, 'substituted bytes\n');
        },
      },
    })).toThrow('DESTINATION_COLLISION');
    expect(readFileSync(completion, 'utf8')).toBe('substituted bytes\n');
  });

  it('verifies copied request/result bytes and rejects forged or incomplete review manifests', () => {
    for (const target of ['request.json', 'result.json'] as const) {
      const value = fixture();
      expect(() => stageArtResult({
        handoffRoot: value.root, resultRelativePath: value.resultPath, nonce: () => 'fixed',
        hooks: {
          beforeManifest: () => writeFileSync(join(value.root, 'art/review', requestId, target), 'tampered\n'),
        },
      })).toThrow(target === 'request.json' ? 'STAGE_REQUEST_COPY_MISMATCH' : 'STAGE_RESULT_COPY_MISMATCH');
      expect(existsSync(manifestPath(value.root))).toBe(false);
    }

    const forged = fixture();
    stageArtResult({ handoffRoot: forged.root, resultRelativePath: forged.resultPath, nonce: () => 'fixed' });
    writeFileSync(manifestPath(forged.root), 'null\n');
    expect(() => checkArtStage({ handoffRoot: forged.root })).toThrow('REVIEW_MANIFEST_INVALID');

    const missing = fixture();
    stageArtResult({ handoffRoot: missing.root, resultRelativePath: missing.resultPath, nonce: () => 'fixed' });
    rmSync(join(missing.root, 'art/review', requestId, 'files', missing.firstImage));
    expect(() => checkArtStage({ handoffRoot: missing.root })).toThrow(/ENOENT/u);

    const hash = fixture();
    stageArtResult({ handoffRoot: hash.root, resultRelativePath: hash.resultPath, nonce: () => 'fixed' });
    const manifest = JSON.parse(readFileSync(manifestPath(hash.root), 'utf8')) as { files: { path: string; sha256: string; size: number }[] };
    manifest.files[0] = { ...manifest.files[0]!, sha256: '0'.repeat(64) };
    writeFileSync(manifestPath(hash.root), `${JSON.stringify(manifest)}\n`);
    expect(() => checkArtStage({ handoffRoot: hash.root })).toThrow('REVIEW_FILE_IDENTITY_MISMATCH');
  });

  it('rejects an unwritten FIFO promptly before any read', () => {
    const value = fixture();
    const fifo = join(value.bundle, value.source);
    rmSync(fifo);
    expect(spawnSync('mkfifo', [fifo]).status).toBe(0);
    const started = performance.now();
    expect(() => stageArtResult({ handoffRoot: value.root, resultRelativePath: value.resultPath }))
      .toThrow('REGULAR_FILE_REQUIRED');
    expect(performance.now() - started).toBeLessThan(1_000);
    expect(existsSync(manifestPath(value.root))).toBe(false);
  });

  it('survives a parent swap after descriptor retention while ordinary traversal reads outside', () => {
    const value = fixture();
    const held = `${value.bundle}.held`;
    const outside = join(value.root, 'outside-bundle');
    mkdirSync(outside);
    writeFileSync(join(outside, value.firstImage), 'outside bytes\n');
    let swapped = false;
    let outsideReads = 0;
    expect(() => stageArtResult({
      handoffRoot: value.root, resultRelativePath: value.resultPath, nonce: () => 'fixed',
      hooks: {
        safeFileHooks: {
          beforeChildOpen: (parent, child) => {
            if (!swapped && parent === `art/inbox/${requestId}` && child === value.firstImage) {
              swapped = true;
              renameSync(value.bundle, held);
              symlinkSync(outside, value.bundle, 'dir');
            }
          },
          onFileRead: (path) => { if (path.startsWith(outside)) outsideReads += 1; },
        },
      },
    })).toThrow('ANCHORED_FILE_MISMATCH');
    expect(outsideReads).toBe(0);
    expect(existsSync(manifestPath(value.root))).toBe(false);

    const retainedParent = openSync(join(value.root, 'art/inbox'), 'r');
    try {
      const ordinary = readFileSync(join(value.bundle, value.firstImage), 'utf8');
      if (ordinary === 'outside bytes\n') outsideReads += 1;
    } finally {
      closeSync(retainedParent);
    }
    expect(outsideReads).toBe(1);
  });
});
