Implemented S8 while keeping `/vtt` fully in-process.

Changes:

- Routed all top-down host mutations through `RichEncounterSessionService`.
- Routed browser save lifecycle operations through `IndexedDbSessionLifecycle`; only the browser-owned database handle close remains direct.
- Player and DM decisions now cross the local window boundary using revision-bound offered action IDs, never reducer-shaped commands.
- Player preview uses the seat-filtered `PlayerBoardProjection`.
- Moved terrain/world-object and area-preview rule reads into projection-only selectors.
- Added symbol-resolved boundary assertions for rich-service routing and exact reducer convergence.
- Added the top-down Playwright smoke with offered destination, DOM coordinate, and revision checks.
- No Worker, `SceneTransport`, WebSocket, visual, coordinate, fixture, or protected-file changes.

Files changed:

- `src/vtt/encounter-app.ts`
- `src/vtt/encounter-session-service.ts`
- `src/vtt/encounter-selectors.ts`
- `src/vtt/local-window-channel.ts` — required to replace full action payloads with offered IDs.
- `tests/unit/vtt/engine-boundary.test.ts`
- `tests/unit/vtt/encounter-projections.test.ts` — updated the local-window authority contract.
- `tests/browser/vtt-handoff/top-down-smoke.spec.ts`

The rich forwarding façade is 132 lines, lines 640–771, below the ~250-line ceiling.

Verification:

- `npm run typecheck:fast` — exit 0.
- `sg scan` — exit 0.
- `git diff --check` — exit 0.
- Selected S8 boundary command — 2 passed, 17 skipped, exit 0.
- Lifecycle/selectors — 8/8 passed.
- `npm run test:engine` — 48/48 passed.
- `npm run test:protocol` — 70/70 passed.
- 28-file S0–S9 cumulative Vitest command — 28 files, 348/348 tests passed.
- Top-down Playwright:
  `PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 VTT_HANDOFF_ARTIFACT=dev npx playwright test --config=tests/browser/vtt-handoff/playwright.config.ts top-down-smoke.spec.ts`
  — 1/1 passed.
- Recorded artifact:
  `artifact=dev page=http://127.0.0.1:4410/vtt?encounter=d365 offered=turn:1:combatant:character-5:1:option:0 destination=1,4`
- Existing classic-board proof through the absolute `/tmp` wrapper:
  `PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 npx playwright test --config=/tmp/vtt-handoff-s8-playwright.config.ts vtt-encounter.spec.ts`
  — 3/3 passed.

No baseline `it(` or `expect(` was removed. Two expectations were replaced with stronger offered-ID contract checks:

- Legal command equality became equality of the complete `{requestId, encounterRevision, offeredActionId}` result.
- Altered-coordinate command rejection became rejection of an unoffered ID; full command payloads no longer exist on that boundary.

Protected hashes remain unchanged:

- Plan: `25816309e2a5e837611b312c069670ba904886c5111930de1deab441e5383a3d`
- Frozen contract: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`
- Examples fixture: `9fc9a587d6be9899168e06846e114f14e5dba93c8bcd032f69c5d1ef2d99480d`

HANDOFF S8 DONE
diff --git a//tmp/vtt-handoff-s8-playwright.config.ts b//tmp/vtt-handoff-s8-playwright.config.ts
new file mode 100644
index 0000000000000000000000000000000000000000..900e3eeb1815901592d6551e1832eea90bbab188
--- /dev/null
+++ b//tmp/vtt-handoff-s8-playwright.config.ts
@@ -0,0 +1,26 @@
+import { defineConfig } from '/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/node_modules/@playwright/test/index.js';
+
+const repositoryRoot = '/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff';
+const port = process.env.PLAYWRIGHT_PORT;
+if (port !== '4410') throw new Error('S8 Playwright must use port 4410.');
+
+export default defineConfig({
+  testDir: `${repositoryRoot}/tests/browser`,
+  fullyParallel: false,
+  workers: 1,
+  use: {
+    baseURL: `http://127.0.0.1:${port}`,
+    headless: true,
+    trace: 'on-first-retry',
+  },
+  webServer: {
+    cwd: repositoryRoot,
+    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
+    url: `http://127.0.0.1:${port}`,
+    reuseExistingServer: false,
+    env: {
+      AI_BRIDGE_FAKE: '1',
+      STATIC_APP_CACHE_DIR: `/tmp/dnd-vtt-handoff-s8-existing-${String(process.pid)}`,
+    },
+  },
+});
diff --git a/src/vtt/encounter-app.ts b/src/vtt/encounter-app.ts
index e5b093b4bef888fd25ada58357b7c788b7fb706f..065e4a5f95cf24a5f404c8009b8c2518f5781a0a
--- a/src/vtt/encounter-app.ts
+++ b/src/vtt/encounter-app.ts
@@ -25,15 +25,22 @@
   type PendingDecision,
 } from '../combat/encounter';
 import { HIDDEN_ROLL_CATEGORIES, type HiddenRollCategory } from '../combat/roll-visibility';
-import { previewAffectedCells } from '../combat/templates';
-import { terrainProfile, terrainWallCells } from '../combat/terrain';
 import { encounterSessionId, type CombatantId } from '../combat/values';
 import {
   ControllerAssignmentError,
   DmEncounterHost,
-  type DmEncounterHostSnapshot,
 } from './dm-encounter-host';
 import {
+  RichEncounterSessionService,
+  type RichSessionSnapshot,
+} from './encounter-session-service';
+import {
+  dmWorldObjectLabel,
+  playerWorldObjectLabel,
+  previewAffectedCellKeys,
+  projectedWorldObjectLabel,
+} from './encounter-selectors';
+import {
   encounterBoardRenderModel,
   encounterBoardTokenRenderModels,
   type EncounterBoardMechanicalLayer,
@@ -53,7 +60,7 @@
   isHostWindowMessage,
   playerDecisionMessage,
 } from './local-window-channel';
-import { IndexedDbBrowserSessionStore, importBrowserSessionDurably } from './local-session-store';
+import { IndexedDbBrowserSessionStore } from './local-session-store';
 import {
   IndexedDbDirectoryHandlePersistence,
   SaveFolderRepository,
@@ -74,6 +81,7 @@
   type AccessibleBoardViewMode,
 } from './accessible-board';
 import { decodeSavedSessionFingerprint } from './session-persistence';
+import { IndexedDbSessionLifecycle } from './session-lifecycle';
 import type { EncounterSeed } from './session-seed';
 import type { StoredCharacterEncounter } from './stored-character-encounter';
 import type { StoredCharacterSessionFlow } from './stored-character-encounter';
@@ -91,9 +99,11 @@
 import type { HumanEngineActorOptions } from './encounter-board-projection';
 import type { EngineActivationChoiceSlot, EngineOptionId } from './turn-proposal';
 import type { OfferedOptionPath } from './offered-option-paths';
+import { REFERENCE_PLAYER_IDS } from './reference-encounter';
 
 const HEARTBEAT_INTERVAL_MS = 250;
 const HEARTBEAT_TIMEOUT_MS = 1_000;
