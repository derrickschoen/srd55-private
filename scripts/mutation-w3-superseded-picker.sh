#!/usr/bin/env bash
set -euo pipefail

restore_mutation() {
  apply_patch <<'PATCH'
*** Begin Patch
*** Update File: src/builder/guided-creation.ts
@@
-         AND 1 = 1 /* mutation: admit superseded species */
+         AND ${selectableCatalogContentSql('species', 'template.content_key')}
*** End Patch
PATCH
}

trap restore_mutation EXIT

apply_patch <<'PATCH'
*** Begin Patch
*** Update File: src/builder/guided-creation.ts
@@
-         AND ${selectableCatalogContentSql('species', 'template.content_key')}
+         AND 1 = 1 /* mutation: admit superseded species */
*** End Patch
PATCH

set +e
npx vitest run --configLoader runner \
  tests/unit/queries/selectable-catalog-content.test.ts \
  -t 'hides the superseded revision while historical resolution keeps both versions'
mutant_status=$?
set -e

if [[ $mutant_status -eq 0 ]]; then
  echo 'Mutation survived: the superseded-species assertion did not fail.' >&2
  exit 1
fi

echo 'Mutation killed by the named superseded-species test.'
restore_mutation
trap - EXIT

npx vitest run --configLoader runner \
  tests/unit/queries/selectable-catalog-content.test.ts \
  -t 'hides the superseded revision while historical resolution keeps both versions'
