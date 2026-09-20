# D694-INTEL-01 B5 — astra MEDIUM review r1 (session 01a0bee1-685a-7cd0-8b00-232b83aa65a2, final message only)

**REJECT — P1: 0, P2: 3, P3: 0.**

1. **P2 — Reach queries without `action_id` now manufacture resolved facts.**  
   [engine-server.ts:3340](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/engine-server.ts:3340) accepts an omitted action because `pairQuery.action_id` remains optional. This sets `reach = null`, skips the unknown guard, and returns `status: 'resolved'` with `reachable_now: false`, `reachable_after_movement: false`, and null movement/range values. No reach calculation established those facts. The parent classified this case as unknown; B5 changes it into a plausible negative answer. Return a refusal-only unknown arm, or require an action specifically for reach queries. Add a witness using a retained spatial target and omitted action.

2. **P2 — The prose trimming test loses its engine-default preservation assertion.**  
   [prose-renderer.test.ts:314](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/prose-renderer.test.ts:314) replaces checks for the engine-default option plus an alternative with a count of any two local option IDs. A renderer that drops the default and retains two alternatives now passes. The K-set preservation subject still exists in `actorSegments`; this is weakened coverage, not merely a hand-derived expectation adjustment. Keep the local-offer setup, but restore explicit identity checks for the required floor.

3. **P2 — The integration rewrite removes coverage of surface degradation under byte pressure.**  
   [engine-context-integrations.test.ts:382](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/engine-context-integrations.test.ts:382) correctly establishes that capsule-only inflation cannot affect boundary-owned fields. However, it replaces the test requiring actor knowledge, reaction windows, legendary windows, recovery, search memory, alerts, and skills to degrade under actual pressure. Those producers and trimming branches remain. Retain the new invariance test and recreate the pressure witness using sanctioned local inputs or a suitable configured cap. General cap assertions do not preserve those surface-specific checks.

The remaining review checks support the implementation:

- **Schemas and consumers:** All five query families have strict discriminated unknown arms containing only identifiers, refusals, and the applicable state reference. Registrations and application/handler validation use these schemas. The internal reach→path consumer reads the new `facts` nesting. Finding 1 concerns selecting the wrong arm, not schema permissiveness.
- **Generated schemas:** `turnContextOutput` does not depend on the standalone query output schemas, so its unchanged generated document is expected. The unchanged equality assertion at handler test line 1178 compares parsed JSON against `z.toJSONSchema` with the generator’s options. It proves structural generator/source equality, not whitespace equality. All four current document hashes match the recorded twice-run generator hashes.
- **Three todos:** The lane log records three failures before production changes: two schema failures and the concluded-phase `victory`/`defeat` mismatch. The preserved assertion blocks from `df1d6bc7` are now live and unchanged. Seven schema witnesses also have recorded red-first failures.
- **Annotations and ledgers:** All four `actorLocalTacticalOptions` callers use issued locals; annotations derive from cached local offers and mechanics. No withheld arm or `knowledge_status` was introduced. Guard/Room 8 tests compare canonical annotation bytes across relocation/removal and exclude Fighter. No serialized `capsule_digest` key was renamed in this batch: the rename ledger is legitimately `3 × 0`. The proof-token replacement retains 64 hex characters.
- **Remaining authoritative inputs:** The summary proof token uses `projectionDigest`. Authoritative inputs still reach opportunity scoring (B6), team scoring (B7), and submission/proposal/resource/journal paths (B9). In particular, `applicationPage` still hashes `capsule.digest` into model-visible cursors; this is deferred public-token work, not host-only data. Blind closure remains B10.
- **Phase and renderer:** Concluded-phase mapping statically matches player survival→victory, monster survival→defeat, and neither→mutual. Awaiting-placement logic is unchanged. Both model renderer-feature callers use the local API; the negative type witness rejects an authoritative state.
- **Manifest:** Exactly the eight reported files changed. Fixtures and generated documents are unchanged; diff-check passes. No regenerated literal expectations were identified, but findings 2–3 are test weakening.

Fresh execution was blocked before test collection by temporary SSR-directory creation failure; the additional probe hit a read-only Vite cache. I therefore relied on static inspection and the recorded supervisor results, rather than claiming an independent green run.

D694-INTEL-01 B5 REVIEW R1 DONE
