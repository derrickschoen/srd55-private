#!/usr/bin/env bash
set -euo pipefail

restore_mutation() {
  apply_patch <<'PATCH'
*** Begin Patch
*** Update File: src/ui/screens/character-list/share-controls.ts
@@
-      renderEmbeddedContent([]);
+      renderEmbeddedContent(result.adoptionPlan.incomingContent);
*** End Patch
PATCH
}

trap restore_mutation EXIT

apply_patch <<'PATCH'
*** Begin Patch
*** Update File: src/ui/screens/character-list/share-controls.ts
@@
-      renderEmbeddedContent(result.adoptionPlan.incomingContent);
+      renderEmbeddedContent([]);
*** End Patch
PATCH

set +e
npx vitest run --configLoader runner \
  tests/unit/ui/character-list.test.ts \
  -t 'names untrusted embedded aggregates before the clean direct commit'
mutant_status=$?
set -e

if [[ $mutant_status -eq 0 ]]; then
  echo 'Mutation survived: the pre-commit embedded-content assertion stayed green.' >&2
  exit 1
fi

echo 'Mutation killed by the named pre-commit embedded-content test.'
restore_mutation
trap - EXIT

npx vitest run --configLoader runner \
  tests/unit/ui/character-list.test.ts \
  -t 'names untrusted embedded aggregates before the clean direct commit'
