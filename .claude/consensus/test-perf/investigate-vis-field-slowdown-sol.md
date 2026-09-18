<!-- trimmed 2026-09-18 (D683): full codex log (673577 bytes) replaced by the lane's final message; session id 01a0afa3-7fad-7433-8e38-dc38461d422f; the full log is in the mirror history of commit 8889b450 -->

## Performance investigation

Compared:

- VIS-FIELD branch: `807d2e3c8cbbda11cfa26d078ac7739f2954e27e`
- Main baseline: `9f1486665399571c57fdd82fa3745b1d8fca457a`

Vitest needed temporary storage, so `TMPDIR=/dev/shm` was used. Instrumentation was an inline `startVitest()` Vite transform that wrapped named functions in memory; repository files were never modified. Wrapper timings are inclusive and directional; uninstrumented Vitest timings are authoritative.

### 1. `vane-tpk-clean-terminates`

Command, run from each checkout:

```bash
TMPDIR=/dev/shm /usr/bin/time \
  -f 'WALL=%e USER=%U SYS=%S RSS_KB=%M EXIT=%x' \
  npx vitest run --configLoader runner \
  tests/integration/vtt/pc-algorithm-policy.test.ts \
  -t 'vane-tpk-clean-terminates' \
  --reporter=verbose --no-file-parallelism --testTimeout=20000
```

| Revision | Test time | Wall time | Delta |
|---|---:|---:|---:|
| Main | 3,180 ms | 12.08 s | — |
| VIS-FIELD | 6,820 ms | 15.71 s | +3,640 ms, 2.14× |

#### Exact call comparison

| Function/path | Main | VIS-FIELD | Multiplier |
|---|---:|---:|---:|
| Visibility queries (`canCombatantSee` / `detectCombatant`) | 105,823 | 88,059 | 0.83× |
| Pair sight queries | 105,823 | 88,059 | 0.83× |
| Creature/cell trace entry | 105,969 combatant traces | 348,284 cell traces | 3.29× |
| `traceSpaces` | 95,031 | 348,353 | 3.67× |
| `traceCornerLine` | 123,584 | 535,568 | 4.33× |
| Player projections | 275 | 206 | 0.75× |
| Derived-fog computations | authored fog only | 206 | new |

The slowdown is therefore not caused by more detection requests. It comes from expanding each sight query into target-cell traces in [visibility-field.ts](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/combat/visibility-field.ts:431), especially for large-footprint creatures.

Of the 348,284 VIS-FIELD cell traces:

| Caller | Calls | Share | Instrumented inclusive trace time |
|---|---:|---:|---:|
| `sightToCreature` pair detection | 319,444 | 91.7% | 4,758 ms |
| `derivedFogCells` | 28,840 | 8.3% | 555 ms |

Thus, only about 0.55–0.68 s is the full-board field/projection itself. Pairwise detection accounts for most of the added ~3.6 s.

#### Calls by combat round

The arena is 14×10, so a field scan is 140 cells.

| Round | Player projections | Distinct projected revisions | Fog traces | Pair-detection traces |
|---|---:|---:|---:|---:|
| Initial/r0 | 0 | 0 | 0 | 932 |
| 1 | 90 | 89 | 12,600 | 159,222 |
| 2 | 50 | 50 | 7,000 | 83,108 |
| 3 | 65 | 65 | 9,100 | 74,526 |
| 4 | 1 | 1 | 140 | 1,656 |
| Total | 206 | 205 | 28,840 | 319,444 |

The field is effectively recomputed once per projected state revision/controller request, not once per turn. There were 206 projections across 205 distinct revisions; only one revision was projected twice. Because the first eligible observer sees the whole board in this fixture, each projection performed exactly 140 fog traces even when the eligible observer set contained multiple PCs.

The weak caches in [visibility-field.ts](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/combat/visibility-field.ts:104) are state-object keyed. Immutable reducer revisions therefore make nearly every request cold, despite unchanged geometry and illumination.

---

### 2. LOS-cover tests

Matched four-way timing command, substituting each title and checkout:

```bash
TMPDIR=/dev/shm /usr/bin/time \
  -f 'WALL=%e USER=%U SYS=%S RSS_KB=%M EXIT=%x' \
  npx vitest run --configLoader runner \
  tests/unit/vtt/room-generator-los-cover.test.ts \
  -t '<exact test title>' \
  --reporter=verbose --no-file-parallelism --testTimeout=20000
```

