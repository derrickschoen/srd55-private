## Findings

### F1 — P1: Special senses incorrectly remove independent light obscurement

The frozen plan explicitly preserves `seen_dim` for fog/foliage unless defeated by blindsight (**plan:106**). SRD `docs/srd/full/srd-5.2.1.txt:656–660` imposes the sight-based Perception penalty; Truesight’s exceptions at `:12216–12241` do not include fog.

Two branches violate that contract:

- [visibility-field.ts:244](src/combat/visibility-field.ts:244) exempts Truesight from light obscurement, while `:261` returns before applying that adjustment.
- `visibility-field.ts:263–266` returns unadjusted `seen` for Devil’s Sight defeating magical darkness, even when independent light obscurement overlaps it.

The test at [visibility-field.test.ts:253](tests/unit/combat/visibility-field.test.ts:253) explicitly expects the incorrect Truesight result.

**My independent in-memory probes both failed:**

| Probe | Expected | Actual |
|---|---|---|
| Truesight, patchy fog five feet away | `seen_dim` | `seen` |
| Devil’s Sight, magical darkness overlapping patchy fog | `seen_dim` | `seen` |

Result: **2 failed, exit 1**. Production code was unchanged.

**Required:** apply independent light obscurement consistently after resolving the seeing sense; correct the erroneous oracle using the cited rule and add the overlapping-effects case.

### F2 — P1: Perception integration breaks a retained detection test

At [encounter.ts:4798](src/combat/encounter.ts:4798), only visible `seen_dim` outcomes receive disadvantage. An `unseen` result falls through to normal—or Keen Sight advantage—and feeds passive Perception at `:4808–4811`.

I ran `tests/unit/vtt/detection-reactions.test.ts` against unchanged B1:

- **15 passed, 1 failed; exit 1.**
- Failure: `passive_five_shift`, assertion at [detection-reactions.test.ts:161](tests/unit/vtt/detection-reactions.test.ts:161).
- The dim-plus-heavy-obscurement fixture changes from expected `hidden` to actual `passively_detected`, with the same stealth total **16**.

Replacing **only Perception’s changed calculation** with its pre-B1 implementation, entirely in memory, produced **16/16 passing, exit 0**. This isolates the regression to B1’s change.

**Required:** reconcile unseen outcomes with passive sight/hearing semantics through the shared evaluator. Do not restore a second visibility ladder or repin the expectation from current output.

### F3 — P2: B1’s Perception test does not verify behavior

[visibility-field.test.ts:1106–1116](tests/unit/combat/visibility-field.test.ts:1106) checks source strings, not roll behavior.

My mutation:

```ts
sight.grade === 'seen_dim'
// changed to:
sight.grade === 'seen'
```

**survived all four B1 suites: 57/57, exit 0.** It incorrectly penalizes clear sight and removes the dim-light penalty.

The additional detection suite catches a new Keen Sight failure under this mutation, but that suite already fails on pristine B1 as described above. Add behavioral Perception coverage to B1’s acceptance gate.

## Checks completed

### Scope and formatting — passed

Independently verified:

- HEAD: `7b0f4586`; working tree clean.
- Frozen plan SHA: `6e8b3237f1876561fad5d18c1d2447eba6c914ef666b2a8e5daef2f97ef8fd2f`.
- **Exactly 11 changed files**, matching D626.4.
- `option-outcome.ts:314`: exactly one added disposition, `devils_sight: 'unsupported'`.
- **Zero removed `foggedCells` references.**
- Both changed test files are additions-only; no tests deleted.
- No changes to `visibility.ts`, encounter projections, or semantic payload.
- **1,744 added lines; maximum added-line length 112; zero over 120.**
- `git diff --check 75c2f44a 7b0f4586`: **exit 0**.

### Rules, delegation, and caches — otherwise consistent

Read against the repository SRD and frozen contract:

