/**
 * FOOTPRINT W5 (owner D900): a creature's whole body on the map is a type. Compiled by `tsc -b` (tsconfig.node.json
 * includes tests). Each @ts-expect-error below is a program that must not compile; if the type stopped biting,
 * the directive would be unused and tsc fails with TS2578. The control (FootprintAnchor as a plain BoardCell) is
 * the type mutant M-TYPE: it proves the type only.
 */
import type { AbsentToken, CombatToken, TokenFor } from '../../src/combat/combatant';
import type { EncounterState } from '../../src/combat/encounter';
import type { BoardCell, FootprintAnchor, GridCell } from '../../src/combat/grid';
import {
  assembleDecodedState,
  decodeAbsentTokens,
  movedToken,
  placedToken,
  type DecodedStateRest,
  type PlacementContext,
} from '../../src/combat/token-placement';

declare const context: PlacementContext;
declare const state: EncounterState;
declare const token: CombatToken;
declare const hugeToken: TokenFor<{ readonly kind: 'normal'; readonly actual: 'Huge' }>;
declare const squeezedHuge: TokenFor<{ readonly kind: 'squeezed'; readonly actual: 'Huge'; readonly sizedFor: 'Large' }>;
declare const boardCell: BoardCell;
declare const gridCell: GridCell;
declare const side1: FootprintAnchor<1>;
declare const side2: FootprintAnchor<2>;
declare const side3: FootprintAnchor<3>;
declare const absent: AbsentToken;
declare const hugeMode: { readonly kind: 'normal'; readonly actual: 'Huge' };
declare const rest: DecodedStateRest;
declare const loadedAbsent: unknown;

// Compiles: the mints, a banish (a board token is an absent token), a larger proof used as a smaller one.
export const minted: TokenFor<{ readonly kind: 'normal'; readonly actual: 'Huge' }> = placedToken(context, token, gridCell, hugeMode, 'W5');
export const moved: CombatToken = movedToken(context, token, gridCell, 'W5');
export const banished: AbsentToken = token;
export const threeAsTwo: FootprintAnchor<2> = side3;
export const twoAsOne: FootprintAnchor<1> = side2;
export const oneAsCell: BoardCell = side1;
export const squeezedHugeControlsLarge: FootprintAnchor<2> = squeezedHuge.position;
export const hugeTokenOnBoard: EncounterState = { ...state, tokens: [...state.tokens, hugeToken] };
export const decodedAbsentStaysAbsent: EncounterState = assembleDecodedState(rest, [], decodeAbsentTokens(context.bounds, loadedAbsent, 'W5'));

// Must not compile.
// @ts-expect-error a BoardCell is no whole-body proof: a token's anchor comes from a mint.
export const unproven: CombatToken = { ...token, position: boardCell };
// @ts-expect-error a 1x1 proof does not place a Huge body.
export const smallProofHugeBody: typeof hugeToken = { ...hugeToken, position: side1 };
// @ts-expect-error a mode of another size does not keep a smaller creature's proof.
export const remodedWithoutMint: CombatToken = { ...token, placementMode: hugeMode };
// @ts-expect-error a 1x1 proof is not a 3x3 proof.
export const oneAsThree: FootprintAnchor<3> = side1;
// @ts-expect-error an absent token returns to the board only through a mint.
export const unbanished: EncounterState = { ...state, tokens: [absent] };
// @ts-expect-error a GridCell literal is no token anchor.
export const literalAnchor: CombatToken = { ...token, position: { column: 1, row: 1 } };
// @ts-expect-error a squeezed Huge controls a Large (2x2) square: a 1x1 proof does not place it.
export const squeezedHugeOnOneCell: typeof squeezedHuge = { ...squeezedHuge, position: side1 };
// FOOTPRINT fix1 (codex r1 P1): a decoded absent token holds a return origin, no whole-body proof, so the decoder's
// output is no board token list, spread into a state or passed to the assembler's board argument.
// @ts-expect-error a decoded absent token (a Huge's edge return origin, say) is no board token.
export const decodedAbsentOnBoard: EncounterState = { ...state, tokens: decodeAbsentTokens(context.bounds, loadedAbsent, 'W5') };
// @ts-expect-error the assembler's board list takes proven tokens only, never a decoded absent list.
export const decodedAbsentAssembledOnBoard: EncounterState = assembleDecodedState(rest, decodeAbsentTokens(context.bounds, loadedAbsent, 'W5'), undefined);
