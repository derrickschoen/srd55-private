import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { combatToken } from '../../../src/combat/combatant';
import { createEncounter, reduceEncounter } from '../../../src/combat/encounter';
import { encounterEffectId } from '../../../src/combat/values';
import {
  externalPartyPackSchema,
  loadExternalPartyPack,
  loadExternalPartyPackBytes,
  loadedPartyAttackCommand,
  loadedPartySpellCastCommand,
  loadedPartyTurnLegalActions,
  type ExternalPartyPackV1,
  type ExternalPartyPackV2,
} from '../../../src/vtt/party-pack';
import { monsterProfile, placedToken } from '../combat/fixtures';

function jsonObject(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`Expected ${path} to be a JSON object.`);
  }
  return value as Record<string, unknown>;
}

function jsonArray(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`Expected ${path} to be a JSON array.`);
  return value;
}

function jsonStringArray(value: unknown, path: string): readonly string[] {
  return jsonArray(value, path).map((entry, index) => {
    if (typeof entry !== 'string') {
      throw new TypeError(`Expected ${path}[${String(index)}] to be a string.`);
    }
    return entry;
  });
}

function zodFeatureEffectKinds(source: string): readonly string[] {
  const declaration = /const featureEffectSchema = z\.discriminatedUnion\('kind', \[([\s\S]*?)\]\)\.superRefine/u.exec(source);
  const unionBody = declaration?.[1];
  if (unionBody === undefined) throw new TypeError('Could not find the feature-effect Zod union.');
  return [...unionBody.matchAll(/\bkind:\s*z\.literal\('([^']+)'\)/gu)].map((match) => {
    const kind = match[1];
    if (kind === undefined) throw new TypeError('Feature-effect kind capture was empty.');
    return kind;
  });
}

function memberBase(index: number): Omit<ExternalPartyPackV2['members'][number], 'spellcasting'> {
  return {
    combatantId: `combatant:pack-member-${String(index)}`,
    tokenId: `token:pack-member-${String(index)}`,
    characterId: 10_000 + index,
    classes: [{ classId: index % 2 === 0 ? 'Fighter' : 'Wizard', level: 7 }],
    abilities: {
      strength: 10 + index,
      dexterity: 12,
      constitution: 14,
      intelligence: 16,
      wisdom: 10,
      charisma: 8,
    },
    armorClass: 15 + index,
    hitPointMaximum: 30 + index,
    walkingSpeedFeet: 30,
    initiativeBonus: 2,
    savingThrowBonuses: {
      strength: 1,
      dexterity: 2,
      constitution: 3,
      intelligence: 4,
      wisdom: 0,
      charisma: -1,
    },
    attacksPerAction: index % 2 === 0 ? 2 : 1,
    attacks: [{
      attackId: `attack:pack-member-${String(index)}`,
      kind: 'melee',
      attackBonus: 6,
      criticalFloor: 20,
      reachFeet: 5,
      rangeFeet: 5,
      damage: [{ damageTypeId: 'Slashing', count: 1, sides: 8, modifier: 3 }],
    }],
    startingConditions: [],
  };
}

function v2Member(index: number): ExternalPartyPackV2['members'][number] {
  return {
    ...memberBase(index),
    ...(index % 2 === 0
      ? {}
      : {
          spellcasting: {
            ability: 'intelligence' as const,
            spellSaveDc: 15,
            spellAttackBonus: 7,
            preparedSpellIds: ['magic-missile'],
            knownSpellIds: ['sacred-flame', 'fire-bolt'],
            spellSlots: [{ level: 1 as const, count: 4, recharge: 'long_rest' as const }],
          },
        }),
  };
}

function pack(count = 3, allowPartial = false): ExternalPartyPackV2 {
  return externalPartyPackSchema.parse({
    schemaVersion: 2,
    partyId: 'party:generic-soak-fixture',
    allowPartial,
    members: Array.from({ length: count }, (_value, index) => v2Member(index + 1)),
  }) as ExternalPartyPackV2;
}

function objectSpellcasting(member: ExternalPartyPackV2['members'][number]) {
  const spellcasting = member.spellcasting;
  if (spellcasting === undefined || Array.isArray(spellcasting)) {
    throw new TypeError('Expected the legacy object-form spellcasting fixture.');
  }
  return spellcasting;
}

function spellcastingSources(member: ExternalPartyPackV2['members'][number]) {
  const spellcasting = member.spellcasting;
  if (spellcasting === undefined) return [];
  return Array.isArray(spellcasting) ? spellcasting : [spellcasting];
}

function v1Pack(): ExternalPartyPackV1 {
  return externalPartyPackSchema.parse({
    schemaVersion: 1,
    partyId: 'party:legacy-soak-fixture',
    allowPartial: false,
    members: Array.from({ length: 3 }, (_value, index) => ({
      ...memberBase(index + 1),
      spellSlots: index % 2 === 0 ? [{ level: 1, maximum: 4 }] : [],
      spellSelections: index % 2 === 0 ? ['magic-missile'] : [],
    })),
  }) as ExternalPartyPackV1;
}

function effectPack(): ExternalPartyPackV2 {
  const candidate = structuredClone(pack());
  candidate.members[0]!.resources = [{
    resourcePoolId: 'resource:precise-strikes',
    maximum: 1,
    recharge: 'short_rest',
  }];
  candidate.members[0]!.effects = [{
    effectId: 'effect:precise-strike-damage',
    kind: 'damage_rider',
    trigger: 'on_hit',
    resourcePoolId: 'resource:precise-strikes',
    damage: [{ damageTypeId: 'Force', count: 1, sides: 6, modifier: 0 }],
  }];
  objectSpellcasting(candidate.members[0]!).resourceSpellUses = [{
    spellId: 'magic-missile',
    resourcePoolId: 'resource:precise-strikes',
  }];
  return candidate;
}

