# M-2 fix round 3 lane report (sol), harvested 2026-09-14 06:04

Implemented M-2 fix round 3. All six accepted findings are resolved, the focused suite passes 185/185, and the real repository remains cacheable with no unresolved inputs.

### Supported grammar

Read-only enumeration of current production inputs found:

- Static declarations: 1,494 type imports, 2,806 value imports, 38 type exports, 72 value exports. Type-only edges are excluded.
- Nine literal dynamic imports:
  - `src/main.ts`: four
  - `src/ui/screens/vtt/screen.ts`: five
- Four `new URL(literal, import.meta.url)` worker edges.
- Exactly two globs, both `{ eager: true }`:
  - `./screens/**/screen.ts`
  - `./handlers/**/*.ts`
- Eleven production CSS files, with zero `@import`, `url()`, or `image-set()` tokens.
- `index.html` uses quoted attributes and contains:
  - `/manifest.webmanifest`
  - `/icons/app-icon.svg`
  - navigation `/legal`
  - module entry `/src/main.ts`
- Configuration uses static local imports, `core`/`shared` object composition, the existing `core`, `options`, and `shared` spreads, and exactly two permitted environment reads:
  - `vite.config.ts:267` — `STATIC_APP_CACHE_DIR`
  - `tools/ai-bridge/plugin.ts:367` — `AI_BRIDGE_FAKE`

Everything outside the structurally recognized grammar causes an uncached validated build.

### Findings

- IB2-F1: RESOLVED in [dist-build-inputs.mjs](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:312).
  - Environment exceptions now require the exact AST parent chain.
  - Node process imports, reused values, `import.meta.env`, aliases, and invoked/referenced `configureServer` forms bypass.
  - Direct and changed-environment zero-cache-access fixtures begin at [dist-build-cache.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/tools/dist-build-cache.test.ts:632).

- IB2-F2: RESOLVED at [dist-build-inputs.mjs](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:383) and [dist-build-inputs.mjs](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:778).
  - Configuration scanning has a separate `configScanned` ledger.
  - Computed properties, dynamic imports, CommonJS factories, imported/computed spreads, and external composition bypass.
  - Fixtures start at [dist-build-cache.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/tools/dist-build-cache.test.ts:677).

- IB2-F3: RESOLVED at [dist-build-inputs.mjs](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:557).
  - HTML attributes are tokenized structurally.
  - `data-src` and `href` cannot masquerade as script `src`.
  - Vite resource elements include audio, object, embed, source, track, video, img, link, script, use, input, and image.
  - Fixtures start at [dist-build-cache.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/tools/dist-build-cache.test.ts:740).

- IB2-F4: RESOLVED at [dist-build-inputs.mjs](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:516).
  - Any CSS backslash escape bypasses.
  - Killing fixture: [dist-build-cache.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/tools/dist-build-cache.test.ts:774).

- IB2-F5: RESOLVED at [dist-build-inputs.mjs](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:164).
  - Prohibited directories are pruned at every depth.
  - Explicit pruned targets and unsupported glob depth bypass.
  - Direct non-descent and recursive-bypass fixtures cover all eight prohibited classes at [dist-build-cache.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/tools/dist-build-cache.test.ts:782).

- IB2-F6: RESOLVED at [dist-build-inputs.mjs](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:770).
  - `^tsconfig.*\.json$` includes `tsconfigextra.json`.
  - Fixture: [dist-build-cache.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/tools/dist-build-cache.test.ts:823).

### RED → GREEN

RED-first focused run:

```text
Test Files: failed
Tests: 30 failed, 127 passed, 157 total
Exit: 1
```

Two corrected exact-probe groups additionally produced:

```text
4 failed, 132 skipped — exit 1
5 failed, 136 skipped — exit 1
```

Final focused command:

```sh
npx vitest run --configLoader runner \
  tests/unit/tools/dist-build-cache.test.ts \
  tests/unit/tools/scraper-is-never-in-the-bundle.test.ts \
  tests/unit/ai-bridge/build-boundary.test.ts
```

```text
Test Files  3 passed (3)
Tests       185 passed (185)
Duration    2.82s
Exit        0
```

No assertion deletion was found. Test declarations increased from 62 to 79. The nested-prune mutant initially survived the older direct-glob assertion; I retained that assertion and added a separate eight-class recursive-bypass fixture. The mutant then failed.

### New-detector mutant ledger

Pristine production digests:

```text
inputs: e008a2c232085adf2acc9810862c114ab121b25eb7c603d4dfea636937550ee1
cache:  eb81f8c7da90360c6c25b23cb9962e4d5a843f1ef05fd2d206b1e198aed42770
```

Every killing run exited 1. Every restored digest was the full pristine inputs digest above.

