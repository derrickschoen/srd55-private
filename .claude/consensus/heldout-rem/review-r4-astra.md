F4 is resolved. **Significant residual bypasses remain.** These findings are based on source inspection; I ran no tests or builds.

**F5 — High: percent-encoded file URLs evade module identity checks.**

This literal import is accepted:

```ts
import('file:///home/vagrant/PhpstormProjects/dnd-wt-p-heldout/src/vtt/%68eldout-evaluation.ts');
```

[tools/heldout-leak-check.ts:290](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:290) performs POSIX normalization without URL decoding, leaving `%68eldout-evaluation` unmatched. Vite explicitly converts `file://` imports through `fileURLToPath` at [config.js:32611](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:32611); that API decodes percent-encoded characters and encoded dot segments ([url.d.ts:317](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/@types/node/url.d.ts:317)). This is an in-scope direct import of the protected file. URL parsing must precede filesystem identity comparison.

**F6 — High: Vite glob imports are completely ignored.**

From `src/ui/repair-ranking.ts`:

```ts
const protocols = import.meta.glob('../vtt/heldout-*.ts', { eager: true });
```

The visitor recognizes only `import.meta.resolve`, so this produces no edge at [line 247](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:247). Vite generates actual static imports for eager matches and dynamic imports for lazy matches at [config.js:28308](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:28308). This mechanism is already used by [src/worker/registry.ts:109](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/src/worker/registry.ts:109).

Exact-path globs, wildcard patterns, arrays, exclusions, and query options need candidate-aware inspection or an explicit fail-closed finding. These are in scope.

**F7 — High: worker constructors bypass the wall.**

```ts
new Worker(
  new URL('../vtt/heldout-evaluation.ts', import.meta.url),
  { type: 'module' },
);
```

Neither constructor creates an edge in [the visitor](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:235). Vite explicitly resolves and builds this form for both `Worker` and `SharedWorker` ([config.js:27692](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:27692)). The project uses it at [src/main.ts:181](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/src/main.ts:181).

Literal worker entry points are in-scope module dependencies. A standalone `new URL(...)` is URL construction; its use by a module/script loader determines whether it creates a loading edge.

**F8 — High: known loader/resolver indirection bypasses discovery.**

For example, in `tools/probe.mjs`:

```ts
import { createRequire } from 'node:module';
createRequire(import.meta.url).resolve('../src/vtt/heldout-evaluation.ts');
```

Only the harmless `node:module` import is recorded. [resolutionReceiverSyntax:160](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:160) accepts a direct identifier named `require` or `import.meta`; the factory-produced receiver is ignored. `createRequire` returns a `NodeJS.Require` ([module.d.ts:28](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/@types/node/module.d.ts:28)).

The same recognition gap covers:

- Simple renamed or destructured loader/resolver aliases.
- `(0, require.resolve)(literal)`.
- `require.resolve.call(require, literal)`, `.apply`, `.bind`, and `Reflect.apply`.
- `module.require(literal)` and factory-produced `require` functions.

These explicit uses of known loaders are within the requested boundary. They need tracking or fail-closed handling when the loader reference escapes recognized syntax. Arbitrary interprocedural JavaScript analysis is a separate guarantee.

**F9 — High: inline `data:` modules can conceal another import.**

A literal `data:text/javascript;base64,…` import whose decoded module re-exports the protected absolute `file:` URL passes the basename comparison at [line 312](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:312).

Vite explicitly decodes and loads such modules at [config.js:33124](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:33124). This is an explicit module import with inline source available for inspection. Inspect that source or fail closed on the scheme; the recorded `eval`/`new Function` exclusions do not explicitly exclude `data:` imports.

**F10 — Medium: JavaScript JSDoc type imports are missed.**

```js
/** @import { HeldoutSideHp } from '../vtt/heldout-evaluation' */
```

The visitor neither handles `JSDocImportTag` nor visits attached JSDoc through its ordinary `forEachChild` traversal. The compiler’s own import discovery explicitly handles these nodes and traverses JSDoc separately ([typescript.js:24070](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/typescript/lib/typescript.js:24070)). Under the wall’s type-only-import policy, these are in scope. JSDoc `import(...)` type expressions have the same traversal gap.

**F11 — High: rename-only changes can escape inspection altogether.**

[addedChanges:434](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:434) registers files only from `+++ b/` headers. Pure renames have no such header—I verified that output shape against existing commit `e6292756`.

Consequently, moving an unchanged file containing a protected absolute import from exempt `tests/` into restricted `src/` can avoid inspection. Quoted Git path headers also fail this prefix check. Enumerate candidate paths using Git’s structured, NUL-delimited output rather than patch headers.

**Remaining scope audit**

| Form | Result and scope |
|---|---|
| Absolute POSIX paths; ordinary unencoded `file:///` paths | Protected basename is caught. Encoded file URLs remain F5. |
| Repeated slashes, ordinary dot segments, traversal out and back | Lexical normalization catches paths ending at the protected identity. |
| Query/fragment suffixes, including loader queries | F4 fixed; original suffix retained in finding detail. |
| Aliases, `tsconfig.paths`, package `#imports` | Resolver-aware identity is in scope when configured. No such mappings are currently declared in the inspected root configurations. The checker does not resolve mappings; a leading `#` is incorrectly treated as a fragment. Configuration-only changes are outside its `src/tools/tests` diff selection. |
| Case variants | Unhandled; no alternate-cased target was found. I do not claim a working case-only bypass on this checkout. |
| Backslashes | Unhandled by POSIX normalization. Ordinary Linux path spelling, Windows paths, and URL parsing require distinct treatment; a blanket slash replacement is not sufficient evidence of identity. |
| `import.meta.glob` patterns | Supported project loader mechanism; in scope, F6. |
| `@vite-ignore` or similar comments | Comments do not hide recognized AST calls. Nonconstant direct targets still fail closed. |
| Worker/SharedWorker, literal script-loading APIs | Loading edges belong in scope. Constructors remain F7; `importScripts` is also unrecognized. Host/module compatibility must be considered before claiming execution. |
| `import(new URL(...))`, variable targets, unsupported expressions | Recognized direct imports already yield `unresolved_module_edge`. |
| `eval`/`new Function` executable strings | Explicitly documented exclusions remain intact. |
| Arbitrary remote-module internals, custom loader implementations, runtime-generated code | Outside a bounded source-level guarantee unless separately constrained. Their absence cannot establish whole-program isolation. |

**Verified claims**

- F1–F4 fixes remain present. Round 4 adds the normalization cases, suffix assertions, and clean non-held-out `?raw` control at [test line 239](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:239).
- The supplied diff exactly matches `a9595454..9b6d7783`: **only the tool and its test changed**. No test lines were deleted, no forbidden additions were found, and the worktree is clean.
- Independently rehashed **all 66 fixtures**: every hash matches round 3 and the recorded listing. Listing digest remains `e14bea57faaa802988126d45eb062bc34da0e6584afe34a66f1fc390011a00cc`; frozen contract remains `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.
- The [focused log](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r4/vitest-focused.log:6) confirms **95/95**. The local lane cumulative log records **330/331**, followed by a [111/111 serial rerun](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r4/vitest-load-red-serial.log:6); your separate supervisor verification reports **331/331**.

VERDICT: REJECT
review complete