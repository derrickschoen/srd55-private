#!/usr/bin/env bash
set -euo pipefail

restore_mutation() {
  apply_patch <<'PATCH'
*** Begin Patch
*** Update File: src/backup/portable-content.ts
@@
-        'active_from_level', 'active_to_level', 'value',
-        'future_contribution_field', /* mutation: accept a future wire key */
+        'active_from_level', 'active_to_level', 'value',
*** End Patch
PATCH
}

trap restore_mutation EXIT

apply_patch <<'PATCH'
*** Begin Patch
*** Update File: src/backup/portable-content.ts
@@
-        'active_from_level', 'active_to_level', 'value',
+        'active_from_level', 'active_to_level', 'value',
+        'future_contribution_field', /* mutation: accept a future wire key */
*** End Patch
PATCH

set +e
npx vitest run --configLoader runner \
  tests/integration/backup/portable-content.test.ts \
  -t 'rejects contribution extra keys'
mutant_status=$?
set -e

if [[ $mutant_status -eq 0 ]]; then
  echo 'Mutation survived: portable contribution extra-key rejection did not fail.' >&2
  exit 1
fi

echo 'Mutation killed by the portable contribution exact-key pin.'
restore_mutation
trap - EXIT

npx vitest run --configLoader runner \
  tests/integration/backup/portable-content.test.ts \
  -t 'rejects contribution extra keys'
