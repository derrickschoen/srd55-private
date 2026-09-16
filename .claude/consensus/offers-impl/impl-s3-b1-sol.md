# OFFERS-IMPL-S3-BUILDER B1 — gpt-5.6-sol report

Session 01a0a1ea-3942-7623-b93d-c1ab08d0c4b2; log .tmp/runs/fanout/impl-s3-b1.log. Supervisor verification .tmp/runs/verify-s3-b1.log, summarised in loop-log.md.

Implemented B1 only. Exactly the ten authorized files changed; no git writes, model calls, full gate, full suite, build, Playwright, or port 4173 use occurred.

## Changes

| File | Summary |
|---|---|
| `src/vtt/offers/build-offer-environment.ts` | Added the sole builder, module-private `RuntimeOfferEnvironment`, real `#brand`, canonical queries, strict input validation, immutable runtime instances. |
| `src/vtt/offers/offer-environment.ts` | Retained the four transitional runtime exports but routed all environment construction through the builder. |
| `tests/unit/vtt/offer-environment.test.ts` | Migrated construction/reconstruction to builder inputs; added exact validation and codec tests. |
| `tests/unit/vtt/offer-environment-identity.test.ts` | Migrated revision-bound environments to builder inputs. |
| `tests/unit/vtt/offer-environment-board-sequence.test.ts` | Migrated legacy environment creation to the builder. |
| `ast-grep-rules/no-alternative-offer-environment-construction.yml` | Added staged `severity: off` architecture rule. |
| `ast-grep-tests/no-alternative-offer-environment-construction-test.yml` | Added valid/invalid syntax fixtures. |
| `scripts/check-offer-environment-architecture.mjs` | Added production symbol scan, private-brand fixtures, exported-builder checks, all nine named CJS/ESM origin fixtures, and staged real-symbol fixtures. |
| `scripts/check-command-outcomes.sh` | Widened scan to `src tools tests`; added ast-grep fixtures and both architecture modes. |
| `package.json` | Prefixed `test:gate` with `scripts/check-command-outcomes.sh`. |

CJS tracking is active, not pending. Active fixtures include all nine plan-named CJS/ESM cases. Staged real-symbol groups contain 11 required-surface, 6 resolver, and 14 final-query fixtures.

## Pristine and final SHA-256

| File | Pristine | Final |
|---|---|---|
| `package.json` | `a0a539686c4faf6f4e638d13569030e1eba6e678784e7cd4cef88d37b9fd220a` | `6099e28425b3de42b2fb986126ec171115ddb047f98723553e1bc63f3977c41d` |
| `scripts/check-command-outcomes.sh` | `66efb8ab998962ffc7da008872534be6c393144b1a60b23a0c75f0f3b162ffa8` | `7bd2768b457fd1f0a69cba591aff70ae13b4b7f82be760ba984555d4fb13568d` |
| `src/vtt/offers/offer-environment.ts` | `0b1d2f9e86bb15864fa49241af248bcfe8f334e653506160edc01a42186578ae` | `59c99176bfe6ebcc7547127ad2e28cfa99f1482561b4a079d4f3afbd74f46712` |
| `offer-environment.test.ts` | `7b3dbcc0084cd0101be2222ebd6600e0f59cbd2a9eda3ab9676899bfcbb4f174` | `9737cf091b02fdc43e17a4072f49460839ace8bbbb02cf2e86548e862181d726` |
| `offer-environment-identity.test.ts` | `a869b746ca55cf1a390dc5559e0159feb16d89a7f1d9c0aa2e6e94fa7e879fd1` | `80b8899fa36996668d7f32b000097fea5dbcc6528101228ca2d974d895f10def` |
| `offer-environment-board-sequence.test.ts` | `36cb1128a5ee241b2c80b4e0373a7b2b6d34d331dce4d77c283d4319bfa1383d` | `ee6e6a1f23fb292b44edae215196c68945572c761eff1dfef7755c46d1ba6211` |
| `build-offer-environment.ts` | absent | `87414b77c4254b6411171c7c22865b9028b4a92634ea957482ac9cc344ee2a51` |
| ast-grep rule | absent | `9afb96a9a84974aca705f61afb8135f1ddc48049e1e0d3a4b4cb59ab20b5ce98` |
| ast-grep fixtures | absent | `e7e1354110d475a9d7588a663fd6271d19dbcb3d3792dfddb8f949d8ecc165be` |
| architecture script | absent | `9004ff5a76628b1686d4a5ad10425a9193d852fa0029375ed8d1692615ed06c8` |

## Pins unchanged

All values are byte-identical before/after:

| Pin | Before and after |
|---|---|
| Disabled policy | `a1572528052c75afbc8578372ed8307b1a982afc77a1d71b5c908a1b8a5ee28a` |
| Unrepresented catalog | `0a892f9afb0bb2c0a6017de582b6756b1c604e57c816c91682feee1835d12d57` |
| Legacy environment | `fb1c39f00b4caeea7c5ad92af428132e1f3cb6c44a61a59ba6551d22c90c275b` |
| Represented catalog | `31cec41a1f02589bb6c653877dc684f18ede160f882cee5f69e39961bde67061` |
| Represented environment | `0fd2d8c790331e2e4bc6a622dda69569607b3d7d5d8b3487e26f8d59aa311074` |

Legacy IDs before/after:

```text
option:41:8026ca8a32f777ff915fee76e8cfd22407960121872d013c
option:41:51155a2bdb36fd6034ba73d92ae9da75fe9a819cc648c434
option:41:e1b9aed03111f06f1167f0d6aae4bbb800ac31ca5e187f34
option:41:c93d5934b840c50f12437a00fe29324a4678c99932e6cdd6
option:41:54bc820030b0ca978335e4eaee4c3a7fe40cf02f20ab11d7
```

## Mutation evidence

Every mutation targeted production code, was SHA-proven, killed, then restored with `cp` to:

`87414b77c4254b6411171c7c22865b9028b4a92634ea957482ac9cc344ee2a51`

| Mutant | Applied SHA | Killing command and failure |
|---|---|---|
| `SECOND_ENV_BUILDER` | `3b45567f9c454e81930f8f2b367da680ec3ac2b2d27fb47cc3220cf434ec1a25` | `node scripts/check-offer-environment-architecture.mjs` → `secondOfferEnvironmentBuilder: exported runtime environment constructor is forbidden` |
| `MALFORMED_BINDING` | `7f9133db4e3c6d173f6a91f0a47c39b33bc2611543c6804c60a2b8dc6d53dfbd` | Focused environment suite → `expected function to throw an error, but it didn't`; 2 failed, 5 passed. |
| `FORGED_BRAND` | `ed94603852b68c11849b4651fa7e0e4a783aced1d4a388b4c18c2ec6b56301f6` | Architecture self-test rejected: `OBJECT_LITERAL`, `SPREAD`, `CAST`, and `EXTERNAL_NEW` unexpectedly compiled. |
| `QUERY_INJECTION` | `c12f43e7396b0bc905159802c5dc4f5cd298f611341657cb50be102e368e0852` | Focused environment suite → query-injection assertion `expected function to throw an error, but it didn't`; 2 failed, 5 passed. |

## Final green

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
exit 0, zero diagnostics

node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
exit 0, zero diagnostics

sg scan --config sgconfig.yml src tools tests
exit 0, zero findings

sg test --config sgconfig.yml --test-dir ast-grep-tests --skip-snapshot-tests --include-off
exit 0, 1 passed, 0 failed

node scripts/check-offer-environment-architecture.mjs --self-test
exit 0, 28 active fixtures passed

node scripts/check-offer-environment-architecture.mjs
exit 0, 1,621 TypeScript files checked
builder plus exactly five transitional factories/wrappers

npx vitest run --configLoader runner tests/unit/vtt/offer-environment.test.ts \
  tests/unit/vtt/offer-environment-identity.test.ts \
  tests/unit/vtt/offer-environment-board-sequence.test.ts
exit 0, 3 files passed, 12 tests passed

git diff --check
exit 0

npx vitest list --configLoader runner --filesOnly --json > /tmp/s3-b1-after.json
exit 0, 643 rows, 643 unique paths
baseline 643; delta 0; newly added/renamed specs: none
```

Hashes:

```text
package-lock.json
26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867

src/vtt/intel/contracts.ts
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1

frozen plan
fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4
```

## Line metrics

| File | Max | Lines >120 |
|---|---:|---:|
| `package.json` | 223 | 4, all pre-existing JSON string literals |
| `scripts/check-command-outcomes.sh` | 91 | 0 |
| `offer-environment.ts` | 118 | 0 |
| `offer-environment-board-sequence.test.ts` | 98 | 0 |
| `offer-environment-identity.test.ts` | 101 | 0 |
| `offer-environment.test.ts` | 115 | 0 |
| ast-grep rule | 81 | 0 |
| ast-grep fixtures | 97 | 0 |
| architecture script | 116 | 0 |
| builder | 94 | 0 |

Final `git status --short --untracked-files=all` contains exactly the ten B1 files:

```text
 M package.json
 M scripts/check-command-outcomes.sh
 M src/vtt/offers/offer-environment.ts
 M tests/unit/vtt/offer-environment-board-sequence.test.ts
 M tests/unit/vtt/offer-environment-identity.test.ts
 M tests/unit/vtt/offer-environment.test.ts
