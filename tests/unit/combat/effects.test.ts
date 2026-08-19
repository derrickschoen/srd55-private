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
      concentrationOwner: fixture.source.id,
      payload: { kind: 'condition', condition: 'Deafened' },
    });
    expect(result.events).toContainEqual({
      sequence: expect.any(Number),
      type: 'effect_ended',
      effectId: firstId,
      reason: 'concentration_replaced',
    });
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

      if (boundary === 'start') {
        expect(startSaves).toHaveLength(1);
      } else {
        expect(startSaves).toHaveLength(0);
        const targetEnd = reduceEncounter(
          targetStart.state,
          { type: 'end_turn', actor: fixture.target.id },
          () => 0.5,
        );
        expect(targetEnd.events.filter((event) => event.type === 'save_resolved')).toHaveLength(1);
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

      if (boundary === 'start') {
        expect(targetStart.state.effects).toHaveLength(0);
        expect(targetStart.events).toContainEqual({
          sequence: expect.any(Number),
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
        expect(targetEnd.events.some(
          (event) => event.type === 'effect_ended' && event.reason === 'duration_expired',
        )).toBe(true);
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

    expect(first.state.effects.map((effect) => effect.id)).toEqual(['effect:1']);
    expect(JSON.stringify(first.events)).toBe(JSON.stringify(second.events));
    expect(first.events).toEqual(second.events);
  });

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
