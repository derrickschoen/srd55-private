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
  type ContentFingerprintDigest,
} from '../../../../src/catalog/content-identity';
import {
  creatureSize,
  creatureType,
  damageType,
} from '../../../../src/domain/enums';

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
  creature_type: creatureType('Clockwork  Humanoid'),
  primary_size: 'Large',
  alternate_size: creatureSize('Sma\u0301ll'),
  walking_speed_feet: 35,
  grants: [{
    kind: 'fixed_spell',
    rule_key: 'void.spark',
    spell: spellReference,
    always_prepared: true,
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
  grants: contentIdentitySequence([{
    kind: 'fixed_spell',
    rule_key: 'void.spark',
    spell: spellReference,
    always_prepared: true,
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
  suggested_abilities: ['intelligence', 'wisdom', 'charisma'],
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
  progression: {
    mode: 'override',
    spellcasting_ability: null,
    caster_contribution: 'third_down',
    rows: contentIdentitySequence(
      denseRows.map((row) => ({
        ...row,
        grants: contentIdentitySequence(row.grants),
      })),
    ),
  },
  features: contentIdentitySequence([]),
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
    canonicalJson: '{"edition":"expanded","kind":"species","normalizedName":"voidwalker","payload":{"alternate_size":"Smáll","creature_type":"Clockwork  Humanoid","grants":[{"always_prepared":true,"kind":"fixed_spell","rule_key":"void.spark","spell":{"digest":"1111111111111111111111111111111111111111111111111111111111111111","kind":"spell","scheme":"content-v1"}}],"primary_size":"Large","reference_text":"Exact reference.","traits":[{"description":"Holds.","effects":[{"damage_type":"Void  Fire","kind":"damage_resistance","label":"Void Ward","notes":null}],"name":"Void Ward"}],"walking_speed_feet":35},"scheme":"content-v1"}',
    sha256: '5db52e3a3e543c4e9ffaa7a1d73191c5889b60457cffe8a9fb01a5236bb05b24',
    derivedKey: 'expanded:content.v1:5db52e3a3e543c4e9ffaa7a1d73191c5889b60457cffe8a9fb01a5236bb05b24',
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
    canonicalJson: '{"edition":"expanded","kind":"background","normalizedName":"voidscholar","payload":{"default_origin_feat":{"digest":"2222222222222222222222222222222222222222222222222222222222222222","kind":"feat","scheme":"content-v1"},"effects":[{"damage_type":"void","kind":"damage_resistance","label":"Lowercase void ward","notes":null}],"equipment_option_a":[{"kind":"gear","printed_name":"Astrolabe","quantity":1},{"content":{"digest":"4444444444444444444444444444444444444444444444444444444444444444","kind":"weapon","scheme":"content-v1"},"kind":"weapon","printed_name":"Void Blade","quantity":1}],"equipment_option_a_description":"An astrolabe.","equipment_option_b":[{"content":{"digest":"5555555555555555555555555555555555555555555555555555555555555555","kind":"armor","scheme":"content-v1"},"kind":"armor","printed_name":"Clockwork Mail","quantity":1}],"equipment_option_b_description":"Nothing.","reference_text":"Studies the gap.","skill_proficiencies":["arcana","insight"],"suggested_abilities":["intelligence","wisdom","charisma"],"tool_reference_text":"Astrolabe only; no structured tool grant."},"scheme":"content-v1"}',
    sha256: 'b549f874b36dfe98d88e5f8469dd2968f34fe83e8251f3ae74a88b3be93082ad',
    derivedKey: 'expanded:content.v1:b549f874b36dfe98d88e5f8469dd2968f34fe83e8251f3ae74a88b3be93082ad',
  },
  {
    label: 'subclass inherit arm and repeated names at distinct levels',
    kind: 'subclass',
    aggregate: inheritSubclassAggregate,
    payload: inheritSubclassPayload,
    // Subclass payload orders features before parent/progression/reference.
    // Feature sequence retains both same-name rows because level participates
    // in identity; each effect is declared-order; the inherit union arm emits
    // only `{mode:"inherit_parent"}` and no synthesized progression rows.
    canonicalJson: '{"edition":"expanded","kind":"subclass","normalizedName":"echoknight","payload":{"features":[{"class_level":3,"description":"First echo.","effects":[{"damage_type":"Void","kind":"damage_resistance","label":"Void ward","notes":null}],"name":"Echo"},{"class_level":7,"description":"Second echo.","effects":[{"attack_count":2,"kind":"extra_attack","label":"Echo attack","notes":null,"weapon_scope":"any_weapon"}],"name":"Echo"}],"parent_class":{"digest":"3333333333333333333333333333333333333333333333333333333333333333","kind":"class","scheme":"content-v1"},"progression":{"mode":"inherit_parent"},"reference_text":"Two thresholds share a printed name."},"scheme":"content-v1"}',
    sha256: 'c2527c54bbbf1dadff5b96121d8e9613acc3c5f0511bf19e545585d3cb019392',
    derivedKey: 'expanded:content.v1:c2527c54bbbf1dadff5b96121d8e9613acc3c5f0511bf19e545585d3cb019392',
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
    canonicalJson: '{"edition":"expanded","kind":"subclass","normalizedName":"denseadept","payload":{"features":[],"parent_class":{"digest":"3333333333333333333333333333333333333333333333333333333333333333","kind":"class","scheme":"content-v1"},"progression":{"caster_contribution":"third_down","mode":"override","rows":[{"cantrips_known":0,"class_level":1,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":2,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":3,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":4,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":5,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":6,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":7,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":8,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":9,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":10,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":11,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":12,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":13,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":14,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":15,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":16,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":17,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":18,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":19,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]},{"cantrips_known":0,"class_level":20,"grants":[],"maximum_spell_level":0,"prepared_or_known_count":0,"slot_counts":[0,0,0,0,0,0,0,0,0]}],"spellcasting_ability":null},"reference_text":""},"scheme":"content-v1"}',
    sha256: '9f768a3fcbd8ac31f1d37117772c3f638021a455fea6e024f0d7fba32e05dcf3',
    derivedKey: 'expanded:content.v1:9f768a3fcbd8ac31f1d37117772c3f638021a455fea6e024f0d7fba32e05dcf3',
  },
] as const;
