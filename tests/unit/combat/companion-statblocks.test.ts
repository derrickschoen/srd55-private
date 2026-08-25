import { readFileSync } from 'node:fs';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { MonsterAttackAction, MonsterStatblock } from '../../../src/combat/statblock';
import {
  BUNDLED_MONSTER_REGISTRY,
  PARAMETERIZED_MONSTER_TEMPLATES,
  instantiateMonsterTemplate,
  lookupBundledMonster,
  type CasterContext,
  type CompanionInstantiationRequest,
} from '../../../src/combat/statblocks/companions';
import { STARTER_MONSTER_ROSTER } from '../../../src/combat/statblocks/roster';
import {
  SRD_MONSTER_SPELL_MAPPINGS,
  extendMonsterSpellMappings,
  extendMonsterSpellMappingsFromPacks,
  instantiateBundledSummon,
  lookupMonsterForSpell,
  resolveSummonRegistryEntry,
  summonMonsterId,
  summonSpellId,
} from '../../../src/combat/statblocks/summon-mapping';

function attacks(statblock: MonsterStatblock): readonly MonsterAttackAction[] {
  const actions = statblock.sourceDetails.actions;
  if (actions.kind === 'absent') throw new Error(`${statblock.name} actions are absent.`);
  return actions.value.filter((action) => action.kind === 'attack');
}

function attack(statblock: MonsterStatblock, id: string): MonsterAttackAction {
  const found = attacks(statblock).find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`${statblock.name} is missing attack ${id}.`);
  return found;
}

const caster = (overrides: Partial<CasterContext> = {}): CasterContext => ({
  spellSaveDc: 15,
  spellAttackBonus: 7,
  spellcastingAbilityModifier: 4,
  slotLevel: 5,
  ...overrides,
});

