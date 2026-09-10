Implemented F67–F69 in the two authorized files.

- Object spreads now use source-order, last-write-wins semantics.
- Array indexes now account for recursively resolved spread lengths.
- Embedded terminal identifiers resolve to their tracked literals while retaining placement unions.
- `test.projects[*].extends` recursively inspects candidate configuration files with cycle, missing-file, repository-boundary, and nonliteral fail-closed handling.
- `extends: true` reuses the root configuration.
- Extended configuration files receive Rule N inspection.
- Added 15 regression cases across seven test declarations; none removed.

Verification:

- `npm run typecheck:fast` — exit 0.
- `sg scan` — exit 0, no findings.
- `git diff --check` — exit 0, empty output.
- Focused command:
  `npx vitest run --configLoader runner tests/unit/tools/heldout-leak-check.test.ts`
  — exit 0, `361 passed (361)`.

The nine-spec cumulative command exited 1 due to three existing D576 five-second load timeouts:

- `Test Files  1 failed | 8 passed (9)`
- `Tests  3 failed | 594 passed (597)`

Permitted serial rerun:

`npx vitest run --configLoader runner --maxWorkers=1 --fileParallelism=false tests/unit/vtt/room-generator-los-cover.test.ts`

- Exit 0.
- `Test Files  1 passed (1)`
- `Tests  111 passed (111)`
- No timeout changes.

Integrity:

- All 66 fixture hashes unchanged.
- Fixture manifest digest: `e14bea57faaa802988126d45eb062bc34da0e6584afe34a66f1fc390011a00cc`.
- Frozen contract digest, copied from `sha256sum`: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9botsndef18e1`.
- Only the authorized tool and test files changed.
- Full logs: [.tmp/heldout-s1-rem-01-r21](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r21)

HELDOUT-REM R21 DONE
diff --git a/tests/unit/tools/heldout-leak-check.test.ts b/tests/unit/tools/heldout-leak-check.test.ts
index 765b45522368b088e6bc79341dcd0dc16fcb31a2..600d1bb575f5b03834ae033f3fdec974e0819026
--- a/tests/unit/tools/heldout-leak-check.test.ts
+++ b/tests/unit/tools/heldout-leak-check.test.ts
@@ -320,6 +320,8 @@
         'Rule C classifies configuration roots, resolve/test/alias bindings, and bindings spread transitively into those containers as alias-capable regardless of current literal contents',
         'Rule C records every configuration placement prefix and unions outer paths with every embedded binding dereferenced, composing each placement with remaining descendant and const-alias paths; any semantic placement makes the reference alias-capable',
         'Rule C visits ordinary shorthand and literal-array composition; installed Vitest 4 test.projects array elements are nested configuration roots, while removed test.workspace is not interpreted',
+        'Rule C resolves tracked literal object and array spreads with JavaScript last-write and runtime-index semantics, including terminal embedded identifiers',
+        'Rule C recursively inspects literal test.projects extends files from the candidate tree; true reuses the root configuration and missing, external, cyclic, or nonliteral targets fail closed',
         'Rule C permits non-exported plain-const aliases to preserve the same addressed subtree and allows non-alias-bearing subtrees in otherwise escaping positions',
         'subtrees strictly below a configuration root at nonsemantic addresses remain non-alias-capable unless their contents or binding position makes them capable',
         'resolve and Vitest test are alias-capable containers whose values must be literal objects or tracked const literals; their alias values are interpreted identically',
@@ -2454,6 +2456,179 @@
     }));
   });
 
+  it.each([
+    ['object spread override', [
+      "const rules = [{ name: 'p', find: '@ordinary', replacement: '/ordinary' }];",
+      'const overlay = { plugins: rules };',
+      "const shared = { plugins: [{ name: 'safe' }], ...overlay };",
+      'install(shared.plugins[0]);',
+      'export default { ...shared, resolve: { alias: rules } };',
+    ].join('\n')],
+    ['array spread runtime index', [
+      "const rules = [{ find: '@a', replacement: '/a' }, { find: '@b', replacement: '/b' }];",
+      "const shared = { plugins: [...rules, { name: 'safe' }] };",
+      'install(shared.plugins[1]);',
+      'export default { ...shared, resolve: { alias: rules } };',
+    ].join('\n')],
+  ] as const)('uses JavaScript spread semantics for %s', (_label, configSource) => {
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
+  it.each([
+    ['later explicit object property', [
+      "const rules = [{ find: '@a', replacement: '/a' }];",
+      'const overlay = { plugins: rules };',
+      "const shared = { ...overlay, plugins: [{ name: 'safe' }] };",
+      'install(shared.plugins[0]);',
+      'export default { ...shared, resolve: { alias: rules } };',
+    ].join('\n')],
+    ['entry before array spread', [
+      "const rules = [{ find: '@a', replacement: '/a' }];",
+      "const shared = { plugins: [{ name: 'safe' }, ...rules] };",
+      'install(shared.plugins[0]);',
+      'export default { ...shared, resolve: { alias: rules } };',
+    ].join('\n')],
+  ] as const)('keeps the runtime-safe spread ordering clean for %s', (_label, configSource) => {
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
+    ['terminal plugin array', [
+      'const plugins = [];',
+      'const shared = { plugins };',
+      'install(shared.plugins);',
+      'export default { ...shared };',
+    ].join('\n'), false],
+    ['terminal resolve object', [
+      'const resolve = {};',
+      'const shared = { resolve };',
+      'install(shared.resolve);',
+      'export default { ...shared };',
+    ].join('\n'), true],
+    ['terminal dual-placement plugin array', [
+      "const plugins = [{ find: '@x', replacement: '/lit' }];",
+      'const shared = { plugins };',
+      'export default { ...shared, resolve: { alias: plugins } };',
+      'install(shared.plugins);',
+    ].join('\n'), true],
+  ] as const)('dereferences %s before alias-capability classification',
+  (_label, configSource, unresolved) => {
+    const report = inspectHeldoutLeakChanges([{
+      path: 'vite.config.mjs',
+      addedText: configSource,
+      sourceText: configSource,
+    }], 'F', bindings);
+
+    expect(report.findings.some((finding) => finding.path === 'vite.config.mjs' &&
+      finding.kind === 'unresolved_module_edge')).toBe(unresolved);
+  });
+
+  it('discovers aliases from a literal project extends file', () => {
+    const rootSource = "export default { test: { projects: [{ extends: './tools/project-config.mjs' }] } };";
+    const projectSource =
+      "export default { resolve: { alias: { '@policy': './src/vtt/heldout-evaluation.ts' } } };";
+    const report = inspectHeldoutLeakChanges([{
+      path: 'vitest.config.mjs',
+      addedText: rootSource,
+      sourceText: rootSource,
+    }, {
+      path: 'tools/project-config.mjs',
+      addedText: projectSource,
+      sourceText: projectSource,
+    }], 'F', bindings, {
+      candidateSourceFiles: {
+        'src/ui/project-extends-consumer.ts': "import policy from '@policy';",
+      },
+    });
+
+    expect(report.findings).not.toContainEqual(expect.objectContaining({
+      path: 'vitest.config.mjs',
+      kind: 'unresolved_module_edge',
+    }));
+    expect(report.findings).toContainEqual(expect.objectContaining({
+      path: 'src/ui/project-extends-consumer.ts',
+      kind: 'unresolved_module_edge',
+    }));
+  });
+
+  it.each([
+    ['helper-built extended alias', "export default { test: { projects: [{ extends: './tools/project-config.mjs' }] } };", {
+      'tools/project-config.mjs': "export default makeConfig();",
+    }],
+    ['nonliteral extends', 'const target = \'./tools/project-config.mjs\'; export default { test: { projects: [{ extends: target }] } };', {}],
+    ['missing extends file', "export default { test: { projects: [{ extends: './tools/missing.mjs' }] } };", {}],
+    ['outside-repository extends file', "export default { test: { projects: [{ extends: '../outside.mjs' }] } };", {}],
+    ['cyclic extends files', "export default { test: { projects: [{ extends: './tools/project-config.mjs' }] } };", {
+      'tools/project-config.mjs': "export default { test: { projects: [{ extends: '../vitest.config.mjs' }] } };",
+    }],
+  ] as const)('fails closed for %s', (_label, rootSource, extraSources) => {
+    const changes = [{
+      path: 'vitest.config.mjs',
+      addedText: rootSource,
+      sourceText: rootSource,
+    }, ...Object.entries(extraSources).map(([path, sourceText]) => ({
+      path,
+      addedText: sourceText,
+      sourceText,
+    }))];
+    const report = inspectHeldoutLeakChanges(changes, 'F', bindings);
+
+    expect(report.findings).toContainEqual(expect.objectContaining({
+      path: 'vitest.config.mjs',
+      kind: 'unresolved_module_edge',
+    }));
+  });
+
+  it('treats project extends true as reuse of the clean root configuration', () => {
+    const configSource = 'export default { test: { projects: [{ extends: true }] } };';
+    const report = inspectHeldoutLeakChanges([{
+      path: 'vitest.config.mjs',
+      addedText: configSource,
+      sourceText: configSource,
+    }], 'F', bindings);
+
+    expect(report.findings).toEqual([]);
+  });
+
+  it('applies Rule N to an extended configuration loaded from the candidate source pool', () => {
+    const rootSource =
+      "export default { test: { projects: [{ extends: './tools/project-config.mjs' }] } };";
+    const projectSource = [
+      "import { createRequire } from 'node:module';",
+      'const box = { load: createRequire(import.meta.url) };',
+      'export default {};',
+    ].join('\n');
+    const report = inspectHeldoutLeakChanges([{
+      path: 'vitest.config.mjs',
+      addedText: rootSource,
+      sourceText: rootSource,
+    }], 'F', bindings, {
+      candidateConfigurationFiles: {
+        'tools/project-config.mjs': projectSource,
+      },
+    });
+
+    expect(report.findings).toContainEqual(expect.objectContaining({
+      path: 'tools/project-config.mjs',
+      kind: 'loader_reference_escaped',
+    }));
+  });
+
   it('interprets a symbol-proven defineConfig callback, conditional, and const spread', () => {
     const configSource = [
       "import { defineConfig } from 'vite';",
diff --git a/tools/heldout-leak-check.ts b/tools/heldout-leak-check.ts
index fe496e7a747953d5a193e0e7a43a3c8624dd81d9..bfcc5c05fecc04c684ddb9eafc2a6899760ddaf2
--- a/tools/heldout-leak-check.ts
+++ b/tools/heldout-leak-check.ts
@@ -46,6 +46,8 @@
   readonly packageJsonFiles?: Readonly<Record<string, string>>;
   /** Complete candidate sources used when resolution configuration invalidates unchanged consumers. */
   readonly candidateSourceFiles?: Readonly<Record<string, string>>;
+  /** Candidate source pool from which project `extends` configuration dependencies are loaded. */
+  readonly candidateConfigurationFiles?: Readonly<Record<string, string>>;
   readonly resolutionConfigChanged?: boolean;
   readonly configuredAliasPrefixes?: readonly string[];
   readonly configuredAliasRegexes?: readonly {
@@ -197,7 +199,7 @@
   { position: 'throw', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer', configurationReferences: 'Rule C fails closed for alias-bearing thrown values' },
   { position: 'await or promise resolution', loaderValues: 'Rule N1 permits only await import of a constant built-in namespace and otherwise failed_closed; Rule N2 validates loader use', configurationReferences: 'Rule C fails closed for alias-bearing awaited or promise-resolved values' },
   { position: 'template substitution', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer', configurationReferences: 'Rule C fails closed for alias-bearing template substitutions' },
-  { position: 'spread', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer', configurationReferences: 'Rule C permits visited-graph literal composition and non-alias-bearing subtree reuse; alias-bearing spreads into untracked literals fail closed' },
+  { position: 'spread', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer', configurationReferences: 'Rule C resolves tracked object spreads in source-order last-write order and tracked array spreads by runtime index; untracked spreads fail closed when addressed' },
   { position: 'property value', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global storage', configurationReferences: 'Rule C visits exact literal nodes; alias-bearing values stored in untracked objects fail closed' },
   { position: 'array element', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global storage', configurationReferences: 'Rule C records literal array placements; test.projects elements are nested configuration roots, while non-alias-bearing elements under unrelated keys remain usable' },
   { position: 'call argument', loaderValues: 'Rule N1 failed_closed; Rule N2 permits inert browser-global transfer', configurationReferences: 'Rule C interprets symbol-proven defineConfig and mergeConfig graph entries and otherwise fails closed for alias-bearing arguments' },
@@ -242,6 +244,8 @@
     'Rule C classifies configuration roots, resolve/test/alias bindings, and bindings spread transitively into those containers as alias-capable regardless of current literal contents',
     'Rule C records every configuration placement prefix and unions outer paths with every embedded binding dereferenced, composing each placement with remaining descendant and const-alias paths; any semantic placement makes the reference alias-capable',
     'Rule C visits ordinary shorthand and literal-array composition; installed Vitest 4 test.projects array elements are nested configuration roots, while removed test.workspace is not interpreted',
+    'Rule C resolves tracked literal object and array spreads with JavaScript last-write and runtime-index semantics, including terminal embedded identifiers',
+    'Rule C recursively inspects literal test.projects extends files from the candidate tree; true reuses the root configuration and missing, external, cyclic, or nonliteral targets fail closed',
     'Rule C permits non-exported plain-const aliases to preserve the same addressed subtree and allows non-alias-bearing subtrees in otherwise escaping positions',
     'subtrees strictly below a configuration root at nonsemantic addresses remain non-alias-capable unless their contents or binding position makes them capable',
     'resolve and Vitest test are alias-capable containers whose values must be literal objects or tracked const literals; their alias values are interpreted identically',
@@ -1740,11 +1744,20 @@
     throw new TypeError('Held-out reserve result paths must use the registered result root.');
   }
   const findings: HeldoutLeakFinding[] = [];
+  const configurationSources = {
+    ...(context.candidateConfigurationFiles ?? {}),
+    ...(context.candidateSourceFiles ?? {}),
+    ...Object.fromEntries(changes.map((change) => [
+      change.path,
+      change.sourceText ?? change.addedText,
+    ])),
+  };
   const aliasDiscoveries = changes.flatMap((change) => {
     if (!isRootViteOrVitestConfig(change.path)) return [];
     return [{ path: change.path, discovery: viteAliases(
       change.sourceText ?? change.addedText,
       change.path,
+      configurationSources,
     ) }];
   });
   const discoveredAliases = aliasDiscoveries.flatMap(({ discovery }) => discovery.aliases);
@@ -1766,6 +1779,12 @@
     unresolvedResolutionConfigPaths,
   };
   const effectiveChanges = new Map(changes.map((change) => [change.path, change]));
+  for (const nestedPath of aliasDiscoveries.flatMap(({ discovery }) => discovery.nestedPaths)) {
+    const sourceText = configurationSources[nestedPath];
+    if (sourceText !== undefined && !effectiveChanges.has(nestedPath)) {
+      effectiveChanges.set(nestedPath, { path: nestedPath, addedText: '', sourceText });
+    }
+  }
   const resolutionConfigChanged = inspectionContext.resolutionConfigChanged === true ||
     changes.some((change) => isResolutionConfigPath(change.path));
   if (resolutionConfigChanged) {
@@ -1974,13 +1993,46 @@
     readonly flags: string;
   }[];
   readonly unresolved: boolean;
+  readonly nestedPaths: readonly string[];
 }
 
-function viteAliases(source: string, path: string): ViteAliasDiscovery {
+function viteAliases(
+  source: string,
+  path: string,
+  configurationSources: Readonly<Record<string, string>> = {},
+  configurationStack: ReadonlySet<string> = new Set(),
+): ViteAliasDiscovery {
+  if (configurationStack.has(path)) {
+    return { aliases: [], regexes: [], unresolved: true, nestedPaths: [path] };
+  }
   const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, scriptKind(path));
   const aliases = new Set<string>();
   const regexes = new Map<string, { readonly source: string; readonly flags: string }>();
+  const nestedPaths = new Set<string>();
   let unresolved = false;
+  const inspectExtendedConfiguration = (specifier: string): void => {
+    if (specifier.length === 0 || posix.isAbsolute(specifier)) {
+      unresolved = true;
+      return;
+    }
+    const target = posix.normalize(posix.join(posix.dirname(path), specifier));
+    if (target === '..' || target.startsWith('../')) {
+      unresolved = true;
+      return;
+    }
+    const nestedSource = configurationSources[target];
+    if (nestedSource === undefined) {
+      unresolved = true;
+      return;
+    }
+    nestedPaths.add(target);
+    const nested = viteAliases(nestedSource, target, configurationSources,
+      new Set([...configurationStack, path]));
+    for (const alias of nested.aliases) aliases.add(alias);
+    for (const regex of nested.regexes) regexes.set(`${regex.source}/${regex.flags}`, regex);
+    for (const nestedPath of nested.nestedPaths) nestedPaths.add(nestedPath);
+    if (nested.unresolved) unresolved = true;
+  };
   const compilerOptions: ts.CompilerOptions = {
     allowJs: true,
     checkJs: false,
@@ -2237,6 +2289,18 @@
       } else unresolved = true;
     }
   };
+  const visitProjectExtends = (expression: ts.Expression): void => {
+    // cli-api.BK8pd4xc.js:11113 maps a string to that config file and true to
+    // the root Vite config before initializeProject creates the server at :11048.
+    const value = unwrapTransparentExpression(expression);
+    reachableNodes.add(value);
+    if (value.kind === ts.SyntaxKind.TrueKeyword) return;
+    if (ts.isStringLiteral(value)) {
+      inspectExtendedConfiguration(value.text);
+      return;
+    }
+    unresolved = true;
+  };
   const visitResolveObject = (expression: ts.Expression, path: readonly string[]): void => {
     const value = unwrapTransparentExpression(expression);
     if (ts.isIdentifier(value)) {
@@ -2276,6 +2340,8 @@
           visitResolveObject(property.name, [...path, property.name.text]);
         } else if (property.name.text === 'projects' && path.at(-1) === 'test') {
           visitProjectConfigurations(property.name, [...path, 'projects']);
+        } else if (property.name.text === 'extends' && path.at(-2) === 'projects') {
+          unresolved = true;
         } else visitOrdinaryPropertyValue(property.name, [...path, property.name.text]);
         continue;
       }
@@ -2290,6 +2356,8 @@
         visitResolveObject(property.initializer, [...path, key]);
       } else if (key === 'projects' && path.at(-1) === 'test') {
         visitProjectConfigurations(property.initializer, [...path, key]);
+      } else if (key === 'extends' && path.at(-2) === 'projects') {
+        visitProjectExtends(property.initializer);
       } else if (key !== null) visitOrdinaryPropertyValue(property.initializer, [...path, key]);
     }
   };
@@ -2321,6 +2389,8 @@
           visitResolveObject(property.name, [...path, property.name.text]);
         } else if (property.name.text === 'alias') {
           visitAliasValue(property.name, [...path, 'alias']);
+        } else if (property.name.text === 'extends' && path.at(-2) === 'projects') {
+          unresolved = true;
         } else {
           visitOrdinaryPropertyValue(property.name, [...path, property.name.text]);
         }
@@ -2335,16 +2405,47 @@
       if (key === 'resolve' || key === 'test') {
         visitResolveObject(property.initializer, [...path, key]);
       } else if (key === 'alias') visitAliasValue(property.initializer, [...path, key]);
+      else if (key === 'extends' && path.at(-2) === 'projects') {
+        visitProjectExtends(property.initializer);
+      }
       else if (key !== null) visitOrdinaryPropertyValue(property.initializer, [...path, key]);
     }
   };
+  const reachableArrayLength = (
+    expression: ts.Expression,
+    seen: Set<ts.Symbol> = new Set(),
+  ): number | null => {
+    const value = unwrapTransparentExpression(expression);
+    if (ts.isIdentifier(value)) {
+      const resolved = declarationForReachableIdentifier(value);
+      if (resolved === null || seen.has(resolved.symbol)) return null;
+      return reachableArrayLength(resolved.declaration.initializer as ts.Expression,
+        new Set([...seen, resolved.symbol]));
+    }
+    if (!ts.isArrayLiteralExpression(value)) return null;
+    let length = 0;
+    for (const element of value.elements) {
+      if (!ts.isSpreadElement(element)) {
+        length += 1;
+        continue;
+      }
+      const spreadLength = reachableArrayLength(element.expression, seen);
+      if (spreadLength === null) return null;
+      length += spreadLength;
+    }
+    return length;
+  };
   const visitReachableArray = (
     array: ts.ArrayLiteralExpression,
     path: readonly string[],
   ): void => {
     reachableNodes.add(array);
-    for (const [index, element] of array.elements.entries()) {
-      if (ts.isOmittedExpression(element)) continue;
+    let runtimeIndex: number | null = 0;
+    for (const element of array.elements) {
+      if (ts.isOmittedExpression(element)) {
+        if (runtimeIndex !== null) runtimeIndex += 1;
+        continue;
+      }
       reachableNodes.add(element);
       if (ts.isSpreadElement(element)) {
         const spread = unwrapTransparentExpression(element.expression);
@@ -2354,18 +2455,24 @@
           if (symbol !== null) recordPlacement(symbol, path);
         }
         else unresolved = true;
+        const spreadLength = reachableArrayLength(element.expression);
+        runtimeIndex = runtimeIndex === null || spreadLength === null
+          ? null
+          : runtimeIndex + spreadLength;
         continue;
       }
       const unwrapped = unwrapTransparentExpression(element);
+      const elementPath = runtimeIndex === null ? null : [...path, String(runtimeIndex)];
       if (ts.isIdentifier(unwrapped)) {
-        const elementPath = [...path, String(index)];
         const symbol = visitReachableIdentifier(unwrapped, (initializer) =>
-          visitReachableExpression(initializer, elementPath));
-        if (symbol !== null) recordPlacement(symbol, elementPath);
+          elementPath === null ? undefined : visitReachableExpression(initializer, elementPath));
+        if (symbol !== null && elementPath !== null) recordPlacement(symbol, elementPath);
       }
-      else if (ts.isObjectLiteralExpression(unwrapped) || ts.isArrayLiteralExpression(unwrapped)) {
-        visitReachableExpression(unwrapped, [...path, String(index)]);
+      else if (elementPath !== null &&
+        (ts.isObjectLiteralExpression(unwrapped) || ts.isArrayLiteralExpression(unwrapped))) {
+        visitReachableExpression(unwrapped, elementPath);
       } else unresolved = true;
+      if (runtimeIndex !== null) runtimeIndex += 1;
     }
   };
   function visitOrdinaryArray(
@@ -2373,18 +2480,28 @@
     path: readonly string[],
   ): void {
     reachableNodes.add(array);
-    for (const [index, element] of array.elements.entries()) {
-      if (ts.isOmittedExpression(element)) continue;
+    let runtimeIndex: number | null = 0;
+    for (const element of array.elements) {
+      if (ts.isOmittedExpression(element)) {
+        if (runtimeIndex !== null) runtimeIndex += 1;
+        continue;
+      }
       reachableNodes.add(element);
-      const elementPath = [...path, String(index)];
       if (ts.isSpreadElement(element)) {
         const spread = unwrapTransparentExpression(element.expression);
         if (ts.isIdentifier(spread)) visitOrdinaryPropertyValue(spread, path);
+        const spreadLength = reachableArrayLength(element.expression);
+        runtimeIndex = runtimeIndex === null || spreadLength === null
+          ? null
+          : runtimeIndex + spreadLength;
         continue;
       }
       const value = unwrapTransparentExpression(element);
-      if (ts.isIdentifier(value) || ts.isObjectLiteralExpression(value) ||
-        ts.isArrayLiteralExpression(value)) visitOrdinaryPropertyValue(value, elementPath);
+      if (runtimeIndex !== null && (ts.isIdentifier(value) ||
+        ts.isObjectLiteralExpression(value) || ts.isArrayLiteralExpression(value))) {
+        visitOrdinaryPropertyValue(value, [...path, String(runtimeIndex)]);
+      }
+      if (runtimeIndex !== null) runtimeIndex += 1;
     }
   }
   const visitReachableFunction = (fn: ts.ArrowFunction | ts.FunctionExpression): void => {
@@ -2635,55 +2752,168 @@
   }
   const rootDeclaration = (address: ConfigurationAddress): ts.VariableDeclaration | null =>
     reachableSymbols.get(address.root) ?? null;
-  const propertyValue = (
+  type AddressedValue = ts.Expression | 'known_scalar';
+  interface LiteralRoute {
+    readonly expression: ts.Expression;
+    readonly path: readonly string[];
+  }
+  type LiteralRouteResolution =
+    | { readonly kind: 'found'; readonly route: LiteralRoute }
+    | { readonly kind: 'absent' }
+    | { readonly kind: 'unresolved' };
+  function objectPropertyRoute(
     object: ts.ObjectLiteralExpression,
     key: string,
-  ): ts.Expression | null => {
-    const matches = object.properties.filter((property) =>
-      (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) &&
-      propertyNameText(property.name) === key);
-    if (matches.length !== 1) return null;
-    const property = matches[0];
-    if (property === undefined) return null;
-    if (ts.isPropertyAssignment(property)) return property.initializer;
-    return ts.isShorthandPropertyAssignment(property) ? property.name : null;
-  };
-  type AddressedValue = ts.Expression | 'known_scalar';
-  const addressedValue = (address: ConfigurationAddress): AddressedValue | null => {
-    const declaration = rootDeclaration(address);
-    if (declaration?.initializer === undefined) return null;
-    let value: ts.Expression = declaration.initializer;
-    for (const key of address.path) {
-      const current = unwrapTransparentExpression(value);
-      if (ts.isObjectLiteralExpression(current)) {
-        const next = propertyValue(current, key);
-        if (next === null) return null;
-        value = next;
+    seen: Set<string>,
+  ): LiteralRouteResolution {
+    let selected: LiteralRouteResolution = { kind: 'absent' };
+    for (const property of object.properties) {
+      if (ts.isSpreadAssignment(property)) {
+        const spreadAddress = addressForExpression(property.expression);
+        const spreadValue = spreadAddress === null ? null : addressedValue(spreadAddress, seen);
+        if (spreadValue === null || spreadValue === 'known_scalar' ||
+          !ts.isObjectLiteralExpression(unwrapTransparentExpression(spreadValue))) {
+          selected = { kind: 'unresolved' };
+          continue;
+        }
+        const contribution = objectPropertyRoute(
+          unwrapTransparentExpression(spreadValue) as ts.ObjectLiteralExpression,
+          key,
+          seen,
+        );
+        if (contribution.kind === 'found') {
+          selected = { kind: 'found', route: { expression: property.expression, path: [key] } };
+        } else if (contribution.kind === 'unresolved') selected = contribution;
         continue;
       }
-      if (ts.isArrayLiteralExpression(current)) {
-        if (key === 'length') return 'known_scalar';
-        const index = Number(key);
-        if (!Number.isSafeInteger(index) || index < 0) return null;
-        const element = current.elements[index];
-        if (element === undefined || ts.isOmittedExpression(element) || ts.isSpreadElement(element)) {
-          return null;
+      if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) {
+        selected = { kind: 'unresolved' };
+        continue;
+      }
+      const propertyName = propertyNameText(property.name);
+      if (propertyName === null) {
+        selected = { kind: 'unresolved' };
+        continue;
+      }
+      if (propertyName !== key) continue;
+      selected = {
+        kind: 'found',
+        route: {
+          expression: ts.isPropertyAssignment(property) ? property.initializer : property.name,
+          path: [],
+        },
+      };
+    }
+    return selected;
+  }
+  function resolvedArrayLength(
+    array: ts.ArrayLiteralExpression,
+    seen: Set<string>,
+  ): number | null {
+    let length = 0;
+    for (const element of array.elements) {
+      if (ts.isOmittedExpression(element)) {
+        length += 1;
+        continue;
+      }
+      if (!ts.isSpreadElement(element)) {
+        length += 1;
+        continue;
+      }
+      const spreadAddress = addressForExpression(element.expression);
+      const spreadValue = spreadAddress === null ? null : addressedValue(spreadAddress, seen);
+      if (spreadValue === null || spreadValue === 'known_scalar') return null;
+      const literal = unwrapTransparentExpression(spreadValue);
+      if (!ts.isArrayLiteralExpression(literal)) return null;
+      const spreadLength = resolvedArrayLength(literal, seen);
+      if (spreadLength === null) return null;
+      length += spreadLength;
+    }
+    return length;
+  }
+  function arrayElementRoute(
+    array: ts.ArrayLiteralExpression,
+    requestedIndex: number,
+    seen: Set<string>,
+  ): LiteralRouteResolution {
+    let runtimeIndex = 0;
+    for (const element of array.elements) {
+      if (ts.isSpreadElement(element)) {
+        const spreadAddress = addressForExpression(element.expression);
+        const spreadValue = spreadAddress === null ? null : addressedValue(spreadAddress, seen);
+        if (spreadValue === null || spreadValue === 'known_scalar') return { kind: 'unresolved' };
+        const literal = unwrapTransparentExpression(spreadValue);
+        if (!ts.isArrayLiteralExpression(literal)) return { kind: 'unresolved' };
+        const spreadLength = resolvedArrayLength(literal, seen);
+        if (spreadLength === null) return { kind: 'unresolved' };
+        if (requestedIndex < runtimeIndex + spreadLength) {
+          return {
+            kind: 'found',
+            route: {
+              expression: element.expression,
+              path: [String(requestedIndex - runtimeIndex)],
+            },
+          };
         }
-        value = element;
+        runtimeIndex += spreadLength;
         continue;
       }
-      const nested = addressForExpression(current);
-      if (nested === null) return null;
-      const nestedValue = addressedValue(nested);
-      if (nestedValue === null || nestedValue === 'known_scalar') return null;
-      value = nestedValue;
-      const restarted = addressedValue({ root: nested.root, path: [...nested.path, key] });
-      if (restarted === null) return null;
-      if (restarted === 'known_scalar') return restarted;
-      value = restarted;
+      if (runtimeIndex === requestedIndex) {
+        return ts.isOmittedExpression(element)
+          ? { kind: 'unresolved' }
+          : { kind: 'found', route: { expression: element, path: [] } };
+      }
+      runtimeIndex += 1;
     }
-    return unwrapTransparentExpression(value);
-  };
+    return { kind: 'absent' };
+  }
+  function resolveExpressionPath(
+    expression: ts.Expression,
+    path: readonly string[],
+    seen: Set<string>,
+  ): AddressedValue | null {
+    const current = unwrapTransparentExpression(expression);
+    const nestedAddress = addressForExpression(current);
+    if (nestedAddress !== null) {
+      return addressedValue({
+        root: nestedAddress.root,
+        path: [...nestedAddress.path, ...path],
+      }, seen);
+    }
+    if (path.length === 0) return current;
+    const [key, ...remaining] = path;
+    if (key === undefined) return null;
+    if (ts.isObjectLiteralExpression(current)) {
+      const resolution = objectPropertyRoute(current, key, seen);
+      return resolution.kind === 'found'
+        ? resolveExpressionPath(resolution.route.expression,
+          [...resolution.route.path, ...remaining], seen)
+        : null;
+    }
+    if (ts.isArrayLiteralExpression(current)) {
+      if (key === 'length' && remaining.length === 0) return 'known_scalar';
+      const index = Number(key);
+      if (!Number.isSafeInteger(index) || index < 0) return null;
+      const resolution = arrayElementRoute(current, index, seen);
+      return resolution.kind === 'found'
+        ? resolveExpressionPath(resolution.route.expression,
+          [...resolution.route.path, ...remaining], seen)
+        : null;
+    }
+    return null;
+  }
+  function addressedValue(
+    address: ConfigurationAddress,
+    seen: Set<string> = new Set(),
+  ): AddressedValue | null {
+    const declaration = rootDeclaration(address);
+    if (declaration?.initializer === undefined) return null;
+    const visitKey = `${declaration.pos}:${address.path.join('\u0000')}`;
+    if (seen.has(visitKey)) return null;
+    const nextSeen = new Set(seen);
+    nextSeen.add(visitKey);
+    return resolveExpressionPath(declaration.initializer, address.path, nextSeen);
+  }
   const isPrimitiveLiteral = (expression: ts.Expression): boolean =>
     ts.isLiteralExpression(expression) || expression.kind === ts.SyntaxKind.TrueKeyword ||
     expression.kind === ts.SyntaxKind.FalseKeyword || expression.kind === ts.SyntaxKind.NullKeyword;
@@ -2758,44 +2988,42 @@
     if (declaration?.initializer === undefined) return [];
     const visitKey = `${declaration.pos}:${address.path.join('\u0000')}`;
     if (seen.has(visitKey)) return [];
-    seen.add(visitKey);
-    let value: ts.Expression = declaration.initializer;
-    for (let index = 0; index <= address.path.length;) {
-      const current = unwrapTransparentExpression(value);
+    const nextSeen = new Set(seen);
+    nextSeen.add(visitKey);
+    const collect = (
+      expression: ts.Expression,
+      remaining: readonly string[],
+    ): readonly (readonly string[])[] => {
+      const current = unwrapTransparentExpression(expression);
       const nestedAddress = addressForExpression(current);
       if (nestedAddress !== null) {
-        const remaining = address.path.slice(index);
         const direct = effectivePathsForExpression(current, remaining);
         const nested = embeddedEffectivePaths({
           root: nestedAddress.root,
           path: [...nestedAddress.path, ...remaining],
-        }, seen);
+        }, nextSeen);
         return uniquePaths([...direct, ...nested]);
       }
-      if (index === address.path.length) return [];
-      const key = address.path[index];
+      if (remaining.length === 0) return [];
+      const [key, ...rest] = remaining;
       if (key === undefined) return [];
       if (ts.isObjectLiteralExpression(current)) {
-        const next = propertyValue(current, key);
-        if (next === null) return [];
-        value = next;
-        index += 1;
-        continue;
+        const resolution = objectPropertyRoute(current, key, new Set());
+        return resolution.kind === 'found'
+          ? collect(resolution.route.expression, [...resolution.route.path, ...rest])
+          : [];
       }
       if (ts.isArrayLiteralExpression(current)) {
-        const elementIndex = Number(key);
-        if (!Number.isSafeInteger(elementIndex) || elementIndex < 0) return [];
-        const element = current.elements[elementIndex];
-        if (element === undefined || ts.isOmittedExpression(element) || ts.isSpreadElement(element)) {
-          return [];
-        }
-        value = element;
-        index += 1;
-        continue;
+        const index = Number(key);
+        if (!Number.isSafeInteger(index) || index < 0) return [];
+        const resolution = arrayElementRoute(current, index, new Set());
+        return resolution.kind === 'found'
+          ? collect(resolution.route.expression, [...resolution.route.path, ...rest])
+          : [];
       }
       return [];
-    }
-    return [];
+    };
+    return collect(declaration.initializer, address.path);
   };
   const addressForReference = (
     identifier: ts.Identifier,
@@ -2874,7 +3102,12 @@
     ts.forEachChild(node, verifyReachability);
   };
   verifyReachability(sourceFile);
-  return { aliases: [...aliases], regexes: [...regexes.values()], unresolved };
+  return {
+    aliases: [...aliases],
+    regexes: [...regexes.values()],
+    unresolved,
+    nestedPaths: [...nestedPaths],
+  };
 }
 
 function candidateInspectionContext(base: string, candidate: string): HeldoutLeakInspectionContext {
@@ -2901,19 +3134,26 @@
     isResolutionConfigPath(change.path) ||
     (change.previousPath !== undefined && isResolutionConfigPath(change.previousPath)));
   const candidateSourceFiles: Record<string, string> = {};
+  const candidateConfigurationFiles: Record<string, string> = {};
   if (resolutionConfigChanged) {
-    for (const path of tree.filter((candidatePath) =>
-      (candidatePath.startsWith('src/') || candidatePath.startsWith('tools/') ||
-        candidatePath.startsWith('tests/')) && isTypeScriptOrJavaScript(candidatePath))) {
-      candidateSourceFiles[path] = execFileSync('git', ['show', `${candidate}:${path}`], {
+    for (const path of tree.filter(isTypeScriptOrJavaScript)) {
+      const source = execFileSync('git', ['show', `${candidate}:${path}`], {
         encoding: 'utf8',
         maxBuffer: 64 * 1024 * 1024,
       });
+      candidateConfigurationFiles[path] = source;
+      if (path.startsWith('src/') || path.startsWith('tools/') || path.startsWith('tests/')) {
+        candidateSourceFiles[path] = source;
+      }
     }
   }
   const viteDiscoveries = Object.entries(configSources).flatMap(([path, source]) =>
     isRootViteOrVitestConfig(path)
-      ? [{ path, discovery: viteAliases(source, path) }]
+      ? [{ path, discovery: viteAliases(source, path, {
+        ...candidateConfigurationFiles,
+        ...candidateSourceFiles,
+        ...configSources,
+      }) }]
       : []);
   const configuredAliasPrefixes = [...new Set([
     ...Object.entries(configSources).flatMap(([path, source]) =>
@@ -2925,6 +3165,7 @@
     candidateFiles: tree,
     packageJsonFiles,
     candidateSourceFiles,
+    candidateConfigurationFiles,
     resolutionConfigChanged,
     configuredAliasPrefixes,
     configuredAliasRegexes,
