# VIS-FIELD B4 r3 — sol read-only investigation (resumed 01a0abb8…, 230 k tokens)

## 1. Historical reproduction base

The requested writable archive command could not run because this round’s actual sandbox made `/tmp` read-only:

```sh
B4_BASE=$(mktemp -d /tmp/vis-field-b4-base-XXXXXX)
```

Result:

```text
mktemp: Read-only file system
```

I therefore loaded `git archive 75c2f44a` into memory, bundled the actual producers from that Git tree, executed `buildTwoRoomFixtures()` and `buildHandoffExamples()`, and compared their encoded bytes with the three tracked blobs.

Result: all three reproduce at `75c2f44a`, exit `0`.

```text
fixtures/scenes/two-room.v1.json
tracked=6c481b2b98984c81b2d7b8c62d303a1241d2d5f0d9ebf640384d3ebb899d3dd6
produced=6c481b2b98984c81b2d7b8c62d303a1241d2d5f0d9ebf640384d3ebb899d3dd6
equal=true

fixtures/scenes/two-room.snapshots.v1.json
tracked=3c2b7623771c12e19f79a90863ab239b7687c97f8803e62ad38ab0d096991d09
produced=3c2b7623771c12e19f79a90863ab239b7687c97f8803e62ad38ab0d096991d09
equal=true

fixtures/protocol/examples.v1.json
tracked=9fc9a587d6be9899168e06846e114f14e5dba93c8bcd032f69c5d1ef2d99480d
produced=9fc9a587d6be9899168e06846e114f14e5dba93c8bcd032f69c5d1ef2d99480d
equal=true
```

Historical provenance:

- `5c7f459b`: scene/source and snapshot bytes first reached their current hashes.
- `75fbf004`: protocol examples reached `9fc9a587…`.
- `75c2f44a`: all three production paths still reproduce those tracked bytes.

Therefore the D569 demonstration base is `75c2f44a`.

## 2. Static snapshot code path

At committed `HEAD` `9a3235da`:

1. `tools/vtt-handoff/generate-fixtures.ts:17` calls `buildTwoRoomFixtures()`.
2. `src/vtt/handoff/fixtures/two-room.ts:151-160` builds the encounter, iterates the two bindings, and calls:
   ```ts
   projectPlayerBoard(projectPlayerView(state, binding), IDLE)
   ```
3. `src/combat/visibility.ts:558` defaults ownership to the binding combatant.
4. `src/combat/visibility.ts:563-566` obtains the seat-scoped eligible observers.
5. `src/combat/visibility-field.ts:437-451` admits only living, placed, conscious, non-pending owned combatants.
6. `src/combat/visibility.ts:567-568` derives fog and reads Hidden state.
7. `src/combat/visibility.ts:573-594` filters non-owned combatants. The decisive condition is:
   ```ts
   !availableObservers.some((observer) =>
     canCombatantSee(state, observer, subject.profile.id))
   ```
8. `src/combat/encounter.ts:2229-2234` implements `canCombatantSee` as `detectCombatant(...).kind === 'seen'`.
9. `src/combat/encounter.ts:2185-2226` delegates optical sight to `sightToCreature`.
10. `src/combat/visibility-field.ts:395-423` evaluates the subject footprint.
11. `src/combat/visibility-field.ts:295-336` rejects a cell first when its trace blocks sight, then grades its illumination.
12. `src/vtt/encounter-projections.ts:327-350` maps the already-filtered combatants without adding any.
13. `src/vtt/encounter-board.ts:787-819` creates token models only from placed projected combatants.
14. `src/vtt/handoff/scene-snapshot.ts:182,203-217` serializes those token models.

## 3. The alleged contradiction

The premise is false for `two-room.snapshots.v1.json`.

The regenerated clean-`HEAD` static snapshot contains:

```text
players[0] player:adventurer
tokens: token:two-room-adventurer
visible=48 concealed=48

players[1] player:goblin
tokens: token:two-room-goblin
visible=56 concealed=40
```

Closed-door decision inputs for seat A:

```text
ownedIds     = [combatant:two-room-adventurer]
observerIds  = [combatant:two-room-adventurer]
hidden       = []
field (8,4)  = unseen
sight        = unseen / blocked
detection    = undetected / blocked
canSee       = false
snapshot     = [token:two-room-adventurer]
```

Seat B is symmetric:

```text
observerIds  = [combatant:two-room-goblin]
field (2,4)  = unseen
detection    = undetected / blocked
canSee       = false
snapshot     = [token:two-room-goblin]
```

The round-2 failure came from a different artifact: the dynamic protocol transcript. `tests/unit/vtt/handoff-examples.test.ts:405-407` asserts that every player-A event contains only the adventurer, but the transcript opens the door at `:316-318`.

Canonical opening changes the door to:

```ts
{ movement: false, lineOfSight: false, cover: 'none' }
```

at `src/vtt/dm-encounter-host.ts:319-322`.

With the door open, the focused probe returned:

