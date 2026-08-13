# Type-contract audit — what our objects CONTAIN, and how they compose

Date: 2026-08-13
Scope: object contracts only. Discovery and proposal; no production changes.
Status: PROPOSAL, revised after round-1 and round-2 review.
`.claude/decisions.md` outranks every recommendation here. Both rounds' findings
and their dispositions are §7.
Governing ruling landed after drafting — **D235**: a row conflicting with its
declared types must be unstorable at write time and must THROW at read time,
validated through a parse boundary per query. R2's projector and R4's typed
state are instances of D235, not optional styles; every accepted lane below
builds its read path to that rule.

### Where D235 stops, and D8 resumes

D235 and D8 govern different boundaries, and every throwing projector proposed
below is scoped to the first of them.

- **In-app reads** — a query inside a running application projecting rows into
  domain objects. D235 governs: a row that violates its declared contract
  throws at the projection, per query result. This is the boundary R2's
  `slotContract(row)` and R4's typed `state` sit on.
- **Import and restore** — reading a backup, a shared export, or a document
  authored against an older shape. **D8 governs unchanged**: *"over-strictness
  is the highest-severity failure at the backup boundary — a contract narrower
  than its column makes a user's own backup unrestorable."* These paths keep
  their accept-and-migrate posture. They admit what the column admits, migrate
  it forward, and only then hand a conforming row to the in-app read path.

The practical rule: a projector may throw on a row that came out of *our*
database, because a write path that let it in is a bug we want loud. It may not
be placed in front of a restore, because there the row is the user's data and
the older shape is expected. D235's own text draws the same line when it says
reads validate "per query result, not only at import/backup boundaries as
before" — it moved validation *inward*, it did not tighten the import gate.

**The boundary has a second half, and round-1 stated only the first.** D235 has
a write-side obligation as well as a read-side one — a conflicting row must be
*unstorable*, which in practice means a CHECK — and **DDL is not inward**. A
CHECK constrains every INSERT into the table, including the ones the restore
path issues directly (`insertPortableRow`,
`src/backup/character-backup.ts:2230`, called for slot rows at `:3090`: a
generated `INSERT INTO "spell_selection_slots"` with no domain object between
the document and the table). So routing a *projector* away from restore does not
keep a lane's *constraints* away from restore. Wherever an accepted lane adds a
CHECK, the versioned import normalization for the combinations that CHECK newly
forbids is a **precondition of the DDL**, not a follow-up and not out of scope —
the accept-and-migrate posture D8 mandates, executed before the gate closes
rather than after users hit it.

This matters most for R2. Round-1 finding 1 is correct that a throwing slot
projector, dropped in without this boundary, could make an exportable backup
unrestorable and would contradict D8; round-2 finding 1 is correct that scoping
the projector away from restore did not discharge that obligation, because R2's
CHECKs reach restore's INSERTs regardless. R2 below therefore specifies its
projector as an in-app read boundary, gated behind a data audit and matching
DDL, **and** carries versioned restore/share normalization as precondition 2b,
landing before the migration. The restore path is out of scope for the
*projector* and squarely in scope for the *lane*.

## 1. The directive and the method

The owner's directive, verbatim:

> use the Foundry dnd5e deep-dive findings to improve our use of types in TS.
> [...] what a spell, character, class, subclass, feat, species, background,
> level-up, grant rule, and effect object CONTAINS (required vs optional), and
> how other types COMPOSE them. [...] prefer composition over inheritance; no
> deep taxonomy; dependency injection in constructor preferred.

Explicitly **not** in scope: bool-vs-int primitive typing, or the nullability of
individual scalars already defended under D6b. This is about **shape** — which
fields an object must carry, which it may omit, which other type may hold it.

### Method

Five internal mapping studies (catalog model, grant/choice model, design law,
derived calcs, and the comparative Foundry and Open5e deep-dives) were produced
as pre-digested evidence. They are the source of all Foundry-side claims; their
module paths are reproduced here. Every claim about **our** code was re-verified
against the working tree before it was written. Three claims did not survive
that check:

- **`orphan_reason_code` is not "one value in use".** There are five literals
  across three partly-colliding vocabularies — §2.10.
- **A `scale_value` grant-rule kind is not the gap.** We already have a
  stronger mechanism (`src/domain/value-expression.ts`,
  `src/domain/feature-values.ts`) — §3.4, R8.
- **The composition pattern the directive asks for already exists here**, in
  one file, unused outside its own module: `src/authoring/effect-forms.ts:11-76`.
  Most of the effect work is promotion, not invention — R1.

Foundry paths are theirs as recorded in the study (system 5.3.3). We did not
run their code; the two defects in §3.5 are apparent from reading, not
reproduced.

**Round-1 review changed that count.** An independent review found nine
defects, five of them premise errors in the proposals rather than in the
inventory. Every one was re-verified against the working tree before being
adopted, and every correction below is marked "corrected in review" in place;
§7 is the per-finding disposition table. The honest summary: the **inventory**
survived review almost intact, and the **proposals** did not — R1, R2, R3, R5
and R6 each rested on at least one claim about the codebase that was false. The
method above ("every claim about our code was re-verified") was applied to §2
and not applied with the same rigour to §4. That is the process finding.

---

## 2. Contract inventory

### 2.1 Spell — two identities, and the discipline holds

`SpellIdentityRow` / `SpellVersionRow` (`src/domain/models.ts:38`, `:46`) over
`spell_identities` / `spell_versions` (`db/schema/catalog-spells.ts`). A version
requires `content_key`, `spell_identity_id`, `display_name`, `rules_edition`,
`level`, `school`, `ritual`, `concentration`; the structured range/area quartet,
the material-cost pair and every summary field are optional. Constructed by
`CatalogImporter` (`src/catalog/catalog-importer.ts:244`, ctor-injected `db`)
and the SRD seed parsers. Everything character-facing composes a **version**,
never an identity, and `SpellVersionId` / `SpellIdentityId` are separate brands
(`src/domain/ids.ts:33`, `:35`) because the two were conflated as bare `number`
before.

No material drift. The correlated pairs here (`range_kind`/`range_feet`,
`area_shape`/`area_feet`, `material_cost_copper`/`material_cost_kind`) have both
a CHECK and a real domain union above them (`src/domain/spell-range.ts`,
`src/domain/spell-components.ts`) — exactly the shape §2.9 lacks, in the same
codebase, on an adjacent table. That is the proof the fix is affordable.

### 2.2 Character — thin by design

`CharacterRow` (`src/domain/models.ts:99`) requires six ability scores,
`rules_edition_preference`, `allow_legacy`, `revision`; optional are
`ability_allocation_method` (D64 — the null *is* the signal),
`proficiency_bonus_override`, four flavour fields, `archived_at`. Nothing
composes it structurally; the character is assembled at read time by
`src/queries/character-sheet-builder.ts` and `character-workspace-builder.ts`,
because per D11 the sheet core is derived and `db/schema/sheet-inputs.ts`
declares the three stored sheet inputs and nothing else.

**Drift.** `CharacterRow.id: number`. `CharacterId` exists
(`src/domain/ids.ts:37`) and is applied at the Drizzle column via
`.$type<CharacterId>()`, but every id on every row model in
`src/domain/models.ts` is bare `number`. The brands guard the schema layer, not
the read models.

### 2.3 Class and subclass — separate tables, and that is correct

`ClassDefinitionRow` (`src/domain/models.ts:125`), `SubclassDefinitionRow`
(`:141`). A class requires `content_key`, `name`, `rules_edition`,
`progression_type`, `supports_ritual_casting`; everything spellcasting-shaped is
nullable, correctly under D6b — a Fighter has no spellcasting ability and
inventing one is the data-loss failure. Composed by `class_progressions` (per
level, carrying `grant_rules` as JSON), `class_feature_effects`,
`class_feature_value_contributions`, `named_features`. Subclass carries a
redundant unique `(id, class_definition_id)` solely to be the target of a
composite FK from `character_class_levels`, so a subclass of the wrong class is
unrepresentable — Open5e's self-FK alternative demonstrably fails here.

**Drift.** `ClassContentAggregateV1`
(`src/catalog/source-content-projector-v1.ts:72`) redeclares `kind`, `name`,
`rules_edition` inline rather than reusing any fragment. §2.4 shows the cost.

### 2.4 Feat — three shapes of one object, and the effects gap

The worst contract drift found. A feat exists in the type system three times:

| Where | Identity | Category | Grants | Effects |
|---|---|---|---|---|
| `src/rules/feats-srd.ts:55` `SrdFeatDefinition` | `content_key: BundledFeatContentKey & ContentKey` | `source_category` + `grouping` | `grant_rules: GrantRuleObject[]` | — |
| `src/builder/level-up-wizard.ts:201` `FeatDefinitionForApplication` | `content_key: ContentKey` | `grouping` | `grant_rules: GrantRuleObject[]` | — |
| `src/catalog/source-content-projector-v1.ts:106` `FeatContentAggregateV1` | `kind: 'feat'` + `name` | `category: string \| null` | `grants: AuthoringGrant[]` | — |

Two names for the grants field, three identity conventions, and
`ability_points` typed `FeatAbilityPoints`, `0 | 1 | 2`, and `number`
respectively. No compiler check relates any two; a feat crossing catalog →
level-up passes through a hand-written translation.

**Corrected in review: the taxonomy column is not three names for one field.**
`SrdFeatDefinition` carries `source_category` *and* `grouping` side by side
(`src/rules/feats-srd.ts:59-60`) — the first is the SRD's printed heading
(`'Origin' | 'General' | 'Fighting Style' | 'Epic Boon'`, `:49`), the second is
our normalized `KnownFeatGrouping`. `FeatDefinitionForApplication` carries only
`grouping`; `FeatContentAggregateV1` carries only `category: string | null`,
which is the projected, un-narrowed form. So `grouping` is a real shared field
whose type survives one hop and is lost at the other, and `source_category` is
a genuinely different fact. The drift is the *narrowing* being dropped at the
projector, not three accidental synonyms — the earlier phrasing overstated it.

**The effects gap.** `SpeciesContentTrait.effects` and
`BackgroundContentAggregate.effects` (`src/authoring/contracts.ts:308`, `:337`)
both carry `readonly AuthoringCharacterEffect[]` — the full ten-member
`characterEffectKinds` vocabulary. `FeatContentAggregateV1` has **no effects
field at all**. Verified downstream: a feat's only path to a `character_effects`
row is `abilityEffects()` (`src/rules/feat-application.ts:477`), which derives
effects solely from `ability_points` / `ability_increase_abilities` /
`ability_increase_maximum`, and `buildFeatApplicationPlan` (`:665`) throws if
the produced effect count disagrees with the typed ability-point model. Nine of
the ten character effect kinds are unreachable from a feat, in the catalog
contract and the application path both.

