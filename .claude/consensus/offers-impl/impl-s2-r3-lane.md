Implemented F4.

- [entrypoint.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/mcp/entrypoint.ts:727) recognizes `ENGINE_MCP_LAUNCHER_FORMAT` before structural validation.
- Claimed launchers now throw:
  - Missing binding: `TypeError: Engine MCP launcher requires an explicit offer environment binding.`
  - Invalid structure: `TypeError: Engine MCP launcher manifest structure is invalid.`
  - Invalid bindings retain their existing typed decoder errors.
- [entrypoint routing](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/mcp/entrypoint.ts:746) invokes fixture decoding only for documents without the launcher discriminator.
- Tests cover the exact revision-0 counterexample, bound invalid revision, zero fixture-decoder invocations for claimed launchers, and genuine fixture fallback.
- The transitional in-process default at `entrypoint.ts:321` was not changed.

The board containment fixture required an explicit legacy binding under the new rule. Its escaped-path assertion was strengthened from `null` to the typed structural error at [ai-dm-board-delivery.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-board-delivery.test.ts:718). No context/capture pin changed.

Verification:

- `npm run typecheck:fast` — exit 0, including final run.
- `sg scan` — exit 0.
- `git diff --check` — exit 0.
- `npx vitest run --configLoader runner tests/unit/vtt/offer-environment.test.ts tests/unit/vtt/engine-state-capsule.test.ts tests/unit/tools/engine-mcp-boundary.test.ts`
  - Initial child-process version: 19/21 passed; two fixed 5-second test timeouts.
  - Final sentinel version: 3/3 files, 21/21 tests passed, exit 0, 20.59s.
- `npx vitest run --configLoader runner tests/unit/vtt/standard-offer-generator.test.ts` — 3/3 passed, exit 0.
- `npx vitest run --configLoader runner tests/unit/tools/ai-dm-board-delivery.test.ts`
  - Initial run exposed the unbound test-only manifest: 15/16.
  - Final run: 16/16 passed, exit 0, 119.19s.
- `npx vitest run --configLoader runner tests/unit/tools/ai-dm-conversation.test.ts` — 85/85 passed, exit 0, 792.95s.
- The 172-spec cumulative was not run, as directed.

Final diff: 4 files, 76 insertions and 8 deletions. Frozen contract SHA-256 remains `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`. Updated audit artifacts remain under `.tmp/`.

OFFERS-S2 R3 DONE
diff --git a/.tmp/offers-s2-launcher-producers.txt b/.tmp/offers-s2-launcher-producers.txt
index 833c6677106cf095aa69a0b7a7e337306fcd523c..3d5a78fba3578f5101aff7faa552d67652e5fe36
--- a/.tmp/offers-s2-launcher-producers.txt
+++ b/.tmp/offers-s2-launcher-producers.txt
@@ -23,4 +23,4 @@
 Test-only literals/helpers
 - tests/unit/tools/engine-mcp-boundary.test.ts:75 now emits createLegacyEngineOptionEnvironmentBinding().
 - tests/unit/vtt/offer-environment.test.ts:63-78 helper always emits environment.binding.
-- tests/unit/tools/ai-dm-board-delivery.test.ts:686-706 directly exercises board binding validators, not launcher decoding; its escaped-path negative control is rejected structurally before environment reconstruction. Per supervisor disposition F1, this file was not changed in ROUND 2.
+- tests/unit/tools/ai-dm-board-delivery.test.ts:687-708 directly exercises board binding validators and now emits an explicit legacy binding; its escaped-path negative control requires a typed structural launcher error. Its context/capture pins remain unchanged.
diff --git a/.tmp/offers-s2-pinned-ledger.txt b/.tmp/offers-s2-pinned-ledger.txt
index 94802f036be398caf041c64de58468469c081fad..5435cc41575ff0ad8cc9844af743eafc1c053428
--- a/.tmp/offers-s2-pinned-ledger.txt
+++ b/.tmp/offers-s2-pinned-ledger.txt
@@ -58,15 +58,15 @@
 
 Retained context/capture pins and the authorized E1C move
 
