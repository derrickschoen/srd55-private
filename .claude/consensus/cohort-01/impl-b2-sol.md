<!-- trimmed 2026-09-18 (D683): full codex log (1716477 bytes) replaced by the lane's final message; session id 01a0b245-5a53-7990-9cf5-5abf61f029d7; the full log is in the mirror history of commit 8889b450 -->

Implemented Batch 2 only.

Changed:

- Added [arena-basis-brutal-v2.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/arena-basis-brutal-v2.test.ts) with 30 exact v2 fixture witnesses and three productivity mutant witnesses.
- Retired only frozen 6203 productivity assertions in [room-generator.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/room-generator.test.ts).
- Retired only frozen 6206 productivity assertions in [arena-basis-brutal-b.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/arena-basis-brutal-b.test.ts).
- Added the requested 6207/6211 D635/D642/D643 rationale comment in [d569-second-family-manifest.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/tools/d569-second-family-manifest.test.ts).
- Generated no fixtures and did not begin Batch 3 or Batch 6.

Verification:

- Frozen plan: SHA-256 `4bff2145b445cbb96771333bfdceb5cfdae8781e494cfa48622619cae0a2ac69`, 403 lines.
- Namespace audits matched exactly, statuses `0/1/0`.
- RED-first command:
  `npx vitest run tests/unit/vtt/arena-basis-brutal-v2.test.ts --maxWorkers=1 --no-file-parallelism --configLoader runner`
  → `30 failed / 4 passed`; all 30 failures were `ENOENT` for the declared missing v2 fixtures.
- Frozen suites:
  - second-family: `50/50` passed.
  - room-generator: `56/56` passed.
  - brutal-b: `47/47` passed.
  - No frozen productivity RED remains.
- Mutants:
  - Force productivity true: nonproductive witness failed `1/1`.
  - Delete movement arm: Dash-only witness failed `1/1`.
  - Treat `blocksSight:true` as open: blocked-target witness failed `1/1`.
- Deferred RED inventory command covered 91 tests: `82 passed / 9 failed`.
- `npx tsc -p tsconfig.app.json --noEmit` → exit 0.
- `npx tsc -p tsconfig.node.json --noEmit` → exit 0.
- `git diff --check` → exit 0.
- Lines over 120 characters → 0.
- V-freeze before and after → exit 0; all 32 SHA-256 values identical.
- Final status contains exactly:
  - `tests/unit/tools/d569-second-family-manifest.test.ts`
  - `tests/unit/vtt/arena-basis-brutal-b.test.ts`
  - `tests/unit/vtt/room-generator.test.ts`
  - `tests/unit/vtt/arena-basis-brutal-v2.test.ts`

Remaining RED titles:

- Active v2 title template: `'<family>' seed <seed> satisfies active state-derived membership at '<path>'`.
  - `brutal-v2`: 6209001–6209010.
  - `brutal-b-v2`: 6210001–6210010.
  - `brutal-2-v2`: 6211001–6211010.
  - Cause for each: declared cohort fixture is missing, as required before Batches 3–5.

- `validates the exact v5 Opus 4.8 arms and notes-only Fable Astra Sol panel amendment`
  - Cause: historical helper produces 40 second-family regeneration mismatches.
- `dry-runs versioned Opus 4.8 cells without accepting historical Opus 5 rows`
  - Cause: `second_family_first_regeneration`.
- `adds exactly 180 separately labeled advice-assisted hint cells, 660 total`
  - Cause: `second_family_first_regeneration`.
- `consumes the frozen second encounter family for all 480 core cells`
  - Cause: `second_family_first_regeneration`.
- `records exact model effort cli and cliVersion for every observed row`
  - Cause: `second_family_first_regeneration`.
- `rejects either decisive integrity field alone while preserving rows with neither field`
  - Cause: `second_family_first_regeneration`.

- `projects fresh options for every requested generated-room monster turn`
  - Cause: D642 now yields `Dodge, End Turn` instead of the stale Longbow expectation; deferred to Batch 9.
- `does not repeat the frozen Room-8 four-actor zero-feet Dash plan`
  - Cause: the frozen Room-8 plan differs under sealed-wall geometry; deferred to Batch 9.
- `forms a bounded volatility-ranked menu from baseline dependencies and canonical movement proofs`
  - Cause: the frozen speculative scene now produces zero candidates; deferred to Batch 9.

COHORT-01 B2 DONE
