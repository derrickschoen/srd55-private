# Homebrew authoring forms for species, subclasses, and backgrounds

## Revision 2

- **HF-1 — align publishing with the r3 trivial self-match.** A byte-identical
  derived-primary self-match with no metadata conflict is dialog-free, writes no
  adoption receipt, discloses the matched existing aggregate in the publish
  result, and deletes the draft only with the install transaction's commit.
  Alias, compatible-fingerprint, SRD-fallback, and metadata-conflict adoptions
  remain review-required.
- **HF-2 — refresh identity citations.** Every identity-plan reference below is
  resolved against revision 3 at commit
  `0e2f599800abb56eeec31aaadb960e0c82b05dde`. Tree-code citations continue to
  describe baseline `b9a53e905cf580d2ca3179f662246a0f7d17ac7e`.

Baseline: `b9a53e905cf580d2ca3179f662246a0f7d17ac7e`.

Binding law: **D103** (v1 ships in-app authoring forms for species, subclasses,
and backgrounds; classes remain SRD-only; authored content is homebrew-marked,
uses D82 derived identity on export, and expresses every numeric mechanic through
the one effect vocabulary), **D102** (languages and tools are not mechanically
modelled in v1), **D82** (one derived-identity rule for imports, forks, and
hand-authored content; non-trivial adoptions are reviewed with Match as the
default and Clone as a renamed derived copy, while an exact derived-primary
self-match is identity resolution rather than a choice), **D84** (bundled SRD
keeps its stable key and fingerprints only as a fallback), **D81** (full
character JSON carries non-SRD definitions), **D72** (effects are the one numeric
vocabulary), D12/Q4 (known values plus passthrough for user-authored content),
D33 (unknown or unsupported mechanics are stated, never guessed), D41 (wire
versions are immutable), D46 (share links stay reference-only), D60 (pre-alpha
replacement is allowed, user data loss is not).

This plan owns the authoring product and its integration with the identity work.
It does **not** duplicate the content-derived identity kernel, immutable
installer, D82 review-required-adoption dialog, dialog-free trivial self-match,
or full-content export already designed in
`docs/design/2026-07-30-content-identity.md`. Where that plan calls all-kind
authoring one dispatch (`CI-7`), this plan replaces that sizing with the
concrete species/subclass/background work in §11.

## 0. What is true now, each read rather than recalled

- **There is no authoring screen or published-content editor in HEAD.** Screens
  are discovered only from `src/ui/screens/**/screen.ts`
  (`src/ui/app.ts:33-35`); the existing catalog UI is a JSON file input whose
  controller immediately calls the catalog importer
  (`src/ui/screens/character-list/import-backup-controls.ts:97-104,260-272`).
  D103 adds a new product surface, not fields on an existing form.
- **The identity design is drafted but not implemented.** Its v1 external key is
  `<edition>:content.v1:<sha256>` (`docs/design/2026-07-30-content-identity.md:
  436-459`), its registry separates `catalog_layer`, `key_kind`, and fingerprints
  (`:486-541`), and its immutable authoring boundary says UUID-addressed drafts
  publish through the common projector/installer while editing creates a new
  draft and key (`:757-772`). The complete schema exported by
  `db/schema/index.ts:16-27` contains no identity or draft module yet. This plan
  therefore depends on the identity foundation; it cannot mark a row homebrew or
  promise a derived export merely by choosing a key-looking string.
- **Species and backgrounds are split aggregates.** `species_definitions` and
  `background_definitions` carry `content_key`, name, edition, typed grant JSON,
  and source metadata (`db/schema/catalog-sources.ts:80-133`).
  `species_templates` separately carries the copyable creature type, size(s),
  speed, and name (`db/schema/origins.ts:139-220`);
  `background_templates` separately carries three ability labels, an Origin feat
  label, two skill labels, tool reference text, and both printed equipment
  descriptions (`db/schema/origins.ts:1077-1145`). The identity plan already
  requires each definition/template pair to be one aggregate with one registry
  key (`docs/design/2026-07-30-content-identity.md:86-92,530-533`).
- **The current species template graph is root → ordered traits → ordered
  effects.** Traits carry only name, description, and order
  (`db/schema/origins.ts:242-290`). `species_template_trait_effects` currently
  carries `effect_kind`, `damage_type`, flat/per-level HP, speed, AC formula
  base/abilities/shield permission, and weapon scope
  (`db/schema/origins.ts:319-393`), with kind/payload checks
  (`:394-520`). Its effective authorable vocabulary is narrower than the
  character effect vocabulary: damage resistance, HP, speed, and AC formula;
  `ability_increase` is explicitly refused (`:497-509`).
- **The current background template graph has structured equipment but no effect
  child.** Each equipment row belongs to option A or B and carries order,
  quantity, printed name, a `gear | weapon | armor` discriminator, and exactly
  the matching nullable catalog reference (`db/schema/origins.ts:1185-1278`).
  There is no `background_template_effects` table. The guided apply manufactures
  background ability-increase effects directly from the player's choices
  (`src/builder/guided-creation.ts:1584-1615`); that is character choice state,
  not an authorable template effect.
- **Subclass content is a live catalog aggregate, not a severed value copy.**
  `subclass_definitions` carries parent class, name, edition, optional
  spellcasting/caster fields, and grant rules
  (`db/schema/catalog-classes.ts:289-324`).
  `subclass_progressions` carries one optional row per class level with cantrips,
  prepared count, maximum spell level, slot JSON, and grant-rule JSON
  (`:326-367`). Features carry a required class level 1–20, global printed order,
  name, and description (`:425-474`); each feature has an ordered list of effects
  (`:476-504`).
