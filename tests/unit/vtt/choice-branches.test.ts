import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import type { CombatantProfile } from '../../../src/combat/combatant';
import { EncounterRuleError, createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { SpellCastCommand } from '../../../src/combat/spells/types';
import type { SpellOperation } from '../../../src/combat/spells/types';
import { mulberry32, type Rng } from '../../../src/combat/random';
import { damageType, feet } from '../../../src/combat/values';
import {
  importedMonsterProfile,
  loadContentPack,
  type LoadedContentPack,
} from '../../../src/content/content-pack';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

interface SpellSpec {
  readonly id: string;
  readonly operation: SpellOperation;
}

function packWithSpells(specs: readonly SpellSpec[], creatureType?: string): LoadedContentPack {
  const fixture = JSON.parse(readFileSync('tests/fixtures/content-pack-v1-homebrew.json', 'utf8')) as {
    readonly spells: readonly Readonly<Record<string, unknown>>[];
    readonly monsters: readonly { readonly statblock: Readonly<Record<string, unknown>>; readonly [key: string]: unknown }[];
    readonly [key: string]: unknown;
  };
  const template = fixture.spells[0];
  const monster = fixture.monsters[0];
  if (template === undefined || monster === undefined) throw new Error('Content-pack fixture is incomplete.');
  const result = loadContentPack({
    ...fixture,
    spells: specs.map((spec) => ({
      ...template,
      recordId: spec.id,
      name: spec.id,
      targeting: { kind: 'single', rangeFeet: 150, willing: true },
      operation: spec.operation,
    })),
    monsters: [{
      ...monster,
      statblock: {
        ...monster.statblock,
        ...(creatureType === undefined ? {} : { creatureType }),
      },
    }],
  });
  if (result.status !== 'loaded') throw new Error(`Choice-branch fixture refused: ${result.refusal.reason}`);
  return result.content;
}

function fixedDamage(amount: number, type = 'Force'): SpellOperation {
  return {
    kind: 'damage_operation',
    delivery: { kind: 'automatic' },
    instancesPerTarget: 1,
    packets: [{
      damageType: { kind: 'fixed', damageType: damageType(type) },
      dice: {
        baseCount: 0, sides: 4, modifier: amount, perSlotCount: 0,
        perSlotModifier: 0, cantripUpgrade: false,
      },
      scaling: { kind: 'none' },
      thresholdRider: null,
    }],
    timing: { kind: 'immediate' },
  };
}

function command(
  caster: CombatantProfile,
  target: CombatantProfile,
  spellId: string,
  selectedOption: string | null = null,
): SpellCastCommand {
  return {
    type: 'cast_spell', actor: caster.id, spellId: `greenforge:${spellId}`, slotLevel: 1,
    castAsRitual: false, casterLevel: 5, attackBonus: 8, saveDc: 15,
    spellcastingModifier: 4, targets: [target.id], area: null, weaponAttack: null,
    selectedOption,
  };
}

function encounter(pack: LoadedContentPack, caster: CombatantProfile, target: CombatantProfile, rng: Rng): EncounterState {
  return reduceEncounter(createEncounter({
    bounds: { columns: 6, rows: 2 }, combatants: [caster, target],
    tokens: [placedToken(caster, 0), placedToken(target, 1)], contentPacks: [pack],
  }), { type: 'roll_initiative' }, rng).state;
}

function hitPoints(state: EncounterState, profile: CombatantProfile): number {
  const subject = state.combatants.find((candidate) => candidate.profile.id === profile.id);
  if (subject === undefined) throw new Error(`Missing combatant ${profile.id}.`);
  return subject.hitPoints;
}

function branchTable(): SpellOperation {
  return {
    kind: 'random_branch', dieSides: 4,
    branches: [
      { minimum: 1, maximum: 1, operation: fixedDamage(1) },
      { minimum: 2, maximum: 3, operation: fixedDamage(2) },
      { minimum: 4, maximum: 4, operation: fixedDamage(4) },
    ],
  };
}

describe('CAP-IMP-007 imported choice and branch operations', () => {
  it('caster_choice_boundaries: executes the first and last declared modes and invalid_mode_defaults refuses an undeclared mode', () => {
    // Chromatic Orb: "Choose Acid, Cold, Fire, Lightning, Poison, or Thunder".
    // docs/srd/source/spell-descriptions.txt:1087-1090.
    // Command likewise says "Choose the command from these options".
    // docs/srd/source/spell-descriptions.txt:1218-1228.
    const pack = packWithSpells([{
      id: 'chromatic-choice',
      operation: {
        kind: 'caster_choice',
        modes: [
          { mode: 'acid', operation: fixedDamage(3, 'Acid') },
          { mode: 'thunder', operation: fixedDamage(7, 'Thunder') },
        ],
      },
    }]);
    const caster = playerProfile('choice-caster', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }] });
    const target = monsterProfile('choice-target', { initiativeBonus: -20, hitPoints: 20 });
    const first = reduceEncounter(encounter(pack, caster, target, () => 0), command(caster, target, 'chromatic-choice', 'acid'), () => 0);
    const last = reduceEncounter(encounter(pack, caster, target, () => 0), command(caster, target, 'chromatic-choice', 'thunder'), () => 0);
    expect(hitPoints(first.state, target)).toBe(17);
    expect(hitPoints(last.state, target)).toBe(13);
    expect(() => reduceEncounter(
      encounter(pack, caster, target, () => 0),
      command(caster, target, 'chromatic-choice', 'outside-declared-set'),
      () => 0,
    )).toThrowError(new EncounterRuleError('chromatic-choice requires one of its declared caster modes.'));
  });

  it('branch_table_gap_ignored refuses both a gap and an overlap instead of loading either table', () => {
    const fixture = JSON.parse(readFileSync('tests/fixtures/content-pack-v1-homebrew.json', 'utf8')) as {
      spells: Array<{ operation: unknown }>;
    };
    fixture.spells[0]!.operation = {
      kind: 'random_branch', dieSides: 4,
      branches: [
        { minimum: 1, maximum: 1, operation: fixedDamage(1) },
        { minimum: 3, maximum: 4, operation: fixedDamage(4) },
      ],
    };
    expect(loadContentPack(fixture)).toMatchObject({
      status: 'refused', refusal: { reason: 'malformed_record', path: ['spells', 0, 'operation'] },
    });
    fixture.spells[0]!.operation = {
      kind: 'random_branch', dieSides: 4,
      branches: [
        { minimum: 1, maximum: 3, operation: fixedDamage(1) },
        { minimum: 3, maximum: 4, operation: fixedDamage(4) },
      ],
    };
    expect(loadContentPack(fixture)).toMatchObject({
      status: 'refused', refusal: { reason: 'malformed_record', path: ['spells', 0, 'operation'] },
    });
  });

  it('random_branch_low_face_boundary: selects the first range at face 1', () => {
    // Prismatic Spray: "For each target, roll 1d8 to determine which color ray affects it".
    // docs/srd/source/spell-descriptions.txt:6067-6073.
    const pack = packWithSpells([{ id: 'prismatic-table', operation: branchTable() }]);
    const caster = playerProfile('random-caster', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }] });
    const target = monsterProfile('random-target', { initiativeBonus: -20, hitPoints: 20 });
    const lowest = reduceEncounter(encounter(pack, caster, target, () => 0), command(caster, target, 'prismatic-table'), () => 0);
    expect(hitPoints(lowest.state, target)).toBe(19);
  });

  it('random_branch_high_face_boundary: selects the last range at the highest face', () => {
    const pack = packWithSpells([{ id: 'prismatic-table', operation: branchTable() }]);
    const caster = playerProfile('random-high-caster', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }] });
    const target = monsterProfile('random-high-target', { initiativeBonus: -20, hitPoints: 20 });
    const highest = reduceEncounter(encounter(pack, caster, target, () => 0), command(caster, target, 'prismatic-table'), () => 0.999999);
    expect(hitPoints(highest.state, target)).toBe(16);
  });

  it('target_choice_branch: imported Humanoid metadata selects its branch and an unmatched target does nothing', () => {
    // Hold Person: "Choose a Humanoid that you can see within range."
    // docs/srd/source/spell-descriptions.txt:4348-4353.
    const pack = packWithSpells([{
      id: 'humanoid-only',
      operation: {
        kind: 'target_branch',
        branches: [{
          predicate: { kind: 'creature_type', creatureType: 'Humanoid' },
          operation: fixedDamage(5),
        }],
        otherwise: null,
      },
    }], 'Humanoid');
    const imported = pack.monsters[0];
    if (imported === undefined) throw new Error('Imported monster fixture is missing.');
    const humanoid = importedMonsterProfile(imported, {
      combatantId: 'combatant:imported-humanoid', tokenId: 'token:imported-humanoid',
    });
    const beast = monsterProfile('untyped-target', { initiativeBonus: -20, hitPoints: 20 });
    const humanoidCaster = playerProfile('humanoid-caster', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }] });
    const beastCaster = playerProfile('beast-caster', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }] });
    const matched = reduceEncounter(encounter(pack, humanoidCaster, humanoid, () => 0), command(humanoidCaster, humanoid, 'humanoid-only'), () => 0);
    const unmatched = reduceEncounter(encounter(pack, beastCaster, beast, () => 0), command(beastCaster, beast, 'humanoid-only'), () => 0);
    expect(hitPoints(matched.state, humanoid)).toBe(humanoid.rules.hitPointMaximum - 5);
    expect(hitPoints(unmatched.state, beast)).toBe(20);
  });

  it('branch_fixed_at_cast: re-rolls the branch on its first and final declared rounds', () => {
    // Confusion requires a new 1d10 roll "at the start of each of its turns".
    // docs/srd/source/spell-descriptions.txt:1369-1375.
    const pack = packWithSpells([{
      id: 'roundly-confused',
      operation: { kind: 'reevaluated_branch', hook: 'target_start', durationRounds: 2, operation: branchTable() },
    }]);
    const caster = playerProfile('round-caster', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }] });
    const target = monsterProfile('round-target', { initiativeBonus: -20, hitPoints: 20 });
    const rng = mulberry32(5);
    let state = encounter(pack, caster, target, rng);
    state = reduceEncounter(state, command(caster, target, 'roundly-confused'), rng).state;
    state = reduceEncounter(state, { type: 'end_turn', actor: caster.id }, rng).state;
    const afterFirst = hitPoints(state, target);
    expect(state.reevaluatedBranches?.[0]?.remaining).toBe(1);
    state = reduceEncounter(state, { type: 'end_turn', actor: target.id }, rng).state;
    state = reduceEncounter(state, { type: 'end_turn', actor: caster.id }, rng).state;
    expect([1, 2, 4]).toContain(20 - afterFirst);
    expect([1, 2, 4]).toContain(afterFirst - hitPoints(state, target));
    expect(afterFirst - hitPoints(state, target)).not.toBe(20 - afterFirst);
    expect(state.reevaluatedBranches).toEqual([]);
  });

  it('branch_rerolled_from_fresh_rng: identical seeds produce byte-identical re-evaluated event streams', () => {
    const pack = packWithSpells([{
      id: 'seeded-confusion',
      operation: { kind: 'reevaluated_branch', hook: 'target_start', durationRounds: 2, operation: branchTable() },
    }]);
    const run = (seed: number): string => {
      const caster = playerProfile('seed-caster', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }] });
      const target = monsterProfile('seed-target', { initiativeBonus: -20, hitPoints: 20 });
      const rng = mulberry32(seed);
      let state = encounter(pack, caster, target, rng);
      state = reduceEncounter(state, command(caster, target, 'seeded-confusion'), rng).state;
      state = reduceEncounter(state, { type: 'end_turn', actor: caster.id }, rng).state;
      state = reduceEncounter(state, { type: 'end_turn', actor: target.id }, rng).state;
      state = reduceEncounter(state, { type: 'end_turn', actor: caster.id }, rng).state;
      return canonicalJson(state.eventLog);
    };
    const replays = Array.from({ length: 20 }, () => run(91));
    expect(new Set(replays).size).toBe(1);
    expect(run(91)).not.toBe(run(92));
  });

  it('same_hook_order: persistent-area start hooks run before re-evaluated branches and condition removal', () => {
    const area: SpellOperation = {
      kind: 'persistent_area', origin: 'anchored_to_caster',
      shape: { kind: 'emanation', radius: feet(10) }, durationRounds: 4, concentration: false,
      targetFilter: 'selected', includeOwner: false, difficultTerrain: false, movableFeet: null,
      hooks: [{
        hook: 'on_start_of_turn_inside', frequency: 'every_trigger',
        effect: {
          kind: 'automatic', payload: {
            kind: 'effect', payload: { kind: 'condition', condition: 'Poisoned' },
            lifetime: { kind: 'while_inside' },
          },
        },
      }],
      initialEffects: [],
    };
    const removal: SpellOperation = {
      kind: 'reevaluated_branch', hook: 'target_start', durationRounds: 1,
      operation: { kind: 'remove_condition', conditions: ['Poisoned'] },
    };
    const pack = packWithSpells([
      { id: 'poison-area', operation: area },
      { id: 'scheduled-cleanse', operation: removal },
    ]);
    const caster = playerProfile('order-caster', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 2 }] });
    const target = monsterProfile('order-target', { initiativeBonus: -20, hitPoints: 20 });
    let state = encounter(pack, caster, target, () => 0);
    state = reduceEncounter(state, command(caster, target, 'poison-area'), () => 0).state;
    state = reduceEncounter(state, { type: 'end_turn', actor: caster.id }, () => 0).state;
    state = reduceEncounter(state, { type: 'end_turn', actor: target.id }, () => 0).state;
    state = reduceEncounter(state, command(caster, target, 'scheduled-cleanse', 'Poisoned'), () => 0).state;
    const result = reduceEncounter(state, { type: 'end_turn', actor: caster.id }, () => 0);
    const triggered = result.events.findIndex((event) => event.type === 'persistent_area_triggered');
    const removed = result.events.findIndex((event) => event.type === 'effect_target_removed');
    expect(triggered).toBeGreaterThanOrEqual(0);
    expect(removed).toBeGreaterThan(triggered);
  });
});
