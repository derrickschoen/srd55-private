import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import type { CombatantProfile } from '../../../src/combat/combatant';
import { combatToken } from '../../../src/combat/combatant';
import { createEncounter, reduceEncounter } from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import { mulberry32 } from '../../../src/combat/random';
import { spellDefinition } from '../../../src/combat/spells/definitions';
import { SPELL_OPERATION_KINDS } from '../../../src/combat/spells/types';
import {
  codexSessionId,
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
  loadContentPack,
  loadContentPackBytes,
  type ContentPackLoadResult,
  type LoadedContentPack,
} from '../../../src/content/content-pack';
import { FEATURE_EFFECT_KINDS } from '../../../src/vtt/party-pack';
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

describe('content-pack v1', () => {
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
      spells: Array<{ sourceId: string; recordId: string }>;
    };
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
    expect(loadContentPack(candidate)).toEqual({
      status: 'refused',
      refusal: {
        kind: 'content_pack_refusal',
        reason: 'unknown_operation_kind',
        operationKind: 'wishful_default',
      },
    });
  });

  it('refuses an unknown party-pack effect variant without dropping it', () => {
    const candidate = fixture() as { features: Array<{ effects: Array<{ kind: string }> }> };
    candidate.features[0]!.effects[0]!.kind = 'untyped_glimmer';
    expect(loadContentPack(candidate)).toEqual({
      status: 'refused',
      refusal: {
        kind: 'content_pack_refusal',
        reason: 'unknown_effect_variant',
        effectKind: 'untyped_glimmer',
      },
    });
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
    expect(loadContentPack(malformed)).toEqual({
      status: 'refused',
      refusal: expect.objectContaining({ reason: 'malformed_record' }),
    });
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
    const content = loaded();
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
      codexSessionId: codexSessionId('codex:imported-content'),
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
  });

  it('pins schema operation/effect inventories bidirectionally to the runtime unions', () => {
    const schema = JSON.parse(readFileSync('docs/specs/content-pack.schema.json', 'utf8')) as {
      $defs: {
        spellOperation: { properties: { kind: { enum: string[] } }; oneOf: Array<{ $ref: string }> };
        featureEffect: { properties: { kind: { enum: string[] } }; oneOf: Array<{ $ref: string }> };
      };
    };
    const schemaOperationKinds = schema.$defs.spellOperation.properties.kind.enum;
    const operationRefs = schema.$defs.spellOperation.oneOf.map(({ $ref }) =>
      $ref.slice('#/$defs/operation-'.length));
    const schemaEffectKinds = schema.$defs.featureEffect.properties.kind.enum;
    const effectRefs = schema.$defs.featureEffect.oneOf.map(({ $ref }) =>
      $ref.slice('#/$defs/feature-'.length));
    expect(schemaOperationKinds).toEqual([...SPELL_OPERATION_KINDS]);
    expect(operationRefs).toEqual([...SPELL_OPERATION_KINDS]);
    expect(schemaEffectKinds).toEqual([...FEATURE_EFFECT_KINDS]);
    expect(effectRefs).toEqual([...FEATURE_EFFECT_KINDS]);
  });
});
