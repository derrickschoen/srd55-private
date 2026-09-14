# M-1 fix round 1 continuation lane report (sol 01a09d59-d5ae-7a03-af11-36517e912213), harvested 2026-09-13 22:34

Implemented and verified all six accepted findings plus both conformance partials. No scope violations or git writes occurred.

## Findings

| Finding | Resolution | RED → GREEN |
|---|---|---|
| I1-F1 | Real Playwright stock paths now resolve from validated `config.rootDir` in [gate-verdict.mjs](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tools/gate-verdict.mjs:122). Fake stock mirrors Playwright at [fake-gate-command.mjs](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/fixtures/fake-gate-command.mjs:96). Contracts: [gate-verdict.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/unit/tools/gate-verdict.test.ts:157). | 18 failed / 52 passed → 70/70 passed |
| I1-F2 | Duplicate terminal IDs, ID/file substitutions, and file-set mismatches fail discovery at [gate-verdict.mjs](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tools/gate-verdict.mjs:376). Playwright appends terminal callbacks at [gate-playwright-evidence-reporter.mjs](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tools/gate-playwright-evidence-reporter.mjs:87). Tests: [gate-verdict.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/unit/tools/gate-verdict.test.ts:262) and [gate-evidence-reporters.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/unit/tools/gate-evidence-reporters.test.ts:546). | 18/52 → 70/70 |
| I1-F3 | Initial argv now replaces only gate-owned reporter/output/config-loader options and preserves scheduling controls at [gate-vitest.mjs](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tools/gate-vitest.mjs:69). Tests: [gate-runners.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/unit/tools/gate-runners.test.ts:259). | 18/52 → 70/70 |
| I1-F4 | Retry parsing retains separate boolean values, drops replaced file filters, and emits `--configLoader runner` once at [gate-vitest.mjs](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tools/gate-vitest.mjs:84). Tests: [gate-runners.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/unit/tools/gate-runners.test.ts:278). | 18/52 → 70/70 |
| I1-F5 | Vitest stock entries aggregate by path with failure dominance at [gate-verdict.mjs](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tools/gate-verdict.mjs:107). Both permutations and exact retry are tested at [gate-verdict.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/unit/tools/gate-verdict.test.ts:316). | 18/52 → 70/70 |
| I1-F6 | Synthetic reporters use installed Vitest/Playwright reporter types at [gate-evidence-reporters.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/unit/tools/gate-evidence-reporters.test.ts:70), and lifecycle cases now cross the classifier boundary via helpers at lines 289 and 320. Fatal retry persistence is asserted from line 417. | 18/52 → 70/70 |
| Missing-stock partial | Fake initial process now exits 0 at [fake-gate-command.mjs](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/fixtures/fake-gate-command.mjs:168); assertion at [gate-runners.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/unit/tools/gate-runners.test.ts:351). | 18/52 → 70/70 |
| Retry/global partial | Test now reduces both phases and requires final failure at [gate-verdict.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/unit/tools/gate-verdict.test.ts:233); reducer at [gate-verdict.mjs](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tools/gate-verdict.mjs:461). | 18/52 → 70/70 |

Residual risk wording retained: “coverage reporting or cleanup after onTestRunEnd, including cleanup with reportOnFailure:false”.

## RED and GREEN

Exact focused command:

```bash
npx vitest run --configLoader runner tests/unit/tools/gate-runners.test.ts tests/unit/tools/gate-evidence-reporters.test.ts tests/unit/tools/gate-verdict.test.ts
```

RED, exit 1:

```text
Test Files  3 failed (3)
Tests       18 failed | 52 passed (70)
Duration    4.65s
```

Final GREEN, exit 0:

```text
Test Files  3 passed (3)
Tests       70 passed (70)
Duration    4.87s
```

Static verification:

```text
npx tsc -b --force
```

Final exit 0. Two intermediate runs exited 2 while tightening synthetic API typing; their two diagnostics each were corrected before final verification.

```text
sg scan
```

Exit 0.

```bash
node --check tools/gate-verdict.mjs &&
node --check tools/gate-vitest-evidence-reporter.mjs &&
node --check tools/gate-playwright-evidence-reporter.mjs &&
node --check tools/gate-runner-lib.mjs &&
node --check tools/gate-vitest.mjs &&
node --check tools/gate-playwright.mjs
```