+const LOCAL_PARTY_PLAYER_ID = 'player:local-party';
 
 function element<K extends keyof HTMLElementTagNameMap>(
   tag: K,
@@ -685,6 +695,7 @@
   boardChromeTilePx?: BoardChromeTilePx,
   offeredPaths: readonly OfferedOptionPath[] | null = null,
   stackSelection: EncounterBoardStackSelection = new Map(),
+  worldObjectLabels?: ReadonlyMap<string, string>,
 ): HTMLDivElement {
   const tilePx = boardChromeTilePx ?? CHROME_TILE_PX;
   const chromeMetrics = boardChromeMetrics(tilePx);
@@ -827,10 +838,14 @@
         model.column === object.position.column &&
         model.row === object.position.row
       ) {
-        const profile = terrainProfile(object.terrainKind);
+        const mechanicalLabel = worldObjectLabels?.get(object.id) ?? projectedWorldObjectLabel(object).text;
+        const namePrefix = `${object.name} — `;
+        const mechanicalDetails = mechanicalLabel.startsWith(namePrefix)
+          ? mechanicalLabel.slice(namePrefix.length)
+          : mechanicalLabel;
         placed.append(element('span', {
           className: 'encounter-world-object-label',
-          text: `${object.name} — ${TERRAIN_LEGEND_LABELS[object.terrainKind]} — movement ${profile.passability}; sight ${profile.blocksSight ? 'blocked' : 'open'}; anchor (${String(object.position.column)},${String(object.position.row)}); footprint ${object.cells.map((cell) => `(${String(cell.column)},${String(cell.row)})`).join(' ')}`,
+          text: `${object.name} — ${TERRAIN_LEGEND_LABELS[object.terrainKind]} — ${mechanicalDetails}`,
         }));
         const label = placed.querySelector<HTMLElement>('.encounter-world-object-label');
         if (label !== null) label.dataset.labelStyle = OBJECT_LABEL_STYLE;
@@ -1129,7 +1144,12 @@
   #submit(action: EncounterCommand): void {
     const request = this.#projection?.pendingRequest;
     if (request === null || request === undefined) return;
-    const message = playerDecisionMessage(this.sessionId, request, action);
+    const actionIndex = request.legalActions.findIndex(
+      (candidate) => actionKey(candidate) === actionKey(action),
+    );
+    const selectedOfferedActionId = request.offeredActionIds[actionIndex];
+    if (selectedOfferedActionId === undefined) return;
+    const message = playerDecisionMessage(this.sessionId, request, selectedOfferedActionId);
     this.#channel.postMessage(message);
     this.#staged = null;
     this.#aimingSpell = false;
@@ -1142,20 +1162,8 @@
     if (projection === null || staged?.type !== 'cast_spell' || staged.area === null) {
       return new Set();
     }
-    return new Set(
-      previewAffectedCells(
-        {
-          bounds: projection.bounds,
-          blockedCells: terrainWallCells({
-            blockedCells: projection.blockedCells,
-            worldObjects: projection.worldObjects.map((object) => ({
-              id: object.id, footprint: object.cells, blocking: object.blocking,
-            })),
-          }),
-        },
-        staged.area,
-      ).map((cell) => `${cell.column},${cell.row}`),
-    );
+    const preview = previewAffectedCellKeys(projection, staged.area);
+    return new Set(preview.kind === 'available' ? preview.cellKeys : []);
   }
 
   #aimAt(event: PointerEvent): void {
@@ -1273,6 +1281,11 @@
         undefined,
         null,
         this.#stackSelection,
+        new Map(projection.worldObjects.map((object) => {
+          const label = playerWorldObjectLabel(projection, String(object.id));
+          if (label === null) throw new Error(`Missing player world-object label for ${String(object.id)}.`);
+          return [label.objectId, label.text] as const;
+        })),
       );
       board.addEventListener('pointermove', (event) => this.#aimAt(event));
       this.#shell.append(board);
@@ -1364,7 +1377,8 @@
     new IndexedDbDirectoryHandlePersistence(indexedDB),
     window,
   );
-  readonly #host: DmEncounterHost;
+  readonly #session: RichEncounterSessionService;
+  readonly #lifecycle: IndexedDbSessionLifecycle;
   readonly #channel: BroadcastChannel;
   #shell = element('main', { className: 'encounter-shell dm-encounter' });
   #projection: DmBoardProjection | null = null;
@@ -1385,7 +1399,9 @@
   #boardView: AccessibleBoardViewMode;
   readonly #sessionFlow: StoredCharacterSessionFlow | null;
   #endSessionExported = false;
-  #pendingSnapshot: DmEncounterHostSnapshot | null = null;
+  #pendingSnapshot: RichSessionSnapshot | null = null;
+  #dmOfferedActionIds: readonly string[] = [];
+  #browserSaveEntries: readonly SaveManagerEntry[] = [];
   #acknowledgingSnapshots = false;
   #flushCount = 0;
   #flushTotalMs = 0;
@@ -1394,9 +1410,10 @@
   #renderTotalMs = 0;
   #renderMaximumMs = 0;
   #coalescedSnapshotCount = 0;
+  #closed = false;
   readonly #heartbeat: number;
   readonly #unsubscribe: () => void;
-  readonly #onBeforeUnload = (): void => this.#host.close();
+  readonly #onBeforeUnload = (): void => this.close();
 
   constructor(
     private readonly root: HTMLElement,
@@ -1412,7 +1429,10 @@
     this.#boardView = readAccessibleBoardViewMode(localStorage, 'dm');
     this.#store = store;
     this.#sessionFlow = encounter?.sessionFlow ?? null;
-    this.#host = new DmEncounterHost(sessionId, this.#store, encounter === undefined
+    const playerIds = encounter?.playerIds ?? REFERENCE_PLAYER_IDS;
+    const observerCombatantId = playerIds[0];
+    if (observerCombatantId === undefined) throw new TypeError('Top-down player preview requires a player seat.');
+    const host = new DmEncounterHost(sessionId, this.#store, encounter === undefined
       ? (initialSeed === undefined ? {} : { initialSeed })
       : {
           initialState: encounter.state,
@@ -1428,12 +1448,30 @@
           turnLegalActions: encounter.turnLegalActions,
           reactionLegalActions: () => [],
         });
-    if (encounter?.startPaused === true) this.#host.interrupt();
+    const controlled = new Set(playerIds);
+    this.#session = new RichEncounterSessionService(host, [{
+      playerId: LOCAL_PARTY_PLAYER_ID,
+      seatId: 'seat:local-party',
+      observerCombatantId,
+      ownedCombatantIds: playerIds,
+      controlledTokenIds: host.rendererTokenBindings()
+        .filter((binding) => controlled.has(binding.combatantId))
+        .map((binding) => binding.tokenId),
+    }]);
+    this.#lifecycle = new IndexedDbSessionLifecycle(this.#store, {
+      sessionId: () => encounterSessionId(this.sessionId),
+      close: () => this.#detach(),
+    });
+    if (encounter?.startPaused === true) this.#session.interrupt();
     this.#channel = new BroadcastChannel(`srd55:vtt:${sessionId}`);
     this.#channel.addEventListener('message', this.#onMessage);
-    this.#unsubscribe = this.#host.subscribe((snapshot) => this.#queueSnapshot(snapshot));
+    this.#unsubscribe = this.#session.subscribeTopDown(
+      LOCAL_PARTY_PLAYER_ID,
+      (snapshot) => this.#queueSnapshot(snapshot),
+    );
     this.#heartbeat = window.setInterval(() => {
-      const snapshot = this.#host.snapshot();
+      const snapshot = this.#session.topDownSnapshot(LOCAL_PARTY_PLAYER_ID);
+      if (snapshot === null) return;
       const dmChanged =
         this.#projection === null ||
         canonicalJson(this.#projection) !== canonicalJson(snapshot.dm);
@@ -1467,11 +1505,26 @@
       boardGlyphs,
       captureTilePx,
     );
-    await store.flush();
+    await view.#initializeLifecycle();
     return view;
   }
 
