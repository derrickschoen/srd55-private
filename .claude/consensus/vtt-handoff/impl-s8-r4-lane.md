Implemented exactly F92 and F93 against `8689ac01`.

### Changes

- [dm-encounter-host.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/dm-encounter-host.ts)
  - Added explicit per-call top-down transaction waiters.
  - `close()` immediately settles every active and queued caller as `closed`.
  - The authoritative flush continues untouched.
  - Already-settled queued calls never execute.
  - Mutation notifications are captured at the applied revision before awaiting durability, then delivered only after the flush succeeds.

- [encounter-session-service.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/encounter-session-service.test.ts)
  - F92: all three rich operations prove active and queued outcomes settle before barrier release, with one execution, no mutation publication, and no second settlement after release.
  - F93: adjudication captures revision N, another UI operation advances live state to N+1, and the eventual acknowledgement/event both remain revision N.

Only these two files changed: 116 insertions, 13 deletions.

### Verification

Focused F92/F93:

```sh
npx vitest run --configLoader runner tests/unit/vtt/encounter-session-service.test.ts -t "settles active and queued rich|captured durable adjudication revision"
```

1 file, 4 passed, 28 skipped, exit 0.

Touched unit suite:

```sh
npx vitest run --configLoader runner tests/unit/vtt/encounter-projections.test.ts tests/unit/vtt/encounter-session-service.test.ts tests/unit/vtt/encounter-selectors.test.ts tests/unit/vtt/engine-boundary.test.ts
```

4 files, 57/57 passed.

S8 boundary assertions:

```sh
npx vitest run --configLoader runner tests/unit/vtt/engine-boundary.test.ts -t "top-down UI mutations enter the rich session service|top-down UI constructs no reducer command literals|all runtime entries converge after top-down refactor"
```

1 file, 3 passed, 9 skipped.

Additional gates:

- `npm run test:engine`: 4 files, 59/59 passed.
- `npm run test:protocol`: 4 files, 71/71 passed.
- Explicit 28-spec cumulative Vitest run: 28 files, 362/362 passed.
- `npm run typecheck:fast`: exit 0.
- `sg scan`: exit 0.
- `git diff --check`: exit 0.

Top-down smoke:

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

### Changed assertions

The previous closure assertions:

- `await expect(outcome)...closed`
- `{ operationReducerCalls, mutationRevisions }`

were replaced with stronger assertions that:

- both active and queued promises resolve `closed` before barrier release;
- settlement counts are `[1, 1]`;
- exactly one authoritative operation executes;
- publication count does not change after the flush completes;
- no mutation event is emitted.

F93 adds independent assertions for:

- live revision advancing to N+1;
- no premature mutation event;
- exact committed revision N;
- emitted mutation revision equal to N;
- live state remaining N+1;
- exactly one adjudication execution.

No assertion was weakened or deleted without a stronger replacement.

Protected hashes remain unchanged:

- Plan: `25816309e2a5e837611b312c069670ba904886c5111930de1deab441e5383a3d`
- Frozen contract: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`
- Examples fixture: `9fc9a587d6be9899168e06846e114f14e5dba93c8bcd032f69c5d1ef2d99480d`

HANDOFF S8 R4 DONE
diff --git a/src/vtt/dm-encounter-host.ts b/src/vtt/dm-encounter-host.ts
index 7adf91bf03f2985707bcdee0abe3da474c5af750..0f07ed9253934500c48f73d88ade46045aa70f4b
--- a/src/vtt/dm-encounter-host.ts
+++ b/src/vtt/dm-encounter-host.ts
@@ -263,6 +263,11 @@
   readonly resolve: (outcome: HostCoordinatorTransactionOutcome) => void;
 }
 
+interface HostTopDownTransactionWaiter {
+  settled: boolean;
+  readonly resolve: (outcome: HostCoordinatorTransactionOutcome) => void;
+}
+
 type FreshOfferOutcome =
   | { readonly kind: 'fresh' }
   | { readonly kind: 'closed' }
@@ -319,6 +324,7 @@
   readonly #notificationListeners = new Set<(notification: HostSnapshotNotification) => void>();
   readonly #subscriberErrors: HostSubscriberError[] = [];
   readonly #transactionWaiters = new Map<string, HostTransactionWaiter>();
+  readonly #topDownTransactionWaiters = new Set<HostTopDownTransactionWaiter>();
   readonly #freshOfferWaiters = new Set<FreshOfferWaiter>();
   #activeTransactionRequestId: string | null = null;
   #journal: EncounterSessionJournal;
@@ -1532,14 +1538,41 @@
     apply: () => CoordinatorStep,
     afterCommit?: () => void,
   ): Promise<HostCoordinatorTransactionOutcome> {
-    const outcome = this.#topDownMutationTail.then(() => this.#settleTopDownMutation(
-      apply,
-      afterCommit,
-    ));
-    this.#topDownMutationTail = outcome.then(() => undefined, () => undefined);
+    let resolveOutcome: ((outcome: HostCoordinatorTransactionOutcome) => void) | undefined;
+    const outcome = new Promise<HostCoordinatorTransactionOutcome>((resolve) => {
+      resolveOutcome = resolve;
+    });
+    if (resolveOutcome === undefined) throw new Error('Top-down transaction waiter was not initialized.');
+    const waiter: HostTopDownTransactionWaiter = { settled: false, resolve: resolveOutcome };
+    this.#topDownTransactionWaiters.add(waiter);
+    const run = this.#topDownMutationTail.then(async () => {
+      if (waiter.settled || this.#closed) {
+        this.#settleTopDownTransaction(waiter, { kind: 'closed' });
+        return;
+      }
+      const terminal = await this.#settleTopDownMutation(apply, afterCommit);
+      this.#settleTopDownTransaction(waiter, terminal);
+    });
+    this.#topDownMutationTail = run.catch(() => undefined);
     return outcome;
   }
 
+  #settleTopDownTransaction(
+    waiter: HostTopDownTransactionWaiter,
+    outcome: HostCoordinatorTransactionOutcome,
+  ): void {
+    if (waiter.settled) return;
+    waiter.settled = true;
+    this.#topDownTransactionWaiters.delete(waiter);
+    waiter.resolve(outcome);
+  }
+
+  #settleAllTopDownTransactions(outcome: HostCoordinatorTransactionOutcome): void {
+    for (const waiter of [...this.#topDownTransactionWaiters]) {
+      this.#settleTopDownTransaction(waiter, outcome);
+    }
+  }
+
   async #settleTopDownMutation(
     apply: () => CoordinatorStep,
     afterCommit?: () => void,
@@ -1560,7 +1593,19 @@
       return { kind: 'failed', phase, error, currentRevision };
     }
     if (result.kind === 'refused') return { kind: 'refused', reason: result.reason };
+    let mutationNotification: HostSnapshotNotification;
     try {
+      mutationNotification = this.#captureNotification('mutation');
+    } catch (error: unknown) {
+      if (!this.#closed) this.#degradeAfterApplicationFailure();
+      return {
+        kind: 'failed',
+        phase: 'post_apply',
+        error,
+        currentRevision: this.#coordinator.state().revision,
+      };
+    }
+    try {
       await this.#store.flush();
     } catch (error: unknown) {
       if (this.#closed) return { kind: 'closed' };
@@ -1578,7 +1623,7 @@
       revision: result.state.revision,
     };
     try {
-      this.#publish('mutation');
+      this.#deliverNotification(mutationNotification);
       afterCommit?.();
     } catch (error: unknown) {
       if (!this.#closed) this.#degradeAfterApplicationFailure();
@@ -1858,6 +1903,7 @@
     }
     this.#closed = true;
     this.#repumpBlocked = false;
+    this.#settleAllTopDownTransactions({ kind: 'closed' });
     this.#publish('status');
     this.#settleAllTransactions({ kind: 'closed' });
     this.#settleFreshOfferWaiters({ kind: 'closed' });
diff --git a/tests/unit/vtt/encounter-session-service.test.ts b/tests/unit/vtt/encounter-session-service.test.ts
index 99e11843020be9a1fb6d2a11c00d28eb6deb7723..a79a943d5bb3881ec04511fd9c4fa417028d81ff
--- a/tests/unit/vtt/encounter-session-service.test.ts
+++ b/tests/unit/vtt/encounter-session-service.test.ts
@@ -47,18 +47,24 @@
   #release: (() => void) | null = null;
   #blockCountdown: number | null = null;
   #markReached: (() => void) | null = null;
+  #markCompleted: (() => void) | null = null;
   #nextFailure: Error | null = null;
 
   blockNextFlush(): () => void {
     return this.blockFlushIn(1).release;
   }
 
-  blockFlushIn(count: number): { readonly reached: Promise<void>; readonly release: () => void } {
+  blockFlushIn(count: number): {
+    readonly reached: Promise<void>;
+    readonly completed: Promise<void>;
+    readonly release: () => void;
+  } {
     if (count < 1 || !Number.isSafeInteger(count)) throw new RangeError('Flush count must be positive.');
     this.#blockCountdown = count;
     this.#blocked = new Promise((resolve) => { this.#release = resolve; });
     const reached = new Promise<void>((resolve) => { this.#markReached = resolve; });
-    return { reached, release: () => this.#release?.() };
+    const completed = new Promise<void>((resolve) => { this.#markCompleted = resolve; });
+    return { reached, completed, release: () => this.#release?.() };
   }
 
   failNextFlush(error: Error): void {
@@ -75,6 +81,8 @@
         this.#markReached?.();
         this.#markReached = null;
         if (blocked !== null) await blocked;
+        this.#markCompleted?.();
+        this.#markCompleted = null;
       }
     }
     const failure = this.#nextFailure;
@@ -435,7 +443,7 @@
   );
 
   it.each(['placement', 'world_object', 'adjudication'] as const)(
-    'settles a rich %s operation as closed during its unresolved write without retrying',
+    'settles active and queued rich %s operations before the unresolved write completes',
     async (operation) => {
       const store = new ControlledFlushStore();
       const commandType = operation === 'placement'
@@ -448,23 +456,72 @@
         if (command.type === commandType) operationReducerCalls += 1;
       });
       const mutationRevisions: number[] = [];
+      const publishedKinds: string[] = [];
       fixture.service.subscribeDm((event) => {
+        publishedKinds.push(event.kind);
         if (event.kind === 'mutation') mutationRevisions.push(event.projection.encounter.revision);
       });
       const barrier = store.blockFlushIn(1);
-      const outcome = fixture.submit();
+      const settlements = [0, 0];
+      const active = fixture.submit();
+      const queued = fixture.submit();
+      void active.then(() => { settlements[0] = (settlements[0] ?? 0) + 1; });
+      void queued.then(() => { settlements[1] = (settlements[1] ?? 0) + 1; });
       await barrier.reached;
       fixture.service.close();
-      barrier.release();
+      const publicationsAtClosure = publishedKinds.length;
 
-      await expect(outcome).resolves.toEqual({ kind: 'closed' });
-      expect({ operationReducerCalls, mutationRevisions }).toEqual({
+      await expect(Promise.all([active, queued])).resolves.toEqual([
+        { kind: 'closed' },
+        { kind: 'closed' },
+      ]);
+      expect({ operationReducerCalls, mutationRevisions, settlements, publicationsAtClosure }).toEqual({
         operationReducerCalls: 1,
         mutationRevisions: [],
+        settlements: [1, 1],
+        publicationsAtClosure: 2,
       });
+      barrier.release();
+      await barrier.completed;
+      await Promise.resolve();
+      await Promise.resolve();
+      expect({ operationReducerCalls, mutationRevisions, settlements, publications: publishedKinds.length }).toEqual({
+        operationReducerCalls: 1,
+        mutationRevisions: [],
+        settlements: [1, 1],
+        publications: publicationsAtClosure,
+      });
     },
   );
 
+  it('delivers the captured durable adjudication revision after later UI state advances', async () => {
+    const store = new ControlledFlushStore();
+    let adjudicationCalls = 0;
+    const fixture = richTopDownOperation('adjudication', store, (command) => {
+      if (command.type === 'adjudicate') adjudicationCalls += 1;
+    });
+    const mutationRevisions: number[] = [];
+    fixture.service.subscribeDm((event) => {
+      if (event.kind === 'mutation') mutationRevisions.push(event.projection.encounter.revision);
+    });
+    const barrier = store.blockFlushIn(1);
+    const outcome = fixture.submit();
+    await barrier.reached;
+    await fixture.service.setHiddenRollCategory('death_saves', true);
+    const advancedRevision = fixture.service.dmSnapshot().encounter.revision;
+    expect(advancedRevision).toBe(fixture.initialRevision + 2);
+    expect(mutationRevisions).toEqual([]);
+
+    barrier.release();
+    const committed = await outcome;
+    expect(committed).toEqual({ kind: 'committed', revision: fixture.initialRevision + 1 });
+    if (committed.kind !== 'committed') throw new Error(`Expected committed, received ${committed.kind}.`);
+    expect(mutationRevisions).toEqual([committed.revision]);
+    expect(fixture.service.dmSnapshot().encounter.revision).toBe(advancedRevision);
+    expect(adjudicationCalls).toBe(1);
+    fixture.service.close();
+  });
+
   it('publishes an autonomous snapshot only after its durability barrier', async () => {
     const store = new ControlledFlushStore();
     const host = new DmEncounterHost('session:service-autonomous-durable', store);
