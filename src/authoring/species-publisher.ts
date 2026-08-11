import { canonicalJson } from '../commands/canonical-json';
import { sha256 } from '../crypto/sha256';
import { sqlString } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import {
  creatureSize,
  creatureType,
  damageType,
} from '../domain/enums';
import type { ContentKey } from '../domain/ids';
import {
  assertedExternalContentKey,
} from '../catalog/catalog-key';
import {
  type ContentImportChoices,
  type ContentImportNode,
  type ContentImportProjection,
} from '../catalog/content-adoption';
import {
  commitImmutableCatalogPublication,
  planImmutableCatalogPublication,
} from '../catalog/authoring-lifecycle';
import {
  CONTENT_FINGERPRINT_SCHEME_V1,
  deriveContentIdentityV1,
  type ContentKind,
} from '../catalog/content-identity';
import { portableSourceContentImportNode } from '../catalog/source-content-importer';
import { projectAuthoredContentAggregateV1 } from '../catalog/stored-authored-content-projector-v1';
import { storedContentMatchesFingerprintReferenceV1 } from '../catalog/stored-content-projector-v1';
import type {
  AuthoringDraftGrant,
  AuthoringGrant,
  AuthoringValidationIssue,
  ContentFingerprintReference,
  PublishDecision,
  PublishPreview,
  PublishResult,
  SpeciesAuthoringDraft,
  SpeciesContentAggregate,
  StoredHomebrewDraft,
} from './contracts';
import type {
  AuthoringCharacterEffect,
  AuthoringDraftCharacterEffect,
} from './effect-forms';
import type { HomebrewDraftUuid, PublishPlanToken } from './ids';

export class SpeciesSemanticValidationError extends Error {
  constructor(readonly issues: readonly AuthoringValidationIssue[]) {
    super('Species draft semantic validation failed.');
    this.name = 'SpeciesSemanticValidationError';
  }
}

export type SpeciesPublishRefusal =
  | {
      readonly reason: 'content_key_collision';
      readonly content_key: ContentKey;
    }
  | {
      readonly reason: 'publish_refused';
      readonly refusal: string;
    }
  | {
      readonly reason: 'publish_review_required';
      readonly candidates: readonly ContentKey[];
    }
  | {
      readonly reason: 'stale_publish_plan';
      readonly draft_uuid: HomebrewDraftUuid;
    }
  | {
      readonly reason: 'invalid_reference';
    };

export class SpeciesPublishError extends Error {
  constructor(message: string, readonly data: SpeciesPublishRefusal) {
    super(message);
    this.name = 'SpeciesPublishError';
  }
}

export function authoringIssue(
  issues: AuthoringValidationIssue[],
  path: readonly (string | number)[],
  code: AuthoringValidationIssue['code'],
  message: string,
): void {
  issues.push(Object.freeze({ path: Object.freeze([...path]), code, message }));
}

export function authoringNonEmpty(
  value: string,
  path: readonly (string | number)[],
  issues: AuthoringValidationIssue[],
): boolean {
  if (value.trim() !== '') return true;
  authoringIssue(issues, path, 'required', 'Must not be empty.');
  return false;
}

