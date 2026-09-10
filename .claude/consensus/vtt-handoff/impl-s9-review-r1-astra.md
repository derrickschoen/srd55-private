F69 — **SIGNIFICANT — fixable in one round? yes. Asset IDs disagree with the published handoff.**

Requests use `tile`, `wall`, `door`, etc.; the validator explicitly rejects other IDs. Published snapshots use `tile.stone.floor`, `wall.stone`, `door.wood`, `prop.*` and `token.*`. The request test compares IDs against the implementation’s own definitions, so it certifies this mismatch. Evidence: [art-request.ts:23](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tools/vtt-handoff/art-request.ts:23), [art-validator.ts:74](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tools/vtt-handoff/art-validator.ts:74), [asset-id-map.ts:9](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/src/vtt/handoff/asset-id-map.ts:9), [art-request.test.ts:33](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tests/unit/vtt/art-request.test.ts:33).

**Required change:** Use all nine agreed logical IDs, including their transparency policies. Independently pin that exact set and validate generated requests against the published JSON Schema.

F70 — **SIGNIFICANT — fixable in one round? yes. Result paths are resolved against the inbox, not the UUID bundle.**

For `art/inbox/<uuid>.result.json`, the validator resolves image/source paths against `art/inbox`. The agreement places files under `art/inbox/<uuid>/` and makes paths relative to that bundle. Current tests instead establish a generic `bundle/` directory and include that prefix in every path. The validator also permits result manifests outside the prescribed inbox location. Evidence: [art-validator.ts:105](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tools/vtt-handoff/art-validator.ts:105), [art-validator.ts:117](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tools/vtt-handoff/art-validator.ts:117), [art-validator.test.ts:30](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tests/unit/vtt/art-validator.test.ts:30).

**Required change:** Enforce the agreed manifest location and anchor provenance paths beneath its matching UUID directory. Test a literal owner-agreement layout, plus another request’s directory and manifests outside the inbox.

F71 — **SIGNIFICANT — fixable in one round? yes. Frame validation narrows the accepted S1 semantics.**

S1 defines uniqueness by `(resolvedView, facing, frameIndex)`. S9 instead requires globally unique frame indices within an asset, rejecting ordinary static frames that use index `0` for different views/facings. Its exact four-element facing comparison also rejects multiple animation frames per facing. Evidence: [art-validator.ts:87](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tools/vtt-handoff/art-validator.ts:87), [validation.ts:90](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/src/vtt/handoff/v1/validation.ts:90), [binding plan:161](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/.tmp-plans/2026-09-09-vtt-handoff-plan.md:161).

**Required change:** Retain S1’s composite uniqueness rule. Check requested facing coverage without inventing global frame-index uniqueness or an unrequested animation prohibition. Add independently authored accepted and rejected examples.

F72 — **SIGNIFICANT — fixable in one round? yes. Publication exposes empty final files before completion.**

Both publication helpers create an empty destination reservation, close it, then rename the partial over it. Readers can observe the final request or completion-manifest name containing zero bytes; interruption leaves that name behind. Ordinary rename also overwrites a destination substituted after reservation. Staging does not fsync the containing directory after promotion. Evidence: [art-request.ts:74](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tools/vtt-handoff/art-request.ts:74), [safe-files.ts:254](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tools/vtt-handoff/safe-files.ts:254), [art-stage.ts:90](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tools/vtt-handoff/art-stage.ts:90).

**Required change:** Publish verified partials using atomic no-replace placement without a visible empty reservation; fsync staging directories. Add interruption and destination-substitution controls, asserting that a completion filename never appears prematurely and existing bytes survive collisions.

F73 — **SIGNIFICANT — fixable in one round? yes. Staged bundles can be reported verified with corrupt or forged metadata.**

