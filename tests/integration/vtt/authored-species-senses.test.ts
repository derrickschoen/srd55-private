import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import { CatalogAuthoringService } from '../../../src/authoring/draft-service';
import type {
  SpeciesAuthoringDraft,
  SpeciesContentAggregate,
  StoredHomebrewDraft,
} from '../../../src/authoring/contracts';
import {
  commitCharacterBackupImport,
  exportCharacterBackup,
  planCharacterBackupImport,
} from '../../../src/backup/character-backup';
import {
  applyGuidedOrigin,
  createGuidedCharacter,
  listGuidedClassOptions,
} from '../../../src/builder/guided-creation';
import { exportWholeLibrary, importLibraryDocument } from '../../../src/backup/library-export';
import type { SpeciesProjectorAggregateV2 } from '../../../src/catalog/authored-content-projector-contract-v2';
import { assertedExternalContentKey } from '../../../src/catalog/catalog-key';
import { commitContentImport, planContentImport } from '../../../src/catalog/content-adoption';
import { portableSourceContentImportNode } from '../../../src/catalog/source-content-importer';
import {
  projectAuthoredContentAggregateV1,
  projectSpeciesContentAggregateV2,
} from '../../../src/catalog/stored-authored-content-projector-v1';
import {
  canonicalContentIdentityJson,
  CONTENT_FINGERPRINT_SCHEME_V2,
  deriveContentIdentityV2,
} from '../../../src/catalog/content-identity';
import { AllocateAbilitiesCommand } from '../../../src/commands/allocate-abilities';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { DatabaseContext } from '../../../src/db/database';
import type { ContentKey } from '../../../src/domain/ids';
import { StoredCharacterPartyPackExporter } from '../../../src/vtt/stored-character-party-member';
import { expectOkOutcome } from '../../helpers/outcome';
import { openSeededTestDatabase } from '../../helpers/open-seeded-db';
import { portableElfLibraryDocument } from '../../helpers/species-lineage-portability';

/**
 * PC-EXPORT-TRUTH fix 1, owner D923 Q10: "Add typed senses to authoring. The
 * species editor gets a REQUIRED typed senses field. No silent default."
 *
 * An authored species states its standing senses when it is published, and a
 * character built from it reaches combat with exactly those, beside normal
 * sight. A species that does not state them — content published before the
 * field existed — still refuses export instead of guessing normal sight.
 * Every expectation below is the statement the test itself authored.
 */
const opened: Database[] = [];
let sequence = 0;

afterEach(() => {
  for (const connection of opened.splice(0)) connection.close();
});

async function database(): Promise<DatabaseContext> {
  const connection = await openSeededTestDatabase();
  opened.push(connection);
  return new DatabaseContext(connection);
}

function service(db: DatabaseContext): CatalogAuthoringService {
  return new CatalogAuthoringService(db, {
    randomUuid: () => `pcx-senses-${String(++sequence)}`,
    now: () => '2042-06-07T08:09:10.000Z',
  });
}

/** A plain Medium species whose only open question is its senses. */
function speciesDocument(created: StoredHomebrewDraft, name: string, senses: unknown): SpeciesAuthoringDraft {
  if (created.document.kind !== 'species') throw new Error('Fixture draft is not species.');
  // `undefined` builds the draft shape from before the field existed: the
  // created draft's own `senses` key is removed, not merely left unset.
  const { senses: _created, ...before } = created.document as unknown as Readonly<Record<string, unknown>>;
  return {
    ...before,
    name,
    rules_edition: 'expanded',
    reference_text: `${name}, authored for PC-EXPORT-TRUTH.`,
    creature_type: 'Humanoid',
    primary_size: 'Medium',
    alternate_size: null,
    walking_speed_feet: 30,
    traits: [],
    grants: [],
    ...(senses === undefined ? {} : { senses }),
  } as unknown as SpeciesAuthoringDraft;
}

/** A thrown refusal is folded into a value, so a red run fails on an assertion. */
function attempt<T>(operation: () => T): { readonly ok: T } | { readonly threw: string; readonly data: unknown } {
  try {
    return { ok: operation() };
  } catch (error: unknown) {
    return {
      threw: error instanceof Error ? error.message : String(error),
      data: error instanceof Error ? Reflect.get(error, 'data') : undefined,
    };
  }
}

