import { canonicalJson } from '../commands/canonical-json';
import { sha256 } from '../crypto/sha256';
import {
  sqlInteger,
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import {
  catalogLayerDisclosure,
  type CatalogLayerDisclosure,
} from '../catalog/catalog-disclosure';
import { isEnumValue, rulesEditions, type RulesEdition } from '../domain/enums';
import type { CharacterId, CharacterRevision, ContentKey } from '../domain/ids';
import type {
  ArchivedHomebrewSet,
  ArchiveSetCharacter,
  ArchiveSetPlan,
  ArchiveSetResult,
  AuthoredContentKind,
  AuthoringErrorData,
} from './contracts';
import type { ArchiveSetPlanToken } from './ids';

export class ArchiveSetLifecycleError extends Error {
  constructor(
    message: string,
    readonly data: AuthoringErrorData,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ArchiveSetLifecycleError';
  }
}

interface ContentLifecycleRow {
  readonly contentKey: ContentKey;
  readonly kind: AuthoredContentKind;
  readonly name: string;
  readonly edition: RulesEdition;
  readonly layer: CatalogLayerDisclosure;
  readonly archivedAt: string | null;
}

interface CharacterLifecycleRow extends ArchiveSetCharacter {
  readonly archived_at: string | null;
}

interface ArchiveManifestMemberRow {
  readonly character_id: CharacterId;
  readonly archived_character_revision: CharacterRevision;
  readonly character_name: string;
  readonly archived_at: string;
  readonly current_character_revision: CharacterRevision | null;
  readonly current_archived_at: string | null;
  readonly character_exists: boolean;
  readonly references_manifested_creation: boolean;
}

interface ArchiveSetTokenFacts {
  readonly operation: 'archive' | 'restore';
  readonly content_key: ContentKey;
  readonly content_kind: AuthoredContentKind;
  readonly archived_at: string | null;
  readonly characters: readonly {
    readonly character_id: CharacterId;
    readonly character_revision: CharacterRevision;
    readonly archived_at: string | null;
  }[];
}

function authoredKind(value: string): AuthoredContentKind {
  if (value === 'species' || value === 'background' || value === 'subclass') {
    return value;
  }
  throw new TypeError(`Archived content has unsupported kind "${value}".`);
}

function rulesEdition(value: string): RulesEdition {
  if (!isEnumValue(rulesEditions, value)) {
    throw new TypeError(`Archived content has unsupported rules edition "${value}".`);
  }
  return value;
}

function contentRow(row: SqlRow): ContentLifecycleRow {
  return Object.freeze({
    contentKey: sqlString(row, 'content_key') as ContentKey,
    kind: authoredKind(sqlString(row, 'content_kind')),
    name: sqlString(row, 'name'),
    edition: rulesEdition(sqlString(row, 'rules_edition')),
    layer: catalogLayerDisclosure(sqlString(row, 'catalog_layer')),
    archivedAt: sqlNullableString(row, 'archived_at'),
  });
}

function archiveManifestMemberRow(row: SqlRow): ArchiveManifestMemberRow {
  return Object.freeze({
    character_id: sqlInteger(row, 'character_id') as CharacterId,
    archived_character_revision: sqlInteger(
      row,
      'archived_character_revision',
    ) as CharacterRevision,
    character_name: sqlString(row, 'character_name'),
    archived_at: sqlString(row, 'archived_at'),
    current_character_revision: sqlNullableInteger(
      row,
      'current_character_revision',
    ) as CharacterRevision | null,
    current_archived_at: sqlNullableString(row, 'current_archived_at'),
    character_exists: sqlInteger(row, 'character_exists') === 1,
    references_manifested_creation:
      sqlInteger(row, 'references_manifested_creation') === 1,
  });
}

function characterRow(row: SqlRow): CharacterLifecycleRow {
  return Object.freeze({
    character_id: sqlInteger(row, 'character_id') as CharacterId,
    character_revision: sqlInteger(row, 'character_revision') as CharacterRevision,
    character_name: sqlString(row, 'character_name'),
    archived_at: sqlNullableString(row, 'character_archived_at'),
  });
}

function publicCharacter(row: CharacterLifecycleRow): ArchiveSetCharacter {
  return Object.freeze({
    character_id: row.character_id,
    character_revision: row.character_revision,
    character_name: row.character_name,
  });
}

function encodedToken(facts: ArchiveSetTokenFacts): ArchiveSetPlanToken {
  return JSON.stringify([facts, sha256(canonicalJson(facts))]) as ArchiveSetPlanToken;
}

function contentQuery(where: string): string {
  return `SELECT identity.content_key, identity.content_kind,
                 identity.catalog_layer, identity.archived_at,
                 CASE identity.content_kind
                   WHEN 'species' THEN species.name
                   WHEN 'background' THEN background.name
                   WHEN 'subclass' THEN subclass.name
                 END AS name,
                 CASE identity.content_kind
                   WHEN 'species' THEN species.rules_edition
                   WHEN 'background' THEN background.rules_edition
                   WHEN 'subclass' THEN subclass.rules_edition
                 END AS rules_edition
          FROM catalog_content_identities AS identity
          LEFT JOIN species_definitions AS species
            ON identity.content_kind = 'species'
           AND species.content_key = identity.content_key
          LEFT JOIN background_definitions AS background
            ON identity.content_kind = 'background'
           AND background.content_key = identity.content_key
          LEFT JOIN subclass_definitions AS subclass
            ON identity.content_kind = 'subclass'
           AND subclass.content_key = identity.content_key
          WHERE identity.content_kind IN ('species', 'background', 'subclass')
            AND ${where}
            AND (species.content_key IS NOT NULL OR background.content_key IS NOT NULL
                 OR subclass.content_key IS NOT NULL)`;
}

export class HomebrewArchiveSetService {
  constructor(
    private readonly db: DatabaseContext,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  #content(contentKey: ContentKey): ContentLifecycleRow {
    const row = this.db.one(
      contentQuery('identity.content_key = ?'),
      [contentKey],
      contentRow,
    );
    if (row === null) {
      throw new ArchiveSetLifecycleError(`Content "${contentKey}" was not found.`, {
        reason: 'content_not_found',
      });
    }
    if (row.layer !== 'external') {
      throw new ArchiveSetLifecycleError('Bundled content cannot be archived.', {
        reason: 'archive_set_refused',
        refusal: 'bundled_content',
      });
    }
    return row;
  }

  #characters(content: ContentLifecycleRow): readonly CharacterLifecycleRow[] {
    if (content.kind === 'subclass') {
      return Object.freeze(this.db.all(
        `SELECT DISTINCT character.id AS character_id,
                character.revision AS character_revision,
                character.name AS character_name,
                character.archived_at AS character_archived_at
         FROM characters AS character
         JOIN character_class_levels AS level ON level.character_id = character.id
         JOIN subclass_definitions AS definition
           ON definition.id = level.subclass_definition_id
         WHERE definition.content_key = ?
         ORDER BY character.id`,
        [content.contentKey],
        characterRow,
      ));
    }
    const table = content.kind === 'species'
      ? 'species_definitions'
      : 'background_definitions';
    return Object.freeze(this.db.all(
      `SELECT DISTINCT character.id AS character_id,
              character.revision AS character_revision,
              character.name AS character_name,
              character.archived_at AS character_archived_at
       FROM characters AS character
       JOIN character_source_instances AS source ON source.character_id = character.id
       JOIN ${table} AS definition ON definition.id = source.source_definition_id
       WHERE source.source_type = ? AND source.state = 'active'
         AND definition.content_key = ?
       ORDER BY character.id`,
      [content.kind, content.contentKey],
      characterRow,
    ));
  }

  #archiveMembers(
    content: ContentLifecycleRow,
  ): readonly ArchiveManifestMemberRow[] {
    return Object.freeze(this.db.all(
      `SELECT member.character_id,
              member.character_revision AS archived_character_revision,
              member.character_name,
              member.archived_at,
              character.revision AS current_character_revision,
              character.archived_at AS current_archived_at,
              CASE WHEN character.id IS NULL THEN 0 ELSE 1 END AS character_exists,
              CASE member.content_kind
                WHEN 'species' THEN EXISTS (
                  SELECT 1
                  FROM character_source_instances AS source
                  JOIN species_definitions AS definition
                    ON definition.id = source.source_definition_id
                  WHERE source.character_id = member.character_id
                    AND source.source_type = 'species'
                    AND source.state = 'active'
                    AND definition.content_key = member.content_key
                )
                WHEN 'background' THEN EXISTS (
                  SELECT 1
                  FROM character_source_instances AS source
                  JOIN background_definitions AS definition
                    ON definition.id = source.source_definition_id
                  WHERE source.character_id = member.character_id
                    AND source.source_type = 'background'
                    AND source.state = 'active'
                    AND definition.content_key = member.content_key
                )
                WHEN 'subclass' THEN EXISTS (
                  SELECT 1
                  FROM character_class_levels AS level
                  JOIN subclass_definitions AS definition
                    ON definition.id = level.subclass_definition_id
                  WHERE level.character_id = member.character_id
                    AND definition.content_key = member.content_key
                )
              END AS references_manifested_creation
       FROM catalog_content_archive_members AS member
       LEFT JOIN characters AS character ON character.id = member.character_id
       WHERE member.content_kind = ? AND member.content_key = ?
       ORDER BY member.character_id`,
      [content.kind, content.contentKey],
      archiveManifestMemberRow,
    ));
  }

  #publicArchiveMember(member: ArchiveManifestMemberRow): ArchiveSetCharacter {
    return Object.freeze({
      character_id: member.character_id,
      character_revision: member.current_character_revision ??
        member.archived_character_revision,
      character_name: member.character_name,
    });
  }

  #plan(operation: 'archive' | 'restore', contentKey: ContentKey): ArchiveSetPlan {
    const content = this.#content(contentKey);
    const liveCharacters = operation === 'archive'
      ? this.#characters(content)
      : Object.freeze([]);
    const archivedMembers = operation === 'restore'
      ? this.#archiveMembers(content)
      : Object.freeze([]);
    if (operation === 'archive') {
      if (content.archivedAt !== null) {
        throw new ArchiveSetLifecycleError('The creation is already archived.', {
          reason: 'invalid_reference',
        });
      }
      if (liveCharacters.some((character) => character.archived_at !== null)) {
        throw new ArchiveSetLifecycleError(
          'A listed character already belongs to another archived set.',
          { reason: 'archive_set_refused', refusal: 'already_archived_character' },
        );
      }
    } else {
      if (content.archivedAt === null) {
        throw new ArchiveSetLifecycleError('The creation is not archived.', {
          reason: 'invalid_reference',
        });
      }
      const missing = archivedMembers.filter((member) => !member.character_exists);
      if (missing.length > 0) {
        const named = missing.map((member) =>
          `"${member.character_name}" (character ${String(member.character_id)})`
        ).join(', ');
        throw new ArchiveSetLifecycleError(
          `The archived set cannot be restored because ${named} no longer exists.`,
          { reason: 'archive_set_refused', refusal: 'incomplete_archive_set' },
        );
      }
      const retargeted = archivedMembers.filter((member) =>
        !member.references_manifested_creation
      );
      if (retargeted.length > 0) {
        const named = retargeted.map((member) =>
          `"${member.character_name}" (character ${String(member.character_id)})`
        ).join(', ');
        throw new ArchiveSetLifecycleError(
          `The archived set cannot be restored because ${named} no longer ` +
            'references the manifested creation.',
          { reason: 'archive_set_refused', refusal: 'incomplete_archive_set' },
        );
      }
      if (archivedMembers.some((member) =>
        member.archived_at !== content.archivedAt ||
        member.current_archived_at !== content.archivedAt
      )) {
        throw new ArchiveSetLifecycleError(
          'The archived set is incomplete and cannot be partially restored.',
          { reason: 'archive_set_refused', refusal: 'incomplete_archive_set' },
        );
      }
    }
    const characters: readonly CharacterLifecycleRow[] = operation === 'archive'
      ? liveCharacters
      : archivedMembers.map((member) => Object.freeze({
          character_id: member.character_id,
          character_revision: member.current_character_revision ??
            member.archived_character_revision,
          character_name: member.character_name,
          archived_at: member.current_archived_at,
        }));
    const facts: ArchiveSetTokenFacts = Object.freeze({
      operation,
      content_key: content.contentKey,
      content_kind: content.kind,
      archived_at: content.archivedAt,
      characters: Object.freeze(characters.map((character) => Object.freeze({
        character_id: character.character_id,
        character_revision: character.character_revision,
        archived_at: character.archived_at,
      }))),
    });
    return Object.freeze({
      token: encodedToken(facts),
      operation,
      content_key: content.contentKey,
      content_kind: content.kind,
      content_name: content.name,
      content_catalog_layer: content.layer,
      rules_edition: content.edition,
      archived_at: content.archivedAt,
      characters: Object.freeze(characters.map(publicCharacter)),
    });
  }

  previewArchive(contentKey: ContentKey): ArchiveSetPlan {
    return this.#plan('archive', contentKey);
  }

  previewRestore(contentKey: ContentKey): ArchiveSetPlan {
    return this.#plan('restore', contentKey);
  }

  listArchived(): readonly ArchivedHomebrewSet[] {
    const rows = this.db.all(
      `${contentQuery('identity.archived_at IS NOT NULL')}
       ORDER BY identity.archived_at DESC, identity.content_kind,
                identity.normalized_name, identity.content_key`,
      undefined,
      contentRow,
    );
    return Object.freeze(rows.map((content) => {
      if (content.archivedAt === null) throw new Error('Archived query returned active content.');
      return Object.freeze({
        content_key: content.contentKey,
        content_kind: content.kind,
        content_name: content.name,
        content_catalog_layer: content.layer,
        rules_edition: content.edition,
        archived_at: content.archivedAt,
        characters: Object.freeze(
          this.#archiveMembers(content).map((member) =>
            this.#publicArchiveMember(member)
          ),
        ),
      });
    }));
  }

  commitArchive(token: ArchiveSetPlanToken): ArchiveSetResult {
    const facts = this.#facts(token, 'archive');
    const preview = this.previewArchive(facts.content_key);
    if (preview.token !== token) this.#stale(facts.content_key);
    const archivedAt = this.now();
    try {
      return this.db.transaction(() => {
        const identity = this.db.exec(
          `UPDATE catalog_content_identities SET archived_at = ?
           WHERE content_key = ? AND content_kind = ? AND archived_at IS NULL`,
          [archivedAt, facts.content_key, facts.content_kind],
        );
        if (identity.changes !== 1) throw new Error('Creation archive state changed.');
        for (const character of facts.characters) {
          const plannedCharacter = preview.characters.find((entry) =>
            entry.character_id === character.character_id
          );
          if (plannedCharacter === undefined) {
            throw new Error('Character archive membership changed.');
          }
          const updated = this.db.exec(
            `UPDATE characters SET archived_at = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND revision = ? AND archived_at IS NULL`,
            [archivedAt, character.character_id, character.character_revision],
          );
          if (updated.changes !== 1) throw new Error('Character archive state changed.');
          this.db.exec(
            `INSERT INTO catalog_content_archive_members (
               content_kind, content_key, character_id, character_revision,
               character_name, archived_at
             ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              facts.content_kind,
              facts.content_key,
              character.character_id,
              character.character_revision,
              plannedCharacter.character_name,
              archivedAt,
            ],
          );
        }
        return Object.freeze({
          content_key: facts.content_key,
          content_kind: facts.content_kind,
          archived_at: archivedAt,
          character_ids: Object.freeze(facts.characters.map((row) => row.character_id)),
        });
      });
    } catch (error) {
      throw new ArchiveSetLifecycleError('The archive set transaction was refused.', {
        reason: 'archive_set_refused', refusal: 'commit_failed',
      }, { cause: error });
    }
  }

  commitRestore(token: ArchiveSetPlanToken): ArchiveSetResult {
    const facts = this.#facts(token, 'restore');
    const preview = this.previewRestore(facts.content_key);
    if (preview.token !== token) this.#stale(facts.content_key);
    try {
      return this.db.transaction(() => {
        const identity = this.db.exec(
          `UPDATE catalog_content_identities SET archived_at = NULL
           WHERE content_key = ? AND content_kind = ? AND archived_at = ?`,
          [facts.content_key, facts.content_kind, facts.archived_at],
        );
        if (identity.changes !== 1) throw new Error('Creation archive state changed.');
        for (const character of facts.characters) {
          const updated = this.db.exec(
            `UPDATE characters SET archived_at = NULL, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND revision = ? AND archived_at = ?`,
            [character.character_id, character.character_revision, facts.archived_at],
          );
          if (updated.changes !== 1) throw new Error('Character archive state changed.');
        }
        const removedMembers = this.db.exec(
          `DELETE FROM catalog_content_archive_members
           WHERE content_kind = ? AND content_key = ? AND archived_at = ?`,
          [facts.content_kind, facts.content_key, facts.archived_at],
        );
        if (removedMembers.changes !== facts.characters.length) {
          throw new Error('Archive membership changed.');
        }
        return Object.freeze({
          content_key: facts.content_key,
          content_kind: facts.content_kind,
          archived_at: null,
          character_ids: Object.freeze(facts.characters.map((row) => row.character_id)),
        });
      });
    } catch (error) {
      throw new ArchiveSetLifecycleError('The restore-set transaction was refused.', {
        reason: 'archive_set_refused', refusal: 'commit_failed',
      }, { cause: error });
    }
  }

  #stale(contentKey: ContentKey): never {
    throw new ArchiveSetLifecycleError('The archive-set plan is stale.', {
      reason: 'stale_archive_set_plan', content_key: contentKey,
    });
  }

  #facts(
    token: ArchiveSetPlanToken,
    operation: 'archive' | 'restore',
  ): ArchiveSetTokenFacts {
    let decoded: unknown;
    try {
      decoded = JSON.parse(token);
    } catch {
      decoded = null;
    }
    if (!Array.isArray(decoded) || decoded.length !== 2) {
      throw new ArchiveSetLifecycleError('The archive-set token is invalid.', {
        reason: 'invalid_reference',
      });
    }
    const facts = decoded[0] as ArchiveSetTokenFacts;
    const digest = decoded[1];
    if (
      facts === null || typeof facts !== 'object' || facts.operation !== operation ||
      typeof facts.content_key !== 'string' ||
      (facts.content_kind !== 'species' && facts.content_kind !== 'background' &&
        facts.content_kind !== 'subclass') ||
      (facts.archived_at !== null && typeof facts.archived_at !== 'string') ||
      !Array.isArray(facts.characters) || typeof digest !== 'string' ||
      sha256(canonicalJson(facts)) !== digest
    ) {
      throw new ArchiveSetLifecycleError('The archive-set token is invalid.', {
        reason: 'invalid_reference',
      });
    }
    return facts;
  }
}
