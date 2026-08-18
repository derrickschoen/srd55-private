# Homebrew v3 test-content cards

These cards prepare the eight adopted homebrew v3 entries for authoring. They
are implementation contracts for lightweight test content, not player-facing
rules dossiers. Each entry exists to exercise a distinct mechanic shape. All
content produced from these cards must use `visibility: 'ui_hidden'` (D299).

## Reconstruction boundary

The recoverable sources are the 2026-08-17 v3 handoff and the preserved
three-round validator. A simulator assumption is recorded as such; it does not
become rules text merely because the simulator needed a value. Every absent
trigger, duration, target rule, resource cadence, or content relationship stays
under **MISSING FACTS** until it is supplied.

D298 replaces the earlier dossier-sized scope: these are compact catalog
fixtures plus the structured effects needed to make their mechanic types
loadable and testable. They do not require complete subclass schedules,
docx-fidelity work, or polished narrative prose.

## Cards

| Entry | Intended fixture | Mechanic shape |
|---|---|---|
| [Long Grudge](long-grudge.md) | Paladin subclass feature | Bonded-target rider |
| [Anchor Point](anchor-point.md) | Feat | Damage plus movement/reaction locks |
| [Patient Volley](patient-volley.md) | Ranger feature; exact catalog kind missing | Persistent conditional rider |
| [Cutting Chorus](cutting-chorus.md) | Bard subclass feature | Self-Inspiration plus Extra Attack |
| [Ambush Primitive](ambush-primitive.md) | Ranger and Rogue subclass fixtures | First-turn primitive on two chassis |
| [Broken Tooth](broken-tooth.md) | Druid subclass feature | Wild Shape attack package |
| [Cutting Momentum](cutting-momentum.md) | Fighter feature; exact catalog kind missing | First-hit rider plus critical-range expansion |
| [Broken Tempo](broken-tempo.md) | Fighter feature; exact catalog kind missing | Bounded maneuver pool and recovery |

The Ambush Primitive is one numbered v3 entry but produces both the Vanward
Conclave and Cold Open fixtures, as required by D297.

## Shared authoring rules

- Mark every resulting catalog entry `ui_hidden`; none belongs in a browse or
  picker surface yet.
- Preserve structured mechanics as structured effects. Prose may explain an
  effect but must not be its only machine-readable representation.
- Treat the validator's weapon, attack-count, ability-modifier, hit-rate, and
  three-round choices as test chassis unless a card identifies them as a
  recovered mechanic fact.
- Do not publish stale claimed DPR as measured balance evidence. In particular,
  Cutting Chorus ships without a net-DPR claim (D298).
- Do not fill a **MISSING FACTS** section by analogy to an SRD or non-SRD option.

## Licensing

The names and descriptions in these cards are our original text. Future rules
text may use or quote only SRD 5.2.1 material under CC-BY-4.0, with the repository
attribution preserved. Non-SRD books may be named for comparison, but their text
must not be copied or paraphrased into these fixtures (D59).
