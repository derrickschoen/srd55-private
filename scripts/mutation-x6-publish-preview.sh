#!/usr/bin/env bash
set -euo pipefail

restore_mutation() {
  apply_patch <<'PATCH'
*** Begin Patch
*** Update File: src/ui/screens/homebrew/publish-preview-renderer.ts
@@
-      target.append(`${agreement.article} ${agreement.verb} prepared`);
+      target.append(`${agreement.article} ${agreement.verb} known`);
*** End Patch
PATCH
}

trap restore_mutation EXIT

apply_patch <<'PATCH'
*** Begin Patch
*** Update File: src/ui/screens/homebrew/publish-preview-renderer.ts
@@
-      target.append(`${agreement.article} ${agreement.verb} known`);
+      target.append(`${agreement.article} ${agreement.verb} prepared`);
*** End Patch
PATCH

set +e
npx vitest run --configLoader runner \
  tests/unit/ui/publish-preview-renderer.test.ts \
  -t 'renders every grant kind through the exhaustive seam and phrases the level-five choice'
mutant_status=$?
set -e

if [[ $mutant_status -eq 0 ]]; then
  echo 'Mutation survived: the named level-five spell-choice assertion stayed green.' >&2
  exit 1
fi

echo 'Mutation killed by the named level-five spell-choice test.'
restore_mutation
trap - EXIT

npx vitest run --configLoader runner \
  tests/unit/ui/publish-preview-renderer.test.ts \
  -t 'renders every grant kind through the exhaustive seam and phrases the level-five choice'
