import { canonicalJson } from '../commands/canonical-json';
import { sha256 } from '../crypto/sha256';
import type { DatabaseContext } from '../db/database';
import type { ContentKey } from '../domain/ids';
import {
  assertedExternalContentKey,
} from '../catalog/catalog-key';
import {
  commitContentImport,
  planContentImport,
  type ContentImportChoices,
  type ContentImportNode,
  type ContentImportProjection,
} from '../catalog/content-adoption';
import { deriveContentIdentityV1 } from '../catalog/content-identity';
import {
  projectAuthoredContentAggregateV1,
  readStoredAuthoredContentAggregateV1,
  storedAuthoredRegistryReferencesV1,
} from '../catalog/stored-authored-content-projector-v1';
import { portableSubclassContentImportNode } from '../backup/portable-content';
import type {
  AuthoringValidationIssue,
  DenseSubclassContentProgression,
  PublishDecision,
  PublishPreview,
  PublishResult,
  StoredHomebrewDraft,
  SubclassAuthoringDraft,
  SubclassContentAggregate,
  SubclassContentProgression,
  SubclassContentProgressionRow,
} from './contracts';
import type {
  AuthoringDraftFeatureEffect,
  AuthoringFeatureEffect,
} from './effect-forms';
import type { HomebrewDraftUuid, PublishPlanToken } from './ids';
import {
  authoringFingerprintReference,
  authoringIssue,
  authoringNonEmpty,
  resolvedAuthoringEffect,
  resolvedAuthoringGrant,
} from './species-publisher';

export class SubclassSemanticValidationError extends Error {
  constructor(readonly issues: readonly AuthoringValidationIssue[]) {
    super('Subclass draft semantic validation failed.');
    this.name = 'SubclassSemanticValidationError';
  }
}

export type SubclassPublishRefusal =
  | { readonly reason: 'content_key_collision'; readonly content_key: ContentKey }
  | { readonly reason: 'publish_refused'; readonly refusal: string }
  | { readonly reason: 'publish_review_required'; readonly candidates: readonly ContentKey[] }
  | { readonly reason: 'stale_publish_plan'; readonly draft_uuid: HomebrewDraftUuid }
  | { readonly reason: 'invalid_reference' };

export class SubclassPublishError extends Error {
  constructor(message: string, readonly data: SubclassPublishRefusal) {
    super(message);
    this.name = 'SubclassPublishError';
  }
}

function featureEffect(
  draft: AuthoringDraftFeatureEffect,
  sortOrder: number,
  path: readonly (string | number)[],
  issues: AuthoringValidationIssue[],
): AuthoringFeatureEffect | null {
  if (draft.kind !== 'extra_attack') {
    const resolved = resolvedAuthoringEffect(draft, sortOrder, path, issues);
    if (resolved === null) return null;
    switch (resolved.kind) {
      case 'damage_resistance':
      case 'hp_modifier':
      case 'speed':
      case 'ability_increase':
      case 'armor_class_bonus':
      case 'armor_class_formula':
      case 'attack_ability_override':
      case 'weapon_attack_bonus':
      case 'weapon_damage_bonus':
        return resolved;
      case 'ability_override':
        authoringIssue(issues, [...path, 'kind'], 'invalid_value', 'Ability override is not a feature-template effect.');
        return null;
    }
  }
  const labelReady = authoringNonEmpty(draft.label, [...path, 'label'], issues);
  if (draft.attack_count === null) {
    authoringIssue(issues, [...path, 'attack_count'], 'required', 'Attack count is required.');
  }
  if (draft.weapon_scope === null) {
    authoringIssue(issues, [...path, 'weapon_scope'], 'required', 'Weapon scope is required.');
  }
  if (!labelReady || draft.attack_count === null || draft.weapon_scope === null) return null;
  return {
    kind: 'extra_attack',
    sort_order: sortOrder,
    label: draft.label,
    notes: draft.notes === '' ? null : draft.notes,
    attack_count: draft.attack_count,
    weapon_scope: draft.weapon_scope,
  };
}

