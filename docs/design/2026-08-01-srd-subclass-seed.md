# Seed every SRD 5.2.1 subclass

**Status:** design only  
**Date:** 2026-08-01  
**Size:** M  
**Persistence:** MINT-FREE  
**Implementation:** not started

## 1. Outcome and ruling chain

This unit adds the twelve subclasses actually printed in the pinned SRD 5.2.1
to the existing subclass catalog. It does not add a table, column, migration,
snapshot version, wire version, or identity scheme. The current two bundled
third-casters are not two of those twelve, so the safe additive result is
**fourteen bundled subclass definitions: twelve SRD definitions plus the two
existing definitions**. Only the existing two continue to own dense 20-row
subclass spellcasting schedules; the twelve SRD definitions inherit their
parent class progressions (`docs/srd/full/srd-5.2.1.txt:40-62`,
`docs/srd/full/srd-5.2.1.txt:101-125`,
`src/rules/class-progression-lookup.ts:180-195`,
`src/rules/class-progression-lookup.ts:610-681`).

The binding rulings, quoted rather than paraphrased, are:

> “The SRD 5.2.1 subclass for every class is extracted and seeded before the
> D106 gate, as a normal pinned-extract unit (F6/F27 discipline).”

That is D151 (`.claude/decisions.md:92-98`). It rejects stopping after merely
making ten previously empty class lists non-empty: Champion and Thief are part
of the twelve named by the SRD even though Fighter and Rogue already have a
different bundled option (`docs/srd/full/srd-5.2.1.txt:2968-3005`,
`docs/srd/full/srd-5.2.1.txt:3827-3885`).

> “No class or subclass feature text is extracted for v1; the sheet's
> stated-gap sentence remains the honest answer.”

That is D152 (`.claude/decisions.md:85-90`). This design therefore extracts
catalog facts—subclass headings, feature headings and levels, and printed spell
tables—but not feature paragraphs. It seeds feature **names**, not feature
descriptions, and the sheet prints those names without inventing or reproducing
rules prose. The current sheet already distinguishes catalog subclass features
as ordered name/level/description rows, but its public printed-feature union has
only background and species prose today
(`src/rules/sheet-content-lookup.ts:120-153`,
`src/queries/character-sheet-builder.ts:177-189`).

> “Never commit a work we are not licensed to redistribute. SRD 5.2 CC-BY
> (attribution intact) ... [is] fine. PHB text is not.”

That is D59 (`.claude/decisions.md:749-753`). The repository identifies its
pinned document as SRD 5.2.1 under CC-BY-4.0 and records the required notice
verbatim (`docs/srd/SOURCE.md:8-21`, `docs/srd/ATTRIBUTION.md:3-16`). Every fact
planned below occurs in that committed SRD text. Its contents list the twelve
§4 names, while the local seeder's two current rows are instead EK
and AT (`docs/srd/full/srd-5.2.1.txt:40-62`,
`docs/srd/full/srd-5.2.1.txt:101-125`,
`src/rules/class-progression-lookup.ts:727-765`).

> “a citation is not a checksum” and “extract + pin + assert before
> enforcement.”

That is F27 (`.claude/decisions.md:802-806`). F6 further requires the official
PDF SHA-256, verbatim extracts, commands and pages
(`.claude/decisions.md:1216-1223`). This unit follows that chain before any catalog assertion becomes
executable.

> “Level 3 proceeds; the unmade subclass is a D70 warning and a sheet gap.”

That surviving D80 behavior remains for genuinely unmade or filtered content
(`.claude/decisions.md:612-616`, `.claude/decisions.md:92-98`). An available SRD
option is not made mandatory: omitting the choice still proceeds and warns.

## 2. Extraction and provenance plan

### 2.1 Current source state

`docs/srd/source/` currently contains 31 registered `.txt` extracts, and the
complete registry at `docs/srd/SOURCE.md:40-72` contains no subclass extract.
The provenance test proves the table and directory are equal in both directions
and hashes each listed file
(`tests/unit/rules/srd-extract-provenance.test.ts:43-88`). Consequently, the subclass catalog facts are present in the repository
but are not yet in a readable, separately pinned extract.

The upstream PDF does **not** need to be fetched to recover the missing slice.
The repository commits the entire `pdftotext -layout` result and records its
SHA-256 as
`e69e053879d96e8e5568a6807212875ab1dfa1e4059cd14444c0a33f5fba95f2`;
future slices are explicitly to be checked against that committed source
(`docs/srd/SOURCE.md:169-182`). The PDF provenance remains independently pinned
to SHA-256
`8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87`
and the re-derivation command remains `pdftotext -layout`
(`docs/srd/SOURCE.md:12-29`,
`tests/unit/rules/srd-extract-provenance.test.ts:100-105`).

