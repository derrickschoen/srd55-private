# ACTOR-KNOWLEDGE-01 plan review r2 — gpt-6-astra (read-only)

Reviewed plan sha 8a719741… (650 lines) on 40f04e2c. Session 01a0a204-dbd5-7ba2-a95e-7ad00c21d5be. Log .tmp/runs/fanout/review-plan-actor-knowledge-r2.log.

# REJECT PLAN ACTOR-KNOWLEDGE

**Blocking finding: PAK2-F1.** Six R1 findings are closed in the revised design. Golden preservation remains incomplete; the SRD citation correction still points to the wrong file.

## Verified baseline

| Command | Result |
|---|---|
| `git rev-parse HEAD` | `40f04e2cad4d5d5e170d6caf0adb033e14252990` |
| `git status --short --untracked-files=all` | Clean before and after review |
| `wc -l .tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md` | **650 lines** |
| `sha256sum .tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md` | `8a719741f4c78a58ba6c13a8e9d904260532b5f437fe0ed0073b4adcb4685b10` |
| `sha256sum src/vtt/intel/contracts.ts` | `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1` |
| `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false` | Exit **0**, **0 diagnostics** |
| `node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false` | Exit **0**, **0 diagnostics** |
| `sg scan --config sgconfig.yml src tools tests` | Exit **0**, **0 findings** |
| `npx vitest list --configLoader runner --filesOnly --json` | **641 entries, 641 unique files** |

Both TypeScript build-info paths were checked and remain under `/tmp`. No Vitest execution, writes, model calls, or agents were used.

## Findings

### PAK2-F1 — P1: Canonicalization cannot preserve the existing raw-output hashes

**Plan:** [lines 455–462](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md:455), particularly **459**.

R2 correctly inventories both goldens and separates their legacy blocks and new-wire expectations. However, it now requires:

> canonicalize the normalized full object and compare its original exact byte length and sha256

Those original hashes cover ordinary `JSON.stringify` output, with insertion-order keys—not canonical JSON.

**Source probes:**

```bash
sed -n '2150,2185p' tools/ai-dm-conversation.ts
sed -n '2320,2360p' tools/ai-dm-conversation.ts
sed -n '545,557p;669,682p' tests/unit/tools/ai-dm-board-delivery.test.ts
cat src/commands/canonical-json.ts
```

Evidence:

- `tools/ai-dm-conversation.ts:2333` captures `JSON.stringify(value)`.
- `capturedTurnContext` preserves that raw string for structured output.
- The E1C assertion hashes the raw string.
- The footprint assertion performs two string replacements, then hashes it.
- `canonicalJson` recursively sorts object keys.

I also loaded the actual production runtime in memory and compared:

```ts
const raw = JSON.stringify(value);
const canonical = canonicalJson(JSON.parse(raw));
```

For the unchanged two-combatant DM context:

| Measurement | Raw | Canonicalized |
|---|---|---|
| Bytes | **7,317** | **7,317** |
| First key | `granularity` | `actor_knowledge` |
| SHA-256 | `37353a7960e75859f8533cdd79120d5ed1d78fd03a7f26de60cef0aab46e2a5c` | `db5d53821c8a218f05173626ac5216278b43eedbeb2f0e5ee82317ffe6034c94` |

Equality was **false**, before any actor-knowledge change. This was a serialization probe, not reproduction of either arena golden.

The tag’s **28 → 36 bytes** does not itself prevent normalization back to the historical bytes. Changing the full object’s serialization order does.

**Minimal change:**

- Replace “canonicalize” with the original insertion-order `JSON.stringify` serialization.
- Specify legacy block property order as well as values.
- First prove the normalizer preserves each existing golden on the unchanged fixture.
- Retain separate literal new-wire assertions and cap/trim assertions.
- If wire expansion changes fields outside the approved normalization, require a concrete invariant-backed plan amendment. Do not regenerate either hash.

The two retained oracles remain:

- **31,995 bytes**, `4071943750fc963ceac5a39fcd1baa71e9a3fd2dcc9bc539a1bb0bec4dc18e6d`
- **32,000 bytes**, `aa841063ad0512d0f6b286318db802526da3efc5265a04d8b67f4d8351909d51`

### PAK2-F2 — P3: Corrected SRD line numbers were attached to the wrong file

**Plan:** [lines 157, 164 and 167](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md:157).

**Exact read-only probe:**

```bash
node <<'NODE'
const fs = require('node:fs');
for (const f of [
  'docs/srd/source/spell-descriptions.txt',
  'docs/srd/full/srd-5.2.1.txt',
]) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  for (const n of [2167, 5533, 6434]) {
    console.log(`${f}:${n}`, lines[n - 1]);
  }
}
NODE
```

Output establishes:

| Line | `source/spell-descriptions.txt` | Plan’s `full/srd-5.2.1.txt` |
|---:|---|---|
| **2167** | Dimension Door relocation sentence | Bard class material |
| **5533** | Misty Step silvery-mist sentence | Pistol equipment row |
| **6434** | Ray of Frost blue-white beam sentence | Concentration text |

