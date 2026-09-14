# M-2 fix round 2 lane report (sol), harvested 2026-09-14 04:49

Implemented all eight accepted findings. The focused suite grew from 66 to 122 tests and is green.

Pristine production SHAs:

- `tools/dist-build-inputs.mjs`: `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566`
- `tools/dist-build-cache.mjs`: `eb81f8c7da90360c6c25b23cb9962e4d5a843f1ef05fd2d206b1e198aed42770`

### Finding resolution

- IB1-F1: glob grammar, zero-directory globstar, final negations, containment, symlink rejection, supported options, and bounded traversal implemented at [dist-build-inputs.mjs:151](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:151). Fixtures start at [dist-build-cache.test.ts:229](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/tools/dist-build-cache.test.ts:229).
- IB1-F2: complete-tag HTML scanning, all resource attributes, malformed/unquoted bypass, and independent script-body detection at [dist-build-inputs.mjs:434](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:434). Fixtures start at [dist-build-cache.test.ts:314](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/tools/dist-build-cache.test.ts:314).
- IB1-F3: comment/string-aware CSS scanning, malformed-token bypass, and discovered-stylesheet classification at [dist-build-inputs.mjs:381](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:381). Fixtures start at [dist-build-cache.test.ts:342](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/tools/dist-build-cache.test.ts:342).
- IB1-F4: config-reachable structural scanning, structural environment detection, exact two-context allowlist, composition/mutation rejection, and external-plugin bypass at [dist-build-inputs.mjs:254](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:254). Fixtures start at [dist-build-cache.test.ts:548](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/tools/dist-build-cache.test.ts:548).
- IB1-F5: Vite-compatible nearest-workspace/package-root search, including repository and filesystem root, at [dist-build-inputs.mjs:118](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:118). Boundary fixtures are at [dist-build-cache.test.ts:621](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/tools/dist-build-cache.test.ts:621) and [dist-build-cache.test.ts:739](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/tools/dist-build-cache.test.ts:739).
- IB1-F6: discovery, lookup/cache-root, and publication failures again preserve validated builds at [dist-build-cache.mjs:187](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-cache.mjs:187). Fixtures start at [dist-build-cache.test.ts:756](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/tools/dist-build-cache.test.ts:756).
- IB1-F7: independent environment, failure-phase, spawn/nonzero, dirty-reader, and mutant controls added throughout [dist-build-cache.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/tools/dist-build-cache.test.ts).
- IB1-F8: multi-segment `tsconfig*.json`, `vite.environment`, empty ambient marker, type-only export exclusion, formatting, and unused imports corrected at [dist-build-inputs.mjs:506](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-inputs.mjs:506) and [dist-build-cache.mjs:83](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/dist-build-cache.mjs:83).

### RED/GREEN

Exact focused command:

```sh
npx vitest run --configLoader runner tests/unit/tools/dist-build-cache.test.ts tests/unit/tools/scraper-is-never-in-the-bundle.test.ts tests/unit/ai-bridge/build-boundary.test.ts
```

- Committed baseline: exit 0, 3 files, 66/66.
- RED after Astra probe fixtures: exit 1, 3 files, 26 failed / 82 passed / 108 total.
- Final GREEN: exit 0, 3 files, 122/122, duration 2.31s.
- Tests deleted: 0.
- Assertions deleted or weakened: 0. Textual replacements are stronger individual membership assertions, the fixture-observing dirty reader, and updated `spawn` injection assertions.

### Named-mutant ledger

Every listed run exited 1 with the named test. All restorations equal the pristine SHA above.