function inspectDraftItemUuids(
  draft: SubclassAuthoringDraft,
  issues: AuthoringValidationIssue[],
): void {
  const seen = new Set<string>();
  const inspect = (value: string, path: readonly (string | number)[]) => {
    if (seen.has(value)) authoringIssue(issues, path, 'duplicate', 'Draft item UUID must be unique.');
    seen.add(value);
  };
  draft.features.forEach((feature, featureIndex) => {
    inspect(feature.draft_item_uuid, ['features', featureIndex, 'draft_item_uuid']);
    feature.effects.forEach((effect, effectIndex) =>
      inspect(effect.draft_item_uuid, ['features', featureIndex, 'effects', effectIndex, 'draft_item_uuid']));
  });
  if (draft.progression.mode === 'override') {
    draft.progression.rows.forEach((row, rowIndex) => {
      row.grants.forEach((grant, grantIndex) =>
        inspect(grant.draft_item_uuid, ['progression', 'rows', rowIndex, 'grants', grantIndex, 'draft_item_uuid']));
    });
  }
}

function rootOnlyProgression(
  draft: Extract<SubclassAuthoringDraft['progression'], { readonly mode: 'root_only' }>,
  issues: AuthoringValidationIssue[],
): SubclassContentProgression | null {
  const path = ['progression'] as const;
  if (draft.caster_fraction === null && draft.caster_rounding === null) {
    return { mode: 'root_only', spellcasting_ability: draft.spellcasting_ability, caster_fraction: null, caster_rounding: null };
  }
  if (draft.caster_fraction === '1' && draft.caster_rounding === null) {
    return { mode: 'root_only', spellcasting_ability: draft.spellcasting_ability, caster_fraction: '1', caster_rounding: null };
  }
  if (
    (draft.caster_fraction === '1/2' || draft.caster_fraction === '1/3') &&
    (draft.caster_rounding === 'up' || draft.caster_rounding === 'down')
  ) {
    return {
      mode: 'root_only',
      spellcasting_ability: draft.spellcasting_ability,
      caster_fraction: draft.caster_fraction,
      caster_rounding: draft.caster_rounding,
    };
  }
  authoringIssue(issues, path, 'invalid_value', 'Caster fraction and rounding are not a valid contribution.');
  return null;
}