**Minimal change:** Change those three paths to `docs/srd/source/spell-descriptions.txt`. The substantive perception conclusions remain sound; the Invisible and Hide references were not affected by this correction.

## R1 closure audit

| R1 finding | R2 verdict | Independent evidence |
|---|---|---|
| **PAK1-F1 — transition inference** | **Closed in design** | Transition fields are removed. Actual reducer probes support the proposed recency values and preserved old cell. |
| **PAK1-F2 — false prose perception** | **Closed in design** | §2.7 explicitly replaces the offending all-target classification with exhaustive discriminants and **8 complete-output cases**. |
| **PAK1-F3 — goldens** | **Partial** | Both goldens are now inventoried; canonical serialization remains incompatible with their hashes. |
| **PAK1-F4 — discovery** | **Closed** | **2** absent `.test.ts` files; **641 + 2 = 643**. No stale `+1`, “plus one,” or `642` discovery claims found. |
| **PAK1-F5 — enforcement** | **Closed in design** | Exact sink, symbol resolution, serializer closure, **3 positive / 12 negative fixtures**, explicit mechanical inventory, and post-offers gate wiring. |
| **PAK1-F6 — overlap** | **Closed** | Recomputed **22 actor files**, **125 offers files**, **10 shared files**. |
| **PAK1-F7 — independent pin witnesses** | **Closed in design** | Schema and registry rows now name located/fog/history behavior, beyond generation equality and tag relations. **18 rows** counted. |
| **PAK1-F8 — citations** | **Not closed** | Correct line numbers, wrong source path: PAK2-F2. |

### Reducer-driven owner scenario

The in-memory production probe executed:

1. `roll_initiative`
2. Real `cast_spell` for Ray of Frost
3. Either `apply_effect` granting Invisible or an adjacent `move` with `cause: 'teleport'` into a fully fogged cell
4. An unrelated `end_turn` after invisibility

The cast reached **revision 2, round 1**, emitting:

```text
resource_spent, spell_cast, damage_applied, effect_applied, attack_resolved
```

Results:

| State | Current revision | Observation revision | Observation cell | Calculated age |
|---|---:|---:|---|---|
| Invisible | **3** | **2** | **(2, 1)** | `{rounds: 0, revisions: 1}` |
| Adjacent teleport into fog | **3** | **2** | **(2, 1)** | `{rounds: 0, revisions: 1}` |
| Already unseen, then unrelated command | **4** | **2** | **(2, 1)** | `{rounds: 0, revisions: 2}` |
| Synthetic previous-revision history | **3** | **2** | **(2, 1)** | `{rounds: 0, revisions: 1}` |

Both vanished variants produced the **same current projection**: suspected sorcerer, old cell `(2,1)`, without its current position or cause. The proposed added fields can express these timestamps without inventing a witnessed transition.

**Fixture detail:** A non-adjacent `move` from `(2,1)` to `(4,1)` with `cause: 'teleport'` was rejected:

```text
Illegal movement for combatant:sorcerer: non_adjacent_step at step 0 (4,1).
```

`movement.ts:369–370` applies adjacency checking to this command. The adjacent fogged-cell fixture succeeded. Implementation should specify that geometry, or use the actual spell teleport path for a non-adjacent destination; it should not change movement mechanics in this unit.

These probes establish current producer behavior and available history. The revised wire/prose implementation does not exist yet, so its expectations remain implementation obligations.

## Dimensions

| Dimension | Verdict | Evidence |
|---|---|---|
| **Single producer** | **Pass in design** | One canonical projection per selected actor; cached second producer removed; projection-only serializer and constructor restrictions. |
| **Knowledge model** | **Pass in design** | Recent old cell plus current uncertainty satisfies the owner’s example without exposing cause, destination, or an invented radius. |
| **Divergence closure** | **Pass** | Located, complete/partial fog, summon faction, and actor-owned history each have independent projection/wire expectations. |
| **Pins and invariants** | **Fail** | **18 rows** and improved semantic witnesses; PAK2-F1 prevents the prescribed golden preservation. |
| **Enforcement** | **Pass in design** | Symbol-resolved sink/closure handles the named bypasses; permitted mechanical consumers stay outside it. |
| **Batches** | **Pass** | **9/10/3 files**, **22 distinct**, **2 new specs**; no new compile-order blocker found. |
| **Overlap** | **Pass** | All **10** shared files covered; landed environment setup, independent oracles, and gate commands must survive. |
| **Verification/mutants** | **Pass in design, subject to F1** | **14 focused-spec commands**, **7 mutant rows**, corrected discovery, no regenerated expectations. No mutant execution claimed. |

The mechanical inventory matches **seven visibility calls** remaining after removal of the competing actor-report call. The offers gate’s `src tools tests` scan, architecture checks, and `test:gate` entrypoint are explicitly preserved before appending this checker.

The symmetric-evaluator bump remains justified: its public result embeds the changed projection and policy, even if selected commands remain unchanged. The scripted-party hash imports that version rather than retyping it.

**REJECT PLAN ACTOR-KNOWLEDGE — blocking list: PAK2-F1.**

ACTOR KNOWLEDGE PLAN REVIEW R2 DONE