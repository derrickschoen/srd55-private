# D91 resource maxima storage and sheet design

**Status:** implementation design only. This document changes no source, test,
migration, or seed data.

## Decision summary

Add a dedicated `class_resources` catalog table containing one absolute maximum
for each supported class resource at each class level. Seed eight complete
20-level ladders from the committed SRD 5.2.1 class tables: Barbarian Rages,
Cleric Channel Divinity, Druid Wild Shape, Fighter Second Wind, Monk Focus
Points, Paladin Channel Divinity, Ranger Favored Enemy, and Sorcerer Sorcery
Points. Keep shared spell slots and Pact Magic on the existing spell-slot path;
do not duplicate them into `class_resources`.

The sheet computes transient maxima from those catalog rows and the character's
class levels. It stores no current/spent value. A known positive maximum renders
as its number plus exactly that many inert, empty boxes. A missing or unsupported
maximum renders no number and no boxes; it prints a specific absence sentence.

This is the direct implementation of `.claude/decisions.md` **D91**: maxima come
from seeded class tables, the boxes are empty, and the multiclass slot table is
used. It preserves **D88** because spending remains pencil state and no current
resource count is stored. It applies **D33** through a strict
computed-or-absent-and-stated result type: a missing source never becomes zero,
a remembered value, or a plausible fallback. These are the only decisions this
document relies on for the resource rule. Print layout also follows verified
**D89**: the existing sheet route is the one-column printable sheet.

## 1. Verified current state

### 1.1 Progression storage has no non-spell resource maxima

`class_progressions` is one row per `(class_definition_id, class_level)`, with a
1–20 CHECK and a unique index (`db/schema/catalog-classes.ts:255-290`). Its data
columns are exactly `cantrips_known`, `prepared_count`, `slots`, `pact_slots`,
and `grant_rules` (`db/schema/catalog-classes.ts:263-272`). There is no Rage,
Channel Divinity, Wild Shape, Second Wind, Focus, Favored Enemy, or Sorcery
Points maximum.

The existing spell seed already writes straight-class `slots` and `pact_slots`
for every level (`src/rules/class-progression-lookup.ts:692-724`). The canonical
shared and Pact slot ladders, plus the combinators that resolve them, are in
`src/rules/spell-slots.ts:18-111`. D91 must reuse that path, not create a second
copy of spell slots in a new resource table.

### 1.2 The effect vocabulary is not a resource model

The base effect set is damage resistance, HP modifier, speed, and ability
increase (`src/domain/enums.ts:700-706`). Character effects add ability/AC and
weapon modifiers (`src/domain/enums.ts:743-752`); class/feature templates add
Extra Attack but still no resource or uses kind
(`src/domain/enums.ts:836-856`). The authoring payload union likewise has no
resource payload (`src/authoring/effect-forms.ts:11-56`), and its only
feature-only form is Extra Attack (`src/authoring/effect-forms.ts:380-403`).

Therefore an effect-kind extension would be a new model, schema payload, form,
and character-side copy path—not reuse of an existing resource abstraction.

### 1.3 The sheet is a transient read model rendered twice

The pure rules module explicitly computes rather than stores sheet facts and
requires sourced formulas (`src/rules/sheet.ts:1-29`). Level-keyed class content
is resolved against the level in that class, not total character level
(`src/rules/sheet.ts:52-78`); Martial Arts demonstrates the convention
(`src/rules/sheet.ts:1190-1242`). `CharacterSheetBuilder` assembles one transient
projection (`src/queries/character-sheet-builder.ts:90-110`), and
`sheet-view.ts` turns it into both labelled visible rows and structured JSON
(`src/ui/screens/sheet/sheet-view.ts:13-42`, `:723-837`).

The visible sheet uses sections of labelled definition-list rows
(`src/ui/screens/sheet/sheet-view.ts:262-320`, `:994-1024`). Its print CSS already
switches the same route to one column and suppresses chrome
(`src/ui/screens/sheet/styles.css:100-149`). Print-only empty current-HP and XP
fields establish the paper-entry DOM and CSS conventions
(`src/ui/screens/sheet/sheet-view.ts:1045-1108`,
`src/ui/screens/sheet/styles.css:152-183`). Resource boxes differ only in being
visible on screen too; they remain non-interactive in both media.

## 2. Licensed data inventory

### 2.1 Source boundary and inventory rule

The committed source is SRD 5.2.1 under CC-BY-4.0
(`docs/srd/SOURCE.md:8-17`). `class-level-tables.txt` is the checksummed,
complete level 1–20 Features-table extract for all twelve classes
(`docs/srd/SOURCE.md:40-48`). This design uses only that committed extract, the
committed full text for feature-text classification, and the committed
multiclass extract. It proposes no number from memory or from a non-SRD book.

