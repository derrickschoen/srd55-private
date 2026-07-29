# Ability scores: the step that sets them, and the layer that adds to them

Plan author: Claude Opus (supervisor). Track A, toward D54's "usable" bar.
Status: **REVISION 3** — round 2 closed. This is the final round.

Law: `.claude/decisions.md` D1..D64. Binding here: **D33** (an unknown says
unknown), **D35** (anything changing a sheet number earns structure), **D49**
(warn and block are different mechanisms and must not be conflated), **D54** (the
bar is usable), **D55** (order: class → abilities → species → background →
skills → equipment; Roll in Order is deleted), **D61** (background required; its
Origin feat and ASI are player-chosen), **D63** (base plus contributions; every
species modelled), **D64** (standard array default, everything else warns;
initiative must be correct).

---

## 0a. What round 2 found — including that my marquee control was decorative

**The worst finding is against the fix I was proudest of.** Revision 2 added
`B2-EDIT` to catch revision 1's best defect: the planner editor baking a
contribution into base. **The control cannot detect it**, and I verified that by
walking it:

`update_ability` writes **what was typed** straight into the base column
(`src/commands/update-ability.ts:46-52`), regardless of what the input displayed.
So with a mutant editor showing total 17 (base 15 + 2), a tester types 16, base
becomes 16 and total 18. Revision 2's two assertions — base equals what was typed
(16 = 16) and total exceeds it by the contributions (18 = 16 + 2) — **pass under
the mutation, and pass under correct code too.** The only observable that
separates them is the **pre-edit displayed value**. §7 now asserts it.

A control that cannot fail proves nothing about the code and everything about the
control. This is the third time that lesson has been paid for in this project and
the first time it landed on a control I had written specifically to prevent a
known defect.

**Second: revision 2 made the plan LESS deterministic than revision 1, and both
reviewers found it independently.** Revision 1 said the resolver sums
contributions — rules-incomplete, but unambiguous. Round 1 told me a cap was
missing, so I added `maximum` and **never pinned how caps resolve.** Verified:
backgrounds cap at 20 (`docs/srd/source/backgrounds.txt:51`), ASI feats at 20
(`feats.txt:67`), Epic Boons at 30. Base 19 with `+2/max20` and `+1/max30` yields
22 by summation, 20 by clamping to the lowest maximum, 21 chronologically — and
`character_effects.sort_order` is documented as the **user's editable display
order, deliberately not unique**, so there is no acquisition chronology to order
by. `AbilityScore` only throws outside 1–30, so a rules-wrong 20 or 22 ships
silently. I fixed a completeness gap by introducing an ambiguity, which is worse.
§3.3 now pins the arithmetic.

**Third: §3.6's "pin which one" was unsatisfiable.** `report.character.abilities`
feeds the editor input (needs **base**), the planner's casting attack/DC badges
(`editors.ts:141-148`, needs **total**) and `AbilityScores.fromArray(...)` for
slot math (`character-workspace-builder.ts:308`, needs **total**). One field,
three consumers, two answers. The read model widens; §3.6 says how.

**Fourth: "version-aware" named a mechanism that does not exist.** Snapshot
versioning covers *tables*, not columns, and both validators enforce the current
column list against every accepted version. Adding the column either breaks the
seven deliberately-kept save-point versions or needs machinery I never named.

**Also accepted:** the required-source CHECK collides with the share wire's
documented "effect travels without provenance", and B3 is the producer — a
background travels as text with no reference entry, so its owner is unreachable
and import must either refuse its own export, drop the effect, or invent a
source. And a reviewer did the initiative enumeration I had demanded rather than
done: **three sources**, of which `flat` has **zero** bundled producers.

**One good null result, from both reviewers independently:** no sibling of the
editor defect exists. Class-level and weapon editors write back stored values;
the AC editor displays a delta, not a total.

---

## 0. What round 1 found

**Two overstatements in my own assumption table, both verified by me after the
reviewers flagged them.**

- **B-A2.** I wrote that choosing 10 over 10 "can produce no row at all". False:
  the executor inserts a `character_operations` row unconditionally after every
  accepted command (`src/commands/character-command-executor.ts:214-222`). The
  *conclusion* survives — an operations row cannot prove all six were allocated
  atomically, and `character_operations` is excluded from snapshot, backup and
  share, so any inference from it dies at import — but I stated it wrong.
