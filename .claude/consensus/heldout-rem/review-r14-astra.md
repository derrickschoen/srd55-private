**F54 — High — Opaque arrays reopen Rule C’s reachability bypass (a: bounded).**

```ts
const shared = {
  resolve: { alias: {} as Record<string, string> },
};
export default {
  ...shared,
  plugins: [
    (shared.resolve.alias['@policy'] =
      '/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/src/vtt/heldout-evaluation.ts',
    false),
  ],
};
```

Discovery records the original empty alias map. `markOpaqueArray` then marks **every descendant**, including the mutation’s `shared` reference, as reachable without interpreting it. The reference guard accepts that mutation. Vite discards the resulting `false` plugin entry, leaving the mutated alias effective. See [array marking:2127](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2127), [reference guard:2286](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2286), and [Vite plugin filtering:35509](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:35509).

The same blanket marking hides literal aliases returned by a plugin’s `config()` hook: their properties become “reachable” without alias discovery. Vite merges those returned configurations. [Vite hook implementation:36015](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:36015).

Refinement (i) is therefore unsound **as implemented**: opaque array contents are promoted into the trusted set.

**F55 — High — N2 still skips loader-bearing destructuring patterns (a: bounded).**

```ts
const box = { w: window };
const { 'Worker': Spawn, ...rest } = box.w;
new Spawn('/src/vtt/heldout-evaluation.ts');
```

Combining a known loader key with a rest element produces `unknown`, overriding `loader`. For an unrecognized source, inspection rejects only `loader`, so this pattern passes and `Spawn` remains untracked. The assignment-pattern branch has the same behavior. See [classification:913](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:913) and [inspection:1073](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1073).

An untyped JavaScript parameter pattern also escapes entirely:

```js
function spawn({ 'Worker': Spawn }) {
  new Spawn('/src/vtt/heldout-evaluation.ts');
}
spawn(window);
```

Parameters enter binding inspection only when they have an initializer or one of the recognized browser-global type annotations. [Parameter selection:843](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:843).

**F56 — High — Computed members on typed browser parameters remain silent (a: bounded).**

```ts
function spawn(root: typeof window, key: 'Worker') {
  new root[key]('/src/vtt/heldout-evaluation.ts');
}
spawn(window, 'Worker');
```

The parameter is registered as a browser-global source, but the unknown-member guard checks `isGlobalNamespace`, excluding that registered typed-source category. The other member guard returns false for non-constant keys. Neither discovers nor rejects the constructor. See [typed-source recognition:611](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:611), [unknown-member guard:1274](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1274), and [loader-member guard:1308](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1308).

**F57 — High — Await now discards loader provenance while permission still allows it (a: bounded; regression).**

```ts
import { createRequire } from 'node:module';
const load = await createRequire(import.meta.url);
load.resolve('../src/vtt/heldout-evaluation.ts');
```

`expressionKinds` now preserves awaited values only for dynamic imports. Thus `load` receives no loader role. However, `isAllowedLoaderValue` still traverses any `AwaitExpression` and accepts the whole const initializer, letting the original loader escape silently. `const load = await require` has the same defect. See [classification:731](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:731) and [permission:1193](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1193).

Conversely, `const M = await import('node:module')` still seeds a namespace, but its inner import call receives an N1 escape because N1 does not allow the intervening await. Seeding therefore does not establish clean acceptance. [N1 permission:1292](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1292).

**Verified claims**

- **F47/F48:** the original getter, ordinary `sideEffect:` mutation, and named-export probes now reject, with regressions. Exact-node membership and export-specifier local-symbol lookup are implemented. [Regressions:1870](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:1870), [symbol lookup:1987](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1987). F54 exposes the remaining array exception.
- **F49:** the listed built-in namespace/named re-exports reject; the supplied local bridge’s consumer provenance has an explicit assertion. [Regressions:867](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:867).
- **F50/F51:** the original computed-root and quoted typed-parameter probes are covered. The source includes assignment-pattern handling, but F55–F56 show the classes remain open. [Computed-key regressions:913](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:913), [destructuring regressions:1092](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:1092).
- **F52:** both original awaited-import-meta probes reject. The broader await behavior has F57’s regression. [Regressions:1123](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:1123).
- **F53:** root Vite/Vitest config recognition, symbol-checked configuration helpers, and `mergeConfig` argument union are implemented with regressions. [Entry points:1914](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1914), [helper traversal:2265](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2265), [regressions:1930](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:1930).
- Quoted `resolve` keys take the resolution-specific path; computed keys and reachable accessors/methods reject. An array supplied directly as `resolve`, or a spread inside an alias array, rejects. These checks do not protect arrays treated as ordinary property values. [Traversal:2148](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2148).
- The real-tree controls read both actual configs and 674 source files. Assertions require 676 AST inspections with zero findings, then 677 with exactly the injected finding. [Assertions:2005](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:2005).
- Only the tool and spec changed. Actual additions are **six parameterized groups plus one standalone regression, totaling 18 cases**; the existing real-tree case was renamed/widened.
- Independently compared and rehashed all 66 fixtures against `7e1b6f86`: unchanged. Manifest digest remains `e14bea57…`; frozen contract remains `0f0e1d8f…`. Existing logs record [294 focused passes](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r14/vitest-focused.log:7) and [530 serial cumulative passes](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r14/vitest-cumulative-serial.log:9).

All probes above were traced through source; no tests or builds were run. The guarantee remains incomplete, and the audit’s array, destructuring, and await claims are overstated. These residuals are bounded defects, not limitations requiring execution of out-of-scope generated code.

VERDICT: REJECT
review complete