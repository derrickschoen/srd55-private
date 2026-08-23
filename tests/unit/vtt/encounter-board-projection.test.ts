import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { CombatantProfile } from '../../../src/combat/combatant';
import type { ControllerRequest } from '../../../src/combat/controllers';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import type {
  BranchSpellOperation,
  CompositionOperation,
  CompositionStep,
  SharedOutcomeOperation,
  SpellCastCommand,
  SpellOperation,
  SpellTargeting,
} from '../../../src/combat/spells/types';
import { feetPoint } from '../../../src/combat/templates';
import {
  armorClass,
  damageType,
  dieSides,
  feet,
  worldObjectId,
  type CombatantId,
  type EncounterEffectId,
} from '../../../src/combat/values';
import { projectDmView, projectPlayerView } from '../../../src/combat/visibility';
import { loadContentPack, type LoadedContentPack } from '../../../src/content/content-pack';
import { encounterBoardRenderModel, projectEncounterBoard } from '../../../src/vtt/encounter-board';
import { projectDmBoard } from '../../../src/vtt/encounter-projections';
import { REFERENCE_ENCOUNTER_ART } from '../../../src/vtt/reference-encounter-art';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

interface SpellRecord {
  readonly id: string;
  readonly targeting: SpellTargeting;
  readonly operation: SpellOperation;
  readonly concentration?: boolean;
  readonly duration?: Readonly<Record<string, unknown>>;
}

function importedPack(records: readonly SpellRecord[]): LoadedContentPack {
  const fixture = JSON.parse(readFileSync('tests/fixtures/content-pack-v1-homebrew.json', 'utf8')) as {
    readonly spells: readonly Readonly<Record<string, unknown>>[];
    readonly [key: string]: unknown;
  };
  const template = fixture.spells[0];
  if (template === undefined) throw new Error('Content-pack spell fixture is missing.');
  const loaded = loadContentPack({
    ...fixture,
    spells: records.map((record) => ({
      ...template,
      recordId: record.id,
      name: record.id,
      level: 0,
      range: { kind: 'feet', feet: 150 },
      concentration: record.concentration ?? false,
      duration: record.duration ?? { kind: 'instantaneous' },
      targeting: record.targeting,
      operation: record.operation,
    })),
  });
  if (loaded.status !== 'loaded') throw new Error(`Board fixture refused: ${loaded.refusal.reason}.`);
  expect(loaded.content.diagnostics).toEqual([]);
  return loaded.content;
}

function started(
  combatants: readonly CombatantProfile[],
  positions: readonly { readonly column: number; readonly row: number }[],
  options: {
    readonly columns?: number;
    readonly rows?: number;
    readonly pack?: LoadedContentPack;
  } = {},
): EncounterState {
  return reduceEncounter(createEncounter({
    config: { initiativeMode: 'per_combatant' },
    bounds: { columns: options.columns ?? 12, rows: options.rows ?? 4 },
    combatants,
    tokens: combatants.map((profile, index) => {
      const position = positions[index];
      if (position === undefined) throw new Error('Board fixture position is missing.');
      return placedToken(profile, position.column, position.row);
    }),
    ...(options.pack === undefined ? {} : { contentPacks: [options.pack] }),
  }), { type: 'roll_initiative' }, () => 0).state;
}

function castCommand(
  caster: CombatantProfile,
  spellId: string,
  targets: readonly CombatantId[],
  options: {
    readonly slotLevel?: 1 | 2 | 3;
    readonly area?: SpellCastCommand['area'];
    readonly spatialPoint?: { readonly column: number; readonly row: number };
  } = {},
): SpellCastCommand {
  return {
    type: 'cast_spell',
    actor: caster.id,
    spellId,
    slotLevel: options.slotLevel ?? null,
    castAsRitual: false,
    casterLevel: 5,
    attackBonus: 8,
    saveDc: 15,
    spellcastingModifier: 4,
    targets,
    area: options.area ?? null,
    weaponAttack: null,
    selectedOption: null,
    ...(options.spatialPoint === undefined ? {} : { spatialPoint: options.spatialPoint }),
  };
}

function nextTurnFor(state: EncounterState, id: CombatantId): EncounterState {
  let current = state;
  do {
    const actor = current.activeCombatant;
    if (actor === null) throw new Error('Encounter has no active combatant.');
    current = reduceEncounter(current, { type: 'end_turn', actor }, () => 0).state;
  } while (current.activeCombatant !== id);
  return current;
}

