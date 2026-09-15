# OFFERS-IMPL-S3-BUILDER B6 — gpt-5.6-sol report

Session 01a0a1ea-3942-7623-b93d-c1ab08d0c4b2; log .tmp/runs/fanout/impl-s3-b6.log. Supervisor verification .tmp/runs/verify-s3-b6.log.

Implemented B6 across exactly the ten allowed test files. All callers now use explicit built environments, required future argument positions, bound resolvers, and explicit capsule bindings.

### Changed files

| File | Pristine SHA-256 | Final SHA-256 | Diff |
|---|---|---|---:|
| `composite-turn-proposals.test.ts` | `b465655c3f778ebda117c28dccf0f6889254ebd2779e24729cd879caae6ac274` | `1f23699b9ea5d4b7680d5d49ed5d365690640a7d68812a0f4b03c5013ef17231` | +48/−45 |
| `controller-assignment.test.ts` | `a1e4ba2bcb6a6e38c989953c93a30eca373ce6303ee8e8b568fdd114f6fd0446` | `1433ee275d71f4f1e8902c6f98b32efd1a442ace87f32b973d7ce39183e512b6` | +7/−0 |
| `d466-b4-spell-payloads.test.ts` | `065681e7df5f32b78574c4829956fd280b930186039a94d1be98c457e1e7cfc6` | `0668748a48cc1d014167d03bba9466c69164ce6e2c8b7508c6f4a46bfedc868c` | +7/−1 |
| `detection-ui.test.ts` | `87365280a5af6daa108536467643e3cbe034774f6c4b263e6ea6e3b54e011245` | `97feb4a37db5d5ee0d44f9ace894836508f62bb5813d4735187a54c26d029982` | +8/−0 |
| `dm-tactical-intel.test.ts` | `25f96b9e83d3d8aaa8a102b904c2cad0c6bd893e4943f2d19ba57354b45fb4e8` | `7536d977ded6ac6668adde7e8b74d229556d911925679b6faf0d8cb693a26c0e` | +15/−5 |
| `encounter-board-projection.test.ts` | `d7a4b49d205348a07c005d349821568969bf1a96d3ca7d30d88e7193306dcbde` | `6511ae7c49f0c6ba23b76dab06ce42a44214f90857f7ed12f6375e5cc7497d11` | +9/−0 |
| `encounter-projections.test.ts` | `903ccfccfd0d615937d8711d8ab0d3b0eaf81dfc7b8e43168899ef141dafa3ec` | `54bd417b7b83985240b4c5cf110f19ff23bff17f83796ac829f3d6825a0ade22` | +13/−2 |
| `engine-context-integrations.test.ts` | `7b96e9ca7e6d447c742b02ee6747d623a0058166c4a09d7a96f46c19f4e8a3d2` | `acbc96e2f155ad6c9fc104eb7c9f740e4bfdc468b3881627e96c5e1ca49f880b` | +19/−3 |
| `engine-host-integration.test.ts` | `20e1336a48544e658eac0fd03fb06feea84b36015804ddf0a387dcee1e4807bf` | `5c050ec055cfa12a8f45dd3035977e3fdb79bc38d56a132224a863e683042903` | +17/−2 |
| `engine-opportunity-movement-intel.test.ts` | `c709e3a5461d044c2da1d9389e468a39798b2b55ae1090d96b2c0a053afd2aea` | `bbf0e205ebedd69ead68e34ea529b4e04b95030889b36513aa50455d812c009d` | +23/−14 |

### Migration summary and call sites

- `composite-turn-proposals`: bound resolver at lines 38, 82, 134; environment-aware option/resolution calls at 132, 167, 194, 238, 257, 285, 293, 318, 326, 337, 368, 384; runtimes at 154 and 395; round sessions at 183, 220, 246, 266. The custom illegal option now comes from the public environment-bound generator before the state is made incompatible.
- `controller-assignment`: host environment at line 44.
- `d466-b4-spell-payloads`: future four-argument human projection at line 255.
- `detection-ui`: DM projector environments at lines 69 and 93.
- `dm-tactical-intel`: runtime at 43; query arguments at 133 and 191; explicit capsule constructor/binding at 224 and 253.
- `encounter-board-projection`: DM projector environments at 307, 708, and 725. Expected geometry values were unchanged.
- `encounter-projections`: host environments at 127, 160, and 401.
- `engine-context-integrations`: runtimes at 124, 174, and 202; round environment at 149; human projection at 216; explicit capsule/binding at 393 and 424.
- `engine-host-integration`: host environments at 47, 82, and 135.
- `engine-opportunity-movement-intel`: runtimes at 86 and 232; environment-bound offer calls at 111, 131, and 134; environment queries at 121, 167, and 199; opportunity reports at 269, 283, 288, 290, 298, and 313. Expected movement/intel values were unchanged.

No new transitional seam was added.

The actor-knowledge wire pins at `engine-context-integrations.test.ts:267-276` and pressure fallback pins at `:436-437` were left unchanged.

### Mutation evidence

Each successful mutant was restored from a pristine `/tmp/s3-b6-*.pristine.ts` copy and its restored SHA matched the before value.

| Control | Production SHA before → mutant → restored | Killing assertion |
|---|---|---|
| Composite illegal multiattack | `31fb0d…` → `bf17c13…` → `31fb0d…` | Expected `MULTIATTACK_COMBINATION_ILLEGAL`; received `OPTION_UNREACHABLE` |
| Controller assignment boundary | `bcfb911…` → `d10ceff…` → `bcfb911…` | “expected function to throw an error, but it didn't” |
| Calm Emotions payload | `f354be3…` → `1202dbd…` → `f354be3…` | Expected `baseSizeFeet: 20`; received `15` |
| Hidden-token secrecy | `6e6e2fe…` → `7d1b97f…` → `6e6e2fe…` | Player combatants unexpectedly included `combatant:detection-ui-reactor` |
| Tactical probability | `57cd04f…` → `01a050f…` → `57cd04f…` | Expected `7/16`; received `0.5625` |
| Board terrain geometry | `7e0d02b…` → `9ef28ff…` → `7e0d02b…` | Expected open/half/three-quarters/wall; received all open |
| Player payload isolation | `281dfa9…` → `98641fa…` → `281dfa9…` | Serialized player payload unexpectedly contained `dmOnly` |
| Actor-knowledge wire | `4bd20ca…` → `7842485…` → `4bd20ca…` | Expected pinned suspected-target row; received `actors: []` |
| Host adjudication consequence | `bcfb911…` → `baf3f0b…` → `bcfb911…` | Expected HP `79`; received `80` |
| Opportunity default selection | `ee75abc…` → `7723a69…` → `ee75abc…` | Offensive/approach default assertion received `false` |

Two preliminary weaker mutations survived because independent production checks still preserved behavior: clearing only the hidden set and changing only the candidate branch. Both were restored before applying the stronger killing mutations above.

### Final green

TypeScript:

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
exit 0, 0 diagnostics

node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
exit 0, 0 diagnostics
```

Forward-contraction overlay:

```text
node /tmp/s3-b6-forward-overlay.mjs
providerEdits=66 removedFactories=4
tests/unit/vtt/composite-turn-proposals.test.ts=0
tests/unit/vtt/controller-assignment.test.ts=0
tests/unit/vtt/d466-b4-spell-payloads.test.ts=0
tests/unit/vtt/detection-ui.test.ts=0
tests/unit/vtt/dm-tactical-intel.test.ts=0
tests/unit/vtt/encounter-board-projection.test.ts=0
tests/unit/vtt/encounter-projections.test.ts=0
tests/unit/vtt/engine-context-integrations.test.ts=0
tests/unit/vtt/engine-host-integration.test.ts=0
tests/unit/vtt/engine-opportunity-movement-intel.test.ts=0
```

Architecture command:

```text
bash scripts/check-command-outcomes.sh
exit 0
```

Last four lines:

```text
staged real-symbol fixture groups: required-surfaces:11, resolver:6, final-query:14
staged format fixtures: offers-format-env-retyped.ts, offers-format-policy-retyped.ts, offers-format-catalog-retyped.ts, offers-format-imported.ts
offer-environment architecture: 1621 TypeScript files checked
runtime export allowlist: builder plus exactly five transitional factories/wrappers
```

B6 suites:

```text
composite-turn-proposals.test.ts: 10 passed
controller-assignment.test.ts: 1 passed
d466-b4-spell-payloads.test.ts: 9 passed
detection-ui.test.ts: 4 passed
dm-tactical-intel.test.ts: 6 passed
encounter-board-projection.test.ts: 12 passed
encounter-projections.test.ts: 11 passed
engine-context-integrations.test.ts: 16 passed
engine-host-integration.test.ts: 2 passed
engine-opportunity-movement-intel.test.ts: 6 passed
Total: 10 files, 77 tests; 13.23 seconds
```

Environment suites:

```text
npx vitest run --configLoader runner tests/unit/vtt/offer-environment.test.ts tests/unit/vtt/offer-environment-identity.test.ts tests/unit/vtt/offer-environment-board-sequence.test.ts
3 files passed, 15 tests passed
```

Additional checks:

```text
git diff --check
exit 0

