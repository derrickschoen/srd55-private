Batch 1 is blocked by a compile dependency outside the frozen ten-file manifest.

Command:

```text
npx tsc -p tsconfig.app.json --noEmit
```

Result: exit 2. The required `devils_sight` `EffectPayload` variant makes the exhaustive inventory in unapproved `src/vtt/intel/option-outcome.ts` incomplete:

```text
src/vtt/intel/option-outcome.ts(420,12): error TS1360:
Property 'devils_sight' is missing in type ... but required in type
'Record<..., PayloadDisposition>'.

src/vtt/intel/option-outcome.ts(516,7): error TS7053:
Property 'devils_sight' does not exist on type ...

src/vtt/intel/option-outcome.ts(554,5): error TS7053:
Property 'devils_sight' does not exist on type ...
```

Proceeding requires authorizing `src/vtt/intel/option-outcome.ts` for Batch 1. Omitting the payload variant would violate the frozen plan and required outcomes.

RED-first evidence was captured before implementation:

```text
Test Files  2 failed (2)
Tests       27 failed | 9 passed (36)
```

The run reported the named field, cover, cache, agreement, architecture, perception, and Devil’s Sight failures. The worktree currently contains partial Batch 1 changes; I stopped immediately after the out-of-manifest T-app diagnostic and did not run T-node, green suites, mutants, or final checks.

BLOCKED: Required devils_sight EffectPayload addition breaks the exhaustive PayloadDisposition inventory in unapproved src/vtt/intel/option-outcome.ts:420,516,554.
