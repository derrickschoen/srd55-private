<!-- codex exec -m gpt-6-sol -c model_reasoning_effort=xhigh --sandbox read-only; session 01a0cf61-3e70-75b3-972e-cb4454ed4553; task bta0itv5g -->

## Dispositions

| Round-2 item | Decision | Reason |
|---|---|---|
| F2 / spool parity | AGREE | Each child now has an independently initialized launcher and spool set, and resulting spools are compared. |
| F4 / pins and mutants | AGREE | §5 supplies reversible bytes, provenance and two-checkout equality. X1 adds the cold-query callback trace and named assertion killers. |
| F6 / metric | DISAGREE | X4/X5 are fixed, but X7 is classified as an initial-phase lever even though its documented gain at eight workers is in the retry phase. |
| F6 / void rule | AGREE | Process ancestry distinguishes the gate’s workers from outside processes; three valid pairs are required. |
| Failure census | AGREE | A6/A7 now correctly say 15 runs and include the fifth, non-timeout arena pin failure. |
| Coverage inventory | DISAGREE | The inventory is useful, but the named CONV-SPLIT-01 checker is hard-coded for four conversation files and cannot validate X7’s three-file arena split. |
| A9 scope | AGREE | The audit’s claim is limited to executed paths, with broader proof deferred to a landing unit. |
| A11/A12 | AGREE | Both disproved assumptions are recorded and addressed in the trial and pin procedures. |
| Decision citations | AGREE | Lines 88, 89 and 96 now identify the applicable mutant, restoration and pin rules. |

## New findings

1. **P1 — The permanent X1 differential could become the gate’s new bottleneck.** §6 proposes exhaustive coverage of every token, budget and cell in a permanent test. The planner’s matching differential covered 49 states and 660,604 comparisons; its uncached `findPath` work alone took **481,744 ms** ([engine-hotpath notes:79](/home/vagrant/.claude/plans/groovy-booping-lantern-agent-a162f4751a5781e0c.md:79)). The plan neither prices this added test in acceptance arms nor gives it a fixed-budget layout. **Fix:** keep the exhaustive differential as experiment evidence; put a bounded, mutant-killing selection in the normal gate, and measure its added wall time.

2. **P2 — X7 uses the wrong acceptance metric.** The [arena-split model:212](/home/vagrant/.claude/plans/groovy-booping-lantern-agent-ac69aff128305275c.md:212) predicts no initial-phase gain at eight workers but a roughly 180–200 s saving when an arena retry is split. §7 nevertheless requires X7 to save 60 s initially. **Fix:** preregister X7 against total gate wall when testing that retry benefit, with the stated 30 s initial-phase regression guard. Use initial wall when testing its predicted gain at 12 or more workers.

3. **P2 — The specified checker cannot preserve an arena split.** [preserve.mjs:266](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp/runs/conv-split-01/evidence/preserve.mjs:266) hard-codes conversation declarations and four output files; its CLI requires `A B C D` ([preserve.mjs:361](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp/runs/conv-split-01/evidence/preserve.mjs:361)). X7 proposes three arena files. Running the existing checker on unchanged conversation files would prove nothing about them. **Fix:** adapt or write an arena-specific checker against the pre-split arena source, including test-body and import preservation, before reading X7 timings.

4. **P2 — X3 lacks a standalone startup path.** The bundle is built in Vitest `globalSetup` ([vitest.config.ts:50](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/vitest.config.ts:50)), but `startMcpClient` is also reached by the conversation CLI outside Vitest ([ai-dm-conversation.ts:2516](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tools/ai-dm-conversation.ts:2516), [ai-dm-conversation.ts:7689](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tools/ai-dm-conversation.ts:7689)). A fresh standalone run may have no bundle. **Fix:** specify a validated-bundle lookup with a vite-node fallback or an on-demand build, and test that standalone path.

## Verdict

**REVISE.** The round-2 fixes substantially strengthen the plan, but the exhaustive permanent test needs a gate-cost limit, and X7 and standalone X3 need executable acceptance and startup paths.

[exited with code 0]