### 2.2 New extract

SC-1 creates `docs/srd/source/subclasses.txt` from the committed full text. It
contains, in the SRD's class order:

- each `Class Subclass: Name` heading;
- every `Level N: Feature Name` heading belonging to that subclass; and
- the Life Domain, Circle of the Land, Oath of Devotion, Draconic Sorcery and
  Fiend Patron spell tables.

Those are catalog/tabular facts, not the feature paragraphs D152 excludes. The
extract carries the required notice because every source extract must carry it
(`docs/srd/SOURCE.md:184-189`). `docs/srd/SOURCE.md` gains one row recording the
printed pages (30, 35, 40, 46, 49, 52, 56-57, 61, 64, 69, 76 and 82), the exact
scope, and the new file's SHA-256; the current registry format and per-file hash
test are the precedent (`docs/srd/SOURCE.md:23-40`,
`tests/unit/rules/srd-extract-provenance.test.ts:43-88`).

The parser consumes only this new extract. It rejects a missing/duplicate class,
an unknown class, a feature level outside 1-20, duplicate feature names or sort
positions, a malformed spell row, and any non-heading prose outside the required
notice. This makes “D152 names and tables only” an input invariant rather than a
review convention. The existing schema independently CHECKs feature levels and
uniqueness, but the parser must fail before seed writes
(`src/db/schema.sql:1486-1501`).

### 2.3 Verified count

The pinned SRD source contains exactly **twelve** subclass sections—one for each
base class. The source evidence is the twelve rows in §4; the table of contents
also lists them across `docs/srd/full/srd-5.2.1.txt:40-62` and
`docs/srd/full/srd-5.2.1.txt:101-125`. The extraction test
must assert the closed twelve-class set, not merely `length >= 12`; otherwise a
duplicated section and a missing section can cancel out.

## 3. Existing row-shape precedent

The two current bundled subclasses carry exactly this shape:

| Part | Current stored shape | Evidence |
|---|---|---|
| Definition | Stable content key, required parent class, name, `2024`, Intelligence spellcasting ability, `1/3` caster fraction, `down` rounding and timestamps. The insert omits `grant_rules`, so definition-level grants are `NULL`. | `src/rules/class-progression-lookup.ts:511-567` |
| Progression | Exactly one row for every class level 1-20. Each row stores cantrips known, prepared count, maximum spell level, slot JSON and Wizard-list cantrip/prepared grant rules. | `src/rules/class-progression-lookup.ts:569-681` |
| Dense schedule | “Dense” means the seeder loops all 20 levels and the boot guard requires `2 * 20` child rows; it does not mean only breakpoint rows exist. | `src/rules/class-progression-lookup.ts:209-257`, `src/rules/class-progression-lookup.ts:619-681` |
| Features/effects | Neither current subclass has a `subclass_features` or `subclass_feature_effects` seed row. The present source comment explicitly says no subclass feature is seeded. | `src/rules/sheet-srd.ts:644-652`, `src/rules/class-progression-lookup.ts:727-765` |

The twelve SRD subclasses use the same aggregate tables but a different
progression arm: no `subclass_progressions` row means “inherit parent”; an exact
20-row child set means “override.” That distinction is already the planned
identity-projector contract
(`docs/design/2026-07-30-homebrew-authoring-forms.md:413-426`). Fixed spell grants belong on `subclass_definitions.grant_rules` and
are read together with any effective progression rules
(`src/grants/source-rule-reader.ts:306-351`).

## 4. Per-subclass mechanical inventory

Engine vocabulary used in this classification:

- D91 resource maxima are class-owned ladders/formulas and are computed or
  absent; the current manifest is keyed by the twelve base classes, not by
  subclasses (`.claude/decisions.md:542-546`,
  `src/rules/class-resources-srd.ts:28-60`). A subclass feature that spends Rage,
  Channel Divinity, Wild Shape, Focus Points, Sorcery Points or a slot does not
  create a second maximum. A subclass-only use pool cannot be inserted into the
  class-resource model in this mint-free unit.
- The existing grant vocabulary can express fixed spells, one-list/query spell
  choices, spellbook acquisitions, fighting styles, weapon mastery and skill
  proficiency (`src/domain/enums.ts:102-113`, `src/grants/grant-rule.ts:242-351`).
  Fixed spells support always-prepared, slot use, level activation, free casts
  and config predicates (`src/rules/origin-definitions-srd.ts:186-239`).
