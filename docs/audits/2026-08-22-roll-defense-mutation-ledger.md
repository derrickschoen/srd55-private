# CAP-IMP-013 roll and defense mutation ledger

SRD 5.2.1 anchors:

- Bane — `docs/srd/source/spell-descriptions.txt:670-681`.
- Bless — `docs/srd/source/spell-descriptions.txt:824-837`.
- Guidance — `docs/srd/source/spell-descriptions.txt:4000-4009`.
- Resistance — `docs/srd/source/spell-descriptions.txt:6540-6552`; this is
  chosen-type damage reduction in SRD 5.2.1, not the older saving-throw bonus.
- Advantage combination — `docs/srd/full/srd-5.2.1.txt:493-512`; Faerie Fire's
  attack-against-a-specific-target scope —
  `docs/srd/source/spell-descriptions.txt:2887-2900`.
- Barkskin floor — `docs/srd/source/spell-descriptions.txt:706-724`; Shield AC
  bonus — `docs/srd/source/spell-descriptions.txt:6937-6954`.
- Protection from Energy —
  `docs/srd/source/spell-descriptions.txt:6322-6335`; resistance,
  vulnerability, no-stacking, and order —
  `docs/srd/full/srd-5.2.1.txt:1044-1072`.
- Targeted attacker-source basis (Protection from Evil and Good) —
  `docs/srd/source/spell-descriptions.txt:6337-6362`.

Every production mutation below was applied alone, killed by its named
imported-content-pack test, and restored before the next mutation. Every
focused mutant command exited 1.

| Mutation | Temporary production change | Named killing test | Mutant result |
|---|---|---|---|
| `advantage_stacks` | Advantage rolled a third d20. | `advantage_sources: duplicate sources stay at two dice, one disadvantage cancels them, and Faerie-Fire scope does not affect another target` | exit 1 |
| `advantage_disadvantage_no_cancel` | A roll with both modes retained Advantage. | `advantage_sources: duplicate sources stay at two dice, one disadvantage cancels them, and Faerie-Fire scope does not affect another target` | exit 1 |
| `resistance_skips_region_damage` | Movement-region damage called raw damage resolution instead of the centralized target-response path. | `resistance_vulnerability_region: resistance halves odd and even movement-region damage while vulnerability remains observably different` | exit 1 |
| `ac_floor_stacks_with_bonus` | Effective AC added the floor to base AC and bonuses. | `ac_floor_bonus_boundary: exact AC hits, one below misses, and a Barkskin floor does not add to a Shield-style bonus` | exit 1 |
| `targeted_modifier_applies_to_all` | A selected-attacker AC bonus ignored attacker identity. | `targeted_modifier_scope: a selected-attacker AC defense blocks that attacker but not a non-targeted source, unlike a blanket bonus` | exit 1 |
| `exact_ac_misses` | Attack classification required total to exceed AC. | `ac_floor_bonus_boundary: exact AC hits, one below misses, and a Barkskin floor does not add to a Shield-style bonus` | exit 1 |
| `bonus_die_low_face_skipped` | A rolled modifier face of 1 was raised to 2. | `roll_dice_faces_and_order: Bless/Bane use the lowest and highest faces in stable pre-d20 order, while Guidance is skill-selected` | exit 1 |
| `bonus_die_high_face_skipped` | A rolled modifier face of 4 was lowered to 3. | `roll_dice_faces_and_order: Bless/Bane use the lowest and highest faces in stable pre-d20 order, while Guidance is skill-selected` | exit 1 |
| `resistance_rounds_up_odd` | Resistance used ceiling division; the even case remained pinned at 3. | `resistance_vulnerability_region: resistance halves odd and even movement-region damage while vulnerability remains observably different` | exit 1 |
| `modifier_final_round_dropped` | A two-round modifier was created with one remaining round. | `modifier_duration_first_and_final_round: a two-round AC bonus protects the first and final rounds, then expires` | exit 1 |
| `modifier_expires_one_round_late` | A two-round modifier was created with three remaining rounds. | `modifier_duration_first_and_final_round: a two-round AC bonus protects the first and final rounds, then expires` | exit 1 |

Distinguishing-input audit:

- general Advantage and Advantage against one affected creature were added in
  this increment and are tested against a non-affected creature;
- AC floor and AC bonus were added with different results and their combined
  non-additive interaction is pinned;
- Resistance and Vulnerability on the same Fire input produce 2 and 10 from 5;
- selected-attacker and blanket AC bonuses are tested against an outsider.

Reused mechanisms: the step-5 `ConditionLifecycleDuration` vocabulary and its
turn-boundary/concentration materialization, the existing encounter effect
store, the existing seeded encounter RNG, the existing roll-mode combiner, and
the step-1/step-3 centralized damage and movement-region paths.

Guidance's skill, Resistance's damage type, and Protection from Energy's
damage type use a typed `chosen_when_cast` alternative whose allowed options
are declared by the imported pack and checked when the cast is executed.

All mutations were restored. The restored focused suite reported
`Test Files  1 passed (1)` and `Tests  7 passed (7)` before the final gates.
