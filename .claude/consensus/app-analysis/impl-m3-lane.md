# M-3 implementation lane report (sol 01a09f01-be0e-7422-a1e1-81d7ff209ed9), harvested 2026-09-14 06:49

Implemented GATE-INVENTORY-01 within the six authorized files.

Key outcomes:

- Added an executable, typed 11-gate inventory with structured argv, environment, discovery, prerequisites, tiers, rendering, validation, execution receipts, and M-1 v2 reconciliation.
- Added strict outer-process and revision accounting, including D623.4 precedence.
- Made Playwright discovery environment read-only and immune to JSON redirection.
- Repaired all three handoff specs using isolated temp-repository policies while preserving production policy bytes.
- Readiness is `PARTIAL` for missing, stale, mismatched, failed, or prerequisite-blocked evidence.

## RED → GREEN

Identity-policy baseline:

```text
npx vitest run --configLoader runner \
  tests/unit/vtt/handoff-examples.test.ts \
  tests/unit/vtt/handoff-publish.test.ts \
  tests/unit/vtt/handoff-report.test.ts

exit=1
Test Files  3 failed (3)
Tests       14 failed | 6 passed (20)
throw       UNAUTHORIZED_REPOSITORY_ROOT
```

After the specs-only temp-root repair:

```text
exit=0
Test Files  3 passed (3)
Tests       21 passed (21)
```

Inventory/report RED stages:

```text
Missing gate-inventory module:
exit=1
Test Files 1 failed
Tests      0 executed

Initial reconciliation implementation:
exit=1
Test Files 1 failed
Tests      7 failed | 4 passed (11)
```

Final focused command:

```text
npx vitest run --configLoader runner \
  tests/unit/vtt/handoff-examples.test.ts \
  tests/unit/vtt/handoff-publish.test.ts \
  tests/unit/vtt/handoff-report.test.ts

exit=0
Test Files  3 passed (3)
Tests       39 passed (39)
Duration    4.10s
```

## Static verification

All exited 0:

```text
npx tsc -b --force
sg scan
git diff --check
node --check tools/gate-vitest.mjs
node --check tools/gate-playwright.mjs
node --check tools/gate-runner-lib.mjs
node --check tools/gate-verdict.mjs
```

The ≤120-column scan and forbidden-pattern scan also returned no findings.

## Validator and discovery

```text
npm run handoff:gate -- validate --resolve --json
exit=0
valid=true
gates=11

full-typecheck                none        0 files
structural-scan               none        0 files
unit-gate                     vitest    641 files
production-build              none        0 files
node-runtime-launch           vitest      1 file
worker-dist-playwright        playwright  1 file / 1 test
browser-gate                  playwright 52 files / 187 tests
cumulative-targeted-vitest    vitest     34 files
worker-dev-playwright         playwright  1 file / 1 test
runtime-parity-playwright     playwright  1 file / 1 test
top-down-smoke-playwright     playwright  1 file / 1 test
```

Ambient `PLAYWRIGHT_JSON_OUTPUT_FILE` and `PLAYWRIGHT_JSON_OUTPUT_NAME` were supplied during validation; neither requested file was created.

Discovery comparison:

```text
Vitest:     before=641 after=641, exact sorted path equality
Playwright: before=187 after=187, exact canonical identity equality
PW files:   before=52 after=52
Errors:     0
/tmp fixture paths: Vitest=0 Playwright=0
```

Capture hashes:

```text
2b81a6dd10b244b671809581094431f1473421c8deebcc7bd8005bd0e6551133  vitest-before
138d0c266e5a1dae44298c4e8bda014ead72a7695f1236410fc28e5d84e3bb26  vitest-after
6a886c331827e050b27186ee90d741999f4f558a89e9402f88111b1da84b4536  playwright-before
c885c88447957e4e210110c73eb43b041b3ca6c23c3227458f658256306903f6  playwright-after
e595cc826ce2cf12d72370dbb257d198515199653afc7c0153d8d296406925f1  validation
```

## Rendered inventory

