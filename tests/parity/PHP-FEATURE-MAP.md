# PHP feature-to-browser parity map

This is the fixed T81 manifest from `PARALLEL-PLAN.md`. The discarded Laravel
HTTP/Inertia envelope is translated to the typed Worker RPC boundary. Every
mutation also reads its stored OPFS SQLite rows through `system.inspectRows`;
read-only queries compare complete exported database images before and after.

| # | PHP oracle workflow | Static browser boundary | Persisted-state proof |
|---:|---|---|---|
| 1 | `CharacterWorkspaceTest.php` — serves seeded list/workspace | `queries.characters.list`, `queries.characters.workspace`, planner UI | character row, class rows, full image unchanged |
| 2 | complete deterministic character cards | list RPC twice | stored class rows, full image unchanged |
| 3 | complete workspace editing contract | workspace RPC | source/config rows, slots, full image unchanged |
| 4 | exact eligible DTO; literal `%`/`_` | `queries.eligibleSpells.search` | exact active spell-version row, full image unchanged |
| 5 | complete restorable character state/diff surface | `backup.exportCharacter` plus one command | exported tables equal all five snapshot tables; audit stores exact before/new diff |
| 6 | create/open empty character | create/workspace RPC and reload | character row survives reload; no slots |
| 7 | one-slot isolation | `commands.execute(set_slot/select)` | target row changes; every other slot row is byte-equal |
| 8 | undo selection | select plus signed restore inverse | original slot value, revision 2, two operation rows |
| 9 | clear/override/reselect | four command RPCs and reload | exact five-field slot states and revision 4 |
| 10 | named save-point round trip | save-point/query/restore RPCs | save-point snapshot row and restored character row survive reload |
| 11 | ability-dependent casting math | ability command plus workspace RPC | only character ability/revision changes; slot rows remain byte-equal |
| 12 | mutation/inverse/operation/audit envelope | command RPC | exact character, operation, inverse JSON, audit/reason/reversible rows |
| 13 | class level adds slots without disturbance | `update_class` RPC | old slots byte-equal; new class/source/slot rows persisted |
| 14 | undo structural class change | signed snapshot inverse RPC | class/source/slot tables exactly restored; revision advances |
| 15 | stale revision and idempotent replay | command RPC conflict/replay | one operation row and one committed character revision |
| 16 | rules round trip and disabled legacy rejection | rules/inverse/select RPCs | stored toggle, revision, unchanged rejected slot, two operations |
| 17 | nested source config round trip | `update_source_config` RPC | child/parent configs, three constraints, one audit group, exact inverse restore |
| 18 | standalone Magic Initiate update | source-config RPC | stored display/config and three regenerated list constraints |
| 19 | atomic class-source/DSL/spellbook addition | `add_source` RPC | class/source/six slots; failed Wizard leaves no residue; spellbook row; inverse empties state |
| 20 | nested species/background and repeatability | `add_source` RPC | two roots, two children, three slots per child, rejected duplicate leaves revision 2 |
| 21 | recursive root removal | `remove_source` plus inverse | root/child tombstones, orphan slots, then exact row restoration |
| 22 | warning acknowledgement/replay/audit | report plus acknowledgement RPC | acknowledgement row, one operation/audit group, delete inverse, revision 3 |
| 23 | stale disjoint-slot merge only | three concurrent-version command RPCs | two slot values, two operations, revision 2; touched-slot write rejected |
| 24 | golden build report | report RPC and report UI | invalid/orphan/override rows; complete image unchanged |
| 25 | Mutt printable facts/relevant number | printable RPC and print UI | fixed/free-cast slot row; complete image unchanged |
| 26 | real-index import semantics | `catalog.import` with multi-document representative index | shared identity, editions, publications, pivots, stable IDs, reload |
| 27 | both backup formats/rollback/reload | four `backup.*` RPCs | whole-image restore, portable clone tables, corrupt-version no-write, reload |
| 28 | fresh-profile import → create/use → export → reload | catalog/query/command/backup RPC journey | catalog, character, selected slot, both exports, reload, portable clone |

The representative browser catalog in workflow 26 preserves the PHP oracle's
merge/idempotency contract without copying the licensed Laravel data directory:
two editions share one identity, duplicate modern records merge publications and
normalized pivots, and the second import retains stable stored IDs.
