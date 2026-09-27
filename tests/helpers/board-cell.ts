import type { CombatToken } from '../../src/combat/combatant';
import type { SerializedPlacementMode } from '../../src/combat/creature-space';
import { boardCell, type BoardCell, type GridBounds, type GridCell } from '../../src/combat/grid';
import type { EncounterState } from '../../src/combat/encounter';
import {
  assembleDecodedState,
  decodeAbsentTokens,
  decodeBoardTokens,
  movedToken,
  placedToken,
  type DecodedStateRest,
  type PlacementContext,
} from '../../src/combat/token-placement';

/** A test's hand-placed cell, decoded as the engine decodes every movement anchor. */
export function onBoard(bounds: GridBounds, cell: GridCell): BoardCell {
  const decoded = boardCell(bounds, cell);
  if (decoded === null) throw new Error(`Test cell ${String(cell.column)},${String(cell.row)} is outside the grid.`);
  return decoded;
}

/**
 * A test's token moved to its hand-placed cell, in its own placement mode, minted by the engine's whole-body check
 * (token-placement.ts): a cell its body does not fit throws, as the reducers do. Tests never cast a token.
 */
export function movedTo(state: PlacementContext, token: CombatToken, cell: GridCell): CombatToken {
  return movedToken(state, token, cell, `Test token ${String(token.combatantId)}`);
}

/** A test's token placed at `anchor` in `mode` (a size or mode the test chose), minted by the same check. */
export function placedAt(
  state: PlacementContext,
  base: { readonly id: CombatToken['id']; readonly combatantId: CombatToken['combatantId'] },
  anchor: GridCell,
  mode: SerializedPlacementMode,
): CombatToken {
  return placedToken(state, base, anchor, mode, `Test token ${String(base.combatantId)}`);
}

/**
 * A state parsed from JSON with its tokens re-minted by the shared token decoder (JSON forgets every proof): the
 * placement part of every decoder, for a test's JSON round trip that needs no other validation.
 */
export function remintedState(parsed: unknown): EncounterState {
  const rest = parsed as DecodedStateRest;
  const raw = parsed as { readonly tokens: unknown; readonly absentTokens?: unknown };
  return assembleDecodedState(
    rest,
    decodeBoardTokens(rest, raw.tokens, 'Test state tokens'),
    raw.absentTokens === undefined ? undefined : decodeAbsentTokens(rest.bounds, raw.absentTokens, 'Test state absentTokens'),
  );
}
