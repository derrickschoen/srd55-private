import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { declareTestInputs } from '../../helpers/test-inputs';

const PACK_DIRECTORY = 'content/cc-by/a5e' as const;
const INDEX_INPUT_PATH = `${PACK_DIRECTORY}/index.json` as const;
const LICENSE_INPUT_PATH = `${PACK_DIRECTORY}/LICENSE.md` as const;
const EXPLORATION_CHALLENGES_INPUT_PATH = `${PACK_DIRECTORY}/exploration-challenges.json` as const;
const ENCOUNTER_BUILDING_TABLES_INPUT_PATH = `${PACK_DIRECTORY}/encounter-building-tables.json` as const;
const CONTENT_INPUT_PATHS = [
  INDEX_INPUT_PATH,
  LICENSE_INPUT_PATH,
  EXPLORATION_CHALLENGES_INPUT_PATH,
  ENCOUNTER_BUILDING_TABLES_INPUT_PATH,
] as const;
const declaredInputs = declareTestInputs({
  content: CONTENT_INPUT_PATHS,
  contentDirectories: [PACK_DIRECTORY],
});
const { readText: readContentText } = declaredInputs.content;
const { list: listContentDirectory } = declaredInputs.contentDirectories;
type ContentInputPath = (typeof CONTENT_INPUT_PATHS)[number];

const sourceUrlSchema = z.string().url().refine((url) => url.startsWith('https://a5esrd.com/'));
const provenanceSchema = z.strictObject({
  source: z.literal('imported'),
  licenseTag: z.literal('CC-BY-4.0'),
  accessDate: z.literal('2026-08-30'),
});
const challengeRatingSchema = z.string().regex(/^-?(?:0|[1-9]\d*)(?:\/[1-9]\d*)?$/);
const areaSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.enum(['immediate', 'local', 'intermediate', 'greater', 'region']) }),
  z.strictObject({ kind: z.literal('unknown'), reason: z.literal('source_declares_special') }),
]);
const normalTraverseSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('less_than_hours'), value: z.literal(1) }),
  z.strictObject({ kind: z.literal('hours'), value: z.union([z.literal(1), z.literal(3)]) }),
  z.strictObject({ kind: z.literal('days'), value: z.literal(1) }),
  z.strictObject({ kind: z.literal('unknown'), reason: z.enum(['source_declares_special', 'source_declares_variable_time']) }),
]);
const challengeSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(1),
  tier: z.number().int().min(0).max(4),
  kind: z.enum(['circumstance', 'constructed', 'creatures', 'supernatural', 'terrain', 'urban', 'weather']),
  challengeRating: z.number().int().min(1).max(20),
  experiencePoints: z.number().int().positive(),
  dc: z.strictObject({ individual: z.number().int().min(13).max(23), group: z.number().int().min(13).max(18) }),
  area: areaSchema,
  normalTraverse: normalTraverseSchema,
});
const explorationChallengesSchema = z.strictObject({
  schemaVersion: z.literal(1),
  provenance: provenanceSchema.extend({ sourceUrl: z.literal('https://a5esrd.com/s/a5e_srd_15_exploration_challenges.pdf') }),
  challenges: z.array(challengeSchema).length(75),
});
const challengeExperienceSchema = z.strictObject({
  challengeRating: challengeRatingSchema,
  experiencePoints: z.union([z.number().int().nonnegative(), z.literal('0_or_10')]),
});
const recommendationSchema = z.strictObject({
  partySize: z.enum(['2', '3', '4', '5', '6_or_more']),
  difficulty: z.enum(['easy', 'medium', 'hard', 'deadly']),
  challengeRatings: z.array(challengeRatingSchema).length(20),
});
const elementIncreaseSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('fixed'), challengeRating: challengeRatingSchema }),
  z.strictObject({ kind: z.literal('per_30_feet'), challengeRating: z.literal('1'), maximumChallengeRating: z.literal('4') }),
]);
const encounterBuildingTablesSchema = z.strictObject({
  schemaVersion: z.literal(1),
  provenance: provenanceSchema.extend({ sourceUrl: z.literal('https://a5esrd.com/s/a5e_srd_13.pdf') }),
  challengeExperiencePoints: z.array(challengeExperienceSchema).length(34),
  tierZeroAndOneEffectiveEncounterCr: z.array(z.strictObject({ actualMonsterCr: challengeRatingSchema, effectiveCr: challengeRatingSchema })).length(4),
  encounterCrByPartySize: z.strictObject({
    characterLevels: z.array(z.number().int().min(1).max(20)).length(20),
    maximumMonsterCr: z.array(challengeRatingSchema).length(20),
    recommendations: z.array(recommendationSchema).length(20),
  }),
  encounterElementCrIncreases: z.array(z.strictObject({ element: z.string().trim().min(1), increase: elementIncreaseSchema })).length(25),
});
const packIndexSchema = z.strictObject({
  schemaVersion: z.literal(1),
  packId: z.literal('cc-by:a5e'),
  title: z.literal('A5E exploration and encounter-building ingredients'),
  provenance: provenanceSchema,
  sourceUrls: z.array(sourceUrlSchema).length(2),
  documents: z.array(z.strictObject({
    kind: z.enum(['exploration_challenges', 'encounter_building_tables']),
    file: z.enum(['exploration-challenges.json', 'encounter-building-tables.json']),
  })).length(2),
});

