# D91 resource maxima storage and sheet design

**Status:** implementation design only. This document changes no source, test,
migration, or seed data.

## Decision summary

Add a dedicated `class_resources` catalog table containing one absolute maximum
for each supported class resource at each class level. Seed eight complete
20-level ladders from the committed SRD 5.2.1 class tables: Barbarian Rages,
Cleric Channel Divinity, Druid Wild Shape, Fighter Second Wind, Monk Focus
Points, Paladin Channel Divinity, Ranger Favored Enemy, and Sorcerer Sorcery
Points. Keep that 160-row mechanism intact. Add a separate
`class_resource_formulas` catalog table with one typed row per supported
base-class feature whose maximum is fixed, ability-modifier-based,
class-level-multiplied, or a sourced fixed-count step function. Keep shared
spell slots and Pact Magic on the existing spell-slot path; do not duplicate
them into either resource table.

The sheet computes transient maxima from ladder rows, formula rows, the
character's own class levels, and—where the formula names one—the same live
resolved ability score already used elsewhere on the sheet. It stores no
current/spent value. A known positive maximum up to 30 renders as its number
plus exactly that many inert, empty boxes. Larger point pools render the maximum
and a compact writable remaining-value field rather than an unusable wall of
boxes; §5.1 marks that threshold and treatment as supervisor-reviewable. A
missing or unsupported input renders no number and no boxes; it prints a
specific absence sentence.

This is the direct implementation of `.claude/decisions.md` **D91**, as amended
by **D120**: maxima come from seeded class tables and typed licensed formulas,
the marks remain pencil state, and the multiclass slot table is used. It
preserves **D88** because no current resource count is stored. It applies
**D33** through a strict
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

### 2.4 Feature-cell/prose limits: exhaustive v1 reclassification

This is the complete base-class inventory of replenishing pools and one-use
gates found in the earlier design. Each candidate now has its own decision.
`0` below means the feature is not yet acquired; it remains a sourced known-zero
and renders no row. “Model” means D120 requires a numbered maximum and paper
marking treatment in v1. “Absent” means the cited rule is not one aggregate use
count, so D33 forbids manufacturing one.

