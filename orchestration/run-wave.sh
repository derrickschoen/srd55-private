#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
WAVES_JSON="$SCRIPT_DIR/waves.json"
STATE_FILE="$SCRIPT_DIR/wave-state"
WORKTREE_ROOT="$REPO_ROOT/.worktrees"
LOG_ROOT="$SCRIPT_DIR/logs"

wave_index="${1:-}"
verdict_file=""
declare -a active_pids=()

stop_active_sessions() {
    local pid
    for pid in "${active_pids[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    for pid in "${active_pids[@]}"; do
        wait "$pid" 2>/dev/null || true
    done
    active_pids=()
}

unexpected_failure() {
    local status=$?
    trap - ERR
    stop_active_sessions
    if [[ -n "$verdict_file" ]] && ! grep -q '^FAIL:' "$verdict_file" 2>/dev/null; then
        printf 'FAIL: harness error at line %s (exit %s)\n' "${BASH_LINENO[0]:-unknown}" "$status" >"$verdict_file"
    fi
    echo "Wave ${wave_index:-?} FAIL: harness error (exit $status)" >&2
    exit "$status"
}
trap unexpected_failure ERR

interrupted() {
    trap - ERR INT TERM
    stop_active_sessions
    if [[ -n "$verdict_file" ]]; then
        printf 'FAIL: harness interrupted; active chunk sessions were stopped\n' >"$verdict_file"
    fi
    echo "Wave ${wave_index:-?} FAIL: interrupted" >&2
    exit 130
}
trap interrupted INT TERM

fail_wave() {
    local reason="$1"
    printf 'FAIL: %s\n' "$reason" >"$verdict_file"
    echo "Wave $wave_index FAIL: $reason" >&2
    exit 1
}

if [[ ! "$wave_index" =~ ^[0-9]+$ ]]; then
    echo "usage: $0 <wave-index>" >&2
    exit 64
fi
if ! command -v jq >/dev/null || ! command -v codex >/dev/null; then
    echo "jq and codex must be available on PATH" >&2
    exit 69
fi
if ! jq -e --argjson wave "$wave_index" '.waves[] | select(.index == $wave)' "$WAVES_JSON" >/dev/null; then
    echo "unknown wave index: $wave_index" >&2
    exit 64
fi

verdict_file="$SCRIPT_DIR/wave$wave_index.verdict"
if [[ -e "$verdict_file" ]]; then
    unlink "$verdict_file"
fi

mode="$(jq -r --argjson wave "$wave_index" '.waves[] | select(.index == $wave) | .mode' "$WAVES_JSON")"
[[ "$mode" == "serial" || "$mode" == "parallel" ]] ||
    fail_wave "wave mode must be serial or parallel"
duplicate_ownership="$(
    jq -r '.waves[].chunks[].owned_paths[]' "$WAVES_JSON" | LC_ALL=C sort | uniq -d
)"
[[ -z "$duplicate_ownership" ]] ||
    fail_wave "waves.json contains duplicate ownership: $(tr '\n' ' ' <<<"$duplicate_ownership")"

cd "$REPO_ROOT"

[[ "$(git branch --show-current)" == "main" ]] || fail_wave "the repository worktree is not on main"
[[ "$(git rev-parse HEAD)" == "$(git rev-parse refs/heads/main)" ]] ||
    fail_wave "HEAD is not the current main tip"
[[ -z "$(git status --porcelain=v1 --untracked-files=all)" ]] ||
    fail_wave "main is not clean"

expected_state=0
if [[ -f "$STATE_FILE" ]]; then
    expected_state="$(<"$STATE_FILE")"
fi
[[ "$expected_state" == "$wave_index" ]] ||
    fail_wave "wave-state is $expected_state, not requested wave $wave_index"
[[ -e "$REPO_ROOT/node_modules" ]] ||
    fail_wave "repository node_modules is missing"

