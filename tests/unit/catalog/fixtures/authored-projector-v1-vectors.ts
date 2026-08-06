import type {
  BackgroundContentAggregate,
  DenseSubclassContentProgression,
  SpeciesContentAggregate,
  SubclassContentAggregate,
} from '../../../../src/authoring/contracts';
import type {
  BackgroundProjectorPayloadV1,
  SpeciesProjectorPayloadV1,
  SubclassProjectorPayloadV1,
} from '../../../../src/catalog/authored-content-projector-contract-v1';
import {
  canonicalOpenPassthroughValue,
  canonicalRuleText,
  CONTENT_FINGERPRINT_SCHEME_V1,
  contentIdentitySequence,
  contentIdentitySet,
  type ContentFingerprintDigest,
} from '../../../../src/catalog/content-identity';
import {
  creatureSize,
  creatureType,
  damageType,
} from '../../../../src/domain/enums';
import type { ContentKey } from '../../../../src/domain/ids';

const digest = (digit: string) =>
  digit.repeat(64) as ContentFingerprintDigest;

const spellReference = {
  kind: 'spell',
  scheme: CONTENT_FINGERPRINT_SCHEME_V1,
  digest: digest('1'),
} as const;
const featReference = {
  kind: 'feat',
  scheme: CONTENT_FINGERPRINT_SCHEME_V1,
  digest: digest('2'),
} as const;
const classReference = {
  kind: 'class',
  scheme: CONTENT_FINGERPRINT_SCHEME_V1,
  digest: digest('3'),
} as const;
const weaponReference = {
  kind: 'weapon',
  scheme: CONTENT_FINGERPRINT_SCHEME_V1,
  digest: digest('4'),
} as const;
const armorReference = {
  kind: 'armor',
  scheme: CONTENT_FINGERPRINT_SCHEME_V1,
  digest: digest('5'),
} as const;

export interface AuthoredProjectorVectorV1<K extends 'species' | 'background' | 'subclass', A, P> {
  readonly label: string;
  readonly kind: K;
  readonly aggregate: A;
  readonly payload: P;
  readonly canonicalJson: string;
  readonly sha256: string;
  readonly derivedKey: string;
}

const speciesAggregate: SpeciesContentAggregate = {
  kind: 'species',
  name: 'Void Walker',
  rules_edition: 'expanded',
  reference_text: 'Exact reference.\r\n',
  repeatable: false,
  creature_type: creatureType('Clockwork  Humanoid'),
  primary_size: 'Large',
  alternate_size: creatureSize('Sma\u0301ll'),
  walking_speed_feet: 35,
  grants: [{
    kind: 'fixed_spell',
    rule_key: 'void.spark',
    count: 1,
    spell: spellReference,
    bucket: 'prepared',
    always_prepared: true,
    with_slots: true,
    free_cast: {
      uses: 1,
      recovery: 'long_rest',
      pool_scope: 'per_spell',
    },
    active_from_class_level: 3,
    active_if_config: { key: 'lineage', equals: 'Void' },
    distinct_config_by: null,
    counts_against_limit: false,
    label: 'Void Spark',
  }],
  traits: [{
    sort_order: 1,
    name: 'Void Ward',
    description: 'Holds.  \r\n',
    effects: [{
      kind: 'damage_resistance',
      sort_order: 1,
      label: 'Void Ward',
      notes: null,
      damage_type: damageType('Void  Fire'),
    }],
  }],
};

const speciesPayload: SpeciesProjectorPayloadV1 = {
  reference_text: canonicalRuleText('Exact reference.\r\n'),
  repeatable: false,
  grants: contentIdentitySequence([{
    kind: 'fixed_spell',
    rule_key: 'void.spark',
    count: 1,
    spell: spellReference,
    bucket: 'prepared',
    always_prepared: true,
    with_slots: true,
    free_cast: {
      uses: 1,
      recovery: 'long_rest',
      pool_scope: 'per_spell',
    },
    active_from_class_level: 3,
    active_if_config: { key: 'lineage', equals: 'Void' },
    distinct_config_by: null,
    counts_against_limit: false,
    label: canonicalRuleText('Void Spark'),
  }]),
  creature_type: canonicalOpenPassthroughValue('Clockwork  Humanoid'),
  primary_size: canonicalOpenPassthroughValue('Large'),
  alternate_size: canonicalOpenPassthroughValue('Sma\u0301ll'),
  walking_speed_feet: 35,
  traits: contentIdentitySequence([{
    name: 'Void Ward',
    description: canonicalRuleText('Holds.  \r\n'),
    effects: contentIdentitySequence([{
      kind: 'damage_resistance',
      label: 'Void Ward',
      notes: null,
      damage_type: canonicalOpenPassthroughValue('Void  Fire'),
    }]),
  }]),
};

