One verification gap remains. HEAD, clean tree, plan hash, and frozen-contract hash match. I performed read-only inspection and ran no tests or builds.

1. **F20 — SIGNIFICANT — F19 remains partially resolved: the stronger file checks dropped directory-mutation detection.**

   **Evidence:** `fileSnapshots()` recurses into directories without recording them (`tests/unit/vtt/handoff-publish.test.ts:25–36`). The check-mode cases now compare only these file snapshots (`:152–170`), replacing the previous directory-entry comparisons.

   A mutant that creates an empty `unexpected/` directory inside the check branch would pass all three cases: missing bundle, successful check, and inconsistent sealed bundle. Directory creation violates the claimed zero-write behavior and was detectable by the previous test.

   **Required change:** Retain directory-tree comparisons alongside bytes/mtime/size comparisons, or record filesystem mutation operations. Add an effective empty-directory-creation control for check mode.

   **Rejected alternative:** The payload-rewrite control at `:172–175` proves file mutation detection only. The current implementation’s check branch is read-only (`tools/vtt-handoff/publish.ts:138–145`); this finding concerns the required regression protection, not an observed production write.

**Verified claims**

- **F14 — Resolved.** The bidirectional equality assertions compare published snapshot/art types against Zod-inferred types while preserving optionality and tuple structure (`tests/types/vtt-handoff-contract.type-test.ts:22–48`). Renamed fields, required optional fields, and tuple/object changes on **either side** make these assertions fail. Independent literals additionally check consumer construction (`:50–144`). Recorded declaration mutants fail at the equality assertions: `.tmp/vtt-handoff-r3-mutant-declaration-label.log:5`, `…-vision.log:5`, `…-frame-view.log:5`.

- **Declaration widening is acceptable.** Explicit `| undefined` matches Zod’s optional properties without adding JSON fields or changing requiredness (`contracts/vtt-handoff/v1/contracts.d.ts:18,24,59,106–124`; `src/vtt/handoff/v1/contracts.ts:19–24,51–52,98–111`). Consumer declarations remain independent of Zod.

- **F15 — Resolved.** Companions now use exactly the unit north edge of `object.position`, retain stable IDs, and remain present open/closed (`src/vtt/handoff/scene-snapshot.ts:74–84,225–238`). Collinear overlap requires positive length, preserving merely touching edges; for the unit cell edges produced here it suppresses coincident segments (`:62–71,240–251`). Independent north-adjacent/open/closed and multicell assertions replace the widened-segment expectation (`tests/unit/vtt/scene-snapshot.test.ts:288–345`). Door objects remain excluded from ordinary wall classification (`scene-snapshot.ts:209–212`).

- **F16 — Resolved.** The regression hashes the full request and coordinator and obtains the actual checksum through `EncounterSessionJournal` (`scene-snapshot.test.ts:91–120`). Its baseline precedes adapter execution, with literal hash pins and an enrichment control (`:206–259`). The recorded mutant changes all three hashes and fails the before/after assertion (`.tmp/vtt-handoff-r3-mutant-persisted-visible-token-id.log:16–28`).

- **F17 — Resolved.** Complete results require the requested asset, requested views, and each requested pass per frame (`src/vtt/handoff/v1/validation.ts:75–121`). Empty-complete and mixed-frame regressions target those failures; partial/blocked acceptance remains explicit (`tests/unit/vtt/handoff-contract.test.ts:200–243`).

- **F18 — Resolved.** Owner validation avoids unrelated worktree resolution; missing authorized entries are skipped while authorization and common-Git checks remain (`tools/vtt-handoff/paths.ts:59–79`). Tests exercise the absent-worktree, valid-worktree, lookalike, and default-root cases (`tests/unit/vtt/handoff-bootstrap.test.ts:77–107`).

- **F19 — File-mutation portion resolved; directory gap remains F20.** Every file, including READY, contributes bytes, mtime, and size to successful and failing checks (`handoff-publish.test.ts:25–36,152–170`). The recorded publisher mutant fails `CHECK_MODE_FILESYSTEM_MUTATION` (`.tmp/vtt-handoff-r3-mutant-publish-check-write.log:10–19`).

The nine-file diff contains no fixture, persistence, frozen-contract, `.claude/**`, or `docs/**` changes. No forbidden-pattern matches were found. The recorded lane cumulative result is six files/28 tests (`.tmp/vtt-handoff-r3-final-cumulative-vitest.log:6–12`).

VERDICT: REJECT
review complete