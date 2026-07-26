# Weapons — design

Worktree `/home/vagrant/PhpstormProjects/dnd-wt-weapons`, branch `feat/weapons`,
written against HEAD `2ad5ca1`.

This is a DESIGN. No production code is proposed as written here; every table is
given as the Drizzle declaration it must become, but nothing in this pass is
implemented.

Binding inputs: D1, **D1b** (fixes the shape and may not be relitigated), D3, D4,
D5, D6/D6b/D6c/D6d (nullability), D7, F4 (no character sheet), F6 (the SRD
material and the mastery-count answer), R1 (the superseded `category` /
`enhancement` fields), Q4 (property representation).

---

## 0. The proof phase's section E is STALE — read this first

The feasibility report handed to this pass concluded:

> **E. The SRD weapon data itself — I have NONE of it available offline.**
> … Every statistic would be fabricated.

That was true at `094eaff`. It is no longer true. Two commits landed afterwards:

- `6bbeef2` "Bundle the SRD weapon material with its provenance, and settle D1b's
  open question"
- `2ad5ca1` "Record F6"

`docs/srd/source/weapons-table.txt` now holds the complete SRD 5.2.1 weapons
table (page 90) verbatim, and `docs/srd/source/weapon-mastery-progression.txt`
holds the Barbarian and Fighter class tables including their Weapon Mastery
columns. `docs/srd/SOURCE.md` records the PDF URL, byte size, SHA-256 and the
exact `pdftotext -layout` command, so every value is re-derivable.

**Consequence for this design:** weapon statistics are now SOURCED and may be
seeded. The refusal to fabricate stands, but it now bites in exactly one place —
the mastery counts for three of the five granting classes (§3).

### Two corrections to the record, both verified here

1. **There are 38 SRD weapons, not 37.** F6 and the `6bbeef2` commit message
   both say "All 37 weapons extracted cleanly". Counted from the extract:
   Simple Melee 10, Simple Ranged 4, Martial Melee 18, Martial Ranged 6 = **38**.
   Verified: `awk 'NR>7' docs/srd/source/weapons-table.txt | grep -E '^ {6}[A-Z]' | wc -l` → `38`.
   Nothing depends on the number yet; the seeder's row-count assertion must say
   38, and F6 should be corrected so the next reader does not "fix" a correct
   seeder down to 37.
2. **The Paladin/Ranger/Rogue "flat two" is NOT in the repository.** F6 and
   SOURCE.md both assert it, but `docs/srd/source/` contains only the Barbarian
   and Fighter tables. Grepping the extracts for Paladin, Ranger or Rogue returns
   nothing. That claim currently rests on the fetching agent's reading of a PDF
   that is deliberately not committed — which is precisely the provenance
   failure F6 was written to prevent. §3 is built around this.

---

## 1. Scope

### Built in this pass

- Three new tables (§4): a character's weapons, the SRD weapon templates, and
  the class weapon-mastery content, authored as Drizzle in `db/schema/weapons.ts`.
- A seeder that loads the 38 SRD weapon templates and the sourced mastery counts
  from `docs/srd/source/`.
- A mastery-allowance lookup (§5) that resolves class + level to a count **or to
  an explicit "we do not know"**, and never to a silent zero.
- Weapon add / edit / remove / mastery-toggle through the existing command,
  revision and undo machinery (§7.4).
- A weapons section in the planner: a template picker that pre-fills, fully
  editable fields, and mastery checkboxes (§8).
- Flipping the agent-reference coverage fact for `equipment and weapons` from
  `not_modelled` to `partial`, and the machine-readable weapon block (§9).

### Explicitly NOT built in this pass

- **Weight and cost.** They are in the SRD extract and are deliberately not
  modelled. They are encumbrance and economy concepts; this app has no inventory
  and no sheet (F4). Because a character stores VALUES and never a template
  reference (D1b), adding them later touches no character row — the template
  table gains two columns and the pre-fill gains two fields. Nothing is
  foreclosed.
- **Attack bonus, damage bonus, or any roll.** `src/rules/attack-bonus.ts` today
  computes SPELL attack bonuses only, and weapon attack bonus needs weapon
  proficiency, which does not exist (F4: `proficiency` appears once in the whole
  schema, for spellcasting). Deriving it would require inventing the proficiency
  model.
- **Ammunition counts, containers, quantity, equipped/stowed state.** Inventory.
- **The mastery property EFFECTS** (what Cleave or Vex actually do). The rules
  text is in the SRD but rendering it is a content-import question (D3) and it
  is not needed to record a choice. The property NAME is recorded and displayed;
  its effect is not.
- **Multiclass mastery stacking.** Not sourced; §5 refuses to invent it.
- **A completeness check for mastery.** D1b explicitly parks this: "It belongs in
  the deferred completeness list until the model lands, not in v1." The
  allowance lookup this design ships is the thing completeness will later call.
- **Sort order on a character's weapons.** Ordered by `id`. A `sort_order`
  column earns its place when someone asks to reorder, not before.

