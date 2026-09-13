import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync,
} from '../../helpers/test-filesystem';
import { encodePng } from '../../../src/assets/png';
import type { ArtRequest, ArtResult } from '../../../src/vtt/handoff/v1/contracts';
import { listArtResults, validateArtResult, validateCompletedArtResults } from '../../../tools/vtt-handoff/art-validator';

const requestId = '018f47a2-7b3c-7abc-8def-0123456789ab';

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

interface Fixture {
  readonly root: string;
  readonly request: ArtRequest;
  readonly result: ArtResult;
  readonly resultPath: string;
  readonly bundle: string;
}

function fixture(assetId: 'tile.stone.floor' | 'prop.barrel' = 'tile.stone.floor', transparent = false): Fixture {
  const root = mkdtempSync(join(tmpdir(), 'vtt-art-validator-'));
  const outbox = join(root, 'art/outbox');
  const inbox = join(root, 'art/inbox');
  const bundle = join(inbox, requestId);
  mkdirSync(outbox, { recursive: true });
  mkdirSync(bundle, { recursive: true });
  const request: ArtRequest = {
    schemaVersion: 1, requestId, assetId, brief: 'clean-room fixture',
    views: ['top-down', 'isometric'], passes: ['albedo'], pixelsPerCell: 128,
    footprint: { w: 1, h: 1 },
  };
  writeFileSync(join(outbox, `${requestId}.request.json`), `${JSON.stringify(request)}\n`);
  const rgba = transparent ? Uint8Array.of(10, 20, 30, 0) : Uint8Array.of(10, 20, 30, 255);
  const png = Buffer.from(encodePng(1, 1, rgba));
  const files: { path: string; sha256: string }[] = [];
  const frames: ArtResult['assets'][number]['frames'][number][] = [];
  let frameIndex = 0;
  for (const view of ['top-down', 'isometric'] as const) {
    for (const facing of [0, 90, 180, 270]) {
      const path = `${requestId}__${assetId}-${view}-${String(facing)}.png`;
      writeFileSync(join(bundle, path), png);
      files.push({ path, sha256: sha256(png) });
      frames.push({ facing, frameIndex, view, width: 1, height: 1, pivotPx: [0.5, 1], albedo: path });
      frameIndex += 1;
    }
  }
  const source = `${requestId}__source.txt`;
  const sourceBytes = Buffer.from('original clean-room source\n');
  writeFileSync(join(bundle, source), sourceBytes);
  files.push({ path: source, sha256: sha256(sourceBytes) });
  const result: ArtResult = {
    schemaVersion: 1, requestId, status: 'complete',
    assets: [{ assetId, footprint: { w: 1, h: 1 }, heightCells: 1, pixelsPerCell: 128, frames }],
    provenance: { sourceFiles: [source], files, normalMapConvention: 'none', tool: 'clean-room test tool', notes: '' },
    errors: [],
  };
  const resultPath = `art/inbox/${requestId}.result.json`;
  writeFileSync(join(root, resultPath), `${JSON.stringify(result)}\n`);
  return { root, request, result, resultPath, bundle };
}

function rewriteResult(value: Fixture, result: ArtResult): void {
  writeFileSync(join(value.root, value.resultPath), `${JSON.stringify(result)}\n`);
}

