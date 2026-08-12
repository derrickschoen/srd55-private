# Handoff — subclass session close-out, 2026-08-11

Written for the absorbing session (the one running the sim conversion and
D233 SRD-substitution). Branch: `wt/party`, commits `23de3457..fff4b7d1`
plus this file's commit. Everything below is verified against the tree at
handoff time; `docs/homebrew/rulings.md` outranks this file wherever they
disagree.

## What to absorb

Your mirror is current through "Ruling: Domination conformed to the 2024
paladin subclass skeleton" (your hash `4fa46139`, ours `62433bb3`). The
unabsorbed tail on `wt/party`:

| Commit | What it is |
|---|---|
| `69beffe8` | Aura becomes save-Disadvantage — **superseded same day** |
| `c0492d65` | Aura becomes Blindsight + ally OA immunity — **superseded same day** |
| `e5081c53` | Foreseen Strike dropped; aura-wide *Command* targeting — **final** |
| `fff4b7d1` | Dossier polish: dial paragraph + DM guidance cover aura targeting |
| (this)   | Close-out: stale-row sweep, pre-flight restamp, README refresh, this handoff |

Absorb final state. rulings.md preserves the supersession arc verbatim — do
not flatten it; the arc is the record of why the final shape won.

## Final Oath of Domination kit

`docs/homebrew/cc-by/2026-08-03-oath-of-domination-subclass.md`:

- **3 — Oath Spells** (Command/Bane, Suggestion/Augury, Clairvoyance/Slow,
  Compulsion/Divination, Dominate Person/Dream; only *Command* is on the
  paladin's own list) **+ Channel Divinity: Voice of Domination** —
  immediately after casting *Divine Smite*, 1 CD (no action) → 1 minute of
  Bonus-Action slotless *Command*s.
- **7 — Aura of Certainty** — paladin Blindsight at the aura's radius;
  *Command* may target any chosen creatures in the aura (own save each,
  applies to every casting); one-way comprehension ribbon.
- **15 — Foreseen Formation** — Reaction, Cha-mod/Long Rest (Glorious
  Defense pattern), triggered by an enemy's successful save vs an oath
  spell; up to Cha-mod allies move half Speed without provoking.
- **20 — Dominion Foretold** — Bonus Action, 10 minutes, 1/LR + level-5-slot
  reload: Truesight 60 ft, aura Charm immunity, free smite-less Voice
  activation, and **Inevitable Word** (aura enemies save at Disadvantage
  against the paladin's spells and CD options).

## Rulings to fold into `.claude/decisions.md` at merge

`docs/homebrew/rulings.md` is the only in-session decisions-writer and wins
over any doc it disagrees with. Ten entries dated 2026-08-11, newest first:
Strike-drop + aura targeting; aura final (Blindsight, Inevitable Word to 20);
aura save-Disadvantage (superseded); skeleton conformance; Foreseen strikes
Long-Rest-only (with the CD Short-Rest factual note); strikes v2 (Reaction,
+Cha, superseded); strikes v1 + rider removal (superseded); Voice-to-7
redesign (superseded); no-personal-attribution; plus the OGL-zip test
exemption and pending-rulings pointer rewrite recorded in commit messages.

## Also landed today, outside the dossier

- `tests/unit/source-is-greppable.test.ts` — the two OGL SRD zips are now in
  the binary-exemption list (owner-authorized); the app unit suite is fully
  green for the first time on this branch (2759/2759 at close-out).
- `docs/homebrew/pending-rulings.md` — now a pointer, not a queue. Rebuild
  with `grep -rn 'OWNER-APPROVAL' docs/homebrew/` struck against rulings.md.
- **No personal attribution anywhere** (owner ruling): the four CC-BY docs
  attribute by title alone; `ogl/way-of-the-psionic-fist.md` carries no
  original-content Section 15 entry (deferred to distribution; holder must
  not be the owner's personal name); `ogl/SECTION-15.md` matches.

## Clean-room documents to carry

- `docs/homebrew/cc-by/` — four dossiers + two player docs + bake-off +
  pitches catalog. MINT-FREE, SRD-5.2.1-anchored, CC-BY-4.0, no OGL content,
  attribution by title only. `oath-of-domination-inputs.md` is the owner's
  raw binding input.
- `docs/homebrew/ogl/` — the OGL clean-room track: `way-of-the-psionic-fist.md`
  (targets SRD 5.1 under OGL, deliberately not CC-BY), `SECTION-15.md`,
  `LICENSING.md`, quarantined 3.0/3.5 sources. Concepts may cross from here
  into cc-by/; expression may not.

## Sim interplay with D233 (read before substituting comparators)

`tools/sim/` on `wt/party` models the FINAL Domination kit: shared CD
economy, no strikes, policies `smite|mix|adaptive|control`. Two things the
model deliberately does NOT price, declared in the `sim.ts` header:

1. **Aura-wide Command targeting (7+)** — single-enemy model; the control
   channel at 7+ is a floor that roughly scales with enemies in the aura.
   This is the kit's declared power center and its primary playtest object.
2. Blindsight / comprehension — scenario-spiked, unmodeled.

**Warning for the substitution pass**: `tools/sim/statistical.test.ts` pins
"Vengeance (Vow of Enmity) dealt > Domination dealt at every level, burst and
day" as a design invariant citing the owner's Strike-drop ruling. Vow of
Enmity, GWM, and Valor are 2024-PHB non-SRD comparators (flagged in the sim
header). If D233 replaces the Vengeance comparator, that invariant's meaning
changes — re-measure and rewrite the test against the substitute, citing
D233. Do not delete it to get green.

Board at close-out (dealt/round vs Vengeance 19.4/34.7/60.2/72.1 burst):
smite-only 16.5/29.6/51.7/68.9 (85–96%, deliberate — the budget is in
control); adaptive trades dealt for prevented 2.1/3.4/7.9/13.7.

## Open items — owner's, not yours

- Every OWNER-APPROVAL flag (9 in the Domination dossier; more across the
  monk/ranger docs — see the pending-rulings pointer for how to enumerate).
- All playtests unrun. Hottest two, per the provisional table: aura-wide
  targeting in group fights, and the level-20 Dominion + Voice + Inevitable
  Word stack (every aura enemy at save Disadvantage, every round, ten
  minutes).
- If a real number for multi-enemy control is wanted before playtest, the
  sim needs a fights-back multi-enemy Domination environment (the monk rows
  have the pattern).