- **B-A4.** I wrote "reuse `source_instance_id` unchanged". `source_instance_id`
  is **nullable** (`db/schema/origins.ts:681`) and guided species copying writes
  NULL. The mechanism is right-sized; the *guarantee* D63 needs is not there, so
  `ability_increase` requires a kind-specific CHECK making the source mandatory.

**The best finding came from a reviewer and neither I nor the other reviewer saw
it: the planner ability editor is a writer fed by a reader, and §6 defended only
readers.** `src/ui/screens/planner/editors.ts:112` displays
`workspace.report.character.abilities[ability]`, and `:117-118` dispatches
`update_ability`, which writes **base**. The moment the report carries resolved
totals, a person who sees 17 and nudges it to 18 writes **base = 18** — baking a
contribution into the base by hand, which is exactly what D63 forbids — while
`B2-BASE` stays green because it only mutates the resolver. §3.7 and control
`B2-EDIT` now cover it.

**A second concrete round-trip defect:** share **omits a score equal to 10** on
export (`src/sharing/character-share.ts:914-918`) and refills `?? 10` on import
(`:1272-1276`). An allocated all-10s character therefore round-trips into looking
unallocated unless the signal itself travels. D64 makes all-10s explicitly valid,
so this is reachable, not theoretical.

**Reviewer disagreement, arbitrated.** One called the species scope cuts a
BLOCKER that narrows D63; the other said D63's own sequencing sentence — *"Species
domain modelling follows"* — makes them sequencing, not narrowing. **The second
reading is right and the ruling says so in its own words.** But the first
reviewer's underlying point is kept: production already lists unmade choices for
**six** species, not the two D63 named, and §3.5 now names the full inventory so
the deferral is explicit rather than accidental.

---

## 1. Two units, and why they are one plan

**B1 — the abilities step.** A guided character keeps six 10s nobody chose. This
is the largest single gap to D54's bar.

**B2 — the contribution layer.** D63: base is what the player allocated;
background, feat and species increases are additive contributions that know their
source. D64 adds initiative as its second consumer.

They are one plan because B2's correctness is only observable once B1 exists — a
contribution on top of a defaulted 10 is indistinguishable from a defaulted 11.

## 2. Assumptions

Surveyed against the real code. **Everything marked PROVEN below was verified by
the supervisor directly, not relayed.**

| # | Assumption | Status |
|---|---|---|
| B-A1 | The six scores are NOT NULL columns on `characters`, default 10, range 1–30 | **PROVEN** (`db/schema/character.ts:56`) |
| B-A2 | Nothing distinguishes a chosen 10 from a defaulted 10 | **PROVEN, restated after round 1.** `change_log` records only actual diffs, so a 10→10 confirm writes none — but the executor DOES insert a `character_operations` row unconditionally (`character-command-executor.ts:214-222`), which my first wording denied. The conclusion holds for a different reason: that row cannot prove all six were allocated **atomically**, and `character_operations` is excluded from snapshot, backup and share (`src/domain/contracts/tables.ts:272-279`), so inference from it dies at import. `updated_at` moves on every command and is not specific |
| B-A3 | **`effectKinds` is exactly `damage_resistance | hp_modifier | speed`** | **PROVEN, supervisor-verified** (`src/domain/enums.ts:632-637`). No ability-increase kind exists |
| B-A4 | **`character_effects` already carries provenance** | **PROVEN for the MECHANISM, overstated as a guarantee.** The composite FK and cascade are real, so B2 is a new KIND on an existing mechanism. But `source_instance_id` is **nullable** and guided species copying writes NULL (`db/schema/origins.ts:681`), so provenance is available, not enforced. **`ability_increase` needs a kind-specific CHECK requiring a non-null source**, or D63's "knows where it came from" is a convention rather than an invariant |
| B-A5 | **Feat `ability_points` is seeded and never applied** | **PROVEN.** The column is real and `feats-srd.ts` writes it; the catalog projection drops it and grants read `grant_rules` instead. Negative search across `src/` and `db/` found only schema, generated contracts, seeder and tests. **B2 builds feat ASI application for the first time** |
| B-A6 | **Four independent production readers select the raw six columns** | **PROVEN, supervisor-verified** — sheet builder, build report (`:402`), spell access (`:307`), workspace. This is the plan's central risk; see §6 |
| B-A7 | **Dwarf HP is ALREADY modelled end to end** | **PROVEN, supervisor-verified.** D63 named it as work; it is done. The template seeds an `hp_modifier` effect, the sheet reads it (`character-sheet-builder.ts:506-516`), and the UI prints class total and species contribution as separate rows (`sheet-view.ts:152-162`). **Cut from scope** |
| B-A8 | Standard array and point costs live in an SRD extract | **PROVEN** (`docs/srd/source/ability-score-generation.txt:19-26`): array `15, 14, 13, 12, 10, 8`; 27 points; full cost table. **Parsed only inside a unit test** — no `src/` consumer |
| B-A9 | Species choices have nowhere to live | **PARTLY DISPROVED.** `character_source_instances.config` is the intended home for `lineage.chosen_option` and can carry `spellcasting_ability`; the guided path writes only `{class_level: 1}`. There is no dedicated table and none is needed |
| B-A10 | HP uses the live Constitution modifier | **PROVEN** (`src/rules/sheet.ts:680`). A Constitution contribution must enter BEFORE `hitPointMaximum()`, or HP is silently wrong while the displayed score is right |
| B-A11 | Spell access already tolerates an unchosen casting ability | **PROVEN** — absent or invalid `config.spellcasting_ability` becomes `null`, not a guess. D33 is already satisfied there |