Exit 0.

`git diff --check`: exit 0. Forbidden-pattern grep: exit 1, zero matches.

## Bounded Playwright proofs

Both used:

```text
PLAYWRIGHT_PORT=4470
PLAYWRIGHT_WORKERS=1
--config=/tmp/dnd-gate-m1-playwright.K3KlAt.mjs
--workers=1
--retries=0
```

### Full fixture

Playwright process exit: 1. Executable stock/evidence/classifier assertion exit: 0.

```json
{
  "commandExit": 1,
  "inventory": {
    "files": ["d544-playwright-evidence.spec.ts"],
    "tests": 3
  },
  "evidenceLifecycle": {
    "onBegin": true,
    "onEnd": true,
    "onExit": true
  },
  "classifier": {
    "reporterOutcome": {
      "status": "failed",
      "reasons": ["execution-unfinished"]
    },
    "discovery": {
      "status": "failed",
      "missingExecutionIds": 1,
      "unexpectedExecutionIds": [],
      "duplicateExecutionIds": [],
      "mismatchedExecutionIds": [],
      "fileSetMismatch": false
    },
    "fileOutcome": {
      "file": "tests/fixtures/gate-evidence/d544-playwright-evidence.spec.ts",
      "status": "failed",
      "reasons": [
        "synthesized-nonexecution",
        "test-timed-out"
      ]
    }
  },
  "verdict": {
    "status": "failed",
    "passedOnRetry": [],
    "failedFiles": [
      "tests/fixtures/gate-evidence/d544-playwright-evidence.spec.ts"
    ]
  }
}
```

There was no `stock-evidence-mismatch`.

### Positive control

Exact Playwright selection:

```bash
PLAYWRIGHT_PORT=4470 PLAYWRIGHT_WORKERS=1 \
PLAYWRIGHT_JSON_OUTPUT_FILE="$M1_PW_POSITIVE_DIR/stock.json" \
DND_GATE_EVIDENCE_PATH="$M1_PW_POSITIVE_DIR/evidence.json" \
DND_GATE_KIND=playwright \
DND_GATE_PHASE=initial \
DND_GATE_PHASE_INVOCATION_ID=m1-real-playwright-positive \
npx playwright test d544-playwright-evidence.spec.ts \
  --config=/tmp/dnd-gate-m1-playwright.K3KlAt.mjs \
  --workers=1 \
  --retries=0 \
  --grep="records serially synthesized nonexecution" \
  --reporter="json,/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tools/gate-playwright-evidence-reporter.mjs"
```

Process and executable assertion exit 0:

```json
{
  "commandExit": 0,
  "inventory": {
    "files": ["d544-playwright-evidence.spec.ts"],
    "tests": 1
  },
  "evidence": {
    "scheduled": 1,
    "reported": 1,
    "status": "passed"
  },
  "classifier": {
    "reporterOutcome": {
      "status": "passed",
      "reasons": []
    },
    "discovery": {
      "status": "complete",
      "scheduledExecutionIds": 1,
      "reportedExecutionIds": 1,
      "missingExecutionIds": [],
      "unexpectedExecutionIds": [],
      "duplicateExecutionIds": [],
      "mismatchedExecutionIds": [],
      "fileSetMismatch": false
    },
    "fileOutcome": {
      "status": "passed",
      "reasons": []
    }
  },
  "verdict": {
    "status": "passed",
    "passedOnRetry": [],
    "failedFiles": [],
    "phaseFailures": []
  }
}
```

## Real Vitest proofs

### Proof 1: sole process exit 2

Gate process exit 1; JSON assertion exit 0:

```json
{
  "version": 2,
  "verdict": {
    "status": "failed",
    "passedOnRetry": [],
    "failedFiles": [],
    "phaseFailures": [
      {
        "phase": "initial",
        "domain": "process",
        "reasons": ["process-exit-2"]
      }
    ]
  },
  "initial": {
    "process": {"status": "failed", "exitCode": 2},
    "reporterOutcome": {"status": "passed", "reasons": []},
    "discovery": {"status": "complete"},
    "stockRead": {"status": "readable", "error": null},
    "evidenceRead": {"status": "readable", "error": null},
    "fileOutcomes": [{"status": "passed"}]
  },
  "retry": null
}
```

