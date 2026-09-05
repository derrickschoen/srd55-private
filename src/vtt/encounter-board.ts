import type { AssetId } from '../assets/ids';
import type { ControllerRequest } from '../combat/controllers';
import { combatantSpace, type EncounterState, type InitiativeEntry, type LifeState } from '../combat/encounter';
import {
  creatureSpace,
  minimumSpaceLine,
  normalPlacementFor,
  placementFor,
  sizedCombatantState,
  type GridPoint,
  type SerializedPlacementMode,
} from '../combat/creature-space';
import type { EffectPayload } from '../combat/effects';
import type { EncounterEvent } from '../combat/events';
import type { GridCell } from '../combat/grid';
import { isCellInside } from '../combat/grid';
import { persistentAreaContains } from '../combat/persistent-areas';
import { affectedCells, feetPoint, type AreaTemplate } from '../combat/templates';
import { feet, type CombatantId } from '../combat/values';
import type { EncounterEffectId, ObjectTargetId, PersistentAreaId, WorldObjectId } from '../combat/values';
import type { WorldObjectBlocking, WorldObjectKind } from '../combat/world-objects';
import type { DmView } from '../combat/visibility';
// ART-SEAM (D516): art families, dead silhouette and the prose HP classifier feed the board model.
import {
  SHADE_ASSETS,
  doorSetFor,
  doorSideAt,
  floorSetFor,
  floorVariantAt,
  shadeSidesAt,
  wallPieceAt,
  wallSetFor,
} from '../assets/art-sets';
import { DEAD_TOKEN_ASSET_ID } from '../assets/starter-art-inputs';
import { hitPointKnowledge } from './intel/actor-knowledge';
import type { ProjectedHitPointKnowledge } from './intel/contracts';
import type { EncounterArtPackage } from './encounter-package';

type DmEncounterState = DmView['state'];

interface EncounterBoardCombatantIdentity {
  readonly id: CombatantId;
  readonly name: string;
  readonly kind: 'player_character' | 'monster';
  readonly life?: LifeState;
  /** DM projections only: the SAME band the prose gives the AI DM (actor-knowledge). */
  readonly hitPointBand?: ProjectedHitPointKnowledge;
  /** DM projections only: the engine currently treats this combatant as hidden. */
  readonly hiddenFromPlayers?: boolean;
  /** Sourced creature type when the profile carries one; absent means the profile had none. */
  readonly creatureType?: string;
}

export interface EncounterBoardPlacedCombatant extends EncounterBoardCombatantIdentity {
  readonly placementStatus: 'placed';
  readonly position: { readonly column: number; readonly row: number };
  readonly effectiveSize: import('../domain/enums').KnownCreatureSize;
  readonly placementMode: SerializedPlacementMode;
  readonly footprint: readonly [GridCell, ...GridCell[]];
}

export interface EncounterBoardPendingCombatant extends EncounterBoardCombatantIdentity {
  readonly placementStatus: 'placement_pending';
  readonly pendingReason: EncounterState['adjudicationPending'][number]['kind'];
}

export type EncounterBoardCombatant =
  | EncounterBoardPlacedCombatant
  | EncounterBoardPendingCombatant;

export interface EncounterBoardProjectionShape {
  readonly bounds: { readonly columns: number; readonly rows: number };
  readonly blockedCells?: readonly GridCell[];
  readonly difficultTerrainRegions?: readonly EncounterBoardEnvironmentRegion[];
  readonly obscurementRegions?: readonly EncounterBoardObscurementRegion[];
  readonly environmentLightRegions?: readonly EncounterBoardLightRegion[];
  readonly combatants: readonly EncounterBoardCombatant[];
  readonly highlightedCombatant: CombatantId | null;
  readonly adjudicatedTargets: readonly CombatantId[];
  /** Omit this property entirely for player projections. */
  readonly foggedCells?: readonly { readonly column: number; readonly row: number }[];
  /** Player-safe, per-seat fog inferred by the canonical player projection. */
  readonly concealedCells?: readonly { readonly column: number; readonly row: number }[];
  readonly worldObjects?: readonly EncounterBoardWorldObject[];
  readonly areas?: readonly EncounterBoardArea[];
  readonly lightOverlays?: readonly EncounterBoardLightOverlay[];
  readonly sustainedEffects?: readonly EncounterBoardSustainedEffect[];
  readonly targetLines?: readonly EncounterBoardTargetLine[];
}

