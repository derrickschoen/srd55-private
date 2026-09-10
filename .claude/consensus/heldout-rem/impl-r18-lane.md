Implemented F62–F63 with positional alias capability.

Changes:

- Configuration roots are alias-capable regardless of current contents.
- `resolve`/`test`/`alias` bindings and spreads into capable containers are marked transitively.
- Nonsemantic descendants such as `shared.plugins` remain non-capable.
- Added 10 effective regression cases and controls.
- No tests deleted or weakened; only the two authorized files changed.

Validation:

- `npm run typecheck:fast` — exit 0
- `sg scan` — exit 0
- `git diff --check` — exit 0
- `npx vitest run --configLoader runner tests/unit/tools/heldout-leak-check.test.ts`
  - 1/1 file passed
  - 331/331 tests passed
- `npx vitest run --configLoader runner tests/unit/vtt/{heldout-evaluation,room-generator,room-generator-los-cover,reference-party-size,scripted-party-round}.test.ts tests/integration/tools/generate-heldout-party-basis.test.ts tests/unit/tools/{generate-arena-basis,heldout-leak-check}.test.ts tests/integration/vtt/stored-character-party-member.test.ts`
  - 9/9 files passed
  - 567/567 tests passed
- Superseded-helper and forbidden-construct searches: zero matches
- Fixture verification: 66/66 unchanged
- Fixture manifest digest: `e14bea57faaa802988126d45eb062bc34da0e6584afe34a66f1fc390011a00cc`
- Frozen contract digest: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`

Full logs: `.tmp/heldout-s1-rem-01-r18/`

HELDOUT-REM R18 DONE
diff --git a/tests/unit/tools/heldout-leak-check.test.ts b/tests/unit/tools/heldout-leak-check.test.ts
index c425c3f2a00fc31f666b95d20eb408e08de14645..4c190c927fdd571189f57c4948426926a56d5d31
--- a/tests/unit/tools/heldout-leak-check.test.ts
+++ b/tests/unit/tools/heldout-leak-check.test.ts
@@ -317,7 +317,9 @@
         'a loader-valued expression is allowed only as a direct callee with a constant specifier, a receiver leading to a recognized member call, or the whole initializer of a non-exported plain-identifier const alias',
         'Rule C interprets Vite and Vitest aliases only as strict literals in the exact-node graph reached from export default, symbol-proven defineConfig or mergeConfig, factory returns, conditional branches, and same-file const object/array composition',
         'Rule C uses no flow tracking: each tracked-const reference is classified by its maximal constant-key address, including whether its path crosses resolve, test, or alias, the addressed subtree, and its immediate syntactic position',
+        'Rule C classifies configuration roots, resolve/test/alias bindings, and bindings spread transitively into those containers as alias-capable regardless of current literal contents',
         'Rule C permits non-exported plain-const aliases to preserve the same addressed subtree and allows non-alias-bearing subtrees in otherwise escaping positions',
+        'subtrees strictly below a configuration root at nonsemantic addresses remain non-alias-capable unless their contents or binding position makes them capable',
         'resolve and Vitest test are alias-capable containers whose values must be literal objects or tracked const literals; their alias values are interpreted identically',
         'reachable object spreads require tracked const literals; computed keys, accessors, methods, and nonliteral resolve, test, or alias values fail closed, while unrelated nonliteral values are opaque',
         'root vite*.config.* and vitest*.config.* entry points are inspected, including symbol-proven defineConfig and mergeConfig imports from Vite or Vitest',
@@ -2166,6 +2168,103 @@
       finding.kind === 'unresolved_module_edge')).toBe(unresolved);
   });
 
+  it.each([
+    ['shorthand resolve', 'vite.config.mjs', [
+      'const resolve = {};',
+      'install(resolve);',
+      'export default { resolve };',
+    ].join('\n')],
+    ['shorthand test', 'vitest.config.mjs', [
+      'const test = {};',
+      'install(test);',
+      'export default { test };',
+    ].join('\n')],
+    ['spread inside test', 'vitest.config.mjs', [
+      'const parts = {};',
+      'install(parts);',
+      'export default { test: { ...parts } };',
+    ].join('\n')],
+    ['spread inside resolve', 'vite.config.mjs', [
+      'const parts = {};',
+      'install(parts);',
+      'export default { resolve: { ...parts } };',
+    ].join('\n')],
+  ] as const)('treats %s as an alias-capable binding position', (_label, path, configSource) => {
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
+  it('discovers a shorthand resolve binding without treating its declaration as an escape', () => {
+    const configSource = [
+      "const resolve = { alias: { '@x': '/lit' } };",
+      'export default { resolve };',
+    ].join('\n');
+    const report = inspectHeldoutLeakChanges([{
+      path: 'vite.config.mjs',
+      addedText: configSource,
+      sourceText: configSource,
+    }], 'F', bindings, {
+      candidateSourceFiles: {
+        'src/ui/alias-capability-control.ts': "import value from '@x';",
+      },
+    });
+
+    expect(report.findings).not.toContainEqual(expect.objectContaining({
+      path: 'vite.config.mjs',
+      kind: 'unresolved_module_edge',
+    }));
+    expect(report.findings).toContainEqual(expect.objectContaining({
+      path: 'src/ui/alias-capability-control.ts',
+      kind: 'unresolved_module_edge',
+    }));
+  });
+
+  it.each([
+    ['direct root', [
+      'const shared = {};',
+      'install(shared);',
+      'export default shared;',
+    ].join('\n'), true],
+    ['root spread', [
+      'const shared = {};',
+      'install(shared);',
+      'export default { ...shared };',
+    ].join('\n'), true],
+    ['defineConfig callback root spread', [
+      "import { defineConfig } from 'vite';",
+      'const shared = {};',
+      'install(shared);',
+      'export default defineConfig(() => ({ ...shared }));',
+    ].join('\n'), true],
+    ['plugins value', [
+      'const plugins = [];',
+      'install(plugins);',
+      'export default { plugins };',
+    ].join('\n'), false],
+    ['build value', [
+      'const build = {};',
+      'install(build);',
+      'export default { build };',
+    ].join('\n'), false],
+  ] as const)('classifies %s by positional root capability', (_label, configSource, unresolved) => {
+    const report = inspectHeldoutLeakChanges([{
+      path: 'vite.config.ts',
+      addedText: configSource,
+      sourceText: configSource,
+    }], 'F', bindings);
+
+    expect(report.findings.some((finding) => finding.path === 'vite.config.ts' &&
+      finding.kind === 'unresolved_module_edge')).toBe(unresolved);
+  });
+
   it('interprets a symbol-proven defineConfig callback, conditional, and const spread', () => {
     const configSource = [
       "import { defineConfig } from 'vite';",
diff --git a/tools/heldout-leak-check.ts b/tools/heldout-leak-check.ts
index dc66556ecb927fad6401664f235165c415aae23e..7ff27c8fc3f003647b7530bac440e2ef795390d2
--- a/tools/heldout-leak-check.ts
+++ b/tools/heldout-leak-check.ts
@@ -239,7 +239,9 @@
     'a loader-valued expression is allowed only as a direct callee with a constant specifier, a receiver leading to a recognized member call, or the whole initializer of a non-exported plain-identifier const alias',
     'Rule C interprets Vite and Vitest aliases only as strict literals in the exact-node graph reached from export default, symbol-proven defineConfig or mergeConfig, factory returns, conditional branches, and same-file const object/array composition',
     'Rule C uses no flow tracking: each tracked-const reference is classified by its maximal constant-key address, including whether its path crosses resolve, test, or alias, the addressed subtree, and its immediate syntactic position',
+    'Rule C classifies configuration roots, resolve/test/alias bindings, and bindings spread transitively into those containers as alias-capable regardless of current literal contents',
     'Rule C permits non-exported plain-const aliases to preserve the same addressed subtree and allows non-alias-bearing subtrees in otherwise escaping positions',
+    'subtrees strictly below a configuration root at nonsemantic addresses remain non-alias-capable unless their contents or binding position makes them capable',
     'resolve and Vitest test are alias-capable containers whose values must be literal objects or tracked const literals; their alias values are interpreted identically',
     'reachable object spreads require tracked const literals; computed keys, accessors, methods, and nonliteral resolve, test, or alias values fail closed, while unrelated nonliteral values are opaque',
     'root vite*.config.* and vitest*.config.* entry points are inspected, including symbol-proven defineConfig and mergeConfig imports from Vite or Vitest',
@@ -2007,7 +2009,8 @@
   };
   const reachableNodes = new Set<ts.Node>();
   const reachableSymbols = new Map<ts.Symbol, ts.VariableDeclaration>();
-  const aliasBearingSymbols = new Set<ts.Symbol>();
+  const aliasCapableSymbols = new Set<ts.Symbol>();
+  const rootConfigurationSymbols = new Set<ts.Symbol>();
   const visitingSymbols = new Set<ts.Symbol>();
   const regexAlias = (
     expression: ts.Expression,
@@ -2140,7 +2143,7 @@
     const value = unwrapTransparentExpression(expression);
     if (ts.isIdentifier(value)) {
       const symbol = visitReachableIdentifier(value, visitAliasValue);
-      if (symbol !== null) aliasBearingSymbols.add(symbol);
+      if (symbol !== null) aliasCapableSymbols.add(symbol);
       return;
     }
     reachableNodes.add(value);
@@ -2154,7 +2157,7 @@
     const value = unwrapTransparentExpression(expression);
     if (ts.isIdentifier(value)) {
       const symbol = visitReachableIdentifier(value, visitResolveObject);
-      if (symbol !== null) aliasBearingSymbols.add(symbol);
+      if (symbol !== null) aliasCapableSymbols.add(symbol);
       return;
     }
     if (!ts.isObjectLiteralExpression(value)) {
@@ -2166,7 +2169,10 @@
       if (ts.isSpreadAssignment(property)) {
         reachableNodes.add(property);
         const spread = unwrapTransparentExpression(property.expression);
-        if (ts.isIdentifier(spread)) visitReachableIdentifier(spread, visitResolveObject);
+        if (ts.isIdentifier(spread)) {
+          const symbol = visitReachableIdentifier(spread, visitResolveObject);
+          if (symbol !== null) aliasCapableSymbols.add(symbol);
+        }
         else unresolved = true;
         continue;
       }
@@ -2174,7 +2180,7 @@
         reachableNodes.add(property);
         if (property.name.text === 'alias') {
           const symbol = visitReachableIdentifier(property.name, visitAliasValue);
-          if (symbol !== null) aliasBearingSymbols.add(symbol);
+          if (symbol !== null) aliasCapableSymbols.add(symbol);
         } else if (property.name.text === 'resolve' || property.name.text === 'test') {
           visitResolveObject(property.name);
         }
@@ -2191,23 +2197,31 @@
       else visitOrdinaryPropertyValue(property.initializer);
     }
   };
-  const visitReachableObject = (object: ts.ObjectLiteralExpression): void => {
+  const visitReachableObject = (
+    object: ts.ObjectLiteralExpression,
+    aliasCapableContainer = false,
+  ): void => {
     reachableNodes.add(object);
     for (const property of object.properties) {
       if (ts.isSpreadAssignment(property)) {
         reachableNodes.add(property);
         const spread = unwrapTransparentExpression(property.expression);
-        if (ts.isIdentifier(spread)) visitReachableIdentifier(spread, visitReachableExpression);
+        if (ts.isIdentifier(spread)) {
+          const symbol = visitReachableIdentifier(spread, (initializer) =>
+            visitReachableExpression(initializer, aliasCapableContainer));
+          if (symbol !== null && aliasCapableContainer) aliasCapableSymbols.add(symbol);
+        }
         else unresolved = true;
         continue;
       }
       if (ts.isShorthandPropertyAssignment(property)) {
         reachableNodes.add(property);
         if (property.name.text === 'resolve' || property.name.text === 'test') {
-          visitReachableIdentifier(property.name, visitResolveObject);
+          const symbol = visitReachableIdentifier(property.name, visitResolveObject);
+          if (symbol !== null) aliasCapableSymbols.add(symbol);
         } else if (property.name.text === 'alias') {
           const symbol = visitReachableIdentifier(property.name, visitAliasValue);
-          if (symbol !== null) aliasBearingSymbols.add(symbol);
+          if (symbol !== null) aliasCapableSymbols.add(symbol);
         }
         continue;
       }
@@ -2241,7 +2255,7 @@
     }
   };
   const visitReachableFunction = (fn: ts.ArrowFunction | ts.FunctionExpression): void => {
-    for (const expression of returnedExpressions(fn.body)) visitReachableExpression(expression);
+    for (const expression of returnedExpressions(fn.body)) visitReachableExpression(expression, true);
   };
   function visitReachableIdentifier(
     identifier: ts.Identifier,
@@ -2263,17 +2277,22 @@
     visitingSymbols.delete(resolved.symbol);
     return resolved.symbol;
   }
-  function visitReachableExpression(expression: ts.Expression): void {
+  function visitReachableExpression(
+    expression: ts.Expression,
+    rootPosition = false,
+  ): void {
     const value = unwrapTransparentExpression(expression);
     if (ts.isObjectLiteralExpression(value)) {
-      visitReachableObject(value);
+      visitReachableObject(value, rootPosition);
     } else if (ts.isArrayLiteralExpression(value)) {
       visitReachableArray(value);
     } else if (ts.isIdentifier(value)) {
-      visitReachableIdentifier(value, visitReachableExpression);
+      const symbol = visitReachableIdentifier(value, (initializer) =>
+        visitReachableExpression(initializer, rootPosition));
+      if (symbol !== null && rootPosition) rootConfigurationSymbols.add(symbol);
     } else if (ts.isConditionalExpression(value)) {
-      visitReachableExpression(value.whenTrue);
-      visitReachableExpression(value.whenFalse);
+      visitReachableExpression(value.whenTrue, rootPosition);
+      visitReachableExpression(value.whenFalse, rootPosition);
     } else if (ts.isArrowFunction(value) || ts.isFunctionExpression(value)) {
       visitReachableFunction(value);
     } else if (ts.isCallExpression(value)) {
@@ -2281,11 +2300,11 @@
       if (helper === 'defineConfig' && value.arguments.length === 1) {
         const argument = value.arguments[0];
         if (argument === undefined || ts.isSpreadElement(argument)) unresolved = true;
-        else visitReachableExpression(argument);
+        else visitReachableExpression(argument, true);
       } else if (helper === 'mergeConfig' && value.arguments.length === 2) {
         for (const argument of value.arguments) {
           if (ts.isSpreadElement(argument)) unresolved = true;
-          else visitReachableExpression(argument);
+          else visitReachableExpression(argument, true);
         }
       } else unresolved = true;
     } else {
@@ -2296,7 +2315,7 @@
     ts.isExportAssignment(statement) && !statement.isExportEquals);
   const exported = exportAssignments[0];
   if (exportAssignments.length !== 1 || exported === undefined) unresolved = true;
-  else visitReachableExpression(exported.expression);
+  else visitReachableExpression(exported.expression, true);
   const isAssignmentOperator = (kind: ts.SyntaxKind): boolean =>
     kind >= ts.SyntaxKind.FirstAssignment && kind <= ts.SyntaxKind.LastAssignment;
   const isUpdateOperator = (kind: ts.SyntaxKind): boolean =>
@@ -2305,6 +2324,10 @@
     readonly root: ts.Symbol;
     readonly path: readonly string[];
   }
+  interface ConfigurationReferenceAddress extends ConfigurationAddress {
+    readonly binding: ts.Symbol;
+    readonly relativePath: readonly string[];
+  }
   const referenceChain = (
     identifier: ts.Identifier,
   ): {
@@ -2383,6 +2406,13 @@
       ? null
       : { root: receiver.root, path: [...receiver.path, key] };
   };
+  const baseSymbolForExpression = (expression: ts.Expression): ts.Symbol | null => {
+    const value = unwrapTransparentExpression(expression);
+    if (ts.isIdentifier(value)) return symbolAt(value) ?? null;
+    return ts.isPropertyAccessExpression(value) || ts.isElementAccessExpression(value)
+      ? baseSymbolForExpression(value.expression)
+      : null;
+  };
   let aliasesChanged = true;
   while (aliasesChanged) {
     aliasesChanged = false;
@@ -2400,6 +2430,40 @@
     };
     collectConstAliases(sourceFile);
   }
+  const semanticAddressKey = (key: string): boolean =>
+    key === 'resolve' || key === 'test' || key === 'alias';
+  let capabilitiesChanged = true;
+  while (capabilitiesChanged) {
+    capabilitiesChanged = false;
+    const propagateConstCapabilities = (node: ts.Node): void => {
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
+        const sameAddress = targetAddress !== undefined && sourceAddress !== undefined &&
+          targetAddress.root === sourceAddress.root &&
+          targetAddress.path.length === sourceAddress.path.length &&
+          targetAddress.path.every((key, index) => key === sourceAddress.path[index]);
+        const capable = targetAddress !== undefined && (
+          targetAddress.path.some(semanticAddressKey) ||
+          (rootConfigurationSymbols.has(targetAddress.root) && targetAddress.path.length === 0) ||
+          (sameAddress && sourceSymbol !== null && aliasCapableSymbols.has(sourceSymbol))
+        );
+        if (capable && targetSymbol !== undefined && !aliasCapableSymbols.has(targetSymbol)) {
+          aliasCapableSymbols.add(targetSymbol);
+          capabilitiesChanged = true;
+        }
+      }
+      ts.forEachChild(node, propagateConstCapabilities);
+    };
+    propagateConstCapabilities(sourceFile);
+  }
   const rootDeclaration = (address: ConfigurationAddress): ts.VariableDeclaration | null =>
     reachableSymbols.get(address.root) ?? null;
   const propertyValue = (
@@ -2496,16 +2560,21 @@
   const addressForReference = (
     identifier: ts.Identifier,
     chain: ReturnType<typeof referenceChain>,
-  ): ConfigurationAddress | null => {
+  ): ConfigurationReferenceAddress | null => {
     const symbol = symbolAt(identifier);
-    const base = symbol === undefined ? undefined : configurationAddresses.get(symbol);
-    return base === undefined || !chain.constantElements
-      ? null
-      : { root: base.root, path: [...base.path, ...chain.path] };
+    if (symbol === undefined || !chain.constantElements) return null;
+    const base = configurationAddresses.get(symbol);
+    return base === undefined ? null : {
+      root: base.root,
+      path: [...base.path, ...chain.path],
+      binding: symbol,
+      relativePath: chain.path,
+    };
   };
-  const isAliasBearing = (address: ConfigurationAddress): boolean => {
-    if (aliasBearingSymbols.has(address.root) ||
-      address.path.some((key) => key === 'resolve' || key === 'test' || key === 'alias')) return true;
+  const isAliasBearing = (address: ConfigurationReferenceAddress): boolean => {
+    if ((address.relativePath.length === 0 && aliasCapableSymbols.has(address.binding)) ||
+      (rootConfigurationSymbols.has(address.root) && address.path.length === 0) ||
+      address.path.some(semanticAddressKey)) return true;
     const value = addressedValue(address);
     return value === null || value !== 'known_scalar' && subtreeContainsAliasKey(value);
   };
