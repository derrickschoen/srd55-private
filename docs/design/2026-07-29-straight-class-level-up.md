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

**NOT NULL has a blast radius, and revision 2's list of it was itself wrong —
a second reviewer corrected it and I verified every entry.** Revision 2 named
`tests/integration/commands/sheet-inputs.test.ts` as holding a bare INSERT: it
holds **zero** (its hit-point rows go through the command; it breaks anyway, but
because the payload gains a field). And it MISSED three writers, one of them
**production code**:

**Production writers:**
- `SetHitPointRollCommand` — `src/commands/sheet-inputs.ts:294`.
- **`src/sharing/character-share.ts:1938` — share import**, an explicit-column
  `INSERT` listing `character_id, class_name, class_level, rolled_value`.
  Verified by reading it. A NOT NULL column not in that list fails on the first
  import.
- `src/backup/character-backup.ts:1920-1923` — `insertPortableRow` is
  **document-driven**, so a backup written before the column violates NOT NULL
  unless the backup layer supplies a default. This is exactly the
  "optional for older files" handling the skills unit needed (`bf7bc14`).

**Test writers, verified individually:**
`tests/integration/queries/character-sheet.test.ts:144,193,557`,
`tests/integration/character/state.test.ts:170`,
`tests/integration/sharing/column-portability.test.ts:1249`,
`tests/integration/rules/sheet-inputs-portability.test.ts:74`,
`tests/browser/character-sheet.spec.ts:127`,
`tests/unit/schema-check-constraints.test.ts:343` (its `hitPointRoll` helper),
plus `tests/integration/commands/sheet-inputs.test.ts` for the payload change.

**And what a `method: 'fixed'` row STORES was never said.** `rolled_value` is
`integer NOT NULL` (verified in `schema.sql`), so a fixed row **stores the
class's fixed value** (4/5/6/7) and `method` is what disambiguates it from a roll
that happened to land there. The column keeps its name; renaming it is a
migration this unit does not need.

## 3. Disposing of the two existing entry points — PINNED, and this is the unit

- **`SetHitPointRollCommand` is EXTENDED, not duplicated**: it carries `method`,
  and its null-means-fixed branch becomes an explicit `method: 'fixed'` row.
  Building a second writer beside it is the F22 trap — one rule in two places.
- **The planner's numeric level input is RETIRED for the levelling path**, and
  **`level` is STRIPPED FROM THE `update_class` PAYLOAD.** Revision 2 retired the
  input and left the command's power intact — `payload-validator.ts:854` still
  accepts any level 1..20, so any other caller re-opens the exact bug §1 closes
  and **L-STRAIGHT would not fire, because it guards the NEW command.** A second
  reviewer named this as the closest thing to a dispatch-killer after the seam.
  `update_class` keeps entry and subclass; levelling belongs to one path.
  Multiclass *entry* is untouched (D56 defers multiclass level-up, it does not
  remove entry).
- **Retiring the input moves browser tests revision 2 did not name**:
  `tests/browser/weapons.spec.ts:355-356,588-591` and
  `tests/browser/agent-reference.spec.ts:342` all drive the level spinbutton.
  They are retargeted, not deleted — their subjects are weapons and the agent
  reference, not the input.
- **The level write and the hit-point row happen in ONE transaction.** A level
  that moved without its row is the unrecoverable state.

## 4. Screen or button — revision 1's pin was vacuous, and this says so

Revision 1 pinned "a button, with a screen only when the level carries a choice",
then admitted the hit-point choice makes every level open something. A reviewer
put it exactly right: the rule is a conditional **with one live branch**. Under
D66 every level 2..20 carries the hit-point choice, so the button-only path never
fires in this unit's scope.

**PINNED, plainly: every level opens the screen.** The conditional was decoration.

## 5. Ability Score Improvement — revision 2 said "level 4" and that was WRONG

**Verified by counting the seeded table myself: ASI appears on 47 lines of
`docs/srd/source/class-level-tables.txt`, at levels 4, 6, 8, 10, 12, 14 and 16.**
Revision 2 scoped in "level 4" and congratulated itself for not omitting it
silently — while omitting six other levels exactly as silently. A level-up to 8
would have shipped the identical wrong number the section condemns.

**PINNED: the ASI levels are READ FROM THE SEEDED DATA, not hardcoded.** The
information is in the table the app already ships; a literal `4` in the code is
the same class of mistake as the plural-weapon map D15 forbids — a mechanical
fact decided by something other than the data.

**The increase is offered; "or another feat" is DEFERRED AND DISCLOSED.** SRD
2024 lets a level-4 character take the Ability Score Improvement feat **or
another feat**. The feat layer is not applied — `feat_definitions.ability_points`
is still seeded and consumed by nothing but row contracts, which a reviewer
confirmed. So this unit offers the increase, and **says on the screen that
choosing a different feat is not yet supported**. Saying it is the difference
between a deferral and a silent omission.

The machinery for the increase exists: `guided-creation.ts:1553-1600` already
mints a source instance and writes `ability_increase` rows into
`character_effects`, and `src/rules/ability-contributions.ts` resolves them into
all four consuming pipelines. No feat-layer drag-in.

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
  1 covered the one live bug this unit exists to close.** *Its cost, which
  revision 2 did not name:* flipping absence to unknown moves **every existing
  fixture that levels past 1 without rolls and asserts a numeric maximum** —
  sheet unit tests, character-sheet integration tests, browser parity. Those are
  retargets, not deletions, and they are the bulk of L-B's test work.
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
- **L-ASI-LEVELS** *(new)* — **§5 pinned that ASI levels are read from the data
  and then no control guarded it**, which is the same shape as §5's own
  complaint. Mutate the source back to a hardcoded `[4]`. Must fail: a level-up
  to **6** still requires an increase. Fixture must use a level other than 4 or
  the mutation is unobservable.
