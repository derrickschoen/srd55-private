# DISPATCH HA-1 — authorable effect storage and fingerprint inventory (L, MINT, wt/attunement, PLAYWRIGHT_PORT=44482)

THE BINDING PLAN is docs/design/2026-07-30-homebrew-authoring-forms.md,
unit HA-1 in section 11 ("Dispatches and dependency order") plus every
section that unit row cites. Implement exactly HA-1. CI-3a/CI-3b implement
the projectors AGAINST your pinned contracts — you finalize the three
projector CONTRACTS and hand-pinned vectors; you do not implement the
projectors themselves.

AMENDMENTS (these WIN over the doc):
- D133: classes stay bundled-only forever in v1. If any part of the effect
  storage widening seems to require class-authoring support, that is scope
  drift — STOP and report.
- D138/D139 do not change HA-1's schema but the fingerprint inventory you
  pin must support: per-creation reference closure computation (D139 —
  a character export needs "which authored rows does this character's
  content reference"), and creation-level grouping (D138 cascade sets).
  Pin the closure vocabulary in the contracts now; implementing export
  scoping is CI-5's.

THE SUBTLE PART (get this exactly right; it is why this unit precedes
CI-3a/CI-3b): the three projector contracts (species, background, subclass)
define the CANONICAL BYTES that content identity fingerprints are computed
over. The doc requires: exact passthrough canonicalization pinned by
hand-authored vectors (byte-for-byte expected outputs written by hand from
the spec, never generated from the projector); the subclass
inherit/20-level-override union pinned; repeated-name uniqueness relaxed by
level exactly as specified. A wrong canonicalization here poisons every
fingerprint minted after content-v1 freezes — the vectors are the defense.
Each vector is a reviewed value with a comment tracing each byte-region to
the spec sentence it encodes.

MINTS YOU OWN: next free DB migration (background_template_effects table,
species effect payload/vocabulary widening, subclass uniqueness relaxation —
whatever the unit row enumerates); row contracts, relations,
snapshot/whole-database tests, direct CHECK tests included per the unit row.
Effect helpers split by value policy; authored passthrough values opened
per the doc.

EXIT: the unit row's exit criteria, plus: CI-3a/CI-3b could be implemented
by a different agent from your pinned contracts and vectors ALONE — state
in your report where the contracts live and which test pins each vector.
