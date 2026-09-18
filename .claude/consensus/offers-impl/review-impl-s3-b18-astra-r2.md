Both findings are closed under the supervisor’s clarified F2(b) ruling.

### Findings verification

**B18-F1 — closed.**  
`legendary-windows.test.ts:294` now exercises the real arena consumer using the **same typed port** as the legendary/speculative assertions, overriding only `spaceDistance`. Adjacent arena tokens establish canonical **5 → `[]`**; controlled **30 → scimitar refusal**.

**Ran:** canonical-read mutant in `arena-legality.ts`.

- **1 failed / 5 passed**, exit **1**.
- Killing test: `forwards one supplied distance policy to legendary and speculative consumers`.
- Expected `["combatant:shared-distance-arena-goblin: target is outside scimitar reach/range"]`; received `[]`.
- Production transform loaded **once**. This protection now runs in the committed green suite.

**B18-F2(a) — closed.**  
`blind-intent-resolver.test.ts:296` uses real legacy/revision-bound environments and publicly generated, policy-registered options. It asserts acceptance under that policy and `OPTION_RESOLUTION_FAILED` under legacy.

**Ran:** fresh legacy construction inside `resolveBlindRoundIntents`.

- **1 failed / 12 passed**, exit **1**.
- Killing test: `keeps blind option provenance on the supplied policy environment`.
- At **:338**, expected `"accepted"`; received `"rejected"`.

**B18-F2(b) — ruling confirmed.**  
Reading `blind-intent-resolver.ts:628–650` confirms composition passes the selected option ID to the application-bound resolver, which regenerates the option under its own environment (`intent-resolver.ts:668–680`). Builder instances share the canonical query port. `engine-server.ts:2378` forwards the original environment object.

I also reproduced the MCP different-environment substitution: the new composition test **passed**, as predicted. Its renamed title accurately describes successful real composition, without claiming to detect substituted object identity.

I do **not** require a new production provenance check. That would change the contract and require a plan amendment.

### Other verification I ran

```text
git diff 623aa639 5883b87f
git diff --check 623aa639 5883b87f
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
```

- Exactly the **three authorized test files**, **165 additions / 4 deletions**; no production change or deleted test.
- Both compilers and whitespace check: **exit 0**. The TS7006 diagnostics are gone.
- Added-line maxima: legendary **105**, blind **101**, MCP **104**; none over 120.
- No test title/comment overclaims.
- Final worktree clean.

Programmatic `startVitest` with `configLoader:'runner'`, `pool:'threads'`, `maxWorkers:3`: **six suites / 63 tests passed**—legendary, blind, three environment suites and speculative.

```text
node node_modules/vitest/vitest.mjs run tests/unit/tools/engine-mcp-server.test.ts --configLoader runner --pool threads --maxWorkers 1 -t '^(?!.*(?:discovers, lists tools|negotiates the literal)).*$'
```

**13 passed / 2 skipped**, exit **0**; the known blocked stdio tests were excluded.

Production SHA-256 values printed before/after all in-memory mutations were unchanged:

```text
arena: 0332a72a7c710b76f793d96fc13c42898d670cd4af1791b651ee43e1e80bf764
blind: 580dffd5a08daf2608821623bf420056f2e441ec98abe7af55a8dad479860fcb
MCP:   a6b42f0155804ba6dd6f545b1f0cfdeae101e0bff85caad91537aec2c9bcdc65
```

**Read, not rerun:** D617.29, both implementer reports, and the supervisor’s broader checks/M-3 results.

ACCEPT B18
tokens used
1,017,540
Both findings are closed under the supervisor’s clarified F2(b) ruling.

### Findings verification

**B18-F1 — closed.**  
`legendary-windows.test.ts:294` now exercises the real arena consumer using the **same typed port** as the legendary/speculative assertions, overriding only `spaceDistance`. Adjacent arena tokens establish canonical **5 → `[]`**; controlled **30 → scimitar refusal**.

**Ran:** canonical-read mutant in `arena-legality.ts`.

- **1 failed / 5 passed**, exit **1**.
- Killing test: `forwards one supplied distance policy to legendary and speculative consumers`.
- Expected `["combatant:shared-distance-arena-goblin: target is outside scimitar reach/range"]`; received `[]`.
- Production transform loaded **once**. This protection now runs in the committed green suite.

**B18-F2(a) — closed.**  
`blind-intent-resolver.test.ts:296` uses real legacy/revision-bound environments and publicly generated, policy-registered options. It asserts acceptance under that policy and `OPTION_RESOLUTION_FAILED` under legacy.

**Ran:** fresh legacy construction inside `resolveBlindRoundIntents`.

- **1 failed / 12 passed**, exit **1**.
- Killing test: `keeps blind option provenance on the supplied policy environment`.
- At **:338**, expected `"accepted"`; received `"rejected"`.

**B18-F2(b) — ruling confirmed.**  
Reading `blind-intent-resolver.ts:628–650` confirms composition passes the selected option ID to the application-bound resolver, which regenerates the option under its own environment (`intent-resolver.ts:668–680`). Builder instances share the canonical query port. `engine-server.ts:2378` forwards the original environment object.

I also reproduced the MCP different-environment substitution: the new composition test **passed**, as predicted. Its renamed title accurately describes successful real composition, without claiming to detect substituted object identity.

I do **not** require a new production provenance check. That would change the contract and require a plan amendment.

### Other verification I ran

```text
git diff 623aa639 5883b87f
git diff --check 623aa639 5883b87f
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
```

- Exactly the **three authorized test files**, **165 additions / 4 deletions**; no production change or deleted test.
- Both compilers and whitespace check: **exit 0**. The TS7006 diagnostics are gone.
- Added-line maxima: legendary **105**, blind **101**, MCP **104**; none over 120.
- No test title/comment overclaims.
- Final worktree clean.

Programmatic `startVitest` with `configLoader:'runner'`, `pool:'threads'`, `maxWorkers:3`: **six suites / 63 tests passed**—legendary, blind, three environment suites and speculative.

```text
node node_modules/vitest/vitest.mjs run tests/unit/tools/engine-mcp-server.test.ts --configLoader runner --pool threads --maxWorkers 1 -t '^(?!.*(?:discovers, lists tools|negotiates the literal)).*$'
```

**13 passed / 2 skipped**, exit **0**; the known blocked stdio tests were excluded.

Production SHA-256 values printed before/after all in-memory mutations were unchanged:

```text
arena: 0332a72a7c710b76f793d96fc13c42898d670cd4af1791b651ee43e1e80bf764
blind: 580dffd5a08daf2608821623bf420056f2e441ec98abe7af55a8dad479860fcb
MCP:   a6b42f0155804ba6dd6f545b1f0cfdeae101e0bff85caad91537aec2c9bcdc65
```

**Read, not rerun:** D617.29, both implementer reports, and the supervisor’s broader checks/M-3 results.

ACCEPT B18
