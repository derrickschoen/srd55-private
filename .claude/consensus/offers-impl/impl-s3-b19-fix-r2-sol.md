# OFFERS B19 fix r2 — sol report (fresh session 01a0aaf8-ca9e-7be2-aaa2-61bd9c369d2a, exit 0)

Implemented B19 fixes in the three allowed files:

- Added strict string-only SHA-256 validation in [ai-dm-conversation.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tools/ai-dm-conversation.ts:3230).
- Exported `isPlanAdjustmentProposal` for direct decoder testing.
- Added round and plan-adjustment malformed-digest coverage in [ai-dm-conversation.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-conversation.test.ts:2202).
- Added independent stored environment-digest assertions for staged and corrected adjustments in [engine-mcp-handler.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-handler.test.ts:1763).

Mutation proofs ran in a disposable copy:

- String-coercion mutant:
  - SHA: `4ef64831…` → `da381ea0…` → `4ef64831…`
  - Red: 1 failed, 109 skipped.
  - Restored green: 1 passed, 109 skipped.
- M1 wrong adjustment digest:
  - SHA: `991159cf…` → `e6d4988d…` → `991159cf…`
  - Red: 1 failed, 128 skipped.
  - Restored green: 1 passed, 128 skipped.
- M2 skipped update validation:
  - SHA: `4ef64831…` → `9edac2d3…` → `4ef64831…`
  - Red: 1 failed, 109 skipped.
  - Restored green: 1 passed, 109 skipped.

Focused commands:

```bash
node node_modules/vitest/vitest.mjs run tests/unit/tools/ai-dm-conversation.test.ts --configLoader runner --pool threads --maxWorkers 1 -t 'rejects stored proposal resolutions with missing or non-64-hex environment digests'
node node_modules/vitest/vitest.mjs run tests/unit/tools/ai-dm-conversation.test.ts --configLoader runner --pool threads --maxWorkers 1 -t 'rejects plan adjustment envelopes whose stored updates carry malformed digests'
node node_modules/vitest/vitest.mjs run tests/unit/tools/engine-mcp-handler.test.ts --configLoader runner --pool threads --maxWorkers 1 -t 'binds, budgets, stages, corrects, and explicitly keeps plan adjustments per actor'
```

Required verification:

```bash
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
```

Exit 0.

```bash
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
```

Exit 0.

```bash
git diff --check
```

Exit 0, no output.

```bash
node node_modules/vitest/vitest.mjs run tests/unit/tools/ai-dm-conversation.test.ts tests/unit/tools/engine-mcp-handler.test.ts tests/unit/tools/engine-mcp-server.test.ts tests/unit/tools/local-openai-conversation.SIMULATED.test.ts --configLoader runner --pool threads --maxWorkers 3
```

Result: 4/4 files passed, 258/258 tests passed, exit 0, 742.33 seconds.

Final scope: 3 files changed, 112 insertions, 3 deletions. Frozen contract SHA remains `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`. No `.claude/**`, `docs/**`, or `engine-server.ts` worktree changes.

B19 FIX R2 DONE.
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index e29963c8650e0d65ca3ddc08d6df25ceb6dc796a..28af38ca6674b654aa08032d258df9b1970a1438
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -26,6 +26,7 @@
 import {
   parseConversationArgs,
   proposalResolutionDivergence,
+  isPlanAdjustmentProposal,
   isRoundProposal,
   runConversation,
   structuredFinalDecisionPhase,
@@ -2198,6 +2199,92 @@
       ...envelope,
       resolutions: [{ ...storedResolution, offerEnvironmentDigest: 'A'.repeat(64) }],
     })).toBe(false);
