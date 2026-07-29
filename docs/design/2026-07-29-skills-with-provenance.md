# Skills: a grant knows where it came from

Plan author: Claude Opus (supervisor). Track A, toward D54's "usable" bar.
Status: **DRAFT** — awaiting independent review by fable and sol.

Law: `.claude/decisions.md` D1..D64. Binding here: **D33** (an unknown says
unknown), **D35** (anything changing a sheet number earns structure), **D44**
(the player chooses multiclass skills), **D54** (level 1 includes skills),
**D61** (background is required), **D63** (a contribution knows its source).

---

## 1. This is a correctness unit, not a screen

The skills step is the next in D55's order and the next thing on D54's bar. But
the reason it needs a plan rather than a dispatch is that **the answer the app
gives today is wrong**, and building a step on top of it would move the wrong
answer into the wizard.

`chosenSkillCount()` is `SELECT count(*) FROM character_skill_proficiencies`
with **no source filter** (`src/queries/character-completeness.ts:762-769`), and
`noSkillProficiencies` goes silent the moment that count exceeds zero
(`:890-895`). Both verified by the supervisor directly.

So a Fighter owing two class skills is told nothing is outstanding after **one**
tick — from a background, a species, or a stray RPC call. The multiclass arm is
the same shape: `outstanding = sum(entitlements) − count(all rows)`.

**The test suite pins this deliberately** (`tests/integration/queries/multiclass-skill-completeness.test.ts:271-295`),
so it is a known limitation rather than an accident. This plan removes it.

**What currently limits the damage, and what would remove that limit:** the
guided builder hard-codes `skills: false` and renders the terminal panel, so the
wizard does not yet consume the wrong answer. **Reusing planner completeness as
the step's completion predicate is the single thing that would transfer the
defect into the front door**, and it is the obvious shortcut.

## 2. Assumptions

Surveyed against the real code. **Everything marked PROVEN was verified by the
supervisor directly, not relayed.**

| # | Assumption | Status |
|---|---|---|
| S1 | `character_skill_proficiencies` carries no provenance | **PROVEN, supervisor-verified.** Five columns: `id`, `character_id`, `skill`, `created_at`, `updated_at`. No source, grant, level, class or ordinal. `(character_id, skill)` unique |
| S2 | Completeness silences on any single tick | **PROVEN, supervisor-verified** at `:762-769` and `:890-895` |
| S3 | Class skill entitlement is structured AND seeded | **PROVEN** — `class_sheet_traits.skill_choice_count`, `skill_choice_from_any`, `class_skill_options`, all populated at boot, with a health check that rejects missing option rows |
| S4 | **Background skills are never written as proficiencies** | **PROVEN** — the two printed strings are copied into `character_background` as prose. B3 gave backgrounds a real source instance and ability contributions; the skills stayed unapplied |
| S5 | **Species skill grants are prose plus a hand-maintained UI map** | **PROVEN** — Elf Keen Senses (three-way choice) and Human Skillful (any one) exist only as trait text and a literal in the species step |
| S6 | **The Skilled feat's grant rule has no consumer** | **PROVEN** — a structured `skill_proficiency` rule with count 3 is seeded, and `GrantRuleSlotGenerator` explicitly does nothing for it. Entitlement data with no reader, exactly as feat `ability_points` was before B2 |
| S7 | **Human has no species source instance at all** | **PROVEN** — one is minted only when a `species_definitions` row exists, and only Elf, Gnome and Tiefling are seeded. Skillful has nowhere to hang |
| S8 | `choose_multiclass_skill` is not server-side enforcement | **PROVEN** — it validates only that the value is a known skill, then delegates to the generic writer. A direct RPC caller can tick anything |
| S9 | `character_effects` can carry a skill grant | **PROVEN in mechanism** — ownership, required source, same-character composite FK and cascade all exist and now have real producers (B3). Whether skills SHOULD ride it is §3.1 |
| S10 | **Share export emits a bare skill string list** | **PROVEN** — provenance cannot survive that format without a wire bump |
| S11 | Expertise is unmodelled | **PROVEN** — a distinct rank mechanic, and out of scope; see §3.4 |

## 3. Decisions

### 3.1 Grants get their own table, NOT an effect kind

`character_effects` could carry this — S9 — and B2 set the precedent. **Taken:
a separate `character_skill_grants` table anyway.**

An ability contribution is a **number folded into a total**. A skill grant is
**set membership with an unfilled state**: a class grant exists before a skill is
chosen for it, which is precisely what makes completeness answerable. An effect
row with a null payload would be modelling an obligation as a degenerate
contribution, and §6's failure mode is exactly that confusion.