type ExplorationChallenges = z.infer<typeof explorationChallengesSchema>;
type EncounterBuildingTables = z.infer<typeof encounterBuildingTablesSchema>;

function readJson(path: ContentInputPath): unknown {
  return JSON.parse(readContentText(path));
}

function loadChallenges(): ExplorationChallenges {
  return explorationChallengesSchema.parse(readJson(EXPLORATION_CHALLENGES_INPUT_PATH));
}

function loadTables(): EncounterBuildingTables {
  return encounterBuildingTablesSchema.parse(readJson(ENCOUNTER_BUILDING_TABLES_INPUT_PATH));
}

describe('A5E CC-BY exploration and encounter-building ingredients', () => {
  it('parses all 75 exploration challenges with strict typed metadata', () => {
    const challenges = loadChallenges().challenges;

    expect(challenges).toHaveLength(75);
    expect(new Set(challenges.map((challenge) => challenge.id)).size).toBe(75);
    expect(new Set(challenges.map((challenge) => challenge.name)).size).toBe(75);
  });

  it('preserves source-declared special and variable values as typed unknowns', () => {
    const challenges = loadChallenges().challenges;
    const byId = new Map(challenges.map((challenge) => [challenge.id, challenge]));

    expect(byId.get('fey-glade')?.area).toEqual({ kind: 'unknown', reason: 'source_declares_special' });
    expect(byId.get('urban-quake')?.normalTraverse).toEqual({ kind: 'unknown', reason: 'source_declares_special' });
    expect(byId.get('sunspots')?.normalTraverse).toEqual({ kind: 'unknown', reason: 'source_declares_variable_time' });
  });

  it('preserves representative challenge mechanics from distinct source tiers', () => {
    const byId = new Map(loadChallenges().challenges.map((challenge) => [challenge.id, challenge]));

    expect(byId.get('blinding-blizzard')).toMatchObject({ tier: 0, kind: 'weather', challengeRating: 1, experiencePoints: 200, dc: { individual: 13, group: 13 } });
    expect(byId.get('acid-field')).toMatchObject({ tier: 2, kind: 'terrain', challengeRating: 8, experiencePoints: 3900, dc: { individual: 17, group: 15 } });
    expect(byId.get('divine-war')).toMatchObject({ tier: 4, kind: 'supernatural', challengeRating: 20, experiencePoints: 25000, dc: { individual: 23, group: 18 } });
  });

  it('parses the complete encounter-building tables and retains source table values', () => {
    const tables = loadTables();
    const hardForFour = tables.encounterCrByPartySize.recommendations.find((row) => row.partySize === '4' && row.difficulty === 'hard');
    const falling = tables.encounterElementCrIncreases.find((entry) => entry.element === 'Falling');

    expect(tables.challengeExperiencePoints.find((entry) => entry.challengeRating === '20')).toEqual({ challengeRating: '20', experiencePoints: 25000 });
    expect(tables.tierZeroAndOneEffectiveEncounterCr).toEqual([
      { actualMonsterCr: '0', effectiveCr: '1/8' },
      { actualMonsterCr: '1/8', effectiveCr: '1/4' },
      { actualMonsterCr: '1/4', effectiveCr: '1/2' },
      { actualMonsterCr: '1/2', effectiveCr: '1' },
    ]);
    expect(hardForFour?.challengeRatings).toEqual(['2', '4', '6', '8', '10', '12', '14', '16', '18', '20', '22', '24', '26', '28', '30', '32', '34', '36', '38', '40']);
    expect(falling?.increase).toEqual({ kind: 'per_30_feet', challengeRating: '1', maximumChallengeRating: '4' });
  });

  it('indexes exactly the three JSON fixture files and records CC-BY attribution', () => {
    const index = packIndexSchema.parse(readJson(INDEX_INPUT_PATH));
    const license = readContentText(LICENSE_INPUT_PATH);
    const presentJsonFiles = listContentDirectory(PACK_DIRECTORY).filter((file) => file.endsWith('.json')).sort();

    expect(index.documents.map((document) => document.file).sort()).toEqual(['encounter-building-tables.json', 'exploration-challenges.json']);
    expect(presentJsonFiles).toEqual(['encounter-building-tables.json', 'exploration-challenges.json', 'index.json']);
    expect(index.sourceUrls).toEqual([
      'https://a5esrd.com/s/a5e_srd_13.pdf',
      'https://a5esrd.com/s/a5e_srd_15_exploration_challenges.pdf',
    ]);
    expect(license).toContain('Creative Commons Attribution 4.0 International');
    expect(license).toContain('A5E System Reference Document');
  });
});