function overrideProgression(
  db: DatabaseContext,
  draft: Extract<SubclassAuthoringDraft['progression'], { readonly mode: 'override' }>,
  issues: AuthoringValidationIssue[],
): SubclassContentProgression | null {
  if (draft.caster_contribution === null) {
    authoringIssue(issues, ['progression', 'caster_contribution'], 'required', 'Caster contribution is required.');
  } else if (draft.caster_contribution === 'pact') {
    authoringIssue(issues, ['progression', 'caster_contribution'], 'invalid_value', 'Subclass Pact Magic is not representable by this progression.');
  }
  if (draft.rows.length !== 20) {
    authoringIssue(issues, ['progression', 'rows'], 'required', 'Override progression requires exactly 20 rows.');
  }
  const rows: SubclassContentProgressionRow[] = [];
  draft.rows.forEach((row, rowIndex) => {
    const path = ['progression', 'rows', rowIndex] as const;
    const expectedLevel = rowIndex + 1;
    if (row.class_level !== expectedLevel) {
      authoringIssue(issues, [...path, 'class_level'], 'invalid_value', `Expected class level ${String(expectedLevel)}.`);
    }
    if (row.cantrips_known === null) authoringIssue(issues, [...path, 'cantrips_known'], 'required', 'Cantrips known is required.');
    if (row.prepared_or_known_count === null) authoringIssue(issues, [...path, 'prepared_or_known_count'], 'required', 'Prepared or known count is required.');
    if (row.maximum_spell_level === null) authoringIssue(issues, [...path, 'maximum_spell_level'], 'required', 'Maximum spell level is required.');
    if (row.slot_counts.length !== 9) authoringIssue(issues, [...path, 'slot_counts'], 'required', 'Exactly nine slot counts are required.');
    const ruleKeys = new Set<string>();
    const grants = row.grants.flatMap((grant, grantIndex) => {
      if (ruleKeys.has(grant.rule_key)) {
        authoringIssue(issues, [...path, 'grants', grantIndex, 'rule_key'], 'duplicate', 'Grant rule key must be unique within a level.');
      }
      ruleKeys.add(grant.rule_key);
      const resolved = resolvedAuthoringGrant(db, grant, [...path, 'grants', grantIndex], issues);
      return resolved === null ? [] : [resolved];
    });
    if (
      row.class_level === expectedLevel &&
      row.cantrips_known !== null &&
      row.prepared_or_known_count !== null &&
      row.maximum_spell_level !== null &&
      row.slot_counts.length === 9
    ) {
      rows.push({
        class_level: row.class_level,
        cantrips_known: row.cantrips_known,
        prepared_or_known_count: row.prepared_or_known_count,
        maximum_spell_level: row.maximum_spell_level,
        slot_counts: [
          row.slot_counts[0]!, row.slot_counts[1]!, row.slot_counts[2]!,
          row.slot_counts[3]!, row.slot_counts[4]!, row.slot_counts[5]!,
          row.slot_counts[6]!, row.slot_counts[7]!, row.slot_counts[8]!,
        ],
        grants,
      });
    }
  });
  if (
    draft.caster_contribution === null ||
    draft.caster_contribution === 'pact' ||
    rows.length !== 20
  ) return null;
  return {
    mode: 'override',
    spellcasting_ability: draft.spellcasting_ability,
    caster_contribution: draft.caster_contribution,
    rows: [
      rows[0]!, rows[1]!, rows[2]!, rows[3]!, rows[4]!,
      rows[5]!, rows[6]!, rows[7]!, rows[8]!, rows[9]!,
      rows[10]!, rows[11]!, rows[12]!, rows[13]!, rows[14]!,
      rows[15]!, rows[16]!, rows[17]!, rows[18]!, rows[19]!,
    ] as DenseSubclassContentProgression,
  };
}

