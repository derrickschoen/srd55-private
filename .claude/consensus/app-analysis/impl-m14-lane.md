# M-14 implementation lane report (sol 01a09e4f-205a-7131-af22-d3d573c40fe7), harvested 2026-09-14 02:19

Implemented DOCS-FACTS-01 in exactly four authorized files.

### Verification

| Command | Exit | Result |
|---|---:|---|
| Pre-change `npx vitest list --configLoader runner --filesOnly --json` | 0 | 640 files: 508 unit, 131 integration, 1 parity |
| Initial RED focused spec | 1 | 1 file, 3 tests, **3 failed** |
| Focused pair after correction | 0 | 2 files, **10 passed** |
| `npx tsc -b --force` | 0 | No diagnostics |
| `sg scan` | 0 | No findings |
| `git diff --check` | 0 | No findings |
| Final focused pair | 0 | 2 files, **10 passed** |
| Post-change discovery | 0 | 641 files |
| Discovery comparison | 0 | Exactly one added spec, none removed |

The first attempted TypeScript observation exceeded 30 seconds without returning a captured status. No active compiler remained; the exact command was rerun and completed with exit 0 in 42.9 seconds.

RED versus GREEN:

```text
RED:   Test Files 1 failed (1); Tests 3 failed (3)
GREEN: Test Files 2 passed (2); Tests 10 passed (10)
```

An intermediate GREEN attempt found a line-wrapping-sensitive assertion: 1 failed and 9 passed. The assertion was corrected to preserve the same required wording across Markdown whitespace; the final pair passed 10/10.

### Mutation proofs

| Mutant | Applied proof | Failing case | Restored proof |
|---|---|---|---|
| M-COMPILE | SHA `62e49ffd…`; line 99 restored app-only affirmative gate | `compile and concurrency guidance agrees with executable configuration` | SHA `38a8bec9…`; 3/3 green |
| M-CONCURRENCY | SHA `4da535c2…`; line 113 restored “One suite-running lane at a time.” | `compile and concurrency guidance agrees with executable configuration` | SHA `38a8bec9…`; 3/3 green |
| M-STATUS | SHA `9f3d8644…`; increment 2 became `not-started` | `the completed historical plan has evidence for every increment` | SHA `4fe2c143…`; 3/3 green |
| M-SPELLLEVEL-COMMENT | SHA `1843399d…`; stale sentence restored at line 260 | `the SpellLevel comment and narrowing implementation agree` | SHA `f6486a10…`; 3/3 green |

Every mutant run produced exactly `1 failed | 2 passed`.

### Discovery comparison

```json
{
  "before": 640,
  "after": 641,
  "added": [
    "/home/vagrant/PhpstormProjects/dnd-wt-docs-facts/tests/unit/docs/operational-guidance-facts.test.ts"
  ],
  "removed": []
}
```

### Exact factual replacements

[.claude/supervision.md](/home/vagrant/PhpstormProjects/dnd-wt-docs-facts/.claude/supervision.md)

Before:

```text
Compile gate is npx tsc -p tsconfig.app.json --noEmit.
Never the root tsconfig.json...
One browser suite machine-wide...
One suite-running lane at a time.
```

After:

```text
Compile gate is npx tsc -b --force.
Root tsconfig.json references the app and node projects.
Ordinary project mode checks no source files with this files: [] solution.
Run gates under load; retry one timeout red serially under the gate lock.
Full Vitest, Playwright, and production builds remain serialized through
/tmp/dnd-gate.lock; run no Vitest while Playwright owns it.
```

The new index says `.claude/RULES.md:44` “records the forced compile command and supervisor finding,” folding in PD2-F1 without changing `RULES.md`.

[BUILD-PLAN.md](/home/vagrant/PhpstormProjects/dnd-wt-docs-facts/BUILD-PLAN.md)

Before:

```text
The PHP domain, Laravel migrations, Pest tests, and current Inertia/Vue screens
are the parity oracle.
```

After:

```text
Historical plan — completed 2026-07-23.
The PHP domain, Laravel migrations, Pest tests, and former Inertia/Vue screens
were the ancestor references used by this historical port. The retained
PHP-parity suite remains regression cover; adjudicated divergence is allowed
under D201.
```

All `25/25` increment rows are now `done`, with `57` evidence citations across `54` unique paths and `0` missing paths.

[src/domain/ids.ts](/home/vagrant/PhpstormProjects/dnd-wt-docs-facts/src/domain/ids.ts)

Before:

```text
Declared but not yet applied. Nothing narrows -1 away today, so the sentinel
still flows into the read models as a plain number.
```

After:

```text
The character spell-section read boundary in
src/queries/character-spell-section-builder.ts maps -1 to the typed
SheetSpellLevel unknown arm, brands only validated integers in 0..9 as
SpellLevel, and rejects every other stored value.
```

### Final status

```text
 M .claude/supervision.md
 M BUILD-PLAN.md
 M src/domain/ids.ts
?? tests/unit/docs/operational-guidance-facts.test.ts
```

New test: 178 lines, 8,496 bytes. Forbidden-token scan found no `any`, suppressions, `.skip`, or `.todo`.

Frozen contract:

```text
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1  src/vtt/intel/contracts.ts
```

IMPL M14 DONE