- Ordinary darkness stays target-only: `visibility-field.ts:191–200`.
- Heavy fog requires blindsight; magical darkness permits blindsight, Truesight, or Devil’s Sight: `:195–200,252–266`.
- Darkvision grades and inclusive ranges: `:128–144,269–288`; tests pin 60/65 and 120/125 feet at `visibility-field.test.ts:434–470`.
- Blinded ordering retains blindsight: `visibility-field.ts:250–255`.
- Physical cover aggregation/selection is independent of optical blocking: `cover.ts:356–360,391–399,489–505`.
- Blocker signatures enter state/equivalence and wrapper caches: `cover.ts:439–454,532–537,563–568`.
- Sense effects use target membership and maximum ranges: `combat-rules.ts:43–58`. The pre-existing bug was **complete omission of sense effects**, not merely an incorrect source filter. Other rules-lens behavior is unchanged.
- Tremorsense, Web Sense, Hidden, and Invisible ordering remains at `encounter.ts:2193–2223`. Relevant additional detection tests passed.
- The agreement test checks **all 12 distinct ordered pairs** of four fixture actors, excluding self-pairs: `visibility-field.test.ts:643–672`.
- Eligibility excludes nonliving, absent, pending, and Unconscious actors at `visibility-field.ts:359–368`; projection integration remains B3 work.
- Field cache keys use state identity plus observer ID: `visibility-field.ts:89–92,297–315`. All four transition tests killed my stale-cache mutation. Those tests construct successor states directly; their “expiry” case demonstrates removal, not an actual duration-expiry reducer transition.

### Inventories — B1 updates present; downstream migrations remain

Confirmed updates in:

- `statblock.ts:31–37,1219–1236`
- `effects.ts:642–645`
- `combat-rules.ts:186`
- `encounter.ts:5869,8362`
- `content-pack-operation-schema.ts:84,110–115,600`
- `option-outcome.ts:314,421`

Runtime enums still omit Devil’s Sight in `content-pack.ts:283–290`, `blind-turn-context.ts:693–699`, and `mcp/schemas.ts:1124`; query-port unions also remain old. These belong to the planned B2/B6 migrations. **Global runtime-schema support is not complete at B1.**

## My mutation results

All transformations were in memory, with occurrence checks and production hashes printed before/after.

| Mutation | Result |
|---|---|
| `RANGE_IGNORED` | Killed: range-edge test |
| `INTERVENING_OBSCUREMENT_IGNORED` | Killed: Fog Cloud screen test |
| `SENSE_EFFECT_REQUIRES_SELF_SOURCE` | Killed: ally-granted Darkvision test |
| Own: optical aggregate `every` → `some` | Killed: Large observer test |
| Own: Darkvision darkness `seen_dim` → `seen` | Killed: two grade/range tests |
| Own: cache keyed by shared combatant array | Killed: all four transition tests |
| Own: Perception penalizes `seen` | **Survived 57/57 B1 tests** |

One initial source-filter transform matched multiple locations and was rejected by the harness before collection. I reran it with a unique contextual match; only that valid run counts as a kill.

## Commands and execution limits

Executed:

```bash
git diff 75c2f44a 7b0f4586
git diff --numstat 75c2f44a 7b0f4586
git diff --check 75c2f44a 7b0f4586
git status --short
sha256sum .tmp-plans/2026-09-15-visibility-field-plan.md
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit
npx vitest run tests/unit/combat/visibility-field.test.ts tests/unit/vtt/senses.test.ts tests/unit/combat/terrain.test.ts tests/unit/combat/creature-cover.test.ts
```

Both TypeScript commands exited **0**. Standard Vitest failed before collection because its config-cache write was denied. A programmatic forks attempt also failed before collection on temporary-file creation.

The successful runs used `node --input-type=module` heredocs calling `startVitest` with:

```js
{
  config: false, run: true, pool: 'threads',
  environment: 'node', isolate: false, maxWorkers: 8,
  clearMocks: true, restoreMocks: true,
  unstubGlobals: true, unstubEnvs: true, cache: false
}
```

Vite overrides disabled config loading/watch and selected the explicit files. Global cache warm-up was omitted; test assertions were unchanged. Mutation runs used one worker and an in-memory `enforce: 'pre'` transform.

**My unchanged B1 result: 4 files, 57/57 passed, exit 0.** No full gate, browser, build, or port 4173 action occurred.

Production SHA-256 values were identical before and after:

```text
visibility-field.ts  7a289247c83105a196c60b77b8934b44616d7d4b01222de3b0cbe13be846b17c
cover.ts             b7db5da3d8d8c7bf03c1d8dc64f28644435daf4578f241f5fcd6c7f077035ffe
combat-rules.ts      8b6c2494e22d2dd9f4a9791919e1d0c5115322a548fe2315936657225a154401
encounter.ts         f8c9f575ba51d089daad1d9af44651820b8b394552826ed5ac49f09adac8100d
```

REJECT B1 — Findings: F1 P1 independent light obscurement bypassed; F2 P1 retained passive-Perception regression; F3 P2 behavioral Perception coverage missing from B1 gates.
tokens used
454,451
## Findings

