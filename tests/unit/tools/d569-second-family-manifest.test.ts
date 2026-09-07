import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { sha256 } from '../../../src/crypto/sha256';
import type { GeneratedRoom } from '../../../src/vtt/room-generator';
import {
  D569_SECOND_FAMILY_LEDGER_ENTRY,
  D569_SECOND_FAMILY_SEEDS,
  brutalRoomMembershipViolations,
  canonicalD569SecondFamilyRegeneration,
  generatedRoomIntegrityViolations,
  hardRoomMembershipViolations,
  validateD569SecondFamilyManifest,
  type D569SecondFamilyManifest,
  type D569SecondFamilyValidationAccess,
} from '../../../tools/d569-second-family-manifest';
import { declareTestInputs } from '../../helpers/test-inputs';

const MANIFEST_PATH = 'tests/fixtures/d569-second-family-manifest.json' as const;
const HARD_FIXTURE_PATHS = [
  'tests/fixtures/arena-basis-hard-2/seed-5118001.json',
  'tests/fixtures/arena-basis-hard-2/seed-5118002.json',
  'tests/fixtures/arena-basis-hard-2/seed-5118003.json',
  'tests/fixtures/arena-basis-hard-2/seed-5118004.json',
  'tests/fixtures/arena-basis-hard-2/seed-5118005.json',
  'tests/fixtures/arena-basis-hard-2/seed-5118006.json',
  'tests/fixtures/arena-basis-hard-2/seed-5118007.json',
  'tests/fixtures/arena-basis-hard-2/seed-5118008.json',
  'tests/fixtures/arena-basis-hard-2/seed-5118009.json',
  'tests/fixtures/arena-basis-hard-2/seed-5118010.json',
] as const;
const BRUTAL_FIXTURE_PATHS = [
  'tests/fixtures/arena-basis-brutal-2/seed-6207001.json',
  'tests/fixtures/arena-basis-brutal-2/seed-6207002.json',
  'tests/fixtures/arena-basis-brutal-2/seed-6207003.json',
  'tests/fixtures/arena-basis-brutal-2/seed-6207004.json',
  'tests/fixtures/arena-basis-brutal-2/seed-6207005.json',
  'tests/fixtures/arena-basis-brutal-2/seed-6207006.json',
  'tests/fixtures/arena-basis-brutal-2/seed-6207007.json',
  'tests/fixtures/arena-basis-brutal-2/seed-6207008.json',
  'tests/fixtures/arena-basis-brutal-2/seed-6207009.json',
  'tests/fixtures/arena-basis-brutal-2/seed-6207010.json',
] as const;
const ALL_FIXTURE_PATHS = [...HARD_FIXTURE_PATHS, ...BRUTAL_FIXTURE_PATHS] as const;
const inputs = declareTestInputs({ fixtures: [MANIFEST_PATH, ...ALL_FIXTURE_PATHS] });
const fixtureBytes = new Map<string, string>(ALL_FIXTURE_PATHS.map((path) => [
  path,
  inputs.fixtures.readText(path),
]));

function manifest(): D569SecondFamilyManifest {
  return JSON.parse(inputs.fixtures.readText(MANIFEST_PATH)) as D569SecondFamilyManifest;
}

function room(path: (typeof ALL_FIXTURE_PATHS)[number]): GeneratedRoom {
  return JSON.parse(inputs.fixtures.readText(path)) as GeneratedRoom;
}

function access(overrides: Partial<D569SecondFamilyValidationAccess> = {}): D569SecondFamilyValidationAccess {
  return {
    readFixture: (path) => {
      const bytes = fixtureBytes.get(path);
      if (bytes === undefined) throw new Error(`undeclared fixture ${path}`);
      return bytes;
    },
    regenerate: canonicalD569SecondFamilyRegeneration,
    ...overrides,
  };
}

function codes(
  candidate: unknown,
  validationAccess: D569SecondFamilyValidationAccess = access(),
): readonly string[] {
  return validateD569SecondFamilyManifest(candidate, validationAccess).map((violation) => violation.code);
}

