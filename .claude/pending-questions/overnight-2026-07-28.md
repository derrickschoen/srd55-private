# Overnight run — 2026-07-28

**The grant, verbatim:** *"I'm going to bed now. Keep working. Use your best guess
to get around blockers and save any questions to a file for when I get back. When
in doubt, research how it works on dndbeyond."*

So: nothing parks. A blocker gets a decision, the decision gets recorded here with
its reasoning, and every one of them is reversible. Where a rules or UX question
has an obvious answer in how D&D Beyond behaves, that is the tiebreaker.

**The licensing line still holds and is not negotiable.** Researching how a
D&D Beyond *interaction* works — what forking a spell does, what a level-up wizard
asks and in what order — is fine. Copying PHB prose, spell text, or any non-SRD
content into this repo is not, and no amount of "the owner said research it"
changes that. Only SRD 5.2.1 under CC-BY ships. See `docs/srd/ATTRIBUTION.md`.

---

## Decisions taken under the grant

Each is a best guess, each is reversible, each says what would change your mind.

### 1. D45 sub-decision — must a fork have a different name?

**Taken: the fork's name must differ from ITS SOURCE's name, and nothing more.**

D&D Beyond requires a distinct name when you copy a spell to homebrew, which is
the behaviour you cited. But global name uniqueness is a bigger claim than that
and the schema does not currently make it: `content_key` is UNIQUE on both
`spell_identities` and `spell_versions`, `display_name` is not. Two unrelated
homebrew spells sharing a name is legal today and breaking that would be a
migration with no stated reason.

So the constraint is local: forking Fireball gives you a row whose name is not
"Fireball". Default it to `Fireball (Copy)` and let the user rename, refusing
only a name equal to the source's.

**Reverse this if** you wanted true catalogue-wide unique names — that is a
different and larger change.

### 2. D45 sub-decision — does a fork record its ancestry?

**Taken: yes, one nullable `forked_from_content_key` on `spell_versions`.**

It costs one column, it is null for everything that exists today, and it lets the
UI say "based on Fireball" the way D&D Beyond does. Without it a fork is
indistinguishable from any other homebrew spell the moment it is renamed, and the
information cannot be recovered later.

D30 applies — the column is share-scoped and therefore a compile error until it
is classified in `tests/integration/sharing/column-portability.test.ts`. It will
be classified deliberately, not defaulted.

### 3. D45 sub-decision — do SRD spells travel in a share link?

**Taken: no change. They resolve by key, exactly like every other spell.**

The wire already carries `spellKey` and `spellName` per selection and resolves
against the recipient's catalogue. An SRD spell is not special on the wire — it is
a key that will resolve, more reliably than an imported one, because the recipient
has the bundled layer too. This is the least-change answer and it needs no new
version.

**Reverse this if** you want a link to survive a recipient on an older catalogue
that lacks a spell the sender has. That would mean carrying spell CONTENT on the
wire, which is a much larger format change and a licensing question of its own.

### 4. D45 sub-decision — do SRD rows appear in backups?

**Taken: no special-casing. Whole-database export carries them; portable
character backup does not, because it never carried catalogue rows.**

`system.exportDatabase` serialises the image, so SRD rows ride along for free and
a restore is exact. The portable per-character JSON carries references, not the
catalogue, and that stays true. Nothing to build.

**Known consequence, accepted:** a character backup restored on a build whose
bundled catalogue is older can reference a spell that build lacks. That is the
same failure an imported-catalogue reference already has, and the existing
missing-spell handling covers it.

### 5. A fork's provenance — the one that would have lost data

**Taken: `provenance = 'user'`, meaning "authored in this app, not carried by a
document".**

This was not on your list of sub-decisions; it surfaced while specifying the fork
work and it is the most dangerous of the five.

A fork is user-authored content that never came from an imported document. The
obvious choice is `'import'`, since that is what all user content carries today.
It is also wrong in a way that destroys data: the importer's tombstone sweep
(`catalog-importer.ts:451-457`) deactivates every `provenance = 'import'` row
absent from the document being imported. So a user who forks Fireball, then later
imports an unrelated homebrew document, would find their fork silently
deactivated. That is precisely the failure the sweep's own comment says was
already fixed once for subclasses.

`'user'` is deliberately broader than `'fork'`: a hand-authored spell that is not
a copy of anything will want the same exemption, and `forked_from_content_key`
already records whether a given row is a fork.

**Reverse this if** you would rather forks be swept along with imported content —
but that means a user's own work disappears on an unrelated import, so I doubt it.

### 6. Does a fork keep its class-list memberships?

**Taken: yes, copied.**

A copied Fireball is still a Wizard spell. A fork belonging to no list would be
invisible to the planner's list-driven pickers and would read as broken. D&D
Beyond behaves this way too — a homebrew copy stays on the lists its original was
on until you change them.

---

## Questions I could NOT reasonably guess

Nothing here blocked; each has a working assumption in place.

### Q — do share links carry content for spells the recipient does not have?

