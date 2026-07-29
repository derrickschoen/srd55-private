# Skills: a grant knows where it came from

Plan author: Claude Opus (supervisor). Track A, toward D54's "usable" bar.
Status: **REVISION 2** — round 1 closed with one NOT-READY and one
READY-WITH-FIXES. Awaiting re-review.

Law: `.claude/decisions.md` D1..D64. Binding here: **D33** (an unknown says
unknown), **D35** (anything changing a sheet number earns structure), **D44**
(the player chooses multiclass skills), **D54** (level 1 includes skills),
**D61** (background is required), **D63** (a contribution knows its source).

---

## 0. What round 1 found

**My justification for §3.1 was a rationalisation, and a reviewer caught it.** I
wrote that `character_effects` could not naturally carry an unfilled payload.
**False, and I verified it myself:** `damage_type` is nullable with a
kind-scoped CHECK (`src/db/schema.sql:187,202`), and the resolver reports an
unchosen resistance as exactly that. So "effects cannot represent an obligation"
was not a fact, it was a story that supported the answer I had already picked.

The conclusion survives for a **better** reason the same reviewer supplied:
`spell_selection_slots` already exists with precisely the needed shape —
`source_instance_id NOT NULL`, `slot_key`, `rule_key`, `ordinal`, a nullable
current selection, and source cascade (`src/db/schema.sql:800-838`). Skill grants
are **source-owned choice slots with stable rule identity and ordinals**, which
is that table's pattern, not the effect table's. §3.1 now argues from the real
precedent. The other reviewer independently endorsed the separate table, so the
decision is unchanged — only its reasoning was wrong, which is worth more than it
sounds: a plan defended by a false premise survives review by luck.

**Three assumption rows were overstated and are narrowed below.** S2 (true of
`noSkillProficiencies`, not of all completeness — the multiclass arm does report
partial outstanding), S4 (no *automatic* background write; the generic sheet
command can still coincidentally tick the same skill), S7 (true of *guided
bundled* Human; the general source command can mint a species instance wherever a
definition exists).

**The biggest gap was an omission, and both reviewers found it independently:
the legacy writers are absent from the plan entirely.** `set_skill_proficiency`,
`choose_multiclass_skill`, and the planner's skill checkbox all write the flat
table. Retiring that table as a source of truth while leaving them writable makes
a person's tick **succeed silently and change nothing** — and the sheet's own
disclosure currently *instructs* them to tick background skills by hand
(`src/queries/character-sheet-builder.ts:422-427`). §3.5 now dispositions each.

**§3.2 contradicted itself:** the heading said "derived, not deleted" and the
body said "retired as a source of truth", which are different units, and one
reading makes `S-DISTINCT` unable to fire at all. Resolved to **drop**, with the
fan-out both reviewers enumerated.

