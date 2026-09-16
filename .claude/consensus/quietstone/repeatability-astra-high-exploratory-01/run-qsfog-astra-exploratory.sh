#!/bin/bash
set -euo pipefail
cd /home/vagrant/PhpstormProjects/dnd-wt-quietstone
export NODE_ENV=production
export BOARD_SNAPSHOT_PREVIEW_PORT=4592
ROOT=.tmp/runs/quietstone/svg-fog/astra-high-exploratory-01
MAN=.tmp/runs/quietstone/svg-fog/20260914-qsfog-a-fix-r1-01/unchanged128/manifest.json
echo "== astra exploratory start $(date +%H:%M:%S) HEAD $(git rev-parse --short HEAD) status $(git status --short --untracked-files=all | wc -l) manifest $(sha256sum $MAN | cut -c1-16)"
mkdir -p $ROOT/answers
for arm in c1 c2; do
  echo "== $arm start $(TZ=America/New_York date '+%Y-%m-%dT%H:%M:%S%:z')"
  npx vite-node tools/ai-dm-screenshot-probe.ts \
    --models gpt-6-astra:high --states 24 --seed 20260910 --primer general \
    --board-glyphs none --capture-tile-px 128 --board-input png --questions Q9 \
    --generation quietstone-svg-fog-intervention-astra-exploratory \
    --image-override-manifest "$MAN" \
    --images-root "$ROOT/answers/$arm-images" \
    --out "$ROOT/answers/$arm.jsonl"
  echo "== $arm end $(TZ=America/New_York date '+%Y-%m-%dT%H:%M:%S%:z') rows $(wc -l < $ROOT/answers/$arm.jsonl)"
done
echo "== astra exploratory end $(date +%H:%M:%S)"
echo ASTRA EXPLORATORY DONE
