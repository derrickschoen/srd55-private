**F38 — High, (a) bounded defect: ordinary namespace-member access loses loader provenance.**

In `tools/probe.mts`:

```ts
import * as M from 'node:module';
const make = M.Module.createRequire;
const load = make(import.meta.url);
load.resolve('../src/vtt/heldout-evaluation.ts');
```

`expressionKinds` does not preserve the module namespace role through `.Module` or `.default`. Consequently `make` and `load` remain untracked, and the protected resolution produces no finding. See [heldout-leak-check.ts:560](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:560).

These members are already recognized during destructuring at [tool:646](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:646). The installed Node declarations confirm `Module.Module` and `Module.createRequire`: [module.d.ts:10](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/@types/node/module.d.ts:10), [module.d.ts:28](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/@types/node/module.d.ts:28).

The same omission affects `.default` namespace access, including the worker namespace counterpart. Member access and destructuring need consistent namespace propagation.

**F39 — High, (a) bounded defect: configuration references transferred through ordinary object properties evade mutation tracking.**

```ts
const alias = {};
const box = { value: alias };
box.value['@policy'] =
  '/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/src/vtt/heldout-evaluation.ts';
export default { resolve: { alias } };
```

The write marks `box` as mutated, but no link connects it to `alias`. `linkTransferredReferences` visits spread properties/elements while ignoring ordinary property values and array elements. See [tool:1559](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1559). Configuration discovery therefore accepts the original empty `alias` initializer, leaving an `@policy` consumer unchecked.

Ordinary array storage, such as `const box = [alias]`, has the same defect. Transfers must preserve reference relationships or invalidate configuration conservatively. This requires no execution of arbitrary configuration code.

**Verified claims**

- **F34 resolved:** discovery now obtains the `SourceFile` and checker from the same prepared analysis, including recursive data modules and direct callers: [tool:449](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:449). The data-module factory-alias regression is at [test:1011](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:1011).
- **F35 resolved:** ambient declarations are distinguished from runtime shadows at [tool:511](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:511). Both rejection and clean-shadow regressions were added at [test:657](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:657).
- **F36 resolved for the submitted binding forms:** recursive propagation handles recognized nested members and marks unsupported extraction incomplete: [tool:660](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:660). Positive and fail-closed regressions begin at [test:884](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:884). F38 concerns the corresponding member-access forms.
- **F37’s submitted cases are addressed:** exact reference links, assignment writes, `push`/`splice`/`unshift`, and call arguments—including `Object.assign`/`defineProperty` targets—participate in invalidation at [tool:1581](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1581). Regression coverage includes reference writes, push, assign, argument escape, and spread transfer at [test:1370](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:1370). F39 remains.
- No textual inspection pre-gate was reintroduced. The single generic escape emitter remains at [tool:853](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:853).
- HEAD and supplied diff match. Only the authorized two files changed: 266 additions, 52 deletions; six test declarations added, none removed. No suppression or skip markers were added.
- Independently verified all 66 fixture hashes against disk and `a899f896`; listing digest remains `e14bea57…`. Frozen contract remains `0f0e1d8f…`.
- Existing logs confirm [227/227 focused tests](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r10/vitest-focused.log:7) and [463/463 cumulative tests](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r10/vitest-cumulative.log:9).

Both remaining findings are **bounded defects within scope**, not category (b) limitations. The source-level guarantee is not yet complete within its documented scope.

No tests or builds were run during this review; bypass conclusions are source-traced.

VERDICT: REJECT
review complete