base_commit="$(git rev-parse main)"
mapfile -t chunk_ids < <(
    jq -r --argjson wave "$wave_index" '.waves[] | select(.index == $wave) | .chunks[].id' "$WAVES_JSON"
)
[[ ${#chunk_ids[@]} -gt 0 ]] || fail_wave "wave has no chunks"

mkdir -p "$WORKTREE_ROOT" "$LOG_ROOT"

for chunk_id in "${chunk_ids[@]}"; do
    [[ "$chunk_id" =~ ^[A-Z][0-9]{2}$ ]] ||
        fail_wave "unsafe chunk id in waves.json: $chunk_id"
    branch="chunk/$chunk_id"
    worktree="$WORKTREE_ROOT/$chunk_id"
    [[ ! -e "$worktree" ]] || fail_wave "worktree already exists: $worktree"
    if git show-ref --verify --quiet "refs/heads/$branch"; then
        fail_wave "branch already exists: $branch"
    fi
    git worktree add -b "$branch" "$worktree" main
    ln -s "$REPO_ROOT/node_modules" "$worktree/node_modules"
    "$SCRIPT_DIR/chunk-spec.sh" "$chunk_id" >"$LOG_ROOT/wave$wave_index-$chunk_id.spec"
done

limit=6
[[ "$mode" == "serial" ]] && limit=1
declare -A pid_chunks=()
chunk_failure=0

wait_for_active() {
    local pid
    for pid in "${active_pids[@]}"; do
        if ! wait "$pid"; then
            echo "Chunk ${pid_chunks[$pid]} exited non-zero; see its log." >&2
            chunk_failure=1
        fi
    done
    active_pids=()
}

for chunk_id in "${chunk_ids[@]}"; do
    worktree="$WORKTREE_ROOT/$chunk_id"
    spec="$LOG_ROOT/wave$wave_index-$chunk_id.spec"
    log="$LOG_ROOT/wave$wave_index-$chunk_id.log"
    mkdir -p "/tmp/static-app-$chunk_id/vite" "/tmp/static-app-$chunk_id/tmp"
    STATIC_APP_CACHE_DIR="/tmp/static-app-$chunk_id/vite" \
        TMPDIR="/tmp/static-app-$chunk_id/tmp" \
        codex exec -C "$worktree" --profile sol --full-auto \
        -c sandbox_workspace_write.network_access=true - <"$spec" >"$log" 2>&1 &
    pid=$!
    active_pids+=("$pid")
    pid_chunks["$pid"]="$chunk_id"
    if (( ${#active_pids[@]} >= limit )); then
        wait_for_active
    fi
done
wait_for_active
(( chunk_failure == 0 )) || fail_wave "one or more chunk sessions failed"

# Codex runs under a sandbox with a read-only .git and cannot commit, so the harness
# commits each chunk's working-tree changes to its branch on the session's behalf.
# (node_modules is a symlink and gitignored, so it is never staged.)
for chunk_id in "${chunk_ids[@]}"; do
    worktree="$WORKTREE_ROOT/$chunk_id"
    if [[ -n "$(git -C "$worktree" status --porcelain=v1 --untracked-files=all)" ]]; then
        git -C "$worktree" add -A
        git -C "$worktree" -c commit.gpgSign=false commit --no-verify -m "chunk $chunk_id" >/dev/null
    fi
done

# Validate every branch against the same frozen main before merging any branch.
for chunk_id in "${chunk_ids[@]}"; do
    branch="chunk/$chunk_id"
    worktree="$WORKTREE_ROOT/$chunk_id"
    [[ -z "$(git -C "$worktree" status --porcelain=v1 --untracked-files=all)" ]] ||
        fail_wave "$chunk_id left uncommitted or untracked files"
    if [[ ! -L "$worktree/node_modules" ]] ||
        [[ "$(readlink -f "$worktree/node_modules")" != "$(readlink -f "$REPO_ROOT/node_modules")" ]]; then
        fail_wave "$chunk_id replaced or removed its node_modules symlink"
    fi
    [[ "$(git merge-base "$base_commit" "$branch")" == "$base_commit" ]] ||
        fail_wave "$branch is not based on the frozen main"
    [[ "$(git rev-list --count "$base_commit..$branch")" -gt 0 ]] ||
        fail_wave "$branch contains no chunk commit"

    changed_file="$(mktemp)"
    owned_file="$(mktemp)"
    stray_file="$(mktemp)"
    git diff --name-only --no-renames "$base_commit..$branch" | LC_ALL=C sort -u >"$changed_file"
    jq -r --arg id "$chunk_id" \
        '.waves[].chunks[] | select(.id == $id) | .owned_paths[]' "$WAVES_JSON" |
        LC_ALL=C sort -u >"$owned_file"
    comm -23 "$changed_file" "$owned_file" >"$stray_file"
    if [[ -s "$stray_file" ]]; then
        stray="$(paste -sd ',' "$stray_file" | sed 's/,/, /g')"
        rm -f "$changed_file" "$owned_file" "$stray_file"
        fail_wave "$chunk_id changed paths outside ownership: $stray"
    fi
    rm -f "$changed_file" "$owned_file" "$stray_file"
done

for chunk_id in "${chunk_ids[@]}"; do
    if ! git -c commit.gpgSign=false merge --no-verify --no-ff --no-edit "chunk/$chunk_id"; then
        git merge --abort 2>/dev/null || true
        fail_wave "merge conflict for chunk/$chunk_id (plan bug)"
    fi
done

if ! npm test; then
    fail_wave "integrated npm test failed"
fi

browser_gate=0
if jq -e --argjson wave "$wave_index" '
  .waves[] | select(.index == $wave) |
  any(.chunks[].owned_paths[];
    test("^(src/(worker|ui|backup|catalog)/|src/db/(worker|database-lifecycle)\\.ts$|tests/browser/)"))
' "$WAVES_JSON" >/dev/null; then
    browser_gate=1
fi
if (( browser_gate == 1 )) && ! npm run test:browser; then
    fail_wave "integrated browser tests failed"
fi

review_spec="$LOG_ROOT/wave$wave_index-review.spec"
review_log="$LOG_ROOT/wave$wave_index-review.log"
[[ -f BUILD-PROGRESS.md ]] || fail_wave "integrated wave has no BUILD-PROGRESS.md"
progress_before_file="$(mktemp)"
cp BUILD-PROGRESS.md "$progress_before_file"
progress_size_before="$(wc -c <"$progress_before_file")"
"$SCRIPT_DIR/review-spec.sh" "$wave_index" "$base_commit" >"$review_spec"
if ! codex exec -C "$REPO_ROOT" --profile sol --full-auto \
    -c sandbox_workspace_write.network_access=true - <"$review_spec" >"$review_log" 2>&1; then
    fail_wave "independent review session exited non-zero"
fi
[[ -f "$verdict_file" ]] || fail_wave "independent review did not write a verdict"
[[ -f BUILD-PROGRESS.md ]] || fail_wave "independent review removed BUILD-PROGRESS.md"
progress_size_after="$(wc -c <BUILD-PROGRESS.md)"
if (( progress_size_after <= progress_size_before )) ||
    ! cmp -s -n "$progress_size_before" "$progress_before_file" BUILD-PROGRESS.md; then
    rm -f "$progress_before_file"
    fail_wave "independent review did not append BUILD-PROGRESS.md evidence"
fi
rm -f "$progress_before_file"

# Review fixes are allowed only in this wave's owned paths, plus evidence and verdict.
review_changed="$(mktemp)"
review_allowed="$(mktemp)"
review_stray="$(mktemp)"
{
    git diff --name-only --no-renames HEAD
    git diff --cached --name-only --no-renames HEAD
    git ls-files --others --exclude-standard
} | LC_ALL=C sort -u >"$review_changed"
{
    jq -r --argjson wave "$wave_index" \
        '.waves[] | select(.index == $wave) | .chunks[].owned_paths[]' "$WAVES_JSON"
    printf '%s\n' "BUILD-PROGRESS.md"
} | LC_ALL=C sort -u >"$review_allowed"
comm -23 "$review_changed" "$review_allowed" >"$review_stray"
if [[ -s "$review_stray" ]]; then
    stray="$(paste -sd ',' "$review_stray" | sed 's/,/, /g')"
    rm -f "$review_changed" "$review_allowed" "$review_stray"
    fail_wave "review changed paths outside wave ownership: $stray"
fi
rm -f "$review_changed" "$review_allowed" "$review_stray"

verdict="$(<"$verdict_file")"
[[ "$verdict" != *$'\n'* ]] ||
    fail_wave "review verdict must be a single line"
if [[ "$verdict" != "PASS" ]]; then
    [[ "$verdict" == "FAIL: "* ]] ||
        fail_wave "review verdict must be exactly PASS or FAIL: <reasons>"
    echo "Wave $wave_index rejected by independent review." >&2
    exit 1
fi

# A reviewer may fix owned files, so prove the integrated state again before advancing.
if ! npm test; then
    fail_wave "post-review npm test failed"
fi
if (( browser_gate == 1 )) && ! npm run test:browser; then
    fail_wave "post-review browser tests failed"
fi

for chunk_id in "${chunk_ids[@]}"; do
    worktree="$WORKTREE_ROOT/$chunk_id"
    if [[ -L "$worktree/node_modules" ]]; then
        unlink "$worktree/node_modules"
    fi
    git worktree remove "$worktree"
    git branch -d "chunk/$chunk_id"
done

next_state=$((wave_index + 1))
printf '%s\n' "$next_state" >"$STATE_FILE"
if (( next_state == 10 )) && [[ "$(tail -n 1 BUILD-PROGRESS.md)" != "PORT COMPLETE" ]]; then
    printf '\nPORT COMPLETE\n' >>BUILD-PROGRESS.md
fi

mapfile -t final_changes < <(
    {
        git diff --name-only --no-renames HEAD
        git diff --cached --name-only --no-renames HEAD
        git ls-files --others --exclude-standard
    } | LC_ALL=C sort -u
)
if (( ${#final_changes[@]} > 0 )); then
    git add -- "${final_changes[@]}"
fi
git add -f "$STATE_FILE"
git -c commit.gpgSign=false commit --no-verify -m "Record wave $wave_index review evidence"

echo "Wave $wave_index PASS; wave-state is $next_state."