## 3. Decisions this plan takes

### 3.1 An explicit allocation signal, because inference is unsound

B-A2 proves no current state distinguishes chosen from defaulted. **Taken: one
atomic operation writes all six base scores together and records that allocation
happened.** Not six separate `update_ability` calls — the step is one decision and
partial allocation is not a state the wizard should be able to produce.

**Pinned storage, which revision 1 left open and both reviewers called the first
place two agents would diverge: a nullable `characters.ability_allocation_method`
column, `'standard_array' | 'point_buy' | 'manual'`, NULL meaning never
allocated.** The method doubles as the signal — D64 needs the method anyway for
its warnings, so one column serves both and there is no second thing to keep in
step.

**Its five touch points, enumerated because adding a column to `characters` has
already broken this project's backup codec once:**

1. `CHARACTER_STATE_COLUMNS` for snapshot capture and restore. **Revision 2 said
   "version-aware", which named a mechanism that does not exist:** snapshot
   versioning covers *tables*, not columns, and both validators enforce the
   current column list against every accepted version — so adding a column breaks
   the seven save-point versions this project deliberately keeps loadable.
   **Pinned:** bump the snapshot version; both validators treat the column as
   required at the new version and absent-decodes-as-NULL below it; restore
   writes NULL when the snapshot predates it.
2. Backup exact-key validation, **in both directions** — export emits it, import
   requires it.
3. The share wire, encoder and importer. **This one has a live defect:** share
   omits a score equal to 10 on export and refills `?? 10` on import, so an
   allocated all-10s character round-trips looking unallocated unless the signal
   travels with it. D64 makes all-10s explicitly valid, so this is reachable.
4. Character row decoding and the row contract.
5. Regenerated column facts.

**Also pinned, and revision 2 stated this too loosely:** riding the executor is
not by itself enough. `prepareInverse` is an exhaustive switch and root columns
come back only through a **snapshot inverse** whose projection includes the
column. So the allocation command's inverse is pinned as a snapshot inverse, and
the column must join `CHARACTER_STATE_COLUMNS` for undo to restore it with the
scores. **Also:** `GuidedAllocateAbilitiesParams` must carry `operation_uuid` and
`expected_revision` — every executor request requires both, and revision 2's seam
omitted them, which would have failed at the first dispatch.

**The method records HOW allocation happened and is not touched by later
`update_ability` edits.** Said explicitly so nobody wires the editor to flip it to
`'manual'`.

*Seam:* the column plus one completion predicate. *Cost to flip:* the five touch
points above; the alternative is inference, which B-A2 disproves.

### 3.2 The three methods, and what warns

Per **D64**: standard array is the default. Point buy and manual entry are
offered and **warn**. All 10s is valid and not an error.

**The weakness warning fires on the RESULT, not the method:** fewer than two
abilities at modifier +2 or better (score 14+) and the screen says the character
will be weak and suggests point buy or standard array.

