#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
STATE_FILE="$SCRIPT_DIR/wave-state"
LOCK_DIR="$SCRIPT_DIR/.wave-lock"

if [[ -d "$LOCK_DIR" ]]; then
    echo "BUSY"
    exit 0
fi

if [[ -f "$REPO_ROOT/BUILD-PROGRESS.md" ]] &&
    [[ "$(tail -n 1 "$REPO_ROOT/BUILD-PROGRESS.md")" == "PORT COMPLETE" ]]; then
    echo "DONE"
    exit 0
fi

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
    echo "BUSY"
    exit 0
fi

cleanup_lock() {
    rmdir "$LOCK_DIR" 2>/dev/null || true
}
trap cleanup_lock EXIT INT TERM

state=0
if [[ -f "$STATE_FILE" ]]; then
    state="$(<"$STATE_FILE")"
else
    printf '0\n' >"$STATE_FILE"
fi

"$SCRIPT_DIR/run-wave.sh" "$state"
