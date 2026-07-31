#!/usr/bin/env bash
set -euo pipefail
BRANCH="$1"; MSG_FILE="$(readlink -f "$2")"
MAIN=/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static
[ -f "$MSG_FILE" ] || { echo "NO MSG FILE"; exit 1; }
cd "$MAIN"
[ "$(git rev-parse --show-toplevel)" = "$MAIN" ] || { echo "NOT MAIN TREE"; exit 1; }
[ "$(git rev-parse --abbrev-ref HEAD)" = "main" ] || { echo "NOT ON main"; exit 1; }
git rev-parse --verify "$BRANCH" >/dev/null || { echo "NO SUCH BRANCH"; exit 1; }
git diff --quiet && git diff --cached --quiet || { echo "DIRTY MAIN"; exit 1; }
BEFORE=$(git rev-parse HEAD)
git merge --no-ff "$BRANCH" -F "$MSG_FILE"
[ "$(git rev-parse HEAD)" != "$BEFORE" ] || { echo "NO-OP MERGE (Already up to date = you merged nothing)"; exit 1; }
LEFT=$(git log main.."$BRANCH" --oneline | wc -l)
[ "$LEFT" = "0" ] || { echo "CONTAINMENT FAIL: $LEFT commits unmerged"; exit 1; }
echo "MERGED $(git log --oneline -1)"
