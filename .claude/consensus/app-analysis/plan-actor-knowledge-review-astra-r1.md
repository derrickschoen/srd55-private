# ACTOR-KNOWLEDGE-01 plan review r1 — gpt-6-astra (read-only)

Reviewed plan sha cb43b354… on 40f04e2c. Session 01a0a204-dbd5-7ba2-a95e-7ad00c21d5be. Log .tmp/runs/fanout/review-plan-actor-knowledge-r1.log.

# REJECT PLAN ACTOR-KNOWLEDGE

Blocking findings: **PAK1-F1, PAK1-F2, PAK1-F3, PAK1-F4, PAK1-F5**.

## Verified baseline

| Command | Result |
|---|---|
| `git rev-parse HEAD` | `40f04e2cad4d5d5e170d6caf0adb033e14252990` |
| `git status --short --untracked-files=all` | Clean, including after review |
| `wc -l .tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md` | **599** |
| `sha256sum .tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md` | `cb43b354d2221c3979baf266379518ef2c0a6af1265d5c02d2f30f0d8c9a6903` |
| `sha256sum src/vtt/intel/contracts.ts` | `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1` |
| `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false` | Exit **0**, **0 diagnostics** |
| `node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false` | Exit **0**, **0 diagnostics** |
| `sg scan --config sgconfig.yml src` | Exit **0**, **0 findings** |
| `npx vitest list --configLoader runner --filesOnly --json` | **641 entries, 641 unique files** |
| `npx vitest run --configLoader runner tests/unit/vtt/actor-knowledge.test.ts` | Exit **1**, **0 tests collected** |

Both `tsBuildInfoFile` paths are under `/tmp`, as required. Vitest failed before collection:

```text
ENOENT: no such file or directory, mkdir '/tmp/3jc181oAMZ-R6GKE_wEwG/ssr'
```

Thus I **cannot corroborate the plan’s eight-test pass** in this session. No implementation tests or mutants were executed.

## Findings

### PAK1-F1 — P1: Recency does not prove a witnessed transition

**Plan:** [lines 202–207](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md:202), also 63 and 218–227.

**Probe:** `nl -ba src/combat/encounter.ts | sed -n '2260,2308p;12920,12980p'`, followed by an in-memory TypeScript load of the actual encounter functions.

The history fields and reducer ordering are correctly identified:

- History records `round` and `revision`.
- Pre-command reconciliation uses revision **N**.
- The command executes at **N+1**.
- Post-command reconciliation retains the earlier observation if the target is unseen.

Therefore, **seen immediately before the command → unseen afterward** leaves observation revision `state.revision - 1`.

The converse used by the plan is false. My read-only runtime probe performed:

```ts
const s = reconcileObservationHistory(createEncounter(/* two visible combatants */));
const h = {
  ...s,
  hiddenCombatants: [{ combatant: subject.id, stealthTotal: 18, edition: '2024' }],
};
const after = reduceEncounter(h, { type: 'roll_initiative' }, () => 0.5).state;
```

Actual output:

```text
before detection: undetected / hidden
after detection:  undetected / hidden
state revision:   1
observation:      round 0, revision 0
plan predicate:   true
```

The target was already hidden before this command. The timestamp alone cannot establish the claimed transition or distinguish synthetic history. The plan’s own manually assigned revision-17 fixture has the same problem.

Also, after another unrelated command, the same remembered disappearance becomes `transition_not_observed`; that is not equivalent to “the transition was observed earlier.”

**Minimal change:** Either describe this field strictly as recent observation evidence, without claiming a witnessed sudden transition, or identify actual transition provenance and its lifetime. Add hand-authored tests for already-unseen input, synthetic previous-revision history, and an unrelated command after disappearance. Define a reducer-driven owner scenario rather than assigning its critical timestamps.

### PAK1-F2 — P1: Prose still manufactures perception of unlocated targets

**Plan:** [lines 230–231](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md:230), 332 and 457.

**Probe:** `sed -n '1314,1353p' src/vtt/renderer-profile.ts`; execution of its actual `record`, `array`, and `actorKnowledgeText` functions extracted through the TypeScript AST.

For one **suspected** sorcerer, current output is:

```text
Actor knowledge is shared: all 1 actors perceive sorcerer.
monster last saw sorcerer at cell (2, 1).
```

`actorKnowledgeText` collects every target ID without inspecting `kind`, then says those targets are perceived. Adding the planned recency sentence leaves this contradiction intact. The proposed positive sentence and forbidden-cause assertions would not catch it.

**Minimal change:** Explicitly replace this classification with exhaustive rendering of the projection’s discriminants. Test complete output for suspected, unknown, placement-pending, and mixed target lists in both prose formats. Assert that unlocated targets are never described as currently perceived.

### PAK1-F3 — P1: Board-delivery preservation omits an existing golden

**Plan:** [lines 400–406](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md:400), also 561.

**Probe:**

```bash
rg -n 'E1C_RAW_CONTEXT_SHA256|FOOTPRINTS_RAW_CONTEXT_SHA256' tests/unit/tools/ai-dm-board-delivery.test.ts
nl -ba tests/unit/tools/ai-dm-board-delivery.test.ts | sed -n '545,557p;669,682p'
```

