# M-3 plan review r1 (astra 01a09f2a-a1b7-7b02-a547-e85056fb4e3e), harvested 2026-09-14 05:19

**REJECT PLAN M3.** The identity repair and gate membership are sound. The execution environment needs one blocking correction before implementation.

Reviewed HEAD `a04a6093`; tree remained clean. Only read-only inspection and in-memory Node probes were used. Sol’s recorded discovery counts were inspected, not rerun.

- **PG1-F1 — P1; blocks: yes — Inherited environment can replace the declared runner and make discovery write files.**  
  **Plan lines 253, 320–324, 383, 422–425, 761–765.** The prescribed environment merge retains `DND_GATE_VITEST_MODULE`, `DND_GATE_PLAYWRIGHT_MODULE`, and `DND_GATE_FLOCK_MODULE`. M-1 explicitly honors these overrides (`gate-vitest.mjs:129`, `gate-playwright.mjs:64`, `gate-runner-lib.mjs:12–15`); its tests use them to substitute fake runners. The receipt records inventory overrides, so its declared command/environment can omit the actual runner substitution.

  Separately, inherited `PLAYWRIGHT_JSON_OUTPUT_FILE` or `PLAYWRIGHT_JSON_OUTPUT_NAME` redirects list-only JSON into a file. The installed JSON reporter then creates directories/writes that file, contradicting the validator’s read-only promise and defeating stdout parsing.

  **Minimal change:** define separate execution/discovery environment preparation. Reject or remove the three M-1 module overrides for inventory execution; clear Playwright JSON output redirection for stdout-based discovery. Verify the concrete module/launcher recorded in M-1 phase commands. Add named mutants proving runner substitution cannot satisfy a required gate and ambient JSON redirection cannot cause discovery writes.

- **PG1-F2 — P2; blocks: no — Clarify the outer-process success predicate and test it.**  
  **Plan lines 392–397, 428, 444, 454–458.** Line 397 makes a test receipt’s final status the M-1 verdict; line 428 correctly says command failure also fails reconciliation. Make that distinction explicit: a passed M-1 report cannot overcome an outer nonzero exit, signal, spawn error, or revision change. Preserve M-1’s verdict unchanged while reporting the outer failure. Add passed-v2 fixtures paired with each outer failure; the current matrix explicitly tests nonzero exit only for non-test gates.

- **PG1-F3 — P2; blocks: no — Resolve launcher targets, not just the first argv token.**  
  **Plan lines 340, 349, 473, 609.** Finding `node` or `npx` on `PATH` does not establish that `tools/gate-vitest.mjs`, the installed Vitest/Playwright module, or local `tsc` exists. Specify resolution for the current `node`, `npx`, and npm-script invocation forms without invoking package installation. Extend `M3-INV-ARGV-MISSING` with missing Node script and missing local package executable cases.

- **PG1-F4 — P2; blocks: no — Make discovery reconciliation explicitly phase-aware.**  
  **Plan lines 320–322, 424, 450–458, 597, 738.** Full discovery belongs against the **initial** phase. M-1 retries only initially failed files; requiring the retry phase to equal the full discovery set would reject legitimate `passedOnRetry` results. Add a realistic two-file initial phase with a one-file successful retry.

  Specify Playwright’s identity normalization too: list JSON locations are relative to `config.rootDir`; M-1 execution IDs include project name, test ID, and absolute file path. Add nested-suite/path normalization assertions. Also put the root Playwright identity capture explicitly in the **before-edits** commands; current section 9.1 captures only Vitest paths, while later sections require a Playwright before/after comparison.

- **PG1-F5 — P2; blocks: no — Define genuinely copy-pasteable rendering.**  
  **Plan lines 353–361, 374–375.** An unexplained `id:` prefix makes a shell command non-executable. Put the ID on a comment or separate label line. Test quoting through argument/environment round-tripping, including spaces and apostrophes. Clarify that the displayed leaf invocation alone does not produce the outer receipt required by readiness; provide a concrete receipt-producing CLI invocation where execution guidance is rendered.

- **PG1-F6 — P3; blocks: no — Resolve the mutation-proof/allowed-files conflict.**  
  **Plan lines 491, 494, 550, 586.** `M3-DEFAULT-GUARD-REMOVE` requires bypassing production code that the allowed-file rules forbid editing. Specify an in-memory transformed-module mutant, or explicitly distinguish temporary mutation-proof edits from the permitted final diff. Keep production policy bytes unchanged.

| Check | Assessment |
|---|---|
| **1. Identity-policy repair** | **Pass.** All three specs use `{ownerCheckout: fixture.root, authorizedWorktrees: []}` and inject it into every publication call. `package.json` supplies `srd-55`; an empty `.git` directory suffices because `commonGitDirectory(root)` and `commonGitDirectory(owner)` resolve the **same directory**. No Git initialization is needed. Keeping the real owner and merely listing the fixture would fail Git identity. The injected `ReportGitReader` handles report Git operations. The default-policy rejection test is correctly specified. |
| **2. Executable inventory / discovery / M-1** | **Partial.** Structured argv/env/config/prerequisites and M-1 v2 consumption are specified; no stdout verdict reparsing. Non-test gates correctly use discovery `none`. Fix PG1-F1 and tighten phase/identity mapping per PG1-F4. |
| **3. Validator and mutants** | **Partial.** Placeholder, missing/illegal env, config, ID, selection, prerequisite, and report-kind cases are named. Add effective-environment and launcher-target coverage. |
| **4. Report reconciliation** | **Pass with clarification.** Every required gate gets a state; missing evidence forces PARTIAL; stale revision becomes not-run; failed and passed-on-retry cases have tests. Add outer-process failure fixtures. |
| **5. Membership and broken commands** | **Pass.** Independent Node comparison found all **11 names unchanged**, and all **34 unique cumulative paths exist** and equal the historical 33-file union plus `d583-contract-inventory.test.ts`. Parity/smoke receive `VTT_HANDOFF_ARTIFACT=dev`; supervisor launch remains separate. |
| **6. Consumers / rendering** | **Partial.** Repository grep confirms the symbol consumers are `report.ts` and `handoff-report.test.ts`, both covered. External supervisor migration is explicitly separate. Resolve rendering details in PG1-F5. |
| **7. Verification contract** | **Mostly complete.** Includes tsc, sg, focused three-spec Vitest, node syntax checks, **641-file** pre/post Vitest capture, and bounded render/real-config discovery proof. Add explicit pre-change Playwright identity capture and the missing negative controls. |
| **8. Scope / decisions** | **Pass.** No new dependencies, tier-based selection, affected-test substitution, docs changes, M-1 verdict edits, or M-2 internals are planned. Preserved cumulative coverage and dedicated acceptance surfaces align with D584.4/D589/D603/D620. M-2 completion remains an implementation prerequisite. |

The temp-owner identity probe passed using the actual `paths.ts` implementation with an in-memory filesystem. It exercises same-owner identity; distinct-root shared-Git behavior is a separate case, already modeled by the synthetic worktree in `handoff-bootstrap.test.ts:91–107`. Actual passage of the repaired three specs in this unauthorized worktree remains the required implementation proof.

**REJECT PLAN M3**

M3 PLAN REVIEW R1 DONE