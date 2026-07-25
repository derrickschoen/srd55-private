# Worker RPC contract

The browser owns one module Worker. The Worker owns one synchronous
`DatabaseContext`; SQLite objects, statements, and callbacks never cross the Worker
boundary.

## Envelope

Requests always include `id`, an open-ended dotted `method` string, and `params` (use
`{}` for no parameters):

```json
{"id":1,"method":"system.info","params":{}}
```

Success and failure responses are discriminated by `ok`:

```json
{"id":1,"ok":true,"result":{}}
{"id":1,"ok":false,"error":{"code":"invalid_params","message":"..."}}
```

Error codes are `invalid_request`, `unknown_method`, `invalid_params`,
`handler_error`, and `transport_error`. Domain handlers may throw `RpcError` to retain
a deliberate code. Other exceptions become `handler_error`.

## Adding a handler

Add a module below `src/worker/handlers/` that exports a named `handlers` array.
Construct every entry with:

```ts
defineRpcHandler('catalog.import', isImportParams, (context, params) => {
  return context.db.transaction((db) => {
    // synchronous SQLite work
  });
});
```

`src/worker/registry.ts` eagerly discovers `./handlers/**/*.ts`, sorts module paths,
and rejects duplicate method names. There is no central method union or import list to
edit. A feature should expose its own typed client wrapper around
`RpcClient.call<P, R>()`.

Parameters require a runtime type guard. Results must be structured-cloneable DTOs.
Handlers may be async for browser storage APIs, but SQLite work remains synchronous
inside the Worker. Requests are dispatched serially so database replacement cannot
race another handler.

## Completeness

`queries.characters.completeness` takes `{character_id}` and returns
`{character_id, outstanding_count, catalog_gap_count, items, catalog_gaps}`. It
raises `CharacterNotFoundError` for an unknown id, as every other per-character
query does. `queries.characters.outstanding` takes `{}` and returns one
`{character_id, outstanding_count, catalog_gap_count}` per character, in the same
order as `queries.characters.list`.

Completeness means *"something is not chosen yet"* and is deliberately separate
from `warning_count`, which means *"something you chose is in conflict or
invalid"*. The two counters are never summed. `catalog_gap_count` counts distinct
gaps — one per set of choices sharing a constraint (spell lists, level range,
schools and tags) that no spell in the imported catalog can fill. Those are a
catalog problem, not outstanding work, so they are excluded from
`outstanding_count`. Both screens treat completeness as informational: if either
call fails the character list still renders its cards and the planner still
renders, minus the badges and the panel contents.

## Test inspection

`system.inspectRows` is included only outside production. It accepts one of the frozen
application table names and optional equality filters whose columns are verified using
`PRAGMA table_info`. It returns cloned row DTOs, capped at 500 rows. Browser tests use
this method to assert stored state rather than trusting rendered or derived output.
