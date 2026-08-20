import { describe, expect, it } from 'vitest';
import type { CombatantProfile } from '../../../src/combat/combatant';
import {
  combatantConditions,
  createEncounter,
  reduceEncounter,
  type EncounterReduction,
  type EncounterState,
} from '../../../src/combat/encounter';
import type { EffectApplication, TurnBoundary } from '../../../src/combat/effects';
import {
  combatantId,
  damageType,
  dieSides,
  effectStackingIdentity,
} from '../../../src/combat/values';
import type { EncounterCommand, EncounterEvent } from '../../../src/combat/events';
import { monsterProfile, placedToken, playerProfile } from './fixtures';

const fire = damageType('Fire');

function setup(): {
  readonly source: CombatantProfile;
  readonly target: CombatantProfile;
  readonly state: EncounterState;
} {
  const source = playerProfile('effect-source', { initiativeBonus: 10 });
  const target = monsterProfile('effect-target', { initiativeBonus: 0, usesDeathSaves: true });
  const initial = createEncounter({
    bounds: { columns: 5, rows: 2 },
    combatants: [source, target],
    tokens: [placedToken(source, 0), placedToken(target, 3)],
  });
  const state = reduceEncounter(initial, { type: 'roll_initiative' }, () => 0.5).state;
  return { source, target, state };
}

function conditionEffect(
  target: CombatantProfile,
  condition: 'Blinded' | 'Deafened' | 'Incapacitated',
  options: {
    readonly concentration?: boolean;
    readonly identity?: string;
    readonly duration?: EffectApplication['duration'];
    readonly repeatedSave?: EffectApplication['repeatedSave'];
  } = {},
): EffectApplication {
  return {
    targets: [target.id],
    duration: options.duration ?? { kind: 'permanent' },
    concentration: options.concentration ?? false,
    stackingIdentity: effectStackingIdentity(options.identity ?? `condition:${condition}`),
    stacking: 'replace_same_source',
    repeatedSave: options.repeatedSave ?? null,
    payload: { kind: 'condition', condition },
  };
}

function apply(
  state: EncounterState,
  source: CombatantProfile,
  effect: EffectApplication,
): EncounterReduction {
  return reduceEncounter(
    state,
    { type: 'apply_effect', actor: source.id, effect, cost: 'none' },
    () => 0.5,
  );
}

function reachTargetTurn(
  state: EncounterState,
  source: CombatantProfile,
): EncounterReduction {
  return reduceEncounter(state, { type: 'end_turn', actor: source.id }, () => 0.5);
}

function concentrationDamage(amount: number) {
  return {
    terms: [{ type: fire, dice: { count: 0, sides: dieSides(6), modifier: amount } }],
    critical: false,
    responses: [],
  } as const;
}

function concentrationAttack(
  actor: CombatantProfile,
  target: CombatantProfile,
  amount: number,
): Extract<EncounterCommand, { readonly type: 'attack' }> {
  return {
    type: 'attack',
    actor: actor.id,
    target: target.id,
    attackBonus: 100,
    criticalFloor: 20,
    rollMode: 'normal',
    attackerCanSeeTarget: true,
    targetCanSeeAttacker: true,
    damage: concentrationDamage(amount),
  };
}

function rngForD20Faces(faces: readonly number[]): () => number {
  let index = 0;
  return () => {
    const face = faces[index];
    if (face === undefined) throw new Error('Test RNG exhausted.');
    index += 1;
    return (face - 0.5) / 20;
  };
}

function runConcentrationDamage(
  damageAmount: number,
  constitutionSaveBonus: number,
  saveFace: number,
): { readonly effectCount: number; readonly save: Extract<EncounterEvent, { readonly type: 'save_resolved' }> } {
  const concentrator = monsterProfile('concentration-holder', {
    hitPoints: 200,
    initiativeBonus: 10,
    constitutionSaveBonus,
  });
  const attacker = playerProfile('concentration-attacker', { initiativeBonus: 0 });
  const initial = createEncounter({
    bounds: { columns: 4, rows: 1 },
    combatants: [concentrator, attacker],
    tokens: [placedToken(concentrator, 0), placedToken(attacker, 3)],
  });
  let state = reduceEncounter(initial, { type: 'roll_initiative' }, () => 0.5).state;
  state = apply(
    state,
    concentrator,
    conditionEffect(attacker, 'Deafened', {
      concentration: true,
      identity: 'spell:concentration-dc',
    }),
  ).state;
  state = reduceEncounter(
    state,
    { type: 'end_turn', actor: concentrator.id },
    () => 0.5,
  ).state;
  const result = reduceEncounter(
    state,
    concentrationAttack(attacker, concentrator, damageAmount),
    rngForD20Faces([11, saveFace]),
  );
  const save = result.events.find(
    (event): event is Extract<EncounterEvent, { readonly type: 'save_resolved' }> =>
      event.type === 'save_resolved',
  );
  if (save === undefined) throw new Error('Missing concentration saving throw.');
  return { effectCount: result.state.effects.length, save };
}