**D49's distinction is load-bearing here and a control enforces it:** every one of
these is a warning. None blocks submission. A warning that prevents progress is a
block wearing a friendlier word.

### 3.3 Contributions are a new `character_effects` kind

B-A4 proves the provenance mechanism exists. **Taken: add an
`ability_increase` kind carrying the ability and a signed amount**, following the
existing per-kind payload pattern, and reuse `source_instance_id` unchanged.

**The kind requires a non-null `source_instance_id`** — see B-A4. Provenance is
available on `character_effects` but not enforced, and D63 requires a contribution
to know its source, so the CHECK is what turns a convention into an invariant.

**THE RESOLVER'S ARITHMETIC IS PINNED, and revision 2's omission of it is what
made this plan briefly worse than revision 1.**

Contributions apply **in `(sort_order, id)` order** to a running total starting at
base. Each positive contribution adds
`max(0, min(running + amount, maximum) − running)` — so it applies **partially**
when it would cross its own cap (base 19 with `+2/max20` contributes 1) and
**zero** when the running total already meets or exceeds its maximum. Negative
contributions floor the running total at **1**, because `AbilityScore` throws
below it and a throw is not a number a person can read.

This is order-dependent by construction, and that is deliberate: the alternative
is a rule that silently discards part of a contribution with no stated reason.
`(sort_order, id)` is stable and total even though `sort_order` is the user's
editable display order and not an acquisition chronology — the tie-break on `id`
is what makes it total. **The unit test fixture is base 19, `+2/max20`,
`+1/max30`, asserted in BOTH orders**, because a rule that only works in one is
not a rule.

**The payload carries a maximum, not just an amount.** Background increases stop
at 20 and feats differ; `AbilityScore` **throws** outside 1–30
(`src/rules/ability-score.ts:4-13`). A `15 + 2` happy path passes while a
high-score character over-applies or becomes unreadable. Revision 1's
`{ability, amount}` could not express that.

*Seam and blast radius — revision 1 undercounted this:* the enum member; the
payload columns; **both** effect tables, since `effectKinds` is shared and the
CHECK on `species_template_trait_effects` widens too (plus a decision on whether
the catalog table carries the payload at all); the **exhaustive switch** in
`src/rules/species-effects.ts`; the row contract; the **share validator**, which
enforces exact keys and per-kind payload pairings, so export would emit keys
import refuses until both change; the wire-version decision; and the backup
portable row shape with regenerated column facts.

**The required-source CHECK collides with the share wire, and B3 is the
producer.** The wire documents that an effect whose owner is unreachable "still
travels, it simply arrives without its provenance" — `sourceRef` is dropped. A
background currently travels as **text only, with no reference-minting entry**,
so a background-owned `ability_increase` would export with its provenance
stripped and then be **refused by our own importer** under the new CHECK. That is
precisely the defect D60 says survives its own narrowing: an export its own
importer refuses. **Pinned:** the share document's background entry becomes a
reference-minting entry, mirroring species; `sourceRef` is **required** on the
wire for `ability_increase` and the validator refuses its absence; import mints
the owning instance before inserting the effect. The "travels without provenance"
allowance does **not** extend to this kind. *Cost to flip:* a separate
table would duplicate provenance that already works and need its own cascade —
rejected.

### 3.4 One resolver, used by all four readers

B-A6 is the whole risk. **Taken: a single base-plus-contributions resolver, and
all four raw-score readers go through it before constructing `AbilityScores`.**
Transport readers — CRUD, backup, share, snapshot — keep exporting **base plus
contribution rows, never totals**, so a round trip cannot bake a contribution
into a base.

### 3.5 The planner editor edits BASE, and a control proves it

**Found by a reviewer; neither I nor the other reviewer saw it, and §6 as written
would not have caught it.** `src/ui/screens/planner/editors.ts:112` displays
`workspace.report.character.abilities[ability]` and `:117-118` dispatches
`update_ability`, which writes **base**. It is a **writer fed by a reader**, and
revision 1's trap section defended only readers.

If the report carries resolved totals, a person seeing 17 and nudging it to 18
writes `base = 18` — the contribution baked into the base by the user's own hand,
which is precisely what D63 forbids — and `B2-BASE` stays green because it mutates
only the resolver.