- The effect tables can express a bounded numeric vocabulary, but D152 prevents
  this unit from extracting the feature paragraphs needed to populate such
  effects (`src/db/schema.sql:1430-1482`, `.claude/decisions.md:85-90`). Those
  mechanics therefore remain text-only even where a current effect kind looks
  superficially compatible.

“Seeded” below means a definition plus ordered name/level feature rows. A
description is always the empty string required by the existing NOT NULL column;
the read model treats it as absent and prints no description
(`src/db/schema.sql:1486-1497`).

| Class | SRD subclass and feature headings | Spell/grant requirement | Resource/passive classification and seed result |
|---|---|---|---|
| Barbarian | **Path of the Berserker** — Frenzy 3; Mindless Rage 6; Retaliation 10; Intimidating Presence 14. | None. | Intimidating Presence is a once-per-long-rest use that can be restored by expending Rage; the other rules are conditional combat prose. Seed four names only; no new resource row. (`docs/srd/full/srd-5.2.1.txt:1872-1916`) |
| Bard | **College of Lore** — Bonus Proficiencies 3; Cutting Words 3; Magical Discoveries 6; Peerless Skill 14. | Magical Discoveries chooses two spells from a union of the Cleric, Druid and Wizard lists and permits later replacement. The current list rule resolves exactly one list, so no lossy grant rule is seeded. | Cutting Words and Peerless Skill spend the existing Bardic Inspiration pool; Bonus Proficiencies and the combat rules are prose-derived choices. Seed four names only. (`docs/srd/full/srd-5.2.1.txt:2166-2203`, `src/grants/grant-rule-planner.ts:75-105`) |
| Cleric | **Life Domain** — Life Domain Spells 3; Disciple of Life 3; Preserve Life 3; Blessed Healer 6; Supreme Healing 17. | The table contains ten unconditional always-prepared spells activated at Cleric levels 3, 5, 7 and 9. Seed ten fixed-spell rules. | Preserve Life spends the existing Channel Divinity pool; the healing modifications are prose mechanics. Seed five names, the ten spell rules, and no effect/resource row. (`docs/srd/full/srd-5.2.1.txt:2445-2494`) |
| Druid | **Circle of the Land** — Circle of the Land Spells 3; Land's Aid 3; Natural Recovery 6; Nature's Ward 10; Nature's Sanctuary 14. | Four land choices each grant six spells, selected again after every long rest. `active_if_config` can gate rules, but the current subclass-selection flow captures no typed land choice, so seeding dormant rules would silently show no spells. Record all 24 table entries in the parser manifest but defer grants until that choice has a typed capture path. | Land's Aid/Nature's Sanctuary spend Wild Shape; Natural Recovery owns a once-per-long-rest use and slot recovery; Nature's Ward is choice-dependent resistance. Seed five names only. (`docs/srd/full/srd-5.2.1.txt:2789-2845`, `src/grants/grant-rule.ts:206-239`) |
| Fighter | **Champion** — Improved Critical 3; Remarkable Athlete 3; Additional Fighting Style 7; Heroic Warrior 10; Superior Critical 15; Survivor 18. | Additional Fighting Style is an open choice, while the current fighting-style rule requires a fixed `style_key`; no fabricated fixed choice is seeded. | All remaining mechanics are conditional combat/passive prose. Seed six names only. (`docs/srd/full/srd-5.2.1.txt:2968-3009`, `src/grants/grant-rule.ts:333-335`) |
| Monk | **Warrior of the Open Hand** — Open Hand Technique 3; Wholeness of Body 6; Fleet Step 11; Quivering Palm 17. | None. | Wholeness of Body has Wisdom-modifier uses per long rest; Quivering Palm spends Focus Points; other rules alter actions/attacks. Seed four names only and reuse no pool as a new maximum. (`docs/srd/full/srd-5.2.1.txt:3130-3169`) |
| Paladin | **Oath of Devotion** — Oath of Devotion Spells 3; Sacred Weapon 3; Aura of Devotion 7; Smite of Protection 15; Holy Nimbus 20. | The table contains ten unconditional always-prepared spells activated at Paladin levels 3, 5, 9, 13 and 17. Seed ten fixed-spell rules. | Sacred Weapon spends Channel Divinity; Holy Nimbus owns one long-rest use recoverable with a level-5 slot; the aura/smite rules are prose. Seed five names and the ten spell rules only. (`docs/srd/full/srd-5.2.1.txt:3364-3442`) |
| Ranger | **Hunter** — Hunter's Lore 3; Hunter's Prey 3; Defensive Tactics 7; Superior Hunter's Prey 11; Superior Hunter's Defense 15. | No new spell is granted; Superior Hunter's Prey modifies the base class's already-prepared Hunter's Mark. | All five are choice/conditional combat prose; no new pool or spell slot is created. Seed five names only. (`docs/srd/full/srd-5.2.1.txt:3649-3711`) |
| Rogue | **Thief** — Fast Hands 3; Second-Story Work 3; Supreme Sneak 9; Use Magic Device 13; Thief's Reflexes 17. | None. | Action economy, climb/jump, magic-item and turn-order rules are outside current effect/resource vocabularies. Seed five names only. (`docs/srd/full/srd-5.2.1.txt:3827-3885`) |
| Sorcerer | **Draconic Sorcery** — Draconic Resilience 3; Draconic Spells 3; Elemental Affinity 6; Dragon Wings 14; Dragon Companion 18. | The table contains ten unconditional always-prepared spells activated at Sorcerer levels 3, 5, 7 and 9. Seed ten fixed-spell rules. Dragon Companion's free Summon Dragon cast is feature prose and remains unseeded under D152. | Resilience's Sorcerer-level HP and unarmoured AC formula, configurable affinity, fly speed, once-per-rest wings and Sorcery Point recharge are feature prose. Seed five names and the ten table spell rules only. (`docs/srd/full/srd-5.2.1.txt:4167-4244`) |
| Warlock | **Fiend Patron** — Dark One's Blessing 3; Fiend Spells 3; Dark One's Own Luck 6; Fiendish Resilience 10; Hurl Through Hell 14. | The table contains ten unconditional always-prepared spells activated at Warlock levels 3, 5, 7 and 9. Seed ten fixed-spell rules. | Dark One's Own Luck has Charisma-modifier uses per long rest; Hurl Through Hell owns one use recoverable by a Pact slot; the temporary HP and configurable resistance are prose. Seed five names and the ten table spell rules only. (`docs/srd/full/srd-5.2.1.txt:4565-4607`) |
| Wizard | **Evoker** — Evocation Savant 3; Potent Cantrip 3; Sculpt Spells 6; Empowered Evocation 10; Overchannel 14. | Evocation Savant grants spellbook choices initially and whenever a new Wizard slot level appears. Although the engine has a school-filtered spellbook-acquisition shape, the timing is stated only in excluded feature prose; do not seed a remembered approximation. | The remaining damage/save rules are conditional prose, including Overchannel's escalating self-damage. Seed five names only. (`docs/srd/full/srd-5.2.1.txt:4902-4959`, `src/grants/grant-rule-planner.ts:89-105`) |

