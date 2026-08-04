import type {
  ClassContentAggregateV1,
  FeatContentAggregateV1,
} from '../../../../src/catalog/source-content-projector-v1';

/**
 * HAND-PINNED ORACLES. Each canonical literal was assembled from the contract
 * field-by-field, reviewed, then hashed independently with Node's createHash
 * over that literal. Production projector output was never used to mint an
 * expected byte, digest, or key.
 */

export const classProjectorV1Vector: {
  readonly aggregate: ClassContentAggregateV1;
  readonly canonicalJson: string;
  readonly sha256: string;
  readonly derivedKey: string;
} = {
  aggregate: {
    kind: 'class',
    name: 'Wayfarer',
    rules_edition: 'expanded',
    spellcasting_ability: null,
    progression_type: 'none',
    caster_fraction: null,
    caster_rounding: null,
    prepares_or_knows: null,
    supports_ritual_casting: false,
    ritual_casting_mode: null,
    primary_ability_expression: null,
    notes: null,
    progressions: [],
    sheet_traits: null,
    saving_throw_proficiencies: [],
    skill_options: [],
    armor_training: [],
    weapon_proficiencies: [],
    extra_attack_grants: [],
    martial_arts_dice: [],
    weapon_mastery_grants: [],
    weapon_mastery_counts: [],
    equipment_items: [],
    resources: [],
    resource_formulas: [],
    feature_effects: [],
    named_features: [],
  },
  canonicalJson: '{"edition":"expanded","kind":"class","normalizedName":"wayfarer","payload":{"armor_training":[],"caster_fraction":null,"caster_rounding":null,"equipment_items":[],"extra_attack_grants":[],"feature_effects":[],"martial_arts_dice":[],"named_features":[],"notes":"","prepares_or_knows":null,"primary_ability_expression":null,"progression_type":"none","progressions":[],"resource_formulas":[],"resources":[],"ritual_casting_mode":null,"saving_throw_proficiencies":[],"sheet_traits":null,"skill_options":[],"spellcasting_ability":null,"supports_ritual_casting":false,"weapon_mastery_counts":[],"weapon_mastery_grants":[],"weapon_proficiencies":[]},"scheme":"content-v1"}',
  sha256: '5a1a30497ba4adcc13d56c013c23b3fa03187c24c06aa655b41259a58feed523',
  derivedKey: 'expanded:content.v1:5a1a30497ba4adcc13d56c013c23b3fa03187c24c06aa655b41259a58feed523',
};

export const featProjectorV1Vector: {
  readonly aggregate: FeatContentAggregateV1;
  readonly canonicalJson: string;
  readonly sha256: string;
  readonly derivedKey: string;
} = {
  aggregate: {
    kind: 'feat',
    name: 'Keen Memory',
    rules_edition: 'expanded',
    category: 'general',
    min_level: null,
    ability_points: 0,
    ability_increase_abilities: null,
    ability_increase_maximum: null,
    repeatable: false,
    prerequisites: [],
    grants: [],
    notes: 'Recall details.  \r\nPrecisely.   \r\n',
  },
  canonicalJson: '{"edition":"expanded","kind":"feat","normalizedName":"keenmemory","payload":{"ability_increase_abilities":null,"ability_increase_maximum":null,"ability_points":0,"category":"general","grants":[],"min_level":null,"notes":"Recall details.\\nPrecisely.","prerequisites":[],"repeatable":false},"scheme":"content-v1"}',
  sha256: '7b0867a676f32d79951ae95971044a9361cd8089af020bdd9e93643650d8770a',
  derivedKey: 'expanded:content.v1:7b0867a676f32d79951ae95971044a9361cd8089af020bdd9e93643650d8770a',
};
