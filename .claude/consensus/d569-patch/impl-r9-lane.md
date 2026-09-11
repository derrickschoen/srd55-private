Implemented the F34 residual exactly.

- Added an unconditional deadline check immediately after the shared correction/direct-escalation/resumed-correction retrieval block in [turn-exhaustion-coordinator.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/turn-exhaustion-coordinator.ts:429).
- Null and structurally invalid retrieved proposals now return `refused/round_deadline_expired` before validation or persistence.
- Added both requested regressions in [turn-exhaustion-coordinator.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/vtt/turn-exhaustion-coordinator.test.ts:455).

No existing `expect` changed. Six assertion lines were added, executed for both cases:

- Typed deadline refusal.
- Zero authorization calls.
- Zero deterministic resolutions.
- Exactly one correction dispatch.
- `proposal_correction_requested` present.
- `proposal_correction_failed` absent.

Verification:

```text
npm run typecheck:fast
exit 0
```

```text
sg scan
exit 0
```

```text
git diff --check
exit 0
```

```text
npx vitest run --configLoader runner tests/unit/vtt/turn-exhaustion-coordinator.test.ts tests/unit/vtt/adjustment-exhaustion-coordinator.test.ts
exit 0
Test Files  2 passed (2)
Tests       22 passed (22)
Duration    4.78s
```

```text
npx vitest run --configLoader runner tests/unit/tools/ai-dm-conversation.test.ts
exit 0
Test Files  1 passed (1)
Tests       107 passed (107)
Duration    600.63s
```

Frozen contract SHA-256 remains:

```text
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1
```

Final diff: 2 files, 61 insertions; no unrelated changes.

D569 R9 DONE
diff --git a/src/vtt/turn-exhaustion-coordinator.ts b/src/vtt/turn-exhaustion-coordinator.ts
index 59141db64d3bdb52978287fdca14914639ff9e72..f48101f8cace79338caf06faf63a82fd059882c6
--- a/src/vtt/turn-exhaustion-coordinator.ts
+++ b/src/vtt/turn-exhaustion-coordinator.ts
@@ -426,6 +426,7 @@
       if (!input.deadline.acceptsCompletion()) return roundDeadlineRefusal();
       correctedProposal = input.correction.takeProposal();
     }
+    if (!input.deadline.acceptsCompletion()) return roundDeadlineRefusal();
 
     let proposal = correctedProposal;
     if (proposal === null) {
diff --git a/tests/unit/vtt/turn-exhaustion-coordinator.test.ts b/tests/unit/vtt/turn-exhaustion-coordinator.test.ts
index 391d7d7ddef590aae5be1c5f11d45b63e0154857..808cd9147e4e76916c953bcf63347743a5a93584
--- a/tests/unit/vtt/turn-exhaustion-coordinator.test.ts
+++ b/tests/unit/vtt/turn-exhaustion-coordinator.test.ts
@@ -452,6 +452,66 @@
     expect(f.journal.history().map((entry) => entry.transition.kind)).not.toContain('proposal_correction_failed');
   });
 
+  it.each([
+    ['null', () => null],
+    ['structurally invalid', (f: ReturnType<typeof fixture>) => ({
+      ...proposal(f, 'correction', 'primary'),
+      resolutions: [],
+    })],
+  ] as const)(
+    'attributes expiry after retrieving a %s correction without failure persistence',
+    async (_kind, retrievedProposal) => {
+      const f = fixture();
+      let acceptsCompletion = true;
+      let authorizations = 0;
+      let deterministicResolutions = 0;
+      const adapter = new SIMULATEDAgentSessionAdapter({ startIds: [] });
+      const correction = runtime(f, adapter, [], { value: 0 });
+      const expiringCorrection: TurnExhaustionCorrectionRuntime = {
+        ...correction,
+        takeProposal: () => {
+          const retrieved = retrievedProposal(f);
+          acceptsCompletion = false;
+          return retrieved;
+        },
+      };
+      const expiringDeadline: AgentDispatchDeadline = {
+        signal: new AbortController().signal,
+        dispatch: (invocation) => ({ kind: 'open', timeoutMs: 60_000, invocation }),
+        acceptsCompletion: () => acceptsCompletion,
+      };
+
+      const outcome = await new TurnExhaustionCoordinator(
+        f.journal.turnExhaustionPersistence(),
+      ).coordinate({
+        initial: exhausted(f),
+        correction: expiringCorrection,
+        escalation: null,
+        deadline: expiringDeadline,
+        host: {
+          ...host(),
+          authorize: async () => {
+            authorizations += 1;
+            return 'authorized';
+          },
+          resolveDeterministically: async (actorId) => {
+            deterministicResolutions += 1;
+            return { actorId, expectedRevision: 3, resolutionDigest: 'b'.repeat(64) };
+          },
+        },
+      });
+
+      expect(outcome).toEqual({
+        kind: 'refused', reason: 'round_deadline_expired', attemptConsumed: true,
+      });
+      expect(authorizations).toBe(0);
+      expect(deterministicResolutions).toBe(0);
+      expect(adapter.resumeInvocations).toHaveLength(1);
+      expect(f.journal.history().map((entry) => entry.transition.kind)).toContain('proposal_correction_requested');
+      expect(f.journal.history().map((entry) => entry.transition.kind)).not.toContain('proposal_correction_failed');
+    },
+  );
+
   it('marks deterministic controller output auto-resolved after the correction returns no proposal', async () => {
     const f = fixture();
     const adapter = new SIMULATEDAgentSessionAdapter({ startIds: [] });
