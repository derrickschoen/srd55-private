import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { sha256 } from '../../../src/crypto/sha256';
import { generateRoom, type GeneratedRoom } from '../../../src/vtt/room-generator';
import {
  basisRepositoryRevision,
  finalizeHeldoutBasis,
  generateArenaBasis,
  generateHeldoutBasisRoom,
  heldoutBasisSchedule,
  parseBasisGenerationArgs,
  prepareHeldoutBasis,
  type HeldoutBasisBuildContext,
  type HeldoutBasisManifest,
  type HeldoutBasisRoomManifestRow,
  type HeldoutBasisVerificationConfig,
} from '../../../tools/generate-arena-basis';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from '../../helpers/test-filesystem';
import { declareTestInputs } from '../../helpers/test-inputs';

const inputs = declareTestInputs({
  fixtures: [
    'tests/fixtures/heldout-party/level-3.json',
    'tests/fixtures/heldout-party/level-4.json',
    'tests/fixtures/heldout-party/level-5.json',
    'tests/fixtures/heldout-party/level-6.json',
  ],
});

function copiedHeldoutParties(root: string): string {
  const path = join(root, 'parties');
  mkdirSync(path);
  const fixtures = {
    3: 'tests/fixtures/heldout-party/level-3.json',
    4: 'tests/fixtures/heldout-party/level-4.json',
    5: 'tests/fixtures/heldout-party/level-5.json',
    6: 'tests/fixtures/heldout-party/level-6.json',
  } as const;
  for (const level of [3, 4, 5, 6] as const) {
    writeFileSync(join(path, `level-${String(level)}.json`), inputs.fixtures.readText(fixtures[level]), {
      encoding: 'utf8', flag: level === 3 ? 'wx' : 'w',
    });
  }
  return path;
}

interface BasisVerificationControl {
  readonly manifest: HeldoutBasisManifest;
  readonly manifestBytes: string;
  readonly roomPath: string;
  readonly verifyConfig: HeldoutBasisVerificationConfig;
}

function writeReboundRoom(
  control: BasisVerificationControl,
  bytes: string,
): HeldoutBasisVerificationConfig {
  writeFileSync(control.roomPath, bytes, 'utf8');
  const rooms = control.manifest.rooms.map((row, index) =>
    index === 0 ? { ...row, sha256: sha256(bytes) } : row);
  const manifest = {
    ...control.manifest,
    rooms,
    aggregateSha256: sha256(canonicalJson({ parties: control.manifest.parties, rooms })),
  };
  const manifestBytes = `${canonicalJson(manifest)}\n`;
  writeFileSync(control.verifyConfig.manifestPath, manifestBytes, 'utf8');
  return { ...control.verifyConfig, manifestSha256: sha256(manifestBytes) };
}

function restoreBasisControl(control: BasisVerificationControl, originalRoomBytes: string): void {
  writeFileSync(control.roomPath, originalRoomBytes, 'utf8');
  writeFileSync(control.verifyConfig.manifestPath, control.manifestBytes, 'utf8');
}

