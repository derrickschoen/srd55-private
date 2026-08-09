# U2 — species lineage: choice, grants, and honest projection

Status: **implementation-ready design**. This document changes no production or
test code. `.claude/decisions.md` remains authoritative.

Binding decisions: D33 (a disclosed wrong number is still wrong), D48/D55
(class first; class → abilities → species → background), D56 (lineage spells use
`species_definitions.grant_rules`, a source instance, and the existing grant
generator), D60 (zero users; no compatibility layer), D63 (Elf lineage and its
spellcasting-ability choice are real character state), D64 (all-10s is valid, so
an ability must never be inferred from score strength), and D70 (an unmade
choice is saveable, named, and never silently completed).

> **D231 amendment — 2026-08-09.** D231 is newer and binding: lineage does
> not gate advancement from the species step, the High Elf cantrip is a
> modeled replaceable wizard-list choice whose selected spell is data and is
> shown on the sheet, and the one-time reconciliation is registered as a
> checksum-frozen catalog-data migration with its explicit behavioral source
> boundary declared under D226. The dated notes below amend the affected sections
> visibly; the original design history is not being silently replaced.

## 1. Problem and reproduced finding

B3 is reproducible from `artifacts/polish-sweep/` without inference:

- `caster-species-required-choices.png` says applying Elf cannot record Elven
  Lineage or its spellcasting ability.
- `caster-complete-despite-elf-lineage.png` later says “Every level 1 step is
  complete.”
- `caster-elf-speed-printed-known.png` prints 30 feet even though Wood Elf is 35.
- `caster-elf-lineage-unresolved-trait.png` prints the unresolved table as prose
  while also printing the base Darkvision claim as 60 feet.

The root is the completion predicate, not the screenshots: `speciesChosen`
means only that a `character_species` row exists
(`src/builder/guided-creation.ts:140-170`, `:434-455`). The copied row therefore
acts as proof of a choice it does not contain. The sheet independently reads
that copied row's base speed at `src/queries/character-sheet-builder.ts:799-807`.

The source makes both numbers conditional on the missing answer. Elf has base
Speed 30 and Darkvision 60 (`docs/srd/full/srd-5.2.1.txt:5068-5077`), but the
Elven Lineages table makes Drow Darkvision 120 and Wood Elf Speed 35
(`:5094-5107`). “Print the base and disclose the missing lineage elsewhere” is
exactly D33's forbidden outcome.

## 2. Decisions at a glance

| Question | Taken decision |
|---|---|
| Where is the character's choice stored? | The active guided species `character_source_instances.config`, at `lineage.chosen_option`, with the chosen casting ability at the already-consumed top-level `spellcasting_ability`. |
| New character schema? | **No.** `character_source_instances.config` already exists (`db/schema/character.ts:219-267`) and share wire v1 already carries a source's JSON config (`src/sharing/wire-schemas/v1.ts:154-163`). |
| New catalog schema? | **One constraint/index migration, no new column/table.** The descriptor stays in `species_definitions.grant_rules` (`db/schema/catalog-sources.ts:99-125`), but the three v1-only scheme CHECKs must admit v2 and “current” must become unique per content key across schemes (`db/schema/catalog-content.ts:44-68`, `:258-320`, `:360-409`). Character tables are untouched. |
| Any mint? | **One content-identity mint, no character/share mint.** `content-v1` is frozen (`src/catalog/content-identity.ts:6-25`; `src/catalog/authored-content-projector-contract-v1.ts:149-179`), so U2 adds `content-v2` and leaves every v1 vector byte-identical. The existing source-config JSON field and v18 `portableContent` JSON position carry the character/config and v2 aggregate without a new character column or share tuple/version (`src/sharing/wire-schemas/v18.ts:12-29`). |
| New top-level builder step? | **No.** Lineage is edited inside the existing species step, but D231 says it does not gate step advancement. An unchosen lineage remains named incomplete character state and produces `UNKNOWN` sheet facts. |
| How are spells granted? | The selected option's nested ordinary grant rules are expanded by `SourceRuleReader`; `GrantRuleSlotGenerator` remains the only materializer. |
| What is shown before selection? | `UNKNOWN` on the face of the sheet for every field the descriptor marks lineage-dependent, plus one named completeness item. No 30-foot or 60-foot fallback. |
| Existing Elf with no lineage? | It remains saved, becomes species-incomplete, and projects the dependent values as unknown. No default lineage and no inferred ability are backfilled. |

## 3. Data model

### 3.1 Character state uses the existing source config

The guided species apply already creates the source instance that D56 requires
(`src/builder/guided-creation.ts:1315-1361`). The choice command updates that
row without replacing it:

```json
{
  "lineage": { "chosen_option": "Wood Elf" },
  "spellcasting_ability": "wisdom"
}
```

The exact keys are deliberate:

- `lineage.chosen_option` is the existing declared seam
  (`src/rules/origin-definitions-srd.ts:85-93`) and is already understood by
  `valueAtPath` (`src/grants/source-rule-reader.ts:89-109`).
- `spellcasting_ability` stays top-level because `SpellAccessBuilder` already
  validates and consumes that exact field (`src/access/spell-access-builder.ts:263-280`,
  `:712-740`). “Top-level” means top-level in this one
  `character_source_instances.config`, not global character config: every source
  owns its own ability. A future configured-choice feat therefore cannot collide
  with the guided species source's value. Nesting it would create a second
  resolver.
