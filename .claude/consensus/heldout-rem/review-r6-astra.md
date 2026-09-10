**F18 — High: Vite glob options still permit missed imports.** From `src/ui/repair-ranking.ts`, both forms evade the wall’s candidate matching:

```ts
import.meta.glob('**/heldout-evaluation.ts', { base: './', eager: true });
import.meta.glob('./heldout-evaluation.ts', {
  ...{ base: '../vtt' }, eager: true,
});
```

The first incorrectly becomes importer-relative when `base` exists; the second silently ignores the spread containing `base`. See [heldout-leak-check.ts:283](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:283) and [heldout-leak-check.ts:324](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:324). Installed Vite preserves leading `**` independently of `base`, uses the project root for this glob, and evaluates literal option spreads: [config.js:28365](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:28365), [config.js:28258](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:28258), [config.js:2629](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:2629). Both are within the documented glob scope.

**F19 — High: Nested ambiguous package conditions fail open.** For this package map:

```json
{
  "imports": {
    "#policy": {
      "import": {
        "browser": "./src/vtt/heldout-evaluation.ts",
        "default": "./src/vtt/party-pack.ts"
      },
      "default": "./src/vtt/party-pack.ts"
    }
  }
}
```

`importsTarget` collapses the ambiguous inner object to `null`, discards that result, then accepts the outer safe target. Consequently `import '#policy'` produces neither the protected-target finding nor the required unresolved finding. The ambiguity is lost at [heldout-leak-check.ts:818](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:818). Vite’s conditional resolver instead follows matching conditions recursively: [config.js:6689](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:6689).

**F20 — High: Known loader references still escape without findings.** These remaining forms follow directly from the visitor and alias rules:

- `const locate = require.resolve ?? require.resolve; locate('../src/vtt/heldout-evaluation.ts');` in `tools/probe.cjs`. Logical/nullish expressions are neither propagated nor reported; only ternaries receive the special partial-reference check. See [heldout-leak-check.ts:440](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:440), [heldout-leak-check.ts:621](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:621).
- `import * as M from 'node:module'; const N = M; N.createRequire(import.meta.url).resolve('../src/vtt/heldout-evaluation.ts');`. Namespace aliases are not propagated or rejected: [heldout-leak-check.ts:538](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:538).
- Inline `require('node:module').createRequire(__filename).resolve(...)`, and factories destructured from `await import('node:module')`, are unrecognized. Recognition requires an identifier namespace receiver or the enumerated initializer forms: [heldout-leak-check.ts:416](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:416), [heldout-leak-check.ts:566](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:566).
- A tracked loader can escape through `export { load };`: named exports without module specifiers have no escape check, whereas export assignments do. See [heldout-leak-check.ts:634](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:634), [heldout-leak-check.ts:684](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:684).
- `const loadScripts = self.importScripts.bind(self);` escapes without a finding. The `call`/`apply`/`bind` handling considers require loaders and resolvers, excluding the recognized script loader: [heldout-leak-check.ts:720](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:720).

These use built-in loader references. They fall within the promised `loader_reference_escaped` boundary, including when their surrounding syntax is unsupported.

**F21 — High: Vite alias discovery and rejection remain incomplete.** Ordinary configuration forms are silently missed:

```ts
const alias = { '@policy': '/absolute/path/to/src/vtt/heldout-evaluation.ts' };
export default { resolve: { alias } };
```

The visitor ignores shorthand `alias`; alias-array spreads and identifier entries are also silently skipped. See [heldout-leak-check.ts:1242](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1242), [heldout-leak-check.ts:1227](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1227).

Additionally, a regex alias mapping `./public-policy` to the protected module becomes the sentinel `'*'`, but that sentinel rejects only bare specifiers. A changed consumer importing `./public-policy` therefore passes normalization. See [heldout-leak-check.ts:1231](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1231), [heldout-leak-check.ts:905](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:905). Vite applies aliases to the incoming specifier without that restriction: [config.js:8160](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/vite/dist/node/chunks/config.js:8160). These are standard configuration forms within F17’s scope.

**F22 — Medium: Config-wide inspection attempts to transpile valid declaration files and aborts.** Configuration changes collect every recognized source extension, including the existing [vite-env.d.ts:1](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/src/vite-env.d.ts:1), then call `transpileModule`: [heldout-leak-check.ts:1275](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:1275), [heldout-leak-check.ts:375](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:375). Installed TypeScript excludes declaration files from emission and throws `Output generation failed` when transpilation emits nothing: [typescript.js:20374](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/typescript/lib/typescript.js:20374), [typescript.js:145460](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/node_modules/typescript/lib/typescript.js:145460). This is a valid-source failure, separate from intentional rejection of malformed source.

**Verified claims**

- F12’s individual base, leading-`**`, extglob and alias-glob probes have regressions at [test:395](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:395). F18 remains.
- F13 now selects exact mappings first and orders patterns; its regressions begin at [test:692](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:692). F19 remains.
- F14’s submitted namespace, destructuring, element-access, ternary and object-escape probes are covered at [test:519](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:519). F20 remains.
- F15’s submitted worker/script aliases and qualified forms are covered at [test:582](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:582). Script-loader escapes remain.
- F16 is resolved: discovery and normalization both use `trimStart`, with a regression at [test:630](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:630).
- F17 adds consumer reinspection, but its alias regression supplies `configuredAliasPrefixes` directly and therefore does not verify configuration discovery: [test:773](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tests/unit/tools/heldout-leak-check.test.ts:773). F21–F22 remain.
- HEAD and supplied diff match. Only the two authorized files changed; 13 test declarations were added, none removed, and no suppression/skip markers were introduced.
- Independently rehashed all 66 fixtures against disk and `c0dab908`: unchanged. Listing digest remains `e14bea57…`; frozen contract remains `0f0e1d8f…`.
- Existing logs record [155/155 wall tests](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r6/vitest-focused.log:7) and [391/391 cumulative tests](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/.tmp/heldout-s1-rem-01-r6/vitest-cumulative.log:9). I ran no tests or builds; findings above are source-derived.

The source-level guarantee is **not complete within its documented scope**. The interpretation and fail-closed claims at [heldout-leak-check.ts:136](/home/vagrant/PhpstormProjects/dnd-wt-p-heldout/tools/heldout-leak-check.ts:136) remain overstated. The explicit exclusions for executable `eval`/`new Function` strings, custom loaders and runtime-generated code remain appropriate; none explains the findings above.

VERDICT: REJECT
review complete