For D91, a **non-spell class-table resource** means a replenishing use or point
maximum printed in its own class Features-table column. Spell slots are the
additional resource family because D91 names the multiclass slot table
explicitly. Dice progressions, known/prepared counts, choices, movement, and
damage progressions are not spendable maxima. Section 2.4 separately inventories
base-class limits printed only in a `Class Features` cell or feature prose; it
does not mislabel those as dedicated numeric columns.

The notation `L1–2 = 0` below means the source prints an em dash before the
feature exists. Zero is retained in the seeded ladder as the sourced
not-yet-acquired state; the sheet omits a zero row. It is not an unknown.

### 2.2 Exact per-class inventory

| Class | D91 class-table resource maximum by class level | Spell resource | Exact source |
|---|---|---|---|
| Barbarian | **Rages:** L1–2 2; L3–5 3; L6–11 4; L12–16 5; L17–20 6 | None | Rages header and all 20 rows: `docs/srd/source/class-level-tables.txt:13-34`; feature text points back to that column: `docs/srd/full/srd-5.2.1.txt:1758-1770` |
| Bard | No fixed use-count column. `Bardic Die` is a die-size progression, not the number of uses. | Shared spell slots, straight-class rows L1–20 | Table: `docs/srd/source/class-level-tables.txt:37-61`; feature-text maximum is Charisma modifier, minimum one: `docs/srd/full/srd-5.2.1.txt:1949-2002` |
| Cleric | **Channel Divinity:** L1 0; L2–5 2; L6–17 3; L18–20 4 | Shared spell slots, straight-class rows L1–20 | Column and values: `docs/srd/source/class-level-tables.txt:64-86`; prose confirms the table is the maximum source: `docs/srd/full/srd-5.2.1.txt:2266-2275` |
| Druid | **Wild Shape:** L1 0; L2–5 2; L6–16 3; L17–20 4 | Shared spell slots, straight-class rows L1–20 | Column and values: `docs/srd/source/class-level-tables.txt:89-113`; prose: `docs/srd/full/srd-5.2.1.txt:2570-2585` |
| Fighter | **Second Wind:** L1–3 2; L4–9 3; L10–20 4 | None from the base class; the seeded Eldritch Knight subclass has the existing third-caster path | Column and values: `docs/srd/source/class-level-tables.txt:116-138`; prose: `docs/srd/full/srd-5.2.1.txt:2915-2926` |
| Monk | **Focus Points:** L1 0; L2–20 equal the Monk level (2, 3, …, 20) | None | Column and values: `docs/srd/source/class-level-tables.txt:141-164`; prose defines the pool and recovery: `docs/srd/full/srd-5.2.1.txt:3052-3065` |
| Paladin | **Channel Divinity:** L1–2 0; L3–10 2; L11–20 3 | Shared spell slots, straight-class rows L1–20 | Column and values: `docs/srd/source/class-level-tables.txt:167-190`; prose: `docs/srd/full/srd-5.2.1.txt:3267-3279` |
| Ranger | **Favored Enemy:** L1–4 2; L5–8 3; L9–12 4; L13–16 5; L17–20 6 | Shared spell slots, straight-class rows L1–20 | Column and values: `docs/srd/source/class-level-tables.txt:193-216`; prose identifies these as slot-free Hunter's Mark casts: `docs/srd/full/srd-5.2.1.txt:3522-3530` |
| Rogue | No expendable maximum column. `Sneak Attack` is a damage-dice progression, not a pool. | None from the base class; the seeded Arcane Trickster subclass has the existing third-caster path | `docs/srd/source/class-level-tables.txt:219-241` |
| Sorcerer | **Sorcery Points:** L1 0; L2–20 equal the Sorcerer level (2, 3, …, 20) | Shared spell slots, straight-class rows L1–20 | Column and values: `docs/srd/source/class-level-tables.txt:244-273`; prose states the table value is the cap: `docs/srd/full/srd-5.2.1.txt:3952-3967` |
| Warlock | No non-spell maximum column. | **Pact Magic:** L1 1 slot at level 1; L2 2@1; L3–4 2@2; L5–6 2@3; L7–8 2@4; L9–10 2@5; L11–16 3@5; L17–20 4@5 | `docs/srd/source/class-level-tables.txt:274-298`; Pact recovery and interpretation: `docs/srd/full/srd-5.2.1.txt:4289-4297` |
| Wizard | No non-spell maximum column. | Shared spell slots, straight-class rows L1–20 | `docs/srd/source/class-level-tables.txt:299-324` |

