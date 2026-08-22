import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { combatToken } from '../../../src/combat/combatant';
import type { PersistedCoordinatorState } from '../../../src/combat/coordinator';
import { combatantConditions, createEncounter, reduceEncounter } from '../../../src/combat/encounter';
import { mulberry32 } from '../../../src/combat/random';
import {
  codexSessionId,
  encounterBranchId,
  encounterEffectId,
  encounterSessionId,
} from '../../../src/combat/values';
import {
  externalPartyPackSchema,
  loadExternalPartyPack,
  loadExternalPartyPackBytes,
  loadedPartyAttackCommand,
  loadedPartyEffectCommand,
  loadedPartySpellCastCommand,
  loadedPartyTurnLegalActions,
  loadedPartyWorldOperationCommand,
  type ExternalPartyPackV1,
  type ExternalPartyPackV2,
} from '../../../src/vtt/party-pack';
import {
  EncounterSessionJournal,
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
  exportSavedSession,
  importSavedSession,
} from '../../../src/vtt/session-persistence';
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
    sizeCategory: 'Medium',
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
    members: Array.from({ length: 3 }, (_value, index) => {
      const { sizeCategory: _sizeCategory, ...base } = memberBase(index + 1);
      return {
        ...base,
        spellSlots: index % 2 === 0 ? [{ level: 1, maximum: 4 }] : [],
        spellSelections: index % 2 === 0 ? ['magic-missile'] : [],
      };
    }),
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

function typedShapePack(
  effects: NonNullable<ExternalPartyPackV2['members'][number]['effects']>,
  resources: NonNullable<ExternalPartyPackV2['members'][number]['resources']> = [],
): ExternalPartyPackV2 {
  const candidate = structuredClone(pack());
  candidate.members[0]!.effects = effects;
  candidate.members[0]!.resources = resources;
  return candidate;
}

function sequenceRng(values: readonly number[], fallback = 0): () => number {
  let index = 0;
  return () => values[index++] ?? fallback;
}

const REPLAY_COORDINATOR: PersistedCoordinatorState = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' },
  pause: null,
};