### F4 confirmation — required by the brief

**Nothing in this design claims the app has a character sheet.** It adds a list
of weapons a character owns and a record of which of them the user has chosen
their mastery on. It derives no hit points, no armour class, no proficiency, no
attack roll, and no damage roll. The coverage fact moves from `not_modelled` to
`partial` — deliberately `partial`, not `modelled`, because equipment as a
concept remains absent and only weapons arrive. `CoverageState` already has that
member (`src/ui/screens/planner/agent-reference.ts:109`), so the honesty is
expressible without inventing a state.

---

## 2. What the SRD actually gives us

From `docs/srd/source/weapons-table.txt`, every one of the 38 rows carries
exactly: name, damage dice, damage type, a property list, **exactly one mastery
property**, weight, and cost. The property vocabulary that appears is closed:

`Ammunition (Range N/M; Kind)`, `Finesse`, `Heavy`, `Light`, `Loading`, `Reach`,
`Thrown (Range N/M)`, `Two-Handed`, `Versatile (dX)`.

The mastery vocabulary is closed at eight: `Cleave, Graze, Nick, Push, Sap,
Slow, Topple, Vex`. All eight appear in the extract; the list is therefore
sourced, not taken from the brief.

Three irregularities the seeder must handle rather than smooth over:

- **Blowgun's damage is `1 Piercing`** — a flat number, not dice. So the damage
  field is a string, not a dice-expression struct.
- **Lance is `Two-Handed (unless mounted)`** — a qualified property. This is the
  single strongest argument for Q4's free-text field: the toggle alone is a lie
  and there is exactly one weapon that proves it.
- **Sling has no weight** (`—`). Irrelevant here since weight is out of scope,
  but it means a later weight column is nullable on real evidence.

---

## 3. Design decision #4 — what happens when the mastery count is not derivable

**The count is not derivable from anything the app stores.** The proof phase
established this by execution: `class_progressions` holds 240 rows whose every
non-key column is a spellcasting quantity, and the 80 rows belonging to
Barbarian, Fighter, Monk and Rogue are empty but for a level number. F6 confirms
it from the SRD side. This is settled and is not re-derived here.

What is NOT settled is which numbers we are entitled to write down.

| class | SRD shape | in `docs/srd/source/`? | design treats it as |
|---|---|---|---|
| Fighter | Weapon Mastery column, 3→4→5→6 | **yes**, verbatim | `counts_known`, 20 seeded rows |
| Barbarian | Weapon Mastery column, 2→3→4 | **yes**, verbatim | `counts_known`, 20 seeded rows |
| Paladin | flat, stated in feature text | **no** | `counts_unsourced` |
| Ranger | flat, stated in feature text | **no** | `counts_unsourced` |
| Rogue | flat, stated in feature text | **no** | `counts_unsourced` |
| the other 7 | no Weapon Mastery feature | **no** (asserted by F6) | `not_granted` |

### The rule

**Missing content is modelled as a state, never as a number.** Three
consequences, and each is load-bearing:

1. **The seeder writes only what is in `docs/srd/source/`.** It parses the
   extracts; it does not carry a hand-typed table. If a value is not in a file
   under `docs/srd/source/`, no row is written for it. This makes the seed
   diffable against the extract, which is the property that makes licensed
   reference data reviewable at all.
2. **`counts_unsourced` is a first-class, seeded value — not an absent row.**
   Paladin, Ranger and Rogue get a `class_weapon_mastery_grants` row saying "this
   class grants Weapon Mastery and we do not have its count". The UI then says
   exactly that. A user who multiclasses into Rogue is told the app is missing a
   number, rather than being shown zero mastery choices and quietly losing an
   entitlement.
3. **The lookup's fallback for a missing row is `content_missing`, not 0.** A
   database seeded before this feature existed, or a class the seeder did not
   cover, resolves to "unknown" and surfaces. Falling back to zero would make an
   un-run seeder indistinguishable from a class that genuinely has no mastery —
   the exact silent-wrong this whole decision log exists to prevent.

### Closing the gap is a cheap, separate, reviewable step

Anyone may promote `counts_unsourced` → `counts_known` by extending the extract:
run the `pdftotext` command already recorded in `docs/srd/SOURCE.md`, take the
Paladin, Ranger and Rogue feature tables and level-1 feature text, commit them
under `docs/srd/source/` with the attribution header the other extracts carry,
and add the rows. That is a content commit with a provenance trail, reviewable
on its own. It is deliberately **not** bundled into the weapons implementation,
so that "we shipped weapons" and "we transcribed three more class tables" cannot
be confused with each other.

**What must not happen:** writing `2` for those three classes because it is
almost certainly right. It probably is right. It is still a number with no
source in this repository, and F6 exists because the last person to be
"probably right" from memory left no way to check.

---

## 4. Design decision #1 — the tables

New module `db/schema/weapons.ts`, re-exported from `db/schema/index.ts`
(`tests/unit/schema-modules.test.ts` fails otherwise). Column primitives come
from `db/schema/columns.ts` — `varchar()`, `sqlText()`, `datetime()`,
`tinyint1`, `laravelDefault` — so the generated SQL keeps the declared-type
conventions the rest of the schema uses.

