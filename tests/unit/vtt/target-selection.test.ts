import { readFileSync } from '../../helpers/test-filesystem';
import { describe, expect, it } from 'vitest';
import type { CombatantProfile } from '../../../src/combat/combatant';
import {
  createEncounter,
  reduceEncounter,
  TargetSelectionRuleError,
  type EncounterState,
} from '../../../src/combat/encounter';
import type { SpellCastCommand } from '../../../src/combat/spells/types';
import type { CombatantId } from '../../../src/combat/values';
import { loadContentPack, type LoadedContentPack } from '../../../src/content/content-pack';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

interface ImportedSpell {
  readonly id: string;
  readonly level: number;
  readonly targeting: unknown;
  readonly operation: unknown;
}

const fixedDamage = (amount: number) => ({
  kind: 'damage_operation', delivery: { kind: 'automatic' }, instancesPerTarget: 1,
  packets: [{
    damageType: { kind: 'fixed', damageType: 'Force' },
    dice: {
      baseCount: 0, sides: 4, modifier: amount,
      perSlotCount: 0, perSlotModifier: 0, cantripUpgrade: false,
    },
    scaling: { kind: 'none' }, thresholdRider: null,
  }],
  timing: { kind: 'immediate' },
});

const magicMissiles = {
  kind: 'magic_missiles', baseDarts: 3, additionalPerSlot: 1, damageType: 'Force',
  dice: {
    baseCount: 1, sides: 4, modifier: 1,
    perSlotCount: 0, perSlotModifier: 0, cantripUpgrade: false,
  },
} as const;

function importedPack(spells: readonly ImportedSpell[]): LoadedContentPack {
  const source = JSON.parse(readFileSync('tests/fixtures/content-pack-v1-homebrew.json', 'utf8')) as {
    readonly spells: readonly Readonly<Record<string, unknown>>[];
    readonly [key: string]: unknown;
  };
  const template = source.spells[0];
  if (template === undefined) throw new Error('Content-pack spell template is missing.');
  const loaded = loadContentPack({
    ...source,
    spells: spells.map((spell) => ({
      ...template,
      recordId: spell.id,
      name: spell.id,
      level: spell.level,
      range: { kind: 'feet', feet: 150 },
      targeting: spell.targeting,
      operation: spell.operation,
    })),
  });
  if (loaded.status !== 'loaded') throw new Error(`Target-selection fixture refused: ${loaded.refusal.reason}`);
  expect(loaded.content.diagnostics).toEqual([]);
  return loaded.content;
}

interface PositionedCombatant {
  readonly profile: CombatantProfile;
  readonly column: number;
  readonly row?: number;
}

function started(content: LoadedContentPack, positioned: readonly PositionedCombatant[]): EncounterState {
  return reduceEncounter(createEncounter({
    config: { initiativeMode: 'per_combatant' },
    bounds: { columns: 50, rows: 20 },
    combatants: positioned.map(({ profile }) => profile),
    tokens: positioned.map(({ profile, column, row }) => placedToken(profile, column, row ?? 0)),
    contentPacks: [content],
  }), { type: 'roll_initiative' }, () => 0).state;
}

function command(
  caster: CombatantProfile,
  spellId: string,
  slotLevel: number | null,
  targets: readonly CombatantId[],
  targetDestinations?: SpellCastCommand['targetDestinations'],
): SpellCastCommand {
  return {
    type: 'cast_spell', actor: caster.id, spellId: `greenforge:${spellId}`, slotLevel,
    castAsRitual: false, casterLevel: 12, attackBonus: 8, saveDc: 16,
    spellcastingModifier: 5, targets, area: null, weaponAttack: null, selectedOption: null,
    ...(targetDestinations === undefined ? {} : { targetDestinations }),
  };
}

function selectionRefusal(operation: () => unknown): TargetSelectionRuleError {
  try {
    operation();
  } catch (error: unknown) {
    if (error instanceof TargetSelectionRuleError) return error;
    throw error;
  }
  throw new Error('Expected a target-selection refusal.');
}

function hitPoints(state: EncounterState, target: CombatantProfile): number {
  const found = state.combatants.find(({ profile }) => profile.id === target.id);
  if (found === undefined) throw new Error(`Missing target ${target.id}.`);
  return found.hitPoints;
}

