#!/usr/bin/env bash
set -euo pipefail

restore_mutation() {
  apply_patch <<'PATCH'
*** Begin Patch
*** Update File: src/ui/screens/planner/completeness.ts
@@
-    link.textContent = 'Read catalog import instructions';
+    link.textContent = 'Import a catalog with eligible spells';
*** End Patch
PATCH
}

trap restore_mutation EXIT

apply_patch <<'PATCH'
*** Begin Patch
*** Update File: src/ui/screens/planner/completeness.ts
@@
-    link.textContent = 'Import a catalog with eligible spells';
+    link.textContent = 'Read catalog import instructions';
*** End Patch
PATCH

set +e
npx vitest run --configLoader runner \
  tests/unit/ui/planner.test.ts \
  -t 'renders the catalog-gap action as an enabled control owned by the UI'
mutant_status=$?
set -e

if [[ $mutant_status -eq 0 ]]; then
  echo 'Mutation survived: the reachable catalog-import action assertion stayed green.' >&2
  exit 1
fi

echo 'Mutation killed by the named catalog-gap action test.'
restore_mutation
trap - EXIT

npx vitest run --configLoader runner \
  tests/unit/ui/planner.test.ts \
  -t 'renders the catalog-gap action as an enabled control owned by the UI'
