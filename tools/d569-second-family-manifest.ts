import { canonicalJson } from '../src/commands/canonical-json';
import { combatantSpace, reduceEncounter } from '../src/combat/encounter';
import { spacesIntersect } from '../src/combat/creature-space';
import { mulberry32 } from '../src/combat/random';
import { BUNDLED_MONSTER_ROSTER, STARTER_MONSTER_ROSTER } from '../src/combat/statblocks/roster';
import { spellDefinition } from '../src/combat/spells/definitions';
import { sha256 } from '../src/crypto/sha256';
import { d466GeneratedRoomOverride } from '../src/vtt/d466-room-overrides';
import { availableEngineActorOptions, resolveEngineActorOption } from '../src/vtt/intent-resolver';
import { decodeArenaFixtureText } from '../src/vtt/mcp/entrypoint';
import { freshMonsterPlanningState } from '../src/vtt/monster-planning-state';
import {
  BRUTAL_CHALLENGE_BUDGET_SCALE,
  BRUTAL_TERRAIN_FEATURE_COUNT_BAND,
  generateRoom,
  type GeneratedRoom,
  type RoomDifficultyProfile,
} from '../src/vtt/room-generator';
import { z } from 'zod';

export const D569_SECOND_FAMILY_LEDGER_ENTRY =
  'seed ranges 5118001-5118010 and 6207001-6207010 have no occurrence in .claude/decisions.md, tests/fixtures or tools as of 2026-09-07 (supervisor grep); ranges 5117xxx, 6203xxx, 6204xxx, 6206xxx and 6208xxx are used (primary hard, primary brutal, D466 override/protocol, D572 brutal-b, D572 pool)' as const;

export const D569_SECOND_FAMILY_SEEDS = {
  hard: [
    5_118_001, 5_118_002, 5_118_003, 5_118_004, 5_118_005,
    5_118_006, 5_118_007, 5_118_008, 5_118_009, 5_118_010,
  ],
  brutal: [
    6_207_001, 6_207_002, 6_207_003, 6_207_004, 6_207_005,
    6_207_006, 6_207_007, 6_207_008, 6_207_009, 6_207_010,
  ],
} as const;

export const D569_USED_SEED_NAMESPACES = [
  { label: '5117xxx', start: 5_117_000, end: 5_117_999 },
  { label: '6203xxx', start: 6_203_000, end: 6_203_999 },
  { label: '6204xxx', start: 6_204_000, end: 6_204_999 },
  { label: '6206xxx', start: 6_206_000, end: 6_206_999 },
  { label: '6208xxx', start: 6_208_000, end: 6_208_999 },
] as const;

const manifestSchema = z.strictObject({
  version: z.literal('d569-second-family-manifest-v1'),
  generator: z.strictObject({
    tool: z.literal('tools/generate-arena-basis.ts'),
    canonicalFormat: z.literal('canonical-json-with-trailing-newline'),
    independentRegenerations: z.literal(2),
  }),
  ledgerEntry: z.string(),
  usedSeedNamespaces: z.array(z.strictObject({
    label: z.string(),
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
  })),
  cohorts: z.array(z.strictObject({
    difficulty: z.enum(['hard', 'brutal']),
    directory: z.string(),
    fixtures: z.array(z.strictObject({
      seed: z.number().int().nonnegative(),
      path: z.string(),
      sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    })),
  })),
});

export type D569SecondFamilyManifest = z.infer<typeof manifestSchema>;
export type D569SecondFamilyDifficulty = keyof typeof D569_SECOND_FAMILY_SEEDS;

export interface D569SecondFamilyValidationAccess {
  readonly readFixture: (path: string) => string;
  readonly regenerate: (
    seed: number,
    difficulty: D569SecondFamilyDifficulty,
    generation: 1 | 2,
  ) => string;
}

export interface D569SecondFamilyViolation {
  readonly code: string;
  readonly message: string;
}

function addViolation(
  violations: D569SecondFamilyViolation[],
  condition: boolean,
  code: string,
  message: string,
): void {
  if (!condition) violations.push({ code, message });
}