function damage(amount: number): BranchSpellOperation {
  return {
    kind: 'damage_operation',
    delivery: { kind: 'automatic' },
    instancesPerTarget: 1,
    packets: [{
      damageType: { kind: 'fixed', damageType: damageType('Thunder') },
      dice: {
        baseCount: 0, sides: 6, modifier: amount,
        perSlotCount: 0, perSlotModifier: 0, cantripUpgrade: false,
      },
      scaling: { kind: 'none' },
      thresholdRider: null,
    }],
    timing: { kind: 'immediate' },
  };
}

const branchWave: SharedOutcomeOperation = {
  kind: 'shared_outcome',
  delivery: { kind: 'save', ability: 'constitution', rollMode: 'normal' },
  onFailure: [
    damage(2),
    { kind: 'forced_movement', direction: 'away', origin: 'caster', distanceFeet: 10, save: null },
  ],
  onSuccess: [],
};

const sustainedBound: SpellOperation = {
  kind: 'sustained_effect',
  establishment: null,
  lifecycle: { concentration: false, durationRounds: 10, expiresAt: 'source_start' },
  sequence: {
    kind: 'activation', targetBinding: { kind: 'bound', to: 'cast_combatant_targets' },
    action: { phrasing: 'explicit', actionType: 'magic_action' },
    targeting: { kind: 'single', rangeFeet: 60, willing: false },
    operation: damage(1),
  },
};

const sustainedReselect: SpellOperation = {
  kind: 'sustained_effect',
  establishment: null,
  lifecycle: { concentration: false, durationRounds: 10, expiresAt: 'source_start' },
  sequence: {
    kind: 'activation', targetBinding: { kind: 'reselect' },
    action: { phrasing: 'explicit', actionType: 'magic_action' },
    targeting: { kind: 'single', rangeFeet: 60, willing: false },
    operation: damage(1),
  },
};

function sustainedEffectId(state: EncounterState, spellId: string): EncounterEffectId {
  const effect = state.effects.find(
    (candidate) => candidate.payload.kind === 'sustained_effect' && candidate.payload.spellId === spellId,
  );
  if (effect === undefined) throw new Error(`Missing sustained effect ${spellId}.`);
  return effect.id;
}

function activationCommand(
  caster: CombatantProfile,
  effectId: EncounterEffectId,
  targets: readonly CombatantId[],
): Extract<EncounterCommand, { readonly type: 'activate_sustained_effect' }> {
  return {
    type: 'activate_sustained_effect', actor: caster.id, effectId, targets,
    objectTargets: [], ownedObjectTargets: [], area: null, selectedOption: null,
  };
}

const IDLE = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' as const },
  pause: null,
};