- **Subclass spellcasting rows have real consumers, although the current catalog
  document cannot author them.** The report reads the chosen subclass's caster
  fraction/rounding and exact-level progression, then uses its prepared count,
  maximum spell level, and slot table
  (`src/reports/build-report-builder.ts:505-575`). The grant reader accumulates
  subclass definition and progression grant rules through the character's class
  level (`src/grants/source-rule-reader.ts:309-354`), and spell access resolves
  the subclass's spellcasting ability (`src/access/spell-access-builder.ts:
  622-652`). The missing piece is therefore a typed authoring/import document
  and validation, not a new rules interpretation.
- **Historical baseline (superseded by D216/D222).** At this design's date the
  bundled subclass-progression key set was exactly EK and AT, and the boot guard required 20
  progression rows for each (`src/rules/class-progression-lookup.ts:180-257`).
  Their shared seeder loops from level 1 through `PROGRESSION_LEVELS`, and both
  definitions call it (`:610-684`). Thus CI-3s can project the current bundled
  spellcasting subclasses through the 20-level `override` arm; density is a
  proved baseline fact, not inferred from the schema's optional FK child. The
  current seed has no bundled subclass progression rows; the optional
  bundled-homebrew Spell Student now owns this authoring/runtime seam.
- **The three class-feature effect tables now share the complete payload shape.**
  `featureEffectColumns()` contains effect kind, damage/HP/speed,
  ability/amount/maximum, AC formula, weapon scope, and attack count
  (`db/schema/catalog-classes.ts:44-62`); `featureEffectChecks()` enforces every
  kind/payload pairing and range (`:65-173`).
  `subclass_feature_effects` is the authorable subclass child
  (`:476-504`); `named_feature_effects` belongs to optional base-class features
  and is never auto-copied (`:596-624`); `class_feature_effects` belongs to
  automatic base-class features and is copied at the applicable class level
  (`:626-659`). D103 leaves the latter two SRD-only because classes are not
  authorable; sharing their payload helper does not make them form targets.
- **There are nine character effect kinds in this baseline, while feature
  templates add `extra_attack`.** `characterEffectKinds` is the four original
  kinds plus AC bonus/formula, attack-ability override, weapon attack bonus, and
  weapon damage bonus (`src/domain/enums.ts:683-734`).
  `featureTemplateEffectKinds` adds `extra_attack`
  (`src/domain/enums.ts:818-831`). The form mapping must derive from these closed
  unions; copying the nine/ten names into a second UI-only enum would violate
  D72 as soon as either list changes.
- **Generated character effects already carry template identity.** Species copy
  turns an effect id into
  `species_template_trait_effects:<id>` (`src/rules/origins.ts:241-260`), and the
  guided apply writes that `template_ref` plus the species source instance into
  `character_effects` (`src/builder/guided-creation.ts:1111-1149`).
  Class/subclass synchronization writes
  `class_feature_effects:<id>` or `subclass_feature_effects:<id>` and deletes
  only generated rows whose `template_ref` is non-null
  (`src/rules/generated-feature-effects.ts:74-149,151-192`). Manual effects and
  level-up ASIs therefore survive a generated-effect refresh.
- **`add_source` requires the definition half and throws when it is absent.**
  It derives the definition table from source type, selects the requested id,
  and raises “Unknown source definition” for no row
  (`src/commands/add-source.ts:138-151`), then writes a live source instance and
  runs the grant generator (`:170-195`). Publishing only a species/background
  template would consequently produce a card that cannot participate in the
  source/grant machinery. Definition and template halves must install atomically.
- **The guided species/background flows deliberately refuse external content
  today.** Option queries intersect template keys with hard-coded bundled key
  sets (`src/builder/guided-creation.ts:777-834`), and both apply gates reject a
  key outside those sets before reading the template
  (`:836-921`). D103 requires replacing those gates with catalog-layer-aware
  resolution for species/backgrounds while retaining the bundled-only class gate.
- **The existing consumers already differ in the way D103 needs.** Species apply
  replaces the copied species, traits, generated effects, and its marked source
  tree in one transaction (`src/builder/guided-creation.ts:923-1158`).
  Background choice apply replaces the copied background, source, ability
  contributions, skills, and Origin-feat child in one transaction
  (`:1458-1647`). Subclass selection lists every definition belonging to the
  chosen class (`src/queries/character-workspace-builder.ts:354-376`) and
  synchronizes its live source and eligible generated effects
  (`src/commands/update-class.ts:156-265`). The authoring integration should
  generalize these paths, not build three parallel character writers.
- **Current portable character JSON cannot satisfy D103 by itself.** Its shape
  carries character tables, six reference sets, and complete definitions only
  for selected external spells (`src/backup/character-backup.ts:91-112,
  1384-1494`). The identity plan replaces that with a v3 `content` manifest and
  fingerprints species/background definition+template aggregates and the
  subclass feature graph (`docs/design/2026-07-30-content-identity.md:
  394-406,776-823`). D103 uses that path; it does not add a second homebrew
  export format.
- **The present schema forbids several values an authoring form must preserve.**
  Species template creature type and sizes are CHECK-constrained to known SRD
  sets (`db/schema/origins.ts:151-165,195-207`), and the shared feature-effect
  helper CHECK-constrains damage type (`db/schema/catalog-classes.ts:65-72`).
  Those constraints were safe for seeder-only tables. Once a user can publish
  “Clockwork” or “Void”, keeping them is the D12 closed-enum data-loss bug.
- **D102 does not delete reference prose already stored.** Background tool
  proficiency is currently plain text (`db/schema/origins.ts:1107-1112`) and
  the guided screen describes it as unapplied (`src/ui/screens/guided-builder/
  background-step.ts:93-107`). The authoring form may preserve a “tool text
  (reference only)” field, but it must not create a tool id, choice, proficiency
  row, effect kind, or sheet number. There is no language field to add.

## 1. The product boundary

Add a **Homebrew library** at `/homebrew`, reachable from the character list and
planner. It has tabs for Species, Subclasses, and Backgrounds, plus Drafts.
Bundled content may be viewed to understand available fields but cannot be edited
in place. “Make a homebrew copy” starts a draft; direct “New” starts an empty
draft. Classes appear only as selectable parent/reference content and never get
New, Copy, or Edit actions.

The lifecycle is:

```text
new/copy/edit published
        ↓
local UUID draft (incomplete is allowed)
        ↓ Save draft
validated publish preview
        ↓ identity resolution
new install OR dialog-free derived-primary self-match
            OR D82 review-required adoption
        ↓ install transaction commits
resolved immutable aggregate + authoritative key/layer
        ↓
available in character flows and complete JSON export
```

An authored aggregate is “homebrew” because the identity registry says
`catalog_layer = 'external'`, not because its key happens to match a grammar and
not because three root tables each grow an `is_homebrew` boolean. Every library
row, picker option, character source label, and usage preview derives one
consistent badge from that registry. A draft has a “Draft” badge, never a
“Homebrew” badge implying it is usable content.

Publishing is the only transition into the catalog. There is no “save directly
to template tables,” no SQL-shaped advanced editor, no raw JSON textarea, and no
published-row update command. A form may be incomplete while it is a draft; a
published aggregate satisfies every database and semantic invariant.

## 2. Drafts, DTOs, and the publish boundary

### 2.1 One persistent draft envelope

Add:

```text
catalog_content_drafts
  draft_uuid          TEXT PRIMARY KEY
  content_kind        'species' | 'subclass' | 'background'
  document_version    integer >= 1
  base_content_key    nullable registry content key
  revision            integer >= 0
  document_json       TEXT NOT NULL
  created_at
  updated_at
