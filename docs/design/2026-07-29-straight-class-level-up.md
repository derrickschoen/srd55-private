# Straight-class level-up — the last item on the bar

Binding law: **D66** (the hit-point ruling that gates this), D56, D33, D49, D7.

## 0. REVISION 2 EXISTS BECAUSE REVISION 1's PREMISE WAS FALSE

Revision 1 opened by claiming nothing writes `character_hit_point_rolls` and
that there is no level-up command or UI. **Both claims are wrong, a reviewer
caught them, and I confirmed each against the code myself.** They are recorded
here rather than quietly corrected, because the whole shape of the unit changes:
**this is not greenfield work. It is disposing of two entry points that already
exist and already reach the database.**

### Writer 1 — `SetHitPointRollCommand`, `src/commands/sheet-inputs.ts:245`

A real command, fully wired: `DELETE FROM character_hit_point_rolls` at `:270`,
`INSERT INTO character_hit_point_rolls` at `:294`, an `inverse()` at `:302`, a
payload type, a factory case and an executor case, and integration tests. Its
own comment states the semantics: **"no roll means 'use the printed fixed
value'"**.

So revision 1's "REJECTED — absence means fixed" was not rejecting a hypothetical.
**It is the shipped, tested behaviour of an existing command.** Rejecting it is
still right, but it is a change to working code, not a road not taken.

### Writer 2 — `UpdateClassCommand` plus a live planner control

`src/commands/update-class.ts:168` runs `SET subclass_definition_id = ?, level = ?`
for a class the character already has, then calls `generateForSource` (`:224`)
to regenerate grants at the new level. The planner already exposes it:
`src/ui/screens/planner/editors.ts:397-406` renders a `type = 'number'` input
with `max = '20'` whose change handler calls
`actions.updateClass(entry, { level: Number(level.value) })`.

**A person can level their character today** — type a number, features and spell
slots regenerate correctly — **and no hit-point row is ever written.** §5's
"trap" is not a warning about a future implementation. It is a description of
what currently ships.

### How I got it wrong, because the method matters more than the fact

- For the writer, my probe printed `grep(...)[:8]` — I **truncated a list to
  eight and read it as an enumeration.** The `sheet-inputs.ts` INSERT was the
  ninth thing. The standing rule in this project is *a count is not an
  enumeration*; I did worse, I enumerated a slice.
- For the command, I listed `src/commands/*.ts` filenames matching
  `level|hit.?point|class`, got `update-class.ts`, and concluded "no level-up
  command" **without opening it**. The file that levels a class was named in my
  own output and I read it as evidence of absence.

### Facts from revision 1 that DID survive verification

`character_class_levels.level` is a column with default 1 — levelling is an
increment. `character_hit_point_rolls` has exactly `class_name`, `class_level`,
`rolled_value`, CHECK `class_level BETWEEN 1 AND 20` and `rolled_value` 1..12.
`class_name` is a `VARCHAR` with no foreign key. There is no level-up *screen*.

## 1. The live bug this unit closes

`src/rules/sheet.ts:730` computes each level past the first as:

```
const base = roll ?? fixedHitPointsPerLevel(die);
```

With no row, it **silently** takes the fixed value. Nothing on the sheet
distinguishes *"the player chose the fixed value"* from *"no row was ever
written"* — and since the planner can level without writing one, the second case
is reachable today. That is D33's failure in the live code, not a risk to avoid.

## 2. The record — PINNED

**Add `method` to `character_hit_point_rolls`**: `'fixed' | 'rolled'`, NOT NULL.
A row per class level past the first, always written, always saying which.

**Revision 1 also pinned "widen the CHECK". Drop that — it is dead work.**
`hitDieSizes` is closed at `[6, 8, 10, 12]` (`src/domain/enums.ts:511`) and
`fixedHitPointsPerLevel = die/2 + 1` (`src/rules/sheet.ts:634`) yields **4, 5, 6,
7** — every one already inside `rolled_value BETWEEN 1 AND 12`. Verified against
`docs/srd/source/class-level-tables.txt`. The only schema delta is the new
column.

**NOT NULL has a blast radius revision 1 did not name, and "cost to flip: none"
was true only of production data.** Every bare INSERT breaks the moment the
migration lands: `SetHitPointRollCommand` itself (`sheet-inputs.ts:294`) plus raw
inserts in `tests/integration/commands/sheet-inputs.test.ts`,
`tests/integration/queries/character-sheet.test.ts:144,193,557`,
`tests/integration/character/state.test.ts:170`,
`tests/integration/sharing/column-portability.test.ts:1249`,
`tests/integration/rules/sheet-inputs-portability.test.ts:74`, and
`tests/browser/character-sheet.spec.ts:127`. This is L-A's scope and is named
here so it is not discovered mid-dispatch.

