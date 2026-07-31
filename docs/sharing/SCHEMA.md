# Character share wire schema

> Transcribed from `SHARE_SCHEMAS` for the GF-1 v14 mint. Update this document
> with every wire-version mint.

The executable source of truth is
`src/sharing/wire-schemas/index.ts` and its immutable version modules
`v1.ts` through `v14.ts`. This guide describes that registry; it does not
replace it. `CURRENT_CHARACTER_SHARE_VERSION` is **14**.

One version at `root[1]` governs the complete document. Nested tuples do not
carry independent versions. Encoding always mints the current version.
Decoding validates the frozen schema selected by `root[1]`, then composes
one-version-at-a-time migrations until it reaches v14.

Versions 1 through 4 remain in the registry as frozen history, but they are
deliberately retired from import. Their migration path reaches v4→v5 and throws
`ShareWireRetirementError` because their bare skill names cannot be given honest
provenance. Versions 5 through 13 migrate to v14.

Tuple arity is exact. A nullable or omitted logical value still occupies its
assigned wire position as `null`; it does not shorten a current tuple. The
`wireType` labels below are the labels in the schema objects themselves and do
not, by themselves, express nullability or the logical validator's value
bounds.

## Version history

### Version 1 — frozen initial sharing format

**Minted by:** the initial character-sharing unit. D41's registry unit later
froze v1 exactly as it had shipped without changing its bytes.

**Shape:** v1 accumulated several additions before D41 prohibited changing a
minted version. Its frozen root accepts arities **11, 12, 13, 14, and 15**;
`character` accepts **11 or 12**; and `weapon` accepts **19, 20, or 22**.
The complete frozen tuple inventory is:

| Tuple | Accepted arity | Meaning |
| --- | ---: | --- |
| `root` | 11 / 12 / 13 / 14 / 15 | Successive historical roots, ending with effects at position 14 |
| `character` | 11 / 12 | Character values; position 10 is placeholders and optional position 11 is notes |
| `class` | 8 | Share-local class, level/order, casting ability, and class/subclass configuration |
| `source` | 6 | Share-local standalone source, configuration, acquisition order, and fallback name |
| `selection` | 6 | Spell choice addressed by source, rule key, and ordinal |
| `placeholder` | 2 | Unknown spell key and fallback name |
| `preference` | 2 | Spell key and favourite state |
| `override` | 2 | Grant-rule key and JSON override |
| `acknowledgement` | 1 | Warning key |
| `loadout` / `loadoutEntry` | 2 / 2 | Named loadout and its spell-key/role entries |
| `weapon` | 19 / 20 / 22 | Legacy weapon; proficiency-category append; then typed damage append |
| `damage` | 1 / 2 | Absence kind, or typed damage kind plus payload |
| `origin` | 3 | Species, species traits, and background |
| `species` / `speciesTrait` / `background` | 5 / 8 / 11 | User-carried origin records |
| `sheet` | 4 | Armor, hit-point rolls, skill names, and manual AC adjustment |
| `armor` / `hitPointRoll` / `sheetAdjustment` | 9 / 3 / 2 | Stored sheet inputs |
| `effect` | 9 | Character effect with optional source provenance |

**Adjacent migration (v1→v2):** validates the accepted historical arities,
pads short roots to the frozen 15-position v1 inventory, moves
`character[10]` placeholders to the new trailing root position, and leaves
character notes in the retained character position. Every weapon is rewritten
from its two independent range integers to a tagged range tuple and from legacy
damage strings to typed damage when needed. Range pairs map losslessly:
null/null to `none`, near-only and ordered pairs to `ranged`, and long-only or
inverted pairs to decode-only `legacy`. A 19-position weapon also receives null
in the v2 `proficiency_category` position; a 20- or 22-position weapon preserves
its existing value. No range field is coerced or dropped.

### Version 2 — structured weapon range and root placeholders

**Minted by:** the D41 schema-registry follow-up.

**Change:** `root` becomes exactly **16** positions by appending
`placeholders`; `character` becomes exactly **11** positions by removing its
placeholder slot while retaining notes; and `weapon` becomes exactly **21**
positions by replacing `range_normal_feet` plus `range_long_feet` with one
`range` tuple. New `weaponRange` variants are **1** position for `none`, **3**
for `ranged` (`kind`, `near`, `far`), and **3** for decode-only `legacy`
(`kind`, `normal`, `long`). All other tuples retain v1 meanings.

