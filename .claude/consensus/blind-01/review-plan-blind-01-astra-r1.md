<!-- trimmed 2026-09-18 (D683): full codex log (1572135 bytes) replaced by the lane's final message; session id 01a0b492-a268-71e1-a5b4-462354754f60; the full log is in the mirror history of commit 8889b450 -->

**PLAN-F1 — P1 — Search memories are not currently safe knowledge.**  
Location: plan lines 46–70.

The proposed join would expose an unseen PC’s true position. I reproduced this with the real reducer in the sealed-room scene:

- Before Hide: projection is `unknown / never_observed`; observation history is empty.
- PC successfully Hides at `(7,2)`.
- After Hide: projection remains unknown and history remains empty, but a search memory now contains `lastKnownPosition: (7,2)` and suspicion cells `[(7,2)]`.

The cause is [encounter.ts](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/src/combat/encounter.ts:2284): `hiddenNow` bypasses the previously-seen requirement, then memory creation uses the visibility snapshot’s true position. “Reducer-owned” does not establish knowledge provenance.

**Fix:** repair and test that producer before consuming these memories. Never-observed Hide must not manufacture a cue; previously observed targets moving and hiding unseen must not refresh historical coordinates. Add the reducer and its tests to explicit batches. Retain the single knowledge producer; do not compensate by reading unseen tokens in offers.

**PLAN-F2 — P1 — The allowed manifests and type-expansion sequence cannot complete.**  
Location: plan lines 226–297.

An in-memory expansion of the specified engagement union and Search types produced **15 app diagnostics and 17 node diagnostics**. Both unmodified configurations have **0**.

Concrete omissions:

- [plan-materiality.ts:128](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/src/vtt/plan-materiality.ts:128) reads `engagement.anchor` without narrowing; this file is absent from every batch.
- [blind-dm-contract.ts:97](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/src/vtt/blind-dm-contract.ts:97) owns the blind action enum and input schema. It lacks Search and is also absent. `blindActionSchema.safeParse({kind:'search'}).success` is **false**. Editing the importing MCP schema cannot fix that source contract.
- `snippets.test.ts` acquires two diagnostics but belongs to B4; B2 permits only diagnostics in B3 files, and B3 requires node **0**.
- B1 requires the no-coordinate offer witness green before B2 implements that offer.

Batch sizes themselves are **5, 10, 10, 10, 10, 6**. Three declared paths are absent at the base: the explicitly new posture test, `arena-basis-brutal-v2.test.ts`, and `d569-v6.test.ts`.

**Fix:** rebatch the complete consumer/schema surface, place each witness with its implementation, and explicitly distinguish new files from COHORT-supplied prerequisites. Verify the latter against a named prerequisite revision.

**PLAN-F3 — P1 — Productivity lands after the gate that needs it.**  
Location: plan lines 31–35, 178–190, 299–315.

B1–B4 land before COHORT-01 retries B3, but the productivity amendment is deferred to B5, after COHORT supplies v2/v6.

This is a real dependency cycle. For **6209003’s Goblin Boss**, the proposed score has:

- **55 approaches**
- **31 reachable candidates**
- **11 tied maxima**
- winning origin **`(11,2)`**, path **`[]`**, cost **0**

Its existing options contain only Dodge/End Turn and their Nimble Escape variants. Seek Cover + Dodge at that origin still fails the old productivity predicate.

**Fix:** land the shared productivity amendment and its stationary-posture witness with the initial core, before COHORT’s productivity gate. Later batches can update versioned rows.

**PLAN-F4 — P2 — The hand oracle contradicts the aperture algorithm.**  
Location: plan lines 87–97, 124–138, 249–250.

The stated 9×5 map produces **four**, not one, approaches:

```text
(7,1), (0,2), (7,2), (7,3)
```

Column 7 lies between blocked columns 6 and 8, so every interior corridor cell satisfies the proposed opposite-wall test. That test identifies narrow corridors as well as wall apertures.

Using the existing tracer, the winning profile is:

```text
[(0,1), (1,1), (1,1), (1,1)]
```