Not guessed, because the answer is partly a licensing call that is yours.

**The gap, measured:** an imported homebrew spell does NOT survive a share link
when the recipient lacks that catalogue entry. The character opens, the spell
becomes a placeholder, and for spellbook-only references even the original
display name is lost — it is derived from the key. Forks now behave identically,
deliberately, so this is one gap and not two.

**Why I did not just fix it.** Fixing it means putting spell CONTENT on the wire.
For a fork of a bundled spell that content is SRD-derived, and SRD 5.2.1 is CC-BY
— redistribution requires attribution, and whether a URL fragment satisfies that
is a genuine question. It also means a new wire version, which D41 makes
permanent. Both are decisions to take awake.

A dispatch reached for exactly this overnight and I refused it — see F24.

**Options when you are back:** leave it (a link is a reference, and the recipient
needs the catalogue); carry content for user-authored spells only; or carry
content for everything and settle the attribution question.

---

### 7. Where the Bard's musical instrument goes — decided by NOT storing it

**Taken: state it, do not store it.** The picker says the grant also includes one
musical instrument of the player's choice and that the app does not track it.

My first spec told codex to put it "wherever character-level free text already
lives", and codex correctly did exactly that — `characters.notes`. That was my
error, and it was a bad place for three reasons: D37 ruled notes OPT-IN for
sharing, so a mechanical proficiency would travel only if the sharer opted their
notes in; a user tidying their own notes would silently delete a proficiency; and
the notes length limit could make CHOOSING A SKILL throw.

Not storing it follows your own ruling in D42 §4 about spell focuses — *"assume
the player will figure out any needed spell focus and sort it out at the table"* —
and D26/D35, under which an instrument earns no structure because it changes no
number on the sheet. "Just text" turned out to mean "do not build a vocabulary
for it", not "write it into the user's field".

**Reverse this if** you want the instrument recorded. It then needs a home the
APP owns, not the user's notes.

---

## What landed overnight

Eleven tracks, each gated by me independently before merge — `npm test`,
`npm run build`, `npm run db:migrations`, and the browser suite on a unique port
— with a mutation on the load-bearing new assertion of each.

| | merge | what |
| --- | --- | --- |
| 1 | `635d45a` | database migration runner |
| 2 | `94ade91` | weapon range as a tagged value, migrated in two steps |
| 3 | `0160fc7` | share wire v2 and the v1→v2 migration |
| 4 | `98c8d61` | SRD spell descriptions and eight class lists extracted |
| 5 | `3a4b319` | the bundled catalogue, read-only — the app now works on first open |
| 6 | `fecb2cb` | fork a bundled spell into user-owned content |
| 7 | `b640405` | one `characterLevel()`, absence in the type |
| 8 | `e51ba2a` | the multiclass skill choice a player could never make |
| 9 | `6f8a6bf` | class Starting Equipment re-extracted, un-truncated |
| 10 | `e479549` | ability-score generation, incl. Standard Array by Class |
| 11 | `b70a75f` | the `coin` kind retired, per D40 |
| 12 | `0fcb31a` | class starting equipment modelled and seeded |

Findings recorded: **F20** (what drizzle-kit actually emits), **F21** (a correct
FK ordering nothing held correct), **F22** (one rule written as two expressions),
**F23** (a merge I ran from inside the worktree, twice), **F24** (the wire freeze
was never enforced — the guard hashed the object, not the file), **F25** (seven
level sites, and a mutation that never applied), **F26** (a merged extract
truncated mid-word).

Numbers moved 2158 → **2231** vitest, 133 → **136** files, 72 → **75** browser,
59 → **60** tables.

## Where I stopped, and why

The next design items need YOU, not more autonomy:

- **Item 12** (persist weapon attack kind) adds a fact to `character_weapons`,
  which is share-scoped. D30 makes it a compile error until classified, and the
  only two answers are "omitted, so a shared custom weapon loses it" or a wire
  version bump — which D41 makes permanent. I refused exactly that bump earlier
  tonight (F24); taking it now by a side door would be worse.
- **Items 11, 13, 14** are projection, commands and UI. They decide how the
  builder BEHAVES, which is yours.
- **Item 3** (origin application, L) is the largest prerequisite left and the
  design calls the current state "designed and never built"
  (`db/schema/origins.ts:646-661`).

The wire question in the section above is now blocking two things rather than
one. It is the first thing worth answering.

## Running order for the night

1. `bqea0wc7s` — read-only SRD catalogue layer. Verify, gate, merge.
2. Fork-a-spell (D45), including sub-decisions 1 and 2 above.
3. The character-level unification: one `characterLevel()` shared by
   `spell-access-builder.ts:565` and `build-report-builder.ts:414`, which
   currently disagree. D42 §1 settled the display as "undetermined". F22's lesson
   applies directly — one rule written twice drifts.
4. D44's multiclass skill-choice UI. The schema already exists
   (`class_sheet_traits.multiclass_skill_choice_pool`); this is a UI gap.
5. The guided builder (D42). Largest unbuilt thing. Design first.