| Class / feature | v1 decision | Typed formula or exact reason | Exact source |
|---|---|---|---|
| Barbarian — Persistent Rage recovery | **Model** | `fixed_count(minimum_class_level: 15, count: 1)`; this is the once-per-Long-Rest gate for restoring Rages, not another Rage maximum | `docs/srd/full/srd-5.2.1.txt:1897-1901` |
| Bard — Bardic Inspiration | **Model** | `ability_modifier_minimum_one(minimum_class_level: 1, ability: 'charisma')`; Bardic Die remains only the die size | `docs/srd/full/srd-5.2.1.txt:1949-1957`, `:1987-2002` |
| Cleric — Divine Intervention | **Model** | `fixed_count(minimum_class_level: 10, count: 1)`; Greater Divine Intervention changes recovery after choosing Wish to 2d4 Long Rests, not the maximum | `docs/srd/full/srd-5.2.1.txt:2339-2348`, `:2365-2371` |
| Druid — Wild Resurgence conversion | **Model** | `fixed_count(minimum_class_level: 5, count: 1)` for the Wild-Shape-to-slot conversion gate | `docs/srd/full/srd-5.2.1.txt:2618-2625` |
| Druid — Nature Magician conversion | **Model** | `fixed_count(minimum_class_level: 20, count: 1)` for the multi-use Wild Shape conversion gate | `docs/srd/full/srd-5.2.1.txt:2657-2670` |
| Fighter — Action Surge | **Model** | `fixed_count_by_class_level(steps: [[2, 1], [17, 2]])` | `docs/srd/source/class-level-tables.txt:120-135`; `docs/srd/full/srd-5.2.1.txt:2938-2945` |
| Fighter — Indomitable | **Model** | `fixed_count_by_class_level(steps: [[9, 1], [13, 2], [17, 3]])` | `docs/srd/source/class-level-tables.txt:127-135`; `docs/srd/full/srd-5.2.1.txt:2928-2935` |
| Monk — Uncanny Metabolism | **Model** | `fixed_count(minimum_class_level: 2, count: 1)`; this is the once-per-Long-Rest recovery gate, not another Focus maximum | `docs/srd/full/srd-5.2.1.txt:3089-3095` |
| Paladin — Lay On Hands | **Model** | `class_level_multiple(minimum_class_level: 1, multiplier: 5)` healing points | `docs/srd/full/srd-5.2.1.txt:3206-3211` |
| Paladin — Paladin's Smite | **Model** | `fixed_count(minimum_class_level: 2, count: 1)` slot-free cast | `docs/srd/full/srd-5.2.1.txt:3262-3266` |
| Paladin — Faithful Steed | **Model** | `fixed_count(minimum_class_level: 5, count: 1)` slot-free cast | `docs/srd/full/srd-5.2.1.txt:3334-3339` |
| Ranger — Tireless | **Model** | `ability_modifier_minimum_one(minimum_class_level: 10, ability: 'wisdom')` | `docs/srd/full/srd-5.2.1.txt:3544-3553` |
| Ranger — Nature's Veil | **Model** | `ability_modifier_minimum_one(minimum_class_level: 14, ability: 'wisdom')` | `docs/srd/full/srd-5.2.1.txt:3563-3570` |
| Rogue — Stroke of Luck | **Model** | `fixed_count(minimum_class_level: 20, count: 1)` | `docs/srd/full/srd-5.2.1.txt:3816-3821` |
| Sorcerer — Innate Sorcery | **Model** | `fixed_count(minimum_class_level: 1, count: 2)` | `docs/srd/full/srd-5.2.1.txt:3936-3951` |
| Sorcerer — Sorcerous Restoration | **Model** | `fixed_count(minimum_class_level: 5, count: 1)`; the recovered Sorcery Point amount is separate from this use count | `docs/srd/full/srd-5.2.1.txt:3969-3974` |
| Warlock — Magical Cunning | **Model** | `fixed_count(minimum_class_level: 2, count: 1)`; the recovered Pact-slot amount is separate from this use count | `docs/srd/full/srd-5.2.1.txt:4330-4335` |
| Warlock — Contact Patron | **Model** | `fixed_count(minimum_class_level: 9, count: 1)` slot-free cast | `docs/srd/full/srd-5.2.1.txt:4351-4360` |
| Warlock — Mystic Arcanum | **Absent** | Each acquired arcanum is a separately chosen spell with its own single use. Summing them into a class-level count would erase the per-spell identity and imply one fungible pool. | `docs/srd/full/srd-5.2.1.txt:4362-4374` |
| Wizard — Arcane Recovery | **Absent** | `ceil(Wizard level / 2)` is a combined recovered-slot-level **budget**, not a maximum number of uses or fungible points; “once” gates spending that budget but does not turn it into one box-track unit. | `docs/srd/full/srd-5.2.1.txt:4671-4683` |
| Wizard — Signature Spells | **Absent** | Each of two character-chosen spells has one independent slot-free cast. A single count of two would falsely make the uses interchangeable and the class formula catalog has no chosen-spell relation. | `docs/srd/full/srd-5.2.1.txt:4763-4771` |

This boundary covers base classes only. A bundled or user-authored subclass can
introduce another maximum, but subclass selection and feature effects do not
currently carry a general resource contract; such maxima are subject to the
same explicit absence, not inferred from a class name. Tactical Mind, Monk
techniques, and Wild Companion merely spend an already inventoried pool and do
not get a second track. Passive “once per turn” limits are cadence rules, not
replenishing maxima.

The surviving section-level disclosure applies only to the three **Absent**
rows above and appears once on screen and paper: **“Arcane Recovery is a
slot-level budget, while Mystic Arcanum and Signature Spells are per-spell
single uses; use their printed feature text.”** It contains no number or boxes.

### 2.5 Closed formula vocabulary

The formula catalog decodes to this closed union. It contains exactly the four
shapes required by the eighteen modeled rows above—no arbitrary expression
string, callback, division, dice, or speculative homebrew arm:

```ts
type ResourceFormulaAbility = 'charisma' | 'wisdom';

type ClassResourceFormula =
  | {
      readonly kind: 'fixed_count';
      readonly minimum_class_level: ClassLevel;
      readonly count: PositiveResourceMaximum;
    }
  | {
      readonly kind: 'fixed_count_by_class_level';
      readonly steps: readonly [
        { readonly minimum_class_level: ClassLevel; readonly count: PositiveResourceMaximum },
        ...Array<{
          readonly minimum_class_level: ClassLevel;
          readonly count: PositiveResourceMaximum;
        }>,
      ];
    }
  | {
      readonly kind: 'ability_modifier_minimum_one';
      readonly minimum_class_level: ClassLevel;
      readonly ability: ResourceFormulaAbility;
    }
  | {
      readonly kind: 'class_level_multiple';
      readonly minimum_class_level: ClassLevel;
      readonly multiplier: PositiveInteger;
    };
```

All four use the level in the owning class. Below the acquisition level (or
before the first step), the result is sourced known-zero and no row renders.
At or above it:

- `fixed_count` returns `count`;
- `fixed_count_by_class_level` returns the count from the greatest step whose
  minimum level is not greater than the class level; steps must be non-empty,
  strictly level-increasing, and count-changing;
- `ability_modifier_minimum_one` returns
  `max(1, resolved ability modifier)` from the named live ability;
- `class_level_multiple` returns `multiplier × owning class level`.

Every computed formula result prints the numeric maximum. Results from 1 through
30 also print exactly that many empty boxes. **Supervisor-reviewable print
choice:** a result above 30 prints `Remaining: ____ / N` beside the maximum,
with no per-point boxes. Thus Paladin 20 prints `Lay On Hands: 100` plus
`Remaining: ____ / 100`, never 100 tiny boxes; unlike grouping boxes into tens,
the field does not imply that points can only be spent in ten-point chunks.
The threshold is a rendering policy, not a formula kind or stored fact.

### 2.6 Absent-and-stated list

The following never receive a recited number:

1. A homebrew/imported class or subclass with no locally supplied, modelled
   resource progression. No non-SRD maximum is licensed for the bundle. Render:
   **“Resource maxima are not recorded for [class].”** The class name remains
   marked as unverified free text.
2. A ladder resource known to the bundled inventory whose exact current-level
   row is missing or invalid. Render: **“[resource] maximum is unavailable
   because the level [N] source row is missing or invalid.”** Never fall back to
   the previous level and never print zero.
3. A modeled formula resource whose definition, owning class level, or required
   resolved ability input is missing or invalid. Render the specific formula or
   ability absence from §4.1 and no boxes; never substitute ability modifier 0,
   the base ability score, or a remembered class formula.
4. Arcane Recovery, Mystic Arcanum, and Signature Spells for the distinct
   reasons in §2.4. Render only the surviving section-level disclosure, not a
   guessed aggregate row.
5. Any class, subclass, or feature outside committed SRD 5.2.1 CC-BY content.
   Nothing from a commercial rulebook, memory, or web summary may seed either
   table. Such content remains user-supplied and absent unless a future local
   import contract explicitly carries it.

A bundled class with no acquired or modeled resource is **known none**, not
absent. It gets no warning and no fake “0 uses” row.

## 3. Storage proposal

### 3.1 Alternatives

| Option | Strengths | Problems | Decision |
|---|---|---|---|
| **(a) New columns on `class_progressions`** | Exact-level lookup is already present; nullable columns can distinguish unrelated classes; straight-class seed loop already visits all 20 levels. | At least seven sparse, resource-named columns are needed immediately; every future resource requires another schema/migration/contracts/snapshot mint; multiple resources make the row wider for all 240 class levels; spellcasting concerns and sheet resource concerns become coupled. | Reject. It works, but bakes the current SRD column names into the central spell progression row. |
| **(b) Put ladder and formula rows in one `class_resources` table** | One lookup table and one foreign-key target. | The existing honest ladder contract requires non-null `class_level` and `maximum`; formula rows require neither stored maximum nor one row per level. Making both nullable creates discriminator/CHECK limbs throughout the 160-row path, while encoding a formula as 20 evaluated rows loses the typed source rule and repeats live ability-dependent values incorrectly. | Reject. Keep the fixed 160-ladder mechanism intact rather than weakening it for a different cardinality. |
| **(c) `class_resources` plus `class_resource_formulas`** | The first remains one absolute fact per class/resource/level; the second is one typed fact per class feature. Each table has one lookup cardinality, one completeness manifest, and catalog-only scope. | Adds a second join/table contract and a small discriminator payload surface; formula completeness must be checked independently of the 160 ladder tuples. | **Recommend.** The schema states the difference between sourced level rows and rules that must be evaluated from live character inputs. |
| **(d) Extend effect kinds** | Could eventually let feats/subclasses alter a character resource. | Current effects are standing character modifiers, not bundled base-class catalogs. This option would require payloads, authoring forms, character copies, source-instance lifecycle, backup/share behavior, and combination rules before one maximum could render. It would also tempt storage of current/spent state contrary to D88. | Reject for D91/D120. A future feature-resource change may add a typed modifier after base maxima exist. |

### 3.2 Recommended table contracts

Create `class_resources` exactly as the ladder design requires:

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
do not write it in this unit and receive the explicit absence in §2.6; a future
class-resource import must use the project's known-plus-passthrough shape rather
than widening this seeded-only claim by accident.

Seed all 20 rows for each of the eight class/resource ladders—**160 rows**. A
pre-feature em dash becomes zero, so a complete ladder has no gaps. The reader
uses exact equality on `class_level`; it must not use the mastery table's
`<= / latest row` behavior. A stale maximum is a wrong number under D33.