-- tests/unit/tools/ai-dm-board-delivery.test.ts:475-481
+- tests/unit/tools/ai-dm-board-delivery.test.ts:476-482
   Default, explicit image-off, and explicitly semantic-board-off arms retain byte-identical raw context and model invocation fields.
-- tests/unit/tools/ai-dm-board-delivery.test.ts:494
+- tests/unit/tools/ai-dm-board-delivery.test.ts:495
   The E1C raw-context byte count remains pinned at 31,995 bytes.
-- tests/unit/tools/ai-dm-board-delivery.test.ts:59,495
+- tests/unit/tools/ai-dm-board-delivery.test.ts:60,496
   E1C_RAW_CONTEXT_SHA256 moved from 418b9e16e31c01667a2bea7431e6affe3eccc9f80c353783551872bb6ae16118 to 4071943750fc963ceac5a39fcd1baa71e9a3fd2dcc9bc539a1bb0bec4dc18e6d.
   Cause: capsule schema 4 makes the required offer-environment binding part of the capsule digest, so the raw context's state_ref.state_handle changes; the reviewer independently verified that normalizing only that handle restores the prior bytes.
-  Paired independent invariant: tests/unit/tools/ai-dm-board-delivery.test.ts:489-493 derives the rendered state_ref run ID, state handle, and revision directly from the persisted row's capsule rather than from the moved hash.
-- tests/unit/tools/ai-dm-board-delivery.test.ts:610-621
+  Paired independent invariant: tests/unit/tools/ai-dm-board-delivery.test.ts:490-494 derives the rendered state_ref run ID, state handle, and revision directly from the persisted row's capsule rather than from the moved hash.
+- tests/unit/tools/ai-dm-board-delivery.test.ts:611-622
   The 31,995-byte current context and the pre-last-seen 32,000-byte normalized baseline retain their size, state-handle-shape, and FOOTPRINTS_RAW_CONTEXT_SHA256 pin (aa841063ad0512d0f6b286318db802526da3efc5265a04d8b67f4d8351909d51).
 
 No expectation in this ledger was regenerated from ROUND 2 output.
diff --git a/src/vtt/mcp/entrypoint.ts b/src/vtt/mcp/entrypoint.ts
index 31f9ad70cf2aff5a06fc4e970b38200acd66c12c..c664d9d0bd107573ac94782f4fed60ea9bb959fc
--- a/src/vtt/mcp/entrypoint.ts
+++ b/src/vtt/mcp/entrypoint.ts
@@ -227,8 +227,10 @@
   readonly primaryDispatchStartedAtUnixMs: number;
 }
 
