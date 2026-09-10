Resolved all 41 conflict hunks across the ten authorized files. The merge remains un-staged for the supervisor; no git write commands were used.

### Conflict resolutions

- [adjustment-exhaustion-coordinator.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/adjustment-exhaustion-coordinator.ts:71) — 1 hunk: retained main’s shared dispatch deadline and D569’s exit-before-proposal gate. Timeout/cancellation preserve the baseline; infrastructure clears staged proposals. The coordinator dependency exposes only consumed result fields while `AgentTurnResult` remains strict.

- [agent-session-lifecycle.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/agent-session-lifecycle.ts:121) — 9 hunks: composed main’s deadline dispatch/acceptance checks with D569’s completed-only session binding, unbound cold-start outcomes, partial-result returns, recovery-failure persistence, dispatch identity, escalation, and rollover evidence.

- [engine-round-session.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/engine-round-session.ts:579) — 1 hunk: retained main’s shared session-command transaction and rollback/RNG semantics, with D569 `strictNoFallback` rejection before deterministic fallback.

- [entrypoint.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/mcp/entrypoint.ts:83) — 1 hunk: retained both D569 readiness/ingress instrumentation and main’s strict arena-fixture decoder.

- [turn-exhaustion-coordinator.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/turn-exhaustion-coordinator.ts:231) — 1 hunk: retained main’s shared deadline and D474 escalation semantics while preserving D569 blind refusal attribution and exhaustive completed/cancelled/timed-out/infrastructure transitions before proposal reads. Direct blind exits may omit correction-only deadline/escalation inputs; correction paths still require the deadline.

- [ai-dm-conversation.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/ai-dm-conversation.test.ts:23) — 3 hunks: combined D569 integrity helpers with main deadline/snapshot helpers and completed the serialized adapter’s strict process/catalog/partial evidence.

- [agent-session-lifecycle.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/vtt/agent-session-lifecycle.test.ts:41) — 1 hunk: retained D569 incomplete-exit binding tests and main’s deadline/recovery mutation tests, using real deadline fixtures and complete evidence.

- [ai-dm-arena.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-arena.ts:341) — 2 hunks: combined D569 arm/cell options with main’s round-wall, challenge-basis, instruction-source and KB options; preserved the original room/rep indexing used by selected cells.

- [ai-dm-conversation.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:28) — 16 hunks:
  1. Combined D569 integrity/delivery imports with main deadline imports.
  2. Retained D569’s 240-second explicit-mode process timeout and main’s 180-second round wall.
  3. Kept injected end-to-end timing separate from the restricted policy clock.
  4–6. Combined speculative callbacks, revision-bound dispatch identities, deadline truncation, exit gating, spool-derived evidence, and integrity propagation.
  7. Combined adjustment-correction forensic handling with deadline dispatch.
  8. Preserved unbound cold-start handling under the shared deadline.
  9. Used the active correction/escalation spool for RL evidence.
  10–11. Combined correction deadline handling, actual spool reads, and validation-failure escalation.
  12. Preserved both accepted recalculation-control seams.
  13–14. Combined speculative recalculation dispatch identities and integrity handling with main’s deadline-after-validation rule.
  15. Propagated `D569IntegrityStop` before main exception policy classification.
  16. Preserved injected wall telemetry plus main’s restricted `policyElapsedMs`.
  
  Fresh escalation additionally derives its proposal/context spool from the returned turn’s recovery dispatch, runs D569 integrity classification, and preserves main planner attribution. This fixed all four focused escalation assertions.

- [ai-dm-rerun-packet.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-rerun-packet.ts:335) — 6 hunks: retained D569’s strict v3/hybrid schemas and integrity relations while delegating normalized plan summaries and historical rows to main’s shared row codec. Strict parsing now precedes delegation, including authorized-plan and chosen-index checks; decoder injection remains effective.

### Verification

- `npm run typecheck:fast` — exit 0.
- `sg scan` — exit 0.
- `git diff --check` — exit 0.
- Conflict-marker grep — exit 0, no markers.
- Added-line prohibited-pattern audit — exit 0.
- Frozen contract SHA-256: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.
- No expectation pins regenerated; runbook unchanged.

Contract runs:

- Conflict/shared-codec group:
  `npx vitest run --configLoader runner --no-file-parallelism <7 specs>`
  — exit 0, 7 files, 98/98 tests passed.

- Trial-core group:
  `npx vitest run --configLoader runner --no-file-parallelism <7 specs>`
  — 6 files passed; 202/203 tests passed. One 5-second load timeout in `room-generator-los-cover`.
  Serial rerun: 1 file, 111/111 passed, exit 0.

- Focused escalation correction:
  `npx vitest run --configLoader runner --no-file-parallelism tests/unit/tools/ai-dm-conversation.test.ts -t 'speculation uses arm base until trigger|actual refusal is the only single-attempt D474 trigger|routes a .* correction using actual dispatch bookkeeping'`
  — exit 0, 4/4 selected tests passed.

- D569 v5:
  `npx vitest run --configLoader runner tests/unit/tools/d569-v5.test.ts`
  — 20/26 passed with six 5-second load timeouts.
  Serial rerun with `--no-file-parallelism` — exit 0, 26/26 passed.

- Full 17-file D569 cumulative:
  `npx vitest run --configLoader runner <17 D569 specs>`
  — 16/17 files passed, 441/442 tests passed. Sole failure was the known 5-second load wall in `engine-mcp-server` at 6.741 seconds.
  Serial rerun:
  `npx vitest run --configLoader runner --no-file-parallelism tests/unit/tools/engine-mcp-server.test.ts`
  — exit 0, 14/14 passed.

- Final coordinator check:
  `npx vitest run --configLoader runner tests/unit/vtt/turn-exhaustion-coordinator.test.ts`
  — exit 0, 11/11 passed.

D569 RECONCILE DONE
diff --git a/src/vtt/adjustment-exhaustion-coordinator.ts b/src/vtt/adjustment-exhaustion-coordinator.ts
index 1c818798ad67ff6d7ff6f1e43ae559ad258ff6c8..b296fb6e0cca3dd4fad785b6c4a7dca28e0b815f
--- a/src/vtt/adjustment-exhaustion-coordinator.ts
+++ b/src/vtt/adjustment-exhaustion-coordinator.ts
@@ -1,6 +1,6 @@
 import type { CombatantId } from '../combat/values';
