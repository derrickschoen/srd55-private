**Residual F2 is closed. No blocking findings remain.**

### Verified by reading

- [encounter.ts:4826](src/combat/encounter.ts:4826) now returns base passive Perception for unseen darkness/out-of-range cases. Blocked/obscured null handling, visible modifiers, and hearing are unchanged.
- The correction matches Keen Sight’s sight-only restriction: `docs/homebrew/ogl/srd-5.1/srd-5.1-ogl.txt:23010–23011`. Darkness and sight failure are supported by `docs/srd/full/srd-5.2.1.txt:679–683,11348–11352`.
- Only the authorized darkness expectation changed; its new result follows independently from **12 < 17** and `processHide`’s comparison at `encounter.ts:4888`.
- The dim-plus-heavy half is **byte-identical**. No other retained expectation changed.
- Scope matches D626.5: **2 files, 36 additions/3 deletions**, maximum added-line width **103**.

**Nonblocking naming note:** `detection-reactions.test.ts:126` still names `passive_five_shift` as proving ±5 modifiers, although its two cases now exercise darkness and heavy obscurement. Rename it descriptively. Actual ±5 coverage remains at `visibility-field.test.ts:1142–1148`; the new test’s name is accurate.

### My executed results

| Check | Result |
|---|---|
| T-app / T-node | **0 / 0** |
| Five focused suites | **77/77 passed** |
| Independent five-foot darkness probe | **12, passed** |
| Restore Keen Sight +5 mutation | **Killed by both tests; exit 1** |
| Diff whitespace check | **Exit 0** |
| Working tree | **Clean** |

The mutation produced darkness passive **17 instead of 12** and incorrectly changed Hide to `passively_detected`.

Commands included:

```bash
git diff 8cd82e39 d341a9fe
git diff --check 8cd82e39 d341a9fe
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit
git status --short
```

Tests/probes used `node --input-type=module` with the previously established read-only Vitest thread runner and in-memory transforms. I did not rerun the supervisor’s timing pair or broader sweep.

Production hashes printed before and after were identical:

```text
encounter.ts
7fcb2f3b9d6977d16a8ba48e2fa0810805ff6236f87e26bc92dc19785537eedb
visibility-field.ts
cb0eb30ebb498f6608e1e48ad269f1f099b68bed6b8c85dcab2fd7c9c066ed04
cover.ts
f1a89e61b505787be7e8742a0af3894030a19d79f4ff276f1e9fd923ca102764
```

F1/F3/F4 remain closed from round two.

ACCEPT B1
tokens used
673,540
**Residual F2 is closed. No blocking findings remain.**

### Verified by reading

- [encounter.ts:4826](src/combat/encounter.ts:4826) now returns base passive Perception for unseen darkness/out-of-range cases. Blocked/obscured null handling, visible modifiers, and hearing are unchanged.
- The correction matches Keen Sight’s sight-only restriction: `docs/homebrew/ogl/srd-5.1/srd-5.1-ogl.txt:23010–23011`. Darkness and sight failure are supported by `docs/srd/full/srd-5.2.1.txt:679–683,11348–11352`.
- Only the authorized darkness expectation changed; its new result follows independently from **12 < 17** and `processHide`’s comparison at `encounter.ts:4888`.
- The dim-plus-heavy half is **byte-identical**. No other retained expectation changed.
- Scope matches D626.5: **2 files, 36 additions/3 deletions**, maximum added-line width **103**.

**Nonblocking naming note:** `detection-reactions.test.ts:126` still names `passive_five_shift` as proving ±5 modifiers, although its two cases now exercise darkness and heavy obscurement. Rename it descriptively. Actual ±5 coverage remains at `visibility-field.test.ts:1142–1148`; the new test’s name is accurate.

### My executed results

| Check | Result |
|---|---|
| T-app / T-node | **0 / 0** |
| Five focused suites | **77/77 passed** |
| Independent five-foot darkness probe | **12, passed** |
| Restore Keen Sight +5 mutation | **Killed by both tests; exit 1** |
| Diff whitespace check | **Exit 0** |
| Working tree | **Clean** |

The mutation produced darkness passive **17 instead of 12** and incorrectly changed Hide to `passively_detected`.

Commands included:

```bash
git diff 8cd82e39 d341a9fe
git diff --check 8cd82e39 d341a9fe
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit
git status --short
```

Tests/probes used `node --input-type=module` with the previously established read-only Vitest thread runner and in-memory transforms. I did not rerun the supervisor’s timing pair or broader sweep.

Production hashes printed before and after were identical:

```text
encounter.ts
7fcb2f3b9d6977d16a8ba48e2fa0810805ff6236f87e26bc92dc19785537eedb
visibility-field.ts
cb0eb30ebb498f6608e1e48ad269f1f099b68bed6b8c85dcab2fd7c9c066ed04
cover.ts
f1a89e61b505787be7e8742a0af3894030a19d79f4ff276f1e9fd923ca102764
```

F1/F3/F4 remain closed from round two.

ACCEPT B1
