# R1 tail refusal map

This is the site-by-site D278 classification of the bare throws in
`src/authoring`, `src/builder`, `src/character`, `src/eligibility`,
`src/backup`, `src/db`, and `src/worker` on `lane-wt/tail-refusal-map`.
It applies `docs/design/2026-08-17-tagged-error-taxonomy.md` together with the
ratified D278 foundation plan at
`/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/plans/2026-08-17-d278-refusals-foundation.md`.

## Scope and classification rule

The enumerated population is the output of:

```text
rg --no-ignore -n --glob '*.ts' --glob '*.tsx' \
  'throw new (?:Error|TypeError)\b' \
  src/authoring src/builder src/character src/eligibility \
  src/backup src/db src/worker
```

“Bare throw” therefore means `throw new Error(...)` or
`throw new TypeError(...)`, matching the inventory definition in
`2026-08-17-tagged-error-taxonomy.md` §6. Rethrows and existing named error
classes are not in that population. The three deliberately thrown rollback
sentinels in these directories are enumerated separately so the control-flow
category is explicit rather than hidden by the bare-throw search.

D278 controls the semantic classification:

- **Defect**: malformed or forged input, corrupt stored data, a broken build or
  registry, or an invariant that valid program flow already proved. It remains
  a throw, migrated to a fact-bearing tagged defect class under D274.
- **Expected refusal**: well-formed input cannot proceed because of mutable
  state or policy. It becomes `Outcome.refused` with the named shared `Refusal`
  arm below.
- **Rollback/control-flow sentinel**: an internal throw whose identity exists
  only to force synchronous transaction rollback and is caught at its owning
  boundary. D278's transaction helper replaces these; no `Refusal` arm names
  the sentinel itself.

The classification follows the guard, not an overbroad outer catch. In
particular, a catch that currently converts every SQL/invariant failure to
`commit_failed` does not turn a defect into an expected refusal.

## Count reconciliation

| Area | Bare sites | Defects | Expected refusals |
| --- | ---: | ---: | ---: |
| `authoring` | 49 | 46 | 3 |
| `builder` | 18 | 15 | 3 |
| `character` | 12 | 12 | 0 |
| `eligibility` | 11 | 7 | 4 |
| `backup` | 3 | 3 | 0 |
| `db` | 22 | 22 | 0 |
| `worker` | 18 | 18 | 0 |
| **Total** | **133** | **123** | **10** |

The live branch has 22 `db` sites, one more than the taxonomy document's
2026-08-17 `lane/err-mig-1` snapshot of 21. All 22 live sites are listed here.
The three supplemental rollback sentinels are not included in the 133.

## `src/authoring`

### Defects

- `src/authoring/archive-set-lifecycle.ts:82` — Stored archive content has an
  impossible kind outside the closed authored-content vocabulary.
- `src/authoring/archive-set-lifecycle.ts:87` — Stored archive content has an
  unknown rules edition and violates its row contract.
- `src/authoring/archive-set-lifecycle.ts:331` — A lineage count read from the
  database violates the query's positive-integer invariant.
- `src/authoring/archive-set-lifecycle.ts:526` — An archived-only query returned
  an active row, so the query or stored state is inconsistent.
- `src/authoring/archive-set-lifecycle.ts:570` — A token revalidated immediately
  before the transaction, so failure to archive its identity is an invariant
  or database failure, not a user refusal.
- `src/authoring/archive-set-lifecycle.ts:576` — The revalidated preview omitted
  a character carried by the authenticated token, an impossible plan mismatch.
- `src/authoring/archive-set-lifecycle.ts:583` — A character update failed after
  exact token and revision revalidation inside the synchronous transaction.
- `src/authoring/archive-set-lifecycle.ts:624` — A revalidated restore could not
  update its exact archived identity, violating the transaction invariant.
- `src/authoring/archive-set-lifecycle.ts:631` — A planned archived character
  could not be restored at its authenticated revision and archive event.
- `src/authoring/archive-set-lifecycle.ts:639` — Deleted archive-membership rows
  disagree with the authenticated plan's exact character count.
- `src/authoring/archive-set-lifecycle.ts:734` — A lineage-scope query returned
  a non-string content key, which is corrupt stored/query data.
- `src/authoring/archive-set-lifecycle.ts:840` — Permanent purge left a foreign-
  key violation, a database-integrity defect.
