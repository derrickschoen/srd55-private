# ELEVATION-02 plan r4 — astra HIGH confirmation (resumed 01a0ab75…, 640 k tokens): ACCEPT PLAN with two binding P2 notes

The bounded r4 revision is acceptable, with **two binding P2 implementation notes below**. Both r3 P1 manifest gaps close; no unauthorized behavioral change was found.

Verified [plan](/home/vagrant/PhpstormProjects/dnd-wt-elevation-plan/.tmp-plans/2026-09-16-elevation-02-plan.md): **2533 lines**, SHA-256 **d0e6ad7466c3a7a8f02e7e12d23860a8b4fabaa3e488196a22689bbe73f3a6a9**. Archived r3: **2373 lines**, SHA-256 **7c2cc7ceae14284a0185d0b887ccedd2fbbba9a2fb3baf75d8477a8e2852cb14**.

**Owner-answer closure**

| Answer | Plan evidence | Source evidence and result |
|---|---|---|
| Q1 / D637 | 131–143, 2058–2100 | `decisions.md:22867`: quotation matches; bounded search, distance→row→column ordering, pending DM selection, empty-set off-board unresolved state, single removal adjudication and deferred damage all match. |
| Q2 / D638 | 145–151, 678–684, 2102–2123 | `decisions.md:22885`; SRD 12192–12202: required shallow/deep depth, shallow walking, deep swimming, underlying-tier body base and swimming costs match. **Shallow walk-only is the D638 default**, rather than a prohibition independently established by the SRD. |
| Q3 / D639 | 153–159, 2125–2146 | `decisions.md:22888`: exposed and forbidden sets match, including all four delivery surfaces and the independent DM-semantic exclusion control. |

All three owner quotations match after whitespace normalization. The forbidden-family search returned **zero matches**, exit **1**: no `Q1B`, `Q2A`, `Q2B`, `Q3B` or `Q3C`.

Q1 ownership is explicit at plan **2078–2088**: encounter state/reducer and events; movement search; persistence/replay/capsule; B7A transport; board projection; and DM controls. The former Q1 holds are explicitly satisfied. Q2’s schema/settings and readable labels are owned in B13 (**1771–1774**), with generator fixtures in B10/B11 (**1687–1690**). Q3 reaches B12–B15’s projection, DOM, accessibility and screenshot tests.

**The two r3 P1s close**

- **Traversal:** B7A9, plan **1551–1565**, now owns `offer-environment-board-sequence.test.ts`. OFFERS source **:33** supplies the omitted `mechanics.path` assertion; **:63–69** supplies the environment-digest controls. The plan migrates the traversal assertion and retains those controls.
- **Distance:** B6A3, plan **1280–1301**, owns all three omitted tests. Source witnesses remain `creature-space.test.ts:182–215`, `footprint-increment-four.test.ts:390` (**OFFERS :392**) and `challenge-room-fixtures.test.ts:294` (**OFFERS :308**). The 576 ordered-pair distances, row ordering, SVG coordinates, empty-target throw and literal five-foot assertion are expressly retained. B6A4 additionally owns the compiled tool consumer, `tools/los-cover-era-audit.ts:121–129`.

Independent manifest results:

| Check | Result |
|---|---:|
| Batches | **34** |
| Unique allowed paths | **221** |
| Maximum files per batch | **10** |
| Over-limit batches | **0** |
| Traversal union assigned | **90/90**, outside **0** |
| Distance source/test union assigned | **30/30**, outside **0** |
| Distance compiler union assigned | **31/31**, outside **0** |

Path accounting: **190 existing worktree paths + 3 branch-supplied paths + 28 explicitly new paths = 221**. No unexplained missing manifest path.

The supplied audit’s child-process launcher encountered **EPERM**. I ran the overlays separately and replayed its unchanged counting/ownership logic against their outputs; that comparison exited **0**.

**Overlay and compiler results**

All overlay counts below use `tsconfig.node.json`.

| Tree | Traversal diagnostics / paths | Distance diagnostics / paths |
|---|---:|---:|
| Worktree/main base `4a99570d` | **260 / 89** | **113 / 31** |
| OFFERS `1cacd8f0` | **257 / 89** | **113 / 31** |
| Current VIS `1d58ef72`, raw | **258 / 90** | **115 / 33** |
| Current VIS, elevation-attributable | **257 / 89** | **114 / 32** |

