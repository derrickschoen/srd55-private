# M-2 BUILD-CACHE-01 (git-key redesign): plan round cap reached with two bounded edits open (asked 2026-09-14 15:20, supervisor)

State: plan r6 (dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md, 698 lines, sha aa9dcbde…) after three astra review rounds (10 → 6 → 2 findings). Astra's final verdict: REJECT on two P1s, "neither requires another redesign", and for the cap decision: "the required revision is limited to one additional path-byte rejection plus its regression, and authorization/update of two affected guard-routing assertions. No further architecture change is requested." Everything else passes: environment and guard routing, four-build proof, normal-use availability, size cap 250 lines, complete verdict reproduced at 209 ms with the same key.

The two edits (both verified by the supervisor):
- PR6-F1: the `unsupported-path` bypass checks only the basename for a leading quote; git's `--stdin-paths` quoting applies to the whole line, so a path like `"tools/x.mjs"` (directory starting with a quote) slips through. Fix: also bypass when the path's first byte is `"`; add that case to the two-file control.
- PR6-F2: moving the dist-clean guard inside the cache module changes `scripts.build` to `tsc -b && node tools/dist-build-cache.mjs`, and two existing tests assert the guard's name appears in that string (scraper-is-never-in-the-bundle.test.ts:80, build-boundary.test.ts:109). Fix: add those two files to the allowed list and replace only those two assertions with ones proving the new guarded route (same subject, not deleted).

Options:
A. Authorise ONE cap-exceeding plan edit limited to exactly those two items (sol, same session), then go straight to implementation with astra's implementation review (no further plan review). Recommended.
B. Proceed to implementation from r6 with the two edits folded into the implementation brief (skips the plan edit; astra's implementation review still checks both).
C. Stop M-2.
Supervisor recommendation: A, or B if you want fewer steps — the two edits are unambiguous and B saves one round.

## RESOLVED 2026-09-14 15:21 — owner ruled A (D623.9); plan r7 dispatched (sol resume 01a0a0e3…).
