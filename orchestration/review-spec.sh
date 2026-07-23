#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
WAVES_JSON="$SCRIPT_DIR/waves.json"
ORACLE_ROOT="/home/vagrant/PhpstormProjects/dndbeyond_2024_multiclass_calculator"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"

if [[ $# -ne 2 ]]; then
    echo "usage: $0 <wave-index> <base-commit>" >&2
    exit 64
fi

wave_index="$1"
base_commit="$2"
if ! jq -e --argjson wave "$wave_index" '.waves[] | select(.index == $wave)' "$WAVES_JSON" >/dev/null; then
    echo "unknown wave index: $wave_index" >&2
    exit 64
fi

chunk_details="$(jq -r --argjson wave "$wave_index" --arg root "$ORACLE_ROOT" --arg repo "$REPO_ROOT" '
  .waves[] | select(.index == $wave) | .chunks[] |
  "Chunk " + .id + "\nBrief: " + .brief +
  "\nOwned:\n" + (.owned_paths | map("- " + .) | join("\n")) +
  "\nOracle:\n" + (.oracle_files | map(
    "- " + (if . == "BUILD-PLAN.md" or startswith("progress/")
            then $repo + "/" + . else $root + "/" + . end)
  ) | join("\n"))
' "$WAVES_JSON")"

cat <<EOF
Independently review integrated Wave $wave_index in THIS repository. The frozen pre-wave
base is $base_commit; review the merged wave diff $base_commit..HEAD.

$chunk_details

Review for weakened or insensitive assertions, invariants that do not reach persisted
SQLite state, parity gaps against the read-only PHP oracle, and ownership violations.
Actually run a reversible sensitivity mutation on 1–2 new tests and confirm each fails
at its intended assertion, then restore the mutation and return green. You MAY edit only
the owned files listed above to fix findings. You must also append increment-labelled
review/test/sensitivity evidence to BUILD-PROGRESS.md and write exactly PASS, or
FAIL: <reasons>, to orchestration/wave$wave_index.verdict. Do not edit any other path,
do not commit, and do not spawn codex. Run the relevant tests after fixes. Leave no
mutation or generated artifact staged. Report ≤150 words.
EOF