describe('external party-pack boundary', () => {
  it('loads executable party-pack v2 world operations and refuses malformed nested specs', () => {
    const candidate = structuredClone(pack());
    candidate.members[0]!.worldOperations = [{
      operationId: 'world:raise-wall', cost: 'action',
      operation: {
        kind: 'create_object',
        object: {
          objectId: 'object:greenforge-wall', name: 'Greenforge Wall', kind: 'barrier',
          position: { column: 1, row: 1 }, footprint: [{ column: 1, row: 1 }],
          durability: { kind: 'hit_points', hitPoints: 8, maximumHitPoints: 8 },
          armorClass: 12,
          damageResponses: [{ damageTypeId: 'Fire', response: 'vulnerable' }],
          blocking: { movement: true, lineOfSight: true, cover: 'total' },
        },
      },
    }, {
      operationId: 'world:dim-room', cost: 'none',
      operation: {
        kind: 'set_light_level', level: 'dim',
        region: { id: 'greenforge-room', cells: [{ column: 2, row: 1 }] },
      },
    }];
    const loaded = loadExternalPartyPack(candidate);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Party world operations were refused.');
    expect(loadedPartyWorldOperationCommand(
      loaded.party.members[0]!, 'world:raise-wall',
    )).toMatchObject({
      type: 'world_operation', cost: 'action',
      operation: { kind: 'create_object', object: { id: 'object:greenforge-wall', armorClass: 12 } },
    });

    const malformed = structuredClone(candidate) as unknown as {
      members: Array<{ worldOperations?: Array<{ operation: { object?: { durability?: { hitPoints: number; maximumHitPoints: number } } } }> }>;
    };
    const durability = malformed.members[0]?.worldOperations?.[0]?.operation.object?.durability;
    if (durability === undefined) throw new Error('Malformed party fixture has no durability.');
    durability.hitPoints = durability.maximumHitPoints + 1;
    expect(loadExternalPartyPack(malformed)).toMatchObject({
      status: 'refused', refusal: { reason: 'gaps_not_allowed' },
    });
  });

  it('declares executable damage operations and armed weapon-hit riders in party-pack v2', () => {
    const operationDice = {
      baseCount: 1, sides: 4 as const, modifier: 0,
      perSlotCount: 0, perSlotModifier: 0, cantripUpgrade: false,
      rerollBelow: { threshold: 2, maximumRerollsPerDie: 1 as const },
    };
    const operationPacket = {
      damageType: { kind: 'conversion' as const, from: 'Fire' as const, to: 'Cold' as const },
      dice: operationDice,
      scaling: { kind: 'target_missing_hit_points' as const, hitPointsPerAdditionalDie: 10, maximumAdditionalDice: 2 },
      thresholdRider: null,
    };
    const candidate = typedShapePack([
      {
        effectId: 'effect:homebrew-damage-operation', kind: 'damage_operation', trigger: 'action', saveDc: 14,
        delivery: { kind: 'save', ability: 'dexterity', rollMode: 'normal', onSuccess: 'half' },
        instancesPerTarget: 2, packets: [operationPacket], timing: { kind: 'immediate' },
      },
      {
        effectId: 'effect:homebrew-armed-rider', kind: 'armed_weapon_hit_rider', trigger: 'bonus_action', saveDc: 14,
        damage: { ...operationPacket, scaling: { kind: 'none' }, thresholdRider: null },
        durationRounds: 2, concentration: false, persistence: 'consume_on_hit',
        saveGatedRider: {
          ability: 'wisdom', rollMode: 'normal', condition: 'Frightened',
          durationRounds: 1, expiresAt: 'target_end',
        },
      },
    ]);
    const loaded = loadExternalPartyPack(candidate);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Additional damage shapes were refused.');
    const caster = loaded.party.members[0]!;
    const target = loaded.party.members[1]!;
    const damageCommand = loadedPartyEffectCommand(
      caster,
      'effect:homebrew-damage-operation',
      [target.profile.id],
    );
    expect(damageCommand).toMatchObject({ type: 'activate_damage_operation', targets: [target.profile.id] });
    expect(loadedPartyEffectCommand(caster, 'effect:homebrew-armed-rider', [])).toEqual({
      type: 'arm_weapon_hit_rider', actor: caster.profile.id,
      effectId: 'effect:homebrew-armed-rider',
    });

    let state = createEncounter({
      bounds: { columns: 3, rows: 2 },
      combatants: [caster.profile, target.profile],
      tokens: [
        combatToken(caster.profile, { column: 0, row: 0 }),
        combatToken(target.profile, { column: 1, row: 0 }),
      ],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    const resolved = reduceEncounter(state, damageCommand, sequenceRng([0, 0.75, 0.5]));
    expect(resolved.events.filter((event) => event.type === 'damage_applied').map((event) => event.amount)).toEqual([4, 3]);

    const replayRng = mulberry32(0x213);
    const replayInitial = state;
    const sourceStore = new MemoryBrowserSessionStore();
    const journal = EncounterSessionJournal.create({
      sessionId: encounterSessionId('session:party-damage-operation'),
      branchId: encounterBranchId('branch:party-damage-operation'),
      encounterState: replayInitial,
      coordinatorState: REPLAY_COORDINATOR,
      controllers: [],
      codexSessionId: codexSessionId('codex:party-damage-operation'),
      rng: replayRng,
      store: sourceStore,
      mirror: new MemoryMirrorSink(),
    });
    const replayReduction = reduceEncounter(replayInitial, damageCommand, journal.rng());
    journal.record({
      transition: { kind: 'reducer_applied', command: damageCommand, events: replayReduction.events },
      encounterState: replayReduction.state,
      coordinatorState: REPLAY_COORDINATOR,
      controllers: [],
    });
    const replayBytes = exportSavedSession(sourceStore, encounterSessionId('session:party-damage-operation'));
    const restoredStore = new MemoryBrowserSessionStore();
    importSavedSession(restoredStore, replayBytes);
    const restored = EncounterSessionJournal.resume(
      encounterSessionId('session:party-damage-operation'),
      restoredStore,
      new MemoryMirrorSink(),
    );
    expect(canonicalJson(restored.encounterState)).toBe(canonicalJson(replayReduction.state));
    expect(replayBytes).toContain('damage_operation');
    expect(replayBytes).toContain('"arming":{"concentration":false,"durationRounds":2}');

    const malformed = structuredClone(candidate) as {
      members: Array<{ effects?: Array<{ dice?: { rerollBelow?: { threshold: number } }; packets?: Array<{ dice: { rerollBelow?: { threshold: number } } }> }> }>;
    };
    malformed.members[0]!.effects![0]!.packets![0]!.dice.rerollBelow!.threshold = 5;
    expect(loadExternalPartyPack(malformed)).toMatchObject({
      status: 'refused', refusal: { reason: 'gaps_not_allowed' },
    });
  });

  it('loads the v2 persistent-area effect vocabulary and refuses malformed hook payloads', () => {
    const candidate = structuredClone(pack());
    candidate.members[0]!.effects = [{
      effectId: 'effect:homebrew-aura', kind: 'persistent_area', trigger: 'action', origin: 'self',
      shape: { kind: 'emanation', radiusFeet: 10 }, duration: { kind: 'concentration', rounds: 10 },
      targetFilter: 'allies', difficultTerrain: false, movableFeet: null,
      hooks: [{
        hook: 'on_enter', frequency: 'every_trigger',
        effect: { kind: 'automatic', payload: { kind: 'skill_modifier', skillId: 'stealth', amount: 2, lifetime: { kind: 'while_inside' } } },
      }],
    }];
    const loaded = loadExternalPartyPack(candidate);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Typed persistent-area feature was refused.');
    expect(loaded.party.members[0]?.effects[0]?.payload).toMatchObject({
      kind: 'persistent_area', area: { origin: 'self', shape: { kind: 'emanation', radius: 10 } },
    });
    expect(loadedPartyEffectCommand(loaded.party.members[0]!, 'effect:homebrew-aura', [])).toMatchObject({
      type: 'create_persistent_area', area: { origin: { kind: 'anchored' } },
    });

    const malformed = structuredClone(candidate) as {
      members: Array<{ effects?: Array<{ hooks: Array<{ effect: { payload: { lifetime?: unknown } } }> }> }>;
    };
    delete malformed.members[0]!.effects![0]!.hooks[0]!.effect.payload.lifetime;
    expect(loadExternalPartyPack(malformed)).toMatchObject({
      status: 'refused', refusal: { reason: 'gaps_not_allowed' },
    });
  });

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

  it('reckless_one_sided keeps both Advantage halves through the pinned end/start turn edges', () => {
    // Reckless Attack is split by the SRD PDF columns: the first-attack choice
    // and Strength-roll benefit are at docs/srd/full/srd-5.2.1.txt:1858-1863;
    // its incoming-attack Advantage continuation is at line 1801.
    const candidate = structuredClone(pack());
    const actorInput = candidate.members[0]!;
    actorInput.attacksPerAction = 2;
    actorInput.effects = [{
      effectId: 'effect:reckless-attack',
      kind: 'reckless_attack_mode',
      strengthBasedMeleeAttackIds: [actorInput.attacks[0]!.attackId],
    }];
    const loaded = loadExternalPartyPack(candidate);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Reckless Attack pack was refused.');
    const actor = loaded.party.members[0]!;
    const enemy = loaded.party.members[1]!;
    let state = createEncounter({
      bounds: { columns: 3, rows: 1 },
      combatants: [actor.profile, enemy.profile],
      tokens: [
        combatToken(actor.profile, { column: 0, row: 0 }),
        combatToken(enemy.profile, { column: 1, row: 0 }),
      ],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;

    const first = reduceEncounter(state, loadedPartyAttackCommand(
      actor,
      actor.attacks[0]!.attackId,
      enemy.profile.id,
      { recklessAttackEffectId: encounterEffectId('effect:reckless-attack') },
    ), () => 0.5);
    expect(first.events.find((event) => event.type === 'attack_resolved')).toMatchObject({
      attack: { roll: { mode: 'advantage', faces: [11, 11] } },
    });
    expect(first.state.effects.map((effect) =>
      effect.payload.kind === 'attack_roll_mode_modifier'
        ? effect.payload.appliesTo.kind
        : effect.payload.kind,
    )).toEqual(['attacks_by_target', 'attacks_against_target']);

    const second = reduceEncounter(first.state, loadedPartyAttackCommand(
      actor,
      actor.attacks[0]!.attackId,
      enemy.profile.id,
    ), () => 0.5);
    expect(second.events.find((event) => event.type === 'attack_resolved')).toMatchObject({
      attack: { roll: { mode: 'advantage', faces: [11, 11] } },
    });

    const enemyTurn = reduceEncounter(
      second.state,
      { type: 'end_turn', actor: actor.profile.id },
      () => 0.5,
    );
    expect(enemyTurn.state.effects).toHaveLength(1);
    expect(enemyTurn.state.effects[0]?.payload).toMatchObject({
      kind: 'attack_roll_mode_modifier',
      appliesTo: { kind: 'attacks_against_target' },
    });
    const incoming = reduceEncounter(enemyTurn.state, loadedPartyAttackCommand(
      enemy,
      enemy.attacks[0]!.attackId,
      actor.profile.id,
    ), () => 0.5);
    expect(incoming.events.find((event) => event.type === 'attack_resolved')).toMatchObject({
      attack: { roll: { mode: 'advantage', faces: [11, 11] } },
    });

    const actorNextTurn = reduceEncounter(
      incoming.state,
      { type: 'end_turn', actor: enemy.profile.id },
      () => 0.5,
    );
    expect(actorNextTurn.state.activeCombatant).toBe(actor.profile.id);
    expect(actorNextTurn.state.effects).toEqual([]);
    const ordinary = reduceEncounter(actorNextTurn.state, loadedPartyAttackCommand(
      actor,
      actor.attacks[0]!.attackId,
      enemy.profile.id,
    ), () => 0.5);
    expect(ordinary.events.find((event) => event.type === 'attack_resolved')).toMatchObject({
      attack: { roll: { mode: 'normal', faces: [11] } },
    });
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

  it('grant_uses_source_ability casts an outside-list prepared grant with its explicit ability and DC', () => {
    const candidate = structuredClone(pack());
    const casterInput = candidate.members[0]!;
    casterInput.classes = [{ classId: 'Wizard', level: 7 }];
    casterInput.abilities.intelligence = 16;
    casterInput.abilities.wisdom = 20;
    const source = objectSpellcasting(casterInput);
    source.knownSpellIds = ['fire-bolt'];
    source.grants = [{ spellId: 'sacred-flame', ability: 'wisdom' }];

    const loaded = loadExternalPartyPack(candidate);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Cross-list prepared grant was refused.');
    const caster = loaded.party.members[0]!;
    const target = loaded.party.members[1]!;
    expect(caster.spellcasting[0]?.grants).toMatchObject([{
      spell: { id: 'sacred-flame' },
      ability: 'wisdom',
      spellSaveDc: 17,
      spellAttackBonus: 9,
      spellcastingModifier: 5,
    }]);
    const command = loadedPartySpellCastCommand(caster, 'sacred-flame', {
      slotLevel: null,
      castAsRitual: false,
      targets: [target.profile.id],
      area: null,
      weaponAttack: null,
      selectedOption: null,
    });
    expect(command).toMatchObject({ saveDc: 17, attackBonus: 9, spellcastingModifier: 5 });

    let state = createEncounter({
      bounds: { columns: 3, rows: 1 },
      combatants: [caster.profile, target.profile],
      tokens: [
        combatToken(caster.profile, { column: 0, row: 0 }),
        combatToken(target.profile, { column: 1, row: 0 }),
      ],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    const cast = reduceEncounter(state, command, () => 0.625);
    expect(cast.events.find((event) => event.type === 'save_resolved')).toMatchObject({
      save: { total: 15, outcome: 'failure' },
    });
  });

  it('builds True Strike from a named party-pack weapon while the spell supplies attack and damage ability', () => {
    const candidate = structuredClone(pack());
    const casterInput = candidate.members[0]!;
    casterInput.abilities.strength = 8;
    casterInput.abilities.intelligence = 20;
    casterInput.attacks[0]!.attackBonus = 5;
    casterInput.attacks[0]!.damage[0]!.modifier = -1;
    const source = objectSpellcasting(casterInput);
    source.spellAttackBonus = 9;
    source.knownSpellIds = ['true-strike'];
    source.preparedSpellIds = [];
    const loaded = loadExternalPartyPack(candidate);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('True Strike party pack was refused.');
    const caster = loaded.party.members[0]!;
    const target = loaded.party.members[1]!;
    const command = loadedPartySpellCastCommand(caster, 'true-strike', {
      slotLevel: null,
      castAsRitual: false,
      targets: [target.profile.id],
      area: null,
      weaponAttack: {
        attackId: caster.attacks[0]!.attackId,
        damageTermIndex: 0,
      },
      selectedOption: 'Radiant',
    });
    expect(command).toMatchObject({
      attackBonus: 9,
      spellcastingModifier: 5,
      weaponAttack: { attackBonus: 5, damageModifier: -1 },
    });
    let state = createEncounter({
      bounds: { columns: 3, rows: 1 },
      combatants: [caster.profile, target.profile],
      tokens: [
        combatToken(caster.profile, { column: 0, row: 0 }),
        combatToken(target.profile, { column: 1, row: 0 }),
      ],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    let draw = 0;
    const cast = reduceEncounter(state, command, () => draw++ === 0 ? 0.5 : 0);
    expect(cast.events.find((event) => event.type === 'attack_resolved')).toMatchObject({
      attack: { total: 20, outcome: 'hit' },
      damage: { total: 7 },
    });
  });

  it('validates grant spell ids through the manifest refusal boundary', () => {
    const candidate = structuredClone(pack());
    objectSpellcasting(candidate.members[0]!).grants = [{
      spellId: 'not-in-the-181-spell-manifest',
      ability: 'wisdom',
    }];
    expect(loadExternalPartyPack(candidate)).toMatchObject({
      status: 'refused',
      refusal: { reason: 'unknown_spell_id' },
      gaps: [{ featurePath: 'members.0.spellcasting.grants.0.spellId' }],
    });
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

  it('banish_return_damage_dropped enforces the save DC boundary, board absence, and sourced return damage', () => {
    // SRD disappearance/nearest-return precedent: docs/srd/full/srd-5.2.1.txt:4590-4600;
    // this D318.1 clean-room shape deliberately uses the requested source-start/damage-on-return clock.
    const candidate = typedShapePack([{
      effectId: 'effect:rift-banishment',
      kind: 'save_gated_banishment_on_hit',
      trigger: 'on_hit',
      saveAbility: 'charisma',
      saveDc: 15,
      rollMode: 'normal',
      returnAt: 'source_next_turn_start',
      returnDamage: { damageTypeId: 'Psychic', count: 1, sides: 6, modifier: 0 },
      returnPlacement: 'previous_or_nearest_unoccupied',
    }]);

    const attackAt = (saveFace: 15 | 16) => {
      const loaded = loadExternalPartyPack(candidate);
      expect(loaded.status).toBe('loaded');
      if (loaded.status !== 'loaded') throw new Error('Banishment shape was refused.');
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
      const attacked = reduceEncounter(
        state,
        loadedPartyAttackCommand(actor, actor.attacks[0]!.attackId, target.profile.id),
        sequenceRng([0.5, 0, (saveFace - 1) / 20]),
      );
      return { actor, target, attacked };
    };

    const failed = attackAt(15);
    expect(failed.attacked.events).toContainEqual(expect.objectContaining({
      type: 'save_resolved',
      save: expect.objectContaining({ outcome: 'failure', total: 14 }),
    }));
    expect(failed.attacked.state.tokens.some((token) => token.combatantId === failed.target.profile.id)).toBe(false);
    expect(failed.attacked.state.absentTokens).toContainEqual(expect.objectContaining({
      combatantId: failed.target.profile.id,
      position: { column: 1, row: 0 },
    }));
    const targetTurn = reduceEncounter(
      failed.attacked.state,
      { type: 'end_turn', actor: failed.actor.profile.id },
      () => 0,
    ).state;
    const returned = reduceEncounter(
      targetTurn,
      { type: 'end_turn', actor: failed.target.profile.id },
      () => 0,
    );
    expect(returned.events).toContainEqual(expect.objectContaining({
      type: 'combatant_returned_to_board',
      combatant: failed.target.profile.id,
    }));
    expect(returned.events).toContainEqual(expect.objectContaining({
      type: 'damage_applied',
      target: failed.target.profile.id,
      amount: 1,
    }));
    expect(returned.state.absentTokens ?? []).toEqual([]);

    const succeeded = attackAt(16);
    expect(succeeded.attacked.events).toContainEqual(expect.objectContaining({
      type: 'save_resolved',
      save: expect.objectContaining({ outcome: 'success', total: 15 }),
    }));
    expect(succeeded.attacked.state.tokens.some((token) => token.combatantId === succeeded.target.profile.id)).toBe(true);
    expect(succeeded.attacked.state.absentTokens ?? []).toEqual([]);
  });

  // SRD selected-cantrip ability-modifier precedent: docs/srd/full/srd-5.2.1.txt:4335-4342;
  // the D318.1 typed shape adds the requested one-damage-roll-per-turn bound.
  it('agonizing_applied_twice_per_turn adds exactly one spellcasting modifier to one named-spell damage roll', () => {
    const candidate = typedShapePack([{
      effectId: 'effect:focused-cantrip-damage',
      kind: 'spell_damage_ability_modifier',
      spellId: 'eldritch-blast',
      application: 'one_damage_roll_per_turn',
    }]);
    objectSpellcasting(candidate.members[0]!).knownSpellIds.push('eldritch-blast');
    const loaded = loadExternalPartyPack(candidate);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Spell-damage modifier shape was refused.');
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
    const result = reduceEncounter(state, loadedPartySpellCastCommand(caster, 'eldritch-blast', {
      slotLevel: null,
      castAsRitual: false,
      targets: [target.profile.id, target.profile.id],
      area: null,
      weaponAttack: null,
      selectedOption: null,
    }), sequenceRng([0.5, 0, 0.5, 0]));
    const damageTotals = result.events.flatMap((event) =>
      event.type === 'attack_resolved' && event.damage !== null ? [event.damage.total] : []);
    expect(damageTotals).toEqual([4, 1]);
    expect(result.state.combatants[0]?.turn.usedSpellDamageModifierEffectIds).toEqual([
      'effect:focused-cantrip-damage',
    ]);
  });

  it('timed spellcasting mode grants exactly one extra leveled-spell action and drains its long-rest pool', () => {
    // SRD resource-fueled casting-time precedent: docs/srd/full/srd-5.2.1.txt:4064-4073;
    // the clean-room engine shape is the requested one-extra-leveled-action mode.
    const candidate = typedShapePack([{
      effectId: 'effect:accelerated-casting',
      kind: 'timed_spellcasting_mode',
      trigger: 'bonus_action',
      resourcePoolId: 'resource:accelerated-casting',
      additionalLeveledSpellActions: 1,
      duration: 'this_turn',
    }], [{ resourcePoolId: 'resource:accelerated-casting', maximum: 1, recharge: 'long_rest' }]);
    const loaded = loadExternalPartyPack(candidate);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Timed spellcasting shape was refused.');
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
    const cast = () => loadedPartySpellCastCommand(caster, 'magic-missile', {
      slotLevel: 1,
      castAsRitual: false,
      targets: [target.profile.id, target.profile.id, target.profile.id],
      area: null,
      weaponAttack: null,
      selectedOption: null,
    });
    state = reduceEncounter(state, cast(), () => 0).state;
    state = reduceEncounter(state, {
      type: 'activate_timed_spellcasting_mode',
      actor: caster.profile.id,
      effectId: encounterEffectId('effect:accelerated-casting'),
    }, () => 0).state;
    const second = reduceEncounter(state, cast(), () => 0);
    expect(second.state.combatants[0]?.limitedResources?.[0]?.remaining).toBe(0);
    expect(second.state.combatants[0]?.spellSlots[0]?.remaining).toBe(2);
    expect(second.state.combatants[0]?.turn.additionalLeveledSpellActionsRemaining).toBe(0);
    expect(() => reduceEncounter(second.state, cast(), () => 0)).toThrow('no spell action available');
  });

  it('attack damage-type choice changes the target resistance interaction', () => {
    const candidate = typedShapePack([{
      effectId: 'effect:adaptive-edge',
      kind: 'attack_damage_type_choice',
      attackId: 'attack:pack-member-1',
      damageTermIndex: 0,
      damageTypeIds: ['Cold', 'Fire'],
    }]);
    candidate.members[1]!.passives = {
      damageResponses: [{ damageTypeId: 'Cold', response: 'resistant' }],
    };
    const attackTotal = (damageTypeId: 'Cold' | 'Fire') => {
      const loaded = loadExternalPartyPack(candidate);
      expect(loaded.status).toBe('loaded');
      if (loaded.status !== 'loaded') throw new Error('Damage-type choice shape was refused.');
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
      const result = reduceEncounter(state, loadedPartyAttackCommand(
        actor,
        actor.attacks[0]!.attackId,
        target.profile.id,
        {
          damageTypeSelection: {
            effectId: encounterEffectId('effect:adaptive-edge'),
            damageTypeId,
          },
        },
      ), () => 0.5);
      return result.events.find((event) => event.type === 'attack_resolved');
    };
    expect(attackTotal('Cold')).toMatchObject({ damage: { total: 4 } });
    expect(attackTotal('Fire')).toMatchObject({ damage: { total: 8 } });
  });

  it('superiority_die_free spends the resource die, adds it on hit, and applies its typed condition', () => {
    const candidate = typedShapePack([{
      effectId: 'effect:driving-maneuver',
      kind: 'resource_die_maneuver',
      trigger: 'on_hit',
      resourcePoolId: 'resource:maneuver-dice',
      sides: 6,
      damageType: 'attack_primary',
      conditionId: 'Prone',
      conditionDuration: 'until_end_of_target_next_turn',
    }], [{ resourcePoolId: 'resource:maneuver-dice', maximum: 2, recharge: 'short_rest' }]);
    candidate.members[0]!.attacksPerAction = 2;
    const loaded = loadExternalPartyPack(candidate);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Resource-die maneuver shape was refused.');
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
    const command = loadedPartyAttackCommand(
      actor,
      actor.attacks[0]!.attackId,
      target.profile.id,
      { maneuverEffectId: encounterEffectId('effect:driving-maneuver') },
    );
    const first = reduceEncounter(state, command, sequenceRng([0.5, 0, 0]));
    const second = reduceEncounter(first.state, command, sequenceRng([0.5, 0, 0]));
    expect(first.events).toContainEqual(expect.objectContaining({
      type: 'attack_resolved',
      damage: expect.objectContaining({ total: 5 }),
    }));
    expect(second.events).toContainEqual(expect.objectContaining({
      type: 'attack_resolved',
      damage: expect.objectContaining({ total: 5 }),
    }));
    expect(second.state.combatants[0]?.limitedResources?.[0]?.remaining).toBe(0);
    expect(second.state.combatants[1]?.hitPoints).toBe(22);
    expect(combatantConditions(second.state, target.profile.id)).toContainEqual({ name: 'Prone' });
  });

  it('exploding_die_unbounded explodes each maximum cantrip die exactly once', () => {
    const candidate = typedShapePack([{
      effectId: 'effect:volatile-cantrip',
      kind: 'exploding_spell_damage_die',
      spellId: 'fire-bolt',
      triggerFace: 'maximum',
      maximumExplosionsPerDie: 1,
    }]);
    const loaded = loadExternalPartyPack(candidate);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Exploding cantrip shape was refused.');
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
    const result = reduceEncounter(state, loadedPartySpellCastCommand(caster, 'fire-bolt', {
      slotLevel: null,
      castAsRitual: false,
      targets: [target.profile.id],
      area: null,
      weaponAttack: null,
      selectedOption: null,
    }), sequenceRng([0.5, 0.999, 0.999, 0.999, 0.999]));
    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'attack_resolved',
      damage: {
        terms: [expect.objectContaining({
          roll: expect.objectContaining({ faces: [10, 10, 10, 10], explosionFaces: [10, 10] }),
          beforeResponse: 40,
          afterResponse: 40,
        })],
        total: 40,
      },
    }));
  });

  // SRD element-choice/once-per-turn precedent: docs/srd/full/srd-5.2.1.txt:2627-2644;
  // the imported-build shape carries its declared flat amount rather than SRD dice.
  it('elemental fury adds the selected declared damage type to a qualifying attack', () => {
    const candidate = typedShapePack([{
      effectId: 'effect:elemental-fury',
      kind: 'elemental_fury',
      attackIds: ['attack:pack-member-1'],
      damageTypeIds: ['Cold', 'Fire', 'Lightning', 'Thunder'],
      selectedDamageTypeId: 'Fire',
      amount: 4,
      gate: 'first_hit_this_turn',
    }]);
    candidate.members[1]!.passives = {
      damageResponses: [{ damageTypeId: 'Fire', response: 'resistant' }],
    };
    const loaded = loadExternalPartyPack(candidate);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Elemental Fury shape was refused.');
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
    const result = reduceEncounter(
      state,
      loadedPartyAttackCommand(actor, actor.attacks[0]!.attackId, target.profile.id),
      () => 0.5,
    );
    const resolved = result.events.find((event) => event.type === 'attack_resolved');
    expect(resolved).toMatchObject({
      damage: {
        terms: [
          expect.objectContaining({ type: 'Slashing', afterResponse: 8 }),
          expect.objectContaining({ type: 'Fire', beforeResponse: 4, afterResponse: 2 }),
        ],
        total: 10,
      },
    });
  });

  it('elemental_fury_every_hit applies selected flat damage only to the first of two qualifying hits', () => {
    const candidate = typedShapePack([{
      effectId: 'effect:elemental-fury',
      kind: 'elemental_fury',
      attackIds: ['attack:pack-member-1'],
      damageTypeIds: ['Cold', 'Fire', 'Lightning', 'Thunder'],
      selectedDamageTypeId: 'Fire',
      amount: 4,
      gate: 'first_hit_this_turn',
    }]);
    candidate.members[0]!.attacksPerAction = 2;
    candidate.members[1]!.passives = {
      damageResponses: [{ damageTypeId: 'Fire', response: 'resistant' }],
    };
    const loaded = loadExternalPartyPack(candidate);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Elemental Fury shape was refused.');
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
    const command = loadedPartyAttackCommand(actor, actor.attacks[0]!.attackId, target.profile.id);
    const first = reduceEncounter(state, command, () => 0.5);
    const second = reduceEncounter(first.state, command, () => 0.5);

    expect(first.events.find((event) => event.type === 'attack_resolved')).toMatchObject({
      damage: {
        terms: [
          expect.objectContaining({ type: 'Slashing', afterResponse: 8 }),
          expect.objectContaining({ type: 'Fire', beforeResponse: 4, afterResponse: 2 }),
        ],
        total: 10,
      },
    });
    expect(second.events.find((event) => event.type === 'attack_resolved')).toMatchObject({
      damage: {
        terms: [expect.objectContaining({ type: 'Slashing', afterResponse: 8 })],
        total: 8,
      },
    });
    expect(second.state.combatants[1]?.hitPoints).toBe(14);
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
