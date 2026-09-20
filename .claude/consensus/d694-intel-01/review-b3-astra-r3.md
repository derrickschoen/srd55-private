# D694-INTEL-01 B3 — astra MEDIUM review r3 (session 01a0be12-14ab-70e0-a4aa-3139aebcfe8f, final message only)

**ACCEPT — 0 P1 / 0 P2 / 0 P3.** Reviewed combined diff `c22a1efe..e90c6292`.

Both R2 findings are closed:

- **Production reachability:** The [runner](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/d694-intel-privacy.test.ts:390) explicitly selects `'--dm-mode', 'blind'`, or supplies both `exhaustInitial` and `failCorrection`. Blind assertions require the context version, selected offered ID, semantic digest, completed ingress audit and persisted answer-key equality. These trace to the [blind branch](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tools/ai-dm-conversation.ts:7389), including its local offered-option copy and catalog digest. Exhaustion assertions require `'engine_default'`, `'engine auto-submitted'`, both invocation phases and non-null matching captures. Those trace through `resolveDeterministically` and its [capture call](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tools/ai-dm-conversation.ts:6202), then `acceptedIntelCapture = exhaustionIntelCapture` at line 6597.

- **Prompt scanning:** [Lines 480–485](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/d694-intel-privacy.test.ts:480) now use raw prompt `text` separately from canonical structured products. The [positive controls](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/d694-intel-privacy.test.ts:872) cover the relevant emitted HP/coordinate formats. I found no additional Fighter HP/position phrasing in the inspected prompt/narration renderers requiring another control. The supervisor’s scanner-removal mutant failed specifically with `expected [] to include 'prompt:position_prose_cell'`.

The recorded production mutants are **semantic kills**, not source-literal failures: the blind test failed on differing `catalogDigest` values, and exhaustion failed on extra Fighter option IDs and a Fighter matrix row. The first blind substitution was correctly reported as masked: authoritative concealment still leaves no perceived living opponent, so `mainUses` selects the same `blind_dodge` branch. Removing concealment exposes relocated Fighter and changes the catalog. Both production mutations were restored; the current conversation SHA matches `44559b5b…`.

The ledger is consistent. The blind setup explicitly kills Cleric/Wizard and every monster except Priest; hidden Fighter contributes nothing. Thus 0 player-side allies, 1 monster-side enemy and one submitted Dodge intent are coherent. Advice/exhaustion instead retain wall-hidden Cleric/Wizard; their local counts remain 0/1.

No regression found in previously confirmed items. The frozen-plan hash matches, scope remains eight files, the tree is clean, and diff-check passes. The supervisor’s failed restore was subsequently corrected, as recorded in D798.1; the scanner entry is present in the committed candidate.

Independent Vitest execution stopped before running tests because the sandbox refused the wrapper’s temporary config write. Supervisor verification records confirm TypeScript 0/0, privacy 23/23 and MCP-handler 131/131. No files were modified.

D694-INTEL-01 B3 REVIEW R3 DONE