**Two controls could not fire.** `S-SOURCE` survives its own mutation — dropping
a NOT NULL does not change rows that already have a source, so the cascade still
works. `S-SILENCE` targeted `chosenSkillCount`, which a correct implementation
**deletes**. Both retargeted in §6.

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
| S2 | Completeness silences on any single tick | **PROVEN for `noSkillProficiencies`, NARROWED after round 1.** Any positive flat-row count silences it (`:762-769`, `:890-895`). It is NOT true of all completeness: the multiclass arm reports outstanding until `entitled − chosen <= 0`, and a test demonstrates partial ticks staying outstanding. The defect is real and reachable; my first wording claimed more of it than the code does |
| S3 | Class skill entitlement is structured AND seeded | **PROVEN** — `class_sheet_traits.skill_choice_count`, `skill_choice_from_any`, `class_skill_options`, all populated at boot, with a health check that rejects missing option rows |
| S4 | **Background skills are never written as proficiencies** | **PROVEN for AUTOMATIC application, narrowed after round 1.** Both background paths copy the strings into `character_background` as prose; B3 writes only ability effects and calls a generator that ignores skill rules. "Never written" is too broad — the generic sheet command can coincidentally tick the same skill, with no provenance. **And the sheet currently TELLS the user to do exactly that** (`character-sheet-builder.ts:422-427`), which makes S2's defect user-reachable today rather than theoretical |
| S5 | **Species skill grants are prose plus a hand-maintained UI map** | **PROVEN** — Elf Keen Senses (three-way choice) and Human Skillful (any one) exist only as trait text and a literal in the species step |
| S6 | **The Skilled feat's grant rule has no consumer** | **PROVEN** — a structured `skill_proficiency` rule with count 3 is seeded, and `GrantRuleSlotGenerator` explicitly does nothing for it. Entitlement data with no reader, exactly as feat `ability_points` was before B2 |
| S7 | **Human has no species source instance at all** | **PROVEN for the GUIDED BUNDLED path, narrowed after round 1.** Guided application returns before creating a source when no definition exists, and only Elf, Gnome and Tiefling are seeded. The general `add_source` command can mint a species instance wherever a definition exists, so "at all" was too strong. Skillful still has nowhere to hang in the guided flow, which is the path this unit builds |
| S8 | `choose_multiclass_skill` is not server-side enforcement | **PROVEN** — it validates only that the value is a known skill, then delegates to the generic writer. A direct RPC caller can tick anything |
| S9 | `character_effects` can carry a skill grant | **PROVEN in mechanism** — ownership, required source, same-character composite FK and cascade all exist and now have real producers (B3). Whether skills SHOULD ride it is §3.1 |
| S10 | **Share export emits a bare skill string list** | **PROVEN** — provenance cannot survive that format without a wire bump |
| S11 | Expertise is unmodelled | **PROVEN** — a distinct rank mechanic, and out of scope; see §3.4 |

## 3. Decisions

### 3.1 Grants are CHOICE SLOTS, and the precedent is `spell_selection_slots`

**Taken: a separate `character_skill_grants` table.** Both reviewers agreed with
the conclusion; revision 1's argument for it was wrong and is replaced.

Revision 1 said `character_effects` could not naturally carry an unfilled
payload. It can — `damage_type` is nullable with a kind-scoped CHECK, and an
unchosen resistance is reported as exactly that. §0 records the correction.

**The real distinction: these are source-owned CHOICE SLOTS with stable rule
identity and ordinals — the shape `spell_selection_slots` already has**
(`src/db/schema.sql:800-838`): `source_instance_id NOT NULL`, `slot_key`,
`rule_key`, `ordinal`, a nullable current selection, source cascade. Skill grants
are that pattern. `character_effects` is for **resolved mechanics**; a grant is an
**addressable choice** with a lifecycle. Putting skills there would need
grant-key, ordinal and skill columns, new per-kind constraints, another arm on an
exhaustive consumer, and another widened effect wire tuple — widening every other
kind's surface for one kind's benefit.

Columns: `character_id`, `source_instance_id` (**required**), `grant_key`,
`ordinal`, a **nullable** `skill` (null = granted but unfilled), timestamps.

**Uniqueness, which revision 1 pinned not at all** — the old flat table had
`(character_id, skill)` unique and dropping that silently is how duplicates
arrive:
- `(source_instance_id, grant_key, ordinal)` **unique** — one slot per ordinal.
- `(character_id, skill) WHERE skill IS NOT NULL` **unique** — a character cannot
  hold the same proficiency twice. This is what makes §3.3's "cannot pick what
  you already have" an enforced invariant rather than prose, and it decides the
  collision in §3.3's last paragraph.

*Cost to flip:* folding into `character_effects` later is one migration; the
reverse would leave per-grant completeness querying a table whose shape argues
against it. The asymmetry favours this.

### 3.2 The flat table is DROPPED

Revision 1's heading said "derived, not deleted" while its body said "retired as
a source of truth". **Those are different units**, both reviewers said so, and
one reading makes `S-DISTINCT` unable to fire at all — a synchronised copy
returns the same answer under mutation.

**Taken: drop `character_skill_proficiencies`.** D60 removes the compatibility
constraint, and a writable table nobody reads is worse than no table: a person's
tick succeeds and changes nothing.

**The fan-out, enumerated because revision 1 named writers only and admitted
roughly half of it:**

