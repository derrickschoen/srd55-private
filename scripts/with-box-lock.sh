#!/usr/bin/env bash
# Serialize heavy runs (full vitest gates, builds, Stryker shards) across all
# worktrees on this box so many codex lanes can analyze and edit in parallel
# while taking turns on the CPU-saturating work.
#
# Modeled on Laravel's Cache::lock()->block($seconds): atomic acquire, blocking
# wait with a timeout, and no stale-lock problem — the kernel releases a flock
# the instant the holding process dies, so no TTL bookkeeping is needed.
#
# Usage:  scripts/with-box-lock.sh <command> [args...]
#   DND_BOX_LOCK_FILE  lock path      (default: ~/.cache/dnd-box.lock — shared
#                                      across every worktree of this project)
#   DND_BOX_LOCK_WAIT  max wait, sec  (default: 7200)
#
# Exit codes: the wrapped command's own, or 75 (EX_TEMPFAIL) when the lock
# could not be acquired within the wait — callers must treat 75 as "not run",
# never as a test failure.
set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "usage: $0 <command> [args...]" >&2
  exit 64
fi

LOCK_FILE="${DND_BOX_LOCK_FILE:-$HOME/.cache/dnd-box.lock}"
WAIT_SECONDS="${DND_BOX_LOCK_WAIT:-7200}"
mkdir -p "$(dirname "$LOCK_FILE")"

exec flock --wait "$WAIT_SECONDS" --conflict-exit-code 75 "$LOCK_FILE" "$@"
