# Astra review — Offers 3B (6bd0e757) — round 1

Source: .tmp/runs/fanout/review-offers-s3b.log (session 01a09c8b-c51d-7d32-b90a-00c407a96039)


codex
1. **S3B-F1 — P2, blocks: none of the eleven added assertions checks instance identity.** All use `toEqual` on serialized bindings. A read-only probe confirmed that two distinct environments have deeply equal bindings. This misses the distinction enforced by [intent-resolver.ts:552](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/intent-resolver.ts:552): `boundEnvironment !== environment`. Checking the capsule also does not prove that downstream offer consumers received that instance. Add identity-sensitive checks at the migrated consumer calls; changing these capsule assertions to `toBe` would not suffice because capsule decoding reconstructs bindings.

2. **S3B-F2 — P2, blocks: three added runtime checks are disconnected from the paths being tested.**
   - [engine-mcp-golden.test.ts:64](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-golden.test.ts:64) constructs a separate runtime after the actual stdio run at line 45. That runtime never produces the checked transcript.
   - [local-openai-conversation.SIMULATED.test.ts:112](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts:112) adds an isolated constructor test; the existing arena calls at lines 223 and 258 never receive its environment.
   - [ai-dm-board-snapshot.test.ts:60](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-board-snapshot.test.ts:60) adds an isolated MCP runtime check without connecting it to snapshot construction or projection.

   These additions cannot establish migration of the existing paths. Their passing assertions leave environment substitutions on those paths undetected.

3. **S3B-F3 — P2, blocks: the divergence test now mixes bound proposal generation with default re-resolution.** [ai-dm-conversation.test.ts:1575](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-conversation.test.ts:1575) uses the new bound resolver, but line 1578 calls `proposalResolutionDivergence`, whose implementation still uses `pureTurnProposalResolver` at [ai-dm-conversation.ts:3088](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tools/ai-dm-conversation.ts:3088). Previously both sides used that default resolver. The migrated test therefore exercises two different environment paths; its unchanged diagnostic-string assertion does not establish shared instance identity.

The per-file binding audit follows. **Every assertion listed is value-only; an instance-identity assertion is absent in every file.** Line numbers reference `6bd0e757`.

| File | Environment binding → runtime injection | Added assertion |
|---|---|---|
| [dm-encounter-host-live-path](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/integration/vtt/dm-encounter-host-live-path.test.ts:30) | 30; selected 36 → 37 | 38 |
| [ai-dm-arena](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-arena.test.ts:57) | 57; selected 63 → 64; direct offer calls 1309/1314 | 65 |
| [ai-dm-board-delivery](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-board-delivery.test.ts:58) | 58; selected 64 → 65; launcher reconstruction injected at 160/589 | 66 |
| [ai-dm-board-snapshot](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-board-snapshot.test.ts:31) | 31 → isolated runtime 62 | 64 |
| [ai-dm-conversation](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-conversation.test.ts:97) | 97; resolver 98; selected 104 → 105; launcher reconstruction injected at 352 | 106 |
| [ai-dm-knowledge-base](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-knowledge-base.test.ts:50) | 50; selected 56 → 57 | 58 |
| [engine-mcp-boundary](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-boundary.test.ts:24) | 24; selected 31 → 32; explicit transitional instance 25 → 252 | 33, 254 |
| [engine-mcp-golden](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-golden.test.ts:9) | 9 → disconnected runtime 64 | 65 |
| [engine-mcp-handler](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-handler.test.ts:55) | 55; selected 61 → 62 | 63 |
| [local-openai-conversation.SIMULATED](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts:52) | 52 → isolated runtime 114 | 116 |

All **20 removed lines** are accounted for below. These are parent-revision line numbers; none deletes or weakens an expectation.

| File | Removed lines and disposition |
|---|---|
| dm-encounter-host-live-path | 18: runtime import aliased — **1** |
| ai-dm-arena | 21: import aliased; 1296: `undefined` replaced by environment; 1301: resolver receives environment — **3** |
| ai-dm-board-delivery | 16: environment import expanded; 19: runtime import aliased — **2** |
| ai-dm-board-snapshot | 14: entrypoint import expanded — **1** |
| ai-dm-conversation | 39/41/67: imports reorganized; 1543: enumeration receives environment; 1550: bound resolver substituted; 1963: opportunity report receives environment; 1967: environment-aware partition wrapper substituted — **7** |
| ai-dm-knowledge-base | 21: runtime import aliased — **1** |
| engine-mcp-boundary | 7/15: imports reorganized; 234: default runtime call replaced by explicit transitional environment — **3** |
| engine-mcp-golden | 4: entrypoint import expanded — **1** |
| engine-mcp-handler | 26: entrypoint import expanded/aliased — **1** |
| local-openai-conversation.SIMULATED | No removed lines — **0** |

Other checks passed:

- Re-derived the inventory using the supplied script’s AST logic. Node’s nested `rg` invocation encountered `EPERM`; supplying independently executed `rg` output in memory allowed the unchanged graph/sorting logic to run. The first ten paths exactly match the diff, and the reproduced SHA-256 is `3a5dd63fb88078aef855e6e6e13bd8479b0aeab2f6edf74965fc7f275b6053ba`.
- Exactly ten test files, **176 insertions / 20 deletions**. `git diff a9a02984 6bd0e757 -- src` is empty; production defaults and parallel surfaces are untouched.
- Frozen contract matches `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`. D545’s register in `tests/unit/combat/creature-space.test.ts` is untouched.
- Diff whitespace check passes; working tree remains clean. No edits, other agents, or full-suite run. The supplied supervisor verification does not resolve these coverage defects.