+    const nonStringDigests: readonly unknown[] = [
+      [BOUND_OFFER_ENVIRONMENT.digest],
+      64,
+      null,
+      { digest: BOUND_OFFER_ENVIRONMENT.digest },
+    ];
+    for (const nonStringDigest of nonStringDigests) {
+      expect(isRoundProposal({
+        ...envelope,
+        resolutions: [{ ...storedResolution, offerEnvironmentDigest: nonStringDigest }],
+      })).toBe(false);
+      expect(isRoundProposal({
+        ...envelope,
+        resolutions: [{ ...storedResolution, resolutionDigest: nonStringDigest }],
+      })).toBe(false);
+    }
+  });
+
+  it('rejects plan adjustment envelopes whose stored updates carry malformed digests', () => {
+    const state = freshMonsterPlanningState(generateRoom(3_943_006).encounter.state);
+    const actor = state.combatants.find((combatant) =>
+      combatant.profile.kind === 'monster' && combatant.life !== 'dead');
+    if (actor === undefined) throw new Error('Generated room 3943006 has no living monster.');
+    const option = availableEngineActorOptions(state, actor.profile.id, BOUND_OFFER_ENVIRONMENT)
+      .find((candidate) => candidate.actionSlots.some((slot) => slot.use.kind === 'dodge'));
+    if (option === undefined) throw new Error('Room 3943006 Dodge option is absent.');
+    const proposal = {
+      actorId: actor.profile.id, expectedRevision: state.revision, primaryOptionId: option.optionId,
+      fallbackOptionId: null, reason: 'Exercise stored adjustment decoding.', overrideJustification: null,
+    };
+    const resolution = createPureTurnProposalResolver(BOUND_OFFER_ENVIRONMENT).resolve(state, proposal);
+    if (!resolution.valid) throw new Error('Stored adjustment decoder fixture did not resolve.');
+    const storedResolution = {
+      proposal,
+      option: resolution.option,
+      primaryOption: resolution.primaryOption,
+      fallbackOption: resolution.fallbackOption,
+      mechanics: resolution.mechanics,
+      selectedBranch: resolution.selectedBranch,
+      offerEnvironmentDigest: BOUND_OFFER_ENVIRONMENT.digest,
+      resolutionDigest: resolution.resolutionDigest,
+      summary: resolution.summary,
+    };
+    const envelope = {
+      kind: 'plan_adjustment_turn_proposal',
+      proposalId: 'proposal:adjustment-codec',
+      runId: 'encounter:adjustment-codec',
+      branchId: 'branch:adjustment-codec',
+      requestId: 'request:adjustment-codec',
+      expectedRevision: 1,
+      stateDigest: 'state',
+      stateHandle: 'handle',
+      phase: 'initial',
+      idempotencyKey: 'adjustment-codec-0001',
+      baseline_plan_hash: 'a'.repeat(64),
+      updates: [storedResolution],
+    };
+    const { offerEnvironmentDigest: _missingEnvironmentDigest, ...missingEnvironmentDigest } = storedResolution;
+    const { resolutionDigest: _missingResolutionDigest, ...missingResolutionDigest } = storedResolution;
+    expect(isPlanAdjustmentProposal(envelope)).toBe(true);
+    expect(isPlanAdjustmentProposal({ ...envelope, updates: [missingEnvironmentDigest] })).toBe(false);
+    expect(isPlanAdjustmentProposal({
+      ...envelope,
+      updates: [{ ...storedResolution, offerEnvironmentDigest: 'a'.repeat(63) }],
+    })).toBe(false);
+    expect(isPlanAdjustmentProposal({
+      ...envelope,
+      updates: [{ ...storedResolution, offerEnvironmentDigest: 'A'.repeat(64) }],
+    })).toBe(false);
+    expect(isPlanAdjustmentProposal({
+      ...envelope,
+      updates: [{ ...storedResolution, offerEnvironmentDigest: [BOUND_OFFER_ENVIRONMENT.digest] }],
+    })).toBe(false);
+    expect(isPlanAdjustmentProposal({ ...envelope, updates: [missingResolutionDigest] })).toBe(false);
+    expect(isPlanAdjustmentProposal({
+      ...envelope,
+      updates: [{ ...storedResolution, resolutionDigest: 'a'.repeat(63) }],
+    })).toBe(false);
+    expect(isPlanAdjustmentProposal({
+      ...envelope,
+      updates: [{ ...storedResolution, resolutionDigest: 'A'.repeat(64) }],
+    })).toBe(false);
+    expect(isPlanAdjustmentProposal({
+      ...envelope,
+      updates: [{ ...storedResolution, resolutionDigest: [resolution.resolutionDigest] }],
+    })).toBe(false);
   });
 
   it.each([3_943_004, 3_943_007])(
diff --git a/tests/unit/tools/engine-mcp-handler.test.ts b/tests/unit/tools/engine-mcp-handler.test.ts
index f843e90a22e741ab6e7da7a7e34afeaf782bbcca..87d024b3eaed11ed21517f061942be6a7d5bda87
--- a/tests/unit/tools/engine-mcp-handler.test.ts
+++ b/tests/unit/tools/engine-mcp-handler.test.ts
@@ -1760,6 +1760,15 @@
       kind: 'plan_adjustment_turn_proposal',
       updates: [{ proposal: { actorId: first, fallbackOptionId } }],
     });
