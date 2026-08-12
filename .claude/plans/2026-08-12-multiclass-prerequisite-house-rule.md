# Multiclass prerequisite house-rule follow-on

## Outcome

Add a typed, per-character “Waive multiclass ability prerequisites” setting.
The default remains SRD enforcement. Enabling the setting makes only
ability-prerequisite failures eligible, explains the waiver in the planner,
and records the active house rule on the readable and structured sheet.

## Proven local assumptions

- Storage: `character_rule_overrides` already owns per-character JSON settings,
  cascades with the character, and is included by both backup and share. The
  binding W-MC design reserves `ignore_multiclass_prerequisites` with absence =
  off and canonical JSON `true` = on. Therefore no schema migration is needed.
- Enforcement: `assertMulticlassEntryEligible` is called by both durable class
  entry writers, `AddSourceCommand` and `UpdateClassCommand`. The planner and
  `commands.execute` RPC both reach those writers.
- Projection: `CharacterWorkspaceBuilder.availableClassOptions` is the single
  planner eligibility projection; `CharacterSheetBuilder` feeds both the
  readable sheet and `sheetFacts`.
- Portability: share already carries every override through root key
  `overrides` / tuple keys `ruleKey,value`; backup already carries the table
  directly. No wire key, arity, version, historical fingerprint, boot digest,
  catalog fingerprint, or schema pin needs to move.
- Compatibility: old share/backup documents already contain either an empty
  overrides collection/table or no row with the reserved key. The typed reader
  therefore decodes them as off without migration or invented data.

## Implementation

1. Create a typed house-rule module owning the reserved storage key, strict
   `off | on | invalid` decoder, canonical writer semantics, and closed sheet
   disclosure key. Invalid data fails closed.
2. Add a public set command and integrity-protected exact restore inverse so the
   setting participates in revision, operation history, undo, and redo without
   snapshot/version changes or loss of an imported invalid prior row.
3. Widen the gate assessment union with an explicit `waived` outcome. Both
   writers continue to call the same assertion; workspace RPC preserves the
   distinction so the UI can say “House rule: prerequisites waived.”
4. Add the planner checkbox and player-facing explanation. Disabled reasons
   remain unchanged while off; waived options become selectable and visibly
   explain why.
5. Add a closed house-rule projection to `CharacterSheet`, render a normal
   print-visible House rules panel, and add the same closed key to `sheetFacts`.
   Continue rendering standing SRD shortfall warnings independently.
6. Add focused writer/RPC/UI/sheet/share/backup/old-document tests. Add a plain
   shell mutation script that temporarily makes the gate ignore the toggle,
   runs the named gate test expecting failure, and restores the file.

## Verification

- Targeted Vitest for the typed reader/command, both writer gates, RPC DTO,
  planner rendering, sheet provenance, share round-trip, backup round-trip,
  old-format compatibility, wire pins, and historical/boot fingerprint guards.
- `npm run typecheck` and targeted build/schema integrity tests.
- Only the multiclass Playwright test, Chromium, one worker, on
  `PLAYWRIGHT_PORT=5070`; no full browser pool.
- Run the mutation-control script and require a nonzero mutated test result plus
  a passing restored test result.
- Claude reviews this plan and the uncommitted implementation; legitimate
  findings are fixed and resubmitted, up to three rounds.
