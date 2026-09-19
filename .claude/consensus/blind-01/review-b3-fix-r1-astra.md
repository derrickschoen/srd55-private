92,512
**ACCEPT — no P1/P2/P3 findings.** The original ordering defect is fixed.

- MCP and board now share the exact sorter, including label tie-breaking. Identical menus produce identical ordering.
- Missing-main behavior does change: [`mainUse`:70](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/src/vtt/offered-option-paths.ts:70) throws instead of returning rank 6. This is unreachable through MCP’s registered menu: `availableEngineActorOptions` filters through resolution, which requires exactly one main slot.
- Tail pruning remains deterministic: Search/object utility precedes movement/defense; End Turn remains last.
- No existing pin or fixture encoding Search-after-Dodge was found; fixture bytes are unchanged.
- Both expectations are hand-derived. The pursuit parity assertion detects the pre-fix disagreement; the normal-menu assertion is an unchanged-order control and correctly passes before the fix.

Supervisor checks were not repeated. No writes performed.

BLIND-01 REVIEW B3 FIX R1 DONE
