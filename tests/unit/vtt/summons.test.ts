import { readFileSync } from '../../helpers/test-filesystem';
import { describe, expect, it } from 'vitest';
import type { Controller, ControllerDecision, ControllerRequest } from '../../../src/combat/controllers';
import { ControllerRegistry } from '../../../src/combat/controllers';
import { TurnCoordinator } from '../../../src/combat/coordinator';
import {
  combatantsAreAllies,
  createEncounter,
  reduceEncounter,
  SUMMON_INITIATIVE_RULE,
  TargetSelectionRuleError,
  type EncounterState,
} from '../../../src/combat/encounter';
import type { SpellCastCommand } from '../../../src/combat/spells/types';
import { damageType, dieSides, type CombatantId } from '../../../src/combat/values';
import { loadContentPack, type LoadedContentPack } from '../../../src/content/content-pack';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

interface MutablePackFixture {
  spells: Array<Record<string, unknown>>;
  monsters: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

const summonOperation = (
  count: { readonly kind: 'fixed'; readonly count: number } | {
    readonly kind: 'slot_scaled'; readonly base: number; readonly additionalPerSlot: number;
  } = { kind: 'fixed', count: 1 },
) => ({
  kind: 'summon', monsterId: 'brassleaf-mote',
  count: count.kind === 'fixed' ? count : { ...count, limit: 'exact' },
  placementRangeFeet: 30,
  lifecycle: { concentration: true, durationRounds: 10, expiresAt: 'source_start' },
});

function fixture(): MutablePackFixture {
  return JSON.parse(readFileSync('tests/fixtures/content-pack-v1-homebrew.json', 'utf8')) as MutablePackFixture;
}

function packWithOperation(operation: unknown): ReturnType<typeof loadContentPack> {
  const source = fixture();
  const template = source.spells[0];
  if (template === undefined) throw new Error('Summon fixture spell template is missing.');
  source.spells = [{
    ...template,
    recordId: 'call-brassleaf',
    name: 'Call Brassleaf',
    level: 2,
    range: { kind: 'feet', feet: 30 },
    duration: { kind: 'rounds', rounds: 10 },
    concentration: true,
    targeting: { kind: 'utility', rangeFeet: 30 },
    operation,
  }];
  return loadContentPack(source);
}

function loadedPack(operation: unknown = summonOperation()): LoadedContentPack {
  const result = packWithOperation(operation);
  if (result.status !== 'loaded') throw new Error(`Summon pack refused: ${result.refusal.reason}`);
  expect(result.content.diagnostics).toEqual([]);
  return result.content;
}

function summonCommand(
  caster: ReturnType<typeof playerProfile>,
  destinations: NonNullable<SpellCastCommand['summonDestinations']>,
  slotLevel = 2,
): SpellCastCommand {
  return {
    type: 'cast_spell', actor: caster.id, spellId: 'greenforge:call-brassleaf',
    slotLevel, castAsRitual: false, casterLevel: 7, attackBonus: 7, saveDc: 15,
    spellcastingModifier: 4, targets: [], area: null, summonDestinations: destinations,
    weaponAttack: null, selectedOption: null,
  };
}

function started(
  content: LoadedContentPack,
  spellSlots: readonly { readonly level: 2 | 3; readonly maximum: number }[] = [{ level: 2, maximum: 2 }],
): { readonly caster: ReturnType<typeof playerProfile>; readonly enemy: ReturnType<typeof monsterProfile>; readonly state: EncounterState } {
  const caster = playerProfile('summoner', { initiativeBonus: 20, spellSlots });
  const enemy = monsterProfile('summon-enemy', { initiativeBonus: -20, hitPoints: 30 });
  const state = reduceEncounter(createEncounter({
    config: { initiativeMode: 'per_combatant' }, bounds: { columns: 12, rows: 2 },
    combatants: [caster, enemy], tokens: [placedToken(caster, 0), placedToken(enemy, 10)],
    contentPacks: [content],
  }), { type: 'roll_initiative' }, () => 0).state;
  return { caster, enemy, state };
}

function summonedId(state: EncounterState): CombatantId {
  const id = state.effects.flatMap((effect) => effect.ownedCombatants ?? [])[0];
  if (id === undefined) throw new Error('Expected an effect-owned summoned combatant.');
  return id;
}

describe('D348.1 imported summoned entities', () => {
  it('summon_skips_initiative: loads the pack statblock and inserts each upcast summon on the summoner count immediately after them', () => {
    // Giant Insect shares the caster's count and acts immediately after them:
    // docs/srd/source/spell-descriptions.txt:3714-3716.
    expect(SUMMON_INITIATIVE_RULE).toBe('summoner_count_immediately_after');
    const content = loadedPack(summonOperation({ kind: 'slot_scaled', base: 1, additionalPerSlot: 1 }));
    const fixtureState = started(content, [{ level: 3, maximum: 1 }]);
    const cast = reduceEncounter(fixtureState.state, summonCommand(fixtureState.caster, [
      { column: 6, row: 0 }, { column: 5, row: 1 },
    ], 3), () => 0).state;
    const summons = cast.effects.flatMap((effect) => effect.ownedCombatants ?? []);

    expect(summons).toHaveLength(2);
    expect(cast.initiative.map((entry) => entry.combatant)).toEqual([
      fixtureState.caster.id, ...summons, fixtureState.enemy.id,
    ]);
    expect(cast.initiative.slice(0, 3).map((entry) => ({ total: entry.total, slot: entry.slot })))
      .toEqual([{ total: 21, slot: 0 }, { total: 21, slot: 0 }, { total: 21, slot: 0 }]);
    for (const id of summons) {
      const summon = cast.combatants.find((entry) => entry.profile.id === id);
      expect(summon).toMatchObject({
        hitPoints: 9,
        profile: {
          name: 'Brassleaf Mote', statblockId: 'greenforge:brassleaf-mote',
          rules: { armorClass: 12, speed: 30 },
        },
      });
    }
  });

  it('summon_count_boundary_and_placement_edge: exact count and 30-foot edge place; one over and an illegal cell refuse atomically', () => {
    const content = loadedPack(summonOperation({ kind: 'fixed', count: 2 }));
    const fixtureState = started(content);
    const exact = reduceEncounter(fixtureState.state, summonCommand(fixtureState.caster, [
      { column: 6, row: 0 }, { column: 5, row: 1 },
    ]), () => 0);
    expect(exact.state.effects.flatMap((effect) => effect.ownedCombatants ?? [])).toHaveLength(2);

    expect(() => reduceEncounter(fixtureState.state, summonCommand(fixtureState.caster, [
      { column: 6, row: 0 }, { column: 5, row: 1 }, { column: 4, row: 1 },
    ]), () => 0)).toThrow(TargetSelectionRuleError);
    expect(() => reduceEncounter(fixtureState.state, summonCommand(fixtureState.caster, [
      { column: 7, row: 0 }, { column: 5, row: 1 },
    ]), () => 0)).toThrow('summon destination is out of range');
    expect(fixtureState.state.combatants).toHaveLength(2);
  });

  it('summon_survives_effect_end and despawn_leaves_corpse: concentration end removes a living summon and a dead summon corpse token', () => {
    const fixtureState = started(loadedPack());
    const cast = reduceEncounter(
      fixtureState.state,
      summonCommand(fixtureState.caster, [{ column: 6, row: 0 }]),
      () => 0,
    ).state;
    const summon = summonedId(cast);
    const dead = reduceEncounter(cast, {
      type: 'adjudicate', target: summon, subject: 'lethal test damage', reasoning: 'fixture',
      consequence: { kind: 'hit_point_delta', amount: -9 },
    }, () => 0.5).state;

    expect(dead.combatants.find((entry) => entry.profile.id === summon)?.life).toBe('dead');
    expect(dead.tokens.some((token) => token.combatantId === summon)).toBe(true);
    const despawned = reduceEncounter(dead, { type: 'end_concentration', actor: fixtureState.caster.id }, () => 0);
    expect(despawned.events).toContainEqual(expect.objectContaining({
      type: 'summoned_combatant_despawned', combatant: summon,
    }));
    expect(despawned.state.combatants.some((entry) => entry.profile.id === summon)).toBe(false);
    expect(despawned.state.tokens.some((token) => token.combatantId === summon)).toBe(false);
  });

  it('despawn_before_active_preserves_turn_identity_and_advances_to_the_next_combatant', () => {
    const caster = playerProfile('shift-summoner', {
      initiativeBonus: 20,
      spellSlots: [{ level: 2, maximum: 1 }],
    });
    const activeEnemy = monsterProfile('shift-active-enemy', { initiativeBonus: 0, hitPoints: 30 });
    const nextEnemy = monsterProfile('shift-next-enemy', { initiativeBonus: -10, hitPoints: 30 });
    let state = reduceEncounter(createEncounter({
      config: { initiativeMode: 'per_combatant' }, bounds: { columns: 12, rows: 2 },
      combatants: [caster, activeEnemy, nextEnemy],
      tokens: [placedToken(caster, 0), placedToken(activeEnemy, 10), placedToken(nextEnemy, 11)],
      contentPacks: [loadedPack()],
    }), { type: 'roll_initiative' }, () => 0).state;
    state = reduceEncounter(
      state,
      summonCommand(caster, [{ column: 6, row: 0 }]),
      () => 0,
    ).state;
    const summon = summonedId(state);
    state = reduceEncounter(state, { type: 'end_turn', actor: caster.id }, () => 0).state;
    state = reduceEncounter(state, { type: 'end_turn', actor: summon }, () => 0).state;
    expect(state.activeCombatant).toBe(activeEnemy.id);

    state = reduceEncounter(state, {
      type: 'force_save', actor: activeEnemy.id, target: caster.id,
      ability: 'dexterity', dc: 30, rollMode: 'normal',
      damage: {
        terms: [{ type: damageType('Force'), dice: { count: 0, sides: dieSides(4), modifier: 1 } }],
        critical: false, responses: [],
      },
      onSuccess: 'none', cost: 'none',
    }, () => 0).state;

    expect(state.initiative.map((entry) => entry.combatant)).toEqual([
      caster.id, activeEnemy.id, nextEnemy.id,
    ]);
    expect(state.activeCombatant).toBe(activeEnemy.id);

    state = reduceEncounter(state, { type: 'end_turn', actor: activeEnemy.id }, () => 0).state;
    expect(state.activeCombatant).toBe(nextEnemy.id);
  });

  it('distinguishing_despawn_vs_death_and_enemy_target: a summon is allied to its summoner, hostile to the enemy, and remains targetable after taking lethal damage', () => {
    const fixtureState = started(loadedPack());
    let state = reduceEncounter(
      fixtureState.state,
      summonCommand(fixtureState.caster, [{ column: 6, row: 0 }]),
      () => 0,
    ).state;
    const summon = summonedId(state);
    expect(combatantsAreAllies(state, fixtureState.caster.id, summon)).toBe(true);
    expect(combatantsAreAllies(state, fixtureState.enemy.id, summon)).toBe(false);

    state = reduceEncounter(state, { type: 'end_turn', actor: fixtureState.caster.id }, () => 0).state;
    state = reduceEncounter(state, { type: 'end_turn', actor: summon }, () => 0).state;
    state = reduceEncounter(state, {
      type: 'attack', actor: fixtureState.enemy.id, target: summon, attackBonus: 100,
      criticalFloor: 20, rollMode: 'normal', attackerCanSeeTarget: true, targetCanSeeAttacker: true,
      damage: {
        terms: [{ type: damageType('Force'), dice: { count: 0, sides: dieSides(4), modifier: 9 } }],
        critical: false, responses: [],
      },
    }, () => 0.5).state;
    expect(state.combatants.find((entry) => entry.profile.id === summon)?.life).toBe('dead');
    expect(state.tokens.some((token) => token.combatantId === summon)).toBe(true);
  });

  it('unknown_monster_id_summons: rejects only a summon spell whose monster id is absent and loads the rest of the pack', () => {
    const source = fixture();
    const healthy = source.spells[0];
    if (healthy === undefined) throw new Error('Healthy spell fixture is missing.');
    source.spells = [healthy, {
      ...healthy, recordId: 'missing-summon', name: 'Missing Summon', level: 2,
      targeting: { kind: 'utility', rangeFeet: 30 },
      operation: { ...summonOperation(), monsterId: 'absent-monster' },
    }];
    const result = loadContentPack(source);
    expect(result.status).toBe('loaded');
    if (result.status !== 'loaded') throw new Error('Record-isolated load unexpectedly refused the pack.');
    expect(result.content.spells.map((spell) => spell.recordId)).toEqual(['prism-pebble']);
    expect(result.content.monsters.map((monster) => monster.recordId)).toEqual(['brassleaf-mote']);
    expect(result.content.diagnostics).toContainEqual(expect.objectContaining({
      reason: 'missing_monster_reference', recordId: 'missing-summon',
      monsterId: 'greenforge:absent-monster',
    }));
  });

  it('summon_import_count_boundary: accepts 100 and rejects 101 without dropping healthy monster records', () => {
    expect(packWithOperation(summonOperation({ kind: 'fixed', count: 100 })).status).toBe('loaded');
    const over = packWithOperation(summonOperation({ kind: 'fixed', count: 101 }));
    expect(over.status).toBe('loaded');
    if (over.status !== 'loaded') throw new Error('One malformed spell should not refuse its pack.');
    expect(over.content.spells).toEqual([]);
    expect(over.content.monsters).toHaveLength(1);
    expect(over.content.diagnostics).toContainEqual(expect.objectContaining({ reason: 'malformed_record' }));
  });

  it('on_kill_spawn_refusal: names the excluded on-kill spawning shape instead of treating it as this summon operation', () => {
    const result = packWithOperation({
      kind: 'on_kill_spawn', monsterId: 'brassleaf-mote', trigger: 'creature_killed',
    });
    expect(result.status).toBe('loaded');
    if (result.status !== 'loaded') throw new Error('Excluded operation should reject its record only.');
    expect(result.content.diagnostics).toContainEqual(expect.objectContaining({
      reason: 'on-kill-spawn-not-modelled', recordId: 'call-brassleaf',
    }));
  });

  it('summoner_controller_seam: the summoned turn is requested from the exact controller that cast the spell', async () => {
    class RecordingController implements Controller {
      readonly actors: CombatantId[] = [];
      choose(request: ControllerRequest): Promise<ControllerDecision> {
        this.actors.push(request.actorId);
        const action = request.legalActions.actions[0];
        if (action === undefined) throw new Error('Recording controller received no legal action.');
        return Promise.resolve({
          requestId: request.requestId,
          encounterRevision: request.encounterRevision,
          action,
        });
      }
    }

    const fixtureState = started(loadedPack());
    const summonerController = new RecordingController();
    const enemyController = new RecordingController();
    const registry = new ControllerRegistry([
      { combatantId: fixtureState.caster.id, controller: summonerController, controllerId: 'controller:summoner' },
      { combatantId: fixtureState.enemy.id, controller: enemyController, controllerId: 'controller:enemy' },
    ]);
    const cast = summonCommand(fixtureState.caster, [{ column: 6, row: 0 }]);
    const coordinator = new TurnCoordinator(fixtureState.state, registry, () => 0, {
      turnLegalActions: (state, actor) => ({ actions:
        actor === fixtureState.caster.id && state.effects.length === 0
          ? [cast]
          : [{ type: 'end_turn', actor }],
      }),
    });

    expect((await coordinator.step()).kind).toBe('applied');
    expect((await coordinator.step()).kind).toBe('applied');
    const summon = summonedId(coordinator.state());
    expect((await coordinator.step()).kind).toBe('applied');
    expect(summonerController.actors).toEqual([fixtureState.caster.id, fixtureState.caster.id, summon]);
    expect(registry.identities().find((identity) => identity.combatantId === summon)?.controllerId)
      .toBe('controller:summoner');
  });
});
