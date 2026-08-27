# D398: real engine MCP server design — round 1

**Status:** design for supervisor consensus review  
**Date:** 2026-08-27  
**Supersedes:** the minimal `tools/engine-mcp-server.ts` prototype as a product
design. The prototype remains only a spike until the migration in §11 replaces
it.

## 1. Decision summary

The engine MCP server is a local, agent-facing read/query/propose surface over
an immutable VTT state projection. It is not another combat engine, a state
store, a reducer endpoint, or an AI-controlled DM client.

The shortest successful monster round is deliberately two calls:

1. `engine.get_turn_context` returns the current actors, compact tactical
   state, legal action choices, engine-resolved reach/path/cover/visibility
   facts, and dice expectations.
2. `engine.submit_round_intents` validates the complete shared-initiative enemy
   round and appends one revision-bound, all-or-nothing proposal to the local
   bridge's proposal queue. The DM client alone may authorize and reduce it.

`engine.submit_intent` remains available for a single takeover or mixed-control
seat, but it is not the normal monster-round path. This follows D320.4: all
enemies share one initiative and the DM plans all their turns at once.

Agents never send cells, coordinates, paths, attack bonuses, DCs, damage dice,
or reducer commands. They choose an engine-named action, a semantic target,
movement willingness, an engagement stance, and one declarative fallback. The
engine owns every geometric and mechanical detail.

