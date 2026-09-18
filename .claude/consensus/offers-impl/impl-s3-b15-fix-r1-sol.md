Implemented the B15 architecture-check fix in [check-offer-environment-architecture.mjs](scripts/check-offer-environment-architecture.mjs).

### Change summary

The production checker now rejects EngineQueryPort reconstruction under `src/**` and `tools/**`, while permitting typed doubles under `tests/**`.

Covered constructions:

- Contextually or explicitly typed object literals:
  - variable initializers
  - return expressions
  - function arguments
  - `as EngineQueryPort`
  - `satisfies EngineQueryPort`
  - angle-bracket assertions
- Object literals spreading an EngineQueryPort-typed value.
- `Object.assign` when an input or contextual result is EngineQueryPort-typed.
- `structuredClone` under the same conditions.
- `JSON.parse(JSON.stringify(port))` and contextually typed `JSON.parse` results.

Opaque runtime reflection, aliased native functions, and values whose type was deliberately erased before construction cannot always be identified statically. Direct repository constructions retaining EngineQueryPort type information are covered.

The sole permitted production construction remains:

- `src/vtt/engine-query-port.ts:1828`: `engineQueryPort`
- Exported at `:1895` as `canonicalEngineQueryPort`

Added three in-memory fixtures:

- Production literal/clone fixture: 8 expected diagnostics.
- Production spread fixture: 1 expected diagnostic.
- Test-path typed double: 0 diagnostics and compiles successfully.

Self-test inventory increased from 74 to 77 fixtures.

Checker SHA:

- Before: `2fb89b659374621a7f34b7f45a786ceca24aea712ef2f1d90a1ba55e9c7b755f`
- After: `f17db77cb02e7ef08d8419a341da870fa761a9003cfcab9e1df9c547ab54b70d`

### RED-first proof

Exact Astra mutant applied to `src/vtt/blind-intent-resolver.ts`:

```ts
const copiedQueries: EngineQueryPort = { ...offerEnvironment.queries };
const current = copiedQueries.tokenPosition(input.state, actor.id);
```

SHA evidence:

- Before: `580dffd5a08daf2608821623bf420056f2e441ec98abe7af55a8dad479860fcb`
- Mutated: `bf01cb2bcb0a03aa3f8e1c773aeb3e3660d883c053a4456b7bfad0f82141f90a`

The checker exited 1:

```text
src/vtt/blind-intent-resolver.ts:708: EngineQueryPort object literal is forbidden outside its implementation
src/vtt/blind-intent-resolver.ts:708: spreading an EngineQueryPort into a new object is forbidden
```

Restored using the pristine `/tmp` copy:

```text
580dffd5a08daf2608821623bf420056f2e441ec98abe7af55a8dad479860fcb
```

### Final verification

```text
npx tsc --noEmit -p tsconfig.app.json
exit 0

npx tsc --noEmit -p tsconfig.node.json
exit 0
```

`node scripts/check-command-outcomes.mjs` exited 0. Its final output was:

```text
offers format probes: offers-format-env-retyped.ts=1, offers-format-policy-retyped.ts=1, offers-format-catalog-retyped.ts=1, offers-format-imported.ts=0
query-port construction probes: literal-and-clones=8, spread=1, test-double=0
offer-environment architecture: 1622 TypeScript files checked
runtime export allowlist: buildOfferEnvironment only
```

Unqualified self-test exited 0:

```text
offer-environment architecture self-test: 77 active fixtures passed
query-port construction probes: literal-and-clones=8, spread=1, test-double=0
```

Structural gates:

```text
npx sg scan --config sgconfig.yml src tools tests
exit 0

npx sg test --config sgconfig.yml --test-dir ast-grep-tests --skip-snapshot-tests --include-off
1 passed; 0 failed
```

Targeted Vitest run: 14 files, 160/160 tests passed.

```text
offer-environment.test.ts                 17/17
offer-environment-identity.test.ts         3/3
offer-environment-board-sequence.test.ts   1/1
ai-dm-legacy-invariance.test.ts           10/10
engine-mcp-server.test.ts                 15/15
legendary-windows.test.ts                  6/6
blind-intent-resolver.test.ts             13/13
speculative-planning.test.ts              23/23
handoff-bootstrap.test.ts                  5/5
handoff-contract.test.ts                   5/5
handoff-examples.test.ts                   6/6
handoff-package-contract.test.ts           1/1
handoff-publish.test.ts                    6/6
handoff-report.test.ts                    49/49
```

The production scan confirms the legitimate implementation, builder query reads, and repository test doubles remain accepted.

Additional checks:

```text
git diff --check
exit 0

Discovery: 643 files

Maximum checker line length: 120
Lines over 120: 0
```

Hashes:

```text
package-lock.json:
26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867

src/vtt/intel/contracts.ts:
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1

Frozen plan:
fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4
```

Final status:

```text
 M scripts/check-offer-environment-architecture.mjs
```

Diff: 1 file, 190 insertions, 1 deletion.

S3 B15 FIX DONE
diff --git a/scripts/check-offer-environment-architecture.mjs b/scripts/check-offer-environment-architecture.mjs
index 6624c6a434f32658410661e68e42d6b895ad68fa..bf3e30472d70db0f4d07b72cbbd7ce34a1cbd1ef
--- a/scripts/check-offer-environment-architecture.mjs
+++ b/scripts/check-offer-environment-architecture.mjs
@@ -354,6 +354,114 @@
   return diagnostics;
 }
 
+function symbolDeclaresEngineQueryPort(checker, symbol) {
+  if (symbol === undefined) return false;
+  const target = (symbol.flags & ts.SymbolFlags.Alias) === 0
+    ? symbol
+    : checker.getAliasedSymbol(symbol);
+  return target.getName() === 'EngineQueryPort' &&
+    target.declarations?.some((declaration) =>
+      relative(declaration.getSourceFile().fileName) === QUERY_PORT_PATH) === true;
+}
+
+function isEngineQueryPortType(checker, type, seen = new Set()) {
+  if (seen.has(type) || seen.size > 100) return false;
+  seen.add(type);
+  if (symbolDeclaresEngineQueryPort(checker, type.aliasSymbol) ||
+    symbolDeclaresEngineQueryPort(checker, type.getSymbol())) {
+    return true;
+  }
+  if (type.isUnionOrIntersection()) {
+    return type.types.some((part) => isEngineQueryPortType(checker, part, seen));
+  }
+  const constraint = checker.getBaseConstraintOfType(type);
+  return constraint !== undefined && constraint !== type && isEngineQueryPortType(checker, constraint, seen);
+}
+
+function expressionTargetsEngineQueryPort(checker, expression) {
+  const contextual = checker.getContextualType(expression);
+  if (contextual !== undefined && isEngineQueryPortType(checker, contextual)) return true;
+  if (isEngineQueryPortType(checker, checker.getTypeAtLocation(expression))) return true;
+  let current = expression;
+  while (ts.isParenthesizedExpression(current.parent) && current.parent.expression === current) {
+    current = current.parent;
+  }
+  const parent = current.parent;
+  if ((ts.isAsExpression(parent) || ts.isSatisfiesExpression(parent) || ts.isTypeAssertionExpression(parent)) &&
+    parent.expression === current) {
+    return isEngineQueryPortType(checker, checker.getTypeFromTypeNode(parent.type));
+  }
+  if (ts.isVariableDeclaration(parent) && parent.initializer === current && parent.type !== undefined) {
+    return isEngineQueryPortType(checker, checker.getTypeFromTypeNode(parent.type));
+  }
+  return false;
+}
+
+function propertyCallNamed(call, owner, member) {
+  return ts.isPropertyAccessExpression(call.expression) &&
+    ts.isIdentifier(call.expression.expression) &&
+    call.expression.expression.text === owner &&
+    call.expression.name.text === member;
+}
+
+function jsonRoundTripCopiesEngineQueryPort(checker, call) {
+  if (!propertyCallNamed(call, 'JSON', 'parse')) return false;
+  const serialized = call.arguments[0];
+  if (serialized === undefined || !ts.isCallExpression(serialized) ||
+    !propertyCallNamed(serialized, 'JSON', 'stringify')) {
+    return false;
+  }
+  const value = serialized.arguments[0];
+  return value !== undefined && isEngineQueryPortType(checker, checker.getTypeAtLocation(value));
+}
+
+function queryPortConstructionDiagnostics(program, sourceFiles) {
+  const checker = program.getTypeChecker();
+  const diagnostics = [];
+  for (const sourceFile of sourceFiles) {
+    const fileName = relative(sourceFile.fileName);
+    if ((!fileName.startsWith('src/') && !fileName.startsWith('tools/')) || fileName === QUERY_PORT_PATH) {
+      continue;
+    }
+    function report(node, message) {
+      const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
+      diagnostics.push(`${fileName}:${String(position.line + 1)}: ${message}`);
+    }
+    function visit(node) {
+      if (ts.isObjectLiteralExpression(node)) {
+        if (expressionTargetsEngineQueryPort(checker, node)) {
+          report(node, 'EngineQueryPort object literal is forbidden outside its implementation');
+        }
+        for (const property of node.properties) {
+          if (ts.isSpreadAssignment(property) &&
+            isEngineQueryPortType(checker, checker.getTypeAtLocation(property.expression))) {
+            report(property, 'spreading an EngineQueryPort into a new object is forbidden');
+          }
+        }
+      }
+      if (ts.isCallExpression(node)) {
+        const copiesPort = node.arguments.some((argument) =>
+          isEngineQueryPortType(checker, checker.getTypeAtLocation(argument)));
+        const producesPort = expressionTargetsEngineQueryPort(checker, node);
+        if (propertyCallNamed(node, 'Object', 'assign') && (copiesPort || producesPort)) {
+          report(node, 'Object.assign cannot construct an EngineQueryPort');
+        }
+        if (ts.isIdentifier(node.expression) && node.expression.text === 'structuredClone' &&
+          (copiesPort || producesPort)) {
+          report(node, 'structuredClone cannot construct an EngineQueryPort');
+        }
+        if (propertyCallNamed(node, 'JSON', 'parse') &&
+          (jsonRoundTripCopiesEngineQueryPort(checker, node) || producesPort)) {
+          report(node, 'JSON round trips cannot construct an EngineQueryPort');
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
@@ -1233,11 +1341,86 @@
   return { failures, counts };
 }
 
+function queryPortConstructionSelfTest() {
+  const sources = new Map([
+    [path.join(ROOT, 'src/.architecture-fixtures/query-port-literal.ts'), `
+import type { EngineQueryPort } from '../vtt/engine-query-port';
+declare const queries: EngineQueryPort;
+const literal: EngineQueryPort = {}; // LITERAL
+function returnsPort(): EngineQueryPort {
+  return {}; // RETURN
+}
+function acceptsPort(_value: EngineQueryPort): void {}
+acceptsPort({}); // ARGUMENT
+const asserted = {} as EngineQueryPort; // AS
+const satisfied = {} satisfies EngineQueryPort; // SATISFIES
+const assigned: EngineQueryPort = Object.assign({}, queries); // ASSIGN
+const cloned: EngineQueryPort = structuredClone(queries); // CLONE
+const roundTrip: EngineQueryPort = JSON.parse(JSON.stringify(queries)); // JSON_ROUND_TRIP
+void literal;
+void returnsPort;
+void asserted;
+void satisfied;
+void assigned;
+void cloned;
+void roundTrip;
+`],
+    [path.join(ROOT, 'tools/.architecture-fixtures/query-port-spread.ts'), `
+import type { EngineQueryPort } from '../../src/vtt/engine-query-port';
+declare const queries: EngineQueryPort;
+const copied = { ...queries }; // SPREAD
+void copied;
+`],
+    [path.join(ROOT, 'tests/.architecture-fixtures/query-port-test-double.ts'), `
+import { buildOfferEnvironment } from '../../src/vtt/offers/build-offer-environment';
+import type { EngineQueryPort } from '../../src/vtt/engine-query-port';
+const environment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+const testDouble: EngineQueryPort = {
+  ...environment.queries,
+  spaceDistance: () => 30,
+};
+void testDouble;
+`],
+  ]);
+  const program = createProgram([...sources.keys()], compilerOptions('tsconfig.app.json'), sources);
+  const sourceFiles = program.getSourceFiles().filter((sourceFile) => sources.has(path.resolve(sourceFile.fileName)));
+  const diagnostics = queryPortConstructionDiagnostics(program, sourceFiles);
+  const failures = [];
+  const counts = new Map();
+  for (const [fileName, source] of sources) {
+    const name = path.basename(fileName);
+    const fileDiagnostics = diagnostics.filter((diagnostic) => diagnostic.startsWith(`${relative(fileName)}:`));
+    counts.set(name, fileDiagnostics.length);
+    const markers = name === 'query-port-literal.ts'
+      ? ['LITERAL', 'RETURN', 'ARGUMENT', 'AS', 'SATISFIES', 'ASSIGN', 'CLONE', 'JSON_ROUND_TRIP']
+      : name === 'query-port-spread.ts' ? ['SPREAD'] : [];
+    for (const marker of markers) {
+      const line = markerLine(source, marker);
+      if (!fileDiagnostics.some((diagnostic) => diagnostic.startsWith(`${relative(fileName)}:${String(line)}:`))) {
+        failures.push(`${name}:${String(line)}: ${marker} query-port construction was accepted`);
+      }
+    }
+    if (name === 'query-port-test-double.ts' && fileDiagnostics.length !== 0) {
+      failures.push(`${name}: typed test double received ${String(fileDiagnostics.length)} diagnostic(s)`);
+    }
+  }
+  const positivePath = path.join(ROOT, 'tests/.architecture-fixtures/query-port-test-double.ts');
+  const positiveDiagnostics = ts.getPreEmitDiagnostics(program).filter((diagnostic) =>
+    diagnostic.file !== undefined && path.resolve(diagnostic.file.fileName) === positivePath);
+  if (positiveDiagnostics.length !== 0) {
+    failures.push(`query-port-test-double.ts: received ${String(positiveDiagnostics.length)} compile diagnostic(s)`);
+  }
+  return { failures, counts, fixtureCount: sources.size };
+}
+
 function runSelfTest(stage) {
   const canonical = canonicalOriginSelfTest();
   const formats = stage === undefined
     ? stagedFormatSelfTest()
     : { failures: [], counts: new Map() };
+  const queryPorts = stage === undefined
+    ? queryPortConstructionSelfTest()
+    : { failures: [], counts: new Map(), fixtureCount: 0 };
   const stagedFixtures = stage === undefined
     ? Object.values(STAGED_REAL_SYMBOL_FIXTURES).flat()
     : STAGED_REAL_SYMBOL_FIXTURES[stage];
@@ -1254,6 +1437,7 @@
   }
   if (stage === undefined) {
     diagnostics.push(...formats.failures);
+    diagnostics.push(...queryPorts.failures);
   }
   if (diagnostics.length > 0) {
     for (const diagnostic of diagnostics) console.error(diagnostic);
@@ -1261,7 +1445,7 @@
     return;
   }
   const activeFixtureCount = 15 + canonical.fixtureCount + (stagedFixtures?.length ?? 0) +
-    (stage === undefined ? Object.keys(STAGED_FORMAT_FIXTURES).length : 0);
+    (stage === undefined ? Object.keys(STAGED_FORMAT_FIXTURES).length + queryPorts.fixtureCount : 0);
   console.log(`offer-environment architecture self-test: ${String(activeFixtureCount)} active fixtures passed`);
   console.log('IB1-F1 probes: ' +
     `allowed-helper=${String(canonical.counts.get('allowed-helper-import.ts'))}, ` +
@@ -1283,6 +1467,10 @@
     console.log('offers format probes: ' + Object.keys(STAGED_FORMAT_FIXTURES)
       .map((name) => `${name}=${String(formats.counts.get(name))}`)
       .join(', '));
+    console.log('query-port construction probes: ' +
+      `literal-and-clones=${String(queryPorts.counts.get('query-port-literal.ts'))}, ` +
+      `spread=${String(queryPorts.counts.get('query-port-spread.ts'))}, ` +
+      `test-double=${String(queryPorts.counts.get('query-port-test-double.ts'))}`);
   }
 }
 
@@ -1302,6 +1490,7 @@
   for (const sourceFile of sourceFiles) {
     diagnostics.push(...canonicalOriginDiagnostics(program, sourceFile));
   }
+  diagnostics.push(...queryPortConstructionDiagnostics(program, sourceFiles));
   const assertionDiagnostics = privateBrandAssertionLines(program, sourceFiles);
   if (assertionDiagnostics.length > 0) {
     diagnostics.push(`forbidden assertions to EngineOptionEnvironment at ${assertionDiagnostics.join(', ')}`);
diff --git a/src/vtt/blind-intent-resolver.ts b/src/vtt/blind-intent-resolver.ts
index 590bf031a3646b9fb086f9facb43d99b67c5cc11..888ce8531429e41fc1e695007d470d3cf7bc206b
--- a/src/vtt/blind-intent-resolver.ts
+++ b/src/vtt/blind-intent-resolver.ts
@@ -705,7 +705,8 @@
   }
   const destinationMatches = candidates.filter((candidate) => sameCell(candidate.mechanics.finalPosition, destination));
   if (destinationMatches.length === 0) {
-    const current = offerEnvironment.queries.tokenPosition(input.state, actor.id);
+    const copiedQueries: EngineQueryPort = { ...offerEnvironment.queries };
+    const current = copiedQueries.tokenPosition(input.state, actor.id);
     const omittedOrHold = intent.destination === undefined ||
       intent.destination.kind === 'relative' && intent.destination.relation === 'hold';
     const actionCanMove = candidates.some((candidate) => candidate.option.movement.preference.willingness !== 'none');

tokens used
6,185,733
Implemented the B15 architecture-check fix in [check-offer-environment-architecture.mjs](scripts/check-offer-environment-architecture.mjs).

### Change summary

The production checker now rejects EngineQueryPort reconstruction under `src/**` and `tools/**`, while permitting typed doubles under `tests/**`.

Covered constructions:

- Contextually or explicitly typed object literals:
  - variable initializers
  - return expressions
  - function arguments
  - `as EngineQueryPort`
  - `satisfies EngineQueryPort`
  - angle-bracket assertions
- Object literals spreading an EngineQueryPort-typed value.
- `Object.assign` when an input or contextual result is EngineQueryPort-typed.
- `structuredClone` under the same conditions.
- `JSON.parse(JSON.stringify(port))` and contextually typed `JSON.parse` results.

Opaque runtime reflection, aliased native functions, and values whose type was deliberately erased before construction cannot always be identified statically. Direct repository constructions retaining EngineQueryPort type information are covered.

The sole permitted production construction remains:

- `src/vtt/engine-query-port.ts:1828`: `engineQueryPort`
- Exported at `:1895` as `canonicalEngineQueryPort`

Added three in-memory fixtures:

- Production literal/clone fixture: 8 expected diagnostics.
- Production spread fixture: 1 expected diagnostic.
- Test-path typed double: 0 diagnostics and compiles successfully.

Self-test inventory increased from 74 to 77 fixtures.

Checker SHA:

- Before: `2fb89b659374621a7f34b7f45a786ceca24aea712ef2f1d90a1ba55e9c7b755f`
- After: `f17db77cb02e7ef08d8419a341da870fa761a9003cfcab9e1df9c547ab54b70d`

### RED-first proof

Exact Astra mutant applied to `src/vtt/blind-intent-resolver.ts`:

```ts
const copiedQueries: EngineQueryPort = { ...offerEnvironment.queries };
const current = copiedQueries.tokenPosition(input.state, actor.id);
```

SHA evidence:

- Before: `580dffd5a08daf2608821623bf420056f2e441ec98abe7af55a8dad479860fcb`
- Mutated: `bf01cb2bcb0a03aa3f8e1c773aeb3e3660d883c053a4456b7bfad0f82141f90a`

The checker exited 1:

```text
src/vtt/blind-intent-resolver.ts:708: EngineQueryPort object literal is forbidden outside its implementation
src/vtt/blind-intent-resolver.ts:708: spreading an EngineQueryPort into a new object is forbidden
```

Restored using the pristine `/tmp` copy:

```text
580dffd5a08daf2608821623bf420056f2e441ec98abe7af55a8dad479860fcb
```

### Final verification

```text
npx tsc --noEmit -p tsconfig.app.json
exit 0

npx tsc --noEmit -p tsconfig.node.json
exit 0
```

`node scripts/check-command-outcomes.mjs` exited 0. Its final output was:

```text
offers format probes: offers-format-env-retyped.ts=1, offers-format-policy-retyped.ts=1, offers-format-catalog-retyped.ts=1, offers-format-imported.ts=0
query-port construction probes: literal-and-clones=8, spread=1, test-double=0
offer-environment architecture: 1622 TypeScript files checked
runtime export allowlist: buildOfferEnvironment only
```

Unqualified self-test exited 0:

```text
offer-environment architecture self-test: 77 active fixtures passed
query-port construction probes: literal-and-clones=8, spread=1, test-double=0
```

Structural gates:

```text
npx sg scan --config sgconfig.yml src tools tests
exit 0

npx sg test --config sgconfig.yml --test-dir ast-grep-tests --skip-snapshot-tests --include-off
1 passed; 0 failed
```

Targeted Vitest run: 14 files, 160/160 tests passed.

```text
offer-environment.test.ts                 17/17
offer-environment-identity.test.ts         3/3
offer-environment-board-sequence.test.ts   1/1
ai-dm-legacy-invariance.test.ts           10/10
engine-mcp-server.test.ts                 15/15
legendary-windows.test.ts                  6/6
blind-intent-resolver.test.ts             13/13
speculative-planning.test.ts              23/23
handoff-bootstrap.test.ts                  5/5
handoff-contract.test.ts                   5/5
handoff-examples.test.ts                   6/6
handoff-package-contract.test.ts           1/1
handoff-publish.test.ts                    6/6
handoff-report.test.ts                    49/49
```

The production scan confirms the legitimate implementation, builder query reads, and repository test doubles remain accepted.

Additional checks:

```text
git diff --check
exit 0

Discovery: 643 files

Maximum checker line length: 120
Lines over 120: 0
```

Hashes:

```text
package-lock.json:
26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867

src/vtt/intel/contracts.ts:
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1

Frozen plan:
fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4
```

Final status:

```text
 M scripts/check-offer-environment-architecture.mjs
```

Diff: 1 file, 190 insertions, 1 deletion.

S3 B15 FIX DONE