export interface EncounterBoardEnvironmentRegion {
  readonly id: string;
  readonly cells: readonly GridCell[];
}

export interface EncounterBoardObscurementRegion extends EncounterBoardEnvironmentRegion {
  readonly obscurement: 'light' | 'heavy' | 'magical_darkness';
}

export interface EncounterBoardLightRegion extends EncounterBoardEnvironmentRegion {
  readonly level: 'bright' | 'dim' | 'darkness';
}

export interface EncounterBoardWorldObject {
  readonly id: WorldObjectId;
  readonly name: string;
  readonly kind: WorldObjectKind;
  readonly position: GridCell;
  readonly cells: readonly GridCell[];
  readonly blocking: WorldObjectBlocking;
  readonly lightClass: 'light-source' | 'none';
}

export type EncounterBoardArea =
  | {
      readonly kind: 'persistent';
      readonly id: PersistentAreaId;
      readonly owner: CombatantId;
      readonly ownerName: string;
      readonly shape: EncounterState['persistentAreas'][number]['shape'];
      readonly cells: readonly GridCell[];
      readonly difficultTerrain: boolean;
    }
  | {
      readonly kind: 'movement_region';
      readonly id: string;
      readonly owner: CombatantId;
      readonly ownerName: string;
      readonly shape: { readonly kind: 'declared_cells' };
      readonly cells: readonly GridCell[];
      readonly difficultTerrain: boolean;
      readonly entry: 'allowed' | 'blocked';
    };

export interface EncounterBoardLightOverlay {
  readonly id: EncounterEffectId;
  readonly source: CombatantId;
  readonly label: string;
  readonly presentation: 'descriptive';
  readonly brightRadiusFeet: number;
  readonly additionalDimFeet: number;
  readonly origin: GridCell;
  readonly brightCells: readonly GridCell[];
  readonly dimCells: readonly GridCell[];
}

export type EncounterBoardBoundTarget =
  | {
      readonly kind: 'combatant';
      readonly id: CombatantId;
      readonly name: string;
      readonly position: GridCell;
    }
  | {
      readonly kind: 'object' | 'owned_object';
      readonly id: ObjectTargetId | WorldObjectId;
      readonly name: string;
      readonly position: GridCell;
    };

export interface EncounterBoardSustainedEffect {
  readonly effectId: EncounterEffectId;
  readonly owner: CombatantId;
  readonly ownerName: string;
  readonly spellId: string;
  readonly targetBinding: 'reselect' | 'bound_combatants' | 'bound_objects' | 'bound_owned_objects';
  readonly badge: string;
  readonly boundTargets: readonly EncounterBoardBoundTarget[];
  readonly activationAvailable: boolean;
}

export interface EncounterBoardTargetLine {
  readonly effectId: EncounterEffectId;
  readonly from: GridPoint;
  readonly to: GridPoint;
  readonly target: CombatantId | ObjectTargetId | WorldObjectId;
}

export interface EncounterBoardInitiativeEntry extends InitiativeEntry {
  readonly name: string;
  readonly active: boolean;
  readonly life: LifeState;
}

export type EncounterBoardLogEntry =
  | {
      readonly kind: 'roll';
      readonly sequence: number;
      readonly rollKind: 'initiative' | 'attack' | 'save' | 'ability_check' | 'death_save';
      readonly actor: CombatantId;
      readonly target: CombatantId | null;
      readonly faces: readonly number[];
      readonly total: number;
      readonly outcome: string;
      readonly branches: readonly {
        readonly target: CombatantId;
        readonly label: 'hit' | 'miss' | 'failure' | 'success';
      }[];
    }
  | {
      readonly kind: 'sustained_activation';
      readonly sequence: number;
      readonly caster: CombatantId;
      readonly effectId: EncounterEffectId;
      readonly spellId: string;
      readonly targets: readonly CombatantId[];
    }
  | {
      readonly kind: 'composition_refusal';
      readonly sequence: number;
      readonly caster: CombatantId;
      readonly spellId: string;
      readonly stepIndex: number;
      readonly reason: 'operation_refused' | 'encounter_rule_refusal';
      readonly propagation: 'abort' | 'continue';
    };

