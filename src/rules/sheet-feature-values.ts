import { sqlString, type SqlRow } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import {
  sourceRefKey,
  type SourceRef,
  type TermStatusFor,
} from '../domain/computed';
import {
  contributionSource,
  featureValueKeys,
  foldFeatureValues,
  type AuthoredResourceRef,
  type FeatureValueContribution,
  type FeatureValueKey,
} from '../domain/feature-values';
import type { ClassLevel, ContentKey } from '../domain/ids';
import type {
  PositiveInteger,
  PositiveResourceMaximum,
} from '../domain/class-resources';
import { decodeStoredSupersedesReference } from '../domain/contracts/row-rules';
import { decodeStoredValueExpression } from '../domain/contracts/row-rules';
import {
  decodedValueExpression,
  evaluateValue,
  type ValueEvaluationContext,
  type ValueResolution,
} from '../domain/value-expression';
import { SRD_ARCANE_RECOVERY_DESCRIPTION } from './class-resources-srd';

export interface FeatureValueClassInput {
  readonly class_definition_id: number;
  readonly class_content_key: ContentKey;
  readonly class_level: ClassLevel;
  readonly subclass: {
    readonly id: number;
    readonly content_key: ContentKey;
  } | null;
}

export interface SheetFeatureValueTerm {
  readonly source: SourceRef;
  /** Catalog-authored display text; readable projection only. */
  readonly label: string;
  readonly contribution: number;
  readonly is_base: boolean;
  readonly status: TermStatusFor<'add'>;
}

export type SheetFeatureValue =
  | {
      readonly status: 'computed';
      readonly id: string;
      readonly key: FeatureValueKey;
      readonly label: 'Sneak Attack';
      readonly die_size: 6;
      readonly value: number;
      readonly terms: readonly SheetFeatureValueTerm[];
    }
  | {
      readonly status: 'unavailable';
      readonly id: string;
      readonly key: FeatureValueKey;
      readonly label: 'Sneak Attack';
      readonly reason:
        | Extract<ValueResolution, { readonly kind: 'unavailable' }>['reason']
        | 'malformed_supersession'
        | 'duplicate_source';
    }
  | {
      readonly status: 'computed';
      readonly kind: 'resource_maximum';
      readonly id: 'feature-value:arcane_recovery';
      readonly key: 'arcane_recovery';
      readonly label: 'Arcane Recovery slot-level budget';
      readonly value: number;
      readonly terms: readonly SheetFeatureValueTerm[];
      readonly catalog_layer: 'bundled';
      /** Sourced rule text; readable and inert, never part of sheet facts. */
      readonly description: string;
    }
  | {
      readonly status: 'unavailable';
      readonly kind: 'resource_maximum';
      readonly id: 'feature-value:arcane_recovery';
      readonly key: 'arcane_recovery';
      readonly label: 'Arcane Recovery slot-level budget';
      readonly reason: Extract<
        ValueResolution,
        { readonly kind: 'unavailable' }
      >['reason'];
      readonly catalog_layer: 'bundled';
      readonly description: string;
    };

export type SheetAuthoredResourceMaximum =
  | {
      readonly status: 'computed';
      readonly kind: 'authored';
      readonly id: string;
      readonly fact_key: string;
      readonly label: string;
      readonly maximum: PositiveResourceMaximum;
      readonly marking_shape: AuthoredResourceRef['marking_shape'];
      readonly terms: readonly SheetFeatureValueTerm[];
    }
  | {
      readonly status: 'unavailable';
      readonly kind: 'authored';
      readonly id: string;
      readonly fact_key: string;
      readonly label: string;
      readonly marking_shape: AuthoredResourceRef['marking_shape'];
      readonly reason:
        | Extract<ValueResolution, { readonly kind: 'unavailable' }>['reason']
        | 'malformed_supersession'
        | 'duplicate_source';
    };

const ARCANE_RECOVERY_CONTENT_KEY = '2024:class:wizard' as ContentKey;

function arcaneRecoveryValue(
  classes: readonly FeatureValueClassInput[],
  context: ValueEvaluationContext,
): Extract<SheetFeatureValue, { readonly kind: 'resource_maximum' }> | null {
  if (
    !classes.some(
      (entry) => entry.class_content_key === ARCANE_RECOVERY_CONTENT_KEY,
    )
  ) {
    return null;
  }
  const evaluated = evaluateValue(
    {
      kind: 'scale',
      source: {
        kind: 'class_level',
        class_content_key: ARCANE_RECOVERY_CONTENT_KEY,
      },
      divide: 2 as PositiveInteger,
      round: 'ceiling',
    },
    context,
  );
  const common = {
    kind: 'resource_maximum' as const,
    id: 'feature-value:arcane_recovery' as const,
    key: 'arcane_recovery' as const,
    label: 'Arcane Recovery slot-level budget' as const,
    catalog_layer: 'bundled' as const,
    description: SRD_ARCANE_RECOVERY_DESCRIPTION,
  };
  if (evaluated.kind === 'unavailable') {
    return { status: 'unavailable', ...common, reason: evaluated.reason };
  }
  return {
    status: 'computed',
    ...common,
    value: evaluated.value,
    terms: [
      {
        source: contributionSource(
          ARCANE_RECOVERY_CONTENT_KEY,
          'arcane-recovery-budget',
        ),
        label: 'Half Wizard level, rounded up',
        contribution: evaluated.value,
        is_base: true,
        status: 'applied',
      },
    ],
  };
}