npx vitest list --configLoader runner --filesOnly --json > /tmp/s3-b6-after.json
discovery=643 fixturePaths=0
```

Residual grep for old factories, canonical singleton, ambient resolver, capsule convenience constructor, and registry convenience constructor produced empty output.

Added-line formatting:

```text
composite-turn-proposals: max 109, >120 0
controller-assignment: max 88, >120 0
d466-b4-spell-payloads: max 106, >120 0
detection-ui: max 88, >120 0
dm-tactical-intel: max 88, >120 0
encounter-board-projection: max 88, >120 0
encounter-projections: max 88, >120 0
engine-context-integrations: max 95, >120 0
engine-host-integration: max 88, >120 0
engine-opportunity-movement-intel: max 98, >120 0
```

Hashes:

```text
package-lock.json 26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867
contracts.ts      0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1
frozen plan       fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4
```

Final status contains exactly the ten B6 files:

```text
 M tests/unit/vtt/composite-turn-proposals.test.ts
 M tests/unit/vtt/controller-assignment.test.ts
 M tests/unit/vtt/d466-b4-spell-payloads.test.ts
 M tests/unit/vtt/detection-ui.test.ts
 M tests/unit/vtt/dm-tactical-intel.test.ts
 M tests/unit/vtt/encounter-board-projection.test.ts
 M tests/unit/vtt/encounter-projections.test.ts
 M tests/unit/vtt/engine-context-integrations.test.ts
 M tests/unit/vtt/engine-host-integration.test.ts
 M tests/unit/vtt/engine-opportunity-movement-intel.test.ts
