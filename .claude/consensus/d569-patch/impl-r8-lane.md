Implemented F34 in two files only.

### Changes

- [turn-exhaustion-coordinator.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/turn-exhaustion-coordinator.ts:166)
  - Added one typed `roundDeadlineRefusal()` result.
  - Removed synthesized `invalidated`.
  - Deadline expiry now returns `refused/round_deadline_expired`, `attemptConsumed: true`.
  - No deadline path records `proposal_correction_failed` or enters deterministic resolution.

Audited correction deadline gates now covered at lines 374, 393, 412, 426, 443, 465, 481, and 483: before dispatch, after completed correction, direct escalation, resumed correction, before authorization, before escalation, after escalation, and after proposal retrieval.

- [turn-exhaustion-coordinator.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/vtt/turn-exhaustion-coordinator.test.ts:399)
  - Added the requested retrieved-proposal expiry regression.
  - Confirms typed refusal, zero authorization calls, zero deterministic resolutions, one correction dispatch, `proposal_correction_requested` present, and `proposal_correction_failed` absent.

The adjustment coordinator has no `host.authorize` or synthesized `invalidated` path. Its deadline gates only prevent stale proposal adoption and retain its accepted typed adjustment completion behavior, so no change was required.

No existing `expect` was changed. Six assertions were added:

```text
outcome equals refused/round_deadline_expired
authorizations equals 0
deterministicResolutions equals 0
resumeInvocations length equals 1
proposal_correction_requested is present
proposal_correction_failed is absent
```

### Verification

```text
npx vitest run --configLoader runner tests/unit/vtt/turn-exhaustion-coordinator.test.ts tests/unit/vtt/adjustment-exhaustion-coordinator.test.ts
exit 0
Test Files  2 passed (2)
Tests       20 passed (20)
Duration    3.82s
```

```text
npx vitest run --configLoader runner tests/unit/tools/ai-dm-conversation.test.ts
exit 0
Test Files  1 passed (1)
Tests       107 passed (107)
Duration    656.26s
```

```text
npm run typecheck:fast
exit 0

sg scan
exit 0

git diff --check
exit 0

prohibited added-pattern audit
zero matches

frozen contract SHA-256
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1
```

Cumulative command:

```text
npx vitest run --configLoader runner tests/unit/tools/agent-conformance.SIMULATED.test.ts tests/unit/tools/ai-dm-arena.test.ts tests/unit/tools/ai-dm-board-delivery.test.ts tests/unit/tools/ai-dm-conversation.test.ts tests/unit/tools/ai-dm-rerun-packet.test.ts tests/unit/tools/d569-blind-experiment.test.ts tests/unit/tools/d569-v5.test.ts tests/unit/tools/engine-mcp-server.test.ts tests/unit/vtt/adjustment-exhaustion-coordinator.test.ts tests/unit/vtt/agent-adapters.SIMULATED.test.ts tests/unit/vtt/agent-session-lifecycle.test.ts tests/unit/vtt/blind-model-ingress.test.ts tests/unit/vtt/engine-dispatch-evidence.test.ts tests/unit/vtt/turn-context-delivery.test.ts tests/unit/vtt/turn-exhaustion-coordinator.test.ts tests/unit/tools/d569-second-family-manifest.test.ts tests/unit/tools/engine-mcp-boundary.test.ts
```

Result:

```text
exit 1
Test Files  1 failed | 16 passed (17)
Tests       2 failed | 448 passed (450)
Duration    610.47s
```

Both failures were 5-second walls, not assertion failures:

- Allowlisted `bounds one-to-three blind attempts…`: 6,370 ms.
- Non-allowlisted `returns only one lexical minimal hint…`: 5,157 ms.

Permitted serial rerun:

```text
npx vitest run --configLoader runner --no-file-parallelism tests/unit/tools/engine-mcp-server.test.ts -t 'bounds one-to-three blind attempts under one absolute live deadline and never stages a fallback'
exit 0
Tests  1 passed | 13 skipped
Test time  3.97s
```

The second test was not rerun because it is not D544/D606/D613-named or explicitly allowlisted.

BLOCKED: required cumulative has one non-allowlisted 5-second-wall timeout (`returns only one lexical minimal hint…`, 5,157 ms).
diff --git a/src/vtt/turn-exhaustion-coordinator.ts b/src/vtt/turn-exhaustion-coordinator.ts
index a041eba5b071eb52ce95247cc84e5dc599a6c6ac..59141db64d3bdb52978287fdca14914639ff9e72
--- a/src/vtt/turn-exhaustion-coordinator.ts
+++ b/src/vtt/turn-exhaustion-coordinator.ts
@@ -163,6 +163,10 @@
     }
   | { readonly kind: 'infrastructure_failed'; readonly component: 'engine_mcp_startup' };
 
+function roundDeadlineRefusal(): Extract<TurnExhaustionOutcome, { readonly kind: 'refused' }> {
+  return { kind: 'refused', reason: 'round_deadline_expired', attemptConsumed: true };
+}
+
 export type AuthorizationFailurePolicy =
   | { readonly kind: 'correct_with_dm_protocol' }
   | { readonly kind: 'refuse_blind' };