This enumeration also identifies every non-resource class-table column that
could be misclassified. Bardic Die, Rage Damage, Weapon Mastery, Martial Arts,
Unarmored Movement, Sneak Attack, Eldritch Invocations, cantrips, and prepared
spells describe sizes, bonuses, movement, choices, or repertoire—not empty boxes
for expended units.

### 2.3 Shared spell-slot maxima

Shared slots are indexed by **effective multiclass caster level**, not total
character level and not the sum of straight-class slot rows. The SRD says to add
all Bard, Cleric, Druid, Sorcerer, and Wizard levels and half Paladin and Ranger
levels rounded up, then consult the multiclass table
(`docs/srd/source/multiclassing.txt:77-97`). The exact slot vectors, levels 1–20,
are:

| Effective caster level | Slots by spell level (1st through 9th; omitted tail is zero) |
|---:|---|
| 1 | 2 |
| 2 | 3 |
| 3 | 4, 2 |
| 4 | 4, 3 |
| 5 | 4, 3, 2 |
| 6 | 4, 3, 3 |
| 7 | 4, 3, 3, 1 |
| 8 | 4, 3, 3, 2 |
| 9 | 4, 3, 3, 3, 1 |
| 10 | 4, 3, 3, 3, 2 |
| 11–12 | 4, 3, 3, 3, 2, 1 |
| 13–14 | 4, 3, 3, 3, 2, 1, 1 |
| 15–16 | 4, 3, 3, 3, 2, 1, 1, 1 |
| 17 | 4, 3, 3, 3, 2, 1, 1, 1, 1 |
| 18 | 4, 3, 3, 3, 3, 1, 1, 1, 1 |
| 19 | 4, 3, 3, 3, 3, 2, 1, 1, 1 |
| 20 | 4, 3, 3, 3, 3, 2, 2, 1, 1 |

The committed full-text table is at
`docs/srd/full/srd-5.2.1.txt:1638-1665`; the existing in-code transcription is
`src/rules/spell-slots.ts:18-39`. The existing table remains the single
computation source.

### 2.4 Feature-cell/prose limits: licensed, but not numeric resource columns

This is the complete base-class inventory of replenishing pools and one-use
gates that could otherwise be mistaken for one of the eight dedicated numeric
columns. `0` means the feature is not yet acquired. These values are licensed
and extractable, but they are not silently folded into this unit's fixed-column
storage:

| Class | Feature-cell/prose maximum by class level | Exact source |
|---|---|---|
| Barbarian | **Persistent Rage recovery:** L1–14 0; L15–20 1 use per Long Rest to restore the existing Rage pool | `docs/srd/full/srd-5.2.1.txt:1897-1901` |
| Bard | **Bardic Inspiration:** L1–20 `max(1, Charisma modifier)`; the table's Bardic Die column is only die size | `docs/srd/full/srd-5.2.1.txt:1994-2002` |
| Cleric | **Divine Intervention:** L1–9 0; L10–20 1, normally per Long Rest; at L20 choosing Wish changes its recovery to 2d4 Long Rests rather than changing the maximum | `docs/srd/full/srd-5.2.1.txt:2339-2348`, `:2365-2371` |
| Druid | **Wild Resurgence conversion gate:** L1–4 0; L5–20 1 use per Long Rest for Wild Shape-to-slot conversion. **Nature Magician conversion gate:** L1–19 0; L20 1 use per Long Rest | `docs/srd/full/srd-5.2.1.txt:2618-2625`, `:2657-2670` |
| Fighter | **Action Surge:** L1 0; L2–16 1; L17–20 2. **Indomitable:** L1–8 0; L9–12 1; L13–16 2; L17–20 3. These counts also appear parenthetically in the table's free-text `Class Features` cells, not in numeric columns | `docs/srd/source/class-level-tables.txt:120-135`; `docs/srd/full/srd-5.2.1.txt:2928-2945` |
| Monk | **Uncanny Metabolism:** L1 0; L2–20 1 use per Long Rest to restore the existing Focus pool | `docs/srd/full/srd-5.2.1.txt:3089-3095` |
| Paladin | **Lay On Hands:** L1–20 `5 × Paladin level` healing points. **Paladin's Smite slot-free cast:** L1 0; L2–20 1 per Long Rest. **Faithful Steed slot-free cast:** L1–4 0; L5–20 1 per Long Rest | `docs/srd/full/srd-5.2.1.txt:3206-3211`, `:3263-3266`, `:3334-3339` |
| Ranger | **Tireless:** L1–9 0; L10–20 `max(1, Wisdom modifier)`. **Nature's Veil:** L1–13 0; L14–20 `max(1, Wisdom modifier)` | `docs/srd/full/srd-5.2.1.txt:3544-3553`, `:3563-3570` |
| Rogue | **Stroke of Luck:** L1–19 0; L20 1 per Short or Long Rest | `docs/srd/full/srd-5.2.1.txt:3816-3821` |
| Sorcerer | **Innate Sorcery:** L1–20 2. **Sorcerous Restoration:** L1–4 0; L5–20 1 use per Long Rest to recover Sorcery Points | `docs/srd/full/srd-5.2.1.txt:3936-3951`, `:3970-3974` |
| Warlock | **Magical Cunning:** L1 0; L2–20 1 per Long Rest. **Contact Patron slot-free cast:** L1–8 0; L9–20 1 per Long Rest. **Mystic Arcanum:** one independent use for each acquired arcanum—level 6 spell at Warlock 11, plus level 7 at 13, level 8 at 15, and level 9 at 17 | `docs/srd/full/srd-5.2.1.txt:4330-4335`, `:4351-4374` |
| Wizard | **Arcane Recovery:** L1–20 1 per Long Rest, recovering a combined slot level of `ceil(Wizard level / 2)`, never level 6+. **Signature Spells:** L1–19 0; at L20, one slot-free cast per chosen level-3 spell per Short or Long Rest (two separately chosen spells) | `docs/srd/full/srd-5.2.1.txt:4671-4683`, `:4763-4771` |