?? ast-grep-rules/no-alternative-offer-environment-construction.yml
?? ast-grep-tests/no-alternative-offer-environment-construction-test.yml
?? scripts/check-offer-environment-architecture.mjs
?? src/vtt/offers/build-offer-environment.ts
```

S3 B1 DONE
diff --git a/ast-grep-rules/no-alternative-offer-environment-construction.yml b/ast-grep-rules/no-alternative-offer-environment-construction.yml
new file mode 100644
index 0000000000000000000000000000000000000000..3a5bbecfab297c38c3fba2ebd81175bb03d4a63e
--- /dev/null
+++ b/ast-grep-rules/no-alternative-offer-environment-construction.yml
@@ -0,0 +1,23 @@
+id: no-alternative-offer-environment-construction
+language: TypeScript
+severity: off
+message: Construct runtime offer environments only through buildOfferEnvironment.
+files:
+  - src/**/*.ts
+  - tools/**/*.ts
+  - tests/**/*.ts
+ignores:
+  - src/vtt/offers/build-offer-environment.ts
+  - src/vtt/engine-query-port.ts
+rule:
+  all:
+    - any:
+        - kind: identifier
+        - kind: property_identifier
+    - any:
+        - regex: ^createEngineOptionEnvironment$
+        - regex: ^createLegacyEngineOptionEnvironment$
+        - regex: ^createRevisionBoundEngineOptionEnvironment$
+        - regex: ^engineOptionEnvironmentFromBinding$
+        - regex: ^reconstructLauncherOfferEnvironment$
+        - regex: ^canonicalEngineQueryPort$
diff --git a/ast-grep-tests/no-alternative-offer-environment-construction-test.yml b/ast-grep-tests/no-alternative-offer-environment-construction-test.yml
new file mode 100644
index 0000000000000000000000000000000000000000..2e2199280d848c21737255500edf70f7d64f0fe3
--- /dev/null
+++ b/ast-grep-tests/no-alternative-offer-environment-construction-test.yml
@@ -0,0 +1,35 @@
+id: no-alternative-offer-environment-construction
+valid:
+  - >-
+    buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+  - >-
+    environment.queries.spaceDistance(state, first, second);
+  - >-
+    import type { EngineQueryPort } from './engine-query-port';
+  - >-
+    decodeEngineOptionEnvironmentBinding(binding);
+  - >-
+    createEngineOptionEnvironmentBinding(body);
+invalid:
+  - >-
+    createEngineOptionEnvironment(input);
+  - >-
+    createLegacyEngineOptionEnvironment(queries);
+  - >-
+    createRevisionBoundEngineOptionEnvironment(queries);
+  - >-
+    engineOptionEnvironmentFromBinding(queries, binding);
+  - >-
+    reconstructLauncherOfferEnvironment(manifest);
+  - >-
+    import { canonicalEngineQueryPort } from './engine-query-port';
+  - >-
+    import { canonicalEngineQueryPort as queries } from './engine-query-port';
+  - >-
+    import * as engineQueries from './engine-query-port'; engineQueries.canonicalEngineQueryPort;
+  - >-
+    canonicalEngineQueryPort.spaceDistance(state, first, second);
+  - >-
+    export { canonicalEngineQueryPort } from './engine-query-port';
+  - >-
+    export { canonicalEngineQueryPort as queries } from './engine-query-port';
diff --git a/package.json b/package.json
index aebcc04efff1b12bb64d8ae9dad77296372d0f8a..518caf0afa583680654d76c2a0f7b70609ecde9d
--- a/package.json
+++ b/package.json
@@ -14,7 +14,7 @@
     "check:command-outcomes": "scripts/check-command-outcomes.sh",
     "typecheck:fast": "tsgo -p tsconfig.app.json --noEmit && tsgo -p tsconfig.node.json --noEmit",
     "test": "vitest run --configLoader runner",
-    "test:gate": "node tools/gate-vitest.mjs",
+    "test:gate": "scripts/check-command-outcomes.sh && node tools/gate-vitest.mjs",
     "test:gate:browser": "node tools/gate-playwright.mjs",
     "test:affected": "node scripts/test-affected.mjs",
     "heldout:guard": "node --experimental-strip-types tools/heldout-leak-check.ts",
diff --git a/scripts/check-command-outcomes.sh b/scripts/check-command-outcomes.sh
index 32d11ec607e2e3a7458cbe1fb6a208396af8b02e..a17f07b81b5de1fff954a178855ee26d6423f2c8
--- a/scripts/check-command-outcomes.sh
+++ b/scripts/check-command-outcomes.sh
@@ -1,4 +1,7 @@
 #!/usr/bin/env bash
 set -euo pipefail
 
-sg scan --config sgconfig.yml src
+sg scan --config sgconfig.yml src tools tests
+sg test --config sgconfig.yml --test-dir ast-grep-tests --skip-snapshot-tests --include-off
+node scripts/check-offer-environment-architecture.mjs --self-test
+node scripts/check-offer-environment-architecture.mjs
diff --git a/scripts/check-offer-environment-architecture.mjs b/scripts/check-offer-environment-architecture.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..db33d44daba77b309d8984438326655593572f13
--- /dev/null
+++ b/scripts/check-offer-environment-architecture.mjs
@@ -0,0 +1,846 @@
+#!/usr/bin/env node
+
+import path from 'node:path';
+import process from 'node:process';
+import ts from 'typescript';
+
+const ROOT = process.cwd();
+const BUILDER_PATH = 'src/vtt/offers/build-offer-environment.ts';
+const QUERY_PORT_PATH = 'src/vtt/engine-query-port.ts';
+const ENVIRONMENT_PROPERTIES = [
+  'queries',
+  'familyPolicy',
+  'partyThreatCatalog',
+  'binding',
+  'digest',
+];
+const TRANSITIONAL_RUNTIME_EXPORTS = new Set([
+  `${BUILDER_PATH}:buildOfferEnvironment`,
+  'src/vtt/offers/offer-environment.ts:createEngineOptionEnvironment',
+  'src/vtt/offers/offer-environment.ts:createLegacyEngineOptionEnvironment',
+  'src/vtt/offers/offer-environment.ts:createRevisionBoundEngineOptionEnvironment',
+  'src/vtt/offers/offer-environment.ts:engineOptionEnvironmentFromBinding',
+  'src/vtt/mcp/entrypoint.ts:reconstructLauncherOfferEnvironment',
+]);
+const ACTIVE_CJS_ORIGIN_FIXTURES = [
+  'canonical-require-direct.cts',
+  'canonical-require-destructured.cts',
+  'canonical-create-require-computed.mts',
+  'canonical-require-computed.cts',
+  'canonical-import-equals.cts',
+  'canonical-commonjs-reexport.cts',
+  'canonical-commonjs-named-reexport.cts',
+  'canonical-dynamic-import.mts',
+  'canonical-star-export.mts',
+];
+const STAGED_REAL_SYMBOL_FIXTURES = Object.freeze({
+  'required-surfaces': [
+    constructorFixture(
+      'round-session-missing-environment.ts',
+      'src/vtt/engine-round-session',
+      'EngineRoundSession',
+      'args[0], args[1], args[2]',
+    ),
+    constructorOptionsFixture(
+      'dm-host-missing-environment.ts',
+      'src/vtt/dm-encounter-host',
+      'DmEncounterHost',
+      2,
+      'args[0], args[1], withoutEnvironment',
+    ),
+    callFixture(
+      'human-options-missing-environment.ts',
+      'src/vtt/encounter-board-projection',
+      'projectHumanEngineOptions',
+      'args[0], args[1], args[2]',
+    ),
+    propertyFixture(
+      'dm-projector-missing-environment.ts',
+      'src/vtt/encounter-projections',
+      'projectDmBoard',
+      0,
+      'withoutEnvironment',
+    ),
+    callFixture(
+      'offered-actors-missing-environment.ts',
+      'src/vtt/offered-option-paths',
+      'offeredOptionActorsForState',
+      'args[0], args[1]',
+    ),
+    callFixture(
+      'offered-paths-missing-environment.ts',
+      'src/vtt/offered-option-paths',
+      'offeredOptionPaths',
+      'args[0], args[1]',
+    ),
+    propertyFixture(
+      'mcp-runtime-missing-environment.ts',
+      'src/vtt/mcp/entrypoint',
+      'createEngineMcpRuntime',
+      1,
+      'args[0], withoutEnvironment',
+    ),
+    callFixture(
+      'mcp-handler-missing-environment.ts',
+      'src/vtt/mcp/entrypoint',
+      'createEngineMcpHandler',
+      'args[0]',
+    ),
+    callFixture(
+      'mcp-request-missing-environment.ts',
+      'src/vtt/mcp/entrypoint',
+      'handleMcpRequest',
+      'args[0], args[1]',
+    ),
+    callFixture(
+      'mcp-server-missing-environment.ts',
+      'src/vtt/mcp/entrypoint',
+      'runEngineMcpServer',
+      'args[0]',
+    ),
+    callFixture(
+      'mcp-lines-missing-environment.ts',
+      'src/vtt/mcp/entrypoint',
+      'runEngineMcpLines',
+      'args[0], args[1]',
+    ),
+  ],
+  resolver: [
+    callFixture(
+      'available-options-missing-environment.ts',
+      'src/vtt/intent-resolver',
+      'availableEngineActorOptions',
+      'args[0], args[1]',
+    ),
+    callFixture(
+      'resolver-factory-missing-environment.ts',
+      'src/vtt/intent-resolver',
+      'createPureTurnProposalResolver',
+      '',
+    ),
+    propertyFixture(
+      'materiality-context-missing-environment.ts',
+      'src/vtt/plan-materiality',
+      'createPlanRelevanceRecord',
+      0,
+      'withoutEnvironment',
+    ),
+    callFixture(
+      'scenario-menu-missing-environment.ts',
+      'src/vtt/speculative-planning',
+      'buildHostScenarioMenu',
+      'args[0], args[1], args[2]',
+    ),
+    methodFixture(
+      'baseline-planner-missing-environment.ts',
+      'src/vtt/speculative-planning',
+      'hostBaselineProposalPlanner',
+      'plan',
+      'args[0], args[1]',
+    ),
+    callFixture(
+      'team-score-missing-environment.ts',
+      'src/vtt/intel/team-scorer',
+      'scoreTeamPlans',
+      'args[0], args[1]',
+    ),
+  ],
+  'final-query': [
+    callFixture(
+      'scenario-fact-missing-queries.ts',
+      'src/vtt/speculative-planning',
+      'evaluateScenarioFact',
+      'args[0], args[1]',
+    ),
+    callFixture(
+      'proposal-facts-missing-queries.ts',
+      'src/vtt/speculative-planning',
+      'extractProposalFactDependencies',
+      'args[0], args[1]',
+    ),
+    callFixture(
+      'player-flip-missing-queries.ts',
+      'src/vtt/speculative-planning',
+      'canPlayerFlipScenarioFact',
+      'args[0], args[1], args[2]',
+    ),
+    callFixture(
+      'host-split-missing-queries.ts',
+      'src/vtt/speculative-planning',
+      'computeHostSplitCandidates',
+      'args[0], args[1], args[2]',
+    ),
+    callFixture(
+      'host-scenarios-missing-queries.ts',
+      'src/vtt/speculative-planning',
+      'evaluateHostScenarios',
+      'args[0], args[1]',
+    ),
+    callFixture(
+      'allocation-missing-environment.ts',
+      'src/vtt/engine-query-port',
+      'compareTacticalAllocations',
+      'args[0], args[1], args[2], args[3]',
+    ),
+    callFixture(
+      'arena-token-missing-queries.ts',
+      'src/vtt/arena-legality',
+      'arenaTokenPosition',
+      'args[0], args[1]',
+    ),
+    callFixture(
+      'arena-combatant-missing-queries.ts',
+      'src/vtt/arena-legality',
+      'arenaCombatant',
+      'args[0], args[1]',
+    ),
+    callFixture(
+      'arena-side-missing-queries.ts',
+      'src/vtt/arena-legality',
+      'arenaSameSide',
+      'args[0], args[1], args[2]',
+    ),
+    callFixture(
+      'arena-target-missing-queries.ts',
+      'src/vtt/arena-legality',
+      'resolveArenaTarget',
+      'args[0], args[1], args[2]',
+    ),
+    callFixture(
+      'arena-actions-missing-queries.ts',
+      'src/vtt/arena-legality',
+      'arenaMonsterActions',
+      'args[0], args[1]',
+    ),
+    callFixture(
+      'arena-plan-missing-queries.ts',
+      'src/vtt/arena-legality',
+      'validateArenaPlan',
+      'args[0], args[1]',
+    ),
+    propertyFixture(
+      'blind-input-missing-environment.ts',
+      'src/vtt/blind-intent-resolver',
+      'resolveBlindRoundIntents',
+      0,
+      'withoutEnvironment',
+    ),
+    propertyFixture(
+      'legendary-input-missing-queries.ts',
+      'src/vtt/intel/legendary-windows',
+      'provideLegendaryWindows',
+      0,
+      'withoutEnvironment',
+      'queries',
+    ),
+  ],
+});
+const STAGED_FORMAT_FIXTURES = Object.freeze({
+  'offers-format-env-retyped.ts':
+    "export type Retyped = 'engine-option-environment-v1'; // RETYPED\n",
+  'offers-format-policy-retyped.ts':
+    "export type Retyped = 'engine-offer-family-policy-v1'; // RETYPED\n",
+  'offers-format-catalog-retyped.ts':
+    "export type Retyped = 'party-threat-catalog-v1'; // RETYPED\n",
+  'offers-format-imported.ts':
+    "import { ENGINE_OFFER_FAMILY_POLICY_FORMAT, ENGINE_OPTION_ENVIRONMENT_FORMAT, " +
+    "PARTY_THREAT_CATALOG_FORMAT } from '../src/vtt/offers/offer-codec-primitives';\n" +
+    'void ENGINE_OFFER_FAMILY_POLICY_FORMAT;\n' +
+    'void ENGINE_OPTION_ENVIRONMENT_FORMAT;\n' +
+    'void PARTY_THREAT_CATALOG_FORMAT;\n',
+});
+
+function sourceImport(modulePath, symbol) {
+  return `import { ${symbol} } from '../${modulePath}';\n`;
+}
+
+function callFixture(name, modulePath, symbol, omittedArguments) {
+  return {
+    name,
+    source: sourceImport(modulePath, symbol) +
+      `declare const args: Parameters<typeof ${symbol}>;\n` +
+      `${symbol}(${omittedArguments}); // OMITTED\n` +
+      `${symbol}(...args); // SUPPLIED\n`,
+  };
+}
+
+function constructorFixture(name, modulePath, symbol, omittedArguments) {
+  return {
+    name,
+    source: sourceImport(modulePath, symbol) +
+      `declare const args: ConstructorParameters<typeof ${symbol}>;\n` +
+      `new ${symbol}(${omittedArguments}); // OMITTED\n` +
+      `new ${symbol}(...args); // SUPPLIED\n`,
+  };
+}
+
+function propertyFixture(
+  name,
+  modulePath,
+  symbol,
+  parameterIndex,
+  omittedArguments,
+  property = 'offerEnvironment',
+) {
+  return {
+    name,
+    source: sourceImport(modulePath, symbol) +
+      `declare const args: Parameters<typeof ${symbol}>;\n` +
+      `const { ${property}: omitted, ...withoutEnvironment } = args[${String(parameterIndex)}];\n` +
+      'void omitted;\n' +
+      `${symbol}(${omittedArguments}); // OMITTED\n` +
+      `${symbol}(...args); // SUPPLIED\n`,
+  };
+}
+
+function constructorOptionsFixture(
+  name,
+  modulePath,
+  symbol,
+  parameterIndex,
+  omittedArguments,
+) {
+  return {
+    name,
+    source: sourceImport(modulePath, symbol) +
+      `declare const args: ConstructorParameters<typeof ${symbol}>;\n` +
+      `const { offerEnvironment: omitted, ...withoutEnvironment } = args[${String(parameterIndex)}];\n` +
+      'void omitted;\n' +
+      `new ${symbol}(${omittedArguments}); // OMITTED\n` +
+      `new ${symbol}(...args); // SUPPLIED\n`,
+  };
+}
+
+function methodFixture(name, modulePath, symbol, method, omittedArguments) {
+  return {
+    name,
+    source: sourceImport(modulePath, symbol) +
+      `declare const args: Parameters<typeof ${symbol}.${method}>;\n` +
+      `${symbol}.${method}(${omittedArguments}); // OMITTED\n` +
+      `${symbol}.${method}(...args); // SUPPLIED\n`,
+  };
+}
+
+function relative(fileName) {
+  return path.relative(ROOT, fileName).split(path.sep).join('/');
+}
+
+function compilerOptions(configName) {
+  const configPath = path.join(ROOT, configName);
+  const loaded = ts.readConfigFile(configPath, ts.sys.readFile);
+  if (loaded.error !== undefined) {
+    throw new Error(ts.flattenDiagnosticMessageText(loaded.error.messageText, '\n'));
+  }
+  const parsed = ts.parseJsonConfigFileContent(loaded.config, ts.sys, ROOT);
+  return {
+    ...parsed.options,
+    incremental: false,
+    noEmit: true,
+  };
+}
+
+function productionFiles() {
+  return ts.sys.readDirectory(
+    ROOT,
+    ['.ts', '.tsx', '.cts', '.mts'],
+    ['node_modules', '.git'],
+    ['src/**/*', 'tools/**/*', 'tests/**/*'],
+  );
+}
+
+function createProgram(rootNames, options, virtualSources = new Map()) {
+  const normalized = new Map(
+    [...virtualSources].map(([fileName, source]) => [path.resolve(fileName), source]),
+  );
+  const host = ts.createCompilerHost(options);
+  const baseFileExists = host.fileExists.bind(host);
+  const baseReadFile = host.readFile.bind(host);
+  const baseGetSourceFile = host.getSourceFile.bind(host);
+  host.fileExists = (fileName) => normalized.has(path.resolve(fileName)) || baseFileExists(fileName);
+  host.readFile = (fileName) => normalized.get(path.resolve(fileName)) ?? baseReadFile(fileName);
+  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
+    const source = normalized.get(path.resolve(fileName));
+    if (source !== undefined) {
+      return ts.createSourceFile(fileName, source, languageVersion, true);
+    }
+    return baseGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
+  };
+  return ts.createProgram({
+    rootNames,
+    options,
+    host,
+  });
+}
+
+function isEnvironmentType(checker, type) {
+  return ENVIRONMENT_PROPERTIES.every((name) => checker.getPropertyOfType(type, name) !== undefined);
+}
+
+function environmentReturningExport(checker, symbol, sourceFile) {
+  let target = symbol;
+  if ((symbol.flags & ts.SymbolFlags.Alias) !== 0) {
+    target = checker.getAliasedSymbol(symbol);
+  }
+  const declaration = target.valueDeclaration ?? target.declarations?.[0] ?? sourceFile;
+  const type = checker.getTypeOfSymbolAtLocation(target, declaration);
+  const signatures = [
+    ...checker.getSignaturesOfType(type, ts.SignatureKind.Call),
+    ...checker.getSignaturesOfType(type, ts.SignatureKind.Construct),
+  ];
+  return signatures.some((signature) => isEnvironmentType(checker, signature.getReturnType()));
+}
+
+function builderModuleSpecifier(node) {
+  return ts.isStringLiteral(node) && /(?:^|\/)build-offer-environment(?:\.js|\.ts)?$/u.test(node.text);
+}
+
+function queryModuleSpecifier(node) {
+  return ts.isStringLiteral(node) && /(?:^|\/)engine-query-port(?:\.js|\.ts)?$/u.test(node.text);
+}
+
+function exportedEnvironmentDiagnostics(program, sourceFiles, allowlist) {
+  const checker = program.getTypeChecker();
+  const diagnostics = [];
+  for (const sourceFile of sourceFiles) {
+    const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
+    if (moduleSymbol !== undefined) {
+      for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
+        if (!environmentReturningExport(checker, symbol, sourceFile)) continue;
+        const key = `${relative(sourceFile.fileName)}:${symbol.getName()}`;
+        if (!allowlist.has(key)) {
+          diagnostics.push(`${key}: exported runtime environment constructor is forbidden`);
+        }
+      }
+    }
+    for (const statement of sourceFile.statements) {
+      if (ts.isExportDeclaration(statement) &&
+        statement.moduleSpecifier !== undefined &&
+        builderModuleSpecifier(statement.moduleSpecifier) &&
+        relative(sourceFile.fileName) !== BUILDER_PATH) {
+        diagnostics.push(`${relative(sourceFile.fileName)}: re-exporting the environment builder is forbidden`);
+      }
+    }
+  }
+  return diagnostics;
+}
+
+function builderContractDiagnostics(sourceFile) {
+  const diagnostics = [];
+  const classes = sourceFile.statements.filter((statement) =>
+    ts.isClassDeclaration(statement) && statement.name?.text === 'RuntimeOfferEnvironment');
+  const builders = sourceFile.statements.filter((statement) =>
+    ts.isFunctionDeclaration(statement) && statement.name?.text === 'buildOfferEnvironment');
+  if (classes.length !== 1) {
+    diagnostics.push(`${BUILDER_PATH}: expected one module-private RuntimeOfferEnvironment class`);
+    return diagnostics;
+  }
+  const runtimeClass = classes[0];
+  if (runtimeClass === undefined) return diagnostics;
+  const classIsExported = runtimeClass.modifiers?.some((modifier) =>
+    modifier.kind === ts.SyntaxKind.ExportKeyword || modifier.kind === ts.SyntaxKind.DefaultKeyword) ?? false;
+  if (classIsExported) {
+    diagnostics.push(`${BUILDER_PATH}: RuntimeOfferEnvironment must not be exported`);
+  }
+  const brand = runtimeClass.members.find((member) =>
+    ts.isPropertyDeclaration(member) && ts.isPrivateIdentifier(member.name) && member.name.text === '#brand');
+  if (brand === undefined) {
+    diagnostics.push(`${BUILDER_PATH}: RuntimeOfferEnvironment requires a real #brand private field`);
+  }
+  if (builders.length !== 1) {
+    diagnostics.push(`${BUILDER_PATH}: expected exactly one buildOfferEnvironment declaration`);
+  }
+  const builder = builders[0];
+  if (builder !== undefined) {
+    const exported = builder.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
+    if (!exported || builder.parameters.length !== 1 || builder.parameters[0]?.questionToken !== undefined ||
+      builder.parameters[0]?.initializer !== undefined) {
+      diagnostics.push(`${BUILDER_PATH}: builder must export one required input parameter`);
+    }
+  }
+  let canonicalImports = 0;
+  let runtimeConstructions = 0;
+  function visit(node) {
+    if (ts.isImportDeclaration(node) && queryModuleSpecifier(node.moduleSpecifier)) {
+      const bindings = node.importClause?.namedBindings;
+      if (bindings !== undefined && ts.isNamedImports(bindings)) {
+        canonicalImports += bindings.elements.filter((element) =>
+          (element.propertyName ?? element.name).text === 'canonicalEngineQueryPort' && !element.isTypeOnly).length;
+      }
+    }
+    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) &&
+      node.expression.text === 'RuntimeOfferEnvironment') {
+      runtimeConstructions += 1;
+      if (builder === undefined || node.pos < builder.pos || node.end > builder.end) {
+        diagnostics.push(`${BUILDER_PATH}: only buildOfferEnvironment may instantiate the runtime class`);
+      }
+    }
+    ts.forEachChild(node, visit);
+  }
+  visit(sourceFile);
+  if (canonicalImports !== 1) {
+    diagnostics.push(`${BUILDER_PATH}: builder must import the one canonical query port exactly once`);
+  }
+  if (runtimeConstructions !== 3) {
+    diagnostics.push(`${BUILDER_PATH}: each validated builder branch must construct the runtime class directly`);
+  }
+  return diagnostics;
+}
+
+function canonicalOriginDiagnostics(sourceFile, enforcePathAllowances = true) {
+  const fileName = relative(sourceFile.fileName);
+  if (enforcePathAllowances && (fileName === BUILDER_PATH || fileName === QUERY_PORT_PATH)) return [];
+  const diagnostics = [];
+  function report(node, message) {
+    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
+    diagnostics.push(`${fileName}:${position.line + 1}: ${message}`);
+  }
+  function visit(node) {
+    if (ts.isImportDeclaration(node) && queryModuleSpecifier(node.moduleSpecifier)) {
+      const clause = node.importClause;
+      const typeOnly = clause?.isTypeOnly ?? false;
+      const bindings = clause?.namedBindings;
+      const onlyPortType = bindings !== undefined && ts.isNamedImports(bindings) &&
+        bindings.elements.every((element) => element.isTypeOnly &&
+          (element.propertyName ?? element.name).text === 'EngineQueryPort');
+      if (!typeOnly && !onlyPortType) report(node, 'canonical query-port import is forbidden here');
+    }
+    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) &&
+      node.moduleReference.expression !== undefined && queryModuleSpecifier(node.moduleReference.expression)) {
+      report(node, 'import-equals cannot expose the canonical query port');
+    }
+    if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined &&
+      queryModuleSpecifier(node.moduleSpecifier)) {
+      report(node, 'engine-query-port re-export is forbidden');
+    }
+    if (ts.isCallExpression(node) && node.arguments.length > 0) {
+      const first = node.arguments[0];
+      if (first !== undefined && queryModuleSpecifier(first)) {
+        report(node, 'dynamic/CommonJS access to the canonical query port is forbidden');
+      }
+    }
+    if (ts.isIdentifier(node) && node.text === 'canonicalEngineQueryPort' &&
+      !identifierIsTypePosition(node)) {
+      report(node, 'canonical query-port value reference is forbidden here');
+    }
+    ts.forEachChild(node, visit);
+  }
+  visit(sourceFile);
+  return diagnostics;
+}
+
+function identifierIsTypePosition(node) {
+  for (let current = node.parent; current !== undefined; current = current.parent) {
+    if (ts.isTypeNode(current)) return true;
+    if (ts.isStatement(current) || ts.isExpression(current)) return false;
+  }
+  return false;
+}
+
+function compileFixtureProgram(name, source) {
+  const fileName = path.join(ROOT, '.architecture-fixtures', name);
+  const program = createProgram(
+    [fileName],
+    compilerOptions('tsconfig.app.json'),
+    new Map([[fileName, source]]),
+  );
+  return { fileName, program };
+}
+
+function compileFixture(name, source) {
+  const { fileName, program } = compileFixtureProgram(name, source);
+  return ts.getPreEmitDiagnostics(program).filter((diagnostic) => diagnostic.file !== undefined &&
+    path.resolve(diagnostic.file.fileName) === path.resolve(fileName));
+}
+
+function privateBrandAssertionLines(program, sourceFiles) {
+  const checker = program.getTypeChecker();
+  const lines = [];
+  for (const sourceFile of sourceFiles) {
+    function visit(node) {
+      if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
+        const target = checker.getTypeAtLocation(node.type);
+        const hasPrivateBrand = checker.getPropertiesOfType(target).some((property) =>
+          property.declarations?.some((declaration) =>
+            'name' in declaration &&
+            declaration.name !== undefined &&
+            ts.isPrivateIdentifier(declaration.name)) ?? false);
+        if (isEnvironmentType(checker, target) && hasPrivateBrand) {
+          lines.push(sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1);
+        }
+      }
+      ts.forEachChild(node, visit);
+    }
+    visit(sourceFile);
+  }
+  return lines;
+}
+
+function diagnosticLine(diagnostic) {
+  if (diagnostic.file === undefined || diagnostic.start === undefined) return 0;
+  return diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1;
+}
+
+function markerLine(source, marker) {
+  const index = source.split('\n').findIndex((line) => line.includes(`// ${marker}`));
+  if (index < 0) throw new Error(`Missing fixture marker ${marker}.`);
+  return index + 1;
+}
+
+function privateBrandSelfTest() {
+  const source = `
+import {
+  buildOfferEnvironment,
+  type EngineOptionEnvironment,
+} from '../src/vtt/offers/build-offer-environment';
+
+const environment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+const objectLiteral: EngineOptionEnvironment = { // OBJECT_LITERAL
+  queries: environment.queries,
+  familyPolicy: environment.familyPolicy,
+  partyThreatCatalog: environment.partyThreatCatalog,
+  binding: environment.binding,
+  digest: environment.digest,
+};
+const spread: EngineOptionEnvironment = { ...environment }; // SPREAD
+const cast = { ...environment } as EngineOptionEnvironment; // CAST
+class OutsideRuntimeOfferEnvironment implements EngineOptionEnvironment { // EXTERNAL_NEW
+  readonly queries = environment.queries;
+  readonly familyPolicy = environment.familyPolicy;
+  readonly partyThreatCatalog = environment.partyThreatCatalog;
+  readonly binding = environment.binding;
+  readonly digest = environment.digest;
+}
+const outside = new OutsideRuntimeOfferEnvironment();
+void objectLiteral;
+void spread;
+void cast;
+void outside;
+`;
+  const fixture = compileFixtureProgram('private-brand-negative.ts', source);
+  const diagnostics = ts.getPreEmitDiagnostics(fixture.program).filter((diagnostic) =>
+    diagnostic.file !== undefined && path.resolve(diagnostic.file.fileName) === path.resolve(fixture.fileName));
+  const fixtureSource = fixture.program.getSourceFile(fixture.fileName);
+  const assertionLines = fixtureSource === undefined
+    ? []
+    : privateBrandAssertionLines(fixture.program, [fixtureSource]);
+  const failures = [];
+  for (const marker of ['OBJECT_LITERAL', 'SPREAD', 'CAST', 'EXTERNAL_NEW']) {
+    const line = markerLine(source, marker);
+    const rejectedByCompiler = diagnostics.some((diagnostic) => diagnosticLine(diagnostic) === line);
+    const rejectedAssertion = marker === 'CAST' && assertionLines.includes(line);
+    if (!rejectedByCompiler && !rejectedAssertion) {
+      failures.push(`private-brand-negative.ts:${line}: ${marker} unexpectedly compiled`);
+    }
+  }
+  const validSource = `
+import { buildOfferEnvironment } from '../src/vtt/offers/build-offer-environment';
+const first = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+const second = buildOfferEnvironment({ kind: 'binding', binding: first.binding });
+void first.queries;
+void second.binding;
+`;
+  const validDiagnostics = compileFixture('private-brand-positive.ts', validSource);
+  if (validDiagnostics.length !== 0) {
+    failures.push('private-brand-positive.ts: real builder calls did not compile');
+  }
+  return failures;
+}
+
+function virtualProgram(sources) {
+  const virtualSources = new Map();
+  for (const [name, source] of Object.entries(sources)) {
+    virtualSources.set(path.join(ROOT, '.architecture-fixtures', name), source);
+  }
+  return createProgram(
+    [...virtualSources.keys()],
+    compilerOptions('tsconfig.app.json'),
+    virtualSources,
+  );
+}
+
+function alternativeExportSelfTest() {
+  const importLine = "import { buildOfferEnvironment } from '../src/vtt/offers/build-offer-environment';";
+  const sources = {
+    'same-builder-positive.ts': `${importLine}\nexport function runRoot(): void {\n` +
+      "  const environment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });\n" +
+      '  void environment.queries;\n}\n',
+    'exported-wrapper.ts': `${importLine}\nexport function secondBuilder() {\n` +
+      "  return buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });\n}\n",
+    'exported-alias.ts': `${importLine}\nexport const secondBuilder = buildOfferEnvironment;\n`,
+    'exported-computed.ts': "import * as offers from '../src/vtt/offers/build-offer-environment';\n" +
+      "export const secondBuilder = offers['buildOfferEnvironment'];\n",
+    'builder-named-reexport.ts':
+      "export { buildOfferEnvironment } from '../src/vtt/offers/build-offer-environment';\n",
+    'builder-star-reexport.ts': "export * from '../src/vtt/offers/build-offer-environment';\n",
+    'builder-namespace-reexport.ts':
+      "export * as offerEnvironment from '../src/vtt/offers/build-offer-environment';\n",
+  };
+  const program = virtualProgram(sources);
+  const sourceFiles = program.getSourceFiles().filter((sourceFile) =>
+    relative(sourceFile.fileName).startsWith('.architecture-fixtures/'));
+  const diagnostics = exportedEnvironmentDiagnostics(program, sourceFiles, new Set());
+  const failures = [];
+  if (diagnostics.some((diagnostic) => diagnostic.includes('same-builder-positive.ts'))) {
+    failures.push('same-builder-positive.ts: lifecycle-root builder use was rejected');
+  }
+  for (const name of Object.keys(sources).filter((name) => name !== 'same-builder-positive.ts')) {
+    if (!diagnostics.some((diagnostic) => diagnostic.includes(name))) {
+      failures.push(`${name}: alternative exported builder was not rejected`);
+    }
+  }
+  return failures;
+}
+
+function canonicalOriginSelfTest() {
+  const sources = {
+    'canonical-named-import.ts':
+      "import { canonicalEngineQueryPort } from '../src/vtt/engine-query-port';\nvoid canonicalEngineQueryPort;\n",
+    'canonical-aliased-import.ts':
+      "import { canonicalEngineQueryPort as queries } from '../src/vtt/engine-query-port';\nvoid queries;\n",
+    'canonical-namespace-access.ts':
+      "import * as queryPort from '../src/vtt/engine-query-port';\nvoid queryPort.canonicalEngineQueryPort;\n",
+    'canonical-named-reexport.ts':
+      "export { canonicalEngineQueryPort as queries } from '../src/vtt/engine-query-port';\n",
+    'canonical-require-direct.cts':
+      "const queries = require('../src/vtt/engine-query-port').canonicalEngineQueryPort;\nvoid queries;\n",
+    'canonical-require-destructured.cts':
+      "const { canonicalEngineQueryPort: queries } = require('../src/vtt/engine-query-port');\nvoid queries;\n",
+    'canonical-create-require-computed.mts':
+      "import { createRequire as load } from 'node:module';\n" +
+      'const requireModule = load(import.meta.url);\n' +
+      "const moduleValue = requireModule('../src/vtt/engine-query-port');\n" +
+      "const key = 'canonicalEngineQueryPort';\nvoid moduleValue[key];\n",
+    'canonical-require-computed.cts':
+      "const moduleValue = require('../src/vtt/engine-query-port');\n" +
+      "const key = 'canonicalEngineQueryPort';\nvoid moduleValue[key];\n",
+    'canonical-import-equals.cts':
+      "import queryPort = require('../src/vtt/engine-query-port');\nvoid queryPort.canonicalEngineQueryPort;\n",
+    'canonical-commonjs-reexport.cts':
+      "const queryPort = require('../src/vtt/engine-query-port');\nexport = queryPort;\n",
+    'canonical-commonjs-named-reexport.cts':
+      "exports.queries = require('../src/vtt/engine-query-port').canonicalEngineQueryPort;\n",
+    'canonical-dynamic-import.mts':
+      "const queryPort = await import('../src/vtt/engine-query-port');\n" +
+      "const key = 'canonicalEngineQueryPort';\nvoid queryPort[key];\n",
+    'canonical-star-export.mts': "export * from '../src/vtt/engine-query-port';\n",
+  };
+  const failures = [];
+  for (const [name, source] of Object.entries(sources)) {
+    const fileName = path.join(ROOT, '.architecture-fixtures', name);
+    const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
+    if (canonicalOriginDiagnostics(sourceFile, false).length === 0) {
+      failures.push(`${name}: canonical query-port origin was not rejected`);
+    }
+  }
+  const validSources = {
+    'environment-queries.ts': 'void environment.queries;\n',
+    'query-port-type.ts':
+      "import type { EngineQueryPort } from '../src/vtt/engine-query-port';\n" +
+      'declare const queries: EngineQueryPort;\nvoid queries;\n',
+    'binding-codec.ts':
+      "import { decodeEngineOptionEnvironmentBinding } from '../src/vtt/offers/offer-environment';\n" +
+      'declare const binding: unknown;\nvoid decodeEngineOptionEnvironmentBinding(binding);\n',
+  };
+  for (const [name, source] of Object.entries(validSources)) {
+    const fileName = path.join(ROOT, '.architecture-fixtures', name);
+    const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
+    if (canonicalOriginDiagnostics(sourceFile, false).length !== 0) {
+      failures.push(`${name}: valid query/binding use was rejected`);
+    }
+  }
+  return failures;
+}
+
+function stagedRealSymbolSelfTest(fixtures) {
+  const failures = [];
+  for (const fixture of fixtures) {
+    const diagnostics = compileFixture(fixture.name, fixture.source);
+    const omittedLine = markerLine(fixture.source, 'OMITTED');
+    const suppliedLine = markerLine(fixture.source, 'SUPPLIED');
+    if (!diagnostics.some((diagnostic) => diagnosticLine(diagnostic) === omittedLine)) {
+      failures.push(`${fixture.name}:${omittedLine}: omitted real-symbol dependency compiled`);
+    }
+    if (diagnostics.some((diagnostic) => diagnosticLine(diagnostic) === suppliedLine)) {
+      failures.push(`${fixture.name}:${suppliedLine}: valid real-symbol dependency was rejected`);
+    }
+    const unrelated = diagnostics.filter((diagnostic) => {
+      const line = diagnosticLine(diagnostic);
+      return line !== omittedLine && line !== suppliedLine;
+    });
+    if (unrelated.length > 0) {
+      failures.push(`${fixture.name}: ${String(unrelated.length)} unrelated compile diagnostic(s)`);
+    }
+  }
+  return failures;
+}
+
+function runSelfTest(stage) {
+  const diagnostics = [
+    ...privateBrandSelfTest(),
+    ...alternativeExportSelfTest(),
+    ...canonicalOriginSelfTest(),
+  ];
+  if (stage !== undefined) {
+    const staged = STAGED_REAL_SYMBOL_FIXTURES[stage];
+    if (staged === undefined) {
+      diagnostics.push(`Unknown architecture fixture stage: ${stage}`);
+    } else {
+      diagnostics.push(...stagedRealSymbolSelfTest(staged));
+    }
+  }
+  if (diagnostics.length > 0) {
+    for (const diagnostic of diagnostics) console.error(diagnostic);
+    process.exitCode = 1;
+    return;
+  }
+  console.log('offer-environment architecture self-test: 28 active fixtures passed');
+  console.log(`active CommonJS/ESM origin fixtures: ${ACTIVE_CJS_ORIGIN_FIXTURES.join(', ')}`);
+  const stagedCounts = Object.entries(STAGED_REAL_SYMBOL_FIXTURES)
+    .map(([name, fixtures]) => `${name}:${String(fixtures.length)}`)
+    .join(', ');
+  console.log(`staged real-symbol fixture groups: ${stagedCounts}`);
+  console.log(`staged format fixtures: ${Object.keys(STAGED_FORMAT_FIXTURES).join(', ')}`);
+}
+
+function runProductionCheck() {
+  const files = productionFiles();
+  const program = createProgram(files, compilerOptions('tsconfig.node.json'));
+  const sourceFiles = program.getSourceFiles().filter((sourceFile) => {
+    const fileName = relative(sourceFile.fileName);
+    return fileName.startsWith('src/') || fileName.startsWith('tools/') || fileName.startsWith('tests/');
+  });
+  const builder = sourceFiles.find((sourceFile) => relative(sourceFile.fileName) === BUILDER_PATH);
+  const diagnostics = builder === undefined
+    ? [`${BUILDER_PATH}: builder module is missing`]
+    : builderContractDiagnostics(builder);
+  diagnostics.push(...exportedEnvironmentDiagnostics(program, sourceFiles, TRANSITIONAL_RUNTIME_EXPORTS));
+  const assertionDiagnostics = privateBrandAssertionLines(program, sourceFiles);
+  if (assertionDiagnostics.length > 0) {
+    diagnostics.push(`forbidden assertions to EngineOptionEnvironment at ${assertionDiagnostics.join(', ')}`);
+  }
+  if (diagnostics.length > 0) {
+    for (const diagnostic of diagnostics) console.error(diagnostic);
+    process.exitCode = 1;
+    return;
+  }
+  console.log(`offer-environment architecture: ${sourceFiles.length} TypeScript files checked`);
+  console.log('runtime export allowlist: builder plus exactly five transitional factories/wrappers');
+}
+
+const args = process.argv.slice(2);
+const selfTest = args.includes('--self-test');
+const stageIndex = args.indexOf('--stage');
+const stage = stageIndex < 0 ? undefined : args[stageIndex + 1];
+const knownArguments = new Set(['--self-test', '--stage', stage]);
+const unknownArguments = args.filter((argument) => !knownArguments.has(argument));
+if (unknownArguments.length > 0 || (stageIndex >= 0 && stage === undefined)) {
+  console.error(`Unknown or incomplete arguments: ${args.join(' ')}`);
+  process.exitCode = 1;
+} else if (selfTest) {
+  runSelfTest(stage);
+} else if (stage !== undefined) {
+  console.error('--stage requires --self-test.');
+  process.exitCode = 1;
+} else {
+  runProductionCheck();
+}
diff --git a/src/vtt/offers/build-offer-environment.ts b/src/vtt/offers/build-offer-environment.ts
new file mode 100644
index 0000000000000000000000000000000000000000..047901c138c6dbca8eb5f3339dc91955b763764c
--- /dev/null
+++ b/src/vtt/offers/build-offer-environment.ts
@@ -0,0 +1,85 @@
+import { canonicalEngineQueryPort } from '../engine-query-port';
+import {
+  createDisabledEngineOfferFamilyPolicy,
+  createEngineOptionEnvironmentBinding,
+  createLegacyEngineOptionEnvironmentBinding,
+  decodeEngineOfferFamilyPolicy,
+  decodeEngineOptionEnvironmentBinding,
+  type EngineOfferFamilyPolicy,
+  type EngineOptionEnvironmentBinding,
+} from './offer-environment';
+import {
+  decodePartyThreatCatalog,
+  type PartyThreatCatalog,
+} from './party-threat-catalog';
+
+export type OfferEnvironmentInput =
+  | { readonly kind: 'configuration'; readonly mode: 'legacy_standard' }
+  | {
+      readonly kind: 'configuration';
+      readonly mode: 'revision_bound';
+      readonly familyPolicy: EngineOfferFamilyPolicy;
+      readonly partyThreatCatalog: PartyThreatCatalog;
+    }
+  | { readonly kind: 'binding'; readonly binding: unknown };
+
+class RuntimeOfferEnvironment {
+  readonly #brand = undefined;
+  readonly queries = canonicalEngineQueryPort;
+  readonly familyPolicy: EngineOfferFamilyPolicy;
+  readonly partyThreatCatalog: PartyThreatCatalog;
+  readonly digest: string;
+
+  constructor(readonly binding: EngineOptionEnvironmentBinding) {
+    this.familyPolicy = binding.familyPolicy;
+    this.partyThreatCatalog = binding.partyThreatCatalog;
+    this.digest = binding.digest;
+    Object.freeze(this);
+  }
+}
+
+export type EngineOptionEnvironment = RuntimeOfferEnvironment;
+
+function hasExactKeys(value: object, expected: readonly string[]): boolean {
+  const actual = Object.keys(value).sort();
+  const sortedExpected = [...expected].sort();
+  return actual.length === sortedExpected.length &&
+    actual.every((key, index) => key === sortedExpected[index]);
+}
+
+export function buildOfferEnvironment(input: OfferEnvironmentInput): EngineOptionEnvironment {
+  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
+    throw new TypeError('Offer environment input must be an object.');
+  }
+  if (input.kind === 'binding') {
+    if (input.binding === undefined) {
+      throw new TypeError('Offer environment binding is required.');
+    }
+    if (!hasExactKeys(input, ['kind', 'binding'])) {
+      throw new TypeError('Offer environment binding input has an invalid shape.');
+    }
+    return new RuntimeOfferEnvironment(decodeEngineOptionEnvironmentBinding(input.binding));
+  }
+  if (input.kind !== 'configuration') {
+    throw new TypeError('Offer environment input has an invalid shape.');
+  }
+  if (input.mode === 'legacy_standard') {
+    if (!hasExactKeys(input, ['kind', 'mode', 'queries'])) {
+      throw new TypeError('Offer environment configuration has an invalid shape.');
+    }
+    return new RuntimeOfferEnvironment(createLegacyEngineOptionEnvironmentBinding());
+  }
+  if (input.mode !== 'revision_bound' ||
+    !hasExactKeys(input, ['kind', 'mode', 'familyPolicy', 'partyThreatCatalog'])) {
+    throw new TypeError('Offer environment configuration has an invalid shape.');
+  }
+  const familyPolicy = decodeEngineOfferFamilyPolicy(input.familyPolicy);
+  const partyThreatCatalog = decodePartyThreatCatalog(input.partyThreatCatalog);
+  const binding = createEngineOptionEnvironmentBinding({
+    format: 'engine-option-environment-v1',
+    mode: 'revision_bound',
+    familyPolicy,
+    partyThreatCatalog,
+  });
+  return new RuntimeOfferEnvironment(binding);
+}
diff --git a/src/vtt/offers/offer-environment.ts b/src/vtt/offers/offer-environment.ts
index f4d5cbadef0fc31884c0f2125b2b6f6db106d347..ebbb041010be60305a34e11e76e0ded3274174e2
--- a/src/vtt/offers/offer-environment.ts
+++ b/src/vtt/offers/offer-environment.ts
@@ -1,6 +1,7 @@
 import { canonicalJson } from '../../commands/canonical-json';
 import { sha256 } from '../../crypto/sha256';
 import type { EngineQueryPort } from '../engine-query-port';
