# M-1 fix round 2 lane report (sol 01a09d59-d5ae-7a03-af11-36517e912213), harvested 2026-09-13 23:19

Implemented M-1 fix round 2. All focused tests and bounded/real proofs pass.

## Findings

| Finding | Resolution | Test |
|---|---|---|
| I2-F1 | Camel/kebab option normalization and negated-flag handling added at [gate-vitest.mjs](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tools/gate-vitest.mjs:45). Retry parsing at line 96 now retains kebab-case values and never consumes a value after `--no-*`. | [gate-runners.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/unit/tools/gate-runners.test.ts:321), lines 330 and 342 |
| I2-F2 | Shape-hiding reporter casts replaced with installed-API projections and checked constructors at [gate-evidence-reporters.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/unit/tools/gate-evidence-reporters.test.ts:70), lines 90 and 149. | Cast guard at [line 435](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/unit/tools/gate-evidence-reporters.test.ts:435) |
| I2-F3 | Existing scenarios again receive both initial positional files; parser probes alone receive one file at [gate-runners.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/unit/tools/gate-runners.test.ts:159). Initial and retry filters are asserted exactly at lines 204–209. Playwright has its own complex control at line 367. | Same |
| I2-F4 | Two IDs/two files are swapped while both sets remain unchanged, in both initial and retry phases, at [gate-verdict.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/unit/tools/gate-verdict.test.ts:321). Final rejection is asserted in both phases. | Same |
| Playwright retry invariant | Caller retries/reporters are stripped and `--retries=0`, plus retry `--workers=1`, are asserted at [gate-runners.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tests/unit/tools/gate-runners.test.ts:367). Dependency documented at [gate-verdict.mjs](/home/vagrant/PhpstormProjects/dnd-wt-gate-integrity/tools/gate-verdict.mjs:376). | Same |

Predicate controls:

- Duplicate case: `fileSetMismatch:false`, no association mismatch; independently kills `duplicateExecutionIds`.
- Substitution case: exercises combined association and file-set diagnostics.
- Swap case: preserves both sets and has no duplicate; independently kills `mismatchedExecutionIds`.

## RED and GREEN

Focused command:

```bash
npx vitest run --configLoader runner tests/unit/tools/gate-runners.test.ts tests/unit/tools/gate-evidence-reporters.test.ts tests/unit/tools/gate-verdict.test.ts
```

RED, exit 1:

```text
Test Files  2 failed | 1 passed (3)
Tests       4 failed | 72 passed (76)
Duration    5.29s
```

Failures:

- Kebab-case value was lost.
- Negated flag retained positional `"false"`.
- Dual-spelling table lacked `isValueOption`.
- Shape-hiding cast guard failed.

The I2-F3 harness restoration and I2-F4 swap counterexample were already green when first executed because those changes strengthen test coverage around behavior production already enforced.

GREEN, exit 0:

```text
Test Files  3 passed (3)
Tests       76 passed (76)
Duration    5.23s
```

No tests were deleted. No existing expected value was relaxed. The two prior retry assertions:

```text
contains failedFile
does not contain unrelatedFile
```

were strengthened to:

```text
initial filters == [failedFile, unrelatedFile]
retry filters == [failedFile]
```

## Static verification

```text
npx tsc -b --force
```

- First run: exit 2, one readonly/mutable fixture-projection diagnostic.
- Corrected annotation.
- Final run: exit 0.

```text
sg scan
```

Exit 0.

```bash
node --check tools/gate-runner-lib.mjs &&
node --check tools/gate-verdict.mjs &&
node --check tools/gate-vitest-evidence-reporter.mjs &&
node --check tools/gate-playwright-evidence-reporter.mjs &&
node --check tools/gate-vitest.mjs &&
node --check tools/gate-playwright.mjs
```

Exit 0.

## Six actual-argv parseCLI probes

Combined probe command exited 0. Every invocation emitted `--configLoader runner` exactly once.

```json
{
  "name": "initial-file-parallelism",
  "wrapperExit": 0,
  "phase": "initial",
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
  "wrapperExit": 0,
  "phase": "initial",
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
  "wrapperExit": 0,
  "phase": "retry",
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
  "wrapperExit": 0,
  "phase": "retry",
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
  "name": "retry-test-name-kebab",
  "wrapperExit": 0,
  "phase": "retry",
  "configLoaderCount": 1,
  "parsed": {
    "filter": ["tests/unit/a.test.ts"],
    "fileParallelism": false,
    "maxWorkers": 1,
    "testNamePattern": "abc",
    "configLoader": "runner"
  }
}
```

