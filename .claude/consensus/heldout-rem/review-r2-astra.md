F3 — **High / blocker: bracket notation bypasses the resolution policy.** [tools/heldout-leak-check.ts:141](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:141) accepts only `PropertyAccessExpression`. These equivalent resolution calls are therefore ignored:

```ts
require['resolve']('../vtt/heldout-evaluation');
import.meta['resolve']('../vtt/heldout-evaluation');
```

The compiler represents bracket access as a distinct `ElementAccessExpression` ([typescript.js:30871](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/typescript/lib/typescript.js:30871)). When recognition fails, [line 213](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:213) records no edge, so neither `protocol_resolution` nor `unresolved_module_edge` is emitted. Replacing the target with a variable also escapes the fail-closed policy.

These are ordinary calls to the explicitly covered resolvers, within scope. Recognize constant bracket keys—including `'re' + 'solve'`—and add regressions for both resolvers with held-out and unresolved targets.

**Verified claims**

- **F1 resolved:** discovery inspects the first argument without restricting argument count at [line 204](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:204); the two-argument regression is at [test line 100](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:100).
- **F2 resolved:** parentheses and TypeScript assertion/non-null wrappers are unwrapped for arguments and callees at [line 93](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:93), with six regressions at [test line 113](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:113).
- Constant folding recursively handles **string literals, templates, and string-only concatenations/substitutions** at [line 107](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:107). Numeric/boolean substitutions and identifier references are not folded; recognized edges with these targets fail closed.
- Recognized unresolved edges produce `unresolved_module_edge` outside the existing exemptions at [line 309](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:309). Dot-form resolver calls produce `protocol_resolution`; bracket forms remain F3.
- Executable `eval`/`new Function` strings are explicitly excluded at [line 87](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:87), with corresponding coverage.
- The supplied diff exactly matches `eed62c54..09afc77a`: **only the tool and its test changed**. No test lines were deleted, no forbidden additions were found, and the worktree is clean.
- Independently rehashed **all 66 fixtures**: each matches round 1 and the [round-2 listing](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r2/fixture-hashes.after.txt:1). Listing digest remains `e14bea57faaa802988126d45eb062bc34da0e6584afe34a66f1fc390011a00cc`; frozen contract hash remains `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.
- The [focused log](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r2/vitest-focused.log:6) confirms **77/77**. I ran no tests or builds; F3 follows from source inspection.

VERDICT: REJECT
review complete