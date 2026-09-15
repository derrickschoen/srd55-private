**B17-F1 and B17-F2 are closed. No regression found in the fix.**

## Scope and preservation

I ran:

```text
git rev-parse HEAD
git diff --stat 9761d22f 6f650d7a
git diff 9761d22f 6f650d7a
git diff --check
git diff --check 9761d22f 6f650d7a
git status --short
```

Confirmed HEAD **6f650d7a37c7ecbaf6839d187ac6c4915d4b5d15**. Only `tests/unit/vtt/legendary-windows.test.ts` changed: **86 additions / 19 deletions**. Both whitespace checks exited **0**; worktree clean.

My AST comparison found:

- All **four unaffected tests**, including their **11 assertions**, are byte-identical.
- Whole-file `expect(` count: **13 → 21**.
- The other four B17 files are byte-identical to `9761d22f`.
- Maximum added-line length: **112**; **zero** lines over 120.
- No multiple-statement formatting issue or residual canonical/obsolete environment reference found.

## F1: geometry and adversarial coverage

At [legendary-windows.test.ts:165](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/legendary-windows.test.ts:165), the Large unicorn occupies `(2,1), (3,1), (2,2), (3,2)`.

| Enemy | Position | Nearest occupied-cell separation | Controlled |
|---|---|---:|---:|
| alpha | `(1,1)` | **5** | **10** |
| beta | `(5,1)` | **10** | **5** |
| gamma | `(2,4)` | **10** | **10** |

The hand-authored expectations are correct. Both `[alpha,beta,gamma]` and `[gamma,beta,alpha]` orders are exercised. Encounter creation and initiative processing preserve combatant-array order. Both real-consumer results assert **beta controlled / alpha canonical**.

### Mutants I ran

Command: `node --input-type=module`, with the stdin harness using:

```js
startVitest('test', ['tests/unit/vtt/legendary-windows.test.ts'], {
  run: true,
  configLoader: 'runner',
  pool: 'threads',
  maxWorkers: 1,
  testNamePattern: title,
}, { plugins: [/* enforce:'pre' in-memory source transform */] })
```

Each transform applied exactly once. No file was edited.

Against `uses the supplied distance policy to select the nearest legendary-action enemy`:

| Mutation at production `legendary-windows.ts:208–209` | My result |
|---|---|
| Left query → canonical query — r1 survivor | **Killed:** expected beta, received alpha |
| Right operand → `15` — r1 survivor | **Killed:** expected beta, received gamma |
| Left operand → `15` | **Killed:** expected beta, received alpha |
| Right query → canonical query | **Killed:** expected beta, received alpha |
| Both queries → canonical queries | **Killed:** expected beta, received alpha |
| Comparator → ID tie-breaker only | **Killed:** expected beta, received alpha |
| **New:** swap subtraction operands | **Killed:** expected beta, received alpha |
| **New:** each distance → `Math.min(supplied, canonical)` | **Killed:** expected beta, received alpha |
| **New:** remove both `?? Number.POSITIVE_INFINITY` expressions | **Survived** |

Each killed mutant produced **1 failed / 5 skipped**, exit **1**, at test line **208**. IDs above abbreviate `combatant:legendary-distance-{alpha,beta,gamma}`.

The null-coalesce mutant produced **1 passed / 5 skipped**, exit **0**. This is non-blocking: these fixtures supply non-null distances, so removing null handling does not change their behavior. It neither bypasses the supplied port nor establishes null-distance coverage.

## F2: shared-port witness

[legendary-windows.test.ts:214](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/legendary-windows.test.ts:214) now passes the **same `controlledQueries` object and `pending` state** to both consumers. `full()` forwards that object unchanged to `provideLegendaryWindows`.

The shared geometry gives canonical distances **5/25**, versus controlled **30/5**. Assertions independently specify both target selection and adjacency, including canonical contrasts.

Against `forwards one supplied distance policy to legendary and speculative consumers`, I reproduced:

| Mutation | My failure |
|---|---|
| Legendary full canonical bypass | At **:257**, expected `combatant:shared-distance-controlled`; received `combatant:shared-distance-canonical` |
| Speculative `:135` canonical bypass | At **:248**, expected `{matches:true, actual:true}`; received `{matches:false, actual:false, failure:"FACT_FALSE"}` |

