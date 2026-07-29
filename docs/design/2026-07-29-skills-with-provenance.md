# Skills: a grant knows where it came from

Plan author: Claude Opus (supervisor). Track A, toward D54's "usable" bar.
Status: **REVISION 3** — round 2 closed with two NOT-READY verdicts. This is the
final round.

Law: `.claude/decisions.md` D1..D64. Binding here: **D33** (an unknown says
unknown), **D35** (anything changing a sheet number earns structure), **D44**
(the player chooses multiclass skills), **D54** (level 1 includes skills),
**D61** (background is required), **D63** (a contribution knows its source).

---

## 0a. What round 2 found — including two defects revision 2 CREATED

**The best finding is one I should have seen, because I cited the very table
that solves it.** Removal in this codebase is **tombstoning, not deletion**:
class removal sets `state = 'tombstoned'` and the source row **survives**
(`src/commands/update-class.ts:361-368`), so `ON DELETE CASCADE` never fires. My
entire cascade story covered only the guided hard-delete path.

And `spell_selection_slots` — **the precedent revision 2 leaned on** — carries
`state`, `orphan_reason_code`, `orphaned_at`, `prior_config`
(`src/db/schema.sql:823-828`), with the generator orphaning slots when a source
tombstones. **I copied that table's shape and left its lifecycle behind.**
Verified by the supervisor.

In revision 1 I invented a false premise to defend a right answer. In revision 2
I cited a real precedent and took only the half that suited me. Different
mistakes, one root: reasoning that stops on reaching the conclusion I already
wanted. §3.8 now carries the lifecycle.

What it would have shipped, with no control watching: a removed Fighter's filled
Athletics grant stays a live proficiency on the sheet; the partial unique index
then **blocks** granting Athletics from any other source; unfilled tombstoned
grants keep completeness outstanding forever. Every control in revision 2
exercises the hard-delete path or the constraint. **None touches tombstoning.**

**Revision 2 broke two things revision 1 had right, both because it resolved
§3.2 to DROP.**

1. **The frozen snapshot lists cannot survive the drop.** The current version is
   already `a7-v8`, every version from `a7-v4` carries the table, and the
   historical lists `satisfies readonly SnapshotTable[]` where `SnapshotTable`
   derives from live table classification — so dropping breaks the **type** of
   every frozen list, and restore iterates those names and inserts into them.
   Minting `a7-v9` does not help. **§3.2 is reversed below.**
2. **`S-DISTINCT` died with it.** "Make the sheet read the retired flat table" is
   unimplementable against a dropped table: the query throws and every sheet test
   fails for a reason that proves nothing.

**A factual error I introduced:** revision 2 claimed a "planner skill checkbox"
drives `set_skill_proficiency`. **No such control exists** — the live planner
skill surface invokes `chooseMulticlassSkill`
(`src/ui/screens/planner/screen.ts:395`), verified by the supervisor. I wrote a
disposition and a control around a surface I had invented, and a dispatched agent
would have hunted for a phantom.

**Also accepted:** the old-share migration was not a migration story — and as
written it was **jointly unsatisfiable**, since a required source forbids an
unattributed grant, §3.5 refused to mint a manual source, and losing user data is
forbidden. One of three had to give; §3.2 now says which.
`choose_multiclass_skill` **cannot name the class it fills** — the payload
carries only `skill` and the UI discards class identity — so D44 would have
survived cosmetically. And §3.3's remedy ("unfill the class ordinal first")
named an operation the plan never pinned.

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

### 3.2 The flat table is KEPT as a TRANSPORT PROJECTION — the drop is reversed

Revision 1 was ambiguous. Revision 2 resolved it to DROP. **Both reviewers showed
the drop is not available**, and §0a records why: the frozen snapshot lists
`satisfies readonly SnapshotTable[]`, so removing the table breaks the **type** of
every historical version, and restore iterates those names to insert into them.

**Taken: `character_skill_proficiencies` stays, and becomes a PROJECTION with
exactly one writer — the grants resolver.**

- **Grants are the single source of truth.** Nothing else writes the flat table.
- **The sheet and completeness read GRANTS**, never the projection.
- The projection exists **only** so snapshot, backup and share keep a shape their
  frozen versions already demand.
- It is written from grants inside the same transaction that fills or clears one.

This is not revision 1's ambiguity returning: revision 1 never named a derivation
mechanism, which is precisely what made it two sources of truth. **Naming the one
writer is what makes it a projection rather than a rival.**

*Cost to flip:* dropping it later costs a snapshot-version scheme that can express
a removed table — real work, and not this unit's.

**Old share documents: RETIRED, not migrated.** A bare skill string carries no
source, grant key or ordinal, and inventing attribution would be guessing —
forbidden here. §3.5 refuses a synthetic manual source, a required source forbids
an unattributed grant, and losing data is forbidden; one had to give. **D60 gives
it:** v1 has zero users and zero exports, so pre-v5 documents are refused with a
sentence rather than silently half-imported. That is the honest option and the
only one that does not fabricate provenance.

### 3.8 Grants have a LIFECYCLE, because removal is a tombstone

**The finding that most nearly shipped, and §0a records that I cited the table
which solves it while omitting its lifecycle.**

