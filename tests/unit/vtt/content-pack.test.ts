import { readFileSync } from '../../helpers/test-filesystem';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { canonicalJson } from '../../../src/commands/canonical-json';
import type { CombatantProfile } from '../../../src/combat/combatant';
import { combatToken } from '../../../src/combat/combatant';
import { combatantConditions, createEncounter, reduceEncounter } from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import { mulberry32 } from '../../../src/combat/random';
import { spellDefinition } from '../../../src/combat/spells/definitions';
import { SPELL_OPERATION_KINDS } from '../../../src/combat/spells/types';
import {
  damageType,
  dieSides,
  encounterBranchId,
  encounterSessionId,
} from '../../../src/combat/values';
import {
  featureEffectsForCombatant,
  importedContentId,
  importedMonsterAttackCommand,
  importedMonsterProfile,
  publishedContentPackV1Schema,
  loadContentPack,
  loadContentPackBytes,
  type ContentPackLoadResult,
  type LoadedContentPack,
} from '../../../src/content/content-pack';
import {
  MAX_IMPORTED_DICE_COUNT,
  MAX_IMPORTED_SPEED_FEET,
  operationSchemas,
} from '../../../src/content/content-pack-operation-schema';
import {
  EncounterSessionJournal,
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
  exportSavedSession,
  importSavedSession,
} from '../../../src/vtt/session-persistence';
import type { PersistedCoordinatorState } from '../../../src/combat/coordinator';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

const FIXTURE_PATH = 'tests/fixtures/content-pack-v1-homebrew.json';
const INITIAL_COORDINATOR_STATE: PersistedCoordinatorState = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' },
  pause: null,
};

function fixture(): unknown {
  return JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as unknown;
}

function loaded(result: ContentPackLoadResult = loadContentPack(fixture())): LoadedContentPack {
  if (result.status !== 'loaded') throw new Error(`Fixture was refused: ${result.refusal.reason}`);
  return result.content;
}

function addHealthySpell(candidate: { spells: Array<{ recordId: string; name: string }> }): void {
  const source = fixture() as { spells: Array<{ recordId: string; name: string }> };
  const healthy = source.spells[0];
  if (healthy === undefined) throw new Error('Fixture spell is missing.');
  candidate.spells.push({ ...healthy, recordId: 'healthy-control', name: 'Healthy Control' });
}

function rejectedRecord(
  result: ContentPackLoadResult,
  reason: LoadedContentPack['diagnostics'][number]['reason'],
): LoadedContentPack {
  const content = loaded(result);
  expect(content.diagnostics).toContainEqual(expect.objectContaining({ reason }));
  return content;
}

function withImportedFeature(
  profile: CombatantProfile,
  content: LoadedContentPack,
): CombatantProfile {
  const feature = content.features[0];
  if (feature === undefined) throw new Error('Fixture feature is missing.');
  return {
    ...profile,
    rules: {
      ...profile.rules,
      featureEffects: featureEffectsForCombatant([feature], 3),
      limitedResources: feature.resources.map((resource) => ({
        id: resource.id,
        maximum: resource.maximum,
        recharge: resource.recharge,
      })),
    },
  };
}

function importedSpellCommand(
  actor: CombatantProfile,
  target: CombatantProfile,
): EncounterCommand {
  return {
    type: 'cast_spell',
    actor: actor.id,
    spellId: 'greenforge:prism-pebble',
    slotLevel: 1,
    castAsRitual: false,
    casterLevel: 3,
    attackBonus: 100,
    saveDc: 13,
    spellcastingModifier: 3,
    targets: [target.id],
    area: null,
    weaponAttack: null,
    selectedOption: null,
  };
}

