import { describe, expect, it } from 'vitest';
import {
  AssertedContentOwnerNamespaceError,
  CatalogKeyComponentEmptyError,
} from '../../../src/catalog/catalog-key';
import {
  ContentFingerprintSchemeUnsupportedError,
  ContentIdentityAdjacentProjectionError,
  ContentIdentityCanonicalValueError,
  ContentIdentityCircularReferenceError,
  ContentIdentityEditionError,
  ContentIdentityEnvelopeTypeError,
  ContentIdentityNameEmptyError,
  ContentIdentityNumberError,
  StoredContentIdentityDisagreementError,
} from '../../../src/catalog/content-identity-errors';
import {
  CatalogDataMigrationChecksumMismatchError,
  CatalogDataMigrationDuplicateIdError,
  CatalogDataMigrationDuplicateSourcePathError,
  CatalogDataMigrationForeignKeyError,
  CatalogDataMigrationIdEmptyError,
  CatalogDataMigrationMarkerDisagreementError,
  CatalogDataMigrationMarkerMalformedError,
  CatalogDataMigrationProjectorSchemeError,
  CatalogDataMigrationSourcesEmptyError,
  CatalogDataMigrationUnregisteredMarkerError,
} from '../../../src/catalog/catalog-data-migrations-errors';
import {
  ContentDependencyCycleError,
  ContentDependencyDuplicateKeyError,
  ContentDependencyMissingError,
  ContentFingerprintInputDisagreementError,
  ContentFingerprintSchemeUnregisteredError,
  StoredContentMatchDecisionError,
} from '../../../src/catalog/content-registry';
import {
  ContentAdoptionTargetKindError,
  ContentImportPlanRollbackInvariantError,
} from '../../../src/catalog/content-adoption';
import { CatalogContentIdentityMissingError } from '../../../src/catalog/content-provenance';
import { RecordedSourceTypeError } from '../../../src/catalog/recorded-source-provenance';
import { CatalogTierMismatchError } from '../../../src/catalog/catalog-normalize';
import {
  SourceContentGrantKeyWhitespaceError,
  SourceContentGrantKindMismatchError,
  SourceContentGrantReferenceError,
  SourceContentResistanceDamageTypeError,
  type SourceContentGrantReference,
} from '../../../src/catalog/source-content-importer';
import {
  BundledSpeciesIdentityMissingError,
  UnexpectedLineageSourceError,
} from '../../../src/catalog/reconcile-species-lineage-content-v2';
import {
  CatalogLineageDeleteGuardMissingError,
  CatalogLineageDeleteTransactionError,
} from '../../../src/catalog/catalog-lineage-delete-guard';
import { BundledSrdSpellNotFoundError } from '../../../src/catalog/spell-fork';
import {
  BundledRegistryNormalizedNameMissingError,
  BundledRegistryRootNameError,
  BundledRegistryUnknownKindError,
} from '../../../src/catalog/bundled-content-registry-v1';
import {
  BundledDigestFingerprintIdentityMissingError,
  BundledDigestNameMismatchError,
  BundledDigestRowIdentityMissingError,
  BundledDigestStoredValueError,
  BundledDigestUnknownKindError,
  type BundledDigestKindSource,
} from '../../../src/catalog/bundled-content-digest-v1';
import {
  StoredAuthoredContentJsonError,
  type StoredAuthoredContentJsonSubject,
} from '../../../src/catalog/stored-authored-content-projector-v1';
import type { ContentKey } from '../../../src/domain/ids';