**Taken: the planner ability editor displays and edits BASE, with the resolved
total shown beside it.** Control `B2-EDIT` mutates the editor to display totals.

**The nearest sibling is B1's own step, and it is armed one dispatch later.** The
guided abilities step is itself a writer; at B1 time it reads raw base trivially,
but the moment B2 lands, a step prefilling manual entry or a revisit from the
report's totals re-commits totals as base — the identical defect. **Pinned: the
step's inputs and any prefill read `abilities_base`, never the resolved total.**

### 3.6 Seam additions, pinned before either dispatch

Every dispatch in this project so far found a seam gap. Committing the list up
front rather than discovering it again:

- `AbilityAllocationMethod = 'standard_array' | 'point_buy' | 'manual'`
- `GuidedAbilityScores` — six named ability fields
- `GuidedAllocateAbilitiesParams { character_id, method, scores }` plus its
  exact-keys validator
- `AbilityWarning` as a **discriminated union** (`'method' | 'weak_scores'`) —
  **warnings as DATA is what makes D49's warn-versus-block distinction
  structural** rather than a matter of styling
- `GuidedAllocateAbilitiesResult { character_id, current_step, warnings }` —
  warnings are **not** refusal reasons and must not share that union
- the weakness predicate (two abilities at 14+) as one named function
- `GUIDED_RPC.allocateAbilities`, `GUIDED_PANEL.abilitiesStep`, and the
  method-selector and warning locators
- `GuidedStepEvidence.abilitiesAllocated`, replacing the `abilities: true`
  currently hardcoded in `guided-creation.ts`
- the production rules module path for `STANDARD_ARRAY`, the point budget and the
  cost table
- `AbilityIncreaseEffect` — `effect_kind: 'ability_increase'`, `ability`,
  signed non-zero `amount`, `maximum`, and a **required** `source_instance_id`
- the initiative contribution kind and payload — see B4
- **the resolver's signature, returning `{ base, contributions, total }` with all
  three addressable**
- **the read model WIDENS — revision 2's "pin which one" was unsatisfiable.**
  `report.character.abilities` feeds three consumers needing two different
  answers: the editor input (**base**), the planner's casting attack/DC badges
  (`editors.ts:141-148`, **total**) and `AbilityScores.fromArray(...)` for slot
  math (`character-workspace-builder.ts:308`, **total**). Pinned: the report
  surface carries **both** — `abilities` becomes the resolved total and a sibling
  `abilities_base` carries base. Per surface: **editor inputs and the guided
  abilities step read `abilities_base`**; casting badges, slot math,
  `CharacterSheet.ability_scores` and the machine block read `abilities`.
- **`CharacterSheet.initiative` stops being a bare number.** Its own comment says
  advantage "is not represented here"; B4's roll-state contribution needs the
  field, its sheet-view rendering and its machine-block shape — none of which
  revision 2 named.

### 3.7 Scope boundaries

**In:** the abilities step; the allocation operation and signal; the
`ability_increase` kind; the resolver and all four readers; background ASI
selection writing sourced contributions (D61); initiative sources modelled (D64).

**Out, and each says why:**
- **Dwarf HP** — already done (B-A7).
- **Every species choice, not just Elf's.** One reviewer called this a narrowing
  of D63; the other pointed at D63's own sentence, *"Species domain modelling
  follows"*, and that reading wins because the ruling says it in its own words.
  But the deferral is named in full rather than by example: production already
  lists unmade choices for **Dragonborn, Elf, Gnome, Goliath, Human and
  Tiefling** (`src/ui/screens/guided-builder/species-step.ts`). All six defer
  together to the species-choice unit; their storage is `config`, per B-A9.
- **Human's extra feat and skill** — needs a child feat source and skill
  provenance; skills have no source column at all today.
- **Feat ASI application** — the kind this plan adds is what makes it possible,
  but wiring feats is its own unit.

## 4. Dispatches

**B1 — the abilities step.**
Exit: the SRD array and point-cost table move from the test into a production
rules module; one atomic operation writes all six scores and records allocation;
the step offers three methods with standard array default; point buy, manual
entry and the fewer-than-two-+2s condition each WARN and none blocks; the derived
step advances only after allocation; a reload preserves it.

