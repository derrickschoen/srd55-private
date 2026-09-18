# VIS-FIELD REBASE — astra review r1 (medium, resumed 01a0a642…, 1.43 M tokens): REJECT (1 P1)

## Finding

**REBASE-F1 — P1: Fixture changes open additional sightlines, including diagonals unrelated to D635.**

Locations: [ai-dm-conversation.test.ts:189](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/tools/ai-dm-conversation.test.ts:189), [:2883](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/tools/ai-dm-conversation.test.ts:2883), [:2892](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/tools/ai-dm-conversation.test.ts:2892).

I compared all **54 monster→player pairs** across the three re-authored fixtures, using the specified `(13,1)` anchor for the hard-room Spear actor. The changes open **27 previously blocked pairs**. Repeating with the shared-edge check disabled still opens **11 pairs**, demonstrating changes beyond restoring pre-seam visibility.

Concrete examples, independently checked with rational line/cell intersections:

| Fixture | Additional clear ray | Removed/moved cell previously crossed |
|---|---|---|
| Hard 5117009 | Guard→Cleric: `(14,1)→(2,4)` | `(10,1)`, interior crossing for `¼ < t < ⅓` |
| Brutal 6203002 | Priest Acolyte→Wizard: `(16,1)→(2,7)` | `(8,4)`, interior crossing for `½ < t < ⁴⁄₇` |
| Brutal 6203003 | Giant Scorpion→Cleric: `(10,1)→(3,4)` | `(6,2)`, interior crossing for `³⁄₇ < t < ⁴⁄₇` |
| Brutal 6203003 | Goblin Warrior→Cleric: `(10,8)→(2,4)` | `(6,6)`, interior crossing for `⅜ < t < ½` |

These are diagonal interior crossings, not shared-edge grazes. Removing `(8,4)` also opens the adjacent row-line-4 seam `(8,3)/(8,4)`, contradicting “opens only that seam” at line 2883. The new openings change target visibility and therefore the fixtures’ planning preconditions.

**Fix:** Re-author the fixtures with explicit bounds on permitted visibility changes, and assert that unrelated lanes remain blocked. If broader openings are necessary, document and obtain the corresponding scope ruling; the current seam-only claim is disproven. This is P1 under the review’s explicit criterion for broader fixture openings.

## Verified independently

- **Merge:** Python used `git ls-tree`, `git cat-file`, and `git merge-file -p` with memory-backed file descriptors. Across **11,631 paths**, **15** required merging both sides; exactly **one** conflicted. Resolving only the declared import conflict produced **zero mismatches** against `1d58ef72`.
- **Scope:** `git diff --numstat 1d58ef72 658e2a23` confirmed **2 test files, 72 insertions/9 deletions**, no production changes.
- **Assertions:** `git diff 9f148666 658e2a23 -- tests/unit/tools/ai-dm-conversation.test.ts` showed no removed/weakened assertions in the three control-flow tests. The geometry expectations are the only changed expectations.
- **Named blockers:** All five listed flanking pairs exist in the fixture JSON; hard-room destinations `(9,1)` and `(9,5)` are empty.
- **Geometry pin:** Independent enumeration of **48 corner rays** confirmed:
  - Fighter: four formerly clear rays now blocked by row-line-3 seams.
  - Cleric: four formerly clear rays now blocked by row-line-5 seams.
  - Wizard: exactly one clear ray, `(18,5)→(2,7)`. Across column 9, its row runs from `6` to `49/8`, through the gap.
  
  The corrected comment at lines 2773–2775 is accurate. No one-sided graze accounts for these newly blocked rays.
- **R02:** The supplied `OFFER_ENVIRONMENT` is the built environment already used by this test file; downstream assertions remain unchanged.
- Frozen-plan SHA matched `6e8b3237…ef8fd2f`.

## Commands and results

| Command/check I ran | Result |
|---|---|
| `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit` | Exit **0** |
| `node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit` | Exit **0** |
| `node scripts/check-offer-environment-architecture.mjs --self-test` | **77 fixtures passed** |
| `node scripts/check-command-outcomes.mjs` | Exit **0**; **1 check passed**, **1,624 TypeScript files checked** |
| `git diff --check 1d58ef72 658e2a23` | Exit **0** |
| Added-line length audit | **0** over 120 columns |
| Programmatic Vitest: replay, detection-reactions, dm-tactical-intel | **42/42 passed** |
| Programmatic Vitest: four affected conversation titles plus R02 | **2 passed; 3 blocked by EROFS at `mkdtemp`; 111 skipped** |
| In-memory fixture-pair probe | **1/1 passed**, 54 pairs examined |
| Same probe with `firstSharedEdgeBlockingCell` returning `null` | **1/1 passed**, 11 additional openings remained |
| Timing pair alone, single worker | **36/36 passed**, **38.952 s wall**, **18.8%** above 32.8 s; below **41 s** |

Vitest used `config:false`, `cache:false`, `pool:'threads'`, `maxWorkers:1`, and `experimental.viteModuleRunner:true`. The three filesystem-blocked conversation tests did **not** reach their assertions; their successful full-flow results remain supervisor evidence.

Production SHA-256 values before/after were identical:

```text
cover.ts     c8852c9767b1b8bbc9a7772eb8e65efe908bb8da7ae6e492814bf265d83b1662
encounter.ts 7fcb2f3b9d6977d16a8ba48e2fa0810805ff6236f87e26bc92dc19785537eedb
```

Worktree status remained clean.

VERDICT: REJECT (1 P1, 0 P2)
REVIEW DONE