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
  type GuidedSaveAbilityDraftParams,
  type GuidedBuildStateParams,
  type GuidedFillExpertiseGrantParams,
  type GuidedAssignSpellParams,
  type GuidedEligibleSpellsParams,
  type GuidedOriginOptionsParams,
  type GuidedChooseSpeciesLineageParams,
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
  fillGuidedExpertiseGrant,
  assignGuidedSpell,
  guidedEligibleSpells,
  guidedExpertiseStepState,
  guidedSpellsStepState,
  guidedBuildState,
  guidedSkillsStepState,
  listGuidedBackgroundChoiceOptions,
  listGuidedClassOptions,
  listGuidedOriginOptions,
  readGuidedAbilityDraft,
  saveGuidedAbilityDraft,
} from '../../builder/guided-creation';
import { SkillGrantRefusal } from '../../grants/skill-grants';
import { SkillExpertiseGrantRefusal } from '../../grants/skill-expertise-grants';
import { CharacterCommandIntegrity } from '../../commands/integrity';
import { CharacterCommandExecutor } from '../../commands/character-command-executor';
import { RevisionConflict } from '../../commands/revision-conflict';
import { abilities, skills } from '../../domain/enums';
import { RpcError } from '../../rpc/protocol';
import {
  defineRpcHandler,
  isEmptyParams,
  type RpcHandler,
} from '../handler';
import { COMMAND_INTEGRITY_KEY } from './commands';
import {
  guidedSpeciesChoiceState,
  resolveSpeciesChoice,
} from '../../builder/species-choice';
import { characterCommandRpcError } from '../character-command-errors';

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

function isGuidedChooseSpeciesLineageParams(
  value: unknown,
): value is GuidedChooseSpeciesLineageParams {
  const required = [
    'character_id',
    'chosen_option',
    'spellcasting_ability',
    'operation_uuid',
    'expected_revision',
  ] as const;
  const keys = value !== null && typeof value === 'object' && !Array.isArray(value)
    ? Object.keys(value)
    : [];
  const allowed = new Set([...required, 'replaceable_spell_version_key']);
  if (
    keys.some((key) => !allowed.has(key as (typeof required)[number])) ||
    required.some((key) => !keys.includes(key))
  ) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    isPositiveInteger(candidate['character_id']) &&
    typeof candidate['chosen_option'] === 'string' &&
    candidate['chosen_option'].trim() !== '' &&
    abilities.includes(candidate['spellcasting_ability'] as never) &&
    (candidate['replaceable_spell_version_key'] === undefined ||
      (typeof candidate['replaceable_spell_version_key'] === 'string' &&
        candidate['replaceable_spell_version_key'].trim() !== '')) &&
    typeof candidate['operation_uuid'] === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      candidate['operation_uuid'],
    ) &&
    typeof candidate['expected_revision'] === 'number' &&
    Number.isSafeInteger(candidate['expected_revision']) &&
    candidate['expected_revision'] >= 0
  );
}

