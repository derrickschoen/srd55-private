# M-2 plan lane report (sol 01a09e4f-2055-7711-8cc5-acb79f449911), harvested 2026-09-14 01:19

Plan written: [2026-09-14-dist-build-cache-completeness-plan.md](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-completeness-plan.md)

- `wc -l -c`: `593 34232`
- SHA-256: `d5406744d7e4ac2025ebd34ee823332590d34ce0e8892f86e5cdd1179233c849`
- `git status --short --untracked-files=all`: empty
- Frozen contract SHA-256: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`

Closure probe:

```text
special-import-unique=120
cache-inventory=840
omitted=97
split={"docs":30,"drizzle":67}
first10:
docs/guides/player-build-and-share.md
docs/srd/full/srd-5.2.1.txt
docs/srd/source/ability-score-generation.txt
docs/srd/source/armor-table.txt
docs/srd/source/attack-class-features.txt
docs/srd/source/backgrounds.txt
docs/srd/source/bard-spell-list.txt
docs/srd/source/class-core-traits.txt
docs/srd/source/class-expertise.txt
docs/srd/source/class-level-tables.txt
```

Consumer audit:

- Key/cache owner: `tools/dist-build-cache.mjs`
- Direct tool callers: `tools/serve.mjs:63`, `tools/ai-dm-board-snapshot.ts:306`
- Additional executable callers: `tests/deep-link/playwright.config.ts:27`, `tests/browser/ai-dm-board-snapshot.spec.ts:29`
- `scripts/test-affected.mjs` uses the unrelated `/tmp/dnd-verdict-cache`

No npm, build, Vitest, Playwright, model, agent, or git-write command was run.

PLAN M2 DONE