+export const ENGINE_MCP_LAUNCHER_FORMAT = 'engine-mcp-launcher-v1' as const;
+
 export interface EngineMcpLauncherManifest {
-  readonly format: 'engine-mcp-launcher-v1';
+  readonly format: typeof ENGINE_MCP_LAUNCHER_FORMAT;
   readonly fixturePath: string;
   readonly proposalSpoolPath: string;
   readonly turnContextSpoolPath?: string;
@@ -657,7 +659,7 @@
 function isLauncherManifest(value: unknown): value is EngineMcpLauncherManifest {
   if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
   const input = value as Readonly<Record<string, unknown>>;
-  return input['format'] === 'engine-mcp-launcher-v1' &&
+  return input['format'] === ENGINE_MCP_LAUNCHER_FORMAT &&
     typeof input['fixturePath'] === 'string' && input['fixturePath'].length > 0 &&
     typeof input['proposalSpoolPath'] === 'string' && input['proposalSpoolPath'].length > 0 &&
     (input['turnContextSpoolPath'] === undefined ||
@@ -723,10 +725,15 @@
 };
 
 export function decodeEngineMcpLauncherManifest(value: unknown): DecodedEngineMcpLauncherManifest | null {
-  if (!isLauncherManifest(value)) return null;
-  if (value.offerEnvironment === undefined) {
+  if (typeof value !== 'object' || value === null || Array.isArray(value) ||
+    (value as Readonly<Record<string, unknown>>)['format'] !== ENGINE_MCP_LAUNCHER_FORMAT) return null;
+  const claimedLauncher = value as Readonly<Record<string, unknown>>;
+  if (!Object.hasOwn(claimedLauncher, 'offerEnvironment') || claimedLauncher['offerEnvironment'] === undefined) {
     throw new TypeError('Engine MCP launcher requires an explicit offer environment binding.');
   }
+  if (!isLauncherManifest(value)) {
+    throw new TypeError('Engine MCP launcher manifest structure is invalid.');
+  }
   const offerEnvironment = decodeEngineOptionEnvironmentBinding(value.offerEnvironment);
   return {
     ...value,
@@ -736,6 +743,15 @@
   };
 }
 
+export function decodeEngineMcpEntrypointDocument(
+  value: unknown,
+  decodeFixture: (fixture: unknown) => EncounterState,
+): DecodedEngineMcpLauncherManifest | null {
+  const manifest = decodeEngineMcpLauncherManifest(value);
+  if (manifest === null) decodeFixture(value);
+  return manifest;
+}
+
 export function reconstructLauncherOfferEnvironment(
   manifest: DecodedEngineMcpLauncherManifest,
 ): EngineOptionEnvironment {
@@ -749,7 +765,7 @@
   } catch {
     return null;
   }
-  return decodeEngineMcpLauncherManifest(decoded);
+  return decodeEngineMcpEntrypointDocument(decoded, decodeArenaFixture);
 }
 
 function kbReadRecords(path: string): readonly KbReadRecord[] {
diff --git a/tests/unit/tools/ai-dm-board-delivery.test.ts b/tests/unit/tools/ai-dm-board-delivery.test.ts
index 9ba1fe03a830092b54e9912c15a443357e079035..ee754aa732e3dfedbdb54dc433d11915f100da5a
--- a/tests/unit/tools/ai-dm-board-delivery.test.ts
+++ b/tests/unit/tools/ai-dm-board-delivery.test.ts
@@ -13,6 +13,7 @@
 import { canonicalJson } from '../../../src/commands/canonical-json';
 import { sha256 } from '../../../src/crypto/sha256';
 import { mcpRequestMeta, createMcpHandler } from '../../../src/vtt/mcp/handler';
+import { createLegacyEngineOptionEnvironmentBinding } from '../../../src/vtt/offers/offer-environment';
 import {
   decodeEngineMcpLauncherManifest,
   createEngineMcpRuntime,
@@ -688,6 +689,7 @@
       proposalSpoolPath, runId: encounterSessionId('encounter:test'),
       branchId: encounterBranchId('branch:test'),
       revision: 2, requestId: 'request:test', phase: 'initial', correctionNumber: 0,
+      offerEnvironment: createLegacyEngineOptionEnvironmentBinding(),
       room: 1, historyKind: 'room_ready', requestKind: 'round_plan',
       boardImage: {
         artifactRoot: root,
@@ -714,6 +716,8 @@
     const binding = record(escaped['boardImage'], 'board binding');
     const artifact = { ...record(binding['artifact'], 'artifact'), relativePath: '../outside.png' };
     escaped['boardImage'] = { ...binding, artifact };
-    expect(decodeEngineMcpLauncherManifest(escaped)).toBeNull();
+    expect(() => decodeEngineMcpLauncherManifest(escaped)).toThrow(
+      new TypeError('Engine MCP launcher manifest structure is invalid.'),
+    );
   });
 });
diff --git a/tests/unit/tools/engine-mcp-boundary.test.ts b/tests/unit/tools/engine-mcp-boundary.test.ts
index 208b8cc3830bbb2e596af09c21b49bcf1fbd7ac6..fd26564494d5acd90cc5deebe14a0f7efb3b0261
--- a/tests/unit/tools/engine-mcp-boundary.test.ts
+++ b/tests/unit/tools/engine-mcp-boundary.test.ts
@@ -5,7 +5,10 @@
 import { collectEngineMcpRuntimeGraph, engineMcpImportBoundaryFailures, scanEngineMcpArtifacts } from '../../../tools/engine-mcp-proof';
 import {
   createEngineMcpRuntime,
+  decodeArenaFixture,
+  decodeEngineMcpEntrypointDocument,
   decodeEngineMcpLauncherManifest,
+  ENGINE_MCP_LAUNCHER_FORMAT,
   freshMonsterPlanningState,
   loadArenaFixture,
 } from '../../../src/vtt/mcp/entrypoint';
@@ -67,12 +70,56 @@
   }
 }
 describe('engine MCP process mutation boundary', () => {
+  it('never routes a malformed claimed launcher through fixture fallback', async () => {
+    const state = await loadArenaFixture(FIXTURE);
+    const counterexample = {
+      format: ENGINE_MCP_LAUNCHER_FORMAT,
+      revision: 0,
+      spec: {},
+      encounter: { state },
+    };
+    let fixtureFallback: ReturnType<typeof decodeArenaFixture> | null = null;
+    expect(() => decodeEngineMcpEntrypointDocument(counterexample, (fixture) => {
+      fixtureFallback = decodeArenaFixture(fixture);
+      return fixtureFallback;
+    })).toThrow(
+      new TypeError('Engine MCP launcher requires an explicit offer environment binding.'),
+    );
+    expect(fixtureFallback).toBeNull();
+  });
+
+  it('rejects a structurally invalid claimed launcher even when its environment is bound', () => {
+    const malformed = {
+      format: ENGINE_MCP_LAUNCHER_FORMAT,
+      revision: 0,
+      offerEnvironment: createLegacyEngineOptionEnvironmentBinding(),
+    };
+    let fixtureDecodeCount = 0;
+    expect(() => decodeEngineMcpEntrypointDocument(malformed, () => {
+      fixtureDecodeCount += 1;
+      return decodeArenaFixture({});
+    })).toThrow(
+      new TypeError('Engine MCP launcher manifest structure is invalid.'),
+    );
+    expect(fixtureDecodeCount).toBe(0);
+  });
+
+  it('continues to route a genuine fixture without the launcher discriminator', async () => {
+    const state = await loadArenaFixture(FIXTURE);
+    let fixtureFallback: ReturnType<typeof decodeArenaFixture> | null = null;
+    expect(decodeEngineMcpEntrypointDocument({ spec: {}, encounter: { state } }, (fixture) => {
+      fixtureFallback = decodeArenaFixture(fixture);
+      return fixtureFallback;
+    })).toBeNull();
+    expect(fixtureFallback).toEqual(state);
+  });
+
   it('decodes legacy launchers as round plans and preserves adjustment correlation fields', async () => {
     const state = await loadArenaFixture(FIXTURE);
     const actors = state.combatants.flatMap((combatant) =>
       combatant.profile.kind === 'monster' && combatant.life !== 'dead' ? [combatant.profile.id] : []);
     const legacy = {
-      format: 'engine-mcp-launcher-v1',
+      format: ENGINE_MCP_LAUNCHER_FORMAT,
       fixturePath: FIXTURE,
       proposalSpoolPath: '/tmp/engine-proposals.jsonl',
       runId: 'encounter:legacy-launcher',
diff --git a/tests/unit/vtt/offer-environment.test.ts b/tests/unit/vtt/offer-environment.test.ts
index f6c5830373b2036f9aaa4145063daa50a3f4f51a..67300aab240bfd4d27b68d738a13700d905af9ea
--- a/tests/unit/vtt/offer-environment.test.ts
+++ b/tests/unit/vtt/offer-environment.test.ts
@@ -17,6 +17,7 @@
 import {
   createEngineMcpRuntime,
   decodeEngineMcpLauncherManifest,
+  ENGINE_MCP_LAUNCHER_FORMAT,
   reconstructLauncherOfferEnvironment,
   type EngineMcpLauncherManifest,
 } from '../../../src/vtt/mcp/entrypoint';
@@ -61,7 +62,7 @@
 
 function launcher(environment: EngineOptionEnvironment): EngineMcpLauncherManifest {
   return {
-    format: 'engine-mcp-launcher-v1',
+    format: ENGINE_MCP_LAUNCHER_FORMAT,
     fixturePath: '/tmp/offers-s2-fixture.json',
     proposalSpoolPath: '/tmp/offers-s2-proposals.jsonl',
     runId: encounterSessionId('encounter:offers-s2'),
