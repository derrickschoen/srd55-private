# VIS-FIELD B4 r2 — sol BLOCKED report (fresh 01a0abb8…, 93 k tokens)

Blocked before further edits because the mandatory clean-`HEAD` tracked-fixture precondition is false.

Evidence:

- Initial worktree: 12 modified files, `64 insertions / 44 deletions`.
- Plan SHA verified: `6e8b3237f1876561fad5d18c1d2447eba6c914ef666b2a8e5daef2f97ef8fd2f`.
- `HEAD`: `9a3235da05b7fff5b3197e83f8c429809903be25`.
- Branch: `claude/vis-field`.

Clean archive command:

```sh
B4_CHECK=$(mktemp -d /tmp/vis-field-b4-check-XXXXXX)
git archive HEAD | tar -x -C "$B4_CHECK"
ln -s /home/vagrant/PhpstormProjects/dnd-wt-vis-field/node_modules "$B4_CHECK/node_modules"
cd "$B4_CHECK"
/home/vagrant/PhpstormProjects/dnd-wt-vis-field/node_modules/.bin/vite-node \
  tools/vtt-handoff/generate-fixtures.ts --check --root "$B4_CHECK"
```

Result: exit `1`:

```text
Error: FIXTURE_OUT_OF_DATE: fixtures/scenes/two-room.snapshots.v1.json
```

Tracked hashes before regeneration:

```text
6c481b2b98984c81b2d7b8c62d303a1241d2d5f0d9ebf640384d3ebb899d3dd6  fixtures/scenes/two-room.v1.json
3c2b7623771c12e19f79a90863ab239b7687c97f8803e62ad38ab0d096991d09  fixtures/scenes/two-room.snapshots.v1.json
9fc9a587d6be9899168e06846e114f14e5dba93c8bcd032f69c5d1ef2d99480d  fixtures/protocol/examples.v1.json
```

After the real generator:

```text
6c481b2b98984c81b2d7b8c62d303a1241d2d5f0d9ebf640384d3ebb899d3dd6  two-room.v1.json
76f102c408492e476c96a468d26323fb664a930d65733b787e906e7378dc7945  two-room.snapshots.v1.json
```

The snapshot regeneration changes eight field paths:

```text
$.players[0].snapshot.props
$.players[0].snapshot.vision.explored
$.players[0].snapshot.vision.visible
$.players[1].snapshot.lights
$.players[1].snapshot.props
$.players[1].snapshot.tokens
$.players[1].snapshot.vision.explored
$.players[1].snapshot.vision.visible
```

The clean-`HEAD` protocol producer check also fails:

```sh
npx vitest run --configLoader runner tests/unit/vtt/handoff-examples.test.ts \
  -t 'proves real service behavior independently before comparing tracked bytes'
```

Result: `1 failed / 5 skipped`; player A expected only the adventurer token but regenerated output also contains the goblin.

No additional worktree edits were made. Final checks:

- `git diff --check`: exit `0`
- Status remains exactly the original 12 modified files.
- Diff remains `64 insertions / 44 deletions`.
- `package-lock.json`: `26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867`

BLOCKED: clean-HEAD pre-B4 producers do not reproduce the old tracked snapshot/protocol bytes, violating mandatory D635.5 step 1.