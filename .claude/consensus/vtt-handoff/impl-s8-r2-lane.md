Implemented both S8 fixes against `d8d13f3c`.

### Changes

- F88:
  - Placement and world-object UI projections now expose only revision-bound offered IDs.
  - Private command catalogs live in `RichEncounterSessionService`.
  - Manual adjudication submits a typed application intent; the service constructs the reducer command.
  - Added a symbol-derived boundary assertion prohibiting reducer command literals in the UI.
- F89:
  - Added one shared async submission handler covering `committed`, `refused`, `cancelled`, `closed`, `failed`, and rejected promises.
  - DM errors use `#channelError`; player-window errors are correlated by request ID and rendered as an alert.
  - Submission counters prove stale refusal, pre-apply failure, and rejection are never retried.

Changed files:

- [encounter-app.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/encounter-app.ts)
- [encounter-projections.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/encounter-projections.ts)
- [encounter-selectors.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/encounter-selectors.ts)
- [encounter-session-service.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/encounter-session-service.ts)
- [local-window-channel.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/local-window-channel.ts)
- [encounter-projections.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/encounter-projections.test.ts)
- [engine-boundary.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/engine-boundary.test.ts)

The rich façade is in `src/vtt/encounter-session-service.ts`, lines 642–850: 209 lines.

### Verification

All required gates exited 0 unless identified as the intentional red control.

- Focused F88/F89 and S8 assertions:

```sh
npx vitest run --configLoader runner tests/unit/vtt/encounter-projections.test.ts tests/unit/vtt/engine-boundary.test.ts -t "surfaces a stale offered-action refusal once|surfaces pre-apply failure and promise rejection|top-down UI mutations enter the rich session service|all runtime entries converge after top-down refactor|top-down UI constructs no reducer command literals"
```

5 passed, 16 skipped across 2 files.

- Touched unit suite:

```sh
npx vitest run --configLoader runner tests/unit/vtt/encounter-projections.test.ts tests/unit/vtt/encounter-session-service.test.ts tests/unit/vtt/encounter-selectors.test.ts tests/unit/vtt/engine-boundary.test.ts
```

46/46 passed across 4 files.

- Exact S8 boundaries:

```sh
npx vitest run --configLoader runner tests/unit/vtt/engine-boundary.test.ts -t "top-down UI mutations enter the rich session service|top-down UI constructs no reducer command literals|all runtime entries converge after top-down refactor"
```

3 passed, 9 skipped.

- Command-literal control:
  - Inserted temporary `adjudicate` literal in the UI.
  - Same boundary test failed, identifying `encounter-app.ts:1694`.
  - Byte-identical restoration passed: 1 passed, 11 skipped.
  - Expected mutant exit: 1; restored exit: 0.

- `npm run test:engine`: 49/49 passed across 4 files.
- `npm run test:protocol`: 71/71 passed across 4 files.
- Explicit S0–S9 cumulative command:

```sh
npx vitest run --configLoader runner \
  tests/unit/vtt/handoff-package-contract.test.ts \
  tests/unit/vtt/handoff-bootstrap.test.ts \
  tests/unit/vtt/handoff-contract.test.ts \
  tests/unit/vtt/scene-snapshot.test.ts \
  tests/unit/vtt/two-room-fixture.test.ts \
  tests/unit/vtt/handoff-publish.test.ts \
  tests/unit/vtt/handoff-examples.test.ts \
  tests/unit/vtt/session-lifecycle.test.ts \
  tests/unit/vtt/encounter-session-service.test.ts \
  tests/unit/vtt/door-intent.test.ts \
  tests/unit/vtt/encounter-selectors.test.ts \
  tests/unit/vtt/protocol-runtime.test.ts \
  tests/unit/vtt/in-process-transport.test.ts \
  tests/unit/vtt/worker-boundary.test.ts \
  tests/unit/vtt/serve-existing-dist.test.ts \
  tests/unit/vtt/engine-boundary.test.ts \
  tests/unit/vtt/uuidv7.test.ts \
  tests/unit/vtt/art-request.test.ts \
  tests/unit/vtt/png-validator.test.ts \
  tests/unit/vtt/art-validator.test.ts \
  tests/unit/vtt/art-stage.test.ts \
  tests/unit/vtt/windows-probe.test.ts \
  tests/unit/vtt/encounter-projections.test.ts \
  tests/unit/vtt/local-session-store.test.ts \
  tests/unit/vtt/session-persistence.test.ts \
  tests/unit/vtt/encounter-board-projection.test.ts \
  tests/unit/vtt/save-manager.test.ts \
  tests/unit/vtt/stable-dom-render.test.ts
```

28 files, 351/351 tests passed.

- Top-down smoke:

```sh
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 VTT_HANDOFF_ARTIFACT=dev npx playwright test --config=tests/browser/vtt-handoff/playwright.config.ts top-down-smoke.spec.ts
```

1/1 passed.

```text
artifact=dev page=http://127.0.0.1:4410/vtt?encounter=d365 offered=turn:1:combatant:character-5:1:option:0 destination=1,4
```

- Existing classic-board proof:

```sh
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 npx playwright test --config=/tmp/vtt-handoff-s8-playwright.config.ts vtt-encounter.spec.ts
```

3/3 passed.

- `npm run typecheck:fast`: exit 0.
- `sg scan`: exit 0, no findings.
- `git diff --check`: exit 0.
- No forbidden constructs found.

No `expect(` calls were removed or weakened. The retained exact service-edge expectation replaced the three old raw-command entries with:

- `applyTopDownAdjudication`
- `submitTopDownPlacement`
- `submitTopDownWorldObject`

Eight independent assertions were added.

Protected paths are unchanged. Verified hashes:

- Plan: `25816309e2a5e837611b312c069670ba904886c5111930de1deab441e5383a3d`
- Frozen contract: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`
- Examples fixture unchanged: `9fc9a587d6be9899168e06846e114f14e5dba93c8bcd032f69c5d1ef2d99480d`

HANDOFF S8 R2 DONE
diff --git a/src/vtt/encounter-app.ts b/src/vtt/encounter-app.ts
index 065e4a5f95cf24a5f404c8009b8c2518f5781a0a..7a81ff50b1112ade368ae80faa0aaab0c0536d9f
--- a/src/vtt/encounter-app.ts
+++ b/src/vtt/encounter-app.ts
@@ -49,16 +49,21 @@
 } from './encounter-board';
 import { encounterArtForBoard } from './encounter-art-selection';
 import type {
-  DmBoardProjection,
   DmMovementPathPreview,
   DmPendingPlacementRecovery,
   PlayerBoardProjection,
   ProjectedControllerRequest,
+  TopDownDmBoardProjection,
+  TopDownPendingPlacementRecovery,
 } from './encounter-projections';
 import {
   decodePlayerDecision,
+  handleTopDownSubmission,
   isHostWindowMessage,
+  isPlayerSubmissionFeedbackMessage,
   playerDecisionMessage,
+  playerSubmissionFeedbackMessage,
+  type TopDownSubmissionFeedback,
 } from './local-window-channel';
 import { IndexedDbBrowserSessionStore } from './local-session-store';
 import {
@@ -1085,6 +1090,8 @@
   #staged: EncounterCommand | null = null;
   #aimingSpell = false;
   #lastHeartbeat = 0;
+  #submissionError: string | null = null;
+  #pendingSubmissionRequestId: string | null = null;
   readonly #stackSelection: EncounterBoardStackSelection = new Map();
   readonly #heartbeatCheck: number;
   #boardView: AccessibleBoardViewMode;
@@ -1107,6 +1114,13 @@
   };
 
   #acceptHostMessage(value: unknown): void {
+    if (isPlayerSubmissionFeedbackMessage(value, this.sessionId)) {
+      if (value.requestId !== this.#pendingSubmissionRequestId) return;
+      this.#pendingSubmissionRequestId = null;
+      this.#submissionError = value.feedback.kind === 'error' ? value.feedback.message : null;
+      this.#render();
+      return;
+    }
     if (!isHostWindowMessage(value, this.sessionId)) return;
     this.#lastHeartbeat = Date.now();
     const unchanged =
@@ -1150,6 +1164,8 @@
     const selectedOfferedActionId = request.offeredActionIds[actionIndex];
     if (selectedOfferedActionId === undefined) return;
     const message = playerDecisionMessage(this.sessionId, request, selectedOfferedActionId);
+    this.#pendingSubmissionRequestId = request.requestId;
+    this.#submissionError = null;
     this.#channel.postMessage(message);
     this.#staged = null;
     this.#aimingSpell = false;
@@ -1235,6 +1251,12 @@
     });
     authority.dataset.state = connected ? 'connected' : 'hard-paused';
     this.#shell.append(authority);
+    if (this.#submissionError !== null) {
+      const error = element('p', { text: this.#submissionError });
+      error.dataset.submissionError = 'true';
+      error.setAttribute('role', 'alert');
+      this.#shell.append(error);
+    }
     const active = projection.combatants.find(
       (combatant) => combatant.id === projection.activeCombatant,
     );
@@ -1381,7 +1403,7 @@
   readonly #lifecycle: IndexedDbSessionLifecycle;
   readonly #channel: BroadcastChannel;
   #shell = element('main', { className: 'encounter-shell dm-encounter' });
-  #projection: DmBoardProjection | null = null;
+  #projection: TopDownDmBoardProjection | null = null;
   #channelError: string | null = null;
   #saveManagerError: string | null = null;
   #folderSaves: readonly SaveManagerEntry[] = [];
@@ -1615,13 +1637,15 @@
     if (pending === null || pending === undefined) return;
     try {
       const decision = decodePlayerDecision(value, this.sessionId, pending);
-      void this.#session.submitTopDownOfferedAction(
-        pending.actorId,
+      this.#submitTopDown(
+        () => this.#session.submitTopDownOfferedAction(
+          pending.actorId,
+          decision.requestId,
+          decision.encounterRevision,
+          decision.offeredActionId,
+        ),
         decision.requestId,
-        decision.encounterRevision,
-        decision.offeredActionId,
       );
-      this.#channelError = null;
     } catch (error: unknown) {
       if (error instanceof TypeError) {
         this.#channelError = error.message;
@@ -1654,14 +1678,33 @@
     ) ?? -1;
     const selectedOfferedActionId = this.#dmOfferedActionIds[actionIndex];
     if (selectedOfferedActionId === undefined) return;
-    void this.#session.submitTopDownOfferedAction(
+    this.#submitTopDown(() => this.#session.submitTopDownOfferedAction(
       pending.actorId,
       pending.requestId,
       pending.encounterRevision,
       selectedOfferedActionId,
-    );
+    ));
   }
 
+  #submitTopDown(
+    submit: () => ReturnType<RichEncounterSessionService['submitTopDownOfferedAction']>,
+    playerRequestId?: string,
+    onError?: () => void,
+  ): void {
+    void handleTopDownSubmission(submit, (feedback: TopDownSubmissionFeedback) => {
+      this.#channelError = feedback.kind === 'error' ? feedback.message : null;
+      if (feedback.kind === 'error') onError?.();
+      if (playerRequestId !== undefined) {
+        this.#channel.postMessage(playerSubmissionFeedbackMessage(
+          this.sessionId,
+          playerRequestId,
+          feedback,
+        ));
+      }
+      this.#render();
+    });
+  }
+
   #setMovementPreview(commandKey: string | null): void {
     if (this.#movementPreviewKey === commandKey) return;
     this.#movementPreviewKey = commandKey;
@@ -2027,7 +2070,7 @@
     this.#focusAfterRender = null;
   }
 
-  #renderPendingPlacementRecovery(recovery: DmPendingPlacementRecovery): HTMLElement {
+  #renderPendingPlacementRecovery(recovery: TopDownPendingPlacementRecovery): HTMLElement {
     const panel = renderPendingPlacementRecoveryHeading(recovery);
 
     const key = `${recovery.combatantId}:${recovery.reason}`;
@@ -2127,39 +2170,17 @@
       const selectedAnchor = selectedSize?.legalAnchors.find((entry) =>
         `${String(entry.anchor.column)},${String(entry.anchor.row)}:${entry.placementMode}` === anchor.value);
       if (selectedSize === undefined || selectedAnchor === undefined) return;
-      let command: Extract<EncounterCommand, { readonly type: 'resolve_pending_placement' }>;
-      switch (recovery.reason) {
-        case 'legacy_size_required':
-        case 'effect_adjudication_pending':
-          command = {
-            type: 'resolve_pending_placement',
-            combatant: recovery.combatantId,
-            anchor: selectedAnchor.anchor,
-            reason: recovery.reason,
-            size: selectedSize.size,
-          };
-          break;
-        case 'overlap_adjudication_pending':
-          command = {
-            type: 'resolve_pending_placement',
-            combatant: recovery.combatantId,
-            anchor: selectedAnchor.anchor,
-            reason: recovery.reason,
-          };
-          break;
-      }
-      const result = this.#session.resolvePendingPlacement(command);
-      if (result.kind === 'refused') {
-        this.#channelError = result.reason;
-        this.#focusAfterRender = 'recovery';
-        this.#render();
-      }
+      this.#submitTopDown(
+        () => this.#session.submitTopDownPlacement(selectedAnchor.offeredActionId),
+        undefined,
+        () => { this.#focusAfterRender = 'recovery'; },
+      );
     });
     panel.append(form);
     return panel;
   }
 
-  #renderDmBoard(projection: DmBoardProjection): void {
+  #renderDmBoard(projection: TopDownDmBoardProjection): void {
     const boardFog = new Set(projection.board.foggedCells.map(
       (cell) => `${String(cell.column)},${String(cell.row)}`,
     ));
@@ -2996,10 +3017,12 @@
         const button = element('button', { text: `${control.label} — ${control.objectName}` });
         button.type = 'button';
         button.dataset.renderKey = stableRenderKey(
-          'dm', 'world-object-controls', control.objectId, actionKey(control.command),
+          'dm', 'world-object-controls', control.objectId, control.offeredActionId,
         );
         button.dataset.objectId = control.objectId;
-        button.addEventListener('click', () => this.#session.dmUseWorldObject(control.command));
+        button.addEventListener('click', () => {
+          this.#submitTopDown(() => this.#session.submitTopDownWorldObject(control.offeredActionId));
+        });
         objectControls.append(button);
       }
     }
@@ -3035,13 +3058,11 @@
     );
     adjudication.addEventListener('submit', (event) => {
       event.preventDefault();
-      this.#session.adjudicate({
-        type: 'adjudicate',
+      this.#submitTopDown(() => this.#session.applyTopDownAdjudication({
         target: target.value as CombatantId,
-        subject: 'engine:manual-adjudication',
+        hitPointDelta: Number(delta.value),
         reasoning: reasoning.value,
-        consequence: { kind: 'hit_point_delta', amount: Number(delta.value) },
-      });
+      }));
     });
     this.#shell.append(adjudication);
 
diff --git a/src/vtt/encounter-projections.ts b/src/vtt/encounter-projections.ts
index 35c1a802c6892895fbeb9f9a829a470873a453e7..063664972e9d364f9457eed1e4e1b73555291d44
--- a/src/vtt/encounter-projections.ts
+++ b/src/vtt/encounter-projections.ts
@@ -181,6 +181,30 @@
   }[];
 }
 
+export interface TopDownWorldObjectControl {
+  readonly objectId: string;
+  readonly objectName: string;
+  readonly label: string;
+  readonly offeredActionId: string;
+}
+
+export interface TopDownPendingPlacementRecovery extends Omit<DmPendingPlacementRecovery, 'sizeOptions'> {
+  readonly sizeOptions: readonly {
+    readonly size: KnownCreatureSize;
+    readonly legalAnchors: readonly (PendingPlacementLegalAnchor & {
+      readonly offeredActionId: string;
+    })[];
+  }[];
+}
+
+export type TopDownDmBoardProjection = Omit<
+  DmBoardProjection,
+  'worldObjectControls' | 'pendingPlacementRecovery'
+> & {
+  readonly worldObjectControls: readonly TopDownWorldObjectControl[];
+  readonly pendingPlacementRecovery: TopDownPendingPlacementRecovery | null;
+};
+
 export interface DmMovementPathPreview extends MovementPathDangerPreview {
   readonly commandKey: string;
 }
diff --git a/src/vtt/encounter-selectors.ts b/src/vtt/encounter-selectors.ts
index 56f3c3c2d3a5eb0035b6c45d03abf205858bb88a..9f134d5703f0c0b0d3fa2c229d573871c5093437
--- a/src/vtt/encounter-selectors.ts
+++ b/src/vtt/encounter-selectors.ts
@@ -20,7 +20,7 @@
 }
 
 export function dmWorldObjectLabel(
-  projection: DmBoardProjection,
+  projection: Pick<DmBoardProjection, 'board'>,
   objectId: string,
 ): DmWorldObjectLabel | null {
   const object = projection.board.worldObjects?.find((candidate) => String(candidate.id) === objectId);
diff --git a/src/vtt/encounter-session-service.ts b/src/vtt/encounter-session-service.ts
index 82718d2291625d11d4de322536da24b3057eb870..f67db8e4cac20b97f135945c302bbf67a2fe27b8
--- a/src/vtt/encounter-session-service.ts
+++ b/src/vtt/encounter-session-service.ts
@@ -1,4 +1,5 @@
 import type { CombatantId, EncounterSessionId } from '../combat/values';
+import type { EncounterCommand } from '../combat/events';
 import type {
   DmEncounterHost,
   DmEncounterHostSnapshot,
@@ -13,6 +14,7 @@
   PlayerSeatBinding,
   RendererProjectionCapture,
   RendererTokenBinding,
+  TopDownDmBoardProjection,
 } from './encounter-projections';
 import { offeredActionId } from './encounter-projections';
 
@@ -631,13 +633,16 @@
 }
 
 export interface RichSessionSnapshot {
-  readonly dm: DmBoardProjection;
+  readonly dm: TopDownDmBoardProjection;
   readonly player: PlayerBoardProjection;
   readonly dmOfferedActionIds: readonly string[];
 }
 
 /** Typed in-process façade for the classic top-down renderer. */
 export class RichEncounterSessionService extends EncounterSessionService {
+  readonly #placementOffers = new Map<string, Extract<EncounterCommand, { readonly type: 'resolve_pending_placement' }>>();
+  readonly #worldObjectOffers = new Map<string, Extract<EncounterCommand, { readonly type: 'dm_use_world_object' }>>();
+
   constructor(
     private readonly richHost: DmEncounterHost,
     seats: readonly PlayerSeatRegistration[],
@@ -646,7 +651,7 @@
   }
 
   topDownSnapshot(playerId: string): RichSessionSnapshot | null {
-    const dm = this.dmSnapshot();
+    const dm = this.#topDownProjection(this.dmSnapshot());
     const player = this.playerSnapshot(playerId);
     return player === null ? null : {
       dm,
@@ -658,7 +663,7 @@
   }
 
   subscribeTopDown(playerId: string, listener: (snapshot: RichSessionSnapshot) => void): () => void {
-    const dmEvents = new Map<number, DmBoardProjection>();
+    const dmEvents = new Map<number, TopDownDmBoardProjection>();
     const playerEvents = new Map<number, PlayerBoardProjection>();
     const publish = (seq: number): void => {
       const dm = dmEvents.get(seq);
@@ -675,7 +680,7 @@
       });
     };
     const unsubscribeDm = this.subscribeDm((event) => {
-      dmEvents.set(event.seq, event.projection);
+      dmEvents.set(event.seq, this.#topDownProjection(event.projection));
       publish(event.seq);
     });
     const player = this.subscribePlayer(playerId, (event) => {
@@ -695,6 +700,55 @@
   }
 
   sessionEnded(): ReturnType<DmEncounterHost['sessionEnded']> { return this.richHost.sessionEnded(); }
+
+  #topDownProjection(dm: DmBoardProjection): TopDownDmBoardProjection {
+    this.#placementOffers.clear();
+    this.#worldObjectOffers.clear();
+    const revision = dm.encounter.revision;
+    const worldObjectControls = dm.worldObjectControls.map((control, index) => {
+      const selectedOfferedActionId = `top-down:${String(revision)}:world-object:${String(index)}`;
+      this.#worldObjectOffers.set(selectedOfferedActionId, control.command);
+      return {
+        objectId: control.objectId,
+        objectName: control.objectName,
+        label: control.label,
+        offeredActionId: selectedOfferedActionId,
+      };
+    });
+    const recovery = dm.pendingPlacementRecovery;
+    const pendingPlacementRecovery = recovery === null
+      ? null
+      : {
+          ...recovery,
+          sizeOptions: recovery.sizeOptions.map((sizeOption, sizeIndex) => ({
+            size: sizeOption.size,
+            legalAnchors: sizeOption.legalAnchors.map((anchor, anchorIndex) => {
+              const selectedOfferedActionId =
+                `top-down:${String(revision)}:placement:${String(sizeIndex)}:${String(anchorIndex)}`;
+              const command: Extract<EncounterCommand, { readonly type: 'resolve_pending_placement' }> =
+                recovery.reason === 'overlap_adjudication_pending'
+                  ? {
+                      type: 'resolve_pending_placement',
+                      combatant: recovery.combatantId,
+                      anchor: anchor.anchor,
+                      reason: recovery.reason,
+                    }
+                  : {
+                      type: 'resolve_pending_placement',
+                      combatant: recovery.combatantId,
+                      anchor: anchor.anchor,
+                      reason: recovery.reason,
+                      size: sizeOption.size,
+                    };
+              this.#placementOffers.set(selectedOfferedActionId, command);
+              return { ...anchor, offeredActionId: selectedOfferedActionId };
+            }),
+          })),
+        };
+    const { worldObjectControls: _commands, pendingPlacementRecovery: _placement, ...projection } = dm;
+    return { ...projection, worldObjectControls, pendingPlacementRecovery };
+  }
+
   submitTopDownOfferedAction(
     actorId: CombatantId,
     requestId: string,
@@ -708,9 +762,40 @@
       selectedOfferedActionId,
     );
   }
-  resolvePendingPlacement(...args: Parameters<DmEncounterHost['resolvePendingPlacement']>): ReturnType<DmEncounterHost['resolvePendingPlacement']> {
-    return this.richHost.resolvePendingPlacement(...args);
+
+  async submitTopDownPlacement(selectedOfferedActionId: string): Promise<HostCoordinatorTransactionOutcome> {
+    const command = this.#placementOffers.get(selectedOfferedActionId);
+    if (command === undefined) return { kind: 'refused', reason: 'The offered placement is stale or unknown.' };
+    const result = this.richHost.resolvePendingPlacement(command);
+    return result.kind === 'refused'
+      ? { kind: 'refused', reason: result.reason }
+      : { kind: 'committed', revision: result.state.revision };
   }
+
+  async submitTopDownWorldObject(selectedOfferedActionId: string): Promise<HostCoordinatorTransactionOutcome> {
+    const command = this.#worldObjectOffers.get(selectedOfferedActionId);
+    if (command === undefined) return { kind: 'refused', reason: 'The offered world-object action is stale or unknown.' };
+    this.richHost.dmUseWorldObject(command);
+    return { kind: 'committed', revision: this.richHost.snapshot().dm.encounter.revision };
+  }
+
+  async applyTopDownAdjudication(intent: {
+    readonly target: CombatantId;
+    readonly hitPointDelta: number;
+    readonly reasoning: string;
+  }): Promise<HostCoordinatorTransactionOutcome> {
+    if (!Number.isSafeInteger(intent.hitPointDelta)) {
+      return { kind: 'refused', reason: 'The adjudication hit-point delta must be a safe integer.' };
+    }
+    this.richHost.adjudicate({
+      type: 'adjudicate',
+      target: intent.target,
+      subject: 'engine:manual-adjudication',
+      reasoning: intent.reasoning,
+      consequence: { kind: 'hit_point_delta', amount: intent.hitPointDelta },
+    });
+    return { kind: 'committed', revision: this.richHost.snapshot().dm.encounter.revision };
+  }
   interrupt(...args: Parameters<DmEncounterHost['interrupt']>): ReturnType<DmEncounterHost['interrupt']> {
     return this.richHost.interrupt(...args);
   }
@@ -758,12 +843,6 @@
   }
   setHiddenRollCategory(...args: Parameters<DmEncounterHost['setHiddenRollCategory']>): ReturnType<DmEncounterHost['setHiddenRollCategory']> {
     return this.richHost.setHiddenRollCategory(...args);
-  }
-  dmUseWorldObject(...args: Parameters<DmEncounterHost['dmUseWorldObject']>): ReturnType<DmEncounterHost['dmUseWorldObject']> {
-    return this.richHost.dmUseWorldObject(...args);
-  }
-  adjudicate(...args: Parameters<DmEncounterHost['adjudicate']>): ReturnType<DmEncounterHost['adjudicate']> {
-    return this.richHost.adjudicate(...args);
   }
   replaceController(...args: Parameters<DmEncounterHost['replaceController']>): ReturnType<DmEncounterHost['replaceController']> {
     return this.richHost.replaceController(...args);
diff --git a/src/vtt/local-window-channel.ts b/src/vtt/local-window-channel.ts
index 9e439ee6ba2c7a39d46411ce7f41ebd11cca97be..167029151d45010ea1e1cade7b0ebf6e237a0139
--- a/src/vtt/local-window-channel.ts
+++ b/src/vtt/local-window-channel.ts
@@ -1,6 +1,7 @@
 import type { ControllerRequest } from '../combat/controllers';
 import { offeredActionId } from './encounter-projections';
 import type { PlayerBoardProjection } from './encounter-projections';
+import type { HostCoordinatorTransactionOutcome } from './dm-encounter-host';
 
 export interface HostWindowMessage {
   readonly kind: 'player_projection';
@@ -18,6 +19,17 @@
   };
 }
 
+export type TopDownSubmissionFeedback =
+  | { readonly kind: 'committed' }
+  | { readonly kind: 'error'; readonly message: string };
+
+export interface PlayerSubmissionFeedbackMessage {
+  readonly kind: 'human_controller_decision_result';
+  readonly sessionId: string;
+  readonly requestId: string;
+  readonly feedback: TopDownSubmissionFeedback;
+}
+
 function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
   return typeof value === 'object' && value !== null && !Array.isArray(value);
 }
@@ -71,6 +83,59 @@
   };
 }
 
+function errorMessage(error: unknown): string {
+  return error instanceof Error ? error.message : 'The top-down submission failed.';
+}
+
+export async function handleTopDownSubmission(
+  submit: () => Promise<HostCoordinatorTransactionOutcome>,
+  surface: (feedback: TopDownSubmissionFeedback) => void,
+): Promise<void> {
+  try {
+    const outcome = await submit();
+    switch (outcome.kind) {
+      case 'committed':
+        surface({ kind: 'committed' });
+        return;
+      case 'refused':
+      case 'cancelled':
+        surface({ kind: 'error', message: outcome.reason });
+        return;
+      case 'closed':
+        surface({ kind: 'error', message: 'The encounter session is closed.' });
+        return;
+      case 'failed':
+        surface({
+          kind: 'error',
+          message: `${outcome.phase === 'pre_apply' ? 'Before applying' : 'After applying'}: ${errorMessage(outcome.error)}`,
+        });
+        return;
+    }
+  } catch (error: unknown) {
+    surface({ kind: 'error', message: errorMessage(error) });
+  }
+}
+
+export function playerSubmissionFeedbackMessage(
+  sessionId: string,
+  requestId: string,
+  feedback: TopDownSubmissionFeedback,
+): PlayerSubmissionFeedbackMessage {
+  return { kind: 'human_controller_decision_result', sessionId, requestId, feedback };
+}
+
+export function isPlayerSubmissionFeedbackMessage(
+  value: unknown,
+  sessionId: string,
+): value is PlayerSubmissionFeedbackMessage {
+  if (!isRecord(value) || value.kind !== 'human_controller_decision_result' || value.sessionId !== sessionId) {
+    return false;
+  }
+  if (typeof value.requestId !== 'string' || !isRecord(value.feedback)) return false;
+  return value.feedback.kind === 'committed' ||
+    (value.feedback.kind === 'error' && typeof value.feedback.message === 'string');
+}
+
 export function isHostWindowMessage(
   value: unknown,
   sessionId: string,
diff --git a/tests/unit/vtt/encounter-projections.test.ts b/tests/unit/vtt/encounter-projections.test.ts
index 3c151fce348d78a18bca0483399a4d9ae00f9f7e..55883bc8a13411de7bd163c963e4aaf87aec0488
--- a/tests/unit/vtt/encounter-projections.test.ts
+++ b/tests/unit/vtt/encounter-projections.test.ts
@@ -12,8 +12,14 @@
   serializePlayerBoard,
   offeredActionId,
 } from '../../../src/vtt/encounter-projections';
-import { decodePlayerDecision } from '../../../src/vtt/local-window-channel';
 import {
+  decodePlayerDecision,
+  handleTopDownSubmission,
+  isPlayerSubmissionFeedbackMessage,
+  playerSubmissionFeedbackMessage,
+  type TopDownSubmissionFeedback,
+} from '../../../src/vtt/local-window-channel';
+import {
   REFERENCE_CLERIC_ID,
   REFERENCE_FIGHTER_ID,
   REFERENCE_MONSTER_ID,
@@ -255,6 +261,50 @@
     }, 'session:test', request)).toThrow('not one of the projected offered action IDs');
   });
 
+  it('surfaces a stale offered-action refusal once without retrying', async () => {
+    let submissions = 0;
+    let surfaced: TopDownSubmissionFeedback | null = null;
+    await handleTopDownSubmission(async () => {
+      submissions += 1;
+      return { kind: 'refused', reason: 'The offered controller request is stale.' };
+    }, (feedback) => { surfaced = feedback; });
+
+    expect(submissions).toBe(1);
+    expect(surfaced).toEqual({ kind: 'error', message: 'The offered controller request is stale.' });
+    if (surfaced === null) throw new Error('The stale refusal was not surfaced.');
+    const message = playerSubmissionFeedbackMessage('session:test', 'request:stale', surfaced);
+    expect(isPlayerSubmissionFeedbackMessage(message, 'session:test')).toBe(true);
+    expect(isPlayerSubmissionFeedbackMessage(message, 'session:other')).toBe(false);
+  });
+
+  it('surfaces pre-apply failure and promise rejection without retrying either submission', async () => {
+    const surfaced: TopDownSubmissionFeedback[] = [];
+    let failedSubmissions = 0;
+    await handleTopDownSubmission(async () => {
+      failedSubmissions += 1;
+      return {
+        kind: 'failed',
+        phase: 'pre_apply',
+        error: new Error('controlled append failure'),
+        currentRevision: 4,
+      };
+    }, (feedback) => { surfaced.push(feedback); });
+    let rejectedSubmissions = 0;
+    await handleTopDownSubmission(async () => {
+      rejectedSubmissions += 1;
+      throw new Error('controlled stale-request rejection');
+    }, (feedback) => { surfaced.push(feedback); });
+
+    expect({ failedSubmissions, rejectedSubmissions }).toEqual({
+      failedSubmissions: 1,
+      rejectedSubmissions: 1,
+    });
+    expect(surfaced).toEqual([
+      { kind: 'error', message: 'Before applying: controlled append failure' },
+      { kind: 'error', message: 'controlled stale-request rejection' },
+    ]);
+  });
+
   it('M42-ADJUDICATION-PAUSES cancels the pending request and dispatches nothing until resume', async () => {
     const host = new DmEncounterHost('session:adjudication-pause', new MemoryBrowserSessionStore());
     host.start();
diff --git a/tests/unit/vtt/engine-boundary.test.ts b/tests/unit/vtt/engine-boundary.test.ts
index f635c5517a1d74ec9058ce1c3c06ea028effca78..e0837bf225e232da30a7a71dda7337422cf09b31
--- a/tests/unit/vtt/engine-boundary.test.ts
+++ b/tests/unit/vtt/engine-boundary.test.ts
@@ -341,6 +341,55 @@
   return [...new Set(definitions)].sort();
 }
 
+function encounterCommandLiteralSites(
+  graph: ReadonlyMap<string, SourceModule>,
+  file: string,
+): readonly string[] {
+  const program = ts.createProgram({
+    rootNames: [...graph.keys()],
+    options: {
+      module: ts.ModuleKind.ESNext,
+      moduleResolution: ts.ModuleResolutionKind.Bundler,
+      noLib: true,
+      skipLibCheck: true,
+      target: ts.ScriptTarget.ESNext,
+      types: [],
+    },
+  });
+  const checker = program.getTypeChecker();
+  const events = program.getSourceFile(resolve(ROOT, 'src/combat/events.ts'));
+  const sourceFile = program.getSourceFile(resolve(ROOT, file));
+  if (events === undefined || sourceFile === undefined) throw new Error('Command-literal graph is incomplete.');
+  const commandDeclaration = events.statements.find((statement): statement is ts.TypeAliasDeclaration =>
+    ts.isTypeAliasDeclaration(statement) && statement.name.text === 'EncounterCommand');
+  if (commandDeclaration === undefined) throw new Error('EncounterCommand type alias is unavailable.');
+  const symbol = checker.getSymbolAtLocation(commandDeclaration.name);
+  if (symbol === undefined) throw new Error('EncounterCommand symbol is unavailable.');
+  const commandType = checker.getDeclaredTypeOfSymbol(symbol);
+  const commandKinds = new Set<string>();
+  for (const member of commandType.isUnion() ? commandType.types : [commandType]) {
+    const discriminator = member.getProperty('type');
+    if (discriminator === undefined) continue;
+    const discriminatorType = checker.getTypeOfSymbolAtLocation(discriminator, commandDeclaration);
+    if (discriminatorType.isStringLiteral()) commandKinds.add(discriminatorType.value);
+  }
+  const sites: string[] = [];
+  const visit = (node: ts.Node): void => {
+    if (ts.isObjectLiteralExpression(node)) {
+      const discriminator = node.properties.find((property): property is ts.PropertyAssignment =>
+        ts.isPropertyAssignment(property) && property.name.getText(sourceFile) === 'type');
+      if (discriminator !== undefined && ts.isStringLiteralLike(discriminator.initializer) &&
+        commandKinds.has(discriminator.initializer.text)) {
+        const line = sourceFile.getLineAndCharacterOfPosition(discriminator.getStart(sourceFile)).line + 1;
+        sites.push(`${repositoryPath(sourceFile.fileName)}:${String(line)} type=${discriminator.initializer.text}`);
+      }
+    }
+    ts.forEachChild(node, visit);
+  };
+  ts.forEachChild(sourceFile, visit);
+  return sites;
+}
+
 function selectorAuthorityViolations(file: string): readonly string[] {
   const sourceFile = ts.createSourceFile(
     file,
@@ -503,10 +552,9 @@
     const graph = dependencyGraph(['src/vtt/encounter-app.ts']);
     const serviceCalls = memberCallDefinitions(graph, 'src/vtt/encounter-app.ts', 'this.#session');
     expect(serviceCalls).toEqual([
-      'adjudicate -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
+      'applyTopDownAdjudication -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
       'close -> src/vtt/encounter-session-service.ts#EncounterSessionService',
       'delayTurn -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
-      'dmUseWorldObject -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
       'endSession -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
       'finishAdventuringDay -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
       'finishRoom -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
@@ -514,7 +562,6 @@
       'replaceController -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
       'resolveEngineAdjudication -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
       'resolvePendingDecision -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
-      'resolvePendingPlacement -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
       'resolveRefusalPrompt -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
       'resolveRestInterruption -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
       'resume -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
@@ -526,6 +573,8 @@
       'skipTurn -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
       'start -> src/vtt/encounter-session-service.ts#EncounterSessionService',
       'submitTopDownOfferedAction -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
+      'submitTopDownPlacement -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
+      'submitTopDownWorldObject -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
       'subscribeTopDown -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
       'topDownSnapshot -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
       'undoLast -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
@@ -536,6 +585,16 @@
     expect(readFileSync(resolve(ROOT, 'src/vtt/encounter-app.ts'), 'utf8')).not.toContain('this.#host');
   });
 
+  it('top-down UI constructs no reducer command literals', () => {
+    const graph = dependencyGraph(['src/vtt/encounter-app.ts']);
+    expect(encounterCommandLiteralSites(graph, 'src/vtt/encounter-app.ts')).toEqual([]);
+    expect(encounterCommandLiteralSites(graph, 'src/vtt/encounter-session-service.ts')).toEqual([
+      expect.stringMatching(/encounter-session-service\.ts:\d+ type=resolve_pending_placement$/u),
+      expect.stringMatching(/encounter-session-service\.ts:\d+ type=resolve_pending_placement$/u),
+      expect.stringMatching(/encounter-session-service\.ts:\d+ type=adjudicate$/u),
+    ]);
+  });
+
   it('all runtime entries converge after top-down refactor', () => {
     const graph = dependencyGraph([...CORE_ENTRYPOINTS, 'src/vtt/encounter-app.ts']);
     const typeScriptGraph = new Map([...graph].filter(([file]) => /\.tsx?$/u.test(file)));