-  #queueSnapshot(snapshot: DmEncounterHostSnapshot): void {
+  async #initializeLifecycle(): Promise<void> {
+    await this.#lifecycle.dispatch({ kind: 'flush' });
+    await this.#refreshBrowserSaves();
+  }
+
+  async #refreshBrowserSaves(): Promise<void> {
+    const result = await this.#lifecycle.dispatch({ kind: 'list' });
+    if (result.kind !== 'listed') throw new Error('Session lifecycle returned an invalid list result.');
+    this.#browserSaveEntries = result.saves.map((save) => ({
+      ...save,
+      id: `browser:${save.storageId}`,
+      source: 'browser',
+    }));
+  }
+
+  #queueSnapshot(snapshot: RichSessionSnapshot): void {
     this.#pendingSnapshot = snapshot;
     if (this.#acknowledgingSnapshots) return;
     this.#acknowledgingSnapshots = true;
@@ -1484,7 +1537,8 @@
         const snapshot = this.#pendingSnapshot;
         this.#pendingSnapshot = null;
         const flushStartedAt = performance.now();
-        await this.#store.flush();
+        await this.#lifecycle.dispatch({ kind: 'flush' });
+        await this.#refreshBrowserSaves();
         const flushMs = performance.now() - flushStartedAt;
         this.#flushCount += 1;
         this.#flushTotalMs += flushMs;
@@ -1507,6 +1561,7 @@
           this.#focusAfterRender = nextKey === null ? 'active_token' : 'recovery';
         }
         this.#projection = snapshot.dm;
+        this.#dmOfferedActionIds = snapshot.dmOfferedActionIds;
         if (!snapshot.dm.movementPreviews.some(
           (preview) => preview.commandKey === this.#movementPreviewKey,
         )) this.#movementPreviewKey = null;
@@ -1560,7 +1615,12 @@
     if (pending === null || pending === undefined) return;
     try {
       const decision = decodePlayerDecision(value, this.sessionId, pending);
-      this.#host.submitHumanDecision(pending.actorId, decision);
+      void this.#session.submitTopDownOfferedAction(
+        pending.actorId,
+        decision.requestId,
+        decision.encounterRevision,
+        decision.offeredActionId,
+      );
       this.#channelError = null;
     } catch (error: unknown) {
       if (error instanceof TypeError) {
@@ -1575,7 +1635,7 @@
   mount(): void {
     this.root.replaceChildren(this.#shell);
     this.#render();
-    void this.#host.start().catch((error: unknown) => {
+    void this.#session.start().catch((error: unknown) => {
       this.#saveManagerError = error instanceof Error ? error.message : 'Browser session storage failed.';
       this.#render();
     });
@@ -1589,11 +1649,17 @@
     );
     if (controller?.kind !== 'human') return;
     this.#movementPreviewKey = null;
-    this.#host.submitHumanDecision(pending.actorId, {
-      requestId: pending.requestId,
-      encounterRevision: pending.encounterRevision,
-      action,
-    });
+    const actionIndex = this.#projection?.humanCommandActions.findIndex(
+      (candidate) => actionKey(candidate) === actionKey(action),
+    ) ?? -1;
+    const selectedOfferedActionId = this.#dmOfferedActionIds[actionIndex];
+    if (selectedOfferedActionId === undefined) return;
+    void this.#session.submitTopDownOfferedAction(
+      pending.actorId,
+      pending.requestId,
+      pending.encounterRevision,
+      selectedOfferedActionId,
+    );
   }
 
   #setMovementPreview(commandKey: string | null): void {
@@ -1603,11 +1669,7 @@
   }
 
   #browserSaves(): readonly SaveManagerEntry[] {
-    return this.#store.savedSessions().map((save) => ({
-      ...save,
-      id: `browser:${save.storageId}`,
-      source: 'browser',
-    }));
+    return this.#browserSaveEntries;
   }
 
   #controller(entries: readonly SaveManagerEntry[]): SaveManagerController {
@@ -1617,7 +1679,13 @@
         load: (save) => this.#loadSave(save),
         rename: async (save, name) => {
           if (save.source === 'browser') {
-            await this.#store.renameStored(save.storageId ?? `session:${save.sessionId}`, save.sessionId, name);
+            await this.#lifecycle.dispatch({
+              kind: 'rename',
+              storageId: save.storageId ?? `session:${save.sessionId}`,
+              sessionId: save.sessionId,
+              name,
+            });
+            await this.#refreshBrowserSaves();
           } else {
             await this.#folder.rename(save, name);
             await this.#refreshFolderSaves();
@@ -1626,12 +1694,12 @@
         },
         delete: async (save) => {
           if (save.source === 'browser') {
-            const deletingActiveSession = save.sessionId === encounterSessionId(this.sessionId);
             const storageId = save.storageId ?? `session:${save.sessionId}`;
-            const deletingLiveSession = deletingActiveSession && storageId.startsWith('session:');
-            if (deletingLiveSession) this.close();
-            await this.#store.removeStored(storageId, save.sessionId);
-            if (deletingLiveSession) {
+            const result = await this.#lifecycle.dispatch({
+              kind: 'delete', storageId, sessionId: save.sessionId,
+            });
+            if (result.kind !== 'deleted') throw new Error('Session lifecycle returned an invalid delete result.');
+            if (result.navigation?.kind === 'open_new_session') {
               const url = new URL(location.href);
               url.searchParams.set('encounter', 'reference');
               url.searchParams.set('view', 'dm');
@@ -1639,32 +1707,42 @@
               location.assign(url);
               return;
             }
+            await this.#refreshBrowserSaves();
           } else {
             await this.#folder.delete(save);
             await this.#refreshFolderSaves();
           }
           this.#render();
         },
-        exportCopy: (save) => {
-          const bytes = save.source === 'browser'
-            ? this.#store.exportedStored(save.storageId ?? `session:${save.sessionId}`, save.sessionId)
-            : save.bytes;
+        exportCopy: async (save) => {
+          const exported = save.source === 'browser'
+            ? await this.#lifecycle.dispatch({
+                kind: 'export',
+                storageId: save.storageId ?? `session:${save.sessionId}`,
+                sessionId: save.sessionId,
+              })
+            : null;
+          const bytes = exported?.kind === 'exported' ? exported.bytes : save.bytes;
           if (bytes === undefined) throw new Error('Folder save has no file contents.');
           this.#download(save.name, bytes);
         },
         saveNow: async () => {
-          await this.#store.flush();
+          await this.#lifecycle.dispatch({ kind: 'flush' });
           const sessionId = encounterSessionId(this.sessionId);
-          const bytes = this.#store.exported(sessionId);
-          const browser = this.#store.savedSessions().find(
+          const exported = await this.#lifecycle.dispatch({
+            kind: 'export', storageId: `session:${sessionId}`, sessionId,
+          });
+          if (exported.kind !== 'exported') throw new Error('Session lifecycle returned an invalid export result.');
+          await this.#refreshBrowserSaves();
+          const browser = this.#browserSaveEntries.find(
             (save) => save.sessionId === sessionId,
           );
           const name = browser?.name ?? sessionId;
           if (this.#folder.mode().kind === 'folder') {
-            await this.#folder.write(name, bytes);
+            await this.#folder.write(name, exported.bytes);
             await this.#refreshFolderSaves();
           } else {
-            this.#download(name, bytes);
+            this.#download(name, exported.bytes);
           }
         },
         chooseFolder: async () => {
@@ -1678,24 +1756,25 @@
 
   async #loadSave(save: SaveManagerEntry): Promise<void> {
     if (save.source === 'browser') {
-      await this.#store.restoreStored(save.storageId ?? `session:${save.sessionId}`, save.sessionId);
+      const restored = await this.#lifecycle.dispatch({
+        kind: 'restore',
+        storageId: save.storageId ?? `session:${save.sessionId}`,
+        sessionId: save.sessionId,
+      });
+      if (restored.kind !== 'restored') throw new Error('Session lifecycle returned an invalid restore result.');
     }
     if (save.source === 'folder') {
-      const existing = this.#store.revisions(save.sessionId);
-      if (existing.length === 0) {
-        if (save.bytes === undefined) throw new Error('Folder save has no file contents.');
-        this.#store.import(save.bytes);
-        await this.#store.flush();
-      } else {
-        const browserFingerprint = decodeSavedSessionFingerprint(
-          this.#store.exported(save.sessionId),
-        ).fingerprint;
-        if (browserFingerprint !== save.fingerprint) {
-          throw new Error(
-            'This folder save has the same session ID as a different browser autosave. Rename or export the autosave before deleting it; it will not be overwritten.',
-          );
-        }
+      if (save.bytes === undefined) throw new Error('Folder save has no file contents.');
+      const imported = await this.#lifecycle.dispatch({ kind: 'import', bytes: save.bytes });
+      if (imported.kind === 'conflict') {
+        throw new Error(
+          'This folder save has the same session ID as a different browser autosave. Rename or export the autosave before deleting it; it will not be overwritten.',
+        );
+      }
+      if (imported.kind !== 'imported' && imported.kind !== 'duplicate') {
+        throw new Error('Session lifecycle returned an invalid import result.');
       }
+      await this.#refreshBrowserSaves();
     }
     if (this.boardSnapshotMode) {
       if (this.loadBoardSnapshotSession === undefined) {
@@ -1726,11 +1805,12 @@
       if (file === undefined) return;
       void this.#runSaveManagerAction(async () => {
         const bytes = await file.text();
-        const decoded = decodeSavedSessionFingerprint(bytes);
-        if (this.#store.revisions(decoded.sessionId).length !== 0) {
+        const result = await this.#lifecycle.dispatch({ kind: 'import', bytes });
+        if (result.kind === 'duplicate' || result.kind === 'conflict') {
           throw new Error('That uploaded session already exists in browser autosaves.');
         }
-        await importBrowserSessionDurably(this.#store, bytes);
+        if (result.kind !== 'imported') throw new Error('Session lifecycle returned an invalid import result.');
+        await this.#refreshBrowserSaves();
         this.#render();
       });
     }, { once: true });
@@ -2068,7 +2148,7 @@
           };
           break;
       }