| Mutant | Applied SHA-256 | Killing test |
|---|---|---|
| ALLOW_NESTED_CACHE_ENV | `9983a2a3dd15a12f3791d0da7a3c717bb2a8def68521703e1385e66cdc74fe47` | `IB2-F1 bypasses nested core cacheDir` |
| BROAD_AI_ENV_CONTEXT | `1f30002174b1faf34e688cd4388f80a0e48ed20183f095bdeaccead996065bcc` | `IB2-F1 rejects an AI bridge environment read in the wrong configureServer parent chain` |
| ALLOW_REUSED_CACHE_ENV | `d9f97e8d231d2a092c1ff32df5bec2c44dbccb16c96bcde95b0ec9d8c5285c2d` | `IB2-F1 bypasses reused exact core cacheDir` |
| ALLOW_NODE_PROCESS_IMPORT | `374d85cd0746fdced16f0195bf669cd124613e19a664b54ac5ccb7b0ef8e342f` | `IB2-F1 bypasses node:process env alias` |
| ALLOW_CALLED_CONFIGURE_SERVER | `c878d82d5c3011ab4e530af341d4f44c83688761c6eb728d679f3654bead5077` | `IB2-F1 bypasses configureServer invoked by a build hook` |
| ALLOW_IMPORT_META_ENV | `1f8b9b6cbaf567080c0daac8b918451ea7c425fe6883b8cac9500a4ceee6de50` | `IB2-F1 bypasses import.meta environment` |
| SHARE_CONFIG_SCAN_LEDGER | `88688aa30564c752f9ca31abda46cc467c6681a7d1794bcf699a9d6480c2fc70` | `IB2-F2 scans a config target even when ordinary traversal reached it first` |
| ALLOW_COMPUTED_CONFIG | `f087e41c9ca7ebeb776d0fb2e16a4b190a5537cd4d2f896584ce63da0c22aa8e` | `IB2-F2 applies computed-property rejection throughout the config closure` |
| ALLOW_DYNAMIC_CONFIG_IMPORT | `b9b63ab251a447a28a994d727d2166fbbb15d0bec9351a57009e368148885c0b` | `IB2-F2 bypasses a dynamically imported external factory without spread syntax` |
| ALLOW_COMMONJS_FACTORY | `79c6667e7dc2992782c565d5ee84e10d7f2f1826504ddb07fed493d19e1c4a02` | `IB2 exact config grammar bypasses CommonJS external factory` |
| ALLOW_GLOBAL_PROCESS_ALIAS | `7872aa83609710607dd1f500814996b7b41a06373b1e12670d2ce67421a914c3` | `IB2 exact config grammar bypasses global process alias` |
| ALLOW_LOCAL_CALL_SPREAD | `014bd510566c21b6e000b33985af5427c2d6e9d674fbadfcb17d56ade665674d` | `IB2 exact config grammar bypasses local call spread` |
| DATA_SRC_IS_SCRIPT_SRC | `4d7b75e979c465fd5017dbb89767593ced608d45dc7a785e1dc2aa2a99a357da` | `IB2-F3 does not treat decoy script attributes as a real src` |
| HREF_IS_SCRIPT_SRC | `ed2d6949535f529b7f282e3dfb09fe7b482bdb52d4d5b171e22abca7e6567cb2` | `IB2-F3 rejects href on script without masking its inline body` |
| OMIT_AUDIO_RESOURCE | `5a43e25b6761b034814275a4d4cef033857f914e363ff3427bf3775cc122388e` | `IB2-F3 tracks <audio src> resources` |
| OMIT_OBJECT_RESOURCE | `8d5711c56c70b3b5c3c949b1084fbcaf5f97f378153104b7811c0ce164d323ef` | `IB2-F3 tracks <object data> resources` |
| ALLOW_CSS_ESCAPE | `85186c43ed5298c9ad01f764cedad058c29b77e9909fb3263e055201a84dc329` | `IB2-F4 bypasses escaped CSS resource strings instead of hashing a decoy path` |
| ALLOW_PRUNED_GLOB_TARGET | `bc9a496e6434b73b6ca19b2454f859149d7d6e693c312cd1515219bcf643f987` | `IB2-F5 bypasses globs targeting the pruned dist boundary` |
| PRUNE_ONLY_AT_ROOT | `5d6b4d2c8664a9931b70b0be8b99920cdd8143c0def679bdb3cf87864259890c` | `IB2-F5 bypasses a recursive glob at the nested pruned node_modules boundary` |
| ALLOW_INTERMEDIATE_GLOB_DEPTH | `a3e910d4172aaf41e63bcb82f08f6e2d4c6c5e01e27be1891972eebf6332c863` | `IB2-F5 bypasses glob depth outside the supported direct-or-globstar grammar` |
| NARROW_TSCONFIG_CLASS | `4b69d9cdbb09cf9413adeaae734148d09823f32e89fc6b3952fa263c1b3f9dcd` | `IB2-F6 includes every root filename matching tsconfig*.json` |

Final restored SHA:

```text
e008a2c232085adf2acc9810862c114ab121b25eb7c603d4dfea636937550ee1
```

### Final verification

```text
npx tsc -b --force
exit 0, 39.45s

sg scan
exit 0

node --check tools/dist-build-inputs.mjs
exit 0

node --check tools/dist-build-cache.mjs
exit 0

git diff --check
exit 0

deno fmt --check --line-width 120 --single-quote <five files>
Checked 5 files, exit 0
```

Line lengths:

```text
tools/dist-build-inputs.mjs: max=120, >120=0
tools/dist-build-cache.mjs: max=116, >120=0
tests/unit/tools/dist-build-cache.test.ts: max=130, >120=1
tests/unit/tools/scraper-is-never-in-the-bundle.test.ts: max=93, >120=0
tests/unit/ai-bridge/build-boundary.test.ts: max=113, >120=0
```

The sole 130-column line is an allowed test-title string literal.

Recount:

```text
baseline-inventory=840
recursive-modules-scanned=734
outside-src-modules=24
resource-targets=134
prior-omissions=97
split={"docs":30,"drizzle":67}
literal-glob-patterns=2
unsupported-local-edges=0
current-cacheable=true
current-files=939
prior-omissions-missing-current=0
current-reasons=[]
```

Discovery proof:

```sh
npx vitest list --configLoader runner --filesOnly --json > /tmp/m2-after4.json
```

```text
rows=640
fixture-paths=0
exit 0
```

Integrity:

```text
package-lock.json:
26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867
unchanged from HEAD

src/vtt/intel/contracts.ts:
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1
```

Final status:

```text
 M tests/unit/tools/dist-build-cache.test.ts
 M tools/dist-build-inputs.mjs
```

Both modified files are allowlisted; the other four allowlisted files remain unchanged from committed M-2.

M2 FIX R3 DONE