describe('D348.1 imported target-selection binding', () => {
  it('allocation_count_drifts and distinguishing_allocation_vs_up_to: Magic Missile allocates exactly 3+slot darts and resolves doubled targets per dart', () => {
    // Three darts, per-dart damage, and +1 dart per higher slot: docs/srd/source/spell-descriptions.txt:5041-5047.
    const allocation = {
      kind: 'selected', rangeFeet: 120,
      selection: {
        kind: 'projectile_allocation',
        projectiles: { kind: 'slot_scaled', base: 3, additionalPerSlot: 1, limit: 'exact' },
        geometry: [], uniqueness: 'repeatable', resolution: 'per_projectile',
      },
    } as const;
    const upTo = {
      kind: 'selected', rangeFeet: 120,
      selection: {
        kind: 'targets', count: { kind: 'up_to', maximum: 4 }, geometry: [],
        uniqueness: 'unique', destinations: 'none',
      },
    } as const;
    const pack = importedPack([
      { id: 'magic-missile-shape', level: 1, targeting: allocation, operation: magicMissiles },
      { id: 'up-to-shape', level: 1, targeting: upTo, operation: fixedDamage(2) },
    ]);
    const caster = playerProfile('allocation-caster', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 2 }] });
    const first = monsterProfile('allocation-first', { initiativeBonus: -10, hitPoints: 20 });
    const second = monsterProfile('allocation-second', { initiativeBonus: -20, hitPoints: 20 });
    const initial = started(pack, [
      { profile: caster, column: 0 }, { profile: first, column: 2 }, { profile: second, column: 3 },
    ]);

    const allocationCast = reduceEncounter(
      initial,
      command(caster, 'magic-missile-shape', 1, [first.id, first.id, second.id]),
      () => 0,
    );
    expect(hitPoints(allocationCast.state, first)).toBe(16);
    expect(hitPoints(allocationCast.state, second)).toBe(18);

    const directCast = reduceEncounter(initial, command(caster, 'up-to-shape', 1, [first.id, second.id]), () => 0);
    expect(hitPoints(directCast.state, first)).toBe(18);
    expect(hitPoints(directCast.state, second)).toBe(18);

    expect(selectionRefusal(() => reduceEncounter(
      initial,
      command(caster, 'magic-missile-shape', 1, [first.id, first.id, second.id, second.id]),
      () => 0,
    )).rule).toBe('projectile_allocation_count');
  });

  it('secondary_range_unchecked: Chain Lightning accepts a secondary exactly 30 feet from the primary and refuses one 35 feet away', () => {
    // Primary, up to three secondaries, 30-foot secondary boundary, and uniqueness: docs/srd/source/spell-descriptions.txt:1008-1016.
    const pack = importedPack([{ id: 'chain-lightning-shape', level: 6, targeting: {
      kind: 'selected', rangeFeet: 150,
      selection: {
        kind: 'targets', count: { kind: 'up_to', maximum: 4 },
        geometry: [{ kind: 'secondaries_within_primary', distanceFeet: 30 }],
        uniqueness: 'unique', destinations: 'none',
      },
    }, operation: fixedDamage(1) }]);
    const caster = playerProfile('chain-caster', { initiativeBonus: 20, spellSlots: [{ level: 6, maximum: 2 }] });
    const primary = monsterProfile('chain-primary', { initiativeBonus: -10, hitPoints: 20 });
    const exact = monsterProfile('chain-exact', { initiativeBonus: -20, hitPoints: 20 });
    const beyond = monsterProfile('chain-beyond', { initiativeBonus: -30, hitPoints: 20 });
    const state = started(pack, [
      { profile: caster, column: 0 }, { profile: primary, column: 10 },
      { profile: exact, column: 16 }, { profile: beyond, column: 17 },
    ]);

    expect(reduceEncounter(state, command(caster, 'chain-lightning-shape', 6, [primary.id, exact.id]), () => 0).events)
      .toContainEqual(expect.objectContaining({ type: 'spell_cast', targets: [primary.id, exact.id] }));
    expect(selectionRefusal(() => reduceEncounter(
      state, command(caster, 'chain-lightning-shape', 6, [primary.id, beyond.id]), () => 0,
    )).rule).toBe('secondary_range_from_primary');
  });

  it('acid_pair_boundary: one target and a pair exactly 5 feet apart are legal, while a pair 10 feet apart refuses', () => {
    // The retained 2014 trace is private-repo docs/compound-residue-analysis.md:131; the bundled 2024 spell is an area at docs/srd/source/spell-descriptions.txt:37-48.
    const pack = importedPack([{ id: 'acid-splash-2014-shape', level: 0, targeting: {
      kind: 'selected', rangeFeet: 60,
      selection: {
        kind: 'targets', count: { kind: 'up_to', maximum: 2 },
        geometry: [{ kind: 'pair_within', distanceFeet: 5 }],
        uniqueness: 'unique', destinations: 'none',
      },
    }, operation: fixedDamage(1) }]);
    const caster = playerProfile('acid-caster', { initiativeBonus: 20 });
    const first = monsterProfile('acid-first', { initiativeBonus: -10 });
    const exact = monsterProfile('acid-exact', { initiativeBonus: -20 });
    const beyond = monsterProfile('acid-beyond', { initiativeBonus: -30 });
    const state = started(pack, [
      { profile: caster, column: 0 }, { profile: first, column: 5 },
      { profile: exact, column: 6 }, { profile: beyond, column: 7 },
    ]);

    expect(reduceEncounter(state, command(caster, 'acid-splash-2014-shape', null, [first.id]), () => 0).events)
      .toContainEqual(expect.objectContaining({ type: 'spell_cast', targets: [first.id] }));
    expect(reduceEncounter(state, command(caster, 'acid-splash-2014-shape', null, [first.id, exact.id]), () => 0).events)
      .toContainEqual(expect.objectContaining({ type: 'spell_cast', targets: [first.id, exact.id] }));
    expect(selectionRefusal(() => reduceEncounter(
      state, command(caster, 'acid-splash-2014-shape', null, [first.id, beyond.id]), () => 0,
    )).rule).toBe('pair_range');
  });

  it('slot_scaled_count_boundary: base K and K+n are legal, while K+n+1 is a typed refusal', () => {
    // Bless supplies the up-to-K plus one-per-higher-slot shape: docs/srd/source/spell-descriptions.txt:836-840.
    const pack = importedPack([{ id: 'slot-scaled-shape', level: 1, targeting: {
      kind: 'selected', rangeFeet: 30,
      selection: {
        kind: 'targets',
        count: { kind: 'slot_scaled', base: 3, additionalPerSlot: 1, limit: 'up_to' },
        geometry: [], uniqueness: 'unique', destinations: 'none',
      },
    }, operation: fixedDamage(1) }]);
    const caster = playerProfile('scaled-caster', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }, { level: 2, maximum: 2 }] });
    const targets = Array.from({ length: 5 }, (_entry, index) => monsterProfile(`scaled-${String(index)}`, { initiativeBonus: -index - 1 }));
    const state = started(pack, [
      { profile: caster, column: 0 },
      ...targets.map((profile, index) => ({ profile, column: index + 1 })),
    ]);

    expect(reduceEncounter(state, command(caster, 'slot-scaled-shape', 1, targets.slice(0, 3).map(({ id }) => id)), () => 0).events)
      .toContainEqual(expect.objectContaining({ type: 'spell_cast' }));
    expect(reduceEncounter(state, command(caster, 'slot-scaled-shape', 2, targets.slice(0, 4).map(({ id }) => id)), () => 0).events)
      .toContainEqual(expect.objectContaining({ type: 'spell_cast' }));
    expect(selectionRefusal(() => reduceEncounter(
      state, command(caster, 'slot-scaled-shape', 2, targets.map(({ id }) => id)), () => 0,
    )).rule).toBe('slot_scaled_count');
  });

  it('fixed_and_up_to_count_boundaries: each maximum is legal and one beyond names its own violated count rule', () => {
    const pack = importedPack([
      { id: 'fixed-two', level: 1, targeting: {
        kind: 'selected', rangeFeet: 30,
        selection: { kind: 'targets', count: { kind: 'fixed', count: 2 }, geometry: [], uniqueness: 'unique', destinations: 'none' },
      }, operation: fixedDamage(1) },
      { id: 'up-to-two', level: 1, targeting: {
        kind: 'selected', rangeFeet: 30,
        selection: { kind: 'targets', count: { kind: 'up_to', maximum: 2 }, geometry: [], uniqueness: 'unique', destinations: 'none' },
      }, operation: fixedDamage(1) },
    ]);
    const caster = playerProfile('count-caster', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 4 }] });
    const targets = [0, 1, 2].map((index) => monsterProfile(`count-${String(index)}`, { initiativeBonus: -index - 1 }));
    const state = started(pack, [{ profile: caster, column: 0 }, ...targets.map((profile, index) => ({ profile, column: index + 1 }))]);
    const ids = targets.map(({ id }) => id);

    expect(reduceEncounter(state, command(caster, 'fixed-two', 1, ids.slice(0, 2)), () => 0).events)
      .toContainEqual(expect.objectContaining({ type: 'spell_cast' }));
    expect(selectionRefusal(() => reduceEncounter(state, command(caster, 'fixed-two', 1, ids), () => 0)).rule).toBe('fixed_count');
    expect(reduceEncounter(state, command(caster, 'up-to-two', 1, ids.slice(0, 2)), () => 0).events)
      .toContainEqual(expect.objectContaining({ type: 'spell_cast' }));
    expect(selectionRefusal(() => reduceEncounter(state, command(caster, 'up-to-two', 1, ids), () => 0)).rule).toBe('up_to_count');
  });

  it('all_targets_range_boundary: every pair exactly at 30 feet is legal and one 35-foot pair refuses', () => {
    const pack = importedPack([{ id: 'all-within-shape', level: 1, targeting: {
      kind: 'selected', rangeFeet: 60,
      selection: {
        kind: 'targets', count: { kind: 'up_to', maximum: 3 },
        geometry: [{ kind: 'all_within_each_other', distanceFeet: 30 }],
        uniqueness: 'unique', destinations: 'none',
      },
    }, operation: fixedDamage(1) }]);
    const caster = playerProfile('all-within-caster', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 2 }] });
    const first = monsterProfile('all-within-first', { initiativeBonus: -10 });
    const exact = monsterProfile('all-within-exact', { initiativeBonus: -20 });
    const beyond = monsterProfile('all-within-beyond', { initiativeBonus: -30 });
    const state = started(pack, [
      { profile: caster, column: 0 }, { profile: first, column: 2 },
      { profile: exact, column: 8 }, { profile: beyond, column: 9 },
    ]);

    expect(reduceEncounter(state, command(caster, 'all-within-shape', 1, [first.id, exact.id]), () => 0).events)
      .toContainEqual(expect.objectContaining({ type: 'spell_cast' }));
    expect(selectionRefusal(() => reduceEncounter(
      state, command(caster, 'all-within-shape', 1, [first.id, beyond.id]), () => 0,
    )).rule).toBe('all_targets_range');
  });

  it('all_targets_range checks non-first target pairs', () => {
    const pack = importedPack([{ id: 'all-pairs-shape', level: 1, targeting: {
      kind: 'selected', rangeFeet: 60,
      selection: {
        kind: 'targets', count: { kind: 'fixed', count: 3 },
        geometry: [{ kind: 'all_within_each_other', distanceFeet: 30 }],
        uniqueness: 'unique', destinations: 'none',
      },
    }, operation: fixedDamage(1) }]);
    const caster = playerProfile('all-pairs-caster', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 2 }] });
    const target0 = monsterProfile('all-pairs-target-0', { initiativeBonus: -10 });
    const target1 = monsterProfile('all-pairs-target-1', { initiativeBonus: -20 });
    const target2 = monsterProfile('all-pairs-target-2', { initiativeBonus: -30 });
    const positioned = (target2Column: number) => started(pack, [
      { profile: caster, column: 6, row: 2 },
      { profile: target0, column: 6 },
      { profile: target1, column: 0 },
      { profile: target2, column: target2Column },
    ]);
    const cast = (state: EncounterState) => reduceEncounter(
      state,
      command(caster, 'all-pairs-shape', 1, [target0.id, target1.id, target2.id]),
      () => 0,
    );

    expect(selectionRefusal(() => cast(positioned(12))).rule).toBe('all_targets_range');
    expect(cast(positioned(1)).events)
      .toContainEqual(expect.objectContaining({ type: 'spell_cast', targets: [target0.id, target1.id, target2.id] }));
  });

  it('uniqueness_ignored: unique and repeatable declarations distinguish the same doubled target', () => {
    const targetSelection = (uniqueness: 'unique' | 'repeatable') => ({
      kind: 'selected', rangeFeet: 30,
      selection: {
        kind: 'targets', count: { kind: 'fixed', count: 2 }, geometry: [],
        uniqueness, destinations: 'none',
      },
    });
    const pack = importedPack([
      { id: 'unique-shape', level: 1, targeting: targetSelection('unique'), operation: fixedDamage(1) },
      { id: 'repeatable-shape', level: 1, targeting: targetSelection('repeatable'), operation: fixedDamage(1) },
    ]);
    const caster = playerProfile('unique-caster', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 2 }] });
    const target = monsterProfile('unique-target', { initiativeBonus: -10, hitPoints: 20 });
    const state = started(pack, [{ profile: caster, column: 0 }, { profile: target, column: 1 }]);

    expect(selectionRefusal(() => reduceEncounter(
      state, command(caster, 'unique-shape', 1, [target.id, target.id]), () => 0,
    )).rule).toBe('unique_targets');
    expect(hitPoints(reduceEncounter(
      state, command(caster, 'repeatable-shape', 1, [target.id, target.id]), () => 0,
    ).state, target)).toBe(18);
  });

  it('upcast_scales_inner_sets: one slot-scaled outer target set is inherited by both sibling operations', () => {
    const operation = {
      kind: 'composition', ordering: 'declaration_order', onRefusal: 'abort',
      steps: [
        { targetResolution: { kind: 'inherit' }, operation: fixedDamage(1) },
        { targetResolution: { kind: 'inherit' }, operation: fixedDamage(1) },
      ],
    } as const;
    const pack = importedPack([{ id: 'shared-upcast-set', level: 1, targeting: {
      kind: 'selected', rangeFeet: 30,
      selection: {
        kind: 'targets', count: { kind: 'slot_scaled', base: 1, additionalPerSlot: 1, limit: 'exact' },
        geometry: [], uniqueness: 'unique', destinations: 'none',
      },
    }, operation }]);
    const caster = playerProfile('shared-upcast-caster', { initiativeBonus: 20, spellSlots: [{ level: 2, maximum: 1 }] });
    const first = monsterProfile('shared-upcast-first', { initiativeBonus: -10, hitPoints: 20 });
    const second = monsterProfile('shared-upcast-second', { initiativeBonus: -20, hitPoints: 20 });
    const state = started(pack, [{ profile: caster, column: 0 }, { profile: first, column: 1 }, { profile: second, column: 2 }]);
    const result = reduceEncounter(state, command(caster, 'shared-upcast-set', 2, [first.id, second.id]), () => 0);

    expect(hitPoints(result.state, first)).toBe(18);
    expect(hitPoints(result.state, second)).toBe(18);
  });

  it('each_target_own_destination: each selected target requires and uses its ordered destination', () => {
    const pack = importedPack([{ id: 'scatter-shape', level: 1, targeting: {
      kind: 'selected', rangeFeet: 30,
      selection: {
        kind: 'targets', count: { kind: 'fixed', count: 2 }, geometry: [],
        uniqueness: 'unique', destinations: 'each_target',
      },
    }, operation: {
      kind: 'teleport', subject: 'targets', maximumDistanceFeet: 60,
      destination: { requireUnoccupied: true, requireOccupiable: true, requireLineOfSight: false },
    } }]);
    const caster = playerProfile('destination-caster', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 2 }] });
    const first = monsterProfile('destination-first', { initiativeBonus: -10 });
    const second = monsterProfile('destination-second', { initiativeBonus: -20 });
    const state = started(pack, [{ profile: caster, column: 0 }, { profile: first, column: 1 }, { profile: second, column: 2 }]);
    const targets = [first.id, second.id];

    expect(selectionRefusal(() => reduceEncounter(
      state, command(caster, 'scatter-shape', 1, targets, [{ target: first.id, destination: { column: 5, row: 0 } }]), () => 0,
    )).rule).toBe('each_target_own_destination');

    const result = reduceEncounter(state, command(caster, 'scatter-shape', 1, targets, [
      { target: first.id, destination: { column: 5, row: 0 } },
      { target: second.id, destination: { column: 6, row: 0 } },
    ]), () => 0);
    expect(result.state.tokens.find(({ combatantId }) => combatantId === first.id)?.position).toEqual({ column: 5, row: 0 });
    expect(result.state.tokens.find(({ combatantId }) => combatantId === second.id)?.position).toEqual({ column: 6, row: 0 });
  });
});