**Adjacent migration (v1→v2):** performs the cross-tuple placeholder move and
the lossless range/damage rewrite described under v1. Fresh encodes cannot mint
the `legacy` range variant.

### Version 3 — ability-allocation signal

**Minted by:** B1, the abilities step.

**Change:** `character` appends `ability_allocation_method`, increasing from
arity **11 to 12**. It records how the six base scores were allocated, or null
when they were never allocated. This distinguishes an intentionally allocated
all-10 character from an unallocated character even though scores equal to 10
may be compressed away.

**Adjacent migration (v2→v3):** appends null to the character tuple and rewrites
the root version. Null is the truthful never-allocated state for every v2
document.

### Version 4 — additive ability-increase payload

**Minted by:** B2, the base-plus-contributions unit.

**Change:** `effect` appends `ability`, `amount`, and `maximum`, increasing from
arity **9 to 12**. They carry the ability, signed non-zero increase, and that
increase's own 1–30 cap. Existing provenance remains at positions 7 and 8.
An `ability_increase` requires `sourceRef`.

**Adjacent migration (v3→v4):** appends three nulls to every effect and rewrites
the root version. A v3 document cannot contain `ability_increase`, so null is
correct for all three new positions.

### Version 5 — skill grants with provenance

**Minted by:** skills-with-provenance S-A.

**Change:** `root` appends `skillGrants`, increasing from arity **16 to 17**.
The new `skillGrant` tuple has arity **4**: `ref`, `grantKey`, one-based
`ordinal`, and nullable `skill`. The existing sheet `skillProficiencies`
position remains the derived distinct-skill projection.

**Adjacent migration (v4→v5):** deliberately throws
`ShareWireRetirementError`. A v4 skill list contains bare names with no source,
grant key, or ordinal; migration would have to fabricate provenance. This
single refusal retires every composed v1–v4 path while leaving their schemas
and fixtures frozen.

### Version 6 — equipment provenance

**Minted by:** starting-equipment E-A.

**Change:** `weapon` appends nullable `sourceRef`, increasing from arity
**21 to 22**; `armor` appends the same field, increasing from arity **9 to
10**. The reference uses the classes/sources share-local reference space. Null
means a person added the row.

**Adjacent migration (v5→v6):** appends null to every weapon and every armor
row, reaching armor through the sheet tuple, then rewrites the root version.
All v5 equipment predates rule-minted equipment, so null is the literal
historical state.

### Version 7 — equipment provenance removed

**Minted by:** D69, the equipment-provenance strike.

**Change:** restores the v5 `weapon` arity **21** and `armor` arity **9**.
Their v6 `sourceRef` positions no longer exist; every row is again a plain
weapon or armor row.

**Adjacent migration (v6→v7):** drops the final field from every weapon and
armor tuple, including non-null source references, while preserving each row.
This is the intentional data removal ordered by D69, not an accidental loss.

### Version 8 — items and the expanded effect vocabulary

**Minted by:** AC-1 under D72.

**Change:** `effect` appends five fields—`base`, `ability_1`, `ability_2`,
`allows_shield`, and `weapon_scope`—increasing from arity **12 to 17**. They
carry armor-class-formula values and the shared weapon scope for
`attack_ability_override`, `weapon_attack_bonus`, and `weapon_damage_bonus`.
`root` appends `items`, increasing from arity **17 to 18**. New `item` tuples
have arity **5**: name, description, requires-attunement flag, attuned flag,
and nullable source reference.

**Adjacent migration (v7→v8):** appends five nulls to every effect and one null
items position to the root, then rewrites the version. Pre-v8 documents cannot
carry either payload.

### Version 9 — effect ownership and generated species sources

**Minted by:** AC-2b.

**Change:** `effect` appends `itemRef`, `weaponRef`, and `template_ref`,
increasing from arity **17 to 20**. The first two are zero-based indexes into
the document's item and weapon lists; the last is stable generated-row
identity. `source` appends `generated`, increasing from arity **6 to 7**. The
generated-only species shape is type `species`, null key, and generated true.

**Adjacent migration (v8→v9):** appends null `generated` to every source and
three null ownership/identity positions to every effect, then rewrites the
version.

### Version 10 — manual Armor Class adjustment retired

