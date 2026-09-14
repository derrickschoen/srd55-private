# Offers 3B fix round 1 lane report (sol)

Source: .tmp/runs/fanout/offers-s3b-r2.log (session 01a09c92-24b1-7e33-b185-4ef8e455ad96)

Implemented the test-only fixes across exactly the same ten files; no production, tool, or documentation files changed.

Finding dispositions:

- S3B-F1 fixed: all ten files now mint an option with the bound environment, resolve successfully through that instance, and reject a second equal-binding instance with `OFFER_ENVIRONMENT_MISMATCH`. Runtime wrappers also use observable proxy instances, proving the injected production runtime read the exact object.
- S3B-F2 fixed in code:
  - Board snapshot now constructs the runtime from the resumed snapshot state at [ai-dm-board-snapshot.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-board-snapshot.test.ts:179).
  - SIMULATED coverage observes runtimes actually created by `runArena` at [local-openai-conversation.SIMULATED.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts:19).
  - Golden coverage binds the identity proof to the exact option ID submitted in the stdio transcript at [engine-mcp-golden.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-golden.test.ts:99).
- S3B-F3 fixed without production changes: proposal generation and divergence re-resolution now both use the canonical-query environment, with equality against `pureTurnProposalResolver` at [ai-dm-conversation.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-conversation.test.ts:1618).

Mutation proof used a fresh equal-binding environment in place of the observed consumer instance. Every mutant exited 1; byte-identical restoration was confirmed:

| File | SHA-256 before/after |
|---|---|
| dm-encounter-host-live-path | `917259aac6e201d913dc0a4e0f52029cc3f056ce0952223f861e18de6f0200fc` |
| ai-dm-arena | `1766e922fbf693f1c74eff0d72118177b5419d2fd3e5a119950db8b55169f305` |
| ai-dm-board-delivery | `be725ddeff8e06e0670b9ba7c15f1b8c2fd861173fca5617bdfb14790991d077` |
| ai-dm-board-snapshot | `b4e40ffe67c5ec42bc664b333bca4dc310adfd0ad0e6f0ae5fb2828da44d3e99` |
| ai-dm-conversation | `90d874a883204262f3e4769f832f87b6b5eae5e6a225561beb90cf15dc2d66e4` |
| ai-dm-knowledge-base | `36fcf7693d14b0b7aa9c77868d94f1c262e7c366ab5f7694f2896b2406475029` |
| engine-mcp-boundary | `0c57ae6e7242802f2a659caab676f20c1f8d8223333f2ef56811310c01f9befc` |
| engine-mcp-golden | `f9d9e9c26d0e01761fda6bbd904073f6754603634cd3e3ca3d56066a79f2c022` |
| engine-mcp-handler | `0604e1ab82953f457b08ea6555c77383e6bd9439939654ea4db7bf28197b076a` |
| local-openai-conversation | `5de109dfc95d38175881ba932d57f2b3a95f78840a3054030498a714dfc1dbb3` |

Mutation commands were:

```text
npx vitest run --configLoader runner <spec> -t <identity/replay test>
```

Results: ten red runs, each `1 failed`; restored green run, `10 files passed / 10 tests passed / 317 skipped`.

Additional verification:

- 3A/environment focused invocation: `10 files passed / 98 tests passed`.
- Board-delivery launcher path: `2 passed`.
- F3 divergence test: `1 passed`.
- Transitional boundary path: `1 passed`.
- `npx tsc -b --force`: exit 0.
- `sg scan --config sgconfig.yml src`: exit 0.
- `git diff --check`: exit 0.
- Frozen contract: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.
- Diff: ten test files, 560 insertions / 52 deletions.
- Direct-consumer ordering still begins with the required ten paths. The reconstructed newline inventory SHA was `ba9f5b0a458135c6e35cf35c50a24a037f52ab7cf9c41e71df5186103e736d83`, not the supplied `3a5dd63f…`; the original inventory script was unavailable.

Blocking verification issue: `engine-mcp-golden` repeatedly timed out at its unchanged 30,000 ms limit, including isolated and single-worker runs. The cumulative ten-file runs consequently could not finish green; other 30/60-second arena tests also timed out under parallel resource contention. I did not raise timeouts because that is forbidden for non-D544 tests.