There are **two** relevant golden checks:

1. Lines **555–556** require raw length **31,995** and raw hash  
   `4071943750fc963ceac5a39fcd1baa71e9a3fd2dcc9bc539a1bb0bec4dc18e6d`.
2. Lines **669–682** contain the normalized **32,000-byte** footprint oracle discussed by the plan.

The first is absent from the pin ledger and normalization proposal.

Exact string-length probe:

```bash
node -e 'for(const s of ["actor-knowledge-v3-last-seen","actor-knowledge-last-seen-v5+wire-v1"])console.log(s,s.length)'
```

Output: **28 → 36 bytes**. Even changing only that tag changes a retained raw golden; the proposed wire expansion changes more.

Preserving the second hash through normalization is possible only if everything outside the normalized region remains identical. The plan has not established that after selection changes and context trimming.

**Minimal change:** Inventory and address both goldens. Specify independently authored normalization and new-wire assertions for each affected fixture. Prove whether trimming changes other fields; do not assume replacing `actor_knowledge` alone restores the old bytes, and do not replace either hash with newly observed output.

### PAK1-F4 — P1: Discovery requires the wrong delta

**Plan:** [lines 542–544](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md:542), also 503 and 584.

**Probe:** Read-only Node manifest extraction and `fs.existsSync`, checked against actual Vitest discovery.

The manifest creates:

```text
tests/unit/vtt/actor-knowledge-wire.test.ts
scripts/check-actor-knowledge-architecture.mjs
tests/unit/vtt/actor-knowledge-architecture.test.ts
```

Both new `.test.ts` paths match `vitest.config.ts:include`. Neither currently exists.

Actual counts:

```text
B1: 9 files
B2: 10 files
B3: 3 files
Total: 22 distinct files
New discovered specs: 2
```

The required count is **643** on unchanged `40f04e2c`, or **post-offers baseline + 2**. The specified `+1` makes the final stopping condition fail for the authorized implementation.

**Minimal change:** Correct all discovery statements and stopping conditions to **+2**.

### PAK1-F5 — P1: The architecture rule does not enforce its semantic boundary

**Plan:** [lines 357–379](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md:357).

**Probe:** Inspection of the proposed selection rule and all **3 positive / 8 negative** fixtures; `cat scripts/check-command-outcomes.sh`.

The checker selects functions by names or output keys. A second producer can move the forbidden operation into an innocently named helper:

```ts
function classify(state, queries, actor, target) {
  return queries.visibility(state, actor, target);
}
```

Actor-knowledge assembly can call that helper while also making the required `projectActorKnowledge` call. The plan specifies no transitive check. Aliased/destructured calls, element access, and differently named second producers also lack required negative fixtures.

Conversely, the proposed unrelated-visibility exception is broad and has no explicit ownership inventory.

**Minimal change:** Specify a bounded, enforceable serializer dependency boundary, including helper calls and imports. Add negative controls for helper indirection, aliases, bracket access, and renamed producers. Explicitly inventory permitted mechanical consumers. Verify the final post-offers gate entrypoint actually executes this checker.

### PAK1-F6 — P2: The overlap inventory is wrong

**Plan:** [line 493](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md:493).

**Probe:** Read-only Node intersection of both manifests. The permitted offers plan matches SHA  
`fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4`.

There are **10 shared files**, not one:

```text
src/vtt/mcp/engine-server.ts
scripts/check-command-outcomes.sh
tests/unit/vtt/last-seen.test.ts
tests/unit/vtt/footprint-increment-three.test.ts
tests/unit/vtt/engine-context-integrations.test.ts
tests/unit/vtt/prose-renderer.test.ts
tests/unit/tools/ai-dm-conversation.test.ts
tests/unit/tools/ai-dm-legacy-invariance.test.ts
tests/unit/tools/engine-mcp-handler.test.ts
tests/unit/tools/ai-dm-board-delivery.test.ts
```

Offers B16 removes identity helpers and related assertions in several shared tests. Offers also changes `check-command-outcomes.sh` to scan `src tools tests` and wires it into `test:gate`.

The engine-server symbol-based approach is executable: the offers plan does not name deletion of the actor-knowledge producer or `fullTurnContext`. But applying that preservation rule only to engine-server misses the shared fixtures and gate.

**Minimal change:** Extend §8 to all ten files, preserving landed fixture environments, codec imports, behavior assertions, and gate wiring.

### PAK1-F7 — P2: Two pin pairings are consistency checks, not independent semantic invariants

**Plan:** [lines 387 and 396](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md:387).

**Probe:** `sed -n '1089,1103p' tests/unit/tools/engine-mcp-handler.test.ts` and `sed -n '383,411p' tests/unit/combat/creature-space.test.ts`.

I counted **17 ledger rows**. Two pairings are insufficient as written:

- Generated-schema equality proves that the generated artifact matches Zod; both can agree on the wrong knowledge contract.
- Source literal extraction plus tag relation proves version consistency, not located/fog/history behavior.