Columns: `character_id`, `source_instance_id` (**required**, as B2's kind is),
a stable `grant_key`, an `ordinal` for multi-choice grants, and a **nullable**
`skill` — null meaning *granted but unfilled*.

*Seam:* the table plus one resolver. *Cost to flip:* folding into
`character_effects` later costs a migration and gains nothing the FK does not
already give.

### 3.2 The flat table becomes derived, not deleted

`character_skill_proficiencies` has five writers including backup, share and
snapshot restore. **Taken: the sheet reads `DISTINCT skill` from the grants**,
and the flat table is retired as a source of truth in the same increment rather
than left as a second one.

Two sources of truth for the same fact is F22 by its own number in this project.

### 3.3 Completion is per grant, never a count

**The rule, stated so no implementation can drift from it:** an unfilled class
grant stays outstanding **regardless of how many skills the character has from
any other source.** Background and species grants may remove skills from the
*available choices* for a class grant — you cannot pick what you already have —
but they never reduce the number of unfilled class ordinals.

That is the whole correctness content of this unit.

### 3.4 Scope boundaries

**In:** the grants table; background's two fixed skills written as grants under
its existing source; Elf Keen Senses and Human Skillful as structured species
grants; **Human gaining a species source instance**, which S7 says it lacks; a
grant-aware command for the guided step; per-grant completeness; the guided
skills step; backup, share, snapshot, row contracts and cascade in the same
increment.

**Out, each with its reason:**
- **Expertise** — a distinct rank mechanic (S11), not needed to make initial
  proficiency provenance correct. Stays a disclosed gap.
- **The Skilled feat's three grants** — S6 says the rule exists with no consumer.
  It becomes readable by this unit's resolver, but wiring feat-granted skills is
  its own unit, and **the plan must not claim otherwise**: a feat that grants
  skills the app does not apply is a D33 disclosure, not silence.
- **Tool proficiencies** — Skilled allows a tool instead of a skill; out with it.

## 4. Dispatches

**S-A — the grants table and the resolver.** Exit: the table exists with a
required source and a nullable skill; the sheet reads `DISTINCT skill` from it;
the flat table is retired in the same increment; backup, share (a wire bump —
S10), snapshot and row contracts all carry the new shape; removing a source
removes its grants by cascade.

**S-B — the producers.** Exit: background writes its two printed skills as
filled grants under its own source, normalised from prose to verified `Skill`
values; Elf and Human get structured species grants; **Human gets a species
source instance**; the guided step's command validates the class pool and writes
against the class source.

**S-C — completeness and the step.** Exit: an unfilled class grant is reported
outstanding no matter how many skills exist from other sources; the guided
skills step lets a person fill exactly their class grants, shows background and
species skills as already granted, and advances only when every class ordinal is
filled.

## 5. The trap

**Reusing planner completeness as the step's predicate.** It is right there, it
compiles, and it is wrong — S2. A step built on it would report a Fighter
complete after their background handed them two skills, and every persistence
test would pass.

**Therefore S-C's exit is not "the step advances".** It is: **a Fighter with a
background that grants two skills still owes two class choices**, asserted
end to end.

## 6. Controls

- **S-SILENCE** — make `chosenSkillCount` count all rows again, unfiltered. The
  Fighter-with-background test must fail. **This is the control that matters**;
  it is §5's trap made executable and it targets the exact line that is wrong
  today.
- **S-SOURCE** — drop the required-source constraint on a grant. The
  cascade test must fail. Same argument B2 made: available provenance is not
  enforced provenance.
- **S-POOL** — let the guided command accept a skill outside the class's pool.
  The pool test must fail. S8 says the existing writer accepts anything, so this
  guards the new command rather than the old one.
- **S-BACKGROUND** — stop writing the background's two skills as grants. The
  granted-skills test must fail. S4 says they are unapplied today, so this
  proves the unit actually applied them.
- **S-DISTINCT** — make the sheet read the retired flat table. The sheet test
  must fail, proving §3.2's single source of truth.
- **S-SHARE** — drop the grant provenance from the wire. A round trip must fail.
  S10 says the current format cannot carry it at all.

**Every fixture must make its mutation observable.** A fixture whose background
grants no skills cannot exercise S-SILENCE; a fixture where base equals total
defeated a control earlier in this effort, and the same class of mistake is
available here.

## 7. Verification

Gates: `npm run build` and `npx vitest run`, plus one browser suite on a unique
port. **Never `npx tsc --noEmit -p tsconfig.json`** — the root config is a
solution file with `files: []` that exits 0 checking nothing.

Every control: apply, prove applied, run, revert, prove restoration by
re-running. Mutations in a script file, not inline shell. **Commit before
controlling.**

Forbidden paths to green: no `any`, `@ts-ignore`, `@ts-expect-error`, `.skip`,
`.todo`, no config edits, no weakened assertions, no deleting a test to pass, and
never regenerate an expectation from our own output.

**One test will need deleting, and it is the legitimate case:**
`multiclass-skill-completeness.test.ts:271-295` pins the silencing behaviour as
correct. Its subject is gone once §3.3 lands. Deleting it is right; weakening it
is not, and neither is leaving it to fail.