That is defensible under D51 ("most feats are text; three kinds earn
structure") — but it is nowhere stated as a decision *on this contract*. Today
it reads as an omission and the type gives no signal which it is.

### 2.5 Species and background — the healthiest aggregates

`SpeciesContentAggregate` (`src/authoring/contracts.ts:297`) and
`BackgroundContentAggregate` (`:337`) both `extends PublishableHomebrewBase<K>`
(`:289`), which supplies `kind`, `name`, `rules_edition`, `reference_text`.
Species composes `SpeciesContentTrait[]` — each a name, a free-text
`description`, and a **list** of typed effects, D12's known-set-plus-passthrough
made literal, the list plurality being a recorded bug fix — plus
`grants: AuthoringGrant[]`.

`PublishableHomebrewBase<K>` and `AuthoringDraftBase<K>` (`:128`) are generic
single-parent bases over exactly the three D133 authoring kinds. They are
shallow and they work. The criticism is not that they exist; it is that class
and feat — the two kinds that are *not* author-created — cannot reuse them and
so hand-roll the same four fields (§2.3, §2.4).

### 2.6 Level-up / planned choice — pure, projected, repetitive

`src/builder/level-up-wizard.ts`: `FeatApplicationPlan` (:183),
`LevelUpPlannedSkillProjection` (:247), `LevelUpPlannedExpertiseProjection`
(:254), a three-arm `LevelUpPlannedSpellProjection`, and
`LevelUpPlannedChoiceProjection` (:286) composing the three arrays. Below them
`PlannedSpellGrant` (`src/grants/grant-rule-planner.ts`) is a clean two-arm
union produced by a pure function.

**Drift.** `LevelUpPlannedSkillProjection` and
`LevelUpPlannedExpertiseProjection` are field-identical — `locator`,
`source_label`, `source_catalog_layer`, `available_skills`. The first three also
appear on all three arms of `LevelUpPlannedSpellProjection`. Four declarations
of one provenance triple.

### 2.7 GrantRule — the house style, and the shape to copy

`src/grants/grant-rule.ts:453`. One class, `readonly kind: GrantRuleKind`,
**private constructor** (`:465`), `fromObject` (`:480`) the only entry point.
Invalid input is unrepresentable: every violation throws `TypeError` /
`RangeError`, and there is no `Result` union in the file. Per-kind requirements
live in `validateKindFields`, not in the type — the class is one shape with
eleven common fields plus a private `data: GrantRuleObject`.

The field registry is the pattern this document keeps returning to:
`GRANT_RULE_FIELD_CONFIG_CONSUMPTION` (`:30-71`) is a frozen table closed with
`as const satisfies Readonly<Record<string, GrantRuleConfigConsumption>>`, and
`GrantRuleField = keyof typeof …` (`:73`). One table; the type derives from it;
adding a field forces an explicit classification at the type's own boundary.

**"No drift" was wrong — see §2.11.** The *validated class* is the reference
implementation of the house style: private ctor + throwing factory for the
*value*, ctor-injected `db` for the *services* that read it — `SourceRuleReader`
(`src/grants/source-rule-reader.ts:155`), `GrantRuleSlotGenerator` (`:168`),
`ConfiguredChoiceMaterialReader` (`:22`), `CatalogImporter` (`:244`).

### 2.8 Effects — two payload maps, five hand-maintained arrays, one flat reader

| Array | Line in `src/domain/enums.ts` | Members | Consumers elsewhere |
|---|---|---|---|
| `effectKinds` | 705 | 4 | spread into three others; `src/rules/species-effects.ts` |
| `characterEffectKinds` | 739 | 10 | `db/schema/origins.ts:403,787,1093`; `db/schema/items.ts:94`; `src/rules/eligible-character-effects.ts`; `src/catalog/stored-authored-content-projector-v1.ts:327` |
| `classFeatureEffectKinds` | 832 | 1 | spread; `src/rules/class-feature-effects.ts` |
| `featureTemplateEffectKinds` | 842 | 10 | `db/schema/catalog-classes.ts:556,565,682,689`; `src/catalog/source-content-projector-v1.ts:627`; `src/ui/authoring/form-components.ts:334` |
| `speciesTemplateEffectKinds` | 859 | 5 | `src/domain/contracts/rows.ts:343,459` (Zod) — and that is the problem |

`speciesTemplateEffectKinds` is imported at `db/schema/origins.ts:48` and never
used in that file — verified: line 48 is its only occurrence in the file, and
the table it was written for passes the **wide** `characterEffectKinds` to
`featureEffectChecks` at `db/schema/origins.ts:401`. But the array is not dead:
`src/domain/contracts/rows.ts:343` builds `speciesTemplateEffectKindEnum` from
it and applies it (line 459) to the same `species_template_trait_effects` rows.
**The two enforcement layers disagree about the same table's vocabulary**: the
DB CHECK admits all ten kinds, the Zod contract admits five. A row carrying
`armor_class_bonus` passes the database and fails the contract validator.

**Corrected in review — what the narrow five actually are.** The earlier
draft said the narrow set's rationale was "species templates get
`armor_class_formula` but not `ability_increase`". That is wrong on the first
clause's implication. The array is literally
`[...effectKinds, 'armor_class_formula']` (`src/domain/enums.ts:859`), and
`effectKinds` (`:705`) is `damage_resistance`, `hp_modifier`, `speed`,
**`ability_increase`** — so `ability_increase` is *in* the narrow set, and a
rationale excluding it would contradict D63, under which every species'
ability increases are a sourced additive contribution. What the narrow set
excludes is the other five wide members: `ability_override`,
`armor_class_bonus`, `attack_ability_override`, `weapon_attack_bonus`,
`weapon_damage_bonus`. The enums comment's sentence *"`ability_increase`
remains refused by the table's source-required invariant"* is about the
`species_template_trait_effects` provenance CHECK, not about the kind
vocabulary; the draft read it as the latter. The disagreement is therefore
narrower than stated — five weapon/AC/override kinds, not a general
wide-vs-narrow philosophy — and the owner's wide ruling (R1) settles it
without any DB change.

**Two payload maps, not one.** `EffectPayloadByKind` is not the only structural
payload contract for these kinds. `EquipmentEffectInput`
(`src/domain/equipment-effects.ts:18`) independently declares a discriminated
union over the same ten character kinds, arm by arm, with no relation to the
authoring map — and the two **disagree on requiredness**:
`damage_resistance` carries `damage_type: DamageType | null` there and
`damage_type: DamageType` in the authoring map. That is a real per-context
difference (an item may resist an unspecified type; an authored trait may not),
not an accident, and R1 must model it rather than collapse it.

Below both, the primary character-side reader is still a flat nullable bag:
`EligibleCharacterEffect` (`src/rules/eligible-character-effects.ts:45`)
declares `effect_kind: CharacterEffectKind` and then eighteen independently
nullable payload columns. And the payload invariants themselves live in
hand-written SQL inside `featureEffectChecks`
(`db/schema/catalog-classes.ts:86`) — a TypeScript scope table cannot force
those, which bounds what R1 can claim.

Meanwhile `src/authoring/effect-forms.ts` already does this properly:

```ts
interface EffectPayloadByKind {                                        // :11 — 11 kinds
  readonly damage_resistance: { readonly damage_type: DamageType };
  readonly armor_class_formula: { readonly base: number; readonly ability_1: Ability;
    readonly ability_2: Ability | null; readonly allows_shield: boolean };  /* … */
}
export type AuthorableEffectKind = keyof EffectPayloadByKind;          // :58
interface PublishedEffectBase<K extends AuthorableEffectKind> {        // :63
  readonly kind: K; readonly label: string;
  readonly notes: string | null; readonly sort_order: number;
}
type PublishedEffect<K extends AuthorableEffectKind> =                 // :70
  K extends AuthorableEffectKind ? PublishedEffectBase<K> & EffectPayload<K> : never;
export type AuthoringCharacterEffect = PublishedEffect<CharacterEffectKind>;      // :75
export type AuthoringFeatureEffect   = PublishedEffect<FeatureTemplateEffectKind>; // :76
```

A base fragment, a payload map, distributed intersection, and per-context
subsets obtained by parameterising the same generic — composition, no
inheritance, no taxonomy. It is confined to `src/authoring/`. The catalog
projectors, the schema CHECKs, the equipment path and the character-side
readers all still consume the flat string arrays, a second hand-written union,
or a nullable bag, and re-derive payload validity by hand.

Note the eleventh key: the map covers `extra_attack` too, so it is a superset
of `characterEffectKinds` and exactly `characterEffectKinds ∪
featureTemplateEffectKinds`. That is what makes it a plausible single source —
but only after the per-context requiredness above is expressed, not before.

### 2.9 The slot — three correlated-null groups, and the schema says so

`spell_selection_slots` (`db/schema/character.ts:490`) names three groups in its
own header — ASSIGNMENT (`fixed_spell_version_id` XOR `current_spell_version_id`
XOR neither), LIFECYCLE (`state = 'orphaned'` travelling with
`orphan_reason_code`, `orphaned_at`, `prior_config`), and ELIGIBILITY
(`selection_eligibility = 'invalid'` travelling with
`selection_invalid_reason`) — and then says:

> **NOT YET MODELLED.** Each group is still declared as independently nullable
> columns here and in `src/domain/models.ts`, so the type system permits
> combinations the database rejects […] Turning these into discriminated unions
> is the whole point of the contracts work and has NOT been done; this comment
> records the target, not the state.

Confirmed at `src/domain/models.ts:178`: `SpellSelectionSlotRow` declares those
six fields as independent nullables. D6d already rules on the shape: *"sibling
nullables sharing one cause become ONE optional relation, non-null inside."*

**Corrected in review — the schema header's own claim is wrong, and the doc
repeated it.** The header says the type system "permits combinations the
database rejects — an `orphan_reason_code` on an active slot, or both
assignment columns set." Only the second is true. Reading every constraint on
the table (`db/schema/character.ts:568-606`), the enforcement is:

| Group | Enforced? | By what |
|---|---|---|
| ASSIGNMENT | **partly** — corrected again in round-2 | `spell_slots_exclusive_assignment_check` (`db/schema/character.ts:569-572`) + `spell_slots_exclusive_assignment_insert`/`_update` triggers (`db/schema/triggers.sql:54`) enforce the two-spell-id exclusion. Its text is `fixed_spell_version_id IS NULL OR current_spell_version_id IS NULL` — **nothing correlates `selection_acquired_at_class_level` with `current_spell_version_id`**, though the column is documented as belonging to a non-fixed selection (`:558-566`). See R2 |
| LIFECYCLE | **no** | `spell_selection_slots_state_check` (`:584`) closes `state` to `slotStates` and nothing correlates `orphan_reason_code`, `orphaned_at`, `prior_config` **or `override_note`** with it — four uncorrelated columns, which is why R2's audit tuple has to name each one |
| ELIGIBILITY | **no** | `..._selection_eligibility_check` closes the enum; `selection_invalid_reason` is uncorrelated |

The two BEFORE triggers duplicate the assignment check only; neither mentions
`state` or any reason column (`grep` for `orphan`/`state` in
`db/schema/triggers.sql` returns nothing). So for two of the three groups the
database is exactly as permissive as the type, and a row with
`state = 'active'` plus a non-null `orphan_reason_code` can be written today.
This is the single most consequential correction in the review: R2 as drafted
assumed a DB invariant that does not exist, so its projector would have been
throwing on rows the database blesses.

**The lifecycle vocabulary is four members, and one was invented.** `slotStates`
(`src/domain/enums.ts:115`) is `active | orphaned | discarded | kept_override`.
There is no `superseded`. `discarded` is produced deliberately:
`ClearSlotCommand.updates` (`src/commands/set-slot/clear.ts:13-22`) sets
`state: slot.orphan_reason_code === null ? 'active' : 'discarded'` — i.e. a
discarded row is precisely one that **retains its orphan reason**. Any lifecycle
union must therefore carry `discarded` *with* a reason, which is the opposite of
the "reason implies orphaned" shape R2 first drafted. `override_note` is a
fourth uncorrelated lifecycle column and belongs in the same design.

**Row-model drift, previously unrecorded.** `SpellSelectionSlotRow` omits
`selection_acquired_at_class_level` entirely, though the column exists
(`db/schema/character.ts:564`) and the Zod row contract carries it
(`src/domain/contracts/rows.ts:922`, typed `classLevel`). R2's `selected`
assignment arm depends on that field, so the lane cannot be specced off the row
model as it stands. Round-2 adds a second half to the same finding: the column
is not only undeclared in the row model, it is **uncorrelated in the database**
— nothing requires `current_spell_version_id` to be non-null when it is set. R2
carries the missing CHECK.

Also unconstrained: `eligibility_kind`, whose real vocabulary is
`grantRuleKinds` but whose column is a plain `varchar()`, its proof phase
recorded BLOCKED because a unit fixture writes the shorthand `'list'`.

### 2.10 Source instance and orphan reasons — an undeclared vocabulary, times three

`character_source_instances.state` (`db/schema/character.ts:271`) has no CHECK,
for a reason its comment argues at length and D13 already ruled: *"`state` stays
unconstrained until its vocabulary is declared in enums (a CHECK must read ONE
source)."* `'tombstoned'` is written by four shipped writers
(`src/commands/remove-source.ts`, `src/commands/update-class.ts` twice,
`src/grants/grant-rule-slot-generator.ts`) and is not a member of `slotStates`,
which the adjacent table's `state` column *is* constrained to. Two columns named
`state`, two closed sets, one declared. The row model types it `state: string`
(`src/domain/models.ts:164`).

The orphan-reason vocabulary is worse, and this corrects the input material:

| Declared where | Table it governs | Members |
|---|---|---|
| `src/builder/contracts.ts:777` `SKILL_GRANT_ORPHAN_REASONS` | `character_skill_grants` | `rule_no_longer_active`, `parent_rule_removed` |
| `src/grants/skill-expertise-grants.ts:21` `EXPERTISE_GRANT_ORPHAN_REASONS` | `character_skill_expertise_grants` | `source_removed`, `entitlement_removed`, `underlying_proficiency_removed` |
| nowhere — inline SQL literals at `src/grants/grant-rule-slot-generator.ts:765, 889` | `spell_selection_slots` | `rule_no_longer_active`, `parent_rule_removed` |
| nowhere — inline SQL literals at `src/grants/grant-rule-slot-generator.ts:813, 925` | `wizard_spellbook_entries` | `rule_no_longer_active`, `parent_rule_removed` |

**Corrected in round-2 review — this is FOUR tables, not three.** The draft's
table listed all four generator literals on one row, which read as though one
undeclared vocabulary served one table. It serves two. `:765`/`:889` are
`UPDATE spell_selection_slots`; `:813`/`:925` are `UPDATE
wizard_spellbook_entries` — a separate table with its own
`orphan_reason_code` column (`db/schema/character.ts:842`), its own
`orphaned_at` (`:843`), and its own lifecycle enum
(`spellbookAcquisitionStates` = `active | orphaned`,
`src/domain/enums.ts:128`, two members where slots have four). Collapsing them
lost a whole table from R5's registry; round-2 finding 3 is right and R5 stage 1
is re-scoped below to name it.

Four vocabularies, five distinct literals, one fact named twice: a source tombstoning is
`parent_rule_removed` for skill grants and `source_removed` for expertise
grants. Every consuming row type declares the column `string | null`
(`src/builder/contracts.ts:808`, `src/grants/skill-expertise-grants.ts:36`,
`src/domain/models.ts:202`), so no comparison is checked —
`src/queries/character-completeness.ts:938` and
`src/queries/character-sheet-builder.ts:679` both compare against a bare literal.

`wizard_spellbook_entries` is worse still, because it has no row type at all
that declares the column. `grep` for `orphan_reason_code` across `src/` returns
no wizard-entry reader: the two generator reads of that table select only
`id, rule_key, ordinal, spell_version_id` (`:790`) and `id, spell_version_id`
(`:908`), and the third (`:564`) is `SELECT *` into an untyped raw row. The
column's only declared shape anywhere is the Zod row contract
`'wizard_spellbook_entries.orphan_reason_code': sqlText`
(`src/domain/contracts/rows.ts:935`) — an unconstrained string. It is
write-only in the app and read only by the backup path, which carries it as a
portable column (`src/domain/contracts/historical-row-columns.ts:53`). So for
this table R5 must *create* the read boundary, not narrow an existing one.

**But the five literals are not one vocabulary, and D38 says so.** D38: *"vocabularies
are typed PER TABLE."* The split is not arbitrary — spell slots, wizard
spellbook entries and skill grants share
`rule_no_longer_active` / `parent_rule_removed`, while expertise grants use
`source_removed` / `entitlement_removed` / `underlying_proficiency_removed`, and
`underlying_proficiency_removed` is *meaningless* on a spell slot: nothing about a
spell slot depends on holding an underlying proficiency. The finding to record is
therefore two facts, not one: (a) `source_removed` and `parent_rule_removed` name
the same event and one should die; (b) the remaining reasons are per-table subsets
that a single flat union would wrongly flatten. R5 is re-specced below to a
canonical registry with derived per-table subsets rather than one global union.

### 2.11 `GrantRuleObject` — the weakest contract in the codebase

Added in review; the draft missed it while calling §2.7 drift-free. The
serialized form of a grant rule — the shape that crosses every wire, sits in
`class_progressions.grant_rules` JSON, and is what `SrdFeatDefinition` and
`FeatDefinitionForApplication` both declare they carry — is:

```ts
// src/grants/grant-rule.ts:76
export type GrantRuleObject = Readonly<{
  [Field in GrantRuleField]?: unknown;
}>;
```

Every field optional, every value `unknown`. Nothing about it is wrong as a
*parser input* type — that is the honest shape of untrusted JSON, and the
comment says so. What is wrong is that it is also the **output** type: a rule
that survived `fromObject`'s eleven throwing validations degrades straight back
to all-optional-`unknown` the moment it is serialized, so a `GrantRuleObject`
missing every kind-required field still compiles anywhere in the codebase. For
a document whose whole subject is required-vs-optional object fields, this is
the largest single gap in the inventory, and it is upstream of §2.4's feat
triplication — all three feat shapes carry this type.

Second, `fromObject`'s count classification has a `default` arm
(`src/grants/grant-rule.ts:501-515`):

```ts
switch (kind) {
  case 'fixed_spell': case 'grant_source':          count = positiveInteger(…, 1, …); break;
  case 'choice_from_list': /* …five more… */        count = positiveInteger(…, null, …); break;
  default:                                          count = null;      // :513
}
```

`kind` is narrowed to `GrantRuleKind` two lines above, so every member is
already covered — the `default` is unreachable today and exists only to satisfy
the assignment. Under D25 ("exhaustive switches without default") that is
exactly the arm that turns a future tenth `grantRuleKinds` member into a silent
`count = null` instead of a compile error. The fix is a `never` guard, the same
one `sameTarget` already uses at `src/domain/feature-values.ts:77-100`.

### 2.12 Branding — the inventory stops one file short

§2.2 records that `src/domain/models.ts` types every id as bare `number`. That
is true and it is not the whole shape. Counted across both row-model modules:

| File | Bare `number` identifier fields |
|---|---|
| `src/domain/models.ts` | 29 |
| `src/domain/read-models.ts` | 30 |
| **total** | **59** |

(Count is mechanical — fields whose name is `id` or ends `_id`, declared
`number` or `number \| null`. Reproduce with a regex over the two files; the
figure is stated because it was measured, not estimated.)

`read-models.ts` is the worse of the two, because it is where the *pairs* sit
adjacent: `SpellRoute` (`src/domain/read-models.ts:126-127`) declares
`spell_identity_id: number` on the line immediately above
`spell_version_id: number` —
precisely the conflation §2.1 says the two brands exist to prevent, one file
away from the brands themselves. Branding `models.ts` alone does not "finish
the brands"; it finishes a third of them and leaves the highest-risk pair
untouched. This is why R3's branding half is re-scoped below into its own
boundary-by-boundary lane rather than riding along as "related and worth doing
in the same lane".

---

## 3. What Foundry's composition teaches

### 3.1 The template mixin, translated

Their class item is assembled, not inherited:

```js
// module/data/item/class.mjs
export default class ClassData extends ItemDataModel.mixin(
  AdvancementTemplate, ItemDescriptionTemplate, StartingEquipmentTemplate
) { static defineSchema() { … } }
```

The mixin is a runtime construct because their whole type discipline is runtime
— `static defineSchema()` returning `foundry.data.fields.*`, validated on
construction, with JSDoc `@mixes` for editor hints that are never checked.
Translating the mixin would be a mistake; translating the **factoring** would
not. The TS equivalent is a named field-group fragment composed by intersection:

```ts
export interface HasName       { readonly name: string; }
export interface HasEdition    { readonly rules_edition: RulesEdition; }
export interface HasContentKey { readonly content_key: ContentKey; }

export type FeatContract = HasName & HasEdition & HasContentKey & { /* feat-only */ };
```

No base class, no `extends` chain, no runtime cost — and the property that
matters: a type can carry two or three fragments without any of them being its
parent. `PublishableHomebrewBase<K>` cannot give class and feat their identity
fields without making them "publishable homebrew", which they are not (D133:
classes are bundled-only). Intersection has no such problem, and the codebase
already uses it — `DefinitionRow & { readonly catalog_layer:
CatalogLayerDisclosure }` at `src/queries/catalog-queries.ts:72, 75, 80`.

**The fragments are deliberately one field each, corrected in review.** An
earlier draft bundled `content_key` and `name` into one `HasCatalogIdentity`,
which sounds tidier and is wrong here: authored aggregates carry `name` and
have no `content_key` at all (R3, and `src/authoring/contracts.ts:289`). The
whole advantage of intersection over inheritance is that a type takes exactly
the fragments whose fields it really has — a two-field fragment throws that
away for the shapes that hold only one of them. One field per fragment,
composed at each use site.

### 3.2 The configuration / value split

Every Foundry advancement carries `{_id, type, configuration, value, level,
title, hint, icon, classRestriction}`
(`module/data/advancement/base-advancement.mjs`), where `configuration` is what
the author declared and `value` is what the player chose; both are an
`AdvancementDataField` that dispatches to a per-type DataModel at
`initialize()` — a runtime discriminated union keyed on `type`.

We have the split, unnamed and across two layers: a `GrantRule` is
configuration, a `spell_selection_slots` row is value, `PlannedSpellGrant` is
the projection between them. What we lack is their *locality*. Their two halves
sit on one object; ours are joined by the string
`${instanceUuid}:${ruleKey}:${ordinal}`
(`src/grants/grant-rule-slot-generator.ts:732`), parsed nowhere and compared
everywhere. See R6.

### 3.3 `classRestriction` — one field for the whole multiclass distinction

```js
// module/documents/advancement/advancement.mjs
get appliesToClass() {
  const originalClass = this.item.isOriginalClass;
  return !this.classRestriction
    || (this.classRestriction === "primary" && [true, null].includes(originalClass))
    || (this.classRestriction === "secondary" && !originalClass);
}
```

One field on the generic base (`module/data/advancement/base-advancement.mjs:47`)
expresses "starting proficiencies vs. multiclass proficiencies" for *any*
advancement type. We express the same rule through dedicated modules —
`src/rules/multiclass-proficiency.ts`, `src/rules/multiclass-entry-srd.ts`,
`src/rules/class-choice-entitlements-srd.ts` — plus the `startingClass`
resolution surfaced at `src/queries/character-workspace-builder.ts:290`. Ours is
correct; theirs is authorable. Given the project's name, that asymmetry deserves
a lane (R7).

### 3.4 `ScaleValue` — the one recommendation to reverse

Their `ScaleValue` (`module/data/advancement/scale-value.mjs`, 469 lines of type
models: number, dice, distance, CR) lets an author declare
`{scale: {1: …, 5: …, 11: …}}`; `valueForLevel()` reverse-finds the highest key
≤ level; the value is then referenced from any formula as
`@scale.<classIdentifier>.<valueIdentifier>`.

We have something different, and richer along one axis only — the draft's
"we already have more" was flatly wrong and the review is right to narrow it.
Their `ScaleValue` resolves **five value domains** (string, number, CR, dice,
distance); our `ValueExpression` resolves **numbers**, and
`FeatureValueTarget` (`src/domain/feature-values.ts:20`) has exactly two
targets — `feature_dice_count` and `resource_maximum`. So: Foundry is broader
in what a scaled value may *be*; we are richer in what may be *done* with one
(arithmetic limbs, supersession, typed targets). Both halves of that sentence
are load-bearing for the rejection below.

What we have on the arithmetic axis:

```ts
// src/domain/value-expression.ts:34 — seven limbs, no formula string
export type ValueExpression =
  | { readonly kind: 'const'; readonly amount: number }
  | { readonly kind: 'ref'; readonly source: ValueSource }
  | { readonly kind: 'scale'; readonly source: ValueSource; readonly multiply?: PositiveInteger;
      readonly divide?: PositiveInteger; readonly round: 'floor' | 'ceiling' }
  | { readonly kind: 'table'; readonly level_source: LevelSource; readonly rows: NonEmpty<ValueTableRow> }
  | { readonly kind: 'piecewise'; readonly level_source: LevelSource; readonly segments: NonEmpty<…> }
  | { readonly kind: 'sum'; readonly terms: NonEmpty<ValueExpression> }
  | { readonly kind: 'clamp'; readonly value: ValueExpression; readonly minimum?: …; readonly maximum?: … };
```

Their `scale` map is our `table` limb; their reverse-find is our `level_source`;
their formula-string reference is what this module exists to refuse (AGENTS.md
rule 6) — all true *for numeric values*, and nothing here answers their dice,
distance, CR or string types. Above it, `FeatureValueContribution<K>`
(`src/domain/feature-values.ts:49`) carries a typed `target`/`op`/`value` triple
parameterised by target kind, with a supersession graph, three named error
states, and a `sameTarget` switch with a `never` guard (`:77-100`). The correct
conclusion is the opposite of the study's — R8 states the real gap.

### 3.5 Two smaller lessons

**`automaticApplicationValue()` — cheap and worth taking.** Their base
advancement returns `false`; `HitPointsAdvancement` returns `"max"` for a
level-1 original class; `ItemGrantAdvancement` returns the full item list unless
something is optional. The manager then skips the step rather than rendering a
one-option dialog. Our planner already emits `{required, locked}` per planned
grant (`src/grants/grant-rule-planner.ts`), so the predicate is derivable today:
a `fixed_spell` grant is always automatic (`locked: true, count: 1`), and a
`choice_from_list` with one eligible member is too.

**The two apparent bugs.** From
`module/documents/advancement/item-grant.mjs`, flagged as *apparent*: in
`apply()`, `retainedData.items?.find(i => i.flags?.dnd5e?.sourceId ?? i._stats?.compendiumSource)`
returns a truthy *value* rather than comparing against the uuid being applied,
so a multi-item retained grant returns the first item regardless of which is
being restored; in `reverse()`, `items.push(…); items[sourceId] = …;` sets a
string-keyed property on an Array that `restore()`'s `for…of` never reads. Both
are unwritable against a `ReadonlyMap<BrandedKey, Payload>` iterated by entries
— our branded-id discipline stated in someone else's code, and the reason §2.12
counts the brands still missing rather than treating them as done.

### 3.6 What NOT to copy, and the law that says so

- **String key paths.** `ActiveEffect5e` applies `{key, mode, value}` to any
  document path. Our ten kinds each have a typed payload
  (`src/authoring/effect-forms.ts:11`); a key path defeats every exhaustive
  switch we own (AGENTS.md rule 5).
- **Open registries.** `CONFIG.DND5E.advancementTypes` lets a module add a kind
  at runtime. `grantRuleKinds` is closed and `GrantRule.fromObject` refuses a
  non-member; the homebrew escape valve is known-set-plus-passthrough on
  *fields* (D12, D10/Q4), never an open *kind* registry.
- **Formula strings.** `FormulaField({deterministic: true})` and
  `new Roll(replaced).evaluateSync().total` inside a try/catch falling back to a
  default AC formula (`module/data/actor/templates/attributes.mjs:205-214`) is
  the plausible-wrong-number failure D33 forbids.
- **Global mutable configuration.** `applyLegacyRules()` mutates `CONFIG.DND5E`
  in place — including `spellcasting.spell.progression.half.roundUp = false` —
  and `TraitConfigurationData.migrateData()` reads the global rules version, so
  stored data migrates to different values depending on a mutable global. Our
  edition is a per-row column (`rulesEditions`, `src/domain/enums.ts:40`) behind
  a per-character preference gate, and one character may hold 2014 and 2024
  content at once (D115, D49, D147). Never trade that for a global.
- **`SHIM_FIELDS` / `logCompatibilityWarning`.** Worth having at 1.0. AGENTS.md
  forbids compatibility layers in a pre-alpha with no users, in terms that leave
  no room.

---

## 4. Proposed refactors

Ranked by (guarantee bought) ÷ (blast radius). Each states the contract change,
what it touches, why it is composition rather than taxonomy, where constructor
DI applies, migration cost, and the wrong program that stops compiling.

### R1 — Promote the effect payload map to the single effect vocabulary · candidate (b) · **ACCEPT**

**Change.** Move `EffectPayloadByKind` out of `src/authoring/effect-forms.ts`
into a domain module, **parameterise it by context**, and derive **four** arrays
from one table — `effectKinds`, `characterEffectKinds`,
`classFeatureEffectKinds`, `featureTemplateEffectKinds` — while the fifth,
`speciesTemplateEffectKinds`, is **deleted** rather than derived, because the
owner's wide ruling (below) resolves its vocabulary upward into
`characterEffectKinds` and leaves it with nothing of its own to say. Round-2
finding 6 is right that "derive the five arrays" mis-describes an outcome in
which one of the five ceases to exist; four derived plus one deletion is the
accurate count, and it is the same count used in **Touches** and in the ruling
paragraph below:

```ts
// src/domain/effect-kinds.ts
/** Contexts differ in requiredness, not in field set — see §2.8. */
export type EffectContext = 'authored' | 'equipment' | 'stored';

export interface EffectPayloadByKind<C extends EffectContext = 'authored'> {
  readonly damage_resistance: {
    // authored traits must name a type; an item may resist an unspecified one
    readonly damage_type: C extends 'authored' ? DamageType : DamageType | null;
  };
  /* … the remaining ten, moved from effect-forms.ts:11 … */
}
export type EffectKindName = keyof EffectPayloadByKind;

/** Which vocabularies each kind belongs to. One table; the arrays derive from it. */
export const EFFECT_KIND_SCOPES = {
  damage_resistance:   ['contribution', 'character', 'feature_template'],
  ability_increase:    ['contribution', 'character', 'feature_template'],
  ability_override:    ['character'],            // D83: character-only, deliberately
  armor_class_formula: ['character', 'feature_template'],
  extra_attack:        ['feature_template'],     // D18/D19: one effect per feature
  /* … the remaining six … */
} as const satisfies Readonly<Record<EffectKindName, readonly EffectScope[]>>;
```

`EffectOfScope<S>` then derives each context's union from that table. The
`as const satisfies` idiom is not new: `GRANT_RULE_FIELD_CONFIG_CONSUMPTION`
(`src/grants/grant-rule.ts:30-71`) closes a field table exactly this way and
derives `GrantRuleField` from its keys (`:73`).

**Touches.** `src/domain/enums.ts:705-864` (four arrays become derived
constants — `effectKinds` `:705`, `characterEffectKinds` `:739`,
`classFeatureEffectKinds` `:832`, `featureTemplateEffectKinds` `:842` — and the
fifth, `speciesTemplateEffectKinds` `:859`, is deleted outright),
`src/authoring/effect-forms.ts` (imports the map rather than owning
it), `src/domain/equipment-effects.ts:18` (`EquipmentEffectInput` derives from
`EffectPayloadByKind<'equipment'>` instead of re-declaring ten arms),
`db/schema/origins.ts:48` (delete the dead import), the four schema call
sites in `db/schema/catalog-classes.ts` and `db/schema/items.ts`, and
`src/ui/authoring/form-components.ts:334`. No service, so no DI.

**Zero DDL, and the reason it is genuinely zero.** The one live question was
`speciesTemplateEffectKinds`: the Zod contract layer enforced its five kinds
against `species_template_trait_effects` while the DB CHECK on the same table
admits all ten (§2.8). **OWNER RULING (2026-08-13): the wide set wins.** The
narrow array and its Zod enum (`src/domain/contracts/rows.ts:343`) are deleted
in this lane — this is the fifth array, and deletion rather than derivation is
why the count above is four — and species traits may author any character
effect kind. Because the
ruling resolves *upward* to what the CHECK already admits, no CHECK text
changes and the lane really is zero-DDL — the earlier draft was incoherent only
in the branch it no longer takes (it proposed tightening the CHECK to five
*and* claimed zero DDL in the same paragraph; the review was right to flag it,
and the owner's ruling removes the tightening rather than the claim).

Round-1 finding 3 also corrects the *rationale* the draft gave for the narrow
set. It does not exclude `ability_increase` — that kind is in `effectKinds` and
therefore in the narrow five (§2.8). What it excludes is the five weapon/AC/
override kinds. The wide ruling stands; the argument for it in the draft did
not, and has been replaced.

Follow-up owed: D83's `ability_override`-is-character-only rationale must be
re-examined for templates — either accepted as now-authorable or re-excluded
by a targeted row in the scope table (the owner chose wide knowing this).

**What this lane does NOT buy — stated so nobody expects it.** The payload
invariants that actually run in the database are hand-written SQL inside
`featureEffectChecks` (`db/schema/catalog-classes.ts:86`): the
`_damage_type_kind_check`, `_hit_points_kind_check` and their siblings. A
TypeScript scope table cannot generate or force those. After R1, the kind
*vocabulary* has one source; the payload *shape* still has two enforcement
layers that must be kept in step by review. Closing that is a separate,
larger lane (SQL emitted from the same table), and it is not claimed here.
Likewise `EligibleCharacterEffect` (`src/rules/eligible-character-effects.ts:45`)
stays a flat nullable bag until someone gives it a D235 parse boundary; R1
makes that boundary expressible, not existent.

**Composition, not taxonomy.** No type extends another; a context asks for its
subset by parameterising one generic. The subsets stop being five
independently-maintained lists whose reasons for differing live only in a
comment.

**New compile guarantee.** A kind without a payload, or a payload without
declared scopes, is a compile error. Declaring a kind in one array and
forgetting a sibling becomes impossible, because there are no sibling arrays.

**D-compliance.** D72 grouped the five AC/weapon kinds under one vocabulary
rather than a second item-only one; deriving both from one table is that ruling
made structural. D83's "`ability_override` is character-only" survives as a row
rather than prose. D18/D19's "exactly one member, so two effects cannot be
silently lost" survives as `extra_attack`'s single scope; the day a second
feature-only kind arrives, D18's child table is still the fix and this does not
pre-empt it.

### R2 — Discriminated-union read models over the slot's three groups · candidate (f) · **ACCEPTED, BUT NOT SPECCABLE YET — its lifecycle design is owed first**

**Status change in review.** The lane is still accepted. What the draft
contained was not a design: it invented a lifecycle state (`superseded`) that
does not exist, omitted one that does and is deliberately produced
(`discarded`), depended on a row field the row model does not declare
(`selection_acquired_at_class_level`), and rested on a database invariant that
§2.9 now shows is absent. Every one of those is a premise error, not a detail,
so what follows is scoped as **the design R2 owes**, not R2 itself.

**Precondition 1 — the real lifecycle vocabulary.** `slotStates`
(`src/domain/enums.ts:115`) is `active | orphaned | discarded | kept_override`.
Four members, and the interesting one is `discarded`: `ClearSlotCommand`
(`src/commands/set-slot/clear.ts:13-22`) writes it exactly when the slot has an
orphan reason, and does **not** clear that reason. So the real correlation is
not "reason ⟺ orphaned" but:

**Widened in round-2 review — the correlation is over five columns, not one.**
Round-2 finding 2 is right that a union assigning meaning to `(state,
orphan_reason_code)` also assigns meaning to every column that travels with
them, so the table has to name all of them or the union will silently forbid
combinations the audit never counted:

| state | `orphan_reason_code` | `orphaned_at` | `prior_config` | `override_note` | meaning |
|---|---|---|---|---|---|
| `active` | must be null | must be null | **non-null after a revive — see below** | ? | ordinary live slot |
| `orphaned` | must be non-null | non-null | non-null when a selection was remembered | ? | entitlement lost, selection remembered |
| `discarded` | **non-null, retained** | retained | retained | ? | user cleared an orphaned slot; the reason survives as provenance |
| `kept_override` | ? | ? | ? | ? — the column exists for this state and correlates with nothing | must be decided |

Two `?` columns and one pinned surprise. Taking them in order:

**The revive behaviour is pinned by a test, and the draft's `active` arm drops
it.** Verified at `tests/integration/grants/slot-generator.test.ts:576-586`: a
slot orphaned with `orphan_reason_code: 'rule_no_longer_active'`, `orphaned_at:
<string>`, `prior_config: '{"level":4}'` (`:542-553`) is then revived by
restoring the class level and re-running the generator, and the asserted row is
`state: 'active'`, `orphan_reason_code: null`, `orphaned_at: null` — but
`prior_config: JSON.stringify({ level: 4 })`, **still non-null** (`:580-583`).
So the revive path clears the reason and the timestamp and deliberately does
*not* clear `prior_config`. An `{ readonly state: 'active' }` arm carrying
nothing, as sketched below, therefore describes a row shape the codebase does
not produce, and a projector built from it would either throw on every revived
slot or silently drop provenance the test exists to protect.

This needs **an explicit ruling and a representation**, and the two are
separate:

- *The ruling:* is a revived slot's retained `prior_config` (a) meaningful
  provenance to keep and surface, (b) meaningful but private to the reconciler,
  or (c) residue the revive path should have cleared and the test pins by
  accident? The test is not evidence of intent — it is evidence of behaviour.
  Only (c) makes the simple arm correct, and (c) is a behaviour change with a
  migration attached (existing rows carry the residue), so it cannot be assumed.
- *The representation:* under (a) or (b) the active arm needs the field —
  `{ readonly state: 'active'; readonly prior_config: JsonObject | null }` — and
  the lifecycle CHECK must permit `state = 'active' AND prior_config IS NOT
  NULL` while still forbidding `state = 'active' AND orphan_reason_code IS NOT
  NULL`. Those are two different correlations over what the draft treated as one
  group, which is exactly why the audit tuple has to carry each column
  separately.

**`override_note` and `kept_override` remain the open ruling** the draft
identified, now stated over the wider tuple: the column is uncorrelated with
every state including the one it appears to have been added for, and no writer
in the tree establishes the `kept_override` row. **A union cannot be written
until `kept_override`, `override_note`, and the revive-retained `prior_config`
are ruled on.** That ruling — three questions now, not two — is the first
deliverable of the lane, and all three are behaviour questions, not typing ones.

**One more correlation the draft missed entirely, and it is not lifecycle.**
`selection_acquired_at_class_level` (`db/schema/character.ts:564`) is documented
as "the class level at which the current **non-fixed** selection was acquired" —
i.e. it is meaningful only alongside `current_spell_version_id`. Nothing
enforces that. The table's only assignment CHECK is
`spell_slots_exclusive_assignment_check` (`:569-572`), whose text is
`fixed_spell_version_id IS NULL OR current_spell_version_id IS NULL` — it
correlates the two spell ids with each other and says nothing about the acquired
level. So a row with a non-null acquired level and no current selection (or a
*fixed* selection) is storable today. R2's `selected` arm is the type that gives
that column meaning, so under D235 the write side owes the matching refusal:

- **Add to the audit tuple and to the DDL:** `selection_acquired_at_class_level
  IS NULL OR current_spell_version_id IS NOT NULL`, as its own named CHECK
  (`spell_slots_acquired_level_requires_selection_check`) rather than by
  extending the exclusive-assignment check, which is a different fact.

This is an *assignment*-group obligation, which matters for §2.9's enforcement
table: that group was recorded as fully enforced, and it is fully enforced for
the two-spell-id fact only. The third column in the group is unenforced.

**Precondition 2 — a data audit, then DDL, then the union.** §2.9 establishes
that the database enforces the assignment group only. Therefore:

1. **Audit.** Count live rows per combination. **The tuple, widened in round-2
   review, is ten columns** — the draft's four lifecycle/eligibility columns
   become seven, and the three assignment columns join them. An audit that does
   not count a column cannot tell you whether the union's treatment of it is
   safe:

   ```sql
   SELECT state,
          orphan_reason_code IS NULL              AS reason_null,
          orphaned_at        IS NULL              AS orphaned_at_null,
          prior_config       IS NULL              AS prior_config_null,
          override_note      IS NULL              AS override_note_null,
          selection_eligibility,
          selection_invalid_reason IS NULL        AS invalid_reason_null,
          current_spell_version_id IS NULL        AS current_null,
          fixed_spell_version_id   IS NULL        AS fixed_null,
          selection_acquired_at_class_level IS NULL AS acquired_level_null,
          COUNT(*)
     FROM spell_selection_slots
    GROUP BY 1,2,3,4,5,6,7,8,9,10;
   ```

   `orphaned_at`, `prior_config` and `override_note` are the three added:
   `prior_config` because the revive path leaves it non-null on an `active` row
   (above), `override_note` because it is the column whose ruling precondition 1
   is blocked on and no count of it exists, `orphaned_at` because it is the one
   lifecycle column nobody has claimed is *ever* legitimately non-null outside
   `orphaned`/`discarded` — a claim that is either true in the data or is a bug,
   and only the audit can say which. The assignment columns are in the same
   query because of the acquired-level correlation above; running two audits
   over one table is how a cross-group combination gets missed. Any combination
   the intended union forbids and the data contains is either a bug to fix or a
   row shape to admit. Doing this after the projector ships means discovering it
   as a thrown exception in a user's sheet.
2. **Versioned restore/share normalization — a PRECONDITION of the DDL, not
   out of scope.** See the dedicated block below; this step must land *before*
   step 3, because step 3's CHECKs apply to restore's INSERTs whether or not a
   projector ever runs on them.
3. **DDL.** Add the correlation CHECKs the header claims already exist —
   lifecycle and eligibility — plus the acquired-level CHECK above, in a
   checksum-registered migration (`src/db/migrations.ts`), inside `BEGIN
   EXCLUSIVE`, after the audit is clean and normalization is in place. Under
   D235 this is the write-side obligation and it comes *first* relative to the
   read: the read may only throw on what the write has already made unstorable.
4. **Union + projector.** Only then does the discriminated union describe a
   real invariant rather than an aspirational one.

The draft's "**Zero DDL**" was wrong for exactly this reason. R2 carries a
migration.

**Precondition 2b — restore normalization, and why "restore is out of scope"
was an incomplete statement of the D235/D8 boundary.** Round-2 finding 1 is
correct and this is the most consequential of the six. The status block and the
"Where the projector must NOT go" section below are both true as far as they go:
no throwing projector is placed in front of restore. But a CHECK is not a
projector, and restore does not go through one. `restoreCharacterBackup` writes
slot rows with a **raw, generated INSERT** — `insertPortableRow`
(`src/backup/character-backup.ts:2230-2249`) builds `INSERT INTO
"spell_selection_slots" (…) VALUES (…)` from whatever columns the document
carries, and the slot call site is `:3090`. There is no domain object between
the document and the table.

The consequence is precise: **the moment step 3's CHECKs land, a backup written
before them containing a combination they forbid fails at the INSERT** —
`SQLITE_CONSTRAINT`, inside the restore transaction, before any read path
exists to be lenient. Scoping the *projector* away from restore does not help,
because the projector was never what would reject the row. That is the exact
D8 failure mode D8 names as highest-severity: a contract narrower than its
column making a user's own backup unrestorable. So the boundary in the status
block needs its second half stated: **D235 moves validation inward and D8 holds
the import gate open — but D235's write-side half is DDL, and DDL is not
inward.** DDL is the one write-side obligation that reaches the import path,
and therefore the one place where satisfying D235 can violate D8 unless the
import path is migrated first.

The fix is the accept-and-migrate posture D8 already mandates, applied to these
columns, and the machinery for it already exists rather than needing invention:

- The backup format is **already versioned** — `CHARACTER_BACKUP_VERSION` plus
  five named predecessors (`PREVIOUS_`, `PRE_ARCHIVE_`, `PRE_FLAVOR_`,
  `PRE_LINEAGE_`, `PRE_PROVENANCE_`, `LEGACY_`;
  `src/backup/character-backup.ts:50-56`), each with its own document type.
- Rows are **already normalized on the way in** — `reconciledColumns`
  (`:476-497`) reconciles a document's columns with this build's in both
  directions, calling `fillHistoricalRowColumns` (`:487`) to add columns the
  document predates and dropping retired ones. `spell_selection_slots:
  ['selection_acquired_at_class_level']` is already an entry in that map
  (`src/domain/contracts/historical-row-columns.ts:44`), which is the proof this
  is the right hook: the *last* slot column added took exactly this route.

So the work is to extend that normalizer, not to build a parallel one. **In
scope for R2, ahead of the DDL — and the mapping must be TOTAL, not
audit-derived** (round-3 correction: an audit of observed documents cannot
bound what an unobserved backup on someone's disk contains; any combination
the independent nullable columns ever admitted may exist out there):

- A **total normalization mapping over every legacy-schema-valid ten-column
  combination, for every supported backup version** — defined from what the
  old schema *admitted*, not from what the audit *found*. E.g. an `active` row
  carrying `orphan_reason_code` becomes whatever the precondition-1 ruling
  says it is (`discarded`, or reason-cleared); a non-null
  `selection_acquired_at_class_level` with no `current_spell_version_id` is
  nulled.
- **Owner rulings for ambiguous combinations** — the mapping cannot be
  inferred from observed fixtures; each rule is a ruling recorded against the
  old shape, not a guess.
- **Exhaustive/matrix tests** proving every legacy-valid input normalizes to a
  row satisfying the new CHECKs without losing selection or provenance.
- **Data audits retained as live-data migration checks** — they gate the
  migration of the live table, and are NOT the source of backup coverage.

Each rule belongs in the versioned normalizer where the retired-column and
added-column rules already live. The share/export path takes the same rules,
since a shared document is the same document. The step-1 audit still runs
against restorable documents as well as live rows — but as evidence for the
migration, not as the boundary of the mapping.

Two things this does *not* change, stated so the scope growth is bounded:
the projector still never goes in front of restore (below), and the CHECKs
themselves are not weakened to accommodate old data. Normalization moves the old
row to a shape the CHECK accepts; it does not move the CHECK.

**Precondition 3 — the row model must declare the column it needs.** The
`selected` arm needs `selection_acquired_at_class_level`, which
`SpellSelectionSlotRow` does not declare (§2.9). Adding it is trivial and
belongs at the head of this lane, not inside it.

**Shape, once the preconditions are met** — kept as a sketch, not a spec:

```ts
// src/domain/slot-contracts.ts
export type SlotAssignment =
  | { readonly kind: 'granted';  readonly spell_version_id: SpellVersionId }
  | { readonly kind: 'selected'; readonly spell_version_id: SpellVersionId;
      readonly acquired_at_class_level: ClassLevel | null }
  | { readonly kind: 'empty' };
// NOTE: only the 'selected' arm may carry acquired_at_class_level, and
// precondition 2 step 3 adds the CHECK that makes that true of the table.

export type SlotLifecycle =
  // The active arm is UNRESOLVED, not simple: a revived slot retains a non-null
  // prior_config (slot-generator.test.ts:576-586). Under rulings (a)/(b) this
  // arm reads `{ state: 'active'; prior_config: JsonObject | null }`; only
  // ruling (c) — clear it on revive, with a migration — leaves it bare.
  | { readonly state: 'active' /* prior_config owed — see precondition 1 */ }
  | { readonly state: 'orphaned' | 'discarded';
      readonly reason: SpellSlotOrphanReason;          // R5's per-table subset
      readonly orphaned_at: string; readonly prior_config: JsonObject | null }
  | { readonly state: 'kept_override'; /* shape owed — see precondition 1 */ };

export type SlotEligibility =
  | { readonly eligibility: 'unselected' | 'valid' }
  | { readonly eligibility: 'invalid'; readonly reason: string };

export interface SlotContract {
  readonly id: SlotId;
  readonly locator: SlotLocator;          // R6 — built from columns, not parsed
  readonly bucket: SlotBucket;
  readonly constraint: SpellSelectionConstraint;
  readonly assignment: SlotAssignment;
  readonly lifecycle: SlotLifecycle;
  readonly eligibility: SlotEligibility;
}
```

Note `orphaned | discarded` share one arm carrying the reason — the shape the
code actually produces, and the shape the draft's `superseded` arm made
unrepresentable.

**Touches.** A `slotContract(row): SlotContract` projector that throws on a row
the (new) CHECKs refuse — the same boundary as `GrantRule.fromObject`, and the
D235 in-app read boundary described in the status block. Consumers migrate
incrementally: `src/queries/character-sheet-builder.ts`,
`src/commands/set-slot/*`, `src/builder/contracts.ts`. `SpellSelectionSlotRow`
survives as the row/wire shape, which is what makes incremental adoption
possible.

**Where the projector must NOT go.** Not in front of restore or import. Per the
status block, D8 governs there: a slot row from a user's backup predates the new
CHECKs by construction, and a throwing projector on that path converts an old
backup into an unrestorable one. Restore admits what the column admits, migrates
the row into a conforming shape, and only then may the in-app read path parse
it. This is a hard boundary in the lane, not a caveat.

**And where the DDL unavoidably DOES go — restore, whether we route it there or
not.** Keeping the projector off the restore path is necessary and not
sufficient, because restore reaches the table through a raw INSERT
(`insertPortableRow`, `src/backup/character-backup.ts:2230`, called for slots at
`:3090`) and a CHECK constrains an INSERT. "Restore is out of scope" was
therefore an accurate statement about the projector and an inaccurate statement
about the lane. Precondition 2b is the correction: the versioned normalizer
learns each old combination *before* the CHECKs land, so that by the time an old
document meets the new constraint it has already been migrated to a shape the
constraint accepts. The sequencing is not negotiable in either direction —
normalization after the DDL is a shipped window in which backups fail to
restore.

**Composition, not taxonomy.** Three small unions composed into one record — not
a hierarchy of slots by bucket or state, which is what this becomes if done
wrong.

**Constructor DI.** The projector is a pure function; the *reader* that fetches
rows and returns `SlotContract[]` takes `private readonly db: DatabaseContext`,
matching `SourceRuleReader` (`src/grants/source-rule-reader.ts:155`).

**Migration cost.** One correlation-CHECK migration (lifecycle, eligibility, and
the acquired-level correlation) plus a data audit over the widened ten-column
tuple, plus the versioned restore/share normalization that must precede the
migration, then the call sites — sheet builder, completeness query, four
set-slot commands, wire schemas. Still the largest item in this document, and
larger after round-2 than before it: the restore-normalization precondition is
new scope, not a re-description of existing scope.

**New compile guarantee.** Reading `.orphan_reason_code` off an active slot
stops compiling; reading a spell id without deciding whether it was granted or
selected stops compiling. Unlike the draft, this is bought by the migration in
precondition 2 — the type stops permitting what the database has been taught to
reject, rather than asserting a rejection that was never there.

### R3 — Extract fragments; reject three · candidate (a) · **ACCEPT (narrowed again in review)**

**The draft's fragments would have changed contracts, not described them.**
Round-1 finding 4 is correct and verified: `PublishableHomebrewBase<K>`
(`src/authoring/contracts.ts:289`) declares `kind`, `name`, `rules_edition`,
`reference_text` and **no `content_key`** — deliberately. Neither
`SpeciesContentAggregate` (`:297`) nor `BackgroundContentAggregate` (`:337`)
nor `SubclassContentAggregate` carries one; identity for an authored aggregate
is *derived* outside it, by `deriveContentIdentityV1`. The same is true on the
catalog side: `ClassContentAggregateV1` (`src/catalog/source-content-projector-v1.ts:72`)
and `FeatContentAggregateV1` (`:106`) both open with `kind` + `name` and carry
no `content_key` either. Re-expressing the base as `HasCatalogIdentity &
HasEdition` would therefore have *added a required field to every authored
aggregate* — a wire change, not the claimed "type-only, no wire change".

`CarriesGrants` had the mirror-image problem. It standardizes on `grant_rules`,
but the source aggregates intentionally use `grants: AuthoringGrant[]` — a
different field name holding a different type. Applying one fragment to both
does not resolve §2.4's triplication; it papers over a real boundary
difference.

**Accept — fragments that describe what is already there:**

```ts
export interface HasName            { readonly name: string; }
export interface HasEdition         { readonly rules_edition: RulesEdition; }
export interface HasProvenance      { readonly catalog_layer: CatalogLayerDisclosure; }
export interface HasContentKey      { readonly content_key: ContentKey; }   // opt-in, never in a base
export interface PlannedFromSource {
  readonly locator: PlannedGrantLocator;
  readonly source_label: string;
  readonly source_catalog_layer: CatalogLayerDisclosure;
}
```

`PublishableHomebrewBase<K>` becomes `HasName & HasEdition & { kind: K;
reference_text: string }` — **field-identical to today**, which is the test a
refactor of this kind has to pass. `ClassContentAggregateV1` and
`FeatContentAggregateV1` compose `HasName & HasEdition` and stop re-declaring
those two inline (§2.3's drift), again changing no field.
`FeatDefinitionForApplication` composes `HasContentKey & HasName &
HasProvenance & { grant_rules; grouping; min_level; ability_points; … }` —
`HasContentKey` applied explicitly at the one shape that genuinely has one,
never inherited into a shape that does not.
`LevelUpPlannedSkillProjection` / `LevelUpPlannedExpertiseProjection` become
`PlannedFromSource & { available_skills }`, at which point their identity is
visible rather than coincidental. That last one is the only place in R3 that
removes a real duplication rather than merely naming a shared shape.

**Reject — a shared grants fragment.** For the reason above: `grant_rules:
GrantRuleObject[]` and `grants: AuthoringGrant[]` are two different contracts at
two different boundaries. Unifying them is a real lane — and it should start at
§2.11's `GrantRuleObject` weakness, not at a fragment name.

**Reject — description.** Inventing a common description contract flattens a
distinction D152 pays for: subclass features carry `SubclassFeatureDescription`,
a branded two-state type where `HeadingOnlyDescription` is `'' & {…}` meaning
"prose deliberately absent" (`src/domain/subclass-feature-description.ts`). A
feat's `notes: string`, a species trait's `description: string` and a class's
`notes: string | null` are three different obligations; one fragment makes them
one.

**Reject — prerequisites.** `FeatPrerequisite[]` on feats,
`prerequisite: string` (verbatim, NOT NULL) on `named_features`, and the ability
gate in `src/rules/multiclass-prerequisite-gate.ts` are three mechanisms with
three evaluation contexts. A fragment would assert a uniformity that does not
exist. R5 unifies what should actually be unified.

**Touches.** `src/catalog/source-content-projector-v1.ts:72,106`,
`src/rules/feats-srd.ts:55`, `src/builder/level-up-wizard.ts:201,247,254,286`,
`src/authoring/contracts.ts:289`, and `src/catalog/source-catalog-records.ts:809,819`
(both double assertions — see the bound below). Type-only; no DDL, no wire change — and now
that is a checkable claim rather than an assertion, because no fragment adds a
field to any type it is applied to.

**Split out of this lane in review: branding.** The draft folded "brand the ids
in `src/domain/models.ts`" in as "related and worth doing in the same lane".
§2.12 shows why that does not fit: 59 bare identifier fields across
`models.ts` (29) and `read-models.ts` (30), and the highest-risk pair —
`spell_identity_id` / `spell_version_id` adjacent in `SpellRoute`
(`src/domain/read-models.ts:125`) — is in the file the draft did not name.
Branding is a **boundary-by-boundary lane**: pick one read boundary, brand
every id crossing it, fix the call sites that break, repeat. Bundled into R3 it
would be an unbounded mechanical diff whose size is unknown until it is
started.

**New compile guarantee.** Modest and honest — this buys drift *detection*, not
new refusals. A fifth feat shape cannot be added without either composing the
fragments or visibly declining to.

**And a bound on even that.** The catalog parser reaches its aggregate types
through double assertions, and round-2 finding 5 is right that the draft
recorded only one of the two that matter to this lane. Both are in the same
`switch`, in the same shape, four lines apart in structure:

- `} as unknown as ClassContentAggregateV1;` — `src/catalog/source-catalog-records.ts:809`, closing the `'class'` arm.
- `} as unknown as FeatContentAggregateV1;` — `:819`, closing the `'feat'` arm.

(A third, `as unknown as SpeciesContentAggregate` at `:829`, sits on the species
arm. It is named here for completeness but is not part of R3's claim: R3's
fragments apply to `ClassContentAggregateV1` and `FeatContentAggregateV1`, the
two shapes that today re-declare `kind` + `name` + `rules_edition` inline.)

This matters because the two aggregates R3 composes `HasName & HasEdition` into
are exactly the two behind those casts. A double assertion defeats every
structural guarantee at exactly the boundary R3's fragments are meant to
police, so fragments alone do not make the projector's output checked, and
removing *one* cast leaves the drift-detection claim true of only half the
lane. **Both casts must go** — by making the builder produce each aggregate
type honestly — for R3's guarantee to hold; the fragments are what make it
possible to state.

### R4 — Declare `character_source_instances.state`, then constrain it · candidate (g) · **ACCEPT**

**Change.**

```ts
// src/domain/enums.ts
export const sourceInstanceStates = ['active', 'tombstoned'] as const;
export type SourceInstanceState = (typeof sourceInstanceStates)[number];
```

then `varchar<SourceInstanceState>()('state')` in `db/schema/character.ts:271`,
`state: SourceInstanceState` in `src/domain/models.ts:164`, and only then a
`oneOf` CHECK in a new migration.

**Order is already ruled on.** D13: *"`state` stays unconstrained until its
vocabulary is declared in enums (a CHECK must read ONE source)."* The column's
own comment says the same — a CHECK transcribed from a grep of the writers would
be a second, unowned copy. This is that decision executed, not a new one.

**Touches.** The four writers the comment names, plus every reader comparing
`state === 'active'` — notably `src/rules/eligible-character-effects.ts`, which
gates every effect on it. No service, so no DI. One checksum-registered
migration (`src/db/migrations.ts`), preceded by a data audit: a row holding a
third value would fail the CHECK inside `BEGIN EXCLUSIVE`. That is the correct
failure, but it should be found before shipping.

**New compile guarantee.** `state === 'tombstoend'` stops compiling. Today it is
a silently-false comparison that leaves a tombstoned source contributing
effects.

### R5 — One orphan-reason REGISTRY with per-table subsets; prerequisite re-evaluation splits off · candidate (h) · **ACCEPT (stage 1, re-specced); STAGE 2 BECOMES ITS OWN DESIGN**

**Stage 1 — the registry, not one flat union.** The draft proposed a single
four-member `OrphanReason` covering every table. Round-1 finding 5 is correct
that this contradicts D38 (*"vocabularies are typed PER TABLE"*): it would make
`underlying_proficiency_removed` a legal value on a spell slot, where nothing
depends on an underlying proficiency, and `rule_no_longer_active` legal on an
expertise row. One canonical table, per-table subsets derived from it:

```ts
// src/domain/orphan-reasons.ts — ONE table, the reason each name exists
export const ORPHAN_REASONS = {
  rule_no_longer_active:           'the entitlement shrank under a live source',
  parent_rule_removed:             'the owning source tombstoned',
  entitlement_removed:             'the class-level entitlement itself went away',
  underlying_proficiency_removed:  'the proficiency this expertise doubled was lost',
} as const satisfies Readonly<Record<string, string>>;
export type OrphanReasonName = keyof typeof ORPHAN_REASONS;

export const SPELL_SLOT_ORPHAN_REASONS =
  ['rule_no_longer_active', 'parent_rule_removed'] as const satisfies readonly OrphanReasonName[];
export const SKILL_GRANT_ORPHAN_REASONS = SPELL_SLOT_ORPHAN_REASONS;
/** Round-2 finding 3: a FOURTH table writes these, and the draft omitted it. */
export const WIZARD_SPELLBOOK_ORPHAN_REASONS = SPELL_SLOT_ORPHAN_REASONS;
export const EXPERTISE_GRANT_ORPHAN_REASONS =
  ['parent_rule_removed', 'entitlement_removed', 'underlying_proficiency_removed'] as const
    satisfies readonly OrphanReasonName[];

export type SpellSlotOrphanReason     = (typeof SPELL_SLOT_ORPHAN_REASONS)[number];
export type WizardSpellbookOrphanReason = (typeof WIZARD_SPELLBOOK_ORPHAN_REASONS)[number];
export type ExpertiseGrantOrphanReason = (typeof EXPERTISE_GRANT_ORPHAN_REASONS)[number];
```

An alias, not a re-listing: `WIZARD_SPELLBOOK_ORPHAN_REASONS` and
`SKILL_GRANT_ORPHAN_REASONS` are today the same two members as the spell-slot
subset, and aliasing says so in one place. They stay **separate names** because
D38 types vocabularies per table and the three tables may diverge — a wizard
acquisition can be lost for reasons a skill grant cannot — and because each name
is what its own CHECK is transcribed from. A future divergence edits one alias
into its own literal list; it does not have to first discover that three tables
were sharing a constant.

`satisfies readonly OrphanReasonName[]` is what makes the subsets *derived*: a
subset naming a reason the registry does not declare is a compile error, and the
registry is the ONE source a CHECK may be transcribed from (D13). Per-table
CHECKs then read their own subset, which is D38 executed rather than quoted.

`source_removed` and `parent_rule_removed` name one fact; `source_removed`
dies, and expertise grants adopt `parent_rule_removed`. That is the one stored
literal this stage renames. Every row type moves `orphan_reason_code: string |
null` → its table's subset (`SkillGrantRow` at `src/builder/contracts.ts:808`,
`SkillExpertiseGrantRow` at `src/grants/skill-expertise-grants.ts:36`,
`SpellSelectionSlotRow` at `src/domain/models.ts:202`), which is what makes the
comparisons at `src/queries/character-completeness.ts:938` and
`src/queries/character-sheet-builder.ts:679` checked. The inline SQL literals at
`src/grants/grant-rule-slot-generator.ts:765, 813` (`rule_no_longer_active`)
and `:889, 925` (`parent_rule_removed`) become bound parameters carrying the
constants.

**The wizard-spellbook table, added to this lane in round-2 review.** Finding 3
is correct and verified: `wizard_spellbook_entries` stores `orphan_reason_code`
(`db/schema/character.ts:842`) and the generator writes **both** canonical
literals into it — `'rule_no_longer_active'` at
`src/grants/grant-rule-slot-generator.ts:813` and `'parent_rule_removed'` at
`:925`, each an `UPDATE wizard_spellbook_entries`, not an `UPDATE
spell_selection_slots`. The draft's per-table registry named three tables and
this is a fourth, so the lane as written would have left a table writing the
registry's vocabulary with nothing derived from it. Four items are added to
stage 1's scope:

1. **The named subset** — `WIZARD_SPELLBOOK_ORPHAN_REASONS` /
   `WizardSpellbookOrphanReason`, above. Aliased to the spell-slot pair today,
   named separately because D38 types per table.
2. **A type and read boundary, which this table does not yet have.** Unlike the
   other three, no row type declares the column (§2.10): the only declaration
   anywhere is `sqlText` in the Zod row contract
   (`src/domain/contracts/rows.ts:935`), and no reader in `src/` selects it. So
   this is not "narrow an existing `string | null`" — the lane must add a
   `WizardSpellbookEntryRow`-shaped read (or narrow `rows.ts:935` to the
   subset's enum, which is the smaller move and reaches the backup validator
   too) before a CHECK has a single source to be transcribed from. Whichever is
   chosen, it must respect D8: `rows.ts` validates restored documents, so
   narrowing it is a write-side and in-app-read obligation whose import-side
   counterpart is accept-and-migrate, not refusal.
3. **A data audit**, same shape as the other three tables' — every distinct
   `orphan_reason_code` present in `wizard_spellbook_entries`, plus its
   correlation with `state`, whose enum here is only two members
   (`spellbookAcquisitionStates` = `active | orphaned`,
   `src/domain/enums.ts:128`), so there is no `discarded` complication and the
   correlation is the simple one the slot table does *not* have.
4. **A `oneOf` CHECK** — `wizard_spellbook_entries_orphan_reason_code_check`,
   transcribed from the subset, in the same migration as the other three. The
   table today has `_state_check` (`db/schema/character.ts:891`) and
   `_selection_eligibility_check` (`:895`) and nothing on the reason column;
   this closes the same gap the other tables are having closed.

**Migration cost (stage 1).** One migration: rename the stored `source_removed`
literal, then add per-table `oneOf` CHECKs transcribed from the subsets — now
**four** tables' CHECKs, not three. A data audit first, same reasoning as R4 — a
row holding an undeclared reason fails the CHECK inside `BEGIN EXCLUSIVE`, which
is the correct failure but should be found before shipping. The wizard table
adds the only genuinely *new* type surface in the stage (item 2 above), so the
lane is a little larger than the draft's estimate; it is still one migration.

**New compile guarantee (stage 1).** Every orphan-reason comparison is checked,
and a reason meaningful on one table cannot be written to another. For
`wizard_spellbook_entries` specifically the guarantee is created rather than
tightened: there is no comparison to check today because there is no type to
check it against.

---

**Stage 2 — prerequisite re-evaluation — REMOVED from this lane; it is its own
behavioural design.** The draft treated it as a stage of a vocabulary refactor.
It is not: it is a new lifecycle with three unresolved behaviour questions, and
the draft's own contract does not compile against the codebase. What the review
found, all four verified:

1. **`FeatPrerequisiteFailure` does not exist.** `grep` across `src/`, `db/` and
   `tests/` returns nothing. The real types are `FeatUnmetReason`
   (`src/builder/level-up-wizard.ts:87`), `FeatUnprovableReason` (`:114`) and
   their union `FeatEligibilityReason` (`:129`). The draft's result type named a
   type that has never existed.
2. **There is a third state, and the draft has nowhere to put it.**
   Eligibility is not met/unmet. `FeatUnprovableReason` exists because a
   prerequisite can be *unknowable* — an ability score not yet allocated
   (`ability_score_unknown`), a feature whose evidence is `'unprovable'`
   (`src/rules/feat-application.ts:335-339`). A `{still_met, newly_unmet}`
   result must either count unprovable as met (silently keeping a feat whose
   prerequisite may now fail) or as unmet (tombstoning a feat on missing
   information). Both are the plausible-wrong-answer failure D33 forbids. The
   result needs a third arm.
3. **The evaluator cannot be reused as-is — it would see itself.**
   `evaluateFeatEligibility` reads `character.active_feats` and pushes
   `{kind: 'already_taken'}` when the feat being evaluated is already held and
   not repeatable (`src/rules/feat-application.ts:343-348`). Re-evaluating an
   *applied* feat therefore reports it ineligible **because it is applied**.
   Every non-repeatable feat on every character would be found newly-unmet on
   the first pass. Re-evaluation needs a self-excluding projection of the
   character — the feat's own source instance removed from `active_feats` —
   which is a real behavioural decision (what else does that instance
   contribute that must also be excluded?), not a parameter.
4. **The trigger path in the draft misses the main cause.** The draft would
   invoke the pass wherever `reconcileCharacterLevelDependentSources` runs —
   i.e. on level change. But ability scores are prerequisites
   (`ability_score_minimum`, `FeatUnmetReason` arm 2), and
   `UpdateAbilityCommand` (`src/commands/update-ability.ts:31-45`) performs no
   reconciliation at all — `grep` for `reconcil` in that file returns nothing.
   Concrete failure: lower STR below a feat's prerequisite and the feat stays
   active and keeps contributing, with the level-triggered pass never firing.

Corrected result shape, for the document that takes this on:

```ts
export type PrerequisiteReevaluationOutcome =
  | { readonly kind: 'still_met' }
  | { readonly kind: 'unprovable'; readonly reasons: readonly FeatUnprovableReason[] }
  | { readonly kind: 'newly_unmet'; readonly reasons: readonly FeatUnmetReason[] };

export interface PrerequisiteReevaluation {
  readonly outcomes: ReadonlyMap<SourceInstanceId, PrerequisiteReevaluationOutcome>;
  readonly iterations: number;   // bounded; exceeding it is a refusal, not a silent stop
}
```

with three questions the design must answer before that type means anything:
what an `unprovable` outcome *does* (surface, block, or leave alone); what the
self-excluding character projection contains; and which commands trigger the
pass (at minimum level change *and* ability change, and the ability path has no
reconciliation hook to attach to yet).

Foundry's version is still the right prior art —
`module/documents/advancement/item-choice.mjs`, `_evaluatePrerequisites()`
loops to a fixpoint bounded at 100, reversing any added item whose
`validatePrerequisites()` now fails and re-checking, because a reversal can
invalidate another choice; their prerequisites are declared data
(`module/data/item/feat.mjs:53`). The gap it exposes here is real: ours orphans
on `rule_no_longer_active`, which covers level-gated *grants* but not "this
choice required Warlock 5 and you undid a level", and feat prerequisites are
checked at selection and never re-checked. Recording the gap is what this
document can honestly do; specifying the fix is a separate document.

**Constructor DI (when it is written).** A real service taking
`private readonly db: DatabaseContext` and the existing `GrantRuleSlotGenerator`
— the same shape as `src/grants/character-level-source-reconciliation.ts`, the
forward reconciliation this is the backward twin of.

### R6 — Config/value split · candidate (c) · **REJECT as a rename, ACCEPT as a locator**

Adopting their `configuration`/`value` *names* would rename `GrantRule` and
`spell_selection_slots` while changing nothing either contains. AGENTS.md is
clear that a large diff is not a cost worth avoiding — and equally clear the
diff must buy something; a rename leaving both shapes identical buys vocabulary,
not a compile error.

Their **locality** is worth taking. But the draft misidentified where our
config→value link lives, and proposed a parser that cannot be total.

**Correction 1 — the join is already relational.** `spell_selection_slots`
stores `source_instance_id`, `rule_key` and `ordinal` as **separate columns**
(`db/schema/character.ts:501-506`), with a composite FK to
`character_source_instances`. The structured string
`${instanceUuid}:${ruleKey}:${ordinal}`
(`src/grants/grant-rule-slot-generator.ts:732`) is a *derived portable
uniqueness key*, unique-indexed as `slot_key` per character — not the only
join, and not the primary one. Production queries already use the triple.

**Correction 2 — a delimiter parser cannot be proven inverse.** `rule_key` is
only validated as a non-empty string, and colon-bearing rule keys already exist
in the tree: `rule_key: 'elf-lineage:replaceable_spell'`
(`tests/helpers/species-lineage-portability.ts:255`). `instance_uuid` is
likewise only `nonEmptyText` at the contract boundary
(`src/domain/contracts/rows.ts:883`). So `parseSlotKey` cannot recover the
triple unambiguously from every string the writers legitimately produce — it
would be a plausible-wrong-answer factory of exactly the kind D33 forbids,
introduced in the name of AGENTS.md rule 6.

**What to build instead — construct, never parse:**

```ts
export interface SlotLocator {
  readonly source_instance_id: SourceInstanceId;   // the stored column
  readonly rule_key: GrantRuleKey;
  readonly ordinal: number;
}
/** Built from the row's own normalized columns. Total, no parsing. */
export function slotLocator(row: SpellSelectionSlotRow): SlotLocator;
/** The ONLY producer of the portable key. Derivation is one-way by design. */
export function slotKey(locator: SlotLocator, instance_uuid: SourceInstanceUuid): SlotKey;
```

`slot_key` survives unchanged as the portable, character-scoped uniqueness key
— it is what makes a slot identifiable across an export/import round trip,
where row ids do not survive.

**Correction 3 — "never read back apart" was false, and round-2 finding 4 is
right.** The backup remapper takes a stored `slot_key` apart today. On restore a
character gets a new source-instance uuid, so the derived key has to be rewritten
to match, and `remappedSlotKey(value, oldUuid, newUuid)`
(`src/backup/character-backup.ts:2530`) does that by operating on the stored
string's uuid prefix. It has two call sites, both in the restore/import path:
the portable-row insert at `:3093` (inside the `insertPortableRow` call for
`spell_selection_slots` at `:3090`) and the save-point/rehydrate path at `:3681`.
So there is exactly one place that decomposes the key, and the draft's sentence
asserted it did not exist.

That does not weaken the rejection of `parseSlotKey` — it sharpens it. The
remapper is precisely the plausible-wrong-answer surface correction 2 warns
about: it recovers the uuid prefix from a string whose remaining segments may
themselves contain colons (`rule_key: 'elf-lineage:replaceable_spell'`), so its
correctness rests on the same delimiter assumption a parser would.

**In scope for R6, therefore:** replace `remappedSlotKey` with a call to
`slotKey(slotLocator(row), newUuid)` — the key re-derived from the row's own
normalized `source_instance_id` / `rule_key` / `ordinal` columns plus the new
uuid, never from the old string — at both `:3093` and `:3681`, and **delete
`remappedSlotKey` (`:2530`)**.

One mechanical detail the lane must not skip: the restore path holds a raw
`BackupRow`, not a projected `SpellSelectionSlotRow`, and the derived key's
segments are `${instanceUuid}:${ruleKey}:${ordinal}`
(`src/grants/grant-rule-slot-generator.ts:732`) — the locator's
`source_instance_id` does not appear in the string. So the restore call needs
`rule_key` and `ordinal` read off the backup row (both are portable columns that
survive export) plus the new uuid. Either `slotLocator` gains a sibling that
accepts the backup row's columns, or restore builds the `SlotLocator` literal
itself; what it may not do is fall back to touching the old string. This is the
one place R6's API meets D8's boundary, and it is small — but it is the reason
the deletion is in scope rather than "left to whoever migrates restore".

This is construction, not parsing, so it is the
same one-way derivation the rest of the lane specifies, and it makes `slotKey`
genuinely the ONLY producer of the portable key rather than one of two.

Note the D8 posture is unaffected: this is a *widening* of what restore can
handle, not a narrowing. Re-deriving from columns accepts every row the old
string-rewrite accepted and additionally gets colon-bearing rule keys right,
where the string rewrite is at best accidentally correct.

With the remapper replaced, the original sentence becomes true rather than
aspirational: `slot_key` is never read back apart. If a future lane wants the
uuid inside the locator it joins `character_source_instances`; it does not split
a string.

This is the `locator` field R2 needs, and `PlannedGrantLocator` already exists
for the planning side — this is the persistence side of the same idea, built
from columns rather than from text.

### R7 — `class_restriction` on `GrantRule` · candidate (e) · **ADJACENT LANE**

Listed, not specced. The shape is one field —
`readonly classRestriction: 'primary' | 'secondary' | null` — registered in
`GRANT_RULE_FIELD_CONFIG_CONSUMPTION` as `'never'`, validated in `fromObject`,
consulted where rule activation is decided:
`SourceRuleReader.ruleIsActiveForSource` and `GrantRulePlanner.plan`, which must
agree and already duplicate the same three gates.

Why a separate lane: the fact it depends on — which class is the starting class
— landed recently (`startingClass` in `src/rules/sheet.ts`, surfaced at
`src/queries/character-workspace-builder.ts:290`) and carries degradation
warnings that three of five sheet arms propagate. Wiring a rule-level gate to a
resolution that can be *degenerate* is a design question of its own and should
be specced against that resolution's warning states.

### R8 — `scale_value` grant-rule kind · candidate (d) · **REJECT**

Rejected on evidence, and the rejection is the finding — but on a narrower
rationale than the draft gave. §3.4 shows `ValueExpression` covers their
`scale` map (the `table` limb) and their reverse-find (`level_source`) for
numeric values without a formula string, and `FeatureValueContribution<K>`
(`src/domain/feature-values.ts:49`) adds a typed target, an op, a supersession
graph and three named graph-error states. **That is enough to reject a tenth
`grantRuleKinds` member**, because such a member would create a *second*
mechanism for level-indexed numbers whose only advantage is reachability from a
grant rule. It is not enough to claim parity: their dice, distance, CR and
string value types have no equivalent here, and if authored content ever needs
a level-scaled *die* or *distance*, the answer is a new `ValueExpression` limb
or a new `FeatureValueTarget` — still not a grant-rule kind.

The draft then said "the actual gap is one line" and that authored content
needs a path to emit contributions. Both overstate. Subclass authoring
**already has** that path: `SubclassFeatureValueContribution`
(`src/authoring/contracts.ts:450`) is a full authored contribution carrying
`target: FeatureValueTarget`, `op`, `value: ValueExpression`, level window and
`supersedes`, and `featureContribution()`
(`src/authoring/subclass-publisher.ts:307`) publishes it. What is missing is
the same path for *classes*, not for authored content in general. The one-line
observation still stands as an observation:

```ts
// src/domain/feature-values.ts:11
export const featureValueKeys = ['sneak_attack'] as const;
```

One member, one producer — `ROGUE_SNEAK_ATTACK_CONTRIBUTION`
(`src/rules/class-progression-lookup.ts:180`), hand-built as a frozen object
with a JSON-stringified `ValueExpression` — while the same file still carries
five hand-written literal prepared-count arrays at `:33-56` that the `table`
limb could express.

So the work their `ScaleValue` implies is: widen `featureValueKeys`, extend the
authored-contribution path from subclasses to classes, and migrate the bespoke
arrays onto `ValueExpression`.

**And the third of those is bigger than one line, corrected in review.**
Widening `featureValueKeys` cannot by itself absorb the prepared-count arrays
at `src/rules/class-progression-lookup.ts:33-56`: `featureValueKeys` feeds the
`feature_dice_count` target, and a prepared count is neither a dice count nor a
resource maximum. Migrating them needs a **new `FeatureValueTarget` arm**, a
storage rule for it, and a consumer that reads it — three things that do not
exist. A real lane, correctly sized — not this document's, and not a
grant-rule kind.

---

## 5. What we already do better — do not regress these

- **Two-identity spells.** Concept vs as-printed, separate brands, every
  character-facing pointer aimed at a version. Foundry coalesces three identity
  spaces: `item.flags.dnd5e?.sourceId ?? item._stats.compendiumSource ?? item.uuid`.
- **Branded ids.** `src/domain/ids.ts` — per §2.2 they guard the schema layer,
  not yet the row models. Extending them is progress; removing any is not.
- **Throw-based parse factories.** `GrantRule.fromObject`,
  `parseSourceCatalogRecord`, `deriveContentIdentityV1`. A value that exists is
  a value that validated; no `Result` union to ignore at a call site.
- **Checksummed migrations.** `CATALOG_DATA_MIGRATIONS` hashes the source bytes
  of every module whose behaviour the migration depends on (D226); the DDL tier
  compares a schema signature before `COMMIT` and rolls back on mismatch.
- **Typed absence.** `MasteryAllowance`'s four states with no path returning
  `0`; `VersatileWeaponDamage`'s `not_applicable` distinct from `not_recorded`;
  `SrdSubclassDeferral`'s four named reasons a rule was not modelled, as data;
  `HeadingOnlyDescription`. Each refused an available plausible wrong number (D33).
- **Closed sets that are actually closed.** Their spellcasting `progression` is
  a `StringField` with no `choices`
  (`module/data/item/fields/spellcasting-field.mjs:15`), so `progression: "hlaf"`
  validates, yields `undefined` twice, and the character silently gets zero slots
  from that class. Ours is a literal union behind an exhaustive switch with no
  default arm. (Not universally — §2.11 records one switch in `GrantRule` that
  does carry a `default`. The pattern is the norm here, not an invariant, and
  this bullet is about the norm.)

---

## 6. Sequencing

**Reordered in review.** The reviewer's recommended order — *"define the real
effect, orphan, and slot invariants first; land R4; implement scoped
orphan/effect registries with their migrations; derive `SlotLocator` from
columns; then add R2 with matching data audit and DDL; treat fragments/branding
as a separate boundary-by-boundary lane, and prerequisite re-evaluation as its
own behavioral design"* — is genuinely better than the draft's, for a reason
the draft could not see: the draft ordered lanes by *size*, and the review
showed that the small lanes were small partly because they assumed invariants
that do not exist. Ordering by *which lane establishes an invariant another
lane consumes* is the correct axis. Adopted, with two deviations defended below.

| # | Lane | Depends on | Rough size |
|---|---|---|---|
| 1 | **R4** `sourceInstanceStates` declared, then constrained | — | Small–medium. One migration; data audit first. **First because it is the one lane the review found sound end to end** — it establishes the declare-then-constrain pattern (D13) that R5 stage 1 and R2 both reuse, on the smallest possible surface. |
| 2 | **R1** effect vocabulary derived from the payload map | — | Medium. ~7 files, type-only, genuinely zero DDL under the owner's wide ruling. **Four** arrays derived, the fifth (`speciesTemplateEffectKinds`) deleted. Now also absorbs `EquipmentEffectInput` and per-context payload requiredness (§2.8). |
| 3 | **R3** fragments + `PlannedFromSource` | — | Small. Type-only, mechanical, no field added anywhere. Branding split out. **Both** double assertions (`source-catalog-records.ts:809` class, `:819` feat) must go for the drift-detection claim — that part is not mechanical, and it is what the lane actually buys. |
| 4 | **R6** `SlotLocator` built from the normalized columns | — | Small–medium (was Small). New module, one constructor, one key producer, **no parser** — plus deletion of `remappedSlotKey` (`character-backup.ts:2530`) and its two restore call sites (`:3093`, `:3681`) re-derived from columns. Touches the backup path, so it is no longer a pure new-module lane. |
| 5 | **R5 stage 1** orphan-reason registry + per-table subsets | R4 (pattern only) | Small–medium. One migration: rename `source_removed`, then per-table `oneOf` CHECKs across **four** tables — the fourth, `wizard_spellbook_entries`, added in round-2 and the only one needing a read boundary created rather than narrowed. Data audit first. |
| 6 | **R2 preconditions** — `kept_override`/`override_note`/revived-`prior_config` rulings, ten-column data audit over live rows **and** restorable documents, versioned restore/share normalization, correlation CHECKs incl. acquired-level, add `selection_acquired_at_class_level` to the row model | R5 stage 1, R6 | **Medium–large** (was Medium). This is where R2's real cost sits and the draft had it at zero; round-2 added the restore-normalization precondition, which must land **before** the migration, and it is the single largest addition to this document's scope. |
| 7 | **R2** slot discriminated-union contract + in-app projector | 6 | **Large.** Biggest item here; incremental because `SpellSelectionSlotRow` survives. Restore path excluded for the *projector* (D8) — but not for the lane: its CHECKs constrain restore's INSERTs, which is why normalization sits in item 6. |
| — | **Branding**, boundary by boundary | — | Split out of R3. 59 bare ids across two files (§2.12); size unknown until the first boundary is done, which is the argument for doing one first. |
| — | **Prerequisite re-evaluation** (was R5 stage 2) | R5 stage 1 | Deferred to its own behavioural design — three unresolved questions, §R5. |
| — | **R7** `class_restriction` | `startingClass` degeneracy semantics | Deferred to its own document. |
| — | **R8** feature-value widening (the real ScaleValue lane) | — | Deferred; separate document, and larger than the draft claimed. |

**Where this differs from the reviewer's order, and why — two deviations.**

*First:* the reviewer put "define the real effect, orphan, and slot invariants"
as a step *before* R4. For the effect and orphan vocabularies that is exactly
what R1 and R5 stage 1 now are, so it is not a separate step — folding it into
those lanes keeps the definition and its enforcement in one diff, which is what
D13 asks for ("a CHECK must read ONE source"). For the *slot* invariants it
genuinely is a separate step, and it is now item 6. R4 stays first because it is
the only lane that survived review unamended: landing it first proves the
declare-then-constrain pipeline (enum → typed column → row model → audit →
CHECK migration) on a two-member vocabulary before R5 and R2 run the same
pipeline on harder ones. Doing invariant-definition work before that pipeline
is proven risks defining invariants we then cannot enforce the way we assumed.

*Second:* the reviewer would put the orphan registry (R5 stage 1) ahead of R6
and R3. The **owner approved R1 + R3 + R4 + R6 as the small lanes to run
first**, and a review may refine what each lane contains but not re-pick which
lanes were approved — so those four hold items 1–4 and R5 stage 1 follows at 5.
Nothing is lost by this: the reviewer's substantive constraint is that the
orphan registry precede R2 (because R2's lifecycle arm consumes
`SpellSlotOrphanReason`), and at item 5 it does. R6 does not depend on R5 in
either direction, so the swap is free.

Lanes 1–5 do not touch each other and can land in any order among themselves;
the numbering is a recommendation, not a dependency chain, except that 4 and 5
gate 6, and 6 gates 7.

**One qualification added in round-2.** That first clause is now slightly less
true than it was: R6 (item 4) and R2's preconditions (item 6) both edit
`src/backup/character-backup.ts` in the slot-restore region — R6 to replace
`remappedSlotKey` at `:3093`/`:3681`, item 6 to extend the versioned
normalization those same rows pass through. They do not conflict logically (one
rewrites a derived key, the other normalizes correlated columns) and the
existing dependency edge already orders them 4 → 6, so nothing needs to move.
It is recorded because "lanes 1–5 do not touch each other" was written when R6
was a new-module-only lane, and whoever runs item 6 should expect item 4 to have
been there first.

**Deliberately not sequenced.** R2's call-site migration will surface consumers
that read a slot's assignment without narrowing. Each is either a latent bug or
a proof that the combination cannot occur. Neither is resolved by widening the
union.

---

## 7. Review dispositions

Two independent review rounds. Round-1 dispositions are the first table,
round-2 the second. Every cited `file:line` was re-opened in the working tree
before the finding was adopted, in both rounds; where a reviewer's line number
was off the corrected number is used in the body above and noted here. Nothing
was accepted on a reviewer's authority.

### Round-1 review dispositions

An independent review of the first draft returned five HIGH findings, four
MEDIUM, seven consensus points and a recommended reordering.

| # | Sev | Finding | Disposition | Where |
|---|---|---|---|---|
| 1 | HIGH | R2 invents `superseded`, omits `discarded`; the DB does not enforce the lifecycle/eligibility groups; a throwing projector could break D8 restore | **FIXED — fully** | §2.9 rewritten with a per-group enforcement table; R2 restated as three preconditions (ruling, audit+DDL, row-model field) with a `orphaned \| discarded` shared arm; D8/D235 boundary stated in the status block |
| 2 | HIGH | R5 stage 2 names a non-existent type, has no `unprovable` state, would self-invalidate every non-repeatable feat, and misses the ability-change trigger | **FIXED — fully; lane split off** | R5 stage 2 removed from the lane, restated as its own behavioural design with the four verified defects and a corrected three-arm result type |
| 3 | HIGH | R1's "single payload map" is false (`EquipmentEffectInput`); per-context requiredness differs; SQL CHECKs unreachable from TS; the five-kind rationale misreads `ability_increase` | **FIXED — fully** | §2.8 retitled and rewritten; R1 gains a context parameter, absorbs `EquipmentEffectInput`, states what it does *not* buy, and replaces the bad rationale. Owner's wide ruling stands and is what makes "zero DDL" true |
| 4 | HIGH | R3's `HasCatalogIdentity` would add `content_key` to every authored aggregate; `CarriesGrants` papers over `grants` vs `grant_rules` | **FIXED — fully** (bound extended in round-2, see R2-5) | R3 narrowed to `HasName`/`HasEdition`/`HasProvenance` + opt-in `HasContentKey`; shared grants fragment rejected; the `as unknown as` cast at `source-catalog-records.ts:809` recorded as the real bound — round-2 adds its twin at `:819` |
| 5 | HIGH | One global `OrphanReason` contradicts D38 | **FIXED — fully** | §2.10 gains the D38 framing; R5 stage 1 re-specced as one canonical registry with `satisfies`-derived per-table subsets and per-table CHECKs |
| 6 | MED | R6 misidentifies the join; `parseSlotKey` cannot be total (colon-bearing rule keys exist) | **FIXED — fully** | R6 rewritten: `SlotLocator` built from `source_instance_id`/`rule_key`/`ordinal` columns; parser deleted; `slot_key` kept as a one-way derived portable key |
| 7 | MED | R8's rejection is sound but "we already have more" and "the gap is one line" overclaim | **FIXED — fully** | §3.4 opens with the five-domains-vs-arithmetic comparison; R8 keeps the rejection on the narrower rationale, records the existing subclass authoring path, and re-sizes the prepared-count migration |
| 8 | MED | `GrantRuleObject` is all-optional-`unknown`; `fromObject`'s count switch has a `default` arm vs D25 | **FIXED — new inventory entry** | New §2.11; §2.7's "No drift" retracted and repointed |
| 9 | MED | Branding under-inventoried (59 bare ids incl. `read-models.ts`); `SpellSelectionSlotRow` omits `selection_acquired_at_class_level` | **FIXED — new inventory entry + §2.9** | New §2.12 with the measured count; the missing slot column recorded in §2.9 and made an R2 precondition |

**Consensus points, disposed of individually:**

- *The feat table's field comparison is accurate, but the three taxonomy names
  are not one boundary field.* **Accepted** — §2.4 now separates
  `source_category` (SRD printed heading) from `grouping` (normalized, shared
  by two of the three shapes) from `category` (projected, un-narrowed), and the
  claim is restated as *narrowing lost at the projector*.
- *DB-ten/Zod-five, the dead import, the eleven-kind map, the five orphan
  literals, and bare ids in `models.ts` are verified.* **Noted**; all five
  re-verified here independently.
- *R4 is right-sized, executes D13, and is composition not taxonomy.*
  **Noted** — and it is why R4 moved to first in §6.
- *Rejecting a pure config/value rename is sound.* **Noted**; unchanged.
- *A normalized `SlotLocator` is sound; parsing `slot_key` is not.*
  **Accepted** — finding 6.
- *Rejecting a `scale_value` GrantRule kind is sound, with narrower rationale.*
  **Accepted** — finding 7.
- *Recommended reordering.* **Accepted with two defended deviations** — see §6:
  invariant-definition folds into R1/R5 rather than preceding them, and the
  owner-approved small-lane set (R1+R3+R4+R6) keeps items 1–4 with R5 stage 1
  at 5, which still satisfies the reviewer's real constraint (orphan registry
  before R2).

**Nothing was rejected.** All nine findings were reproducible against the
working tree; the two that could have been argued down were not. Finding 3's
"cannot be both zero-DDL and tighten the CHECK" is a real contradiction in the
draft, resolved by the owner's wide ruling rather than by argument, and that is
recorded as such in R1 rather than claimed as a rejection. Finding 1's D8
tension is resolved by scoping — and round-2 finding 1 shows that scoping was
necessary but not sufficient; see below.

### Round-2 review dispositions

A second independent review of the round-1 revision returned three HIGH, two
MEDIUM and one LOW. All six were re-verified against the working tree before
adoption — every `file:line` below was opened, and the two that were slightly
off are corrected in place (the R6 remapper is at `:2530`, not `:2531`; the
generator's four orphan literals split `765`/`889` → `spell_selection_slots`
and `813`/`925` → `wizard_spellbook_entries`, which is finding R2-3's whole
point). **All six are accepted; none was argued down.** Three of them grow the
scope of an accepted lane, which is recorded in §6 rather than absorbed
silently.

| # | Sev | Finding | Disposition | Where |
|---|---|---|---|---|
| R2-1 | HIGH | The D235/D8 boundary is incomplete in sequence: restore INSERTs slot rows directly (`character-backup.ts:2230`, called at `:3090`), so once R2's CHECKs land an older accepted combination fails at INSERT before any projector runs. Scoping the projector away from restore does not discharge D8 | **ACCEPTED — fully; R2 gains a precondition** | Verified: `insertPortableRow` (`:2236-2249`) builds a generated `INSERT INTO "spell_selection_slots"` with no domain object between document and table. §"Where D235 stops, and D8 resumes" gains a second half — *DDL is not inward*, so import normalization is a precondition of any CHECK. R2 gains **precondition 2b**, versioned restore/share normalization landing **before** the DDL (accept-and-migrate per D8), extending the existing `reconciledColumns`/`fillHistoricalRowColumns` hook (`:476-497`, `:487`) rather than inventing one; the audit widens to cover restorable documents, not only live rows; "Where the projector must NOT go" gains its counterpart section; §6 item 6 re-sized |
| R2-2 | HIGH | R2's audit tuple must cover every correlation its union assigns meaning to — `orphaned_at`, `prior_config`, `override_note` are missing; the pinned revive behaviour (a slot revived to `active` **retains** non-null `prior_config`) needs an explicit ruling and a representation the current bare `active` arm does not give it; and a non-null `selection_acquired_at_class_level` is uncorrelated with `current_spell_version_id` | **ACCEPTED — fully; three separate amendments** | Verified: `slot-generator.test.ts:542-553` orphans with `prior_config: '{"level":4}'`, `:576-586` revives to `state: 'active'`, `orphan_reason_code: null`, `orphaned_at: null` and **`prior_config` still `'{"level":4}'`**. Column at `character.ts:564`; the only assignment CHECK is `spell_slots_exclusive_assignment_check` (`:569-572`), whose text correlates the two spell ids and nothing else. Precondition 1's table widened to five columns; the revive question added as a third blocking ruling with its (a)/(b)/(c) options and its representation stated; precondition 2 step 1 replaced with the ten-column audit query; a new named CHECK `spell_slots_acquired_level_requires_selection_check` added to the DDL step; the `SlotLifecycle` sketch's `active` arm annotated as unresolved; §2.9's enforcement table corrected — ASSIGNMENT is **partly** enforced, not fully |
| R2-3 | HIGH | R5's per-table registry omits `wizard_spellbook_entries`, which stores `orphan_reason_code` and whose writer emits both canonical literals | **ACCEPTED — fully; R5 stage 1 re-scoped** | Verified: column at `character.ts:842` (`orphaned_at` `:843`); `UPDATE wizard_spellbook_entries … orphan_reason_code = 'rule_no_longer_active'` at `grant-rule-slot-generator.ts:813` and `= 'parent_rule_removed'` at `:925`; state enum is two members (`spellbookAcquisitionStates`, `enums.ts:128`); the table has `_state_check` (`:891`) and `_selection_eligibility_check` (`:895`) and **no** reason CHECK. §2.10's table split into four rows with the table each vocabulary governs; a paragraph recording that this table has **no** read boundary at all (only `rows.ts:935` `sqlText`; no reader in `src/` selects the column); R5 gains `WIZARD_SPELLBOOK_ORPHAN_REASONS`/`WizardSpellbookOrphanReason` and a four-item scope block — subset, created type/read boundary, data audit, `oneOf` CHECK — with migration cost restated as four tables |
| R2-4 | MED | R6's "`slot_key` is never read back apart" is false — the backup remapper rewrites its uuid prefix | **ACCEPTED — fully; deletion added to R6's scope** | Verified: `remappedSlotKey(value, oldUuid, newUuid)` at `character-backup.ts:2530`, called at `:3093` (restore) and `:3681` (save-point rehydrate). R6 gains **correction 3**: replace both call sites with `slotKey(slotLocator(row), newUuid)` built from normalized columns and **delete `remappedSlotKey`**; a note that the restore path holds a raw `BackupRow` so the locator must be built from its `rule_key`/`ordinal` (the key's segments are `${instanceUuid}:${ruleKey}:${ordinal}`, `grant-rule-slot-generator.ts:732` — `source_instance_id` is not in the string); a note that this *widens* what restore handles (colon-bearing rule keys), so D8 is unaffected; the original sentence retained as the post-lane state rather than the current one. §6 item 4 re-sized to Small–medium |
| R2-5 | MED | R3 records only the class-side unsafe cast; the feat branch has the identical one | **ACCEPTED — fully; both recorded** | Verified: `} as unknown as ClassContentAggregateV1;` at `source-catalog-records.ts:809` and `} as unknown as FeatContentAggregateV1;` at `:819`, same `switch`, same shape. Both listed in R3's bound with the explicit statement that **both must go** for the drift-detection claim, since the two aggregates behind them are exactly the two R3 composes fragments into; the species cast at `:829` named for completeness and excluded from the claim; both added to R3's **Touches** |
| R2-6 | LOW | R1's "derive the five arrays" is inconsistent with a lane that deletes one of the five | **ACCEPTED — fully; wording fixed in three places** | Verified: five arrays at `enums.ts:705`, `:739`, `:832`, `:842`, `:859`; the fifth is `speciesTemplateEffectKinds`, which the owner's wide ruling deletes. R1's **Change** now says four derived plus deletion of the species-specific fifth and names all five; **Touches** (design line ~712 region) restated the same way; the ruling paragraph (~724 region) says explicitly that this deletion is what makes the count four. §6 item 2 matches |

**Nothing was rejected in round 2 either.** Three findings (R2-1, R2-3, R2-4)
grow accepted lanes rather than correcting prose, and R2-1 grows the largest
lane in the document; each is reflected in §6's sizes so the sequencing table
and the lane bodies agree. **No owner ruling was weakened by any of them** —
D235 stands (R2-1 in fact strengthens its write-side half by naming DDL as the
obligation that reaches import), the wide effect-kind ruling stands and is what
R2-6 makes the wording consistent with, and the owner-approved small-lane set
(R1 + R3 + R4 + R6) still holds §6 items 1–4 despite R6 and R3 both growing.

### Two claims this document cannot verify

- **The line count.** The reviewer reported the draft as 814 lines "in the
  current working tree, not 806". Neither figure appears in the document — no
  line-count claim was ever made in it, so there is nothing to correct. For the
  record: the draft measured 822 lines at the time this revision began, which
  means the reviewer read an earlier state (the D235 status block and the
  owner's wide ruling landed between the review's read and this revision). The
  revised document's own length is stated in the report accompanying it, not
  here, so that this line does not have to be maintained.
- **Every Foundry claim.** Unchanged from §1: these come from the pre-digested
  study of system 5.3.3. The reviewer independently confirmed ScaleValue's five
  types against the upstream 5.3.x source, which is one Foundry claim now
  corroborated; the rest are not, and §3.5's two defects remain *apparent from
  reading*, not reproduced.


### Round-3 disposition (final round, cap reached)

One HIGH remained: precondition 2b was scoped to combinations "the audit finds
in old documents," which is not total — an unobserved backup may contain any
combination the independent nullable columns ever admitted, and after the DDL
such a document would fail at the raw restore INSERT, violating D8. **FIXED by
adopting the reviewer's own prescription verbatim** into precondition 2b: a
total normalization mapping over every legacy-schema-valid ten-column
combination per supported backup version; owner rulings for ambiguous
combinations (never inferred from fixtures); exhaustive matrix tests proving
every legacy-valid input normalizes to a CHECK-satisfying row without losing
selection or provenance; data audits retained as live-migration gates only.
The reviewer confirmed all six round-2 amendments genuinely present. Review
closed at the three-round cap with this transcription as the final change.
