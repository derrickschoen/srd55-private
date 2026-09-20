# D694-INTEL-01 B4 — astra MEDIUM review r2 (session 01a0be8e-22a0-7212-81fd-d04711a7b868, final message only)

**ACCEPT — 0 P1 / 0 P2 / 0 P3.** Reviewed combined diff `e90c6292..df1d6bc7`. All three R1 findings are closed within D800/D803’s scope.

- **Internal unknown:** [engine-query-port.ts:269](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/engine-query-port.ts:269) defines separate `resolved/facts` and `unknown/refusals` arms. The shared guard requires `"participant.kind === 'whole'"` and `"participant.token !== null"`; all five wrappers enforce it. Absent, indication-only, dead player-side and tokenless targets therefore return unknown. The live witness covers absent/indicated targets and unchanged resolved Wizard results. An independent **in-memory type mutation** allowing the five prohibited fields produced exactly five TS2578 diagnostics at test lines 647/649/651/653/655.

- **Selectors:** [engine-server.ts:3201](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/engine-server.ts:3201) returns a refusal-only unknown object for path. Pair queries **retain an unknown row**, rather than omit it: target resolution at 3260, cover at 3267, visibility at 3273 and reach at 3279 return without concrete facts. Schema acceptance remains B5’s D800 obligation. The wire witnesses at test lines **794 and 876** are genuine `it.todo` entries with assertions preserved; B5’s manifest contains the necessary production/schema/test files to activate them.

- **Threat correctness:** [privacy test:780](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/d694-intel-privacy.test.ts:780) asserts Guard’s exact Wizard row. Fixture coordinates give `max(17,5) × 5 = 85` feet; `distanceBand()` makes that `far`, beyond Wizard’s fixture reach of 5. Room 8 explicitly asserts `"expect(product.threats).toEqual([])"` at 871: Fighter is hidden, Cleric/Wizard are wall-hidden, and retained monsters are allies—consistent with B3’s ledger. These exact assertions reject added allied rows; I did not independently rerun the supervisor’s runtime mutant.

- **Phase correctness:** [privacy test:916](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/d694-intel-privacy.test.ts:916) exercises retained-reference filtering: both cases retain Guard, but the overlap record references omitted Fighter, so the second must return active `resumePhase`. This distinguishes filtering from unconditional cloning. Active remains live. The conclusion witness at **894** is a genuine todo preserving the hand-derived `defeat` expectation, consistent with `encounter.ts:985` and D803.

No regression found in R1-confirmed items. Seven-file scope, frozen-plan SHA and clean working tree confirmed; node TypeScript and diff-check passed.

Independent Vitest execution collected no tests: temporary SSR-directory creation failed with `ENOENT`. Runtime totals remain supervisor-provided evidence. No files were modified.

D694-INTEL-01 B4 REVIEW R2 DONE