```text
# The commands below are leaf invocations and do not write outer receipts.
# Receipt-producing example: npm run handoff:gate -- run full-typecheck --report-dir /tmp/vtt-handoff-gate-receipts

# full-typecheck
npx tsc -b --force

# structural-scan
sg scan

# unit-gate
npm run test:gate

# production-build
npm run build

# node-runtime-launch
node tools/gate-vitest.mjs --config tests/integration-supervisor/vitest.config.ts tests/integration-supervisor/vtt/node-runtime-launch.launch-test.ts

# worker-dist-playwright
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 VTT_HANDOFF_ARTIFACT=dist node tools/gate-playwright.mjs --config=tests/browser/vtt-handoff/playwright.config.ts worker.spec.ts

# browser-gate
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 npm run test:gate:browser

# cumulative-targeted-vitest
node tools/gate-vitest.mjs tests/unit/tools/d583-contract-inventory.test.ts tests/unit/vtt/art-request.test.ts tests/unit/vtt/art-stage.test.ts tests/unit/vtt/art-validator.test.ts tests/unit/vtt/controller-assignment.test.ts tests/unit/vtt/detection-ui.test.ts tests/unit/vtt/door-intent.test.ts tests/unit/vtt/encounter-board-projection.test.ts tests/unit/vtt/encounter-projections.test.ts tests/unit/vtt/encounter-selectors.test.ts tests/unit/vtt/encounter-session-service.test.ts tests/unit/vtt/engine-boundary.test.ts tests/unit/vtt/handoff-bootstrap.test.ts tests/unit/vtt/handoff-contract.test.ts tests/unit/vtt/handoff-examples.test.ts tests/unit/vtt/handoff-package-contract.test.ts tests/unit/vtt/handoff-publish.test.ts tests/unit/vtt/in-process-transport.test.ts tests/unit/vtt/local-session-store.test.ts tests/unit/vtt/node-runtime.test.ts tests/unit/vtt/node-websocket-transport.test.ts tests/unit/vtt/png-validator.test.ts tests/unit/vtt/preview-hidden-rolls.test.ts tests/unit/vtt/protocol-runtime.test.ts tests/unit/vtt/runtime-parity.test.ts tests/unit/vtt/scene-snapshot.test.ts tests/unit/vtt/semantic-board-payload.test.ts tests/unit/vtt/serve-existing-dist.test.ts tests/unit/vtt/session-lifecycle.test.ts tests/unit/vtt/session-persistence.test.ts tests/unit/vtt/two-room-fixture.test.ts tests/unit/vtt/uuidv7.test.ts tests/unit/vtt/windows-probe.test.ts tests/unit/vtt/worker-boundary.test.ts

# worker-dev-playwright
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 VTT_HANDOFF_ARTIFACT=dev node tools/gate-playwright.mjs --config=tests/browser/vtt-handoff/playwright.config.ts worker.spec.ts

# runtime-parity-playwright
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 VTT_HANDOFF_ARTIFACT=dev node tools/gate-playwright.mjs --config=tests/browser/vtt-handoff/playwright.config.ts runtime-parity.spec.ts

# top-down-smoke-playwright
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 VTT_HANDOFF_ARTIFACT=dev node tools/gate-playwright.mjs --config=tests/browser/vtt-handoff/playwright.config.ts top-down-smoke.spec.ts
```

## Mutant results

All §7 mutants were exercised through isolated in-memory candidates or one-at-a-time source mutations:

- Inventory validation rejected `M3-INV-PLACEHOLDER`, `ENV-DROP`, `ENV-ILLEGAL`, `CONFIG-MISSING`, both `ARGV-MISSING` variants, `RUNNER-SUBSTITUTE`, `GATE-DROP`, `CUMULATIVE-DROP`, `BROWSER-DROP`, `TIER-CHANGE`, and `PREREQ-DROP`.
- Source mutations produced focused red tests for `HAND-COMMAND`, `DISCOVERY-REDIRECT`, runner authentication, cumulative membership, browser mapping, revision precedence, stale evidence, retry scope, Playwright identity, hidden retry, hidden skips, ignored M-1 failures, UUID mismatch, missing/affected substitution, supervisor folding, and all outer failure forms.
- `M3-SPEC-POLICY-OMIT` and `POLICY-BROAD` each produced one focused failure.
- `M3-DEFAULT-GUARD-REMOVE` used the required in-memory transformed module and produced:

```text
exit=1
Test Files 1 failed
Tests      1 failed | 5 skipped
Expected   UNAUTHORIZED_REPOSITORY_ROOT
Received   REPOSITORY_GIT_IDENTITY_INVALID
```

- `M3-REPORT-CLAIM` and `M3-REPORT-STDOUT` rejected legacy claim-only evidence; the temporary acceptance mutant made the focused assertion red.
- `M3-REPORT-OUTER-FAIL` produced 3 failures when structured exit/signal/spawn reasons were removed.
- D623.4’s revision-order mutant produced one failure: expected `failed` with preserved passed M-1 verdict, received stale `not-run`.

After every temporary mutation, these restored hashes were confirmed:

```text
419c46756d9f04c20dc4e6a95c4868fa44c9b76c0216b89ba34d60a91c000b87  gate-inventory.ts
b0858d7ca37d2c627427bca6d927cc22c2fdc20d5b80eaa16b74c3eb952bfa7b  report.ts
f0dcf3f090bcd0707f9830da87e4a66c5d0af6a9d306f584789ff0a7d8a2944e  handoff-publish.test.ts
c3e7ec5c12b639661b099d1581ec4ae89dace676983b29b917664ab9e673039a  handoff-report.test.ts
```

## Frozen files

```text
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1  src/vtt/intel/contracts.ts
f315f41a24cf17cd7cb928e1169b6b81aee358e55ccc214ec7e779ee2fb0f48a  tools/vtt-handoff/paths.ts
```

`git show HEAD:tools/vtt-handoff/paths.ts | sha256sum` returned the same policy hash, and:

```text
git diff --stat -- tools/vtt-handoff/paths.ts
(empty)
```

Final status contains exactly the six authorized files:

```text
 M package.json
 M tests/unit/vtt/handoff-examples.test.ts
 M tests/unit/vtt/handoff-publish.test.ts
 M tests/unit/vtt/handoff-report.test.ts
 M tools/vtt-handoff/report.ts
?? tools/vtt-handoff/gate-inventory.ts
```

IMPL M3 DONE