`created_at` / `updated_at` are `DATETIME` nullable on all four tables. That is
not a new nullability argument: all 38 existing tables do it, the backup format
round-trips it, and diverging here would make weapons the one table shape the
generic passes handle differently.

### 4.1 `character_weapons` — the values a character owns

Direct child of `characters`, cascade delete, exactly as `character_class_levels`
is. One row per weapon. The character stores VALUES; there is no template
reference, by D1b.

| column | type | null | notes |
|---|---|---|---|
| `id` | integer PK autoincrement | no | |
| `character_id` | integer FK → `characters.id` ON DELETE cascade | no | |
| `name` | VARCHAR | no | user-typed or template-filled |
| `damage_dice` | VARCHAR | **yes** | `"1d8"`, `"2d6"`, or `"1"` |
| `damage_type` | VARCHAR | **yes** | open vocabulary, see below |
| `versatile_damage_dice` | VARCHAR | **yes** | presence IS the Versatile property |
| `finesse` | TINYINT(1) DEFAULT '0' | no | |
| `heavy` | TINYINT(1) DEFAULT '0' | no | |
| `light` | TINYINT(1) DEFAULT '0' | no | |
| `loading` | TINYINT(1) DEFAULT '0' | no | |
| `reach` | TINYINT(1) DEFAULT '0' | no | |
| `thrown` | TINYINT(1) DEFAULT '0' | no | |
| `two_handed` | TINYINT(1) DEFAULT '0' | no | |
| `ammunition` | TINYINT(1) DEFAULT '0' | no | |
| `ammunition_kind` | VARCHAR | **yes** | `"Bolt"`, `"Arrow"`, `"Bullet"`, `"Needle"` |
| `range_normal_feet` | integer | **yes** | |
| `range_long_feet` | integer | **yes** | |
| `mastery_property` | VARCHAR | **yes** | one of the eight, or none |
| `mastery_selected` | TINYINT(1) DEFAULT '0' | no | the D1b per-character choice |
| `other_properties` | TEXT | **yes** | Q4's free-text field |
| `notes` | TEXT | **yes** | |
| `created_at`, `updated_at` | DATETIME | yes | |

Named CHECK, following the `spell_slots_exclusive_assignment_check` precedent at
`db/schema/character.ts:272`:

```
character_weapons_mastery_requires_property_check:
  mastery_selected = 0 OR mastery_property IS NOT NULL
```

You cannot select mastery on a weapon that has no mastery property. That is a
real rule, it is cheap, and it makes an incoherent row unrepresentable.

Index: `character_weapons_character_id_index` on `character_id` — every read is
"this character's weapons".

`damage_type` is an open `varchar()` rather than an enum. Precedent:
`spell_version_damage_types.damage_type` is `varchar().notNull()` with no enum
(`db/schema/catalog-spells.ts:236`), and D1's whole point is that a user-defined
weapon may do whatever damage the user says. The UI offers the three SRD weapon
types as suggestions and accepts anything.

### 4.2 `weapon_templates` — catalog, seeded from the extract

| column | type | null | notes |
|---|---|---|---|
| `id` | integer PK autoincrement | no | |
| `content_key` | VARCHAR unique | no | e.g. `srd-5-2:longsword` |
| `rules_edition` | VARCHAR DEFAULT '2024' | no | matches `class_definitions` |
| `name` | VARCHAR | no | |
| `srd_group` | VARCHAR | no | see the note below |
| `damage_dice` | VARCHAR | no | all 38 have one |
| `damage_type` | VARCHAR | no | all 38 have one |
| `versatile_damage_dice` | VARCHAR | **yes** | 7 of 38 |
| the 8 property booleans | TINYINT(1) DEFAULT '0' | no | same names as §4.1 |
| `ammunition_kind` | VARCHAR | **yes** | |
| `range_normal_feet`, `range_long_feet` | integer | **yes** | |
| `mastery_property` | VARCHAR | **no** | all 38 have exactly one |
| `other_properties` | TEXT | **yes** | Lance |
| `created_at`, `updated_at` | DATETIME | yes | |

**Invariant worth stating in the module doc:** the template's fillable columns
are exactly the character weapon's fillable columns. Pre-fill is a column-wise
copy with no mapping table. A template column that a weapon cannot hold is dead
weight; a weapon field a template cannot fill is a field the picker silently
leaves blank. Both are bugs, and keeping the two lists identical by inspection
is how they are prevented.

`mastery_property` being NOT NULL here and nullable in §4.1 is not an
inconsistency — it is the sourced fact. Every SRD weapon has a mastery property;
a weapon the user invented need not.

