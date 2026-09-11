**F34 — High, (a) bounded defect: recursive data modules use a checker belonging to a different AST.**

Without `prepared`, `discoverModuleEdges` creates one `SourceFile`, then obtains a checker from `prepareModuleAnalyses`, which creates another. Recursive data-module inspection takes this path. See [tool:449](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:449), [tool:473](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:473), [tool:101](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:101), and [tool:962](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:962).

Imported declarations on the traversed, unbound AST lack their symbols, so loader seeding silently fails. TypeScript’s declaration-symbol lookup reads `node.symbol`: [typescript.js:54483](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/typescript/lib/typescript.js:54483).

A JavaScript `data:` module containing this payload therefore loses both loader aliases:

```js
import { createRequire as make } from 'node:module';
const load = make('file:///tmp/probe.mjs');
load.resolve('/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/src/vtt/heldout-evaluation.ts');
```

Use the source file and checker from the same prepared analysis. This also affects direct `moduleSpecifiers` calls.

**F35 — High, (a) bounded defect: ambient declarations suppress real built-in loaders.**

In `tools/probe.cts`:

```ts
export {};
declare const require: (specifier: string) => unknown;
const load = require;
load('../src/vtt/heldout-evaluation.ts');
```

`identifierKinds` treats any declaration in the inspected file as a runtime shadow, including an erased `declare` declaration. It consequently leaves `require` and `load` untracked. See [tool:525](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:525). The same distinction is missing from qualified-global recognition at [tool:513](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:513).

Ambient declarations must be distinguished from declarations that actually replace the runtime binding.

**F36 — High, (a) bounded defect: nested namespace destructuring still silently loses loaders.**

```ts
const {
  default: { createRequire: make },
} = await import('node:module');
const load = make(import.meta.url);
load.resolve('../src/vtt/heldout-evaluation.ts');
```

Propagation skips binding elements whose names are themselves patterns. The new fail-closed check examines only top-level rest/computed keys, so this constant-key nested pattern passes without tracking `make`. See [tool:634](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:634) and [tool:834](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:834).

Recursively interpret supported binding patterns or reject unsupported extraction from recognized namespaces.

**F37 — High, (a) bounded defect: configuration mutation detection does not follow alias references or mutating calls.**

```ts
const alias = {};
const edit = alias;
edit['@policy'] =
  '/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/src/vtt/heldout-evaluation.ts';
export default { resolve: { alias } };
```

The write marks `edit`, while resolving `alias` still returns its original empty initializer. See [tool:1491](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1491) and [tool:1520](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1520).

Likewise, `alias.push(...)` on an alias array and `Object.assign(alias, ...)` are not recorded: mutation detection handles only assignment binary expressions at [tool:1504](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1504). These forms can add a protected alias without a configuration or consumer finding. Conservatively rejecting mutation-capable uses of configuration values can close these cases without executing arbitrary configuration code.

**Verified claims**

- **F28:** textual source gates are removed. Every eligible effective file receives a prepared AST/checker and discovery pass at [tool:1259](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1259) and [tool:1279](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1279). Both comment-separated and Unicode-escaped regressions exist at [test:696](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:696). No textual inspection pre-gate remains; F34 is a separate AST/checker identity defect.
- **F29:** class-heritage runtime expressions are explicitly distinguished from type-only ancestors at [tool:821](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:821), with the regression at [test:715](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:715).
- **F30:** the three submitted non-constant destructuring probes fail closed, with regressions at [test:824](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:824). F36 remains.
- **F31:** direct reassignment and direct property writes now invalidate configuration resolution; both regressions exist at [test:1268](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:1268). F37 remains.
- **F32:** named re-exports are classified individually, including type-only exclusions, at [tool:797](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:797). Loader and inert-name regressions exist at [test:856](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:856).
- **F33:** the control now extends the actual source map with one injected file at [test:68](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:68). Assertions require 674 clean files, matching AST-inspected counts, zero clean findings, and exactly one injected finding: [test:1314](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:1314). I independently counted 674 eligible source files.
- The single generic escape emission remains at [tool:792](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:792).
- HEAD and supplied diff match. Only the two authorized files changed; six test declarations were added, none removed. No suppression or skip markers were added.
- All 66 fixture hashes match disk and `74839d5c`; listing digest remains `e14bea57…`. Frozen contract remains `0f0e1d8f…`.
- Available lane logs show [217/217 focused tests](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r9/vitest-focused.log:7), [452/453 cumulative with one timeout](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r9/vitest-cumulative.log:26), and [111/111 on the affected-file rerun](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r9/vitest-load-red-serial.log:7). The separately reported supervisor 453/453 run is not established by those lane logs.

The remaining findings above are all **bounded defects**. Category **(b)** applies to expanding the guarantee into arbitrary custom loaders, executable strings, or runtime-generated code—the documented exclusions—not to these findings. The source-level guarantee remains incomplete within its documented scope.

No tests or builds were run during this review; bypass conclusions are source-traced.

VERDICT: REJECT
review complete