import { describe, expect, it } from 'vitest';
import type { CombatantProfile } from '../../../src/combat/combatant';
import { createEncounter, type EncounterState } from '../../../src/combat/encounter';
import { effectStackingIdentity, encounterEffectId } from '../../../src/combat/values';
import {
  ACTOR_KNOWLEDGE_POLICY,
  projectActorKnowledge,
  type ActorTargetKnowledge,
} from '../../../src/vtt/intel/actor-knowledge';
import { declareTestInputs } from '../../helpers/test-inputs';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

declareTestInputs({});

function encounter(overrides: Partial<Pick<
  Parameters<typeof createEncounter>[0],
  'blockedCells' | 'foggedCells'
>> = {}): {
  readonly state: EncounterState;
  readonly actor: ReturnType<typeof monsterProfile>;
  readonly target: ReturnType<typeof playerProfile>;
} {
  const actor = monsterProfile('actor-knowledge-monster');
  const target = playerProfile('actor-knowledge-player');
  return {
    actor,
    target,
    state: createEncounter({
      bounds: { columns: 5, rows: 1 },
      combatants: [actor, target],
      tokens: [placedToken(actor, 0), placedToken(target, 2)],
      ...overrides,
    }),
  };
}

function onlyTarget(state: EncounterState, actor: CombatantProfile): ActorTargetKnowledge {
  const projection = projectActorKnowledge(state, actor.id);
  expect(projection.policy).toBe(ACTOR_KNOWLEDGE_POLICY);
  expect(projection.targets).toHaveLength(1);
  const target = projection.targets[0];
  if (target === undefined) throw new Error('Expected exactly one projected target.');
  return target;
}

