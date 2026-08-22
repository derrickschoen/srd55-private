# Three-model application audit — Fable, Opus, Sol

Date: 2026-08-22. Owner-ordered full audit of the app and its assumptions:
mistakes, assumptions without evidence, simplification and clarity
opportunities. Tree audited: `wt/vtt` at `6e2ab463` (composition and
scraper-pack landed).

Roles: **Sol** (gpt-5.6-sol, three read-only scoped passes + one adversarial
critique pass) produced candidate findings. **Fable** (this session's
supervisor) verified — the highest-stakes claims by *execution*, the rest by
reading — and arbitrated. **Opus** (claude-opus-5, capability-contained, no
tools) arbitrated the verified set blind and produced the re-grouping, wave
plan, and owner questions. Convergence note: Sol-B and Fable independently
found the same two findings (F-DEAD, F-UNION) without seeing each other's
work.

Verified-vs-claimed is marked per finding: **[E]** = executed by the
supervisor this session (probe output quoted), **[R]** = traced in source by
Sol and spot-checked by the supervisor, **[C]** = claimed by one auditor,
not independently confirmed.

## The three findings that matter most

### 1. [E] The content-pack trust boundary is unenforced

`loadContentPack` accepted `{kind:'attack_damage', dice:null, damageType:null,
rider:null}` — probe returned `status: 'loaded'`. Seven operation kinds
(step-1–3 vintage) have real zod schemas at `content-pack.ts:740-746`;
everything after — choice/branch, condition lifecycle, roll/defense,
attack_damage, **composition** — falls through to key-presence +
allowed-keys checking (`content-pack.ts:747-754`), values unvalidated. First
cast dereferences the null. Two same-shape corollaries: the public JSON
schema requires only `['kind']` where runtime requires four more fields
(schema/code drift, hand-maintained twice — the documented duplication
lesson), and pack speed may legally be 100,000 (`content-pack.ts:534`, no
clamp anywhere on the path, traced through five files) while `numberUnion`
is uncapped — a legal pack makes the typed turn-program surface build a
100,001-literal union on the typed decode path.

### 2. [E] Composition's refusal heuristic corrupts valid casts

`executeCompositionStep` infers "applied" from a semantic state delta
(`encounter.ts:4763`). A target's **successful** initial save produces no
state change, is classified `operation_refused`, and under
`onRefusal:'abort'` rolls back earlier completed steps. Probe: composed
[3 damage, condition-with-save], target saves — **hp 20 → 20 where 17 is
correct**. This is a class, not an instance: any composed success with no
state delta is indistinguishable from refusal. The RNG half is worse:
rollback restores state and events but not the mutable closure RNG, so
"atomic" abort (the declared contract, `types.ts:281-287`) leaks draw
position into every subsequent roll. Opus's arbitration: the fix is an
explicit typed per-operation outcome channel (applied/refused/no-op +
RNG consumption) — not event-sniffing, not heuristic removal alone — and
R7 (repeat-save ends the condition but not its composed recurring damage)
is plausibly the same missing channel seen from the effects side.

### 3. [R] D280's mutation bar is declared and unenforced

D280 rules "whole-src/ zero-unexplained" before v1. `stryker.config.json`
mutates four directories with `break: null`; the shard merge tool prints
totals without failing. No command enforces the ruled bar. Opus ranked this
the highest-leverage item: most findings in this audit are things a working
bar would have caught, and the pre-alpha deletion bias is only safe with a
working kill-instrument.

## Systemic theme: tooling that asserts success it did not verify

Three independent instances, one species (the recorded
"skipped-is-not-passed" lesson, re-learned):

- [E] `assert-dist-clean.mjs` claims "every scraper module imports
  provenance.ts"; **six do not** (cli, feat-grants-bridge, fetcher, html,
  robots, sitemap). The `src/`-import route is separately covered by a
  vitest scan, so exposure is the defense-in-depth layer being fictional,
  not an open door.
- [R] `analysisCodeDigest` (vtt-experiment.ts:639) hashes a hand-written
  label, not analysis code — a falsified provenance claim on experiment
  reproducibility. E05B inherits it.
- [R] Scraper pack emission silently skips non-`done` queue items; the
  report cannot show what was omitted (cli.ts:307). The catalog build has a
  completeness gate; the pack build does not.
