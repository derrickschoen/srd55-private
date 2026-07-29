# Starting equipment — the last unbuilt step

Binding law: **D65** (the ruling that produced this plan), **D42.5/D42.6/D42.7**,
D56, D33, D35, D7.

**Revision 1 omitted D42 entirely and a reviewer caught it** — three owner
rulings about this exact step. D42.6 (`decisions.md:1893`) **already answers**
what revision 1's §8 called open: a new class re-opens the kit **as a suggestion
that never rewrites a choice**. Treating a settled question as open is the drift
the decisions file exists to stop. D42.5 (`:1861`, the Dex-vs-Str suitability
suggestion) and D42.7 (`:1917`, the attack-cantrip / pact-weapon note) are
**deferred, not ignored** — 42.7 depends on spells, which are not in this unit —
and this sentence is the disclosure that makes deferring them honest.

## 0. What is actually true right now, proven before this plan was written

Each of these was checked against the repo, not recalled:

- **`guided-creation.ts:183` hardcodes `equipment: false`.** Every other step's
  flag reads real evidence. Equipment is the only one that cannot ever be true,
  which is the whole gap.
- **The rules side is built and seeded.** `class_equipment_items` (options
  `a`/`b`/`c`, `schema.sql:502`) and `background_equipment_items` (options
  `a`/`b`, `:47`) both carry `quantity`, `item_name`, an
  `item_kind IN ('gear','weapon','armor')`, and — for the two catalogued kinds —
  a real FK to `weapon_templates` / `armor_templates` guarded by a payload CHECK.
  They are seeded by `src/rules/class-equipment-srd.ts` and
  `src/rules/origins-srd.ts` respectively.
- **`background_templates.equipment_option_a/b` are separately TEXT prose**
  (`:89`), alongside the structured rows. Two representations of one fact
  already coexist; this plan must not add a third.
- **NEITHER `character_weapons` NOR `character_armor` HAS A SOURCE COLUMN.**
  `character_weapons` (`:377`) and `character_armor` (`:119`) carry
  `character_id` and nothing else identifying. **This is the central problem and
  every design decision below falls out of it.**

## 0b. THE SINKER, found in review and confirmed by me: plural weapons are seeded as GEAR

`src/rules/class-equipment-srd.ts:61-62` says it in its own words: *"Plurals such
as `Javelins` … do not equal a template name and remain gear."* `parseEquipmentEntry`
strips the count, misses the plural in the catalog, and falls through to
`item_kind: 'gear'`. Counted in `docs/srd/source/class-starting-equipment.txt`:
**"2 Daggers" ×5, "5 Daggers", "4 Handaxes", "6 Javelins", "8 Javelins"** — nine
lines across the class list.

So a mint keyed on `item_kind = 'weapon'` is **correct against the schema and
wrong against the data**. **Bard option A mints ZERO weapons**, because its only
weapons are "2 Daggers". Monk, Barbarian and every 2-Daggers class lose their
actual weapons. And revision 1's own §1 argument — that skipping weapons produces
a wrong sheet, which D33 forbids — indicts its own step for five classes.

Worse, **no control in revision 1 catches it.** An E-SOURCE fixture naturally
picks a singular weapon; E-NO-GEAR *passes* when daggers mint nothing. All six go
green on a build that silently disarms a Bard. That is §5's trap one layer down:
correct totals attached to the wrong **classification**.

**PINNED: the seed classification is fixed, not worked around.** A leading count
followed by a plural resolves to `quantity: N` against the singular template, so
"8 Javelins" becomes eight Javelin rows' worth of one linked item. Pre-alpha
licenses replacing the parser rather than accommodating it. **A control must fail
when a plural bundle mints nothing** — E-PLURAL, below.

Revision 1 also got its own worked example wrong twice: Fighter B is *Studded
Leather, Scimitar, Shortsword, Longbow, 20 Arrows, Quiver, 11 GP*, not what I
wrote from memory. Examples in this plan now come from the extract.

## 0c. Gold-only options exist, so most sources offer exactly ONE choice