interface ActiveStoredContribution {
  readonly content_key: ContentKey;
  readonly contribution_key: string;
  readonly label: string;
  readonly target_key: FeatureValueKey;
  readonly value_json: string;
  readonly supersedes_ref: string | null;
  readonly is_base: boolean;
}

function isFeatureValueKey(value: string): value is FeatureValueKey {
  return (featureValueKeys as readonly string[]).includes(value);
}

function row(
  contentKey: ContentKey,
  value: SqlRow,
  owner: 'class' | 'subclass',
): ActiveStoredContribution {
  const contributionKey = sqlString(value, 'contribution_key');
  const targetKey = sqlString(value, 'target_key');
  if (!isFeatureValueKey(targetKey)) {
    throw new TypeError(`Unknown stored feature-value target ${targetKey}.`);
  }
  const supersedes = value.supersedes_ref;
  if (supersedes !== null && typeof supersedes !== 'string') {
    throw new TypeError('Stored feature-value supersedes_ref is not text.');
  }
  return {
    content_key: contentKey,
    contribution_key: contributionKey,
    label: sqlString(value, 'label'),
    target_key: targetKey,
    value_json: sqlString(value, 'value_json'),
    supersedes_ref: supersedes,
    is_base: owner === 'class' && contributionKey === 'sneak-attack',
  };
}

/** Provider-owned acquisition filtering: rows outside their level band do not exist here. */
function activeRows(
  db: DatabaseContext,
  classes: readonly FeatureValueClassInput[],
): readonly ActiveStoredContribution[] {
  const rows: ActiveStoredContribution[] = [];
  for (const entry of classes) {
    rows.push(
      ...db.all(
        `SELECT contribution_key, label, target_key, value_json, supersedes_ref
           FROM class_feature_value_contributions
          WHERE class_definition_id = ?
            AND target_kind = 'feature_dice_count'
            AND active_from_level <= ?
            AND active_to_level >= ?
          ORDER BY id`,
        [entry.class_definition_id, entry.class_level, entry.class_level],
        (stored) => row(entry.class_content_key, stored, 'class'),
      ),
    );
    const subclass = entry.subclass;
    if (subclass === null) continue;
    rows.push(
      ...db.all(
        `SELECT contribution.contribution_key, contribution.label,
                contribution.target_key, contribution.value_json,
                contribution.supersedes_ref
           FROM subclass_feature_value_contributions AS contribution
           JOIN subclass_features AS feature
             ON feature.id = contribution.subclass_feature_id
          WHERE feature.subclass_definition_id = ?
            AND feature.class_level <= ?
            AND contribution.target_kind = 'feature_dice_count'
            AND contribution.active_from_level <= ?
            AND contribution.active_to_level >= ?
          ORDER BY feature.sort_order, contribution.id`,
        [
          subclass.id,
          entry.class_level,
          entry.class_level,
          entry.class_level,
        ],
        (stored) => row(subclass.content_key, stored, 'subclass'),
      ),
    );
  }
  return rows;
}

function supersedesReference(
  json: string | null,
):
  | { readonly kind: 'none' }
  | {
      readonly kind: 'valid';
      readonly value: ReturnType<typeof contributionSource>;
    }
  | { readonly kind: 'invalid' } {
  let value: ReturnType<typeof decodeStoredSupersedesReference>;
  try {
    value = decodeStoredSupersedesReference(
      json,
      'sheet feature-value supersedes_ref',
    );
  } catch {
    return { kind: 'invalid' };
  }
  if (value === null) return { kind: 'none' };
  const contentKey = value.content_key;
  const contributionKey = value.contribution_key;
  return typeof contentKey === 'string' && typeof contributionKey === 'string'
    ? {
        kind: 'valid',
        value: contributionSource(contentKey as ContentKey, contributionKey),
      }
    : { kind: 'invalid' };
}

