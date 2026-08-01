# DISPATCH DOC-C — D139 character reference closure in the portable export (L, MINT, wt/mint2, PLAYWRIGHT_PORT=44530)

You are in /home/vagrant/PhpstormProjects/dnd-wt-mint2 (branch wt/mint2). The
supervisor branched this worktree from the MINT LANE TIP, not from main, so it
already contains the FF-A unit's unmerged migration 0027 and wire v17. Run NO
git commands.

**INHERITED, NOT YOURS:** migration 0027 and wire v17 belong to FF-A, which is
still in review. Treat them exactly as you treat frozen artifacts — read them,
build on them, never edit them. You own the NEXT free numbers after those.
Verify every registry tail before minting. If your work appears to require
editing 0027 or v17, STOP and report that as a finding instead of doing it.

THE BINDING PLAN is docs/design/2026-08-01-party-storage.md, unit **DOC-C** in
section 12, together with the sections it references for the closure
projection and the CI-2a preview/commit path.

## Governing rulings (verify each in .claude/decisions.md)

- **D139**: a single-character export carries exactly that character's
  homebrew REFERENCE CLOSURE — its species/background/subclass/effects and
  everything those transitively reference — and NOT the whole local library.
  Unrelated library content stays home. The separate whole-or-subset library
  document is DOC-L's, not yours.
- **D81**: two people exchanging exports converge; re-import duplicates
  nothing. **D62**: import clones into a fresh identity.
- **CI-2a** resolver semantics stand: an exact derived-key match with
  byte-identical canonical bytes adopts silently; a metadata conflict goes to
  review; an equal digest with different bytes throws a collision. The closure
  must flow THROUGH that resolver, never around it.
- **D59** licensing: an export is a redistribution channel; carry only what the
  character actually references.
- **D110**: historical documents are read absent-not-invented — never fabricate
  closure entries a document of that version could not have carried.

## Scope

1. Replace the current carried section (today it carries spell content only)
   with the exact external reference closure for the character being exported.
2. Mint the next free character-export/backup document version for the widened
   shape; freeze the predecessor's key set first; historical documents import
   with their closure absent, never invented.
3. Wire the closure through CI-2a's preview and commit path so adoption,
   review and collision behave exactly as today for content that already
   matches.
4. Row contracts, generated facts, and every snapshot/registry expectation the
   mint touches — reviewed values only, never regenerated from your own output
   as its own oracle.

EXIT (quoted from the unit row): a fresh database imports the full mechanics;
a repeat import adds no content and creates a fresh character each time;
legacy readers remain explicit; frozen fixtures pass.

## Controls the supervisor will demand

- **Closure exactness is an ENUMERATION, not a count.** A library holding N
  creations where the character references 2 must export exactly those 2 plus
  their transitive references — assert full set membership, never its size.
- **Convergence**: export from database A, import into B twice; the second
  import adds nothing and duplicates nothing.
- **Absent-not-invented**: a frozen predecessor-version document imports with
  no closure and no fabricated entries.

Name the exact mutation that breaks each of those three, with the test it kills.
