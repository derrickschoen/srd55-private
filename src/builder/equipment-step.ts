/**
 * THE EQUIPMENT STEP'S RUNTIME (dispatch E-B of
 * `docs/design/2026-07-29-starting-equipment.md` §3, §4, §7).
 *
 * The step is mostly a CONFIRMATION: once gold-only options are suppressed
 * (D56, §0c), 11 of 12 classes and every background offer exactly one
 * option, and only Fighter offers two. This module therefore does not build
 * a chooser that assumes two — it reads both sources' offerable options,
 * records one choice per source through E-A's `applyEquipmentPackageChoice`,
 * and reports the completion the build derivation reads.
 *
 * WHAT IT DELIBERATELY DOES NOT DO:
 *
 *  - It never reads or writes `character_weapons` / `character_armor`
 *    directly. The mint, the option-change cleanup and the armour-slot
 *    refusal are E-A's, in `src/grants/equipment-grants.ts`, and reaching
 *    around them is §5's trap (rows minted without their source stamp).
 *  - It never re-derives completeness its own way: `complete` and the
 *    build evidence both read `recordedEquipmentChoiceOption`.
 */

import type { DatabaseContext } from '../db/database';
import {
  backgroundEquipmentOptions,
  classEquipmentOptions,
  isEnumValue,
  type BackgroundEquipmentOption,
  type ClassEquipmentOption,
} from '../domain/enums';
import { applyEquipmentPackageChoice } from '../grants/equipment-grants';
import {
  displayableEquipmentLines,
  offerableEquipmentPackageOptions,
  readEquipmentPackageOptions,
  type EquipmentPackageOption,
} from '../rules/equipment-package-display';
import {
  type EquipmentStepRefusalData,
  type EquipmentStepRefusalReason,
  type GuidedApplyEquipmentParams,
  type GuidedApplyOriginResult,
  type GuidedEquipmentOfferedOption,
  type GuidedEquipmentSourcePackage,
  type GuidedEquipmentStepState,
} from './contracts';
import {
  deriveBuildStep,
  readGuidedStepEvidence,
  recordedEquipmentChoiceOption,
  resolveEquipmentBackgroundSource,
  resolveEquipmentClassSource,
  type ResolvedEquipmentSource,
} from './guided-creation';

/**
 * The step's own domain refusal — `equipment_option_not_offered` and
 * `equipment_source_mismatch` (see the contract module for what each
 * guards). E-A's `EquipmentGrantRefusal` (`armor_slot_occupied`) passes
 * through this module untouched, with its own data shape.
 */
export class EquipmentStepRefusal extends Error {
  readonly reason: EquipmentStepRefusalReason;

  constructor(
    readonly data: EquipmentStepRefusalData,
    message: string,
  ) {
    super(message);
    this.name = 'EquipmentStepRefusal';
    this.reason = data.reason;
  }
}

/**
 * One source's offerable options, display-filtered: the gold-only options
 * are suppressed (one code path) and the surviving options' coin lines are
 * filtered from the contents (a different one) — §6 splits the controls
 * exactly because these are two mutations with two observables.
 */
function offeredOptions<Option extends string>(
  db: DatabaseContext,
  kind: 'class' | 'background',
  contentKey: string,
  isOption: (value: string) => value is Option,
): readonly GuidedEquipmentOfferedOption<Option>[] {
  const options: readonly EquipmentPackageOption[] =
    offerableEquipmentPackageOptions(
      readEquipmentPackageOptions(db, kind, contentKey),
    );
  return options.map((candidate) => {
    if (!isOption(candidate.option)) {
      throw new Error(
        `The seeded ${kind} equipment for "${contentKey}" carries option ` +
          `"${candidate.option}", which is outside the ${kind} option set — ` +
          'the schema CHECK should have refused the seed.',
      );
    }
    return {
      option: candidate.option,
      contents: displayableEquipmentLines(candidate.lines),
    };
  });
}

const isClassOption = (value: string): value is ClassEquipmentOption =>
  isEnumValue(classEquipmentOptions, value);

const isBackgroundOption = (
  value: string,
): value is BackgroundEquipmentOption =>
  isEnumValue(backgroundEquipmentOptions, value);

function classPackage(
  db: DatabaseContext,
  characterId: number,
  source: ResolvedEquipmentSource,
): GuidedEquipmentSourcePackage<ClassEquipmentOption> {
  const chosen = recordedEquipmentChoiceOption(db, characterId, 'class');
  return {
    content_key: source.content_key,
    source_name: source.source_name,
    offered: offeredOptions(db, 'class', source.content_key, isClassOption),
    chosen_option: chosen !== null && isClassOption(chosen) ? chosen : null,
  };
}

function backgroundPackage(
  db: DatabaseContext,
  characterId: number,
  source: ResolvedEquipmentSource,
): GuidedEquipmentSourcePackage<BackgroundEquipmentOption> {
  const chosen = recordedEquipmentChoiceOption(db, characterId, 'background');
  return {
    content_key: source.content_key,
    source_name: source.source_name,
    offered: offeredOptions(
      db,
      'background',
      source.content_key,
      isBackgroundOption,
    ),
    chosen_option:
      chosen !== null && isBackgroundOption(chosen) ? chosen : null,
  };
}