- The value is a selected option's data value, not a closed application enum.
  Bundled choices are validated against their definition; imported/homebrew
  option strings remain passthrough data. The ability is closed to
  Intelligence, Wisdom, or Charisma for these three bundled descriptors.

High Elf adds one more source-owned config value:

```json
{
  "lineage": {
    "chosen_option": "High Elf",
    "high_elf_cantrip": "2024:prestidigitation"
  },
  "spellcasting_ability": "intelligence"
}
```

> **D231 amendment — 2026-08-09.** `lineage.high_elf_cantrip` records the
> selected spell by stable content key, not name or row id. It is absent when
> High Elf is not selected. The configured-choice option declares the allowed
> Wizard list, cantrip level, sourced initial Prestidigitation reference, and
> sheet-display requirement. Long-Rest replacement timing remains rule prose;
> no rest/session state is introduced.

The writer preserves unrelated config keys. New species apply stops creating
`class_level`; the choice writer also removes that one obsolete key as explicit
cleanup for pre-U2 source rows. The second site is deliberate legacy-row cleanup,
not a second gate implementation. A species spell is keyed to total character
level, not to a fictitious species class level.

### 3.2 `grant_rules` becomes a typed union, not a parallel lineage table

`species_definitions.grant_rules` currently contains 23 flat material rules,
with lineage membership repeated through `active_if_config`
(`src/rules/origin-definitions-srd.ts:104-178`, `:193-280`). Replace the repeated
gates with one `configured_choice` descriptor per required lineage group. Its
shape is:

```ts
interface ConfiguredChoiceRule {
  readonly kind: 'configured_choice';
  readonly rule_key: string;
  readonly label: string;
  readonly config_key: string; // 'lineage.chosen_option'
  readonly required: true;
  readonly ability_choice: null | {
    readonly config_key: 'spellcasting_ability';
    readonly options: readonly ['intelligence', 'wisdom', 'charisma'];
  };
  readonly unknown_sheet_fields: readonly (
    | 'walking_speed_feet'
    | 'darkvision_feet'
    | 'damage_resistances'
  )[];
  readonly projected_trait_names: readonly string[];
  readonly options: readonly ConfiguredChoiceOption[];
}

interface ConfiguredChoiceOption {
  readonly value: string;
  readonly label: string;
  readonly sheet: Readonly<{
    darkvision_feet?: number;
  }>;
  readonly effects: readonly CharacterEffectSeed[];
  readonly grants: readonly GrantRuleObject[];
  readonly replaceable_spell_choice: null | {
    readonly config_key: string; // 'lineage.high_elf_cantrip'
    readonly label: string;
    readonly required: true;
    readonly spell_list: string; // 'Wizard'
    readonly spell_level: 0;
    readonly initial_spell_version_key: string;
    readonly display_on_sheet: true;
  };
}
```

> **D231 amendment — 2026-08-09.** The replaceable spell choice is nested in
> the selected `ConfiguredChoiceOption`, rather than being a second root rule
> kind. That makes its availability identity-bearing with High Elf, avoids a
> duplicate activation gate, and keeps `GrantRule.fromObject` closed. The
> configured-choice parser owns this closed nested shape; content-v2 replaces
> `initial_spell_version_key` with a spell fingerprint reference before
> canonicalization, exactly as it does for nested fixed-spell grants.

This is DATA because the complete option set, its displayed labels, dependent
sheet fields, mechanical effects, and material grant rules live in the stored
definition JSON. Production code switches on `kind` and field vocabulary; it
never switches on `Elf`, `Drow`, `Wood Elf`, `Gnome`, or `Tiefling`.

The parser is a closed discriminated union at the trusted boundary. Across one
source definition, every descriptor key and every material `rule_key`—root or
nested in any option—must be globally unique. It also rejects duplicate option
`value`s; an empty required option set; a config key
other than a non-empty path; an ability outside the domain vocabulary; an
unknown sheet-field key; a non-positive darkvision range; an incoherent effect;
and nested `configured_choice` rules. Every nested material rule is still
validated by `GrantRule.fromObject` as the current seed does
(`src/rules/origin-definitions-srd.ts:303-350`).

It also enforces projection completeness rather than collapsing missing data to
false: if `darkvision_feet` is declared unknown, every option must provide a
positive value; if `damage_resistances` is declared unknown, every option must
provide exactly one coherent damage-resistance effect; and a descriptor cannot
name a projected trait without declaring the structured field that replaces it.
`walking_speed_feet` is the deliberate selected-state exception: **before** a
valid option it still resolves to the unknown union in section 5.1; **after** a
valid option, no speed effect means the sourced copied base, while an explicit
speed effect changes it. Thus Drow/High become known 30 only after selection and
Wood becomes known 35; no incomplete state fails open to the copied base.

`SourceRuleReader` and the stored-content projector must distinguish the union
*before* calling `GrantRule.fromObject`: that parser deliberately rejects an
unknown `kind` (`src/grants/grant-rule.ts:478-488`), and today's
`authoringGrants` calls it for every array member
(`src/catalog/stored-authored-content-projector-v1.ts:542-573`). Ordinary rules
still go through that exact parser; choice descriptors go through the new closed
parser, which recursively sends only their nested `grants` through
`GrantRule.fromObject`.

