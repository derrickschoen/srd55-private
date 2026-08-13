import type {
  LevelUpPlannedEligibleSpellsParams,
  LevelUpPlannedEligibleSpellsResult,
  PlannedGrantSource,
} from '../builder/level-up-wizard';
import {
  sqlInteger,
  sqlNullableInteger,
  sqlNullableString,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import { EligibleSpellSearch } from '../eligibility/eligible-spell-search';
import { GrantRulePlanner } from '../grants/grant-rule-planner';
import type { PlannedSpellGrant } from '../grants/grant-rule-planner';
import {
  decodeGrantJson,
  SourceRuleReader,
  type GrantSourceInstance,
} from '../grants/source-rule-reader';
import { GrantRule, type GrantRuleObject } from '../grants/grant-rule';
import type { JsonObject } from '../domain/models';
import type { ClassLevel } from '../domain/ids';
import { characterLevel } from '../rules/character-level';
import { planLevelFeatSelection } from '../commands/level-feat-choice';
import {
  asiLevelsForClassName,
  epicBoonLevelsForClassName,
} from '../rules/class-level-features-srd';
import { ACTIVE_SOURCE_INSTANCE_STATE } from '../domain/source-instance-state';

interface HeldClassPlan {
  readonly level: number;
  readonly source_id: number;
  readonly config: string | null;
  readonly subclass_source_id: number | null;
  readonly subclass_definition_id: number | null;
  readonly subclass_content_key: string | null;
}

export type LevelUpPlannedSpellPlanParams = Omit<
  LevelUpPlannedEligibleSpellsParams,
  'locator' | 'query'
>;

function heldClassPlan(row: SqlRow): HeldClassPlan {
  return {
    level: sqlInteger(row, 'level'),
    source_id: sqlInteger(row, 'source_id'),
    config: sqlNullableString(row, 'config'),
    subclass_source_id: sqlNullableInteger(row, 'subclass_source_id'),
    subclass_definition_id: sqlNullableInteger(
      row,
      'subclass_definition_id',
    ),
    subclass_content_key: sqlNullableString(row, 'subclass_content_key'),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizedConfig(
  encoded: string | null,
  label: string,
): JsonObject {
  const decoded = decodeGrantJson(encoded);
  if (Array.isArray(decoded) && decoded.length === 0) {
    return {};
  }
  if (!isRecord(decoded)) {
    throw new TypeError(`${label} config must be an object.`);
  }
  return decoded as JsonObject;
}

function sameSource(
  left: PlannedGrantSource,
  right: PlannedGrantSource,
): boolean {
  if (left.kind !== right.kind) {
    return false;
  }
  return left.kind !== 'existing_source' ||
    right.kind !== 'existing_source'
    ? true
    : left.source_instance_id === right.source_instance_id;
}

function rulesFromProgressions(
  db: DatabaseContext,
  classDefinitionId: number,
  targetClassLevel: number,
): GrantRuleObject[] {
  const byKey = new Map<string, GrantRuleObject>();
  const rows = db.all(
    `SELECT grant_rules
     FROM class_progressions
     WHERE class_definition_id = ? AND class_level <= ?
     ORDER BY class_level`,
    [classDefinitionId, targetClassLevel],
    (row) => sqlNullableString(row, 'grant_rules'),
  );
  for (const json of rows) {
    const decoded = decodeGrantJson(json);
    if (!Array.isArray(decoded)) {
      throw new TypeError(
        'Class progression grant rules must be a list.',
      );
    }
    for (const object of decoded) {
      const rule = GrantRule.fromObject(object);
      byKey.set(rule.ruleKey, rule.toObject());
    }
  }
  return [...byKey.values()];
}

function rulesFromSubclassProgressions(
  db: DatabaseContext,
  subclassDefinitionId: number,
  targetClassLevel: number,
): GrantRuleObject[] {
  const byKey = new Map<string, GrantRuleObject>();
  const rows = db.all(
    `SELECT grant_rules
     FROM (
       SELECT 0 AS ordering, grant_rules
       FROM subclass_definitions
       WHERE id = ?
       UNION ALL
       SELECT class_level AS ordering, grant_rules
       FROM subclass_progressions
       WHERE subclass_definition_id = ? AND class_level <= ?
     )
     ORDER BY ordering`,
    [subclassDefinitionId, subclassDefinitionId, targetClassLevel],
    (row) => sqlNullableString(row, 'grant_rules'),
  );
  for (const json of rows) {
    const decoded = decodeGrantJson(json);
    if (!Array.isArray(decoded)) {
      throw new TypeError(
        'Subclass grant rules must be a list.',
      );
    }
    for (const object of decoded) {
      const rule = GrantRule.fromObject(object);
      byKey.set(rule.ruleKey, rule.toObject());
    }
  }
  return [...byKey.values()];
}

export class PlannedSpellEligibilityNotFoundError extends Error {
  readonly status = 404;
}

/**
 * Recomputes the target rule plan before searching. The client supplies only
 * the logical address; it cannot smuggle a weaker constraint into the RPC.
 */
export class LevelUpPlannedEligibleSpells {
  readonly #planner = new GrantRulePlanner();
  readonly #rules: SourceRuleReader;
  readonly #search: EligibleSpellSearch;

  constructor(private readonly db: DatabaseContext) {
    this.#rules = new SourceRuleReader(db);
    this.#search = new EligibleSpellSearch(db);
  }

  search(
    params: LevelUpPlannedEligibleSpellsParams,
  ): LevelUpPlannedEligibleSpellsResult {
    const planned = this.planSource(params, params.locator.source);
    const match = planned.filter(
      (grant) =>
        sameSource(grant.locator.source, params.locator.source) &&
        grant.locator.rule_key === params.locator.rule_key &&
        grant.locator.ordinal === params.locator.ordinal,
    );
    if (match.length !== 1) {
      throw new PlannedSpellEligibilityNotFoundError(
        'The planned spell locator does not resolve exactly once.',
      );
    }
    const grant = match[0];
    if (grant === undefined) {
      throw new PlannedSpellEligibilityNotFoundError(
        'The planned spell locator does not exist.',
      );
    }
    return this.#search.searchConstraint(
      params.character_id,
      grant.constraint,
      params.query.trim(),
    );
  }

  /** The same normalized source plan consumed by state projection and search. */
  planSource(
    params: LevelUpPlannedSpellPlanParams,
    source: PlannedGrantSource,
  ): readonly PlannedSpellGrant[] {
    const revision = this.db.scalar<number>(
      'SELECT revision FROM characters WHERE id = ?',
      [params.character_id],
    );
    if (revision === null || revision !== params.expected_revision) {
      throw new PlannedSpellEligibilityNotFoundError(
        'The character or requested revision does not exist.',
      );
    }
    const held = this.db.one(
      `SELECT level.level, class_source.id AS source_id,
              class_source.config,
              subclass_source.id AS subclass_source_id,
              level.subclass_definition_id,
              subclass.content_key AS subclass_content_key
       FROM character_class_levels AS level
       INNER JOIN character_source_instances AS class_source
         ON class_source.character_id = level.character_id
        AND class_source.source_type = 'class'
        AND class_source.source_definition_id = level.class_definition_id
        AND class_source.state = ?
       LEFT JOIN character_source_instances AS subclass_source
         ON subclass_source.character_id = level.character_id
        AND subclass_source.source_type = 'subclass'
        AND subclass_source.source_definition_id =
            level.subclass_definition_id
        AND subclass_source.state = ?
       LEFT JOIN subclass_definitions AS subclass
         ON subclass.id = level.subclass_definition_id
       WHERE level.character_id = ? AND level.class_definition_id = ?`,
      [
        ACTIVE_SOURCE_INSTANCE_STATE,
        ACTIVE_SOURCE_INSTANCE_STATE,
        params.character_id,
        params.class_definition_id,
      ],
      heldClassPlan,
    );
    if (
      held === null ||
      params.target_class_level !== held.level + 1 ||
      (params.subclass_content_key !== undefined &&
        params.target_class_level !== 3)
    ) {
      throw new PlannedSpellEligibilityNotFoundError(
        'The requested adjacent held-class plan does not exist.',
      );
    }

    return this.planFor(params, source, held);
  }

  private planFor(
    params: LevelUpPlannedSpellPlanParams,
    source: PlannedGrantSource,
    held: HeldClassPlan,
  ) {
    if (source.kind === 'selected_class') {
      return this.#planner.plan({
        source: { kind: 'selected_class' },
        configured_rules: rulesFromProgressions(
          this.db,
          params.class_definition_id,
          params.target_class_level,
        ),
        config: normalizedConfig(held.config, 'Class source'),
        effective_class_level: params.target_class_level,
      });
    }

    if (
      source.kind ===
      'selected_class_subclass'
    ) {
      if (params.subclass_content_key !== undefined) {
        const selectedSubclassId = this.db.scalar<number>(
          `SELECT id FROM subclass_definitions
           WHERE content_key = ? AND class_definition_id = ?`,
          [params.subclass_content_key, params.class_definition_id],
        );
        if (selectedSubclassId === null) {
          return [];
        }
        if (
          held.subclass_source_id !== null &&
          held.subclass_definition_id === Number(selectedSubclassId)
        ) {
          return this.planExisting(
            held.subclass_source_id,
            { kind: 'selected_class_subclass' },
            params.character_id,
            params.target_class_level,
          );
        }
        const ability = this.db.scalar<string>(
          'SELECT spellcasting_ability FROM subclass_definitions WHERE id = ?',
          [Number(selectedSubclassId)],
        );
        return this.#planner.plan({
          source: { kind: 'selected_class_subclass' },
          configured_rules: rulesFromSubclassProgressions(
            this.db,
            Number(selectedSubclassId),
            params.target_class_level,
          ),
          config: { spellcasting_ability: ability },
          effective_class_level: params.target_class_level,
        });
      }
      if (held.subclass_source_id === null) return [];
      return this.planExisting(
        held.subclass_source_id,
        { kind: 'selected_class_subclass' },
        params.character_id,
        params.target_class_level,
      );
    }

    if (source.kind === 'existing_source') {
      return this.planExisting(
        source.source_instance_id,
        source,
        params.character_id,
      );
    }
    if (params.feat_choice === undefined) return [];
    const className = this.db.scalar<string>(
      'SELECT name FROM class_definitions WHERE id = ?',
      [params.class_definition_id],
    );
    if (className === null) return [];
    const asiLevels = asiLevelsForClassName(className);
    const epicBoonLevels = epicBoonLevelsForClassName(className);
    const isAsiLevel = asiLevels?.has(params.target_class_level) ?? false;
    const isEpicBoonLevel =
      epicBoonLevels?.has(params.target_class_level) ?? false;
    if (!isAsiLevel && !isEpicBoonLevel) return [];
    const otherLevels = characterLevel(this.db, params.character_id, {
      excludingClassDefinitionId: params.class_definition_id,
    });
    const featPlan = planLevelFeatSelection(this.db, {
      characterId: params.character_id,
      selection: params.feat_choice,
      projectedTotalLevel:
        (otherLevels ?? 0) + params.target_class_level,
      advancedClassDefinitionId: params.class_definition_id,
      targetClassLevel: params.target_class_level,
      targetSubclassContentKey:
        params.subclass_content_key ?? held.subclass_content_key,
      ...(isEpicBoonLevel ? { requiredGrouping: 'epic_boon' } : {}),
    });
    if (featPlan.eligibility.status !== 'qualified') return [];
    return this.#planner.plan({
      source: { kind: 'selected_feat' },
      configured_rules: featPlan.grant_rules,
      config: featPlan.config,
      effective_class_level: null,
    });
  }

  private planExisting(
    sourceId: number,
    sourceAddress: PlannedGrantSource,
    characterId: number,
    projectedClassLevel?: ClassLevel,
  ) {
    const source = this.#rules.findSource(sourceId);
    if (
      source === null ||
      source.characterId !== characterId ||
      source.state !== 'active'
    ) {
      return [];
    }
    const effectiveLevel = projectedClassLevel ?? this.effectiveLevel(source);
    return this.#planner.plan({
      source: sourceAddress,
      configured_rules:
        source.sourceType === 'subclass' &&
        source.sourceDefinitionId !== null
          ? rulesFromSubclassProgressions(
              this.db,
              source.sourceDefinitionId,
              effectiveLevel ?? 0,
            )
          : this.#rules
              .activeRulesForSource(sourceId)
              .map((rule) => rule.toObject()),
      config: normalizedConfig(source.config, 'Source'),
      effective_class_level: effectiveLevel,
    });
  }

  private effectiveLevel(
    source: GrantSourceInstance,
  ): ClassLevel | null {
    return source.sourceType === 'class' ||
      source.sourceType === 'subclass'
      ? this.#rules.classLevelForSource(source) as ClassLevel
      : null;
  }
}
