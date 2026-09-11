Implemented exactly F90 and F91 against `470d9940`.

### Changes

- F90:
  - Added `handleTopDownPlayerDecision`, now used by the actual DM window receiver.
  - Same-session stale and no-pending decisions return one correlated error envelope.
  - The player receives its original request ID, clears the pending submission, and displays the error.
  - Regressions prove zero execution and zero retries.

- F91:
  - Added queued host transactions for placement, world-object control, and adjudication.
  - Outcomes now wait for `SessionStore.flush()`.
  - Mutation snapshots are withheld until durability succeeds.
  - Rejected writes return `failed/post_apply` and close the authority.
  - Closure during an unresolved flush returns `closed`.
  - Applied revisions are captured from the actual coordinator result.
  - Tests cover all three operations across delayed, failed, and closed writes—nine real-host cases.

Changed files:

- `src/vtt/dm-encounter-host.ts`
- `src/vtt/encounter-app.ts`
- `src/vtt/encounter-session-service.ts`
- `src/vtt/local-window-channel.ts`
- `tests/unit/vtt/encounter-projections.test.ts`
- `tests/unit/vtt/encounter-session-service.test.ts`

The rich façade remains in `src/vtt/encounter-session-service.ts`, lines 642–845: 204 lines.

### Gate results

Focused F90/F91:

```sh
npx vitest run --configLoader runner tests/unit/vtt/encounter-projections.test.ts tests/unit/vtt/encounter-session-service.test.ts -t "actual receiver|rich .* durability barrier|rejected rich|settles a rich"
```

Final result: 2 files, 11 passed, 30 skipped, exit 0.

The initial fixture run exited 1: placement’s normal autonomous resume added a second unrelated reducer call, and `sessionEnded()` was incorrectly used as a closure diagnostic. Assertions were corrected to count only the submitted command and prove closure via a subsequent `closed` result. The final run had no unhandled errors.

Touched unit suite:

```sh
npx vitest run --configLoader runner tests/unit/vtt/encounter-projections.test.ts tests/unit/vtt/encounter-session-service.test.ts tests/unit/vtt/encounter-selectors.test.ts tests/unit/vtt/engine-boundary.test.ts
```

4 files, 56/56 passed.

S8 boundaries:

```sh
npx vitest run --configLoader runner tests/unit/vtt/engine-boundary.test.ts -t "top-down UI mutations enter the rich session service|top-down UI constructs no reducer command literals|all runtime entries converge after top-down refactor"
```

1 file, 3 passed, 9 skipped.

Other gates:

- `npm run test:engine`: 4 files, 58/58 passed.
- `npm run test:protocol`: 4 files, 71/71 passed.
- Explicit 28-spec cumulative Vitest command: 28 files, 361/361 passed.
- `npm run typecheck:fast`: exit 0.
- `sg scan`: exit 0, no findings.
- `git diff --check`: exit 0.

Top-down browser smoke:

```sh
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 VTT_HANDOFF_ARTIFACT=dev npx playwright test --config=tests/browser/vtt-handoff/playwright.config.ts top-down-smoke.spec.ts
```

1/1 passed:

```text
artifact=dev page=http://127.0.0.1:4410/vtt?encounter=d365 offered=turn:1:combatant:character-5:1:option:0 destination=1,4
```

Classic-board regression:

```sh
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 npx playwright test --config=/tmp/vtt-handoff-s8-playwright.config.ts vtt-encounter.spec.ts
```

3/3 passed.

### Assertion replacements

The prior synthetic stale-refusal test was replaced with a strictly stronger actual-receiver test:

- `submissions === 1` became `executions === 0`.
- Synthetic feedback equality became equality against the complete correlated player-result envelope.
- Same-session acceptance and cross-session rejection assertions were retained.
- Added the no-pending correlated-error case.
- Added exact assertions for unresolved durability, committed revision/event correspondence, typed post-apply failure, closure, zero mutation events, and one exact operation reducer call.

No other `expect()` was removed or weakened.

Protected paths are unchanged. Verified:

- Plan: `25816309e2a5e837611b312c069670ba904886c5111930de1deab441e5383a3d`
- Frozen contract: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`
- Examples fixture: `9fc9a587d6be9899168e06846e114f14e5dba93c8bcd032f69c5d1ef2d99480d`

HANDOFF S8 R3 DONE
diff --git a/src/vtt/dm-encounter-host.ts b/src/vtt/dm-encounter-host.ts
index e0f3043c44d20fbcfd0fe62c2289e42d1e6b1389..7adf91bf03f2985707bcdee0abe3da474c5af750
--- a/src/vtt/dm-encounter-host.ts
+++ b/src/vtt/dm-encounter-host.ts
@@ -327,6 +327,7 @@
   #coordinator: TurnCoordinator;
   #rng: SerializableRng;
   #pump: Promise<void> | null = null;
+  #topDownMutationTail: Promise<void> = Promise.resolve();
   #repumpRequested = false;
   #repumpBlocked = false;
   #closed = false;
@@ -1479,6 +1480,12 @@
     this.#publish();
   }
 
+  adjudicateTransaction(
+    command: Extract<EncounterCommand, { readonly type: 'adjudicate' }>,
+  ): Promise<HostCoordinatorTransactionOutcome> {
+    return this.#enqueueTopDownMutation(() => this.#coordinator.adjudicate(command));
+  }
+
   resolvePendingPlacement(
     command: Extract<EncounterCommand, { readonly type: 'resolve_pending_placement' }>,
   ): ReturnType<TurnCoordinator['resolvePendingPlacement']> {
@@ -1492,11 +1499,99 @@
     return result;
   }
 
+  resolvePendingPlacementTransaction(
+    command: Extract<EncounterCommand, { readonly type: 'resolve_pending_placement' }>,
+  ): Promise<HostCoordinatorTransactionOutcome> {
+    return this.#enqueueTopDownMutation(
+      () => {
+        const result = this.#coordinator.resolvePendingPlacement(command);
+        this.#actionRefusal = null;
+        this.#boundaryRefusal = null;
+        return result;
+      },
+      () => {
+        if (this.#coordinator.state().phase.kind !== 'awaiting_placement') {
+          void this.#pumpCoordinator();
+        }
+      },
+    );
+  }
+
   dmUseWorldObject(command: Extract<EncounterCommand, { readonly type: 'dm_use_world_object' }>): void {
     this.#coordinator.dmUseWorldObject(command);
     this.#publish();
   }
 
+  dmUseWorldObjectTransaction(
+    command: Extract<EncounterCommand, { readonly type: 'dm_use_world_object' }>,
+  ): Promise<HostCoordinatorTransactionOutcome> {
+    return this.#enqueueTopDownMutation(() => this.#coordinator.dmUseWorldObject(command));
+  }
+
+  #enqueueTopDownMutation(
+    apply: () => CoordinatorStep,
+    afterCommit?: () => void,
+  ): Promise<HostCoordinatorTransactionOutcome> {
+    const outcome = this.#topDownMutationTail.then(() => this.#settleTopDownMutation(
+      apply,
+      afterCommit,
+    ));
+    this.#topDownMutationTail = outcome.then(() => undefined, () => undefined);
+    return outcome;
+  }
+
+  async #settleTopDownMutation(
+    apply: () => CoordinatorStep,
+    afterCommit?: () => void,
+  ): Promise<HostCoordinatorTransactionOutcome> {
+    if (this.#closed) return { kind: 'closed' };
+    const initialRevision = this.#coordinator.state().revision;
+    let result: CoordinatorStep;
+    try {
+      result = apply();
+    } catch (error: unknown) {
+      const currentRevision = this.#coordinator.state().revision;
+      const phase = error instanceof CoordinatorPostApplicationError ||
+        error instanceof HostPostApplicationError ||
+        currentRevision !== initialRevision
+        ? 'post_apply'
+        : 'pre_apply';
+      if (phase === 'post_apply' && !this.#closed) this.#degradeAfterApplicationFailure();
+      return { kind: 'failed', phase, error, currentRevision };
+    }
+    if (result.kind === 'refused') return { kind: 'refused', reason: result.reason };
+    try {
+      await this.#store.flush();
+    } catch (error: unknown) {
+      if (this.#closed) return { kind: 'closed' };
+      this.#degradeAfterApplicationFailure();
+      return {
+        kind: 'failed',
+        phase: 'post_apply',
+        error,
+        currentRevision: this.#coordinator.state().revision,
+      };
+    }
+    if (this.#closed) return { kind: 'closed' };
+    const committed = {
+      kind: 'committed' as const,
+      revision: result.state.revision,
+    };
+    try {
+      this.#publish('mutation');
+      afterCommit?.();
+    } catch (error: unknown) {
+      if (!this.#closed) this.#degradeAfterApplicationFailure();
+      return {
+        kind: 'failed',
+        phase: 'post_apply',
+        error,
+        currentRevision: this.#coordinator.state().revision,
+      };
+    }
+    return committed;
+  }
+
   async undoLast(): Promise<void> {
     const history = this.#journal.history();
     const reducer = [...history].reverse().find(
diff --git a/src/vtt/encounter-app.ts b/src/vtt/encounter-app.ts
index 7a81ff50b1112ade368ae80faa0aaab0c0536d9f..39e3d0dba0ec78516cc52792deeba106060e73a5
--- a/src/vtt/encounter-app.ts
+++ b/src/vtt/encounter-app.ts
@@ -57,7 +57,7 @@
   TopDownPendingPlacementRecovery,
 } from './encounter-projections';
 import {
-  decodePlayerDecision,
+  handleTopDownPlayerDecision,
   handleTopDownSubmission,
   isHostWindowMessage,
   isPlayerSubmissionFeedbackMessage,
@@ -1633,27 +1633,22 @@
   };
 
   #acceptDecision(value: unknown): void {
-    const pending = this.#projection?.pendingRequest;
-    if (pending === null || pending === undefined) return;
-    try {
-      const decision = decodePlayerDecision(value, this.sessionId, pending);
-      this.#submitTopDown(
-        () => this.#session.submitTopDownOfferedAction(
-          pending.actorId,
-          decision.requestId,
-          decision.encounterRevision,
-          decision.offeredActionId,
-        ),
+    void handleTopDownPlayerDecision(
+      value,
+      this.sessionId,
+      this.#projection?.pendingRequest ?? null,
+      (pending, decision) => this.#session.submitTopDownOfferedAction(
+        pending.actorId,
         decision.requestId,
-      );
-    } catch (error: unknown) {
-      if (error instanceof TypeError) {
-        this.#channelError = error.message;
+        decision.encounterRevision,
+        decision.offeredActionId,
+      ),
+      (message) => {
+        this.#channelError = message.feedback.kind === 'error' ? message.feedback.message : null;
+        this.#channel.postMessage(message);
         this.#render();
-        return;
-      }
-      throw error;
-    }
+      },
+    );
   }
 
   mount(): void {
diff --git a/src/vtt/encounter-session-service.ts b/src/vtt/encounter-session-service.ts
index f67db8e4cac20b97f135945c302bbf67a2fe27b8..9a8dc9db357548abddca43b4676ac0e52cb4956d
--- a/src/vtt/encounter-session-service.ts
+++ b/src/vtt/encounter-session-service.ts
@@ -766,17 +766,13 @@
   async submitTopDownPlacement(selectedOfferedActionId: string): Promise<HostCoordinatorTransactionOutcome> {
     const command = this.#placementOffers.get(selectedOfferedActionId);
     if (command === undefined) return { kind: 'refused', reason: 'The offered placement is stale or unknown.' };
-    const result = this.richHost.resolvePendingPlacement(command);
-    return result.kind === 'refused'
-      ? { kind: 'refused', reason: result.reason }
-      : { kind: 'committed', revision: result.state.revision };
+    return this.richHost.resolvePendingPlacementTransaction(command);
   }
 
   async submitTopDownWorldObject(selectedOfferedActionId: string): Promise<HostCoordinatorTransactionOutcome> {
     const command = this.#worldObjectOffers.get(selectedOfferedActionId);
     if (command === undefined) return { kind: 'refused', reason: 'The offered world-object action is stale or unknown.' };
-    this.richHost.dmUseWorldObject(command);
-    return { kind: 'committed', revision: this.richHost.snapshot().dm.encounter.revision };
+    return this.richHost.dmUseWorldObjectTransaction(command);
   }
 
   async applyTopDownAdjudication(intent: {
@@ -787,14 +783,13 @@
     if (!Number.isSafeInteger(intent.hitPointDelta)) {
       return { kind: 'refused', reason: 'The adjudication hit-point delta must be a safe integer.' };
     }
-    this.richHost.adjudicate({
+    return this.richHost.adjudicateTransaction({
       type: 'adjudicate',
       target: intent.target,
       subject: 'engine:manual-adjudication',
       reasoning: intent.reasoning,
       consequence: { kind: 'hit_point_delta', amount: intent.hitPointDelta },
     });
-    return { kind: 'committed', revision: this.richHost.snapshot().dm.encounter.revision };
   }
   interrupt(...args: Parameters<DmEncounterHost['interrupt']>): ReturnType<DmEncounterHost['interrupt']> {
     return this.richHost.interrupt(...args);
diff --git a/src/vtt/local-window-channel.ts b/src/vtt/local-window-channel.ts
index 167029151d45010ea1e1cade7b0ebf6e237a0139..186b1ab74ef104fabef01a670d4169ca2d2de6e5
--- a/src/vtt/local-window-channel.ts
+++ b/src/vtt/local-window-channel.ts
@@ -30,6 +30,12 @@
   readonly feedback: TopDownSubmissionFeedback;
 }
 
+export interface DecodedPlayerDecision {
+  readonly requestId: string;
+  readonly encounterRevision: number;
+  readonly offeredActionId: string;
+}
+
 function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
   return typeof value === 'object' && value !== null && !Array.isArray(value);
 }
@@ -38,7 +44,7 @@
   value: unknown,
   sessionId: string,
   pending: ControllerRequest,
-): { readonly requestId: string; readonly encounterRevision: number; readonly offeredActionId: string } {
+): DecodedPlayerDecision {
   if (!isRecord(value) || value.kind !== 'human_controller_decision') {
     throw new TypeError('Local window message is not a HumanController decision.');
   }
@@ -64,6 +70,30 @@
   };
 }
 
+function correlatedPlayerDecision(
+  value: unknown,
+  sessionId: string,
+): DecodedPlayerDecision | null {
+  if (!isRecord(value) || value.kind !== 'human_controller_decision' || value.sessionId !== sessionId) {
+    return null;
+  }
+  const decision = value.decision;
+  if (
+    !isRecord(decision) ||
+    typeof decision.requestId !== 'string' ||
+    typeof decision.encounterRevision !== 'number' ||
+    !Number.isSafeInteger(decision.encounterRevision) ||
+    typeof decision.offeredActionId !== 'string'
+  ) {
+    return null;
+  }
+  return {
+    requestId: decision.requestId,
+    encounterRevision: decision.encounterRevision,
+    offeredActionId: decision.offeredActionId,
+  };
+}
+
 export function playerDecisionMessage(
   sessionId: string,
   request: {
@@ -116,6 +146,45 @@
   }
 }
 
+export async function handleTopDownPlayerDecision(
+  value: unknown,
+  sessionId: string,
+  pending: ControllerRequest | null,
+  submit: (
+    request: ControllerRequest,
+    decision: DecodedPlayerDecision,
+  ) => Promise<HostCoordinatorTransactionOutcome>,
+  surface: (message: PlayerSubmissionFeedbackMessage) => void,
+): Promise<void> {
+  const correlated = correlatedPlayerDecision(value, sessionId);
+  if (correlated === null) return;
+  if (pending === null) {
+    surface(playerSubmissionFeedbackMessage(sessionId, correlated.requestId, {
+      kind: 'error',
+      message: 'HumanController decision is stale because no request is pending.',
+    }));
+    return;
+  }
+  let decision: DecodedPlayerDecision;
+  try {
+    decision = decodePlayerDecision(value, sessionId, pending);
+  } catch (error: unknown) {
+    surface(playerSubmissionFeedbackMessage(sessionId, correlated.requestId, {
+      kind: 'error',
+      message: errorMessage(error),
+    }));
+    return;
+  }
+  await handleTopDownSubmission(
+    () => submit(pending, decision),
+    (feedback) => surface(playerSubmissionFeedbackMessage(
+      sessionId,
+      decision.requestId,
+      feedback,
+    )),
+  );
+}
+
 export function playerSubmissionFeedbackMessage(
   sessionId: string,
   requestId: string,
diff --git a/tests/unit/vtt/encounter-projections.test.ts b/tests/unit/vtt/encounter-projections.test.ts
index 55883bc8a13411de7bd163c963e4aaf87aec0488..7e87e71588bf2acf5fb0f0a8830e869b6524ed54
--- a/tests/unit/vtt/encounter-projections.test.ts
+++ b/tests/unit/vtt/encounter-projections.test.ts
@@ -14,9 +14,11 @@
 } from '../../../src/vtt/encounter-projections';
 import {
   decodePlayerDecision,
+  handleTopDownPlayerDecision,
   handleTopDownSubmission,
   isPlayerSubmissionFeedbackMessage,
-  playerSubmissionFeedbackMessage,
+  playerDecisionMessage,
+  type PlayerSubmissionFeedbackMessage,
   type TopDownSubmissionFeedback,
 } from '../../../src/vtt/local-window-channel';
 import {
@@ -261,20 +263,65 @@
     }, 'session:test', request)).toThrow('not one of the projected offered action IDs');
   });
 
-  it('surfaces a stale offered-action refusal once without retrying', async () => {
-    let submissions = 0;
-    let surfaced: TopDownSubmissionFeedback | null = null;
-    await handleTopDownSubmission(async () => {
-      submissions += 1;
-      return { kind: 'refused', reason: 'The offered controller request is stale.' };
-    }, (feedback) => { surfaced = feedback; });
+  it('returns one correlated player error when the actual receiver rejects a stale decision', async () => {
+    const actor = REFERENCE_FIGHTER_ID;
+    const current: ControllerRequest = {
+      kind: 'turn',
+      requestId: 'request:current',
+      encounterRevision: 8,
+      actorId: actor,
+      visibleState: projectPlayerView(createEncounter(referenceEncounterSetup()), {
+        seatId: 'seat:receiver', combatantId: actor,
+      }),
+      legalActions: { actions: [{ type: 'end_turn', actor }] },
+    };
+    const stale = playerDecisionMessage(
+      'session:test',
+      { requestId: 'request:stale', encounterRevision: 7 },
+      offeredActionId('request:stale', 0),
+    );
+    const feedback: PlayerSubmissionFeedbackMessage[] = [];
+    let executions = 0;
+    await handleTopDownPlayerDecision(stale, 'session:test', current, async () => {
+      executions += 1;
+      return { kind: 'committed', revision: 9 };
+    }, (message) => { feedback.push(message); });
 
-    expect(submissions).toBe(1);
-    expect(surfaced).toEqual({ kind: 'error', message: 'The offered controller request is stale.' });
-    if (surfaced === null) throw new Error('The stale refusal was not surfaced.');
-    const message = playerSubmissionFeedbackMessage('session:test', 'request:stale', surfaced);
-    expect(isPlayerSubmissionFeedbackMessage(message, 'session:test')).toBe(true);
-    expect(isPlayerSubmissionFeedbackMessage(message, 'session:other')).toBe(false);
+    expect(executions).toBe(0);
+    expect(feedback).toEqual([{
+      kind: 'human_controller_decision_result',
+      sessionId: 'session:test',
+      requestId: 'request:stale',
+      feedback: { kind: 'error', message: 'HumanController decision is stale.' },
+    }]);
+    expect(isPlayerSubmissionFeedbackMessage(feedback[0], 'session:test')).toBe(true);
+    expect(isPlayerSubmissionFeedbackMessage(feedback[0], 'session:other')).toBe(false);
+  });
+
+  it('returns one correlated player error when the actual receiver has no pending request', async () => {
+    const decision = playerDecisionMessage(
+      'session:test',
+      { requestId: 'request:orphaned', encounterRevision: 8 },
+      offeredActionId('request:orphaned', 0),
+    );
+    const feedback: PlayerSubmissionFeedbackMessage[] = [];
+    let executions = 0;
+    await handleTopDownPlayerDecision(decision, 'session:test', null, async () => {
+      executions += 1;
+      return { kind: 'committed', revision: 9 };
+    }, (message) => { feedback.push(message); });
+
+    expect(executions).toBe(0);
+    expect(feedback).toEqual([{
+      kind: 'human_controller_decision_result',
+      sessionId: 'session:test',
+      requestId: 'request:orphaned',
+      feedback: {
+        kind: 'error',
+        message: 'HumanController decision is stale because no request is pending.',
+      },
+    }]);
+    expect(isPlayerSubmissionFeedbackMessage(feedback[0], 'session:test')).toBe(true);
   });
 
   it('surfaces pre-apply failure and promise rejection without retrying either submission', async () => {
diff --git a/tests/unit/vtt/encounter-session-service.test.ts b/tests/unit/vtt/encounter-session-service.test.ts
index dd43a931ae2b1f5eb316aea39dfabd218826e792..99e11843020be9a1fb6d2a11c00d28eb6deb7723
--- a/tests/unit/vtt/encounter-session-service.test.ts
+++ b/tests/unit/vtt/encounter-session-service.test.ts
@@ -1,10 +1,23 @@
 import { describe, expect, it, vi } from 'vitest';
 import type { EncounterCommand } from '../../../src/combat/events';
-import { createEncounter, reduceEncounter, REACTION_KINDS, type EncounterState } from '../../../src/combat/encounter';
+import {
+  createEncounter,
+  reduceEncounter,
+  REACTION_KINDS,
+  type EncounterState,
+  type MigrationAdjudicationPending,
+} from '../../../src/combat/encounter';
 import { mulberry32 } from '../../../src/combat/random';
-import { damageType, dieSides, type CombatantId } from '../../../src/combat/values';
 import {
+  armorClass,
+  damageType,
+  dieSides,
+  worldObjectId,
+  type CombatantId,
+} from '../../../src/combat/values';
+import {
   EncounterSessionService,
+  RichEncounterSessionService,
   type EncounterSessionHostPort,
   type PlayerSeatRegistration,
   type SessionMutationOutcome,
@@ -216,6 +229,116 @@
   });
 }
 
+type RichTopDownOperation = 'placement' | 'world_object' | 'adjudication';
+let richOperationSequence = 0;
+
+function richTopDownOperation(
+  operation: RichTopDownOperation,
+  store: ControlledFlushStore,
+  onReducerInvocation: (command: EncounterCommand) => void,
+): {
+  readonly service: RichEncounterSessionService;
+  readonly initialRevision: number;
+  readonly submit: () => Promise<HostCoordinatorTransactionOutcome>;
+} {
+  const base = createEncounter(referenceEncounterSetup());
+  let initialState: EncounterState = base;
+  if (operation === 'placement') {
+    const original = base.tokens.find((token) => token.combatantId === REFERENCE_FIGHTER_ID);
+    if (original === undefined) throw new Error('Placement fixture is missing the fighter token.');
+    const record: MigrationAdjudicationPending = {
+      kind: 'legacy_size_required',
+      combatant: REFERENCE_FIGHTER_ID,
+      sourceSizeText: null,
+      suggestedAnchor: { ...original.position },
+      originatingToken: {
+        id: original.id,
+        combatantId: original.combatantId,
+        position: { ...original.position },
+      },
+    };
+    initialState = {
+      ...base,
+      tokens: base.tokens.filter((token) => token.combatantId !== REFERENCE_FIGHTER_ID),
+      adjudicationPending: [record],
+      phase: {
+        kind: 'awaiting_placement',
+        combatantId: REFERENCE_FIGHTER_ID,
+        reason: 'legacy_size_required',
+        originatingRecord: record,
+        resumePhase: { kind: 'active' },
+      },
+    };
+  } else if (operation === 'world_object') {
+    initialState = {
+      ...base,
+      worldObjects: [...base.worldObjects, {
+        id: worldObjectId('world-object:rich-service-control'),
+        name: 'Rich service control',
+        kind: 'generic',
+        position: { column: 4, row: 4 },
+        footprint: [{ column: 4, row: 4 }],
+        durability: { kind: 'indestructible' },
+        armorClass: armorClass(12),
+        damageResponses: [],
+        blocking: { movement: false, lineOfSight: false, cover: 'none' },
+        classActions: [{
+          id: 'exercise-rich-control',
+          label: 'Exercise rich control',
+          cost: 'action',
+          reach: 'adjacent',
+          uses: 'once',
+          eligibleActor: 'monster',
+          dmOverride: {
+            actor: REFERENCE_MONSTER_ID,
+            reasoning: 'Exercise the durability-backed rich-service control.',
+          },
+        }],
+        createdRevision: base.revision,
+      }],
+    };
+  }
+  richOperationSequence += 1;
+  const host = new DmEncounterHost(`session:rich-${operation}-${String(richOperationSequence)}`, store, {
+    initialState,
+    onReducerInvocation,
+  });
+  if (operation === 'placement') host.interrupt();
+  const binding = host.rendererTokenBindings()[0];
+  if (binding === undefined) throw new Error('Rich service fixture has no renderer binding.');
+  const seat: PlayerSeatRegistration = {
+    playerId: `player:${binding.combatantId}`,
+    seatId: `seat:${binding.combatantId}`,
+    observerCombatantId: binding.combatantId,
+    ownedCombatantIds: [binding.combatantId],
+    controlledTokenIds: [binding.tokenId],
+  };
+  const service = new RichEncounterSessionService(host, [seat]);
+  const projection = service.topDownSnapshot(seat.playerId);
+  if (projection === null) throw new Error('Rich service fixture has no top-down projection.');
+  const submit = (): Promise<HostCoordinatorTransactionOutcome> => {
+    switch (operation) {
+      case 'placement': {
+        const offered = projection.dm.pendingPlacementRecovery?.sizeOptions[0]?.legalAnchors[0];
+        if (offered === undefined) throw new Error('Placement fixture has no offered recovery anchor.');
+        return service.submitTopDownPlacement(offered.offeredActionId);
+      }
+      case 'world_object': {
+        const offered = projection.dm.worldObjectControls[0];
+        if (offered === undefined) throw new Error('World-object fixture has no offered control.');
+        return service.submitTopDownWorldObject(offered.offeredActionId);
+      }
+      case 'adjudication':
+        return service.applyTopDownAdjudication({
+          target: REFERENCE_MONSTER_ID,
+          hitPointDelta: -1,
+          reasoning: 'Exercise durability-backed manual adjudication.',
+        });
+    }
+  };
+  return { service, initialRevision: initialState.revision, submit };
+}
+
 function waitForOffer(
   service: EncounterSessionService,
   playerIds: readonly string[],
@@ -239,6 +362,109 @@
 }
 
 describe('encounter session service', () => {
+  it.each(['placement', 'world_object', 'adjudication'] as const)(
+    'does not commit the rich %s operation before its durability barrier',
+    async (operation) => {
+      const store = new ControlledFlushStore();
+      const commandType = operation === 'placement'
+        ? 'resolve_pending_placement'
+        : operation === 'world_object'
+          ? 'dm_use_world_object'
+          : 'adjudicate';
+      let operationReducerCalls = 0;
+      const fixture = richTopDownOperation(operation, store, (command) => {
+        if (command.type === commandType) operationReducerCalls += 1;
+      });
+      const mutationRevisions: number[] = [];
+      fixture.service.subscribeDm((event) => {
+        if (event.kind === 'mutation') mutationRevisions.push(event.projection.encounter.revision);
+      });
+      const barrier = store.blockFlushIn(1);
+      let settled = false;
+      const outcome = fixture.submit();
+      void outcome.then(() => { settled = true; });
+      await barrier.reached;
+      await Promise.resolve();
+
+      expect({ settled, operationReducerCalls, mutationRevisions }).toEqual({
+        settled: false,
+        operationReducerCalls: 1,
+        mutationRevisions: [],
+      });
+      barrier.release();
+      const committed = await outcome;
+      expect(committed).toEqual({ kind: 'committed', revision: fixture.initialRevision + 1 });
+      expect(mutationRevisions).toEqual([fixture.initialRevision + 1]);
+      expect(operationReducerCalls).toBe(1);
+      fixture.service.close();
+    },
+  );
+
+  it.each(['placement', 'world_object', 'adjudication'] as const)(
+    'reports a rejected rich %s write as post-apply failure without retrying',
+    async (operation) => {
+      const store = new ControlledFlushStore();
+      const commandType = operation === 'placement'
+        ? 'resolve_pending_placement'
+        : operation === 'world_object'
+          ? 'dm_use_world_object'
+          : 'adjudicate';
+      let operationReducerCalls = 0;
+      const fixture = richTopDownOperation(operation, store, (command) => {
+        if (command.type === commandType) operationReducerCalls += 1;
+      });
+      const mutationRevisions: number[] = [];
+      fixture.service.subscribeDm((event) => {
+        if (event.kind === 'mutation') mutationRevisions.push(event.projection.encounter.revision);
+      });
+      store.failNextFlush(new Error(`controlled ${operation} write failure`));
+
+      await expect(fixture.submit()).resolves.toMatchObject({
+        kind: 'failed',
+        phase: 'post_apply',
+        error: expect.objectContaining({ message: `controlled ${operation} write failure` }),
+        currentRevision: fixture.initialRevision + 1,
+      });
+      await expect(fixture.submit()).resolves.toEqual({ kind: 'closed' });
+      expect({ operationReducerCalls, mutationRevisions }).toEqual({
+        operationReducerCalls: 1,
+        mutationRevisions: [],
+      });
+      fixture.service.close();
+    },
+  );
+
+  it.each(['placement', 'world_object', 'adjudication'] as const)(
+    'settles a rich %s operation as closed during its unresolved write without retrying',
+    async (operation) => {
+      const store = new ControlledFlushStore();
+      const commandType = operation === 'placement'
+        ? 'resolve_pending_placement'
+        : operation === 'world_object'
+          ? 'dm_use_world_object'
+          : 'adjudicate';
+      let operationReducerCalls = 0;
+      const fixture = richTopDownOperation(operation, store, (command) => {
+        if (command.type === commandType) operationReducerCalls += 1;
+      });
+      const mutationRevisions: number[] = [];
+      fixture.service.subscribeDm((event) => {
+        if (event.kind === 'mutation') mutationRevisions.push(event.projection.encounter.revision);
+      });
+      const barrier = store.blockFlushIn(1);
+      const outcome = fixture.submit();
+      await barrier.reached;
+      fixture.service.close();
+      barrier.release();
+
+      await expect(outcome).resolves.toEqual({ kind: 'closed' });
+      expect({ operationReducerCalls, mutationRevisions }).toEqual({
+        operationReducerCalls: 1,
+        mutationRevisions: [],
+      });
+    },
+  );
+
   it('publishes an autonomous snapshot only after its durability barrier', async () => {
     const store = new ControlledFlushStore();
     const host = new DmEncounterHost('session:service-autonomous-durable', store);
