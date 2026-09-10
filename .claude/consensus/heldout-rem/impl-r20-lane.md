Implemented F65 and F66 in the two authorized files.

- Indirect dereferences now union outer placement paths with every embedded tracked binding’s placements.
- Const aliases and two-level indirection retain semantic placement provenance.
- `test.projects` array elements are treated as nested configuration roots.
- Ordinary shorthand and literal-array bindings are visited.
- Documented installed Vitest 4 behavior: `test.projects` is consumed; removed `test.workspace` is not.
- Added eight regression cases across four test declarations; no tests deleted.

Verification:

- `npm run typecheck:fast` — exit 0.
- `sg scan` — exit 0, no findings.
- `git diff --check` — exit 0, empty output.
- `npx vitest run --configLoader runner tests/unit/tools/heldout-leak-check.test.ts` — exit 0:
  - `Test Files  1 passed (1)`
  - `Tests  346 passed (346)`
- Exact nine-spec cumulative command — exit 0:
  - `Test Files  9 passed (9)`
  - `Tests  582 passed (582)`

Integrity:

- All 66 fixture hashes unchanged.
- Fixture manifest digest: `e14bea57faaa802988126d45eb062bc34da0e6584afe34a66f1fc390011a00cc`.
- Frozen contract digest: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef sand18e1`.
- Only the authorized tool and test files changed.
- Full logs: [.tmp/heldout-s1-rem-01-r20](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r20)

HELDOUT-REM R20 DONE
diff --git a/tests/unit/tools/heldout-leak-check.test.ts b/tests/unit/tools/heldout-leak-check.test.ts
index 2dbcf9693adea24f302544c0845bf924e9f0d916..765b45522368b088e6bc79341dcd0dc16fcb31a2
--- a/tests/unit/tools/heldout-leak-check.test.ts
+++ b/tests/unit/tools/heldout-leak-check.test.ts
@@ -318,7 +318,8 @@
         'Rule C interprets Vite and Vitest aliases only as strict literals in the exact-node graph reached from export default, symbol-proven defineConfig or mergeConfig, factory returns, conditional branches, and same-file const object/array composition',
         'Rule C uses no flow tracking: each tracked-const reference is classified by its maximal constant-key address, including whether its path crosses resolve, test, or alias, the addressed subtree, and its immediate syntactic position',
         'Rule C classifies configuration roots, resolve/test/alias bindings, and bindings spread transitively into those containers as alias-capable regardless of current literal contents',
-        'Rule C records every configuration placement prefix for a binding and composes each prefix with descendant and const-alias paths; any semantic placement makes the reference alias-capable',
+        'Rule C records every configuration placement prefix and unions outer paths with every embedded binding dereferenced, composing each placement with remaining descendant and const-alias paths; any semantic placement makes the reference alias-capable',
+        'Rule C visits ordinary shorthand and literal-array composition; installed Vitest 4 test.projects array elements are nested configuration roots, while removed test.workspace is not interpreted',
         'Rule C permits non-exported plain-const aliases to preserve the same addressed subtree and allows non-alias-bearing subtrees in otherwise escaping positions',
         'subtrees strictly below a configuration root at nonsemantic addresses remain non-alias-capable unless their contents or binding position makes them capable',
         'resolve and Vitest test are alias-capable containers whose values must be literal objects or tracked const literals; their alias values are interpreted identically',
@@ -2347,6 +2348,112 @@
     expect(report.findings).toEqual([]);
   });
 
+  it.each([
+    ['indirect multiply placed entry', [
+      "const rules = [{ name: 'p', find: '@ordinary', replacement: '/ordinary' }];",
+      'const shared = { plugins: rules };',
+      'install(shared.plugins[0]);',
+      'export default { ...shared, resolve: { alias: rules } };',
+    ].join('\n')],
+    ['const alias of an indirect multiply placed entry', [
+      "const rules = [{ name: 'p', find: '@ordinary', replacement: '/ordinary' }];",
+      'const shared = { plugins: rules };',
+      'const entry = shared.plugins[0];',
+      'install(entry);',
+      'export default { ...shared, resolve: { alias: rules } };',
+    ].join('\n')],
+    ['two-level indirect multiply placed entry', [
+      "const rules = [{ name: 'p', find: '@ordinary', replacement: '/ordinary' }];",
+      'const shared = { plugins: rules };',
+      'const outer = { inner: shared };',
+      'install(outer.inner.plugins[0]);',
+      'export default { ...outer, resolve: { alias: rules } };',
+    ].join('\n')],
+  ] as const)('unions embedded placements for %s', (_label, configSource) => {
+    const report = inspectHeldoutLeakChanges([{
+      path: 'vite.config.mjs',
+      addedText: configSource,
+      sourceText: configSource,
+    }], 'F', bindings);
+
+    expect(report.findings).toContainEqual(expect.objectContaining({
+      path: 'vite.config.mjs',
+      kind: 'unresolved_module_edge',
+    }));
+  });
+
+  it('keeps an indirectly accessed entry clean when it is placed only under plugins', () => {
+    const configSource = [
+      "const rules = [{ name: 'p' }];",
+      'const shared = { plugins: rules };',
+      'install(shared.plugins[0]);',
+      'export default { ...shared };',
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
+  it.each([
+    ['shorthand projects array', [
+      'const projects = [{}];',
+      'install(projects[0]);',
+      'export default { test: { projects } };',
+    ].join('\n')],
+    ['inline projects array', [
+      'const project = {};',
+      'install(project);',
+      'export default { test: { projects: [project] } };',
+    ].join('\n')],
+    ['referenced projects array contents', [
+      'const project = {};',
+      'const projects = [project];',
+      'install(project);',
+      'export default { test: { projects: projects } };',
+    ].join('\n')],
+  ] as const)('treats each test.projects element as a nested configuration root: %s',
+  (_label, configSource) => {
+    const report = inspectHeldoutLeakChanges([{
+      path: 'vitest.config.mjs',
+      addedText: configSource,
+      sourceText: configSource,
+    }], 'F', bindings);
+
+    expect(report.findings).toContainEqual(expect.objectContaining({
+      path: 'vitest.config.mjs',
+      kind: 'unresolved_module_edge',
+    }));
+  });
+
+  it('discovers a literal alias in a test.projects element', () => {
+    const configSource = [
+      "const project = { resolve: { alias: { '@project': './src/vtt/heldout-evaluation.ts' } } };",
+      'export default { test: { projects: [project] } };',
+    ].join('\n');
+    const report = inspectHeldoutLeakChanges([{
+      path: 'vitest.config.mjs',
+      addedText: configSource,
+      sourceText: configSource,
+    }], 'F', bindings, {
+      candidateSourceFiles: {
+        'src/ui/project-alias-consumer.ts': "import policy from '@project';",
+      },
+    });
+
+    expect(report.findings).not.toContainEqual(expect.objectContaining({
+      path: 'vitest.config.mjs',
+      kind: 'unresolved_module_edge',
+    }));
+    expect(report.findings).toContainEqual(expect.objectContaining({
+      path: 'src/ui/project-alias-consumer.ts',
+      kind: 'unresolved_module_edge',
+    }));
+  });
+
   it('interprets a symbol-proven defineConfig callback, conditional, and const spread', () => {
     const configSource = [
       "import { defineConfig } from 'vite';",
diff --git a/tools/heldout-leak-check.ts b/tools/heldout-leak-check.ts
index 1ea390c06e9dba82af855123904186810e088e8d..fe496e7a747953d5a193e0e7a43a3c8624dd81d9
--- a/tools/heldout-leak-check.ts
+++ b/tools/heldout-leak-check.ts
@@ -187,7 +187,7 @@
 /** Rule N/Rule C audit: every expression-flow position is interpreted or fails closed. */
 export const HELDOUT_LEAK_FLOW_AUDIT = [
   { position: 'declaration initializer', loaderValues: 'Rule N1 permits only a plain const namespace alias; Rule N2 permits inert browser-global transfer', configurationReferences: 'Rule C permits exact non-exported const aliases of statically addressed subtrees and fails closed for alias-bearing let, var, destructuring, or exported initializers' },
-  { position: 'member receiver', loaderValues: 'Rule N1 permits direct namespace receipt; Rule N2 validates browser loader members by symbol at use', configurationReferences: 'Rule C composes every placement prefix with constant property and element reads; any effective path crossing resolve, test, or alias is alias-bearing and nonconstant addresses fail closed' },
+  { position: 'member receiver', loaderValues: 'Rule N1 permits direct namespace receipt; Rule N2 validates browser loader members by symbol at use', configurationReferences: 'Rule C unions outer and embedded-binding placement prefixes through constant property and element reads; any effective path crossing resolve, test, or alias is alias-bearing and nonconstant addresses fail closed' },
   { position: 'assignment', loaderValues: 'Rule N1 failed_closed; Rule N2 browser globals remain inert until loader-member use', configurationReferences: 'Rule C always fails closed on mutation targets and fails closed on alias-bearing assignment values' },
   { position: 'destructuring declaration', loaderValues: 'Rule N1 and Rule N2 track recognized loader keys and fail_closed for any loader key extracted from an unknown source', configurationReferences: 'Rule C fails closed when an alias-bearing subtree enters a binding pattern' },
   { position: 'destructuring assignment', loaderValues: 'Rule N1 and Rule N2 track recognized loader keys and fail_closed for any loader key extracted from an unknown source', configurationReferences: 'Rule C fails closed on assignment-pattern targets and alias-bearing assignment values' },
@@ -199,7 +199,7 @@
   { position: 'template substitution', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer', configurationReferences: 'Rule C fails closed for alias-bearing template substitutions' },
   { position: 'spread', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer', configurationReferences: 'Rule C permits visited-graph literal composition and non-alias-bearing subtree reuse; alias-bearing spreads into untracked literals fail closed' },
   { position: 'property value', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global storage', configurationReferences: 'Rule C visits exact literal nodes; alias-bearing values stored in untracked objects fail closed' },
-  { position: 'array element', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global storage', configurationReferences: 'Rule C leaves arrays under unrelated keys opaque; alias-bearing values stored in them fail closed while non-alias-bearing addressed subtrees remain usable' },
+  { position: 'array element', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global storage', configurationReferences: 'Rule C records literal array placements; test.projects elements are nested configuration roots, while non-alias-bearing elements under unrelated keys remain usable' },
   { position: 'call argument', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer', configurationReferences: 'Rule C interprets symbol-proven defineConfig and mergeConfig graph entries and otherwise fails closed for alias-bearing arguments' },
   { position: 'constructor argument', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer', configurationReferences: 'Rule C fails closed for alias-bearing constructor arguments' },
   { position: 'call receiver', loaderValues: 'Rule N1 permits only direct namespace member derivation; Rule N2 validates loader members by symbol', configurationReferences: 'Rule C always fails closed when a tracked chain is the receiver of a method call' },
@@ -240,7 +240,8 @@
     'Rule C interprets Vite and Vitest aliases only as strict literals in the exact-node graph reached from export default, symbol-proven defineConfig or mergeConfig, factory returns, conditional branches, and same-file const object/array composition',
     'Rule C uses no flow tracking: each tracked-const reference is classified by its maximal constant-key address, including whether its path crosses resolve, test, or alias, the addressed subtree, and its immediate syntactic position',
     'Rule C classifies configuration roots, resolve/test/alias bindings, and bindings spread transitively into those containers as alias-capable regardless of current literal contents',
-    'Rule C records every configuration placement prefix for a binding and composes each prefix with descendant and const-alias paths; any semantic placement makes the reference alias-capable',
+    'Rule C records every configuration placement prefix and unions outer paths with every embedded binding dereferenced, composing each placement with remaining descendant and const-alias paths; any semantic placement makes the reference alias-capable',
+    'Rule C visits ordinary shorthand and literal-array composition; installed Vitest 4 test.projects array elements are nested configuration roots, while removed test.workspace is not interpreted',
     'Rule C permits non-exported plain-const aliases to preserve the same addressed subtree and allows non-alias-bearing subtrees in otherwise escaping positions',
     'subtrees strictly below a configuration root at nonsemantic addresses remain non-alias-capable unless their contents or binding position makes them capable',
     'resolve and Vitest test are alias-capable containers whose values must be literal objects or tracked const literals; their alias values are interpreted identically',
@@ -2174,13 +2175,66 @@
   ): void => {
     const value = unwrapTransparentExpression(expression);
     if (ts.isObjectLiteralExpression(value)) visitReachableObject(value, path);
+    else if (ts.isArrayLiteralExpression(value)) visitOrdinaryArray(value, path);
     else if (ts.isIdentifier(value)) {
       const resolved = declarationForReachableIdentifier(value);
       if (resolved !== null) {
         reachableNodes.add(value);
         reachableSymbols.set(resolved.symbol, resolved.declaration);
         recordPlacement(resolved.symbol, path);
+        if (visitingSymbols.has(resolved.symbol)) {
+          unresolved = true;
+          return;
+        }
+        visitingSymbols.add(resolved.symbol);
+        visitOrdinaryPropertyValue(resolved.declaration.initializer as ts.Expression, path);
+        visitingSymbols.delete(resolved.symbol);
+      }
+    }
+  };
+  const visitProjectConfigurations = (
+    expression: ts.Expression,
+    path: readonly string[],
+  ): void => {
+    // Vitest 4 consumes test.projects at cli-api.BK8pd4xc.js:13298, forwards each
+    // object into initializeProject at :11117, and creates its Vite server at
+    // :11048. The former test.workspace option is rejected at :13299.
+    const value = unwrapTransparentExpression(expression);
+    if (ts.isIdentifier(value)) {
+      const symbol = visitReachableIdentifier(value, (initializer) =>
+        visitProjectConfigurations(initializer, path));
+      if (symbol !== null) {
+        aliasCapableSymbols.add(symbol);
+        recordPlacement(symbol, path);
+      }
+      return;
+    }
+    if (!ts.isArrayLiteralExpression(value)) {
+      unresolved = true;
+      return;
+    }
+    reachableNodes.add(value);
+    for (const [index, element] of value.elements.entries()) {
+      if (ts.isOmittedExpression(element) || ts.isSpreadElement(element)) {
+        unresolved = true;
+        continue;
       }
+      reachableNodes.add(element);
+      const project = unwrapTransparentExpression(element);
+      const projectPath = [...path, String(index)];
+      if (ts.isObjectLiteralExpression(project)) {
+        visitReachableObject(project, projectPath);
+      } else if (ts.isIdentifier(project)) {
+        const symbol = visitReachableIdentifier(project, (initializer) => {
+          const literal = unwrapTransparentExpression(initializer);
+          if (ts.isObjectLiteralExpression(literal)) visitReachableObject(literal, projectPath);
+          else unresolved = true;
+        });
+        if (symbol !== null) {
+          aliasCapableSymbols.add(symbol);
+          recordPlacement(symbol, projectPath);
+        }
+      } else unresolved = true;
     }
   };
   const visitResolveObject = (expression: ts.Expression, path: readonly string[]): void => {
@@ -2220,7 +2274,9 @@
           visitAliasValue(property.name, [...path, 'alias']);
         } else if (property.name.text === 'resolve' || property.name.text === 'test') {
           visitResolveObject(property.name, [...path, property.name.text]);
-        }
+        } else if (property.name.text === 'projects' && path.at(-1) === 'test') {
+          visitProjectConfigurations(property.name, [...path, 'projects']);
+        } else visitOrdinaryPropertyValue(property.name, [...path, property.name.text]);
         continue;
       }
       if (!ts.isPropertyAssignment(property) || ts.isComputedPropertyName(property.name)) {
@@ -2232,6 +2288,8 @@
       if (key === 'alias') visitAliasValue(property.initializer, [...path, key]);
       else if (key === 'resolve' || key === 'test') {
         visitResolveObject(property.initializer, [...path, key]);
+      } else if (key === 'projects' && path.at(-1) === 'test') {
+        visitProjectConfigurations(property.initializer, [...path, key]);
       } else if (key !== null) visitOrdinaryPropertyValue(property.initializer, [...path, key]);
     }
   };
@@ -2310,6 +2368,25 @@
       } else unresolved = true;
     }
   };
+  function visitOrdinaryArray(
+    array: ts.ArrayLiteralExpression,
+    path: readonly string[],
+  ): void {
+    reachableNodes.add(array);
+    for (const [index, element] of array.elements.entries()) {
+      if (ts.isOmittedExpression(element)) continue;
+      reachableNodes.add(element);
+      const elementPath = [...path, String(index)];
+      if (ts.isSpreadElement(element)) {
+        const spread = unwrapTransparentExpression(element.expression);
+        if (ts.isIdentifier(spread)) visitOrdinaryPropertyValue(spread, path);
+        continue;
+      }
+      const value = unwrapTransparentExpression(element);
+      if (ts.isIdentifier(value) || ts.isObjectLiteralExpression(value) ||
+        ts.isArrayLiteralExpression(value)) visitOrdinaryPropertyValue(value, elementPath);
+    }
+  }
   const visitReachableFunction = (fn: ts.ArrowFunction | ts.FunctionExpression): void => {
     for (const expression of returnedExpressions(fn.body)) visitReachableExpression(expression, []);
   };
@@ -2649,6 +2726,77 @@
     }
     return !isPrimitiveLiteral(value);
   };
+  const samePath = (left: readonly string[], right: readonly string[]): boolean =>
+    left.length === right.length && left.every((key, index) => key === right[index]);
+  const uniquePaths = (paths: readonly (readonly string[])[]): readonly (readonly string[])[] => {
+    const unique: string[][] = [];
+    for (const path of paths) {
+      if (!unique.some((candidate) => samePath(candidate, path))) unique.push([...path]);
+    }
+    return unique;
+  };
+  const effectivePathsForExpression = (
+    expression: ts.Expression,
+    suffix: readonly string[],
+  ): readonly (readonly string[])[] => {
+    const symbol = baseSymbolForExpression(expression);
+    if (symbol === null) return [];
+    const base = configurationAddresses.get(symbol);
+    const expressionAddress = addressForExpression(expression);
+    if (base === undefined || expressionAddress === null || base.root !== expressionAddress.root ||
+      expressionAddress.path.length < base.path.length ||
+      !base.path.every((key, index) => key === expressionAddress.path[index])) return [];
+    const relativePath = expressionAddress.path.slice(base.path.length);
+    const placements = placementPrefixes.get(symbol) ?? [base.path];
+    return placements.map((placement) => [...placement, ...relativePath, ...suffix]);
+  };
+  const embeddedEffectivePaths = (
+    address: ConfigurationAddress,
+    seen: Set<string> = new Set(),
+  ): readonly (readonly string[])[] => {
+    const declaration = rootDeclaration(address);
+    if (declaration?.initializer === undefined) return [];
+    const visitKey = `${declaration.pos}:${address.path.join('\u0000')}`;
+    if (seen.has(visitKey)) return [];
+    seen.add(visitKey);
+    let value: ts.Expression = declaration.initializer;
+    for (let index = 0; index <= address.path.length;) {
+      const current = unwrapTransparentExpression(value);
+      const nestedAddress = addressForExpression(current);
+      if (nestedAddress !== null) {
+        const remaining = address.path.slice(index);
+        const direct = effectivePathsForExpression(current, remaining);
+        const nested = embeddedEffectivePaths({
+          root: nestedAddress.root,
+          path: [...nestedAddress.path, ...remaining],
+        }, seen);
+        return uniquePaths([...direct, ...nested]);
+      }
+      if (index === address.path.length) return [];
+      const key = address.path[index];
+      if (key === undefined) return [];
+      if (ts.isObjectLiteralExpression(current)) {
+        const next = propertyValue(current, key);
+        if (next === null) return [];
+        value = next;
+        index += 1;
+        continue;
+      }
+      if (ts.isArrayLiteralExpression(current)) {
+        const elementIndex = Number(key);
+        if (!Number.isSafeInteger(elementIndex) || elementIndex < 0) return [];
+        const element = current.elements[elementIndex];
+        if (element === undefined || ts.isOmittedExpression(element) || ts.isSpreadElement(element)) {
+          return [];
+        }
+        value = element;
+        index += 1;
+        continue;
+      }
+      return [];
+    }
+    return [];
+  };
   const addressForReference = (
     identifier: ts.Identifier,
     chain: ReturnType<typeof referenceChain>,
@@ -2658,14 +2806,15 @@
     const base = configurationAddresses.get(symbol);
     if (base === undefined) return null;
     const placements = placementPrefixes.get(symbol);
+    const localAddress = { root: base.root, path: [...base.path, ...chain.path] };
     return {
-      root: base.root,
-      path: [...base.path, ...chain.path],
+      ...localAddress,
       binding: symbol,
       relativePath: chain.path,
-      effectivePaths: (placements === undefined || placements.length === 0
+      effectivePaths: uniquePaths([...(placements === undefined || placements.length === 0
         ? [base.path]
         : placements).map((placement) => [...placement, ...chain.path]),
+      ...embeddedEffectivePaths(localAddress)]),
     };
   };
   const isAliasBearing = (address: ConfigurationReferenceAddress): boolean => {