export interface DmEncounterBoardModel extends EncounterBoardProjectionShape {
  readonly combatants: readonly (EncounterBoardCombatant & { readonly life: LifeState })[];
  readonly initiative: readonly EncounterBoardInitiativeEntry[];
  readonly round: number;
  readonly activeCombatant: CombatantId | null;
  readonly foggedCells: readonly { readonly column: number; readonly row: number }[];
  readonly worldObjects: readonly EncounterBoardWorldObject[];
  readonly areas: readonly EncounterBoardArea[];
  readonly lightOverlays: readonly EncounterBoardLightOverlay[];
  readonly sustainedEffects: readonly EncounterBoardSustainedEffect[];
  readonly targetLines: readonly EncounterBoardTargetLine[];
  readonly log: readonly EncounterBoardLogEntry[];
}

export type EncounterBoardLayerRole = 'floor' | 'wall' | 'door' | 'shade' | 'terrain' | 'fog';

export interface EncounterBoardLayer {
  readonly role: EncounterBoardLayerRole;
  readonly assetId: AssetId;
}

export interface EncounterBoardTokenModel extends EncounterBoardPlacedCombatant {
  readonly assetId: AssetId;
  readonly focusAssetId: AssetId | null;
  readonly adjudicatedAssetId: AssetId | null;
  readonly life: LifeState;
  readonly marker: 'token' | 'corpse';
  readonly columnSpan: 1 | 2 | 3 | 4;
  readonly rowSpan: 1 | 2 | 3 | 4;
  readonly stackId: string;
  readonly stackIndex: number;
  readonly stackSize: number;
}

export interface EncounterBoardCellModel {
  readonly key: string;
  readonly column: number;
  readonly row: number;
  readonly layers: readonly EncounterBoardLayer[];
  readonly mechanicalLayers: readonly EncounterBoardMechanicalLayer[];
  readonly token: EncounterBoardTokenModel | null;
  readonly tokens: readonly EncounterBoardTokenModel[];
  readonly worldObjects: readonly EncounterBoardWorldObject[];
  readonly areas: readonly EncounterBoardArea[];
  readonly lightOverlays: readonly {
    readonly overlay: EncounterBoardLightOverlay;
    readonly level: 'bright' | 'dim';
  }[];
}

export type EncounterBoardMechanicalLayer =
  | { readonly kind: 'blocked' }
  | { readonly kind: 'difficult_terrain'; readonly regionId: string }
  | {
      readonly kind: 'obscurement';
      readonly regionId: string;
      readonly obscurement: EncounterBoardObscurementRegion['obscurement'];
    }
  | {
      readonly kind: 'illumination';
      readonly regionId: string;
      readonly level: EncounterBoardLightRegion['level'];
    };

function cellKey(cell: { readonly column: number; readonly row: number }): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

function cellsIntersect(left: readonly GridCell[], right: readonly GridCell[]): boolean {
  const rightKeys = new Set(right.map(cellKey));
  return left.some((cell) => rightKeys.has(cellKey(cell)));
}

function footprintSpan(cells: readonly [GridCell, ...GridCell[]]): 1 | 2 | 3 | 4 {
  const columns = cells.map((cell) => cell.column);
  const rows = cells.map((cell) => cell.row);
  const span = Math.max(
    Math.max(...columns) - Math.min(...columns) + 1,
    Math.max(...rows) - Math.min(...rows) + 1,
  );
  if (span === 1 || span === 2 || span === 3 || span === 4) return span;
  throw new TypeError('A board token footprint must span one through four cells.');
}

function allCells(bounds: EncounterState['bounds']): readonly GridCell[] {
  const cells: GridCell[] = [];
  for (let row = 0; row < bounds.rows; row += 1) {
    for (let column = 0; column < bounds.columns; column += 1) {
      cells.push({ column, row });
    }
  }
  return cells;
}

function combatantName(state: DmEncounterState, id: CombatantId): string {
  return state.combatants.find((entry) => entry.profile.id === id)?.profile.name ?? String(id);
}

function effectOrigin(template: AreaTemplate): GridCell {
  const point = template.shape === 'cube' ? template.template.center : template.template.origin;
  return { column: Math.floor(point.x / 5), row: Math.floor(point.y / 5) };
}

function radiusCells(
  state: DmEncounterState,
  origin: GridCell,
  radiusFeet: number,
): readonly GridCell[] {
  return affectedCells(
    { bounds: state.bounds, blockedCells: [] },
    {
      shape: 'sphere',
      template: {
        origin: feetPoint(origin.column * 5, origin.row * 5),
        radius: feet(radiusFeet),
      },
    },
  ).filter((cell) => isCellInside(state.bounds, cell));
}