The server targets the current dated MCP protocol, **`2026-07-28`**. That
protocol is JSON-RPC 2.0, stateless, self-describing per request, and has no MCP
transport session on which game correctness may depend. Every engine call
therefore carries an explicit, immutable `state_handle` and
`expected_revision`. See the [current MCP specification](https://modelcontextprotocol.io/specification/2026-07-28),
[tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools),
and [resources](https://modelcontextprotocol.io/specification/2026-07-28/server/resources).

The distinct *agent conversation* is still stateful. One CLI conversation is
started at the first fight and resumed for every round, room transition, and
correction. Its provider and opaque ID are persisted in the VTT journal and in
portable saves. Codex, OpenCode, Pi, and Claude Code implement one
`AgentSessionAdapter` contract. An absent executable is reported as
`UNVERIFIED (CLI ABSENT)` and causes the live conformance command to exit
non-green.

### 1.1 Binding invariants

- The authoritative state is the DM browser's persisted journal and reducer.
- The MCP server sees a read-only DM projection of one journal revision.
- `submit_round_intents`, `submit_intent`, narration, and adjudication calls
  create proposals or presentation events only. None can invoke
  `reduceEncounter`, journal append, undo, room transition, RNG, or a DM
  override.
- Every accepted proposal is bound to run ID, request ID, actor, branch,
  revision, state digest, and a client-generated idempotency key.
- A stale proposal fails closed. It is never rebased implicitly.
- Exhaustion order is exactly: initial intent's declared fallback, one
  correction resume, then the deterministic controller. The host, not the
  agent, records `auto_resolved`.
- Narration is free text in a separate channel and is never parsed for rules or
  state mutation.
- The production MCP transport is stdio only. The server opens no HTTP, SSE,
  WebSocket, DNS, or other socket and performs no outbound network access.
- The public package reads only explicit engine projections and an allowlisted
  redistributable rules KB. It never traverses the repository for content.
  `content/cc-by-sa/**` is a hard deny for resources, prompts, and KB loading.

## 2. Process and authority architecture

```text
authoritative DM browser
  |  current persisted revision + DM projection
  v
local npm bridge / AgentRunCoordinator
  |-- writes an ephemeral, revision-digested state capsule
  |-- starts or resumes one selected agent CLI
  |-- watches proposal/narration spools
  |-- returns proposals to the DM client
  |
  +--> codex | opencode | pi | claude-code
         |
         | launches configured MCP child over stdio
         v
      engine MCP server
         |-- read-only EngineQueryPort
         |-- pure IntentResolver
         |-- append-only ProposalSink / NarrationSink
         `-- no reducer and no journal store
```

The browser-to-local-bridge loopback channel already required by the VTT stays
as adopted. It is not an MCP transport. The supervisor resolved “stdio only” to
mean that the agent-facing engine server has no network listener or network
client; the bridge must not expose this MCP server over its browser control
channel.

For each CLI invocation, the bridge creates an OS-temporary run directory with
owner-only permissions. A launcher token selects three files inside it:

- `state.json`: canonical state capsule, replaced atomically when the DM client
  advances while a resume remains alive;
- `proposals.jsonl`: append-only, schema-checked proposal envelopes;
- `narration.jsonl`: append-only, schema-checked presentation events.

The random launcher token, not an arbitrary path supplied by the model, is the
only server argument. The launcher resolves it beneath the bridge-owned
temporary root, rejects symlinks and traversal, and opens files with restrictive
permissions. The server is allowed to append only to the two spool files. It
cannot write the capsule or any repository path. Spools are transport queues,
not authoritative persistence: the DM client validates every envelope again
and records only the result of its own authorization/reduction flow.

This filesystem IPC is used because the CLI owns the MCP child's stdio. It does
not introduce a socket, a second MCP transport, or hidden game state. On clean
shutdown the bridge removes the temporary run directory; crash leftovers are
ignored unless their random token is still named by an active bridge process.

### 2.1 State capsule

The capsule is generated from the existing `DmBoardProjection`, journal
history, and canonical engine registries. It contains:

```ts
interface EngineStateCapsule {
  readonly format: 'engine-mcp-state-capsule';
  readonly schemaVersion: 1;
  readonly runId: EncounterSessionId;
  readonly branchId: EncounterBranchId;
  readonly revision: number;
  readonly digest: string; // SHA-256 of canonical mechanically relevant bytes
  readonly generatedAt: string;
  readonly request: null | {
    readonly requestId: string;
    readonly phase: 'initial' | 'correction';
    readonly correctionNumber: 0 | 1;
    readonly actors: readonly CombatantId[];
  };
  readonly projection: EngineDmProjection;
  readonly historyDelta: readonly EngineHistoryEntry[];
  readonly rulesIndex: readonly RuleReference[];
}
```

`EngineDmProjection` is a purpose-built projection, not a serialization of
`EncounterState`. It may include DM-known combatant facts and semantic terrain
facts, but never raw engine commands, RNG state, imported rules prose, browser
storage metadata, CLI credentials, or filesystem paths. All user-authored
strings are bounded and marked as data by the prompt renderer.

On every request the server rereads and verifies the capsule's canonical digest
before resolving the supplied state handle. A capsule change invalidates all
old handles. Queries against an old handle return `STALE_STATE`; submissions
against it never enter the proposal spool.

## 3. Common application schemas

Tool names are prefixed with `engine.`. Every input and output schema is JSON
Schema 2020-12, has an object root, and closes every structured object with
`additionalProperties: false`. The real descriptors include both
`inputSchema` and `outputSchema`; generated schemas inline the shared `$defs`
when a client cannot resolve document-local references.

The following definitions are reused below (descriptions are shortened here,
but are mandatory in the advertised schema):

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$defs": {
    "stateRef": {
      "type": "object",
      "additionalProperties": false,
      "required": ["run_id", "state_handle", "expected_revision"],
      "properties": {
        "run_id": { "type": "string", "minLength": 1, "maxLength": 200 },
        "state_handle": { "type": "string", "minLength": 20, "maxLength": 300 },
        "expected_revision": { "type": "integer", "minimum": 1 }
      }
    },
    "targetSelector": {
      "oneOf": [
        {
          "type": "object", "additionalProperties": false,
          "required": ["kind", "combatant_id"],
          "properties": {
            "kind": { "const": "combatant" },
            "combatant_id": { "type": "string", "minLength": 1, "maxLength": 200 }
          }
        },
        {
          "type": "object", "additionalProperties": false,
          "required": ["kind"],
          "properties": {
            "kind": {
              "enum": [
                "nearest_visible_enemy", "lowest_hp_visible_enemy",
                "most_injured_visible_ally", "current_threat"
              ]
            }
          }
        },
        {
          "type": "object", "additionalProperties": false,
          "required": ["kind", "ally_id"],
          "properties": {
            "kind": { "const": "enemy_threatening_ally" },
            "ally_id": { "type": "string", "minLength": 1, "maxLength": 200 }
          }
        }
      ]
    },
    "actionChoice": {
      "oneOf": [
        {
          "type": "object", "additionalProperties": false,
          "required": ["kind", "action_id", "target"],
          "properties": {
            "kind": { "const": "attack" },
            "action_id": { "type": "string", "minLength": 1, "maxLength": 200 },
            "target": { "$ref": "#/$defs/targetSelector" },
            "resource_policy": { "enum": ["conserve", "normal", "spend_if_useful"] }
          }
        },
        {
          "type": "object", "additionalProperties": false,
          "required": ["kind", "spell_id", "target"],
          "properties": {
            "kind": { "const": "cast_spell" },
            "spell_id": { "type": "string", "minLength": 1, "maxLength": 200 },
            "target": {
              "oneOf": [{ "$ref": "#/$defs/targetSelector" }, { "type": "null" }]
            },
            "slot_policy": { "enum": ["lowest_legal", "conserve", "best_effect"] }
          }
        },
        {
          "type": "object", "additionalProperties": false,
          "required": ["kind", "action_id", "target"],
          "properties": {
            "kind": { "const": "use_action" },
            "action_id": { "type": "string", "minLength": 1, "maxLength": 200 },
            "target": {
              "oneOf": [{ "$ref": "#/$defs/targetSelector" }, { "type": "null" }]
            }
          }
        },
        {
          "type": "object", "additionalProperties": false,
          "required": ["kind"],
          "properties": {
            "kind": { "enum": ["dodge", "disengage", "dash", "end_turn"] }
          }
        }
      ]
    },
    "movementPreference": {
      "type": "object",
      "additionalProperties": false,
      "required": ["willingness", "opportunity_risk"],
      "properties": {
        "willingness": {
          "enum": ["none", "only_if_required", "for_clear_advantage", "freely"]
        },
        "maximum_feet": { "type": "integer", "minimum": 0, "multipleOf": 5 },
        "opportunity_risk": { "enum": ["avoid", "accept_if_needed", "accept"] }
      }
    },
    "engagement": {
      "type": "object",
      "additionalProperties": false,
      "required": ["stance"],
      "properties": {
        "stance": {
          "enum": ["hold_position", "close_to_melee", "maintain_range", "withdraw"]
        },
        "anchor": {
          "oneOf": [{ "$ref": "#/$defs/targetSelector" }, { "type": "null" }]
        }
      }
    },
    "turnIntent": {
      "type": "object",
      "additionalProperties": false,
      "required": ["actor_id", "choice", "movement", "engagement", "fallback"],
      "properties": {
        "actor_id": { "type": "string", "minLength": 1, "maxLength": 200 },
        "choice": { "$ref": "#/$defs/actionChoice" },
        "movement": { "$ref": "#/$defs/movementPreference" },
        "engagement": { "$ref": "#/$defs/engagement" },
        "fallback": {
          "oneOf": [
            { "type": "null" },
            {
              "type": "object", "additionalProperties": false,
              "required": ["choice", "movement", "engagement"],
              "properties": {
                "choice": { "$ref": "#/$defs/actionChoice" },
                "movement": { "$ref": "#/$defs/movementPreference" },
                "engagement": { "$ref": "#/$defs/engagement" }
              }
            }
          ]
        }
      }
    },
    "page": {
      "type": "object", "additionalProperties": false,
      "properties": {
        "cursor": { "type": "string", "minLength": 1, "maxLength": 500 },
        "maximum_items": { "type": "integer", "minimum": 1, "maximum": 100 }
      }
    }
  }
}
```

There is intentionally no `GridCell` definition. Unknown properties such as
`to`, `path`, `destination`, `row`, `column`, `x`, or `y` fail schema validation.
The engine may internally resolve cells and paths, but externally returns only
semantic feasibility, cost, risk, and a human-readable positional description.

In correction phase, `fallback` must be `null`; the first fallback has already
been exhausted and a correction must not create a new unbounded fallback chain.
That rule is expressed with JSON Schema `if`/`then` in the complete
`validate_intent`, `submit_round_intents`, and `submit_intent` schemas.

## 4. Tool inventory

The complete model-visible inventory is fixed and returned in this order:

| Tool | Normal use | Calls saved |
|---|---|---|
| `engine.get_turn_context` | Whole active turn or monster round | Replaces summary + options + one spatial/expectation query per option. |
| `engine.get_state_summary` | Drill into room, combatant, or journal delta | One paged projection instead of many entity reads. |
| `engine.get_combatant_options` | Full option/refusal list for one actor | Replaces statblock + resources + condition reads. |
| `engine.query_path` | Ask whether a semantic movement objective is feasible | Engine resolves destination and path; no coordinate exchange. |
| `engine.query_reach` | Batch current/post-movement reach checks | Up to 50 pairs in one call. |
| `engine.query_cover` | Batch cover comparisons | Up to 50 pairs in one call. |
| `engine.query_visibility` | Batch perception/visibility comparisons | Up to 50 pairs in one call. |
| `engine.query_dice_expectation` | Compare analytic outcomes | Up to 20 action candidates in one call. |
| `engine.validate_intent` | Optional pure preview/debugging | Never required before a happy-path submission. |
| `engine.submit_round_intents` | Validate and queue the complete monster round | Normal D320.4 path; one atomic proposal replaces per-enemy submissions. |
| `engine.submit_intent` | Validate and queue one seat proposal | Takeover/mixed-control path; validation is folded into submission. |
| `engine.emit_narration` | Stream one presentation-only prose chunk | Separate from mechanics; callable while reasoning continues. |
| `engine.request_dm_adjudication` | Put an unresolved question in the DM tray | No raw override or consequence round trip. |

Query tools advertise `readOnlyHint: true`, `destructiveHint: false`,
`idempotentHint: true`, and `openWorldHint: false`. Proposal, narration, and
adjudication tools advertise `readOnlyHint: false` because they append to a
queue, but remain `destructiveHint: false`, `idempotentHint: true` (under their
required key), and `openWorldHint: false`. These annotations are usability
hints only; schema checks and dependency boundaries enforce the behavior.

### 4.1 Short-loop composite

#### `engine.get_turn_context`

This is the normal first and usually only query. `scope: "round"` returns all
actors requested for the current round so the agent does not call state,
options, reach, and expectation tools once per monster.

```json
{
  "inputSchema": {
    "type": "object", "additionalProperties": false,
    "required": ["run_id", "expected_revision", "scope"],
    "properties": {
      "run_id": { "type": "string", "minLength": 1, "maxLength": 200 },
      "expected_revision": { "type": "integer", "minimum": 1 },
      "scope": { "enum": ["active_turn", "round"] },
      "actor_ids": {
        "type": "array", "minItems": 1, "maxItems": 50, "uniqueItems": true,
        "items": { "type": "string", "minLength": 1, "maxLength": 200 }
      },
      "include_expectations": { "type": "boolean", "default": true },
      "maximum_options_per_actor": { "type": "integer", "minimum": 1, "maximum": 20, "default": 8 }
    }
  },
  "outputSchema": {
    "type": "object", "additionalProperties": false,
    "required": ["state_ref", "request", "summary", "actors", "recent_changes", "truncated"],
    "properties": {
      "state_ref": { "$ref": "#/$defs/stateRef" },
      "request": { "$ref": "#/$defs/turnRequest" },
      "summary": { "$ref": "#/$defs/tacticalSummary" },
      "actors": {
        "type": "array",
        "items": {
          "type": "object", "additionalProperties": false,
          "required": ["actor_id", "status", "options", "threats"],
          "properties": {
            "actor_id": { "type": "string", "minLength": 1, "maxLength": 200 },
            "status": { "$ref": "#/$defs/actorStatus" },
            "options": { "type": "array", "items": { "$ref": "#/$defs/tacticalOption" } },
            "threats": { "type": "array", "items": { "$ref": "#/$defs/threat" } }
          }
        }
      },
      "recent_changes": { "type": "array", "items": { "$ref": "#/$defs/recentChange" } },
      "truncated": { "type": "boolean" },
      "next_cursor": { "type": ["string", "null"] }
    },
    "$defs": {
      "stateRef": {
        "type": "object", "additionalProperties": false,
        "required": ["run_id", "state_handle", "expected_revision"],
        "properties": {
          "run_id": { "type": "string", "minLength": 1, "maxLength": 200 },
          "state_handle": { "type": "string", "minLength": 20, "maxLength": 300 },
          "expected_revision": { "type": "integer", "minimum": 1 }
        }
      },
      "targetSelector": {
        "oneOf": [
          {
            "type": "object", "additionalProperties": false,
            "required": ["kind", "combatant_id"],
            "properties": {
              "kind": { "const": "combatant" },
              "combatant_id": { "type": "string", "minLength": 1, "maxLength": 200 }
            }
          },
          {
            "type": "object", "additionalProperties": false,
            "required": ["kind"],
            "properties": {
              "kind": { "enum": ["nearest_visible_enemy", "lowest_hp_visible_enemy", "most_injured_visible_ally", "current_threat"] }
            }
          },
          {
            "type": "object", "additionalProperties": false,
            "required": ["kind", "ally_id"],
            "properties": {
              "kind": { "const": "enemy_threatening_ally" },
              "ally_id": { "type": "string", "minLength": 1, "maxLength": 200 }
            }
          }
        ]
      },
      "turnRequest": {
        "type": "object", "additionalProperties": false,
        "required": ["request_id", "phase", "correction_number", "required_actor_ids"],
        "properties": {
          "request_id": { "type": "string", "minLength": 1, "maxLength": 200 },
          "phase": { "enum": ["initial", "correction"] },
          "correction_number": { "enum": [0, 1] },
          "required_actor_ids": {
            "type": "array", "minItems": 1, "maxItems": 50, "uniqueItems": true,
            "items": { "type": "string", "minLength": 1, "maxLength": 200 }
          }
        }
      },
      "tacticalSummary": {
        "type": "object", "additionalProperties": false,
        "required": ["room", "round", "active_side", "living_allies", "living_enemies", "terrain_tags"],
        "properties": {
          "room": { "type": ["integer", "null"], "minimum": 1 },
          "round": { "type": "integer", "minimum": 0 },
          "active_side": { "enum": ["players", "monsters", "none"] },
          "living_allies": { "type": "integer", "minimum": 0 },
          "living_enemies": { "type": "integer", "minimum": 0 },
          "terrain_tags": {
            "type": "array", "maxItems": 100, "uniqueItems": true,
            "items": { "type": "string", "minLength": 1, "maxLength": 100 }
          }
        }
      },
      "actorStatus": {
        "type": "object", "additionalProperties": false,
        "required": ["life", "hit_point_band", "movement_feet", "action_available", "bonus_action_available", "reaction_available", "effect_tags", "pending_decision_ids"],
        "properties": {
          "life": { "enum": ["living", "dying", "stable", "dead"] },
          "hit_point_band": { "enum": ["uninjured", "injured", "critical", "unknown"] },
          "movement_feet": { "type": "integer", "minimum": 0 },
          "action_available": { "type": "boolean" },
          "bonus_action_available": { "type": "boolean" },
          "reaction_available": { "type": "boolean" },
          "effect_tags": {
            "type": "array", "maxItems": 100,
            "items": { "type": "string", "minLength": 1, "maxLength": 200 }
          },
          "pending_decision_ids": {
            "type": "array", "maxItems": 50,
            "items": { "type": "string", "minLength": 1, "maxLength": 200 }
          }
        }
      },
      "optionRisk": {
        "type": "object", "additionalProperties": false,
        "required": ["kind", "source_id", "severity"],
        "properties": {
          "kind": { "enum": ["opportunity_window", "hazard", "resource_exposure", "visibility_loss"] },
          "source_id": { "type": ["string", "null"], "maxLength": 200 },
          "severity": { "enum": ["low", "medium", "high"] }
        }
      },
      "optionExpectation": {
        "type": "object", "additionalProperties": false,
        "required": ["resolvable", "outcome_probability", "expected_value", "metric", "assumption_codes"],
        "properties": {
          "resolvable": { "type": "boolean" },
          "outcome_probability": { "type": ["number", "null"], "minimum": 0, "maximum": 1 },
          "expected_value": { "type": ["number", "null"] },
          "metric": { "enum": ["damage", "healing", "control", "none"] },
          "assumption_codes": {
            "type": "array", "maxItems": 20,
            "items": { "type": "string", "minLength": 1, "maxLength": 100 }
          }
        }
      },
      "tacticalOption": {
        "type": "object", "additionalProperties": false,
        "required": ["action_id", "kind", "target_selectors", "resource_cost_labels", "usable_now", "usable_after_movement", "minimum_movement_feet", "visibility", "cover", "risks", "expectation"],
        "properties": {
          "action_id": { "type": "string", "minLength": 1, "maxLength": 200 },
          "kind": { "enum": ["attack", "cast_spell", "use_action", "dodge", "disengage", "dash", "end_turn"] },
          "target_selectors": {
            "type": "array", "maxItems": 50,
            "items": { "$ref": "#/$defs/targetSelector" }
          },
          "resource_cost_labels": {
            "type": "array", "maxItems": 20,
            "items": { "type": "string", "minLength": 1, "maxLength": 200 }
          },
          "usable_now": { "type": "boolean" },
          "usable_after_movement": { "type": "boolean" },
          "minimum_movement_feet": { "type": ["integer", "null"], "minimum": 0 },
          "visibility": { "enum": ["yes", "no", "conditional", "unknown"] },
          "cover": { "enum": ["none", "half", "three_quarters", "total", "unknown"] },
          "risks": { "type": "array", "maxItems": 50, "items": { "$ref": "#/$defs/optionRisk" } },
          "expectation": { "oneOf": [{ "$ref": "#/$defs/optionExpectation" }, { "type": "null" }] }
        }
      },
      "threat": {
        "type": "object", "additionalProperties": false,
        "required": ["source_id", "kinds", "distance_band", "can_reach_now", "visible", "note_codes"],
        "properties": {
          "source_id": { "type": "string", "minLength": 1, "maxLength": 200 },
          "kinds": {
            "type": "array", "minItems": 1, "maxItems": 10, "uniqueItems": true,
            "items": { "enum": ["melee", "ranged", "save", "hazard", "control", "reaction"] }
          },
          "distance_band": { "enum": ["engaged", "near", "far", "unknown"] },
          "can_reach_now": { "enum": ["yes", "no", "conditional", "unknown"] },
          "visible": { "type": "boolean" },
          "note_codes": {
            "type": "array", "maxItems": 20,
            "items": { "type": "string", "minLength": 1, "maxLength": 100 }
          }
        }
      },
      "recentChange": {
        "type": "object", "additionalProperties": false,
        "required": ["revision", "kind", "summary", "branch_status"],
        "properties": {
          "revision": { "type": "integer", "minimum": 1 },
          "kind": { "type": "string", "minLength": 1, "maxLength": 100 },
          "summary": { "type": "string", "minLength": 1, "maxLength": 500 },
          "branch_status": { "enum": ["active", "void"] }
        }
      }
    }
  }
}
```

Each option includes an `action_id`, legal semantic target selectors, resource
cost labels, `usable_now`, `usable_after_movement`, minimum movement cost,
visibility and cover summaries, opportunity-window risks, and optional analytic
outcome expectation. It does not include a chosen path or destination. The
snippet spells out the closed status, option, threat, request, summary, change,
target-selector, and state-reference shapes, so no open object remains in the
advertised schema.

### 4.2 State and focused queries

#### `engine.get_state_summary`

```json
{
  "inputSchema": {
    "type": "object", "additionalProperties": false,
    "required": ["state_ref", "granularity"],
    "properties": {
      "state_ref": { "$ref": "#/$defs/stateRef" },
      "granularity": { "enum": ["turn_minimal", "room_tactical", "combatant_detail", "journal_delta"] },
      "combatant_ids": {
        "type": "array", "maxItems": 50, "uniqueItems": true,
        "items": { "type": "string", "minLength": 1, "maxLength": 200 }
      },
      "since_revision": { "type": "integer", "minimum": 1 },
      "page": { "$ref": "#/$defs/page" }
    }
  },
  "outputSchema": {
    "type": "object", "additionalProperties": false,
    "required": ["state_ref", "granularity", "summary", "truncated", "next_cursor"],
    "properties": {
      "state_ref": { "$ref": "#/$defs/stateRef" },
      "granularity": { "type": "string" },
      "summary": { "type": "object" },
      "truncated": { "type": "boolean" },
      "next_cursor": { "type": ["string", "null"] }
    }
  }
}
```

`turn_minimal` is names/status/current resources/nearby threats only;
`room_tactical` adds semantic terrain zones and every relevant combatant;
`combatant_detail` requires IDs and returns bounded full mechanical option
inputs; `journal_delta` requires `since_revision` and includes active/void branch
labels so undo is never mistaken for current history.

#### `engine.get_combatant_options`

```json
{
  "inputSchema": {
    "type": "object", "additionalProperties": false,
    "required": ["state_ref", "actor_id"],
    "properties": {
      "state_ref": { "$ref": "#/$defs/stateRef" },
      "actor_id": { "type": "string", "minLength": 1, "maxLength": 200 },
      "include_unavailable": { "type": "boolean", "default": false },
      "page": { "$ref": "#/$defs/page" }
    }
  },
  "outputSchema": {
    "type": "object", "additionalProperties": false,
    "required": ["state_ref", "actor_id", "status", "options", "truncated", "next_cursor"],
    "properties": {
      "state_ref": { "$ref": "#/$defs/stateRef" },
      "actor_id": { "type": "string" },
      "status": { "type": "object" },
      "options": { "type": "array", "items": { "type": "object" } },
      "truncated": { "type": "boolean" },
      "next_cursor": { "type": ["string", "null"] }
    }
  }
}
```

Unavailable options carry stable refusal codes, not only prose. This surface is
generated from canonical engine action forms; it must never independently
reconstruct statblocks as the prototype does.

#### `engine.query_path`

```json
{
  "inputSchema": {
    "type": "object", "additionalProperties": false,
    "required": ["state_ref", "actor_id", "objective", "movement"],
    "properties": {
      "state_ref": { "$ref": "#/$defs/stateRef" },
      "actor_id": { "type": "string", "minLength": 1, "maxLength": 200 },
      "objective": {
        "oneOf": [
          { "type": "object", "additionalProperties": false, "required": ["kind", "action_id", "target"],
            "properties": { "kind": { "const": "enable_action" }, "action_id": { "type": "string" }, "target": { "$ref": "#/$defs/targetSelector" } } },
          { "type": "object", "additionalProperties": false, "required": ["kind", "target"],
            "properties": { "kind": { "enum": ["approach", "maintain_range_from", "withdraw_from"] }, "target": { "$ref": "#/$defs/targetSelector" } } }
        ]
      },
      "movement": { "$ref": "#/$defs/movementPreference" },
      "engagement": { "$ref": "#/$defs/engagement" }
    }
  },
  "outputSchema": {
    "type": "object", "additionalProperties": false,
    "required": ["state_ref", "feasible", "minimum_feet", "risks", "resulting_relation"],
    "properties": {
      "state_ref": { "$ref": "#/$defs/stateRef" },
      "feasible": { "type": "boolean" },
      "minimum_feet": { "type": ["integer", "null"], "minimum": 0 },
      "risks": { "type": "array", "items": { "type": "object" } },
      "resulting_relation": { "type": ["string", "null"] },
      "refusals": { "type": "array", "items": { "type": "object" } }
    }
  }
}
```

#### `engine.query_reach`, `engine.query_cover`, and `engine.query_visibility`

These share a small schema and can accept up to 50 target pairs in one call.
Batching is important: comparing six targets must not require eighteen calls.

```json
{
  "inputSchema": {
    "type": "object", "additionalProperties": false,
    "required": ["state_ref", "queries"],
    "properties": {
      "state_ref": { "$ref": "#/$defs/stateRef" },
      "queries": {
        "type": "array", "minItems": 1, "maxItems": 50,
        "items": {
          "type": "object", "additionalProperties": false,
          "required": ["query_id", "actor_id", "target"],
          "properties": {
            "query_id": { "type": "string", "minLength": 1, "maxLength": 100 },
            "actor_id": { "type": "string", "minLength": 1, "maxLength": 200 },
            "target": { "$ref": "#/$defs/targetSelector" },
            "action_id": { "type": "string", "minLength": 1, "maxLength": 200 },
            "after_movement": { "$ref": "#/$defs/movementPreference" },
            "engagement": { "$ref": "#/$defs/engagement" }
          }
        }
      }
    }
  },
  "outputSchema": {
    "type": "object", "additionalProperties": false,
    "required": ["state_ref", "results"],
    "properties": {
      "state_ref": { "$ref": "#/$defs/stateRef" },
      "results": {
        "type": "array",
        "items": {
          "type": "object", "additionalProperties": false,
          "required": ["query_id", "status"],
          "properties": {
            "query_id": { "type": "string" },
            "status": { "enum": ["yes", "no", "conditional", "unknown"] },
            "facts": { "type": "object" },
            "refusals": { "type": "array", "items": { "type": "object" } }
          }
        }
      }
    }
  }
}
```

The tool-specific `facts` are closed in the real generated schemas:

- reach: current distance band, action range/reach, reachable now, reachable
  after permitted movement, and minimum movement;
- cover: engine cover tier and the semantic sources contributing to it;
- visibility: actor-can-perceive-target, target-can-perceive-actor, required
  sense, and stable obstruction/reason codes.

No query consumes RNG or changes reaction windows.

Intent v1 deliberately has only four engagement stances:
`hold_position`, `close_to_melee`, `maintain_range`, and `withdraw`.
`protect_ally` and `seek_cover` are deferred until their canonical engine
objective functions are separately specified; the MCP contract does not expose
names whose geometry would currently be an adapter guess.

#### `engine.query_dice_expectation`

```json
{
  "inputSchema": {
    "type": "object", "additionalProperties": false,
    "required": ["state_ref", "candidates"],
    "properties": {
      "state_ref": { "$ref": "#/$defs/stateRef" },
      "candidates": {
        "type": "array", "minItems": 1, "maxItems": 20,
        "items": {
          "type": "object", "additionalProperties": false,
          "required": ["candidate_id", "actor_id", "choice"],
          "properties": {
            "candidate_id": { "type": "string", "minLength": 1, "maxLength": 100 },
            "actor_id": { "type": "string", "minLength": 1, "maxLength": 200 },
            "choice": { "$ref": "#/$defs/actionChoice" },
            "movement": { "$ref": "#/$defs/movementPreference" },
            "engagement": { "$ref": "#/$defs/engagement" }
          }
        }
      },
      "include_distribution": { "type": "boolean", "default": false }
    }
  },
  "outputSchema": {
    "type": "object", "additionalProperties": false,
    "required": ["state_ref", "results"],
    "properties": {
      "state_ref": { "$ref": "#/$defs/stateRef" },
      "results": {
        "type": "array",
        "items": {
          "type": "object", "additionalProperties": false,
          "required": ["candidate_id", "resolvable", "metrics"],
          "properties": {
            "candidate_id": { "type": "string" },
            "resolvable": { "type": "boolean" },
            "metrics": { "type": "object" },
            "assumptions": { "type": "array", "items": { "type": "string" } },
            "refusals": { "type": "array", "items": { "type": "object" } }
          }
        }
      }
    }
  }
}
```

Expectations are analytic results from the same resolution inputs the reducer
would use: outcome probability, expected damage/healing, resource cost, and an
optional bounded distribution. The query never rolls dice, advances RNG, or
guesses an absent mechanic. An unmodelled value is `resolvable: false`, not a
fallback number.

### 4.3 Intent proposal tools

#### `engine.validate_intent`

```json
{
  "inputSchema": {
    "type": "object", "additionalProperties": false,
    "required": ["state_ref", "request_id", "phase", "intent"],
    "properties": {
      "state_ref": { "$ref": "#/$defs/stateRef" },
      "request_id": { "type": "string", "minLength": 1, "maxLength": 200 },
      "phase": { "enum": ["initial", "correction"] },
      "intent": { "$ref": "#/$defs/turnIntent" }
    },
    "allOf": [
      {
        "if": { "properties": { "phase": { "const": "correction" } } },
        "then": { "properties": { "intent": { "properties": { "fallback": { "type": "null" } } } } }
      }
    ]
  },
  "outputSchema": {
    "type": "object", "additionalProperties": false,
    "required": ["state_ref", "valid", "selected_branch", "resolution", "refusals"],
    "properties": {
      "state_ref": { "$ref": "#/$defs/stateRef" },
      "valid": { "type": "boolean" },
      "selected_branch": { "enum": ["primary", "fallback", "none"] },
      "resolution": { "type": ["object", "null"] },
      "refusals": { "type": "array", "items": { "type": "object" } },
      "correction_guidance": { "type": ["object", "null"] }
    }
  }
}
```

`resolution` is a preview such as “move as little as necessary while avoiding
the listed opportunity windows, then use action X on target Y.” Internally it
may carry an opaque resolution digest for later revalidation, but it exposes no
path cells. Validation is pure and idempotent.

#### `engine.submit_round_intents`

This is the normal D320.4 monster-round submission. It accepts exactly one
intent for every actor in `request.required_actor_ids`, with no missing,
duplicate, dead, already-controlled, or extra actor. Array order is not
meaningful; the server canonicalizes by the engine's shared-initiative order.

```json
{
  "inputSchema": {
    "type": "object", "additionalProperties": false,
    "required": ["state_ref", "request_id", "phase", "idempotency_key", "intents"],
    "properties": {
      "state_ref": { "$ref": "#/$defs/stateRef" },
      "request_id": { "type": "string", "minLength": 1, "maxLength": 200 },
      "phase": { "enum": ["initial", "correction"] },
      "idempotency_key": { "type": "string", "minLength": 16, "maxLength": 200 },
      "intents": {
        "type": "array", "minItems": 1, "maxItems": 50,
        "items": { "$ref": "#/$defs/turnIntent" }
      }
    },
    "allOf": [
      {
        "if": { "properties": { "phase": { "const": "correction" } } },
        "then": {
          "properties": {
            "intents": {
              "items": {
                "properties": { "fallback": { "type": "null" } }
              }
            }
          }
        }
      }
    ]
  },
  "outputSchema": {
    "oneOf": [
      {
        "type": "object", "additionalProperties": false,
        "required": ["status", "round_proposal_id", "state_ref", "actor_resolutions"],
        "properties": {
          "status": { "const": "proposed" },
          "round_proposal_id": { "type": "string", "minLength": 1, "maxLength": 200 },
          "state_ref": { "$ref": "#/$defs/stateRef" },
          "actor_resolutions": {
            "type": "array", "minItems": 1, "maxItems": 50,
            "items": {
              "type": "object", "additionalProperties": false,
              "required": ["actor_id", "selected_branch", "resolution_digest", "summary"],
              "properties": {
                "actor_id": { "type": "string", "minLength": 1, "maxLength": 200 },
                "selected_branch": { "enum": ["primary", "fallback"] },
                "resolution_digest": { "type": "string", "minLength": 64, "maxLength": 128 },
                "summary": { "type": "string", "minLength": 1, "maxLength": 500 }
              }
            }
          }
        }
      },
      {
        "type": "object", "additionalProperties": false,
        "required": ["status", "state_ref", "actor_refusals", "correction_guidance"],
        "properties": {
          "status": { "const": "rejected" },
          "state_ref": { "$ref": "#/$defs/stateRef" },
          "actor_refusals": {
            "type": "array", "minItems": 1, "maxItems": 50,
            "items": {
              "type": "object", "additionalProperties": false,
              "required": ["actor_id", "codes", "summary"],
              "properties": {
                "actor_id": { "type": "string", "minLength": 1, "maxLength": 200 },
                "codes": {
                  "type": "array", "minItems": 1, "maxItems": 20,
                  "items": { "type": "string", "minLength": 1, "maxLength": 100 }
                },
                "summary": { "type": "string", "minLength": 1, "maxLength": 500 }
              }
            }
          },
          "correction_guidance": {
            "type": "object", "additionalProperties": false,
            "required": ["remaining_corrections", "required_actor_ids", "replace_whole_round"],
            "properties": {
              "remaining_corrections": { "enum": [0, 1] },
              "required_actor_ids": {
                "type": "array", "minItems": 1, "maxItems": 50, "uniqueItems": true,
                "items": { "type": "string", "minLength": 1, "maxLength": 200 }
              },
              "replace_whole_round": { "const": true }
            }
          }
        }
      }
    ]
  }
}
```

The proposal is atomic at the proposal boundary:

- all intents are validated against one immutable state handle, branch, request,
  and revision;
- if any actor is absent, extra, structurally invalid, mechanically invalid, or
  cannot resolve either primary or fallback, no actor proposal is spooled;
- the DM client revalidates the complete set against that same revision and
  either authorizes the whole round proposal or refuses it; partial acceptance,
  subset rebasing, and “accept the legal actors” are forbidden;
- any state/revision change before authorization invalidates the entire round
  proposal. The correction resume must submit a complete replacement for the
  request's required actor set, not a patch, and correction intents have no new
  fallback;
- after whole-round authorization, authoritative turns execute sequentially and
  are not rolled back. If an already-authorized later intent is invalidated by
  earlier turn results, the engine tries that actor's declared fallback. If it
  also fails, the remaining unexecuted suffix becomes one fail-closed correction
  request; a failed correction sends every still-required actor in that suffix
  through the deterministic controller and marks each auto-resolved.

Thus “partial acceptance forbidden” governs authorization, while ordinary
sequential execution never pretends already-journaled turns were atomic or
reversible.

#### `engine.submit_intent`

This is the takeover/mixed-control-seat path. The happy path does not require a
preceding `validate_intent`: submission runs the same validator itself. It must
refuse an actor currently required by a pending D320.4 whole-round request,
unless the DM host has explicitly reclassified that actor as a separately
controlled seat before the capsule was minted.

```json
{
  "inputSchema": {
    "type": "object", "additionalProperties": false,
    "required": ["state_ref", "request_id", "phase", "idempotency_key", "intent"],
    "properties": {
      "state_ref": { "$ref": "#/$defs/stateRef" },
      "request_id": { "type": "string", "minLength": 1, "maxLength": 200 },
      "phase": { "enum": ["initial", "correction"] },
      "idempotency_key": { "type": "string", "minLength": 16, "maxLength": 200 },
      "intent": { "$ref": "#/$defs/turnIntent" }
    },
    "allOf": [
      {
        "if": { "properties": { "phase": { "const": "correction" } } },
        "then": { "properties": { "intent": { "properties": { "fallback": { "type": "null" } } } } }
      }
    ]
  },
  "outputSchema": {
    "oneOf": [
      {
        "type": "object", "additionalProperties": false,
        "required": ["status", "proposal_id", "state_ref", "selected_branch", "resolution_summary"],
        "properties": {
          "status": { "const": "proposed" },
          "proposal_id": { "type": "string" },
          "state_ref": { "$ref": "#/$defs/stateRef" },
          "selected_branch": { "enum": ["primary", "fallback"] },
          "resolution_summary": { "type": "object" }
        }
      },
      {
        "type": "object", "additionalProperties": false,
        "required": ["status", "state_ref", "refusals", "correction_guidance"],
        "properties": {
          "status": { "const": "rejected" },
          "state_ref": { "$ref": "#/$defs/stateRef" },
          "refusals": { "type": "array", "items": { "type": "object" } },
          "correction_guidance": { "type": ["object", "null"] }
        }
      }
    ]
  }
}
```

Repeating an identical idempotency key and canonical intent returns the original
`proposal_id`. Reusing the key with different bytes is a tool error. A proposal
is not “accepted,” “executed,” or “applied”; those words are reserved for the DM
client's later journaled outcome.

### 4.4 Narration and adjudication

#### `engine.emit_narration`

```json
{
  "inputSchema": {
    "type": "object", "additionalProperties": false,
    "required": ["state_ref", "request_id", "idempotency_key", "voice", "text", "audience"],
    "properties": {
      "state_ref": { "$ref": "#/$defs/stateRef" },
      "request_id": { "type": "string", "minLength": 1, "maxLength": 200 },
      "idempotency_key": { "type": "string", "minLength": 16, "maxLength": 200 },
      "voice": { "enum": ["cinematic_visible_rolls", "terse_tactical", "rules_explicit", "terse_rule_citing_validation"] },
      "text": { "type": "string", "minLength": 1, "maxLength": 12000 },
      "audience": { "enum": ["shared", "dm_only"] },
      "rule_references": {
        "type": "array", "maxItems": 20,
        "items": {
          "type": "object", "additionalProperties": false,
          "required": ["rule_id", "source_locator"],
          "properties": {
            "rule_id": { "type": "string", "minLength": 1, "maxLength": 200 },
            "source_locator": { "type": "string", "minLength": 1, "maxLength": 300 }
          }
        }
      }
    }
  },
  "outputSchema": {
    "type": "object", "additionalProperties": false,
    "required": ["status", "narration_id", "state_ref"],
    "properties": {
      "status": { "const": "queued" },
      "narration_id": { "type": "string" },
      "state_ref": { "$ref": "#/$defs/stateRef" }
    }
  }
}
```

Each call appends a bounded chunk immediately, letting the bridge stream prose
to the UI while the model continues to reason. The UI labels narration as
pending until it confirms the matching revision. Narration cannot contain a
mechanical consequence object, and its text is never executed or fed into the
reducer. Rule references are checked against the allowlisted KB; unknown or
disallowed references are omitted with a visible warning rather than invented.

#### `engine.request_dm_adjudication`

```json
{
  "inputSchema": {
    "type": "object", "additionalProperties": false,
    "required": ["state_ref", "request_id", "actor_id", "subject", "reason", "blocking", "idempotency_key"],
    "properties": {
      "state_ref": { "$ref": "#/$defs/stateRef" },
      "request_id": { "type": "string", "minLength": 1, "maxLength": 200 },
      "actor_id": { "type": "string", "minLength": 1, "maxLength": 200 },
      "subject": { "type": "string", "minLength": 1, "maxLength": 300 },
      "reason": { "type": "string", "minLength": 1, "maxLength": 2000 },
      "blocking": { "type": "boolean" },
      "suggested_outcomes": {
        "type": "array", "maxItems": 5,
        "items": { "type": "string", "minLength": 1, "maxLength": 500 }
      },
      "idempotency_key": { "type": "string", "minLength": 16, "maxLength": 200 }
    }
  },
  "outputSchema": {
    "type": "object", "additionalProperties": false,
    "required": ["status", "adjudication_request_id", "state_ref"],
    "properties": {
      "status": { "const": "requested" },
      "adjudication_request_id": { "type": "string" },
      "state_ref": { "$ref": "#/$defs/stateRef" }
    }
  }
}
```

This creates a DM tray request, not an `adjudicate` command. It deliberately has
no hit-point delta, relocation, coordinate, roll, or arbitrary consequence
field. The human DM chooses through existing DM controls.

### 4.5 Host-only exhaustion operation

`mark_auto_resolved` is required by the DM flow but **must not be advertised by
`tools/list`**. If the model could call it, the agent could decide that its own
turn was exhausted and falsify telemetry. It is a host-only operation on the
bridge's `TurnExhaustionCoordinator`:

```json
{
  "$id": "engine.host.mark_auto_resolved.input",
  "type": "object", "additionalProperties": false,
  "required": [
    "run_id", "branch_id", "expected_revision", "request_id", "actor_id",
    "initial_proposal_id", "fallback_result", "correction_result",
    "controller_resolution_digest"
  ],
  "properties": {
    "run_id": { "type": "string" },
    "branch_id": { "type": "string" },
    "expected_revision": { "type": "integer", "minimum": 1 },
    "request_id": { "type": "string" },
    "actor_id": { "type": "string" },
    "initial_proposal_id": { "type": "string" },
    "fallback_result": { "enum": ["invalid", "invalidated", "absent"] },
    "correction_result": { "enum": ["invalid", "invalidated", "no_response"] },
    "controller_resolution_digest": { "type": "string", "minLength": 64, "maxLength": 128 }
  }
}
```

Only a deterministic-controller result minted for the same pending request
satisfies this operation. The coordinator asks the DM client to append the
`auto_resolved` transition beside the controller's ordinary authoritative
command. It cannot be reached through MCP dispatch, prompt text, a proposal
spool record, or a CLI adapter.

## 5. MCP protocol surface

### 5.1 Discovery and capabilities

The server implements the `2026-07-28` modern lifecycle:

- `server/discover` advertises exactly protocol `2026-07-28`, server identity,
  tools, resources with `subscribe` and `listChanged`, and prompts with
  `listChanged`;
- every request validates required
  `_meta.io.modelcontextprotocol/protocolVersion`, `clientInfo`, and
  `clientCapabilities` fields;
- there is no `initialize`/`notifications/initialized` handshake and no
  protocol-level session ID;
- list results are deterministic and carry `ttlMs`/`cacheScope` as specified;
- JSON-RPC parse, invalid-request, invalid-params, method-not-found, cancellation,
  and tool-execution errors use the protocol's current distinction. Invalid
  tool arguments are tool execution errors so an agent can self-correct;
- structured tool results conform to `outputSchema` and also include the compact
  serialized JSON as `TextContent` for clients that do not surface
  `structuredContent`.

The server does not declare roots, sampling, logging, elicitation, tasks, MCP
Apps, or Skills-over-MCP. Roots, sampling, and protocol logging are deprecated
in this protocol revision and would widen the boundary. Diagnostics go only to
bounded stderr; stdout remains newline-delimited MCP JSON-RPC.

### 5.2 Resources

The server exposes only the run selected at process launch:

| URI | Mutable? | Purpose |
|---|---:|---|
| `engine://run/{runId}/turn/current` | yes | Same compact state and request identity used by `get_turn_context`; highest-priority assistant resource. |
| `engine://run/{runId}/room/current` | yes | Room-tactical projection, bounded and paged by linked chunk URIs. |
| `engine://run/{runId}/revision/{revision}/turn` | no | Immutable snapshot for a known capsule revision. |
| `engine://run/{runId}/journal/{revision}/{cursor}` | no | One bounded history chunk, including active/void status. |
| `engine://run/{runId}/rules/{ruleId}` | no | One allowlisted KB entry plus required attribution metadata. |
| `engine://run/{runId}/schema/intent-v1` | no | Human-readable intent contract and examples with no game content. |

Resources use `application/json`. The server advertises exact current and
immutable URIs via `resources/list`, and parameterized journal/rule forms via
`resources/templates/list`. Unknown or expired URIs return `-32602` under the
current specification.

Clients may open `subscriptions/listen` with the current turn and room resource
URIs. If the capsule advances while the same resume is alive, the server emits
`notifications/resources/updated` for those stable URIs. A room transition also
emits `notifications/resources/list_changed` because immutable room/revision
resources changed.

These notifications are hints only. A CLI may not support subscriptions, and a
server process cannot notify a CLI that is not running between resumes. Every
resume prompt therefore includes a mandatory `recent_changes` delta from the
last journaled dispatch revision, and the first query returns the new state
handle. Missing a notification cannot produce stale execution because every
submission still checks the handle and revision.

### 5.3 Prompts and KB injection

The server exposes two prompts:

- `engine.plan_round(run_id, expected_revision, voice)` — system constraints,
  current-turn resource link, the intent schema link, the bounded rules entries
  selected by engine option IDs, the recent journal delta, and the instruction
  to use `get_turn_context` then `submit_round_intents` for the complete required
  actor set;
- `engine.correct_intent(run_id, expected_revision, request_id)` — the one
  structured validation refusal, remaining legal options, and an explicit
  statement that no fallback remains after this correction.

MCP prompts are user-controlled templates in the protocol, and support varies
across CLIs. The bridge therefore uses one pure `EnginePromptRenderer` as the
source for both `prompts/get` and the stdin boot/resume prompt. The two byte
representations are golden-tested after normalizing MCP message wrappers. A CLI
that ignores prompts still receives identical constraints; a CLI that supports
them can expose them for inspection without creating a second policy.

KB selection is by engine-owned rule IDs, never free-text repository search.
The loader has an allowlist of packaged sources whose redistribution is
authorized and whose attribution is present. It rejects real paths beneath
`content/cc-by-sa`, symlinks into that tree, missing provenance, private-source
provenance, and any source with obligations beyond the adopted attribution-only
wall. Imported/homebrew mechanics may contribute typed state and option facts,
but never raw source prose to a resource or prompt.

### 5.4 Pagination and size discipline

MCP standard cursor pagination is implemented for `tools/list`,
`resources/list`, `resources/templates/list`, and `prompts/list`, even though
their initial inventories are small. Application data uses opaque cursors in
tool arguments and immutable resource chunk URIs because `resources/read`
itself has no page parameter.

An application cursor is MAC-bound to run ID, state digest, query kind,
normalized filters, offset, and an expiry within the current CLI invocation.
Changing any filter or state returns `INVALID_CURSOR` or `STALE_STATE`; cursors
are never carried across resumes.

Budgets are UTF-8 bytes before MCP framing:

- `get_turn_context`: 32 KiB default, 64 KiB hard maximum;
- any other tool result: 64 KiB;
- one resource content: 128 KiB;
- 100 journal entries, 50 pair queries, 20 expectation candidates, and 20
  options per actor at most;
- narration chunks: 12,000 characters and 20 rule references.

Every collection response says `truncated` and gives `next_cursor: null|string`.
Truncation never silently omits the active actor, request identity, state
handle, or refusal that caused a correction. Deterministic ordering is actor ID,
then stable engine action order, then target ID—not map iteration order.

## 6. Agent session lifecycle over four CLIs

### 6.1 Neutral types

```ts
type AgentCliKind = 'codex' | 'opencode' | 'pi' | 'claude-code';
type AgentSessionId = Brand<string, 'AgentSessionId'>;

interface AgentSessionBinding {
  readonly cli: AgentCliKind;
  readonly sessionId: AgentSessionId;
  readonly adapterVersion: number;
  readonly recoveryGeneration: number;
  readonly predecessorSessionHash: string | null;
  readonly startedAtRevision: number;
  readonly lastDispatchedRevision: number;
  readonly status: 'active' | 'superseded_after_resume_failure';
}

interface AgentInvocation {
  readonly runId: EncounterSessionId;
  readonly prompt: string;
  readonly model: string;
  readonly reasoningEffort: string;
  readonly launcherToken: string;
  readonly timeoutMs: number | null; // null by D396.5 unless explicitly cancelled
}

interface AgentTurnResult {
  readonly sessionId: AgentSessionId;
  readonly finalText: string;
  readonly usage: AgentUsage | null;
  readonly exit: 'completed' | 'cancelled';
}

interface AgentSessionAdapter {
  readonly kind: AgentCliKind;
  probe(): Promise<CliProbe>;
  start(invocation: AgentInvocation, signal: AbortSignal): Promise<AgentTurnResult>;
  resume(
    binding: AgentSessionBinding,
    invocation: AgentInvocation,
    signal: AbortSignal,
  ): Promise<AgentTurnResult>;
  classifyFailure(error: unknown):
    | 'cli_absent' | 'resume_not_found' | 'resume_corrupt'
    | 'authentication' | 'transport' | 'agent_exit' | 'unknown';
}
```

Adapters use `spawn(binary, argv, {shell: false})`; no model, prompt, session ID,
or MCP configuration is interpolated into a shell command. Prompts go through
stdin. Each adapter owns its argv placement, event decoder, session-ID
extraction, usage decoder, cancellation, and stderr cap. Core orchestration
never branches on CLI output syntax.

The Codex adapter may reuse the proven shape in `tools/ai-dm-arena.ts`: JSON
events, `thread.started.thread_id`, and `exec ... resume <id>`. It must place
shared flags before the resume subcommand and provide an ephemeral MCP server
configuration for the launcher token. That existing code is evidence for the
lifecycle parser, not the final adapter.

The Claude Code adapter is likewise evidence-based. Read-only inspection found
the installed `claude` binary at version `2.1.246`; its embedded help and the
repository's already measured `tools/ai-bridge/claude.ts` establish these exact
headless/MCP seams:

- start with `-p --output-format stream-json --verbose
  --include-partial-messages`;
- isolate MCP discovery with `--strict-mcp-config --mcp-config <JSON>` and
  disable user/project/local hooks and settings with `--setting-sources ""`;
- pass the explicit `mcp__engine__...` inventory through `--tools`, rather than
  the measured empty value that disables MCP tools too;
- keep `--permission-mode default`; the adapter still verifies the init event's
  exact `tools` and `mcp_servers` lists before admitting output;
- resume headlessly by adding `--resume <session-id>` to the same print-mode
  invocation; do not add `--no-session-persistence` or `--fork-session`;
- extract the opaque ID from the stream-json `system`/`init` event's
  `session_id`, which the installed binary documents as per-turn session
  metadata.

Those flags are locally evidenced, but the exact engine-tool allowlist behavior,
MCP protocol negotiation, ID stability, and resumed proposal flow remain
`UNVERIFIED` until the live adapter harness runs against this installed binary.
The harness must reject any init event that lists a built-in or non-engine MCP
tool; `--permission-mode` is not accepted as containment proof.

OpenCode and Pi adapters are specified against the same behavioral contract,
not guessed command lines. Their exact start/resume flags, MCP config format,
session event, and structured-output behavior are implementation inputs that
must be measured on an installed supported version and pinned in an adapter
fixture. No absent CLI gets a hand-written “probably correct” adapter marked
verified.

### 6.2 Where the ID lives

`SessionRevisionBody.codexSessionId` is replaced—not supplemented—with:

```ts
readonly agentSession: AgentSessionBinding | null;
```

It is `null` before the first fight. At the first fight the bridge performs a
cold-start boot exchange whose only job is to load the prompt/KB and return the
CLI session ID. The DM client appends an `agent_session_started` journal
transition containing the binding before any intent proposal is admitted.
Round 1 is then a resume, as are every later round, room transition, and the one
correction exchange. This ordering removes the current create-time chicken and
egg: the dungeon journal can exist before an agent conversation does.

Every later revision copies the binding exactly except a journaled update to
`lastDispatchedRevision` or an explicit recovery transition. Browser autosaves,
named saves, file saves, mirror revisions, undo branches, export, import, and
browser restore all carry it because it is part of the revision body. It is not
stored only in UI preferences, bridge memory, or a standalone local file.

Restoring a browser save resumes the binding at its active head. Moving the
journal head to an earlier branch restores that branch's binding and marks
later exchanges void in the next resume delta. The driver never chooses “most
recent ID” independently of the active journal head.

### 6.3 Resume failure and recovery

All failures pause the AI-controlled flow. Authentication, unknown failures,
malformed CLI output, proposal spool corruption, or capsule mismatch do **not**
start a replacement session automatically; the DM sees an exportable diagnostic
and chooses retry or abort.

Only a positively classified `resume_not_found` or `resume_corrupt` enters the
replacement procedure:

1. Retry the same resume once if the adapter identifies a potentially transient
   local-store read failure. Do not retry an explicit “session does not exist.”
2. Keep the encounter paused and build a `recovery_bootstrap` solely from the
   authoritative active journal: current state summary, party resources,
   current room/round/request, bounded active history, void-branch markers,
   pending correction state, narration IDs, engine version, and the hash (not
   raw ID) of the failed binding.
3. Cold-start the same CLI kind with that bootstrap. A different CLI requires an
   explicit DM selection because its behavior and session semantics materially
   change.
4. Persist `agent_session_recovered` with `recoveryGeneration + 1`, predecessor
   hash, failure classification, and new opaque ID before admitting proposals.
5. Resume the pending round/correction against a freshly generated state handle.

There is still only one active conversation at a time; recovery creates a
visible successor in a chain and permanently supersedes the failed ID. It does
not pretend that literal conversational memory survived. Replay correctness
comes from the journal bootstrap, not from reconstructing or forging a vendor
transcript.

The supervisor accepted this explicit recovery successor as the sole exception
to the literal single-conversation wording. It does not authorize a provider
switch, parallel conversations, or silent recovery for any other failure class.

## 7. Exhaustion, correction, and DM adjudication state machines

### 7.1 Intent exhaustion

```text
initial complete-round submit
  | every actor resolves primary/fallback -> atomic round proposal queued
  | any actor exhausts primary + fallback -> nothing spooled
  v
one correction resume (same CLI session, complete required actor set)
  | every actor valid ------------------> atomic replacement proposal queued
  | invalid/invalidated/no response
  v
deterministic controllers resolve every still-required actor in fixed order
  v
host-only mark_auto_resolved per actor + ordinary authoritative transitions
```

The current prototype and bridge permit two correction attempts. D396.4
supersedes that: the real constant is `MAX_INTENT_CORRECTIONS = 1`. A stale state
between validation and DM authorization counts as invalidation at the same
stage; it does not silently earn extra agent calls.

The deterministic controller is invoked by the DM host against its current
state, not by MCP against a capsule. Its result is marked `auto_resolved` with
the failure chain and surfaced in the timeline/transcript. If the deterministic
controller itself cannot produce a legal command, the encounter pauses for DM
adjudication; it never skips or guesses.

### 7.2 DM adjudication

An agent can identify a missing engine rule using
`request_dm_adjudication`. That adds a non-mutating tray entry. The DM may use
the VTT's existing explicit adjudication controls, whose reducer event remains
paused/highlighted/audited. There is intentionally no round trip in which the
agent proposes a raw HP delta or relocation through MCP.

## 8. Security and licensing boundary

### 8.1 Proposer-only enforcement by construction

The MCP package must not import or receive any of these capabilities:

- `reduceEncounter` or an `EncounterCommandReducer`;
- `EncounterSessionJournal`, `BrowserSessionStore`, `MirrorSink`, or RNG;
- DM override command constructors;
- room/rest/save-manager mutations;
- browser storage, worker RPC, or fetch implementations.

Its constructor receives only:

```ts
interface EngineMcpDependencies {
  readonly stateSource: ReadonlyStateCapsuleSource;
  readonly queries: EngineQueryPort;
  readonly intents: PureIntentResolver;
  readonly proposals: ProposalSink;
  readonly narration: NarrationSink;
  readonly rules: AllowlistedRulesSource;
  readonly diagnostics: BoundedStderrSink;
}
```

An import-boundary test scans the production MCP dependency graph and fails if
any forbidden module becomes reachable. A second dynamic test gives every MCP
tool a store/reducer spy that throws on access and proves zero calls.

`ProposalSink` accepts only the closed `RoundIntentProposalEnvelope` or
single-seat `IntentProposalEnvelope`; it cannot accept `EncounterCommand` or
arbitrary JSON. The DM bridge decodes the spool, checks
request/revision/branch/complete actor set/idempotency, recomputes every intent
resolution against current authoritative state, and presents the atomic result
to the DM flow. Only the existing host can reduce resulting engine-owned
commands.

### 8.2 Refusals

The server refuses:

- any coordinate/path/cell property or arbitrary destination;
- raw attack modifiers, dice, DCs, damage, effect payloads, or commands;
- unknown action/target IDs and selectors that resolve to concealed information
  outside the selected DM projection;
- a submission for a non-pending actor or request, or a whole-round submission
  whose actor set is missing, duplicated, or extra;
- stale revision, branch, digest, handle, correction phase, or reused key with
  changed content;
- a second fallback during correction or a second correction;
- state resources outside the selected run;
- `file:`, `http:`, `https:`, or repository resource URIs;
- prompt/KB requests for unknown, private, unlicensed, or CC-BY-SA sources;
- oversized strings/arrays, invalid UTF-8, non-finite numbers, duplicate JSON
  keys, and output that fails its own schema.

Expected tactical invalidity returns stable codes and correction guidance.
Malformed protocol/input returns an MCP tool error. Security boundary failures
also write a bounded diagnostic to stderr with secrets and user content redacted.

### 8.3 Content and prompt injection

Combatant names, homebrew labels, narration, and imported content are untrusted
data. Prompts frame them in canonical JSON data blocks after fixed instructions.
No user-authored string can become a tool description, prompt role, resource
URI, schema key, CLI argument, or path. Display text is bounded and control
characters are normalized.

The rules loader starts from a compiled manifest of allowed rule IDs and
licensed source locators. It has no general `readFile(path)` API. The package
includes the required attribution wherever SRD-derived machine-readable text is
returned. Tests plant attractive sentinel text under `content/cc-by-sa` and
prove it cannot appear in tool results, resources, prompts, narration
references, package tarballs, or stderr.

### 8.4 Local-only operation

The production binary accepts MCP only on stdin/stdout, writes diagnostics to
stderr, and uses only its bridge-owned temporary capsule/spools. It never calls
`fetch`, creates a socket/server, binds a port, performs DNS, loads remote MCP
servers, follows remote resource links, or reads agent roots. Package tests
replace network primitives with throwing sentinels. The CLI itself is launched
in its strongest available local read-only/no-network mode, but CLI flags are a
defense layer rather than the proposer boundary.

## 9. Testing and proof

### 9.1 Protocol conformance

Pin the official
[`@modelcontextprotocol/conformance`](https://github.com/modelcontextprotocol/conformance)
package by exact version and lockfile integrity, and always pass
`--spec-version 2026-07-28`. The framework is still evolving around this new
protocol, so every bump requires reviewing the scenario list and an explicit
baseline diff; broad expected-failure files are forbidden.

The documented upstream server runner currently targets a URL. Production must
not gain HTTP for its sake. Run the official suite against a **test-only
loopback adapter** over the same transport-independent request handlers, then
run a byte-level parity suite proving the stdio dispatcher produces the same
JSON-RPC results. The test adapter is excluded from production imports and the
package artifact. Use the MCP Inspector CLI directly against the stdio binary
for discovery, list/read/get/call, error, and cancellation smoke tests.

Required protocol cases include:

- `server/discover`, supported-version rejection, and required per-request
  metadata;
- deterministic/cached paginated tool, resource, template, and prompt lists;
- tool input and output JSON Schema 2020-12 validation;
- structured content plus text mirror;
- resource reads, invalid URIs, subscriptions/listen correlation, updated and
  list-changed notifications;
- prompt get/arguments/list changed;
- malformed UTF-8/JSON, duplicate IDs, notification-without-response,
  cancellation, stderr/stdout separation, backpressure, and orderly EOF;
- proof that legacy `initialize` is rejected rather than falsely negotiated as
  `2025-03-26`.

### 9.2 Domain contract and golden transcripts

Golden transcripts are hand-authored fixtures with independently authored
expected facts; they are never regenerated from the server's output. At least:

1. complete in-range shared-initiative round proposed atomically in two calls;
2. movement required, geometry resolved without coordinate input/output;
3. primary invalid and declared fallback selected;
4. initial plus fallback fail, exactly one correction resumes;
5. correction fails, deterministic result marked auto-resolved by host only;
6. one actor invalid makes the whole round refuse with no partial spool, and a
   state advance before authorization invalidates the complete proposal;
7. room transition preserves the same CLI ID and emits/replays state delta;
8. undo marks the abandoned branch void and restores the active-head binding;
9. cover, visibility, reach, and expectation batch queries match direct
   canonical engine-service fixtures;
10. narration chunks stream but cannot affect a state digest;
11. adjudication request reaches the tray with no consequence command;
12. save/export/browser restore resumes the persisted adapter binding;
13. explicit resume-not-found creates one journaled successor bootstrap;
14. every coordinate-shaped and reducer-shaped payload refuses;
15. CC-BY-SA/private sentinel content never crosses any surface.

Each golden includes JSON-RPC request/response bytes, capsule digest, spool
bytes, final authoritative journal digest, and expected stderr. Mutation tests
remove revision checks, bypass proposal recomputation, admit a coordinate,
permit correction fallback, call a reducer from MCP, or let an absent CLI pass;
each retained test must fail.

### 9.3 Dry-run scripted client

`engine-mcp-dry-client` is a deterministic MCP client with no model. It:

1. launches the stdio server;
2. discovers capabilities;
3. reads the turn resource and opens a subscription;
4. calls `get_turn_context`;
5. chooses an action from fixture instructions, not production rankings;
6. submits one complete round-intent proposal and narration;
7. asks the test DM host to authorize/reduce the proposal;
8. replaces the capsule and asserts the resource update;
9. drives fallback, correction, auto-resolution, room transition, and EOF.

The dry client runs under delayed, duplicated, reordered spool reads and process
restart. It proves idempotency and fail-closed behavior without spending model
tokens or depending on any CLI.

### 9.4 CLI adapter conformance harness

The harness has two layers that must never be conflated:

- fake executable contract tests: deterministic parsers/argv/start/resume/error
  cases, reported as `SIMULATED`;
- installed-CLI live tests: real MCP discovery/tool call, start, ID extraction,
  resume of the same ID, state delta, proposal, narration, correction, and
  resume-failure classification, reported as `VERIFIED` only when every case
  passes on the recorded executable version.

The live command prints a table and writes a machine-readable report. Status is
one of `VERIFIED`, `FAILED`, or `UNVERIFIED`, never a boolean. Exit codes are:

- `0`: all four required CLIs are `VERIFIED`;
- `1`: at least one installed CLI was tested and `FAILED`;
- `2`: no failure occurred, but at least one required CLI is absent or otherwise
  `UNVERIFIED`.

An executable absent from `PATH` produces an immediate, loud line on stdout and
stderr such as `opencode: UNVERIFIED (CLI ABSENT)` and a report record with
`reason: "cli_absent"`. It is not skipped, marked expected, converted to a fake
pass, or hidden behind a green aggregate job. A separate unit-test job may be
green for simulated adapters, but its title and artifact must say `SIMULATED —
NOT LIVE CLI VERIFICATION`.

Current local evidence at design time:

| CLI | Present on this machine | Existing lifecycle evidence | D398 live status |
|---|---:|---|---|
| Codex | yes | `tools/ai-dm-arena.ts` starts/resumes and extracts `thread.started.thread_id`; full MCP adapter suite not yet run | **UNVERIFIED** |
| Claude Code | yes | Installed `claude` 2.1.246 help exposes headless stream JSON, strict MCP config, `--resume`, and init `session_id`; `tools/ai-bridge/claude.ts` records measured base argv; full MCP adapter suite not yet run | **UNVERIFIED** |
| OpenCode | no | none | **UNVERIFIED (CLI ABSENT)** |
| Pi | no | none | **UNVERIFIED (CLI ABSENT)** |

Implementation may merge with these loud `UNVERIFIED` rows. The playable and
release gates remain closed until all four adapters have a recorded `VERIFIED`
row on supported versions; no repository, simulated, or installed-subset result
may silently call the four-CLI matrix green.

## 10. Packaging and observability

The public repository contains a local npm workspace/package with:

- a production `engine-mcp` stdio binary;
- the bridge-side launcher and `AgentRunCoordinator`;
- the shared schemas and prompt renderer;
- explicit Codex, OpenCode, Pi, and Claude Code adapter modules;
- the dry client and conformance fixtures in test-only exports.

The VTT invokes the local package by an exact checked-in dependency/bin path,
not a floating registry `npx` download. Building a package tarball is a boundary
test; publishing is not part of D398. The artifact scan rejects fixtures,
private paths, CC-BY-SA sentinel bytes, test HTTP adapters, transcripts, state
capsules, and secrets.

Observability is local and append-only in the existing VTT telemetry/journal:
CLI kind/version, adapter version, conversation recovery generation, request
and revision IDs, tool names, duration, result byte counts, proposal/narration
IDs, corrections, auto-resolution, and token usage when available. It does not
record raw private rules prose, launcher tokens, spool paths, full CLI session
IDs outside the encrypted/local save boundary, or hidden content in shared
player logs. MCP protocol logging is not enabled; bounded stderr is for operator
diagnostics only.

D396.5 imposes no latency ceiling. There is no quality-degrading timeout in the
normal path. The user may cancel an invocation, process crashes still fail
closed, and narration chunks provide visible progress without changing the
mechanical result.

The no-ceiling rule applies to live tables only. Batch, arena, conversation,
dry-run, and CLI-conformance harnesses set explicit bounded timeouts so an
unattended run cannot hang indefinitely; a timeout is a loud failed or
unverified harness result, never a fabricated gameplay fallback.

## 11. Migration from the prototype

The prototype is useful evidence, not an interface to preserve. This pre-alpha
codebase should replace its wrong boundaries rather than wrap them.

### 11.1 What survives conceptually

- one small stdio entrypoint in `tools/engine-mcp-server.ts` (the implementation
  may move into a package and leave only a launcher);
- pure request handling separated from the line-reading main function;
- both `structuredContent` and a text representation;
- deterministic, read-only engine queries;
- the core idea behind `declareArenaIntent`: the agent declares action/target
  preferences and the engine resolves geometry, including a declarative
  fallback.

No current function or schema survives merely because a test calls it. A piece
survives only if it delegates to the canonical query/intent ports above.

### 11.2 What is replaced

| Prototype | Real server |
|---|---|
| MCP `2025-03-26` and `initialize` | MCP `2026-07-28`, `server/discover`, per-request metadata, modern result forms |
| Handwritten partial MCP types | Current schema/SDK-backed protocol layer plus pinned conformance tests |
| Fixture path as truth for process lifetime | Revision-digested state capsule from the authoritative DM projection |
| `state_summary` leaking positions/cells | Granular semantic projections with bounded resources |
| `path_cost(id, to: GridCell)` and returned path cells | Semantic `query_path` with engine-owned geometry |
| `acceptMelee` and `maxMovementFeet` | typed movement willingness, risk policy, and engagement stance |
| `declare_intent` only validates | separate pure validation and revision-bound proposal submission |
| arena-only statblock reconstruction and duplicate Dijkstra | canonical engine query and intent-resolution services |
| five input-only schemas | full input/output schemas, resources, subscriptions, prompts, pagination, caching, errors |
| no narration/adjudication/host exhaustion seam | separate narration sink, DM request proposal, and non-MCP host auto-resolution operation |
| no agent conversation abstraction | persisted neutral binding plus Codex/OpenCode/Pi/Claude-Code adapters and loud verification matrix |
| two bridge corrections | exactly one intent correction |

### 11.3 Replacement order

1. Freeze a small set of prototype transcripts as characterization input. They
   are not normative expected output.
2. Extract `EngineQueryPort` and `PureIntentResolver` from canonical combat/VTT
   services. Delete arena-specific geometry/statblock duplication once direct
   parity fixtures pass.
3. Add the read-only capsule projection/source and closed proposal/narration
   envelopes. Prove dependency and mutation boundaries before MCP wiring.
4. Replace the handwritten 2025 dispatcher with the 2026-07-28 transport-neutral
   handler and stdio binding. Land protocol conformance first.
5. Add the short-loop tool, focused queries, intent tools, resources,
   subscriptions, prompt renderer, and size/cursor enforcement.
6. Replace persisted `codexSessionId` with `AgentSessionBinding`, including
   save/import migration while preserving existing user journal data. Wire cold
   start, every-round/room/correction resume, and recovery successor.
7. Add the host exhaustion coordinator and DM adjudication tray integration;
   remove the old two-correction path.
8. Implement adapters behind the neutral interface. Codex and Claude Code have
   local evidence but remain `UNVERIFIED` until the live harness passes;
   OpenCode and Pi remain visibly `UNVERIFIED (CLI ABSENT)` until installed and
   run through that same harness.
9. Run golden transcripts, dry client, mutation boundary tests, Inspector stdio
   smoke, official conformance through the test-only adapter, artifact scan,
   and the four-CLI live matrix.
10. Delete obsolete prototype schemas/helpers/tests whose subject is gone, then
    make `tools/engine-mcp-server.ts` invoke only the real package entrypoint.

No compatibility alias retains `path_cost`, `declare_intent`, the 2025
handshake, coordinate payloads, or the `CodexSessionId`-specific type. Any
retained fixture is rewritten as an independently falsifiable assertion against
the new boundary, not regenerated from new output.

## 12. Acceptance criteria

The design is implemented when all of the following are demonstrated:

- A complete D320.4 shared-initiative monster round can be proposed with
  `get_turn_context` plus `submit_round_intents`, with no coordinate in any
  agent input or output; `submit_intent` is limited to explicitly separate
  takeover/mixed-control seats.
- Whole-round proposal validation and DM authorization are all-or-nothing:
  actor-set mismatch, one invalid intent, or revision change produces no partial
  spool, acceptance, or implicit rebase.
- Direct canonical engine fixtures and every MCP query agree on legal options,
  geometry facts, cover, visibility, and expectations.
- No MCP import path or runtime call can reach reducer, journal, RNG, or DM
  override capabilities.
- Stale, duplicate, malformed, concealed, and wrong-actor proposals fail closed
  before the spool and again before DM authorization.
- Initial fallback, exactly one correction, and deterministic auto-resolution
  are journaled and mutation-tested.
- Narration streams independently and changing it cannot change a state digest.
- Browser restore, room transition, correction, undo, and ordinary rounds resume
  the binding at the active journal head.
- A classified lost resume creates one explicit, journal-bootstrapped successor;
  no other failure silently starts a new session.
- MCP `2026-07-28` conformance, stdio parity, dry client, goldens, security
  boundaries, and package artifact scans pass.
- Codex, OpenCode, Pi, and Claude Code each have a live `VERIFIED` report on
  pinned supported versions. An absent CLI produces `UNVERIFIED` and a
  non-green exit.
- Implementation is allowed to merge with loud `UNVERIFIED` adapter rows, but
  the playable and release gates remain closed until the live four-adapter
  matrix is fully `VERIFIED`.
- No production MCP code opens a network socket, and no KB/prompt/resource path
  can read `content/cc-by-sa` or private source prose.