The closed expected totals from that inventory are **12 definitions, 58 feature
name rows and 40 unconditional fixed-spell rules**. The 24 Circle spells remain
parsed evidence but not active grants until its renewable land choice is
captured; Magical Discoveries and Evocation Savant remain explicit unsupported
choice/timing cases rather than plausible approximations.

## 5. Seed design

### 5.1 Ownership and ordering

Create one SRD subclass manifest/seeder module, separate from the legacy
third-caster progression generator. The application calls it immediately after
`ensureBundledClassContent`, because every definition has a required parent
class FK; fixed spell keys resolve lazily, so the spell catalog may still seed
later (`src/db/schema.sql:1411-1425`, `src/db/bootstrap.ts:52-69`).

The module owns only these twelve content keys and their descendants. It resolves
the parent by bundled class content key, yields when the `(parent, name, edition)`
slot belongs to another key, and never deletes rows belonging to a different key.
That is the current third-caster collision policy
(`src/rules/class-progression-lookup.ts:511-539`).

For caster-parent subclasses, `spellcasting_ability` repeats the parent ability
so a subclass source instance can calculate access for its fixed grants; the
access reader asks the subclass definition directly and does not fall back to
its parent (`src/access/spell-access-builder.ts:620-646`). `caster_fraction` and
`caster_rounding` remain `NULL`, which makes the build report inherit the base
class progression and exact-level class row
(`src/reports/build-report-builder.ts:505-574`). Martial-parent subclasses keep all three caster fields `NULL`.

All twelve definitions have **zero** `subclass_progressions` rows. Their fixed
spell rules live at definition scope with `active_from_class_level`,
`bucket='prepared'`, `always_prepared=true` and `with_slots=true`. Every referenced
spell content key must resolve after full application seed; an unresolved key is
a hard seed/test failure, not an omitted spell (`src/grants/grant-rule.ts:247-258`,
`src/grants/grant-rule-slot-generator.ts:348-374`).

Feature rows use SRD order across the whole subclass, `class_level` from the
heading, `name` from the heading and `description=''`. No
`subclass_feature_effects` row is created. The sheet filters names to
`class_level <= held class level`; `SheetContentLookup` already returns ordered
feature rows and deliberately leaves level filtering to consumers
(`src/rules/sheet-content-lookup.ts:252-282`).

