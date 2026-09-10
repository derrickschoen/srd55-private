# D569 v5 repaired blind-primary runbook v2

Status: replacement candidate; content-address and independently approve before use.

This runbook replaces the affected D569-v5 preflight, failure-attribution,
validation, merge, and STOP policy. It does not authorize scoring or expand the
owner-approved relaunch. D590 authorizes only hard replacement keys `2:1`,
`4:1`, and `8:1`, plus the complete brutal relaunch. D591 governs authorized
concurrency. D602 accepts the remediated crash-patch specification.

## Immutable starting evidence

- Original code identity: `90484d453b7b6d1fe63ed28c0a53570a80e158e6`.
- Hard raw SHA-256: `c259b7e8e9218033e975e0f560a05547aaf808fd0e695f8db9fbc396697f6ead`.
- Superseded analyzer SHA-256: `91542e61276651318a8063f67ccd672efe24866becef658414588ba50548d8b4`.
- Superseded validator SHA-256: `7f177aff05a5c57b96461a6bff756fb1e1b1c4c42df47cdab313ee8a5a59bfa9`.
- Superseded runbook SHA-256: `84326354321aa9163ebdc6e08f05faadc271c3a0c075c5b2d9aab45c25212aab`.
- Hard timeout raw lines: 6, 19, and 20. Their recovered rollout session IDs
  are, in line order, `01a08731-d713-7de0-9ab0-04ef5856e9a6`,
  `01a08755-40ff-7642-a998-f7bb67b3c268`, and
  `01a08758-f5f1-7580-b882-8f73e0a0a6a2`.

Never edit the original hard JSONL or its retained rows. Reconciliation is a
sidecar provenance operation. Never derive a replacement pin or expectation
from the candidate output without the independent invariant and review required
by the experiment registration.

## Required candidate artifacts and approval

Before launch, content-address and independently review these repo-local
replacement sources:

- `tools/d569-v5/analyze-primary-pair.ts`
- `tools/d569-v5/validate-first-arm.ts`
- `tools/d569-v5/merge-repaired-hard.ts`
- `tools/d569-v5/reconciliation.ts`
- `tools/d569-v5/reconciliation.schema.json`
- this runbook

Record their hashes, reviewer identities, review decisions, patched full commit
ID, original full commit ID, and owner decisions D590/D591/D602 in launch
provenance. A new analysis pin requires explicit approval after review. Do not
run scored pair analysis merely because validation succeeds.

## Preflight and resource-integrity STOPs

D591 permits owner-authorized concurrent work. When that authorization is
recorded in launch provenance, process-count or load-average observations alone
do not STOP the arm. They remain recorded diagnostics.

Authorization does not waive resource integrity. Occupied port 4530, any
attempted use of port 4173, duplicate execution of the same scheduled cell,
collision with an output directory or required lock, insufficient disk,
corrupt pins, manifest drift, or workspace identity mismatch remains a STOP.

Verify before every launch:

1. The checkout branch and full commit match launch provenance.
2. The experiment manifest and every fixture match their registered hashes.
3. Port 4173 is untouched. Port 4530 is free for the run’s assigned service.
4. The output directory does not exist and the scheduled-cell ledger contains
   no key that this launch would duplicate.
5. Available disk is sufficient for raw rows, rollouts, launchers, readiness
   spools, images, and forensic artifacts.
6. The new tool and runbook pins match the independently approved values.
7. The owner-authorized concurrency record, or the exclusive-run record, is
   present. Record process count and load average as diagnostics.

Do not use port 4173. Do not run two executions of one scheduled cell. Do not
reuse an output directory, launcher, proposal spool, context spool, readiness
spool, or dispatch ID.

## Dispatch contract

Every Codex engine process dispatch must use mandatory engine startup with
`required=true`, `startup_timeout_sec=60`, and `tool_timeout_sec=60`. Every
primary attempt, retry, correction, adjustment, speculation, and recovery gets
an immutable launcher and a distinct branded dispatch ID. Readiness,
turn-context, intent, and proposal records must carry that dispatch identity.

The model may select only revision-bound offered option IDs and may not emit
coordinates, paths, dice, DCs, damage, or reducer commands. Advice, plays, and
scores are proposer drafts only and are never auto-submitted. D405.3 is
flywheel-only. Luna low is the D406 floor; Luna high is the D474 escalation.
The live wall is 180 seconds under D456. DM semantic export never enters a
player channel.

## Row and delivery policy

New observations use `rowContractVersion:"arena-row-v3"`. They carry scheduled
cell key, dispatch ID, catalog evidence, turn-context delivery, configured base
and semantic caps, outcome-aware blind-ingress audit, and the separately typed
host diagnostic.

Delivery is proved only by a dispatch-correlated model `get_turn_context`
spool record. Host-rendered diagnostic context is not delivery. Configured caps
stay numeric when actual delivery measurements are null.

A diagnosed `infrastructure_failed` cell is written with its scheduled identity
and evidence, excluded by the registered scorer, and does not itself stop the
remaining scheduled arm. Null session, missing delivery, and null measurement
are valid only for the corresponding typed failure.

An `integrity_indeterminate` row is written and flushed with its versioned
forensic artifact, then stops the scheduled arm. It is neither scored nor
excluded as infrastructure. An absent row, duplicate cell, uncorrelated
readiness record, invalid hybrid schema, or other integrity violation also
remains a STOP. D591 does not override any of these integrity STOPs.