export function authoringFingerprintReference<K extends ContentKind>(
  db: DatabaseContext,
  kind: K,
  contentKey: ContentKey,
): ContentFingerprintReference<K> | null {
  const rows = db.all(
    `SELECT fingerprint.fingerprint_digest
     FROM catalog_content_identities AS identity
     JOIN catalog_content_fingerprints AS fingerprint
       ON fingerprint.content_kind = identity.content_kind
      AND fingerprint.content_key = identity.content_key
     WHERE identity.content_kind = ? AND identity.content_key = ?
       AND fingerprint.fingerprint_scheme = ?
       AND fingerprint.fingerprint_role = 'current'
     ORDER BY fingerprint.fingerprint_digest`,
    [kind, contentKey, CONTENT_FINGERPRINT_SCHEME_V1],
    (row) => sqlString(row, 'fingerprint_digest'),
  );
  if (rows.length !== 1) return null;
  if (!/^[0-9a-f]{64}$/u.test(rows[0]!)) return null;
  const targets = db.all(
    `SELECT DISTINCT content_key
     FROM catalog_content_fingerprints
     WHERE content_kind = ? AND fingerprint_scheme = ?
       AND fingerprint_digest = ?
       AND fingerprint_role IN ('current', 'compatible')
     ORDER BY content_key`,
    [kind, CONTENT_FINGERPRINT_SCHEME_V1, rows[0]!],
    (row) => sqlString(row, 'content_key'),
  );
  if (targets.length !== 1 || targets[0] !== contentKey) return null;
  const reference = Object.freeze({
    kind,
    scheme: CONTENT_FINGERPRINT_SCHEME_V1,
    digest: rows[0]!,
  }) as ContentFingerprintReference<K>;
  return storedContentMatchesFingerprintReferenceV1(db, contentKey, reference)
    ? reference
    : null;
}

export function resolvedAuthoringEffect(
  draft: AuthoringDraftCharacterEffect,
  sortOrder: number,
  path: readonly (string | number)[],
  issues: AuthoringValidationIssue[],
): AuthoringCharacterEffect | null {
  const labelReady = authoringNonEmpty(draft.label, [...path, 'label'], issues);
  const common = {
    label: draft.label,
    notes: draft.notes === '' ? null : draft.notes,
    sort_order: sortOrder,
  };
  switch (draft.kind) {
    case 'damage_resistance':
      if (draft.damage_type === null) {
        authoringIssue(issues, [...path, 'damage_type'], 'required', 'Damage type is required.');
        return null;
      }
      if (!authoringNonEmpty(draft.damage_type, [...path, 'damage_type'], issues) || !labelReady) return null;
      return { kind: draft.kind, ...common, damage_type: damageType(draft.damage_type) };
    case 'hp_modifier':
      if (draft.hit_points_flat === null && draft.hit_points_per_level === null) {
        authoringIssue(issues, path, 'required', 'At least one hit point modifier is required.');
        return null;
      }
      if (!labelReady) return null;
      return {
        kind: draft.kind,
        ...common,
        hit_points_flat: draft.hit_points_flat,
        hit_points_per_level: draft.hit_points_per_level,
      };
    case 'speed':
      if (draft.speed_bonus_feet === null) {
        authoringIssue(issues, [...path, 'speed_bonus_feet'], 'required', 'Speed is required.');
        return null;
      }
      if (!labelReady) return null;
      return { kind: draft.kind, ...common, speed_bonus_feet: draft.speed_bonus_feet };
    case 'ability_increase':
      if (draft.ability === null) authoringIssue(issues, [...path, 'ability'], 'required', 'Ability is required.');
      if (draft.amount === null) authoringIssue(issues, [...path, 'amount'], 'required', 'Amount is required.');
      else if (draft.amount === 0) authoringIssue(issues, [...path, 'amount'], 'invalid_value', 'Amount must be non-zero.');
      if (draft.maximum === null) authoringIssue(issues, [...path, 'maximum'], 'required', 'Maximum is required.');
      if (!labelReady || draft.ability === null || draft.amount === null || draft.amount === 0 || draft.maximum === null) return null;
      return { kind: draft.kind, ...common, ability: draft.ability, amount: draft.amount, maximum: draft.maximum };
    case 'ability_override':
      if (draft.ability === null) authoringIssue(issues, [...path, 'ability'], 'required', 'Ability is required.');
      if (draft.maximum === null) authoringIssue(issues, [...path, 'maximum'], 'required', 'Set-to score is required.');
      if (!labelReady || draft.ability === null || draft.maximum === null) return null;
      return { kind: draft.kind, ...common, ability: draft.ability, maximum: draft.maximum };
    case 'armor_class_bonus':
      if (draft.amount === null) authoringIssue(issues, [...path, 'amount'], 'required', 'Amount is required.');
      else if (draft.amount === 0) authoringIssue(issues, [...path, 'amount'], 'invalid_value', 'Amount must be non-zero.');
      if (!labelReady || draft.amount === null || draft.amount === 0) return null;
      return { kind: draft.kind, ...common, amount: draft.amount };
    case 'armor_class_formula':
      if (draft.base === null) authoringIssue(issues, [...path, 'base'], 'required', 'Base Armor Class is required.');
      if (draft.ability_1 === null) authoringIssue(issues, [...path, 'ability_1'], 'required', 'First ability is required.');
      if (draft.allows_shield === null) authoringIssue(issues, [...path, 'allows_shield'], 'required', 'Shield permission must be resolved.');
      if (!labelReady || draft.base === null || draft.ability_1 === null || draft.allows_shield === null) return null;
      return {
        kind: draft.kind,
        ...common,
        base: draft.base,
        ability_1: draft.ability_1,
        ability_2: draft.ability_2,
        allows_shield: draft.allows_shield,
      };
    case 'attack_ability_override':
      if (draft.ability === null) authoringIssue(issues, [...path, 'ability'], 'required', 'Ability is required.');
      if (draft.weapon_scope === null) authoringIssue(issues, [...path, 'weapon_scope'], 'required', 'Weapon scope is required.');
      if (!labelReady || draft.ability === null || draft.weapon_scope === null) return null;
      return { kind: draft.kind, ...common, ability: draft.ability, weapon_scope: draft.weapon_scope };
    case 'weapon_attack_bonus':
    case 'weapon_damage_bonus':
      if (draft.amount === null) authoringIssue(issues, [...path, 'amount'], 'required', 'Amount is required.');
      else if (draft.amount === 0) authoringIssue(issues, [...path, 'amount'], 'invalid_value', 'Amount must be non-zero.');
      if (draft.weapon_scope === null) authoringIssue(issues, [...path, 'weapon_scope'], 'required', 'Weapon scope is required.');
      if (!labelReady || draft.amount === null || draft.amount === 0 || draft.weapon_scope === null) return null;
      return { kind: draft.kind, ...common, amount: draft.amount, weapon_scope: draft.weapon_scope };
  }
}