- `src/authoring/background-publisher.ts:461` — A freshly loaded, token-checked
  draft failed its exact delete inside one synchronous commit.
- `src/authoring/species-publisher.ts:659` — A freshly loaded, token-checked
  draft failed its exact delete inside one synchronous commit.
- `src/authoring/subclass-publisher.ts:877` — A freshly loaded, token-checked
  draft failed its exact delete inside one synchronous commit.
- `src/authoring/bundled-homebrew-installer.ts:127` — Bundled revisions disagree
  on immutable identity fields, so the shipped catalog is malformed.
- `src/authoring/bundled-homebrew-installer.ts:133` — A bundled entry repeats a
  revision digest, which is invalid build-owned catalog data.
- `src/authoring/bundled-homebrew-installer.ts:152` — A bundled supersession
  lineage contains a cycle, which is invalid build-owned catalog data.
- `src/authoring/bundled-homebrew-installer.ts:158` — A bundled supersession
  lineage points to a missing successor, which is invalid build-owned data.
- `src/authoring/bundled-homebrew-installer.ts:175` — Installed current content
  lacks the fingerprint its stored identity contract requires.
- `src/authoring/bundled-homebrew-installer.ts:204` — Installed content does not
  match any registered revision of the bundled entry.
- `src/authoring/bundled-homebrew-installer.ts:267` — Deterministic bundled
  installation unexpectedly requested interactive adoption review.
- `src/authoring/bundled-homebrew-installer.ts:281` — The installer completed
  its revision loop without producing the required result.
- `src/authoring/bundled-homebrew-installer.ts:284` — An idempotent-match plan
  produced a non-matching commit outcome.
- `src/authoring/bundled-homebrew-installer.ts:330` — Control reached the
  post-transaction fallthrough instead of catching the preview sentinel.
- `src/authoring/draft-codecs.ts:839` — The build's draft-codec registry lacks
  the version it declares current.
- `src/authoring/draft-service.ts:144` — A stored draft row has a content kind
  outside the closed stored contract.
- `src/authoring/draft-service.ts:174` — Published stored content has an unknown
  rules edition.
- `src/authoring/draft-service.ts:353` — An internally assembled replacement
  value violates the required text shape.
- `src/authoring/draft-service.ts:362` — An internally assembled replacement
  value violates the nullable-integer shape.
- `src/authoring/draft-service.ts:371` — An internally assembled replacement
  value violates the text-array shape.
- `src/authoring/draft-service.ts:382` — A replacement value contains a skill
  outside the closed skill vocabulary.
- `src/authoring/draft-service.ts:398` — A replacement value is not the required
  typed fingerprint reference.
- `src/authoring/draft-service.ts:1224` — The immediately preceding exhaustive
  set validation proved this reviewed token exists, so absence is impossible.
- `src/authoring/reference-retarget.ts:750` — Stored background effects contain
  an ability outside the closed vocabulary.
- `src/authoring/reference-retarget.ts:886` — A source ID captured from the same
  node set has no path in the derived path map.
- `src/authoring/reference-retarget.ts:939` — Stored retarget state contains an
  unknown skill value.
- `src/authoring/reference-retarget.ts:1033` — A spell replacement notice lacks
  the numeric version ID required by its table discriminant.
- `src/authoring/reference-retarget.ts:1052` — A skill replacement notice lacks
  the string skill required by its table discriminant.
- `src/authoring/reference-retarget.ts:1493` — Applying the replacement species
  succeeded without creating its required active guided source.
- `src/authoring/reference-retarget.ts:1555` — Applying a background with an
  equipment choice produced no configurable replacement source.
- `src/authoring/reference-retarget.ts:1581` — Applying the replacement
  background produced no required active guided source.
- `src/authoring/reference-retarget.ts:1609` — Preview already proved matching
  subclass parents, so a mismatch during the same plan is an invariant failure.
- `src/authoring/reference-retarget.ts:1646` — Subclass synchronization produced
  no required active source for the replacement subclass.
- `src/authoring/reference-retarget.ts:1659` — The token's character revision
  was revalidated before this synchronous transaction, so the exact final
  update failing is an invariant/database defect rather than a conflict result.
- `src/authoring/reference-retarget.ts:1715` — Control reached the preview
  fallthrough instead of catching the retarget rollback sentinel.

