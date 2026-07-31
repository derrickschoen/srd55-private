import { ORIGIN_TEXT_LIMITS } from '../domain/origin-limits';

/**
 * Limits shared by draft codecs, publishable content codecs, and the portable
 * content DTOs that will consume the same aggregates.
 *
 * These are not UI limits. A form, RPC validator, projector, or exporter that
 * accepts one of these fields must read the value from here so content cannot
 * be saved successfully and then refused at the next boundary.
 */
export const AUTHORING_TEXT_LIMITS = Object.freeze({
  name: ORIGIN_TEXT_LIMITS.name,
  shortLabel: ORIGIN_TEXT_LIMITS.trait_name,
  openVocabulary: ORIGIN_TEXT_LIMITS.name,
  description: ORIGIN_TEXT_LIMITS.description,
  referenceText: ORIGIN_TEXT_LIMITS.description,
  toolReference: ORIGIN_TEXT_LIMITS.tool_proficiency,
  equipmentDescription: ORIGIN_TEXT_LIMITS.equipment_option,
  contentKey: 200,
  ruleKey: 200,
  queryTag: 120,
});

/**
 * Count caps are deliberately generous compared with bundled content while
 * still making every repeating section bounded and independently diagnosable.
 */
export const AUTHORING_LIST_LIMITS = Object.freeze({
  traits: 100,
  features: 100,
  effectsPerOwner: 100,
  effectsPerAggregate: 201,
  grants: 100,
  equipmentItemsPerOption: 100,
  queryValues: 100,
  validationIssues: 500,
});

export const AUTHORING_DOCUMENT_LIMITS = Object.freeze({
  encodedBytes: 524_288,
  maximumNesting: 8,
});

export const AUTHORING_NUMERIC_LIMITS = Object.freeze({
  minimumClassLevel: 1,
  maximumClassLevel: 20,
  minimumSpellLevel: 0,
  maximumSpellLevel: 9,
  minimumAbilityScore: 1,
  maximumAbilityScore: 30,
  maximumEffectMagnitude: 1_000,
  maximumSpeedFeet: 10_000,
  minimumAttackCount: 2,
});
