<!-- trimmed 2026-09-18 (D683): full codex log (459854 bytes) replaced by the lane's final message; session id 01a0b20e-61fa-7e52-897b-3b01b026c2ff; the full log is in the mirror history of commit 8889b450 -->

Applied D651 as test-scene changes only; production code is unchanged.

| Test | Applied derivation |
|---|---|
| Scene snapshot | Vertex `(7,3)` is sealed by blocker `(7,2)` and door `(6,3)`. Last-clear rays `(3,3)→(8,3)` and `(2,3)→(9,3)` now block. DM fog gains `(8,3),(9,3)`; fighter concealment also gains `(8,2),(9,2),(8,3),(9,3)`. All three hashes were re-pinned with full old/new values. Encounter-state bytes and fingerprint `dd802783…46a` are explicitly unchanged. Negative controls remain. |
| Blocked auto-submit | Moved helper blockers `(9,1)/(9,5)` to `(8,1)/(8,5)`. This removes diagonal contacts with `(10,2)/(10,6)` at vertices `(10,2)/(10,6)`. The exact original five visibility openings and zero closures remain asserted. |
| Unresolved frontier | Uses the same corrected helper geometry; the frontier and `sim_controller` subject are restored. |
| DM tactical intel | Moved `(9,2)` to `(8,2)`, removing the `(9,2)/(10,3)` diagonal pair at `(10,3)`. The two row-3 rays are clear again; Half Cover and `blocksSight:false` are explicit. |
| Tactical evaluator | Same scene correction. Both 90-foot shots remain legal with explicit Half and Three-Quarters tiers and `blocksSight:false`. |

Touched files:

- [ai-dm-conversation.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/tools/ai-dm-conversation.test.ts)
- [dm-tactical-intel.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/dm-tactical-intel.test.ts)
- [scene-snapshot.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/scene-snapshot.test.ts)
- [tactical-evaluator-r02.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/tactical-evaluator-r02.test.ts)

Verification:

- Five corrected cases: **5/5 passed**, 121 skipped.
- Visibility field: **46/46 passed**.
- LOS cover: **110/112 passed**. Unchanged budget tests timed out at:
  - `M576-E2-WALL-SEALS-ROOM`: **5.177 s**
  - productive first-turn option: **5.400 s**
- `tsconfig.app.json`: exit 0.
- `tsconfig.node.json`: exit 0.
- `git diff --check`: exit 0.
- `git status --short`: exactly the four test files above.

WALL-01-FIX-R3 DONE
