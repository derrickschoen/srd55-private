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
import {
  decodeGrantJson,
  SourceRuleReader,
  type GrantSourceInstance,
} from '../grants/source-rule-reader';
import { GrantRule, type GrantRuleObject } from '../grants/grant-rule';
import type { JsonObject } from '../domain/models';
import type { ClassLevel } from '../domain/ids';

interface HeldClassPlan {
  readonly level: number;
  readonly source_id: number;
  readonly config: string | null;
  readonly subclass_source_id: number | null;
}

function heldClassPlan(row: SqlRow): HeldClassPlan {
  return {
    level: sqlInteger(row, 'level'),
    source_id: sqlInteger(row, 'source_id'),
    config: sqlNullableString(row, 'config'),
    subclass_source_id: sqlNullableInteger(row, 'subclass_source_id'),
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
              subclass_source.id AS subclass_source_id
       FROM character_class_levels AS level
       INNER JOIN character_source_instances AS class_source
         ON class_source.character_id = level.character_id
        AND class_source.source_type = 'class'
        AND class_source.source_definition_id = level.class_definition_id
        AND class_source.state = 'active'
       LEFT JOIN character_source_instances AS subclass_source
         ON subclass_source.character_id = level.character_id
        AND subclass_source.source_type = 'subclass'
        AND subclass_source.source_definition_id =
            level.subclass_definition_id
        AND subclass_source.state = 'active'
       WHERE level.character_id = ? AND level.class_definition_id = ?`,
      [params.character_id, params.class_definition_id],
      heldClassPlan,
    );
    if (
      held === null ||
      params.target_class_level !== held.level + 1
    ) {
      throw new PlannedSpellEligibilityNotFoundError(
        'The requested adjacent held-class plan does not exist.',
      );
    }

    const planned = this.planFor(params, held);
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

  private planFor(
    params: LevelUpPlannedEligibleSpellsParams,
    held: HeldClassPlan,
  ) {
    if (params.locator.source.kind === 'selected_class') {
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
      params.locator.source.kind ===
      'selected_class_subclass'
    ) {
      if (held.subclass_source_id === null) {
        return [];
      }
      return this.planExisting(
        held.subclass_source_id,
        { kind: 'selected_class_subclass' },
        params.target_class_level,
      );
    }

    if (params.locator.source.kind === 'existing_source') {
      return this.planExisting(
        params.locator.source.source_instance_id,
        params.locator.source,
        params.target_class_level,
      );
    }

    // LU-0 supplies selected-feat rules through FeatApplicationPlan to the
    // planner in-process. Until that builder exists, the public RPC has no
    // trusted feat definition/config projection from which to recompute them.
    return [];
  }

  private planExisting(
    sourceId: number,
    sourceAddress: PlannedGrantSource,
    targetClassLevel: ClassLevel,
  ) {
    const source = this.#rules.findSource(sourceId);
    if (source === null || source.state !== 'active') {
      return [];
    }
    const effectiveLevel = this.effectiveLevel(
      source,
      targetClassLevel,
    );
    return this.#planner.plan({
      source: sourceAddress,
      configured_rules:
        source.sourceType === 'subclass' &&
        source.sourceDefinitionId !== null
          ? rulesFromSubclassProgressions(
              this.db,
              source.sourceDefinitionId,
              targetClassLevel,
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
    targetClassLevel: ClassLevel,
  ): ClassLevel | null {
    return source.sourceType === 'class' ||
      source.sourceType === 'subclass'
      ? targetClassLevel
      : null;
  }
}
