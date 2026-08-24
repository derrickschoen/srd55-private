# E04 experiment summary

Pre-registration: `1355cce7034e3a492b358d9793ca65742915058c3447cf357ae42ab06331f256`

Stopping reason: preregistered_table_ceiling_reached

| Arm | Tables | Completed | Aborted | Completion | Wall median (IQR) ms | Latency median (IQR) ms | Correction rate | Input / cached / output / reasoning tokens | Bytes sent | Reconstruction failures |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| compact-lossless-decision-view | 60 | 60 | 0 | 100.0% | 74982.5 (26034.8) | 6811.0 (1381.5) | 0.24% | 22476524 / 19887360 / 95346 / 0 | 6632777 | 0 |
| full-projection-history | 60 | 60 | 0 | 100.0% | 74777.5 (24083.0) | 6703.5 (1270.5) | 0.24% | 23193631 / 20522752 / 92972 / 0 | 8114248 | 0 |
| initial-snapshot-revision-deltas | 60 | 60 | 0 | 100.0% | 73586.0 (23994.8) | 6769.0 (1519.3) | 0.47% | 23633269 / 20923392 / 95535 / 0 | 6159126 | 0 |