function publish(db: DatabaseContext, name: string, senses: unknown) {
  const authoring = service(db);
  return attempt(() => {
    const created = authoring.createDraft({ content_kind: 'species' });
    const saved = authoring.saveDraft({
      draft_uuid: created.draft_uuid,
      expected_revision: created.revision,
      document: speciesDocument(created, name, senses),
    });
    const preview = authoring.previewPublish({
      draft_uuid: saved.draft_uuid,
      expected_revision: saved.revision,
    });
    return authoring.commitPublish({ token: preview.token, decisions: [] });
  });
}

const integrity = new CharacterCommandIntegrity('pcx-authored-senses');

function fighterOf(db: DatabaseContext, name: string, speciesKey: ContentKey): number {
  const fighter = listGuidedClassOptions(db).find((option) => option.name === 'Fighter');
  if (fighter === undefined) throw new Error('The bundled Fighter is missing.');
  const characterId = createGuidedCharacter(db, { name, class_content_key: fighter.content_key }, integrity).id;
  expectOkOutcome(new AllocateAbilitiesCommand(db, {
    type: 'allocate_abilities',
    method: 'standard_array',
    scores: { strength: 15, dexterity: 13, constitution: 12, intelligence: 10, wisdom: 14, charisma: 8 },
  }).apply(characterId));
  applyGuidedOrigin(db, { character_id: characterId, kind: 'species', content_key: speciesKey });
  return characterId;
}

function exportedSenses(db: DatabaseContext, characterId: number) {
  const result = new StoredCharacterPartyPackExporter(db).export(characterId);
  return result.status === 'exported'
    ? { senses: result.member.senses, senseFeatures: result.member.senseFeatures }
    : result;
}

