# M-14 plan review r1 (astra 01a09e5c-2428-76d3-8fed-253daf6f0f6b), harvested 2026-09-14 01:34

**REJECT PLAN M14.** The factual direction is sound, but four bounded corrections are needed before implementation.

Reviewed the 463-line plan with SHA-256 `4e3f4bcd2d54edf62576895a9a2f8930cb5bb4c89207f0eb7a88b92cf49bbde3`. All probes were read-only; no tests, builds, model calls, agents, or git writes were performed.

1. **PD1-F1 — Preserve the ordinary root-project warning.**  
   **Plan:** lines 97–100. **Severity:** P2. **Blocks:** yes.  
   The replacement correctly explains build mode, but removes the still-valid warning about ordinary project mode. This repository’s root config has `files: []`; `tsc -p tsconfig.json` does not traverse its references to typecheck their projects.  
   **Minimal change:** append: “Ordinary project mode (`npx tsc -p tsconfig.json --noEmit`) checks no source files with this root solution configuration; use build mode.” Require that distinction in case 1.

2. **PD1-F2 — Attribute `--force` to its actual controlling ruling.**  
   **Plan:** lines 55–57, 110–111, 156. **Severity:** P2. **Blocks:** yes.  
   D263 requires `tsc -b`; it does not prescribe `--force`. The authority for that addition is the **2026-09-03 14:30 supervisor finding**, at main `decisions.md:17–30`: “every gate and every mutation check uses `tsc -b --force`.” `.claude/RULES.md:44` already cites it. The proposed command is correct; its stated provenance is incomplete.  
   **Minimal change:** quote and cite this existing finding alongside D263, distinguishing project coverage from forced recompilation. No decision-log edit or command-inventory work is needed.

3. **PD1-F3 — Carry the surviving lock boundary into the replacement guidance.**  
   **Plan:** lines 101–104, 429–434. **Severity:** P2. **Blocks:** yes.  
   The inventory correctly concludes that `.claude/RULES.md:47–48` remains applicable, but the proposed standing bullets retain only unique ports. D587.3 amends the quiet-window requirement; it does not revoke gate serialization. D544 expressly places the serial retry “under the gate lock.” Removing the old bullets without preserving or linking their surviving restriction makes the replacement broader than those rulings support.  
   **Minimal change:** add one sentence directing readers to the existing RULES lock boundary: full Vitest, Playwright, and production builds remain serialized through `/tmp/dnd-gate.lock`; no Vitest runs while Playwright owns it. State that the retry uses that lock. Leave RULES.md unchanged.

4. **PD1-F4 — The concurrency regression can survive the proposed test.**  
   **Plan:** lines 270–275, 290–303. **Severity:** P2. **Blocks:** yes.  
   Case 1 requires decision identifiers, but specifies no assertion for the concurrency policy itself. Restoring “One suite-running lane at a time” while leaving the new index intact satisfies the described checks. Likewise, deleting the one-retry instruction need not fail.  
   **Minimal change:** within the existing case, check the scoped operational bullets for the load/retry/lock policy and reject the superseded absolute restriction. Add one negative control restoring that restriction while preserving the index. Exclude historical records from these assertions.

| Check | Assessment |
|---|---|
| **1. Controlling quotations and derivation** | **Partial.** Independently verified the quoted excerpts against main’s authority: D25 at 8885–8891; D29 at 8857–8862; D201 at 7253–7259; D263 at 6544–6564; D544 at 11065–11071; D587 item 3 at 19010–19013. They match in substance with normalized wrapping/punctuation. D201 supports the nonbinding-oracle wording; D29 supports deliberate removal/re-homing, not completion dates. Those dates appropriately need historical evidence. D606/D613 confirm explicit named exceptions. Fix the missing `--force` provenance and lock qualification above. |
| **2. Compile coverage and root warning** | **Partial.** Read all three configs and package scripts. Root build mode follows app and node references. App includes `src`; node includes configs, `db`, `scripts`, `tests`, and `tools`. Thus the replacement’s coverage statement is accurate for the included TypeScript projects. It must preserve the ordinary root-project warning. |
| **3. BUILD-PLAN historical status** | **Pass.** The dated historical header, unchanged increment descriptions, corrected statuses, and evidence column remain factual annotation rather than re-planning. Every cited evidence path exists. Progress records support delivery; `PARITY-AUDIT.md:3–10` dates the final PASS to 2026-07-23, and `BUILD-PROGRESS.md:459` records completion. Row 22 acknowledges subsequent retirement. Keep the audit’s original immutability statement untouched, as planned. |
| **4. SpellLevel comment** | **Pass.** Read the union at 98–103, narrowing at 225–233, and decoder call at 343. The proposed comment accurately limits its claim to this boundary: sentinel becomes unknown, validated integers are branded, other values are rejected. It makes no claim that all read boundaries are repaired and does not pre-empt M-10. |
| **5. Executable verification and discovery** | **Partial.** Rejecting the old affirmative compile-gate sentence will catch M-COMPILE. A blanket rejection of the command string would incorrectly reject the proposed explanatory app-only warning; keep this assertion scoped to the affirmative gate statement. Historical exclusions are appropriate. Concurrency coverage needs PD1-F4. Independently counted **640** matching files statically: **508 unit / 131 integration / 1 parity**. Installed Vitest source confirms JSON `file` objects. The captured-set comparison correctly requires exactly the new spec and no removals, yielding **640→641** here; I did not rerun discovery. |
| **6. Seven historical hits and RULES policy** | **Pass with PD1-F3.** Inspected all seven contexts. Five are dated simcore round plans; the perf and audit documents report past commands/results, including separate node-config checks. Lines 424–426 explicitly classify and preserve them as history. RULES.md is correctly outside the edit list because its lock policy survives D587.3; reflect that conclusion in the replacement text. |
| **7. Scope, history, later rulings** | **Pass after corrections.** The four-file implementation boundary is bounded. No symbol tooling, generated inventory, read-boundary implementation, or decision-history rewrite is proposed. D623 supports the facts-only lane; M-3 remains the inventory owner. The later forced-compilation ruling must join the authority index. |

**REJECT PLAN M14**

M14 PLAN REVIEW R1 DONE