### 5.2 Repair guard

Do not append the twelve keys to the current `bundledClassContentKeys().subclasses`
array. That array currently means “definition plus 20 progression rows”; doing
so would make every legitimate inherit-parent subclass permanently incomplete
(`src/rules/class-progression-lookup.ts:183-195`,
`src/rules/class-progression-lookup.ts:209-257`).

Instead expose two checked inventories:

1. all fourteen bundled subclass definition keys (twelve SRD plus two legacy);
2. the two override-schedule keys (EK and AT).

The new SRD guard compares exact owned definition fields, ordered feature
name/level tuples and normalized definition grant rules for its twelve keys. A
count-only check is insufficient: deleting one feature, swapping a level or
changing one spell key leaves every table count plausible. Reconciliation
delete/reinserts only owned feature descendants and upserts the owned definition;
it must not sweep imported siblings. The existing schema's cascade is safe only
below an owned definition (`src/db/schema.sql:1486-1513`).

### 5.3 Sheet and level-up behavior

Extend `SheetPrintedFeature.source` with `subclass_feature` and project reached
feature names with `text=null`. The view labels them “Subclass feature —
{subclass} — {feature}” and renders no detail row for this source. It must not
reuse today's generic null-text sentence, “No description is recorded,” because
D152 says the absence is a deliberate product boundary, not missing data
(`src/queries/character-sheet-builder.ts:184-189`,
`src/ui/screens/sheet/sheet-view.ts:730-755`).

Keep and revise `no_class_feature_text`: it says class/subclass **rules text** is
not printed, while reached subclass feature names and the four supported spell
tables are catalog facts. Delete `partial_subclass_catalog` from the gap union and
global list because its subject—the absence of any bundled option for ten
classes—is gone (`src/queries/character-sheet-builder.ts:299-307`,
`src/queries/character-sheet-builder.ts:486-504`). The agent-reference subclass
row becomes `modelled` for catalog selection; its separate `class features` row
remains partial for unprinted/unmodeled rules text
(`src/ui/screens/planner/agent-reference.ts:183-189`,
`src/ui/screens/planner/agent-reference.ts:241-248`).

Do not change command semantics. A Wizard reaching level 3 with Evoker available
may still omit the key; it levels successfully and retains a null subclass. The
synthetic empty-list wizard also retains its Continue action. These are D80's
negative controls for genuinely unmade, imported, filtered or future content
(`tests/integration/commands/level-up-class.test.ts:248-263`,
`tests/unit/ui/level-up-wizard.test.ts:999-1022`). Only their stale “Wizard is
unseeded” comments change (`src/commands/level-up-class.ts:224-228`,
`src/builder/level-up.ts:53-59`,
`tests/fixtures/level-up-mutations.mjs:134-152`).

Finally, widen the known-bundled subclass set used by feat-prerequisite evidence.
Keep the two legacy keys as the only subclass-granted Spellcasting positives,
but classify all twelve SRD keys as known rather than imported/unknown; otherwise
choosing Champion would incorrectly turn a provable negative into
`unprovable` (`src/rules/class-level-features-srd.ts:264-312`,
`tests/unit/rules/class-level-features-srd.test.ts:165-204`).

## 6. Identity-chain impact

CI-2a does **not** fingerprint subclasses and contains no executable “exactly
two” assumption. Its insert trigger registers every new subclass identity as
`legacy-opaque + external` and explicitly creates no fingerprint
(`src/db/schema.sql:1695-1700`, `src/db/schema.sql:1717-1731`). The twelve new
definitions therefore behave exactly like the existing two until CI-3x lands.

> Superseded by D205/0034: `legacy-opaque` no longer exists.

The “exactly two dense bundled schedules” statement is real but narrower than
“exactly two bundled subclasses.” The current design proved that both existing
keys have 20 rows (`docs/design/2026-07-30-homebrew-authoring-forms.md:104-110`,
`docs/design/2026-07-30-homebrew-authoring-forms.md:990-994`). Adding twelve
inherit-parent aggregates preserves **two dense schedules** while making the old
claim that *every* bundled subclass is dense false.

Before CI-3s, its explicit checked seeder inventory must therefore contain
fourteen subclass roots and classify them as:

- two `override` aggregates with 20 progression rows; and
- twelve `inherit_parent` aggregates with zero progression rows, ordered
  feature graphs, and definition-level grant rules.

