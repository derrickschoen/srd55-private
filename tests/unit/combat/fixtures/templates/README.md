# Independent geometry derivations

These expected cell tables were worked out from the continuous shapes before
running the implementation. Coordinates are feet, and cell `(c, r)` is the
closed square `[5c, 5(c+1)] × [5r, 5(r+1)]`. Consequently, a shared boundary
or one-point tangency is included by the D315.3 product rule.

- Cone: origin `(0,5)`, length `10`, direction east gives the triangle
  `(0,5)–(10,0)–(10,10)`. Its base touches column 2 and its lower base corner
  touches `(1,2)` and `(2,2)`; `(0,2)` cannot reach the triangle.
- Cube: center `(5,5)` and side `10` gives `[0,10] × [0,10]`. The closed top
  and right faces touch row/column 2, while row/column 3 remains separated.
- Cylinder, Emanation, Sphere: center `(5,5)` and radius `5` has minimum
  distance exactly `5` to `(2,0)`, `(2,1)`, `(0,2)`, and `(1,2)`. Cell `(2,2)`
  starts at `(10,10)`, whose distance is `5√2`, so it is outside.
- Line: east from `(0,5)`, length `10`, width `5` is
  `[0,10] × [2.5,7.5]`. Its end face touches column 2; row 2 starts at `y=10`
  and is outside.
- Total Cover: each wall fixture uses every row of column 1 as opaque blocked
  squares. Every straight segment from the origin to column 2 or beyond crosses
  that closed wall, while the listed column-0 squares are reached before it.

Each `large-partial` creature has one occupied square in the pinned set and is
therefore affected. Each `large-outside` creature has none.
