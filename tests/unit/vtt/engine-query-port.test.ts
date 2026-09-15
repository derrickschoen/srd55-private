import { describe, expect, it } from 'vitest';
import { canCombatantSee, createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import { traceCombatantLine } from '../../../src/combat/cover';
import { monsterCombatantProfile } from '../../../src/combat/combatant';
import { monsterAttackCommand } from '../../../src/combat/monster-commands';
import { GOBLIN_WARRIOR } from '../../../src/combat/statblocks/monsters';
import type { GridCell } from '../../../src/combat/grid';
import { terrainBlocking, terrainKindOfWireBlocking } from '../../../src/combat/terrain';
import { armorClass, combatantId, statblockId, worldObjectId, type CombatantId } from '../../../src/combat/values';
import { projectDmView } from '../../../src/combat/visibility';
import { projectEncounterBoard } from '../../../src/vtt/encounter-board';
import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
import {
  availableEngineActorOptions,
  createPureTurnProposalResolver,
  engineActorOptionsForEnvironment,
} from '../../../src/vtt/intent-resolver';
import { engineOptionId } from '../../../src/vtt/turn-proposal';
import { generateRoom } from '../../../src/vtt/room-generator';
import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
import { placedToken, playerProfile } from '../combat/fixtures';

const SEED = 3_943_001;
const ACTOR_ID = combatantId('combatant:generated-3943001-monster-2');
const TARGET_ID = combatantId('combatant:fighter');
const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
const TURN_PROPOSAL_RESOLVER = createPureTurnProposalResolver(OFFER_ENVIRONMENT);

function placedState(
  seed: number,
  positions: ReadonlyMap<CombatantId, GridCell>,
  difficultCells: readonly GridCell[] = [],
  rows?: number,
): EncounterState {
  const state = generateRoom(seed).encounter.state;
  return freshMonsterPlanningState({
    ...state,
    bounds: rows === undefined ? state.bounds : { ...state.bounds, rows },
    blockedCells: [],
    worldObjects: [],
    persistentAreas: [],
    environment: {
      ...state.environment,
      difficultTerrainRegions: difficultCells.length === 0
        ? []
        : [{ id: 'engine-query-difficult', cells: difficultCells }],
      movementRegions: [],
    },
    tokens: state.tokens.flatMap((token) => {
      const position = positions.get(token.combatantId);
      return position === undefined ? [] : [{ ...token, position }];
    }),
  });
}

describe('canonical engine query port', () => {
  it('offers a modeled base attack despite an unresolved rider and partitions idle Disengage', () => {
    const generated = placedState(SEED, new Map<CombatantId, GridCell>([
      [ACTOR_ID, { column: 0, row: 0 }],
      [TARGET_ID, { column: 5, row: 0 }],
    ]));
    const state: EncounterState = {
      ...generated,
      combatants: generated.combatants.map((combatant) => combatant.profile.id === ACTOR_ID && combatant.profile.kind === 'monster'
        ? { ...combatant, profile: { ...combatant.profile, statblockId: statblockId('statblock:black-pudding') } }
        : combatant),
    };

    expect(canonicalEngineQueryPort.actions(state, ACTOR_ID).map((action) => action.id))
      .toEqual(['dissolving-pseudopod']);
    const options = availableEngineActorOptions(state, ACTOR_ID, OFFER_ENVIRONMENT);
    expect(options.map(({ label }) => label)).toEqual([
      'Dash',
      'Dissolving Pseudopod -> combatant:fighter',
      'Dodge',
      'End Turn',
    ]);
    expect(options.flatMap(({ actionSlots }) => actionSlots.map(({ use }) => use.kind))).toEqual([
      'dash', 'attack', 'dodge', 'end_turn',
    ]);
    expect(engineActorOptionsForEnvironment(state, ACTOR_ID, OFFER_ENVIRONMENT).humanOnly)
      .toContainEqual(expect.objectContaining({
      label: 'Disengage',
      noModeledEffect: { kind: 'disengage_without_movement', action: 'disengage' },
    }));
  });

  it('returns independently hand-computed path legality and movement costs', () => {
    const occupantId = TARGET_ID;
    const calls = [
      { case: 'normal_move', actor: { column: 0, row: 0 }, destination: { column: 2, row: 0 }, difficultCells: [], maximumFeet: 30, movement: 'normal' },
      { case: 'difficult_terrain', actor: { column: 0, row: 0 }, destination: { column: 2, row: 0 }, difficultCells: [{ column: 1, row: 0 }, { column: 2, row: 0 }], maximumFeet: 30, movement: 'normal' },
      { case: 'dash', actor: { column: 0, row: 0 }, destination: { column: 7, row: 0 }, difficultCells: [], maximumFeet: 60, movement: 'dash' },
      { case: 'occupied_endpoint', actor: { column: 0, row: 0 }, occupant: { column: 2, row: 0 }, destination: { column: 2, row: 0 }, difficultCells: [], maximumFeet: 30, movement: 'normal' },
    ] as const;
    for (const call of calls) {
      const positions = new Map<CombatantId, GridCell>([[ACTOR_ID, call.actor]]);
      if ('occupant' in call) positions.set(occupantId, call.occupant);
      const state = placedState(
        SEED,
        positions,
        call.difficultCells,
        call.case === 'difficult_terrain' ? 1 : undefined,
      );
      const canonical = canonicalEngineQueryPort.path(state, {
        actorId: ACTOR_ID,
        destination: call.destination,
        movement: call.movement,
        ...(call.movement === 'normal' ? { maximumFeet: call.maximumFeet } : {}),
      });

      if (call.case === 'normal_move') {
        // Two ordinary five-foot entries: 2 * 5 = 10 feet.
        expect(canonical).toMatchObject({ legal: true, costFeet: 10, budgetFeet: 30 });
      } else if (call.case === 'difficult_terrain') {
        // A one-row board forces two difficult entries: 2 * (5 * 2) = 20 feet.
        expect(canonical).toMatchObject({ legal: true, costFeet: 20, budgetFeet: 30 });
      } else if (call.case === 'dash') {
        // Seven ordinary entries cost 35 feet; Dash supplies the second 30-foot budget.
        expect(canonical).toMatchObject({ legal: true, costFeet: 35, budgetFeet: 60 });
      } else {
        // A hostile living creature occupies the requested endpoint.
        expect(canonical).toEqual({ legal: false, code: 'destination_unreachable' });
      }
    }
  });

  it('withholds Dash when an enclosed actor has no endpoint closer to its target', () => {
    const generated = placedState(
      SEED,
      new Map<CombatantId, GridCell>([
        [ACTOR_ID, { column: 0, row: 0 }],
        [TARGET_ID, { column: 20, row: 0 }],
      ]),
      [],
      1,
    );
    const state: EncounterState = {
      ...generated,
      blockedCells: [{ column: 1, row: 0 }],
    };

    expect(canonicalEngineQueryPort.approach(state, {
      actorId: ACTOR_ID,
      target: { column: 20, row: 0 },
      movement: 'dash',
      maximumFeet: 60,
    })).toEqual({ legal: false, code: 'destination_unreachable' });
    expect(availableEngineActorOptions(state, ACTOR_ID, OFFER_ENVIRONMENT).map(({ label }) => label))
      .toEqual(['Dodge', 'End Turn']);
    expect(engineActorOptionsForEnvironment(state, ACTOR_ID, OFFER_ENVIRONMENT).humanOnly)
      .toContainEqual(expect.objectContaining({
      label: 'Disengage',
      noModeledEffect: { kind: 'disengage_without_movement', action: 'disengage' },
    }));
  });

  it('M576-E1A-QUERY-PORT-LEGACY-LOS keeps reducer, query, options, and board terrain on one trace', () => {
    const actor = monsterCombatantProfile(GOBLIN_WARRIOR, {
      combatantId: 'combatant:parity-goblin', tokenId: 'token:parity-goblin',
    });
    const target = playerProfile('parity-target', { initiativeBonus: -20 });
    const lowCover = {
      id: worldObjectId('object:parity-low-cover'), name: 'Parity low cover', kind: 'cover' as const,
      position: { column: 2, row: 0 }, footprint: [0, 1, 2, 3].map((row) => ({ column: 2, row })),
      durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
      blocking: terrainBlocking('half_cover'), createdRevision: 0,
    };
    const setup = (worldObjects: EncounterState['worldObjects'], blockedCells: EncounterState['blockedCells'] = []) =>
      reduceEncounter(createEncounter({
        bounds: { columns: 6, rows: 4 }, combatants: [actor, target],
        tokens: [placedToken(actor, 0, 0), placedToken(target, 5, 2)], worldObjects, blockedCells,
      }), { type: 'roll_initiative' }, () => 0.5).state;
    const partial = setup([lowCover]);
    const partialTrace = traceCombatantLine(partial, actor.id, target.id);
    expect(partialTrace).toMatchObject({ tier: 'half', blocksSight: false });
    expect(canCombatantSee(partial, actor.id, target.id)).toBe(true);
    expect(canonicalEngineQueryPort.cover(partial, actor.id, target.id)).toEqual({
      tier: 'half', sourceIds: [`object:${lowCover.id}`],
    });
    expect(canonicalEngineQueryPort.visibility(partial, actor.id, target.id)).toMatchObject({ visible: true });
    expect(availableEngineActorOptions(partial, actor.id, OFFER_ENVIRONMENT).some((option) =>
      option.actionSlots.some((slot) =>
      slot.use.kind === 'attack' && slot.use.target.kind === 'combatant' && slot.use.target.combatantId === target.id))).toBe(true);
    const boardObject = projectEncounterBoard(projectDmView(partial)).worldObjects.find((object) => object.id === lowCover.id);
    expect(boardObject === undefined ? null : terrainKindOfWireBlocking(boardObject.blocking)).toBe('half_cover');
    const attack = canonicalEngineQueryPort.actions(partial, actor.id).find((action) => action.kind === 'attack' && action.id === 'shortbow');
    if (attack === undefined || attack.kind !== 'attack') throw new Error('Parity fixture omitted Shortbow.');
    expect(() => reduceEncounter(partial, monsterAttackCommand(attack, actor.id, target.id), () => 0.5)).not.toThrow();

    const walledCells = [
      ...[0, 1, 2, 3].map((row) => ({ column: 2, row })),
      // Keep the actor at the tested origin so an option cannot move to a boundary-grazing line.
      { column: 1, row: 0 }, { column: 0, row: 1 }, { column: 1, row: 1 },
    ];
    const walled = setup([], walledCells);
    expect(traceCombatantLine(walled, actor.id, target.id)).toMatchObject({ tier: 'total', blocksSight: true });
    expect(canCombatantSee(walled, actor.id, target.id)).toBe(false);
    expect(canonicalEngineQueryPort.cover(walled, actor.id, target.id)).toMatchObject({ tier: 'total' });
    expect(canonicalEngineQueryPort.visibility(walled, actor.id, target.id)).toMatchObject({
      visible: false, reason: 'blocked',
    });
    expect(availableEngineActorOptions(walled, actor.id, OFFER_ENVIRONMENT).some((option) =>
      option.actionSlots.some((slot) =>
      slot.use.kind === 'attack' && slot.use.target.kind === 'combatant' && slot.use.target.combatantId === target.id))).toBe(false);
    expect(() => reduceEncounter(walled, monsterAttackCommand(attack, actor.id, target.id), () => 0.5))
      .toThrow('Total Cover or is outside line of sight');
    expect(projectEncounterBoard(projectDmView(walled)).blockedCells).toEqual(walledCells);
  });

  it('returns independently hand-computed melee reach and thrown normal range', () => {
    const calls = [
      { case: 'melee_reach', actionId: 'grab', actor: { column: 0, row: 0 }, target: { column: 2, row: 0 } },
      { case: 'thrown_range', actionId: 'light-hammer', actor: { column: 0, row: 0 }, target: { column: 4, row: 0 } },
    ] as const;
    for (const call of calls) {
      const state = placedState(SEED, new Map<CombatantId, GridCell>([
        [ACTOR_ID, call.actor],
        [TARGET_ID, call.target],
      ]));
      const canonical = canonicalEngineQueryPort.reach(state, {
        actorId: ACTOR_ID,
        targetId: TARGET_ID,
        actionId: call.actionId,
      });
      if (call.case === 'melee_reach') {
        // Two grid intervals are 10 feet, exactly the Bugbear Warrior's Grab reach.
        expect(canonical).toEqual({
          legal: true,
          distanceFeet: 10,
          rangeFeet: 10,
          rangeBand: 'melee',
          normalRangeFeet: 10,
          longRangeFeet: null,
        });
      } else {
        // Four grid intervals are 20 feet, exactly Light Hammer's normal thrown range.
        expect(canonical).toEqual({
          legal: true,
          distanceFeet: 20,
          rangeFeet: 20,
          rangeBand: 'normal',
          normalRangeFeet: 20,
          longRangeFeet: 60,
        });
      }
    }
  });

  it('keeps normal and long range distinct in the authoritative reach query', () => {
    const state = placedState(SEED, new Map<CombatantId, GridCell>([
      [ACTOR_ID, { column: 0, row: 0 }],
      [TARGET_ID, { column: 5, row: 0 }],
    ]));
    // Five grid intervals are 25 feet: beyond 20 normal, within 60 long.
    expect(canonicalEngineQueryPort.reach(state, {
      actorId: ACTOR_ID,
      targetId: TARGET_ID,
      actionId: 'light-hammer',
    })).toEqual({
      legal: true,
      distanceFeet: 25,
      rangeFeet: 20,
      rangeBand: 'long',
      normalRangeFeet: 20,
      longRangeFeet: 60,
    });
  });

  it('derives fallback behavior independently from fixed geometry', () => {
    const state = placedState(SEED, new Map<CombatantId, GridCell>([
      [ACTOR_ID, { column: 0, row: 0 }],
      [TARGET_ID, { column: 4, row: 0 }],
    ]));

    const fallback = availableEngineActorOptions(state, ACTOR_ID, OFFER_ENVIRONMENT).find((option) =>
      option.actionSlots.some((slot) => slot.use.kind === 'attack' && slot.use.actionId === 'light-hammer'));
    if (fallback === undefined) throw new Error('Fixture omitted the Light Hammer option.');
    const resolved = TURN_PROPOSAL_RESOLVER.resolve(state, {
      actorId: ACTOR_ID, expectedRevision: state.revision,
      primaryOptionId: engineOptionId('option:missing-grab'), fallbackOptionId: fallback.optionId,
      reason: 'Exercise the engine query proposal fixture.',
      overrideJustification: null,
    });

    // A missing revision-bound primary falls through to the offered Light Hammer option at 20 feet.
    expect(resolved).toMatchObject({
      valid: true,
      selectedBranch: 'fallback',
      mechanics: { movementCostFeet: 0, actionSlots: [{ actionId: 'light-hammer', targetIds: [TARGET_ID] }] },
    });
  });

  it('moves into melee before attacking when the declared stance and willingness permit it', () => {
    const state = placedState(SEED, new Map<CombatantId, GridCell>([
      [ACTOR_ID, { column: 0, row: 0 }],
      [TARGET_ID, { column: 4, row: 0 }],
    ]));

    const grab = availableEngineActorOptions(state, ACTOR_ID, OFFER_ENVIRONMENT).find((option) =>
      option.actionSlots.some((slot) => slot.use.kind === 'attack' && slot.use.actionId === 'grab'));
    if (grab === undefined) throw new Error('Fixture omitted the Grab option.');
    const resolved = TURN_PROPOSAL_RESOLVER.resolve(state, {
      actorId: ACTOR_ID, expectedRevision: state.revision,
      primaryOptionId: grab.optionId, fallbackOptionId: null,
      reason: 'Exercise the engine query grab fixture.', overrideJustification: null,
    });

    expect(resolved).toMatchObject({
      valid: true,
      selectedBranch: 'primary',
      mechanics: { movementCostFeet: 10, actionSlots: [{ actionId: 'grab', targetIds: [TARGET_ID] }] },
    });
  });

  it('refuses a declared dead target with a distinct code', () => {
    const placed = placedState(SEED, new Map<CombatantId, GridCell>([
      [ACTOR_ID, { column: 0, row: 0 }],
      [TARGET_ID, { column: 1, row: 0 }],
    ]));
    const state: EncounterState = {
      ...placed,
      combatants: placed.combatants.map((candidate) => candidate.profile.id === TARGET_ID
        ? { ...candidate, hitPoints: 0, life: 'dead', deathAt: { round: 1, initiativeIndex: 0 } }
        : candidate),
    };

    expect(TURN_PROPOSAL_RESOLVER.resolve(state, {
      actorId: ACTOR_ID, expectedRevision: state.revision,
      primaryOptionId: engineOptionId('option:dead-target-grab'), fallbackOptionId: null,
      reason: 'Exercise the engine query resolution fixture.',
      overrideJustification: null,
    })).toEqual({
      valid: false,
      selectedBranch: 'none',
      refusals: [{
        branch: 'primary',
        code: 'OPTION_NOT_OFFERED',
        summary: `${ACTOR_ID}: primary option was not offered at revision ${String(state.revision)}`,
      }],
    });
  });
});
