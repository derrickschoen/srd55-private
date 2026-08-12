/**
 * THE READER THE SHEET CORE WAS MISSING.
 *
 * `class_extra_attack_grants` and `class_martial_arts_dice` have been written
 * by `src/rules/sheet-srd.ts` since the sheet core merged, and until commit
 * f9ed1b5 NOTHING OUTSIDE THE TESTS READ THEM. `attacksPerAction` and
 * `martialArtsDice` are pure functions over their content, and this is the
 * class that fills that content from the database.
 *
 * IT NOW READS THREE TABLES FOR ONE QUESTION, WHICH IS D19'S WHOLE POINT.
 * "How many attacks does the Attack action give" is answered by a class table
 * row, by a subclass feature, and by a named optional feature, and the three
 * live in three tables because each has a different NOT NULL foreign key. The
 * discriminator that puts them back together is `ExtraAttackGrant.source`.
 *
 * WHY THREE TABLES RATHER THAN ONE WITH THREE NULLABLE IDS: see
 * `extraAttackGrantSources` in `src/domain/enums.ts`. Briefly — SQLite treats
 * NULLs as distinct in a UNIQUE index, so the single-table shape loses the
 * "one grant per source per level" guarantee the moment those columns are added
 * to the key; and a subclass grant parked on a class id would be destroyed by
 * `seedClassSheetContent`, which clears `class_extra_attack_grants` with
 * `DELETE … WHERE class_definition_id = ?` on every reseed.
 *
 * IT IS DELIBERATELY SHAPED LIKE `WeaponMasteryLookup`: a small class over a
 * `DatabaseContext`, one method per question, no caching, no state. What it
 * does NOT share is that module's four-state allowance for the CLASS-table
 * question, because an absent class grant row is a SOURCED FACT — a Wizard has
 * no Extra Attack and the source says so by printing none. It DOES share the
 * posture everywhere the answer depends on something this schema never records:
 * a grant that cannot be applied is returned WITH ITS REASONS rather than
 * dropped or silently counted.
 *
 * NOTHING HERE IS STORED, AND NOTHING HERE IS DERIVED EITHER. It is a read.
 */
