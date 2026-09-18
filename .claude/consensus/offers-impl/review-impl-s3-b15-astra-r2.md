**B15-F1 is closed.**

### Verification I ran

Using `node --input-type=module` with `ts.sys.readFile` overlays and the actual production checker:

| Case | Result |
|---|---|
| Clean production tree | **Exit 0**, 1,622 TypeScript files checked |
| Exact r1 typed-spread mutant | **Exit 1**, two diagnostics at `blind-intent-resolver.ts:708`: forbidden object literal and port spread |
| `Object.assign({}, offerEnvironment.queries)` | **Exit 1**, “Object.assign cannot construct an EngineQueryPort” |
| Port-returning object literal in `tools/ai-dm-conversation.ts` | **Exit 1**, forbidden literal and spread at virtual line **7634** |

**Three mutants rejected; zero survivors.**

```text
node scripts/check-offer-environment-architecture.mjs --self-test
```

**Exit 0; 77 fixtures passed**, with:

```text
literal-and-clones=8, spread=1, test-double=0
```

The clean production scan includes the existing typed doubles in `legendary-windows.test.ts`; they remain accepted. Ordinary `environment.queries` calls also remain clean.

### Construction allowance and limits

I temporarily removed the implementation-module exemption **in memory**. The scan reported exactly one construction: `engine-query-port.ts:1828`, exported as the frozen canonical port at **1895**.

Precisely, the exemption is **module-wide**, not restricted to that declaration. The current production inventory nevertheless contains only that one construction, consistent with the plan’s implementation-module allowance.

Opaque reflection, aliased native functions, and deliberately erased type information can evade this static check. I found no current production query-port reconstruction using those routes. This is a bounded type-aware check, not arbitrary runtime data-flow analysis.

### Scope and fixture preservation

- Only the checker changed: **190 additions / 1 deletion**.
- Existing fixture definitions and `stagedRealSymbolSelfTest` are **byte-identical**.
- **77 = 74 existing + 3 new fixtures**; earlier per-fixture expectations remain intact.
- Maximum added line: **118 columns**; none over 120.
- `git diff --check 39cc7df5 cc8b057f`: **exit 0**.
- Final worktree clean.

SHA-256 values printed before/after the overlays were unchanged:

```text
blind resolver:
580dffd5a08daf2608821623bf420056f2e441ec98abe7af55a8dad479860fcb
conversation:
526a3171a51a2e08e9246f0b40831eb5365f194d805630610695c4758113524d
```

Checker SHA:

```text
f17db77cb02e7ef08d8419a341da870fa761a9003cfcab9e1df9c547ab54b70d
```

**Read, not rerun:** implementer report and supervisor’s compiler, sg, and **26-suite / 307-test** results. No files were edited.

ACCEPT B15
tokens used
1,224,302
**B15-F1 is closed.**

### Verification I ran

Using `node --input-type=module` with `ts.sys.readFile` overlays and the actual production checker:

| Case | Result |
|---|---|
| Clean production tree | **Exit 0**, 1,622 TypeScript files checked |
| Exact r1 typed-spread mutant | **Exit 1**, two diagnostics at `blind-intent-resolver.ts:708`: forbidden object literal and port spread |
| `Object.assign({}, offerEnvironment.queries)` | **Exit 1**, “Object.assign cannot construct an EngineQueryPort” |
| Port-returning object literal in `tools/ai-dm-conversation.ts` | **Exit 1**, forbidden literal and spread at virtual line **7634** |

**Three mutants rejected; zero survivors.**

```text
node scripts/check-offer-environment-architecture.mjs --self-test
```

**Exit 0; 77 fixtures passed**, with:

```text
literal-and-clones=8, spread=1, test-double=0
```

The clean production scan includes the existing typed doubles in `legendary-windows.test.ts`; they remain accepted. Ordinary `environment.queries` calls also remain clean.

### Construction allowance and limits

I temporarily removed the implementation-module exemption **in memory**. The scan reported exactly one construction: `engine-query-port.ts:1828`, exported as the frozen canonical port at **1895**.

Precisely, the exemption is **module-wide**, not restricted to that declaration. The current production inventory nevertheless contains only that one construction, consistent with the plan’s implementation-module allowance.

Opaque reflection, aliased native functions, and deliberately erased type information can evade this static check. I found no current production query-port reconstruction using those routes. This is a bounded type-aware check, not arbitrary runtime data-flow analysis.

### Scope and fixture preservation

- Only the checker changed: **190 additions / 1 deletion**.
- Existing fixture definitions and `stagedRealSymbolSelfTest` are **byte-identical**.
- **77 = 74 existing + 3 new fixtures**; earlier per-fixture expectations remain intact.
- Maximum added line: **118 columns**; none over 120.
- `git diff --check 39cc7df5 cc8b057f`: **exit 0**.
- Final worktree clean.

SHA-256 values printed before/after the overlays were unchanged:

```text
blind resolver:
580dffd5a08daf2608821623bf420056f2e441ec98abe7af55a8dad479860fcb
conversation:
526a3171a51a2e08e9246f0b40831eb5365f194d805630610695c4758113524d
```

Checker SHA:

```text
f17db77cb02e7ef08d8419a341da870fa761a9003cfcab9e1df9c547ab54b70d
```

**Read, not rerun:** implementer report and supervisor’s compiler, sg, and **26-suite / 307-test** results. No files were edited.

ACCEPT B15
