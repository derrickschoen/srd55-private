# SVG-fog pilot plan review r1 (gpt-6-astra, session 01a09d9e-7057-7312-99b1-0be3eb02b79d), harvested 2026-09-13 22:04

The plan is not ready to implement. I found four blocking gaps. Review was read-only at `14039ca5`; the worktree remains clean. No agents, model calls, Vitest, or Playwright runs were used.

References below are to the [plan under review](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/.tmp-plans/2026-09-13-qsfog-svg-pilot-plan.md).

1. **PS1-F1 — P1 blocks; blocks: yes — lines 625–645: the `/tmp` wrapper cannot resolve its dependency.**  
   `import { defineConfig } from '@playwright/test'` resolves from `/tmp`, not the worktree. Read-only Node resolution returned `MODULE_NOT_FOUND`; Playwright’s resolver provides no worktree fallback for this import. Consequently, the browser command fails before exercising the seam.  
   **Smallest fix:** remove that import and export the configuration object directly. Retain the absolute base-config import and existing overrides.

2. **PS1-F2 — P1 blocks; blocks: yes — lines 370, 500–531: thresholds are frozen, but the measurement algorithm is not.**  
   The plan does not define the observed structural-edge mask, edge thresholds, competing reference masks, overlap colour masks, area-padding values, or reduced-view “visible break/notch” predicate. Different reasonable implementations can produce different NCC results against identical pixels. “Independent/test-owned” does not resolve those choices.  
   **Smallest fix:** freeze those definitions before asset implementation, including composition opacity/order, sampling coordinates, numeric precision, and a named failing gate for each mutant. Keep expectations independent of emitted output.

   I independently reproduced **7/16 versus 0/16** for the specified **top-rail-or-hatch** check. That is a narrower check than full frame survival: testing *any* missing rail or hatch gives **14/16 versus 0/16**. Preserve that distinction in names and reports.

3. **PS1-F3 — P1 blocks; blocks: yes — lines 196, 218–224, 698–793: the operational freeze is not enforceable from the hand-back.**  
   Recording committed *probe* hashes does not require the implementation revision to be committed or prohibit another lane editing during C1/C2. The loader treats `manipulationValidation` as opaque; it does not reject a stale `probeHarnessSha256`. The report has no specified input carrying the timing/service-continuity attestation. Fixed output paths also risk silently replacing earlier runs: the landed probe truncates `outPath`.  
   **Smallest fix:** require a supervisor block record tying together committed revision, clean tracked state, all lanes paused, current harness/manifest hashes, invocation policy, and each arm’s start/end times. Validate it before promotion. Define the two-hour interval and date timezone explicitly; reject stale manifests before C1; require unused run outputs. Preserve invalidated attempts and start a fresh block.

4. **PS1-F4 — P1 blocks; blocks: yes — lines 677–692: the Vitest discovery proof checks the wrong output.**  
   In installed **Vitest 4.1.10**, plain `vitest list` collects modules and prints test cases. A discovered fixture containing no tests need not appear; collection errors can also suppress output. Absence from that output does not prove absence from discovery.  
   **Smallest fix:** use `npx vitest list --configLoader runner --filesOnly --json`, validate the returned file list, and compare against a recorded baseline. Assert exactly the two new specs and zero forbidden fixture/artifact paths.

5. **PS1-F5 — P2 should fix; blocks: no — lines 155, 494, 539–554: compatibility tests do not connect the producer to the consumer.**  
   Existing probe tests authenticate their own fixtures; running them does not prove the new builder’s manifest works. Add a test in the new report spec that passes a builder-produced manifest through the real `runScreenshotProbe`, using an injected answerer and a snapshot service that throws if invoked. Assert delivered bytes and `originalPngSha256` equality. Also add isolated boundary cases for all seven promotion conditions; merely emitting five base/LOO rows does not prove their gates.

6. **PS1-F6 — P2 should fix; blocks: no — lines 375–407: specify the snapshot service’s staging directory.**  
   The probe override commands accept `.tmp/.../*-images`, but `BoardSnapshotService.start` requires its output beneath `dnd-slim-runs/` with a basename ending in `-images` ([validator](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/ai-dm-board-snapshot.ts:269)). The capture command’s `--out .../frame5` cannot be passed directly to that service. Name a separate compliant capture directory and describe how its artifacts enter the experimental output tree.