| Test | Main | VIS-FIELD | Delta |
|---|---:|---:|---:|
| Productive first-turn option | 5,472 ms | 6,139 ms | +667 ms, +12.2% |
| WALL-SEALS-ROOM | 5,395 ms | 5,865 ms | +470 ms, +8.7% |

These timings were under matched concurrent load; they explain the 5.1–6.2 s full-suite observations but are less quiet than the vane and D630 measurements.

#### Productive first-turn profile

| Path | Main calls/time | VIS-FIELD calls/time |
|---|---:|---:|
| `generateRoom` | 9 / 3,749 ms | 9 / 4,550 ms |
| `traceSpaces` | 284,121 / 3,530 ms | 284,121 / 4,331 ms |
| `traceCornerLine` | 4,173,840 / 1,213 ms | 4,173,984 / 1,932 ms |
| `firstSharedEdgeBlockingCell` | absent | 4,173,984 / 380 ms |
| `reach` | 46,650 / 325 ms | 46,650 / 367 ms |
| Offer environments built | 1 | 1 |
| Monster option enumerations | 39 | 39 |
| Options resolved | 630 | 630 |

This regression is the seam scan in [cover.ts](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/combat/cover.ts:304), not visibility-field computation or extra offer generation.

The 46,650 `reach` results were:

| Result | Count |
|---|---:|
| `target_out_of_range` | 33,092 |
| `action_range_unresolved` | 861 |
| Legal | 12,556 |
| `target_outside_line_of_sight` | 141 |

All 46,650 performed an anchored line trace before the range verdict in [engine-query-port.ts](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/engine-query-port.ts:1134). Therefore 33,953 traces—72.8%—were performed for candidates subsequently rejected by range handling.

#### WALL-SEALS-ROOM profile

On VIS-FIELD:

| Path | Calls | Inclusive time |
|---|---:|---:|
| `generateRoom` | 9 | 4,461 ms |
| `traceSpaces` | 249,127 | 4,038 ms |
| `traceCornerLine` | 3,985,264 | 1,801 ms |
| `firstSharedEdgeBlockingCell` | 3,985,264 | 358 ms |
| `reachesProductiveRegion` | 64 | 787 ms |
| `findPath` | 108 | 782 ms |

Again, room generation dominates. The test-specific reachability assertion is under 0.8 s.

---

### 3. D630 replay + detection pair

Command, run sequentially from each checkout:

```bash
TMPDIR=/dev/shm /usr/bin/time \
  -f 'WALL=%e USER=%U SYS=%S RSS_KB=%M EXIT=%x' \
  npx vitest run --configLoader runner \
  tests/unit/vtt/replay.test.ts \
  tests/unit/vtt/detection-reactions.test.ts \
  --reporter=verbose --no-file-parallelism --testTimeout=60000
```

| Revision | Tests | Test time | Vitest duration | Wall |
|---|---:|---:|---:|---:|
| Main | 35 | 28.24 s | 33.55 s | 34.04 s |
| VIS-FIELD | 36 | 35.94 s | 41.45 s | 41.97 s |
| Delta | +1 | +7.70 s | +7.90 s | +7.93 s |

The extra branch detection test took 2 ms. Detection-reactions otherwise remained 0–16 ms per test; replay owns essentially the entire regression.

Largest replay movements:

| Test | Main | VIS-FIELD | Delta |
|---|---:|---:|---:|
| OWN-BUNDLE-VERSION-OUTSIDE-WINDOW | 3,255 ms | 4,145 ms | +890 ms |
| PLAYABLE-EXIT | 2,935 ms | 3,736 ms | +801 ms |
| REPLAY-COMMAND | 2,808 ms | 3,495 ms | +687 ms |
| OWN-TOKEN-COUNTS | 1,849 ms | 2,382 ms | +533 ms |
| M63 latency/hash | 2,027 ms | 2,539 ms | +512 ms |
| M65 void branch | 1,497 ms | 2,004 ms | +507 ms |
| M64 no live controller | 1,835 ms | 2,339 ms | +504 ms |

#### Representative PLAYABLE profile

[replay.ts](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/replay.ts:238) creates one DM projection plus one projection per PC for every replayed revision.

| Path | Main | VIS-FIELD |
|---|---:|---:|
| `projectReplayViews` calls | 822 | 828 |
| DM views | 853 | 859 |
| Player views | 2,484 | 2,502 |
| Derived-fog calls | authored fog | 3,361 |
| `traceSpaces` | 47,918 | 159,843 |
| `projectReplayViews` inclusive | 556 ms | 923 ms |
| `replayBundle` inclusive | 2,240 ms | 2,891 ms |

One PLAYABLE invocation rebuilt the scripted gate once:

- `recordScriptedReferenceSkirmish`: 1,905 ms
- `createReplayBundle`: 896 ms
- `replayRevisionRecords`: 331 ms
- `replayBundle`: five calls, 2,766 ms cumulative/inclusive

The replay file contains 15 gate constructions, 13 using the default parameters. This confirms the pending TEST-PERF plan’s default-gate reuse is the largest bounded test-only opportunity.

---

## Top three hot paths and bounded fixes

| Rank | Hot path | Proposed fix | Estimated saving | Required invariant/witness |
|---|---|---|---:|---|
| 1 | Repeated scripted replay gate plus per-revision projections | Build each parameterized gate once, deep-freeze it, and `structuredClone` every mutating candidate. Retain independent `replayBundle` execution per test. | Roughly 20–23 s from the replay file: 12 redundant default builds × ~1.9 s gross | Gate canonical hash unchanged before/after every test; shuffled-order run twice; separate cache entries for default and both non-default parameter combinations; every corruption test must still fail against its independently cloned mutation. |
| 2 | `sightToCreature → evaluateCell → traceCombatantLineToCells → traceSpaces` | Cache visibility outcomes by an explicit visibility/geometry epoch plus observer/subject or observer-set key, rather than `EncounterState` identity. HP/event-log-only revisions may reuse; movement, footprints, walls, objects, light, obscurement, relevant conditions/effects, hidden state, senses, life, placement, or observer eligibility must bump the epoch. | Approximately 2.5–3.5 s in vane; 0.4–0.8 s per full replay reconstruction | For every revision, compare cached output with a forced from-scratch computation for every eligible observer/subject pair and every cell. Require byte-identical fog, sight reason/sense/grade, and projection hashes. Include Large/Huge footprints, seam rays, darkness, obscurement, Invisible, Hidden, Blinded, death and placement changes. |
| 3 | Nine-room regeneration and millions of seam-bearing corner traces | TEST-PERF: generate and deep-freeze the nine versioned rooms once per suite, reuse them in read-only tests, and preserve two independent generations solely for determinism. Separately, memoize seam results by blocking-topology signature plus corner endpoints where production generation still repeats them. | About 4.46–4.55 s from each named test; seam memoization offers another bounded ~0.35–0.7 s | Shared fixtures must remain byte-identical and immutable; mutation-isolation witness must fail on attempted writes. Seam cache must match fresh results for all rays in all nine rooms, including reverse, horizontal, vertical, diagonal, zero-length and source/target-adjacent rays; `blocksSight`, `firstBlockingCell`, physical cover tier and source IDs must all match. |

A smaller fourth opportunity is offer-internal range pruning: 72.8% of productive-test `reach` calls traced LOS before ultimately failing range. Keep public `reach` refusal precedence unchanged; prefilter only the offer-generation path using the same range predicate. The measured upper bound is roughly 0.2–0.3 s in this test.

## Correctness-smell assessment

- No evidence of fields being computed for ineligible observers. [eligibleVisibilityObserverIds](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/combat/visibility-field.ts:525) excluded dead, unplaced, adjudication-pending and Unconscious combatants. Observed fog work was exactly 140 traces per projection because the first eligible observer saw every board cell.
- The state-identity cache is a performance-design smell, not a current correctness defect. It preserves correct results but discards reuse across revisions whose visibility inputs are unchanged.
- Per-target-cell tracing for large footprints is correctness-sensitive. Replacing it with a single representative ray without a from-scratch differential witness would be a correctness regression.
- The 33,953 range-doomed LOS traces are semantic overwork and therefore a correctness-adjacent smell in offer generation. Results are currently correct, but the engine evaluates expensive geometry for candidates already mechanically impossible. Reordering the public validation path could change refusal precedence, so the safe fix belongs in internal offer prefiltering.
- The shared-edge scan itself is required correctness work. Its cost is real, but removing it or folding it into physical cover would violate the optical seam rule.

## Integrity and restoration

Production hash command:

```bash
find src -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum
```

| Checkout | Before | After |
|---|---|---|
| VIS-FIELD | `f46957b6d8e35287823e5243247c347e47896de19490afcd2f2871bfdaffa064` | identical |
| Main | `59f5d4e7fa03612f7eb5163911eebcd4d3521e930dc5556aace23c66d644ead1` | identical |

VIS-FIELD remained clean. Main’s pre-existing `.claude/**` modifications and untracked files were unchanged; no production file changed. All instrumentation existed only in Vitest’s in-memory transform pipeline, and no test process remained running.

PERF-INVESTIGATION DONE