Before an integrity STOP is raised, the runner must atomically persist the
dispatch-integrity artifact, append and flush the `arena-row-v3` forensic row,
and retain any staged proposal as unconsumed evidence. It must not authorize,
correct, default, reduce, execute, packetize, or score that proposal.

## Continuation and retry policy

Continuing later scheduled cells after persisting a diagnosed infrastructure
row is not a retry. The launcher must never automatically dispatch that same
cell again. Replacement of a failed observation requires a separate owner
decision; D590 supplies that decision only for hard keys `2:1,4:1,8:1` and for
the full brutal relaunch.

Timeout, cancellation, and service-null observations remain their literal
outcomes. `service_null` is a scored zero `service_failed`, never infrastructure.
Only literal, diagnosed `infrastructure_failed` is excluded. Historical
`auto_resolved`, `awaiting_dm_adjudication`, and `local_error` remain refused.

## Hard repair procedure

1. Preserve the original hard raw file and all original cell artifacts
   byte-for-byte.
2. Validate the reconciliation sidecar. It must cover exactly original raw
   lines 6, 19, and 20 and record each raw line hash, scheduled key, recovered
   session ID, rollout path/hash, and reviewer approval.
3. Launch only hard cells `2:1`, `4:1`, and `8:1` using seed `5117001`, the
   identical hard manifest, the patched full commit, and:

       --cells 2:1,4:1,8:1

   Cell selection filters the existing room/rep loop. It must not renumber
   rooms, reps, fixtures, or seed derivation.
4. Create the mixed hard cohort in original key order. Copy the 24 clean lines
   and the three timeout lines byte-for-byte. Replace only keys `2:1`, `4:1`,
   and `8:1` with patched rows. Do not insert recovered session IDs into raw
   historical rows.
5. Record that 27 retained observations use code identity
   `90484d453b7b6d1fe63ed28c0a53570a80e158e6` and three replacements use the
   patched identity. This is intentionally a split-identity cohort.

The merge command is run only after paths and pins are recorded:

    npx vite-node tools/d569-v5/merge-repaired-hard.ts \
      ORIGINAL-HARD.raw.jsonl PATCHED-THREE.raw.jsonl \
      RECONCILIATION.json MIXED-HARD.raw.jsonl

The output path must not already exist.

## Brutal relaunch procedure

Run the complete 30-cell brutal basis under seed `6203001` with the identical
registered manifest and patched full commit. Do not retain any of the 26
pre-crash brutal rows. A diagnosed infrastructure row may be followed by later
scheduled keys; an integrity-indeterminate observation stops the remaining arm.

## Provenance manifest

The relaunch provenance manifest must contain:

- original and patched full commit IDs;
- original, replacement, mixed-hard, and brutal raw hashes;
- every scheduled cell key and source cohort;
- launcher paths/hashes, rollout paths/hashes, readiness records, and dispatch IDs;
- exact unchanged experiment arguments and manifest hash;
- the three timeout reconciliation entries;
- the three hard replacement mappings;
- the 27-old/3-new hard identity split and the all-patched brutal identity;
- D590, D591, and D602 decisions;
- analyzer, validator, merge tool, reconciliation schema/sidecar, and runbook
  hashes and independent reviews.

## Validation before analysis

Run the replacement validator on the actual mixed 27-historical/3-current hard
grid and the complete 30-current brutal grid. Include a controlled required
engine-startup failure fixture. Validation must prove:

1. exactly 30 unique scheduled identities per grid;
2. historical rows remain byte-identical and decode without synthesized fields;
3. reconciled timeout identity comes only from the approved sidecar;
4. scored rows have unique real or reconciled session identity;
5. diagnosed infrastructure rows have unique scheduled and dispatch identity;
6. configured caps remain numeric when delivery measurement is null;
7. integrity-indeterminate, inconclusive evidence, and partial v3 hybrids fail;
8. cell-key matching occurs before outcome exclusion;
9. literal infrastructure survives row-to-packet conversion and is the only
   excluded outcome;
10. service-null becomes scored zero `service_failed`.

Commands, after approved pins are installed:

    export D569_CLI_VERSION="$(codex --version)"
    export D569_PATCHED_COMMIT="<approved patched full commit>"

    npx vite-node tools/d569-v5/validate-first-arm.ts \
      MIXED-HARD.raw.jsonl hard RECONCILIATION.json

    npx vite-node tools/d569-v5/validate-first-arm.ts BRUTAL.raw.jsonl brutal

After both registered arms, answer keys, normalized judge seats, and their new
analysis pins receive explicit approval, run the registered paired analysis:

    export D569_ROOT="<approved d569-v5 artifact root>"
    export D569_ANALYSIS_OUTPUT="<new, non-existing registered-analysis.json>"
    npx vite-node tools/d569-v5/analyze-primary-pair.ts

The analyzer reads the registered hard and brutal packet/key documents and all
registered judge seats below `D569_ROOT`, verifies complete two-arm key matching
before infrastructure exclusion, and writes scored paired analysis exactly once.
Do not run it before the explicit analysis approval above.

## STOP and handoff

If a relaunch cell emits `integrity_indeterminate`, verify the forensic artifact
and row are durable, stop the remaining scheduled arm, and obtain a new explicit
owner decision. Never automatically classify or retry it.

For every STOP, preserve raw bytes and write the precise reason, scheduled key,
dispatch ID when known, code identity, manifest pin, launcher pin, and artifact
paths. A STOP requires an explicit new launch or analysis decision. Do not
silently continue past an integrity STOP and do not reinterpret it as excluded
infrastructure.
