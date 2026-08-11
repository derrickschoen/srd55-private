#!/usr/bin/env bash
set -euo pipefail

restore_mutation() {
  apply_patch <<'PATCH'
*** Begin Patch
*** Update File: src/ui/screens/homebrew/draft-save-status.ts
@@
-  status.textContent = 'Saving draft…'; // X5_DRAFT_REFUSAL_MUTANT
+  status.textContent = 'Draft not saved.';
*** End Patch
PATCH
}

trap restore_mutation EXIT

apply_patch <<'PATCH'
*** Begin Patch
*** Update File: src/ui/screens/homebrew/draft-save-status.ts
@@
-  status.textContent = 'Draft not saved.';
+  status.textContent = 'Saving draft…'; // X5_DRAFT_REFUSAL_MUTANT
*** End Patch
PATCH

set +e
npx vitest run --configLoader runner \
  tests/unit/ui/species-form.test.ts \
  -t 'ends a validation refusal with human copy and focus on walking speed'
mutant_status=$?
set -e

if [[ $mutant_status -eq 0 ]]; then
  echo 'Mutation survived: the named refused-save status assertion stayed green.' >&2
  exit 1
fi

echo 'Mutation killed by the named refused-save status test.'
restore_mutation
trap - EXIT

npx vitest run --configLoader runner \
  tests/unit/ui/species-form.test.ts \
  -t 'ends a validation refusal with human copy and focus on walking speed'