**REJECT 3B**
tokens used
75,539
1. **S3B-F1 — P2, blocks: none of the eleven added assertions checks instance identity.** All use `toEqual` on serialized bindings. A read-only probe confirmed that two distinct environments have deeply equal bindings. This misses the distinction enforced by [intent-resolver.ts:552](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/intent-resolver.ts:552): `boundEnvironment !== environment`. Checking the capsule also does not prove that downstream offer consumers received that instance. Add identity-sensitive checks at the migrated consumer calls; changing these capsule assertions to `toBe` would not suffice because capsule decoding reconstructs bindings.

2. **S3B-F2 — P2, blocks: three added runtime checks are disconnected from the paths being tested.**
   - [engine-mcp-golden.test.ts:64](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-golden.test.ts:64) constructs a separate runtime after the actual stdio run at line 45. That runtime never produces the checked transcript.
   - [local-openai-conversation.SIMULATED.test.ts:112](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts:112) adds an isolated constructor test; the existing arena calls at lines 223 and 258 never receive its environment.
   - [ai-dm-board-snapshot.test.ts:60](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-board-snapshot.test.ts:60) adds an isolated MCP runtime check without connecting it to snapshot construction or projection.

   These additions cannot establish migration of the existing paths. Their passing assertions leave environment substitutions on those paths undetected.

3. **S3B-F3 — P2, blocks: the divergence test now mixes bound proposal generation with default re-resolution.** [ai-dm-conversation.test.ts:1575](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-conversation.test.ts:1575) uses the new bound resolver, but line 1578 calls `proposalResolutionDivergence`, whose implementation still uses `pureTurnProposalResolver` at [ai-dm-conversation.ts:3088](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tools/ai-dm-conversation.ts:3088). Previously both sides used that default resolver. The migrated test therefore exercises two different environment paths; its unchanged diagnostic-string assertion does not establish shared instance identity.

The per-file binding audit follows. **Every assertion listed is value-only; an instance-identity assertion is absent in every file.** Line numbers reference `6bd0e757`.

| File | Environment binding → runtime injection | Added assertion |
|---|---|---|
| [dm-encounter-host-live-path](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/integration/vtt/dm-encounter-host-live-path.test.ts:30) | 30; selected 36 → 37 | 38 |
| [ai-dm-arena](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-arena.test.ts:57) | 57; selected 63 → 64; direct offer calls 1309/1314 | 65 |
| [ai-dm-board-delivery](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-board-delivery.test.ts:58) | 58; selected 64 → 65; launcher reconstruction injected at 160/589 | 66 |
| [ai-dm-board-snapshot](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-board-snapshot.test.ts:31) | 31 → isolated runtime 62 | 64 |
| [ai-dm-conversation](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-conversation.test.ts:97) | 97; resolver 98; selected 104 → 105; launcher reconstruction injected at 352 | 106 |
| [ai-dm-knowledge-base](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-knowledge-base.test.ts:50) | 50; selected 56 → 57 | 58 |
| [engine-mcp-boundary](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-boundary.test.ts:24) | 24; selected 31 → 32; explicit transitional instance 25 → 252 | 33, 254 |
| [engine-mcp-golden](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-golden.test.ts:9) | 9 → disconnected runtime 64 | 65 |
| [engine-mcp-handler](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-handler.test.ts:55) | 55; selected 61 → 62 | 63 |
| [local-openai-conversation.SIMULATED](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts:52) | 52 → isolated runtime 114 | 116 |

All **20 removed lines** are accounted for below. These are parent-revision line numbers; none deletes or weakens an expectation.

| File | Removed lines and disposition |
|---|---|
| dm-encounter-host-live-path | 18: runtime import aliased — **1** |
| ai-dm-arena | 21: import aliased; 1296: `undefined` replaced by environment; 1301: resolver receives environment — **3** |
| ai-dm-board-delivery | 16: environment import expanded; 19: runtime import aliased — **2** |
| ai-dm-board-snapshot | 14: entrypoint import expanded — **1** |
| ai-dm-conversation | 39/41/67: imports reorganized; 1543: enumeration receives environment; 1550: bound resolver substituted; 1963: opportunity report receives environment; 1967: environment-aware partition wrapper substituted — **7** |
| ai-dm-knowledge-base | 21: runtime import aliased — **1** |
| engine-mcp-boundary | 7/15: imports reorganized; 234: default runtime call replaced by explicit transitional environment — **3** |
| engine-mcp-golden | 4: entrypoint import expanded — **1** |
| engine-mcp-handler | 26: entrypoint import expanded/aliased — **1** |
| local-openai-conversation.SIMULATED | No removed lines — **0** |

Other checks passed:

- Re-derived the inventory using the supplied script’s AST logic. Node’s nested `rg` invocation encountered `EPERM`; supplying independently executed `rg` output in memory allowed the unchanged graph/sorting logic to run. The first ten paths exactly match the diff, and the reproduced SHA-256 is `3a5dd63fb88078aef855e6e6e13bd8479b0aeab2f6edf74965fc7f275b6053ba`.
- Exactly ten test files, **176 insertions / 20 deletions**. `git diff a9a02984 6bd0e757 -- src` is empty; production defaults and parallel surfaces are untouched.
- Frozen contract matches `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`. D545’s register in `tests/unit/combat/creature-space.test.ts` is untouched.
- Diff whitespace check passes; working tree remains clean. No edits, other agents, or full-suite run. The supplied supervisor verification does not resolve these coverage defects.

**REJECT 3B**
