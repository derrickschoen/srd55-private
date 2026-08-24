# E05B experiment summary

Pre-registration: `51c5e44417de8e0a1cfff2cf702c65062460efae4895cb2314a8a33df561aa43`

Stopping reason: preregistered_table_ceiling_reached

| Arm | Tables | Completed | Aborted | Completion | Wall median (IQR) ms | Wall / completed round ms | Latency median (IQR) ms | Correction rate | First-pass validity | Mean correction rounds / decision | Input / cached / output / reasoning tokens | Bytes sent | Reconstruction failures |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| typed-js | 60 | 18 | 42 | 30.0% | 46137.5 (32878.0) | 27346.9 | 11571.0 (2138.8) | 2.63% | 97.37% | 0.026 | 7878117 / 6315008 / 74613 / 0 | 4965151 | 0 |
| untyped-js | 60 | 22 | 38 | 36.7% | 46240.0 (34549.3) | 24025.6 | 10998.5 (1654.3) | 4.24% | 95.76% | 0.042 | 9046195 / 7330816 / 78133 / 0 | 5515464 | 0 |

## Type-check instrumentation

Typed checked / passed / failed programs: 760 / 760 / 0
Untyped checked / passed / failed programs: n/a

## Type-check unique catches

Typed rejected programs: 0
Caught only by type check: 0
Unique catch rate: n/a
