# Table-runnable character sheet

## Verified assumptions

- `SheetContentLookup` already reads every selected subclass feature, including name, description, acquisition level, and order. The sheet builder currently discards that prose.
- `SheetSpellReference` already carries casting time, range, components, duration, effect text, and the two progression-summary/table families used by the print appendix. The screen projection currently discards them.
- Bundled Fire Bolt stores its full damage and scaling rule in `spell_versions.short_summary`; its structured cantrip-upgrade rows are absent. A narrow, typed display parser can identify only explicit `level (current dice)` pairs and must return UNKNOWN for every other shape.
- E3's value-expression vocabulary already represents `ceil(class level / 2)`, and `sheetFacts.feature_values` already provides the numeric/provenance seam. Arcane Recovery can therefore be a mint-free built-in sourced contribution with no usage marking.
- The SRD text at `docs/srd/full/srd-5.2.1.txt:4671-4683` states half Wizard level rounded up, no recovered slot level 6+, and one use per Long Rest.
- This supervised dispatch forbids a second-agent CLI. The supervisor owns independent review and full suites; this lane performs self-critique and targeted gates only.

## Implementation

1. Add a typed current-level subclass-feature projection to `CharacterSheet`, derived from the already-loaded selected subclass content and filtered once by owning class level. Carry subclass name and catalog layer together; render names immediately and prose inside a keyboard-native disclosure using text nodes/free-text cells.
2. Replace the obsolete no-subclass-prose gap claim. Keep class prose absence honest except for the explicitly surfaced Arcane Recovery rule.
3. Reuse one spell-card projection for print and screen. Screen disclosures state casting time, range, components, duration, effect text, and upgrade information; every absent datum prints UNKNOWN. Derive a cantrip's current display only from an explicit stored `level (value)` mapping and return UNKNOWN otherwise.
4. Extend E3's sheet feature-value union with resource maxima. Add Arcane Recovery as a built-in SRD contribution evaluated by the existing value-expression evaluator at Wizard level, show its slot-level budget and sourced prose, include its numeric/provenance facts, and deliberately emit no boxes/remaining tracker.
5. Add integration, projection, and browser pins in both directions: subclass prose present at acquisition and absent below; Fire Bolt current dice at character levels 5 and 11; Arcane Recovery values 1 at Wizard 2 and 3 at Wizard 5. Add hostile-text and UNKNOWN controls.
6. Run the full forbidden-pattern and Playwright import-scope greps, targeted Vitest files, the affected Playwright spec on port 5010, `npm run build`, and one saved-copy mutation script that proves a load-bearing assertion fails before restoration.

## Self-critique and boundaries

- Do not parse arbitrary damage grammar or infer missing spell fields. The cantrip helper accepts only explicit stored level/value pairs and exposes UNKNOWN otherwise; the full stored effect remains readable.
- Do not add Arcane Recovery to spendable resource tracks. Its value is a slot-level budget, not uses or fungible points.
- Do not place catalog-authored prose in `sheetFacts`. Only closed/numeric value facts cross that boundary.
- Do not add schema, migration, digest, wire, snapshot, or config changes. The implementation consumes E3's existing contribution/value-expression types and existing stored spell/subclass data.
- Do not run full suites. The supervisor owns them.

## Verification completed

- Typecheck and production build pass; the bundled-content digest remains the
  existing 444-aggregate hash and the distribution guard is clean.
- The 13 affected Vitest files pass 266 tests (252 in the sheet/rules group and
  14 in the layer/source guard group).
- The six affected Playwright spec files pass 39 tests on port 5010. A final
  focused rerun of the Arcane/subclass sheet case also passes after sourcing the
  complete Arcane Recovery block.
- The executed rounding mutation changed Arcane Recovery from ceiling to floor,
  made the Wizard-5 pin fail as 2 rather than 3, and passed after exact restore.
- Diff audit is clean: no forbidden type/test escapes, config/schema/migration/
  digest changes, whitespace errors, or leftover mutation backup.
