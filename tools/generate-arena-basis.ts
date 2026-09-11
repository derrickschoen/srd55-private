import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { EXPECTED_BUNDLED_CONTENT_DIGEST_V1 } from '../src/catalog/bundled-content-digest-v1.expected';
import { monsterCombatantProfile } from '../src/combat/combatant';
import { STARTER_MONSTER_ROSTER } from '../src/combat/statblocks/roster';
import { canonicalJson } from '../src/commands/canonical-json';
import { sha256 } from '../src/crypto/sha256';
import type { HeldoutPartyLevel, HeldoutPartition } from '../src/vtt/heldout-evaluation';
import { loadExternalPartyPackBytes } from '../src/vtt/party-pack';
import { decodeArenaBasisEnvelopeV1 } from '../src/vtt/arena-fixture';
import {
  HELDOUT_ORDINARY_PROTOCOLS,
  HELDOUT_STARTER_MONSTER_FAMILIES,
  ROOM_DIFFICULTY_PROFILES,
  ROOM_TERRAIN_PROFILES,
  generateRoom,
  heldoutMaximizingMonsterRosters,
  type HeldoutOrdinaryProtocol,
  type HeldoutTargetXp,
  type RoomDifficultyProfile,
  type RoomTerrainProfile,
} from '../src/vtt/room-generator';
import { HELDOUT_PARTY_RECIPE_ID, HELDOUT_PARTY_RECIPES } from './generate-heldout-party-basis';

export interface LegacyBasisGenerationConfig {
  readonly difficulty: RoomDifficultyProfile;
  readonly seed: number;
  readonly rooms: number;
  readonly outPath: string;
  readonly terrainProfile?: RoomTerrainProfile;
}

export interface HeldoutBasisGenerationConfig {
  readonly protocol: HeldoutOrdinaryProtocol;
  readonly seed: number;
  readonly rooms: number;
  readonly partyPackPath: string;
  readonly outPath: string;
  readonly manifestPath: string;
}

export interface HeldoutBasisVerificationConfig {
  readonly verifyOnly: true;
  readonly protocol: HeldoutOrdinaryProtocol;
  readonly basisPath: string;
  readonly manifestPath: string;
  readonly manifestSha256: string;
  readonly expectRooms: number;
}

export type BasisGenerationConfig = LegacyBasisGenerationConfig |
  HeldoutBasisGenerationConfig | HeldoutBasisVerificationConfig;

export interface HeldoutBasisPartyManifestRow {
  readonly level: HeldoutPartyLevel;
  readonly path: string;
  readonly sha256: string;
  readonly memberSha256: readonly string[];
}

export interface HeldoutBasisRoomManifestRow {
  readonly ordinal: number;
  readonly partition: HeldoutPartition;
  readonly seed: number;
  readonly partyLevel: HeldoutPartyLevel;
  readonly targetXp: HeldoutTargetXp;
  readonly terrainProfile: RoomTerrainProfile | null;
  readonly partySha256: string;
  readonly path: string;
  readonly sha256: string;
  readonly roster: NonNullable<ReturnType<typeof generateRoom>['spec']['heldoutOrdinary']>;
}

export interface HeldoutBasisManifest {
  readonly format: 'heldout-basis-manifest-v1';
  readonly protocol: HeldoutOrdinaryProtocol;
  readonly generator: 'ordinary-solo-plus-three-v1';
  readonly repoRevision: string;
  readonly bundledContentSha256: typeof EXPECTED_BUNDLED_CONTENT_DIGEST_V1;
  readonly partyRecipeId: typeof HELDOUT_PARTY_RECIPE_ID;
  readonly partyRecipeSha256: string;
  readonly seed: number;
  readonly roomCount: number;
  readonly parties: readonly HeldoutBasisPartyManifestRow[];
  readonly rooms: readonly HeldoutBasisRoomManifestRow[];
  readonly aggregateSha256: string;
}

function requiredValue(argv: readonly string[], index: number, option: string): string {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) throw new TypeError(`${option} requires a value.`);
  return value;
}

function safeInteger(value: string, option: string, minimum: number): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new TypeError(`${option} must be a safe integer greater than or equal to ${String(minimum)}.`);
  }
  return parsed;
}