### Expected refusals

- `src/authoring/reference-retarget.ts:1469` — A valid species reference uses a
  non-guided source whose choices the retarget operation cannot preserve;
  prospective arm: `reference_retarget_refused` (`reason: 'source_not_preservable'`).
- `src/authoring/reference-retarget.ts:1535` — A valid background reference uses
  a non-guided source whose choices the retarget operation cannot preserve;
  prospective arm: `reference_retarget_refused` (`reason: 'source_not_preservable'`).
- `src/authoring/reference-retarget.ts:1621` — A valid subclass reference has no
  preservable active subclass source to retarget; prospective arm:
  `reference_retarget_refused` (`reason: 'source_not_preservable'`).

### Rollback/control-flow sentinels (supplemental)

- `src/authoring/bundled-homebrew-installer.ts:322` — `PreviewRollback` carries
  the completed preview out of the synchronous transaction while forcing its
  writes to roll back.
- `src/authoring/reference-retarget.ts:1701` — `RetargetPreviewRollback` carries
  the simulated retarget result out while forcing transaction rollback.

## `src/builder`

### Defects

- `src/builder/equipment-step.ts:93` — Seeded equipment contains an option the
  schema CHECK and closed option set should have made unstoreable.
- `src/builder/equipment-step.ts:167` — The step was invoked with a character ID
  that does not resolve; under D278 an invalid/forged reference is a defect.
- `src/builder/equipment-step.ts:171` — The wizard reached equipment without
  the class prerequisite that its state derivation guarantees.
- `src/builder/guided-creation.ts:221` — The supplied ability draft is malformed
  despite the typed/validated draft boundary.
- `src/builder/guided-creation.ts:1183` — Origin application received a
  character ID that does not resolve.
- `src/builder/guided-creation.ts:1699` — A stored background prints skills
  outside the closed skill vocabulary.
- `src/builder/guided-creation.ts:1753` — Background-choice application received
  a character ID that does not resolve.
- `src/builder/guided-creation.ts:2117` — Expertise-state construction received
  a character ID that does not resolve instead of the query-level `not_found`
  result used by the guided-state seam.
- `src/builder/guided-creation.ts:2340` — A slot row has no total for the ordinal
  group derived from the same row set.
- `src/builder/guided-creation.ts:2406` — A spellbook row has no total for the
  ordinal group derived from the same row set.
- `src/builder/guided-creation.ts:2459` — A stored guided spell bucket is outside
  the closed bucket vocabulary.
- `src/builder/guided-creation.ts:2535` — The eligible-spell query received an
  address that does not identify a choice owned by the character; this is an
  invalid/forged reference, not a policy denial.
- `src/builder/required-fighter-choices.ts:245` — Fighter-choice state received a
  character ID that does not resolve instead of a successful `not_found` read
  result.
- `src/builder/species-choice.ts:108` — Eligibility returned a spell version
  without the content key its row contract requires.
- `src/builder/species-choice.ts:305` — Choice resolution lost an entry from the
  same indexed configured-choice collection.

### Expected refusals

- `src/builder/guided-creation.ts:231` — A well-formed stale ability-draft save
  reached a character whose ability step is already complete; prospective arm:
  `guided_step_refused` (`reason: 'step_already_complete'`).
- `src/builder/guided-creation.ts:2262` — The character revision differs from
  the Expertise step's asserted revision; shared arm: `revision_conflict`.
- `src/builder/guided-creation.ts:2486` — The character revision differs from
  the spell step's asserted revision; shared arm: `revision_conflict`.

## `src/character`

All twelve sites are defects; this module restores internal/save-point
snapshots, so malformed snapshots are corrupt or forged state rather than
policy refusals.

- `src/character/character-state.ts:517` — Snapshot insertion received an empty
  row with no columns.
- `src/character/character-state.ts:581` — A snapshot table payload is not a
  list.
- `src/character/character-state.ts:585` — A snapshot table contains a
  non-object row.
- `src/character/character-state.ts:595` — A legacy armor-class adjustment row
  fails its snapshot validation contract.
- `src/character/character-state.ts:708` — Internal state capture was requested
  for a character that does not exist.
- `src/character/character-state.ts:942` — The snapshot schema version is not
  one the build can restore.
