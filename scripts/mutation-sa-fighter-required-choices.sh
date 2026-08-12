#!/usr/bin/env bash
set -euo pipefail

restore_mutation() {
  apply_patch <<'PATCH'
*** Begin Patch
*** Update File: src/ui/screens/guided-builder/equipment-step.ts
@@
-  const levelOneComplete = deps.state.complete;
+  const levelOneComplete = deps.state.complete && allRequiredChoicesComplete;
*** End Patch
PATCH
}

trap restore_mutation EXIT

apply_patch <<'PATCH'
*** Begin Patch
*** Update File: src/ui/screens/guided-builder/equipment-step.ts
@@
-  const levelOneComplete = deps.state.complete && allRequiredChoicesComplete;
+  const levelOneComplete = deps.state.complete;
*** End Patch
PATCH

rg -F 'const levelOneComplete = deps.state.complete;' \
  src/ui/screens/guided-builder/equipment-step.ts >/dev/null

set +e
npx vitest run --configLoader runner \
  tests/unit/ui/equipment-step.test.ts \
  -t 'keeps Fighter incomplete and exposes grant-backed style and mastery controls'
mutant_status=$?
set -e

if [[ $mutant_status -eq 0 ]]; then
  echo 'Mutation survived: equipment-only completion still passed the Fighter gate test.' >&2
  exit 1
fi

echo 'Mutation killed by the Fighter required-choice completion test.'
restore_mutation
trap - EXIT

npx vitest run --configLoader runner \
  tests/unit/ui/equipment-step.test.ts \
  -t 'keeps Fighter incomplete and exposes grant-backed style and mastery controls'