Create `class_resource_formulas` separately, with one row for each of the 18
**Model** decisions in §2.4:

| Column | Contract |
|---|---|
| `id` | integer primary key, autoincrement |
| `class_definition_id` | non-null branded class id; FK to `class_definitions.id` with cascade delete |
| `resource_kind` | non-null closed 18-member seeded vocabulary: `persistent_rage_recovery`, `bardic_inspiration`, `divine_intervention`, `wild_resurgence_conversion`, `nature_magician_conversion`, `action_surge`, `indomitable`, `uncanny_metabolism`, `lay_on_hands`, `paladins_smite`, `faithful_steed`, `tireless`, `natures_veil`, `stroke_of_luck`, `innate_sorcery`, `sorcerous_restoration`, `magical_cunning`, `contact_patron` |
| `formula_kind` | non-null closed vocabulary: the four discriminants in §2.5 |
| `minimum_class_level` | non-null 1–20 acquisition/first-step level |
| `fixed_count` | nullable positive integer; required by `fixed_count` and `fixed_count_by_class_level`, forbidden otherwise |
| `ability` | nullable closed `charisma | wisdom`; required only by `ability_modifier_minimum_one` |
| `multiplier` | nullable positive integer; required only by `class_level_multiple` |
| `later_fixed_count_steps` | nullable canonical JSON array of `{minimum_class_level,count}`; required and non-empty only by `fixed_count_by_class_level` |
| `created_at`, `updated_at` | existing datetime convention |

Add `UNIQUE(class_definition_id, resource_kind)`. A kind/payload CHECK makes
every irrelevant payload column null and every required scalar present. The
step JSON also gets `json_valid`, array-shape, non-empty, and a native row-codec
check; the decoder closes it into the non-empty, strictly increasing union arm
in §2.5 and rejects duplicate levels, unchanged counts, out-of-range levels, or
non-positive counts. `minimum_class_level`/`fixed_count` are the first step for
the stepped kind; `later_fixed_count_steps` stores only later changes. There is
no general expression text and no evaluated `maximum` column. Display labels
come from exhaustive, no-default mappings for the two closed resource-kind
vocabularies.

Both tables are bundle-owned class catalog content. Imported classes write
neither table in this unit and receive §2.6's explicit absence. A future import
contract must use the project's known-plus-passthrough pattern; it must not turn
the seeded closed vocabularies into a claim that homebrew feature names are a
closed set.

#### Source parse and seed manifests

The 160 ladder rows continue to come only from the already checksummed
`docs/srd/source/class-level-tables.txt` (`docs/srd/SOURCE.md:40-48`). Its
twelve-class manifest is keyed by bundled class `content_key`, with an expected
ladder-kind set (possibly empty) and the 20-row ladder for every expected kind.
That manifest—not a guess from a display name—distinguishes a known-none ladder
set from deleted Barbarian content. It must:

- enumerate all twelve class headings;
- recognize the eight resource-column/class pairs above;
- return all 20 levels for each recognized pair;
- reject a duplicate/missing level, non-integer count, unexpected non-dash
  value before acquisition, or unexpected resource-like table header;
- preserve zero as known-not-acquired, not absence.

The formula seed manifest comes from the committed, checksummed complete text
(`docs/srd/SOURCE.md:169-180`), not memory or an uncommitted web/PDF fetch. A
new focused parser recognizes the exact class and `Level N: Feature` headings,
then the count phrases, named ability plus “minimum of once,” the Lay On Hands
`five times your Paladin level` multiplier, and the Fighter step changes. It
must emit exactly the 18 `(content_key, resource_kind, formula)` rows in §2.4
and also recognize the three deliberately absent candidates as classified
non-formulas so a source change cannot silently turn one into a seeded count.
Action Surge and Indomitable step levels/counts are cross-checked against the
parenthetical cells in the checksummed class-table extract
(`docs/srd/source/class-level-tables.txt:120-135`); every other formula value
comes from the cited full-text feature block. The parser rejects a missing or
duplicate feature block, a changed acquisition level/count/ability/multiplier,
an unclassified candidate, or any formula shape outside §2.5.

The ladder boot completeness guard compares the exact expected
`(content_key, resource_kind, class_level)` tuple set and each maximum, not only
`count(*) = 160`. An unexpected class/kind pairing cannot compensate for a
missing Rage row. If any tuple is missing, extra, attached to the wrong bundled
class, or has the wrong value, the idempotent bundled-content repair replaces
the bundled rows from the manifest rather than declaring a plausible-looking
partial catalog healthy. Rows for imported classes remain untouched.

