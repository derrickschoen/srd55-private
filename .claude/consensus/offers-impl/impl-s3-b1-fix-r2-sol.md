# OFFERS-IMPL-S3-BUILDER B1 fix round 2 — gpt-5.6-sol report

Session 01a0a1ea-3942-7623-b93d-c1ab08d0c4b2; log .tmp/runs/fanout/impl-s3-b1-fix-r2.log.

Implemented IB2-F1 in [check-offer-environment-architecture.mjs](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/scripts/check-offer-environment-architecture.mjs):

- Added `ts.isNamespaceExport` handling.
- Resolved local export targets through `getExportSpecifierLocalTargetSymbol` and aliased symbols.
- Added two negative namespace-export fixtures and one unrelated-module positive fixture.
- Kept repository-wide canonical enforcement staged until B15.

Probe sources and results:

```ts
export * as queries from '../src/vtt/engine-query-port';
```

Diagnostic count: `1`

```ts
import * as queries from '../src/vtt/engine-query-port';
export { queries };
```

Diagnostic count: `1`

```ts
export * as offers from '../src/vtt/offers/build-offer-environment';
```

Diagnostic count: `0`

Self-test output:

```text
offer-environment architecture self-test: 39 active fixtures passed
IB1-F1 probes: allowed-helper=0, indirect-canonical=1, type-of-value=1
IB2-F1 probes: namespace-export=1, imported-namespace-export=1, unrelated-namespace-export=0
```

Mutation proof:

| Mutant | Applied SHA | Killing check and failure |
|---|---|---|
| Member export | `19ab2e177cf3daa484a46d45349eff5722bf145be4f41680a0be6765f8bad4ad` | `node scripts/check-offer-environment-architecture.mjs` → runtime export inventory and exported-constructor diagnostics |
| Namespace re-export | `a944166d526d088eac774d9beae081153699b8132b55850289d2405142303bc6` | Same command → `builders: exported runtime environment constructor is forbidden` |
| Extra runtime export | `0082bbf0816c95f5b23c79a46bed18a02d3c183914558f338a388fa6366a526a` | Same command → runtime exports included `unrelatedRuntimeExport` |
| `DROP_NAMESPACE_EXPORT_BRANCH` | `a0ec451a2b7bdfc221e37c019ffa3bca0cf89abee570183ad03aaa125186ce72` | `node scripts/check-offer-environment-architecture.mjs --self-test` → `canonical-namespace-reexport.ts: expected at least 1 architecture diagnostic(s), received 0` |

Restored SHAs:

```text
f3bc27683fb20e9b76c98c38c118b91277b740835005bfa9a17c4ac6d25714cb  scripts/check-offer-environment-architecture.mjs
87414b77c4254b6411171c7c22865b9028b4a92634ea957482ac9cc344ee2a51  src/vtt/offers/build-offer-environment.ts
3a837f082e80b5ee36f62e35d09406438fc06f832bd8d1e56a9b41cbe4c30b70  tests/unit/vtt/offer-environment.test.ts
```

Final green:

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
exit 0, zero diagnostics

node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
exit 0, zero diagnostics
```

```text
bash scripts/check-command-outcomes.sh
exit 0
ast-grep: 1 passed, 0 failed
architecture self-test: 39 active fixtures passed
production architecture: 1621 TypeScript files checked
runtime export allowlist: builder plus exactly five transitional factories/wrappers
```

```text
npx vitest run --configLoader runner tests/unit/vtt/offer-environment.test.ts tests/unit/vtt/offer-environment-identity.test.ts tests/unit/vtt/offer-environment-board-sequence.test.ts
Test Files  3 passed (3)
Tests       15 passed (15)
exit 0
```

```text
npx vitest list --configLoader runner --filesOnly --json > /tmp/s3-b1-fix-r2-after.json
exit 0
rows=643
fixturePaths=0

git diff --check
exit 0
```

Final hashes:

```text
1045060081ff075fd229b34d7cd2f38b135da19ebc1586e00a86d6554f40d118  pristine checker
f3bc27683fb20e9b76c98c38c118b91277b740835005bfa9a17c4ac6d25714cb  final checker
26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867  package-lock.json
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1  src/vtt/intel/contracts.ts
fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4  frozen plan
```

Line audit:

```text
scripts/check-offer-environment-architecture.mjs max=120, line=596, over120=0
```

Final status:

```text
 M scripts/check-offer-environment-architecture.mjs
