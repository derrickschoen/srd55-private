# Atomic level-up subchoices

## Contract

Extend `level_up_class` with one optional `planned_subchoices` object containing
`skills`, `expertise`, and `spells`. Every entry uses the existing logical
`PlannedGrantLocator`: source identity plus grant rule key plus ordinal. The
only pre-existing durable identifier allowed is the already-supported
`existing_source.source_instance_id`; generated skill, Expertise, spell-slot,
and spellbook row ids never cross the command boundary.

Malformed entries raise a payload error carrying structured data. Resolved
entries raise a level-up refusal carrying the subchoice kind, index, logical
locator, and named issue. The worker translates both error families to RPC
`handler_error.data`.

## Implementation

1. Add the typed command payload and strict validator for all locator and
   choice variants. Omission and empty arrays are legal deferral.
2. Extract a pure selected-feat application-plan reader so planned spell search
   and feat persistence consume the same trusted feat/config projection.
3. Extend planned spell search to understand newly selected feats and newly
   selected subclasses without requiring their future durable source ids.
4. After the feat and class/subclass generators have materialized durable
   occurrences, resolve each logical locator against its generated row.
   Apply skill fills first, reconcile and apply Expertise second, then assign
   new spells/replacements. All work stays inside `LevelUpClassCommand`'s
   transaction (and the executor's outer command transaction).
5. Reuse `assignSpellSelection` for the final eligibility check. This makes
   planned and durable paths consume the same `SpellSelectionConstraint` and
   `SpellSelectionEligibility` implementation.
6. Add integration tests for success, late-failure byte-atomicity,
   planned/durable equivalence, and D70 deferral warnings. Add validator and
   browser RPC transport controls for structured malformed-subchoice data.

## Verified assumptions

- `syncClassSourceState` generates the class source and then the selected
  subclass source before returning, so both future logical source kinds can be
  resolved after it.
- `applyLevelFeatSelection` generates the new feat source before returning its
  source id, so `selected_feat` can resolve without exposing that id.
- Skill and Expertise tables are uniquely addressed by
  `(source_instance_id, grant_key, ordinal)`; spell slots and spellbook entries
  persist the corresponding `rule_key` and `ordinal`.
- Nested `DatabaseContext.transaction` calls use the repository transaction
  runner, so a refusal after all generators and earlier fills unwinds the full
  command.
- Existing wire v16 already carries skill grants, Expertise grants, spell
  selections, source instances, and level-feat occurrences. No persisted row
  shape changes, so no wire, snapshot, or migration mint is permitted.

## Playwright spec classification

| Spec | Affected | Why |
|---|---:|---|
| `acceptance-walkthrough.spec.ts` | No | No guided level-up UI is changed in this command-layer dispatch. |
| `agent-reference.spec.ts` | No | Planner reference rendering and actions are unchanged. |
| `ai-chat.spec.ts` | No | AI bridge behavior is unrelated. |
| `attribution.spec.ts` | No | Attribution content is unchanged. |
| `backup.spec.ts` | No | No persisted shape or backup codec changes. |
| `bundled-content.spec.ts` | No | Bundled catalog content is unchanged. |
| `catalog-import.spec.ts` | No | Catalog import is unchanged. |
| `character-list.spec.ts` | No | Character list behavior is unchanged. |
| `character-sheet.spec.ts` | No | Existing completeness rows render deferred choices; sheet UI code is unchanged. |
| `command-rpc.spec.ts` | Yes | Proves malformed planned subchoices retain structured refusal data across the worker boundary. |
| `database-lifecycle.spec.ts` | No | Lifecycle and migration behavior are unchanged. |
| `guided-builder.spec.ts` | No | Guided level-one flows are unchanged. |
| `multiclass-skills.spec.ts` | No | Existing standalone multiclass skill RPC remains unchanged. |
| `persistence.spec.ts` | No | Generic persistence behavior is unchanged. |
| `php-feature-parity.spec.ts` | No | PHP parity calculations are unchanged. |
| `planner.spec.ts` | No | Planner UI does not yet submit the extended command. |
| `pwa.spec.ts` | No | PWA assets and lifecycle are unchanged. |
| `reports-and-print.spec.ts` | No | Report and print rendering are unchanged. |
| `sharing.spec.ts` | No | No share wire or codec shape changes. |
| `weapons.spec.ts` | No | Weapon behavior is unrelated. |

`command-rpc.spec.ts` imports only `@playwright/test` on the node side. It has
no fixture import graph and therefore no reachable Vite `?raw` import.

## Verification

- Focused validator, command, eligibility-equivalence, and browser RPC tests.
- Typecheck/build.
- Full Vitest floor.
- Full Chromium Playwright on `PLAYWRIGHT_PORT=44462`.
- Empty diffs from merge base `8060ab1` for wire v1-v16, migrations 0000-0025,
  and historical `a7-v1` through `a7-v15` fixtures.
- Second-agent review after implementation; address legitimate findings and
  rerun relevant checks.

## Review resolution

Claude's implementation review found and the implementation now fixes two
defects: replacement entitlement lookup is ordinal-specific, and a malformed
`skills` list reports the real plural payload field. It also identified the
distinct spellbook-acquisition path as unproved; a Wizard level-2 command test
now covers planning, logical resolution, assignment, and acquisition-level
provenance.

Two follow-up observations do not require code changes. No seeded Epic Boon
produces a spell grant, so there is no Epic-Boon spell locator for an
equivalence test; grouping enforcement remains owned by the shared LU-1 feat
planner. Also, `selected_class` and `existing_source` can semantically alias
the same source, but detecting that requires database state and is therefore
not structural payload validation. The second fill raises a structured
`grant_already_filled` refusal and the enclosing transaction rolls it back.