/**
 * Everything the equipment step renders, in one query (the S-C precedent).
 *
 * A character with no class cannot have reached this step through the
 * derivation, so that is an error, not a state; a background that cannot be
 * resolved is a NULL package the step discloses (contract module's note).
 * `complete` is the build evidence's own `equipmentChosen` — one predicate,
 * read once, surfaced where the step can render it.
 */
export function guidedEquipmentStepState(
  db: DatabaseContext,
  characterId: number,
): GuidedEquipmentStepState {
  const exists = db.scalar('SELECT id FROM characters WHERE id = ?', [
    characterId,
  ]);
  if (typeof exists !== 'number') {
    throw new Error(`No character with id ${characterId} exists.`);
  }
  const classSource = resolveEquipmentClassSource(db, characterId);
  if (classSource === null) {
    throw new Error(
      `Character ${characterId} has no class, so the equipment step has ` +
        'no kit to offer. The wizard requires a class before anything else ' +
        'happens (D42).',
    );
  }
  const backgroundSource = resolveEquipmentBackgroundSource(db, characterId);
  return {
    character_id: characterId,
    class_package: classPackage(db, characterId, classSource),
    background_package:
      backgroundSource === null
        ? null
        : backgroundPackage(db, characterId, backgroundSource),
    complete: readGuidedStepEvidence(db, characterId).equipmentChosen,
  };
}

/**
 * One RECORDED package, for the sheet's D33/D65 line: the source, the
 * recorded option and its display contents from the rules tables — the coin
 * line already filtered, because the sheet must not show a purse §3 says is
 * never granted.
 */
export interface RecordedEquipmentPackage {
  readonly kind: 'class' | 'background';
  readonly source_name: string;
  readonly option: string;
  readonly contents: readonly {
    readonly item_name: string;
    readonly quantity: number;
  }[];
}

/**
 * Every recorded package choice, read for the sheet. This goes through the
 * SAME resolution, the same recorded-choice reader and the same display
 * filter as the step itself, so the sheet's package line and the step cannot
 * disagree about what was chosen or what it shows.
 */
export function recordedEquipmentPackages(
  db: DatabaseContext,
  characterId: number,
): readonly RecordedEquipmentPackage[] {
  const packages: RecordedEquipmentPackage[] = [];
  for (const kind of ['class', 'background'] as const) {
    const source =
      kind === 'class'
        ? resolveEquipmentClassSource(db, characterId)
        : resolveEquipmentBackgroundSource(db, characterId);
    if (source === null) {
      continue;
    }
    const chosen = recordedEquipmentChoiceOption(db, characterId, kind);
    if (chosen === null) {
      continue;
    }
    const option = readEquipmentPackageOptions(
      db,
      kind,
      source.content_key,
    ).find((candidate) => candidate.option === chosen);
    packages.push({
      kind,
      source_name: source.source_name,
      option: chosen,
      contents: displayableEquipmentLines(option?.lines ?? []).map((line) => ({
        item_name: line.item_name,
        quantity: line.quantity,
      })),
    });
  }
  return packages;
}

/**
 * Apply (or change) one source's package choice from the guided step.
 *
 * TWO GUARDS BEFORE THE MINT, both structured refusals:
 *
 *  1. the content key must be the CHARACTER'S OWN class or background —
 *     E-A's background arm produces a source instance for whatever key it is
 *     handed, so an unguarded apply could equip a background the character
 *     does not have;
 *  2. the option must be OFFERED — D56 suppresses the gold-only options, and
 *     a refusal here is what keeps that a rule rather than a display habit
 *     (a suppressed option confirmed by a crafted request would otherwise
 *     record a choice the step can neither show nor change).
 *
 * The mint itself (choice recorded, cleanup, stamped rows, armour-slot
 * refusal, whole-apply rollback) is E-A's transaction, unchanged.
 */
export function applyGuidedEquipment(
  db: DatabaseContext,
  params: GuidedApplyEquipmentParams,
): GuidedApplyOriginResult {
  const source =
    params.kind === 'class'
      ? resolveEquipmentClassSource(db, params.character_id)
      : resolveEquipmentBackgroundSource(db, params.character_id);
  if (source === null || source.content_key !== params.content_key) {
    throw new EquipmentStepRefusal(
      {
        reason: 'equipment_source_mismatch',
        kind: params.kind,
        content_key: params.content_key,
        option: params.option,
      },
      `"${params.content_key}" is not this character's ${params.kind}, so ` +
        'its equipment package cannot be applied here.',
    );
  }
  const offered = offerableEquipmentPackageOptions(
    readEquipmentPackageOptions(db, params.kind, params.content_key),
  );
  if (!offered.some((candidate) => candidate.option === params.option)) {
    throw new EquipmentStepRefusal(
      {
        reason: 'equipment_option_not_offered',
        kind: params.kind,
        content_key: params.content_key,
        option: params.option,
      },
      `Option ${params.option.toUpperCase()} is not offered for this ` +
        `${params.kind}. Equipment is the package only — a gold-only ` +
        'option is not offered (D56), and a letter the source never ' +
        'printed does not exist.',
    );
  }
  applyEquipmentPackageChoice(db, params);
  return {
    character_id: params.character_id,
    current_step: deriveBuildStep(
      readGuidedStepEvidence(db, params.character_id),
    ),
  };
}
