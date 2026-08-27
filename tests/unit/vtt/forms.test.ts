import { describe, expect, it } from 'vitest';
import { declareTestInputs } from '../../helpers/test-inputs';
import type { CombatantProfile } from '../../../src/combat/combatant';
import {
  availableFormActions,
  canCombatantSee,
  createEncounter,
  EquipmentRuleError,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import {
  FORM_REPLACEMENT_RETAINED_STATISTICS,
  type BranchSpellOperation,
  type SpellCastCommand,
} from '../../../src/combat/spells/types';
import { damageType, dieSides, itemId } from '../../../src/combat/values';
import {
  importedMonsterAttackCommand,
  loadContentPack,
  OBJECT_TO_CREATURE_REFUSAL,
  TRUE_POLYMORPH_PERMANENCE_REFUSAL,
  type LoadedContentPack,
} from '../../../src/content/content-pack';
import { placedToken, playerProfile } from '../combat/fixtures';

const { readText: readFileSync } = declareTestInputs({
  fixtures: ['tests/fixtures/content-pack-v1-homebrew.json'],
}).fixtures;

interface MutableFormsPack {
  packId: string;
  spells: Array<Record<string, unknown>>;
  items: Array<Record<string, unknown>>;
  monsters: Array<{
    recordId: string;
    name: string;
    statblock: Record<string, unknown>;
    actions: unknown[];
  }>;
  [key: string]: unknown;
}

const FORM_ITEM = itemId('greenforge:shape-knife');

function sourcePack(): MutableFormsPack {
  const source = JSON.parse(readFileSync('tests/fixtures/content-pack-v1-homebrew.json', 'utf8')) as MutableFormsPack;
  source.packId = 'forms-fixture';
  const monster = source.monsters[0];
  if (monster === undefined) throw new Error('Forms fixture has no monster statblock.');
  monster.statblock.speedFeet = 40;
  monster.statblock.senses = [
    { kind: 'normal_sight' },
    { kind: 'blindsight', rangeFeet: 30 },
  ];
  source.items = [{
    sourceId: 'greenforge', recordId: 'shape-knife', name: 'Shape Knife',
    materials: [{ kind: 'other', name: 'bone' }],
    equip: { kind: 'held', handCapacity: 1, droppable: true },
  }];
  return source;
}

function packMonsterOperation(
  equipmentDisposition: 'merged_into_form' | 'dropped_at_origin' = 'merged_into_form',
): Extract<BranchSpellOperation, { readonly kind: 'form_replacement' }> {
  return {
    kind: 'form_replacement',
    form: { kind: 'pack_monster', monsterId: 'brassleaf-mote' },
    retainedStatistics: FORM_REPLACEMENT_RETAINED_STATISTICS,
    hitPoints: 'temporary_form_pool',
    equipmentDisposition,
    actionAccess: 'form_statblock_only',
    spellcasting: 'prohibited',
    lifecycle: { concentration: true, durationRounds: 10, expiresAt: 'source_start' },
  };
}

function statOverrideOperation(): Extract<BranchSpellOperation, { readonly kind: 'form_replacement' }> {
  return {
    ...packMonsterOperation('dropped_at_origin'),
    form: {
      kind: 'stat_override',
      stats: {
        id: 'mist-hound', name: 'Mist Hound', armorClass: 13, hitPointMaximum: 7,
        speedFeet: 45, initiativeBonus: 3,
        savingThrowBonuses: {
          strength: 2, dexterity: 3, constitution: 1,
          intelligence: -2, wisdom: 2, charisma: -1,
        },
        attacksPerAction: 1, reachFeet: 5,
        damageResponses: [{ type: 'Cold', response: 'resistant' }],
        conditionImmunities: ['Prone'],
        senses: [{ kind: 'normal_sight' }, { kind: 'truesight', rangeFeet: 20 }],
        actions: [{
          kind: 'attack', id: 'mist-bite', name: 'Mist Bite', attackBonus: 5,
          delivery: { kind: 'melee', reachFeet: 5 },
          damage: [{
            average: 5, dice: { count: 1, sides: 8, modifier: 1 }, type: 'Cold',
            trigger: { kind: 'always' },
          }],
          attackRollAdvantage: null, onHit: [],
        }],
      },
    },
  };
}

function formSpell(source: MutableFormsPack, operation: unknown, recordId = 'assume-brassleaf'): Record<string, unknown> {
  const template = source.spells[0];
  if (template === undefined) throw new Error('Forms fixture has no spell template.');
  return {
    ...template,
    recordId,
    name: recordId,
    level: 1,
    duration: { kind: 'rounds', rounds: 10 },
    concentration: true,
    targeting: { kind: 'single', rangeFeet: 30, willing: true },
    operation,
  };
}

function loadedFormsPack(operation: unknown = packMonsterOperation()): LoadedContentPack {
  const source = sourcePack();
  source.spells = [formSpell(source, operation)];
  const result = loadContentPack(source);
  if (result.status !== 'loaded') throw new Error(`Forms pack refused: ${result.refusal.reason}`);
  expect(result.content.diagnostics).toEqual([]);
  return result.content;
}

interface FormsEncounter {
  readonly content: LoadedContentPack;
  readonly caster: CombatantProfile;
  readonly target: CombatantProfile;
  readonly enemy: CombatantProfile;
  readonly state: EncounterState;
}

function started(operation: unknown = packMonsterOperation()): FormsEncounter {
  const content = loadedFormsPack(operation);
  const caster = playerProfile('forms-caster', {
    initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 4 }],
  });
  const target = playerProfile('forms-target', {
    hitPoints: 20, initiativeBonus: 10, spellSlots: [{ level: 1, maximum: 1 }],
  });
  const enemy = playerProfile('forms-enemy', { hitPoints: 30, initiativeBonus: -20 });
  const state = reduceEncounter(createEncounter({
    config: { initiativeMode: 'per_combatant' }, bounds: { columns: 10, rows: 2 },
    combatants: [caster, target, enemy],
    tokens: [placedToken(caster, 0), placedToken(target, 1), placedToken(enemy, 2)],
    contentPacks: [content],
    equipment: [{
      combatant: target.id,
      hands: { kind: 'one_handed', items: [FORM_ITEM] },
      worn: [], carried: [],
    }],
  }), { type: 'roll_initiative' }, () => 0).state;
  return { content, caster, target, enemy, state };
}