Do not widen the v1 projector. Its species payload and grant kind are explicitly
frozen (`src/catalog/authored-content-projector-contract-v1.ts:23-30`,
`:149-179`), even though ordinary grant extension *fields* are open. U2-A mints
`content-v2`, whose species aggregate projects an ordered
`source_rules: (AuthoringGrant | ConfiguredChoiceRule)[]`; other content kinds
project identically to v1. That notation describes semantics, not stored local
locators: the v2 portable `ConfiguredChoiceRule` recursively contains
`AuthoringGrant[]`, so nested spell/source ids or keys are replaced with the same
fingerprint references as root grants. Its effects use the existing canonical
effect projection. No database id enters v2 canonical bytes.

The scheme registry and portable-content validator
are currently v1-only at `src/catalog/content-identity.ts:64-90` and
`src/backup/portable-content.ts:825-887`; U2-A replaces their hard-coded v1
branches with exhaustive dispatch by declared registered scheme. This is new
work, not an assumed extension point. The catalog storage/query shape already
carries a scheme discriminator (`src/catalog/content-registry.ts:234-268`,
`:780-809`), but its reconciliation function is explicitly v1-only
(`:812-903`) and becomes scheme-parameterized.

The same migration replaces
`catalog_content_fingerprints_current_scheme_unique`—currently unique on
`(content_key, fingerprint_scheme)` at
`db/schema/catalog-content.ts:312-314`—with a partial unique index on
`content_key WHERE fingerprint_role = 'current'`. Current export performs a
scheme-less single-row lookup (`src/backup/portable-content.ts:497-509`), so two
simultaneous “current” schemes would already violate its contract. Promoting a
v2 fingerprint atomically demotes the prior current v1 fingerprint:

- bundled prior v1 → `bundled-historical`;
- external prior v1 with a successful adjacent projection → `compatible`;
- no lossless adjacency → typed refusal, never silent promotion.

The adjacent v1-to-v2 projector maps an old species aggregate to the same material
grants plus an empty configured-choice list; it never invents a lineage. Bundled
Elf/Gnome/Tiefling are reseeded as v2 current versions under their existing
asserted stable keys, using the registry's version reconciliation rather than
mutating a stored v1 fingerprint. The v18 share tuple is unchanged because
`portableContent` is already an opaque JSON position; its semantic validator is
widened to the registered schemes and old v18 vectors remain byte-identical.

A choice definition is identity-bearing: changing Drow's spell or Wood Elf's
speed produces a different v2 digest rather than silently changing an existing
key. The mint requires the catalog constraint/index migration named in section
2, but no new column/table, source-config schema mint, library envelope mint, or
character-share wire mint.

### 3.3 Exact bundled data

The seed in `src/rules/origin-definitions-srd.ts` owns these descriptors and
continues to cite `docs/srd/source/species-descriptions.txt`. The following is
the required semantic payload; names and numbers are not reproduced in a UI
conditional.

| Species / option | Unknown until chosen | Option effects / projection | Nested grants |
|---|---|---|---|
| Elf / Drow | walking speed, Darkvision | Darkvision 120; no speed effect (base remains 30) | Dancing Lights at 1; Faerie Fire at total level 3; Darkness at 5 |
| Elf / High Elf | walking speed, Darkvision | Darkvision 60; no speed effect; required replaceable Wizard cantrip choice initially sourced as Prestidigitation and displayed on the sheet | Detect Magic at 3; Misty Step at 5 |
| Elf / Wood Elf | walking speed, Darkvision | Darkvision 60; `speed` effect +5 | Druidcraft at 1; Longstrider at 3; Pass without Trace at 5 |
| Gnome / Forest Gnome | no numeric sheet field | no added numeric effect | Minor Illusion and always-prepared Speak with Animals at 1 |
| Gnome / Rock Gnome | no numeric sheet field | no added numeric effect | Mending and Prestidigitation at 1 |
| Tiefling / Abyssal | damage resistance | Poison resistance effect | Poison Spray at 1; Ray of Sickness at 3; Hold Person at 5 |
| Tiefling / Chthonic | damage resistance | Necrotic resistance effect | Chill Touch at 1; False Life at 3; Ray of Enfeeblement at 5 |
| Tiefling / Infernal | damage resistance | Fire resistance effect | Fire Bolt at 1; Hellish Rebuke at 3; Darkness at 5 |

Elf data is sourced at `docs/srd/full/srd-5.2.1.txt:5094-5107`; Gnome at
`:5123-5152`; Tiefling at `:5195-5234`. Tiefling's unconditional Thaumaturgy
remains an ordinary root material rule outside the choice descriptor, but it
uses the descriptor's selected ability (`:5221-5224`).

Wood Elf and Tiefling use the existing character effect vocabulary: `speed`
and `damage_resistance` (`src/rules/species-effects.ts:123-175`). The generic
choice-effect reconciler writes them to `character_effects` with the species
source instance and a stable generated `template_ref` based on
`configured_choice:<rule_key>:<option_value>:<ordinal>`. Switching options
deletes/replaces only rows with that prefix; user-created and other-source
effects survive. No new effect kind or effect column is introduced.

Darkvision is not currently an effect or sheet fact; it is only copied prose
(`tests/unit/rules/origins-srd.test.ts:410-431`). The descriptor therefore adds
one typed `darkvision_feet` projection without pretending that free text is a
number. `projected_trait_names: ['Darkvision']` tells the sheet to replace that
copied trait with the structured row; no trait-name sniffing is performed.

The three descriptors use the same schema. “Lineage” and “legacy” are labels,
not different mechanics. This is the D25 known-set-plus-passthrough shape:
mechanical field keys are closed; option names and user-facing labels are data.