describe('D364 SRD companion monster registry', () => {
  it('exposes 48 SRD rows, including the D371.3 Unicorn legendary exemplar, with 50 homebrew rows and three parameterized entries through one registry', () => {
    expect(STARTER_MONSTER_ROSTER).toHaveLength(47);
    expect(BUNDLED_MONSTER_REGISTRY).toHaveLength(101);
    expect(BUNDLED_MONSTER_REGISTRY.filter((entry) => entry.kind === 'static')).toHaveLength(98);
    expect(BUNDLED_MONSTER_REGISTRY.filter((entry) => entry.kind === 'parameterized')).toHaveLength(3);
    expect(BUNDLED_MONSTER_REGISTRY.find((entry) => entry.id === 'statblock:unicorn')).toMatchObject({
      kind: 'static',
      id: 'statblock:unicorn',
      statblock: { provenance: { kind: 'srd_5_2_1_decoded' } },
    });
    expect(BUNDLED_MONSTER_REGISTRY.find((entry) => entry.id === 'statblock:vane-warren/ashmaw-brute-priest')).toMatchObject({
      kind: 'static',
      id: 'statblock:vane-warren/ashmaw-brute-priest',
      statblock: { provenance: { kind: 'original_homebrew' } },
    });
    expect(BUNDLED_MONSTER_REGISTRY.find((entry) => entry.id === 'statblock:vane-warren/marshal-kett')).toMatchObject({
      kind: 'static',
      id: 'statblock:vane-warren/marshal-kett',
      statblock: { provenance: { kind: 'original_homebrew' } },
    });
    expect(STARTER_MONSTER_ROSTER.every((row) => row.statblock.id === row.id)).toBe(true);
  });

  it('distinguishes two same-CR beasts through ordinary registry lookup', () => {
    const hawk = lookupBundledMonster('statblock:blood-hawk');
    const camel = lookupBundledMonster('statblock:camel');
    expect(hawk.status).toBe('resolved');
    expect(camel.status).toBe('resolved');
    if (hawk.status !== 'resolved' || camel.status !== 'resolved' || hawk.entry.kind !== 'static' || camel.entry.kind !== 'static') {
      throw new Error('Static beast lookups did not resolve.');
    }
    expect({ name: hawk.entry.statblock.name, armorClass: hawk.entry.statblock.armorClass, hitPoints: hawk.entry.statblock.hitPointMaximum })
      .toEqual({ name: 'Blood Hawk', armorClass: 12, hitPoints: 7 });
    expect({ name: camel.entry.statblock.name, armorClass: camel.entry.statblock.armorClass, hitPoints: camel.entry.statblock.hitPointMaximum })
      .toEqual({ name: 'Camel', armorClass: 10, hitPoints: 17 });
  });

  it('requires caster context in every parameterized instantiation request', () => {
    expectTypeOf<CompanionInstantiationRequest>().toMatchTypeOf<CasterContext>();
    expectTypeOf<Parameters<typeof instantiateMonsterTemplate>[0]>().toEqualTypeOf<CompanionInstantiationRequest>();
  });

  it('scaling_frozen: scales every companion from its base slot through one slot above', () => {
    const steed2 = instantiateMonsterTemplate({ monsterId: 'statblock:otherworldly-steed', creatureType: 'Celestial', ...caster({ slotLevel: 2 }) });
    const steed3 = instantiateMonsterTemplate({ monsterId: 'statblock:otherworldly-steed', creatureType: 'Celestial', ...caster({ slotLevel: 3 }) });
    expect([steed2.armorClass, steed2.hitPointMaximum, attack(steed2, 'otherworldly-slam').damage[0]?.dice.modifier])
      .toEqual([12, 25, 2]);
    expect([steed3.armorClass, steed3.hitPointMaximum, attack(steed3, 'otherworldly-slam').damage[0]?.dice.modifier])
      .toEqual([13, 35, 3]);

    const insect4 = instantiateMonsterTemplate({ monsterId: 'statblock:giant-insect', form: 'Wasp', ...caster({ slotLevel: 4 }) });
    const insect5 = instantiateMonsterTemplate({ monsterId: 'statblock:giant-insect', form: 'Wasp', ...caster({ slotLevel: 5 }) });
    expect([insect4.armorClass, insect4.hitPointMaximum, attack(insect4, 'poison-jab').damage[0]?.dice.modifier])
      .toEqual([15, 30, 7]);
    expect([insect5.armorClass, insect5.hitPointMaximum, attack(insect5, 'poison-jab').damage[0]?.dice.modifier])
      .toEqual([16, 40, 8]);

    const object5 = instantiateMonsterTemplate({ monsterId: 'statblock:animated-object', size: 'Large', ...caster({ slotLevel: 5 }) });
    const object6 = instantiateMonsterTemplate({ monsterId: 'statblock:animated-object', size: 'Large', ...caster({ slotLevel: 6 }) });
    expect(attack(object5, 'slam').damage[0]?.dice).toEqual({ count: 2, sides: 6, modifier: 7 });
    expect(attack(object6, 'slam').damage[0]?.dice).toEqual({ count: 3, sides: 6, modifier: 7 });
  });

  it('caster_stats_ignored: two caster profiles produce distinct attack bonuses, save DCs, and ability-scaled damage', () => {
    const lower = instantiateMonsterTemplate({ monsterId: 'statblock:animated-object', size: 'Huge', ...caster({ spellAttackBonus: 5, spellcastingAbilityModifier: 2 }) });
    const higher = instantiateMonsterTemplate({ monsterId: 'statblock:animated-object', size: 'Huge', ...caster({ spellAttackBonus: 9, spellcastingAbilityModifier: 5 }) });
    expect([attack(lower, 'slam').attackBonus, attack(lower, 'slam').damage[0]?.dice.modifier]).toEqual([5, 5]);
    expect([attack(higher, 'slam').attackBonus, attack(higher, 'slam').damage[0]?.dice.modifier]).toEqual([9, 8]);

    const fiend = instantiateMonsterTemplate({ monsterId: 'statblock:otherworldly-steed', creatureType: 'Fiend', ...caster({ spellSaveDc: 18 }) });
    const bonusActions = fiend.sourceDetails.bonusActions;
    expect(bonusActions.kind === 'present' && bonusActions.value[0]?.kind === 'saving_throw' ? bonusActions.value[0].savingThrow.dc : null).toBe(18);
  });

  it('maps only the three 2024 companion spells and resolves them through the ordinary registry', () => {
    expect(SRD_MONSTER_SPELL_MAPPINGS.map((mapping) => [mapping.monsterId, mapping.spellId])).toEqual([
      ['statblock:otherworldly-steed', '2024:find-steed'],
      ['statblock:giant-insect', '2024:giant-insect'],
      ['statblock:animated-object', '2024:animate-objects'],
    ]);
    const resolved = resolveSummonRegistryEntry('2024:find-steed');
    expect(resolved.status === 'resolved' ? [resolved.mapping.monsterId, resolved.entry.kind] : resolved)
      .toEqual(['statblock:otherworldly-steed', 'parameterized']);
    expect(instantiateBundledSummon({ spellId: '2024:find-steed', creatureType: 'Fey', ...caster({ slotLevel: 2 }) }).name)
      .toBe('Otherworldly Steed');
  });

  it('mapping_defaults: an unmapped spell returns a typed refusal without selecting any monster', () => {
    expect(lookupMonsterForSpell('private:unmapped-summon')).toEqual({
      status: 'refused', refusal: { reason: 'unmapped_spell_id', spellId: 'private:unmapped-summon' },
    });
  });

  it('rejects private mapping extensions naming a monster or spell that is not loaded', () => {
    const mapping = { monsterId: summonMonsterId('greenforge:companion'), spellId: summonSpellId('greenforge:call-companion') };
    expect(extendMonsterSpellMappings([], [mapping], { monsterIds: [], spellIds: ['greenforge:call-companion'] })).toEqual({
      status: 'refused', refusal: { reason: 'missing_monster_id', monsterId: 'greenforge:companion' },
    });
    expect(extendMonsterSpellMappings([], [mapping], { monsterIds: ['greenforge:companion'], spellIds: [] })).toEqual({
      status: 'refused', refusal: { reason: 'missing_spell_id', spellId: 'greenforge:call-companion' },
    });
    expect(extendMonsterSpellMappings([], [mapping], { monsterIds: ['greenforge:companion'], spellIds: ['greenforge:call-companion'] }))
      .toEqual({ status: 'loaded', mappings: [mapping] });
    expect(extendMonsterSpellMappingsFromPacks([], [mapping], [{
      monsters: [{ id: 'greenforge:companion' }], spells: [{ id: 'greenforge:call-companion' }],
    }])).toEqual({ status: 'loaded', mappings: [mapping] });
  });

  it('pins every scaling formula to SRD text that states the decoded dependency', () => {
    const lines = readFileSync('docs/srd/full/srd-5.2.1.txt', 'utf8').split('\n');
    const cited = (lineStart: number, lineEnd: number): string => lines.slice(lineStart - 1, lineEnd).join(' ');
    expect(PARAMETERIZED_MONSTER_TEMPLATES.flatMap((template) => template.scaling)).toHaveLength(18);
    for (const template of PARAMETERIZED_MONSTER_TEMPLATES) {
      for (const formula of template.scaling) {
        expect(cited(formula.source.lineStart, formula.source.lineEnd).trim(), `${template.name} ${formula.field}`).not.toBe('');
      }
    }
    expect(cited(8156, 8159)).toContain('per spell level');
    expect(cited(8173, 8182)).toContain('spell attack modifier');
    expect(cited(8173, 8182)).toContain('spell save DC');
    expect(cited(8534, 8536)).toContain('spell’s level');
    expect(cited(8551, 8567)).toContain('spell attack modifier');
    expect(cited(8551, 8567)).toContain('spell save DC');
    expect(cited(6643, 6646)).toContain('for each spell slot level');
    expect(cited(6666, 6670)).toContain('spellcasting');
  });
});
