#!/usr/bin/env bash
set -euo pipefail

restore_mutation() {
  apply_patch <<'PATCH'
*** Begin Patch
*** Update File: src/ui/screens/character-list/share-controls.ts
@@
-  return `Unknown ${kind} name`; // X3_SHARE_PREVIEW_NAME_MUTANT
+  const name = disclosure.name.trim();
+  return name === '' || name === 'UNKNOWN'
+    ? `Unknown ${kind} name`
+    : disclosure.name;
*** End Patch
PATCH
}

trap restore_mutation EXIT

apply_patch <<'PATCH'
*** Begin Patch
*** Update File: src/ui/screens/character-list/share-controls.ts
@@
-  const name = disclosure.name.trim();
-  return name === '' || name === 'UNKNOWN'
-    ? `Unknown ${kind} name`
-    : disclosure.name;
+  return `Unknown ${kind} name`; // X3_SHARE_PREVIEW_NAME_MUTANT
*** End Patch
PATCH

set +e
npx vitest run --configLoader runner \
  tests/unit/ui/character-list.test.ts \
  -t 'names untrusted embedded aggregates before the clean direct commit'
mutant_status=$?
set -e

if [[ $mutant_status -eq 0 ]]; then
  echo 'Mutation survived: the named share-preview assertion stayed green.' >&2
  exit 1
fi

echo 'Mutation killed by the named share-preview display-name test.'
restore_mutation
trap - EXIT

npx vitest run --configLoader runner \
  tests/unit/ui/character-list.test.ts \
  -t 'names untrusted embedded aggregates before the clean direct commit'