This boundary covers base classes only. A bundled or user-authored subclass can
introduce another maximum, but subclass selection and feature effects do not
currently carry a general resource contract; such maxima are subject to the
same explicit absence, not inferred from a class name.

Features that merely spend or restore one of the already inventoried pools are
not additional maxima: Tactical Mind spends Second Wind, Monk techniques spend
Focus, and Wild Companion spends Wild Shape. Passive “once per turn” limits are
also cadence rules, not replenishing pools. This is why neither category gets a
second box track.

Modelling the table above requires typed formula/gate variants over ability
modifiers, class levels, chosen spells, and recovery rules—not an integer
pretending all those shapes are alike. D91's first implementation therefore
prints one section-level disclosure: **“Feature-text and subclass resource
maxima are not modelled here; use the printed feature text.”** It contains no
number and is present on screen and paper. A later feature-resource unit may
model the cited rules without changing `class_resources`' fixed numeric-column
semantics.

### 2.5 Absent-and-stated list

The following never receive a recited number:

1. A homebrew/imported class or subclass with no locally supplied, modelled
   resource progression. No non-SRD maximum is licensed for the bundle. Render:
   **“Resource maxima are not recorded for [class].”** The class name remains
   marked as unverified free text.
2. A resource known to the bundled inventory whose exact current-level row is
   missing or invalid. Render: **“[resource] maximum is unavailable because the
   level [N] source row is missing or invalid.”** Never fall back to the previous
   level and never print zero.
3. The feature-cell/prose inventory in §2.4 until a sourced feature-resource
   design lands. Render the single section-level disclosure, not per-feature
   guessed rows or boxes.
4. Any class, subclass, or feature outside committed SRD 5.2 CC-BY content.
   Nothing from a commercial rulebook, memory, or web summary may seed the
   table. Such content remains user-supplied and absent unless a future local
   import contract explicitly carries it.

A bundled class whose table affirmatively has no D91 resource—Rogue is the
clearest case—is **known none**, not absent. It gets no warning and no fake
“0 uses” row.

## 3. Storage proposal

### 3.1 Alternatives

| Option | Strengths | Problems | Decision |
|---|---|---|---|
| **(a) New columns on `class_progressions`** | Exact-level lookup is already present; nullable columns can distinguish unrelated classes; straight-class seed loop already visits all 20 levels. | At least seven sparse, resource-named columns are needed immediately; every future resource requires another schema/migration/contracts/snapshot mint; multiple resources make the row wider for all 240 class levels; spellcasting concerns and sheet resource concerns become coupled. | Reject. It works, but bakes the current SRD column names into the central spell progression row. |
| **(b) New `class_resources` table** | One row-shaped fact per class/resource/level; supports multiple resources without widening unrelated rows; mirrors the absolute, level-keyed `class_weapon_mastery_counts` convention (`db/schema/weapons.ts:464-522`); can be catalog-scoped and excluded from character backup/share. | Adds a join and a new table contract; completeness must distinguish known-none classes from missing seed data. | **Recommend.** It states the multiplicity honestly and keeps spell slots on their existing specialized path. |
| **(c) Extend effect kinds** | Could eventually let feats/subclasses alter a character resource. | Current effects are standing character modifiers, not class-level catalog ladders. This option would require a new payload, CHECK arms, authoring forms, character copies, source-instance lifecycle, backup/share behavior, and combination rules before one maximum could render. It would also tempt storage of current/spent state contrary to D88. | Reject for D91. A future feature-resource change may add a typed modifier after base maxima exist. |

