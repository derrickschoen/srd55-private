import { effectiveCreatureSize, type SizeLensContext } from '../combat/combat-rules';
import {
  autoRelocatePlacement,
  creatureSpace,
  openingContainingSpace,
  placementFromSerialized,
  sizedCombatantState,
  spacesIntersect,
  type CreatureSpace,
  type NarrowOpeningRegion,
  type SerializedPlacementMode,
} from '../combat/creature-space';
import {
  awaitingPlacementPhase,
  orderedMigrationPlacementQueue,
  type CheckpointPlacement,
  type EncounterPhase,
  type InitiativeEntry,
  type MigrationAdjudicationPending,
  type ResumableEncounterPhase,
} from '../combat/encounter';
import { footprintAnchor, isCellInside, type GridBounds, type GridCell } from '../combat/grid';
import { terrainPassabilityAt, type TerrainState } from '../combat/terrain';
import { controlledSizeOf, footprintSideOf } from '../combat/token-placement';
import type { CombatantId, TokenId } from '../combat/values';
import { creatureSizes, type KnownCreatureSize } from '../domain/enums';

/**
 * FOOTPRINT: the v12 -> v13 session migration's state repair (owner rulings D900, D907 Q6, D919).
 *
 * v13 cannot express a creature body that leaves the map, a placement mode of another size, or a v12
 * Legendary Resistance checkpoint (an anchor without its mode). D919: a save holding one has its CURRENT state
 * repaired by the D514 rule and its old history archived verbatim; no old turn is re-interpreted. This module is
 * the state repair, a deterministic function of one plain-data v12 encounter state. It never builds an
 * EncounterState it cannot type, and it is the only module that constructs an `unknown_v12` checkpoint
 * (ast-grep rule no-unknown-v12-checkpoint).
 *
 * The repair, in token order:
 *   1. a board token whose mode is not of its effective size S is re-moded from geometry (D2): the modes of S
 *      (normal; squeezed when S can squeeze) whose body at its anchor is on the grid, on no movement-blocked
 *      square and, when squeezed, inside one matching narrow opening. Exactly one: that mode. Otherwise the
 *      mode is unknowable and the token goes to the DM (whole_body_placement_pending, placement_mode_unknown);
 *   2. a board token whose body leaves the grid is relocated by the D514 rule (autoRelocatePlacement: the
 *      nearest anchor by Chebyshev distance, then row-major), legal when on no movement-blocked square, inside
 *      a matching opening when squeezed, and clear of every other living body; with no legal anchor it goes to
 *      the DM (whole_body_placement_pending, no_whole_body_anchor);
 *   3. a pending v12 checkpoint's anchor A gets its mode by the same geometry at A for the size S of the
 *      checkpointed subject: one candidate is `recorded`; otherwise `unknown_v12` keeps A, S and the candidates,
 *      and a spend hands the creature to the DM. A mode is never guessed (plan r3 §10.5 D2/D3; D1, a history
 *      read, is dropped by D919).
 */

type JsonRecord = Readonly<Record<string, unknown>>;

export type PlacementRepair =
  | {
      readonly kind: 'relocated';
      readonly combatant: CombatantId;
      readonly from: GridCell;
      readonly to: GridCell;
      readonly placementMode: SerializedPlacementMode;
    }
  | {
      readonly kind: 're_moded';
      readonly combatant: CombatantId;
      readonly anchor: GridCell;
      readonly from: SerializedPlacementMode;
      readonly to: SerializedPlacementMode;
    }
  | {
      readonly kind: 'pending';
      readonly combatant: CombatantId;
      readonly reason: 'no_whole_body_anchor' | 'placement_mode_unknown';
      readonly from: GridCell;
      readonly size: KnownCreatureSize;
    }
  | {
      readonly kind: 'checkpoint_recorded';
      readonly combatant: CombatantId;
      readonly decisionId: string;
      readonly anchor: GridCell;
      readonly placementMode: SerializedPlacementMode;
    }
  | {
      readonly kind: 'checkpoint_unknown';
      readonly combatant: CombatantId;
      readonly decisionId: string;
      readonly anchor: GridCell;
      readonly size: KnownCreatureSize;
      readonly candidateModes: readonly SerializedPlacementMode[];
    };

interface PlainToken {
  readonly id: string;
  readonly combatantId: CombatantId;
  readonly position: GridCell;
  readonly placementMode: SerializedPlacementMode;
}

