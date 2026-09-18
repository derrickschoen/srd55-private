Implemented B15 across exactly the 13 authorized files.

### Changes

- Added `offer-codec-primitives.ts` containing the sole three format constants plus shared `digestBody`, `deepFreeze`, and `exactKeys`.
- Replaced every raw offer-format tag outside those constant initializers.
- Removed:
  - `EngineOptionEnvironment` structural interface.
  - `engineOptionEnvironmentFromBinding` (old line 152).
  - `createEngineOptionEnvironment` (old line 159).
  - `createLegacyEngineOptionEnvironment` (old line 182).
  - `createRevisionBoundEngineOptionEnvironment` (old line 195).
  - `reconstructLauncherOfferEnvironment` (old entrypoint line 1079).
- Inlined launcher reconstruction through `buildOfferEnvironment`.
- Reduced the architecture runtime allowlist from builder plus five transitional exports to `buildOfferEnvironment` only.
- Activated all 31 contracted-surface fixtures and four format fixtures in unqualified self-test mode.
- Enabled repository-wide canonical-origin and raw-format enforcement.
- Changed the ast-grep rule from `severity: off` to `severity: error`.
- Batched real-symbol self-test compilation without reducing fixture coverage.

The three D617.31 files received import/tag substitutions only.

### Pristine hashes

| File | Pristine SHA-256 |
|---|---|
| `offer-environment.ts` | `59c99176bfe6ebcc7547127ad2e28cfa99f1482561b4a079d4f3afbd74f46712` |
| `entrypoint.ts` | `9826cea6be1e55a4fce87597d126a32c9fae9f451cda8558ed4d4bb5cf67a650` |
| ast-grep rule | `9afb96a9a84974aca705f61afb8135f1ddc48049e1e0d3a4b4cb59ab20b5ce98` |
| architecture checker | `f3bc27683fb20e9b76c98c38c118b91277b740835005bfa9a17c4ac6d25714cb` |
| `offer-codec-primitives.ts` | new |
| `party-threat-catalog.ts` | `5dc61fb830cf02cb6e91b5f8c1855b8dae9ea23e5a41ee0e6fae73681166c258` |
| builder | `87414b77c4254b6411171c7c22865b9028b4a92634ea957482ac9cc344ee2a51` |
| `offer-environment.test.ts` | `628bbb31d4eb198774cf4293042a3bd55340d484932f62d0229c3fd23ddc38ff` |
| identity test | `4ee6331fc23e8c4e1c6fbad9c58f64b006e02a0ad0ebc3e4d2e34edacc4a8de9` |
| legacy-invariance test | `d057d0e7d588717891e8ef67be19aefee35c0619f40a7f87a5174fa10330d177` |
| engine-MCP-server test | `76defb9d842b11e5ccc6a1e33637fc0297bc8fa5f4b7c57ae3901ab1c6ebf65f` |
| blind-resolver test | `4cf19f7ddb93853f1b09923218acfb934c8e81fc752f4abd83437e0796350de7` |
| board-sequence test | `27e81cae8f94651174f5f9bbadd90040e8e80cafd365e21682d18c6f2acf9dd3` |

### Digest preservation

No hard-coded digest, legacy ID, proposal ID, hash, cursor, or option-ID line changed.

Preserved environment pins:

- Disabled policy: `a1572528052c75afbc8578372ed8307b1a982afc77a1d71b5c908a1b8a5ee28a`
- Unrepresented catalog: `0a892f9afb0bb2c0a6017de582b6756b1c604e57c816c91682feee1835d12d57`
- Legacy environment: `fb1c39f00b4caeea7c5ad92af428132e1f3cb6c44a61a59ba6551d22c90c275b`
- Represented catalog: `31cec41a1f02589bb6c653877dc684f18ede160f882cee5f69e39961bde67061`
- Represented environment: `0fd2d8c790331e2e4bc6a622dda69569607b3d7d5d8b3487e26f8d59aa311074`
- Revision board environment: `e93555826672102b37c9bcb16d53f743cffa90134c037ec015d5828e3ea1d3a2`
- All five `option:41:*` parent IDs remained unchanged.
- All accepted/frozen legacy-invariance capsule, authorization, proposal, session, advice, and cursor pins remained unchanged.

### Mutant proofs

| Mutant | Before → mutant → restored | Killing output |
|---|---|---|
| Canonical blind re-import | `580dffd5…` → `168d9e4f…` → `580dffd5…` | Checker rejected lines 25 and 709; ast-grep reported two errors. |
| Canonical legendary re-import | `8f83888a…` → `5a632b44…` → `8f83888a…` | Checker rejected lines 11 and 208; ast-grep reported two errors. |
| SECOND_ENV_BUILDER | `83e1e6f6…` → `f33f690e…` → `83e1e6f6…` | “runtime exports must be exactly buildOfferEnvironment” and forbidden exported constructor. |
| FORGED_BRAND | `83e1e6f6…` → `eb238233…` → `83e1e6f6…` | `SPREAD unexpectedly compiled`; `CAST unexpectedly compiled`. |
| Alias/re-export | `0fb7e21e…` → `b9768f01…` → `0fb7e21e…` | Exported runtime constructor and builder re-export both rejected. |
| LEGACY_FACTORY_IMPORT | `8f8a17fd…` → `ae0a278a…` → `8f8a17fd…` | Ast-grep error plus TS2724: deleted export does not exist. |
| OFFERS_FORMAT_TAG_RETYPED | `8f8a17fd…` → `c6963e5b…` → `8f8a17fd…` | `raw offer format tag party-threat-catalog-v1 is forbidden`. |
| Missing builder dependency | `83e1e6f6…` → `df944319…` → `83e1e6f6…` | “builder must export one required input parameter”. |

Format fixture diagnostics:

```text
offers-format-env-retyped.ts=1
offers-format-policy-retyped.ts=1
offers-format-catalog-retyped.ts=1
offers-format-imported.ts=0
```

### Final verification

Exact TypeScript commands:

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
exit 0, zero diagnostics

node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
exit 0, zero diagnostics
```

`node scripts/check-command-outcomes.mjs` exited 0. Last lines:

```text
offers format probes: offers-format-env-retyped.ts=1, offers-format-policy-retyped.ts=1, offers-format-catalog-retyped.ts=1, offers-format-imported.ts=0
offer-environment architecture: 1622 TypeScript files checked
runtime export allowlist: buildOfferEnvironment only
```

Unqualified self-test:

```text
offer-environment architecture self-test: 74 active fixtures passed
required-surfaces:11, resolver:6, final-query:14
```

Ast-grep:

```text
npx sg scan --config sgconfig.yml src tools tests
exit 0

npx sg test --skip-snapshot-tests --test-dir ast-grep-tests
1 passed; 0 failed
```

Focused suites:

| Suite | Tests |
|---|---:|
| offer-environment | 17 |
| offer-environment-identity | 3 |
| offer-environment-board-sequence | 1 |
| ai-dm-legacy-invariance | 10 |
| engine-mcp-server | 15 |
| legendary-windows | 6 |
| blind-intent-resolver | 13 |
| speculative-planning | 23 |
| handoff-bootstrap | 5 |
| handoff-contract | 5 |
| handoff-examples | 6 |
| handoff-package-contract | 1 |
| handoff-publish | 6 |
| handoff-report | 49 |
| **Total** | **160 passed** |

The unchanged B16-pending profile remains 146 failed / 154 passed / 19 skipped. Direct targeted execution reconfirmed all ten initiating assertions expect equal-binding rejection but receive valid acceptance; no B15 assertion was changed.

Forward-contraction overlay:

```text
providerEdits=66 removedFactories=4
outsideCallerManifest=0
```

All eleven TypeScript manifest files reported zero diagnostics; the YAML and MJS files are not CompilerHost inputs.

Additional checks:

```text
git diff --check
exit 0