**On `srd_group`** (`simple_melee` | `simple_ranged` | `martial_melee` |
`martial_ranged`): this is **not** the `category: simple|martial` field R1 and
D1b struck down, and I am not relitigating that. The superseded field lived on
the *character's weapon* and implied a proficiency model. This one lives only on
the catalog row, is never copied into `character_weapons`, and exists solely so
a 38-item picker can be grouped the way the SRD's own table groups it — which
is both a browse aid for a human and a stable set of headings an agent can
target. A character's weapon has no category, before or after this design.
If a reviewer disagrees, deleting the column costs nothing: the picker falls
back to alphabetical order with a search box.

### 4.3 `class_weapon_mastery_grants` — one row per class

| column | type | null |
|---|---|---|
| `id` | integer PK autoincrement | no |
| `class_definition_id` | integer FK → `class_definitions.id` cascade, **unique** | no |
| `grant` | VARCHAR | no |
| `created_at`, `updated_at` | DATETIME | yes |

`grant` ∈ `'not_granted' | 'counts_known' | 'counts_unsourced'`, typed through
a `WeaponMasteryGrant` union added to `src/domain/enums.ts` next to the existing
`as const` arrays, and threaded via `varchar<WeaponMasteryGrant>()`.

Twelve rows, one per seeded class.

### 4.4 `class_weapon_mastery_counts` — sourced numbers only

| column | type | null |
|---|---|---|
| `id` | integer PK autoincrement | no |
| `class_definition_id` | integer FK → `class_definitions.id` cascade | no |
| `class_level` | integer | no |
| `mastery_count` | integer | no |
| `created_at`, `updated_at` | DATETIME | yes |

Unique on `(class_definition_id, class_level)`. Forty rows: Barbarian 1–20,
Fighter 1–20. **Every row is traceable to a line in
`docs/srd/source/weapon-mastery-progression.txt`, and nothing else is in here.**

### 4.5 The nullable audit (D6 / D6b / D6d), column by column

D6d applies too: the TypeScript read-model that carries these to the UI must not
re-introduce optionality the columns do not have. The eight property booleans
are `boolean`, not `boolean | undefined`, all the way to the render.

**Restructurings tried FIRST and rejected, with reasons.** D6 requires these be
considered before any null is declared, so they are recorded rather than implied.

1. **`character_weapon_ranges` as a 1:0..1 child** (removes `range_normal_feet`,
   `range_long_feet`). Rejected under D6b's explicit anti-over-engineering
   clause. Two integers do not earn a table and a join, and it makes a
   progressive form insert a row on the first keystroke into a range box and
   delete it when the user clears it — more moving parts, in the writer, to win
   a type argument.
2. **Melee / ranged variant tables.** Rejected because the variant does not
   exist in the domain: Dagger, Handaxe, Javelin, Light Hammer, Spear and
   Trident are all Thrown melee weapons in the extract. Splitting on a
   distinction the source does not make would force six weapons into both tables
   or neither.
3. **`character_weapon_properties`, one row per property.** Rejected: it
   converts nine compile-known booleans into runtime strings, adds a join to
   every list render, and is exactly the open key/value shape Q4 rules out.
4. **A JSON `properties` blob.** Same objection, plus it is unqueryable and
   would need an entry in `src/domain/contracts/json-columns.ts` to be validated
   at all.
5. **A separate `character_weapon_masteries` table** instead of
   `mastery_selected`. Considered seriously, because it is the natural place to
   record *which class's allowance a selection consumes*. Rejected on two
   grounds: D1b fixes the shape as "the character's weapon entry gains 'mastery
   selected for this weapon' state", and — more importantly — we have no sourced
   rule for how multiclass allowances combine (§5), so the extra table would
   exist to hold a fact we are not entitled to compute. Building structure for
   an unknown rule is how the unknown rule gets invented later by accident.
6. **`versatile` boolean + `versatile_damage_dice`.** Rejected in favour of the
   die alone. The boolean is derivable from the die, and keeping both admits the
   impossible state `versatile = 1, die = NULL`. This is D6's "would a value
   object absorb it?" answered yes: one column carries both the presence and the
   payload, and one impossible state disappears. Rendering "Versatile (1d10)"
   needs only the die.

**Every remaining null, with its justification.**

| column(s) | limb | argument |
|---|---|---|
| `character_weapons.damage_dice`, `.damage_type` | **D6b 1 + 3** | A user adds "Grandfather's sword" and has not looked up its damage. Forbidding that makes weapon creation an all-or-nothing modal, which limb 3 says not to do. These are exactly the columns a later completeness check reports on, and D6b states outright that "a nullable column that completeness reports on is correctly nullable". Not a default in disguise — there is no sensible default damage, and `''` would be a null wearing a costume. |
| `character_weapons.versatile_damage_dice`, `weapon_templates.versatile_damage_dice` | **D6b 2** | 31 of the 38 SRD weapons genuinely have no versatile die. The SRD cannot be represented without the absence. Direct analogue of `spell_versions.action_type`, which D6c DEFENDS for the same reason. |
| `.range_normal_feet`, `.range_long_feet` (both tables) | **D6b 2** | A Longsword has no range. Not "unset" — it does not have one. |
| `.ammunition_kind` (both tables) | **D6b 2**, plus 1 on the character side | Melee weapons have no ammunition. On a custom weapon the user may also have ticked Ammunition without yet typing the kind. |
| `character_weapons.mastery_property` | **D6b 2** | A user-defined weapon legitimately has no mastery property. That it is NOT NULL on the template and nullable on the character is the evidence: the SRD's 38 all have one, invented weapons need not. |
| `.other_properties`, `.notes` (both tables) | **D6c precedent** | D6c's DEFEND list covers "all user-facing `notes` / `note` columns" without qualification. `other_properties` is the same thing: free text, absent for 37 of 38 SRD weapons and for most user weapons. |
| `created_at`, `updated_at` (all four tables) | consistency | Every existing table. Not a domain claim. |

