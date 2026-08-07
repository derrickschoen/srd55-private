import {
  MAGIC_INITIATE_ABILITIES,
  MAGIC_INITIATE_FEAT_CONTENT_KEY,
  SKILLED_FEAT_CONTENT_KEY,
} from '../builder/background-choices';
import { MAGIC_INITIATE_LISTS } from '../domain/background-feat-name';
import { LEVEL_UP_SUBCLASS_LEVEL } from '../builder/level-up';
import {
  LEVEL_UP_WARNING_KEYS,
  levelUpWarningPresentation,
  type ActiveFeatInstance,
  type FeatDefinitionForApplication,
  type LevelUpCharacterSummary,
  type LevelUpClassOption,
  type LevelUpDisabledClassOption,
  type LevelUpFeatApplication,
  type LevelUpFeatCandidate,
  type LevelUpFeatOccurrence,
  type LevelUpHeldClass,
  type LevelUpGuideableClassOption,
  type LevelUpPendingEpicResolution,
  type LevelUpProjectedHitPoints,
  type LevelUpStateResult,
  type LevelUpSubclassOption,
  type LevelUpTargetFeatures,
  type ProjectedFeatCharacter,
} from '../builder/level-up-wizard';
import { isBundledSourceContentKey } from '../catalog/bundled-source-membership';
import { catalogLayerDisclosure } from '../catalog/catalog-disclosure';
import {
  sqlBoolean,
  sqlInteger,
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type {
  LevelFeatSelection,
  LevelUpAbilityIncrease,
} from '../domain/command-contracts';
import {
  abilities,
  characterLevels,
  isEnumValue,
  rulesEditions,
  type Ability,
  type CharacterLevel,
  type HitDieSize,
  type RulesEdition,
} from '../domain/enums';
import type {
  CharacterId,
  CharacterLevelFeatChoiceId,
  CharacterRevision,
  ClassDefinitionId,
  ClassLevel,
  ContentKey,
  SubclassDefinitionId,
} from '../domain/ids';
import type { JsonObject } from '../domain/models';
import {
  featFeatureEvidenceForProjectedClasses,
  classLevelFeaturesForClassName,
  projectedSubclassFeatureSource,
  type ProjectedBundledClass,
} from '../rules/class-level-features-srd';
import {
  buildFeatApplicationPlan,
  evaluateFeatEligibility,
} from '../rules/feat-application';
import { levelFeatDefinitionFromDatabase } from '../commands/level-feat-choice';
import {
  readEligibleCharacterEffects,
} from '../rules/eligible-character-effects';
import {
  resolveCharacterAbilities,
} from '../rules/ability-contributions';
import { AbilityScore } from '../rules/ability-score';
import {
  fixedHitPointsPerLevel,
  hitDieOrAbsent,
} from '../rules/sheet';
import { proficiencyBonus } from '../rules/proficiency';
import { effectHitPoints } from '../rules/species-effects';
import { decodeGrantJson } from '../grants/source-rule-reader';
import {
  CharacterCompletenessQueries,
} from './character-completeness';
import { CharacterSheetBuilder } from './character-sheet-builder';
import {
  LevelUpPlannedChoicesQuery,
  type LevelUpPlannedChoiceContext,
} from './level-up-planned-choices';

interface CharacterRow {
  readonly id: CharacterId;
  readonly name: string;
  readonly revision: CharacterRevision;
  readonly proficiency_bonus_override: number | null;
  readonly base_abilities: Readonly<Record<Ability, number>>;
}

interface HeldClassRow extends LevelUpHeldClass {
  readonly is_starting_class: boolean;
}

function rulesEdition(value: string, label: string): RulesEdition {
  if (!isEnumValue(rulesEditions, value)) {
    throw new TypeError(`${label} has an unsupported rules edition.`);
  }
  return value;
}

function classLevel(value: number, label: string): ClassLevel {
  if (!(characterLevels as readonly number[]).includes(value)) {
    throw new TypeError(`${label} must be between 1 and 20.`);
  }
  return value as ClassLevel;
}

function characterLevel(value: number, label: string): CharacterLevel {
  if (!(characterLevels as readonly number[]).includes(value)) {
    throw new TypeError(`${label} must be between 1 and 20.`);
  }
  return value as CharacterLevel;
}

function jsonObject(value: string | null, label: string): JsonObject {
  if (value === null || value === '') {
    return {};
  }
  const decoded = decodeGrantJson(value);
  if (
    decoded === null ||
    typeof decoded !== 'object' ||
    Array.isArray(decoded)
  ) {
    throw new TypeError(`${label} must be an object.`);
  }
  return decoded as JsonObject;
}

function subclassOption(
  row: SqlRow,
  prefix: string,
): LevelUpSubclassOption | null {
  const id = sqlNullableInteger(row, `${prefix}id`);
  if (id === null) {
    return null;
  }
  return {
    subclass_definition_id: id as SubclassDefinitionId,
    content_key: sqlString(row, `${prefix}content_key`) as ContentKey,
    name: sqlString(row, `${prefix}name`),
    rules_edition: rulesEdition(
      sqlString(row, `${prefix}rules_edition`),
      'Subclass',
    ),
    catalog_layer: catalogLayerDisclosure(
      sqlNullableString(row, `${prefix}catalog_layer`),
    ),
  };
}

function featConfigs(definition: FeatDefinitionForApplication): JsonObject[] {
  if (definition.content_key === MAGIC_INITIATE_FEAT_CONTENT_KEY) {
    return MAGIC_INITIATE_LISTS.flatMap((chosenList) =>
      MAGIC_INITIATE_ABILITIES.map((spellcastingAbility) => ({
        chosen_list: chosenList,
        spellcasting_ability: spellcastingAbility,
      })),
    );
  }
  if (definition.content_key === SKILLED_FEAT_CONTENT_KEY) {
    return [{ selected_skills: [null, null, null] }];
  }
  return [{}];
}

function allowedAbilities(
  definition: FeatDefinitionForApplication,
): readonly Ability[] {
  const options = definition.ability_increase_abilities;
  if (options === null) {
    return [];
  }
  return options === 'any' ? abilities : options;
}

function abilityIncreaseOptions(
  definition: FeatDefinitionForApplication,
  projected: ProjectedFeatCharacter,
): readonly (readonly LevelUpAbilityIncrease[])[] {
  if (definition.ability_points === 0) {
    return [[]];
  }
  const maximum = definition.ability_increase_maximum;
  if (maximum === null) {
    return [];
  }
  const allowed = allowedAbilities(definition);
  if (definition.ability_points === 1) {
    return allowed.flatMap((ability) => {
      const score = projected.ability_scores[ability];
      return score !== null && score + 1 <= maximum
        ? [[{ ability, amount: 1 }]]
        : [];
    });
  }

  const choices: (readonly LevelUpAbilityIncrease[])[] = [];
  for (const ability of allowed) {
    const score = projected.ability_scores[ability];
    if (score !== null && score + 2 <= maximum) {
      choices.push([{ ability, amount: 2 }]);
    }
  }
  for (let left = 0; left < allowed.length; left += 1) {
    for (let right = left + 1; right < allowed.length; right += 1) {
      const first = allowed[left];
      const second = allowed[right];
      if (first === undefined || second === undefined) {
        continue;
      }
      const firstScore = projected.ability_scores[first];
      const secondScore = projected.ability_scores[second];
      if (
        firstScore !== null &&
        secondScore !== null &&
        firstScore + 1 <= maximum &&
        secondScore + 1 <= maximum
      ) {
        choices.push([
          { ability: first, amount: 1 },
          { ability: second, amount: 1 },
        ]);
      }
    }
  }
  return choices;
}

function applicationsForFeat(
  definition: FeatDefinitionForApplication,
  projected: ProjectedFeatCharacter,
): readonly LevelUpFeatApplication[] {
  return featConfigs(definition).flatMap((config) =>
    abilityIncreaseOptions(definition, projected).map((abilityIncreases) => {
      const selection: LevelFeatSelection = {
        kind: 'feat',
        feat_content_key: definition.content_key,
        config,
        ability_increases: abilityIncreases,
      };
      return {
        selection,
        plan: buildFeatApplicationPlan({
          definition,
          character: projected,
          config,
          ability_increases: abilityIncreases,
        }),
      };
    }),
  );
}

/** Mint-free route read model over the merged LU-0/LU-1 services. */
export class LevelUpStateQuery {
  constructor(private readonly db: DatabaseContext) {}

  build(characterId: CharacterId | number): LevelUpStateResult {
    const character = this.#character(characterId);
    if (character === null) {
      return {
        kind: 'not_found',
        character_id: characterId as CharacterId,
      };
    }

    const held = this.#heldClasses(character.id);
    const warnings = new CharacterCompletenessQueries(this.db)
      .build(character.id);
    const total = held.length === 0
      ? null
      : held.reduce((sum, entry) => sum + entry.current_level, 0);
    const summary: LevelUpCharacterSummary = {
      character_id: character.id,
      name: character.name,
      revision: character.revision,
      total_level: total,
      warnings: [...warnings.items, ...warnings.catalog_gaps],
    };

    if (held.length === 0) {
      return { kind: 'no_held_class', character: summary };
    }

    if (total === null) {
      throw new Error('Held-class state lost its total level.');
    }
    // Imported totals above 20 are tolerated (F11). Feat prerequisites have
    // no threshold above 20, so their effective level is capped without
    // changing the actual total preserved in the character summary.
    const featEligibilityLevel = characterLevel(
      Math.min(total, 20),
      'Feat eligibility total level',
    );
    const pendingEpicResolution = this.#pendingEpicResolution(
      character,
      held,
      featEligibilityLevel,
    );

    if (total >= 20) {
      return {
        kind: 'maximum_level',
        character: summary,
        held_classes: held,
        pending_epic_resolution: pendingEpicResolution,
      };
    }

    const currentTotal = characterLevel(total, 'Current total level');
    const targetTotal = characterLevel(total + 1, 'Target total level');
    const eligibleHeldClasses = held.filter(
      (entry) => entry.current_level < 20,
    );
    if (eligibleHeldClasses.length === 0) {
      return {
        kind: 'maximum_level',
        character: summary,
        held_classes: held,
        pending_epic_resolution: pendingEpicResolution,
      };
    }
    const disabledOptions = eligibleHeldClasses.flatMap((entry) => {
      if (!isBundledSourceContentKey('class', entry.content_key, this.db)) {
        return [this.#disabledClassOption(entry, 'class_not_bundled')];
      }
      return entry.hit_die === null
        ? [this.#disabledClassOption(entry, 'missing_hit_die')]
        : [];
    });
    const guideableHeldClasses = eligibleHeldClasses.filter(
      (entry): entry is HeldClassRow & { readonly hit_die: HitDieSize } =>
        entry.hit_die !== null &&
        isBundledSourceContentKey('class', entry.content_key, this.db),
    );
    if (guideableHeldClasses.length === 0) {
      return {
        kind: 'no_guideable_class',
        character: { ...summary, total_level: currentTotal },
        explanation: disabledOptions.some(
          (option) => option.reason === 'class_not_bundled',
        )
          ? 'No held class is currently guideable; homebrew classes are outside the v1 guided flows (D133).'
          : 'Fixed HP cannot be derived for any held class until its missing hit die is repaired or catalogued.',
        class_options: disabledOptions,
        pending_epic_resolution: pendingEpicResolution,
      };
    }
    const sheet = new CharacterSheetBuilder(this.db).build(character.id);
    const guideableOptions = guideableHeldClasses.map((entry) =>
      this.#classOption(
        character,
        held,
        entry,
        currentTotal,
        targetTotal,
        sheet,
      ),
    );
    const options = eligibleHeldClasses.map((entry): LevelUpClassOption => {
      const disabled = disabledOptions.find(
        (option) => option.class_definition_id === entry.class_definition_id,
      );
      if (disabled !== undefined) {
        return disabled;
      }
      const guideable = guideableOptions.find(
        (option) => option.class_definition_id === entry.class_definition_id,
      );
      if (guideable === undefined) {
        throw new Error('Guideable held class lost its level-up projection.');
      }
      return guideable;
    });
    return {
      kind: 'ready',
      character: { ...summary, total_level: currentTotal },
      class_options: options,
      pending_epic_resolution: pendingEpicResolution,
    };
  }

  #character(characterId: number): CharacterRow | null {
    return this.db.one(
      `SELECT id, name, revision, proficiency_bonus_override,
              strength, dexterity, constitution, intelligence, wisdom,
              charisma
       FROM characters WHERE id = ?`,
      [characterId],
      (row): CharacterRow => ({
        id: sqlInteger(row, 'id') as CharacterId,
        name: sqlString(row, 'name'),
        revision: sqlInteger(row, 'revision') as CharacterRevision,
        proficiency_bonus_override: sqlNullableInteger(
          row,
          'proficiency_bonus_override',
        ),
        base_abilities: Object.fromEntries(
          abilities.map((ability) => [ability, sqlInteger(row, ability)]),
        ) as Record<Ability, number>,
      }),
    );
  }

  #heldClasses(characterId: CharacterId): HeldClassRow[] {
    return this.db.all(
      `SELECT level.class_definition_id, level.level,
              level.is_starting_class, definition.content_key,
              definition.name, definition.rules_edition, traits.hit_die,
              class_identity.catalog_layer AS class_catalog_layer,
              subclass.id AS subclass_id,
              subclass.content_key AS subclass_content_key,
              subclass.name AS subclass_name,
              subclass.rules_edition AS subclass_rules_edition,
              subclass_identity.catalog_layer AS subclass_catalog_layer
       FROM character_class_levels AS level
       JOIN class_definitions AS definition
         ON definition.id = level.class_definition_id
       LEFT JOIN catalog_content_identities AS class_identity
         ON class_identity.content_kind = 'class'
        AND class_identity.content_key = definition.content_key
       LEFT JOIN class_sheet_traits AS traits
         ON traits.class_definition_id = definition.id
       LEFT JOIN subclass_definitions AS subclass
         ON subclass.id = level.subclass_definition_id
       LEFT JOIN catalog_content_identities AS subclass_identity
         ON subclass_identity.content_kind = 'subclass'
        AND subclass_identity.content_key = subclass.content_key
       WHERE level.character_id = ?
       ORDER BY level.id`,
      [characterId],
      (row): HeldClassRow => ({
        class_definition_id:
          sqlInteger(row, 'class_definition_id') as ClassDefinitionId,
        content_key: sqlString(row, 'content_key') as ContentKey,
        name: sqlString(row, 'name'),
        catalog_layer: catalogLayerDisclosure(
          sqlNullableString(row, 'class_catalog_layer'),
        ),
        rules_edition: rulesEdition(
          sqlString(row, 'rules_edition'),
          'Class',
        ),
        current_level: classLevel(
          sqlInteger(row, 'level'),
          'Held class level',
        ),
        hit_die: hitDieOrAbsent(sqlNullableInteger(row, 'hit_die')),
        current_subclass: subclassOption(row, 'subclass_'),
        is_starting_class: sqlBoolean(row, 'is_starting_class'),
      }),
    );
  }

  #subclassOptions(classDefinitionId: ClassDefinitionId): LevelUpSubclassOption[] {
    return this.db.all(
      `SELECT subclass.id, subclass.content_key, subclass.name,
              subclass.rules_edition, identity.catalog_layer
       FROM subclass_definitions AS subclass
       LEFT JOIN catalog_content_identities AS identity
         ON identity.content_kind = 'subclass'
        AND identity.content_key = subclass.content_key
       WHERE subclass.class_definition_id = ?
       ORDER BY subclass.name, subclass.id`,
      [classDefinitionId],
      (row): LevelUpSubclassOption => ({
        subclass_definition_id:
          sqlInteger(row, 'id') as SubclassDefinitionId,
        content_key: sqlString(row, 'content_key') as ContentKey,
        name: sqlString(row, 'name'),
        rules_edition: rulesEdition(
          sqlString(row, 'rules_edition'),
          'Subclass',
        ),
        catalog_layer: catalogLayerDisclosure(
          sqlNullableString(row, 'catalog_layer'),
        ),
      }),
    );
  }

  #deferredEpicBoons(characterId: CharacterId): Array<{
    readonly character_level_feat_choice_id: CharacterLevelFeatChoiceId;
    readonly class_definition_id: ClassDefinitionId;
    readonly class_name: string;
    readonly class_level: ClassLevel;
  }> {
    return this.db.all(
      `SELECT choice.id, level.class_definition_id,
              definition.name AS class_name, choice.class_level
       FROM character_level_feat_choices AS choice
       JOIN character_class_levels AS level
         ON level.id = choice.character_class_level_id
        AND level.character_id = choice.character_id
       JOIN class_definitions AS definition
         ON definition.id = level.class_definition_id
       WHERE choice.character_id = ?
         AND choice.choice_kind = 'epic_boon'
         AND choice.feat_source_instance_id IS NULL
       ORDER BY choice.id`,
      [characterId],
      (row) => ({
        character_level_feat_choice_id:
          sqlInteger(row, 'id') as CharacterLevelFeatChoiceId,
        class_definition_id:
          sqlInteger(row, 'class_definition_id') as ClassDefinitionId,
        class_name: sqlString(row, 'class_name'),
        class_level: classLevel(
          sqlInteger(row, 'class_level'),
          'Deferred Epic Boon class level',
        ),
      }),
    );
  }

  #pendingEpicResolution(
    character: CharacterRow,
    held: readonly HeldClassRow[],
    totalLevel: CharacterLevel,
  ): LevelUpPendingEpicResolution | null {
    const deferred = this.#deferredEpicBoons(character.id);
    const selected = deferred[0];
    if (selected === undefined) {
      return null;
    }
    const projected = this.#projectedFeatCharacter(
      character,
      held,
      totalLevel,
      null,
    );
    return {
      deferred_choice: selected,
      additional_deferred_count: deferred.length - 1,
      warning: levelUpWarningPresentation(
        LEVEL_UP_WARNING_KEYS.epicBoonDeferred,
      ),
      candidates: this.#featCandidates(projected, 'epic_boon'),
      applicable_steps: ['epic_boon', 'review', 'complete'],
    };
  }

  #disabledClassOption(
    selected: HeldClassRow,
    reason: 'missing_hit_die' | 'class_not_bundled',
  ): LevelUpDisabledClassOption {
    if (reason === 'class_not_bundled') {
      return {
        ...selected,
        guideability: 'disabled',
        reason,
        explanation:
          'Homebrew classes remain held but are outside the v1 guided flows (D133).',
      };
    }
    if (selected.hit_die !== null) {
      throw new Error('A class with a hit die cannot be disabled for a missing hit die.');
    }
    return {
      ...selected,
      guideability: 'disabled',
      hit_die: null,
      reason,
      explanation:
        'Fixed HP cannot be derived until this class is repaired or catalogued with a hit die.',
    };
  }

  #classOption(
    character: CharacterRow,
    held: readonly HeldClassRow[],
    selected: HeldClassRow & { readonly hit_die: HitDieSize },
    currentTotal: CharacterLevel,
    targetTotal: CharacterLevel,
    sheet: ReturnType<CharacterSheetBuilder['build']>,
  ): LevelUpGuideableClassOption {
    const targetLevel = classLevel(
      selected.current_level + 1,
      'Target class level',
    );
    const targetFeatures = this.#targetFeatures(selected.name, targetLevel);
    const entitlements = targetFeatures.kind === 'sourced'
      ? classLevelFeaturesForClassName(selected.name)?.levels.find(
          (entry) => entry.class_level === targetLevel,
        )?.entitlements ?? []
      : [];
    const owesSubclass =
      targetLevel === LEVEL_UP_SUBCLASS_LEVEL &&
      selected.current_subclass === null;
    const occurrenceKind = entitlements.includes('ability_score_improvement')
      ? 'asi_level_feat'
      : entitlements.includes('epic_boon')
        ? 'epic_boon'
        : null;
    const projected = occurrenceKind === null
      ? null
      : this.#projectedFeatCharacter(
          character,
          held,
          targetTotal,
          { classDefinitionId: selected.class_definition_id, targetLevel },
        );
    const featOccurrence: LevelUpFeatOccurrence | null =
      occurrenceKind === null || projected === null
        ? null
        : {
            kind: occurrenceKind,
            candidates: this.#featCandidates(
              projected,
              occurrenceKind,
              {
                character_id: character.id,
                expected_revision: character.revision,
                class_definition_id: selected.class_definition_id,
                target_class_level: targetLevel,
                class_name: selected.name,
                class_catalog_layer: selected.catalog_layer,
              },
            ),
          };
    const choiceContext: LevelUpPlannedChoiceContext = {
      character_id: character.id,
      expected_revision: character.revision,
      class_definition_id: selected.class_definition_id,
      target_class_level: targetLevel,
      class_name: selected.name,
      class_catalog_layer: selected.catalog_layer,
    };
    const choiceQuery = new LevelUpPlannedChoicesQuery(this.db);
    const plannedChoices = choiceQuery.forSelectedClass(choiceContext);
    const steps = [
      'class' as const,
      'gains' as const,
      ...(owesSubclass ? ['subclass' as const] : []),
      ...(occurrenceKind === 'asi_level_feat' ? ['feat' as const] : []),
      ...(occurrenceKind === 'epic_boon' ? ['epic_boon' as const] : []),
      ...(plannedChoices.skills.length > 0 ? ['skills' as const] : []),
      ...(plannedChoices.expertise.length > 0 ? ['expertise' as const] : []),
      ...(plannedChoices.spells.length > 0 ? ['spells' as const] : []),
      'review' as const,
      'complete' as const,
    ];
    const currentBonus = sheet.proficiency_bonus.value;
    const projectedBonus = character.proficiency_bonus_override ??
      proficiencyBonus(targetTotal);
    if (currentBonus === null) {
      throw new Error('A held-class character has no proficiency bonus.');
    }
    return {
      ...selected,
      guideability: 'guideable',
      target_level: targetLevel,
      gains: {
        current_class_level: selected.current_level,
        target_class_level: targetLevel,
        current_total_level: currentTotal,
        target_total_level: targetTotal,
        hit_points: this.#projectedHitPoints(
          character,
          held,
          selected,
          currentTotal,
          targetTotal,
          sheet,
          [
            ...(owesSubclass ? ['subclass' as const] : []),
            ...(occurrenceKind === null ? [] : ['level_feat' as const]),
          ],
        ),
        proficiency_bonus_change: currentBonus === projectedBonus
          ? null
          : { current: currentBonus, projected: projectedBonus },
        target_features: targetFeatures,
      },
      applicable_steps: steps,
      subclass_choice: owesSubclass
        ? {
            options: this.#subclassOptions(selected.class_definition_id).map(
              (option) => ({
                ...option,
                planned_choices: choiceQuery.forSelectedSubclass({
                  ...choiceContext,
                  subclass_content_key: option.content_key,
                  subclass_name: option.name,
                  subclass_catalog_layer: option.catalog_layer,
                }),
              }),
            ),
          }
        : null,
      feat_occurrence: featOccurrence,
      planned_choices: plannedChoices,
    };
  }

  #targetFeatures(
    className: string,
    targetLevel: ClassLevel,
  ): LevelUpTargetFeatures {
    const sourced = classLevelFeaturesForClassName(className);
    if (sourced === null) {
      return { kind: 'unavailable' };
    }
    const row = sourced.levels.find(
      (entry) => entry.class_level === targetLevel,
    );
    return row === undefined
      ? { kind: 'unavailable' }
      : { kind: 'sourced', feature_names: row.feature_names };
  }

  #projectedHitPoints(
    character: CharacterRow,
    held: readonly HeldClassRow[],
    selected: HeldClassRow,
    currentTotal: CharacterLevel,
    targetTotal: CharacterLevel,
    sheet: ReturnType<CharacterSheetBuilder['build']>,
    pendingChoices: readonly ('subclass' | 'level_feat')[],
  ): LevelUpProjectedHitPoints {
    const missing = held
      .filter((entry) => entry.hit_die === null)
      .map((entry) => ({
        class_definition_id: entry.class_definition_id,
        class_name: entry.name,
        class_catalog_layer: entry.catalog_layer,
      }));
    if (missing.length > 0 || selected.hit_die === null) {
      return {
        kind: 'unknown',
        reason: 'missing_hit_die',
        missing_hit_dice: missing,
      };
    }
    const resolved = resolveCharacterAbilities(
      this.db,
      character.id,
      character.base_abilities,
    );
    const constitutionModifier = new AbilityScore(
      resolved.constitution.total,
    ).modifier();
    const fixedBase = fixedHitPointsPerLevel(selected.hit_die);
    const classChange = Math.max(1, fixedBase + constitutionModifier);
    const hpEffects = readEligibleCharacterEffects(
      this.db,
      character.id,
      'display',
    ).filter(
      (effect) =>
        effect.effect_kind === 'hp_modifier' &&
        (effect.hit_points_per_level ?? 0) !== 0,
    );
    const levelScaledEffects = hpEffects.map((effect) => {
      const currentContribution = effectHitPoints([effect], currentTotal);
      const projectedContribution = effectHitPoints([effect], targetTotal);
      return {
        label: effect.label,
        current_contribution: currentContribution,
        projected_contribution: projectedContribution,
        change: projectedContribution - currentContribution,
      };
    });
    const speciesValue = sheet.species_hit_points?.value;
    if (speciesValue === null) {
      return {
        kind: 'unknown',
        reason: 'undetermined_level_scaled_effect',
        missing_hit_dice: [],
      };
    }
    const speciesCurrent = speciesValue ?? 0;
    const currentMaximum = sheet.hit_points.value + speciesCurrent;
    return {
      kind: 'known',
      hit_die: selected.hit_die,
      fixed_class_base: fixedBase,
      constitution_modifier: constitutionModifier,
      class_hit_point_change: classChange,
      level_scaled_effects: levelScaledEffects,
      current_maximum: currentMaximum,
      projected_maximum: pendingChoices.length === 0
        ? {
            kind: 'known',
            value:
              currentMaximum +
              classChange +
              levelScaledEffects.reduce(
                (sum, effect) => sum + effect.change,
                0,
              ),
          }
        : { kind: 'pending_choice', choices: pendingChoices },
    };
  }

  #projectedFeatCharacter(
    character: CharacterRow,
    held: readonly HeldClassRow[],
    totalLevel: CharacterLevel,
    advanced: {
      readonly classDefinitionId: ClassDefinitionId;
      readonly targetLevel: ClassLevel;
    } | null,
  ): ProjectedFeatCharacter {
    const resolved = resolveCharacterAbilities(
      this.db,
      character.id,
      character.base_abilities,
    );
    const classes: ProjectedBundledClass[] = held.map((entry) => ({
      class_name: entry.name,
      class_level:
        advanced?.classDefinitionId === entry.class_definition_id
          ? advanced.targetLevel
          : entry.current_level,
      subclass: entry.current_subclass === null
        ? null
        : projectedSubclassFeatureSource(
            this.db,
            entry.current_subclass.content_key,
          ),
    }));
    const activeFeats: ActiveFeatInstance[] = this.db.all(
      `SELECT definition.content_key, source.config
       FROM character_source_instances AS source
       JOIN feat_definitions AS definition
         ON definition.id = source.source_definition_id
       WHERE source.character_id = ?
         AND source.source_type = 'feat'
         AND source.state = 'active'
       ORDER BY source.id`,
      [character.id],
      (row) => ({
        feat_content_key: sqlString(row, 'content_key') as ContentKey,
        config: jsonObject(
          sqlNullableString(row, 'config'),
          'Feat source config',
        ),
      }),
    );
    return {
      total_level: totalLevel,
      ability_scores: Object.fromEntries(
        abilities.map((ability) => [ability, resolved[ability].total]),
      ) as Readonly<Record<Ability, number>>,
      feature_evidence: featFeatureEvidenceForProjectedClasses(classes),
      active_feats: activeFeats,
    };
  }

  #featCandidates(
    projected: ProjectedFeatCharacter,
    occurrence: 'asi_level_feat' | 'epic_boon',
    choiceContext?: LevelUpPlannedChoiceContext,
  ): readonly LevelUpFeatCandidate[] {
    return this.db.all(
      'SELECT content_key FROM feat_definitions ORDER BY id',
      undefined,
      (row) => sqlString(row, 'content_key'),
    )
      .map((contentKey) =>
        levelFeatDefinitionFromDatabase(this.db, contentKey)
      )
      .filter(
        (definition) =>
          occurrence === 'asi_level_feat' ||
          definition.grouping === 'epic_boon',
      )
      .map((definition): LevelUpFeatCandidate => {
        const applications = applicationsForFeat(definition, projected);
        return {
          definition,
          catalog_layer: definition.catalog_layer,
          eligibility: evaluateFeatEligibility(definition, projected),
          is_class_default:
            definition.content_key ===
            '2024:feat:ability-score-improvement',
          applications: choiceContext === undefined
            ? applications
            : applications.map((application) => ({
                ...application,
                planned_choices: new LevelUpPlannedChoicesQuery(this.db)
                  .forSelectedFeat(
                    choiceContext,
                    definition.name,
                    definition.catalog_layer,
                    application.selection,
                    application.plan,
                  ),
              })),
        };
      });
  }
}