Both: **1 failed / 5 skipped**, exit **1**.

Production hashes printed before and after every applicable run remained identical:

```text
legendary:
3047630f4ada93ae566f1ec16b45ba2d1f280ce4e227d7b8ca3aeceadddef172
speculative:
d4887b9b9fb578a5d2b38fdee56dbda67032894981122ca47b062058ff5972f1
```

## Gates I ran

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
node scripts/check-command-outcomes.mjs
```

All exited **0**. Both compilers: **zero diagnostics**. Architecture: **39 active fixtures passed; 1,621 TypeScript files checked**.

Suite command:

```bash
node node_modules/vitest/vitest.mjs run --configLoader runner --pool threads --reporter=json tests/unit/vtt/legendary-windows.test.ts tests/unit/vtt/projected-movement-options.test.ts tests/unit/vtt/blind-intent-resolver.test.ts tests/unit/vtt/speculative-planning.test.ts tests/unit/vtt/offer-environment.test.ts tests/unit/vtt/offer-environment-identity.test.ts tests/unit/vtt/offer-environment-board-sequence.test.ts
```

My JSON summary reported **59 passed / 0 failed**, exit **0**:

| Suite | Passed |
|---|---:|
| legendary-windows | 6 |
| projected-movement-options | 3 |
| blind-intent-resolver | 12 |
| speculative-planning | 23 |
| offer-environment | 11 |
| offer-environment-identity | 3 |
| offer-environment-board-sequence | 1 |

The correct subtotal is **44 + 15**, not 46 + 15.

Discovery command:

```bash
node node_modules/vitest/vitest.mjs list --configLoader runner --filesOnly --json | python3 -c 'import sys,json; print(len(json.load(sys.stdin)))'
```

Output **643**, exit **0**.

**Read/reported evidence:** I read the implementer’s fix report and D617.23. Arena **59/59** and M-3 **72/72** are supervisor results supplied in your instructions, not my runs. I did not retry those suites.

ACCEPT B17
tokens used
123,237
**B17-F1 and B17-F2 are closed. No regression found in the fix.**

## Scope and preservation

I ran:

```text
git rev-parse HEAD
git diff --stat 9761d22f 6f650d7a
git diff 9761d22f 6f650d7a
git diff --check
git diff --check 9761d22f 6f650d7a
git status --short
```

Confirmed HEAD **6f650d7a37c7ecbaf6839d187ac6c4915d4b5d15**. Only `tests/unit/vtt/legendary-windows.test.ts` changed: **86 additions / 19 deletions**. Both whitespace checks exited **0**; worktree clean.

My AST comparison found:

- All **four unaffected tests**, including their **11 assertions**, are byte-identical.
- Whole-file `expect(` count: **13 → 21**.
- The other four B17 files are byte-identical to `9761d22f`.
- Maximum added-line length: **112**; **zero** lines over 120.
- No multiple-statement formatting issue or residual canonical/obsolete environment reference found.

## F1: geometry and adversarial coverage

At [legendary-windows.test.ts:165](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/legendary-windows.test.ts:165), the Large unicorn occupies `(2,1), (3,1), (2,2), (3,2)`.

| Enemy | Position | Nearest occupied-cell separation | Controlled |
|---|---|---:|---:|
| alpha | `(1,1)` | **5** | **10** |
| beta | `(5,1)` | **10** | **5** |
| gamma | `(2,4)` | **10** | **10** |

The hand-authored expectations are correct. Both `[alpha,beta,gamma]` and `[gamma,beta,alpha]` orders are exercised. Encounter creation and initiative processing preserve combatant-array order. Both real-consumer results assert **beta controlled / alpha canonical**.

### Mutants I ran

Command: `node --input-type=module`, with the stdin harness using:

```js
startVitest('test', ['tests/unit/vtt/legendary-windows.test.ts'], {
  run: true,
  configLoader: 'runner',
  pool: 'threads',
  maxWorkers: 1,
  testNamePattern: title,
}, { plugins: [/* enforce:'pre' in-memory source transform */] })
```

Each transform applied exactly once. No file was edited.

Against `uses the supplied distance policy to select the nearest legendary-action enemy`:

| Mutation at production `legendary-windows.ts:208–209` | My result |
|---|---|
| Left query → canonical query — r1 survivor | **Killed:** expected beta, received alpha |
| Right operand → `15` — r1 survivor | **Killed:** expected beta, received gamma |
| Left operand → `15` | **Killed:** expected beta, received alpha |
| Right query → canonical query | **Killed:** expected beta, received alpha |
| Both queries → canonical queries | **Killed:** expected beta, received alpha |
| Comparator → ID tie-breaker only | **Killed:** expected beta, received alpha |
| **New:** swap subtraction operands | **Killed:** expected beta, received alpha |
| **New:** each distance → `Math.min(supplied, canonical)` | **Killed:** expected beta, received alpha |
| **New:** remove both `?? Number.POSITIVE_INFINITY` expressions | **Survived** |

Each killed mutant produced **1 failed / 5 skipped**, exit **1**, at test line **208**. IDs above abbreviate `combatant:legendary-distance-{alpha,beta,gamma}`.

The null-coalesce mutant produced **1 passed / 5 skipped**, exit **0**. This is non-blocking: these fixtures supply non-null distances, so removing null handling does not change their behavior. It neither bypasses the supplied port nor establishes null-distance coverage.

## F2: shared-port witness

[legendary-windows.test.ts:214](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/legendary-windows.test.ts:214) now passes the **same `controlledQueries` object and `pending` state** to both consumers. `full()` forwards that object unchanged to `provideLegendaryWindows`.

The shared geometry gives canonical distances **5/25**, versus controlled **30/5**. Assertions independently specify both target selection and adjacency, including canonical contrasts.

Against `forwards one supplied distance policy to legendary and speculative consumers`, I reproduced:

| Mutation | My failure |
|---|---|
| Legendary full canonical bypass | At **:257**, expected `combatant:shared-distance-controlled`; received `combatant:shared-distance-canonical` |
| Speculative `:135` canonical bypass | At **:248**, expected `{matches:true, actual:true}`; received `{matches:false, actual:false, failure:"FACT_FALSE"}` |

Both: **1 failed / 5 skipped**, exit **1**.

Production hashes printed before and after every applicable run remained identical:

```text
legendary:
3047630f4ada93ae566f1ec16b45ba2d1f280ce4e227d7b8ca3aeceadddef172
speculative:
d4887b9b9fb578a5d2b38fdee56dbda67032894981122ca47b062058ff5972f1
```

## Gates I ran

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
node scripts/check-command-outcomes.mjs
```

All exited **0**. Both compilers: **zero diagnostics**. Architecture: **39 active fixtures passed; 1,621 TypeScript files checked**.

Suite command:

```bash
node node_modules/vitest/vitest.mjs run --configLoader runner --pool threads --reporter=json tests/unit/vtt/legendary-windows.test.ts tests/unit/vtt/projected-movement-options.test.ts tests/unit/vtt/blind-intent-resolver.test.ts tests/unit/vtt/speculative-planning.test.ts tests/unit/vtt/offer-environment.test.ts tests/unit/vtt/offer-environment-identity.test.ts tests/unit/vtt/offer-environment-board-sequence.test.ts
```

My JSON summary reported **59 passed / 0 failed**, exit **0**:

| Suite | Passed |
|---|---:|
| legendary-windows | 6 |
| projected-movement-options | 3 |
| blind-intent-resolver | 12 |
| speculative-planning | 23 |
| offer-environment | 11 |
| offer-environment-identity | 3 |
| offer-environment-board-sequence | 1 |

The correct subtotal is **44 + 15**, not 46 + 15.

Discovery command:

```bash
node node_modules/vitest/vitest.mjs list --configLoader runner --filesOnly --json | python3 -c 'import sys,json; print(len(json.load(sys.stdin)))'
```

Output **643**, exit **0**.

**Read/reported evidence:** I read the implementer’s fix report and D617.23. Arena **59/59** and M-3 **72/72** are supervisor results supplied in your instructions, not my runs. I did not retry those suites.

ACCEPT B17
