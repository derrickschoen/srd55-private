**The source-level guarantee is not complete within its documented scope.** The original probes have regressions, but six significant gaps remain.

**F12 — High: glob interpretation still permits silent misses (F6 incomplete).**

From `src/ui/repair-ranking.ts`:

```ts
import.meta.glob('./heldout-evaluation.ts', {
  base: '../vtt',
  eager: true,
});
```

The checker ignores `base` and searches `src/ui/heldout-evaluation.ts`, yielding no edges. Vite resolves this against `src/vtt`. Compare [tool:243](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:243) with [Vite:28205](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:28205).

Other uncovered forms:

- `../vtt/@(heldout-evaluation).ts`: the custom matcher escapes extglob syntax instead of interpreting or rejecting it. Vite’s matcher supports extglobs ([tinyglobby:213](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/tinyglobby/dist/index.mjs:213)).
- `**/heldout-evaluation.ts`: the checker prefixes the importer directory; Vite treats leading `**` separately.
- Configured package-import/alias glob patterns: the checker treats them as relative filesystem paths.

Vite’s corresponding resolution branches are at [config.js:28351](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:28351). Unsupported semantics must fail closed rather than become an empty match.

**F13 — High: package `#imports` selection can choose the wrong target.**

For this candidate package map:

```json
{
  "imports": {
    "#*": "./src/vtt/party-pack.ts",
    "#heldout": "./src/vtt/heldout-evaluation.ts"
  }
}
```

`import('#heldout')` passes: [tool:647](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:647) returns the first matching wildcard. The installed resolver selects the exact key before considering patterns ([Vite:6669](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:6669)).

Overlapping patterns have the same ordering problem. Furthermore, an ambiguous conditional target is skipped at line 649, allowing fallback to another mapping instead of producing an unresolved finding. The documented package-map guarantee is therefore inaccurate.

**F14 — High: loader escape detection remains incomplete (F8 incomplete).**

These standard forms remain unrecognized:

```ts
import * as M from 'node:module';
M.createRequire(import.meta.url).resolve('../src/vtt/heldout-evaluation.ts');
```

```ts
const { resolve: locate } = import.meta;
locate('../src/vtt/heldout-evaluation.ts');
```

```js
Reflect['apply'](
  require.resolve,
  undefined,
  ['../src/vtt/heldout-evaluation.ts'],
);
```

The first fails because factory discovery handles only named imports; the second because destructured resolver collection handles only require objects ([tool:368](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:368)). The third enters the element-access branch and skips the generic escape check ([tool:543](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:543)).

Additional gaps include:

- Default imports of `node:module` and the prefixless builtin `module`.
- Computed destructuring keys.
- Factory references escaping through objects.
- `const load = true ? require : require; load(literal)`.

These are explicit references to known loaders, not custom loader implementations. They currently produce neither the appropriate dependency finding nor the promised escape finding.

**F15 — High: qualified and aliased worker/script loaders remain invisible (F7 incomplete).**

Constructor detection requires the exact bare identifiers `Worker` or `SharedWorker` at [tool:463](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:463). Consequently, it ignores:

```ts
const Spawn = Worker;
new Spawn(new URL('../vtt/heldout-evaluation.ts', import.meta.url), {
  type: 'module',
});
```

It also ignores `globalThis.Worker`, qualified `SharedWorker`, and renamed Node worker imports. Script detection similarly accepts only bare `importScripts` at [line 521](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:521), missing `self.importScripts` and aliases. Known loader references in these forms need recognition or fail-closed escape handling.

**F16 — High: leading whitespace bypasses data-module inspection (F9 incomplete).**

Take the base64 data-module regression and prepend one ASCII space to its literal specifier:

```ts
import(' data:text/javascript;base64,…');
```

The recursion checks `startsWith('data:')` at [tool:576](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:576). The unknown-scheme check is also anchored before whitespace at [line 703](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:703). Both miss this form, allowing the concealed protected import.

Vite explicitly accepts it using `id.trimStart().startsWith("data:")` before URL parsing ([config.js:33132](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:33132)). Scheme recognition must use the loader’s URL semantics.

**F17 — High: configuration-only changes do not trigger importer inspection.**

[addedChanges:929](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:929) still selects only changed files beneath `src`, `tools`, and `tests`.

An unchanged consumer can import `#policy` while a candidate changes only root `package.json`, redirecting that mapping from a public module to the held-out module. The CLI loads the new package map but inspects zero consumers, producing zero findings. Nested package-map changes also fail to trigger reinspection of unchanged consumers.

Package-resolution support requires invalidation of affected consumers when their resolution configuration changes.

**Verified claims**

| Accepted finding | Round-5 status |
|---|---|
| F5: percent-encoded file URLs | Original bypass fixed; regression at [test:306](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:306). |
| F6: Vite globs | Original examples covered; broader semantics remain incomplete under F12. |
| F7: worker/script loaders | Bare-name cases covered; F15 remains. |
| F8: loader indirection | Named cases covered; escape guarantee remains incomplete under F14. |
| F9: inline data modules | Base64/percent decoding, recursion, and depth-limit rejection implemented; F16 remains. |
| F10: JSDoc imports | Explicit JSDoc traversal and import-tag handling added, with both regressions at [test:503](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:503). |
| F11: Git enumeration | NUL-delimited rename/path enumeration implemented; regression at [test:540](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:540). |
| Package `#imports` | Simple exact mapping and absent-map regressions added; F13/F17 remain. |

The scope statements concerning globs, package resolution, unknown schemes, and escaped loader references overstate the implementation. The documented exclusions for executable strings, custom loaders, and runtime-generated code do not exclude the concrete forms above.

The supplied diff exactly matches `9b6d7783..c0dab908`: **only the tool and its spec changed**. No test lines were deleted, no forbidden additions were found, and the worktree is clean.

I independently rehashed **all 66 fixtures**: every hash matches round 4. Listing digest remains `e14bea57faaa802988126d45eb062bc34da0e6584afe34a66f1fc390011a00cc`; frozen contract remains `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.

Existing lane logs record [129/129 focused](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r5/vitest-focused.log:6) and [365/365 cumulative](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r5/vitest-cumulative.log:8). I ran no tests or builds.

VERDICT: REJECT
review complete