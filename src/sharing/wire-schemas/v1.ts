import type {
  ShareArmor,
  ShareBackground,
  ShareCharacter,
  ShareEffect,
  ShareHitPointRoll,
  SharePlaceholder,
  SharePreference,
  ShareSelection,
  ShareSheetAdjustment,
  ShareSource,
  ShareSpecies,
  ShareSpeciesTrait,
  ShareWeapon,
} from '../schema';

type WireType =
  | 'boolean'
  | 'damage'
  | 'integer'
  | 'json'
  | 'list'
  | 'literal'
  | 'string'
  | 'tuple';

export interface WireField<Key extends string = string> {
  readonly key: Key;
  readonly wireType: WireType;
  readonly meaning: string;
}

interface TupleSchema<Key extends string = string> {
  readonly arities: readonly number[];
  readonly fields: readonly WireField<Key>[];
}

interface VariantTupleSchema<Key extends string = string> {
  readonly variants: readonly {
    readonly arity: number;
    readonly meaning: string;
    readonly fields: readonly WireField<Key>[];
  }[];
}

type RootField =
  | 'format' | 'version' | 'character' | 'classes' | 'sources'
  | 'selections' | 'spellbook' | 'preferences' | 'overrides'
  | 'acknowledgements' | 'loadouts' | 'weapons' | 'origin' | 'sheet'
  | 'effects';
type CharacterField = keyof ShareCharacter | 'placeholders';
type ClassField =
  | 'id' | 'classKey' | 'subclassKey' | 'level' | 'start' | 'ability'
  | 'config' | 'subclassConfig';
type LoadoutField = 'name' | 'entries';
type LoadoutEntryField = 'spellKey' | 'role';
type WeaponField =
  | keyof ShareWeapon | 'damage_dice' | 'versatile_damage_dice';
type DamageField = 'kind' | 'payload';
type OriginField = 'species' | 'speciesTraits' | 'background';
type SheetField =
  | 'armor' | 'hitPointRolls' | 'skillProficiencies' | 'sheetAdjustment';

export interface WireSchemaV1 {
  readonly version: 1;
  readonly tuples: {
    readonly root: TupleSchema<RootField>;
    readonly character: TupleSchema<CharacterField>;
    readonly class: TupleSchema<ClassField>;
    readonly source: TupleSchema<keyof ShareSource>;
    readonly selection: TupleSchema<keyof ShareSelection>;
    readonly placeholder: TupleSchema<keyof SharePlaceholder>;
    readonly preference: TupleSchema<keyof SharePreference>;
    readonly override: TupleSchema<'ruleKey' | 'value'>;
    readonly acknowledgement: TupleSchema<'warning'>;
    readonly loadout: TupleSchema<LoadoutField>;
    readonly loadoutEntry: TupleSchema<LoadoutEntryField>;
    readonly weapon: VariantTupleSchema<WeaponField>;
    readonly damage: VariantTupleSchema<DamageField>;
    readonly origin: TupleSchema<OriginField>;
    readonly species: TupleSchema<keyof ShareSpecies>;
    readonly speciesTrait: TupleSchema<keyof ShareSpeciesTrait>;
    readonly background: TupleSchema<keyof ShareBackground>;
    readonly sheet: TupleSchema<SheetField>;
    readonly armor: TupleSchema<keyof ShareArmor>;
    readonly hitPointRoll: TupleSchema<keyof ShareHitPointRoll>;
    readonly sheetAdjustment: TupleSchema<keyof ShareSheetAdjustment>;
    readonly effect: TupleSchema<keyof ShareEffect>;
  };
}

function deepFreeze<T extends object>(value: T): Readonly<T> {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') {
      deepFreeze(child);
    }
  }
  return Object.freeze(value);
}