describe('catalog tagged error formatters', () => {
  const cause = new SyntaxError('bad json');
  const key = 'expanded:content.feat:fixture' as ContentKey;
  const cases: readonly (readonly [Error, string, object])[] = [
    [new CatalogKeyComponentEmptyError(), 'Catalog key components must not be empty.', {}],
    [new AssertedContentOwnerNamespaceError('invalid'), "Asserted content owner namespace 'invalid' is invalid.", { owner_namespace: 'invalid' }],
    [new ContentFingerprintSchemeUnsupportedError('content-v3'), "Unsupported content fingerprint scheme 'content-v3'.", { scheme: 'content-v3' }],
    [new ContentIdentityEnvelopeTypeError(), 'A content-v1 envelope must be an object.', {}],
    [new ContentIdentityAdjacentProjectionError('content-v1', 'content-v2'), 'Only content-v1 can project adjacently to content-v2.', { source_scheme: 'content-v1', target_scheme: 'content-v2' }],
    [new ContentIdentityCanonicalValueError('[object Date]'), 'Value is not a canonical content identity value: [object Date].', { value_tag: '[object Date]' }],
    [new ContentIdentityCircularReferenceError(), 'Value is not a canonical content identity value: circular reference.', {}],
    [new ContentIdentityNumberError(), 'Canonical content identity numbers must be finite safe integers.', {}],
    [new ContentIdentityNameEmptyError(), 'Content identity names must not be empty.', {}],
    [new ContentIdentityEditionError('2024 revised'), "Content identity edition '2024 revised' must be a valid catalog key component.", { edition: '2024 revised' }],
    [new StoredContentIdentityDisagreementError(), 'Stored content-v1 canonical bytes, digest, and derived key do not agree.', {}],
    [new CatalogDataMigrationMarkerMalformedError(), 'Catalog data-migration marker is malformed.', {}],
    [new CatalogDataMigrationIdEmptyError(), 'Catalog data-migration id must not be empty.', {}],
    [new CatalogDataMigrationDuplicateIdError('fixture'), 'Duplicate catalog data-migration id "fixture".', { migration_id: 'fixture' }],
    [new CatalogDataMigrationProjectorSchemeError('fixture', 'content-v9'), 'Catalog data migration "fixture" uses unknown projector scheme "content-v9".', { migration_id: 'fixture', projector_scheme: 'content-v9' }],
    [new CatalogDataMigrationSourcesEmptyError('fixture'), 'Catalog data migration "fixture" has no checksum sources.', { migration_id: 'fixture' }],
    [new CatalogDataMigrationDuplicateSourcePathError('fixture'), 'Catalog data migration "fixture" has duplicate checksum source paths.', { migration_id: 'fixture' }],
    [new CatalogDataMigrationChecksumMismatchError('fixture', 'old', 'new'), 'Catalog data migration "fixture" source checksum mismatch: expected old, got new.', { migration_id: 'fixture', expected_checksum: 'old', actual_checksum: 'new' }],
    [new CatalogDataMigrationUnregisteredMarkerError('fixture'), 'Applied catalog data migration "fixture" is not registered by this application.', { migration_id: 'fixture' }],
    [new CatalogDataMigrationMarkerDisagreementError('fixture'), 'Applied catalog data migration "fixture" does not match the registered projector scheme and checksum.', { migration_id: 'fixture' }],
    [new CatalogDataMigrationForeignKeyError('fixture', 'table spells'), 'Catalog data migration "fixture" foreign-key check failed for table spells.', { migration_id: 'fixture', problem: 'table spells' }],
    [new ContentFingerprintInputDisagreementError(), 'Content fingerprint scheme, digest, and canonical bytes do not agree.', {}],
    [new ContentFingerprintSchemeUnregisteredError('content-v9'), 'Cannot promote an unregistered fingerprint scheme.', { scheme: 'content-v9' }],
    [new StoredContentMatchDecisionError('merge'), 'Stored content match decision is outside its vocabulary.', { decision: 'merge' }],
    [new ContentDependencyDuplicateKeyError(), 'Content dependency graph contains duplicate keys.', {}],
    [new ContentDependencyMissingError('parent'), 'Content dependency graph is missing dependency "parent".', { dependency_key: 'parent' }],
    [new ContentDependencyCycleError(), 'Content dependency graph contains a cycle; no content was projected.', {}],
    [new ContentAdoptionTargetKindError('feat', 'species'), 'Stored target kind does not match its adoption node.', { expected_kind: 'feat', stored_kind: 'species' }],
    [new ContentImportPlanRollbackInvariantError(), 'Content import planner failed to roll back its simulation.', {}],
    [new CatalogContentIdentityMissingError(key), `Catalog content '${key}' has no identity.`, { content_key: key }],
    [new RecordedSourceTypeError(17), 'Source 17 is not a standalone catalog source.', { source_instance_id: 17 }],
    [new CatalogTierMismatchError(2, 1), 'Tier 2 catalog does not exactly match Tier 1 (2 missing, 1 unexpected).', { missing_count: 2, unexpected_count: 1 }],
    [new SourceContentGrantKeyWhitespaceError(' padded '), "Grant rule key ' padded ' contains surrounding whitespace.", { rule_key: ' padded ' }],
    [new SourceContentGrantReferenceError('fixture', 'spell'), "Grant 'fixture' spell reference is invalid.", { rule_key: 'fixture', reference: 'spell' }],
    [new SourceContentGrantKindMismatchError('fixture'), "Grant 'fixture' source definition kind must match source_type.", { rule_key: 'fixture' }],
    [new SourceContentResistanceDamageTypeError(), 'Portable v2 species resistance effects must name a damage type.', {}],
    [new BundledSpeciesIdentityMissingError('2024:species:elf'), "Bundled species '2024:species:elf' has no identity.", { content_key: '2024:species:elf' }],
    [new UnexpectedLineageSourceError('2024:species:other'), "Unexpected lineage source '2024:species:other'.", { content_key: '2024:species:other' }],
    [new CatalogLineageDeleteTransactionError(0), 'Catalog lineage deletion requires one outermost transaction.', { transaction_depth: 0 }],
    [new CatalogLineageDeleteGuardMissingError('lineage_guard'), 'Catalog supersession delete guard is missing.', { guard_name: 'lineage_guard' }],
    [new BundledSrdSpellNotFoundError('2024:missing'), 'Bundled SRD spell not found.', { source_content_key: '2024:missing' }],
    [new BundledRegistryRootNameError('species', key), `Bundled species '${key}' has inconsistent root names.`, { kind: 'species', content_key: key }],
    [new BundledRegistryUnknownKindError('future'), "Bundled registry row has unknown kind 'future'.", { kind: 'future' }],
    [new BundledRegistryNormalizedNameMissingError('species', key), `Bundled species '${key}' has no authoritative normalized name.`, { kind: 'species', content_key: key }],
    [new BundledDigestStoredValueError('payload'), "Bundled digest cannot canonicalize payload's stored value.", { column: 'payload' }],
    [new BundledDigestUnknownKindError('future', 'stored'), "Bundled digest found unknown kind 'future'.", { kind: 'future', source: 'stored' }],
    [new BundledDigestFingerprintIdentityMissingError('feat', key), `Bundled digest fingerprint feat '${key}' has no identity.`, { kind: 'feat', content_key: key }],
    [new BundledDigestRowIdentityMissingError('feat_rows', 'feat', key), `Bundled digest feat_rows row has no feat identity for '${key}'.`, { table: 'feat_rows', kind: 'feat', content_key: key }],
    [new BundledDigestNameMismatchError('feat', key), `Bundled digest feat '${key}' has inconsistent names.`, { kind: 'feat', content_key: key }],
    [new StoredAuthoredContentJsonError('grant rules', 'slot_table', cause), 'Stored content-v1 projection failed: grant rules slot table is invalid JSON.', { field: 'grant rules', subject: 'slot_table', original_cause: cause, cause }],
  ];

  it.each(cases)('formats %s', (error, message, parameters) => {
    expect(error.name).toBe(error.constructor.name);
    expect(error.message).toBe(message);
    expect(error).toMatchObject(parameters);
  });

  it('formats every bundled-digest kind source without an undefined phrase', () => {
    const sources: readonly BundledDigestKindSource[] = ['stored', 'pinned'];
    for (const source of sources) {
      expect(new BundledDigestUnknownKindError('future', source).message).not.toContain(
        'undefined',
      );
    }
  });

  it('formats every source-reference and stored-JSON token without an undefined phrase', () => {
    const references: readonly SourceContentGrantReference[] = [
      'spell',
      'source definition',
    ];
    for (const reference of references) {
      expect(new SourceContentGrantReferenceError('rule', reference).message)
        .not.toContain('undefined');
    }
    const subjects: readonly StoredAuthoredContentJsonSubject[] = [
      'value',
      'slot_table',
    ];
    for (const subject of subjects) {
      expect(new StoredAuthoredContentJsonError('field', subject, cause).message)
        .not.toContain('undefined');
    }
  });
});