The future subclass fingerprint includes the parent class fingerprint, caster
and grant fields, progressions, and ordered feature/effect graph
(`docs/design/2026-07-30-content-identity.md:394-422`). CI-3s is explicitly the
unit that registers **every** bundled aggregate and current/historical
fingerprints (`docs/design/2026-07-30-content-identity.md:1287-1291`), while the
backfill inventory is required to cover every bundled root
(`docs/design/2026-07-30-content-identity.md:1198-1225`). Landing this seed before
CI-3s is therefore the cheap path: CI-3s fingerprints the fourteen current
aggregates once instead of creating ten/twelve post-freeze historical additions.

No current identity fingerprint vector changes in this unit because none exists
for subclasses yet. The new seed tests must nevertheless assert fourteen
subclass identities, all with the current trigger classification and no
fingerprint, so a premature key-kind claim cannot slip in.

## 7. Persistence and MINT ruling

This work is **MINT-FREE**. The schema already has:

- definition columns for parent, name, edition, caster metadata and grant JSON
  (`src/db/schema.sql:1411-1425`);
- ordered feature name/description/level rows
  (`src/db/schema.sql:1486-1501`);
- optional progression rows, so absence can mean parent inheritance
  (`src/db/schema.sql:1502-1518`); and
- effect rows, which this D152 unit deliberately does not populate
  (`src/db/schema.sql:1430-1482`).

These are catalog tables, not character state: definitions are snapshot/share
false and only travel as referenced content keys; progressions, features and
effects are snapshot/backup/share false
(`src/domain/contracts/tables.ts:631-710`). Adding rows therefore does not change an `a7-v*` snapshot shape,
candidate-audit table set, backup wire shape or schema signature. No migration,
snapshot-version increment, generated schema edit or frozen pre-Drizzle fixture
edit is permitted in SC-1..SC-6.

## 8. Implementation units

| Unit | Size | Depends on | MINT | Deliverable / exit |
|---|---:|---|---|---|
| **SC-1 — pinned subclass extract** | S | none | **NO** | Add names/levels/spell tables only, required notice, SOURCE row and digest; provenance and exact-12 parser controls pass. |
| **SC-2 — typed manifest/parser** | M | SC-1 | **NO** | Closed one-per-class manifest; exact 58 headings, five spell-table inventories, four unconditional rule sets; conditional/choice cases are typed absences, not empty fallbacks. |
| **SC-3 — catalog seed and repair** | M | SC-2 | **NO** | Add twelve definitions, 58 empty-description feature rows and 40 fixed rules; retain 40 legacy progression rows; exact repair catches tuple/grant corruption without touching imported rows. |
| **SC-4 — level-up/sheet projection** | M | SC-3 | **NO** | All twelve classes offer their SRD option; reached feature names print without prose; partial-catalog gap retires; D80 omission/empty controls remain green. |
| **SC-5 — identity/inventory closure** | S | SC-3 | **NO** | Split fourteen definition keys from two override keys; CI-2a trigger state asserted; CI-3s handoff records 12 inherit + 2 override. |
| **SC-6 — full regression and docs cleanup** | S | SC-1..SC-5 | **NO** | Exact-state tests and stale comments listed in §9 updated; schema/snapshot/candidate controls unchanged; focused unit/integration/browser suites pass. |

The dependency order is intentional: no seed literal is reviewed before its
extract/parser can fail, and no sheet expectation is changed before the catalog
rows exist.

## 9. Test impact and negative controls

### 9.1 Tests that change