import {
  sqlInteger,
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import {
  decodeClassResourceFormula,
  type ClassFormulaResourceKind,
  type ClassResourceKind,
} from '../domain/class-resources';
import { isMartialArtsDieSize } from '../domain/enums';
import type { MartialArtsDieSize } from '../domain/enums';
import type { ClassFeatureEffect } from './class-feature-effects';
import { classFeatureEffect } from './class-feature-effects';
import type { ExtraAttackGrant } from './extra-attack';
import { selectionUnresolved } from './extra-attack';
import type { ClassDefinitionId, ContentKey } from '../domain/ids';
import {
  parseSrdClassResourceFormulaManifest,
  parseSrdClassResourceManifest,
} from './class-resources-srd';
import type {
  SheetClassLevels,
  SheetResourceCatalog,
  SheetResourceClassInput,
  SheetSpellProgressionRow,
} from './sheet';

interface BundledResourceExpectation {
  readonly expected_ladder_kinds: readonly ClassResourceKind[];
  readonly expected_formula_kinds: readonly ClassFormulaResourceKind[];
  readonly has_unmodelled_feature_maxima: boolean;
}

const BUNDLED_RESOURCE_EXPECTATIONS = (() => {
  const ladders = parseSrdClassResourceManifest();
  const formulas = parseSrdClassResourceFormulaManifest();
  return new Map(
    ladders.map((entry) => [
      String(entry.content_key),
      {
        expected_ladder_kinds: entry.expected_resource_kinds,
        expected_formula_kinds: formulas.formulas
          .filter((formula) => formula.content_key === entry.content_key)
          .map((formula) => formula.resource_kind),
        has_unmodelled_feature_maxima: formulas.unmodelled.some(
          (unmodelled) => unmodelled.content_key === entry.content_key,
        ),
      } satisfies BundledResourceExpectation,
    ] as const),
  );
})();

/**
 * One printed feature of the subclass a character has chosen.
 *
 * `description` IS ALWAYS PRESENT AND `effect` USUALLY IS NOT — the D12 split,
 * one level over. Most subclass features move no number; they are a paragraph
 * on a sheet, and this type carries them whether or not anything derives from
 * them, because dropping the text-only ones would leave a sheet unable to print
 * the subclass at all.
 */
export interface SubclassFeature {
  readonly id: number;
  readonly name: string;
  readonly description: string;
  /** The level IN THE SUBCLASS'S OWN CLASS at which it is gained. */
  readonly class_level: number;
  readonly sort_order: number;
  readonly effect: ClassFeatureEffect | null;
}

/** A named optional feature of a class, as stored. */
export interface NamedFeature {
  readonly id: number;
  readonly content_key: string;
  readonly name: string;
  readonly prerequisite: string;
  readonly description: string;
  readonly class_level: number;
  readonly effect: ClassFeatureEffect | null;
}

/** A character's class levels, joined to the per-level content of each class. */
export interface SheetClassContent
  extends SheetClassLevels,
    SheetResourceClassInput {
  readonly class_definition_id: ClassDefinitionId;
  readonly class_content_key: ContentKey;
  /**
   * The subclass chosen for THIS class, or `null`.
   *
   * D6b limb 1 AND limb 2, and this is the textbook case for both: no subclass
   * is chosen before level 3, a character is legitimately built, saved, shared
   * and imported without one, and the schema column
   * (`character_class_levels.subclass_definition_id`) has been nullable since
   * before this file existed.
   *
   * ONE NULLABLE OBJECT RATHER THAN A NULLABLE ID BESIDE A NULLABLE NAME, which
   * is D6d applied to a read model: two correlated nulls can disagree, and a
   * value with an id and no name is a state no reader should have to consider.
   */
  readonly subclass: {
    readonly id: number;
    readonly name: string;
    readonly content_key: ContentKey;
  } | null;
  /**
   * Every printed feature of `subclass`, in printed order, AT EVERY LEVEL —
   * including the ones this character has not reached. Empty without a
   * subclass.
   *
   * THE NAME SAYS `all_` BECAUSE THE LIST IS NOT LEVEL-FILTERED, and a reader
   * who misses that prints a level 3 Bard their level 6 feature. The filter is
   * NOT applied here on purpose: `class_level <= level` is stated exactly once,
   * in `resolveAttacksPerAction`, and filtering here as well would put the same
   * rule in two places and make the combinator's copy untested down this path.
   * Every entry carries its own `class_level`, so a consumer that wants only
   * what the character has today filters on that — and a PLANNER, which this
   * application is, generally wants the whole subclass to show what is coming.
   */
  readonly all_subclass_features: readonly SubclassFeature[];
}

export class SheetContentLookup {
  constructor(private readonly db: DatabaseContext) {}

  private featureExtraAttack(
    table: 'subclass_feature_effects' | 'named_feature_effects',
    foreignKey: 'subclass_feature_id' | 'named_feature_id',
    featureId: number,
  ): ClassFeatureEffect | null {
    const row = this.db.one(
      `SELECT effect_kind, attack_count, weapon_scope
       FROM ${table}
       WHERE ${foreignKey} = ? AND effect_kind = 'extra_attack'
       ORDER BY sort_order
       LIMIT 1`,
      [featureId],
      (effectRow) => ({
        effect_kind: sqlString(effectRow, 'effect_kind'),
        attack_count: sqlNullableInteger(effectRow, 'attack_count'),
        weapon_scope: sqlNullableString(effectRow, 'weapon_scope'),
      }),
    );
    return row === null ? null : classFeatureEffect(row);
  }

  /**
   * The class-table Extra Attack grants of one class.
   *
   * EVERY ONE IS UNSCOPED AND RESOLVED, AND THAT IS A PROPERTY OF THE TABLE
   * RATHER THAN AN ASSUMPTION ABOUT ITS ROWS. `class_extra_attack_grants` has
   * no weapon-scope column because no class-table row in `docs/srd/source/`
   * states a scope — Extra Attack on a class table is a fact about the
   * character — and a row applies because the character HAS levels in that
   * class, which `character_class_levels` records outright. So `unresolved` is
   * empty here and there is nothing it could hold.
   */
  classExtraAttackGrants(
    classDefinitionId: number,
    className: string,
  ): readonly ExtraAttackGrant[] {
    return this.db.all(
      `SELECT class_level, attack_count
       FROM class_extra_attack_grants
       WHERE class_definition_id = ?
       ORDER BY class_level`,
      [classDefinitionId],
      (row): ExtraAttackGrant => ({
        source: 'class',
        source_name: className,
        class_level: sqlInteger(row, 'class_level'),
        attack_count: sqlInteger(row, 'attack_count'),
        weapon_scope: 'any_weapon',
        unresolved: [],
      }),
    );
  }

  /**
   * Level -> Martial Arts die SIZE, for one class. `8` means `1d8`.
   *
   * A LEVEL WHOSE STORED DIE IS NOT A MARTIAL ARTS DIE IS DROPPED, not carried
   * as a bare integer. `martialArtsDice` in `src/rules/sheet.ts` resolves the
   * greatest row at or below the character's level, so a dropped level falls
   * back to the last GOOD one below it and the sheet under-states the die
   * rather than printing `1d7`; if every row is bad the class contributes no
   * entry and the sheet shows no Martial Arts die, which is what it already
   * shows for the eleven classes that have no rows at all.
   *
   * The set is re-established here for `hitDieOrAbsent`'s reason (see
   * `src/queries/character-sheet-builder.ts`): the CHECK on
   * `class_martial_arts_dice` is not present in an image created before it, and
   * F11 is the finding that trusting one is not a contract.
   */
  martialArtsDice(
    classDefinitionId: number,
  ): ReadonlyMap<number, MartialArtsDieSize> {
    const rows = this.db.all(
      `SELECT class_level, martial_arts_die AS value
       FROM class_martial_arts_dice
       WHERE class_definition_id = ?
       ORDER BY class_level`,
      [classDefinitionId],
      (row) => ({
        level: sqlInteger(row, 'class_level'),
        value: sqlInteger(row, 'value'),
      }),
    );
    return new Map(
      rows
        .filter(
          (row): row is { level: number; value: MartialArtsDieSize } =>
            isMartialArtsDieSize(row.value),
        )
        .map((row) => [row.level, row.value]),
    );
  }

  /**
   * Every printed feature of one subclass, in printed order, AT EVERY LEVEL.
   *
   * NO LEVEL FILTER, AND NO LEVEL TO FILTER ON: this method takes a subclass id
   * and not a character, so it could not apply one if it wanted to. See
   * `SheetClassContent.all_subclass_features` for why the filter lives in the
   * combinator instead.
   */
  subclassFeatures(subclassDefinitionId: number): readonly SubclassFeature[] {
    return this.db.all(
      `SELECT id, name, description, class_level, sort_order
       FROM subclass_features
       WHERE subclass_definition_id = ?
       ORDER BY sort_order`,
      [subclassDefinitionId],
      (row): SubclassFeature => {
        const id = sqlInteger(row, 'id');
        return {
          id,
          name: sqlString(row, 'name'),
          description: sqlString(row, 'description'),
          class_level: sqlInteger(row, 'class_level'),
          sort_order: sqlInteger(row, 'sort_order'),
          effect: this.featureExtraAttack(
            'subclass_feature_effects',
            'subclass_feature_id',
            id,
          ),
        };
      },
    );
  }

  /** Every named optional feature whose prerequisite counts one class's level. */
  namedFeatures(classDefinitionId: number): readonly NamedFeature[] {
    return this.db.all(
      `SELECT id, content_key, name, prerequisite, description, class_level
       FROM named_features
       WHERE class_definition_id = ?
       ORDER BY class_level, name`,
      [classDefinitionId],
      (row): NamedFeature => {
        const id = sqlInteger(row, 'id');
        return {
          id,
          content_key: sqlString(row, 'content_key'),
          name: sqlString(row, 'name'),
          prerequisite: sqlString(row, 'prerequisite'),
          description: sqlString(row, 'description'),
          class_level: sqlInteger(row, 'class_level'),
          effect: this.featureExtraAttack(
            'named_feature_effects',
            'named_feature_id',
            id,
          ),
        };
      },
    );
  }

  private resourceCatalog(contentKey: string): SheetResourceCatalog {
    const expected = BUNDLED_RESOURCE_EXPECTATIONS.get(contentKey);
    return expected === undefined
      ? { status: 'not_recorded' }
      : { status: 'recorded', ...expected };
  }

  private ladderRows(
    classDefinitionId: ClassDefinitionId,
    classLevel: number,
  ): SheetResourceClassInput['ladder_rows'] {
    return this.db.allRaw(
      `SELECT resource_kind, maximum
       FROM class_resources
       WHERE class_definition_id = ? AND class_level = ?
       ORDER BY resource_kind`,
      [classDefinitionId, classLevel],
    ).map((row) => ({
      resource_kind: row.resource_kind,
      maximum: row.maximum,
    }));
  }

  private formulaRows(
    classDefinitionId: ClassDefinitionId,
  ): SheetResourceClassInput['formula_rows'] {
    return this.db.allRaw(
      `SELECT resource_kind, formula_kind, minimum_class_level, fixed_count,
              ability, multiplier, later_fixed_count_steps
       FROM class_resource_formulas
       WHERE class_definition_id = ?
       ORDER BY resource_kind`,
      [classDefinitionId],
    ).map((row) => {
      try {
        return {
          resource_kind: row.resource_kind,
          formula: decodeClassResourceFormula({
            formula_kind: row.formula_kind,
            minimum_class_level: row.minimum_class_level,
            fixed_count: row.fixed_count,
            ability: row.ability,
            multiplier: row.multiplier,
            later_fixed_count_steps: row.later_fixed_count_steps,
          }),
        };
      } catch {
        return { resource_kind: row.resource_kind, formula: null };
      }
    });
  }

  private progressionRow(
    rowId: number | null,
    slots: unknown,
    pactSlots: unknown,
  ): SheetSpellProgressionRow {
    return rowId === null
      ? { status: 'missing' }
      : { status: 'present', slots, pact_slots: pactSlots };
  }

  /**
   * Every class the character has levels in, each carrying its own content.
   *
   * ORDERED BY CLASS NAME then row id, matching `CharacterWorkspaceBuilder`'s
   * own class query, so a sheet and a planner list the same classes in the same
   * order.
   *
   * THE SUBCLASS IS JOINED IN, WHICH IT WAS NOT BEFORE. The old query did not
   * SELECT `subclass_definition_id` at all, so even a subclass grant stored
   * perfectly would have had nothing downstream able to read it. The join is
   * LEFT because most characters have no subclass on most of their classes, and
   * an INNER join would silently drop a level 1 Fighter's whole class row.
   */
  forCharacter(characterId: number): readonly SheetClassContent[] {
    const classes = this.db.all(
      `SELECT level.class_definition_id AS class_definition_id,
              level.level AS class_level,
              definition.name AS class_name,
              definition.content_key AS class_content_key,
              definition.progression_type AS base_progression_type,
              base_progression.id AS base_progression_id,
              base_progression.slots AS base_slots,
              base_progression.pact_slots AS base_pact_slots,
              level.subclass_definition_id AS subclass_definition_id,
              subclass.name AS subclass_name,
              subclass.content_key AS subclass_content_key,
              subclass.caster_fraction AS subclass_caster_fraction,
              subclass.caster_rounding AS subclass_caster_rounding,
              subclass_progression.id AS subclass_progression_id,
              subclass_progression.slots AS subclass_slots
       FROM character_class_levels AS level
       JOIN class_definitions AS definition
         ON definition.id = level.class_definition_id
       LEFT JOIN class_progressions AS base_progression
         ON base_progression.class_definition_id = level.class_definition_id
        AND base_progression.class_level = level.level
       LEFT JOIN subclass_definitions AS subclass
         ON subclass.id = level.subclass_definition_id
       LEFT JOIN subclass_progressions AS subclass_progression
         ON subclass_progression.subclass_definition_id = level.subclass_definition_id
        AND subclass_progression.class_level = level.level
       WHERE level.character_id = ?
       ORDER BY definition.name, level.id`,
      [characterId],
      (row) => {
        const classDefinitionId = sqlInteger(
          row,
          'class_definition_id',
        ) as ClassDefinitionId;
        const classLevel = sqlInteger(row, 'class_level');
        const contentKey = sqlString(row, 'class_content_key');
        const subclassId = sqlNullableInteger(row, 'subclass_definition_id');
        const subclassName = sqlNullableString(row, 'subclass_name');
        const subclassContentKey = sqlNullableString(
          row,
          'subclass_content_key',
        );
        const baseProgressionId = sqlNullableInteger(row, 'base_progression_id');
        const subclassProgressionId = sqlNullableInteger(
          row,
          'subclass_progression_id',
        );
        return {
          class_definition_id: classDefinitionId,
          class_content_key: contentKey as ContentKey,
          class_name: sqlString(row, 'class_name'),
          level: classLevel,
          class_level: classLevel,
          catalog: this.resourceCatalog(contentKey),
          ladder_rows: this.ladderRows(classDefinitionId, classLevel),
          formula_rows: this.formulaRows(classDefinitionId),
          base_spellcasting: {
            progression_type: row.base_progression_type,
            progression_row: this.progressionRow(
              baseProgressionId,
              row.base_slots,
              row.base_pact_slots,
            ),
          },
          subclass_spellcasting:
            subclassId === null
              ? null
              : {
                  caster_fraction: row.subclass_caster_fraction,
                  caster_rounding: row.subclass_caster_rounding,
                  progression_row: this.progressionRow(
                    subclassProgressionId,
                    row.subclass_slots,
                    null,
                  ),
                },
          // Both halves come from the same LEFT JOIN, so they are absent
          // together or present together; the pair is collapsed here rather
          // than carried as two independently nullable fields.
          subclass:
            subclassId === null ||
            subclassName === null ||
            subclassContentKey === null
              ? null
              : {
                  id: subclassId,
                  name: subclassName,
                  content_key: subclassContentKey as ContentKey,
                },
        };
      },
    );

    return classes.map((entry): SheetClassContent => {
      const features =
        entry.subclass === null ? [] : this.subclassFeatures(entry.subclass.id);
      return {
        ...entry,
        all_subclass_features: features,
        extra_attack_grants: [
          ...this.classExtraAttackGrants(
            entry.class_definition_id,
            entry.class_name,
          ),
          ...subclassGrants(features),
          ...namedFeatureGrants(this.namedFeatures(entry.class_definition_id)),
        ],
        martial_arts_dice: this.martialArtsDice(entry.class_definition_id),
      };
    });
  }
}

/**
 * A subclass feature that grants Extra Attack becomes a grant the character
 * ACTUALLY HAS.
 *
 * Unlike a named feature there is nothing to confirm: the subclass is recorded
 * on `character_class_levels` behind a composite foreign key that stops a
 * character holding a subclass of another class, so the only thing that can
 * still be unresolved is the WEAPON.
 *
 * AND THE WEAPON IS NOT THIS FUNCTION'S BUSINESS, which is why `unresolved` is
 * unconditionally empty here rather than a ternary on `weapon_scope`. The scope
 * travels on the grant, and `resolveAttacksPerAction` turns it into reasons
 * itself — so a scoped subclass grant is surfaced-not-applied because of the
 * VALUE it carries, not because this builder remembered to say so. An earlier
 * version wrote the sentence here; deleting that one branch was enough to make
 * a homebrew bonded grant raise the character-wide count, which is the failure
 * mode `scopeUnresolved` in `src/rules/extra-attack.ts` now makes unreachable.
 */
function subclassGrants(
  features: readonly SubclassFeature[],
): readonly ExtraAttackGrant[] {
  const grants: ExtraAttackGrant[] = [];
  for (const feature of features) {
    if (feature.effect === null) {
      continue;
    }
    grants.push({
      source: 'subclass',
      source_name: feature.name,
      class_level: feature.class_level,
      attack_count: feature.effect.attack_count,
      weapon_scope: feature.effect.weapon_scope,
      unresolved: [],
    });
  }
  return grants;
}

/**
 * A named feature that grants Extra Attack becomes a grant this application
 * CANNOT CONFIRM, and says so in as many sentences as it has reasons.
 *
 * EVERY ROW GETS THE SELECTION REASON, UNCONDITIONALLY. There is no invocation
 * table, no feat-feature table and no class-feature selection anywhere in
 * `db/schema/`, so the answer is the same for every character and is a fact
 * about this application rather than about them. THAT is the reason this
 * builder writes, because nothing on the grant states it: it is a fact about
 * the SCHEMA, not about the row.
 *
 * THE WEAPON REASON IS NOT WRITTEN HERE. Thirsting Blade collects it too — it
 * is why `unresolved` is a list, the two axes being independent and both true
 * at once — but it is DERIVED from `weapon_scope` by `resolveAttacksPerAction`
 * rather than restated at this call site, so the grant cannot carry a scope its
 * reasons contradict. See `scopeUnresolved` in `src/rules/extra-attack.ts`.
 */
function namedFeatureGrants(
  features: readonly NamedFeature[],
): readonly ExtraAttackGrant[] {
  const grants: ExtraAttackGrant[] = [];
  for (const feature of features) {
    if (feature.effect === null) {
      continue;
    }
    grants.push({
      source: 'feature',
      source_name: feature.name,
      class_level: feature.class_level,
      attack_count: feature.effect.attack_count,
      weapon_scope: feature.effect.weapon_scope,
      unresolved: [selectionUnresolved(feature.name, feature.prerequisite)],
    });
  }
  return grants;
}
