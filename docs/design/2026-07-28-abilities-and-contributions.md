# Ability scores: the step that sets them, and the layer that adds to them

Plan author: Claude Opus (supervisor). Track A, toward D54's "usable" bar.
Status: **DRAFT** — awaiting independent review by fable and sol.

Law: `.claude/decisions.md` D1..D64. Binding here: **D33** (an unknown says
unknown), **D35** (anything changing a sheet number earns structure), **D49**
(warn and block are different mechanisms and must not be conflated), **D54** (the
bar is usable), **D55** (order: class → abilities → species → background →
skills → equipment; Roll in Order is deleted), **D61** (background required; its
Origin feat and ASI are player-chosen), **D63** (base plus contributions; every
species modelled), **D64** (standard array default, everything else warns;
initiative must be correct).

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
| B-A2 | Nothing distinguishes a chosen 10 from a defaulted 10 | **PROVEN.** Creation supplies only name and timestamps; `updated_at` is set at creation so it is not a signal; `character_operations` stores the INVERSE command and `change_log` stores only actual diffs, so choosing 10 over 10 can produce no row at all. Import and snapshot restore bypass `update_ability` entirely |
| B-A3 | **`effectKinds` is exactly `damage_resistance | hp_modifier | speed`** | **PROVEN, supervisor-verified** (`src/domain/enums.ts:632-637`). No ability-increase kind exists |
| B-A4 | **`character_effects` already carries provenance** | **PROVEN** — rows point at the granting `character_source_instances` row, a composite FK keeps effect and source on the same character, and source deletion cascades. **This is why B2 is a new KIND on an existing mechanism, not a new mechanism** |
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

*Seam:* the new operation plus one completion predicate. *Cost to flip:* none
foreseen; the alternative is inference, which B-A2 disproves.

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

*Seam:* one enum member, one payload pair, the schema check, the row contract,
the effect consumer. *Cost to flip:* a separate table would duplicate provenance
that already works and would need its own cascade — rejected.

### 3.4 One resolver, used by all four readers

B-A6 is the whole risk. **Taken: a single base-plus-contributions resolver, and
all four raw-score readers go through it before constructing `AbilityScores`.**
Transport readers — CRUD, backup, share, snapshot — keep exporting **base plus
contribution rows, never totals**, so a round trip cannot bake a contribution
into a base.

### 3.5 Scope boundaries

**In:** the abilities step; the allocation operation and signal; the
`ability_increase` kind; the resolver and all four readers; background ASI
selection writing sourced contributions (D61); initiative sources modelled (D64).

**Out, and each says why:**
- **Dwarf HP** — already done (B-A7).
- **Elf lineage and spellcasting-ability choices** — real work, but they are
  species *choices* whose storage B-A9 identifies; they ride `config` and belong
  with the species-choice unit, not here.
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

**B4 — initiative, per D64.**
Exit: every source that changes initiative is modelled and the sheet's number is
their sum; a source that cannot be applied says so rather than being folded
silently into the number.

## 5. §3.5 disclosures this plan DELETES

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
  warn-not-block test must fail. D49's distinction, enforced.
- **B1-ARRAY** — change one number in the standard array. The extract-agreement
  test must fail, and it must fail against `docs/srd/source/`, never against our
  own output.
- **B2-HP** — resolve contributions for display only, leaving `hitPointMaximum()`
  on base Constitution. The HP test must fail. **This is the control that matters
  most**; it is the trap in §6 made executable.
- **B2-DC** — same, for spell save DC and attack bonus.
- **B2-BASE** — have the resolver write the total back to the base column. The
  base-unchanged test must fail. Contributions must never become base.
- **B2-CASCADE** — drop the source link on an ability contribution. Removing the
  background must then leave its increase behind, and that test must fail.
- **B4-INIT** — remove one initiative source from the sum. The initiative test
  must fail.

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
