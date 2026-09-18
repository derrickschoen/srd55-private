73,973
**ACCEPT — 0 P1 / 0 P2 / 0 P3.** Both previous findings are resolved.

- **Matrix:** Active memory now precedes the unknown/no-cue fallback. Perception still wins; placement-pending contributes nothing; dead exclusion, dying retention, and expiry remain unchanged.
- **Reducer witness:** The test genuinely executes `world_operation/set_obscurement` with heavy obscurement, then `apply_effect/temporary_banishment`. The latter removes the token; observation reconciliation prunes history while retaining active memory. Explicit assertions establish those intermediate facts. The pre-fix producer would fail the final pursuit assertion for the intended reason.
- **Ordering:** One indication per target makes the removed tie-breakers unreachable. The consumer selects `indications[0]`; target ordering remains identical.
- **Regression check:** Memory fields remain carried by reference. The new expectations test preservation of reducer-owned input, rather than deriving expected branches from projection output. No additional regression found.

Reviewed `6ceaea6c` only and traced supporting code. No writes or repeated test runs.

BLIND-01 REVIEW B1 FIX R1 DONE