const backgroundAggregate: BackgroundContentAggregate = {
  kind: 'background',
  name: 'Void Scholar',
  rules_edition: 'expanded',
  reference_text: 'Studies the gap.',
  repeatable: false,
  grants: [{
    kind: 'grant_source',
    rule_key: 'void-scholar-origin-feat',
    count: 1,
    source_type: 'feat',
    definition_key_config: 'origin_feat_key',
    child_config_config: 'origin_feat_config',
    active_from_class_level: null,
    active_if_config: null,
    distinct_config_by: null,
    always_prepared: false,
    with_slots: true,
    free_cast: null,
  }],
  suggested_abilities: ['intelligence', 'wisdom', 'charisma'],
  default_origin_feat_content_key: 'expanded:feat:void-adept' as ContentKey,
  default_origin_feat: featReference,
  skill_proficiencies: ['arcana', 'insight'],
  tool_reference_text: 'Astrolabe only; no structured tool grant.',
  equipment_option_a_description: 'An astrolabe.',
  equipment_option_b_description: 'Nothing.',
  equipment_option_a: [
    {
      kind: 'gear',
      sort_order: 1,
      quantity: 1,
      printed_name: 'Astrolabe',
    },
    {
      kind: 'weapon',
      sort_order: 2,
      quantity: 1,
      printed_name: 'Void Blade',
      content: weaponReference,
    },
  ],
  equipment_option_b: [{
    kind: 'armor',
    sort_order: 1,
    quantity: 1,
    printed_name: 'Clockwork Mail',
    content: armorReference,
  }],
  effects: [{
    kind: 'damage_resistance',
    sort_order: 1,
    label: 'Lowercase void ward',
    notes: null,
    damage_type: damageType('void'),
  }],
};

const backgroundPayload: BackgroundProjectorPayloadV1 = {
  reference_text: canonicalRuleText('Studies the gap.'),
  repeatable: false,
  grants: contentIdentitySequence([{
    kind: 'grant_source',
    rule_key: 'void-scholar-origin-feat',
    count: 1,
    source_type: 'feat',
    definition_key_config: 'origin_feat_key',
    child_config_config: 'origin_feat_config',
    active_from_class_level: null,
    active_if_config: null,
    distinct_config_by: null,
    always_prepared: false,
    with_slots: true,
    free_cast: null,
  }]),
  suggested_abilities: ['intelligence', 'wisdom', 'charisma'],
  default_origin_feat: featReference,
  skill_proficiencies: ['arcana', 'insight'],
  tool_reference_text: canonicalRuleText(
    'Astrolabe only; no structured tool grant.',
  ),
  equipment_option_a_description: canonicalRuleText('An astrolabe.'),
  equipment_option_b_description: canonicalRuleText('Nothing.'),
  equipment_option_a: contentIdentitySequence([
    {
      kind: 'gear',
      quantity: 1,
      printed_name: 'Astrolabe',
    },
    {
      kind: 'weapon',
      quantity: 1,
      printed_name: 'Void Blade',
      content: weaponReference,
    },
  ]),
  equipment_option_b: contentIdentitySequence([{
    kind: 'armor',
    quantity: 1,
    printed_name: 'Clockwork Mail',
    content: armorReference,
  }]),
  effects: contentIdentitySequence([{
    kind: 'damage_resistance',
    label: 'Lowercase void ward',
    notes: null,
    damage_type: canonicalOpenPassthroughValue('void'),
  }]),
};