describe('D344.3 DM encounter board projection', () => {
  it('dying_marker_distinct_from_corpse: a death-save combatant at 0 HP renders as a dying token', () => {
    const downed = playerProfile('fighter', { hitPoints: 10, initiativeBonus: 20 });
    let state = started([downed], [{ column: 1, row: 1 }], { columns: 10, rows: 7 });
    state = reduceEncounter(state, {
      type: 'adjudicate', target: downed.id, subject: 'projection marker', reasoning: 'fixture',
      consequence: { kind: 'hit_point_delta', amount: -10 },
    }, () => 0).state;

    const projected = projectEncounterBoard(projectDmView(state));
    const rendered = encounterBoardRenderModel(projected, REFERENCE_ENCOUNTER_ART);
    const token = rendered.flatMap((cell) => cell.tokens).find((entry) => entry.id === downed.id);

    expect(token).toEqual(expect.objectContaining({ life: 'dying', marker: 'token' }));
  });

  it('corpse_token_removed: a dead combatant remains a corpse at the persisted board-edge cell while a dying combatant stays a token', () => {
    const dying = playerProfile('edge-dying', { hitPoints: 10, initiativeBonus: 20 });
    const dead = monsterProfile('edge-dead', { hitPoints: 10, initiativeBonus: -20 });
    let state = started([dying, dead], [{ column: 0, row: 0 }, { column: 4, row: 2 }], {
      columns: 5, rows: 3,
    });
    state = reduceEncounter(state, {
      type: 'adjudicate', target: dying.id, subject: 'projection boundary', reasoning: 'fixture',
      consequence: { kind: 'hit_point_delta', amount: -20 },
    }, () => 0).state;
    state = reduceEncounter(state, {
      type: 'adjudicate', target: dead.id, subject: 'projection boundary', reasoning: 'fixture',
      consequence: { kind: 'hit_point_delta', amount: -20 },
    }, () => 0).state;

    const projection = projectEncounterBoard(projectDmView(state));
    expect(projection.combatants.find((entry) => entry.id === dead.id)).toEqual(expect.objectContaining({
      life: 'dead', position: { column: 4, row: 2 },
    }));
    expect(projection.combatants.find((entry) => entry.id === dying.id)).toEqual(expect.objectContaining({
      life: 'dying', position: { column: 0, row: 0 },
    }));
    expect(projection.combatants.filter((entry) => entry.life === 'dead')).toHaveLength(1);
  });

  it('boundary_corpse_edge_included: includes the last in-bounds cell and never invents an outside corpse cell', () => {
    const corpse = monsterProfile('edge-corpse', { hitPoints: 1, initiativeBonus: 20 });
    let state = started([corpse], [{ column: 2, row: 1 }], { columns: 3, rows: 2 });
    state = reduceEncounter(state, {
      type: 'adjudicate', target: corpse.id, subject: 'edge', reasoning: 'fixture',
      consequence: { kind: 'hit_point_delta', amount: -1 },
    }, () => 0).state;
    const projected = projectEncounterBoard(projectDmView(state)).combatants.filter((entry) => entry.life === 'dead');
    expect(projected.map((entry) => entry.position)).toEqual([{ column: 2, row: 1 }]);
    expect(projected.some((entry) => entry.position.column === 3 || entry.position.row === 2)).toBe(false);
  });

  it('tracks ordinary movement, teleport, and forced movement from three real reducer transitions', () => {
    const spatialPack = importedPack([
      {
        id: 'board-step', targeting: { kind: 'self' },
        operation: {
          kind: 'teleport', subject: 'caster', maximumDistanceFeet: 30,
          destination: { requireUnoccupied: true, requireOccupiable: true, requireLineOfSight: true },
        },
      },
      {
        id: 'board-wave', targeting: { kind: 'multiple', rangeFeet: 150, baseMaximum: 2, additionalPerSlot: 0 },
        operation: branchWave,
      },
    ]);
    const mover = playerProfile('board-mover', { initiativeBonus: 20 });
    const target = monsterProfile('board-pushed', { initiativeBonus: -20 });

    let moved = started([mover, target], [{ column: 0, row: 0 }, { column: 8, row: 0 }]);
    moved = reduceEncounter(moved, {
      type: 'move', actor: mover.id, path: [{ column: 1, row: 0 }], cause: 'voluntary',
    }, () => 0).state;
    expect(projectEncounterBoard(projectDmView(moved)).combatants.find((entry) => entry.id === mover.id)?.position)
      .toEqual({ column: 1, row: 0 });

    let teleported = started([mover, target], [{ column: 0, row: 0 }, { column: 8, row: 0 }], { pack: spatialPack });
    teleported = reduceEncounter(teleported, castCommand(
      mover, 'greenforge:board-step', [], { spatialPoint: { column: 6, row: 0 } },
    ), () => 0).state;
    expect(projectEncounterBoard(projectDmView(teleported)).combatants.find((entry) => entry.id === mover.id)?.position)
      .toEqual({ column: 6, row: 0 });

    let forced = started([mover, target], [{ column: 0, row: 0 }, { column: 1, row: 0 }], { pack: spatialPack });
    forced = reduceEncounter(
      forced,
      castCommand(mover, 'greenforge:board-wave', [target.id]),
      () => 0,
    ).state;
    expect(projectEncounterBoard(projectDmView(forced)).combatants.find((entry) => entry.id === target.id)?.position)
      .toEqual({ column: 3, row: 0 });
  });

  it('light_radius_unlabeled: projects object names/blocking and a clipped, explicitly descriptive Daylight overlay distinct from a plain object', () => {
    const caster = playerProfile('daylight-caster', {
      initiativeBonus: 20, spellSlots: [{ level: 3, maximum: 1 }],
    });
    let state = createEncounter({
      config: { initiativeMode: 'per_combatant' }, bounds: { columns: 30, rows: 30 },
      combatants: [caster], tokens: [placedToken(caster, 0, 0)],
    });
    for (const [name, kind, column] of [
      ['Daylight lantern', 'light-source', 1],
      ['Stone plinth', 'generic', 2],
    ] as const) {
      state = reduceEncounter(state, {
        type: 'world_operation', actor: null, cost: 'none',
        operation: {
          kind: 'create_object',
          object: {
            id: worldObjectId(`object:${kind}`),
            name, kind, position: { column, row: 1 }, footprint: [{ column, row: 1 }],
            durability: { kind: 'indestructible' }, armorClass: armorClass(10), damageResponses: [],
            blocking: kind === 'generic'
              ? { movement: true, lineOfSight: true, cover: 'total' }
              : { movement: false, lineOfSight: false, cover: 'none' },
          },
        },
      }, () => 0).state;
    }
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0).state;
    state = reduceEncounter(state, castCommand(caster, 'daylight', [], {
      slotLevel: 3,
      area: { shape: 'sphere', template: { origin: feetPoint(0, 0), radius: feet(60) } },
    }), () => 0).state;

    const projection = projectEncounterBoard(projectDmView(state));
    expect(projection.worldObjects.map((object) => ({
      name: object.name, lightClass: object.lightClass, blocking: object.blocking,
    }))).toEqual([
      {
        name: 'Daylight lantern', lightClass: 'light-source',
        blocking: { movement: false, lineOfSight: false, cover: 'none' },
      },
      {
        name: 'Stone plinth', lightClass: 'none',
        blocking: { movement: true, lineOfSight: true, cover: 'total' },
      },
    ]);
    expect(projection.lightOverlays).toHaveLength(1);
    expect(projection.lightOverlays[0]).toMatchObject({
      presentation: 'descriptive', brightRadiusFeet: 60, additionalDimFeet: 60,
    });
    expect(projection.lightOverlays[0]?.label).toContain('(descriptive)');
    expect(projection.lightOverlays[0]?.brightCells).toContainEqual({ column: 0, row: 0 });
    expect(projection.lightOverlays[0]?.dimCells.length).toBeGreaterThan(0);
    expect([
      ...(projection.lightOverlays[0]?.brightCells ?? []),
      ...(projection.lightOverlays[0]?.dimCells ?? []),
    ].every((cell) => cell.column >= 0 && cell.row >= 0 && cell.column < 30 && cell.row < 30)).toBe(true);
  });

  it('boundary_light_radius_clipped: keeps exact in-bounds bright and dim cells while excluding the adjacent outside cells', () => {
    const caster = playerProfile('light-edge-caster', {
      initiativeBonus: 20, spellSlots: [{ level: 3, maximum: 1 }],
    });
    let state = started([caster], [{ column: 0, row: 0 }], { columns: 30, rows: 30 });
    state = reduceEncounter(state, castCommand(caster, 'daylight', [], {
      slotLevel: 3,
      area: { shape: 'sphere', template: { origin: feetPoint(0, 0), radius: feet(60) } },
    }), () => 0).state;
    const light = projectEncounterBoard(projectDmView(state)).lightOverlays[0];
    expect(light?.brightCells).toContainEqual({ column: 12, row: 0 });
    expect(light?.dimCells).toContainEqual({ column: 24, row: 0 });
    expect(light?.brightCells).not.toContainEqual({ column: -1, row: 0 });
    expect(light?.dimCells).not.toContainEqual({ column: 30, row: 0 });
  });

  it('projects persistent declared shapes and movement regions with owner attribution from reduced state', () => {
    const regionPack = importedPack([{
      id: 'thorn-lane', targeting: { kind: 'self' },
      operation: {
        kind: 'movement_region',
        region: { id: 'thorn-lane', cells: [{ column: 5, row: 1 }, { column: 6, row: 1 }] },
        difficultTerrain: true,
        entry: 'blocked',
        damage: null,
      },
    }]);
    const owner = playerProfile('area-owner', { initiativeBonus: 20 });
    let state = started([owner], [{ column: 0, row: 1 }], { pack: regionPack });
    state = reduceEncounter(state, {
      type: 'create_persistent_area', actor: owner.id, cost: 'none',
      area: {
        owner: owner.id,
        origin: { kind: 'fixed', point: feetPoint(15, 5) },
        shape: { kind: 'sphere', radius: feet(10) },
        duration: { kind: 'rounds', remaining: 3 },
        targetFilter: { kind: 'all' },
        difficultTerrain: false, hooks: [], movable: null,
      },
    }, () => 0).state;
    state = reduceEncounter(state, castCommand(owner, 'greenforge:thorn-lane', []), () => 0).state;

    expect(projectEncounterBoard(projectDmView(state)).areas).toEqual([
      expect.objectContaining({
        kind: 'persistent', owner: owner.id, ownerName: 'area-owner',
        shape: { kind: 'sphere', radius: 10 },
      }),
      expect.objectContaining({
        kind: 'movement_region', id: 'thorn-lane', owner: owner.id,
        ownerName: 'area-owner', shape: { kind: 'declared_cells' }, entry: 'blocked',
        cells: [{ column: 5, row: 1 }, { column: 6, row: 1 }],
      }),
    ]);
  });

  it('bound_vs_reselect_badges: projects distinct badges, bound-target lines, activation availability, and activation log entries', () => {
    const pack = importedPack([
      {
        id: 'bound-glow', targeting: { kind: 'single', rangeFeet: 60, willing: false },
        operation: sustainedBound, duration: { kind: 'rounds', rounds: 10 },
      },
      {
        id: 'reselect-glow', targeting: { kind: 'self' }, operation: sustainedReselect,
        duration: { kind: 'rounds', rounds: 10 },
      },
    ]);
    const caster = playerProfile('sustained-board-caster', { initiativeBonus: 20 });
    const target = monsterProfile('sustained-board-target', { initiativeBonus: -20 });
    let state = started([caster, target], [{ column: 0, row: 0 }, { column: 4, row: 0 }], { pack });
    state = reduceEncounter(state, castCommand(caster, 'greenforge:bound-glow', [target.id]), () => 0).state;
    state = nextTurnFor(state, caster.id);
    state = reduceEncounter(state, castCommand(caster, 'greenforge:reselect-glow', []), () => 0).state;
    state = nextTurnFor(state, caster.id);
    const effectId = sustainedEffectId(state, 'greenforge:bound-glow');
    const activation = activationCommand(caster, effectId, [target.id]);
    const request: ControllerRequest = {
      kind: 'turn', requestId: 'turn:activate', encounterRevision: state.revision,
      actorId: caster.id,
      visibleState: projectPlayerView(state, { seatId: String(caster.id), combatantId: caster.id }),
      legalActions: { actions: [activation] },
    };
    const before = projectEncounterBoard(projectDmView(state), request);
    expect(before.sustainedEffects.map((effect) => ({
      spellId: effect.spellId,
      binding: effect.targetBinding,
      badge: effect.badge,
      targets: effect.boundTargets.map((bound) => bound.id),
      activationAvailable: effect.activationAvailable,
    }))).toEqual([
      {
        spellId: 'greenforge:bound-glow', binding: 'bound_combatants',
        badge: 'greenforge:bound-glow — bound', targets: [target.id], activationAvailable: true,
      },
      {
        spellId: 'greenforge:reselect-glow', binding: 'reselect',
        badge: 'greenforge:reselect-glow — reselect on activation', targets: [], activationAvailable: false,
      },
    ]);
    expect(before.targetLines).toEqual([expect.objectContaining({
      effectId, from: { column: 0, row: 0 }, to: { column: 4, row: 0 }, target: target.id,
    })]);

    state = reduceEncounter(state, activation, () => 0).state;
    expect(projectEncounterBoard(projectDmView(state)).log).toContainEqual(expect.objectContaining({
      kind: 'sustained_activation', effectId, spellId: 'greenforge:bound-glow',
    }));
  });

  it('branch_events_collapsed: one shared-outcome roll per target carries its branch label and composition refusal keeps its typed reason', () => {
    const inherited = { kind: 'inherit' } as const;
    const refusalStep: CompositionStep = {
      targetResolution: inherited,
      operation: {
        kind: 'condition_lifecycle', condition: 'Frightened', immunity: null,
        initialSave: null, repeatedSave: null, damageBreak: null,
        duration: { kind: 'fixed_rounds', rounds: 2, expiresAt: 'target_end' },
        stacking: { kind: 'coexist' },
      },
    };
    const damageStep: CompositionStep = { targetResolution: inherited, operation: damage(1) };
    const composition: CompositionOperation = {
      kind: 'composition', ordering: 'declaration_order', onRefusal: 'continue',
      steps: [refusalStep, damageStep],
    };
    const pack = importedPack([
      {
        id: 'two-branch-wave', targeting: { kind: 'multiple', rangeFeet: 150, baseMaximum: 2, additionalPerSlot: 0 },
        operation: branchWave,
      },
      {
        id: 'refusal-pair', targeting: { kind: 'single', rangeFeet: 150, willing: false },
        operation: composition,
      },
    ]);
    const caster = playerProfile('branch-caster', { initiativeBonus: 20 });
    const failure = monsterProfile('branch-failure', { initiativeBonus: -10, constitutionSaveBonus: 0 });
    const success = monsterProfile('branch-success', { initiativeBonus: -20, constitutionSaveBonus: 20 });
    let state = started(
      [caster, failure, success],
      [{ column: 0, row: 0 }, { column: 1, row: 0 }, { column: 1, row: 1 }],
      { pack },
    );
    state = reduceEncounter(
      state,
      castCommand(caster, 'greenforge:two-branch-wave', [failure.id, success.id]),
      () => 0,
    ).state;
    const saveRolls = projectEncounterBoard(projectDmView(state)).log.filter(
      (entry) => entry.kind === 'roll' && entry.rollKind === 'save',
    );
    expect(saveRolls).toHaveLength(2);
    const branchRolls = saveRolls.filter(
      (entry) => entry.kind === 'roll' && entry.branches.length > 0,
    );
    expect(branchRolls).toHaveLength(2);
    expect(branchRolls.map((entry) => entry.kind === 'roll' ? entry.branches : [])).toEqual([
      [{ target: failure.id, label: 'failure' }],
      [{ target: success.id, label: 'success' }],
    ]);

    const immune = monsterProfile('composition-immune', {
      initiativeBonus: -20, conditionImmunities: ['Frightened'],
    });
    let refusalState = started([caster, immune], [{ column: 0, row: 0 }, { column: 1, row: 0 }], { pack });
    refusalState = reduceEncounter(
      refusalState,
      castCommand(caster, 'greenforge:refusal-pair', [immune.id]),
      () => 0,
    ).state;
    expect(projectEncounterBoard(projectDmView(refusalState)).log).toContainEqual(expect.objectContaining({
      kind: 'composition_refusal', reason: 'operation_refused', propagation: 'continue',
    }));
  });

  it('projects initiative/turn focus and exposes move, attack, cast, and activate only from a human controller legal-command request', () => {
    const pack = importedPack([{
      id: 'human-bound', targeting: { kind: 'single', rangeFeet: 60, willing: false },
      operation: sustainedBound, duration: { kind: 'rounds', rounds: 10 },
    }]);
    const actor = playerProfile('human-board-actor', { initiativeBonus: 20 });
    const target = monsterProfile('human-board-target', { initiativeBonus: -20 });
    let state = started([actor, target], [{ column: 0, row: 0 }, { column: 1, row: 0 }], { pack });
    state = reduceEncounter(state, castCommand(actor, 'greenforge:human-bound', [target.id]), () => 0).state;
    state = nextTurnFor(state, actor.id);
    const activate = activationCommand(actor, sustainedEffectId(state, 'greenforge:human-bound'), [target.id]);
    const commands: readonly EncounterCommand[] = [
      { type: 'move', actor: actor.id, path: [{ column: 0, row: 1 }], cause: 'voluntary' },
      {
        type: 'attack', actor: actor.id, target: target.id, attackBonus: 5,
        criticalFloor: 20, rollMode: 'normal', attackerCanSeeTarget: true,
        targetCanSeeAttacker: true,
        damage: {
          terms: [{ type: damageType('Slashing'), dice: { count: 1, sides: dieSides(6), modifier: 3 } }],
          critical: false, responses: [],
        },
      },
      castCommand(actor, 'greenforge:human-bound', [target.id]),
      activate,
    ];
    const request: ControllerRequest = {
      kind: 'turn', requestId: 'turn:human-board', encounterRevision: state.revision,
      actorId: actor.id,
      visibleState: projectPlayerView(state, { seatId: String(actor.id), combatantId: actor.id }),
      legalActions: { actions: commands },
    };
    const human = projectDmBoard({
      view: projectDmView(state),
      coordinator: { ...IDLE, pendingRequest: request },
      controllers: [{
        combatantId: actor.id, controllerId: 'controller:human-board', kind: 'human', generation: 0,
      }],
      history: [],
    });
    expect(human.humanCommandActions.map((command) => command.type)).toEqual([
      'move', 'attack', 'cast_spell', 'activate_sustained_effect',
    ]);
    expect(human.board.initiative.find((entry) => entry.combatant === actor.id)).toEqual(
      expect.objectContaining({ active: true, name: 'human-board-actor' }),
    );
    expect(human.board.highlightedCombatant).toBe(actor.id);

    const algorithm = projectDmBoard({
      view: projectDmView(state),
      coordinator: { ...IDLE, pendingRequest: request },
      controllers: [{
        combatantId: actor.id, controllerId: 'controller:algorithm-board', kind: 'algorithm', generation: 0,
      }],
      history: [],
    });
    expect(algorithm.humanCommandActions).toEqual([]);
  });
});
