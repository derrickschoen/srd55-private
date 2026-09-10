**F67 — High, (a) bounded: spread semantics are missing from address resolution.**

The union follows explicit properties, but `propertyValue` ignores object-spread overrides. Both array walkers also use AST element positions as runtime indexes, ignoring preceding spread lengths. [Property lookup:2638](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2638), [array lookup:2664](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2664), [union traversal:2778](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2778)

This `vite.config.mjs` therefore remains a silent path:

```js
const rules = [{
  name: 'p', find: '@ordinary', replacement: '/ordinary'
}];
const overlay = { plugins: rules };
const shared = { plugins: [{ name: 'safe' }], ...overlay };

function install(rule) {
  rule.find = '@policy';
  rule.replacement =
    '/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/src/vtt/heldout-evaluation.ts';
}

install(shared.plugins[0]);
export default { ...shared, resolve: { alias: rules } };
```

The checker inspects the shadowed `safe` object; runtime passes `rules[0]`. Discovery retains `@ordinary`, while the runtime alias becomes `@policy`.

The array equivalent also escapes: with **two** entries in `rules`, use `shared = { plugins: [...rules, { name: 'safe' }] }` and `install(shared.plugins[1])`. Runtime selects the second rule; both walkers select the final AST literal.

**F68 — High, (a) bounded: project `extends` files bypass configuration discovery.**

An inline project can load another configuration:

```js
// vitest.config.mjs
export default {
  test: { projects: [{ extends: './tools/project-config.mjs' }] }
};
```

If `tools/project-config.mjs` exports a `resolve.alias` mapping from `@policy` to the held-out module, that mapping is neither discovered nor rejected. `extends` falls through ordinary-value handling, while configuration discovery only accepts root Vite/Vitest filenames. [Ordinary handling:2172](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2172), [discovery filter:1743](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1743)

Installed Vitest explicitly converts `options.extends` into `configFile` and passes it to Vite. This is a consumed configuration dependency, not a plugin-hook exclusion. [Vitest:11113](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:11113), [server creation:11048](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:11048)

**F69 — Medium, (a) bounded: terminal embedded references still produce false positives.**

```js
const plugins = [];
const shared = { plugins };
install(shared.plugins);
export default { ...shared };
```

The placement union correctly remains nonsemantic, but `addressedValue` stops at the identifier `plugins` when the requested path ends. `subtreeContainsAliasKey` then classifies that identifier as nonliteral, rejecting this known empty plugin array. Accessing an entry follows another iteration, which explains why the new entry-only clean control misses it. [Value resolution:2652](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2652), [fallback classification:2825](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2825)

All findings above are source traces; no probes were executed.

**Verified claims**

- F65’s exact, const-alias, and two-level probes now fail closed, with a clean plugin-only sibling. F67 is the remaining spread-resolution gap. [Regressions:2351](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:2351)
- All three F66 forms are covered. Literal project aliases are discovered, and project bindings/spreads receive semantic prefixes that protect escapes. [Project handling:2195](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2195), [regressions:2401](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:2401)
- Ordinary literal arrays and shorthand now record placements. Both requested plugin-entry shapes remain clean by source trace; actual-file clean and injected controls remain intact. No existing assertion was weakened. [Array handling:2371](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2371), [real-tree controls:2559](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:2559)
- The installed `test.projects` citation is correct; `test.workspace` is explicitly rejected. Browser instances are consumed, but exclude `alias` from supported overrides and reuse the parent’s Vite server and resolver, so they are not additional alias-resolution roots. [Workspace rejection:13298](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:13298), [instance types:1568](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vitest/dist/chunks/reporters.d.DtoKVV2s.d.ts:1568), [resolver reuse:11025](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:11025)
- Placement fixed points remain finite; the new union runs during reference inspection with a recursion guard rather than feeding expanding paths back into those loops. [Union guard:2753](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2753)
- N1/N2 implementation is unchanged. Only the two authorized files differ. I independently verified all **66** fixture hashes and bytes against the previous commit and HEAD, plus the intact frozen contract.
- Existing lane logs record **346/346** focused and **582/582** cumulative. I did not rerun verification. [Focused:7](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r20/vitest-focused.log:7), [cumulative:9](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r20/vitest-cumulative.log:9)

The source-level guarantee remains incomplete.

VERDICT: REJECT
review complete