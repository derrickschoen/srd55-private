import type { GridBounds, GridCell } from './grid';
import { isCellInside } from './grid';
import type { DamageRequest, DamageResponse, RollMode } from './resolution';
import type { ArmorClass, CombatantId, DamageType, WorldObjectId } from './values';

export const WORLD_OBJECT_KINDS = [
  'barrier',
  'cover',
  'door',
  'hazard',
  'light-source',
  'summoned-terrain',
  'generic',
] as const;

export type WorldObjectKind = (typeof WORLD_OBJECT_KINDS)[number];
export type CoverTier = 'none' | 'half' | 'three_quarters' | 'total';
export type LightLevel = 'bright' | 'dim' | 'darkness';

export type WorldObjectDurability =
  | {
      readonly kind: 'hit_points';
      readonly hitPoints: number;
      readonly maximumHitPoints: number;
    }
  | { readonly kind: 'indestructible' };

export interface WorldObjectBlocking {
  readonly movement: boolean;
  readonly lineOfSight: boolean;
  readonly cover: CoverTier;
}

export interface WorldObjectClassAction {
  readonly id: string;
  readonly label: string;
  readonly cost: 'action';
  readonly reach: 'adjacent';
  readonly uses: 'once';
  readonly eligibleActor: 'monster' | 'player_character' | 'either';
  readonly controllerPriority?: {
    readonly actor: CombatantId;
    readonly score: number;
  };
  readonly dmOverride?: {
    readonly actor: CombatantId;
    readonly reasoning: string;
  };
}

/** Footprint cells are absolute grid cells and always include position. */
export interface WorldObjectInput {
  readonly id: WorldObjectId;
  readonly name: string;
  readonly kind: WorldObjectKind;
  readonly position: GridCell;
  readonly footprint: readonly GridCell[];
  readonly durability: WorldObjectDurability;
  readonly armorClass: ArmorClass;
  readonly damageResponses: readonly {
    readonly type: DamageType;
    readonly response: DamageResponse;
  }[];
  readonly blocking: WorldObjectBlocking;
  readonly classActions?: readonly WorldObjectClassAction[];
}

export interface WorldObject extends WorldObjectInput {
  readonly createdRevision: number;
}

export interface EnvironmentRegion {
  readonly id: string;
  readonly cells: readonly GridCell[];
}

export interface LightRegion extends EnvironmentRegion {
  readonly level: LightLevel;
}

export interface ObscurementRegion extends EnvironmentRegion {
  readonly obscurement: 'light' | 'heavy' | 'magical_darkness';
}

export interface EncounterEnvironment {
  /** Later entries take precedence when light regions overlap. */
  readonly lightRegions: readonly LightRegion[];
  readonly difficultTerrainRegions: readonly EnvironmentRegion[];
  /** Subject-cell visibility regions; ray-intersection geometry is deliberately absent. */
  readonly obscurementRegions: readonly ObscurementRegion[];
  /** Imported movement hazards. Region ids are the stable execution tie-breaker. */
  readonly movementRegions?: readonly MovementRegion[];
}

export interface MovementRegion extends EnvironmentRegion {
  readonly source: CombatantId;
  readonly entry: 'allowed' | 'blocked';
  readonly damage: null | {
    readonly damageType: DamageType;
    readonly dice: { readonly count: number; readonly sides: 4 | 6 | 8 | 10 | 12 | 20; readonly modifier: number };
    readonly unitFeet: 5;
    /** SRD says "for every 5 feet" but does not specify partial increments. */
    readonly partialUnit: 'completed_units_only';
  };
}

export const EMPTY_ENCOUNTER_ENVIRONMENT: EncounterEnvironment = Object.freeze({
  lightRegions: Object.freeze([]),
  difficultTerrainRegions: Object.freeze([]),
  obscurementRegions: Object.freeze([]),
  movementRegions: Object.freeze([]),
});

export type WorldObjectChanges = Partial<Pick<
  WorldObjectInput,
  'name' | 'kind' | 'position' | 'footprint' | 'durability' | 'armorClass' | 'damageResponses' | 'blocking' | 'classActions'
>>;

export type WorldOperation =
  | { readonly kind: 'create_object'; readonly object: WorldObjectInput }
  | {
      readonly kind: 'modify_object';
      readonly objectId: WorldObjectId;
      readonly changes: WorldObjectChanges;
    }
  | {
      readonly kind: 'remove_object';
      readonly objectId: WorldObjectId;
      readonly reason: 'destroyed' | 'dismissed';
    }
  | {
      readonly kind: 'damage_object';
      readonly objectId: WorldObjectId;
      readonly delivery:
        | { readonly kind: 'area_effect' }
        | {
            readonly kind: 'attack';
            readonly attackBonus: number;
            readonly criticalFloor: number;
            readonly rollMode: RollMode;
          };
      readonly damage: DamageRequest;
    }
  | {
      readonly kind: 'transform_terrain';
      readonly region: EnvironmentRegion;
      readonly difficultTerrain: boolean;
    }
  | {
      readonly kind: 'set_light_level';
      readonly region: EnvironmentRegion;
      readonly level: LightLevel;
    }
  | {
      readonly kind: 'set_obscurement';
      readonly region: EnvironmentRegion;
      readonly obscurement: 'light' | 'heavy' | 'magical_darkness' | null;
    };