**Minted by:** AC-4.

**Change:** `sheet` drops its fourth `sheetAdjustment` field, shrinking from
arity **4 to 3**. Numeric manual adjustment now uses the ordinary effect
vocabulary. The inherited `sheetAdjustment` schema object remains in the
inventory for describing and migrating historical tuples, but current
`sheet` no longer reaches it.

**Adjacent migration (v9→v10):** removes the sheet's adjustment position. A
non-zero adjustment becomes an `armor_class_bonus` effect whose amount is the
old value and whose label is the old note or `Manual Armor Class adjustment`;
its provenance/ownership fields remain null. Zero, including zero with a note,
adds no effect. Before conversion, the migration requires an integer adjustment
from −20 through 20 and a note that is either a string or null. Null sheet and
null effects remain valid.

### Version 11 — three structural attunement slots

**Minted by:** D92's attunement-slots unit.

**Change:** `item` drops `attuned`, shrinking from arity **5 to 4**. `root`
appends `attunementSlots`, increasing from arity **18 to 19**. The new tuple
has exactly **3** nullable zero-based item references, making a fourth slot
unrepresentable.

**Adjacent migration (v10→v11):** records the indexes of the first three items
whose historical `attuned` flag is true, removes that flag from every item,
and appends either a three-position, null-padded slot tuple or null when none
were attuned. It then rewrites the version.

### Version 12 — item quantity

**Minted by:** D86's character-item quantity unit.

**Change:** `item` appends `quantity`, increasing from arity **4 to 5**. It is
the positive count of identical possessions represented by that item row.
The root remains arity **19**.

**Adjacent migration (v11→v12):** appends integer `1` to every item, because
each v11 row represented exactly one possession, and rewrites the version.

### Version 13 — ability score overrides

**Minted by:** D83's `ability_override` unit.

**Change:** this is an **accepted-value change**, not an arity change. No tuple
gains a field. `effect.kind` gains the accepted value `ability_override`,
reusing the existing `ability` and `maximum` positions; `maximum` carries the
absolute 1–30 SET score.

**Adjacent migration (v12→v13):** validates the frozen v12 effect-kind domain
so the new kind cannot be smuggled through a same-arity historical tuple, then
rewrites the version.

### Version 14 — spell acquisition provenance

**Minted by:** GF-1's planned grant and spell-selection core.

**Change:** `selection` appends `acquiredAtClassLevel`, increasing from arity
**6 to 7**. Root position 6 remains the `spellbook` list, but its members
change from bare spell-key strings into **6-position spellbook acquisition
tuples**: nullable source `ref`, `ruleKey`, `ordinal`,
`acquiredAtClassLevel`, nullable selected `spellKey`, and nullable placeholder
`spellName`. An acquisition can therefore travel before it is filled.

**Adjacent migration (v13→v14):** appends null to every selection because v13
did not record selection acquisition level. Each v13 spellbook key becomes an
address-less acquisition with that selected key. The selected spell survives;
source/rule/ordinal/level remain null because inventing provenance would be a
data corruption.

## Current v14 shape

Positions are zero-based. The keys, wire types, and arities in this section are
exactly those of the resolved `WIRE_SCHEMA_V14.tuples` object. The tuple
inventory inherits v13, appends selection acquisition level, and adds the
spellbook-acquisition tuple. The meanings faithfully restate the
schema's meaning strings with minor prose normalization. The inventory includes
tuples inherited from older frozen schema objects.

### Root tuple

Arity: **19**.

| Position | Key | Wire type | Meaning |
| ---: | --- | --- | --- |
| 0 | `format` | `literal` | Share format marker |
| 1 | `version` | `integer` | Version for the complete export |
| 2 | `character` | `tuple` | Character root values |
| 3 | `classes` | `list` | Ordered class levels |
| 4 | `sources` | `list` | Standalone sources |
| 5 | `selections` | `list` | Spell selections |
| 6 | `spellbook` | `list` | Addressable Wizard spellbook acquisitions |
| 7 | `preferences` | `list` | Spell preferences |
| 8 | `overrides` | `list` | Grant-rule overrides |
| 9 | `acknowledgements` | `list` | Warning acknowledgements |
| 10 | `loadouts` | `list` | Spell loadouts |
| 11 | `weapons` | `list` | Character weapons |
| 12 | `origin` | `tuple` | Species, traits, and background group |
| 13 | `sheet` | `tuple` | Stored sheet-input group |
| 14 | `effects` | `list` | Character-owned effects |
| 15 | `placeholders` | `list` | Unknown spell metadata |
| 16 | `skillGrants` | `list` | Skill-choice slots with provenance; null when none |
| 17 | `items` | `list` | Character-owned items; null when none |
| 18 | `attunementSlots` | `tuple` | Exactly three nullable zero-based item references; null when empty |