+    const storedPartial = runtime.proposals[1];
+    if (storedPartial?.kind !== 'plan_adjustment_turn_proposal') {
+      throw new Error('Staged plan adjustment was not stored.');
+    }
+    expect(storedPartial.updates).not.toHaveLength(0);
+    for (const update of storedPartial.updates) {
+      expect(update.offerEnvironmentDigest).toBe(BOUND_OFFER_ENVIRONMENT.digest);
+      expect(update.offerEnvironmentDigest).not.toBe(update.resolutionDigest);
+    }
 
     const closedResult = structured(toolCall(runtime.handler, 'engine.submit_plan_adjustment', {
       ...base,
@@ -1863,6 +1872,15 @@
       idempotency_key: 'adjustment-correction-0001',
       updates: [dodgeUpdate(correctionRuntime, second)],
     }))).toMatchObject({ status: 'proposed', actor_resolutions: [{ actor_id: second }] });
+    const storedCorrection = correctionRuntime.proposals[0];
+    if (storedCorrection?.kind !== 'plan_adjustment_turn_proposal') {
+      throw new Error('Corrected plan adjustment was not stored.');
+    }
+    expect(storedCorrection.updates).not.toHaveLength(0);
+    for (const update of storedCorrection.updates) {
+      expect(update.offerEnvironmentDigest).toBe(BOUND_OFFER_ENVIRONMENT.digest);
+      expect(update.offerEnvironmentDigest).not.toBe(update.resolutionDigest);
+    }
     const fallbackCorrection = structured(toolCall(correctionRuntime.handler, 'engine.submit_plan_adjustment', {
       state_ref: correctionContext['state_ref'],
       request_id: correctionRuntime.feed.current().request?.requestId,
diff --git a/tools/ai-dm-conversation.ts b/tools/ai-dm-conversation.ts
index 770523169c7d14515548a5ce28ad87daef4b242f..f7dea88f0dd7bcf8aed8456f77067d77f6d4a18f
--- a/tools/ai-dm-conversation.ts
+++ b/tools/ai-dm-conversation.ts
@@ -3227,6 +3227,10 @@
     (input['reactionGuidance'] === null || asRecord(input['reactionGuidance']) !== null);
 }
 
+function isSha256Hex(value: unknown): value is string {
+  return typeof value === 'string' && /^[0-9a-f]{64}$/u.test(value);
+}
+
 function isStoredProposalResolution(value: unknown): value is ProposedTurnResolution {
   const input = asRecord(value);
   if (input === null) return false;
@@ -3240,8 +3244,8 @@
   } catch {
     return false;
   }
-  return /^[0-9a-f]{64}$/u.test(String(input['offerEnvironmentDigest'])) &&
-    /^[0-9a-f]{64}$/u.test(String(input['resolutionDigest'])) &&
+  return isSha256Hex(input['offerEnvironmentDigest']) &&
+    isSha256Hex(input['resolutionDigest']) &&
     (input['selectedBranch'] === 'primary' || input['selectedBranch'] === 'fallback') &&
     typeof input['summary'] === 'string' && asRecord(input['proposal']) !== null &&
     asRecord(input['option']) !== null && asRecord(input['primaryOption']) !== null &&
@@ -3249,7 +3253,7 @@
     asRecord(input['mechanics']) !== null;
 }
 
-function isPlanAdjustmentProposal(value: unknown): value is PlanAdjustmentProposalEnvelope {
+export function isPlanAdjustmentProposal(value: unknown): value is PlanAdjustmentProposalEnvelope {
   const input = asRecord(value);
   return input?.['kind'] === 'plan_adjustment_turn_proposal' &&
     typeof input['proposalId'] === 'string' && typeof input['runId'] === 'string' &&

tokens used
82,289
Implemented B19 fixes in the three allowed files:

- Added strict string-only SHA-256 validation in [ai-dm-conversation.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tools/ai-dm-conversation.ts:3230).
- Exported `isPlanAdjustmentProposal` for direct decoder testing.
- Added round and plan-adjustment malformed-digest coverage in [ai-dm-conversation.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-conversation.test.ts:2202).
- Added independent stored environment-digest assertions for staged and corrected adjustments in [engine-mcp-handler.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-handler.test.ts:1763).

Mutation proofs ran in a disposable copy:

- String-coercion mutant:
  - SHA: `4ef64831…` → `da381ea0…` → `4ef64831…`
  - Red: 1 failed, 109 skipped.
  - Restored green: 1 passed, 109 skipped.
- M1 wrong adjustment digest:
  - SHA: `991159cf…` → `e6d4988d…` → `991159cf…`
  - Red: 1 failed, 128 skipped.
  - Restored green: 1 passed, 128 skipped.
- M2 skipped update validation:
  - SHA: `4ef64831…` → `9edac2d3…` → `4ef64831…`
  - Red: 1 failed, 109 skipped.
  - Restored green: 1 passed, 109 skipped.

Focused commands:

```bash
node node_modules/vitest/vitest.mjs run tests/unit/tools/ai-dm-conversation.test.ts --configLoader runner --pool threads --maxWorkers 1 -t 'rejects stored proposal resolutions with missing or non-64-hex environment digests'
node node_modules/vitest/vitest.mjs run tests/unit/tools/ai-dm-conversation.test.ts --configLoader runner --pool threads --maxWorkers 1 -t 'rejects plan adjustment envelopes whose stored updates carry malformed digests'
node node_modules/vitest/vitest.mjs run tests/unit/tools/engine-mcp-handler.test.ts --configLoader runner --pool threads --maxWorkers 1 -t 'binds, budgets, stages, corrects, and explicitly keeps plan adjustments per actor'
```

Required verification:

```bash
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
```

Exit 0.

```bash
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
```

Exit 0.

```bash
git diff --check
```

Exit 0, no output.

```bash
node node_modules/vitest/vitest.mjs run tests/unit/tools/ai-dm-conversation.test.ts tests/unit/tools/engine-mcp-handler.test.ts tests/unit/tools/engine-mcp-server.test.ts tests/unit/tools/local-openai-conversation.SIMULATED.test.ts --configLoader runner --pool threads --maxWorkers 3
```

Result: 4/4 files passed, 258/258 tests passed, exit 0, 742.33 seconds.

Final scope: 3 files changed, 112 insertions, 3 deletions. Frozen contract SHA remains `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`. No `.claude/**`, `docs/**`, or `engine-server.ts` worktree changes.

B19 FIX R2 DONE.