**Deliberately not nullable, where it would have been convenient:**
`class_weapon_mastery_counts.mastery_count`. The obvious shortcut is one table
with a nullable count where NULL means "unsourced". That null would stand for
*our transcription state*, not for anything in the domain — which is precisely
the migration-artifact nullability D6 says must never reach a contract. Splitting
grants from counts (§4.3/§4.4) makes both tables null-free and makes the counts
table a pure, diffable image of the extract. This is the one place a
restructuring was chosen OVER a null, and it was chosen because it is
independently better for the domain, per D6b's own test.

**No both-or-neither CHECK on the range pair.** It was considered and dropped: a
user typing `20` into the normal-range box and tabbing away before typing the
long range would trip it, and D6b makes half-decided a first-class state. A
half-filled range is a completeness observation, not a constraint violation.
This is a judgement call and is flagged as such.

---

## 5. The mastery allowance lookup

New `src/rules/weapon-mastery-lookup.ts`, sibling of
`src/rules/class-progression-lookup.ts` and following its shape.

```
type MasteryAllowance =
  | { state: 'not_granted' }
  | { state: 'known'; count: number }
  | { state: 'unsourced' }
  | { state: 'content_missing' };
```

Per class: read the `class_weapon_mastery_grants` row.

- no row → `content_missing`
- `not_granted` → `not_granted`
- `counts_unsourced` → `unsourced`
- `counts_known` → the greatest `class_level <= character's level in that class`
  from `class_weapon_mastery_counts`; that row's `mastery_count`. No row at or
  below the level → `content_missing`, **not** zero.

Counts are stored as ABSOLUTE per level, matching how the SRD prints them, so
resolution is `ORDER BY class_level DESC LIMIT 1` and never a running sum. That
also means a partially-seeded table degrades to a stale-but-real number rather
than to a wrong one.

### Per character, across classes

| situation | what the app does |
|---|---|
| no class grants mastery | no mastery UI; the weapons list has no mastery column |
| exactly one class grants, `known` | allowance = that count; selection count is compared against it |
| any granting class is `unsourced` / `content_missing` | allowance is UNKNOWN. Selection stays fully available. The UI states which class we lack the number for. |
| two or more classes grant | allowance is UNRESOLVED. Show each class's number separately. **Do not sum. Do not take the maximum.** |

The multiclass case deserves the emphasis. Summing is the obvious guess and it
may well be wrong; we have no sourced rule and D5 keeps multiclass judgement
with the planner, which already surfaces rather than decides. The app shows
"Fighter 4 · Rogue (count not available)" and says it does not know how they
combine. D1's "let people sort it out at the table" is the governing spirit.

**Selection is advisory and is never hard-blocked.** Over-selecting produces a
warning, and a warning can only be produced when the allowance is `known` and
single-class. Blocking would require the app to be certain, and it is not.

---

## 6. Design decision #3 — mastery does NOT reuse the grant-rule machinery

The proof phase recommended reusing the rule-authoring and level-resolution
layer while avoiding `spell_selection_slots`. Having read the shape of the
selection, this design goes further: **reuse none of it.** Five reasons, in
descending weight.

1. **There is nothing to mint.** The grant-rule system's actual product is
   `spell_selection_slots` rows: stable-keyed placeholders
   (`{instanceUuid}:{ruleKey}:{ordinal}`) that `reconcileSlots` revives on
   re-levelling so a user's choice survives. That revival property is the
   machinery's main gift and it has no referent here. Mastery selection is a
   boolean on rows the user already owns and which exist independently of level.
   De-levelling a Fighter does not delete their longsword.
2. **The slot table is spell-typed to the bone.** Two real foreign keys into
   `spell_versions` and the "is it filled?" test built on them; `bucket`
   constrained to five spell buckets and required for any slot-minting kind;
   `spell_level_min`/`spell_level_max` NOT NULL; `GrantRule.level()` rejecting
   anything outside 0–9; and `SpellSelectionEligibility.refresh()` called on
   every slot write, which queries `spell_versions` and `spell_list_memberships`.
   A weapon row would need a lying bucket, two meaningless constants, and a
   special-case branch at a call site that currently has none. D6's "is this
   table actually two things?" would answer yes the moment it landed.