describe('completed art result validation', () => {
  it('accepts a valid opaque floor and a valid transparent prop', () => {
    const opaque = fixture('tile.stone.floor', false);
    const validatedOpaque = validateArtResult({ handoffRoot: opaque.root, resultRelativePath: opaque.resultPath });
    expect(validatedOpaque.totalBytes).toBeGreaterThan(0);
    expect(validatedOpaque.files).toHaveLength(9);
    const transparent = fixture('prop.barrel', true);
    expect(validateArtResult({ handoffRoot: transparent.root, resultRelativePath: transparent.resultPath }).request.assetId)
      .toBe('prop.barrel');
  });

  it('keeps PNG validity separate from the per-id transparency rule', () => {
    const value = fixture('prop.barrel', false);
    expect(() => validateArtResult({ handoffRoot: value.root, resultRelativePath: value.resultPath }))
      .toThrow('ART_TRANSPARENCY_REQUIRED: prop.barrel');
  });

  it('rejects traversal, drive, UNC, absolute and symlinked provenance inputs', () => {
    for (const unsafe of ['../escape.png', 'C:/escape.png', '\\\\server\\share.png', '/escape.png']) {
      const value = fixture();
      const frame = value.result.assets[0]?.frames[0];
      if (frame === undefined) throw new Error('fixture frame missing');
      const original = frame.albedo;
      const result: ArtResult = {
        ...value.result,
        assets: [{
          ...value.result.assets[0]!,
          frames: [{ ...frame, albedo: unsafe }, ...value.result.assets[0]!.frames.slice(1)],
        }],
        provenance: {
          ...value.result.provenance,
          files: value.result.provenance.files.map((entry) => entry.path === original ? { ...entry, path: unsafe } : entry),
        },
      };
      rewriteResult(value, result);
      expect(() => validateArtResult({ handoffRoot: value.root, resultRelativePath: value.resultPath })).toThrow(/NON_RELATIVE_PATH|UNSAFE_RELATIVE_PATH/u);
    }

    const linked = fixture();
    const frame = linked.result.assets[0]?.frames[0];
    if (frame === undefined) throw new Error('fixture frame missing');
    const external = join(linked.root, 'external.png');
    writeFileSync(external, readFileSync(join(linked.bundle, frame.albedo)));
    const target = join(linked.bundle, frame.albedo);
    rmSync(target);
    symlinkSync(external, target);
    expect(() => validateArtResult({ handoffRoot: linked.root, resultRelativePath: linked.resultPath })).toThrow(/ELOOP|REGULAR_FILE_REQUIRED/u);
  });

  it('rejects forged hashes and duplicate provenance paths', () => {
    const forged = fixture();
    rewriteResult(forged, {
      ...forged.result,
      provenance: { ...forged.result.provenance, files: forged.result.provenance.files.map((entry, index) => index === 0 ? { ...entry, sha256: '0'.repeat(64) } : entry) },
    });
    expect(() => validateArtResult({ handoffRoot: forged.root, resultRelativePath: forged.resultPath })).toThrow('ART_PROVENANCE_HASH_MISMATCH');

    const duplicate = fixture();
    rewriteResult(duplicate, {
      ...duplicate.result,
      provenance: { ...duplicate.result.provenance, files: [...duplicate.result.provenance.files, duplicate.result.provenance.files[0]!] },
    });
    expect(() => validateArtResult({ handoffRoot: duplicate.root, resultRelativePath: duplicate.resultPath })).toThrow(/PROVENANCE_PATH_SET_MISMATCH|DUPLICATE_PROVENANCE_PATH/u);

    const duplicateSource = fixture();
    rewriteResult(duplicateSource, {
      ...duplicateSource.result,
      provenance: {
        ...duplicateSource.result.provenance,
        sourceFiles: [duplicateSource.result.provenance.sourceFiles[0]!, duplicateSource.result.provenance.sourceFiles[0]!],
      },
    });
    expect(() => validateArtResult({ handoffRoot: duplicateSource.root, resultRelativePath: duplicateSource.resultPath }))
      .toThrow('ART_DUPLICATE_SOURCE_PATH');
  });

  it('rejects result identity, view, facing and requested-pass failures', () => {
    const identity = fixture();
    rewriteResult(identity, { ...identity.result, requestId: '018f47a2-7b3c-7abc-8def-0123456789ac' });
    expect(() => validateArtResult({ handoffRoot: identity.root, resultRelativePath: identity.resultPath })).toThrow('ART_RESULT_FILENAME_MISMATCH');

    const view = fixture();
    const onlyTopDown = view.result.assets[0]!.frames.filter((frame) => frame.view === 'top-down');
    const retained = new Set(onlyTopDown.map((frame) => frame.albedo));
    const source = view.result.provenance.sourceFiles[0]!;
    rewriteResult(view, {
      ...view.result,
      assets: [{ ...view.result.assets[0]!, frames: onlyTopDown }],
      provenance: { ...view.result.provenance, files: view.result.provenance.files.filter((entry) => retained.has(entry.path) || entry.path === source) },
    });
    expect(() => validateArtResult({ handoffRoot: view.root, resultRelativePath: view.resultPath })).toThrow(/MISSING_REQUESTED_VIEW|FACING_SET_MISMATCH/u);

    const facing = fixture();
    const changedFrames = facing.result.assets[0]!.frames.map((frame, index) => index === 0 ? { ...frame, facing: 45 } : frame);
    rewriteResult(facing, { ...facing.result, assets: [{ ...facing.result.assets[0]!, frames: changedFrames }] });
    expect(() => validateArtResult({ handoffRoot: facing.root, resultRelativePath: facing.resultPath })).toThrow('ART_FACING_SET_MISMATCH');

    const pass = fixture();
    writeFileSync(join(pass.root, 'art/outbox', `${requestId}.request.json`), `${JSON.stringify({ ...pass.request, passes: ['albedo', 'normal'] })}\n`);
    expect(() => validateArtResult({ handoffRoot: pass.root, resultRelativePath: pass.resultPath })).toThrow('ART_SEMANTIC_MISSING_REQUESTED_PASS');
  });

  it('requires normal/emissive maps to align and ignores partial result files during scans', () => {
    const value = fixture();
    writeFileSync(join(value.root, 'art/inbox/hostile.result.json.partial'), 'not json');
    expect(validateCompletedArtResults({ handoffRoot: value.root })).toHaveLength(1);

    for (const passName of ['normal', 'emissive'] as const) {
      const misaligned = fixture();
      writeFileSync(join(misaligned.root, 'art/outbox', `${requestId}.request.json`), `${JSON.stringify({ ...misaligned.request, passes: ['albedo', passName] })}\n`);
      const extraFiles: { path: string; sha256: string }[] = [];
      const frames = misaligned.result.assets[0]!.frames.map((entry, index) => {
        const passPath = `${requestId}__${passName}-${String(index)}.png`;
        const png = index === 0
          ? Buffer.from(encodePng(2, 1, Uint8Array.of(0, 0, 255, 255, 0, 0, 255, 255)))
          : Buffer.from(encodePng(1, 1, Uint8Array.of(0, 0, 255, 255)));
        writeFileSync(join(misaligned.bundle, passPath), png);
        extraFiles.push({ path: passPath, sha256: sha256(png) });
        return { ...entry, [passName]: passPath };
      });
      rewriteResult(misaligned, {
        ...misaligned.result,
        assets: [{ ...misaligned.result.assets[0]!, frames }],
        provenance: { ...misaligned.result.provenance, files: [...misaligned.result.provenance.files, ...extraFiles] },
      });
      expect(() => validateArtResult({ handoffRoot: misaligned.root, resultRelativePath: misaligned.resultPath }))
        .toThrow('ART_PASS_DIMENSION_MISMATCH');
    }
  });

  it('enforces the literal owner-agreement manifest and UUID bundle layout', () => {
    const value = fixture();
    expect(value.resultPath).toBe(`art/inbox/${requestId}.result.json`);
    expect(value.bundle).toBe(join(value.root, 'art/inbox', requestId));

    const outside = fixture();
    const outsidePath = `outside/${requestId}.result.json`;
    mkdirSync(join(outside.root, 'outside'));
    writeFileSync(join(outside.root, outsidePath), readFileSync(join(outside.root, outside.resultPath)));
    expect(() => validateArtResult({ handoffRoot: outside.root, resultRelativePath: outsidePath }))
      .toThrow('ART_RESULT_LOCATION_INVALID');

    const crossing = fixture();
    const otherId = '018f47a2-7b3c-7abc-8def-0123456789ac';
    const frame = crossing.result.assets[0]!.frames[0]!;
    const escaped = `../${otherId}/${requestId}__escape.png`;
    rewriteResult(crossing, {
      ...crossing.result,
      assets: [{ ...crossing.result.assets[0]!, frames: [{ ...frame, albedo: escaped }, ...crossing.result.assets[0]!.frames.slice(1)] }],
      provenance: {
        ...crossing.result.provenance,
        files: crossing.result.provenance.files.map((entry) => entry.path === frame.albedo ? { ...entry, path: escaped } : entry),
      },
    });
    expect(() => validateArtResult({ handoffRoot: crossing.root, resultRelativePath: crossing.resultPath }))
      .toThrow('ART_SEMANTIC_NON_RELATIVE_PATH');
  });

  it('preserves composite frame uniqueness while allowing animation frames and reused indices', () => {
    const value = fixture();
    const baseFrames = value.result.assets[0]!.frames.map((frame) => ({ ...frame, frameIndex: 0 }));
    const extraFiles: { path: string; sha256: string }[] = [];
    const extraFrames = baseFrames.map((frame) => {
      const path = frame.albedo.replace('.png', '-animation-1.png');
      const bytes = readFileSync(join(value.bundle, frame.albedo));
      writeFileSync(join(value.bundle, path), bytes);
      extraFiles.push({ path, sha256: sha256(bytes) });
      return { ...frame, frameIndex: 1, albedo: path };
    });
    const accepted: ArtResult = {
      ...value.result,
      assets: [{ ...value.result.assets[0]!, frames: [...baseFrames, ...extraFrames] }],
      provenance: { ...value.result.provenance, files: [...value.result.provenance.files, ...extraFiles] },
    };
    rewriteResult(value, accepted);
    expect(validateArtResult({ handoffRoot: value.root, resultRelativePath: value.resultPath }).result.assets[0]?.frames)
      .toHaveLength(16);

    const rejected = fixture();
    const duplicate = rejected.result.assets[0]!.frames[0]!;
    rewriteResult(rejected, {
      ...rejected.result,
      assets: [{ ...rejected.result.assets[0]!, frames: [...rejected.result.assets[0]!.frames, duplicate] }],
    });
    expect(() => validateArtResult({ handoffRoot: rejected.root, resultRelativePath: rejected.resultPath }))
      .toThrow('ART_SEMANTIC_DUPLICATE_FRAME');
  });

  it('lists complete, partial and blocked manifests without labeling incomplete assets complete', () => {
    const complete = fixture();
    const partialResult = { ...complete.result, status: 'partial' as const, assets: [], provenance: { ...complete.result.provenance, sourceFiles: [], files: [] } };
    const blockedResult = { ...partialResult, status: 'blocked' as const };
    const partialId = '018f47a2-7b3c-7abc-8def-0123456789ac';
    const blockedId = '018f47a2-7b3c-7abc-8def-0123456789ad';
    for (const [id, result] of [[partialId, partialResult], [blockedId, blockedResult]] as const) {
      writeFileSync(join(complete.root, 'art/outbox', `${id}.request.json`), `${JSON.stringify({ ...complete.request, requestId: id })}\n`);
      writeFileSync(join(complete.root, 'art/inbox', `${id}.result.json`), `${JSON.stringify({ ...result, requestId: id })}\n`);
    }
    const listing = listArtResults({ handoffRoot: complete.root });
    expect(listing.map((entry) => ({ id: entry.requestId, status: entry.status, completed: entry.completedAsset }))).toEqual([
      { id: requestId, status: 'complete', completed: true },
      { id: partialId, status: 'partial', completed: false },
      { id: blockedId, status: 'blocked', completed: false },
    ]);
    expect(validateCompletedArtResults({ handoffRoot: complete.root })).toHaveLength(1);
  });
});