describe('D569 independent second-family manifest', () => {
  it('pins the amended exact contiguous ranges and verbatim independent ledger evidence', () => {
    const frozen = manifest();
    expect(D569_SECOND_FAMILY_SEEDS.hard).toEqual([
      5_118_001, 5_118_002, 5_118_003, 5_118_004, 5_118_005,
      5_118_006, 5_118_007, 5_118_008, 5_118_009, 5_118_010,
    ]);
    expect(D569_SECOND_FAMILY_SEEDS.brutal).toEqual([
      6_207_001, 6_207_002, 6_207_003, 6_207_004, 6_207_005,
      6_207_006, 6_207_007, 6_207_008, 6_207_009, 6_207_010,
    ]);
    expect(frozen.ledgerEntry).toBe(D569_SECOND_FAMILY_LEDGER_ENTRY);
    expect(codes(frozen)).toEqual([]);
  });

  it.each(HARD_FIXTURE_PATHS)('%s satisfies every hard state-property invariant before its pin', (path) => {
    const frozen = room(path);
    expect(generatedRoomIntegrityViolations(frozen, inputs.fixtures.readText(path))).toEqual([]);
    expect(hardRoomMembershipViolations(frozen)).toEqual([]);
  });

  it.each(BRUTAL_FIXTURE_PATHS)(
    '%s satisfies budget, caster, terrain, and productive-offer invariants before its pin',
    (path) => {
      const frozen = room(path);
      expect(generatedRoomIntegrityViolations(frozen, inputs.fixtures.readText(path))).toEqual([]);
      expect(brutalRoomMembershipViolations(frozen)).toEqual([]);
    },
  );

  it('second_family_uses_primary_seed: rejects primary or previously used seed namespaces', () => {
    const changed = structuredClone(manifest());
    const hard = changed.cohorts.find((cohort) => cohort.difficulty === 'hard');
    if (hard === undefined) throw new Error('missing hard cohort');
    hard.fixtures[0] = { ...hard.fixtures[0]!, seed: 5_117_001 };
    expect(codes(changed)).toContain('cohort_seed_range');
    expect(codes(changed)).toContain('seed_overlap');
  });

  it('brutal_membership_checks_name_only: rejects structural failures even with the roster names intact', () => {
    const brutal = structuredClone(room(BRUTAL_FIXTURE_PATHS[0]));
    const lastMonster = brutal.encounter.state.combatants.findLast((combatant) =>
      combatant.profile.kind === 'monster');
    if (lastMonster === undefined) throw new Error('missing brutal monster');
    const broken: GeneratedRoom = {
      ...brutal,
      encounter: {
        ...brutal.encounter,
        state: {
          ...brutal.encounter.state,
          combatants: brutal.encounter.state.combatants.map((combatant) =>
            combatant.profile.id === lastMonster.profile.id
              ? { ...combatant, hitPoints: 0, life: 'dead' }
              : combatant),
        },
      },
      spec: {
        ...brutal.spec,
        challengeBudgetEighths: brutal.spec.challengeBudgetEighths + 1,
        terrain: [],
      },
    };
    expect(brutalRoomMembershipViolations(broken).map((violation) => violation.code))
      .toEqual(expect.arrayContaining(['brutal_budget', 'brutal_terrain', 'brutal_productivity']));
  });

  it('rejects missing or rewritten supervisor ledger evidence', () => {
    const changed = structuredClone(manifest());
    changed.ledgerEntry = '';
    expect(codes(changed)).toContain('ledger_evidence');
  });

  it('rejects fixture bytes that no longer match the manifest hash', () => {
    const changedBytes = `${fixtureBytes.get(HARD_FIXTURE_PATHS[0]) ?? ''} `;
    expect(codes(manifest(), access({
      readFixture: (path) => path === HARD_FIXTURE_PATHS[0]
        ? changedBytes
        : access().readFixture(path),
    }))).toContain('fixture_hash');
  });

  it('seed_hash_without_properties: a matching digest cannot excuse failed membership', () => {
    const changed = structuredClone(manifest());
    const hardCohort = changed.cohorts.find((cohort) => cohort.difficulty === 'hard');
    const entry = hardCohort?.fixtures[0];
    if (entry === undefined) throw new Error('missing hard fixture entry');
    const original = room(HARD_FIXTURE_PATHS[0]);
    const { hardFeatures: _removedHardFeatures, ...specWithoutHardFeatures } = original.spec;
    const invalid: GeneratedRoom = {
      ...original,
      spec: specWithoutHardFeatures,
    };
    const invalidBytes = `${canonicalJson(invalid)}\n`;
    entry.sha256 = sha256(invalidBytes);
    expect(codes(changed, access({
      readFixture: (path) => path === entry.path ? invalidBytes : access().readFixture(path),
      regenerate: (seed, difficulty, generation) => seed === entry.seed
        ? invalidBytes
        : canonicalD569SecondFamilyRegeneration(seed, difficulty, generation),
    }))).toContain('hard_chokepoint_structure');
  });

  it('second_generation_not_compared: rejects a divergent independent regeneration', () => {
    const targetSeed = D569_SECOND_FAMILY_SEEDS.hard[0];
    expect(codes(manifest(), access({
      regenerate: (seed, difficulty, generation) => {
        const regenerated = canonicalD569SecondFamilyRegeneration(seed, difficulty, generation);
        return seed === targetSeed && generation === 2 ? `${regenerated} ` : regenerated;
      },
    }))).toContain('independent_regeneration');
  });
});