| Mutant | Applied SHA | Killing test/assertion | Restored SHA |
|---|---|---|---|
| ALWAYS_REBUILD | `800af7922617aa83b011134988bcea98174ff25634db356d308dd1b606b1c778` | warm-hit build count | `eb81f8c7da90360c6c25b23cb9962e4d5a843f1ef05fd2d206b1e198aed42770` |
| NEVER_RESTORE | `e8563dc0f4425a7e456383c4dbb75616e21d1ebf8fa992907f8a7c01e4d61c01` | warm-hit build count | `eb81f8c7da90360c6c25b23cb9962e4d5a843f1ef05fd2d206b1e198aed42770` |
| VITE_ONLY_MISS | `0ea7f3bf984aeb9b39241a661f2def61846a90671757e19f27232fb8aef1a494` | validated-leaf positive assertion | `eb81f8c7da90360c6c25b23cb9962e4d5a843f1ef05fd2d206b1e198aed42770` |
| DIRECT_CONSUMER_VITE_ONLY | same mutation as VITE_ONLY_MISS | Vite-only negative assertion | `eb81f8c7da90360c6c25b23cb9962e4d5a843f1ef05fd2d206b1e198aed42770` |
| OMIT_EXTERNAL_RAW | `d7a6988aa3d8bfd0e35aa67d712120d051afaed89dc388c5212cb3fb33b4c183` | recursive external raw fixture | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| HASH_PATH_NOT_BYTES | `aa1b7c4be3d1f373cb48b26864f25421bf43a88422ce32897718a33c6a028465` | external target edit changes digest | `eb81f8c7da90360c6c25b23cb9962e4d5a843f1ef05fd2d206b1e198aed42770` |
| HASH_ONLY_DRIZZLE | `57b9aae8b6251a0b68eb3c0540e615ece5a394f246c98512590321a0316463ec` | independent docs edit | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| STOP_RECURSION_OUTSIDE_SRC | `c444c89b946e0cd75e096c41a946c0e82d14dca7f1c920007559e61c864f6d02` | second-hop raw target | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| IGNORE_EXTERNAL_DYNAMIC_IMPORT | `16c372b652623cb1cda25cdbb8f625888055a7fa1b4a1a18a323861eb64446f5` | external literal dynamic import | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| RAW_ONLY | `6243065d5a1d4c9f415a1b88f1b857a77d4a37b2e678ef41558834197890591f` | `extras/other.ts` membership | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| IGNORE_STATIC_ASSET | `815641b5adf2f87dd84d1705250b889e54cad7b3da6a4de0bf886249bfd6877f` | `extras/icon.svg` membership | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| IGNORE_NEW_URL | `638f6942a0c4bf9abdc03ba2a323279f33a1ca81a0463d51e2654cdb89179aa0` | photo membership | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| IGNORE_ROOT_RELATIVE | `eb5a58752c7c41c66aa033b05ffb99b6b7c5a051772cf9f5e3804a16231ec455` | root-relative source membership | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| GUESS_ALIAS | `70b7f8422661b15b60d4148033de0f7bb7a86561b60f32379cc296cd1e93c810` | alias bypass | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| UNSUPPORTED_EDGE_HIT | `3a43fdc22dcf6dce8038acbdc1f6c0ca3285e8f43aa4b39c823066f294ca6ef6` | repeated-build count | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| CACHE_AFTER_BYPASS | same mutation as UNSUPPORTED_EDGE_HIT | zero cache-access assertion | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| IGNORE_GLOB_NEGATION | `4187c5977ad83fdf4f902b05daa70f684d9bc77fb62b41403302b8902a47ce44` | exact glob membership | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| IGNORE_GLOB_OPTIONS | `6bef781d99b75eb28f62db9c28281438d45b0af3acdac9bcfbefeb0e31639d45` | unsupported-option bypass | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| STALE_GLOB | `ca48d526d84e261820b173f9a2be1e39e6ce14573efef7c4ccac3c3dd75fbaab` | glob add/remove/edit digest | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| HASH_BYTES_WITHOUT_PATHS | `8d5e9188bc666160373709bf3990a7acdbfc63f37226ca2aa114c1d6a5fc012c` | equal-byte rename | `eb81f8c7da90360c6c25b23cb9962e4d5a843f1ef05fd2d206b1e198aed42770` |
| IGNORE_UNSUPPORTED_PATTERN | `bb2c1e147e88049432f315f4be2edcd11115c79153291b08f15c41f27e865a17` | brace-pattern bypass | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| IGNORE_CSS_IMPORT | `a3ee5a1aa5f549a9f96c9c7e756ca8e437b04fed528a0ec33d3314c65f1c6481` | CSS import edit | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| IGNORE_CSS_URL | `21282c711f1c52d8b5ce67001c8ae0b8961bcff552dd9e2382055b5dcde5540f` | CSS URL edit | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| CACHE_UNPARSED_CSS | `ea877a98ae0e64612a9527ffb0ee126f334169d23bfeebaedfe2daedc7e3e8e2` | malformed CSS bypass | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| IGNORE_HTML_ASSET | `41330e827c72ed205f60fac4735e98c077c598ca041f7c4674756b93ce462c0a` | HTML asset edit | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| CACHE_UNPARSED_HTML | `44feb18c0fc1f45a549fe19bd6acf207c5a298299b3671bf099b7befc1c324b7` | unquoted resource bypass | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| MISS_INLINE_MODULE | `194ef5f852c1d256375557269c9c0aa6766c8b4d473449834d7b3610df05383f` | inline-module bypass | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| MISS_INLINE_STYLE | `2acd4c958d9ae2bf1876362cdc505760b0522a485b0eedb785abaea58d6e6534` | inline-style bypass | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| MISS_STYLE_ATTRIBUTE | `51524906696418e7f2f75700095f2b7d83843e4b778c6711bdffb20f8f45096a` | style-attribute bypass | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| PARSE_ONLY_URL_FUNCTION | `18ac00e467aec2a2eef0a20b5a25b83abb6f2d4d05c16e3aa1cce957fb45aa52` | image-set bypass | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| TREAT_PREPROCESSOR_AS_CSS | `ae3c215b793fffc4ef02ef51cc5009935cc2333e9f930b012d567c9dc38e89f2` | SCSS bypass | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| MISS_AUTO_POSTCSS | `2b708016a88c63675eae1b22fdc3b3e50f72fdaa9bf787ee563cfe1097f67193` | PostCSS sentinel bypass | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| STALE_VITE_DETECTOR | `0edac5f22c1336b7740d2771e7f3f5724517c91bc3601e6a76e57826b7202d1b` | Vite-version bypass | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| IGNORE_PLUGIN_CLOSURE | same mutation as STOP_RECURSION_OUTSIDE_SRC | plugin target membership/edit assertion | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| IGNORE_PLUGIN_READS | `54f798df44d92db575438b2a3ffe25d9ad5300124ee86e1c910bacf6c23032cb` | explicit plugin-read mutation | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| OMIT_VITE_ENV_FILES | `55afaabbd6cb121a285a6a0b5ae11f90da1d1b1be83cae001b3025c4287e1e32` | env-file add/edit/remove | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| OMIT_AMBIENT_VITE | `e12b4aa425f57e45936fc56821bd9d87410f27f2f7755b28a871a6d9469f8225` | independent ambient oracle | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| UNSORTED_ENV | `e0a2e261ce942f6b1f0d0510e7d27e95dee3efcc3b4c805a3c76f2e97930fd2a` | insertion-order equality | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| EXPAND_UNKEYED_ENV | `3939859919789509ef26a995842f0d757a101f62f5581bdf011716648984b936` | interpolated-env bypass | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| IGNORE_CONFIG_ENV_READ | `065671afdded1219de90ba81d0a5915ffdaca427a93858e373e5502b4954f9b8` | config environment bypass | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| BROAD_ENV_ALLOWLIST | `8e002cddaf764cc950a2912be97b71615c04b4af9db47a72feddb4cf8b3c99c5` | leaked cacheDir context | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| HASH_ABSOLUTE_ROOT | `a3d95e2e339b23b5554ecb9359273cf2b4f7ae795651091ba05da1407a4011c0` | cross-root equality | `eb81f8c7da90360c6c25b23cb9962e4d5a843f1ef05fd2d206b1e198aed42770` |
| UNSORTED_TRAVERSAL | `4d552e72631ae80991d76fafb73f23ba691ffba9d40ce9f607f40fb0fc63fc5a` | sorted inventory assertion | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| HASH_CREATION_METADATA | `203d54d737f39b76a85af97ed447edd2379cfda2139f6e1a89269048d477acbc` | opposite creation-order equality | `eb81f8c7da90360c6c25b23cb9962e4d5a843f1ef05fd2d206b1e198aed42770` |
| RETAIN_STALE_DISCOVERY | `15e8e0ba02f931e19bfbb2e602b6a9f1b6e8debb215fdd3b20679a54bf679b9a` | removed-import digest | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| HASH_WHOLE_EXTERNAL_DIRECTORY | same mutation as RETAIN_STALE_DISCOVERY | orphan-edit stability assertion | `8a533af3bcb55f595bd525d3570a05324ae668c85b4c7dc6d58153f02481f566` |
| DIRTY_TREE_BIT_IN_KEY | `9aa35525f763c7ba99cdcd7e63771760582bfa06b93400ecd366cdad31f53552` | zero status-reader calls | `eb81f8c7da90360c6c25b23cb9962e4d5a843f1ef05fd2d206b1e198aed42770` |
| HASH_WHOLE_REPOSITORY | same mutation as DIRTY_TREE_BIT_IN_KEY | unchanged second-build count after fixture-byte edit | `eb81f8c7da90360c6c25b23cb9962e4d5a843f1ef05fd2d206b1e198aed42770` |
| OMIT_HEAD | `844821511d63cac06476050d5c773ec0a790798b2315b9c96fb8595a0bc8e48f` | A/B digest inequality | `eb81f8c7da90360c6c25b23cb9962e4d5a843f1ef05fd2d206b1e198aed42770` |
| RESTAMP_ON_RESTORE | `f338c1d41e85d92d3a13623d44fd00dff5dc47e9c5cc81de5ee6a67545a35827` | A/B digest inequality | `eb81f8c7da90360c6c25b23cb9962e4d5a843f1ef05fd2d206b1e198aed42770` |
| TRUST_DIRECTORY_DIGEST_ONLY | `b16c6c60974f7b136ff09e2fc16765d5456eaa0fbede735cecc7ddf765ca23a4` | forged valid digest/wrong commit | `eb81f8c7da90360c6c25b23cb9962e4d5a843f1ef05fd2d206b1e198aed42770` |
| STORE_WRONG_PROVENANCE | `d25614c5395edd77e7700efa67613d7e880ddd9af45f3adfb0b1ee230a3bbd29` | wrong fresh commit, zero publication | `eb81f8c7da90360c6c25b23cb9962e4d5a843f1ef05fd2d206b1e198aed42770` |
| TRUST_POINTER | `c8090a77a1d2cd940937ab62409d608170bf1745431d0e53a45b3ad2a661b3e1` | malformed pointer rebuild | `eb81f8c7da90360c6c25b23cb9962e4d5a843f1ef05fd2d206b1e198aed42770` |
| ALLOW_ESCAPE | `b81a917b5482aa91a77be2ec03e40af387337cf85c90c422c444339301bae746` | valid escaped artifact rebuild | `eb81f8c7da90360c6c25b23cb9962e4d5a843f1ef05fd2d206b1e198aed42770` |
| HEAD_FALLBACK_EMPTY | `9e94fc346aace36b1b4e85dd01640bb19afc82a71ce1a8ae49ad087cf218a480` | malformed HEAD and zero builds | `eb81f8c7da90360c6c25b23cb9962e4d5a843f1ef05fd2d206b1e198aed42770` |
| IGNORE_BUILD_EXIT | `445bc48ff81ba3f395cffdaa63608837cb241f977664073035c22b5117ccd246` | nonzero spawn exit | `eb81f8c7da90360c6c25b23cb9962e4d5a843f1ef05fd2d206b1e198aed42770` |
| IGNORE_VALIDATION_EXIT | `23f3afaa317f4df210b834309bfadfc2f616bf09c320c11731c2d2412960ce62` | guard failure must propagate | `eb81f8c7da90360c6c25b23cb9962e4d5a843f1ef05fd2d206b1e198aed42770` |
| STORE_BEFORE_GUARD | `8b665ffe1bd2f46ad892294066fbca39df64696ceb39ab527e0eff5e0236a05c` | rejected build leaves empty cache | `eb81f8c7da90360c6c25b23cb9962e4d5a843f1ef05fd2d206b1e198aed42770` |
| RETURN_REJECTED_DIST | `e598a64783f286e09a4a3558f099f5ae179246b1beb1f52baaa9a932c120dc7e` | guard failure must throw | `eb81f8c7da90360c6c25b23cb9962e4d5a843f1ef05fd2d206b1e198aed42770` |