const inheritSubclassAggregate: SubclassContentAggregate = {
  kind: 'subclass',
  name: 'Echo Knight',
  rules_edition: 'expanded',
  reference_text: 'Two thresholds share a printed name.',
  parent_class: classReference,
  grants: [],
  progression: { mode: 'inherit_parent' },
  features: [
    {
      class_level: 3,
      sort_order: 1,
      name: 'Echo',
      description: 'First echo.',
      effects: [{
        kind: 'damage_resistance',
        sort_order: 1,
        label: 'Void ward',
        notes: null,
        damage_type: damageType('Void'),
      }],
    },
    {
      class_level: 7,
      sort_order: 2,
      name: 'Echo',
      description: 'Second echo.',
      effects: [{
        kind: 'extra_attack',
        sort_order: 1,
        label: 'Echo attack',
        notes: null,
        attack_count: 2,
        weapon_scope: 'any_weapon',
      }],
    },
  ],
};

const inheritSubclassPayload: SubclassProjectorPayloadV1 = {
  reference_text: canonicalRuleText('Two thresholds share a printed name.'),
  parent_class: classReference,
  grants: contentIdentitySequence([]),
  progression: { mode: 'inherit_parent' },
  features: contentIdentitySequence([
    {
      class_level: 3,
      name: 'Echo',
      description: canonicalRuleText('First echo.'),
      effects: contentIdentitySequence([{
        kind: 'damage_resistance',
        label: 'Void ward',
        notes: null,
        damage_type: canonicalOpenPassthroughValue('Void'),
      }]),
    },
    {
      class_level: 7,
      name: 'Echo',
      description: canonicalRuleText('Second echo.'),
      effects: contentIdentitySequence([{
        kind: 'extra_attack',
        label: 'Echo attack',
        notes: null,
        attack_count: 2,
        weapon_scope: 'any_weapon',
      }]),
    },
  ]),
};

const progressionRow = (class_level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20) => ({
  class_level,
  cantrips_known: 0,
  prepared_or_known_count: 0,
  maximum_spell_level: 0,
  slot_counts: [0, 0, 0, 0, 0, 0, 0, 0, 0] as const,
  grants: [],
});

const denseRows = [
  progressionRow(1), progressionRow(2), progressionRow(3), progressionRow(4),
  progressionRow(5), progressionRow(6), progressionRow(7), progressionRow(8),
  progressionRow(9), progressionRow(10), progressionRow(11), progressionRow(12),
  progressionRow(13), progressionRow(14), progressionRow(15), progressionRow(16),
  progressionRow(17), progressionRow(18), progressionRow(19), progressionRow(20),
] as DenseSubclassContentProgression;

const overrideSubclassAggregate: SubclassContentAggregate = {
  kind: 'subclass',
  name: 'Dense Adept',
  rules_edition: 'expanded',
  reference_text: '',
  parent_class: classReference,
  grants: [],
  progression: {
    mode: 'override',
    spellcasting_ability: null,
    caster_contribution: 'third_down',
    rows: denseRows,
  },
  features: [],
};

const overrideSubclassPayload: SubclassProjectorPayloadV1 = {
  reference_text: canonicalRuleText(''),
  parent_class: classReference,
  grants: contentIdentitySequence([]),
  progression: {
    mode: 'override',
    spellcasting_ability: null,
    caster_contribution: 'third_down',
    rows: contentIdentitySequence(
      denseRows.map((row) => ({
        ...row,
        grants: contentIdentitySequence([]),
      })),
    ),
  },
  features: contentIdentitySequence([]),
};

const grantedSubclassAggregate: SubclassContentAggregate = {
  kind: 'subclass',
  name: 'Rune Warden',
  rules_edition: 'expanded',
  reference_text: 'A definition-level spell grant.',
  parent_class: classReference,
  grants: [{
    kind: 'fixed_spell',
    rule_key: 'subclass.spark',
    count: 1,
    spell: spellReference,
    bucket: 'prepared',
    always_prepared: true,
    with_slots: true,
    free_cast: null,
    active_from_class_level: null,
    active_if_config: null,
    distinct_config_by: null,
    counts_against_limit: true,
    label: null,
  }],
  progression: { mode: 'inherit_parent' },
  features: [],
};

