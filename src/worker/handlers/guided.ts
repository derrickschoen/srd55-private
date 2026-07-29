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
  EQUIPMENT_RPC,
  GUIDED_RPC,
  hasExactKeys,
  isGuidedApplyEquipmentParams,
  isGuidedCreateParams,
  isGuidedFillSkillGrantParams,
  isGuidedOriginParams,
  isOriginKind,
  type AbilityAllocationMethod,
  type GuidedAllocateAbilitiesParams,
  type GuidedBuildStateParams,
  type GuidedOriginOptionsParams,
} from '../../builder/contracts';
import {
  BACKGROUND_RPC,
  isGuidedApplyBackgroundParams,
} from '../../builder/background-choices';
import {
  EquipmentStepRefusal,
  applyGuidedEquipment,
  guidedEquipmentStepState,
} from '../../builder/equipment-step';
import { EquipmentGrantRefusal } from '../../grants/equipment-grants';
import {
  GuidedCreationRefusal,
  allocateGuidedAbilities,
  applyGuidedBackgroundChoices,
  applyGuidedOrigin,
  createGuidedCharacter,
  fillGuidedSkillGrant,
  guidedBuildState,
  guidedSkillsStepState,
  listGuidedBackgroundChoiceOptions,
  listGuidedClassOptions,
  listGuidedOriginOptions,
} from '../../builder/guided-creation';
import { SkillGrantRefusal } from '../../grants/skill-grants';
import { CharacterCommandIntegrity } from '../../commands/integrity';
import { RevisionConflict } from '../../commands/revision-conflict';
import { abilities } from '../../domain/enums';
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

function isAllocationMethod(
  value: unknown,
): value is AbilityAllocationMethod {
  return (
    value === 'standard_array' || value === 'point_buy' || value === 'manual'
  );
}

/**
 * All six abilities, present as exact keys, each an integer in the schema's
 * 1–30 — a partial map is refused as `invalid_params` before the atomic
 * command ever runs. All 10s passes: D64 makes it a valid allocation, not an
 * error state.
 */
function isGuidedAbilityScores(value: unknown): boolean {
  if (!hasExactKeys(value, abilities)) {
    return false;
  }
  return abilities.every((ability) => {
    const score = value[ability];
    return (
      typeof score === 'number' &&
      Number.isSafeInteger(score) &&
      score >= 1 &&
      score <= 30
    );
  });
}

/**
 * The seam pins the params shape (`GuidedAllocateAbilitiesParams`) but — a
 * seam gap, reported with this dispatch — ratified no validator for it, so the
 * guard lives here like the two above: the registry turns a validator failure
 * into `invalid_params` before any handler runs, and only this module needs
 * it. The UUID and revision idioms match `commands.execute` exactly, because
 * this request rides the same executor.
 */