Additional availability proofs:

| Regression | Applied SHA | Killing test | Restored SHA |
|---|---|---|---|
| Discovery exception escapes | `ccd6c15ddd29146d4c406983b8bb6c1e7867031f096db3de1f36a779c0eb465d` | discovery fallback | pristine cache SHA |
| Cache-root error escapes | `a54e540bcd150cbb07fb8380989f58f1b09fcabd96259bb50c3faf648d229fd0` | cache-root fallback | pristine cache SHA |
| Publication error escapes | `93039ee0747ecbfdca83240942086200c585f664f616e0512a47c7f8a82e42a1` | retained validated output | pristine cache SHA |
| Old globstar grammar | `7b2906d6381b784c9cb9b5e1320435618691a4ddf6967a9d91aca4cdb33ca872` | zero-directory globstar | pristine inputs SHA |
| Old workspace comparison | `670058d089e6b9c9502bd571a4417e8cabbeedbb930640e297a321c42e78aedf` | filesystem-root/repository-marker fixtures | pristine inputs SHA |
| Disabled root/PostCSS rejection | `70b7d194c6a3ab9f2ee3d6b61ec1709db8e18351c2ab74d12ab6e990f20ef2e0` | redirected configuration fixture | pristine inputs SHA |

One oracle weakness was found during mutation: the original `RAW_ONLY` control used a module already included through `src/`. It survived. I changed it to an external executable module while retaining an independent root-relative assertion; `RAW_ONLY` then failed on `extras/other.ts`, while `IGNORE_STATIC_ASSET` separately failed on `extras/icon.svg`.

