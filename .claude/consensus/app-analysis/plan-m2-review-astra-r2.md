# M-2 plan review r2 (astra 01a09e77-4c93-7c00-b80f-643b36aa0a50), harvested 2026-09-14 02:04

**PB2-F1 — P1, blocking: the environment key still omits effective Vite inputs.**  
[Plan lines 216–233](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-completeness-plan.md:216).

Unchanged `.env` bytes containing `VITE_LABEL=${BUILD_LABEL}` can produce different artifacts when ambient `BUILD_LABEL` changes. The proposed key hashes neither that variable nor the expanded value.

A read-only probe using the installed Vite expansion function produced:

```text
BUILD_LABEL=alpha → VITE_LABEL=alpha; keyed ambient VITE_*=[]
BUILD_LABEL=beta  → VITE_LABEL=beta;  keyed ambient VITE_*=[]
```

Vite expands against the complete ambient environment ([installed source:9396](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/node_modules/vite/dist/node/chunks/config.js:9396)). Similarly, `base: process.env.BUILD_BASE` introduces an unmodeled input without using any configuration form explicitly rejected at lines 229–231.

**Minimal change:** explicitly bypass caching for unmodeled env interpolation and build-time environment reads, with narrowly justified exceptions for existing non-artifact inputs. Add repeated-call fixtures proving real builds and zero pointer reads/stores. Supporting additional environment expressions is unnecessary.

**PB2-F2 — P1, blocking: resource/configuration discovery still has uncovered entry points.**  
[Plan lines 144–166 and 195–214](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-completeness-plan.md:195).

The recursive module contract is substantially improved, but the specified scanners leave these forms without an explicit detection-and-bypass mechanism:

- Inline HTML module imports, such as `<script type="module">import './extras/widget.ts'</script>`.
- HTML `<style>` contents and resource-bearing `style` attributes.
- CSS `image-set("./image.png" 1x)`, whose dependency is a quoted string without `url()`.
- Automatically discovered PostCSS configuration outside the declared inventory.

Installed Vite processes inline modules at [config.js:24005](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/node_modules/vite/dist/node/chunks/config.js:24005), inline styles at [24055](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/node_modules/vite/dist/node/chunks/config.js:24055), and searches for PostCSS configuration at [30332](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/node_modules/vite/dist/node/chunks/config.js:30332). Adding such a configuration can change output without changing any currently declared input.

The blanket promise to bypass unsupported syntax does not explain how these inputs become visible to discovery.

**Minimal change:** explicitly detect and bypass these unsupported entry points, including automatically loaded configuration and unsupported stylesheet languages. Add independent repeated-bypass fixtures. No additional parser or dependency is required.

**PB2-F3 — P1, blocking: the build split removes validation from direct cache consumers and publishes before the public guard succeeds.**  
[Plan lines 370–390 and 742–755](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-completeness-plan.md:370).

Today a cache MISS invokes public `npm run build`, including TypeScript and the dist guard. The revised MISS invokes only Vite. Direct consumers—[serve:63](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/serve.mjs:63), [snapshot tool:306](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tools/ai-dm-board-snapshot.ts:306), deep-link configuration, and the snapshot browser spec—therefore lose both validations on MISS/BYPASS.

There is also a publication-order regression: a public build stores the artifact before its trailing guard runs. If that guard rejects the artifact, a subsequent direct consumer can restore it using the valid directory digest and HEAD stamp. Those checks do not establish guard acceptance.

**Minimal change:** require the existing validations to succeed before a freshly built artifact is published or returned to direct consumers, while retaining unconditional public validation. This can remain inside the cache module’s miss/bypass orchestration. Add direct-consumer failure tests and prove a guard-rejected artifact is never published. This preserves D589 without entering M-3.

| Round-1 finding | Disposition | Plan lines and verification |
|---|---|---|
| **PB1-F1** | **PARTIAL** | 118–233, 409–420: recursive traversal, resolution/glob boundaries, and repeated bypass tests are specified. Reproduced 734 scanned modules, 24 outside `src`, and 97 omissions: 67 drizzle + 30 docs. Environment and resource gaps remain: PB2-F1/F2. |
| **PB1-F2** | **RESOLVED** | 378–395, 435–439, 481–487, 592–606: public typecheck and guard remain unconditional; both retained string assertions evaluate **true** against the proposed script. Focused verification includes both specs; the third public build requires HIT and guard output. Direct-consumer regression is separately PB2-F3. |
| **PB1-F3** | **RESOLVED** | 544–619: explicit Bash, `set -euo pipefail`, restoration trap, successful pipelines before final assertions, per-build stamp checks, and first-build `NODE_ENV=test`. Synthetic failure probe exited **17**, reaching neither stamp nor final assertions. |
| **PB1-F4** | **RESOLVED** | 498–534, 657–699: pre/post capture and normalized repository-relative path-set comparison. Independently reproduced **640 = 508 unit + 131 integration + 1 parity**; cross-root normalization yielded identical relative paths. |
| **PB1-F5** | **RESOLVED** | 411–433: unchanged-importer equal-byte glob rename; file-backed dirty-state reader; static/dynamic assets; glob options/negation; repeated unsupported fallback; different-root/order determinism are explicit. These are planned fixtures, not executed tests. |
| **PB1-F6** | **RESOLVED** | 568–590, 734–740: durations captured for both MISS builds and the restored-input warm HIT. Measurements remain pending supervisor execution. |

The plan hash matches the lane report: `d182d7c8594bef94973c5918f78773af21c7ab0f8ee99f0aa6b09c00cd0a1ca4`. No new dependency, Node pin, or M-3 implementation is proposed. Production normalization agrees with D612/D612.1; PB2-F3 conflicts with preserving build protections under D589. Review remained read-only; the tree is clean and the frozen-contract hash is unchanged.

**REJECT PLAN M2**

M2 PLAN REVIEW R2 DONE