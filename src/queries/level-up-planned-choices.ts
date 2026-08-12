import type {
  FeatApplicationPlan,
  LevelUpPlannedChoiceProjection,
  LevelUpPlannedExpertiseProjection,
  LevelUpPlannedSkillProjection,
  LevelUpPlannedSpellProjection,
  PlannedGrantSource,
} from '../builder/level-up-wizard';
import type { LevelFeatSelection } from '../domain/command-contracts';
import { levelUpSpellReplacementAllowed } from '../commands/level-up-spell-replacement';
import type { DatabaseContext } from '../db/database';
import { sqlInteger, sqlNullableString, sqlString } from '../db/codecs';
import {
  catalogLayerDisclosure,
  type CatalogLayerDisclosure,
} from '../catalog/catalog-disclosure';
import { skills } from '../domain/enums';
import type {
  CharacterId,
  ClassDefinitionId,
  ContentKey,
  SourceInstanceId,
  SpellVersionId,
} from '../domain/ids';
import { activeGrantedSkills } from '../grants/skill-grants';
import {
  activeExpertiseSkills,
} from '../grants/skill-expertise-grants';
import { expertiseEntitlementsForClassName } from '../rules/class-choice-entitlements-srd';
import { GrantRule } from '../grants/grant-rule';
import type { PlannedSpellGrant } from '../grants/grant-rule-planner';
import {
  LevelUpPlannedEligibleSpells,
  type LevelUpPlannedSpellPlanParams,
} from './level-up-planned-eligible-spells';

export interface LevelUpPlannedChoiceContext
  extends LevelUpPlannedSpellPlanParams {
  readonly class_name: string;
  readonly class_catalog_layer: CatalogLayerDisclosure;
}

const EMPTY_PROJECTION: LevelUpPlannedChoiceProjection = Object.freeze({
  skills: Object.freeze([]),
  expertise: Object.freeze([]),
  spells: Object.freeze([]),
});

interface ExistingSource {
  readonly id: SourceInstanceId;
  readonly label: string;
  readonly catalog_layer: CatalogLayerDisclosure;
}

function sourceLabel(source: PlannedGrantSource, fallback: string): string {
  switch (source.kind) {
    case 'selected_class':
    case 'selected_class_subclass':
    case 'selected_feat':
      return fallback;
    case 'existing_source':
      return fallback;
  }
}

export class LevelUpPlannedChoicesQuery {
  readonly #spells: LevelUpPlannedEligibleSpells;

  constructor(private readonly db: DatabaseContext) {
    this.#spells = new LevelUpPlannedEligibleSpells(db);
  }