### F1 — P1: Special senses incorrectly remove independent light obscurement

The frozen plan explicitly preserves `seen_dim` for fog/foliage unless defeated by blindsight (**plan:106**). SRD `docs/srd/full/srd-5.2.1.txt:656–660` imposes the sight-based Perception penalty; Truesight’s exceptions at `:12216–12241` do not include fog.

Two branches violate that contract:

- [visibility-field.ts:244](src/combat/visibility-field.ts:244) exempts Truesight from light obscurement, while `:261` returns before applying that adjustment.
- `visibility-field.ts:263–266` returns unadjusted `seen` for Devil’s Sight defeating magical darkness, even when independent light obscurement overlaps it.

The test at [visibility-field.test.ts:253](tests/unit/combat/visibility-field.test.ts:253) explicitly expects the incorrect Truesight result.

**My independent in-memory probes both failed:**

| Probe | Expected | Actual |
|---|---|---|
| Truesight, patchy fog five feet away | `seen_dim` | `seen` |
| Devil’s Sight, magical darkness overlapping patchy fog | `seen_dim` | `seen` |

Result: **2 failed, exit 1**. Production code was unchanged.

**Required:** apply independent light obscurement consistently after resolving the seeing sense; correct the erroneous oracle using the cited rule and add the overlapping-effects case.

### F2 — P1: Perception integration breaks a retained detection test

At [encounter.ts:4798](src/combat/encounter.ts:4798), only visible `seen_dim` outcomes receive disadvantage. An `unseen` result falls through to normal—or Keen Sight advantage—and feeds passive Perception at `:4808–4811`.

I ran `tests/unit/vtt/detection-reactions.test.ts` against unchanged B1:

- **15 passed, 1 failed; exit 1.**
- Failure: `passive_five_shift`, assertion at [detection-reactions.test.ts:161](tests/unit/vtt/detection-reactions.test.ts:161).
- The dim-plus-heavy-obscurement fixture changes from expected `hidden` to actual `passively_detected`, with the same stealth total **16**.

Replacing **only Perception’s changed calculation** with its pre-B1 implementation, entirely in memory, produced **16/16 passing, exit 0**. This isolates the regression to B1’s change.

**Required:** reconcile unseen outcomes with passive sight/hearing semantics through the shared evaluator. Do not restore a second visibility ladder or repin the expectation from current output.

### F3 — P2: B1’s Perception test does not verify behavior

[visibility-field.test.ts:1106–1116](tests/unit/combat/visibility-field.test.ts:1106) checks source strings, not roll behavior.

My mutation:

```ts
sight.grade === 'seen_dim'
// changed to:
sight.grade === 'seen'
```

**survived all four B1 suites: 57/57, exit 0.** It incorrectly penalizes clear sight and removes the dim-light penalty.

The additional detection suite catches a new Keen Sight failure under this mutation, but that suite already fails on pristine B1 as described above. Add behavioral Perception coverage to B1’s acceptance gate.

## Checks completed

### Scope and formatting — passed

Independently verified:

- HEAD: `7b0f4586`; working tree clean.
- Frozen plan SHA: `6e8b3237f1876561fad5d18c1d2447eba6c914ef666b2a8e5daef2f97ef8fd2f`.
- **Exactly 11 changed files**, matching D626.4.
- `option-outcome.ts:314`: exactly one added disposition, `devils_sight: 'unsupported'`.
- **Zero removed `foggedCells` references.**
- Both changed test files are additions-only; no tests deleted.
- No changes to `visibility.ts`, encounter projections, or semantic payload.
- **1,744 added lines; maximum added-line length 112; zero over 120.**
- `git diff --check 75c2f44a 7b0f4586`: **exit 0**.

### Rules, delegation, and caches — otherwise consistent

Read against the repository SRD and frozen contract:

- Ordinary darkness stays target-only: `visibility-field.ts:191–200`.
- Heavy fog requires blindsight; magical darkness permits blindsight, Truesight, or Devil’s Sight: `:195–200,252–266`.
- Darkvision grades and inclusive ranges: `:128–144,269–288`; tests pin 60/65 and 120/125 feet at `visibility-field.test.ts:434–470`.
- Blinded ordering retains blindsight: `visibility-field.ts:250–255`.
- Physical cover aggregation/selection is independent of optical blocking: `cover.ts:356–360,391–399,489–505`.
- Blocker signatures enter state/equivalence and wrapper caches: `cover.ts:439–454,532–537,563–568`.
- Sense effects use target membership and maximum ranges: `combat-rules.ts:43–58`. The pre-existing bug was **complete omission of sense effects**, not merely an incorrect source filter. Other rules-lens behavior is unchanged.
- Tremorsense, Web Sense, Hidden, and Invisible ordering remains at `encounter.ts:2193–2223`. Relevant additional detection tests passed.
- The agreement test checks **all 12 distinct ordered pairs** of four fixture actors, excluding self-pairs: `visibility-field.test.ts:643–672`.
- Eligibility excludes nonliving, absent, pending, and Unconscious actors at `visibility-field.ts:359–368`; projection integration remains B3 work.
- Field cache keys use state identity plus observer ID: `visibility-field.ts:89–92,297–315`. All four transition tests killed my stale-cache mutation. Those tests construct successor states directly; their “expiry” case demonstrates removal, not an actual duration-expiry reducer transition.

### Inventories — B1 updates present; downstream migrations remain

Confirmed updates in:

- `statblock.ts:31–37,1219–1236`
- `effects.ts:642–645`
- `combat-rules.ts:186`
- `encounter.ts:5869,8362`
- `content-pack-operation-schema.ts:84,110–115,600`
- `option-outcome.ts:314,421`

Runtime enums still omit Devil’s Sight in `content-pack.ts:283–290`, `blind-turn-context.ts:693–699`, and `mcp/schemas.ts:1124`; query-port unions also remain old. These belong to the planned B2/B6 migrations. **Global runtime-schema support is not complete at B1.**

## My mutation results

All transformations were in memory, with occurrence checks and production hashes printed before/after.

| Mutation | Result |
|---|---|
| `RANGE_IGNORED` | Killed: range-edge test |
| `INTERVENING_OBSCUREMENT_IGNORED` | Killed: Fog Cloud screen test |
| `SENSE_EFFECT_REQUIRES_SELF_SOURCE` | Killed: ally-granted Darkvision test |
| Own: optical aggregate `every` → `some` | Killed: Large observer test |
| Own: Darkvision darkness `seen_dim` → `seen` | Killed: two grade/range tests |
| Own: cache keyed by shared combatant array | Killed: all four transition tests |
| Own: Perception penalizes `seen` | **Survived 57/57 B1 tests** |

One initial source-filter transform matched multiple locations and was rejected by the harness before collection. I reran it with a unique contextual match; only that valid run counts as a kill.

## Commands and execution limits

Executed:

```bash
git diff 75c2f44a 7b0f4586
git diff --numstat 75c2f44a 7b0f4586
git diff --check 75c2f44a 7b0f4586
git status --short
sha256sum .tmp-plans/2026-09-15-visibility-field-plan.md
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit
npx vitest run tests/unit/combat/visibility-field.test.ts tests/unit/vtt/senses.test.ts tests/unit/combat/terrain.test.ts tests/unit/combat/creature-cover.test.ts
```

Both TypeScript commands exited **0**. Standard Vitest failed before collection because its config-cache write was denied. A programmatic forks attempt also failed before collection on temporary-file creation.

The successful runs used `node --input-type=module` heredocs calling `startVitest` with:

```js
{
  config: false, run: true, pool: 'threads',
  environment: 'node', isolate: false, maxWorkers: 8,
  clearMocks: true, restoreMocks: true,
  unstubGlobals: true, unstubEnvs: true, cache: false
}
```

Vite overrides disabled config loading/watch and selected the explicit files. Global cache warm-up was omitted; test assertions were unchanged. Mutation runs used one worker and an in-memory `enforce: 'pre'` transform.

**My unchanged B1 result: 4 files, 57/57 passed, exit 0.** No full gate, browser, build, or port 4173 action occurred.

Production SHA-256 values were identical before and after:

```text
visibility-field.ts  7a289247c83105a196c60b77b8934b44616d7d4b01222de3b0cbe13be846b17c
cover.ts             b7db5da3d8d8c7bf03c1d8dc64f28644435daf4578f241f5fcd6c7f077035ffe
combat-rules.ts      8b6c2494e22d2dd9f4a9791919e1d0c5115322a548fe2315936657225a154401
encounter.ts         f8c9f575ba51d089daad1d9af44651820b8b394552826ed5ac49f09adac8100d
```

REJECT B1 — Findings: F1 P1 independent light obscurement bypassed; F2 P1 retained passive-Perception regression; F3 P2 behavioral Perception coverage missing from B1 gates.