function isGuidedAllocateAbilitiesParams(
  value: unknown,
): value is GuidedAllocateAbilitiesParams {
  if (
    !hasExactKeys(value, [
      'character_id',
      'method',
      'scores',
      'operation_uuid',
      'expected_revision',
    ])
  ) {
    return false;
  }
  const characterId = value['character_id'];
  const expectedRevision = value['expected_revision'];
  return (
    typeof characterId === 'number' &&
    Number.isSafeInteger(characterId) &&
    characterId > 0 &&
    isAllocationMethod(value['method']) &&
    isGuidedAbilityScores(value['scores']) &&
    typeof value['operation_uuid'] === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value['operation_uuid'],
    ) &&
    typeof expectedRevision === 'number' &&
    Number.isSafeInteger(expectedRevision) &&
    expectedRevision >= 0
  );
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
    // The S-B skill-grant refusals ride the same precedent with their own
    // data shape (the seam's `SkillGrantRefusalData`): §3.3 pins that the
    // background collision NAMES the conflicting skill so the step can offer
    // to clear it.
    if (error instanceof SkillGrantRefusal) {
      throw new RpcError('handler_error', error.message, {
        reason: error.reason,
        skill: error.skill,
      });
    }
    // The E-B equipment refusals, same precedent. The armour-slot collision
    // (E-A's `armor_slot_occupied`) carries slot, item and holder so the
    // step can tell the person exactly what collided and offer the remedy —
    // never a raw constraint violation (plan §3).
    if (error instanceof EquipmentStepRefusal) {
      throw new RpcError('handler_error', error.message, { ...error.data });
    }
    if (error instanceof EquipmentGrantRefusal) {
      throw new RpcError('handler_error', error.message, { ...error.data });
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
  /**
   * The B3 pair. Method names and validator come from
   * `src/builder/background-choices.ts` — the seam pins nothing for B3, a gap
   * reported with this dispatch, so that module is the single place both
   * agents' names can be ratified from.
   */
  defineRpcHandler(
    BACKGROUND_RPC.choiceOptions,
    isEmptyParams,
    (context) => listGuidedBackgroundChoiceOptions(context.db),
  ),
  defineRpcHandler(
    BACKGROUND_RPC.applyBackground,
    isGuidedApplyBackgroundParams,
    (context, params) =>
      translatingRefusals(() =>
        applyGuidedBackgroundChoices(context.db, params),
      ),
  ),
  /**
   * WARNINGS NEVER SURFACE HERE AS ERRORS (D49): `allocateGuidedAbilities`
   * carries them inside the successful result, and this handler adds only the
   * `RevisionConflict` translation every executor-riding method owes — the
   * same structured `handler_error` `commands.execute` emits, so the two
   * paths cannot drift on the precedent.
   */
  defineRpcHandler(
    GUIDED_RPC.allocateAbilities,
    isGuidedAllocateAbilitiesParams,
    async (context, params) => {
      try {
        return await allocateGuidedAbilities(
          context.db,
          params,
          new CharacterCommandIntegrity(COMMAND_INTEGRITY_KEY),
        );
      } catch (error) {
        if (error instanceof RevisionConflict) {
          throw new RpcError('handler_error', error.message, {
            current_revision: error.currentRevision,
          });
        }
        throw error;
      }
    },
  ),
  /**
   * The S-C skills-step read: one query for everything the step renders.
   * Same params shape as `buildState`, same structural guard rationale.
   */
  defineRpcHandler(
    GUIDED_RPC.skillsStep,
    isGuidedBuildStateParams,
    (context, params) =>
      guidedSkillsStepState(context.db, params.character_id),
  ),
  /**
   * The S-B fill command (§3.6). Rides the executor like `allocateAbilities`,
   * so it owes the same `RevisionConflict` translation; its DOMAIN refusals —
   * the seam's `SkillGrantRefusalReason`, each naming the skill at issue —
   * ride `translatingRefusals`' `SkillGrantRefusal` arm.
   */
  /**
   * The E-B equipment-step read: both sources' offerable options (gold-only
   * suppressed, D56), the recorded choices and the completion flag, in one
   * query. Same params shape and structural-guard rationale as `buildState`.
   */
  defineRpcHandler(
    EQUIPMENT_RPC.equipmentStep,
    isGuidedBuildStateParams,
    (context, params) =>
      guidedEquipmentStepState(context.db, params.character_id),
  ),
  /**
   * The E-B apply (plan §3, reshaped by D69): one transaction records the
   * choice in the recording source instance's config and mints the option's
   * weapon/armour rows as plain rows — no stamp, no option-change cleanup.
   * Domain refusals — the step's two guards and E-A's armour-slot collision
   * — ride `translatingRefusals`' equipment arms.
   */
  defineRpcHandler(
    EQUIPMENT_RPC.applyEquipment,
    isGuidedApplyEquipmentParams,
    (context, params) =>
      translatingRefusals(() => applyGuidedEquipment(context.db, params)),
  ),
  defineRpcHandler(
    GUIDED_RPC.fillSkillGrant,
    isGuidedFillSkillGrantParams,
    async (context, params) => {
      try {
        return await fillGuidedSkillGrant(
          context.db,
          params,
          new CharacterCommandIntegrity(COMMAND_INTEGRITY_KEY),
        );
      } catch (error) {
        // Translated HERE, not through `translatingRefusals`: that wrapper is
        // synchronous and this request rejects asynchronously out of the
        // executor — a sync try/catch around a returned promise catches
        // nothing.
        if (error instanceof SkillGrantRefusal) {
          throw new RpcError('handler_error', error.message, {
            reason: error.reason,
            skill: error.skill,
          });
        }
        if (error instanceof RevisionConflict) {
          throw new RpcError('handler_error', error.message, {
            current_revision: error.currentRevision,
          });
        }
        throw error;
      }
    },
  ),
]);