export const WIRE_SCHEMA_V1 = deepFreeze({
  version: 1,
  tuples: {
    root: {
      arities: [11, 12, 13, 14, 15],
      fields: [
        { key: 'format', wireType: 'literal', meaning: 'share format marker' },
        { key: 'version', wireType: 'integer', meaning: 'version for the complete export' },
        { key: 'character', wireType: 'tuple', meaning: 'character root values' },
        { key: 'classes', wireType: 'list', meaning: 'ordered class levels' },
        { key: 'sources', wireType: 'list', meaning: 'standalone sources' },
        { key: 'selections', wireType: 'list', meaning: 'spell selections' },
        { key: 'spellbook', wireType: 'list', meaning: 'spell keys in the spellbook' },
        { key: 'preferences', wireType: 'list', meaning: 'spell preferences' },
        { key: 'overrides', wireType: 'list', meaning: 'grant-rule overrides' },
        { key: 'acknowledgements', wireType: 'list', meaning: 'warning acknowledgements' },
        { key: 'loadouts', wireType: 'list', meaning: 'spell loadouts' },
        { key: 'weapons', wireType: 'list', meaning: 'character weapons' },
        { key: 'origin', wireType: 'tuple', meaning: 'species, traits, and background group' },
        { key: 'sheet', wireType: 'tuple', meaning: 'stored sheet inputs group' },
        { key: 'effects', wireType: 'list', meaning: 'character-owned effects' },
      ],
    },
    character: {
      arities: [11, 12],
      fields: [
        { key: 'name', wireType: 'string', meaning: 'character name' },
        { key: 'strength', wireType: 'integer', meaning: 'Strength score' },
        { key: 'dexterity', wireType: 'integer', meaning: 'Dexterity score' },
        { key: 'constitution', wireType: 'integer', meaning: 'Constitution score' },
        { key: 'intelligence', wireType: 'integer', meaning: 'Intelligence score' },
        { key: 'wisdom', wireType: 'integer', meaning: 'Wisdom score' },
        { key: 'charisma', wireType: 'integer', meaning: 'Charisma score' },
        { key: 'proficiency_bonus_override', wireType: 'integer', meaning: 'manual proficiency bonus' },
        { key: 'rules_edition_preference', wireType: 'string', meaning: 'preferred rules edition' },
        { key: 'allow_legacy', wireType: 'boolean', meaning: 'legacy-content opt-in' },
        { key: 'placeholders', wireType: 'list', meaning: 'unknown spell metadata' },
        { key: 'notes', wireType: 'string', meaning: 'opt-in character note' },
      ],
    },
    class: {
      arities: [8],
      fields: [
        { key: 'id', wireType: 'integer', meaning: 'share-local class reference' },
        { key: 'classKey', wireType: 'string', meaning: 'class catalog key' },
        { key: 'subclassKey', wireType: 'string', meaning: 'subclass catalog key' },
        { key: 'level', wireType: 'integer', meaning: 'class level' },
        { key: 'start', wireType: 'integer', meaning: 'multiclass start position' },
        { key: 'ability', wireType: 'string', meaning: 'spellcasting ability override' },
        { key: 'config', wireType: 'json', meaning: 'class grant configuration' },
        { key: 'subclassConfig', wireType: 'json', meaning: 'subclass grant configuration' },
      ],
    },
    source: {
      arities: [6],
      fields: [
        { key: 'id', wireType: 'integer', meaning: 'share-local source reference' },
        { key: 'type', wireType: 'string', meaning: 'source kind' },
        { key: 'key', wireType: 'string', meaning: 'source catalog key' },
        { key: 'config', wireType: 'json', meaning: 'source grant configuration' },
        { key: 'acquired', wireType: 'integer', meaning: 'acquisition position' },
        { key: 'name', wireType: 'string', meaning: 'source display name' },
      ],
    },
    selection: {
      arities: [6],
      fields: [
        { key: 'ref', wireType: 'integer', meaning: 'share-local source reference' },
        { key: 'ruleKey', wireType: 'string', meaning: 'grant rule key' },
        { key: 'ordinal', wireType: 'integer', meaning: 'selection ordinal' },
        { key: 'spellKey', wireType: 'string', meaning: 'selected spell key' },
        { key: 'spellName', wireType: 'string', meaning: 'selected spell fallback name' },
        { key: 'keep', wireType: 'boolean', meaning: 'keep selection when invalidated' },
      ],
    },
    placeholder: {
      arities: [2],
      fields: [
        { key: 'spellKey', wireType: 'string', meaning: 'unknown spell key' },
        { key: 'spellName', wireType: 'string', meaning: 'unknown spell fallback name' },
      ],
    },
    preference: {
      arities: [2],
      fields: [
        { key: 'spellKey', wireType: 'string', meaning: 'preferred spell key' },
        { key: 'favourite', wireType: 'boolean', meaning: 'favourite state' },
      ],
    },
    override: {
      arities: [2],
      fields: [
        { key: 'ruleKey', wireType: 'string', meaning: 'overridden grant rule key' },
        { key: 'value', wireType: 'json', meaning: 'override value' },
      ],
    },
    acknowledgement: {
      arities: [1],
      fields: [
        { key: 'warning', wireType: 'string', meaning: 'acknowledged warning key' },
      ],
    },
    loadout: {
      arities: [2],
      fields: [
        { key: 'name', wireType: 'string', meaning: 'loadout name' },
        { key: 'entries', wireType: 'list', meaning: 'ordered loadout entries' },
      ],
    },
    loadoutEntry: {
      arities: [2],
      fields: [
        { key: 'spellKey', wireType: 'string', meaning: 'loadout spell key' },
        { key: 'role', wireType: 'string', meaning: 'loadout role' },
      ],
    },
    weapon: {
      variants: [
        {
          arity: 19,
          meaning: 'original weapon with legacy string damage and no proficiency category',
          fields: [
            { key: 'name', wireType: 'string', meaning: 'weapon name' },
            { key: 'damage_dice', wireType: 'string', meaning: 'legacy primary damage' },
            { key: 'damage_type', wireType: 'string', meaning: 'damage type' },
            { key: 'versatile_damage_dice', wireType: 'string', meaning: 'legacy versatile damage' },
            { key: 'ammunition_kind', wireType: 'string', meaning: 'ammunition kind' },
            { key: 'range_normal_feet', wireType: 'integer', meaning: 'normal range in feet' },
            { key: 'range_long_feet', wireType: 'integer', meaning: 'long range in feet' },
            { key: 'mastery_property', wireType: 'string', meaning: 'mastery property' },
            { key: 'other_properties', wireType: 'string', meaning: 'other weapon properties' },
            { key: 'notes', wireType: 'string', meaning: 'weapon notes' },
            { key: 'finesse', wireType: 'boolean', meaning: 'Finesse property' },
            { key: 'heavy', wireType: 'boolean', meaning: 'Heavy property' },
            { key: 'light', wireType: 'boolean', meaning: 'Light property' },
            { key: 'loading', wireType: 'boolean', meaning: 'Loading property' },
            { key: 'reach', wireType: 'boolean', meaning: 'Reach property' },
            { key: 'thrown', wireType: 'boolean', meaning: 'Thrown property' },
            { key: 'two_handed', wireType: 'boolean', meaning: 'Two-Handed property' },
            { key: 'ammunition', wireType: 'boolean', meaning: 'Ammunition property' },
            { key: 'mastery_selected', wireType: 'boolean', meaning: 'selected mastery state' },
          ],
        },
        {
          arity: 20,
          meaning: 'legacy string damage with appended proficiency category',
          fields: [
            { key: 'name', wireType: 'string', meaning: 'weapon name' },
            { key: 'damage_dice', wireType: 'string', meaning: 'legacy primary damage' },
            { key: 'damage_type', wireType: 'string', meaning: 'damage type' },
            { key: 'versatile_damage_dice', wireType: 'string', meaning: 'legacy versatile damage' },
            { key: 'ammunition_kind', wireType: 'string', meaning: 'ammunition kind' },
            { key: 'range_normal_feet', wireType: 'integer', meaning: 'normal range in feet' },
            { key: 'range_long_feet', wireType: 'integer', meaning: 'long range in feet' },
            { key: 'mastery_property', wireType: 'string', meaning: 'mastery property' },
            { key: 'other_properties', wireType: 'string', meaning: 'other weapon properties' },
            { key: 'notes', wireType: 'string', meaning: 'weapon notes' },
            { key: 'finesse', wireType: 'boolean', meaning: 'Finesse property' },
            { key: 'heavy', wireType: 'boolean', meaning: 'Heavy property' },
            { key: 'light', wireType: 'boolean', meaning: 'Light property' },
            { key: 'loading', wireType: 'boolean', meaning: 'Loading property' },
            { key: 'reach', wireType: 'boolean', meaning: 'Reach property' },
            { key: 'thrown', wireType: 'boolean', meaning: 'Thrown property' },
            { key: 'two_handed', wireType: 'boolean', meaning: 'Two-Handed property' },
            { key: 'ammunition', wireType: 'boolean', meaning: 'Ammunition property' },
            { key: 'mastery_selected', wireType: 'boolean', meaning: 'selected mastery state' },
            { key: 'proficiency_category', wireType: 'string', meaning: 'simple or martial category' },
          ],
        },
        {
          arity: 22,
          meaning: 'current v1 weapon with typed primary and versatile damage',
          fields: [
            { key: 'name', wireType: 'string', meaning: 'weapon name' },
            { key: 'damage_dice', wireType: 'string', meaning: 'retired legacy primary damage slot' },
            { key: 'damage_type', wireType: 'string', meaning: 'damage type' },
            { key: 'versatile_damage_dice', wireType: 'string', meaning: 'retired legacy versatile damage slot' },
            { key: 'ammunition_kind', wireType: 'string', meaning: 'ammunition kind' },
            { key: 'range_normal_feet', wireType: 'integer', meaning: 'normal range in feet' },
            { key: 'range_long_feet', wireType: 'integer', meaning: 'long range in feet' },
            { key: 'mastery_property', wireType: 'string', meaning: 'mastery property' },
            { key: 'other_properties', wireType: 'string', meaning: 'other weapon properties' },
            { key: 'notes', wireType: 'string', meaning: 'weapon notes' },
            { key: 'finesse', wireType: 'boolean', meaning: 'Finesse property' },
            { key: 'heavy', wireType: 'boolean', meaning: 'Heavy property' },
            { key: 'light', wireType: 'boolean', meaning: 'Light property' },
            { key: 'loading', wireType: 'boolean', meaning: 'Loading property' },
            { key: 'reach', wireType: 'boolean', meaning: 'Reach property' },
            { key: 'thrown', wireType: 'boolean', meaning: 'Thrown property' },
            { key: 'two_handed', wireType: 'boolean', meaning: 'Two-Handed property' },
            { key: 'ammunition', wireType: 'boolean', meaning: 'Ammunition property' },
            { key: 'mastery_selected', wireType: 'boolean', meaning: 'selected mastery state' },
            { key: 'proficiency_category', wireType: 'string', meaning: 'simple or martial category' },
            { key: 'damage', wireType: 'damage', meaning: 'typed primary damage' },
            { key: 'versatile_damage', wireType: 'damage', meaning: 'typed versatile damage' },
          ],
        },
      ],
    },
    damage: {
      variants: [
        {
          arity: 1,
          meaning: 'not-recorded or not-applicable damage',
          fields: [
            { key: 'kind', wireType: 'string', meaning: 'absence kind' },
          ],
        },
        {
          arity: 2,
          meaning: 'dice, flat, or custom damage',
          fields: [
            { key: 'kind', wireType: 'string', meaning: 'damage kind' },
            { key: 'payload', wireType: 'json', meaning: 'dice string, flat integer, or custom text' },
          ],
        },
      ],
    },
    origin: {
      arities: [3],
      fields: [
        { key: 'species', wireType: 'tuple', meaning: 'character species' },
        { key: 'speciesTraits', wireType: 'list', meaning: 'ordered species traits' },
        { key: 'background', wireType: 'tuple', meaning: 'character background' },
      ],
    },
    species: {
      arities: [5],
      fields: [
        { key: 'name', wireType: 'string', meaning: 'species name' },
        { key: 'creature_type', wireType: 'string', meaning: 'creature type' },
        { key: 'size', wireType: 'string', meaning: 'size' },
        { key: 'notes', wireType: 'string', meaning: 'species notes' },
        { key: 'base_speed_feet', wireType: 'integer', meaning: 'base speed in feet' },
      ],
    },
    speciesTrait: {
      arities: [8],
      fields: [
        { key: 'name', wireType: 'string', meaning: 'trait name' },
        { key: 'description', wireType: 'string', meaning: 'trait description' },
        { key: 'effect_kind', wireType: 'string', meaning: 'legacy effect kind' },
        { key: 'effect_damage_type', wireType: 'string', meaning: 'legacy effect damage type' },
        { key: 'notes', wireType: 'string', meaning: 'trait notes' },
        { key: 'effect_hit_points_flat', wireType: 'integer', meaning: 'legacy flat hit-point effect' },
        { key: 'effect_hit_points_per_level', wireType: 'integer', meaning: 'legacy per-level hit-point effect' },
        { key: 'effect_speed_bonus_feet', wireType: 'integer', meaning: 'legacy speed effect in feet' },
      ],
    },
    background: {
      arities: [11],
      fields: [
        { key: 'name', wireType: 'string', meaning: 'background name' },
        { key: 'ability_score_1', wireType: 'string', meaning: 'first ability score' },
        { key: 'ability_score_2', wireType: 'string', meaning: 'second ability score' },
        { key: 'ability_score_3', wireType: 'string', meaning: 'third ability score' },
        { key: 'feat_name', wireType: 'string', meaning: 'feat name' },
        { key: 'skill_proficiency_1', wireType: 'string', meaning: 'first skill proficiency' },
        { key: 'skill_proficiency_2', wireType: 'string', meaning: 'second skill proficiency' },
        { key: 'tool_proficiency', wireType: 'string', meaning: 'tool proficiency' },
        { key: 'equipment_option_a', wireType: 'string', meaning: 'equipment option A' },
        { key: 'equipment_option_b', wireType: 'string', meaning: 'equipment option B' },
        { key: 'notes', wireType: 'string', meaning: 'background notes' },
      ],
    },
    sheet: {
      arities: [4],
      fields: [
        { key: 'armor', wireType: 'list', meaning: 'worn and held armor' },
        { key: 'hitPointRolls', wireType: 'list', meaning: 'recorded hit-point rolls' },
        { key: 'skillProficiencies', wireType: 'list', meaning: 'skill proficiencies' },
        { key: 'sheetAdjustment', wireType: 'tuple', meaning: 'manual Armor Class adjustment' },
      ],
    },
    armor: {
      arities: [9],
      fields: [
        { key: 'name', wireType: 'string', meaning: 'armor name' },
        { key: 'slot', wireType: 'string', meaning: 'worn or held slot' },
        { key: 'category', wireType: 'string', meaning: 'armor category' },
        { key: 'dex_bonus', wireType: 'string', meaning: 'Dexterity contribution kind' },
        { key: 'armor_class', wireType: 'integer', meaning: 'base Armor Class' },
        { key: 'dex_bonus_max', wireType: 'integer', meaning: 'Dexterity contribution cap' },
        { key: 'strength_requirement', wireType: 'integer', meaning: 'Strength requirement' },
        { key: 'stealth_disadvantage', wireType: 'boolean', meaning: 'stealth disadvantage state' },
        { key: 'notes', wireType: 'string', meaning: 'armor notes' },
      ],
    },
    hitPointRoll: {
      arities: [3],
      fields: [
        { key: 'className', wireType: 'string', meaning: 'class name reference' },
        { key: 'classLevel', wireType: 'integer', meaning: 'class level' },
        { key: 'value', wireType: 'integer', meaning: 'recorded die result' },
      ],
    },
    sheetAdjustment: {
      arities: [2],
      fields: [
        { key: 'value', wireType: 'integer', meaning: 'Armor Class adjustment' },
        { key: 'note', wireType: 'string', meaning: 'adjustment explanation' },
      ],
    },
    effect: {
      arities: [9],
      fields: [
        { key: 'kind', wireType: 'string', meaning: 'mechanical effect kind' },
        { key: 'label', wireType: 'string', meaning: 'effect label' },
        { key: 'damage_type', wireType: 'string', meaning: 'effect damage type' },
        { key: 'notes', wireType: 'string', meaning: 'effect notes' },
        { key: 'hit_points_flat', wireType: 'integer', meaning: 'flat hit-point modifier' },
        { key: 'hit_points_per_level', wireType: 'integer', meaning: 'per-level hit-point modifier' },
        { key: 'speed_bonus_feet', wireType: 'integer', meaning: 'speed modifier in feet' },
        { key: 'sourceRef', wireType: 'integer', meaning: 'share-local source reference' },
        { key: 'sourceSubclass', wireType: 'boolean', meaning: 'reference selects subclass root' },
      ],
    },
  },
} as const satisfies WireSchemaV1);