The formula guard separately compares all 18 exact
`(content_key, resource_kind, decoded formula)` values. A count of 18 is not
enough: moving Bardic Inspiration to Wizard or changing Charisma to Wisdom must
trigger repair. Formula repair replaces only formula rows owned by bundled
classes and leaves imported classes untouched. Neither guard derives its
expectation from the rows it is checking.

### 3.3 Schema, contracts, and snapshots

Both tables belong in focused `db/schema/class-resources.ts`, exported from
`db/schema/index.ts` and related to `class_definitions`. Register both in
`src/domain/contracts/tables.ts` as `catalog_class` with `snapshot`, direct
backup, backup, share, and backup-reference all false, matching
`class_progressions` (`src/domain/contracts/tables.ts:631-650`) and
`class_weapon_mastery_counts` (`src/domain/contracts/tables.ts:729-745`).

Because parsers write both row shapes, include `class_resources` and
`class_resource_formulas` in the native row-contract set; that is the convention
documented for parser-written mastery tables
(`src/domain/contracts/rows.ts:532-568`). Refine ladder `class_level` to the
existing 1–20 contract, each `resource_kind` to its own exact seeded enum, and
`maximum` to a non-negative integer. Refine formula rows through the joint
discriminator/payload codec in §3.2 before exposing `ClassResourceFormula`.
Regenerate column/reference facts and the checked schema SQL through the
existing project commands, then update schema shape, CHECK-constraint, FK,
unique-index, autoincrement, migration, and schema-signature snapshots for both
tables. Expectations must be reviewed values, never regenerated from the
implementation output as their own oracle.

The migration is: **next free migration number at dispatch time**. The mint
lane owns numbering and creates both tables in that one migration; another lane
may take the apparent next number first. At the observed dispatch tree the
registered chain ends at 0025 (`src/db/migrations.ts:23-29`, `:285-303`), but
this design does not reserve 0026.

## 4. Computation seam

### 4.1 Pure result type in `src/rules/sheet.ts`

Add resource computation beside the other pure, source-carrying sheet rules,
not in the view and not in a command. The input extends each
`SheetClassLevels`-shaped entry with:

- the class content key/id and its own class level;
- an exact `resource_kind -> stored maximum` map for that level, or an explicit
  read failure;
- the class's decoded formula rows, or an explicit read/decode failure;
- live resolved Charisma and Wisdom inputs as explicit present/absent results;
- the existing progression type/subclass caster contribution needed for slots.

Return closed unions, not `number | undefined` or a formula string:

```ts
type SheetResourceComputation =
  | {
      readonly kind: 'level_table';
      readonly class_level: ClassLevel;
    }
  | ClassResourceFormula
  | {
      readonly kind: 'shared_spell_slots';
      readonly effective_caster_level: ClassLevel;
    }
  | {
      readonly kind: 'pact_magic';
      readonly class_level: ClassLevel;
      readonly spell_level: SpellLevel;
    };

type SheetResourceMaximum =
  | {
      readonly status: 'computed';
      readonly id: string;
      readonly kind:
        | ClassResourceKind
        | ClassFormulaResourceKind
        | 'spell_slot'
        | 'pact_slot';
      readonly class_definition_id: ClassDefinitionId | null;
      readonly class_level: ClassLevel | null;
      readonly spell_level: SpellLevel | null;
      readonly maximum: PositiveResourceMaximum;
      readonly computation: SheetResourceComputation;
    }
  | {
      readonly status: 'absent';
      readonly id: string;
      readonly reason:
        | 'resource_catalog_not_recorded'
        | 'resource_level_row_missing_or_invalid'
        | 'resource_formula_missing_or_invalid'
        | 'resource_formula_class_level_missing_or_invalid'
        | 'resource_formula_ability_input_missing_or_invalid'
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

Formula resources follow the same owning-class rule. For an acquired formula,
evaluate the exact §2.5 arm; never precompute or persist its result. The
ability-modifier arm must reuse the sheet's existing live resolution path:
`CharacterSheetBuilder.build()` calls `resolveCharacterAbilities`, passes
`resolvedTotals` into `AbilityScores`, and derives each displayed modifier from
that value (`src/queries/character-sheet-builder.ts:662-670`, `:772-781`). This
is also the path whose `#scores` helper is documented as resolved totals rather
than base scores (`src/queries/character-sheet-builder.ts:987-1002`), and it is
the same `AbilityScores.score(...).modifier()` seam used for live Constitution
math (`src/rules/sheet.ts:752-775`). Do not query `characters.charisma` or
`characters.wisdom` again and do not freeze a modifier into either catalog
table.

