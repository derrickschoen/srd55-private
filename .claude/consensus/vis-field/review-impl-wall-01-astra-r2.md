<!-- trimmed 2026-09-18 (D683): full codex log (337893 bytes) replaced by the lane's final message; session id 01a0a642-35a1-7082-aba2-eda56ea291c1; the full log is in the mirror history of commit 8889b450 -->

## Findings

**WALL-F3 closed; WALL-F4 closed. No new findings.**

### Endpoint geometry

[cover.ts:463–499](/home/vagrant/PhpstormProjects/dnd-wt-seam-ab/src/combat/cover.ts:463) implements D657 using integer differences, multiplication by ±1, and comparisons—no floating-point division.

My in-memory enumeration passed **200 assertions** across all four quadrants, mirrored source/target endpoints, and zero-length cases:

| Other endpoint relative to Q | Result |
|---|---|
| Inside Q | Clear |
| Either boundary half-line of Q | Clear |
| Opposite quadrant | Blocked |
| Either far-face half-line | Blocked |
| Adjacent blocking quadrant | Blocked |
| Zero-length, opposite free quadrants | Blocked |
| Zero-length, same quadrant | Clear |

The original full-wall leak, reverse direction, and adjacent-corner aggregate are covered by passing witnesses. The single-blocker control remains clear.

The endpoint’s own footprint cells are excluded by `sightBlockingAt` at [cover.ts:749](/home/vagrant/PhpstormProjects/dnd-wt-seam-ab/src/combat/cover.ts:749). Thus its own quadrant cannot be blocking **for this trace**, even if the underlying cell contains an optical effect.

### Footprints, ties, and physical cover

- Verified all four quadrant assignments for **Large and Huge** footprints.
- Constructed a Large source at `(2,2)` with blockers `(2,1)` and `(1,2)`: sight toward `(0,0)` blocks, first blocker `(2,1)`; sight toward `(5,2)` remains clear.
- A simultaneous endpoint/shared-edge probe passed: both events at progress zero select the lower-row/lower-column cell `(1,1)`.
- Physical tiers still depend only on crossed cover sources at [cover.ts:581–597](/home/vagrant/PhpstormProjects/dnd-wt-seam-ab/src/combat/cover.ts:581). The object-cover path uses the same endpoint machinery and physical-only selection at lines 891–912.
- **Endpoint-disabled mutant:** eight witnesses failed.
- **Optical-hit-raises-cover mutant:** physical-cover witness failed (`total` instead of `half`).

### Snapshot derivation

At `(7,3)`, the target occupies BR. The fighter/wizard rays approach from the west, outside BR’s closed quadrant; the cleric already crosses the door. This adds exactly `(7,3)` to concealment.

Substituting r3’s `cover.ts` versus the candidate in memory reproduced:

| Hash | r3 prefix | Candidate prefix |
|---|---|---|
| Pending request | `0ec0fbbc` | `28a1eb7e` |
| Coordinator | `79b076c9` | `87fc04ad` |
| Revision | `52305455` | `9ee96377` |

Structural comparison found only `(7,3)` removed from `visibleState.cells` and added to `visibleState.concealedCells`. Canonical state bytes were identical; fingerprint remained `dd802783…66b46a`.

### Generation and counts

I reran both versions in memory. **All 42 generated-room hashes matched**, aggregate:

```text
7b884bf91213ddaba626ec77b0dbf874c99d5de6cb8e6e190c0be5b7e31c56fc
```

Both versions independently produced:

| Family | Monsters | Offers / shotless |
|---|---:|---:|
| hard | 75 | 142 / 35 |
| brutal | 44 | 57 / 34 |
| brutal-b | 42 | 15 / 41 |
| brutal-2 | 44 | 58 / 36 |

### Commands and validation

Ran:

```text
git diff --check bc6422bf b94dd732
git diff --numstat bc6422bf b94dd732
git diff bc6422bf b94dd732 -- tests/fixtures fixtures
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit
```

Results: **tsc 0/0; diff-check 0; three files, 380 insertions/31 deletions; no fixture changes; zero added lines over 120 columns; clean checkout.**

Tests used `node --input-type=module` with programmatic `startVitest`, `config:false`, `cache:false`, one thread worker, and in-memory Vite transforms.

| Suite | Result |
|---|---:|
| visibility-field | 54/54 |
| scene-snapshot | 8/8 |
| dm-tactical-intel | 6/6 |
| tactical-evaluator-r02 | 2/2 |
| two-room-fixture | 4/4 |
| **Total** | **74/74** |

The isolated productive-option test measured **5,649 ms with r3** and **5,853 ms with the candidate**; both exceeded its unchanged 5,000 ms budget. Endpoint resolution adds at most two blocker lookups per outer corner, then constant-time checks per ray. This remains the acknowledged deferred performance issue.

Production SHA-256 before/after was identical:

```text
1d5b3d1c3120fc5193e6a9981d62c212ef1e60453879143d1a4652f76df0adeb
```

VERDICT: ACCEPT
REVIEW DONE.