Before publishing the review manifest, staging rechecks provenance payloads but not its copied `request.json` and `result.json`. Those copies can change after their initial verification without preventing completion. Separately, `checkArtStage()` merely parses each manifest; even `null` counts as a completed review, without checking declared hashes, sizes or staged files. Evidence: [art-stage.ts:73](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tools/vtt-handoff/art-stage.ts:73), [art-stage.ts:82](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tools/vtt-handoff/art-stage.ts:82), [art-stage.ts:103](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tools/vtt-handoff/art-stage.ts:103).

**Required change:** Verify every staged payload, including both JSON copies, before completion. Make `--check` validate manifest shape, identities, exact file set, sizes and hashes against anchored reads. Add forged-manifest, missing-file and copied-request/result tampering controls.

F74 — **SIGNIFICANT — fixable in one round? yes. A nonregular inbox file can block before rejection.**

The final source is opened with blocking `O_RDONLY`; only afterward does `fstat` reject nonregular files. A FIFO with no writer therefore hangs validation/staging before reaching the intended refusal. Existing symlink and sparse-file controls do not exercise this. Evidence: [safe-files.ts:129](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tools/vtt-handoff/safe-files.ts:129).

**Required change:** Open untrusted final entries without blocking on special files, then require a regular file before reading. Add a bounded FIFO regression that proves prompt rejection without supplying a writer.

F75 — **SIGNIFICANT — fixable in one round? yes. The required parent-swap race control is absent.**

The test swaps a directory in `beforeFinalValidation`, before the next traversal opens any parent. It proves rejection of an already-present symlink, not safety when a parent changes between descriptor opens. It also records no outside-read count. Evidence: [art-stage.test.ts:157](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tests/unit/vtt/art-stage.test.ts:157), [safe-files.ts:89](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tools/vtt-handoff/safe-files.ts:89), [binding plan:419](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/.tmp-plans/2026-09-09-vtt-handoff-plan.md:419).

**Required change:** Add a controlled swap after a parent descriptor is retained and before the next child open. Populate the outside target, directly count outside reads, and assert zero reads and no completion. Demonstrate that replacing anchored traversal with ordinary pathname traversal fails the control.

F76 — **SIGNIFICANT — fixable in one round? yes. PNG chunk-type validation accepts illegal high-bit bytes.**

Chunk types are decoded using Node’s ASCII decoder before validation. That decoder masks high bits: bytes `c9 c8 c4 d2` become `IHDR` and pass the letters-only check. With a matching CRC, invalid raw chunk names can be interpreted as structural chunks. Evidence: [png-validator.ts:62](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tools/vtt-handoff/png-validator.ts:62). I confirmed the masking with a pure Buffer snippet, without running the validator.

**Required change:** Validate the original four bytes before decoding, including the chunk-type reserved-bit rule. Add CRC-correct illegal-byte controls.

F77 — **SIGNIFICANT — fixable in one round? yes. The unfilter and decompression-bomb tests do not prove their claims.**

Every accepted filter case is a single zero-valued pixel: all predictors are zero, so replacing filters 1–4 with filter 0 still passes. The test named “compressed and decoded bomb inputs” contains dimension, pixel and compressed-size controls only; it never exercises the inflate output limit. Evidence: [png-validator.test.ts:46](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tests/unit/vtt/png-validator.test.ts:46), [png-validator.test.ts:95](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tests/unit/vtt/png-validator.test.ts:95).

**Required change:** Use independently calculated multirow/multipixel filtered inputs whose alpha results distinguish each predictor. Add a real bounded decompression-bomb control and a truncated valid deflate-stream control. Verify that disabling predictors or the inflate bound fails the corresponding assertion.

F78 — **SIGNIFICANT — fixable in one round? yes. Probe cleanup can delete files it did not create.**

Windows creation uses `CreateNew` and Linux creation uses `wx`, but cleanup unconditionally deletes either matching filename if it exists. On a filename collision, creation correctly refuses and cleanup then deletes the pre-existing file. The retained-file test uses an unrelated filename and misses this case. Evidence: [windows-probe.ts:91](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tools/vtt-handoff/windows-probe.ts:91), [windows-probe.ts:118](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tools/vtt-handoff/windows-probe.ts:118), [windows-probe.test.ts:74](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tests/unit/vtt/windows-probe.test.ts:74).