describe.sequential('arena basis generator', () => {
  let buildContext: HeldoutBasisBuildContext | null = null;
  let basisControl: BasisVerificationControl | null = null;
  const generatedRooms: HeldoutBasisRoomManifestRow[] = [];

  function requiredBuildContext(): HeldoutBasisBuildContext {
    if (buildContext === null) throw new Error('Held-out basis build context is not prepared.');
    return buildContext;
  }

  function requiredBasisControl(): BasisVerificationControl {
    if (basisControl === null) throw new Error('Held-out basis control is not finalized.');
    return basisControl;
  }

  it('kills M576-E2-LEGACY-DEFAULT-CONSUMES-RNG and writes unchanged legacy rooms', async () => {
    const outPath = mkdtempSync(join(tmpdir(), 'dnd-hard-basis-generator-'));
    const config = parseBasisGenerationArgs([
      '--difficulty', 'hard',
      '--seed', '5117001',
      '--rooms', '2',
      '--out', outPath,
    ]);

    expect(config).toEqual({
      difficulty: 'hard',
      seed: 5_117_001,
      rooms: 2,
      outPath,
    });
    expect(Object.hasOwn(config, 'terrainProfile')).toBe(false);
    await generateArenaBasis(config);

    for (const seed of [5_117_001, 5_117_002]) {
      expect(readFileSync(join(outPath, `seed-${String(seed)}.json`), 'utf8')).toBe(
        `${canonicalJson(generateRoom(seed, { difficulty: 'hard' }))}\n`,
      );
    }
  });

  it('parses los_cover_v1 only when explicit and writes the versioned profile', async () => {
    const outPath = mkdtempSync(join(tmpdir(), 'dnd-los-cover-basis-generator-'));
    const config = parseBasisGenerationArgs([
      '--difficulty', 'standard',
      '--terrain-profile', 'los_cover_v1',
      '--seed', '5762001',
      '--rooms', '1',
      '--out', outPath,
    ]);
    expect(config).toEqual({
      difficulty: 'standard',
      terrainProfile: 'los_cover_v1',
      seed: 5_762_001,
      rooms: 1,
      outPath,
    });
    await generateArenaBasis(config);
    expect(readFileSync(join(outPath, 'seed-5762001.json'), 'utf8')).toBe(
      `${canonicalJson(generateRoom(5_762_001, {
        difficulty: 'standard',
        terrainProfile: 'los_cover_v1',
      }))}\n`,
    );
  });

  it('rejects unknown terrain profiles', () => {
    expect(() => parseBasisGenerationArgs([
      '--difficulty', 'hard',
      '--terrain-profile', 'latest',
      '--seed', '5762101',
      '--rooms', '1',
      '--out', tmpdir(),
    ])).toThrow('--terrain-profile must be los_cover_v1.');
  });

  it('rejects unknown difficulty profiles before writing', () => {
    expect(() => parseBasisGenerationArgs([
      '--difficulty', 'nightmare',
      '--seed', '5117001',
      '--rooms', '12',
      '--out', tmpdir(),
    ])).toThrow('--difficulty must be standard, hard, or brutal.');
  });

  it('accepts the brutal difficulty profile', () => {
    const outPath = mkdtempSync(join(tmpdir(), 'dnd-brutal-basis-generator-'));
    expect(parseBasisGenerationArgs([
      '--difficulty', 'brutal',
      '--seed', '6203001',
      '--rooms', '3',
      '--out', outPath,
    ])).toEqual({ difficulty: 'brutal', seed: 6_203_001, rooms: 3, outPath });
  });

  it('binds the 24-room tuning-exposed protocol to a balanced level/terrain schedule', () => {
    const root = mkdtempSync(join(tmpdir(), 'dnd-heldout-development-basis-'));
    const partyPackPath = copiedHeldoutParties(root);
    const outPath = join(root, 'rooms');
    const manifestPath = join(root, 'manifest.json');
    const config = parseBasisGenerationArgs([
      '--protocol', 'heldout-development-v1',
      '--rooms', '24',
      '--seed', '7850001',
      '--party-pack-dir', partyPackPath,
      '--out', outPath,
      '--manifest', manifestPath,
    ]);
    expect(config).toEqual({
      protocol: 'heldout-development-v1',
      rooms: 24,
      seed: 7_850_001,
      partyPackPath,
      outPath,
      manifestPath,
    });
    const schedule = Array.from({ length: 24 }, (_unused, ordinal) =>
      heldoutBasisSchedule('heldout-development-v1', ordinal));
    for (const level of [3, 4, 5, 6] as const) {
      const rooms = schedule.filter((room) => room.level === level);
      expect(rooms).toHaveLength(6);
      expect(rooms.filter((room) => room.terrainProfile === 'los_cover_v1')).toHaveLength(3);
      expect(rooms.filter((room) => room.terrainProfile === null)).toHaveLength(3);
      expect(rooms.every((room) => room.partition === 'development')).toBe(true);
    }
  });

  it('prepares the complete development basis within the ordinary test budget', async () => {
    const root = mkdtempSync(join(tmpdir(), 'dnd-heldout-basis-mutation-'));
    buildContext = await prepareHeldoutBasis({
      protocol: 'heldout-development-v1',
      rooms: 24,
      seed: 7_850_001,
      partyPackPath: copiedHeldoutParties(root),
      outPath: join(root, 'basis'),
      manifestPath: join(root, 'manifest.json'),
    });
    expect(buildContext.parties.size).toBe(4);
  });

  it.each(Array.from({ length: 24 }, (_unused, ordinal) => ordinal))(
    'generates development room ordinal %i within its ordinary test budget',
    async (ordinal) => {
      const context = requiredBuildContext();
      const row = await generateHeldoutBasisRoom(context, ordinal);
      generatedRooms.push(row);
      const bytes = readFileSync(join(context.config.outPath, row.path), 'utf8');
      expect(row).toMatchObject({ ordinal, seed: 7_850_001 + ordinal });
      expect(sha256(bytes)).toBe(row.sha256);
    },
  );

  it('successfully finalizes and verifies the generated basis using its frozen revision', async () => {
    const context = requiredBuildContext();
    const generated = await finalizeHeldoutBasis(context, generatedRooms);
    expect(generated.repoRevision).toBe(basisRepositoryRevision());
    const frozenRevision = generated.repoRevision === '1111111111111111111111111111111111111111'
      ? '2222222222222222222222222222222222222222'
      : '1111111111111111111111111111111111111111';
    const manifest = { ...generated, repoRevision: frozenRevision };
    const manifestBytes = `${canonicalJson(manifest)}\n`;
    writeFileSync(context.config.manifestPath, manifestBytes, 'utf8');
    basisControl = {
      manifest,
      manifestBytes,
      roomPath: join(context.config.outPath, 'seed-7850001.json'),
      verifyConfig: {
        verifyOnly: true,
        protocol: 'heldout-development-v1',
        basisPath: context.config.outPath,
        manifestPath: context.config.manifestPath,
        manifestSha256: sha256(manifestBytes),
        expectRooms: 24,
      },
    };
    const control = requiredBasisControl();
    await expect(generateArenaBasis(control.verifyConfig)).resolves.toMatchObject({
      repoRevision: control.manifest.repoRevision,
      roomCount: 24,
    });
  });

  it('detects a plausible mutation of a valid room and verifies its byte restoration', async () => {
    const control = requiredBasisControl();
    const originalBytes = readFileSync(control.roomPath, 'utf8');
    const originalSha256 = sha256(originalBytes);
    const room = JSON.parse(originalBytes) as GeneratedRoom;
    let changedMonster = false;
    const mutatedRoom = {
      ...room,
      encounter: {
        ...room.encounter,
        state: {
          ...room.encounter.state,
          combatants: room.encounter.state.combatants.map((subject) => {
            if (changedMonster || subject.profile.kind !== 'monster') return subject;
            changedMonster = true;
            return {
              ...subject,
              hitPoints: subject.hitPoints + 1,
              profile: {
                ...subject.profile,
                rules: {
                  ...subject.profile.rules,
                  hitPointMaximum: subject.profile.rules.hitPointMaximum + 1,
                },
              },
            };
          }),
        },
      },
    };
    if (!changedMonster) throw new Error('Valid mutation room lacks a monster.');
    const mutatedBytes = `${canonicalJson(mutatedRoom)}\n`;
    const mutatedSha256 = sha256(mutatedBytes);
    writeFileSync(control.roomPath, mutatedBytes, 'utf8');
    process.stdout.write(`${canonicalJson({
      control: 'heldout-room-mutation-applied', originalSha256, mutatedSha256,
    })}\n`);
    expect(mutatedSha256).not.toBe(originalSha256);
    await expect(generateArenaBasis(control.verifyConfig)).rejects.toThrow(
      'Held-out room 7850001 SHA-256 mismatch.',
    );

    const reboundConfig = writeReboundRoom(control, mutatedBytes);
    await expect(generateArenaBasis(reboundConfig)).rejects.toThrow(
      'monster profiles do not match its declared roster.',
    );

    restoreBasisControl(control, originalBytes);
    const restoredSha256 = sha256(readFileSync(control.roomPath, 'utf8'));
    process.stdout.write(`${canonicalJson({
      control: 'heldout-room-mutation-restored', originalSha256, restoredSha256,
    })}\n`);
    expect(restoredSha256).toBe(originalSha256);
    await expect(generateArenaBasis(control.verifyConfig)).resolves.toMatchObject({ roomCount: 24 });
  });

  it('rejects re-pinned room bytes whose player profile differs from the pinned party', async () => {
    const control = requiredBasisControl();
    const originalBytes = readFileSync(control.roomPath, 'utf8');
    const room = JSON.parse(originalBytes) as GeneratedRoom;
    let changedPlayer = false;
    const mutatedRoom = {
      ...room,
      encounter: {
        ...room.encounter,
        state: {
          ...room.encounter.state,
          combatants: room.encounter.state.combatants.map((subject) => {
            if (changedPlayer || subject.profile.kind !== 'player_character') return subject;
            changedPlayer = true;
            return { ...subject, profile: { ...subject.profile, name: `${subject.profile.name} altered` } };
          }),
        },
      },
    };
    if (!changedPlayer) throw new Error('Valid identity-control room lacks a player.');
    const verifyConfig = writeReboundRoom(control, `${canonicalJson(mutatedRoom)}\n`);
    await expect(generateArenaBasis(verifyConfig)).rejects.toThrow(
      'player profiles do not match its pinned party.',
    );
    restoreBasisControl(control, originalBytes);
  });

  it('rejects re-pinned room bytes whose declared monster roster loses sourced XP', async () => {
    const control = requiredBasisControl();
    const originalBytes = readFileSync(control.roomPath, 'utf8');
    const room = JSON.parse(originalBytes) as GeneratedRoom;
    if (room.spec.monsterRoster.length < 2) {
      throw new Error('Valid roster-control room needs at least two monsters.');
    }
    const mutatedRoom = {
      ...room,
      spec: { ...room.spec, monsterRoster: room.spec.monsterRoster.slice(0, -1) },
    };
    const verifyConfig = writeReboundRoom(control, `${canonicalJson(mutatedRoom)}\n`);
    await expect(generateArenaBasis(verifyConfig)).rejects.toThrow('roster selection or XP mismatch.');
    restoreBasisControl(control, originalBytes);
  });

  it('fully decodes nested manifest provenance instead of accepting a shallow cast', async () => {
    const control = requiredBasisControl();
    const malformedManifest = {
      ...control.manifest,
      rooms: control.manifest.rooms.map((row, index) => index === 0 ? {
        ...row,
        roster: { ...row.roster, rng: { ...row.roster.rng, algorithm: 'not-an-rng' } },
      } : row),
    };
    const malformedBytes = `${canonicalJson(malformedManifest)}\n`;
    writeFileSync(control.verifyConfig.manifestPath, malformedBytes, 'utf8');
    await expect(generateArenaBasis({
      ...control.verifyConfig,
      manifestSha256: sha256(malformedBytes),
    })).rejects.toThrow('rng.algorithm must be mulberry32');
    writeFileSync(control.verifyConfig.manifestPath, control.manifestBytes, 'utf8');
  });
});
