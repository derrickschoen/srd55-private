# OFFERS-IMPL-S3-BUILDER gate-wiring fix (D617.20) — gpt-5.6-sol report

Session 01a0a1ea-3942-7623-b93d-c1ab08d0c4b2; log .tmp/runs/fanout/impl-s3-gate-wiring-fix.log.

Implemented the D617.20 gate-wiring amendment.

### Changes

- Added `scripts/check-command-outcomes.mjs`, using only Node built-ins.
  - Resolves repository root from `import.meta.url`.
  - Runs the four required commands sequentially with inherited stdio.
  - Stops on the first error, signal, or non-zero exit status.
  - 38 lines; maximum line length 80.
- `scripts/check-command-outcomes.sh` now delegates with:
  ```sh
  exec node "$(dirname "$0")/check-command-outcomes.mjs" "$@"
  ```
- Changed only `package.json`’s `test:gate`:
  ```text
  node scripts/check-command-outcomes.mjs && node tools/gate-vitest.mjs
  ```
- `typecheck`, `check:command-outcomes`, and `test:gate:browser` remain unchanged.

### M-3 verification

```text
npx vitest run --configLoader runner tests/unit/vtt/handoff-report.test.ts
Test Files  1 passed (1)
Tests       49 passed (49)
```

The six handoff suites identified by the requested glob:

```text
tests/unit/vtt/handoff-bootstrap.test.ts=5/5
tests/unit/vtt/handoff-contract.test.ts=5/5
tests/unit/vtt/handoff-examples.test.ts=6/6
tests/unit/vtt/handoff-package-contract.test.ts=1/1
tests/unit/vtt/handoff-publish.test.ts=6/6
tests/unit/vtt/handoff-report.test.ts=49/49
files=6 total=72 passed=72 failed=0
```

NPM target resolution:

```text
/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/scripts/check-command-outcomes.mjs exists=true
/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tools/gate-vitest.mjs exists=true
```

### Gate execution

```text
bash scripts/check-command-outcomes.sh
shell-status=0
runtime export allowlist: builder plus exactly five transitional factories/wrappers
```

```text
node scripts/check-command-outcomes.mjs
node-status=0
runtime export allowlist: builder plus exactly five transitional factories/wrappers
```

Failure propagation used a temporary `/tmp/s3-gate-failure-bin/sg` returning status 7:

```text
PATH="/tmp/s3-gate-failure-bin:$PATH" node scripts/check-command-outcomes.mjs
intentional sg failure
failure-status=7
```

### Final green

Both commands exited 0 with zero diagnostics:

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
```

Environment controls:

```text
Test Files  3 passed (3)
Tests       15 passed (15)
```

Additional checks:

```text
git diff --check
exit 0

npx vitest list --configLoader runner --filesOnly --json
rows=643
```

Formatting:

```text
scripts/check-command-outcomes.mjs: lines=38 max=80 over120=0
scripts/check-command-outcomes.sh: max=59 over120=0
```

Integrity:

```text
package-lock.json  26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867
contracts.ts       0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1
```

Final status:

```text
 M package.json
 M scripts/check-command-outcomes.sh
?? scripts/check-command-outcomes.mjs
```

S3 GATE WIRING FIX DONE
diff --git a//tmp/s3-gate-failure-bin/sg b//tmp/s3-gate-failure-bin/sg
new file mode 100644
index 0000000000000000000000000000000000000000..4b14fe3f17cfd4d68f692eb880b1bc9c8ad84c7e
--- /dev/null
+++ b//tmp/s3-gate-failure-bin/sg
@@ -0,0 +1,3 @@
+#!/usr/bin/env bash
+echo "intentional sg failure" >&2
+exit 7
diff --git a/package.json b/package.json
index 518caf0afa583680654d76c2a0f7b70609ecde9d..2e496c9c1884a38d6137ff76a044599735ea7869
--- a/package.json
+++ b/package.json
@@ -14,7 +14,7 @@
     "check:command-outcomes": "scripts/check-command-outcomes.sh",
     "typecheck:fast": "tsgo -p tsconfig.app.json --noEmit && tsgo -p tsconfig.node.json --noEmit",
     "test": "vitest run --configLoader runner",
-    "test:gate": "scripts/check-command-outcomes.sh && node tools/gate-vitest.mjs",
+    "test:gate": "node scripts/check-command-outcomes.mjs && node tools/gate-vitest.mjs",
     "test:gate:browser": "node tools/gate-playwright.mjs",
     "test:affected": "node scripts/test-affected.mjs",
     "heldout:guard": "node --experimental-strip-types tools/heldout-leak-check.ts",
diff --git a/scripts/check-command-outcomes.mjs b/scripts/check-command-outcomes.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..78ed4640b24e7eab4af3a8b62eba7ec84ea6ce4b
--- /dev/null
+++ b/scripts/check-command-outcomes.mjs
@@ -0,0 +1,38 @@
+import { spawnSync } from 'node:child_process';
+import { dirname, resolve } from 'node:path';
+import { fileURLToPath } from 'node:url';
+
+const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
+const steps = [
+  ['sg', ['scan', '--config', 'sgconfig.yml', 'src', 'tools', 'tests']],
+  [
+    'sg',
+    [
+      'test',
+      '--config',
+      'sgconfig.yml',
+      '--test-dir',
+      'ast-grep-tests',
+      '--skip-snapshot-tests',
+      '--include-off',
+    ],
+  ],
+  ['node', ['scripts/check-offer-environment-architecture.mjs', '--self-test']],
+  ['node', ['scripts/check-offer-environment-architecture.mjs']],
+];
+
+for (const [command, args] of steps) {
+  const result = spawnSync(command, args, {
+    cwd: repositoryRoot,
+    stdio: 'inherit',
+  });
+  if (result.error !== undefined) {
+    console.error(result.error.message);
+    process.exit(1);
+  }
+  if (result.signal !== null) {
+    console.error(`${command} terminated by ${result.signal}.`);
+    process.exit(1);
+  }
+  if (result.status !== 0) process.exit(result.status ?? 1);
+}
diff --git a/scripts/check-command-outcomes.sh b/scripts/check-command-outcomes.sh
index a17f07b81b5de1fff954a178855ee26d6423f2c8..3e3d348d362288388a7956234cc9054d019157f2
--- a/scripts/check-command-outcomes.sh
+++ b/scripts/check-command-outcomes.sh
@@ -1,7 +1,3 @@
 #!/usr/bin/env bash
 set -euo pipefail
-
-sg scan --config sgconfig.yml src tools tests
-sg test --config sgconfig.yml --test-dir ast-grep-tests --skip-snapshot-tests --include-off
-node scripts/check-offer-environment-architecture.mjs --self-test
-node scripts/check-offer-environment-architecture.mjs
+exec node "$(dirname "$0")/check-command-outcomes.mjs" "$@"
