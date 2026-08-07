/**
 * THE EQUIPMENT STEP'S CONTRACT (dispatch E-B of
 * `docs/design/2026-07-29-starting-equipment.md` §3, §4, §7) — OFFERED FOR
 * RATIFICATION into the seam, on the exact precedent B3 set with
 * `background-choices.ts`: the seam file is supervisor-owned, E-A's §6b
 * values are already ratified in it, and everything E-B additionally needs —
 * the step's RPC names, its read-model shape, its panel and locators, its
 * params validator and its two domain refusals — is authored here and
 * re-exported from `contracts.ts` so there is one import point. Neither the
 * production agent nor the test agent edits this file after ratification.
 *
 * WHAT THE STEP IS, so no rewrite can drift from it (§0c, §3):
 *
 *  - Both sources — the chosen class and the chosen background — offer their
 *    seeded options WITH GOLD-ONLY OPTIONS SUPPRESSED (D56). 11 of 12
 *    classes and every background then have exactly ONE offerable option:
 *    the step is a CONFIRMATION in the common case, and Fighter is the only
 *    class where it is a choice.
 *  - An offered option's contents never include a coin line ("4 GP"): that
 *    is a different filter on a different code path from the suppression
 *    above, and the two are controlled separately (E-NO-GOLD-SHOWN vs
 *    E-NO-GOLD-OFFERED).
 *  - Confirming an option records the choice through E-A's
 *    `applyEquipmentPackageChoice` — into the recording source instance's
 *    `config` under the seam's `EQUIPMENT_CHOICE_CONFIG_KEY` — and mints the
 *    option's weapon/armour rows as plain, unowned rows (D69: no provenance).
 *    Gear mints nothing and renders from the rules tables (D65).
 *  - The step completes when BOTH sources carry a recorded choice; that same
 *    predicate is the build-derivation's `equipmentChosen` evidence, so the
 *    step and the derivation cannot disagree.
 */

import {
  backgroundEquipmentOptions,
  classEquipmentOptions,
  isEnumValue,
  type BackgroundEquipmentOption,
  type ClassEquipmentOption,
  type EquipmentItemKind,
} from '../domain/enums';
import {
  hasExactKeys,
  type EquipmentChoiceConfig,
  type EquipmentSourceKind,
} from './contracts';
import type { CatalogLayerDisclosure } from '../catalog/catalog-disclosure';

/* ------------------------------------------------------------ RPC methods */

export const EQUIPMENT_RPC = Object.freeze({
  /** The step's read: both sources' offerable options and recorded choices. */
  equipmentStep: 'queries.characters.equipmentStep',
  /** The one-transaction apply of one source's package choice. */
  applyEquipment: 'queries.characters.applyEquipment',
} as const);

/* ---------------------------------------------------------------- panel */

/** The step's `data-panel` value, beside `GUIDED_PANEL`'s ratified members. */
export const EQUIPMENT_STEP_PANEL = 'equipment-step';

/** The step's locators, mirroring `BACKGROUND_STEP_ATTR`'s ratified shape. */
export const EQUIPMENT_STEP_ATTR = Object.freeze({
  /** Each source's section, valued `class` or `background`. */
  source: 'data-equipment-source',
  /** Each offered option's block, valued with its letter. */
  option: 'data-equipment-option',
  /** Each option's contents list. Never contains a coin line. */
  contents: 'data-equipment-contents',
  /** The confirm button for one option, valued with its letter. */
  choose: 'data-equipment-choose',
  /** The line naming a source's RECORDED option, valued with its letter. */
  recorded: 'data-equipment-recorded',
  /** The D65 disclosure: gear is displayed, never tracked individually. */
  notItemised: 'data-equipment-not-itemised',
  /** Shown when both sources carry a recorded choice. */
  complete: 'data-equipment-complete',
} as const);

/* ---------------------------------------------------------------- results */

/** One rendered package line: the printed name, count and classification. */
export interface GuidedEquipmentItemLine {
  readonly item_name: string;
  readonly quantity: number;
  readonly item_kind: EquipmentItemKind;
}

