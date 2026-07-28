/**
 * GUIDED-BUILDER RPC HANDLERS.
 *
 * A NEW module rather than an addition to `queries.ts`, so the guided path and
 * the blank-create path cannot collide in one file — the registry discovers
 * every `./handlers/**` module and throws on a duplicate method name, which is
 * the guarantee that this stays beside `queries.characters.create` and never
 * replaces it (D42 keeps blank creation).
 *
 * Method names, params and result shapes come from the seam
 * (`src/builder/contracts.ts`) — nothing here invents a name the test side
 * would have to guess at.
 */

import {
  GUIDED_RPC,
  hasExactKeys,
  type GuidedBuildStateParams,
} from '../../builder/contracts';
import { guidedBuildState } from '../../builder/guided-creation';
import { defineRpcHandler, type RpcHandler } from '../handler';

/**
 * Not in the seam because the seam pins only what BOTH agents must agree on;
 * the registry turns a validator failure into `invalid_params` before any
 * handler runs, so only this module needs the guard. The integer idiom matches
 * the seam's `isGuidedOriginParams` character-id check exactly.
 */
function isGuidedBuildStateParams(
  value: unknown,
): value is GuidedBuildStateParams {
  if (!hasExactKeys(value, ['character_id'])) {
    return false;
  }
  const characterId = value['character_id'];
  return (
    typeof characterId === 'number' &&
    Number.isInteger(characterId) &&
    characterId > 0
  );
}

export const handlers: readonly RpcHandler[] = Object.freeze([
  defineRpcHandler(
    GUIDED_RPC.buildState,
    isGuidedBuildStateParams,
    (context, params) => guidedBuildState(context.db, params.character_id),
  ),
]);