function duplicateItemUuids(
  draft: SpeciesAuthoringDraft,
  issues: AuthoringValidationIssue[],
): void {
  const seen = new Set<string>();
  const check = (value: string, path: readonly (string | number)[]) => {
    if (seen.has(value)) authoringIssue(issues, path, 'duplicate', 'Draft item UUID must be unique.');
    seen.add(value);
  };
  draft.traits.forEach((trait, traitIndex) => {
    check(trait.draft_item_uuid, ['traits', traitIndex, 'draft_item_uuid']);
    trait.effects.forEach((effect, effectIndex) =>
      check(effect.draft_item_uuid, ['traits', traitIndex, 'effects', effectIndex, 'draft_item_uuid']));
  });
  draft.grants.forEach((grant, grantIndex) =>
    check(grant.draft_item_uuid, ['grants', grantIndex, 'draft_item_uuid']));
}

export function resolvedAuthoringGrant(
  db: DatabaseContext,
  draft: AuthoringDraftGrant,
  path: readonly (string | number)[],
  issues: AuthoringValidationIssue[],
): AuthoringGrant | null {
  const ruleKeyReady = authoringNonEmpty(draft.rule_key, [...path, 'rule_key'], issues);
  switch (draft.kind) {
    case 'fixed_spell': {
      if (draft.spell_content_key === null) {
        authoringIssue(issues, [...path, 'spell_content_key'], 'required', 'Spell is required.');
        return null;
      }
      const spell = authoringFingerprintReference(db, 'spell', draft.spell_content_key);
      if (spell === null) {
        authoringIssue(issues, [...path, 'spell_content_key'], 'unresolved_reference', 'The selected spell is no longer installed. Choose an installed spell.');
        return null;
      }
      if (!ruleKeyReady) return null;
      return {
        kind: draft.kind,
        rule_key: draft.rule_key,
        count: 1,
        bucket: 'prepared',
        always_prepared: draft.always_prepared,
        with_slots: true,
        free_cast: null,
        spell,
      };
    }
    case 'choice_from_list': {
      const listReady = authoringNonEmpty(draft.list, [...path, 'list'], issues);
      if (draft.count === null) {
        authoringIssue(issues, [...path, 'count'], 'required', 'Choice count is required.');
      }
      const minimum = draft.minimum_spell_level ?? 0;
      const maximum = draft.maximum_spell_level ?? 9;
      if (minimum > maximum) {
        authoringIssue(issues, [...path, 'maximum_spell_level'], 'out_of_range', 'Maximum spell level must not be below the minimum.');
      }
      if (
        !ruleKeyReady || !listReady || draft.count === null ||
        minimum > maximum
      ) return null;
      return {
        kind: draft.kind,
        rule_key: draft.rule_key,
        list: draft.list,
        count: draft.count,
        bucket: 'known',
        level_min: minimum,
        level_max: maximum,
        always_prepared: false,
        with_slots: true,
        free_cast: null,
      };
    }
    case 'choice_from_query': {
      if (draft.count === null) authoringIssue(issues, [...path, 'count'], 'required', 'Choice count is required.');
      const minimum = draft.minimum_spell_level ?? 0;
      const maximum = draft.maximum_spell_level ?? 9;
      if (minimum > maximum) {
        authoringIssue(issues, [...path, 'maximum_spell_level'], 'out_of_range', 'Maximum spell level must not be below the minimum.');
      }
      if (!ruleKeyReady || draft.count === null || minimum > maximum) return null;
      return {
        kind: draft.kind,
        rule_key: draft.rule_key,
        schools: [...draft.schools],
        tags: [...draft.tags],
        count: draft.count,
        bucket: 'known',
        level_min: minimum,
        level_max: maximum,
        always_prepared: false,
        with_slots: true,
        free_cast: null,
      };
    }
    case 'skill_proficiency': {
      if (draft.count === null) authoringIssue(issues, [...path, 'count'], 'required', 'Skill count is required.');
      if (draft.skills.length === 0) authoringIssue(issues, [...path, 'skills'], 'required', 'At least one skill is required.');
      if (new Set(draft.skills).size !== draft.skills.length) authoringIssue(issues, [...path, 'skills'], 'duplicate', 'Skills must not repeat.');
      if (draft.count !== null && draft.count > new Set(draft.skills).size) {
        authoringIssue(issues, [...path, 'count'], 'out_of_range', 'Skill count exceeds the available distinct skills.');
      }
      if (
        !ruleKeyReady || draft.count === null || draft.skills.length === 0 ||
        new Set(draft.skills).size !== draft.skills.length ||
        draft.count > draft.skills.length
      ) return null;
      return {
        kind: draft.kind,
        rule_key: draft.rule_key,
        count: draft.count,
        skills: [...draft.skills],
        always_prepared: false,
        with_slots: true,
        free_cast: null,
      };
    }
  }
}