The destination remains `(3,2)` at **10 feet**, but the required singleton approach/profile assertions are false.

**Fix:** decide whether this local corridor predicate is the intended definition of “open approaches,” then correct either the definition or the independently derived oracle. Specify trace direction explicitly. Add open-room, multiple-opening, wide-opening, and open/closed-door cases before freezing this policy.

**PLAN-F5 — P2 — A legal canonical path does not enforce the remaining movement budget when overridden.**  
Location: plan lines 71–74, 106–109, 153–157.

The existing query treats supplied `maximumFeet` as its budget. In the witness with the actor active and only **5 feet remaining**:

```ts
queries.path(state, {
  actorId,
  destination: { column: 3, row: 2 },
  movement: 'normal',
  maximumFeet: 30,
})
```

returns **legal, cost 10, budget 30**. Omitting the override returns illegal.

Thus “maximumFeet ≤ current speed” does not prove executable movement after an actor has already moved.

**Fix:** define the budget from the canonical available movement for the planning window, including active-turn remaining movement. Add partial-turn and zero-remaining witnesses. Explicitly prevent `movementWithBonusUse` from expanding blind-posture movement through bonus Dash.

**PLAN-F6 — P2 — The generation gate is impossible at the stated base.**  
Location: plan lines 26–28, 425–431.

There are **43** tracked rooms in the named families:

| Family | Rooms | Fresh generation byte-identical to tracked |
|---|---:|---:|
| hard | 13 | 0 |
| brutal | 10 | 0 |
| brutal-b | 10 | 0 |
| brutal-2 | 10 | 0 |
| **Total** | **43** | **0** |

Historical fixtures retain `foggedCells`; some also lack fields now emitted by generation.

The import assertion also needs qualification:

- Runtime dependency traversal found **75** modules from `room-generator.ts` and **303** from `generate-arena-basis.ts`, reaching **none** of the four prohibited offer modules.
- Traversal including type dependencies reaches **all four**.

The substantive claim that generation does not consult offers holds; the proposed proof does not.

**Fix:** independently require **43/43 tracked fixture hashes unchanged** and **43/43 fresh pre-change versus post-change generations identical**. Do not require fresh output to equal historical fixtures. Make the dependency assertion explicitly runtime-only.

**PLAN-F7 — P2 — The frozen D583 count is wrong for this base and manifest.**  
Location: plan lines 331–405, 435.

Running the actual inventory function in memory gives:

```text
changedPaths: []                             → 148
changedPaths: ['src/vtt/turn-proposal.ts']    → 213
changedPaths: all 51 declared allowed paths  → 216
```

The complete manifest includes the new posture test and future v6 test, which the proposed **214** gate omits. The copied investigation also used a different checkout.

**Fix:** derive and review the inventory from this base plus explicit prerequisites and new files. For the currently declared manifest, the hypothetical union is **216**, before further fixes introduce paths. Keep the expected set independently reviewed rather than normalizing it from a candidate run.

**PLAN-F8 — P2 — The witnesses do not prove map-only selection or the multi-approach ordering.**  
Location: plan lines 110–120, 170–174, 220, 244–247.

The coordinate walker detects serialized leakage. It cannot detect a query that consults an unseen PC, selects a destination using that position, and returns an otherwise clean policy-only offer. Likewise, tracer agreement verifies reported profiles, not that candidate selection used only map information.

The principal oracle also cannot distinguish weakest-first lexicographic scoring from several incorrect aggregations: its additional sealed approaches contribute the same strengths throughout the relevant candidates.

**Fix:** add:

- An unseen-PC relocation control with unchanged topology and candidate/path legality; approach set, winner, profile, and path must remain unchanged.
- A mutant that uses unseen-PC direction without serializing coordinates.
- Hand-computed competing multi-approach profiles distinguishing the specified ordering from summed cover.
- Equal-cost row/column ties and an empty-approach origin case.
- An explicit footprint policy and Large-creature witness: `traceTerrainLine` evaluates bare cells, while both Bear and Eagle are Large.

