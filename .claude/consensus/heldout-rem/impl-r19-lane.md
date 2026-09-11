Implemented Rule C.4 placement-prefix tracking in the two authorized files:

- Configuration bindings now retain every placement path.
- Descendant and const-alias paths compose with those placements.
- Any semantic placement through `resolve`, `test`, or `alias` makes all descendants alias-capable.
- Multiple placements use fail-closed union semantics.
- Numeric array indexes are treated as constant address keys.
- Added five F64 regressions plus alias-discovery and non-capable plugin controls.

Changed files: 2; 226 insertions, 46 deletions.

Verification:

- `npm run typecheck:fast` — exit 0.
- `sg scan` — exit 0, no findings.
- `git diff --check` — exit 0.
- `npx vitest run --configLoader runner tests/unit/tools/heldout-leak-check.test.ts` — exit 0:
  - `Test Files  1 passed (1)`
  - `Tests  338 passed (338)`
- Nine-spec cumulative command — exit 0:
  - `Test Files  9 passed (9)`
  - `Tests  574 passed (574)`

Cumulative specs:

- `tests/unit/vtt/heldout-evaluation.test.ts`
- `tests/unit/vtt/room-generator.test.ts`
- `tests/unit/vtt/room-generator-los-cover.test.ts`
- `tests/unit/vtt/reference-party-size.test.ts`
- `tests/unit/vtt/scripted-party-round.test.ts`
- `tests/integration/tools/generate-heldout-party-basis.test.ts`
- `tests/unit/tools/generate-arena-basis.test.ts`
- `tests/unit/tools/heldout-leak-check.test.ts`
- `tests/integration/vtt/stored-character-party-member.test.ts`

Integrity:

- All 66 fixture hashes unchanged; manifest digest remains `e14bea57faaa802988126d45eb062bc34da0e6584afe34a66f1fc390011a00cc`.
- Frozen contract digest remains `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.
- Worktree changes are limited to the authorized tool and test file.
- Full logs: [.tmp/heldout-s1-rem-01-r19](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r19)

HELDOUT-REM R19 DONE
diff --git a/tests/unit/tools/heldout-leak-check.test.ts b/tests/unit/tools/heldout-leak-check.test.ts
index 4c190c927fdd571189f57c4948426926a56d5d31..2dbcf9693adea24f302544c0845bf924e9f0d916
--- a/tests/unit/tools/heldout-leak-check.test.ts
+++ b/tests/unit/tools/heldout-leak-check.test.ts
@@ -318,6 +318,7 @@
         'Rule C interprets Vite and Vitest aliases only as strict literals in the exact-node graph reached from export default, symbol-proven defineConfig or mergeConfig, factory returns, conditional branches, and same-file const object/array composition',
         'Rule C uses no flow tracking: each tracked-const reference is classified by its maximal constant-key address, including whether its path crosses resolve, test, or alias, the addressed subtree, and its immediate syntactic position',
         'Rule C classifies configuration roots, resolve/test/alias bindings, and bindings spread transitively into those containers as alias-capable regardless of current literal contents',
+        'Rule C records every configuration placement prefix for a binding and composes each prefix with descendant and const-alias paths; any semantic placement makes the reference alias-capable',
         'Rule C permits non-exported plain-const aliases to preserve the same addressed subtree and allows non-alias-bearing subtrees in otherwise escaping positions',
         'subtrees strictly below a configuration root at nonsemantic addresses remain non-alias-capable unless their contents or binding position makes them capable',
         'resolve and Vitest test are alias-capable containers whose values must be literal objects or tracked const literals; their alias values are interpreted identically',
@@ -2265,6 +2266,87 @@
       finding.kind === 'unresolved_module_edge')).toBe(unresolved);
   });
 
+  it.each([
+    ['resolve alias-array entry', 'vite.config.mjs', [
+      "const rules = [{ find: '@ordinary', replacement: '/ordinary' }];",
+      "install(rules['0']);",
+      'export default { resolve: { alias: rules } };',
+    ].join('\n')],
+    ['const alias of a resolve alias-array entry', 'vite.config.mjs', [
+      "const rules = [{ find: '@ordinary', replacement: '/ordinary' }];",
+      "const entry = rules['0'];",
+      'install(entry);',
+      'export default { resolve: { alias: rules } };',
+    ].join('\n')],
+    ['test alias-array entry', 'vitest.config.mjs', [
+      "const rules = [{ find: '@ordinary', replacement: '/ordinary' }];",
+      'install(rules[0]);',
+      'export default { test: { alias: rules } };',
+    ].join('\n')],
+    ['spread alias-array entry source', 'vite.config.mjs', [
+      "const entries = [{ find: '@a', replacement: '/lit' }];",
+      'export default { resolve: { alias: [...entries] } };',
+      'install(entries[0]);',
+    ].join('\n')],
+    ['entry from a multiply placed alias array', 'vite.config.mjs', [
+      "const rules = [{ find: '@ordinary', replacement: '/ordinary' }];",
+      'install(rules[0]);',
+      'export default { plugins: rules, resolve: { alias: rules } };',
+    ].join('\n')],
+  ] as const)('fails closed for %s using its semantic placement prefix',
+  (_label, path, configSource) => {
+    const report = inspectHeldoutLeakChanges([{
+      path,
+      addedText: configSource,
+      sourceText: configSource,
+    }], 'F', bindings);
+
+    expect(report.findings).toContainEqual(expect.objectContaining({
+      path,
+      kind: 'unresolved_module_edge',
+    }));
+  });
+
+  it('discovers an unescaped alias-array binding at its semantic placement', () => {
+    const configSource = [
+      "const rules = [{ find: '@x', replacement: '/lit' }];",
+      'export default { resolve: { alias: rules } };',
+    ].join('\n');
+    const report = inspectHeldoutLeakChanges([{
+      path: 'vite.config.mjs',
+      addedText: configSource,
+      sourceText: configSource,
+    }], 'F', bindings, {
+      candidateSourceFiles: {
+        'src/ui/placement-prefix-control.ts': "import value from '@x';",
+      },
+    });
+
+    expect(report.findings).not.toContainEqual(expect.objectContaining({
+      path: 'vite.config.mjs',
+      kind: 'unresolved_module_edge',
+    }));
+    expect(report.findings).toContainEqual(expect.objectContaining({
+      path: 'src/ui/placement-prefix-control.ts',
+      kind: 'unresolved_module_edge',
+    }));
+  });
+
+  it('keeps an escaped plugin-list entry non-alias-capable', () => {
+    const configSource = [
+      "const list = [{ name: 'p' }];",
+      'install(list[0]);',
+      'export default { plugins: list };',
+    ].join('\n');
+    const report = inspectHeldoutLeakChanges([{
+      path: 'vite.config.mjs',
+      addedText: configSource,
+      sourceText: configSource,
+    }], 'F', bindings);
+
+    expect(report.findings).toEqual([]);
+  });
+
   it('interprets a symbol-proven defineConfig callback, conditional, and const spread', () => {
     const configSource = [
       "import { defineConfig } from 'vite';",
diff --git a/tools/heldout-leak-check.ts b/tools/heldout-leak-check.ts
index 7ff27c8fc3f003647b7530bac440e2ef795390d2..1ea390c06e9dba82af855123904186810e088e8d
--- a/tools/heldout-leak-check.ts
+++ b/tools/heldout-leak-check.ts
@@ -187,7 +187,7 @@
 /** Rule N/Rule C audit: every expression-flow position is interpreted or fails closed. */
 export const HELDOUT_LEAK_FLOW_AUDIT = [
   { position: 'declaration initializer', loaderValues: 'Rule N1 permits only a plain const namespace alias; Rule N2 permits inert browser-global transfer', configurationReferences: 'Rule C permits exact non-exported const aliases of statically addressed subtrees and fails closed for alias-bearing let, var, destructuring, or exported initializers' },
-  { position: 'member receiver', loaderValues: 'Rule N1 permits direct namespace receipt; Rule N2 validates browser loader members by symbol at use', configurationReferences: 'Rule C extends the static address through constant property and element reads; paths crossing resolve, test, or alias are alias-bearing and nonconstant addresses fail closed' },
+  { position: 'member receiver', loaderValues: 'Rule N1 permits direct namespace receipt; Rule N2 validates browser loader members by symbol at use', configurationReferences: 'Rule C composes every placement prefix with constant property and element reads; any effective path crossing resolve, test, or alias is alias-bearing and nonconstant addresses fail closed' },
   { position: 'assignment', loaderValues: 'Rule N1 failed_closed; Rule N2 browser globals remain inert until loader-member use', configurationReferences: 'Rule C always fails closed on mutation targets and fails closed on alias-bearing assignment values' },
   { position: 'destructuring declaration', loaderValues: 'Rule N1 and Rule N2 track recognized loader keys and fail_closed for any loader key extracted from an unknown source', configurationReferences: 'Rule C fails closed when an alias-bearing subtree enters a binding pattern' },
   { position: 'destructuring assignment', loaderValues: 'Rule N1 and Rule N2 track recognized loader keys and fail_closed for any loader key extracted from an unknown source', configurationReferences: 'Rule C fails closed on assignment-pattern targets and alias-bearing assignment values' },
@@ -240,6 +240,7 @@
     'Rule C interprets Vite and Vitest aliases only as strict literals in the exact-node graph reached from export default, symbol-proven defineConfig or mergeConfig, factory returns, conditional branches, and same-file const object/array composition',
     'Rule C uses no flow tracking: each tracked-const reference is classified by its maximal constant-key address, including whether its path crosses resolve, test, or alias, the addressed subtree, and its immediate syntactic position',
     'Rule C classifies configuration roots, resolve/test/alias bindings, and bindings spread transitively into those containers as alias-capable regardless of current literal contents',
+    'Rule C records every configuration placement prefix for a binding and composes each prefix with descendant and const-alias paths; any semantic placement makes the reference alias-capable',
     'Rule C permits non-exported plain-const aliases to preserve the same addressed subtree and allows non-alias-bearing subtrees in otherwise escaping positions',
     'subtrees strictly below a configuration root at nonsemantic addresses remain non-alias-capable unless their contents or binding position makes them capable',
     'resolve and Vitest test are alias-capable containers whose values must be literal objects or tracked const literals; their alias values are interpreted identically',
@@ -310,7 +311,10 @@
 function propertyKey(expression: ts.Expression): string | null {
   const unwrapped = unwrapTransparentExpression(expression);
   if (ts.isPropertyAccessExpression(unwrapped)) return unwrapped.name.text;
-  if (ts.isElementAccessExpression(unwrapped)) return constantString(unwrapped.argumentExpression);
+  if (ts.isElementAccessExpression(unwrapped)) {
+    const argument = unwrapTransparentExpression(unwrapped.argumentExpression);
+    return ts.isNumericLiteral(argument) ? argument.text : constantString(argument);
+  }
   return null;
 }
 
@@ -2011,7 +2015,18 @@
   const reachableSymbols = new Map<ts.Symbol, ts.VariableDeclaration>();
   const aliasCapableSymbols = new Set<ts.Symbol>();
   const rootConfigurationSymbols = new Set<ts.Symbol>();
+  const placementPrefixes = new Map<ts.Symbol, string[][]>();
   const visitingSymbols = new Set<ts.Symbol>();
+  const semanticConfigurationKey = (key: string): boolean =>
+    key === 'resolve' || key === 'test' || key === 'alias';
+  const recordPlacement = (symbol: ts.Symbol, path: readonly string[]): boolean => {
+    const placements = placementPrefixes.get(symbol) ?? [];
+    if (placements.some((candidate) => candidate.length === path.length &&
+      candidate.every((key, index) => key === path[index]))) return false;
+    placements.push([...path]);
+    placementPrefixes.set(symbol, placements);
+    return true;
+  };
   const regexAlias = (
     expression: ts.Expression,
   ): { readonly source: string; readonly flags: string } | null => {
@@ -2139,25 +2154,44 @@
     visitReturn(body);
     return returned;
   };
-  const visitAliasValue = (expression: ts.Expression): void => {
+  const visitAliasValue = (expression: ts.Expression, path: readonly string[]): void => {
     const value = unwrapTransparentExpression(expression);
     if (ts.isIdentifier(value)) {
-      const symbol = visitReachableIdentifier(value, visitAliasValue);
-      if (symbol !== null) aliasCapableSymbols.add(symbol);
+      const symbol = visitReachableIdentifier(value, (initializer) =>
+        visitAliasValue(initializer, path));
+      if (symbol !== null) {
+        aliasCapableSymbols.add(symbol);
+        recordPlacement(symbol, path);
+      }
       return;
     }
     reachableNodes.add(value);
     collectAliasInitializer(value);
   };
-  const visitOrdinaryPropertyValue = (expression: ts.Expression): void => {
+  const visitOrdinaryPropertyValue = (
+    expression: ts.Expression,
+    path: readonly string[],
+  ): void => {
     const value = unwrapTransparentExpression(expression);
-    if (ts.isObjectLiteralExpression(value)) visitReachableObject(value);
+    if (ts.isObjectLiteralExpression(value)) visitReachableObject(value, path);
+    else if (ts.isIdentifier(value)) {
+      const resolved = declarationForReachableIdentifier(value);
+      if (resolved !== null) {
+        reachableNodes.add(value);
+        reachableSymbols.set(resolved.symbol, resolved.declaration);
+        recordPlacement(resolved.symbol, path);
+      }
+    }
   };
-  const visitResolveObject = (expression: ts.Expression): void => {
+  const visitResolveObject = (expression: ts.Expression, path: readonly string[]): void => {
     const value = unwrapTransparentExpression(expression);
     if (ts.isIdentifier(value)) {
-      const symbol = visitReachableIdentifier(value, visitResolveObject);
-      if (symbol !== null) aliasCapableSymbols.add(symbol);
+      const symbol = visitReachableIdentifier(value, (initializer) =>
+        visitResolveObject(initializer, path));
+      if (symbol !== null) {
+        aliasCapableSymbols.add(symbol);
+        recordPlacement(symbol, path);
+      }
       return;
     }
     if (!ts.isObjectLiteralExpression(value)) {
@@ -2170,8 +2204,12 @@
         reachableNodes.add(property);
         const spread = unwrapTransparentExpression(property.expression);
         if (ts.isIdentifier(spread)) {
-          const symbol = visitReachableIdentifier(spread, visitResolveObject);
-          if (symbol !== null) aliasCapableSymbols.add(symbol);
+          const symbol = visitReachableIdentifier(spread, (initializer) =>
+            visitResolveObject(initializer, path));
+          if (symbol !== null) {
+            aliasCapableSymbols.add(symbol);
+            recordPlacement(symbol, path);
+          }
         }
         else unresolved = true;
         continue;
@@ -2179,10 +2217,9 @@
       if (ts.isShorthandPropertyAssignment(property)) {
         reachableNodes.add(property);
         if (property.name.text === 'alias') {
-          const symbol = visitReachableIdentifier(property.name, visitAliasValue);
-          if (symbol !== null) aliasCapableSymbols.add(symbol);
+          visitAliasValue(property.name, [...path, 'alias']);
         } else if (property.name.text === 'resolve' || property.name.text === 'test') {
-          visitResolveObject(property.name);
+          visitResolveObject(property.name, [...path, property.name.text]);
         }
         continue;
       }
@@ -2192,14 +2229,15 @@
       }
       reachableNodes.add(property);
       const key = propertyNameText(property.name);
-      if (key === 'alias') visitAliasValue(property.initializer);
-      else if (key === 'resolve' || key === 'test') visitResolveObject(property.initializer);
-      else visitOrdinaryPropertyValue(property.initializer);
+      if (key === 'alias') visitAliasValue(property.initializer, [...path, key]);
+      else if (key === 'resolve' || key === 'test') {
+        visitResolveObject(property.initializer, [...path, key]);
+      } else if (key !== null) visitOrdinaryPropertyValue(property.initializer, [...path, key]);
     }
   };
   const visitReachableObject = (
     object: ts.ObjectLiteralExpression,
-    aliasCapableContainer = false,
+    path: readonly string[],
   ): void => {
     reachableNodes.add(object);
     for (const property of object.properties) {
@@ -2208,8 +2246,13 @@
         const spread = unwrapTransparentExpression(property.expression);
         if (ts.isIdentifier(spread)) {
           const symbol = visitReachableIdentifier(spread, (initializer) =>
-            visitReachableExpression(initializer, aliasCapableContainer));
-          if (symbol !== null && aliasCapableContainer) aliasCapableSymbols.add(symbol);
+            visitReachableExpression(initializer, path));
+          if (symbol !== null) {
+            recordPlacement(symbol, path);
+            if (path.length === 0 || path.some(semanticConfigurationKey)) {
+              aliasCapableSymbols.add(symbol);
+            }
+          }
         }
         else unresolved = true;
         continue;
@@ -2217,11 +2260,11 @@
       if (ts.isShorthandPropertyAssignment(property)) {
         reachableNodes.add(property);
         if (property.name.text === 'resolve' || property.name.text === 'test') {
-          const symbol = visitReachableIdentifier(property.name, visitResolveObject);
-          if (symbol !== null) aliasCapableSymbols.add(symbol);
+          visitResolveObject(property.name, [...path, property.name.text]);
         } else if (property.name.text === 'alias') {
-          const symbol = visitReachableIdentifier(property.name, visitAliasValue);
-          if (symbol !== null) aliasCapableSymbols.add(symbol);
+          visitAliasValue(property.name, [...path, 'alias']);
+        } else {
+          visitOrdinaryPropertyValue(property.name, [...path, property.name.text]);
         }
         continue;
       }
@@ -2231,31 +2274,44 @@
       }
       reachableNodes.add(property);
       const key = propertyNameText(property.name);
-      if (key === 'resolve' || key === 'test') visitResolveObject(property.initializer);
-      else if (key === 'alias') visitAliasValue(property.initializer);
-      else visitOrdinaryPropertyValue(property.initializer);
+      if (key === 'resolve' || key === 'test') {
+        visitResolveObject(property.initializer, [...path, key]);
+      } else if (key === 'alias') visitAliasValue(property.initializer, [...path, key]);
+      else if (key !== null) visitOrdinaryPropertyValue(property.initializer, [...path, key]);
     }
   };
-  const visitReachableArray = (array: ts.ArrayLiteralExpression): void => {
+  const visitReachableArray = (
+    array: ts.ArrayLiteralExpression,
+    path: readonly string[],
+  ): void => {
     reachableNodes.add(array);
-    for (const element of array.elements) {
+    for (const [index, element] of array.elements.entries()) {
       if (ts.isOmittedExpression(element)) continue;
       reachableNodes.add(element);
       if (ts.isSpreadElement(element)) {
         const spread = unwrapTransparentExpression(element.expression);
-        if (ts.isIdentifier(spread)) visitReachableIdentifier(spread, visitReachableExpression);
+        if (ts.isIdentifier(spread)) {
+          const symbol = visitReachableIdentifier(spread, (initializer) =>
+            visitReachableExpression(initializer, path));
+          if (symbol !== null) recordPlacement(symbol, path);
+        }
         else unresolved = true;
         continue;
       }
       const unwrapped = unwrapTransparentExpression(element);
-      if (ts.isIdentifier(unwrapped)) visitReachableIdentifier(unwrapped, visitReachableExpression);
+      if (ts.isIdentifier(unwrapped)) {
+        const elementPath = [...path, String(index)];
+        const symbol = visitReachableIdentifier(unwrapped, (initializer) =>
+          visitReachableExpression(initializer, elementPath));
+        if (symbol !== null) recordPlacement(symbol, elementPath);
+      }
       else if (ts.isObjectLiteralExpression(unwrapped) || ts.isArrayLiteralExpression(unwrapped)) {
-        visitReachableExpression(unwrapped);
+        visitReachableExpression(unwrapped, [...path, String(index)]);
       } else unresolved = true;
     }
   };
   const visitReachableFunction = (fn: ts.ArrowFunction | ts.FunctionExpression): void => {
-    for (const expression of returnedExpressions(fn.body)) visitReachableExpression(expression, true);
+    for (const expression of returnedExpressions(fn.body)) visitReachableExpression(expression, []);
   };
   function visitReachableIdentifier(
     identifier: ts.Identifier,
@@ -2279,20 +2335,23 @@
   }
   function visitReachableExpression(
     expression: ts.Expression,
-    rootPosition = false,
+    path: readonly string[],
   ): void {
     const value = unwrapTransparentExpression(expression);
     if (ts.isObjectLiteralExpression(value)) {
-      visitReachableObject(value, rootPosition);
+      visitReachableObject(value, path);
     } else if (ts.isArrayLiteralExpression(value)) {
-      visitReachableArray(value);
+      visitReachableArray(value, path);
     } else if (ts.isIdentifier(value)) {
       const symbol = visitReachableIdentifier(value, (initializer) =>
-        visitReachableExpression(initializer, rootPosition));
-      if (symbol !== null && rootPosition) rootConfigurationSymbols.add(symbol);
+        visitReachableExpression(initializer, path));
+      if (symbol !== null) {
+        recordPlacement(symbol, path);
+        if (path.length === 0) rootConfigurationSymbols.add(symbol);
+      }
     } else if (ts.isConditionalExpression(value)) {
-      visitReachableExpression(value.whenTrue, rootPosition);
-      visitReachableExpression(value.whenFalse, rootPosition);
+      visitReachableExpression(value.whenTrue, path);
+      visitReachableExpression(value.whenFalse, path);
     } else if (ts.isArrowFunction(value) || ts.isFunctionExpression(value)) {
       visitReachableFunction(value);
     } else if (ts.isCallExpression(value)) {
@@ -2300,11 +2359,11 @@
       if (helper === 'defineConfig' && value.arguments.length === 1) {
         const argument = value.arguments[0];
         if (argument === undefined || ts.isSpreadElement(argument)) unresolved = true;
-        else visitReachableExpression(argument, true);
+        else visitReachableExpression(argument, []);
       } else if (helper === 'mergeConfig' && value.arguments.length === 2) {
         for (const argument of value.arguments) {
           if (ts.isSpreadElement(argument)) unresolved = true;
-          else visitReachableExpression(argument, true);
+          else visitReachableExpression(argument, []);
         }
       } else unresolved = true;
     } else {
@@ -2315,7 +2374,7 @@
     ts.isExportAssignment(statement) && !statement.isExportEquals);
   const exported = exportAssignments[0];
   if (exportAssignments.length !== 1 || exported === undefined) unresolved = true;
-  else visitReachableExpression(exported.expression, true);
+  else visitReachableExpression(exported.expression, []);
   const isAssignmentOperator = (kind: ts.SyntaxKind): boolean =>
     kind >= ts.SyntaxKind.FirstAssignment && kind <= ts.SyntaxKind.LastAssignment;
   const isUpdateOperator = (kind: ts.SyntaxKind): boolean =>
@@ -2327,6 +2386,7 @@
   interface ConfigurationReferenceAddress extends ConfigurationAddress {
     readonly binding: ts.Symbol;
     readonly relativePath: readonly string[];
+    readonly effectivePaths: readonly (readonly string[])[];
   }
   const referenceChain = (
     identifier: ts.Identifier,
@@ -2430,6 +2490,38 @@
     };
     collectConstAliases(sourceFile);
   }
+  let placementsChanged = true;
+  while (placementsChanged) {
+    placementsChanged = false;
+    const propagateConstPlacements = (node: ts.Node): void => {
+      if (ts.isVariableDeclaration(node) && node.initializer !== undefined &&
+        isNonExportedPlainConst(node) && ts.isIdentifier(node.name)) {
+        const targetSymbol = symbolAt(node.name);
+        const targetAddress = targetSymbol === undefined
+          ? undefined
+          : configurationAddresses.get(targetSymbol);
+        const sourceSymbol = baseSymbolForExpression(node.initializer);
+        const sourceAddress = sourceSymbol === null
+          ? undefined
+          : configurationAddresses.get(sourceSymbol);
+        if (targetSymbol !== undefined && targetAddress !== undefined &&
+          sourceSymbol !== null && sourceAddress !== undefined &&
+          targetAddress.root === sourceAddress.root &&
+          targetAddress.path.length >= sourceAddress.path.length &&
+          sourceAddress.path.every((key, index) => key === targetAddress.path[index])) {
+          const relativePath = targetAddress.path.slice(sourceAddress.path.length);
+          for (const placement of placementPrefixes.get(sourceSymbol) ?? []) {
+            placementsChanged = recordPlacement(
+              targetSymbol,
+              [...placement, ...relativePath],
+            ) || placementsChanged;
+          }
+        }
+      }
+      ts.forEachChild(node, propagateConstPlacements);
+    };
+    propagateConstPlacements(sourceFile);
+  }
   const semanticAddressKey = (key: string): boolean =>
     key === 'resolve' || key === 'test' || key === 'alias';
   let capabilitiesChanged = true;
@@ -2564,17 +2656,23 @@
     const symbol = symbolAt(identifier);
     if (symbol === undefined || !chain.constantElements) return null;
     const base = configurationAddresses.get(symbol);
-    return base === undefined ? null : {
+    if (base === undefined) return null;
+    const placements = placementPrefixes.get(symbol);
+    return {
       root: base.root,
       path: [...base.path, ...chain.path],
       binding: symbol,
       relativePath: chain.path,
+      effectivePaths: (placements === undefined || placements.length === 0
+        ? [base.path]
+        : placements).map((placement) => [...placement, ...chain.path]),
     };
   };
   const isAliasBearing = (address: ConfigurationReferenceAddress): boolean => {
     if ((address.relativePath.length === 0 && aliasCapableSymbols.has(address.binding)) ||
       (rootConfigurationSymbols.has(address.root) && address.path.length === 0) ||
-      address.path.some(semanticAddressKey)) return true;
+      address.path.some(semanticAddressKey) || address.effectivePaths.some((path) =>
+        path.length === 0 || path.some(semanticAddressKey))) return true;
     const value = addressedValue(address);
     return value === null || value !== 'known_scalar' && subtreeContainsAliasKey(value);
   };