const grantedSubclassPayload: SubclassProjectorPayloadV1 = {
  reference_text: canonicalRuleText('A definition-level spell grant.'),
  parent_class: classReference,
  grants: contentIdentitySequence([{
    kind: 'fixed_spell',
    rule_key: 'subclass.spark',
    count: 1,
    spell: spellReference,
    bucket: 'prepared',
    always_prepared: true,
    with_slots: true,
    free_cast: null,
    active_from_class_level: null,
    active_if_config: null,
    distinct_config_by: null,
    counts_against_limit: true,
    label: null,
  }]),
  progression: { mode: 'inherit_parent' },
  features: contentIdentitySequence([]),
};

const characterEffectNotesSpeciesAggregate: SpeciesContentAggregate = {
  kind: 'species',
  name: 'Note Walker',
  rules_edition: 'expanded',
  reference_text: '',
  repeatable: false,
  creature_type: creatureType('Humanoid'),
  primary_size: creatureSize('Medium'),
  alternate_size: null,
  walking_speed_feet: 30,
  grants: [],
  traits: [{
    sort_order: 1,
    name: 'Noted Ward',
    description: 'Keeps notes.',
    effects: [{
      kind: 'damage_resistance',
      sort_order: 1,
      label: 'Noted ward',
      notes: 'First line\r\nSecond line   \r\n',
      damage_type: damageType('Force'),
    }],
  }],
};

const characterEffectNotesSpeciesPayload: SpeciesProjectorPayloadV1 = {
  reference_text: canonicalRuleText(''),
  repeatable: false,
  grants: contentIdentitySequence([]),
  creature_type: canonicalOpenPassthroughValue('Humanoid'),
  primary_size: canonicalOpenPassthroughValue('Medium'),
  alternate_size: null,
  walking_speed_feet: 30,
  traits: contentIdentitySequence([{
    name: 'Noted Ward',
    description: canonicalRuleText('Keeps notes.'),
    effects: contentIdentitySequence([{
      kind: 'damage_resistance',
      label: 'Noted ward',
      notes: canonicalRuleText('First line\r\nSecond line   \r\n'),
      damage_type: canonicalOpenPassthroughValue('Force'),
    }]),
  }]),
};

const extraAttackNotesSubclassAggregate: SubclassContentAggregate = {
  kind: 'subclass',
  name: 'Note Striker',
  rules_edition: 'expanded',
  reference_text: '',
  parent_class: classReference,
  grants: [],
  progression: { mode: 'inherit_parent' },
  features: [{
    class_level: 5,
    sort_order: 1,
    name: 'Noted Attack',
    description: 'Attacks twice.',
    effects: [{
      kind: 'extra_attack',
      sort_order: 1,
      label: 'Noted attack',
      notes: 'Attack line\r\nSecond attack   \n',
      attack_count: 2,
      weapon_scope: 'any_weapon',
    }],
  }],
};

const extraAttackNotesSubclassPayload: SubclassProjectorPayloadV1 = {
  reference_text: canonicalRuleText(''),
  parent_class: classReference,
  grants: contentIdentitySequence([]),
  progression: { mode: 'inherit_parent' },
  features: contentIdentitySequence([{
    class_level: 5,
    name: 'Noted Attack',
    description: canonicalRuleText('Attacks twice.'),
    effects: contentIdentitySequence([{
      kind: 'extra_attack',
      label: 'Noted attack',
      notes: canonicalRuleText('Attack line\r\nSecond attack   \n'),
      attack_count: 2,
      weapon_scope: 'any_weapon',
    }]),
  }]),
};

/**
 * HAND-WRITTEN BYTE ORACLES. Each canonical literal follows these regions:
 * envelope = edition, kind, normalizedName, payload, scheme (code-point key
 * order); payload = the field inventory in the matching contract; every
 * ordered graph is an array; open values preserve case/internal spaces and
 * apply NFC only. Digests are hashes of these reviewed literals, never output
 * copied from a projector.
 */