| Exact test/file | Required change | Strict-superset ruling | Negative control candidate |
|---|---|---|---|
| `tests/unit/rules/srd-extract-provenance.test.ts` (`SRD extract provenance`) | Name `subclasses.txt` as required coverage in addition to automatic hash/set equality. | Yes: adds one pinned source; weakens nothing (`tests/unit/rules/srd-extract-provenance.test.ts:60-105`). | Change one extracted byte without its SOURCE digest; `matches the committed bytes...` fails. |
| New `tests/unit/rules/srd-subclasses.test.ts` | Assert exact 12 classes, 58 ordered headings, five spell tables, 40 unconditional grants and the typed deferred cases. | Yes: new independent oracle over committed extract. | Remove Champion; duplicate Thief; change one feature level; inject one prose line; change one spell. Each named test must fail. |
| `tests/integration/rules/class-progression.test.ts` — “persists twelve complete class tables and two complete subclass tables” and metadata test | Expect 14 definitions, still 40 progression rows, exact 12 new parent/name/caster tuples, 58 features and 40 fixed rules. Keep the third-caster breakpoint test unchanged. | Yes: the two old definitions/40 rows remain and twelve aggregates are added (`tests/integration/rules/class-progression.test.ts:25-79`, `tests/integration/rules/class-progression.test.ts:224-247`). | Delete a new definition/feature or alter a grant; exact manifest comparison fails while old breakpoint assertions still protect both dense schedules. |
| `tests/integration/db/bootstrap.test.ts` — fresh install, collision, repair and “bundled class content detection” | Split all-definition and override-key constants; expect 14 on a fresh DB, 13 when bundled Wizard is displaced, and 40 progressions. Add feature/grant corruption repair cases. | Yes: the collision keeps every seedable sibling and exact repair becomes stronger (`tests/integration/db/bootstrap.test.ts:87-111`, `tests/integration/db/bootstrap.test.ts:309-335`, `tests/integration/db/bootstrap.test.ts:424-433`, `tests/integration/db/bootstrap.test.ts:604-640`). | Delete one feature or replace one fixed spell key without changing counts; guard must report false and reopen must repair it. |
| `tests/browser/bundled-content.spec.ts` — fresh OPFS install | Expect 14 definitions, 58 seeded features and 40 subclass progressions after reset/reload. | Yes: storage-path proof gains the twelve aggregates (`tests/browser/bundled-content.spec.ts:42-69`). | Reload/reset must neither duplicate nor erase the new rows. |
| `tests/integration/catalog/subclass-provenance.test.ts` — imported subclass distinguishability | Compare the imported key with the complete checked fourteen-key bundle, not a hand-written two-row list. | Yes: the imported row remains distinguishable from a larger strict superset (`tests/integration/catalog/subclass-provenance.test.ts:104-123`). | Give one bundled key an imported owner-shaped key; owner classification assertion fails. |
| `tests/integration/homebrew/homebrew-catalog-fixture.test.ts` — “distinguishable from every bundled one” and missing-parent refusal | Expect imported + 14, and expect 14 after the refused import. | Yes: explicitly checks every bundled sibling rather than two (`tests/integration/homebrew/homebrew-catalog-fixture.test.ts:527-548`, `tests/integration/homebrew/homebrew-catalog-fixture.test.ts:600-615`). | Drop one bundled key from the checked inventory; exact owners comparison fails. |
| `tests/browser/catalog-import.spec.ts` — imported subclass survives reload | Expect 15 definitions. Replace the global `subclass_features` length 2 check with a query scoped to the imported definition, while separately asserting the 58 seed rows. | Yes: preserves the original imported-row subject instead of weakening it to a new global total (`tests/browser/catalog-import.spec.ts:205-245`). | Delete the imported feature while all 58 seed features survive; scoped assertion still fails. |
| `tests/integration/commands/level-up-class.test.ts` — level 3 without subclass | Change only the false “No seeded Wizard subclass” premise; behavior and null assertion remain. | Behavior unchanged, so this remains a legal D80 control rather than a count update (`tests/integration/commands/level-up-class.test.ts:248-263`). | Existing `subclass-refusal` source mutation must still make the test fail. |
| `tests/fixtures/level-up-mutations.mjs` — `subclass-refusal` comment/target rationale | Say “available but omitted” rather than “Wizard unseeded”; mutation remains byte-equivalent. | Behavior unchanged (`tests/fixtures/level-up-mutations.mjs:134-152`). | Reintroduced refusal still kills the command test above. |
| `tests/integration/queries/character-sheet.test.ts` — application-wide gaps | Remove only `partial_subclass_catalog`; add a selected-SRD-subclass case proving reached names, no future names and no descriptions. | Subject-gone deletion is legal: D151 removes the global gap; `no_class_feature_text` remains (`tests/integration/queries/character-sheet.test.ts:757-773`). | Print a level-6 name for a level-3 character or any description; new projection assertion fails. |
| `tests/unit/ui/sheet-view.test.ts` — features section | Add subclass-name-only rendering and prove it has no generic “No description is recorded” detail. | Yes: background/species prose cases remain (`tests/unit/ui/sheet-view.test.ts:205-218`, `tests/unit/ui/sheet-view.test.ts:565-588`). | Route subclass null text through the old generic null branch; assertion fails. |
| `tests/unit/ui/agent-reference.test.ts` and `tests/browser/agent-reference.spec.ts` — subclass coverage | Change the subclass catalog row from `partial`/“2 of 12” to `modelled`/all 12 classes; retain `class features: partial`. | Subject-gone update; it separates selection coverage from rules-prose coverage (`tests/unit/ui/agent-reference.test.ts:768-771`, `tests/browser/agent-reference.spec.ts:308-315`). | Mark `class features` modelled too; its retained partial assertion fails. |
| `tests/unit/rules/class-level-features-srd.test.ts` — feat feature evidence | Add Champion (known negative) and an SRD caster-parent subclass; retain both legacy positive and imported-unknown cases. | Yes: adds known bundled negatives while preserving uncertainty for homebrew (`tests/unit/rules/class-level-features-srd.test.ts:165-204`). | Remove a new key from the known set; Champion becomes `unprovable` and fails. |