function projectedLightOverlays(state: DmEncounterState): readonly EncounterBoardLightOverlay[] {
  return state.effects.flatMap((effect): readonly EncounterBoardLightOverlay[] => {
    if (effect.payload.kind !== 'daylight_area' || effect.payload.placement === 'selected_when_cast') {
      return [];
    }
    const origin = effectOrigin(effect.payload.placement);
    const brightCells = radiusCells(state, origin, effect.payload.brightRadiusFeet);
    const dimExtent = effect.payload.brightRadiusFeet + effect.payload.additionalDimFeet;
    const brightKeys = new Set(brightCells.map(cellKey));
    const dimCells = radiusCells(state, origin, dimExtent)
      .filter((cell) => !brightKeys.has(cellKey(cell)));
    return [{
      id: effect.id,
      source: effect.source,
      label: `Daylight — bright ${String(effect.payload.brightRadiusFeet)} ft; dim +${String(effect.payload.additionalDimFeet)} ft (descriptive)`,
      presentation: 'descriptive',
      brightRadiusFeet: effect.payload.brightRadiusFeet,
      additionalDimFeet: effect.payload.additionalDimFeet,
      origin,
      brightCells,
      dimCells,
    }];
  });
}

function projectedAreas(state: DmEncounterState): readonly EncounterBoardArea[] {
  const cells = allCells(state.bounds);
  const tokens = new Map(state.tokens.map((token) => [token.combatantId, token.position] as const));
  const objects = new Map(state.worldObjects.map((object) => [object.id, object.position] as const));
  const persistent = state.persistentAreas.map((area): EncounterBoardArea => {
    const anchor = area.origin.kind === 'anchored'
      ? tokens.get(area.origin.combatant) ?? null
      : area.origin.kind === 'anchored_to_object'
        ? objects.get(area.origin.object) ?? null
        : null;
    return {
      kind: 'persistent',
      id: area.id,
      owner: area.owner,
      ownerName: combatantName(state, area.owner),
      shape: area.shape,
      cells: cells.filter((cell) => persistentAreaContains(area, cell, anchor, state)),
      difficultTerrain: area.difficultTerrain,
    };
  });
  const movement = (state.environment.movementRegions ?? []).map((region): EncounterBoardArea => ({
    kind: 'movement_region',
    id: region.id,
    owner: region.source,
    ownerName: combatantName(state, region.source),
    shape: { kind: 'declared_cells' },
    cells: region.cells.map((cell) => ({ ...cell })),
    difficultTerrain: state.environment.difficultTerrainRegions.some(
      (candidate) => candidate.id === region.id,
    ),
    entry: region.entry,
  }));
  return [...persistent, ...movement];
}

function boundTargets(
  state: DmEncounterState,
  payload: Extract<EffectPayload, { readonly kind: 'sustained_effect' }>,
): readonly EncounterBoardBoundTarget[] {
  const combatants = payload.boundCombatants.flatMap(
    (id): readonly EncounterBoardBoundTarget[] => {
      const subject = state.combatants.find((entry) => entry.profile.id === id);
      const placed = state.tokens.find((entry) => entry.combatantId === id);
      return subject === undefined || placed === undefined ? [] : [{
        kind: 'combatant', id, name: subject.profile.name, position: { ...placed.position },
      }];
    },
  );
  const objects = [...payload.boundObjects, ...payload.ownedObjects].flatMap(
    (id): readonly EncounterBoardBoundTarget[] => {
      const object = state.worldObjects.find((entry) => entry.id === id);
      if (object === undefined) return [];
      return [{
        kind: payload.boundObjects.includes(id) ? 'object' : 'owned_object',
        id,
        name: object.name,
        position: { ...object.position },
      }];
    },
  );
  return [...combatants, ...objects];
}