3. **A new `GrantRuleKind` would be a third posture.** `capability` carries no
   count and mints nothing; the slot-minting kinds carry a count and require a
   bucket. Mastery carries a count and mints nothing into slots — a shape the
   parser (`grant-rule.ts:351-391`) currently forbids. Adding it means touching
   the rule parser, the generator switch, and payload validation, to deliver a
   single integer.
4. **The one genuine gift is ten lines.** Cumulative per-level resolution is
   `WHERE class_level <= ? ORDER BY class_level DESC LIMIT 1` against §4.4,
   because our counts are absolute rather than deltas. `ClassProgressionLookup`
   already demonstrates the pattern in this codebase.
5. **Schema-hash safety.** Putting the count on `class_progressions` — as a
   column or as JSON in `grant_rules` — pushes non-spellcasting content into the
   table F4 documents as spellcasting-only, and a new column would move the
   frozen Laravel metadata hash (§7.1). A new table does not.

The rejected alternative is recorded honestly: the grant-rule route would have
given free multiclass fan-out, since each class is its own
`character_source_instances` row. But §5 refuses to combine multiclass
allowances at all, so there is nothing to fan out.

---

## 7. Integration seams

Most of these are compile-gated. They are listed so that "it built" means
something.

### 7.1 The Laravel parity oracle — the one that looks like a blocker

`tests/unit/schema.test.ts` asserts `expect(tables).toEqual(Object.keys(expectedColumns).sort())`
over an exact 38-table inventory, and pins
`laravelColumnMetadataHash = fa0e4e9f…` — a SHA-256 over the ordered
`PRAGMA table_info` of **all** tables. Adding four tables breaks both, and the
brief forbids regenerating an expectation from our own output.

**The honest fix, and it is proved rather than assumed.** The oracle's claim is
"the generated schema reproduces the Laravel migrations exactly". Once native
tables are added deliberately, the claim becomes "…exactly, plus these named
native tables". So:

- keep `expectedColumns` as the frozen Laravel 38 and rename the intent in its
  comment;
- assert `tables` equals the Laravel 38 **plus** a separately declared
  `expectedNativeColumns` set, transcribed by hand from this design the same way
  the Laravel expectations were transcribed from the migrations;
- compute the hash over the Laravel subset only — `tables.filter(t => laravel.includes(t))`.

**Verified by execution, not reasoning.** A throwaway vitest probe loaded the
real `schema.sql`, confirmed 38 tables hashing to `fa0e4e9f…`, then appended
three synthetic tables — including one named `aaa_sorts_first` so it sorts ahead
of everything, and `character_weapons` so it sorts into the middle — and
recomputed the hash over the filtered list. Result: **byte-identical hash**,
41 tables present, filtered order equal to the original. The probe was deleted
after running.

This preserves every failure mode the oracle had: any drift in a Laravel table's
columns, types, nullability, defaults or order still moves the hash, and the new
tables are held to hand-transcribed expectations of their own. Nothing is
weakened and nothing is regenerated.

The other three suites need the same treatment and no more:
`expectedNamedIndexes`, `expectedUniqueGroups`, `expectedForeignKeys` and
`expectedDefaults` each gain hand-written entries for the new tables.

### 7.2 `TABLE_SCOPES` — a compile error until classified

`src/domain/contracts/tables.ts:200` is `satisfies { [N in AnyTableName]: ScopesFor<N> }`,
so declaring a table in `db/schema/` fails to compile until it is classified.
Proposed:

| table | role | snapshot | backupDirect | backup | share | backupReference |
|---|---|---|---|---|---|---|
| `character_weapons` | `character_owned` | true | true | true | true | false |
| `weapon_templates` | `catalog_weapon` | false | false | false | false | **true** |
| `class_weapon_mastery_grants` | `catalog_class` | false | false | false | false | false |
| `class_weapon_mastery_counts` | `catalog_class` | false | false | false | false | false |

`snapshot: true` on `character_weapons` puts weapons in undo/redo, which is
correct — a mis-typed damage die should be undoable like any other edit.

`weapon_templates` needs a new `catalog_weapon` member on the `TableRole` union.
It is not a spell, not a class, and not a feat/species/background; labelling it
`catalog_source` to avoid a one-line union change would make the role field lie.

`backupReference: true` on `weapon_templates` is listed for review and I am not
certain of it. The scope means "a catalog table backups resolve character rows
against by id" — and by D1b a character weapon holds no template id at all, so
the honest value is probably **false**. Recorded here as the one classification
the implementer must settle by reading `ReferenceKind`, not by copying this table.

### 7.3 Backup and sharing — RESOLVED, historical

*Historical. This section recorded a stop-and-report point while `src/backup/`
belonged to another track. The gap is closed; the text is kept because the
reasoning about what must NOT be done is still the reasoning that governs the
result.*

`character_weapons` now ships `snapshot: true`, `backupDirect: true`,
`backup: true`, `share: true`, with the matching arms written in
`src/backup/character-backup.ts` and `src/sharing/character-share.ts`.