- the generic set/unset command and its inverse-state read;
- `choose_multiclass_skill`, which delegates to it;
- the planner's sheet checkbox surface;
- completeness — the count AND the available-choice exclusion;
- the sheet builder's proficiency resolution;
- share export, import, and the wire bump (**this unit mints v5**; B1 minted v3,
  B2 v4);
- backup export, direct import, and save-point id remapping;
- snapshot capture, restore, and diff/audit — **plus a new A7 snapshot version**,
  since the table sits in a frozen version list whose own comment warns that
  getting it wrong breaks undo, save-point restore and backup export together;
- schema-derived row contracts, generated column and reference facts, table
  classification, deletion order, backup scope, share scope, audit vocabulary;
- the schema, schema-signature, candidate-audit, table-scopes and agent-reference
  suites, and the browser specs that exercise ticking.

Old share documents carrying a bare string list must be migrated to sourced
grants — say how, or the importer refuses its own format's history.

### 3.5 The legacy writers, which revision 1 never mentioned

**Both reviewers found this independently and it is the likeliest false success.**
Three surfaces write the flat table and none appeared in the plan. Worse, the
sheet's own disclosure currently *instructs* a person to hand-tick background
skills (`character-sheet-builder.ts:422-427`) — so the affordance is not
hypothetical, it is advertised.

**Dispositions, pinned:**