-      const result = this.#host.resolvePendingPlacement(command);
+      const result = this.#session.resolvePendingPlacement(command);
       if (result.kind === 'refused') {
         this.#channelError = result.reason;
         this.#focusAfterRender = 'recovery';
@@ -2151,7 +2231,11 @@
     }, this.boardGlyphs, this.boardSnapshotMode, this.captureTilePx,
     this.boardSnapshotMode || this.#showOfferedOptionPaths
       ? projection.offeredOptionPaths
-      : null, this.#stackSelection));
+      : null, this.#stackSelection, new Map(projection.board.worldObjects.map((object) => {
+        const label = dmWorldObjectLabel(projection, String(object.id));
+        if (label === null) throw new Error(`Missing DM world-object label for ${String(object.id)}.`);
+        return [label.objectId, label.text] as const;
+      }))));
     if (movementPreview !== null) this.#shell.append(renderMovementDangerLegend(movementPreview));
   }
 
@@ -2208,21 +2292,21 @@
     const interrupt = element('button', { text: 'Interrupt' });
     interrupt.type = 'button';
     interrupt.dataset.renderKey = stableRenderKey('dm', 'controls', 'interrupt');
-    interrupt.addEventListener('click', () => this.#host.interrupt());
+    interrupt.addEventListener('click', () => this.#session.interrupt());
     const resume = element('button', { text: 'Resume' });
     resume.type = 'button';
     resume.dataset.renderKey = stableRenderKey('dm', 'controls', 'resume');
-    resume.addEventListener('click', () => this.#host.resume());
+    resume.addEventListener('click', () => this.#session.resume());
     const undo = element('button', { text: 'Undo last' });
     undo.type = 'button';
     undo.dataset.renderKey = stableRenderKey('dm', 'controls', 'undo-last');
-    undo.addEventListener('click', () => void this.#host.undoLast());
+    undo.addEventListener('click', () => void this.#session.undoLast());
     const skip = element('button', { text: 'Skip turn' });
     skip.type = 'button';
     skip.dataset.renderKey = stableRenderKey('dm', 'controls', 'skip-turn');
     skip.disabled = projection.timeline.currentCombatant === null || projection.timeline.phase.kind === 'concluded';
     skip.addEventListener('click', () => {
-      void this.#host.skipTurn().catch((error: unknown) => {
+      void this.#session.skipTurn().catch((error: unknown) => {
         this.#channelError = error instanceof Error ? error.message : 'Skip turn failed.';
         this.#render();
       });
@@ -2270,7 +2354,7 @@
         event.preventDefault();
         const selected = later.find((entry) => entry.combatant === target.value);
         if (selected === undefined) return;
-        void this.#host.delayTurn(selected.combatant).catch((error: unknown) => {
+        void this.#session.delayTurn(selected.combatant).catch((error: unknown) => {
           this.#channelError = error instanceof Error ? error.message : 'Delay turn failed.';
           this.#render();
         });
@@ -2282,7 +2366,7 @@
       longRest.type = 'button';
       longRest.dataset.renderKey = stableRenderKey('dm', 'controls', 'long-rest');
       longRest.addEventListener('click', () => {
-        void this.#host.finishAdventuringDay().catch((error: unknown) => {
+        void this.#session.finishAdventuringDay().catch((error: unknown) => {
           this.#channelError = error instanceof Error ? error.message : 'Long Rest failed.';
           this.#render();
         });
@@ -2344,7 +2428,7 @@
         } else {
           throw new Error(`Unknown Rest interruption outcome ${selected}.`);
         }
-        void this.#host.resolveRestInterruption(outcome).catch((error: unknown) => {
+        void this.#session.resolveRestInterruption(outcome).catch((error: unknown) => {
           this.#channelError = error instanceof Error ? error.message : 'Rest interruption failed.';
           this.#render();
         });
@@ -2358,7 +2442,7 @@
       nextRoom.type = 'button';
       nextRoom.dataset.renderKey = stableRenderKey('dm', 'controls', 'next-room');
       nextRoom.addEventListener('click', () => {
-        void this.#host.finishRoom(null).catch((error: unknown) => {
+        void this.#session.finishRoom(null).catch((error: unknown) => {
           this.#channelError = error instanceof Error ? error.message : 'Room transition failed.';
           this.#render();
         });
@@ -2371,21 +2455,24 @@
       endSession.type = 'button';
       endSession.dataset.renderKey = stableRenderKey('dm', 'controls', 'end-session');
       endSession.dataset.intent = 'end_session';
-      endSession.disabled = this.#endSessionExported || this.#host.sessionEnded();
+      endSession.disabled = this.#endSessionExported || this.#session.sessionEnded();
       endSession.addEventListener('click', () => {
         endSession.disabled = true;
         void this.#runSaveManagerAction(async () => {
-          await this.#host.endSession();
+          await this.#session.endSession();
           const sessionId = encounterSessionId(this.sessionId);
-          const bytes = this.#store.exported(sessionId);
-          decodeSavedSessionFingerprint(bytes);
-          this.#download(sessionId, bytes);
+          const exported = await this.#lifecycle.dispatch({
+            kind: 'export', storageId: `session:${sessionId}`, sessionId,
+          });
+          if (exported.kind !== 'exported') throw new Error('Session lifecycle returned an invalid export result.');
+          decodeSavedSessionFingerprint(exported.bytes);
+          this.#download(sessionId, exported.bytes);
           this.#endSessionExported = true;
           this.#render();
         });
       });
       controls.append(endSession);
