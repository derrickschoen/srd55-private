import { describe, expect, it } from 'vitest';
import type {
  BackgroundAuthoringDraft,
  HomebrewDraft,
  SpeciesAuthoringDraft,
  SubclassAuthoringDraft,
} from '../../../src/authoring/contracts';
import {
  decodeStoredDraft,
  DRAFT_DOCUMENT_VERSION_REGISTRIES,
  DraftCodecError,
  encodeCurrentDraft,
} from '../../../src/authoring/draft-codecs';
import type { HomebrewDraftItemUuid } from '../../../src/authoring/ids';

const item = (value: string) => value as HomebrewDraftItemUuid;

const speciesDraft = (): SpeciesAuthoringDraft => ({
  kind: 'species',
  document_version: 1,
  name: '',
  rules_edition: null,
  reference_text: '',
  creature_type: '',
  primary_size: '',
  alternate_size: null,
  walking_speed_feet: null,
  traits: [],
  grants: [],
});

const backgroundDraft = (): BackgroundAuthoringDraft => ({
  kind: 'background',
  document_version: 1,
  name: '',
  rules_edition: null,
  reference_text: '',
  suggested_abilities: [],
  default_origin_feat_content_key: null,
  default_origin_feat_display_name: null,
  skill_proficiencies: [],
  tool_reference_text: null,
  equipment_option_a_description: '',
  equipment_option_b_description: '',
  equipment_option_a: [],
  equipment_option_b: [],
  effects: [],
});

const subclassDraft = (): SubclassAuthoringDraft => ({
  kind: 'subclass',
  document_version: 1,
  name: '',
  rules_edition: null,
  reference_text: '',
  parent_class_content_key: null,
  progression: { mode: 'inherit_parent' },
  features: [],
});

function codecError(operation: () => unknown): DraftCodecError {
  try {
    operation();
  } catch (error) {
    expect(error).toBeInstanceOf(DraftCodecError);
    return error as DraftCodecError;
  }
  throw new Error('Expected DraftCodecError.');
}

describe('per-kind durable draft codecs', () => {
  it('starts the three independent append-only registries at v1 with no class seam', () => {
    expect(Object.keys(DRAFT_DOCUMENT_VERSION_REGISTRIES).sort()).toEqual([
      'background',
      'species',
      'subclass',
    ]);
    for (const registry of Object.values(DRAFT_DOCUMENT_VERSION_REGISTRIES)) {
      expect(registry.currentVersion).toBe(1);
      expect([...registry.codecs.keys()]).toEqual([1]);
      expect([...registry.migrations.keys()]).toEqual([]);
    }
  });

  it.each<HomebrewDraft>([
    speciesDraft(),
    backgroundDraft(),
    subclassDraft(),
  ])('round-trips an incomplete $kind v1 document without filling missing semantics', (draft) => {
    const encoded = encodeCurrentDraft(draft.kind, draft);
    expect(encoded.version).toBe(1);
    expect(JSON.parse(encoded.json)).toEqual(draft);
    expect(decodeStoredDraft(draft.kind, encoded.version, encoded.json)).toEqual({
      status: 'ready',
      stored_version: 1,
      current_version: 1,
      migrated: false,
      document: draft,
    });
  });

  it('refuses unknown root and nested fields with exact structured paths', () => {
    const root = { ...speciesDraft(), future_field: true };
    expect(codecError(() => encodeCurrentDraft('species', root)).issues).toContainEqual({
      path: ['future_field'],
      code: 'unknown_field',
      message: 'Unknown field "future_field".',
    });

    const nested = {
      ...subclassDraft(),
      progression: { mode: 'inherit_parent', guessed_rows: [] },
    };
    expect(codecError(() => encodeCurrentDraft('subclass', nested)).issues).toContainEqual({
      path: ['progression', 'guessed_rows'],
      code: 'unknown_field',
      message: 'Unknown field "guessed_rows".',
    });
  });

  it('refuses class documents even when sent through a supported-kind codec', () => {
    const classShaped = { ...speciesDraft(), kind: 'class' };
    expect(codecError(() => encodeCurrentDraft('species', classShaped)).issues)
      .toContainEqual(expect.objectContaining({ path: ['kind'] }));
  });

  it('requires draft item UUIDs to be unique across the whole document', () => {
    const duplicate = item('duplicate-item');
    const draft: SpeciesAuthoringDraft = {
      ...speciesDraft(),
      traits: [{
        draft_item_uuid: duplicate,
        name: '',
        description: '',
        effects: [{
          kind: 'damage_resistance',
          draft_item_uuid: duplicate,
          label: '',
          notes: null,
          damage_type: null,
        }],
      }],
    };
    expect(codecError(() => encodeCurrentDraft('species', draft)).issues)
      .toContainEqual(expect.objectContaining({
        path: ['traits', 0, 'effects', 0, 'draft_item_uuid'],
        code: 'duplicate',
      }));
  });

  it('enforces the aggregate effect cap across otherwise-valid owner arrays', () => {
    let sequence = 0;
    const traits = [100, 100, 2].map((count, traitIndex) => ({
      draft_item_uuid: item(`trait-${String(traitIndex)}`),
      name: '',
      description: '',
      effects: Array.from({ length: count }, () => ({
        kind: 'damage_resistance' as const,
        draft_item_uuid: item(`effect-${String(sequence++)}`),
        label: '',
        notes: null,
        damage_type: null,
      })),
    }));
    expect(codecError(() => encodeCurrentDraft('species', {
      ...speciesDraft(),
      traits,
    })).issues).toContainEqual(expect.objectContaining({
      path: [],
      code: 'too_many_items',
    }));
  });

  it('returns unknown-future bytes exactly and never attempts to parse them', () => {
    const exactBytes = '{"kind":"species","document_version":2,"future":true}\n';
    expect(decodeStoredDraft('species', 2, exactBytes)).toEqual({
      status: 'upgrade_required',
      stored_version: 2,
      latest_supported_version: 1,
      recovery_json: exactBytes,
    });
    expect(decodeStoredDraft('background', 99, '{future-json')).toEqual({
      status: 'upgrade_required',
      stored_version: 99,
      latest_supported_version: 1,
      recovery_json: '{future-json',
    });
  });
});
