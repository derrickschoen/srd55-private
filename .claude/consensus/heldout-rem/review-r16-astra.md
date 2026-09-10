**F62 — High, (a) bounded: shorthand and spread containers bypass F58’s marking.**

The identifier branch marks alias-bearing containers at [heldout-leak-check.ts:2155](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2155), but shorthand `resolve`/`test` and container spreads call `visitReachableIdentifier` directly, bypassing that marking at [line 2207](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2207) and [line 2169](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2169).

This valid `vite.config.mjs` therefore has a silent path:

```js
const resolve = {};
function install(target) {
  target.alias = {
    '@policy': '/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/src/vtt/heldout-evaluation.ts'
  };
}
install(resolve);
export default { resolve };
```

The tracked literal is empty, its address has no semantic segment, and `install(resolve)` is consequently allowed by [line 2506](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2506) and [line 2538](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2538). The helper’s property writes are not object-literal properties covered by [line 2553](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2553).

Equivalent missed forms include shorthand `test`, and `install(parts); export default { test: { ...parts } }` with initially empty `parts`. Vite consumes `resolve.alias`, and Vitest transfers `test.alias` into resolution configuration. [Vite source:35468](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:35468), [Vitest source:14104](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:14104)

**F63 — High, (a) bounded: initially alias-free configuration roots can escape and acquire aliases.**

Root identifiers enter the reachable set without alias-capable context at [line 2273](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2273). Consequently this also escapes the guard:

```js
const shared = {};
function install(target) {
  target.resolve = {};
  target.resolve.alias = {
    '@policy': '/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/src/vtt/heldout-evaluation.ts'
  };
}
install(shared);
export default shared;
```

`shared` is classified from its empty initializer as non-alias-bearing, permitting the call argument. The same gap affects root spread composition. This is a bounded soundness defect in the rule’s classification, not a plugin-hook or runtime-generated-code exclusion.

For both findings, discovery records neither an alias nor unresolved configuration. A consumer importing `@policy` then passes the configured-alias checks at [line 1598](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1598). These conclusions are source traces; I executed no probes.

**Verified claims**

- F58’s exact `Object.assign(p, …)` probes for both alias paths have effective regressions. Its broader class remains open under F62. [Spec:2041](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:2041)
- F59’s `makeTestConfig()` probe fails closed; literal `test.alias` discovery has a consumer control. [Spec:2077](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:2077)
- Parent aliases preserve concatenated addresses; constant string/template keys retain semantic segments. `test: mergeConfig(...)`, conditional `test` values, and the requested `...shared.resolve` composition fail closed. Literal alias arrays use the same entry parser. [Address handling:2373](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2373), [constant keys:273](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:273), [container handling:2153](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2153), [arrays:2080](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2080)
- F60 and F61 have effective negative and clean controls: `instanceof` versus strict equality, and `use(p)` versus `void p`. [Spec:2122](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:2122)
- The real-tree controls read actual files, extend the same source map, and assert parsed counts, zero clean findings, and exactly one injected finding. [Setup:37](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:37), [assertions:2271](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:2271)
- Git confirms only the two authorized files changed, with no tests removed. I independently verified all 66 fixture hashes and unchanged bytes against `b04ef394`, plus the frozen contract hash. Existing logs record **321/321** focused and **557/557** cumulative; I ran no tests/builds. [Focused log:7](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r17/vitest-focused.log:7), [cumulative log:9](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r17/vitest-cumulative.log:9)

The source-level guarantee remains incomplete because of F62–F63. Plugin config hooks remain the documented category (b) exclusion.

VERDICT: REJECT
review complete