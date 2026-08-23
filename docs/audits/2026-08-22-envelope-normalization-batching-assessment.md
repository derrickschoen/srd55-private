# Envelope normalization and batching assessment

Date: 2026-08-22

## Observed alias contract

The accepted aliases are limited to shapes present in E05 run 3. The nullable
`envelopeNormalizationRule` telemetry field records the root shape class; null
means that no normalization was needed.

| Telemetry rule | Observed input | Canonical output |
|---|---|---|
| `missing_envelope_fields` | `monsters` with one or more absent envelope fields | Missing `kind`, `protocolVersion`, `encounterId`, `requestId`, `expectedRevision`, and `round` are copied from the request |
| `programs_collection` | Root `programs` array or combatant-keyed object | Root `monsters` array |
| `plans_collection` | Root `plans` array or combatant-keyed object | Root `monsters` array |
| `combatant_keyed_object` | Root object keyed by `combatant:<id>` | One `monsters` entry per key |
| `single_program` | Exactly one root `program`, `source`, `code`, `sourceCode`, or `plan` | One monster entry, only for a one-monster request |
| `monster_entry_aliases` | `combatantId`/`actorId` and `program`/`code`/`sourceCode` in a canonical `monsters` array | `monsterId` and the surface's canonical `source`/`program` field |

Observed alternate envelope kinds (`round_plan`, `js_program`,
`decision_program`, and `round_plan_response`) are replaced by the kind implied
by the requested surface. Other kind values remain validator refusals.

## Normalization versus refusal

Only absent envelope identity fields are filled. A present `protocolVersion`,
`encounterId`, `requestId`, `expectedRevision`, or `round` is retained exactly,
so the existing structural or stale-envelope validation refuses a wrong value.
A bare single program for a multi-monster request is refused before structural
validation and the error lists every monster whose association is missing.
Incomplete keyed maps, duplicate monster entries, unknown aliases, conflicting
collection fields, and unexpected fields continue through the strict decoder
and refuse; normalization does not guess.

## One-monster-per-call assessment (not implemented)

The protocol does not depend on batching. `DmRoundPlanSession` already sends a
one-element `livingMonsterIds` list in `per_combatant` mode and reconsults one
monster through the same reply schema. Exact-cardinality validation is derived
from the request, so cardinality one is a supported protocol case.

The shared-enemy implementation deliberately stores one `enemy_block` plan and
sends every living monster id in one request. With the current four-monster
experiment fixture, changing to one monster per call would therefore change
the baseline from one initial DM call per round to four. The first-skirmish
scope of four to six monsters would require four to six initial calls per
round, before corrections or reconsults. Calls are awaited as activations are
chosen; the bridge resumes the same persistent Codex session for each call.

The abandoned run measured 180 initial calls at a mean 64,418 input tokens,
56,055 cached input tokens, 266 output tokens, and 8,091 ms latency. Across all
256 calls, 87.89% of input tokens were reported cached. A simple four-call
linear extrapolation is about 257,673 gross input tokens and 32.4 seconds of
model latency per four-monster round, versus 64,418 tokens and 8.1 seconds for
one batched initial call. This is not a benchmark of one-monster prompts:
per-call output and actor declarations would shrink, while the full projection,
history, grammar, process invocation, and envelope would repeat. The bridge's
persistent session makes prefix caching available, but changed encounter
revisions, pending actors, and actor-specific declarations mean the code does
not guarantee the observed cache ratio will persist.

Recommendation: retain round batching, land envelope normalization and the
multi-monster worked example, then rerun E05. One-monster-per-call is a valid
fallback experiment if corrected first-pass validity remains poor, but the
current code and run measurements predict materially more calls, repeated
context tokens, and serialized model wait without a protocol benefit.
