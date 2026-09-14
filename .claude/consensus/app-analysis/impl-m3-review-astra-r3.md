# M-3 implementation review r3 FINAL (astra 01a0a013-6322-7a53-b569-37eb6f973a1c) on e7f54462, harvested 2026-09-14 09:34

Reviewed `ea3b3395..e7f54462` and cumulatively `a04a6093..e7f54462`. **No P1 remains.** One nonblocking reporting residual belongs in the landing note.

- **IG3-F1 — P2; blocks: no — Rejected sidecar contributes execution counts.**  
  [gate-inventory.ts:983](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tools/vtt-handoff/gate-inventory.ts:983), :1789. With a mismatched sidecar UUID, unchanged M-1 produces `evidence-invocation-mismatch` and uncertified discovery. The inventory correctly retains that failed verdict and exact reasons, but extracts the rejected sidecar’s module into `executedTestIdentities`. My native-classifier probe reproduced one displayed execution. This cannot authorize READY because reconciliation fails.  
  **Minimal change:** before extracting sidecar accounting, require its version/kind/phase/invocation identity to match the enclosing phase; otherwise return unavailable accounting while retaining M-1’s verdict and diagnostics.

| Round-2 finding | Disposition | Evidence |
|---|---|---|
| **IG2-F1** | **RESOLVED** | [gate-inventory.ts:1600](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tools/vtt-handoff/gate-inventory.ts:1600): completeness and selection checks cover every present phase. Empty retry fails while preserving the passed M-1 verdict. Regression fixture: report test :872. |
| **IG2-F2** | **RESOLVED** | GI :964, :983, :1333: unavailable accounting no longer discards the report; pending/queued map to unfinished. Native M-1 probes preserve exact verdicts and `phaseFailures`. Regression fixtures: report test :1589. |
| **IG2-F3** | **RESOLVED** | [handoff-report.test.ts:647](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tests/unit/vtt/handoff-report.test.ts:647), :662 restore exact failed/not-run reasons; :1025 checks published nonempty failure diagnostics; :1185 checks published mixed-skip identities/counts and Markdown `2/1/0/1/1`. |

**IG1 carry-forward: IG1-F4..F8 remain RESOLVED.** Validator rejection probes and null-exit runner behavior still discriminate; the in-memory default-policy control rejects normally and admits only after guard removal; all temporary allocations retain teardown; prerequisite folding preserves absent/stale `not-run` states.

Independent in-memory reproductions produced:

| Probe | Result |
|---|---|
| Complete initial A-pass/B-fail, B-pass retry | `passed-on-retry`, no reasons |
| Empty retry outcomes | Failed: accounting empty/mismatch and file mismatch |
| Retry superset containing an unknown file | Failed: retry scope and file-accounting mismatch |
| Retry reporting an initially passed file | Failed: retry scope and file-accounting mismatch |
| Empty initial discovery with `passWithNoTests` | Failed; M-1’s passed verdict preserved separately |
| Missing sidecar; pending and queued modules | Failed; report reference and exact native M-1 diagnostics retained |
| Sidecar UUID mismatch | Failed; `evidence-invocation-mismatch` preserved; IG3-F1 applies |
| Individual Playwright timeout followed by successful retry | `passed-on-retry`; Markdown contains `passedOnRetry=<file>` and the exact test identity |

The cumulative expectation audit found **no remaining unauthorized semantic assertion loss**. Removed assertion lines were relocated, reformatted, or migrated to receipt fixtures. Caller gate claims and the `preExistingFailures` expectation are the authorized retirements. Both exact reasons arrays are back, and the exact-reasons helper independently rejects an unexpected superset.

For the landing note:

- **Published-versus-built table: faithful.** Three baseline spot-checks: primary READY at `a04a6093:75–130` reads published JSON/Markdown; failed gate at `:206–218` checks publication result/Markdown; not-run at `:220–223` checks a built report. Current boundaries match. The not-run test’s “publishes” title is imprecise, but the lane table correctly identifies its boundary.
- **Cumulative command: pasteable.** Rendering contains all **34 unique file paths verbatim**, without a placeholder. All 11 inventory entries validate.
- **Isolation/cleanup/scope:** no order or worker-state dependency found by inspection; temporary roots are registered and removed. Exactly two round-3 files and six cumulative files changed. Both diff checks pass; zero added lines exceed 120 columns. Four existing long `package.json` lines remain. Production identity policy, lockfile, and all four M-1 files are byte-identical to baseline and HEAD.
- **D584.4/D589/D603/D620:** preserved. Cumulative selection remains explicit; runtime/preparation boundaries and immutable contracts remain intact; Windows evidence remains independently required; retry reporting does not infer a load cause or erase the existing residuals.

Verification here used inspection and in-memory probes only. The supplied 61/61, compiler, structural scan, discovery, and mutation-ledger results remain supervisor/lane verification; I did not rerun those executions.

**ACCEPT IMPL M3**

M3 IMPL REVIEW R3 DONE