```text
field (8,4) = seen
sight       = visible / seen / normal_sight
detection   = seen / normal_sight
blocksSight = false
visible     = 76
concealed   = 20
tokens      = adventurer, goblin
```

Thus the Vitest diff showing both tokens was one later door-open event, not `players[0]` of the static snapshot.

## 4. Classification

Classification is **(a): §3.3 is applied correctly**.

There is no extra observer, no B3 scope defect, and no handoff rule that lists tokens merely because their cells were explored or lit.

- Closed door: each seat lists only its owned token.
- Open door: seat A genuinely detects the goblin as `seen`, so the standard §3.3 creature-visibility rule lists it.
- Hidden is empty. Were the goblin Hidden, `src/combat/visibility.ts:593-594` would remove it before snapshot serialization.
- Owned-token retention is the `owned` short-circuit at `src/combat/visibility.ts:592-594`.

## 5. Hand derivation

The environment at `src/vtt/handoff/fixtures/two-room.ts:105-110` contains six explicitly bright cells:

```text
(2,4) (3,4) (4,4) (2,5) (3,5) (4,5)
```

The rest of the map is also bright: `environmentLightAt` returns `'bright'` for cells outside every region at `src/combat/world-objects.ts:230-239`. The goblin’s 60-foot darkvision therefore does not affect these results.

### Closed-door corner rays

Adventurer corners:

```text
A-top    = {(2,4),(3,4)}
A-bottom = {(2,5),(3,5)}
```

Goblin corners:

```text
G-top    = {(8,4),(9,4)}
G-bottom = {(8,5),(9,5)}
```

All 16 A→G rays:

- `A-top × G-top`: four row-line-4 rays, blocked by the shared edge between wall `(5,3)` and door `(5,4)`.
- `A-bottom × G-bottom`: four row-line-5 rays, blocked by the shared edge between door `(5,4)` and wall `(5,5)`.
- `A-top × G-bottom`: four diagonal rays enter door `(5,4)`.
- `A-bottom × G-top`: four diagonal rays enter door `(5,4)`.

All 16 G→A rays are the exact reverses:

- `G-top × A-top`: row-line-4 seam, blocked.
- `G-bottom × A-bottom`: row-line-5 seam, blocked.
- `G-top × A-bottom`: enters door `(5,4)`.
- `G-bottom × A-top`: enters door `(5,4)`.

Therefore neither token is mutually visible.

### Seat A

Every cell in columns `0..5`, rows `0..7`, has a clear route on the adventurer’s side or is a target blocker cell excluded from intervening blockers.

```text
Visible:   {(c,r) | 0 ≤ c ≤ 5, 0 ≤ r ≤ 7} = 48
Concealed: {(c,r) | 6 ≤ c ≤ 11, 0 ≤ r ≤ 7} = 48
Grades:    all visible cells are seen by normal sight
Tokens:    adventurer only
```

### Seat B

```text
Visible:   {(c,r) | 5 ≤ c ≤ 11, 0 ≤ r ≤ 7} = 56
Concealed: {(c,r) | 0 ≤ c ≤ 4, 0 ≤ r ≤ 7} = 40
Grades:    all visible cells are seen; darkvision is not needed
Tokens:    goblin only
```

Column 5 is visible to both sides because blocker cells are excluded when they are themselves the target; they remain blockers for rays continuing across the column.

## 6. Eight changed snapshot paths

| Changed path | Visibility-derived cause |
|---|---|
| `players[0].snapshot.props` | `visibility.ts:650-652` retains only world objects whose footprints are visible. A retains barrel and torch, losing right-side table and pillar. |
| `players[0].snapshot.vision.visible` | `visibility.ts:647` and `encounter-projections.ts:365` now emit the 48-cell owned-observer field. |
| `players[0].snapshot.vision.explored` | `scene-snapshot.ts:289-292` uses visible cells plus last-seen cells; there are no additional last-seen cells, so it equals the 48-cell visible field. |
| `players[1].snapshot.lights` | The torch is at concealed `(3,5)`, so its world object is removed before `scene-snapshot.ts:274-287` derives object lights. |
| `players[1].snapshot.props` | Same footprint visibility filter; B retains table and pillar, losing left-side barrel and torch. |
| `players[1].snapshot.tokens` | `visibility.ts:593-594` removes the non-owned adventurer because `canCombatantSee` is false. |
| `players[1].snapshot.vision.visible` | The goblin-owned field is exactly 56 cells, columns `5..11`. |
| `players[1].snapshot.vision.explored` | No additional last-seen cells; it equals the 56-cell visible field. |

## Final audit

- No worktree edits made.
- Status remains the original 12 modified files.
- Diff remains `64 insertions / 44 deletions`.
- `git diff --check`: exit `0`.
- Plan SHA: `6e8b3237f1876561fad5d18c1d2447eba6c914ef666b2a8e5daef2f97ef8fd2f`.
- `package-lock.json`: `26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867`.

B4 INVESTIGATION DONE