**F43 — High — Namespace provenance still disappears through containers (a: bounded).**

```ts
const box = { meta: import.meta };
box.meta.resolve('../src/vtt/heldout-evaluation.ts');
```

`box` becomes an ambiguous namespace symbol, but the member check rejects only selected keys on a **direct identifier receiver**. `box.meta` passes because `meta` is absent from that list; the outer `.resolve` passes because its receiver is a property expression. No resolver edge or generic escape is emitted. The same gap permits boxed global/worker/module namespaces. See [ambiguity propagation](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:904), [member classification](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1096), and [generic emission](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1132). F40’s demonstrated alias hops work, but the provenance class remains open.

**F44 — High — Computed object properties sever configuration reference tracking (a: bounded).**

In `vite.config.ts`:

```ts
const alias: Record<string, string> = {};
const box = { ['value']: alias };
box.value['@policy'] =
  '/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/src/vtt/heldout-evaluation.ts';
export default { resolve: { alias } };
```

The computed property marks `box` untrackable without linking or invalidating its `alias` initializer. The subsequent write invalidates only `box`; discovery accepts the original empty `alias`. Consequently, a consumer importing `@policy` escapes the configured-prefix check. This contradicts the property-value audit row. See [skipped transfer](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1813), [write tracking](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1867), and [local resolution](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1937).

**F45 — High — Loop assignment heads can mutate configuration silently (a: bounded).**

```ts
const alias: Record<string, string> = {};
for (alias['@policy'] of [
  '/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/src/vtt/heldout-evaluation.ts',
]) {}
export default { resolve: { alias } };
```

Configuration inspection marks references in the for-of **iterable**, but ignores the assignment target. That target is not a binary assignment, so the ordinary write handler does not catch it either. Discovery again accepts an empty alias map. A `for-in` head assigning the same property from an object’s literal path key has the same gap. See [assignment handler](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1867) and [for-of handler](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1921). The for-of audit row is false; for-in heads are missing.

**F46 — High — Configuration invocation escapes remain allowed by default (a: bounded).**

Three distinct forms remain:

- **Constructor arguments:** `new Update(alias)` can mutate the map through its constructor parameter. Configuration inspection handles `CallExpression`, not `NewExpression`; no argument-to-reference invalidation occurs.
- **Receiver mutation:** an initially literal alias array can execute `alias.fill({ find: '@policy', replacement: '/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/src/vtt/heldout-evaluation.ts' })`. Only `push`, `splice`, and `unshift` invalidate receivers. Discovery retains the initial entries.
- **Textually privileged calls:** a locally defined `function defineConfig(x) { x.ref['@policy'] = '…'; }` followed by `defineConfig({ ref: alias })` escapes argument tracking. The exemption checks the callee’s spelling, not its binding.

Each permits configuration mutation without custom module-loading code. The responsible branches are together at [tool:1882](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1882). Constructor arguments and call receivers need explicit audit coverage; the unconditional configuration call-argument row is also overstated.

**Verified claims**

- **F40:** the six namespace families receive one- and two-hop regressions; provenance flags now propagate between identifier symbols. [Implementation](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:740), [regressions](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:846).
- **F41:** object assignments, unsupported array patterns, nested assignments, for-of extraction, and parameter defaults now have handling and regressions. [Implementation](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:800), [regressions](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:1007).
- **F42:** return/yield/throw, await, class fields, and the demonstrated closure/opaque-receiver cases now invalidate references. Four new regressions cover the reported examples, but F44–F46 prevent class closure. [Handlers](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1896), [regressions](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:1570).
- **Audit probes:** direct loader values in tagged templates, class heritage, and comma expressions reach generic rejection; configuration references in those positions are explicitly invalidated. Awaited configuration references are also invalidated. For-of assignment targets fail the audit as described above. [Loader checks](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1020), [runtime heritage handling](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1115), [configuration checks](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1900). The audit test checks labels and classification strings, not behavioral coverage of every row. [Test:323](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:323).
- Git comparison confirms only the tool and spec changed: 477 additions/21 deletions, with no spec deletions. The five new test declarations expand to 26 cases.
- Independently rehashed all 66 fixtures and compared their bytes against `e9cf5d84`: unchanged. Listing digest remains `e14bea57…`; frozen contract remains `0f0e1d8f…`. [Fixture manifest](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r12/fixture-hashes.after.txt:1), [frozen digest](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r12/frozen-contract.sha256:1).
- Existing logs record **261/261 focused** and **497/497 cumulative**. I ran no tests or builds. [Focused log](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r12/vitest-focused.log:7), [cumulative log](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r12/vitest-cumulative.log:9).

The source-level guarantee remains incomplete. All findings above are bounded defects; none requires interpreting the explicitly excluded executable strings, custom loaders, or runtime-generated code. [Documented exclusions](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:150).

VERDICT: REJECT
review complete