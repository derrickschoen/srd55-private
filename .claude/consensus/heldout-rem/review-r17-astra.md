**F64 — High, (a) bounded: alias-array entries lose positional capability and can escape.**

`relativePath.length === 0` is too narrow at [heldout-leak-check.ts:2575](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2575). This valid `vite.config.mjs` provides a silent path:

```js
const rules = [{ find: '@ordinary', replacement: '/ordinary' }];

function install(rule) {
  rule.find = '@policy';
  rule.replacement =
    '/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/src/vtt/heldout-evaluation.ts';
}

install(rules['0']);
export default { resolve: { alias: rules } };
```

Source trace:

- `rules` becomes capable through `visitAliasValue`, but its address remains `{root: rules, path: []}`. Configuration placement does **not** prepend `resolve.alias` to binding-local paths. [Capability:2142](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2142), [addresses:2392](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2392)
- `rules['0']` resolves to the entry object. Its relative path is nonempty, its absolute path contains no semantic key, and its literal contains only `find` and `replacement`. Consequently `isAliasBearing` returns false and permits the call argument. [Element lookup:2495](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2495), [classification:2574](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2574)
- Discovery records only `@ordinary`; the helper’s writes through its untracked parameter do not invalidate configuration. A consumer importing `@policy` therefore escapes the alias check. [Discovery:2056](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2056), [write guard:2622](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2622)
- Vite subsequently reads the mutated entry’s `find` and `replacement`. [Vite source:2541](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:2541)

The same defect survives `const entry = rules['0']; install(entry)`, further plain-const aliases, and placement under `test.alias`. This is an ordinary supported alias-array mutation, not a plugin-hook exclusion. These are source-traced conclusions; I executed no probes.

**Verified claims**

- **F62/F63’s reported forms are closed.** Shorthand and container spreads now mark their symbols; root spreads propagate capability recursively. The new regressions exercise those cases. [Implementation:2169](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2169), [regressions:2171](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:2171)
- Two-hop spread composition, conditional roots, callback returns, and `mergeConfig` arguments preserve root/container capability. Same-address const aliases inherit it. [Root traversal:2257](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2257), [propagation:2438](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2438)
- The fixed-point loops terminate: they only add previously absent symbols from a finite source tree. `sameAddress` compares the complete root and path, so `const p = shared.plugins` does not inherit whole-root capability. [Loops:2416](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2416)
- The `plugins`/`build` controls are legitimate permitted-shape controls, although their standalone symbols are untracked; retained `shared.plugins` cases exercise addressed descendants. No existing assertion was weakened. [New controls:2247](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:2247), [descendant controls:2005](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:2005)
- Actual-file clean and injected controls remain intact, including parsed-file counts and exactly one injected finding. [Spec:2370](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:2370)
- Git confirms only the authorized two files changed; N1/N2 implementation is unchanged. I independently verified all 66 fixtures against the r14 hashes, previous commit, and HEAD, plus the frozen contract. Existing logs report **331/331** focused and **567/567** cumulative. [Focused:7](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r18/vitest-focused.log:7), [cumulative:9](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r18/vitest-cumulative.log:9)

The source-level guarantee remains incomplete because of F64.

VERDICT: REJECT
review complete