describe('reducer-owned effect lifecycle', () => {
  it('enforces at most one concentration effect per caster by ending the first', () => {
    const fixture = setup();
    let result = apply(
      fixture.state,
      fixture.source,
      conditionEffect(fixture.target, 'Blinded', {
        concentration: true,
        identity: 'spell:first',
      }),
    );
    const firstId = result.state.effects[0]?.id;
    if (firstId === undefined) throw new Error('Missing first concentration effect.');

    result = apply(
      result.state,
      fixture.source,
      conditionEffect(fixture.target, 'Deafened', {
        concentration: true,
        identity: 'spell:second',
      }),
    );

    expect(result.state.effects).toHaveLength(1);
    expect(result.state.effects[0]).toMatchObject({
      id: 'effect:2',
      createdRevision: 3,
      concentrationOwner: fixture.source.id,
      payload: { kind: 'condition', condition: 'Deafened' },
    });
    expect(result.events).toEqual([
      {
        sequence: 6,
        type: 'effect_ended',
        effectId: firstId,
        reason: 'concentration_replaced',
      },
      {
        sequence: 7,
        type: 'effect_applied',
        effectId: 'effect:2',
        source: fixture.source.id,
        targets: [fixture.target.id],
      },
    ]);
  });

  it.each(['start', 'end'] as const)(
    'runs a sourced repeated save at the target turn %s boundary and not the other boundary',
    (boundary) => {
      const fixture = setup();
      const applied = apply(
        fixture.state,
        fixture.source,
        conditionEffect(fixture.target, 'Blinded', {
          repeatedSave: {
            timing: {
              combatant: fixture.target.id,
              boundary,
              source: 'docs/srd/source/spell-descriptions.txt:test-fixture',
            },
            ability: 'wisdom',
            dc: 30,
            rollMode: 'normal',
            onSuccess: 'remove_target',
          },
        }),
      );
      const targetStart = reachTargetTurn(applied.state, fixture.source);
      const startSaves = targetStart.events.filter((event) => event.type === 'save_resolved');

      expect(applied.state.effects[0]?.repeatedSave).toEqual({
        timing: {
          combatant: fixture.target.id,
          boundary,
          source: 'docs/srd/source/spell-descriptions.txt:test-fixture',
        },
        ability: 'wisdom',
        dc: 30,
        rollMode: 'normal',
        onSuccess: 'remove_target',
      });

      if (boundary === 'start') {
        expect(startSaves).toMatchObject([
          {
            sequence: 7,
            target: fixture.target.id,
            ability: 'wisdom',
            save: { outcome: 'failure', total: 11 },
            effectId: applied.state.effects[0]?.id,
          },
        ]);
      } else {
        expect(startSaves).toHaveLength(0);
        const targetEnd = reduceEncounter(
          targetStart.state,
          { type: 'end_turn', actor: fixture.target.id },
          () => 0.5,
        );
        expect(targetEnd.events.filter((event) => event.type === 'save_resolved')).toMatchObject([
          {
            sequence: 8,
            target: fixture.target.id,
            ability: 'wisdom',
            save: { outcome: 'failure', total: 11 },
            effectId: applied.state.effects[0]?.id,
          },
        ]);
      }
    },
  );

  it.each(['start', 'end'] as const)(
    'expires exactly on its matching %s duration boundary, never one turn late',
    (boundary) => {
      const fixture = setup();
      const applied = apply(
        fixture.state,
        fixture.source,
        conditionEffect(fixture.target, 'Deafened', {
          duration: {
            kind: 'turn_boundaries',
            timing: {
              combatant: fixture.target.id,
              boundary,
              source: 'docs/srd/full/srd-5.2.1.txt:test-fixture',
            },
            remaining: 1,
          },
        }),
      );
      const targetStart = reachTargetTurn(applied.state, fixture.source);

      expect(applied.state.effects[0]?.duration).toEqual({
        kind: 'turn_boundaries',
        timing: {
          combatant: fixture.target.id,
          boundary,
          source: 'docs/srd/full/srd-5.2.1.txt:test-fixture',
        },
        remaining: 1,
      });

      if (boundary === 'start') {
        expect(targetStart.state.effects).toHaveLength(0);
        expect(targetStart.events).toContainEqual({
          sequence: 7,
          type: 'effect_clock_ticked',
          effectId: applied.state.effects[0]?.id,
          boundary,
          remaining: 0,
        });
        expect(targetStart.events).toContainEqual({
          sequence: 8,
          type: 'effect_ended',
          effectId: applied.state.effects[0]?.id,
          reason: 'duration_expired',
        });
      } else {
        expect(targetStart.state.effects).toHaveLength(1);
        const targetEnd = reduceEncounter(
          targetStart.state,
          { type: 'end_turn', actor: fixture.target.id },
          () => 0.5,
        );
        expect(targetEnd.state.effects).toHaveLength(0);
        expect(targetEnd.events).toContainEqual({
          sequence: 8,
          type: 'effect_clock_ticked',
          effectId: applied.state.effects[0]?.id,
          boundary,
          remaining: 0,
        });
        expect(targetEnd.events).toContainEqual({
          sequence: 9,
          type: 'effect_ended',
          effectId: applied.state.effects[0]?.id,
          reason: 'duration_expired',
        });
      }
    },
  );

  it('applies recurring condition damage at its sourced start-of-turn boundary', () => {
    const fixture = setup();
    const applied = apply(fixture.state, fixture.source, {
      targets: [fixture.target.id],
      duration: { kind: 'permanent' },
      concentration: false,
      stackingIdentity: effectStackingIdentity('ongoing:fire'),
      stacking: 'replace_same_source',
      repeatedSave: null,
      payload: {
        kind: 'ongoing_damage',
        timing: {
          combatant: fixture.target.id,
          boundary: 'start',
          source: 'D254; docs/srd/source/spell-descriptions.txt',
        },
        damage: {
          terms: [{ type: fire, dice: { count: 0, sides: dieSides(6), modifier: 3 } }],
          critical: false,
          responses: [],
        },
      },
    });

    expect(applied.state.effects[0]?.payload).toEqual({
      kind: 'ongoing_damage',
      timing: {
        combatant: fixture.target.id,
        boundary: 'start',
        source: 'D254; docs/srd/source/spell-descriptions.txt',
      },
      damage: {
        terms: [{ type: fire, dice: { count: 0, sides: dieSides(6), modifier: 3 } }],
        critical: false,
        responses: [],
      },
    });
    expect(
      applied.events.filter((event) => event.type === 'damage_applied'),
    ).toHaveLength(0);
    const started = reachTargetTurn(applied.state, fixture.source);
    expect(
      started.events.find((event) => event.type === 'damage_applied'),
    ).toMatchObject({ target: fixture.target.id, amount: 3, hitPointsAfter: 7 });
  });

  it('uses stacking identity to replace only the configured source scope', () => {
    const fixture = setup();
    const first = apply(
      fixture.state,
      fixture.source,
      conditionEffect(fixture.target, 'Blinded', { identity: 'shared-stack' }),
    );
    const second = apply(
      first.state,
      fixture.source,
      conditionEffect(fixture.target, 'Deafened', { identity: 'shared-stack' }),
    );

    expect(second.state.effects).toHaveLength(1);
    expect(second.events.some(
      (event) => event.type === 'effect_ended' && event.reason === 'stacking_replaced',
    )).toBe(true);
  });

  it('represents a non-Exhaustion condition once even when two effects impose it', () => {
    const fixture = setup();
    const first = apply(
      fixture.state,
      fixture.source,
      conditionEffect(fixture.target, 'Blinded', { identity: 'blind:first' }),
    );
    const second = apply(
      first.state,
      fixture.source,
      conditionEffect(fixture.target, 'Blinded', { identity: 'blind:second' }),
    );

    expect(second.state.effects).toHaveLength(2);
    expect(combatantConditions(second.state, fixture.target.id)).toEqual([
      { name: 'Blinded' },
    ]);
  });

  it('accumulates Exhaustion contributions into one exact level and dies at level 6', () => {
    const fixture = setup();
    const exhaustion = (identity: string): EffectApplication => ({
      targets: [fixture.target.id],
      duration: { kind: 'permanent' },
      concentration: false,
      stackingIdentity: effectStackingIdentity(identity),
      stacking: 'coexist',
      repeatedSave: null,
      payload: { kind: 'exhaustion', level: 3 },
    });
    const first = apply(
      fixture.state,
      fixture.source,
      exhaustion('exhaustion:first'),
    );
    const second = apply(
      first.state,
      fixture.source,
      exhaustion('exhaustion:second'),
    );

    expect(first.state.effects[0]?.payload).toEqual({ kind: 'exhaustion', level: 3 });
    expect(combatantConditions(first.state, fixture.target.id)).toEqual([
      { name: 'Exhaustion', level: 3 },
    ]);
    expect(combatantConditions(second.state, fixture.target.id)).toEqual([
      { name: 'Exhaustion', level: 6 },
    ]);
    expect(
      second.state.combatants.find(
        (candidate) => candidate.profile.id === fixture.target.id,
      ),
    ).toMatchObject({ hitPoints: 0, life: 'dead' });
  });

  it('mints deterministic reducer effect ids and byte-equivalent event output', () => {
    const run = () => {
      const fixture = setup();
      return apply(
        fixture.state,
        fixture.source,
        conditionEffect(fixture.target, 'Blinded', { identity: 'deterministic' }),
      );
    };
    const first = run();
    const second = run();

    expect(first.state.nextEffectSequence).toBe(2);
    expect(first.state.effects).toMatchObject([{ id: 'effect:1', createdRevision: 2 }]);
    expect(first.events).toEqual([
      {
        sequence: 5,
        type: 'effect_applied',
        effectId: 'effect:1',
        source: first.state.effects[0]?.source,
        targets: first.state.effects[0]?.targets,
      },
    ]);
    expect(JSON.stringify(first.events)).toBe(JSON.stringify(second.events));
    expect(first.events).toEqual(second.events);
  });

  it.each([
    ['minimum DC 10', 1, 0, 10, 0, 9],
    ['half damage rounded down to DC 11', 23, 0, 11, 0, 10],
    ['maximum DC 30', 100, 10, 20, 10, 19],
  ] as const)(
    'pins concentration damage checks at the %s boundary',
    (
      _boundary,
      damageAmount,
      successBonus,
      successFace,
      failureBonus,
      failureFace,
    ) => {
      const success = runConcentrationDamage(damageAmount, successBonus, successFace);
      const failure = runConcentrationDamage(damageAmount, failureBonus, failureFace);

      expect(success.save.save).toMatchObject({
        outcome: 'success',
        roll: { faces: [successFace], chosen: successFace },
        total: successFace + successBonus,
      });
      expect(success.effectCount).toBe(1);
      expect(failure.save.save).toMatchObject({
        outcome: 'failure',
        roll: { faces: [failureFace], chosen: failureFace },
        total: failureFace + failureBonus,
      });
      expect(failure.effectCount).toBe(0);
    },
  );

  it('removes condition-immune targets inside the reducer and stores no empty effect', () => {
    const source = playerProfile('immune-source', { initiativeBonus: 10 });
    const target = monsterProfile('immune-target', {
      initiativeBonus: 0,
      conditionImmunities: ['Blinded'],
    });
    const initial = createEncounter({
      bounds: { columns: 4, rows: 1 },
      combatants: [source, target],
      tokens: [placedToken(source, 0), placedToken(target, 3)],
    });
    const state = reduceEncounter(initial, { type: 'roll_initiative' }, () => 0.5).state;
    const result = apply(state, source, conditionEffect(target, 'Blinded'));

    expect(result.state.effects).toHaveLength(0);
    expect(result.events.map((event) => event.type)).toEqual([
      'effect_target_removed',
      'effect_ended',
    ]);
  });

  it('requires the repeated-save boundary to name a source', () => {
    const fixture = setup();
    const invalid = conditionEffect(fixture.target, 'Blinded', {
      repeatedSave: {
        timing: {
          combatant: combatantId('combatant:effect-target'),
          boundary: 'end' as TurnBoundary,
          source: ' ',
        },
        ability: 'wisdom',
        dc: 12,
        rollMode: 'normal',
        onSuccess: 'remove_target',
      },
    });

    expect(() => apply(fixture.state, fixture.source, invalid)).toThrow(
      'Repeated-save timing requires a source locator',
    );
  });
});
