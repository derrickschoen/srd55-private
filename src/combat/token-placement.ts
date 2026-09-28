import { creatureSizes, type KnownCreatureSize } from '../domain/enums';
import { CreatureSizeRuleError, effectiveCreatureSize, type SizeLensContext } from './combat-rules';
import type { AbsentToken, CombatToken, TokenFor } from './combatant';
import type { SerializedPlacementMode } from './creature-space';
import type { EncounterState } from './encounter';
import { EncounterRuleError } from './encounter-rule-error';
import {
  footprintAnchor,
  OffGridAnchorError,
  OffGridBodyError,
  requireBoardCell,
  boardCell,
  type FootprintAnchor,
  type FootprintSide,
  type GridBounds,
  type GridCell,
} from './grid';
import type { CombatantId, TokenId } from './values';

/**
 * FOOTPRINT (owner D900): a creature's whole body is on the map, and a program that places one past the
 * edge does not compile. This module and grid.ts are the only places a placement proof is minted
 * (ast-grep rule no-placement-proof-cast); every token on a board is built here, checked in this order:
 *   1. the anchor is a cell of the grid (OffGridAnchorError);
 *   2. the mode's actual size is the combatant's effective size (CreatureSizeRuleError placement_size_mismatch);
 *   3. the square the mode controls (its `sizedFor` size when squeezed) lies wholly on the grid (OffGridBodyError).
 */

/** What a placement is checked against: the grid, and what the size lens reads. */
export interface PlacementContext extends SizeLensContext {
  readonly bounds: GridBounds;
}

/** The side of the square a creature of `size` controls (D511). */
export function footprintSideOf(size: KnownCreatureSize): FootprintSide {
  switch (size) {
    case 'Tiny':
    case 'Small':
    case 'Medium': return 1;
    case 'Large': return 2;
    case 'Huge': return 3;
    case 'Gargantuan': return 4;
  }
}

/** The size a placement mode controls: its `sizedFor` size when squeezed, else its actual size. */
export function controlledSizeOf(mode: SerializedPlacementMode): KnownCreatureSize {
  return mode.kind === 'squeezed' ? mode.sizedFor : mode.actual;
}

type Checked =
  | { readonly kind: 'placed'; readonly anchor: FootprintAnchor<FootprintSide> }
  | { readonly kind: 'anchor_off_grid' }
  | { readonly kind: 'body_off_grid'; readonly side: FootprintSide; readonly size: KnownCreatureSize };

function checkPlacement(
  context: PlacementContext,
  combatantId: CombatantId,
  anchor: GridCell,
  mode: SerializedPlacementMode,
): Checked {
  if (boardCell(context.bounds, anchor) === null) return { kind: 'anchor_off_grid' };
  if (mode.actual !== effectiveCreatureSize(context, combatantId)) {
    throw new CreatureSizeRuleError('placement_size_mismatch', combatantId);
  }
  const size = controlledSizeOf(mode);
  const side = footprintSideOf(size);
  const proof = footprintAnchor(context.bounds, anchor, side);
  return proof === null ? { kind: 'body_off_grid', side, size } : { kind: 'placed', anchor: proof };
}

function placedOrThrow(
  context: PlacementContext,
  combatantId: CombatantId,
  anchor: GridCell,
  mode: SerializedPlacementMode,
  label: string,
): FootprintAnchor<FootprintSide> {
  const checked = checkPlacement(context, combatantId, anchor, mode);
  switch (checked.kind) {
    case 'placed': return checked.anchor;
    case 'anchor_off_grid': throw new OffGridAnchorError(`${label} anchor`, anchor, context.bounds);
    case 'body_off_grid':
      throw new OffGridBodyError(label, { column: anchor.column, row: anchor.row }, checked.side, checked.size, context.bounds);
  }
}

/**
 * A token placed at `anchor` in `mode`: a creature entering the board (createEncounter, a summon, a
 * return from banishment, a DM placement) or taking a new mode (a size change, an LR restore).
 * Throws OffGridAnchorError, CreatureSizeRuleError or OffGridBodyError, in that order.
 */
export function placedToken<M extends SerializedPlacementMode>(
  context: PlacementContext,
  base: { readonly id: TokenId; readonly combatantId: CombatantId },
  anchor: GridCell,
  mode: M,
  label: string,
): TokenFor<M> {
  const position = placedOrThrow(context, base.combatantId, anchor, mode, label);
  return { id: base.id, combatantId: base.combatantId, placementMode: { ...mode }, position } as unknown as TokenFor<M>;
}