If the formula asks for an ability whose resolved score/modifier is missing or
invalid, return `resource_formula_ability_input_missing_or_invalid` with detail
such as **“Bardic Inspiration maximum is unavailable because the resolved
Charisma modifier is missing or invalid.”** Do not use modifier 0: for a score
whose real modifier is positive that would silently turn the result into 1.
Likewise, a missing/invalid owning class level gets the class-level formula
absence, while a missing/invalid formula row gets the formula-definition
absence. Below-acquisition known-zero is not an absence.

### 4.2 Lookup and builder

Extend `SheetContentLookup` with one exact-level `class_resources` read and one
per-class `class_resource_formulas` read for each character class. Carry both
parser-derived expected-kind sets for a recognized bundled `content_key`.
Preserve raw invalid/missing state long enough for the pure resolver to return
`absent`; do not filter a bad row into silence. An unknown content key is
`resource_catalog_not_recorded`; an empty expected set is known none; an
expected ladder kind without its exact row is
`resource_level_row_missing_or_invalid`; and an expected formula kind without
one valid decoded row is `resource_formula_missing_or_invalid`.

`CharacterSheetBuilder` passes its already computed `AbilityScores` and each
class's own level into the resolver. It adds
`resources: readonly SheetResourceMaximum[]` to the one transient
`CharacterSheet` projection and includes resource absences in that same list,
not in a separately built gap list.

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
  `Barbarian — Rages` or `Bard — Bardic Inspiration`; shared slots use `Level 3
  spell slots`, and Pact uses `Pact slots — level 3`;
- the existing value span prints `maximum` as a number;
- when `maximum <= 30`, a sibling `.sheet-resource-boxes` contains exactly
  `maximum` inert `.sheet-resource-box` spans;
- when `maximum > 30`, a sibling `.sheet-resource-remaining` prints the compact
  `Remaining: ____ / N` paper field from §2.5 and contains no per-point box
  spans;
- the formula/detail renders the closed `computation` arm exhaustively: owning
  class level and table source, fixed count, sourced steps, live named ability
  modifier with its minimum-one floor, class-level multiplication, effective
  caster level, or Pact level.

The boxes are not `<input>` elements and have no click/keyboard handler. They
must not imply that screen spending is stored. Put one accessible label on the
group, such as “4 empty boxes; mark spending on paper,” and make individual box
spans presentation-only. Screen and print use the same visible DOM; unlike
current HP, resources do not need `setSheetPrintFields` to be injected only for
print. The large-pool remaining line is likewise inert on screen and writable
only on paper; it is not an HTML form control and is never persisted.