function familyPack(): ExternalPartyPackV2 {
  const candidate = structuredClone(pack());
  candidate.members[0]!.attacksPerAction = 1;
  objectSpellcasting(candidate.members[0]!).spellSlots = [
    { level: 1, count: 4, recharge: 'long_rest' },
    { level: 2, count: 1, recharge: 'long_rest' },
  ];
  candidate.members[0]!.resources = [
    { resourcePoolId: 'resource:flurry-shape', maximum: 1, recharge: 'short_rest' },
    { resourcePoolId: 'resource:surge-shape', maximum: 1, recharge: 'short_rest' },
  ];
  candidate.members[0]!.effects = [
    {
      effectId: 'effect:sneak-shape',
      kind: 'once_per_turn_damage_rider',
      trigger: 'on_hit',
      oncePerTurnGate: 'first_hit_this_turn',
      qualifyingGates: ['advantage_on_attack', 'ally_adjacent_to_target'],
      damage: [{ damageTypeId: 'Force', count: 1, sides: 6, modifier: 0 }],
    },
    {
      effectId: 'effect:smite-shape',
      kind: 'slot_spend_damage_rider',
      trigger: 'on_hit',
      spendGate: 'slot_spent',
      criticalGate: 'crit_confirmed',
      damageTypeId: 'Radiant',
      baseCount: 1,
      countPerSlotLevel: 1,
      sides: 8,
      modifier: 0,
    },
    {
      effectId: 'effect:first-hit-flat',
      kind: 'first_hit_damage_rider',
      trigger: 'on_hit',
      gate: 'first_hit_this_turn',
      damageTypeId: 'Psychic',
      amount: 3,
    },
    {
      effectId: 'effect:flurry-shape',
      kind: 'bonus_action_attack_grant',
      resourcePoolId: 'resource:flurry-shape',
      attackCount: 1,
    },
    {
      effectId: 'effect:extra-attack-shape',
      kind: 'extra_attack_count_override',
      levels: [{ minimumLevel: 5, attackCount: 2 }, { minimumLevel: 11, attackCount: 3 }],
    },
    {
      effectId: 'effect:surge-shape',
      kind: 'action_surge',
      resourcePoolId: 'resource:surge-shape',
    },
  ];
  return candidate;
}

