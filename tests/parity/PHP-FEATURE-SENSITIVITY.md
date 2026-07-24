# PHP feature browser sensitivity evidence

All 28 workflows are connected to production-owner red → restore → green
evidence. The cited progress shards record isolated production reversions and
the intended persisted assertion failures. T81 adds two direct browser-boundary
bypass checks below; no production file was changed by T81.

| Workflows | Owner-run production sensitivity evidence |
|---|---|
| 1–3 | `progress/Q60.md` transitions 1–2 (list warnings/workspace projection) and `progress/U71.md` transition 4 (persisted planner undo) |
| 4 | `progress/Q60.md` transition 8 and `progress/E10.md` substring-search transition |
| 5 | `progress/C43.md` transition 4 (snapshot restore) and `progress/B20.md` transitions 2–4 (complete portable state/remapping) |
| 6 | `progress/Q60.md` transition 3 and `progress/U70.md` transition 1 |
| 7–9 | `progress/C41.md` transitions 2, 4, and 5 (select/clear/restore persisted states) |
| 10 | `progress/Q60.md` transitions 4 and 9 plus `progress/C43.md` transition 4 |
| 11 | `progress/C41.md` transition 1 and `progress/Q60.md` workspace casting projection |
| 12 | `progress/X50.md` transitions 2–4 (revision/group/transaction rows) |
| 13–14 | `progress/C43.md` transitions 2–4 (class generation, rollback, snapshot restore) |
| 15 | `progress/X50.md` transitions 5 and 7 (replay flag and touched-slot stale guard) |
| 16 | `progress/C42.md` transition 1 and `progress/C41.md` transition 5 |
| 17–18 | `progress/C42.md` transition 2 and `progress/G20.md` transition 2 |
| 19 | `progress/C42.md` transition 4 and `progress/G20.md` transitions 10–12 |
| 20 | `progress/C42.md` transition 5 and `progress/G20.md` transitions 7 and 9 |
| 21 | `progress/C42.md` transition 6 and `progress/G20.md` transition 8 |
| 22 | `progress/C43.md` transition 1 and `progress/X50.md` transition 3 |
| 23 | `progress/X50.md` transition 7 |
| 24 | `progress/R40.md` transitions 1–2; exact invalid rows and active acknowledgement failed, then restored |
| 25 | `progress/P50.md` transitions 1–5; ordering, long-rest, ritual, text status, and reference text all failed, then restored |
| 26 | `progress/C20.md` transitions 2 and 5; pivot persistence and atomic import residue failed, then restored |
| 27 | `progress/B20.md` transitions 1, 3, 5, and 6; version guards, clone rows, image restore, and Worker import failed, then restored |
| 28 | Combined `progress/C20.md` 2, `Q60.md` 3/8, `C41.md` 2, and `B20.md` 3/5/6 cover each durable journey stage |

## T81 direct browser transitions

1. Green workflow 7 → bypassed its `commands.execute` call in the owned helper →
   the intended stored-slot assertion failed (`current_spell_version_id` 1
   instead of replacement 8) → restored → filtered Chromium passed 1/1.
2. Green workflow 24 → routed the owned test to workspace instead of the report
   RPC → the exact golden `report.character` assertion failed (`undefined`) →
   restored. The final complete Chromium run verifies the restored path.

The transitions leave no bypass or mutation in the working tree.