### 3.4 Explicitly retained limits

- High Elf's selected wizard-list cantrip is modeled and displayed. Only the
  Long-Rest timing remains printed rule text: U2 records a replaceable selected
  spell and the sourced initial Prestidigitation without inventing session/rest
  state or enforcing when replacement occurs.

> **D231 amendment — 2026-08-09.** This replaces the original deferral of the
> High Elf cantrip swap. The persistent choice and replacement capability are
> in U2; only rest-cadence enforcement remains prose.
- Forest Gnome's proficiency-bonus number of slot-free Speak with Animals casts
  cannot be represented by today's fixed `free_cast.uses` shape. U2 continues
  to grant the spell as always prepared and castable with slots, without
  printing a fabricated fixed use count. Extending `free_cast` to a sourced
  formula is a separate effects/resource design.
- Rock Gnome's clockwork device is printed prose, not a sheet number or session
  inventory item.

These limits do not justify the existing “lineage spells arrive later”
disclosure. The spells this model can express are real grants; the remaining
unmodelled clauses stay in the trait text and never produce a wrong number.

## 4. Guided flow and completion

### 4.1 Lineage is inside species, not a ninth step

Do not add a `BuildStep`. `GUIDED_LEVEL_ONE_STEP_ORDER` remains the D55 sequence
at `src/builder/contracts.ts:45-64`, so D48's class-first door is unchanged.
Abilities are already complete before species, but the selected casting ability
is still explicit; D64 permits all equal scores and forbids “use the highest” as
an inference.

The existing species route (`src/ui/screens/guided-builder/screen.ts:88-99`)
renders one of two panels from one species-step state read:

1. With no copied species, show the current species cards and apply the choice.
2. Applying a species advances to background whether or not its configured
   lineage choice is valid. Save/reload/share with the answer absent is valid.
3. Navigating back to species shows the lineage options, casting-ability
   select, and any option-specific replaceable spell choice in that same step.

Explicitly navigating back to an already-complete species step shows the current
option and ability selected and permits replacement through the same command;
automatic routing still advances to background. This is the surface used by the
Drow → Wood reconciliation pin—replacement is not a hidden test-only API.

> **D231 amendment — 2026-08-09.** Species copied-row existence remains the
> guided step-advance predicate. `SpeciesChoiceResolution` below feeds the
> named completeness item and honest projection, never routing. An unchosen
> lineage therefore advances, nags, and projects dependent facts as `UNKNOWN`.

The lineage and ability submit is one atomic command. Its input carries
`character_id`, the option value, the ability, `operation_uuid`, and
`expected_revision`; it resolves the one active marker-owned guided species
source itself rather than accepting an arbitrary source id. It validates the
option and ability against the stored descriptor, merges the two config fields,
reconciles option effects, invokes `GrantRuleSlotGenerator.generateForSource`,
and advances the character revision. Invalid option, invalid ability, missing
source, wrong source kind, and stale revision are typed refusals. A failed
effect or grant reconciliation rolls the config change back.

### 4.2 One completion predicate

Replace `GuidedStepEvidence.speciesChosen` with `speciesComplete`; do not add a
second UI-only flag. Its single resolver returns:

```ts
type SpeciesChoiceResolution =
  | { readonly kind: 'no_species' }
  | { readonly kind: 'complete'; readonly choices: readonly ResolvedChoice[] }
  | {
      readonly kind: 'incomplete';
      readonly source_name: string;
      readonly missing: readonly ('option' | 'spellcasting_ability')[];
    }
  | { readonly kind: 'unresolvable'; readonly reason: string };
```

`speciesComplete` is true only for `complete`, but it is a character
completeness fact rather than the guided step-advance gate. A species definition with no
configured choice remains complete when its copied row exists. A required
choice is incomplete when its option is absent, unknown, its ability is absent,
or its ability is outside the descriptor's allowed set. Malformed bundled data
fails the seed; malformed imported data is `unresolvable`, never treated as no
choice required.

The guided species editor, sheet projection, and character completeness query
all consume this same resolver. Guided routing deliberately does not: under
D231 it advances on copied-row existence. This prevents a repeat of B3 without
turning a named missing answer into a blocker.

The existing literal disclosure machinery is then deleted, not preserved:

- `GuidedOriginOption.grants_lineage_spells`,
  `LINEAGE_SPELL_SPECIES_CONTENT_KEYS`, and `grantsLineageSpells` at
  `src/builder/contracts.ts:85-120`;
- the Elf/Gnome/Tiefling entries in `SPECIES_UNMADE_CHOICES`,
  `LINEAGE_GATED_SPECIES_CONTENT_KEYS`, and
  `LINEAGE_GATED_SPELLS_DISCLOSURE` at
  `src/ui/screens/guided-builder/species-step.ts:69-189`.

They exist only to explain a choice the app cannot make. Keeping them after the
choice is implemented would be F10-shaped machinery protecting a retired gap.
Unrelated unbuilt species choices (Dragonborn ancestry, Goliath ancestry,
Human/Tiefling size, Human Versatile feat) remain disclosed and do not become
implicitly solved by U2.

## 5. Honest sheet projection

### 5.1 Walking speed

At `src/queries/character-sheet-builder.ts:799-807`, replace the bare
`character_species.base_speed_feet` read with the shared species-choice
resolution plus the copied base read. The read model becomes discriminated:

```ts
type SheetKnownOrUnknownNumber =
  | { readonly kind: 'known'; readonly value: number; readonly detail: string }
  | { readonly kind: 'unknown'; readonly detail: string };
```

`CharacterSheet.walking_speed_feet: number | null`
(`src/queries/character-sheet-builder.ts:351-395`) becomes
`walking_speed: SheetKnownOrUnknownNumber`. Rules:

- no species or a nullable user-entered base → unknown for the existing reason;
- an incomplete choice whose descriptor lists `walking_speed_feet` → unknown,
  detail “UNKNOWN until Elven Lineage is chosen”;
- otherwise compute the copied base plus eligible effects and the armour
  penalty through `walkingSpeedFeet` (`src/rules/species-effects.ts:212-235`).

The UI row at `src/ui/screens/sheet/sheet-view.ts:1202-1214` prints `UNKNOWN`
as its value, not a blank and not “30 feet.” Its detail distinguishes missing
species speed from a missing lineage. The machine-readable sheet fact is null
for unknown and is derived from this same union; it does not independently
re-run the predicate.

### 5.2 Darkvision and lineage effects

Add an optional structured `lineage_darkvision` row to `CharacterSheet`:

```ts
type SheetLineageDarkvision = null | SheetKnownOrUnknownNumber;
```

It is non-null only when a configured choice descriptor declares
`darkvision_feet`. Before an Elf lineage is chosen it prints “Darkvision —
UNKNOWN”; afterwards it prints 120 feet for Drow and 60 for High/Wood Elf.
`#printedFeatures` (`src/queries/character-sheet-builder.ts:1356-1382`) omits
only trait names in the descriptor's `projected_trait_names`, so the copied
“Darkvision 60 feet” prose cannot contradict the structured row. Other species'
Darkvision prose remains unchanged.

Tiefling's *selected* resistance is an ordinary `character_effects` row, so the
existing summary remains the chosen-state consumer
(`src/rules/species-effects.ts:123-175`). There is intentionally no effect row
before selection: writing a null/placeholder effect would make absence resemble
a sourced effect. Instead, add
  `lineage_damage_resistance: null | { kind: 'unknown'; detail: string } |
{ kind: 'known'; values: readonly string[] }` to `CharacterSheet`. The sheet
builder synthesizes the unknown arm directly from an incomplete descriptor that
declares `damage_resistances`; the selected arm is populated from the ordinary
effect summary, restricted to the descriptor-owned source/template prefix. The
UI combines that arm with known resistances from other provenance into its one
resistance line: an unchosen lineage adds an `UNKNOWN` segment without hiding a
known resistance from another source, and a chosen lineage is de-duplicated with
the known values. The UI line at
`src/ui/screens/sheet/sheet-view.ts:1215-1238` renders that union. Before
Fiendish Legacy it therefore says `UNKNOWN`, not “None chosen”; afterwards it
lists only the chosen effect type. Species without that declared dependency keep
today's resistance summary and omission behavior.

### 5.3 Named completeness item

Add `required_source_choice` to the one completeness vocabulary in
`src/queries/character-completeness.ts`. The item names the source, choice label,
missing option and/or casting ability, and remedies it in the guided species
step. The sheet's “What this sheet does not show” list consumes the same item;
do not add a permanent `SHEET_GAPS` disclosure. Once the choice is valid, the
item disappears.

## 6. Grants and level changes

### 6.1 Selected grants are expanded, not reimplemented

`SourceRuleReader.rulesForSource` currently parses every object in
`species_definitions.grant_rules` directly as a `GrantRule`
(`src/grants/source-rule-reader.ts:174-210`). Change this boundary and the v2
stored/portable projector boundary together:

- ordinary material rules pass through unchanged;
- a `configured_choice` is recognized and validated before the material-rule
  parser, its chosen option is read from source config, and only that option's
  nested `grants` are then passed to `GrantRule.fromObject` and returned;
- no option returns no nested rules, not a guessed default;
- the unconditional root rules are returned alongside the selected nested set.

From that point onward, the existing `GrantRulePlanner` and
`GrantRuleSlotGenerator.generateForSource` remain the materialization path
(`src/grants/grant-rule-planner.ts:144-180`,
`src/grants/grant-rule-slot-generator.ts:157-325`). Fixed spell slots retain
species source provenance. Switching lineage causes generator reconciliation to
orphan/deactivate the old option's stable rule keys and activate the new ones;
it never directly inserts a “character spell.” This is D56's delete-the-
disclosure rule in full: actual grants replace the limitation text.

### 6.2 Chosen casting ability

The same atomic choice command stores the selected ability before it invokes
the generator. Every resulting route reads it through the existing
`SpellAccessBuilder` path. Save DC, spell attack, attack-cantrip profiles, build
report, and spell section therefore share one value. If config is missing or
crossed, the choice remains incomplete and those calculations stay null; no
class ability and no highest ability substitutes.

### 6.3 Level-keyed rules use total character level

Replace lineage rules' `active_from_class_level` with a new material-rule field
`active_from_character_level`. It is validated as `CharacterLevel` 1..20 and
evaluated from `characterLevel(db, source.characterId)`, never from source
config. `active_from_class_level` remains semantically distinct.

The two gate fields are mutually exclusive on one material rule. Parsing a rule
that declares both is a typed error; there is no evaluation precedence. A rule
with neither is active independent of level, subject to its other gates.

