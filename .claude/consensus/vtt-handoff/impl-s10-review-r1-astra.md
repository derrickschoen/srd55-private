1. **F97 — SIGNIFICANT — correctness: omitted required gates can produce READY.**  
   [report.ts:152](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tools/vtt-handoff/report.ts:152) checks only supplied entries marked `required`; it does not detect omitted required gates. The test input contains only `focused-contracts` at [handoff-report.test.ts:26](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/handoff-report.test.ts:26), yet expects READY. Thus missing build, launch and artifact evidence can pass despite the mandatory battery at [plan:502](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp-plans/2026-09-09-vtt-handoff-plan.md:502).

   **Required:** define the required gate inventory independently of result entries. Missing required results must produce PARTIAL; test individual omissions, including the launch probe.

2. **F98 — SIGNIFICANT — correctness: the report test fails on the committed, clean candidate.**  
   [handoff-report.test.ts:68](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/handoff-report.test.ts:68) requires `changedFiles` to contain `tools/vtt-handoff/report.ts`. But [report.ts:116](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tools/vtt-handoff/report.ts:116) correctly collects only changes relative to HEAD and untracked files. On this clean candidate, both read-only Git queries return nothing; that file is committed.

   **Required:** test clean and dirty repository evidence using controlled fixtures or an injected Git reader. Preserve meaningful assertions about actual changed-file detection rather than relying on the lane’s uncommitted state.

3. **F99 — SIGNIFICANT — plan-conformance: required sample art request IDs are absent.**  
   S10b explicitly requires art paths and sample request IDs at [plan:449](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp-plans/2026-09-09-vtt-handoff-plan.md:449). [report.ts:183](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tools/vtt-handoff/report.ts:183) instead records static logical **asset** IDs, and the input schema provides no request-ID field. Neither output identifies an actual UUIDv7 request bundle.

   **Required:** include actual request IDs and their paths, obtained from supervisor evidence or validated outbox records, in both reports. Test their preservation without inventing IDs.

4. **F100 — SIGNIFICANT — correctness: the documentation claims an unimplemented art consumer.**  
   [art-exchange.md:21](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/docs/vtt-handoff/art-exchange.md:21) says the classic renderer uses frame view/provenance when available. Its production rendering instead calls `starterArtDataUri` at [encounter-app.ts:428](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/encounter-app.ts:428) and [:756](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/encounter-app.ts:756), resolving checked-in starter-art recipes through [starter-art-resolver.ts:16](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/assets/starter-art-resolver.ts:16). The inspected selection/rendering path does not consume exchange frames or `provenance.frameViews`.

   **Required:** describe the existing starter-art fallback accurately and identify exchange-frame consumption as future integration work.

Verified: handshake/subprotocol/token-file documentation matches the inspected implementation; wire shapes, unsupported light operations, player-light omission and stated art limits match source. Report digests are computed from file bytes, tool evidence comes from input, and report destinations are confined to `reports/claude`. Existing expectations and immutable contract/fixture files were not changed; the frozen contract hash remains intact.

**REJECT S10**