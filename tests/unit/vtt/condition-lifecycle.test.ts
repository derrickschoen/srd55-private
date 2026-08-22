import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import type { CombatantProfile } from '../../../src/combat/combatant';
import {
  CONDITION_LIFECYCLE_EQUAL_POTENCY_STACKING_RULE,
  CONDITION_LIFECYCLE_HOOK_ORDER,
  createEncounter,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import type { EncounterEvent } from '../../../src/combat/events';
import { mulberry32, type Rng } from '../../../src/combat/random';
import type { ConditionLifecycleOperation, SpellCastCommand, SpellOperation } from '../../../src/combat/spells/types';
import { damageType, feet } from '../../../src/combat/values';
import { loadContentPack, type LoadedContentPack } from '../../../src/content/content-pack';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

interface SpellSpec {
  readonly id: string;
  readonly operation: SpellOperation;
}

function packWithSpells(specs: readonly SpellSpec[]): LoadedContentPack {
  const fixture = JSON.parse(readFileSync('tests/fixtures/content-pack-v1-homebrew.json', 'utf8')) as {
    readonly spells: readonly Readonly<Record<string, unknown>>[];
    readonly [key: string]: unknown;
  };
  const template = fixture.spells[0];
  if (template === undefined) throw new Error('Content-pack spell fixture is missing.');
  const loaded = loadContentPack({
    ...fixture,
    spells: specs.map(({ id, operation }) => ({
      ...template,
      recordId: id,
      name: id,
      level: 0,
      duration: { kind: 'rounds', rounds: 10 },
      targeting: { kind: 'single', rangeFeet: 150, willing: true },
      operation,
    })),
  });
  if (loaded.status !== 'loaded') throw new Error(`Condition lifecycle fixture refused: ${loaded.refusal.reason}`);
  return loaded.content;
}

function lifecycle(
  overrides: Partial<Omit<ConditionLifecycleOperation, 'kind'>> = {},
): ConditionLifecycleOperation {
  const duration = overrides.duration ?? { kind: 'fixed_rounds', rounds: 2, expiresAt: 'target_end' };
  const stacking = overrides.stacking ?? { kind: 'coexist' };
  const common = {
    kind: 'condition_lifecycle',
    condition: 'Frightened',
    immunity: null,
    initialSave: null,
    repeatedSave: null,
    damageBreak: null,
    ...overrides,
  } as const;
  if (duration.kind === 'fixed_rounds') return { ...common, duration, stacking };
  if (stacking.kind === 'extend_duration') throw new Error('Test helper refuses invalid concentration extension.');
  return { ...common, duration, stacking };
}

function fixedDamage(amount: number): SpellOperation {
  return {
    kind: 'damage_operation', delivery: { kind: 'automatic' }, instancesPerTarget: 1,
    packets: [{
      damageType: { kind: 'fixed', damageType: damageType('Force') },
      dice: { baseCount: 0, sides: 4, modifier: amount, perSlotCount: 0, perSlotModifier: 0, cantripUpgrade: false },
      scaling: { kind: 'none' }, thresholdRider: null,
    }],
    timing: { kind: 'immediate' },
  };
}

function movementRegion(id: string, modifier: number): SpellOperation {
  return {
    kind: 'movement_region',
    region: { id, cells: [{ column: 3, row: 0 }] },
    difficultTerrain: false,
    entry: 'allowed',
    damage: {
      damageType: damageType('Piercing'), dice: { count: 1, sides: 4, modifier },
      unitFeet: 5, partialUnit: 'completed_units_only',
    },
  };
}

function command(actor: CombatantProfile, target: CombatantProfile, id: string, saveDc = 10): SpellCastCommand {
  return {
    type: 'cast_spell', actor: actor.id, spellId: `greenforge:${id}`, slotLevel: null,
    castAsRitual: false, casterLevel: 5, attackBonus: 8, saveDc,
    spellcastingModifier: 4, targets: [target.id], area: null, weaponAttack: null,
    selectedOption: null,
  };
}

function face(value: number): Rng {
  return () => (value - 0.5) / 20;
}

function started(pack: LoadedContentPack, combatants: readonly CombatantProfile[]): EncounterState {
  return reduceEncounter(createEncounter({
    config: { initiativeMode: 'per_combatant' },
    bounds: { columns: 10, rows: 2 }, combatants,
    tokens: combatants.map((profile, index) => placedToken(profile, index)),
    contentPacks: [pack],
  }), { type: 'roll_initiative' }, face(10)).state;
}

function cast(state: EncounterState, actor: CombatantProfile, target: CombatantProfile, id: string, rng: Rng = face(1), saveDc = 10) {
  return reduceEncounter(state, command(actor, target, id, saveDc), rng);
}

function endTurn(state: EncounterState, actor: CombatantProfile, rng: Rng = face(1)) {
  return reduceEncounter(state, { type: 'end_turn', actor: actor.id }, rng);
}

function conditionEffects(state: EncounterState) {
  return state.effects.filter((effect) => effect.payload.kind === 'condition');
}

describe('CAP-IMP-010 imported condition and control lifecycle', () => {
  it('save_dc_boundary: a result exactly at the DC refuses application while one below applies it', () => {
    // Blindness/Deafness first requires a Constitution save (spell-descriptions.txt:864-873).
    const operation = lifecycle({
      condition: 'Blinded',
      initialSave: { ability: 'constitution', rollMode: 'normal', applyOn: 'failure' },
    });
    const pack = packWithSpells([{ id: 'blinding-control', operation }]);
    const caster = playerProfile('save-caster', { initiativeBonus: 20 });
    const target = monsterProfile('save-target', { initiativeBonus: -20, constitutionSaveBonus: 0 });

    const exact = cast(started(pack, [caster, target]), caster, target, 'blinding-control', face(10));
    const below = cast(started(pack, [caster, target]), caster, target, 'blinding-control', face(9));
    expect(exact.events.find((event) => event.type === 'save_resolved')).toMatchObject({ save: { total: 10, outcome: 'success' } });
    expect(conditionEffects(exact.state)).toHaveLength(0);
    expect(below.events.find((event) => event.type === 'save_resolved')).toMatchObject({ save: { total: 9, outcome: 'failure' } });
    expect(conditionEffects(below.state)).toHaveLength(1);
  });

  it('immunity_reported_as_save: an immune target emits a refusal without drawing or reporting a save', () => {
    // Heroism grants immunity to Frightened (spell-descriptions.txt:4257-4262).
    const pack = packWithSpells([{
      id: 'fear-control',
      operation: lifecycle({
        immunity: { condition: 'Frightened' },
        initialSave: { ability: 'wisdom', rollMode: 'normal', applyOn: 'failure' },
      }),
    }]);
    const caster = playerProfile('immune-caster', { initiativeBonus: 20 });
    const target = monsterProfile('immune-target', { initiativeBonus: -20, conditionImmunities: ['Frightened'] });
    const result = cast(started(pack, [caster, target]), caster, target, 'fear-control', face(1));

    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'condition_application_refused', target: target.id, condition: 'Frightened', immunity: 'Frightened',
    }));
    expect(result.events.some((event) => event.type === 'save_resolved')).toBe(false);
    expect(conditionEffects(result.state)).toHaveLength(0);
  });

  it('repeat_save_on_success_persists: repeats on the first and final round and honors both success scopes', () => {
    // End-of-turn/remove-target: spell-descriptions.txt:867-873.
    // Start-of-turn/end-effect distinction: spell-descriptions.txt:1474-1486,6418-6426.
    const run = (onSuccess: 'remove_target' | 'end_effect') => {
      const pack = packWithSpells([{
        id: `repeat-${onSuccess}`,
        operation: lifecycle({
          condition: 'Blinded',
          repeatedSave: { hook: 'target_end', ability: 'constitution', rollMode: 'normal', onSuccess },
        }),
      }]);
      const caster = playerProfile(`repeat-caster-${onSuccess}`, { initiativeBonus: 20 });
      const target = monsterProfile(`repeat-target-${onSuccess}`, { initiativeBonus: -20, constitutionSaveBonus: 0 });
      let state = cast(started(pack, [caster, target]), caster, target, `repeat-${onSuccess}`).state;
      state = endTurn(state, caster).state;
      const first = endTurn(state, target, face(9));
      expect(first.events.find((event) => event.type === 'save_resolved')).toMatchObject({ save: { total: 9, outcome: 'failure' } });
      expect(first.state.effects[0]?.duration).toMatchObject({ remaining: 1 });
      state = endTurn(first.state, caster).state;
      return endTurn(state, target, face(10));
    };

    const targetScoped = run('remove_target');
    expect(targetScoped.events).toContainEqual(expect.objectContaining({ type: 'effect_target_removed', reason: 'save_succeeded' }));
    expect(conditionEffects(targetScoped.state)).toHaveLength(0);
    const wholeEffect = run('end_effect');
    expect(wholeEffect.events).toContainEqual(expect.objectContaining({ type: 'effect_ended', reason: 'save_succeeded' }));
    expect(wholeEffect.events.some((event) => event.type === 'effect_target_removed')).toBe(false);
  });

  it('damage_break_ignores_region: movement-region damage at exactly zero preserves and exactly one breaks the effect', () => {
    // Any damage wakes Sleep (spell-descriptions.txt:7111-7116); Spike Growth damages entered movement (spell-descriptions.txt:7309-7312).
    const run = (modifier: number) => {
      const pack = packWithSpells([
        { id: 'sleep-control', operation: lifecycle({ condition: 'Frightened', damageBreak: { sources: 'any', minimumDamage: 1 } }) },
        { id: 'thorn-region', operation: movementRegion('thorn-region', modifier) },
      ]);
      const controller = playerProfile(`region-controller-${String(modifier)}`, { initiativeBonus: 30 });
      const regionCaster = playerProfile(`region-caster-${String(modifier)}`, { initiativeBonus: 20 });
      const target = monsterProfile(`region-target-${String(modifier)}`, { initiativeBonus: -20, hitPoints: 20 });
      let state = cast(started(pack, [controller, regionCaster, target]), controller, target, 'sleep-control').state;
      state = endTurn(state, controller).state;
      state = cast(state, regionCaster, target, 'thorn-region').state;
      state = endTurn(state, regionCaster).state;
      state = reduceEncounter(state, { type: 'disengage', actor: target.id }, () => 0).state;
      return reduceEncounter(state, {
        type: 'move', actor: target.id, path: [{ column: 3, row: 0 }], cause: 'voluntary',
      }, () => 0);
    };

    const zero = run(-1);
    expect(conditionEffects(zero.state)).toHaveLength(1);
    expect(zero.events.some((event) => event.type === 'effect_ended' && event.reason === 'damage_taken')).toBe(false);
    const one = run(0);
    expect(one.events).toContainEqual(expect.objectContaining({ type: 'damage_applied', amount: 1 }));
    expect(one.events).toContainEqual(expect.objectContaining({ type: 'effect_ended', reason: 'damage_taken' }));
    expect(conditionEffects(one.state)).toHaveLength(0);
  });

  it('damage_source_scope: source-or-allies damage ignores an opposing source and breaks for the effect source', () => {
    // Animal Friendship ends only for damage from the caster or allies (spell-descriptions.txt:150-159).
    const pack = packWithSpells([
      { id: 'source-bound-control', operation: lifecycle({ damageBreak: { sources: 'effect_source_or_allies', minimumDamage: 1 } }) },
      { id: 'one-damage', operation: fixedDamage(1) },
    ]);
    const controller = monsterProfile('source-controller', { initiativeBonus: 30 });
    const outsider = playerProfile('source-outsider', { initiativeBonus: 20 });
    const target = playerProfile('source-target', { initiativeBonus: -20, hitPoints: 20 });
    let state = cast(started(pack, [controller, outsider, target]), controller, target, 'source-bound-control').state;
    state = endTurn(state, controller).state;
    state = cast(state, outsider, target, 'one-damage').state;
    expect(conditionEffects(state)).toHaveLength(1);
    state = endTurn(state, outsider).state;
    state = endTurn(state, target).state;
    const sourceDamage = cast(state, controller, target, 'one-damage');
    expect(sourceDamage.events).toContainEqual(expect.objectContaining({ type: 'effect_ended', reason: 'damage_taken' }));
    expect(conditionEffects(sourceDamage.state)).toHaveLength(0);
  });

  it('duration_off_by_one: exactly one round expires on its first declared boundary', () => {
    const pack = packWithSpells([{
      id: 'one-round-control',
      operation: lifecycle({ duration: { kind: 'fixed_rounds', rounds: 1, expiresAt: 'target_start' } }),
    }]);
    const caster = playerProfile('one-round-caster', { initiativeBonus: 20 });
    const target = monsterProfile('one-round-target', { initiativeBonus: -20 });
    const applied = cast(started(pack, [caster, target]), caster, target, 'one-round-control');
    expect(conditionEffects(applied.state)).toHaveLength(1);
    const expired = endTurn(applied.state, caster);
    expect(expired.events).toContainEqual(expect.objectContaining({ type: 'effect_clock_ticked', remaining: 0 }));
    expect(expired.events).toContainEqual(expect.objectContaining({ type: 'effect_ended', reason: 'duration_expired' }));
    expect(conditionEffects(expired.state)).toHaveLength(0);
  });

  it('fixed_or_concentration: same-tick concentration loss precedes fixed expiry and records its cause', () => {
    // Concentration durations end when concentration ends; the fixed maximum remains a separate bound (spell-descriptions.txt:1355-1363).
    const area: SpellOperation = {
      kind: 'persistent_area', origin: 'anchored_to_caster', shape: { kind: 'emanation', radius: feet(10) },
      durationRounds: 10, concentration: false, targetFilter: 'selected', includeOwner: false,
      difficultTerrain: false, movableFeet: null,
      hooks: [{
        hook: 'on_start_of_turn_inside', frequency: 'every_trigger',
        effect: {
          kind: 'automatic', payload: {
            kind: 'damage', damageType: damageType('Force'),
            dice: { baseCount: 0, sides: 4, modifier: 1, perSlotCount: 0, perSlotModifier: 0, cantripUpgrade: false },
          },
        },
      }],
      initialEffects: [],
    };
    const pack = packWithSpells([
      { id: 'concentration-hazard', operation: area },
      { id: 'concentrated-control', operation: lifecycle({ duration: { kind: 'fixed_rounds_or_concentration', rounds: 1, expiresAt: 'target_start' } }) },
    ]);
    const areaCaster = playerProfile('concentration-area-caster', { initiativeBonus: 30 });
    const caster = playerProfile('concentration-caster', { initiativeBonus: 20, hitPoints: 20 });
    let state = cast(started(pack, [areaCaster, caster]), areaCaster, caster, 'concentration-hazard').state;
    state = endTurn(state, areaCaster).state;
    state = cast(state, caster, caster, 'concentrated-control').state;
    state = endTurn(state, caster).state;
    const ended = endTurn(state, areaCaster, face(1));
    expect(ended.events).toContainEqual(expect.objectContaining({ type: 'effect_ended', reason: 'concentration_broken' }));
    expect(ended.events).toContainEqual(expect.objectContaining({ type: 'damage_applied', target: caster.id, amount: 1 }));
    expect(ended.events.some((event) => event.type === 'effect_clock_ticked')).toBe(false);
    expect(ended.events.some((event) => event.type === 'effect_ended' && event.reason === 'duration_expired')).toBe(false);
    expect(conditionEffects(ended.state)).toHaveLength(0);
  });

  it('stacking_silently_replaces: imported coexist and replace policies differ across sources', () => {
    const run = (stacking: ConditionLifecycleOperation['stacking']) => {
      const pack = packWithSpells([{ id: 'stack-control', operation: lifecycle({ stacking }) }]);
      const first = playerProfile(`stack-first-${stacking.kind}`, { initiativeBonus: 30 });
      const second = playerProfile(`stack-second-${stacking.kind}`, { initiativeBonus: 20 });
      const target = monsterProfile(`stack-target-${stacking.kind}`, { initiativeBonus: -20 });
      let state = cast(started(pack, [first, second, target]), first, target, 'stack-control').state;
      state = endTurn(state, first).state;
      return cast(state, second, target, 'stack-control');
    };

    const coexist = run({ kind: 'coexist' });
    expect(conditionEffects(coexist.state)).toHaveLength(2);
    expect(coexist.events.some((event) => event.type === 'effect_ended')).toBe(false);
    const replaced = run(CONDITION_LIFECYCLE_EQUAL_POTENCY_STACKING_RULE);
    expect(conditionEffects(replaced.state)).toHaveLength(1);
    expect(conditionEffects(replaced.state)[0]?.source).toContain('stack-second');
    expect(replaced.events).toContainEqual(expect.objectContaining({ type: 'effect_ended', reason: 'stacking_replaced' }));
  });

  it('extend_duration_policy: a second same-source application extends instead of replacing', () => {
    const pack = packWithSpells([{
      id: 'extend-control',
      operation: lifecycle({ stacking: { kind: 'extend_duration', sources: 'same_source' } }),
    }]);
    const caster = playerProfile('extend-caster', { initiativeBonus: 20 });
    const target = monsterProfile('extend-target', { initiativeBonus: -20 });
    let state = cast(started(pack, [caster, target]), caster, target, 'extend-control').state;
    state = endTurn(state, caster).state;
    state = endTurn(state, target).state;
    const extended = cast(state, caster, target, 'extend-control');
    expect(conditionEffects(extended.state)).toHaveLength(1);
    expect(conditionEffects(extended.state)[0]?.duration).toMatchObject({ remaining: 3 });
    expect(extended.events).toContainEqual(expect.objectContaining({ type: 'effect_duration_extended', addedRounds: 2, remaining: 3 }));
  });

  it('same_hook_order: damage-break precedes re-evaluated branches, then repeat saves, then duration expiry', () => {
    const area: SpellOperation = {
      kind: 'persistent_area', origin: 'anchored_to_caster', shape: { kind: 'emanation', radius: feet(40) },
      durationRounds: 10, concentration: false, targetFilter: 'selected', includeOwner: false,
      difficultTerrain: false, movableFeet: null,
      hooks: [{
        hook: 'on_start_of_turn_inside', frequency: 'every_trigger',
        effect: {
          kind: 'automatic', payload: {
            kind: 'damage', damageType: damageType('Force'),
            dice: { baseCount: 0, sides: 4, modifier: 1, perSlotCount: 0, perSlotModifier: 0, cantripUpgrade: false },
          },
        },
      }],
      initialEffects: [],
    };
    const pack = packWithSpells([
      { id: 'ordered-area', operation: area },
      { id: 'ordered-branch', operation: { kind: 'reevaluated_branch', hook: 'target_start', durationRounds: 1, operation: fixedDamage(1) } },
      { id: 'ordered-break', operation: lifecycle({ condition: 'Frightened', damageBreak: { sources: 'any', minimumDamage: 1 }, duration: { kind: 'fixed_rounds', rounds: 5, expiresAt: 'target_start' } }) },
      { id: 'ordered-repeat', operation: lifecycle({ condition: 'Blinded', repeatedSave: { hook: 'target_start', ability: 'wisdom', rollMode: 'normal', onSuccess: 'remove_target' }, duration: { kind: 'fixed_rounds', rounds: 5, expiresAt: 'target_start' } }) },
      { id: 'ordered-expiry', operation: lifecycle({ condition: 'Deafened', duration: { kind: 'fixed_rounds', rounds: 1, expiresAt: 'target_start' } }) },
    ]);
    const areaCaster = playerProfile('order-area', { initiativeBonus: 60 });
    const branchCaster = playerProfile('order-branch', { initiativeBonus: 50 });
    const breakCaster = playerProfile('order-break', { initiativeBonus: 40 });
    const repeatCaster = playerProfile('order-repeat', { initiativeBonus: 30 });
    const expiryCaster = playerProfile('order-expiry', { initiativeBonus: 20 });
    const target = monsterProfile('order-target', { initiativeBonus: -20, hitPoints: 20 });
    let state = started(pack, [areaCaster, branchCaster, breakCaster, repeatCaster, expiryCaster, target]);
    for (const [actor, spell] of [
      [areaCaster, 'ordered-area'], [branchCaster, 'ordered-branch'], [breakCaster, 'ordered-break'],
      [repeatCaster, 'ordered-repeat'], [expiryCaster, 'ordered-expiry'],
    ] as const) {
      state = cast(state, actor, target, spell).state;
      if (actor !== expiryCaster) state = endTurn(state, actor).state;
    }
    const boundary = endTurn(state, expiryCaster, face(1));
    const index = (predicate: (event: EncounterEvent) => boolean) => boundary.events.findIndex(predicate);
    const areaTrigger = index((event) => event.type === 'persistent_area_triggered');
    const damageBreak = index((event) => event.type === 'effect_ended' && event.reason === 'damage_taken');
    const branchDamage = boundary.events.findIndex((event, eventIndex) => eventIndex > damageBreak && event.type === 'damage_applied');
    const repeatSave = index((event) => event.type === 'save_resolved' && event.effectId !== null);
    const expiry = index((event) => event.type === 'effect_ended' && event.reason === 'duration_expired');
    expect([areaTrigger, damageBreak, branchDamage, repeatSave, expiry].every((value) => value >= 0)).toBe(true);
    expect(areaTrigger).toBeLessThan(damageBreak);
    expect(damageBreak).toBeLessThan(branchDamage);
    expect(branchDamage).toBeLessThan(repeatSave);
    expect(repeatSave).toBeLessThan(expiry);
    expect(CONDITION_LIFECYCLE_HOOK_ORDER).toEqual([
      'persistent_area_hooks_and_damage_lifecycle',
      'reevaluated_branches_and_damage_lifecycle',
      'effect_payloads_and_damage_lifecycle',
      'repeat_saves',
      'duration_expiry',
    ]);
  });

  it('repeat_save_seeded_rng: identical encounter seeds produce byte-identical lifecycle event streams', () => {
    const pack = packWithSpells([{
      id: 'seeded-repeat',
      operation: lifecycle({ repeatedSave: { hook: 'target_end', ability: 'wisdom', rollMode: 'normal', onSuccess: 'remove_target' } }),
    }]);
    const run = (seed: number): string => {
      const caster = playerProfile('seed-life-caster', { initiativeBonus: 20 });
      const target = monsterProfile('seed-life-target', { initiativeBonus: -20 });
      const rng = mulberry32(seed);
      let state = reduceEncounter(createEncounter({
        config: { initiativeMode: 'per_combatant' }, bounds: { columns: 4, rows: 1 },
        combatants: [caster, target], tokens: [placedToken(caster, 0), placedToken(target, 1)], contentPacks: [pack],
      }), { type: 'roll_initiative' }, rng).state;
      state = cast(state, caster, target, 'seeded-repeat', rng).state;
      state = endTurn(state, caster, rng).state;
      state = endTurn(state, target, rng).state;
      return canonicalJson(state.eventLog);
    };
    expect(Array.from({ length: 10 }, () => run(410))).toEqual(Array.from({ length: 10 }, () => run(410)));
    expect(run(410)).not.toBe(run(411));
  });

  it('schema_boundaries: duration one loads while zero and invalid concentration extension are refused', () => {
    const fixture = JSON.parse(readFileSync('tests/fixtures/content-pack-v1-homebrew.json', 'utf8')) as {
      spells: Array<{ operation: unknown }>;
    };
    fixture.spells[0]!.operation = lifecycle({ duration: { kind: 'fixed_rounds', rounds: 1, expiresAt: 'target_end' } });
    expect(loadContentPack(fixture).status).toBe('loaded');
    fixture.spells[0]!.operation = lifecycle({ duration: { kind: 'fixed_rounds', rounds: 0, expiresAt: 'target_end' } });
    expect(loadContentPack(fixture)).toMatchObject({ status: 'refused', refusal: { reason: 'malformed_record' } });
    fixture.spells[0]!.operation = {
      kind: 'condition_lifecycle', condition: 'Frightened', immunity: null, initialSave: null,
      repeatedSave: null, damageBreak: null, duration: { kind: 'concentration' },
      stacking: { kind: 'extend_duration', sources: 'same_source' },
    };
    expect(loadContentPack(fixture)).toMatchObject({ status: 'refused', refusal: { reason: 'malformed_record' } });
  });
});
