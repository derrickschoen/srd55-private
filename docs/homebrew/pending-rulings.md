# Pending owner rulings — homebrew subclasses

This file no longer carries the queue. The digest compiled here on 2026-08-04
went stale within days — rulings landed in [`rulings.md`](rulings.md) (the
single source of record, newest first) while this file still listed the same
items as open. A queue that can silently disagree with the record is worse
than no queue, so by owner ruling 2026-08-11 the digest was cleared rather
than maintained.

The queue is derivable, not stored: every open item is an `OWNER-APPROVAL`
marker in the design doc it belongs to. To rebuild the current queue:

```
grep -rn 'OWNER-APPROVAL' docs/homebrew/cc-by/ docs/homebrew/ogl/
```

then strike anything a newer entry in `rulings.md` has since settled.

If a future session needs a compiled digest again, it goes here — dated, and
with the same caveat that `rulings.md` wins on any disagreement.
