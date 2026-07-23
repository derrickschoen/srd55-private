#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
WAVES_JSON="$SCRIPT_DIR/waves.json"
ORACLE_ROOT="/home/vagrant/PhpstormProjects/dndbeyond_2024_multiclass_calculator"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"

if [[ $# -ne 1 ]]; then
    echo "usage: $0 <chunk-id>" >&2
    exit 64
fi

chunk_id="$1"
if ! jq -e --arg id "$chunk_id" '.waves[].chunks[] | select(.id == $id)' "$WAVES_JSON" >/dev/null; then
    echo "unknown chunk id: $chunk_id" >&2
    exit 64
fi

owned_paths="$(jq -r --arg id "$chunk_id" '.waves[].chunks[] | select(.id == $id) | .owned_paths[] | "- " + .' "$WAVES_JSON")"
oracle_files="$(jq -r --arg id "$chunk_id" --arg root "$ORACLE_ROOT" --arg repo "$REPO_ROOT" \
    '.waves[].chunks[] | select(.id == $id) | .oracle_files[] |
     "- " + (if . == "BUILD-PLAN.md" or startswith("progress/")
             then $repo + "/" + . else $root + "/" + . end)' \
    "$WAVES_JSON")"
brief="$(jq -r --arg id "$chunk_id" '.waves[].chunks[] | select(.id == $id) | .brief' "$WAVES_JSON")"

cat <<EOF
Build chunk $chunk_id in THIS worktree on branch chunk/$chunk_id.

Chunk brief:
$brief

Build ONLY these owned files:
$owned_paths

Port faithfully from the PHP oracle (absolute Laravel-repo paths; brace/glob entries mean every matching read-only oracle file; BUILD-PLAN/progress control inputs resolve to THIS repository):
$oracle_files

Every test must be SENSITIVITY-PROVEN (revert the behavior → test must fail at its intended assertion → restore → green); assert PERSISTED state, not just derived views. Do NOT touch the RPC registry / Worker / app-bootstrap / build / Playwright config or any path outside your owned list. Do NOT spawn codex. Self-critique within this session, run \`npm test\`. Leave ALL changes UNCOMMITTED in the working tree and do NOT run any git command (git add/commit/checkout) — the sandbox's .git is read-only and the harness commits your work to branch chunk/$chunk_id on your behalf. Report ≤120 words: files, test counts, sensitivity transition(s).
EOF