-import type { AgentInvocation } from './agent-session';
-import type { AgentDispatchDeadline, AgentSessionLifecycle } from './agent-session-lifecycle';
+import type { AgentInvocation, AgentTurnResult } from './agent-session';
+import type { AgentDispatchDeadline } from './agent-session-lifecycle';
 import type {
   PlanAdjustmentProposalEnvelope,
   ProposedTurnResolution,
@@ -67,7 +67,12 @@
   readonly capsule: EngineStateCapsule;
   readonly rules: AllowlistedRulesSource;
   readonly turnContext: unknown;
-  readonly lifecycle: Pick<AgentSessionLifecycle, 'resumeCorrection'>;
+  readonly lifecycle: {
+    resumeCorrection(
+      invocation: AgentInvocation,
+      deadline: AgentDispatchDeadline,
+    ): Promise<{ readonly exit: AgentTurnResult['exit'] }>;
+  };
   readonly invocation: AgentInvocation;
   activateCapsule(): void;
   takeProposal(): PlanAdjustmentProposalEnvelope | null;
@@ -140,8 +145,17 @@
   async coordinate(input: {
     readonly initial: InitialAdjustmentAttempt;
     readonly correction: AdjustmentCorrectionRuntime | null;
-    readonly deadline: AgentDispatchDeadline;
+    readonly deadline?: AgentDispatchDeadline;
   }): Promise<AdjustmentCompletion> {
+    const deadline = input.deadline ?? {
+      signal: new AbortController().signal,
+      dispatch: (invocation: AgentInvocation) => ({
+        kind: 'open' as const,
+        timeoutMs: invocation.timeoutMs ?? Number.MAX_SAFE_INTEGER,
+        invocation,
+      }),
+      acceptsCompletion: () => true,
+    };
     const openActors = exactActors(input.initial.openActorIds, 'Open adjustment');
     const refusedActors = exactActors(input.initial.refusedActorIds, 'Refused adjustment', true);
     const adjustmentBudget = Math.min(openActors.length, 2);
@@ -151,7 +165,7 @@
     if (!/^[0-9a-f]{64}$/u.test(input.initial.baselinePlanHash)) {
       throw new TypeError('Adjustment baseline plan hash must be canonical.');
     }
-    const stagedProposal = input.deadline.acceptsCompletion()
+    const stagedProposal = deadline.acceptsCompletion()
       ? input.initial.stagedProposal
       : null;
     const staged = stagedProposal?.updates ?? [];
@@ -174,7 +188,7 @@
     if (refusedActors.length === 0) {
       const outcome = completion({
         initial: input.initial,
-        staged: input.deadline.acceptsCompletion() ? staged : [],
+        staged: deadline.acceptsCompletion() ? staged : [],
         corrected: [],
         correctionResult: 'not_required',
       });
@@ -184,7 +198,7 @@
     if (input.correction === null) {
       const outcome = completion({
         initial: input.initial,
-        staged: input.deadline.acceptsCompletion() ? staged : [],
+        staged: deadline.acceptsCompletion() ? staged : [],
         corrected: [],
         correctionResult: 'no_response',
       });
@@ -229,40 +243,33 @@
             undefined,
             input.correction.turnContext,
           );
-<<<<<<< HEAD
-      const correctionTurn = await input.correction.lifecycle.resumeCorrection({
-        ...input.correction.invocation,
-        prompt,
-      }, input.correction.signal);
-      if (correctionTurn.exit !== 'completed') {
+      if (!deadline.acceptsCompletion()) {
         const outcome = completion({
           initial: input.initial,
-          staged: correctionTurn.exit === 'infrastructure_failed' ? [] : staged,
+          staged: [],
           corrected: [],
-          correctionResult: correctionTurn.exit,
+          correctionResult: 'no_response',
         });
         this.persistence.record({ kind: 'adjustment_completed', requestId: outcome.requestId, outcome });
         return outcome;
       }
-=======
-      if (!input.deadline.acceptsCompletion()) {
+      const correctionTurn = await input.correction.lifecycle.resumeCorrection({
+        ...input.correction.invocation,
+        prompt,
+      }, deadline);
+      if (correctionTurn.exit !== 'completed') {
         const outcome = completion({
           initial: input.initial,
-          staged: [],
+          staged: correctionTurn.exit === 'infrastructure_failed' ? [] : staged,
           corrected: [],
-          correctionResult: 'no_response',
+          correctionResult: correctionTurn.exit,
         });
         this.persistence.record({ kind: 'adjustment_completed', requestId: outcome.requestId, outcome });
         return outcome;
       }
-      await input.correction.lifecycle.resumeCorrection({
-        ...input.correction.invocation,
-        prompt,
-      }, input.deadline);
->>>>>>> main
     }
 
-    const proposal = input.deadline.acceptsCompletion()
+    const proposal = deadline.acceptsCompletion()
       ? input.correction.takeProposal()
       : null;
     const accepted = proposal !== null && staged.length + proposal.updates.length <= adjustmentBudget && exactProposal(proposal, {
@@ -271,7 +278,7 @@
       phase: 'correction',
       allowedActorIds: refusedActors,
     });
-    const completedInTime = input.deadline.acceptsCompletion();
+    const completedInTime = deadline.acceptsCompletion();
     const outcome = completion({
       initial: input.initial,
       staged: completedInTime ? staged : [],
diff --git a/src/vtt/agent-session-lifecycle.ts b/src/vtt/agent-session-lifecycle.ts
index 53373064e73874e51713fa02a3c12341914a7369..f3db9fb0189271380ab07747ba88244671faf624
--- a/src/vtt/agent-session-lifecycle.ts
+++ b/src/vtt/agent-session-lifecycle.ts
@@ -118,15 +118,10 @@
     }
   }
 
-<<<<<<< HEAD
-  async coldStart(invocation: AgentInvocation, signal: AbortSignal): Promise<AgentColdStartOutcome> {
-    const result = await this.#coldStart(invocation, signal);
+  async coldStart(invocation: AgentInvocation, deadline: AgentDispatchDeadline): Promise<AgentColdStartOutcome> {
+    const result = await this.#coldStart(invocation, deadline);
     if (result.exit !== 'completed') return { kind: 'unbound', turn: result };
-=======
-  async coldStart(invocation: AgentInvocation, deadline: AgentDispatchDeadline): Promise<AgentSessionBinding> {
-    const result = await this.#coldStart(invocation, deadline);
     requireAcceptedCompletion(deadline);
->>>>>>> main
     const binding = this.journal.startAgentSession({
       cli: this.adapter.kind,
       sessionId: result.resumeSessionId,
@@ -137,17 +132,11 @@
     return { kind: 'bound', binding: this.journal.agentSession() ?? binding, turn: result };
   }
 
-<<<<<<< HEAD
-  async coldStartRound(invocation: AgentInvocation, signal: AbortSignal): Promise<AgentColdStartOutcome> {
-    const result = await this.#coldStart(invocation, signal);
+  async coldStartRound(invocation: AgentInvocation, deadline: AgentDispatchDeadline): Promise<AgentColdStartOutcome> {
+    const result = await this.#coldStart(invocation, deadline);
     if (result.exit !== 'completed') return { kind: 'unbound', turn: result };
+    requireAcceptedCompletion(deadline);
     const binding = this.journal.startAgentSession({
-=======
-  async coldStartRound(invocation: AgentInvocation, deadline: AgentDispatchDeadline): Promise<AgentTurnResult> {
-    const result = await this.#coldStart(invocation, deadline);
-    requireAcceptedCompletion(deadline);
-    this.journal.startAgentSession({
->>>>>>> main
       cli: this.adapter.kind,
       sessionId: result.resumeSessionId,
       adapterVersion: this.adapterVersion,
@@ -169,23 +158,13 @@
       this.rolloverPolicy.kind === 'unmeasured') {
       throw new UnmeasuredContextRolloverPolicyError();
     }
-<<<<<<< HEAD
-    return this.adapter.start({
-      ...invocation,
-      bootstrap: invocation.bootstrap ?? { kind: 'cold_start' },
-    }, signal);
-=======
     const dispatch = openDispatch(deadline, {
       ...invocation,
       bootstrap: invocation.bootstrap ?? { kind: 'cold_start' },
     });
-    const result = requireCompleted(
-      await this.adapter.start(dispatch.invocation, deadline.signal),
-      'Agent cold start',
-    );
-    requireAcceptedCompletion(deadline);
+    const result = await this.adapter.start(dispatch.invocation, deadline.signal);
+    if (result.exit === 'completed') requireAcceptedCompletion(deadline);
     return result;
->>>>>>> main
   }
 
   resumeRound(invocation: AgentInvocation, deadline: AgentDispatchDeadline): Promise<AgentTurnResult> {
@@ -228,13 +207,9 @@
         dispatched,
         'Agent resume',
       );
-<<<<<<< HEAD
       if (result.exit !== 'completed') return result;
-      this.#recordUsage(result, invocation);
-=======
       requireAcceptedCompletion(deadline);
       this.#recordUsage(result, dispatch.invocation);
->>>>>>> main
       return result;
     } catch (error) {
       const classification = this.adapter.classifyFailure(error);
@@ -257,8 +232,8 @@
         bootstrap: typedBootstrap,
         launcherToken: requireFullContextLauncher(invocation, 'resume recovery'),
       };
-<<<<<<< HEAD
-      const bootstrapResult = await this.adapter.start(recoveryInvocation, signal);
+      const recoveryDispatch = openDispatch(deadline, recoveryInvocation);
+      const bootstrapResult = await this.adapter.start(recoveryDispatch.invocation, deadline.signal);
       if (bootstrapResult.exit !== 'completed') {
         if (invocation.recoveryEngineDispatchId === undefined) {
           throw new Error('Failed recovery dispatch omitted its engine dispatch identity.');
@@ -270,14 +245,7 @@
         });
         return bootstrapResult;
       }
-=======
-      const recoveryDispatch = openDispatch(deadline, recoveryInvocation);
-      const bootstrapResult = requireCompleted(
-        await this.adapter.start(recoveryDispatch.invocation, deadline.signal),
-        'Agent recovery cold start',
-      );
       requireAcceptedCompletion(deadline);
->>>>>>> main
       if (bootstrapResult.resumeSessionId === dispatched.sessionId) {
         throw new Error('Agent recovery cold start did not create a successor session.');
       }
@@ -309,26 +277,15 @@
       digest,
       stateDelivery: 'full_engine_context',
     };
-<<<<<<< HEAD
-    return this.adapter.start({
-=======
     const dispatch = openDispatch(deadline, {
->>>>>>> main
       ...invocation,
       instructions: freshSessionInstructions(freshContext, bootstrap, invocation.instructions),
       bootstrap,
       launcherToken: requireFullContextLauncher(invocation, 'escalation'),
-<<<<<<< HEAD
-    }, signal);
-=======
     });
-    const result = requireCompleted(
-      await this.adapter.start(dispatch.invocation, deadline.signal),
-      'Agent escalation cold start',
-    );
-    requireAcceptedCompletion(deadline);
+    const result = await this.adapter.start(dispatch.invocation, deadline.signal);
+    if (result.exit === 'completed') requireAcceptedCompletion(deadline);
     return result;
->>>>>>> main
   }
 
   async #rollOver(
@@ -348,26 +305,15 @@
       digest,
       stateDelivery: 'full_engine_context',
     };
-<<<<<<< HEAD
-    const result = await this.adapter.start({
-=======
     const dispatch = openDispatch(deadline, {
->>>>>>> main
       ...invocation,
       instructions: freshSessionInstructions(freshContext, bootstrap),
       bootstrap,
       launcherToken: requireFullContextLauncher(invocation, 'context rollover'),
-<<<<<<< HEAD
-    }, signal);
+    });
+    const result = await this.adapter.start(dispatch.invocation, deadline.signal);
     if (result.exit !== 'completed') return result;
-=======
-    });
-    const result = requireCompleted(
-      await this.adapter.start(dispatch.invocation, deadline.signal),
-      'Agent context rollover cold start',
-    );
     requireAcceptedCompletion(deadline);
->>>>>>> main
     if (result.resumeSessionId === persisted.sessionId) {
       throw new Error('Agent context rollover did not create a successor session.');
     }
diff --git a/src/vtt/engine-round-session.ts b/src/vtt/engine-round-session.ts
index 6038283c26fd5bc94d6dedc783b9a8fc82072e3e..d22bf051387d0e7d750b388e8a46fe192268131e
--- a/src/vtt/engine-round-session.ts
+++ b/src/vtt/engine-round-session.ts
@@ -544,67 +544,6 @@
     entries: readonly EngineTurnApplication[],
     guidance: ReactionGuidanceDeclaration | null,
   ): AppliedEngineMechanics {
-<<<<<<< HEAD
-    return this.#applyResolvedMechanics(
-      entries,
-      guidance,
-      entries.some((entry) => entry.strictNoFallback === true),
-    );
-  }
-
-  #applyResolvedMechanics(
-    entries: readonly EngineTurnApplication[],
-    guidance: ReactionGuidanceDeclaration | null,
-    rejectUnavailablePrimary: boolean,
-  ): AppliedEngineMechanics {
-    const beforeRevision = this.#state.revision;
-    const trialRng = restoreMulberry32(this.#rng.snapshot());
-    const fallbackResolutions: AutoResolvedReactionOffer[] = [];
-    const guidedResolutions: GuidedReactionResolution[] = [];
-    const deviationResolutions: EngineProposalDeviation[] = [];
-    const reduce = (state: EncounterState, command: EncounterCommand): EncounterState => {
-      const reduced = reduceOne(state, command, trialRng);
-      const resolved = resolveBoundaryDecisions(reduced, trialRng, this.policy, guidance, true);
-      fallbackResolutions.push(...resolved.fallbackResolutions);
-      guidedResolutions.push(...resolved.guidedResolutions);
-      return resolved.state;
-    };
-    let state = this.#state;
-    for (const application of entries) {
-      const entry = application;
-      state = advanceToActor(state, entry.proposal.actorId, reduce);
-      const primary = resolveEngineActorOption(state, entry.primaryOption);
-      const fallback = primary.valid || entry.fallbackOption === null
-        ? null
-        : resolveEngineActorOption(state, entry.fallbackOption);
-      let mechanics: ResolvedTurnMechanics;
-      let appliedBranch: EngineAppliedProposalBranch;
-      let refusalCodes: string[];
-      if (primary.valid) {
-        mechanics = mechanicsWithChoice(primary.mechanics, entry.proposal.activationChoice, entry.primaryOption);
-        appliedBranch = 'primary';
-        refusalCodes = [];
-      } else if (fallback?.valid === true) {
-        if (entry.fallbackOption === null) throw new Error('Resolved fallback option is absent.');
-        mechanics = mechanicsWithChoice(fallback.mechanics, entry.proposal.activationChoice, entry.fallbackOption);
-        appliedBranch = 'fallback';
-        refusalCodes = [primary.code];
-      } else {
-        if (rejectUnavailablePrimary) {
-          throw new Error(
-            `Blind proposal became unavailable for ${entry.proposal.actorId}: ${primary.code}.`,
-          );
-        }
-        const dodgeOption = availableEngineActorOptions(state, entry.proposal.actorId).find((option) =>
-          option.actionSlots.some((slot) => slot.slot === 'main' && slot.use.kind === 'dodge')) ?? null;
-        if (dodgeOption === null) throw new Error(`Could not apply deterministic Dodge for ${entry.proposal.actorId}.`);
-        const dodge = resolveEngineActorOption(state, dodgeOption);
-        if (!dodge.valid) throw new Error(`Could not apply deterministic Dodge for ${entry.proposal.actorId}.`);
-        mechanics = dodge.mechanics;
-        appliedBranch = 'dodge';
-        refusalCodes = [primary.code, ...(fallback !== null && !fallback.valid ? [fallback.code] : [])];
-      }
-=======
     const outcome = runSessionCommandTransaction({
       state: this.#state,
       random: { fork: () => restoreMulberry32(this.#rng.snapshot()) },
@@ -637,6 +576,11 @@
           appliedBranch = 'fallback';
           refusalCodes = [primary.code];
         } else {
+          if (entry.strictNoFallback === true) {
+            throw new Error(
+              `Blind proposal became unavailable for ${entry.proposal.actorId}: ${primary.code}.`,
+            );
+          }
           const dodgeOption = availableEngineActorOptions(state, entry.proposal.actorId).find((option) =>
             option.actionSlots.some((slot) => slot.slot === 'main' && slot.use.kind === 'dodge')) ?? null;
           if (dodgeOption === null) throw new Error(`Could not apply deterministic Dodge for ${entry.proposal.actorId}.`);
@@ -646,7 +590,6 @@
           appliedBranch = 'dodge';
           refusalCodes = [primary.code, ...(fallback !== null && !fallback.valid ? [fallback.code] : [])];
         }
->>>>>>> main
 
         const reasonCodes: EngineProposalDeviation['reasonCodes'][number][] = [];
         if (appliedBranch === 'dodge') {
diff --git a/src/vtt/mcp/entrypoint.ts b/src/vtt/mcp/entrypoint.ts
index d292c22f03002e9b03a553696650147111dea392..5a376b9deb8a7b43f04442eb277750acf6ec1a16
--- a/src/vtt/mcp/entrypoint.ts
+++ b/src/vtt/mcp/entrypoint.ts
@@ -62,7 +62,6 @@
   type KbReadRecord,
   type KbSubjectSources,
 } from './knowledge-base';
-<<<<<<< HEAD
 import type {
   BlindMaxAttempts,
   BlindRepairArm,
@@ -81,9 +80,7 @@
   type BlindIngressChannel,
   type BlindIngressRecord,
 } from '../blind-model-ingress';
-=======
 import { decodeEngineFixtureV1 } from '../arena-fixture';
->>>>>>> main
 
 function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
   if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
diff --git a/src/vtt/turn-exhaustion-coordinator.ts b/src/vtt/turn-exhaustion-coordinator.ts
index c380bce3b711642c3345e7cf719378c8af159b42..2f64ca86e7e6929082ea6e03228a494f720eeae6
--- a/src/vtt/turn-exhaustion-coordinator.ts
+++ b/src/vtt/turn-exhaustion-coordinator.ts
@@ -1,6 +1,6 @@
 import type { CombatantId } from '../combat/values';
-import type { AgentInvocation, AgentTurnResult } from './agent-session';
-import type { AgentDispatchDeadline, AgentSessionLifecycle } from './agent-session-lifecycle';
+import type { AgentInvocation } from './agent-session';
+import type { AgentDispatchDeadline } from './agent-session-lifecycle';
 import type { RoundTurnProposalEnvelope } from './engine-envelopes';
 import type { EngineStateCapsule } from './engine-state-capsule';
 import {
@@ -79,7 +79,12 @@
   readonly capsule: EngineStateCapsule;
   readonly rules: AllowlistedRulesSource;
   readonly turnContext: unknown;
-  readonly lifecycle: Pick<AgentSessionLifecycle, 'resumeCorrection'>;
+  readonly lifecycle: {
+    resumeCorrection(
+      invocation: AgentInvocation,
+      deadline: AgentDispatchDeadline,
+    ): Promise<CorrectionTurnObservation>;
+  };
   readonly invocation: AgentInvocation;
   /** Makes the correction capsule authoritative before the resume is dispatched. */
   activateCapsule(): void;
@@ -97,7 +102,12 @@
   readonly capsule: EngineStateCapsule;
   readonly rules: AllowlistedRulesSource;
   readonly turnContext: unknown;
-  readonly lifecycle: Pick<AgentSessionLifecycle, 'startEscalation'>;
+  readonly lifecycle: {
+    startEscalation(
+      invocation: AgentInvocation,
+      deadline: AgentDispatchDeadline,
+    ): Promise<CorrectionTurnObservation>;
+  };
   readonly invocation: AgentInvocation;
   activateCapsule(trigger: ProposalEscalationTrigger): void;
   takeProposal(): RoundTurnProposalEnvelope | null;
@@ -118,7 +128,12 @@
   }): void;
 }
 
-function explicitlyRefusedTurn(turn: AgentTurnResult): boolean {
+type CorrectionTurnObservation =
+  | { readonly exit: 'completed'; readonly finalText: string }
+  | { readonly exit: 'cancelled' | 'timed_out' }
+  | { readonly exit: 'infrastructure_failed'; readonly component: 'engine_mcp_startup' };
+
+function explicitlyRefusedTurn(turn: CorrectionTurnObservation): boolean {
   if (turn.exit !== 'completed') return false;
   const text = turn.finalText.trim();
   return /^(?:(?:i|we)\s+)?(?:(?:must|have to)\s+)?(?:refuse|decline)\b/iu.test(text) ||
@@ -231,8 +246,8 @@
   async coordinate(input: {
     readonly initial: InitialProposalAttempt;
     readonly correction: TurnExhaustionCorrectionRuntime;
-    readonly escalation: TurnExhaustionEscalationRuntime | null;
-    readonly deadline: AgentDispatchDeadline;
+    readonly escalation?: TurnExhaustionEscalationRuntime | null;
+    readonly deadline?: AgentDispatchDeadline;
     readonly host: TurnExhaustionHost;
     readonly authorizationFailurePolicy?: AuthorizationFailurePolicy;
   }): Promise<TurnExhaustionOutcome> {
@@ -242,7 +257,7 @@
       if (!exactProposalActors(proposal, actors, 'initial')) {
         throw new RangeError('Initial round proposal actors are malformed.');
       }
-      const authorization = input.deadline.acceptsCompletion()
+      const authorization = input.deadline?.acceptsCompletion() !== false
         ? await input.host.authorize(proposal)
         : 'invalidated';
       if (authorization === 'authorized') {
@@ -261,6 +276,9 @@
       if (input.authorizationFailurePolicy?.kind === 'refuse_blind') {
         return { kind: 'refused', reason: 'host_authorization_failed', attemptConsumed: true };
       }
+      if (input.deadline === undefined) {
+        throw new Error('Proposal correction requires a conversation round deadline.');
+      }
       return this.#correctAndResolve({
         requestId: proposal.requestId,
         initialProposalId: proposal.proposalId,
@@ -269,7 +287,7 @@
           fallbackResult: authorization === 'invalidated' ? 'invalidated' : 'invalid',
         })),
         correction: input.correction,
-        escalation: input.escalation,
+        escalation: input.escalation ?? null,
         deadline: input.deadline,
         host: input.host,
       });
@@ -283,10 +301,13 @@
         attemptConsumed: true,
       };
     }
+    if (input.deadline === undefined) {
+      throw new Error('Proposal correction requires a conversation round deadline.');
+    }
     return this.#correctAndResolve({
       ...input.initial,
       correction: input.correction,
-      escalation: input.escalation,
+      escalation: input.escalation ?? null,
       deadline: input.deadline,
       host: input.host,
     });
@@ -342,53 +363,56 @@
         correctionNumber: MAX_PROPOSAL_CORRECTIONS,
         actorFailures: failures,
       });