```

`base_content_key` means “this draft began from this immutable aggregate”; it is
history/UI context, not ancestry in the fingerprint. A direct new draft has null.
It references the identity registry with `ON DELETE RESTRICT`; published content
is not physically deleted while a draft or character refers to it.

The JSON column stores an **incomplete editor state**, not catalog truth. This is
the right boundary for a generic draft table: a half-written feature may
temporarily lack its name, and forcing that state through the published tables
would either weaken their constraints or require three parallel families of
nullable draft tables. Every save passes a closed, size-limited discriminated
draft codec; every publish additionally converts to a stricter semantic DTO and
runs the same projector validation as import/export. Unknown JSON fields are
refused, not dropped.

Draft codecs are versioned per `content_kind`. Load decodes with the stored
version and runs explicit, pure migrations to the current editor shape before
the next save; migrations preserve every old field or fail without changing the
stored bytes. A database opened by an older build that does not know a newer
version shows “upgrade required” and permits a raw recovery download, but cannot
save over it. Draft schema evolution therefore cannot turn strict decoding into
silent draft loss.

Draft writes use `expected_revision` and increment atomically. A stale tab gets a
structured conflict and never overwrites the other tab. Explicit **Save draft**
is the durability boundary; navigation with unsaved local changes prompts.
Deleting a draft is allowed after confirmation because it has never been
published or referenced. A whole-database image necessarily preserves drafts;
portable character JSON, catalog content documents, and share links omit them.

### 2.2 The closed authored union

Use a discriminated union:

```ts
type HomebrewDraft =
  | SpeciesAuthoringDraft
  | SubclassAuthoringDraft
  | BackgroundAuthoringDraft;

type PublishableHomebrew =
  | SpeciesContentAggregate
  | SubclassContentAggregate
  | BackgroundContentAggregate;
```

The publishable types are the same semantic DTOs the D82 projectors and complete
export consume. The forms do not define a parallel “UI model” whose defaults can
drift from identity. Draft-to-publish conversion:

1. trims only fields whose semantic codec says whitespace is non-significant;
2. converts ordered UI arrays to 1-based `sort_order`;
3. resolves parent/reference keys to content fingerprints, never database ids;
4. validates every grant and effect discriminant exhaustively;
5. canonicalizes through the current fingerprint projector;
6. calls `planContentImport`/`commitContentImport` with the stale-plan token on
   every path, but opens the D82 dialog only for review-required alias,
   compatible-fingerprint, SRD fingerprint fallback, or metadata-conflict
   adoptions; a byte-identical derived-primary self-match with no metadata
   conflict is dialog-free;
7. reports whether it created content or matched an existing named aggregate,
   and deletes the draft only when the install transaction commits.

Canceling or failing review leaves the draft intact. A reviewed **Match** may
produce no new external aggregate and writes the D82 receipt for that actual
choice. A trivial self-match also produces no new aggregate, but writes no
receipt; §8 pins its mandatory matched-existing result and badge.

### 2.3 Authoring commands are catalog commands

Add a typed client/RPC module rather than routing catalog writes through the
character command executor:

- `authoring.list` — published external entries and drafts;
- `authoring.createDraft`;
- `authoring.readDraft`;
- `authoring.saveDraft`;
- `authoring.discardDraft`;
- `authoring.previewPublish`;
- `authoring.commitPublish`;
- `authoring.usages`;
- `authoring.previewReplacement`;
- `authoring.commitReplacement`.

Every validator requires exact keys and applies shared string/list/count limits.
Publish previews return opaque tokens bound to draft revision, canonical bytes,
and candidate identities. Replacement previews separately bind old/new keys and
the one target character's observed revision. Commits re-read their respective
facts and refuse stale state. The UI blocks repeat submit, but command idempotency
and transactions remain the correctness boundary.

## 3. One effect editor, not numeric side channels

### 3.1 Typed effect inputs

Define one exhaustive authoring registry keyed by the domain effect unions:

```ts
const CHARACTER_EFFECT_FORM:
  Record<CharacterEffectKind, EffectFormDefinition> = { /* exhaustive */ };

const FEATURE_ONLY_EFFECT_FORM:
  Record<Exclude<FeatureTemplateEffectKind, CharacterEffectKind>,
         EffectFormDefinition> = { /* extra_attack */ };
