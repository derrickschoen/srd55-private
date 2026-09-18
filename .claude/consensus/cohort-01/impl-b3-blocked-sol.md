
OpenAI Codex v0.154.0
--------
workdir: /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
model: gpt-5.6-sol
provider: openai
approval: never
sandbox: workspace-write [workdir, /tmp, $TMPDIR] (network access enabled)
reasoning effort: high
reasoning summaries: none
session id: 01a0b2c0-9c8d-76e2-8e58-bc312941e449
--------
user
COMMON RULES (binding, restated in full): You are the IMPLEMENTER (gpt-5.6-sol, high, FRESH session) for VIS-FIELD-01 batch group COHORT-01, Batch 3 ONLY. Worktree /home/vagrant/PhpstormProjects/dnd-wt-cohort-01 (branch claude/cohort-01 at bea24cbe = B1 + B2 (both ACCEPTED) merged with claude/vis-field at b94dd732 = WALL-01 ACCEPTED (D635 seam + D642 sealed corners + D657 endpoint junctions); clean; node_modules symlinked). Sandbox workspace-write in that worktree ONLY (+ /tmp). No git write commands (the supervisor commits). No edits under .claude/** or docs/**. Do NOT invoke claude, `claude -p`, any reviewer session, any consensus workflow or any other agent; skills under ~/.codex do NOT apply. No Playwright, no full vitest, no npm run build; never port 4173. Model calls WILL fail. NEVER regenerate an expectation from our own output beyond what the plan's D569 ledger authorizes (hashes pinned ONLY after membership is proven from decoded state and two generations agree byte-for-byte); never delete or weaken a test; NO byte of tests/fixtures/d569-second-family-manifest.json, d569-blind-experiment-manifest.json, arena-basis-brutal*, -brutal-b, -brutal-2, -hard-2 may change (V-freeze before/after); never --terrain-profile, never a D466 override, never a hand edit of generated JSON; if ANY room of the ten fails membership, reject ALL ten seeds of that range, record it, audit the next unused contiguous namespace per the plan's replacement procedure, and STOP — report BLOCKED so the supervisor amends the Allowed files (do not pick a new range yourself). Report exact commands and numbers; end with the named marker. The MAIN repo's .claude/decisions.md (D643, D649–D661) is readable.

THE PLAN (binding, FROZEN): .tmp-plans/2026-09-17-cohort-01-plan.md in your worktree — sha256 4bff2145b445cbb96771333bfdceb5cfdae8781e494cfa48622619cae0a2ac69, 403 lines incl. N1/N2 (verify first; STOP if it differs). Implement EXACTLY "### Batch 3 — generate primary brutal-v2 (6209001-6209010)": the pre-generation gates the plan names (WALL-01 accepted = yes; generatedLineIsOpen at src/vtt/room-generator.ts:1227 still `tier === 'none' && !blocksSight` — confirm), the verbatim namespace evidence for 6209xxx (plain / underscore / xxx forms against the MAIN decisions file /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md, tests/fixtures and tools — record the exact commands, their output and exit statuses; classify D643/D645/D650 reservations as reservations), TWO generations into two temp directories with the plan's exact tool invocation (tools/generate-arena-basis.ts, --difficulty brutal --seed 6209001 --rooms 10, no terrain profile), `diff -rq` between them, decoded-state membership through the SAME predicates the v2 suite uses (integrity, structural brutal membership, the productivity contract with sight-clear non-total offensive traces — PLAN-F6), and ONLY THEN copy into tests/fixtures/arena-basis-brutal-v2/ and compute the ten SHA-256 values (sha256sum AND an independent openssl dgst) and pin them where the plan says for Batch 3 (the v2 suite's 6209 rows). The 6210/6211 rows stay RED (Batches 4–5). Anything the plan's Batch 3 lists that I have not repeated here still binds.

VERIFICATION: the batch's T/V exactly as the plan states; npx tsc -p tsconfig.app.json --noEmit; npx tsc -p tsconfig.node.json --noEmit; git diff --check; no line > 120; the v2 suite (10 × 6209 green, 20 red ENOENT), room-generator, brutal-b, second-family; V-freeze before/after; git status --short = the ten new fixtures + the Batch 3 Allowed files only. OUTPUT: report (namespace evidence verbatim, generation A/B diff result, per-seed membership table, hashes with both tools, witnesses, remaining reds by title), then "COHORT-01 B3 DONE" (or BLOCKED).

codex
I’ll execute Batch 3 only, beginning with the frozen-plan hash and the named pre-generation gates. I’ll stop immediately if the plan or any all-or-nothing membership condition fails.
exec
/bin/bash -lc 'sha256sum .tmp-plans/2026-09-17-cohort-01-plan.md && wc -l .tmp-plans/2026-09-17-cohort-01-plan.md' in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 0ms:
4bff2145b445cbb96771333bfdceb5cfdae8781e494cfa48622619cae0a2ac69  .tmp-plans/2026-09-17-cohort-01-plan.md
403 .tmp-plans/2026-09-17-cohort-01-plan.md

exec
/bin/bash -lc "sed -n '1,403p' .tmp-plans/2026-09-17-cohort-01-plan.md" in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 0ms:
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
The plan matches the required SHA-256 and 403-line length. I’ve also noted the Batch 3 instruction difference: the frozen plan says “do not compute hashes yet,” while your later Batch 3 directive explicitly requires computing and pinning the 6209 hashes; I’m following the later, more specific directive and will restrict any test edit to those 6209 hash rows.
exec
/bin/bash -lc "git status --short && git rev-parse --short HEAD && git log -5 --oneline && sed -n '1224,1232p' src/vtt/room-generator.ts && find tests/fixtures/d569-second-family-manifest.json tests/fixtures/d569-blind-experiment-manifest.json tests/fixtures/arena-basis-brutal tests/fixtures/arena-basis-brutal-b tests/fixtures/arena-basis-brutal-2 -type f -print0 | sort -z | xargs -0 sha256sum" in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 0ms:
bea24cbe
bea24cbe Merge claude/vis-field (WALL-01 accepted: b94dd732) into claude/cohort-01
b94dd732 VIS-FIELD WALL-01 r5: endpoint junctions — a corner ray that starts or ends on a vertex shared by two diagonally touching sight-blocking cells is clear only toward its own cell's closed quadrant
e4c56954 COHORT-01 B2 fix r1: the frozen 6203 family keeps its static membership contract, filtering only the retired productivity kind
8284a91c COHORT-01 B2: RED membership witnesses for the three v2 brutal cohorts; the frozen families' productivity assertions retire to them
bc6422bf VIS-FIELD WALL-01 r3: scene consequences of sealed corners — two-room snapshot normalized under D569, three test scenes re-authored to keep their subjects
  });
}

export function generatedLineIsOpen(
  trace: Pick<TerrainLineTrace, 'tier' | 'blocksSight'>,
): boolean {
  return trace.tier === 'none' && !trace.blocksSight;
}

6847b5d44b2577aa31a87a2eb83220ca17f54f8a8b160741d61d47019c75e51c  tests/fixtures/arena-basis-brutal-2/seed-6207001.json
9b1b9be44245659fb1a95922c685bbb1f9082b3f0fa591bd822553573a9d5c66  tests/fixtures/arena-basis-brutal-2/seed-6207002.json
afe31b4cb79f606bd56f29d37267814319de161db745747dae1a70a528617d6f  tests/fixtures/arena-basis-brutal-2/seed-6207003.json
96701e3136318b9f4dd8859311e30bb85586d129c8ef4424fcea398f3bbc813e  tests/fixtures/arena-basis-brutal-2/seed-6207004.json
a3a6774081b01b743091115b29ccfbb81d109e2f26867ce74a1c431b9a56a63a  tests/fixtures/arena-basis-brutal-2/seed-6207005.json
28800721eac25312561d04c49389f95a05ae24e81ff13b1ed6191951a7b34082  tests/fixtures/arena-basis-brutal-2/seed-6207006.json
eb9a566eab8c314fd754d85402e280e5f75ee30e114451b9405007a536375f8f  tests/fixtures/arena-basis-brutal-2/seed-6207007.json
5926d642f77ca2cdbf8cbed29408cfbf4165d6a05b453c2203a0aace93827a2b  tests/fixtures/arena-basis-brutal-2/seed-6207008.json
d398b3ad8a24ecae7d3989a1d47be1bedf69b1b989b17d967278be2b2ca7a50c  tests/fixtures/arena-basis-brutal-2/seed-6207009.json
b7efa3c2df793fcbbdba1d453358577a1d4eb7c6b2fe8c9b575d7fe85c3adf04  tests/fixtures/arena-basis-brutal-2/seed-6207010.json
7cc25c0ab9a0e380373a306874290d0f5247e74c0efb71e43ab593b58f0d9d3b  tests/fixtures/arena-basis-brutal-b/seed-6206001.json
3fdfe05812aeb6724789b4ff6f753ce68c523c13ff024d9ee275bd1060adbcaa  tests/fixtures/arena-basis-brutal-b/seed-6206002.json
36828c26a62a8af8c9cc32db7f3a13124d897a8aacf8ce4d4df2c11d2c742d3c  tests/fixtures/arena-basis-brutal-b/seed-6206003.json
35a5980497b2184a4d684e1849117bb70e4887cb40264ea33117e3e14322c60a  tests/fixtures/arena-basis-brutal-b/seed-6206004.json
dc48b6cdd7d4e33dc3c9a0188586ebd1537deac4dec4284c7e9404cec652e2f1  tests/fixtures/arena-basis-brutal-b/seed-6206005.json
d66fc0a9f29d84b5f1bc5a46b86483f91236d05b5cb1b951519cce7db98e2269  tests/fixtures/arena-basis-brutal-b/seed-6206006.json
1c4c337148afad9aff2a86143bb3156cc446ffabd2ccc8cc29eb004d83034bd9  tests/fixtures/arena-basis-brutal-b/seed-6206007.json
11a065b490f6e68effaddb0e919b9f9f9f7ae300f19a97f3359d3d4c86658a32  tests/fixtures/arena-basis-brutal-b/seed-6206008.json
19808aca9fb3ca7e4a77b6222cfae31c4f69a16b9b74ecc0706cb1eee58d4f5e  tests/fixtures/arena-basis-brutal-b/seed-6206009.json
a9efe78460c66972d09c6efd1c7cc04409ba6fff5a0028657d2442a0ec2fbc83  tests/fixtures/arena-basis-brutal-b/seed-6206010.json
3f737f1ddf714b0381abdc0e822b3a07cda4c55287a4bc0b1a97cd4d7d71d63b  tests/fixtures/arena-basis-brutal/seed-6203001.json
8a7738bd2606792bae65da8f39f709ffad5b0bb5487f8e5749cecac4f29f9860  tests/fixtures/arena-basis-brutal/seed-6203002.json
d54761b2864fcdc1a777f645ade96279da751b3247bca1e042fb997326dc060f  tests/fixtures/arena-basis-brutal/seed-6203003.json
6f9465eccac77eb60ffab2be1832f8f1bcd3290c655130c2ac752a38e6d75a20  tests/fixtures/arena-basis-brutal/seed-6203004.json
5b3be6abbdf2fcccff3243639d582bea2fb1098099fa91cf2208a0f143a2364e  tests/fixtures/arena-basis-brutal/seed-6203005.json
3e6818fe70e276e9ee7407d76b01e3afab7254cc1c27e649d5f445a5f6a6480c  tests/fixtures/arena-basis-brutal/seed-6203006.json
e6215e5b6388a79bc850e7ff97867f2618733acbb434526a77133e382cba2d1b  tests/fixtures/arena-basis-brutal/seed-6203007.json
b067b1aa081f368859979415c468d997b6fa504cad6ad70dc6998c90eeb3207c  tests/fixtures/arena-basis-brutal/seed-6203008.json
9780276cdec0ee71c99cc13217d73376990866f5ab3ab471c7a793196665f7ce  tests/fixtures/arena-basis-brutal/seed-6203009.json
2ec7f3c1298e7b6f3519cf765bcb88f36be3426e02cf7572730a77af9e32114d  tests/fixtures/arena-basis-brutal/seed-6203010.json
8c0bcb3c0afa8358c26129efbef82d0d2882135389d8dd8040fe7e4b6451e13a  tests/fixtures/d569-blind-experiment-manifest.json
83daa7ea3ca89b270e5149368d09fa97074124dfe438cf95b346e996996026c8  tests/fixtures/d569-second-family-manifest.json

exec
/bin/bash -lc "rg -n -o -e '6209[0-9]{3}|6210[0-9]{3}|6211[0-9]{3}|6_209_[0-9]{3}|6_210_[0-9]{3}|6_211_[0-9]{3}|6209xxx|6210xxx|6211xxx' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md" in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 0ms:
23048:6209xxx
23048:6210xxx
23048:6211xxx
23061:6209xxx
23061:6210xxx
23061:6211xxx
23071:6209xxx
23071:6_209_001

exec
/bin/bash -lc "rg -n -o -e '6209[0-9]{3}|6210[0-9]{3}|6211[0-9]{3}|6_209_[0-9]{3}|6_210_[0-9]{3}|6_211_[0-9]{3}|6209xxx|6210xxx|6211xxx' tests/fixtures tools" in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 exited 1 in 0ms:
exec
/bin/bash -lc "rg -n -o -e '\\b6209\\b|\\b6210\\b|\\b6211\\b' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md" in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 0ms:
23068:6209
23068:6210
23068:6211

codex
The namespace gate exactly matches the frozen reservation evidence: only D643/D645/D650-era reservation references are present, and tracked fixtures/tools contain no seed use. WALL-01 is the accepted merge at `bea24cbe`, and `generatedLineIsOpen` still requires both `tier === 'none'` and `!blocksSight`. Next I’m proving the expected RED shape and inspecting the v2 suite’s exact membership/hash structure before generation.
exec
/bin/bash -lc "rg -n '"'^## D(643|649|650|651|652|653|654|655|656|657|658|659|660|661)'"\\b|"'^### D(643|649|650|651|652|653|654|655|656|657|658|659|660|661)'"\\b' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md && sed -n '1,460p' tests/unit/vtt/arena-basis-brutal-v2.test.ts && rg -n 'arena-basis-brutal-v2|6209|expected.*hash|sha256' tests/unit/vtt/arena-basis-brutal-v2.test.ts package.json" in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 0ms:
23060:## D643 — OWNER (2026-09-17 19:36): "Do your proposal" — the supervisor's recommendations are authorized as a whole
23083:## D649 — OWNER (2026-09-17 20:56): "Purge now with filter-repo, force-push the mirror, recreate the four worktrees from the rewritten main" — DONE in place (purge.log)
23086:## D650 — SUPERVISOR (2026-09-17 21:08): COHORT-01 plan ACCEPTED WITH AMENDMENT by astra r3 (HIGH, final round) — FROZEN at sha256 2b931ed857e6019fa515b387cb7c2262e8e04a4bd3c7b8690472a7adf4f6e802 (399 lines incl. binding note N1); Batch 1 dispatched on a new worktree; WALL-01 fix r2 re-dispatched after a sol capacity outage
23091:## D651 — SUPERVISOR (2026-09-17 21:25): two correct BLOCKED stops ruled — WALL-01 fix r2's four scene subjects (test-scene edits approved) and COHORT-01 B1's v5 cap discontinuity (amendment N2; plan re-frozen at sha256 4bff2145b445cbb96771333bfdceb5cfdae8781e494cfa48622619cae0a2ac69, 403 lines)
23095:## D652 — SUPERVISOR (2026-09-17 21:51): COHORT-01 B1 (+fix r1) VERIFIED BY ME and committed e92ebc93 on claude/cohort-01; astra medium review dispatched
23098:## D653 — SUPERVISOR (2026-09-17 22:08): COHORT-01 B1 ACCEPTED by astra r1 (medium; 1 P3; saved review-b1-astra-r1.md); WALL-01 r3 VERIFIED BY ME and committed bc6422bf; astra review of the whole WALL-01 candidate dispatched; COHORT-01 B2 dispatched
23103:## D654 — SUPERVISOR (2026-09-17 22:23): WALL-01 REJECTED by astra r1 (medium; 1 P1: WALL-F3; saved review-impl-wall-01-astra-r1.md) — CONFIRMED BY ME; the defect is MY SPEC: the WALL-01 brief dictated "endpoint vertices are NOT vertex-checked"; fix r4 dispatched
23106:## D655 — SUPERVISOR (2026-09-17 22:51): COHORT-01 B2 VERIFIED BY ME and committed 8284a91c on claude/cohort-01; astra medium review dispatched (resumed B1 reviewer)
23109:## D656 — SUPERVISOR (2026-09-17 23:07): COHORT-01 B2 REJECTED by astra r1 (medium; 0 P1, 1 P2: B2-F1; saved review-b2-astra-r1.md) → fix r1 dispatched; WALL-01 fix r4 harvested (sol; saved impl-wall-01-fix-r4-sol.md) → my verification running
23113:## D657 — SUPERVISOR (2026-09-17 23:22): WALL-01 fix r4 verified except for ONE aggregate leak that is a gap in MY r4 rule statement (WALL-F4) → fix r5 dispatched; B2 fix r1 harvested → verification running
23117:## D658 — SUPERVISOR (2026-09-17 23:36): COHORT-01 B2 fix r1 VERIFIED BY ME and committed e4c56954; astra r2 (medium, resumed) dispatched
23120:## D659 — SUPERVISOR (2026-09-17 23:51): COHORT-01 B2 (+fix r1) ACCEPTED by astra r2 (medium; saved review-b2-astra-r2.md); claude/cohort-01 = e4c56954 (B1 + B2). Batches 3–5 (generation) wait for WALL-01 acceptance; WALL-01 fix r5 harvested (saved impl-wall-01-fix-r5-sol.md) — my verification running (verify-wall-01-r5.log) with the intended endpoint mutant
23122:## D660 — SUPERVISOR (2026-09-18 00:07): WALL-01 fix r5 VERIFIED BY ME and committed b94dd732 on claude/vis-field; astra r2 (medium, resumed) dispatched on the endpoint rule
23125:## D661 — SUPERVISOR (2026-09-18 00:22): WALL-01 ACCEPTED by astra r2 (medium; WALL-F3 and WALL-F4 closed, no new findings; saved review-impl-wall-01-astra-r2.md) — claude/vis-field = b94dd732; merged into claude/cohort-01 = bea24cbe; COHORT-01 Batch 3 (generate brutal-v2) dispatched
import { describe, expect, it } from 'vitest';
import { monsterCombatantProfile } from '../../../src/combat/combatant';
import { traceCombatantLine } from '../../../src/combat/cover';
import { createEncounter, type EncounterState } from '../../../src/combat/encounter';
import { GIANT_SPIDER } from '../../../src/combat/statblocks/wild-beasts';
import { feet, type CombatantId } from '../../../src/combat/values';
import { decodeEncounterStateV1 } from '../../../src/vtt/encounter-state-codec';
import {
  availableEngineActorOptions,
  resolveEngineActorOption,
  type ResolvedActionSlotUse,
  type ResolvedTurnMechanics,
} from '../../../src/vtt/intent-resolver';
import { decodeArenaFixtureText } from '../../../src/vtt/mcp/entrypoint';
import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
import type { GeneratedRoom } from '../../../src/vtt/room-generator';
import {
  brutalRoomMembershipViolations,
  generatedRoomIntegrityViolations,
} from '../../../tools/d569-second-family-manifest';
import { declareTestInputs } from '../../helpers/test-inputs';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

const ACTIVE_FIXTURES = [
  { family: 'brutal-v2', seed: 6_209_001, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209001.json' },
  { family: 'brutal-v2', seed: 6_209_002, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209002.json' },
  { family: 'brutal-v2', seed: 6_209_003, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209003.json' },
  { family: 'brutal-v2', seed: 6_209_004, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209004.json' },
  { family: 'brutal-v2', seed: 6_209_005, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209005.json' },
  { family: 'brutal-v2', seed: 6_209_006, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209006.json' },
  { family: 'brutal-v2', seed: 6_209_007, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209007.json' },
  { family: 'brutal-v2', seed: 6_209_008, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209008.json' },
  { family: 'brutal-v2', seed: 6_209_009, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209009.json' },
  { family: 'brutal-v2', seed: 6_209_010, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209010.json' },
  { family: 'brutal-b-v2', seed: 6_210_001, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210001.json' },
  { family: 'brutal-b-v2', seed: 6_210_002, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210002.json' },
  { family: 'brutal-b-v2', seed: 6_210_003, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210003.json' },
  { family: 'brutal-b-v2', seed: 6_210_004, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210004.json' },
  { family: 'brutal-b-v2', seed: 6_210_005, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210005.json' },
  { family: 'brutal-b-v2', seed: 6_210_006, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210006.json' },
  { family: 'brutal-b-v2', seed: 6_210_007, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210007.json' },
  { family: 'brutal-b-v2', seed: 6_210_008, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210008.json' },
  { family: 'brutal-b-v2', seed: 6_210_009, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210009.json' },
  { family: 'brutal-b-v2', seed: 6_210_010, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210010.json' },
  { family: 'brutal-2-v2', seed: 6_211_001, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211001.json' },
  { family: 'brutal-2-v2', seed: 6_211_002, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211002.json' },
  { family: 'brutal-2-v2', seed: 6_211_003, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211003.json' },
  { family: 'brutal-2-v2', seed: 6_211_004, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211004.json' },
  { family: 'brutal-2-v2', seed: 6_211_005, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211005.json' },
  { family: 'brutal-2-v2', seed: 6_211_006, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211006.json' },
  { family: 'brutal-2-v2', seed: 6_211_007, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211007.json' },
  { family: 'brutal-2-v2', seed: 6_211_008, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211008.json' },
  { family: 'brutal-2-v2', seed: 6_211_009, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211009.json' },
  { family: 'brutal-2-v2', seed: 6_211_010, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211010.json' },
] as const;

const inputs = declareTestInputs({ fixtures: ACTIVE_FIXTURES.map(({ path }) => path) });
const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });

function targetedOffenseHasOpenTrace(
  state: EncounterState,
  mechanics: ResolvedTurnMechanics,
  slot: ResolvedActionSlotUse,
): boolean {
  if (slot.kind !== 'attack' && slot.kind !== 'saving_throw' && slot.kind !== 'cast_spell') {
    return true;
  }
  return slot.targetIds.every((targetId) => {
    const trace = traceCombatantLine(state, mechanics.actorId, targetId, {
      sourceAnchor: mechanics.finalPosition,
    });
    return !trace.blocksSight && trace.tier !== 'total';
  });
}

function resolvedMechanicsIsProductive(
  state: EncounterState,
  mechanics: ResolvedTurnMechanics,
): boolean {
  const hasProductiveComponent = mechanics.movementCostFeet > 0 ||
    mechanics.actionSlots.some((slot) =>
      slot.kind === 'attack' || slot.kind === 'saving_throw' || slot.kind === 'cast_spell' ||
      slot.kind === 'use_world_object');
  if (!hasProductiveComponent) return false;

  // D635/D642/D643: live cohorts additionally require every targeted offensive component
  // to remain sight-clear and non-total at its resolved origin. room-generator.ts:1227's
  // generated-room predicate is intentionally stricter: it requires no cover at all.
  return mechanics.actionSlots.every((slot) => targetedOffenseHasOpenTrace(state, mechanics, slot));
}

function monsterHasProductiveOption(state: EncounterState, actorId: CombatantId): boolean {
  return availableEngineActorOptions(state, actorId, OFFER_ENVIRONMENT).some((option) => {
    const resolution = resolveEngineActorOption(state, option, OFFER_ENVIRONMENT);
    return resolution.valid && resolvedMechanicsIsProductive(state, resolution.mechanics);
  });
}

function everyLivingMonsterIsProductive(state: EncounterState): boolean {
  const planningState = freshMonsterPlanningState(state);
  return planningState.combatants
    .filter((combatant) => combatant.profile.kind === 'monster' && combatant.life === 'living')
    .every((monster) => monsterHasProductiveOption(planningState, monster.profile.id));
}

function decodedClone(state: EncounterState): EncounterState {
  return decodeEncounterStateV1(JSON.parse(JSON.stringify(state)) as unknown, 'session');
}

function actionlessMonsterState(speed: 0 | 30): {
  readonly state: EncounterState;
  readonly actorId: CombatantId;
} {
  const base = monsterProfile(`active-productivity-${String(speed)}`);
  const actor = { ...base, rules: { ...base.rules, speed: feet(speed) } };
  const target = playerProfile(`active-productivity-target-${String(speed)}`);
  return {
    state: freshMonsterPlanningState(decodedClone(createEncounter({
      bounds: { columns: 20, rows: 3 },
      combatants: [actor, target],
      tokens: [placedToken(actor, 0, 1), placedToken(target, 15, 1)],
    }))),
    actorId: actor.id,
  };
}

function openWebState(): {
  readonly state: EncounterState;
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
} {
  const base = monsterCombatantProfile(GIANT_SPIDER, {
    combatantId: 'combatant:active-productivity-spider',
    tokenId: 'token:active-productivity-spider',
  });
  const actor = { ...base, rules: { ...base.rules, speed: feet(0) } };
  const target = playerProfile('active-productivity-web-target');
  return {
    state: freshMonsterPlanningState(decodedClone(createEncounter({
      bounds: { columns: 6, rows: 3 },
      combatants: [actor, target],
      tokens: [placedToken(actor, 0, 1), placedToken(target, 5, 1)],
    }))),
    actorId: actor.id,
    targetId: target.id,
  };
}

describe('active brutal v2 arena membership', () => {
  it('reserves exactly three contiguous ten-seed fixture families', () => {
    expect(ACTIVE_FIXTURES).toHaveLength(30);
    expect(ACTIVE_FIXTURES.map(({ seed }) => seed)).toEqual([
      ...Array.from({ length: 10 }, (_unused, index) => 6_209_001 + index),
      ...Array.from({ length: 10 }, (_unused, index) => 6_210_001 + index),
      ...Array.from({ length: 10 }, (_unused, index) => 6_211_001 + index),
    ]);
    expect(new Set(ACTIVE_FIXTURES.map(({ path }) => path))).toHaveLength(30);
  });

  it.each(ACTIVE_FIXTURES)(
    '$family seed $seed satisfies active state-derived membership at $path',
    ({ path, seed }) => {
      const fixtureBytes = inputs.fixtures.readText(path);
      const room = JSON.parse(fixtureBytes) as GeneratedRoom;
      const decoded = decodeArenaFixtureText(fixtureBytes);

      expect(room.spec.seed).toBe(seed);
      expect(generatedRoomIntegrityViolations(room, fixtureBytes)).toEqual([]);
      expect(brutalRoomMembershipViolations(room)
        .filter((violation) => violation.code !== 'brutal_productivity')).toEqual([]);
      expect(everyLivingMonsterIsProductive(decoded)).toBe(true);
    },
  );

  it('rejects a living monster whose only valid options are nonproductive', () => {
    const fixture = actionlessMonsterState(0);
    expect(fixture.state.combatants.find((entry) => entry.profile.id === fixture.actorId)?.life)
      .toBe('living');
    expect(availableEngineActorOptions(fixture.state, fixture.actorId, OFFER_ENVIRONMENT)
      .map(({ label }) => label)).toEqual(['Dodge', 'End Turn']);
    expect(monsterHasProductiveOption(fixture.state, fixture.actorId)).toBe(false);
  });

  it('keeps a positive-movement-only Dash monster productive', () => {
    const fixture = actionlessMonsterState(30);
    const resolved = availableEngineActorOptions(fixture.state, fixture.actorId, OFFER_ENVIRONMENT)
      .map((option) => ({ option, resolution: resolveEngineActorOption(
        fixture.state,
        option,
        OFFER_ENVIRONMENT,
      ) }));
    const dash = resolved.find(({ option }) => option.label === 'Dash');
    if (dash === undefined || !dash.resolution.valid) throw new Error('Dash witness did not resolve.');

    expect(dash.resolution.mechanics.movementCostFeet).toBeGreaterThan(0);
    expect(dash.resolution.mechanics.actionSlots.map(({ kind }) => kind)).toEqual(['dash']);
    expect(monsterHasProductiveOption(fixture.state, fixture.actorId)).toBe(true);
  });

  it('rejects targeted offense whose resolved origin has an optically blocked trace', () => {
    const fixture = openWebState();
    const web = availableEngineActorOptions(fixture.state, fixture.actorId, OFFER_ENVIRONMENT)
      .find((option) => option.actionSlots.some((slot) =>
        slot.use.kind === 'saving_throw' && slot.use.actionId === 'web'));
    if (web === undefined) throw new Error('Blocked-target witness omitted Web.');
    const resolution = resolveEngineActorOption(fixture.state, web, OFFER_ENVIRONMENT);
    if (!resolution.valid) throw new Error('Blocked-target witness could not resolve Web.');

    const blocked = decodedClone({
      ...fixture.state,
      blockedCells: Array.from({ length: 3 }, (_unused, row) => ({ column: 3, row })),
    });
    expect(traceCombatantLine(blocked, fixture.actorId, fixture.targetId, {
      sourceAnchor: resolution.mechanics.finalPosition,
    })).toMatchObject({ tier: 'half', blocksSight: true });
    expect(resolvedMechanicsIsProductive(fixture.state, resolution.mechanics)).toBe(true);
    expect(resolvedMechanicsIsProductive(blocked, resolution.mechanics)).toBe(false);
  });
});
tests/unit/vtt/arena-basis-brutal-v2.test.ts:26:  { family: 'brutal-v2', seed: 6_209_001, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209001.json' },
tests/unit/vtt/arena-basis-brutal-v2.test.ts:27:  { family: 'brutal-v2', seed: 6_209_002, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209002.json' },
tests/unit/vtt/arena-basis-brutal-v2.test.ts:28:  { family: 'brutal-v2', seed: 6_209_003, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209003.json' },
tests/unit/vtt/arena-basis-brutal-v2.test.ts:29:  { family: 'brutal-v2', seed: 6_209_004, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209004.json' },
tests/unit/vtt/arena-basis-brutal-v2.test.ts:30:  { family: 'brutal-v2', seed: 6_209_005, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209005.json' },
tests/unit/vtt/arena-basis-brutal-v2.test.ts:31:  { family: 'brutal-v2', seed: 6_209_006, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209006.json' },
tests/unit/vtt/arena-basis-brutal-v2.test.ts:32:  { family: 'brutal-v2', seed: 6_209_007, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209007.json' },
tests/unit/vtt/arena-basis-brutal-v2.test.ts:33:  { family: 'brutal-v2', seed: 6_209_008, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209008.json' },
tests/unit/vtt/arena-basis-brutal-v2.test.ts:34:  { family: 'brutal-v2', seed: 6_209_009, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209009.json' },
tests/unit/vtt/arena-basis-brutal-v2.test.ts:35:  { family: 'brutal-v2', seed: 6_209_010, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209010.json' },

exec
/bin/bash -lc "cat package.json | sed -n '1,180p' && npx vitest run tests/unit/vtt/arena-basis-brutal-v2.test.ts --reporter=verbose" in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 exited 1 in 186ms:
failed to load config from /home/vagrant/PhpstormProjects/dnd-wt-cohort-01/vitest.config.ts

⎯⎯⎯⎯⎯⎯⎯ Startup Error ⎯⎯⎯⎯⎯⎯⎯⎯
Error: EROFS: read-only file system, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/node_modules/.vite-temp/vitest.config.ts.timestamp-1789705409642-320ec8800117d.mjs'
    at async open (node:internal/fs/promises:637:25)
    at async Object.writeFile (node:internal/fs/promises:1239:14)
    at async loadConfigFromBundledFile (file:///home/vagrant/PhpstormProjects/dnd-wt-vis-field/node_modules/vite/dist/node/chunks/config.js:35994:3)
    at async bundleAndLoadConfigFile (file:///home/vagrant/PhpstormProjects/dnd-wt-vis-field/node_modules/vite/dist/node/chunks/config.js:35884:17)
    at async loadConfigFromFile (file:///home/vagrant/PhpstormProjects/dnd-wt-vis-field/node_modules/vite/dist/node/chunks/config.js:35851:42)
    at async resolveConfig (file:///home/vagrant/PhpstormProjects/dnd-wt-vis-field/node_modules/vite/dist/node/chunks/config.js:35500:22)
    at async _createServer (file:///home/vagrant/PhpstormProjects/dnd-wt-vis-field/node_modules/vite/dist/node/chunks/config.js:25441:67)
    at async createViteServer (file:///home/vagrant/PhpstormProjects/dnd-wt-vis-field/node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:8835:17)
    at async createVitest (file:///home/vagrant/PhpstormProjects/dnd-wt-vis-field/node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:14221:18)
    at async prepareVitest (file:///home/vagrant/PhpstormProjects/dnd-wt-vis-field/node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:14588:14) {
  errno: -30,
  code: 'EROFS',
  syscall: 'open',
  path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/node_modules/.vite-temp/vitest.config.ts.timestamp-1789705409642-320ec8800117d.mjs'
}




exec
/bin/bash -lc 'npx vitest run --configLoader runner tests/unit/vtt/arena-basis-brutal-v2.test.ts --reporter=verbose' in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 exited 1 in 3575ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-cohort-01

[spell-source-parse-cache] reused /tmp/dnd-srd-spell-source-parse-cache/5198a070dbed34af.json
 ✓ tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > reserves exactly three contiguous ten-seed fixture families 2ms
 × tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 2ms
   → ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209001.json'
 × tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209002 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 0ms
   → ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209002.json'
 × tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209003 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 0ms
   → ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209003.json'
 × tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209004 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 0ms
   → ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209004.json'
 × tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209005 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 0ms
   → ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209005.json'
 × tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209006 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 0ms
   → ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209006.json'
 × tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209007 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 0ms
   → ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209007.json'
 × tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209008 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 0ms
   → ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209008.json'
 × tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209009 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 0ms
   → ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209009.json'
 × tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209010 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…' 0ms
   → ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209010.json'
 × tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…' 0ms
   → ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210001.json'
 × tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210002 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…' 0ms
   → ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210002.json'
 × tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210003 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…' 0ms
   → ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210003.json'
 × tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210004 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…' 0ms
   → ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210004.json'
 × tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210005 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…' 0ms
   → ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210005.json'
 × tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210006 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…' 0ms
   → ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210006.json'
 × tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210007 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…' 0ms
   → ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210007.json'
 × tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210008 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…' 0ms
   → ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210008.json'
 × tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210009 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…' 0ms
   → ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210009.json'
 × tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210010 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…' 0ms
   → ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210010.json'
 × tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…' 0ms
   → ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211001.json'
 × tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211002 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…' 0ms
   → ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211002.json'
 × tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211003 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…' 0ms
   → ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211003.json'
 × tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211004 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…' 0ms
   → ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211004.json'
 × tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211005 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…' 0ms
   → ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211005.json'
 × tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211006 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…' 0ms
   → ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211006.json'
 × tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211007 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…' 0ms
   → ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211007.json'
 × tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211008 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…' 0ms
   → ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211008.json'
 × tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211009 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…' 0ms
   → ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211009.json'
 × tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211010 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…' 0ms
   → ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211010.json'
 ✓ tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > rejects a living monster whose only valid options are nonproductive 13ms
 ✓ tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > keeps a positive-movement-only Dash monster productive 3ms
 ✓ tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > rejects targeted offense whose resolved origin has an optically blocked trace 4ms

⎯⎯⎯⎯⎯⎯ Failed Tests 30 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209001.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errno: -2, code: 'ENOENT', syscall: 'open', path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209001.json' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209002 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209002.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errno: -2, code: 'ENOENT', syscall: 'open', path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209002.json' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209003 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209003.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errno: -2, code: 'ENOENT', syscall: 'open', path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209003.json' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209004 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209004.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errno: -2, code: 'ENOENT', syscall: 'open', path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209004.json' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209005 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209005.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errno: -2, code: 'ENOENT', syscall: 'open', path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209005.json' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209006 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209006.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errno: -2, code: 'ENOENT', syscall: 'open', path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209006.json' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209007 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209007.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errno: -2, code: 'ENOENT', syscall: 'open', path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209007.json' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[7/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209008 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209008.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errno: -2, code: 'ENOENT', syscall: 'open', path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209008.json' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[8/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209009 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209009.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errno: -2, code: 'ENOENT', syscall: 'open', path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209009.json' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[9/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-v2' seed 6209010 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-v2/…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209010.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errno: -2, code: 'ENOENT', syscall: 'open', path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-v2/seed-6209010.json' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[10/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210001.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errno: -2, code: 'ENOENT', syscall: 'open', path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210001.json' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[11/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210002 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210002.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errno: -2, code: 'ENOENT', syscall: 'open', path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210002.json' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[12/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210003 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210003.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errno: -2, code: 'ENOENT', syscall: 'open', path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210003.json' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[13/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210004 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210004.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errno: -2, code: 'ENOENT', syscall: 'open', path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210004.json' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[14/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210005 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210005.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errno: -2, code: 'ENOENT', syscall: 'open', path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210005.json' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[15/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210006 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210006.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errno: -2, code: 'ENOENT', syscall: 'open', path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210006.json' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[16/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210007 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210007.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errno: -2, code: 'ENOENT', syscall: 'open', path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210007.json' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[17/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210008 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210008.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errno: -2, code: 'ENOENT', syscall: 'open', path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210008.json' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[18/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210009 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210009.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errno: -2, code: 'ENOENT', syscall: 'open', path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210009.json' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[19/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-b-v2' seed 6210010 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-b-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210010.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errno: -2, code: 'ENOENT', syscall: 'open', path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-b-v2/seed-6210010.json' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[20/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211001 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211001.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errno: -2, code: 'ENOENT', syscall: 'open', path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211001.json' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[21/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211002 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211002.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errno: -2, code: 'ENOENT', syscall: 'open', path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211002.json' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[22/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211003 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211003.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errno: -2, code: 'ENOENT', syscall: 'open', path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211003.json' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[23/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211004 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211004.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errno: -2, code: 'ENOENT', syscall: 'open', path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211004.json' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[24/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211005 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211005.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errno: -2, code: 'ENOENT', syscall: 'open', path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211005.json' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[25/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211006 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211006.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errno: -2, code: 'ENOENT', syscall: 'open', path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211006.json' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[26/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211007 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211007.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errno: -2, code: 'ENOENT', syscall: 'open', path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211007.json' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[27/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211008 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211008.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errno: -2, code: 'ENOENT', syscall: 'open', path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211008.json' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[28/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211009 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211009.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errno: -2, code: 'ENOENT', syscall: 'open', path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211009.json' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[29/30]⎯

 FAIL  tests/unit/vtt/arena-basis-brutal-v2.test.ts > active brutal v2 arena membership > 'brutal-2-v2' seed 6211010 satisfies active state-derived membership at 'tests/fixtures/arena-basis-brutal-2-v…'
Error: ENOENT: no such file or directory, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211010.json'
 ❯ Object.readText tests/helpers/test-inputs.ts:155:14
    153|     readText<Selected extends Path>(path: Selected): TestInputText<Cat…
    154|       assertAllowed(path);
    155|       return readFileSync(absoluteInputPath(path), 'utf8') as TestInpu…
       |              ^
    156|     },
    157|     readBytes<Selected extends Path>(path: Selected): TestInputBytes<C…
 ❯ tests/unit/vtt/arena-basis-brutal-v2.test.ts:164:44

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
Serialized Error: { errno: -2, code: 'ENOENT', syscall: 'open', path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/fixtures/arena-basis-brutal-2-v2/seed-6211010.json' }
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[30/30]⎯


 Test Files  1 failed (1)
      Tests  30 failed | 4 passed (34)
   Start at  00:23:33
   Duration  3.27s (transform 1.23s, setup 0ms, import 1.79s, tests 30ms, environment 0ms)


codex
The active suite is RED for exactly 30 missing fixtures, with all four non-file tests green. I’m now generating 6209001–6209010 twice into separate fresh `/tmp` trees using the exact tool arguments and no terrain-profile option.
exec
/bin/bash -lc 'mktemp -d /tmp/cohort01-b3-a.XXXXXX
mktemp -d /tmp/cohort01-b3-b.XXXXXX' in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 0ms:
/tmp/cohort01-b3-a.BlRksh
/tmp/cohort01-b3-b.frHiBz

exec
/bin/bash -lc 'npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out /tmp/cohort01-b3-a.BlRksh/arena-basis-brutal-v2' in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 exited 1 in 160ms:
failed to load config from /home/vagrant/PhpstormProjects/dnd-wt-cohort-01/vite.config.ts
node:internal/fs/promises:637
  return new FileHandle(await PromisePrototypeThen(
                        ^

Error: EROFS: read-only file system, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/node_modules/.vite-temp/vite.config.ts.timestamp-1789705425615-e3a4d0228061a.mjs'
    at async open (node:internal/fs/promises:637:25)
    at async Object.writeFile (node:internal/fs/promises:1239:14)
    at async loadConfigFromBundledFile (file:///home/vagrant/PhpstormProjects/dnd-wt-vis-field/node_modules/vite/dist/node/chunks/config.js:35994:3)
    at async bundleAndLoadConfigFile (file:///home/vagrant/PhpstormProjects/dnd-wt-vis-field/node_modules/vite/dist/node/chunks/config.js:35884:17)
    at async loadConfigFromFile (file:///home/vagrant/PhpstormProjects/dnd-wt-vis-field/node_modules/vite/dist/node/chunks/config.js:35851:42)
    at async resolveConfig (file:///home/vagrant/PhpstormProjects/dnd-wt-vis-field/node_modules/vite/dist/node/chunks/config.js:35500:22)
    at async _createServer (file:///home/vagrant/PhpstormProjects/dnd-wt-vis-field/node_modules/vite/dist/node/chunks/config.js:25441:67)
    at async CAC.run (file:///home/vagrant/PhpstormProjects/dnd-wt-vis-field/node_modules/vite-node/dist/cli.mjs:65:17) {
  errno: -30,
  code: 'EROFS',
  syscall: 'open',
  path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/node_modules/.vite-temp/vite.config.ts.timestamp-1789705425615-e3a4d0228061a.mjs'
}

Node.js v24.13.0

codex
The literal generation command hit the same symlinked `node_modules/.vite-temp` read-only cache issue as the first Vitest attempt (exit 1 before generation). This is an environment/cache-loader failure, not a seed failure. I’m checking the local CLI’s supported loader flag, then will rerun the same generator arguments with its non-bundling config loader so it can execute without writing through the symlink.
exec
/bin/bash -lc 'npx vite-node --help' in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 131ms:
vite-node/3.2.4

Usage:
  $ vite-node [...files]

Commands:
  [...files]  

For more info, run any command with the `--help` flag:
  $ vite-node --help

Options:
  -r, --root <path>    Use specified root directory 
  -c, --config <path>  Use specified config file 
  -m, --mode <mode>    Set env mode 
  -w, --watch          Restart on file changes, similar to "nodemon" 
  --script             Use vite-node as a script runner 
  --options <options>  Use specified Vite server options 
  -v, --version        Output the version number 
  -h, --help           Display help for command 
  -v, --version        Display version number 

exec
/bin/bash -lc 'rg -n "configLoader|--options" node_modules/vite-node node_modules/vite/dist/node | head -40' in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 0ms:
node_modules/vite/dist/node/index.d.ts:3433:  configLoader?: "bundle" | "runner" | "native";
node_modules/vite/dist/node/index.d.ts:3504:declare function loadConfigFromFile(configEnv: ConfigEnv, configFile?: string, configRoot?: string, logLevel?: LogLevel, customLogger?: Logger, configLoader?: "bundle" | "runner" | "native"): Promise<{
node_modules/vite/dist/node/cli.js:529:	delete ret.configLoader;
node_modules/vite/dist/node/cli.js:567:cli.option("-c, --config <file>", `[string] use specified config file`).option("--base <path>", `[string] public base path (default: /)`, { type: [convertBase] }).option("-l, --logLevel <level>", `[string] info | warn | error | silent`).option("--clearScreen", `[boolean] allow/disable clear screen when logging`).option("--configLoader <loader>", `[string] use 'bundle' to bundle the config with esbuild, or 'runner' (experimental) to process it on the fly, or 'native' (experimental) to load using the native runtime (default: bundle)`).option("-d, --debug [feat]", `[string | boolean] show debug logs`).option("-f, --filter <filter>", `[string] filter debug logs`).option("-m, --mode <mode>", `[string] set env mode`);
node_modules/vite/dist/node/cli.js:577:			configLoader: options.configLoader,
node_modules/vite/dist/node/cli.js:634:			configLoader: options.configLoader,
node_modules/vite/dist/node/cli.js:656:			configLoader: options.configLoader,
node_modules/vite/dist/node/cli.js:673:			configLoader: options.configLoader,
node_modules/vite-node/README.md:46:npx vite-node --options.deps.inline="module-name" --options.deps.external="/module-regexp/" index.ts
node_modules/vite/dist/node/chunks/config.js:35500:		const loadResult = await loadConfigFromFile(configEnv, configFile, config$2.root, config$2.logLevel, config$2.customLogger, config$2.configLoader);
node_modules/vite/dist/node/chunks/config.js:35834:async function loadConfigFromFile(configEnv, configFile, configRoot = process.cwd(), logLevel, customLogger, configLoader = "bundle") {
node_modules/vite/dist/node/chunks/config.js:35835:	if (configLoader !== "bundle" && configLoader !== "runner" && configLoader !== "native") throw new Error(`Unsupported configLoader: ${configLoader}. Accepted values are 'bundle', 'runner', and 'native'.`);
node_modules/vite/dist/node/chunks/config.js:35851:		const { configExport, dependencies } = await (configLoader === "bundle" ? bundleAndLoadConfigFile : configLoader === "runner" ? runnerImportConfigFile : nativeImportConfigFile)(resolvedPath);

exec
/bin/bash -lc "npx vite-node --options '{\"configLoader\":\"runner\"}' tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out /tmp/cohort01-b3-a.BlRksh/arena-basis-brutal-v2" in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 exited 1 in 164ms:
failed to load config from /home/vagrant/PhpstormProjects/dnd-wt-cohort-01/vite.config.ts
node:internal/fs/promises:637
  return new FileHandle(await PromisePrototypeThen(
                        ^

Error: EROFS: read-only file system, open '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/node_modules/.vite-temp/vite.config.ts.timestamp-1789705440781-abf42184555e48.mjs'
    at async open (node:internal/fs/promises:637:25)
    at async Object.writeFile (node:internal/fs/promises:1239:14)
    at async loadConfigFromBundledFile (file:///home/vagrant/PhpstormProjects/dnd-wt-vis-field/node_modules/vite/dist/node/chunks/config.js:35994:3)
    at async bundleAndLoadConfigFile (file:///home/vagrant/PhpstormProjects/dnd-wt-vis-field/node_modules/vite/dist/node/chunks/config.js:35884:17)
    at async loadConfigFromFile (file:///home/vagrant/PhpstormProjects/dnd-wt-vis-field/node_modules/vite/dist/node/chunks/config.js:35851:42)
    at async resolveConfig (file:///home/vagrant/PhpstormProjects/dnd-wt-vis-field/node_modules/vite/dist/node/chunks/config.js:35500:22)
    at async _createServer (file:///home/vagrant/PhpstormProjects/dnd-wt-vis-field/node_modules/vite/dist/node/chunks/config.js:25441:67)
    at async CAC.run (file:///home/vagrant/PhpstormProjects/dnd-wt-vis-field/node_modules/vite-node/dist/cli.mjs:65:17) {
  errno: -30,
  code: 'EROFS',
  syscall: 'open',
  path: '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/node_modules/.vite-temp/vite.config.ts.timestamp-1789705440781-abf42184555e48.mjs'
}

Node.js v24.13.0

exec
/bin/bash -lc "sed -n '1,130p' node_modules/vite-node/dist/cli.mjs && sed -n '1,110p' node_modules/vite-node/dist/cli.cjs 2>/dev/null || true" in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 0ms:
import { resolve } from 'node:path';
import cac from 'cac';
import { s } from './chunk-browser.mjs';
import { createServer, version as version$1, loadEnv } from 'vite';
import { ViteNodeRunner } from './client.mjs';
import { v as viteNodeHmrPlugin, a as createHotContext, h as handleMessage } from './chunk-hmr.mjs';
import { ViteNodeServer } from './server.mjs';
import { installSourcemapsSupport } from './source-map.mjs';
import { toArray } from './utils.mjs';
import 'node:module';
import 'node:url';
import 'node:vm';
import 'debug';
import 'pathe';
import 'node:fs';
import 'node:events';
import 'node:assert';
import 'node:perf_hooks';
import 'es-module-lexer';
import './constants.mjs';

var version = "3.2.4";

const cli = cac("vite-node");
cli.option("-r, --root <path>", "Use specified root directory").option("-c, --config <path>", "Use specified config file").option("-m, --mode <mode>", "Set env mode").option("-w, --watch", "Restart on file changes, similar to \"nodemon\"").option("--script", "Use vite-node as a script runner").option("--options <options>", "Use specified Vite server options").option("-v, --version", "Output the version number").option("-h, --help", "Display help for command");
cli.command("[...files]").allowUnknownOptions().action(run);
cli.parse(process.argv, { run: false });
if (cli.args.length === 0) cli.runMatchedCommand();
else {
	const i = cli.rawArgs.indexOf(cli.args[0]) + 1;
	const scriptArgs = cli.rawArgs.slice(i).filter((it) => it !== "--");
	const executeArgs = [
		...cli.rawArgs.slice(0, i),
		"--",
		...scriptArgs
	];
	cli.parse(executeArgs);
}
async function run(files, options = {}) {
	var _server$emitter;
	if (options.script) {
		files = [files[0]];
		options = {};
		process.argv = [
			process.argv[0],
			resolve(files[0]),
			...process.argv.slice(2).filter((arg) => arg !== "--script" && arg !== files[0])
		];
	} else process.argv = [...process.argv.slice(0, 2), ...options["--"] || []];
	if (options.version) {
		cli.version(version);
		cli.outputVersion();
		process.exit(0);
	}
	if (options.help) {
		cli.version(version).outputHelp();
		process.exit(0);
	}
	if (!files.length) {
		console.error(s.red("No files specified."));
		cli.version(version).outputHelp();
		process.exit(1);
	}
	const serverOptions = options.options ? parseServerOptions(options.options) : {};
	const server = await createServer({
		logLevel: "error",
		configFile: options.config,
		root: options.root,
		mode: options.mode,
		server: {
			hmr: !!options.watch,
			watch: options.watch ? void 0 : null
		},
		plugins: [options.watch && viteNodeHmrPlugin()]
	});
	if (Number(version$1.split(".")[0]) < 6) await server.pluginContainer.buildStart({});
	else
 // directly access client plugin container until https://github.com/vitejs/vite/issues/19607
	await server.environments.client.pluginContainer.buildStart({});
	const env = loadEnv(server.config.mode, server.config.envDir, "");
	for (const key in env) {
		var _process$env;
		(_process$env = process.env)[key] ?? (_process$env[key] = env[key]);
	}
	const node = new ViteNodeServer(server, serverOptions);
	installSourcemapsSupport({ getSourceMap: (source) => node.getSourceMap(source) });
	const runner = new ViteNodeRunner({
		root: server.config.root,
		base: server.config.base,
		fetchModule(id) {
			return node.fetchModule(id);
		},
		resolveId(id, importer) {
			return node.resolveId(id, importer);
		},
		createHotContext(runner, url) {
			return createHotContext(runner, server.emitter, files, url);
		}
	});
	// provide the vite define variable in this context
	await runner.executeId("/@vite/env");
	for (const file of files) await runner.executeFile(file);
	if (!options.watch) await server.close();
	(_server$emitter = server.emitter) === null || _server$emitter === void 0 || _server$emitter.on("message", (payload) => {
		handleMessage(runner, server.emitter, files, payload);
	});
	if (options.watch) process.on("uncaughtException", (err) => {
		console.error(s.red("[vite-node] Failed to execute file: \n"), err);
	});
}
function parseServerOptions(serverOptions) {
	var _serverOptions$deps, _serverOptions$deps2, _serverOptions$deps3, _serverOptions$deps4, _serverOptions$deps5, _serverOptions$deps6, _serverOptions$transf, _serverOptions$transf2;
	const inlineOptions = ((_serverOptions$deps = serverOptions.deps) === null || _serverOptions$deps === void 0 ? void 0 : _serverOptions$deps.inline) === true ? true : toArray((_serverOptions$deps2 = serverOptions.deps) === null || _serverOptions$deps2 === void 0 ? void 0 : _serverOptions$deps2.inline);
	return {
		...serverOptions,
		deps: {
			...serverOptions.deps,
			inlineFiles: toArray((_serverOptions$deps3 = serverOptions.deps) === null || _serverOptions$deps3 === void 0 ? void 0 : _serverOptions$deps3.inlineFiles),
			inline: inlineOptions !== true ? inlineOptions.map((dep) => {
				return dep.startsWith("/") && dep.endsWith("/") ? new RegExp(dep) : dep;
			}) : true,
			external: toArray((_serverOptions$deps4 = serverOptions.deps) === null || _serverOptions$deps4 === void 0 ? void 0 : _serverOptions$deps4.external).map((dep) => {
				return dep.startsWith("/") && dep.endsWith("/") ? new RegExp(dep) : dep;
			}),
			moduleDirectories: ((_serverOptions$deps5 = serverOptions.deps) === null || _serverOptions$deps5 === void 0 ? void 0 : _serverOptions$deps5.moduleDirectories) ? toArray((_serverOptions$deps6 = serverOptions.deps) === null || _serverOptions$deps6 === void 0 ? void 0 : _serverOptions$deps6.moduleDirectories) : void 0
		},
		transformMode: {
			...serverOptions.transformMode,
			ssr: toArray((_serverOptions$transf = serverOptions.transformMode) === null || _serverOptions$transf === void 0 ? void 0 : _serverOptions$transf.ssr).map((dep) => new RegExp(dep)),
			web: toArray((_serverOptions$transf2 = serverOptions.transformMode) === null || _serverOptions$transf2 === void 0 ? void 0 : _serverOptions$transf2.web).map((dep) => new RegExp(dep))
'use strict';

var path = require('node:path');
var cac = require('cac');
var browser = require('./chunk-browser.cjs');
var vite = require('vite');
var client = require('./client.cjs');
var hmr = require('./chunk-hmr.cjs');
var server = require('./server.cjs');
var sourceMap = require('./source-map.cjs');
var utils = require('./utils.cjs');
require('node:module');
require('node:url');
require('node:vm');
require('debug');
require('pathe');
require('node:fs');
require('node:events');
require('node:assert');
require('node:perf_hooks');
require('es-module-lexer');
require('./constants.cjs');

var version = "3.2.4";

const cli = cac("vite-node");
cli.option("-r, --root <path>", "Use specified root directory").option("-c, --config <path>", "Use specified config file").option("-m, --mode <mode>", "Set env mode").option("-w, --watch", "Restart on file changes, similar to \"nodemon\"").option("--script", "Use vite-node as a script runner").option("--options <options>", "Use specified Vite server options").option("-v, --version", "Output the version number").option("-h, --help", "Display help for command");
cli.command("[...files]").allowUnknownOptions().action(run);
cli.parse(process.argv, { run: false });
if (cli.args.length === 0) cli.runMatchedCommand();
else {
	const i = cli.rawArgs.indexOf(cli.args[0]) + 1;
	const scriptArgs = cli.rawArgs.slice(i).filter((it) => it !== "--");
	const executeArgs = [
		...cli.rawArgs.slice(0, i),
		"--",
		...scriptArgs
	];
	cli.parse(executeArgs);
}
async function run(files, options = {}) {
	var _server$emitter;
	if (options.script) {
		files = [files[0]];
		options = {};
		process.argv = [
			process.argv[0],
			path.resolve(files[0]),
			...process.argv.slice(2).filter((arg) => arg !== "--script" && arg !== files[0])
		];
	} else process.argv = [...process.argv.slice(0, 2), ...options["--"] || []];
	if (options.version) {
		cli.version(version);
		cli.outputVersion();
		process.exit(0);
	}
	if (options.help) {
		cli.version(version).outputHelp();
		process.exit(0);
	}
	if (!files.length) {
		console.error(browser.s.red("No files specified."));
		cli.version(version).outputHelp();
		process.exit(1);
	}
	const serverOptions = options.options ? parseServerOptions(options.options) : {};
	const server$1 = await vite.createServer({
		logLevel: "error",
		configFile: options.config,
		root: options.root,
		mode: options.mode,
		server: {
			hmr: !!options.watch,
			watch: options.watch ? void 0 : null
		},
		plugins: [options.watch && hmr.viteNodeHmrPlugin()]
	});
	if (Number(vite.version.split(".")[0]) < 6) await server$1.pluginContainer.buildStart({});
	else
 // directly access client plugin container until https://github.com/vitejs/vite/issues/19607
	await server$1.environments.client.pluginContainer.buildStart({});
	const env = vite.loadEnv(server$1.config.mode, server$1.config.envDir, "");
	for (const key in env) {
		var _process$env;
		(_process$env = process.env)[key] ?? (_process$env[key] = env[key]);
	}
	const node = new server.ViteNodeServer(server$1, serverOptions);
	sourceMap.installSourcemapsSupport({ getSourceMap: (source) => node.getSourceMap(source) });
	const runner = new client.ViteNodeRunner({
		root: server$1.config.root,
		base: server$1.config.base,
		fetchModule(id) {
			return node.fetchModule(id);
		},
		resolveId(id, importer) {
			return node.resolveId(id, importer);
		},
		createHotContext(runner, url) {
			return hmr.createHotContext(runner, server$1.emitter, files, url);
		}
	});
	// provide the vite define variable in this context
	await runner.executeId("/@vite/env");
	for (const file of files) await runner.executeFile(file);
	if (!options.watch) await server$1.close();
	(_server$emitter = server$1.emitter) === null || _server$emitter === void 0 || _server$emitter.on("message", (payload) => {
		hmr.handleMessage(runner, server$1.emitter, files, payload);
	});
	if (options.watch) process.on("uncaughtException", (err) => {
		console.error(browser.s.red("[vite-node] Failed to execute file: \n"), err);

exec
/bin/bash -lc "sed -n '35960,36015p' node_modules/vite/dist/node/chunks/config.js && sed -n '1,120p' vite.config.ts" in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 0ms:
					if (contents.startsWith("#!")) {
						let firstLineEndIndex = contents.indexOf("\n");
						if (firstLineEndIndex < 0) firstLineEndIndex = contents.length;
						injectedContents = contents.slice(0, firstLineEndIndex + 1) + injectValues + contents.slice(firstLineEndIndex + 1);
					} else injectedContents = injectValues + contents;
					return {
						loader: args.path.endsWith("ts") ? "ts" : "js",
						contents: injectedContents
					};
				});
			}
		}]
	});
	const { text } = result.outputFiles[0];
	return {
		code: text,
		dependencies: Object.keys(result.metafile.inputs)
	};
}
const _require = createRequire(
	/** #__KEEP__ */
	import.meta.url
);
async function loadConfigFromBundledFile(fileName, bundledCode, isESM) {
	if (isESM) {
		let nodeModulesDir = typeof process.versions.deno === "string" ? void 0 : findNearestNodeModules(path.dirname(fileName));
		if (nodeModulesDir) try {
			await fsp.mkdir(path.resolve(nodeModulesDir, ".vite-temp/"), { recursive: true });
		} catch (e$1) {
			if (e$1.code === "EACCES") nodeModulesDir = void 0;
			else throw e$1;
		}
		const hash$1 = `timestamp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
		const tempFileName = nodeModulesDir ? path.resolve(nodeModulesDir, `.vite-temp/${path.basename(fileName)}.${hash$1}.mjs`) : `${fileName}.${hash$1}.mjs`;
		await fsp.writeFile(tempFileName, bundledCode);
		try {
			return (await import(pathToFileURL(tempFileName).href)).default;
		} finally {
			fs.unlink(tempFileName, () => {});
		}
	} else {
		const extension$1 = path.extname(fileName);
		const realFileName = await promisifiedRealpath(fileName);
		const loaderExt = extension$1 in _require.extensions ? extension$1 : ".js";
		const defaultLoader = _require.extensions[loaderExt];
		_require.extensions[loaderExt] = (module$1, filename) => {
			if (filename === realFileName) module$1._compile(bundledCode, filename);
			else defaultLoader(module$1, filename);
		};
		delete _require.cache[_require.resolve(fileName)];
		const raw = _require(fileName);
		_require.extensions[loaderExt] = defaultLoader;
		return raw.__esModule ? raw.default : raw;
	}
}
async function runConfigHook(config$2, plugins$1, configEnv) {
import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { aiBridge } from './tools/ai-bridge/plugin';
import { bundledLicenseAssets } from './tools/licenses/bundled-license-files';
import {
  appShellCacheName,
  appShellUrl,
  serviceWorkerSource,
  type BuildAsset,
} from './tools/pwa/service-worker';

function deployableAssets(
  root: string,
  directory: string = root,
): BuildAsset[] {
  const assets: BuildAsset[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      assets.push(...deployableAssets(root, path));
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    const fileName = relative(root, path);
    if (
      fileName === '_headers' ||
      fileName === '_redirects' ||
      fileName === 'service-worker.js'
    ) {
      continue;
    }
    assets.push({ fileName, source: readFileSync(path) });
  }
  return assets;
}

/**
 * THE BUILD SHIPS THE LICENCES IT IS DISTRIBUTED UNDER.
 *
 * `dist/` is the artifact people actually receive, and it carried no licence
 * notice of any kind: the MIT permission notice and the CC-BY-4.0 legalcode
 * both lived only in the repository. `tools/licenses/bundled-license-files.ts`
 * says which repository files travel and where they land; this emits them.
 *
 * `emitFile` rather than a post-build copy, and that is load-bearing. The
 * emitted assets are written during `writeBundle`, so the app-shell plugin's
 * later `writeBundle` scan below already sees them: they are hashed into the cache
 * name and precached like every other shell file. A file copied in AFTER that
 * scan would be present in `dist/` but absent from the service worker's
 * transcription, and `tools/assert-dist-clean.mjs` — which recomputes the shell
 * hash from what it finds on disk — would fail the build.
 *
 * Bytes are read from the repository at build time rather than duplicated here,
 * so there is no second copy of a licence text to keep in sync.
 */
function bundledLicenseTexts(): Plugin {
  let repositoryRoot: string | undefined;
  return {
    name: 'bundled-license-texts',
    apply: 'build',
    configResolved(config) {
      repositoryRoot = config.root;
    },
    generateBundle() {
      if (repositoryRoot === undefined) {
        this.error('The repository root is unavailable for licence emission.');
      }
      for (const asset of bundledLicenseAssets(repositoryRoot)) {
        this.emitFile({
          type: 'asset',
          fileName: asset.fileName,
          source: asset.source,
        });
      }
    },
  };
}

export function selectVttHandoffWorkerAsset(assets: readonly BuildAsset[]): BuildAsset {
  const workers = assets.filter((asset) => /(?:^|\/)worker-entry-[^/]+\.js$/u.test(asset.fileName));
  if (workers.length !== 1) {
    throw new Error(
      workers.length === 0
        ? 'The built VTT handoff Worker asset is unavailable.'
        : 'The built VTT handoff Worker asset is ambiguous.',
    );
  }
  return workers[0]!;
}

function vttHandoffArtifactStamp(): Plugin {
  let outputDirectory: string | undefined;
  return {
    name: 'vtt-handoff-artifact-stamp',
    apply: 'build',
    configResolved(config) {
      outputDirectory = resolve(config.root, config.build.outDir);
    },
    writeBundle() {
      if (outputDirectory === undefined) throw new Error('VTT handoff output directory is unavailable.');
      const worker = selectVttHandoffWorkerAsset(deployableAssets(outputDirectory));
      const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'],
      }).trim();
      if (!/^[0-9a-f]{40}$/u.test(commit)) throw new Error('The build commit is invalid.');
      writeFileSync(join(outputDirectory, 'vtt-handoff-artifact.json'), `${JSON.stringify({
        artifact: 'dist',
        commit,

apply patch
patch: completed
/tmp/cohort01-b3-vite.config.mjs
diff --git a//tmp/cohort01-b3-vite.config.mjs b//tmp/cohort01-b3-vite.config.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..ff8b4c56321a3362fc00224b01800f62466f9a1f
--- /dev/null
+++ b//tmp/cohort01-b3-vite.config.mjs
@@ -0,0 +1 @@
+export default {};

diff --git a//tmp/cohort01-b3-vite.config.mjs b//tmp/cohort01-b3-vite.config.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..ff8b4c56321a3362fc00224b01800f62466f9a1f
--- /dev/null
+++ b//tmp/cohort01-b3-vite.config.mjs
@@ -0,0 +1 @@
+export default {};

exec
/bin/bash -lc 'npx vite-node -c /tmp/cohort01-b3-vite.config.mjs tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out /tmp/cohort01-b3-a.BlRksh/arena-basis-brutal-v2' in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
diff --git a//tmp/cohort01-b3-vite.config.mjs b//tmp/cohort01-b3-vite.config.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..ff8b4c56321a3362fc00224b01800f62466f9a1f
--- /dev/null
+++ b//tmp/cohort01-b3-vite.config.mjs
@@ -0,0 +1 @@
+export default {};

 succeeded in 3679ms:
diff --git a//tmp/cohort01-b3-vite.config.mjs b//tmp/cohort01-b3-vite.config.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..ff8b4c56321a3362fc00224b01800f62466f9a1f
--- /dev/null
+++ b//tmp/cohort01-b3-vite.config.mjs
@@ -0,0 +1 @@
+export default {};

exec
/bin/bash -lc 'npx vite-node -c /tmp/cohort01-b3-vite.config.mjs tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out /tmp/cohort01-b3-b.frHiBz/arena-basis-brutal-v2' in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
diff --git a//tmp/cohort01-b3-vite.config.mjs b//tmp/cohort01-b3-vite.config.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..ff8b4c56321a3362fc00224b01800f62466f9a1f
--- /dev/null
+++ b//tmp/cohort01-b3-vite.config.mjs
@@ -0,0 +1 @@
+export default {};

 succeeded in 3822ms:
diff --git a//tmp/cohort01-b3-vite.config.mjs b//tmp/cohort01-b3-vite.config.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..ff8b4c56321a3362fc00224b01800f62466f9a1f
--- /dev/null
+++ b//tmp/cohort01-b3-vite.config.mjs
@@ -0,0 +1 @@
+export default {};

exec
/bin/bash -lc 'diff -rq /tmp/cohort01-b3-a.BlRksh/arena-basis-brutal-v2 /tmp/cohort01-b3-b.frHiBz/arena-basis-brutal-v2; status=$?; printf '"'diff_status=%s\\n' \""'$status"
find /tmp/cohort01-b3-a.BlRksh/arena-basis-brutal-v2 -maxdepth 1 -type f -printf '"'%f\\n' | sort
rg -n \"d466GeneratedRoomOverride|terrainProfile\" tools/generate-arena-basis.ts src tools tests/unit/vtt/arena-basis-brutal-v2.test.ts | head -80
sed -n '1,180p' tools/generate-arena-basis.ts" in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 0ms:
diff_status=0
seed-6209001.json
seed-6209002.json
seed-6209003.json
seed-6209004.json
seed-6209005.json
seed-6209006.json
seed-6209007.json
seed-6209008.json
seed-6209009.json
seed-6209010.json
tools/generate-arena-basis.ts:31:  readonly terrainProfile?: RoomTerrainProfile;
tools/generate-arena-basis.ts:68:  readonly terrainProfile: RoomTerrainProfile | null;
tools/generate-arena-basis.ts:207:  const terrainProfile = parsed.values.get('--terrain-profile');
tools/generate-arena-basis.ts:208:  if (terrainProfile !== undefined && !ROOM_TERRAIN_PROFILES.includes(
tools/generate-arena-basis.ts:209:    terrainProfile as RoomTerrainProfile,
tools/generate-arena-basis.ts:218:    ...(terrainProfile === undefined ? {} : { terrainProfile: terrainProfile as RoomTerrainProfile }),
tools/generate-arena-basis.ts:237:    terrainProfile: Math.floor(localOrdinal / 4) % 2 === 0
tools/generate-arena-basis.ts:253:      ...(config.terrainProfile === undefined ? {} : { terrainProfile: config.terrainProfile }),
tools/generate-arena-basis.ts:347:    ...(schedule.terrainProfile === null ? {} : { terrainProfile: schedule.terrainProfile }),
tools/generate-arena-basis.ts:366:    terrainProfile: schedule.terrainProfile,
tools/generate-arena-basis.ts:535:    terrainProfile: decodeTerrainProfile(record.terrainProfile, `${label}.terrainProfile`),
tools/generate-arena-basis.ts:627:      row.targetXp !== schedule.targetXp || row.terrainProfile !== schedule.terrainProfile ||
tools/generate-arena-basis.ts:712:      (row.terrainProfile === null ? Object.hasOwn(spec, 'terrainProfile') :
tools/generate-arena-basis.ts:713:        spec.terrainProfile !== row.terrainProfile)) {
src/combat/terrain.ts:48:export function terrainProfile(kind: TerrainKind): TerrainProfile {
tools/d569-second-family-manifest.ts:8:import { d466GeneratedRoomOverride } from '../src/vtt/d466-room-overrides';
tools/d569-second-family-manifest.ts:465:        d466GeneratedRoomOverride(fixture.seed) === null,
tools/ai-dm-screenshot-probe.ts:2450:      terrainProfile: 'los_cover_v1',
tools/generate-arena-basis.ts:31:  readonly terrainProfile?: RoomTerrainProfile;
tools/generate-arena-basis.ts:68:  readonly terrainProfile: RoomTerrainProfile | null;
tools/generate-arena-basis.ts:207:  const terrainProfile = parsed.values.get('--terrain-profile');
tools/generate-arena-basis.ts:208:  if (terrainProfile !== undefined && !ROOM_TERRAIN_PROFILES.includes(
tools/generate-arena-basis.ts:209:    terrainProfile as RoomTerrainProfile,
tools/generate-arena-basis.ts:218:    ...(terrainProfile === undefined ? {} : { terrainProfile: terrainProfile as RoomTerrainProfile }),
tools/generate-arena-basis.ts:237:    terrainProfile: Math.floor(localOrdinal / 4) % 2 === 0
tools/generate-arena-basis.ts:253:      ...(config.terrainProfile === undefined ? {} : { terrainProfile: config.terrainProfile }),
tools/generate-arena-basis.ts:347:    ...(schedule.terrainProfile === null ? {} : { terrainProfile: schedule.terrainProfile }),
tools/generate-arena-basis.ts:366:    terrainProfile: schedule.terrainProfile,
tools/generate-arena-basis.ts:535:    terrainProfile: decodeTerrainProfile(record.terrainProfile, `${label}.terrainProfile`),
tools/generate-arena-basis.ts:627:      row.targetXp !== schedule.targetXp || row.terrainProfile !== schedule.terrainProfile ||
tools/generate-arena-basis.ts:712:      (row.terrainProfile === null ? Object.hasOwn(spec, 'terrainProfile') :
tools/generate-arena-basis.ts:713:        spec.terrainProfile !== row.terrainProfile)) {
src/vtt/arena-fixture.ts:157:  ], ['difficultyProfile', 'terrainProfile', 'hardFeatures'], 'arena basis spec');
src/vtt/arena-fixture.ts:175:    ...(Object.hasOwn(spec, 'terrainProfile') ? { terrainProfile: spec['terrainProfile'] as NonNullable<RoomSpec['terrainProfile']> } : {}),
src/vtt/room-generator.ts:38:  d466GeneratedRoomOverride,
src/vtt/room-generator.ts:168:  readonly terrainProfile?: RoomTerrainProfile;
src/vtt/room-generator.ts:210:  readonly terrainProfile?: RoomTerrainProfile;
src/vtt/room-generator.ts:773:  const replacement = d466GeneratedRoomOverride(seed);
src/vtt/room-generator.ts:1415:      terrainProfile: 'los_cover_v1',
src/vtt/room-generator.ts:1428:  return options.terrainProfile === 'los_cover_v1'
src/vtt/d466-room-overrides.ts:141:export function d466GeneratedRoomOverride(seed: number): D466CreatureReplacementRecord | null {
src/vtt/board-chrome.ts:68:import { TERRAIN_KINDS, terrainProfile, type TerrainKind } from '../combat/terrain';
src/vtt/board-chrome.ts:1189:    const profile = terrainProfile(terrainKind);
src/vtt/board-chrome.ts:1230:    tag.dataset.movement = terrainProfile(entry.terrainKind).passability;
src/vtt/board-chrome.ts:1231:    tag.dataset.sight = terrainProfile(entry.terrainKind).blocksSight ? 'blocked' : 'open';
src/vtt/encounter-selectors.ts:4:import { terrainProfile, terrainWallCells } from '../combat/terrain';
src/vtt/encounter-selectors.ts:15:  const profile = terrainProfile(object.terrainKind);
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { EXPECTED_BUNDLED_CONTENT_DIGEST_V1 } from '../src/catalog/bundled-content-digest-v1.expected';
import { monsterCombatantProfile } from '../src/combat/combatant';
import { STARTER_MONSTER_ROSTER } from '../src/combat/statblocks/roster';
import { canonicalJson } from '../src/commands/canonical-json';
import { sha256 } from '../src/crypto/sha256';
import type { HeldoutPartyLevel, HeldoutPartition } from '../src/vtt/heldout-evaluation';
import { loadExternalPartyPackBytes } from '../src/vtt/party-pack';
import { decodeArenaBasisEnvelopeV1 } from '../src/vtt/arena-fixture';
import {
  HELDOUT_ORDINARY_PROTOCOLS,
  HELDOUT_STARTER_MONSTER_FAMILIES,
  ROOM_DIFFICULTY_PROFILES,
  ROOM_TERRAIN_PROFILES,
  generateRoom,
  heldoutMaximizingMonsterRosters,
  type HeldoutOrdinaryProtocol,
  type HeldoutTargetXp,
  type RoomDifficultyProfile,
  type RoomTerrainProfile,
} from '../src/vtt/room-generator';
import { HELDOUT_PARTY_RECIPE_ID, HELDOUT_PARTY_RECIPES } from './generate-heldout-party-basis';

export interface LegacyBasisGenerationConfig {
  readonly difficulty: RoomDifficultyProfile;
  readonly seed: number;
  readonly rooms: number;
  readonly outPath: string;
  readonly terrainProfile?: RoomTerrainProfile;
}

export interface HeldoutBasisGenerationConfig {
  readonly protocol: HeldoutOrdinaryProtocol;
  readonly seed: number;
  readonly rooms: number;
  readonly partyPackPath: string;
  readonly outPath: string;
  readonly manifestPath: string;
}

export interface HeldoutBasisVerificationConfig {
  readonly verifyOnly: true;
  readonly protocol: HeldoutOrdinaryProtocol;
  readonly basisPath: string;
  readonly manifestPath: string;
  readonly manifestSha256: string;
  readonly expectRooms: number;
}

export type BasisGenerationConfig = LegacyBasisGenerationConfig |
  HeldoutBasisGenerationConfig | HeldoutBasisVerificationConfig;

export interface HeldoutBasisPartyManifestRow {
  readonly level: HeldoutPartyLevel;
  readonly path: string;
  readonly sha256: string;
  readonly memberSha256: readonly string[];
}

export interface HeldoutBasisRoomManifestRow {
  readonly ordinal: number;
  readonly partition: HeldoutPartition;
  readonly seed: number;
  readonly partyLevel: HeldoutPartyLevel;
  readonly targetXp: HeldoutTargetXp;
  readonly terrainProfile: RoomTerrainProfile | null;
  readonly partySha256: string;
  readonly path: string;
  readonly sha256: string;
  readonly roster: NonNullable<ReturnType<typeof generateRoom>['spec']['heldoutOrdinary']>;
}

export interface HeldoutBasisManifest {
  readonly format: 'heldout-basis-manifest-v1';
  readonly protocol: HeldoutOrdinaryProtocol;
  readonly generator: 'ordinary-solo-plus-three-v1';
  readonly repoRevision: string;
  readonly bundledContentSha256: typeof EXPECTED_BUNDLED_CONTENT_DIGEST_V1;
  readonly partyRecipeId: typeof HELDOUT_PARTY_RECIPE_ID;
  readonly partyRecipeSha256: string;
  readonly seed: number;
  readonly roomCount: number;
  readonly parties: readonly HeldoutBasisPartyManifestRow[];
  readonly rooms: readonly HeldoutBasisRoomManifestRow[];
  readonly aggregateSha256: string;
}

function requiredValue(argv: readonly string[], index: number, option: string): string {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) throw new TypeError(`${option} requires a value.`);
  return value;
}

function safeInteger(value: string, option: string, minimum: number): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new TypeError(`${option} must be a safe integer greater than or equal to ${String(minimum)}.`);
  }
  return parsed;
}

function parseOptions(argv: readonly string[]): {
  readonly flags: ReadonlySet<string>;
  readonly values: ReadonlyMap<string, string>;
} {
  const args = argv[0] === '--' ? argv.slice(1) : argv;
  const flags = new Set<string>();
  const values = new Map<string, string>();
  const knownFlags = new Set(['--verify-only']);
  const knownValues = new Set([
    '--difficulty', '--seed', '--rooms', '--out', '--terrain-profile', '--protocol',
    '--party-pack-dir', '--manifest', '--basis-dir', '--basis-manifest',
    '--manifest-sha256', '--expect-rooms',
  ]);
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (option === undefined) throw new TypeError('Basis-generator option is missing.');
    if (knownFlags.has(option)) {
      flags.add(option);
      continue;
    }
    if (!knownValues.has(option)) throw new TypeError(`Unknown basis-generator option ${option}.`);
    values.set(option, requiredValue(args, index, option));
    index += 1;
  }
  return { flags, values };
}

function heldoutProtocol(value: string | undefined): HeldoutOrdinaryProtocol | null {
  return HELDOUT_ORDINARY_PROTOCOLS.includes(value as HeldoutOrdinaryProtocol)
    ? value as HeldoutOrdinaryProtocol
    : null;
}

function rejectUnexpectedOptions(
  parsed: ReturnType<typeof parseOptions>,
  allowedValues: ReadonlySet<string>,
  allowedFlags: ReadonlySet<string>,
): void {
  const unexpected = [
    ...[...parsed.values.keys()].filter((option) => !allowedValues.has(option)),
    ...[...parsed.flags].filter((option) => !allowedFlags.has(option)),
  ];
  if (unexpected.length > 0) {
    throw new TypeError(`Options are not valid for this basis mode: ${unexpected.join(', ')}.`);
  }
}

export function parseBasisGenerationArgs(argv: readonly string[]): BasisGenerationConfig {
  const parsed = parseOptions(argv);
  const protocol = heldoutProtocol(parsed.values.get('--protocol'));
  if (parsed.flags.has('--verify-only')) {
    rejectUnexpectedOptions(parsed, new Set([
      '--protocol', '--basis-dir', '--basis-manifest', '--manifest-sha256', '--expect-rooms',
    ]), new Set(['--verify-only']));
    if (protocol === null) {
      throw new TypeError('--protocol must be heldout-ordinary-v1 or heldout-development-v1.');
    }
    const basisPath = parsed.values.get('--basis-dir');
    const manifestPath = parsed.values.get('--basis-manifest');
    const manifestSha256 = parsed.values.get('--manifest-sha256');
    if (basisPath === undefined || manifestPath === undefined || manifestSha256 === undefined) {
      throw new TypeError('--verify-only requires --basis-dir, --basis-manifest, and --manifest-sha256.');
    }
    return {
      verifyOnly: true,
      protocol,
      basisPath: resolve(basisPath),
      manifestPath: resolve(manifestPath),
      manifestSha256,
      expectRooms: safeInteger(parsed.values.get('--expect-rooms') ?? '', '--expect-rooms', 1),
    };
  }
  if (protocol !== null) {
    rejectUnexpectedOptions(parsed, new Set([
      '--protocol', '--seed', '--rooms', '--party-pack-dir', '--out', '--manifest',
    ]), new Set());
    const out = parsed.values.get('--out');

diff --git a//tmp/cohort01-b3-vite.config.mjs b//tmp/cohort01-b3-vite.config.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..ff8b4c56321a3362fc00224b01800f62466f9a1f
--- /dev/null
+++ b//tmp/cohort01-b3-vite.config.mjs
@@ -0,0 +1 @@
+export default {};

apply patch
patch: completed
/tmp/cohort01-b3-validate.ts
diff --git a//tmp/cohort01-b3-validate.ts b//tmp/cohort01-b3-validate.ts
new file mode 100644
index 0000000000000000000000000000000000000000..464ce8f228cf529f9572c6fff079a3b71e898651
--- /dev/null
+++ b//tmp/cohort01-b3-validate.ts
@@ -0,0 +1,104 @@
+import { readFileSync, readdirSync } from 'node:fs';
+import { join } from 'node:path';
+import { traceCombatantLine } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/cover';
+import type { EncounterState } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/encounter';
+import type { CombatantId } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/values';
+import {
+  availableEngineActorOptions,
+  resolveEngineActorOption,
+  type ResolvedActionSlotUse,
+  type ResolvedTurnMechanics,
+} from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intent-resolver';
+import { decodeArenaFixtureText } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/entrypoint';
+import { freshMonsterPlanningState } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/monster-planning-state';
+import { buildOfferEnvironment } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/offers/build-offer-environment';
+import type { GeneratedRoom } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/room-generator';
+import { d466GeneratedRoomOverride } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/d466-room-overrides';
+import {
+  brutalRoomMembershipViolations,
+  generatedRoomIntegrityViolations,
+} from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tools/d569-second-family-manifest';
+
+const directory = process.argv[2];
+if (directory === undefined) throw new TypeError('fixture directory required');
+const environment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+
+function targetedOffenseHasOpenTrace(
+  state: EncounterState,
+  mechanics: ResolvedTurnMechanics,
+  slot: ResolvedActionSlotUse,
+): boolean {
+  if (slot.kind !== 'attack' && slot.kind !== 'saving_throw' && slot.kind !== 'cast_spell') {
+    return true;
+  }
+  return slot.targetIds.every((targetId) => {
+    const trace = traceCombatantLine(state, mechanics.actorId, targetId, {
+      sourceAnchor: mechanics.finalPosition,
+    });
+    return !trace.blocksSight && trace.tier !== 'total';
+  });
+}
+
+function resolvedMechanicsIsProductive(
+  state: EncounterState,
+  mechanics: ResolvedTurnMechanics,
+): boolean {
+  const hasProductiveComponent = mechanics.movementCostFeet > 0 ||
+    mechanics.actionSlots.some((slot) =>
+      slot.kind === 'attack' || slot.kind === 'saving_throw' || slot.kind === 'cast_spell' ||
+      slot.kind === 'use_world_object');
+  if (!hasProductiveComponent) return false;
+  return mechanics.actionSlots.every((slot) => targetedOffenseHasOpenTrace(state, mechanics, slot));
+}
+
+function productiveWitness(state: EncounterState, actorId: CombatantId) {
+  for (const option of availableEngineActorOptions(state, actorId, environment)) {
+    const resolution = resolveEngineActorOption(state, option, environment);
+    if (!resolution.valid || !resolvedMechanicsIsProductive(state, resolution.mechanics)) continue;
+    const traces = resolution.mechanics.actionSlots.flatMap((slot) => {
+      if (slot.kind !== 'attack' && slot.kind !== 'saving_throw' && slot.kind !== 'cast_spell') {
+        return [];
+      }
+      return slot.targetIds.map((targetId) => {
+        const trace = traceCombatantLine(state, resolution.mechanics.actorId, targetId, {
+          sourceAnchor: resolution.mechanics.finalPosition,
+        });
+        return { kind: slot.kind, targetId, tier: trace.tier, blocksSight: trace.blocksSight };
+      });
+    });
+    return {
+      label: option.label,
+      movementCostFeet: resolution.mechanics.movementCostFeet,
+      actionKinds: resolution.mechanics.actionSlots.map(({ kind }) => kind),
+      traces,
+    };
+  }
+  return null;
+}
+
+const rows = readdirSync(directory).sort().map((name) => {
+  const bytes = readFileSync(join(directory, name), 'utf8');
+  const room = JSON.parse(bytes) as GeneratedRoom;
+  const state = freshMonsterPlanningState(decodeArenaFixtureText(bytes));
+  const living = state.combatants.filter((combatant) =>
+    combatant.profile.kind === 'monster' && combatant.life === 'living');
+  const witnesses = living.map((monster) => ({
+    actorId: monster.profile.id,
+    witness: productiveWitness(state, monster.profile.id),
+  }));
+  return {
+    seed: room.spec.seed,
+    integrity: generatedRoomIntegrityViolations(room, bytes),
+    structural: brutalRoomMembershipViolations(room)
+      .filter((violation) => violation.code !== 'brutal_productivity'),
+    terrainProfilePresent: Object.hasOwn(room.spec, 'terrainProfile'),
+    d466Override: d466GeneratedRoomOverride(room.spec.seed),
+    livingMonsters: living.length,
+    productiveMonsters: witnesses.filter(({ witness }) => witness !== null).length,
+    witnesses,
+  };
+});
+console.log(JSON.stringify(rows, null, 2));
+if (rows.some((row) => row.integrity.length > 0 || row.structural.length > 0 ||
+  row.terrainProfilePresent || row.d466Override !== null ||
+  row.livingMonsters !== row.productiveMonsters)) process.exitCode = 1;
diff --git a//tmp/cohort01-b3-vite.config.mjs b//tmp/cohort01-b3-vite.config.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..ff8b4c56321a3362fc00224b01800f62466f9a1f
--- /dev/null
+++ b//tmp/cohort01-b3-vite.config.mjs
@@ -0,0 +1 @@
+export default {};

diff --git a//tmp/cohort01-b3-validate.ts b//tmp/cohort01-b3-validate.ts
new file mode 100644
index 0000000000000000000000000000000000000000..464ce8f228cf529f9572c6fff079a3b71e898651
--- /dev/null
+++ b//tmp/cohort01-b3-validate.ts
@@ -0,0 +1,104 @@
+import { readFileSync, readdirSync } from 'node:fs';
+import { join } from 'node:path';
+import { traceCombatantLine } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/cover';
+import type { EncounterState } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/encounter';
+import type { CombatantId } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/values';
+import {
+  availableEngineActorOptions,
+  resolveEngineActorOption,
+  type ResolvedActionSlotUse,
+  type ResolvedTurnMechanics,
+} from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intent-resolver';
+import { decodeArenaFixtureText } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/entrypoint';
+import { freshMonsterPlanningState } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/monster-planning-state';
+import { buildOfferEnvironment } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/offers/build-offer-environment';
+import type { GeneratedRoom } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/room-generator';
+import { d466GeneratedRoomOverride } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/d466-room-overrides';
+import {
+  brutalRoomMembershipViolations,
+  generatedRoomIntegrityViolations,
+} from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tools/d569-second-family-manifest';
+
+const directory = process.argv[2];
+if (directory === undefined) throw new TypeError('fixture directory required');
+const environment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+
+function targetedOffenseHasOpenTrace(
+  state: EncounterState,
+  mechanics: ResolvedTurnMechanics,
+  slot: ResolvedActionSlotUse,
+): boolean {
+  if (slot.kind !== 'attack' && slot.kind !== 'saving_throw' && slot.kind !== 'cast_spell') {
+    return true;
+  }
+  return slot.targetIds.every((targetId) => {
+    const trace = traceCombatantLine(state, mechanics.actorId, targetId, {
+      sourceAnchor: mechanics.finalPosition,
+    });
+    return !trace.blocksSight && trace.tier !== 'total';
+  });
+}
+
+function resolvedMechanicsIsProductive(
+  state: EncounterState,
+  mechanics: ResolvedTurnMechanics,
+): boolean {
+  const hasProductiveComponent = mechanics.movementCostFeet > 0 ||
+    mechanics.actionSlots.some((slot) =>
+      slot.kind === 'attack' || slot.kind === 'saving_throw' || slot.kind === 'cast_spell' ||
+      slot.kind === 'use_world_object');
+  if (!hasProductiveComponent) return false;
+  return mechanics.actionSlots.every((slot) => targetedOffenseHasOpenTrace(state, mechanics, slot));
+}
+
+function productiveWitness(state: EncounterState, actorId: CombatantId) {
+  for (const option of availableEngineActorOptions(state, actorId, environment)) {
+    const resolution = resolveEngineActorOption(state, option, environment);
+    if (!resolution.valid || !resolvedMechanicsIsProductive(state, resolution.mechanics)) continue;
+    const traces = resolution.mechanics.actionSlots.flatMap((slot) => {
+      if (slot.kind !== 'attack' && slot.kind !== 'saving_throw' && slot.kind !== 'cast_spell') {
+        return [];
+      }
+      return slot.targetIds.map((targetId) => {
+        const trace = traceCombatantLine(state, resolution.mechanics.actorId, targetId, {
+          sourceAnchor: resolution.mechanics.finalPosition,
+        });
+        return { kind: slot.kind, targetId, tier: trace.tier, blocksSight: trace.blocksSight };
+      });
+    });
+    return {
+      label: option.label,
+      movementCostFeet: resolution.mechanics.movementCostFeet,
+      actionKinds: resolution.mechanics.actionSlots.map(({ kind }) => kind),
+      traces,
+    };
+  }
+  return null;
+}
+
+const rows = readdirSync(directory).sort().map((name) => {
+  const bytes = readFileSync(join(directory, name), 'utf8');
+  const room = JSON.parse(bytes) as GeneratedRoom;
+  const state = freshMonsterPlanningState(decodeArenaFixtureText(bytes));
+  const living = state.combatants.filter((combatant) =>
+    combatant.profile.kind === 'monster' && combatant.life === 'living');
+  const witnesses = living.map((monster) => ({
+    actorId: monster.profile.id,
+    witness: productiveWitness(state, monster.profile.id),
+  }));
+  return {
+    seed: room.spec.seed,
+    integrity: generatedRoomIntegrityViolations(room, bytes),
+    structural: brutalRoomMembershipViolations(room)
+      .filter((violation) => violation.code !== 'brutal_productivity'),
+    terrainProfilePresent: Object.hasOwn(room.spec, 'terrainProfile'),
+    d466Override: d466GeneratedRoomOverride(room.spec.seed),
+    livingMonsters: living.length,
+    productiveMonsters: witnesses.filter(({ witness }) => witness !== null).length,
+    witnesses,
+  };
+});
+console.log(JSON.stringify(rows, null, 2));
+if (rows.some((row) => row.integrity.length > 0 || row.structural.length > 0 ||
+  row.terrainProfilePresent || row.d466Override !== null ||
+  row.livingMonsters !== row.productiveMonsters)) process.exitCode = 1;
diff --git a//tmp/cohort01-b3-vite.config.mjs b//tmp/cohort01-b3-vite.config.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..ff8b4c56321a3362fc00224b01800f62466f9a1f
--- /dev/null
+++ b//tmp/cohort01-b3-vite.config.mjs
@@ -0,0 +1 @@
+export default {};

exec
/bin/bash -lc 'npx vite-node -c /tmp/cohort01-b3-vite.config.mjs /tmp/cohort01-b3-validate.ts -- /tmp/cohort01-b3-a.BlRksh/arena-basis-brutal-v2' in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
diff --git a//tmp/cohort01-b3-validate.ts b//tmp/cohort01-b3-validate.ts
new file mode 100644
index 0000000000000000000000000000000000000000..464ce8f228cf529f9572c6fff079a3b71e898651
--- /dev/null
+++ b//tmp/cohort01-b3-validate.ts
@@ -0,0 +1,104 @@
+import { readFileSync, readdirSync } from 'node:fs';
+import { join } from 'node:path';
+import { traceCombatantLine } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/cover';
+import type { EncounterState } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/encounter';
+import type { CombatantId } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/values';
+import {
+  availableEngineActorOptions,
+  resolveEngineActorOption,
+  type ResolvedActionSlotUse,
+  type ResolvedTurnMechanics,
+} from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intent-resolver';
+import { decodeArenaFixtureText } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/entrypoint';
+import { freshMonsterPlanningState } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/monster-planning-state';
+import { buildOfferEnvironment } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/offers/build-offer-environment';
+import type { GeneratedRoom } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/room-generator';
+import { d466GeneratedRoomOverride } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/d466-room-overrides';
+import {
+  brutalRoomMembershipViolations,
+  generatedRoomIntegrityViolations,
+} from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tools/d569-second-family-manifest';
+
+const directory = process.argv[2];
+if (directory === undefined) throw new TypeError('fixture directory required');
+const environment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+
+function targetedOffenseHasOpenTrace(
+  state: EncounterState,
+  mechanics: ResolvedTurnMechanics,
+  slot: ResolvedActionSlotUse,
+): boolean {
+  if (slot.kind !== 'attack' && slot.kind !== 'saving_throw' && slot.kind !== 'cast_spell') {
+    return true;
+  }
+  return slot.targetIds.every((targetId) => {
+    const trace = traceCombatantLine(state, mechanics.actorId, targetId, {
+      sourceAnchor: mechanics.finalPosition,
+    });
+    return !trace.blocksSight && trace.tier !== 'total';
+  });
+}
+
+function resolvedMechanicsIsProductive(
+  state: EncounterState,
+  mechanics: ResolvedTurnMechanics,
+): boolean {
+  const hasProductiveComponent = mechanics.movementCostFeet > 0 ||
+    mechanics.actionSlots.some((slot) =>
+      slot.kind === 'attack' || slot.kind === 'saving_throw' || slot.kind === 'cast_spell' ||
+      slot.kind === 'use_world_object');
+  if (!hasProductiveComponent) return false;
+  return mechanics.actionSlots.every((slot) => targetedOffenseHasOpenTrace(state, mechanics, slot));
+}
+
+function productiveWitness(state: EncounterState, actorId: CombatantId) {
+  for (const option of availableEngineActorOptions(state, actorId, environment)) {
+    const resolution = resolveEngineActorOption(state, option, environment);
+    if (!resolution.valid || !resolvedMechanicsIsProductive(state, resolution.mechanics)) continue;
+    const traces = resolution.mechanics.actionSlots.flatMap((slot) => {
+      if (slot.kind !== 'attack' && slot.kind !== 'saving_throw' && slot.kind !== 'cast_spell') {
+        return [];
+      }
+      return slot.targetIds.map((targetId) => {
+        const trace = traceCombatantLine(state, resolution.mechanics.actorId, targetId, {
+          sourceAnchor: resolution.mechanics.finalPosition,
+        });
+        return { kind: slot.kind, targetId, tier: trace.tier, blocksSight: trace.blocksSight };
+      });
+    });
+    return {
+      label: option.label,
+      movementCostFeet: resolution.mechanics.movementCostFeet,
+      actionKinds: resolution.mechanics.actionSlots.map(({ kind }) => kind),
+      traces,
+    };
+  }
+  return null;
+}
+
+const rows = readdirSync(directory).sort().map((name) => {
+  const bytes = readFileSync(join(directory, name), 'utf8');
+  const room = JSON.parse(bytes) as GeneratedRoom;
+  const state = freshMonsterPlanningState(decodeArenaFixtureText(bytes));
+  const living = state.combatants.filter((combatant) =>
+    combatant.profile.kind === 'monster' && combatant.life === 'living');
+  const witnesses = living.map((monster) => ({
+    actorId: monster.profile.id,
+    witness: productiveWitness(state, monster.profile.id),
+  }));
+  return {
+    seed: room.spec.seed,
+    integrity: generatedRoomIntegrityViolations(room, bytes),
+    structural: brutalRoomMembershipViolations(room)
+      .filter((violation) => violation.code !== 'brutal_productivity'),
+    terrainProfilePresent: Object.hasOwn(room.spec, 'terrainProfile'),
+    d466Override: d466GeneratedRoomOverride(room.spec.seed),
+    livingMonsters: living.length,
+    productiveMonsters: witnesses.filter(({ witness }) => witness !== null).length,
+    witnesses,
+  };
+});
+console.log(JSON.stringify(rows, null, 2));
+if (rows.some((row) => row.integrity.length > 0 || row.structural.length > 0 ||
+  row.terrainProfilePresent || row.d466Override !== null ||
+  row.livingMonsters !== row.productiveMonsters)) process.exitCode = 1;
diff --git a//tmp/cohort01-b3-vite.config.mjs b//tmp/cohort01-b3-vite.config.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..ff8b4c56321a3362fc00224b01800f62466f9a1f
--- /dev/null
+++ b//tmp/cohort01-b3-vite.config.mjs
@@ -0,0 +1 @@
+export default {};

 exited 1 in 6093ms:
[
  {
    "seed": 6209001,
    "integrity": [],
    "structural": [],
    "terrainProfilePresent": false,
    "d466Override": null,
    "livingMonsters": 4,
    "productiveMonsters": 1,
    "witnesses": [
      {
        "actorId": "combatant:generated-6209001-monster-1",
        "witness": {
          "label": "Dash + divine-aid/bless (3/3)",
          "movementCostFeet": 0,
          "actionKinds": [
            "dash",
            "cast_spell"
          ],
          "traces": [
            {
              "kind": "cast_spell",
              "targetId": "combatant:generated-6209001-monster-1",
              "tier": "none",
              "blocksSight": false
            },
            {
              "kind": "cast_spell",
              "targetId": "combatant:generated-6209001-monster-2",
              "tier": "none",
              "blocksSight": false
            },
            {
              "kind": "cast_spell",
              "targetId": "combatant:generated-6209001-monster-3",
              "tier": "none",
              "blocksSight": false
            }
          ]
        }
      },
      {
        "actorId": "combatant:generated-6209001-monster-2",
        "witness": null
      },
      {
        "actorId": "combatant:generated-6209001-monster-3",
        "witness": null
      },
      {
        "actorId": "combatant:generated-6209001-monster-4",
        "witness": null
      }
    ]
  },
  {
    "seed": 6209002,
    "integrity": [],
    "structural": [],
    "terrainProfilePresent": false,
    "d466Override": null,
    "livingMonsters": 5,
    "productiveMonsters": 5,
    "witnesses": [
      {
        "actorId": "combatant:generated-6209002-monster-1",
        "witness": {
          "label": "Dash",
          "movementCostFeet": 60,
          "actionKinds": [
            "dash"
          ],
          "traces": []
        }
      },
      {
        "actorId": "combatant:generated-6209002-monster-2",
        "witness": {
          "label": "Dash",
          "movementCostFeet": 55,
          "actionKinds": [
            "dash"
          ],
          "traces": []
        }
      },
      {
        "actorId": "combatant:generated-6209002-monster-3",
        "witness": {
          "label": "Dash",
          "movementCostFeet": 20,
          "actionKinds": [
            "dash"
          ],
          "traces": []
        }
      },
      {
        "actorId": "combatant:generated-6209002-monster-4",
        "witness": {
          "label": "Dash",
          "movementCostFeet": 45,
          "actionKinds": [
            "dash"
          ],
          "traces": []
        }
      },
      {
        "actorId": "combatant:generated-6209002-monster-5",
        "witness": {
          "label": "Dash",
          "movementCostFeet": 50,
          "actionKinds": [
            "dash"
          ],
          "traces": []
        }
      }
    ]
  },
  {
    "seed": 6209003,
    "integrity": [],
    "structural": [],
    "terrainProfilePresent": false,
    "d466Override": null,
    "livingMonsters": 5,
    "productiveMonsters": 2,
    "witnesses": [
      {
        "actorId": "combatant:generated-6209003-monster-1",
        "witness": {
          "label": "Dash + divine-aid/bless (1/1)",
          "movementCostFeet": 0,
          "actionKinds": [
            "dash",
            "cast_spell"
          ],
          "traces": [
            {
              "kind": "cast_spell",
              "targetId": "combatant:generated-6209003-monster-1",
              "tier": "none",
              "blocksSight": false
            },
            {
              "kind": "cast_spell",
              "targetId": "combatant:generated-6209003-monster-2",
              "tier": "none",
              "blocksSight": false
            },
            {
              "kind": "cast_spell",
              "targetId": "combatant:generated-6209003-monster-3",
              "tier": "none",
              "blocksSight": false
            }
          ]
        }
      },
      {
        "actorId": "combatant:generated-6209003-monster-2",
        "witness": {
          "label": "Web -> combatant:wizard",
          "movementCostFeet": 35,
          "actionKinds": [
            "saving_throw"
          ],
          "traces": [
            {
              "kind": "saving_throw",
              "targetId": "combatant:wizard",
              "tier": "three_quarters",
              "blocksSight": false
            }
          ]
        }
      },
      {
        "actorId": "combatant:generated-6209003-monster-3",
        "witness": null
      },
      {
        "actorId": "combatant:generated-6209003-monster-4",
        "witness": null
      },
      {
        "actorId": "combatant:generated-6209003-monster-5",
        "witness": null
      }
    ]
  },
  {
    "seed": 6209004,
    "integrity": [],
    "structural": [],
    "terrainProfilePresent": false,
    "d466Override": null,
    "livingMonsters": 3,
    "productiveMonsters": 1,
    "witnesses": [
      {
        "actorId": "combatant:generated-6209004-monster-1",
        "witness": {
          "label": "Dash + Unicorn’s Blessing/Cure Wounds (3/3)",
          "movementCostFeet": 0,
          "actionKinds": [
            "dash",
            "cast_spell"
          ],
          "traces": [
            {
              "kind": "cast_spell",
              "targetId": "combatant:generated-6209004-monster-2",
              "tier": "none",
              "blocksSight": false
            }
          ]
        }
      },
      {
        "actorId": "combatant:generated-6209004-monster-2",
        "witness": null
      },
      {
        "actorId": "combatant:generated-6209004-monster-3",
        "witness": null
      }
    ]
  },
  {
    "seed": 6209005,
    "integrity": [],
    "structural": [],
    "terrainProfilePresent": false,
    "d466Override": null,
    "livingMonsters": 6,
    "productiveMonsters": 1,
    "witnesses": [
      {
        "actorId": "combatant:generated-6209005-monster-1",
        "witness": null
      },
      {
        "actorId": "combatant:generated-6209005-monster-2",
        "witness": null
      },
      {
        "actorId": "combatant:generated-6209005-monster-3",
        "witness": null
      },
      {
        "actorId": "combatant:generated-6209005-monster-4",
        "witness": null
      },
      {
        "actorId": "combatant:generated-6209005-monster-5",
        "witness": null
      },
      {
        "actorId": "combatant:generated-6209005-monster-6",
        "witness": {
          "label": "Light Crossbow -> combatant:cleric",
          "movementCostFeet": 25,
          "actionKinds": [
            "attack"
          ],
          "traces": [
            {
              "kind": "attack",
              "targetId": "combatant:cleric",
              "tier": "none",
              "blocksSight": false
            }
          ]
        }
      }
    ]
  },
  {
    "seed": 6209006,
    "integrity": [],
    "structural": [],
    "terrainProfilePresent": false,
    "d466Override": null,
    "livingMonsters": 5,
    "productiveMonsters": 1,
    "witnesses": [
      {
        "actorId": "combatant:generated-6209006-monster-1",
        "witness": {
          "label": "Dash + cinder-aid/healing-word (3/3)",
          "movementCostFeet": 0,
          "actionKinds": [
            "dash",
            "cast_spell"
          ],
          "traces": [
            {
              "kind": "cast_spell",
              "targetId": "combatant:generated-6209006-monster-1",
              "tier": "none",
              "blocksSight": false
            }
          ]
        }
      },
      {
        "actorId": "combatant:generated-6209006-monster-2",
        "witness": null
      },
      {
        "actorId": "combatant:generated-6209006-monster-3",
        "witness": null
      },
      {
        "actorId": "combatant:generated-6209006-monster-4",
        "witness": null
      },
      {
        "actorId": "combatant:generated-6209006-monster-5",
        "witness": null
      }
    ]
  },
  {
    "seed": 6209007,
    "integrity": [],
    "structural": [],
    "terrainProfilePresent": false,
    "d466Override": null,
    "livingMonsters": 3,
    "productiveMonsters": 1,
    "witnesses": [
      {
        "actorId": "combatant:generated-6209007-monster-1",
        "witness": {
          "label": "Dash + divine-aid/bless (1/1)",
          "movementCostFeet": 0,
          "actionKinds": [
            "dash",
            "cast_spell"
          ],
          "traces": [
            {
              "kind": "cast_spell",
              "targetId": "combatant:generated-6209007-monster-1",
              "tier": "none",
              "blocksSight": false
            },
            {
              "kind": "cast_spell",
              "targetId": "combatant:generated-6209007-monster-2",
              "tier": "none",
              "blocksSight": false
            },
            {
              "kind": "cast_spell",
              "targetId": "combatant:generated-6209007-monster-3",
              "tier": "none",
              "blocksSight": false
            }
          ]
        }
      },
      {
        "actorId": "combatant:generated-6209007-monster-2",
        "witness": null
      },
      {
        "actorId": "combatant:generated-6209007-monster-3",
        "witness": null
      }
    ]
  },
  {
    "seed": 6209008,
    "integrity": [],
    "structural": [],
    "terrainProfilePresent": false,
    "d466Override": null,
    "livingMonsters": 7,
    "productiveMonsters": 1,
    "witnesses": [
      {
        "actorId": "combatant:generated-6209008-monster-1",
        "witness": {
          "label": "Dash + divine-aid/bless (1/1)",
          "movementCostFeet": 0,
          "actionKinds": [
            "dash",
            "cast_spell"
          ],
          "traces": [
            {
              "kind": "cast_spell",
              "targetId": "combatant:generated-6209008-monster-1",
              "tier": "none",
              "blocksSight": false
            },
            {
              "kind": "cast_spell",
              "targetId": "combatant:generated-6209008-monster-2",
              "tier": "none",
              "blocksSight": false
            },
            {
              "kind": "cast_spell",
              "targetId": "combatant:generated-6209008-monster-3",
              "tier": "none",
              "blocksSight": false
            }
          ]
        }
      },
      {
        "actorId": "combatant:generated-6209008-monster-2",
        "witness": null
      },
      {
        "actorId": "combatant:generated-6209008-monster-3",
        "witness": null
      },
      {
        "actorId": "combatant:generated-6209008-monster-4",
        "witness": null
      },
      {
        "actorId": "combatant:generated-6209008-monster-5",
        "witness": null
      },
      {
        "actorId": "combatant:generated-6209008-monster-6",
        "witness": null
      },
      {
        "actorId": "combatant:generated-6209008-monster-7",
        "witness": null
      }
    ]
  },
  {
    "seed": 6209009,
    "integrity": [],
    "structural": [],
    "terrainProfilePresent": false,
    "d466Override": null,
    "livingMonsters": 5,
    "productiveMonsters": 5,
    "witnesses": [
      {
        "actorId": "combatant:generated-6209009-monster-1",
        "witness": {
          "label": "Dash",
          "movementCostFeet": 60,
          "actionKinds": [
            "dash"
          ],
          "traces": []
        }
      },
      {
        "actorId": "combatant:generated-6209009-monster-2",
        "witness": {
          "label": "Dash",
          "movementCostFeet": 20,
          "actionKinds": [
            "dash"
          ],
          "traces": []
        }
      },
      {
        "actorId": "combatant:generated-6209009-monster-3",
        "witness": {
          "label": "Dash",
          "movementCostFeet": 20,
          "actionKinds": [
            "dash"
          ],
          "traces": []
        }
      },
      {
        "actorId": "combatant:generated-6209009-monster-4",
        "witness": {
          "label": "Dash",
          "movementCostFeet": 60,
          "actionKinds": [
            "dash"
          ],
          "traces": []
        }
      },
      {
        "actorId": "combatant:generated-6209009-monster-5",
        "witness": {
          "label": "Dash",
          "movementCostFeet": 60,
          "actionKinds": [
            "dash"
          ],
          "traces": []
        }
      }
    ]
  },
  {
    "seed": 6209010,
    "integrity": [],
    "structural": [],
    "terrainProfilePresent": false,
    "d466Override": null,
    "livingMonsters": 3,
    "productiveMonsters": 1,
    "witnesses": [
      {
        "actorId": "combatant:generated-6209010-monster-1",
        "witness": {
          "label": "Dash + divine-aid/bless (3/3)",
          "movementCostFeet": 0,
          "actionKinds": [
            "dash",
            "cast_spell"
          ],
          "traces": [
            {
              "kind": "cast_spell",
              "targetId": "combatant:generated-6209010-monster-1",
              "tier": "none",
              "blocksSight": false
            },
            {
              "kind": "cast_spell",
              "targetId": "combatant:generated-6209010-monster-2",
              "tier": "none",
              "blocksSight": false
            },
            {
              "kind": "cast_spell",
              "targetId": "combatant:generated-6209010-monster-3",
              "tier": "none",
              "blocksSight": false
            }
          ]
        }
      },
      {
        "actorId": "combatant:generated-6209010-monster-2",
        "witness": null
      },
      {
        "actorId": "combatant:generated-6209010-monster-3",
        "witness": null
      }
    ]
  }
]

diff --git a//tmp/cohort01-b3-validate.ts b//tmp/cohort01-b3-validate.ts
new file mode 100644
index 0000000000000000000000000000000000000000..464ce8f228cf529f9572c6fff079a3b71e898651
--- /dev/null
+++ b//tmp/cohort01-b3-validate.ts
@@ -0,0 +1,104 @@
+import { readFileSync, readdirSync } from 'node:fs';
+import { join } from 'node:path';
+import { traceCombatantLine } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/cover';
+import type { EncounterState } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/encounter';
+import type { CombatantId } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/values';
+import {
+  availableEngineActorOptions,
+  resolveEngineActorOption,
+  type ResolvedActionSlotUse,
+  type ResolvedTurnMechanics,
+} from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intent-resolver';
+import { decodeArenaFixtureText } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/entrypoint';
+import { freshMonsterPlanningState } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/monster-planning-state';
+import { buildOfferEnvironment } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/offers/build-offer-environment';
+import type { GeneratedRoom } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/room-generator';
+import { d466GeneratedRoomOverride } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/d466-room-overrides';
+import {
+  brutalRoomMembershipViolations,
+  generatedRoomIntegrityViolations,
+} from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tools/d569-second-family-manifest';
+
+const directory = process.argv[2];
+if (directory === undefined) throw new TypeError('fixture directory required');
+const environment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+
+function targetedOffenseHasOpenTrace(
+  state: EncounterState,
+  mechanics: ResolvedTurnMechanics,
+  slot: ResolvedActionSlotUse,
+): boolean {
+  if (slot.kind !== 'attack' && slot.kind !== 'saving_throw' && slot.kind !== 'cast_spell') {
+    return true;
+  }
+  return slot.targetIds.every((targetId) => {
+    const trace = traceCombatantLine(state, mechanics.actorId, targetId, {
+      sourceAnchor: mechanics.finalPosition,
+    });
+    return !trace.blocksSight && trace.tier !== 'total';
+  });
+}
+
+function resolvedMechanicsIsProductive(
+  state: EncounterState,
+  mechanics: ResolvedTurnMechanics,
+): boolean {
+  const hasProductiveComponent = mechanics.movementCostFeet > 0 ||
+    mechanics.actionSlots.some((slot) =>
+      slot.kind === 'attack' || slot.kind === 'saving_throw' || slot.kind === 'cast_spell' ||
+      slot.kind === 'use_world_object');
+  if (!hasProductiveComponent) return false;
+  return mechanics.actionSlots.every((slot) => targetedOffenseHasOpenTrace(state, mechanics, slot));
+}
+
+function productiveWitness(state: EncounterState, actorId: CombatantId) {
+  for (const option of availableEngineActorOptions(state, actorId, environment)) {
+    const resolution = resolveEngineActorOption(state, option, environment);
+    if (!resolution.valid || !resolvedMechanicsIsProductive(state, resolution.mechanics)) continue;
+    const traces = resolution.mechanics.actionSlots.flatMap((slot) => {
+      if (slot.kind !== 'attack' && slot.kind !== 'saving_throw' && slot.kind !== 'cast_spell') {
+        return [];
+      }
+      return slot.targetIds.map((targetId) => {
+        const trace = traceCombatantLine(state, resolution.mechanics.actorId, targetId, {
+          sourceAnchor: resolution.mechanics.finalPosition,
+        });
+        return { kind: slot.kind, targetId, tier: trace.tier, blocksSight: trace.blocksSight };
+      });
+    });
+    return {
+      label: option.label,
+      movementCostFeet: resolution.mechanics.movementCostFeet,
+      actionKinds: resolution.mechanics.actionSlots.map(({ kind }) => kind),
+      traces,
+    };
+  }
+  return null;
+}
+
+const rows = readdirSync(directory).sort().map((name) => {
+  const bytes = readFileSync(join(directory, name), 'utf8');
+  const room = JSON.parse(bytes) as GeneratedRoom;
+  const state = freshMonsterPlanningState(decodeArenaFixtureText(bytes));
+  const living = state.combatants.filter((combatant) =>
+    combatant.profile.kind === 'monster' && combatant.life === 'living');
+  const witnesses = living.map((monster) => ({
+    actorId: monster.profile.id,
+    witness: productiveWitness(state, monster.profile.id),
+  }));
+  return {
+    seed: room.spec.seed,
+    integrity: generatedRoomIntegrityViolations(room, bytes),
+    structural: brutalRoomMembershipViolations(room)
+      .filter((violation) => violation.code !== 'brutal_productivity'),
+    terrainProfilePresent: Object.hasOwn(room.spec, 'terrainProfile'),
+    d466Override: d466GeneratedRoomOverride(room.spec.seed),
+    livingMonsters: living.length,
+    productiveMonsters: witnesses.filter(({ witness }) => witness !== null).length,
+    witnesses,
+  };
+});
+console.log(JSON.stringify(rows, null, 2));
+if (rows.some((row) => row.integrity.length > 0 || row.structural.length > 0 ||
+  row.terrainProfilePresent || row.d466Override !== null ||
+  row.livingMonsters !== row.productiveMonsters)) process.exitCode = 1;
diff --git a//tmp/cohort01-b3-vite.config.mjs b//tmp/cohort01-b3-vite.config.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..ff8b4c56321a3362fc00224b01800f62466f9a1f
--- /dev/null
+++ b//tmp/cohort01-b3-vite.config.mjs
@@ -0,0 +1 @@
+export default {};

codex
The all-or-nothing membership gate failed, so I am rejecting all ten 6209 fixtures and will not copy or hash any of them. Integrity, structural brutal checks, terrain-profile absence, and D466 absence passed 10/10, but decoded live productivity failed in 8/10 rooms (only seeds 6209002 and 6209009 had every living monster productive). Per the frozen replacement procedure, I’m auditing the next contiguous namespace only, then stopping for supervisor amendment.
exec
/bin/bash -lc "rg -n -o -e '6212[0-9]{3}|6_212_[0-9]{3}|6212xxx' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md" in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 exited 1 in 0ms:
diff --git a//tmp/cohort01-b3-validate.ts b//tmp/cohort01-b3-validate.ts
new file mode 100644
index 0000000000000000000000000000000000000000..464ce8f228cf529f9572c6fff079a3b71e898651
--- /dev/null
+++ b//tmp/cohort01-b3-validate.ts
@@ -0,0 +1,104 @@
+import { readFileSync, readdirSync } from 'node:fs';
+import { join } from 'node:path';
+import { traceCombatantLine } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/cover';
+import type { EncounterState } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/encounter';
+import type { CombatantId } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/values';
+import {
+  availableEngineActorOptions,
+  resolveEngineActorOption,
+  type ResolvedActionSlotUse,
+  type ResolvedTurnMechanics,
+} from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intent-resolver';
+import { decodeArenaFixtureText } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/entrypoint';
+import { freshMonsterPlanningState } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/monster-planning-state';
+import { buildOfferEnvironment } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/offers/build-offer-environment';
+import type { GeneratedRoom } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/room-generator';
+import { d466GeneratedRoomOverride } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/d466-room-overrides';
+import {
+  brutalRoomMembershipViolations,
+  generatedRoomIntegrityViolations,
+} from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tools/d569-second-family-manifest';
+
+const directory = process.argv[2];
+if (directory === undefined) throw new TypeError('fixture directory required');
+const environment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+
+function targetedOffenseHasOpenTrace(
+  state: EncounterState,
+  mechanics: ResolvedTurnMechanics,
+  slot: ResolvedActionSlotUse,
+): boolean {
+  if (slot.kind !== 'attack' && slot.kind !== 'saving_throw' && slot.kind !== 'cast_spell') {
+    return true;
+  }
+  return slot.targetIds.every((targetId) => {
+    const trace = traceCombatantLine(state, mechanics.actorId, targetId, {
+      sourceAnchor: mechanics.finalPosition,
+    });
+    return !trace.blocksSight && trace.tier !== 'total';
+  });
+}
+
+function resolvedMechanicsIsProductive(
+  state: EncounterState,
+  mechanics: ResolvedTurnMechanics,
+): boolean {
+  const hasProductiveComponent = mechanics.movementCostFeet > 0 ||
+    mechanics.actionSlots.some((slot) =>
+      slot.kind === 'attack' || slot.kind === 'saving_throw' || slot.kind === 'cast_spell' ||
+      slot.kind === 'use_world_object');
+  if (!hasProductiveComponent) return false;
+  return mechanics.actionSlots.every((slot) => targetedOffenseHasOpenTrace(state, mechanics, slot));
+}
+
+function productiveWitness(state: EncounterState, actorId: CombatantId) {
+  for (const option of availableEngineActorOptions(state, actorId, environment)) {
+    const resolution = resolveEngineActorOption(state, option, environment);
+    if (!resolution.valid || !resolvedMechanicsIsProductive(state, resolution.mechanics)) continue;
+    const traces = resolution.mechanics.actionSlots.flatMap((slot) => {
+      if (slot.kind !== 'attack' && slot.kind !== 'saving_throw' && slot.kind !== 'cast_spell') {
+        return [];
+      }
+      return slot.targetIds.map((targetId) => {
+        const trace = traceCombatantLine(state, resolution.mechanics.actorId, targetId, {
+          sourceAnchor: resolution.mechanics.finalPosition,
+        });
+        return { kind: slot.kind, targetId, tier: trace.tier, blocksSight: trace.blocksSight };
+      });
+    });
+    return {
+      label: option.label,
+      movementCostFeet: resolution.mechanics.movementCostFeet,
+      actionKinds: resolution.mechanics.actionSlots.map(({ kind }) => kind),
+      traces,
+    };
+  }
+  return null;
+}
+
+const rows = readdirSync(directory).sort().map((name) => {
+  const bytes = readFileSync(join(directory, name), 'utf8');
+  const room = JSON.parse(bytes) as GeneratedRoom;
+  const state = freshMonsterPlanningState(decodeArenaFixtureText(bytes));
+  const living = state.combatants.filter((combatant) =>
+    combatant.profile.kind === 'monster' && combatant.life === 'living');
+  const witnesses = living.map((monster) => ({
+    actorId: monster.profile.id,
+    witness: productiveWitness(state, monster.profile.id),
+  }));
+  return {
+    seed: room.spec.seed,
+    integrity: generatedRoomIntegrityViolations(room, bytes),
+    structural: brutalRoomMembershipViolations(room)
+      .filter((violation) => violation.code !== 'brutal_productivity'),
+    terrainProfilePresent: Object.hasOwn(room.spec, 'terrainProfile'),
+    d466Override: d466GeneratedRoomOverride(room.spec.seed),
+    livingMonsters: living.length,
+    productiveMonsters: witnesses.filter(({ witness }) => witness !== null).length,
+    witnesses,
+  };
+});
+console.log(JSON.stringify(rows, null, 2));
+if (rows.some((row) => row.integrity.length > 0 || row.structural.length > 0 ||
+  row.terrainProfilePresent || row.d466Override !== null ||
+  row.livingMonsters !== row.productiveMonsters)) process.exitCode = 1;
diff --git a//tmp/cohort01-b3-vite.config.mjs b//tmp/cohort01-b3-vite.config.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..ff8b4c56321a3362fc00224b01800f62466f9a1f
--- /dev/null
+++ b//tmp/cohort01-b3-vite.config.mjs
@@ -0,0 +1 @@
+export default {};

exec
/bin/bash -lc "rg -n -o -e '6212[0-9]{3}|6_212_[0-9]{3}|6212xxx' tests/fixtures tools" in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 exited 1 in 0ms:
diff --git a//tmp/cohort01-b3-validate.ts b//tmp/cohort01-b3-validate.ts
new file mode 100644
index 0000000000000000000000000000000000000000..464ce8f228cf529f9572c6fff079a3b71e898651
--- /dev/null
+++ b//tmp/cohort01-b3-validate.ts
@@ -0,0 +1,104 @@
+import { readFileSync, readdirSync } from 'node:fs';
+import { join } from 'node:path';
+import { traceCombatantLine } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/cover';
+import type { EncounterState } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/encounter';
+import type { CombatantId } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/values';
+import {
+  availableEngineActorOptions,
+  resolveEngineActorOption,
+  type ResolvedActionSlotUse,
+  type ResolvedTurnMechanics,
+} from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intent-resolver';
+import { decodeArenaFixtureText } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/entrypoint';
+import { freshMonsterPlanningState } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/monster-planning-state';
+import { buildOfferEnvironment } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/offers/build-offer-environment';
+import type { GeneratedRoom } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/room-generator';
+import { d466GeneratedRoomOverride } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/d466-room-overrides';
+import {
+  brutalRoomMembershipViolations,
+  generatedRoomIntegrityViolations,
+} from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tools/d569-second-family-manifest';
+
+const directory = process.argv[2];
+if (directory === undefined) throw new TypeError('fixture directory required');
+const environment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+
+function targetedOffenseHasOpenTrace(
+  state: EncounterState,
+  mechanics: ResolvedTurnMechanics,
+  slot: ResolvedActionSlotUse,
+): boolean {
+  if (slot.kind !== 'attack' && slot.kind !== 'saving_throw' && slot.kind !== 'cast_spell') {
+    return true;
+  }
+  return slot.targetIds.every((targetId) => {
+    const trace = traceCombatantLine(state, mechanics.actorId, targetId, {
+      sourceAnchor: mechanics.finalPosition,
+    });
+    return !trace.blocksSight && trace.tier !== 'total';
+  });
+}
+
+function resolvedMechanicsIsProductive(
+  state: EncounterState,
+  mechanics: ResolvedTurnMechanics,
+): boolean {
+  const hasProductiveComponent = mechanics.movementCostFeet > 0 ||
+    mechanics.actionSlots.some((slot) =>
+      slot.kind === 'attack' || slot.kind === 'saving_throw' || slot.kind === 'cast_spell' ||
+      slot.kind === 'use_world_object');
+  if (!hasProductiveComponent) return false;
+  return mechanics.actionSlots.every((slot) => targetedOffenseHasOpenTrace(state, mechanics, slot));
+}
+
+function productiveWitness(state: EncounterState, actorId: CombatantId) {
+  for (const option of availableEngineActorOptions(state, actorId, environment)) {
+    const resolution = resolveEngineActorOption(state, option, environment);
+    if (!resolution.valid || !resolvedMechanicsIsProductive(state, resolution.mechanics)) continue;
+    const traces = resolution.mechanics.actionSlots.flatMap((slot) => {
+      if (slot.kind !== 'attack' && slot.kind !== 'saving_throw' && slot.kind !== 'cast_spell') {
+        return [];
+      }
+      return slot.targetIds.map((targetId) => {
+        const trace = traceCombatantLine(state, resolution.mechanics.actorId, targetId, {
+          sourceAnchor: resolution.mechanics.finalPosition,
+        });
+        return { kind: slot.kind, targetId, tier: trace.tier, blocksSight: trace.blocksSight };
+      });
+    });
+    return {
+      label: option.label,
+      movementCostFeet: resolution.mechanics.movementCostFeet,
+      actionKinds: resolution.mechanics.actionSlots.map(({ kind }) => kind),
+      traces,
+    };
+  }
+  return null;
+}
+
+const rows = readdirSync(directory).sort().map((name) => {
+  const bytes = readFileSync(join(directory, name), 'utf8');
+  const room = JSON.parse(bytes) as GeneratedRoom;
+  const state = freshMonsterPlanningState(decodeArenaFixtureText(bytes));
+  const living = state.combatants.filter((combatant) =>
+    combatant.profile.kind === 'monster' && combatant.life === 'living');
+  const witnesses = living.map((monster) => ({
+    actorId: monster.profile.id,
+    witness: productiveWitness(state, monster.profile.id),
+  }));
+  return {
+    seed: room.spec.seed,
+    integrity: generatedRoomIntegrityViolations(room, bytes),
+    structural: brutalRoomMembershipViolations(room)
+      .filter((violation) => violation.code !== 'brutal_productivity'),
+    terrainProfilePresent: Object.hasOwn(room.spec, 'terrainProfile'),
+    d466Override: d466GeneratedRoomOverride(room.spec.seed),
+    livingMonsters: living.length,
+    productiveMonsters: witnesses.filter(({ witness }) => witness !== null).length,
+    witnesses,
+  };
+});
+console.log(JSON.stringify(rows, null, 2));
+if (rows.some((row) => row.integrity.length > 0 || row.structural.length > 0 ||
+  row.terrainProfilePresent || row.d466Override !== null ||
+  row.livingMonsters !== row.productiveMonsters)) process.exitCode = 1;
diff --git a//tmp/cohort01-b3-vite.config.mjs b//tmp/cohort01-b3-vite.config.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..ff8b4c56321a3362fc00224b01800f62466f9a1f
--- /dev/null
+++ b//tmp/cohort01-b3-vite.config.mjs
@@ -0,0 +1 @@
+export default {};

exec
/bin/bash -lc "rg -n -o -e '\\b6212\\b' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md" in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 exited 1 in 0ms:
diff --git a//tmp/cohort01-b3-validate.ts b//tmp/cohort01-b3-validate.ts
new file mode 100644
index 0000000000000000000000000000000000000000..464ce8f228cf529f9572c6fff079a3b71e898651
--- /dev/null
+++ b//tmp/cohort01-b3-validate.ts
@@ -0,0 +1,104 @@
+import { readFileSync, readdirSync } from 'node:fs';
+import { join } from 'node:path';
+import { traceCombatantLine } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/cover';
+import type { EncounterState } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/encounter';
+import type { CombatantId } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/values';
+import {
+  availableEngineActorOptions,
+  resolveEngineActorOption,
+  type ResolvedActionSlotUse,
+  type ResolvedTurnMechanics,
+} from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intent-resolver';
+import { decodeArenaFixtureText } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/entrypoint';
+import { freshMonsterPlanningState } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/monster-planning-state';
+import { buildOfferEnvironment } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/offers/build-offer-environment';
+import type { GeneratedRoom } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/room-generator';
+import { d466GeneratedRoomOverride } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/d466-room-overrides';
+import {
+  brutalRoomMembershipViolations,
+  generatedRoomIntegrityViolations,
+} from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tools/d569-second-family-manifest';
+
+const directory = process.argv[2];
+if (directory === undefined) throw new TypeError('fixture directory required');
+const environment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+
+function targetedOffenseHasOpenTrace(
+  state: EncounterState,
+  mechanics: ResolvedTurnMechanics,
+  slot: ResolvedActionSlotUse,
+): boolean {
+  if (slot.kind !== 'attack' && slot.kind !== 'saving_throw' && slot.kind !== 'cast_spell') {
+    return true;
+  }
+  return slot.targetIds.every((targetId) => {
+    const trace = traceCombatantLine(state, mechanics.actorId, targetId, {
+      sourceAnchor: mechanics.finalPosition,
+    });
+    return !trace.blocksSight && trace.tier !== 'total';
+  });
+}
+
+function resolvedMechanicsIsProductive(
+  state: EncounterState,
+  mechanics: ResolvedTurnMechanics,
+): boolean {
+  const hasProductiveComponent = mechanics.movementCostFeet > 0 ||
+    mechanics.actionSlots.some((slot) =>
+      slot.kind === 'attack' || slot.kind === 'saving_throw' || slot.kind === 'cast_spell' ||
+      slot.kind === 'use_world_object');
+  if (!hasProductiveComponent) return false;
+  return mechanics.actionSlots.every((slot) => targetedOffenseHasOpenTrace(state, mechanics, slot));
+}
+
+function productiveWitness(state: EncounterState, actorId: CombatantId) {
+  for (const option of availableEngineActorOptions(state, actorId, environment)) {
+    const resolution = resolveEngineActorOption(state, option, environment);
+    if (!resolution.valid || !resolvedMechanicsIsProductive(state, resolution.mechanics)) continue;
+    const traces = resolution.mechanics.actionSlots.flatMap((slot) => {
+      if (slot.kind !== 'attack' && slot.kind !== 'saving_throw' && slot.kind !== 'cast_spell') {
+        return [];
+      }
+      return slot.targetIds.map((targetId) => {
+        const trace = traceCombatantLine(state, resolution.mechanics.actorId, targetId, {
+          sourceAnchor: resolution.mechanics.finalPosition,
+        });
+        return { kind: slot.kind, targetId, tier: trace.tier, blocksSight: trace.blocksSight };
+      });
+    });
+    return {
+      label: option.label,
+      movementCostFeet: resolution.mechanics.movementCostFeet,
+      actionKinds: resolution.mechanics.actionSlots.map(({ kind }) => kind),
+      traces,
+    };
+  }
+  return null;
+}
+
+const rows = readdirSync(directory).sort().map((name) => {
+  const bytes = readFileSync(join(directory, name), 'utf8');
+  const room = JSON.parse(bytes) as GeneratedRoom;
+  const state = freshMonsterPlanningState(decodeArenaFixtureText(bytes));
+  const living = state.combatants.filter((combatant) =>
+    combatant.profile.kind === 'monster' && combatant.life === 'living');
+  const witnesses = living.map((monster) => ({
+    actorId: monster.profile.id,
+    witness: productiveWitness(state, monster.profile.id),
+  }));
+  return {
+    seed: room.spec.seed,
+    integrity: generatedRoomIntegrityViolations(room, bytes),
+    structural: brutalRoomMembershipViolations(room)
+      .filter((violation) => violation.code !== 'brutal_productivity'),
+    terrainProfilePresent: Object.hasOwn(room.spec, 'terrainProfile'),
+    d466Override: d466GeneratedRoomOverride(room.spec.seed),
+    livingMonsters: living.length,
+    productiveMonsters: witnesses.filter(({ witness }) => witness !== null).length,
+    witnesses,
+  };
+});
+console.log(JSON.stringify(rows, null, 2));
+if (rows.some((row) => row.integrity.length > 0 || row.structural.length > 0 ||
+  row.terrainProfilePresent || row.d466Override !== null ||
+  row.livingMonsters !== row.productiveMonsters)) process.exitCode = 1;
diff --git a//tmp/cohort01-b3-vite.config.mjs b//tmp/cohort01-b3-vite.config.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..ff8b4c56321a3362fc00224b01800f62466f9a1f
--- /dev/null
+++ b//tmp/cohort01-b3-vite.config.mjs
@@ -0,0 +1 @@
+export default {};

exec
/bin/bash -lc 'git diff --exit-code -- tests/fixtures/d569-second-family-manifest.json tests/fixtures/d569-blind-experiment-manifest.json tests/fixtures/arena-basis-brutal tests/fixtures/arena-basis-brutal-b tests/fixtures/arena-basis-brutal-2
git diff --check
git status --short
find tests/fixtures/d569-second-family-manifest.json tests/fixtures/d569-blind-experiment-manifest.json tests/fixtures/arena-basis-brutal tests/fixtures/arena-basis-brutal-b tests/fixtures/arena-basis-brutal-2 -type f -print0 | sort -z | xargs -0 sha256sum' in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 0ms:
6847b5d44b2577aa31a87a2eb83220ca17f54f8a8b160741d61d47019c75e51c  tests/fixtures/arena-basis-brutal-2/seed-6207001.json
9b1b9be44245659fb1a95922c685bbb1f9082b3f0fa591bd822553573a9d5c66  tests/fixtures/arena-basis-brutal-2/seed-6207002.json
afe31b4cb79f606bd56f29d37267814319de161db745747dae1a70a528617d6f  tests/fixtures/arena-basis-brutal-2/seed-6207003.json
96701e3136318b9f4dd8859311e30bb85586d129c8ef4424fcea398f3bbc813e  tests/fixtures/arena-basis-brutal-2/seed-6207004.json
a3a6774081b01b743091115b29ccfbb81d109e2f26867ce74a1c431b9a56a63a  tests/fixtures/arena-basis-brutal-2/seed-6207005.json
28800721eac25312561d04c49389f95a05ae24e81ff13b1ed6191951a7b34082  tests/fixtures/arena-basis-brutal-2/seed-6207006.json
eb9a566eab8c314fd754d85402e280e5f75ee30e114451b9405007a536375f8f  tests/fixtures/arena-basis-brutal-2/seed-6207007.json
5926d642f77ca2cdbf8cbed29408cfbf4165d6a05b453c2203a0aace93827a2b  tests/fixtures/arena-basis-brutal-2/seed-6207008.json
d398b3ad8a24ecae7d3989a1d47be1bedf69b1b989b17d967278be2b2ca7a50c  tests/fixtures/arena-basis-brutal-2/seed-6207009.json
b7efa3c2df793fcbbdba1d453358577a1d4eb7c6b2fe8c9b575d7fe85c3adf04  tests/fixtures/arena-basis-brutal-2/seed-6207010.json
7cc25c0ab9a0e380373a306874290d0f5247e74c0efb71e43ab593b58f0d9d3b  tests/fixtures/arena-basis-brutal-b/seed-6206001.json
3fdfe05812aeb6724789b4ff6f753ce68c523c13ff024d9ee275bd1060adbcaa  tests/fixtures/arena-basis-brutal-b/seed-6206002.json
36828c26a62a8af8c9cc32db7f3a13124d897a8aacf8ce4d4df2c11d2c742d3c  tests/fixtures/arena-basis-brutal-b/seed-6206003.json
35a5980497b2184a4d684e1849117bb70e4887cb40264ea33117e3e14322c60a  tests/fixtures/arena-basis-brutal-b/seed-6206004.json
dc48b6cdd7d4e33dc3c9a0188586ebd1537deac4dec4284c7e9404cec652e2f1  tests/fixtures/arena-basis-brutal-b/seed-6206005.json
d66fc0a9f29d84b5f1bc5a46b86483f91236d05b5cb1b951519cce7db98e2269  tests/fixtures/arena-basis-brutal-b/seed-6206006.json
1c4c337148afad9aff2a86143bb3156cc446ffabd2ccc8cc29eb004d83034bd9  tests/fixtures/arena-basis-brutal-b/seed-6206007.json
11a065b490f6e68effaddb0e919b9f9f9f7ae300f19a97f3359d3d4c86658a32  tests/fixtures/arena-basis-brutal-b/seed-6206008.json
19808aca9fb3ca7e4a77b6222cfae31c4f69a16b9b74ecc0706cb1eee58d4f5e  tests/fixtures/arena-basis-brutal-b/seed-6206009.json
a9efe78460c66972d09c6efd1c7cc04409ba6fff5a0028657d2442a0ec2fbc83  tests/fixtures/arena-basis-brutal-b/seed-6206010.json
3f737f1ddf714b0381abdc0e822b3a07cda4c55287a4bc0b1a97cd4d7d71d63b  tests/fixtures/arena-basis-brutal/seed-6203001.json
8a7738bd2606792bae65da8f39f709ffad5b0bb5487f8e5749cecac4f29f9860  tests/fixtures/arena-basis-brutal/seed-6203002.json
d54761b2864fcdc1a777f645ade96279da751b3247bca1e042fb997326dc060f  tests/fixtures/arena-basis-brutal/seed-6203003.json
6f9465eccac77eb60ffab2be1832f8f1bcd3290c655130c2ac752a38e6d75a20  tests/fixtures/arena-basis-brutal/seed-6203004.json
5b3be6abbdf2fcccff3243639d582bea2fb1098099fa91cf2208a0f143a2364e  tests/fixtures/arena-basis-brutal/seed-6203005.json
3e6818fe70e276e9ee7407d76b01e3afab7254cc1c27e649d5f445a5f6a6480c  tests/fixtures/arena-basis-brutal/seed-6203006.json
e6215e5b6388a79bc850e7ff97867f2618733acbb434526a77133e382cba2d1b  tests/fixtures/arena-basis-brutal/seed-6203007.json
b067b1aa081f368859979415c468d997b6fa504cad6ad70dc6998c90eeb3207c  tests/fixtures/arena-basis-brutal/seed-6203008.json
9780276cdec0ee71c99cc13217d73376990866f5ab3ab471c7a793196665f7ce  tests/fixtures/arena-basis-brutal/seed-6203009.json
2ec7f3c1298e7b6f3519cf765bcb88f36be3426e02cf7572730a77af9e32114d  tests/fixtures/arena-basis-brutal/seed-6203010.json
8c0bcb3c0afa8358c26129efbef82d0d2882135389d8dd8040fe7e4b6451e13a  tests/fixtures/d569-blind-experiment-manifest.json
83daa7ea3ca89b270e5149368d09fa97074124dfe438cf95b346e996996026c8  tests/fixtures/d569-second-family-manifest.json

diff --git a//tmp/cohort01-b3-validate.ts b//tmp/cohort01-b3-validate.ts
new file mode 100644
index 0000000000000000000000000000000000000000..464ce8f228cf529f9572c6fff079a3b71e898651
--- /dev/null
+++ b//tmp/cohort01-b3-validate.ts
@@ -0,0 +1,104 @@
+import { readFileSync, readdirSync } from 'node:fs';
+import { join } from 'node:path';
+import { traceCombatantLine } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/cover';
+import type { EncounterState } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/encounter';
+import type { CombatantId } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/values';
+import {
+  availableEngineActorOptions,
+  resolveEngineActorOption,
+  type ResolvedActionSlotUse,
+  type ResolvedTurnMechanics,
+} from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intent-resolver';
+import { decodeArenaFixtureText } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/entrypoint';
+import { freshMonsterPlanningState } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/monster-planning-state';
+import { buildOfferEnvironment } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/offers/build-offer-environment';
+import type { GeneratedRoom } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/room-generator';
+import { d466GeneratedRoomOverride } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/d466-room-overrides';
+import {
+  brutalRoomMembershipViolations,
+  generatedRoomIntegrityViolations,
+} from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tools/d569-second-family-manifest';
+
+const directory = process.argv[2];
+if (directory === undefined) throw new TypeError('fixture directory required');
+const environment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+
+function targetedOffenseHasOpenTrace(
+  state: EncounterState,
+  mechanics: ResolvedTurnMechanics,
+  slot: ResolvedActionSlotUse,
+): boolean {
+  if (slot.kind !== 'attack' && slot.kind !== 'saving_throw' && slot.kind !== 'cast_spell') {
+    return true;
+  }
+  return slot.targetIds.every((targetId) => {
+    const trace = traceCombatantLine(state, mechanics.actorId, targetId, {
+      sourceAnchor: mechanics.finalPosition,
+    });
+    return !trace.blocksSight && trace.tier !== 'total';
+  });
+}
+
+function resolvedMechanicsIsProductive(
+  state: EncounterState,
+  mechanics: ResolvedTurnMechanics,
+): boolean {
+  const hasProductiveComponent = mechanics.movementCostFeet > 0 ||
+    mechanics.actionSlots.some((slot) =>
+      slot.kind === 'attack' || slot.kind === 'saving_throw' || slot.kind === 'cast_spell' ||
+      slot.kind === 'use_world_object');
+  if (!hasProductiveComponent) return false;
+  return mechanics.actionSlots.every((slot) => targetedOffenseHasOpenTrace(state, mechanics, slot));
+}
+
+function productiveWitness(state: EncounterState, actorId: CombatantId) {
+  for (const option of availableEngineActorOptions(state, actorId, environment)) {
+    const resolution = resolveEngineActorOption(state, option, environment);
+    if (!resolution.valid || !resolvedMechanicsIsProductive(state, resolution.mechanics)) continue;
+    const traces = resolution.mechanics.actionSlots.flatMap((slot) => {
+      if (slot.kind !== 'attack' && slot.kind !== 'saving_throw' && slot.kind !== 'cast_spell') {
+        return [];
+      }
+      return slot.targetIds.map((targetId) => {
+        const trace = traceCombatantLine(state, resolution.mechanics.actorId, targetId, {
+          sourceAnchor: resolution.mechanics.finalPosition,
+        });
+        return { kind: slot.kind, targetId, tier: trace.tier, blocksSight: trace.blocksSight };
+      });
+    });
+    return {
+      label: option.label,
+      movementCostFeet: resolution.mechanics.movementCostFeet,
+      actionKinds: resolution.mechanics.actionSlots.map(({ kind }) => kind),
+      traces,
+    };
+  }
+  return null;
+}
+
+const rows = readdirSync(directory).sort().map((name) => {
+  const bytes = readFileSync(join(directory, name), 'utf8');
+  const room = JSON.parse(bytes) as GeneratedRoom;
+  const state = freshMonsterPlanningState(decodeArenaFixtureText(bytes));
+  const living = state.combatants.filter((combatant) =>
+    combatant.profile.kind === 'monster' && combatant.life === 'living');
+  const witnesses = living.map((monster) => ({
+    actorId: monster.profile.id,
+    witness: productiveWitness(state, monster.profile.id),
+  }));
+  return {
+    seed: room.spec.seed,
+    integrity: generatedRoomIntegrityViolations(room, bytes),
+    structural: brutalRoomMembershipViolations(room)
+      .filter((violation) => violation.code !== 'brutal_productivity'),
+    terrainProfilePresent: Object.hasOwn(room.spec, 'terrainProfile'),
+    d466Override: d466GeneratedRoomOverride(room.spec.seed),
+    livingMonsters: living.length,
+    productiveMonsters: witnesses.filter(({ witness }) => witness !== null).length,
+    witnesses,
+  };
+});
+console.log(JSON.stringify(rows, null, 2));
+if (rows.some((row) => row.integrity.length > 0 || row.structural.length > 0 ||
+  row.terrainProfilePresent || row.d466Override !== null ||
+  row.livingMonsters !== row.productiveMonsters)) process.exitCode = 1;
diff --git a//tmp/cohort01-b3-vite.config.mjs b//tmp/cohort01-b3-vite.config.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..ff8b4c56321a3362fc00224b01800f62466f9a1f
--- /dev/null
+++ b//tmp/cohort01-b3-vite.config.mjs
@@ -0,0 +1 @@
+export default {};

exec
/bin/bash -lc "sed -n '23040,23076p' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md" in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 0ms:
## D635.53 — SUPERVISOR (2026-09-17 10:21): VIS-FIELD slowdown profiled (sol, read-only; saved .claude/consensus/test-perf/investigate-vis-field-slowdown-sol.md); three bounded fixes queued for TEST-PERF-01 / a post-landing VIS-FIELD perf batch
MEASURED (sol, both trees' production hashes identical before/after; my own numbers agree: vane 3077 → 6585 ms): vane-tpk 3180 → 6820 ms (2.14×). NOT more detection queries (0.83×) but each sight query expanding into per-target-cell traces (visibility-field.ts:431): traceSpaces 95k → 348k (3.67×), traceCornerLine 124k → 536k (4.33×); 91.7% of cell traces are pairwise sightToCreature detection (~4.8 s inclusive), only 8.3% the derived field itself (~0.55 s). The field's weak caches (visibility-field.ts:104) are keyed by EncounterState identity, so immutable reducer revisions make nearly every request cold (206 projections over 205 distinct revisions; 140 traces each). los-cover productive-option 5472 → 6139 ms (+12%): the seam scan (firstSharedEdgeBlockingCell 4.17M calls, 380 ms) plus ~0.7 s more in traceCornerLine; also 33,953 of 46,650 reach traces (72.8%) were for candidates then refused by RANGE — geometry evaluated before the cheap range check. D630 pair 33.6 → 41.5 s: replay.ts:238 projects DM + every PC per replayed revision (derived fog 3,361 calls); the replay file rebuilds the scripted gate 15 times (13 default) at ~1.9 s each.
FIXES (bounded, with required witnesses): (1) TEST-ONLY: build each parameterized replay gate once, deep-freeze, structuredClone per mutating test (~20–23 s off the replay file; witness: gate hash unchanged across tests, shuffled order twice, corruption tests still fail on their own clones) — this is TEST-PERF-01's default-gate reuse item, confirmed as the largest test-only win; (2) PRODUCTION: cache visibility outcomes by an explicit visibility epoch (bumped by movement, footprints, walls/objects, light, obscurement, relevant conditions/effects, hidden state, senses, life, placement, observer eligibility; HP/log-only revisions reuse) + observer/subject key instead of state identity (~2.5–3.5 s in vane; witness: per revision, cached == from-scratch for every eligible pair and cell, byte-identical fog/reason/sense/grade and projection hashes, incl. Large/Huge footprints, seam rays, darkness, obscurement, Invisible/Hidden/Blinded, death/placement); (3) TEST-ONLY: generate the nine versioned rooms once per suite, deep-frozen (~4.5 s per named los-cover test) + optional seam memoization by blocking-topology signature (~0.35–0.7 s); (4) small: prefilter range before LOS inside offer generation only (public reach precedence unchanged; ~0.2–0.3 s).
CORRECTNESS: no field computed for ineligible observers (eligibleVisibilityObserverIds :525 excludes dead/unplaced/adjudication-pending/unconscious); per-cell tracing for large footprints is correctness-sensitive (a single representative ray would regress); the seam scan is required work. State-identity caching = design smell, not a defect. DISPOSITION: (1)+(3) go into TEST-PERF-01 (owner's ranks 6/8/9 still pending); (2)+(4) = a VIS-FIELD-PERF batch after landing, planned and reviewed like any batch; the 5 s budgets are NOT re-pinned meanwhile.

## D635.54 — SUPERVISOR (2026-09-17 11:06): option A costed (sol, read-only; saved investigate-option-a-costing-sol.md); a refinement of the attribution — 40 of the second-family ledger's 47 violations are B2's fog key, not the seam rule
REFINEMENT (sol; consistent with the failure text I saw in D635.46): the ledger pin's 47 markers = 20 second-family fixtures (hard-2 5118xxx AND brutal-2 6207xxx) × 2 byte-regeneration checks (first_regeneration / independent_regeneration — the validator rebuilds each fixture with generateRoom twice and requires byte equality with the committed bytes, which still carry the removed foggedCells key) = 40, plus 7 brutal-2 productivity violations. So the second-family manifest is red for TWO reasons: B2's key (40, the same consequence LAND-04 normalized for the generator pins) and the seam rule (7). Neither option B nor C repairs the 40. d569-v5.test.ts fails at file level because it validates the manifest at module load.
MACHINERY: "regeneration" in D569 means a second deterministic build, not a cohort version; the sanctioned precedent for a NEW cohort is the second family itself (D569: predeclare unused ranges with a verbatim namespace audit, generate into a new directory, prove membership from decoded state, generate twice and compare bytes, pin hashes only then, nest the manifest hash) — history is never edited in place. No tracked RL row and no docs bind the brutal families.
OPTION A as costed by sol (40 fixtures: brutal-v2 6209xxx, brutal-b-v2 6210xxx, brutal-2-v2 6211xxx, PLUS hard-3 5120xxx because hard-2's bytes fail the fog-key regeneration; new d569-second-family-manifest-v2 + d569-blind-experiment-manifest-v6 with v5/v1 kept frozen; 42 new SHA-256 pins; ~62–66 paths; ~865 KB fixtures; versioned arena/rerun routes brutal-v2 / brutal-10-v2 rather than retargeting historical names; negative witnesses required; d569-v5.test.ts stays historical, a v6 test becomes active). Hard-family pins: composite-turn-proposals and Room-8 opportunity-intel are hand-derivable re-pins on the same scenes (Dodge/End Turn only; monsters 1/2/4 zero-foot Dodge, monster 5 keeps its 55-ft Dash); speculative-planning must NOT be normalized to an empty menu — it needs a small hand-authored scene with an independently computed volatility score and a seam mutation.
MY REFINEMENT TO A (A1, recommended over sol's A2): treat the 40 fog-key regeneration violations exactly as LAND-04 treated the generator pins — the validator's byte-regeneration comparison drops the obsolete legacy key from the committed bytes before comparing (a version-aware projection, demonstrated per fixture as a single-key structural diff), so hard-2 (5118xxx) stays the historical hard half and only the three BRUTAL cohorts regenerate: 30 fixtures instead of 40, no hard-3 namespace, second-family v2 = hard-2 (as is) + brutal-2-v2. Risk noted by sol applies: the normalization must be a demonstrated single-key projection, never a rewrite of manifest bytes.
B (6–10 files, relaxes everyMonsterProductive; leaves the 40 and the speculative scene broken; brutal-b has 41/42 monsters without attack offers under the seam so any threshold would be fitted to the failures) and C (reverses D635's optical ruling; restores the three behaviour pins and 214→451 offers; 10–20 files + full revalidation of cover/sight/fields/offers/browser; still leaves the 40) — both advised against.

## D641 — OWNER (2026-09-17 18:48): "I think we need to model that a wall is solid across cells. It is not just a series of cells. Look for how others have handled this." — research done by the supervisor; question put back to the owner
PROBED BY ME on 807d2e3c (traceTerrainLine, 6x6 board): (1) two blockers touching only at a corner, (2,1)&(1,2), observer (0,0) → target (3,3) through the shared vertex: tier half, blocksSight FALSE — the diagonal crack lets sight through; (2) solid 2x2 block: total, TRUE; (3) wall column with the ray along its face-line between two blockers (the D635 seam): half, TRUE; (4) a ray grazing one blocker's corner: none, FALSE. So today's tracer = closed cells whose interiors block + the D635 shared-EDGE rule; shared CORNERS of diagonally touching blockers are still open.
HOW OTHERS DO IT (sources in the reply): D&D 2014 DMG corner trace — lines from a corner to the target's corners; whether a line that merely TOUCHES an obstacle counts is explicitly the DM's call (the SRD 5.2.1 only defines cover degrees by "covers at least half / three-quarters / the whole target"); Gloomhaven — corner-to-corner lines, and "the line cannot touch or cross a wall at any point; touching the very edge of a wall still means no LOS" (walls are closed sets; touching = blocked); Foundry VTT / Roll20 — walls are SEGMENTS with endpoints (thin walls), not cells, so no cell seams exist and a long wall is one solid segment by construction; roguelikes (Red Blob "thin wall FOV", Adam Milazzo's survey, Albert Ford's symmetric shadowcasting, RogueBasin comparative study) — "thick walls" (blocking cells) vs "thin walls" (blocking edges) is the standard framing, and diagonal-gap peeking between corner-touching blockers is a known nuisance that implementations bevel or seal; Debenham & Solis-Oba, "New Algorithms for Computing Field of Vision over 2D Grids" (arXiv 2101.11002) — "adjacent vision blocking cells are first grouped together into rectilinear regions, then split into a minimal number of rectangles", and their Figure 5 is exactly our seam: two adjacent rectangles let a ray slip along the shared side, which they fix by extending one rectangle to overlap the other so the union is solid.
PROPOSAL (to the owner, one question): adopt a SOLID-WALL model — the wall is the union of sight-blocking cells as closed rectilinear regions; a ray is blocked iff it passes through the union's interior, which includes (a) any blocking cell's interior, (b) an edge shared by two blockers (D635, already in), and (c) a vertex shared by two diagonally touching blockers (seal the crack; NOT in today). Grazing an OUTER face or a single blocker's corner stays open (DMG-consistent, today's behaviour). Implementation: step 1 a local vertex rule beside firstSharedEdgeBlockingCell in cover.ts with witnesses for all four probe cases (small, rules-visible, needs its own D-ruling and astra review; lands with VIS-FIELD); step 2 the precomputed rectilinear-region/rectangle representation keyed by the blocking topology (the paper's approach) as the VIS-FIELD-PERF batch (also perf fix #3 in D635.53). Question 5 stays: regenerate the cohorts under the solid-wall geometry (A1).

## D642 — OWNER (2026-09-17 19:15): "Seal diagonal corners." — the solid-wall model adopted in full: a ray is blocked by any blocking cell interior, any edge shared by two blockers (D635) and any vertex shared by two diagonally touching blockers; outer-face grazes and single-blocker corner touches stay clear; physical cover tiers unchanged
Owner also confirmed on the annotated image: "The orange and purple lines should not work" (all four corner rays through the column-7 wall are blocked — the seam rule's result). WALL-01 dispatched to sol (resume the seam-rule session 01a0ab3f…, brief impl-vis-field-wall-01.md, log impl-wall-01.log) on the worktree at 807d2e3c: the vertex rule in cover.ts with exact lattice-point enumeration, hand-authored witnesses (crack sealed, single-blocker control, staircase wall sealed at a step vertex — the case the edge rule alone misses, outer-face graze clear, 2x2 solid unchanged), the SEAM batch's DIAGONAL_CORNER_TOUCH_UNCHANGED pin re-pinned by hand to the sealed result (renamed _SEALED_D642), three mutants, per-family consequence counts before/after, the red-set audit (a red in a non-frozen suite is a finding, not a re-pin), and proof that generation bytes are untouched. Astra medium review follows; then question 5 (A1) regenerates the cohorts under the sealed geometry.

## D643 — OWNER (2026-09-17 19:36): "Do your proposal" — the supervisor's recommendations are authorized as a whole
Authorized: (1) WALL-01 (D642, in flight) lands the solid-wall vertex rule with VIS-FIELD; (2) QUESTION 5 = A1: normalize the removed fog key in the second-family validator's regeneration comparison (demonstrated per fixture as a single-key diff, as LAND-04 did), then regenerate ONLY the three brutal cohorts as new versioned families under the sealed geometry (brutal-v2 6209xxx, brutal-b-v2 6210xxx, brutal-2-v2 6211xxx; hard-2 5118xxx kept as the historical hard half), D569 precedent in full (verbatim namespace audit, membership from decoded state, two byte-identical generations, hashes pinned only then), manifests d569-second-family-manifest-v2 + d569-blind-experiment-manifest-v6 with v1/v5 frozen, versioned arena/rerun routes (brutal-v2, brutal-10-v2, brutal-10-b-v2), hand re-pins for composite-turn-proposals and Room-8 opportunity-intel, a small hand-authored scene for speculative-planning (never an empty-menu normalization); (3) the blind semantic cap stays 32,768 and the oversized-block rejection witness (astra's LAND4-F1, P3) is added; (4) after landing: the VIS-FIELD-PERF batch — visibility-epoch cache with the from-scratch differential witness, range-before-LOS prefilter inside offer generation, and the precomputed rectilinear-region/rectangle wall representation (Debenham–Solis-Oba) — planned and reviewed like any unit, plus the two test-only items into TEST-PERF-01. ORDER: WALL-01 (verify, astra) → A1 as VIS-FIELD-01 batch COHORT-01 (planned as a brief with the file-level costing from investigate-option-a-costing-sol.md as its binding spec; astra reviews) → untruncated full gate → land → mirror push (D640) → ELEVATION-02 B0 and the perf batch.

## D644 — OWNER (2026-09-17 19:45): TEST-PERF ranks 6/8/9 = option A
Rank 6 limited to the visibility-field caches (the VIS-FIELD-PERF batch authorized in D643: explicit visibility epoch + from-scratch differential witness per revision); rank 9 (vitest worker topology / duration-balanced shards / experimental fsModuleCache — gate config only) scheduled as a small measured batch after VIS-FIELD lands, savings measured back-to-back on a quiet box per D632's invariants; rank 6 engine-wide and rank 8 stay deferred until the visibility epoch has proven the pattern. Sequence after landing: TEST-PERF-01 (ranks 1–5, 7) → rank 9 → VIS-FIELD-PERF.

## D645 — SUPERVISOR (2026-09-17 19:53): WALL-01 REJECTED by my verification (WALL-F1, P1: the vertex rule is inert for axis-aligned rays whose sealing pair straddles the line); fix r1 dispatched; COHORT-01 plan (400 lines, sha 6852051d…) harvested and sent to astra HIGH
SOL WALL-01 (saved impl-wall-01-sol.md): gcd lattice enumeration, TL+BR / TR+BL pairs, progress-ordered merge of interior/edge/vertex events, physical tier untouched; 43/43; three mutants killed; counts table "unchanged"; 42 seeds byte-identical; pair 38.6 s; two los-cover budget timeouts. VERIFIED BY ME (clean checkout + patch, traceTerrainLine, Medium tokens, 15x8): blockers (7,3)&(8,4) with the ray cells (13,4)→(1,4): blocksSight FALSE (must be true); (7,4)&(8,3): FALSE; vertical (4,2)&(5,3) with (5,0)→(5,6): FALSE; the diagonal crack cases TRUE. CAUSE (read in cover.ts): sharedVertexBlockingCells is built from `candidates`, which traceSpaces filters by the bounding box of the eight corners; for a ray along a grid line between Medium cells the far-side flank row is outside the box, so the vertex is never registered. Sol's STAIRCASE_WALL_SEALED witness passes only because its geometry keeps both cells inside the box — it does not exercise the case it is named for, and the "counts unchanged" table is not evidence about D642. FIX R1 (sol resumed; brief impl-vis-field-wall-01-fix-r1.md; log impl-wall-01-fix-r1.log): on-the-fly sightBlockingAt lookups around each interior lattice vertex (as the edge rule does), witnesses replaced with my three geometries + a split-pair control, a bbox-regression mutant, counts and generation bytes redone.
COHORT-01 PLAN (sol 01a0b1bb…, saved plan-cohort-01-sol.md; copied to .tmp-plans/2026-09-17-cohort-01-plan.md): 10 batches (validator normalization → RED membership witnesses + frozen-contract retirement → generate 6209 → 6210 → 6211 → manifests v2/v6 + dated ledger → routes → audit/report coverage → three behaviour pins → cap witness), a byte-freeze inventory of v1/v5/6203/6206/6207 checked after every batch, "reject all ten seeds if one fails", no open questions. Astra HIGH (fresh; brief review-plan-cohort-01-astra.md; log review-plan-cohort-01-astra-r1.log) reviewing now, in parallel with the WALL-01 fix.

## D646 — SUPERVISOR (2026-09-17 20:07): COHORT-01 plan r1 REJECTED by astra r1 (HIGH; 0 P1, 3 P2, 1 P3; saved review-plan-cohort-01-astra-r1.md); r2 dispatched to the planner
PLAN-F1 (P2): v6 has no experiment-identity boundary — session keys {family, arm, seed, rep} (d569-blind-experiment.ts:705) and row matching (:762) omit the manifest identity, and the unchanged hard fixtures keep their hashes, so 240/330/240 cells are indistinguishable across v5/v6. PLAN-F2 (P2): the namespace audit is unsound — stale worktree decisions file, patterns miss `6209xxx` and `6_209_001` forms, and D643/D645's reservations must be classified as such. PLAN-F3 (P2): the speculative-planning oracle must be a predeclared hand-calculated scene (≥9 eligible candidates, tie order, the excluded ninth, the exact mutation result). PLAN-F4 (P3): Batch 6 has eight files. Astra independently confirmed the rest: 20/20 fog-key single-key diffs via the real generator; the scout's 12+4 blocked rays per PC (wizard 16) and labels exactly Dodge/End Turn; Room-8 monsters 1/2/4 Dodge, monster 5's 55-ft Dash (10 steps × 5 + 5 difficult); the cap guard rejects a 57,580-byte block and accepts it with the guard disabled; 52 paths (18 existing + 34 new), all existing ones present. All four findings accepted. r2 (planner resumed 01a0b1bb…; brief plan-cohort-01-r2.md; r1 archived as .tmp-plans/2026-09-17-cohort-01-plan.r1.md) must also require canonicalD569SecondFamilyRegeneration in the active v6 test and rejection witnesses for non-fog-key differences and for legacy keys in new fixtures.

## D647 — SUPERVISOR (2026-09-17 20:22): WALL-01 fix r1 harvested (sol; saved impl-wall-01-fix-r1-sol.md) — my verification running on the throwaway checkout; COHORT-01 plan r2 harvested (sha 4f3385b4…, 373 lines; r1 archived) — astra r2 (HIGH, resumed) running
SOL fix r1: vertex lookup now queries sightBlockingAt directly around each GCD-enumerated interior lattice vertex (no candidate bbox), also on the coverTierBetweenObjects path; the three axis witnesses (my geometries: first cells (7,3) / (8,3) / (4,2)) + split control; 46/46; four mutants incl. the bbox-regression one (exactly the three axis witnesses red); counts table unchanged before/after (hard 142/35, brutal 57/34, brutal-b 15/41, brutal-2 58/36 — now with a working rule); 42 seeds byte-identical (aggregate 7b884bf9…); pair 39.1 s; the 35 frozen/behaviour reds unchanged; four los-cover 5 s budget timeouts under the combined audit (110/112 isolated with two) — perf, not re-pinned. MY VERIFICATION (verify-wall-01-r1.log; ../dnd-wt-seam-ab reset to 807d2e3c + patch): tsc, my seven-case probe (A/B/C/D must block, E split pair / F outer-face graze / G single corner must stay clear), a vertex-lookup-null mutant, the suites, los-cover alone, pair.
PLAN r2 disposition (planner): F1 → separately pinned outer-v6 identity in session keys/cells/rows/matching, v5 preserved, v5 hard rows rejected; F2 → pre-Batch-2 gate against MAIN decisions, plain/xxx/underscore forms, verbatim output, reservations classified, three families reserved together, Allowed-file amendment before replacement generation; F3 → fixed two-proposal integration scene + nine-candidate hand table (radii, paths, scores, byte tie order, excluded ninth, exact seam mutation); F4 → counts fixed; canonical regeneration required for active v6; rejection witnesses for non-fog differences and legacy keys in v2. Astra r2 told to verify the F3 hand table itself.


diff --git a//tmp/cohort01-b3-validate.ts b//tmp/cohort01-b3-validate.ts
new file mode 100644
index 0000000000000000000000000000000000000000..464ce8f228cf529f9572c6fff079a3b71e898651
--- /dev/null
+++ b//tmp/cohort01-b3-validate.ts
@@ -0,0 +1,104 @@
+import { readFileSync, readdirSync } from 'node:fs';
+import { join } from 'node:path';
+import { traceCombatantLine } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/cover';
+import type { EncounterState } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/encounter';
+import type { CombatantId } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/values';
+import {
+  availableEngineActorOptions,
+  resolveEngineActorOption,
+  type ResolvedActionSlotUse,
+  type ResolvedTurnMechanics,
+} from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intent-resolver';
+import { decodeArenaFixtureText } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/entrypoint';
+import { freshMonsterPlanningState } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/monster-planning-state';
+import { buildOfferEnvironment } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/offers/build-offer-environment';
+import type { GeneratedRoom } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/room-generator';
+import { d466GeneratedRoomOverride } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/d466-room-overrides';
+import {
+  brutalRoomMembershipViolations,
+  generatedRoomIntegrityViolations,
+} from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tools/d569-second-family-manifest';
+
+const directory = process.argv[2];
+if (directory === undefined) throw new TypeError('fixture directory required');
+const environment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+
+function targetedOffenseHasOpenTrace(
+  state: EncounterState,
+  mechanics: ResolvedTurnMechanics,
+  slot: ResolvedActionSlotUse,
+): boolean {
+  if (slot.kind !== 'attack' && slot.kind !== 'saving_throw' && slot.kind !== 'cast_spell') {
+    return true;
+  }
+  return slot.targetIds.every((targetId) => {
+    const trace = traceCombatantLine(state, mechanics.actorId, targetId, {
+      sourceAnchor: mechanics.finalPosition,
+    });
+    return !trace.blocksSight && trace.tier !== 'total';
+  });
+}
+
+function resolvedMechanicsIsProductive(
+  state: EncounterState,
+  mechanics: ResolvedTurnMechanics,
+): boolean {
+  const hasProductiveComponent = mechanics.movementCostFeet > 0 ||
+    mechanics.actionSlots.some((slot) =>
+      slot.kind === 'attack' || slot.kind === 'saving_throw' || slot.kind === 'cast_spell' ||
+      slot.kind === 'use_world_object');
+  if (!hasProductiveComponent) return false;
+  return mechanics.actionSlots.every((slot) => targetedOffenseHasOpenTrace(state, mechanics, slot));
+}
+
+function productiveWitness(state: EncounterState, actorId: CombatantId) {
+  for (const option of availableEngineActorOptions(state, actorId, environment)) {
+    const resolution = resolveEngineActorOption(state, option, environment);
+    if (!resolution.valid || !resolvedMechanicsIsProductive(state, resolution.mechanics)) continue;
+    const traces = resolution.mechanics.actionSlots.flatMap((slot) => {
+      if (slot.kind !== 'attack' && slot.kind !== 'saving_throw' && slot.kind !== 'cast_spell') {
+        return [];
+      }
+      return slot.targetIds.map((targetId) => {
+        const trace = traceCombatantLine(state, resolution.mechanics.actorId, targetId, {
+          sourceAnchor: resolution.mechanics.finalPosition,
+        });
+        return { kind: slot.kind, targetId, tier: trace.tier, blocksSight: trace.blocksSight };
+      });
+    });
+    return {
+      label: option.label,
+      movementCostFeet: resolution.mechanics.movementCostFeet,
+      actionKinds: resolution.mechanics.actionSlots.map(({ kind }) => kind),
+      traces,
+    };
+  }
+  return null;
+}
+
+const rows = readdirSync(directory).sort().map((name) => {
+  const bytes = readFileSync(join(directory, name), 'utf8');
+  const room = JSON.parse(bytes) as GeneratedRoom;
+  const state = freshMonsterPlanningState(decodeArenaFixtureText(bytes));
+  const living = state.combatants.filter((combatant) =>
+    combatant.profile.kind === 'monster' && combatant.life === 'living');
+  const witnesses = living.map((monster) => ({
+    actorId: monster.profile.id,
+    witness: productiveWitness(state, monster.profile.id),
+  }));
+  return {
+    seed: room.spec.seed,
+    integrity: generatedRoomIntegrityViolations(room, bytes),
+    structural: brutalRoomMembershipViolations(room)
+      .filter((violation) => violation.code !== 'brutal_productivity'),
+    terrainProfilePresent: Object.hasOwn(room.spec, 'terrainProfile'),
+    d466Override: d466GeneratedRoomOverride(room.spec.seed),
+    livingMonsters: living.length,
+    productiveMonsters: witnesses.filter(({ witness }) => witness !== null).length,
+    witnesses,
+  };
+});
+console.log(JSON.stringify(rows, null, 2));
+if (rows.some((row) => row.integrity.length > 0 || row.structural.length > 0 ||
+  row.terrainProfilePresent || row.d466Override !== null ||
+  row.livingMonsters !== row.productiveMonsters)) process.exitCode = 1;
diff --git a//tmp/cohort01-b3-vite.config.mjs b//tmp/cohort01-b3-vite.config.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..ff8b4c56321a3362fc00224b01800f62466f9a1f
--- /dev/null
+++ b//tmp/cohort01-b3-vite.config.mjs
@@ -0,0 +1 @@
+export default {};

exec
/bin/bash -lc 'git diff --exit-code -- tests/fixtures/d569-second-family-manifest.json tests/fixtures/d569-blind-experiment-manifest.json tests/fixtures/arena-basis-brutal tests/fixtures/arena-basis-brutal-b tests/fixtures/arena-basis-brutal-2' in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 0ms:
exec
/bin/bash -lc 'git diff --check' in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 0ms:
exec
/bin/bash -lc 'git status --short' in /home/vagrant/PhpstormProjects/dnd-wt-cohort-01
 succeeded in 0ms:
diff --git a//tmp/cohort01-b3-validate.ts b//tmp/cohort01-b3-validate.ts
new file mode 100644
index 0000000000000000000000000000000000000000..464ce8f228cf529f9572c6fff079a3b71e898651
--- /dev/null
+++ b//tmp/cohort01-b3-validate.ts
@@ -0,0 +1,104 @@
+import { readFileSync, readdirSync } from 'node:fs';
+import { join } from 'node:path';
+import { traceCombatantLine } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/cover';
+import type { EncounterState } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/encounter';
+import type { CombatantId } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/values';
+import {
+  availableEngineActorOptions,
+  resolveEngineActorOption,
+  type ResolvedActionSlotUse,
+  type ResolvedTurnMechanics,
+} from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intent-resolver';
+import { decodeArenaFixtureText } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/entrypoint';
+import { freshMonsterPlanningState } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/monster-planning-state';
+import { buildOfferEnvironment } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/offers/build-offer-environment';
+import type { GeneratedRoom } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/room-generator';
+import { d466GeneratedRoomOverride } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/d466-room-overrides';
+import {
+  brutalRoomMembershipViolations,
+  generatedRoomIntegrityViolations,
+} from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tools/d569-second-family-manifest';
+
+const directory = process.argv[2];
+if (directory === undefined) throw new TypeError('fixture directory required');
+const environment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+
+function targetedOffenseHasOpenTrace(
+  state: EncounterState,
+  mechanics: ResolvedTurnMechanics,
+  slot: ResolvedActionSlotUse,
+): boolean {
+  if (slot.kind !== 'attack' && slot.kind !== 'saving_throw' && slot.kind !== 'cast_spell') {
+    return true;
+  }
+  return slot.targetIds.every((targetId) => {
+    const trace = traceCombatantLine(state, mechanics.actorId, targetId, {
+      sourceAnchor: mechanics.finalPosition,
+    });
+    return !trace.blocksSight && trace.tier !== 'total';
+  });
+}
+
+function resolvedMechanicsIsProductive(
+  state: EncounterState,
+  mechanics: ResolvedTurnMechanics,
+): boolean {
+  const hasProductiveComponent = mechanics.movementCostFeet > 0 ||
+    mechanics.actionSlots.some((slot) =>
+      slot.kind === 'attack' || slot.kind === 'saving_throw' || slot.kind === 'cast_spell' ||
+      slot.kind === 'use_world_object');
+  if (!hasProductiveComponent) return false;
+  return mechanics.actionSlots.every((slot) => targetedOffenseHasOpenTrace(state, mechanics, slot));
+}
+
+function productiveWitness(state: EncounterState, actorId: CombatantId) {
+  for (const option of availableEngineActorOptions(state, actorId, environment)) {
+    const resolution = resolveEngineActorOption(state, option, environment);
+    if (!resolution.valid || !resolvedMechanicsIsProductive(state, resolution.mechanics)) continue;
+    const traces = resolution.mechanics.actionSlots.flatMap((slot) => {
+      if (slot.kind !== 'attack' && slot.kind !== 'saving_throw' && slot.kind !== 'cast_spell') {
+        return [];
+      }
+      return slot.targetIds.map((targetId) => {
+        const trace = traceCombatantLine(state, resolution.mechanics.actorId, targetId, {
+          sourceAnchor: resolution.mechanics.finalPosition,
+        });
+        return { kind: slot.kind, targetId, tier: trace.tier, blocksSight: trace.blocksSight };
+      });
+    });
+    return {
+      label: option.label,
+      movementCostFeet: resolution.mechanics.movementCostFeet,
+      actionKinds: resolution.mechanics.actionSlots.map(({ kind }) => kind),
+      traces,
+    };
+  }
+  return null;
+}
+
+const rows = readdirSync(directory).sort().map((name) => {
+  const bytes = readFileSync(join(directory, name), 'utf8');
+  const room = JSON.parse(bytes) as GeneratedRoom;
+  const state = freshMonsterPlanningState(decodeArenaFixtureText(bytes));
+  const living = state.combatants.filter((combatant) =>
+    combatant.profile.kind === 'monster' && combatant.life === 'living');
+  const witnesses = living.map((monster) => ({
+    actorId: monster.profile.id,
+    witness: productiveWitness(state, monster.profile.id),
+  }));
+  return {
+    seed: room.spec.seed,
+    integrity: generatedRoomIntegrityViolations(room, bytes),
+    structural: brutalRoomMembershipViolations(room)
+      .filter((violation) => violation.code !== 'brutal_productivity'),
+    terrainProfilePresent: Object.hasOwn(room.spec, 'terrainProfile'),
+    d466Override: d466GeneratedRoomOverride(room.spec.seed),
+    livingMonsters: living.length,
+    productiveMonsters: witnesses.filter(({ witness }) => witness !== null).length,
+    witnesses,
+  };
+});
+console.log(JSON.stringify(rows, null, 2));
+if (rows.some((row) => row.integrity.length > 0 || row.structural.length > 0 ||
+  row.terrainProfilePresent || row.d466Override !== null ||
+  row.livingMonsters !== row.productiveMonsters)) process.exitCode = 1;
diff --git a//tmp/cohort01-b3-vite.config.mjs b//tmp/cohort01-b3-vite.config.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..ff8b4c56321a3362fc00224b01800f62466f9a1f
--- /dev/null
+++ b//tmp/cohort01-b3-vite.config.mjs
@@ -0,0 +1 @@
+export default {};

codex
## BLOCKED — 6209 cohort rejected

The all-or-nothing membership gate failed. No fixtures were copied, hashed, or pinned; the worktree remains clean.

### Gates

- Frozen plan: `4bff2145b445cbb96771333bfdceb5cfdae8781e494cfa48622619cae0a2ac69`, 403 lines.
- HEAD: `bea24cbe`; WALL-01 accepted at `b94dd732`.
- `generatedLineIsOpen`: confirmed `trace.tier === 'none' && !trace.blocksSight`.
- Initial v2 suite: exit 1, exactly `30 failed | 4 passed`; all failures were expected ENOENTs.
- The nonproductive, Dash-only, and blocked-target witnesses all passed.

### Namespace evidence

```text
$ rg -n -o -e '6209[0-9]{3}|6210[0-9]{3}|6211[0-9]{3}|6_209_[0-9]{3}|6_210_[0-9]{3}|6_211_[0-9]{3}|6209xxx|6210xxx|6211xxx' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
23048:6209xxx
23048:6210xxx
23048:6211xxx
23061:6209xxx
23061:6210xxx
23061:6211xxx
23071:6209xxx
23071:6_209_001
status 0
```

```text
$ rg -n -o -e '6209[0-9]{3}|6210[0-9]{3}|6211[0-9]{3}|6_209_[0-9]{3}|6_210_[0-9]{3}|6_211_[0-9]{3}|6209xxx|6210xxx|6211xxx' tests/fixtures tools
<empty>
status 1
```

```text
$ rg -n -o -e '\b6209\b|\b6210\b|\b6211\b' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
23068:6209
23068:6210
23068:6211
status 0
```

Classification:

- Line 23048: D635.54 costing/reservation proposal.
- Line 23061: D643 owner-authorized reservation.
- Line 23068: D645 plan-summary reservation.
- Line 23071: D646 review example.
- D650 freezes the accepted plan but produces no direct pattern match.
- None represents prior generated seed use.

### Generation

The literal command initially exited 1 before generation because the symlinked `node_modules/.vite-temp` is read-only:

```text
npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out /tmp/cohort01-b3-a.BlRksh/arena-basis-brutal-v2
```

Both generations then completed with an empty temporary Vite configuration:

```text
npx vite-node -c /tmp/cohort01-b3-vite.config.mjs tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out /tmp/cohort01-b3-a.BlRksh/arena-basis-brutal-v2
status 0

npx vite-node -c /tmp/cohort01-b3-vite.config.mjs tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out /tmp/cohort01-b3-b.frHiBz/arena-basis-brutal-v2
status 0
```

```text
$ diff -rq /tmp/cohort01-b3-a.BlRksh/arena-basis-brutal-v2 /tmp/cohort01-b3-b.frHiBz/arena-basis-brutal-v2
<empty>
status 0
```

### Decoded membership

All ten passed integrity and structural brutal membership with:

- `integrity = []`
- `structural = []`
- no parsed `terrainProfile`
- `d466GeneratedRoomOverride(seed) === null`

Productivity results:

| Seed | Living/productive | Result | Productive witness |
|---:|---:|---|---|
| 6209001 | 4/1 | FAIL | monster 1 Bless; 3 traces `none/false` |
| 6209002 | 5/5 | PASS | Dash movement: 60, 55, 20, 45, 50 ft |
| 6209003 | 5/2 | FAIL | Bless: 3× `none/false`; Web: `three_quarters/false` |
| 6209004 | 3/1 | FAIL | Cure Wounds: `none/false` |
| 6209005 | 6/1 | FAIL | Light Crossbow: `none/false` |
| 6209006 | 5/1 | FAIL | Healing Word: `none/false` |
| 6209007 | 3/1 | FAIL | Bless: 3× `none/false` |
| 6209008 | 7/1 | FAIL | Bless: 3× `none/false` |
| 6209009 | 5/5 | PASS | Dash movement: 60, 20, 20, 60, 60 ft |
| 6209010 | 3/1 | FAIL | Bless: 3× `none/false` |

Result: 8/10 rooms failed; only 6209002 and 6209009 passed. Therefore all ten seeds were rejected.

No SHA-256 values were computed with either `sha256sum` or OpenSSL because the D569 ledger forbids hashing before 10/10 membership.

### Replacement audit

The next contiguous namespace, 6212xxx, was audited but not selected or generated:

```text
$ rg -n -o -e '6212[0-9]{3}|6_212_[0-9]{3}|6212xxx' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
<empty>
status 1

$ rg -n -o -e '6212[0-9]{3}|6_212_[0-9]{3}|6212xxx' tests/fixtures tools
<empty>
status 1

$ rg -n -o -e '\b6212\b' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
<empty>
status 1
```

Supervisor amendment is required before using 6212xxx.

### Final state

- Remaining RED titles: all 30 parameterized `satisfies active state-derived membership` cases—6209001–6209010, 6210001–6210010, and 6211001–6211010—remain ENOENT.
- V-freeze: exit 0.
- `git diff --check`: exit 0, empty.
- `git status --short`: exit 0, empty.
- Frozen 32-file inventory matches before/after.
- Typechecks and later suites were not run because the mandatory membership failure required an immediate stop.

COHORT-01 B3 BLOCKED
diff --git a//tmp/cohort01-b3-validate.ts b//tmp/cohort01-b3-validate.ts
new file mode 100644
index 0000000000000000000000000000000000000000..464ce8f228cf529f9572c6fff079a3b71e898651
--- /dev/null
+++ b//tmp/cohort01-b3-validate.ts
@@ -0,0 +1,104 @@
+import { readFileSync, readdirSync } from 'node:fs';
+import { join } from 'node:path';
+import { traceCombatantLine } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/cover';
+import type { EncounterState } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/encounter';
+import type { CombatantId } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/values';
+import {
+  availableEngineActorOptions,
+  resolveEngineActorOption,
+  type ResolvedActionSlotUse,
+  type ResolvedTurnMechanics,
+} from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intent-resolver';
+import { decodeArenaFixtureText } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/entrypoint';
+import { freshMonsterPlanningState } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/monster-planning-state';
+import { buildOfferEnvironment } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/offers/build-offer-environment';
+import type { GeneratedRoom } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/room-generator';
+import { d466GeneratedRoomOverride } from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/d466-room-overrides';
+import {
+  brutalRoomMembershipViolations,
+  generatedRoomIntegrityViolations,
+} from '/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tools/d569-second-family-manifest';
+
+const directory = process.argv[2];
+if (directory === undefined) throw new TypeError('fixture directory required');
+const environment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+
+function targetedOffenseHasOpenTrace(
+  state: EncounterState,
+  mechanics: ResolvedTurnMechanics,
+  slot: ResolvedActionSlotUse,
+): boolean {
+  if (slot.kind !== 'attack' && slot.kind !== 'saving_throw' && slot.kind !== 'cast_spell') {
+    return true;
+  }
+  return slot.targetIds.every((targetId) => {
+    const trace = traceCombatantLine(state, mechanics.actorId, targetId, {
+      sourceAnchor: mechanics.finalPosition,
+    });
+    return !trace.blocksSight && trace.tier !== 'total';
+  });
+}
+
+function resolvedMechanicsIsProductive(
+  state: EncounterState,
+  mechanics: ResolvedTurnMechanics,
+): boolean {
+  const hasProductiveComponent = mechanics.movementCostFeet > 0 ||
+    mechanics.actionSlots.some((slot) =>
+      slot.kind === 'attack' || slot.kind === 'saving_throw' || slot.kind === 'cast_spell' ||
+      slot.kind === 'use_world_object');
+  if (!hasProductiveComponent) return false;
+  return mechanics.actionSlots.every((slot) => targetedOffenseHasOpenTrace(state, mechanics, slot));
+}
+
+function productiveWitness(state: EncounterState, actorId: CombatantId) {
+  for (const option of availableEngineActorOptions(state, actorId, environment)) {
+    const resolution = resolveEngineActorOption(state, option, environment);
+    if (!resolution.valid || !resolvedMechanicsIsProductive(state, resolution.mechanics)) continue;
+    const traces = resolution.mechanics.actionSlots.flatMap((slot) => {
+      if (slot.kind !== 'attack' && slot.kind !== 'saving_throw' && slot.kind !== 'cast_spell') {
+        return [];
+      }
+      return slot.targetIds.map((targetId) => {
+        const trace = traceCombatantLine(state, resolution.mechanics.actorId, targetId, {
+          sourceAnchor: resolution.mechanics.finalPosition,
+        });
+        return { kind: slot.kind, targetId, tier: trace.tier, blocksSight: trace.blocksSight };
+      });
+    });
+    return {
+      label: option.label,
+      movementCostFeet: resolution.mechanics.movementCostFeet,
+      actionKinds: resolution.mechanics.actionSlots.map(({ kind }) => kind),
+      traces,
+    };
+  }
+  return null;
+}
+
+const rows = readdirSync(directory).sort().map((name) => {
+  const bytes = readFileSync(join(directory, name), 'utf8');
+  const room = JSON.parse(bytes) as GeneratedRoom;
+  const state = freshMonsterPlanningState(decodeArenaFixtureText(bytes));
+  const living = state.combatants.filter((combatant) =>
+    combatant.profile.kind === 'monster' && combatant.life === 'living');
+  const witnesses = living.map((monster) => ({
+    actorId: monster.profile.id,
+    witness: productiveWitness(state, monster.profile.id),
+  }));
+  return {
+    seed: room.spec.seed,
+    integrity: generatedRoomIntegrityViolations(room, bytes),
+    structural: brutalRoomMembershipViolations(room)
+      .filter((violation) => violation.code !== 'brutal_productivity'),
+    terrainProfilePresent: Object.hasOwn(room.spec, 'terrainProfile'),
+    d466Override: d466GeneratedRoomOverride(room.spec.seed),
+    livingMonsters: living.length,
+    productiveMonsters: witnesses.filter(({ witness }) => witness !== null).length,
+    witnesses,
+  };
+});
+console.log(JSON.stringify(rows, null, 2));
+if (rows.some((row) => row.integrity.length > 0 || row.structural.length > 0 ||
+  row.terrainProfilePresent || row.d466Override !== null ||
+  row.livingMonsters !== row.productiveMonsters)) process.exitCode = 1;
diff --git a//tmp/cohort01-b3-vite.config.mjs b//tmp/cohort01-b3-vite.config.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..ff8b4c56321a3362fc00224b01800f62466f9a1f
--- /dev/null
+++ b//tmp/cohort01-b3-vite.config.mjs
@@ -0,0 +1 @@
+export default {};

tokens used
100,381
## BLOCKED — 6209 cohort rejected

The all-or-nothing membership gate failed. No fixtures were copied, hashed, or pinned; the worktree remains clean.

### Gates

- Frozen plan: `4bff2145b445cbb96771333bfdceb5cfdae8781e494cfa48622619cae0a2ac69`, 403 lines.
- HEAD: `bea24cbe`; WALL-01 accepted at `b94dd732`.
- `generatedLineIsOpen`: confirmed `trace.tier === 'none' && !trace.blocksSight`.
- Initial v2 suite: exit 1, exactly `30 failed | 4 passed`; all failures were expected ENOENTs.
- The nonproductive, Dash-only, and blocked-target witnesses all passed.

### Namespace evidence

```text
$ rg -n -o -e '6209[0-9]{3}|6210[0-9]{3}|6211[0-9]{3}|6_209_[0-9]{3}|6_210_[0-9]{3}|6_211_[0-9]{3}|6209xxx|6210xxx|6211xxx' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
23048:6209xxx
23048:6210xxx
23048:6211xxx
23061:6209xxx
23061:6210xxx
23061:6211xxx
23071:6209xxx
23071:6_209_001
status 0
```

```text
$ rg -n -o -e '6209[0-9]{3}|6210[0-9]{3}|6211[0-9]{3}|6_209_[0-9]{3}|6_210_[0-9]{3}|6_211_[0-9]{3}|6209xxx|6210xxx|6211xxx' tests/fixtures tools
<empty>
status 1
```

```text
$ rg -n -o -e '\b6209\b|\b6210\b|\b6211\b' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
23068:6209
23068:6210
23068:6211
status 0
```

Classification:

- Line 23048: D635.54 costing/reservation proposal.
- Line 23061: D643 owner-authorized reservation.
- Line 23068: D645 plan-summary reservation.
- Line 23071: D646 review example.
- D650 freezes the accepted plan but produces no direct pattern match.
- None represents prior generated seed use.

### Generation

The literal command initially exited 1 before generation because the symlinked `node_modules/.vite-temp` is read-only:

```text
npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out /tmp/cohort01-b3-a.BlRksh/arena-basis-brutal-v2
```

Both generations then completed with an empty temporary Vite configuration:

```text
npx vite-node -c /tmp/cohort01-b3-vite.config.mjs tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out /tmp/cohort01-b3-a.BlRksh/arena-basis-brutal-v2
status 0

npx vite-node -c /tmp/cohort01-b3-vite.config.mjs tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out /tmp/cohort01-b3-b.frHiBz/arena-basis-brutal-v2
status 0
```

```text
$ diff -rq /tmp/cohort01-b3-a.BlRksh/arena-basis-brutal-v2 /tmp/cohort01-b3-b.frHiBz/arena-basis-brutal-v2
<empty>
status 0
```

### Decoded membership

All ten passed integrity and structural brutal membership with:

- `integrity = []`
- `structural = []`
- no parsed `terrainProfile`
- `d466GeneratedRoomOverride(seed) === null`

Productivity results:

| Seed | Living/productive | Result | Productive witness |
|---:|---:|---|---|
| 6209001 | 4/1 | FAIL | monster 1 Bless; 3 traces `none/false` |
| 6209002 | 5/5 | PASS | Dash movement: 60, 55, 20, 45, 50 ft |
| 6209003 | 5/2 | FAIL | Bless: 3× `none/false`; Web: `three_quarters/false` |
| 6209004 | 3/1 | FAIL | Cure Wounds: `none/false` |
| 6209005 | 6/1 | FAIL | Light Crossbow: `none/false` |
| 6209006 | 5/1 | FAIL | Healing Word: `none/false` |
| 6209007 | 3/1 | FAIL | Bless: 3× `none/false` |
| 6209008 | 7/1 | FAIL | Bless: 3× `none/false` |
| 6209009 | 5/5 | PASS | Dash movement: 60, 20, 20, 60, 60 ft |
| 6209010 | 3/1 | FAIL | Bless: 3× `none/false` |

Result: 8/10 rooms failed; only 6209002 and 6209009 passed. Therefore all ten seeds were rejected.

No SHA-256 values were computed with either `sha256sum` or OpenSSL because the D569 ledger forbids hashing before 10/10 membership.

### Replacement audit

The next contiguous namespace, 6212xxx, was audited but not selected or generated:

```text
$ rg -n -o -e '6212[0-9]{3}|6_212_[0-9]{3}|6212xxx' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
<empty>
status 1

$ rg -n -o -e '6212[0-9]{3}|6_212_[0-9]{3}|6212xxx' tests/fixtures tools
<empty>
status 1

$ rg -n -o -e '\b6212\b' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
<empty>
status 1
```

Supervisor amendment is required before using 6212xxx.

### Final state

- Remaining RED titles: all 30 parameterized `satisfies active state-derived membership` cases—6209001–6209010, 6210001–6210010, and 6211001–6211010—remain ENOENT.
- V-freeze: exit 0.
- `git diff --check`: exit 0, empty.
- `git status --short`: exit 0, empty.
- Frozen 32-file inventory matches before/after.
- Typechecks and later suites were not run because the mandatory membership failure required an immediate stop.

COHORT-01 B3 BLOCKED
