#!/usr/bin/env bash
# Serialize CPU-heavy work across all worktrees while allowing short gates to
# pass between chunks of a cooperating long runner.
#
# Modeled on Laravel's Cache::lock()->block($seconds): atomic acquire, blocking
# wait with a timeout, and no stale-lock bookkeeping (the kernel releases a
# flock the instant every holder of the descriptor exits).
#
# Lock ordering and starvation properties:
#
# * A short job (the default) takes <lock>.gate, then <lock>, and holds both
#   through exec. Only one short job can therefore wait in the main-lock queue.
# * A long job takes only <lock>. A cooperating runner releases it between
#   chunks. While a short job runs, an already-waiting long can enter the main
#   queue before the next short gets through the gate, preventing a stream of
#   short arrivals from filling the main queue and starving the long runner.
# * A running command is never preempted. A long command that does not chunk
#   still blocks short jobs for its entire run. Long jobs do not take the gate,
#   so there is no reverse lock order and no two-lock deadlock.
# * Linux flock waiters on this box are FIFO/non-barging in practice, which is
#   what gives an already-queued waiter the next turn. POSIX does not specify
#   flock queue fairness, so this is not a portable strict-fairness guarantee.
#   The gate still limits remaining unfairness to one short contender on the main
#   lock instead of an unbounded convoy of them.
#
# Both acquisitions share one wait budget. Locks are attached to inherited file
# descriptors and the wrapper execs the command, so killing that PID (or a
# normal exit) closes every descriptor and releases every held lock immediately;
# there is no stale-lock or TTL bookkeeping.
#
# Usage:  scripts/with-box-lock.sh <command> [args...]
#   DND_BOX_LOCK_FILE  lock path      (default: ~/.local/state/dnd-box.lock —
#                                      shared across every worktree; kept out
#                                      of ~/.cache so cleaners cannot unlink a
#                                      held lock and break mutual exclusion)
#   DND_BOX_LOCK_WAIT  max wait, sec  (default: 7200)
#   DND_BOX_LOCK_CLASS short or long  (default: short)
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
LOCK_CLASS="${DND_BOX_LOCK_CLASS:-short}"

if [ "$LOCK_CLASS" != "short" ] && [ "$LOCK_CLASS" != "long" ]; then
  echo "with-box-lock: DND_BOX_LOCK_CLASS must be short or long; received $LOCK_CLASS" >&2
  exit 64
fi

mkdir -p "$(dirname "$LOCK_FILE")"
WAIT_STARTED_AT="$EPOCHREALTIME"

remaining_wait() {
  awk -v budget="$WAIT_SECONDS" -v started="$WAIT_STARTED_AT" -v now="$EPOCHREALTIME" \
    'BEGIN { remaining = budget - (now - started); printf "%.6f", (remaining > 0 ? remaining : 0) }'
}

acquire_lock() {
  local descriptor="$1"
  local path="$2"
  local wait_remaining
  local status

  wait_remaining="$(remaining_wait)"
  if flock --wait "$wait_remaining" --conflict-exit-code 75 "$descriptor"; then
    return
  else
    status="$?"
  fi

  if [ "$status" -eq 75 ]; then
    echo "with-box-lock: timed out after ${WAIT_SECONDS}s waiting for $path" >&2
  fi
  return "$status"
}

if [ "$LOCK_CLASS" = "short" ]; then
  GATE_FILE="${LOCK_FILE}.gate"
  exec 8>"$GATE_FILE"
  acquire_lock 8 "$GATE_FILE" || exit "$?"
fi

exec 9>"$LOCK_FILE"
acquire_lock 9 "$LOCK_FILE" || exit "$?"

export DND_BOX_LOCK_HELD="$LOCK_CLASS"
exec "$@"
