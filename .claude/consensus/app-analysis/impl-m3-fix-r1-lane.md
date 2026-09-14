# M-3 fix round 1 lane report (sol), harvested 2026-09-14 08:04

Implemented all eight accepted findings for M-3 fix round 1.

### Findings

| Finding | Resolution |
|---|---|
| IG1-F1 | Restored publication, digest, omission, duplicate, non-test failure, Windows, invalid-input, art-path, dirty-repository, and drift assertions in [handoff-report.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tests/unit/vtt/handoff-report.test.ts:399). |
| IG1-F2 | Receipt discovery now validates kind, declared root, canonical uniqueness, nonempty selection, expected counts, and complete M-1 accounting in [gate-inventory.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tools/vtt-handoff/gate-inventory.ts:1533). |
| IG1-F3 | M-1 execution identities, approved skips, phase UUIDs, prerequisites, failed/skipped identities, and verdict diagnostics are retained and rendered in [gate-inventory.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tools/vtt-handoff/gate-inventory.ts:919) and [report.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tools/vtt-handoff/report.ts:284). |
| IG1-F4 | Added shell-substitution, runner-kind, supervisor-selector, missing test requirement, declared-root, and dangling-symlink validation in [gate-inventory.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tools/vtt-handoff/gate-inventory.ts:451). |
| IG1-F5 | Added injectable runner adapter and explicit zero-exit predicate in [gate-inventory.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tools/vtt-handoff/gate-inventory.ts:1215), tested at [handoff-report.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tests/unit/vtt/handoff-report.test.ts:1443). |
| IG1-F6 | Default-policy control now uses an in-memory transformed module and mocked shared Git identity, proving the allowlist alone blocks admission, at [handoff-publish.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tests/unit/vtt/handoff-publish.test.ts:330). |
| IG1-F7 | All three specifications track and recursively remove every temporary root in `afterEach`; the post-run recent-directory count was `0`. |
| IG1-F8 | Prerequisite folding preserves `not-run` for absent/stale dependent evidence in [report.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tools/vtt-handoff/report.ts:218). |

### Removed-title disposition

| Removed title | Restored at |
|---|---|
| publishes complete authoritative contracts and READY strictly last | `kills M3-SPEC-POLICY-OMIT…`: [handoff-publish.test.ts:181](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tests/unit/vtt/handoff-publish.test.ts:181) |
| writes READY evidence atomically… | `publishes reconciled READY evidence…`: [handoff-report.test.ts:426](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tests/unit/vtt/handoff-report.test.ts:426) |
| makes every individually omitted inventory result PARTIAL… | `kills M3-REPORT-MISSING…`: [handoff-report.test.ts:501](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tests/unit/vtt/handoff-report.test.ts:501) |
| rejects conflicting duplicate gate results ordered `%s` | `rejects distinct duplicate receipt references…`: [handoff-report.test.ts:565](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tests/unit/vtt/handoff-report.test.ts:565) |
| reports PARTIAL with failed or not-run required gates… | `publishes PARTIAL for a failed non-test gate…`: [handoff-report.test.ts:627](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tests/unit/vtt/handoff-report.test.ts:627) |
| reports PARTIAL when Windows is UNAVAILABLE… | `reports Windows unavailability…`: [handoff-report.test.ts:1179](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tests/unit/vtt/handoff-report.test.ts:1179) |
| makes absent or invalid supervisor results PARTIAL… | `makes absent or invalid evidence…`: [handoff-report.test.ts:1135](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tests/unit/vtt/handoff-report.test.ts:1135) |
| detects report drift without overwriting bytes | `detects report drift…`: [handoff-report.test.ts:1197](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tests/unit/vtt/handoff-report.test.ts:1197) |
| dirty repository’s complete identity | `records clean and dirty repository evidence…`: [handoff-report.test.ts:468](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tests/unit/vtt/handoff-report.test.ts:468) |

The only retired expectations remain caller-provided gate claims and `preExistingFailures`.

### RED/GREEN

Initial fix-round RED:

```text
Test Files  2 failed | 1 passed (3)
Tests       6 failed | 41 passed (47)
exit 1
```

This exposed wrong-kind empty discovery, hidden mixed skip evidence, prerequisite overwrite, default-policy fixture invalidity, shell substitution acceptance, and dangling-symlink acceptance.

Deliberately wrong published artifact control:

```text
Error: PUBLISHED_DIGEST_COUNT_INVALID
Test Files  1 failed
Tests       1 failed | 43 skipped
exit 1
```

Final focused GREEN:

```text
$ npx vitest run --configLoader runner tests/unit/vtt/handoff-examples.test.ts \
  tests/unit/vtt/handoff-publish.test.ts tests/unit/vtt/handoff-report.test.ts

Test Files  3 passed (3)
Tests       56 passed (56)
Duration    4.16s
exit 0
```

### Mutation ledger

| Mutant | Applied SHA | Result | Restored SHA |
|---|---|---:|---|
| Wrong published artifact | `46fc9744…` | 1 red | `7ff7ef19…` |
| Empty/wrong discovery accepted | `d64287e7…` | 1 red | `9af08388…` |
| Skip-count drop | `f3cad683…` | 1 red | `9af08388…` |
| Prerequisite overwrites `not-run` | `9608ba72…` | 1 red | `3f9b28d8…` |
| Runner null-status accepted | `cfc500b7…` | 1 red | `9af08388…` |
| M-1 evidence extraction removed | `ff92dd52…` | 1 red | `9af08388…` |
| Failed-file diagnostics dropped | `8768464d…` | 1 red | `9af08388…` |
| Runner-kind check removed | `893fe754…` | 1 red | `9af08388…` |
| `$()` argv check removed | `88ab24ce…` | 1 red | `9af08388…` |
| Dangling symlink accepted | `34c9b5d5…` | 1 red | `9af08388…` |
| Fixture policy omitted | `949598fb…` | 1 red, `UNAUTHORIZED_REPOSITORY_ROOT` | `b1f5f012…` |
| Default guard removed in memory | production SHA remained `f315f41a…` | normal rejected; mutant admitted | unchanged |

### Verification

```text
npx tsc -b --force                         exit 0
sg scan                                    exit 0
node --check (four unchanged M-1 runners)  exit 0
git diff --check                           exit 0
added-line ≤120-column scan                0 violations
recent tracked temp roots after suite      0
```

Discovery:

```json
{
  "valid": true,
  "unit-gate": {"files": 641},
  "node-runtime-launch": {"files": 1},
  "cumulative-targeted-vitest": {"files": 34},
  "browser-gate": {"files": 52, "tests": 187},
  "worker-dist-playwright": {"files": 1, "tests": 1},
  "worker-dev-playwright": {"files": 1, "tests": 1},
  "runtime-parity-playwright": {"files": 1, "tests": 1},
  "top-down-smoke-playwright": {"files": 1, "tests": 1}
}
```

Exact before/after comparison:

```text
vitest before=641 after=641 uniqueBefore=641 uniqueAfter=641 equal=true
playwright testsBefore=187 testsAfter=187 filesBefore=52 filesAfter=52 testsEqual=true filesEqual=true
```

Rendered inventory:

```text
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
node tools/gate-vitest.mjs [the pinned 34-file cumulative inventory]
# worker-dev-playwright
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 VTT_HANDOFF_ARTIFACT=dev node tools/gate-playwright.mjs --config=tests/browser/vtt-handoff/playwright.config.ts worker.spec.ts
# runtime-parity-playwright
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 VTT_HANDOFF_ARTIFACT=dev node tools/gate-playwright.mjs --config=tests/browser/vtt-handoff/playwright.config.ts runtime-parity.spec.ts
# top-down-smoke-playwright
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 VTT_HANDOFF_ARTIFACT=dev node tools/gate-playwright.mjs --config=tests/browser/vtt-handoff/playwright.config.ts top-down-smoke.spec.ts
```

Frozen and lockfile hashes:

```text
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1  src/vtt/intel/contracts.ts
f315f41a24cf17cd7cb928e1169b6b81aee358e55ccc214ec7e779ee2fb0f48a  tools/vtt-handoff/paths.ts
26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867  package-lock.json
```

`git diff --stat -- tools/vtt-handoff/paths.ts` was empty. The lockfile matches `HEAD`.

Final status contains only allowed files:

```text
 M tests/unit/vtt/handoff-examples.test.ts
 M tests/unit/vtt/handoff-publish.test.ts
 M tests/unit/vtt/handoff-report.test.ts
 M tools/vtt-handoff/gate-inventory.ts
 M tools/vtt-handoff/report.ts
```

M3 FIX R1 DONE