- `src/character/character-state.ts:948` — The snapshot has no character object.
- `src/character/character-state.ts:955` — The versioned snapshot character row
  lacks a column required by that version.
- `src/character/character-state.ts:970` — A snapshot child row belongs to a
  different character.
- `src/character/character-state.ts:983` — A spell-selection snapshot row has an
  invalid nullable spell-version ID.
- `src/character/character-state.ts:996` — A spellbook snapshot row has an
  invalid nullable spell-version ID.
- `src/character/character-state.ts:1052` — A snapshot references inactive spell
  versions and violates restore integrity.

## `src/eligibility`

### Defects

- `src/eligibility/spell-selection-assignment.ts:61` — Stored selection
  constraint JSON is not the required string list.
- `src/eligibility/spell-selection-assignment.ts:163` — Assignment received a
  slot/acquisition address that is not active and owned by the asserted
  character, an invalid/forged reference.
- `src/eligibility/spell-selection-collection.ts:70` — A collection outside the
  closed supported collection set reached SQL generation.
- `src/eligibility/spell-selection-constraint.ts:37` — Stored constraint JSON
  decoded to a non-array.
- `src/eligibility/spell-selection-constraint.ts:40` — Stored constraint JSON
  contains non-string members.
- `src/eligibility/spell-selection-eligibility.ts:220` — A non-null collection
  survived all supported collection branches, violating exhaustiveness.
- `src/eligibility/spell-selection-service.ts:78` — Selection received a slot ID
  that does not identify an active slot, an invalid/forged reference.

### Expected refusals

- `src/eligibility/spell-selection-assignment.ts:168` — A valid selection slot
  is policy-locked; prospective arm: `spell_selection_refused`
  (`reason: 'slot_locked'`).
- `src/eligibility/spell-selection-assignment.ts:189` — A valid spell choice
  fails the slot's current eligibility constraint; prospective arm:
  `spell_selection_refused` (`reason: 'ineligible'`, carrying the structured
  eligibility reason rather than prose).
- `src/eligibility/spell-selection-assignment.ts:241` — A valid spellbook choice
  would duplicate an active spell; prospective arm: `spell_selection_refused`
  (`reason: 'already_in_spellbook'`).
- `src/eligibility/spell-selection-service.ts:83` — A valid slot selected through
  the service is policy-locked; prospective arm: `spell_selection_refused`
  (`reason: 'slot_locked'`).

## `src/backup`

All three sites are defects. D278 explicitly keeps malformed/forged input and
corrupt data on the tagged-defect channel; backup validation does not become a
policy refusal merely because the user supplied the file or ID.

- `src/backup/character-backup.ts:2034` — Export received a character ID that
  does not resolve.
- `src/backup/character-backup.ts:2111` — A character being exported contains a
  content reference that cannot be resolved, violating backup integrity.
- `src/backup/character-backup.ts:4196` — A committed content import failed to
  produce the character its callback must assign.

## `src/db`

All 22 sites are defects: they validate build-owned registries/codecs,
database integrity, schema compatibility, lifecycle use, or migration
postconditions. None is a policy refusal.

- `src/db/bootstrap.ts:179` — The registered bootstrap pass completed without
  running bundled-spell reconciliation.
- `src/db/bootstrap.ts:225` — The build has no terminal migration from which to
  derive its verification key.
- `src/db/codecs.ts:40` — A selected SQL column violates the caller's declared
  row type.
- `src/db/codecs.ts:215` — Stored JSON is syntactically invalid.
- `src/db/codecs.ts:242` — A value admitted as `JsonValue` failed JSON
  serialization.
- `src/db/codecs.ts:252` — A value admitted to an object-only boundary is not a
  JSON object.
- `src/db/database-lifecycle.ts:98` — A supplied database image has no bytes and
  is malformed input.
- `src/db/database-lifecycle.ts:133` — SQLite reports database-integrity
  corruption.
- `src/db/database-lifecycle.ts:138` — SQLite reports a foreign-key violation.
- `src/db/database-lifecycle.ts:157` — The database image lacks an application-
  required trigger.
- `src/db/database-lifecycle.ts:175` — The database image lacks application-
  required tables.
- `src/db/database-lifecycle.ts:228` — Code attempted to access a closed
  lifecycle's database context.
- `src/db/database-lifecycle.ts:426` — The opened image's schema signature does
  not match the build.
