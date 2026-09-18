## Finding — F2 remains open, P1

**The new darkness fallback grants Keen Sight to nonvisual awareness.**

At [encounter.ts:4823](src/combat/encounter.ts:4823), an unseen target with reason `darkness` or `out_of_range` receives ordinary passive Perception **plus Keen Sight’s +5**. The comment explicitly describes nonvisual cues.

That conflicts with:

- `docs/srd/full/srd-5.2.1.txt:661–664,11348–11352`: heavy obscurement blinds the observer for that target; sight-dependent checks automatically fail.
- `docs/homebrew/ogl/srd-5.1/srd-5.1-ogl.txt:23010–23011`: Keen Sight benefits checks **relying on sight**.

**My independent probe:** normal sight, Keen Sight, passive Perception 12, unlit target five feet away.

```text
sightToCreature: unseen
Nonvisual passive expectation: 12
Actual: 17
```

The retained darkness test at `tests/unit/vtt/detection-reactions.test.ts:125–140` embeds this incorrect bonus. Its passing result does not establish RAW correctness. This behavior predates the fix, but the new explicit fallback preserves it instead of resolving the sight/nonvisual distinction.

**Required:** keep sight-only bonuses out of nonvisual awareness. If this function represents sight-only passive Perception, return `null`; if it includes nonvisual awareness, use the appropriate nonvisual modifiers. Correct the retained fixture from independent rules evidence, preserving a separate literal test of visible Keen Sight’s +5.

## Closure of the other findings

### F1 — closed

`visibility-field.ts:277–307` applies independent light obscurement after resolving Truesight or Devil’s Sight; only blindsight bypasses it.

I reran both previous probes:

- Truesight through patchy fog: **`seen_dim`, passed**.
- Devil’s Sight with overlapping magical darkness and patchy fog: **`seen_dim`, passed**.

The former incorrect oracle is corrected at `visibility-field.test.ts:254`.

### F2 — null handling and active Search are correct

All production callers found handle null explicitly:

- `processHide`, `encounter.ts:4886–4888`: excludes null from the numeric comparison.
- `processSearch`, `:4922–4928`: emits `not_found`, total 0, and returns before rolling.
- Hearing returns `normal` at `:4810`.

I replaced the Search test’s RNG callback **in memory** with one that throws on any invocation. The test passed: **1 passed, 31 skipped**. Thus the no-roll behavior is verified beyond its result assertion.

The remaining defect is specifically the passive darkness exception above.

### F3 — closed

The exact previous survivor now fails:

```ts
sight.grade === 'seen_dim'
// →
sight.grade === 'seen'
```

`PERCEPTION_GRADES_DRIVE_PASSIVE_BEHAVIOR` reported:

```text
Expected: [12, 7, null, 17]
Actual:   [7, 12, null, 12]
```

**Exit 1; mutation killed.**

### F4 — closed within the tested scope

- `sightToCreature`, `visibility-field.ts:368–396`, evaluates only subject footprint cells.
- Single-cell and multi-cell branches call the same `evaluateCell`.
- Full fields remain separate and lazy.
- Observer contexts, obscurement, virtual blockers, and pair results are keyed by `EncounterState` identity (`:87–94,231–247,373–395`).

My fixture included normal sight, darkvision, blindsight, and a Large creature, with darkness, dim light, fog, and a wall. **All 16 ordered pair comparisons against full-field grades passed**, including self-pairs and Large-subject aggregation.

**Immutability assessment:** production searches found no direct mutation of the relevant state collections. The reducer creates a new root at `encounter.ts:12958`; movement/effect and environment updates replace state/nested objects (`:3785–3795,11791–11823`). State fields are readonly (`:751–785`). They are not runtime deep-frozen: unsupported external mutation could stale these caches, but I found no supported production path doing that.

The cover shortcut is sound: `indexedSources` is already keyed uniquely by cell, so skipping another deduplication when the optical set is empty preserves candidates. Reusing one blocker-key set does not alter physical aggregation.

## My executed results

These are my results, not the supervisor’s:

| Check | Result |
|---|---|
| T-app | Exit 0 |
| T-node | Exit 0 |
| Four B1 suites plus detection-reactions | **76/76 passed** |
| Replay plus detection-reactions | **35/35 passed; 33.005 seconds** |
| Previous fog probes | **2/2 passed** |
| Large-fixture pair/full-field agreement | **16/16 comparisons passed** |
| Throwing-RNG Search probe | Passed |
| New nonvisual Keen Sight probe | **Failed: 17 versus 12** |