function isPositiveInteger(value: unknown): boolean {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isGuidedAddress(value: unknown): boolean {
  return (
    hasExactKeys(value, ['kind', 'id']) &&
    (value['kind'] === 'slot_selection' ||
      value['kind'] === 'spellbook_acquisition') &&
    isPositiveInteger(value['id'])
  );
}

function isGuidedFillExpertiseParams(
  value: unknown,
): value is GuidedFillExpertiseGrantParams {
  return (
    hasExactKeys(value, [
      'character_id',
      'grant_id',
      'skill',
      'operation_uuid',
      'expected_revision',
    ]) &&
    isPositiveInteger(value['character_id']) &&
    isPositiveInteger(value['grant_id']) &&
    (value['skill'] === null || skills.includes(value['skill'] as never)) &&
    typeof value['operation_uuid'] === 'string' &&
    typeof value['expected_revision'] === 'number' &&
    Number.isSafeInteger(value['expected_revision'])
  );
}

function isGuidedAssignSpellParams(
  value: unknown,
): value is GuidedAssignSpellParams {
  return (
    hasExactKeys(value, [
      'character_id',
      'address',
      'spell_version_id',
      'operation_uuid',
      'expected_revision',
    ]) &&
    isPositiveInteger(value['character_id']) &&
    isGuidedAddress(value['address']) &&
    isPositiveInteger(value['spell_version_id']) &&
    typeof value['operation_uuid'] === 'string' &&
    typeof value['expected_revision'] === 'number' &&
    Number.isSafeInteger(value['expected_revision'])
  );
}

function isGuidedEligibleSpellsParams(
  value: unknown,
): value is GuidedEligibleSpellsParams {
  return (
    hasExactKeys(value, ['character_id', 'address', 'query']) &&
    isPositiveInteger(value['character_id']) &&
    isGuidedAddress(value['address']) &&
    typeof value['query'] === 'string'
  );
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

function isGuidedSaveAbilityDraftParams(
  value: unknown,
): value is GuidedSaveAbilityDraftParams {
  if (!hasExactKeys(value, ['character_id', 'method', 'scores'])) {
    return false;
  }
  const characterId = value['character_id'];
  return (
    typeof characterId === 'number' &&
    Number.isSafeInteger(characterId) &&
    characterId > 0 &&
    isAllocationMethod(value['method']) &&
    isGuidedAbilityScores(value['scores'])
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
    if (error instanceof SkillExpertiseGrantRefusal) {
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
    GUIDED_RPC.speciesChoiceState,
    isGuidedBuildStateParams,
    (context, params) =>
      guidedSpeciesChoiceState(context.db, params.character_id),
  ),
  defineRpcHandler(
    GUIDED_RPC.chooseSpeciesLineage,
    isGuidedChooseSpeciesLineageParams,
    async (context, params) => {
      try {
        const result = await new CharacterCommandExecutor(
          context.db,
          new CharacterCommandIntegrity(COMMAND_INTEGRITY_KEY),
        ).execute({
          character_id: params.character_id,
          operation_uuid: params.operation_uuid,
          expected_revision: params.expected_revision,
          command: {
            type: 'choose_species_lineage',
            chosen_option: params.chosen_option,
            spellcasting_ability: params.spellcasting_ability,
            ...(params.replaceable_spell_version_key === undefined
              ? {}
              : {
                  replaceable_spell_version_key:
                    params.replaceable_spell_version_key,
                }),
          },
        });
        const state = guidedBuildState(context.db, params.character_id);
        if (state.kind !== 'ready') {
          throw new Error('The character disappeared after choosing a lineage.');
        }
        return {
          character_id: params.character_id,
          current_step: state.current_step,
          revision: result.revision,
          resolution: resolveSpeciesChoice(context.db, params.character_id),
        };
      } catch (error) {
        const translated = characterCommandRpcError(error);
        if (translated !== null) throw translated;
        throw error;
      }
    },
  ),
  defineRpcHandler(
    GUIDED_RPC.abilityDraft,
    isGuidedBuildStateParams,
    (context, params) =>
      readGuidedAbilityDraft(context.db, params.character_id),
  ),
  defineRpcHandler(
    GUIDED_RPC.saveAbilityDraft,
    isGuidedSaveAbilityDraftParams,
    (context, params) => saveGuidedAbilityDraft(context.db, params),
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
  defineRpcHandler(
    GUIDED_RPC.expertiseStep,
    isGuidedBuildStateParams,
    (context, params) =>
      guidedExpertiseStepState(context.db, params.character_id),
  ),
  defineRpcHandler(
    GUIDED_RPC.fillExpertiseGrant,
    isGuidedFillExpertiseParams,
    (context, params) =>
      translatingRefusals(() =>
        fillGuidedExpertiseGrant(context.db, params),
      ),
  ),
  defineRpcHandler(
    GUIDED_RPC.spellsStep,
    isGuidedBuildStateParams,
    (context, params) =>
      guidedSpellsStepState(context.db, params.character_id),
  ),
  defineRpcHandler(
    GUIDED_RPC.guidedEligibleSpells,
    isGuidedEligibleSpellsParams,
    (context, params) => guidedEligibleSpells(context.db, params),
  ),
  defineRpcHandler(
    GUIDED_RPC.assignSpell,
    isGuidedAssignSpellParams,
    (context, params) =>
      translatingRefusals(() => assignGuidedSpell(context.db, params)),
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