### 3.2 Recommended table contract

Create `class_resources` with:

| Column | Contract |
|---|---|
| `id` | integer primary key, autoincrement |
| `class_definition_id` | non-null branded class id; FK to `class_definitions.id` with cascade delete |
| `class_level` | non-null integer, CHECK `BETWEEN 1 AND 20` |
| `resource_kind` | non-null closed seeded vocabulary: `rage`, `channel_divinity`, `wild_shape`, `second_wind`, `focus_points`, `favored_enemy`, `sorcery_points` |
| `maximum` | non-null integer, CHECK via the existing `integerAtLeast('maximum', 0)` helper (`typeof(maximum) = 'integer' AND maximum >= 0`) |
| `created_at`, `updated_at` | existing datetime convention |

Add `UNIQUE(class_definition_id, class_level, resource_kind)`. Do not store a
display label; an exhaustive, no-default mapping from the closed seeded kind
produces `Rages`, `Channel Divinity`, and so on. This table is bundle-owned class
catalog content, not a user-authored class-resource vocabulary. Imported classes
do not write it in this unit and receive the explicit absence in §2.5; a future
class-resource import must use the project's known-plus-passthrough shape rather
than widening this seeded-only claim by accident.

Seed all 20 rows for each of the eight class/resource ladders—**160 rows**. A
pre-feature em dash becomes zero, so a complete ladder has no gaps. The reader
uses exact equality on `class_level`; it must not use the mastery table's
`<= / latest row` behavior. A stale maximum is a wrong number under D33.

The parser reads the already checksummed
`docs/srd/source/class-level-tables.txt`; no new licensed text is needed. Its
result is a twelve-class manifest keyed by the bundled class `content_key`, with
an expected resource-kind set (possibly empty) and the 20-row ladder for every
expected kind. That manifest—not a guess from a display name—distinguishes
known-none classes such as Bard, Rogue, Warlock, and Wizard from missing
Barbarian content and also lets a deletion of an entire 20-row ladder resolve
as absent. It must:

- enumerate all twelve class headings;
- recognize the eight resource-column/class pairs above;
- return all 20 levels for each recognized pair;
- reject a duplicate/missing level, non-integer count, unexpected non-dash
  value before acquisition, or unexpected resource-like table header;
- preserve zero as known-not-acquired, not absence.

The boot completeness guard compares the exact expected
`(content_key, resource_kind, class_level)` tuple set and each maximum, not only
`count(*) = 160`. An unexpected class/kind pairing cannot compensate for a
missing Rage row. If any tuple is missing, extra, attached to the wrong bundled
class, or has the wrong value, the idempotent bundled-content repair replaces
the bundled rows from the manifest rather than declaring a plausible-looking
partial catalog healthy. Rows for imported classes remain untouched.

### 3.3 Schema, contracts, and snapshots

The table belongs in a focused `db/schema/class-resources.ts`, exported from
`db/schema/index.ts` and related to `class_definitions`. Register it in
`src/domain/contracts/tables.ts` as `catalog_class` with `snapshot`, direct
backup, backup, share, and backup-reference all false, matching
`class_progressions` (`src/domain/contracts/tables.ts:631-650`) and
`class_weapon_mastery_counts` (`src/domain/contracts/tables.ts:729-745`).

Because a parser writes these rows, include `class_resources` in the native row
contract set; that is the convention documented for parser-written mastery
tables (`src/domain/contracts/rows.ts:532-568`). Refine `class_level` to the
existing 1–20 class-level contract, `resource_kind` to its exact seeded enum,
and `maximum` to a non-negative integer. Regenerate column/reference facts and
the checked schema SQL through the existing project commands, then update the
schema shape, CHECK-constraint, FK, unique-index, autoincrement, migration, and
schema-signature snapshots. Expectations must be reviewed values, never
regenerated from the implementation output as their own oracle.

The migration is: **next free migration number at dispatch time**. The mint
lane owns numbering; LU-1/LU-2 may take 0025+ first. At the observed dispatch
commit the registered chain ends at 0024
(`src/db/migrations.ts:23-27`, `:273-288`), but this design does not reserve
0025.

## 4. Computation seam

### 4.1 Pure result type in `src/rules/sheet.ts`

Add resource computation beside the other pure, source-carrying sheet rules,
not in the view and not in a command. The input extends each
`SheetClassLevels`-shaped entry with:

- the class content key/id and its own class level;
- an exact `resource_kind -> stored maximum` map for that level, or an explicit
  read failure;
- the existing progression type/subclass caster contribution needed for slots.

Return a closed union, not `number | undefined`:

