# Probe override review r3 FINAL (gpt-6-astra, session 01a09d91-88d4-77e1-808b-89cb0b11607f) on 14039ca5, harvested 2026-09-13 21:49

**No P1 remains.** Reviewed both requested diffs at `14039ca5`; residual findings are nonblocking.

| Finding | Severity | Blocks | Evidence and minimal change |
|---|---|---|---|
| **PO3-F1 — Two mutation claims remain unproven** | P2 | No | The fixture always supplies `sourcePng` at [test:2038](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tests/unit/tools/ai-dm-screenshot-probe.test.ts:2038), so making that schema field optional survives. The capture-avoidance test injects a service at [test:2770](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tests/unit/tools/ai-dm-screenshot-probe.test.ts:2770), independently preventing startup. **Minimal change:** add a missing-`sourcePng` schema-error assertion and exercise startup avoidance without an injected service, using a rejecting startup spy. |
| **PO3-F2 — Version label is not enforced** | P3 | No | [probe:509](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/ai-dm-screenshot-probe.ts:509) accepts any nonempty version. Original v1 manifests fail because required provenance fields are absent; a v1-labelled manifest containing all required fields passes. This preserves the provenance boundary and is acceptable for these diagnostic runs, but does not implement explicit v1 rejection. **Minimal change:** use the v2 literal and add a wrong-version test. |
| **PO3-F3 — Full IHDR equality claim is inaccurate** | P3 | No | [probe:4252](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/ai-dm-screenshot-probe.ts:4252) compares width and height only. All 48 actual pairs have RGB sources and fully opaque RGBA overrides. **Minimal change:** correct the report to say “exact width/height equality”; requiring colour-type equality would reject the authorized artifacts. |

| Prior finding | Disposition | Evidence |
|---|---|---|
| **PO2-F1** | **RESOLVED** | Source bytes are authenticated at [probe:4187](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/ai-dm-screenshot-probe.ts:4187); exact source/override dimensions replace the unsound minimum-height rule at probe:4252. State-derived width remains checked. |
| **PO2-F2** | **RESOLVED** | [probe:3062](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/ai-dm-screenshot-probe.ts:3062) checks signature, IHDR length/type/CRC, chunk bounds, and terminal IEND including CRC. This is structural validation, not complete image decoding. |
| **PO2-F3** | **PARTIAL** | Named tests now cover dimension, CRC, source-file, and comparison failures. The two isolated coverage gaps in PO3-F1 remain. |

Static mutation assessment follows; these are predicted outcomes, not locally executed mutants. All test names below begin `QSFOG-01`.

| Mutation | Named test and assessment |
|---|---|
| Delete source/override dimension equality | **Red:** `override PNG rejects a height-only difference from the authenticated source` (test:2467). No bit-depth/colour equality exists to delete. |
| Delete IHDR CRC rejection | **Red:** `malformed PNG structure rejects bad-IHDR-CRC` (test:2700). |
| Make `sourcePng` optional | **Survives:** no missing-field fixture. Deleting source-file authentication instead makes `authenticated source PNG digest mismatch is rejected` red (test:2539). |
| Restore capture during override | **Red:** `override avoids snapshot capture entirely` (test:2743). However, deleting only the startup guard is **not detected by that test**, because it injects a service. |
| Delete comparison-validator rejection | **Red:** `direct acceptance comparison rejects override rows on both sides` (test:2790), including its file-loader assertion at test:2870. Direct comparison rejection is also covered separately within that test. |

The loader hashes the source file at the effective `sourceImagesRoot` and rejects digest mismatches before answering. `--image-override-source-root` can relocate that root; the effective root is recorded in override provenance. Only selected states are checked.

The cumulative diff preserves the default non-override path’s row selection, row keys, capture behavior, and summary text, with no new required CLI inputs. Optional override metadata is omitted entirely. Intervention-generation gating, PNG-only overrides, comparison rejection on both sides, and explicit `--questions` disclosure remain intact. No dependencies changed.

Independent artifact checks passed for both manifests: **24/24 each** source digests, override digests, and declared dimensions; all **48 overrides decoded successfully**. Production/test hashes match the supplied prefixes; diff-check passed and the worktree remained clean. Vitest was not run: its installation resolves into a prohibited sibling worktree, and the tests require writes. The sibling review/reports were not read; prior-finding dispositions use your supplied descriptions.

**ACCEPT PROBE-OVERRIDE**

PROBE-OVERRIDE REVIEW R3 DONE