Every class's last option is pure GP (`or (B) 75 GP` across 11 classes, `(C) 155
GP` for Fighter), and **every background's option B is "50 GP"**. `MONEY_LINE`
(`equipment-packages.ts:30,83-90`) seeds these as ordinary gear rows.

D56 forbids offering the gold. Therefore, once gold-only options are suppressed,
**11 of 12 classes and every background have one offerable option** and the step
is a confirmation, not a choice, in the common case. Consequences the plan must
carry rather than discover:

- **Fighter is the ONLY class with two non-gold options.** Every fixture that
  switches options — E-PRESERVE, E-SHARE — must be a Fighter, or it is testing
  nothing.
- An in-package coin line ("11 GP", "4 GP") is a gear row and **must be filtered
  from the rendered contents**, or §4 shows a purse that §3 says we do not grant.

## 1. The problem the missing source column creates

D65 pins that **weapons and armour in the chosen option become owned rows** —
correctly, because the sheet computes AC and attack profiles from those tables
and a package that skipped them would produce a wrong sheet, which D33 forbids
more strongly than a blank.

But a person may change their mind. Fighter option A (*Chain Mail, Greatsword,
Flail, 8 Javelins, Dungeoneer's Pack, 4 GP*) → option B (*Studded Leather,
Scimitar, Shortsword, Longbow, 20 Arrows, Quiver, Dungeoneer's Pack, 11 GP*) —
both from the extract, and Fighter is the only class where this switch is even
constructible (§0c). Removing
what A minted requires knowing which rows A minted. With no source column the
only available tests are by name and by shape — and a player who typed
"Greatsword" by hand has a row indistinguishable from the granted one.

**This is the species-cleanup trap that a mutation control caught earlier in this
effort**, where a cleanup would have destroyed a planner-added source. It is also
the exact defect the skills unit's provenance work exists to prevent. Repeating
it in equipment, one unit later, with the lesson already written down, would be
the worst available outcome.

## 2. The decision, and the two candidates that lose

**PINNED: add `source_instance_id` (nullable, FK to
`character_source_instances`, same-character composite) to `character_weapons`
and `character_armor`.** NULL means "a person put this here" and is the default
for every existing row and every hand-added one. Non-NULL means a rule granted
it, and only rules may remove it.

*Rejected — one-shot equipment, no changing your mind.* Cheapest, and it needs no
migration. It also puts a dead end inside the wizard, which is the precise thing
D54's bar forbids: *"without a dead end."*

*Rejected — remove by name match.* No migration either. It silently eats a
player's own Greatsword the first time someone switches options, and it fails
silently, which is worse than failing loudly.

**Cost of the pinned choice — and revision 1 overstated it, which is a finding
against my own plan.** I wrote that this pays "the same tax the skills table
paid." It does not. Skills added a **table**; this adds a **nullable column to
rows that are already carried**, and the repo has a named mechanism for exactly
that: `ADDED_NULLABLE_ROW_COLUMNS`
(`src/domain/contracts/historical-row-columns.ts:14-25`), which
`character_weapons` has already used **twice** — `proficiency_category` and
`attack_kind` — **with no snapshot bump**, shared by all three portability paths.

**PINNED: no `a7-v10`.** `source_instance_id` is added to that map. NULL on a
historical row is not a fabrication — it is the literal pre-feature truth,
because before this step nothing but a person could have put a weapon there.

**Also a finding against revision 1:** it cited "the alias trap at
`character-state.ts:162`". That line is now `A7_V7_TABLES`, a historical freeze.
The live aliases are **`:186` (`'a7-v9': CHARACTER_STATE_TABLES`) and `:297`
(`'a7-v9': CHARACTER_STATE_COLUMNS`) — two maps, not one.** I carried a line
number from before S-A shifted the file: F17, positional anchors drift, inside
the plan that warns about it. No bump is minted here, but if one ever is, both
maps freeze.

**What remains:** migration `0011`, share wire **v6**, backup carry, row
contracts.

**Wire v6, which revision 1 left silent.** `AdjacentMigrations`
(`src/sharing/wire-schemas/index.ts`) forces a `migrateV5ToV6` to exist —
"refused" cannot mean "omitted", it would not compile. Unlike the pre-v5 case,
the honest answer here is cheap and it is **not** a retirement: every pre-v6
document predates minting, so **`migrateV5ToV6` appends a null sourceRef** and
fabricates nothing. Do not re-litigate the retirement debate in this dispatch.
**Armor has its own wire tuple and needs the sourceRef too** — revision 1's
E-SHARE said "each weapon" and forgot it. The recorded **choice** must also
travel, or an imported clone (D62) loses its package line and regresses to
equipment-incomplete.

## 3. What the step does

1. Reads the chosen class's options from `class_equipment_items` and the chosen
   background's from `background_equipment_items`, grouped by `option`.
2. The person picks **one option per source**. Both are required before the step
   completes — D65 makes equipment a real step, and D61 already makes background
   required.
3. On confirmation, inside one transaction: mint `character_weapons` /
   `character_armor` rows for the `weapon`/`armor` items of the chosen option,
   each stamped with the granting source instance; record the **choice**; mint
   **nothing** for `gear`.

   **PINNED, because revision 1 said "record the choice" and never said where —
   which is the E-A/E-B seam gap a reviewer named.** The choice lives in the
   **source instance's `config`**, the pattern `applyGuidedBackgroundChoices`
   already uses (`guided-creation.ts:1336-1362`), and `config` is **already on
   the wire** (`wire-schemas/v1.ts:160`), so it travels for free. Completeness
   (E-COMPLETE), the sheet's package line (§4) and share import all read it, so
   it cannot be left for whoever gets there first.
4. Gear renders from the rules tables at read time, never owned (D65).
5. **No gold** (D56, restated in D65). A package's trailing coin is not granted
   and the sheet does not show a purse.

**Changing the option** removes exactly the rows carrying that source instance
and re-mints from the new option. Rows with a NULL source are never touched.

**Two refusals revision 1 had no vocabulary for.**

- **Armor slot collision.** `character_armor` is UNIQUE on
  `(character_id, slot)` with `slot IN ('worn','shield')`
  (`schema.sql:134,143`). Minting Chain Mail for a character who hand-added worn
  armour is a **raw SQLite constraint violation** as revision 1 stood. Pinned: a
  **named refusal with a whole-apply rollback**, exactly the shape S-B built for
  `skill_already_held` (`1031f4d`) — the person is told which item collided and
  offered the same remedy, never a stack trace and never a silent overwrite.
- **A background with no source instance.** The record-only `applyOrigin` arm
  mints no instance, so a character who reached the equipment step that way has
  **nothing to stamp background items with**. Pinned: that path produces the
  instance before minting, because a granted row with a NULL source is
  indistinguishable from a hand-added one, which is the entire defect this plan
  exists to prevent.

## 4. What the sheet must say

Per D33 and D65, the sheet states **gear is not itemised** — it does not imply an
empty inventory by showing nothing. The recorded package name is shown with its
contents from the rules tables, marked as not tracked individually.

## 5. The trap

**Minting weapons through the same path the planner uses for hand-added ones and
assuming the source stamp comes along.** The planner's add-weapon path exists,
works, and will compile if reused verbatim — and will produce granted rows with
NULL sources, which look correct in every test that counts weapons or reads the
sheet. The AC is right, the attack profile is right, the round trip is faithful.
Only switching options reveals it, by silently deleting nothing or everything.

That is the same shape as this effort's earlier trap: *correct totals attached to
the wrong provenance*, which passed four controls before a fifth caught it.

## 6. Controls

- **E-SOURCE** — mutate the mint path to drop the source stamp. Must fail: a
  granted Greatsword is distinguishable from a hand-added one, asserted on the
  row's `source_instance_id`, not on any count.
- **E-PRESERVE** — mutate option-change cleanup to remove by `character_id`
  alone. Must fail: a player-added weapon **survives** a switch from option A to
  option B. Fixture must contain a hand-added weapon whose name **collides** with
  a granted one, or the mutation is unobservable.
- **E-NO-GEAR** — mutate the mint to also create rows for `gear` items. Must
  fail: a Dungeoneer's Pack produces no owned row, and the sheet still names it.
- **E-NO-GOLD** — **retargeted; as written it could not fire.** There is no
  currency column in the schema at all (`drizzle/0004_retire_coin.sql` removed
  it), so "no currency field moves" is **vacuously true under every possible
  mutation**, and the GP line has no code site distinct from E-NO-GEAR because it
  *is* a gear row (`equipment-packages.ts:83-90`). This is the
  mutation-lands-in-nothing class this effort has already been bitten by. The
  fireable shape: **mutate away the coin-line display filter**, and assert that a
  Fighter's rendered package contents do **not** include "4 GP" and that
  gold-only options are **not offered** at all.
- **E-PLURAL** *(new — §0b)* — mutate the seed classification back to leaving
  plurals as gear. Must fail: **a Bard's option A mints two Daggers**, as owned
  weapon rows with the class source stamped. This is the control whose absence
  would have shipped a silently disarmed Bard past all six of revision 1's.
- **E-COMPLETE** — mutate `equipment` completeness back to a constant. Must fail
  in both directions: false before a choice, true after, for both sources.
- **E-SHARE** — a v6 round trip preserves which source granted each weapon,
  including a character who switched options once.

Every fixture must make its mutation observable. A class whose only option
contains no weapons cannot exercise E-SOURCE; a fixture with no hand-added
weapon cannot exercise E-PRESERVE.

## 7. Dispatches

- **E-A — the source column and the mint.** Migration `0011`, both tables,
  `a7-v10` (freeze a7-v9 first), wire v6, backup, row contracts, the mint and
  cleanup keyed on source instance.
- **E-B — the step.** Reads both option sets, records the choice, drives
  completeness, and the sheet's not-itemised disclosure.

E-A owns the column, the migration and every persistence contract. E-B consumes
them.

## 8. NOT open — D42.6 settled it, and revision 1 wrongly called it open

A new class **re-opens the kit as a suggestion that never rewrites a choice**
(D42.6). The `config`-recorded choice is what makes that implementable: a
suggestion can be offered against a recorded decision, where it could not be
offered against prose.
