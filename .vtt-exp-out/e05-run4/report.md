# E05 experiment summary

Pre-registration: `b9ea94ed37022371ac2737dd212a97662e74a0691209d8df96a67a24f7678158`

Stopping reason: preregistered_table_ceiling_reached

| Arm | Tables | Completed | Aborted | Completion | Wall median (IQR) ms | Wall / completed round ms | Latency median (IQR) ms | Correction rate | First-pass validity | Mean correction rounds / decision | Input / cached / output / reasoning tokens | Bytes sent | Reconstruction failures |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| typed-js | 60 | 60 | 0 | 100.0% | 66081.0 (24686.5) | 13543.7 | 7606.0 (3310.0) | 8.33% | 91.67% | 0.083 | 17777681 / 15237888 / 92441 / 0 | 8082183 | 0 |
| untyped-js | 60 | 59 | 1 | 98.3% | 62222.0 (24366.8) | 13489.2 | 8185.0 (4035.5) | 10.85% | 89.15% | 0.108 | 16961079 / 14360832 / 98627 / 0 | 8099289 | 0 |

## Type-check unique catches

Typed rejected programs: 0
Caught only by type check: 0
Unique catch rate: n/a
