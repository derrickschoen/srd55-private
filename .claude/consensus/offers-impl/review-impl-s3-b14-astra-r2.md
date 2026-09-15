No findings.

**Ran — scope and formatting**

- `git diff 198d223f e5e5c70c`: only `tests/unit/vtt/offer-environment.test.ts`, **29 additions**, one new test; existing content unchanged.
- Tests **16 → 17**; `expect(` expressions **47 → 48**.
- `git diff --check 198d223f e5e5c70c`: **exit 0**.
- Maximum added-line length **99**; **0** over 120.
- Final `git status --short`: empty.

**Read — construction timing**

The new test at `offer-environment.test.ts:386` wraps **only `createEngineMcpApplication(...)`** in the exact-message assertion.

`capsuleWithEnvironment` preserves the capsule data, advances its revision, and supplies the legacy environment’s binding. The supplied application environment remains represented.

The dedicated launch guard is at `engine-server.ts:1492`. With it disabled, construction reaches the internal `feed.current()` at **3553**, which throws the **other** message through `checkedCapsule`. Thus the assertion distinguishes the launch guard from the downstream guard—even though both can throw during construction.

**Ran — isolated baseline and in-memory mutant**

Used `node --input-type=module` with:

```js
startVitest('test', ['tests/unit/vtt/offer-environment.test.ts'], {
  run: true, configLoader: 'runner', pool: 'threads', maxWorkers: 1,
  testNamePattern: 'LAUNCH_CAPSULE_DIGEST_MISMATCH_REFUSED_AT_CONSTRUCTION',
}, /* in-memory transform plugin */)
```

- Baseline: **1 passed, 16 skipped; exit 0**.
- Launch condition replaced with `if (false)`: **1 failed, 16 skipped; exit 1**.
- Exact failure:
  - Expected: `Engine MCP application offer environment does not match its launch capsule.`
  - Received: `Engine MCP application offer environment changed during the selected run.`

An initial over-specific name filter skipped all tests; those runs provide no verification credit.

Printed actual fixture digests:

```text
supplied: 0fd2d8c790331e2e4bc6a622dda69569607b3d7d5d8b3487e26f8d59aa311074
capsule:  fb1c39f00b4caeea7c5ad92af428132e1f3cb6c44a61a59ba6551d22c90c275b
```

They genuinely differ. Production SHA-256 **before and after**:

```text
c40292df285a44c0dc977d4b605a5c98eb6b6625e04672f8c2b5b6367dc45544
```

No files were edited. The fix closes the previously unproven launch-guard coverage without changing my other B14 conclusions. Broader compiler/suite results remain supervisor evidence; I did not rerun them this round.

ACCEPT B14 FIX
tokens used
815,133
No findings.

**Ran — scope and formatting**

- `git diff 198d223f e5e5c70c`: only `tests/unit/vtt/offer-environment.test.ts`, **29 additions**, one new test; existing content unchanged.
- Tests **16 → 17**; `expect(` expressions **47 → 48**.
- `git diff --check 198d223f e5e5c70c`: **exit 0**.
- Maximum added-line length **99**; **0** over 120.
- Final `git status --short`: empty.

**Read — construction timing**

The new test at `offer-environment.test.ts:386` wraps **only `createEngineMcpApplication(...)`** in the exact-message assertion.

`capsuleWithEnvironment` preserves the capsule data, advances its revision, and supplies the legacy environment’s binding. The supplied application environment remains represented.

The dedicated launch guard is at `engine-server.ts:1492`. With it disabled, construction reaches the internal `feed.current()` at **3553**, which throws the **other** message through `checkedCapsule`. Thus the assertion distinguishes the launch guard from the downstream guard—even though both can throw during construction.

**Ran — isolated baseline and in-memory mutant**

Used `node --input-type=module` with:

```js
startVitest('test', ['tests/unit/vtt/offer-environment.test.ts'], {
  run: true, configLoader: 'runner', pool: 'threads', maxWorkers: 1,
  testNamePattern: 'LAUNCH_CAPSULE_DIGEST_MISMATCH_REFUSED_AT_CONSTRUCTION',
}, /* in-memory transform plugin */)
```

- Baseline: **1 passed, 16 skipped; exit 0**.
- Launch condition replaced with `if (false)`: **1 failed, 16 skipped; exit 1**.
- Exact failure:
  - Expected: `Engine MCP application offer environment does not match its launch capsule.`
  - Received: `Engine MCP application offer environment changed during the selected run.`

An initial over-specific name filter skipped all tests; those runs provide no verification credit.

Printed actual fixture digests:

```text
supplied: 0fd2d8c790331e2e4bc6a622dda69569607b3d7d5d8b3487e26f8d59aa311074
capsule:  fb1c39f00b4caeea7c5ad92af428132e1f3cb6c44a61a59ba6551d22c90c275b
```

They genuinely differ. Production SHA-256 **before and after**:

```text
c40292df285a44c0dc977d4b605a5c98eb6b6625e04672f8c2b5b6367dc45544
```

No files were edited. The fix closes the previously unproven launch-guard coverage without changing my other B14 conclusions. Broader compiler/suite results remain supervisor evidence; I did not rerun them this round.

ACCEPT B14 FIX