Current VIS has **one unchanged baseline diagnostic**, `tests/unit/vtt/dm-tactical-intel.test.ts:74`, missing required `offerEnvironment`. After subtracting that exact baseline diagnostic, **zero elevation diagnostic paths are unowned**. VIS’s additional distance consumer is `src/combat/visibility-field.ts`, already owned by B6A0.

VIS was inspected through `git show` and compiled using an in-memory filesystem; no sibling worktree was read. The plan distinguishes accepted `436702cf` from the ongoing rebase and retains the prerequisite that VIS land green.

Untouched worktree TypeScript: **app exit 0, node exit 0**, no diagnostics. Git status remained clean.

**Complete diff classification**

Numbering uses the **32 unified diff hunks**, in order:

| Hunks | Classification |
|---|---|
| 1 | (d) cross-reference/round bookkeeping only |
| 2 | (a), plus bookkeeping |
| 3 | (a), (c), plus cross-reference bookkeeping |
| 4 | (c) base update |
| 5–9 | (a) owner answers |
| 10–13 | (b) distance manifest closure |
| 14–15 | (a) owner answers |
| 16–17 | (b) traversal manifest closure |
| 18–27 | (a) owner answers and their test/presentation consequences |
| 28 | (a)/(b)/(c) verification record |
| 29 | (b) manifest verification |
| 30 | (b)/(c) verification/base evidence |
| 31 | (b) audit counts |
| 32 | (d) R3→R4 marker |

No category-(d) change alters a batch, witness, pin treatment or mutant. Existing arithmetic witnesses and unrelated policies did not move.

**Binding P2 implementation notes**

1. **Correct the B6A3 compiler-status expectation.** Plan **1235–1236** says B6A0–B6A3 are RED/RED. By the end of B6A3, all owned source consumers are migrated; B6A4 contains tests and a tool (**1305–1308**). Source [tsconfig.app.json:19](/home/vagrant/PhpstormProjects/dnd-wt-elevation-plan/tsconfig.app.json:19) includes only `src`. Expected boundaries are therefore **B6A3 GREEN/RED; B6A4 GREEN/GREEN**. Preserve the atomic tranche; do not manufacture an app error to satisfy the label.

2. **Explicitly include both cross-family mutants in cumulative execution.** Plan **1998–2001** selects `Q1A-*`, `Q2C-*`, `Q3A-*`, which omit **`Q1-SEARCH-EXCEEDS-BOUND`** and **`Q3-DM-SEMANTIC-TO-PLAYER`**. Both remain mandatory at plan **2097–2099 / 2143–2145**, backed by `decisions.md:22867 / 22888`. Source [d586-mutation-contract.ts:438](/home/vagrant/PhpstormProjects/dnd-wt-elevation-plan/tools/d586-mutation-contract.ts:438) expands literal prefixes. Include both IDs explicitly in their batch execution and B15 cumulative closure. Their authored killers remain intact.

Principal exact commands:

```bash
sha256sum .tmp-plans/2026-09-16-elevation-02-plan.md /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-16-elevation-02-plan.md.r3
wc -l .tmp-plans/2026-09-16-elevation-02-plan.md /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-16-elevation-02-plan.md.r3
diff -u /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-16-elevation-02-plan.md.r3 .tmp-plans/2026-09-16-elevation-02-plan.md
rg -n 'Q1B|Q2A|Q2B|Q3B|Q3C' .tmp-plans/2026-09-16-elevation-02-plan.md
node .tmp/elevation-r3-traversal-overlay.mjs . tsconfig.node.json | rg '^(SUMMARY|PATH)'
node .tmp/elevation-r4-distance-overlay.mjs . tsconfig.node.json | rg '^(SUMMARY|PATH)'
node .tmp/elevation-r3-traversal-overlay.mjs .tmp/r2-overlay-offers-1cacd8f0 tsconfig.node.json | rg '^(SUMMARY|PATH)'
node .tmp/elevation-r4-distance-overlay.mjs .tmp/r2-overlay-offers-1cacd8f0 tsconfig.node.json | rg '^(SUMMARY|PATH)'
npx tsc -p tsconfig.app.json --noEmit --pretty false
npx tsc -p tsconfig.node.json --noEmit --pretty false
git status --short
```

The owner-question holds are closed. Implementation can follow the plan with these binding notes, after the existing VIS landing prerequisite is satisfied.

ACCEPT PLAN
REVIEW DONE