### Character, class, and source tuples

#### `character`

Arity: **12**.

| Position | Key | Wire type | Meaning |
| ---: | --- | --- | --- |
| 0 | `name` | `string` | Character name |
| 1 | `strength` | `integer` | Strength score |
| 2 | `dexterity` | `integer` | Dexterity score |
| 3 | `constitution` | `integer` | Constitution score |
| 4 | `intelligence` | `integer` | Intelligence score |
| 5 | `wisdom` | `integer` | Wisdom score |
| 6 | `charisma` | `integer` | Charisma score |
| 7 | `proficiency_bonus_override` | `integer` | Manual proficiency bonus |
| 8 | `rules_edition_preference` | `string` | Preferred rules edition |
| 9 | `allow_legacy` | `boolean` | Legacy-content opt-in |
| 10 | `notes` | `string` | Opt-in character note |
| 11 | `ability_allocation_method` | `string` | How the six base scores were allocated; null when never allocated |

#### `class`

Arity: **8**.

| Position | Key | Wire type | Meaning |
| ---: | --- | --- | --- |
| 0 | `id` | `integer` | Share-local class reference |
| 1 | `classKey` | `string` | Class catalog key |
| 2 | `subclassKey` | `string` | Subclass catalog key |
| 3 | `level` | `integer` | Class level |
| 4 | `start` | `integer` | Multiclass start position |
| 5 | `ability` | `string` | Spellcasting ability override |
| 6 | `config` | `json` | Class grant configuration |
| 7 | `subclassConfig` | `json` | Subclass grant configuration |

#### `source`

Arity: **7**.

| Position | Key | Wire type | Meaning |
| ---: | --- | --- | --- |
| 0 | `id` | `integer` | Share-local source reference |
| 1 | `type` | `string` | Source kind |
| 2 | `key` | `string` | Source catalog key |
| 3 | `config` | `json` | Source grant configuration |
| 4 | `acquired` | `integer` | Acquisition position |
| 5 | `name` | `string` | Source display name |
| 6 | `generated` | `boolean` | True only for a generated species source with no catalog key |

### Spell-choice and working-state tuples

#### `selection`

Arity: **7**.

| Position | Key | Wire type | Meaning |
| ---: | --- | --- | --- |
| 0 | `ref` | `integer` | Share-local source reference |
| 1 | `ruleKey` | `string` | Grant rule key |
| 2 | `ordinal` | `integer` | Selection ordinal |
| 3 | `spellKey` | `string` | Selected spell key |
| 4 | `spellName` | `string` | Selected spell fallback name |
| 5 | `keep` | `boolean` | Keep selection when invalidated |
| 6 | `acquiredAtClassLevel` | `integer` | Class level at which this choice was acquired |

#### `spellbookAcquisition`

Arity: **6**.

| Position | Key | Wire type | Meaning |
| ---: | --- | --- | --- |
| 0 | `ref` | `integer` | Share-local granting source reference |
| 1 | `ruleKey` | `string` | Grant rule key |
| 2 | `ordinal` | `integer` | Acquisition ordinal |
| 3 | `acquiredAtClassLevel` | `integer` | Wizard class level at acquisition |
| 4 | `spellKey` | `string` | Selected spell key when filled |
| 5 | `spellName` | `string` | Selected placeholder fallback name |

#### `placeholder`

Arity: **2**.

| Position | Key | Wire type | Meaning |
| ---: | --- | --- | --- |
| 0 | `spellKey` | `string` | Unknown spell key |
| 1 | `spellName` | `string` | Unknown spell fallback name |

#### `preference`

Arity: **2**.

| Position | Key | Wire type | Meaning |
| ---: | --- | --- | --- |
| 0 | `spellKey` | `string` | Preferred spell key |
| 1 | `favourite` | `boolean` | Favourite state |