function projectedSustainedEffects(
  state: DmEncounterState,
  pendingRequest: ControllerRequest | null,
): readonly EncounterBoardSustainedEffect[] {
  return state.effects.flatMap((effect): readonly EncounterBoardSustainedEffect[] => {
    if (effect.payload.kind !== 'sustained_effect') return [];
    const targets = boundTargets(state, effect.payload);
    const activationAvailable = pendingRequest?.actorId === effect.source &&
      pendingRequest.legalActions.actions.some(
        (action) => action.type === 'activate_sustained_effect' && action.effectId === effect.id,
      );
    return [{
      effectId: effect.id,
      owner: effect.source,
      ownerName: combatantName(state, effect.source),
      spellId: effect.payload.spellId,
      targetBinding: effect.payload.targetBinding,
      badge: effect.payload.targetBinding === 'reselect'
        ? `${effect.payload.spellId} — reselect on activation`
        : `${effect.payload.spellId} — bound`,
      boundTargets: targets,
      activationAvailable,
    }];
  });
}

function baseRoll(event: EncounterEvent): EncounterBoardLogEntry | null {
  switch (event.type) {
    case 'initiative_rolled':
      return { kind: 'roll', sequence: event.sequence, rollKind: 'initiative', actor: event.combatant, target: null, faces: event.faces, total: event.total, outcome: 'initiative', branches: [] };
    case 'initiative_block_rolled': {
      const actor = event.combatants[0];
      return actor === undefined ? null : { kind: 'roll', sequence: event.sequence, rollKind: 'initiative', actor, target: null, faces: event.faces, total: event.total, outcome: 'initiative_block', branches: [] };
    }
    case 'attack_resolved':
      return { kind: 'roll', sequence: event.sequence, rollKind: 'attack', actor: event.actor, target: event.target, faces: event.attack.roll.faces, total: event.attack.total, outcome: event.attack.outcome, branches: [] };
    case 'save_resolved':
      return { kind: 'roll', sequence: event.sequence, rollKind: 'save', actor: event.source, target: event.target, faces: event.save.roll.faces, total: event.save.total, outcome: event.save.outcome, branches: [] };
    case 'ability_check_resolved':
      return { kind: 'roll', sequence: event.sequence, rollKind: 'ability_check', actor: event.actor, target: null, faces: event.check.roll.faces, total: event.check.total, outcome: event.check.outcome, branches: [] };
    case 'death_save_resolved':
      return { kind: 'roll', sequence: event.sequence, rollKind: 'death_save', actor: event.combatant, target: event.combatant, faces: [event.roll], total: event.roll, outcome: event.outcome, branches: [] };
    default:
      return null;
  }
}

function projectedLog(events: readonly EncounterEvent[]): readonly EncounterBoardLogEntry[] {
  const entries: EncounterBoardLogEntry[] = [];
  const rollsByTarget = new Map<CombatantId, number[]>();
  for (const event of events) {
    const roll = baseRoll(event);
    if (roll !== null) {
      const index = entries.push(roll) - 1;
      if (roll.kind === 'roll' && roll.target !== null) {
        const indexes = rollsByTarget.get(roll.target) ?? [];
        indexes.push(index);
        rollsByTarget.set(roll.target, indexes);
      }
      continue;
    }
    if (event.type === 'shared_outcome_resolved') {
      const indexes = rollsByTarget.get(event.target) ?? [];
      const index = indexes.at(-1);
      const candidate = index === undefined ? undefined : entries[index];
      if (index !== undefined && candidate?.kind === 'roll') {
        entries[index] = {
          ...candidate,
          branches: [...candidate.branches, { target: event.target, label: event.branch }],
        };
      }
      continue;
    }
    if (event.type === 'sustained_effect_activated') {
      entries.push({
        kind: 'sustained_activation', sequence: event.sequence, caster: event.caster,
        effectId: event.effectId, spellId: event.spellId, targets: event.targets,
      });
      continue;
    }
    if (event.type === 'composition_step_resolved' && event.outcome === 'refused') {
      entries.push({
        kind: 'composition_refusal', sequence: event.sequence, caster: event.caster,
        spellId: event.spellId, stepIndex: event.stepIndex, reason: event.reason,
        propagation: event.propagation,
      });
    }
  }
  return entries;
}