export const authoredProjectorV1Vectors = [
  {
    label: 'species keeps exact open creature, size, and damage strings',
    kind: 'species',
    aggregate: speciesAggregate,
    payload: speciesPayload,
    // Envelope follows content-v1's ordered edition/kind/name/payload/scheme
    // fields. Payload follows SpeciesProjectorPayloadV1: NFC composes Smáll;
    // case and the doubled spaces in creature/damage values remain exact;
    // grants, traits, then effects remain declared-order arrays; the fixed
    // spell grant pins its complete fingerprint-reference byte region.
    canonicalJson: '{"edition":"expanded","kind":"species","normalizedName":"voidwalker","payload":{"alternate_size":"Smáll","creature_type":"Clockwork  Humanoid","grants":[{"active_from_class_level":3,"active_if_config":{"equals":"Void","key":"lineage"},"always_prepared":true,"bucket":"prepared","count":1,"counts_against_limit":false,"distinct_config_by":null,"free_cast":{"pool_scope":"per_spell","recovery":"long_rest","uses":1},"kind":"fixed_spell","label":"Void Spark","rule_key":"void.spark","spell":{"digest":"1111111111111111111111111111111111111111111111111111111111111111","kind":"spell","scheme":"content-v1"},"with_slots":true}],"primary_size":"Large","reference_text":"Exact reference.","repeatable":false,"traits":[{"description":"Holds.","effects":[{"damage_type":"Void  Fire","kind":"damage_resistance","label":"Void Ward","notes":null}],"name":"Void Ward"}],"walking_speed_feet":35},"scheme":"content-v1"}',
    sha256: 'e7c9c480129d6d8e8889dac55e48dc9f5ed720057d14e3999e78c4d08d26427e',
    derivedKey: 'expanded:content.v1:e7c9c480129d6d8e8889dac55e48dc9f5ed720057d14e3999e78c4d08d26427e',
  },
  {
    label: 'background keeps lowercase passthrough distinct',
    kind: 'background',
    aggregate: backgroundAggregate,
    payload: backgroundPayload,
    // Envelope is the same ordered content-v1 region. Background payload is
    // the contract's feat reference, ordered effects/equipment, normalized
    // rule text, skills/abilities, and tool text. Equipment array position
    // carries order and sort_order is absent; lowercase `void` is unchanged,
    // proving passthrough values are not case-folded.
    canonicalJson: '{"edition":"expanded","kind":"background","normalizedName":"voidscholar","payload":{"default_origin_feat":{"digest":"2222222222222222222222222222222222222222222222222222222222222222","kind":"feat","scheme":"content-v1"},"effects":[{"damage_type":"void","kind":"damage_resistance","label":"Lowercase void ward","notes":null}],"equipment_option_a":[{"kind":"gear","printed_name":"Astrolabe","quantity":1},{"content":{"digest":"4444444444444444444444444444444444444444444444444444444444444444","kind":"weapon","scheme":"content-v1"},"kind":"weapon","printed_name":"Void Blade","quantity":1}],"equipment_option_a_description":"An astrolabe.","equipment_option_b":[{"content":{"digest":"5555555555555555555555555555555555555555555555555555555555555555","kind":"armor","scheme":"content-v1"},"kind":"armor","printed_name":"Clockwork Mail","quantity":1}],"equipment_option_b_description":"Nothing.","grants":[{"active_from_class_level":null,"active_if_config":null,"always_prepared":false,"child_config_config":"origin_feat_config","count":1,"definition_key_config":"origin_feat_key","distinct_config_by":null,"free_cast":null,"kind":"grant_source","rule_key":"void-scholar-origin-feat","source_type":"feat","with_slots":true}],"reference_text":"Studies the gap.","repeatable":false,"skill_proficiencies":["arcana","insight"],"suggested_abilities":["intelligence","wisdom","charisma"],"tool_reference_text":"Astrolabe only; no structured tool grant."},"scheme":"content-v1"}',
    sha256: '15ff580a3544fe808e86d862306a064fe3237d7e999d2707acda4135c2ff9584',
    derivedKey: 'expanded:content.v1:15ff580a3544fe808e86d862306a064fe3237d7e999d2707acda4135c2ff9584',
  },
  {
    label: 'subclass inherit arm and repeated names at distinct levels',
    kind: 'subclass',
    aggregate: inheritSubclassAggregate,
    payload: inheritSubclassPayload,
    // Subclass payload orders features/grants before parent/progression/reference.
    // Feature sequence retains both same-name rows because level participates
    // in identity; each effect is declared-order; the inherit union arm emits
    // only `{mode:"inherit_parent"}` and no synthesized progression rows.
    canonicalJson: '{"edition":"expanded","kind":"subclass","normalizedName":"echoknight","payload":{"features":[{"class_level":3,"description":"First echo.","effects":[{"damage_type":"Void","kind":"damage_resistance","label":"Void ward","notes":null}],"name":"Echo"},{"class_level":7,"description":"Second echo.","effects":[{"attack_count":2,"kind":"extra_attack","label":"Echo attack","notes":null,"weapon_scope":"any_weapon"}],"name":"Echo"}],"grants":[],"parent_class":{"digest":"3333333333333333333333333333333333333333333333333333333333333333","kind":"class","scheme":"content-v1"},"progression":{"mode":"inherit_parent"},"reference_text":"Two thresholds share a printed name."},"scheme":"content-v1"}',
    sha256: '0ce55acab6397caea551c266261b93d9a78e1246223fb5ca179d22dc4eaf093e',
    derivedKey: 'expanded:content.v1:0ce55acab6397caea551c266261b93d9a78e1246223fb5ca179d22dc4eaf093e',
  },
  {
    label: 'subclass override arm carries exactly levels one through twenty',
    kind: 'subclass',
    aggregate: overrideSubclassAggregate,
    payload: overrideSubclassPayload,
    // Override uses the other closed union arm: contribution/mode/rows/ability
    // in canonical key order. The rows region is literally 1..20, each with
    // the nine-slot tuple and ordered grants; empty features/reference remain
    // present because the projector contract includes those semantic fields.
    canonicalJson: '{"edition":"expanded","kind":"subclass","normalizedName":"denseadept","payload":{"features":[],"grants":[],"parent_class":{"digest":"3333333333333333333333333333333333333333333333333333333333333333","kind":"class","scheme":"content-v1"},"progression":{"caster_contribution":"third_down","mode":"override","rows":[{"cantrips_known":0,"class_level":1,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":2,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":3,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":4,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":5,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":6,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":7,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":8,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":9,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":10,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":11,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":12,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":13,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":14,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":15,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":16,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":17,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":18,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":19,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":20,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]}],"spellcasting_ability":null},"reference_text":""},"scheme":"content-v1"}',
    sha256: '49306511d4dd5f33d04301c7d5035dcd1a60fa0ba063d1d20d05ee2ae784c01f',
    derivedKey: 'expanded:content.v1:49306511d4dd5f33d04301c7d5035dcd1a60fa0ba063d1d20d05ee2ae784c01f',
  },
  {
    label: 'subclass definition grant discriminates identity',
    kind: 'subclass',
    aggregate: grantedSubclassAggregate,
    payload: grantedSubclassPayload,
    // Definition grants are an ordered outer sequence. The fixed-spell grant
    // is complete and precedes parent/progression/reference in canonical key
    // order; no progression-owned caster fields are duplicated at the root.
    canonicalJson: '{"edition":"expanded","kind":"subclass","normalizedName":"runewarden","payload":{"features":[],"grants":[{"active_from_class_level":null,"active_if_config":null,"always_prepared":true,"bucket":"prepared","count":1,"counts_against_limit":true,"distinct_config_by":null,"free_cast":null,"kind":"fixed_spell","label":null,"rule_key":"subclass.spark","spell":{"digest":"1111111111111111111111111111111111111111111111111111111111111111","kind":"spell","scheme":"content-v1"},"with_slots":true}],"parent_class":{"digest":"3333333333333333333333333333333333333333333333333333333333333333","kind":"class","scheme":"content-v1"},"progression":{"mode":"inherit_parent"},"reference_text":"A definition-level spell grant."},"scheme":"content-v1"}',
    sha256: '47b18e8ffe968ed978cf2b9da087216e90d8724210f67a71e711cfae0167c255',
    derivedKey: 'expanded:content.v1:47b18e8ffe968ed978cf2b9da087216e90d8724210f67a71e711cfae0167c255',
  },
  {
    label: 'character effect notes normalize CRLF and trailing whitespace',
    kind: 'species',
    aggregate: characterEffectNotesSpeciesAggregate,
    payload: characterEffectNotesSpeciesPayload,
    // Hand-constructed from the contract: notes lose CRLF and line-final
    // spaces, while the effect and trait remain declared-order sequences.
    canonicalJson: '{"edition":"expanded","kind":"species","normalizedName":"notewalker","payload":{"alternate_size":null,"creature_type":"Humanoid","grants":[],"primary_size":"Medium","reference_text":"","repeatable":false,"traits":[{"description":"Keeps notes.","effects":[{"damage_type":"Force","kind":"damage_resistance","label":"Noted ward","notes":"First line\\nSecond line"}],"name":"Noted Ward"}],"walking_speed_feet":30},"scheme":"content-v1"}',
    sha256: '6232b70f5913c9c871e7d52e8244d776fca95c626880cba342aece293466efa9',
    derivedKey: 'expanded:content.v1:6232b70f5913c9c871e7d52e8244d776fca95c626880cba342aece293466efa9',
  },
  {
    label: 'extra attack notes normalize CRLF and trailing whitespace',
    kind: 'subclass',
    aggregate: extraAttackNotesSubclassAggregate,
    payload: extraAttackNotesSubclassPayload,
    // Independently constructed extra_attack arm; this reaches the dedicated
    // feature-effect branch rather than the character-effect helper.
    canonicalJson: '{"edition":"expanded","kind":"subclass","normalizedName":"notestriker","payload":{"features":[{"class_level":5,"description":"Attacks twice.","effects":[{"attack_count":2,"kind":"extra_attack","label":"Noted attack","notes":"Attack line\\nSecond attack","weapon_scope":"any_weapon"}],"name":"Noted Attack"}],"grants":[],"parent_class":{"digest":"3333333333333333333333333333333333333333333333333333333333333333","kind":"class","scheme":"content-v1"},"progression":{"mode":"inherit_parent"},"reference_text":""},"scheme":"content-v1"}',
    sha256: 'f1b7fb7a4e0214818258b11e66b9bc9845c3f2b146cfd9887a889302b3b7860e',
    derivedKey: 'expanded:content.v1:f1b7fb7a4e0214818258b11e66b9bc9845c3f2b146cfd9887a889302b3b7860e',
  },
] as const;