- **`choose_multiclass_skill`** (D44's mechanism) **migrates**: it writes a
  filled grant against the entered class's **existing** source instance, which
  `UpdateClassCommand` already creates. D44 is preserved, and the command stops
  being the unenforced pass-through S8 proved it is.
- **`set_skill_proficiency`** — the generic tick — is **removed**, along with the
  planner checkbox that drives it. A manual tick has no source, and the required
  source is the whole point. *Taken for now; cost to flip:* mint a `manual`
  source instance and let it stay, which is a bigger decision than this unit
  should take alone.
- **The sheet's disclosure is deleted with it**, since it names an affordance
  that will not exist.

**A retired path is deleted, not left writing rows nobody reads** — that is the
§5 trap's real shape, and a control enforces it.

### 3.3 Completion is per grant, never a count

**The rule, stated so no implementation can drift from it:** an unfilled class
grant stays outstanding **regardless of how many skills the character has from
any other source.** Background and species grants **must** remove skills from the
*available choices* for a class grant — you cannot pick what you already have —
but they **never** reduce the number of unfilled class ordinals.

Revision 1 said "may remove", which both reviewers flagged as discretionary where
it must be mandatory. Fixed.

That is the whole correctness content of this unit.

**The worked case, because a rule that is not worked is a rule nobody has
checked.** An Acolyte Fighter. The background grants Insight and Religion; the
Fighter pool holds Insight but not Religion.

- Class ordinals outstanding: **2**. Neither background grant reduces them.
- Available for the first ordinal: **8 of 9** — Insight is gone because it is
  already held; Religion never was in the pool.
- After the first ordinal is filled, its skill leaves the second's list too.

**The collision revision 1 left undetermined:** a player fills a class ordinal
with Athletics, then **switches background** to one granting Athletics. Steps run
in order but the RPC surface does not, and B3's background apply is replace-style.
**Pinned: the `(character_id, skill) WHERE skill IS NOT NULL` unique index from
§3.1 makes this a refusal, not a duplicate** — the background re-apply refuses
with a reason naming the conflict, and the person unfills the class ordinal first.
Silently unfilling a choice they made is worse than saying no.

**Degenerate case:** if available choices ever fall below unfilled ordinals, the
completeness item must not print an obligation with an empty remedy. Unreachable
with SRD data; stated because the codebase already worries about this shape.

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

### 3.6 Seam additions, pinned before any dispatch

Every dispatch in this project has found a seam gap; revision 1 pinned nothing.
Ratified into `src/builder/contracts.ts` **before** S-A:

- `character_skill_grants` — exact columns, nullability, the composite
  same-character FK, source cascade, positive ordinal, skill vocabulary, and
  **both** uniqueness constraints from §3.1.
- The **`grant_key` vocabulary**, a stable-key convention the slot generator
  already has a precedent for: starting-class, multiclass-entry,
  background-fixed, Keen Senses, Skillful, and rule-driven feat keys.
- The resolver's name and return shape, separating **grant rows**, **filled
  `DISTINCT` proficiencies**, **unfilled required class grants**, and
  **per-grant available choices** — four different questions, and a resolver
  returning only the third makes the step unbuildable.
- The RPC method, its params **including `operation_uuid` and
  `expected_revision`** — the exact pair B1's prose required while its pinned
  shape omitted them — and the exact-keys validator.
- Refusal reasons: `skill_not_in_pool`, `grant_not_found`,
  `grant_already_filled`, `skill_already_held`. The existing union is closed and
  has none of them.
- `GUIDED_PANEL.skillsStep` and a `SKILL_STEP_ATTR` set on the
  `ABILITY_STEP_ATTR` precedent, **including a locator for the
  already-granted-by-background/species display**, which S-C's exit needs.
- The completion predicate's name and its `GuidedStepEvidence` field, replacing
  the hard-coded `skills: false`.
- **The share wire version this unit mints: v5.**

### 3.7 The two deferrals are DISCLOSED, and the disclosure is an exit criterion

Revision 1 said the right sentence about Skilled — "a D33 disclosure, not
silence" — and never said **where it renders**, which makes it prose. A reviewer
called that quiet narrowing, correctly.

- **Skilled** is an Origin feat selectable in the **required** background step, so
  a guided player can pick it in the very flow this unit polishes and receive
  nothing. **S-C's exit: the skills step names the gap** for a character whose
  origin feat is Skilled.
- **Expertise** is taken by a Rogue **at level 1**, and D54's bar names the
  choices the SRD actually requires at level 1. **S-C's exit: the step names the
  gap** for a level-1 Rogue rather than inheriting a sheet footnote.

Deferral with a rendered disclosure is sequencing. Deferral with a sentence in a
plan is narrowing.

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

- **S-SILENCE** — **retargeted; revision 1's mutation could not be applied.** It
  named `chosenSkillCount`, which a correct implementation **deletes**. The
  mutation is now: **replace the per-grant predicate with `class entitlement −
  count(all filled grants)`** — the old semantics rebuilt on the new table. The
  Fighter-with-background test must fail. This is §5's trap made executable and
  it is the control that matters. Note the mutation is a predicate replacement,
  not a one-line revert; script it as such rather than quietly downgrading it.
  **Fixture, pinned:** an **Acolyte** Fighter — the background must grant at
  least one skill AND the class must owe at least one unfilled ordinal, asserted
  before the mutation is applied, or the mutated count never exceeds the
  entitlement and the control is decorative.
- **S-SOURCE** — **retargeted; revision 1's version survives its own mutation.**
  Both reviewers showed why: dropping the NOT NULL does not change rows that
  already **have** a source, so deleting that source still cascades and the
  cascade test passes. The failing test is a **constraint** test — inserting a
  grant with a null source must be refused — and the mutation must also make a
  producer write null, or nothing exercises it.
- **S-POOL** — let the guided command accept a skill outside the class's pool.
  The pool test must fail. S8 says the existing writer accepts anything, so this
  guards the new command rather than the old one.
- **S-BACKGROUND** — stop writing the background's two skills as grants. The
  granted-skills test must fail. S4 says they are unapplied today, so this
  proves the unit actually applied them.
- **S-DISTINCT** — make the sheet read the retired flat table. The sheet test
  must fail, proving §3.2's single source of truth.
- **S-SHARE** — drop the grant provenance from the wire. A round trip must fail,
  asserting **source identity, grant key, ordinal and the nullable selection** —
  not merely the final `DISTINCT skill`, which survives losing all of it.
- **S-LEGACY** *(new — §3.5)* — restore the removed `set_skill_proficiency`
  write path. A test must fail proving a legacy write cannot alter the sheet or
  completeness. **This guards the likeliest false success**: every gate green
  while a person's tick on the planner writes a row nobody reads.

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
