#!/bin/sh
set -eu

target='src/rules/multiclass-prerequisite-gate.ts'
backup="$(mktemp "${TMPDIR:-/tmp}/multiclass-house-rule.XXXXXX")"
cp "$target" "$backup"

restore() {
  cp "$backup" "$target"
  rm -f "$backup"
}
trap restore EXIT HUP INT TERM

perl -0pi -e \
  "s/if \(houseRule\.status === 'on'\) \{/if (false) {/" \
  "$target"

if ! rg -F 'if (false) {' "$target" >/dev/null; then
  echo 'ERROR: multiclass house-rule mutation target was not found.' >&2
  exit 1
fi

set +e
npx vitest run --configLoader runner \
  tests/integration/queries/multiclass-primary-ability.test.ts \
  -t 'admits an otherwise blocked update_class entry only through the exact per-character house rule'
mutant_status=$?
set -e

if [ "$mutant_status" -eq 0 ]; then
  echo 'ERROR: toggle-ignored mutation survived the update_class gate test.' >&2
  exit 1
fi

echo 'Mutation caught: ignoring the house rule made the update_class gate test fail.'
restore
trap - EXIT HUP INT TERM

npx vitest run --configLoader runner \
  tests/integration/queries/multiclass-primary-ability.test.ts \
  -t 'admits an otherwise blocked update_class entry only through the exact per-character house rule'
