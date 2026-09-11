Restored `Document` and `HTMLElement` in `FORBIDDEN_GLOBALS` and added two exact-use controls:

- `void new Document()` resolves `Document` to forbidden `Document`.
- `void HTMLElement.prototype` resolves the full use site to forbidden `HTMLElement`.
- Existing clean shadowed-`document` control remains exactly empty.

Added `expect(` calls:

```text
expect(violations.some((violation) =>
  /\/document-constructor\.ts resolves Document to Document$/u.test(violation))).toBe(true);

expect(violations.some((violation) =>
  /\/html-element-prototype\.ts resolves HTMLElement\.prototype to HTMLElement$/u.test(violation))).toBe(true);
```

Verification:

```text
npx vitest run --configLoader runner tests/unit/vtt/engine-boundary.test.ts
```

1 file passed, 19 tests passed.

```text
npx vitest run --configLoader runner tests/unit/vtt/engine-boundary.test.ts -t 'catches the Document platform control at its exact use site'
```

1 passed, 18 skipped.

```text
npx vitest run --configLoader runner tests/unit/vtt/engine-boundary.test.ts -t 'catches the HTMLElement platform control at its exact use site'
```

1 passed, 18 skipped.

```text
npx vitest run --configLoader runner tests/unit/vtt/engine-boundary.test.ts -t 'rejects bare Node builtins plus aliased, destructured, and computed browser globals'
```

1 passed, 18 skipped.

```text
npx vitest run --configLoader runner tests/unit/vtt/engine-boundary.test.ts -t 'platform control'
```

7 passed, 12 skipped.

```text
npm run typecheck:fast
sg scan
git diff --check
```

All exited 0; `sg scan` reported zero findings. Only `tests/unit/vtt/engine-boundary.test.ts` is modified. The frozen contract hash remains `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.

HANDOFF S7 MERGE FIX DONE
diff --git a/tests/unit/vtt/engine-boundary.test.ts b/tests/unit/vtt/engine-boundary.test.ts
index d8b3f683be8ef4b00ef8ec3421c7b8b176acb74a..c82c877e10341e15120e33a0e2031b0c14782c81
--- a/tests/unit/vtt/engine-boundary.test.ts
+++ b/tests/unit/vtt/engine-boundary.test.ts
@@ -193,6 +193,7 @@
 const NODE_BUILTINS = new Set(builtinModules.flatMap((name) => [name, `node:${name}`]));
 const FORBIDDEN_GLOBALS = new Set([
   'document', 'window', 'indexedDB', 'IDBDatabase', 'IDBFactory', 'IDBObjectStore',
+  'Document', 'HTMLElement',
   'HTMLCanvasElement', 'OffscreenCanvas', 'CanvasRenderingContext', 'CanvasRenderingContext2D',
   'SharedArrayBuffer', 'Atomics', 'importScripts',
 ]);
@@ -774,6 +775,18 @@
     expect(violations.some((violation) => /\/builtin\.ts imports fs$/u.test(violation))).toBe(true);
   });
 
+  it('catches the Document platform control at its exact use site', () => {
+    const violations = platformControlViolations('document-constructor', 'void new Document();');
+    expect(violations.some((violation) =>
+      /\/document-constructor\.ts resolves Document to Document$/u.test(violation))).toBe(true);
+  });
+
+  it('catches the HTMLElement platform control at its exact use site', () => {
+    const violations = platformControlViolations('html-element-prototype', 'void HTMLElement.prototype;');
+    expect(violations.some((violation) =>
+      /\/html-element-prototype\.ts resolves HTMLElement\.prototype to HTMLElement$/u.test(violation))).toBe(true);
+  });
+
   it('all runtime entries converge on the pinned session reducer edges', () => {
     expect(reducerCallSites(coreDependencyGraph())).toEqual([
       'src/vtt/dm-encounter-host.ts#commandReducer -> src/vtt/session-encounter-reducer.ts#reduceSessionEncounter',
