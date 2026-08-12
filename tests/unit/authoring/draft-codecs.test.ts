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

  it('round-trips the optional list-choice minimum without filling it into older drafts', () => {
    const oldGrant = {
      kind: 'choice_from_list' as const,
      draft_item_uuid: item('list-old'),
      rule_key: 'list-old',
      list: 'Wizard',
      count: 1,
      maximum_spell_level: 1,
    };
    const currentGrant = {
      ...oldGrant,
      draft_item_uuid: item('list-current'),
      rule_key: 'list-current',
      minimum_spell_level: 1,
    };
    const draft = { ...speciesDraft(), grants: [oldGrant, currentGrant] };
    const encoded = encodeCurrentDraft('species', draft);

    expect(JSON.parse(encoded.json)).toEqual(draft);
    expect(decodeStoredDraft('species', encoded.version, encoded.json)).toMatchObject({
      status: 'ready',
      document: draft,
    });
    expect(Object.hasOwn(draft.grants[0]!, 'minimum_spell_level')).toBe(false);
    expect(draft.grants[1]).toMatchObject({ minimum_spell_level: 1 });
  });

  it('round-trips the scaling-feature editor subset and rejects nested extra keys', () => {
    const draft: SubclassAuthoringDraft = {
      ...subclassDraft(),
      features: [{
        draft_item_uuid: item('feature'),
        class_level: 3,
        name: 'Scaling feature',
        description: 'Scales.',
        effects: [],
        contributions: [{
          kind: 'feature_value_contribution',
          draft_item_uuid: item('contribution'),
          contribution_key: 'scaled-dice',
          label: 'Scaled dice',
          target: { kind: 'feature_dice_count', key: 'sneak_attack' },
          op: 'add',
          active_from_level: 3,
          active_to_level: 20,
          value: {
            kind: 'breakpoint_table',
            rows: [{
              draft_item_uuid: item('breakpoint'),
              from: 3,
              to: 20,
              amount: 1,
            }],
          },
          supersedes_contribution_key: null,
        }],
      }],
    };
    expect(decodeStoredDraft(
      'subclass',
      1,
      encodeCurrentDraft('subclass', draft).json,
    )).toMatchObject({ status: 'ready', document: draft });

    const hostile = JSON.parse(JSON.stringify(draft)) as Record<string, unknown>;
    const features = hostile.features as Array<Record<string, unknown>>;
    const contributions = features[0]!.contributions as Array<Record<string, unknown>>;
    const value = contributions[0]!.value as Record<string, unknown>;
    value.future_expression_field = true;
    const error = codecError(() => decodeStoredDraft(
      'subclass',
      1,
      JSON.stringify(hostile),
    ));
    expect(error.issues).toContainEqual(expect.objectContaining({
      path: ['features', 0, 'contributions', 0, 'value', 'future_expression_field'],
      code: 'unknown_field',
    }));
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

    const nestedGrant = {
      ...speciesDraft(),
      grants: [{
        kind: 'choice_from_list',
        draft_item_uuid: item('list-unknown'),
        rule_key: 'list-unknown',
        list: 'Wizard',
        count: 1,
        minimum_spell_level: 1,
        maximum_spell_level: 2,
        future_list_field: true,
      }],
    };
    expect(codecError(() => encodeCurrentDraft('species', nestedGrant)).issues)
      .toContainEqual({
        path: ['grants', 0, 'future_list_field'],
        code: 'unknown_field',
        message: 'Unknown field "future_list_field".',
      });
  });

  it('refuses class documents even when sent through a supported-kind codec', () => {
    const classShaped = { ...speciesDraft(), kind: 'class' };
    expect(codecError(() => encodeCurrentDraft('species', classShaped)).issues)
      .toContainEqual(expect.objectContaining({ path: ['kind'] }));
  });

  it('uses one human vocabulary for text and numeric refusals across all draft kinds', () => {
    const longName = '🐉'.repeat(121);
    for (const draft of [speciesDraft(), backgroundDraft(), subclassDraft()] as const) {
      const issue = codecError(() => encodeCurrentDraft(draft.kind, {
        ...draft,
        name: longName,
      })).issues[0];
      expect(issue).toEqual({
        path: ['name'],
        code: 'too_long',
        message: 'Name must be 120 characters or fewer.',
      });
    }

    expect(codecError(() => encodeCurrentDraft('species', {
      ...speciesDraft(),
      walking_speed_feet: -99,
    })).issues).toContainEqual({
      path: ['walking_speed_feet'],
      code: 'out_of_range',
      message: 'Walking speed must be at least 1 foot.',
    });
  });

  it('never exposes validation-library vocabulary for text, lists, numbers, or types', () => {
    const cases: readonly {
      readonly kind: HomebrewDraft['kind'];
      readonly document: unknown;
    }[] = [
      {
        kind: 'species',
        document: {
          ...speciesDraft(),
          name: '🐉'.repeat(121),
          walking_speed_feet: -99,
          traits: Array.from({ length: 101 }, (_unused, index) => ({
            draft_item_uuid: item(`trait-${String(index)}`),
            name: '',
            description: '',
            effects: [],
          })),
          grants: [{
            kind: 'fixed_spell',
            draft_item_uuid: item('long-spell-key'),
            rule_key: 'long-spell-key',
            spell_content_key: 'x'.repeat(201),
            always_prepared: false,
          }],
        },
      },
      {
        kind: 'background',
        document: {
          ...backgroundDraft(),
          rules_edition: 'tomorrow',
          suggested_abilities: ['strength', 'dexterity', 'constitution', 'wisdom'],
          equipment_option_a: [{
            kind: 'gear',
            draft_item_uuid: item('gear-one'),
            quantity: 0,
            printed_name: 'x'.repeat(121),
          }],
        },
      },
      {
        kind: 'subclass',
        document: {
          ...subclassDraft(),
          progression: {
            mode: 'override',
            spellcasting_ability: null,
            caster_contribution: 'full',
            rows: [{
              class_level: 1,
              cantrips_known: 0,
              prepared_or_known_count: 0,
              maximum_spell_level: 0,
              slot_counts: [-1],
              grants: [],
            }],
          },
        },
      },
    ];

    const messages = cases.flatMap(({ kind, document }) =>
      codecError(() => encodeCurrentDraft(kind, document)).issues.map((issue) => issue.message));
    expect(messages.length).toBeGreaterThanOrEqual(7);
    for (const message of messages) {
      expect(message).not.toMatch(/code points|too small|too big|expected (?:number|string|array)|invalid input/iu);
    }
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
