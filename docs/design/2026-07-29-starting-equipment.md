# Starting equipment — the last unbuilt step

Binding law: **D65** (the ruling that produced this plan), D56, D33, D35, D7.

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

## 1. The problem the missing source column creates

D65 pins that **weapons and armour in the chosen option become owned rows** —
correctly, because the sheet computes AC and attack profiles from those tables
and a package that skipped them would produce a wrong sheet, which D33 forbids
more strongly than a blank.

But a person may change their mind. Fighter option A (Chain Mail, Greatsword,
Flail, 8 Javelins) → option B (Leather, Longbow, 20 Arrows, Rapier). Removing
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

**Cost of the pinned choice, stated honestly:** one migration (`0011`), a
snapshot bump to **`a7-v10`** with the a7-v9 list hand-frozen first — the alias
trap at `character-state.ts:162` is now documented and must be respected again —
a share wire **v6**, backup carry, and row contracts. That is the same tax the
skills table paid. It is not cheap and it is not optional.

## 3. What the step does

1. Reads the chosen class's options from `class_equipment_items` and the chosen
   background's from `background_equipment_items`, grouped by `option`.
2. The person picks **one option per source**. Both are required before the step
   completes — D65 makes equipment a real step, and D61 already makes background
   required.
3. On confirmation, inside one transaction: mint `character_weapons` /
   `character_armor` rows for the `weapon`/`armor` items of the chosen option,
   each stamped with the granting source instance; record the **choice** (which
   source, which option letter); mint **nothing** for `gear`.
4. Gear renders from the rules tables at read time, never owned (D65).
5. **No gold** (D56, restated in D65). A package's trailing coin is not granted
   and the sheet does not show a purse.

**Changing the option** removes exactly the rows carrying that source instance
and re-mints from the new option. Rows with a NULL source are never touched.

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
- **E-NO-GOLD** — mutate to grant the package's coin. Must fail: no purse, no
  currency field moves.
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

## 8. Open, and NOT blocking

Whether a *later* level-up or a swapped class re-runs the equipment step at all.
Level 1 is the bar; nothing here forecloses it, because the choice is recorded
structurally rather than as prose.