7. **PS1-F7 — P2 should fix; blocks: no — lines 151, 221, 245: clarify authentication and deduplication against actual row fields.**  
   Historical rows contain `truth`, not `truthSha256`; stored scores contain neither intersection nor union. Compare canonical recomputed truth with canonical row truth, derive hashes/counts locally, and compare the resulting IoU/hallucinations with stored values. Limit duplicate rejection to duplicate accounting assignments or diagnosis records: repeated predictions are deduplicated by the scorer, and the same coordinate in both classifications is legitimate. Out-of-bounds predictions belong in their explicit buckets.

8. **PS1-F8 — P2 should fix; blocks: no — lines 272–275: aggregation and non-verdict precedence need explicit definitions.**  
   Define overall ordinary-FP rate as a specific weighted quantity—preferably summed FP divided by summed fixed eligibility—rather than leaving macro versus pooled averaging implicit. Define global/per-base headroom. Reserve `INCOMPARABLE_FRESH_RECAPTURE_CONTROLS_REQUIRED` for authenticated archived-versus-fresh capture mismatch; corrupted accounting/provenance should be invalid input, not a suggestion that fresh controls alone repair it.

9. **PS1-F9 — P2 should fix; blocks: no — lines 347–356, 486, 571–572: narrow the default-path proof and decode mutant.**  
   A3=A1 plus restored DOM/inventory and B-region confinement is strong evidence of restored board appearance. It does not independently prove the no-hook path retained its old screenshot policy. Explicitly assert unchanged screenshot options and that the additional settlement occurs only with a hook. Also, removing the tool’s explicit `decode()` await alone may remain correct because `waitForSettled()` itself awaits every image’s decode; the race mutant must remove the effective guarantee.

| Requested check | Assessment |
|---|---|
| **1. Identity manifest and paths** | Structurally compatible with v2. Verified JSONL digest, 24 PNG hashes/dimensions/CRC structures, terminal manifest matching, and seed permutation over archived catalogue IDs. `sourcePng` and delivered file describe identical bytes. Source root resolves inside this worktree. **All three probe `--images-root` paths pass the actual path rules**; override mode never starts the stricter snapshot service. Production truth recomputation and builder-to-loader execution remain implementation checks. |
| **2. Accounting and protocol** | Eight buckets match the diagnosis partition and reconstruct all 24 historical scores/hallucination counts exactly. Ordinary fog FP totals **280**. The supplied `s_b`, `s`, `T`, `T_b`, reference-average, 4/5-base and positive-LOO formulas are preserved. All seven conditions should be conjunctive. Non-verdict handling needs F8. Exact comparison with the prior round remains access-blocked. |
| **3. Raster and deterministic gates** | Integer masks and nearest-phase counts should remain exact; do **not** tolerance-relax 7/16, 0/16, palette membership, or source-byte identity. Chromium pixel/PNG repeatability must be demonstrated in the pinned environment. Floating-point NCC comparisons need a predefined precision policy, not post-result tolerance tuning. F2 blocks the full gate proof. |
| **4. Capture seam and browser isolation** | Optional API can preserve existing behavior. A-B-A plus the proposed audits is sound for the bounded visual claim, with F9’s qualification. Ports 4460/4461 and non-reuse settings are appropriate, but F1 prevents execution and F6 leaves staging unspecified. |
| **5. Tests and discovery** | Broad useful matrix, but producer/loader integration and individual verdict boundaries need coverage. Fixture naming rule is correct; discovery command is not. |
| **6. Scope and dependencies** | No prescribed art, generator, pin, oracle, floor, legend, projection, probe-schema, or frozen-contract change. Snapshot seam is within the authorized route. No new dependency is prescribed. Option B stays forbidden; nothing ships. |
| **7. Supervisor hand-back** | Correct ordering and general invalidation intent, but insufficient committed-worktree freeze, stale-manifest enforcement, timing evidence, and overwrite protection. F3 blocks. |

**REJECT PLAN SVG-FOG**

BLOCKED: Exact prior-round protocol review remains incomplete because the three named brainstorm/critique files are in a sibling worktree explicitly forbidden by this request. The access clarification is pending; those files were not read.