#!/bin/sh
set -eu

target='src/authoring/bundled-homebrew-catalog.ts'
backup="$(mktemp)"
cp "$target" "$backup"
restore() {
  cp "$backup" "$target"
  rm -f "$backup"
}
trap restore EXIT HUP INT TERM

python3 - "$target" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
source = path.read_text()
anchor = "draft_item_uuid: itemUuid('bundled-veteran-v3-veterans-strike')"
start = source.index(anchor)
end = source.index("supersedes_contribution_key: 'deeper-cuts'", start)
window = source[start:end]
mutated = window.replace('divide: 2,', 'divide: 3,', 1)
if mutated == window:
    raise SystemExit("Veteran's Strike divisor mutation target was not found")
path.write_text(source[:start] + mutated + source[end:])
PY

set +e
npx vitest run tests/integration/queries/character-sheet-feature-values.test.ts \
  -t 'derives Veteran v3 Sneak Attack correspondence'
status=$?
set -e

if [ "$status" -eq 0 ]; then
  echo "ERROR: Veteran's Strike divisor mutation survived the correspondence test." >&2
  exit 1
fi

echo "Mutation caught: divisor 2 -> 3 made the Veteran correspondence test fail."
