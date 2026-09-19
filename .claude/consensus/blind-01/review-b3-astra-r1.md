79,480
**REJECT — one P2 finding.**

- **P2: Search ordering disagrees with board-path ordinals.** [engine-server.ts:915](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/src/vtt/mcp/engine-server.ts:915) assigns Search rank 4, but [offered-option-paths.ts:85](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/src/vtt/offered-option-paths.ts:85) assigns rank 3. Executing both extracted ranking functions on the pursuit menu proves:
  - Board: **Search, Dodge, End Turn**.
  - MCP: **Dodge, Search, End Turn**.

  Consequently, a moving Search path displays ordinal **0**, while MCP option **0** is Dodge. Align the rankings and add a pursuit-menu ordering parity witness.

Other requested checks passed by inspection:

- Relevant B3 switches have exhaustive never-checks. No missing consumer outside the batch manifests identified.
- Search contributes no offense/damage/threat; blind Dodge gains no ordinary-Dodge damage credit. No existing numeric pin was rewritten in B3.
- `basic_advance` precedence matches the plan. No old runtime-version literal or dependent fixed hash pin found in tests/fixtures.
- §4 explicitly includes Search in the blind grammar. Strict parsing rejects an action-level `targetId`; resolution filters engine-offered candidates, so an arbitrary target cannot manufacture Search authority.
- Advice MCP emits Search as top-level `use_action`, with a `search` slot and its engine-bound target ID; blind Dodge emits `dodge` with empty targets. Neither serialization adds coordinates. Blind-mode context and player projection remain separate.

Completed supervisor checks were not repeated; no files were written.

BLIND-01 REVIEW B3 DONE