export interface WorldOperationRequest {
  readonly actor: CombatantId | null;
  readonly operation: WorldOperation;
}

function cellKey(cell: GridCell): string {
  return `${cell.column},${cell.row}`;
}

function assertRegion(bounds: GridBounds, region: EnvironmentRegion, label: string): void {
  if (region.id.trim().length === 0 || region.cells.length === 0) {
    throw new RangeError(`${label} requires a non-empty id and at least one cell.`);
  }
  const keys = region.cells.map(cellKey);
  if (new Set(keys).size !== keys.length || region.cells.some((cell) => !isCellInside(bounds, cell))) {
    throw new RangeError(`${label} cells must be unique and inside the encounter grid.`);
  }
}

export function assertWorldObjectInput(bounds: GridBounds, object: WorldObjectInput): void {
  if (object.name.trim().length === 0 || !isCellInside(bounds, object.position)) {
    throw new RangeError('A world object requires a name and an in-grid position.');
  }
  assertRegion(bounds, { id: String(object.id), cells: object.footprint }, 'World object footprint');
  if (!object.footprint.some((cell) => cellKey(cell) === cellKey(object.position))) {
    throw new RangeError('A world object footprint must include its position.');
  }
  if (!Number.isFinite(object.armorClass) || object.armorClass < 0) {
    throw new RangeError('World object Armor Class must be finite and non-negative.');
  }
  if (
    object.durability.kind === 'hit_points' &&
    (!Number.isSafeInteger(object.durability.maximumHitPoints) ||
      object.durability.maximumHitPoints < 1 ||
      !Number.isSafeInteger(object.durability.hitPoints) ||
      object.durability.hitPoints < 1 ||
      object.durability.hitPoints > object.durability.maximumHitPoints)
  ) {
    throw new RangeError('World object Hit Points must be positive safe integers within the maximum.');
  }
  const responseTypes = object.damageResponses.map((response) => response.type);
  if (new Set(responseTypes).size !== responseTypes.length) {
    throw new RangeError('World object damage responses must use unique damage types.');
  }
  const classActions = object.classActions ?? [];
  if (
    classActions.some((action) =>
      action.id.trim().length === 0 ||
      action.label.trim().length === 0 ||
      (action.controllerPriority !== undefined && !Number.isFinite(action.controllerPriority.score)) ||
      (action.dmOverride !== undefined && action.dmOverride.reasoning.trim().length === 0))
    || new Set(classActions.map((action) => action.id)).size !== classActions.length
  ) {
    throw new RangeError('World-object class actions require unique non-empty ids, labels, and valid control metadata.');
  }
}

export function assertEnvironmentRegion(bounds: GridBounds, region: EnvironmentRegion): void {
  assertRegion(bounds, region, 'Environment region');
}

export function worldObjectAtCell(
  objects: readonly WorldObject[],
  cell: GridCell,
): readonly WorldObject[] {
  const key = cellKey(cell);
  return objects.filter((object) => object.footprint.some((candidate) => cellKey(candidate) === key));
}

export function environmentLightAt(
  environment: EncounterEnvironment,
  cell: GridCell,
): LightLevel {
  const key = cellKey(cell);
  for (let index = environment.lightRegions.length - 1; index >= 0; index -= 1) {
    const region = environment.lightRegions[index];
    if (region?.cells.some((candidate) => cellKey(candidate) === key)) return region.level;
  }
  return 'bright';
}

export function environmentObscurementAt(
  environment: EncounterEnvironment,
  cell: GridCell,
): ObscurementRegion['obscurement'] | null {
  const key = cellKey(cell);
  for (let index = environment.obscurementRegions.length - 1; index >= 0; index -= 1) {
    const region = environment.obscurementRegions[index];
    if (region?.cells.some((candidate) => cellKey(candidate) === key)) return region.obscurement;
  }
  return null;
}

export function isEnvironmentDifficultTerrain(
  environment: EncounterEnvironment,
  cell: GridCell,
): boolean {
  const key = cellKey(cell);
  return environment.difficultTerrainRegions.some((region) =>
    region.cells.some((candidate) => cellKey(candidate) === key));
}