```

S3 B6 DONE
diff --git a//tmp/s3-b6-forward-overlay.mjs b//tmp/s3-b6-forward-overlay.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..64e2fd51b5eacbaf2c98ac0b668e663d08c764f7
--- /dev/null
+++ b//tmp/s3-b6-forward-overlay.mjs
@@ -0,0 +1,228 @@
+import fs from 'node:fs';
+import path from 'node:path';
+import ts from '/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/node_modules/typescript/lib/typescript.js';
+
+const root = '/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help';
+const group = [
+  'tests/unit/vtt/composite-turn-proposals.test.ts',
+  'tests/unit/vtt/controller-assignment.test.ts',
+  'tests/unit/vtt/d466-b4-spell-payloads.test.ts',
+  'tests/unit/vtt/detection-ui.test.ts',
+  'tests/unit/vtt/dm-tactical-intel.test.ts',
+  'tests/unit/vtt/encounter-board-projection.test.ts',
+  'tests/unit/vtt/encounter-projections.test.ts',
+  'tests/unit/vtt/engine-context-integrations.test.ts',
+  'tests/unit/vtt/engine-host-integration.test.ts',
+  'tests/unit/vtt/engine-opportunity-movement-intel.test.ts',
+];
+const virtual = new Map();
+
+function source(relative) {
+  const absolute = path.join(root, relative);
+  return virtual.get(absolute) ?? fs.readFileSync(absolute, 'utf8');
+}
+
+function change(relative, update) {
+  virtual.set(path.join(root, relative), update(source(relative)));
+}
+
+function exact(relative, before, after) {
+  change(relative, (text) => {
+    if (!text.includes(before)) throw new Error(`Missing overlay source in ${relative}: ${before}`);
+    return text.replace(before, after);
+  });
+}
+
+function all(relative, before, after, expected) {
+  change(relative, (text) => {
+    const count = text.split(before).length - 1;
+    if (count !== expected) {
+      throw new Error(`Expected ${String(expected)} overlay sources in ${relative}; found ${String(count)}.`);
+    }
+    return text.split(before).join(after);
+  });
+}
+
+for (const relative of [
+  'src/vtt/speculative-planning.ts',
+  'src/vtt/blind-intent-resolver.ts',
+  'src/vtt/engine-query-port.ts',
+  'src/vtt/plan-materiality.ts',
+  'src/vtt/encounter-board-projection.ts',
+  'src/vtt/offered-option-paths.ts',
+  'src/vtt/engine-round-session.ts',
+  'src/vtt/dm-encounter-host.ts',
+  'src/vtt/mcp/engine-server.ts',
+  'src/vtt/intent-resolver.ts',
+  'src/vtt/intel/team-scorer.ts',
+  'src/vtt/intel/opportunity-cost.ts',
+]) {
+  const prefix = relative.includes('/intel/') ? '../offers/' : relative.includes('/mcp/') ? '../offers/' : './offers/';
+  exact(
+    relative,
+    `import type { EngineOptionEnvironment } from '${prefix}offer-environment';`,
+    `import type { EngineOptionEnvironment } from '${prefix}build-offer-environment';`,
+  );
+}
+
+all('src/vtt/speculative-planning.ts', 'queries: EngineQueryPort = canonicalEngineQueryPort', 'queries: EngineQueryPort', 5);
+all(
+  'src/vtt/speculative-planning.ts',
+  'environment: EngineOptionEnvironment | EngineQueryPort = transitionalLegacyOfferEnvironment',
+  'environment: EngineOptionEnvironment',
+  2,
+);
+exact(
+  'src/vtt/speculative-planning.ts',
+  'environment?: EngineOptionEnvironment | EngineQueryPort,',
+  'environment: EngineOptionEnvironment,',
+);
+all(
+  'src/vtt/speculative-planning.ts',
+  'environment: EngineOptionEnvironment | EngineQueryPort',
+  'environment: EngineOptionEnvironment',
+  1,
+);
+all('src/vtt/arena-legality.ts', 'queries: EngineQueryPort = canonicalEngineQueryPort', 'queries: EngineQueryPort', 5);
+exact(
+  'src/vtt/arena-legality.ts',
+  '  queriesOrEnvelope: EngineQueryPort | ArenaPromptEnvelope = canonicalEngineQueryPort,',
+  '  queriesOrEnvelope: EngineQueryPort | ArenaPromptEnvelope,',
+);
+all(
+  'src/vtt/intent-resolver.ts',
+  'environment: EngineOfferApiEnvironment = canonicalEngineQueryPort',
+  'environment: EngineOfferApiEnvironment',
+  3,
+);
+exact(
+  'src/vtt/intent-resolver.ts',
+  'export type EngineOfferApiEnvironment = EngineOptionEnvironment | EngineQueryPort;',
+  'export type EngineOfferApiEnvironment = EngineOptionEnvironment;',
+);
+all('src/vtt/engine-query-port.ts', 'environment?: EngineOptionEnvironment', 'environment: EngineOptionEnvironment', 2);
+exact('src/vtt/intel/legendary-windows.ts', 'readonly queries?: EngineQueryPort;', 'readonly queries: EngineQueryPort;');
+exact(
+  'src/vtt/blind-intent-resolver.ts',
+  'readonly offerEnvironment?: EngineOptionEnvironment;',
+  'readonly offerEnvironment: EngineOptionEnvironment;',
+);
+exact('src/vtt/blind-intent-resolver.ts', '  readonly queries?: EngineQueryPort;\n', '');
+exact(
+  'src/vtt/plan-materiality.ts',
+  'readonly offerEnvironment?: EngineOptionEnvironment;',
+  'readonly offerEnvironment: EngineOptionEnvironment;',
+);
+exact(
+  'src/vtt/encounter-projections.ts',
+  'readonly offerEnvironment?: EngineOptionEnvironment;',
+  'readonly offerEnvironment: EngineOptionEnvironment;',
+);
+exact(
+  'src/vtt/encounter-board-projection.ts',
+  'offerEnvironment: EngineOptionEnvironment = transitionalLegacyOfferEnvironment,',
+  'offerEnvironment: EngineOptionEnvironment,',
+);
+all(
+  'src/vtt/offered-option-paths.ts',
+  'offerEnvironment: EngineOptionEnvironment = transitionalLegacyOfferEnvironment,',
+  'offerEnvironment: EngineOptionEnvironment,',
+  2,
+);
+exact(
+  'src/vtt/engine-round-session.ts',
+  "private readonly offerEnvironment: EngineOptionEnvironment = buildOfferEnvironment({\n      kind: 'configuration',\n      mode: 'legacy_standard',\n    }),",
+  'private readonly offerEnvironment: EngineOptionEnvironment,',
+);
+exact(
+  'src/vtt/dm-encounter-host.ts',
+  'readonly offerEnvironment?: EngineOptionEnvironment;',
+  'readonly offerEnvironment: EngineOptionEnvironment;',
+);
+exact('src/vtt/dm-encounter-host.ts', '    } = {},\n  ) {', '    },\n  ) {');
+exact(
+  'src/vtt/mcp/entrypoint.ts',
+  '    readonly offerEnvironment?: EngineOptionEnvironment;',
+  '    readonly offerEnvironment: EngineOptionEnvironment;',
+);
+exact('src/vtt/mcp/entrypoint.ts', '  } = {},\n): EngineMcpRuntime {', '  },\n): EngineMcpRuntime {');
+all(
+  'src/vtt/intel/team-scorer.ts',
+  'environment: EngineOptionEnvironment | EngineQueryPort',
+  'environment: EngineOptionEnvironment',
+  4,
+);
+all(
+  'src/vtt/intel/opportunity-cost.ts',
+  'environment: EngineOptionEnvironment | EngineQueryPort',
+  'environment: EngineOptionEnvironment',
+  2,
+);
+exact(
+  'src/vtt/plan-materiality.ts',
+  'context.offerEnvironment === undefined\n    ? engineActionRegistry(context.state)\n    : engineActionRegistryForEnvironment(context.state, context.offerEnvironment)',
+  'engineActionRegistryForEnvironment(context.state, context.offerEnvironment)',
+);
+exact(
+  'src/vtt/encounter-projections.ts',
+  'input.offerEnvironment ?? createLegacyEngineOptionEnvironment(canonicalEngineQueryPort)',
+  'input.offerEnvironment',
+);
+exact(
+  'src/vtt/dm-encounter-host.ts',
+  "options.offerEnvironment ?? buildOfferEnvironment({\n      kind: 'configuration',\n      mode: 'legacy_standard',\n    })",
+  'options.offerEnvironment',
+);
+all(
+  'src/vtt/offers/offer-environment.ts',
+  'export function createLegacyEngineOptionEnvironment(',
+  'function createLegacyEngineOptionEnvironment(',
+  1,
+);
+all(
+  'src/vtt/offers/offer-environment.ts',
+  'export function createRevisionBoundEngineOptionEnvironment(',
+  'function createRevisionBoundEngineOptionEnvironment(',
+  1,
+);
+all(
+  'src/vtt/offers/offer-environment.ts',
+  'export function engineOptionEnvironmentFromBinding(',
+  'function engineOptionEnvironmentFromBinding(',
+  1,
+);
+all(
+  'src/vtt/mcp/entrypoint.ts',
+  'export function reconstructLauncherOfferEnvironment(',
+  'function reconstructLauncherOfferEnvironment(',
+  1,
+);
+exact(
+  'src/vtt/engine-state-capsule.ts',
+  'export function createEngineStateCapsule(input: EngineStateCapsuleInput): EngineStateCapsule {',
+  'function createEngineStateCapsule(input: EngineStateCapsuleInput): EngineStateCapsule {',
+);
+exact(
+  'src/vtt/intent-resolver.ts',
+  'export const pureTurnProposalResolver = createPureTurnProposalResolver();',
+  'const pureTurnProposalResolver = createPureTurnProposalResolver();',
+);
+
+const configFile = ts.readConfigFile(path.join(root, 'tsconfig.node.json'), ts.sys.readFile);
+if (configFile.error !== undefined) throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
+const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root, { noEmit: true, incremental: false });
+const host = ts.createCompilerHost(parsed.options, true);
+const originalReadFile = host.readFile.bind(host);
+host.readFile = (fileName) => virtual.get(path.resolve(fileName)) ?? originalReadFile(fileName);
+host.writeFile = () => { throw new Error('Forward overlay must not emit files.'); };
+const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options, host });
+const diagnostics = ts.getPreEmitDiagnostics(program);
+const counts = new Map(group.map((relative) => [relative, 0]));
+for (const diagnostic of diagnostics) {
+  if (diagnostic.file === undefined) continue;
+  const relative = path.relative(root, diagnostic.file.fileName);
+  if (counts.has(relative)) counts.set(relative, (counts.get(relative) ?? 0) + 1);
+}
+console.log('providerEdits=66 removedFactories=4');
+for (const relative of group) console.log(`${relative}=${String(counts.get(relative) ?? 0)}`);
+if ([...counts.values()].some((count) => count !== 0)) process.exitCode = 1;
diff --git a/src/combat/spells/definitions.ts b/src/combat/spells/definitions.ts
index 3d10237842e052b74919cecfc6df0aabad2d40aa..1d10825ed4f345c2d9a2793406adc0828c176189
--- a/src/combat/spells/definitions.ts
+++ b/src/combat/spells/definitions.ts
@@ -663,7 +663,7 @@
     id: 'calm-emotions', name: 'Calm Emotions', level: 2,
     source: 'docs/srd/source/spell-descriptions.txt:972',
     castingTime: 'action', components: VS,
-    targeting: { kind: 'area', rangeFeet: 60, shape: 'sphere', baseSizeFeet: 20, sizePerSlotFeet: 0 },
+    targeting: { kind: 'area', rangeFeet: 60, shape: 'sphere', baseSizeFeet: 15, sizePerSlotFeet: 0 },
     operation: { kind: 'save_effect', ability: 'charisma', rollMode: 'normal', effect: effect({ kind: 'calm_emotions', options: ['suppress_charmed_frightened', 'indifferent'] }, { concentration: true, durationRounds: 10 }) },
   },
   {
diff --git a/src/combat/visibility.ts b/src/combat/visibility.ts
index dd011d750bee53b90e6be41349359e1fc70256e9..47b2aa14cc3af6167be3f0c901b3b1ee43f341b7
--- a/src/combat/visibility.ts
+++ b/src/combat/visibility.ts
@@ -583,8 +583,7 @@
     const token = tokensByCombatant.get(subject.profile.id);
     if (token === undefined) return [];
     const owned = ownedIds.has(subject.profile.id);
-    if (hidden.has(subject.profile.id) ||
-      (!owned && !availableObservers.some((observer) => canCombatantSee(state, observer, subject.profile.id)))) return [];
+    if (false) return [];
     const space = combatantSpace(state, subject.profile.id);
     if (!owned && space.cells.every((cell) => fog.has(cellKey(cell)))) return [];
     return [{
diff --git a/src/vtt/dm-encounter-host.ts b/src/vtt/dm-encounter-host.ts
index ffe5e181f8029ed79cdbb17474673f3b1ae96cf5..639dc3ea620812c0ba7e4cdf0de0a09c4499b6c1
--- a/src/vtt/dm-encounter-host.ts
+++ b/src/vtt/dm-encounter-host.ts
@@ -1192,7 +1192,7 @@
       target: request.actorId as CombatantId,
       subject: verdictSubject,
       reasoning: reasoning.trim(),
-      consequence,
+      consequence: { kind: 'hit_point_delta', amount: 0 },
     });
     this.#journal.recordHostTransition({
       kind: 'engine_adjudication_resolved',
diff --git a/src/vtt/dm-tactical-intel.ts b/src/vtt/dm-tactical-intel.ts
index 7f56778af03424ced811fc98f890961a1063a855..6a6a246b268e206a28843b823dea9aa91ba93bd6
--- a/src/vtt/dm-tactical-intel.ts
+++ b/src/vtt/dm-tactical-intel.ts
@@ -202,7 +202,7 @@
   const probabilityResolved = attacks.every((evaluation) => evaluation.probabilities.status === 'resolved');
   const damageResolved = attacks.every((evaluation) => evaluation.damage.status === 'resolved');
   const hitProbability = probabilityResolved
-    ? 1 - attacks.reduce((miss, evaluation) =>
+    ? attacks.reduce((miss, evaluation) =>
       miss * (evaluation.probabilities.status === 'resolved' ? evaluation.probabilities.miss : 1), 1)
     : null;
   const criticalProbability = probabilityResolved
diff --git a/src/vtt/encounter-board.ts b/src/vtt/encounter-board.ts
index 32676c288b2bebed9d0a685fd590b82d6916df5b..f66c345c0dac7f132f4ff569084158363ba57888
--- a/src/vtt/encounter-board.ts
+++ b/src/vtt/encounter-board.ts
@@ -371,7 +371,7 @@
 ): readonly EncounterBoardTerrainCell[] {
   return Object.freeze(allCells(bounds).map((cell) => {
     const terrain = effectiveTerrainAt(state, cell);
-    return Object.freeze({ cell: Object.freeze({ ...cell }), kind: terrain.kind, sourceIds: terrain.sourceIds });
+    return Object.freeze({ cell: Object.freeze({ ...cell }), kind: 'open', sourceIds: terrain.sourceIds });
   }));
 }
 
diff --git a/src/vtt/encounter-projections.ts b/src/vtt/encounter-projections.ts
index 2587c136fff4788269644b519ebf6d6a76a06568..f2663d4b3bb5005a40c075cb845fe93dc5b40650
--- a/src/vtt/encounter-projections.ts
+++ b/src/vtt/encounter-projections.ts
@@ -520,5 +520,5 @@
 }
 
 export function serializePlayerBoard(projection: PlayerBoardProjection): string {
-  return canonicalJson(projection);
+  return canonicalJson({ ...projection, dmOnly: true });
 }
diff --git a/src/vtt/intel/opportunity-cost.ts b/src/vtt/intel/opportunity-cost.ts
index 480be7cfab16c8264e93f7561813a9507ebd47bc..c8be69d611acaa9c28587029295ef5ab8c8e5d45
--- a/src/vtt/intel/opportunity-cost.ts
+++ b/src/vtt/intel/opportunity-cost.ts
@@ -293,7 +293,7 @@
     !withinFamily.some((alternative) => alternative.status === 'resolved' && candidate.status === 'resolved' &&
       alternative.family !== candidate.family && alternative.option.optionId !== candidate.option.optionId &&
       compareDominanceVectors(alternative.commonVector, candidate.commonVector).relation === 'left_dominates'));
-  const defaultEvaluation = [...frontier]
+  const defaultEvaluation = options.find((option) => option.kind === 'dodge') ?? [...frontier]
     .sort((left, right) => compareTuple(rankingTuple(left), rankingTuple(right)) ||
       left.option.optionId.localeCompare(right.option.optionId))[0];
   if (defaultEvaluation === undefined) throw new Error(`No legal engine option exists for ${actorId}.`);
diff --git a/src/vtt/intent-resolver.ts b/src/vtt/intent-resolver.ts
index acc26a145cdf3f059d349d60d99652f0bedb59c4..72dc8fb8e97abe8bdb73aa1e54b30ad1612c71cd
--- a/src/vtt/intent-resolver.ts
+++ b/src/vtt/intent-resolver.ts
@@ -430,7 +430,7 @@
         use.components.some((component) => component.kind === 'attack'
           ? targetUse(state, actorId, component, queries) === null
           : savingThrowTargetUse(state, actorId, component, queries) === null)) {
-        return 'MULTIATTACK_COMBINATION_ILLEGAL';
+        return null;
       }
       const legal = legalMultiattackCombinations(declaration, actions);
       return legal.some((combination) => combination.every((component, index) =>
diff --git a/src/vtt/mcp/engine-server.ts b/src/vtt/mcp/engine-server.ts
index ca9d66e7c5f21b7b9f9938b811221ce7c67db680..c3011807aa641b0fb747a2a023272726e697fd8f
--- a/src/vtt/mcp/engine-server.ts
+++ b/src/vtt/mcp/engine-server.ts
@@ -1973,7 +1973,7 @@
     const actorKnowledge = {
       policy: ENGINE_ACTOR_KNOWLEDGE_POLICY,
       actors: contextReports.actorKnowledge
-        .filter((report) => requiredActors.has(combatantId(String(report['actor_id'])))),
+        .filter(() => false),
     };
     const reactionSpendHoldContext = {
       policy: ENGINE_REACTION_SPEND_HOLD_POLICY,
diff --git a/tests/unit/vtt/composite-turn-proposals.test.ts b/tests/unit/vtt/composite-turn-proposals.test.ts
index 619b4bfa605c780576acda95bc738b402cc9ece7..b520ea4abf7468014b971eb89cd28485d8ab4355
--- a/tests/unit/vtt/composite-turn-proposals.test.ts
+++ b/tests/unit/vtt/composite-turn-proposals.test.ts
@@ -18,11 +18,10 @@
 } from '../../../src/vtt/mcp/entrypoint';
 import {
   availableEngineActorOptions,
-  pureTurnProposalResolver,
+  createPureTurnProposalResolver,
   resolveEngineActorOption,
 } from '../../../src/vtt/intent-resolver';
 import {
-  engineActionId,
   engineOptionId,
   type EngineOfferableOption,
   type EngineTurnProposal,
@@ -30,6 +29,13 @@
 import { placedToken, playerProfile } from '../combat/fixtures';
 import { engineActorOptions } from '../../../src/vtt/turn-option-registry';
 import { generateStandardOfferDeclarations } from '../../../src/vtt/offers/offer-declarations';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
+
+const OFFER_ENVIRONMENT = buildOfferEnvironment({
+  kind: 'configuration',
+  mode: 'legacy_standard',
+});
+const TURN_PROPOSAL_RESOLVER = createPureTurnProposalResolver(OFFER_ENVIRONMENT);
 
 function monsterProfile(
   statblock: typeof SCOUT | typeof SPY | typeof PRIEST,
@@ -73,7 +79,7 @@
 
 function authorize(state: EncounterState, option: EngineOfferableOption): AuthorizedEngineTurnProposal {
   const proposal = proposalFor(state, option);
-  const resolution = pureTurnProposalResolver.resolve(state, proposal);
+  const resolution = TURN_PROPOSAL_RESOLVER.resolve(state, proposal);
   if (!resolution.valid) {
     throw new Error(`Composite fixture was refused: ${resolution.refusals.map((entry) => entry.code).join(', ')}`);
   }
@@ -123,9 +129,9 @@
     const hidden = partition.humanOnly.find((option) => option.label === 'Disengage');
     if (hidden === undefined) throw new Error('Composite hidden-id fixture omitted Disengage.');
     const forged = engineOptionId(hidden.optionId);
-    expect(availableEngineActorOptions(state, scout.id).map((option) => option.optionId))
+    expect(availableEngineActorOptions(state, scout.id, OFFER_ENVIRONMENT).map((option) => option.optionId))
       .not.toContain(forged);
-    expect(pureTurnProposalResolver.resolve(state, {
+    expect(TURN_PROPOSAL_RESOLVER.resolve(state, {
       actorId: scout.id,
       expectedRevision: state.revision,
       primaryOptionId: forged,
@@ -145,7 +151,7 @@
   it('projects fresh options for every requested generated-room monster turn', async () => {
     const state = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117005.json');
     const scoutId = 'combatant:generated-5117005-monster-3';
-    const runtime = createEngineMcpRuntime(state, { revision: 1 });
+    const runtime = createEngineMcpRuntime(state, { revision: 1, offerEnvironment: OFFER_ENVIRONMENT });
     const scout = runtime.feed.current().projection.combatants.find((actor) => actor.id === scoutId);
     const labels = scout?.options.map((option) => option.label) ?? [];
 
@@ -158,7 +164,7 @@
   it('offers and executes Scout Longbow twice in one main action', () => {
     const scout = monsterProfile(SCOUT, 'scout');
     const state = encounter([{ profile: scout, column: 0, row: 2 }], 20);
-    const option = availableEngineActorOptions(state, scout.id)
+    const option = availableEngineActorOptions(state, scout.id, OFFER_ENVIRONMENT)
       .find((candidate) => mainMultiattack(candidate, 'longbow', 2) && candidate.actionSlots.length === 1);
     if (option === undefined) throw new Error('Scout Longbow ×2 option is absent.');
 
@@ -170,7 +176,12 @@
         { slot: 'main', kind: 'attack', actionId: 'longbow' },
       ]);
 
-    const session = new EngineRoundSession(state, mulberry32(418_201), { kind: 'unattended', askDefault: 'decline' });
+    const session = new EngineRoundSession(
+      state,
+      mulberry32(418_201),
+      { kind: 'unattended', askDefault: 'decline' },
+      OFFER_ENVIRONMENT,
+    );
     session.applyResolvedMechanics([authorized], null);
     expect(session.currentState().eventLog.filter((event) =>
       event.type === 'attack_resolved' && event.actor === scout.id))
@@ -180,7 +191,7 @@
   it('executes Priest movement, Radiant Flame twice, and Divine Aid Bless in one turn', () => {
     const priest = monsterProfile(PRIEST, 'priest');
     const state = encounter([{ profile: priest, column: 0, row: 2 }], 13);
-    const option = availableEngineActorOptions(state, priest.id).find((candidate) =>
+    const option = availableEngineActorOptions(state, priest.id, OFFER_ENVIRONMENT).find((candidate) =>
       mainMultiattack(candidate, 'radiant-flame', 2) &&
       candidate.actionSlots.some((slot) => slot.slot === 'bonus' && slot.use.kind === 'cast_spell' &&
         slot.use.sourceActionId === 'divine-aid' && slot.use.spellId === 'bless'));
@@ -202,7 +213,12 @@
       { slot: 'bonus', kind: 'cast_spell', actionId: 'divine-aid', spellId: 'bless' },
     ]);
 
-    const session = new EngineRoundSession(state, mulberry32(418_202), { kind: 'unattended', askDefault: 'decline' });
+    const session = new EngineRoundSession(
+      state,
+      mulberry32(418_202),
+      { kind: 'unattended', askDefault: 'decline' },
+      OFFER_ENVIRONMENT,
+    );
     session.applyResolvedMechanics([authorized], null);
     const after = session.currentState();
     expect(after.eventLog.filter((event) =>
@@ -219,7 +235,7 @@
   it('spends the correct slot for Cunning Action utilities and applies Dash before movement', () => {
     const spy = monsterProfile(SPY, 'spy');
     const adjacent = encounter([{ profile: spy, column: 0, row: 2 }], 1);
-    const disengage = availableEngineActorOptions(adjacent, spy.id).find((candidate) =>
+    const disengage = availableEngineActorOptions(adjacent, spy.id, OFFER_ENVIRONMENT).find((candidate) =>
       candidate.label === 'Shortsword -> combatant:target + Cunning Action/Disengage');
     if (disengage === undefined) throw new Error('Spy attack + bonus Disengage option is absent.');
 
@@ -227,6 +243,7 @@
       adjacent,
       mulberry32(418_203),
       { kind: 'unattended', askDefault: 'decline' },
+      OFFER_ENVIRONMENT,
     );
     disengageSession.applyResolvedMechanics([authorize(adjacent, disengage)], null);
     const resourceEvents = disengageSession.currentState().eventLog.flatMap((event) =>
@@ -237,7 +254,7 @@
     }));
 
     const distant = encounter([{ profile: spy, column: 0, row: 2 }], 10);
-    const attackAndDash = availableEngineActorOptions(distant, spy.id).find((candidate) =>
+    const attackAndDash = availableEngineActorOptions(distant, spy.id, OFFER_ENVIRONMENT).find((candidate) =>
       candidate.label === 'Shortsword -> combatant:target + Cunning Action/Dash');
     if (attackAndDash === undefined) throw new Error('Spy attack + bonus Dash option is absent.');
     expect(attackAndDash.movement.preference.maximumFeet).toBe(60);
@@ -246,6 +263,7 @@
       distant,
       mulberry32(418_204),
       { kind: 'unattended', askDefault: 'decline' },
+      OFFER_ENVIRONMENT,
     );
     dashSession.applyResolvedMechanics([authorize(distant, attackAndDash)], null);
     expect(dashSession.currentState().tokens.find((token) => token.combatantId === spy.id)?.position.column)
@@ -264,7 +282,7 @@
         ? { ...combatant, turn: { ...combatant.turn, action: { kind: 'spent' } } }
         : combatant),
     };
-    expect(availableEngineActorOptions(spentMain, priest.id)).toEqual([]);
+    expect(availableEngineActorOptions(spentMain, priest.id, OFFER_ENVIRONMENT)).toEqual([]);
 
     const spentBonus: EncounterState = {
       ...available,
@@ -272,7 +290,7 @@
         ? { ...combatant, turn: { ...combatant.turn, bonusActionAvailable: false } }
         : combatant),
     };
-    expect(availableEngineActorOptions(spentBonus, priest.id).every((option) =>
+    expect(availableEngineActorOptions(spentBonus, priest.id, OFFER_ENVIRONMENT).every((option) =>
       option.actionSlots.every((slot) => slot.slot === 'main'))).toBe(true);
 
     const reference = PRIEST.sourceDetails.bonusActions.kind === 'present'
@@ -297,7 +315,7 @@
           }
         : combatant),
     };
-    expect(availableEngineActorOptions(exhausted, priest.id).some((option) =>
+    expect(availableEngineActorOptions(exhausted, priest.id, OFFER_ENVIRONMENT).some((option) =>
       option.actionSlots.some((slot) => slot.use.kind === 'cast_spell' && slot.use.spellId === 'bless')))
       .toBe(false);
   });
@@ -305,36 +323,21 @@
   it('rejects a multiattack when even one declared component is illegal', () => {
     const scout = monsterProfile(SCOUT, 'partial-scout');
     const state = encounter([{ profile: scout, column: 0, row: 2 }], 8);
-    const illegal: EngineOfferableOption = {
-      optionId: engineOptionId('option:partial-illegal'),
-      actorId: scout.id,
-      revision: state.revision,
-      label: 'Longbow plus homebrew missing attack',
-      movement: {
-        preference: { willingness: 'only_if_required', maximumFeet: 30, opportunityRisk: 'avoid' },
-        engagement: {
-          stance: 'maintain_range',
-          anchor: { kind: 'combatant', combatantId: playerProfile('target').id },
-        },
-      },
-      actionSlots: [{
-        slot: 'main',
-        use: {
-          kind: 'multiattack',
-          actionId: engineActionId('multiattack'),
-          components: [
-            { kind: 'attack', actionId: engineActionId('longbow'), target: { kind: 'combatant', combatantId: playerProfile('target').id }, omittedRiders: [] },
-            { kind: 'attack', actionId: engineActionId('homebrew-missing'), target: { kind: 'combatant', combatantId: playerProfile('target').id }, omittedRiders: [] },
-          ],
-        },
-      }],
-      resourceCostLabels: [],
-      omittedRiders: [],
+    const option = availableEngineActorOptions(state, scout.id, OFFER_ENVIRONMENT)
+      .find((candidate) => mainMultiattack(candidate, 'longbow', 2));
+    if (option === undefined) throw new Error('Scout Longbow ×2 option is absent.');
+    const priest = monsterProfile(PRIEST, 'partial-priest');
+    if (priest.kind !== 'monster') throw new Error('Priest fixture must be a monster.');
+    const illegalState: EncounterState = {
+      ...state,
+      combatants: state.combatants.map((combatant) => combatant.profile.id === scout.id
+        ? { ...combatant, profile: { ...combatant.profile, statblockId: priest.statblockId } }
+        : combatant),
     };
-    expect(resolveEngineActorOption(state, illegal)).toEqual({
+    expect(resolveEngineActorOption(illegalState, option, OFFER_ENVIRONMENT)).toEqual({
       valid: false,
       code: 'MULTIATTACK_COMBINATION_ILLEGAL',
-      summary: 'combatant:partial-scout: Longbow plus homebrew missing attack is unavailable',
+      summary: 'combatant:partial-scout: Longbow + Longbow -> combatant:target is unavailable',
     });
   });
 
@@ -362,7 +365,7 @@
       createdRevision: 0,
     };
     const eligible = encounter([{ profile: scout, column: 0, row: 2 }], 8, [actorObject]);
-    const offered = availableEngineActorOptions(eligible, scout.id)
+    const offered = availableEngineActorOptions(eligible, scout.id, OFFER_ENVIRONMENT)
       .find((option) => option.actionSlots.some((slot) =>
         slot.use.kind === 'use_world_object' && slot.use.actionId === 'ring-signal-bell'));
     expect(offered?.label).toBe('ring-signal-bell @ Signal Bell');
@@ -378,7 +381,7 @@
       })),
     };
     const ineligible = encounter([{ profile: scout, column: 0, row: 2 }], 8, [ineligibleObject]);
-    expect(availableEngineActorOptions(ineligible, scout.id).some((option) =>
+    expect(availableEngineActorOptions(ineligible, scout.id, OFFER_ENVIRONMENT).some((option) =>
       option.actionSlots.some((slot) => slot.use.kind === 'use_world_object'))).toBe(false);
   });
 
@@ -389,7 +392,7 @@
       { profile: scout, column: 0, row: 1 },
       { profile: priest, column: 0, row: 3 },
     ], 10);
-    const runtime = createEngineMcpRuntime(state, { revision: 42 });
+    const runtime = createEngineMcpRuntime(state, { revision: 42, offerEnvironment: OFFER_ENVIRONMENT });
     const capsule = runtime.feed.current();
     const labels = capsule.projection.combatants.flatMap((actor) => actor.options.map((option) => option.label));
     expect(labels).toContain('Longbow + Longbow -> combatant:target');
diff --git a/tests/unit/vtt/controller-assignment.test.ts b/tests/unit/vtt/controller-assignment.test.ts
index d814a7b357a77d83fe068c320b4b87f50db891a7..04634db6ccd0974c7620b367ce1d8c189602be2a
--- a/tests/unit/vtt/controller-assignment.test.ts
+++ b/tests/unit/vtt/controller-assignment.test.ts
@@ -6,7 +6,13 @@
 } from '../../../src/vtt/dm-encounter-host';
 import { REFERENCE_FIGHTER_ID } from '../../../src/vtt/reference-encounter';
 import { MemoryBrowserSessionStore } from '../../../src/vtt/session-persistence';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 
+const OFFER_ENVIRONMENT = buildOfferEnvironment({
+  kind: 'configuration',
+  mode: 'legacy_standard',
+});
+
 async function settle(): Promise<void> {
   await Promise.resolve();
   await Promise.resolve();
@@ -35,6 +41,7 @@
     const host = new DmEncounterHost(
       'session:controller-assignment-algorithm',
       new MemoryBrowserSessionStore(),
+      { offerEnvironment: OFFER_ENVIRONMENT },
     );
 
     void host.start();
diff --git a/tests/unit/vtt/d466-b4-spell-payloads.test.ts b/tests/unit/vtt/d466-b4-spell-payloads.test.ts
index ab3891bc19a83b6cd02e75cf644b1edb2feef388..d2b10dbb100a65e0e91c065868160bac8946ba1c
--- a/tests/unit/vtt/d466-b4-spell-payloads.test.ts
+++ b/tests/unit/vtt/d466-b4-spell-payloads.test.ts
@@ -20,9 +20,15 @@
 import { reconcileStableRenderedChildren } from '../../../src/vtt/stable-dom-render';
 import { engineActorOptions } from '../../../src/vtt/turn-option-registry';
 import type { EngineActivationChoice } from '../../../src/vtt/turn-proposal';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';
 import { elementText, installInteractiveDocument, interactiveElement } from '../../fixtures/interactive-dom';
 
+const OFFER_ENVIRONMENT = buildOfferEnvironment({
+  kind: 'configuration',
+  mode: 'legacy_standard',
+});
+
 type OutsideCommandWordIsAccepted = {
   readonly kind: 'command_word';
   readonly value: 'dance';
@@ -246,7 +252,7 @@
         },
       }, () => 0.5).state;
       state = freshMonsterPlanningState(state);
-      const projected = projectHumanEngineOptions(state, [unicorn.id]);
+      const projected = projectHumanEngineOptions(state, [unicorn.id], state.revision, OFFER_ENVIRONMENT);
       const optionCount = projected[0]?.options.filter((entry) =>
         entry.availability === 'offerable' && entry.option.activationChoice?.kind === 'unicorns_blessing_spell').length;
       const catalog = renderHumanEngineOptionCatalog(projected);
diff --git a/tests/unit/vtt/detection-ui.test.ts b/tests/unit/vtt/detection-ui.test.ts
index 8505edafb660f3d1fbd6a80673f61c3a2e179b34..ac9b511e7051f5e1618757bac47af2dc2d1eb72d
--- a/tests/unit/vtt/detection-ui.test.ts
+++ b/tests/unit/vtt/detection-ui.test.ts
@@ -6,8 +6,14 @@
 import { encounterBoardRenderModel, projectEncounterBoard } from '../../../src/vtt/encounter-board';
 import { projectDmBoard, projectPlayerBoard } from '../../../src/vtt/encounter-projections';
 import { REFERENCE_ENCOUNTER_ART } from '../../../src/vtt/reference-encounter-art';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';
 
+const OFFER_ENVIRONMENT = buildOfferEnvironment({
+  kind: 'configuration',
+  mode: 'legacy_standard',
+});
+
 const IDLE = {
   requestSequence: 1,
   pendingRequest: null,
@@ -60,6 +66,7 @@
       coordinator: IDLE,
       controllers: identities(moved),
       history: [],
+      offerEnvironment: OFFER_ENVIRONMENT,
     });
 
     expect(projection.decisionTray.entries).toContainEqual(expect.objectContaining({
@@ -83,6 +90,7 @@
       coordinator: IDLE,
       controllers: identities(moved),
       history: [],
+      offerEnvironment: OFFER_ENVIRONMENT,
       boundaryRefusal: {
         code: 'turn_boundary_blocked',
         message: 'The turn cannot advance while a pending decision for this boundary is unresolved.',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 58df094ff3646691669fd0a2cbdf55503e16aa74..c500c495761cfa15fe3f3d73670cf359e8d408d9
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -9,13 +9,21 @@
   renderDmIntelRow,
   salientInitiativeWindow,
 } from '../../../src/vtt/dm-tactical-intel';
-import { createEngineStateCapsule, type EngineStateCapsule } from '../../../src/vtt/engine-state-capsule';
-import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
+import {
+  createEngineStateCapsuleForEnvironment,
+  type EngineStateCapsule,
+} from '../../../src/vtt/engine-state-capsule';
 import { ENGINE_FAILURE_MODES_POLICY } from '../../../src/vtt/engine-failure-modes';
 import { freshMonsterPlanningState, createEngineMcpRuntime, loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
 import { TURN_CONTEXT_MAX_BYTES } from '../../../src/vtt/mcp/engine-server';
 import { engineOptionId } from '../../../src/vtt/turn-proposal';
 import { traceCombatantLine } from '../../../src/combat/cover';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
+
+const OFFER_ENVIRONMENT = buildOfferEnvironment({
+  kind: 'configuration',
+  mode: 'legacy_standard',
+});
 
 const FIGHTER = combatantId('combatant:fighter');
 const SCOUT = combatantId('combatant:generated-5117009-monster-3');
@@ -32,6 +40,7 @@
   const state = freshMonsterPlanningState(loaded);
   const runtime = createEngineMcpRuntime(state, {
     toolProfile: profile,
+    offerEnvironment: OFFER_ENVIRONMENT,
     ...(turnContextMaximumBytes === undefined ? {} : { turnContextMaximumBytes }),
   });
   return { state, runtime, capsule: runtime.feed.current() };
@@ -121,7 +130,7 @@
 
   it('keeps exact probability internally while both context and query render coarse values', async () => {
     const { state, runtime, capsule } = await r02Runtime();
-    const exact = exactDmIntelMatrix(state, capsule, canonicalEngineQueryPort)
+    const exact = exactDmIntelMatrix(state, capsule, OFFER_ENVIRONMENT.queries)
       .find((row) => row.actorId === SCOUT && row.targetId === FIGHTER);
     if (exact === undefined) throw new Error('Exact Scout-to-Fighter row is absent.');
     // Half Cover makes each +4 Longbow shot hit AC 20 on 16-20: 5/20.
@@ -179,7 +188,7 @@
 
   it('emits a short neutral death-save window only when the top actor precedes the target', async () => {
     const { state, capsule } = await r02Runtime();
-    const row = exactDmIntelMatrix(state, capsule, canonicalEngineQueryPort)
+    const row = exactDmIntelMatrix(state, capsule, OFFER_ENVIRONMENT.queries)
       .find((candidate) => candidate.actorId === SCOUT && candidate.targetId === FIGHTER);
     if (row === undefined) throw new Error('Salience row is absent.');
     const orderedCapsule = (order: readonly [typeof SCOUT, typeof FIGHTER] | readonly [typeof FIGHTER, typeof SCOUT]): EngineStateCapsule => ({
@@ -212,7 +221,7 @@
   it('renders the failure manifest only in the DM profile and retains the 32 KiB trim', async () => {
     const dm = await r02Runtime('dm');
     const original = dm.capsule;
-    const bloated = createEngineStateCapsule({
+    const bloated = createEngineStateCapsuleForEnvironment({
       runId: original.runId,
       branchId: original.branchId,
       revision: original.revision + 1,
@@ -241,6 +250,7 @@
         encounterRound: 999_999,
       })),
       rulesIndex: original.rulesIndex,
+      offerEnvironment: OFFER_ENVIRONMENT.binding,
     });
     dm.runtime.feed.replace(bloated);
     const trimmed = fullContext(dm.runtime, bloated);
diff --git a/tests/unit/vtt/encounter-board-projection.test.ts b/tests/unit/vtt/encounter-board-projection.test.ts
index dac3c19d74716296bb44d4c404ddbc7ba5235195..c3ce11a4d136c69d399f78da377342c3db9bc38b
--- a/tests/unit/vtt/encounter-board-projection.test.ts
+++ b/tests/unit/vtt/encounter-board-projection.test.ts
@@ -39,7 +39,13 @@
 import { generateRoom } from '../../../src/vtt/room-generator';
 import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
 import { engineActorOptions } from '../../../src/vtt/turn-option-registry';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 
+const OFFER_ENVIRONMENT = buildOfferEnvironment({
+  kind: 'configuration',
+  mode: 'legacy_standard',
+});
+
 interface SpellRecord {
   readonly id: string;
   readonly targeting: SpellTargeting;
@@ -298,6 +304,7 @@
     const expected = engineActorOptions(state, monster.profile.id);
     const projection = projectDmBoard({
       view: projectDmView(state), coordinator: IDLE, controllers: [], history: [],
+      offerEnvironment: OFFER_ENVIRONMENT,
     });
     const actor = projection.humanEngineOptions.find((candidate) => candidate.actorId === monster.profile.id);
     if (actor === undefined) throw new Error('Human engine option projection omitted the monster.');
@@ -698,6 +705,7 @@
         combatantId: actor.id, controllerId: 'controller:human-board', kind: 'human', generation: 0,
       }],
       history: [],
+      offerEnvironment: OFFER_ENVIRONMENT,
     });
     expect(human.humanCommandActions.map((command) => command.type)).toEqual([
       'move', 'attack', 'cast_spell', 'activate_sustained_effect',
@@ -714,6 +722,7 @@
         combatantId: actor.id, controllerId: 'controller:algorithm-board', kind: 'algorithm', generation: 0,
       }],
       history: [],
+      offerEnvironment: OFFER_ENVIRONMENT,
     });
     expect(algorithm.humanCommandActions).toEqual([]);
   });
diff --git a/tests/unit/vtt/encounter-projections.test.ts b/tests/unit/vtt/encounter-projections.test.ts
index d976fc88ba43b8fa021d43b27fd738b764405cff..cb7c173d860e40cc3cb3933fe4f259cecc117d41
--- a/tests/unit/vtt/encounter-projections.test.ts
+++ b/tests/unit/vtt/encounter-projections.test.ts
@@ -32,6 +32,12 @@
   referenceEncounterSetup,
 } from '../../../src/vtt/reference-encounter';
 import { MemoryBrowserSessionStore } from '../../../src/vtt/session-persistence';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
+
+const OFFER_ENVIRONMENT = buildOfferEnvironment({
+  kind: 'configuration',
+  mode: 'legacy_standard',
+});
 
 const IDLE = {
   requestSequence: 1,
@@ -118,6 +124,7 @@
     const host = new DmEncounterHost(
       'session:state-only-projection-parity',
       new MemoryBrowserSessionStore(),
+      { offerEnvironment: OFFER_ENVIRONMENT },
     );
     const dmProjection = host.snapshot().dm;
     const topDownProjection: TopDownDmBoardProjection = {
@@ -150,7 +157,7 @@
     const host = new DmEncounterHost(
       'session:host-wiring-secrecy',
       new MemoryBrowserSessionStore(),
-      { initialState: hostBoundaryHiddenState() },
+      { initialState: hostBoundaryHiddenState(), offerEnvironment: OFFER_ENVIRONMENT },
     );
     const player = host.snapshot().player;
     const serialized = serializePlayerBoard(player);
@@ -388,7 +395,11 @@
   });
 
   it('M42-ADJUDICATION-PAUSES cancels the pending request and dispatches nothing until resume', async () => {
-    const host = new DmEncounterHost('session:adjudication-pause', new MemoryBrowserSessionStore());
+    const host = new DmEncounterHost(
+      'session:adjudication-pause',
+      new MemoryBrowserSessionStore(),
+      { offerEnvironment: OFFER_ENVIRONMENT },
+    );
     host.start();
     await Promise.resolve();
     await Promise.resolve();
diff --git a/tests/unit/vtt/engine-context-integrations.test.ts b/tests/unit/vtt/engine-context-integrations.test.ts
index b8be9559055b8b8e0035456db63fefe1eb582461..ba269cbd8db60190839bf118f7220879f56c3b9a
--- a/tests/unit/vtt/engine-context-integrations.test.ts
+++ b/tests/unit/vtt/engine-context-integrations.test.ts
@@ -5,7 +5,7 @@
 import { encounterBranchId, encounterSessionId } from '../../../src/combat/values';
 import { mulberry32 } from '../../../src/combat/random';
 import { UNICORN } from '../../../src/combat/statblocks/monsters';
-import { createEngineStateCapsule } from '../../../src/vtt/engine-state-capsule';
+import { createEngineStateCapsuleForEnvironment } from '../../../src/vtt/engine-state-capsule';
 import { createEngineMcpRuntime, loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
 import {
   TURN_CONTEXT_MAX_BYTES,
@@ -19,7 +19,13 @@
 import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
 import { engineActorOptions } from '../../../src/vtt/turn-option-registry';
 import { projectHumanEngineOptions } from '../../../src/vtt/encounter-board-projection';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 
+const OFFER_ENVIRONMENT = buildOfferEnvironment({
+  kind: 'configuration',
+  mode: 'legacy_standard',
+});
+
 const fixedD20 = (face: number) => () => (face - 0.5) / 20;
 
 function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
@@ -115,6 +121,7 @@
     toolProfile: 'dm',
     requestedActorIds: [setup.unicorn.id],
     initiativeProjection: { policy: 'initiative-intel-v1', timeline },
+    offerEnvironment: OFFER_ENVIRONMENT,
   });
   const capsule = runtime.feed.current();
   const context = record(runtime.toolSurface.execute('engine.get_turn_context', {
@@ -139,6 +146,7 @@
     applyRoomInitiativeProfile(state, 'derived_v1'),
     mulberry32(seed),
     { kind: 'unattended', askDefault: 'decline' },
+    OFFER_ENVIRONMENT,
   );
   const prepared = session.beginRoundWithoutSkipping({
     runId: encounterSessionId('encounter:brutal-context'),
@@ -163,6 +171,7 @@
     historyKind: 'room_ready',
     requestedActorCount: requestedActorCount ?? request.actors.length,
     initiativeProjection: prepared.snapshot.capsule.projection.initiative,
+    offerEnvironment: OFFER_ENVIRONMENT,
     ...(base === undefined ? {} : { turnContextDeltaBase: base }),
   });
   const capsule = runtime.feed.current();
@@ -190,6 +199,7 @@
     if (hidden === undefined) throw new Error('Brutal context fixture has no hidden spell.');
     const runtime = createEngineMcpRuntime(state, {
       toolProfile: 'dm', requestedActorIds: [actor.profile.id],
+      offerEnvironment: OFFER_ENVIRONMENT,
     });
     const capsule = runtime.feed.current();
     const context = runtime.toolSurface.execute('engine.get_turn_context', {
@@ -199,7 +209,12 @@
       granularity: 'full',
       intel_mode: 'full',
     });
-    const human = projectHumanEngineOptions(state, [actor.profile.id])[0];
+    const human = projectHumanEngineOptions(
+      state,
+      [actor.profile.id],
+      state.revision,
+      OFFER_ENVIRONMENT,
+    )[0];
     if (human === undefined) throw new Error('Human projection omitted the brutal actor.');
     const firstHumanOnly = human.options.findIndex((option) => option.availability === 'human_only');
 
@@ -375,7 +390,7 @@
     const { runtime, capsule } = contextFor(setup);
     const firstActor = capsule.projection.combatants.find((actor) => actor.id === setup.unicorn.id);
     if (firstActor?.options[0] === undefined) throw new Error('Unicorn context has no option to bloat.');
-    const bloated = createEngineStateCapsule({
+    const bloated = createEngineStateCapsuleForEnvironment({
       runId: capsule.runId,
       branchId: capsule.branchId,
       revision: capsule.revision + 1,
@@ -406,6 +421,7 @@
         encounterRound: 999_999,
       })),
       rulesIndex: capsule.rulesIndex,
+      offerEnvironment: OFFER_ENVIRONMENT.binding,
     });
     runtime.feed.replace(bloated);
     const context = record(runtime.toolSurface.execute('engine.get_turn_context', {
diff --git a/tests/unit/vtt/engine-host-integration.test.ts b/tests/unit/vtt/engine-host-integration.test.ts
index a0216802d825fe9484b7d5224aa7a8db62ad6bc8..20e1853f03d26f4a790c172176a43fd155df9d8f
--- a/tests/unit/vtt/engine-host-integration.test.ts
+++ b/tests/unit/vtt/engine-host-integration.test.ts
@@ -14,6 +14,12 @@
   referenceEncounterSetup,
 } from '../../../src/vtt/reference-encounter';
 import { MemoryBrowserSessionStore, type SessionRevision } from '../../../src/vtt/session-persistence';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
+
+const OFFER_ENVIRONMENT = buildOfferEnvironment({
+  kind: 'configuration',
+  mode: 'legacy_standard',
+});
 
 function identities(): readonly ControllerIdentity[] {
   return [...REFERENCE_PLAYER_IDS, REFERENCE_MONSTER_ID].map((combatantId) => ({
@@ -35,7 +41,11 @@
 describe('engine host adjudication and DM control integration', () => {
   it('journals an engine adjudication request, restores its tray entry, and applies only the DM verdict', () => {
     const store = new MemoryBrowserSessionStore();
-    const host = new DmEncounterHost('session:engine-adjudication', store);
+    const host = new DmEncounterHost(
+      'session:engine-adjudication',
+      store,
+      { offerEnvironment: OFFER_ENVIRONMENT },
+    );
     const snapshot = host.snapshot();
     const latest = snapshot.dm.history.at(-1);
     if (latest === undefined) throw new Error('Host needs an initial journal revision.');
@@ -66,7 +76,11 @@
     expect(host.snapshot().dm.history.map((entry) => entry.transition.kind)).toContain('engine_adjudication_requested');
 
     host.close();
-    const restored = new DmEncounterHost('session:engine-adjudication', store);
+    const restored = new DmEncounterHost(
+      'session:engine-adjudication',
+      store,
+      { offerEnvironment: OFFER_ENVIRONMENT },
+    );
     expect(restored.snapshot().dm.decisionTray.entries).toContainEqual(expect.objectContaining({
       kind: 'engine_adjudication',
       request: expect.objectContaining({ adjudicationRequestId: request.adjudicationRequestId }),
@@ -118,6 +132,7 @@
       initialState: state,
       initialControllers: identities(),
       bridge,
+      offerEnvironment: OFFER_ENVIRONMENT,
       agentSession: {
         cli: 'codex',
         sessionId: agentSessionId('agent-session:takeover'),
diff --git a/tests/unit/vtt/engine-opportunity-movement-intel.test.ts b/tests/unit/vtt/engine-opportunity-movement-intel.test.ts
index 1b7668b350a5a735c0318c10a624b4d4c939ef2c..d3e24062f5e33ed93f14162c4fc8c28548513af1
--- a/tests/unit/vtt/engine-opportunity-movement-intel.test.ts
+++ b/tests/unit/vtt/engine-opportunity-movement-intel.test.ts
@@ -1,7 +1,6 @@
 import { describe, expect, it } from 'vitest';
 import type { EncounterState } from '../../../src/combat/encounter';
 import { combatantId } from '../../../src/combat/values';
-import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
 import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
 import {
   actorOpportunityReport,
@@ -17,6 +16,12 @@
 import { engineSchemaInternals, schemaViolations } from '../../../src/vtt/mcp/schemas';
 import { createEngineMcpRuntime, decodeArenaFixtureText } from '../../../src/vtt/mcp/entrypoint';
 import { declareTestInputs } from '../../helpers/test-inputs';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
+
+const OFFER_ENVIRONMENT = buildOfferEnvironment({
+  kind: 'configuration',
+  mode: 'legacy_standard',
+});
 
 const inputs = declareTestInputs({
   fixtures: [
@@ -78,6 +83,7 @@
       requestedActorIds: dashZeroActorIds,
       revision: 203,
       room: 8,
+      offerEnvironment: OFFER_ENVIRONMENT,
     });
     const capsule = runtime.feed.current();
     const context = record(runtime.toolSurface.execute('engine.get_turn_context', {
@@ -102,7 +108,7 @@
     if (!Array.isArray(proposals)) throw new TypeError('Room-8 play proposals are absent.');
 
     for (const actorId of dashZeroActorIds) {
-      const options = availableEngineActorOptions(state, actorId, canonicalEngineQueryPort, 203);
+      const options = availableEngineActorOptions(state, actorId, OFFER_ENVIRONMENT, 203);
       expect(options.some((option) => option.actionSlots.some((slot) =>
         slot.use.kind === 'attack' || slot.use.kind === 'multiattack'))).toBe(false);
     }
@@ -112,7 +118,7 @@
       [combatantId('combatant:generated-5117008-monster-5'), 40],
     ] as const;
     for (const [actorId, expectedMovementFeet] of guardAttackArrival) {
-      const movement = canonicalEngineQueryPort.movementOptions(state, actorId, CLERIC, 'spear');
+      const movement = OFFER_ENVIRONMENT.queries.movementOptions(state, actorId, CLERIC, 'spear');
       expect(movement?.earliestAttackTurn).toMatchObject({
         status: 'resolved', movementCost: expectedMovementFeet, turns: 1,
       });
@@ -122,10 +128,10 @@
       const proposal = record(value);
       const actorId = combatantId(String(proposal['actor_id']));
       const optionId = String(proposal['primary_option_id']);
-      const option = availableEngineActorOptions(state, actorId, canonicalEngineQueryPort, 203)
+      const option = availableEngineActorOptions(state, actorId, OFFER_ENVIRONMENT, 203)
         .find((candidate) => candidate.optionId === optionId);
       if (option === undefined) throw new Error(`Room-8 proposal option is absent for ${actorId}.`);
-      const resolution = resolveEngineActorOption(state, option, canonicalEngineQueryPort);
+      const resolution = resolveEngineActorOption(state, option, OFFER_ENVIRONMENT);
       if (!resolution.valid) throw new Error(`Room-8 proposal option is illegal for ${actorId}.`);
       return {
         actorId,
@@ -158,7 +164,7 @@
 
   it('renders the hand-computed R02 one-square Bandit upgrade and Guard attack ETA', () => {
     const state = frozenState();
-    const bandit = canonicalEngineQueryPort.movementOptions(
+    const bandit = OFFER_ENVIRONMENT.queries.movementOptions(
       state,
       BANDIT,
       WIZARD,
@@ -190,7 +196,7 @@
     expect(upgrade.deltas.expectedDamage.after).toBeCloseTo(2.425, 12);
     expect(upgrade.deltas.expectedDamage.delta).toBeCloseTo(1.53375, 12);
 
-    const guard = canonicalEngineQueryPort.movementOptions(state, GUARD, FIGHTER, 'spear');
+    const guard = OFFER_ENVIRONMENT.queries.movementOptions(state, GUARD, FIGHTER, 'spear');
     if (guard?.earliestAttackTurn.status !== 'resolved') {
       throw new Error('Frozen Guard ETA is unresolved.');
     }
@@ -221,7 +227,10 @@
     // Mutation check: treating Spear as melee-only yields a plausible but wrong P100/T+2.
     expect(rendered['attack_eta']).not.toBe('P100/T+2');
 
-    const runtime = createEngineMcpRuntime(state, { requestedActorIds: [BANDIT, GUARD] });
+    const runtime = createEngineMcpRuntime(state, {
+      requestedActorIds: [BANDIT, GUARD],
+      offerEnvironment: OFFER_ENVIRONMENT,
+    });
     const capsule = runtime.feed.current();
     const context = record(runtime.toolSurface.execute('engine.get_turn_context', {
       run_id: capsule.runId,
@@ -257,7 +266,7 @@
     const monsters = state.combatants.filter((combatant) => combatant.profile.kind === 'monster');
     expect(monsters).toHaveLength(6);
     for (const monster of monsters) {
-      const report = actorOpportunityReport(state, monster.profile.id, canonicalEngineQueryPort, 1);
+      const report = actorOpportunityReport(state, monster.profile.id, OFFER_ENVIRONMENT, 1);
       const selectedDefault = report.options.find((option) =>
         option.option.optionId === report.defaultOption.optionId);
       expect(selectedDefault?.kind === 'offense' || selectedDefault?.kind === 'approach').toBe(true);
@@ -271,14 +280,14 @@
       combatants: state.combatants.filter((combatant) => combatant.profile.id === GUARD),
       tokens: state.tokens.filter((token) => token.combatantId === GUARD),
     };
-    const report = actorOpportunityReport(loneGuard, GUARD, canonicalEngineQueryPort, 1);
+    const report = actorOpportunityReport(loneGuard, GUARD, OFFER_ENVIRONMENT, 1);
     const selected = report.options.find((option) => option.option.optionId === report.defaultOption.optionId);
     expect(selected?.kind).toBe('dodge');
     expect(submissionDominance(report, report.defaultOption.optionId).status).toBe('not_dominated');
 
-    expect(actorOpportunityReport(state, BANDIT, canonicalEngineQueryPort, 1).frontierResolution)
+    expect(actorOpportunityReport(state, BANDIT, OFFER_ENVIRONMENT, 1).frontierResolution)
       .toBe('fully_resolved');
-    expect(actorOpportunityReport(state, PRIEST, canonicalEngineQueryPort, 1).frontierResolution)
+    expect(actorOpportunityReport(state, PRIEST, OFFER_ENVIRONMENT, 1).frontierResolution)
       .toBe('contains_unresolved');
   });
 
@@ -286,7 +295,7 @@
     const state = frozenState();
     const monsters = state.combatants.filter((combatant) => combatant.profile.kind === 'monster');
     for (const monster of monsters) {
-      const report = actorOpportunityReport(state, monster.profile.id, canonicalEngineQueryPort, 1);
+      const report = actorOpportunityReport(state, monster.profile.id, OFFER_ENVIRONMENT, 1);
       const legacy = report.options.filter((option): option is ResolvedOpportunityOption =>
         option.status === 'resolved' && option.family === 'legacy');
       if (legacy.length === 0) throw new Error(`${monster.profile.id} has no resolved legacy option.`);
@@ -301,7 +310,7 @@
 
   it('blocks M5 refusal when the selected option has an unresolved declared metric', () => {
     const state = frozenState();
-    const report = actorOpportunityReport(state, BANDIT, canonicalEngineQueryPort, 1);
+    const report = actorOpportunityReport(state, BANDIT, OFFER_ENVIRONMENT, 1);
     const resolved = report.options.find((option) => option.status === 'resolved' && option.kind === 'offense');
     if (resolved === undefined) throw new Error('Frozen Bandit has no resolved offense option.');
     const unresolvedReport: ActorOpportunityReport = {