export function speciesDraftToAggregate(
  db: DatabaseContext,
  draft: SpeciesAuthoringDraft,
): SpeciesContentAggregate {
  const issues: AuthoringValidationIssue[] = [];
  authoringNonEmpty(draft.name, ['name'], issues);
  if (draft.rules_edition === null) authoringIssue(issues, ['rules_edition'], 'required', 'Rules edition is required.');
  authoringNonEmpty(draft.creature_type, ['creature_type'], issues);
  authoringNonEmpty(draft.primary_size, ['primary_size'], issues);
  if (draft.alternate_size !== null) authoringNonEmpty(draft.alternate_size, ['alternate_size'], issues);
  if (draft.walking_speed_feet === null) authoringIssue(issues, ['walking_speed_feet'], 'required', 'Walking speed is required.');
  duplicateItemUuids(draft, issues);

  const ruleKeys = new Set<string>();
  const grants = draft.grants.flatMap((grant, index) => {
    if (ruleKeys.has(grant.rule_key)) {
      authoringIssue(issues, ['grants', index, 'rule_key'], 'duplicate', 'Stable grant labels must be unique throughout the species.');
    }
    ruleKeys.add(grant.rule_key);
    const resolved = resolvedAuthoringGrant(db, grant, ['grants', index], issues);
    return resolved === null ? [] : [resolved];
  });
  const traits = draft.traits.flatMap((trait, traitIndex) => {
    const nameReady = authoringNonEmpty(trait.name, ['traits', traitIndex, 'name'], issues);
    const descriptionReady = authoringNonEmpty(
      trait.description,
      ['traits', traitIndex, 'description'],
      issues,
    );
    const traitReady = nameReady && descriptionReady;
    const effects = trait.effects.flatMap((effect, effectIndex) => {
      const resolved = resolvedAuthoringEffect(
        effect,
        effectIndex + 1,
        ['traits', traitIndex, 'effects', effectIndex],
        issues,
      );
      return resolved === null ? [] : [resolved];
    });
    return traitReady ? [{
      sort_order: traitIndex + 1,
      name: trait.name,
      description: trait.description,
      effects,
    }] : [];
  });
  if (issues.length > 0) throw new SpeciesSemanticValidationError(Object.freeze(issues));
  return Object.freeze({
    kind: 'species',
    name: draft.name.trim(),
    rules_edition: draft.rules_edition!,
    reference_text: draft.reference_text,
    repeatable: false,
    creature_type: creatureType(draft.creature_type),
    primary_size: creatureSize(draft.primary_size),
    alternate_size: draft.alternate_size === null ? null : creatureSize(draft.alternate_size),
    walking_speed_feet: draft.walking_speed_feet!,
    traits: Object.freeze(traits),
    grants: Object.freeze(grants),
  });
}

