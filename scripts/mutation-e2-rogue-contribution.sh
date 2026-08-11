#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
target="$project_root/src/rules/class-progression-lookup.ts"
backup="$(mktemp "${TMPDIR:-/tmp}/e2-rogue-seed.XXXXXX")"

cp "$target" "$backup"
restore() {
  cp "$backup" "$target"
  rm -f "$backup"
}
trap restore EXIT

match_count="$(rg -c "^    round: 'ceiling',$" "$target")"
if [[ "$match_count" != "1" ]]; then
  echo "Expected exactly one Rogue ceiling-rounding seed, found $match_count." >&2
  exit 1
fi

perl -0pi -e "s/^    round: 'ceiling',\$/    round: 'floor',/m" "$target"
if npx vitest run tests/unit/rules/rogue-sneak-attack-seed.test.ts --silent; then
  echo 'Mutation survived: the doc-derived Rogue oracle did not fail.' >&2
  exit 1
fi

restore
trap - EXIT
npx vitest run tests/unit/rules/rogue-sneak-attack-seed.test.ts --silent
echo 'Mutation control killed: ceiling-to-floor drift was detected and restored.'