**B2 — the contribution layer.**
Exit: `ability_increase` exists as an effect kind with ability and amount; one
resolver sums base plus contributions; **all four readers use it**; a Constitution
contribution changes HP; a casting-ability contribution changes spell attack and
save DC; base is unchanged by any contribution; removing the granting source
removes exactly its contributions.

**B3 — background ASI, per D61.**
Exit: the player assigns the increases and picks the Origin feat; both are
written as contributions owned by a background source instance; the SRD's printed
pairing is shown as a suggestion and never enforced; the deviation is labelled
where a person can see it.

**The background source instance does not exist and nothing was planning to mint
it.** A5 writes only `character_background` — "the parent row is the whole
footprint" — and `background_definitions` is never seeded, the same fact that
killed two earlier review rounds on the species side. **Pinned: mirror the species
bridge** — seed `background_definitions`, mint a marker-tagged instance, exactly
as `guided-creation.ts` does for species. *Consequence for B2:* its cascade exit
has no natural producer inside its own scope, so `B2-CASCADE`'s test mints a
synthetic source instance. Said here so it is not discovered as a surprise.

**B4 — initiative, per D64.**
Exit: every source that changes initiative is modelled and the sheet's number is
correct; a source that cannot be applied says so rather than being folded
silently into the number.

**Revision 1 said "their sum" and that is not implementable.** Alert adds the
**proficiency bonus**, which scales with level, not a flat constant; Remarkable
Athlete changes initiative by granting **Advantage**, a roll-state change the
numeric function cannot express at all. So the kind needs a calculation
discriminator — `flat | proficiency_bonus` — mirroring `hp_modifier`'s existing
flat/per-level split, plus a separately modelled roll-state contribution. The
plan must enumerate the bundled initiative sources and say, for each, whether it
changes **the number** or **the roll**.

**A collision worth stating: Alert is an Origin feat, and feat application is
deferred.** So at B4's time the only live numeric source is the Dexterity
modifier the resolver already fixes, and "every source is modelled" would be
satisfiable as modelled-but-unapplied. D33's own title is *"A disclosed wrong
number is still a wrong number"*, and D64 says initiative must be **correct** —
so the feat-source application seam plus **Alert's one structured effect** is
pulled into B4. Without it, a character who takes Alert the moment B3 ships has a
wrong initiative with a note beside it.

**Revision 2 said "non-ASI feat-granted effects", which was over-broad and would
have dragged feat application in wholesale.** The other bundled origin-feat
non-ASI effects move no sheet number — Savage Attacker is a damage reroll,
Lucky is luck points, Magic Initiate already flows through grant rules — so under
D35 they earn no structure yet. **Narrowed to: feat effects that change
initiative.** B4 must also materialise the Champion roll-state effect, which
revision 2 left unstated.

## 5. Disclosures this plan DELETES

Not rewords — deletes, per the rule A6 established:

- the abilities-step-skipped disclosure on the species screen, once B1 lands;
- `abilities: true` pinned in the completion map, replaced by real detection.

## 6. The trap

**Resolving contributions in one pipeline and not the other three.** A plausible
implementation shows Strength 17 on the sheet while HP still uses base
Constitution (B-A10), spell save DCs still use base scores, the planner's slot
maths still uses base, and the build report still prints base. Every
persistence test passes. The character is wrong on three screens out of four.

**Therefore B2's exit is not "a contribution row exists".** It is: a Constitution
contribution moves HP, and a casting-ability contribution moves spell attack and
save DC. Those two assertions cross the pipelines that a single-site fix would
miss.

## 7. Controls

- **B1-ALLOC** — make the completion predicate infer allocation from the scores
  rather than the signal. The all-10s test must fail. This is B-A2 made real.
- **B1-BLOCK** — make the weakness warning prevent submission. The
  warn-not-block test must fail. **Revision 1 left this unfireable in practice:**
  styling, a `role="alert"`, or a button that merely looks enabled proves
  nothing. Pinned two-part assertion, at the RPC-result level with the browser
  suite proving the submit path — allocation **succeeds** (the signal is written
  and `current_step` advances past `abilities`) **and** the warning is present as
  data. One journey per warning class: point buy, manual entry, and the weak
  result. Warnings living in the result type (§3.6) is what makes this
  assertable at all.