export interface AuthoredGrantSetVectorV1 {
  readonly label: string;
  readonly name: string;
  readonly payloads: readonly [
    SpeciesProjectorPayloadV1,
    SpeciesProjectorPayloadV1,
  ];
  readonly canonicalJson: string;
  readonly sha256: string;
  readonly derivedKey: string;
}

/**
 * HAND-WRITTEN SET ORACLES. The canonical literals were derived by applying
 * the content-v1 object-key and set-member ordering rules on paper. Their
 * hashes were calculated independently with Node's crypto.createHash over the
 * reviewed literals; the production deriver was not used to obtain either.
 */
export const authoredGrantSetV1Vectors: readonly AuthoredGrantSetVectorV1[] = [
  {
    label: 'choice query school and tag order or duplicates do not change identity',
    name: 'Grant Set Oracle',
    payloads: [
      {
        reference_text: canonicalRuleText(''),
        repeatable: false,
        grants: contentIdentitySequence([{
          kind: 'choice_from_query',
          rule_key: 'set.query',
          bucket: 'prepared',
          schools: contentIdentitySet([
            'Evocation', 'Abjuration', 'Evocation',
          ] as const),
          tags: contentIdentitySet(['ritual', 'arcane', 'ritual'] as const),
          count: 1,
          always_prepared: false,
          with_slots: true,
          free_cast: null,
          level_min: 0,
          level_max: 9,
        }]),
        creature_type: canonicalOpenPassthroughValue('Humanoid'),
        primary_size: canonicalOpenPassthroughValue('Medium'),
        alternate_size: null,
        walking_speed_feet: 30,
        traits: contentIdentitySequence([]),
      },
      {
        reference_text: canonicalRuleText(''),
        repeatable: false,
        grants: contentIdentitySequence([{
          kind: 'choice_from_query',
          rule_key: 'set.query',
          bucket: 'prepared',
          schools: contentIdentitySet(['Abjuration', 'Evocation'] as const),
          tags: contentIdentitySet(['arcane', 'ritual'] as const),
          count: 1,
          always_prepared: false,
          with_slots: true,
          free_cast: null,
          level_min: 0,
          level_max: 9,
        }]),
        creature_type: canonicalOpenPassthroughValue('Humanoid'),
        primary_size: canonicalOpenPassthroughValue('Medium'),
        alternate_size: null,
        walking_speed_feet: 30,
        traits: contentIdentitySequence([]),
      },
    ],
    canonicalJson: '{"edition":"expanded","kind":"species","normalizedName":"grantsetoracle","payload":{"alternate_size":null,"creature_type":"Humanoid","grants":[{"always_prepared":false,"bucket":"prepared","count":1,"free_cast":null,"kind":"choice_from_query","level_max":9,"level_min":0,"rule_key":"set.query","schools":["Abjuration","Evocation"],"tags":["arcane","ritual"],"with_slots":true}],"primary_size":"Medium","reference_text":"","repeatable":false,"traits":[],"walking_speed_feet":30},"scheme":"content-v1"}',
    sha256: '2bcfbab57de3f1947b6e561d337ad41a3937571dd190ca287dd0ff5898835245',
    derivedKey: 'expanded:content.v1:2bcfbab57de3f1947b6e561d337ad41a3937571dd190ca287dd0ff5898835245',
  },
  {
    label: 'duplicate skill member dedupes without changing identity',
    name: 'Grant Dedupe Oracle',
    payloads: [
      {
        reference_text: canonicalRuleText(''),
        repeatable: false,
        grants: contentIdentitySequence([{
          kind: 'skill_proficiency',
          rule_key: 'set.skills',
          count: 2,
          skills: contentIdentitySet(['stealth', 'arcana', 'stealth'] as const),
          always_prepared: false,
          with_slots: true,
          free_cast: null,
        }]),
        creature_type: canonicalOpenPassthroughValue('Humanoid'),
        primary_size: canonicalOpenPassthroughValue('Medium'),
        alternate_size: null,
        walking_speed_feet: 30,
        traits: contentIdentitySequence([]),
      },
      {
        reference_text: canonicalRuleText(''),
        repeatable: false,
        grants: contentIdentitySequence([{
          kind: 'skill_proficiency',
          rule_key: 'set.skills',
          count: 2,
          skills: contentIdentitySet(['arcana', 'stealth'] as const),
          always_prepared: false,
          with_slots: true,
          free_cast: null,
        }]),
        creature_type: canonicalOpenPassthroughValue('Humanoid'),
        primary_size: canonicalOpenPassthroughValue('Medium'),
        alternate_size: null,
        walking_speed_feet: 30,
        traits: contentIdentitySequence([]),
      },
    ],
    canonicalJson: '{"edition":"expanded","kind":"species","normalizedName":"grantdedupeoracle","payload":{"alternate_size":null,"creature_type":"Humanoid","grants":[{"always_prepared":false,"count":2,"free_cast":null,"kind":"skill_proficiency","rule_key":"set.skills","skills":["arcana","stealth"],"with_slots":true}],"primary_size":"Medium","reference_text":"","repeatable":false,"traits":[],"walking_speed_feet":30},"scheme":"content-v1"}',
    sha256: '035f9bbc5106c2cb361c571b44bb9fd5c254a6ac9bdd92ebac5ac8b75e1bdaa4',
    derivedKey: 'expanded:content.v1:035f9bbc5106c2cb361c571b44bb9fd5c254a6ac9bdd92ebac5ac8b75e1bdaa4',
  },
];