-      if (this.#endSessionExported || this.#host.sessionEnded()) {
+      if (this.#endSessionExported || this.#session.sessionEnded()) {
         const routed = element('p', {
           className: 'dm-end-session-export-status',
           text: 'Session finalized. The complete session export is ready in the save manager and was downloaded.',
@@ -2455,7 +2542,7 @@
       );
       button.dataset.revision = String(boundary.revision);
       button.addEventListener('click', () => {
-        void this.#host.rewindToRound(boundary.round).catch((error: unknown) => {
+        void this.#session.rewindToRound(boundary.round).catch((error: unknown) => {
           this.#channelError = error instanceof Error ? error.message : 'Round rewind failed.';
           this.#render();
         });
@@ -2538,7 +2625,7 @@
           dice.push({ sides: request.sides, count: Number(request.input.value) });
           byCombatant.set(request.combatantId, dice);
         }
-        void this.#host.finishRoom([...byCombatant].map(([combatantId, dice]) => ({
+        void this.#session.finishRoom([...byCombatant].map(([combatantId, dice]) => ({
           combatantId,
           dice,
         }))).catch((error: unknown) => {
@@ -2642,7 +2729,7 @@
         apply.addEventListener('click', () => {
           const parsed = Number(amount.value);
           if (!Number.isSafeInteger(parsed) || reasoning.value.trim().length === 0) return;
-          this.#host.resolveEngineAdjudication(
+          this.#session.resolveEngineAdjudication(
             entry.request.adjudicationRequestId,
             { kind: 'hit_point_delta', amount: parsed },
             reasoning.value,
@@ -2683,7 +2770,7 @@
           button.addEventListener('click', () => {
             const parsed = Number(amount.value);
             if (!Number.isSafeInteger(parsed)) return;
-            this.#host.resolveRefusalPrompt(
+            this.#session.resolveRefusalPrompt(
               entry.decision.id,
               { kind: 'hit_point_delta', amount: parsed },
               'DM manually resolved the refused action.',
@@ -2706,7 +2793,7 @@
           );
           button.addEventListener('click', () => {
             button.disabled = true;
-            void this.#host.resolvePendingDecision(entry.decision.id, option.id).catch((error: unknown) => {
+            void this.#session.resolvePendingDecision(entry.decision.id, option.id).catch((error: unknown) => {
               this.#channelError = error instanceof Error ? error.message : 'Decision resolution failed.';
               this.#render();
             });
@@ -2751,7 +2838,7 @@
           const mode = handlingModesForCategory(category).find((candidate) => candidate === select.value);
           if (mode === undefined) return;
           select.disabled = true;
-          void this.#host.setRefusalHandling(category, mode as RefusalHandlingMode).catch((error: unknown) => {
+          void this.#session.setRefusalHandling(category, mode as RefusalHandlingMode).catch((error: unknown) => {
             this.#channelError = error instanceof Error ? error.message : 'Refusal setting update failed.';
             this.#render();
           });
@@ -2792,7 +2879,7 @@
           select.addEventListener('change', () => {
             if (select.value !== 'ask' && select.value !== 'always' && select.value !== 'never') return;
             select.disabled = true;
-            void this.#host.setReactionPreference(character.combatantId, reactionKind, select.value)
+            void this.#session.setReactionPreference(character.combatantId, reactionKind, select.value)
               .catch((error: unknown) => {
                 this.#channelError = error instanceof Error ? error.message : 'Reaction preference update failed.';
                 this.#render();
@@ -2820,7 +2907,7 @@
       checkbox.setAttribute('aria-label', `Hide ${HIDDEN_ROLL_LABELS[category].toLowerCase()}`);
       checkbox.addEventListener('change', () => {
         checkbox.disabled = true;
-        void this.#host.setHiddenRollCategory(category, checkbox.checked).catch((error: unknown) => {
+        void this.#session.setHiddenRollCategory(category, checkbox.checked).catch((error: unknown) => {
           this.#channelError = error instanceof Error ? error.message : 'Hidden-roll setting failed.';
           this.#render();
         });
@@ -2856,7 +2943,7 @@
         text: `${projection.pendingRequest.kind}: ${actor?.name ?? projection.pendingRequest.actorId}`,
       }));
       if (projection.humanCommandActions.length > 0) {
-        for (const action of projection.humanCommandActions) {
+        for (const [actionIndex, action] of projection.humanCommandActions.entries()) {
           const button = element('button', { text: actionLabel(action) });
           button.type = 'button';
           button.dataset.renderKey = stableRenderKey(
@@ -2865,8 +2952,27 @@
             projection.pendingRequest.requestId,
             actionKey(action),
           );
+          const selectedOfferedActionId = this.#dmOfferedActionIds[actionIndex];
+          if (selectedOfferedActionId !== undefined) {
+            button.dataset.offeredActionId = selectedOfferedActionId;
+            button.dataset.encounterRevision = String(projection.pendingRequest.encounterRevision);
+            button.dataset.actorId = String(projection.pendingRequest.actorId);
+          }
           if (action.type === 'move') {
             const key = actionKey(action);
+            const destination = action.path.at(-1);
+            const actor = projection.board.combatants.find(
+              (combatant) => combatant.id === action.actor,
+            );
+            const actorPosition = actor?.placementStatus === 'placed' ? actor.position : undefined;
+            if (destination !== undefined) {
+              button.dataset.destinationColumn = String(destination.column);
+              button.dataset.destinationRow = String(destination.row);
+            }
+            if (actorPosition !== undefined) {
+              button.dataset.anchorColumn = String(actorPosition.column);
+              button.dataset.anchorRow = String(actorPosition.row);
+            }
             button.addEventListener('pointerenter', () => this.#setMovementPreview(key));
             button.addEventListener('pointerleave', () => this.#setMovementPreview(null));
             button.addEventListener('focus', () => this.#setMovementPreview(key));
@@ -2893,7 +2999,7 @@
           'dm', 'world-object-controls', control.objectId, actionKey(control.command),
         );
         button.dataset.objectId = control.objectId;
-        button.addEventListener('click', () => this.#host.dmUseWorldObject(control.command));
+        button.addEventListener('click', () => this.#session.dmUseWorldObject(control.command));
         objectControls.append(button);
       }
     }
@@ -2929,7 +3035,7 @@
     );
     adjudication.addEventListener('submit', (event) => {
       event.preventDefault();
-      this.#host.adjudicate({
+      this.#session.adjudicate({
         type: 'adjudicate',
         target: target.value as CombatantId,
         subject: 'engine:manual-adjudication',
@@ -2971,7 +3077,7 @@
       select.addEventListener('change', () => {
         if (select.value === 'human' || select.value === 'algorithm') {
           try {
-            this.#host.replaceController(identity.combatantId, select.value);
+            this.#session.replaceController(identity.combatantId, select.value);
             this.#channelError = null;
           } catch (error: unknown) {
             if (!(error instanceof ControllerAssignmentError)) throw error;
@@ -3053,13 +3159,20 @@
   }
 
   close(): void {
+    if (this.#closed) return;
+    this.#detach();
+    void this.#lifecycle.dispatch({ kind: 'flush' }).finally(() => this.#store.close());
+  }
+
+  #detach(): void {
+    if (this.#closed) return;
+    this.#closed = true;
     window.clearInterval(this.#heartbeat);
     window.removeEventListener('beforeunload', this.#onBeforeUnload);
     this.#unsubscribe();
     this.#channel.removeEventListener('message', this.#onMessage);
-    this.#host.close();
+    this.#session.close();
     this.#channel.close();
-    void this.#store.flush().finally(() => this.#store.close());
   }
 }
 
diff --git a/src/vtt/encounter-selectors.ts b/src/vtt/encounter-selectors.ts
index a26928b279dfa77cf3293933403f67ff944c9bcc..56f3c3c2d3a5eb0035b6c45d03abf205858bb88a
--- a/src/vtt/encounter-selectors.ts
+++ b/src/vtt/encounter-selectors.ts
@@ -9,17 +9,31 @@
   readonly text: string;
 }
 
+export function projectedWorldObjectLabel(
+  object: DmBoardProjection['board']['worldObjects'][number] | PlayerBoardProjection['worldObjects'][number],
+): DmWorldObjectLabel {
+  const profile = terrainProfile(object.terrainKind);
+  return {
+    objectId: String(object.id),
+    text: `${object.name} — movement ${profile.passability}; sight ${profile.blocksSight ? 'blocked' : 'open'}; anchor (${String(object.position.column)},${String(object.position.row)}); footprint ${object.cells.map((cell) => `(${String(cell.column)},${String(cell.row)})`).join(' ')}`,
+  };
+}
+
 export function dmWorldObjectLabel(
   projection: DmBoardProjection,
   objectId: string,
 ): DmWorldObjectLabel | null {
   const object = projection.board.worldObjects?.find((candidate) => String(candidate.id) === objectId);
   if (object === undefined) return null;
-  const profile = terrainProfile(object.terrainKind);
-  return {
-    objectId,
-    text: `${object.name} — movement ${profile.passability}; sight ${profile.blocksSight ? 'blocked' : 'open'}; anchor (${String(object.position.column)},${String(object.position.row)}); footprint ${object.cells.map((cell) => `(${String(cell.column)},${String(cell.row)})`).join(' ')}`,
-  };
+  return projectedWorldObjectLabel(object);
+}
+
+export function playerWorldObjectLabel(
+  projection: PlayerBoardProjection,
+  objectId: string,
+): DmWorldObjectLabel | null {
+  const object = projection.worldObjects.find((candidate) => String(candidate.id) === objectId);
+  return object === undefined ? null : projectedWorldObjectLabel(object);
 }
 
 export type PlayerAffectedCellPreview =
diff --git a/src/vtt/encounter-session-service.ts b/src/vtt/encounter-session-service.ts
index caea3062cc1ea455f6a066c54f980d64b63f23a1..82718d2291625d11d4de322536da24b3057eb870
--- a/src/vtt/encounter-session-service.ts
+++ b/src/vtt/encounter-session-service.ts
@@ -1,5 +1,6 @@
 import type { CombatantId, EncounterSessionId } from '../combat/values';
 import type {
+  DmEncounterHost,
   DmEncounterHostSnapshot,
   HostCoordinatorTransactionOutcome,
   HostDoorSetOutcome,
@@ -13,6 +14,7 @@
   RendererProjectionCapture,
   RendererTokenBinding,
 } from './encounter-projections';
+import { offeredActionId } from './encounter-projections';
 
 export interface PlayerSeatRegistration extends PlayerSeatBinding {
   readonly playerId: string;
@@ -627,3 +629,143 @@
     }
   }
 }
+
+export interface RichSessionSnapshot {
+  readonly dm: DmBoardProjection;
+  readonly player: PlayerBoardProjection;
+  readonly dmOfferedActionIds: readonly string[];
+}
+
+/** Typed in-process façade for the classic top-down renderer. */
+export class RichEncounterSessionService extends EncounterSessionService {
+  constructor(
+    private readonly richHost: DmEncounterHost,
+    seats: readonly PlayerSeatRegistration[],
+  ) {
+    super(richHost, seats);
+  }
+
+  topDownSnapshot(playerId: string): RichSessionSnapshot | null {
+    const dm = this.dmSnapshot();
+    const player = this.playerSnapshot(playerId);
+    return player === null ? null : {
+      dm,
+      player,
+      dmOfferedActionIds: dm.pendingRequest === null
+        ? []
+        : dm.humanCommandActions.map((_action, index) => offeredActionId(dm.pendingRequest?.requestId ?? '', index)),
+    };
+  }
+
+  subscribeTopDown(playerId: string, listener: (snapshot: RichSessionSnapshot) => void): () => void {
+    const dmEvents = new Map<number, DmBoardProjection>();
+    const playerEvents = new Map<number, PlayerBoardProjection>();
+    const publish = (seq: number): void => {
+      const dm = dmEvents.get(seq);
+      const player = playerEvents.get(seq);
+      if (dm === undefined || player === undefined) return;
+      dmEvents.delete(seq);
+      playerEvents.delete(seq);
+      listener({
+        dm,
+        player,
+        dmOfferedActionIds: dm.pendingRequest === null
+          ? []
+          : dm.humanCommandActions.map((_action, index) => offeredActionId(dm.pendingRequest?.requestId ?? '', index)),
+      });
+    };
+    const unsubscribeDm = this.subscribeDm((event) => {
+      dmEvents.set(event.seq, event.projection);
+      publish(event.seq);
+    });
+    const player = this.subscribePlayer(playerId, (event) => {
+      playerEvents.set(event.seq, event.projection);
+      publish(event.seq);
+    });
+    if (player.kind === 'refused') {
+      unsubscribeDm();
+      throw new TypeError(`Unknown top-down player seat ${playerId}.`);
+    }
+    return () => {
+      unsubscribeDm();
+      player.unsubscribe();
+      dmEvents.clear();
+      playerEvents.clear();
+    };
+  }
+
+  sessionEnded(): ReturnType<DmEncounterHost['sessionEnded']> { return this.richHost.sessionEnded(); }
+  submitTopDownOfferedAction(
+    actorId: CombatantId,
+    requestId: string,
+    encounterRevision: number,
+    selectedOfferedActionId: string,
+  ): ReturnType<DmEncounterHost['submitOfferedActionTransaction']> {
+    return this.richHost.submitOfferedActionTransaction(
+      actorId,
+      requestId,
+      encounterRevision,
+      selectedOfferedActionId,
+    );
+  }
+  resolvePendingPlacement(...args: Parameters<DmEncounterHost['resolvePendingPlacement']>): ReturnType<DmEncounterHost['resolvePendingPlacement']> {
+    return this.richHost.resolvePendingPlacement(...args);
+  }
+  interrupt(...args: Parameters<DmEncounterHost['interrupt']>): ReturnType<DmEncounterHost['interrupt']> {
+    return this.richHost.interrupt(...args);
+  }
+  resume(...args: Parameters<DmEncounterHost['resume']>): ReturnType<DmEncounterHost['resume']> {
+    return this.richHost.resume(...args);
+  }
+  undoLast(...args: Parameters<DmEncounterHost['undoLast']>): ReturnType<DmEncounterHost['undoLast']> {
+    return this.richHost.undoLast(...args);
+  }
+  skipTurn(...args: Parameters<DmEncounterHost['skipTurn']>): ReturnType<DmEncounterHost['skipTurn']> {
+    return this.richHost.skipTurn(...args);
+  }
+  delayTurn(...args: Parameters<DmEncounterHost['delayTurn']>): ReturnType<DmEncounterHost['delayTurn']> {
+    return this.richHost.delayTurn(...args);
+  }
+  finishAdventuringDay(...args: Parameters<DmEncounterHost['finishAdventuringDay']>): ReturnType<DmEncounterHost['finishAdventuringDay']> {
+    return this.richHost.finishAdventuringDay(...args);
+  }
+  resolveRestInterruption(...args: Parameters<DmEncounterHost['resolveRestInterruption']>): ReturnType<DmEncounterHost['resolveRestInterruption']> {
+    return this.richHost.resolveRestInterruption(...args);
+  }
+  finishRoom(...args: Parameters<DmEncounterHost['finishRoom']>): ReturnType<DmEncounterHost['finishRoom']> {
+    return this.richHost.finishRoom(...args);
+  }
+  endSession(...args: Parameters<DmEncounterHost['endSession']>): ReturnType<DmEncounterHost['endSession']> {
+    return this.richHost.endSession(...args);
+  }
+  rewindToRound(...args: Parameters<DmEncounterHost['rewindToRound']>): ReturnType<DmEncounterHost['rewindToRound']> {
+    return this.richHost.rewindToRound(...args);
+  }
+  resolveEngineAdjudication(...args: Parameters<DmEncounterHost['resolveEngineAdjudication']>): ReturnType<DmEncounterHost['resolveEngineAdjudication']> {
+    return this.richHost.resolveEngineAdjudication(...args);
+  }
+  resolveRefusalPrompt(...args: Parameters<DmEncounterHost['resolveRefusalPrompt']>): ReturnType<DmEncounterHost['resolveRefusalPrompt']> {
+    return this.richHost.resolveRefusalPrompt(...args);
+  }
+  resolvePendingDecision(...args: Parameters<DmEncounterHost['resolvePendingDecision']>): ReturnType<DmEncounterHost['resolvePendingDecision']> {
+    return this.richHost.resolvePendingDecision(...args);
+  }
+  setRefusalHandling(...args: Parameters<DmEncounterHost['setRefusalHandling']>): ReturnType<DmEncounterHost['setRefusalHandling']> {
+    return this.richHost.setRefusalHandling(...args);
+  }
+  setReactionPreference(...args: Parameters<DmEncounterHost['setReactionPreference']>): ReturnType<DmEncounterHost['setReactionPreference']> {
+    return this.richHost.setReactionPreference(...args);
+  }
+  setHiddenRollCategory(...args: Parameters<DmEncounterHost['setHiddenRollCategory']>): ReturnType<DmEncounterHost['setHiddenRollCategory']> {
+    return this.richHost.setHiddenRollCategory(...args);
+  }
+  dmUseWorldObject(...args: Parameters<DmEncounterHost['dmUseWorldObject']>): ReturnType<DmEncounterHost['dmUseWorldObject']> {
+    return this.richHost.dmUseWorldObject(...args);
+  }
+  adjudicate(...args: Parameters<DmEncounterHost['adjudicate']>): ReturnType<DmEncounterHost['adjudicate']> {
+    return this.richHost.adjudicate(...args);
+  }
+  replaceController(...args: Parameters<DmEncounterHost['replaceController']>): ReturnType<DmEncounterHost['replaceController']> {
+    return this.richHost.replaceController(...args);
+  }
+}
diff --git a/src/vtt/local-window-channel.ts b/src/vtt/local-window-channel.ts
index 909d9df83e9776a1e789f8a88c2f9ebaddc82aec..9e439ee6ba2c7a39d46411ce7f41ebd11cca97be
--- a/src/vtt/local-window-channel.ts
+++ b/src/vtt/local-window-channel.ts
@@ -1,6 +1,5 @@
-import { canonicalJson } from '../commands/canonical-json';
-import type { ControllerDecision, ControllerRequest } from '../combat/controllers';
-import type { EncounterCommand } from '../combat/events';
+import type { ControllerRequest } from '../combat/controllers';
+import { offeredActionId } from './encounter-projections';
 import type { PlayerBoardProjection } from './encounter-projections';
 
 export interface HostWindowMessage {
@@ -15,7 +14,7 @@
   readonly decision: {
     readonly requestId: string;
     readonly encounterRevision: number;
-    readonly action: unknown;
+    readonly offeredActionId: string;
   };
 }
 
@@ -27,7 +26,7 @@
   value: unknown,
   sessionId: string,
   pending: ControllerRequest,
-): ControllerDecision {
+): { readonly requestId: string; readonly encounterRevision: number; readonly offeredActionId: string } {
   if (!isRecord(value) || value.kind !== 'human_controller_decision') {
     throw new TypeError('Local window message is not a HumanController decision.');
   }
@@ -41,17 +40,15 @@
   ) {
     throw new TypeError('HumanController decision is stale.');
   }
-  const encodedAction = canonicalJson(decision.action);
-  const action = pending.legalActions.actions.find(
-    (candidate) => canonicalJson(candidate) === encodedAction,
-  );
-  if (action === undefined) {
-    throw new TypeError('HumanController decision is not one of the projected legal actions.');
+  const offeredActionIds = pending.legalActions.actions.map((_action, index) =>
+    offeredActionId(pending.requestId, index));
+  if (typeof decision.offeredActionId !== 'string' || !offeredActionIds.includes(decision.offeredActionId)) {
+    throw new TypeError('HumanController decision is not one of the projected offered action IDs.');
   }
   return {
     requestId: pending.requestId,
     encounterRevision: pending.encounterRevision,
-    action,
+    offeredActionId: decision.offeredActionId,
   };
 }
 
@@ -61,7 +58,7 @@
     readonly requestId: string;
     readonly encounterRevision: number;
   },
-  action: EncounterCommand,
+  selectedOfferedActionId: string,
 ): PlayerDecisionMessage {
   return {
     kind: 'human_controller_decision',
@@ -69,7 +66,7 @@
     decision: {
       requestId: request.requestId,
       encounterRevision: request.encounterRevision,
-      action,
+      offeredActionId: selectedOfferedActionId,
     },
   };
 }
diff --git a/tests/browser/vtt-handoff/top-down-smoke.spec.ts b/tests/browser/vtt-handoff/top-down-smoke.spec.ts
new file mode 100644
index 0000000000000000000000000000000000000000..4603ff9858860011769ee4d0e7049ac174e30a5c
--- /dev/null
+++ b/tests/browser/vtt-handoff/top-down-smoke.spec.ts
@@ -0,0 +1,56 @@
+import { expect, test } from '@playwright/test';
+
+test('classic top-down UI commits a revision-bound offered move in process', async ({ page }, testInfo) => {
+  await page.goto('/');
+  await page.waitForFunction(() => document.querySelector('#status')?.getAttribute('data-ready') === 'true');
+  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true');
+  await page.evaluate(() => window.staticApp.reset());
+  await page.goto('/vtt?encounter=d365');
+  await expect(page.getByRole('heading', { name: 'D365 sample dungeon' })).toBeVisible();
+  await page.getByRole('button', { name: 'Load bundled dungeon and party' }).click();
+  await page.waitForFunction(() => document.querySelector('.dm-encounter') !== null);
+  await expect(page.getByRole('heading', { name: 'DM controls' })).toBeVisible();
+
+  const shell = page.locator('.dm-encounter');
+  const offeredMoves = page.locator(
+    '.dm-pending-request button[data-offered-action-id][data-destination-column][data-destination-row]',
+  );
+  await expect(offeredMoves.first()).toBeEnabled();
+  const moveIndex = await offeredMoves.evaluateAll((buttons) => buttons.findIndex((button) => {
+    if (!(button instanceof HTMLButtonElement) || button.disabled) return false;
+    return button.dataset.destinationColumn !== button.dataset.anchorColumn ||
+      button.dataset.destinationRow !== button.dataset.anchorRow;
+  }));
+  expect(moveIndex).toBeGreaterThanOrEqual(0);
+  const move = offeredMoves.nth(moveIndex);
+  const offer = await move.evaluate((button) => {
+    if (!(button instanceof HTMLButtonElement)) throw new Error('Offered move is not a button.');
+    const read = (name: string): string => {
+      const value = button.dataset[name];
+      if (value === undefined) throw new Error(`Missing offered-move ${name}.`);
+      return value;
+    };
+    return {
+      actorId: read('actorId'),
+      offeredActionId: read('offeredActionId'),
+      revision: Number(read('encounterRevision')),
+      anchor: [Number(read('anchorColumn')), Number(read('anchorRow'))],
+      destination: [Number(read('destinationColumn')), Number(read('destinationRow'))],
+    };
+  });
+  expect(offer.offeredActionId).toMatch(/^turn:.+:option:\d+$/u);
+  expect(offer.destination).not.toEqual(offer.anchor);
+  await expect(page.locator('[data-offered-action-id="not-an-engine-offer"]')).toHaveCount(0);
+
+  await move.click();
+  await expect.poll(async () => Number(await shell.getAttribute('data-session-revision')))
+    .toBeGreaterThan(offer.revision);
+  const movedToken = page.locator(`.encounter-token[data-combatant-id="${offer.actorId}"]`);
+  await expect(movedToken).toHaveAttribute('data-column', String(offer.destination[0]));
+  await expect(movedToken).toHaveAttribute('data-row', String(offer.destination[1]));
+
+  const record = `artifact=dev page=${page.url()} offered=${offer.offeredActionId} ` +
+    `destination=${offer.destination.join(',')}`;
+  await testInfo.attach('vtt-top-down-artifact', { body: record, contentType: 'text/plain' });
+  console.log(record);
+});
diff --git a/tests/unit/vtt/encounter-projections.test.ts b/tests/unit/vtt/encounter-projections.test.ts
index 8374684cc23299b347f4a90c4a9989ef3049f36e..3c151fce348d78a18bca0483399a4d9ae00f9f7e
--- a/tests/unit/vtt/encounter-projections.test.ts
+++ b/tests/unit/vtt/encounter-projections.test.ts
@@ -10,6 +10,7 @@
 import {
   projectPlayerBoard,
   serializePlayerBoard,
+  offeredActionId,
 } from '../../../src/vtt/encounter-projections';
 import { decodePlayerDecision } from '../../../src/vtt/local-window-channel';
 import {
@@ -236,24 +237,22 @@
       decision: {
         requestId: request.requestId,
         encounterRevision: request.encounterRevision,
-        action: legal,
+        offeredActionId: offeredActionId(request.requestId, 0),
       },
     };
 
-    expect(decodePlayerDecision(envelope, 'session:test', request).action).toEqual(legal);
+    expect(decodePlayerDecision(envelope, 'session:test', request)).toEqual({
+      requestId: request.requestId,
+      encounterRevision: request.encounterRevision,
+      offeredActionId: offeredActionId(request.requestId, 0),
+    });
     expect(() => decodePlayerDecision({
       ...envelope,
       decision: {
         ...envelope.decision,
-        action: {
-          ...legal,
-          area: {
-            shape: 'sphere',
-            template: { origin: feetPoint(25, 20), radius: feet(10) },
-          },
-        },
+        offeredActionId: 'offer:other-request:0',
       },
-    }, 'session:test', request)).toThrow('not one of the projected legal actions');
+    }, 'session:test', request)).toThrow('not one of the projected offered action IDs');
   });
 
   it('M42-ADJUDICATION-PAUSES cancels the pending request and dispatches nothing until resume', async () => {
diff --git a/tests/unit/vtt/engine-boundary.test.ts b/tests/unit/vtt/engine-boundary.test.ts
index 5098fcf48b0b16cb7f79f655d710bacd0e7cfa08..f635c5517a1d74ec9058ce1c3c06ea028effca78
--- a/tests/unit/vtt/engine-boundary.test.ts
+++ b/tests/unit/vtt/engine-boundary.test.ts
@@ -298,6 +298,49 @@
   return calls.sort();
 }
 
+function memberCallDefinitions(
+  graph: ReadonlyMap<string, SourceModule>,
+  file: string,
+  receiver: string,
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
+  const sourceFile = program.getSourceFile(resolve(ROOT, file));
+  if (sourceFile === undefined) throw new Error(`TypeScript program omitted ${file}`);
+  const definitions: string[] = [];
+  const visit = (node: ts.Node): void => {
+    if (
+      ts.isCallExpression(node) &&
+      ts.isPropertyAccessExpression(node.expression) &&
+      node.expression.expression.getText(sourceFile) === receiver
+    ) {
+      const symbol = checker.getSymbolAtLocation(node.expression.name);
+      const declaration = symbol?.getDeclarations()?.find(ts.isMethodDeclaration);
+      const owner = declaration?.parent;
+      if (declaration === undefined || owner === undefined || !ts.isClassDeclaration(owner)) {
+        throw new Error(`Could not resolve ${node.expression.getText(sourceFile)}.`);
+      }
+      definitions.push(
+        `${node.expression.name.getText(sourceFile)} -> ` +
+        `${repositoryPath(declaration.getSourceFile().fileName)}#${owner.name?.text ?? '<anonymous>'}`,
+      );
+    }
+    ts.forEachChild(node, visit);
+  };
+  ts.forEachChild(sourceFile, visit);
+  return [...new Set(definitions)].sort();
+}
+
 function selectorAuthorityViolations(file: string): readonly string[] {
   const sourceFile = ts.createSourceFile(
     file,
@@ -456,6 +499,60 @@
     ]);
   });
 
+  it('top-down UI mutations enter the rich session service', () => {
+    const graph = dependencyGraph(['src/vtt/encounter-app.ts']);
+    const serviceCalls = memberCallDefinitions(graph, 'src/vtt/encounter-app.ts', 'this.#session');
+    expect(serviceCalls).toEqual([
+      'adjudicate -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
+      'close -> src/vtt/encounter-session-service.ts#EncounterSessionService',
+      'delayTurn -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
+      'dmUseWorldObject -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
+      'endSession -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
+      'finishAdventuringDay -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
+      'finishRoom -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
+      'interrupt -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
+      'replaceController -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
+      'resolveEngineAdjudication -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
+      'resolvePendingDecision -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
+      'resolvePendingPlacement -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
+      'resolveRefusalPrompt -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
+      'resolveRestInterruption -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
+      'resume -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
+      'rewindToRound -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
+      'sessionEnded -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
+      'setHiddenRollCategory -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
+      'setReactionPreference -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
+      'setRefusalHandling -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
+      'skipTurn -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
+      'start -> src/vtt/encounter-session-service.ts#EncounterSessionService',
+      'submitTopDownOfferedAction -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
+      'subscribeTopDown -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
+      'topDownSnapshot -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
+      'undoLast -> src/vtt/encounter-session-service.ts#RichEncounterSessionService',
+    ]);
+    expect(memberCallDefinitions(graph, 'src/vtt/encounter-app.ts', 'this.#lifecycle')).toEqual([
+      'dispatch -> src/vtt/session-lifecycle.ts#IndexedDbSessionLifecycle',
+    ]);
+    expect(readFileSync(resolve(ROOT, 'src/vtt/encounter-app.ts'), 'utf8')).not.toContain('this.#host');
+  });
+
+  it('all runtime entries converge after top-down refactor', () => {
+    const graph = dependencyGraph([...CORE_ENTRYPOINTS, 'src/vtt/encounter-app.ts']);
+    const typeScriptGraph = new Map([...graph].filter(([file]) => /\.tsx?$/u.test(file)));
+    expect(reducerCallSites(typeScriptGraph)).toEqual([
+      'src/vtt/dm-encounter-host.ts#commandReducer -> src/vtt/session-encounter-reducer.ts#reduceSessionEncounter',
+      'src/vtt/session-encounter-reducer.ts#reduceSessionEncounter -> src/vtt/vane-warren.ts#reduceVaneWarrenEncounter',
+      'src/vtt/session-persistence.ts#advanceSkippedTurn -> src/combat/encounter.ts#reduceEncounter',
+      'src/vtt/session-persistence.ts#replaySessionRevisions -> src/vtt/session-encounter-reducer.ts#reduceSessionEncounter',
+      'src/vtt/vane-warren.ts#reduceVaneWarrenEncounter -> src/combat/encounter.ts#reduceEncounter',
+      'src/vtt/vane-warren.ts#reduceVaneWarrenWorldObjectAction -> src/combat/encounter.ts#reduceEncounter',
+    ]);
+    const files = [...graph.keys()].map(repositoryPath);
+    expect(files).toContain('src/vtt/encounter-session-service.ts');
+    expect(files).toContain('src/vtt/session-lifecycle.ts');
+    expect(files).toContain('src/vtt/encounter-selectors.ts');
+  });
+
   it('keeps the complete selector value graph projection-only and platform-neutral', () => {
     const graph = dependencyGraph(['src/vtt/encounter-selectors.ts']);
     const files = [...graph.keys()].map(repositoryPath);