function unavailable(
  key: FeatureValueKey,
  reason: Extract<SheetFeatureValue, { readonly status: 'unavailable' }>['reason'],
): SheetFeatureValue {
  return {
    status: 'unavailable',
    id: `feature-value:${key}`,
    key,
    label: 'Sneak Attack',
    reason,
  };
}

export function resolveSheetFeatureValues(
  db: DatabaseContext,
  classes: readonly FeatureValueClassInput[],
  context: ValueEvaluationContext,
): readonly SheetFeatureValue[] {
  const grouped = new Map<FeatureValueKey, ActiveStoredContribution[]>();
  for (const stored of activeRows(db, classes)) {
    const group = grouped.get(stored.target_key) ?? [];
    group.push(stored);
    grouped.set(stored.target_key, group);
  }

  const values = [...grouped].map(([key, storedRows]): SheetFeatureValue => {
    const contributions: FeatureValueContribution<'feature_dice_count'>[] = [];
    const labels = new Map<string, string>();
    const baseSources = new Set<string>();
    const seenSources = new Set<string>();
    for (const stored of storedRows) {
      const source = contributionSource(
        stored.content_key,
        stored.contribution_key,
      );
      const sourceIdentity = sourceRefKey(source);
      if (seenSources.has(sourceIdentity)) {
        return unavailable(key, 'duplicate_source');
      }
      seenSources.add(sourceIdentity);
      if (stored.is_base) baseSources.add(sourceIdentity);
      try {
        decodeStoredValueExpression(
          stored.value_json,
          `sheet feature value ${stored.contribution_key}`,
        );
      } catch {
        return unavailable(key, 'invalid_data');
      }
      const decoded = decodedValueExpression(stored.value_json);
      if (decoded.kind === 'invalid_data') {
        return unavailable(key, 'invalid_data');
      }
      const evaluated = evaluateValue(decoded.value, context);
      if (evaluated.kind === 'unavailable') {
        return unavailable(key, evaluated.reason);
      }
      labels.set(sourceIdentity, stored.label);
      const supersedes = supersedesReference(stored.supersedes_ref);
      if (supersedes.kind === 'invalid') {
        return unavailable(key, 'invalid_data');
      }
      contributions.push({
        source,
        target: { kind: 'feature_dice_count', key },
        op: 'add',
        value: evaluated.value,
        ...(supersedes.kind === 'none' ? {} : { supersedes: supersedes.value }),
      });
    }
    const folded = foldFeatureValues(contributions);
    if (folded.kind === 'malformed_graph') {
      return unavailable(key, 'malformed_supersession');
    }
    const missingLabel = folded.computed.terms.some(
      (term) => !labels.has(sourceRefKey(term.source)),
    );
    if (missingLabel) return unavailable(key, 'invalid_data');
    return {
      status: 'computed',
      id: `feature-value:${key}`,
      key,
      label: 'Sneak Attack',
      die_size: 6,
      value: folded.computed.value,
      terms: folded.computed.terms.map((term) => ({
        source: term.source,
        label: labels.get(sourceRefKey(term.source)) as string,
        contribution: term.contribution as number,
        is_base: baseSources.has(sourceRefKey(term.source)),
        status: term.status,
      })),
    };
  });
  const arcaneRecovery = arcaneRecoveryValue(classes, context);
  return arcaneRecovery === null ? values : [...values, arcaneRecovery];
}

interface ActiveAuthoredResourceContribution {
  readonly content_key: ContentKey;
  readonly contribution_key: string;
  readonly label: string;
  readonly fact_key: string;
  readonly display_label: string;
  readonly marking_shape: AuthoredResourceRef['marking_shape'];
  readonly value_json: string;
  readonly supersedes_ref: string | null;
}

function authoredResourceRows(
  db: DatabaseContext,
  classes: readonly FeatureValueClassInput[],
): readonly ActiveAuthoredResourceContribution[] {
  const rows: ActiveAuthoredResourceContribution[] = [];
  for (const entry of classes) {
    const subclass = entry.subclass;
    if (subclass === null) continue;
    rows.push(...db.all(
      `SELECT contribution.contribution_key, contribution.label,
              contribution.target_key, contribution.value_json,
              contribution.supersedes_ref,
              contribution.resource_display_label,
              contribution.resource_marking_shape
         FROM subclass_feature_value_contributions AS contribution
         JOIN subclass_features AS feature
           ON feature.id = contribution.subclass_feature_id
        WHERE feature.subclass_definition_id = ?
          AND feature.class_level <= ?
          AND contribution.target_kind = 'resource_maximum'
          AND contribution.active_from_level <= ?
          AND contribution.active_to_level >= ?
        ORDER BY feature.sort_order, contribution.id`,
      [subclass.id, entry.class_level, entry.class_level, entry.class_level],
      (stored): ActiveAuthoredResourceContribution => {
        const markingShape = sqlString(stored, 'resource_marking_shape');
        if (markingShape !== 'boxes' && markingShape !== 'remaining') {
          throw new TypeError(`Unknown authored resource marking shape ${markingShape}.`);
        }
        const supersedes = stored.supersedes_ref;
        if (supersedes !== null && typeof supersedes !== 'string') {
          throw new TypeError('Stored authored-resource supersedes_ref is not text.');
        }
        return {
          content_key: subclass.content_key,
          contribution_key: sqlString(stored, 'contribution_key'),
          label: sqlString(stored, 'label'),
          fact_key: sqlString(stored, 'target_key'),
          display_label: sqlString(stored, 'resource_display_label'),
          marking_shape: markingShape,
          value_json: sqlString(stored, 'value_json'),
          supersedes_ref: supersedes,
        };
      },
    ));
  }
  return rows;
}