The performance timing uses my thread runner; it is not a controlled comparison against the supervisor’s main-branch timings.

### In-memory mutations

| Mutation | Result |
|---|---|
| Perception penalizes `seen` instead of `seen_dim` | Killed |
| Optical aggregation `every` → `some` | Killed by Large observer test |
| New empty-optical shortcut uses `[]` instead of physical candidates | Killed: expected `half`, received `none` |
| Observer-context cache keyed by shared combatant array | Killed by all four transition tests |

**Four valid mutations, four killed, zero survivors.**

## Scope, commands, and hashes

Verified **exactly four files, 274 insertions/55 deletions**, maximum added-line width **106**, zero added lines over 120. `git diff --check` passed; working tree remained clean. Frozen plan hash remains `6e8b3237…ef8fd2f`.

Executed:

```bash
git diff 7b0f4586 8cd82e39
git diff --check 7b0f4586 8cd82e39
git status --short
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit
sha256sum src/combat/visibility-field.ts src/combat/encounter.ts src/combat/cover.ts src/combat/combat-rules.ts
```

Tests used `node --input-type=module` heredocs calling `startVitest`, with explicit file lists, `config:false`, `pool:'threads'`, `cache:false`, and in-memory Vite transforms for probes/mutations. No assertions changed in baseline runs; cache warm-up was omitted.

Production SHA-256 values printed before/after were identical:

```text
visibility-field.ts cb0eb30ebb498f6608e1e48ad269f1f099b68bed6b8c85dcab2fd7c9c066ed04
encounter.ts        87e4068cc05c29cc9c77e6fe2ee856311b460db244943b0ce2a1dd7aa941d735
cover.ts            f1a89e61b505787be7e8742a0af3894030a19d79f4ff276f1e9fd923ca102764
combat-rules.ts     8b6c2494e22d2dd9f4a9791919e1d0c5115322a548fe2315936657225a154401
```

REJECT B1 — Findings: F2 P1 remains: the passive darkness fallback incorrectly applies Keen Sight to nonvisual awareness.
tokens used
628,717
## Finding — F2 remains open, P1

**The new darkness fallback grants Keen Sight to nonvisual awareness.**

At [encounter.ts:4823](src/combat/encounter.ts:4823), an unseen target with reason `darkness` or `out_of_range` receives ordinary passive Perception **plus Keen Sight’s +5**. The comment explicitly describes nonvisual cues.

That conflicts with:

- `docs/srd/full/srd-5.2.1.txt:661–664,11348–11352`: heavy obscurement blinds the observer for that target; sight-dependent checks automatically fail.
- `docs/homebrew/ogl/srd-5.1/srd-5.1-ogl.txt:23010–23011`: Keen Sight benefits checks **relying on sight**.

**My independent probe:** normal sight, Keen Sight, passive Perception 12, unlit target five feet away.

```text
sightToCreature: unseen
Nonvisual passive expectation: 12
Actual: 17
```

The retained darkness test at `tests/unit/vtt/detection-reactions.test.ts:125–140` embeds this incorrect bonus. Its passing result does not establish RAW correctness. This behavior predates the fix, but the new explicit fallback preserves it instead of resolving the sight/nonvisual distinction.

**Required:** keep sight-only bonuses out of nonvisual awareness. If this function represents sight-only passive Perception, return `null`; if it includes nonvisual awareness, use the appropriate nonvisual modifiers. Correct the retained fixture from independent rules evidence, preserving a separate literal test of visible Keen Sight’s +5.

## Closure of the other findings

### F1 — closed

`visibility-field.ts:277–307` applies independent light obscurement after resolving Truesight or Devil’s Sight; only blindsight bypasses it.

I reran both previous probes:

- Truesight through patchy fog: **`seen_dim`, passed**.
- Devil’s Sight with overlapping magical darkness and patchy fog: **`seen_dim`, passed**.

The former incorrect oracle is corrected at `visibility-field.test.ts:254`.

### F2 — null handling and active Search are correct

All production callers found handle null explicitly:

- `processHide`, `encounter.ts:4886–4888`: excludes null from the numeric comparison.
- `processSearch`, `:4922–4928`: emits `not_found`, total 0, and returns before rolling.
- Hearing returns `normal` at `:4810`.