Both current gate sites must learn the new value. `SourceRuleReader` adds
`characterLevelForSource` and checks it in `ruleIsActiveForSource` next to the
class-level check at `src/grants/source-rule-reader.ts:213-266`.
`GrantRulePlanInput` adds `effective_character_level`, and the planner checks
`activeFromCharacterLevel` beside its current `effective_class_level` guard at
`src/grants/grant-rule-planner.ts:39-44`, `:150-169`. The slot generator supplies
total character level for every source. Its separate `effectiveClassLevel()`
currently reads `config.class_level` for non-class sources
(`src/grants/grant-rule-slot-generator.ts:328-345`); that method is **not** the
new gate and is not renamed or reused. It returns null for the rewritten species
rules once species apply stops writing `class_level`; this is safe because fixed
lineage spells use neither the class gate nor the spellbook-acquisition fallback
that consumes `effective_class_level`
(`src/grants/grant-rule-planner.ts:214-229`). Existing non-species configured
class-level sources retain their current behavior.

After `LevelUpClassCommand` changes a class row and synchronizes class sources
at `src/commands/level-up-class.ts:281-339`, it regenerates every active source
whose definition contains a character-level-dependent rule. The selector is
data-driven and recursively inspects nested configured-choice grants, not
`source_type = 'species'` or an Elf/Gnome/
Tiefling list. Level 2 activates nothing; reaching total levels 3 and 5 activates
the chosen option's exact rules. Removing a class or undoing a level must run
the same reconciliation in reverse so the no-longer-active slot is preserved by
the generator's existing orphan lifecycle rather than silently remaining live.

The species apply bridge itself stops writing `{"class_level":1}` at
`src/builder/guided-creation.ts:1342-1353`; the choice command does not merely
remove it later. This deletes the current fiction documented at
`src/rules/origin-definitions-srd.ts:54-70` and
`src/builder/guided-creation.ts:1294-1299`, where a species carries a manually
maintained `config.class_level` even though the source says character level.

## 7. Existing characters and migration posture

No option or ability is backfilled. In particular, Drow is not selected because
it appears first, and Intelligence is not selected because the character is a
Wizard. Both would turn absence into an indistinguishable fabricated fact.

On first boot with the new seed:

1. Bundled `species_definitions.grant_rules` are rewritten by the existing
   idempotent seed (`src/rules/origin-definitions-srd.ts:353-439`), then registered
   as current `content-v2` versions. Stored v1 fingerprints remain immutable
   history; the asserted stable content key is reconciled to the new current
   version.
2. A current guided Elf/Gnome/Tiefling already has the marker-owned species
   source. Its old config lacks the new answer, so the shared resolver returns
   `incomplete`; the character remains saved and can finish the species panel.
3. A one-time idempotent catalog-data reconciliation scans active source
   instances whose definition moved to v2 and calls the existing generator. Its
   old fixed lineage slots, if present in dev data, become orphaned because the
   unchosen nested rule set is empty. Re-running the reconciliation changes no
   row identity or state.
4. A copied affected species with no resolvable source instance is
   `unresolvable`, not complete. Under D60 there is no name-matching adapter and
   no synthetic source mint. Development data in that state may be deleted and
   recreated; production code must not guess its catalog identity.

There is no **character** schema migration, character-share wire compatibility
arm, old-key alias, or defaulting branch. The catalog constraint/index migration
is required solely by the v2 scheme. Existing linked characters are deliberately
preserved as incomplete because that is already a valid D70 state; D60 is used
to refuse character compatibility machinery, not as a reason to conceal the
missing choice. The lossless v1→v2 projector protects frozen content identity;
it does not default character state.

> **D231/D226 amendment — 2026-08-09.** Step 3 is a registered
> checksum-frozen catalog-data migration, not an unregistered boot pass. Its
> `sources` declaration freezes the migration implementation, lineage seed,
> configured-choice and material-rule parsers, source-rule reader,
> planner/generator, stored v2 species projector, identity kernel, and
> fingerprint reconciler. A change to any of those declared behavioral sources
> moves the checksum. This is the D226 restatement option: the claim is bounded
> to that explicit source set, not the full transitive database/runtime graph;
> general transaction, codec, and database infrastructure remains outside it.

## 8. Implementation dispatch

1. **U2-A — data contract, content-v2, schema, and seed.** Add the
   configured-choice parser; widen the three catalog scheme CHECKs and replace
   the per-scheme current index through the next Drizzle migration; mint the
   scheme/adjacent projector and exhaustive scheme-dispatched registry/portable
   validation while freezing v1; replace flat gated bundled lineage rules with
   the three descriptors including High Elf's nested replaceable wizard-cantrip
   choice; add `active_from_character_level`; register/reconcile bundled v2
   versions through the D226-frozen catalog-data migration.
2. **U2-B — shared resolution and command.** Add one resolver, species-step
   state/RPC, the revisioned atomic choice command, and generic configured-choice
   effect reconciliation.
3. **U2-C — builder UI and completion.** Render lineage and ability inside the
   species step; change guided completion to the shared resolver; delete the
   lineage limitation/disclosure literals.
4. **U2-D — projection and level reconciliation.** Mask walking speed, add
   structured lineage Darkvision, fix resistance detail, add the named
   completeness item, and regenerate character-level-dependent sources on every
   total-level change.
5. **U2-E — portability and full controls.** Prove share/backup/content-closure
   round trips, then run unit/integration/browser gates.

