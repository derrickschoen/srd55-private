
OpenAI Codex v0.154.0
--------
workdir: /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
model: gpt-5.6-sol
provider: openai
approval: never
sandbox: workspace-write [workdir, /tmp, $TMPDIR] (network access enabled)
reasoning effort: high
reasoning summaries: none
session id: 01a0b20e-61fb-71f3-ad42-773bb45989b9
--------
user
RULES (binding, restated): You are the IMPLEMENTER (gpt-5.6-sol, high, RESUMED — COHORT-01 Batch 1, which you stopped BLOCKED correctly). Worktree /home/vagrant/PhpstormProjects/dnd-wt-cohort-01 (claude/cohort-01 at 6887755f + your three uncommitted Batch 1 files). Same sandbox/forbidden rules as your brief: workspace-write in that worktree only; no git writes; no .claude/** or docs/**; no claude / other agents; no Playwright/full vitest/build; never regenerate an expectation from our own output; the V-freeze gate (v1/v5 manifests, brutal/brutal-b/brutal-2/hard-2 fixtures byte-frozen) before and after. The plan is now FROZEN at sha256 4bff2145b445cbb96771333bfdceb5cfdae8781e494cfa48622619cae0a2ac69 (403 lines) — re-read it; the supervisor appended binding amendment N2 (at the end) which resolves your blocker: manifest-declared caps are the cell caps (version-aware at tools/d569-blind-experiment.ts:285/:712: v5 = 8192 history, v6 = 32768), and d569-v5.test.ts stays historical by PINNING that a row produced by today's live runner is refused with exactly "Registered context caps mismatch" (no skip, no relaxed cap), while its manifest validation, hashes and synthesized rows stay green. Mutants: v5 accepting a 32,768 row → red; (the v6 side belongs to Batch 6 — do not build v6 now, but leave the version-aware seam ready and tested with an in-test v6-shaped manifest fragment if the plan's Batch 1 Allowed files permit; otherwise note it for Batch 6). Keep every Batch 1 witness you already have green (second-family 50/50 etc.).

VERIFICATION: tsc app/node; git diff --check; the second-family suite, d569-v5.test.ts (now collecting and running — report Tests counts), d569-blind-experiment.test.ts (list reds by title: the frozen-family ones are expected); V-freeze before/after; git status --short = Batch 1 Allowed files only (list them). OUTPUT: report, then "COHORT-01 B1 FIX R1 DONE" (or BLOCKED with the gap).

codex
I’ll verify the amended 403-line plan and the preserved three-file worktree first, then rerun the expanded pre-change freeze gate including `hard-2`. After reading N2 in context, I’ll adjust only the historical v5 test behavior and the version-aware cap seam authorized by the amended Batch 1 scope.
exec
/bin/bash -lc "sha256sum .tmp-plans/2026-09-17-cohort-01-plan.md
wc -l .tmp-plans/2026-09-17-cohort-01-plan.md
git branch --show-current
git rev-parse HEAD
git status --short
git diff --exit-code -- tests/fixtures/d569-second-family-manifest.json tests/fixtures/d569-blind-experiment-manifest.json tests/fixtures/arena-basis-brutal tests/fixtures/arena-basis-brutal-b tests/fixtures/arena-basis-brutal-2 tests/fixtures/arena-basis-hard-2
sed -n '1,460p' .tmp-plans/2026-09-17-cohort-01-plan.md" in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 0ms:
4bff2145b445cbb96771333bfdceb5cfdae8781e494cfa48622619cae0a2ac69  .tmp-plans/2026-09-17-cohort-01-plan.md
403 .tmp-plans/2026-09-17-cohort-01-plan.md
claude/cohort-01
6887755fe0f204e4bf6d9a37147fa1476bdbada4
 M tests/unit/tools/d569-second-family-manifest.test.ts
 M tests/unit/tools/d569-v5.test.ts
 M tools/d569-second-family-manifest.ts
# VIS-FIELD-01 / COHORT-01 implementation plan r3 (D643 option A1)

Date: 2026-09-17. Baseline: detached clean `807d2e3c8cbbda11cfa26d078ac7739f2954e27e`.
D643 A1 keeps historical hard-2 and adds only three solid-wall brutal v2 families.

## Outcome and hard gates

1. WALL-01 is a hard predecessor. Generation cannot start until its D642 corner seal is
   accepted on a clean checkout. Recheck `src/vtt/room-generator.ts:1227-1231` still defines
   `generatedLineIsOpen` as `tier === 'none' && !blocksSight`. Re-derive all three Batch-9
   expectations against the accepted WALL-01 tree before editing tests; if any stated result
   differs, stop and amend/review this plan rather than copying changed-code output.
2. Before edits, inventory SHA-256 for the v1/v5 manifests and every file under historical
   6203, 6206, and 6207 directories. Repeat after every batch. No byte may change in:
   `tests/fixtures/d569-second-family-manifest.json`,
   `tests/fixtures/d569-blind-experiment-manifest.json`,
   `tests/fixtures/arena-basis-brutal`, `arena-basis-brutal-b`, or `arena-basis-brutal-2`.
3. Never rewrite a historical fixture/manifest, hand-edit generated JSON, add a D466 override,
   use `--terrain-profile`, or relax membership. One failing room rejects all ten seeds; no
   nine-room cohort and no hash is retained.
4. Expectations may come only from frozen pre-change bytes, the hand calculations named here,
   or hashes made after membership and double-generation gates. Generated changed-code output
   is never an oracle for a behavioural expectation.
5. No full Vitest, Playwright, build, or port 4173 in a batch. Later landing gates are separate.
6. Fixed scope is 10 batches with Allowed-file counts `3/3/10/10/10/8/4/4/3/1`: 52 unique
   paths = 18 existing + 34 new. A batch may touch only its manifest and accepted earlier files.

Common checks after every batch:

- **T:** `npx tsc -p tsconfig.app.json --noEmit` and
  `npx tsc -p tsconfig.node.json --noEmit` -> exit 0/0.
- **V:** `git diff --check` -> empty; `git status --short` contains only allowed/earlier paths.
- **V-freeze:** `git diff --exit-code -- tests/fixtures/d569-second-family-manifest.json tests/fixtures/d569-blind-experiment-manifest.json tests/fixtures/arena-basis-brutal tests/fixtures/arena-basis-brutal-b tests/fixtures/arena-basis-brutal-2` -> exit 0.

## D569 demonstrate-then-normalize ledger

1. **Historical regeneration pins:** demonstrate each of 20 committed second-family fixtures
   differs from each canonical rebuild at exactly `$.encounter.state.foggedCells`; preserve raw
   hashes, remove exactly that own key from parsed COMMITTED state, then compare both rebuilds.
2. **New fixture pins:** dated namespace proof -> decoded structural/productivity membership ->
   two independent temp generations with empty `diff -rq` -> `sha256sum` = OpenSSL -> pin.
3. **Second-family v2 pin:** byte-copy hard-2 rows/hashes from v1, add proven 6211 rows, finalize,
   hash v2 independently, then place that hash in v6.
4. **Experiment v6 pin:** byte-carry all v5 fields except version, primary brutal, and nested
   second-family path/hash; pin the final outer v6 manifest hash separately from its contents.
5. **Behaviour pins:** use only Batch 9's explicit ray/path/table calculations, rechecked after
   WALL-01. Preserve stale values only as history comments.
6. **Cap pin:** D643 fixes 32,768; measure the hand-authored oversized block, never derive a cap.

## Pre-Batch-2 namespace reservation gate

Run this after accepted WALL-01 and before adding any range to source/tests. The first command
uses the authoritative MAIN file, not the stale 22,707-line worktree copy; the second audits
tracked consumers. Copy commands, stdout, and statuses verbatim into the dated v2 ledger entry.

```text
rg -n -o -e '6209[0-9]{3}|6210[0-9]{3}|6211[0-9]{3}|6_209_[0-9]{3}|6_210_[0-9]{3}|6_211_[0-9]{3}|6209xxx|6210xxx|6211xxx' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
rg -n -o -e '6209[0-9]{3}|6210[0-9]{3}|6211[0-9]{3}|6_209_[0-9]{3}|6_210_[0-9]{3}|6_211_[0-9]{3}|6209xxx|6210xxx|6211xxx' tests/fixtures tools
rg -n -o -e '\b6209\b|\b6210\b|\b6211\b' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
```

Verified 2026-09-17 output is, verbatim: command 1 -> `23048:6209xxx`,
`23048:6210xxx`, `23048:6211xxx`, `23061:6209xxx`, `23061:6210xxx`,
`23061:6211xxx`, `23071:6209xxx`, `23071:6_209_001`, status 0; command 2 ->
empty stdout/status 1; command 3 -> `23068:6209`, `23068:6210`, `23068:6211`,
status 0. Lines 23048/23061 are costing/authorized reservations, 23068 is D645's
shorthand plan summary, and 23071 is D646's review example: none is prior seed use.
Record one reservation covering all three families before any rejection/reselection.
Any new non-reservation match is a hard stop. If a range later fails, retain it as rejected,
audit a fresh contiguous range in all three representations, and have the supervisor amend this
plan's exact Batch-2 seed table, one Batch-3/4/5 Allowed-file manifest, and all downstream
manifest/route constants before creating replacement bytes. Unamended replacement paths are
unauthorized; the other two initial reservations remain reserved.

## Ordered batches

### Batch 1 — validator normalization and historical semantics

**Allowed files (3):**

- `tools/d569-second-family-manifest.ts`
- `tests/unit/tools/d569-second-family-manifest.test.ts`
- `tests/unit/tools/d569-v5.test.ts`

**R:** add a per-fixture 20-row structural-diff table (one legacy path each, hence today's 40
regeneration violations). Add rebound-hash witnesses proving (a) any second state-field/value
difference still yields both `first_regeneration` and `independent_regeneration`, and (b) a
NEW v2 brutal fixture containing `foggedCells` is rejected even if its hash is rebound. Retain
the two-generation divergence witness. These are hand-authored mutations, not regenerated pins.

**Implementation:** make the schema a strict v1/v2 union. Hash raw bytes first. For v1 hard and
brutal, and v2's carried hard-2 only, parse COMMITTED bytes, require the legacy key, delete only
own `encounter.state.foggedCells`, canonicalize with one newline, and compare each current
canonical rebuild to that projection. Never project generated bytes. V2 brutal-2-v2 compares
raw committed/current canonical bytes and rejects the legacy key. V1 retains integrity plus
static budget/caster/terrain checks but no longer recertifies frozen brutal productivity; v2
retains full current membership/productivity. `d569-v5.test.ts` imports/asserts only the v5/v1
paths and version, uses `canonicalD569SecondFamilyRegeneration`, and becomes green because this
normalization makes v1 valid; it must never resolve v6. `seed - 6203000` may remain only there.

**M:** keep the key, drop all state, normalize generated bytes, allow a new-v2 legacy key, and
ignore regeneration 2; the 40-count, extra-diff, new-v2, and divergence witnesses kill each.

**T/V:** common checks; serially run the two listed suites -> 20/20 one-key demonstrations,
zero v1 violations, all negative witnesses green.

### Batch 2 — RED active membership and frozen-productivity retirement

**Allowed files (3):**

- `tests/unit/vtt/arena-basis-brutal-v2.test.ts` (new)
- `tests/unit/vtt/room-generator.test.ts`
- `tests/unit/vtt/arena-basis-brutal-b.test.ts`

**R:** after the reservation gate, declare exact 6209001-10, 6210001-10, 6211001-10 paths;
expect exactly 30 missing fixtures. Add decoded clones for a nonproductive living monster, a
positive-movement-only Dash monster that MUST pass, and a targeted offensive option whose
resolved origin has a blocked or total trace and MUST fail.

**Implementation:** mirror `arena-basis-brutal-b.test.ts` but order proof before hashes:
identity/reducer load; brutal budget and 90-100% spend; implemented caster; terrain density/count;
then preserve the existing productivity predicate exactly: each living monster has some valid
option with `movementCostFeet > 0` OR an attack/save/cast/world-object slot. A Dash-only monster
therefore remains productive. If the qualifying option has targeted attack/save/cast components,
each target trace from `resolution.mechanics.finalPosition` must be sight-clear and non-total;
movement-only/world-object qualification does not invent a LOS target. Cite the contract and
`room-generator.ts:1227`'s stricter generated-room predicate. Mandatory offense is out of scope.

Move precisely these active assertions: retire `room-generator.test.ts:588-601` productivity for
frozen 6203001-10 while retaining its 6203001-3 byte/digest pins; add equivalent generation and
productivity assertions for 6209. In `arena-basis-brutal-b.test.ts:292-397`, retain structural,
reducer, SHA, and round-execution pins but retire only 378-393's 6206 productivity assertion.
Batch 1 retires only the analogous 6207 productivity assertion. Each comment cites D635/D642/
D643: frozen bytes are history; 6209/6210/6211 own the live contract. No skip/todo.

**M/T/V:** force productivity true, delete the movement arm, and treat `blocksSight:true` as open;
the nonproductive, Dash-only, and blocked-target clones kill each mutant. Common checks; active
suite is RED only for 30 missing files; frozen suites have no productivity red.

### Batch 3 — generate primary brutal-v2 6209001-6209010

**Allowed files (10):**

- `tests/fixtures/arena-basis-brutal-v2/seed-6209001.json`
- `tests/fixtures/arena-basis-brutal-v2/seed-6209002.json`
- `tests/fixtures/arena-basis-brutal-v2/seed-6209003.json`
- `tests/fixtures/arena-basis-brutal-v2/seed-6209004.json`
- `tests/fixtures/arena-basis-brutal-v2/seed-6209005.json`
- `tests/fixtures/arena-basis-brutal-v2/seed-6209006.json`
- `tests/fixtures/arena-basis-brutal-v2/seed-6209007.json`
- `tests/fixtures/arena-basis-brutal-v2/seed-6209008.json`
- `tests/fixtures/arena-basis-brutal-v2/seed-6209009.json`
- `tests/fixtures/arena-basis-brutal-v2/seed-6209010.json`

**R/M/Generation/V:** Batch-2 tests are RED first. Twice run
`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <fresh-temp>/arena-basis-brutal-v2`.
Assert no parsed `terrainProfile` and `d466GeneratedRoomOverride(seed) === null` for 10/10.
Require empty `diff -rq A B`, then decoded membership 10/10 and both mutants. Only then move A
unchanged to Allowed files and rerun membership/common checks. Do not compute hashes yet.

### Batch 4 — generate brutal-b-v2 6210001-6210010

**Allowed files (10):**

- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210001.json`
- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210002.json`
- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210003.json`
- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210004.json`
- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210005.json`
- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210006.json`
- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210007.json`
- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210008.json`
- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210009.json`
- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210010.json`

**R/M/T/V:** identical to Batch 3 with seed 6210001/directory `arena-basis-brutal-b-v2`:
two temps, empty diff, no profile/override, decoded membership 10/10, mutants, common checks, no hashes.

### Batch 5 — generate D569 brutal-2-v2 6211001-6211010

**Allowed files (10):**

- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211001.json`
- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211002.json`
- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211003.json`
- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211004.json`
- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211005.json`
- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211006.json`
- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211007.json`
- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211008.json`
- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211009.json`
- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211010.json`

**R/M/T/V:** identical with seed 6211001/directory `arena-basis-brutal-2-v2`. End with one
membership-only run proving exactly 30/30 fixtures and every living monster; any failure rejects
that full ten-seed namespace and invokes the pre-Batch-2 replacement procedure.

### Batch 6 — v2/v6 manifests, identity boundary, and hashes

**Allowed files (8):**

- `tools/d569-second-family-manifest.ts`
- `tools/d569-blind-experiment.ts`
- `tests/fixtures/d569-second-family-manifest-v2.json` (new)
- `tests/fixtures/d569-blind-experiment-manifest-v6.json` (new)
- `tests/unit/tools/d569-second-family-manifest.test.ts`
- `tests/unit/tools/d569-blind-experiment.test.ts`
- `tests/unit/tools/d569-v6.test.ts` (new)
- `tests/unit/vtt/arena-basis-brutal-v2.test.ts`

**R:** strict version/path/range/ledger tests, the exact v5-v6 structural diff, outer-v6 hash,
and cardinalities. Add primary-hard and second-family-hard cross-version witnesses: a v5 observed
row with the same unchanged seed/state/visual hashes must be rejected by v6 as wrong experiment
identity. A missing/wrong identity must also reject. V6 ordinals use manifest order/seed maps;
no `seed - 6203000` assumption survives in a v6 path.

**Implementation:** v2 is `d569-second-family-manifest-v2`: byte-carried hard-2 rows/hashes,
proven brutal-2-v2 rows/hashes, the dated verbatim audit/classification, and this exact ordered
ten-namespace union: 5117xxx, 5118xxx, 6203xxx, 6204xxx, 6206xxx, 6207xxx, 6208xxx,
6209xxx, 6210xxx, 6211xxx. Keep v1's five-entry historical constant/policy unchanged; add a v2
constant. V2 overlap validation exempts only the expected fixture in its own exact cohort
namespace (hard 5118xxx; brutal 6211xxx); cross-cohort and all other overlaps still fail. Removing
ANY of ten namespaces fails an exact-ledger test; preserve the precedent mutant that removes
6204xxx. V6 is
`d569-blind-experiment-v6`: unchanged hard 5117, primary brutal 6209, nested v2 path/hash, every
other v5 field byte-carried. V1/v5 constants and files remain historical; add v2/v6 constants.

Create a separate `D569ExperimentIdentity = {version, manifestSha256}` from the exact outer
manifest bytes at the load boundary. Pin/export the final v6 SHA-256 outside the manifest.
V6 dry-run cells carry both fields; include both in `sessionKey`. V6 observed rows must carry an
exact match, and row lookup/duplicate/missing keys include identity. Branch by version so v5's
cell shape, legacy session-key derivation, and observed-row matching remain byte-behaviourally
unchanged. Content/state/visual hashes remain truthful content hashes, never overloaded as the
experiment identity. Thus unchanged hard cells cannot cross v5/v6.

The active `d569-v6.test.ts` access MUST set `regenerate:
canonicalD569SecondFamilyRegeneration`; the fixture-reader helper at
`d569-blind-experiment.test.ts:294-296` may serve historical/synthetic unit tests only. Add a spy
or deliberately divergent canonical regeneration proving v6 actually calls it. Only after all
30 membership checks pass, hash each fixture with SHA/OpenSSL, finalize/hash v2, insert its hash
in v6, finalize/hash v6, and pin that outer hash in code/test.

**M:** omit experiment identity from session/row keys; substitute a v5 hard row; use committed
bytes as v6 regeneration; remove 6204 or any ledger row; over-broaden the 5118/6211 exception;
admit v1/6203, a 6207/6209 overlap, a fourth carry-forward difference, or generation 2 divergence.
Named witnesses fail each mutant.

**T/V:** common checks; both hash tools agree for 30 fixtures, v2, and outer v6. Targeted D569
suites have zero violations and exact core/with-hint counts 480/660, primary-brutal 240/330,
second-family core 480. Historical v1/v5 suites remain green and never execute v6.

### Batch 7 — versioned arena and rerun routes

**Allowed files (4):**

- `tools/ai-dm-arena.ts`
- `tests/unit/tools/ai-dm-arena.test.ts`
- `tools/ai-dm-rerun-packet.ts`
- `tests/unit/tools/ai-dm-rerun-packet-protocol.test.ts`

**R/Implementation:** first fail exact parser/path/wrong-family cases. Add arena basis labels
`brutal-v2` -> 6209 and `brutal-b-v2` -> 6210, both difficulty brutal. At rerun definitions near
lines 26/547 add closed protocols `brutal-10-v2` and `brutal-10-b-v2`, exact ten-seed arrays and
directories. Historical labels/protocols retain their old paths and behaviour.

**M/T/V:** map new labels to old paths, swap new ranges, and remove an old label; exact new and
historical route tests kill each. Common checks; arena has prior 6 + 2 labels, rerun prior 3 + 2.

### Batch 8 — LOS audit and blind fixture report

**Allowed files (4):**

- `tools/los-cover-era-audit.ts`
- `tests/unit/tools/los-cover-era-audit.test.ts`
- `tools/blind-context-fixture-report.ts`
- `tests/unit/vtt/blind-turn-context.test.ts`

**R/Implementation:** first expect 30 missing rows. Add file-backed `brutal-v2`,
`brutal-b-v2`, `brutal-2-v2`; preserve historical entries. LOS audit is 93 rooms (63+30), ten
per new family. Blind report is 63 cases (33+30), decoded from exact committed paths.

**M/T/V:** omit or alias a family; family/seed/path/hash/count assertions fail. Common checks;
focused outputs are 93 and 63, with 10/10/10 new rows and 63/63 schema-valid cap-fit cases.

### Batch 9 — hand-authored behaviour pins

**Allowed files (3):**

- `tests/unit/vtt/composite-turn-proposals.test.ts`
- `tests/unit/vtt/engine-opportunity-movement-intel.test.ts`
- `tests/unit/vtt/speculative-planning.test.ts`

**R:** preserve the three current deterministic RED titles before edits. Re-run the following
geometry calculations after WALL-01; a discrepancy stops the batch, never selects a new oracle.

**Implementation:** composite hard 5117005 labels are exactly `Dodge`, `End Turn`, with no
`Longbow`. Comment the four corner-ray derivation: Scout `(13,3)` -> Fighter `(1,2)` has two rays
enter `(7,2)` and two on shared edge `(7,2)/(7,3)`; -> Cleric `(2,4)` has two on
`(7,3)/(7,4)` and two entering `(7,4)`; -> Wizard `(1,6)` all cross column 7. D635/D642 block
every set. Room 8 pins monsters 1 `(22,1)`, 2 `(21,1)`, 4 `(21,3)` to zero-foot Dodge at current
cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)` = ten 5-ft steps + 5 difficult. Replace the
stale comment; these are hand calculations.

For real integration, replace frozen 5117001 with a 15x8 state: Scout A at `(13,4)`, actionless
monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`, ids `combatant:A/B/P`, base walls
`(7,0..3)` plus `(8,5..7)`, and a typed speed-set effect with
`enginePlanningSpeedFeet(A) === 0`. Define exact extracted selector strings
`DA=canonicalJson({actorId:'combatant:A',selector:{kind:'combatant',combatantId:'combatant:A'}})`
and `TAP=canonicalJson({actorId:'combatant:A',selector:{kind:'combatant',combatantId:'combatant:P'}})`.
Production `buildHostScenarioMenu` yields labels `[Longbow + Longbow -> combatant:P, Dodge]` and
exact menu rank 1 `adjacency:${DA}:${TAP}` (P moves to `(12,4)`, 55 ft) then rank 2
`visibility:${DA}:${TAP}` (P path `(1,4)->(0,3)->(0,2)->(0,1)->(1,0)`, 20 ft); each has one
proposal reference, only influencing player P, radius 60, and score `1*60=60`. Longbow reach
cannot flip inside 15x8; Dodge contributes no movement-change fact.

The mutation adds `(8,4)`, completing `(7,3)/(8,4)`. Assert the production trace changes
sight-clear -> blocked. Because A's speed is explicitly zero it cannot use Astra's 25-ft escape
to `(8,3)`; A and B now propose `[Dodge,Dodge]`, targeted dependencies disappear, and the exact
menu is `[]`. This is a contrast, not normalization of the frozen empty scene. Recheck the full
base/mutated oracle after WALL-01; any difference stops for plan review.

Separately test the eight-entry slice through `computeHostSplitCandidates` with two Scouts A/B,
P at `(4,2)`, awaiting A's turn, speed 30/radius 60, and a controlled query table. Define
`S(x)=canonicalJson({actorId:'combatant:'+x,selector:{kind:'combatant',combatantId:'combatant:'+x}})`.
All adjacency/reach baselines are false -> true; all visibility baselines are true -> false.
The nine non-shadowed candidates and hand oracle are:

|rank|fact key|refs|legal P destination/path ft|score|result|
|---:|---|---:|---|---:|---|
|1|`adjacency:S(A):S(P)`|A+B|`(2,1)`/10|`2*60=120`|kept|
|2|`adjacency:S(B):S(P)`|B|`(7,3)`/20|60|kept|
|3|`adjacency:S(P):S(A)`|A|`(2,1)`/10|60|kept|
|4|`adjacency:S(P):S(B)`|B|`(7,3)`/20|60|kept|
|5|`reach:S(A):shortsword:S(P)`|A|`(2,1)`/10|60|kept|
|6|`reach:S(B):shortsword:S(P)`|B|`(7,3)`/20|60|kept|
|7|`visibility:S(A):S(P)`|A|`(6,1)`/15|60|kept|
|8|`visibility:S(B):S(P)`|B|`(6,3)`/15|60|kept|
|9|`visibility:S(P):S(A)`|A|`(6,1)`/15|60|excluded|

All costs are independently <=60; the controlled port rejects every unlisted destination.
Order is score, refs, then canonical fact-key bytes (`adjacency` < `reach` < `visibility`). Assert
exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. This stipulated dependency/query table
tests only grouping, score, canonical tie ordering, filtering, and the eight-entry slice; it is
not evidence for D642 corner sealing, which the production integration witness above proves.

**M/T/V:** restore old Longbow/Dash values, let A move despite speed zero, disable corner sealing,
change score multiplication to 62/61, reverse the tie order, or remove `.slice(0,8)`; exact
labels/keys/paths, production mutation, and nine-row table fail. Common checks; run serially.

### Batch 10 — 32,768-byte cap rejection witness

**Allowed files (1):**

- `tests/unit/vtt/blind-turn-context.test.ts`

**R/Implementation:** clone a normal `projectEngineSemanticBoard`, set one schema-valid creature
name to 40,000 characters, prove schema parsing succeeds, then render normally. Assert measured
UTF-8 semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES === 32_768` and exact `RangeError`
states required/max byte counts. Baseline may be green because this witnesses existing policy.

**M/T/V:** disable `blind-turn-context.ts:1304-1307` (or make `>` false): the test must turn RED
because oversized context is accepted. Restore, verify source hash, run focused test/common checks.

## Final targeted verification and handoff

Run only touched suites serially: second-family, blind-experiment, v5, v6, room-generator,
brutal-v2, brutal-b, arena, rerun protocol, LOS audit, blind context, and the three behaviour
files. Expected: zero failures; D569 counts 480/660/240/330 and second-family 480; 30/30 new
fixtures; audits 93/63. Repeat T, freeze inventory, `git diff --check`, verify exact 52-path union,
and inspect all new JSON as parsed state. Supervisor later runs the untruncated full gate.

## Open questions

None. Any failed post-WALL derivation or rejected namespace invokes the stated stop/amend/review
procedure; it is not an implementation-time choice.

## Round 2 disposition (closed/superseded)

F1 remains closed at lines 211-250; F4 remains closed at lines 25-26 and 198-209.
F2's r2 work remains at 50-73 and F3 is superseded by the corrected r3 oracle at 304-348.
Supporting requirements remain at 8-12, 85-102, 236-239, and 293-348.

## Round 3 disposition

- **PLAN-F3 (P2; lines 304-348):** the production scene now makes A speed zero, uses extracted actor-relative
  selector keys, and pins both base candidates plus the exact empty post-seal menu; the verified
  nine-row table is explicitly ranking/filtering-only.
- **PLAN-F2 (P2; lines 50-73):** both absence commands now cover every 000-999 plain and underscore seed plus
  `xxx`; MAIN provenance, verbatim results, reservation classification, and replacement rules stay.
- **PLAN-F5 (P2; lines 217-246):** v2 now requires all ten historical/current namespaces, exact own-cohort
  exceptions, removal-of-any-row tests, and the 6204 mutant.
- **PLAN-F6 (P2; lines 115-138):** Batch 2 now preserves positive movement OR productive slots, keeps Dash-only
  monsters valid, and applies resolved-origin trace checks only to targeted offensive components.

COHORT-01 PLAN R3 DONE

## Binding amendment N1 (astra r3, D650 — supervisor-appended; part of the frozen plan)

Batch 9 must construct the hand-authored Scout A with `profile.rules.speed: feet(0)` before encounter creation, retain the typed zero-speed effect, and assert both declared and effective speed are zero (attack declarations take their movement allowance from `subject.profile.rules.speed`, offer-declarations.ts:431–465, so the effect alone still lets A move 25 ft to (8,3) and keep its Longbow). Preserve the exact base and mutated labels, selector keys, scores and menus at the lines the plan states (base: Longbow ×2 + Dodge, adjacency and visibility keys, scores 60/60; with (8,4) added: Dodge/Dodge, menu []). Require two mutants: restoring A's declared speed to 30 while retaining the effect, and separately disabling corner sealing, must each fail the mutation expectations. Re-verify against the ACCEPTED WALL-01 before implementation acceptance. This correction is confined to the allowed speculative-planning test file; no production movement change is authorized.

## Binding amendment N2 (supervisor ruling D651 — part of the frozen plan)

Batch 1 exposed a second historical discontinuity beside the fog key: the v5 manifest registers `caps.semanticBytes = 8192` (the engine-server `SEMANTIC_BOARD_MAX_BYTES`), while rows the live blind runner produces today carry the D643 cap `BLIND_SEMANTIC_BOARD_MAX_BYTES = 32,768`, so `validate-first-arm.ts:369` refuses them ("Registered context caps mismatch"). Ruling: (1) a cell's `semanticContextCapBytes` / `baseContextCapBytes` are the MANIFEST's declared caps (the registration), not an engine constant — `tools/d569-blind-experiment.ts:285` (schema literal) and `:712` (cell cap) become version-aware: v5 keeps 8192 as history, v6 declares `caps.semanticBytes: 32768`; (2) `tests/unit/tools/d569-v5.test.ts` stays HISTORICAL: it keeps validating the v5 manifest (fog-key normalization included), its hashes and its synthesized rows, and it PINS that a row produced by today's live runner is refused with exactly `Registered context caps mismatch` — v5 cannot be re-run as registered and the test says so; no skip, no relaxed cap; (3) the v6 active test (Batch 6) validates live rows at 32,768. Mutants: v5 accepting a 32,768 row must fail; v6 accepting an 8192 row must fail. No production cap value changes.

codex
The amended plan and worktree match exactly, and the expanded pre-change freeze gate exited 0. N2 does not add `tools/d569-blind-experiment.ts` to Batch 1’s three-file allowlist, so I will not edit that production file or add a synthetic v6 fragment here; the v6 half remains explicitly for Batch 6. For Batch 1, I’m changing the v5 test so synthesized registered rows remain green while live 32,768-byte runner rows are required to fail with the exact historical-cap mismatch.
exec
/bin/bash -lc "nl -ba tests/unit/tools/d569-v5.test.ts | sed -n '440,590p'
nl -ba tests/unit/tools/d569-v5.test.ts | sed -n '570,730p'
rg -n \"caps:|semanticBytes\" tools/d569-blind-experiment.ts | head -30
nl -ba tools/d569-blind-experiment.ts | sed -n '270,295p'" in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 0ms:
   440	  const evidence = classifyEngineCatalogEvidence({
   441	    dispatchId, expectedProfile: 'blind', expectedPhase: 'primary',
   442	    expectedRequestId: 'request:d569-invalid-catalog', expectedToolNames: ['engine.get_turn_context'],
   443	    events: [], readiness, completed: false, requiredStartupFailed: false,
   444	    ...(source === 'malformed' ? { malformedReadiness: true } : {}),
   445	  });
   446	  if (evidence.status !== 'inconclusive' || evidence.reason !== 'invalid_catalog_response') {
   447	    throw new Error(`${source} consumer fixture did not classify as invalid catalog evidence.`);
   448	  }
   449	  return evidence;
   450	}
   451	
   452	function evaluateRunnerTimeoutConsumers(): {
   453	  readonly packetRows: number;
   454	  readonly registeredRows: number;
   455	  readonly observedViolations: readonly string[];
   456	  readonly contradictoryPacketError: string;
   457	  readonly contradictoryRegisteredError: string;
   458	  readonly contradictoryObservedViolations: readonly string[];
   459	  readonly invalidCatalogResults: readonly {
   460	    readonly exit: 'timed_out' | 'cancelled';
   461	    readonly source: InvalidCatalogSource;
   462	    readonly packetError: string;
   463	    readonly registeredError: string;
   464	    readonly observedViolations: readonly string[];
   465	  }[];
   466	} {
   467	  const produced = RUNNER_TIMEOUT_BEFORE_DELIVERY_ROW;
   468	  const packetRows: object[] = CELLS.filter((cell) => cell.basis === 'brutal')
   469	    .map((cell) => current(cell, 'authorized'));
   470	  packetRows[0] = produced;
   471	  const packetCount = pairedDocuments(packetRows).packet.length;
   472	  const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
   473	    .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
   474	  registeredRows[0] = produced;
   475	  const registeredCount = validateBrutal(raw(registeredRows)).length;
   476	  const cell = CELLS.find((candidate) => candidate.basis === 'brutal' && candidate.seed === 6_203_001 && candidate.rep === 1);
   477	  if (cell === undefined) throw new Error('Registered timeout cell is absent.');
   478	  const boardImage = record(produced['boardImage']);
   479	  const observedSessionId = produced['sessionId'];
   480	  const scheduledCellKey = produced['scheduledCellKey'];
   481	  const dispatchId = produced['dispatchId'];
   482	  if (typeof observedSessionId !== 'string' || observedSessionId.length === 0 ||
   483	    typeof scheduledCellKey !== 'string' || typeof dispatchId !== 'string') {
   484	    throw new Error('Runner timeout row omitted its observed session or dispatch identity.');
   485	  }
   486	  const observed: D569ObservedRow = {
   487	    arm: cell.arm, cli: 'codex', cliVersion: 'codex-cli 0.153.4', model: cell.model, effort: cell.effort,
   488	    family: cell.family, basis: cell.basis, seed: cell.seed, rep: cell.rep,
   489	    sessionId: observedSessionId, outcome: 'refused', scheduledCellKey, dispatchId,
   490	    engineCatalogEvidence: { status: 'inconclusive', reason: 'no_correlated_catalog' },
   491	    turnContextDelivery: { status: 'timeout_before_delivery' },
   492	    timeoutMs: cell.timeoutMs, escalationModel: null, modelDefaultFallback: false,
   493	    stateHash: cell.stateHash, sharedKbHash: cell.sharedKbHash,
   494	    visualSourceHash: cell.visualSourceHash, visualProfileHash: cell.visualProfileHash,
   495	    visualArtifactHash: String(boardImage['sha256']), baseContextCapBytes: cell.baseContextCapBytes,
   496	    semanticContextCapBytes: cell.semanticContextCapBytes, truncatedBlocks: [],
   497	  };
   498	  const observedViolations = validateD569ObservedRows([cell], [observed]).map((violation) => violation.code);
   499	  const catalog = record(produced['engineCatalogEvidence']);
   500	  const contradictory = {
   501	    ...produced,
   502	    engineCatalogEvidence: { ...catalog, reason: 'conflicting_success_and_failure' },
   503	  };
   504	  const contradictoryPacketRows = [...packetRows];
   505	  contradictoryPacketRows[0] = contradictory;
   506	  const contradictoryRegisteredRows = [...registeredRows];
   507	  contradictoryRegisteredRows[0] = contradictory;
   508	  const invalidCatalogResults = (['timed_out', 'cancelled'] as const).flatMap((exit) =>
   509	    (['malformed', 'wrong_profile'] as const).map((source) => {
   510	      const invalidCatalog = classifiedInvalidCatalogForConsumer(dispatchId, source);
   511	      const delivery = exit === 'timed_out'
   512	        ? produced['turnContextDelivery']
   513	        : {
   514	            status: 'not_requested' as const, dispatchId,
   515	            reason: 'dispatch_cancelled' as const, measurement: null,
   516	          };
   517	      const ingress = record(produced['blindIngressAudit']);
   518	      const invalidRow = {
   519	        ...produced,
   520	        ...(exit === 'cancelled'
   521	          ? {
   522	              outcome: 'infrastructure_failed', fallbackReason: 'dispatch_cancelled',
   523	              turnContextDelivery: delivery,
   524	              blindIngressAudit: { ...ingress, delivery },
   525	              failingDispatch: {
   526	                phase: 'primary', exit, dispatchId, engineCatalogEvidence: invalidCatalog,
   527	                turnContextDelivery: delivery, failureReason: 'operator cancelled before delivery',
   528	              },
   529	            }
   530	          : {}),
   531	        engineCatalogEvidence: invalidCatalog,
   532	      };
   533	      const invalidPacketRows = [...packetRows];
   534	      invalidPacketRows[0] = invalidRow;
   535	      const invalidRegisteredRows = [...registeredRows];
   536	      invalidRegisteredRows[0] = invalidRow;
   537	      const observedDelivery: D569ObservedRow['turnContextDelivery'] = exit === 'timed_out'
   538	        ? { status: 'timeout_before_delivery' }
   539	        : { status: 'not_requested', reason: 'dispatch_cancelled' };
   540	      const invalidObserved: D569ObservedRow = {
   541	        ...observed,
   542	        outcome: exit === 'timed_out' ? 'refused' : 'infrastructure_failed',
   543	        engineCatalogEvidence: { status: 'inconclusive', reason: invalidCatalog.reason },
   544	        turnContextDelivery: observedDelivery,
   545	        ...(exit === 'cancelled' ? {
   546	          failingDispatch: {
   547	            dispatchId, exit, engineCatalogEvidence: { status: 'inconclusive' },
   548	            turnContextDelivery: { status: 'not_requested' },
   549	          },
   550	        } : {}),
   551	      };
   552	      return {
   553	        exit, source,
   554	        packetError: capturedFailure(() => { pairedDocuments(invalidPacketRows); }),
   555	        registeredError: capturedFailure(() => { validateBrutal(raw(invalidRegisteredRows)); }),
   556	        observedViolations: validateD569ObservedRows([cell], [invalidObserved])
   557	          .map((violation) => violation.code),
   558	      };
   559	    }));
   560	  return {
   561	    packetRows: packetCount,
   562	    registeredRows: registeredCount,
   563	    observedViolations,
   564	    contradictoryPacketError: capturedFailure(() => { pairedDocuments(contradictoryPacketRows); }),
   565	    contradictoryRegisteredError: capturedFailure(() => { validateBrutal(raw(contradictoryRegisteredRows)); }),
   566	    contradictoryObservedViolations: validateD569ObservedRows([cell], [{
   567	      ...observed,
   568	      engineCatalogEvidence: { status: 'inconclusive', reason: 'conflicting_success_and_failure' },
   569	    }]).map((violation) => violation.code),
   570	    invalidCatalogResults,
   571	  };
   572	}
   573	
   574	const RUNNER_TIMEOUT_CONSUMERS = evaluateRunnerTimeoutConsumers();
   575	
   576	describe('D569 v5 replacement validation and paired analysis tools', () => {
   577	  it('resolves only the historical v5 experiment and v1 second-family manifests', () => {
   578	    const secondFamily = JSON.parse(readFileSync(D569_SECOND_FAMILY_MANIFEST_PATH, 'utf8')) as {
   579	      readonly version?: unknown;
   580	    };
   581	    expect(D569_EXPERIMENT_MANIFEST_PATH).toBe('tests/fixtures/d569-blind-experiment-manifest.json');
   582	    expect(D569_SECOND_FAMILY_MANIFEST_PATH).toBe('tests/fixtures/d569-second-family-manifest.json');
   583	    expect(MANIFEST.version).toBe('d569-blind-experiment-v5');
   584	    expect(MANIFEST.secondFamily.manifestPath).toBe(D569_SECOND_FAMILY_MANIFEST_PATH);
   585	    expect(secondFamily.version).toBe('d569-second-family-manifest-v1');
   586	  });
   587	
   588	  it('validates a mixed 27-historical/3-current hard grid without rewriting retained bytes', () => {
   589	    const originalRows = Array.from({ length: 10 }, (_, roomIndex) => [1, 2, 3].map((rep) => historical(
   590	      roomIndex + 1, rep,
   570	    invalidCatalogResults,
   571	  };
   572	}
   573	
   574	const RUNNER_TIMEOUT_CONSUMERS = evaluateRunnerTimeoutConsumers();
   575	
   576	describe('D569 v5 replacement validation and paired analysis tools', () => {
   577	  it('resolves only the historical v5 experiment and v1 second-family manifests', () => {
   578	    const secondFamily = JSON.parse(readFileSync(D569_SECOND_FAMILY_MANIFEST_PATH, 'utf8')) as {
   579	      readonly version?: unknown;
   580	    };
   581	    expect(D569_EXPERIMENT_MANIFEST_PATH).toBe('tests/fixtures/d569-blind-experiment-manifest.json');
   582	    expect(D569_SECOND_FAMILY_MANIFEST_PATH).toBe('tests/fixtures/d569-second-family-manifest.json');
   583	    expect(MANIFEST.version).toBe('d569-blind-experiment-v5');
   584	    expect(MANIFEST.secondFamily.manifestPath).toBe(D569_SECOND_FAMILY_MANIFEST_PATH);
   585	    expect(secondFamily.version).toBe('d569-second-family-manifest-v1');
   586	  });
   587	
   588	  it('validates a mixed 27-historical/3-current hard grid without rewriting retained bytes', () => {
   589	    const originalRows = Array.from({ length: 10 }, (_, roomIndex) => [1, 2, 3].map((rep) => historical(
   590	      roomIndex + 1, rep,
   591	      [6, 19, 20].includes(roomIndex * 3 + rep) ? null : `historical-session-${String(roomIndex + 1)}-${String(rep)}`,
   592	    ))).flat();
   593	    const original = raw(originalRows);
   594	    const sidecar = reconciliation(original);
   595	    const hardCells = CELLS.filter((cell) => cell.basis === 'hard');
   596	    const replacements = raw(D569_HARD_REPLACEMENT_KEYS.map((key) => {
   597	      const cell = hardCells.find((candidate) => `${String(candidate.seed - 5_117_000)}:${String(candidate.rep)}` === key);
   598	      if (cell === undefined) throw new Error(`Missing hard replacement cell ${key}.`);
   599	      return current(cell, key === '2:1' ? 'infrastructure_failed' : key === '4:1' ? 'service_null' : 'authorized');
   600	    }));
   601	    const mixed = mergeRepairedHard(original, replacements);
   602	    const originalLines = original.trimEnd().split('\n');
   603	    const mixedLines = mixed.trimEnd().split('\n');
   604	    expect(mixedLines.filter((line, index) => line === originalLines[index])).toHaveLength(27);
   605	    expect(validateD569FirstArm(mixed, sidecar)).toHaveLength(30);
   606	  });
   607	
   608	  it('migrates every registered validator invariant for a complete current brutal grid', () => {
   609	    expect(validateBrutal(BRUTAL_SOURCE)).toHaveLength(30);
   610	  });
   611	
   612	  it('validates registered hard replacements against retained original cells and reconciliation provenance', () => {
   613	    const hardCells = CELLS.filter((cell) => cell.basis === 'hard');
   614	    const original = raw(hardCells.map((cell, index) => retainedHistorical(cell, index + 1)));
   615	    const sidecar = reconciliation(original);
   616	    const replacements = raw(D569_HARD_REPLACEMENT_KEYS.map((key) => {
   617	      const [roomText, repText] = key.split(':');
   618	      const seed = 5_117_000 + Number(roomText);
   619	      const cell = hardCells.find((candidate) => candidate.seed === seed && candidate.rep === Number(repText));
   620	      if (cell === undefined) throw new Error(`Missing registered hard replacement ${key}.`);
   621	      return current(cell, 'authorized');
   622	    }));
   623	    const merged = mergeRepairedHard(original, replacements);
   624	    const observations = validateD569RegisteredFirstArm({
   625	      rawText: merged, basis: 'hard', cliVersion: 'codex-cli 0.153.4',
   626	      patchedCommit: PATCHED_COMMIT, sidecar,
   627	    });
   628	    expect(observations).toHaveLength(30);
   629	    expect(observations.filter((entry) => entry.row['sessionId'] === null)
   630	      .map((entry) => entry.effectiveSessionId)).toEqual([
   631	        'recovered-session-6', 'recovered-session-19', 'recovered-session-20',
   632	      ]);
   633	  });
   634	
   635	  it('accepts a registered host-authorization refusal without treating attribution as a default', () => {
   636	    const refused = mutateFirst(BRUTAL_SOURCE, (_row) => ({
   637	      ...current(CELLS.find((cell) => cell.basis === 'brutal')!, 'refused'),
   638	      fallbackReason: 'host_authorization_failed', planner: 'model',
   639	    }));
   640	    expect(validateBrutal(refused)).toHaveLength(30);
   641	  });
   642	
   643	  it('rejects a row that actually executed a model default', () => {
   644	    expect(() => validateBrutal(mutateFirst(BRUTAL_SOURCE, (row) => ({
   645	      ...row, planner: 'engine_default', fallbackReason: 'no_proposal',
   646	    })))).toThrow('model_default_fallback');
   647	  });
   648	
   649	  it('accepts cancellation after delivered context in registered validation', () => {
   650	    const cancelled = mutateFirst(BRUTAL_SOURCE, (row) => {
   651	      const dispatchId = String(row['dispatchId']);
   652	      return {
   653	        ...row, outcome: 'infrastructure_failed', fallbackReason: 'dispatch_cancelled',
   654	        failingDispatch: {
   655	          phase: 'primary', exit: 'cancelled', dispatchId,
   656	          engineCatalogEvidence: row['engineCatalogEvidence'],
   657	          turnContextDelivery: row['turnContextDelivery'],
   658	          failureReason: 'operator cancelled after delivery',
   659	        },
   660	      };
   661	    });
   662	    expect(validateBrutal(cancelled)).toHaveLength(30);
   663	  });
   664	
   665	  it('carries one finalized semantic delivery object through runner cancellation, packet decoding, and registered validation', () => {
   666	    const produced = RUNNER_CANCELLATION_AFTER_DELIVERY_ROW;
   667	    expect(produced).toMatchObject({
   668	      outcome: 'infrastructure_failed', fallbackReason: 'dispatch_cancelled',
   669	      turnContextDelivery: { status: 'delivered', measurement: { semanticBytes: expect.any(Number) } },
   670	      failingDispatch: {
   671	        phase: 'primary', exit: 'cancelled',
   672	        turnContextDelivery: { status: 'delivered', measurement: { semanticBytes: expect.any(Number) } },
   673	      },
   674	    });
   675	    expect(produced['semanticBoardBytes']).toEqual(expect.any(Number));
   676	    expect(Number(produced['semanticBoardBytes'])).toBeGreaterThan(0);
   677	    const failure = record(produced['failingDispatch']);
   678	    expect(failure['turnContextDelivery']).toEqual(produced['turnContextDelivery']);
   679	    const packetRows: object[] = CELLS.filter((cell) => cell.basis === 'brutal')
   680	      .map((cell) => current(cell, 'authorized'));
   681	    packetRows[0] = produced;
   682	    expect(pairedDocuments(packetRows).packet).toHaveLength(60);
   683	
   684	    const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
   685	      .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
   686	    registeredRows[0] = produced;
   687	    expect(validateBrutal(raw(registeredRows))).toHaveLength(30);
   688	  });
   689	
   690	  it('carries a runner timeout with an ordinary incomplete catalog through packet and registered observation validation', () => {
   691	    const produced = RUNNER_TIMEOUT_BEFORE_DELIVERY_ROW;
   692	    expect(produced).toMatchObject({
   693	      outcome: 'refused', fallbackReason: 'timeout',
   694	      engineCatalogEvidence: { status: 'inconclusive', reason: 'no_correlated_catalog' },
   695	      turnContextDelivery: { status: 'timeout_before_delivery', measurement: null },
   696	    });
   697	    expect(RUNNER_TIMEOUT_CONSUMERS.packetRows).toBe(60);
   698	    expect(RUNNER_TIMEOUT_CONSUMERS.registeredRows).toBe(30);
   699	    expect(RUNNER_TIMEOUT_CONSUMERS.observedViolations).toEqual([]);
   700	    expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryPacketError).toContain('integrity evidence');
   701	    expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryRegisteredError).toContain('integrity-indeterminate');
   702	    expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryObservedViolations).toContain('integrity_indeterminate');
   703	  });
   704	
   705	  it('rejects malformed and wrong-profile catalog evidence after timeout or cancellation in every consumer', () => {
   706	    expect(RUNNER_TIMEOUT_CONSUMERS.invalidCatalogResults).toHaveLength(4);
   707	    expect(RUNNER_TIMEOUT_CONSUMERS.invalidCatalogResults.map(({ exit, source }) => `${exit}:${source}`))
   708	      .toEqual([
   709	        'timed_out:malformed', 'timed_out:wrong_profile',
   710	        'cancelled:malformed', 'cancelled:wrong_profile',
   711	      ]);
   712	    for (const result of RUNNER_TIMEOUT_CONSUMERS.invalidCatalogResults) {
   713	      expect(result.packetError).toContain('integrity evidence');
   714	      expect(result.registeredError).toContain('integrity-indeterminate');
   715	      expect(result.observedViolations).toContain('integrity_indeterminate');
   716	    }
   717	  });
   718	
   719	  it('rejects incomplete v3 evidence objects', () => {
   720	    expect(() => validateBrutal(mutateFirst(BRUTAL_SOURCE, (row) => {
   721	      const catalog = record(row['engineCatalogEvidence']);
   722	      return { ...row, engineCatalogEvidence: { status: catalog['status'], dispatchId: catalog['dispatchId'] } };
   723	    }))).toThrow();
   724	  });
   725	
   726	  it('rejects an indeterminate delivery when the companion v3 catalog field is absent', () => {
   727	    expect(() => validateBrutal(mutateFirst(BRUTAL_SOURCE, (row) => {
   728	      const { engineCatalogEvidence: _omitted, ...withoutCatalog } = row;
   729	      return {
   730	        ...withoutCatalog,
283:  caps: z.strictObject({
285:    semanticBytes: z.literal(SEMANTIC_BOARD_MAX_BYTES),
   270	      ),
   271	    }),
   272	  ]),
   273	  experimentWallMs: z.literal(D569_EXPERIMENT_WALL_MS),
   274	  reps: z.literal(D569_REPS),
   275	  blindMaxAttempts: z.literal(3),
   276	  execution: z.strictObject({
   277	    freshSessionPerCell: z.literal(true),
   278	    escalation: z.literal(false),
   279	    modelDefaultFallback: z.literal(false),
   280	    transport: z.literal('mcp_minimal'),
   281	    boardImage: z.literal('png'),
   282	  }),
   283	  caps: z.strictObject({
   284	    blindBaseBytes: z.literal(BLIND_TURN_CONTEXT_MAX_BYTES),
   285	    semanticBytes: z.literal(SEMANTIC_BOARD_MAX_BYTES),
   286	    adviceBaseBytes: z.literal(TURN_CONTEXT_MAX_BYTES),
   287	  }),
   288	  bootstrap: z.strictObject({
   289	    resamples: z.literal(D569_BOOTSTRAP_RESAMPLES),
   290	    seed: z.number().int().nonnegative(),
   291	    confidence: z.literal(0.95),
   292	    noninferiorityMargin: z.literal(D569_NONINFERIORITY_MARGIN),
   293	  }),
   294	  sharedKb: z.strictObject({
   295	    rootPath: z.literal(D569_AI_DM_KB_ROOT),

apply patch
patch: completed
/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/tools/d569-v5.test.ts
diff --git a/tests/unit/tools/d569-v5.test.ts b/tests/unit/tools/d569-v5.test.ts
index 6ca4f57e9a6dd7b8fadfc8f90a03ef5a84f803b5..1ae35898641e03686f89d367519155d2bf0a74a6
--- a/tests/unit/tools/d569-v5.test.ts
+++ b/tests/unit/tools/d569-v5.test.ts
@@ -451,7 +451,7 @@
 
 function evaluateRunnerTimeoutConsumers(): {
   readonly packetRows: number;
-  readonly registeredRows: number;
+  readonly historicalRegistrationError: string;
   readonly observedViolations: readonly string[];
   readonly contradictoryPacketError: string;
   readonly contradictoryRegisteredError: string;
@@ -472,7 +472,7 @@
   const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
     .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
   registeredRows[0] = produced;
-  const registeredCount = validateBrutal(raw(registeredRows)).length;
+  const historicalRegistrationError = capturedFailure(() => { validateBrutal(raw(registeredRows)); });
   const cell = CELLS.find((candidate) => candidate.basis === 'brutal' && candidate.seed === 6_203_001 && candidate.rep === 1);
   if (cell === undefined) throw new Error('Registered timeout cell is absent.');
   const boardImage = record(produced['boardImage']);
@@ -559,7 +559,7 @@
     }));
   return {
     packetRows: packetCount,
-    registeredRows: registeredCount,
+    historicalRegistrationError,
     observedViolations,
     contradictoryPacketError: capturedFailure(() => { pairedDocuments(contradictoryPacketRows); }),
     contradictoryRegisteredError: capturedFailure(() => { validateBrutal(raw(contradictoryRegisteredRows)); }),
@@ -583,6 +583,8 @@
     expect(MANIFEST.version).toBe('d569-blind-experiment-v5');
     expect(MANIFEST.secondFamily.manifestPath).toBe(D569_SECOND_FAMILY_MANIFEST_PATH);
     expect(secondFamily.version).toBe('d569-second-family-manifest-v1');
+    expect(MANIFEST.caps.semanticBytes).toBe(8_192);
+    expect(new Set(CELLS.map((cell) => cell.semanticContextCapBytes))).toEqual(new Set([8_192]));
   });
 
   it('validates a mixed 27-historical/3-current hard grid without rewriting retained bytes', () => {
@@ -662,7 +664,7 @@
     expect(validateBrutal(cancelled)).toHaveLength(30);
   });
 
-  it('carries one finalized semantic delivery object through runner cancellation, packet decoding, and registered validation', () => {
+  it('rejects a live-runner cancellation row under the historical v5 semantic cap', () => {
     const produced = RUNNER_CANCELLATION_AFTER_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'infrastructure_failed', fallbackReason: 'dispatch_cancelled',
@@ -676,6 +678,7 @@
     expect(Number(produced['semanticBoardBytes'])).toBeGreaterThan(0);
     const failure = record(produced['failingDispatch']);
     expect(failure['turnContextDelivery']).toEqual(produced['turnContextDelivery']);
+    expect(produced['turnContextConfiguredCaps']).toEqual({ baseBytes: 65_536, semanticBytes: 32_768 });
     const packetRows: object[] = CELLS.filter((cell) => cell.basis === 'brutal')
       .map((cell) => current(cell, 'authorized'));
     packetRows[0] = produced;
@@ -684,18 +687,21 @@
     const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
       .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
     registeredRows[0] = produced;
-    expect(validateBrutal(raw(registeredRows))).toHaveLength(30);
+    expect(() => validateBrutal(raw(registeredRows)))
+      .toThrow('Registered context caps mismatch at 1:1.');
   });
 
-  it('carries a runner timeout with an ordinary incomplete catalog through packet and registered observation validation', () => {
+  it('rejects a live-runner timeout row under the historical v5 semantic cap', () => {
     const produced = RUNNER_TIMEOUT_BEFORE_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'refused', fallbackReason: 'timeout',
       engineCatalogEvidence: { status: 'inconclusive', reason: 'no_correlated_catalog' },
       turnContextDelivery: { status: 'timeout_before_delivery', measurement: null },
+      turnContextConfiguredCaps: { baseBytes: 65_536, semanticBytes: 32_768 },
     });
     expect(RUNNER_TIMEOUT_CONSUMERS.packetRows).toBe(60);
-    expect(RUNNER_TIMEOUT_CONSUMERS.registeredRows).toBe(30);
+    expect(RUNNER_TIMEOUT_CONSUMERS.historicalRegistrationError)
+      .toBe('Registered context caps mismatch at 1:1.');
     expect(RUNNER_TIMEOUT_CONSUMERS.observedViolations).toEqual([]);
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryPacketError).toContain('integrity evidence');
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryRegisteredError).toContain('integrity-indeterminate');

diff --git a/tests/unit/tools/d569-v5.test.ts b/tests/unit/tools/d569-v5.test.ts
index 6ca4f57e9a6dd7b8fadfc8f90a03ef5a84f803b5..1ae35898641e03686f89d367519155d2bf0a74a6
--- a/tests/unit/tools/d569-v5.test.ts
+++ b/tests/unit/tools/d569-v5.test.ts
@@ -451,7 +451,7 @@
 
 function evaluateRunnerTimeoutConsumers(): {
   readonly packetRows: number;
-  readonly registeredRows: number;
+  readonly historicalRegistrationError: string;
   readonly observedViolations: readonly string[];
   readonly contradictoryPacketError: string;
   readonly contradictoryRegisteredError: string;
@@ -472,7 +472,7 @@
   const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
     .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
   registeredRows[0] = produced;
-  const registeredCount = validateBrutal(raw(registeredRows)).length;
+  const historicalRegistrationError = capturedFailure(() => { validateBrutal(raw(registeredRows)); });
   const cell = CELLS.find((candidate) => candidate.basis === 'brutal' && candidate.seed === 6_203_001 && candidate.rep === 1);
   if (cell === undefined) throw new Error('Registered timeout cell is absent.');
   const boardImage = record(produced['boardImage']);
@@ -559,7 +559,7 @@
     }));
   return {
     packetRows: packetCount,
-    registeredRows: registeredCount,
+    historicalRegistrationError,
     observedViolations,
     contradictoryPacketError: capturedFailure(() => { pairedDocuments(contradictoryPacketRows); }),
     contradictoryRegisteredError: capturedFailure(() => { validateBrutal(raw(contradictoryRegisteredRows)); }),
@@ -583,6 +583,8 @@
     expect(MANIFEST.version).toBe('d569-blind-experiment-v5');
     expect(MANIFEST.secondFamily.manifestPath).toBe(D569_SECOND_FAMILY_MANIFEST_PATH);
     expect(secondFamily.version).toBe('d569-second-family-manifest-v1');
+    expect(MANIFEST.caps.semanticBytes).toBe(8_192);
+    expect(new Set(CELLS.map((cell) => cell.semanticContextCapBytes))).toEqual(new Set([8_192]));
   });
 
   it('validates a mixed 27-historical/3-current hard grid without rewriting retained bytes', () => {
@@ -662,7 +664,7 @@
     expect(validateBrutal(cancelled)).toHaveLength(30);
   });
 
-  it('carries one finalized semantic delivery object through runner cancellation, packet decoding, and registered validation', () => {
+  it('rejects a live-runner cancellation row under the historical v5 semantic cap', () => {
     const produced = RUNNER_CANCELLATION_AFTER_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'infrastructure_failed', fallbackReason: 'dispatch_cancelled',
@@ -676,6 +678,7 @@
     expect(Number(produced['semanticBoardBytes'])).toBeGreaterThan(0);
     const failure = record(produced['failingDispatch']);
     expect(failure['turnContextDelivery']).toEqual(produced['turnContextDelivery']);
+    expect(produced['turnContextConfiguredCaps']).toEqual({ baseBytes: 65_536, semanticBytes: 32_768 });
     const packetRows: object[] = CELLS.filter((cell) => cell.basis === 'brutal')
       .map((cell) => current(cell, 'authorized'));
     packetRows[0] = produced;
@@ -684,18 +687,21 @@
     const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
       .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
     registeredRows[0] = produced;
-    expect(validateBrutal(raw(registeredRows))).toHaveLength(30);
+    expect(() => validateBrutal(raw(registeredRows)))
+      .toThrow('Registered context caps mismatch at 1:1.');
   });
 
-  it('carries a runner timeout with an ordinary incomplete catalog through packet and registered observation validation', () => {
+  it('rejects a live-runner timeout row under the historical v5 semantic cap', () => {
     const produced = RUNNER_TIMEOUT_BEFORE_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'refused', fallbackReason: 'timeout',
       engineCatalogEvidence: { status: 'inconclusive', reason: 'no_correlated_catalog' },
       turnContextDelivery: { status: 'timeout_before_delivery', measurement: null },
+      turnContextConfiguredCaps: { baseBytes: 65_536, semanticBytes: 32_768 },
     });
     expect(RUNNER_TIMEOUT_CONSUMERS.packetRows).toBe(60);
-    expect(RUNNER_TIMEOUT_CONSUMERS.registeredRows).toBe(30);
+    expect(RUNNER_TIMEOUT_CONSUMERS.historicalRegistrationError)
+      .toBe('Registered context caps mismatch at 1:1.');
     expect(RUNNER_TIMEOUT_CONSUMERS.observedViolations).toEqual([]);
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryPacketError).toContain('integrity evidence');
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryRegisteredError).toContain('integrity-indeterminate');

exec
/bin/bash -lc 'npx vitest run --configLoader runner --reporter=verbose tests/unit/tools/d569-v5.test.ts' in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 exited 1 in 24164ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-cohort-01

[spell-source-parse-cache] reused /tmp/dnd-srd-spell-source-parse-cache/5198a070dbed34af.json
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > resolves only the historical v5 experiment and v1 second-family manifests 2ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > validates a mixed 27-historical/3-current hard grid without rewriting retained bytes 6ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > migrates every registered validator invariant for a complete current brutal grid 221ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > validates registered hard replacements against retained original cells and reconciliation provenance 248ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > accepts a registered host-authorization refusal without treating attribution as a default 217ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects a row that actually executed a model default 221ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > accepts cancellation after delivered context in registered validation 217ms
 × tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects a live-runner cancellation row under the historical v5 semantic cap 37ms
   → row 1.turnContextBudget.configuredSemanticBytes is invalid: Invalid input: expected 8192.
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects a live-runner timeout row under the historical v5 semantic cap 1ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects malformed and wrong-profile catalog evidence after timeout or cancellation in every consumer 0ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects incomplete v3 evidence objects 188ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects an indeterminate delivery when the companion v3 catalog field is absent 186ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects a conflicting_success_and_failure catalog when the companion v3 delivery field is absent 185ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects a invalid_catalog_response catalog when the companion v3 delivery field is absent 186ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects incomplete v3 evidence nested in a failing dispatch 185ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects a missing v3 host diagnostic 185ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects partial v3 hybrids and integrity-indeterminate rows before analysis 1ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects registered seed mutations 189ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects registered fixture-state mutations 190ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects registered code-cohort mutations 190ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects registered model provenance mutations 189ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects registered effort provenance mutations 188ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects registered KB hash provenance mutations 192ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects registered KB components provenance mutations 189ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects registered visual pin provenance mutations 191ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects registered manifest mutations before accepting rows 93ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > runs raw outcomes through packet/key construction and the registered paired scorer 41ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects a live-runner cancellation row under the historical v5 semantic cap
TypeError: row 1.turnContextBudget.configuredSemanticBytes is invalid: Invalid input: expected 8192.
 ❯ parseArenaRow tools/ai-dm-rerun-packet.ts:878:13
    876|       const issue = parsed.error.issues[0];
    877|       const property = issue === undefined || issue.path.length === 0 …
    878|       throw new TypeError(`${sourceLabel}${property} is invalid: ${iss…
       |             ^
    879|     }
    880|     return { rowEra: 'post_shift', row: parsed.data };
 ❯ tools/ai-dm-rerun-packet.ts:998:22
 ❯ validateRows tools/ai-dm-rerun-packet.ts:992:24
 ❯ buildPacket tools/ai-dm-rerun-packet.ts:1257:25
 ❯ buildRerunPacket tools/ai-dm-rerun-packet.ts:1354:10
 ❯ pairedDocuments tests/unit/tools/d569-v5.test.ts:212:23
 ❯ tests/unit/tools/d569-v5.test.ts:685:12

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 26 passed (27)
   Start at  21:25:51
   Duration  23.86s (transform 1.71s, setup 0ms, import 18.43s, tests 3.94s, environment 0ms)


diff --git a/tests/unit/tools/d569-v5.test.ts b/tests/unit/tools/d569-v5.test.ts
index 6ca4f57e9a6dd7b8fadfc8f90a03ef5a84f803b5..1ae35898641e03686f89d367519155d2bf0a74a6
--- a/tests/unit/tools/d569-v5.test.ts
+++ b/tests/unit/tools/d569-v5.test.ts
@@ -451,7 +451,7 @@
 
 function evaluateRunnerTimeoutConsumers(): {
   readonly packetRows: number;
-  readonly registeredRows: number;
+  readonly historicalRegistrationError: string;
   readonly observedViolations: readonly string[];
   readonly contradictoryPacketError: string;
   readonly contradictoryRegisteredError: string;
@@ -472,7 +472,7 @@
   const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
     .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
   registeredRows[0] = produced;
-  const registeredCount = validateBrutal(raw(registeredRows)).length;
+  const historicalRegistrationError = capturedFailure(() => { validateBrutal(raw(registeredRows)); });
   const cell = CELLS.find((candidate) => candidate.basis === 'brutal' && candidate.seed === 6_203_001 && candidate.rep === 1);
   if (cell === undefined) throw new Error('Registered timeout cell is absent.');
   const boardImage = record(produced['boardImage']);
@@ -559,7 +559,7 @@
     }));
   return {
     packetRows: packetCount,
-    registeredRows: registeredCount,
+    historicalRegistrationError,
     observedViolations,
     contradictoryPacketError: capturedFailure(() => { pairedDocuments(contradictoryPacketRows); }),
     contradictoryRegisteredError: capturedFailure(() => { validateBrutal(raw(contradictoryRegisteredRows)); }),
@@ -583,6 +583,8 @@
     expect(MANIFEST.version).toBe('d569-blind-experiment-v5');
     expect(MANIFEST.secondFamily.manifestPath).toBe(D569_SECOND_FAMILY_MANIFEST_PATH);
     expect(secondFamily.version).toBe('d569-second-family-manifest-v1');
+    expect(MANIFEST.caps.semanticBytes).toBe(8_192);
+    expect(new Set(CELLS.map((cell) => cell.semanticContextCapBytes))).toEqual(new Set([8_192]));
   });
 
   it('validates a mixed 27-historical/3-current hard grid without rewriting retained bytes', () => {
@@ -662,7 +664,7 @@
     expect(validateBrutal(cancelled)).toHaveLength(30);
   });
 
-  it('carries one finalized semantic delivery object through runner cancellation, packet decoding, and registered validation', () => {
+  it('rejects a live-runner cancellation row under the historical v5 semantic cap', () => {
     const produced = RUNNER_CANCELLATION_AFTER_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'infrastructure_failed', fallbackReason: 'dispatch_cancelled',
@@ -676,6 +678,7 @@
     expect(Number(produced['semanticBoardBytes'])).toBeGreaterThan(0);
     const failure = record(produced['failingDispatch']);
     expect(failure['turnContextDelivery']).toEqual(produced['turnContextDelivery']);
+    expect(produced['turnContextConfiguredCaps']).toEqual({ baseBytes: 65_536, semanticBytes: 32_768 });
     const packetRows: object[] = CELLS.filter((cell) => cell.basis === 'brutal')
       .map((cell) => current(cell, 'authorized'));
     packetRows[0] = produced;
@@ -684,18 +687,21 @@
     const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
       .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
     registeredRows[0] = produced;
-    expect(validateBrutal(raw(registeredRows))).toHaveLength(30);
+    expect(() => validateBrutal(raw(registeredRows)))
+      .toThrow('Registered context caps mismatch at 1:1.');
   });
 
-  it('carries a runner timeout with an ordinary incomplete catalog through packet and registered observation validation', () => {
+  it('rejects a live-runner timeout row under the historical v5 semantic cap', () => {
     const produced = RUNNER_TIMEOUT_BEFORE_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'refused', fallbackReason: 'timeout',
       engineCatalogEvidence: { status: 'inconclusive', reason: 'no_correlated_catalog' },
       turnContextDelivery: { status: 'timeout_before_delivery', measurement: null },
+      turnContextConfiguredCaps: { baseBytes: 65_536, semanticBytes: 32_768 },
     });
     expect(RUNNER_TIMEOUT_CONSUMERS.packetRows).toBe(60);
-    expect(RUNNER_TIMEOUT_CONSUMERS.registeredRows).toBe(30);
+    expect(RUNNER_TIMEOUT_CONSUMERS.historicalRegistrationError)
+      .toBe('Registered context caps mismatch at 1:1.');
     expect(RUNNER_TIMEOUT_CONSUMERS.observedViolations).toEqual([]);
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryPacketError).toContain('integrity evidence');
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryRegisteredError).toContain('integrity-indeterminate');

exec
/bin/bash -lc "nl -ba tools/d569-v5/validate-first-arm.ts | sed -n '90,125p'
rg -n \"turnContextBudget\" tools/d569-v5/validate-first-arm.ts | head -20" in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 0ms:
    90	}
    91	
    92	export const D569_RAW_OUTCOMES = [
    93	  'authorized', 'refused', 'auto_resolved', 'awaiting_dm_adjudication', 'local_error',
    94	  'execution_failed', 'partial_execution', 'service_null', 'infrastructure_failed',
    95	  'integrity_indeterminate',
    96	] as const;
    97	export type D569RawOutcome = (typeof D569_RAW_OUTCOMES)[number];
    98	const outcomeSchema = z.enum(D569_RAW_OUTCOMES);
    99	
   100	function historicalCellKey(row: Readonly<Record<string, unknown>>): string {
   101	  if (typeof row['room'] !== 'number' || !Number.isSafeInteger(row['room']) ||
   102	    typeof row['round'] !== 'number' || !Number.isSafeInteger(row['round'])) {
   103	    throw new TypeError('Historical D569 row lacks integer room/round identity.');
   104	  }
   105	  return `${String(row['room'])}:${String(row['round'])}`;
   106	}
   107	
   108	function validateV3(row: Readonly<Record<string, unknown>>): void {
   109	  if (row['rowContractVersion'] !== 'arena-row-v3') throw new TypeError('Unknown row contract version.');
   110	  const scheduledCellKey = z.string().regex(/^\d+:[1-9]\d*$/u).parse(row['scheduledCellKey']);
   111	  const dispatchId = z.string().min(16).parse(row['dispatchId']);
   112	  const catalog = catalogSchema.parse(row['engineCatalogEvidence']);
   113	  const delivery = deliverySchema.parse(row['turnContextDelivery']);
   114	  z.object({ baseBytes: z.number().nonnegative(), semanticBytes: z.number().nonnegative() })
   115	    .parse(row['turnContextConfiguredCaps']);
   116	  hostContextDiagnosticSchema.parse(row['hostContextDiagnostic']);
   117	  if (catalog.dispatchId !== dispatchId || delivery.dispatchId !== dispatchId) {
   118	    throw new TypeError(`D569 v3 dispatch correlation failed for ${scheduledCellKey}.`);
   119	  }
   120	  if (scheduledCellKey !== historicalCellKey(row)) {
   121	    throw new TypeError(`D569 v3 scheduled key does not match room/round for ${scheduledCellKey}.`);
   122	  }
   123	  if (row['outcome'] === 'integrity_indeterminate' || d569DeliveryHasIntegritySignal(catalog, delivery)) {
   124	    throw new TypeError(`D569 integrity-indeterminate observation ${scheduledCellKey} cannot enter validation.`);
   125	  }
365:      : objectValue(row['turnContextBudget'], 'turnContextBudget');
371:    const truncatedBlocks = row['turnContextBudget'] === undefined
373:      : objectValue(row['turnContextBudget'], 'turnContextBudget')['truncatedBlocks'];

diff --git a/tests/unit/tools/d569-v5.test.ts b/tests/unit/tools/d569-v5.test.ts
index 6ca4f57e9a6dd7b8fadfc8f90a03ef5a84f803b5..1ae35898641e03686f89d367519155d2bf0a74a6
--- a/tests/unit/tools/d569-v5.test.ts
+++ b/tests/unit/tools/d569-v5.test.ts
@@ -451,7 +451,7 @@
 
 function evaluateRunnerTimeoutConsumers(): {
   readonly packetRows: number;
-  readonly registeredRows: number;
+  readonly historicalRegistrationError: string;
   readonly observedViolations: readonly string[];
   readonly contradictoryPacketError: string;
   readonly contradictoryRegisteredError: string;
@@ -472,7 +472,7 @@
   const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
     .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
   registeredRows[0] = produced;
-  const registeredCount = validateBrutal(raw(registeredRows)).length;
+  const historicalRegistrationError = capturedFailure(() => { validateBrutal(raw(registeredRows)); });
   const cell = CELLS.find((candidate) => candidate.basis === 'brutal' && candidate.seed === 6_203_001 && candidate.rep === 1);
   if (cell === undefined) throw new Error('Registered timeout cell is absent.');
   const boardImage = record(produced['boardImage']);
@@ -559,7 +559,7 @@
     }));
   return {
     packetRows: packetCount,
-    registeredRows: registeredCount,
+    historicalRegistrationError,
     observedViolations,
     contradictoryPacketError: capturedFailure(() => { pairedDocuments(contradictoryPacketRows); }),
     contradictoryRegisteredError: capturedFailure(() => { validateBrutal(raw(contradictoryRegisteredRows)); }),
@@ -583,6 +583,8 @@
     expect(MANIFEST.version).toBe('d569-blind-experiment-v5');
     expect(MANIFEST.secondFamily.manifestPath).toBe(D569_SECOND_FAMILY_MANIFEST_PATH);
     expect(secondFamily.version).toBe('d569-second-family-manifest-v1');
+    expect(MANIFEST.caps.semanticBytes).toBe(8_192);
+    expect(new Set(CELLS.map((cell) => cell.semanticContextCapBytes))).toEqual(new Set([8_192]));
   });
 
   it('validates a mixed 27-historical/3-current hard grid without rewriting retained bytes', () => {
@@ -662,7 +664,7 @@
     expect(validateBrutal(cancelled)).toHaveLength(30);
   });
 
-  it('carries one finalized semantic delivery object through runner cancellation, packet decoding, and registered validation', () => {
+  it('rejects a live-runner cancellation row under the historical v5 semantic cap', () => {
     const produced = RUNNER_CANCELLATION_AFTER_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'infrastructure_failed', fallbackReason: 'dispatch_cancelled',
@@ -676,6 +678,7 @@
     expect(Number(produced['semanticBoardBytes'])).toBeGreaterThan(0);
     const failure = record(produced['failingDispatch']);
     expect(failure['turnContextDelivery']).toEqual(produced['turnContextDelivery']);
+    expect(produced['turnContextConfiguredCaps']).toEqual({ baseBytes: 65_536, semanticBytes: 32_768 });
     const packetRows: object[] = CELLS.filter((cell) => cell.basis === 'brutal')
       .map((cell) => current(cell, 'authorized'));
     packetRows[0] = produced;
@@ -684,18 +687,21 @@
     const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
       .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
     registeredRows[0] = produced;
-    expect(validateBrutal(raw(registeredRows))).toHaveLength(30);
+    expect(() => validateBrutal(raw(registeredRows)))
+      .toThrow('Registered context caps mismatch at 1:1.');
   });
 
-  it('carries a runner timeout with an ordinary incomplete catalog through packet and registered observation validation', () => {
+  it('rejects a live-runner timeout row under the historical v5 semantic cap', () => {
     const produced = RUNNER_TIMEOUT_BEFORE_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'refused', fallbackReason: 'timeout',
       engineCatalogEvidence: { status: 'inconclusive', reason: 'no_correlated_catalog' },
       turnContextDelivery: { status: 'timeout_before_delivery', measurement: null },
+      turnContextConfiguredCaps: { baseBytes: 65_536, semanticBytes: 32_768 },
     });
     expect(RUNNER_TIMEOUT_CONSUMERS.packetRows).toBe(60);
-    expect(RUNNER_TIMEOUT_CONSUMERS.registeredRows).toBe(30);
+    expect(RUNNER_TIMEOUT_CONSUMERS.historicalRegistrationError)
+      .toBe('Registered context caps mismatch at 1:1.');
     expect(RUNNER_TIMEOUT_CONSUMERS.observedViolations).toEqual([]);
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryPacketError).toContain('integrity evidence');
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryRegisteredError).toContain('integrity-indeterminate');

apply patch
patch: completed
/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/tools/d569-v5.test.ts
diff --git a/tests/unit/tools/d569-v5.test.ts b/tests/unit/tools/d569-v5.test.ts
index 6ca4f57e9a6dd7b8fadfc8f90a03ef5a84f803b5..b8f6042e7527e0fd72e256428b086fa5407e63be
--- a/tests/unit/tools/d569-v5.test.ts
+++ b/tests/unit/tools/d569-v5.test.ts
@@ -451,7 +451,7 @@
 
 function evaluateRunnerTimeoutConsumers(): {
   readonly packetRows: number;
-  readonly registeredRows: number;
+  readonly historicalRegistrationError: string;
   readonly observedViolations: readonly string[];
   readonly contradictoryPacketError: string;
   readonly contradictoryRegisteredError: string;
@@ -472,7 +472,7 @@
   const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
     .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
   registeredRows[0] = produced;
-  const registeredCount = validateBrutal(raw(registeredRows)).length;
+  const historicalRegistrationError = capturedFailure(() => { validateBrutal(raw(registeredRows)); });
   const cell = CELLS.find((candidate) => candidate.basis === 'brutal' && candidate.seed === 6_203_001 && candidate.rep === 1);
   if (cell === undefined) throw new Error('Registered timeout cell is absent.');
   const boardImage = record(produced['boardImage']);
@@ -559,7 +559,7 @@
     }));
   return {
     packetRows: packetCount,
-    registeredRows: registeredCount,
+    historicalRegistrationError,
     observedViolations,
     contradictoryPacketError: capturedFailure(() => { pairedDocuments(contradictoryPacketRows); }),
     contradictoryRegisteredError: capturedFailure(() => { validateBrutal(raw(contradictoryRegisteredRows)); }),
@@ -583,6 +583,8 @@
     expect(MANIFEST.version).toBe('d569-blind-experiment-v5');
     expect(MANIFEST.secondFamily.manifestPath).toBe(D569_SECOND_FAMILY_MANIFEST_PATH);
     expect(secondFamily.version).toBe('d569-second-family-manifest-v1');
+    expect(MANIFEST.caps.semanticBytes).toBe(8_192);
+    expect(new Set(CELLS.map((cell) => cell.semanticContextCapBytes))).toEqual(new Set([8_192]));
   });
 
   it('validates a mixed 27-historical/3-current hard grid without rewriting retained bytes', () => {
@@ -662,7 +664,7 @@
     expect(validateBrutal(cancelled)).toHaveLength(30);
   });
 
-  it('carries one finalized semantic delivery object through runner cancellation, packet decoding, and registered validation', () => {
+  it('rejects a live-runner cancellation row under the historical v5 semantic cap', () => {
     const produced = RUNNER_CANCELLATION_AFTER_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'infrastructure_failed', fallbackReason: 'dispatch_cancelled',
@@ -676,26 +678,31 @@
     expect(Number(produced['semanticBoardBytes'])).toBeGreaterThan(0);
     const failure = record(produced['failingDispatch']);
     expect(failure['turnContextDelivery']).toEqual(produced['turnContextDelivery']);
+    expect(produced['turnContextConfiguredCaps']).toEqual({ baseBytes: 65_536, semanticBytes: 32_768 });
     const packetRows: object[] = CELLS.filter((cell) => cell.basis === 'brutal')
       .map((cell) => current(cell, 'authorized'));
     packetRows[0] = produced;
-    expect(pairedDocuments(packetRows).packet).toHaveLength(60);
+    expect(() => pairedDocuments(packetRows))
+      .toThrow('turnContextBudget.configuredSemanticBytes is invalid: Invalid input: expected 8192.');
 
     const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
       .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
     registeredRows[0] = produced;
-    expect(validateBrutal(raw(registeredRows))).toHaveLength(30);
+    expect(() => validateBrutal(raw(registeredRows)))
+      .toThrow('Registered context caps mismatch at 1:1.');
   });
 
-  it('carries a runner timeout with an ordinary incomplete catalog through packet and registered observation validation', () => {
+  it('rejects a live-runner timeout row under the historical v5 semantic cap', () => {
     const produced = RUNNER_TIMEOUT_BEFORE_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'refused', fallbackReason: 'timeout',
       engineCatalogEvidence: { status: 'inconclusive', reason: 'no_correlated_catalog' },
       turnContextDelivery: { status: 'timeout_before_delivery', measurement: null },
+      turnContextConfiguredCaps: { baseBytes: 65_536, semanticBytes: 32_768 },
     });
     expect(RUNNER_TIMEOUT_CONSUMERS.packetRows).toBe(60);
-    expect(RUNNER_TIMEOUT_CONSUMERS.registeredRows).toBe(30);
+    expect(RUNNER_TIMEOUT_CONSUMERS.historicalRegistrationError)
+      .toBe('Registered context caps mismatch at 1:1.');
     expect(RUNNER_TIMEOUT_CONSUMERS.observedViolations).toEqual([]);
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryPacketError).toContain('integrity evidence');
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryRegisteredError).toContain('integrity-indeterminate');

diff --git a/tests/unit/tools/d569-v5.test.ts b/tests/unit/tools/d569-v5.test.ts
index 6ca4f57e9a6dd7b8fadfc8f90a03ef5a84f803b5..b8f6042e7527e0fd72e256428b086fa5407e63be
--- a/tests/unit/tools/d569-v5.test.ts
+++ b/tests/unit/tools/d569-v5.test.ts
@@ -451,7 +451,7 @@
 
 function evaluateRunnerTimeoutConsumers(): {
   readonly packetRows: number;
-  readonly registeredRows: number;
+  readonly historicalRegistrationError: string;
   readonly observedViolations: readonly string[];
   readonly contradictoryPacketError: string;
   readonly contradictoryRegisteredError: string;
@@ -472,7 +472,7 @@
   const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
     .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
   registeredRows[0] = produced;
-  const registeredCount = validateBrutal(raw(registeredRows)).length;
+  const historicalRegistrationError = capturedFailure(() => { validateBrutal(raw(registeredRows)); });
   const cell = CELLS.find((candidate) => candidate.basis === 'brutal' && candidate.seed === 6_203_001 && candidate.rep === 1);
   if (cell === undefined) throw new Error('Registered timeout cell is absent.');
   const boardImage = record(produced['boardImage']);
@@ -559,7 +559,7 @@
     }));
   return {
     packetRows: packetCount,
-    registeredRows: registeredCount,
+    historicalRegistrationError,
     observedViolations,
     contradictoryPacketError: capturedFailure(() => { pairedDocuments(contradictoryPacketRows); }),
     contradictoryRegisteredError: capturedFailure(() => { validateBrutal(raw(contradictoryRegisteredRows)); }),
@@ -583,6 +583,8 @@
     expect(MANIFEST.version).toBe('d569-blind-experiment-v5');
     expect(MANIFEST.secondFamily.manifestPath).toBe(D569_SECOND_FAMILY_MANIFEST_PATH);
     expect(secondFamily.version).toBe('d569-second-family-manifest-v1');
+    expect(MANIFEST.caps.semanticBytes).toBe(8_192);
+    expect(new Set(CELLS.map((cell) => cell.semanticContextCapBytes))).toEqual(new Set([8_192]));
   });
 
   it('validates a mixed 27-historical/3-current hard grid without rewriting retained bytes', () => {
@@ -662,7 +664,7 @@
     expect(validateBrutal(cancelled)).toHaveLength(30);
   });
 
-  it('carries one finalized semantic delivery object through runner cancellation, packet decoding, and registered validation', () => {
+  it('rejects a live-runner cancellation row under the historical v5 semantic cap', () => {
     const produced = RUNNER_CANCELLATION_AFTER_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'infrastructure_failed', fallbackReason: 'dispatch_cancelled',
@@ -676,26 +678,31 @@
     expect(Number(produced['semanticBoardBytes'])).toBeGreaterThan(0);
     const failure = record(produced['failingDispatch']);
     expect(failure['turnContextDelivery']).toEqual(produced['turnContextDelivery']);
+    expect(produced['turnContextConfiguredCaps']).toEqual({ baseBytes: 65_536, semanticBytes: 32_768 });
     const packetRows: object[] = CELLS.filter((cell) => cell.basis === 'brutal')
       .map((cell) => current(cell, 'authorized'));
     packetRows[0] = produced;
-    expect(pairedDocuments(packetRows).packet).toHaveLength(60);
+    expect(() => pairedDocuments(packetRows))
+      .toThrow('turnContextBudget.configuredSemanticBytes is invalid: Invalid input: expected 8192.');
 
     const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
       .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
     registeredRows[0] = produced;
-    expect(validateBrutal(raw(registeredRows))).toHaveLength(30);
+    expect(() => validateBrutal(raw(registeredRows)))
+      .toThrow('Registered context caps mismatch at 1:1.');
   });
 
-  it('carries a runner timeout with an ordinary incomplete catalog through packet and registered observation validation', () => {
+  it('rejects a live-runner timeout row under the historical v5 semantic cap', () => {
     const produced = RUNNER_TIMEOUT_BEFORE_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'refused', fallbackReason: 'timeout',
       engineCatalogEvidence: { status: 'inconclusive', reason: 'no_correlated_catalog' },
       turnContextDelivery: { status: 'timeout_before_delivery', measurement: null },
+      turnContextConfiguredCaps: { baseBytes: 65_536, semanticBytes: 32_768 },
     });
     expect(RUNNER_TIMEOUT_CONSUMERS.packetRows).toBe(60);
-    expect(RUNNER_TIMEOUT_CONSUMERS.registeredRows).toBe(30);
+    expect(RUNNER_TIMEOUT_CONSUMERS.historicalRegistrationError)
+      .toBe('Registered context caps mismatch at 1:1.');
     expect(RUNNER_TIMEOUT_CONSUMERS.observedViolations).toEqual([]);
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryPacketError).toContain('integrity evidence');
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryRegisteredError).toContain('integrity-indeterminate');

exec
/bin/bash -lc 'npx vitest run --configLoader runner --reporter=verbose tests/unit/tools/d569-v5.test.ts' in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 24978ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-cohort-01

[spell-source-parse-cache] reused /tmp/dnd-srd-spell-source-parse-cache/5198a070dbed34af.json
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > resolves only the historical v5 experiment and v1 second-family manifests 2ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > validates a mixed 27-historical/3-current hard grid without rewriting retained bytes 7ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > migrates every registered validator invariant for a complete current brutal grid 260ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > validates registered hard replacements against retained original cells and reconciliation provenance 255ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > accepts a registered host-authorization refusal without treating attribution as a default 234ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects a row that actually executed a model default 225ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > accepts cancellation after delivered context in registered validation 226ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects a live-runner cancellation row under the historical v5 semantic cap 233ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects a live-runner timeout row under the historical v5 semantic cap 1ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects malformed and wrong-profile catalog evidence after timeout or cancellation in every consumer 0ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects incomplete v3 evidence objects 194ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects an indeterminate delivery when the companion v3 catalog field is absent 190ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects a conflicting_success_and_failure catalog when the companion v3 delivery field is absent 186ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects a invalid_catalog_response catalog when the companion v3 delivery field is absent 185ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects incomplete v3 evidence nested in a failing dispatch 187ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects a missing v3 host diagnostic 188ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects partial v3 hybrids and integrity-indeterminate rows before analysis 1ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects registered seed mutations 193ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects registered fixture-state mutations 192ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects registered code-cohort mutations 190ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects registered model provenance mutations 194ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects registered effort provenance mutations 193ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects registered KB hash provenance mutations 194ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects registered KB components provenance mutations 193ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects registered visual pin provenance mutations 200ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > rejects registered manifest mutations before accepting rows 93ms
 ✓ tests/unit/tools/d569-v5.test.ts > D569 v5 replacement validation and paired analysis tools > runs raw outcomes through packet/key construction and the registered paired scorer 44ms

 Test Files  1 passed (1)
      Tests  27 passed (27)
   Start at  21:26:40
   Duration  24.65s (transform 1.82s, setup 0ms, import 18.75s, tests 4.26s, environment 0ms)


diff --git a/tests/unit/tools/d569-v5.test.ts b/tests/unit/tools/d569-v5.test.ts
index 6ca4f57e9a6dd7b8fadfc8f90a03ef5a84f803b5..b8f6042e7527e0fd72e256428b086fa5407e63be
--- a/tests/unit/tools/d569-v5.test.ts
+++ b/tests/unit/tools/d569-v5.test.ts
@@ -451,7 +451,7 @@
 
 function evaluateRunnerTimeoutConsumers(): {
   readonly packetRows: number;
-  readonly registeredRows: number;
+  readonly historicalRegistrationError: string;
   readonly observedViolations: readonly string[];
   readonly contradictoryPacketError: string;
   readonly contradictoryRegisteredError: string;
@@ -472,7 +472,7 @@
   const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
     .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
   registeredRows[0] = produced;
-  const registeredCount = validateBrutal(raw(registeredRows)).length;
+  const historicalRegistrationError = capturedFailure(() => { validateBrutal(raw(registeredRows)); });
   const cell = CELLS.find((candidate) => candidate.basis === 'brutal' && candidate.seed === 6_203_001 && candidate.rep === 1);
   if (cell === undefined) throw new Error('Registered timeout cell is absent.');
   const boardImage = record(produced['boardImage']);
@@ -559,7 +559,7 @@
     }));
   return {
     packetRows: packetCount,
-    registeredRows: registeredCount,
+    historicalRegistrationError,
     observedViolations,
     contradictoryPacketError: capturedFailure(() => { pairedDocuments(contradictoryPacketRows); }),
     contradictoryRegisteredError: capturedFailure(() => { validateBrutal(raw(contradictoryRegisteredRows)); }),
@@ -583,6 +583,8 @@
     expect(MANIFEST.version).toBe('d569-blind-experiment-v5');
     expect(MANIFEST.secondFamily.manifestPath).toBe(D569_SECOND_FAMILY_MANIFEST_PATH);
     expect(secondFamily.version).toBe('d569-second-family-manifest-v1');
+    expect(MANIFEST.caps.semanticBytes).toBe(8_192);
+    expect(new Set(CELLS.map((cell) => cell.semanticContextCapBytes))).toEqual(new Set([8_192]));
   });
 
   it('validates a mixed 27-historical/3-current hard grid without rewriting retained bytes', () => {
@@ -662,7 +664,7 @@
     expect(validateBrutal(cancelled)).toHaveLength(30);
   });
 
-  it('carries one finalized semantic delivery object through runner cancellation, packet decoding, and registered validation', () => {
+  it('rejects a live-runner cancellation row under the historical v5 semantic cap', () => {
     const produced = RUNNER_CANCELLATION_AFTER_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'infrastructure_failed', fallbackReason: 'dispatch_cancelled',
@@ -676,26 +678,31 @@
     expect(Number(produced['semanticBoardBytes'])).toBeGreaterThan(0);
     const failure = record(produced['failingDispatch']);
     expect(failure['turnContextDelivery']).toEqual(produced['turnContextDelivery']);
+    expect(produced['turnContextConfiguredCaps']).toEqual({ baseBytes: 65_536, semanticBytes: 32_768 });
     const packetRows: object[] = CELLS.filter((cell) => cell.basis === 'brutal')
       .map((cell) => current(cell, 'authorized'));
     packetRows[0] = produced;
-    expect(pairedDocuments(packetRows).packet).toHaveLength(60);
+    expect(() => pairedDocuments(packetRows))
+      .toThrow('turnContextBudget.configuredSemanticBytes is invalid: Invalid input: expected 8192.');
 
     const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
       .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
     registeredRows[0] = produced;
-    expect(validateBrutal(raw(registeredRows))).toHaveLength(30);
+    expect(() => validateBrutal(raw(registeredRows)))
+      .toThrow('Registered context caps mismatch at 1:1.');
   });
 
-  it('carries a runner timeout with an ordinary incomplete catalog through packet and registered observation validation', () => {
+  it('rejects a live-runner timeout row under the historical v5 semantic cap', () => {
     const produced = RUNNER_TIMEOUT_BEFORE_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'refused', fallbackReason: 'timeout',
       engineCatalogEvidence: { status: 'inconclusive', reason: 'no_correlated_catalog' },
       turnContextDelivery: { status: 'timeout_before_delivery', measurement: null },
+      turnContextConfiguredCaps: { baseBytes: 65_536, semanticBytes: 32_768 },
     });
     expect(RUNNER_TIMEOUT_CONSUMERS.packetRows).toBe(60);
-    expect(RUNNER_TIMEOUT_CONSUMERS.registeredRows).toBe(30);
+    expect(RUNNER_TIMEOUT_CONSUMERS.historicalRegistrationError)
+      .toBe('Registered context caps mismatch at 1:1.');
     expect(RUNNER_TIMEOUT_CONSUMERS.observedViolations).toEqual([]);
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryPacketError).toContain('integrity evidence');
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryRegisteredError).toContain('integrity-indeterminate');

codex
The amended v5 behavior is now green: `27/27`. Synthesized v5 rows still validate at the manifest-declared 8,192-byte cap; a live timeout row with 32,768 is rejected with the exact `Registered context caps mismatch at 1:1.` message, and a delivered live cancellation row is also rejected by the historical 8,192-byte packet schema before registered validation. I’m running the other required suites serially now.
exec
/bin/bash -lc 'npx vitest run --configLoader runner --reporter=verbose tests/unit/tools/d569-second-family-manifest.test.ts' in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 7087ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-cohort-01

[spell-source-parse-cache] reused /tmp/dnd-srd-spell-source-parse-cache/5198a070dbed34af.json
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-hard-2/seed-5118001.json differs from its current canonical rebuild only at $.encounter.state.foggedCells 10ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-hard-2/seed-5118002.json differs from its current canonical rebuild only at $.encounter.state.foggedCells 3ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-hard-2/seed-5118003.json differs from its current canonical rebuild only at $.encounter.state.foggedCells 3ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-hard-2/seed-5118004.json differs from its current canonical rebuild only at $.encounter.state.foggedCells 2ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-hard-2/seed-5118005.json differs from its current canonical rebuild only at $.encounter.state.foggedCells 2ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-hard-2/seed-5118006.json differs from its current canonical rebuild only at $.encounter.state.foggedCells 2ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-hard-2/seed-5118007.json differs from its current canonical rebuild only at $.encounter.state.foggedCells 2ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-hard-2/seed-5118008.json differs from its current canonical rebuild only at $.encounter.state.foggedCells 2ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-hard-2/seed-5118009.json differs from its current canonical rebuild only at $.encounter.state.foggedCells 2ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-hard-2/seed-5118010.json differs from its current canonical rebuild only at $.encounter.state.foggedCells 2ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-brutal-2/seed-6207001.json differs from its current canonical rebuild only at $.encounter.state.foggedCells 3ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-brutal-2/seed-6207002.json differs from its current canonical rebuild only at $.encounter.state.foggedCells 3ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-brutal-2/seed-6207003.json differs from its current canonical rebuild only at $.encounter.state.foggedCells 3ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-brutal-2/seed-6207004.json differs from its current canonical rebuild only at $.encounter.state.foggedCells 9ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-brutal-2/seed-6207005.json differs from its current canonical rebuild only at $.encounter.state.foggedCells 2ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-brutal-2/seed-6207006.json differs from its current canonical rebuild only at $.encounter.state.foggedCells 2ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-brutal-2/seed-6207007.json differs from its current canonical rebuild only at $.encounter.state.foggedCells 1ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-brutal-2/seed-6207008.json differs from its current canonical rebuild only at $.encounter.state.foggedCells 1ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-brutal-2/seed-6207009.json differs from its current canonical rebuild only at $.encounter.state.foggedCells 2ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-brutal-2/seed-6207010.json differs from its current canonical rebuild only at $.encounter.state.foggedCells 1ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > pins the amended exact contiguous ranges and verbatim independent ledger evidence 174ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-hard-2/seed-5118001.json satisfies every hard state-property invariant before its pin 5ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-hard-2/seed-5118002.json satisfies every hard state-property invariant before its pin 3ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-hard-2/seed-5118003.json satisfies every hard state-property invariant before its pin 3ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-hard-2/seed-5118004.json satisfies every hard state-property invariant before its pin 2ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-hard-2/seed-5118005.json satisfies every hard state-property invariant before its pin 2ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-hard-2/seed-5118006.json satisfies every hard state-property invariant before its pin 2ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-hard-2/seed-5118007.json satisfies every hard state-property invariant before its pin 3ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-hard-2/seed-5118008.json satisfies every hard state-property invariant before its pin 2ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-hard-2/seed-5118009.json satisfies every hard state-property invariant before its pin 2ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-hard-2/seed-5118010.json satisfies every hard state-property invariant before its pin 3ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-brutal-2/seed-6207001.json retains historical integrity plus static budget, caster, and terrain invariants 128ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-brutal-2/seed-6207002.json retains historical integrity plus static budget, caster, and terrain invariants 49ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-brutal-2/seed-6207003.json retains historical integrity plus static budget, caster, and terrain invariants 121ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-brutal-2/seed-6207004.json retains historical integrity plus static budget, caster, and terrain invariants 262ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-brutal-2/seed-6207005.json retains historical integrity plus static budget, caster, and terrain invariants 86ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-brutal-2/seed-6207006.json retains historical integrity plus static budget, caster, and terrain invariants 77ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-brutal-2/seed-6207007.json retains historical integrity plus static budget, caster, and terrain invariants 245ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-brutal-2/seed-6207008.json retains historical integrity plus static budget, caster, and terrain invariants 96ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-brutal-2/seed-6207009.json retains historical integrity plus static budget, caster, and terrain invariants 71ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > tests/fixtures/arena-basis-brutal-2/seed-6207010.json retains historical integrity plus static budget, caster, and terrain invariants 91ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > second_family_uses_primary_seed: rejects primary or previously used seed namespaces 204ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > brutal_membership_checks_name_only: rejects structural failures even with the roster names intact 87ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > rejects missing or rewritten supervisor ledger evidence 95ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > rejects fixture bytes that no longer match the manifest hash 87ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > seed_hash_without_properties: a matching digest cannot excuse failed membership 85ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > second_generation_not_compared: rejects a divergent independent regeneration 85ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > legacy_projection_drops_all_state: retains any second committed state difference 86ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > legacy_projection_requires_the_committed_legacy_key 85ms
 ✓ tests/unit/tools/d569-second-family-manifest.test.ts > D569 independent second-family manifest > new_v2_legacy_fogged_cells: rejects a rebound-hash v2 brutal fixture with the legacy key 1224ms

 Test Files  1 passed (1)
      Tests  50 passed (50)
   Start at  21:27:12
   Duration  6.76s (transform 1.22s, setup 0ms, import 1.78s, tests 3.53s, environment 0ms)


diff --git a/tests/unit/tools/d569-v5.test.ts b/tests/unit/tools/d569-v5.test.ts
index 6ca4f57e9a6dd7b8fadfc8f90a03ef5a84f803b5..b8f6042e7527e0fd72e256428b086fa5407e63be
--- a/tests/unit/tools/d569-v5.test.ts
+++ b/tests/unit/tools/d569-v5.test.ts
@@ -451,7 +451,7 @@
 
 function evaluateRunnerTimeoutConsumers(): {
   readonly packetRows: number;
-  readonly registeredRows: number;
+  readonly historicalRegistrationError: string;
   readonly observedViolations: readonly string[];
   readonly contradictoryPacketError: string;
   readonly contradictoryRegisteredError: string;
@@ -472,7 +472,7 @@
   const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
     .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
   registeredRows[0] = produced;
-  const registeredCount = validateBrutal(raw(registeredRows)).length;
+  const historicalRegistrationError = capturedFailure(() => { validateBrutal(raw(registeredRows)); });
   const cell = CELLS.find((candidate) => candidate.basis === 'brutal' && candidate.seed === 6_203_001 && candidate.rep === 1);
   if (cell === undefined) throw new Error('Registered timeout cell is absent.');
   const boardImage = record(produced['boardImage']);
@@ -559,7 +559,7 @@
     }));
   return {
     packetRows: packetCount,
-    registeredRows: registeredCount,
+    historicalRegistrationError,
     observedViolations,
     contradictoryPacketError: capturedFailure(() => { pairedDocuments(contradictoryPacketRows); }),
     contradictoryRegisteredError: capturedFailure(() => { validateBrutal(raw(contradictoryRegisteredRows)); }),
@@ -583,6 +583,8 @@
     expect(MANIFEST.version).toBe('d569-blind-experiment-v5');
     expect(MANIFEST.secondFamily.manifestPath).toBe(D569_SECOND_FAMILY_MANIFEST_PATH);
     expect(secondFamily.version).toBe('d569-second-family-manifest-v1');
+    expect(MANIFEST.caps.semanticBytes).toBe(8_192);
+    expect(new Set(CELLS.map((cell) => cell.semanticContextCapBytes))).toEqual(new Set([8_192]));
   });
 
   it('validates a mixed 27-historical/3-current hard grid without rewriting retained bytes', () => {
@@ -662,7 +664,7 @@
     expect(validateBrutal(cancelled)).toHaveLength(30);
   });
 
-  it('carries one finalized semantic delivery object through runner cancellation, packet decoding, and registered validation', () => {
+  it('rejects a live-runner cancellation row under the historical v5 semantic cap', () => {
     const produced = RUNNER_CANCELLATION_AFTER_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'infrastructure_failed', fallbackReason: 'dispatch_cancelled',
@@ -676,26 +678,31 @@
     expect(Number(produced['semanticBoardBytes'])).toBeGreaterThan(0);
     const failure = record(produced['failingDispatch']);
     expect(failure['turnContextDelivery']).toEqual(produced['turnContextDelivery']);
+    expect(produced['turnContextConfiguredCaps']).toEqual({ baseBytes: 65_536, semanticBytes: 32_768 });
     const packetRows: object[] = CELLS.filter((cell) => cell.basis === 'brutal')
       .map((cell) => current(cell, 'authorized'));
     packetRows[0] = produced;
-    expect(pairedDocuments(packetRows).packet).toHaveLength(60);
+    expect(() => pairedDocuments(packetRows))
+      .toThrow('turnContextBudget.configuredSemanticBytes is invalid: Invalid input: expected 8192.');
 
     const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
       .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
     registeredRows[0] = produced;
-    expect(validateBrutal(raw(registeredRows))).toHaveLength(30);
+    expect(() => validateBrutal(raw(registeredRows)))
+      .toThrow('Registered context caps mismatch at 1:1.');
   });
 
-  it('carries a runner timeout with an ordinary incomplete catalog through packet and registered observation validation', () => {
+  it('rejects a live-runner timeout row under the historical v5 semantic cap', () => {
     const produced = RUNNER_TIMEOUT_BEFORE_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'refused', fallbackReason: 'timeout',
       engineCatalogEvidence: { status: 'inconclusive', reason: 'no_correlated_catalog' },
       turnContextDelivery: { status: 'timeout_before_delivery', measurement: null },
+      turnContextConfiguredCaps: { baseBytes: 65_536, semanticBytes: 32_768 },
     });
     expect(RUNNER_TIMEOUT_CONSUMERS.packetRows).toBe(60);
-    expect(RUNNER_TIMEOUT_CONSUMERS.registeredRows).toBe(30);
+    expect(RUNNER_TIMEOUT_CONSUMERS.historicalRegistrationError)
+      .toBe('Registered context caps mismatch at 1:1.');
     expect(RUNNER_TIMEOUT_CONSUMERS.observedViolations).toEqual([]);
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryPacketError).toContain('integrity evidence');
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryRegisteredError).toContain('integrity-indeterminate');

exec
/bin/bash -lc 'npx vitest run --configLoader runner --reporter=verbose tests/unit/tools/d569-blind-experiment.test.ts' in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 exited 1 in 6727ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-cohort-01

[spell-source-parse-cache] reused /tmp/dnd-srd-spell-source-parse-cache/5198a070dbed34af.json
 × tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > validates the exact v5 Opus 4.8 arms and notes-only Fable Astra Sol panel amendment 183ms
   → expected [ …(40) ] to deeply equal []
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > keeps historical amendments exact while excluding Opus 5 from every active registry 1ms
 × tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > dry-runs versioned Opus 4.8 cells without accepting historical Opus 5 rows 80ms
   → Invalid D569 experiment manifest: second_family_first_regeneration
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > rejects the Opus notes source counted in the scoring panel or eligibility 4ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > rejects a panel of only two scoring seats in manifest and registered analysis 1ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > rejects Opus 5 in any active arm or panel position 140ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > accepts only notes or empty exposure and rejects a deciding Opus policy 1ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > rejects reversed notes and scoring stages and altered panel aggregation 1ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > preserves all 32 committed input hash pins across Amendment 2 140ms
 × tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > adds exactly 180 separately labeled advice-assisted hint cells, 660 total 67ms
   → Invalid D569 experiment manifest: second_family_first_regeneration
 × tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > consumes the frozen second encounter family for all 480 core cells 67ms
   → Invalid D569 experiment manifest: second_family_first_regeneration
 × tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > records exact model effort cli and cliVersion for every observed row 67ms
   → Invalid D569 experiment manifest: second_family_first_regeneration
 × tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > rejects either decisive integrity field alone while preserving rows with neither field 66ms
   → Invalid D569 experiment manifest: second_family_first_regeneration
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > rejects changed advice baseline settings, primer, and model-default policy 64ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > rejects changed KB and fixture bytes 128ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > requires every Astra arm and its code-only versus minhint repair contrast 127ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > rejects an Astra hint arm missing its registered repair mode 62ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > rejects Astra blind when code-only repair is replaced by a minimal hint 65ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > rejects removal of the Astra code-only versus minhint repair comparison 61ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > registers direct high-effort Astra versus Sol contrasts in both modes 121ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > scores Astra by Astra and Sol by Sol while Fable has no player arm 124ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > rejects a mutated historical amendment record 1ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > fluke_guard_uses_shuffle_seed: rejects a trained or replaced second encounter cohort 133ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 maxed effort state machine > maxed_after_one_no_gain: refuses medium before two consecutive high misses and low before two medium misses 0ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 maxed effort state machine > invalid gates do not count and a repeated positive gain resets no-gain progress 0ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 paired cluster analysis and success labels > refusal interval boundary matrix classifies [ -0.1, -0.01 ] as 'noninferior' 0ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 paired cluster analysis and success labels > refusal interval boundary matrix classifies [ -0.1, +0 ] as 'noninferior' 0ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 paired cluster analysis and success labels > refusal interval boundary matrix classifies [ +0, +0 ] as 'noninferior' 0ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 paired cluster analysis and success labels > refusal interval boundary matrix classifies [ -0.1, 0.01 ] as 'not_noninferior' 0ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 paired cluster analysis and success labels > refusal interval boundary matrix classifies [ +0, 0.01 ] as 'not_noninferior' 0ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 paired cluster analysis and success labels > refusal interval boundary matrix classifies [ 0.01, 0.1 ] as 'not_noninferior' 0ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 paired cluster analysis and success labels > refusal_upper_bound_not_lower: fails when only the refusal lower bound clears the margin 0ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 paired cluster analysis and success labels > refusal_direction_is_blind_minus_advice: accepts a nonpositive interval and rejects a positive interval 0ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 paired cluster analysis and success labels > refusal_margin_is_at_most: accepts an upper bound exactly equal to the named zero margin 0ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 paired cluster analysis and success labels > refusal_interval_not_mean: a negative mean with a positive upper bound fails 0ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 paired cluster analysis and success labels > offense_is_strict_and_conjunctive: exact margin fails and just above passes only with refusal passing 0ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 paired cluster analysis and success labels > invalid_interval_guard: missing, non-finite, or reversed interval evidence never qualifies 0ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 paired cluster analysis and success labels > proves pairing direction, panel-seat averaging, components, and 100000-resample reproducibility 425ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 paired cluster analysis and success labels > registered analysis rejects both executed sides when Astra is absent 0ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 paired cluster analysis and success labels > registered analysis rejects an unknown third seat substituted for Astra 0ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 paired cluster analysis and success labels > requires Fable Astra and Sol when the opposite side failed execution 1ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 paired cluster analysis and success labels > registered analysis exposes no Opus input output or deciding path 1ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 paired cluster analysis and success labels > rejects Opus-only and mixed Opus scoring diagnostic subsets 0ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 paired cluster analysis and success labels > keeps registered scoring-seat subsets diagnostic and unable to qualify 1ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 paired cluster analysis and success labels > success_uses_executed_only: refused rows remain zero in primary while executed-only is selection-conditioned 7ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 paired cluster analysis and success labels > refusal_cluster_distribution_end_to_end: zero-and-one clusters fail, while swapped arms pass 39ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 paired cluster analysis and success labels > noninferiority_pools_bases: never lets hard success conceal brutal failure 6ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 paired cluster analysis and success labels > requires the second encounter cohort to point the same way and independently pass 12ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 paired cluster analysis and success labels > refusal_only_failure_propagates: either primary basis or second family prevents overall success 211ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 override-ready sealed evidence > override_exposes_top_before_blind_seal: requires sealing before top reveal and answer-key-only top evidence 0ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 override-ready sealed evidence > requires identical capsules and validates the sealed blind-intent hash 0ms
 ✓ tests/unit/tools/d569-blind-experiment.test.ts > D569 override-ready sealed evidence > defines improvement as final policy minus always-engine-top, not blind-intent subset gain 0ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > validates the exact v5 Opus 4.8 arms and notes-only Fable Astra Sol panel amendment
AssertionError: expected [ …(40) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "second_family_first_regeneration",
+   "second_family_independent_regeneration",
+   "second_family_first_regeneration",
+   "second_family_independent_regeneration",
+   "second_family_first_regeneration",
+   "second_family_independent_regeneration",
+   "second_family_first_regeneration",
+   "second_family_independent_regeneration",
+   "second_family_first_regeneration",
+   "second_family_independent_regeneration",
+   "second_family_first_regeneration",
+   "second_family_independent_regeneration",
+   "second_family_first_regeneration",
+   "second_family_independent_regeneration",
+   "second_family_first_regeneration",
+   "second_family_independent_regeneration",
+   "second_family_first_regeneration",
+   "second_family_independent_regeneration",
+   "second_family_first_regeneration",
+   "second_family_independent_regeneration",
+   "second_family_first_regeneration",
+   "second_family_independent_regeneration",
+   "second_family_first_regeneration",
+   "second_family_independent_regeneration",
+   "second_family_first_regeneration",
+   "second_family_independent_regeneration",
+   "second_family_first_regeneration",
+   "second_family_independent_regeneration",
+   "second_family_first_regeneration",
+   "second_family_independent_regeneration",
+   "second_family_first_regeneration",
+   "second_family_independent_regeneration",
+   "second_family_first_regeneration",
+   "second_family_independent_regeneration",
+   "second_family_first_regeneration",
+   "second_family_independent_regeneration",
+   "second_family_first_regeneration",
+   "second_family_independent_regeneration",
+   "second_family_first_regeneration",
+   "second_family_independent_regeneration",
+ ]

 ❯ tests/unit/tools/d569-blind-experiment.test.ts:409:27
    407|   it('validates the exact v5 Opus 4.8 arms and notes-only Fable Astra …
    408|     const frozen = manifest();
    409|     expect(codes(frozen)).toEqual([]);
       |                           ^
    410|     expect(frozen.version).toBe('d569-blind-experiment-v5');
    411|     expect(frozen.preregistrationAmendments).toEqual(EXPECTED_V5_AMEND…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/6]⎯

 FAIL  tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > dry-runs versioned Opus 4.8 cells without accepting historical Opus 5 rows
TypeError: Invalid D569 experiment manifest: second_family_first_regeneration
 ❯ dryRunD569Experiment tools/d569-blind-experiment.ts:677:11
    675|   const violations = validateD569ExperimentManifest(input, access);
    676|   if (violations.length > 0) {
    677|     throw new TypeError(`Invalid D569 experiment manifest: ${violation…
       |           ^
    678|   }
    679|   const manifest = d569ExperimentManifestSchema.parse(input);
 ❯ tests/unit/tools/d569-blind-experiment.test.ts:473:19

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/6]⎯

 FAIL  tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > adds exactly 180 separately labeled advice-assisted hint cells, 660 total
TypeError: Invalid D569 experiment manifest: second_family_first_regeneration
 ❯ dryRunD569Experiment tools/d569-blind-experiment.ts:677:11
    675|   const violations = validateD569ExperimentManifest(input, access);
    676|   if (violations.length > 0) {
    677|     throw new TypeError(`Invalid D569 experiment manifest: ${violation…
       |           ^
    678|   }
    679|   const manifest = d569ExperimentManifestSchema.parse(input);
 ❯ tests/unit/tools/d569-blind-experiment.test.ts:635:19

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/6]⎯

 FAIL  tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > consumes the frozen second encounter family for all 480 core cells
TypeError: Invalid D569 experiment manifest: second_family_first_regeneration
 ❯ dryRunD569Experiment tools/d569-blind-experiment.ts:677:11
    675|   const violations = validateD569ExperimentManifest(input, access);
    676|   if (violations.length > 0) {
    677|     throw new TypeError(`Invalid D569 experiment manifest: ${violation…
       |           ^
    678|   }
    679|   const manifest = d569ExperimentManifestSchema.parse(input);
 ❯ tests/unit/tools/d569-blind-experiment.test.ts:644:19

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/6]⎯

 FAIL  tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > records exact model effort cli and cliVersion for every observed row
TypeError: Invalid D569 experiment manifest: second_family_first_regeneration
 ❯ dryRunD569Experiment tools/d569-blind-experiment.ts:677:11
    675|   const violations = validateD569ExperimentManifest(input, access);
    676|   if (violations.length > 0) {
    677|     throw new TypeError(`Invalid D569 experiment manifest: ${violation…
       |           ^
    678|   }
    679|   const manifest = d569ExperimentManifestSchema.parse(input);
 ❯ tests/unit/tools/d569-blind-experiment.test.ts:653:19

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/6]⎯

 FAIL  tests/unit/tools/d569-blind-experiment.test.ts > D569 preregistered experiment manifest and dry runner > rejects either decisive integrity field alone while preserving rows with neither field
TypeError: Invalid D569 experiment manifest: second_family_first_regeneration
 ❯ dryRunD569Experiment tools/d569-blind-experiment.ts:677:11
    675|   const violations = validateD569ExperimentManifest(input, access);
    676|   if (violations.length > 0) {
    677|     throw new TypeError(`Invalid D569 experiment manifest: ${violation…
       |           ^
    678|   }
    679|   const manifest = d569ExperimentManifestSchema.parse(input);
 ❯ tests/unit/tools/d569-blind-experiment.test.ts:683:18

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/6]⎯


 Test Files  1 failed (1)
      Tests  6 failed | 46 passed (52)
   Start at  21:27:23
   Duration  6.39s (transform 1.59s, setup 0ms, import 2.49s, tests 2.41s, environment 0ms)


diff --git a/tests/unit/tools/d569-v5.test.ts b/tests/unit/tools/d569-v5.test.ts
index 6ca4f57e9a6dd7b8fadfc8f90a03ef5a84f803b5..b8f6042e7527e0fd72e256428b086fa5407e63be
--- a/tests/unit/tools/d569-v5.test.ts
+++ b/tests/unit/tools/d569-v5.test.ts
@@ -451,7 +451,7 @@
 
 function evaluateRunnerTimeoutConsumers(): {
   readonly packetRows: number;
-  readonly registeredRows: number;
+  readonly historicalRegistrationError: string;
   readonly observedViolations: readonly string[];
   readonly contradictoryPacketError: string;
   readonly contradictoryRegisteredError: string;
@@ -472,7 +472,7 @@
   const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
     .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
   registeredRows[0] = produced;
-  const registeredCount = validateBrutal(raw(registeredRows)).length;
+  const historicalRegistrationError = capturedFailure(() => { validateBrutal(raw(registeredRows)); });
   const cell = CELLS.find((candidate) => candidate.basis === 'brutal' && candidate.seed === 6_203_001 && candidate.rep === 1);
   if (cell === undefined) throw new Error('Registered timeout cell is absent.');
   const boardImage = record(produced['boardImage']);
@@ -559,7 +559,7 @@
     }));
   return {
     packetRows: packetCount,
-    registeredRows: registeredCount,
+    historicalRegistrationError,
     observedViolations,
     contradictoryPacketError: capturedFailure(() => { pairedDocuments(contradictoryPacketRows); }),
     contradictoryRegisteredError: capturedFailure(() => { validateBrutal(raw(contradictoryRegisteredRows)); }),
@@ -583,6 +583,8 @@
     expect(MANIFEST.version).toBe('d569-blind-experiment-v5');
     expect(MANIFEST.secondFamily.manifestPath).toBe(D569_SECOND_FAMILY_MANIFEST_PATH);
     expect(secondFamily.version).toBe('d569-second-family-manifest-v1');
+    expect(MANIFEST.caps.semanticBytes).toBe(8_192);
+    expect(new Set(CELLS.map((cell) => cell.semanticContextCapBytes))).toEqual(new Set([8_192]));
   });
 
   it('validates a mixed 27-historical/3-current hard grid without rewriting retained bytes', () => {
@@ -662,7 +664,7 @@
     expect(validateBrutal(cancelled)).toHaveLength(30);
   });
 
-  it('carries one finalized semantic delivery object through runner cancellation, packet decoding, and registered validation', () => {
+  it('rejects a live-runner cancellation row under the historical v5 semantic cap', () => {
     const produced = RUNNER_CANCELLATION_AFTER_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'infrastructure_failed', fallbackReason: 'dispatch_cancelled',
@@ -676,26 +678,31 @@
     expect(Number(produced['semanticBoardBytes'])).toBeGreaterThan(0);
     const failure = record(produced['failingDispatch']);
     expect(failure['turnContextDelivery']).toEqual(produced['turnContextDelivery']);
+    expect(produced['turnContextConfiguredCaps']).toEqual({ baseBytes: 65_536, semanticBytes: 32_768 });
     const packetRows: object[] = CELLS.filter((cell) => cell.basis === 'brutal')
       .map((cell) => current(cell, 'authorized'));
     packetRows[0] = produced;
-    expect(pairedDocuments(packetRows).packet).toHaveLength(60);
+    expect(() => pairedDocuments(packetRows))
+      .toThrow('turnContextBudget.configuredSemanticBytes is invalid: Invalid input: expected 8192.');
 
     const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
       .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
     registeredRows[0] = produced;
-    expect(validateBrutal(raw(registeredRows))).toHaveLength(30);
+    expect(() => validateBrutal(raw(registeredRows)))
+      .toThrow('Registered context caps mismatch at 1:1.');
   });
 
-  it('carries a runner timeout with an ordinary incomplete catalog through packet and registered observation validation', () => {
+  it('rejects a live-runner timeout row under the historical v5 semantic cap', () => {
     const produced = RUNNER_TIMEOUT_BEFORE_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'refused', fallbackReason: 'timeout',
       engineCatalogEvidence: { status: 'inconclusive', reason: 'no_correlated_catalog' },
       turnContextDelivery: { status: 'timeout_before_delivery', measurement: null },
+      turnContextConfiguredCaps: { baseBytes: 65_536, semanticBytes: 32_768 },
     });
     expect(RUNNER_TIMEOUT_CONSUMERS.packetRows).toBe(60);
-    expect(RUNNER_TIMEOUT_CONSUMERS.registeredRows).toBe(30);
+    expect(RUNNER_TIMEOUT_CONSUMERS.historicalRegistrationError)
+      .toBe('Registered context caps mismatch at 1:1.');
     expect(RUNNER_TIMEOUT_CONSUMERS.observedViolations).toEqual([]);
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryPacketError).toContain('integrity evidence');
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryRegisteredError).toContain('integrity-indeterminate');

exec
/bin/bash -lc "nl -ba tests/unit/tools/d569-blind-experiment.test.ts | sed -n '260,330p'
rg -n \"secondFamilyAccess|regenerate:\" tests/unit/tools/d569-blind-experiment.test.ts" in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 0ms:
   260	
   261	const EXPECTED_V5_SCORING_SEATS = [
   262	  { id: 'claude-fable-5-1', model: 'claude-fable-5-1', effort: 'high', role: 'scoring' },
   263	  { id: 'gpt-6-astra', model: 'gpt-6-astra', effort: 'high', role: 'scoring' },
   264	  { id: 'gpt-5.6-sol', model: 'gpt-5.6-sol', effort: 'high', role: 'scoring' },
   265	] as const;
   266	
   267	const EXPECTED_V5_ADVISORY_NOTES_STAGE = {
   268	  source: { id: 'claude-opus-4-8', model: 'claude-opus-4-8', effort: 'high', role: 'advisory_notes' },
   269	  stageOrder: ['advisory_notes_first', 'scoring_panel_second'],
   270	  advisoryTransmission: 'labelled_per_entry_note_text_only',
   271	  advisoryPromptNoteMaxWords: 15,
   272	  advisoryNoteMaxChars: 120,
   273	  advisoryInvalidPolicy: 'nonzero_exit_or_invalid_existing_output_becomes_empty_block',
   274	  advisoryExposureStatuses: ['notes', 'empty'],
   275	  advisoryAnalysisPolicy: 'exposure_status_only_source_artifact_never_loaded',
   276	  scoringSeatAdvisoryPolicy: 'consider_or_ignore_untrusted_no_weight_no_anchor',
   277	} as const;
   278	
   279	function readText(path: string): string {
   280	  const bytes = fixtureBytes.get(path);
   281	  if (bytes === undefined) throw new Error(`undeclared fixture ${path}`);
   282	  return bytes;
   283	}
   284	
   285	function manifest(): D569ExperimentManifest {
   286	  return JSON.parse(readText(D569_EXPERIMENT_MANIFEST_PATH)) as D569ExperimentManifest;
   287	}
   288	
   289	function access(readOverride?: (path: string) => string | undefined): D569ExperimentValidationAccess {
   290	  return {
   291	    readText: (path) => readOverride?.(path) ?? readText(path),
   292	    secondFamilyAccess: {
   293	      readFixture: (path) => readOverride?.(path) ?? readText(path),
   294	      regenerate: (seed, difficulty) => readText(
   295	        `tests/fixtures/arena-basis-${difficulty}-2/seed-${String(seed)}.json`,
   296	      ),
   297	    },
   298	  };
   299	}
   300	
   301	function codes(candidate: unknown, validationAccess = access()): readonly string[] {
   302	  return validateD569ExperimentManifest(candidate, validationAccess).map((violation) => violation.code);
   303	}
   304	
   305	function observedRows(cells: ReturnType<typeof dryRunD569Experiment>): readonly D569ObservedRow[] {
   306	  return cells.map((cell, index) => ({
   307	    arm: cell.arm,
   308	    cli: '/usr/local/bin/codex',
   309	    cliVersion: 'codex-cli 0.148.0',
   310	    model: cell.model,
   311	    effort: cell.effort,
   312	    family: cell.family,
   313	    basis: cell.basis,
   314	    seed: cell.seed,
   315	    rep: cell.rep,
   316	    sessionId: `fresh-session-${String(index)}`,
   317	    timeoutMs: cell.timeoutMs,
   318	    escalationModel: null,
   319	    modelDefaultFallback: false,
   320	    stateHash: cell.stateHash,
   321	    sharedKbHash: cell.sharedKbHash,
   322	    visualSourceHash: cell.visualSourceHash,
   323	    visualProfileHash: cell.visualProfileHash,
   324	    visualArtifactHash: sha256(`${cell.visualSourceHash}:${cell.visualProfileHash}`),
   325	    baseContextCapBytes: cell.baseContextCapBytes,
   326	    semanticContextCapBytes: cell.semanticContextCapBytes,
   327	    truncatedBlocks: [],
   328	  }));
   329	}
   330	
292:    secondFamilyAccess: {
294:      regenerate: (seed, difficulty) => readText(

diff --git a/tests/unit/tools/d569-v5.test.ts b/tests/unit/tools/d569-v5.test.ts
index 6ca4f57e9a6dd7b8fadfc8f90a03ef5a84f803b5..b8f6042e7527e0fd72e256428b086fa5407e63be
--- a/tests/unit/tools/d569-v5.test.ts
+++ b/tests/unit/tools/d569-v5.test.ts
@@ -451,7 +451,7 @@
 
 function evaluateRunnerTimeoutConsumers(): {
   readonly packetRows: number;
-  readonly registeredRows: number;
+  readonly historicalRegistrationError: string;
   readonly observedViolations: readonly string[];
   readonly contradictoryPacketError: string;
   readonly contradictoryRegisteredError: string;
@@ -472,7 +472,7 @@
   const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
     .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
   registeredRows[0] = produced;
-  const registeredCount = validateBrutal(raw(registeredRows)).length;
+  const historicalRegistrationError = capturedFailure(() => { validateBrutal(raw(registeredRows)); });
   const cell = CELLS.find((candidate) => candidate.basis === 'brutal' && candidate.seed === 6_203_001 && candidate.rep === 1);
   if (cell === undefined) throw new Error('Registered timeout cell is absent.');
   const boardImage = record(produced['boardImage']);
@@ -559,7 +559,7 @@
     }));
   return {
     packetRows: packetCount,
-    registeredRows: registeredCount,
+    historicalRegistrationError,
     observedViolations,
     contradictoryPacketError: capturedFailure(() => { pairedDocuments(contradictoryPacketRows); }),
     contradictoryRegisteredError: capturedFailure(() => { validateBrutal(raw(contradictoryRegisteredRows)); }),
@@ -583,6 +583,8 @@
     expect(MANIFEST.version).toBe('d569-blind-experiment-v5');
     expect(MANIFEST.secondFamily.manifestPath).toBe(D569_SECOND_FAMILY_MANIFEST_PATH);
     expect(secondFamily.version).toBe('d569-second-family-manifest-v1');
+    expect(MANIFEST.caps.semanticBytes).toBe(8_192);
+    expect(new Set(CELLS.map((cell) => cell.semanticContextCapBytes))).toEqual(new Set([8_192]));
   });
 
   it('validates a mixed 27-historical/3-current hard grid without rewriting retained bytes', () => {
@@ -662,7 +664,7 @@
     expect(validateBrutal(cancelled)).toHaveLength(30);
   });
 
-  it('carries one finalized semantic delivery object through runner cancellation, packet decoding, and registered validation', () => {
+  it('rejects a live-runner cancellation row under the historical v5 semantic cap', () => {
     const produced = RUNNER_CANCELLATION_AFTER_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'infrastructure_failed', fallbackReason: 'dispatch_cancelled',
@@ -676,26 +678,31 @@
     expect(Number(produced['semanticBoardBytes'])).toBeGreaterThan(0);
     const failure = record(produced['failingDispatch']);
     expect(failure['turnContextDelivery']).toEqual(produced['turnContextDelivery']);
+    expect(produced['turnContextConfiguredCaps']).toEqual({ baseBytes: 65_536, semanticBytes: 32_768 });
     const packetRows: object[] = CELLS.filter((cell) => cell.basis === 'brutal')
       .map((cell) => current(cell, 'authorized'));
     packetRows[0] = produced;
-    expect(pairedDocuments(packetRows).packet).toHaveLength(60);
+    expect(() => pairedDocuments(packetRows))
+      .toThrow('turnContextBudget.configuredSemanticBytes is invalid: Invalid input: expected 8192.');
 
     const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
       .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
     registeredRows[0] = produced;
-    expect(validateBrutal(raw(registeredRows))).toHaveLength(30);
+    expect(() => validateBrutal(raw(registeredRows)))
+      .toThrow('Registered context caps mismatch at 1:1.');
   });
 
-  it('carries a runner timeout with an ordinary incomplete catalog through packet and registered observation validation', () => {
+  it('rejects a live-runner timeout row under the historical v5 semantic cap', () => {
     const produced = RUNNER_TIMEOUT_BEFORE_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'refused', fallbackReason: 'timeout',
       engineCatalogEvidence: { status: 'inconclusive', reason: 'no_correlated_catalog' },
       turnContextDelivery: { status: 'timeout_before_delivery', measurement: null },
+      turnContextConfiguredCaps: { baseBytes: 65_536, semanticBytes: 32_768 },
     });
     expect(RUNNER_TIMEOUT_CONSUMERS.packetRows).toBe(60);
-    expect(RUNNER_TIMEOUT_CONSUMERS.registeredRows).toBe(30);
+    expect(RUNNER_TIMEOUT_CONSUMERS.historicalRegistrationError)
+      .toBe('Registered context caps mismatch at 1:1.');
     expect(RUNNER_TIMEOUT_CONSUMERS.observedViolations).toEqual([]);
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryPacketError).toContain('integrity evidence');
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryRegisteredError).toContain('integrity-indeterminate');

codex
The required blind-experiment baseline is unchanged: `46 passed / 6 failed`. All six reds are the frozen-family tests whose local helper returns committed legacy bytes as “regenerations,” producing the expected 40 second-family regeneration violations; no new red appeared. I’m finishing the two TypeScript checks and the post-change diff/status/freeze gates.
exec
/bin/bash -lc 'npx tsc -p tsconfig.app.json --noEmit' in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 14038ms:
diff --git a/tests/unit/tools/d569-v5.test.ts b/tests/unit/tools/d569-v5.test.ts
index 6ca4f57e9a6dd7b8fadfc8f90a03ef5a84f803b5..b8f6042e7527e0fd72e256428b086fa5407e63be
--- a/tests/unit/tools/d569-v5.test.ts
+++ b/tests/unit/tools/d569-v5.test.ts
@@ -451,7 +451,7 @@
 
 function evaluateRunnerTimeoutConsumers(): {
   readonly packetRows: number;
-  readonly registeredRows: number;
+  readonly historicalRegistrationError: string;
   readonly observedViolations: readonly string[];
   readonly contradictoryPacketError: string;
   readonly contradictoryRegisteredError: string;
@@ -472,7 +472,7 @@
   const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
     .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
   registeredRows[0] = produced;
-  const registeredCount = validateBrutal(raw(registeredRows)).length;
+  const historicalRegistrationError = capturedFailure(() => { validateBrutal(raw(registeredRows)); });
   const cell = CELLS.find((candidate) => candidate.basis === 'brutal' && candidate.seed === 6_203_001 && candidate.rep === 1);
   if (cell === undefined) throw new Error('Registered timeout cell is absent.');
   const boardImage = record(produced['boardImage']);
@@ -559,7 +559,7 @@
     }));
   return {
     packetRows: packetCount,
-    registeredRows: registeredCount,
+    historicalRegistrationError,
     observedViolations,
     contradictoryPacketError: capturedFailure(() => { pairedDocuments(contradictoryPacketRows); }),
     contradictoryRegisteredError: capturedFailure(() => { validateBrutal(raw(contradictoryRegisteredRows)); }),
@@ -583,6 +583,8 @@
     expect(MANIFEST.version).toBe('d569-blind-experiment-v5');
     expect(MANIFEST.secondFamily.manifestPath).toBe(D569_SECOND_FAMILY_MANIFEST_PATH);
     expect(secondFamily.version).toBe('d569-second-family-manifest-v1');
+    expect(MANIFEST.caps.semanticBytes).toBe(8_192);
+    expect(new Set(CELLS.map((cell) => cell.semanticContextCapBytes))).toEqual(new Set([8_192]));
   });
 
   it('validates a mixed 27-historical/3-current hard grid without rewriting retained bytes', () => {
@@ -662,7 +664,7 @@
     expect(validateBrutal(cancelled)).toHaveLength(30);
   });
 
-  it('carries one finalized semantic delivery object through runner cancellation, packet decoding, and registered validation', () => {
+  it('rejects a live-runner cancellation row under the historical v5 semantic cap', () => {
     const produced = RUNNER_CANCELLATION_AFTER_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'infrastructure_failed', fallbackReason: 'dispatch_cancelled',
@@ -676,26 +678,31 @@
     expect(Number(produced['semanticBoardBytes'])).toBeGreaterThan(0);
     const failure = record(produced['failingDispatch']);
     expect(failure['turnContextDelivery']).toEqual(produced['turnContextDelivery']);
+    expect(produced['turnContextConfiguredCaps']).toEqual({ baseBytes: 65_536, semanticBytes: 32_768 });
     const packetRows: object[] = CELLS.filter((cell) => cell.basis === 'brutal')
       .map((cell) => current(cell, 'authorized'));
     packetRows[0] = produced;
-    expect(pairedDocuments(packetRows).packet).toHaveLength(60);
+    expect(() => pairedDocuments(packetRows))
+      .toThrow('turnContextBudget.configuredSemanticBytes is invalid: Invalid input: expected 8192.');
 
     const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
       .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
     registeredRows[0] = produced;
-    expect(validateBrutal(raw(registeredRows))).toHaveLength(30);
+    expect(() => validateBrutal(raw(registeredRows)))
+      .toThrow('Registered context caps mismatch at 1:1.');
   });
 
-  it('carries a runner timeout with an ordinary incomplete catalog through packet and registered observation validation', () => {
+  it('rejects a live-runner timeout row under the historical v5 semantic cap', () => {
     const produced = RUNNER_TIMEOUT_BEFORE_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'refused', fallbackReason: 'timeout',
       engineCatalogEvidence: { status: 'inconclusive', reason: 'no_correlated_catalog' },
       turnContextDelivery: { status: 'timeout_before_delivery', measurement: null },
+      turnContextConfiguredCaps: { baseBytes: 65_536, semanticBytes: 32_768 },
     });
     expect(RUNNER_TIMEOUT_CONSUMERS.packetRows).toBe(60);
-    expect(RUNNER_TIMEOUT_CONSUMERS.registeredRows).toBe(30);
+    expect(RUNNER_TIMEOUT_CONSUMERS.historicalRegistrationError)
+      .toBe('Registered context caps mismatch at 1:1.');
     expect(RUNNER_TIMEOUT_CONSUMERS.observedViolations).toEqual([]);
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryPacketError).toContain('integrity evidence');
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryRegisteredError).toContain('integrity-indeterminate');

exec
/bin/bash -lc 'npx tsc -p tsconfig.node.json --noEmit' in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 28763ms:
diff --git a/tests/unit/tools/d569-v5.test.ts b/tests/unit/tools/d569-v5.test.ts
index 6ca4f57e9a6dd7b8fadfc8f90a03ef5a84f803b5..b8f6042e7527e0fd72e256428b086fa5407e63be
--- a/tests/unit/tools/d569-v5.test.ts
+++ b/tests/unit/tools/d569-v5.test.ts
@@ -451,7 +451,7 @@
 
 function evaluateRunnerTimeoutConsumers(): {
   readonly packetRows: number;
-  readonly registeredRows: number;
+  readonly historicalRegistrationError: string;
   readonly observedViolations: readonly string[];
   readonly contradictoryPacketError: string;
   readonly contradictoryRegisteredError: string;
@@ -472,7 +472,7 @@
   const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
     .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
   registeredRows[0] = produced;
-  const registeredCount = validateBrutal(raw(registeredRows)).length;
+  const historicalRegistrationError = capturedFailure(() => { validateBrutal(raw(registeredRows)); });
   const cell = CELLS.find((candidate) => candidate.basis === 'brutal' && candidate.seed === 6_203_001 && candidate.rep === 1);
   if (cell === undefined) throw new Error('Registered timeout cell is absent.');
   const boardImage = record(produced['boardImage']);
@@ -559,7 +559,7 @@
     }));
   return {
     packetRows: packetCount,
-    registeredRows: registeredCount,
+    historicalRegistrationError,
     observedViolations,
     contradictoryPacketError: capturedFailure(() => { pairedDocuments(contradictoryPacketRows); }),
     contradictoryRegisteredError: capturedFailure(() => { validateBrutal(raw(contradictoryRegisteredRows)); }),
@@ -583,6 +583,8 @@
     expect(MANIFEST.version).toBe('d569-blind-experiment-v5');
     expect(MANIFEST.secondFamily.manifestPath).toBe(D569_SECOND_FAMILY_MANIFEST_PATH);
     expect(secondFamily.version).toBe('d569-second-family-manifest-v1');
+    expect(MANIFEST.caps.semanticBytes).toBe(8_192);
+    expect(new Set(CELLS.map((cell) => cell.semanticContextCapBytes))).toEqual(new Set([8_192]));
   });
 
   it('validates a mixed 27-historical/3-current hard grid without rewriting retained bytes', () => {
@@ -662,7 +664,7 @@
     expect(validateBrutal(cancelled)).toHaveLength(30);
   });
 
-  it('carries one finalized semantic delivery object through runner cancellation, packet decoding, and registered validation', () => {
+  it('rejects a live-runner cancellation row under the historical v5 semantic cap', () => {
     const produced = RUNNER_CANCELLATION_AFTER_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'infrastructure_failed', fallbackReason: 'dispatch_cancelled',
@@ -676,26 +678,31 @@
     expect(Number(produced['semanticBoardBytes'])).toBeGreaterThan(0);
     const failure = record(produced['failingDispatch']);
     expect(failure['turnContextDelivery']).toEqual(produced['turnContextDelivery']);
+    expect(produced['turnContextConfiguredCaps']).toEqual({ baseBytes: 65_536, semanticBytes: 32_768 });
     const packetRows: object[] = CELLS.filter((cell) => cell.basis === 'brutal')
       .map((cell) => current(cell, 'authorized'));
     packetRows[0] = produced;
-    expect(pairedDocuments(packetRows).packet).toHaveLength(60);
+    expect(() => pairedDocuments(packetRows))
+      .toThrow('turnContextBudget.configuredSemanticBytes is invalid: Invalid input: expected 8192.');
 
     const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
       .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
     registeredRows[0] = produced;
-    expect(validateBrutal(raw(registeredRows))).toHaveLength(30);
+    expect(() => validateBrutal(raw(registeredRows)))
+      .toThrow('Registered context caps mismatch at 1:1.');
   });
 
-  it('carries a runner timeout with an ordinary incomplete catalog through packet and registered observation validation', () => {
+  it('rejects a live-runner timeout row under the historical v5 semantic cap', () => {
     const produced = RUNNER_TIMEOUT_BEFORE_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'refused', fallbackReason: 'timeout',
       engineCatalogEvidence: { status: 'inconclusive', reason: 'no_correlated_catalog' },
       turnContextDelivery: { status: 'timeout_before_delivery', measurement: null },
+      turnContextConfiguredCaps: { baseBytes: 65_536, semanticBytes: 32_768 },
     });
     expect(RUNNER_TIMEOUT_CONSUMERS.packetRows).toBe(60);
-    expect(RUNNER_TIMEOUT_CONSUMERS.registeredRows).toBe(30);
+    expect(RUNNER_TIMEOUT_CONSUMERS.historicalRegistrationError)
+      .toBe('Registered context caps mismatch at 1:1.');
     expect(RUNNER_TIMEOUT_CONSUMERS.observedViolations).toEqual([]);
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryPacketError).toContain('integrity evidence');
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryRegisteredError).toContain('integrity-indeterminate');

exec
/bin/bash -lc "git diff --check
git status --short
git diff --exit-code -- tests/fixtures/d569-second-family-manifest.json tests/fixtures/d569-blind-experiment-manifest.json tests/fixtures/arena-basis-brutal tests/fixtures/arena-basis-brutal-b tests/fixtures/arena-basis-brutal-2 tests/fixtures/arena-basis-hard-2
git diff --unified=0 | awk '/"'^'"\\+\\+\\+/{next} /"'^'"\\+/{line=substr("'$0,2); if (length(line)>120) print length(line) ":" line}'"'
git diff --stat" in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 0ms:
 M tests/unit/tools/d569-second-family-manifest.test.ts
 M tests/unit/tools/d569-v5.test.ts
 M tools/d569-second-family-manifest.ts
 .../unit/tools/d569-second-family-manifest.test.ts | 87 ++++++++++++++++++++-
 tests/unit/tools/d569-v5.test.ts                   | 35 +++++++--
 tools/d569-second-family-manifest.ts               | 90 +++++++++++++++++++---
 3 files changed, 191 insertions(+), 21 deletions(-)

diff --git a/tests/unit/tools/d569-v5.test.ts b/tests/unit/tools/d569-v5.test.ts
index 6ca4f57e9a6dd7b8fadfc8f90a03ef5a84f803b5..b8f6042e7527e0fd72e256428b086fa5407e63be
--- a/tests/unit/tools/d569-v5.test.ts
+++ b/tests/unit/tools/d569-v5.test.ts
@@ -451,7 +451,7 @@
 
 function evaluateRunnerTimeoutConsumers(): {
   readonly packetRows: number;
-  readonly registeredRows: number;
+  readonly historicalRegistrationError: string;
   readonly observedViolations: readonly string[];
   readonly contradictoryPacketError: string;
   readonly contradictoryRegisteredError: string;
@@ -472,7 +472,7 @@
   const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
     .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
   registeredRows[0] = produced;
-  const registeredCount = validateBrutal(raw(registeredRows)).length;
+  const historicalRegistrationError = capturedFailure(() => { validateBrutal(raw(registeredRows)); });
   const cell = CELLS.find((candidate) => candidate.basis === 'brutal' && candidate.seed === 6_203_001 && candidate.rep === 1);
   if (cell === undefined) throw new Error('Registered timeout cell is absent.');
   const boardImage = record(produced['boardImage']);
@@ -559,7 +559,7 @@
     }));
   return {
     packetRows: packetCount,
-    registeredRows: registeredCount,
+    historicalRegistrationError,
     observedViolations,
     contradictoryPacketError: capturedFailure(() => { pairedDocuments(contradictoryPacketRows); }),
     contradictoryRegisteredError: capturedFailure(() => { validateBrutal(raw(contradictoryRegisteredRows)); }),
@@ -583,6 +583,8 @@
     expect(MANIFEST.version).toBe('d569-blind-experiment-v5');
     expect(MANIFEST.secondFamily.manifestPath).toBe(D569_SECOND_FAMILY_MANIFEST_PATH);
     expect(secondFamily.version).toBe('d569-second-family-manifest-v1');
+    expect(MANIFEST.caps.semanticBytes).toBe(8_192);
+    expect(new Set(CELLS.map((cell) => cell.semanticContextCapBytes))).toEqual(new Set([8_192]));
   });
 
   it('validates a mixed 27-historical/3-current hard grid without rewriting retained bytes', () => {
@@ -662,7 +664,7 @@
     expect(validateBrutal(cancelled)).toHaveLength(30);
   });
 
-  it('carries one finalized semantic delivery object through runner cancellation, packet decoding, and registered validation', () => {
+  it('rejects a live-runner cancellation row under the historical v5 semantic cap', () => {
     const produced = RUNNER_CANCELLATION_AFTER_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'infrastructure_failed', fallbackReason: 'dispatch_cancelled',
@@ -676,26 +678,31 @@
     expect(Number(produced['semanticBoardBytes'])).toBeGreaterThan(0);
     const failure = record(produced['failingDispatch']);
     expect(failure['turnContextDelivery']).toEqual(produced['turnContextDelivery']);
+    expect(produced['turnContextConfiguredCaps']).toEqual({ baseBytes: 65_536, semanticBytes: 32_768 });
     const packetRows: object[] = CELLS.filter((cell) => cell.basis === 'brutal')
       .map((cell) => current(cell, 'authorized'));
     packetRows[0] = produced;
-    expect(pairedDocuments(packetRows).packet).toHaveLength(60);
+    expect(() => pairedDocuments(packetRows))
+      .toThrow('turnContextBudget.configuredSemanticBytes is invalid: Invalid input: expected 8192.');
 
     const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
       .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
     registeredRows[0] = produced;
-    expect(validateBrutal(raw(registeredRows))).toHaveLength(30);
+    expect(() => validateBrutal(raw(registeredRows)))
+      .toThrow('Registered context caps mismatch at 1:1.');
   });
 
-  it('carries a runner timeout with an ordinary incomplete catalog through packet and registered observation validation', () => {
+  it('rejects a live-runner timeout row under the historical v5 semantic cap', () => {
     const produced = RUNNER_TIMEOUT_BEFORE_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'refused', fallbackReason: 'timeout',
       engineCatalogEvidence: { status: 'inconclusive', reason: 'no_correlated_catalog' },
       turnContextDelivery: { status: 'timeout_before_delivery', measurement: null },
+      turnContextConfiguredCaps: { baseBytes: 65_536, semanticBytes: 32_768 },
     });
     expect(RUNNER_TIMEOUT_CONSUMERS.packetRows).toBe(60);
-    expect(RUNNER_TIMEOUT_CONSUMERS.registeredRows).toBe(30);
+    expect(RUNNER_TIMEOUT_CONSUMERS.historicalRegistrationError)
+      .toBe('Registered context caps mismatch at 1:1.');
     expect(RUNNER_TIMEOUT_CONSUMERS.observedViolations).toEqual([]);
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryPacketError).toContain('integrity evidence');
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryRegisteredError).toContain('integrity-indeterminate');

exec
/bin/bash -lc "git diff -- tests/unit/tools/d569-v5.test.ts
git diff -- tools/d569-second-family-manifest.ts tests/unit/tools/d569-second-family-manifest.test.ts | sed -n '1,520p'" in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 0ms:
diff --git a/tests/unit/tools/d569-v5.test.ts b/tests/unit/tools/d569-v5.test.ts
index b20498b8..b8f6042e 100644
--- a/tests/unit/tools/d569-v5.test.ts
+++ b/tests/unit/tools/d569-v5.test.ts
@@ -43,6 +43,7 @@ import {
 } from '../../../tools/d569-v5/validate-first-arm';
 import {
   D569_EXPERIMENT_MANIFEST_PATH,
+  D569_SECOND_FAMILY_MANIFEST_PATH,
   dryRunD569Experiment,
   validateD569ObservedRows,
   type D569DryRunCell,
@@ -450,7 +451,7 @@ function classifiedInvalidCatalogForConsumer(
 
 function evaluateRunnerTimeoutConsumers(): {
   readonly packetRows: number;
-  readonly registeredRows: number;
+  readonly historicalRegistrationError: string;
   readonly observedViolations: readonly string[];
   readonly contradictoryPacketError: string;
   readonly contradictoryRegisteredError: string;
@@ -471,7 +472,7 @@ function evaluateRunnerTimeoutConsumers(): {
   const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
     .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
   registeredRows[0] = produced;
-  const registeredCount = validateBrutal(raw(registeredRows)).length;
+  const historicalRegistrationError = capturedFailure(() => { validateBrutal(raw(registeredRows)); });
   const cell = CELLS.find((candidate) => candidate.basis === 'brutal' && candidate.seed === 6_203_001 && candidate.rep === 1);
   if (cell === undefined) throw new Error('Registered timeout cell is absent.');
   const boardImage = record(produced['boardImage']);
@@ -558,7 +559,7 @@ function evaluateRunnerTimeoutConsumers(): {
     }));
   return {
     packetRows: packetCount,
-    registeredRows: registeredCount,
+    historicalRegistrationError,
     observedViolations,
     contradictoryPacketError: capturedFailure(() => { pairedDocuments(contradictoryPacketRows); }),
     contradictoryRegisteredError: capturedFailure(() => { validateBrutal(raw(contradictoryRegisteredRows)); }),
@@ -573,6 +574,19 @@ function evaluateRunnerTimeoutConsumers(): {
 const RUNNER_TIMEOUT_CONSUMERS = evaluateRunnerTimeoutConsumers();
 
 describe('D569 v5 replacement validation and paired analysis tools', () => {
+  it('resolves only the historical v5 experiment and v1 second-family manifests', () => {
+    const secondFamily = JSON.parse(readFileSync(D569_SECOND_FAMILY_MANIFEST_PATH, 'utf8')) as {
+      readonly version?: unknown;
+    };
+    expect(D569_EXPERIMENT_MANIFEST_PATH).toBe('tests/fixtures/d569-blind-experiment-manifest.json');
+    expect(D569_SECOND_FAMILY_MANIFEST_PATH).toBe('tests/fixtures/d569-second-family-manifest.json');
+    expect(MANIFEST.version).toBe('d569-blind-experiment-v5');
+    expect(MANIFEST.secondFamily.manifestPath).toBe(D569_SECOND_FAMILY_MANIFEST_PATH);
+    expect(secondFamily.version).toBe('d569-second-family-manifest-v1');
+    expect(MANIFEST.caps.semanticBytes).toBe(8_192);
+    expect(new Set(CELLS.map((cell) => cell.semanticContextCapBytes))).toEqual(new Set([8_192]));
+  });
+
   it('validates a mixed 27-historical/3-current hard grid without rewriting retained bytes', () => {
     const originalRows = Array.from({ length: 10 }, (_, roomIndex) => [1, 2, 3].map((rep) => historical(
       roomIndex + 1, rep,
@@ -650,7 +664,7 @@ describe('D569 v5 replacement validation and paired analysis tools', () => {
     expect(validateBrutal(cancelled)).toHaveLength(30);
   });
 
-  it('carries one finalized semantic delivery object through runner cancellation, packet decoding, and registered validation', () => {
+  it('rejects a live-runner cancellation row under the historical v5 semantic cap', () => {
     const produced = RUNNER_CANCELLATION_AFTER_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'infrastructure_failed', fallbackReason: 'dispatch_cancelled',
@@ -664,26 +678,31 @@ describe('D569 v5 replacement validation and paired analysis tools', () => {
     expect(Number(produced['semanticBoardBytes'])).toBeGreaterThan(0);
     const failure = record(produced['failingDispatch']);
     expect(failure['turnContextDelivery']).toEqual(produced['turnContextDelivery']);
+    expect(produced['turnContextConfiguredCaps']).toEqual({ baseBytes: 65_536, semanticBytes: 32_768 });
     const packetRows: object[] = CELLS.filter((cell) => cell.basis === 'brutal')
       .map((cell) => current(cell, 'authorized'));
     packetRows[0] = produced;
-    expect(pairedDocuments(packetRows).packet).toHaveLength(60);
+    expect(() => pairedDocuments(packetRows))
+      .toThrow('turnContextBudget.configuredSemanticBytes is invalid: Invalid input: expected 8192.');
 
     const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
       .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
     registeredRows[0] = produced;
-    expect(validateBrutal(raw(registeredRows))).toHaveLength(30);
+    expect(() => validateBrutal(raw(registeredRows)))
+      .toThrow('Registered context caps mismatch at 1:1.');
   });
 
-  it('carries a runner timeout with an ordinary incomplete catalog through packet and registered observation validation', () => {
+  it('rejects a live-runner timeout row under the historical v5 semantic cap', () => {
     const produced = RUNNER_TIMEOUT_BEFORE_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'refused', fallbackReason: 'timeout',
       engineCatalogEvidence: { status: 'inconclusive', reason: 'no_correlated_catalog' },
       turnContextDelivery: { status: 'timeout_before_delivery', measurement: null },
+      turnContextConfiguredCaps: { baseBytes: 65_536, semanticBytes: 32_768 },
     });
     expect(RUNNER_TIMEOUT_CONSUMERS.packetRows).toBe(60);
-    expect(RUNNER_TIMEOUT_CONSUMERS.registeredRows).toBe(30);
+    expect(RUNNER_TIMEOUT_CONSUMERS.historicalRegistrationError)
+      .toBe('Registered context caps mismatch at 1:1.');
     expect(RUNNER_TIMEOUT_CONSUMERS.observedViolations).toEqual([]);
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryPacketError).toContain('integrity evidence');
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryRegisteredError).toContain('integrity-indeterminate');
diff --git a/tests/unit/tools/d569-second-family-manifest.test.ts b/tests/unit/tools/d569-second-family-manifest.test.ts
index 2613089b..93df1172 100644
--- a/tests/unit/tools/d569-second-family-manifest.test.ts
+++ b/tests/unit/tools/d569-second-family-manifest.test.ts
@@ -55,6 +55,38 @@ function room(path: (typeof ALL_FIXTURE_PATHS)[number]): GeneratedRoom {
   return JSON.parse(inputs.fixtures.readText(path)) as GeneratedRoom;
 }
 
+function structuralDifferencePaths(left: unknown, right: unknown, path = '$'): readonly string[] {
+  if (Object.is(left, right)) return [];
+  if (Array.isArray(left) && Array.isArray(right)) {
+    const indexes = Array.from({ length: Math.max(left.length, right.length) }, (_, index) => index);
+    return indexes.flatMap((index) => structuralDifferencePaths(left[index], right[index], `${path}[${index}]`));
+  }
+  if (typeof left === 'object' && left !== null && typeof right === 'object' && right !== null) {
+    const leftRecord = left as Readonly<Record<string, unknown>>;
+    const rightRecord = right as Readonly<Record<string, unknown>>;
+    const keys = [...new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)])].sort();
+    return keys.flatMap((key) => {
+      if (!Object.hasOwn(leftRecord, key) || !Object.hasOwn(rightRecord, key)) return [`${path}.${key}`];
+      return structuralDifferencePaths(leftRecord[key], rightRecord[key], `${path}.${key}`);
+    });
+  }
+  return [path];
+}
+
+function replaceFixtureBytes(
+  candidate: D569SecondFamilyManifest,
+  path: string,
+  bytes: string,
+): D569SecondFamilyValidationAccess {
+  const entry = candidate.cohorts.flatMap((cohort) => cohort.fixtures)
+    .find((fixture) => fixture.path === path);
+  if (entry === undefined) throw new Error(`missing fixture entry ${path}`);
+  entry.sha256 = sha256(bytes);
+  return access({
+    readFixture: (fixturePath) => fixturePath === path ? bytes : access().readFixture(fixturePath),
+  });
+}
+
 function access(overrides: Partial<D569SecondFamilyValidationAccess> = {}): D569SecondFamilyValidationAccess {
   return {
     readFixture: (path) => {
@@ -75,6 +107,18 @@ function codes(
 }
 
 describe('D569 independent second-family manifest', () => {
+  it.each(ALL_FIXTURE_PATHS)(
+    '%s differs from its current canonical rebuild only at $.encounter.state.foggedCells',
+    (path) => {
+      const committed = JSON.parse(inputs.fixtures.readText(path)) as unknown;
+      const difficulty = path.includes('/arena-basis-hard-2/') ? 'hard' : 'brutal';
+      const seed = room(path).spec.seed;
+      const regenerated = JSON.parse(canonicalD569SecondFamilyRegeneration(seed, difficulty, 1)) as unknown;
+      expect(structuralDifferencePaths(committed, regenerated))
+        .toEqual(['$.encounter.state.foggedCells']);
+    },
+  );
+
   it('pins the amended exact contiguous ranges and verbatim independent ledger evidence', () => {
     const frozen = manifest();
     expect(D569_SECOND_FAMILY_SEEDS.hard).toEqual([
@@ -96,11 +140,12 @@ describe('D569 independent second-family manifest', () => {
   });
 
   it.each(BRUTAL_FIXTURE_PATHS)(
-    '%s satisfies budget, caster, terrain, and productive-offer invariants before its pin',
+    '%s retains historical integrity plus static budget, caster, and terrain invariants',
     (path) => {
       const frozen = room(path);
       expect(generatedRoomIntegrityViolations(frozen, inputs.fixtures.readText(path))).toEqual([]);
-      expect(brutalRoomMembershipViolations(frozen)).toEqual([]);
+      expect(brutalRoomMembershipViolations(frozen)
+        .filter((violation) => violation.code !== 'brutal_productivity')).toEqual([]);
     },
   );
 
@@ -185,4 +230,42 @@ describe('D569 independent second-family manifest', () => {
       },
     }))).toContain('independent_regeneration');
   });
+
+  it('legacy_projection_drops_all_state: retains any second committed state difference', () => {
+    const changed = structuredClone(manifest());
+    const targetPath = HARD_FIXTURE_PATHS[0];
+    const targetRoom = room(targetPath);
+    (targetRoom.encounter.state as { round: number }).round += 1;
+    const changedBytes = `${canonicalJson(targetRoom)}\n`;
+    const rejectionCodes = codes(changed, replaceFixtureBytes(changed, targetPath, changedBytes));
+    expect(rejectionCodes.filter((code) => code.endsWith('regeneration'))).toEqual([
+      'first_regeneration',
+      'independent_regeneration',
+    ]);
+  });
+
+  it('legacy_projection_requires_the_committed_legacy_key', () => {
+    const changed = structuredClone(manifest());
+    const targetPath = HARD_FIXTURE_PATHS[0];
+    const targetRoom = room(targetPath) as GeneratedRoom & {
+      encounter: { state: GeneratedRoom['encounter']['state'] & { foggedCells?: unknown } };
+    };
+    delete targetRoom.encounter.state.foggedCells;
+    const changedBytes = `${canonicalJson(targetRoom)}\n`;
+    expect(codes(changed, replaceFixtureBytes(changed, targetPath, changedBytes)))
+      .toContain('legacy_fogged_cells_missing');
+  });
+
+  it('new_v2_legacy_fogged_cells: rejects a rebound-hash v2 brutal fixture with the legacy key', () => {
+    const changed = structuredClone(manifest());
+    const targetPath = BRUTAL_FIXTURE_PATHS[0];
+    const targetRoom = room(targetPath) as GeneratedRoom & {
+      encounter: { state: GeneratedRoom['encounter']['state'] & { foggedCells: unknown } };
+    };
+    targetRoom.encounter.state.foggedCells = [{ column: 0, row: 0 }];
+    const changedBytes = `${canonicalJson(targetRoom)}\n`;
+    const changedAccess = replaceFixtureBytes(changed, targetPath, changedBytes);
+    const v2Candidate = { ...changed, version: 'd569-second-family-manifest-v2' };
+    expect(codes(v2Candidate, changedAccess)).toContain('unexpected_legacy_fogged_cells');
+  });
 });
diff --git a/tools/d569-second-family-manifest.ts b/tools/d569-second-family-manifest.ts
index 308a0095..a26ca872 100644
--- a/tools/d569-second-family-manifest.ts
+++ b/tools/d569-second-family-manifest.ts
@@ -43,8 +43,7 @@ export const D569_USED_SEED_NAMESPACES = [
   { label: '6208xxx', start: 6_208_000, end: 6_208_999 },
 ] as const;
 
-const manifestSchema = z.strictObject({
-  version: z.literal('d569-second-family-manifest-v1'),
+const manifestFields = {
   generator: z.strictObject({
     tool: z.literal('tools/generate-arena-basis.ts'),
     canonicalFormat: z.literal('canonical-json-with-trailing-newline'),
@@ -65,7 +64,18 @@ const manifestSchema = z.strictObject({
       sha256: z.string().regex(/^[a-f0-9]{64}$/u),
     })),
   })),
-});
+} as const;
+
+const manifestSchema = z.discriminatedUnion('version', [
+  z.strictObject({
+    version: z.literal('d569-second-family-manifest-v1'),
+    ...manifestFields,
+  }),
+  z.strictObject({
+    version: z.literal('d569-second-family-manifest-v2'),
+    ...manifestFields,
+  }),
+]);
 
 export type D569SecondFamilyManifest = z.infer<typeof manifestSchema>;
 export type D569SecondFamilyDifficulty = keyof typeof D569_SECOND_FAMILY_SEEDS;
@@ -283,8 +293,7 @@ function everyMonsterProductive(room: GeneratedRoom): boolean {
       }));
 }
 
-/** State-derived brutal membership; hashes and creature names alone cannot satisfy it. */
-export function brutalRoomMembershipViolations(
+function brutalRoomStaticMembershipViolations(
   room: GeneratedRoom,
   sameSeedHard: GeneratedRoom = generateRoom(room.spec.seed, { difficulty: 'hard' }),
 ): readonly D569SecondFamilyViolation[] {
@@ -323,6 +332,15 @@ export function brutalRoomMembershipViolations(
     'brutal_terrain',
     'brutal terrain must meet every configured minimum/count band and exceed hard density',
   );
+  return violations;
+}
+
+/** State-derived brutal membership; hashes and creature names alone cannot satisfy it. */
+export function brutalRoomMembershipViolations(
+  room: GeneratedRoom,
+  sameSeedHard: GeneratedRoom = generateRoom(room.spec.seed, { difficulty: 'hard' }),
+): readonly D569SecondFamilyViolation[] {
+  const violations = [...brutalRoomStaticMembershipViolations(room, sameSeedHard)];
   addViolation(
     violations,
     everyMonsterProductive(room),
@@ -342,6 +360,38 @@ function sameNamespace(
   return canonicalJson(actual) === canonicalJson(D569_USED_SEED_NAMESPACES);
 }
 
+function encounterStateRecord(input: unknown): Record<string, unknown> {
+  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
+    throw new TypeError('fixture root is not an object');
+  }
+  const encounter = (input as Record<string, unknown>)['encounter'];
+  if (typeof encounter !== 'object' || encounter === null || Array.isArray(encounter)) {
+    throw new TypeError('fixture encounter is not an object');
+  }
+  const state = (encounter as Record<string, unknown>)['state'];
+  if (typeof state !== 'object' || state === null || Array.isArray(state)) {
+    throw new TypeError('fixture encounter state is not an object');
+  }
+  return state as Record<string, unknown>;
+}
+
+function legacyCommittedProjection(
+  parsed: unknown,
+  seed: number,
+  violations: D569SecondFamilyViolation[],
+): string {
+  const state = encounterStateRecord(parsed);
+  const hasLegacyFoggedCells = Object.hasOwn(state, 'foggedCells');
+  addViolation(
+    violations,
+    hasLegacyFoggedCells,
+    'legacy_fogged_cells_missing',
+    `seed ${String(seed)} historical fixture omitted encounter.state.foggedCells`,
+  );
+  if (hasLegacyFoggedCells) delete state['foggedCells'];
+  return `${canonicalJson(parsed)}\n`;
+}
+
 /**
  * Validates the pins only after state membership and two independent canonical
  * regenerations. It is pure/model-free; callers provide repository bytes.
@@ -442,8 +492,22 @@ export function validateD569SecondFamilyManifest(
         `seed ${String(fixture.seed)} fixture hash changed`,
       );
 
+      let comparisonFixtureBytes = fixtureBytes;
       try {
-        const room = JSON.parse(fixtureBytes) as GeneratedRoom;
+        const parsed = JSON.parse(fixtureBytes) as unknown;
+        const room = parsed as GeneratedRoom;
+        const usesLegacyProjection = manifest.version === 'd569-second-family-manifest-v1' ||
+          difficulty === 'hard';
+        if (usesLegacyProjection) {
+          comparisonFixtureBytes = legacyCommittedProjection(parsed, fixture.seed, violations);
+        } else {
+          addViolation(
+            violations,
+            !Object.hasOwn(encounterStateRecord(parsed), 'foggedCells'),
+            'unexpected_legacy_fogged_cells',
+            `seed ${String(fixture.seed)} new v2 brutal fixture contains encounter.state.foggedCells`,
+          );
+        }
         addViolation(
           violations,
           room.spec.seed === fixture.seed,
@@ -451,9 +515,13 @@ export function validateD569SecondFamilyManifest(
           `seed ${String(fixture.seed)} fixture contains a different seed`,
         );
         violations.push(...generatedRoomIntegrityViolations(room, fixtureBytes));
-        violations.push(...(difficulty === 'hard'
-          ? hardRoomMembershipViolations(room)
-          : brutalRoomMembershipViolations(room)));
+        if (difficulty === 'hard') {
+          violations.push(...hardRoomMembershipViolations(room));
+        } else if (manifest.version === 'd569-second-family-manifest-v1') {
+          violations.push(...brutalRoomStaticMembershipViolations(room));
+        } else {
+          violations.push(...brutalRoomMembershipViolations(room));
+        }
       } catch (error) {
         violations.push({
           code: 'fixture_parse',
@@ -465,13 +533,13 @@ export function validateD569SecondFamilyManifest(
       const secondGeneration = access.regenerate(fixture.seed, difficulty, 2);
       addViolation(
         violations,
-        firstGeneration === fixtureBytes,
+        firstGeneration === comparisonFixtureBytes,
         'first_regeneration',
         `seed ${String(fixture.seed)} first canonical regeneration differs from the fixture`,
       );
       addViolation(
         violations,
-        secondGeneration === firstGeneration && secondGeneration === fixtureBytes,
+        secondGeneration === firstGeneration && secondGeneration === comparisonFixtureBytes,
         'independent_regeneration',
         `seed ${String(fixture.seed)} independent canonical regeneration differs`,
       );

diff --git a/tests/unit/tools/d569-v5.test.ts b/tests/unit/tools/d569-v5.test.ts
index 6ca4f57e9a6dd7b8fadfc8f90a03ef5a84f803b5..b8f6042e7527e0fd72e256428b086fa5407e63be
--- a/tests/unit/tools/d569-v5.test.ts
+++ b/tests/unit/tools/d569-v5.test.ts
@@ -451,7 +451,7 @@
 
 function evaluateRunnerTimeoutConsumers(): {
   readonly packetRows: number;
-  readonly registeredRows: number;
+  readonly historicalRegistrationError: string;
   readonly observedViolations: readonly string[];
   readonly contradictoryPacketError: string;
   readonly contradictoryRegisteredError: string;
@@ -472,7 +472,7 @@
   const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
     .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
   registeredRows[0] = produced;
-  const registeredCount = validateBrutal(raw(registeredRows)).length;
+  const historicalRegistrationError = capturedFailure(() => { validateBrutal(raw(registeredRows)); });
   const cell = CELLS.find((candidate) => candidate.basis === 'brutal' && candidate.seed === 6_203_001 && candidate.rep === 1);
   if (cell === undefined) throw new Error('Registered timeout cell is absent.');
   const boardImage = record(produced['boardImage']);
@@ -559,7 +559,7 @@
     }));
   return {
     packetRows: packetCount,
-    registeredRows: registeredCount,
+    historicalRegistrationError,
     observedViolations,
     contradictoryPacketError: capturedFailure(() => { pairedDocuments(contradictoryPacketRows); }),
     contradictoryRegisteredError: capturedFailure(() => { validateBrutal(raw(contradictoryRegisteredRows)); }),
@@ -583,6 +583,8 @@
     expect(MANIFEST.version).toBe('d569-blind-experiment-v5');
     expect(MANIFEST.secondFamily.manifestPath).toBe(D569_SECOND_FAMILY_MANIFEST_PATH);
     expect(secondFamily.version).toBe('d569-second-family-manifest-v1');
+    expect(MANIFEST.caps.semanticBytes).toBe(8_192);
+    expect(new Set(CELLS.map((cell) => cell.semanticContextCapBytes))).toEqual(new Set([8_192]));
   });
 
   it('validates a mixed 27-historical/3-current hard grid without rewriting retained bytes', () => {
@@ -662,7 +664,7 @@
     expect(validateBrutal(cancelled)).toHaveLength(30);
   });
 
-  it('carries one finalized semantic delivery object through runner cancellation, packet decoding, and registered validation', () => {
+  it('rejects a live-runner cancellation row under the historical v5 semantic cap', () => {
     const produced = RUNNER_CANCELLATION_AFTER_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'infrastructure_failed', fallbackReason: 'dispatch_cancelled',
@@ -676,26 +678,31 @@
     expect(Number(produced['semanticBoardBytes'])).toBeGreaterThan(0);
     const failure = record(produced['failingDispatch']);
     expect(failure['turnContextDelivery']).toEqual(produced['turnContextDelivery']);
+    expect(produced['turnContextConfiguredCaps']).toEqual({ baseBytes: 65_536, semanticBytes: 32_768 });
     const packetRows: object[] = CELLS.filter((cell) => cell.basis === 'brutal')
       .map((cell) => current(cell, 'authorized'));
     packetRows[0] = produced;
-    expect(pairedDocuments(packetRows).packet).toHaveLength(60);
+    expect(() => pairedDocuments(packetRows))
+      .toThrow('turnContextBudget.configuredSemanticBytes is invalid: Invalid input: expected 8192.');
 
     const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
       .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
     registeredRows[0] = produced;
-    expect(validateBrutal(raw(registeredRows))).toHaveLength(30);
+    expect(() => validateBrutal(raw(registeredRows)))
+      .toThrow('Registered context caps mismatch at 1:1.');
   });
 
-  it('carries a runner timeout with an ordinary incomplete catalog through packet and registered observation validation', () => {
+  it('rejects a live-runner timeout row under the historical v5 semantic cap', () => {
     const produced = RUNNER_TIMEOUT_BEFORE_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'refused', fallbackReason: 'timeout',
       engineCatalogEvidence: { status: 'inconclusive', reason: 'no_correlated_catalog' },
       turnContextDelivery: { status: 'timeout_before_delivery', measurement: null },
+      turnContextConfiguredCaps: { baseBytes: 65_536, semanticBytes: 32_768 },
     });
     expect(RUNNER_TIMEOUT_CONSUMERS.packetRows).toBe(60);
-    expect(RUNNER_TIMEOUT_CONSUMERS.registeredRows).toBe(30);
+    expect(RUNNER_TIMEOUT_CONSUMERS.historicalRegistrationError)
+      .toBe('Registered context caps mismatch at 1:1.');
     expect(RUNNER_TIMEOUT_CONSUMERS.observedViolations).toEqual([]);
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryPacketError).toContain('integrity evidence');
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryRegisteredError).toContain('integrity-indeterminate');

codex
Batch 1 Fix R1 is complete.

Changed only the three allowed files:

- [d569-second-family-manifest.ts](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tools/d569-second-family-manifest.ts)
- [d569-second-family-manifest.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/tools/d569-second-family-manifest.test.ts)
- [d569-v5.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/tools/d569-v5.test.ts)

Implemented:

- Strict v1/v2 second-family schema.
- Raw fixture hashes checked before projection.
- Historical projection removes only the committed own `$.encounter.state.foggedCells`.
- Generated bytes remain untouched.
- V1 brutal fixtures retain static checks but no frozen productivity recertification.
- V2 brutal fixtures retain full productivity checks and reject legacy fog keys.
- All 20 fixtures demonstrate exactly one structural difference: `$.encounter.state.foggedCells`.
- Historical v5 paths, versions, manifest hashes, and synthesized rows remain pinned.
- v5 cells remain at the manifest-declared 8,192-byte semantic cap.
- Live 32,768-byte timeout rows are rejected exactly with `Registered context caps mismatch at 1:1.`
- Live delivered cancellation rows are rejected by both the historical packet schema and registered validation.

Test results:

- Second-family: `50/50 passed`.
- D569 v5: `27/27 passed`.
- D569 blind experiment: `46 passed / 6 expected frozen-family failures`.

Expected blind-experiment reds:

1. `validates the exact v5 Opus 4.8 arms and notes-only Fable Astra Sol panel amendment`
2. `dry-runs versioned Opus 4.8 cells without accepting historical Opus 5 rows`
3. `adds exactly 180 separately labeled advice-assisted hint cells, 660 total`
4. `consumes the frozen second encounter family for all 480 core cells`
5. `records exact model effort cli and cliVersion for every observed row`
6. `rejects either decisive integrity field alone while preserving rows with neither field`

All six arise because that historical test helper deliberately returns committed legacy fixture bytes as both regenerations, leaving exactly 40 expected regeneration violations.

Verification:

- Frozen plan: SHA-256 `4bff2145b445cbb96771333bfdceb5cfdae8781e494cfa48622619cae0a2ac69`, 403 lines.
- `npx tsc -p tsconfig.app.json --noEmit`: exit 0.
- `npx tsc -p tsconfig.node.json --noEmit`: exit 0.
- `git diff --check`: exit 0, empty.
- Added lines over 120 columns: 0.
- Expanded V-freeze before/after, including `hard-2`: exit 0/0.
- No frozen fixture or manifest bytes changed.
- `git status --short`: exactly the three allowed files above.

The production v5/v6 schema seam in `tools/d569-blind-experiment.ts` remains for Batch 6 because that file is outside Batch 1’s allowlist. Batch 1 pins the required v5 half; Batch 6 must add v6’s 32,768 declaration and reject 8,192-byte v6 rows.

COHORT-01 B1 FIX R1 DONE
diff --git a/tests/unit/tools/d569-v5.test.ts b/tests/unit/tools/d569-v5.test.ts
index 6ca4f57e9a6dd7b8fadfc8f90a03ef5a84f803b5..b8f6042e7527e0fd72e256428b086fa5407e63be
--- a/tests/unit/tools/d569-v5.test.ts
+++ b/tests/unit/tools/d569-v5.test.ts
@@ -451,7 +451,7 @@
 
 function evaluateRunnerTimeoutConsumers(): {
   readonly packetRows: number;
-  readonly registeredRows: number;
+  readonly historicalRegistrationError: string;
   readonly observedViolations: readonly string[];
   readonly contradictoryPacketError: string;
   readonly contradictoryRegisteredError: string;
@@ -472,7 +472,7 @@
   const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
     .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
   registeredRows[0] = produced;
-  const registeredCount = validateBrutal(raw(registeredRows)).length;
+  const historicalRegistrationError = capturedFailure(() => { validateBrutal(raw(registeredRows)); });
   const cell = CELLS.find((candidate) => candidate.basis === 'brutal' && candidate.seed === 6_203_001 && candidate.rep === 1);
   if (cell === undefined) throw new Error('Registered timeout cell is absent.');
   const boardImage = record(produced['boardImage']);
@@ -559,7 +559,7 @@
     }));
   return {
     packetRows: packetCount,
-    registeredRows: registeredCount,
+    historicalRegistrationError,
     observedViolations,
     contradictoryPacketError: capturedFailure(() => { pairedDocuments(contradictoryPacketRows); }),
     contradictoryRegisteredError: capturedFailure(() => { validateBrutal(raw(contradictoryRegisteredRows)); }),
@@ -583,6 +583,8 @@
     expect(MANIFEST.version).toBe('d569-blind-experiment-v5');
     expect(MANIFEST.secondFamily.manifestPath).toBe(D569_SECOND_FAMILY_MANIFEST_PATH);
     expect(secondFamily.version).toBe('d569-second-family-manifest-v1');
+    expect(MANIFEST.caps.semanticBytes).toBe(8_192);
+    expect(new Set(CELLS.map((cell) => cell.semanticContextCapBytes))).toEqual(new Set([8_192]));
   });
 
   it('validates a mixed 27-historical/3-current hard grid without rewriting retained bytes', () => {
@@ -662,7 +664,7 @@
     expect(validateBrutal(cancelled)).toHaveLength(30);
   });
 
-  it('carries one finalized semantic delivery object through runner cancellation, packet decoding, and registered validation', () => {
+  it('rejects a live-runner cancellation row under the historical v5 semantic cap', () => {
     const produced = RUNNER_CANCELLATION_AFTER_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'infrastructure_failed', fallbackReason: 'dispatch_cancelled',
@@ -676,26 +678,31 @@
     expect(Number(produced['semanticBoardBytes'])).toBeGreaterThan(0);
     const failure = record(produced['failingDispatch']);
     expect(failure['turnContextDelivery']).toEqual(produced['turnContextDelivery']);
+    expect(produced['turnContextConfiguredCaps']).toEqual({ baseBytes: 65_536, semanticBytes: 32_768 });
     const packetRows: object[] = CELLS.filter((cell) => cell.basis === 'brutal')
       .map((cell) => current(cell, 'authorized'));
     packetRows[0] = produced;
-    expect(pairedDocuments(packetRows).packet).toHaveLength(60);
+    expect(() => pairedDocuments(packetRows))
+      .toThrow('turnContextBudget.configuredSemanticBytes is invalid: Invalid input: expected 8192.');
 
     const registeredRows = BRUTAL_SOURCE.trimEnd().split('\n')
       .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
     registeredRows[0] = produced;
-    expect(validateBrutal(raw(registeredRows))).toHaveLength(30);
+    expect(() => validateBrutal(raw(registeredRows)))
+      .toThrow('Registered context caps mismatch at 1:1.');
   });
 
-  it('carries a runner timeout with an ordinary incomplete catalog through packet and registered observation validation', () => {
+  it('rejects a live-runner timeout row under the historical v5 semantic cap', () => {
     const produced = RUNNER_TIMEOUT_BEFORE_DELIVERY_ROW;
     expect(produced).toMatchObject({
       outcome: 'refused', fallbackReason: 'timeout',
       engineCatalogEvidence: { status: 'inconclusive', reason: 'no_correlated_catalog' },
       turnContextDelivery: { status: 'timeout_before_delivery', measurement: null },
+      turnContextConfiguredCaps: { baseBytes: 65_536, semanticBytes: 32_768 },
     });
     expect(RUNNER_TIMEOUT_CONSUMERS.packetRows).toBe(60);
-    expect(RUNNER_TIMEOUT_CONSUMERS.registeredRows).toBe(30);
+    expect(RUNNER_TIMEOUT_CONSUMERS.historicalRegistrationError)
+      .toBe('Registered context caps mismatch at 1:1.');
     expect(RUNNER_TIMEOUT_CONSUMERS.observedViolations).toEqual([]);
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryPacketError).toContain('integrity evidence');
     expect(RUNNER_TIMEOUT_CONSUMERS.contradictoryRegisteredError).toContain('integrity-indeterminate');

tokens used
181,713
Batch 1 Fix R1 is complete.

Changed only the three allowed files:

- [d569-second-family-manifest.ts](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tools/d569-second-family-manifest.ts)
- [d569-second-family-manifest.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/tools/d569-second-family-manifest.test.ts)
- [d569-v5.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/tools/d569-v5.test.ts)

Implemented:

- Strict v1/v2 second-family schema.
- Raw fixture hashes checked before projection.
- Historical projection removes only the committed own `$.encounter.state.foggedCells`.
- Generated bytes remain untouched.
- V1 brutal fixtures retain static checks but no frozen productivity recertification.
- V2 brutal fixtures retain full productivity checks and reject legacy fog keys.
- All 20 fixtures demonstrate exactly one structural difference: `$.encounter.state.foggedCells`.
- Historical v5 paths, versions, manifest hashes, and synthesized rows remain pinned.
- v5 cells remain at the manifest-declared 8,192-byte semantic cap.
- Live 32,768-byte timeout rows are rejected exactly with `Registered context caps mismatch at 1:1.`
- Live delivered cancellation rows are rejected by both the historical packet schema and registered validation.

Test results:

- Second-family: `50/50 passed`.
- D569 v5: `27/27 passed`.
- D569 blind experiment: `46 passed / 6 expected frozen-family failures`.

Expected blind-experiment reds:

1. `validates the exact v5 Opus 4.8 arms and notes-only Fable Astra Sol panel amendment`
2. `dry-runs versioned Opus 4.8 cells without accepting historical Opus 5 rows`
3. `adds exactly 180 separately labeled advice-assisted hint cells, 660 total`
4. `consumes the frozen second encounter family for all 480 core cells`
5. `records exact model effort cli and cliVersion for every observed row`
6. `rejects either decisive integrity field alone while preserving rows with neither field`

All six arise because that historical test helper deliberately returns committed legacy fixture bytes as both regenerations, leaving exactly 40 expected regeneration violations.

Verification:

- Frozen plan: SHA-256 `4bff2145b445cbb96771333bfdceb5cfdae8781e494cfa48622619cae0a2ac69`, 403 lines.
- `npx tsc -p tsconfig.app.json --noEmit`: exit 0.
- `npx tsc -p tsconfig.node.json --noEmit`: exit 0.
- `git diff --check`: exit 0, empty.
- Added lines over 120 columns: 0.
- Expanded V-freeze before/after, including `hard-2`: exit 0/0.
- No frozen fixture or manifest bytes changed.
- `git status --short`: exactly the three allowed files above.

The production v5/v6 schema seam in `tools/d569-blind-experiment.ts` remains for Batch 6 because that file is outside Batch 1’s allowlist. Batch 1 pins the required v5 half; Batch 6 must add v6’s 32,768 declaration and reject 8,192-byte v6 rows.

COHORT-01 B1 FIX R1 DONE