### Proof 2: post-report exit 1

Gate process exit 1; JSON assertion exit 0:

```json
{
  "verdict": {
    "status": "failed",
    "passedOnRetry": [],
    "failedFiles": [],
    "phaseFailures": [
      {
        "phase": "initial",
        "domain": "process",
        "reasons": ["process-exit-1"]
      }
    ]
  },
  "initial": {
    "process": {"status": "failed", "exitCode": 1},
    "reporterOutcome": {"status": "passed", "reasons": []},
    "discovery": {"status": "complete"},
    "fileOutcomes": [{"status": "passed"}]
  },
  "retry": null
}
```

### Proof 3: exact serial retry

Gate process and JSON assertion exit 0:

```json
{
  "version": 2,
  "verdict": {
    "status": "passed",
    "passedOnRetry": [
      "tests/fixtures/gate-vitest-passes-on-retry.fixture.ts"
    ],
    "failedFiles": [],
    "phaseFailures": []
  },
  "initial": {
    "process": {
      "status": "ordinary-file-failure",
      "exitCode": 1
    },
    "reporterOutcome": {"status": "passed", "reasons": []},
    "discovery": {"status": "complete"},
    "loadAverageCount": 3
  },
  "retry": {
    "process": {"status": "passed", "exitCode": 0},
    "reporterOutcome": {"status": "passed", "reasons": []},
    "discovery": {"status": "complete"},
    "loadAverageCount": 3,
    "serialControls": [
      "--no-file-parallelism",
      "--maxWorkers=1"
    ]
  }
}
```

## Installed `parseCLI` probes

The combined actual-wrapper probe exited 0.

```json
{
  "name": "initial-file-parallelism",
  "configLoaderCount": 1,
  "parsed": {
    "filter": ["tests/unit/a.test.ts"],
    "fileParallelism": true,
    "configLoader": "runner"
  }
}
```

```json
{
  "name": "initial-serial",
  "configLoaderCount": 1,
  "parsed": {
    "filter": ["tests/unit/a.test.ts"],
    "fileParallelism": false,
    "maxWorkers": 1,
    "configLoader": "runner"
  }
}
```

```json
{
  "name": "retry-isolate-false",
  "configLoaderCount": 1,
  "parsed": {
    "filter": ["tests/unit/a.test.ts"],
    "fileParallelism": false,
    "maxWorkers": 1,
    "isolate": false,
    "configLoader": "runner"
  }
}
```

```json
{
  "name": "retry-coverage-false",
  "configLoaderCount": 1,
  "parsed": {
    "filter": ["tests/unit/a.test.ts"],
    "fileParallelism": false,
    "maxWorkers": 1,
    "coverage": {"enabled": false},
    "configLoader": "runner"
  }
}
```

```json
{
  "name": "retry-config-loader-once",
  "configLoaderCount": 1,
  "parsed": {
    "filter": ["tests/unit/a.test.ts"],
    "fileParallelism": false,
    "maxWorkers": 1,
    "configLoader": "runner"
  }
}
```

## Greps and scope

Both active-repository rename greps returned exit 1 with zero matches:

```bash
rg -n --glob '!node_modules/**' 'loadFlakes|LOAD FLAKES' tools tests scripts package.json
rg -ni --glob '!node_modules/**' 'load.?flake|load-tolerant|load tolerant' tools/gate-*.mjs tests/unit/tools/gate-runners.test.ts
```

Supervisor-owned active shell consumers found read-only:

```text
/home/vagrant/dnd-slim-runs/browser-main-queued.sh:6
/home/vagrant/dnd-slim-runs/gate-wt4.sh:8
```

Final `git status --short`:

```text
 M tests/fixtures/fake-gate-command.mjs
 M tests/unit/tools/gate-evidence-reporters.test.ts
 M tests/unit/tools/gate-runners.test.ts
 M tests/unit/tools/gate-verdict.test.ts
 M tools/gate-playwright-evidence-reporter.mjs
 M tools/gate-verdict.mjs
 M tools/gate-vitest.mjs
```

All are authorized files.

Frozen contract:

```text
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1  src/vtt/intel/contracts.ts
```

M1 FIX R1 DONE