U2-A must land before the remaining increments because every other increment
consumes its discriminated data contract. U2-B and U2-D must land together or
behind one branch: writing a choice without honest projection, or masking values
without a way to choose, is not a valid intermediate release.

## 9. Test plan

### 9.1 Pins that must pass

**Data/source pins**

- Enumerate every option and every level-1/3/5 spell in section 3.3 against the
  SRD extract. Pin values, not only counts.
- Pin Elf's per-option speed effect/Darkvision projection, Tiefling's three
  resistance effects, all three ability-choice sets, and unconditional
  Thaumaturgy.
- Round-trip the configured-choice union through source projection/import and
  prove its canonical identity changes when a nested spell, effect, range, or
  option changes. Reinsert the same nested spell under different local row ids
  and prove canonical bytes do not change; the nested portable fingerprint, not
  the local id/key locator, is identity-bearing.
- Pin every existing content-v1 canonical vector byte-for-byte, then pin v1
  species → v2(empty choices) adjacency and a v2 Elf portable-content round trip.
  A v1 aggregate must never acquire a guessed lineage during compatibility
  projection.

**Flow/completion pins**

- Apply Elf: the row and source exist, `current_step` advances to `background`,
  config contains no guessed choice, the named completeness item remains, and
  navigating back/reloading species returns the lineage panel.
- Select each Elf option table-driven with each allowed ability: config is
  exact, `current_step` remains `background`, and the spell routes report the
  selected ability. High Elf also records and displays its replaceable selected
  Wizard cantrip, initially Prestidigitation.
- Gnome and Tiefling use the same state/RPC/command path; no species-name branch
  is present (a structural grep/ast-grep control).
- Dwarf (no descriptor) remains complete on copied-row existence, proving the
  new predicate did not make every species require lineage.

**Projection pins**

- Unchosen Elf: walking speed value is literally `UNKNOWN`, structured
  Darkvision is literally `UNKNOWN`, and neither “30 feet” nor the copied
  “Darkvision ... 60 feet” appears anywhere in readable or structured sheet
  output.
- Chosen Drow/High/Wood: 30/30/35 speed and 120/60/60 Darkvision respectively.
- Unchosen Tiefling: damage resistance says `UNKNOWN`, not “None chosen”; each
  selected legacy yields only its own type. A known resistance from another
  source remains visible beside the lineage `UNKNOWN` segment and is not masked
  or duplicated after selection.
- The named completeness item appears on guided builder, character list/report,
  readable sheet, print, and machine projection, then disappears after choice.

**Grant/level pins**

- At total levels 1 and 2, only level-1 grants are active. Crossing to total 3
  activates exactly the level-3 spell; crossing to 5 activates exactly level 5.
- Switch Drow → Wood: Drow slots cease to be active, Wood slots/effect appear,
  and no duplicate slots or effects are created after repeated generation.
- Level rollback/removal deactivates a now-ineligible level-3/5 lineage spell.
- Share v18 and full backup round trips preserve option, ability, active grants,
  speed/Darkvision/resistance projection, and incompleteness when unchosen. The
  share version remains unchanged; a pre-U2 v18 vector remains byte-identical.
- Seed a bundled v1 Elf under its asserted stable key, run the U2 catalog-data
  reconciliation twice, and pin: the v1 fingerprint remains immutable history,
  its role becomes `bundled-historical`, the v2 fingerprint is the only current
  row across all schemes, the stable key is unchanged, the linked character
  source still resolves, and the second run produces no changes. An external v1
  species with a lossless empty-choice adjacency instead retains v1 as
  `compatible` after v2 promotion.

### 9.2 Negative controls

- Mutate Wood Elf's stored speed effect from +5 to +4: the exact 35-foot pin
  fails. This proves the test is not regenerated from production output.
- Mutate Drow Darkvision 120 to 60: the Drow/High negative pair fails.
- Delete the configured option but leave spell slots: completion and projection
  stay unknown and regeneration deactivates the stale slots.
- Store `lineage.chosen_option = 'Moon Elf'` or ability `strength`: resolution
  is incomplete/unresolvable; no option, spell, speed, or DC is guessed.
- Give two nested options the same material `rule_key`, collide a nested key
  with a root key, or put both level-gate fields on one rule: seed/import refuses
  the definition before any character state is written.
- Submit a valid option for the wrong character/species, a stale revision, or an
  extra payload key: the command refuses and changes zero rows.
- Inject failure after config update but before grant/effect reconciliation:
  the whole transaction rolls back.
- Execute the real command through the command executor, then undo and redo; the
  complete captured state (source config, option effect, active/orphaned spell
  slots, and revision) must equal its before/after snapshots exactly.
- Give a fixture species a configured choice with unfamiliar option labels:
  they round-trip and render, proving there is no closed Drow/High/Wood enum.

### 9.3 Existing tests that move

These are ruling-driven replacements, not deletions to reach green:

- `tests/unit/ui/guided-builder.test.ts:439-499`: replace “cannot make lineage”
  and delayed-spells disclosure assertions with the lineage form, ability
  choice, hostile-label escaping, and deletion assertions for the old copy.
- `tests/integration/builder/guided-species.test.ts:490-733`: replace dormant
  lineage/config `{"class_level":1}` assertions with option selection,
  ability, reconciliation, and shared Gnome/Tiefling coverage. Keep source
  ownership, replacement, atomicity, and idempotence tests.
- `tests/integration/builder/guided-build-state.test.ts:79-102`: retain the
  copied-species step-advance predicate for descriptor-free and lineage species;
  add the latter's independent named-completeness and `UNKNOWN` controls.