function cast(subject: FormsEncounter): EncounterState {
  const command: SpellCastCommand = {
    type: 'cast_spell', actor: subject.caster.id, spellId: 'greenforge:assume-brassleaf',
    slotLevel: 1, castAsRitual: false, casterLevel: 5, attackBonus: 6, saveDc: 14,
    spellcastingModifier: 3, targets: [subject.target.id], area: null,
    weaponAttack: null, selectedOption: null,
  };
  return reduceEncounter(subject.state, command, () => 0).state;
}

function fixedDamage(subject: FormsEncounter, state: EncounterState, amount: number): ReturnType<typeof reduceEncounter> {
  return reduceEncounter(state, {
    type: 'force_save', actor: subject.caster.id, target: subject.target.id,
    ability: 'dexterity', dc: 30, rollMode: 'normal',
    damage: {
      terms: [{ type: damageType('Force'), dice: { count: 0, sides: dieSides(4), modifier: amount } }],
      critical: false, responses: [],
    },
    onSuccess: 'none', cost: 'none',
  }, () => 0);
}

function targetState(state: EncounterState, target: CombatantProfile) {
  const found = state.combatants.find((candidate) => candidate.profile.id === target.id);
  if (found === undefined) throw new Error('Forms target is absent from encounter state.');
  return found;
}

