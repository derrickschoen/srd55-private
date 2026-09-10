**F58 — High — Addressing an alias map loses its alias-bearing classification (a: bounded).**

```ts
const shared = { resolve: { alias: {} } };
const p = shared.resolve.alias;
Object.assign(p, {
  '@policy': '/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/src/vtt/heldout-evaluation.ts',
});
export default shared;
```

`p` retains the address `shared.resolve.alias`, but classification examines only the addressed empty object and the root symbol’s flag. Neither identifies this value as the actual alias map, so passing it to `Object.assign` is allowed. Discovery retains the original empty map.

Additionally, identifiers bound at a **resolve** position are not added to `aliasBearingSymbols`, contrary to the stated rule. See [alias-position marking:2138](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2138), [resolve-position handling:2152](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2152), and [classification:2501](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2501).

The same address-context loss affects `shared.test.alias`.

**F59 — High — Opaque `test` values can hide effective Vitest aliases (a: bounded).**

```ts
function makeTestConfig() {
  const t = Object.create(null);
  t.alias = {
    '@policy': '/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/src/vtt/heldout-evaluation.ts',
  };
  return t;
}
export default { test: makeTestConfig() };
```

`test` is treated as an ordinary key, so its call-valued initializer is ignored. No configuration constant becomes tracked, and the outside-property check does not inspect assignment accesses such as `t.alias`. This configuration therefore introduces an alias without discovery or rejection. See [ordinary-value handling:2148](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2148), [key dispatch:2214](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2214), and [outside-property check:2552](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2552).

The installed Vitest implementation explicitly reads `viteConfig.test` and places `testConfig.alias` into resolution options. [Vitest:14087](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:14087). This is ordinary configuration construction, not a user plugin hook.

**F60 — High — A permitted comparison can transfer the configuration object to user code (a: bounded).**

```ts
const shared = { resolve: { alias: {} } };
const receiver = {
  [Symbol.hasInstance](value: {
    resolve: { alias: Record<string, string> };
  }) {
    value.resolve.alias['@policy'] =
      '/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/src/vtt/heldout-evaluation.ts';
    return true;
  },
};
shared instanceof receiver;
export default shared;
```

`instanceof` invokes the custom `Symbol.hasInstance` method with `shared`. The method can mutate its alias map. The guard nevertheless allows this reference unconditionally because `InstanceOfKeyword` is classified as a non-escaping comparison. See [comparison classification:2511](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2511), [unconditional allowance:2536](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2536), and [installed operator declaration](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/typescript/lib/lib.es2015.symbol.wellknown.d.ts:22).

The permitted-position rule itself needs tightening here; this does not require flow tracking.

**F61 — Medium — An allowed const alias is rejected at its declaration (a: bounded).**

```ts
const shared = { resolve: { alias: {} } };
const p = shared;
void p;
export default shared;
```

The guard resolves `p` to `shared`’s root declaration, then exempts only that root’s declaration name. Consequently, the declaration-name occurrence of `p` is evaluated as an escaping use of an alias-bearing subtree and rejected. This contradicts the explicit permission for non-exported plain-const aliases. See [address propagation:2381](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2381) and [declaration exemption:2542](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2542).

**Verified claims**

- **F54’s original probes now reject.** Opaque-array blanket marking is removed; mutation targets and alias-bearing helper arguments have regressions. The addressed-subtree guard remains unsound through F58–F60. [Regressions:1988](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:1988).
- **F55/F56 are fixed for the reported classes:** loader classification now takes precedence over rest/unknown classification; untyped parameter patterns enter inspection; typed browser sources participate in computed-member rejection. [F55 regressions:1143](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:1143), [F56 regressions:934](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:934).
- **F57 is fixed**, including a regression requiring awaited `import('node:module')` to produce the resolution finding without a loader-escape finding. [Regressions:1185](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:1185).
- Parentheses, `as`, `satisfies`, non-null wrappers, optional property access, and constant template keys retain the static address. Comma-result escapes remain subject to alias-bearing classification. Reachable getters/computed keys reject; `Object.freeze(shared)` rejects when the addressed value is correctly classified as alias-bearing. [Address traversal:2303](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2303), [guard:2523](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2523). These mechanisms inherit F58’s classification defect.
- Literal `resolve.alias` and literal `test.alias` reach alias discovery. Vite consumes `resolve.alias`; Vitest additionally consumes `test.alias`. The missing protection is opaque construction of an alias-capable container and addressing its alias-map descendants. [Vite implementation:35467](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:35467), [Vitest implementation:10327](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vitest/dist/chunks/cli-api.BK8pd4xc.js:10327).
- Both real configs and 674 actual source files remain in the clean/control assertions. Existing logs record **310 focused passes** and **546 cumulative passes**. [Controls:2142](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:2142), [focused log](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r16/vitest-focused.log:7), [cumulative log](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r16/vitest-cumulative.log:9).
- Only the tool and spec changed; no test declaration was removed. Independently compared all 66 fixture files against `1cecccc3`: byte-identical. Manifest digest remains `e14bea57…`; frozen contract remains `0f0e1d8f…`.

All probes were source-traced; no tests/builds, agents, or sibling worktrees were used. The guarantee remains incomplete. F58–F61 are bounded defects. The expressly excluded plugin-config-hook behavior remains category (b) and is not re-raised.

VERDICT: REJECT
review complete