- Related: [R] `scripts/mutation-e5-veterans-strike-divisor.sh` counts any
  nonzero vitest exit as a kill (no-test-matched included) and has no
  callers. (Sol's "no restore" sub-claim was **refuted** — a `trap restore
  EXIT` exists; recorded as an example of why VERIFIED labels get re-checked.)

## Rules-correctness findings (engine, pre-existing) [R]

One architecture fact, per Opus's re-grouping: **conditions are effect
entries without a queryable rule surface**, so — Petrified targets still
receive Poisoned (condition-granted immunity unread, only profile
immunities checked, `encounter.ts:2751`); Poisoned/Frightened ability-check
disadvantage never applies (`encounter.ts:1161` reads only effects);
Frightened/Prone movement restrictions absent from movement planning.
Separately: Frightened attack disadvantage keys on source identity, not
line of sight (`encounter.ts:1014`); Guidance/Resistance silently default
their cast-time choice to Arcana/Acid where the SRD requires a choice and a
strict CastChoice path already exists (`encounter.ts:3794` — duplication);
multi-target fixed-round modifiers expire on the first target's clock
(`encounter.ts:4016`).

## Security-adjacent [R]

Session persistence `decodeRevision` accepts any `transition.kind` string
and the checksum is recomputable by whoever writes the file — the artifact
vouches for itself (`session-persistence.ts:287`). Severity depends on
whether saved sessions ever cross a trust boundary (owner question 1).

## Simplification / clarity

- [E] `movementBudget` fallback (turn-program-types.ts:81) is dead — the
  second `find` repeats the first's predicate. One-line collapse.
- [R] Legacy save-damage arms duplicate the newer damage-operation
  machinery (`types.ts:512-543` vs `damage-operations.ts`); legacy
  chosen_when_cast rewriting duplicates strict CastChoice. Both are
  delete-the-old-generation candidates — after the mutation bar works.
- [R] Narration/adjudication reply variants have decoders and tests but no
  production path. `RelayTransport`'s deletion was **rejected in
  arbitration**: D312 explicitly orders type-only seams for player
  browsers; its ownership-encoding critique is retained as design input.
- [R] Migration "checksums" in session-persistence hash description
  strings, not migration code (same species as analysisCodeDigest).
- [C] Sol-A: recurring-damage/condition composed as unrelated effects
  (R7); assumption at `types.ts:304` that depth-4 "covers the measured
  residue" has no recorded measurement behind it (the measurement exists in
  the private repo; the public comment should say "policy limit" or cite
  it).
- Fable's stale-register finding on `.claude/assumptions/SHARE-VERIFY-01.md`
  was **refuted** by Sol (file is labeled frozen, excluded from live-ref
  scanning, unread) — recorded as the cross-critique working in both
  directions.

## Remediation waves (Opus proposal, arbitrated by Fable)

- **Wave 0 (small): make the instruments honest** — dist-clean guard
  enumerates instead of assumes; analysisCodeDigest hashes real source or
  dies; pack emission reports skipped items; delete dead movementBudget
  fallback. Each guard gains a negative test proving it can fail.
- **Wave 1 (medium): close the trust boundary** — real schemas for the five
  unvalidated operation kinds; generate the public JSON schema from the zod
  source (or a conformance test); bounded SpeedFeet; hostile-pack corpus
  rejected at load, never at cast. R8 joins if sessions are shareable.
- **Wave 2 (medium): enforce the D280 bar** (as the owner re-scopes it) —
  one command, real threshold, survivor debt explicitly declared, the two
  known Stryker misreports guarded.
- **Wave 3 (medium-large): typed operation outcomes + atomic composition** —
  outcome channel with RNG consumption, delete the state-delta heuristic as
  a consequence, per-target effect clocks; pinned test asserts hp 17 and an
  abort-determinism test pins the RNG stream.
- **Wave 4 (large): conditions become a rule surface, then delete legacy** —
  queryable condition interface closes the immunity/roll-mode/movement
  cluster; Frightened LOS fix inside it; then delete silent-default casts
  and legacy save-damage arms.

Waves 0 and 1 can run in parallel; 2→3→4 are serial. Full texts of all
lane outputs: `.tmp-audit-sol-{a,b,c}.log`, `.tmp-audit-critique.log`
(wt/vtt), `opus-arbitrate-out.txt` (session scratch, reproduced in the
session transcript).
