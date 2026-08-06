import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import {
  AuthoringServiceError,
  CatalogAuthoringService,
} from '../../../src/authoring/draft-service';
import { speciesDraftToAggregate } from '../../../src/authoring/species-publisher';
import type {
  DraftRevision,
  SpeciesAuthoringDraft,
  StoredHomebrewDraft,
} from '../../../src/authoring/contracts';
import type { HomebrewDraftItemUuid } from '../../../src/authoring/ids';
import {
  commitCharacterBackupImport,
  exportCharacterBackup,
  planCharacterBackupImport,
} from '../../../src/backup/character-backup';
import {
  exportSelectedLibraryContent,
  importLibraryDocument,
  planLibraryImport,
} from '../../../src/backup/library-export';
import {
  applyGuidedOrigin,
  createGuidedCharacter,
  listGuidedClassOptions,
  listGuidedOriginOptions,
} from '../../../src/builder/guided-creation';
import { assertedExternalContentKey } from '../../../src/catalog/catalog-key';
import {
  commitContentImport,
  planContentImport,
} from '../../../src/catalog/content-adoption';
import {
  registerContentAlias,
  rememberContentMatchDecision,
} from '../../../src/catalog/content-registry';
import {
  portableSourceContentImportNode,
  portableStoredGrantRules,
} from '../../../src/catalog/source-content-importer';
import { deriveContentIdentityV1 } from '../../../src/catalog/content-identity';
import { projectStoredContentV1 } from '../../../src/catalog/stored-content-projector-v1';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { applicationSeed } from '../../../src/db/bootstrap';
import { DatabaseContext } from '../../../src/db/database';
import { damageType, skills } from '../../../src/domain/enums';
import type { ContentKey } from '../../../src/domain/ids';
import {
  fillSkillGrant,
  unfilledSpeciesSkillGrants,
} from '../../../src/grants/skill-grants';
import { openTestDatabase } from '../../helpers/open-db';

const opened: Database[] = [];
let uuidSequence = 0;

afterEach(() => {
  for (const connection of opened.splice(0)) connection.close();
  uuidSequence = 0;
});

async function database(seed = false): Promise<DatabaseContext> {
  const connection = await openTestDatabase();
  opened.push(connection);
  const db = new DatabaseContext(connection);
  if (seed) applicationSeed(db);
  return db;
}

function service(db: DatabaseContext): CatalogAuthoringService {
  return new CatalogAuthoringService(db, {
    randomUuid: () => `ha3-species-${String(++uuidSequence)}`,
    now: () => '2042-06-07T08:09:10.000Z',
  });
}

function itemUuid(value: string): HomebrewDraftItemUuid {
  return value as HomebrewDraftItemUuid;
}

function validSpecies(
  created: StoredHomebrewDraft,
  name = 'Clockwork Voyager',
): SpeciesAuthoringDraft {
  if (created.document.kind !== 'species') throw new Error('Fixture draft is not species.');
  return {
    ...created.document,
    name,
    rules_edition: 'expanded',
    reference_text: 'A precise machine-born traveler.',
    creature_type: 'Clockwork',
    primary_size: 'Colossal',
    alternate_size: 'Small',
    walking_speed_feet: 35,
    traits: [{
      draft_item_uuid: itemUuid(`${name}-trait`),
      name: 'Void Ward',
      description: 'Resists two deliberately distinct homebrew damage types.',
      effects: [
        {
          kind: 'damage_resistance',
          draft_item_uuid: itemUuid(`${name}-void-upper`),
          label: 'Void Ward',
          notes: null,
          damage_type: damageType('Void'),
        },
        {
          kind: 'damage_resistance',
          draft_item_uuid: itemUuid(`${name}-void-lower`),
          label: 'Lower void ward',
          notes: null,
          damage_type: damageType('void'),
        },
        {
          kind: 'armor_class_formula',
          draft_item_uuid: itemUuid(`${name}-armor`),
          label: 'Clockwork shell',
          notes: null,
          base: 12,
          ability_1: 'dexterity',
          ability_2: null,
          allows_shield: false,
        },
      ],
    }],
    grants: [{
      kind: 'skill_proficiency',
      draft_item_uuid: itemUuid(`${name}-skill`),
      rule_key: 'clockwork-skill',
      count: 1,
      skills: ['arcana', 'investigation'],
    }],
  };
}