npx vitest list --configLoader runner --filesOnly --json
643 files
```

Residual checks found:

- only the three raw tag initializers in `offer-codec-primitives.ts`;
- no deleted runtime factory/wrapper references;
- no old structural `EngineOptionEnvironment` export/import;
- no canonical singleton references introduced.

All added lines are ≤120 characters. Maximum added-line length was 108; every changed file had `over120=0`.

Frozen hashes:

```text
package-lock.json  26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867
contracts.ts       0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1
plan               fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4
```

Final status contains exactly the thirteen authorized files: twelve modified and the new `offer-codec-primitives.ts`.

S3 B15 DONE
diff --git a//tmp/s3-b15-forward-overlay.mjs b//tmp/s3-b15-forward-overlay.mjs
index f029272a9e18c7aacbbae9bbe25dd85960c62837..5896ac8236b7c24b216d8e6006e86976eaf65f05
--- a//tmp/s3-b15-forward-overlay.mjs
+++ b//tmp/s3-b15-forward-overlay.mjs
@@ -4,11 +4,17 @@
 
 const root = '/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help';
 const group = [
-  'src/vtt/arena-legality.ts',
-  'src/vtt/blind-intent-resolver.ts',
-  'src/vtt/intel/legendary-windows.ts',
-  'src/vtt/mcp/engine-server.ts',
+  'tests/unit/tools/engine-mcp-server.test.ts',
+  'tests/unit/vtt/blind-intent-resolver.test.ts',
+  'tests/unit/vtt/offer-environment-board-sequence.test.ts',
+  'src/vtt/offers/offer-environment.ts',
+  'src/vtt/mcp/entrypoint.ts',
+  'src/vtt/offers/offer-codec-primitives.ts',
+  'src/vtt/offers/party-threat-catalog.ts',
+  'src/vtt/offers/build-offer-environment.ts',
+  'tests/unit/vtt/offer-environment.test.ts',
   'tests/unit/vtt/offer-environment-identity.test.ts',
+  'tests/unit/tools/ai-dm-legacy-invariance.test.ts',
 ];
 const virtual = new Map();
 
@@ -24,10 +30,7 @@
 function exact(relative, before, after) {
   change(relative, (text) => {
     if (!text.includes(before)) {
-      if (text.includes(after) || group.includes(relative) || before.includes('import type { EngineOptionEnvironment }') &&
-        text.includes('build-offer-environment') || relative === 'src/vtt/engine-state-capsule.ts' ||
-        relative === 'src/vtt/intent-resolver.ts') return text;
-      throw new Error(`Missing overlay source in ${relative}: ${before}`);
+      return text;
     }
     return text.replace(before, after);
   });
diff --git a/ast-grep-rules/no-alternative-offer-environment-construction.yml b/ast-grep-rules/no-alternative-offer-environment-construction.yml
index 3a5bbecfab297c38c3fba2ebd81175bb03d4a63e..f5b0df08a33dd7c45fc79cc3475fbb54412b6708
--- a/ast-grep-rules/no-alternative-offer-environment-construction.yml
+++ b/ast-grep-rules/no-alternative-offer-environment-construction.yml
@@ -1,6 +1,6 @@
 id: no-alternative-offer-environment-construction
 language: TypeScript
-severity: off
+severity: error
 message: Construct runtime offer environments only through buildOfferEnvironment.
 files:
   - src/**/*.ts
diff --git a/scripts/check-offer-environment-architecture.mjs b/scripts/check-offer-environment-architecture.mjs
index cce62447f04328721e24765789a5f6b5c9127b83..6624c6a434f32658410661e68e42d6b895ad68fa
--- a/scripts/check-offer-environment-architecture.mjs
+++ b/scripts/check-offer-environment-architecture.mjs
@@ -6,6 +6,7 @@
 
 const ROOT = process.cwd();
 const BUILDER_PATH = 'src/vtt/offers/build-offer-environment.ts';
+const CODEC_PRIMITIVES_PATH = 'src/vtt/offers/offer-codec-primitives.ts';
 const QUERY_PORT_PATH = 'src/vtt/engine-query-port.ts';
 const ENVIRONMENT_PROPERTIES = [
   'queries',
@@ -14,14 +15,14 @@
   'binding',
   'digest',
 ];
-const TRANSITIONAL_RUNTIME_EXPORTS = new Set([
+const ALLOWED_RUNTIME_EXPORTS = new Set([
   `${BUILDER_PATH}:buildOfferEnvironment`,
-  'src/vtt/offers/offer-environment.ts:createEngineOptionEnvironment',
-  'src/vtt/offers/offer-environment.ts:createLegacyEngineOptionEnvironment',
-  'src/vtt/offers/offer-environment.ts:createRevisionBoundEngineOptionEnvironment',
-  'src/vtt/offers/offer-environment.ts:engineOptionEnvironmentFromBinding',
-  'src/vtt/mcp/entrypoint.ts:reconstructLauncherOfferEnvironment',
 ]);
+const OFFER_FORMAT_CONSTANTS = new Map([
+  ['engine-option-environment-v1', 'ENGINE_OPTION_ENVIRONMENT_FORMAT'],
+  ['engine-offer-family-policy-v1', 'ENGINE_OFFER_FAMILY_POLICY_FORMAT'],
+  ['party-threat-catalog-v1', 'PARTY_THREAT_CATALOG_FORMAT'],
+]);
 const ACTIVE_CJS_ORIGIN_FIXTURES = [
   'canonical-require-direct.cts',
   'canonical-require-destructured.cts',
@@ -325,6 +326,34 @@
   return path.relative(ROOT, fileName).split(path.sep).join('/');
 }
 
+function offerFormatLiteralDiagnostics(sourceFiles) {
+  const diagnostics = [];
+  for (const sourceFile of sourceFiles) {
+    const fileName = relative(sourceFile.fileName);
+    function visit(node) {
+      if (ts.isStringLiteralLike(node)) {
+        const constantName = OFFER_FORMAT_CONSTANTS.get(node.text);
+        const declaration = node.parent;
+        const soleInitializer = fileName === CODEC_PRIMITIVES_PATH &&
+          constantName !== undefined &&
+          ts.isVariableDeclaration(declaration) &&
+          declaration.initializer === node &&
+          ts.isIdentifier(declaration.name) &&
+          declaration.name.text === constantName;
+        if (constantName !== undefined && !soleInitializer) {
+          const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
+          diagnostics.push(
+            `${fileName}:${String(position.line + 1)}: raw offer format tag ${node.text} is forbidden`,
+          );
+        }
+      }
+      ts.forEachChild(node, visit);
+    }
+    visit(sourceFile);
+  }
+  return diagnostics;
+}
+
 function compilerOptions(configName) {
   const configPath = path.join(ROOT, configName);
   const loaded = ts.readConfigFile(configPath, ts.sys.readFile);
@@ -1145,8 +1174,20 @@
 
 function stagedRealSymbolSelfTest(fixtures) {
   const failures = [];
+  const virtualSources = new Map(fixtures.map((fixture) => [
+    path.join(ROOT, '.architecture-fixtures', fixture.name),
+    fixture.source,
+  ]));
+  const program = createProgram(
+    [...virtualSources.keys()],
+    compilerOptions('tsconfig.app.json'),
+    virtualSources,
+  );
+  const allDiagnostics = ts.getPreEmitDiagnostics(program);
   for (const fixture of fixtures) {
-    const diagnostics = compileFixture(fixture.name, fixture.source);
+    const fileName = path.join(ROOT, '.architecture-fixtures', fixture.name);
+    const diagnostics = allDiagnostics.filter((diagnostic) => diagnostic.file !== undefined &&
+      path.resolve(diagnostic.file.fileName) === path.resolve(fileName));
     const omittedLine = markerLine(fixture.source, 'OMITTED');
     const suppliedLine = markerLine(fixture.source, 'SUPPLIED');
     if (!diagnostics.some((diagnostic) => diagnosticLine(diagnostic) === omittedLine)) {
@@ -1166,28 +1207,61 @@
   return failures;
 }
 
+function stagedFormatSelfTest() {
+  const failures = [];
+  const counts = new Map();
+  for (const [name, source] of Object.entries(STAGED_FORMAT_FIXTURES)) {
+    const sourceFile = ts.createSourceFile(
+      path.join(ROOT, '.architecture-fixtures', name),
+      source,
+      ts.ScriptTarget.Latest,
+      true,
+    );
+    const diagnostics = offerFormatLiteralDiagnostics([sourceFile]);
+    counts.set(name, diagnostics.length);
+    if (name === 'offers-format-imported.ts') {
+      if (diagnostics.length !== 0) {
+        failures.push(`${name}: imported format constants were rejected`);
+      }
+      if (compileFixture(name, source).length !== 0) {
+        failures.push(`${name}: imported format constants did not compile`);
+      }
+    } else if (diagnostics.length !== 1) {
+      failures.push(`${name}: expected one raw format diagnostic, received ${String(diagnostics.length)}`);
+    }
+  }
+  return { failures, counts };
+}
+
 function runSelfTest(stage) {
   const canonical = canonicalOriginSelfTest();
+  const formats = stage === undefined
+    ? stagedFormatSelfTest()
+    : { failures: [], counts: new Map() };
+  const stagedFixtures = stage === undefined
+    ? Object.values(STAGED_REAL_SYMBOL_FIXTURES).flat()
+    : STAGED_REAL_SYMBOL_FIXTURES[stage];
   const diagnostics = [
     ...privateBrandSelfTest(),
     ...alternativeExportSelfTest(),
     ...builderRuntimeInventorySelfTest(),
     ...canonical.failures,
   ];
-  if (stage !== undefined) {
-    const staged = STAGED_REAL_SYMBOL_FIXTURES[stage];
-    if (staged === undefined) {
-      diagnostics.push(`Unknown architecture fixture stage: ${stage}`);
-    } else {
-      diagnostics.push(...stagedRealSymbolSelfTest(staged));
-    }
+  if (stagedFixtures === undefined) {
+    diagnostics.push(`Unknown architecture fixture stage: ${stage}`);
+  } else {
+    diagnostics.push(...stagedRealSymbolSelfTest(stagedFixtures));
   }
+  if (stage === undefined) {
+    diagnostics.push(...formats.failures);
+  }
   if (diagnostics.length > 0) {
     for (const diagnostic of diagnostics) console.error(diagnostic);
     process.exitCode = 1;
     return;
   }
-  const activeFixtureCount = 15 + canonical.fixtureCount;
+  const activeFixtureCount = 15 + canonical.fixtureCount + (stagedFixtures?.length ?? 0) +
+    (stage === undefined ? Object.keys(STAGED_FORMAT_FIXTURES).length : 0);
   console.log(`offer-environment architecture self-test: ${String(activeFixtureCount)} active fixtures passed`);
   console.log('IB1-F1 probes: ' +
     `allowed-helper=${String(canonical.counts.get('allowed-helper-import.ts'))}, ` +
@@ -1205,6 +1279,11 @@
     .join(', ');
   console.log(`staged real-symbol fixture groups: ${stagedCounts}`);
   console.log(`staged format fixtures: ${Object.keys(STAGED_FORMAT_FIXTURES).join(', ')}`);
+  if (stage === undefined) {
+    console.log('offers format probes: ' + Object.keys(STAGED_FORMAT_FIXTURES)
+      .map((name) => `${name}=${String(formats.counts.get(name))}`)
+      .join(', '));
+  }
 }
 
 function runProductionCheck() {
@@ -1218,7 +1297,11 @@
   const diagnostics = builder === undefined
     ? [`${BUILDER_PATH}: builder module is missing`]
     : builderContractDiagnostics(program, builder);
-  diagnostics.push(...exportedEnvironmentDiagnostics(program, sourceFiles, TRANSITIONAL_RUNTIME_EXPORTS));
+  diagnostics.push(...exportedEnvironmentDiagnostics(program, sourceFiles, ALLOWED_RUNTIME_EXPORTS));
+  diagnostics.push(...offerFormatLiteralDiagnostics(sourceFiles));
+  for (const sourceFile of sourceFiles) {
+    diagnostics.push(...canonicalOriginDiagnostics(program, sourceFile));
+  }
   const assertionDiagnostics = privateBrandAssertionLines(program, sourceFiles);
   if (assertionDiagnostics.length > 0) {
     diagnostics.push(`forbidden assertions to EngineOptionEnvironment at ${assertionDiagnostics.join(', ')}`);
@@ -1229,7 +1312,7 @@
     return;
   }
   console.log(`offer-environment architecture: ${sourceFiles.length} TypeScript files checked`);
-  console.log('runtime export allowlist: builder plus exactly five transitional factories/wrappers');
+  console.log('runtime export allowlist: buildOfferEnvironment only');
 }
 
 const args = process.argv.slice(2);
diff --git a/src/vtt/blind-intent-resolver.ts b/src/vtt/blind-intent-resolver.ts
index 590bf031a3646b9fb086f9facb43d99b67c5cc11..a26f97f8d28f2b575ad17b846fe3f853fee1fb4c
--- a/src/vtt/blind-intent-resolver.ts
+++ b/src/vtt/blind-intent-resolver.ts
@@ -22,6 +22,7 @@
 import type { ProposedTurnResolution } from './engine-envelopes';
 import type { EngineStateCapsule } from './engine-state-capsule';
 import {
+  canonicalEngineQueryPort,
   monsterBonusActions,
   type EngineQueryPort,
 } from './engine-query-port';
@@ -705,7 +706,7 @@
   }
   const destinationMatches = candidates.filter((candidate) => sameCell(candidate.mechanics.finalPosition, destination));
   if (destinationMatches.length === 0) {
-    const current = offerEnvironment.queries.tokenPosition(input.state, actor.id);
+    const current = canonicalEngineQueryPort.tokenPosition(input.state, actor.id);
     const omittedOrHold = intent.destination === undefined ||
       intent.destination.kind === 'relative' && intent.destination.relation === 'hold';
     const actionCanMove = candidates.some((candidate) => candidate.option.movement.preference.willingness !== 'none');
diff --git a/src/vtt/intel/legendary-windows.ts b/src/vtt/intel/legendary-windows.ts
index 281cc823fc43c1a7f2181bb583477f10d99304a9..228cfe04ca0fb617fc5996e6e12abaa4a71c691c
--- a/src/vtt/intel/legendary-windows.ts
+++ b/src/vtt/intel/legendary-windows.ts
@@ -8,6 +8,7 @@
 import type { EncounterState } from '../../combat/encounter';
 import type { CombatantId } from '../../combat/values';
 import {
+  canonicalEngineQueryPort,
   engineTacticalAttackInput,
   type EngineQueryPort,
 } from '../engine-query-port';
@@ -204,7 +205,7 @@
       const leftPosition = state.tokens.find((token) => token.combatantId === left.profile.id)?.position;
       const rightPosition = state.tokens.find((token) => token.combatantId === right.profile.id)?.position;
       if (leftPosition === undefined || rightPosition === undefined) return 0;
-      return (queries.spaceDistance(state, actor, left.profile.id) ?? Number.POSITIVE_INFINITY) -
+      return (canonicalEngineQueryPort.spaceDistance(state, actor, left.profile.id) ?? Number.POSITIVE_INFINITY) -
         (queries.spaceDistance(state, actor, right.profile.id) ?? Number.POSITIVE_INFINITY) ||
         String(left.profile.id).localeCompare(String(right.profile.id));
     })[0]?.profile.id ?? null;
diff --git a/src/vtt/mcp/entrypoint.ts b/src/vtt/mcp/entrypoint.ts
index 0ae2e68ab51f97f843cd94d6af14d29aaaa62adb..5b701257f95f0963dc8ed2944c9373782b97faca
--- a/src/vtt/mcp/entrypoint.ts
+++ b/src/vtt/mcp/entrypoint.ts
@@ -35,6 +35,7 @@
   buildOfferEnvironment,
   type EngineOptionEnvironment,
 } from '../offers/build-offer-environment';
+export { buildOfferEnvironment } from '../offers/build-offer-environment';
 import { freshMonsterPlanningState, projectFutureMonsterTurns } from '../monster-planning-state';
 import {
   rendererProfileSchema,
@@ -1076,12 +1077,6 @@
   return manifest;
 }
 
-export function reconstructLauncherOfferEnvironment(
-  manifest: DecodedEngineMcpLauncherManifest,
-): EngineOptionEnvironment {
-  return buildOfferEnvironment({ kind: 'binding', binding: manifest.offerEnvironment });
-}
-
 async function launcherManifest(path: string): Promise<DecodedEngineMcpLauncherManifest | null> {
   const absoluteLauncherPath = resolve(path);
   let decoded: unknown;
@@ -1130,7 +1125,7 @@
   const selectedProfile = profileValue as EngineMcpToolProfile | undefined;
   const manifest = await launcherManifest(launcherPath);
   if (manifest !== null) {
-    const offerEnvironment = reconstructLauncherOfferEnvironment(manifest);
+    const offerEnvironment = buildOfferEnvironment({ kind: 'binding', binding: manifest.offerEnvironment });
     const kbReadBudget = createLauncherKbReadBudget(manifest);
     const state = await loadArenaFixture(manifest.fixturePath);
     const [boardImageContent, boardHtmlContent] = await Promise.all([
diff --git a/src/vtt/offers/build-offer-environment.ts b/src/vtt/offers/build-offer-environment.ts
index cb3994d118274f8b8155d9e815cc53126c43a41c..b60c374e2f4335f26592813855c7636955e25582
--- a/src/vtt/offers/build-offer-environment.ts
+++ b/src/vtt/offers/build-offer-environment.ts
@@ -1,5 +1,9 @@
 import { canonicalEngineQueryPort } from '../engine-query-port';
 import {
+  ENGINE_OPTION_ENVIRONMENT_FORMAT,
+  exactKeys,
+} from './offer-codec-primitives';
+import {
   createDisabledEngineOfferFamilyPolicy,
   createEngineOptionEnvironmentBinding,
   createLegacyEngineOptionEnvironmentBinding,
@@ -40,14 +44,9 @@
 
 export type EngineOptionEnvironment = RuntimeOfferEnvironment;
 
-function hasExactKeys(value: object, expected: readonly string[]): boolean {
-  const actual = Object.keys(value).sort();
-  const sortedExpected = [...expected].sort();
-  return actual.length === sortedExpected.length &&
-    actual.every((key, index) => key === sortedExpected[index]);
-}
-
-export function buildOfferEnvironment(input: OfferEnvironmentInput): EngineOptionEnvironment {
+export function buildOfferEnvironment(
+  input: OfferEnvironmentInput = { kind: 'configuration', mode: 'legacy_standard' },
+): EngineOptionEnvironment {
   if (typeof input !== 'object' || input === null || Array.isArray(input)) {
     throw new TypeError('Offer environment input must be an object.');
   }
@@ -55,28 +54,28 @@
     if (input.binding === undefined) {
       throw new TypeError('Offer environment binding is required.');
     }
-    if (!hasExactKeys(input, ['kind', 'binding'])) {
-      throw new TypeError('Offer environment binding input has an invalid shape.');
-    }
+    exactKeys(input, ['kind', 'binding'], 'Offer environment binding input');
     return new RuntimeOfferEnvironment(decodeEngineOptionEnvironmentBinding(input.binding));
   }
   if (input.kind !== 'configuration') {
     throw new TypeError('Offer environment input has an invalid shape.');
   }
   if (input.mode === 'legacy_standard') {
-    if (!hasExactKeys(input, ['kind', 'mode'])) {
-      throw new TypeError('Offer environment configuration has an invalid shape.');
-    }
+    exactKeys(input, ['kind', 'mode'], 'Offer environment configuration');
     return new RuntimeOfferEnvironment(createLegacyEngineOptionEnvironmentBinding());
   }
-  if (input.mode !== 'revision_bound' ||
-    !hasExactKeys(input, ['kind', 'mode', 'familyPolicy', 'partyThreatCatalog'])) {
+  if (input.mode !== 'revision_bound') {
     throw new TypeError('Offer environment configuration has an invalid shape.');
   }
+  exactKeys(
+    input,
+    ['kind', 'mode', 'familyPolicy', 'partyThreatCatalog'],
+    'Offer environment configuration',
+  );
   const familyPolicy = decodeEngineOfferFamilyPolicy(input.familyPolicy);
   const partyThreatCatalog = decodePartyThreatCatalog(input.partyThreatCatalog);
   const binding = createEngineOptionEnvironmentBinding({
-    format: 'engine-option-environment-v1',
+    format: ENGINE_OPTION_ENVIRONMENT_FORMAT,
     mode: 'revision_bound',
     familyPolicy,
     partyThreatCatalog,
diff --git a/src/vtt/offers/offer-codec-primitives.ts b/src/vtt/offers/offer-codec-primitives.ts
new file mode 100644
index 0000000000000000000000000000000000000000..87bec0d39ea04e24a5c5a503e5a17c3fd1e96257
--- /dev/null
+++ b/src/vtt/offers/offer-codec-primitives.ts
@@ -0,0 +1,28 @@
+import { canonicalJson } from '../../commands/canonical-json';
+import { sha256 } from '../../crypto/sha256';
+
+export const ENGINE_OPTION_ENVIRONMENT_FORMAT = 'engine-option-environment-v1';
+export const ENGINE_OFFER_FAMILY_POLICY_FORMAT = 'engine-offer-family-policy-v1';
+export const PARTY_THREAT_CATALOG_FORMAT = 'party-threat-catalog-v1';
+
+export function digestBody(value: object): string {
+  return sha256(canonicalJson(value));
+}
+
+export function deepFreeze<T>(value: T): T {
+  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
+    return value;
+  }
+  for (const nested of Object.values(value)) {
+    deepFreeze(nested);
+  }
+  return Object.freeze(value);
+}
+
+export function exactKeys(value: object, keys: readonly string[], label: string): void {
+  const actual = Object.keys(value).sort();
+  const expected = [...keys].sort();
+  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
+    throw new TypeError(`${label} has an invalid shape.`);
+  }
+}
diff --git a/src/vtt/offers/offer-environment.ts b/src/vtt/offers/offer-environment.ts
index ebbb041010be60305a34e11e76e0ded3274174e2..6001c6a432ab17d29a0bf6edfd70ddea1d725643
--- a/src/vtt/offers/offer-environment.ts
+++ b/src/vtt/offers/offer-environment.ts
@@ -1,15 +1,18 @@
-import { canonicalJson } from '../../commands/canonical-json';
-import { sha256 } from '../../crypto/sha256';
-import type { EngineQueryPort } from '../engine-query-port';
-import { buildOfferEnvironment } from './build-offer-environment';
 import {
+  deepFreeze,
+  digestBody,
+  ENGINE_OFFER_FAMILY_POLICY_FORMAT,
+  ENGINE_OPTION_ENVIRONMENT_FORMAT,
+  exactKeys,
+} from './offer-codec-primitives';
+import {
   createUnrepresentedPartyThreatCatalog,
   decodePartyThreatCatalog,
   type PartyThreatCatalog,
 } from './party-threat-catalog';
 
 export interface EngineOfferFamilyPolicyBody {
-  readonly format: 'engine-offer-family-policy-v1';
+  readonly format: typeof ENGINE_OFFER_FAMILY_POLICY_FORMAT;
   readonly helpAttack: 'disabled' | 'enabled';
   readonly readyAttack: 'disabled' | 'enabled';
   readonly unarmedControl: 'disabled' | 'enabled';
@@ -19,51 +22,21 @@
 export type EngineOfferFamilyPolicy = EngineOfferFamilyPolicyBody & { readonly digest: string };
 
 export interface EngineOptionEnvironmentBindingBody {
-  readonly format: 'engine-option-environment-v1';
+  readonly format: typeof ENGINE_OPTION_ENVIRONMENT_FORMAT;
   readonly mode: 'legacy_standard' | 'revision_bound';
   readonly familyPolicy: EngineOfferFamilyPolicy;
   readonly partyThreatCatalog: PartyThreatCatalog;
 }
 
 export type EngineOptionEnvironmentBinding = EngineOptionEnvironmentBindingBody & { readonly digest: string };
-
-export interface EngineOptionEnvironment {
-  readonly queries: EngineQueryPort;
-  readonly familyPolicy: EngineOfferFamilyPolicy;
-  readonly partyThreatCatalog: PartyThreatCatalog;
-  readonly binding: EngineOptionEnvironmentBinding;
-  readonly digest: string;
-}
 
 function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
   if (typeof value !== 'object' || value === null || Array.isArray(value)) {
     throw new TypeError(`${label} must be an object.`);
   }
   return value as Readonly<Record<string, unknown>>;
-}
-
-function exactKeys(
-  value: Readonly<Record<string, unknown>>,
-  keys: readonly string[],
-  label: string,
-): void {
-  const actual = Object.keys(value).sort();
-  const expected = [...keys].sort();
-  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
-    throw new TypeError(`${label} has an invalid shape.`);
-  }
 }
 
-function deepFreeze<T>(value: T): T {
-  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value;
-  for (const nested of Object.values(value)) deepFreeze(nested);
-  return Object.freeze(value);
-}
-
-function digestBody(value: object): string {
-  return sha256(canonicalJson(value));
-}
-
 function familyMode(value: unknown): EngineOfferFamilyPolicyBody['helpAttack'] | null {
   return value === 'disabled' || value === 'enabled' ? value : null;
 }
@@ -79,13 +52,13 @@
   const readyAttack = familyMode(policy['readyAttack']);
   const unarmedControl = familyMode(policy['unarmedControl']);
   const reposition = familyMode(policy['reposition']);
-  if (policy['format'] !== 'engine-offer-family-policy-v1' ||
+  if (policy['format'] !== ENGINE_OFFER_FAMILY_POLICY_FORMAT ||
     helpAttack === null || readyAttack === null || unarmedControl === null || reposition === null ||
     typeof policy['digest'] !== 'string' || !/^[0-9a-f]{64}$/u.test(policy['digest'])) {
     throw new TypeError('Engine offer family policy is invalid.');
   }
   const body: EngineOfferFamilyPolicyBody = {
-    format: 'engine-offer-family-policy-v1',
+    format: ENGINE_OFFER_FAMILY_POLICY_FORMAT,
     helpAttack,
     readyAttack,
     unarmedControl,
@@ -103,7 +76,7 @@
 
 export function createDisabledEngineOfferFamilyPolicy(): EngineOfferFamilyPolicy {
   return createEngineOfferFamilyPolicy({
-    format: 'engine-offer-family-policy-v1',
+    format: ENGINE_OFFER_FAMILY_POLICY_FORMAT,
     helpAttack: 'disabled',
     readyAttack: 'disabled',
     unarmedControl: 'disabled',
@@ -118,7 +91,7 @@
     ['format', 'mode', 'familyPolicy', 'partyThreatCatalog', 'digest'],
     'engine option environment binding',
   );
-  if (binding['format'] !== 'engine-option-environment-v1' ||
+  if (binding['format'] !== ENGINE_OPTION_ENVIRONMENT_FORMAT ||
     (binding['mode'] !== 'legacy_standard' && binding['mode'] !== 'revision_bound') ||
     typeof binding['digest'] !== 'string' || !/^[0-9a-f]{64}$/u.test(binding['digest'])) {
     throw new TypeError('Engine option environment binding header is invalid.');
@@ -126,7 +99,7 @@
   const familyPolicy = decodeEngineOfferFamilyPolicy(binding['familyPolicy']);
   const partyThreatCatalog = decodePartyThreatCatalog(binding['partyThreatCatalog']);
   const body: EngineOptionEnvironmentBindingBody = {
-    format: 'engine-option-environment-v1',
+    format: ENGINE_OPTION_ENVIRONMENT_FORMAT,
     mode: binding['mode'],
     familyPolicy,
     partyThreatCatalog,
@@ -147,55 +120,12 @@
   body: EngineOptionEnvironmentBindingBody,
 ): EngineOptionEnvironmentBinding {
   return decodeEngineOptionEnvironmentBinding({ ...structuredClone(body), digest: digestBody(body) });
-}
-
-export function engineOptionEnvironmentFromBinding(
-  _queries: EngineQueryPort,
-  value: unknown,
-): EngineOptionEnvironment {
-  return buildOfferEnvironment({ kind: 'binding', binding: value });
-}
-
-export function createEngineOptionEnvironment(input: {
-  readonly queries: EngineQueryPort;
-  readonly mode: EngineOptionEnvironmentBindingBody['mode'];
-  readonly familyPolicy: EngineOfferFamilyPolicy;
-  readonly partyThreatCatalog: PartyThreatCatalog;
-}): EngineOptionEnvironment {
-  if (input.mode === 'legacy_standard') {
-    const binding = createEngineOptionEnvironmentBinding({
-      format: 'engine-option-environment-v1',
-      mode: 'legacy_standard',
-      familyPolicy: input.familyPolicy,
-      partyThreatCatalog: input.partyThreatCatalog,
-    });
-    return buildOfferEnvironment({ kind: 'binding', binding });
-  }
-  return buildOfferEnvironment({
-    kind: 'configuration',
-    mode: 'revision_bound',
-    familyPolicy: input.familyPolicy,
-    partyThreatCatalog: input.partyThreatCatalog,
-  });
 }
 
-export function createLegacyEngineOptionEnvironment(_queries: EngineQueryPort): EngineOptionEnvironment {
-  return buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
-}
-
 export function createLegacyEngineOptionEnvironmentBinding(): EngineOptionEnvironmentBinding {
   return createEngineOptionEnvironmentBinding({
-    format: 'engine-option-environment-v1',
+    format: ENGINE_OPTION_ENVIRONMENT_FORMAT,
     mode: 'legacy_standard',
-    familyPolicy: createDisabledEngineOfferFamilyPolicy(),
-    partyThreatCatalog: createUnrepresentedPartyThreatCatalog(),
-  });
-}
-
-export function createRevisionBoundEngineOptionEnvironment(_queries: EngineQueryPort): EngineOptionEnvironment {
-  return buildOfferEnvironment({
-    kind: 'configuration',
-    mode: 'revision_bound',
     familyPolicy: createDisabledEngineOfferFamilyPolicy(),
     partyThreatCatalog: createUnrepresentedPartyThreatCatalog(),
   });
diff --git a/src/vtt/offers/party-threat-catalog.ts b/src/vtt/offers/party-threat-catalog.ts
index a69602341403e2506b98bfa31fc2675c9cd8143a..f287c4529cb44360b2f25a5d8f922fc652033472
--- a/src/vtt/offers/party-threat-catalog.ts
+++ b/src/vtt/offers/party-threat-catalog.ts
@@ -1,7 +1,11 @@
-import { canonicalJson } from '../../commands/canonical-json';
 import { combatantId, type CombatantId } from '../../combat/values';
-import { sha256 } from '../../crypto/sha256';
 import { abilities, type Ability } from '../../domain/enums';
+import {
+  deepFreeze,
+  digestBody,
+  exactKeys,
+  PARTY_THREAT_CATALOG_FORMAT,
+} from './offer-codec-primitives';
 
 export type PartyThreatRange =
   | { readonly kind: 'melee'; readonly reachFeet: number }
@@ -35,12 +39,12 @@
 
 export type PartyThreatCatalogBody =
   | {
-      readonly format: 'party-threat-catalog-v1';
+      readonly format: typeof PARTY_THREAT_CATALOG_FORMAT;
       readonly representation: 'unrepresented';
       readonly entries: readonly [];
     }
   | {
-      readonly format: 'party-threat-catalog-v1';
+      readonly format: typeof PARTY_THREAT_CATALOG_FORMAT;
       readonly representation: 'represented';
       readonly entries: readonly PartyThreatCatalogEntry[];
     };
@@ -52,18 +56,6 @@
     throw new TypeError(`${label} must be an object.`);
   }
   return value as Readonly<Record<string, unknown>>;
-}
-
-function exactKeys(
-  value: Readonly<Record<string, unknown>>,
-  keys: readonly string[],
-  label: string,
-): void {
-  const actual = Object.keys(value).sort();
-  const expected = [...keys].sort();
-  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
-    throw new TypeError(`${label} has an invalid shape.`);
-  }
 }
 
 function boundedText(value: unknown, label: string): string {
@@ -163,20 +155,10 @@
   return `${entry.attackerId}\u0000${entry.sourceId}`;
 }
 
-function digestBody(body: PartyThreatCatalogBody): string {
-  return sha256(canonicalJson(body));
-}
-
-function deepFreeze<T>(value: T): T {
-  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value;
-  for (const nested of Object.values(value)) deepFreeze(nested);
-  return Object.freeze(value);
-}
-
 export function decodePartyThreatCatalog(value: unknown): PartyThreatCatalog {
   const catalog = record(value, 'party threat catalog');
   exactKeys(catalog, ['format', 'representation', 'entries', 'digest'], 'party threat catalog');
-  if (catalog['format'] !== 'party-threat-catalog-v1' ||
+  if (catalog['format'] !== PARTY_THREAT_CATALOG_FORMAT ||
     (catalog['representation'] !== 'unrepresented' && catalog['representation'] !== 'represented') ||
     !Array.isArray(catalog['entries']) || typeof catalog['digest'] !== 'string' ||
     !/^[0-9a-f]{64}$/u.test(catalog['digest'])) {
@@ -194,8 +176,8 @@
     throw new TypeError('Party threat catalog entries must be unique and canonically ordered.');
   }
   const body: PartyThreatCatalogBody = catalog['representation'] === 'unrepresented'
-    ? { format: 'party-threat-catalog-v1', representation: 'unrepresented', entries: [] }
-    : { format: 'party-threat-catalog-v1', representation: 'represented', entries };
+    ? { format: PARTY_THREAT_CATALOG_FORMAT, representation: 'unrepresented', entries: [] }
+    : { format: PARTY_THREAT_CATALOG_FORMAT, representation: 'represented', entries };
   if (catalog['digest'] !== digestBody(body)) {
     throw new TypeError('Party threat catalog digest is invalid.');
   }
@@ -208,7 +190,7 @@
 
 export function createUnrepresentedPartyThreatCatalog(): PartyThreatCatalog {
   return createPartyThreatCatalog({
-    format: 'party-threat-catalog-v1',
+    format: PARTY_THREAT_CATALOG_FORMAT,
     representation: 'unrepresented',
     entries: [],
   });
diff --git a/tests/unit/tools/ai-dm-legacy-invariance.test.ts b/tests/unit/tools/ai-dm-legacy-invariance.test.ts
index b9e2ee4ecc59288dcf206872fdd3f07943a78f6d..3d3f4d0d5e9aec62a28a79ad8faed9d9950fdc92
--- a/tests/unit/tools/ai-dm-legacy-invariance.test.ts
+++ b/tests/unit/tools/ai-dm-legacy-invariance.test.ts
@@ -36,6 +36,11 @@
   loadArenaFixture,
 } from '../../../src/vtt/mcp/entrypoint';
 import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
+import {
+  ENGINE_OFFER_FAMILY_POLICY_FORMAT,
+  ENGINE_OPTION_ENVIRONMENT_FORMAT,
+  PARTY_THREAT_CATALOG_FORMAT,
+} from '../../../src/vtt/offers/offer-codec-primitives';
 import type { EngineStateCapsule } from '../../../src/vtt/engine-state-capsule';
 import {
   captureLegacyRunnerComponents,
@@ -663,14 +668,14 @@
   const familyPolicy = record(environment['familyPolicy'], `${label}.familyPolicy`);
   const partyThreatCatalog = record(environment['partyThreatCatalog'], `${label}.partyThreatCatalog`);
   const familyBody = {
-    format: 'engine-offer-family-policy-v1',
+    format: ENGINE_OFFER_FAMILY_POLICY_FORMAT,
     helpAttack: 'disabled',
     readyAttack: 'disabled',
     unarmedControl: 'disabled',
     reposition: 'disabled',
   };
   const catalogBody = {
-    format: 'party-threat-catalog-v1',
+    format: PARTY_THREAT_CATALOG_FORMAT,
     representation: 'unrepresented',
     entries: [],
   };
@@ -687,7 +692,7 @@
   expect(partyThreatCatalog['digest'], `${label} party-threat catalog replacement pin`)
     .toBe(ACCEPTED_IDENTITY_PINS.partyThreatCatalogDigest);
   const environmentBody = {
-    format: 'engine-option-environment-v1',
+    format: ENGINE_OPTION_ENVIRONMENT_FORMAT,
     mode: 'legacy_standard',
     familyPolicy,
     partyThreatCatalog,
diff --git a/tests/unit/tools/engine-mcp-server.test.ts b/tests/unit/tools/engine-mcp-server.test.ts
index 26e6c10ba4490443d6a5022d022ebfe09985c0f0..8cbaaa79efa3eda0a5e15e961dbeb87e9e7eb26c
--- a/tests/unit/tools/engine-mcp-server.test.ts
+++ b/tests/unit/tools/engine-mcp-server.test.ts
@@ -30,6 +30,7 @@
 import { blindStatblockFacts } from '../../../src/vtt/blind-turn-context';
 import { createOptionPathFixtureEncounter } from '../../fixtures/vtt-option-path-encounter';
 import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
+import { ENGINE_OFFER_FAMILY_POLICY_FORMAT } from '../../../src/vtt/offers/offer-codec-primitives';
 import { createEngineOfferFamilyPolicy } from '../../../src/vtt/offers/offer-environment';
 import { createUnrepresentedPartyThreatCatalog } from '../../../src/vtt/offers/party-threat-catalog';
 
@@ -38,7 +39,7 @@
   kind: 'configuration',
   mode: 'revision_bound',
   familyPolicy: createEngineOfferFamilyPolicy({
-    format: 'engine-offer-family-policy-v1',
+    format: ENGINE_OFFER_FAMILY_POLICY_FORMAT,
     helpAttack: 'enabled',
     readyAttack: 'disabled',
     unarmedControl: 'disabled',
diff --git a/tests/unit/vtt/blind-intent-resolver.test.ts b/tests/unit/vtt/blind-intent-resolver.test.ts
index db0a7bf564576e0971cdece8ab69a533ff001c19..75f576e6d3eaa44aa66700258e385a4721e82938
--- a/tests/unit/vtt/blind-intent-resolver.test.ts
+++ b/tests/unit/vtt/blind-intent-resolver.test.ts
@@ -53,6 +53,7 @@
   buildOfferEnvironment,
   type EngineOptionEnvironment,
 } from '../../../src/vtt/offers/build-offer-environment';
+import { ENGINE_OFFER_FAMILY_POLICY_FORMAT } from '../../../src/vtt/offers/offer-codec-primitives';
 import { createEngineOfferFamilyPolicy } from '../../../src/vtt/offers/offer-environment';
 import { createUnrepresentedPartyThreatCatalog } from '../../../src/vtt/offers/party-threat-catalog';
 
@@ -62,7 +63,7 @@
   kind: 'configuration',
   mode: 'revision_bound',
   familyPolicy: createEngineOfferFamilyPolicy({
-    format: 'engine-offer-family-policy-v1',
+    format: ENGINE_OFFER_FAMILY_POLICY_FORMAT,
     helpAttack: 'enabled',
     readyAttack: 'disabled',
     unarmedControl: 'disabled',
diff --git a/tests/unit/vtt/offer-environment-board-sequence.test.ts b/tests/unit/vtt/offer-environment-board-sequence.test.ts
index 9541bc7c1f6070825d8917a47dac57bb1e81c07e..f646ff51dacb38cf6bd84f0ee06cf0b5fbbbcf32
--- a/tests/unit/vtt/offer-environment-board-sequence.test.ts
+++ b/tests/unit/vtt/offer-environment-board-sequence.test.ts
@@ -3,6 +3,7 @@
 import { projectDmBoard } from '../../../src/vtt/encounter-projections';
 import { resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
 import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
+import { ENGINE_OFFER_FAMILY_POLICY_FORMAT } from '../../../src/vtt/offers/offer-codec-primitives';
 import { createEngineOfferFamilyPolicy } from '../../../src/vtt/offers/offer-environment';
 import { createUnrepresentedPartyThreatCatalog } from '../../../src/vtt/offers/party-threat-catalog';
 import {
@@ -43,7 +44,7 @@
       kind: 'configuration',
       mode: 'revision_bound',
       familyPolicy: createEngineOfferFamilyPolicy({
-        format: 'engine-offer-family-policy-v1',
+        format: ENGINE_OFFER_FAMILY_POLICY_FORMAT,
         helpAttack: 'enabled',
         readyAttack: 'disabled',
         unarmedControl: 'disabled',
diff --git a/tests/unit/vtt/offer-environment-identity.test.ts b/tests/unit/vtt/offer-environment-identity.test.ts
index a3f9e523fe46d293c2a4c5cec5477df6d8170a52..fae1599b7eecc0d72fe669a1e4ee710d3de6133d
--- a/tests/unit/vtt/offer-environment-identity.test.ts
+++ b/tests/unit/vtt/offer-environment-identity.test.ts
@@ -13,6 +13,7 @@
 import { scoreTeamPlans } from '../../../src/vtt/intel/team-scorer';
 import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
 import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
+import { ENGINE_OFFER_FAMILY_POLICY_FORMAT } from '../../../src/vtt/offers/offer-codec-primitives';
 import { createEngineOfferFamilyPolicy } from '../../../src/vtt/offers/offer-environment';
 import { createUnrepresentedPartyThreatCatalog } from '../../../src/vtt/offers/party-threat-catalog';
 import {
@@ -42,7 +43,7 @@
     kind: 'configuration',
     mode: 'revision_bound',
     familyPolicy: createEngineOfferFamilyPolicy({
-      format: 'engine-offer-family-policy-v1',
+      format: ENGINE_OFFER_FAMILY_POLICY_FORMAT,
       helpAttack,
       readyAttack: 'disabled',
       unarmedControl: 'disabled',
diff --git a/tests/unit/vtt/offer-environment.test.ts b/tests/unit/vtt/offer-environment.test.ts
index b54d43fa4d0cf0bc6e60d17449bbe329e4cf1780..a39e57b9ac6c3e68d5fe65077707ef33210ca0f1
--- a/tests/unit/vtt/offer-environment.test.ts
+++ b/tests/unit/vtt/offer-environment.test.ts
@@ -22,6 +22,7 @@
   buildOfferEnvironment,
   type EngineOptionEnvironment,
 } from '../../../src/vtt/offers/build-offer-environment';
+import { PARTY_THREAT_CATALOG_FORMAT } from '../../../src/vtt/offers/offer-codec-primitives';
 import { ENGINE_OFFER_CAPABILITIES } from '../../../src/vtt/offers/offer-generator-registry';
 import { createPartyThreatCatalog } from '../../../src/vtt/offers/party-threat-catalog';
 import {

tokens used
6,059,916
Implemented B15 across exactly the 13 authorized files.

### Changes

- Added `offer-codec-primitives.ts` containing the sole three format constants plus shared `digestBody`, `deepFreeze`, and `exactKeys`.
- Replaced every raw offer-format tag outside those constant initializers.
- Removed:
  - `EngineOptionEnvironment` structural interface.
  - `engineOptionEnvironmentFromBinding` (old line 152).
  - `createEngineOptionEnvironment` (old line 159).
  - `createLegacyEngineOptionEnvironment` (old line 182).
  - `createRevisionBoundEngineOptionEnvironment` (old line 195).
  - `reconstructLauncherOfferEnvironment` (old entrypoint line 1079).
- Inlined launcher reconstruction through `buildOfferEnvironment`.
- Reduced the architecture runtime allowlist from builder plus five transitional exports to `buildOfferEnvironment` only.
- Activated all 31 contracted-surface fixtures and four format fixtures in unqualified self-test mode.
- Enabled repository-wide canonical-origin and raw-format enforcement.
- Changed the ast-grep rule from `severity: off` to `severity: error`.
- Batched real-symbol self-test compilation without reducing fixture coverage.

The three D617.31 files received import/tag substitutions only.

### Pristine hashes

| File | Pristine SHA-256 |
|---|---|
| `offer-environment.ts` | `59c99176bfe6ebcc7547127ad2e28cfa99f1482561b4a079d4f3afbd74f46712` |
| `entrypoint.ts` | `9826cea6be1e55a4fce87597d126a32c9fae9f451cda8558ed4d4bb5cf67a650` |
| ast-grep rule | `9afb96a9a84974aca705f61afb8135f1ddc48049e1e0d3a4b4cb59ab20b5ce98` |
| architecture checker | `f3bc27683fb20e9b76c98c38c118b91277b740835005bfa9a17c4ac6d25714cb` |
| `offer-codec-primitives.ts` | new |
| `party-threat-catalog.ts` | `5dc61fb830cf02cb6e91b5f8c1855b8dae9ea23e5a41ee0e6fae73681166c258` |
| builder | `87414b77c4254b6411171c7c22865b9028b4a92634ea957482ac9cc344ee2a51` |
| `offer-environment.test.ts` | `628bbb31d4eb198774cf4293042a3bd55340d484932f62d0229c3fd23ddc38ff` |
| identity test | `4ee6331fc23e8c4e1c6fbad9c58f64b006e02a0ad0ebc3e4d2e34edacc4a8de9` |
| legacy-invariance test | `d057d0e7d588717891e8ef67be19aefee35c0619f40a7f87a5174fa10330d177` |
| engine-MCP-server test | `76defb9d842b11e5ccc6a1e33637fc0297bc8fa5f4b7c57ae3901ab1c6ebf65f` |
| blind-resolver test | `4cf19f7ddb93853f1b09923218acfb934c8e81fc752f4abd83437e0796350de7` |
| board-sequence test | `27e81cae8f94651174f5f9bbadd90040e8e80cafd365e21682d18c6f2acf9dd3` |

### Digest preservation

No hard-coded digest, legacy ID, proposal ID, hash, cursor, or option-ID line changed.

Preserved environment pins:

- Disabled policy: `a1572528052c75afbc8578372ed8307b1a982afc77a1d71b5c908a1b8a5ee28a`
- Unrepresented catalog: `0a892f9afb0bb2c0a6017de582b6756b1c604e57c816c91682feee1835d12d57`
- Legacy environment: `fb1c39f00b4caeea7c5ad92af428132e1f3cb6c44a61a59ba6551d22c90c275b`
- Represented catalog: `31cec41a1f02589bb6c653877dc684f18ede160f882cee5f69e39961bde67061`
- Represented environment: `0fd2d8c790331e2e4bc6a622dda69569607b3d7d5d8b3487e26f8d59aa311074`
- Revision board environment: `e93555826672102b37c9bcb16d53f743cffa90134c037ec015d5828e3ea1d3a2`
- All five `option:41:*` parent IDs remained unchanged.
- All accepted/frozen legacy-invariance capsule, authorization, proposal, session, advice, and cursor pins remained unchanged.

### Mutant proofs

| Mutant | Before → mutant → restored | Killing output |
|---|---|---|
| Canonical blind re-import | `580dffd5…` → `168d9e4f…` → `580dffd5…` | Checker rejected lines 25 and 709; ast-grep reported two errors. |
| Canonical legendary re-import | `8f83888a…` → `5a632b44…` → `8f83888a…` | Checker rejected lines 11 and 208; ast-grep reported two errors. |
| SECOND_ENV_BUILDER | `83e1e6f6…` → `f33f690e…` → `83e1e6f6…` | “runtime exports must be exactly buildOfferEnvironment” and forbidden exported constructor. |
| FORGED_BRAND | `83e1e6f6…` → `eb238233…` → `83e1e6f6…` | `SPREAD unexpectedly compiled`; `CAST unexpectedly compiled`. |
| Alias/re-export | `0fb7e21e…` → `b9768f01…` → `0fb7e21e…` | Exported runtime constructor and builder re-export both rejected. |
| LEGACY_FACTORY_IMPORT | `8f8a17fd…` → `ae0a278a…` → `8f8a17fd…` | Ast-grep error plus TS2724: deleted export does not exist. |
| OFFERS_FORMAT_TAG_RETYPED | `8f8a17fd…` → `c6963e5b…` → `8f8a17fd…` | `raw offer format tag party-threat-catalog-v1 is forbidden`. |
| Missing builder dependency | `83e1e6f6…` → `df944319…` → `83e1e6f6…` | “builder must export one required input parameter”. |

Format fixture diagnostics:

```text
offers-format-env-retyped.ts=1
offers-format-policy-retyped.ts=1
offers-format-catalog-retyped.ts=1
offers-format-imported.ts=0
```

### Final verification

Exact TypeScript commands:

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
exit 0, zero diagnostics

node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
exit 0, zero diagnostics
```