describe('external party-pack boundary', () => {
  it('loads generated valid 3-5 member packs into branded combat profiles', () => {
    for (let count = 3; count <= 5; count += 1) {
      for (let sample = 0; sample < 20; sample += 1) {
        const candidate = structuredClone(pack(count));
        candidate.members.forEach((entry, index) => {
          entry.armorClass = 10 + ((sample + index) % 21);
          entry.hitPointMaximum = 1 + sample * 10 + index;
          entry.abilities.strength = 1 + ((sample + index) % 30);
        });
        const result = loadExternalPartyPack(candidate);

        expect(result.status).toBe('loaded');
        if (result.status !== 'loaded') throw new Error('Valid generated pack was refused.');
        expect(result.gaps).toEqual([]);
        expect(result.party.members).toHaveLength(count);
        expect(result.party.members.map((entry) => entry.profile.rules.armorClass)).toEqual(
          candidate.members.map((entry) => entry.armorClass),
        );
        expect(result.party.members.flatMap((entry) => entry.spells.map((spell) => spell.id)))
          .toEqual(candidate.members.flatMap((entry) => [
            ...spellcastingSources(entry).flatMap((source) => source.preparedSpellIds),
            ...spellcastingSources(entry).flatMap((source) => source.knownSpellIds),
          ]));
      }
    }
  });

  it('loads the complete initial closed effect-shape inventory into reducer-ready payloads', () => {
    const candidate = structuredClone(pack());
    candidate.members[0]!.effects = [
      { effectId: 'effect:inventory-damage', kind: 'damage_rider', trigger: 'on_hit', damage: [{ damageTypeId: 'Force', count: 1, sides: 6, modifier: 0 }] },
      { effectId: 'effect:inventory-attack-die', kind: 'attack_roll_modifier', trigger: 'always_on', count: 1, sides: 4, sign: 1 },
      { effectId: 'effect:inventory-attack-mode', kind: 'attack_roll_mode', trigger: 'action', mode: 'advantage' },
      { effectId: 'effect:inventory-ac', kind: 'armor_class_modifier', trigger: 'always_on', amount: 1 },
      { effectId: 'effect:inventory-save', kind: 'saving_throw_modifier', trigger: 'always_on', count: 1, sides: 4, sign: 1 },
      { effectId: 'effect:inventory-skill', kind: 'skill_modifier', trigger: 'always_on', skillId: 'perception', count: 1, sides: 4, sign: 1 },
      { effectId: 'effect:inventory-temp-hp', kind: 'temporary_hit_points', trigger: 'bonus_action', amount: 7 },
      { effectId: 'effect:inventory-condition', kind: 'condition_application', trigger: 'action', conditionId: 'Prone' },
      { effectId: 'effect:inventory-exhaustion', kind: 'exhaustion_application', trigger: 'action', level: 1 },
      { effectId: 'effect:inventory-speed', kind: 'movement_modifier', trigger: 'always_on', speedDeltaFeet: 10 },
      { effectId: 'effect:inventory-ability-substitution', kind: 'attack_ability_substitution', attackId: 'attack:pack-member-1', damageTermIndex: 0, replacesAbility: 'strength', spellcastingAbility: 'intelligence' },
      { effectId: 'effect:inventory-die-override', kind: 'attack_damage_die_override', attackId: 'attack:pack-member-1', damageTermIndex: 0, levels: [{ minimumLevel: 1, count: 1, sides: 8 }] },
      { effectId: 'effect:inventory-reach-override', kind: 'attack_reach_range_override', attackId: 'attack:pack-member-1', reachFeet: 10 },
    ];
    const loaded = loadExternalPartyPack(candidate);

    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Closed effect inventory was refused.');
    expect(loaded.party.members[0]!.effects.map((effect) => effect.payload.kind)).toEqual([
      'damage_rider',
      'attack_roll_modifier',
      'attack_roll_mode_modifier',
      'armor_class_modifier',
      'saving_throw_modifier',
      'ability_check_modifier',
      'temporary_hit_points',
      'condition',
      'exhaustion',
      'movement_modifier',
      'attack_ability_substitution',
      'attack_damage_die_override',
      'attack_reach_range_override',
    ]);
  });

  it.each([
    { strength: 9, spellcasting: 10, expectedAttackBonus: 7, expectedDamageModifier: 4 },
    { strength: 10, spellcasting: 11, expectedAttackBonus: 6, expectedDamageModifier: 3 },
    { strength: 11, spellcasting: 12, expectedAttackBonus: 7, expectedDamageModifier: 4 },
  ])('substitution_ignored uses spellcasting ability instead of Strength at $strength/$spellcasting modifier boundaries', ({
    strength,
    spellcasting,
    expectedAttackBonus,
    expectedDamageModifier,
  }) => {
    const candidate = structuredClone(pack());
    const member = candidate.members[0]!;
    member.abilities.strength = strength;
    member.abilities.wisdom = spellcasting;
    objectSpellcasting(member).ability = 'wisdom';
    member.effects = [{
      effectId: 'effect:shillelagh-shape',
      kind: 'attack_ability_substitution',
      attackId: member.attacks[0]!.attackId,
      damageTermIndex: 0,
      replacesAbility: 'strength',
      spellcastingAbility: 'wisdom',
    }];
    const loaded = loadExternalPartyPack(candidate);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Shillelagh-shape pack was refused.');
    const actor = loaded.party.members[0]!;
    const command = loadedPartyAttackCommand(actor, actor.attacks[0]!.attackId, monsterProfile('ability-target').id);
    expect(command.attackBonus).toBe(expectedAttackBonus);
    expect(command.damage.terms[0]?.dice.modifier).toBe(expectedDamageModifier);
  });

  it('unarmed die override changes the named attack damage die at the member level', () => {
    const candidate = structuredClone(pack());
    const member = candidate.members[0]!;
    member.attacks[0]!.damage[0]!.sides = 4;
    member.effects = [{
      effectId: 'effect:martial-arts-shape',
      kind: 'attack_damage_die_override',
      attackId: member.attacks[0]!.attackId,
      damageTermIndex: 0,
      levels: [
        { minimumLevel: 1, count: 1, sides: 6 },
        { minimumLevel: 5, count: 1, sides: 8 },
        { minimumLevel: 11, count: 1, sides: 10 },
        { minimumLevel: 17, count: 1, sides: 12 },
      ],
    }];
    const loaded = loadExternalPartyPack(candidate);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Martial-arts-shape pack was refused.');
    const actor = loaded.party.members[0]!;
    const command = loadedPartyAttackCommand(actor, actor.attacks[0]!.attackId, monsterProfile('die-target').id);
    expect(command.damage.terms[0]?.dice).toEqual({ count: 1, sides: 8, modifier: 3 });
  });

  it('dangling_attack_id_accepted refuses an attack-form substitution whose attackId is undeclared', () => {
    const candidate = structuredClone(pack());
    candidate.members[0]!.effects = [{
      effectId: 'effect:dangling-attack-shape',
      kind: 'attack_reach_range_override',
      attackId: 'attack:not-declared',
      reachFeet: 10,
    }];
    expect(loadExternalPartyPack(candidate)).toMatchObject({
      status: 'refused',
      refusal: { reason: 'gaps_not_allowed' },
      gaps: [{ featurePath: 'members.0.effects.0.attackId' }],
    });
  });

  it('applies a named reach override when enumerating existing attack commands', () => {
    const candidate = structuredClone(pack());
    const member = candidate.members[0]!;
    member.effects = [{
      effectId: 'effect:reach-shape',
      kind: 'attack_reach_range_override',
      attackId: member.attacks[0]!.attackId,
      reachFeet: 10,
    }];
    const loaded = loadExternalPartyPack(candidate);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Reach-shape pack was refused.');
    const actor = loaded.party.members[0]!;
    const target = monsterProfile('reach-target', { initiativeBonus: -10 });
    let state = createEncounter({
      bounds: { columns: 4, rows: 2 },
      combatants: [actor.profile, target],
      tokens: [combatToken(actor.profile, { column: 0, row: 0 }), combatToken(target, { column: 2, row: 0 })],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    expect(loadedPartyTurnLegalActions(loaded.party.members)(state, actor.profile.id).actions).toContainEqual(
      expect.objectContaining({ type: 'attack', target: target.id }),
    );
  });

  it('loads all six conditional-rider and action-economy variants into the existing engine effect machinery', () => {
    const loaded = loadExternalPartyPack(familyPack());
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Effect-family v2 pack was refused.');
    if (loaded.party.pack.schemaVersion !== 2) throw new Error('Effect-family pack changed schema version.');
    expect(loaded.party.pack.members[0]!.effects?.map((effect) => effect.kind)).toEqual([
      'once_per_turn_damage_rider',
      'slot_spend_damage_rider',
      'first_hit_damage_rider',
      'bonus_action_attack_grant',
      'extra_attack_count_override',
      'action_surge',
    ]);
    expect(loaded.party.members[0]!.effects.map((effect) => effect.payload.kind)).toEqual([
      'damage_rider',
      'damage_rider',
      'damage_rider',
      'bonus_action_attack_grant',
      'extra_attack_count_override',
      'action_surge',
    ]);
  });

  it('smite_dice_not_doubled_on_crit spends a level-2 slot only on a confirmed hit and doubles exactly 3d8 on a crit', () => {
    const candidate = familyPack();
    candidate.members[0]!.effects = candidate.members[0]!.effects?.filter(
      (effect) => effect.kind === 'slot_spend_damage_rider',
    );
    const loaded = loadExternalPartyPack(candidate);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Smite-shape pack was refused.');
    const actor = loaded.party.members[0]!;
    const target = monsterProfile('smite-boundary-target', { hitPoints: 200, initiativeBonus: -10 });
    let state = createEncounter({
      bounds: { columns: 3, rows: 2 },
      combatants: [actor.profile, target],
      tokens: [combatToken(actor.profile, { column: 0, row: 0 }), placedToken(target, 1)],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.999).state;
    const command = loadedPartyAttackCommand(
      actor,
      actor.attacks[0]!.attackId,
      target.id,
      { riderSelections: [{ effectId: encounterEffectId('effect:smite-shape'), slotLevel: 2 }] },
    );
    const missed = reduceEncounter(state, command, () => 0);
    expect(missed.events.some((event) => event.type === 'spell_slot_spent')).toBe(false);
    expect(missed.state.combatants[0]?.spellSlots).toContainEqual({ level: 2, maximum: 1, remaining: 1 });
    const result = reduceEncounter(state, command, () => 0.999);

    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'spell_slot_spent',
      slotLevel: 2,
      remaining: 0,
    }));
    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'attack_resolved',
      attack: { outcome: 'critical', roll: { mode: 'normal', faces: [20], chosen: 20 }, total: 26 },
      damage: expect.objectContaining({
        total: 67,
        terms: expect.arrayContaining([
          expect.objectContaining({
            type: 'Radiant',
            roll: { expression: { count: 6, sides: 8, modifier: 0 }, faces: [8, 8, 8, 8, 8, 8], total: 48 },
          }),
        ]),
      }),
    }));
  });

  it('rider_fires_twice_per_turn fires an eligible once-per-turn rider only on the first of two hits', () => {
    const candidate = familyPack();
    candidate.members[0]!.effects = candidate.members[0]!.effects?.filter(
      (effect) => effect.kind === 'once_per_turn_damage_rider' || effect.kind === 'extra_attack_count_override',
    );
    const loaded = loadExternalPartyPack(candidate);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Once-per-turn rider pack was refused.');
    const actor = loaded.party.members[0]!;
    const target = monsterProfile('once-per-turn-target', { hitPoints: 100, initiativeBonus: -10 });
    let state = createEncounter({
      bounds: { columns: 3, rows: 2 },
      combatants: [actor.profile, target],
      tokens: [combatToken(actor.profile, { column: 0, row: 0 }), placedToken(target, 1)],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    const advantaged = {
      ...loadedPartyAttackCommand(actor, actor.attacks[0]!.attackId, target.id),
      rollMode: 'advantage' as const,
    };
    const first = reduceEncounter(state, advantaged, () => 0.5);
    const second = reduceEncounter(first.state, advantaged, () => 0.5);

    expect(first.events.find((event) => event.type === 'attack_resolved')).toMatchObject({
      damage: { total: 12 },
    });
    expect(second.events.find((event) => event.type === 'attack_resolved')).toMatchObject({
      damage: { total: 8 },
    });
  });

  it('rider_condition_ignored requires advantage or an adjacent ally before sneak-shape dice apply', () => {
    const candidate = familyPack();
    candidate.members[0]!.effects = candidate.members[0]!.effects?.filter(
      (effect) => effect.kind === 'once_per_turn_damage_rider',
    );
    const loaded = loadExternalPartyPack(candidate);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Conditional rider pack was refused.');
    const actor = loaded.party.members[0]!;
    const target = monsterProfile('conditional-rider-target', { hitPoints: 100, initiativeBonus: -10 });
    let state = createEncounter({
      bounds: { columns: 3, rows: 2 },
      combatants: [actor.profile, target],
      tokens: [combatToken(actor.profile, { column: 0, row: 0 }), placedToken(target, 1)],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    const result = reduceEncounter(
      state,
      loadedPartyAttackCommand(actor, actor.attacks[0]!.attackId, target.id),
      () => 0.5,
    );
    expect(result.events.find((event) => event.type === 'attack_resolved')).toMatchObject({
      damage: { total: 8, terms: [{ type: 'Slashing' }] },
    });
  });

  it('first-hit flat riders apply once across the effective Extra Attack sequence', () => {
    const candidate = familyPack();
    candidate.members[0]!.effects = candidate.members[0]!.effects?.filter(
      (effect) => effect.kind === 'first_hit_damage_rider' || effect.kind === 'extra_attack_count_override',
    );
    const loaded = loadExternalPartyPack(candidate);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('First-hit rider pack was refused.');
    const actor = loaded.party.members[0]!;
    const target = monsterProfile('first-hit-target', { hitPoints: 100, initiativeBonus: -10 });
    let state = createEncounter({
      bounds: { columns: 3, rows: 2 },
      combatants: [actor.profile, target],
      tokens: [combatToken(actor.profile, { column: 0, row: 0 }), placedToken(target, 1)],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    const command = loadedPartyAttackCommand(actor, actor.attacks[0]!.attackId, target.id);
    const first = reduceEncounter(state, command, () => 0.5);
    const second = reduceEncounter(first.state, command, () => 0.5);
    expect(first.events.find((event) => event.type === 'attack_resolved')).toMatchObject({ damage: { total: 11 } });
    expect(second.events.find((event) => event.type === 'attack_resolved')).toMatchObject({ damage: { total: 8 } });
  });

  it('bonus_attack_always_legal offers a granted Bonus Action attack exactly while usable and consumes its pool', () => {
    const candidate = familyPack();
    candidate.members[0]!.effects = candidate.members[0]!.effects?.filter(
      (effect) => effect.kind === 'bonus_action_attack_grant',
    );
    candidate.members[0]!.resources = candidate.members[0]!.resources?.filter(
      (pool) => pool.resourcePoolId === 'resource:flurry-shape',
    );
    const loaded = loadExternalPartyPack(candidate);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Bonus-attack pack was refused.');
    const actor = loaded.party.members[0]!;
    const target = monsterProfile('bonus-attack-target', { hitPoints: 100, initiativeBonus: -10 });
    let state = createEncounter({
      bounds: { columns: 3, rows: 2 },
      combatants: [actor.profile, target],
      tokens: [combatToken(actor.profile, { column: 0, row: 0 }), placedToken(target, 1)],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    const legalActions = loadedPartyTurnLegalActions(loaded.party.members);
    const granted = legalActions(state, actor.profile.id).actions.filter(
      (action) => action.type === 'attack' && action.bonusActionGrantEffectId !== undefined,
    );
    expect(granted).toHaveLength(1);
    const spent = reduceEncounter(state, granted[0]!, () => 0.5).state;
    expect(spent.combatants[0]).toMatchObject({
      turn: { bonusActionAvailable: false, bonusAttacksRemaining: 0 },
      limitedResources: [{ id: 'resource:flurry-shape', remaining: 0 }],
    });
    expect(legalActions(spent, actor.profile.id).actions.filter(
      (action) => action.type === 'attack' && action.bonusActionGrantEffectId !== undefined,
    )).toEqual([]);
  });

  it('level attack overrides and short-rest action surge both alter reducer-owned action legality', () => {
    const candidate = familyPack();
    candidate.members[0]!.effects = candidate.members[0]!.effects?.filter(
      (effect) => effect.kind === 'extra_attack_count_override' || effect.kind === 'action_surge',
    );
    candidate.members[0]!.resources = candidate.members[0]!.resources?.filter(
      (pool) => pool.resourcePoolId === 'resource:surge-shape',
    );
    const loaded = loadExternalPartyPack(candidate);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Action-economy pack was refused.');
    const actor = loaded.party.members[0]!;
    const target = monsterProfile('action-economy-target', { hitPoints: 100, initiativeBonus: -10 });
    let state = createEncounter({
      bounds: { columns: 3, rows: 2 },
      combatants: [actor.profile, target],
      tokens: [combatToken(actor.profile, { column: 0, row: 0 }), placedToken(target, 1)],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    const command = loadedPartyAttackCommand(actor, actor.attacks[0]!.attackId, target.id);
    state = reduceEncounter(state, command, () => 0.5).state;
    expect(state.combatants[0]?.turn.action).toEqual({ kind: 'attack_sequence', attacksRemaining: 1 });
    state = reduceEncounter(state, command, () => 0.5).state;
    expect(state.combatants[0]?.turn.action).toEqual({ kind: 'spent' });
    const legalActions = loadedPartyTurnLegalActions(loaded.party.members);
    const surge = legalActions(state, actor.profile.id).actions.filter(
      (action) => action.type === 'activate_action_surge',
    );
    expect(surge).toEqual([{ type: 'activate_action_surge', actor: actor.profile.id, effectId: 'effect:surge-shape' }]);
    state = reduceEncounter(state, surge[0]!, () => 0.5).state;
    expect(state.combatants[0]).toMatchObject({
      turn: { action: { kind: 'available' } },
      limitedResources: [{ id: 'resource:surge-shape', remaining: 0 }],
    });
  });

  it('slots_not_decremented wires a referenced v2 spell through the existing resolver and spends its slot', () => {
    const result = loadExternalPartyPack(pack());
    expect(result.status).toBe('loaded');
    if (result.status !== 'loaded') throw new Error('Valid v2 caster pack was refused.');
    const caster = result.party.members[0]!;
    const target = result.party.members[1]!;
    expect(caster.spellcasting[0]).toMatchObject({
      ability: 'intelligence',
      spellSaveDc: 15,
      spellAttackBonus: 7,
      spellcastingModifier: 3,
      casterLevel: 7,
    });
    expect(caster.sharedSpellSlots).toEqual([
      { level: 1, maximum: 4, recharge: 'long_rest' },
    ]);
    let state = createEncounter({
      bounds: { columns: 4, rows: 3 },
      combatants: [caster.profile, target.profile],
      tokens: [
        combatToken(caster.profile, { column: 0, row: 1 }),
        combatToken(target.profile, { column: 1, row: 1 }),
      ],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    const cast = reduceEncounter(state, loadedPartySpellCastCommand(caster, 'magic-missile', {
      slotLevel: 1,
      castAsRitual: false,
      targets: [target.profile.id, target.profile.id, target.profile.id],
      area: null,
      weaponAttack: null,
      selectedOption: null,
    }), () => 0);

    expect(cast.events).toContainEqual(expect.objectContaining({
      type: 'spell_cast',
      caster: caster.profile.id,
      spellId: 'magic-missile',
      slotLevel: 1,
    }));
    expect(cast.state.combatants[0]?.spellSlots).toContainEqual({
      level: 1,
      maximum: 4,
      remaining: 3,
    });
    expect(() => loadedPartySpellCastCommand(caster, 'ray-of-frost', {
      slotLevel: null,
      castAsRitual: false,
      targets: [target.profile.id],
      area: null,
      weaponAttack: null,
      selectedOption: null,
    })).toThrow(expect.objectContaining({ reason: 'spell_not_referenced' }));
  });

  it('loads every r9 prepared-spell reference through the unchanged manifest vocabulary', () => {
    const candidate = structuredClone(pack());
    const source = objectSpellcasting(candidate.members[0]!);
    source.preparedSpellIds = [
      'divine-favor',
      'ensnaring-strike',
      'searing-smite',
      'heal',
      'moonbeam',
    ];
    source.knownSpellIds = [];
    source.spellSlots = [
      { level: 1, count: 4, recharge: 'long_rest' },
      { level: 2, count: 3, recharge: 'long_rest' },
      { level: 6, count: 1, recharge: 'long_rest' },
    ];

    const loaded = loadExternalPartyPack(candidate);

    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('R9 manifest spell references were refused.');
    expect(loaded.gaps).toEqual([]);
    expect(loaded.party.members[0]?.spellcasting[0]?.preparedSpells.map((spell) => spell.id)).toEqual([
      'divine-favor',
      'ensnaring-strike',
      'searing-smite',
      'heal',
      'moonbeam',
    ]);
    expect(loaded.party.members[0]?.spells.map((spell) => spell.id)).toEqual([
      'divine-favor',
      'ensnaring-strike',
      'searing-smite',
      'heal',
      'moonbeam',
    ]);
  });

  it('wrong_source_dc uses each prepared spell source and per_source_slots share one member pool', () => {
    const candidate = structuredClone(pack());
    const casterInput = candidate.members[0]!;
    casterInput.classes = [
      { classId: 'Wizard', level: 3 },
      { classId: 'Cleric', level: 4 },
    ];
    casterInput.spellcasting = [
      {
        ability: 'intelligence',
        spellSaveDc: 15,
        spellAttackBonus: 7,
        preparedSpellIds: ['inflict-wounds'],
        knownSpellIds: [],
      },
      {
        ability: 'wisdom',
        spellSaveDc: 13,
        spellAttackBonus: 5,
        preparedSpellIds: ['charm-person'],
        knownSpellIds: [],
      },
    ];
    casterInput.sharedSpellSlots = [{ level: 1, count: 2, recharge: 'long_rest' }];

    const loaded = loadExternalPartyPack(candidate);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Two-source caster pack was refused.');
    const caster = loaded.party.members[0]!;
    const target = loaded.party.members[1]!;
    expect(caster.spellcasting.map((source) => [source.ability, source.spellSaveDc])).toEqual([
      ['intelligence', 15],
      ['wisdom', 13],
    ]);
    let state = createEncounter({
      bounds: { columns: 4, rows: 3 },
      combatants: [caster.profile, target.profile],
      tokens: [
        combatToken(caster.profile, { column: 0, row: 1 }),
        combatToken(target.profile, { column: 1, row: 1 }),
      ],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;

    const first = reduceEncounter(state, loadedPartySpellCastCommand(caster, 'inflict-wounds', {
      slotLevel: 1,
      castAsRitual: false,
      targets: [target.profile.id],
      area: null,
      weaponAttack: null,
      selectedOption: null,
    }), () => 0.5);
    expect(first.events).toContainEqual(expect.objectContaining({
      type: 'save_resolved',
      save: expect.objectContaining({ outcome: 'failure', total: 14 }),
    }));
    expect(first.state.combatants[0]?.spellSlots[0]?.remaining).toBe(1);

    state = reduceEncounter(
      first.state,
      { type: 'end_turn', actor: caster.profile.id },
      () => 0.5,
    ).state;
    state = reduceEncounter(
      state,
      { type: 'end_turn', actor: target.profile.id },
      () => 0.5,
    ).state;
    const second = reduceEncounter(state, loadedPartySpellCastCommand(caster, 'charm-person', {
      slotLevel: 1,
      castAsRitual: false,
      targets: [target.profile.id],
      area: null,
      weaponAttack: null,
      selectedOption: null,
    }), () => 0.6);
    expect(second.events).toContainEqual(expect.objectContaining({
      type: 'save_resolved',
      save: expect.objectContaining({ outcome: 'success', total: 13 }),
    }));
    expect(second.state.combatants[0]?.spellSlots).toEqual([{
      level: 1,
      maximum: 2,
      remaining: 0,
    }]);
  });

  it('object_form_rejected accepts legacy object bytes and normalizes them to one source', () => {
    const candidate = pack();
    const result = loadExternalPartyPackBytes(JSON.stringify(candidate));

    expect(result.status).toBe('loaded');
    if (result.status !== 'loaded') throw new Error('Object-form v2 caster pack was refused.');
    const source = result.party.members[0]?.spellcasting[0];
    expect(result.party.members[0]?.spellcasting).toHaveLength(1);
    expect(source).toMatchObject({
      ability: 'intelligence',
      spellSaveDc: 15,
      spellAttackBonus: 7,
      preparedSpells: [{ id: 'magic-missile' }],
    });
    expect(result.party.pack.schemaVersion).toBe(2);
    if (result.party.pack.schemaVersion !== 2) throw new Error('V2 pack changed schema version.');
    const normalized = result.party.pack.members[0]?.spellcasting;
    expect(Array.isArray(normalized)).toBe(true);
    expect(result.party.pack.members[0]).toMatchObject({
      sharedSpellSlots: [{ level: 1, count: 4, recharge: 'long_rest' }],
    });
  });

  it('refuses more than four spellcasting sources with a typed reason', () => {
    const candidate = structuredClone(pack());
    const member = candidate.members[0]!;
    const source = objectSpellcasting(member);
    member.spellcasting = Array.from({ length: 5 }, () => ({
      ability: source.ability,
      spellSaveDc: source.spellSaveDc,
      spellAttackBonus: source.spellAttackBonus,
      preparedSpellIds: source.preparedSpellIds,
      knownSpellIds: source.knownSpellIds,
    }));
    member.sharedSpellSlots = [{ level: 1, count: 4, recharge: 'long_rest' }];

    expect(loadExternalPartyPack(candidate)).toMatchObject({
      status: 'refused',
      refusal: { reason: 'too_many_spellcasting_sources' },
      gaps: [{ featurePath: 'members.0.spellcasting' }],
    });
  });

  it('refuses pact-slot need with the typed unmodelled-boundary reason', () => {
    const candidate = structuredClone(pack());
    candidate.members[0]!.pactSpellSlots = [{
      level: 2,
      count: 2,
      recharge: 'short_rest',
    }];

    expect(loadExternalPartyPack(candidate)).toMatchObject({
      status: 'refused',
      refusal: { reason: 'pact_slots_unmodelled' },
      gaps: [{
        featurePath: 'members.0.pactSpellSlots',
        engineRefusalReason: 'capability_not_implemented',
      }],
    });
  });

  it('pack_spell_save_dc_boundary drives failure below DC and success at DC through encounter resolution', () => {
    const resolveAtD20 = (d20: 12 | 13) => {
      const loaded = loadExternalPartyPack(pack());
      expect(loaded.status).toBe('loaded');
      if (loaded.status !== 'loaded') throw new Error('Valid v2 caster pack was refused.');
      const caster = loaded.party.members[0]!;
      const target = loaded.party.members[1]!;
      let state = createEncounter({
        bounds: { columns: 4, rows: 3 },
        combatants: [caster.profile, target.profile],
        tokens: [
          combatToken(caster.profile, { column: 0, row: 1 }),
          combatToken(target.profile, { column: 1, row: 1 }),
        ],
      });
      state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
      const result = reduceEncounter(state, loadedPartySpellCastCommand(caster, 'sacred-flame', {
        slotLevel: null,
        castAsRitual: false,
        targets: [target.profile.id],
        area: null,
        weaponAttack: null,
        selectedOption: null,
      }), () => (d20 - 1) / 20);
      const save = result.events.find((event) => event.type === 'save_resolved');
      if (save?.type !== 'save_resolved') throw new Error('Sacred Flame emitted no saving throw.');
      return save.save;
    };

    expect(resolveAtD20(12)).toEqual({
      outcome: 'failure',
      roll: { mode: 'normal', faces: [12], chosen: 12 },
      total: 14,
    });
    expect(resolveAtD20(13)).toEqual({
      outcome: 'success',
      roll: { mode: 'normal', faces: [13], chosen: 13 },
      total: 15,
    });
  });

  it('pack_spell_attack_bonus_boundary drives miss below AC and hit at AC through encounter resolution', () => {
    const resolveAtD20 = (d20: 9 | 10) => {
      const loaded = loadExternalPartyPack(pack());
      expect(loaded.status).toBe('loaded');
      if (loaded.status !== 'loaded') throw new Error('Valid v2 caster pack was refused.');
      const caster = loaded.party.members[0]!;
      const target = loaded.party.members[1]!;
      let state = createEncounter({
        bounds: { columns: 4, rows: 3 },
        combatants: [caster.profile, target.profile],
        tokens: [
          combatToken(caster.profile, { column: 0, row: 1 }),
          combatToken(target.profile, { column: 1, row: 1 }),
        ],
      });
      state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
      const result = reduceEncounter(state, loadedPartySpellCastCommand(caster, 'fire-bolt', {
        slotLevel: null,
        castAsRitual: false,
        targets: [target.profile.id],
        area: null,
        weaponAttack: null,
        selectedOption: null,
      }), () => (d20 - 1) / 20);
      const attack = result.events.find((event) => event.type === 'attack_resolved');
      if (attack?.type !== 'attack_resolved') throw new Error('Fire Bolt emitted no attack roll.');
      return attack.attack;
    };

    expect(resolveAtD20(10)).toEqual({
      outcome: 'hit',
      roll: { mode: 'normal', faces: [10], chosen: 10 },
      total: 17,
    });
    expect(resolveAtD20(9)).toEqual({
      outcome: 'miss',
      roll: { mode: 'normal', faces: [9], chosen: 9 },
      total: 16,
    });
  });

  it('rider_never_fires makes an on_hit typed rider change the synthetic encounter outcome', () => {
    const loaded = loadExternalPartyPack(effectPack());
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Effects-bearing v2 pack was refused.');
    const actor = loaded.party.members[0]!;
    const target = loaded.party.members[1]!;
    let state = createEncounter({
      bounds: { columns: 3, rows: 2 },
      combatants: [actor.profile, target.profile],
      tokens: [
        combatToken(actor.profile, { column: 0, row: 0 }),
        combatToken(target.profile, { column: 1, row: 0 }),
      ],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    expect(state.activeCombatant).toBe(actor.profile.id);

    const result = reduceEncounter(
      state,
      loadedPartyAttackCommand(actor, actor.attacks[0]!.attackId, target.profile.id),
      () => 0.5,
    );

    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'attack_resolved',
      damage: expect.objectContaining({ total: 12 }),
    }));
    expect(result.state.combatants[1]?.hitPoints).toBe(20);
  });

  it('pool_not_decremented spends a rider pool and refuses the same hit when the pool is empty', () => {
    const loaded = loadExternalPartyPack(effectPack());
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Effects-bearing v2 pack was refused.');
    const actor = loaded.party.members[0]!;
    const target = loaded.party.members[1]!;
    let state = createEncounter({
      bounds: { columns: 3, rows: 2 },
      combatants: [actor.profile, target.profile],
      tokens: [
        combatToken(actor.profile, { column: 0, row: 0 }),
        combatToken(target.profile, { column: 1, row: 0 }),
      ],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    const attack = loadedPartyAttackCommand(actor, actor.attacks[0]!.attackId, target.profile.id);
    const spent = reduceEncounter(state, attack, () => 0.5);

    expect(spent.state.combatants[0]?.limitedResources).toEqual([{
      id: 'resource:precise-strikes',
      maximum: 1,
      remaining: 0,
      recharge: 'short_rest',
    }]);
    expect(spent.events).toContainEqual(expect.objectContaining({
      type: 'limited_resource_spent',
      resourcePoolId: 'resource:precise-strikes',
      remaining: 0,
    }));

    const empty = {
      ...state,
      combatants: state.combatants.map((subject) =>
        subject.profile.id === actor.profile.id
          ? {
              ...subject,
              limitedResources: (subject.limitedResources ?? []).map((pool) => ({ ...pool, remaining: 0 })),
            }
          : subject),
    };
    expect(() => reduceEncounter(empty, attack, () => 0.5)).toThrow(
      'Resource pool resource:precise-strikes is empty.',
    );
  });

  it('named resource pools can fuel spellcasting without changing existing slot pools', () => {
    const loaded = loadExternalPartyPack(effectPack());
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Effects-bearing v2 pack was refused.');
    const caster = loaded.party.members[0]!;
    const target = loaded.party.members[1]!;
    let state = createEncounter({
      bounds: { columns: 3, rows: 2 },
      combatants: [caster.profile, target.profile],
      tokens: [
        combatToken(caster.profile, { column: 0, row: 0 }),
        combatToken(target.profile, { column: 1, row: 0 }),
      ],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    const result = reduceEncounter(state, loadedPartySpellCastCommand(caster, 'magic-missile', {
      slotLevel: 1,
      castAsRitual: false,
      targets: [target.profile.id, target.profile.id, target.profile.id],
      area: null,
      weaponAttack: null,
      selectedOption: null,
      resourcePoolId: 'resource:precise-strikes',
    }), () => 0);

    expect(result.state.combatants[0]?.spellSlots).toContainEqual({
      level: 1,
      maximum: 4,
      remaining: 4,
    });
    expect(result.state.combatants[0]?.limitedResources?.[0]?.remaining).toBe(0);
    expect(() => loadedPartySpellCastCommand(caster, 'sacred-flame', {
      slotLevel: null,
      castAsRitual: false,
      targets: [target.profile.id],
      area: null,
      weaponAttack: null,
      selectedOption: null,
      resourcePoolId: 'resource:precise-strikes',
    })).toThrow('Spell sacred-flame is not declared for loaded resource pool resource:precise-strikes.');
  });

  it('passive_off_by_one applies AC and save passives exactly at their success boundaries', () => {
    const candidate = structuredClone(pack());
    candidate.members[1]!.passives = {
      armorClassBonus: 1,
      savingThrowBonuses: { dexterity: 1 },
    };

    const resolveAttackAt = (d20: 11 | 12) => {
      const loaded = loadExternalPartyPack(candidate);
      expect(loaded.status).toBe('loaded');
      if (loaded.status !== 'loaded') throw new Error('Passive-bearing v2 pack was refused.');
      const actor = loaded.party.members[0]!;
      const target = loaded.party.members[1]!;
      expect(target.profile.rules.armorClass).toBe(18);
      let state = createEncounter({
        bounds: { columns: 3, rows: 2 },
        combatants: [actor.profile, target.profile],
        tokens: [
          combatToken(actor.profile, { column: 0, row: 0 }),
          combatToken(target.profile, { column: 1, row: 0 }),
        ],
      });
      state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
      const result = reduceEncounter(
        state,
        loadedPartyAttackCommand(actor, actor.attacks[0]!.attackId, target.profile.id),
        () => (d20 - 1) / 20,
      );
      return result.events.find((event) => event.type === 'attack_resolved');
    };

    expect(resolveAttackAt(11)).toMatchObject({ attack: { outcome: 'miss', total: 17 } });
    expect(resolveAttackAt(12)).toMatchObject({ attack: { outcome: 'hit', total: 18 } });

    const resolveSaveAt = (d20: 11 | 12) => {
      const loaded = loadExternalPartyPack(candidate);
      expect(loaded.status).toBe('loaded');
      if (loaded.status !== 'loaded') throw new Error('Passive-bearing v2 pack was refused.');
      const caster = loaded.party.members[0]!;
      const target = loaded.party.members[1]!;
      expect(target.profile.rules.savingThrowBonuses.dexterity).toBe(3);
      let state = createEncounter({
        bounds: { columns: 3, rows: 2 },
        combatants: [caster.profile, target.profile],
        tokens: [
          combatToken(caster.profile, { column: 0, row: 0 }),
          combatToken(target.profile, { column: 1, row: 0 }),
        ],
      });
      state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
      const result = reduceEncounter(state, loadedPartySpellCastCommand(caster, 'sacred-flame', {
        slotLevel: null,
        castAsRitual: false,
        targets: [target.profile.id],
        area: null,
        weaponAttack: null,
        selectedOption: null,
      }), () => (d20 - 1) / 20);
      return result.events.find((event) => event.type === 'save_resolved');
    };

    expect(resolveSaveAt(11)).toMatchObject({ save: { outcome: 'failure', total: 14 } });
    expect(resolveSaveAt(12)).toMatchObject({ save: { outcome: 'success', total: 15 } });
  });

  it('out_of_union_accepted refuses an unknown effect kind and names the unsupported shape', () => {
    const candidate = structuredClone(pack(3, true)) as unknown as {
      members: Array<Record<string, unknown>>;
    };
    candidate.members[0]!.effects = [{
      effectId: 'effect:unsupported-teleport-strike',
      kind: 'teleport_strike',
      trigger: 'on_hit',
      distanceFeet: 30,
    }];

    expect(loadExternalPartyPack(candidate)).toMatchObject({
      status: 'refused',
      refusal: {
        kind: 'external_party_pack_refusal',
        reason: 'unsupported_effect_shape',
        unsupportedShape: 'teleport_strike',
      },
      gaps: [{ engineRefusalReason: 'capability_not_implemented' }],
    });
  });

  it('unknown_spell_id_dropped refuses an unknown v2 spell id even when partial loading is allowed', () => {
    const candidate = structuredClone(pack(3, true));
    objectSpellcasting(candidate.members[0]!).preparedSpellIds = ['not-in-the-181-spell-manifest'];

    expect(loadExternalPartyPack(candidate)).toMatchObject({
      status: 'refused',
      refusal: { kind: 'external_party_pack_refusal', reason: 'unknown_spell_id' },
      gaps: [{ engineRefusalReason: 'value_not_in_engine_vocabulary' }],
    });
  });

  it('v1_rejected keeps unchanged v1 packs inside the loader version window', () => {
    const legacy = v1Pack();
    const result = loadExternalPartyPack(legacy);

    expect(result.status).toBe('loaded');
    if (result.status !== 'loaded') throw new Error('Legacy v1 pack was refused.');
    expect(result.party.pack).toEqual(legacy);
    expect(result.party.members[0]?.spellcasting).toEqual([]);
    expect(result.party.members[0]?.profile.rules.spellSlots).toEqual([{ level: 1, maximum: 4 }]);
    expect(result.party.members[0]?.spells.map((spell) => spell.id)).toEqual(['magic-missile']);
  });

  it('gap_report_swallowed reports and strips every out-of-vocabulary feature', () => {
    const candidate = structuredClone(pack(3, true)) as unknown as {
      members: Array<Record<string, unknown>>;
    };
    candidate.members[1]!.feature = { kind: 'unmapped-capability', prose: 'must not survive' };
    const result = loadExternalPartyPack(candidate);

    expect(result.status).toBe('loaded');
    if (result.status !== 'loaded') throw new Error('allowPartial pack should retain its mapped party.');
    expect(result.gaps).toContainEqual({
      packEntry: 'combatant:pack-member-2',
      featurePath: 'members.1.feature',
      requestedCapability: 'field:members.1.feature',
      engineRefusalReason: 'field_not_in_engine_vocabulary',
    });
    expect(JSON.stringify(result.party)).not.toContain('unmapped-capability');
    expect(JSON.stringify(result.party)).not.toContain('must not survive');
  });

  it('enforces allowPartial by refusing the whole pack when any gap exists', () => {
    const candidate = structuredClone(pack()) as unknown as {
      members: Array<Record<string, unknown>>;
    };
    candidate.members[0]!.feature = { kind: 'unsupported' };
    const result = loadExternalPartyPack(candidate);

    expect(result).toMatchObject({
      status: 'refused',
      refusal: { kind: 'external_party_pack_refusal', reason: 'gaps_not_allowed' },
      gaps: [{
        packEntry: 'combatant:pack-member-1',
        featurePath: 'members.0.feature',
        engineRefusalReason: 'field_not_in_engine_vocabulary',
      }],
    });
    expect('party' in result).toBe(false);
  });

  it('pack_smuggles_raw_text refuses narration fields and never carries their value forward', () => {
    const candidate = structuredClone(pack(3, true)) as unknown as Record<string, unknown>;
    candidate.narration = 'Imported prose sentinel must never enter a log.';
    const result = loadExternalPartyPack(candidate);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe('loaded');
    expect(result.gaps).toContainEqual(expect.objectContaining({
      featurePath: 'narration',
      engineRefusalReason: 'field_not_in_engine_vocabulary',
    }));
    expect(serialized).not.toContain('Imported prose sentinel');
  });

  it('own_duplicate_engine_id refuses identity collisions even when partial loading is allowed', () => {
    const candidate = structuredClone(pack(3, true));
    candidate.members[1]!.combatantId = candidate.members[0]!.combatantId;
    const result = loadExternalPartyPack(candidate);

    expect(result).toMatchObject({
      status: 'refused',
      refusal: { reason: 'invalid_structure' },
      gaps: [{ featurePath: 'members', engineRefusalReason: 'value_not_in_engine_vocabulary' }],
    });
  });

  it('schema_missing_variant refuses malformed JSON and pins the complete Zod union in the public schema', () => {
    expect(loadExternalPartyPackBytes('{')).toEqual({
      status: 'refused',
      refusal: { kind: 'external_party_pack_refusal', reason: 'invalid_json' },
      gaps: [{
        packEntry: 'party-pack:root',
        featurePath: 'json',
        requestedCapability: 'field:json',
        engineRefusalReason: 'invalid_party_pack_structure',
      }],
    });
    const schema = jsonObject(JSON.parse(
      readFileSync('docs/specs/external-party-pack.schema.json', 'utf8'),
    ), 'schema');
    expect(schema).toMatchObject({
      oneOf: [
        { properties: { schemaVersion: { const: 1 } } },
        { properties: { schemaVersion: { const: 2 } } },
      ],
      $defs: {
        memberV2: {
          properties: {
            spellcasting: {
              oneOf: [
                { $ref: '#/$defs/legacySpellcasting' },
                { type: 'array', minItems: 1, maxItems: 4 },
              ],
            },
            sharedSpellSlots: { type: 'array', maxItems: 9 },
            pactSpellSlots: { type: 'array', maxItems: 9 },
          },
        },
      },
    });

    const zodKinds = zodFeatureEffectKinds(readFileSync('src/vtt/party-pack.ts', 'utf8'));
    const definitions = jsonObject(schema.$defs, 'schema.$defs');
    const featureEffect = jsonObject(definitions.featureEffect, 'schema.$defs.featureEffect');
    const featureEffectProperties = jsonObject(
      featureEffect.properties,
      'schema.$defs.featureEffect.properties',
    );
    const kindProperty = jsonObject(
      featureEffectProperties.kind,
      'schema.$defs.featureEffect.properties.kind',
    );
    const schemaKinds = jsonStringArray(
      kindProperty.enum,
      'schema.$defs.featureEffect.properties.kind.enum',
    );
    const referencedKinds = jsonArray(
      featureEffect.oneOf,
      'schema.$defs.featureEffect.oneOf',
    ).map((branch, index) => {
      const reference = jsonObject(
        branch,
        `schema.$defs.featureEffect.oneOf[${String(index)}]`,
      ).$ref;
      if (typeof reference !== 'string' || !reference.startsWith('#/$defs/')) {
        throw new TypeError('Every feature-effect branch must reference a schema definition.');
      }
      const definitionName = reference.slice('#/$defs/'.length);
      const definition = jsonObject(
        definitions[definitionName],
        `schema.$defs.${definitionName}`,
      );
      const properties = jsonObject(
        definition.properties,
        `schema.$defs.${definitionName}.properties`,
      );
      const kind = jsonObject(
        properties.kind,
        `schema.$defs.${definitionName}.properties.kind`,
      ).const;
      if (typeof kind !== 'string') {
        throw new TypeError(`Expected schema.$defs.${definitionName}.properties.kind.const.`);
      }
      return kind;
    });
    const sortedZodKinds = [...zodKinds].sort();

    expect(new Set(zodKinds).size).toBe(zodKinds.length);
    expect(new Set(schemaKinds).size).toBe(schemaKinds.length);
    expect(new Set(referencedKinds).size).toBe(referencedKinds.length);
    expect([...schemaKinds].sort()).toEqual(sortedZodKinds);
    expect([...referencedKinds].sort()).toEqual(sortedZodKinds);
  });
});
