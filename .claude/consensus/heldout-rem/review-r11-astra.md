**F40 — High, (a) bounded defect: plain aliases of `import.meta` and browser globals lose namespace provenance.**

In `tools/probe.mts`:

```ts
const meta = import.meta;
const locate = meta.resolve;
locate('../src/vtt/heldout-evaluation.ts');
```

Propagation recognizes the initializer’s `importMeta` flag, but the plain-identifier branch preserves only `kinds`. It reports completion while dropping that flag. Consequently `meta.resolve` and `locate` remain untracked. See [tool:670](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:670), [tool:716](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:716), and [tool:572](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:572).

The same problem affects `const root = window`/`self`/`globalThis` followed by loader-member access. Namespace provenance can remain tracked without reporting inert namespace roots themselves.

**F41 — High, (a) bounded defect: destructuring assignments bypass namespace extraction checks.**

```ts
let locate;
({ resolve: locate } = import.meta);
locate('../src/vtt/heldout-evaluation.ts');
```

Alias collection handles variable declarations with initializers, and unresolved binding checks likewise operate on variable declarations. This assignment is neither. No loader-valued member-access node appears explicitly, so the generic check does not compensate. See [tool:634](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:634) and [tool:913](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:913).

Assignment-pattern extraction from recognized namespaces must be interpreted or rejected. The same omission applies to extracting `createRequire` or `Worker` this way.

**F42 — High, (a) bounded defect: returned configuration references evade opaque-transfer invalidation.**

```ts
const alias = {};
function getAlias() { return alias; }
getAlias()['@policy'] =
  '/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/src/vtt/heldout-evaluation.ts';
export default { resolve: { alias } };
```

`collectLocals` does not invalidate returned configuration references. The subsequent write also escapes detection because `assignedRootIdentifier` cannot follow a call-expression receiver. See [tool:1558](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1558) and [tool:1614](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1614).

The original empty initializer remains accepted, so an `@policy` consumer receives no finding. Conservatively invalidating the returned reference closes this without evaluating the function.

**Verified claims**

- **F38’s submitted cases are resolved:** `.Module`, `.default`, and worker `.default` retain namespace roles at [tool:569](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:569). Unsupported module/worker namespace accesses fail closed at [tool:888](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:888). Four regressions begin at [test:787](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:787).
- **F39’s submitted cases are resolved:** ordinary property values, shorthand properties, array elements, and nested literal transfers are traversed recursively; incomplete transfers invalidate their destination. See [tool:1574](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1574). Four regressions begin at [test:1440](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:1440). F42 remains outside those handled transfer positions.
- No textual inspection pre-gate was reintroduced. Eligible files still receive prepared analysis and discovery: [tool:1324](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1324).
- HEAD and supplied diff match. Only the authorized two files changed: 108 additions, eight deletions; two parameterized test declarations added, none removed. No suppression or skip markers were added.
- Independently verified all 66 fixture hashes against disk and `ca5e0f01`; listing digest remains `e14bea57…`. Frozen contract remains `0f0e1d8f…`.
- Existing logs confirm [235/235 focused tests](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r11/vitest-focused.log:7) and [471/471 cumulative tests](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r11/vitest-cumulative.log:9).

All three remaining findings are **bounded defects**, not category (b) limitations. The source-level guarantee is not complete within its documented scope.

No tests or builds were run during this review; bypass conclusions are source-traced.

VERDICT: REJECT
review complete