#### `override`

Arity: **2**.

| Position | Key | Wire type | Meaning |
| ---: | --- | --- | --- |
| 0 | `ruleKey` | `string` | Overridden grant-rule key |
| 1 | `value` | `json` | Override value |

#### `acknowledgement`

Arity: **1**.

| Position | Key | Wire type | Meaning |
| ---: | --- | --- | --- |
| 0 | `warning` | `string` | Acknowledged warning key |

#### `loadout`

Arity: **2**.

| Position | Key | Wire type | Meaning |
| ---: | --- | --- | --- |
| 0 | `name` | `string` | Loadout name |
| 1 | `entries` | `list` | Ordered loadout entries |

#### `loadoutEntry`

Arity: **2**.

| Position | Key | Wire type | Meaning |
| ---: | --- | --- | --- |
| 0 | `spellKey` | `string` | Loadout spell key |
| 1 | `role` | `string` | Loadout role |

#### `skillGrant`

Arity: **4**.

| Position | Key | Wire type | Meaning |
| ---: | --- | --- | --- |
| 0 | `ref` | `integer` | Granting source in the classes/sources reference space |
| 1 | `grantKey` | `string` | Stable grant identity within its source |
| 2 | `ordinal` | `integer` | Which grant slot this is, one-based |
| 3 | `skill` | `string` | Chosen skill; null when granted but unfilled |

### Weapon tuples

#### `weapon`

Arity: **21**. The current schema has one variant, described as a v2 weapon
with one tagged range value.

| Position | Key | Wire type | Meaning |
| ---: | --- | --- | --- |
| 0 | `name` | `string` | Weapon name |
| 1 | `damage_dice` | `string` | Retired legacy primary-damage slot |
| 2 | `damage_type` | `string` | Damage type |
| 3 | `versatile_damage_dice` | `string` | Retired legacy versatile-damage slot |
| 4 | `ammunition_kind` | `string` | Ammunition kind |
| 5 | `range` | `tuple` | Tagged weapon range |
| 6 | `mastery_property` | `string` | Mastery property |
| 7 | `other_properties` | `string` | Other weapon properties |
| 8 | `notes` | `string` | Weapon notes |
| 9 | `finesse` | `boolean` | Finesse property |
| 10 | `heavy` | `boolean` | Heavy property |
| 11 | `light` | `boolean` | Light property |
| 12 | `loading` | `boolean` | Loading property |
| 13 | `reach` | `boolean` | Reach property |
| 14 | `thrown` | `boolean` | Thrown property |
| 15 | `two_handed` | `boolean` | Two-Handed property |
| 16 | `ammunition` | `boolean` | Ammunition property |
| 17 | `mastery_selected` | `boolean` | Selected mastery state |
| 18 | `proficiency_category` | `string` | Simple or martial category |
| 19 | `damage` | `damage` | Typed primary damage |
| 20 | `versatile_damage` | `damage` | Typed versatile damage |

#### `weaponRange`

Three variants are present in the current schema:

| Variant | Arity | Position | Key | Wire type | Meaning |
| --- | ---: | ---: | --- | --- | --- |
| `none` | 1 | 0 | `kind` | `literal` | `none` discriminator; melee weapon with no range |
| `ranged` | 3 | 0 | `kind` | `literal` | `ranged` discriminator |
| `ranged` | 3 | 1 | `near` | `integer` | Near range in feet |
| `ranged` | 3 | 2 | `far` | `integer` | Far range in feet |
| `legacy` | 3 | 0 | `kind` | `literal` | `legacy` discriminator |
| `legacy` | 3 | 1 | `normal` | `integer` | v1 normal range in feet |
| `legacy` | 3 | 2 | `long` | `integer` | v1 long range in feet |

`legacy` is decode-only preservation of a v1 pair that the structured range
domain cannot represent. The current encoder does not mint it.

#### `damage`

Two variants are present:

| Variant | Arity | Position | Key | Wire type | Meaning |
| --- | ---: | ---: | --- | --- | --- |
| Absence | 1 | 0 | `kind` | `string` | Not-recorded or not-applicable absence kind |
| Value | 2 | 0 | `kind` | `string` | Dice, flat, or custom damage kind |
| Value | 2 | 1 | `payload` | `json` | Dice string, flat integer, or custom text |

### Origin tuples

