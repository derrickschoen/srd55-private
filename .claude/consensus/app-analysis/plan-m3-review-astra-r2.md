# M-3 plan review r2 (astra 01a09f45-2f74-79e1-8cc6-3f26f86f40b2), harvested 2026-09-14 05:49

- **PG2-F1 — P2 — Revision-drift classification contradicts its required fixture.**  
  **Plan lines [449–455](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/.tmp-plans/2026-09-14-executable-verification-inventory-plan.md:449), 482, 519.** Matching requires both revisions to equal the current commit; wrong-revision evidence becomes `not-run`. But the revision-drift fixture must produce `failed`, expose the outer reason, and preserve the passed M-1 verdict.

  **Read-only probe:** evaluating the prescribed predicates gives:

  | Passed-v2 fixture | Outer success | Revision match |
  |---|---:|---:|
  | Nonzero exit / signal / spawn error; unchanged current revision | false | true |
  | Revision changes from previous to current | false | false |
  | Completed successfully on an older revision | true | false |

  Thus drift cannot reach the stated “same-revision matching receipt is failed” branch.

  **Minimal change per P1:** specify classification precedence: `revisionBefore !== revisionAfter` is an outer failure, classified `failed` before stale-receipt filtering. Reserve stale `not-run` for completed evidence with equal recorded revisions differing from current HEAD. Retain the separate fixtures and unchanged M-1 verdict. No broader redesign is needed.

| Round-1 finding | Disposition | Plan lines and independent verification |
|---|---|---|
| **PG1-F1** | **RESOLVED** | **266–270, 405–407, 452, 505–506.** Separate execution/discovery preparation explicitly handles all three module overrides and all three Playwright JSON output keys. Concrete phase-command authentication and both named mutants are specified. Evaluating the installed Playwright output resolver in memory confirmed `_FILE` and `_NAME` select files; removing redirection keys selects stdout. M-1 source confirms the runner hooks and command fields. |
| **PG1-F2** | **PARTIAL** | **416–423, 455, 471, 482, 519.** Independent outer-success predicate, preserved v2 verdict, and all four paired fixtures are present. Predicate probes reject every outer failure. **PG2-F1** remains: drift classification conflicts with matching/stale rules. |
| **PG1-F3** | **RESOLVED** | **359–369, 504, 650.** Node scripts, local `npx` targets, and recursively resolved supported npm-script segments are explicit, without installation. Both missing-script and missing-local-target cases extend `M3-INV-ARGV-MISSING`. Filesystem probes resolved the actual scripts, Vitest/Playwright modules, local executables, Node, npm/npx, and flock. |
| **PG1-F4** | **RESOLVED** | **337–341, 450, 488–489, 520–521, 592–601.** Initial/full and retry/failed-file reconciliation, nested-suite normalization, and before-edits Playwright capture are explicit. The actual M-1 reducer accepted initial A-pass/B-fail followed by B-pass only. An in-memory identity probe matched M-1 using `config.rootDir`; cwd-relative resolution differed. |
| **PG1-F5** | **RESOLVED** | **373–397, 648–649.** IDs occupy comment lines; executable lines stand alone. Independent quoting round trips cover spaces, apostrophes, and empty values. Receipt-producing CLI guidance is explicit. The renderer is not implemented yet; an attempted shell-backed quoting probe was blocked by `EPERM`, so no quoting execution result is claimed. |
| **PG1-F6** | **RESOLVED** | **527–530, 545, 586, 670.** Mutation is explicitly confined to an in-memory transformed module. My mocked-filesystem probe exercised actual `paths.ts`: injected temp-owner policy passed, default policy rejected the unlisted root, and removing the guard in memory admitted it. Production bytes remained unchanged. |

No other regression or new scope/decision conflict found. Independent comparison confirmed **11 unchanged ids** and **34 unique existing cumulative paths**, exactly the historical 33-file union plus the repair spec. Identity repair, dedicated acceptance surfaces, and the six-file boundary remain intact and consistent with D584.4/D589/D603/D620.

Reviewed HEAD `a04a6093`; tree remained clean. No gate, discovery, build, model, or agent runs were performed.

**REJECT PLAN M3**

M3 PLAN REVIEW R2 DONE