+import { buildOfferEnvironment } from './build-offer-environment';
 import {
   createUnrepresentedPartyThreatCatalog,
   decodePartyThreatCatalog,
@@ -149,17 +150,10 @@
 }
 
 export function engineOptionEnvironmentFromBinding(
-  queries: EngineQueryPort,
+  _queries: EngineQueryPort,
   value: unknown,
 ): EngineOptionEnvironment {
-  const binding = decodeEngineOptionEnvironmentBinding(value);
-  return Object.freeze({
-    queries,
-    familyPolicy: binding.familyPolicy,
-    partyThreatCatalog: binding.partyThreatCatalog,
-    binding,
-    digest: binding.digest,
-  });
+  return buildOfferEnvironment({ kind: 'binding', binding: value });
 }
 
 export function createEngineOptionEnvironment(input: {
@@ -168,16 +162,25 @@
   readonly familyPolicy: EngineOfferFamilyPolicy;
   readonly partyThreatCatalog: PartyThreatCatalog;
 }): EngineOptionEnvironment {
-  return engineOptionEnvironmentFromBinding(input.queries, createEngineOptionEnvironmentBinding({
-    format: 'engine-option-environment-v1',
-    mode: input.mode,
+  if (input.mode === 'legacy_standard') {
+    const binding = createEngineOptionEnvironmentBinding({
+      format: 'engine-option-environment-v1',
+      mode: 'legacy_standard',
+      familyPolicy: input.familyPolicy,
+      partyThreatCatalog: input.partyThreatCatalog,
+    });
+    return buildOfferEnvironment({ kind: 'binding', binding });
+  }
+  return buildOfferEnvironment({
+    kind: 'configuration',
+    mode: 'revision_bound',
     familyPolicy: input.familyPolicy,
     partyThreatCatalog: input.partyThreatCatalog,
-  }));
+  });
 }
 
