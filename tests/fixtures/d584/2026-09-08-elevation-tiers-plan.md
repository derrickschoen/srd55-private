## Slices and exact files

1. **Dispatchable foundation only.** Add `src/combat/elevation.ts`, `src/combat/movement-speeds.ts`,
   `tests/unit/combat/elevation.test.ts`, `tests/unit/combat/movement-speeds.test.ts`, `tests/types/elevation-vocabulary.type-test.ts`,
   `tools/d584-contract-inventory.ts`, `tools/d586-mutation-contract.ts`, `tests/unit/tools/d584-contract-inventory.test.ts`, `tests/unit/tools/d586-mutation-contract.test.ts`, and `tests/fixtures/d586-elevation-mutants.json`. Do not yet
   change any existing state/profile/token/object/storage interface or consumer.
2. **Atomic state/storage/speed cutover.** Modify `src/combat/grid.ts`, `src/combat/values.ts`,
   `src/combat/combatant.ts`, `src/combat/statblock.ts`, `src/combat/wild-shape.ts`, `src/combat/world-objects.ts`, `src/combat/encounter.ts`, `src/combat/commands.ts`, `src/combat/visibility.ts`,
   `src/vtt/project-spatial-settings.ts`, `src/vtt/session-persistence.ts`, `src/vtt/replay.ts`, `src/vtt/arena-legality.ts`, `src/vtt/d365-sample-dungeon.ts`, `src/vtt/dm-encounter-host.ts`,
   `src/vtt/engine-query-port.ts`, `src/vtt/engine-state-capsule.ts`, `src/vtt/generated-encounter-fixtures.ts`, `src/vtt/intent-resolver.ts`, `src/vtt/monster-planning-state.ts`,
   `src/vtt/party-pack.ts`, `src/vtt/reference-encounter.ts`, `src/vtt/room-generator.ts`, `src/vtt/stored-character-encounter.ts`, `src/vtt/turn-option-registry.ts`,
   `src/vtt/vane-warren.ts`, `src/vtt/watabou-adapter.ts`, `src/vtt/intel/option-outcome.ts`, and `src/vtt/intel/recovery-capability.ts`.
   Verify every A21 diagnostic test; edit only those still diagnostic after normalized
   optional setup/object inputs. No partial cutover or handoff.
3. **Mechanics/query.** Modify `src/combat/movement.ts`, `src/combat/encounter-movement-world.ts`, `src/combat/combat-rules.ts`, `src/combat/cover.ts`, `src/combat/terrain.ts`, `src/combat/encounter.ts`,
   `src/combat/effects.ts`, `src/combat/movement-evaluator.ts`, `src/combat/tactical-evaluator.ts`, `src/vtt/engine-query-port.ts`, `src/vtt/turn-option-registry.ts`, `src/vtt/blind-model-ingress.ts`,
   `src/vtt/mcp/line-query.ts`, `src/vtt/mcp/schemas.ts`, `src/vtt/mcp/engine-server.ts`, `src/vtt/mcp/entrypoint.ts`, `tools/ai-dm-conversation.ts`, and
   `tools/ai-dm-arena.ts`; add `tests/unit/combat/elevation-movement.test.ts`, `tests/unit/combat/elevation-cover.test.ts`, and `tests/unit/vtt/engine-query-line-elevation.test.ts`.
4. **Generator.** Modify `src/vtt/room-generator.ts` and
   `tools/generate-arena-basis.ts`; add `tests/fixtures/arena-basis-elevation-tiers-v1/**`
   and `tests/unit/vtt/room-generator-elevation.test.ts`.
5. **Renderer/blind.** Modify `src/vtt/encounter-board.ts`, `src/vtt/encounter-projections.ts`, `src/vtt/semantic-board-payload.ts`, `src/vtt/board-chrome.ts`, `src/vtt/encounter-app.ts`, `src/vtt/mcp/schemas.ts`,
   `src/assets/pixel-art.ts`, `src/assets/board-glyphs.ts`, `tools/ai-dm-board-snapshot.ts`,
   `tools/generate-engine-mcp-schemas.ts`, both exact D569 files, named unit specs, and only
   `tests/browser/elevation-board.spec.ts`.
6. **Probe seam.** After I5, modify only `tools/ai-dm-screenshot-probe.ts` and
   `tests/unit/tools/ai-dm-screenshot-probe.test.ts` for Q15–Q17, four counterfactual
   members, scoring, and ablation. Live work is supervisor-only.

## D584.4 cumulative verification contract