function parseOptions(argv: readonly string[]): {
  readonly flags: ReadonlySet<string>;
  readonly values: ReadonlyMap<string, string>;
} {
  const args = argv[0] === '--' ? argv.slice(1) : argv;
  const flags = new Set<string>();
  const values = new Map<string, string>();
  const knownFlags = new Set(['--verify-only']);
  const knownValues = new Set([
    '--difficulty', '--seed', '--rooms', '--out', '--terrain-profile', '--protocol',
    '--party-pack-dir', '--manifest', '--basis-dir', '--basis-manifest',
    '--manifest-sha256', '--expect-rooms',
  ]);
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (option === undefined) throw new TypeError('Basis-generator option is missing.');
    if (knownFlags.has(option)) {
      flags.add(option);
      continue;
    }
    if (!knownValues.has(option)) throw new TypeError(`Unknown basis-generator option ${option}.`);
    values.set(option, requiredValue(args, index, option));
    index += 1;
  }
  return { flags, values };
}

function heldoutProtocol(value: string | undefined): HeldoutOrdinaryProtocol | null {
  return HELDOUT_ORDINARY_PROTOCOLS.includes(value as HeldoutOrdinaryProtocol)
    ? value as HeldoutOrdinaryProtocol
    : null;
}

function rejectUnexpectedOptions(
  parsed: ReturnType<typeof parseOptions>,
  allowedValues: ReadonlySet<string>,
  allowedFlags: ReadonlySet<string>,
): void {
  const unexpected = [
    ...[...parsed.values.keys()].filter((option) => !allowedValues.has(option)),
    ...[...parsed.flags].filter((option) => !allowedFlags.has(option)),
  ];
  if (unexpected.length > 0) {
    throw new TypeError(`Options are not valid for this basis mode: ${unexpected.join(', ')}.`);
  }
}

export function parseBasisGenerationArgs(argv: readonly string[]): BasisGenerationConfig {
  const parsed = parseOptions(argv);
  const protocol = heldoutProtocol(parsed.values.get('--protocol'));
  if (parsed.flags.has('--verify-only')) {
    rejectUnexpectedOptions(parsed, new Set([
      '--protocol', '--basis-dir', '--basis-manifest', '--manifest-sha256', '--expect-rooms',
    ]), new Set(['--verify-only']));
    if (protocol === null) {
      throw new TypeError('--protocol must be heldout-ordinary-v1 or heldout-development-v1.');
    }
    const basisPath = parsed.values.get('--basis-dir');
    const manifestPath = parsed.values.get('--basis-manifest');
    const manifestSha256 = parsed.values.get('--manifest-sha256');
    if (basisPath === undefined || manifestPath === undefined || manifestSha256 === undefined) {
      throw new TypeError('--verify-only requires --basis-dir, --basis-manifest, and --manifest-sha256.');
    }
    return {
      verifyOnly: true,
      protocol,
      basisPath: resolve(basisPath),
      manifestPath: resolve(manifestPath),
      manifestSha256,
      expectRooms: safeInteger(parsed.values.get('--expect-rooms') ?? '', '--expect-rooms', 1),
    };
  }
  if (protocol !== null) {
    rejectUnexpectedOptions(parsed, new Set([
      '--protocol', '--seed', '--rooms', '--party-pack-dir', '--out', '--manifest',
    ]), new Set());
    const out = parsed.values.get('--out');
    const partyPackPath = parsed.values.get('--party-pack-dir');
    const manifestPath = parsed.values.get('--manifest');
    if (out === undefined || partyPackPath === undefined || manifestPath === undefined) {
      throw new TypeError('Held-out generation requires --out, --party-pack-dir, and --manifest.');
    }
    return {
      protocol,
      seed: safeInteger(parsed.values.get('--seed') ?? '', '--seed', 0),
      rooms: safeInteger(parsed.values.get('--rooms') ?? '', '--rooms', 1),
      partyPackPath: resolve(partyPackPath),
      outPath: resolve(out),
      manifestPath: resolve(manifestPath),
    };
  }
  if (parsed.values.has('--protocol')) {
    throw new TypeError('--protocol must be heldout-ordinary-v1 or heldout-development-v1.');
  }
  rejectUnexpectedOptions(parsed, new Set([
    '--difficulty', '--seed', '--rooms', '--out', '--terrain-profile',
  ]), new Set());
  const difficulty = parsed.values.get('--difficulty');
  if (!ROOM_DIFFICULTY_PROFILES.includes(difficulty as RoomDifficultyProfile)) {
    throw new TypeError('--difficulty must be standard, hard, or brutal.');
  }
  const out = parsed.values.get('--out');
  if (out === undefined) throw new TypeError('--out is required.');
  const terrainProfile = parsed.values.get('--terrain-profile');
  if (terrainProfile !== undefined && !ROOM_TERRAIN_PROFILES.includes(
    terrainProfile as RoomTerrainProfile,
  )) {
    throw new TypeError('--terrain-profile must be los_cover_v1.');
  }
  return {
    difficulty: difficulty as RoomDifficultyProfile,
    seed: safeInteger(parsed.values.get('--seed') ?? '', '--seed', 0),
    rooms: safeInteger(parsed.values.get('--rooms') ?? '', '--rooms', 1),
    outPath: resolve(out),
    ...(terrainProfile === undefined ? {} : { terrainProfile: terrainProfile as RoomTerrainProfile }),
  };
}

