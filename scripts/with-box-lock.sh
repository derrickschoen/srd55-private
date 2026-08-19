#!/usr/bin/env bash
# Serialize heavy runs (full vitest gates, builds, Stryker shards) across all
# worktrees on this box so many codex lanes can analyze and edit in parallel
# while taking turns on the CPU-saturating work.
#
# Modeled on Laravel's Cache::lock()->block($seconds): atomic acquire, blocking
# wait with a timeout, and no stale-lock problem — the kernel releases a flock
# the instant every holder of the lock descriptor exits, so no TTL bookkeeping
# is needed.
#
# Usage:  scripts/with-box-lock.sh <command> [args...]
#   DND_BOX_LOCK_FILE  lock path      (default: ~/.local/state/dnd-box.lock —
#                                      shared across every worktree; kept out
#                                      of ~/.cache so cleaners cannot unlink a
#                                      held lock and break mutual exclusion)
#   DND_BOX_LOCK_WAIT  max wait, sec  (default: 7200)
#
# The lock is taken on an inherited file descriptor and the command replaces
# this script via exec: killing the reported PID kills the heavy command
# itself, and the lock dies with it. On timeout the script prints
# "box lock: timed out" to stderr and exits 75 (EX_TEMPFAIL) — that stderr
# line is what distinguishes "never ran" from a wrapped command that happens
# to exit 75 itself.
set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "usage: $0 <command> [args...]" >&2
  exit 64
fi

LOCK_FILE="${DND_BOX_LOCK_FILE:-$HOME/.local/state/dnd-box.lock}"
WAIT_SECONDS="${DND_BOX_LOCK_WAIT:-7200}"
mkdir -p "$(dirname "$LOCK_FILE")"

exec 9>>"$LOCK_FILE"
if ! flock --wait "$WAIT_SECONDS" 9; then
  echo "box lock: timed out after ${WAIT_SECONDS}s waiting for $LOCK_FILE" >&2
  exit 75
fi
exec "$@"
