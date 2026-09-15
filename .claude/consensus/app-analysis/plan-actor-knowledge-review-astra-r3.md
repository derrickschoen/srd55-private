# ACTOR-KNOWLEDGE-01 plan review r3 (final) — gpt-6-astra (read-only)

Reviewed plan sha 212ed6a0… (660 lines) on 40f04e2c. Session 01a0a204-dbd5-7ba2-a95e-7ad00c21d5be. Log .tmp/runs/fanout/review-plan-actor-knowledge-r3.log.

# ACCEPT PLAN ACTOR-KNOWLEDGE

**Blocking list: none.** PAK2-F1 and PAK2-F2 are closed in the plan. One non-blocking verification limitation remains.

## Verified integrity and diff scope

| Probe | Result |
|---|---|
| `git rev-parse HEAD` | `40f04e2cad4d5d5e170d6caf0adb033e14252990` |
| `git status --short --untracked-files=all` | Clean before and after review |
| `wc -l .tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md` | **660 lines** |
| `sha256sum .tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md` | `212ed6a0ffe10c5fce6e6fa8c7652000a43695e538d788d1d8f5c75e1f7f3566` |
| `sha256sum src/vtt/intel/contracts.ts` | `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1` |
| `npx vitest list --configLoader runner --filesOnly --json` | **641 entries, 641 unique files** |

I reverse-applied the report’s diff **in memory**, checking every hunk against the actual R3 file. Result:

```text
6 hunks; 37 added lines; 27 removed lines
Reconstructed R2: 650 lines, 44,011 bytes
SHA-256: 8a719741f4c78a58ba6c13a8e9d904260532b5f437fe0ed0073b4adcb4685b10
R3: 45,303 bytes
```

Every hunk fits the authorized scope:

| R3 location | Change |
|---|---|
| 10 | Round table and line references |
| 156 | Three SRD paths |
| 241 | Adjacent teleport fixture and movement constraint |
| 362 | Matching fixture-matrix clarification |
| 456 | Golden normalizers and preservation checkpoint |
| 653 | Completion-evidence wording and round marker |

The completion-evidence condensation retains the existing obligations. No additional implementation scope changed.

## Finding

### PAK3-F1 — P2, NON-BLOCKING: Exact arena-golden reproduction remains an implementation checkpoint

**Plan:** [lines 466–474](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md:466).

**Reason non-blocking:** The serialization defect is fixed, and the plan now explicitly requires both unchanged-fixture proofs before production wire edits.

**Probes:**

```bash
sed -n '545,557p;584,610p;669,683p' tests/unit/tools/ai-dm-board-delivery.test.ts
sed -n '2330,2336p' tools/ai-dm-conversation.ts
```

I reran the actual production runtime in memory, using separately written literal legacy blocks and the planned operation:

```js
const parsed = JSON.parse(raw);
parsed.actor_knowledge = structuredClone(legacyLiteral);
return JSON.stringify(parsed);
```

For footprint normalization, I additionally assigned the existing `state_ref.state_handle` property without reconstructing its containing object.

**Output:**

| Check | Result |
|---|---|
| Unchanged raw payload | **7,317 bytes** |
| Insertion-order normalized payload | **7,317 bytes**, byte-identical |
| Both SHA-256 values | `37353a7960e75859f8533cdd79120d5ed1d78fd03a7f26de60cef0aab46e2a5c` |
| Footprint-normalized payload | **7,322 bytes** |
| Matches original two-string-replacement transform | **true** |
| Change tag from 28 to 36 bytes | Payload becomes **7,325 bytes** |
| Normalize changed tag back to literal legacy block | Original bytes restored: **true** |
| Canonical JSON equals original raw output | **false**, confirming why R2 failed |

Thus the revised recipe preserves insertion order and the footprint transform’s **+5-byte** difference. These are the serialization preconditions behind the **31,995 / 32,000** historical lengths.

I did **not** reproduce the two complete arena hashes. Their existing fixtures call `mkdtempSync` and `runArena` with output files. Executing those fixtures would violate this review’s read-only constraints. The smaller runtime probe is not a substitute for those full-fixture results.

**Minimal change:** None to the plan. Execute and record both mandatory unchanged-fixture proofs at the first B2 checkpoint. Retain the existing literal hashes; stop if either fails.

## Closure checks

### PAK2-F1 — Closed

[Lines 459–475](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md:459) now require:

- Ordinary insertion-order `JSON.stringify`.
- Explicit legacy property order and in-place replacement.
- No canonicalization, sorting, or spread reconstruction.
- Both historical golden proofs before wire edits.
- Separate literal new-wire assertions and cap/trim assertions.
- A stop and independent invariant for changes outside the approved normalization.
- No regeneration of historical lengths or hashes.

Both exact historical oracles remain unchanged.

### PAK2-F2 — Closed

Read-only Node line inspection confirmed:

| Source | Verified text |
|---|---|
| `docs/srd/source/spell-descriptions.txt:2167` | Dimension Door relocation |
| `docs/srd/source/spell-descriptions.txt:5533` | Misty Step silvery mist |
| `docs/srd/source/spell-descriptions.txt:6434` | Ray of Frost blue-white beam |

The paths at plan **159, 166, 169** now match those sources.

### Teleport fixture — Closed

```bash
sed -n '364,376p' src/combat/movement.ts
```

Lines **369–370** reject non-adjacent movement as `non_adjacent_step`. Plan **244–246** now selects the adjacent fogged-cell fixture successfully exercised in R2 and reserves non-adjacent geometry for the real spell path. It explicitly excludes movement-mechanics changes.

## Dimension verdicts

| Dimension | Verdict |
|---|---|
| Single producer | **PASS in design** — unchanged canonical producer and projection-only serializer boundary |
| Knowledge model | **PASS** — recency without witnessed-transition claims or hidden-position disclosure |
| Divergence closure | **PASS** — located, fog, faction, and history expectations retained |
| Pins and invariants | **PASS in design** — **18 rows**; exact arena proofs remain the non-blocking checkpoint above |
| Enforcement | **PASS in design** — symbol-resolved closure, bypass controls, and post-offers gate wiring retained |
| Batches | **PASS** — **9/10/3**, **22 distinct files**, **2 new specs** |
| Overlap | **PASS** — ten-file preservation contract unchanged |
| Verification/mutants | **PASS in design** — **14 focused specs**, **7 mutants**, discovery **baseline +2**, no regenerated expectations |

No implementation or mutant execution is claimed. No writes, Vitest runs, model calls, or other agents were used.

**ACCEPT PLAN ACTOR-KNOWLEDGE — blocking list: none.**

ACTOR KNOWLEDGE PLAN REVIEW R3 DONE