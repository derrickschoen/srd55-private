import { describe, expect, it } from 'vitest';
import {
  parseSrdSpellDescriptions,
  parseSrdSpellList,
} from '../../../src/rules/spells-srd';
import {
  createEncounter,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import { damageType, feet } from '../../../src/combat/values';
import { feetPoint } from '../../../src/combat/templates';
import {
  IMPLEMENTED_SPELL_DEFINITIONS,
  spellDefinition,
} from '../../../src/combat/spells/definitions';
import {
  assertSpellManifestBurnDown,
  SPELL_MANIFEST,
  type SpellManifestRow,
} from '../../../src/combat/spells/manifest';
import { referencePartySpellSlots } from '../../../src/combat/spells/resources';
import type {
  SpellCastCommand,
  SpellDefinition,
  SpellLevel,
} from '../../../src/combat/spells/types';
import { monsterProfile, placedToken, playerProfile } from './fixtures';

const EXPECTED_LEVEL_TOTALS: Readonly<Record<SpellLevel, number>> = {
  0: 20,
  1: 43,
  2: 45,
  3: 37,
  4: 30,
};
const EXPECTED_MANIFEST_TOTAL = 175;
const EXPECTED_IMPLEMENTED = 33;
const EXPECTED_PENDING = 142;

interface ValuePin {
  readonly id: string;
  readonly level: SpellLevel;
  readonly operation: SpellDefinition['operation']['kind'];
  readonly rangeFeet: number;
  readonly baseDice: readonly [number, number] | null;
  readonly perSlotCount: number;
  readonly source: string;
}

/** Independent SRD value oracle; do not derive this table from definitions. */
const VALUE_PINS: readonly ValuePin[] = [
  { id: 'acid-splash', level: 0, operation: 'save_damage', rangeFeet: 60, baseDice: [1, 6], perSlotCount: 0, source: 'spell-descriptions.txt:37-51' },
  { id: 'chill-touch', level: 0, operation: 'attack_damage', rangeFeet: 5, baseDice: [1, 10], perSlotCount: 0, source: 'spell-descriptions.txt:1066' },
  { id: 'dancing-lights', level: 0, operation: 'utility', rangeFeet: 120, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:1906' },
  { id: 'elementalism', level: 0, operation: 'utility', rangeFeet: 30, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:2630' },
  { id: 'fire-bolt', level: 0, operation: 'attack_damage', rangeFeet: 120, baseDice: [1, 10], perSlotCount: 0, source: 'spell-descriptions.txt:3184-3200' },
  { id: 'guidance', level: 0, operation: 'effect', rangeFeet: 5, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:4000' },
  { id: 'light', level: 0, operation: 'utility', rangeFeet: 5, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:4816' },
  { id: 'mage-hand', level: 0, operation: 'utility', rangeFeet: 30, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:4931' },
  { id: 'mending', level: 0, operation: 'utility', rangeFeet: 5, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:5322' },
  { id: 'message', level: 0, operation: 'utility', rangeFeet: 120, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:5341' },
  { id: 'minor-illusion', level: 0, operation: 'utility', rangeFeet: 30, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:5420' },
  { id: 'poison-spray', level: 0, operation: 'attack_damage', rangeFeet: 30, baseDice: [1, 12], perSlotCount: 0, source: 'spell-descriptions.txt:5925' },
  { id: 'prestidigitation', level: 0, operation: 'utility', rangeFeet: 10, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:6034' },
  { id: 'ray-of-frost', level: 0, operation: 'attack_damage', rangeFeet: 60, baseDice: [1, 8], perSlotCount: 0, source: 'spell-descriptions.txt:6427' },
  { id: 'resistance', level: 0, operation: 'effect', rangeFeet: 5, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:6540' },
  { id: 'sacred-flame', level: 0, operation: 'save_damage', rangeFeet: 60, baseDice: [1, 8], perSlotCount: 0, source: 'spell-descriptions.txt:6645' },
  { id: 'shocking-grasp', level: 0, operation: 'attack_damage', rangeFeet: 5, baseDice: [1, 8], perSlotCount: 0, source: 'spell-descriptions.txt:7006' },
  { id: 'spare-the-dying', level: 0, operation: 'stabilize', rangeFeet: 30, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:7181 (level-5 range upgrade)' },
  { id: 'thaumaturgy', level: 0, operation: 'utility', rangeFeet: 30, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:7842' },
  { id: 'true-strike', level: 0, operation: 'weapon_attack', rangeFeet: 5, baseDice: [0, 6], perSlotCount: 0, source: 'spell-descriptions.txt:8079' },
  { id: 'bane', level: 1, operation: 'save_effect', rangeFeet: 30, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:670' },
  { id: 'bless', level: 1, operation: 'effect', rangeFeet: 30, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:824' },
  { id: 'burning-hands', level: 1, operation: 'save_damage', rangeFeet: 0, baseDice: [3, 6], perSlotCount: 1, source: 'spell-descriptions.txt:924' },
  { id: 'charm-person', level: 1, operation: 'save_effect', rangeFeet: 30, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:1046' },
  { id: 'cure-wounds', level: 1, operation: 'healing', rangeFeet: 5, baseDice: [2, 8], perSlotCount: 2, source: 'spell-descriptions.txt:1895' },
  { id: 'false-life', level: 1, operation: 'temporary_hit_points', rangeFeet: 0, baseDice: [2, 4], perSlotCount: 0, source: 'spell-descriptions.txt:2930' },
  { id: 'guiding-bolt', level: 1, operation: 'attack_damage', rangeFeet: 120, baseDice: [4, 6], perSlotCount: 1, source: 'spell-descriptions.txt:4011' },
  { id: 'healing-word', level: 1, operation: 'healing', rangeFeet: 60, baseDice: [2, 4], perSlotCount: 2, source: 'spell-descriptions.txt:4169' },
  { id: 'inflict-wounds', level: 1, operation: 'save_damage', rangeFeet: 5, baseDice: [2, 10], perSlotCount: 1, source: 'spell-descriptions.txt:4593' },
  { id: 'magic-missile', level: 1, operation: 'magic_missiles', rangeFeet: 120, baseDice: [1, 4], perSlotCount: 0, source: 'spell-descriptions.txt:5033' },
  { id: 'shield', level: 1, operation: 'effect', rangeFeet: 0, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:6937' },
  { id: 'shield-of-faith', level: 1, operation: 'effect', rangeFeet: 60, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:6956' },
  { id: 'thunderwave', level: 1, operation: 'save_damage', rangeFeet: 0, baseDice: [2, 8], perSlotCount: 1, source: 'spell-descriptions.txt:7868' },
];

function definitionRange(definition: SpellDefinition): number {
  return definition.targeting.kind === 'self' ? 0 : definition.targeting.rangeFeet;
}

function operationDice(definition: SpellDefinition): readonly [number, number] | null {
  const operation = definition.operation;
  switch (operation.kind) {
    case 'attack_damage':
    case 'save_damage':
    case 'healing':
    case 'temporary_hit_points':
    case 'magic_missiles':
      return [operation.dice.baseCount, operation.dice.sides];
    case 'weapon_attack':
      return [operation.extraDamage.baseCount, operation.extraDamage.sides];
    case 'effect':
    case 'save_effect':
    case 'stabilize':
    case 'utility':
      return null;
  }
}

function operationPerSlot(definition: SpellDefinition): number {
  const operation = definition.operation;
  switch (operation.kind) {
    case 'attack_damage':
    case 'save_damage':
    case 'healing':
    case 'temporary_hit_points':
      return operation.dice.perSlotCount;
    case 'magic_missiles':
      return operation.dice.perSlotCount;
    case 'weapon_attack':
      return operation.extraDamage.perSlotCount;
    case 'effect':
    case 'save_effect':
    case 'stabilize':
    case 'utility':
      return 0;
  }
}

function areaFor(id: string): SpellCastCommand['area'] {
  if (id === 'acid-splash') {
    return { shape: 'sphere', template: { origin: feetPoint(10, 10), radius: feet(5) } };
  }
  if (id === 'burning-hands') {
    return { shape: 'cone', template: { origin: feetPoint(5, 5), direction: { x: 1, y: 0 }, length: feet(15), includeOrigin: false } };
  }
  if (id === 'thunderwave') {
    return { shape: 'cube', template: { origin: feetPoint(2.5, 5), center: feetPoint(10, 5), axis: { x: 1, y: 0 }, size: feet(15), includeOrigin: false } };
  }
  return null;
}

function castCommand(
  definition: SpellDefinition,
  caster: ReturnType<typeof playerProfile>,
  target: ReturnType<typeof monsterProfile>,
  slotLevel: number | null = definition.level === 0 ? null : 1,
): SpellCastCommand {
  const operation = definition.operation;
  let targets = definition.targeting.kind === 'single' ? [target.id] : [];
  if (definition.targeting.kind === 'multiple') {
    const count = operation.kind === 'magic_missiles'
      ? operation.baseDarts + operation.additionalPerSlot * ((slotLevel as number) - definition.level)
      : 1;
    targets = Array.from({ length: count }, () => target.id);
  }
  return {
    type: 'cast_spell',
    actor: caster.id,
    spellId: definition.id,
    slotLevel,
    casterLevel: 7,
    attackBonus: 100,
    saveDc: 100,
    spellcastingModifier: 3,
    targets,
    area: areaFor(definition.id),
    weaponAttack: definition.id === 'true-strike'
      ? { attackBonus: 100, damageType: damageType('Slashing'), damageCount: 1, damageSides: 8, damageModifier: 3 }
      : null,
    selectedOption: definition.id === 'resistance' ? 'Fire' : definition.id === 'guidance' ? 'Arcana' : null,
  };
}

function fixture(definition: SpellDefinition): {
  readonly caster: ReturnType<typeof playerProfile>;
  readonly target: ReturnType<typeof monsterProfile>;
  readonly state: EncounterState;
} {
  const caster = playerProfile(`caster-${definition.id}`, {
    hitPoints: 200,
    initiativeBonus: 20,
    spellSlots: referencePartySpellSlots('Wizard'),
  });
  const target = monsterProfile(`target-${definition.id}`, {
    hitPoints: 200,
    initiativeBonus: 0,
    usesDeathSaves: true,
  });
  let state = createEncounter({
    bounds: { columns: 12, rows: 6 },
    combatants: [caster, target],
    tokens: [placedToken(caster, 0, 1), placedToken(target, 1, 1)],
  });
  if (definition.castingTime !== 'minute') {
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
  }
  if (definition.operation.kind === 'healing') {
    state = {
      ...state,
      combatants: state.combatants.map((subject) =>
        subject.profile.id === target.id ? { ...subject, hitPoints: 1 } : subject),
    };
  }
  if (definition.operation.kind === 'stabilize') {
    state = {
      ...state,
      combatants: state.combatants.map((subject) =>
        subject.profile.id === target.id
          ? { ...subject, hitPoints: 0, life: 'dying', deathSaves: { successes: 0, failures: 0 } }
          : subject),
    };
  }
  return { caster, target, state };
}

describe('reference-party spell manifest', () => {
  it('is the exact source-list union through level 4 with pinned per-level totals', () => {
    const levels = new Map(parseSrdSpellDescriptions().map((spell) => [spell.name, spell.level]));
    const expected = new Map<string, Set<string>>();
    for (const list of ['Cleric', 'Wizard'] as const) {
      for (const membership of parseSrdSpellList(list)) {
        const level = levels.get(membership.spell_name);
        if (level !== undefined && level <= 4) {
          const lists = expected.get(membership.spell_name) ?? new Set<string>();
          lists.add(list);
          expected.set(membership.spell_name, lists);
        }
      }
    }

    expect(SPELL_MANIFEST).toHaveLength(EXPECTED_MANIFEST_TOTAL);
    expect(new Set(SPELL_MANIFEST.map((row) => row.id)).size).toBe(EXPECTED_MANIFEST_TOTAL);
    expect(SPELL_MANIFEST.map((row) => row.name).sort()).toEqual([...expected.keys()].sort());
    for (const level of [0, 1, 2, 3, 4] as const) {
      expect(SPELL_MANIFEST.filter((row) => row.level === level), `level ${level}`).toHaveLength(EXPECTED_LEVEL_TOTALS[level]);
    }
    for (const row of SPELL_MANIFEST) {
      expect(row.memberships.map((membership) => membership.list).sort()).toEqual(
        [...(expected.get(row.name) ?? [])].sort(),
      );
      expect(row.memberships.every((membership) =>
        /^docs\/srd\/source\/(?:cleric|wizard)-spell-list\.txt:\d+$/u.test(membership.source))).toBe(true);
      if ('partial' in row) expect(row.partial.trim().length).toBeGreaterThan(20);
    }
  });

  it('pins the burn-down at exactly 33 implemented and 142 pending rows', () => {
    expect(SPELL_MANIFEST.filter((row) => row.status === 'implemented')).toHaveLength(EXPECTED_IMPLEMENTED);
    expect(SPELL_MANIFEST.filter((row) => row.status === 'pending')).toHaveLength(EXPECTED_PENDING);
    expect(IMPLEMENTED_SPELL_DEFINITIONS).toHaveLength(EXPECTED_IMPLEMENTED);
    expect(() => assertSpellManifestBurnDown(SPELL_MANIFEST, spellDefinition)).not.toThrow();
  });

  it('burn-down rejects marking a pending row implemented without a definition', () => {
    const pendingIndex = SPELL_MANIFEST.findIndex((row) => row.status === 'pending');
    const mutated: SpellManifestRow[] = SPELL_MANIFEST.map((row, index) =>
      index === pendingIndex ? { ...row, status: 'implemented' } : row);
    expect(() => assertSpellManifestBurnDown(mutated, spellDefinition)).toThrow(
      'has no definition',
    );
  });
});

describe('spell foundations and implemented value pins', () => {
  it('uses the two independently printed level-7 full-caster slot rows: 4/3/3/1', () => {
    // docs/srd/source/class-level-tables.txt:73,311.
    expect(referencePartySpellSlots('Cleric')).toEqual([
      { level: 1, maximum: 4 },
      { level: 2, maximum: 3 },
      { level: 3, maximum: 3 },
      { level: 4, maximum: 1 },
    ]);
    expect(referencePartySpellSlots('Wizard')).toEqual(referencePartySpellSlots('Cleric'));
    expect(referencePartySpellSlots('Fighter')).toEqual([]);
  });

  it.each(VALUE_PINS)('$id pins level, range, operation, dice, and scaling from $source', (pin) => {
    const definition = spellDefinition(pin.id);
    expect(definition).not.toBeNull();
    if (definition === null) throw new Error(`Missing definition ${pin.id}.`);
    expect({
      level: definition.level,
      operation: definition.operation.kind,
      rangeFeet: definitionRange(definition),
      baseDice: operationDice(definition),
      perSlotCount: operationPerSlot(definition),
    }).toEqual({
      level: pin.level,
      operation: pin.operation,
      rangeFeet: pin.rangeFeet,
      baseDice: pin.baseDice,
      perSlotCount: pin.perSlotCount,
    });
  });

  it('stores V/S/M flags, material text, and consumption as definition data', () => {
    expect(spellDefinition('shield')?.components).toEqual({ verbal: true, somatic: true, material: null });
    expect(spellDefinition('true-strike')?.components).toEqual({
      verbal: false,
      somatic: true,
      material: {
        text: 'a weapon with which you have proficiency and that is worth 1+ CP',
        consumed: false,
      },
    });
    expect(spellDefinition('bless')?.components.material).toEqual({
      text: 'a Holy Symbol worth 5+ GP',
      consumed: false,
    });
  });

  it('higher-slot Cure Wounds expends that slot and uses its 4d8 scaled effect', () => {
    const definition = spellDefinition('cure-wounds');
    if (definition === null) throw new Error('Cure Wounds definition missing.');
    const { caster, target, state } = fixture(definition);
    const result = reduceEncounter(state, castCommand(definition, caster, target, 2), () => 0);
    const patient = result.state.combatants.find((subject) => subject.profile.id === target.id);
    const levelTwo = result.state.combatants
      .find((subject) => subject.profile.id === caster.id)?.spellSlots
      .find((slot) => slot.level === 2);
    expect(patient?.hitPoints).toBe(8); // 1 + 4d8 rolled as four 1s + spellcasting modifier 3.
    expect(levelTwo).toEqual({ level: 2, maximum: 3, remaining: 2 });
  });

  it('cantrip scaling changes exactly at levels 5, 11, and 17', () => {
    // Fire Bolt, docs/srd/source/spell-descriptions.txt:3193-3200.
    for (const [casterLevel, expectedDamage] of [[4, 1], [5, 2], [10, 2], [11, 3], [16, 3], [17, 4]] as const) {
      const definition = spellDefinition('fire-bolt');
      if (definition === null) throw new Error('Fire Bolt definition missing.');
      const { caster, target, state } = fixture(definition);
      let draw = 0;
      const result = reduceEncounter(
        state,
        { ...castCommand(definition, caster, target), casterLevel },
        () => (draw++ === 0 ? 0.5 : 0),
      );
      const damage = result.events.find((event) => event.type === 'damage_applied');
      expect(damage?.amount, `caster level ${casterLevel}`).toBe(expectedDamage);
    }
  });

  it('rejects an out-of-range target before spending its action or slot', () => {
    const definition = spellDefinition('cure-wounds');
    if (definition === null) throw new Error('Cure Wounds definition missing.');
    const { caster, target, state } = fixture(definition);
    const outOfRange = {
      ...state,
      tokens: state.tokens.map((entry) =>
        entry.combatantId === target.id ? { ...entry, position: { column: 3, row: 1 } } : entry),
    };
    expect(() => reduceEncounter(outOfRange, castCommand(definition, caster, target), () => 0.5)).toThrow(
      'out of range',
    );
    expect(outOfRange.combatants.find((subject) => subject.profile.id === caster.id)?.spellSlots[0]).toEqual({
      level: 1,
      maximum: 4,
      remaining: 4,
    });
    expect(outOfRange.combatants.find((subject) => subject.profile.id === caster.id)?.turn.action).toEqual({ kind: 'available' });
  });
});

describe('every implemented spell executes through the encounter reducer', () => {
  it.each(VALUE_PINS)('$id executes its typed $operation mechanics', (pin) => {
    const definition = spellDefinition(pin.id);
    if (definition === null) throw new Error(`Missing definition ${pin.id}.`);
    const { caster, target, state } = fixture(definition);
    const beforeTarget = state.combatants.find((subject) => subject.profile.id === target.id);
    const result = reduceEncounter(state, castCommand(definition, caster, target), () => 0.5);
    const afterCaster = result.state.combatants.find((subject) => subject.profile.id === caster.id);
    const afterTarget = result.state.combatants.find((subject) => subject.profile.id === target.id);

    expect(result.events.some((event) => event.type === 'spell_cast' && event.spellId === definition.id)).toBe(true);
    if (definition.level === 1) {
      expect(afterCaster?.spellSlots.find((slot) => slot.level === 1)?.remaining).toBe(3);
    }
    switch (definition.castingTime) {
      case 'action':
        expect(afterCaster?.turn.action).toEqual({ kind: 'spent' });
        break;
      case 'bonus_action':
        expect(afterCaster?.turn.bonusActionAvailable).toBe(false);
        break;
      case 'reaction':
        expect(afterCaster?.turn.reactionAvailable).toBe(false);
        break;
      case 'minute':
        expect(result.state.activeCombatant).toBeNull();
        break;
    }
    switch (definition.operation.kind) {
      case 'attack_damage':
      case 'save_damage':
      case 'magic_missiles':
      case 'weapon_attack':
        expect(afterTarget?.hitPoints).toBeLessThan(beforeTarget?.hitPoints ?? 0);
        break;
      case 'healing':
        expect(afterTarget?.hitPoints).toBeGreaterThan(beforeTarget?.hitPoints ?? 0);
        break;
      case 'temporary_hit_points':
        expect(afterCaster?.temporaryHitPoints).toBeGreaterThan(0);
        break;
      case 'effect':
      case 'save_effect':
        expect(result.state.effects.length).toBeGreaterThan(0);
        break;
      case 'stabilize':
        expect(afterTarget?.life).toBe('stable');
        break;
      case 'utility':
        expect(result.events.some((event) => event.type === 'spell_utility_resolved')).toBe(true);
        break;
    }
  });
});