describe('D348.1 imported form and stat replacement', () => {
  it('form_assumed_and_stats_replaced: pack statblock supplies form HP, stats, speed, senses, and actions while identity and original HP persist', () => {
    // Replaced statistics and retained continuity: docs/srd/source/spell-descriptions.txt:5952-5963.
    const subject = started();
    const before = targetState(subject.state, subject.target);
    const transformed = cast(subject);
    const after = targetState(transformed, subject.target);

    expect(after.form).toMatchObject({
      formId: 'greenforge:brassleaf-mote', formName: 'Brassleaf Mote',
      hitPoints: 9, hitPointMaximum: 9,
      retainedStatistics: FORM_REPLACEMENT_RETAINED_STATISTICS,
      equipmentDisposition: 'merged_into_form', spellcasting: 'prohibited',
    });
    expect(after.hitPoints).toBe(20);
    expect(after.profile.name).toBe(before.profile.name);
    expect(after.profile.rules).toMatchObject({ armorClass: 12, speed: 40, initiativeBonus: 1 });
    expect(availableFormActions(transformed, subject.target.id)?.map(({ id }) => id))
      .toEqual(['attack:brassleaf-tap']);

    const enemyCell = transformed.tokens.find(({ combatantId }) => combatantId === subject.enemy.id)?.position;
    if (enemyCell === undefined) throw new Error('Forms enemy has no token.');
    const dark = {
      ...transformed,
      environment: {
        ...transformed.environment,
        lightRegions: [{ id: 'form-sense-darkness', cells: [enemyCell], level: 'darkness' as const }],
      },
    };
    const originalDark = { ...subject.state, environment: dark.environment };
    expect(canCombatantSee(originalDark, subject.target.id, subject.enemy.id)).toBe(false);
    expect(canCombatantSee(dark, subject.target.id, subject.enemy.id)).toBe(true);
  });

  it('carryover_lost and carryover_boundary_exact_vs_one_over: exactly the remaining form HP reverts without original damage; one over carries exactly one', () => {
    // Form THP ends the spell: spell-descriptions.txt:5958-5963. Leftover damage
    // carries to actual HP: docs/srd/full/srd-5.2.1.txt:1126-1131.
    const exactSubject = started();
    const exact = fixedDamage(exactSubject, cast(exactSubject), 9);
    const exactTarget = targetState(exact.state, exactSubject.target);
    expect(exactTarget.form).toBeUndefined();
    expect(exactTarget.hitPoints).toBe(20);
    expect(exact.events).toContainEqual(expect.objectContaining({
      type: 'effect_ended', reason: 'form_hit_points_depleted',
    }));

    const overSubject = started();
    const over = fixedDamage(overSubject, cast(overSubject), 10);
    const overTarget = targetState(over.state, overSubject.target);
    expect(overTarget.form).toBeUndefined();
    expect(overTarget.hitPoints).toBe(19);
  });

  it('original_hp_touched_in_form and revert_keeps_form_stats: partial form damage drains only the form pool and effect-end reversion differs from zero-HP reversion', () => {
    const subject = started();
    const partial = fixedDamage(subject, cast(subject), 4).state;
    expect(targetState(partial, subject.target)).toMatchObject({
      hitPoints: 20,
      form: { hitPoints: 5, hitPointMaximum: 9 },
    });

    const ended = reduceEncounter(partial, {
      type: 'end_concentration', actor: subject.caster.id,
    }, () => 0);
    const endedTarget = targetState(ended.state, subject.target);
    expect(endedTarget.hitPoints).toBe(20);
    expect(endedTarget.form).toBeUndefined();
    expect(endedTarget.profile.rules).toMatchObject({ armorClass: 14, speed: 30 });
    expect(ended.events).toContainEqual(expect.objectContaining({
      type: 'effect_ended', reason: 'concentration_ended',
    }));
    expect(ended.events.some((event) =>
      event.type === 'effect_ended' && event.reason === 'form_hit_points_depleted')).toBe(false);
  });

  it('form_actions_and_casting_restriction: only an unchanged statblock attack is legal and spellcasting is refused', () => {
    // Form anatomy and casting restriction: docs/srd/source/spell-descriptions.txt:5965-5967.
    const subject = started();
    const transformed = cast(subject);
    expect(() => reduceEncounter(transformed, {
      type: 'cast_spell', actor: subject.target.id, spellId: 'greenforge:assume-brassleaf',
      slotLevel: 1, castAsRitual: false, casterLevel: 5, attackBonus: 5, saveDc: 13,
      spellcastingModifier: 2, targets: [subject.target.id], area: null,
      weaponAttack: null, selectedOption: null,
    }, () => 0)).toThrow('cannot cast spells in its current form');

    let targetTurn = reduceEncounter(transformed, { type: 'end_turn', actor: subject.caster.id }, () => 0).state;
    expect(() => reduceEncounter(targetTurn, {
      type: 'attack', actor: subject.target.id, target: subject.enemy.id,
      attackBonus: 4, criticalFloor: 20, rollMode: 'normal',
      attackerCanSeeTarget: true, targetCanSeeAttacker: true,
      damage: {
        terms: [{ type: damageType('Bludgeoning'), dice: { count: 1, sides: dieSides(6), modifier: 1 } }],
        critical: false, responses: [],
      },
    }, () => 0.5)).toThrow('must use an attack from form');

    const monster = subject.content.monsters.find(({ recordId }) => recordId === 'brassleaf-mote');
    if (monster === undefined) throw new Error('Loaded form monster is missing.');
    targetTurn = reduceEncounter(
      targetTurn,
      importedMonsterAttackCommand(monster, 'attack:brassleaf-tap', subject.target.id, subject.enemy.id),
      () => 0.5,
    ).state;
    expect(targetState(targetTurn, subject.enemy).hitPoints).toBeLessThan(30);
  });

  it('merged_equipment_is_unavailable: worn and carried shape with the form and cannot be interacted with', () => {
    // Polymorph gear melds and provides no benefit: docs/srd/source/spell-descriptions.txt:5971-5973.
    const subject = started();
    const transformed = cast(subject);
    expect(transformed.equipment?.find(({ combatant }) => combatant === subject.target.id)?.hands)
      .toEqual({ kind: 'one_handed', items: [FORM_ITEM] });
    expect(() => reduceEncounter(transformed, {
      type: 'drop_item', actor: subject.target.id, item: FORM_ITEM, interaction: 'free',
    }, () => 0)).toThrow(EquipmentRuleError);
    try {
      reduceEncounter(transformed, {
        type: 'drop_item', actor: subject.target.id, item: FORM_ITEM, interaction: 'free',
      }, () => 0);
      expect.fail('Merged form equipment unexpectedly remained interactable.');
    } catch (error) {
      expect(error).toMatchObject({ code: 'form_equipment_unavailable' });
    }
  });

  it('declared_stat_override_and_drop: a pack can declare the replacement block and drop equipment at the origin', () => {
    const subject = started(statOverrideOperation());
    const transformed = cast(subject);
    expect(targetState(transformed, subject.target)).toMatchObject({
      hitPoints: 20,
      form: { formId: 'mist-hound', hitPoints: 7, equipmentDisposition: 'dropped_at_origin' },
      profile: { rules: { armorClass: 13, speed: 45 } },
    });
    expect(transformed.equipment?.find(({ combatant }) => combatant === subject.target.id)?.hands)
      .toEqual({ kind: 'empty' });
    expect(transformed.groundItems).toContainEqual({ item: FORM_ITEM, position: { column: 1, row: 0 } });
    expect(transformed.eventLog).toContainEqual(expect.objectContaining({
      type: 'item_dropped', item: FORM_ITEM, cause: 'form_replacement',
    }));
  });

  it('unknown_form_id_transforms: rejects only the missing-id form record and loads the rest of the pack', () => {
    const source = sourcePack();
    const healthy = source.spells[0];
    if (healthy === undefined) throw new Error('Healthy spell fixture is missing.');
    const missing = {
      ...packMonsterOperation(),
      form: { kind: 'pack_monster', monsterId: 'absent-form' },
    };
    source.spells = [healthy, formSpell(source, missing, 'missing-form')];
    const loaded = loadContentPack(source);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Missing form record unexpectedly refused the pack envelope.');
    expect(loaded.content.spells.map(({ recordId }) => recordId)).toEqual(['prism-pebble']);
    expect(loaded.content.monsters.map(({ recordId }) => recordId)).toEqual(['brassleaf-mote']);
    expect(loaded.content.diagnostics).toContainEqual(expect.objectContaining({
      reason: 'missing_form_reference', recordId: 'missing-form',
      monsterId: 'greenforge:absent-form',
    }));
  });

  it('true_polymorph_and_object_transformation_refusals: unsupported permanence and object-to-creature shapes have named reasons', () => {
    const source = sourcePack();
    const healthy = source.spells[0];
    if (healthy === undefined) throw new Error('Healthy spell fixture is missing.');
    source.spells = [
      healthy,
      formSpell(source, { kind: 'true_polymorph_permanence' }, 'permanent-form'),
      formSpell(source, { kind: 'object_to_creature_transformation' }, 'object-creature'),
    ];
    const loaded = loadContentPack(source);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Named form refusals unexpectedly refused the pack envelope.');
    expect(loaded.content.spells.map(({ recordId }) => recordId)).toEqual(['prism-pebble']);
    expect(loaded.content.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ reason: TRUE_POLYMORPH_PERMANENCE_REFUSAL, recordId: 'permanent-form' }),
      expect.objectContaining({ reason: OBJECT_TO_CREATURE_REFUSAL, recordId: 'object-creature' }),
    ]));
  });
});