`ON DELETE CASCADE` does not fire on removal, because removal sets
`state = 'tombstoned'` and the row survives. A grants table without its own
lifecycle would therefore leave a removed class's skills live on the sheet, and
the `(character_id, skill)` partial unique index would then **block** any other
source from granting that skill — a removal making a later legitimate choice
impossible.

**Taken: mirror `spell_selection_slots` fully, not partially.** The grant carries
`state` (`active` / `orphaned`), `orphan_reason_code` and `orphaned_at`. When a
source tombstones, its grants orphan. **The resolver counts only `active`
grants** — for the sheet, for completeness, and for the unique index's purposes.

**Who mints unfilled grants, pinned because two agents would diverge:** the
generator materialises them when a source is created, the same arm that
materialises spell slots. Not the command on demand — a grant must exist before
it can be outstanding, which is the whole reason §3.1 chose a slot shape.

*Seam:* three columns and one generator arm. *Cost to flip:* none; the
alternative is delete-on-tombstone, which contradicts how every other source
behaves.

### 3.5 The legacy writers, which revision 1 never mentioned

**Both reviewers found this independently and it is the likeliest false success.**
Three surfaces write the flat table and none appeared in the plan. Worse, the
sheet's own disclosure currently *instructs* a person to hand-tick background
skills (`character-sheet-builder.ts:422-427`) — so the affordance is not
hypothetical, it is advertised.

**Dispositions, pinned:**

- **`choose_multiclass_skill`** (D44's mechanism) **migrates, and its payload
  must change.** Revision 2 said it writes "against the entered class's existing
  source" — the source reliably **exists** (`UpdateClassCommand` creates or
  reactivates it), but the command **cannot say which one**: the payload carries
  only `skill`, and the completeness UI renders a per-class form and then
  **discards the class when dispatching** (`src/ui/screens/planner/screen.ts:395`).
  With two entered classes whose pools overlap, filling "a" grant is not filling
  "the" grant. **Pinned: the payload gains the grant's addressable identity, the
  per-class form passes it, and the validator's exact-keys covers it.** Without
  that, D44 survives cosmetically — the shape of §5's likeliest false success.
- **`set_skill_proficiency`** — the generic tick — is **removed**. A manual tick
  has no source, and the required source is the whole point. *Cost to flip:* mint
  a `manual` source, a bigger decision than this unit should take alone.
  **Correction: revision 2 claimed a planner checkbox drives this command. It does
  not exist** — §0a records the error. The removable surfaces are the three
  command registrations (validator, factory, executor) and the sheet disclosure,
  and a dispatched agent must not go looking for UI that was never there.
- **The sheet's disclosure is deleted**, since it tells a person to hand-tick
  background skills through a command that will refuse.

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
with a **named** reason, `skill_already_held`, rather than surfacing a raw SQLite
constraint error. Silently unfilling a choice the person made is worse than
saying no.

**But revision 2's remedy named an operation the plan never pinned, and both
reviewers caught it.** "The person unfills the class ordinal first" requires a
**clear** operation, and §3.6 pinned only filling — with `grant_already_filled`
in the refusal union, meaning fills are not overwrites. Without a clear, the
refusal **strands** someone who simply wants to change their background.

**Pinned: the RPC accepts a null selection to CLEAR a grant**, and the background
re-apply's refusal names the conflicting skill so the step can offer to clear it.
Refusing is right only because unfilling is possible.

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
- **The share wire version this unit mints: v5**, and **pre-v5 documents are
  refused** per §3.2 rather than migrated with fabricated provenance.
- **The grant's own stable id.** Revision 2 listed columns with no `id` while
  pinning a `grant_not_found` refusal and an addressable RPC — the fill command
  needs something to address.
- **The RPC's grant locator, its null-selection CLEAR semantics, and its result
  type**, per §3.3.
- **Literal `grant_key` values**, not semantic labels. "starting-class" and
  "Keen Senses" are descriptions; two agents will write two vocabularies.
- **`skill_already_held`** joins the refusal reasons, for §3.3's collision.
- **The grant lifecycle columns** from §3.8 — `state`, `orphan_reason_code`,
  `orphaned_at` — and the rule that the resolver counts only `active`.
- **The Drizzle relation entries and the append-only migration/checksum record.**
  Relations are checked bidirectionally against foreign keys and every schema
  change requires an immutable migration entry; neither is optional and revision 2
  named neither.
- **Who seeds Human's `species_definitions` row** and its content key — S7 says
  it does not exist, and §3.4 requires Human to gain a species source.

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

**The second trap, which revision 2 could not see because it had no control for
it: correct totals attached to the WRONG class source.** With two entered classes
both owing a choice, an implementation that fills whichever grant is available
produces the right distinct proficiency set, the right outstanding count, and a
faithful round trip of the wrong provenance. It passes S-SILENCE, S-POOL,
S-DISTINCT and S-SHARE. `S-GRANT-IDENTITY` is that trap made executable.

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
- **S-DISTINCT** — **retargeted; revision 2 killed it by resolving §3.2 to DROP,
  and §3.2 is now reversed.** With the flat table kept as a projection, the
  mutation is: **make the sheet read the PROJECTION instead of grants.** A test
  where the projection is deliberately stale must fail. That proves grants are
  the source of truth and the projection is downstream — which is exactly what
  §3.2 claims and nothing else checks.
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