```json
{
  "name": "retry-no-watch",
  "wrapperExit": 0,
  "phase": "retry",
  "configLoaderCount": 1,
  "parsed": {
    "filter": ["tests/unit/a.test.ts"],
    "fileParallelism": false,
    "maxWorkers": 1,
    "watch": false,
    "configLoader": "runner"
  }
}
```

## Real Vitest proofs

Proof 1 command exited 1 as required; JSON assertion exited 0:

```json
{
  "commandExit": 1,
  "version": 2,
  "verdict": {
    "status": "failed",
    "passedOnRetry": [],
    "failedFiles": [],
    "phaseFailures": [{
      "phase": "initial",
      "domain": "process",
      "reasons": ["process-exit-2"]
    }]
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

Proof 2 command exited 1 as required; JSON assertion exited 0:

```json
{
  "commandExit": 1,
  "verdict": {
    "status": "failed",
    "passedOnRetry": [],
    "failedFiles": [],
    "phaseFailures": [{
      "phase": "initial",
      "domain": "process",
      "reasons": ["process-exit-1"]
    }]
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

Proof 3 command and JSON assertion exited 0:

```json
{
  "commandExit": 0,
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
    "process": {"status": "ordinary-file-failure", "exitCode": 1},
    "reporterOutcome": {"status": "passed", "reasons": []},
    "discovery": {"status": "complete"},
    "loadAverageCount": 3
  },
  "retry": {
    "process": {"status": "passed", "exitCode": 0},
    "reporterOutcome": {"status": "passed", "reasons": []},
    "discovery": {"status": "complete"},
    "loadAverageCount": 3,
    "retainedConfig": true,
    "serial": ["--no-file-parallelism", "--maxWorkers=1"],
    "filters": [
      "tests/fixtures/gate-vitest-passes-on-retry.fixture.ts"
    ]
  }
}
```

## Bounded Playwright proofs

Both used the temporary wrapper, port 4470, one worker, zero retries, and only `d544-playwright-evidence.spec.ts`.

Full fixture process exit 1; executable assertion exit 0:

```json
{
  "control": "full",
  "commandExit": 1,
  "inventory": {
    "files": ["d544-playwright-evidence.spec.ts"],
    "tests": 3
  },
  "classifier": {
    "reporterOutcome": {
      "status": "failed",
      "reasons": ["execution-unfinished"]
    },
    "discovery": {
      "status": "failed",
      "missingExecutionIds": 1,
      "duplicateExecutionIds": [],
      "mismatchedExecutionIds": [],
      "fileSetMismatch": false
    },
    "fileOutcome": {
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

No `stock-evidence-mismatch` occurred.

Positive command included:

```bash
--grep="records serially synthesized nonexecution"
```

Process and executable assertion exit 0:

```json
{
  "control": "positive",
  "commandExit": 0,
  "inventory": {
    "files": ["d544-playwright-evidence.spec.ts"],
    "tests": 1
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

## Cast survivors

In `gate-evidence-reporters.test.ts`, the only actual assertion cast remaining is:

```text
line 160: JSON.parse(...) as T
```

Reason: the reporter output crosses a JSON serialization boundary; its semantic shape is subsequently exercised by the classifier assertions. All reporter constructor imports now undergo runtime constructor checks, and all consumed callback inputs use installed-API-derived projections.

Other `as` matches are the `Reporter as VitestReporter` import alias, prose in test names, and deliberately split strings used by the cast guard; none are assertion casts.

## Rename and scope checks

Both repository rename greps returned exit 1 with zero matches:

```bash
rg -n --glob '!node_modules/**' 'loadFlakes|LOAD FLAKES' tools tests scripts package.json
rg -ni --glob '!node_modules/**' 'load.?flake|load-tolerant|load tolerant' tools/gate-*.mjs tests/unit/tools/gate-runners.test.ts
```

`git diff --check`: exit 0.

Final `git status --short`:

```text
 M tests/unit/tools/gate-evidence-reporters.test.ts
 M tests/unit/tools/gate-runners.test.ts
 M tests/unit/tools/gate-verdict.test.ts
 M tools/gate-verdict.mjs
 M tools/gate-vitest.mjs
```

All are authorized files.

Frozen contract:

```text
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1  src/vtt/intel/contracts.ts
```

M1 FIX R2 DONE