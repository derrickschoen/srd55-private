import { readFileSync } from '../../helpers/test-filesystem';
import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { combatToken } from '../../../src/combat/combatant';
import type { PersistedCoordinatorState } from '../../../src/combat/coordinator';
import { combatantConditions, createEncounter, reduceEncounter } from '../../../src/combat/encounter';
import { mulberry32 } from '../../../src/combat/random';
import {
  encounterBranchId,
  encounterEffectId,
  encounterSessionId,
} from '../../../src/combat/values';
import {
  externalPartyPackFeatureEffectSchema,
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

function zodFeatureEffectKinds(schema: unknown): readonly string[] {
  let unwrapped = schema;
  while (
    typeof unwrapped === 'object' &&
    unwrapped !== null &&
    'innerType' in unwrapped &&
    typeof unwrapped.innerType === 'function'
  ) {
    unwrapped = unwrapped.innerType();
  }
  if (
    typeof unwrapped !== 'object' ||
    unwrapped === null ||
    !('options' in unwrapped) ||
    !Array.isArray(unwrapped.options)
  ) {
    throw new TypeError('Expected a Zod discriminated union with options.');
  }
  return unwrapped.options.map((option, index) => {
    if (
      typeof option !== 'object' ||
      option === null ||
      !('shape' in option) ||
      typeof option.shape !== 'object' ||
      option.shape === null ||
      !('kind' in option.shape)
    ) {
      throw new TypeError(`Expected feature-effect option ${String(index)} to have a kind shape.`);
    }
    const kindSchema = option.shape.kind;
    if (
      typeof kindSchema !== 'object' ||
      kindSchema === null ||
      !('value' in kindSchema) ||
      typeof kindSchema.value !== 'string'
    ) {
      throw new TypeError(`Expected feature-effect option ${String(index)} kind to be a string literal.`);
    }
    return kindSchema.value;
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

function gapSummary(result: ReturnType<typeof loadExternalPartyPack>) {
  return result.gaps.map((gap) => ({
    featurePath: gap.featurePath,
    reason: gap.engineRefusalReason,
  }));
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
  it('consumes returned validation issues in deterministic one-error and multi-error order', () => {
    const validPacket = {
      damageType: { kind: 'fixed' as const, damageType: 'Force' as const },
      dice: {
        baseCount: 1,
        sides: 6 as const,
        modifier: 0,
        perSlotCount: 0,
        perSlotModifier: 0,
        cantripUpgrade: false,
      },
      scaling: { kind: 'none' as const },
      thresholdRider: null,
    };
    const effect = {
      effectId: 'effect:validation-adapter',
      kind: 'damage_operation' as const,
      trigger: 'action' as const,
      saveDc: 14,
      delivery: {
        kind: 'save' as const,
        ability: 'dexterity' as const,
        rollMode: 'normal' as const,
        onSuccess: 'none' as const,
      },
      instancesPerTarget: 1,
      packets: [validPacket],
      timing: { kind: 'immediate' as const },
    };

    expect(externalPartyPackFeatureEffectSchema.safeParse(effect).success).toBe(true);

    const oneError = structuredClone(effect);
    oneError.packets[0]!.dice.perSlotCount = 1;
    const oneErrorResult = externalPartyPackFeatureEffectSchema.safeParse(oneError);
    expect(oneErrorResult.success).toBe(false);
    if (oneErrorResult.success) throw new Error('One-error feature unexpectedly parsed.');
    expect(oneErrorResult.error.issues.map((issue) => ({ path: issue.path, message: issue.message })))
      .toEqual([{
        path: [],
        message: 'Feature damage cannot use spell-slot or cantrip scaling.',
      }]);

    const multiError = structuredClone(effect);
    multiError.packets = [
      { ...validPacket, dice: { ...validPacket.dice, perSlotCount: 1 } },
      { ...validPacket, dice: { ...validPacket.dice, cantripUpgrade: true } },
    ];
    const multiErrorResult = externalPartyPackFeatureEffectSchema.safeParse(multiError);
    expect(multiErrorResult.success).toBe(false);
    if (multiErrorResult.success) throw new Error('Multi-error feature unexpectedly parsed.');
    expect(multiErrorResult.error.issues.map((issue) => ({ path: issue.path, message: issue.message })))
      .toEqual([
        { path: [], message: 'Feature damage cannot use spell-slot or cantrip scaling.' },
        { path: [], message: 'Feature damage cannot use spell-slot or cantrip scaling.' },
      ]);
  });

  it('preserves returned rule paths when the loader consumes attack issues', () => {
    const candidate = structuredClone(pack()) as unknown as {
      members: Array<{ attacks: Array<Record<string, unknown>> }>;
    };
    const firstAttack = candidate.members[0]!.attacks[0]!;
    firstAttack.masteryProperty = 'Topple';
    candidate.members[0]!.attacks.push({
      ...firstAttack,
      attackId: 'attack:invalid-slow-save',
      masteryProperty: 'Slow',
      masterySaveDc: 12,
    });

    const result = loadExternalPartyPack(candidate);
    expect(result.status).toBe('refused');
    expect(result.gaps.map((gap) => ({
      featurePath: gap.featurePath,
      reason: gap.engineRefusalReason,
    }))).toEqual([
      {
        featurePath: 'members.0.attacks.0.masterySaveDc',
        reason: 'value_not_in_engine_vocabulary',
      },
      {
        featurePath: 'members.0.attacks.1.masterySaveDc',
        reason: 'value_not_in_engine_vocabulary',
      },
    ]);
  });

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
    expect(replayBytes).toContain('"arming"');
    const restoredCaster = restored.encounterState?.combatants[0];
    if (restoredCaster === undefined) throw new Error('Restored damage-operation caster is missing.');
    const restoredEffects = restoredCaster.profile.rules.featureEffects;
    if (restoredEffects === undefined) throw new Error('Restored damage-operation effects are missing.');
    expect(restoredEffects[1]?.payload).toMatchObject({
      arming: { concentration: false, durationRounds: 2 },
    });

    const malformed = structuredClone(candidate) as unknown as {
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

    const malformed = structuredClone(candidate) as unknown as {
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

  it('loads Pact Magic as a distinct short-rest spell-slot pool', () => {
    const candidate = structuredClone(pack());
    candidate.members[0]!.pactSpellSlots = [{
      level: 2,
      count: 2,
      recharge: 'short_rest',
    }];

    const loaded = loadExternalPartyPack(candidate);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Valid Pact Magic pool was refused.');
    expect(loaded.party.members[0]?.pactSpellSlots).toEqual([{
      level: 2,
      maximum: 2,
      recharge: 'short_rest',
    }]);
    expect(loaded.party.members[0]?.profile.rules.spellSlots).toContainEqual({
      level: 2,
      maximum: 2,
      recharge: 'short_rest',
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
    const rawSpellcasting = objectSpellcasting(candidate.members[0]!) as unknown as {
      preparedSpellIds: string[];
    };
    rawSpellcasting.preparedSpellIds = ['not-in-the-181-spell-manifest'];

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

  it('pins collection type, length, and duplicate diagnostics at every loaded-member boundary', () => {
    const loadWithField = (field: string, value: unknown) => {
      const candidate = structuredClone(pack(3, true));
      const member = candidate.members[0] as unknown as Record<string, unknown>;
      member[field] = value;
      return loadExternalPartyPack(candidate);
    };

    for (const field of ['startingConditions', 'worldOperations', 'effects', 'resources']) {
      const result = loadWithField(field, 'not-an-array');
      expect(result.status).toBe('loaded');
      expect(gapSummary(result)).toEqual([{
        featurePath: `members.0.${field}`,
        reason: 'invalid_party_pack_structure',
      }]);
    }

    const oversizedConditions = Array.from({ length: 101 }, (_value, index) => ({
      effectId: `effect:condition-${String(index)}`,
      conditionId: 'Prone',
    }));
    expect(gapSummary(loadWithField('startingConditions', oversizedConditions))).toEqual([{
      featurePath: 'members.0.startingConditions',
      reason: 'value_not_in_engine_vocabulary',
    }]);

    const oversizedWorldOperations = Array.from({ length: 101 }, (_value, index) => ({
      operationId: `world:light-${String(index)}`,
      cost: 'none',
      operation: {
        kind: 'set_light_level',
        region: { id: `room-${String(index)}`, cells: [{ column: 0, row: 0 }] },
        level: 'dim',
      },
    }));
    expect(gapSummary(loadWithField('worldOperations', oversizedWorldOperations))).toEqual([{
      featurePath: 'members.0.worldOperations',
      reason: 'value_not_in_engine_vocabulary',
    }]);

    const oversizedEffects = Array.from({ length: 101 }, (_value, index) => ({
      effectId: `effect:temporary-${String(index)}`,
      kind: 'temporary_hit_points',
      trigger: 'bonus_action',
      amount: 1,
    }));
    expect(gapSummary(loadWithField('effects', oversizedEffects))).toEqual([{
      featurePath: 'members.0.effects',
      reason: 'value_not_in_engine_vocabulary',
    }]);

    const oversizedResources = Array.from({ length: 101 }, (_value, index) => ({
      resourcePoolId: `resource:pool-${String(index)}`,
      maximum: 1,
      recharge: 'short_rest',
    }));
    expect(gapSummary(loadWithField('resources', oversizedResources))).toEqual([{
      featurePath: 'members.0.resources',
      reason: 'value_not_in_engine_vocabulary',
    }]);

    const duplicateCandidate = structuredClone(pack(3, true));
    const duplicateMember = duplicateCandidate.members[0]!;
    duplicateMember.startingConditions = [
      { effectId: 'effect:duplicate-condition', conditionId: 'Prone' },
      { effectId: 'effect:distinct-condition', conditionId: 'Invisible' },
      { effectId: 'effect:duplicate-condition', conditionId: 'Invisible' },
    ];
    duplicateMember.worldOperations = [{
      operationId: 'world:duplicate',
      cost: 'none',
      operation: {
        kind: 'set_light_level', level: 'dim',
        region: { id: 'room-one', cells: [{ column: 0, row: 0 }] },
      },
    }, {
      operationId: 'world:duplicate',
      cost: 'none',
      operation: {
        kind: 'set_light_level', level: 'darkness',
        region: { id: 'room-two', cells: [{ column: 1, row: 0 }] },
      },
    }];
    duplicateMember.effects = [
      { effectId: 'effect:duplicate', kind: 'temporary_hit_points', trigger: 'bonus_action', amount: 2 },
      { effectId: 'effect:duplicate', kind: 'temporary_hit_points', trigger: 'bonus_action', amount: 3 },
    ];
    duplicateMember.resources = [
      { resourcePoolId: 'resource:duplicate', maximum: 1, recharge: 'short_rest' },
      { resourcePoolId: 'resource:duplicate', maximum: 2, recharge: 'long_rest' },
    ];
    const duplicates = loadExternalPartyPack(duplicateCandidate);
    expect(duplicates.status).toBe('loaded');
    if (duplicates.status !== 'loaded') throw new Error('Partial duplicate fixture was refused.');
    expect(gapSummary(duplicates)).toEqual([
      { featurePath: 'members.0.startingConditions.2.effectId', reason: 'value_not_in_engine_vocabulary' },
      { featurePath: 'members.0.worldOperations.1.operationId', reason: 'value_not_in_engine_vocabulary' },
      { featurePath: 'members.0.effects.1.effectId', reason: 'value_not_in_engine_vocabulary' },
      { featurePath: 'members.0.resources.1.resourcePoolId', reason: 'value_not_in_engine_vocabulary' },
    ]);
    expect(duplicates.party.members[0]).toMatchObject({
      source: {
        startingConditions: [
          { effectId: 'effect:duplicate-condition', conditionId: 'Prone' },
          { effectId: 'effect:distinct-condition', conditionId: 'Invisible' },
        ],
        worldOperations: [{ operationId: 'world:duplicate' }],
        effects: [{ effectId: 'effect:duplicate', amount: 2 }],
        resources: [{ resourcePoolId: 'resource:duplicate', maximum: 1 }],
      },
    });
  });

  it('maps structural and value issues to exact nested collection paths', () => {
    const candidate = structuredClone(pack(3, true)) as unknown as {
      members: Array<Record<string, unknown>>;
    };
    candidate.members[0]!.startingConditions = [
      { effectId: 'effect:sanitized-condition', conditionId: 'Prone', unsupported: true },
      { effectId: 'effect:invalid-condition', conditionId: 'NotACondition' },
    ];
    candidate.members[0]!.worldOperations = [{
      operationId: 'world:strict-operation', cost: 'none', unsupported: true,
      operation: {
        kind: 'set_light_level', level: 'dim',
        region: { id: 'strict-room', cells: [{ column: 0, row: 0 }] },
      },
    }, {
      operationId: 'world:invalid-operation', cost: 'invalid',
      operation: {
        kind: 'set_light_level', level: 'dim',
        region: { id: 'invalid-room', cells: [{ column: 0, row: 0 }] },
      },
    }];
    candidate.members[0]!.effects = [
      {
        effectId: 'effect:strict-effect', kind: 'temporary_hit_points',
        trigger: 'bonus_action', amount: 2, unsupported: true,
      },
      {
        effectId: 'effect:invalid-effect', kind: 'temporary_hit_points',
        trigger: 'bonus_action', amount: -1,
      },
    ];
    candidate.members[0]!.resources = [
      {
        resourcePoolId: 'resource:strict', maximum: 1,
        recharge: 'short_rest', unsupported: true,
      },
      { resourcePoolId: 'resource:invalid', maximum: 0, recharge: 'short_rest' },
    ];

    const result = loadExternalPartyPack(candidate);
    expect(result.status).toBe('loaded');
    expect(gapSummary(result)).toEqual([
      { featurePath: 'members.0.startingConditions.0.unsupported', reason: 'field_not_in_engine_vocabulary' },
      { featurePath: 'members.0.startingConditions.1.conditionId', reason: 'value_not_in_engine_vocabulary' },
      { featurePath: 'members.0.worldOperations.0', reason: 'field_not_in_engine_vocabulary' },
      { featurePath: 'members.0.worldOperations.1.cost', reason: 'value_not_in_engine_vocabulary' },
      { featurePath: 'members.0.effects.0', reason: 'field_not_in_engine_vocabulary' },
      { featurePath: 'members.0.effects.1.amount', reason: 'value_not_in_engine_vocabulary' },
      { featurePath: 'members.0.resources.0', reason: 'field_not_in_engine_vocabulary' },
      { featurePath: 'members.0.resources.1.maximum', reason: 'value_not_in_engine_vocabulary' },
    ]);
  });

  it('rejects passive totals outside their closed ranges and duplicate passive identities', () => {
    const loadWithPassives = (
      passives: unknown,
      base: { readonly armorClass?: number; readonly walkingSpeedFeet?: number } = {},
    ) => {
      const candidate = structuredClone(pack(3, true)) as unknown as {
        members: Array<Record<string, unknown>>;
      };
      if (base.armorClass !== undefined) candidate.members[0]!.armorClass = base.armorClass;
      if (base.walkingSpeedFeet !== undefined) {
        candidate.members[0]!.walkingSpeedFeet = base.walkingSpeedFeet;
      }
      candidate.members[0]!.passives = passives;
      return loadExternalPartyPack(candidate);
    };

    expect(gapSummary(loadWithPassives({ unsupported: true }))).toEqual([{
      featurePath: 'members.0.passives',
      reason: 'field_not_in_engine_vocabulary',
    }]);
    expect(gapSummary(loadWithPassives({ armorClassBonus: 'one' }))).toEqual([{
      featurePath: 'members.0.passives.armorClassBonus',
      reason: 'value_not_in_engine_vocabulary',
    }]);
    const valid = loadWithPassives({
      armorClassBonus: 2,
      speedAdjustmentFeet: 5,
      skillBonuses: [{ skillId: 'perception', bonus: 3 }],
      damageResponses: [{ damageTypeId: 'Cold', response: 'resistant' }],
      conditionImmunities: ['Prone'],
    });
    expect(valid.status).toBe('loaded');
    if (valid.status !== 'loaded') throw new Error('Valid passive fixture was refused.');
    expect(valid.gaps).toEqual([]);
    expect(valid.party.members[0]!.profile.rules).toMatchObject({
      armorClass: 18, speed: 35, passivePerception: 13,
      damageResponses: [{ type: 'Cold', response: 'resistant' }],
      conditionImmunities: ['Prone'],
    });
    const onlyArmorBelowRange = loadWithPassives(
      { armorClassBonus: -1 },
      { armorClass: 1 },
    );
    expect(gapSummary(onlyArmorBelowRange)).toEqual([{
      featurePath: 'members.0.passives.armorClassBonus',
      reason: 'value_not_in_engine_vocabulary',
    }]);
    if (onlyArmorBelowRange.status !== 'loaded') {
      throw new Error('Partial armor-passive fixture was refused.');
    }
    expect('passives' in onlyArmorBelowRange.party.members[0]!.source).toBe(false);

    const belowAndDuplicate = loadWithPassives({
      armorClassBonus: -1,
      speedAdjustmentFeet: -6,
      skillBonuses: [
        { skillId: 'perception', bonus: 1 },
        { skillId: 'perception', bonus: 2 },
      ],
      damageResponses: [
        { damageTypeId: 'Fire', response: 'resistant' },
        { damageTypeId: 'Fire', response: 'immune' },
      ],
      conditionImmunities: ['Prone', 'Prone'],
    }, { armorClass: 1, walkingSpeedFeet: 5 });
    expect(belowAndDuplicate.status).toBe('loaded');
    if (belowAndDuplicate.status !== 'loaded') throw new Error('Partial passive fixture was refused.');
    expect(gapSummary(belowAndDuplicate)).toEqual([
      { featurePath: 'members.0.passives.armorClassBonus', reason: 'value_not_in_engine_vocabulary' },
      { featurePath: 'members.0.passives.speedAdjustmentFeet', reason: 'value_not_in_engine_vocabulary' },
      { featurePath: 'members.0.passives.skillBonuses', reason: 'value_not_in_engine_vocabulary' },
      { featurePath: 'members.0.passives.damageResponses', reason: 'value_not_in_engine_vocabulary' },
      { featurePath: 'members.0.passives.conditionImmunities', reason: 'value_not_in_engine_vocabulary' },
    ]);
    expect('passives' in belowAndDuplicate.party.members[0]!.source).toBe(false);

    const above = loadWithPassives(
      { armorClassBonus: 1, speedAdjustmentFeet: 1 },
      { armorClass: 50, walkingSpeedFeet: 1_000 },
    );
    expect(gapSummary(above)).toEqual([
      { featurePath: 'members.0.passives.armorClassBonus', reason: 'value_not_in_engine_vocabulary' },
      { featurePath: 'members.0.passives.speedAdjustmentFeet', reason: 'value_not_in_engine_vocabulary' },
    ]);
    if (above.status !== 'loaded') throw new Error('Partial upper passive fixture was refused.');
    expect('passives' in above.party.members[0]!.source).toBe(false);
  });

  it('pins every effect referential-integrity failure to its discriminating field', () => {
    const loadEffects = (effects: readonly unknown[], resources: readonly unknown[] = []) => {
      const candidate = structuredClone(pack(3, true)) as unknown as {
        members: Array<Record<string, unknown>>;
      };
      candidate.members[0]!.effects = effects;
      candidate.members[0]!.resources = resources;
      return loadExternalPartyPack(candidate);
    };
    const expectOnlyGap = (
      effects: readonly unknown[],
      featurePath: string,
      resources: readonly unknown[] = [],
    ) => {
      const result = loadEffects(effects, resources);
      expect(result.status).toBe('loaded');
      expect(gapSummary(result)).toEqual([{
        featurePath,
        reason: 'value_not_in_engine_vocabulary',
      }]);
      if (result.status !== 'loaded') throw new Error('Partial effect fixture was refused.');
      expect(result.party.members[0]!.effects).toHaveLength(effects.length === 2 ? 1 : 0);
    };

    expectOnlyGap([{
      effectId: 'effect:missing-pool', kind: 'bonus_action_attack_grant',
      resourcePoolId: 'resource:missing', attackCount: 1,
    }], 'members.0.effects.0.resourcePoolId');
    expectOnlyGap([{
      effectId: 'effect:wrong-surge-recharge', kind: 'action_surge',
      resourcePoolId: 'resource:wrong-surge-recharge',
    }], 'members.0.effects.0.resourcePoolId', [{
      resourcePoolId: 'resource:wrong-surge-recharge', maximum: 1, recharge: 'long_rest',
    }]);
    expectOnlyGap([{
      effectId: 'effect:wrong-mode-recharge', kind: 'timed_spellcasting_mode',
      trigger: 'bonus_action', resourcePoolId: 'resource:wrong-mode-recharge',
      additionalLeveledSpellActions: 1, duration: 'this_turn',
    }], 'members.0.effects.0.resourcePoolId', [{
      resourcePoolId: 'resource:wrong-mode-recharge', maximum: 1, recharge: 'short_rest',
    }]);
    expectOnlyGap([{
      effectId: 'effect:future-extra-attack', kind: 'extra_attack_count_override',
      levels: [{ minimumLevel: 8, attackCount: 2 }],
    }], 'members.0.effects.0.levels');
    expectOnlyGap([{
      effectId: 'effect:missing-attack', kind: 'attack_reach_range_override',
      attackId: 'attack:missing', reachFeet: 10,
    }], 'members.0.effects.0.attackId');
    expectOnlyGap([{
      effectId: 'effect:missing-damage-term', kind: 'attack_ability_substitution',
      attackId: 'attack:pack-member-1', damageTermIndex: 1,
      replacesAbility: 'strength', spellcastingAbility: 'intelligence',
    }], 'members.0.effects.0.damageTermIndex');
    expectOnlyGap([{
      effectId: 'effect:missing-spell-ability', kind: 'attack_ability_substitution',
      attackId: 'attack:pack-member-1', damageTermIndex: 0,
      replacesAbility: 'strength', spellcastingAbility: 'charisma',
    }], 'members.0.effects.0.spellcastingAbility');
    expectOnlyGap([{
      effectId: 'effect:future-damage-die', kind: 'attack_damage_die_override',
      attackId: 'attack:pack-member-1', damageTermIndex: 0,
      levels: [{ minimumLevel: 8, count: 2, sides: 8 }],
    }], 'members.0.effects.0.levels');
    expectOnlyGap([{
      effectId: 'effect:invalid-reckless-list', kind: 'reckless_attack_mode',
      strengthBasedMeleeAttackIds: ['attack:missing'],
    }], 'members.0.effects.0.strengthBasedMeleeAttackIds');
    expectOnlyGap([{
      effectId: 'effect:invalid-elemental-list', kind: 'elemental_fury',
      attackIds: ['attack:missing'], damageTypeIds: ['Fire', 'Cold'],
      selectedDamageTypeId: 'Fire', amount: 2, gate: 'first_hit_this_turn',
    }], 'members.0.effects.0.attackIds');
    expectOnlyGap([{
      effectId: 'effect:undeclared-cantrip', kind: 'spell_damage_ability_modifier',
      spellId: 'eldritch-blast', application: 'one_damage_roll_per_turn',
    }], 'members.0.effects.0.spellId');
    expectOnlyGap([{
      effectId: 'effect:first-reach', kind: 'attack_reach_range_override',
      attackId: 'attack:pack-member-1', reachFeet: 10,
    }, {
      effectId: 'effect:second-reach', kind: 'attack_reach_range_override',
      attackId: 'attack:pack-member-1', reachFeet: 15,
    }], 'members.0.effects.1.kind');
  });

  it('accepts a cantrip effect through a prepared grant and strips dangling resource spell uses', () => {
    const grantedCandidate = structuredClone(pack());
    objectSpellcasting(grantedCandidate.members[0]!).grants = [
      { spellId: 'guidance', ability: 'wisdom' },
      { spellId: 'eldritch-blast', ability: 'charisma' },
    ];
    grantedCandidate.members[0]!.effects = [{
      effectId: 'effect:granted-cantrip',
      kind: 'spell_damage_ability_modifier',
      spellId: 'eldritch-blast',
      application: 'one_damage_roll_per_turn',
    }];
    const granted = loadExternalPartyPack(grantedCandidate);
    expect(granted.status).toBe('loaded');
    if (granted.status !== 'loaded') throw new Error('Granted-cantrip fixture was refused.');
    expect(granted.gaps).toEqual([]);
    expect(granted.party.members[0]).toMatchObject({
      effects: [{ id: 'effect:granted-cantrip' }],
      spellcasting: [{ grants: [
        { spell: { id: 'guidance' }, ability: 'wisdom' },
        { spell: { id: 'eldritch-blast' }, ability: 'charisma' },
      ] }],
    });

    const danglingCandidate = structuredClone(pack(3, true));
    objectSpellcasting(danglingCandidate.members[0]!).resourceSpellUses = [{
      spellId: 'magic-missile',
      resourcePoolId: 'resource:missing',
    }];
    const dangling = loadExternalPartyPack(danglingCandidate);
    expect(dangling.status).toBe('loaded');
    if (dangling.status !== 'loaded') throw new Error('Partial resource-use fixture was refused.');
    expect(gapSummary(dangling)).toEqual([{
      featurePath: 'members.0.spellcasting.resourceSpellUses.0.resourcePoolId',
      reason: 'value_not_in_engine_vocabulary',
    }]);
    expect(dangling.party.members[0]!.spellcasting[0]!.resourceSpellUses).toEqual([]);
  });

  it('maps unmappable members, excessive levels, and duplicate classes to exact member gaps', () => {
    const expectInvalidFirstMember = (
      mutate: (candidate: ExternalPartyPackV2) => unknown,
      featurePath: string,
      reason: 'invalid_party_pack_structure' | 'value_not_in_engine_vocabulary',
    ) => {
      const candidate = structuredClone(pack(3, true));
      mutate(candidate);
      const result = loadExternalPartyPack(candidate);
      expect(result.status).toBe('refused');
      expect(result).toMatchObject({ refusal: { reason: 'invalid_structure' } });
      expect(gapSummary(result)).toEqual([{ featurePath, reason }]);
    };

    expectInvalidFirstMember((candidate) => {
      (candidate.members as unknown[])[0] = null;
    }, 'members.0', 'invalid_party_pack_structure');
    expectInvalidFirstMember((candidate) => {
      candidate.members[0]!.classes = [{ classId: 'Wizard', level: 20 }, { classId: 'Fighter', level: 1 }];
    }, 'members.0.classes', 'value_not_in_engine_vocabulary');
    expectInvalidFirstMember((candidate) => {
      candidate.members[0]!.classes = [{ classId: 'Wizard', level: 3 }, { classId: 'Wizard', level: 4 }];
    }, 'members.0.classes', 'value_not_in_engine_vocabulary');
  });

  it('normalizes duplicate legacy, pact, and shared slots while preserving their first capacities', () => {
    const legacy = v1Pack();
    legacy.allowPartial = true;
    legacy.members[0]!.spellSlots = [
      { level: 1, maximum: 4 },
      { level: 1, maximum: 2 },
    ];
    const loadedLegacy = loadExternalPartyPack(legacy);
    expect(loadedLegacy.status).toBe('loaded');
    if (loadedLegacy.status !== 'loaded') throw new Error('Legacy duplicate-slot fixture was refused.');
    expect(gapSummary(loadedLegacy)).toEqual([{
      featurePath: 'members.0.spellSlots.1.level',
      reason: 'value_not_in_engine_vocabulary',
    }]);
    expect(loadedLegacy.party.members[0]!.sharedSpellSlots).toEqual([{
      level: 1, maximum: 4, recharge: 'long_rest',
    }]);

    const modern = structuredClone(pack(3, true));
    const member = modern.members[0]!;
    member.pactSpellSlots = [
      { level: 2, count: 2, recharge: 'short_rest' },
      { level: 2, count: 1, recharge: 'short_rest' },
    ];
    const { spellSlots: _legacySlots, ...modernSource } = objectSpellcasting(member);
    member.spellcasting = [modernSource];
    member.sharedSpellSlots = [
      { level: 1, count: 4, recharge: 'long_rest' },
      { level: 1, count: 2, recharge: 'long_rest' },
    ];
    const loadedModern = loadExternalPartyPack(modern);
    expect(loadedModern.status).toBe('loaded');
    if (loadedModern.status !== 'loaded') throw new Error('Modern duplicate-slot fixture was refused.');
    expect(gapSummary(loadedModern)).toEqual([
      { featurePath: 'members.0.pactSpellSlots.1.level', reason: 'value_not_in_engine_vocabulary' },
      { featurePath: 'members.0.sharedSpellSlots.1.level', reason: 'value_not_in_engine_vocabulary' },
    ]);
    expect(loadedModern.party.members[0]).toMatchObject({
      sharedSpellSlots: [{ level: 1, maximum: 4, recharge: 'long_rest' }],
      pactSpellSlots: [{ level: 2, maximum: 2, recharge: 'short_rest' }],
    });
  });

  it('pins attack collection type, size, nested validation, and identity boundaries', () => {
    const loadWithAttacks = (attacks: unknown) => {
      const candidate = structuredClone(pack(3, true)) as unknown as {
        members: Array<Record<string, unknown>>;
      };
      candidate.members[0]!.attacks = attacks;
      return loadExternalPartyPack(candidate);
    };
    expect(gapSummary(loadWithAttacks('not-an-array'))).toEqual([{
      featurePath: 'members.0.attacks', reason: 'invalid_party_pack_structure',
    }]);

    const baseAttack = pack().members[0]!.attacks[0]!;
    const oversized = Array.from({ length: 101 }, (_value, index) => ({
      ...baseAttack,
      attackId: `attack:oversized-${String(index)}`,
    }));
    const oversizedResult = loadWithAttacks(oversized);
    expect(gapSummary(oversizedResult)).toEqual([{
      featurePath: 'members.0.attacks', reason: 'value_not_in_engine_vocabulary',
    }]);
    if (oversizedResult.status !== 'loaded') throw new Error('Oversized partial attack fixture was refused.');
    expect(oversizedResult.party.members[0]!.attacks).toHaveLength(100);

    const nested = loadWithAttacks([
      { ...baseAttack, unsupported: true },
      { ...baseAttack, attackId: 'attack:invalid-floor', criticalFloor: 1 },
      { ...baseAttack },
    ]);
    expect(nested.status).toBe('loaded');
    if (nested.status !== 'loaded') throw new Error('Partial nested-attack fixture was refused.');
    expect(gapSummary(nested)).toEqual([
      { featurePath: 'members.0.attacks.0.unsupported', reason: 'field_not_in_engine_vocabulary' },
      { featurePath: 'members.0.attacks.1.criticalFloor', reason: 'value_not_in_engine_vocabulary' },
      { featurePath: 'members.0.attacks.2.attackId', reason: 'value_not_in_engine_vocabulary' },
    ]);
    expect(nested.party.members[0]!.attacks).toHaveLength(1);
  });

  it('pins spellcasting container failures and shared-slot ownership', () => {
    const emptySources = structuredClone(pack(3, true)) as unknown as {
      members: Array<Record<string, unknown>>;
    };
    emptySources.members[0]!.spellcasting = [];
    expect(loadExternalPartyPack(emptySources)).toMatchObject({
      status: 'refused',
      refusal: { reason: 'invalid_structure' },
      gaps: [{ featurePath: 'members.0.spellcasting', engineRefusalReason: 'invalid_party_pack_structure' }],
    });

    const orphanedSlots = structuredClone(pack(3, true)) as unknown as {
      members: Array<Record<string, unknown>>;
    };
    delete orphanedSlots.members[0]!.spellcasting;
    orphanedSlots.members[0]!.sharedSpellSlots = [{
      level: 1, count: 4, recharge: 'long_rest',
    }];
    const orphaned = loadExternalPartyPack(orphanedSlots);
    expect(orphaned.status).toBe('loaded');
    expect(gapSummary(orphaned)).toEqual([{
      featurePath: 'members.0.sharedSpellSlots', reason: 'value_not_in_engine_vocabulary',
    }]);

    const malformedLegacy = structuredClone(pack(3, true)) as unknown as {
      members: Array<Record<string, unknown>>;
    };
    const legacySource = malformedLegacy.members[0]!.spellcasting;
    if (typeof legacySource !== 'object' || legacySource === null || Array.isArray(legacySource)) {
      throw new TypeError('Expected object spellcasting source.');
    }
    (legacySource as Record<string, unknown>).spellSaveDc = 0;
    expect(loadExternalPartyPack(malformedLegacy)).toMatchObject({
      status: 'refused',
      refusal: { reason: 'invalid_structure' },
      gaps: [{
        featurePath: 'members.0.spellcasting.spellSaveDc',
        engineRefusalReason: 'value_not_in_engine_vocabulary',
      }],
    });

    const malformedArray = structuredClone(pack(3, true)) as unknown as {
      members: Array<Record<string, unknown>>;
    };
    const arraySource = malformedArray.members[0]!.spellcasting;
    if (typeof arraySource !== 'object' || arraySource === null || Array.isArray(arraySource)) {
      throw new TypeError('Expected object spellcasting source.');
    }
    const { spellSlots: _arrayLegacySlots, ...arrayModernSource } = arraySource as Record<string, unknown>;
    malformedArray.members[0]!.spellcasting = [arrayModernSource, {
      ability: 'wisdom', spellSaveDc: 0, spellAttackBonus: 4,
      preparedSpellIds: [], knownSpellIds: [],
    }];
    malformedArray.members[0]!.sharedSpellSlots = [{
      level: 1, count: 4, recharge: 'long_rest',
    }];
    expect(loadExternalPartyPack(malformedArray)).toMatchObject({
      status: 'refused',
      refusal: { reason: 'invalid_structure' },
      gaps: [{
        featurePath: 'members.0.spellcasting.1.spellSaveDc',
        engineRefusalReason: 'value_not_in_engine_vocabulary',
      }],
    });
  });

  it('normalizes legacy spell-selection containers and refuses unknown manifest identities', () => {
    const loadLegacySelections = (selections: unknown) => {
      const candidate = v1Pack() as unknown as Record<string, unknown> & {
        members: Array<Record<string, unknown>>;
      };
      candidate.allowPartial = true;
      candidate.members[0]!.spellSelections = selections;
      return loadExternalPartyPack(candidate);
    };

    const nonArray = loadLegacySelections('magic-missile');
    expect(nonArray.status).toBe('loaded');
    if (nonArray.status !== 'loaded') throw new Error('Legacy non-array fixture was refused.');
    expect(gapSummary(nonArray)).toEqual([{
      featurePath: 'members.0.spellSelections', reason: 'invalid_party_pack_structure',
    }]);
    expect(nonArray.party.members[0]!.spells).toEqual([]);

    const mixed = loadLegacySelections([17, 'magic-missile', 'magic-missile']);
    expect(mixed.status).toBe('loaded');
    if (mixed.status !== 'loaded') throw new Error('Legacy mixed-selection fixture was refused.');
    expect(gapSummary(mixed)).toEqual([
      { featurePath: 'members.0.spellSelections.0', reason: 'value_not_in_engine_vocabulary' },
      { featurePath: 'members.0.spellSelections.2', reason: 'value_not_in_engine_vocabulary' },
    ]);
    expect(mixed.party.members[0]!.spells.map((spell) => spell.id)).toEqual(['magic-missile']);

    const oversized = loadLegacySelections(Array.from({ length: 1_000 }, () => 'magic-missile'));
    expect(oversized.status).toBe('loaded');
    expect(gapSummary(oversized)).toContainEqual({
      featurePath: 'members.0.spellSelections', reason: 'value_not_in_engine_vocabulary',
    });

    const unknown = loadLegacySelections(['spell:not-in-manifest']);
    expect(unknown).toMatchObject({
      status: 'refused',
      refusal: { reason: 'unknown_spell_id' },
      gaps: [{
        featurePath: 'members.0.spellSelections.0',
        engineRefusalReason: 'value_not_in_engine_vocabulary',
      }],
    });
  });

  it('deduplicates spell source roles, grants, and resource uses by their contract identities', () => {
    const candidate = structuredClone(pack(3, true));
    const source = objectSpellcasting(candidate.members[0]!);
    source.preparedSpellIds = ['magic-missile', 'sacred-flame'];
    source.knownSpellIds = ['sacred-flame', 'fire-bolt'];
    source.grants = [
      { spellId: 'eldritch-blast', ability: 'charisma' },
      { spellId: 'eldritch-blast', ability: 'wisdom' },
    ];
    source.resourceSpellUses = [
      { spellId: 'magic-missile', resourcePoolId: 'resource:spell-use' },
      { spellId: 'magic-missile', resourcePoolId: 'resource:spell-use' },
      { spellId: 'healing-word', resourcePoolId: 'resource:spell-use' },
    ];
    candidate.members[0]!.resources = [{
      resourcePoolId: 'resource:spell-use', maximum: 2, recharge: 'long_rest',
    }];
    const result = loadExternalPartyPack(candidate);
    expect(result.status).toBe('loaded');
    if (result.status !== 'loaded') throw new Error('Partial spell-role fixture was refused.');
    expect(gapSummary(result)).toEqual([
      { featurePath: 'members.0.spellcasting.knownSpellIds.0', reason: 'value_not_in_engine_vocabulary' },
      { featurePath: 'members.0.spellcasting.grants.1.spellId', reason: 'value_not_in_engine_vocabulary' },
      { featurePath: 'members.0.spellcasting.resourceSpellUses.1', reason: 'value_not_in_engine_vocabulary' },
      { featurePath: 'members.0.spellcasting.resourceSpellUses.2.spellId', reason: 'value_not_in_engine_vocabulary' },
    ]);
    expect(result.party.members[0]!.spellcasting[0]).toMatchObject({
      preparedSpells: [{ id: 'magic-missile' }, { id: 'sacred-flame' }],
      knownSpells: [{ id: 'fire-bolt' }],
      grants: [{ spell: { id: 'eldritch-blast' }, ability: 'charisma' }],
      resourceSpellUses: [{ spellId: 'magic-missile', resourcePoolId: 'resource:spell-use' }],
    });
  });

  it('enumerates the exact cross-product of smite slots, damage choices, maneuvers, and reckless mode', () => {
    const candidate = structuredClone(familyPack());
    const member = candidate.members[0]!;
    objectSpellcasting(member).spellSlots = [
      { level: 1, count: 1, recharge: 'long_rest' },
      { level: 9, count: 1, recharge: 'long_rest' },
    ];
    member.resources = [{
      resourcePoolId: 'resource:maneuver-matrix', maximum: 1, recharge: 'short_rest',
    }];
    member.effects = [{
      effectId: 'effect:smite-matrix', kind: 'slot_spend_damage_rider', trigger: 'on_hit',
      spendGate: 'slot_spent', criticalGate: 'crit_confirmed', damageTypeId: 'Radiant',
      baseCount: 1, countPerSlotLevel: 1, sides: 8, modifier: 0,
    }, {
      effectId: 'effect:type-matrix', kind: 'attack_damage_type_choice',
      attackId: 'attack:pack-member-1', damageTermIndex: 0, damageTypeIds: ['Cold', 'Fire'],
    }, {
      effectId: 'effect:maneuver-matrix', kind: 'resource_die_maneuver', trigger: 'on_hit',
      resourcePoolId: 'resource:maneuver-matrix', sides: 6, damageType: 'attack_primary',
      conditionId: 'Prone', conditionDuration: 'until_end_of_target_next_turn',
    }, {
      effectId: 'effect:reckless-matrix', kind: 'reckless_attack_mode',
      strengthBasedMeleeAttackIds: ['attack:pack-member-1'],
    }];
    const loaded = loadExternalPartyPack(candidate);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Attack-choice matrix was refused.');
    const actor = loaded.party.members[0]!;
    const target = monsterProfile('choice-matrix-target', { initiativeBonus: -10 });
    let state = createEncounter({
      bounds: { columns: 3, rows: 2 },
      combatants: [actor.profile, target],
      tokens: [combatToken(actor.profile, { column: 0, row: 0 }), placedToken(target, 1)],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    const legalActions = loadedPartyTurnLegalActions(loaded.party.members);
    const attacks = legalActions(state, actor.profile.id).actions.filter(
      (action) => action.type === 'attack',
    );
    expect(attacks).toHaveLength(24);
    expect([...new Set(attacks.map((attack) => attack.riderSelections?.[0]?.slotLevel ?? null))])
      .toEqual([null, 1, 9]);
    expect([...new Set(attacks.map((attack) => attack.damageTypeSelection?.damageType ?? null))])
      .toEqual(['Cold', 'Fire']);
    expect(attacks.filter((attack) => attack.maneuverEffectId === 'effect:maneuver-matrix')).toHaveLength(12);
    expect(attacks.filter((attack) => attack.recklessAttackEffectId === 'effect:reckless-matrix')).toHaveLength(12);

    const depletedFirstLevel = {
      ...state,
      combatants: state.combatants.map((combatant) => combatant.profile.id === actor.profile.id
        ? {
            ...combatant,
            spellSlots: combatant.spellSlots.map((slot) => slot.level === 1
              ? { ...slot, remaining: 0 }
              : slot),
          }
        : combatant),
    };
    const depletedAttacks = legalActions(depletedFirstLevel, actor.profile.id).actions.filter(
      (action) => action.type === 'attack',
    );
    expect(depletedAttacks).toHaveLength(16);
    expect([...new Set(depletedAttacks.map(
      (attack) => attack.riderSelections?.[0]?.slotLevel ?? null,
    ))]).toEqual([null, 9]);
  });

  it('keeps multi-attack grants, timed casting, and self areas legal only at their exact state boundaries', () => {
    const candidate = typedShapePack([{
      effectId: 'effect:two-bonus-attacks', kind: 'bonus_action_attack_grant',
      resourcePoolId: 'resource:two-bonus-attacks', attackCount: 2,
    }, {
      effectId: 'effect:timed-mode-legal', kind: 'timed_spellcasting_mode', trigger: 'bonus_action',
      resourcePoolId: 'resource:timed-mode-legal', additionalLeveledSpellActions: 1,
      duration: 'this_turn',
    }, {
      effectId: 'effect:action-area', kind: 'persistent_area', trigger: 'action', origin: 'self',
      shape: { kind: 'emanation', radiusFeet: 5 }, duration: { kind: 'rounds', rounds: 2 },
      targetFilter: 'allies', difficultTerrain: false, movableFeet: null, hooks: [],
    }, {
      effectId: 'effect:bonus-area', kind: 'persistent_area', trigger: 'bonus_action', origin: 'self',
      resourcePoolId: 'resource:bonus-area',
      shape: { kind: 'emanation', radiusFeet: 10 }, duration: { kind: 'rounds', rounds: 3 },
      targetFilter: 'enemies', difficultTerrain: true, movableFeet: null, hooks: [],
    }, {
      effectId: 'effect:reaction-area', kind: 'persistent_area', trigger: 'reaction', origin: 'self',
      shape: { kind: 'emanation', radiusFeet: 15 }, duration: { kind: 'rounds', rounds: 1 },
      targetFilter: 'all', difficultTerrain: false, movableFeet: null, hooks: [],
    }], [
      { resourcePoolId: 'resource:two-bonus-attacks', maximum: 1, recharge: 'short_rest' },
      { resourcePoolId: 'resource:timed-mode-legal', maximum: 1, recharge: 'long_rest' },
      { resourcePoolId: 'resource:bonus-area', maximum: 1, recharge: 'short_rest' },
    ]);
    const loaded = loadExternalPartyPack(candidate);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Action-legality fixture was refused.');
    const actor = loaded.party.members[0]!;
    const target = monsterProfile('feature-legality-target', { hitPoints: 100, initiativeBonus: -10 });
    let state = createEncounter({
      bounds: { columns: 3, rows: 2 },
      combatants: [actor.profile, target],
      tokens: [combatToken(actor.profile, { column: 0, row: 0 }), placedToken(target, 1)],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    const legalActions = loadedPartyTurnLegalActions(loaded.party.members);
    const initial = legalActions(state, actor.profile.id).actions;
    expect(initial.filter((action) => action.type === 'activate_timed_spellcasting_mode')).toEqual([{
      type: 'activate_timed_spellcasting_mode',
      actor: actor.profile.id,
      effectId: 'effect:timed-mode-legal',
    }]);
    expect(initial.filter((action) => action.type === 'create_persistent_area').map((action) => ({
      featureEffectId: action.featureEffectId,
      cost: action.cost,
      radius: action.area.shape.kind === 'emanation' ? action.area.shape.radius : null,
    }))).toEqual([
      { featureEffectId: 'effect:action-area', cost: 'action', radius: 5 },
      { featureEffectId: 'effect:bonus-area', cost: 'bonus_action', radius: 10 },
    ]);

    const openingBonusAttack = initial.find((action) =>
      action.type === 'attack' && action.bonusActionGrantEffectId === 'effect:two-bonus-attacks');
    if (openingBonusAttack === undefined) throw new Error('Expected the opening bonus attack.');
    const continuingState = reduceEncounter(state, openingBonusAttack, () => 0.5).state;
    const continuing = legalActions(continuingState, actor.profile.id).actions.filter(
      (action) => action.type === 'attack' && action.bonusActionGrantEffectId === 'effect:two-bonus-attacks',
    );
    expect(continuing).toHaveLength(1);
    expect(legalActions(continuingState, actor.profile.id).actions
      .filter((action) => action.type === 'create_persistent_area')
      .map((action) => action.featureEffectId)).toEqual(['effect:action-area']);
    expect(continuingState.combatants[0]).toMatchObject({
      turn: {
        bonusActionAvailable: false,
        bonusAttacksRemaining: 1,
        bonusAttackGrantEffectId: 'effect:two-bonus-attacks',
      },
      limitedResources: [
        { id: 'resource:two-bonus-attacks', remaining: 0 },
        { id: 'resource:timed-mode-legal', remaining: 1 },
        { id: 'resource:bonus-area', remaining: 1 },
      ],
    });
  });

  it('offers short-rest healing from prepared and granted spell routes with exact cast details', () => {
    const candidate = structuredClone(pack());
    const member = candidate.members[0]!;
    const legacySource = objectSpellcasting(member);
    const { spellSlots: _legacySpellSlots, ...source } = legacySource;
    member.spellcasting = [{
      ...source,
      preparedSpellIds: ['cure-wounds'],
      knownSpellIds: [],
      grants: [{ spellId: 'healing-word', ability: 'wisdom' }],
    }];
    member.sharedSpellSlots = [];
    member.pactSpellSlots = [{ level: 1, count: 2, recharge: 'short_rest' }];
    const loaded = loadExternalPartyPack(candidate);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Healing-route fixture was refused.');
    const healer = loaded.party.members[0]!;
    const ally = loaded.party.members[2]!;
    let state = createEncounter({
      bounds: { columns: 4, rows: 2 },
      combatants: [healer.profile, ally.profile],
      tokens: [
        combatToken(healer.profile, { column: 0, row: 0 }),
        combatToken(ally.profile, { column: 1, row: 0 }),
      ],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    const wounded = {
      ...state,
      combatants: state.combatants.map((combatant) => combatant.profile.id === ally.profile.id
        ? { ...combatant, hitPoints: 10 }
        : combatant),
    };
    const healing = loadedPartyTurnLegalActions(loaded.party.members)(wounded, healer.profile.id).actions
      .flatMap((action) => action.type === 'cast_spell' &&
        (action.spellId === 'cure-wounds' || action.spellId === 'healing-word') ? [action] : []);
    expect(healing.map((action) => ({
      spellId: action.spellId,
      slotLevel: action.slotLevel,
      slotRecharge: action.slotRecharge,
      targets: action.targets,
      saveDc: action.saveDc,
      spellcastingModifier: action.spellcastingModifier,
    }))).toEqual([
      {
        spellId: 'cure-wounds', slotLevel: 1, slotRecharge: 'short_rest',
        targets: [ally.profile.id], saveDc: 15, spellcastingModifier: 3,
      },
      {
        spellId: 'healing-word', slotLevel: 1, slotRecharge: 'short_rest',
        targets: [ally.profile.id], saveDc: 12, spellcastingModifier: 0,
      },
    ]);
  });

  it('maps every optional object modification field into the executable world command', () => {
    const candidate = structuredClone(pack());
    candidate.members[0]!.worldOperations = [{
      operationId: 'world:modify-every-field',
      cost: 'action',
      operation: {
        kind: 'modify_object',
        objectId: 'object:mutable-wall',
        changes: {
          name: 'Reinforced Wall',
          kind: 'barrier',
          position: { column: 2, row: 3 },
          footprint: [{ column: 2, row: 3 }, { column: 3, row: 3 }],
          durability: { kind: 'hit_points', hitPoints: 7, maximumHitPoints: 9 },
          armorClass: 17,
          damageResponses: [{ damageTypeId: 'Fire', response: 'resistant' }],
          blocking: { movement: true, lineOfSight: false, cover: 'half' },
        },
      },
    }];
    const loaded = loadExternalPartyPack(candidate);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('World modification fixture was refused.');
    expect(loadedPartyWorldOperationCommand(
      loaded.party.members[0]!,
      'world:modify-every-field',
    )).toEqual({
      type: 'world_operation',
      actor: loaded.party.members[0]!.profile.id,
      cost: 'action',
      operation: {
        kind: 'modify_object',
        objectId: 'object:mutable-wall',
        changes: {
          name: 'Reinforced Wall',
          kind: 'barrier',
          position: { column: 2, row: 3 },
          footprint: [{ column: 2, row: 3 }, { column: 3, row: 3 }],
          durability: { kind: 'hit_points', hitPoints: 7, maximumHitPoints: 9 },
          armorClass: 17,
          damageResponses: [{ type: 'Fire', response: 'resistant' }],
          blocking: { movement: true, lineOfSight: false, cover: 'half' },
        },
      },
    });
    expect(() => loadedPartyWorldOperationCommand(
      loaded.party.members[0]!,
      'world:not-declared',
    )).toThrow('The party member does not declare world:not-declared.');
  });

  it('maps bounded damage dice and every persistent-area payload to exact engine values', () => {
    const boundedDice = {
      baseCount: 2, sides: 6 as const, modifier: 1,
      perSlotCount: 0, perSlotModifier: 0, cantripUpgrade: false,
      minimumTotal: 3, maximumTotal: 11,
    };
    const candidate = typedShapePack([{
      effectId: 'effect:bounded-operation', kind: 'damage_operation', trigger: 'action', saveDc: 14,
      delivery: { kind: 'save', ability: 'dexterity', rollMode: 'normal', onSuccess: 'half' },
      instancesPerTarget: 1,
      packets: [{
        damageType: { kind: 'fixed', damageType: 'Force' },
        dice: boundedDice, scaling: { kind: 'none' }, thresholdRider: null,
      }],
      timing: { kind: 'immediate' },
    }, {
      effectId: 'effect:bounded-rider', kind: 'armed_weapon_hit_rider', trigger: 'bonus_action', saveDc: 14,
      damage: {
        damageType: { kind: 'fixed', damageType: 'Fire' },
        dice: boundedDice, scaling: { kind: 'none' }, thresholdRider: null,
      },
      durationRounds: 1, concentration: false, persistence: 'consume_on_hit', saveGatedRider: null,
    }, {
      effectId: 'effect:payload-area', kind: 'persistent_area', trigger: 'action', origin: 'self',
      shape: { kind: 'cube', sizeFeet: 15 }, duration: { kind: 'rounds', rounds: 4 },
      targetFilter: 'all', difficultTerrain: false, movableFeet: null,
      hooks: [{
        hook: 'on_enter', frequency: 'every_trigger',
        effect: {
          kind: 'automatic',
          payload: {
            kind: 'damage',
            damage: [{ damageTypeId: 'Cold', count: 1, sides: 4, modifier: 2 }],
          },
        },
      }, {
        hook: 'on_start_of_turn_inside', frequency: 'once_per_turn',
        effect: {
          kind: 'automatic',
          payload: {
            kind: 'condition', conditionId: 'Prone', lifetime: { kind: 'while_inside' },
          },
        },
      }, {
        hook: 'on_end_of_turn_inside', frequency: 'once_per_turn',
        effect: {
          kind: 'automatic',
          payload: {
            kind: 'movement_modifier', speedDeltaFeet: -5,
            lifetime: { kind: 'area_duration' },
          },
        },
      }, {
        hook: 'on_exit', frequency: 'every_trigger',
        effect: {
          kind: 'save_gated', ability: 'wisdom', saveDc: 13, rollMode: 'normal', onSuccess: 'none',
          payload: {
            kind: 'armor_class_modifier', amount: -2,
            lifetime: { kind: 'fixed_rounds', rounds: 2, boundary: 'end' },
          },
        },
      }],
    }]);
    const loaded = loadExternalPartyPack(candidate);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Bounded mapper fixture was refused.');
    expect(loaded.party.members[0]!.effects[0]!.payload).toMatchObject({
      kind: 'damage_operation',
      packets: [{ dice: { baseCount: 2, minimumTotal: 3, maximumTotal: 11 } }],
    });
    expect(loaded.party.members[0]!.effects[1]!.payload).toMatchObject({
      kind: 'damage_rider',
      damage: { terms: [{ dice: { count: 2, minimumTotal: 3, maximumTotal: 11 } }] },
    });
    expect(loaded.party.members[0]!.effects[2]!.payload).toEqual({
      kind: 'persistent_area',
      area: {
        origin: 'self', movable: null,
        shape: { kind: 'cube', size: 15 },
        duration: { kind: 'rounds', remaining: 4 },
        targetFilter: { kind: 'all' }, difficultTerrain: false,
        hooks: [{
          hook: 'on_enter', frequency: 'every_trigger',
          effect: {
            kind: 'automatic',
            payload: {
              kind: 'damage',
              damage: {
                terms: [{ type: 'Cold', dice: { count: 1, sides: 4, modifier: 2 } }],
                critical: false, responses: [],
              },
            },
          },
        }, {
          hook: 'on_start_of_turn_inside', frequency: 'once_per_turn',
          effect: {
            kind: 'automatic',
            payload: {
              kind: 'effect', payload: { kind: 'condition', condition: 'Prone' },
              lifetime: { kind: 'while_inside' },
            },
          },
        }, {
          hook: 'on_end_of_turn_inside', frequency: 'once_per_turn',
          effect: {
            kind: 'automatic',
            payload: {
              kind: 'effect', payload: { kind: 'movement_modifier', speedDeltaFeet: -5 },
              lifetime: { kind: 'area_duration' },
            },
          },
        }, {
          hook: 'on_exit', frequency: 'every_trigger',
          effect: {
            kind: 'save_gated', ability: 'wisdom', dc: 13, rollMode: 'normal', onSuccess: 'none',
            payload: {
              kind: 'effect', payload: { kind: 'armor_class_modifier', amount: -2 },
              lifetime: { kind: 'fixed_rounds', rounds: 2, boundary: 'end' },
            },
          },
        }],
      },
    });
  });

  it('pins effect-command target, placement, resource, and automatic-trigger boundaries', () => {
    const candidate = typedShapePack([{
      effectId: 'effect:resource-temp-hp', kind: 'temporary_hit_points',
      trigger: 'bonus_action', resourcePoolId: 'resource:temp-hp', amount: 6,
    }, {
      effectId: 'effect:manual-condition', kind: 'condition_application',
      trigger: 'action', conditionId: 'Prone',
    }, {
      effectId: 'effect:selected-area', kind: 'persistent_area', trigger: 'action', origin: 'selected',
      shape: { kind: 'sphere', radiusFeet: 10 }, duration: { kind: 'rounds', rounds: 2 },
      targetFilter: 'enemies', difficultTerrain: false, movableFeet: 15, hooks: [],
    }, {
      effectId: 'effect:armed-boundary', kind: 'armed_weapon_hit_rider', trigger: 'bonus_action', saveDc: 12,
      damage: null, durationRounds: 1, concentration: false,
      persistence: 'consume_on_hit', saveGatedRider: null,
    }], [{ resourcePoolId: 'resource:temp-hp', maximum: 1, recharge: 'short_rest' }]);
    const loaded = loadExternalPartyPack(candidate);
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') throw new Error('Effect-command boundary fixture was refused.');
    const actor = loaded.party.members[0]!;
    const target = loaded.party.members[1]!.profile.id;
    expect(loadedPartyEffectCommand(actor, 'effect:resource-temp-hp', [target])).toEqual({
      type: 'grant_temporary_hit_points', actor: actor.profile.id, target, amount: 6,
      cost: 'bonus_action', resourcePoolId: 'resource:temp-hp',
    });
    expect(loadedPartyEffectCommand(actor, 'effect:manual-condition', [target])).toEqual({
      type: 'apply_effect', actor: actor.profile.id, cost: 'action',
      effect: {
        targets: [target], duration: { kind: 'permanent' }, concentration: false,
        stackingIdentity: 'feature:effect:manual-condition', stacking: 'replace_same_source',
        repeatedSave: null, payload: { kind: 'condition', condition: 'Prone' },
      },
    });
    expect(() => loadedPartyEffectCommand(actor, 'effect:resource-temp-hp', [])).toThrow(
      'Temporary Hit Points require exactly one target.',
    );
    expect(() => loadedPartyEffectCommand(actor, 'effect:resource-temp-hp', [target, target])).toThrow(
      'Temporary Hit Points require exactly one target.',
    );
    expect(() => loadedPartyEffectCommand(actor, 'effect:selected-area', [])).toThrow(
      'A selected persistent area requires an explicit board placement command.',
    );
    expect(() => loadedPartyEffectCommand(actor, 'effect:armed-boundary', [target])).toThrow(
      'Arming a weapon-hit rider does not select a target.',
    );
    expect(() => loadedPartyEffectCommand(actor, 'effect:not-declared', [])).toThrow(
      'The requested effect is not referenced by the loaded party member.',
    );
    expect(() => loadedPartyEffectCommand(actor, 'effect:manual-condition', [])).not.toThrow();
    expect(() => loadedPartyEffectCommand(actor, 'effect:armed-boundary', [])).not.toThrow();
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

    const zodKinds = zodFeatureEffectKinds(externalPartyPackFeatureEffectSchema);
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