#### `origin`

Arity: **3**.

| Position | Key | Wire type | Meaning |
| ---: | --- | --- | --- |
| 0 | `species` | `tuple` | Character species |
| 1 | `speciesTraits` | `list` | Ordered species traits |
| 2 | `background` | `tuple` | Character background |

#### `species`

Arity: **5**.

| Position | Key | Wire type | Meaning |
| ---: | --- | --- | --- |
| 0 | `name` | `string` | Species name |
| 1 | `creature_type` | `string` | Creature type |
| 2 | `size` | `string` | Size |
| 3 | `notes` | `string` | Species notes |
| 4 | `base_speed_feet` | `integer` | Base speed in feet |

#### `speciesTrait`

Arity: **8**.

| Position | Key | Wire type | Meaning |
| ---: | --- | --- | --- |
| 0 | `name` | `string` | Trait name |
| 1 | `description` | `string` | Trait description |
| 2 | `effect_kind` | `string` | Legacy effect kind |
| 3 | `effect_damage_type` | `string` | Legacy effect damage type |
| 4 | `notes` | `string` | Trait notes |
| 5 | `effect_hit_points_flat` | `integer` | Legacy flat hit-point effect |
| 6 | `effect_hit_points_per_level` | `integer` | Legacy per-level hit-point effect |
| 7 | `effect_speed_bonus_feet` | `integer` | Legacy speed effect in feet |

#### `background`

Arity: **11**.

| Position | Key | Wire type | Meaning |
| ---: | --- | --- | --- |
| 0 | `name` | `string` | Background name |
| 1 | `ability_score_1` | `string` | First ability score |
| 2 | `ability_score_2` | `string` | Second ability score |
| 3 | `ability_score_3` | `string` | Third ability score |
| 4 | `feat_name` | `string` | Feat name |
| 5 | `skill_proficiency_1` | `string` | First skill proficiency |
| 6 | `skill_proficiency_2` | `string` | Second skill proficiency |
| 7 | `tool_proficiency` | `string` | Tool proficiency |
| 8 | `equipment_option_a` | `string` | Equipment option A |
| 9 | `equipment_option_b` | `string` | Equipment option B |
| 10 | `notes` | `string` | Background notes |

### Sheet tuples

#### `sheet`

Arity: **3**.

| Position | Key | Wire type | Meaning |
| ---: | --- | --- | --- |
| 0 | `armor` | `list` | Worn and held armor |
| 1 | `hitPointRolls` | `list` | Recorded hit-point rolls |
| 2 | `skillProficiencies` | `list` | Skill proficiencies |

#### `armor`

Arity: **9**.

| Position | Key | Wire type | Meaning |
| ---: | --- | --- | --- |
| 0 | `name` | `string` | Armor name |
| 1 | `slot` | `string` | Worn or held slot |
| 2 | `category` | `string` | Armor category |
| 3 | `dex_bonus` | `string` | Dexterity contribution kind |
| 4 | `armor_class` | `integer` | Base Armor Class |
| 5 | `dex_bonus_max` | `integer` | Dexterity contribution cap |
| 6 | `strength_requirement` | `integer` | Strength requirement |
| 7 | `stealth_disadvantage` | `boolean` | Stealth disadvantage state |
| 8 | `notes` | `string` | Armor notes |

#### `hitPointRoll`

Arity: **3**.

| Position | Key | Wire type | Meaning |
| ---: | --- | --- | --- |
| 0 | `className` | `string` | Class-name reference |
| 1 | `classLevel` | `integer` | Class level |
| 2 | `value` | `integer` | Recorded die result |

#### `sheetAdjustment` (historical, unreachable from current `sheet`)

Arity: **2**. This schema object is inherited into v14, but v10 removed the
only current tuple position that referred to it.

| Position | Key | Wire type | Meaning |
| ---: | --- | --- | --- |
| 0 | `value` | `integer` | Armor Class adjustment |
| 1 | `note` | `string` | Adjustment explanation |

### Effect tuple

#### `effect`

Arity: **20**.