```ts
type SheetResourceMaximum =
  | {
      readonly status: 'computed';
      readonly id: string;
      readonly kind: ClassResourceKind | 'spell_slot' | 'pact_slot';
      readonly class_definition_id: ClassDefinitionId | null;
      readonly class_level: ClassLevel | null;
      readonly spell_level: SpellLevel | null;
      readonly maximum: PositiveResourceMaximum;
      readonly formula: string;
    }
  | {
      readonly status: 'absent';
      readonly id: string;
      readonly reason:
        | 'resource_catalog_not_recorded'
        | 'resource_level_row_missing_or_invalid'
        | 'feature_text_maximum_not_modelled'
        | 'spell_progression_missing_or_invalid';
      readonly detail: string;
    };
```

The exact names may change during implementation, but these states may not be
collapsed. `computed.maximum` is positive: stored zero is consumed by the
resolver as “feature not acquired” and produces no row. `absent` has no numeric
field, so neither the renderer nor structured JSON can accidentally print a
fallback.

Resolve fixed class resources independently at each class's own level. Never
sum resources across classes. In particular, Cleric Channel Divinity and
Paladin Channel Divinity are stored and rendered as class-qualified rows; the
source repeatedly says “this class's Channel Divinity,” and no licensed source
here says the two maxima combine.

### 4.2 Lookup and builder

Extend `SheetContentLookup` with one exact-level `class_resources` read for each
class and carry the parser-derived expected-kind set for a recognized bundled
`content_key`. Preserve raw invalid/missing state long enough for the pure
resolver to return `absent`; do not filter a bad row into silence. An unknown
content key is `resource_catalog_not_recorded`; an empty expected set for a
recognized bundled key is known none; an expected kind without its exact row is
`resource_level_row_missing_or_invalid`. `CharacterSheetBuilder` adds
`resources: readonly SheetResourceMaximum[]` to the one transient
`CharacterSheet` projection and includes resource absences in that same list,
not in a separate independently built gap list.

### 4.3 Spell-slot interaction

Do not insert spell slots into `class_resources`.

1. For a character with exactly one **base-class** Spellcasting contribution
   and no subclass caster contribution, decode the exact current-level
   `class_progressions.slots` row. It is already seeded from that class's table.
2. With two or more Spellcasting contributions, **or with any subclass caster
   contribution even when it is the only one**, construct the existing typed
   `CasterContribution`s and call the existing `slots()` combinator. Do not add
   the per-class JSON slot maps. The latter produces plausible but wrong totals.
3. Include seeded subclass caster contributions through their stored
   progression-type path; do not infer them from a class or subclass name in the
   sheet. A sole Eldritch Knight or Arcane Trickster contribution is the negative
   case that prevents the straight-class shortcut from swallowing third-caster
   slots.
4. Resolve Pact Magic separately from exact `pact_slots`/the existing
   `pactMagic()` path. Pact slots remain their own row, labelled with both count
   and slot level. They may cast compatible spells, but their maxima do not merge
   into the shared slot buckets; the SRD states that interaction separately
   (`docs/srd/full/srd-5.2.1.txt:1629-1636`).
5. If a required progression row, JSON payload, or progression type is missing
   or invalid, render `spell_progression_missing_or_invalid`. Do not catch the
   error and return `{}`; an empty slot table asserts zero slots.

The shared slot output is one computed row per positive spell level. For
example, effective caster level 5 produces three rows: first-level maximum 4,
second-level maximum 3, and third-level maximum 2. Pact Magic produces one row
such as “Pact slots (level 3): 2.”

## 5. Sheet and print rendering

### 5.1 Visible structure

Add a `Resources` section to `sheetSections`, after `Core numbers` and before
`Ability scores`. This keeps the facts high on the reference sheet without
altering the existing one-projection/two-renderings structure.

For each `computed` resource:

- the `<dt>` is the class-qualified label for class resources, for example
  `Barbarian — Rages`; shared slots use `Level 3 spell slots`, and Pact uses
  `Pact slots — level 3`;
- the existing value span prints `maximum` as a number;
- a sibling `.sheet-resource-boxes` contains exactly `maximum` inert
  `.sheet-resource-box` spans;
- the formula/detail states the class level or effective caster level and the
  seeded source used.

The boxes are not `<input>` elements and have no click/keyboard handler. They
must not imply that screen spending is stored. Put one accessible label on the
group, such as “4 empty boxes; mark spending on paper,” and make individual box
spans presentation-only. Screen and print use the same visible DOM; unlike
current HP, resources do not need `setSheetPrintFields` to be injected only for
print.