export function projectEncounterBoard(
  view: DmView,
  pendingRequest: ControllerRequest | null = null,
  adjudicatedTargets: readonly CombatantId[] = [],
): DmEncounterBoardModel {
  const state = view.state;
  const hidden = new Set(state.hiddenCombatants.map((entry) => entry.combatant));
  const positions = new Map(state.tokens.map((token) => [token.combatantId, token.position] as const));
  const initiativeOrder = new Map(state.initiative.map((entry, index) =>
    [entry.combatant, index] as const));
  const combatants = state.combatants.flatMap((subject): readonly (EncounterBoardCombatant & { readonly life: LifeState })[] => {
    const pending = state.adjudicationPending.find((entry) =>
      entry.combatant === subject.profile.id);
    const creatureType = subject.profile.rules.creatureType;
    if (pending !== undefined) {
      return [{
        id: subject.profile.id,
        name: subject.profile.name,
        kind: subject.profile.kind,
        life: subject.life,
        hitPointBand: hitPointKnowledge(state, subject),
        hiddenFromPlayers: hidden.has(subject.profile.id),
        ...(creatureType === undefined ? {} : { creatureType }),
        placementStatus: 'placement_pending',
        pendingReason: pending.kind,
      }];
    }
    const position = positions.get(subject.profile.id);
    if (position === undefined) return [];
    const placedToken = state.tokens.find((token) => token.combatantId === subject.profile.id);
    if (placedToken === undefined) throw new Error('Placed board combatant has no placement mode.');
    const space = combatantSpace(state, subject.profile.id);
    return [{
      id: subject.profile.id,
      name: subject.profile.name,
      kind: subject.profile.kind,
      position: { ...position },
      life: subject.life,
      // ART-SEAM (D516): the DM board carries the prose classifier's band, never a re-derived one.
      hitPointBand: hitPointKnowledge(state, subject),
      hiddenFromPlayers: hidden.has(subject.profile.id),
      ...(creatureType === undefined ? {} : { creatureType }),
      placementStatus: 'placed',
      effectiveSize: space.actualSize,
      placementMode: structuredClone(placedToken.placementMode),
      footprint: space.cells.map((cell) => ({ ...cell })) as [GridCell, ...GridCell[]],
    }];
  }).sort((left, right) =>
    (initiativeOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (initiativeOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER) ||
    String(left.id).localeCompare(String(right.id)));
  const sustainedEffects = projectedSustainedEffects(state, pendingRequest);
  const targetLines = sustainedEffects.flatMap((effect): readonly EncounterBoardTargetLine[] => {
    if (effect.targetBinding === 'reselect') return [];
    if (!positions.has(effect.owner) || state.adjudicationPending.some((entry) =>
      entry.combatant === effect.owner)) return [];
    const sourceSpace = combatantSpace(state, effect.owner);
    return effect.boundTargets.map((target) => {
      const targetSpace = target.kind === 'combatant'
        ? combatantSpace(state, target.id)
        : (() => {
            const sized = sizedCombatantState('Medium');
            return creatureSpace(sized, placementFor(
              sized,
              target.position,
              normalPlacementFor(sized),
            ));
          })();
      const line = minimumSpaceLine(sourceSpace, targetSpace);
      return {
        effectId: effect.effectId,
        from: { ...line.sourceCenter },
        to: { ...line.targetCenter },
        target: target.id,
      };
    });
  });
  return {
    bounds: { ...state.bounds },
    blockedCells: state.blockedCells.map((cell) => ({ ...cell })),
    difficultTerrainRegions: state.environment.difficultTerrainRegions.map((region) => ({
      id: region.id,
      cells: region.cells.map((cell) => ({ ...cell })),
    })),
    obscurementRegions: state.environment.obscurementRegions.map((region) => ({
      id: region.id,
      cells: region.cells.map((cell) => ({ ...cell })),
      obscurement: region.obscurement,
    })),
    environmentLightRegions: state.environment.lightRegions.map((region) => ({
      id: region.id,
      cells: region.cells.map((cell) => ({ ...cell })),
      level: region.level,
    })),
    combatants,
    highlightedCombatant: state.activeCombatant,
    activeCombatant: state.activeCombatant,
    adjudicatedTargets: [...adjudicatedTargets],
    foggedCells: state.foggedCells.map((cell) => ({ ...cell })),
    round: state.round,
    initiative: state.initiative.map((entry) => {
      const subject = state.combatants.find((candidate) => candidate.profile.id === entry.combatant);
      if (subject === undefined) throw new Error(`Initiative references unknown combatant ${entry.combatant}.`);
      return {
        ...entry,
        name: subject.profile.name,
        active: state.activeCombatant === entry.combatant,
        life: subject.life,
      };
    }),
    worldObjects: state.worldObjects.map((object) => ({
      id: object.id,
      name: object.name,
      kind: object.kind,
      position: { ...object.position },
      cells: object.footprint.map((cell) => ({ ...cell })),
      blocking: { ...object.blocking },
      lightClass: object.kind === 'light-source' ? 'light-source' : 'none',
    })),
    areas: projectedAreas(state),
    lightOverlays: projectedLightOverlays(state),
    sustainedEffects,
    targetLines,
    log: projectedLog(state.eventLog),
  };
}

export function encounterBoardTokenRenderModels(
  projection: EncounterBoardProjectionShape,
  art: EncounterArtPackage,
): readonly EncounterBoardTokenModel[] {
  const placed = projection.combatants.filter(
    (combatant): combatant is EncounterBoardPlacedCombatant =>
      combatant.placementStatus === 'placed',
  );
  const roots = placed.map((_combatant, index) => index);
  const rootOf = (index: number): number => {
    let cursor = index;
    while (roots[cursor] !== cursor) cursor = roots[cursor] ?? cursor;
    return cursor;
  };
  for (let left = 0; left < placed.length; left += 1) {
    for (let right = left + 1; right < placed.length; right += 1) {
      const leftCombatant = placed[left];
      const rightCombatant = placed[right];
      if (leftCombatant === undefined || rightCombatant === undefined ||
        !cellsIntersect(leftCombatant.footprint, rightCombatant.footprint)) continue;
      const leftRoot = rootOf(left);
      const rightRoot = rootOf(right);
      if (leftRoot !== rightRoot) roots[rightRoot] = leftRoot;
    }
  }
  const membersByRoot = new Map<number, number[]>();
  placed.forEach((_combatant, index) => {
    const root = rootOf(index);
    const members = membersByRoot.get(root) ?? [];
    members.push(index);
    membersByRoot.set(root, members);
  });
  return Object.freeze(placed.map((combatant, index): EncounterBoardTokenModel => {
    const asset = art.combatantTokens[combatant.id];
    if (asset === undefined) throw new Error(`Art package ${art.id} has no token for ${combatant.id}.`);
    const root = rootOf(index);
    const members = membersByRoot.get(root) ?? [index];
    const rootCombatant = placed[members[0] ?? index];
    if (rootCombatant === undefined) throw new Error('Board token stack has no root combatant.');
    const life = combatant.life ?? 'living';
    const columnSpan = footprintSpan(combatant.footprint);
    const rowSpan = columnSpan;
    if (combatant.footprint.length !== columnSpan * rowSpan) {
      throw new TypeError(`Board token ${String(combatant.id)} has a non-rectangular footprint.`);
    }
    return Object.freeze({
      ...combatant,
      life,
      marker: life === 'dead' ? 'corpse' : 'token',
      // ART-SEAM (D516): the dead show the prone silhouette on a desaturated plate.
      assetId: life === 'dead' ? DEAD_TOKEN_ASSET_ID : asset,
      focusAssetId: combatant.id === projection.highlightedCombatant ? art.ui.activePc : null,
      adjudicatedAssetId: projection.adjudicatedTargets.includes(combatant.id)
        ? art.ui.adjudicated
        : null,
      columnSpan,
      rowSpan,
      stackId: String(rootCombatant.id),
      stackIndex: members.indexOf(index),
      stackSize: members.length,
    });
  }));
}

export function encounterBoardRenderModel(
  projection: EncounterBoardProjectionShape,
  art: EncounterArtPackage,
): readonly EncounterBoardCellModel[] {
  if (
    projection.bounds.columns !== art.room.columns ||
    projection.bounds.rows !== art.room.rows
  ) {
    throw new Error(`Encounter bounds do not match art package ${art.id}.`);
  }
  const combatants = new Map<string, EncounterBoardTokenModel[]>();
  for (const combatant of encounterBoardTokenRenderModels(projection, art)) {
    const key = cellKey(combatant.position);
    const occupants = combatants.get(key) ?? [];
    occupants.push(combatant);
    combatants.set(key, occupants);
  }
  const terrain = new Map(art.terrain.map((entry) => [cellKey(entry.cell), entry.asset] as const));
  const fog = new Set([
    ...(projection.foggedCells?.map(cellKey) ?? []),
    ...(projection.concealedCells?.map(cellKey) ?? []),
  ]);
  const worldObjects = projection.worldObjects ?? [];
  const areas = projection.areas ?? [];
  const lights = projection.lightOverlays ?? [];
  const blocked = new Set((projection.blockedCells ?? []).map(cellKey));
  const difficultTerrain = new Map<string, string[]>();
  for (const region of projection.difficultTerrainRegions ?? []) {
    for (const cell of region.cells) {
      const key = cellKey(cell);
      difficultTerrain.set(key, [...(difficultTerrain.get(key) ?? []), region.id]);
    }
  }
  const obscurement = new Map<string, EncounterBoardObscurementRegion[]>();
  for (const region of projection.obscurementRegions ?? []) {
    for (const cell of region.cells) {
      const key = cellKey(cell);
      obscurement.set(key, [...(obscurement.get(key) ?? []), region]);
    }
  }
  const illumination = new Map<string, EncounterBoardLightRegion[]>();
  for (const region of projection.environmentLightRegions ?? []) {
    for (const cell of region.cells) {
      const key = cellKey(cell);
      illumination.set(key, [...(illumination.get(key) ?? []), region]);
    }
  }
  const cells: EncounterBoardCellModel[] = [];
  // ART-SEAM (D516): the package names one floor/wall/door family; cells pick the member.
  const floorSet = floorSetFor(art.room.floor);
  const wallSet = wallSetFor(art.room.wall);
  const doorSet = doorSetFor(art.room.door);
  const doorSide = doorSideAt(art.room.doorCell.column, art.room.doorCell.row, projection.bounds);

  for (let row = 0; row < projection.bounds.rows; row += 1) {
    for (let column = 0; column < projection.bounds.columns; column += 1) {
      const key = cellKey({ column, row });
      const layers: EncounterBoardLayer[] = [
        { role: 'floor', assetId: floorSet.variants[floorVariantAt(column, row)] },
      ];
      const wallPiece = wallPieceAt(column, row, projection.bounds);
      if (wallPiece !== null) {
        layers.push(
          doorSide !== null && column === art.room.doorCell.column && row === art.room.doorCell.row
            ? { role: 'door', assetId: doorSet.pieces.closed[doorSide] }
            : { role: 'wall', assetId: wallSet.pieces[wallPiece] },
        );
      }
      for (const side of shadeSidesAt(column, row, projection.bounds)) {
        layers.push({ role: 'shade', assetId: SHADE_ASSETS[side] });
      }
      const terrainAsset = terrain.get(key);
      if (terrainAsset !== undefined) layers.push({ role: 'terrain', assetId: terrainAsset });
      if (fog.has(key)) layers.push({ role: 'fog', assetId: art.fog.hidden });
      const mechanicalLayers: EncounterBoardMechanicalLayer[] = [];
      if (blocked.has(key)) mechanicalLayers.push({ kind: 'blocked' });
      for (const regionId of difficultTerrain.get(key) ?? []) {
        mechanicalLayers.push({ kind: 'difficult_terrain', regionId });
      }
      for (const lit of illumination.get(key) ?? []) {
        mechanicalLayers.push({ kind: 'illumination', regionId: lit.id, level: lit.level });
      }
      for (const obscured of obscurement.get(key) ?? []) {
        mechanicalLayers.push({
          kind: 'obscurement',
          regionId: obscured.id,
          obscurement: obscured.obscurement,
        });
      }

      const tokens = combatants.get(key) ?? [];
      const cellObjects = worldObjects.filter((object) => object.cells.some((cell) => cellKey(cell) === key));
      const cellAreas = areas.filter((area) => area.cells.some((cell) => cellKey(cell) === key));
      const cellLights: Array<{
        readonly overlay: EncounterBoardLightOverlay;
        readonly level: 'bright' | 'dim';
      }> = [];
      for (const overlay of lights) {
        if (overlay.brightCells.some((cell) => cellKey(cell) === key)) {
          cellLights.push({ overlay, level: 'bright' });
        } else if (overlay.dimCells.some((cell) => cellKey(cell) === key)) {
          cellLights.push({ overlay, level: 'dim' });
        }
      }
      cells.push(Object.freeze({
        key,
        column,
        row,
        layers: Object.freeze(layers),
        mechanicalLayers: Object.freeze(mechanicalLayers),
        token: tokens[0] ?? null,
        tokens: Object.freeze(tokens),
        worldObjects: Object.freeze(cellObjects),
        areas: Object.freeze(cellAreas),
        lightOverlays: Object.freeze(cellLights),
      }));
    }
  }
  return Object.freeze(cells);
}