export function subclassDraftToAggregate(
  db: DatabaseContext,
  draft: SubclassAuthoringDraft,
  baseContentKey: ContentKey | null,
): SubclassContentAggregate {
  const issues: AuthoringValidationIssue[] = [];
  authoringNonEmpty(draft.name, ['name'], issues);
  if (draft.rules_edition === null) authoringIssue(issues, ['rules_edition'], 'required', 'Rules edition is required.');
  if (draft.parent_class_content_key === null) {
    authoringIssue(issues, ['parent_class_content_key'], 'required', 'Parent class is required.');
  }
  if (draft.features.length === 0) {
    authoringIssue(issues, ['features'], 'required', 'At least one subclass feature is required.');
  }
  inspectDraftItemUuids(draft, issues);

  let parentClass = null;
  if (draft.parent_class_content_key !== null) {
    const parent = db.oneRaw(
      `SELECT identity.catalog_layer, identity.content_kind
       FROM class_definitions AS class
       JOIN catalog_content_identities AS identity
         ON identity.content_kind = 'class'
        AND identity.content_key = class.content_key
       WHERE class.content_key = ?`,
      [draft.parent_class_content_key],
    );
    parentClass = parent?.catalog_layer === 'bundled' && parent.content_kind === 'class'
      ? authoringFingerprintReference(db, 'class', draft.parent_class_content_key)
      : null;
    if (parentClass === null) {
      authoringIssue(issues, ['parent_class_content_key'], 'unresolved_reference', 'Parent class must resolve to one bundled class fingerprint.');
    }
  }

  let progression: SubclassContentProgression | null;
  switch (draft.progression.mode) {
    case 'inherit_parent': progression = { mode: 'inherit_parent' }; break;
    case 'root_only': progression = rootOnlyProgression(draft.progression, issues); break;
    case 'override': progression = overrideProgression(db, draft.progression, issues); break;
  }

  const repeatedNames = new Set<string>();
  const features = draft.features.flatMap((feature, featureIndex) => {
    const path = ['features', featureIndex] as const;
    if (feature.class_level === null) authoringIssue(issues, [...path, 'class_level'], 'required', 'Feature level is required.');
    const nameReady = authoringNonEmpty(feature.name, [...path, 'name'], issues);
    const descriptionReady = authoringNonEmpty(feature.description, [...path, 'description'], issues);
    const levelName = feature.class_level === null ? null : `${String(feature.class_level)}\u0000${feature.name}`;
    if (levelName !== null && repeatedNames.has(levelName)) {
      authoringIssue(issues, [...path, 'name'], 'duplicate', 'Feature name must be unique within its level.');
    }
    if (levelName !== null) repeatedNames.add(levelName);
    const effects = feature.effects.flatMap((effect, effectIndex) => {
      const resolved = featureEffect(effect, effectIndex + 1, [...path, 'effects', effectIndex], issues);
      return resolved === null ? [] : [resolved];
    });
    return feature.class_level !== null && nameReady && descriptionReady
      ? [{ source_order: featureIndex, class_level: feature.class_level, name: feature.name, description: feature.description, effects }]
      : [];
  }).sort((left, right) => left.class_level - right.class_level || left.source_order - right.source_order)
    .map(({ source_order: _sourceOrder, ...feature }, index) => ({ ...feature, sort_order: index + 1 }));

  if (
    issues.length > 0 || draft.rules_edition === null ||
    draft.parent_class_content_key === null || parentClass === null || progression === null
  ) {
    throw new SubclassSemanticValidationError(Object.freeze(issues));
  }
  const aggregate = Object.freeze({
    kind: 'subclass',
    name: draft.name.trim(),
    rules_edition: draft.rules_edition,
    reference_text: draft.reference_text,
    parent_class: parentClass,
    grants: Object.freeze([]),
    progression,
    features: Object.freeze(features),
  });
  if (aggregate.progression.mode === 'root_only') {
    let unchangedRootOnlyCopy = false;
    if (baseContentKey !== null) {
      try {
        const base = readStoredAuthoredContentAggregateV1(db, {
          kind: 'subclass',
          contentKey: baseContentKey,
          references: storedAuthoredRegistryReferencesV1(db),
        });
        unchangedRootOnlyCopy =
          base.progression.mode === 'root_only' &&
          canonicalJson(base) === canonicalJson(aggregate);
      } catch {
        // The normal validation issue below is the public boundary for a stale
        // or otherwise unreadable copied base.
      }
    }
    if (!unchangedRootOnlyCopy) {
      const preservationIssues: AuthoringValidationIssue[] = [];
      authoringIssue(
        preservationIssues,
        ['progression'],
        'invalid_value',
        'Root-only progression can only preserve an unchanged copy of published content; authored spellcasting requires a dense 20-level override.',
      );
      throw new SubclassSemanticValidationError(Object.freeze(preservationIssues));
    }
  }
  return aggregate;
}

function assertedKeyFor(aggregate: SubclassContentAggregate): ContentKey {
  try {
    return assertedExternalContentKey(aggregate.kind, aggregate.rules_edition, aggregate.name);
  } catch (error) {
    throw new SubclassSemanticValidationError([Object.freeze({
      path: Object.freeze(['name']),
      code: 'invalid_value',
      message: error instanceof Error ? error.message : 'Name cannot produce a content key.',
    })]);
  }
}

function authoringNode(
  db: DatabaseContext,
  aggregate: SubclassContentAggregate,
  contentKey: ContentKey,
): ContentImportNode<'subclass'> {
  const portable = portableSubclassContentImportNode(db, aggregate, contentKey);
  const withoutRemembered = (projection: ContentImportProjection<'subclass'>): ContentImportProjection<'subclass'> => ({
    ...projection,
    allowRememberedDecision: false,
  });
  const base = {
    id: portable.id,
    projection: withoutRemembered(portable.projection),
  };
  if (portable.reproject === undefined) return Object.freeze(base);
  const reproject = portable.reproject;
  return Object.freeze({
    ...base,
    reproject: (input: Parameters<typeof reproject>[0]) =>
      withoutRemembered(reproject({ ...input, dependencies: new Map() })),
  });
}

