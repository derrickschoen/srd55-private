# Cold Open measured delta

**Date:** 2026-08-17

**Status:** Measured evidence for D297(1)

## Result

Cold Open's Ambush Primitive contributes the following first-round marginal
damage on the Rogue chassis. These are measurements of the primitive only, not
the Rogue's weapon or Sneak Attack damage.

| Level | Original claim | Measured nova | Delta from claim | 95% CI half-width |
|---:|---:|---:|---:|---:|
| 5 | 3.800 | 3.722 | -0.078 | ±0.031 |
| 11 | 7.600 | 7.453 | -0.148 | ±0.050 |
| 17 | 11.800 | 11.128 | -0.672 | ±0.069 |

The existing board rounds values and confidence intervals to one decimal, so
the same result appears there as:

```text
Cold Open — round-1 nova  3.8→3.7 (-0.1, ±0.0)  7.6→7.5 (-0.1, ±0.1)  11.8→11.1 (-0.7, ±0.1)
```

Because the primitive can trigger only in round one, its measured contribution
amortized across the complete three-round protocol is 1.241 ±0.010 DPR at
level 5, 2.484 ±0.017 DPR at level 11, and 3.709 ±0.023 DPR at level 17.
Those averages are the nova measurements and CI half-widths divided by three;
they are not comparisons with the first-round claims.

## Protocol

The run used the unchanged validation harness in `tools/sim`:

- command: `npx vite-node run.ts 20000`;
- 20,000 trials per cell and the homebrew board's default base seed, `82026`;
- three combat rounds at levels 5, 11, and 17;
- each raw d20 draw maps 8-19 to a normal hit (60%), 20 to a critical hit
  (5%), and 1-7 to a miss (35%);
- the first light-weapon attack has advantage from Steady Aim; the second has
  advantage when the first attack hit and supplied Vex;
- the primitive applies once, to the first eligible hit in round one, for
  1d6/2d6/3d6 at levels 5/11/17, with its dice doubled on a critical hit; and
- the reported interval is the harness's 95% confidence-interval half-width,
  `1.96 * population standard deviation / sqrt(trials)`.

The fixed 60%/5%/35% distribution describes each raw d20. Steady Aim and Vex
intentionally alter the Rogue chassis's resolved hit and critical
probabilities by taking the higher of two such draws.

## Control reproduction

Vanward Conclave was the control because its 2026-08-12 captured board rows
provide both three-round-average and first-round-nova measurements under the
same primitive. The rerun reproduced every displayed control number exactly:

| Metric | Level 5 | Level 11 | Level 17 |
|---|---:|---:|---:|
| Three-round average, recorded and rerun | 1.4 ±0.0 | 2.8 ±0.0 | 4.3 ±0.0 |
| Round-one nova, recorded and rerun | 4.2 ±0.0 | 8.5 ±0.1 | 12.8 ±0.1 |

Before board rounding, the rerun's Vanward averages were 1.424 ±0.014,
2.838 ±0.023, and 4.257 ±0.033. Its nova values were 4.234 ±0.041,
8.536 ±0.069, and 12.768 ±0.097.

## Recorded-board comparison

There is no divergence from the 2026-08-12 recorded board at its one-decimal
display precision: both Vanward control rows and all three Cold Open cells
match exactly. The missing artifact was durable documentation of Cold Open's
result, not a failure to execute or preserve the simulation model.