function cellsInBounds(
  cells: readonly { readonly column: number; readonly row: number }[],
  bounds: { readonly columns: number; readonly rows: number },
): boolean {
  return cells.every((cell) =>
    Number.isInteger(cell.column) && Number.isInteger(cell.row) &&
    cell.column >= 0 && cell.column < bounds.columns &&
    cell.row >= 0 && cell.row < bounds.rows);
}

/** Shared state/reducer invariants for the existing generator suite and D569 freeze. */
export function generatedRoomIntegrityViolations(
  room: GeneratedRoom,
  fixtureBytes: string = `${canonicalJson(room)}\n`,
): readonly D569SecondFamilyViolation[] {
  const violations: D569SecondFamilyViolation[] = [];
  const state = room.encounter.state;
  addViolation(
    violations,
    state.bounds.columns === room.spec.dimensions.columns &&
      state.bounds.rows === room.spec.dimensions.rows,
    'dimension_mismatch',
    `seed ${String(room.spec.seed)} spec and encounter bounds differ`,
  );
  addViolation(
    violations,
    cellsInBounds(room.spec.blockedCells, state.bounds),
    'blocked_cell_invalid',
    `seed ${String(room.spec.seed)} has an out-of-bounds blocked cell`,
  );

  const combatantIds = new Set(state.combatants.map((combatant) => String(combatant.profile.id)));
  const tokenIds = state.tokens.map((token) => String(token.id));
  addViolation(
    violations,
    new Set(tokenIds).size === tokenIds.length && state.tokens.length === state.combatants.length,
    'token_set_invalid',
    `seed ${String(room.spec.seed)} has missing or duplicate tokens`,
  );
  addViolation(
    violations,
    state.tokens.every((token) =>
      combatantIds.has(String(token.combatantId)) && cellsInBounds([token.position], state.bounds)),
    'token_position_invalid',
    `seed ${String(room.spec.seed)} has an invalid token position or combatant reference`,
  );
  try {
    const spaces = state.tokens.map((token) => ({
      token,
      space: combatantSpace(state, token.combatantId),
    }));
    const blocked = new Set(state.blockedCells.map((cell) => `${String(cell.column)},${String(cell.row)}`));
    addViolation(
      violations,
      spaces.every(({ space }) => cellsInBounds(space.cells, state.bounds) &&
        space.cells.every((cell) => !blocked.has(`${String(cell.column)},${String(cell.row)}`))),
      'token_footprint_invalid',
      `seed ${String(room.spec.seed)} has an out-of-bounds or blocked creature footprint`,
    );
    addViolation(
      violations,
      spaces.every((left, leftIndex) => spaces.slice(leftIndex + 1).every((right) =>
        !spacesIntersect(left.space, right.space))),
      'token_footprint_overlap',
      `seed ${String(room.spec.seed)} has overlapping creature footprints`,
    );
  } catch (error) {
    violations.push({
      code: 'token_footprint_invalid',
      message: `seed ${String(room.spec.seed)} has an undecodable creature footprint: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  const environmentRegions = [
    ...state.environment.difficultTerrainRegions,
    ...state.environment.lightRegions,
    ...state.environment.obscurementRegions,
    ...(state.environment.movementRegions ?? []),
    ...(state.environment.narrowOpeningRegions ?? []),
  ];
  const regionIds = environmentRegions.map((region) => region.id);
  addViolation(
    violations,
    new Set(regionIds).size === regionIds.length && environmentRegions.every((region) =>
      region.id.trim().length > 0 && region.cells.length > 0 && cellsInBounds(region.cells, state.bounds)),
    'environment_region_invalid',
    `seed ${String(room.spec.seed)} has an empty, duplicate, or out-of-bounds environment region`,
  );

  try {
    const loaded = decodeArenaFixtureText(fixtureBytes);
    const reduced = reduceEncounter(loaded, { type: 'roll_initiative' }, mulberry32(901));
    addViolation(
      violations,
      reduced.state.revision === loaded.revision + 1 &&
        reduced.state.initiative.length === loaded.combatants.length,
      'reducer_load_invalid',
      `seed ${String(room.spec.seed)} did not initialize through the encounter reducer`,
    );
  } catch (error) {
    violations.push({
      code: 'reducer_load_invalid',
      message: `seed ${String(room.spec.seed)} failed reducer loading: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
  return violations;
}

function executableControlCaster(room: GeneratedRoom): boolean {
  return room.spec.monsterRoster.some((entry) => {
    const row = STARTER_MONSTER_ROSTER.find((candidate) => candidate.id === entry.statblockId);
    const actions = row?.statblock.sourceDetails.actions;
    return actions?.kind === 'present' && actions.value.some((action) =>
      action.kind === 'spellcasting' && action.execution?.kind !== 'absent' &&
      action.spells.some((spell) => {
        const definition = spell.manifestStatus === 'implemented' ? spellDefinition(spell.id) : undefined;
        return definition?.operation.kind === 'persistent_area' &&
          definition.operation.hooks.some((hook) => hook.effect.kind === 'save_gated') &&
          definition.operation.hooks.some((hook) =>
            hook.effect.kind === 'automatic' && hook.effect.payload.kind === 'effect' &&
            hook.effect.payload.payload.kind === 'movement_modifier');
      }));
  });
}

/** State-derived hard membership; hashes and seed names are deliberately not inputs. */
export function hardRoomMembershipViolations(
  room: GeneratedRoom,
): readonly D569SecondFamilyViolation[] {
  const violations: D569SecondFamilyViolation[] = [];
  const roster = room.spec.monsterRoster;
  const rosterIds = new Set(roster.map((entry) => entry.statblockId));
  const budgetGap = room.spec.challengeBudgetEighths - room.spec.challengeSpentEighths;
  addViolation(violations, room.spec.difficultyProfile === 'hard', 'hard_difficulty', 'room is not tagged hard');
  addViolation(
    violations,
    roster.length >= 4 && roster.length <= 7 && budgetGap >= 0 && budgetGap <= 8,
    'hard_roster_budget',
    'hard roster must contain 4-7 monsters and spend within its generated budget band',
  );
  addViolation(
    violations,
    executableControlCaster(room) && rosterIds.has('statblock:guard') && rosterIds.has('statblock:scout'),
    'hard_required_roles',
    'hard roster must contain an executable control caster plus Guard and Scout',
  );

  const difficultRegions = room.spec.terrain.filter((feature) =>
    feature.kind === 'difficult-terrain-patch');
  const hardFeatures = room.spec.hardFeatures;
  const [gate] = hardFeatures?.chokepointCells ?? [];
  const barrier = gate === undefined ? [] : room.spec.blockedCells.filter((cell) => cell.column === gate.column);
  addViolation(
    violations,
    hardFeatures?.shape === 'single-gate' && hardFeatures.chokepointCells.length === 1 &&
      gate !== undefined && barrier.length === room.spec.dimensions.rows - 1 &&
      !barrier.some((cell) => cell.row === gate.row) && difficultRegions.length >= 1 &&
      hardFeatures.likelyApproachTerrainRegionIds.length > 0 &&
      hardFeatures.likelyApproachTerrainRegionIds.every((id) =>
        difficultRegions.some((region) => region.id === id && region.cells.length > 0)),
    'hard_chokepoint_structure',
    'hard room must retain its single-gate barrier, chokepoint, and approach difficult terrain',
  );
  return violations;
}

function executableCaster(room: GeneratedRoom): boolean {
  return room.spec.monsterRoster.some((entry) => {
    const row = BUNDLED_MONSTER_ROSTER.find((candidate) => candidate.id === entry.statblockId);
    const actions = row?.statblock.sourceDetails.actions;
    return actions?.kind === 'present' && actions.value.some((action) =>
      action.kind === 'spellcasting' && action.execution?.kind !== 'absent' &&
      action.spells.some((spell) => spell.manifestStatus === 'implemented'));
  });
}

function everyMonsterProductive(room: GeneratedRoom): boolean {
  const planningState = freshMonsterPlanningState(room.encounter.state);
  return planningState.combatants
    .filter((combatant) => combatant.profile.kind === 'monster')
    .every((monster) => availableEngineActorOptions(planningState, monster.profile.id)
      .some((option) => {
        const resolution = resolveEngineActorOption(planningState, option);
        return resolution.valid && (resolution.mechanics.movementCostFeet > 0 ||
          resolution.mechanics.actionSlots.some((slot) =>
            slot.kind === 'attack' || slot.kind === 'saving_throw' || slot.kind === 'cast_spell' ||
            slot.kind === 'use_world_object'));
      }));
}

/** State-derived brutal membership; hashes and creature names alone cannot satisfy it. */
export function brutalRoomMembershipViolations(
  room: GeneratedRoom,
  sameSeedHard: GeneratedRoom = generateRoom(room.spec.seed, { difficulty: 'hard' }),
): readonly D569SecondFamilyViolation[] {
  const violations: D569SecondFamilyViolation[] = [];
  addViolation(violations, room.spec.difficultyProfile === 'brutal', 'brutal_difficulty', 'room is not tagged brutal');
  addViolation(
    violations,
    room.spec.challengeBudgetEighths ===
      sameSeedHard.spec.challengeBudgetEighths * BRUTAL_CHALLENGE_BUDGET_SCALE &&
      room.spec.challengeSpentEighths >= room.spec.challengeBudgetEighths * 0.9 &&
      room.spec.challengeSpentEighths <= room.spec.challengeBudgetEighths,
    'brutal_budget',
    'brutal budget must be scaled from hard and spend 90-100 percent',
  );
  addViolation(
    violations,
    executableCaster(room),
    'brutal_caster',
    'brutal roster must contain an executable implemented caster',
  );

  const terrainCounts = {
    difficult: room.spec.terrain.filter((feature) => feature.kind === 'difficult-terrain-patch').length,
    hazards: room.spec.terrain.filter((feature) => feature.kind === 'hazard-object').length,
    lights: room.spec.terrain.filter((feature) => feature.kind === 'light-source').length,
    obscurement: room.spec.terrain.filter((feature) => feature.kind === 'obscurement-patch').length,
  };
  const terrainTotal = Object.values(terrainCounts).reduce((total, count) => total + count, 0);
  addViolation(
    violations,
    terrainCounts.difficult >= 3 && terrainCounts.hazards >= 3 && terrainCounts.lights >= 2 &&
      terrainCounts.obscurement >= 2 &&
      terrainTotal >= BRUTAL_TERRAIN_FEATURE_COUNT_BAND.minimum &&
      terrainTotal <= BRUTAL_TERRAIN_FEATURE_COUNT_BAND.maximum &&
      room.spec.terrain.length > sameSeedHard.spec.terrain.length,
    'brutal_terrain',
    'brutal terrain must meet every configured minimum/count band and exceed hard density',
  );
  addViolation(
    violations,
    everyMonsterProductive(room),
    'brutal_productivity',
    'every brutal monster must have a productive first-turn offer',
  );
  return violations;
}

function expectedDirectory(difficulty: D569SecondFamilyDifficulty): string {
  return `tests/fixtures/arena-basis-${difficulty}-2`;
}

function sameNamespace(
  actual: readonly { readonly label: string; readonly start: number; readonly end: number }[],
): boolean {
  return canonicalJson(actual) === canonicalJson(D569_USED_SEED_NAMESPACES);
}

/**
 * Validates the pins only after state membership and two independent canonical
 * regenerations. It is pure/model-free; callers provide repository bytes.
 */
export function validateD569SecondFamilyManifest(
  input: unknown,
  access: D569SecondFamilyValidationAccess,
): readonly D569SecondFamilyViolation[] {
  const decoded = manifestSchema.safeParse(input);
  if (!decoded.success) {
    return [{ code: 'manifest_shape', message: decoded.error.message }];
  }
  const manifest = decoded.data;
  const violations: D569SecondFamilyViolation[] = [];
  addViolation(
    violations,
    manifest.ledgerEntry === D569_SECOND_FAMILY_LEDGER_ENTRY,
    'ledger_evidence',
    'manifest must cite the supervisor ledger entry verbatim',
  );
  addViolation(
    violations,
    sameNamespace(manifest.usedSeedNamespaces),
    'used_seed_ledger',
    'manifest must list every used seed namespace from the supervisor ledger',
  );
  addViolation(
    violations,
    manifest.cohorts.length === 2 && new Set(manifest.cohorts.map((cohort) => cohort.difficulty)).size === 2,
    'cohort_set',
    'manifest must contain exactly one hard and one brutal cohort',
  );

  const seenSeeds = new Set<number>();
  for (const difficulty of ['hard', 'brutal'] as const) {
    const cohort = manifest.cohorts.find((candidate) => candidate.difficulty === difficulty);
    if (cohort === undefined) continue;
    const expectedSeeds = D569_SECOND_FAMILY_SEEDS[difficulty];
    addViolation(
      violations,
      cohort.directory === expectedDirectory(difficulty),
      'cohort_directory',
      `${difficulty} cohort directory is not the frozen second-family directory`,
    );
    addViolation(
      violations,
      canonicalJson(cohort.fixtures.map((fixture) => fixture.seed)) === canonicalJson(expectedSeeds),
      'cohort_seed_range',
      `${difficulty} cohort must contain its exact ten contiguous second-family seeds`,
    );

    for (const [index, fixture] of cohort.fixtures.entries()) {
      const expectedSeed = expectedSeeds[index];
      addViolation(
        violations,
        !seenSeeds.has(fixture.seed),
        'duplicate_seed',
        `seed ${String(fixture.seed)} appears more than once`,
      );
      seenSeeds.add(fixture.seed);
      for (const namespace of manifest.usedSeedNamespaces) {
        addViolation(
          violations,
          fixture.seed < namespace.start || fixture.seed > namespace.end,
          'seed_overlap',
          `seed ${String(fixture.seed)} overlaps used namespace ${namespace.label}`,
        );
      }
      addViolation(
        violations,
        d466GeneratedRoomOverride(fixture.seed) === null,
        'generator_override',
        `seed ${String(fixture.seed)} is subject to a generator override`,
      );
      if (expectedSeed === undefined || fixture.seed !== expectedSeed) continue;

      const expectedPath = `${cohort.directory}/seed-${String(fixture.seed)}.json`;
      addViolation(
        violations,
        fixture.path === expectedPath,
        'fixture_path',
        `seed ${String(fixture.seed)} has a non-canonical fixture path`,
      );
      let fixtureBytes: string;
      try {
        fixtureBytes = access.readFixture(fixture.path);
      } catch (error) {
        violations.push({
          code: 'fixture_missing',
          message: `cannot read ${fixture.path}: ${error instanceof Error ? error.message : String(error)}`,
        });
        continue;
      }
      addViolation(
        violations,
        sha256(fixtureBytes) === fixture.sha256,
        'fixture_hash',
        `seed ${String(fixture.seed)} fixture hash changed`,
      );

      try {
        const room = JSON.parse(fixtureBytes) as GeneratedRoom;
        addViolation(
          violations,
          room.spec.seed === fixture.seed,
          'fixture_seed',
          `seed ${String(fixture.seed)} fixture contains a different seed`,
        );
        violations.push(...generatedRoomIntegrityViolations(room, fixtureBytes));
        violations.push(...(difficulty === 'hard'
          ? hardRoomMembershipViolations(room)
          : brutalRoomMembershipViolations(room)));
      } catch (error) {
        violations.push({
          code: 'fixture_parse',
          message: `seed ${String(fixture.seed)} fixture is invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
        });
      }

      const firstGeneration = access.regenerate(fixture.seed, difficulty, 1);
      const secondGeneration = access.regenerate(fixture.seed, difficulty, 2);
      addViolation(
        violations,
        firstGeneration === fixtureBytes,
        'first_regeneration',
        `seed ${String(fixture.seed)} first canonical regeneration differs from the fixture`,
      );
      addViolation(
        violations,
        secondGeneration === firstGeneration && secondGeneration === fixtureBytes,
        'independent_regeneration',
        `seed ${String(fixture.seed)} independent canonical regeneration differs`,
      );
    }
  }
  return violations;
}

export function canonicalD569SecondFamilyRegeneration(
  seed: number,
  difficulty: D569SecondFamilyDifficulty,
  _generation: 1 | 2,
): string {
  return `${canonicalJson(generateRoom(seed, { difficulty: difficulty as RoomDifficultyProfile }))}\n`;
}