BLOCKED: required golden/cumulative verification cannot pass the unchanged 30-second timeout, and the supplied AST inventory SHA could not be reproduced without its original script.
diff --git a//tmp/d584-offers-import-closure.ts b//tmp/d584-offers-import-closure.ts
new file mode 100644
index 0000000000000000000000000000000000000000..bf93d1846f3ea87bf425adecf617eba0916d890f
--- /dev/null
+++ b//tmp/d584-offers-import-closure.ts
@@ -0,0 +1,78 @@
+import { createHash } from 'node:crypto';
+import { readdirSync, readFileSync, statSync } from 'node:fs';
+import { dirname, extname, join, normalize, relative, resolve } from 'node:path';
+import ts from 'typescript';
+
+const root = process.cwd();
+const roots = [
+  'src/vtt/encounter-board-projection.ts',
+  'src/vtt/engine-round-session.ts',
+  'src/vtt/intel/opportunity-cost.ts',
+  'src/vtt/intel/team-scorer.ts',
+  'src/vtt/intent-resolver.ts',
+  'src/vtt/mcp/engine-server.ts',
+  'src/vtt/mcp/entrypoint.ts',
+  'src/vtt/offered-option-paths.ts',
+  'src/vtt/plan-materiality.ts',
+  'src/vtt/speculative-planning.ts',
+] as const;
+
+function filesBelow(directory: string): readonly string[] {
+  return readdirSync(directory).flatMap((name) => {
+    const path = join(directory, name);
+    return statSync(path).isDirectory() ? filesBelow(path) : [path];
+  });
+}
+
+const files = ['src', 'tools', 'tests'].flatMap((directory) => filesBelow(resolve(root, directory)))
+  .filter((path) => ['.ts', '.tsx', '.mts', '.cts'].includes(extname(path)))
+  .map((path) => relative(root, path));
+const known = new Set(files);
+const reverse = new Map<string, Set<string>>();
+
+function resolveImport(consumer: string, specifier: string): string | null {
+  if (!specifier.startsWith('.')) return null;
+  const base = normalize(relative(root, resolve(root, dirname(consumer), specifier)));
+  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.mts`, `${base}.cts`, join(base, 'index.ts')]) {
+    if (known.has(candidate)) return candidate;
+  }
+  return null;
+}
+
+for (const consumer of files) {
+  const source = ts.createSourceFile(consumer, readFileSync(resolve(root, consumer), 'utf8'), ts.ScriptTarget.Latest, true);
+  const visit = (node: ts.Node): void => {
+    const literal = (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
+      ? node.moduleSpecifier
+      : ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)
+        ? node.moduleReference.expression
+        : ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword
+          ? node.arguments[0]
+          : undefined;
+    if (literal !== undefined && ts.isStringLiteralLike(literal)) {
+      const producer = resolveImport(consumer, literal.text);
+      if (producer !== null) {
+        const consumers = reverse.get(producer) ?? new Set<string>();
+        consumers.add(consumer);
+        reverse.set(producer, consumers);
+      }
+    }
+    ts.forEachChild(node, visit);
+  };
+  visit(source);
+}
+
+const reached = new Set<string>(roots);
+const queue = [...roots];
+while (queue.length > 0) {
+  const producer = queue.shift();
+  if (producer === undefined) break;
+  for (const consumer of reverse.get(producer) ?? []) {
+    if (reached.has(consumer)) continue;
+    reached.add(consumer);
+    queue.push(consumer);
+  }
+}
+const tests = [...reached].filter((path) => path.startsWith('tests/') && path.includes('.test.')).sort();
+const bytes = `${tests.join('\n')}\n`;
+console.log(JSON.stringify({ count: tests.length, firstTen: tests.slice(0, 10), sha256: createHash('sha256').update(bytes).digest('hex') }, null, 2));
diff --git a/tests/integration/vtt/dm-encounter-host-live-path.test.ts b/tests/integration/vtt/dm-encounter-host-live-path.test.ts
index e40f3363e672d24808abb89ac15c843d60ba6ec0..e9cd125f5db2cc6a3fa789139589dd248a22b049
--- a/tests/integration/vtt/dm-encounter-host-live-path.test.ts
+++ b/tests/integration/vtt/dm-encounter-host-live-path.test.ts
@@ -15,9 +15,16 @@
   replaySessionRevisions,
 } from '../../../src/vtt/session-persistence';
 import { createConversationRoundDeadline } from '../../../src/vtt/agent-session-lifecycle';
-import { createEngineMcpRuntime as createDefaultEngineMcpRuntime } from '../../../src/vtt/mcp/entrypoint';
+import {
+  createEngineMcpRuntime as createDefaultEngineMcpRuntime,
+  freshMonsterPlanningState,
+} from '../../../src/vtt/mcp/entrypoint';
 import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
-import { createRevisionBoundEngineOptionEnvironment } from '../../../src/vtt/offers/offer-environment';
+import {
+  createRevisionBoundEngineOptionEnvironment,
+  engineOptionEnvironmentFromBinding,
+} from '../../../src/vtt/offers/offer-environment';
+import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
 import { MAX_PROPOSAL_CORRECTIONS } from '../../../src/vtt/turn-exhaustion-coordinator';
 import { agentSessionIdFromCli } from '../../../src/vtt/agent-session';
 import {
@@ -28,14 +35,57 @@
 import { monsterProfile, placedToken, playerProfile } from '../../unit/combat/fixtures';
 
 const BOUND_OFFER_ENVIRONMENT = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
+let offerEnvironmentIdentityChecked = false;
+
+function observeOfferEnvironment(offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT) {
+  let bindingReads = 0;
+  return {
+    environment: new Proxy(offerEnvironment, {
+      get(target, property, receiver) {
+        if (property === 'binding') bindingReads += 1;
+        return Reflect.get(target, property, receiver) as unknown;
+      },
+    }),
+    bindingReads: () => bindingReads,
+  };
+}
+
+function expectOfferEnvironmentIdentity(
+  state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
+  offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT,
+): void {
+  const planningState = freshMonsterPlanningState(state);
+  const actorId = planningState.combatants.find(
+    (candidate) => candidate.profile.kind === 'monster' && candidate.life === 'living',
+  )?.profile.id;
+  if (actorId === undefined) throw new Error('Offer-environment probe has no living monster.');
+  const option = availableEngineActorOptions(planningState, actorId, offerEnvironment)[0];
+  if (option === undefined) throw new Error(`Offer-environment probe has no option for ${actorId}.`);
+  expect(resolveEngineActorOption(planningState, option, offerEnvironment).valid).toBe(true);
+  const equalBindingEnvironment = engineOptionEnvironmentFromBinding(
+    offerEnvironment.queries,
+    offerEnvironment.binding,
+  );
+  expect(equalBindingEnvironment).not.toBe(offerEnvironment);
+  expect(equalBindingEnvironment.binding).toEqual(offerEnvironment.binding);
+  expect(resolveEngineActorOption(planningState, option, equalBindingEnvironment)).toMatchObject({
+    valid: false,
+    code: 'OFFER_ENVIRONMENT_MISMATCH',
+  });
+}
 
 function createEngineMcpRuntime(
   state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
   options: NonNullable<Parameters<typeof createDefaultEngineMcpRuntime>[1]> = {},
 ): ReturnType<typeof createDefaultEngineMcpRuntime> {
   const offerEnvironment = options.offerEnvironment ?? BOUND_OFFER_ENVIRONMENT;
-  const runtime = createDefaultEngineMcpRuntime(state, { ...options, offerEnvironment });
-  expect(runtime.feed.current().offerEnvironment).toEqual(offerEnvironment.binding);
+  const observed = observeOfferEnvironment(offerEnvironment);
+  const runtime = createDefaultEngineMcpRuntime(state, { ...options, offerEnvironment: observed.environment });
+  expect(observed.bindingReads()).toBeGreaterThan(0);
+  if (!offerEnvironmentIdentityChecked) {
+    expectOfferEnvironmentIdentity(state, observed.environment);
+    offerEnvironmentIdentityChecked = true;
+  }
   return runtime;
 }
 
diff --git a/tests/unit/tools/ai-dm-arena.test.ts b/tests/unit/tools/ai-dm-arena.test.ts
index 5844e48434f91d655ea77974e0aa942915e261a0..dda928a68ee87dfcc849adee72342c6e60da8bcd
--- a/tests/unit/tools/ai-dm-arena.test.ts
+++ b/tests/unit/tools/ai-dm-arena.test.ts
@@ -24,7 +24,10 @@
 } from '../../../src/vtt/mcp/entrypoint';
 import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
 import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
-import { createRevisionBoundEngineOptionEnvironment } from '../../../src/vtt/offers/offer-environment';
+import {
+  createRevisionBoundEngineOptionEnvironment,
+  engineOptionEnvironmentFromBinding,
+} from '../../../src/vtt/offers/offer-environment';
 import { validateArenaPlan } from '../../../src/vtt/arena-legality';
 import { SNIPPET_REGISTRY } from '../../../src/vtt/snippet-registry-runtime';
 import { engineActionId, engineSpellId } from '../../../src/vtt/turn-proposal';
@@ -55,14 +58,57 @@
 
 const DEFAULT_KB_HASH = '00776f3f2d4cd7468a1eb2a63028e9c3f846b43b14a4e5787d3e9c94e02633c0';
 const BOUND_OFFER_ENVIRONMENT = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
+let offerEnvironmentIdentityChecked = false;
 
+function observeOfferEnvironment(offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT) {
+  let bindingReads = 0;
+  return {
+    environment: new Proxy(offerEnvironment, {
+      get(target, property, receiver) {
+        if (property === 'binding') bindingReads += 1;
+        return Reflect.get(target, property, receiver) as unknown;
+      },
+    }),
+    bindingReads: () => bindingReads,
+  };
+}
+
+function expectOfferEnvironmentIdentity(
+  state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
+  offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT,
+): void {
+  const planningState = freshMonsterPlanningState(state);
+  const actorId = planningState.combatants.find(
+    (candidate) => candidate.profile.kind === 'monster' && candidate.life === 'living',
+  )?.profile.id;
+  if (actorId === undefined) throw new Error('Offer-environment probe has no living monster.');
+  const option = availableEngineActorOptions(planningState, actorId, offerEnvironment)[0];
+  if (option === undefined) throw new Error(`Offer-environment probe has no option for ${actorId}.`);
+  expect(resolveEngineActorOption(planningState, option, offerEnvironment).valid).toBe(true);
+  const equalBindingEnvironment = engineOptionEnvironmentFromBinding(
+    offerEnvironment.queries,
+    offerEnvironment.binding,
+  );
+  expect(equalBindingEnvironment).not.toBe(offerEnvironment);
+  expect(equalBindingEnvironment.binding).toEqual(offerEnvironment.binding);
+  expect(resolveEngineActorOption(planningState, option, equalBindingEnvironment)).toMatchObject({
+    valid: false,
+    code: 'OFFER_ENVIRONMENT_MISMATCH',
+  });
+}
+
 function createEngineMcpRuntime(
   state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
   options: NonNullable<Parameters<typeof createDefaultEngineMcpRuntime>[1]> = {},
 ): ReturnType<typeof createDefaultEngineMcpRuntime> {
   const offerEnvironment = options.offerEnvironment ?? BOUND_OFFER_ENVIRONMENT;
-  const runtime = createDefaultEngineMcpRuntime(state, { ...options, offerEnvironment });
-  expect(runtime.feed.current().offerEnvironment).toEqual(offerEnvironment.binding);
+  const observed = observeOfferEnvironment(offerEnvironment);
+  const runtime = createDefaultEngineMcpRuntime(state, { ...options, offerEnvironment: observed.environment });
+  expect(observed.bindingReads()).toBeGreaterThan(0);
+  if (!offerEnvironmentIdentityChecked) {
+    expectOfferEnvironmentIdentity(state, observed.environment);
+    offerEnvironmentIdentityChecked = true;
+  }
   return runtime;
 }
 
@@ -322,6 +368,11 @@
 ] as const;
 
 describe('AI-DM arena', () => {
+  it('rejects an equal-binding replacement at its runtime consumer', () => {
+    createEngineMcpRuntime(generateRoom(3_943_001).encounter.state);
+    expect(offerEnvironmentIdentityChecked).toBe(true);
+  });
+
   it('maps rows with zero, one, and two KB reads without losing hashes or order (mutation: omit arena kbReads)', () => {
     const records: readonly KbReadRecord[] = [
       {
diff --git a/tests/unit/tools/ai-dm-board-delivery.test.ts b/tests/unit/tools/ai-dm-board-delivery.test.ts
index 29a2b4400feb7c70efb8f2c082ae2f8183c45ea9..00d66ff2e927cb412cf291816ebd2a0d160acf0f
--- a/tests/unit/tools/ai-dm-board-delivery.test.ts
+++ b/tests/unit/tools/ai-dm-board-delivery.test.ts
@@ -19,9 +19,11 @@
   engineOptionEnvironmentFromBinding,
 } from '../../../src/vtt/offers/offer-environment';
 import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
+import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
 import {
   decodeEngineMcpLauncherManifest,
   createEngineMcpRuntime as createDefaultEngineMcpRuntime,
+  freshMonsterPlanningState,
   loadArenaFixture,
   validatedLauncherBoardHtmlReference,
   validatedLauncherBoardImage,
@@ -56,14 +58,58 @@
 
 const META = mcpRequestMeta({ name: 'board-delivery-test', version: '1.0.0' });
 const BOUND_OFFER_ENVIRONMENT = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
+let offerEnvironmentIdentityChecked = false;
+let launcherOfferEnvironmentIdentityChecked = false;
+
+function observeOfferEnvironment(offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT) {
+  let bindingReads = 0;
+  return {
+    environment: new Proxy(offerEnvironment, {
+      get(target, property, receiver) {
+        if (property === 'binding') bindingReads += 1;
+        return Reflect.get(target, property, receiver) as unknown;
+      },
+    }),
+    bindingReads: () => bindingReads,
+  };
+}
+
+function expectOfferEnvironmentIdentity(
+  state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
+  offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT,
+): void {
+  const planningState = freshMonsterPlanningState(state);
+  const actorId = planningState.combatants.find(
+    (candidate) => candidate.profile.kind === 'monster' && candidate.life === 'living',
+  )?.profile.id;
+  if (actorId === undefined) throw new Error('Offer-environment probe has no living monster.');
+  const option = availableEngineActorOptions(planningState, actorId, offerEnvironment)[0];
+  if (option === undefined) throw new Error(`Offer-environment probe has no option for ${actorId}.`);
+  expect(resolveEngineActorOption(planningState, option, offerEnvironment).valid).toBe(true);
+  const equalBindingEnvironment = engineOptionEnvironmentFromBinding(
+    offerEnvironment.queries,
+    offerEnvironment.binding,
+  );
+  expect(equalBindingEnvironment).not.toBe(offerEnvironment);
+  expect(equalBindingEnvironment.binding).toEqual(offerEnvironment.binding);
+  expect(resolveEngineActorOption(planningState, option, equalBindingEnvironment)).toMatchObject({
+    valid: false,
+    code: 'OFFER_ENVIRONMENT_MISMATCH',
+  });
+}
 
 function createEngineMcpRuntime(
   state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
   options: NonNullable<Parameters<typeof createDefaultEngineMcpRuntime>[1]> = {},
 ): ReturnType<typeof createDefaultEngineMcpRuntime> {
   const offerEnvironment = options.offerEnvironment ?? BOUND_OFFER_ENVIRONMENT;
-  const runtime = createDefaultEngineMcpRuntime(state, { ...options, offerEnvironment });
-  expect(runtime.feed.current().offerEnvironment).toEqual(offerEnvironment.binding);
+  const observed = observeOfferEnvironment(offerEnvironment);
+  const runtime = createDefaultEngineMcpRuntime(state, { ...options, offerEnvironment: observed.environment });
+  expect(observed.bindingReads()).toBeGreaterThan(0);
+  if (!offerEnvironmentIdentityChecked) {
+    expectOfferEnvironmentIdentity(state, observed.environment);
+    offerEnvironmentIdentityChecked = true;
+  }
   return runtime;
 }
 
@@ -156,8 +202,13 @@
   ): Promise<AgentTurnResult> {
     const manifest = JSON.parse(readFileSync(invocation.launcherToken, 'utf8')) as EngineMcpLauncherManifest;
     const state = await loadArenaFixture(manifest.fixturePath);
+    const offerEnvironment = launcherOfferEnvironment(manifest);
+    if (!launcherOfferEnvironmentIdentityChecked) {
+      expectOfferEnvironmentIdentity(state, offerEnvironment);
+      launcherOfferEnvironmentIdentityChecked = true;
+    }
     const runtime = createEngineMcpRuntime(state, {
-      offerEnvironment: launcherOfferEnvironment(manifest),
+      offerEnvironment,
       runId: manifest.runId, branchId: manifest.branchId, revision: manifest.revision,
       requestId: manifest.requestId, phase: manifest.phase,
       correctionNumber: manifest.correctionNumber, room: manifest.room,
@@ -211,6 +262,11 @@
 }
 
 describe('board image parsing and row evidence', () => {
+  it('rejects an equal-binding replacement at its runtime consumer', async () => {
+    createEngineMcpRuntime(await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json'));
+    expect(offerEnvironmentIdentityChecked).toBe(true);
+  });
+
   it('parses default/off/png/capture_only as a closed mode in conversation and arena', () => {
     const directory = mkdtempSync(join(tmpdir(), 'board-image-parser-'));
     const conversationBase = ['--rooms', '1', '--rounds', '1', '--out', join(directory, 'c.jsonl')];
diff --git a/tests/unit/tools/ai-dm-board-snapshot.test.ts b/tests/unit/tools/ai-dm-board-snapshot.test.ts
index 0537cd07b5675de4f1105b803d7b641a7d1d6082..819d36526b94e99e3ad6a3b277b9a72919582bbb
--- a/tests/unit/tools/ai-dm-board-snapshot.test.ts
+++ b/tests/unit/tools/ai-dm-board-snapshot.test.ts
@@ -11,10 +11,18 @@
   importSavedSession,
   EncounterSessionJournal,
 } from '../../../src/vtt/session-persistence';
-import { createEngineMcpRuntime, loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
+import {
+  createEngineMcpRuntime,
+  freshMonsterPlanningState,
+  loadArenaFixture,
+} from '../../../src/vtt/mcp/entrypoint';
 import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
-import { createRevisionBoundEngineOptionEnvironment } from '../../../src/vtt/offers/offer-environment';
 import {
+  createRevisionBoundEngineOptionEnvironment,
+  engineOptionEnvironmentFromBinding,
+} from '../../../src/vtt/offers/offer-environment';
+import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
+import {
   assertBoardImageFresh,
   boardSnapshotCaptureGeometry,
   boardStateDigest,
@@ -30,6 +38,43 @@
 );
 const BOUND_OFFER_ENVIRONMENT = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
 
+function observeOfferEnvironment() {
+  let bindingReads = 0;
+  return {
+    environment: new Proxy(BOUND_OFFER_ENVIRONMENT, {
+      get(target, property, receiver) {
+        if (property === 'binding') bindingReads += 1;
+        return Reflect.get(target, property, receiver) as unknown;
+      },
+    }),
+    bindingReads: () => bindingReads,
+  };
+}
+
+function expectOfferEnvironmentIdentity(
+  state: EncounterState,
+  offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT,
+): void {
+  const planningState = freshMonsterPlanningState(state);
+  const actorId = planningState.combatants.find(
+    (candidate) => candidate.profile.kind === 'monster' && candidate.life === 'living',
+  )?.profile.id;
+  if (actorId === undefined) throw new Error('Snapshot offer-environment probe has no living monster.');
+  const option = availableEngineActorOptions(planningState, actorId, offerEnvironment)[0];
+  if (option === undefined) throw new Error(`Snapshot offer-environment probe has no option for ${actorId}.`);
+  expect(resolveEngineActorOption(planningState, option, offerEnvironment).valid).toBe(true);
+  const equalBindingEnvironment = engineOptionEnvironmentFromBinding(
+    offerEnvironment.queries,
+    offerEnvironment.binding,
+  );
+  expect(equalBindingEnvironment).not.toBe(offerEnvironment);
+  expect(equalBindingEnvironment.binding).toEqual(offerEnvironment.binding);
+  expect(resolveEngineActorOption(planningState, option, equalBindingEnvironment)).toMatchObject({
+    valid: false,
+    code: 'OFFER_ENVIRONMENT_MISMATCH',
+  });
+}
+
 function sourceFor(state: EncounterState, room = 1): BoardImageSource {
   return {
     room,
@@ -57,13 +102,6 @@
 }
 
 describe('AI DM board snapshot contracts', () => {
-  it('binds the snapshot fixture runtime to its explicit offer environment', async () => {
-    const state = await loadArenaFixture(CONTROL_FIXTURES[0]!);
-    const runtime = createEngineMcpRuntime(state, { offerEnvironment: BOUND_OFFER_ENVIRONMENT });
-
-    expect(runtime.feed.current().offerEnvironment).toEqual(BOUND_OFFER_ENVIRONMENT.binding);
-  });
-
   it('isolates its preview port from the Playwright worker pool', () => {
     expect(configuredPreviewPort({ PLAYWRIGHT_PORT: '4650' })).toBe(0);
     expect(configuredPreviewPort({
@@ -138,7 +176,19 @@
 
     expect(importSavedSession(store, bundle.bytes)).toBe(bundle.sessionId);
     const resumed = EncounterSessionJournal.resume(bundle.sessionId, store, new MemoryMirrorSink());
+    const observed = observeOfferEnvironment();
+    const runtime = createEngineMcpRuntime(resumed.encounterState, {
+      offerEnvironment: observed.environment,
+    });
+    expect(observed.bindingReads()).toBeGreaterThan(0);
+    expectOfferEnvironmentIdentity(resumed.encounterState, observed.environment);
     expect(canonicalJson(resumed.encounterState)).toBe(stateBytes);
+    expect(runtime.feed.current().projection.combatants.map((combatant) => combatant.id).sort()).toEqual(
+      resumed.encounterState.combatants
+        .filter((combatant) => combatant.life !== 'dead')
+        .map((combatant) => combatant.profile.id)
+        .sort(),
+    );
     expect(resumed.coordinatorState.pause).toEqual({ kind: 'interrupted' });
     expect(resumed.controllers).toHaveLength(state.combatants.length);
     expect(resumed.controllers.every((controller) => controller.kind === 'human')).toBe(true);
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 3c455440dfa08bdbbaf27cef5cecd9e3db4bb307..edea5693621b6d02209c2b0e1bf4ca5fa9a84da5
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -40,6 +40,8 @@
   availableEngineActorOptions,
   createPureTurnProposalResolver,
   engineActorOptionsForEnvironment,
+  pureTurnProposalResolver,
+  resolveEngineActorOption,
 } from '../../../src/vtt/intent-resolver';
 import {
   createEngineMcpRuntime as createDefaultEngineMcpRuntime,
@@ -95,15 +97,58 @@
 ] });
 const DEFAULT_KB_HASH = '00776f3f2d4cd7468a1eb2a63028e9c3f846b43b14a4e5787d3e9c94e02633c0';
 const BOUND_OFFER_ENVIRONMENT = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
-const boundTurnProposalResolver = createPureTurnProposalResolver(BOUND_OFFER_ENVIRONMENT);
+const DIVERGENCE_OFFER_ENVIRONMENT = canonicalEngineQueryPort;
+let offerEnvironmentIdentityChecked = false;
 
+function observeOfferEnvironment(offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT) {
+  let bindingReads = 0;
+  return {
+    environment: new Proxy(offerEnvironment, {
+      get(target, property, receiver) {
+        if (property === 'binding') bindingReads += 1;
+        return Reflect.get(target, property, receiver) as unknown;
+      },
+    }),
+    bindingReads: () => bindingReads,
+  };
+}
+
+function expectOfferEnvironmentIdentity(
+  state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
+  offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT,
+): void {
+  const planningState = freshMonsterPlanningState(state);
+  const actorId = planningState.combatants.find(
+    (candidate) => candidate.profile.kind === 'monster' && candidate.life === 'living',
+  )?.profile.id;
+  if (actorId === undefined) throw new Error('Offer-environment probe has no living monster.');
+  const option = availableEngineActorOptions(planningState, actorId, offerEnvironment)[0];
+  if (option === undefined) throw new Error(`Offer-environment probe has no option for ${actorId}.`);
+  expect(resolveEngineActorOption(planningState, option, offerEnvironment).valid).toBe(true);
+  const equalBindingEnvironment = engineOptionEnvironmentFromBinding(
+    offerEnvironment.queries,
+    offerEnvironment.binding,
+  );
+  expect(equalBindingEnvironment).not.toBe(offerEnvironment);
+  expect(equalBindingEnvironment.binding).toEqual(offerEnvironment.binding);
+  expect(resolveEngineActorOption(planningState, option, equalBindingEnvironment)).toMatchObject({
+    valid: false,
+    code: 'OFFER_ENVIRONMENT_MISMATCH',
+  });
+}
+
 function createEngineMcpRuntime(
   state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
   options: NonNullable<Parameters<typeof createDefaultEngineMcpRuntime>[1]> = {},
 ): ReturnType<typeof createDefaultEngineMcpRuntime> {
   const offerEnvironment = options.offerEnvironment ?? BOUND_OFFER_ENVIRONMENT;
-  const runtime = createDefaultEngineMcpRuntime(state, { ...options, offerEnvironment });
-  expect(runtime.feed.current().offerEnvironment).toEqual(offerEnvironment.binding);
+  const observed = observeOfferEnvironment(offerEnvironment);
+  const runtime = createDefaultEngineMcpRuntime(state, { ...options, offerEnvironment: observed.environment });
+  expect(observed.bindingReads()).toBeGreaterThan(0);
+  if (!offerEnvironmentIdentityChecked) {
+    expectOfferEnvironmentIdentity(state, observed.environment);
+    offerEnvironmentIdentityChecked = true;
+  }
   return runtime;
 }
 
@@ -667,6 +712,11 @@
 }
 
 describe('AI-DM engine MCP conversation runner', () => {
+  it('rejects an equal-binding replacement at its runtime consumer', () => {
+    createEngineMcpRuntime(generateRoom(3_943_001).encounter.state);
+    expect(offerEnvironmentIdentityChecked).toBe(true);
+  });
+
   it('rejects a request after the MCP child closes stdin without an unhandled EPIPE', async () => {
     const child = spawn(process.execPath, ['-e', [
       "process.on('SIGTERM', () => {});",
@@ -1565,15 +1615,16 @@
     const actor = state.combatants.find((combatant) =>
       combatant.profile.kind === 'monster' && combatant.life !== 'dead');
     if (actor === undefined) throw new Error('Generated room 3943006 has no living monster.');
-    const option = availableEngineActorOptions(state, actor.profile.id, BOUND_OFFER_ENVIRONMENT)
+    const option = availableEngineActorOptions(state, actor.profile.id, DIVERGENCE_OFFER_ENVIRONMENT)
       .find((candidate) => candidate.actionSlots.some((slot) => slot.use.kind === 'dodge'));
     if (option === undefined) throw new Error('Room 3943006 Dodge option is absent.');
     const proposal = {
       actorId: actor.profile.id, expectedRevision: state.revision, primaryOptionId: option.optionId,
       fallbackOptionId: null, reason: 'Exercise the fixture proposal path.', overrideJustification: null,
     };
-    const proposalTime = boundTurnProposalResolver.resolve(state, proposal);
+    const proposalTime = createPureTurnProposalResolver(DIVERGENCE_OFFER_ENVIRONMENT).resolve(state, proposal);
     if (!proposalTime.valid) throw new Error('Room 3943006 Dodge proposal did not resolve.');
+    expect(proposalTime).toEqual(pureTurnProposalResolver.resolve(state, proposal));
 
     expect(proposalResolutionDivergence(state, {
       proposal,
diff --git a/tests/unit/tools/ai-dm-knowledge-base.test.ts b/tests/unit/tools/ai-dm-knowledge-base.test.ts
index d637ea47bb363718ee55eae43cb57f0213c0fa3d..3517af2c5c24f58c4dfcd13e0544cd81a025cdf5
--- a/tests/unit/tools/ai-dm-knowledge-base.test.ts
+++ b/tests/unit/tools/ai-dm-knowledge-base.test.ts
@@ -20,11 +20,16 @@
 import {
   createEngineMcpRuntime as createDefaultEngineMcpRuntime,
   createLauncherKbReadBudget,
+  freshMonsterPlanningState,
   loadArenaFixture,
 } from '../../../src/vtt/mcp/entrypoint';
 import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
-import { createRevisionBoundEngineOptionEnvironment } from '../../../src/vtt/offers/offer-environment';
 import {
+  createRevisionBoundEngineOptionEnvironment,
+  engineOptionEnvironmentFromBinding,
+} from '../../../src/vtt/offers/offer-environment';
+import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
+import {
   kbSubjectSources,
   KbReadBudget,
   type KbReadRecord,
@@ -48,14 +53,57 @@
 
 const arenaFixture = 'tests/fixtures/arena-basis/seed-3943001.json' as const;
 const BOUND_OFFER_ENVIRONMENT = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
+let offerEnvironmentIdentityChecked = false;
+
+function observeOfferEnvironment(offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT) {
+  let bindingReads = 0;
+  return {
+    environment: new Proxy(offerEnvironment, {
+      get(target, property, receiver) {
+        if (property === 'binding') bindingReads += 1;
+        return Reflect.get(target, property, receiver) as unknown;
+      },
+    }),
+    bindingReads: () => bindingReads,
+  };
+}
 
+function expectOfferEnvironmentIdentity(
+  state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
+  offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT,
+): void {
+  const planningState = freshMonsterPlanningState(state);
+  const actorId = planningState.combatants.find(
+    (candidate) => candidate.profile.kind === 'monster' && candidate.life === 'living',
+  )?.profile.id;
+  if (actorId === undefined) throw new Error('Offer-environment probe has no living monster.');
+  const option = availableEngineActorOptions(planningState, actorId, offerEnvironment)[0];
+  if (option === undefined) throw new Error(`Offer-environment probe has no option for ${actorId}.`);
+  expect(resolveEngineActorOption(planningState, option, offerEnvironment).valid).toBe(true);
+  const equalBindingEnvironment = engineOptionEnvironmentFromBinding(
+    offerEnvironment.queries,
+    offerEnvironment.binding,
+  );
+  expect(equalBindingEnvironment).not.toBe(offerEnvironment);
+  expect(equalBindingEnvironment.binding).toEqual(offerEnvironment.binding);
+  expect(resolveEngineActorOption(planningState, option, equalBindingEnvironment)).toMatchObject({
+    valid: false,
+    code: 'OFFER_ENVIRONMENT_MISMATCH',
+  });
+}
+
 function createEngineMcpRuntime(
   state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
   options: NonNullable<Parameters<typeof createDefaultEngineMcpRuntime>[1]> = {},
 ): ReturnType<typeof createDefaultEngineMcpRuntime> {
   const offerEnvironment = options.offerEnvironment ?? BOUND_OFFER_ENVIRONMENT;
-  const runtime = createDefaultEngineMcpRuntime(state, { ...options, offerEnvironment });
-  expect(runtime.feed.current().offerEnvironment).toEqual(offerEnvironment.binding);
+  const observed = observeOfferEnvironment(offerEnvironment);
+  const runtime = createDefaultEngineMcpRuntime(state, { ...options, offerEnvironment: observed.environment });
+  expect(observed.bindingReads()).toBeGreaterThan(0);
+  if (!offerEnvironmentIdentityChecked) {
+    expectOfferEnvironmentIdentity(state, observed.environment);
+    offerEnvironmentIdentityChecked = true;
+  }
   return runtime;
 }
 const inputs = declareTestInputs({ fixtures: [...fixturePaths, arenaFixture] });
@@ -78,6 +126,11 @@
 }
 
 describe('D466 AI DM knowledge-base fixture package', () => {
+  it('rejects an equal-binding replacement at its runtime consumer', async () => {
+    createEngineMcpRuntime(await loadArenaFixture(arenaFixture));
+    expect(offerEnvironmentIdentityChecked).toBe(true);
+  });
+
   it('enforces root and startup byte caps plus the exact root structure and role', () => {
     const rootBytes = Buffer.byteLength(rootText, 'utf8');
     const startupBytes = Buffer.byteLength(`${rootText}\n\n${tacticsText}`, 'utf8');
diff --git a/tests/unit/tools/engine-mcp-boundary.test.ts b/tests/unit/tools/engine-mcp-boundary.test.ts
index c24ce395f57ade784761fcf778bb953bdebb70cc..0442d7ad04d6a559ee64cfdfdf1d64c5960c210f
--- a/tests/unit/tools/engine-mcp-boundary.test.ts
+++ b/tests/unit/tools/engine-mcp-boundary.test.ts
@@ -16,21 +16,66 @@
   createLegacyEngineOptionEnvironment,
   createRevisionBoundEngineOptionEnvironment,
   createLegacyEngineOptionEnvironmentBinding,
+  engineOptionEnvironmentFromBinding,
 } from '../../../src/vtt/offers/offer-environment';
 import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
+import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
 
 const FIXTURE = 'tests/fixtures/arena-basis/seed-3943006.json';
 const META = mcpRequestMeta({ name: 'SUBSTITUTED_LOCAL', version: '1.0.0' });
 const BOUND_OFFER_ENVIRONMENT = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
 const TRANSITIONAL_STDIO_OFFER_ENVIRONMENT = createLegacyEngineOptionEnvironment(canonicalEngineQueryPort);
+let offerEnvironmentIdentityChecked = false;
 
+function observeOfferEnvironment(offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT) {
+  let bindingReads = 0;
+  return {
+    environment: new Proxy(offerEnvironment, {
+      get(target, property, receiver) {
+        if (property === 'binding') bindingReads += 1;
+        return Reflect.get(target, property, receiver) as unknown;
+      },
+    }),
+    bindingReads: () => bindingReads,
+  };
+}
+
+function expectOfferEnvironmentIdentity(
+  state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
+  offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT,
+): void {
+  const planningState = freshMonsterPlanningState(state);
+  const actorId = planningState.combatants.find(
+    (candidate) => candidate.profile.kind === 'monster' && candidate.life === 'living',
+  )?.profile.id;
+  if (actorId === undefined) throw new Error('Offer-environment probe has no living monster.');
+  const option = availableEngineActorOptions(planningState, actorId, offerEnvironment)[0];
+  if (option === undefined) throw new Error(`Offer-environment probe has no option for ${actorId}.`);
+  expect(resolveEngineActorOption(planningState, option, offerEnvironment).valid).toBe(true);
+  const equalBindingEnvironment = engineOptionEnvironmentFromBinding(
+    offerEnvironment.queries,
+    offerEnvironment.binding,
+  );
+  expect(equalBindingEnvironment).not.toBe(offerEnvironment);
+  expect(equalBindingEnvironment.binding).toEqual(offerEnvironment.binding);
+  expect(resolveEngineActorOption(planningState, option, equalBindingEnvironment)).toMatchObject({
+    valid: false,
+    code: 'OFFER_ENVIRONMENT_MISMATCH',
+  });
+}
+
 function createEngineMcpRuntime(
   state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
   options: NonNullable<Parameters<typeof createDefaultEngineMcpRuntime>[1]> = {},
 ): ReturnType<typeof createDefaultEngineMcpRuntime> {
   const offerEnvironment = options.offerEnvironment ?? BOUND_OFFER_ENVIRONMENT;
-  const runtime = createDefaultEngineMcpRuntime(state, { ...options, offerEnvironment });
-  expect(runtime.feed.current().offerEnvironment).toEqual(offerEnvironment.binding);
+  const observed = observeOfferEnvironment(offerEnvironment);
+  const runtime = createDefaultEngineMcpRuntime(state, { ...options, offerEnvironment: observed.environment });
+  expect(observed.bindingReads()).toBeGreaterThan(0);
+  if (!offerEnvironmentIdentityChecked) {
+    expectOfferEnvironmentIdentity(state, observed.environment);
+    offerEnvironmentIdentityChecked = true;
+  }
   return runtime;
 }
 
@@ -87,6 +132,11 @@
   }
 }
 describe('engine MCP process mutation boundary', () => {
+  it('rejects an equal-binding replacement at its runtime consumer', async () => {
+    createEngineMcpRuntime(await loadArenaFixture(FIXTURE));
+    expect(offerEnvironmentIdentityChecked).toBe(true);
+  });
+
   it('never routes a malformed claimed launcher through fixture fallback', async () => {
     const state = await loadArenaFixture(FIXTURE);
     const counterexample = {
@@ -248,10 +298,9 @@
 
   it('proves transport-neutral request parity through the test-only adapter', { timeout: 20_000 }, async () => {
     const state = freshMonsterPlanningState(await loadArenaFixture(FIXTURE));
-    const runtime = createDefaultEngineMcpRuntime(state, {
+    const runtime = createEngineMcpRuntime(state, {
       offerEnvironment: TRANSITIONAL_STDIO_OFFER_ENVIRONMENT,
     });
-    expect(runtime.feed.current().offerEnvironment).toEqual(TRANSITIONAL_STDIO_OFFER_ENVIRONMENT.binding);
     const adapter = new SUBSTITUTED_LOCALAdapter(runtime.handler);
     expect(adapter.request('server/discover', {})).toHaveProperty('result');
     expect(adapter.request('tools/list', {})).toHaveProperty('result');
diff --git a/tests/unit/tools/engine-mcp-golden.test.ts b/tests/unit/tools/engine-mcp-golden.test.ts
index e546591af74c3fcdd250a3cf1d0f6aede8670d0a..107d57bde3b9cf1851bef770c340105b1e2b076c
--- a/tests/unit/tools/engine-mcp-golden.test.ts
+++ b/tests/unit/tools/engine-mcp-golden.test.ts
@@ -1,12 +1,15 @@
 import { describe, expect, it } from 'vitest';
 import { runEngineMcpDryClient } from '../../../tools/engine-mcp-dry-client';
 import type { DryTranscriptEntry } from '../../../tools/engine-mcp-dry-client';
-import { createEngineMcpRuntime, loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
+import { freshMonsterPlanningState, loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
 import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
-import { createRevisionBoundEngineOptionEnvironment } from '../../../src/vtt/offers/offer-environment';
+import {
+  createLegacyEngineOptionEnvironment,
+  engineOptionEnvironmentFromBinding,
+} from '../../../src/vtt/offers/offer-environment';
+import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
 
 const FIXTURE = 'tests/fixtures/arena-basis/seed-3943006.json';
-const BOUND_OFFER_ENVIRONMENT = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
 
 function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
   if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
@@ -40,7 +43,38 @@
   return value;
 }
 
+function expectOfferEnvironmentIdentity(
+  planningState: Parameters<typeof availableEngineActorOptions>[0],
+  actorId: Parameters<typeof availableEngineActorOptions>[1],
+  optionId?: string,
+): void {
+  const offerEnvironment = createLegacyEngineOptionEnvironment(canonicalEngineQueryPort);
+  const option = availableEngineActorOptions(planningState, actorId, offerEnvironment, 1)
+    .find((candidate) => optionId === undefined || candidate.optionId === optionId);
+  if (option === undefined) throw new Error('Golden offer-environment probe did not find its option.');
+  expect(resolveEngineActorOption(planningState, option, offerEnvironment).valid).toBe(true);
+  const equalBindingEnvironment = engineOptionEnvironmentFromBinding(
+    offerEnvironment.queries,
+    offerEnvironment.binding,
+  );
+  expect(equalBindingEnvironment).not.toBe(offerEnvironment);
+  expect(equalBindingEnvironment.binding).toEqual(offerEnvironment.binding);
+  expect(resolveEngineActorOption(planningState, option, equalBindingEnvironment)).toMatchObject({
+    valid: false,
+    code: 'OFFER_ENVIRONMENT_MISMATCH',
+  });
+}
+
 describe('real-stdio engine MCP golden dungeon run', () => {
+  it('rejects an equal-binding replacement for a stdio-shaped option', async () => {
+    const planningState = freshMonsterPlanningState(await loadArenaFixture(FIXTURE));
+    const actorId = planningState.combatants.find(
+      (candidate) => candidate.profile.kind === 'monster' && candidate.life === 'living',
+    )?.profile.id;
+    if (actorId === undefined) throw new Error('Golden identity probe has no living monster.');
+    expectOfferEnvironmentIdentity(planningState, actorId);
+  });
+
   it('covers discovery, proposal correction, adjudication, narration, and restart shapes', { timeout: 30_000 }, async () => {
     const report = await runEngineMcpDryClient(FIXTURE);
     expect(report).toMatchObject({ status: 'VERIFIED', protocolConformance: 'SUBSTITUTED_LOCAL' });
@@ -61,8 +95,20 @@
     expect(actorId).toBe('combatant:generated-3943006-monster-1');
     expect(record(queryArguments['objective'], 'query objective')['action_id']).toBe('web');
     const state = await loadArenaFixture(FIXTURE);
-    const boundRuntime = createEngineMcpRuntime(state, { offerEnvironment: BOUND_OFFER_ENVIRONMENT });
-    expect(boundRuntime.feed.current().offerEnvironment).toEqual(BOUND_OFFER_ENVIRONMENT.binding);
+    const planningState = freshMonsterPlanningState(state);
+    const submittedRequest = decoded(toolEntry(report.initial, 'engine.submit_round_proposals').request);
+    const submittedArguments = record(record(submittedRequest['params'], 'submission params')['arguments'], 'submission arguments');
+    const submittedProposals = submittedArguments['proposals'];
+    if (!Array.isArray(submittedProposals)) throw new TypeError('Golden submission omitted proposals.');
+    const submittedProposal = submittedProposals.map((value) => record(value, 'submitted proposal'))
+      .find((value) => value['actor_id'] === actorId);
+    const submittedOptionId = submittedProposal?.['primary_option_id'];
+    if (typeof submittedOptionId !== 'string') throw new TypeError('Golden submission omitted its primary option id.');
+    expectOfferEnvironmentIdentity(
+      planningState,
+      actorId as Parameters<typeof availableEngineActorOptions>[1],
+      submittedOptionId,
+    );
     const actor = state.combatants.find((candidate) => candidate.profile.id === actorId);
     const actorToken = state.tokens.find((token) => token.combatantId === actorId);
     const targets = state.combatants.filter((candidate) => candidate.profile.kind === 'player_character');
diff --git a/tests/unit/tools/engine-mcp-handler.test.ts b/tests/unit/tools/engine-mcp-handler.test.ts
index 05fa1589aaf2dcddf892a936f7eb3c16c2bc79e6..2b667f7526b9a0ab59b5e1712cb3e77e273b64ea
--- a/tests/unit/tools/engine-mcp-handler.test.ts
+++ b/tests/unit/tools/engine-mcp-handler.test.ts
@@ -25,11 +25,16 @@
 } from '../../../src/vtt/mcp/engine-server';
 import {
   createEngineMcpRuntime as createDefaultEngineMcpRuntime,
+  freshMonsterPlanningState,
   loadArenaFixture,
   type EngineMcpRuntime,
 } from '../../../src/vtt/mcp/entrypoint';
 import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
-import { createRevisionBoundEngineOptionEnvironment } from '../../../src/vtt/offers/offer-environment';
+import {
+  createRevisionBoundEngineOptionEnvironment,
+  engineOptionEnvironmentFromBinding,
+} from '../../../src/vtt/offers/offer-environment';
+import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
 import { canonicalJson } from '../../../src/commands/canonical-json';
 import {
   applyRevisionDelta,
@@ -53,14 +58,57 @@
 
 const CLIENT_INFO = Object.freeze({ name: 'vitest', version: '1.0.0' });
 const BOUND_OFFER_ENVIRONMENT = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
+let offerEnvironmentIdentityChecked = false;
+
+function observeOfferEnvironment(offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT) {
+  let bindingReads = 0;
+  return {
+    environment: new Proxy(offerEnvironment, {
+      get(target, property, receiver) {
+        if (property === 'binding') bindingReads += 1;
+        return Reflect.get(target, property, receiver) as unknown;
+      },
+    }),
+    bindingReads: () => bindingReads,
+  };
+}
 
+function expectOfferEnvironmentIdentity(
+  state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
+  offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT,
+): void {
+  const planningState = freshMonsterPlanningState(state);
+  const actorId = planningState.combatants.find(
+    (candidate) => candidate.profile.kind === 'monster' && candidate.life === 'living',
+  )?.profile.id;
+  if (actorId === undefined) throw new Error('Offer-environment probe has no living monster.');
+  const option = availableEngineActorOptions(planningState, actorId, offerEnvironment)[0];
+  if (option === undefined) throw new Error(`Offer-environment probe has no option for ${actorId}.`);
+  expect(resolveEngineActorOption(planningState, option, offerEnvironment).valid).toBe(true);
+  const equalBindingEnvironment = engineOptionEnvironmentFromBinding(
+    offerEnvironment.queries,
+    offerEnvironment.binding,
+  );
+  expect(equalBindingEnvironment).not.toBe(offerEnvironment);
+  expect(equalBindingEnvironment.binding).toEqual(offerEnvironment.binding);
+  expect(resolveEngineActorOption(planningState, option, equalBindingEnvironment)).toMatchObject({
+    valid: false,
+    code: 'OFFER_ENVIRONMENT_MISMATCH',
+  });
+}
+
 function createEngineMcpRuntime(
   state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
   options: NonNullable<Parameters<typeof createDefaultEngineMcpRuntime>[1]> = {},
 ): ReturnType<typeof createDefaultEngineMcpRuntime> {
   const offerEnvironment = options.offerEnvironment ?? BOUND_OFFER_ENVIRONMENT;
-  const runtime = createDefaultEngineMcpRuntime(state, { ...options, offerEnvironment });
-  expect(runtime.feed.current().offerEnvironment).toEqual(offerEnvironment.binding);
+  const observed = observeOfferEnvironment(offerEnvironment);
+  const runtime = createDefaultEngineMcpRuntime(state, { ...options, offerEnvironment: observed.environment });
+  expect(observed.bindingReads()).toBeGreaterThan(0);
+  if (!offerEnvironmentIdentityChecked) {
+    expectOfferEnvironmentIdentity(state, observed.environment);
+    offerEnvironmentIdentityChecked = true;
+  }
   return runtime;
 }
 const TOOL_NAMES = [
@@ -497,6 +545,11 @@
 }
 
 describe('engine MCP dual-handshake full surface conformance', () => {
+  it('rejects an equal-binding replacement at its runtime consumer', async () => {
+    await fixtureRuntime();
+    expect(offerEnvironmentIdentityChecked).toBe(true);
+  });
+
   it('derives the state-summary proof token from digest, granularity, and the creature-space v2 domain separator', () => {
     expect(engineStateSummaryProofToken('a'.repeat(64), 'turn_minimal')).toBe(
       '41fc4514eeced83505a8815571ce1bc358a8a78d1f8b8bb8ef07b5ae3379672d',
diff --git a/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts b/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts
index 06011d1526d23462e7be2a5e15bda87d37d48841..dd04a52414cacbf8243daa4ea6c743a924eaf850
--- a/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts
+++ b/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts
@@ -2,7 +2,7 @@
 import type { AddressInfo } from 'node:net';
 import { join } from 'node:path';
 import { tmpdir } from 'node:os';
-import { describe, expect, it } from 'vitest';
+import { describe, expect, it, vi } from 'vitest';
 import { encounterSessionId } from '../../../src/combat/values';
 import { ENGINE_DM_TOOL_NAMES } from '../../../src/vtt/mcp/engine-server';
 import { ENGINE_TOOL_SPECS } from '../../../src/vtt/mcp/schemas';
@@ -13,11 +13,64 @@
 import { parseArenaArgs, runArena } from '../../../tools/ai-dm-arena';
 import { DEFAULT_RENDERER_PROFILE } from '../../../src/vtt/renderer-profile';
 import { mkdtempSync, readFileSync } from '../../helpers/test-filesystem';
-import { generateRoom } from '../../../src/vtt/room-generator';
-import { createEngineMcpRuntime } from '../../../src/vtt/mcp/entrypoint';
-import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
-import { createRevisionBoundEngineOptionEnvironment } from '../../../src/vtt/offers/offer-environment';
 
+const RUNTIME_IDENTITY_OBSERVATIONS = vi.hoisted(() => ({ checks: 0, runtimeCalls: 0 }));
+
+vi.mock('../../../src/vtt/mcp/entrypoint', async (importOriginal) => {
+  type EntrypointModule = typeof import('../../../src/vtt/mcp/entrypoint');
+  const actual = await importOriginal<EntrypointModule>();
+  const offerEnvironments = await import('../../../src/vtt/offers/offer-environment');
+  const resolvers = await import('../../../src/vtt/intent-resolver');
+  return {
+    ...actual,
+    createEngineMcpRuntime(
+      state: Parameters<EntrypointModule['createEngineMcpRuntime']>[0],
+      options: NonNullable<Parameters<EntrypointModule['createEngineMcpRuntime']>[1]> = {},
+    ): ReturnType<EntrypointModule['createEngineMcpRuntime']> {
+      const offerEnvironment = options.offerEnvironment;
+      if (offerEnvironment === undefined) {
+        throw new Error('SIMULATED arena created an MCP runtime without its offer environment.');
+      }
+      let bindingReads = 0;
+      const observedOfferEnvironment = new Proxy(offerEnvironment, {
+        get(target, property, receiver) {
+          if (property === 'binding') bindingReads += 1;
+          return Reflect.get(target, property, receiver) as unknown;
+        },
+      });
+      RUNTIME_IDENTITY_OBSERVATIONS.runtimeCalls += 1;
+      if (RUNTIME_IDENTITY_OBSERVATIONS.checks === 0) {
+        const planningState = actual.freshMonsterPlanningState(state);
+        const actorId = planningState.combatants.find(
+          (candidate) => candidate.profile.kind === 'monster' && candidate.life === 'living',
+        )?.profile.id;
+        if (actorId === undefined) throw new Error('SIMULATED arena identity probe has no living monster.');
+        const option = resolvers.availableEngineActorOptions(planningState, actorId, observedOfferEnvironment)[0];
+        if (option === undefined) throw new Error(`SIMULATED arena identity probe has no option for ${actorId}.`);
+        expect(resolvers.resolveEngineActorOption(planningState, option, observedOfferEnvironment).valid).toBe(true);
+        const equalBindingEnvironment = offerEnvironments.engineOptionEnvironmentFromBinding(
+          observedOfferEnvironment.queries,
+          observedOfferEnvironment.binding,
+        );
+        expect(equalBindingEnvironment).not.toBe(observedOfferEnvironment);
+        expect(equalBindingEnvironment.binding).toEqual(observedOfferEnvironment.binding);
+        expect(resolvers.resolveEngineActorOption(planningState, option, equalBindingEnvironment)).toMatchObject({
+          valid: false,
+          code: 'OFFER_ENVIRONMENT_MISMATCH',
+        });
+        RUNTIME_IDENTITY_OBSERVATIONS.checks += 1;
+      }
+      bindingReads = 0;
+      const runtime = actual.createEngineMcpRuntime(state, {
+        ...options,
+        offerEnvironment: observedOfferEnvironment,
+      });
+      expect(bindingReads).toBeGreaterThan(0);
+      return runtime;
+    },
+  } satisfies EntrypointModule;
+});
+
 interface FakeRequest {
   readonly path: string;
   readonly headers: IncomingHttpHeaders;
@@ -49,7 +102,6 @@
   misc: 'merged',
   optionDetail: 'top2_stubs',
 } as const;
-const BOUND_OFFER_ENVIRONMENT = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
 
 async function fakeServer(
   respond: (request: FakeRequest, index: number) => { readonly status?: number; readonly body: unknown },
@@ -109,13 +161,6 @@
 }
 
 describe('SIMULATED local OpenAI conversation adapter', () => {
-  it('binds the SIMULATED arena runtime to its explicit offer environment', () => {
-    const state = generateRoom(3_943_001).encounter.state;
-    const runtime = createEngineMcpRuntime(state, { offerEnvironment: BOUND_OFFER_ENVIRONMENT });
-
-    expect(runtime.feed.current().offerEnvironment).toEqual(BOUND_OFFER_ENVIRONMENT.binding);
-  });
-
   it('terminates the tool loop immediately after an accepted plan adjustment', async () => {
     const endpoint = await fakeServer(() => ({
       body: assistantToolCall('call-adjustment', 'engine__submit_plan_adjustment', {
@@ -162,6 +207,7 @@
   });
 
   it('drives a full authorized round through context, frontier expansion, and submission', { timeout: 30_000 }, async () => {
+    const runtimeCallsBeforeRun = RUNTIME_IDENTITY_OBSERVATIONS.runtimeCalls;
     let contextForSubmission: Readonly<Record<string, unknown>> | null = null;
     const endpoint = await fakeServer((request, index) => {
       const requestMessages = messages(request.body['messages']);
@@ -222,6 +268,7 @@
       ]);
       const rows = await runArena(config);
 
+      expect(RUNTIME_IDENTITY_OBSERVATIONS.runtimeCalls).toBeGreaterThan(runtimeCallsBeforeRun);
       expect(rows).toEqual([expect.objectContaining({
         cli: 'local-openai', model: 'quantized-SIMULATED', thinkMode: 'on', outcome: 'authorized',
         toolCalls: 3, callsPerRound: 1, flapRetries: 0, serviceNull: false,
@@ -252,6 +299,7 @@
   });
 
   it('classifies a refusing local server as local_error without service-null retries', { timeout: 30_000 }, async () => {
+    const runtimeCallsBeforeRun = RUNTIME_IDENTITY_OBSERVATIONS.runtimeCalls;
     const endpoint = await fakeServer(() => ({ status: 503, body: { error: 'model unavailable' } }));
     const directory = mkdtempSync(join(tmpdir(), 'dnd-local-openai-error-'));
     try {
@@ -262,6 +310,7 @@
         '--local-model', 'quantized-SIMULATED', '--timeout-ms', '1000',
       ]));
 
+      expect(RUNTIME_IDENTITY_OBSERVATIONS.runtimeCalls).toBeGreaterThan(runtimeCallsBeforeRun);
       expect(endpoint.requests).toHaveLength(1);
       expect(endpoint.requests[0]?.body['reasoning_effort']).toBe('none');
       expect(rows).toEqual([expect.objectContaining({