### Final verification

- `npx tsc -b --force`: exit 0.
- `sg scan`: exit 0.
- Focused Vitest command: exit 0, 3 files, 122/122.
- `node --check tools/dist-build-inputs.mjs`: exit 0.
- `node --check tools/dist-build-cache.mjs`: exit 0.
- `git diff --check`: exit 0.
- `deno fmt --check --line-width 120 --single-quote <five files>`: exit 0, checked 5 files.
- An earlier `npx deno fmt ...` attempt was discarded after npm emitted `EROFS` for `/home/vagrant/.npm/_cacache`; direct `/home/vagrant/.deno/bin/deno` succeeded. No lockfile change occurred.
- Maximum lines: inputs 120, cache 116, cache spec 130, scraper spec 93, boundary spec 113. The sole line over 120 is the permitted named-test title.
- Recount: 734 recursive modules, 24 outside `src`, 134 resources, 97 prior omissions, split `{"docs":30,"drizzle":67}`, current inventory 939, zero unresolved.
- `npx vitest list --configLoader runner --filesOnly --json > /tmp/m2-after3.json`: exit 0; 640 rows; 0 `tests/fixtures/` paths.
- `package-lock.json`: `26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867`.
- Frozen contract: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.

Final `git status --short`:

```text
 M tests/unit/ai-bridge/build-boundary.test.ts
 M tests/unit/tools/dist-build-cache.test.ts
 M tools/dist-build-cache.mjs
 M tools/dist-build-inputs.mjs
```

All changes are inside the exact six-file allowlist. `package.json` and `tests/unit/tools/scraper-is-never-in-the-bundle.test.ts` already contained the accepted M-2 scripts/assertions at committed HEAD `5fbf00a6`, so this fix round required no content delta in those two files.

M2 FIX R2 DONE