# Exploratory repeatability run — judge gpt-6-astra:high (D624.9)
Same 24 frozen images as block 20260914-qsfog-a-fix-r1-01 (identity manifest bea4f62a…), same probe flags, model gpt-6-astra:high, outside the frozen block/report tooling (which pins gpt-5.6-sol). C1 07:18:34–07:26:35, C2 07:26:35–07:34:19 (America/New_York, 2026-09-15). Ad hoc comparison from the probe's own per-row `score`, `truth` and `normalizedAnswer` (supervisor script, not the paired-report tool):

| judge | score mean C1 / C2 | mean per-state |C1−C2| | identical answers | fog FP C1/C2 | fog FN | obscured FP | obscured FN |
|---|---|---|---|---|---|---|---|
| gpt-5.6-sol:high (block) | 0.184 / 0.180 | 0.233 | 0/24 | 445/219 | 16/13 | 103/115 | 243/215 |
| gpt-6-astra:high (this run) | 0.413 / 0.341 | 0.382 | 7/24 | 70/45 | 5/4 | 38/47 | 207/229 |

Reading: astra is more accurate on average (fewer fog false positives by ~5×, higher score) but LESS repeatable per state: it flips between a perfect 1.0 and near-zero on the same image, driven by whether it reports the obscured cells at all (obscured FN 14→0 or 0→26 on the same state). Sol's noise is spread across states; astra's is bimodal. Neither judge is repeatable enough for the frozen ≥25%-and->2×spread rule from one paired run.