- **B1-ARRAY** — change one number in the standard array. The extract-agreement
  test must fail, and it must fail against `docs/srd/source/`, never against our
  own output.
- **B2-HP** — resolve contributions for display only, leaving `hitPointMaximum()`
  on base Constitution. The HP test must fail. **This is the control that matters
  most**; it is the trap in §6 made executable.
- **B2-DC** — same, for spell save DC and attack bonus. Revision 2 diagnosed that
  an unnamed pipeline makes this satisfiable by fixing a different one, and then
  named none. **There are TWO independent calculations, not three** — the build
  report reuses spell-access routes rather than computing its own. Pinned: one
  mutation and assertion each for **spell access** (`spell-access-builder.ts:307`)
  and **workspace slot math** (`character-workspace-builder.ts:218`/`:308`); the
  planner's casting badges (`editors.ts:141-148`) are a display fed by the report
  surface and are covered by §3.6's per-surface pin.
- **B2-BASE** — mutate the **contribution writer** to write the total into the
  base column. The base-unchanged test must fail. Contributions must never become
  base. *(Revision 1 mutated the resolver, which would have made a nominally pure
  function perform database writes — a mutation the type system may refuse.)*
- **B2-EDIT** *(§3.5)* — make the planner ability editor display resolved totals
  instead of base. **REWRITTEN AT ROUND 2, because as first written it could not
  fail.** `update_ability` writes what was TYPED into base regardless of what was
  displayed, so "base equals what was typed, total exceeds it by the
  contributions" holds under the mutation and under correct code alike. **The
  only observable that separates them is the PRE-EDIT DISPLAYED VALUE.** Pinned:
  with non-zero contributions present, the test asserts the input shows **base**
  (15, not the total 17) **before** any edit; the post-edit round trip is kept as
  a secondary assertion. This was the control written specifically to prevent the
  best defect either review found, and it was decorative.
- **B2-SHARE** — drop the ability, amount **and maximum** fields from the share
  effect tuple, each with its own assertion. A round-trip test must fail per
  field. The wire has a hand-written nine-field tuple with fixed payload lists,
  so a new payload is silently lost without this; revision 2 protected two of the
  three fields and a dropped `maximum` would resolve to a different number.
- **B2-PROVENANCE** *(new)* — export a background-owned `ability_increase` and
  re-import it. It must NOT be refused by our own importer and must NOT arrive
  without its source. This is the collision between the required-source CHECK and
  the wire's provenance-optional allowance, made executable.
- **B1-SIGNAL** *(new)* — omit the allocation signal from the share wire. An
  all-10s character exported and re-imported must NOT come back looking
  unallocated. This is §3.1's live defect made executable.
- **B2-CASCADE** — drop the source link on an ability contribution. Removing the
  background must then leave its increase behind, and that test must fail. **The
  mutation script must drop the kind's required-source CHECK alongside**, or the
  insert fails on the constraint and the control proves a constraint works rather
  than that the cascade does.
- **B2-CAP** *(new)* — make the resolver sum contributions without applying
  maxima. The capped-total test must fail. Fixture: base 19, `+2/max20`,
  `+1/max30`, asserted in both orders. Without this, §3.3's arithmetic is prose.
- **B4-INIT** — remove **Alert's proficiency-bonus contribution**. The initiative
  test must fail. Revision 2 admitted this was unanchorable "until the sources are
  enumerated" — in the plan that was meant to enumerate them. B4's table now does,
  so the control tests against a **plan-authored** list rather than an
  implementation-authored one, which is the whole difference between a control and
  a tautology.

## 8. Verification

Gates: `npm run build` (which is `tsc -b`) and `npx vitest run`, plus one browser
suite on a unique port. **Never `npx tsc --noEmit -p tsconfig.json`** — the root
config is a solution file with `files: []` and exits 0 unconditionally; it was
run as a gate for three dispatches before that was caught.

Every control: apply, prove applied, run, revert, prove restoration by
re-running. Mutations go in a script file, not inline shell. **Commit before
controlling** — a `git checkout` against a file with uncommitted work destroyed a
completed dispatch in this project once already.

Forbidden paths to green: no `any`, `@ts-ignore`, `@ts-expect-error`, `.skip`,
`.todo`, no config edits, no weakened assertions, no deleting a test to pass, and
never regenerate an expectation from our own output.