function operationIdentity(draft: StoredHomebrewDraft, aggregate: SubclassContentAggregate): string {
  return sha256(canonicalJson({ operation: 'authoring.publish.subclass', draft_uuid: draft.draft_uuid, draft_revision: draft.revision, aggregate }));
}

function encodedToken(draft: StoredHomebrewDraft, aggregate: SubclassContentAggregate, importToken: string): PublishPlanToken {
  return JSON.stringify([draft.draft_uuid, sha256(canonicalJson({
    operation_identity: operationIdentity(draft, aggregate),
    import_plan_token: importToken,
  }))]) as PublishPlanToken;
}

export function previewSubclassPublish(db: DatabaseContext, draft: StoredHomebrewDraft): PublishPreview {
  if (draft.content_kind !== 'subclass' || draft.document.kind !== 'subclass') {
    throw new SubclassPublishError('HA-5 publishes subclass drafts only.', { reason: 'invalid_reference' });
  }
  const aggregate = subclassDraftToAggregate(db, draft.document, draft.base_content_key);
  const assertedKey = assertedKeyFor(aggregate);
  const node = authoringNode(db, aggregate, assertedKey);
  const plan = planContentImport(db, [node], Object.freeze({}), Object.freeze([]), operationIdentity(draft, aggregate));
  const collision = plan.reviews.find((review) => review.matchClass === 'key-collision');
  if (collision !== undefined) throw new SubclassPublishError('The asserted subclass key already names different content.', { reason: 'content_key_collision', content_key: collision.targetContentKey });
  const refused = plan.outcomes.find((outcome) => outcome.kind === 'refused');
  if (refused?.kind === 'refused') throw new SubclassPublishError('The subclass publisher refused the aggregate.', { reason: 'publish_refused', refusal: refused.reason });
  const projected = projectAuthoredContentAggregateV1(aggregate);
  const identity = deriveContentIdentityV1({ kind: 'subclass', edition: aggregate.rules_edition, name: aggregate.name, payload: projected.payload });
  return Object.freeze({
    token: encodedToken(draft, aggregate, plan.token),
    facts: Object.freeze({
      draft_uuid: draft.draft_uuid,
      draft_revision: draft.revision,
      content_kind: 'subclass',
      canonical_json: identity.canonicalJson,
      candidate_content_keys: Object.freeze([...new Set(plan.outcomes.flatMap((outcome) => outcome.kind === 'refused' ? [] : [outcome.contentKey]))]),
      candidate_identities: Object.freeze([{ kind: 'subclass' as const, scheme: identity.envelope.scheme, digest: identity.digest }]),
    }),
    aggregate,
    review: Object.freeze(plan.reviews.map((review) => {
      if (review.matchClass === 'key-collision') throw new SubclassPublishError('The asserted subclass key already names different content.', { reason: 'content_key_collision', content_key: review.targetContentKey });
      return Object.freeze({ candidate_content_key: review.targetContentKey, candidate_name: review.localName, reason: review.matchClass, default_decision: 'match' as const });
    })),
  });
}

function choicesFor(preview: PublishPreview, decisions: readonly PublishDecision[], nodeId: string): ContentImportChoices {
  if (preview.review.length === 0) {
    if (decisions.length !== 0) throw new SubclassPublishError('This publish has no review decision to apply.', { reason: 'invalid_reference' });
    return Object.freeze({});
  }
  const review = preview.review[0]!;
  const matching = decisions.filter((decision) => decision.candidate_content_key === review.candidate_content_key);
  if (decisions.length !== 1 || matching.length !== 1) {
    throw new SubclassPublishError('Publish adoption review is required.', { reason: 'publish_review_required', candidates: preview.review.map((item) => item.candidate_content_key) });
  }
  const decision = matching[0]!;
  return Object.freeze({ [nodeId]: decision.decision === 'match' ? { decision: 'match' as const } : { decision: 'clone' as const, cloneName: decision.clone_name } });
}