For each `absent` result, render a normal labelled row with `value: null`, the
exact sentence from the result, and **no box or remaining group**. Render
§2.4's three-feature disclosure once at section level, not once per candidate
feature. A computed zero also renders no row, but only because the source says
the class has not acquired that resource yet. No view code may decide either
case from truthiness.

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
- `.sheet-resource-remaining` reserves one short, bordered writing line and
  keeps the printed `/ N` maximum adjacent;
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
| The formula parser classifies all 21 §2.4 candidates as exactly 18 formulas plus three stated absences | The same source suite pins every decoded union value and the three absent classifications against the cited full-text blocks | Delete “minimum of once” from Bardic Inspiration or let Arcane Recovery decode as `fixed_count`; exact classification must fail |
| A dash is known zero, while a missing level is invalid | Same parser suite uses a tiny licensed-shape fixture | Delete Monk level 1 or replace its dash with `1`; the coverage/zero assertion must fail |
| Storage refuses invalid ladder and formula discriminator/payload rows | Add cases to `tests/unit/schema-check-constraints.test.ts` for invalid kinds, level 0/21, text/negative counts, stray payloads, invalid abilities, zero multipliers, and malformed steps | Remove one kind/payload CHECK arm or allow `strength`; the corresponding rejection case must become red/green in the wrong direction |
| The seeds write exactly 160 ladder values and 18 decoded formula rows idempotently | `tests/integration/rules/class-resources.test.ts` checks both exact manifests and stable ids after reseed | Mutate Barbarian level 12 Rages or Bardic Inspiration's ability; the named exact-manifest assertion must fail |
| Boot repair accepts only the two exact sourced tuple/value sets | Extend `tests/integration/db/bootstrap.test.ts` | Delete all 20 Rage rows and add 20 schema-valid Rage rows to Bard; separately move Bardic Inspiration to Wizard while keeping 18 rows. Count-only guards stay green while exact repair must restore both manifests |
| A resource uses its own class level, not total level | Pure `sheet.test.ts`: Barbarian 3 / Monk 2 gives Rages 3 and Focus 2 | Change resolver input to total level 5; expected 3/2 becomes wrong and the test fails |
| Bardic Inspiration follows live resolved Charisma | Pure resolver test starts with Charisma 14 (+2), then changes the resolved score to 18 (+4), expecting maxima 2 then 4; the view counterpart asserts the same number of boxes | Freeze/cache the first modifier or read the base score instead of the changed resolved score; the second expectation remains 2 and fails |
| An ability formula never guesses a missing modifier | Pure resolver test omits/invalidates resolved Charisma and expects `resource_formula_ability_input_missing_or_invalid`, no maximum, and no boxes | Apply `modifier ?? 0`; the resolver incorrectly computes 1 and the named absence assertion fails |
| Lay On Hands uses the owning Paladin level and multiplier | Pure resolver test: Paladin 5 yields `5 × 5 = 25`, with numeric maximum 25 | Change the seeded multiplier to 4 or multiply by total character level; the pinned 25 assertion fails |
| A fixed feature count renders exactly N boxes | View test uses Sorcerer Innate Sorcery `fixed_count(2)` and expects numeric 2 plus exactly two inert boxes | Render one box for the feature row or use the acquisition level as the count; exact box count fails |
| Stepped fixed counts select the greatest acquired step | Pure resolver test checks Fighter 12/13/17 Indomitable as 1/2/3 and Action Surge 16/17 as 1/2 | Select the first step or compare with `>` instead of `>=`; at least one boundary expectation fails |
| Large point pools avoid unusable per-point tracks | View/print test checks Paladin 20 as maximum 100, zero `.sheet-resource-box` spans, and `Remaining: ____ / 100` | Render `maximum` boxes unconditionally; the zero-box/remaining-field assertions fail |
| Two class-qualified Channel Divinity pools are not summed | Pure test with Cleric 6 / Paladin 3 expects separate 3 and 2 rows | Group only by `resource_kind`; the test observes one incorrect row and fails |
| Known none, unknown catalog, missing ladder data, and missing formula data stay distinct | Integration sheet-builder test covers a bundled below-acquisition class, an imported class, deletion of Barbarian's current row/all Rage rows, and deletion/corruption of Bardic Inspiration | Infer expected kinds only from stored rows; a wholly deleted Rage ladder or formula becomes known none and the named test fails |
| Multiclass shared slots use the combined table, not addition | Pure test: Wizard 3 / Cleric 2 resolves effective level 5 to `4,3,2` | Sum straight rows (`4,2` + `3`) and the named expected vector fails |
| A sole subclass caster uses its progression contribution, not the base-class shortcut | Pure test: a level-3 Fighter with the Eldritch Knight subclass resolves its third-caster contribution to two level-1 slots | Read only `class_progressions.slots` for Fighter; the expected slot row disappears and fails |
| Pact slots remain separate | Pure test: Wizard 2 / Warlock 3 expects shared first-level 3 plus two level-2 Pact slots | Merge Pact count into shared level 2; the two-row expectation fails |
| Invalid/missing spell content is absent, never `{}`/zero | Builder integration test corrupts or deletes the exact progression row and asserts the absence detail and no boxes | Catch decoding failure and return `{}`; the expected absence row disappears and fails |
| The visible row, structured fact, and marking treatment agree | Extend `tests/unit/ui/sheet-view.test.ts` with ladder, each formula kind, known-zero, each absence family, and the single three-feature disclosure | Render one fewer box, duplicate the disclosure, or add a structured maximum without a row; count/counterpart assertions fail |
| Screen boxes are visible and inert | Extend `tests/browser/character-sheet.spec.ts` | Replace spans with enabled checkboxes or hide the track on screen; visibility/no-form-control assertions fail |
| Print boxes survive, remain empty, and have printable borders | Extend the existing print-media test at `tests/browser/character-sheet.spec.ts:406-490` | Remove the print border or classify tracks as chrome; computed-style/visibility assertions fail |
| No play-state value or travelling catalog data is introduced | Schema-shape and table-scope/backup/share tests assert no `current`/`spent` column and both resource-table scopes false | Add a `spent` column or set either table's `backup`/`share` scope true; the pinned shape or scope expectation fails |
| Migration/schema/contracts stay synchronized | Existing migration, schema-signature, schema shape, table-scope, generated-facts, and row-contract suites gain both tables | Omit either table from `TABLE_SCOPES` or the migration bundle; compile/snapshot/migration tests fail |

Run unit/integration tests with the repository's normal npm test commands and
the focused Playwright sheet spec on a unique port. This project is TypeScript,
so the machine's PHP/ddev test convention does not apply.

## 7. Dispatchable unit breakdown

### Unit M — mint lane: migration, source parse, seed, and contracts

This unit owns every wire/schema mint and may land independently before the UI
unit. It gains the formula vocabulary, the separate formula catalog and its
licensed manifest while preserving the original 160-row ladder:

1. Add `ClassResourceKind`, `ClassFormulaResourceKind`,
   `ClassResourceFormula`, positive scalar types, and exhaustive labels/decoders.
2. Add both tables in `db/schema/class-resources.ts`, schema exports/relations,
   generated `src/db/schema.sql`, and one migration using **the next free
   migration number at dispatch time**.
3. Keep the parser over checksummed `class-level-tables.txt` for the eight exact
   vectors/160 rows; add the full-text formula parser and the Fighter
   parenthetical-cell cross-check described in §3.2.
4. Seed the 160 ladder rows and 18 formula rows idempotently, with separate exact
   completeness/repair manifests.
5. Register both catalog-only table scopes, native row contracts, generated
   column/reference facts, and all schema/migration/signature snapshots.
6. Prove the mint with ladder/formula classification, schema-CHECK, decoder,
   contract, migration, both seeds, and both boot-repair tests plus negative
   controls.

Suggested exclusive files include `db/schema/class-resources.ts`,
`db/schema/index.ts`, `db/schema/relations.ts`, `src/db/schema.sql`, the selected
`drizzle/NNNN_*.sql`, `src/db/migrations.ts`,
`src/rules/class-resources-srd.ts`, the formula parser/manifest, the seed entry point,
`src/domain/contracts/**`, and schema/seed tests.

### Unit R — mint-free lane: computation, sheet projection, rendering, and print

This unit consumes Unit M's table/type contract and creates no migration. It
gains live formula evaluation, formula-specific absences, and the bounded
box/large-pool print treatment:

1. Add the exact-level ladder lookup, per-class formula lookup/decoder, and
   explicit invalid/missing states for both.
2. Add the pure `SheetResourceMaximum` resolver in `src/rules/sheet.ts`, including
   class-qualified ladders and formulas, live resolved-ability input, shared
   slots, separate Pact slots, known zero, and all absence results.
3. Extend `CharacterSheetBuilder`'s one transient projection while reusing its
   existing resolved `AbilityScores` value.
4. Add the `Resources` visible section and matching structured facts in
   `sheet-view.ts`, including the narrowed three-feature disclosure.
5. Add inert screen/print boxes up to 30, the larger-pool remaining line, and
   print-safe CSS.
6. Prove live Charisma/Wisdom changes, missing ability input, Paladin-level
   multiplication, fixed and stepped counts, class-level versus total-level
   behavior, Channel Divinity separation, multiclass/Pact slots, absences,
   visible/JSON parity, exact box counts, large-pool treatment,
   non-interactivity, and print styling.

Suggested exclusive files include `src/rules/sheet.ts`,
`src/rules/sheet-content-lookup.ts`,
`src/queries/character-sheet-builder.ts`,
`src/ui/screens/sheet/sheet-view.ts`, `src/ui/screens/sheet/styles.css`, and their
focused unit/integration/browser tests.

Unit R can build its pure resolver and view fixtures in parallel against the
agreed interfaces, but its database lookup/integration tests should rebase on
Unit M after the mint lands. The merge order is M then R. Neither unit stores
spending state, edits character backup/share formats, introduces an effect
kind, or broadens the licensed base-class inventory.

## 8. Locally verified assumptions

- The working branch/commit at dispatch was `wt/pwa` / `d7e65dd`.
- The registered migration chain ended at 0025, but no number is reserved here.
- All twelve SRD class tables and their full 1–20 rows are present in the
  checksummed committed extract.
- Exactly eight class/resource pairs have dedicated replenishing count/point
  columns under the D91 definition; Bardic Die and Rogue Sneak Attack are not
  counts.
- The exhaustive feature-cell/prose inventory contains 21 candidates: 18 map
  to the four D120 formula arms, while Arcane Recovery, Mystic Arcanum, and
  Signature Spells remain absent for the distinct reasons in §2.4.
- The full committed SRD text is checksum-pinned in `docs/srd/SOURCE.md:169-180`;
  Action Surge and Indomitable also expose their count changes in the
  checksummed class-table extract.
- `class_progressions` has spell fields only and the effect/form vocabularies
  have no resource kind.
- The current sheet is one transient projection rendered as visible rows and
  structured JSON, with an existing one-column print stylesheet and paper-field
  test seam.
- The builder already resolves ability contributions/overrides once and turns
  those totals into the `AbilityScores` used by live Constitution math; formula
  resources reuse that exact Charisma/Wisdom path.

No open question blocks implementation. The only supervisor-reviewable choice
is the §2.5 print threshold/treatment for maxima above 30; it does not affect
formula computation, storage, or D33 absence behavior.