describe('an authored species states its senses (owner D923 Q10)', () => {
  it('senses_required_at_publish: an unstated, incomplete or repeated sense statement does not publish', async () => {
    const db = await database();
    const issues = (outcome: ReturnType<typeof publish>) =>
      'threw' in outcome && typeof outcome.data === 'object' && outcome.data !== null
        ? (Reflect.get(outcome.data, 'issues') as readonly { path: unknown; code: unknown }[] | undefined)
          ?.map(({ path, code }) => ({ path, code }))
        : outcome;
    // The draft shape from before the field: it is not even saved — the draft
    // codec refuses the missing key — so it can never publish silently.
    expect(issues(publish(db, 'Silent Folk', undefined))).toEqual([{ path: ['senses'], code: 'invalid_type' }]);
    expect(issues(publish(db, 'Unstated Folk', null))).toEqual([{ path: ['senses'], code: 'required' }]);
    expect(issues(publish(db, 'Half Stated Folk', [
      { draft_item_uuid: 'sense-a', kind: 'darkvision', range_feet: null },
      { draft_item_uuid: 'sense-b', kind: null, range_feet: 30 },
    ]))).toEqual([
      { path: ['senses', 0, 'range_feet'], code: 'required' },
      { path: ['senses', 1, 'kind'], code: 'required' },
    ]);
    expect(issues(publish(db, 'Twice Stated Folk', [
      { draft_item_uuid: 'sense-a', kind: 'darkvision', range_feet: 60 },
      { draft_item_uuid: 'sense-b', kind: 'darkvision', range_feet: 120 },
    ]))).toEqual([{ path: ['senses', 1, 'kind'], code: 'duplicate' }]);
  });

  it('authored_senses_exported: a character reaches combat with the senses its species states', async () => {
    const db = await database();
    const deep = publish(db, 'Deep Folk', [
      { draft_item_uuid: 'deep-darkvision', kind: 'darkvision', range_feet: 90 },
      { draft_item_uuid: 'deep-tremorsense', kind: 'tremorsense', range_feet: 15 },
    ]);
    const plain = publish(db, 'Plain Folk', []);
    expect(deep).toMatchObject({ ok: { outcome: 'created' } });
    expect(plain).toMatchObject({ ok: { outcome: 'created' } });
    if (!('ok' in deep) || !('ok' in plain)) throw new Error('Publishing failed.');

    expect(exportedSenses(db, fighterOf(db, 'Deep Fighter', deep.ok.content_key))).toEqual({
      senses: [
        { kind: 'normal_sight' },
        { kind: 'darkvision', rangeFeet: 90 },
        { kind: 'tremorsense', rangeFeet: 15 },
      ],
      senseFeatures: [],
    });
    // Stated as "normal sight only": an explicit empty statement, not an absence.
    expect(exportedSenses(db, fighterOf(db, 'Plain Fighter', plain.ok.content_key))).toEqual({
      senses: [{ kind: 'normal_sight' }],
      senseFeatures: [],
    });
  });

  it('authored_senses_travel: the stated senses survive a character backup into another library', async () => {
    const source = await database();
    const deep = publish(source, 'Travelling Folk', [
      { draft_item_uuid: 'travel-blindsight', kind: 'blindsight', range_feet: 10 },
    ]);
    expect(deep).toMatchObject({ ok: { outcome: 'created' } });
    if (!('ok' in deep)) throw new Error(`Publishing failed: ${deep.threw}`);
    const characterId = fighterOf(source, 'Travelling Fighter', deep.ok.content_key);
    const exported = attempt(() => exportCharacterBackup(source, characterId, '2042-06-08T00:00:00.000Z'));
    expect(exported).toMatchObject({ ok: { source_character_id: characterId } });
    if (!('ok' in exported)) throw new Error(`The backup did not export: ${exported.threw}`);
    const document = exported.ok;
    // The file itself carries the statement, in its portable wire form.
    const carried = document.content.filter((entry) =>
      entry.kind === 'species' && Reflect.get(entry.aggregate, 'name') === 'Travelling Folk');
    expect(carried.map((entry) => Reflect.get(entry.aggregate, 'senses'))).toEqual([
      [{ kind: 'blindsight', range_feet: 10 }],
    ]);
    const target = await database();
    const imported = attempt(() => {
      const plan = planCharacterBackupImport(target, document);
      return commitCharacterBackupImport(target, document, plan.token, {});
    });
    expect(imported).toMatchObject({ ok: { kind: 'committed' } });
    if (!('ok' in imported) || imported.ok.kind !== 'committed') throw new Error('The backup did not import.');
    const committed = imported.ok;
    expect(exportedSenses(target, committed.result.characterId)).toEqual({
      senses: [{ kind: 'normal_sight' }, { kind: 'blindsight', rangeFeet: 10 }],
      senseFeatures: [],
    });
  });

  it('stated_senses_travel_v2: a lineage species (fingerprint scheme v2) keeps its stated senses through a character backup', async () => {
    // Fix 2 (codex r2 P2): the scheme-v2 half of the travel path —
    // insertSpeciesV2 writes the statement, readSpeciesV2 reads it back — had
    // no witness; a species with lineage source rules travels through it. The
    // fixture is the portable configured-choice Elf, stating one sense.
    const source = await database();
    const library = portableElfLibraryDocument(source);
    const [entry] = library.content;
    if (entry === undefined) throw new Error('The portable Elf library is empty.');
    const aggregate = {
      ...structuredClone(entry.aggregate as SpeciesProjectorAggregateV2),
      senses: [{ kind: 'darkvision', range_feet: 120 }],
    } as SpeciesProjectorAggregateV2;
    const identity = deriveContentIdentityV2({
      kind: 'species',
      edition: aggregate.rules_edition,
      name: aggregate.name,
      payload: projectSpeciesContentAggregateV2(aggregate).payload,
    });
    const stated = attempt(() => importLibraryDocument(source, {
      ...library,
      content: [{ ...entry, aggregate, fingerprint_digest: identity.digest }],
    }));
    expect('threw' in stated ? stated.threw : 'imported').toBe('imported');
    const carriedBy = (content: readonly { readonly kind: string; readonly fingerprint_scheme: string; readonly aggregate: object }[]) =>
      content
        .filter((item) => item.kind === 'species' && Reflect.get(item.aggregate, 'name') === aggregate.name)
        .map((item) => [item.fingerprint_scheme, Reflect.get(item.aggregate, 'senses')]);

    const characterId = fighterOf(source, 'Travelling Elf', entry.content_key as ContentKey);
    const exported = attempt(() => exportCharacterBackup(source, characterId, '2042-06-08T00:00:00.000Z'));
    // Fix 3 (codex r3 P2): a refused export or read-back is folded into the
    // compared value, so it fails the sense assertion itself rather than a
    // thrown error before it — on the source side and at the destination.
    expect('ok' in exported ? carriedBy(exported.ok.content) : exported).toEqual([
      [CONTENT_FINGERPRINT_SCHEME_V2, [{ kind: 'darkvision', range_feet: 120 }]],
    ]);
    if (!('ok' in exported)) throw new Error(`The backup did not export: ${exported.threw}`);

    const target = await database();
    const imported = attempt(() => {
      const plan = planCharacterBackupImport(target, exported.ok);
      return commitCharacterBackupImport(target, exported.ok, plan.token, {});
    });
    expect(imported).toMatchObject({ ok: { kind: 'committed' } });
    // What the other library now stores, read back through its own export. A
    // stored statement that no longer matches the species' own fingerprint is
    // refused by that export, and the refusal is what this assertion receives.
    const destination = attempt(() => carriedBy(exportWholeLibrary(target, '2042-06-09T00:00:00.000Z').content));
    expect(destination).toEqual({
      ok: [[CONTENT_FINGERPRINT_SCHEME_V2, [{ kind: 'darkvision', range_feet: 120 }]]],
    });
  });

  it('stated_senses_are_identity: normal sight only, a stated sense and unstated content are three identities', async () => {
    const db = await database();
    const authoring = service(db);
    const payload = (senses: unknown) => {
      const created = authoring.createDraft({ content_kind: 'species' });
      const saved = authoring.saveDraft({
        draft_uuid: created.draft_uuid,
        expected_revision: created.revision,
        document: speciesDocument(created, 'Identity Folk', senses),
      });
      const preview = authoring.previewPublish({ draft_uuid: saved.draft_uuid, expected_revision: saved.revision });
      return (JSON.parse(preview.facts.canonical_json) as { payload: Readonly<Record<string, unknown>> }).payload;
    };
    expect(payload([]).senses).toEqual([]);
    expect(payload([{ draft_item_uuid: 'identity-dark', kind: 'darkvision', range_feet: 60 }]).senses)
      .toEqual([{ kind: 'darkvision', range_feet: 60 }]);
    // A set: the order an author listed senses in is not a fact about the species.
    expect(payload([
      { draft_item_uuid: 'identity-a', kind: 'darkvision', range_feet: 60 },
      { draft_item_uuid: 'identity-b', kind: 'blindsight', range_feet: 10 },
    ])).toEqual(payload([
      { draft_item_uuid: 'identity-c', kind: 'blindsight', range_feet: 10 },
      { draft_item_uuid: 'identity-d', kind: 'darkvision', range_feet: 60 },
    ]));
    // Content that states nothing has NO key, so every fingerprint minted
    // before the field (bundled SRD species included) keeps its bytes, and
    // "unstated" can never collide with "normal sight only".
    const unstated = projectAuthoredContentAggregateV1({
      kind: 'species',
      name: 'Identity Folk',
      rules_edition: 'expanded',
      reference_text: 'Identity Folk, authored for PC-EXPORT-TRUTH.',
      repeatable: false,
      creature_type: 'Humanoid',
      primary_size: 'Medium',
      alternate_size: null,
      walking_speed_feet: 30,
      traits: [],
      grants: [],
    } as unknown as SpeciesContentAggregate).payload;
    const unstatedPayload = JSON.parse(canonicalContentIdentityJson(unstated)) as Readonly<Record<string, unknown>>;
    expect(Object.hasOwn(unstatedPayload, 'senses')).toBe(false);
    // Everything else is the same species: only the statement tells them apart.
    const { senses: stated, ...rest } = payload([]);
    expect(stated).toEqual([]);
    expect(rest).toEqual(unstatedPayload);
  });

  it('unstated_species_refused: content that predates stated senses still refuses export, naming the remedy', async () => {
    const db = await database();
    // A portable species aggregate written before the field existed: every
    // key it had then, and no `senses`. It still imports (no data is lost).
    const key = assertedExternalContentKey('species', 'expanded', 'Older Folk');
    const older = {
      kind: 'species',
      name: 'Older Folk',
      rules_edition: 'expanded',
      reference_text: 'Published before species stated senses.',
      repeatable: false,
      creature_type: 'Humanoid',
      primary_size: 'Medium',
      alternate_size: null,
      walking_speed_feet: 30,
      traits: [],
      grants: [],
    } as unknown as SpeciesContentAggregate;
    const node = portableSourceContentImportNode(db, older, key);
    const plan = planContentImport(db, [node]);
    expect(commitContentImport(db, { nodes: [node], token: plan.token }).kind).toBe('committed');

    expect(exportedSenses(db, fighterOf(db, 'Older Fighter', key))).toEqual({
      status: 'refused',
      refusal: {
        kind: 'stored_character_party_pack_refusal',
        field: 'senses.species',
        detail: 'Older Folk does not state its senses: open it in the species editor, state them and publish it again.',
      },
    });
  });
});