/** placedToken, but null when the anchor or the body leaves the grid; a mode/size mismatch still throws. */
export function placedTokenOrNull<M extends SerializedPlacementMode>(
  context: PlacementContext,
  base: { readonly id: TokenId; readonly combatantId: CombatantId },
  anchor: GridCell,
  mode: M,
): TokenFor<M> | null {
  const checked = checkPlacement(context, base.combatantId, anchor, mode);
  return checked.kind !== 'placed'
    ? null
    : { id: base.id, combatantId: base.combatantId, placementMode: { ...mode }, position: checked.anchor } as unknown as TokenFor<M>;
}

/** The same token, in the same mode, at `anchor`: a move, a teleport, a forced push, a hypothetical state. */
export function movedToken(context: PlacementContext, token: CombatToken, anchor: GridCell, label: string): CombatToken {
  return placedToken(context, token, anchor, token.placementMode, label);
}

/** movedToken, but null when the anchor or the body leaves the grid (a push stops there). */
export function movedTokenOrNull(context: PlacementContext, token: CombatToken, anchor: GridCell): CombatToken | null {
  return placedTokenOrNull(context, token, anchor, token.placementMode);
}

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
  return value as Readonly<Record<string, unknown>>;
}

/** A loaded placement mode, checked to be one SerializedPlacementMode (a squeeze is into the next size down). */
export function decodePlacementMode(value: unknown, label: string): SerializedPlacementMode {
  const mode = record(value, label);
  const actual = mode['actual'];
  if (typeof actual !== 'string' || !creatureSizes.includes(actual as KnownCreatureSize)) {
    throw new TypeError(`${label} has no known actual size.`);
  }
  const actualIndex = creatureSizes.indexOf(actual as KnownCreatureSize);
  if (mode['kind'] === 'normal') return { kind: 'normal', actual } as SerializedPlacementMode;
  if (mode['kind'] === 'squeezed' && actualIndex > 0 && mode['sizedFor'] === creatureSizes[actualIndex - 1]) {
    return { kind: 'squeezed', actual, sizedFor: mode['sizedFor'] } as SerializedPlacementMode;
  }
  throw new TypeError(`${label} is not a normal placement or a squeeze into the next smaller size.`);
}

/**
 * The shared board-token decoder of every decoder (codec, session revision, rollout, replay, canonical
 * state): each loaded token is checked by the three placement checks against the decoded state's own grid,
 * sizes and effects, and returned with its minted anchor. `label` names the list, as `${label}[i]`.
 * Throws TypeError when `tokens` is not an array of token records.
 */
export function decodeBoardTokens(context: PlacementContext, tokens: unknown, label: string): readonly CombatToken[] {
  if (!Array.isArray(tokens)) throw new TypeError(`${label} must be an array.`);
  return tokens.map((token: unknown, index): CombatToken => {
    const at = `${label}[${String(index)}]`;
    const loaded = typeof token === 'object' && token !== null ? token as Readonly<Record<string, unknown>> : {};
    // A token that is not an object has no anchor, and the anchor check refuses it first.
    const anchor = requireBoardCell(context.bounds, loaded['position'], `${at} anchor`);
    const combatantId = loaded['combatantId'];
    if (typeof combatantId !== 'string') throw new TypeError(`${at} has no combatant id.`);
    const mode = decodePlacementMode(loaded['placementMode'], `${at} placementMode`);
    const position = placedOrThrow(context, combatantId as CombatantId, anchor, mode, at);
    return { ...loaded, placementMode: mode, position } as unknown as CombatToken;
  });
}

/**
 * The absent-token decoder: a banished creature's token holds its return origin, an anchor cell of the
 * grid, not a placed body (its body is checked when it returns, by placedToken). It mints AbsentTokens: their
 * anchor is a BoardCell, no whole-body proof, so a decoded absent token does not compile into an
 * EncounterState's `tokens` (FOOTPRINT fix1, codex r1 P1). Each is checked in this order: the anchor is a cell of
 * the grid (OffGridAnchorError); it has a token id and a combatant id; its placement mode is one
 * SerializedPlacementMode (TypeError). Every other loaded field is kept, as decodeBoardTokens keeps it, so the
 * decoded revision still hashes to its checksum.
 */
