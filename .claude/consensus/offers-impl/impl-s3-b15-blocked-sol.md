B15 is blocked by manifest drift. No files were changed.

The required raw-tag gate would reject three executable fixture values outside the ten allowed files:

- `tests/unit/tools/engine-mcp-server.test.ts:41`
- `tests/unit/vtt/blind-intent-resolver.test.ts:65`
- `tests/unit/vtt/offer-environment-board-sequence.test.ts:46`

Command:

```bash
rg -n --glob 'src/**' --glob 'tools/**' --glob 'tests/**' \
  "'engine-option-environment-v1'|'engine-offer-family-policy-v1'|'party-threat-catalog-v1'"
```

Each unauthorized occurrence is an actual `format` value passed to `createEngineOfferFamilyPolicy`, not a comment. B15 requires:

- rejecting all three raw tag literals outside `offer-codec-primitives.ts`;
- an empty residual grep across `src/tools/tests`;
- stopping if another path fails the newly enabled gate.

Therefore those three tests must import the new constant, but they are outside the allowed manifest.

Verified baseline:

```text
plan:     fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4
contract: 0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1
lock:     26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867
```

`git status --short --untracked-files=all` remains empty.

BLOCKED: B15 manifest must add engine-mcp-server.test.ts, blind-intent-resolver.test.ts, and offer-environment-board-sequence.test.ts so their raw format tags can be replaced by the sole exported constant.
tokens used
5,746,027
B15 is blocked by manifest drift. No files were changed.

The required raw-tag gate would reject three executable fixture values outside the ten allowed files:

- `tests/unit/tools/engine-mcp-server.test.ts:41`
- `tests/unit/vtt/blind-intent-resolver.test.ts:65`
- `tests/unit/vtt/offer-environment-board-sequence.test.ts:46`

Command:

```bash
rg -n --glob 'src/**' --glob 'tools/**' --glob 'tests/**' \
  "'engine-option-environment-v1'|'engine-offer-family-policy-v1'|'party-threat-catalog-v1'"
```

Each unauthorized occurrence is an actual `format` value passed to `createEngineOfferFamilyPolicy`, not a comment. B15 requires:

- rejecting all three raw tag literals outside `offer-codec-primitives.ts`;
- an empty residual grep across `src/tools/tests`;
- stopping if another path fails the newly enabled gate.

Therefore those three tests must import the new constant, but they are outside the allowed manifest.

Verified baseline:

```text
plan:     fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4
contract: 0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1
lock:     26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867
```

`git status --short --untracked-files=all` remains empty.

BLOCKED: B15 manifest must add engine-mcp-server.test.ts, blind-intent-resolver.test.ts, and offer-environment-board-sequence.test.ts so their raw format tags can be replaced by the sole exported constant.