function authoringNode(
  db: DatabaseContext,
  aggregate: SpeciesContentAggregate,
  contentKey: ContentKey,
): ContentImportNode {
  const portable = portableSourceContentImportNode(db, aggregate, contentKey);
  const withoutRemembered = (
    projection: ContentImportProjection,
  ): ContentImportProjection => ({
    ...projection,
    kind: 'species',
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
      // Authoring references were selected from this target's one current
      // fingerprint. There are no incoming dependency nodes to remap; only a
      // reviewed clone's name/key may change here.
      withoutRemembered(reproject({ ...input, dependencies: new Map() })),
  });
}

function operationIdentity(draft: StoredHomebrewDraft, aggregate: SpeciesContentAggregate): string {
  return sha256(canonicalJson({
    operation: 'authoring.publish.species',
    draft_uuid: draft.draft_uuid,
    draft_revision: draft.revision,
    aggregate,
  }));
}

function encodedToken(
  draft: StoredHomebrewDraft,
  aggregate: SpeciesContentAggregate,
  importToken: string,
): PublishPlanToken {
  const digest = sha256(canonicalJson({
    operation_identity: operationIdentity(draft, aggregate),
    import_plan_token: importToken,
  }));
  return JSON.stringify([draft.draft_uuid, digest]) as PublishPlanToken;
}

export function publishTokenDraftUuid(token: PublishPlanToken): HomebrewDraftUuid | null {
  let decoded: unknown;
  try {
    decoded = JSON.parse(token);
  } catch {
    return null;
  }
  return Array.isArray(decoded) && decoded.length === 2 &&
    typeof decoded[0] === 'string' && typeof decoded[1] === 'string'
    ? decoded[0] as HomebrewDraftUuid
    : null;
}

function assertedKeyFor(aggregate: SpeciesContentAggregate): ContentKey {
  try {
    return assertedExternalContentKey(
      aggregate.kind,
      aggregate.rules_edition,
      aggregate.name,
    );
  } catch (error) {
    throw new SpeciesSemanticValidationError([Object.freeze({
      path: Object.freeze(['name']),
      code: 'invalid_value',
      message: error instanceof Error ? error.message : 'Name cannot produce a content key.',
    })]);
  }
}

