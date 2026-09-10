F4 — **High / blocker: query-suffixed held-out imports still bypass the wall.** [tools/heldout-leak-check.ts:255](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:255) matches the entire specifier using exact suffixes. In a restricted file such as `src/ui/repair-ranking.ts`, this literal static import produces no finding:

```ts
import protocolSource from '../vtt/heldout-evaluation.ts?raw';
```

Discovery records a resolved import, but the `?raw` suffix defeats every protocol predicate; consequently, neither `protocol_import` nor `unresolved_module_edge` is emitted at [line 320](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:320).

This reaches the protected file: the installed Vite loader strips the query and reads its source at [config.js:8680](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:8680). Vite also separates query/fragment suffixes during ordinary filesystem resolution at [config.js:32723](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:32723). This is an in-scope, statically named import through the project’s existing loader.

The matcher needs to check the underlying module path, with regressions for query/fragment forms. This is a remaining defect, not a regression introduced by round 3.

**Verified claims**

- **F3 resolved:** bracket access now uses constant-folded keys at [line 162](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:162). Unknown keys create unresolved edges; unknown targets follow the existing fail-closed path. All eight regressions are present at [test line 187](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:187).
- F1/F2 handling, string constant folding, parser-error rejection, and documented executable-string exclusions remain unchanged.
- The supplied diff exactly matches `09afc77a..a9595454`: **only the tool and its test changed**. No test lines were deleted, no forbidden additions were found, and the worktree is clean.
- Independently rehashed **all 66 fixtures**: every hash matches round 2 and the [round-3 listing](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r3/fixture-hashes.after.txt:1). Listing digest remains `e14bea57faaa802988126d45eb062bc34da0e6584afe34a66f1fc390011a00cc`. Frozen contract hash remains `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.
- Existing logs confirm [85/85 focused](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r3/vitest-focused.log:6) and [321/321 cumulative](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r3/vitest-cumulative.log:8). I ran no tests or builds; F4 follows from source inspection.

VERDICT: REJECT
review complete