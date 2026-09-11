**F23 — High: The “exact alias” exception permits untracked destructuring and exported bindings.**

This valid form silently loses the resolver:

```ts
const key = 'resolve';
const { [key]: locate } = require;
locate('../src/vtt/heldout-evaluation.ts');
```

The initializer is allowed merely because it has a loader role; the declaration’s binding pattern is not validated. Alias propagation cannot resolve the identifier key, so `locate` remains untracked. See [heldout-leak-check.ts:730](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:730) and [heldout-leak-check.ts:596](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:596).

Likewise, `export const { resolve: locate } = import.meta;` escapes silently: binding-element declarations are exempt without the exported-variable check applied to simple identifiers. Object-rest destructuring also receives the unchecked initializer exception. See [heldout-leak-check.ts:674](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:674). These violate the structural ruling.

**F24 — High: Factory-produced loaders can escape through arbitrary expressions.**

```ts
import { createRequire } from 'node:module';
const box = { load: createRequire(import.meta.url) };
box.load.resolve('../src/vtt/heldout-evaluation.ts');
```

The factory identifier is accepted immediately as a direct call, without checking where its returned loader goes. The generic check visits identifiers and `import.meta`, but never checks the loader-valued call expression itself. Consequently the object property and subsequent resolver remain untracked. See [heldout-leak-check.ts:543](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:543), [heldout-leak-check.ts:723](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:723), and [heldout-leak-check.ts:749](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:749).

The same gap permits returning, exporting, or passing a freshly created loader without an escape finding. This uses the recognized built-in factory, within scope.

**F25 — High: Import-equals declarations do not seed loader symbols.**

In `tools/probe.cts`:

```ts
import M = require('node:module');
M.createRequire(__filename).resolve('../src/vtt/heldout-evaluation.ts');
```

Import seeding handles only `ImportDeclaration`; alias propagation handles only variable declarations. The separate import-equals visitor records the harmless `node:module` edge but never assigns `M` its namespace role. Its local declaration also suppresses ambient fallback. See [heldout-leak-check.ts:557](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:557), [heldout-leak-check.ts:501](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:501), and [heldout-leak-check.ts:761](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:761). The subsequent protected resolution receives no finding.

**F26 — High: Alias configuration discovery still silently accepts unresolved or misinterpreted forms.**

Two concrete remaining cases:

- **Shadowed identifiers:** configuration locals are stored by spelling across all scopes. With an outer protected `alias` map and a later function-local `const alias = {}`, `export default { resolve: { alias } }` is inspected using the empty inner map. See [heldout-leak-check.ts:1328](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1328).
- **Spreads inside alias entries:** `{ find: '@safe', replacement: '/safe.ts', ...{ find: '@policy', replacement: '/absolute/path/to/src/vtt/heldout-evaluation.ts' } }` inside an alias array is inspected using the first direct `find` and `replacement`. The overriding spread is ignored without marking configuration unresolved. Non-literal overriding spreads have the same problem. See [heldout-leak-check.ts:1378](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1378).

Both can leave an `@policy` consumer unchecked. They are ordinary alias configuration, within the requested boundary.

**F27 — High: Default-deny now rejects ordinary repository behavior.**

`window`, `self`, and `globalThis` are classified as tracked namespaces, while every `import.meta` occurrence enters the generic check. Ordinary properties do not receive callable loader roles. Thus existing `window.addEventListener(...)` and `import.meta.env.DEV` produce `loader_reference_escaped`. See [heldout-leak-check.ts:487](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:487), [heldout-leak-check.ts:707](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:707), and actual repository uses at [main.ts:80](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/src/main.ts:80) and [main.ts:107](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/src/main.ts:107).

Configuration changes necessarily inspect these existing files: [heldout-leak-check.ts:1438](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1438). Therefore routine configuration changes cannot pass cleanly even without a leak.

Regex aliases also become `'*'`, which rejects **every** module specifier, including unrelated ordinary imports; the regex is never applied. See [heldout-leak-check.ts:1391](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1391) and [heldout-leak-check.ts:989](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:989).

**Verified claims**

- **Generic emission exists:** `recordLoaderEscape` has one `addUnresolved('loader_reference')` site at [tool:737](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:737). Symbol-based tracking and fixed-point alias propagation are real. The exceptions and incomplete seeding above prevent a complete default-deny guarantee.
- **Requested adversarial uses:** source tracing confirms rejection of `[require][0](...)`, `({ r: require }).r(...)`, tagged templates, `Function.prototype.call.call` with a loader argument, class-field initializers, default-parameter initializers, `for (... of [require])`, `void require`, `typeof require`, computed property keys containing a loader, and getters returning loaders. Their loader references reach the generic check outside an allowed context.
- **Three additional regressions exist:** nested object/array storage, spread-argument payload, and tagged-template invocation at [test:700](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:700).
- **F18 resolved:** leading `**` no longer depends on `base`; literal option spreads are evaluated, and unsupported options fail closed. Regressions begin at [test:405](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:405).
- **F19 resolved:** any recursively unresolved package-condition branch now propagates failure at [tool:899](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:899), with the nested regression at [test:900](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:900).
- **F20’s submitted examples are covered**, including nullish expressions, namespace aliases, inline/dynamic factories, exports, and bound script loaders. Regressions begin at [test:641](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:641). F23–F25 remain.
- **F21’s submitted configuration forms are covered**, using `vite.config.ts` source records without supplied alias prefixes: [test:963](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:963). These exercise configuration discovery from file contents, though not Git-backed CLI enumeration. F26–F27 remain.
- **F22 resolved for wall inspection:** `.d.ts`, `.d.mts`, and `.d.cts` are excluded before transpilation at [tool:81](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:81), with a regression at [test:1019](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:1019).
- HEAD and supplied diff match. Only the authorized two files changed: 696 additions, 282 deletions; 14 test declarations added, none removed. Changed comma/conditional expectations reflect the new escape policy rather than permitting leaks.
- Independently verified all 66 fixture hashes against disk and `472d5262`; listing digest remains `e14bea57…`. Frozen contract remains `0f0e1d8f…`.
- Existing logs record [187/187 focused tests](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r7/vitest-focused.log:7) and [423/423 cumulative tests](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r7/vitest-cumulative.log:9). I ran no tests or builds.

Ordinary static imports remain accepted without matching alias restrictions. However, the immediate two-file revision consists of exempt tooling/tests, so its passing inspection would not establish repository-wide usability. The existing “clean tree” regression contains only two synthetic records: [test:1091](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:1091).

The scope table remains overstated: the source-level guarantee is **not complete within its documented scope**. The executable-string/custom-loader exclusions do not cover these findings.

VERDICT: REJECT
review complete