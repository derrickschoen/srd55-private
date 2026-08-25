# The Vane Warren — structural difficulty record

The Vane Warren is one original stronghold containing three **separate** leader
fight manifests. Their rosters are never concatenated. The figures below are
structural action-economy judgments for a five-PC party, not simulation results
and not encounter-building XP claims.

## Action-economy ruler

One listed enemy contributes one ordinary turn opportunity. A listed Legendary
Action use contributes one additional between-turn opportunity because the SRD
places one Legendary Action immediately after another creature's turn and gives
the monster a limited pool that refreshes at the start of its turn
(`docs/srd/full/srd-5.2.1.txt:16703-16716`). Delayed waves and conditional
joiners count only in the fight that can activate them. The denominator is the
five PCs' five ordinary turn opportunities.

| Separate fight | Counted hostile opportunities | Computation | Recorded ratio | Structural purpose |
|---|---:|---:|---:|---|
| The Cinder Rite | 4 | Ashmaw + one standing drummer + one first-beat minion + one second-beat warrior | 4 / 5 = **0.8x** | Brute-priest pressure plus two subsequent-round alarm waves; the alarm and both wave classes remain intact. |
| The Iron Voice | 2 | Marshal Kett's ordinary turn + 1 Legendary Action use | 2 / 5 = **0.4x** | A coherent solo warlord with its between-turn decision and Legendary Resistance intact. |
| The Last Muster | 2 | Commander Sablehook + one leader-Bloodied conditional Goblin Warrior | 2 / 5 = **0.4x** | A command fight whose reserve still enters only when its leader is Bloodied. |

These numbers deliberately measure maximum listed pressure, not simultaneous
round-one bodies: Cinder adds arrive only after the war drum is used, and Last
Muster reserves are absent until their typed condition is satisfied.

These are the unchanged post-D382 rosters remeasured for D385's fifth PC; every
ratio drops, and no encounter was tuned upward. The pre-D382 record was 3.5x, 2.0x, and
1.5x respectively. Adds were trimmed before leaders: Cinder retains Ashmaw and
both one-member alarm waves; Iron Voice retains Marshal Kett (58 HP, one attack
per action, one Legendary Action) while removing the four retainers; Last Muster
retains Commander Sablehook and a one-warrior Bloodied reserve. The fixed-seed
evidence and the full before/after compositions are recorded in
`docs/design/2026-08-25-survival-analysis.md`.

## Terrain and object vocabulary

Every map is flat. It contains no elevation, falling, fake chasm, or substitute
verticality rule. The playable setup contains:

- a typed `war_drum` object in The Cinder Rite, with two fight-local delayed waves;
- a typed `brazier` fire-source object;
- a typed `oil_cask` object whose break transition creates a Grease-material area;
- pre-placed Grease- and Web-material persistent areas;
- rubble difficult terrain;
- a dim-light region and a lightly obscured smoke region;
- a flat ember-bed movement hazard positioned for forced-movement plays.

The bundled encounter explicitly enables the named `flammable_grease` optional
rule. This is a disclosed SRD deviation: SRD Grease is nonflammable and creates
Difficult Terrain (`docs/srd/full/srd-5.2.1.txt:8631-8646`). Its ignition and
burn clock reuse Web's SRD rule: a fire-exposed 5-foot cube burns away in one
round and deals 2d4 Fire damage at a creature's start of turn
(`docs/srd/full/srd-5.2.1.txt:11128-11165`). The ember-bed and object-triggered
ignition are original encounter mechanisms using landed public engine types.
Shove supplies a public forced-movement opportunity (5-foot push or Prone on a
failed save; `docs/srd/full/srd-5.2.1.txt:12284-12288`).

## Public rules and content anchors

| Bundle use | SRD 5.2.1 evidence |
|---|---|
| Goblin Minion, Goblin Warrior, and Goblin Boss bases | `docs/srd/full/srd-5.2.1.txt:18957-19018` |
| Hobgoblin Warrior and Hobgoblin Captain bases | `docs/srd/full/srd-5.2.1.txt:19540-19611` |
| Bugbear Warrior and its grappling/dragging kit | `docs/srd/full/srd-5.2.1.txt:17728-17761` |
| Priest action and Healing Word support vocabulary | `docs/srd/full/srd-5.2.1.txt:20704-20766`; Healing Word is defined at `docs/srd/full/srd-5.2.1.txt:8757-8768` |
| Ashmaw's Command reference | Spell heading/range at `docs/srd/full/srd-5.2.1.txt:7163-7169`; save and five commands at `docs/srd/full/srd-5.2.1.txt:7105-7123` |
| Ashmaw's Hold Person reference | `docs/srd/full/srd-5.2.1.txt:8874-8893` |
| Legendary timing, one-at-a-time window, and refresh | `docs/srd/full/srd-5.2.1.txt:16703-16716` |
| Legendary Resistance and a three-use complete exemplar | `docs/srd/full/srd-5.2.1.txt:21966-22009` |
| Web terrain, light obscurement, restraint, flammability, burn clock, and 2d4 Fire damage | `docs/srd/full/srd-5.2.1.txt:11128-11165` |
| Grease ground area, Difficult Terrain, and Prone saves | `docs/srd/full/srd-5.2.1.txt:8631-8646` |

Ashmaw and Marshal Kett are original public-repository statblocks. Their
provenance records the SRD entries above as balance/mechanics comparables; it
does not claim that the original names or combined kits appear in the SRD.