The workaround this section warned against — shipping `backup: false` so the
build goes green — was not taken. Neither was the other tempting shortcut, of
making the new table mandatory in the document and quietly breaking every backup
file and share link a user already holds. Old payloads stay readable:
`BACKUP_OPTIONAL_TABLES` for the document, an 11-or-12 element wire tuple for the
link, and a readable-both-ways `a7-v1`/`a7-v2` snapshot schema for save points.

### 7.4 Commands, and a trap in the validator

Four new command types — `add_weapon`, `update_weapon`, `remove_weapon`,
`set_weapon_mastery` — each needing three arms:
`character-command-factory.ts` (compile-enforced, TS2366),
`character-command-executor.ts` `prepareInverse` (compile-enforced), and
`payload-validator.ts` (**not** enforced).

F3a is the trap and it lands squarely on this work: the validator switch returns
after the switch, so a missing arm ships an **unvalidated payload with a clean
typecheck**. Four new command types is four chances to hit it. The design's
recommendation is to fix F3a — make the validator switch exhaustive by
construction — *before* adding the weapon commands, so omission is a compile
error rather than a hole. It is a small, independently valuable change and it is
the difference between "we remembered" and "we cannot forget".

Going through commands is what gives weapons revision bumps, optimistic
concurrency, undo/redo and the audit log for free. `set_weapon_mastery` is
separate from `update_weapon` because it is a different user intent with a
different warning attached, and separating them makes the change log readable.

### 7.5 Generated contracts

`src/domain/contracts/generated/column-facts.ts` and `reference-facts.ts` are
build outputs of `scripts/build-row-contracts.ts`, regenerated from the schema.
That is a build artifact, not an expectation, so regenerating is legitimate —
but `tests/unit/contracts/column-facts-generation.test.ts` must be checked to
confirm it verifies generation rather than pinning content.

`src/db/database-lifecycle.ts`'s `applicationTables` is already derived from the
contracts (`applicationTables = APPLICATION_TABLES`), so image validation picks
the new tables up with no edit.

---

## 8. UI

Standing requirement: plain controls with accessible names, drivable by a
browser AI extension. Concretely that means every control is a real
`<button>`/`<input>`/`<select>` with a `<label for>` or `aria-label`, no
drag-and-drop, no custom widgets, no hover-only affordances, and no state that
exists only in a tooltip.

A **Weapons** section on the planner screen, matching the existing screens'
structure.

**The list.** A table with a caption. One row per weapon: name, damage
(`1d8 Slashing`, or `1d8 Slashing (Versatile 1d10)`), properties as a plain
comma-separated sentence built from the booleans plus `other_properties`, range
when present, mastery property when present, and a mastery checkbox when the
character has any allowance. Row actions are two buttons, `Edit <name>` and
`Remove <name>` — the weapon's name is in the accessible name, so "remove the
longsword" is unambiguous to an agent driving by accessible name.

**Adding.** One `Add weapon` button opening a form with two entry paths on the
same page, not behind a mode toggle:

- a `<select>` labelled `Start from an SRD weapon`, grouped with `<optgroup>` by
  `srd_group`, whose options are the 38 templates plus a first option
  `Custom weapon (fill in yourself)`. Choosing a template fills every field
  below it and leaves them all editable — the whole point of D1b.
- the fields themselves: `Name` (text, required), `Damage dice` (text),
  `Damage type` (text with a datalist of the three SRD types),
  `Versatile damage dice` (text), the eight properties as checkboxes with
  visible labels, `Ammunition kind`, `Normal range (feet)` and
  `Long range (feet)` (number), `Mastery property` (select of the eight plus
  "None"), `Other properties` (text), `Notes` (textarea).

A `<select>` rather than a search-and-filter widget is deliberate: it is one
control, it exposes all 38 options to the accessibility tree at once, and an
agent can set it by option text.

**Mastery.** Above the list, a short block stating the allowance in words:

- `Weapon Mastery: 4 of 4 chosen (Fighter, level 5)` — with the checkboxes
  enabled and a warning appearing if a fifth is ticked;
- `Weapon Mastery: your classes do not grant it` — checkboxes absent entirely;
- `Weapon Mastery: Rogue grants it, but this app does not have the count for
  Rogue. Choose what your table agrees on.` — checkboxes enabled, no warning
  computed;
- `Weapon Mastery: Fighter grants 4, Barbarian grants 3. This app does not know
  how these combine when multiclassing.` — checkboxes enabled, no warning.

Each of these is plain text in the DOM, readable by a human and by an agent,
with no cloaking (D4).

---

## 9. Agent reference and attribution

**Coverage.** `src/ui/screens/planner/agent-reference.ts:164` changes from
`{ concept: 'equipment and weapons', state: 'not_modelled' }` to `'partial'`,
with the surrounding note saying weapons are recorded but no attack bonus,
damage roll, proficiency or inventory is derived. `tests/unit/ui/agent-reference.test.ts:602`
moves with it — the test still asserts a specific state, so it can still fail.