  forSelectedClass(
    context: LevelUpPlannedChoiceContext,
  ): LevelUpPlannedChoiceProjection {
    const classSource = this.#classSource(
      context.character_id,
      context.class_definition_id,
    );
    const subclassSource = this.#currentSubclassSource(
      context.character_id,
      context.class_definition_id,
    );
    const source: PlannedGrantSource = { kind: 'selected_class' };
    const selectedClass = {
      skills: [],
      expertise: this.#targetExpertise(context, source),
      spells: this.#spellProjection(
        context,
        source,
        context.class_name,
        context.class_catalog_layer,
        classSource?.id ?? null,
      ),
    } satisfies LevelUpPlannedChoiceProjection;
    const selectedSubclassSource: PlannedGrantSource = {
      kind: 'selected_class_subclass',
    };
    const selectedSubclass = {
      skills: [],
      expertise: [],
      spells: this.#spellProjection(
        context,
        selectedSubclassSource,
        subclassSource?.label ?? `${context.class_name} subclass`,
        subclassSource?.catalog_layer ?? 'unknown',
        subclassSource?.id ?? null,
      ),
    } satisfies LevelUpPlannedChoiceProjection;

    const existing = this.#otherExistingSources(
      context.character_id,
      classSource?.id ?? null,
    ).map((entry) => {
      const existingSource: PlannedGrantSource = {
        kind: 'existing_source',
        source_instance_id: entry.id,
      };
      return {
        skills: [],
        expertise: [],
        spells: this.#spellProjection(
          context,
          existingSource,
          entry.label,
          entry.catalog_layer,
          entry.id,
        ),
      } satisfies LevelUpPlannedChoiceProjection;
    });
    return this.#merge([selectedClass, selectedSubclass, ...existing]);
  }

  forSelectedSubclass(
    context: LevelUpPlannedChoiceContext & {
      readonly subclass_content_key: ContentKey;
      readonly subclass_name: string;
      readonly subclass_catalog_layer: CatalogLayerDisclosure;
    },
  ): LevelUpPlannedChoiceProjection {
    const source: PlannedGrantSource = {
      kind: 'selected_class_subclass',
    };
    return {
      ...EMPTY_PROJECTION,
      spells: this.#spellProjection(
        context,
        source,
        context.subclass_name,
        context.subclass_catalog_layer,
        this.#subclassSource(context),
      ),
    };
  }

  forSelectedFeat(
    context: LevelUpPlannedChoiceContext,
    featName: string,
    featCatalogLayer: CatalogLayerDisclosure,
    selection: LevelFeatSelection,
    plan: FeatApplicationPlan,
  ): LevelUpPlannedChoiceProjection {
    const source: PlannedGrantSource = { kind: 'selected_feat' };
    const held = new Set(activeGrantedSkills(this.db, context.character_id));
    const available = skills.filter((skill) => !held.has(skill));
    const plannedSkills: LevelUpPlannedSkillProjection[] = [];
    for (const object of plan.grant_rules) {
      const rule = GrantRule.fromObject(object);
      if (rule.kind !== GrantRule.SKILL_PROFICIENCY) continue;
      for (let ordinal = 1; ordinal <= (rule.count ?? 0); ordinal += 1) {
        plannedSkills.push({
          locator: {
            source,
            rule_key: rule.ruleKey,
            ordinal,
          },
          source_label: featName,
          source_catalog_layer: featCatalogLayer,
          available_skills: available,
        });
      }
    }
    return {
      skills: plannedSkills,
      expertise: [],
      spells: this.#spellProjection(
        { ...context, feat_choice: selection },
        source,
        featName,
        featCatalogLayer,
        null,
      ),
    };
  }

  #targetExpertise(
    context: LevelUpPlannedChoiceContext,
    source: PlannedGrantSource,
  ): readonly LevelUpPlannedExpertiseProjection[] {
    const entitlement = expertiseEntitlementsForClassName(
      context.class_name,
    )?.find((entry) => entry.class_level === context.target_class_level);
    if (entitlement === undefined) return [];
    const held = activeGrantedSkills(this.db, context.character_id);
    const existingExpertise = new Set(
      activeExpertiseSkills(this.db, context.character_id),
    );
    const available = held
      .filter((skill) => !existingExpertise.has(skill))
      .filter(
        (skill) =>
          entitlement.pool.kind === 'any_proficient_skill' ||
          entitlement.pool.skills.includes(skill),
      )
      .sort();
    return Array.from({ length: entitlement.count }, (_, index) => ({
      locator: {
        source,
        rule_key: `class_expertise_${String(context.target_class_level)}`,
        ordinal: index + 1,
      },
      source_label: `${context.class_name} — ${entitlement.feature_name}`,
      source_catalog_layer: context.class_catalog_layer,
      available_skills: available,
    }));
  }

  #spellProjection(
    context: LevelUpPlannedChoiceContext,
    source: PlannedGrantSource,
    label: string,
    sourceCatalogLayer: CatalogLayerDisclosure,
    durableSourceId: SourceInstanceId | null,
  ): readonly LevelUpPlannedSpellProjection[] {
    const plan = [...this.#spells.planSource(context, source)].sort(
      (left, right) => {
        const rank = (grant: PlannedSpellGrant): number =>
          grant.kind === 'slot_selection' &&
          grant.bucket === 'cantrip_known'
            ? 0
            : grant.kind === 'spellbook_acquisition'
              ? 1
              : 2;
        return rank(left) - rank(right);
      },
    );
    return plan.flatMap((grant) => this.#spellChoice(
      context.character_id,
      sourceLabel(source, label),
      sourceCatalogLayer,
      durableSourceId,
      grant,
    ));
  }

  #spellChoice(
    characterId: CharacterId,
    label: string,
    sourceCatalogLayer: CatalogLayerDisclosure,
    durableSourceId: SourceInstanceId | null,
    grant: PlannedSpellGrant,
  ): readonly LevelUpPlannedSpellProjection[] {
    if (grant.kind === 'spellbook_acquisition') {
      const selected = durableSourceId === null
        ? null
        : this.db.scalar<number>(
            `SELECT spell_version_id FROM wizard_spellbook_entries
             WHERE character_id = ? AND source_instance_id = ?
               AND rule_key = ? AND ordinal = ? AND state = 'active'`,
            [
              characterId,
              durableSourceId,
              grant.locator.rule_key,
              grant.locator.ordinal,
            ],
          );
      return selected === null
        ? [{
            kind: 'spellbook_acquisition',
            locator: grant.locator,
            source_label: label,
            source_catalog_layer: sourceCatalogLayer,
          }]
        : [];
    }
    if (grant.locked) return [];
    const row = durableSourceId === null
      ? null
      : this.db.oneRaw(
          `SELECT COALESCE(slot.current_spell_version_id,
                           slot.fixed_spell_version_id) AS spell_version_id,
                  version.display_name, identity.catalog_layer
           FROM spell_selection_slots AS slot
           LEFT JOIN spell_versions AS version
             ON version.id = COALESCE(slot.current_spell_version_id,
                                      slot.fixed_spell_version_id)
           LEFT JOIN catalog_content_identities AS identity
             ON identity.content_kind = 'spell'
            AND identity.content_key = version.content_key
           WHERE slot.character_id = ? AND slot.source_instance_id = ?
             AND slot.rule_key = ? AND slot.ordinal = ?
             AND slot.state IN ('active', 'kept_override')`,
          [
            characterId,
            durableSourceId,
            grant.locator.rule_key,
            grant.locator.ordinal,
          ],
        );
    if (row === null || row.spell_version_id === null) {
      return [{
        kind: 'new_slot',
        locator: grant.locator,
        source_label: label,
        source_catalog_layer: sourceCatalogLayer,
        required: grant.required,
      }];
    }
    if (
      durableSourceId === null ||
      !levelUpSpellReplacementAllowed(
        this.db,
        durableSourceId,
        grant.locator.rule_key,
        grant.locator.ordinal,
      )
    ) {
      return [];
    }
    return [{
      kind: 'optional_swap',
      locator: grant.locator,
      source_label: label,
      source_catalog_layer: sourceCatalogLayer,
      current_spell_version_id: Number(row.spell_version_id) as SpellVersionId,
      current_spell_name: String(row.display_name),
      current_spell_catalog_layer: catalogLayerDisclosure(
        typeof row.catalog_layer === 'string' ? row.catalog_layer : null,
      ),
    }];
  }

  #classSource(
    characterId: CharacterId,
    classDefinitionId: ClassDefinitionId,
  ): ExistingSource | null {
    return this.db.one(
      `SELECT source.id, source.display_name, identity.catalog_layer
       FROM character_source_instances AS source
       JOIN class_definitions AS definition
         ON definition.id = source.source_definition_id
       LEFT JOIN catalog_content_identities AS identity
         ON identity.content_kind = 'class'
        AND identity.content_key = definition.content_key
       WHERE source.character_id = ? AND source.source_type = 'class'
         AND source.source_definition_id = ? AND source.state = 'active'`,
      [characterId, classDefinitionId],
      (row) => ({
        id: sqlInteger(row, 'id') as SourceInstanceId,
        label: sqlString(row, 'display_name'),
        catalog_layer: catalogLayerDisclosure(
          sqlNullableString(row, 'catalog_layer'),
        ),
      }),
    );
  }

  #subclassSource(
    context: LevelUpPlannedChoiceContext & {
      readonly subclass_content_key: ContentKey;
    },
  ): SourceInstanceId | null {
    const id = this.db.scalar<number>(
      `SELECT source.id
       FROM character_source_instances AS source
       JOIN subclass_definitions AS definition
         ON definition.id = source.source_definition_id
       WHERE source.character_id = ? AND source.source_type = 'subclass'
         AND source.state = 'active' AND definition.content_key = ?`,
      [context.character_id, context.subclass_content_key],
    );
    return id === null ? null : Number(id) as SourceInstanceId;
  }

  #currentSubclassSource(
    characterId: CharacterId,
    classDefinitionId: ClassDefinitionId,
  ): ExistingSource | null {
    return this.db.one(
      `SELECT source.id, source.display_name, identity.catalog_layer
       FROM character_class_levels AS level
       JOIN character_source_instances AS source
         ON source.character_id = level.character_id
        AND source.source_type = 'subclass'
        AND source.source_definition_id = level.subclass_definition_id
        AND source.state = 'active'
       JOIN subclass_definitions AS definition
         ON definition.id = source.source_definition_id
       LEFT JOIN catalog_content_identities AS identity
         ON identity.content_kind = 'subclass'
        AND identity.content_key = definition.content_key
       WHERE level.character_id = ? AND level.class_definition_id = ?`,
      [characterId, classDefinitionId],
      (row) => ({
        id: sqlInteger(row, 'id') as SourceInstanceId,
        label: sqlString(row, 'display_name'),
        catalog_layer: catalogLayerDisclosure(
          sqlNullableString(row, 'catalog_layer'),
        ),
      }),
    );
  }

  #otherExistingSources(
    characterId: CharacterId,
    selectedClassSourceId: SourceInstanceId | null,
  ): ExistingSource[] {
    return this.db.all(
      `SELECT source.id, source.display_name, identity.catalog_layer
       FROM character_source_instances AS source
       LEFT JOIN feat_definitions AS feat
         ON source.source_type = 'feat'
        AND feat.id = source.source_definition_id
       LEFT JOIN species_definitions AS species
         ON source.source_type = 'species'
        AND species.id = source.source_definition_id
       LEFT JOIN background_definitions AS background
         ON source.source_type = 'background'
        AND background.id = source.source_definition_id
       LEFT JOIN catalog_content_identities AS identity
         ON identity.content_kind = source.source_type
        AND identity.content_key = COALESCE(
              feat.content_key, species.content_key, background.content_key
            )
       WHERE source.character_id = ? AND source.state = 'active'
         AND (? IS NULL OR source.id <> ?)
         AND source.source_type NOT IN ('class', 'subclass')
       ORDER BY source.id`,
      [characterId, selectedClassSourceId, selectedClassSourceId],
      (row) => ({
        id: sqlInteger(row, 'id') as SourceInstanceId,
        label: sqlString(row, 'display_name'),
        catalog_layer: catalogLayerDisclosure(
          sqlNullableString(row, 'catalog_layer'),
        ),
      }),
    );
  }

  #merge(
    projections: readonly LevelUpPlannedChoiceProjection[],
  ): LevelUpPlannedChoiceProjection {
    return {
      skills: projections.flatMap((projection) => projection.skills),
      expertise: projections.flatMap((projection) => projection.expertise),
      spells: projections.flatMap((projection) => projection.spells),
    };
  }
}