## 3. Disposing of the two existing entry points — PINNED, and this is the unit

- **`SetHitPointRollCommand` is EXTENDED, not duplicated**: it carries `method`,
  and its null-means-fixed branch becomes an explicit `method: 'fixed'` row.
  Building a second writer beside it is the F22 trap — one rule in two places.
- **The planner's numeric level input is RETIRED for the levelling path.**
  Leaving it live means the level can still move without a hit-point row, which
  is exactly the bug §1 closes. Multiclass *entry* is untouched (D56 defers
  multiclass level-up; it does not remove entry).
- **The level write and the hit-point row happen in ONE transaction.** A level
  that moved without its row is the unrecoverable state.

## 4. Screen or button — revision 1's pin was vacuous, and this says so

Revision 1 pinned "a button, with a screen only when the level carries a choice",
then admitted the hit-point choice makes every level open something. A reviewer
put it exactly right: the rule is a conditional **with one live branch**. Under
D66 every level 2..20 carries the hit-point choice, so the button-only path never
fires in this unit's scope.

**PINNED, plainly: every level opens the screen.** The conditional was decoration.

## 5. Level 4 — SCOPED IN, because silence would ship a wrong number

`docs/srd/source/class-level-tables.txt` prints **Ability Score Improvement at
level 4** for every class. Revision 1 did not mention it, not even as an
exclusion — so a level-up to 4 would silently grant nothing and say nothing about
a choice the character is owed. That is the confidently-wrong-number shape this
project keeps catching.

D63 already models ability increases as additive contributions that know their
source, so the layer exists. **L-B offers the level-4 increase and records it as
a contribution.** If it proves larger than one dispatch, it is split — but it is
not silently omitted.

## 6. Already solved, stated so nobody rebuilds it

Spell slots and features at the new level need **no new machinery**:
`SourceRuleReader` reads `character_class_levels.level` live and gates on
`active_from_class_level`, and `UpdateClassCommand` already calls
`generateForSource` after a level change. Whatever command lands must call the
same regeneration. `is_starting_class` is untouched by any level path and needs
nothing.

Subclass at level 3 is right for all twelve classes in the seeded 2024 data —
verified, and unlike 2014 where it varies.

## 7. The trap

**Moving the level and letting the sheet re-derive.** Level, proficiency bonus
and features are pure functions of level, so they will all be right. **Hit points
are not**, and they are the one number that cannot be recovered after the fact.
This is not hypothetical here: it is what the planner input does today.

## 8. Controls

- **L-METHOD** — **retargeted; revision 1's mutation was too weak.** "Omit
  `method`" throws at the NOT NULL constraint and nearly any test catches it,
  which proves the constraint, not the writer. The fireable mutation:
  **hardcode `method` to one value regardless of payload.** Must fail: a level
  taken fixed and a level rolled to the same number are distinguishable in the
  stored row.
- **L-UNKNOWN** *(new — §1)* — mutate the sheet's derivation back to the silent
  `roll ?? fixed` fallback. Must fail: a level with **no recorded row** renders
  as **unknown** (D33), not as a confident fixed value. **No control in revision
  1 covered the one live bug this unit exists to close.**
- **L-NO-REDERIVE** — mutate the maximum to average an existing rolled row. Must
  fail: a character who rolled **3** at level 2 shows the total that follows from
  3. Fixture must roll far from the average.
- **L-STRAIGHT** — **the control I would have bet against.** `UpdateClassCommand`
  accepts any `class_definition_id` and has no such guard, so a control scoped to
  "the new screen has no class picker" passes while proving nothing. **The guard
  must live in the COMMAND**: the levelling path refuses a class the character
  does not already have, with a named reason. Mutate the guard away; the refusal
  must fail.
- **L-SUBCLASS** — same layer rule: a **structured refusal before the
  transaction**, matching E-B's precedent, not a greyed-out button. Mutate the
  refusal away; level 3 with a null subclass must fail.
- **L-PERSIST** — reload after levelling: level, method and value all survive,
  asserted from disk.

## 9. Dispatches

- **L-A — the record and the writers.** The `method` column and its migration,
  `SetHitPointRollCommand` extended, every bare INSERT in §2's list updated, the
  level-and-row single transaction, the command-layer guards from L-STRAIGHT and
  L-SUBCLASS, row contracts, snapshot/backup/wire carry.
- **L-B — the screen.** The level-up screen, the hit-point choice defaulting to
  fixed, the subclass choice at 3, the level-4 increase, the sheet's derivation
  and its unknown disclosure, and **retiring the planner's level input**.

## 10. NOT in this unit

Multiclass level-up (D56). Levelling down. The D67 reveal. `class_name` staying a
VARCHAR rather than a foreign key — a real weakness, recorded so it is not
mistaken for an oversight; nothing here depends on changing it.