*(Practical note for whoever edits that file: it contains six literal NUL bytes,
so plain `grep` silently prints nothing and exits 1 for it. Use `grep -a`.)*

**The weapon block.** The character's weapons go into the existing
machine-readable agent block as data — name, damage, damage type, properties,
range, mastery property, whether mastery is selected — plus the mastery
allowance as a state, including the `unsourced` and `unresolved` cases. Per D4
this is reference data in `<details>` / `<script type="application/json">`,
never phrased as an instruction to an agent.

**Attribution.** No new licence obligation and no new notice text. SRD 5.2 under
CC-BY-4.0 is already the bundled source and its verbatim notice already reaches
the legal screen, the build report, the printable list and the agent block; the
constant in `src/rules/srd-attribution.ts` is unchanged. Three obligations do
apply to the new material:

1. any new bundled data file (the seeder's parsed template data, if it lands as
   its own module) carries the notice as a header comment, exactly as
   `src/rules/class-progression-lookup.ts:1-7` does;
2. weapons render on the existing print and build-report pages, which already
   carry the footer — a new un-footered page would break the obligation;
3. no attribution to Wizards beyond that exact notice.
   `tests/browser/attribution.spec.ts:65-80` enforces this by asserting
   `/D&D|Dungeons|Wizards/` appears in neither the title nor the body text —
   which means **the weapons UI must not use the phrase "D&D"**, and the SRD
   group labels must read "Simple Melee" and not anything carrying the
   wordmark. That test is a real constraint on the copy, not a formality.

---

## 10. Test plan

- **Schema parity** (§7.1): Laravel 38 unchanged and still hashing to
  `fa0e4e9f…`; new tables held to hand-written column, null, index, unique,
  FK and default expectations.
- **CHECK enforcement**: inserting a `character_weapons` row with
  `mastery_selected = 1` and `mastery_property IS NULL` must throw. Cascade:
  deleting a character removes its weapons.
- **Seeder against the extract, not against itself**: parse
  `docs/srd/source/weapons-table.txt`, assert **38** templates, and assert a
  handful of rows spelled out by hand in the test — Longsword `1d8` Slashing,
  Versatile `1d10`, Sap; Greatsword `2d6` Slashing, Heavy + Two-Handed, Graze;
  Blowgun damage `1`, Loading + Ammunition, range 25/100, kind Needle, Vex;
  Lance carrying its `unless mounted` text in `other_properties`. These are
  transcribed from the extract by a human reading it, so the test can fail if
  the parser is wrong. **A test that asserts "the seeder produced what the
  seeder produced" is worthless here and is forbidden by D7.**
- **Mastery lookup**: Fighter 1→3, 3→3, 4→4, 9→4, 10→5, 16→6, 20→6; Barbarian
  1→2, 4→3, 10→4, 20→4 — all hand-transcribed from the extract. Paladin, Ranger,
  Rogue → `unsourced`. Wizard → `not_granted`. A class with no grant row →
  `content_missing`, **asserted explicitly not to be 0**.
- **Multiclass**: Fighter 5 / Rogue 3 resolves to unresolved-with-a-breakdown,
  and a test asserts the result is neither `7` nor `4` — i.e. that we did not
  quietly start summing.
- **Commands**: each of the four round-trips through undo/redo and bumps the
  revision; each has a payload-validator arm (see F3a).
- **Browser**: add a weapon from a template, edit one field, confirm the edit
  persists and the template is unaffected (D1b's "stores values, not a
  reference" made observable); toggle mastery; confirm every control has an
  accessible name; confirm the attribution spec still passes with the weapons
  section rendered.

Baseline to hold: 530 vitest / 66 files, build exit 0, 52 Playwright, run as
`PLAYWRIGHT_PORT=4181 npx playwright test`. The known `attribution.spec.ts:16`
flake (F5) is to be re-run and reported, never masked.

---

## 11. Open questions for the owner

1. **The Paladin/Ranger/Rogue counts.** Ship with `counts_unsourced` and the
   honest UI (this design's recommendation), or extend the extract first? The
   second is cheap and this design keeps it a separate commit either way.
2. **Multiclass stacking.** The app will say it does not know. If the owner
   knows the rule, one sentence turns four UI states into three.
3. **`weapon_templates.backupReference`** — see §7.2; I believe it should be
   `false`, and the implementer should confirm against `ReferenceKind`.
4. **`srd_group`** — kept as a catalog-only picker grouping (§4.2), deletable at
   no cost if it reads as too close to the superseded `category` field.
5. ~~**Backup ownership** (§7.3)~~ — CLOSED. Weapons are portable: backup, share
   and save-point snapshot, without breaking payloads users already hold.

---

## Appendix — what this design does not claim

- It does not claim the app has a character sheet. It has a spell planner with a
  list of weapons attached (F4).
- It does not claim to know the Paladin, Ranger or Rogue mastery counts.
- It does not claim to know how multiclass mastery allowances combine.
- It does not compute any attack bonus, damage roll, or proficiency.
- It does not claim there are 37 SRD weapons. There are 38.