export function heldoutBasisSchedule(protocol: HeldoutOrdinaryProtocol, ordinal: number) {
  const localOrdinal = ordinal % 24;
  const level = (3 + localOrdinal % 4) as HeldoutPartyLevel;
  const targetXp: Readonly<Record<HeldoutPartyLevel, HeldoutTargetXp>> = {
    3: 900, 4: 1_500, 5: 3_000, 6: 4_000,
  };
  const slices = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
  const partition: HeldoutPartition | undefined = protocol === 'heldout-development-v1'
    ? 'development'
    : slices[Math.floor(ordinal / 24)];
  if (partition === undefined) throw new RangeError('Held-out reserve supports six 24-room slices.');
  return {
    partition,
    level,
    targetXp: targetXp[level],
    terrainProfile: Math.floor(localOrdinal / 4) % 2 === 0
      ? 'los_cover_v1' as const
      : null,
  };
}

export function basisRepositoryRevision(): string {
  return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

async function generateLegacyBasis(config: LegacyBasisGenerationConfig): Promise<null> {
  await mkdir(config.outPath, { recursive: true });
  await Promise.all(Array.from({ length: config.rooms }, async (_unused, index) => {
    const seed = config.seed + index;
    const generated = generateRoom(seed, {
      difficulty: config.difficulty,
      ...(config.terrainProfile === undefined ? {} : { terrainProfile: config.terrainProfile }),
    });
    const room = decodeArenaBasisEnvelopeV1(generated, { mode: 'legacy_basis' });
    await writeFile(
      resolve(config.outPath, `seed-${String(seed)}.json`),
      `${canonicalJson(room)}\n`,
      'utf8',
    );
  }));
  return null;
}

export type LoadedParty = Extract<
  ReturnType<typeof loadExternalPartyPackBytes>,
  { readonly status: 'loaded' }
>['party'];

export interface HeldoutBasisPartyEntry {
  readonly party: LoadedParty;
  readonly bytes: string;
  readonly manifest: HeldoutBasisPartyManifestRow;
}

export interface HeldoutBasisBuildContext {
  readonly config: HeldoutBasisGenerationConfig;
  readonly parties: ReadonlyMap<HeldoutPartyLevel, HeldoutBasisPartyEntry>;
}

async function loadHeldoutParties(
  path: string,
): Promise<ReadonlyMap<HeldoutPartyLevel, HeldoutBasisPartyEntry>> {
  const result = new Map<HeldoutPartyLevel, HeldoutBasisPartyEntry>();
  for (const level of [3, 4, 5, 6] as const) {
    const filePath = resolve(path, `level-${String(level)}.json`);
    const bytes = await readFile(filePath, 'utf8');
    const loaded = loadExternalPartyPackBytes(bytes);
    if (loaded.status !== 'loaded') {
      throw new Error(`Held-out party level ${String(level)} refused: ${loaded.refusal.reason}.`);
    }
    if (loaded.party.members.length !== 4 || loaded.party.members.some((member) =>
      member.source.classes.reduce((sum, heldClass) => sum + heldClass.level, 0) !== level)) {
      throw new Error(`Held-out party level ${String(level)} is not four level-matched members.`);
    }
    result.set(level, {
      party: loaded.party,
      bytes,
      manifest: {
        level,
        path: `parties/${basename(filePath)}`,
        sha256: sha256(bytes),
        memberSha256: loaded.party.pack.members.map((member) => sha256(canonicalJson(member))),
      },
    });
  }
  return result;
}

function validateHeldoutBasisGenerationConfig(config: HeldoutBasisGenerationConfig): void {
  if (config.protocol === 'heldout-development-v1' &&
    (config.rooms !== 24 || config.seed !== 7_850_001)) {
    throw new RangeError('The held-out development basis is exactly 24 rooms from seed 7850001.');
  }
  if (config.protocol === 'heldout-ordinary-v1' &&
    (config.rooms !== 144 || config.seed !== 7_860_001)) {
    throw new RangeError('The held-out reserve is exactly 144 rooms from seed 7860001.');
  }
}

export async function prepareHeldoutBasis(
  config: HeldoutBasisGenerationConfig,
): Promise<HeldoutBasisBuildContext> {
  validateHeldoutBasisGenerationConfig(config);
  const parties = await loadHeldoutParties(config.partyPackPath);
  await mkdir(config.outPath, { recursive: true });
  await mkdir(resolve(config.outPath, 'parties'), { recursive: true });
  await Promise.all([...parties.values()].map((entry) =>
    writeFile(resolve(config.outPath, entry.manifest.path), entry.bytes, 'utf8')));
  return { config, parties };
}

export async function generateHeldoutBasisRoom(
  context: HeldoutBasisBuildContext,
  ordinal: number,
): Promise<HeldoutBasisRoomManifestRow> {
  const { config, parties } = context;
  if (!Number.isSafeInteger(ordinal) || ordinal < 0 || ordinal >= config.rooms) {
    throw new RangeError(`Held-out room ordinal ${String(ordinal)} is outside the registered basis.`);
  }
  const seed = config.seed + ordinal;
  const schedule = heldoutBasisSchedule(config.protocol, ordinal);
  const party = parties.get(schedule.level);
  if (party === undefined) throw new Error(`Held-out party level ${String(schedule.level)} is absent.`);
  const room = generateRoom(seed, {
    initiativeProfile: 'derived_v1',
    ...(schedule.terrainProfile === null ? {} : { terrainProfile: schedule.terrainProfile }),
    heldoutOrdinary: {
      protocol: config.protocol,
      party: party.party,
      partyLevel: schedule.level,
      targetXp: schedule.targetXp,
    },
  });
  const roster = room.spec.heldoutOrdinary;
  if (roster === undefined) throw new Error(`Held-out room ${String(seed)} lost roster provenance.`);
  const bytes = `${canonicalJson(room)}\n`;
  const roomPath = resolve(config.outPath, `seed-${String(seed)}.json`);
  await writeFile(roomPath, bytes, 'utf8');
  return {
    ordinal,
    partition: schedule.partition,
    seed,
    partyLevel: schedule.level,
    targetXp: schedule.targetXp,
    terrainProfile: schedule.terrainProfile,
    partySha256: party.manifest.sha256,
    path: basename(roomPath),
    sha256: sha256(bytes),
    roster,
  };
}

export async function finalizeHeldoutBasis(
  context: HeldoutBasisBuildContext,
  rooms: readonly HeldoutBasisRoomManifestRow[],
): Promise<HeldoutBasisManifest> {
  const { config, parties } = context;
  if (rooms.length !== config.rooms || rooms.some((row, ordinal) => row.ordinal !== ordinal)) {
    throw new Error('Held-out basis finalization requires every room in ordinal order.');
  }
  const partyRows = [...parties.values()].map((entry) => entry.manifest);
  const manifestWithoutAggregate = {
    format: 'heldout-basis-manifest-v1' as const,
    protocol: config.protocol,
    generator: 'ordinary-solo-plus-three-v1' as const,
    repoRevision: basisRepositoryRevision(),
    bundledContentSha256: EXPECTED_BUNDLED_CONTENT_DIGEST_V1,
    partyRecipeId: HELDOUT_PARTY_RECIPE_ID,
    partyRecipeSha256: sha256(canonicalJson(HELDOUT_PARTY_RECIPES)),
    seed: config.seed,
    roomCount: config.rooms,
    parties: partyRows,
    rooms,
  };
  const manifest: HeldoutBasisManifest = {
    ...manifestWithoutAggregate,
    aggregateSha256: sha256(canonicalJson({ parties: partyRows, rooms })),
  };
  await mkdir(dirname(config.manifestPath), { recursive: true });
  await writeFile(config.manifestPath, `${canonicalJson(manifest)}\n`, 'utf8');
  return manifest;
}

async function generateHeldoutBasis(config: HeldoutBasisGenerationConfig): Promise<HeldoutBasisManifest> {
  const context = await prepareHeldoutBasis(config);
  const rooms = await Promise.all(Array.from(
    { length: config.rooms },
    async (_unused, ordinal) => generateHeldoutBasisRoom(context, ordinal),
  ));
  return finalizeHeldoutBasis(context, rooms);
}

function objectValue(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function stringValue(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new TypeError(`${label} must be a string.`);
  return value;
}

function integerValue(value: unknown, label: string, minimum = 0): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) {
    throw new TypeError(`${label} must be a safe integer of at least ${String(minimum)}.`);
  }
  return value;
}