function expectHealthyControlExecutes(content: LoadedContentPack): void {
  const caster = playerProfile('healthy-control-caster', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }] });
  const target = monsterProfile('healthy-control-target', { initiativeBonus: -20, hitPoints: 20 });
  let state = createEncounter({
    bounds: { columns: 8, rows: 2 }, combatants: [caster, target],
    tokens: [placedToken(caster, 0), placedToken(target, 4)], contentPacks: [content],
  });
  state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
  const command = { ...importedSpellCommand(caster, target), spellId: 'greenforge:healthy-control' };
  const cast = reduceEncounter(state, command, () => 0.5);
  expect(cast.events).toContainEqual(expect.objectContaining({ type: 'spell_cast', spellId: 'greenforge:healthy-control' }));
  expect(cast.state.combatants.find(({ profile }) => profile.id === target.id)?.hitPoints).toBe(16);
}

describe('content-pack v1', () => {
  it('fallback_resurrected: every closed operation kind has an explicit schema and no key-presence fallback', () => {
    expect(Object.keys(operationSchemas)).toEqual([...SPELL_OPERATION_KINDS]);
    for (const kind of SPELL_OPERATION_KINDS) {
      expect(operationSchemas[kind]).toBeDefined();
    }
    const candidate = fixture() as { spells: Array<{ operation: unknown }> };
    candidate.spells[0]!.operation = {
      kind: 'attack_damage', attackKind: 'ranged', damageType: 'Thunder', dice: null, rider: null,
    };
    const content = loaded(loadContentPack(candidate));
    expect(content.spells).toEqual([]);
    expect(content.diagnostics).toContainEqual(expect.objectContaining({
      reason: 'malformed_record', operationKind: 'attack_damage',
      path: ['spells', 0, 'operation', 'dice'],
    }));
  });

  it('record_rejection_kills_pack: attack damage null dice and invalid conditions reject only their records and execute the healthy record', () => {
    const candidate = fixture() as {
      spells: Array<{ recordId: string; name: string; operation: unknown }>;
    };
    candidate.spells[0]!.operation = {
      kind: 'attack_damage', attackKind: 'ranged', damageType: 'Thunder', dice: null, rider: null,
    };
    addHealthySpell(candidate);
    candidate.spells.push({
      ...(candidate.spells[1] ?? candidate.spells[0]!),
      recordId: 'invalid-condition', name: 'Invalid Condition',
      operation: {
        kind: 'condition_lifecycle', condition: 'Dreambound', immunity: null,
        initialSave: null, repeatedSave: null, damageBreak: null,
        duration: { kind: 'fixed_rounds', rounds: 1, expiresAt: 'target_end' },
        stacking: { kind: 'coexist' },
      },
    });

    const content = loaded(loadContentPack(candidate));
    expect(content.diagnostics).toEqual([
      expect.objectContaining({
        reason: 'malformed_record', recordId: 'prism-pebble', operationKind: 'attack_damage',
        path: ['spells', 0, 'operation', 'dice'],
      }),
      expect.objectContaining({
        reason: 'malformed_record', recordId: 'invalid-condition', operationKind: 'condition_lifecycle',
        path: ['spells', 2, 'operation', 'condition'],
      }),
    ]);
    expect(content.spells.map(({ recordId }) => recordId)).toEqual(['healthy-control']);
    expectHealthyControlExecutes(content);
  });

  it.each([
    ['minimum below', 0, false],
    ['minimum at', 1, true],
    ['maximum at', MAX_IMPORTED_DICE_COUNT, true],
    ['maximum above', MAX_IMPORTED_DICE_COUNT + 1, false],
  ] as const)('imported dice count boundary: %s', (_label, baseCount, accepted) => {
    const candidate = fixture() as {
      spells: Array<{ recordId: string; name: string; operation: { dice: { baseCount: number } } }>;
    };
    candidate.spells[0]!.operation.dice.baseCount = baseCount;
    addHealthySpell(candidate);
    const content = loaded(loadContentPack(candidate));
    expect(content.spells.some(({ recordId }) => recordId === 'prism-pebble')).toBe(accepted);
    expect(content.diagnostics.some(({ recordId }) => recordId === 'prism-pebble')).toBe(!accepted);
    expect(content.spells.some(({ recordId }) => recordId === 'healthy-control')).toBe(true);
  });

  it('monster action damage null rejects the monster record while a healthy monster imports and executes', () => {
    const candidate = fixture() as {
      monsters: Array<{
        recordId: string;
        name: string;
        actions: Array<{ damage: unknown[]; onHit: unknown[] }>;
      }>;
    };
    const healthy = structuredClone(candidate.monsters[0]);
    if (healthy === undefined) throw new Error('Fixture monster is missing.');
    healthy.recordId = 'healthy-monster';
    healthy.name = 'Healthy Monster';
    healthy.actions[0]!.onHit = [{
      kind: 'condition', condition: 'Prone', trigger: { kind: 'always' },
      target: { maximumSize: null, excludedKinds: [] }, savingThrow: null,
      escapeDc: null, duration: 'until_end_of_target_next_turn',
    }];
    candidate.monsters.push(healthy);
    candidate.monsters[0]!.actions[0]!.damage = [null];
    const content = loaded(loadContentPack(candidate));
    expect(content.diagnostics).toContainEqual(expect.objectContaining({
      reason: 'malformed_record', recordId: 'brassleaf-mote',
      path: ['monsters', 0, 'actions', 0, 'damage', 0],
    }));
    expect(content.monsters.map(({ recordId }) => recordId)).toEqual(['healthy-monster']);
    const monster = content.monsters[0];
    if (monster === undefined) throw new Error('Healthy monster did not import.');
    const enemy = importedMonsterProfile(monster, {
      combatantId: 'combatant:healthy-monster', tokenId: 'token:healthy-monster',
    });
    const target = playerProfile('healthy-monster-target', { initiativeBonus: -20, hitPoints: 20 });
    let state = createEncounter({
      bounds: { columns: 4, rows: 2 }, combatants: [enemy, target],
      tokens: [combatToken(enemy, { column: 0, row: 0 }), placedToken(target, 1)],
      contentPacks: [content],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    state = reduceEncounter(
      state,
      importedMonsterAttackCommand(monster, 'attack:brassleaf-tap', enemy.id, target.id),
      () => 0.5,
    ).state;
    expect(state.combatants.find(({ profile }) => profile.id === target.id)?.hitPoints).toBe(15);
    expect(combatantConditions(state, target.id)).toContainEqual({ name: 'Prone' });
  });

  it('namespace_not_enforced: an undeclared source namespace rejects only that record and executes the declared healthy record', () => {
    const candidate = fixture() as {
      spells: Array<{ sourceId: string; recordId: string; name: string }>;
    };
    candidate.spells[0]!.sourceId = 'outside';
    candidate.spells[0]!.recordId = 'outside-record';
    addHealthySpell(candidate);
    const content = loaded(loadContentPack(candidate));
    expect(content.diagnostics).toContainEqual(expect.objectContaining({
      reason: 'undeclared_namespace', recordId: 'outside-record', namespace: 'outside',
      path: ['spells', 0, 'sourceId'],
    }));
    expect(content.spells.map(({ recordId }) => recordId)).toEqual(['healthy-control']);
    expectHealthyControlExecutes(content);
  });

  it('speed_bound_bypassed: speed at the import cap reaches movement state and one over rejects only that monster', () => {
    const atCap = fixture() as { monsters: Array<{ statblock: { speedFeet: number } }> };
    atCap.monsters[0]!.statblock.speedFeet = MAX_IMPORTED_SPEED_FEET;
    const capContent = loaded(loadContentPack(atCap));
    const cappedMonster = capContent.monsters[0];
    if (cappedMonster === undefined) throw new Error('Monster at speed cap did not import.');
    const cappedProfile = importedMonsterProfile(cappedMonster, { combatantId: 'combatant:capped', tokenId: 'token:capped' });
    expect(cappedProfile.rules.speed).toBe(MAX_IMPORTED_SPEED_FEET);

    const over = fixture() as {
      monsters: Array<{ recordId: string; name: string; statblock: { speedFeet: number } }>;
    };
    const healthy = structuredClone(over.monsters[0]);
    if (healthy === undefined) throw new Error('Fixture monster is missing.');
    healthy.recordId = 'healthy-monster';
    healthy.name = 'Healthy Monster';
    over.monsters.push(healthy);
    over.monsters[0]!.statblock.speedFeet = MAX_IMPORTED_SPEED_FEET + 1;
    const overContent = loaded(loadContentPack(over));
    expect(overContent.diagnostics).toContainEqual(expect.objectContaining({
      reason: 'malformed_record', recordId: 'brassleaf-mote',
      path: ['monsters', 0, 'statblock', 'speedFeet'],
    }));
    expect(overContent.monsters.map(({ recordId }) => recordId)).toEqual(['healthy-monster']);
  });
  it('refuses malformed additional-damage and armed-rider operation shapes', () => {
    const damage = fixture() as { spells: Array<{ operation: unknown }> };
    damage.spells[0]!.operation = {
      kind: 'damage_operation', delivery: { kind: 'automatic' }, instancesPerTarget: 1,
      packets: [{
        damageType: { kind: 'fixed', damageType: 'Cold' },
        dice: {
          baseCount: 1, sides: 6, modifier: 0, perSlotCount: 0,
          perSlotModifier: 0, cantripUpgrade: false,
          rerollBelow: { threshold: 7, maximumRerollsPerDie: 1 },
        },
        scaling: { kind: 'none' }, thresholdRider: null,
      }],
      timing: { kind: 'immediate' },
    };
    addHealthySpell(damage as unknown as { spells: Array<{ recordId: string; name: string }> });
    const damageContent = rejectedRecord(loadContentPack(damage), 'malformed_record');
    expect(damageContent.diagnostics[0]).toMatchObject({
      recordId: 'prism-pebble', operationKind: 'damage_operation',
      path: ['spells', 0, 'operation', 'packets', 0, 'dice'],
    });
    expect(damageContent.spells.map(({ recordId }) => recordId)).toEqual(['healthy-control']);

    const armed = fixture() as { spells: Array<{ operation: unknown }> };
    armed.spells[0]!.operation = {
      kind: 'armed_weapon_hit_rider', damage: null, durationRounds: 1,
      concentration: false, persistence: 'consume_on_hit',
      saveGatedRider: {
        ability: 'wisdom', rollMode: 'normal', condition: 'not-a-condition',
        durationRounds: 1, expiresAt: 'target_end',
      },
    };
    addHealthySpell(armed as unknown as { spells: Array<{ recordId: string; name: string }> });
    const armedContent = rejectedRecord(loadContentPack(armed), 'malformed_record');
    expect(armedContent.diagnostics[0]).toMatchObject({ recordId: 'prism-pebble', operationKind: 'armed_weapon_hit_rider' });
    expect(armedContent.spells.map(({ recordId }) => recordId)).toEqual(['healthy-control']);
  });

  it('loads a typed persistent-area spell operation and refuses malformed nested area specs', () => {
    const operation = {
      kind: 'persistent_area', origin: 'anchored_to_caster',
      shape: { kind: 'emanation', radius: 10 }, durationRounds: 10, concentration: true,
      targetFilter: 'enemies', includeOwner: false, difficultTerrain: false, movableFeet: null,
      hooks: [{
        hook: 'on_start_of_turn_inside', frequency: 'once_per_turn',
        effect: {
          kind: 'save_gated', ability: 'wisdom', rollMode: 'normal', onSuccess: 'none',
          payload: { kind: 'effect', payload: { kind: 'condition', condition: 'Frightened' }, lifetime: { kind: 'save_ends', boundary: 'end' } },
        },
      }],
      initialEffects: [],
    };
    const candidate = fixture() as { spells: Array<{ operation: unknown }> };
    candidate.spells[0]!.operation = operation;
    const result = loadContentPack(candidate);
    expect(result.status).toBe('loaded');
    if (result.status !== 'loaded') throw new Error('Typed persistent-area operation was refused.');
    expect(result.content.spells[0]?.definition.operation).toEqual(operation);

    const malformed = structuredClone(candidate) as {
      spells: Array<{ operation: { hooks: Array<{ effect: { payload: { lifetime?: unknown } } }> } }>;
    };
    delete malformed.spells[0]!.operation.hooks[0]!.effect.payload.lifetime;
    addHealthySpell(malformed as unknown as { spells: Array<{ recordId: string; name: string }> });
    const malformedContent = rejectedRecord(loadContentPack(malformed), 'malformed_record');
    expect(malformedContent.diagnostics[0]?.path).toEqual([
      'spells', 0, 'operation', 'hooks', 0, 'effect', 'payload', 'lifetime',
    ]);
    expect(malformedContent.spells.map(({ recordId }) => recordId)).toEqual(['healthy-control']);
  });

  it('loads typed spell world operations and refuses malformed object durability', () => {
    const operation = {
      kind: 'world_operations',
      operations: [{
        kind: 'create_object', placement: 'area_origin',
        footprintOffsets: [{ column: 0, row: 0 }],
        object: {
          name: 'Greenforge Glass Wall', kind: 'barrier',
          durability: { kind: 'hit_points', hitPoints: 12, maximumHitPoints: 12 },
          armorClass: 13,
          damageResponses: [{ type: 'Cold', response: 'resistant' }],
          blocking: { movement: true, lineOfSight: true, cover: 'total' },
        },
      }, {
        kind: 'transform_terrain', regionId: 'greenforge-mire', difficultTerrain: true,
      }, {
        kind: 'set_light_level', regionId: 'greenforge-gloom', level: 'dim',
      }, {
        kind: 'modify_objects', changes: {
          blocking: { movement: false, lineOfSight: false, cover: 'half' },
        },
      }, {
        kind: 'damage_objects', damage: {
          terms: [{ type: 'Force', dice: { count: 1, sides: 6, modifier: 0 } }],
          critical: false, responses: [],
        },
      }],
    };
    const candidate = fixture() as { spells: Array<{ operation: unknown }> };
    candidate.spells[0]!.operation = operation;
    const result = loadContentPack(candidate);
    expect(result.status).toBe('loaded');
    if (result.status !== 'loaded') throw new Error('Typed world operations were refused.');
    expect(result.content.spells[0]?.definition.operation).toEqual(operation);

    const malformed = structuredClone(candidate) as {
      spells: Array<{ operation: { operations: Array<{ object?: { durability?: { hitPoints: number; maximumHitPoints: number } } }> } }>;
    };
    const durability = malformed.spells[0]!.operation.operations[0]!.object?.durability;
    if (durability === undefined) throw new Error('Malformed fixture has no durability.');
    durability.hitPoints = durability.maximumHitPoints + 1;
    addHealthySpell(malformed as unknown as { spells: Array<{ recordId: string; name: string }> });
    const malformedContent = rejectedRecord(loadContentPack(malformed), 'malformed_record');
    expect(malformedContent.diagnostics[0]?.path).toEqual([
      'spells', 0, 'operation', 'operations', 0, 'object', 'durability', 'hitPoints',
    ]);
    expect(malformedContent.spells.map(({ recordId }) => recordId)).toEqual(['healthy-control']);
  });

  it('loads original homebrew examples for every executable content kind with surfaced provenance', () => {
    const content = loaded();
    expect(content.provenance).toEqual({
      sourceName: 'Greenforge Sampler',
      sourceKind: 'homebrew',
      importedAt: '2026-08-21T12:00:00Z',
    });
    expect({
      spells: content.spells.map(({ id }) => id),
      features: content.features.map(({ id }) => id),
      species: content.species.map(({ id }) => id),
      backgrounds: content.backgrounds.map(({ id }) => id),
      subclasses: content.subclasses.map(({ id }) => id),
      monsters: content.monsters.map(({ id }) => id),
    }).toEqual({
      spells: ['greenforge:prism-pebble'],
      features: ['greenforge:mossglass-edge'],
      species: ['greenforge:cloudstep-kin'],
      backgrounds: ['greenforge:lantern-keeper'],
      subclasses: ['greenforge:weathered-path'],
      monsters: ['greenforge:brassleaf-mote'],
    });
    expect(content.subclasses[0]?.featureSets[0]?.featureIds).toEqual([
      'greenforge:mossglass-edge',
    ]);
  });

  it('casts an imported spell end-to-end in a synthetic encounter', () => {
    const content = loaded();
    const caster = playerProfile('import-caster', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }] });
    const target = monsterProfile('import-target', { initiativeBonus: -20, hitPoints: 20 });
    let state = createEncounter({
      bounds: { columns: 8, rows: 2 },
      combatants: [caster, target],
      tokens: [placedToken(caster, 0), placedToken(target, 4)],
      contentPacks: [content],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    const cast = reduceEncounter(state, importedSpellCommand(caster, target), () => 0.5);
    expect(cast.events).toContainEqual(expect.objectContaining({
      type: 'spell_cast',
      spellId: 'greenforge:prism-pebble',
    }));
    expect(cast.state.combatants.find(({ profile }) => profile.id === target.id)?.hitPoints).toBe(16);
  });

  it('fires an imported feature rider through the ordinary attack reducer', () => {
    const content = loaded();
    const attacker = withImportedFeature(
      playerProfile('import-rider', { initiativeBonus: 20 }),
      content,
    );
    const target = monsterProfile('rider-target', { initiativeBonus: -20, hitPoints: 20 });
    let state = createEncounter({
      bounds: { columns: 4, rows: 2 },
      combatants: [attacker, target],
      tokens: [placedToken(attacker, 0), placedToken(target, 1)],
      contentPacks: [content],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    const attack = reduceEncounter(state, {
      type: 'attack',
      actor: attacker.id,
      target: target.id,
      attackBonus: 100,
      criticalFloor: 20,
      rollMode: 'normal',
      attackerCanSeeTarget: true,
      targetCanSeeAttacker: true,
      damage: {
        terms: [{ type: damageType('Bludgeoning'), dice: { count: 0, sides: dieSides(6), modifier: 0 } }],
        critical: false,
        responses: [],
      },
    }, () => 0.5);
    expect(attack.state.combatants.find(({ profile }) => profile.id === target.id)?.hitPoints).toBe(17);
  });

  it('runs an imported monster through a complete combat round', () => {
    const content = loaded();
    const monster = content.monsters[0];
    if (monster === undefined) throw new Error('Fixture monster is missing.');
    const enemy = importedMonsterProfile(monster, {
      combatantId: 'combatant:brassleaf-mote',
      tokenId: 'token:brassleaf-mote',
    });
    const target = playerProfile('monster-target', { initiativeBonus: -20, hitPoints: 20 });
    let state = createEncounter({
      bounds: { columns: 4, rows: 2 },
      combatants: [enemy, target],
      tokens: [combatToken(enemy, { column: 0, row: 0 }), placedToken(target, 1)],
      contentPacks: [content],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    state = reduceEncounter(
      state,
      importedMonsterAttackCommand(monster, 'attack:brassleaf-tap', enemy.id, target.id),
      () => 0.5,
    ).state;
    state = reduceEncounter(state, { type: 'end_turn', actor: enemy.id }, () => 0.5).state;
    state = reduceEncounter(state, { type: 'end_turn', actor: target.id }, () => 0.5).state;
    expect(state.round).toBe(2);
    expect(state.combatants.find(({ profile }) => profile.id === target.id)?.hitPoints).toBe(15);
  });

  it('refuses an id collision with an existing namespaced SRD id', () => {
    const candidate = fixture() as {
      namespaces: string[];
      spells: Array<{ sourceId: string; recordId: string }>;
    };
    candidate.namespaces.push('srd');
    candidate.spells[0] = { ...candidate.spells[0]!, sourceId: 'srd', recordId: 'cure-wounds' };
    expect(loadContentPack(candidate)).toEqual({
      status: 'refused',
      refusal: {
        kind: 'content_pack_refusal',
        reason: 'id_collision',
        id: 'srd:cure-wounds',
      },
    });
  });

  it('unknown_operation_coerced refuses rather than mapping an unknown operation to a default', () => {
    const candidate = fixture() as { spells: Array<{ operation: { kind: string } }> };
    candidate.spells[0]!.operation.kind = 'wishful_default';
    addHealthySpell(candidate as unknown as { spells: Array<{ recordId: string; name: string }> });
    const content = rejectedRecord(loadContentPack(candidate), 'unknown_operation_kind');
    expect(content.diagnostics[0]).toMatchObject({
      recordId: 'prism-pebble', operationKind: 'wishful_default',
      unknownOperationKind: 'wishful_default', path: ['spells', 0, 'operation', 'kind'],
    });
    expect(content.spells.map(({ recordId }) => recordId)).toEqual(['healthy-control']);
  });

  it('refuses an unknown party-pack effect variant without dropping it', () => {
    const candidate = fixture() as { features: Array<{ effects: Array<{ kind: string }> }> };
    candidate.features[0]!.effects[0]!.kind = 'untyped_glimmer';
    const content = rejectedRecord(loadContentPack(candidate), 'unknown_effect_variant');
    expect(content.diagnostics[0]).toMatchObject({
      recordId: 'mossglass-edge', effectKind: 'untyped_glimmer',
      path: ['features', 0, 'effects', 'kind'],
    });
    expect(content.spells.map(({ recordId }) => recordId)).toEqual(['prism-pebble']);
  });

  it('provenance_optional refuses a pack whose provenance block is absent', () => {
    const candidate = fixture() as { provenance?: unknown };
    delete candidate.provenance;
    expect(loadContentPack(candidate)).toEqual({
      status: 'refused',
      refusal: { kind: 'content_pack_refusal', reason: 'missing_provenance' },
    });
  });

  it('refuses version mismatches, malformed records, and malformed JSON distinctly', () => {
    const version = fixture() as { schemaVersion: number };
    version.schemaVersion = 2;
    expect(loadContentPack(version)).toEqual({
      status: 'refused',
      refusal: { kind: 'content_pack_refusal', reason: 'version_mismatch', receivedVersion: 2 },
    });
    const malformed = fixture() as { spells: Array<{ name?: string }> };
    delete malformed.spells[0]!.name;
    const malformedContent = rejectedRecord(loadContentPack(malformed), 'malformed_record');
    expect(malformedContent.diagnostics[0]).toMatchObject({ recordId: 'prism-pebble', path: ['spells', 0, 'name'] });
    expect(malformedContent.features.map(({ recordId }) => recordId)).toEqual(['mossglass-edge']);
    expect(loadContentPackBytes('{')).toEqual({
      status: 'refused',
      refusal: { kind: 'content_pack_refusal', reason: 'invalid_json' },
    });
  });

  it('import_collides_with_srd keeps the namespace and cannot shadow an SRD spell', () => {
    const candidate = fixture() as {
      spells: Array<{ sourceId: string; recordId: string; name: string }>;
    };
    candidate.spells[0] = {
      ...candidate.spells[0]!,
      sourceId: 'greenforge',
      recordId: 'cure-wounds',
      name: 'Greenforge Cure',
    };
    const content = loaded(loadContentPack(candidate));
    expect(content.spells[0]?.id).toBe('greenforge:cure-wounds');
    expect(importedContentId('greenforge', 'cure-wounds')).toBe('greenforge:cure-wounds');
    expect(spellDefinition('cure-wounds')?.name).toBe('Cure Wounds');
  });

  it('imported_content_missing_from_replay reconstructs imported records byte-exactly', () => {
    const replayCandidate = fixture() as { spells: Array<{ operation: unknown }> };
    replayCandidate.spells[0]!.operation = {
      kind: 'damage_operation',
      delivery: { kind: 'automatic' },
      instancesPerTarget: 2,
      packets: [{
        damageType: { kind: 'conversion', from: 'Thunder', to: 'Force' },
        dice: {
          baseCount: 1, sides: 4, modifier: 0, perSlotCount: 0,
          perSlotModifier: 0, cantripUpgrade: false,
          minimumTotal: 2, maximumTotal: 4,
          rerollBelow: { threshold: 2, maximumRerollsPerDie: 1 },
        },
        scaling: { kind: 'target_missing_hit_points', hitPointsPerAdditionalDie: 10, maximumAdditionalDice: 2 },
        thresholdRider: null,
      }],
      timing: { kind: 'immediate' },
    };
    const content = loaded(loadContentPack(replayCandidate));
    const caster = playerProfile('replay-import-caster', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }] });
    const target = monsterProfile('replay-import-target', { initiativeBonus: -20, hitPoints: 20 });
    const rng = mulberry32(0x330);
    const initial = reduceEncounter(createEncounter({
      bounds: { columns: 8, rows: 2 },
      combatants: [caster, target],
      tokens: [placedToken(caster, 0), placedToken(target, 4)],
      contentPacks: [content],
    }), { type: 'roll_initiative' }, rng).state;
    const sourceStore = new MemoryBrowserSessionStore();
    const journal = EncounterSessionJournal.create({
      sessionId: encounterSessionId('session:imported-content'),
      branchId: encounterBranchId('branch:main'),
      encounterState: initial,
      coordinatorState: INITIAL_COORDINATOR_STATE,
      controllers: [],
      rng,
      store: sourceStore,
      mirror: new MemoryMirrorSink(),
    });
    const command = importedSpellCommand(caster, target);
    const reduction = reduceEncounter(initial, command, journal.rng());
    journal.record({
      transition: { kind: 'reducer_applied', command, events: reduction.events },
      encounterState: reduction.state,
      coordinatorState: INITIAL_COORDINATOR_STATE,
      controllers: [],
    });
    const bytes = exportSavedSession(sourceStore, encounterSessionId('session:imported-content'));
    const restoredStore = new MemoryBrowserSessionStore();
    importSavedSession(restoredStore, bytes);
    const restored = EncounterSessionJournal.resume(
      encounterSessionId('session:imported-content'),
      restoredStore,
      new MemoryMirrorSink(),
    );
    expect(canonicalJson(restored.encounterState)).toBe(canonicalJson(reduction.state));
    expect(canonicalJson(restored.encounterState.contentPacks?.[0]?.pack)).toBe(
      canonicalJson(content.pack),
    );
    expect(bytes).toContain('greenforge:prism-pebble');
    expect(bytes).toContain('damage_operation');
  });

  it('keeps the published JSON schema generated byte-for-value from the runtime Zod contract', () => {
    const published = JSON.parse(readFileSync('docs/specs/content-pack.schema.json', 'utf8')) as unknown;
    const generated = z.toJSONSchema(publishedContentPackV1Schema, {
      target: 'draft-2020-12',
      unrepresentable: 'any',
    });
    expect(published).toEqual(generated);
  });
});