/** Resolves user-authored pool sizes beside the closed class-resource vocabulary. */
export function resolveSheetAuthoredResources(
  db: DatabaseContext,
  classes: readonly FeatureValueClassInput[],
  context: ValueEvaluationContext,
): readonly SheetAuthoredResourceMaximum[] {
  const grouped = new Map<string, ActiveAuthoredResourceContribution[]>();
  for (const stored of authoredResourceRows(db, classes)) {
    const group = grouped.get(stored.fact_key) ?? [];
    group.push(stored);
    grouped.set(stored.fact_key, group);
  }
  return [...grouped].map(([factKey, storedRows]) => {
    const first = storedRows[0]!;
    const id = `resource:authored:${encodeURIComponent(factKey)}`;
    const common = {
      kind: 'authored' as const,
      id,
      fact_key: factKey,
      label: first.display_label,
      marking_shape: first.marking_shape,
    };
    const contributions: FeatureValueContribution<'resource_maximum'>[] = [];
    const labels = new Map<string, string>();
    const seenSources = new Set<string>();
    for (const stored of storedRows) {
      if (
        stored.display_label !== first.display_label ||
        stored.marking_shape !== first.marking_shape
      ) {
        return { status: 'unavailable' as const, ...common, reason: 'invalid_data' as const };
      }
      const source = contributionSource(stored.content_key, stored.contribution_key);
      const sourceIdentity = sourceRefKey(source);
      if (seenSources.has(sourceIdentity)) {
        return { status: 'unavailable' as const, ...common, reason: 'duplicate_source' as const };
      }
      seenSources.add(sourceIdentity);
      try {
        decodeStoredValueExpression(
          stored.value_json,
          `sheet authored resource ${stored.contribution_key}`,
        );
      } catch {
        return { status: 'unavailable' as const, ...common, reason: 'invalid_data' as const };
      }
      const decoded = decodedValueExpression(stored.value_json);
      if (decoded.kind === 'invalid_data') {
        return { status: 'unavailable' as const, ...common, reason: 'invalid_data' as const };
      }
      const evaluated = evaluateValue(decoded.value, context);
      if (evaluated.kind === 'unavailable') {
        return { status: 'unavailable' as const, ...common, reason: evaluated.reason };
      }
      const supersedes = supersedesReference(stored.supersedes_ref);
      if (supersedes.kind === 'invalid') {
        return { status: 'unavailable' as const, ...common, reason: 'invalid_data' as const };
      }
      labels.set(sourceIdentity, stored.label);
      contributions.push({
        source,
        target: {
          kind: 'resource_maximum',
          resource: {
            fact_key: factKey,
            display_label: first.display_label,
            marking_shape: first.marking_shape,
          },
        },
        op: 'add',
        value: evaluated.value,
        ...(supersedes.kind === 'none' ? {} : { supersedes: supersedes.value }),
      });
    }
    const folded = foldFeatureValues(contributions);
    if (folded.kind === 'malformed_graph') {
      return { status: 'unavailable' as const, ...common, reason: 'malformed_supersession' as const };
    }
    if (!Number.isSafeInteger(folded.computed.value) || folded.computed.value < 1) {
      return { status: 'unavailable' as const, ...common, reason: 'invalid_data' as const };
    }
    const missingLabel = folded.computed.terms.some(
      (term) => !labels.has(sourceRefKey(term.source)),
    );
    if (missingLabel) {
      return { status: 'unavailable' as const, ...common, reason: 'invalid_data' as const };
    }
    return {
      status: 'computed' as const,
      ...common,
      maximum: folded.computed.value as PositiveResourceMaximum,
      terms: folded.computed.terms.map((term) => ({
        source: term.source,
        label: labels.get(sourceRefKey(term.source)) as string,
        contribution: term.contribution as number,
        is_base: false,
        status: term.status,
      })),
    };
  });
}