For each `absent` result, render a normal labelled row with `value: null`, the
exact sentence from the result, and **no box group**. Render §2.4's feature-text
scope disclosure once at section level, not once per candidate feature. A
computed zero also renders no row, but only because the source says the class
has not acquired that resource yet. No view code may decide either case from
truthiness.

Add computed resource facts to `sheetFacts` using closed kind, numeric maximum,
class level, and spell level only. A homebrew/imported class name remains visible
free text and stays out of structured JSON. Extend the existing counterpart test
so every structured resource fact has a visible labelled row.

### 5.2 CSS

In `src/ui/screens/sheet/styles.css`:

- `.sheet-resource-track` uses an inline flex layout with wrapping and a small
  gap, so Focus 20 remains legible on narrow screens;
- `.sheet-resource-box` has a fixed square size, solid current-color border,
  white interior, and `box-sizing: border-box`;
- the group stays adjacent to its numeric maximum and the whole row uses
  `break-inside: avoid`;
- print overrides use a black 1–2 px border, a physical size large enough for a
  pencil mark (approximately 0.18–0.22 in), no shadow/background decoration,
  and `print-color-adjust: exact`/`-webkit-print-color-adjust: exact` where
  needed;
- the existing one-column print rule remains authoritative. Do not hide the
  structured block or an absence only in print; the current D4 invariant and
  browser test require visible screen content to agree with structured content.

The browser stylesheet already hides only interactive chrome in print
(`src/ui/screens/sheet/styles.css:105-149`). Resource tracks are not chrome and
must remain visible.

## 6. Test strategy and negative controls

Every load-bearing assertion gets a named test whose expectation is independent
of the implementation output, plus a mutation that demonstrates the test can
fail.

| Assertion | Planned test | Negative-control candidate |
|---|---|---|
| The source parser finds exactly the eight resource/class ladders and all 160 rows | `tests/unit/rules/class-resources-srd.test.ts` pins the complete compressed vectors and source headings | In a test-local extract, change Barbarian level 6 Rages from 4 to 5; the pinned Rage vector must fail |
| A dash is known zero, while a missing level is invalid | Same parser suite uses a tiny licensed-shape fixture | Delete Monk level 1 or replace its dash with `1`; the coverage/zero assertion must fail |
| Storage refuses an invalid kind, level 0/21, text maximum, and negative maximum | Add cases to `tests/unit/schema-check-constraints.test.ts` | Remove the `typeof` or `>= 0` limb locally; its rejection case must become red/green in the wrong direction and prove the limb is exercised |
| The seed writes exactly 160 exact values and is idempotent | `tests/integration/rules/class-resources.test.ts` checks row count, all vectors, and stable ids after reseed | Mutate the seeded Barbarian level 12 value; the named exact-vector assertion must fail |
| Boot repair accepts only the exact sourced tuple/value set | Extend `tests/integration/db/bootstrap.test.ts` | Delete all 20 Rage rows and add 20 schema-valid `rage` rows to Bard; a count-only guard stays at 160 while the exact manifest assertion fails and repair restores the right set |
| A resource uses its own class level, not total level | Pure `sheet.test.ts`: Barbarian 3 / Monk 2 gives Rages 3 and Focus 2 | Change resolver input to total level 5; expected 3/2 becomes wrong and the test fails |
| Two class-qualified Channel Divinity pools are not summed | Pure test with Cleric 6 / Paladin 3 expects separate 3 and 2 rows | Group only by `resource_kind`; the test observes one incorrect row and fails |
| Known none, an unknown catalog, a missing row, and a wholly missing ladder stay distinct | Integration sheet-builder test covers bundled Rogue, an imported class, deletion of Barbarian's current row, and deletion of all 20 Rage rows | Infer expected kinds only from stored resource rows; the wholly deleted Rage ladder becomes known none and the named test fails |
| Multiclass shared slots use the combined table, not addition | Pure test: Wizard 3 / Cleric 2 resolves effective level 5 to `4,3,2` | Sum straight rows (`4,2` + `3`) and the named expected vector fails |
| A sole subclass caster uses its progression contribution, not the base-class shortcut | Pure test: a level-3 Fighter with the Eldritch Knight subclass resolves its third-caster contribution to two level-1 slots | Read only `class_progressions.slots` for Fighter; the expected slot row disappears and fails |
| Pact slots remain separate | Pure test: Wizard 2 / Warlock 3 expects shared first-level 3 plus two level-2 Pact slots | Merge Pact count into shared level 2; the two-row expectation fails |
| Invalid/missing spell content is absent, never `{}`/zero | Builder integration test corrupts or deletes the exact progression row and asserts the absence detail and no boxes | Catch decoding failure and return `{}`; the expected absence row disappears and fails |
| The visible row, structured fact, and box count agree | Extend `tests/unit/ui/sheet-view.test.ts` with known, zero, absent, and the single feature-text disclosure | Render one fewer Rage box, duplicate the disclosure, or add a structured maximum without a row; count/counterpart assertions fail |
| Screen boxes are visible and inert | Extend `tests/browser/character-sheet.spec.ts` | Replace spans with enabled checkboxes or hide the track on screen; visibility/no-form-control assertions fail |
| Print boxes survive, remain empty, and have printable borders | Extend the existing print-media test at `tests/browser/character-sheet.spec.ts:406-490` | Remove the print border or classify tracks as chrome; computed-style/visibility assertions fail |
| No play-state value or travelling catalog data is introduced | Schema-shape and table-scope/backup/share tests assert no `current`/`spent` column and all `class_resources` scopes false | Add a `spent` column or set `backup`/`share` true; the pinned shape or scope expectation fails |
| Migration/schema/contracts stay synchronized | Existing migration, schema-signature, schema shape, table-scope, generated-facts, and row-contract suites gain the table | Omit `class_resources` from `TABLE_SCOPES` or the migration bundle; compile/snapshot/migration tests fail |

