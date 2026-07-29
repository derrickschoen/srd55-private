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
  isGuidedCreateParams,
  isGuidedOriginParams,
  isOriginKind,
  type GuidedBuildStateParams,
  type GuidedOriginOptionsParams,
} from '../../builder/contracts';
import {
  GuidedCreationRefusal,
  applyGuidedOrigin,
  createGuidedCharacter,
  guidedBuildState,
  listGuidedClassOptions,
  listGuidedOriginOptions,
} from '../../builder/guided-creation';
import { CharacterCommandIntegrity } from '../../commands/integrity';
import { RpcError } from '../../rpc/protocol';
import {
  defineRpcHandler,
  isEmptyParams,
  type RpcHandler,
} from '../handler';
import { COMMAND_INTEGRITY_KEY } from './commands';

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

/** Same rationale as above: only this module needs the structural guard. */
function isGuidedOriginOptionsParams(
  value: unknown,
): value is GuidedOriginOptionsParams {
  return hasExactKeys(value, ['kind']) && isOriginKind(value['kind']);
}

/**
 * The one translation from a domain refusal to the wire, shared by every
 * guided mutation so `createGuided` and `applyOrigin` cannot drift on the
 * `RevisionConflict` precedent: refusals become `handler_error` with the
 * seam's structured `GuidedRefusalData`; anything else stays bare.
 */
function translatingRefusals<T>(operation: () => T): T {
  try {
    return operation();
  } catch (error) {
    if (error instanceof GuidedCreationRefusal) {
      throw new RpcError('handler_error', error.message, {
        reason: error.reason,
      });
    }
    throw error;
  }
}

export const handlers: readonly RpcHandler[] = Object.freeze([
  defineRpcHandler(
    GUIDED_RPC.buildState,
    isGuidedBuildStateParams,
    (context, params) => guidedBuildState(context.db, params.character_id),
  ),
  defineRpcHandler(
    GUIDED_RPC.classOptions,
    isEmptyParams,
    (context) => listGuidedClassOptions(context.db),
  ),
  defineRpcHandler(
    GUIDED_RPC.create,
    isGuidedCreateParams,
    (context, params) =>
      translatingRefusals(() =>
        createGuidedCharacter(
          context.db,
          params,
          new CharacterCommandIntegrity(COMMAND_INTEGRITY_KEY),
        ),
      ),
  ),
  defineRpcHandler(
    GUIDED_RPC.originOptions,
    isGuidedOriginOptionsParams,
    (context, params) => listGuidedOriginOptions(context.db, params.kind),
  ),
  defineRpcHandler(
    GUIDED_RPC.applyOrigin,
    isGuidedOriginParams,
    (context, params) =>
      translatingRefusals(() => applyGuidedOrigin(context.db, params)),
  ),
]);