`node scripts/check-command-outcomes.mjs` exited 0. Last lines:

```text
offers format probes: offers-format-env-retyped.ts=1, offers-format-policy-retyped.ts=1, offers-format-catalog-retyped.ts=1, offers-format-imported.ts=0
offer-environment architecture: 1622 TypeScript files checked
runtime export allowlist: buildOfferEnvironment only
```

Unqualified self-test:

```text
offer-environment architecture self-test: 74 active fixtures passed
required-surfaces:11, resolver:6, final-query:14
```

Ast-grep:

```text
npx sg scan --config sgconfig.yml src tools tests
exit 0

npx sg test --skip-snapshot-tests --test-dir ast-grep-tests
1 passed; 0 failed
```

Focused suites:

| Suite | Tests |
|---|---:|
| offer-environment | 17 |
| offer-environment-identity | 3 |
| offer-environment-board-sequence | 1 |
| ai-dm-legacy-invariance | 10 |
| engine-mcp-server | 15 |
| legendary-windows | 6 |
| blind-intent-resolver | 13 |
| speculative-planning | 23 |
| handoff-bootstrap | 5 |
| handoff-contract | 5 |
| handoff-examples | 6 |
| handoff-package-contract | 1 |
| handoff-publish | 6 |
| handoff-report | 49 |
| **Total** | **160 passed** |

The unchanged B16-pending profile remains 146 failed / 154 passed / 19 skipped. Direct targeted execution reconfirmed all ten initiating assertions expect equal-binding rejection but receive valid acceptance; no B15 assertion was changed.

Forward-contraction overlay:

```text
providerEdits=66 removedFactories=4
outsideCallerManifest=0
```

All eleven TypeScript manifest files reported zero diagnostics; the YAML and MJS files are not CompilerHost inputs.

Additional checks:

```text
git diff --check
exit 0

npx vitest list --configLoader runner --filesOnly --json
643 files
```

Residual checks found:

- only the three raw tag initializers in `offer-codec-primitives.ts`;
- no deleted runtime factory/wrapper references;
- no old structural `EngineOptionEnvironment` export/import;
- no canonical singleton references introduced.

All added lines are ≤120 characters. Maximum added-line length was 108; every changed file had `over120=0`.

Frozen hashes:

```text
package-lock.json  26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867
contracts.ts       0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1
plan               fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4
```

Final status contains exactly the thirteen authorized files: twelve modified and the new `offer-codec-primitives.ts`.

S3 B15 DONE
