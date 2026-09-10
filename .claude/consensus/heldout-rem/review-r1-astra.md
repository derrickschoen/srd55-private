F1 — **High / blocker: two-argument dynamic imports bypass the wall.** [tools/heldout-leak-check.ts:118](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:118) requires exactly one argument before recognizing an import. Consequently, this direct, literal dependency is ignored:

```ts
const protocol = import('../vtt/heldout-evaluation', {});
```

The optional second argument is supported by the installed compiler’s [ImportCallOptions declaration](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/typescript/lib/lib.es5.d.ts:640). Recursing into its children does not recover the discarded edge. This is within D601’s import-discovery scope. Inspect the first argument independently of the options argument and add a regression case.

F2 — **High / blocker: parentheses hide literal imports.** [tools/heldout-leak-check.ts:67](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:67) accepts only an immediate string/template-literal node. These imports therefore escape:

```ts
const protocol = import(('../vtt/heldout-evaluation'));
const protocol = require(('../vtt/heldout-evaluation'));
```

The compiler preserves parentheses as a distinct AST node ([typescript.js:37090](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/typescript/lib/typescript.js:37090)). Likewise, `(require)('../vtt/heldout-evaluation')` fails the direct-identifier check at [line 121](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:121). These are statically named dependencies requiring no runtime evaluation. Unwrap transparent expressions before inspecting arguments and callees.

The other requested boundary cases:

- **Covered:** `export * as` and static imports with JSON attributes use the existing import/export declaration branch at [line 107](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:107). Dynamic imports with an attributes argument encounter F1.
- **Missed:** substitution templates, including constant expressions such as ``import(`../vtt/${'heldout-evaluation'}`)``, return `null` at line 67. Constant-only forms are reasonable leak-wall coverage; arbitrary runtime expressions require an explicit unresolved-edge policy.
- **Outside the bounded syntax-discovery guarantee:** executable strings passed to `new Function`, arbitrary runtime target construction, and JSON payload contents. Standalone `require.resolve` and `import.meta.resolve` are resolution operations rather than imports; both are ignored by this visitor. Composing them with `import()` also remains undetected, so this is not a complete runtime dependency barrier.

**Verified claims**

- The visitor covers static, side-effect, type-only, re-export, import-equals, import-type, direct one-argument dynamic imports/`require`, and no-substitution templates. The **42 plain variants, three round-2 probes, and four comment probes** are represented in [heldout-leak-check.test.ts:7](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:7). Source inspection supports their detection.
- Included candidate source files receive syntax diagnostics and throw on errors at [line 79](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:79). Complete candidate contents are loaded, including ordinary deletion-only modifications, at [line 221](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:221).
- Merge reconciliation preserves held-out provenance and the sampled/authored union at [room-generator.ts:174](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/src/vtt/room-generator.ts:174), plus hashing/types/party loading and main’s envelope decoder at [generate-arena-basis.ts:8](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/generate-arena-basis.ts:8). The added test discriminant strengthens the existing conjunction at [room-generator.test.ts:688](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/vtt/room-generator.test.ts:688).
- Independently rehashed all **66 fixtures**: every byte hash matches the [recorded listing](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01/fixture-hashes.after.txt:1), whose digest is `e14bea57faaa802988126d45eb062bc34da0e6584afe34a66f1fc390011a00cc`. All 66 match the merge commit; 58 match `1d6af854`, and eight challenge fixtures arrived unchanged from main.
- Independently verified the frozen [contracts.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/src/vtt/intel/contracts.ts:1) hash: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.
- The supplied diff exactly matches HEAD versus merged main `6fb2bb19`: the same 15-file slice. Remediation changes only the wall and its spec; reconciliation accounts for the other three changed slice files. No forbidden constructs or weakened merge assertions found. Worktree is clean.
- Existing logs record **60/60** focused and **296/296** cumulative passes. I ran no tests or builds; the bypass findings above follow from source inspection.

VERDICT: REJECT
review complete