Production/test comments whose factual subject changes are updated with those
tests: `src/builder/level-up.ts:53-59`, `src/commands/level-up-class.ts:224-228`,
`src/rules/sheet-srd.ts:644-652`, and `tests/fixtures/homebrew-subclass.ts:3-33`.
No fixture prose is deleted merely to make a test pass.

### 9.2 Controls that deliberately do not change

| Exact control | Disposition and proof |
|---|---|
| `tests/unit/ui/level-up-wizard.test.ts` — “keeps an empty subclass catalog traversable with a Continue action” | **No change.** Its explicit synthetic `options: []` remains the negative case D80 requires (`tests/unit/ui/level-up-wizard.test.ts:999-1022`). |
| `tests/unit/db/candidate-audit.test.ts` including every `a7-v*` case | **No change.** Candidate audit's historical `a7-v1` table set is five character-state tables, not catalog seed rows (`tests/unit/db/candidate-audit.test.ts:107-120`, `tests/unit/db/candidate-audit.test.ts:799-815`). |
| `tests/integration/backup/round-trip.test.ts` `a7-v*` literal/snapshot assertions | **No change.** Empty subclass references remain empty unless a character actually selects one; the literals assert that fact (`tests/integration/backup/round-trip.test.ts:1019-1026`, `tests/integration/backup/round-trip.test.ts:1312-1319`). |
| `tests/unit/schema.test.ts` and `tests/unit/db/schema-signature.test.ts` | **No change.** Row additions do not change columns, indexes, FKs, generated DDL, the 75-table count, or either frozen pre-Drizzle hash (`tests/unit/schema.test.ts:2000-2078`, `tests/unit/db/schema-signature.test.ts:60-84`). Any edit here would be evidence of an accidental mint. |
| Existing EK/AT slot, access, level-up and multiclass tests | **No change except stale global-count comments.** The two definitions and all 40 dense rows remain part of the strict superset (`src/rules/class-progression-lookup.ts:727-765`). |

## 10. Risks, assumptions and owner question

### Risks closed by this design

- **Ten-more undercount:** adding only the ten currently empty classes would omit
  Champion and Thief even though D151 says all SRD subclasses. The source rows
  make that omission testable (`docs/srd/full/srd-5.2.1.txt:2968-3005`,
  `docs/srd/full/srd-5.2.1.txt:3827-3885`).
- **Dense-guard deadlock:** treating new keys like the two legacy override keys
  would demand 240 nonexistent progression rows. The split inventories prevent
  that (`src/rules/class-progression-lookup.ts:209-257`).
- **D152 leakage:** storing prose in `description` or printing a generic missing
  description would contradict the numbers/reference ruling. Extract grammar,
  empty descriptions and source-specific rendering close all three paths
  (`.claude/decisions.md:85-90`, `src/ui/screens/sheet/sheet-view.ts:730-755`).
- **Silent approximate mechanics:** Circle configuration, cross-list spell
  choice, spellbook timing and subclass-only use pools are typed deferred cases,
  not empty arrays or guessed rules (`src/grants/grant-rule-planner.ts:75-105`,
  `src/rules/class-resources-srd.ts:28-60`).
- **Identity history churn:** the seed lands before CI-3s, whose checked inventory
  and fingerprint run then see the final fourteen-root bundle once
  (`docs/design/2026-07-30-content-identity.md:1287-1291`).

### Locally proved assumptions

1. The complete committed text matches the hash recorded in SOURCE and contains
   the twelve §4 sections; SOURCE says future slices are derived from that
   committed file (`docs/srd/SOURCE.md:169-182`).
2. The current two definition names are absent from the pinned SRD subclass
   catalog and are introduced by the local seeder instead
   (`src/rules/class-progression-lookup.ts:727-765`).
3. Deleting/replacing either current definition is not a harmless seed rewrite:
   a selected character has a composite `NO ACTION` FK to it
   (`src/db/schema.sql:294-308`).
4. No schema mint is needed for the selected subset of mechanics (§7).

### Owner question (genuinely underivable, non-blocking for D151)

**OQ-1 — Should EK and AT remain bundled after the
twelve SRD 5.2.1 subclasses land?** They are not part of the pinned twelve, but
they are live stable-key catalog rows with dense spellcasting schedules and can
be referenced by character state
(`src/rules/class-progression-lookup.ts:180-195`, `src/db/schema.sql:294-308`). This design takes the non-destructive,
D151-complete default: retain them, yielding 14 definitions. Retiring them is a
separate content-removal/data-transition ruling; it must not be smuggled into a
mint-free additive seed under the inaccurate phrase “ten more.”
