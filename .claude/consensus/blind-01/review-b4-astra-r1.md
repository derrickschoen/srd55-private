91,936
**REJECT — 0 P1, 1 P2, 0 P3.** Reviewed candidate `51eb71a5`; verified the frozen plan hash. Concurrent B3 changes were excluded.

**P2 — Newly added “private” dependencies expose unseen-position information through an advice MCP resource.**  
[speculative-planning.ts:380](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/src/vtt/speculative-planning.ts:380) adds dependencies for unseen opponents. Candidate retention then depends on movement reachability from their actual positions. At candidate `src/vtt/mcp/engine-server.ts:3763`, the advertised revision resource serializes `snapshot.request` wholesale, including `scenarioMenu` and scenario facts.

Independent runtime witness:

- Map 40×5; monster `(1,1)`; wall at `(4,0..2)`; fixed PC `(6,2)`.
- Move another never-observed PC from `(6,1)` to `(30,1)`.
- Both PCs remain unseen; monster offer IDs remain identical.
- Near placement produces two visibility candidates/three scenarios; far placement produces one candidate/two scenarios.

Thus advice serialization reveals whether an unseen PC can emerge within its movement budget. The privacy problem is the exported reachability-derived menu, not merely querying visibility internally. Keep these facts host-side and add a relocation witness covering MCP resource serialization. Blind mode blocks this revision resource; I found no corresponding player-channel exposure.

Other requested checks:

1. **Productivity fidelity:** Correct for current production resolutions. Traversed steps cost 5 or 10 feet; ignoring difficult terrain retains the base cost. Forced movement does not supply this option movement path. Stationary Search without `pursue_indication` returns false, but there is **no direct negative productivity witness** for it. Positive movement independently satisfies rule 1.

   The single-main-Dodge and stance checks distinguish eligible posture. Declared/resolved checks duplicate each other for genuine successful resolutions; the policy literal is redundant for well-typed declarations. Cost/path/origin checks are guaranteed by the current blind-Dodge resolver but document the structural contract. The caller correctly obtains origin from `planningState.tokens`.

   **Confirm the surviving path mutant is equivalent over current production resolutions**, not over arbitrary synthetic helper inputs.

2. **Speculation:** The nonempty menu represents reachable visibility changes, not a vacuous dependency. However, it is not strictly host-private, as above. No resolution mechanics or digest algorithm changed; affected scenario IDs and capsule digests can change. The §7 test contains bounds/ranking assertions rather than an exact menu digest pin.

3. **Schemas/privacy:** The optional engagement schema contains stance/anchor only—no indication cells or `lastKnownPosition`. The tactical-option serializer currently omits engagement altogether. This addition therefore does not serialize the internal indication object into advice, blind, or player output.

4. **Generated specs:** Independently reproduced all three files **byte-for-byte**, twice, in memory using the generator’s exact Zod options and formatting. Runtime imports needed raw-text/test-environment handling because the normal Vite attempt hit sandbox restrictions. `$defs` numbering was deterministic across both serializations.

5. **185/185 measurement:** The first four categories read all **43 tracked fixtures**. Only rejected/new 6209 uses fresh generation. Category expectations and aggregate `[185, 251, 185]` are literal, plan-matching expectations—not computed expectations.

6. **Other regressions:** No additional B4 defect found. Supervisor checks were not repeated, and no files were written.

BLIND-01 REVIEW B4 DONE