The matrix can supply the missing independent witnesses, but the ledger does not connect these rows to them.

**Minimal change:** Pair both rows explicitly with named hand-authored schema/wire cases and a semantic mutant. Retain generation equality and tag relation as additional checks.

### PAK1-F8 — P3: Three SRD source line references are incorrect

**Plan:** [lines 153–164](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md:153).

**Probe:** Read-only Node line lookup in the already column-normalized `docs/srd/source/spell-descriptions.txt`.

| Passage | Plan line reference | Actual source line |
|---|---:|---:|
| Ray of Frost, “A frigid beam…” | 3551 | **6434** |
| Dimension Door, “You teleport to a location within range…” | 9 | **2167** |
| Misty Step, “Briefly surrounded by silvery mist…” | 7896 | **5533** |

The substantive conclusions are sound: Ray of Frost describes blue-white light; Misty Step describes silvery mist; Dimension Door does not supply a universal visible disappearance cue. Invisible’s cited text at **11838–11853** describes concealment and attack effects, not observer identification of the cause.

**Minimal change:** Correct the citations. Keep exact-cause withholding and avoid turning “nearby” into an unsupported universal distance bound.

## Dimension verdicts

| Dimension | Verdict | Evidence |
|---|---|---|
| **A — Single producer** | **Partial** | §2.6 removes the duplicate actor/target classification and projects once per selected actor. The serializer has projection-only inputs. F2 leaves prose inventing perception; F5 does not enforce the boundary. |
| **B — Knowledge soundness** | **Fail** | Timestamp storage and forward reducer implication verified; witnessed-transition inference is unsound. Owner scenario uses assigned timestamps and misses contradictory prose. |
| **C — Divergence closure** | **Pass in design** | Intel wins for `located`, complete/partial fog, canonical summon faction, and actor-owned history. Each has a proposed hand-authored matrix row. |
| **D — Pins** | **Fail** | 17 rows counted; missed raw golden and incomplete independent pairings. Evaluator bump is justified. |
| **E — Enforcement** | **Fail** | Name-based selection and broad exceptions lack helper/alias closure. |
| **F — Batches** | **Pass, with discovery correction** | **9/10/3**, **22 distinct**, no repeats; every file has an identifiable change. No source-level compile-order blocker found. |
| **G — Overlap** | **Partial** | Wait-for-offers and rebase-by-symbols are workable; **10** shared files need preservation instructions. |
| **H — Verification** | **Fail as written** | T and sg pass now; **14** focused-spec commands specified. Discovery delta is wrong, transition/prose controls are missing, and behavioral baseline execution was blocked before collection. |

### Remaining raw-fact consumers

This command located remaining uses:

```bash
rg -n 'observationHistory|detectCombatant|queries\.visibility' src/vtt --glob '*.ts'
```

After the planned actor-report deletion, engine-server still has visibility calls at **941**, **959**, and **3061** for options, threats, and `engine.query_visibility`. Other consumers include `dm-tactical-intel.ts:198,281` and `speculative-planning.ts:151,416`. Capsule and persistence modules still read observation history for transport/validation.

These are not automatically forbidden second actor-knowledge producers: engine mechanics and the DM channel remain authoritative. However, the plan must explicitly distinguish them from actor-knowledge classification. In particular, `engine.query_visibility:3062` still returns fields named `actor_can_perceive_target` using seen-only visibility. The final implementation cannot claim that every API answering a perception question now uses the projection.

### Evaluator version decision

**The symmetric-evaluator bump is justified, not scope creep.** `SymmetricPcDecision` embeds `actorKnowledge` and its policy at `symmetric-pc-evaluator.ts:66–75,361–370`. Its public result therefore changes even if selected commands do not. Importing that evaluator identity into the scripted-party hash removes an existing retyped identity. The existing hand-computed movement and hidden-stat tests provide substantive invariants.

### Mutant ledger assessment

| Mutant | Assessment |
|---|---|
| `WIRE_RECOMPUTES_VISIBILITY` | Direct-call fixture is useful; helper/alias variants remain uncovered. |
| `WIRE_IGNORES_FOG` | Exact fully fogged wire expectation is an independent killer. |
| `WIRE_DROPS_LOCATED` | Exact tremorsense row is an independent killer. |
| `ALLY_RULE_DIVERGES` | Ownership/profile disagreement supplies a real discriminator. |
| `TAG_NOT_DERIVED` | Runtime relation alone cannot kill an equal literal; the source gate must kill it. |
| `RECENCY_DROPPED` | Hand-authored age/time expectations kill omission, but do not validate transition inference. |
| `TRUTH_LEAK` | Unique destination plus exact-object assertions supplies a real killer; mutation must compile and fail behaviorally. |

These are **planned witnesses**, not demonstrated kills. Preserve the prohibition on regenerating expectations, and add controls for the transition and prose failures above.

**REJECT PLAN ACTOR-KNOWLEDGE — blocking: PAK1-F1, PAK1-F2, PAK1-F3, PAK1-F4, PAK1-F5.**

ACTOR KNOWLEDGE PLAN REVIEW R1 DONE