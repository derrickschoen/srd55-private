**F34 — Medium, blocking: correction deadline expiry still synthesizes authorization invalidation.**

At [turn-exhaustion-coordinator.ts:437](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/turn-exhaustion-coordinator.ts:437), a correction proposal retrieved before expiry can reach the next deadline check after expiry. The coordinator skips `host.authorize`, synthesizes `'invalidated'`, and marks it as a validation failure. It then [persists `proposal_correction_failed`](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/turn-exhaustion-coordinator.ts:495) and enters deterministic resolution.

Thus the initial blind case from F33 is fixed, but the requested “no other outcome path synthesises `invalidated`” guarantee is not. Deadline exhaustion remains misreported as proposal invalidation on the correction path. The [updated regression](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/vtt/turn-exhaustion-coordinator.test.ts:238) covers initial authorization only. Carry typed deadline attribution through this correction branch too.

Verified:

- F32’s named paths now preserve observed results before deadline rejection; speculative joins retain actual infrastructure failures. Late completed cold starts return `expired` without binding.
- Both moved classifier function bodies are byte-identical to their previous implementations; the public module re-exports them.
- Offers environment/catalog, capsule schema, and query-port files match `f6e47fa5`. The three conflict resolutions retain environment binding, `strictNoFallback`, blind delivery restrictions, and the schema-4 assertion.
- Other assertion/pin changes are inherited from main’s schema-4 migration. No new prohibited constructs or test-budget changes found.
- `tools/d569-v5` is untouched. Frozen contract, runbook, and independent pre-patch fixture hashes match.

No tests or gates run.

REJECT — F34