/** One OFFERABLE option: gold-only options never reach this shape. */
export interface GuidedEquipmentOfferedOption<Option extends string> {
  readonly option: Option;
  /** Display contents — the coin line is already filtered out. */
  readonly contents: readonly GuidedEquipmentItemLine[];
}

/**
 * One source's package state. `offered` is what the person may pick;
 * `chosen_option` is what the granting source instance's `config` records,
 * or null while the choice is unmade. A source whose owner the rules tables
 * do not know (a homebrew class, an imported background) offers nothing —
 * the step then says so rather than pretending completeness is reachable.
 */
export interface GuidedEquipmentSourcePackage<Option extends string> {
  readonly content_key: string;
  readonly source_name: string;
  readonly catalog_layer: CatalogLayerDisclosure;
  readonly offered: readonly GuidedEquipmentOfferedOption<Option>[];
  readonly chosen_option: Option | null;
}

/**
 * `queries.characters.equipmentStep`'s result: everything the step renders.
 *
 * `background_package` is NULL when the character's recorded background
 * cannot be resolved to a bundled template — the record-only `applyOrigin`
 * arm stores only the printed prose, so a background applied that way
 * resolves through its unique template name, and one that matches nothing
 * yields null plus a rendered disclosure rather than a guess (D33, D15).
 *
 * `complete` is THE SAME predicate the build derivation's `equipmentChosen`
 * evidence reads — both sources carry a recorded choice — computed in one
 * shared function so the step and the derivation cannot disagree.
 */
export interface GuidedEquipmentStepState {
  readonly character_id: number;
  readonly class_package: GuidedEquipmentSourcePackage<ClassEquipmentOption>;
  readonly background_package: GuidedEquipmentSourcePackage<BackgroundEquipmentOption> | null;
  readonly complete: boolean;
}

/* ----------------------------------------------------------------- params */

/**
 * The apply's params: E-A's `EquipmentChoiceConfig` discriminant plus the
 * addressed character and the source's content key — deliberately the same
 * shape `applyEquipmentPackageChoice` takes, so the handler adds guards, not
 * translation. No `operation_uuid` and no `expected_revision`: the apply
 * rides its own transaction on the `applyBackground` (B3) precedent, not the
 * executor.
 */
export type GuidedApplyEquipmentParams = EquipmentChoiceConfig & {
  readonly character_id: number;
  readonly content_key: string;
};

export function isGuidedApplyEquipmentParams(
  value: unknown,
): value is GuidedApplyEquipmentParams {
  if (!hasExactKeys(value, ['kind', 'option', 'character_id', 'content_key'])) {
    return false;
  }
  const characterId = value['character_id'];
  const contentKey = value['content_key'];
  const validOption =
    value['kind'] === 'class'
      ? isEnumValue(classEquipmentOptions, value['option'])
      : value['kind'] === 'background' &&
        isEnumValue(backgroundEquipmentOptions, value['option']);
  return (
    validOption &&
    typeof characterId === 'number' &&
    Number.isInteger(characterId) &&
    characterId > 0 &&
    typeof contentKey === 'string' &&
    contentKey.length > 0
  );
}

/* ---------------------------------------------------------------- refusals */

/**
 * The step's own domain refusals, riding the `handler_error` precedent:
 *
 *  - `equipment_option_not_offered` — the requested option is not among the
 *    source's offerable options. This is what makes D56 a REFUSAL rather
 *    than a display habit: a request naming a suppressed gold option (or a
 *    letter the source never printed) is refused, not applied.
 *  - `equipment_source_mismatch` — the request names a content key that is
 *    not the character's own class or background. Left unguarded, E-A's
 *    background arm would PRODUCE a source instance for whatever key it was
 *    handed, granting equipment from a background the character does not
 *    have.
 *
 * E-A's `armor_slot_occupied` (`EquipmentGrantRefusalData`) is a third
 * refusal the apply can surface; it is raised by the mint and travels with
 * its own data shape.
 */
export type EquipmentStepRefusalReason =
  | 'equipment_option_not_offered'
  | 'equipment_source_mismatch';

export interface EquipmentStepRefusalData {
  readonly reason: EquipmentStepRefusalReason;
  readonly kind: EquipmentSourceKind;
  readonly content_key: string;
  readonly option: string;
}
