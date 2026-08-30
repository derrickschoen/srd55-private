import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { lookupBundledMonster } from '../../../src/combat/statblocks/companions';
import { declareTestInputs } from '../../helpers/test-inputs';

const PACK_DIRECTORY = 'content/cc0/escape-the-astral-tower' as const;
const INDEX_INPUT_PATH = `${PACK_DIRECTORY}/index.json` as const;
const LICENSE_INPUT_PATH = `${PACK_DIRECTORY}/LICENSE.md` as const;
const ROOM_INPUT_PATHS = [
  `${PACK_DIRECTORY}/room-01-main-hall.json`,
  `${PACK_DIRECTORY}/room-02-larder.json`,
  `${PACK_DIRECTORY}/room-03-kitchen.json`,
  `${PACK_DIRECTORY}/room-04-first-floor-stairwell.json`,
  `${PACK_DIRECTORY}/room-05-library.json`,
  `${PACK_DIRECTORY}/room-06-side-entrance.json`,
  `${PACK_DIRECTORY}/room-07-guardhouse-vault.json`,
  `${PACK_DIRECTORY}/room-08-apprentices-bedroom.json`,
  `${PACK_DIRECTORY}/room-09-guards-bedroom.json`,
  `${PACK_DIRECTORY}/room-10-vivarium.json`,
  `${PACK_DIRECTORY}/room-11-arboretum.json`,
  `${PACK_DIRECTORY}/room-12-prismatic-workshop.json`,
  `${PACK_DIRECTORY}/room-13-apothecary.json`,
  `${PACK_DIRECTORY}/room-14-second-floor-stairwell.json`,
  `${PACK_DIRECTORY}/room-15-supply-closet.json`,
  `${PACK_DIRECTORY}/room-16-servants-quarters.json`,
  `${PACK_DIRECTORY}/room-17-study.json`,
  `${PACK_DIRECTORY}/room-18-herbarium.json`,
  `${PACK_DIRECTORY}/room-19-reliquary-chamber.json`,
  `${PACK_DIRECTORY}/room-20-opulent-bedroom.json`,
  `${PACK_DIRECTORY}/room-21-arcane-library.json`,
  `${PACK_DIRECTORY}/room-22-tempest-chamber.json`,
  `${PACK_DIRECTORY}/room-23-observatory.json`,
  `${PACK_DIRECTORY}/room-24-seismic-chamber.json`,
  `${PACK_DIRECTORY}/room-25-crystal-caves.json`,
  `${PACK_DIRECTORY}/room-26-xenobotanical-cavern.json`,
] as const;
const CONTENT_INPUT_PATHS = [INDEX_INPUT_PATH, LICENSE_INPUT_PATH, ...ROOM_INPUT_PATHS] as const;
const declaredInputs = declareTestInputs({
  content: CONTENT_INPUT_PATHS,
  contentDirectories: [PACK_DIRECTORY],
});
const { readText: readContentText } = declaredInputs.content;
const { list: listContentDirectory } = declaredInputs.contentDirectories;
type ContentInputPath = (typeof CONTENT_INPUT_PATHS)[number];
type RoomInputPath = (typeof ROOM_INPUT_PATHS)[number];
const roomInputByFilename = new Map<string, RoomInputPath>(ROOM_INPUT_PATHS.map((path) => [
  path.slice(`${PACK_DIRECTORY}/`.length),
  path,
] as const));

const unknownReasonSchema = z.enum(['not_specified_by_source', 'random_encounter']);
const positionSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('relative'),
    area: z.string().trim().min(1),
  }),
  z.strictObject({
    kind: z.literal('unknown'),
    reason: unknownReasonSchema,
  }),
]);

const quantitySchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('fixed'),
    value: z.number().int().positive(),
  }),
  z.strictObject({
    kind: z.literal('dice'),
    expression: z.string().regex(/^[1-9]\d*d[1-9]\d*$/),
  }),
]);

const monsterReferenceSchema = z.discriminatedUnion('status', [
  z.strictObject({
    status: z.literal('mapped'),
    statblockId: z.string().regex(/^statblock:[a-z0-9][a-z0-9/-]*$/),
  }),
  z.strictObject({
    status: z.literal('unmapped'),
    reason: z.enum(['no_srd_exact_match', 'srd_exact_match_not_bundled']),
  }),
]);

const monsterRefSchema = z.strictObject({
  sourceName: z.string().trim().min(1),
  quantity: quantitySchema,
  reference: monsterReferenceSchema,
  position: positionSchema,
  activation: z.enum(['present', 'on_interaction', 'if_freed']),
});

const terrainSchema = z.strictObject({
  kind: z.enum(['access', 'blocking', 'hazard', 'light', 'obstacle', 'resource', 'rest', 'terrain']),
  name: z.string().trim().min(1),
  position: positionSchema,
  mechanics: z.array(z.string().trim().min(1)).min(1),
});

const encounterFixtureSchema = z.strictObject({
  schemaVersion: z.literal(1),
  encounterId: z.string().regex(/^escape-the-astral-tower:room-\d{2}$/),
  provenance: z.strictObject({
    source: z.literal('imported'),
    licenseTag: z.literal('CC0-1.0'),
    seed: z.null(),
  }),
  room: z.strictObject({
    number: z.number().int().min(1).max(26),
    name: z.string().trim().min(1),
    sourcePage: z.number().int().min(1).max(8),
  }),
  layout: z.strictObject({
    kind: z.literal('source_map'),
    sourcePage: z.number().int().min(1).max(8),
    gridScale: z.strictObject({
      kind: z.literal('unknown'),
      reason: z.literal('not_specified_by_source'),
    }),
  }),
  monsterRefs: z.array(monsterRefSchema),
  terrain: z.array(terrainSchema),
}).refine(
  (fixture) => fixture.monsterRefs.length + fixture.terrain.length > 0,
  { message: 'An encounter fixture must contain a monster or mechanical terrain.' },
);