| Position | Key | Wire type | Meaning |
| ---: | --- | --- | --- |
| 0 | `kind` | `string` | Mechanical effect kind |
| 1 | `label` | `string` | Effect label |
| 2 | `damage_type` | `string` | Effect damage type |
| 3 | `notes` | `string` | Effect notes |
| 4 | `hit_points_flat` | `integer` | Flat hit-point modifier |
| 5 | `hit_points_per_level` | `integer` | Per-level hit-point modifier |
| 6 | `speed_bonus_feet` | `integer` | Speed modifier in feet |
| 7 | `sourceRef` | `integer` | Share-local source reference |
| 8 | `sourceSubclass` | `boolean` | Reference selects subclass root |
| 9 | `ability` | `string` | Increased ability for `ability_increase` |
| 10 | `amount` | `integer` | Signed non-zero increase amount |
| 11 | `maximum` | `integer` | Increase's own score cap, 1–30 |
| 12 | `base` | `integer` | `armor_class_formula` flat base |
| 13 | `ability_1` | `string` | `armor_class_formula` first ability |
| 14 | `ability_2` | `string` | `armor_class_formula` optional second ability |
| 15 | `allows_shield` | `boolean` | `armor_class_formula` shield eligibility |
| 16 | `weapon_scope` | `string` | Weapon scope for attack-ability override, attack bonus, or damage bonus |
| 17 | `itemRef` | `integer` | Zero-based index into this document's items array |
| 18 | `weaponRef` | `integer` | Zero-based index into this document's weapons array |
| 19 | `template_ref` | `string` | Stable generated template-row identity |

### Item and attunement tuples

#### `item`

Arity: **5**.

| Position | Key | Wire type | Meaning |
| ---: | --- | --- | --- |
| 0 | `name` | `string` | Item name |
| 1 | `description` | `string` | Item description |
| 2 | `requires_attunement` | `boolean` | Whether the item needs attunement at all |
| 3 | `sourceRef` | `integer` | Share-local source reference; null when a person added it |
| 4 | `quantity` | `integer` | Positive count of identical possessions in this row |

#### `attunementSlots`

Arity: **3**.

| Position | Key | Wire type | Meaning |
| ---: | --- | --- | --- |
| 0 | `slot1ItemRef` | `integer` | Zero-based item reference for attunement slot 1 |
| 1 | `slot2ItemRef` | `integer` | Zero-based item reference for attunement slot 2 |
| 2 | `slot3ItemRef` | `integer` | Zero-based item reference for attunement slot 3 |

## D41 immutability rules

D41 makes the registry an append-only historical contract:

- A mint adds a new version module and a new `SHARE_SCHEMAS` entry. It never
  edits an existing version's tuple order, field meaning, accepted arity, or
  accepted value domain.
- Every schema object is deeply frozen at runtime. Historical modules use
  literal field inventories or references to already-frozen inventories so a
  live codec constant cannot silently rewrite history.
- One root version governs the entire export.
- Every historical version has exactly one adjacent migration in `MIGRATIONS`.
  The decoder composes these steps; migrations do not skip versions. A
  deliberate refusal such as v4→v5 is still an explicit adjacent migration.
- Every registry version has an independently hand-frozen fragment fixture.
  Fixtures are not regenerated from the production encoder. Codec position
  goldens and registry fixtures must remain capable of catching a field-order,
  arity, or meaning change.
- Registry keys and fixture keys are compared, and tests verify that every
  reachable object is frozen. Historical fingerprints add another independent
  guard for selected schema modules.

## How to mint the next version

The v9, v10, v11, v12, v13, and v14 mints followed this discipline:

1. Add `src/sharing/wire-schemas/vN.ts`. Build the new schema from the previous
   frozen inventory, replacing only changed tuple objects. Do not edit any
   older version file.
2. Import the new schema and append its entry to `SHARE_SCHEMAS`.
3. Add the single adjacent `migrateVPreviousToVN` function. Validate against
   the previous frozen schema, preserve every surviving value explicitly, and
   register it under the previous version in `MIGRATIONS`.
4. Bump `CURRENT_CHARACTER_SHARE_VERSION` to `N`.
5. Hand-author the codec positional golden and the registry fragment/shape
   fixture. Do not obtain either expectation from the production encoder or
   migration output.
6. Update `tests/browser/sharing.spec.ts`: assert the new root version and
   extend its mint-history narration with the unit, changed tuple, new arity,
   and field meaning.
7. Refresh `docs/sharing/minimal-share-example.json` when the readable/current
   shape changed, along with any expectation that independently pins that
   example.
8. Update this document in the same mint.