- **L-ADJACENT** *(new)* — mutate away the non-adjacent-level refusal. Must fail:
  levelling 2 → 7 in one command is refused by name. §8b named this refusal and
  revision 3 gave it neither a control nor an owner; both orphans are now L-A's,
  stated in §9.
- **L-PERSIST** — reload after levelling: level, method and value all survive,
  asserted from disk.

## 8b. THE SEAM — pinned here because it is the named dispatch-killer

A reviewer's verdict: the single thing most likely to fail is that **L-A must
build the level-and-row transaction and both guards without knowing what L-B's
screen submits.** Two implementers would invent it differently. So it is pinned
before either is cut, in `src/builder/contracts.ts`:

- **ONE command, ONE payload**, not three. It carries: the class source being
  levelled, the target level, the hit-point `{ method, value }`, the subclass
  content key **when the new level is 3**, and the ability increases **when the
  new level is an ASI level**. One transaction, one inverse, one refusal set.
- **The increases field is a LIST, not one increase** — pinned because revision 3
  wrote it singular and a reviewer caught that the existing machinery disagrees:
  `guided-creation.ts:1584` iterates `for (const increase of params.increases)`.
  SRD 2024 ASI is **+2 to one ability or +1 to two**, so the shape is an array of
  one or two `{ ability, amount }`. A singular field cannot express the +1/+1
  arm, and inventing the shape per dispatch is what this section exists to
  prevent.
- **Where the seam lives.** `src/builder/contracts.ts` is scoped to the level-ONE
  creation wizard and says so in its own header. Levelling 2..20 is a different
  feature. Follow the **ratified-by-re-export** path this file already uses for
  B3 and E-B: the values are declared in their own module and re-exported from
  `contracts.ts`, so there is one import point without pretending level-up is a
  creation step.
- **The refusal reasons, as strings**: a class the character does not have, a
  level 3 with no subclass, an ASI level with no increase, a non-adjacent target
  level. Named in the seam, not invented per dispatch.
- **The inverse is a SNAPSHOT inverse**, matching what `update_class` already
  does (`character-command-executor.ts:446-451`). Revision 2 left this open, and
  a field-by-field inverse cannot express it: `#previous` in
  `sheet-inputs.ts:262` captures only `rolled_value`, so once every row carries a
  method the prior state is `(method, value) | absent` — a tri-state the existing
  `rolled_value: null` encoding inverts rather than represents.
- **The read model becomes method-aware**, and this belongs to **L-A**:
  `HitPointRolls` is `ReadonlyMap<string, ReadonlyMap<number, number>>`
  (`sheet.ts:646`) with the builder query at `character-sheet-builder.ts:909`.
  A map to a bare number cannot carry a method. Revision 2 assigned it to
  neither dispatch.

## 8c. Persistence is a VERSION MINT, not "carry"

Revision 2 wrote "snapshot and backup and wire carry" and hid two rituals in one
word:

- **Share wire**: `ShareHitPointRoll` (`sharing/schema.ts:667`) carries
  `{ className, classLevel, value }`. Adding a method **mints a wire version**
  with its adjacent migration and a hand-frozen fixture — the D41 ritual, exactly
  as the skills unit paid it. Today's current version is what the equipment strip
  left; L-A reads it rather than assuming.
- **Snapshot**: a new column on a carried table needs the
  `ADDED_NULLABLE_ROW_COLUMNS` route — **which does not apply, because `method` is
  NOT NULL.** So either the column is nullable-with-backfill, or the snapshot
  version is minted with the historical list hand-frozen first. **L-A decides and
  reports; both are honest, and picking silently is not.**
- **Hand-transcribed inventories move**: `tests/unit/schema.test.ts:654`,
  `column-portability.test.ts:691`, column facts, table contracts. Real volume,
  and the precedent commits show it.

## 9. Dispatches

- **L-A — the record and the writers.** The `method` column and its migration,
  `SetHitPointRollCommand` extended, every bare INSERT in §2's list updated, the
  level-and-row single transaction, the command-layer guards from L-STRAIGHT and
  L-SUBCLASS, row contracts, snapshot/backup/wire carry.
- **L-B — the screen.** The level-up screen, the hit-point choice defaulting to
  fixed, the subclass choice at 3, **the increase at every ASI level the seeded
  data names** (§5 — this line said "the level-4 increase" through revision 3,
  contradicting the correction two sections above it; the third plan in a row
  where a reversal left stale text behind), the sheet's derivation
  and its unknown disclosure, and **retiring the planner's level input**.

## 10. NOT in this unit

Multiclass level-up (D56). Levelling down. The D67 reveal. Taking a different
feat instead of the ASI (§5, disclosed on the screen).

**A consequence that must be said rather than discovered:** multiclass entry
creates a second class at level 1, which is not the character's first level, gets
no hit-point row, and has no UI anywhere that dispatches `set_hit_point_roll` —
a reviewer grepped for call sites and found zero. So **after L-UNKNOWN lands,
every multiclassed character's hit points render as unknown, with no way to
resolve it until the deferred multiclass unit.** That is D33-honest and it is a
real reduction in what the app can show; it is named here so nobody meets it as a
surprise.

`class_name` staying a VARCHAR rather than a foreign key — a real weakness, recorded so it is not
mistaken for an oversight; nothing here depends on changing it.
