# M-3 fix round 2 lane report (sol), harvested 2026-09-14 09:04

Implemented M-3 fix round 2. Only two authorized files changed.

### Findings resolved

- **IG2-F1:** Every present M-1 phase now receives non-empty, identity-equality, file-selection, canonicality, and completion validation. Retry selection is derived from initially failed files. The empty-retry fixture preserves the passed M-1 verdict while reconciliation fails. See [gate-inventory.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tools/vtt-handoff/gate-inventory.ts:1600) and [handoff-report.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tests/unit/vtt/handoff-report.test.ts:872).

- **IG2-F2:** Missing execution evidence is represented as unavailable accounting without discarding the valid report envelope or verdict. Native Vitest `pending`/`queued` states map to `unfinished`. Receipt production records the M-1 reference and verdict before derived validation. See [gate-inventory.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tools/vtt-handoff/gate-inventory.ts:964), [gate-inventory.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tools/vtt-handoff/gate-inventory.ts:983), [gate-inventory.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tools/vtt-handoff/gate-inventory.ts:1333), and [handoff-report.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tests/unit/vtt/handoff-report.test.ts:1589).

- **IG2-F3:** Exact full-array reasons are restored for isolated failed and not-run cases. Published JSON now proves failed identities, phase failures, and mixed Playwright identity counts; Markdown asserts `2/1/0/1/1`. See [handoff-report.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tests/unit/vtt/handoff-report.test.ts:632), [handoff-report.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tests/unit/vtt/handoff-report.test.ts:653), [handoff-report.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tests/unit/vtt/handoff-report.test.ts:975), and [handoff-report.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tests/unit/vtt/handoff-report.test.ts:1185).

### RED/GREEN

Initial RED command:

```text
npx vitest run tests/unit/vtt/handoff-report.test.ts --config vitest.config.ts \
  -t "rejects a retry phase|preserves failed M-1 diagnostics|publishes the exact reason|publishes mixed Playwright|kills M3-REPORT-FAILED"
exit 1
3 failed, 3 passed, 43 skipped
```

Failures were exactly:

- Empty retry reconciled as `passed-on-retry`.
- Missing sidecar produced `m1Report:null`.
- Pending module produced `m1Report:null`.

After implementation, the same command exited 0: `6 passed, 43 skipped`.

Final focused run:

```text
npx vitest run tests/unit/vtt/handoff-examples.test.ts \
  tests/unit/vtt/handoff-publish.test.ts \
  tests/unit/vtt/handoff-report.test.ts --config vitest.config.ts
exit 0
Test Files 3 passed
Tests 61 passed
```

### Mutation ledger

| Mutant | Applied SHA | Result | Restored SHA |
|---|---|---:|---|
| Retry phase omitted from accounting validation | `49b881d325b11231d86edad1edca5c9d6ac6f5500f1db2910e621ce315deafda` | exit 1, 1 failed | `ffd5cb987050e9036c15c1e2b472ee4239a839fdcc94b72aff3492af310bd45f` |
| Missing sidecar throws before report retention | `9f62f945c09ac214a5c10bec6c8001c47b279e41803cd318e8b0ee939a77237e` | exit 1, 1 failed | `ffd5cb987050e9036c15c1e2b472ee4239a839fdcc94b72aff3492af310bd45f` |
| Pending module drops report diagnostics | `d030e1db6b4e788f82ccf0e65f69dbb086b396fdc130e3d66f51aeed5689c04b` | exit 1, 1 failed | `ffd5cb987050e9036c15c1e2b472ee4239a839fdcc94b72aff3492af310bd45f` |
| Exact reasons weakened to `toContain` | `016a6f9e1692bd1c9b902cf2400a3a128425aeb87ae1c71e3919fbb19fd362d4` | exit 1, 1 failed | `5d96fbb80811e7ff7153e72f8afd0d8609e5da3312d912ce74a78c77261ddc41` |

### Published-versus-built boundary

| Scenario | Baseline `a04a6093` | Current boundary |
|---|---:|---|
| Primary READY artifact | lines 75–130 | Published JSON and Markdown, current line 431 |
| Dirty repository identity | lines 133–150 | Built report, current line 473 |
| Every omitted gate | lines 153–166 | Built report, current line 506 |
| Conflicting duplicates | lines 182–203 | Built report, current line 570 |
| Failed gate | lines 206–218 | Publication result and Markdown, current line 632 |
| Not-run gate | lines 220–223 | Built report, current line 653 |
| Windows unavailable | lines 226–238 | Built report, current line 1292 |
| Absent/invalid evidence | lines 240 onward | Built reports/filesystem, current line 1249 |
| Drift protection | published Markdown bytes | Published bytes, current line 1311 |

### Verification

```text
npx tsc -b --force
exit 0

sg scan
exit 0

for file in tools/gate-vitest.mjs tools/gate-playwright.mjs \
  tools/gate-runner-lib.mjs tools/gate-verdict.mjs; do
  node --check "$file" || exit 1
done
exit 0

git diff --check
exit 0

awk 'length($0) > 120 {...}' [six allowed files]
exit 0, zero lines over 120 columns
```

Validator:

```text
npm run handoff:gate -- validate --resolve --json
exit 0
valid=true
gates=11
unit-gate: files=641, tests=0
node-runtime-launch: files=1, tests=0
worker-dist-playwright: files=1, tests=1
browser-gate: files=52, tests=187
cumulative-targeted-vitest: files=34, tests=0
worker-dev-playwright: files=1, tests=1
runtime-parity-playwright: files=1, tests=1
top-down-smoke-playwright: files=1, tests=1
```

Discovery:

```text
npx vitest list --configLoader runner --filesOnly --json
exit 0
files=641
unique=641
outsideRepository=0
```

```text
env -u PLAYWRIGHT_JSON_OUTPUT_FILE \
  -u PLAYWRIGHT_JSON_OUTPUT_NAME \
  -u PLAYWRIGHT_JSON_OUTPUT_DIR \
  PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 \
  npx playwright test --list --reporter=json
exit 0
files=52
specs=187
errors=0
```

Frozen hashes:

```text
contracts.ts       0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1
paths.ts           f315f41a24cf17cd7cb928e1169b6b81aee358e55ccc214ec7e779ee2fb0f48a
gate-vitest.mjs    25d4096234785a8545eb964af4beb117b369e4205b8def10e56000824f094f0b
gate-playwright    695c67a39db1637a658e552b7d651b2db4bea97fed3ba88a802cb2567ff0f806
gate-runner-lib    9d48d5aa8bd90f8365724a4526bf9821926d71c0a3aac19466e61cf15961111b
gate-verdict       6c966e9c6fc0b964dc547e713d611e9e1134744732385ef68168dfee0f9e3fe9
package-lock.json  26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867
```

Frozen-file `git diff --stat` was empty.

Final status:

```text
 M tests/unit/vtt/handoff-report.test.ts
 M tools/vtt-handoff/gate-inventory.ts
```

No lockfile, policy, contract, runner, report, package, docs, or `.claude` changes.

M3 FIX R2 DONE