I replaced the Search test’s RNG callback **in memory** with one that throws on any invocation. The test passed: **1 passed, 31 skipped**. Thus the no-roll behavior is verified beyond its result assertion.

The remaining defect is specifically the passive darkness exception above.

### F3 — closed

The exact previous survivor now fails:

```ts
sight.grade === 'seen_dim'
// →
sight.grade === 'seen'
```

`PERCEPTION_GRADES_DRIVE_PASSIVE_BEHAVIOR` reported:

```text
Expected: [12, 7, null, 17]
Actual:   [7, 12, null, 12]
```

**Exit 1; mutation killed.**

### F4 — closed within the tested scope

- `sightToCreature`, `visibility-field.ts:368–396`, evaluates only subject footprint cells.
- Single-cell and multi-cell branches call the same `evaluateCell`.
- Full fields remain separate and lazy.
- Observer contexts, obscurement, virtual blockers, and pair results are keyed by `EncounterState` identity (`:87–94,231–247,373–395`).

My fixture included normal sight, darkvision, blindsight, and a Large creature, with darkness, dim light, fog, and a wall. **All 16 ordered pair comparisons against full-field grades passed**, including self-pairs and Large-subject aggregation.

**Immutability assessment:** production searches found no direct mutation of the relevant state collections. The reducer creates a new root at `encounter.ts:12958`; movement/effect and environment updates replace state/nested objects (`:3785–3795,11791–11823`). State fields are readonly (`:751–785`). They are not runtime deep-frozen: unsupported external mutation could stale these caches, but I found no supported production path doing that.

The cover shortcut is sound: `indexedSources` is already keyed uniquely by cell, so skipping another deduplication when the optical set is empty preserves candidates. Reusing one blocker-key set does not alter physical aggregation.

## My executed results

These are my results, not the supervisor’s:

| Check | Result |
|---|---|
| T-app | Exit 0 |
| T-node | Exit 0 |
| Four B1 suites plus detection-reactions | **76/76 passed** |
| Replay plus detection-reactions | **35/35 passed; 33.005 seconds** |
| Previous fog probes | **2/2 passed** |
| Large-fixture pair/full-field agreement | **16/16 comparisons passed** |
| Throwing-RNG Search probe | Passed |
| New nonvisual Keen Sight probe | **Failed: 17 versus 12** |

The performance timing uses my thread runner; it is not a controlled comparison against the supervisor’s main-branch timings.

### In-memory mutations

| Mutation | Result |
|---|---|
| Perception penalizes `seen` instead of `seen_dim` | Killed |
| Optical aggregation `every` → `some` | Killed by Large observer test |
| New empty-optical shortcut uses `[]` instead of physical candidates | Killed: expected `half`, received `none` |
| Observer-context cache keyed by shared combatant array | Killed by all four transition tests |

**Four valid mutations, four killed, zero survivors.**

## Scope, commands, and hashes

Verified **exactly four files, 274 insertions/55 deletions**, maximum added-line width **106**, zero added lines over 120. `git diff --check` passed; working tree remained clean. Frozen plan hash remains `6e8b3237…ef8fd2f`.

Executed:

```bash
git diff 7b0f4586 8cd82e39
git diff --check 7b0f4586 8cd82e39
git status --short
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit
sha256sum src/combat/visibility-field.ts src/combat/encounter.ts src/combat/cover.ts src/combat/combat-rules.ts
```

Tests used `node --input-type=module` heredocs calling `startVitest`, with explicit file lists, `config:false`, `pool:'threads'`, `cache:false`, and in-memory Vite transforms for probes/mutations. No assertions changed in baseline runs; cache warm-up was omitted.

Production SHA-256 values printed before/after were identical:

```text
visibility-field.ts cb0eb30ebb498f6608e1e48ad269f1f099b68bed6b8c85dcab2fd7c9c066ed04
encounter.ts        87e4068cc05c29cc9c77e6fe2ee856311b460db244943b0ce2a1dd7aa941d735
cover.ts            f1a89e61b505787be7e8742a0af3894030a19d79f4ff276f1e9fd923ca102764
combat-rules.ts     8b6c2494e22d2dd9f4a9791919e1d0c5115322a548fe2315936657225a154401
```

REJECT B1 — Findings: F2 P1 remains: the passive darkness fallback incorrectly applies Keen Sight to nonvisual awareness.
