import type { Ability } from '../domain/enums';
import type { ConditionName } from './conditions';
import type { EffectPayload } from './effects';
import type { GridCell } from './grid';
import type { DamageRequest, RollMode } from './resolution';
import { affectedCells, creatureOccupiesAffectedCell, feetPoint, type AreaTemplate, type Direction, type FeetPoint } from './templates';
import { feet, type CombatantId, type Feet, type PersistentAreaId } from './values';

export type PersistentAreaOrigin =
  | { readonly kind: 'fixed'; readonly point: FeetPoint }
  | { readonly kind: 'anchored'; readonly combatant: CombatantId };

export type PersistentAreaShape =
  | { readonly kind: 'sphere'; readonly radius: Feet }
  | { readonly kind: 'cube'; readonly size: Feet }
  | { readonly kind: 'cylinder'; readonly radius: Feet; readonly height: Feet }
  | { readonly kind: 'line'; readonly length: Feet; readonly width: Feet; readonly direction: Direction }
  | { readonly kind: 'emanation'; readonly radius: Feet };

export type PersistentAreaDuration =
  | { readonly kind: 'rounds'; readonly remaining: number }
  | { readonly kind: 'concentration'; readonly remaining: number };

export type PersistentAreaHook =
  | 'on_enter'
  | 'on_start_of_turn_inside'
  | 'on_end_of_turn_inside'
  | 'on_exit';

export type PersistentAreaTargetFilter =
  | { readonly kind: 'all' }
  | { readonly kind: 'allies' }
  | { readonly kind: 'enemies' }
  | { readonly kind: 'selected'; readonly combatants: readonly CombatantId[] };

export type PersistentAreaAppliedPayload = Extract<EffectPayload,
  | { readonly kind: 'condition' }
  | { readonly kind: 'skill_modifier' }
  | { readonly kind: 'ability_check_modifier' }
  | { readonly kind: 'attack_roll_modifier' }
  | { readonly kind: 'saving_throw_modifier' }
  | { readonly kind: 'armor_class_modifier' }
  | { readonly kind: 'movement_modifier' }
>;

export type PersistentAreaEffectLifetime =
  | { readonly kind: 'while_inside' }
  | { readonly kind: 'area_duration' }
  | { readonly kind: 'fixed_rounds'; readonly rounds: number; readonly boundary: 'start' | 'end' }
  | { readonly kind: 'save_ends'; readonly boundary: 'start' | 'end' };

export type PersistentAreaEffectPayload =
  | { readonly kind: 'damage'; readonly damage: DamageRequest }
  | {
      readonly kind: 'effect';
      readonly payload: PersistentAreaAppliedPayload;
      readonly lifetime: PersistentAreaEffectLifetime;
    };

export type PersistentAreaEffectSpec =
  | {
      readonly kind: 'automatic';
      readonly payload: PersistentAreaEffectPayload;
    }
  | {
      readonly kind: 'save_gated';
      readonly ability: Ability;
      readonly dc: number;
      readonly rollMode: RollMode;
      readonly onSuccess: 'none' | 'half';
      readonly payload: PersistentAreaEffectPayload;
    };

export interface PersistentAreaHookSpec {
  readonly hook: PersistentAreaHook;
  /** A spec can intentionally combine entry/end triggers but still resolve once on a turn. */
  readonly frequency: 'once_per_turn' | 'every_trigger';
  readonly effect: PersistentAreaEffectSpec;
}

export interface PersistentAreaInput {
  readonly owner: CombatantId;
  readonly origin: PersistentAreaOrigin;
  readonly shape: PersistentAreaShape;
  readonly duration: PersistentAreaDuration;
  readonly targetFilter: PersistentAreaTargetFilter;
  readonly difficultTerrain: boolean;
  readonly hooks: readonly PersistentAreaHookSpec[];
  readonly movable: null | { readonly maximumFeet: Feet };
}

export interface PersistentArea extends PersistentAreaInput {
  readonly id: PersistentAreaId;
  readonly sequence: number;
  /** Physically present creatures, sorted by CombatantId for replay stability. */
  readonly members: readonly CombatantId[];
  /** Once-per-turn hook keys already consumed during the current turn. */
  readonly consumedTurnKeys: readonly string[];
}

export function combatantCenter(cell: GridCell): FeetPoint {
  // A grid intersection on the creature's space is valid for every supported
  // template shape, including shapes whose placeable centers must be snapped.
  return feetPoint(cell.column * 5, cell.row * 5);
}

export function persistentAreaTemplate(area: PersistentArea, anchorCell: GridCell | null): AreaTemplate {
  const point = area.origin.kind === 'fixed'
    ? area.origin.point
    : anchorCell === null
      ? (() => { throw new RangeError(`Persistent area ${area.id} has no anchor token.`); })()
      : combatantCenter(anchorCell);
  switch (area.shape.kind) {
    case 'sphere':
      return { shape: 'sphere', template: { origin: point, radius: area.shape.radius } };
    case 'cube': {
      const half = area.shape.size / 2;
      return {
        shape: 'cube',
        template: {
          origin: feetPoint(point.x - half, point.y),
          center: point,
          axis: { x: 1, y: 0 },
          size: area.shape.size,
          includeOrigin: true,
        },
      };
    }
    case 'cylinder':
      return { shape: 'cylinder', template: { origin: point, radius: area.shape.radius, height: area.shape.height } };
    case 'line':
      return {
        shape: 'line',
        template: {
          origin: point,
          direction: area.shape.direction,
          length: area.shape.length,
          width: area.shape.width,
          includeOrigin: true,
        },
      };
    case 'emanation':
      return { shape: 'emanation', template: { origin: point, radius: area.shape.radius, includeOrigin: true } };
  }
}

export function persistentAreaContains(
  area: PersistentArea,
  cell: GridCell,
  anchorCell: GridCell | null,
  grid: { readonly bounds: { readonly columns: number; readonly rows: number }; readonly blockedCells: readonly GridCell[] },
): boolean {
  return creatureOccupiesAffectedCell(
    [cell],
    affectedCells(grid, persistentAreaTemplate(area, anchorCell)),
  );
}

export function feetShape(template: AreaTemplate): PersistentAreaShape {
  switch (template.shape) {
    case 'sphere': return { kind: 'sphere', radius: template.template.radius };
    case 'cube': return { kind: 'cube', size: template.template.size };
    case 'cylinder': return { kind: 'cylinder', radius: template.template.radius, height: template.template.height };
    case 'line': return { kind: 'line', length: template.template.length, width: template.template.width, direction: template.template.direction };
    case 'emanation': return { kind: 'emanation', radius: template.template.radius };
    case 'cone':
      throw new RangeError('Persistent areas do not support cone shapes.');
  }
}

export function fixedOrigin(template: AreaTemplate): PersistentAreaOrigin {
  if (template.shape === 'cube') return { kind: 'fixed', point: template.template.center };
  return { kind: 'fixed', point: template.template.origin };
}

export function areaFeet(value: number): Feet {
  return feet(value);
}