export function previewSpeciesPublish(
  db: DatabaseContext,
  draft: StoredHomebrewDraft,
): PublishPreview {
  if (draft.content_kind !== 'species' || draft.document.kind !== 'species') {
    throw new SpeciesPublishError('HA-3 publishes species drafts only.', { reason: 'invalid_reference' });
  }
  const aggregate = speciesDraftToAggregate(db, draft.document);
  const contentKey = assertedKeyFor(aggregate);
  const node = authoringNode(db, aggregate, contentKey);
  const plan = planImmutableCatalogPublication(db, {
    node,
    operationIdentity: operationIdentity(draft, aggregate),
  });
  const collision = plan.reviews.find((review) => review.matchClass === 'key-collision');
  if (collision !== undefined) {
    throw new SpeciesPublishError('The asserted species key already names different content.', {
      reason: 'content_key_collision',
      content_key: collision.targetContentKey,
    });
  }
  const refused = plan.outcomes.find((outcome) => outcome.kind === 'refused');
  if (refused?.kind === 'refused') {
    throw new SpeciesPublishError('The species publisher refused the aggregate.', {
      reason: 'publish_refused',
      refusal: refused.reason,
    });
  }
  const projected = projectAuthoredContentAggregateV1(aggregate);
  const identity = deriveContentIdentityV1({
    kind: aggregate.kind,
    edition: aggregate.rules_edition,
    name: aggregate.name,
    payload: projected.payload,
  });
  const candidateKeys = [...new Set(plan.outcomes.flatMap((outcome) =>
    outcome.kind === 'refused' ? [] : [outcome.contentKey]))];
  return Object.freeze({
    token: encodedToken(draft, aggregate, plan.token),
    facts: Object.freeze({
      draft_uuid: draft.draft_uuid,
      draft_revision: draft.revision,
      content_kind: 'species',
      canonical_json: identity.canonicalJson,
      candidate_content_keys: Object.freeze(candidateKeys),
      candidate_identities: Object.freeze([{
        kind: 'species' as const,
        scheme: identity.envelope.scheme,
        digest: identity.digest,
      }]),
    }),
    aggregate,
    review: Object.freeze(plan.reviews.map((review) => {
      if (
        review.matchClass === 'key-collision' ||
        review.matchClass === 'installed-target'
      ) {
        throw new SpeciesPublishError('The asserted species key already names different content.', {
          reason: 'content_key_collision',
          content_key: review.targetContentKey,
        });
      }
      return Object.freeze({
        candidate_content_key: review.targetContentKey,
        candidate_name: review.localName,
        candidate_catalog_layer: review.localCatalogLayer,
        reason: review.matchClass,
        default_decision: 'match' as const,
      });
    })),
  });
}

function choicesFor(
  preview: PublishPreview,
  decisions: readonly PublishDecision[],
  nodeId: string,
): ContentImportChoices {
  if (preview.review.length === 0) {
    if (decisions.length !== 0) {
      throw new SpeciesPublishError('This publish has no review decision to apply.', { reason: 'invalid_reference' });
    }
    return Object.freeze({});
  }
  const review = preview.review[0]!;
  const matching = decisions.filter((decision) =>
    decision.candidate_content_key === review.candidate_content_key);
  if (decisions.length !== 1 || matching.length !== 1) {
    throw new SpeciesPublishError('Publish adoption review is required.', {
      reason: 'publish_review_required',
      candidates: preview.review.map((item) => item.candidate_content_key),
    });
  }
  const decision = matching[0]!;
  return Object.freeze({
    [nodeId]: decision.decision === 'match'
      ? Object.freeze({ decision: 'match' as const })
      : Object.freeze({ decision: 'clone' as const, cloneName: decision.clone_name }),
  });
}

