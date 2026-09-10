**F28 — High: A regex gate reintroduces comment-separated alias bypasses.**

```ts
const locate = import /* gap */ .meta.resolve;
locate('../vtt/heldout-evaluation.ts');
```

The new `needsLoaderSymbols` regex misses this spelling and disables the checker. AST discovery recognizes the resolver initializer and allows it, but `addTrackedSymbol` cannot register `locate` without the checker. Its subsequent call therefore produces no finding. See [heldout-leak-check.ts:458](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:458), [tool:479](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:479), and [tool:718](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:718).

An escaped identifier likewise bypasses alias propagation: `const load = requ\u0069re; load('../src/vtt/heldout-evaluation.ts');`. These are recognized loader expressions and exact aliases, within scope.

**F29 — High: Runtime class-heritage expressions are incorrectly exempted as types.**

In `tools/probe.cjs`:

```js
class C extends (
  [require.resolve][0]('../src/vtt/heldout-evaluation.ts'),
  Object
) {}
```

The resolver escapes through the array, but `isWithinTypeNode` suppresses the generic check because its ancestor is `ExpressionWithTypeArguments`. TypeScript uses that wrapper for class heritage and includes it in `isTypeNodeKind`, although the superclass expression executes at runtime. See [tool:785](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:785), [typescript.js:38458](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/typescript/lib/typescript.js:38458), and [typescript.js:21423](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/typescript/lib/typescript.js:21423). The indirect call also avoids direct edge discovery. This reaches the protected resolution without a finding.

**F30 — High: Computed destructuring from an inert namespace still loses its loader value.**

```ts
const key = 'resolve';
const { [key]: locate } = import.meta;
locate('../vtt/heldout-evaluation.ts');
```

Binding propagation cannot resolve the identifier key and leaves `locate` untracked. The namespace initializer is now inert, so nothing reports the extraction. See [tool:611](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:611), [tool:215](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:215), and [tool:780](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:780).

The same construction applies to a computed `createRequire` binding from a recognized module namespace or a computed `Worker` binding from `window`. F23’s `require`-initializer examples are fixed, but this namespace-derived extraction remains unchecked.

**F31 — High: Alias discovery accepts stale initializers after reassignment.**

```ts
let alias = {};
alias = {
  '@policy': '/absolute/path/to/src/vtt/heldout-evaluation.ts',
};
export default { resolve: { alias } };
```

Configuration discovery records the original empty initializer and never accounts for the assignment. It reports neither the alias nor unresolved configuration. See [tool:1439](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1439) and [tool:1448](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1448). An `@policy` consumer can consequently pass; configuration-only reinspection may skip its AST entirely when no alias was discovered: [tool:1157](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1157).

This ordinary configuration assignment must be interpreted or rejected as unresolved.

**F32 — Medium: Inert built-in re-exports still generate loader escapes.**

`export { builtinModules } from 'node:module';` unconditionally calls the escape emitter because the entire module’s re-exports are classified together. See [tool:777](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:777). `builtinModules` is a readonly string array, not a loader: [module.d.ts:21](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/@types/node/module.d.ts:21).

This contradicts the refined loader-valued-only rule, although the previously reported `window` and `import.meta.env/url` false positives are fixed.

**F33 — Medium: The required injected control does not use the real-tree sweep.**

The clean test genuinely reads repository files through the filesystem helper, invokes configuration-change inspection, and asserts zero findings: [test:36](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:36), [test:1179](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:1179). The helper directly exports Node filesystem operations: [test-filesystem.ts:5](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/helpers/test-filesystem.ts:5).

However, the injected test constructs a separate two-file synthetic map. It never reads or extends the real source map: [test:1197](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:1197). Thus the explicitly required control—an injected leak in that same real-tree sweep—is absent. Also, `checkedFiles` includes records whose AST inspection was skipped by the new heuristic; it does not establish that all 674 files were parsed.

**Verified claims**

- The single generic escape emission remains at [tool:772](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:772). It now checks identifiers, member accesses, and call results. F28–F30 show why the guarantee remains incomplete.
- **F23:** submitted destructuring/rest/export probes have regressions at [test:748](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:748); F30 remains.
- **F24:** factory call results now reach the generic check. Object storage, returns, exports, and argument escapes have regressions at [test:765](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:765).
- **F25:** import-equals namespace seeding is implemented, with its `.cts` regression at [test:781](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:781). F28 still affects forms that disable symbol tracking.
- **F26:** symbol-aware configuration lookup and literal spread overrides address the submitted examples; regressions begin at [test:1097](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:1097). F31 remains.
- **F27:** ordinary namespace properties are inert, and regex aliases are tested per specifier at [tool:1044](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1044). Positive clean regressions exist at [test:795](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:795) and [test:1161](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:1161). F32 is a remaining false positive.
- Independently counted **674 eligible actual source files**. Existing logs record [204/204 focused tests](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r8/vitest-focused.log:7) and [440/440 cumulative tests](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r8/vitest-cumulative.log:9).
- HEAD and supplied diff match. Only the authorized two files changed: 483 additions, 133 deletions; ten test declarations added, none removed. No suppression or skip markers were added.
- Independently checked all 66 fixture hashes against disk and `32f45ac5`: unchanged, listing digest `e14bea57…`. Frozen contract remains `0f0e1d8f…`.
- No tests or builds were run during this review. Bypass results above are source-traced.

The implementation does **not** match the refined rule exactly, and the source-level guarantee is **not complete within its documented scope**.

VERDICT: REJECT
review complete