function publishedResultRow(db: DatabaseContext, contentKey: ContentKey): { readonly name: string; readonly catalog_layer: PublishResult['catalog_layer'] } {
  const row = db.oneRaw(
    `SELECT subclass.name, identity.catalog_layer
     FROM subclass_definitions AS subclass
     JOIN catalog_content_identities AS identity
       ON identity.content_kind = 'subclass' AND identity.content_key = subclass.content_key
     WHERE subclass.content_key = ?`,
    [contentKey],
  );
  if (row === null || typeof row.name !== 'string' || (row.catalog_layer !== 'bundled' && row.catalog_layer !== 'external')) {
    throw new SubclassPublishError('Published subclass result cannot be resolved.', { reason: 'publish_refused', refusal: 'missing_result' });
  }
  return { name: row.name, catalog_layer: row.catalog_layer };
}

export function commitSubclassPublish(
  db: DatabaseContext,
  draft: StoredHomebrewDraft,
  token: PublishPlanToken,
  decisions: readonly PublishDecision[],
  previousKeyUsageCount: number,
): PublishResult {
  const preview = previewSubclassPublish(db, draft);
  if (preview.token !== token || preview.aggregate.kind !== 'subclass') {
    throw new SubclassPublishError('The publish plan is stale.', { reason: 'stale_publish_plan', draft_uuid: draft.draft_uuid });
  }
  const aggregate = preview.aggregate;
  const assertedKey = assertedKeyFor(aggregate);
  const node = authoringNode(db, aggregate, assertedKey);
  const choices = choicesFor(preview, decisions, node.id);
  const operation = operationIdentity(draft, aggregate);
  const chosenPlan = planContentImport(db, [node], choices, Object.freeze([]), operation);
  const refusal = chosenPlan.outcomes.find((outcome) => outcome.kind === 'refused');
  if (refusal?.kind === 'refused') {
    throw new SubclassPublishError('The chosen subclass publish was refused.', refusal.reason === 'clone_key_collision'
      ? { reason: 'content_key_collision', content_key: assertedKey }
      : { reason: 'publish_refused', refusal: refusal.reason });
  }
  const committed = commitContentImport(db, {
    nodes: [node],
    token: chosenPlan.token,
    choices,
    operationIdentity: operation,
    afterInstall: (transaction) => {
      const deleted = transaction.exec('DELETE FROM catalog_content_drafts WHERE draft_uuid = ? AND revision = ?', [draft.draft_uuid, draft.revision]);
      if (deleted.changes !== 1) throw new Error('Draft changed before publish commit.');
    },
  });
  if (committed.kind === 'stale-plan') throw new SubclassPublishError('The publish plan is stale.', { reason: 'stale_publish_plan', draft_uuid: draft.draft_uuid });
  if (committed.kind === 'refused') throw new SubclassPublishError('The subclass publish transaction was refused.', { reason: 'publish_refused', refusal: committed.reason });
  const outcome = committed.outcomes[0];
  if (outcome === undefined || outcome.kind === 'refused') throw new SubclassPublishError('The subclass publisher returned no result.', { reason: 'publish_refused', refusal: 'missing_outcome' });
  const result = publishedResultRow(db, outcome.contentKey);
  return outcome.kind === 'create' || outcome.kind === 'remembered-clone'
    ? Object.freeze({ outcome: 'created', content_key: outcome.contentKey, name: result.name, catalog_layer: 'external', previous_key_usage_count: previousKeyUsageCount })
    : Object.freeze({ outcome: 'matched_existing', content_key: outcome.contentKey, name: result.name, catalog_layer: result.catalog_layer, previous_key_usage_count: previousKeyUsageCount });
}