**PLAN-F9 — P3 — Q1 overstates its effect on option IDs.**  
Location: plan lines 439–443.

Changing only the resolver’s cover ordering does not change a policy-only offer’s canonical body. With the same `blind-cover-v1` tag, its option ID remains unchanged; resolved mechanics and their digest can change.

**Fix:** distinguish offer identity from resolution identity, and state when a policy-tag change is required.

The in-memory planner results were:

| Scene / actor | Approaches | Legal candidates | Proposed winner | Cost |
|---|---:|---:|---|---:|
| 9×5 witness | 4 | 16 | `(3,2)` | 10 |
| Witness starting at best cover | 4 | 16 | origin `(3,2)` | 0 |
| 6209001 Deepwood Bear | 81 | 60 | `(16,2)` | 10 |
| 6209001 Harrier Eagle | 81 | 8 | `(19,4)` | 5 |
| 6209001 Ghast | 81 | 81 | `(18,2)` | 5 |
| 6209003 Goblin Boss | 55 | 31 | origin `(11,2)` | 0 |

These used the **existing canonical path planner and terrain tracer**, with an independent in-memory implementation of the plan’s scoring. They are not executions of an implemented `seekCover`. Bear’s path is `[(17,1),(16,2)]`; Eagle and Ghast each take one step. Their existing 6209001 menus are exactly **Dodge, End Turn**.

For the open questions, I recommend retaining both defaults:

- **Q1:** include optical blocking, while preserving and reporting the separate physical tier. Freeze the exact ordering with a distinguishing witness.
- **Q2:** automatic pursuit should emit move-and-search only. Leave suspected-square attacks available through their existing capability.

The productivity definition should explicitly count a valid blind posture even when all available cover scores are zero; that follows the owner’s “best reachable” reading. An ordinary stationary Dodge remains insufficient. State this boundary in a test. The knowledge matrix also needs explicit precedence tests for perceived-plus-memory, located-only, expired memory, pending placement, and non-dead versus strictly living targets—the current projection includes dying opponents.

The hand-ledger requirement for Room-8, composite, speculative, snippets, standard offers, brutal-b execution, and D569 v2/v6 is sound, but those derivations are still future work. Keep the nonempty speculative scene and frozen v1/v5 controls. The ELEVATION-02/D584 rebase note is adequate as an ownership requirement; its overlays must run against the actual landing revision.

Commands executed included:

```bash
git branch --show-current
git rev-parse HEAD
sha256sum .tmp-plans/2026-09-18-blind-01-plan.md
wc -l .tmp-plans/2026-09-18-blind-01-plan.md
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit
node scripts/check-offer-environment-architecture.mjs --self-test
node scripts/check-offer-environment-architecture.mjs
node scripts/check-command-outcomes.mjs
git status --porcelain=v1
```

Results: branch **`claude/blind-01`**, commit **`b94dd73221697e3d03da8991746726563777fa74`**, SHA-256 **`e78967b7ecd4204d97e03b1589c10950f61165e9f97c96113beac3e72b16889f`**, **450 lines**; TypeScript **0/0**; architecture **77 fixtures**, **1,624 TypeScript files**, exit **0**; command-outcomes exit **0**; clean worktree.

Additional `node <<'NODE'` probes used an in-memory TypeScript loader, raw-text import handling, and host-only `import.meta` adaptation. Their engine calls were `generateRoom(seed,{difficulty:'brutal'})`, `freshMonsterPlanningState`, `buildOfferEnvironment({kind:'configuration',mode:'legacy_standard'})`, `queries.path`, `traceTerrainLine`, `availableEngineActorOptions`, and `reduceEncounter`. The Hide reproduction used `{type:'roll_initiative'}` followed by `{type:'hide',actor:pc.id}`, both with RNG `()=>0.975`, and heavy obscurement confined to `(7,2)`.

No files or git state were changed. No full Vitest, Playwright, build, model calls, or server ran. The **36/36**, **185/185**, and **≤41-second** candidate gates remain unproved.

VERDICT: REJECT (3 P1, 5 P2)
REVIEW DONE
