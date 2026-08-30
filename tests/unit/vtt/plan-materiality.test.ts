import { describe, expect, it } from 'vitest';
import type { EncounterState } from '../../../src/combat/encounter';
import { combatantId, engineZoneId } from '../../../src/combat/values';
import type { EngineTurnIntent } from '../../../src/vtt/intent-resolver';
import { loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
import {
  comparePlanRelevanceSnapshots,
  createPlanRelevanceRecord,
  evaluatePlanMateriality,
  hashPlanRelevanceRecord,
  PLAN_MATERIALITY_POLICY_HASH,
  type PlanRelevanceRecord,
  type PlanRelevanceSnapshot,
} from '../../../src/vtt/plan-materiality';

const monster = combatantId('combatant:materiality-monster');
const player = combatantId('combatant:materiality-player');
const other = combatantId('combatant:materiality-other');
const zone = engineZoneId('zone:materiality-anchor');

function record(): PlanRelevanceRecord {
  return {
    policy: 'plan-relevance-v1',
    openMonsterActorIds: [monster],
    intents: [{
      actorId: monster,
      selectedBranch: 'primary',
      primary: {
        valid: true,
        resolvedAction: 'claw',
        resolvedTarget: player,
        refusalCodes: [],
        movementCostBucketFeet: 0,
      },
      fallback: null,
    }],
    lifeStates: [
      { combatantId: monster, life: 'living' },
      { combatantId: player, life: 'living' },
      { combatantId: other, life: 'living' },
    ],
    relevantCombatants: [
      {
        combatantId: monster,
        life: 'living', boardPresent: true, position: { column: 0, row: 0 },
        conditionFlags: [], concentrating: false,
      },
      {
        combatantId: player,
        life: 'living', boardPresent: true, position: { column: 2, row: 0 },
        conditionFlags: [], concentrating: false,
      },
    ],
    referencedSemanticZones: [{ zoneId: zone, active: true }],
    relevantTurnEvents: [],
  };
}

function snapshot(value: PlanRelevanceRecord): PlanRelevanceSnapshot {
  return { record: value, digest: hashPlanRelevanceRecord(value) };
}

function compare(after: PlanRelevanceRecord) {
  return comparePlanRelevanceSnapshots(snapshot(record()), snapshot(after));
}

function replaceRelevant(
  source: PlanRelevanceRecord,
  id: typeof monster | typeof player,
  update: Partial<PlanRelevanceRecord['relevantCombatants'][number]>,
): PlanRelevanceRecord {
  return {
    ...source,
    relevantCombatants: source.relevantCombatants.map((entry) =>
      entry.combatantId === id ? { ...entry, ...update } : entry),
  };
}

describe('plan-relevance-v1 materiality policy', () => {
  it('persists canonical record and policy hashes stably', () => {
    const first = record();
    const second: PlanRelevanceRecord = {
      ...record(),
      openMonsterActorIds: [...record().openMonsterActorIds],
      relevantCombatants: record().relevantCombatants.map((entry) => ({ ...entry })),
    };

    expect(hashPlanRelevanceRecord(second)).toBe(hashPlanRelevanceRecord(first));
    expect(PLAN_MATERIALITY_POLICY_HASH).toMatch(/^[0-9a-f]{64}$/u);
  });

  it('wake rule 1: detects a life-state transition and ignores a state with unchanged life', () => {
    const changed: PlanRelevanceRecord = {
      ...record(),
      lifeStates: record().lifeStates.map((entry) =>
        entry.combatantId === other ? { ...entry, life: 'dying' } : entry),
    };

    expect(compare(changed).reasonCodes).toContain('LIFE_STATE_CHANGED');
    expect(compare(record()).reasonCodes).not.toContain('LIFE_STATE_CHANGED');
  });

  it('wake rule 2: detects an open-monster-set change and ignores an unchanged set', () => {
    const changed: PlanRelevanceRecord = {
      ...record(), openMonsterActorIds: [monster, other],
    };

    expect(compare(changed).reasonCodes).toContain('OPEN_MONSTER_SET_CHANGED');
    expect(compare(record()).reasonCodes).not.toContain('OPEN_MONSTER_SET_CHANGED');
  });

  it('wake rule 3: detects an intent signature change and ignores path drift in the same bucket', () => {
    const changed: PlanRelevanceRecord = {
      ...record(),
      intents: record().intents.map((intent) => ({
        ...intent,
        primary: { ...intent.primary, resolvedTarget: other },
      })),
    };
    const pathOnly = replaceRelevant(record(), monster, { position: { column: 1, row: 0 } });

    expect(compare(changed).reasonCodes).toContain('INTENT_RESOLUTION_CHANGED');
    expect(compare(pathOnly).reasonCodes).not.toContain('INTENT_RESOLUTION_CHANGED');
  });

  it('wake rule 4: detects a condition on a relevant combatant and ignores unrelated condition drift', () => {
    const changed = replaceRelevant(record(), player, { conditionFlags: [{ name: 'Prone' }] });
    const unrelated = record();

    expect(compare(changed).reasonCodes).toContain('RELEVANT_CONDITION_CHANGED');
    expect(compare(unrelated).reasonCodes).not.toContain('RELEVANT_CONDITION_CHANGED');
  });

  it('wake rule 5: detects a concentration-break event and ignores concentration state alone', () => {
    const changed: PlanRelevanceRecord = {
      ...record(),
      relevantTurnEvents: [{ kind: 'concentration_broken', combatantId: other }],
    };
    const stateAlone = replaceRelevant(record(), player, { concentrating: true });

    expect(compare(changed).reasonCodes).toContain('CONCENTRATION_BROKEN');
    expect(compare(stateAlone).reasonCodes).not.toContain('CONCENTRATION_BROKEN');
  });

  it('wake rule 6: wakes at 10 feet of forced displacement but not at 5 feet', () => {
    const tenFeet: PlanRelevanceRecord = {
      ...record(),
      relevantTurnEvents: [{ kind: 'forced_displacement', combatantId: player, distanceFeet: 10 }],
    };
    const fiveFeet: PlanRelevanceRecord = {
      ...record(),
      relevantTurnEvents: [{ kind: 'forced_displacement', combatantId: player, distanceFeet: 5 }],
    };

    expect(compare(tenFeet).reasonCodes).toContain('FORCED_DISPLACEMENT_AT_LEAST_10_FEET');
    const ignored = compare(fiveFeet);
    expect(ignored.reasonCodes).not.toContain('FORCED_DISPLACEMENT_AT_LEAST_10_FEET');
    expect(ignored.material).toBe(false);
    expect(ignored.afterDigest).not.toBe(ignored.beforeDigest);
  });

  it('wake rule 7: detects relevant board disappearance and zone deactivation, not ordinary repositioning', () => {
    const disappeared = replaceRelevant(record(), player, { boardPresent: false, position: null });
    const inactive: PlanRelevanceRecord = {
      ...record(), referencedSemanticZones: [{ zoneId: zone, active: false }],
    };
    const repositioned = replaceRelevant(record(), player, { position: { column: 3, row: 0 } });

    expect(compare(disappeared).reasonCodes).toContain('RELEVANT_COMBATANT_DISAPPEARED');
    expect(compare(inactive).reasonCodes).toContain('REFERENCED_SEMANTIC_ZONE_BECAME_INACTIVE');
    expect(compare(repositioned).reasonCodes).toEqual([]);
  });

  it('uses resolver-backed projections while HP damage alone remains deliberately immaterial', async () => {
    const beforeState = await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');
    const actor = beforeState.combatants.find((candidate) => candidate.profile.kind === 'monster');
    const target = beforeState.combatants.find((candidate) => candidate.profile.kind === 'player_character');
    if (actor === undefined || target === undefined) throw new Error('Fixture lacks materiality actors.');
    const intent: EngineTurnIntent = {
      actorId: actor.profile.id,
      choice: { kind: 'dodge' },
      movement: { willingness: 'none', opportunityRisk: 'avoid' },
      engagement: {
        stance: 'hold_position',
        anchor: { kind: 'combatant', combatantId: target.profile.id },
      },
      fallback: null,
    };
    const afterState: EncounterState = {
      ...beforeState,
      combatants: beforeState.combatants.map((combatant) =>
        combatant.profile.id === target.profile.id
          ? { ...combatant, hitPoints: combatant.hitPoints - 1 }
          : combatant),
    };
    const context = {
      openMonsterActorIds: [actor.profile.id],
      remainingIntents: [intent],
      explicitEngagementAnchors: [{ kind: 'combatant', combatantId: target.profile.id }],
    } as const;

    const result = evaluatePlanMateriality({
      before: { state: beforeState, ...context },
      after: { state: afterState, ...context },
    });

    expect(result.material).toBe(false);
    expect(result.reasonCodes).toEqual([]);
    expect(result.beforeDigest).toBe(result.afterDigest);
  });

  it.each([
    'temporary HP alone',
    'voluntary movement under 10 feet',
    'reaction availability alone',
    'a condition on an unrelated combatant',
    'different legal paths with the same target and movement bucket',
    'narration or hidden-roll presentation',
    'dice values',
    'PC plan deviation without material drift',
  ])('deliberately ignores %s', () => {
    expect(compare(record())).toEqual(expect.objectContaining({ material: false, reasonCodes: [] }));
  });

  it('canonicalizes open actors, intents, conditions, and turn events before hashing', async () => {
    const state = await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');
    const actor = state.combatants.find((candidate) => candidate.profile.kind === 'monster');
    if (actor === undefined) throw new Error('Fixture lacks a monster.');
    const intent: EngineTurnIntent = {
      actorId: actor.profile.id,
      choice: { kind: 'dodge' },
      movement: { willingness: 'none', opportunityRisk: 'avoid' },
      engagement: { stance: 'hold_position' },
      fallback: null,
    };

    const first = createPlanRelevanceRecord({
      state,
      openMonsterActorIds: [actor.profile.id, actor.profile.id],
      remainingIntents: [intent],
    });
    const second = createPlanRelevanceRecord({
      state,
      openMonsterActorIds: [actor.profile.id],
      remainingIntents: [intent],
    });

    expect(first).toEqual(second);
    expect(hashPlanRelevanceRecord(first)).toBe(hashPlanRelevanceRecord(second));
  });
});
