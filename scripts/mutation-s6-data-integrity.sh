#!/bin/sh
set -eu

target='src/backup/portable-content.ts'
backup="$(mktemp "${TMPDIR:-/tmp}/s6-data-integrity.XXXXXX")"
cp "$target" "$backup"

restore() {
  cp "$backup" "$target"
  rm -f "$backup"
}
trap restore EXIT HUP INT TERM

perl -0pi -e \
  's/\[entry\.archived_at, entry\.content_kind, target\]/[null, entry.content_kind, target]/' \
  "$target"

if ! grep -F '[null, entry.content_kind, target]' "$target" >/dev/null; then
  echo 'ERROR: lifecycle-loss mutation target was not found.' >&2
  exit 1
fi

set +e
npx vitest run tests/integration/backup/portable-content.test.ts \
  -t 'S6-04 preserves archived and live lifecycle state'
mutant_status=$?
set -e

if [ "$mutant_status" -eq 0 ]; then
  echo 'ERROR: archived-state loss survived the S6-04 round-trip pin.' >&2
  exit 1
fi

echo 'Mutation caught: dropping archived_at made the S6-04 round-trip fail.'
restore
trap - EXIT HUP INT TERM

npx vitest run tests/integration/backup/portable-content.test.ts \
  -t 'S6-04 preserves archived and live lifecycle state'