-<<<<<<< HEAD
-      input.correction.activateCapsule();
-      const prompt = input.correction.invocation.output.kind === 'structured_final'
-        ? input.correction.invocation.prompt
-        : this.renderCorrection(
-            'correct_proposal',
-            input.correction.capsule,
-            input.correction.rules,
-            undefined,
-            input.correction.turnContext,
-          );
-      const correctionTurn = await input.correction.lifecycle.resumeCorrection(
-        { ...input.correction.invocation, prompt },
-        input.correction.signal,
-      );
-      switch (correctionTurn.exit) {
-        case 'completed': break;
-        case 'cancelled':
-          return { kind: 'refused', reason: 'correction_cancelled', attemptConsumed: true };
-        case 'timed_out':
-          return { kind: 'refused', reason: 'correction_timeout', attemptConsumed: true };
-        case 'infrastructure_failed':
-          return { kind: 'infrastructure_failed', component: correctionTurn.component };
-=======
       const directEscalation = input.escalation?.trigger === 'refusal'
         ? input.escalation
         : null;
       if (input.deadline.acceptsCompletion()) {
         if (directEscalation === null) {
           input.correction.activateCapsule();
-          const prompt = correctionPrompt(input.correction);
+          const prompt = input.correction.invocation.output.kind === 'structured_final'
+            ? input.correction.invocation.prompt
+            : this.renderCorrection(
+                'correct_proposal',
+                input.correction.capsule,
+                input.correction.rules,
+                undefined,
+                input.correction.turnContext,
+              );
           const correctionTurn = await input.correction.lifecycle.resumeCorrection(
             { ...input.correction.invocation, prompt },
             input.deadline,
           );
-          correctionExplicitRefusal = explicitlyRefusedTurn(correctionTurn);
-          if (input.deadline.acceptsCompletion()) correctedProposal = input.correction.takeProposal();
+          switch (correctionTurn.exit) {
+            case 'completed':
+              correctionExplicitRefusal = explicitlyRefusedTurn(correctionTurn);
+              if (input.deadline.acceptsCompletion()) correctedProposal = input.correction.takeProposal();
+              break;
+            case 'cancelled':
+              return { kind: 'refused', reason: 'correction_cancelled', attemptConsumed: true };
+            case 'timed_out':
+              return { kind: 'refused', reason: 'correction_timeout', attemptConsumed: true };
+            case 'infrastructure_failed':
+              return { kind: 'infrastructure_failed', component: correctionTurn.component };
+          }
         } else {
           directEscalation.activateCapsule('refusal');
           const prompt = correctionPrompt(directEscalation);
-          await directEscalation.lifecycle.startEscalation(
+          const escalationTurn = await directEscalation.lifecycle.startEscalation(
             { ...directEscalation.invocation, prompt },
             input.deadline,
           );
-          if (input.deadline.acceptsCompletion()) correctedProposal = directEscalation.takeProposal();
+          switch (escalationTurn.exit) {
+            case 'completed':
+              if (input.deadline.acceptsCompletion()) correctedProposal = directEscalation.takeProposal();
+              break;
+            case 'cancelled':
+              return { kind: 'refused', reason: 'correction_cancelled', attemptConsumed: true };
+            case 'timed_out':
+              return { kind: 'refused', reason: 'correction_timeout', attemptConsumed: true };
+            case 'infrastructure_failed':
+              return { kind: 'infrastructure_failed', component: escalationTurn.component };
+          }
         }
->>>>>>> main
       }
     } else if (prior.stage !== 'correction_requested') {
       throw new Error(`Proposal exhaustion chain cannot resume from ${prior.stage}.`);
@@ -431,14 +455,23 @@
       : input.escalation?.trigger === 'validation_failures' && correctionValidationFailed
         ? 'validation_failures'
         : null;
-    if (input.escalation !== null && correctionEscalationTrigger !== null &&
+    if (input.escalation !== undefined && input.escalation !== null && correctionEscalationTrigger !== null &&
       input.deadline.acceptsCompletion()) {
       input.escalation.activateCapsule(correctionEscalationTrigger);
       const prompt = correctionPrompt(input.escalation);
-      await input.escalation.lifecycle.startEscalation(
+      const escalationTurn = await input.escalation.lifecycle.startEscalation(
         { ...input.escalation.invocation, prompt },
         input.deadline,
       );
+      switch (escalationTurn.exit) {
+        case 'completed': break;
+        case 'cancelled':
+          return { kind: 'refused', reason: 'correction_cancelled', attemptConsumed: true };
+        case 'timed_out':
+          return { kind: 'refused', reason: 'correction_timeout', attemptConsumed: true };
+        case 'infrastructure_failed':
+          return { kind: 'infrastructure_failed', component: escalationTurn.component };
+      }
       proposal = input.deadline.acceptsCompletion() ? input.escalation.takeProposal() : null;
       if (proposal !== null && proposal.requestId === input.requestId &&
         exactProposalActors(proposal, actorIds, 'correction') && input.deadline.acceptsCompletion()) {
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index f3a18a0841a7ac8d7baad788201c3cc6200e456a..f2f0c8f00baf0a43d8fff529c7f645fa7f5da977
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -32,13 +32,10 @@
   McpChildExited,
   mcpRequest,
   stopMcpClient,
-<<<<<<< HEAD
   profiledTurnContextArguments,
   persistD569IntegrityStop,
   type ConversationBoardSnapshotService,
-=======
   type ConversationRunOptions,
->>>>>>> main
 } from '../../../tools/ai-dm-conversation';
 import { buildRerunPacket } from '../../../tools/ai-dm-rerun-packet';
 import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from '../../helpers/test-filesystem';
@@ -65,12 +62,9 @@
   MemoryMirrorSink,
 } from '../../../src/vtt/session-persistence';
 import { codexArgv } from '../../../src/vtt/agent-adapters/codex';
-<<<<<<< HEAD
 import { D569IntegrityStop } from '../../../src/vtt/d569-integrity';
-=======
 import { decodeSessionSnapshotV1 } from '../../../src/vtt/arena-fixture';
 import { canonicalJson } from '../../../src/commands/canonical-json';
->>>>>>> main
 import {
   applyRevisionDelta,
   type RevisionDeltaOperation,
@@ -336,6 +330,9 @@
           : 'I cannot submit this round proposal.',
         usage: null,
         exit: 'completed',
+        processEvidence: null,
+        engineCatalogEvidence: null,
+        partialResultEvidence: { status: 'complete', decodedEventCount: 0 },
       };
     }
     const manifest = JSON.parse(readFileSync(invocation.launcherToken, 'utf8')) as EngineMcpLauncherManifest;
@@ -626,14 +623,10 @@
 
   classifyFailure(): 'unknown' { return 'unknown'; }
 
-<<<<<<< HEAD
-  private completed(sessionId: NonNullable<AgentTurnResult['resumeSessionId']>): AgentTurnResult {
-=======
   private completed(
-    sessionId: AgentTurnResult['resumeSessionId'],
+    sessionId: NonNullable<AgentTurnResult['resumeSessionId']>,
     finalText = 'SERIALIZED-TEST',
   ): AgentTurnResult {
->>>>>>> main
     return {
       resumeSessionId: sessionId,
       sessionId,
diff --git a/tests/unit/vtt/agent-session-lifecycle.test.ts b/tests/unit/vtt/agent-session-lifecycle.test.ts
index feb8049a949d5df64393953229be8917cdc28cde..bff6c2a8e79d25a48c7134c0fd2282f3c2fbda71
--- a/tests/unit/vtt/agent-session-lifecycle.test.ts
+++ b/tests/unit/vtt/agent-session-lifecycle.test.ts
@@ -163,7 +163,6 @@
 }
 
 describe('SIMULATED agent session lifecycle', () => {
-<<<<<<< HEAD
   it.each(['cancelled', 'timed_out', 'infrastructure_failed'] as const)(
     'keeps an observed reusable identity unbound after a %s cold start',
     async (exit) => {
@@ -182,11 +181,11 @@
         start: async () => result, resume: async () => result, classifyFailure: () => 'unknown',
       };
       const first = setup(adapter);
-      await expect(first.lifecycle.coldStart(invocation(first.sessionId, 'cold'), new AbortController().signal))
+      await expect(first.lifecycle.coldStart(invocation(first.sessionId, 'cold'), openDeadline()))
         .resolves.toEqual({ kind: 'unbound', turn: result });
       expect(first.journal.agentSession()).toBeNull();
       const round = setup(adapter);
-      await expect(round.lifecycle.coldStartRound(invocation(round.sessionId, 'round'), new AbortController().signal))
+      await expect(round.lifecycle.coldStartRound(invocation(round.sessionId, 'round'), openDeadline()))
         .resolves.toEqual({ kind: 'unbound', turn: result });
       expect(round.journal.agentSession()).toBeNull();
       expect(round.store.revisions(round.sessionId).map((revision) => revision.transition.kind))
@@ -194,7 +193,6 @@
     },
   );
 
-=======
   it('fractional remainder floors and below one does not spawn', async () => {
     const prove = async (factory: DeadlineFactory): Promise<void> => {
       let now = 98.2;
@@ -234,6 +232,7 @@
             finalText: '',
             usage: null,
             exit: 'completed',
+            ...COMPLETED_EVIDENCE,
           };
         },
         resume: async (_binding, candidate) => {
@@ -258,7 +257,6 @@
       prove,
     );
   });
->>>>>>> main
   it('rollover threshold is measured', () => {
     expect(CONTEXT_ROLLOVER_POLICY).toEqual({
       kind: 'measured',
@@ -549,11 +547,11 @@
       classifyFailure: (error) => error instanceof SIMULATEDResumeFailure ? error.classification : 'unknown',
     };
     const { lifecycle, journal, sessionId, store } = setup(adapter);
-    await lifecycle.coldStart(invocation(sessionId, 'cold'), new AbortController().signal);
+    await lifecycle.coldStart(invocation(sessionId, 'cold'), openDeadline());
     const recoveryDispatchId = engineDispatchId('engine-dispatch:recovery-failure-0001');
     const recovered = await lifecycle.resumeRound({
       ...invocation(sessionId, 'resume'), recoveryEngineDispatchId: recoveryDispatchId,
-    }, new AbortController().signal);
+    }, openDeadline());
 
     expect(recovered).toEqual(failedRecovery);
     expect(journal.agentSession()?.sessionId).toBe(agentSessionId('agent-session:recovery-predecessor'));
diff --git a/tools/ai-dm-arena.ts b/tools/ai-dm-arena.ts
index b13b7db58e6a239a7585df6b0aca2b9d3758a7c2..6e5b4f691271d78f0b9938d6dc786a7a0d13f46b
--- a/tools/ai-dm-arena.ts
+++ b/tools/ai-dm-arena.ts
@@ -338,11 +338,8 @@
       '--renderer-profile',
       '--turn-context-max-bytes',
       '--board-image',
-<<<<<<< HEAD
       '--dm-mode', '--blind-repair-arm', '--blind-max-attempts', '--blind-facts',
-=======
       '--round-wall-ms', '--basis-dir', '--arm-instruction-source', '--arm-kb',
->>>>>>> main
       '--basis', '--arm', '--local-base-url', '--local-model', '--local-api-key', '--local-think',
     ].includes(option ?? '')) throw new TypeError(`Unknown arena option ${option ?? '<missing>'}.`);
     const value = requiredValue(argumentsValue, index, option ?? '<missing>');
@@ -639,7 +636,6 @@
   if (!interleave && armOverridePolicies.size > 0) {
     throw new TypeError('--arm-override-policy is only valid with --interleave.');
   }
-  const rooms = positiveInteger(values.get('--rooms') ?? '', '--rooms');
   if (basis === 'challenge') {
     if (seed !== 5_831_001) throw new TypeError('The challenge basis requires --seed 5831001.');
     if (rooms > 4) throw new RangeError('The challenge basis contains exactly four consecutive rooms.');
@@ -660,12 +656,8 @@
     initiativeProfile: initiativeProfile as RoomInitiativeProfile,
     partyPolicy: partyPolicy as ScriptedPartyDecisionPolicy,
     rooms,
-<<<<<<< HEAD
     reps,
     cells,
-=======
-    reps: positiveInteger(values.get('--reps') ?? '', '--reps'),
->>>>>>> main
     seed,
     cli: selectedCli,
     decisionTransport: transport as ConversationTransport,
diff --git a/tools/ai-dm-conversation.ts b/tools/ai-dm-conversation.ts
index c0f972c35a5bdaaff4aa41bc484c0b3ef4e4e9cc..5a409698249651563e224c9ebff96b002fdf8318
--- a/tools/ai-dm-conversation.ts
+++ b/tools/ai-dm-conversation.ts
@@ -25,7 +25,6 @@
   type AgentInstructionSource, type AgentSkillName, type ContextRolloverPolicy, type FreshSessionContext,
   type EngineCatalogEvidence,
 } from '../src/vtt/agent-session';
-<<<<<<< HEAD
 import { D569IntegrityStop, type D569DispatchIntegrityArtifact } from '../src/vtt/d569-integrity';
 import {
   classifyTurnContextDelivery,
@@ -35,15 +34,12 @@
   type TurnContextDelivery,
   type TurnContextMeasurement,
 } from '../src/vtt/turn-context-delivery';
-import { AgentSessionLifecycle } from '../src/vtt/agent-session-lifecycle';
-=======
 import {
   AgentDispatchDeadlineExceededError,
   AgentSessionLifecycle,
   createConversationRoundDeadline,
   type AgentDispatchDeadline,
 } from '../src/vtt/agent-session-lifecycle';
->>>>>>> main
 import { AGENT_ADAPTER_VERSION, resolveAgentAdapter } from '../src/vtt/agent-adapters';
 import {
   LocalOpenAiAgentSessionAdapter,
@@ -1222,12 +1218,8 @@
     dryRun,
     cwd: resolve(cwd),
     cliBin: values.get('--cli-bin') ?? (selectedCli === 'codex' ? 'codex' : selectedCli === 'claude-code' ? 'claude' : ''),
-<<<<<<< HEAD
     timeoutMs: positiveInteger(values.get('--timeout-ms') ?? (dmModeExplicit ? '240000' : '120000'), '--timeout-ms'),
-=======
-    timeoutMs: positiveInteger(values.get('--timeout-ms') ?? '120000', '--timeout-ms'),
     roundWallMs: 180_000,
->>>>>>> main
     ...instructionSource,
     reactionAskDefault,
     captureRlData,
@@ -4264,11 +4256,7 @@
 
     for (let round = 1; round <= config.rounds; round += 1) {
       const generationBeforeRound = journal.agentSession()?.generation ?? 0;
-<<<<<<< HEAD
-      const roundStarted = clock();
-=======
-      const endToEndStarted = performance.now();
->>>>>>> main
+      const endToEndStarted = clock();
       const modelCallsBeforeRound = adapter.modelCalls;
       observedToolCalls = 0;
       observedTurnContextCalls = 0;
@@ -4672,10 +4660,6 @@
         const timeout = setTimeout(() => controller.abort(), budgetMs);
         const completion = (async (): Promise<SpeculativeDispatchCompletion> => {
           try {
-<<<<<<< HEAD
-            options.onSpeculationDispatchStart?.();
-=======
->>>>>>> main
             const speculativeInvocation = invocation(
               config,
               runId,
@@ -4689,37 +4673,9 @@
               launcher.recoveryManifestPath,
               toolSession,
               freshSessionContext,
-<<<<<<< HEAD
               { kind: 'tool_driven' },
               { engineDispatchId: launcher.dispatchId, recoveryEngineDispatchId: launcher.recoveryDispatchId },
             );
-            options.onAgentInvocation?.(speculativeInvocation);
-            const turn = await adapter.start(speculativeInvocation, controller.signal);
-            const planningWallMs = clock() - dispatchStarted;
-            const spools = dispatchSpools(launcher, turn);
-            enforceCompletedDispatchIntegrity({
-              turn,
-              launcher,
-              spools,
-              maximumBytes: config.turnContextMaximumBytes,
-              artifactPath: join(artifacts, `${key}-speculative-${String(window.monsters[0])}-dispatch-integrity.json`),
-              rowPath: config.outPath,
-              scheduledCellKey: config.scheduledCellKey ?? `${String(room)}:${String(round)}`,
-            });
-            return {
-              plan: turn.exit === 'completed' ? localPlan ?? takeSpeculativePlan(spools.proposal) : null,
-              turn,
-              planningWallMs,
-              timedOut: turn.exit === 'timed_out' || controller.signal.aborted || planningWallMs > budgetMs,
-              error: turn.exit === 'infrastructure_failed' ? turn.failureReason : null,
-              failingDispatch: turn.exit === 'infrastructure_failed'
-                ? classifyFailedDispatch({
-                    phase: 'speculative', turn, contextSpoolPath: spools.context,
-                    maximumBytes: config.turnContextMaximumBytes,
-                  })
-                : null,
-=======
-            );
             const dispatch = roundDeadline.dispatch({
               ...speculativeInvocation,
               timeoutMs: Math.min(speculativeInvocation.timeoutMs ?? budgetMs, budgetMs),
@@ -4728,41 +4684,53 @@
               return {
                 plan: null,
                 turn: null,
-                planningWallMs: performance.now() - dispatchStarted,
+                planningWallMs: clock() - dispatchStarted,
                 timedOut: true,
                 error: 'The conversation round dispatch deadline is exhausted.',
+                failingDispatch: null,
               };
             }
             speculationPlanner = planner;
             options.onSpeculationDispatchStart?.();
+            options.onAgentInvocation?.(speculativeInvocation);
             const turn = await adapter.start(
               dispatch.invocation,
               AbortSignal.any([roundDeadline.signal, controller.signal]),
             );
-            const planningWallMs = performance.now() - dispatchStarted;
+            const planningWallMs = clock() - dispatchStarted;
+            const spools = dispatchSpools(launcher, turn);
+            enforceCompletedDispatchIntegrity({
+              turn,
+              launcher,
+              spools,
+              maximumBytes: config.turnContextMaximumBytes,
+              artifactPath: join(artifacts, `${key}-speculative-${String(window.monsters[0])}-dispatch-integrity.json`),
+              rowPath: config.outPath,
+              scheduledCellKey: config.scheduledCellKey ?? `${String(room)}:${String(round)}`,
+            });
             const acceptedInTime = roundDeadline.acceptsCompletion();
             return {
-              plan: acceptedInTime
-                ? localPlan ?? takeSpeculativePlan(launcher.spoolPath)
+              plan: acceptedInTime && turn.exit === 'completed'
+                ? localPlan ?? takeSpeculativePlan(spools.proposal)
                 : null,
               turn: acceptedInTime ? turn : null,
               planningWallMs,
-              timedOut: !acceptedInTime || controller.signal.aborted || planningWallMs > budgetMs,
-              error: null,
->>>>>>> main
+              timedOut: !acceptedInTime || turn.exit === 'timed_out' || controller.signal.aborted || planningWallMs > budgetMs,
+              error: acceptedInTime && turn.exit === 'infrastructure_failed' ? turn.failureReason : null,
+              failingDispatch: acceptedInTime && turn.exit === 'infrastructure_failed'
+                ? classifyFailedDispatch({
+                    phase: 'speculative', turn, contextSpoolPath: spools.context,
+                    maximumBytes: config.turnContextMaximumBytes,
+                  })
+                : null,
             };
           } catch (error) {
             if (error instanceof D569IntegrityStop) throw error;
             return {
               plan: null,
               turn: null,
-<<<<<<< HEAD
               planningWallMs: clock() - dispatchStarted,
-              timedOut: controller.signal.aborted,
-=======
-              planningWallMs: performance.now() - dispatchStarted,
               timedOut: !roundDeadline.acceptsCompletion() || controller.signal.aborted,
->>>>>>> main
               error: error instanceof Error ? error.message : String(error),
               failingDispatch: null,
             };
@@ -5197,11 +5165,10 @@
             rules: RULES_SOURCE,
             turnContext: correctionContext.value,
             lifecycle: {
-<<<<<<< HEAD
-              resumeCorrection: async (correctionInvocation, signal) => {
+              resumeCorrection: async (correctionInvocation, deadline) => {
                 options.onAgentInvocation?.(correctionInvocation);
                 correctionCalls += 1;
-                const turn = await lifecycle.resumeCorrection(correctionInvocation, signal);
+                const turn = await lifecycle.resumeCorrection(correctionInvocation, deadline);
                 correctionSpools = dispatchSpools(correctionLauncher, turn);
                 enforceCompletedDispatchIntegrity({
                   turn,
@@ -5219,11 +5186,6 @@
                     maximumBytes: config.turnContextMaximumBytes,
                   });
                 }
-=======
-              resumeCorrection: async (correctionInvocation, deadline) => {
-                correctionCalls += 1;
-                const turn = await lifecycle.resumeCorrection(correctionInvocation, deadline);
->>>>>>> main
                 adjustmentCorrectionSessionId = turn.sessionId;
                 captureCallUsage(turn, 'correction');
                 decisionAttempts += 1;
@@ -5517,19 +5479,13 @@
             initialCalls += 1;
             let turn: AgentTurnResult;
             try {
-<<<<<<< HEAD
               if (journal.agentSession() === null) {
-                const cold = await lifecycle.coldStartRound(primaryInvocation, new AbortController().signal);
+                const cold = await lifecycle.coldStartRound(primaryInvocation, roundDeadline);
                 turn = cold.turn;
               } else {
-                turn = await lifecycle.resumeRound(primaryInvocation, new AbortController().signal);
+                turn = await lifecycle.resumeRound(primaryInvocation, roundDeadline);
               }
-=======
-              turn = journal.agentSession() === null
-                ? await lifecycle.coldStartRound(primaryInvocation, roundDeadline)
-                : await lifecycle.resumeRound(primaryInvocation, roundDeadline);
               if (!roundDeadline.acceptsCompletion()) throw new AgentDispatchDeadlineExceededError();
->>>>>>> main
             } catch (error) {
               if (!agentDispatchWasCancelled(error)) throw error;
               primaryDispatchTimedOut = true;
@@ -5807,6 +5763,13 @@
           ...(launcherKbRead === undefined ? {} : { kbRead: launcherKbRead }),
           ...(boardImageBinding === undefined ? {} : { boardImage: boardImageBinding }),
         });
+        let escalationSpools = escalationLauncher === null ? null : {
+          proposal: escalationLauncher.spoolPath,
+          context: escalationLauncher.turnContextSpoolPath,
+          uiFeedback: escalationLauncher.uiFeedbackSpoolPath,
+          blindIntent: escalationLauncher.blindIntentSpoolPath,
+          blindIngress: escalationLauncher.blindIngressSpoolPath,
+        };
         const escalationToolSession = config.cli !== 'local-openai' || escalationLauncher === null
           ? undefined
           : inProcessDmToolSession({
@@ -5860,16 +5823,12 @@
               : correctionDispatchPlanner;
             const correctionContextPath = escalationTrigger === null || escalationLauncher === null
               ? correctionLauncher.turnContextSpoolPath
-              : escalationLauncher.turnContextSpoolPath;
+              : escalationSpools?.context ?? escalationLauncher.turnContextSpoolPath;
             const proposalTurnContext = config.captureRlData
               ? proposal.phase === 'initial'
                 ? takeTurnContext(activeInitialSpools.context, config.turnContextMaximumBytes) ??
                   getPlannedInitialTurnContext()
-<<<<<<< HEAD
-                : takeTurnContext(mainCorrectionSpools.context, config.turnContextMaximumBytes) ??
-=======
                 : takeTurnContext(correctionContextPath, config.turnContextMaximumBytes) ??
->>>>>>> main
                   getPlannedCorrectionTurnContext()
               : null;
             const proposalRlData = proposalTurnContext === null
@@ -6084,6 +6043,7 @@
                   firedEscalationModel = correctionDispatchPlanner.model;
                   correctionCalls += 1;
                   recordedCorrectionTurnContext = getPlannedCorrectionTurnContext();
+                  options.onAgentInvocation?.(escalationInvocation);
                   let turn: AgentTurnResult;
                   try {
                     turn = await lifecycle.startEscalation({
@@ -6103,8 +6063,30 @@
                       finalText: '',
                       usage: null,
                       exit: 'completed',
+                      processEvidence: null,
+                      engineCatalogEvidence: null,
+                      partialResultEvidence: { status: 'complete', decodedEventCount: 0 },
                     };
                   }
+                  escalationSpools = dispatchSpools(escalationLauncher, turn);
+                  enforceCompletedDispatchIntegrity({
+                    turn,
+                    launcher: escalationLauncher,
+                    spools: escalationSpools,
+                    maximumBytes: config.turnContextMaximumBytes,
+                    artifactPath: join(artifacts, `${key}-escalation-dispatch-integrity.json`),
+                    rowPath: config.outPath,
+                    scheduledCellKey: config.scheduledCellKey ?? `${String(room)}:${String(round)}`,
+                  });
+                  correctionTurnContextSpoolPath = escalationSpools.context;
+                  correctionUiFeedbackSpoolPath = escalationSpools.uiFeedback;
+                  if (turn.exit === 'infrastructure_failed') {
+                    failingDispatch = classifyFailedDispatch({
+                      phase: 'correction', turn,
+                      contextSpoolPath: escalationSpools.context,
+                      maximumBytes: config.turnContextMaximumBytes,
+                    });
+                  }
                   if (!correctionDispatchTimedOut &&
                     turn.resumeSessionId === journal.agentSession()?.sessionId) {
                     throw new Error('Tiered correction did not create an isolated escalation session.');
@@ -6158,9 +6140,15 @@
                 escalationToolSession,
                 freshSessionContext,
                 correctionInvocationOutput,
+                {
+                  engineDispatchId: escalationLauncher.dispatchId,
+                  recoveryEngineDispatchId: escalationLauncher.recoveryDispatchId,
+                },
               ),
               activateCapsule: (trigger: ProposalEscalationTrigger) => { requestedEscalationTrigger = trigger; },
-              takeProposal: () => localEscalationProposal ?? takeRoundProposal(escalationLauncher.spoolPath),
+              takeProposal: () => localEscalationProposal ?? takeRoundProposal(
+                escalationSpools?.proposal ?? escalationLauncher.spoolPath,
+              ),
             };
         const coordinated = await new TurnExhaustionCoordinator(journal.turnExhaustionPersistence()).coordinate({
           initial,
@@ -6179,12 +6167,8 @@
                   },
             },
             lifecycle: {
-<<<<<<< HEAD
-              resumeCorrection: async (correctionInvocation: AgentInvocation, signal: AbortSignal) => {
-                options.onAgentInvocation?.(correctionInvocation);
-=======
               resumeCorrection: async (correctionInvocation: AgentInvocation, deadline: AgentDispatchDeadline) => {
->>>>>>> main
+                options.onAgentInvocation?.(correctionInvocation);
                 correctionDispatchPlanner = plannerAttribution(correctionInvocation);
                 const correctionRejectionsBefore = canonicalJson(rejectionsObserved());
                 const contextCallsBeforeCorrection = simulated?.contextCallsByRequest.get(requestId) ??
@@ -6323,12 +6307,8 @@
               },
             ),
             activateCapsule: () => undefined,
-<<<<<<< HEAD
             takeProposal: () => localCorrectionProposal ?? takeRoundProposal(mainCorrectionSpools.proposal),
-=======
-            takeProposal: () => localCorrectionProposal ?? takeRoundProposal(correctionLauncher.spoolPath),
             validationFailureObserved: () => correctionValidationFailureObserved,
->>>>>>> main
           },
           escalation: escalationRuntime,
           deadline: roundDeadline,
@@ -6664,14 +6644,9 @@
               } else {
                 const currentEntries = segmentActors.map((actorId) => segmentMonsterPlan.get(actorId))
                   .filter((entry): entry is SegmentMonsterPlanEntry => entry !== undefined);
-<<<<<<< HEAD
-                const rebound = options.forceSpeculationRecalculationForTest === true
-                  ? null
-                  : currentEntries.length === segmentActors.length
-=======
-                const rebound = options.forceSpeculationRecalculation !== true &&
+                const rebound = options.forceSpeculationRecalculationForTest !== true &&
+                  options.forceSpeculationRecalculation !== true &&
                   currentEntries.length === segmentActors.length
->>>>>>> main
                   ? rebaseStoredPlanEntries({ state, actualRevision: capsuleRevision, entries: currentEntries })
                   : null;
                 if (rebound === null) {
@@ -6769,7 +6744,6 @@
                     };
                     try {
                       const recalculationInvocation = invocation(
-<<<<<<< HEAD
                         config,
                         runId,
                         'speculation_recalculation',
@@ -6786,38 +6760,20 @@
                           recoveryEngineDispatchId: recalculationLauncher.recoveryDispatchId,
                         },
                       );
-                      options.onAgentInvocation?.(recalculationInvocation);
-                      const recalculationTurn = await adapter.resume(
-                        binding,
-                        recalculationInvocation,
-                        new AbortController().signal,
-=======
-                          config,
-                          runId,
-                          'speculation_recalculation',
-                          `${turnContextPrompt(pending.sourceTurnContext, config.intelMode)}\n\n${renderEnginePrompt('plan_round', recalculationSnapshot.capsule, RULES_SOURCE)}`,
-                          recalculationLauncher.manifestPath,
-                          null,
-                          pending.planner,
-                          recalculationLauncher.recoveryManifestPath,
-                          recalculationToolSession,
-                          freshSessionContext,
-                        );
                       const recalculationDispatch = roundDeadline.dispatch(recalculationInvocation);
                       if (recalculationDispatch.kind === 'exhausted') {
                         throw new AgentDispatchDeadlineExceededError();
                       }
+                      options.onAgentInvocation?.(recalculationInvocation);
                       const recalculationTurn = await adapter.resume(
                         binding,
                         recalculationDispatch.invocation,
                         roundDeadline.signal,
->>>>>>> main
                       );
                       if (!roundDeadline.acceptsCompletion()) {
                         throw new AgentDispatchDeadlineExceededError();
                       }
                       captureCallUsage(recalculationTurn, 'speculation_recalculation');
-<<<<<<< HEAD
                       const recalculationSpools = dispatchSpools(recalculationLauncher, recalculationTurn);
                       enforceCompletedDispatchIntegrity({
                         turn: recalculationTurn,
@@ -6842,24 +6798,6 @@
                       const proposal = recalculationTurn.exit === 'completed'
                         ? localRecalculationProposal ?? takeRoundProposal(recalculationSpools.proposal)
                         : null;
-                      if (proposal !== null) {
-                        const checked = authorizedMechanics(state, proposal);
-                        if (checked.entries !== null && sameCombatantSet(
-                          checked.entries.map((entry) => entry.proposal.actorId),
-                          segmentActors,
-                        )) {
-                          recalculated = checked.entries.map((entry) => ({
-                            proposal: structuredClone(entry.proposal),
-                            option: structuredClone(entry.option),
-                            primaryOption: structuredClone(entry.primaryOption),
-                            fallbackOption: structuredClone(entry.fallbackOption),
-                            mechanics: entry.mechanics,
-                            selectedBranch: entry.selectedBranch,
-                          }));
-                        }
-=======
-                      const proposal = localRecalculationProposal ??
-                        takeRoundProposal(recalculationLauncher.spoolPath);
                       if (proposal !== null && roundDeadline.acceptsCompletion()) {
                         recalculated = acceptSpeculationRecalculationBeforeDeadline(
                           roundDeadline,
@@ -6882,7 +6820,6 @@
                           },
                         );
                         options.onSpeculationRecalculationResolved?.(recalculated);
->>>>>>> main
                       }
                     } catch (error) {
                       if (error instanceof D569IntegrityStop || error instanceof CellInfrastructureAbort) throw error;
@@ -6995,11 +6932,8 @@
           initiativeExecutionPending = false;
         }
       } catch (error) {
-<<<<<<< HEAD
         if (error instanceof D569IntegrityStop) throw error;
-=======
         classifyPolicy();
->>>>>>> main
         if (inFlightSpeculation.current !== null) {
           const pending = inFlightSpeculation.current;
           pending.controller.abort();
@@ -7044,17 +6978,12 @@
           refusals.push(error instanceof Error ? error.message : String(error));
         }
       }
-<<<<<<< HEAD
-      const wall = clock() - started;
-      const endToEndWall = clock() - roundStarted;
-=======
       if (policyClassifiedAtMs === null) classifyPolicy();
-      const wall = performance.now() - started;
-      const endToEndWall = performance.now() - endToEndStarted;
+      const wall = clock() - started;
+      const endToEndWall = clock() - endToEndStarted;
       const policyElapsedMs = roundWallTimedOut
         ? config.roundWallMs
         : Math.min(config.roundWallMs, Math.max(0, (policyClassifiedAtMs ?? roundStarted) - roundStarted));
->>>>>>> main
       const binding = journal.agentSession();
       rowTurnContext = takeTurnContext(
         activeInitialSpools.context,
diff --git a/tools/ai-dm-rerun-packet.ts b/tools/ai-dm-rerun-packet.ts
index 98424421cf9fb9ec987be652e05835391a122aa6..28a65a2c7fdd8ee74f40ffd405c51fd8ea544fdc
--- a/tools/ai-dm-rerun-packet.ts
+++ b/tools/ai-dm-rerun-packet.ts
@@ -3,10 +3,8 @@
 import { z } from 'zod';
 import { D569IntegrityStop } from '../src/vtt/d569-integrity';
 import { canonicalJson } from '../src/commands/canonical-json';
-<<<<<<< HEAD
 import { engineUiFeedbackSchema } from '../src/vtt/mcp/schemas';
 import { d569DeliveryHasIntegritySignal } from '../src/vtt/turn-context-delivery';
-=======
 import {
   ArenaRowDecodeError,
   conversationRowCodec,
@@ -14,7 +12,6 @@
   type DecodedPlanSummary,
   type KnownArenaRow,
 } from './ai-dm-conversation-row-codec';
->>>>>>> main
 
 export const R1_10_SEEDS = [
   5_117_001, 5_117_002, 5_117_003, 5_117_004, 5_117_005,
@@ -39,6 +36,7 @@
 export const R1_10_REPS = 3 as const;
 export const BRUTAL_10_REPS = 3 as const;
 export const RERUN_PACKET_VERSION = 'ai-dm-rerun-packet-v1' as const;
+const STANDARD_INITIATIVE_POLICY = 'initiative-intel-v1';
 
 const jsonRecordSchema = z.record(z.string(), z.unknown());
 type JsonRecord = z.infer<typeof jsonRecordSchema>;
@@ -51,6 +49,87 @@
 type BoardImage = NonNullable<ArenaRow['boardImage']>;
 type UiFeedback = Exclude<ArenaRow['uiFeedback'], undefined>;
 
+const safeIntegerSchema = z.number().int()
+  .min(Number.MIN_SAFE_INTEGER)
+  .max(Number.MAX_SAFE_INTEGER);
+
+const engineIntelSchema = z.object({
+  policy: z.enum(['dm-intel-capture-v1', 'dm-intel-capture-v2-creature-space']),
+  policyVersions: z.object({
+    initiative: z.literal(STANDARD_INITIATIVE_POLICY),
+  }).passthrough(),
+  actors: z.array(z.unknown()),
+}).passthrough();
+
+const baselineChoiceSchema = z.object({
+  kind: z.string(),
+  action_id: z.string().optional(),
+  spell_id: z.string().optional(),
+  target: z.object({ kind: z.string(), combatant_id: z.string().optional() }).passthrough().nullable().optional(),
+}).passthrough();
+
+const currentActionSlotSchema = z.object({
+  kind: z.string(),
+  actionId: z.string().nullable().optional(),
+  spellId: z.string().nullable().optional(),
+  objectId: z.string().nullable().optional(),
+  targetIds: z.array(z.string()).optional(),
+}).passthrough();
+
+const currentResolutionSummarySchema = z.object({
+  actionSlots: z.array(currentActionSlotSchema),
+  movementFeet: z.number().optional(),
+}).passthrough();
+
+const baselineResolutionSummarySchema = z.object({
+  actionId: z.string().nullable(),
+  targetId: z.string().nullable(),
+  movementFeet: z.number().optional(),
+}).passthrough();
+
+const authorizedPlanEntrySchema = z.object({
+  actorId: z.unknown(),
+  reason: z.string().max(240).optional(),
+  acceptedIntent: z.object({ choice: baselineChoiceSchema }).passthrough().optional(),
+  resolutionSummary: z.union([currentResolutionSummarySchema, baselineResolutionSummarySchema]).optional(),
+}).passthrough();
+
+const plannerSchema = z.union([
+  z.literal('sim_controller'),
+  z.object({ model: z.string(), effort: z.string() }).passthrough(),
+  z.null(),
+]);
+const primaryPlannerSchema = z.enum(['model', 'engine_default', 'sim_controller']);
+const overrideKindSchema = z.enum([
+  'objective', 'morale', 'roleplay', 'resource_conservation', 'unknown_engine_gap',
+  'engine_play', 'missing_metric',
+]);
+const overrideRejectionSchema = z.object({
+  actorId: z.string().nullable(),
+  code: z.literal('OVERRIDE_UNJUSTIFIED'),
+}).strict();
+const boardImageSchema = z.discriminatedUnion('mode', [
+  z.object({ mode: z.literal('off') }).strict(),
+  z.object({
+    mode: z.literal('png'),
+    sha256: z.string().regex(/^[a-f0-9]{64}$/u),
+    bytes: safeIntegerSchema.min(24).max(1_000_000),
+    width: safeIntegerSchema.min(1),
+    height: safeIntegerSchema.min(1),
+    captureMs: z.number().finite().nonnegative(),
+    relativePath: z.string().regex(/^board-images\/[a-f0-9]{64}\.png$/u),
+  }).strict(),
+  z.object({
+    mode: z.literal('capture_only'),
+    sha256: z.string().regex(/^[a-f0-9]{64}$/u),
+    bytes: safeIntegerSchema.min(24).max(1_000_000),
+    width: safeIntegerSchema.min(1),
+    height: safeIntegerSchema.min(1),
+    captureMs: z.number().finite().nonnegative(),
+    relativePath: z.string().regex(/^board-images\/[a-f0-9]{64}\.png$/u),
+  }).strict(),
+]);
+
 export interface NeutralAction {
   readonly kind: string;
   readonly actionId: string | null;
@@ -67,7 +146,6 @@
   readonly movementFeet: number | null;
 }
 
-<<<<<<< HEAD
 const commonArenaRowSchema = z.object({
   seed: safeIntegerSchema,
   arm: z.string().min(1),
@@ -437,9 +515,9 @@
 type ParsedArenaRow =
   | { readonly rowEra: 'pre_shift'; readonly row: PreShiftArenaRow }
   | { readonly rowEra: 'post_shift'; readonly row: PostShiftArenaRow | z.infer<typeof arenaRowV3Schema> };
-
-=======
->>>>>>> main
+type ValidatableArenaRow = KnownArenaRow | (ParsedArenaRow & {
+  readonly planSummaries: readonly DecodedPlanSummary[] | null;
+});
 export interface RerunProtocol {
   readonly name?: RerunProtocolName;
   readonly seeds: readonly number[];
@@ -498,29 +576,18 @@
   readonly room: number;
   readonly rep: number;
   readonly startingRoomDigest: string;
-<<<<<<< HEAD
   readonly outcome: z.infer<typeof arenaRowV3BaseSchema>['outcome'];
-  readonly plannedBy: z.infer<typeof plannerSchema>;
-=======
-  readonly outcome: string;
   readonly plannedBy: Planner;
->>>>>>> main
   readonly plannerLabel: string | null | undefined;
   readonly planner: PrimaryPlanner;
   readonly overrideKinds: readonly OverrideKind[];
   readonly overrideRejections: readonly OverrideRejection[];
   readonly roundNarrative: string | null;
-<<<<<<< HEAD
-  readonly authorizedPlan: readonly z.infer<typeof authorizedPlanEntrySchema>[] | null;
+  readonly authorizedPlan: readonly AuthorizedPlanEntry[] | null;
   readonly scheduledCellKey?: string;
-  readonly boardImage?: z.infer<typeof boardImageSchema>;
-  readonly uiFeedback?: z.infer<typeof engineUiFeedbackSchema> | null;
-=======
-  readonly authorizedPlan: readonly AuthorizedPlanEntry[] | null;
   readonly planSummaries: readonly DecodedPlanSummary[] | null;
   readonly boardImage?: BoardImage;
   readonly uiFeedback?: UiFeedback;
->>>>>>> main
 }
 
 interface PreShiftValidatedArenaRow extends CommonValidatedArenaRow {
@@ -794,7 +861,6 @@
   });
 }
 
-<<<<<<< HEAD
 function isMcpMinimalPostShiftArenaRow(value: unknown): value is McpMinimalPostShiftArenaRow {
   return mcpMinimalPostShiftArenaRowSchema.safeParse(value).success;
 }
@@ -840,11 +906,8 @@
   }
   return { rowEra: 'pre_shift', row: parsed.data };
 }
-
-=======
->>>>>>> main
 function validateRow(
-  parsedRow: KnownArenaRow,
+  parsedRow: ValidatableArenaRow,
   sourceLabel: string,
   protocol: RerunProtocol,
   crossEra: boolean,
@@ -884,13 +947,10 @@
     overrideRejections: sourceRow.overrideRejections ?? [],
     roundNarrative: sourceRow.roundNarrative,
     authorizedPlan: sourceRow.authorizedPlan,
-<<<<<<< HEAD
     ...('scheduledCellKey' in sourceRow && typeof sourceRow.scheduledCellKey === 'string'
       ? { scheduledCellKey: sourceRow.scheduledCellKey }
       : {}),
-=======
     planSummaries: parsedRow.planSummaries,
->>>>>>> main
     ...(sourceRow.boardImage === undefined ? {} : {
       boardImage: sourceRow.boardImage,
       uiFeedback: sourceRow.uiFeedback ?? null,
@@ -918,7 +978,7 @@
   return {
     ...postShiftCommon,
     decisionTransport: 'final_indices',
-    chosenOptionIndices: postShiftRow.chosenOptionIndices,
+    chosenOptionIndices: chosenOptionIndicesSchema.parse(postShiftRow.chosenOptionIndices),
   };
 }
 
@@ -935,7 +995,15 @@
       throw new TypeError(`${sourceLabel} contains rlData; ${protocolLabel(protocol)} is a permanent holdout and cannot contain training data.`);
     }
     try {
-      return { sourceLabel, parsedRow: decoder(row) };
+      const strict = parseArenaRow(row, sourceLabel);
+      const shared = decoder({
+        ...row,
+        outcome: strict.row.outcome === 'infrastructure_failed' ? 'service_null' : strict.row.outcome,
+      });
+      if (!Object.prototype.hasOwnProperty.call(row, 'rowContractVersion')) {
+        return { sourceLabel, parsedRow: shared };
+      }
+      return { sourceLabel, parsedRow: { ...strict, planSummaries: shared.planSummaries } };
     } catch (error) {
       if (error instanceof ArenaRowDecodeError) {
         throw new TypeError(`${sourceLabel}${error.sourceSuffix}`);
