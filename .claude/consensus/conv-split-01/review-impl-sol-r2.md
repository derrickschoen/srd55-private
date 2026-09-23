VERDICT: REVISE — P1: 0, P2: 1, P3: 0.

- P2 — Import validation remains non-exact. [`preserve.mjs:52`](/home/vagrant/PhpstormProjects/dnd-wt-conv-split-01/.tmp/runs/conv-split-01/preserve.mjs:52) derives the imported export name, but [`preserve.mjs:55`](/home/vagrant/PhpstormProjects/dnd-wt-conv-split-01/.tmp/runs/conv-split-01/preserve.mjs:55) records only `{ local, module }`. Consequently, changing D’s `import { join } from 'node:path'` to valid TypeScript `import { resolve as join } from 'node:path'` preserves the recorded binding and passes both checks at [`preserve.mjs:278`](/home/vagrant/PhpstormProjects/dnd-wt-conv-split-01/.tmp/runs/conv-split-01/preserve.mjs:278) and [`preserve.mjs:306`](/home/vagrant/PhpstormProjects/dnd-wt-conv-split-01/.tmp/runs/conv-split-01/preserve.mjs:306), despite binding the wrong function. Similarly, unused extra or duplicate allowed imports are never rejected because no exact per-file import inventory is compared. Preserve and compare module, imported name, local name, and type-only status as an exact per-file multiset.

The requested improvements otherwise work:

- Same-named top-level substitutions and extra/duplicate prelude declarations fail at [`preserve.mjs:263`](/home/vagrant/PhpstormProjects/dnd-wt-conv-split-01/.tmp/runs/conv-split-01/preserve.mjs:263).
- Referenced missing imports and wrong import sources fail at [`preserve.mjs:306`](/home/vagrant/PhpstormProjects/dnd-wt-conv-split-01/.tmp/runs/conv-split-01/preserve.mjs:306).
- Shorthand properties, type positions, `typeof x`, and namespace bases such as `engineMcpEntrypoint.x` are visited correctly. The exclusion list can over-approximate non-references such as declaration/binding names, but it does not miss the named genuine-reference forms in these frozen files.
- The authorized real-file check passed: 95 call entries, exact prelude sets, 24 relocated declarations, aggregate counts 443/83/1/1/48, final `PASS`.
- Reviewed read-only at commit `30f412df`; checker SHA-256 is `dcf8ac80d152caa219abb5003372d956df2fdc2ad681fae1be9c5b734204e061`. No tests, builds, typechecking, or writes were performed.

CONV-SPLIT-01 IMPL REVIEW R2 DONE