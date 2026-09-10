**F47 — High — Rule C admits opaque descendants as reachable literals (a: bounded).**

This config introduces an alias without discovery or an unresolved finding:

```ts
export default {
  get resolve() {
    return {
      alias: {
        '@policy': '/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/src/vtt/heldout-evaluation.ts',
      },
    };
  },
};
```

`visitReachableObject` ignores the accessor. However, `liesInsideReachableSet` treats every descendant of the exported object as reachable, exempting the undiscovered nested `resolve`/`alias` structure from rejection. See [object traversal:1935](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1935) and [reachability guard:2018](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2018).

The same ancestor-based exemption admits mutation references inside otherwise ignored properties:

```ts
const shared = { resolve: { alias: {} } };
export default {
  ...shared,
  sideEffect: shared.resolve.alias['@policy'] =
    '/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/src/vtt/heldout-evaluation.ts',
};
```

Discovery sees the original empty alias map. The assignment passes the reference guard because it is beneath the exported object; the shallow spread retains the mutated nested object. The reachable set therefore does not enforce the claimed literal boundary.

**F48 — Medium — Rule C misses references in named exports (a: bounded).**

```ts
const shared = { resolve: { alias: {} } };
export { shared };
export default shared;
```

The external reference in `export { shared }` is not rejected. Configuration `symbolAt` lacks export-specifier local-target resolution, so it compares the export alias symbol against the tracked local symbol. The compiler’s implementation confirms that distinction. See [configuration symbol lookup:1776](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1776), [reference comparison:2026](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:2026), and [TypeScript symbol lookup:91882](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/typescript/lib/typescript.js:91882).

This violates the every-reference-inside-the-set guard and exposes the configuration object outside its accepted graph.

**F49 — High — Namespace re-exports bypass N1 (a: bounded).**

```ts
// src/ui/bridge.ts
export * as M from 'node:module';

// src/ui/consumer.ts
import { M } from './bridge';
const load = M.createRequire(import.meta.url);
load.resolve('../vtt/heldout-evaluation.ts');
```

Namespace re-exports are explicitly exempted; named `Module`/`default` re-exports also remain permitted. Consumer tracking seeds namespace roles only from direct built-in imports, so the imported `M` and resulting loader remain untracked. See [re-export exemption:1049](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1049) and [import seeding:663](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:663). These namespace transfers contradict N1’s permitted positions.

**F50 — High — Non-constant member keys still fail open (a: bounded).**

Both forms escape discovery:

```ts
const key = 'Worker';
new window[key]('../src/vtt/heldout-evaluation.ts');
```

```ts
const meta = import.meta;
const key = 'resolve';
meta[key]('../src/vtt/heldout-evaluation.ts');
```

Identifier targets are outside `constantString`’s folding scope. Nevertheless, the N2 guard returns false for unknown keys. The fallback for unknown import-meta keys recognizes only literal `import.meta`, losing the alias case. See [constant folding:239](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:239), [member guard:1103](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1103), and [fallback:1228](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1228). These should fail closed without evaluating the keys.

**F51 — High — Quoted destructuring bypasses N2 receiver validation (a: bounded).**

```ts
function spawn(root: typeof window) {
  const { 'Worker': Spawn } = root;
  new Spawn('../src/vtt/heldout-evaluation.ts');
}
spawn(window);
```

Binding inspection skips unrecognized sources before checking browser-loader extraction. The use-site guard covers property/element access expressions, not binding patterns. The quoted key also avoids the bare-identifier guard. Consequently, `Spawn` remains untracked. See [binding inspection:884](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:884) and [N2 guards:1103](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1103).

**F52 — High — Await is permitted by N1 but loses import-meta provenance (a: bounded).**

```ts
(await import.meta).resolve('../src/vtt/heldout-evaluation.ts');
```

Also:

```ts
const meta = await import.meta;
meta.resolve('../src/vtt/heldout-evaluation.ts');
```

The permission check traverses `AwaitExpression`, allowing the namespace position. Namespace recognition does not unwrap await, so neither resolver is discovered. See [permission check:1087](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1087), [namespace recognition:566](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:566), and [resolver classification:618](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:618). The audit’s await claim is false.

**F53 — High — Vitest configuration bypasses configuration discovery entirely (a: bounded).**

A `resolve.alias` added to `vitest.config.ts`, directly or through `mergeConfig`, is neither interpreted nor rejected. The CLI’s changed-file selection excludes this root file, configuration-change detection does not recognize it, and alias discovery accepts only `vite.config.*`. Thus affected source consumers are not invalidated.

See [changed-file selection:1691](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1691), [configuration filenames:1709](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1709), and [alias discovery:1520](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1520). The repository has an active [Vitest config:26](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/vitest.config.ts:26); this is a bounded configuration-entry-point omission.

**Verified claims**

- **F43–F46’s reported examples are caught.** N1 rejects boxed import-meta values; N2 rejects the demonstrated boxed `.Worker` use. Rule C rejects the former identifier-backed alias maps and the shadowed `defineConfig`. Corresponding regressions exist at [spec:1660](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:1660) and [spec:1703](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:1703).
- **Working Rule C paths:** named Vite `defineConfig` imports, including renamed imports, are checked by symbol; conditional branches are unioned; same-file const object/array initializers can be followed. Parentheses, `satisfies`, and `as const` are unwrapped. Outside type-position references to tracked constants are rejected. Top-level comma expressions, multiple default assignments, default re-exports, and CommonJS-only exports fail closed. `.mjs`/`.cjs` filenames reach discovery. [Identifier/entry handling:1863](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1863), [expression/export handling:1991](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1991), [wrappers:225](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:225).
- **Working N2 paths:** literal `.Worker` access through `this.windowObject`, comma expressions, unknown parameters, or optional property access reaches receiver validation. Inert browser-global injection remains permitted. These checks do not cover F50–F51. [N2 guard:1103](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1103), [DI controls:1680](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:1680).
- **Real-tree control is genuine:** it reads the actual Vite config and 674 eligible source files, then extends that same map for the injected control. Assertions require zero clean findings and exactly the injected finding. [Inputs:57](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:57), [assertions:1823](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:1823). This does not exercise Vitest-config discovery.
- The configuration mutation/transfer machinery was removed; the replacement uses literal traversal and a reference-membership check, without a renamed mutation-analysis subsystem. [Replacement:1751](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1751). The restated audit remains overstated because of the findings above.
- Git comparison confirms only the tool and spec changed, with five added declarations expanding to 15 cases. Existing expectations were revised for the new rules; no test declaration was removed.
- Independently rehashed all 66 fixtures and compared their bytes with `be769471`: unchanged. Manifest digest remains `e14bea57…`; frozen contract remains `0f0e1d8f…`. Existing logs record [276/276 focused](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r13/vitest-focused.log:7) and [512/512 cumulative](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r13/vitest-cumulative.log:9). No tests or builds were run during this review.

The guarantee remains incomplete. All reported residuals are bounded; none requires interpreting the documented out-of-scope executable strings or custom loaders.

VERDICT: REJECT
review complete