function savedSpecies(
  authoring: CatalogAuthoringService,
  name?: string,
  transform?: (draft: SpeciesAuthoringDraft) => SpeciesAuthoringDraft,
): StoredHomebrewDraft {
  const created = authoring.createDraft({ content_kind: 'species' });
  let document = validSpecies(created, name);
  if (transform !== undefined) document = transform(document);
  return authoring.saveDraft({
    draft_uuid: created.draft_uuid,
    expected_revision: created.revision,
    document,
  });
}

function publish(
  authoring: CatalogAuthoringService,
  draft: StoredHomebrewDraft,
) {
  const preview = authoring.previewPublish({
    draft_uuid: draft.draft_uuid,
    expected_revision: draft.revision,
  });
  return {
    preview,
    result: authoring.commitPublish({ token: preview.token, decisions: [] }),
  };
}

function authoringError(operation: () => unknown): AuthoringServiceError {
  try {
    operation();
  } catch (error) {
    expect(error).toBeInstanceOf(AuthoringServiceError);
    return error as AuthoringServiceError;
  }
  throw new Error('Expected an authoring service error.');
}

describe('HA-3 species publisher', () => {
  it('reports every unresolved semantic field path before touching the catalog', async () => {
    const db = await database();
    const authoring = service(db);
    const draft = savedSpecies(authoring, ' ', (document) => ({
      ...document,
      rules_edition: null,
      creature_type: '',
      primary_size: '',
      walking_speed_feet: null,
      grants: [
        {
          kind: 'fixed_spell',
          draft_item_uuid: itemUuid('bad-fixed'),
          rule_key: 'duplicate-key',
          spell_content_key: 'expanded:missing-spell' as ContentKey,
          always_prepared: false,
        },
        {
          kind: 'choice_from_list',
          draft_item_uuid: itemUuid('bad-list'),
          rule_key: 'duplicate-key',
          list: '',
          count: null,
          maximum_spell_level: null,
        },
        {
          kind: 'skill_proficiency',
          draft_item_uuid: itemUuid('bad-skill'),
          rule_key: '',
          count: null,
          skills: [],
        },
      ],
      traits: [{
        draft_item_uuid: itemUuid('bad-trait'),
        name: '',
        description: '',
        effects: [
          {
            kind: 'damage_resistance',
            draft_item_uuid: itemUuid('bad-resistance'),
            label: '',
            notes: null,
            damage_type: null,
          },
          {
            kind: 'hp_modifier',
            draft_item_uuid: itemUuid('bad-hp'),
            label: 'Unresolved hit points',
            notes: null,
            hit_points_flat: null,
            hit_points_per_level: null,
          },
        ],
      }],
    }));

    const error = authoringError(() => authoring.previewPublish({
      draft_uuid: draft.draft_uuid,
      expected_revision: draft.revision,
    }));
    expect(error.data.reason).toBe('validation_failed');
    if (error.data.reason !== 'validation_failed') throw new Error('Expected validation issues.');
    expect(error.data.issues.map(({ path, code }) => ({ path, code }))).toEqual(
      expect.arrayContaining([
        { path: ['name'], code: 'required' },
        { path: ['rules_edition'], code: 'required' },
        { path: ['creature_type'], code: 'required' },
        { path: ['primary_size'], code: 'required' },
        { path: ['walking_speed_feet'], code: 'required' },
        { path: ['grants', 0, 'spell_content_key'], code: 'unresolved_reference' },
        { path: ['grants', 1, 'rule_key'], code: 'duplicate' },
        { path: ['grants', 1, 'list'], code: 'required' },
        { path: ['grants', 1, 'count'], code: 'required' },
        { path: ['grants', 2, 'rule_key'], code: 'required' },
        { path: ['grants', 2, 'count'], code: 'required' },
        { path: ['grants', 2, 'skills'], code: 'required' },
        { path: ['traits', 0, 'name'], code: 'required' },
        { path: ['traits', 0, 'description'], code: 'required' },
        { path: ['traits', 0, 'effects', 0, 'damage_type'], code: 'required' },
        { path: ['traits', 0, 'effects', 1], code: 'required' },
      ]),
    );
    expect(db.scalar<number>('SELECT count(*) FROM catalog_content_identities')).toBe(0);
    expect(db.scalar<number>('SELECT count(*) FROM species_definitions')).toBe(0);
    expect(db.scalar<number>('SELECT count(*) FROM species_templates')).toBe(0);
    expect(authoring.readDraft(draft.draft_uuid).revision).toBe(draft.revision);
  });

  // Measured alone at 2.34s: two fully seeded databases dominate this portable round trip.
  it('publishes, exports, imports, and applies passthrough mechanics with target-local template refs', async () => {
    const source = await database(true);
    const authoring = service(source);
    const spellRows = source.allRaw(
      `SELECT version.content_key, fingerprint.fingerprint_digest
       FROM spell_versions AS version
       JOIN catalog_content_fingerprints AS fingerprint
         ON fingerprint.content_kind = 'spell'
        AND fingerprint.content_key = version.content_key
        AND fingerprint.fingerprint_role = 'current'
       WHERE (
         SELECT count(DISTINCT candidate.content_key)
         FROM catalog_content_fingerprints AS candidate
         WHERE candidate.content_kind = 'spell'
           AND candidate.fingerprint_scheme = fingerprint.fingerprint_scheme
           AND candidate.fingerprint_digest = fingerprint.fingerprint_digest
           AND candidate.fingerprint_role IN ('current', 'compatible')
       ) = 1
       ORDER BY version.content_key`,
    );
    const spellKey = spellRows.find((row) => {
      if (
        typeof row.content_key !== 'string' ||
        typeof row.fingerprint_digest !== 'string'
      ) return false;
      const stored = projectStoredContentV1(
        source,
        'spell',
        row.content_key as ContentKey,
      );
      return deriveContentIdentityV1({
        kind: stored.kind,
        edition: stored.edition,
        name: stored.name,
        payload: stored.payload,
      }).digest === row.fingerprint_digest;
    })?.content_key;
    if (typeof spellKey !== 'string') throw new Error('Seeded live spell fingerprint is missing.');
    const draft = savedSpecies(authoring, undefined, (document) => ({
      ...document,
      grants: [
        ...document.grants,
        {
          kind: 'fixed_spell',
          draft_item_uuid: itemUuid('clockwork-fixed'),
          rule_key: 'clockwork-fixed',
          spell_content_key: spellKey as ContentKey,
          always_prepared: true,
        },
        {
          kind: 'choice_from_list',
          draft_item_uuid: itemUuid('clockwork-list'),
          rule_key: 'clockwork-list',
          list: 'wizard',
          count: 1,
          maximum_spell_level: 1,
        },
        {
          kind: 'choice_from_query',
          draft_item_uuid: itemUuid('clockwork-query'),
          rule_key: 'clockwork-query',
          schools: ['Abjuration'],
          tags: ['ritual'],
          count: 1,
          minimum_spell_level: 0,
          maximum_spell_level: 2,
        },
      ],
    }));
    if (draft.document.kind !== 'species') throw new Error('Saved draft is not species.');
    const semanticAggregate = speciesDraftToAggregate(source, draft.document);
    expect(() => portableStoredGrantRules(source, semanticAggregate.grants)).not.toThrow();
    const { preview, result } = publish(authoring, draft);
    const expectedKey = assertedExternalContentKey(
      'species',
      'expanded',
      'Clockwork Voyager',
    );

    expect(preview.review).toEqual([]);
    expect(result).toEqual({
      outcome: 'created',
      content_key: expectedKey,
      name: 'Clockwork Voyager',
      catalog_layer: 'external',
      previous_key_usage_count: 0,
    });
    expect(source.oneRaw(
      `SELECT creature_type, size, alternate_size
       FROM species_templates WHERE content_key = ?`,
      [expectedKey],
    )).toEqual({ creature_type: 'Clockwork', size: 'Colossal', alternate_size: 'Small' });
    expect(source.allRaw(
      `SELECT effect.damage_type
       FROM species_template_trait_effects AS effect
       JOIN species_template_traits AS trait
         ON trait.id = effect.species_template_trait_id
       JOIN species_templates AS template
         ON template.id = trait.species_template_id
       WHERE template.content_key = ?
         AND effect.effect_kind = 'damage_resistance'
       ORDER BY effect.sort_order`,
      [expectedKey],
    )).toEqual([{ damage_type: 'Void' }, { damage_type: 'void' }]);

    const classOption = listGuidedClassOptions(source)[0];
    if (classOption === undefined) throw new Error('Seeded class option is missing.');
    const character = createGuidedCharacter(
      source,
      { name: 'Clockwork Hero', class_content_key: classOption.content_key },
      new CharacterCommandIntegrity('ha3-species-apply'),
    );
    const option = listGuidedOriginOptions(source, 'species').find(
      (candidate) => candidate.content_key === expectedKey,
    );
    expect(option).toEqual({
      content_key: expectedKey,
      name: 'Clockwork Voyager',
      catalog_layer: 'external',
      grants_lineage_spells: false,
    });
    applyGuidedOrigin(source, {
      character_id: character.id,
      kind: 'species',
      content_key: expectedKey,
    });
    expect(source.oneRaw(
      'SELECT creature_type, size, base_speed_feet FROM character_species WHERE character_id = ?',
      [character.id],
    )).toEqual({ creature_type: 'Clockwork', size: 'Colossal', base_speed_feet: 35 });
    expect(source.allRaw(
      `SELECT character_effect.template_ref,
              'species_template_trait_effects:' || template_effect.id AS expected_ref,
              character_effect.source_instance_id
       FROM character_effects AS character_effect
       JOIN species_template_trait_effects AS template_effect
         ON character_effect.template_ref = 'species_template_trait_effects:' || template_effect.id
       WHERE character_effect.character_id = ?
       ORDER BY character_effect.sort_order`,
      [character.id],
    )).toEqual([
      expect.objectContaining({ template_ref: expect.stringMatching(/^species_template_trait_effects:\d+$/), source_instance_id: expect.any(Number) }),
      expect.objectContaining({ template_ref: expect.stringMatching(/^species_template_trait_effects:\d+$/), source_instance_id: expect.any(Number) }),
      expect.objectContaining({ template_ref: expect.stringMatching(/^species_template_trait_effects:\d+$/), source_instance_id: expect.any(Number) }),
    ]);
    expect(source.allRaw(
      `SELECT grant_key, ordinal, skill, state
       FROM character_skill_grants WHERE character_id = ? AND grant_key = 'clockwork-skill'`,
      [character.id],
    )).toEqual([{ grant_key: 'clockwork-skill', ordinal: 1, skill: null, state: 'active' }]);
    const authoredSkillGrant = unfilledSpeciesSkillGrants(source, character.id)
      .find((grant) => grant.grant_key === 'clockwork-skill');
    expect(authoredSkillGrant).toEqual(expect.objectContaining({
      ordinal: 1,
      available: ['arcana', 'investigation'],
    }));
    if (authoredSkillGrant === undefined) throw new Error('Authored skill grant is missing.');
    fillSkillGrant(source, character.id, authoredSkillGrant.grant_id, 'investigation');
    expect(source.oneRaw(
      'SELECT skill FROM character_skill_grants WHERE id = ?',
      [authoredSkillGrant.grant_id],
    )).toEqual({ skill: 'investigation' });
    expect(source.allRaw(
      `SELECT rule_key, eligibility_kind
       FROM spell_selection_slots
       WHERE character_id = ? AND rule_key LIKE 'clockwork-%'
       ORDER BY rule_key`,
      [character.id],
    )).toEqual([
      { rule_key: 'clockwork-fixed', eligibility_kind: 'fixed_spell' },
      { rule_key: 'clockwork-list', eligibility_kind: 'choice_from_list' },
      { rule_key: 'clockwork-query', eligibility_kind: 'choice_from_query' },
    ]);

    const exported = exportSelectedLibraryContent(
      source,
      [expectedKey],
      '2042-06-08T00:00:00.000Z',
    );
    expect(exported.content.map((entry) => `${entry.kind}:${entry.content_key}`)).toEqual([
      `species:${expectedKey}`,
    ]);
    const target = await database(true);
    const targetPlan = planLibraryImport(target, exported);
    expect(targetPlan.outcomes).toEqual([
      expect.objectContaining({ kind: 'create', contentKey: expectedKey }),
    ]);
    importLibraryDocument(target, exported);
    const targetEffectIds = target.allRaw(
      `SELECT effect.id FROM species_template_trait_effects AS effect
       JOIN species_template_traits AS trait ON trait.id = effect.species_template_trait_id
       JOIN species_templates AS template ON template.id = trait.species_template_id
       WHERE template.content_key = ? ORDER BY effect.sort_order`,
      [expectedKey],
    );
    expect(targetEffectIds).toHaveLength(3);
    const targetClass = listGuidedClassOptions(target)[0];
    if (targetClass === undefined) throw new Error('Target class option is missing.');
    const targetCharacter = createGuidedCharacter(
      target,
      { name: 'Imported Clockwork Hero', class_content_key: targetClass.content_key },
      new CharacterCommandIntegrity('ha3-target-species-apply'),
    );
    applyGuidedOrigin(target, {
      character_id: targetCharacter.id,
      kind: 'species',
      content_key: expectedKey,
    });
    expect(target.oneRaw(
      `SELECT count(*) AS count
       FROM character_effects AS character_effect
       JOIN species_template_trait_effects AS template_effect
         ON character_effect.template_ref = 'species_template_trait_effects:' || template_effect.id
       WHERE character_effect.character_id = ?`,
      [targetCharacter.id],
    )).toEqual({ count: 3 });
    expect(exportSelectedLibraryContent(
      target,
      [expectedKey],
      '2042-06-08T00:00:00.000Z',
    )).toEqual(exported);
  }, 20_000);

  it('remaps a source character species effect provenance to target-local template rows', async () => {
    const source = await database(true);
    const sourceAuthoring = service(source);
    const published = publish(
      sourceAuthoring,
      savedSpecies(sourceAuthoring, 'Portable Effect Voyager'),
    );
    const sourceClass = listGuidedClassOptions(source)[0];
    if (sourceClass === undefined) throw new Error('Source class option is missing.');
    const sourceCharacter = createGuidedCharacter(
      source,
      { name: 'Portable Effect Hero', class_content_key: sourceClass.content_key },
      new CharacterCommandIntegrity('ha3-portable-effect-source'),
    );
    applyGuidedOrigin(source, {
      character_id: sourceCharacter.id,
      kind: 'species',
      content_key: published.result.content_key,
    });
    const sourceRefs = source.allRaw(
      `SELECT template_ref FROM character_effects
       WHERE character_id = ? AND template_ref LIKE 'species_template_trait_effects:%'
       ORDER BY sort_order`,
      [sourceCharacter.id],
    ).map((row) => String(row.template_ref));
    expect(sourceRefs).toHaveLength(3);
    const document = exportCharacterBackup(
      source,
      sourceCharacter.id,
      '2042-06-08T00:00:00.000Z',
    );

    const target = await database(true);
    const targetAuthoring = service(target);
    publish(
      targetAuthoring,
      savedSpecies(targetAuthoring, 'Target Sequence Offset'),
    );
    const plan = planCharacterBackupImport(target, document);
    expect(plan.outcomes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'create',
        contentKey: published.result.content_key,
      }),
    ]));
    const committed = commitCharacterBackupImport(
      target,
      document,
      plan.token,
    );
    expect(committed.kind).toBe('committed');
    if (committed.kind !== 'committed') throw new Error('Character import did not commit.');
    const targetRefs = target.allRaw(
      `SELECT template_ref FROM character_effects
       WHERE character_id = ? AND template_ref LIKE 'species_template_trait_effects:%'
       ORDER BY sort_order`,
      [committed.result.characterId],
    ).map((row) => String(row.template_ref));
    const installedTargetRefs = target.allRaw(
      `SELECT 'species_template_trait_effects:' || effect.id AS template_ref
       FROM species_template_trait_effects AS effect
       JOIN species_template_traits AS trait
         ON trait.id = effect.species_template_trait_id
       JOIN species_templates AS template
         ON template.id = trait.species_template_id
       WHERE template.content_key = ?
       ORDER BY trait.sort_order, effect.sort_order`,
      [published.result.content_key],
    ).map((row) => String(row.template_ref));
    expect(targetRefs).toEqual(installedTargetRefs);
    expect(targetRefs).toHaveLength(3);
    expect(targetRefs.every((reference) => !sourceRefs.includes(reference))).toBe(true);
  }, 20_000);

  it('keeps bundled species skill plans provenance-gated from authored rule keys', async () => {
    const db = await database(true);
    const authoring = service(db);
    const classOption = listGuidedClassOptions(db)[0];
    if (classOption === undefined) throw new Error('Seeded class option is missing.');
    const cases = [
      {
        name: 'Authored Keen Senses',
        ruleKey: 'keen_senses',
        pool: ['arcana'] as const,
      },
      {
        name: 'Authored Skillful',
        ruleKey: 'skillful',
        pool: ['history', 'nature'] as const,
      },
    ];
    for (const [index, fixture] of cases.entries()) {
      const installed = publish(authoring, savedSpecies(
        authoring,
        fixture.name,
        (document) => ({
          ...document,
          grants: [{
            kind: 'skill_proficiency',
            draft_item_uuid: itemUuid(`${fixture.name}-skill`),
            rule_key: fixture.ruleKey,
            count: 1,
            skills: [...fixture.pool],
          }],
        }),
      ));
      const character = createGuidedCharacter(
        db,
        {
          name: `${fixture.name} Hero`,
          class_content_key: classOption.content_key,
        },
        new CharacterCommandIntegrity(`ha3-authored-skill-${String(index)}`),
      );
      applyGuidedOrigin(db, {
        character_id: character.id,
        kind: 'species',
        content_key: installed.result.content_key,
      });
      expect(unfilledSpeciesSkillGrants(db, character.id)).toEqual([
        expect.objectContaining({
          grant_key: fixture.ruleKey,
          available: [...fixture.pool],
        }),
      ]);
    }

    for (const fixture of [
      { species: 'Elf', pool: ['insight', 'perception', 'survival'] },
      { species: 'Human', pool: [...skills] },
    ]) {
      const option = listGuidedOriginOptions(db, 'species').find(
        (candidate) => candidate.name === fixture.species,
      );
      if (option === undefined) throw new Error(`${fixture.species} option is missing.`);
      const character = createGuidedCharacter(
        db,
        {
          name: `Bundled ${fixture.species} Hero`,
          class_content_key: classOption.content_key,
        },
        new CharacterCommandIntegrity(`ha3-bundled-${fixture.species}`),
      );
      applyGuidedOrigin(db, {
        character_id: character.id,
        kind: 'species',
        content_key: option.content_key,
      });
      expect(unfilledSpeciesSkillGrants(db, character.id)[0]?.available).toEqual(
        fixture.pool,
      );
    }
  }, 20_000);

  it('freezes draft-to-projector bytes independently of the installer result', async () => {
    const db = await database();
    const authoring = service(db);
    const draft = savedSpecies(authoring, 'Projector Oracle', (document) => ({
      ...document,
      reference_text: '',
      traits: [],
      grants: [],
    }));
    const preview = authoring.previewPublish({
      draft_uuid: draft.draft_uuid,
      expected_revision: draft.revision,
    });
    expect(preview.facts.canonical_json).toBe(
      '{"edition":"expanded","kind":"species","normalizedName":"projectororacle","payload":{"alternate_size":"Small","creature_type":"Clockwork","grants":[],"primary_size":"Colossal","reference_text":"","repeatable":false,"traits":[],"walking_speed_feet":35},"scheme":"content-v1"}',
    );
    expect(preview.facts.candidate_content_keys).toEqual([
      'expanded:content.species:projector-oracle',
    ]);
  });

  it('silently self-matches byte-identical external species repeatedly without receipts or duplicate rows', async () => {
    const db = await database();
    const authoring = service(db);
    const first = publish(authoring, savedSpecies(authoring, 'Mirror Species'));
    expect(first.result.outcome).toBe('created');
    const countsAfterFirst = db.oneRaw(
      `SELECT
         (SELECT count(*) FROM catalog_content_identities) AS identities,
         (SELECT count(*) FROM species_definitions) AS definitions,
         (SELECT count(*) FROM species_templates) AS templates,
         (SELECT count(*) FROM species_template_traits) AS traits,
         (SELECT count(*) FROM species_template_trait_effects) AS effects,
         (SELECT count(*) FROM catalog_content_match_decisions) AS receipts`,
    );

    for (const repeat of [2, 3]) {
      const duplicate = savedSpecies(authoring, 'Mirror Species', (document) => ({
        ...document,
        reference_text: repeat === 2 ? document.reference_text : `${document.reference_text}`,
      }));
      const preview = authoring.previewPublish({
        draft_uuid: duplicate.draft_uuid,
        expected_revision: duplicate.revision,
      });
      expect(preview.review, `repeat ${String(repeat)}`).toEqual([]);
      expect(authoring.commitPublish({ token: preview.token, decisions: [] })).toMatchObject({
        outcome: 'matched_existing',
        content_key: first.result.content_key,
        name: 'Mirror Species',
        catalog_layer: 'external',
      });
      expect(() => authoring.readDraft(duplicate.draft_uuid)).toThrow(AuthoringServiceError);
      expect(db.oneRaw(
        `SELECT
           (SELECT count(*) FROM catalog_content_identities) AS identities,
           (SELECT count(*) FROM species_definitions) AS definitions,
           (SELECT count(*) FROM species_templates) AS templates,
           (SELECT count(*) FROM species_template_traits) AS traits,
           (SELECT count(*) FROM species_template_trait_effects) AS effects,
           (SELECT count(*) FROM catalog_content_match_decisions) AS receipts`,
      )).toEqual(countsAfterFirst);
    }
  });

  it('canonicalizes decomposed passthrough values without rewriting installed display bytes', async () => {
    const db = await database();
    const authoring = service(db);
    const decomposed = `Vo${'i\u0308'}d`;
    const composed = decomposed.normalize('NFC');
    expect(decomposed).not.toBe(composed);
    publish(authoring, savedSpecies(authoring, 'Unicode Species', (document) => ({
      ...document,
      creature_type: decomposed,
    })));
    const duplicate = savedSpecies(authoring, 'Unicode Species', (document) => ({
      ...document,
      creature_type: composed,
    }));
    const preview = authoring.previewPublish({
      draft_uuid: duplicate.draft_uuid,
      expected_revision: duplicate.revision,
    });
    expect(preview.review).toEqual([]);
    expect(authoring.commitPublish({ token: preview.token, decisions: [] }).outcome).toBe('matched_existing');
    expect(db.scalar<string>(
      `SELECT creature_type FROM species_templates
       WHERE content_key = 'expanded:content.species:unicode-species'`,
    )).toBe(decomposed);
  });

  it('never lets a remembered alias decision bypass authoring review', async () => {
    const db = await database();
    const authoring = service(db);
    const incoming = savedSpecies(authoring, 'Alias Species');
    const initialPreview = authoring.previewPublish({
      draft_uuid: incoming.draft_uuid,
      expected_revision: incoming.revision,
    });
    if (initialPreview.aggregate.kind !== 'species') throw new Error('Preview aggregate is not species.');
    const targetKey = 'expanded:alternate.owner:alias-species' as ContentKey;
    const targetNode = portableSourceContentImportNode(
      db,
      initialPreview.aggregate,
      targetKey,
    );
    const targetPlan = planContentImport(db, [targetNode]);
    expect(commitContentImport(db, {
      nodes: [targetNode],
      token: targetPlan.token,
    }).kind).toBe('committed');
    const incomingKey = assertedExternalContentKey('species', 'expanded', 'Alias Species');
    registerContentAlias(db, {
      kind: 'species',
      aliasKey: incomingKey,
      contentKey: targetKey,
      aliasKind: 'declared-legacy',
    });
    const firstPreview = authoring.previewPublish({
      draft_uuid: incoming.draft_uuid,
      expected_revision: incoming.revision,
    });
    expect(firstPreview.review).toEqual([{
      candidate_content_key: targetKey,
      candidate_name: 'Alias Species',
      reason: 'alias',
      default_decision: 'match',
    }]);
    const incomingIdentity = firstPreview.facts.candidate_identities[0];
    if (incomingIdentity === undefined) throw new Error('Incoming identity is missing.');
    rememberContentMatchDecision(db, {
      kind: incomingIdentity.kind,
      scheme: incomingIdentity.scheme,
      digest: incomingIdentity.digest,
      decision: 'match',
      targetContentKey: targetKey,
    });
    const repeatedPreview = authoring.previewPublish({
      draft_uuid: incoming.draft_uuid,
      expected_revision: incoming.revision,
    });
    expect(repeatedPreview.review).toEqual(firstPreview.review);
    expect(authoringError(() => authoring.commitPublish({
      token: repeatedPreview.token,
      decisions: [],
    })).data).toEqual({
      reason: 'publish_review_required',
      candidates: [targetKey],
    });
    expect(authoring.readDraft(incoming.draft_uuid).revision).toBe(incoming.revision);
  });

  it('commits an explicit Match as success before deleting the reviewed draft', async () => {
    const db = await database();
    const authoring = service(db);
    const incoming = savedSpecies(authoring, 'Explicit Match Species');
    const initial = authoring.previewPublish({
      draft_uuid: incoming.draft_uuid,
      expected_revision: incoming.revision,
    });
    if (initial.aggregate.kind !== 'species') throw new Error('Preview aggregate is not species.');
    const targetKey = 'expanded:alternate.owner:explicit-match-species' as ContentKey;
    const targetNode = portableSourceContentImportNode(db, initial.aggregate, targetKey);
    const targetPlan = planContentImport(db, [targetNode]);
    expect(commitContentImport(db, {
      nodes: [targetNode],
      token: targetPlan.token,
    }).kind).toBe('committed');
    registerContentAlias(db, {
      kind: 'species',
      aliasKey: assertedExternalContentKey(
        'species',
        'expanded',
        'Explicit Match Species',
      ),
      contentKey: targetKey,
      aliasKind: 'declared-legacy',
    });
    const preview = authoring.previewPublish({
      draft_uuid: incoming.draft_uuid,
      expected_revision: incoming.revision,
    });
    expect(preview.review).toEqual([
      expect.objectContaining({ candidate_content_key: targetKey }),
    ]);

    expect(authoring.commitPublish({
      token: preview.token,
      decisions: [{
        candidate_content_key: targetKey,
        decision: 'match',
      }],
    })).toEqual({
      outcome: 'matched_existing',
      content_key: targetKey,
      name: 'Explicit Match Species',
      catalog_layer: 'external',
      previous_key_usage_count: 0,
    });
    expect(() => authoring.readDraft(incoming.draft_uuid)).toThrow(AuthoringServiceError);
    expect(db.scalar<number>('SELECT count(*) FROM species_definitions')).toBe(1);
    expect(db.scalar<number>('SELECT count(*) FROM species_templates')).toBe(1);
    expect(db.scalar<number>('SELECT count(*) FROM catalog_content_match_decisions')).toBe(1);
  });

  it('reports base-key usage without propagating an immutable new version to characters', async () => {
    const db = await database(true);
    const authoring = service(db);
    const original = publish(authoring, savedSpecies(authoring, 'Usage Species'));
    const classOption = listGuidedClassOptions(db)[0];
    if (classOption === undefined) throw new Error('Seeded class option is missing.');
    const character = createGuidedCharacter(
      db,
      { name: 'Usage Hero', class_content_key: classOption.content_key },
      new CharacterCommandIntegrity('ha3-usage'),
    );
    applyGuidedOrigin(db, {
      character_id: character.id,
      kind: 'species',
      content_key: original.result.content_key,
    });
    const copied = authoring.createDraft({
      content_kind: 'species',
      base_content_key: original.result.content_key,
    });
    if (copied.document.kind !== 'species') throw new Error('Copied draft is not species.');
    const next = authoring.saveDraft({
      draft_uuid: copied.draft_uuid,
      expected_revision: copied.revision,
      document: {
        ...copied.document,
        name: 'Usage Species Revised',
        walking_speed_feet: 40,
      },
    });
    const published = publish(authoring, next);
    expect(published.result).toMatchObject({
      outcome: 'created',
      previous_key_usage_count: 1,
    });
    expect(authoring.usages(original.result.content_key).usages).toHaveLength(1);
    expect(authoring.usages(published.result.content_key).usages).toHaveLength(0);
    expect(db.oneRaw(
      'SELECT name, base_speed_feet FROM character_species WHERE character_id = ?',
      [character.id],
    )).toEqual({ name: 'Usage Species', base_speed_feet: 35 });
  });

  it('rolls registry, both roots, children, and draft deletion back as one transaction', async () => {
    const db = await database();
    const authoring = service(db);
    const draft = savedSpecies(authoring, 'Rollback Species');
    const preview = authoring.previewPublish({
      draft_uuid: draft.draft_uuid,
      expected_revision: draft.revision,
    });
    db.exec(
      `CREATE TEMP TRIGGER ha3_refuse_draft_delete
       BEFORE DELETE ON catalog_content_drafts
       BEGIN SELECT RAISE(ABORT, 'HA3 injected draft-delete failure'); END`,
    );

    const error = authoringError(() => authoring.commitPublish({
      token: preview.token,
      decisions: [],
    }));
    expect(error.data).toEqual({ reason: 'publish_refused', refusal: 'commit_failed' });
    expect(db.scalar<number>(
      `SELECT count(*) FROM catalog_content_identities
       WHERE content_key = 'expanded:content.species:rollback-species'`,
    )).toBe(0);
    expect(db.scalar<number>('SELECT count(*) FROM species_definitions')).toBe(0);
    expect(db.scalar<number>('SELECT count(*) FROM species_templates')).toBe(0);
    expect(db.scalar<number>('SELECT count(*) FROM species_template_traits')).toBe(0);
    expect(db.scalar<number>('SELECT count(*) FROM species_template_trait_effects')).toBe(0);
    expect(authoring.readDraft(draft.draft_uuid).revision).toBe(1 as DraftRevision);
  });

  it('returns a typed asserted-name collision and leaves the existing aggregate immutable', async () => {
    const db = await database();
    const authoring = service(db);
    const created = publish(authoring, savedSpecies(authoring, 'Collision Species'));
    const before = exportSelectedLibraryContent(
      db,
      [created.result.content_key],
      '2042-06-08T00:00:00.000Z',
    );
    const changed = savedSpecies(authoring, 'Collision Species', (document) => ({
      ...document,
      walking_speed_feet: 40,
    }));
    const error = authoringError(() => authoring.previewPublish({
      draft_uuid: changed.draft_uuid,
      expected_revision: changed.revision,
    }));
    expect(error.data).toEqual({
      reason: 'content_key_collision',
      content_key: created.result.content_key,
    });
    expect(exportSelectedLibraryContent(
      db,
      [created.result.content_key],
      '2042-06-08T00:00:00.000Z',
    )).toEqual(before);
    expect(authoring.readDraft(changed.draft_uuid).revision).toBe(changed.revision);
  });
});
