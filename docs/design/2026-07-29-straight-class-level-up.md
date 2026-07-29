# Straight-class level-up — the last item on the bar

Binding law: **D66** (the hit-point ruling that gates this), D56 (straight class
before multiclass), D33, D49 (warn versus block), D7.

## 0. What is true right now, each checked against the repo rather than recalled

- **Nothing in this application writes `character_hit_point_rolls`.** The table
  exists, has row contracts, is carried by snapshots (`character-state.ts:137`)
  and travels on the share wire (`character-share.ts:922`, `:1938`) — and the
  only code that inserts into it is **share import**. No command, no UI, no
  guided step. It is a table that can only ever be filled by a document written
  by an app that could fill it. **This is the same finding shape as
  `feat_definitions.ability_points`: seeded, contracted, carried, never applied.**
- **There is no level-up command and no level-up screen.** `src/commands/`
  contains exactly one class-related command, `update-class.ts`; the glob for a
  level-up UI returns nothing.
- **Level is a COLUMN, not a record of events.** `character_class_levels.level`
  (default 1) with `is_starting_class`, `subclass_definition_id` on the same row.
  Levelling is an increment, not an append.
- **`character_hit_point_rolls` has NO method column.** Its columns are
  `class_name`, `class_level`, `rolled_value`, with a CHECK pinning
  `class_level` 1..20 and `rolled_value` 1..12.
- **`class_name` is `VARCHAR`, not a foreign key** to `class_definitions`.
- The sheet already computes a hit-point maximum and already handles an absent
  hit die honestly — `hitPointMaximum`, `hitDieOrAbsent`, and an
  `ASSUMED_HIT_DIE` substitution that the sheet **prints as an absence** rather
  than hiding (`character-sheet-builder.ts:143`, `:325-335`, `src/rules/sheet.ts`).

## 1. The finding that shapes the whole unit

D66 requires that each level record **which method was used, and the value**,
because *"a total that cannot say whether it was taken or rolled cannot be
re-derived, and a level-up that silently averages a rolled character is a
confidently wrong number."*

**The existing table cannot express that.** It has one value column named
`rolled_value` and no method. The only way to encode "fixed" without a new
column is **absence of a row**, and absence is not a statement — it is
indistinguishable from a level whose row was never written, which is the state
of literally every character today, since nothing has ever written one.

**PINNED: add `method` to `character_hit_point_rolls`** (`'fixed' | 'rolled'`,
NOT NULL) and rename the value column's *meaning* by widening the CHECK to admit
the class's fixed value. A row per class level, always written, always saying
which it was. *Seam:* one column and one CHECK. *Cost to flip:* none — no
character has a row.

**REJECTED — absence means fixed.** It compiles, needs no migration, and makes
"we never wrote a row" and "the player took the average" the same state. That is
the D33 failure in its purest form: a confident number with no way to say what it
is.

## 2. What the step does

1. **Straight class only** (D56). The character's existing class levels up; no
   class chooser, no multiclass entry. Multiclass level-up is out of scope and
   must not be half-built here.
2. **The hit-point choice, per level** (D66): the class's fixed value is the
   **default**; rolling is available; a rolled value is **typed in**, because
   this app does not roll dice (D55's line, restated in D66).
3. **Features that need no choice arrive automatically** — a Fighter reaching 2
   gets Action Surge with nothing to pick.
4. **A level that carries a choice opens that choice.** Subclass at 3 is the
   first one; `character_class_levels.subclass_definition_id` already exists with
   a composite FK to `subclass_definitions`, so the storage is there.

## 3. Screen or button — PINNED, and it is a reversible default

**A button that levels the class, opening a screen only when the level carries a
choice.** Most levels grant features with nothing to pick, and a screen whose
only content is "you gained Action Surge" is a click that buys nothing.

The hit-point choice is a **choice**, so under this rule every level opens
something. That is not a contradiction — it is the reason the rule is written as
"a screen when there is a choice" rather than "a screen at level 3".

*Cost to flip:* the button becomes the screen's confirm control. Nothing about
the recording changes.

## 4. What the sheet must do

The hit-point maximum already exists and already discloses an absent hit die. It
must now be **derivable from the recorded rows**: base at level 1, plus each
level's recorded value, plus the Constitution contribution. A character with a
rolled 3 at level 2 shows the total that follows from 3 — never an average
substituted because the row was inconvenient.

Per **D67**, the sheet shows the final number and the reveal names the sources.
The per-level rows are exactly that reveal's content for hit points; this unit
records them, and does not build the reveal.

## 5. The trap

**Levelling by writing `level = level + 1` and letting the sheet re-derive
everything.** It compiles, the level is right, the proficiency bonus is right,
and the features are right — because every one of those is a pure function of
level. **Hit points are not**, and they are the one number that cannot be
recovered after the fact: if no row is written at the moment of the choice, the
information is gone and any later total is a guess wearing a number's clothes.

That is this project's recurring shape — correct-looking totals with the
provenance silently dropped — and it has now been caught in skills (a fill with
no source filter), in abilities (a base equal to its total), and in equipment (a
mint with no stamp). Here it would pass every test that asserts a level or a
bonus.

## 6. Controls

- **L-METHOD** — mutate the writer to omit `method`. Must fail: a level taken at
  the fixed value and a level rolled to the same number are **distinguishable**
  in the stored row. Asserted on the row, not on the total, or a fixture where
  the roll equals the average defeats it by construction.
- **L-NO-REDERIVE** — mutate the hit-point maximum to average an existing rolled
  row. Must fail: a character who rolled **3** at level 2 shows the total that
  follows from 3. Fixture must roll a value **far from the average**, or the
  mutation is unobservable.
- **L-STRAIGHT** — mutate the level-up to accept a second class. Must fail: the
  straight path never offers or applies one (D56).
- **L-SUBCLASS** — mutate level 3 to level without the subclass choice. Must
  fail: level 3 does not complete until the subclass is chosen.
- **L-PERSIST** — reload after levelling. Must fail: the level, the method and
  the value all survive, asserted from disk.

## 7. Dispatches

- **L-A — the record.** The `method` column, a migration, the widened CHECK, row
  contracts, snapshot and backup and wire carry, and the command that levels a
  class and writes the row in one transaction.
- **L-B — the screen.** The button, the hit-point choice with the fixed value
  defaulted, the subclass choice at 3, and the sheet's derivation from rows.

L-A owns the column and every persistence contract; L-B consumes them.

## 8. Explicitly NOT in this unit

Multiclass level-up (D56 orders it after). Levelling *down*. The D67 reveal.
`class_name` remaining a VARCHAR rather than a foreign key — a real weakness,
recorded here so it is not mistaken for an oversight, but changing it is a
separate migration with its own review and nothing in this unit depends on it.