- `tests/unit/rules/origins-srd.test.ts:144-152`, `:218-258`, `:324-361`, and
  `:410-431`: the prose parser pins stay; add descriptor-to-prose linkage and
  move Tiefling's unresolved resistance expectation to selected-option data.
- `tests/integration/rules/origins.test.ts:447-457`: replace the unconditional
  null Fiendish Legacy effect with unknown-before/typed-after choice.
- `tests/integration/queries/character-sheet.test.ts:807-855` and
  `tests/unit/ui/sheet-view.test.ts:1637-1642`: replace nullable generic speed
  assertions with the known/unknown union and stale-base negative control.
- `tests/unit/ui/equipment-step.test.ts:300` and
  `tests/browser/acceptance-walkthrough.spec.ts:233`: keep the completion copy.
  A lineage fixture may advance with the choice absent, but its completeness
  item and `UNKNOWN` projections remain until the choice is recorded.
- Source projection/import, backup, sharing codec, and column-portability suites
  do **not** gain a new table/tuple expectation. They gain semantic config and
  content-closure round trips.
- `tests/unit/schema-check-constraints.test.ts:1596-1600` and migration/schema
  snapshot tests move from the v1-only scheme set to exactly `{content-v1,
  content-v2}` for `catalog_data_migrations`, `catalog_content_fingerprints`, and
  `catalog_content_match_decisions`; they also prove two schemes cannot both be
  current for one content key. An unknown `content-v3` remains a negative
  control.
- `tests/unit/catalog/authored-projector-v1-vectors.test.ts` stays frozen.
  `tests/integration/catalog/stored-authored-content-projector-v1.test.ts` gains
  a negative control proving v1 rejects `configured_choice`; new v2 projector
  tests own the descriptor vectors. `tests/integration/backup/portable-content.test.ts`
  gains scheme-dispatch, v1-adjacency, and v2 species closure pins.

## 10. Verified and unverified assumptions

Verified locally:

- The four sweep images establish B3's current user-visible behavior.
- Guided completion is copied-row existence
  (`src/builder/guided-creation.ts:147-149`, `:448-455`).
- Guided species apply creates a marker-owned source and runs the existing
  generator (`src/builder/guided-creation.ts:1276-1361`).
- Lineage grants are already stored in `species_definitions.grant_rules` and
  gated by source config (`src/rules/origin-definitions-srd.ts:41-70`,
  `:193-280`).
- `SourceRuleReader` evaluates dotted config paths
  (`src/grants/source-rule-reader.ts:249-266`).
- `SpellAccessBuilder` already reads the proposed top-level ability key
  (`src/access/spell-access-builder.ts:263-280`, `:712-740`).
- Source config is already schema-backed and carried on share wire v1
  (`db/schema/character.ts:219-267`,
  `src/sharing/wire-schemas/v1.ts:154-163`).
- Nested generator calls are atomic rather than an assumption: the generator
  opens its own transaction (`src/grants/grant-rule-slot-generator.ts:178-189`),
  and `TransactionRunner` maps nested transactions to SQLite savepoints
  (`src/db/transaction.ts:5-26`). The choice command can therefore own the outer
  config/effect/grant transaction.
- Undo coverage is also present in the current snapshot vocabulary:
  `character_source_instances`, `spell_selection_slots`, and
  `character_effects` are all captured and restored in dependency order
  (`src/domain/contracts/tables.ts:1387-1433`, `:1443-1463`). The existing
  source-config command already captures before mutation and returns an internal
  snapshot inverse (`src/commands/update-source-config.ts:240-275`), with an
  integration round trip at `tests/integration/commands/rules-and-sources.test.ts:244-349`.
  U2 reuses that pattern and adds the command-specific pin in section 9.2.
- Content-v1 is frozen and cannot accept the new discriminant
  (`src/catalog/content-identity.ts:6-25`,
  `src/catalog/authored-content-projector-contract-v1.ts:149-179`); the design's
  content-v2 mint is decided, not an implementation preflight.
- Content-v2 has no accidental support in the current registry/schema: the
  database CHECKs are v1-only (`db/schema/catalog-content.ts:44-68`, `:258-320`,
  `:360-409`), portable validation rejects other schemes
  (`src/backup/portable-content.ts:825-887`), and reconciliation is named and
  hard-coded v1 (`src/catalog/content-registry.ts:812-903`). Those verified facts
  are why U2-A explicitly owns the constraint/index migration and exhaustive
  dispatch. Export's scheme-less current lookup
  (`src/backup/portable-content.ts:497-509`) proves promotion must leave only one
  current fingerprint across schemes.
- Level-up currently regenerates class state only
  (`src/commands/level-up-class.ts:328-339`), so level-keyed species rules need
  the explicit reconciliation in section 6.3.
- The SRD rows and numbers in section 3.3 were checked in
  `docs/srd/full/srd-5.2.1.txt:5068-5152` and `:5189-5234`.

Not verified / explicit assumptions:

- No inventory of a real persisted browser database was available. The
  migration posture is proven against writers and wire shape, not against a
  user's OPFS file. D60 says there are zero real users.
- U2 does not claim to solve Dragonborn ancestry, Goliath ancestry, size,
  Versatile Origin feat, High Elf Long Rest replacement timing, or Forest
  Gnome's proficiency-bonus free-cast pool. Their retained disclosures/prose
  must remain accurate.