function arrayValue(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array.`);
  return value;
}

function sha256Value(value: unknown, label: string): string {
  const digest = stringValue(value, label);
  if (!/^[a-f0-9]{64}$/u.test(digest)) throw new TypeError(`${label} must be a SHA-256 value.`);
  return digest;
}

function decodeProtocol(value: unknown, label: string): HeldoutOrdinaryProtocol {
  if (value === 'heldout-ordinary-v1' || value === 'heldout-development-v1') return value;
  throw new TypeError(`${label} must be a held-out protocol.`);
}

function decodeLevel(value: unknown, label: string): HeldoutPartyLevel {
  if (value === 3 || value === 4 || value === 5 || value === 6) return value;
  throw new TypeError(`${label} must be a held-out party level.`);
}

function decodeTargetXp(value: unknown, label: string): HeldoutTargetXp {
  if (value === 900 || value === 1_500 || value === 3_000 || value === 4_000) return value;
  throw new TypeError(`${label} must be a held-out target XP value.`);
}

function decodePartition(value: unknown, label: string): HeldoutPartition {
  if (value === 'development' || value === 'A' || value === 'B' || value === 'C' ||
    value === 'D' || value === 'E' || value === 'F') return value;
  throw new TypeError(`${label} must be a held-out partition.`);
}

function decodeTerrainProfile(value: unknown, label: string): RoomTerrainProfile | null {
  if (value === null || value === 'los_cover_v1') return value;
  throw new TypeError(`${label} must be null or los_cover_v1.`);
}

function decodeFamily(
  value: unknown,
  label: string,
): HeldoutBasisRoomManifestRow['roster']['family'] {
  const family = HELDOUT_STARTER_MONSTER_FAMILIES.find((candidate) => candidate === value);
  if (family === undefined) throw new TypeError(`${label} must be a starter monster family.`);
  return family;
}

function decodeRoster(value: unknown, label: string): HeldoutBasisRoomManifestRow['roster'] {
  const record = objectValue(value, label);
  const rng = objectValue(record.rng, `${label}.rng`);
  if (rng.algorithm !== 'mulberry32') {
    throw new TypeError(`${label}.rng.algorithm must be mulberry32.`);
  }
  return {
    protocol: decodeProtocol(record.protocol, `${label}.protocol`),
    partyLevel: decodeLevel(record.partyLevel, `${label}.partyLevel`),
    targetXp: decodeTargetXp(record.targetXp, `${label}.targetXp`),
    spentXp: integerValue(record.spentXp, `${label}.spentXp`),
    family: decodeFamily(record.family, `${label}.family`),
    eligibleStatblockIds: arrayValue(record.eligibleStatblockIds, `${label}.eligibleStatblockIds`)
      .map((entry, index) => stringValue(entry, `${label}.eligibleStatblockIds[${String(index)}]`)),
    maximizingVectorCount: integerValue(
      record.maximizingVectorCount,
      `${label}.maximizingVectorCount`,
      1,
    ),
    maximizingVectorIndex: integerValue(
      record.maximizingVectorIndex,
      `${label}.maximizingVectorIndex`,
    ),
    rng: {
      algorithm: 'mulberry32',
      normalizedSeed: integerValue(rng.normalizedSeed, `${label}.rng.normalizedSeed`),
      familyDrawIndex: integerValue(rng.familyDrawIndex, `${label}.rng.familyDrawIndex`),
      vectorDrawIndex: integerValue(rng.vectorDrawIndex, `${label}.rng.vectorDrawIndex`),
    },
  };
}

function decodePartyManifestRow(value: unknown, index: number): HeldoutBasisPartyManifestRow {
  const label = `Held-out basis manifest parties[${String(index)}]`;
  const record = objectValue(value, label);
  return {
    level: decodeLevel(record.level, `${label}.level`),
    path: stringValue(record.path, `${label}.path`),
    sha256: sha256Value(record.sha256, `${label}.sha256`),
    memberSha256: arrayValue(record.memberSha256, `${label}.memberSha256`)
      .map((entry, memberIndex) => sha256Value(
        entry,
        `${label}.memberSha256[${String(memberIndex)}]`,
      )),
  };
}

function decodeRoomManifestRow(value: unknown, index: number): HeldoutBasisRoomManifestRow {
  const label = `Held-out basis manifest rooms[${String(index)}]`;
  const record = objectValue(value, label);
  return {
    ordinal: integerValue(record.ordinal, `${label}.ordinal`),
    partition: decodePartition(record.partition, `${label}.partition`),
    seed: integerValue(record.seed, `${label}.seed`),
    partyLevel: decodeLevel(record.partyLevel, `${label}.partyLevel`),
    targetXp: decodeTargetXp(record.targetXp, `${label}.targetXp`),
    terrainProfile: decodeTerrainProfile(record.terrainProfile, `${label}.terrainProfile`),
    partySha256: sha256Value(record.partySha256, `${label}.partySha256`),
    path: stringValue(record.path, `${label}.path`),
    sha256: sha256Value(record.sha256, `${label}.sha256`),
    roster: decodeRoster(record.roster, `${label}.roster`),
  };
}

function decodeManifest(value: unknown): HeldoutBasisManifest {
  const label = 'Held-out basis manifest';
  const record = objectValue(value, label);
  if (record.format !== 'heldout-basis-manifest-v1' ||
    record.generator !== 'ordinary-solo-plus-three-v1' ||
    record.bundledContentSha256 !== EXPECTED_BUNDLED_CONTENT_DIGEST_V1 ||
    record.partyRecipeId !== HELDOUT_PARTY_RECIPE_ID) {
    throw new TypeError('Held-out basis manifest has invalid fixed provenance.');
  }
  const repoRevision = stringValue(record.repoRevision, `${label}.repoRevision`);
  if (!/^[a-f0-9]{40}$/u.test(repoRevision)) {
    throw new TypeError('Held-out basis manifest repoRevision must be a full Git object id.');
  }
  return {
    format: 'heldout-basis-manifest-v1',
    protocol: decodeProtocol(record.protocol, `${label}.protocol`),
    generator: 'ordinary-solo-plus-three-v1',
    repoRevision,
    bundledContentSha256: EXPECTED_BUNDLED_CONTENT_DIGEST_V1,
    partyRecipeId: HELDOUT_PARTY_RECIPE_ID,
    partyRecipeSha256: sha256Value(record.partyRecipeSha256, `${label}.partyRecipeSha256`),
    seed: integerValue(record.seed, `${label}.seed`),
    roomCount: integerValue(record.roomCount, `${label}.roomCount`, 1),
    parties: arrayValue(record.parties, `${label}.parties`).map(decodePartyManifestRow),
    rooms: arrayValue(record.rooms, `${label}.rooms`).map(decodeRoomManifestRow),
    aggregateSha256: sha256Value(record.aggregateSha256, `${label}.aggregateSha256`),
  };
}

export async function verifyHeldoutBasis(config: HeldoutBasisVerificationConfig): Promise<HeldoutBasisManifest> {
  const requiredSeed = config.protocol === 'heldout-development-v1' ? 7_850_001 : 7_860_001;
  const requiredRoomCount = config.protocol === 'heldout-development-v1' ? 24 : 144;
  if (config.expectRooms !== requiredRoomCount) {
    throw new Error('Held-out basis verification room count is not the registered protocol size.');
  }
  const manifestBytes = await readFile(config.manifestPath, 'utf8');
  if (sha256(manifestBytes) !== config.manifestSha256) {
    throw new Error('Held-out basis manifest SHA-256 mismatch.');
  }
  const manifest = decodeManifest(JSON.parse(manifestBytes) as unknown);
  if (manifest.protocol !== config.protocol || manifest.seed !== requiredSeed ||
    manifest.roomCount !== config.expectRooms ||
    manifest.rooms.length !== config.expectRooms) {
    throw new Error('Held-out basis manifest protocol or room count mismatch.');
  }
  if (manifest.generator !== 'ordinary-solo-plus-three-v1' ||
    manifest.bundledContentSha256 !== EXPECTED_BUNDLED_CONTENT_DIGEST_V1 ||
    manifest.partyRecipeId !== HELDOUT_PARTY_RECIPE_ID ||
    manifest.partyRecipeSha256 !== sha256(canonicalJson(HELDOUT_PARTY_RECIPES))) {
    throw new Error('Held-out basis manifest generator, catalog, or recipe provenance mismatch.');
  }
  const partyLevels = manifest.parties.map((party) => party.level).sort((left, right) => left - right);
  if (canonicalJson(partyLevels) !== canonicalJson([3, 4, 5, 6])) {
    throw new Error('Held-out basis manifest must bind exactly one party for levels 3 through 6.');
  }
  const loadedParties = new Map<HeldoutPartyLevel, LoadedParty>();
  for (const party of manifest.parties) {
    if (party.path !== `parties/level-${String(party.level)}.json`) {
      throw new Error(`Held-out party level ${String(party.level)} path mismatch.`);
    }
    const bytes = await readFile(resolve(config.basisPath, party.path), 'utf8');
    if (sha256(bytes) !== party.sha256) {
      throw new Error(`Held-out party level ${String(party.level)} SHA-256 mismatch.`);
    }
    const loaded = loadExternalPartyPackBytes(bytes);
    if (loaded.status !== 'loaded' || loaded.party.members.length !== 4 ||
      loaded.party.members.some((member) =>
        member.source.classes.reduce((sum, heldClass) => sum + heldClass.level, 0) !== party.level) ||
      canonicalJson(loaded.party.pack.members.map((member) => sha256(canonicalJson(member)))) !==
        canonicalJson(party.memberSha256)) {
      throw new Error(`Held-out party level ${String(party.level)} membership mismatch.`);
    }
    loadedParties.set(party.level, loaded.party);
  }
  if (sha256(canonicalJson({ parties: manifest.parties, rooms: manifest.rooms })) !== manifest.aggregateSha256) {
    throw new Error('Held-out basis aggregate SHA-256 mismatch.');
  }
  for (const [ordinal, row] of manifest.rooms.entries()) {
    const schedule = heldoutBasisSchedule(config.protocol, ordinal);
    const party = manifest.parties.find((candidate) => candidate.level === row.partyLevel);
    const loadedParty = loadedParties.get(row.partyLevel);
    if (row.path !== `seed-${String(row.seed)}.json` ||
      row.ordinal !== ordinal || row.seed !== manifest.seed + ordinal ||
      row.partition !== schedule.partition || row.partyLevel !== schedule.level ||
      row.targetXp !== schedule.targetXp || row.terrainProfile !== schedule.terrainProfile ||
      party === undefined || loadedParty === undefined || row.partySha256 !== party.sha256 ||
      row.roster.protocol !== config.protocol || row.roster.partyLevel !== row.partyLevel ||
      row.roster.targetXp !== row.targetXp || row.roster.spentXp !== row.targetXp) {
      throw new Error(`Held-out room ${String(row.seed)} schedule or provenance mismatch.`);
    }
    const bytes = await readFile(resolve(config.basisPath, row.path), 'utf8');
    if (sha256(bytes) !== row.sha256) {
      throw new Error(`Held-out room ${String(row.seed)} SHA-256 mismatch.`);
    }
    const parsed = objectValue(JSON.parse(bytes) as unknown, 'Held-out room');
    const spec = objectValue(parsed.spec, 'Held-out room spec');
    const roomRoster = objectValue(spec.heldoutOrdinary, 'Held-out room provenance');
    const encounter = objectValue(parsed.encounter, 'Held-out room encounter');
    const state = objectValue(encounter.state, 'Held-out room state');
    if (!Array.isArray(state.combatants)) throw new TypeError('Held-out room combatants must be an array.');
    const profiles = state.combatants.map((candidate, index) => {
      const combatant = objectValue(candidate, `Held-out combatant[${String(index)}]`);
      return objectValue(combatant.profile, `Held-out combatant[${String(index)}].profile`);
    });
    const playerProfiles = profiles.filter((profile) => profile.kind === 'player_character');
    const monsterProfiles = profiles.filter((profile) => profile.kind === 'monster');
    const expectedPlayerProfiles = loadedParty.members.map((member) => member.profile);
    if (canonicalJson(playerProfiles) !== canonicalJson(expectedPlayerProfiles)) {
      throw new Error(`Held-out room ${String(row.seed)} player profiles do not match its pinned party.`);
    }
    const rosterEntries = arrayValue(spec.monsterRoster, 'Held-out room monster roster');
    const familyRows = STARTER_MONSTER_ROSTER.filter((candidate) =>
      candidate.family === row.roster.family);
    const eligibleStatblockIds = familyRows.map((candidate) => candidate.id)
      .sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
    if (canonicalJson(row.roster.eligibleStatblockIds) !== canonicalJson(eligibleStatblockIds)) {
      throw new Error(`Held-out room ${String(row.seed)} eligible roster provenance mismatch.`);
    }
    let actualXp = 0;
    const selectedStatblockIds: string[] = [];
    const expectedMonsterProfiles = rosterEntries.map((entry, rosterIndex) => {
      const label = `Held-out room monster roster[${String(rosterIndex)}]`;
      const rosterEntry = objectValue(entry, label);
      const combatantId = stringValue(rosterEntry.combatantId, `${label}.combatantId`);
      const tokenId = stringValue(rosterEntry.tokenId, `${label}.tokenId`);
      const statblockId = stringValue(rosterEntry.statblockId, `${label}.statblockId`);
      const source = familyRows.find((candidate) => candidate.id === statblockId);
      if (source === undefined || !row.roster.eligibleStatblockIds.includes(statblockId)) {
        throw new Error(`Held-out room ${String(row.seed)} selected ineligible monster ${statblockId}.`);
      }
      if (canonicalJson(rosterEntry.challengeRating) !== canonicalJson(source.challengeRating)) {
        throw new Error(`Held-out room ${String(row.seed)} challenge rating mismatch for ${statblockId}.`);
      }
      const challenge = source.statblock.sourceDetails.challenge;
      if (challenge.kind !== 'present') {
        throw new Error(`Held-out room ${String(row.seed)} monster ${statblockId} has no sourced XP.`);
      }
      actualXp += challenge.value.experiencePoints;
      selectedStatblockIds.push(statblockId);
      const profile = monsterCombatantProfile(source.statblock, { combatantId, tokenId });
      const abilityScores = profile.rules.abilityScores;
      if (abilityScores === undefined) {
        throw new Error(`Held-out room ${String(row.seed)} monster ${statblockId} lacks Dexterity.`);
      }
      return {
        ...profile,
        rules: {
          ...profile.rules,
          initiativeBonus: Math.floor((abilityScores.dexterity - 10) / 2),
        },
      };
    });
    const maximizing = heldoutMaximizingMonsterRosters(row.roster.family, row.targetXp);
    const selectedVector = maximizing[row.roster.maximizingVectorIndex];
    if (row.roster.maximizingVectorCount !== maximizing.length || selectedVector === undefined ||
      row.roster.rng.vectorDrawIndex !== row.roster.maximizingVectorIndex ||
      row.roster.rng.normalizedSeed !== row.seed ||
      HELDOUT_STARTER_MONSTER_FAMILIES[row.roster.rng.familyDrawIndex] !== row.roster.family ||
      canonicalJson(selectedStatblockIds) !== canonicalJson(selectedVector.statblockIds) ||
      actualXp !== row.roster.spentXp || actualXp !== row.targetXp) {
      throw new Error(`Held-out room ${String(row.seed)} roster selection or XP mismatch.`);
    }
    if (canonicalJson(monsterProfiles) !== canonicalJson(expectedMonsterProfiles)) {
      throw new Error(`Held-out room ${String(row.seed)} monster profiles do not match its declared roster.`);
    }
    if (spec.seed !== row.seed || roomRoster.protocol !== config.protocol ||
      roomRoster.partyLevel !== row.partyLevel || roomRoster.targetXp !== row.targetXp ||
      roomRoster.spentXp !== row.targetXp || canonicalJson(roomRoster) !== canonicalJson(row.roster) ||
      playerProfiles.length !== 4 || monsterProfiles.length !== rosterEntries.length ||
      (row.terrainProfile === null ? Object.hasOwn(spec, 'terrainProfile') :
        spec.terrainProfile !== row.terrainProfile)) {
      throw new Error(`Held-out room ${String(row.seed)} bytes violate manifest invariants.`);
    }
  }
  return manifest;
}

export async function generateArenaBasis(config: BasisGenerationConfig): Promise<HeldoutBasisManifest | null> {
  if ('verifyOnly' in config) return verifyHeldoutBasis(config);
  if ('protocol' in config) return generateHeldoutBasis(config);
  return generateLegacyBasis(config);
}

async function main(argv: readonly string[]): Promise<void> {
  const result = await generateArenaBasis(parseBasisGenerationArgs(argv));
  if (result !== null) process.stdout.write(`${canonicalJson(result)}\n`);
}

const scriptIndex = process.argv.findIndex((argument) =>
  argument.endsWith('/generate-arena-basis.ts') || argument.endsWith('\\generate-arena-basis.ts'));
const invokedPath = process.argv[1];
if (scriptIndex >= 0) await main(process.argv.slice(scriptIndex + 1));
else if (invokedPath !== undefined && (
  invokedPath.endsWith('/vite-node') || invokedPath.endsWith('\\vite-node') ||
  invokedPath.endsWith('/vite-node.mjs') || invokedPath.endsWith('\\vite-node.mjs')
) && (process.argv.includes('--difficulty') || process.argv.includes('--protocol') ||
  process.argv.includes('--verify-only'))) await main(process.argv.slice(2));