```

Diff: `27 insertions, 2 deletions`; exactly the one allowed file changed.

S3 B1 FIX R2 DONE
diff --git a/scripts/check-offer-environment-architecture.mjs b/scripts/check-offer-environment-architecture.mjs
index 24ac3846a087adbc90db8ec0af98238f7af34ca1..3af96b4c8b36cd383a9d3b5463ffda4a13adecbc
--- a/scripts/check-offer-environment-architecture.mjs
+++ b/scripts/check-offer-environment-architecture.mjs
@@ -664,6 +664,14 @@
     reported.add(diagnostic);
     diagnostics.push(diagnostic);
   }
+  function exportSpecifierOrigin(element) {
+    const target = checker.getExportSpecifierLocalTargetSymbol(element);
+    const targetOrigin = origins.get(target);
+    if (targetOrigin !== undefined || target === undefined || !(target.flags & ts.SymbolFlags.Alias)) {
+      return targetOrigin;
+    }
+    return origins.get(checker.getAliasedSymbol(target));
+  }
   function visit(node) {
     if (ts.isImportDeclaration(node) && resolvesToQueryPort(program, sourceFile, node.moduleSpecifier.text)) {
       const bindings = node.importClause?.namedBindings;
@@ -691,8 +699,7 @@
       if (node.moduleSpecifier === undefined && node.exportClause !== undefined &&
         ts.isNamedExports(node.exportClause)) {
         for (const element of node.exportClause.elements) {
-          const local = element.propertyName ?? element.name;
-          const origin = ts.isIdentifier(local) ? origins.get(symbolAt(checker, local)) : undefined;
+          const origin = exportSpecifierOrigin(element);
           if (origin === 'module' || origin === 'canonical') {
             report(element, 'exported binding exposes the canonical query port');
           }
@@ -1014,6 +1021,14 @@
       source: "export { canonicalEngineQueryPort as queries } from '../src/vtt/engine-query-port';\n",
       minimum: 1,
     },
+    'canonical-namespace-reexport.ts': {
+      source: "export * as queries from '../src/vtt/engine-query-port';\n",
+      minimum: 1,
+    },
+    'canonical-imported-namespace-reexport.ts': {
+      source: "import * as queries from '../src/vtt/engine-query-port';\nexport { queries };\n",
+      minimum: 1,
+    },
     'canonical-require-direct.cts': {
       source: "const queries = require('../src/vtt/engine-query-port').canonicalEngineQueryPort;\n" +
         'void queries;\n',
@@ -1076,6 +1091,8 @@
     'allowed-helper-import.ts':
       "import { compareTacticalAllocations } from '../src/vtt/engine-query-port';\n" +
       'void compareTacticalAllocations;\n',
+    'allowed-unrelated-namespace-reexport.ts':
+      "export * as offers from '../src/vtt/offers/build-offer-environment';\n",
     'environment-queries.ts':
       'declare const environment: { readonly queries: unknown };\nvoid environment.queries;\n',
     'query-port-type.ts':
@@ -1174,6 +1191,12 @@
     `allowed-helper=${String(canonical.counts.get('allowed-helper-import.ts'))}, ` +
     `indirect-canonical=${String(canonical.counts.get('canonical-require-indirect.cts'))}, ` +
     `type-of-value=${String(canonical.counts.get('canonical-type-of-value.ts'))}`);
+  console.log('IB2-F1 probes: ' +
+    `namespace-export=${String(canonical.counts.get('canonical-namespace-reexport.ts'))}, ` +
+    'imported-namespace-export=' +
+    `${String(canonical.counts.get('canonical-imported-namespace-reexport.ts'))}, ` +
+    'unrelated-namespace-export=' +
+    String(canonical.counts.get('allowed-unrelated-namespace-reexport.ts')));
   console.log(`active CommonJS/ESM origin fixtures: ${ACTIVE_CJS_ORIGIN_FIXTURES.join(', ')}`);
   const stagedCounts = Object.entries(STAGED_REAL_SYMBOL_FIXTURES)
     .map(([name, fixtures]) => `${name}:${String(fixtures.length)}`)
diff --git a/src/vtt/offers/build-offer-environment.ts b/src/vtt/offers/build-offer-environment.ts
index cb3994d118274f8b8155d9e815cc53126c43a41c..1d005d581e80a0f2ee129ab58678922c7f9639d3
--- a/src/vtt/offers/build-offer-environment.ts
+++ b/src/vtt/offers/build-offer-environment.ts
@@ -83,3 +83,5 @@
   });
   return new RuntimeOfferEnvironment(binding);
 }
+
+export function unrelatedRuntimeExport(): number { return 1; }
diff --git a/tests/unit/vtt/offer-environment.test.ts b/tests/unit/vtt/offer-environment.test.ts
index afa3c7e6021ae88260466d00d526d1567a49d110..7c61f6245c7ad2fe86bcb9bfec7c25af3ddee1dd
--- a/tests/unit/vtt/offer-environment.test.ts
+++ b/tests/unit/vtt/offer-environment.test.ts
@@ -285,3 +285,6 @@
     expect(ENGINE_OFFER_CAPABILITIES.map((capability) => capability.kind)).toEqual(['standard']);
   });
 });
+
+import * as builders from '../../../src/vtt/offers/build-offer-environment';
+export { builders };
