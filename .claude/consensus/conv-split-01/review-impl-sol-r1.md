VERDICT: REVISE — P1: 0, P2: 1, P3: 0.

- P2 — `preserve.mjs` is not fully fail-closed for test-file preludes/imports. [`preserve.mjs:137`](/home/vagrant/PhpstormProjects/dnd-wt-conv-split-01/.tmp/runs/conv-split-01/preserve.mjs:137) accepts any named top-level declaration; [`preserve.mjs:262`](/home/vagrant/PhpstormProjects/dnd-wt-conv-split-01/.tmp/runs/conv-split-01/preserve.mjs:262) checks only the three known local declarations and never rejects unrelated extras or duplicates; [`preserve.mjs:274`](/home/vagrant/PhpstormProjects/dnd-wt-conv-split-01/.tmp/runs/conv-split-01/preserve.mjs:274) validates only imports still present. Consequently, removing an import and replacing it with a same-named top-level declaration can pass the binding check, compilation, call-text comparison, and potentially the sentinel counts. Require each file’s complete prelude-declaration set to equal its expected set and compare its complete derived import binding set—including imported and local names—against the expected bindings for that slice.

Everything else checked clean:

- All four slices are byte-identical to base ranges 849–2795, 2796–2911, 2912–3720, and 3721–4314. Independent SHA-256 comparisons matched; a separate C-slice block spot-check also matched.
- Fixtures exactly equal the prescribed base transformation: SHA-256 `b7789dce…`; 24 relocated declarations, no mutable top-level binding, and only the three specified declarations removed.
- Array copies and `kbInputs` placement are exact and limited to the files where used.
- Actual imports have no source/export-name anomalies.
- D583 independently recomputes to 143 / `700a277d…` and 151 / `ef991c2c…`; the all-success seam exercises both empty diffs, empty untracked output, and a present merge-base.
- Mutant kills are substantive in the implementation transcript and retained logs; the dropped-test runtime count remains part of the explicitly pending runtime work.
- Both mutation-ledger consumers remain satisfied at [`mutation-ledger.test.ts:111`](/home/vagrant/PhpstormProjects/dnd-wt-conv-split-01/tests/unit/vtt/mutation-ledger.test.ts:111) and [`mutation-ledger.test.ts:132`](/home/vagrant/PhpstormProjects/dnd-wt-conv-split-01/tests/unit/vtt/mutation-ledger.test.ts:132).
- Scope is exactly seven committed files; `git diff --check` is clean.

Review was read-only against frozen commit `30f412df`; no tests, builds, typechecking, or writes were performed. The pending supervisor runtime steps were not treated as findings. The consensus-review skill governed the independent reviewer posture and evidence requirements.

CONV-SPLIT-01 IMPL REVIEW R1 DONE