const indexEntrySchema = z.strictObject({
  room: z.number().int().min(1).max(26),
  encounterId: z.string().regex(/^escape-the-astral-tower:room-\d{2}$/),
  file: z.string().regex(/^room-\d{2}-[a-z0-9-]+\.json$/),
});

const randomEncounterTableSchema = z.strictObject({
  id: z.enum(['tower', 'asteroid']),
  sourcePage: z.literal(2),
  die: z.enum(['1d10', '1d6']),
  entries: z.array(z.strictObject({
    roll: z.number().int().positive(),
    monsterRef: monsterRefSchema,
  })).min(1),
});

const packIndexSchema = z.strictObject({
  schemaVersion: z.literal(1),
  packId: z.literal('cc0:escape-the-astral-tower'),
  title: z.literal('Escape the Astral Tower'),
  licenseTag: z.literal('CC0-1.0'),
  sourceUrl: z.literal('https://doomedzone.itch.io/the-astral-tower'),
  accessDate: z.literal('2026-08-30'),
  encounters: z.array(indexEntrySchema).length(26),
  randomEncounterTables: z.array(randomEncounterTableSchema).length(2),
});

type EncounterFixture = z.infer<typeof encounterFixtureSchema>;
type MonsterRef = z.infer<typeof monsterRefSchema>;
type PackIndex = z.infer<typeof packIndexSchema>;

function readJson(path: ContentInputPath): unknown {
  return JSON.parse(readContentText(path));
}

function loadIndex(): PackIndex {
  return packIndexSchema.parse(readJson(INDEX_INPUT_PATH));
}

function loadEncounters(index: PackIndex): readonly EncounterFixture[] {
  return index.encounters.map((entry) => {
    const path = roomInputByFilename.get(entry.file);
    if (path === undefined) throw new Error(`Index references undeclared content input ${entry.file}.`);
    return encounterFixtureSchema.parse(readJson(path));
  });
}

function allMonsterRefs(index: PackIndex, encounters: readonly EncounterFixture[]): readonly MonsterRef[] {
  return [
    ...encounters.flatMap((encounter) => encounter.monsterRefs),
    ...index.randomEncounterTables.flatMap((table) =>
      table.entries.map((entry) => entry.monsterRef)),
  ];
}

describe('Escape the Astral Tower CC0 encounter stock', () => {
  it('parses all 26 room encounters against the strict fixture schema', () => {
    const index = loadIndex();
    const encounters = loadEncounters(index);

    expect(encounters).toHaveLength(26);
    expect(encounters.map((encounter) => encounter.room.number)).toEqual(
      Array.from({ length: 26 }, (_unused, indexValue) => indexValue + 1),
    );
    expect(encounters.map((encounter) => encounter.encounterId)).toEqual(
      index.encounters.map((entry) => entry.encounterId),
    );
  });

  it('keeps every encounter mechanically non-empty', () => {
    const encounters = loadEncounters(loadIndex());

    for (const encounter of encounters) {
      expect(
        encounter.monsterRefs.length + encounter.terrain.length,
        encounter.encounterId,
      ).toBeGreaterThan(0);
    }
  });

  it('resolves mapped monsters to bundled SRD statblocks and types every other reference as unmapped', () => {
    const index = loadIndex();
    const refs = allMonsterRefs(index, loadEncounters(index));
    const mapped = refs.filter((ref) => ref.reference.status === 'mapped');
    const unmapped = refs.filter((ref) => ref.reference.status === 'unmapped');

    expect(mapped.map((ref) => ref.sourceName)).toEqual(['Giant Spider', 'Skeleton']);
    expect(unmapped).toHaveLength(21);
    for (const ref of mapped) {
      if (ref.reference.status !== 'mapped') throw new Error('Mapped-ref narrowing failed.');
      const lookup = lookupBundledMonster(ref.reference.statblockId);
      expect(lookup.status, ref.sourceName).toBe('resolved');
      if (lookup.status !== 'resolved') throw new Error(`Missing ${ref.reference.statblockId}.`);
      expect(lookup.entry.kind, ref.sourceName).toBe('static');
      if (lookup.entry.kind !== 'static') throw new Error(`${ref.reference.statblockId} is parameterized.`);
      expect(lookup.entry.statblock.provenance.kind, ref.sourceName).toBe('srd_5_2_1_decoded');
    }
    for (const ref of unmapped) {
      expect(ref.reference.status, ref.sourceName).toBe('unmapped');
    }
  });

  it('indexes exactly the 26 encounter JSON files present', () => {
    const index = loadIndex();
    const indexedFiles = index.encounters.map((entry) => entry.file).sort();
    const presentFiles = listContentDirectory(PACK_DIRECTORY)
      .filter((file) => file.startsWith('room-') && file.endsWith('.json'))
      .sort();

    expect(indexedFiles).toEqual(presentFiles);
    expect(new Set(indexedFiles).size).toBe(26);
    expect(new Set(index.encounters.map((entry) => entry.encounterId)).size).toBe(26);
  });

  it('records the verified source, access date, and CC0 declaration', () => {
    const index = loadIndex();
    const license = readContentText(LICENSE_INPUT_PATH);

    expect(index.sourceUrl).toBe('https://doomedzone.itch.io/the-astral-tower');
    expect(index.accessDate).toBe('2026-08-30');
    expect(license).toContain('Creative Commons Zero 1.0 Universal');
    expect(license).toContain('public domain under CC0 1.0');
  });
});