function publishedResultRow(
  db: DatabaseContext,
  contentKey: ContentKey,
): { readonly name: string; readonly catalog_layer: PublishResult['catalog_layer'] } {
  const row = db.oneRaw(
    `SELECT species.name, identity.catalog_layer
     FROM species_definitions AS species
     JOIN catalog_content_identities AS identity
       ON identity.content_kind = 'species'
      AND identity.content_key = species.content_key
     WHERE species.content_key = ?`,
    [contentKey],
  );
  if (
    row === null || typeof row.name !== 'string' ||
    (row.catalog_layer !== 'bundled' && row.catalog_layer !== 'external')
  ) {
    throw new SpeciesPublishError('Published species result cannot be resolved.', { reason: 'publish_refused', refusal: 'missing_result' });
  }
  return { name: row.name, catalog_layer: row.catalog_layer };
}

export function commitSpeciesPublish(
  db: DatabaseContext,
  draft: StoredHomebrewDraft,
  token: PublishPlanToken,
  decisions: readonly PublishDecision[],
  previousKeyUsageCount: number,
): PublishResult {
  const preview = previewSpeciesPublish(db, draft);
  if (preview.token !== token) {
    throw new SpeciesPublishError('The publish plan is stale.', {
      reason: 'stale_publish_plan',
      draft_uuid: draft.draft_uuid,
    });
  }
  const aggregate = preview.aggregate;
  if (aggregate.kind !== 'species') {
    throw new SpeciesPublishError('HA-3 publishes species drafts only.', { reason: 'invalid_reference' });
  }
  const assertedKey = assertedKeyFor(aggregate);
  const node = authoringNode(db, aggregate, assertedKey);
  const choices = choicesFor(preview, decisions, node.id);
  const operation = operationIdentity(draft, aggregate);
  const publication = {
    node,
    operationIdentity: operation,
    supersedesContentKey: draft.base_content_key,
    afterInstall: (transaction: DatabaseContext) => {
      const deleted = transaction.exec(
        'DELETE FROM catalog_content_drafts WHERE draft_uuid = ? AND revision = ?',
        [draft.draft_uuid, draft.revision],
      );
      if (deleted.changes !== 1) throw new Error('Draft changed before publish commit.');
    },
  } as const;
  const chosenPlan = planImmutableCatalogPublication(db, publication, choices);
  const chosenRefusal = chosenPlan.outcomes.find((outcome) => outcome.kind === 'refused');
  if (chosenRefusal?.kind === 'refused') {
    throw new SpeciesPublishError('The chosen species publish was refused.', {
      reason: chosenRefusal.reason === 'clone_key_collision'
        ? 'content_key_collision'
        : 'publish_refused',
      ...(chosenRefusal.reason === 'clone_key_collision'
        ? { content_key: assertedKey }
        : { refusal: chosenRefusal.reason }),
    } as SpeciesPublishRefusal);
  }
  const committed = commitImmutableCatalogPublication(db, publication, {
    token: chosenPlan.token,
    choices,
  });
  if (committed.kind === 'stale-plan') {
    throw new SpeciesPublishError('The publish plan is stale.', {
      reason: 'stale_publish_plan',
      draft_uuid: draft.draft_uuid,
    });
  }
  if (committed.kind === 'refused') {
    throw new SpeciesPublishError('The species publish transaction was refused.', {
      reason: 'publish_refused',
      refusal: committed.reason,
    });
  }
  const outcome = committed.outcomes[0];
  if (outcome === undefined || outcome.kind === 'refused') {
    throw new SpeciesPublishError('The species publisher returned no result.', {
      reason: 'publish_refused',
      refusal: 'missing_outcome',
    });
  }
  const contentKey = outcome.contentKey;
  const result = publishedResultRow(db, contentKey);
  return outcome.kind === 'create' || outcome.kind === 'remembered-clone'
    ? Object.freeze({
        outcome: 'created',
        content_key: contentKey,
        name: result.name,
        catalog_layer: 'external',
        previous_key_usage_count: previousKeyUsageCount,
      })
    : Object.freeze({
        outcome: 'matched_existing',
        content_key: contentKey,
        name: result.name,
        catalog_layer: result.catalog_layer,
        previous_key_usage_count: previousKeyUsageCount,
      });
}