```

It renders exactly the fields the selected kind owns:

| effect kind | form fields |
|---|---|
| `damage_resistance` | required damage type: known suggestions plus custom text |
| `hp_modifier` | flat HP and/or HP per character level; at least one required |
| `speed` | signed feet bonus |
| `ability_increase` | ability, signed amount, maximum 1–30 |
| `armor_class_bonus` | signed non-zero amount |
| `armor_class_formula` | positive base, first ability, optional second ability, allows shield |
| `attack_ability_override` | ability, weapon scope |
| `weapon_attack_bonus` | signed non-zero amount, weapon scope |
| `weapon_damage_bonus` | signed non-zero amount, weapon scope |
| `extra_attack` (subclass features only) | total attacks ≥2, weapon scope |

If D83 or another effect kind lands before this work, the `Record` stops
compiling until its form, DTO arm, copy/generation behavior, fingerprint fields,
and controls exist. The list above describes baseline `b9a53e9`; it is not a
frozen second vocabulary.

Every v1 authored effect payload is fully resolved in the template. In
particular, the form cannot publish the null damage type used by today's bundled
“choice not yet modelled” resistance rows. A future effect choice requires a
typed durable character-choice row, export/import support, and reconciliation
that replays that row before its form arm can compile. The draft does not hide a
character-specific resolved value inside a generated effect row.

The form contains no generic “numeric bonus”, “AC modifier”, “damage modifier”,
or “other amount” input. Prose may describe an unsupported rule, but prose never
feeds a number. Each effect card shows a plain-language preview of the structured
mechanic and identifies mechanics the current engine cannot apply (for example,
`one_bonded_weapon` while no weapon is bound) using the existing D33 disclosure.

### 3.2 Storage alignment and homebrew passthrough

Refactor the current column/check helper into:

- a common payload column set;
- common kind/payload/range checks;
- a per-table policy for values that are known-set-plus-passthrough.

`subclass_feature_effects` becomes open for authored damage types.
`named_feature_effects` and `class_feature_effects` stay SRD-only and may retain
their known-value CHECK. `species_template_trait_effects` gains the missing
character-effect payload columns (`ability`, `amount`, `maximum`) and accepts all
`CharacterEffectKind` arms now that the copy has a real species source instance.
Add `background_template_effects`, ordered directly under
`background_templates`, with the same character-effect payload.

Species template `creature_type`, `size`, and `alternate_size` become open string
types with known-value suggestions in the UI and no closed CHECK. Damage type on
authorable effect tables follows the same rule. Edition, abilities, weapon scope,
effect kind, class level, and true mechanical bounded sets remain closed.

Open mechanical strings are branded and stored byte-for-byte per D38, then
canonicalized as exact NFC strings for identity; case and internal whitespace
remain significant. `Void` and `void` are intentionally different mechanics and
different fingerprints, and the UI displays their exact spelling. Known
suggestions insert the canonical known spelling but never case-fold an authored
passthrough. Frozen vectors pin this rule so a later “helpful” normalization
cannot silently merge homebrew values.

The D82 projector inventory is amended **before `content-v1` freezes**:

- species includes the widened ordered trait/effect graph;
- background includes the new ordered effect graph;
- subclass includes every effect arm, including multiple effects per feature.

The subclass projector also has a closed progression union:

- `inherit_parent` means there are no subclass progression rows. It remains
  distinct because the report falls back to the parent class's exact-level row.
- `override` requires exactly 20 rows, one for every class level, and projects
  the dense schedule. A partial 1–19-row graph is not guessed into either arm;
  a pre-existing one follows D82's `legacy-opaque` preservation path until an
  explicit edit can publish a complete replacement.

> Superseded by D205/0034: `legacy-opaque` no longer exists.

CI-3a uses that same projection for stored bundled/external rows and HA-5 uses it
for authored DTOs. CI-3s therefore fingerprints a bundled spellcasting subclass
from the same dense semantic schedule an authored copy produces. Absence is
never normalized to a dense row of zeroes: on a caster parent those programs
have different runtime behavior.

If `content-v1` has already frozen when one of these semantic fields lands, the
identity plan's own evolution rule requires `content-v2`; no dispatch silently
adds the field to v1 (`docs/design/2026-07-30-content-identity.md:461-480`).

## 4. Species form and application

The species form has:

- name and rules edition;
- creature type (known suggestions + custom);
- primary size and optional alternate size (known suggestions + custom);
- positive walking speed in feet;
- ordered trait cards, each with name, description, and zero or more effect
  cards from `CharacterEffectKind`;
- structured supported grants: fixed spells, spell-list/query choices, and skill
  proficiency choices, expressed through typed controls that compile to existing
  `GrantRule` DTOs;
- reference prose for mechanics outside the current vocabularies.

There is no raw `grant_rules` editor. Configuration-gated lineage systems are not
smuggled in as arbitrary `active_if_config` JSON because the character UI cannot
render an arbitrary authored choice. V1 may author unconditional grants and
effects; a more elaborate sub-choice is described in trait prose and disclosed
as unapplied until a typed choice vocabulary exists. This is a truthful limit,
not a guessed generic form.

Publishing atomically installs:

1. one external registry identity/fingerprint;
2. one `species_definitions` row;
3. one `species_templates` row with the same content key;
4. ordered traits and effects;
5. typed grant JSON on the definition.

Generalize `listGuidedOriginOptions` and the species apply gate to resolve every
installed species aggregate. Bundled entries keep their stable key and badge;
external entries use their derived key and “Homebrew” badge. The apply path stays
one transaction and keeps the existing value-copy/source split:

- copy root values and traits;
- copy template effects with `template_ref` and the species source instance;
- run the existing grant generator for the definition;
- rebuild the same skill projection;
- never retain a live species-template id on character value rows.

The built-in `SPECIES_UNMADE_CHOICES` and lineage disclosures remain keyed only
to bundled content. An authored species does not inherit a warning because its
display name resembles Elf; only structured authored grants/effects apply, and
its prose remains visible.

## 5. Background form and application

The background form has:

- name and rules edition;
- exactly three suggested ability choices, selected from the six abilities;
- a default Origin feat selected by content key, not by matching display text;
- exactly two skill proficiencies selected from the closed skill vocabulary;
- optional **tool reference text (not mechanically applied)**;
- printed option-A and option-B descriptions;
- an ordered list for each equipment option: positive quantity, printed item
  name, and `gear | weapon | armor`; weapon/armor selection stores a catalog
  reference while custom gear remains text;
- zero or more background effect cards from `CharacterEffectKind`;
- reference prose for unmodelled mechanics.

There is no language control and no structured tool control. The tool text is
printed/reference-only and never becomes a proficiency. Equipment selectors list
bundled and external equipment definitions through D82 identity; a missing or
ambiguous reference prevents publish rather than degrading to a name match.

`ability_increase` remains available because D103 requires the one effect
vocabulary, not a background-specific numeric blacklist. It is an explicit,
additional sourced effect and intentionally stacks with the standard background
allocation; the publish and apply previews show both contributions and their
total. The three suggested abilities themselves never create a fixed increase.
Thus a homebrew author can state an unusual extra increase, but only through the
same typed, capped `ability_increase` mechanic every other source uses—never
through a hidden bonus field.

Publishing installs definition, template, equipment children, and new
`background_template_effects` in one transaction. The default feat compiles to
the existing typed source grant; skills and standard background ability choices
continue through their existing dedicated character mechanisms. Static authored
effects are additional template declarations and are copied with
`background_template_effects:<id>` under the background source.

Generalize the guided background option and apply queries to installed
backgrounds. The current UI rule remains: the authored three abilities and feat
are marked defaults, not constraints. Applying one still requires the player to
choose the standard +2/+1 or +1/+1/+1 distribution and an Origin feat; no
suggestion-derived numeric shortcut bypasses those choices. Any separate
authored `ability_increase` effect is visibly additional, sourced, and included
in the resolved-total preview. The existing equipment step reads the selected
background's structured packages by content key, so it must stop intersecting
with bundled-only key sets and display the layer badge.

## 6. Subclass form, including leveled feature editing

### 6.1 Parent and spellcasting sections

The subclass form has:

- name and rules edition;
- parent class selected by content key from installed **bundled classes only**;
- progression mode: inherit the parent, or override with an optional
  spellcasting ability and a typed progression preset;
- a 1–20 progression grid, visually collapsing unchanged runs, for cantrips
  known, prepared/known count, maximum spell level, slot counts, and typed
  spell-grant declarations;
- leveled feature editing from §6.2.

Classes remain SRD-only in both UI and validation. The backend rejects a parent
whose identity registry layer is external even if a malformed client submits it.
This is the D103 boundary, not a disabled button convention.

The form does not expose raw `caster_fraction`, `caster_rounding`, `slots`, or
`grant_rules` strings. A closed caster-contribution selector plus typed row model
produces only combinations accepted by `CasterContribution`; custom fraction or
rounding strings are refused. The runtime consumers are proved in §0. The
current catalog import explicitly admits only that its document cannot express
subclass spellcasting (`src/catalog/catalog-schema.ts:122-138`); HA-5 replaces
that document arm rather than treating the stored fields as inert.

An override publishes exactly 20 progression rows. The UI may show only change
points, but draft-to-semantic conversion expands them into a dense level 1–20
schedule before preview, because the report reads the exact current level. The
preview includes caster contribution, slot table, preparation ceiling, spell
grants, and spell attack/save values at boundary levels; end-to-end tests assert
every one of those existing consumers. Inherit-parent publishes no progression
rows and null subclass spellcasting fields, preserving the report's base-class
fallback rather than inventing zero-shaped JSON. On a non-caster parent, that is
the ordinary non-spellcasting subclass.

### 6.2 The leveled feature editor is a timeline

Pin the open leveled-editing question as follows:

- The screen shows a level 1–20 timeline, collapsed to levels containing content
  plus an “Add level” action.
- Each level owns an ordered list of feature cards.
- A feature card has name, description, and an ordered list of zero or more
  `FeatureTemplateEffectKind` cards.
- Moving a feature to another level changes its prerequisite level explicitly.
  Reordering changes order only within that level.
- Draft cards carry UUIDs for DOM/edit stability only. On publish, levels sort
  ascending, features retain within-level order, and the aggregate receives one
  dense global `sort_order`. UUIDs do not enter the fingerprint or catalog.
- The same feature name may recur at different levels to describe an upgrade.
  Replace `subclass_features_subclass_name_unique` with uniqueness on
  `(subclass_definition_id, class_level, name)`; duplicates at one level still
  refuse. This is necessary for “Feature X improves at level 6” without forcing
  two unrelated names.
- At least one feature is required for publish. Empty future levels are draft
  state and disappear from the semantic DTO.

This makes the fingerprint order deterministic and makes the runtime threshold
unchanged: subclass synchronization selects features whose `class_level <=` the
character's class level (`src/rules/generated-feature-effects.ts:165-192`).
`extra_attack` remains catalog-live through the existing feature reader; the
nine character effect kinds generate `character_effects`.

### 6.3 Consumption

The planner and level-up subclass selectors already filter by parent class rather
than bundled key. Add layer badges and derived keys to their option DTOs, retain
the composite class/subclass guard, and keep one sync path. An authored Fighter
subclass cannot be attached to Rogue; an authored subclass feature at level 14
cannot apply at Fighter 13.

## 7. Editing published content and propagation to characters

Pin the propagation question: **published content never mutates and edits never
propagate implicitly.**

“Edit” means:

1. copy the published semantic aggregate into a new UUID draft;
2. preserve `base_content_key` only as UI history;
3. publish the changed bytes under a new derived key;
4. leave the old aggregate and every character using it unchanged.

After publish, the result screen says how many characters still use the previous
key and offers **Review character replacements**. Nothing is preselected.
Replacement is a separate preview/commit operation:

- **Subclass:** atomically retarget both
  `character_class_levels.subclass_definition_id` and the active subclass source,
  then use the existing subclass synchronizer. Generated `template_ref` rows are
  replaced; manual effects survive.
- **Species:** atomically re-run the generalized species application for the new
  aggregate. The preview names root fields, traits, sourced effects, grants, and
  filled choices that will be replaced. Existing choices are preserved only
  when valid under the new aggregate; otherwise the preview requires explicit
  replacements before commit. The old copied values do not change until commit.
- **Background:** atomically re-run the generalized background choice apply. It
  preserves existing ability/feat/equipment choices only when they remain valid
  under the new aggregate; otherwise the preview requires new choices before
  commit. It lists ability contributions, skills, child feat, static effects,
  and equipment-package selection that will be replaced.

Replacement operates one character at a time in v1. Bulk “upgrade all” is
deliberately absent: copied origins can hold character-specific decisions, and a
single invalid choice must not either block unrelated characters or be guessed.
The replacement token binds old/new keys and character revision so a level-up or
other edit between preview and commit refuses with a fresh preview.

The old published aggregate remains installed while any character, saved
artifact, alias, match receipt, or draft refers to it. The library may mark it
“superseded by …” as local metadata, but does not delete or rewrite it. This is
versioning, not re-sync.

Portable import never trusts the numeric id suffix in a generated
`template_ref`: ids such as `subclass_feature_effects:17` are local to one
database. After CI-5 installs/remaps content and character sources, it omits the
incoming generated effect rows for these three authored kinds and invokes their
shared reconciliation functions. Those functions regenerate species,
background, and subclass effects from the installed aggregate under the remapped
source instance; manual rows whose `template_ref` is null are imported
unchanged. Authored effect payloads are fully resolved in the template under
§3.1; background allocation/feat/equipment and grant selections live in their
existing dedicated character rows and are remapped separately, never inferred
from a generated effect payload. The resulting refs therefore name
target-database child ids before the character becomes visible. A
complete-import transaction rolls back if reconciliation cannot resolve an
authored aggregate or any durable choice—it never preserves a plausible,
colliding foreign row id or drops a character choice.

## 8. Name collisions, D82 review, and the homebrew mark

Pin the SRD collision question with D82/D84's existing rules:

1. **Same normalized name, different semantic properties:** the fingerprints and
   derived keys differ. Remove/relax the current root name-uniqueness constraints
   as the identity plan already requires
   (`docs/design/2026-07-30-content-identity.md:543-546`). Both rows coexist.
   Pickers show `Name — SRD` and `Name — Homebrew` (and parent/edition where
   needed); display name is never the resolver.
2. **Byte-identical to an existing external aggregate, reached through its
   derived primary key, with no metadata conflict:** publishing silently resolves
   to that aggregate as r3's trivial self-match. It opens no modal and writes no
   receipt. The result says **“Matched existing content”**, names the matched
   aggregate, and shows its Homebrew badge. Draft deletion is bound to the
   install transaction commit: failure or rollback retains the draft. Later
   identical publishes converge without a receipt because the identity function
   derives the same primary key and bytes
   (`docs/design/2026-07-30-content-identity.md:630-640,660-736,757-772`).
3. **Same normalized name and same semantic properties as bundled SRD:** the SRD
   stable key wins through fingerprint fallback. This remains review-required:
   the review row's reason is exactly **“SRD fingerprint fallback”**, one of
   r3's four review reasons alongside alias, compatible fingerprint, and metadata
   conflict. Choosing Match deletes the draft only with the install transaction
   that adopts the bundled row and records the reviewed choice. The result is
   **SRD, not homebrew**, because no authored aggregate was created
   (`docs/design/2026-07-30-content-identity.md:672-725,998-1020`).
4. **Clone instead:** the author supplies a different normalized name (prefilled
   “(Private copy)”), the semantic envelope changes, and a new derived external
   key is produced. No hidden salt, author namespace, or random published id is
   allowed (`docs/design/2026-07-30-content-identity.md:683-690,992-996`).

Thus “authored content is homebrew-marked” means every successfully newly
published authored aggregate is registry-layer external. When a draft resolves
to existing content—whether by trivial self-match or reviewed Match—the result
uses the existing aggregate's registry layer rather than falsely preserving the
wording of the Publish button.

## 9. Validation, accessibility, and failure behavior

- Draft forms use real `<form>`, `<fieldset>`, `<legend>`, labels, error summaries,
  and focus the first invalid field after publish validation.
- Ordered lists have keyboard Move up/down controls; drag-and-drop may be added
  only as a second interaction.
- Every repeating card has a stable draft UUID and an accessible name including
  its level/order. Published ids and database ids never appear in control values
  when a content key is available.
- String and list limits are shared with portable content DTOs. The form cannot
  create content the complete export refuses.
- All user prose follows the existing hostile-string discipline: `textContent`
  or `freeTextSpan`, never `innerHTML`; it never enters structured machine facts.
- Publish validation reports every field path in one response. A raw SQLite
  constraint string is a backend defect, not expected UX.
- An unsupported mechanic stays prose with an explicit “not applied to sheet
  numbers” disclosure. The form never offers a numeric field whose consumer is
  absent.
- `commitContentImport`'s install transaction atomically resolves/installs
  content, writes a receipt only for an actually reviewed choice, and commits
  draft deletion. A trivial self-match takes the same transaction boundary with
  no receipt. Optional immediate replacement is separate: a failed replacement
  cannot roll back a valid publish or match, and leaves the old character
  untouched.
- Published content is not deletable in v1. This avoids orphaning characters and
  derived dependencies. Draft deletion is the only destructive library action.

## 10. Controls — each names the mutant it must kill

- **HA-DERIVED-PUBLISH — projector/installer.** Mutate publish to use the draft
  UUID or an author namespace as content key. Must fail: identical independently
  entered species on two fresh databases publish the same derived key, and no
  draft UUID appears in either portable aggregate.
- **HA-EXTERNAL-SELF-MATCH — r3 trivial resolution.** Publish an exact duplicate
  of installed external homebrew with no metadata conflict. Must fail if the
  mutation opens a modal, writes a receipt, or inserts a second registry/root/
  child row: the publish adds zero catalog or receipt rows, returns **“Matched
  existing content”** with the matched aggregate's name and Homebrew badge, and
  uses the existing local ids. Injecting a failure before the install transaction
  commits must retain the draft; only a successful commit deletes it. A later
  identical publish repeats this result without relying on remembered state.
- **HA-IMMUTABLE-EDIT — lifecycle.** Mutate Edit to update the installed root or a
  child row in place. Must fail: editing one trait publishes a new key; the old
  canonical bytes, fingerprint, and a character using them remain byte-for-byte
  unchanged.
- **HA-NO-IMPLICIT-PROPAGATION — usage fixture.** Mutate publish to retarget
  characters automatically. Must fail: zero characters change before an explicit
  replacement commit; the result reports the old-key usage count.
- **HA-REPLACEMENT-ATOMIC — replacement command.** Throw after deleting old
  generated effects but before copying new ones. Must fail: old subclass/species/
  background reference, copied values, choices, and effects all survive.
- **HA-REPLACEMENT-STALE — preview token.** Mutate replacement commit to ignore
  character revision. Must fail: a level-up between preview and commit refuses
  and recomputes the affected feature set.
- **HA-EFFECT-EXHAUSTIVE — type and runtime registry.** Remove one
  `CharacterEffectKind` form mapping or add a synthetic member without a mapping.
  Typecheck must fail. For runtime document mutation, an unknown kind is refused,
  never rendered as “Other.”
- **HA-ONE-VOCABULARY — DTO/schema.** Add a root `ac_bonus` or
  `hit_points_bonus` to a species/background/subclass draft and teach only the
  UI preview to use it. Must fail: the strict draft/publish codec rejects the
  field, and the installed aggregate can change numbers only through effect rows.
- **HA-KIND-PAYLOAD — effect codec.** Route `armor_class_bonus` through the HP
  amount field or omit `allows_shield` from a formula. Must fail before install
  with the exact effect-card path; direct database insertion still fails the
  named CHECK. An authored resistance with no damage type also fails the publish
  codec even though the legacy-compatible table can preserve such a bundled row.
- **HA-PASSTHROUGH — homebrew values.** Replace open authored value handling with
  the SRD enum check. Must fail: a species with creature type `Clockwork`, size
  `Colossal`, and resistance `Void` publishes, exports, imports, and applies with
  all three strings preserved. A frozen vector also proves `Void` and `void`
  remain distinct while a decomposed Unicode spelling and its NFC form produce
  the same canonical passthrough value without changing stored display bytes.
- **HA-SRD-COLLISION — D84/D82 resolution.** Mutate same-semantics SRD publish to
  insert external content silently. Must fail: preview says
  `SRD fingerprint fallback`; Match returns the stable bundled key and no external
  row; Clone requires a changed normalized name and returns a derived external
  key. A hand-authored duplicate of a bundled spellcasting subclass projects the
  same 20-level override vector and reaches that same fallback.
- **HA-PROGRESSION-MODE — subclass projector.** Normalize no progression rows to
  20 zero rows or let a partial schedule publish. Must fail: `inherit_parent` and
  a dense-zero `override` have different frozen bytes and different behavior on
  a caster parent; an override with 19 rows is refused/legacy-opaque, while a
  complete authored schedule and the same stored bundled schedule hash alike.
- **HA-SAME-NAME-DIFFERENT — uniqueness.** Restore name/edition uniqueness. Must
  fail: two same-named subclasses of the same parent with different feature
  mechanics coexist, remain selectable as distinct rows, and export distinctly.
- **HA-SUBCLASS-LEVELS — leveled editor/runtime.** Flatten every feature to level
  3 or order only by draft UUID. Must fail: one authored subclass with features
  at 3, 6, and 14 applies exactly the eligible effects at character levels 3, 6,
  13, and 14, and round-trips in level/within-level order.
- **HA-SUBCLASS-REPEATED-NAME — schema/form.** Restore uniqueness on feature name
  across the whole subclass. Must fail: `Aegis` at levels 3 and 14 publishes,
  while two `Aegis` rows at level 3 are refused before SQL.
- **HA-GUIDED-EXTERNAL — consumer cutover.** Restore the bundled-key intersection
  in either origin option query. Must fail: a newly published species and
  background appear with Homebrew badges, apply through their template/definition
  halves, and survive reload; the class chooser still refuses an external class.
- **HA-SUBCLASS-PARENT — parent guard.** Resolve a parent by display name or allow
  external class ids. Must fail: a Fighter homebrew subclass is absent from
  Rogue, cannot be submitted against Rogue, and the authoring backend rejects an
  external parent class.
- **HA-BACKGROUND-NO-SIDE-GRANTS — D102/D103.** Add language/tool proficiency ids
  or turn tool text into a grant. Must fail: the authored background preserves
  and prints hostile tool reference text but creates no tool/language row,
  choice, effect, or derived number.
- **HA-BACKGROUND-CHOICES — no author numeric bypass.** Apply the template's three
  abilities as fixed bonuses. Must fail: the player still chooses the standard
  +2/+1 or +1/+1/+1 allocation; template abilities are marked defaults, and all
  contributions use sourced `ability_increase` rows. A fixture with a separate
  authored `ability_increase` card proves that it stacks visibly as an additional
  sourced effect; deleting it or deriving it from the three suggestions also
  fails.
- **HA-DRAFT-CONFLICT — draft revision.** Save revision 3 from two tabs. Must
  fail: the first becomes revision 4, the second gets a structured stale-draft
  error, and revision 4 bytes remain.
- **HA-DRAFT-EVOLUTION — versioned draft codec.** Load a version-N draft after
  adding a field/effect arm in N+1. Must fail if the field disappears, defaults
  from runtime state, or the old bytes are overwritten on migration failure;
  the successful fixture migrates explicitly and the unknown-future fixture
  remains downloadable and unsaveable.
- **HA-PUBLISH-ROLLBACK — aggregate install.** Throw after definition insert but
  before template/effect children. Must fail: no registry, definition, template,
  child, review receipt, or draft deletion is committed.
- **HA-EXPORT-DERIVED — complete JSON.** Omit one published authored aggregate or
  emit a draft. Must fail: full character JSON contains every external aggregate
  transitively referenced by that character under its verified derived identity,
  excludes an installed but unreferenced homebrew aggregate, and contains no
  drafts; a fresh database imports it through D82 and reproduces mechanics.
  Every regenerated non-null `template_ref` resolves to the correct
  target-database child row even when its source id collides with an unrelated
  target row; manual null-ref effects and dedicated character-choice rows remain
  byte-equivalent. The share fixture remains reference-only.
- **HA-HOMEBREW-BADGE — registry layer.** Infer the badge from key grammar or
  leave it off one consumer. Must fail across library, guided options, subclass
  picker, and character source label: external is Homebrew, bundled is SRD, and
  an SRD Match result is never Homebrew.

Mutation controls that require the identity kernel land with that kernel's
dispatches, not as mocks that regenerate expected fingerprints from production
output. Frozen canonical vectors remain hand-pinned independently, per the
content-identity plan.

## 11. Dispatches and dependency order

This is not “three forms.” It adds durable incomplete drafts, widens two catalog
graphs, adds a third effect graph, replaces bundled-only origin gates, supports a
levelled subclass editor, and builds explicit version replacement over copied and
live-reference character models.

Identity-plan dependencies retain their CI names:

- `CI-1`, `CI-2a`, and `CI-2b` provide canonical identity, registries, resolver,
  and code-data migration infrastructure.
- `CI-3a` provides the subclass projector/immutable installer and consumes
  HA-1's final feature/effect shape.
- `CI-3b` provides species/background two-half projectors/installers and consumes
  HA-1's final origin/effect shapes.
- `CI-3s` and `CI-4a` provide bundled fingerprints, review-required D82
  adoptions, and the dialog-free derived-primary self-match.
- `CI-5` carries installed external aggregates in complete character JSON.
- The old `CI-7` “authoring immutability across nine kinds” is reduced to common
  lifecycle primitives used here; it no longer claims these three forms are one
  L-sized dispatch.

Authoring dispatches:

1. **HA-0 — M: authoring contracts and seams.** Closed draft/publish unions,
   shared limits, RPC names, structured errors, effect-form registry types,
   distinct publish/replacement token facts, usage/replacement plan shapes, and
   compile-time exhaustiveness probes. No UI and no catalog writes.
2. **HA-1 — L: authorable effect storage and fingerprint inventory.** Split
   effect helpers by value policy; open authored passthrough values; widen species
   effect payload/vocabulary; add `background_template_effects`; relax subclass
   repeated-name uniqueness by level; pin exact passthrough canonicalization and
   the subclass inherit/20-level-override union; finalize the three projector
   contracts and hand-pinned vectors that CI-3a/CI-3b implement before
   `content-v1`. Migration, row contracts, relations, snapshot/whole-database
   tests, and direct CHECK tests included.
3. **HA-2 — L: durable draft store and catalog authoring service.**
   `catalog_content_drafts`, per-kind document versions and migrations, strict
   incomplete codecs, revision conflicts, create/read/save/discard,
   copy-from-published, unknown-future recovery, and no portable-draft leakage.
   Depends on HA-0 and identity registry.
4. **HA-3 — XL: species backend.** Draft-to-semantic validation, typed supported
   grant cards, atomic definition/template/trait/effect install through the
   common publisher, projector vectors, and generalized species application.
   Includes HA-PASSTHROUGH, refusal of unresolved authored effect payloads, and
   generated `template_ref` proof. Exit also requires HA-EXTERNAL-SELF-MATCH for
   a byte-identical installed external species.
5. **HA-4 — XL: background backend.** Definition/template/equipment/effect
   aggregate, reference resolution, typed default feat/skills, generalized
   choice/equipment application, D102 boundary, projector vectors, and full
   rollback fixtures. Exit also requires HA-EXTERNAL-SELF-MATCH for a
   byte-identical installed external background.
6. **HA-5 — XL: subclass backend.** Bundled parent validation, typed
   spellcasting/progression builder with dense 20-level materialization, leveled
   features with multiple effects, immutable install, projector vectors, and
   end-to-end report/grant/spell-access plus feature-threshold proofs. This is XL
   because progressions and grant rules are executable mechanics, not form
   decoration. Exit also requires HA-EXTERNAL-SELF-MATCH for a byte-identical
   installed external subclass.
7. **HA-6 — L: Homebrew library and shared form components.** Route/screen,
   library tabs/badges, draft navigation/conflict UX, ordered-card controls,
   exhaustive effect cards, common validation summary, hostile-string tests.
8. **HA-7 — L: species form.** Root fields, known-plus-custom controls, traits,
   effects, supported grants, preview/publish, browser journey.
9. **HA-8 — XL: subclass timeline form.** Parent, spellcasting/progression grid,
   level groups, feature/effect ordering and moving, preview/publish, threshold
   browser journeys.
10. **HA-9 — XL: background form.** Defaults, skills, reference-only tool text,
    equipment package editor, effects, preview/publish, equipment/apply browser
    journeys.
11. **HA-10 — XL: consumer cutover and homebrew disclosure.** Replace
    bundled-only species/background lists and gates; badge every picker/source;
    keep classes bundled-only; route subclass selections through derived keys;
    verify existing bundled journeys unchanged.
12. **HA-11 — XL: edit-as-version and explicit character replacement.** Usage
    index, old/new preview diff, per-kind transactional replacement, stale tokens,
    manual-effect preservation, invalid-choice repair, superseded metadata, and
    no-implicit-propagation controls.
13. **HA-12 — L: portability and adversarial convergence.** Complete JSON
    cross-database journeys for all three kinds, SRD collision/clone UI, same-name
    distinct rows, target-local `template_ref` regeneration with durable
    character-choice preservation, no drafts, reference-only share, mutation
    controls, and final accessibility pass.

The following edge list is normative; the diagram is only a compact rendering:

- HA-1 depends on HA-0 and CI-2a. CI-3a depends on HA-1 and CI-2b; CI-3b
  depends on HA-1, CI-2b, and its existing CI-3c equipment prerequisite.
- HA-2 depends on HA-0, CI-2a, and CI-2b.
- HA-3 and HA-4 each depend on HA-2, CI-3b, and CI-4a. HA-5 depends on HA-2,
  CI-3a, and CI-4a. The CI-4a edge is backend correctness: authoring
  `previewPublish`/`commitPublish` must silently adopt only the exact
  derived-primary, byte-identical, no-metadata-conflict self-match; alias,
  compatible-fingerprint, SRD-fallback, and metadata-conflict adoptions cannot
  bypass review even if no UI button exists yet.
- HA-6 depends on HA-2 and CI-4a. HA-7 depends on HA-3 and HA-6; HA-8 on HA-5
  and HA-6; HA-9 on HA-4 and HA-6.
- HA-10 depends on HA-7, HA-8, and HA-9. HA-11 depends on HA-10. HA-12 depends
  on HA-11 and CI-5.

Strict order:

```text
CI-1 → CI-2a → CI-2b ───────────────┬→ CI-3c ─┐
          │         │                │          ├→ CI-3b ─┐