@@ -258,7 +262,7 @@
         throw new RangeError('Initial round proposal actors are malformed.');
       }
       if (input.deadline?.acceptsCompletion() === false) {
-        return { kind: 'refused', reason: 'round_deadline_expired', attemptConsumed: true };
+        return roundDeadlineRefusal();
       }
       const authorization = await input.host.authorize(proposal);
       if (authorization === 'authorized') {
@@ -367,57 +371,59 @@
       const directEscalation = input.escalation?.trigger === 'refusal'
         ? input.escalation
         : null;
-      if (input.deadline.acceptsCompletion()) {
-        if (directEscalation === null) {
-          input.correction.activateCapsule();
-          const prompt = input.correction.invocation.output.kind === 'structured_final'
-            ? input.correction.invocation.prompt
-            : this.renderCorrection(
-                'correct_proposal',
-                input.correction.capsule,
-                input.correction.rules,
-                undefined,
-                input.correction.turnContext,
-              );
-          const correctionTurn = await input.correction.lifecycle.resumeCorrection(
-            { ...input.correction.invocation, prompt },
-            input.deadline,
-          );
-          switch (correctionTurn.exit) {
-            case 'completed':
-              correctionExplicitRefusal = explicitlyRefusedTurn(correctionTurn);
-              if (input.deadline.acceptsCompletion()) correctedProposal = input.correction.takeProposal();
-              break;
-            case 'cancelled':
-              return { kind: 'refused', reason: 'correction_cancelled', attemptConsumed: true };
-            case 'timed_out':
-              return { kind: 'refused', reason: 'correction_timeout', attemptConsumed: true };
-            case 'infrastructure_failed':
-              return { kind: 'infrastructure_failed', component: correctionTurn.component };
-          }
-        } else {
-          directEscalation.activateCapsule('refusal');
-          const prompt = correctionPrompt(directEscalation);
-          const escalationTurn = await directEscalation.lifecycle.startEscalation(
-            { ...directEscalation.invocation, prompt },
-            input.deadline,
-          );
-          switch (escalationTurn.exit) {
-            case 'completed':
-              if (input.deadline.acceptsCompletion()) correctedProposal = directEscalation.takeProposal();
-              break;
-            case 'cancelled':
-              return { kind: 'refused', reason: 'correction_cancelled', attemptConsumed: true };
-            case 'timed_out':
-              return { kind: 'refused', reason: 'correction_timeout', attemptConsumed: true };
-            case 'infrastructure_failed':
-              return { kind: 'infrastructure_failed', component: escalationTurn.component };
-          }
+      if (!input.deadline.acceptsCompletion()) return roundDeadlineRefusal();
+      if (directEscalation === null) {
+        input.correction.activateCapsule();
+        const prompt = input.correction.invocation.output.kind === 'structured_final'
+          ? input.correction.invocation.prompt
+          : this.renderCorrection(
+              'correct_proposal',
+              input.correction.capsule,
+              input.correction.rules,
+              undefined,
+              input.correction.turnContext,
+            );
+        const correctionTurn = await input.correction.lifecycle.resumeCorrection(
+          { ...input.correction.invocation, prompt },
+          input.deadline,
+        );
+        switch (correctionTurn.exit) {
+          case 'completed':
+            correctionExplicitRefusal = explicitlyRefusedTurn(correctionTurn);
+            if (!input.deadline.acceptsCompletion()) return roundDeadlineRefusal();
+            correctedProposal = input.correction.takeProposal();
+            break;
+          case 'cancelled':
+            return { kind: 'refused', reason: 'correction_cancelled', attemptConsumed: true };
+          case 'timed_out':
+            return { kind: 'refused', reason: 'correction_timeout', attemptConsumed: true };
+          case 'infrastructure_failed':
+            return { kind: 'infrastructure_failed', component: correctionTurn.component };
+        }
+      } else {
+        directEscalation.activateCapsule('refusal');
+        const prompt = correctionPrompt(directEscalation);
+        const escalationTurn = await directEscalation.lifecycle.startEscalation(
+          { ...directEscalation.invocation, prompt },
+          input.deadline,
+        );
+        switch (escalationTurn.exit) {
+          case 'completed':
+            if (!input.deadline.acceptsCompletion()) return roundDeadlineRefusal();
+            correctedProposal = directEscalation.takeProposal();
+            break;
+          case 'cancelled':
+            return { kind: 'refused', reason: 'correction_cancelled', attemptConsumed: true };
+          case 'timed_out':
+            return { kind: 'refused', reason: 'correction_timeout', attemptConsumed: true };
+          case 'infrastructure_failed':
+            return { kind: 'infrastructure_failed', component: escalationTurn.component };
         }
       }
     } else if (prior.stage !== 'correction_requested') {
       throw new Error(`Proposal exhaustion chain cannot resume from ${prior.stage}.`);
-    } else if (input.deadline.acceptsCompletion()) {
+    } else {
+      if (!input.deadline.acceptsCompletion()) return roundDeadlineRefusal();
       correctedProposal = input.correction.takeProposal();
     }
 
@@ -434,9 +440,8 @@
       correctionValidationFailed = true;
     }
     else {
-      const authorization = input.deadline.acceptsCompletion()
-        ? await input.host.authorize(proposal)
-        : 'invalidated';
+      if (!input.deadline.acceptsCompletion()) return roundDeadlineRefusal();
+      const authorization = await input.host.authorize(proposal);
       if (authorization === 'authorized') {
         this.persistence.record({
           kind: 'proposal_correction_resolved',
@@ -456,8 +461,8 @@
       : input.escalation?.trigger === 'validation_failures' && correctionValidationFailed
         ? 'validation_failures'
         : null;
-    if (input.escalation !== undefined && input.escalation !== null && correctionEscalationTrigger !== null &&
-      input.deadline.acceptsCompletion()) {
+    if (input.escalation !== undefined && input.escalation !== null && correctionEscalationTrigger !== null) {
+      if (!input.deadline.acceptsCompletion()) return roundDeadlineRefusal();
       input.escalation.activateCapsule(correctionEscalationTrigger);
       const prompt = correctionPrompt(input.escalation);
       const escalationTurn = await input.escalation.lifecycle.startEscalation(
@@ -473,9 +478,11 @@
         case 'infrastructure_failed':
           return { kind: 'infrastructure_failed', component: escalationTurn.component };
       }
-      proposal = input.deadline.acceptsCompletion() ? input.escalation.takeProposal() : null;
+      if (!input.deadline.acceptsCompletion()) return roundDeadlineRefusal();
+      proposal = input.escalation.takeProposal();
+      if (!input.deadline.acceptsCompletion()) return roundDeadlineRefusal();
       if (proposal !== null && proposal.requestId === input.requestId &&
-        exactProposalActors(proposal, actorIds, 'correction') && input.deadline.acceptsCompletion()) {
+        exactProposalActors(proposal, actorIds, 'correction')) {
         const authorization = await input.host.authorize(proposal);
         if (authorization === 'authorized') {
           this.persistence.record({
diff --git a/tests/unit/vtt/turn-exhaustion-coordinator.test.ts b/tests/unit/vtt/turn-exhaustion-coordinator.test.ts
index 03a203b9d1a97d6bfe1858d6273e31f9324a18d5..391d7d7ddef590aae5be1c5f11d45b63e0154857
--- a/tests/unit/vtt/turn-exhaustion-coordinator.test.ts
+++ b/tests/unit/vtt/turn-exhaustion-coordinator.test.ts
@@ -396,6 +396,62 @@
     ]));
   });
 
+  it('attributes expiry after retrieving a correction without authorization or validation-failure persistence', async () => {
+    const f = fixture();
+    const queued: RoundTurnProposalEnvelope[] = [];
+    let acceptsCompletion = true;
+    let authorizations = 0;
+    let deterministicResolutions = 0;
+    const adapter = new SIMULATEDAgentSessionAdapter({
+      startIds: [],
+      onResume: () => { queued.push(proposal(f, 'correction', 'primary')); },
+    });
+    const correction = runtime(f, adapter, queued, { value: 0 });
+    const takeProposal = correction.takeProposal;
+    const expiringCorrection: TurnExhaustionCorrectionRuntime = {
+      ...correction,
+      takeProposal: () => {
+        const retrieved = takeProposal();
+        acceptsCompletion = false;
+        return retrieved;
+      },
+    };
+    const expiringDeadline: AgentDispatchDeadline = {
+      signal: new AbortController().signal,
+      dispatch: (invocation) => ({ kind: 'open', timeoutMs: 60_000, invocation }),
+      acceptsCompletion: () => acceptsCompletion,
+    };
+
+    const outcome = await new TurnExhaustionCoordinator(
+      f.journal.turnExhaustionPersistence(),
+    ).coordinate({
+      initial: exhausted(f),
+      correction: expiringCorrection,
+      escalation: null,
+      deadline: expiringDeadline,
+      host: {
+        ...host(),
+        authorize: async () => {
+          authorizations += 1;
+          return 'authorized';
+        },
+        resolveDeterministically: async (actorId) => {
+          deterministicResolutions += 1;
+          return { actorId, expectedRevision: 3, resolutionDigest: 'b'.repeat(64) };
+        },
+      },
+    });
+
+    expect(outcome).toEqual({
+      kind: 'refused', reason: 'round_deadline_expired', attemptConsumed: true,
+    });
+    expect(authorizations).toBe(0);
+    expect(deterministicResolutions).toBe(0);
+    expect(adapter.resumeInvocations).toHaveLength(1);
+    expect(f.journal.history().map((entry) => entry.transition.kind)).toContain('proposal_correction_requested');
+    expect(f.journal.history().map((entry) => entry.transition.kind)).not.toContain('proposal_correction_failed');
+  });
+
   it('marks deterministic controller output auto-resolved after the correction returns no proposal', async () => {
     const f = fixture();
     const adapter = new SIMULATEDAgentSessionAdapter({ startIds: [] });