function record(value: unknown, label: string): JsonRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
  return value as JsonRecord;
}

function array(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array.`);
  return value;
}

function cellOf(value: unknown, label: string): GridCell {
  const cell = record(value, label);
  if (!Number.isSafeInteger(cell['column']) || !Number.isSafeInteger(cell['row'])) throw new TypeError(`${label} is not a grid cell.`);
  return { column: cell['column'] as number, row: cell['row'] as number };
}

function modeOf(value: unknown, label: string): SerializedPlacementMode {
  const mode = record(value, label);
  if ((mode['kind'] !== 'normal' && mode['kind'] !== 'squeezed') ||
    !creatureSizes.includes(mode['actual'] as KnownCreatureSize)) throw new TypeError(`${label} is not a placement mode.`);
  return structuredClone(mode) as unknown as SerializedPlacementMode;
}

function tokenOf(value: unknown, label: string): PlainToken {
  const token = record(value, label);
  if (typeof token['id'] !== 'string' || typeof token['combatantId'] !== 'string') throw new TypeError(`${label} is malformed.`);
  return {
    id: token['id'],
    combatantId: token['combatantId'] as CombatantId,
    position: cellOf(token['position'], `${label} position`),
    placementMode: modeOf(token['placementMode'], `${label} placementMode`),
  };
}

/** The modes a creature of `size` may take: normal, and squeezed into the next size down when there is one. */
export function placementModesOf(size: KnownCreatureSize): readonly SerializedPlacementMode[] {
  const index = creatureSizes.indexOf(size);
  const smaller = creatureSizes[index - 1];
  const normal = { kind: 'normal', actual: size } as SerializedPlacementMode;
  return smaller === undefined
    ? [normal]
    : [normal, { kind: 'squeezed', actual: size, sizedFor: smaller } as SerializedPlacementMode];
}

interface Geometry {
  readonly bounds: GridBounds;
  readonly terrain: TerrainState;
  readonly blockedRegionCells: ReadonlySet<string>;
  readonly openings: readonly NarrowOpeningRegion[];
}

function key(cell: GridCell): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

function geometryOf(state: JsonRecord): Geometry {
  const bounds = record(state['bounds'], 'state.bounds') as unknown as GridBounds;
  const environment = record(state['environment'], 'state.environment');
  const regions = Array.isArray(environment['movementRegions']) ? environment['movementRegions'] : [];
  const blockedRegionCells = new Set(regions.flatMap((region: unknown) => {
    const entry = record(region, 'movement region');
    return entry['entry'] === 'blocked' ? array(entry['cells'], 'movement region cells').map((cell) => key(cellOf(cell, 'region cell'))) : [];
  }));
  return {
    bounds,
    terrain: { blockedCells: array(state['blockedCells'], 'state.blockedCells'), worldObjects: array(state['worldObjects'], 'state.worldObjects') } as unknown as TerrainState,
    blockedRegionCells,
    openings: array(environment['narrowOpeningRegions'] ?? [], 'narrow openings') as unknown as readonly NarrowOpeningRegion[],
  };
}

function spaceOf(size: KnownCreatureSize, anchor: GridCell, mode: SerializedPlacementMode): CreatureSpace<KnownCreatureSize> {
  const sized = sizedCombatantState(size);
  return creatureSpace(sized, placementFromSerialized(sized, { anchor, mode }));
}

/** The createEncounter placement rules without occupancy: whole on the grid, off every blocked square, in its opening. */
function placeableAt(geometry: Geometry, space: CreatureSpace<KnownCreatureSize>): boolean {
  if (footprintAnchor(geometry.bounds, space.anchor, footprintSideOf(space.controlledAs)) === null) return false;
  if (space.cells.some((cell) => terrainPassabilityAt(geometry.terrain, cell) === 'blocked' || geometry.blockedRegionCells.has(key(cell)))) {
    return false;
  }
  return space.mode.kind !== 'squeezed' || openingContainingSpace(space, geometry.openings) !== null;
}

/** D2: the modes of `size` whose body at `anchor` obeys the placement rules. */
export function geometricModeCandidates(state: JsonRecord, size: KnownCreatureSize, anchor: GridCell): readonly SerializedPlacementMode[] {
  const geometry = geometryOf(state);
  if (!isCellInside(geometry.bounds, anchor)) return [];
  return placementModesOf(size).filter((mode) => placeableAt(geometry, spaceOf(size, anchor, mode)));
}

function lens(state: JsonRecord): SizeLensContext {
  return state as unknown as SizeLensContext;
}

function living(state: JsonRecord, id: CombatantId): boolean {
  const combatant = array(state['combatants'], 'state.combatants')
    .map((entry) => record(entry, 'combatant'))
    .find((entry) => record(entry['profile'], 'combatant profile')['id'] === id);
  return combatant !== undefined && combatant['life'] !== 'dead';
}

/**
 * Why a plain-data encounter state is not expressible in v13, as readable reasons; empty when it is. The v13
 * decoders refuse exactly these (token-placement.ts): a board body off the grid, a mode of another size, a v12
 * checkpoint.
 */
export function v13PlacementIssues(state: JsonRecord): readonly string[] {
  const issues: string[] = [];
  const bounds = record(state['bounds'], 'state.bounds') as unknown as GridBounds;
  for (const [index, raw] of array(state['tokens'], 'state.tokens').entries()) {
    const token = tokenOf(raw, `state.tokens[${String(index)}]`);
    const size = effectiveCreatureSize(lens(state), token.combatantId);
    if (token.placementMode.actual !== size) {
      issues.push(`${token.combatantId}: placement mode ${token.placementMode.actual} is not its size ${size}`);
    } else if (footprintAnchor(bounds, token.position, footprintSideOf(controlledSizeOf(token.placementMode))) === null) {
      issues.push(`${token.combatantId}: body at ${key(token.position)} leaves the ${String(bounds.columns)} x ${String(bounds.rows)} grid`);
    }
  }
  for (const raw of array(state['pendingDecisions'], 'state.pendingDecisions')) {
    const decision = record(raw, 'pending decision');
    if (decision['kind'] === 'legendary_resistance' && Object.hasOwn(record(decision['checkpoint'], 'checkpoint'), 'tokenPosition')) {
      issues.push(`${String(decision['id'])}: v12 legendary-resistance checkpoint`);
    }
  }
  return issues;
}

function pendingRecord(
  token: PlainToken,
  reason: 'no_whole_body_anchor' | 'placement_mode_unknown',
  size: KnownCreatureSize,
  candidateModes: readonly SerializedPlacementMode[],
): MigrationAdjudicationPending {
  return {
    kind: 'whole_body_placement_pending',
    combatant: token.combatantId,
    reason,
    formerAnchor: { ...token.position },
    size,
    candidateModes: candidateModes.map((mode) => ({ ...mode })),
    originatingToken: { id: token.id as TokenId, combatantId: token.combatantId, position: { ...token.position } },
  };
}

/**
 * The v13 state of a v12 state (D919's CURRENT-state repair), with every change it made. Deterministic: the
 * same input gives the same output. Throws only for data v12 itself could not have held (malformed fields).
 */
export function repairV12EncounterState(input: JsonRecord): { readonly state: JsonRecord; readonly repairs: readonly PlacementRepair[] } {
  const state = structuredClone(input) as Record<string, unknown>;
  const geometry = geometryOf(state);
  const repairs: PlacementRepair[] = [];
  const pending: MigrationAdjudicationPending[] = [];
  const tokens = array(state['tokens'], 'state.tokens').map((raw, index) => tokenOf(raw, `state.tokens[${String(index)}]`));
  const placed: PlainToken[] = [];
  const bodyOf = (token: PlainToken): CreatureSpace<KnownCreatureSize> =>
    spaceOf(token.placementMode.actual, token.position, token.placementMode);

  for (const [index, original] of tokens.entries()) {
    let token = original;
    const size = effectiveCreatureSize(lens(state), token.combatantId);
    if (token.placementMode.actual !== size) {
      const candidates = geometricModeCandidates(state, size, token.position);
      const only = candidates.length === 1 ? candidates[0] : undefined;
      if (only === undefined) {
        repairs.push({ kind: 'pending', combatant: token.combatantId, reason: 'placement_mode_unknown', from: { ...token.position }, size });
        pending.push(pendingRecord(token, 'placement_mode_unknown', size, candidates));
        continue;
      }
      repairs.push({ kind: 're_moded', combatant: token.combatantId, anchor: { ...token.position }, from: token.placementMode, to: only });
      token = { ...token, placementMode: only };
    }
    const side = footprintSideOf(controlledSizeOf(token.placementMode));
    if (footprintAnchor(geometry.bounds, token.position, side) === null) {
      // Against the bodies already placed and the ones still to come at their own anchors (token order).
      const others = [...placed, ...tokens.slice(index + 1)].filter((other) => living(state, other.combatantId));
      const sized = sizedCombatantState(size);
      const mode = placementFromSerialized(sized, { anchor: { column: 0, row: 0 }, mode: token.placementMode }).mode;
      const relocated = autoRelocatePlacement(sized, token.position, mode, geometry.bounds, (space) =>
        placeableAt(geometry, space) && others.every((other) => !spacesIntersect(space, bodyOf(other))));
      if (relocated.kind === 'refused') {
        repairs.push({ kind: 'pending', combatant: token.combatantId, reason: 'no_whole_body_anchor', from: { ...token.position }, size });
        pending.push(pendingRecord(token, 'no_whole_body_anchor', size, []));
        continue;
      }
      const to = { column: relocated.placement.anchor.column, row: relocated.placement.anchor.row };
      repairs.push({ kind: 'relocated', combatant: token.combatantId, from: { ...token.position }, to, placementMode: token.placementMode });
      token = { ...token, position: to };
    }
    placed.push(token);
  }

  const decisions = array(state['pendingDecisions'], 'state.pendingDecisions').map((raw) => {
    const decision = record(raw, 'pending decision');
    if (decision['kind'] !== 'legendary_resistance') return raw;
    const checkpoint = record(decision['checkpoint'], 'checkpoint');
    if (!Object.hasOwn(checkpoint, 'tokenPosition')) return raw;
    const { tokenPosition, ...rest } = checkpoint;
    const combatant = String(decision['combatant']) as CombatantId;
    let tokenPlacement: CheckpointPlacement | null = null;
    if (tokenPosition !== null) {
      const anchor = cellOf(tokenPosition, 'checkpoint tokenPosition');
      const subject = record(rest['subject'], 'checkpoint subject');
      const size = effectiveCreatureSize({ combatants: [subject], effects: array(rest['effects'], 'checkpoint effects') } as unknown as SizeLensContext, combatant);
      const candidates = geometricModeCandidates(state, size, anchor);
      const only = candidates.length === 1 ? candidates[0] : undefined;
      if (only === undefined) {
        tokenPlacement = { kind: 'unknown_v12', anchor, size, candidateModes: candidates };
        repairs.push({ kind: 'checkpoint_unknown', combatant, decisionId: String(decision['id']), anchor, size, candidateModes: candidates });
      } else {
        tokenPlacement = { kind: 'recorded', anchor, placementMode: only };
        repairs.push({ kind: 'checkpoint_recorded', combatant, decisionId: String(decision['id']), anchor, placementMode: only });
      }
    }
    return { ...decision, checkpoint: { ...rest, tokenPlacement } };
  });

  const pendingIds = new Set(pending.map((entry) => entry.combatant));
  const initiative = array(state['initiative'], 'state.initiative') as unknown as readonly InitiativeEntry[];
  const adjudicationPending = orderedMigrationPlacementQueue([
    ...(array(state['adjudicationPending'] ?? [], 'state.adjudicationPending') as unknown as readonly MigrationAdjudicationPending[]),
    ...pending,
  ], initiative);
  const phase = state['phase'] as EncounterPhase;
  const resumePhase: ResumableEncounterPhase = phase.kind === 'awaiting_placement' ? phase.resumePhase : phase;
  return {
    state: {
      ...state,
      tokens: placed.map((token) => ({ id: token.id, combatantId: token.combatantId, position: { ...token.position }, placementMode: { ...token.placementMode } })),
      pendingDecisions: decisions,
      ...(pending.length === 0
        ? {}
        : {
            adjudicationPending,
            sharedSpaceRelations: array(state['sharedSpaceRelations'] ?? [], 'state.sharedSpaceRelations').filter((relation) => {
              const entry = record(relation, 'shared-space relation');
              return !pendingIds.has(entry['first'] as CombatantId) && !pendingIds.has(entry['second'] as CombatantId);
            }),
            phase: awaitingPlacementPhase(adjudicationPending, initiative, resumePhase),
          }),
    },
    repairs,
  };
}
