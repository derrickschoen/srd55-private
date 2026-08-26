#!/usr/bin/env bash
# Runs the committed deterministic 5% test sample (scripts/perf-sample-5pct.txt)
# with SQL query profiling, and writes a merged profile + wall-time summary to
# reports/perf/<label>/. Usage: scripts/perf-sample-run.sh <label>
set -euo pipefail
cd "$(dirname "$0")/.."
label="${1:?usage: perf-sample-run.sh <label>}"
out="reports/perf/$label"
rm -rf "$out"
mkdir -p "$out"

start=$(date +%s.%N)
SQL_QUERY_LOG="$out/sql" npx vitest run --configLoader runner $(tr '\n' ' ' < scripts/perf-sample-5pct.txt) 2>&1 | tee "$out/vitest.log" | tail -4
end=$(date +%s.%N)

node - "$out" <<'EOF'
const [dir] = process.argv.slice(1);
const fs = require('node:fs');
const merged = new Map();
for (const f of fs.existsSync(`${dir}/sql`) ? fs.readdirSync(`${dir}/sql`) : []) {
  for (const row of JSON.parse(fs.readFileSync(`${dir}/sql/${f}`))) {
    const cur = merged.get(row.sql) ?? { count: 0, totalMs: 0 };
    cur.count += row.count;
    cur.totalMs += row.totalMs;
    merged.set(row.sql, cur);
  }
}
const rows = [...merged.entries()]
  .map(([sql, s]) => ({ sql, count: s.count, totalMs: Number(s.totalMs.toFixed(2)) }))
  .sort((a, b) => b.totalMs - a.totalMs);
fs.writeFileSync(`${dir}/sql-profile.json`, JSON.stringify(rows, null, 1));
const total = rows.reduce((a, r) => a + r.totalMs, 0);
console.log(`distinct queries: ${rows.length}; total SQL ms: ${total.toFixed(0)}`);
for (const r of rows.slice(0, 10)) console.log(`${r.totalMs}ms x${r.count}  ${r.sql.replace(/\s+/g, ' ').slice(0, 110)}`);
EOF

echo "wall_seconds=$(echo "$end $start" | awk '{printf "%.1f", $1-$2}')" | tee "$out/wall.txt"