describe('actor-knowledge-v3', () => {
  it('projects a visible target as perceived with its current position', () => {
    const setup = encounter();

    expect(onlyTarget(setup.state, setup.actor)).toEqual({
      kind: 'perceived',
      targetId: setup.target.id,
      placementStatus: 'placed',
      position: { column: 2, row: 0 },
      effectiveSize: 'Medium',
      placementMode: { kind: 'normal', actual: 'Medium' },
      footprint: [{ column: 2, row: 0 }],
      distanceFeet: 10,
      conditions: [],
      armorClass: { kind: 'perceived_band', band: 'guarded' },
      hitPoints: { kind: 'perceived_band', band: 'uninjured' },
      reciprocalVisibility: { kind: 'perceived', targetCanSeeActor: true },
      reaction: { kind: 'unknown' },
    });
  });

  it('projects PC actor knowledge as hand-computed bands without numeric AC or HP', () => {
    const actor = playerProfile('actor-knowledge-pc');
    const uninjured = monsterProfile('actor-knowledge-uninjured', { hitPoints: 12 });
    const bloodied = monsterProfile('actor-knowledge-bloodied', { hitPoints: 12 });
    const nearDeath = monsterProfile('actor-knowledge-near-death', { hitPoints: 12 });
    const created = createEncounter({
      bounds: { columns: 5, rows: 1 },
      combatants: [actor, uninjured, bloodied, nearDeath],
      tokens: [
        placedToken(actor, 0),
        placedToken(uninjured, 1),
        placedToken(bloodied, 2),
        placedToken(nearDeath, 3),
      ],
    });
    const state: EncounterState = {
      ...created,
      combatants: created.combatants.map((combatant) =>
        combatant.profile.id === bloodied.id
          ? { ...combatant, hitPoints: 7 }
          : combatant.profile.id === nearDeath.id
            ? { ...combatant, hitPoints: 3 }
            : combatant),
    };

    const projection = projectActorKnowledge(state, actor.id);
    expect(projection.policy).toBe('actor-knowledge-v3');
    expect(projection.targets.map((target) => target.kind === 'perceived'
      ? [target.targetId, target.armorClass, target.hitPoints]
      : [target.targetId, target.kind])).toEqual([
      [bloodied.id, { kind: 'perceived_band', band: 'lightly_defended' },
        { kind: 'perceived_band', band: 'bloodied' }],
      [nearDeath.id, { kind: 'perceived_band', band: 'lightly_defended' },
        { kind: 'perceived_band', band: 'near_death' }],
      [uninjured.id, { kind: 'perceived_band', band: 'lightly_defended' },
        { kind: 'perceived_band', band: 'uninjured' }],
    ]);
    for (const target of projection.targets) {
      if (target.kind !== 'perceived') throw new Error('Expected a perceived target.');
      expect('value' in target.armorClass).toBe(false);
      expect('value' in target.hitPoints).toBe(false);
    }
  });

  it('projects only visibly manifest conditions as positive markers', () => {
    const setup = encounter();
    const state: EncounterState = {
      ...setup.state,
      effects: [{
        id: encounterEffectId('effect:actor-knowledge-prone'),
        source: setup.actor.id,
        targets: [setup.target.id],
        createdRevision: 0,
        duration: { kind: 'permanent' },
        concentrationOwner: null,
        stackingIdentity: effectStackingIdentity('actor-knowledge-prone'),
        stacking: 'replace_same_source',
        repeatedSave: null,
        payload: { kind: 'condition', condition: 'Prone' },
      }],
    };

    expect(onlyTarget(state, setup.actor)).toMatchObject({
      kind: 'perceived',
      conditions: [{ kind: 'perceived', condition: 'Prone' }],
    });
  });

  it('observes a public reaction spend but never infers availability from no spend', () => {
    const setup = encounter();
    const unobserved: EncounterState = {
      ...setup.state,
      combatants: setup.state.combatants.map((combatant) =>
        combatant.profile.id === setup.target.id
          ? { ...combatant, turn: { ...combatant.turn, reactionAvailable: false } }
          : combatant),
    };
    expect(onlyTarget(unobserved, setup.actor)).toMatchObject({
      kind: 'perceived', reaction: { kind: 'unknown' },
    });

    const observed: EncounterState = {
      ...unobserved,
      eventLog: [
        { sequence: 1, type: 'turn_started', combatant: setup.target.id, round: 1 },
        {
          sequence: 2,
          type: 'resource_spent',
          combatant: setup.target.id,
          resource: 'reaction',
          purpose: 'Opportunity Attack',
        },
      ],
    };
    expect(onlyTarget(observed, setup.actor)).toMatchObject({
      kind: 'perceived', reaction: { kind: 'observed_spent' },
    });
  });

  it('redacts a hidden target rather than exposing its position', () => {
    const setup = encounter();
    const hidden: EncounterState = {
      ...setup.state,
      hiddenCombatants: [{ combatant: setup.target.id, stealthTotal: 18, edition: '2024' }],
    };

    const target = onlyTarget(hidden, setup.actor);
    expect(target).toMatchObject({ kind: 'unknown', targetId: setup.target.id });
    expect('position' in target).toBe(false);
  });

  it('redacts a target in fog even when ordinary detection could see its cell', () => {
    const setup = encounter({ foggedCells: [{ column: 2, row: 0 }] });

    expect(onlyTarget(setup.state, setup.actor)).toMatchObject({
      kind: 'unknown',
      targetId: setup.target.id,
    });
  });

  it('redacts a Large target only when fog covers its complete footprint', () => {
    const actor = monsterProfile('actor-knowledge-large-fog-observer');
    const baseTarget = playerProfile('actor-knowledge-large-fog-target');
    const target = {
      ...baseTarget,
      rules: { ...baseTarget.rules, sizeCategory: 'Large' as const },
    };
    const common = {
      bounds: { columns: 5, rows: 3 },
      combatants: [actor, target],
      tokens: [placedToken(actor, 0, 1), placedToken(target, 2, 0)],
    };
    const partiallyFogged = createEncounter({
      ...common,
      foggedCells: [{ column: 2, row: 0 }],
    });
    const fullyFogged = createEncounter({
      ...common,
      foggedCells: [
        { column: 2, row: 0 }, { column: 3, row: 0 },
        { column: 2, row: 1 }, { column: 3, row: 1 },
      ],
    });

    expect(onlyTarget(partiallyFogged, actor)).toMatchObject({
      kind: 'perceived',
      targetId: target.id,
      footprint: [
        { column: 2, row: 0 }, { column: 3, row: 0 },
        { column: 2, row: 1 }, { column: 3, row: 1 },
      ],
    });
    expect(onlyTarget(fullyFogged, actor)).toMatchObject({
      kind: 'unknown',
      targetId: target.id,
    });
  });

  it('records missing last-seen memory as a typed unresolved basis', () => {
    const setup = encounter();
    const hidden: EncounterState = {
      ...setup.state,
      hiddenCombatants: [{ combatant: setup.target.id, stealthTotal: 18, edition: '2024' }],
    };

    expect(onlyTarget(hidden, setup.actor)).toEqual({
      kind: 'unknown',
      targetId: setup.target.id,
      lastSeen: {
        status: 'unresolved',
        reason: 'last_seen_position_not_modeled',
      },
    });
  });
});
