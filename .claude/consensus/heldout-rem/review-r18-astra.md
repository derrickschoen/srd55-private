**F65 — High, (a) bounded: multiple-placement protection is lost when an object is reached through another binding.**

This `vite.config.mjs` still has a silent path:

```js
const rules = [{
  name: 'p',
  find: '@ordinary',
  replacement: '/ordinary'
}];
const shared = { plugins: rules };

function install(rule) {
  rule.find = '@policy';
  rule.replacement =
    '/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/src/vtt/heldout-evaluation.ts';
}

install(shared.plugins[0]);
export default { ...shared, resolve: { alias: rules } };
```

`rules` receives both placements, but `shared.plugins[0]` is classified using only `shared`’s placement plus `plugins/0`. `addressedValue` follows the embedded `rules` identifier to its entry object without carrying that binding’s semantic placements back into classification. The entry contains no semantic key, so the call argument escapes. [Placement selection:2652](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2652), [dereference:2598](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2598), [classification:2671](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2671)

Discovery consequently retains `@ordinary`, while Vite consumes the mutated `@policy` entry. A const alias of `shared.plugins[0]` has the same defect. [Vite entry normalization:2547](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:2547)

**F66 — High, (a) bounded: semantic placements are omitted beneath shorthand properties and opaque arrays.**

`visitResolveObject` skips ordinary shorthand names entirely. `visitOrdinaryPropertyValue` neither visits inline arrays nor descends into a referenced literal’s contents. [Shorthand omission:2217](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2217), [ordinary values:2171](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2171)

For example, this `vitest.config.mjs` leaves `projects` untracked:

```js
const projects = [{}];

function install(project) {
  project.resolve = {};
  project.resolve.alias = {
    '@policy': '/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/src/vtt/heldout-evaluation.ts'
  };
}

install(projects[0]);
export default { test: { projects } };
```

The same omission occurs with:

- `const project = {}; install(project); export default { test: { projects: [project] } };`
- A separately bound `projects = [project]`, exported as `projects: projects`, while `project` escapes.

These are real alias-capable configurations: Vitest accepts inline project objects, passes their options into project initialization, and creates a Vite server from them. [Project consumption:11304](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:11304), [option forwarding:11117](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:11117), [server creation:11048](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:11048)

Both findings are source-traced ordinary configuration mutations, not plugin-hook exclusions. No probes were executed.

**Verified claims**

- F64’s direct entry, const-entry alias, and `test.alias` variants now fail closed. Numeric and string literal indexes resolve; identifier indexes—including const-bound indexes—and other unsupported computed indexes fail closed. [Regressions:2269](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:2269), [keys:311](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:311)
- Directly referenced bindings with multiple placements use union semantics. Discovery precedes reference verification, so later textual placement does not evade checking. F65 concerns indirect access through another binding. [Effective paths:2666](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2666)
- `alias: [...entries]` reports unresolved, but its regression does **not** demonstrate placement propagation: the existing strict alias parser rejects the spread itself. [Spec:2286](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:2286), [parser:2083](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2083)
- Placement propagation terminates: it deduplicates paths and propagates fixed address suffixes along prefix-compatible addresses; cycles cannot add a positive suffix indefinitely. Root conditionals, callback returns, and `mergeConfig` arguments retain their traversal. [Propagation:2493](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2493), [root traversal:2336](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2336)
- The new plugin-list control genuinely tracks a nonsemantic placement and asserts zero findings. Existing assertions were not weakened. Actual-file clean and injected controls remain intact. [Plugin control:2335](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:2335), [real-tree controls:2452](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:2452)
- N1/N2 branches are unchanged; their shared `propertyKey` helper now also recognizes numeric literals.
- Only the two authorized files changed. I independently verified all **66** fixture hashes and bytes against the previous commit and HEAD, plus the frozen contract. Existing logs report **338/338** focused and **574/574** cumulative; I ran no tests/builds. [Focused:7](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r19/vitest-focused.log:7), [cumulative:9](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r19/vitest-cumulative.log:9)

The source-level guarantee remains incomplete because of F65–F66.

VERDICT: REJECT
review complete