**Required change:** Track creation ownership and identity; remove only files created by this invocation. Add collisions for both exact probe filenames and assert preservation of their original bytes.

F79 — **SIGNIFICANT — fixable in one round? yes. The required completed-results listing command is missing.**

`art:validate` prints only a count. There is no CLI listing of result paths, request IDs or asset IDs from which a user can select a result for staging. Evidence: [art-validator.ts:183](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tools/vtt-handoff/art-validator.ts:183), [package.json:48](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/package.json:48).

**Required change:** Provide a machine-readable listing command or mode with those identities and validation/status information. Preserve explicit handling of `partial`/`blocked` results without calling them completed assets.

### Verified claims

- **UUID packing is sound:** The implementation encodes the 48-bit timestamp, version/variant, injected counter seed and 62 random bits; exhaustion cannot wrap and rollback/collision paths refuse. Tests contain a hardcoded expected UUID and explicit exhaustion controls. [uuidv7.ts:58](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tools/vtt-handoff/uuidv7.ts:58), [uuidv7.test.ts:18](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tests/unit/vtt/uuidv7.test.ts:18).
- **Substantial PNG checks are implemented:** CRC, IHDR format/order, contiguous IDAT, terminal IEND, trailing data, dimensions, exact inflated length and bounded inflation are present. Several corresponding negative inputs are real. [png-validator.ts:54](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tools/vtt-handoff/png-validator.ts:54), [png-validator.test.ts:53](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tests/unit/vtt/png-validator.test.ts:53).
- **Anchored traversal exists:** Parent descriptors are retained, child opens use `/proc/self/fd`, and canonical paths, regular-file status, size and before/after identity are checked. This is substantive protection despite F74/F75. [safe-files.ts:76](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tools/vtt-handoff/safe-files.ts:76), [safe-files.ts:121](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tools/vtt-handoff/safe-files.ts:121).
- **Several staging controls are effective:** Changed hashes, same-byte inode replacement, source changes and post-copy payload tampering reach explicit refusal assertions. [art-stage.test.ts:101](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tests/unit/vtt/art-stage.test.ts:101), [art-stage.test.ts:190](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tests/unit/vtt/art-stage.test.ts:190).
- **Probe classification is honest:** NOT_RUN/UNAVAILABLE are distinct from PASSED; both directions require matching hashes, and the CLI exits unsuccessfully for nonpassing outcomes. The supervisor’s worktree probe remains diagnostic, not the owner-root proof. [windows-probe.ts:61](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tools/vtt-handoff/windows-probe.ts:61), [doctor.ts:115](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tools/vtt-handoff/doctor.ts:115).
- **Supervisor flag (a): acceptable with the stated removal.** The allowlist is not path-only authentication: common-Git identity is also checked, and policy injection already exists. Remove the temporary S9 entry at merge as proposed; a broader derived-root redesign is not required. [paths.ts:17](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tools/vtt-handoff/paths.ts:17), [paths.ts:56](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tools/vtt-handoff/paths.ts:56).
- **Supervisor flag (b): behavior-neutral import correction.** `./contracts.ts` resolves the same module and supports plain Node execution. Both TypeScript configurations permit the suffix. Apply explicit extensions throughout Node-executed import chains; no repository-wide rewrite is needed. [validation.ts:5](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/src/vtt/handoff/v1/validation.ts:5), [tsconfig.app.json:8](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9/tsconfig.app.json:8).
- **Supervisor flag (c): no invocation finding.** Text matches are not execution evidence; the disclosed log-reading matches do not establish prohibited agent calls.
- Protected-path diffs are empty, and the four supplied integrity hashes match. No removed tests or prohibited additions were found. I ran no tests, builds or agents.

VERDICT: REJECT
review complete