Run unit/integration tests with the repository's normal npm test commands and
the focused Playwright sheet spec on a unique port. This project is TypeScript,
so the machine's PHP/ddev test convention does not apply.

## 7. Dispatchable unit breakdown

### Unit M — mint lane: migration, source parse, seed, and contracts

This unit owns every wire/schema mint and may land independently before the UI
unit:

1. Add the `ClassResourceKind`/maximum types and exhaustive labels.
2. Add `db/schema/class-resources.ts`, schema export/relations, generated
   `src/db/schema.sql`, and the migration using **the next free migration number
   at dispatch time**.
3. Add the parser over the existing `class-level-tables.txt`, with exact source
   vectors and rejection tests.
4. Seed the 160 rows idempotently and extend bundled-content completeness/repair.
5. Register table scopes, native row contracts, generated column/reference
   facts, and all schema/migration/signature snapshots.
6. Prove the mint with parser, schema-CHECK, contract, migration, seed, and boot
   repair tests plus their negative controls.

Suggested exclusive files include `db/schema/class-resources.ts`,
`db/schema/index.ts`, `db/schema/relations.ts`, `src/db/schema.sql`, the selected
`drizzle/NNNN_*.sql`, `src/db/migrations.ts`,
`src/rules/class-resources-srd.ts`, the seed entry point,
`src/domain/contracts/**`, and schema/seed tests.

### Unit R — mint-free lane: computation, sheet projection, rendering, and print

This unit consumes Unit M's table/type contract and creates no migration:

1. Add the exact-level lookup and explicit invalid/missing read state.
2. Add the pure `SheetResourceMaximum` resolver in `src/rules/sheet.ts`, including
   class-qualified resources, shared slots, separate Pact slots, known zero, and
   absence results.
3. Extend `CharacterSheetBuilder`'s one transient projection.
4. Add the `Resources` visible section and the matching structured facts in
   `sheet-view.ts`.
5. Add inert screen/print boxes and print-safe CSS.
6. Prove class-level versus total-level behavior, Channel Divinity separation,
   multiclass/Pact slots, absences, visible/JSON parity, exact box counts,
   non-interactivity, and print styling.

Suggested exclusive files include `src/rules/sheet.ts`,
`src/rules/sheet-content-lookup.ts`,
`src/queries/character-sheet-builder.ts`,
`src/ui/screens/sheet/sheet-view.ts`, `src/ui/screens/sheet/styles.css`, and their
focused unit/integration/browser tests.

Unit R can build its pure resolver and view fixtures in parallel against the
agreed interfaces, but its database lookup/integration tests should rebase on
Unit M after the mint lands. The merge order is M then R. Neither unit stores
spending state, edits character backup/share formats, or introduces an effect
kind.

## 8. Locally verified assumptions

- The working branch/commit at dispatch was `wt/pwa` / `a5105ae`.
- The registered migration chain ended at 0024, but no number is reserved here.
- All twelve SRD class tables and their full 1–20 rows are present in the
  checksummed committed extract.
- Exactly eight class/resource pairs have dedicated replenishing count/point
  columns under the D91 definition; Bardic Die and Rogue Sneak Attack are not
  counts.
- `class_progressions` has spell fields only and the effect/form vocabularies
  have no resource kind.
- The current sheet is one transient projection rendered as visible rows and
  structured JSON, with an existing one-column print stylesheet and paper-field
  test seam.

No open question blocks implementation. The one intentional boundary is
explicit: feature-text-only resource formulas are named as absent in this unit
and require their own sourced design before they may print maxima.
