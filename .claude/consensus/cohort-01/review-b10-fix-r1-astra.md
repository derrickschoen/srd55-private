# COHORT-01 B10 fix r1 — astra MEDIUM re-review (session 01a0ba37-c6e6-7023-83f3-4f4776cb3301, candidate be09e575)

**ACCEPT — P1/P2/P3: 0/0/0.**

The prior P2 is closed in `tests/unit/vtt/blind-turn-context.test.ts`:

- Line 579: `expect(BLIND_SEMANTIC_BOARD_MAX_BYTES).toBe(32_768);`
- Line 592: `` `Protected blind semantic-board facts require ${String(requiredBytes)} UTF-8 bytes; maximum is 32768.`, ``

The expected message matches production’s `RangeError` at lines 1305–1306 for cap 32768. The fix contains exactly this addition and message replacement; nothing else changed.

`a0ca3795` plus this fix satisfies the Batch 10 section. Recorded supervisor verification confirms the 32_769 mutant fails, restored focused test passes, and common checks pass. Production SHA matches the recorded restoration. No expensive probes rerun.

COHORT-01 REVIEW B10 FIX R1 DONE
