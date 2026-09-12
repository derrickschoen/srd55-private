Resolved all three conflict hunks in [dm-encounter-host.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/dm-encounter-host.ts:366):

- Retained both `#onReducerInvocation` and immutable `#offerEnvironment`.
- Retained both constructor options.
- Initialized both the S8 reducer hook and main’s explicit legacy offer-environment default.
- Preserved the S8 queue, per-call waiters, pre-flush captured projection, applied revision, durability barrier, and close settlement.
- Preserved main’s environment binding and schema-4 capsule behavior.
- No other tracked file was edited. The file remains `UU` because staging is reserved for the supervisor.
- No `expect(` assertions were changed.

Verification:

- Conflict markers: 0 matches.
- `npm run typecheck:fast`: exit 0.
- `sg scan`: exit 0, 0 findings.
- `git diff --check`: exit 0.
- Frozen contract SHA-256: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.

Targeted reconciliation battery:

```sh
npx vitest run --configLoader runner \
 tests/unit/vtt/encounter-session-service.test.ts \
 tests/unit/vtt/encounter-projections.test.ts \
 tests/unit/vtt/engine-boundary.test.ts \
 tests/unit/vtt/offer-environment.test.ts \
 tests/unit/vtt/engine-state-capsule.test.ts \
 tests/unit/tools/engine-mcp-boundary.test.ts \
 tests/unit/tools/ai-dm-board-delivery.test.ts
```

Exit 0: 7 files, 98 tests passed.

```sh
npm run test:engine
```

Exit 0: 4 files, 66 tests passed.

```sh
npm run test:protocol
```

Exit 0: 4 files, 78 tests passed.

Exact historical 33-spec S7 merge union:

```sh
npx vitest run --configLoader runner \
 tests/unit/vtt/handoff-bootstrap.test.ts \
 tests/unit/vtt/handoff-contract.test.ts \
 tests/unit/vtt/scene-snapshot.test.ts \
 tests/unit/vtt/two-room-fixture.test.ts \
 tests/unit/vtt/door-intent.test.ts \
 tests/unit/vtt/encounter-selectors.test.ts \
 tests/unit/vtt/encounter-session-service.test.ts \
 tests/unit/vtt/engine-boundary.test.ts \
 tests/unit/vtt/local-session-store.test.ts \
 tests/unit/vtt/session-lifecycle.test.ts \
 tests/unit/vtt/session-persistence.test.ts \
 tests/unit/vtt/handoff-examples.test.ts \
 tests/unit/vtt/in-process-transport.test.ts \
 tests/unit/vtt/protocol-runtime.test.ts \
 tests/unit/vtt/worker-boundary.test.ts \
 tests/unit/vtt/serve-existing-dist.test.ts \
 tests/unit/vtt/art-request.test.ts \
 tests/unit/vtt/art-stage.test.ts \
 tests/unit/vtt/art-validator.test.ts \
 tests/unit/vtt/png-validator.test.ts \
 tests/unit/vtt/uuidv7.test.ts \
 tests/unit/vtt/windows-probe.test.ts \
 tests/unit/vtt/encounter-projections.test.ts \
 tests/unit/vtt/encounter-board-projection.test.ts \
 tests/unit/vtt/preview-hidden-rolls.test.ts \
 tests/unit/vtt/semantic-board-payload.test.ts \
 tests/unit/vtt/detection-ui.test.ts \
 tests/unit/vtt/controller-assignment.test.ts \
 tests/unit/vtt/node-runtime.test.ts \
 tests/unit/vtt/node-websocket-transport.test.ts \
 tests/unit/vtt/runtime-parity.test.ts \
 tests/unit/vtt/handoff-package-contract.test.ts \
 tests/unit/vtt/handoff-publish.test.ts
```

Exit 0: 33 files, 379 tests passed.

Browser proofs:

```sh
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 VTT_HANDOFF_ARTIFACT=dev \
npx playwright test \
--config=tests/browser/vtt-handoff/playwright.config.ts \
top-down-smoke.spec.ts
```

Exit 0: 1/1 passed.

```text
artifact=dev page=http://127.0.0.1:4410/vtt?encounter=d365 offered=turn:1:combatant:character-5:1:option:0 destination=1,4
```

```sh
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 \
npx playwright test \
--config=/tmp/vtt-handoff-main-merge-playwright.config.ts \
tests/browser/vtt-encounter.spec.ts
```

Exit 0: 3/3 passed in 1.4 minutes. The temporary wrapper used absolute `testDir` and server cwd and was removed afterward.

One discarded cumulative reconstruction included the unrelated global `mutation-ledger.test.ts`; it reported 32 files passing and one manifest failure. After consulting the existing S7 merge record, the exact historical membership above passed cleanly.

HANDOFF MAIN MERGE DONE
diff --git a/src/vtt/dm-encounter-host.ts b/src/vtt/dm-encounter-host.ts
index 56eff53205adc7a1795e05b5e2cfb4a971560814..6dd4d4a35cb1899556f1af815031d18168b83697
--- a/src/vtt/dm-encounter-host.ts
+++ b/src/vtt/dm-encounter-host.ts
@@ -363,11 +363,8 @@
   readonly #partyDisplayNames: ReadonlyMap<number, string>;
   readonly #composeRoom: StoredCharacterRoomComposer;
   readonly #reactionOfferPolicy: ReactionOfferHostPolicy;
-<<<<<<< HEAD
   readonly #onReducerInvocation: (command: EncounterCommand) => void;
-=======
   readonly #offerEnvironment: EngineOptionEnvironment;
->>>>>>> main
 
   constructor(
     sessionKey: string,
@@ -389,11 +386,8 @@
       readonly steeringMode?: SteeringCoordinatorMode;
       readonly onSteeringTelemetry?: (telemetry: SteeringTelemetry) => void;
       readonly reactionOfferPolicy?: ReactionOfferHostPolicy;
-<<<<<<< HEAD
       readonly onReducerInvocation?: (command: EncounterCommand) => void;
-=======
       readonly offerEnvironment?: EngineOptionEnvironment;
->>>>>>> main
     } = {},
   ) {
     this.sessionId = encounterSessionId(sessionKey);
@@ -407,12 +401,9 @@
     this.#partyDisplayNames = options.partyDisplayNames ?? new Map();
     this.#composeRoom = options.composeRoom ?? composeStoredCharacterEncounter;
     this.#reactionOfferPolicy = options.reactionOfferPolicy ?? DM_ATTENDED_REACTION_OFFER_POLICY;
-<<<<<<< HEAD
     this.#onReducerInvocation = options.onReducerInvocation ?? (() => undefined);
-=======
     this.#offerEnvironment = options.offerEnvironment ??
       createLegacyEngineOptionEnvironment(canonicalEngineQueryPort);
->>>>>>> main
     if (options.bridge !== undefined) {
       this.#mirror.connect(options.bridge);
       this.#roundPlanSession = new DmRoundPlanSession(
