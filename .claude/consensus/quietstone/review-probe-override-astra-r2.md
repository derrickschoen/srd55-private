# Probe-override review, astra round 2 (2026-09-13, read-only, dnd-wt-quietstone at 46dbc344)

Source: .tmp/runs/fanout/review-probe-override-r2.log (verbatim final message)

1. **PO2-F1 — High; blocks: yes — Minimum height does not authenticate the replacement’s height.**  
   [tools/ai-dm-screenshot-probe.ts:4077](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/ai-dm-screenshot-probe.ts:4077) accepts any height above the layout minimum, provided the PNG and manifest agree.

   The relaxation has a legitimate basis: [board-chrome-layout.ts:262](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/src/vtt/board-chrome-layout.ts:262) describes a minimum, [board-chrome.ts:1423](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/src/vtt/board-chrome.ts:1423) applies `min-height`, and [styles.css:1120](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/src/vtt/styles.css:1120) enables wrapping. Using saved semantic-board content with the layout helper, I confirmed these dimensions in **both** manifests:

   | Boards per manifest | Width | Minimum height | Recorded/actual height |
   |---:|---:|---:|---:|
   | 8 | 1640 | 3552 | 3884 |
   | 4 | 3048 | 3776 | 3948 |
   | 4 | 1640 | 4032 | 4396 |
   | 4 | 2152 | 4336 | 4572 |
   | 4 | 2280 | 4628 | 4780 |

   Thus equality with this helper would incorrectly reject valid artifacts. But the replacement invariant is insufficient: a valid 1640×5000 PNG, or a cropped 1640×3600 PNG, with matching manifest dimensions and digest passes for the first group. The check cannot establish preservation of capture geometry/chrome. Bind exact dimensions to independently authenticated existing source-capture evidence without recapturing; do not restore equality with this minimum helper.

2. **PO2-F2 — Medium; blocks: yes — The claimed IHDR validation does not validate IHDR.**  
   [tools/ai-dm-screenshot-probe.ts:4106](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/ai-dm-screenshot-probe.ts:4106) calls [src/assets/png.ts:213](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/src/assets/png.ts:213), which checks the signature and reads offsets 16/20. It never checks the IHDR chunk type, length, or completeness.

   An in-memory execution of that helper accepted a **24-byte buffer** containing the PNG signature, zero chunk-type bytes, and dimensions 1640×3884. With its matching digest and manifest entry, it passes the override guards despite containing no PNG image. Validate the PNG structure before accepting it, and cover malformed/truncated headers—not merely text with a bad signature.

3. **PO2-F3 — Medium; blocks: yes — Boundary tests remain narrower than the mutation claims.**  
   [tests/unit/tools/ai-dm-screenshot-probe.test.ts:2336](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tests/unit/tools/ai-dm-screenshot-probe.test.ts:2336) and [:2371](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tests/unit/tools/ai-dm-screenshot-probe.test.ts:2371) perturb only width. Deleting either height condition survives those tests. The non-PNG fixture at [:2405](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tests/unit/tools/ai-dm-screenshot-probe.test.ts:2405) is only nine bytes: deleting signature validation still produces the expected rejection through an out-of-bounds dimension read.

   Additionally, the direct comparison test at [:2478](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tests/unit/tools/ai-dm-screenshot-probe.test.ts:2478) never reads override-bearing comparison JSONL. Removing `imageOverride: z.never().optional()` at [tools/ai-dm-screenshot-probe.ts:3240](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/ai-dm-screenshot-probe.ts:3240) survives these tests; the schema then strips the unknown field before the direct validator sees it.

| Round-1 finding | Disposition | Evidence |
|---|---|---|
| PO-F1 | **PARTIAL** | Digest, signature and actual-versus-manifest dimensions checked at `tools/ai-dm-screenshot-probe.ts:4096–4118`; residual PO2-F1/F2. |
| PO-F2 | **RESOLVED** | Manifest bytes hashed at `tools/ai-dm-screenshot-probe.ts:3996`; runtime HEAD explicitly labelled and original capture hash null at `:4161–4166`; assertions at `tests/unit/tools/ai-dm-screenshot-probe.test.ts:2088`. This identifies runtime HEAD, not the original recomposition revision. |
| PO-F3 | **RESOLVED** | Startup bypass at `tools/ai-dm-screenshot-probe.ts:4023`; capture confined to non-override branch at `:4168`; throwing-capture test at `tests/unit/tools/ai-dm-screenshot-probe.test.ts:2434`. |
| PO-F4 | **RESOLVED** | Both comparison sides rejected at `tools/ai-dm-screenshot-probe.ts:3549`; direct row assertions at `tests/unit/tools/ai-dm-screenshot-probe.test.ts:2513`. |
| PO-F5 | **RESOLVED** | Catalogue ordering at `tools/ai-dm-screenshot-probe.ts:2553`; both orders, denominators and gates asserted at `tests/unit/tools/ai-dm-screenshot-probe.test.ts:2546`. |
| PO-F6 | **PARTIAL** | Thirteen tests materially improve coverage; residual surviving mutations described in PO2-F3. |

Static mutation reassessment:

| Mutation | Does a targeted test become red? |
|---|---|
| Replace PNG dimension reading with manifest dimensions, or delete the complete dimension comparison | **Yes:** test at `:2366`. Height-only deletion survives. |
| Delete direct comparison rejection | **Yes:** test at `:2478`, including override-versus-itself. File-reader rejection deletion remains uncovered. |
| Reintroduce capture during overrides | **Yes:** throwing-capture test at `:2434`. |
| Reintroduce service startup alone | **Not deterministically established:** the throwing fixture supplies a service and does not spy on `start`; other tests may start a real service. |

Verified branch/HEAD, both requested diffs, clean working tree, both diff checks, production SHA `ba8d8238…`, and unchanged frozen-contract SHA. All **48/48** recomposed files match their manifest digests and dimensions. No additional non-override behavior regression or package dependency change found.

Vitest was not run because its fixtures require writes in this read-only sandbox. No edits, git writes, other agents, or full-suite execution occurred.

**REJECT PROBE-OVERRIDE**

PROBE-OVERRIDE REVIEW R2 DONE