-export function createLegacyEngineOptionEnvironment(queries: EngineQueryPort): EngineOptionEnvironment {
-  return engineOptionEnvironmentFromBinding(queries, createLegacyEngineOptionEnvironmentBinding());
+export function createLegacyEngineOptionEnvironment(_queries: EngineQueryPort): EngineOptionEnvironment {
+  return buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
 }
 
 export function createLegacyEngineOptionEnvironmentBinding(): EngineOptionEnvironmentBinding {
@@ -189,9 +192,9 @@
   });
 }
 
-export function createRevisionBoundEngineOptionEnvironment(queries: EngineQueryPort): EngineOptionEnvironment {
-  return createEngineOptionEnvironment({
-    queries,
+export function createRevisionBoundEngineOptionEnvironment(_queries: EngineQueryPort): EngineOptionEnvironment {
+  return buildOfferEnvironment({
+    kind: 'configuration',
     mode: 'revision_bound',
     familyPolicy: createDisabledEngineOfferFamilyPolicy(),
     partyThreatCatalog: createUnrepresentedPartyThreatCatalog(),
diff --git a/tests/unit/vtt/offer-environment-board-sequence.test.ts b/tests/unit/vtt/offer-environment-board-sequence.test.ts
index d4ec505751957cac93e56d214eb5a6e6121044e3..935622f27af956c17573898591903a8710e0e57c
--- a/tests/unit/vtt/offer-environment-board-sequence.test.ts
+++ b/tests/unit/vtt/offer-environment-board-sequence.test.ts
@@ -1,9 +1,8 @@
 import { describe, expect, it } from 'vitest';
 import { projectDmView } from '../../../src/combat/visibility';
-import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
 import { projectDmBoard } from '../../../src/vtt/encounter-projections';
 import { resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
-import { createLegacyEngineOptionEnvironment } from '../../../src/vtt/offers/offer-environment';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 import {
   offeredOptionActorsForState,
   offeredOptionPaths,
@@ -21,7 +20,7 @@
 describe('Slice 3A production board offer environment', () => {
   it('production board keeps every moving offered-option path and its hazard overlays', () => {
     const state = createOptionPathFixtureEncounter();
-    const environment = createLegacyEngineOptionEnvironment(canonicalEngineQueryPort);
+    const environment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
     const offeredActors = offeredOptionActorsForState(state, undefined, environment);
     const movingOptionIds = offeredActors.flatMap((actor) => actor.options.flatMap((option) => {
       const resolution = resolveEngineActorOption(state, option, environment);
diff --git a/tests/unit/vtt/offer-environment-identity.test.ts b/tests/unit/vtt/offer-environment-identity.test.ts
index c74efa510126956b3764657f1fc7ecd47bd03211..f7da781dc0779a42a9bc1f7abb8d4f76a4fedae8
--- a/tests/unit/vtt/offer-environment-identity.test.ts
+++ b/tests/unit/vtt/offer-environment-identity.test.ts
@@ -4,7 +4,6 @@
 import { mulberry32 } from '../../../src/combat/random';
 import { BANDIT } from '../../../src/combat/statblocks/mercenary-company';
 import { encounterBranchId, encounterSessionId } from '../../../src/combat/values';
-import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
 import { EngineRoundSession } from '../../../src/vtt/engine-round-session';
 import {
   availableEngineActorOptions,
@@ -12,11 +11,8 @@
 } from '../../../src/vtt/intent-resolver';
 import { scoreTeamPlans } from '../../../src/vtt/intel/team-scorer';
 import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
-import {
-  createEngineOfferFamilyPolicy,
-  createEngineOptionEnvironment,
-  createRevisionBoundEngineOptionEnvironment,
-} from '../../../src/vtt/offers/offer-environment';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
+import { createEngineOfferFamilyPolicy } from '../../../src/vtt/offers/offer-environment';
 import { createUnrepresentedPartyThreatCatalog } from '../../../src/vtt/offers/party-threat-catalog';
 import {
   OfferedOptionEnvironmentMismatchError,
@@ -40,10 +36,25 @@
   return { actor, state };
 }
 
+function revisionBoundEnvironment(helpAttack: 'disabled' | 'enabled' = 'disabled') {
+  return buildOfferEnvironment({
+    kind: 'configuration',
+    mode: 'revision_bound',
+    familyPolicy: createEngineOfferFamilyPolicy({
+      format: 'engine-offer-family-policy-v1',
+      helpAttack,
+      readyAttack: 'disabled',
+      unarmedControl: 'disabled',
+      reposition: 'disabled',
+    }),
+    partyThreatCatalog: createUnrepresentedPartyThreatCatalog(),
+  });
+}
+
 describe('Slice 3A bound offer environments', () => {
   it('resolver fallback reuses the primary environment instance', () => {
     const { actor, state } = fixture();
-    const environment = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
+    const environment = revisionBoundEnvironment();
     const options = availableEngineActorOptions(state, actor.id, environment);
     const fallback = options.find((option) =>
       option.actionSlots.some((slot) => slot.slot === 'main' && slot.use.kind === 'dodge'));
@@ -62,19 +73,8 @@
 
   it('board path and round execution share environment digest', () => {
     const { actor, state } = fixture();
-    const environment = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
-    const differentPolicyEnvironment = createEngineOptionEnvironment({
-      queries: canonicalEngineQueryPort,
-      mode: 'revision_bound',
-      familyPolicy: createEngineOfferFamilyPolicy({
-        format: 'engine-offer-family-policy-v1',
-        helpAttack: 'enabled',
-        readyAttack: 'disabled',
-        unarmedControl: 'disabled',
-        reposition: 'disabled',
-      }),
-      partyThreatCatalog: createUnrepresentedPartyThreatCatalog(),
-    });
+    const environment = revisionBoundEnvironment();
+    const differentPolicyEnvironment = revisionBoundEnvironment('enabled');
     const actors = offeredOptionActorsForState(state, [actor.id], environment);
 
     expect(offeredOptionPaths(state, actors, environment).length).toBeGreaterThan(0);
@@ -100,7 +100,7 @@
 
   it('all offer API consumers use their bound environment', () => {
     const { actor, state } = fixture();
-    const environment = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
+    const environment = revisionBoundEnvironment();
     const primary = availableEngineActorOptions(state, actor.id, environment)
       .find((option) => option.actionSlots.some((slot) =>
         slot.slot === 'main' && slot.use.kind === 'attack'));
diff --git a/tests/unit/vtt/offer-environment.test.ts b/tests/unit/vtt/offer-environment.test.ts
index 67300aab240bfd4d27b68d738a13700d905af9ea..d0ca5c6395f58e5517a2cbb53f1cede7de4cb4a7
--- a/tests/unit/vtt/offer-environment.test.ts
+++ b/tests/unit/vtt/offer-environment.test.ts
@@ -7,18 +7,18 @@
 import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
 import {
   createDisabledEngineOfferFamilyPolicy,
-  createEngineOptionEnvironment,
-  createLegacyEngineOptionEnvironment,
   decodeEngineOptionEnvironmentBinding,
+} from '../../../src/vtt/offers/offer-environment';
+import {
+  buildOfferEnvironment,
   type EngineOptionEnvironment,
-} from '../../../src/vtt/offers/offer-environment';
+} from '../../../src/vtt/offers/build-offer-environment';
 import { ENGINE_OFFER_CAPABILITIES } from '../../../src/vtt/offers/offer-generator-registry';
 import { createPartyThreatCatalog } from '../../../src/vtt/offers/party-threat-catalog';
 import {
   createEngineMcpRuntime,
   decodeEngineMcpLauncherManifest,
   ENGINE_MCP_LAUNCHER_FORMAT,
-  reconstructLauncherOfferEnvironment,
   type EngineMcpLauncherManifest,
 } from '../../../src/vtt/mcp/entrypoint';
 import { placedToken, playerProfile } from '../combat/fixtures';
@@ -52,8 +52,8 @@
       resolution: { kind: 'saving_throw', ability: 'dexterity' },
     }],
   });
-  return createEngineOptionEnvironment({
-    queries: canonicalEngineQueryPort,
+  return buildOfferEnvironment({
+    kind: 'configuration',
     mode: 'revision_bound',
     familyPolicy,
     partyThreatCatalog,
@@ -85,6 +85,65 @@
 }
 
 describe('immutable offer environment', () => {
+  it('rejects a missing builder input with the exact contract error', () => {
+    expect(() => Reflect.apply(buildOfferEnvironment, undefined, [])).toThrow(
+      new TypeError('Offer environment input must be an object.'),
+    );
+  });
+
+  it('rejects a missing binding with the exact contract error', () => {
+    expect(() => buildOfferEnvironment({ kind: 'binding', binding: undefined })).toThrow(
+      new TypeError('Offer environment binding is required.'),
+    );
+  });
+
+  it('rejects malformed and mistagged bindings through the binding codec', () => {
+    const binding = structuredClone(representedEnvironment().binding);
+    const truncated = mutableRecord(structuredClone(binding), 'offer environment binding');
+    delete truncated['partyThreatCatalog'];
+    expect(() => buildOfferEnvironment({ kind: 'binding', binding: truncated })).toThrow(
+      new TypeError('engine option environment binding has an invalid shape.'),
+    );
+
+    const mistagged = mutableRecord(structuredClone(binding), 'offer environment binding');
+    mistagged['format'] = 'engine-option-environment-v0';
+    expect(() => buildOfferEnvironment({ kind: 'binding', binding: mistagged })).toThrow(
+      new TypeError('Engine option environment binding header is invalid.'),
+    );
+  });
+
+  it('rejects query injection into configuration input', () => {
+    const injectedInput = {
+      kind: 'configuration',
+      mode: 'legacy_standard',
+      queries: canonicalEngineQueryPort,
+    } as const;
+    expect(() => buildOfferEnvironment(injectedInput)).toThrow(
+      new TypeError('Offer environment configuration has an invalid shape.'),
+    );
+  });
+
+  it('validates revision configuration through the policy and catalog codecs', () => {
+    const environment = representedEnvironment();
+    const invalidPolicy = mutableRecord(structuredClone(environment.familyPolicy), 'family policy');
+    invalidPolicy['helpAttack'] = 'enabled';
+    expect(() => Reflect.apply(buildOfferEnvironment, undefined, [{
+      kind: 'configuration',
+      mode: 'revision_bound',
+      familyPolicy: invalidPolicy,
+      partyThreatCatalog: environment.partyThreatCatalog,
+    }])).toThrow(new TypeError('Engine offer family policy digest is invalid.'));
+
+    const invalidCatalog = mutableRecord(structuredClone(environment.partyThreatCatalog), 'party threat catalog');
+    invalidCatalog['representation'] = 'unrepresented';
+    expect(() => Reflect.apply(buildOfferEnvironment, undefined, [{
+      kind: 'configuration',
+      mode: 'revision_bound',
+      familyPolicy: environment.familyPolicy,
+      partyThreatCatalog: invalidCatalog,
+    }])).toThrow(new TypeError('An unrepresented party threat catalog must be empty.'));
+  });
+
   it('binds strict family-policy catalog and environment digests to independent expected values', () => {
     const environment = representedEnvironment();
     expect(environment.familyPolicy.digest).toBe(EXPECTED_DISABLED_POLICY_DIGEST);
@@ -108,7 +167,10 @@
     const environment = representedEnvironment();
     const decoded = decodeEngineMcpLauncherManifest(launcher(environment));
     if (decoded === null) throw new Error('Valid offer-bound launcher was not decoded.');
-    const reconstructed = reconstructLauncherOfferEnvironment(decoded);
+    const reconstructed = buildOfferEnvironment({
+      kind: 'binding',
+      binding: decoded.offerEnvironment,
+    });
     expect(reconstructed).not.toBe(environment);
     expect(reconstructed.binding.mode).toBe('revision_bound');
     expect(reconstructed.queries).toBe(canonicalEngineQueryPort);
@@ -146,7 +208,7 @@
   });
 
   it('legacy standard ids remain unchanged under explicit legacy environment', () => {
-    const environment = createLegacyEngineOptionEnvironment(canonicalEngineQueryPort);
+    const environment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
     expect(environment.familyPolicy.digest).toBe(EXPECTED_DISABLED_POLICY_DIGEST);
     expect(environment.partyThreatCatalog.digest).toBe(EXPECTED_UNREPRESENTED_CATALOG_DIGEST);
     expect(environment.digest).toBe(EXPECTED_LEGACY_ENVIRONMENT_DIGEST);
@@ -161,7 +223,10 @@
 
     const decodedLegacyLauncher = decodeEngineMcpLauncherManifest(launcher(environment));
     if (decodedLegacyLauncher === null) throw new Error('Valid legacy launcher was not decoded.');
-    const reconstructedLegacy = reconstructLauncherOfferEnvironment(decodedLegacyLauncher);
+    const reconstructedLegacy = buildOfferEnvironment({
+      kind: 'binding',
+      binding: decodedLegacyLauncher.offerEnvironment,
+    });
     expect(reconstructedLegacy.binding.mode).toBe('legacy_standard');
     expect(reconstructedLegacy.partyThreatCatalog.representation).toBe('unrepresented');
     expect(reconstructedLegacy.digest).toBe(EXPECTED_LEGACY_ENVIRONMENT_DIGEST);
