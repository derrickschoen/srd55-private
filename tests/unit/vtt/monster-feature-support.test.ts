import { describe, expect, it } from 'vitest';
import { createEncounter } from '../../../src/combat/encounter';
import { monsterCombatantProfile } from '../../../src/combat/combatant';
import { declaredMonsterTraits } from '../../../src/combat/monster-traits';
import { WIGHT } from '../../../src/combat/statblocks/undead-crypt';
import {
  exactDmIntelMatrix,
  renderDmIntelRow,
} from '../../../src/vtt/dm-tactical-intel';
import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
import {
  monsterTraitSupportRows,
  type FeatureSupportDisposition,
} from '../../../src/vtt/monster-feature-support';
import {
  createEngineMcpRuntime,
  freshMonsterPlanningState,
  loadArenaFixture,
} from '../../../src/vtt/mcp/entrypoint';
import { generateRoom } from '../../../src/vtt/room-generator';
import { placedToken, playerProfile } from '../combat/fixtures';

const DISPOSITIONS = [
  'modeled',
  'offered_with_omission',
  'human_only_unmodeled',
  'encounter_not_applicable',
] as const satisfies readonly FeatureSupportDisposition['kind'][];

describe('monster feature support dispositions', () => {
  it('sunlight_sensitivity_preflight_and_intel_flag: reports no sunlight state without projecting light mechanics', () => {
    const wight = monsterCombatantProfile(WIGHT, {
      combatantId: 'combatant:sunlight-wight', tokenId: 'token:sunlight-wight',
    });
    const target = playerProfile('sunlight-target', { initiativeBonus: -20 });
    const state = freshMonsterPlanningState(createEncounter({
      bounds: { columns: 4, rows: 1 },
      combatants: [wight, target],
      tokens: [placedToken(wight, 0), placedToken(target, 1)],
    }));
    const preflightRows = monsterTraitSupportRows(state, wight.id);
    const sunlight = preflightRows.find((row) => row.feature.trait === 'sunlight_sensitivity');
    expect(sunlight).toEqual({
      feature: { kind: 'trait', trait: 'sunlight_sensitivity' },
      disposition: { kind: 'encounter_not_applicable', reason: 'no_sunlight_state' },
    });

    const runtime = createEngineMcpRuntime(state, { requestedActorIds: [wight.id] });
    const intel = exactDmIntelMatrix(
      state,
      runtime.feed.current(),
      canonicalEngineQueryPort,
      [wight.id],
    );
    expect(intel.length).toBeGreaterThan(0);
    for (const row of intel) expect(row.featureSupportFlags).toContainEqual(sunlight);
    expect(renderDmIntelRow(intel[0]!)).toMatchObject({
      feature_support_flags: [sunlight],
    });
  });

  it('thirty_room_trait_preflight: classifies every declared roster trait with a closed disposition', async () => {
    const fixturePaths = [
      ...Array.from({ length: 10 }, (_unused, index) =>
        `tests/fixtures/arena-basis-brutal/seed-${String(6_203_001 + index)}.json`),
      ...Array.from({ length: 10 }, (_unused, index) =>
        `tests/fixtures/arena-basis-hard/seed-${String(5_117_001 + index)}.json`),
    ];
    const fixtureStates = await Promise.all(fixturePaths.map(loadArenaFixture));
    const generatedStates = Array.from({ length: 10 }, (_unused, index) =>
      generateRoom(6_204_001 + index).encounter.state);
    const states = [...fixtureStates, ...generatedStates];
    const seenTraits = new Set<string>();

    expect(states).toHaveLength(30);
    for (const state of states) {
      for (const actor of state.combatants.filter((candidate) => candidate.profile.kind === 'monster')) {
        const traits = declaredMonsterTraits(state, actor.profile.id);
        const rows = monsterTraitSupportRows(state, actor.profile.id);
        expect(rows).toHaveLength(traits.length);
        for (const row of rows) {
          seenTraits.add(row.feature.trait);
          expect(DISPOSITIONS).toContain(row.disposition.kind);
        }
      }
    }

    expect(seenTraits.has('sunlight_sensitivity')).toBe(true);
  });
});