export function decodeAbsentTokens(bounds: GridBounds, tokens: unknown, label: string): readonly AbsentToken[] {
  if (!Array.isArray(tokens)) throw new TypeError(`${label} must be an array.`);
  return tokens.map((token: unknown, index): AbsentToken => {
    const at = `${label}[${String(index)}]`;
    const loaded = typeof token === 'object' && token !== null ? token as Readonly<Record<string, unknown>> : {};
    const position = requireBoardCell(bounds, loaded['position'], `${at} anchor`);
    const id = loaded['id'];
    const combatantId = loaded['combatantId'];
    if (typeof id !== 'string') throw new TypeError(`${at} has no token id.`);
    if (typeof combatantId !== 'string') throw new TypeError(`${at} has no combatant id.`);
    const absent: AbsentToken = {
      id: id as TokenId,
      combatantId: combatantId as CombatantId,
      position,
      placementMode: decodePlacementMode(loaded['placementMode'], `${at} placementMode`),
    };
    return { ...loaded, ...absent };
  });
}

/**
 * A pending Legendary Resistance decision saved by v12: its checkpoint holds the token's anchor alone, and a
 * spend could not restore a mode it never recorded (FOOTPRINT §6.3). Only the v12 -> v13 session migration reads
 * one (session-v13-migration.ts); every decoder refuses it.
 */
export class V12CheckpointError extends EncounterRuleError {
  override readonly name = 'V12CheckpointError' as const;

  constructor(readonly label: string, readonly decisionId: string) {
    super('validation',
      `${label}: pending decision ${decisionId} holds a v12 legendary-resistance checkpoint (an anchor without its placement mode).`);
  }
}

function isCell(value: unknown): boolean {
  return typeof value === 'object' && value !== null &&
    Number.isSafeInteger(Reflect.get(value, 'column')) && Number.isSafeInteger(Reflect.get(value, 'row'));
}

/**
 * Every legendary_resistance checkpoint of `pendingDecisions` carries a v13 tokenPlacement: null, `recorded`
 * (an anchor and a placement mode) or `unknown_v12` (an anchor, a size and the candidate modes). Throws
 * V12CheckpointError for a v12 checkpoint, TypeError for any other shape.
 */
export function assertV13Checkpoints(pendingDecisions: unknown, label: string): void {
  if (!Array.isArray(pendingDecisions)) throw new TypeError(`${label} pending decisions must be an array.`);
  for (const decision of pendingDecisions) {
    if (typeof decision !== 'object' || decision === null || Reflect.get(decision, 'kind') !== 'legendary_resistance') continue;
    const id = String(Reflect.get(decision, 'id'));
    const checkpoint: unknown = Reflect.get(decision, 'checkpoint');
    if (typeof checkpoint !== 'object' || checkpoint === null) throw new TypeError(`${label}: decision ${id} has no checkpoint.`);
    if (Object.hasOwn(checkpoint, 'tokenPosition')) throw new V12CheckpointError(label, id);
    const placement: unknown = Reflect.get(checkpoint, 'tokenPlacement');
    if (placement === null) continue;
    const kind = typeof placement === 'object' ? Reflect.get(placement, 'kind') : undefined;
    const valid = typeof placement === 'object' && isCell(Reflect.get(placement, 'anchor')) && (
      (kind === 'recorded' && typeof Reflect.get(placement, 'placementMode') === 'object') ||
      (kind === 'unknown_v12' && creatureSizes.includes(Reflect.get(placement, 'size') as KnownCreatureSize) &&
        Array.isArray(Reflect.get(placement, 'candidateModes'))));
    if (!valid) throw new TypeError(`${label}: decision ${id} has a malformed checkpoint placement.`);
  }
}

/** A decoded state without its token lists: a decoder's validated rest, which holds no placement proof. */
export type DecodedStateRest = Omit<EncounterState, 'tokens' | 'absentTokens'>;

/**
 * The only way a decoder builds an EncounterState: its validated rest plus token lists that came from
 * decodeBoardTokens (board tokens, each with its whole-body proof) and decodeAbsentTokens (absent tokens, which
 * carry none and so cannot be passed as `tokens`). A raw token list the rest still carries is replaced in place,
 * and a raw absent list is dropped when none was decoded.
 */
export function assembleDecodedState(
  rest: DecodedStateRest,
  tokens: readonly CombatToken[],
  absentTokens: readonly AbsentToken[] | undefined,
): EncounterState {
  assertV13Checkpoints(rest.pendingDecisions, 'Decoded encounter state');
  const assembled: Record<string, unknown> = { ...rest, tokens };
  if (absentTokens === undefined) delete assembled['absentTokens'];
  else assembled['absentTokens'] = absentTokens;
  return assembled as unknown as EncounterState;
}