- `src/db/database-lifecycle.ts:461` — The build's migration registry does not
  target its own declared application schema.
- `src/db/database-lifecycle.ts:480` — An unknown image has a schema that cannot
  be recognized or migrated to the application schema.
- `src/db/database.ts:24` — SQLite failed to enable mandatory foreign-key
  enforcement.
- `src/db/migrations.ts:560` — The build registers a duplicate migration ID.
- `src/db/migrations.ts:566` — A build-owned migration's SQL does not match its
  frozen checksum.
- `src/db/migrations.ts:613` — SQLite failed to disable foreign keys for the
  migration protocol.
- `src/db/migrations.ts:642` — The migrated database fails its foreign-key
  integrity check.
- `src/db/migrations.ts:648` — The migration result does not match the declared
  target schema.
- `src/db/migrations.ts:668` — SQLite failed to restore mandatory foreign-key
  enforcement after migration.

## `src/worker`

All 18 bare sites are defects: build-time RPC registry/handler invariants,
malformed stored party state, forged diagnostic parameters, or impossible
postconditions. The one worker rollback sentinel is listed separately.

- `src/worker/handler.ts:26` — Build-owned handler registration supplied an
  invalid RPC method name.
- `src/worker/handlers/guided.ts:391` — A just-mutated character vanished before
  its state was read back in the same serialized handler operation.
- `src/worker/handlers/level-up-preview.ts:89` — A command returned a Promise
  inside a synchronous SQLite preview transaction, which would commit early.
- `src/worker/handlers/level-up-preview.ts:113` — The preview sentinel was
  caught without the transaction body assigning its required result.
- `src/worker/handlers/party.ts:183` — Stored party state contains a forge
  outside the closed vocabulary.
- `src/worker/handlers/party.ts:192` — Stored party state contains a document
  kind outside the closed vocabulary.
- `src/worker/handlers/party.ts:209` — Stored party state contains an
  observation state outside the closed vocabulary.
- `src/worker/handlers/party.ts:277` — A confirmed-publish state lacks its
  required local revision.
- `src/worker/handlers/party.ts:286` — A non-publish transition attempted to
  alter the published local revision.
- `src/worker/handlers/party.ts:294` — A successful-refresh state lacks its
  required observation time.
- `src/worker/handlers/party.ts:300` — A never-refreshed state incorrectly
  carries a successful-refresh time.
- `src/worker/handlers/party.ts:307` — A non-success transition attempted to
  advance the successful-refresh time.
- `src/worker/handlers/party.ts:318` — A successful-refresh transition attempted
  to move its monotonic success time backward.
- `src/worker/handlers/party.ts:359` — A just-upserted party state could not be
  read back in the same transaction.
- `src/worker/handlers/system.ts:258` — Diagnostic RPC input names a filter
  column absent from the selected table, a forged parameter.
- `src/worker/registry.ts:41` — A build-owned RPC module does not export the
  required handler list.
- `src/worker/registry.ts:45` — A build-owned RPC module exports an invalid
  handler entry.
- `src/worker/registry.ts:57` — Two build-owned handlers register the same RPC
  method.

### Rollback/control-flow sentinel (supplemental)

- `src/worker/handlers/level-up-preview.ts:106` —
  `LEVEL_UP_PREVIEW_ROLLBACK` deliberately aborts the synchronous preview after
  the before/after result is captured; D278's transaction-outcome helper is its
  replacement, not a shared refusal arm.

## Prospective shared-union additions

No bare site in this inventory fits `attunement_slots_full`,
`character_archived`, `level_up_refused`, or `species_lineage_refused`.
The two builder revision guards use the existing `revision_conflict` arm. The
remaining expected refusals require only these new arms:

- `reference_retarget_refused` — a valid referenced source cannot be preserved
  by retargeting; closed `reason` includes `source_not_preservable`.
- `guided_step_refused` — a well-formed guided-step mutation is incompatible
  with the character's current step state; closed `reason` includes
  `step_already_complete`.
- `spell_selection_refused` — a valid selection is locked, ineligible, or
  duplicates an active spell; its closed reason payload replaces caller-owned
  prose.

These names classify the domain outcomes only. Exact arm fields must be ported
from the live consumers when the owning migration lane implements them, per the
D278 foundation plan's field-for-field and decoder requirements.