HA-0 ─────┴→ HA-1 ──┴→ CI-3a ───────┼──────────┘         ├→ CI-3s → CI-4a
  └──────────────┐                   └────────────────────┘           │
                 └→ HA-2 ────────────────────────────────────────────┤
                                                                    ├→ HA-3 ─→ HA-7 ─┐
                                                                    ├→ HA-4 ─→ HA-9 ─┤
                                                                    ├→ HA-5 ─→ HA-8 ─┼→ HA-10
                                                                    └→ HA-6 ─────────┘
CI-5 ────────────────────────────────────────────────────────────────────────────────┐
HA-10 ─→ HA-11 ─────────────────────────────────────────────────────────────────────┴→ HA-12
```

HA-3/4/5 may run in parallel after their projector, review, and draft
dependencies because their service modules are disjoint. HA-7/8/9 may run in
parallel after their backend and the shared library/components. The
implementation merge queue still serializes schema migrations, fingerprint
freezes, and wire/backup version mints.

## 12. Assumptions, proved where the tree can prove them

1. **The requested baseline is exact — PROVED.** `git rev-parse HEAD` returned
   `b9a53e905cf580d2ca3179f662246a0f7d17ac7e` before this plan was written.
2. **A form-authored species/background must install both catalog halves —
   PROVED.** Guided apply copies the template, while `add_source` and the grant
   generator resolve the definition (`src/builder/guided-creation.ts:1035-1150,
   1257-1283`; `src/commands/add-source.ts:138-195`). One half alone is either
   unselectable mechanics or an uncopyable source.
3. **Subclass edit propagation cannot be row mutation — REQUIRED by D82 and
   PROVED unsafe by structure.** Character levels and sources hold live subclass
   ids, and sync re-reads eligible feature children
   (`src/commands/update-class.ts:156-265`). Updating a child under the same
   content key would change existing characters without an action and invalidate
   the fingerprint contract; the identity design explicitly keeps existing
   references on old content (`docs/design/2026-07-30-content-identity.md:
   240-243`).
4. **Copied origins can still be explicitly version-replaced — PROVED.** Each
   guided apply already owns and replaces its source/copy footprint
   (`src/builder/guided-creation.ts:923-1158,1458-1647`), and generated effects
   carry template refs. The new work is preview, derived-key resolution, and
   exposing this existing replace semantic outside initial creation.
5. **Name collision cannot be solved by the current unique indexes — PROVED.**
   Species/background and subclass root uniqueness currently forbids the
   same-name/different-properties case (`db/schema/origins.ts:215-219,
   1140-1144`; `db/schema/catalog-classes.ts:311-322`), while D81 requires it.
   The identity plan already removes those unique constraints.
6. **A subclass needs level-aware authoring — PROVED.** Feature level is required
   and CHECKed 1–20 (`db/schema/catalog-classes.ts:437-460`), while sync filters by
   the owning class level (`src/rules/generated-feature-effects.ts:165-192`).
   A flat form that omits level would be unable to reproduce the stored graph.
7. **Bundled spellcasting subclass schedules are dense — PROVED.** The complete
   bundled guard requires 20 rows for each of its two subclass keys, and their
   seeder writes levels 1–20 (`src/rules/class-progression-lookup.ts:180-257,
   610-684`). Both therefore enter CI-3s through the `override` arm and can
   converge with an authored duplicate; they are not partial legacy graphs.
8. **Classes can remain SRD-only without blocking authored subclasses —
   PROVED.** `subclass_definitions.class_definition_id` is a required parent FK
   (`db/schema/catalog-classes.ts:296-300`), and current subclass option queries
   already filter by it (`src/queries/character-workspace-builder.ts:366-376`).
   Authoring needs a parent selector, not class authoring.
9. **Homebrew marking must come from the planned registry — PROVED by absence of
   another authority.** Current definition/template roots carry no provenance
   column (`db/schema/catalog-sources.ts:80-133`; `db/schema/origins.ts:139-220,
   1077-1145`; `db/schema/catalog-classes.ts:289-324`), and D82's registry
   explicitly assigns `catalog_layer` (`docs/design/2026-07-30-content-identity.md:
   486-528`). Key grammar is legacy parsing, not provenance.
10. **No share-wire mint follows merely from derived identity — PROVED in the
   identity design.** The derived key fits existing key fields and share stays
   reference-only (`docs/design/2026-07-30-content-identity.md:436-454,863-891`).
   A different in-flight unit may advance the current version; implementation
   reads the then-current registry rather than reserving a number here.
11. **Subclass spellcasting authoring has existing consumers — PROVED.** The
    report consumes caster fraction/rounding and exact-level progression values,
    the grant reader consumes accumulated progression rules, and spell access
    consumes subclass ability (`src/reports/build-report-builder.ts:505-575`;
    `src/grants/source-rule-reader.ts:309-354`;
    `src/access/spell-access-builder.ts:622-652`). HA-5 needs typed document
    production and dense rows, not a speculative sheet feature.
12. **The authoring forms need no new owner gate.** D103 names the three kinds,
    excludes classes and JSON import, chooses forms, identity, homebrew marking,
    and the effect rule. The three design seams requested for this plan are pinned
    in §§6–8. Implementation uncertainty remains engineering risk, not an
    unanswered product choice.

## 13. Not in this unit

- Class authoring, class forks, or any way to attach a subclass to an external
  class.
- A raw JSON authoring textarea or expansion of the catalog JSON-import door.
  Existing hand-written documents continue through the import work D82 already
  designs; D103 does not make JSON the authoring UI.
- Structured languages, tools, tool choices, or tool proficiency effects.
- A generic arbitrary choice/config language for homebrew lineage trees.
  Unconditional typed grants work; unsupported conditional mechanics remain
  prose and disclosed until their own typed model exists.
- Published-content deletion, bulk character upgrades, or silent re-sync.
- A second export format or definitions embedded into share links.
- Authoring spells, feats, weapons, armor, items, or classes. Their identity
  projectors may exist for D81, but their forms need separate owner scope.
- Licensing or publication to a public marketplace. Homebrew remains local
  external content and travels only through the user's own complete export.

## 14. Principal risks

1. **Identity sequencing:** species/background effects added after
   `content-v1` freezes force a legitimate `content-v2`; pretending otherwise
   breaks the wire identity contract.
2. **Replacement semantics:** species/backgrounds are copied snapshots with
   character choices, while subclasses are live references. Treating all three
   alike either silently rewrites a character or leaves stale generated effects.
3. **False completeness in the forms:** a raw grant/progression field or numeric
   escape hatch can store a plausible mechanic no runtime consumer honors. Every
   exposed structured field therefore needs an end-to-end character assertion,
   and unsupported rules stay explicit prose.
