# Binding scope decisions

> **Compacted 2026-07-30 at the owner's instruction** ("remove older decisions
> contradicted by the new one and duplicate decisions; compact the text to be
> more terse"). The full unabridged history is in git at commit `808f902` and
> earlier. Every D/F number remains a heading so external references resolve;
> entries contradicted by a later ruling are one-line tombstones pointing at
> the ruling that replaced them. Newest first.

## D195 — OWNER: rogue level 9 final wording — doubled pool, Sneak Attack once per round (2026-08-03)

Supersedes D194's engine wording ("first Sneak of the round doubles, a
second uses the normal table"). Owner's words: "At level 9 double the
sneak attack dice pool and limit sneak attack to once per round." The
feature does BOTH: Sneak Attack dice are doubled AND Sneak Attack itself
becomes limited to once per round. There is no second normal-dice Sneak
- the round's budget is exactly one doubled application (2N flat,
matching the parity rationale: equal to the contriver's N+N without the
contortions). Simpler to adjudicate than the D194 split.

## D194 — OWNER: rogue subclass refined — once-per-round doubling, 19-20 crit at 3, reliability theme (2026-08-03)

Amends D192's rogue engine and directs the revision:
 1. Double Sneak Attack applies ONCE PER ROUND (not per turn). Owner's
    rationale, recorded: "this only brings the rogue equal with a rogue
    that contrives to sneak attack twice every round. It does not use up
    the power budget, it just lets the rogue keep up dpr without having
    to contort into doing an opportunity attack or rely on a battle
    master every round."
 2. Level 3 becomes: critical hit on 19 or 20 (Champion's shape on the
    rogue chassis; SRD content, original name; the 19-20 x doubled-dice
    interaction — a crit rolls the doubled dice twice, 4x table — is
    stated plainly in the doc).
 3. Remaining slots: mine Tales of the Valiant (CC-BY per the license
    survey — legally usable with attribution; concept-level only, own
    wording) and 3e/3.5 SRD prestige classes (OGL open content) for
    ideas. Theme: RELIABILITY of what the rogue does in and out of
    combat, extending Reliable Talent's register (floors, minimums,
    treat-as-N) rather than new subsystems.

## D193 — OWNER: build the Psionic Fist adaptation as a fourth monk subclass (2026-08-03)

Owner's words: "Build the adaptation of the psion monk 3.5 prestige
class." A fourth third-caster monk, the FAITHFUL adaptation of the 3.5
SRD Psionic Fist (open content, verified): partial Wis-caster on the
unbroken martial chassis, a short psychic-warrior-style Wisdom list
(self-buff transmutation + telekinetic/telepathic touches from the
verified SRD set), Focus in the power-point seat, mind-body fusion
identity. Shares the family chassis: Wisdom third-caster + D189
cantrip-in-Flurry at 6. Taken for now (D7, Blackguard precedent): an
ORIGINAL name with a one-line concept-level ancestry disclosure ships
CC-BY like the other three; the alternative — carrying the "Psionic
Fist" name as OGL-attributed content in the D176 quarantine folder — is
the flip if the owner prefers name fidelity. No psionic subsystem is
invented (guideline F2); psionics is expressed as Wisdom casting.

## D192 — OWNER: two simple weapons-first subclasses — double-Sneak rogue, unbound-Mark ranger (2026-08-03)

Owner commissions, verbatim mechanics:
 1. ROGUE subclass whose engine "doubles the sneak attack dice from the
    class table starting at level 6 or higher."
 2. RANGER (hunter-flavored) subclass that "removes concentration from
    hunters mark and does not require a bonus action to move it from a
    downed target to a live one starting at level 6 or higher."
Design ethos, owner's words: "simple beginner friendly classes in the
vein of champion fighter. More weapons focused than weird magic and
extra resources to manage."
Schedule facts applied: Rogue subclass slots are 3/9/13/17 (no 6) - the
doubling lands at 9, permitted by "6 or higher." Ranger slots are
3/7/11/15 - the Mark unbinding lands at 7. The engine mechanics are
OWNER-SPECIFIED and frozen; the budget worksheets present the honest
math (the rogue doubling will read hot against the SRD Thief comparator
- presented, not silently softened). The drafts must check the SRD
ranger BASE class for its own Hunter's Mark features and state the
interaction rather than duplicate it. No new resources, no casting,
Champion-register simplicity throughout.

## D191 — OWNER: all three monk subclasses ship; license = most permissive respecting SRD attribution (2026-08-03)

Owner's words: "All 3 monk subclasses seem fun. Publish them under the
most permissive license that still respects the cc attribution that they
work with the srd." The bake-off ends with THREE winners: Barbed Court,
Ten Selves, Hundred Knots all proceed to full drafts and ship with the
repo. License, taken for now under the owner's criterion: the subclass
documents are released CC-BY-4.0 with the verbatim SRD 5.2 notice
(uniform with docs/srd; the attribution obligation is structural since
the docs carry SRD-derived content). Seam: per-file license headers.
Flip option recorded: our original expression could go CC0 with the SRD
notice retained only for SRD-derived parts - MORE permissive but a
mixed-license file; flip before the repo goes public if the owner
prefers. "Publish" executes through the existing publish gate
(D121/D127/D128 unchanged - nothing goes outward today; the private
mirror continues). OPEN, flagged for the next question round: whether
all three are SEEDED as app content or D169's replace-EK/AT slot takes
one (and which). Owner addendum: when the full drafts are done, run
cleanup and polish passes on the finished subclasses before they are
considered ship-ready.

## D190 — OWNER: monk bake-off = three finalists, each with a Focus-spend budget lever (2026-08-03)

The bake-off entries, owner-directed:
 1. Laughing Court MERGED with Barbed Tongue (bard list — mockery + taunt
    as one identity), more bard spells found, Focus-point spend integrated
    for power budget.
 2. The illusion pitches MERGED, "no positional stuff" (Still Point's
    dual-position/teleport mechanics are OUT), Mirror Image is the
    centerpiece, more illusion spells found, Focus spend integrated.
 3. The primal pitch: Hunter's Mark, Ensnaring Strike, Entangle as the
    core (owner also named Thorn Whip - NOT in SRD 5.2.1, verified
    against the oracle; substitutes from the verified primal set), more
    primal spells found, Focus spend integrated.
All three carry D189's level-6 cantrip-in-Flurry and the third-caster
Wisdom chassis. Each bake-off entry = drafted level-3 bundle + curated
verified spell list + Focus-spend mechanic + mini budget/taxonomy pass;
owner picks the winner for the full draft.

## D189 — OWNER: monk third-caster level 6 = cantrip inside Flurry of Blows (2026-08-03)

Owner's words: "I want the lvl 6 valor bard mechanic to replace an attack
with a cantrip. Maybe flurry of blows allows a cantrip if not holding a
weapon." The monk subclass's level-6 feature: when using Flurry of Blows
while not holding weapons, one of its Unarmed Strikes may be replaced by
casting a cantrip (exact wording/limits to the draft). DISTANCE NOTE,
recorded deliberately: attack-replaced-by-cantrip is a flagged signature
(the un-redesigned EK-pattern lift is what reviewers dinged the upcoming
official monk for). The owner's version is the REDESIGN the flagged
product lacked: it rides the Focus-funded Bonus Action Flurry (not the
Attack action), costs the class's own resource, and is gated unarmed-only.
Ruled acceptable under D174 (differentiation by mechanical distance).

## D188 — OWNER: Voice of Domination SIMPLIFIED (2026-08-03)

Owner's words: "Simplify the oath of domination channel divinity. 1
minute, can cast command with a bonus action without using a spell slot."
Supersedes the draft's initiation-by-slot-cast, single-target lock,
two-successful-saves ending, and concentration clause: activating the
Channel Divinity gives, for 1 minute, the ability to cast Command as a
Bonus Action without expending a spell slot. Normal spell rules otherwise
(fresh save per casting, normal targeting). Knock-ons the doc rework must
resolve: the level-20 capstone's clauses that removed concentration and
the success limit are moot and get rewritten against the simple form;
the power-budget worksheet re-runs for the stronger (untargeted,
non-ending) but simpler CD. The design doc's OWNER-APPROVAL markers stay
open - this is a redesign instruction, not an approval.

## D187 — OWNER: the Oath of Domination spell list is FINAL (2026-08-03)

Owner-picked, all verified present in SRD 5.2.1:
  Paladin 3:  Command, Bane
  Paladin 5:  Suggestion, Augury
  Paladin 9:  Clairvoyance, Slow
  Paladin 13: Compulsion, Divination
  Paladin 17: Dominate Person, Dream
Dream is the standout: he SENDS the vision - nightmares as statecraft,
the D186 misread made contagious. The list walks command (Command ->
Suggestion -> Slow -> Compulsion -> Dominate Person) and vision (Bane's
dread -> Augury -> Clairvoyance -> Divination -> Dream) in parallel to
their apotheoses. Supersedes D182's provisional pairings.

## D186 — OWNER: the vision is MISINTERPRETABLE - the reading is the flaw (2026-08-03)

Owner adds the misread-prophecy layer (the GRRM teeth-snap idea; the
Croesus/Delphi trap - ideas only, no protected expression): the vision
may be TRUE while his READING of it is wrong, and acting on the
misreading can be what brings the true meaning about. Design
consequences: the oath's flavor includes a WRITTEN VISION - short,
concrete, deliberately readable at least three ways (his reading, a
darker reading, a benign reading) - as a DM tool; the DM may secretly
pick a true reading or never pick one. His certainty attaches to his
INTERPRETATION (the one mortal-forged link); no one ever audited it,
and the tenets' certainty language already covers it ("What Was Shown
Needs No Second Showing" now does double work). Augury/Divination
answers stay ambiguous AND get bent through his reading.

## D185 — OWNER: the register is TORMENT WITHOUT DOUBT (2026-08-03)

Corrects the serene overcorrection. Owner's words: "I do not see
serenity in this story. I see someone tormented by 'knowing' for sure
the right thing to do while having every ounce of their humanity
screaming stop - and the toll and the trauma of that." The two rulings
COMPOSE: D183's certainty is EPISTEMIC (he never doubts he is right);
the torment is MORAL AND EMBODIED (the doing costs him everything, every
time, and the cost never converts into doubt). The knight is the
Dyson-house figure one beat further: hands shaking, trigger pulled.
Tenet STRUCTURE and the pinned centerpiece are locked; a final VOICE
pass rewrites the satellites so the speaker is visibly paying -
exhaustion, grief, white knuckles - while conceding nothing
epistemically. "Let it be recorded that I knew" reads as carved through
gritted teeth: the record is the trauma seeking a witness.

## D184 — OWNER: the Exception tenet is PINNED verbatim (2026-08-03)

Owner pinned this tenet as a keeper, surviving all reworks word for
word: "Every Tyrant Believes He Is the Exception. I have carved that
warning into my own oath, and I have drawn the sword anyway. Let it be
recorded that I knew." It is the oath's centerpiece; under D183 it
self-demonstrates (he knows the rule and is certain he is the
exception - which is the rule).

## D183 — OWNER: the prophet has NO doubt - certainty is the horror (2026-08-03)

Refines D181: the knight is fallible IN FACT but subjectively CERTAIN -
"believe he is right and have no doubts about it. That makes it scarier."
Consequences for the tenets: nothing reads as suppressed inner doubt; the
doubt-forbidding tenets aim at OTHERS' doubt; any tenet granting the
premise of his own madness is cut; omens are always read as confirmation
(certainty digests Augury). The ambiguity machinery (D182) stays fully
outside his head - the reader sees what he cannot. Herbert's warning in
its purest form: the danger is the leader who has stopped checking.

## D182 — OWNER-DIRECTED: divination joins the Oath of Domination spell list (2026-08-03)

Amends D179's list: each tier pairs a command spell with a VISION spell -
Command/Bane; Suggestion/AUGURY; Slow (or Hypnotic Pattern)/CLAIRVOYANCE;
Compulsion/DIVINATION; Dominate Person/SCRYING (alternates Hold Monster/
Geas/Commune). All verified present in SRD 5.2.1. Rationale recorded:
Augury and Divination give D181's never-confirm-never-debunk ambiguity
mechanical teeth - their answers are DM-ambiguous by rule. The lost Hold
spells' combat power is an accepted cost per the paladin's low subclass
budget. Design doc binds the final picks.

## D181 — OWNER: the oath-holder is FALLIBLE; prophecy-madness reframe (2026-08-03)

Refines D180: the Oath of Domination knight must NOT know for sure they
are doing the right thing - "imagine if Paul and Leto were fallible."
Chosen fiction: one DRIVEN MAD BY PROPHECY WHO BECOMES THE INSTRUMENT OF
THE PROPHECY'S REALIZATION - the self-fulfilling doom: they saw a ruin,
dominate to prevent it, and can never know whether the vision was true,
was madness, or whether the prevention is itself the arrival. Tenets are
being reworked to carry that uncertainty (including tenets that FORBID
the doubt the knight secretly has - the oath self-seals its own
madness). Mechanics unchanged (command kit, Voice of Domination). The
archetype set widens to the classical self-fulfilling-prophecy tragedies
(ideas only; no protected expression).

## D180 — OWNER: Oath of Domination tone = the sincere tyrant; fiendish framing CUT (2026-08-03)

Owner's words: evil by someone "who thinks they are doing the right
thing" - the "if I were in charge, I could stop all of this injustice"
philosophy, modeled on Paul Atreides and Leto II (the Golden Path: tyranny
chosen knowingly as salvation). Consequences: NO fiendish framing
anywhere in the oath; the 3.5 fiendish servant is CUT as a mechanic (at
most a prose echo on find steed: "the first creature to bend the knee");
tenets built on order-as-mercy, the burden of the one who sees, and
self-aware monstrousness. LICENSING: Dune's philosophy is distilled as
ideas only - no Dune names, terms, or expression may appear in the oath's
text (a sonnet researcher produces original tenet language; clean-room
rules apply).

## D179 — OWNER: the Blackguard conversion is OATH OF DOMINATION (2026-08-03)

Name chosen: Oath of Domination. Identity: command, not fear (D178
distance). Direction approved for the design doc: a command-family oath
spell list from verified SRD 5.2.1 spells (Command/Bane; Suggestion/Hold
Person; tier-9 soft; Compulsion/Dominate Beast; Dominate Person/Hold
Monster) and a Channel Divinity exploring the owner's ask - recasting
Command on the same target as a BONUS ACTION without a spell slot.
Preferred shape "Voice of Domination": CD use at cast time sustains 1
minute of bonus-action slotless recasts against that target, fresh save
each time, ends on two successes; the deliberate bonus-action tension
with Divine Smite is a feature. No-save repeats are forbidden. Still
open: fiendish-servant fate and prose tone.

## D178 — OWNER: Blackguard distance set includes 2014 DMG Oathbreaker AND BG3's version (2026-08-03)

The converted Blackguard must keep D174-style mechanical distance from
the 2014 DMG Oathbreaker and from Baldur's Gate 3's Oathbreaker — and
since the DMG is NOT open content, no feature name or feature shape from
it may be reproduced at all (a stricter bar than distance). SUPERVISOR
FINDING at recording time: the draft outline's level-3 Channel Divinity
was named "Dreadful Aspect" - the literal name of a 2014 DMG Oathbreaker
Channel Divinity (also in BG3). Struck and reworked. Distance checklist
for the design doc: no fallen/broken-oath framing (BG3's core mechanic;
ours is a CHOSEN oath with tenets), no undead-command features, no
aura-of-hate shape (Cha-to-melee-damage shared with fiend/undead allies),
no one-burst fear Channel Divinity, and no DMG/BG3 feature names. The
oath's differentiated identity: DOMINATION AND COMMAND, with fear only
as a late accent.

## D177 — OWNER: clean-room subclass creation guidelines (2026-08-03)

Codex and opus collaborate on research producing SUBCLASS CREATION
GUIDELINE FILES (docs/design/subclass-guidelines/). Content: what makes
a subclass fun and appropriately powerful, with PER-CLASS power budgets
(rogue/monk/ranger derive more power from their subclass; full casters
less), plus patterns from popular homebrew and third-party work. CLEAN
ROOM: researching agents are RETIRED with their sessions; the files
carry only distilled design principles and original examples (SRD/CC-BY
material may be quoted; no verbatim expression from any non-open source,
no Product Identity) so future LLM sessions can design subclasses from
the guidelines alone, unaware of any copyrighted source. Hygiene review
before commit: a reviewer checks the files for copied expression and PI.

## D176 — OWNER: OGL content is QUARANTINED in its own folder (2026-08-03)

"Keep ogl stuff in a separate folder with the ogl requirements in the
same folder so ogl doesn't pollute the rest of the repo." Any content
derived-with-text or reused from OGL 1.0a sources lives under a dedicated
folder (docs/ogl/ unless implementation finds better) containing the OGL
1.0a license text and the full Section 15 chain for exactly what that
folder holds. The rest of the repo stays CC-BY/MIT with no OGL
obligations. Code that consumes OGL-folder content must not copy its text
elsewhere. Publish prep carries the folder as-is with its notices.

## D175 — OWNER: first conversion = BLACKGUARD as the evil oath; parallel track, owner-led (2026-08-03)

From the conversion walkthrough: convert ONLY Blackguard for now (the
2024 core's vacant evil-oath slot; renamed per D174 with mechanical
distance from 2014's Oathbreaker). Sequencing: a PARALLEL track that
"does not block publication" - outside the D148 gate, worked as capacity
allows. Process: one at a time, each conversion gets its own design doc
and approval round, and the owner is involved "more than usual" - the
supervisor presents feature outlines to the owner BEFORE codex authors
the design doc, and the owner approves content at every stage before
seeding. Tier-1 candidates (Horizon Walker, Duelist, Hierophant,
Loremaster, Archmage, Dwarven Defender, Thaumaturgist) remain on the
research shelf, unqueued.

## D174 — OWNER: conversion collision policy = rename + mechanical distance (2026-08-02)

On the 3.5-SRD conversion research: "Differentiating by renaming is fine
as long as the converted subclass is not too similar to the 5e/5.5
version of the same name." Policy for any future prestige-class
conversion: a name collision with an existing 5e/2024 subclass does NOT
disqualify a candidate - rename the conversion AND keep its mechanics
sufficiently distinct from the official subclass it collided with. The
similarity test is against the official 5e/5.5 subclass, judged at
design review. Unblocks the collision-flagged candidates (Dragon
Disciple, Blackguard, Assassin, Shadowdancer lineages) whenever
conversion units are ordered; no conversion unit is IN the queue yet -
this is standing policy, not a scope addition.

## D173 — OWNER: Magic Weapon stays TEXT-ONLY; the banded upcast is proven modelable (2026-08-02)

Asked whether to build a spell-effect layer (the weapon_attack_bonus/
weapon_damage_bonus effect kinds already flow into attack profiles, so
hand-modeling via planner effects works today). Owner: "Text only is
enough, but I want to know if we can model the weird upcast." Ruling: no
spell-effect unit in v1; players hand-attach effects if they want the
numbers. The upcast question is ANSWERED and recorded: the 2024 banded
scaling (slot 2 -> +1, 3-5 -> +2, 6+ -> +3) is a closed hand-authored
band table keyed on CHOSEN SLOT LEVEL - a new input concept (slot-level
picker) but no formula engine; type-closeable; Pact Magic compatible.
Not a blocker if a spell-effect layer is ever wanted.

## D172 — OWNER: AI panel ships in the public repo, documented for cloners (2026-08-02)

Owner's words: "Let anyone who clones the repo run their own localist with
Claude code integration." The chat panel and bridge client STAY in the
published code (not stripped); the public site keeps mounting nothing (no
bridge). NEW publish-prep item: user-facing docs in the public repo
explaining how a cloner runs the local bridge with Claude Code to get the
panel. The bridge server itself: verify what exists in-repo vs. supervisor
tooling before promising it — the doc must only describe what the public
repo actually contains.

## D171 — OWNER: in-app "Copy a bug report" button + GitHub issues (2026-08-02)

Footer control pre-fills build id, browser, current screen, character id
into the clipboard for pasting into chat; the D132 issue channel stays for
account-holders. Small unit joins the queue.

## D170 — OWNER: update prompt offers backup + one changelog line (2026-08-02)

The refresh-to-update prompt gains "Download a backup first" and a
one-line what-changed keyed to the build id; the owner writes that line
per deploy (deploys are manual). Does not contradict D116 (first-character
hint) — recorded as its own surface.

## D169 — OWNER: EK/AT retire, REPLACED by an invented third-caster MONK subclass (2026-08-02)

Owner's words: "Replace eldrich knight and trickster rogue with a made up
third caster monk sub." Amends the SUBCL-SEED design's OQ-1 and its
additive-14 shape: final bundled set = the twelve SRD subclasses PLUS ONE
owner-original Monk subclass carrying a dense third-caster progression
(keeping the third-caster machinery exercised, which was the argument for
keeping EK/AT). EK and AT retire in the same
unit that lands the replacement — retirement is a strict content swap, not
a deletion-first. The invented subclass is original content (no licensing
issue, D59). Its NAME, features, and spell list are DRAFTED by us and
PRESENTED TO THE OWNER for approval before seeding — invented game content
is owner-taste, not supervisor discretion. D80 covers characters left on
EK/AT after retirement (unmade-subclass warning, sheet gap).

## D168 — OWNER: publish under an ORG (2026-08-02) — NAME OPEN

Chosen over derrickschoen/srd55. The public squash lands in an org repo;
org creation happens at publish prep (outward, covered by this grant).
SUPERVISOR FINDING at recording time: the GitHub USERNAME `srd55` is
taken (users/srd55 = HTTP 200; orgs share the user namespace), so the org
cannot be literally `srd55`. OPEN: the owner picks the org name (e.g.
srd-55, srd55-app, srd55-project) — ask at publish prep or sooner.
Spike-repo deletion was NOT covered by this answer; still pending.

## D167 — OWNER: homebrew WEAPONS/ARMOR forms join v1; feats and magic items do NOT (2026-08-02)

Multi-select answer: exactly "Weapons/armor". Weapon and armor definition
authoring forms join the HA chain (proficiency + AC surfaces); feats stay
at the 17 sourced SRD feats; magic items stay planner-panel-only (D72
one-off effects), no item form in v1. Extends D103's kind list; D133
unaffected.

## D166 — OWNER: librarian setup = guided checklist + outbound link (2026-08-02)

The party page walks the librarian through repo creation: an outbound
github.com/new link, exact settings listed, then paste-the-URL-back. The
answer GRANTS the mini-ruling that a USER-CLICKED external navigation link
is not an outward action under hard stop 3 (the app itself still makes no
un-consented request). App-created repos were not taken; documentation-only
was not taken. P5 carries it.

## D165 — OWNER: walkthroughs extend + a THIRD party script (2026-08-02)

Script 1 gains multiclass entry, the spell section, and a subclass choice;
script 2 gains spell fork authoring; a NEW third script certifies the
party path end-to-end (librarian publishes -> anonymous join by URL ->
refresh -> roster), fixture-backed under PARTY-NO-LIVE-NETWORK. All three
gate before D106. Amends D131's two-script instrument.

## D164 — OWNER: the sitting is a SOLO DISPOSABLE dry run (2026-08-02)

Chosen over table-present-with-export-ritual and reserved-domain. The owner
walks the walkthrough journeys alone through the ngrok tunnel; nothing
built there is kept (browser storage is origin-scoped and dies with the
tunnel URL — the trap is accepted, not worked around). First player hands
touch the app post-publish. sitting.sh's checklist encodes this: no
install-to-home-screen during the sitting, no backup-export ritual.

## D163 — OWNER: roster row = one per PUBLISHED character, newest clone (2026-08-02)

The roster is keyed on the repository publication path and shows the
NEWEST imported clone; superseded clones remain in the character list but
leave the roster. Never-published members get no row (the option was
offered and not taken). Resolves the D157/D62 collision (refresh-clones
would otherwise multiply roster rows). P3's index must therefore map
publication path -> newest local clone.

## D162 — OWNER: all three print appendices OPTIONAL; choices REMEMBERED per character (2026-08-02)

Owner's words: "All optional. Remember preferences per character so
subsequent prints have the same choice." Flavor (D141), full spell text
(D149 — its always-on literal reading is superseded), and verbose audit
(D159) are each opt-in at print time, and the three choices PERSIST per
character (storage rides character_rule_overrides per the W-MC precedent
unless implementation proves otherwise — mint-free expected). CONSEQUENCE,
recorded before implementation: the merged SPELL-SEC design's
SS-BROWSER-NO-WRITE negative control ('persist-print-preference' must
fail) is AMENDED by this ruling — printing may write exactly the
preference rows and nothing else; the control narrows to "no character
mutation beyond the named preference keys", stated in the test, never
silently.

## D161 — OWNER: PRIVATE GITHUB MIRROR authorized (2026-08-02)

Standing outward grant, the second after D150/D160: the supervisor creates
ONE private repository under the owner's account via their gh session and
pushes the FULL private repo (including .claude/) to it, then keeps it
pushed at every merge to main. Scope is exactly this mirror; no other
push, publish, or repo creation is covered. This does not create the D127
public repo and publishes nothing.

## D160 — OWNER: forge spike = GitHub only, via the owner's gh CLI (2026-08-01)

Narrows D150's execution: "Use gh with my account to test GitHub and leave
the rest roughed in for now. I do not have other accounts." The live spike
runs against GitHub only, authenticated through the owner's existing `gh`
CLI session on this machine (a throwaway repo created and destroyed under
that account); the exact request list is still shown to the owner before it
runs. GitLab and Codeberg adapters ship fixtures-roughed-in ONLY —
explicitly marked unverified-against-live in their disclosure — until the
owner has accounts there.

## D159 — OWNER: print compacts ordinary numbers; verbose audit moves to an OPTIONAL appendix (2026-08-01)

Supersedes the print-everything default within D89's constraint: on paper,
CORRECT ordinary numbers drop their per-row reasoning; warnings and
absence statements keep full sentences; the sheet prints one stated line
that source breakdowns are on screen (D89's stated-absence rule). NEW:
printing offers an OPTION to append the verbose text — calculations and
source disclosures — as appendix pages, joining the D141 flavor and D149
spell appendices. D67 exception recorded: on paper the sources are in the
optional appendix, not beside the number; on screen nothing changes.

## D158 — OWNER: homebrew spells get ALL THREE surfaces in v1 (2026-08-01)

Asked fork-button vs full form vs JSON-only; the owner chose ALL of them:
a from-scratch spell authoring form, a "fork this spell" copy-then-edit
button on bundled spells (D45 semantics, new identity), and JSON import
stays. Extends D103's kind list with spells; D133 (no classes) unaffected.
Units join the HA chain after its backend lands.

## D157 — OWNER: party ROSTER view ships in v1 (2026-08-01)

Overrides the taken-for-now deferral: the party page (D156) gains a
read-only roster — every imported party character with name, class/level,
AC, HP max, passive Perception, spell save DC — as a unit after P5. P3's
index carries what the roster needs.

## D156 — OWNER: party features live on their OWN page (2026-08-01)

"Party stuff will need its own page." Pins the party design's existing P5
shape: a dedicated party screen with its own routes
(src/ui/screens/party/ — setup, token paste/forget, publish, refresh,
review, public-reader), never folded into the character list or another
screen. The anon-primary mode (D154), warn-once permanence (D155), and any
future roster view all live there.

## D155 — OWNER: public-repo permanence = warn once at first public publish (2026-08-01)

One-time, per-party plain statement ("public means permanent — git history
survives deletion") before the first publish to a PUBLIC repo. No
per-publish confirm; private-only was not taken. P5 carries it.

## D154 — OWNER: party participation is anon-primary (2026-08-01)

Public repo + tokenless anonymous read is the PRIMARY player path (zero
setup); tokens are for the librarian/owner and any player who wants to
self-publish. The D150 spike's measured anonymous rate limits size the
refresh batching; if the spike shows unlivable limits, that finding comes
back to the owner before the design changes.

## D153 — OWNER: target iOS Safari; probe + banner for the rest (2026-08-01)

Owner's words: "Can we make the app work on iOS Safari as well? (probe+
banner for Firefox and others)". Ruling as taken: iOS Safari becomes a
SUPPORT TARGET pending a local WebKit feasibility spike — the supervisor
runs the existing Playwright suite under the WebKit engine (a local run,
nothing outward; the project addition to playwright config is owner-ordered
scope, not a forbidden path-to-green edit) and reports what breaks. If
feasible, WebKit joins the tested matrix for core flows (amends D109's
chromium-only) and the iOS story is documented as install-to-home-screen
plus backup exports (Safari's 7-day eviction exemption). Every OTHER
non-Chromium browser gets a boot-time capability probe + honest banner
("tested only in Chromium/WebKit; your browser may not work and may lose
data") with a proceed-anyway path. A silent broken page is outlawed (D33).

## D152 — OWNER: printed feature text stays NUMBERS ONLY (2026-08-01)

Chosen over full extraction and over modeled-features-only. No class or
subclass feature text is extracted for v1; the sheet's stated-gap sentence
remains the honest answer. The printout is a numbers reference; the rules
text lives in the player's own materials.

## D151 — OWNER: seed ALL SRD subclasses before the gate (2026-08-01)

Chosen over ship-with-two and table-subset. The SRD 5.2.1 subclass for every
class is extracted and seeded before the D106 gate, as a normal
pinned-extract unit (F6/F27 discipline). Kills the empty-list-at-level-3
experience for ten of twelve classes. D80's proceed-with-warning semantics
stay for genuinely unmade subclasses (homebrew, future content).

## D150 — OWNER: bounded live forge spike AUTHORIZED (2026-08-01)

One outward-facing exception to hard stop 3, owner-granted: a live fixture
spike against THROWAWAY repos on GitHub/GitLab/Codeberg using tokens the
owner creates, to record real API responses (pagination, conflict statuses,
rate-limit headers, error bodies) which are then sanitized into the pinned
adapter fixtures. Conditions: the spike touches only the throwaway repos;
its exact request list is shown to the owner BEFORE it runs; anonymous-read
rate limits get measured in the same spike. Everything else outward remains
stopped.

## D149 — OWNER: caster spell section = sheet section + spell-text appendix; multiclass grouped by class (2026-08-01)

Closes the D87/D54.4 bar gap the panel found (no queued unit built the
spell section). Chosen shape: a compact section on the sheet (name, level,
prepared/known marker, save DC and spell attack stated once); PRINTING
appends full spell text as appendix pages after the sheet, the same
pattern D141 gave long flavor text — one stapled document per player.
OWNER ADDITION, verbatim requirement: "print multiclass spells grouped by
class, order by level and name" — the printed spell section and appendix
group by contributing class, ordered by level then name within each class.
The legacy /characters/:id/print route RETIRES (its stale PHP-era import
instruction dies with it).

## D148 — OWNER: the D106 gate HOLDS in full; no early sitting (2026-08-01)

Asked directly after the panel proved party storage lands at the tail of
the CI mint chain: the owner chose "Hold everything, no early sitting" over
re-cutting v1 and over an early informal sitting. The whole queue drains —
party storage (D145/D146), wizard multiclass (D147, now explicitly INSIDE
the gate), the HA/CI chains, and the new D149/D151 units — then the D128
sitting, then publish. First hands-on use waits for the full queue by the
owner's explicit choice.

## D147 — OWNER: wizard multiclass, BG3-style flow, SRD prereqs + house-rule toggle (2026-08-01)

Supersedes D107's deferral: the level-up wizard SHALL support adding a level
in a new class, with a BG3-like add-class surface on the class step. Rules
posture, owner-chosen from three options: ENFORCE the SRD 5.2 multiclass
prerequisites by default (13+ in the new class's primary ability AND 13+ in
the current class's primary ability; a failing class appears disabled with
the exact shortfall shown, the D119 pattern), plus a per-character
"ignore multiclass prerequisites" HOUSE-RULE TOGGLE that unlocks BG3
behavior — default off, and when on it is recorded visibly on the sheet as a
house rule. Entry proficiencies come from the already-parsed
multiclass-entry-srd.ts grants; slots stay on the effective-caster-level
computation.

Sequencing, owner-chosen: design doc authored and reviewed NOW (parallel
with the cascade); implementation dispatches only after W-D/W-E/W-F merge so
multiclass lands on a complete wizard. Bar item 3 still closes at W-F.

## D146 — OWNER: party v1 = library AND characters; token lives in the session (2026-08-01)

Confirms D145's full reading against the design's scoping alternatives: v1
ships shared library plus player character publish/refresh (all 10 units of
docs/design/2026-08-01-party-storage.md). Pasted tokens live in
sessionStorage with an explicit Forget control — reload survives, ending the
browser session forgets. Durable at-rest storage is NOT taken.

Supervisor took the design's other recommended defaults: a designated
librarian writes library/ while each player writes only their own character
path; one repo per party with top-level library/ and characters/; default
branch only.

## D144 — OWNER: Cloudflare Pages stays the host; NO server-side secret (2026-08-01)

Reaffirms D113 against the GitHub Pages alternative. No Cloudflare Worker, no
OAuth exchange endpoint, no secret to rotate: the site remains pure static
assets. Party-storage authentication is therefore user-pasted tokens only.

## D145 — OWNER: party storage = user tokens against GitHub / GitLab / Codeberg (2026-08-01)

A table shares a library and characters through a repo THEY own, on any of
the three forges, public or private, authenticated by a token the user pastes.
One storage port, three adapters. SHIPS INSIDE v1 — this extends D106's queue
and therefore the gate; publication waits for it.

SUPERVISOR-PROVEN 2026-08-01 (curl with an Origin header, all three returned
`access-control-allow-origin: *`, so a static page can call them):
  api.github.com/rate_limit        HTTP 200
  codeberg.org/api/v1/version      HTTP 200
  gitlab.com/api/v4/version        HTTP 401 (auth required; CORS header present)
Dialects differ and need separate adapters: GitHub and Gitea/Codeberg use
`contents/{path}` with a blob `sha` for optimistic concurrency; GitLab uses
`repository/files/{path}` with `last_commit_id` and a PRIVATE-TOKEN header.

## D143a — SUPERVISOR: the D143 fallback is TAKEN (2026-08-01)

Trigger met. Three D135 review rounds found per-family absence incomplete;
round 3 found the last gap at src/rules/sheet.ts:1760 — the invalid value was
the FAMILY DISCRIMINATOR (base progression_type), so no family could be
trusted, yet both still printed. Per D143's pre-authorization the supervisor
switched WITHOUT asking to the simple rule: ANY invalid or missing spell
content suppresses the ENTIRE spell-slot section, absent-and-stated, one
message. Slots print only when every contributor is complete and valid.
Per-family independence is withdrawn. Tests asserting the superseded rule are
replaced as RULING-DRIVEN changes, not deletions to reach green.

## D143 — OWNER: per-family slot absence, with a pre-authorized simple fallback (2026-07-31)

When catalog content behind one class is invalid, the sheet suppresses only
that spell-slot FAMILY (shared vs Pact) and states why; the other family's
valid rows still print. Partial totals within a family are forbidden — a
broken contributor makes its whole family absent, never a smaller number
(D33). PRE-AUTHORIZED: if the next review round still finds this wrong, the
supervisor switches immediately, without asking again, to the simple rule —
any invalid spell content suppresses the entire spell-slot section with one
stated message.

## D141 — OWNER: long flavor text TRUNCATES on the sheet; appendix pages optional (2026-07-31)

Refines D104's "printed when present". The main character sheet prints
alignment and appearance in full and TRUNCATES backstory/notes with a visible
continuation marker, so the play aid stays short. A separate opt-in prints
the full written text as appendix page(s) after the sheet. Truncation on the
main sheet must always be visibly marked, never silent.

## D142 — OWNER: notes cap rises to 20,000 code points (2026-07-31)

Amends the D104 design's limit table. notes now matches backstory at 20,000
code points; appearance stays 4,000, alignment 120. One toggle, one generous
long-form cap. Raising a cap breaks no stored character; the existing
grandfathered-longer-notes rule is unaffected.

## D140 — OWNER: supervision reporting is TERMINAL-ONLY (2026-07-31)

No push notifications, not even for hard stops or the D106 gate. Everything
lands in the session terminal and the committed state files; the owner
checks in on their own cadence.

## D138 — OWNER: homebrew fix flow gets apply-to-all AND delete-with-characters (2026-07-31)

Amends the HA design's strict lifecycle. (1) The fix-review screen gains an
explicit "apply to all listed characters" action (before/after still shown;
nothing silent). (2) A user may DELETE a homebrew creation along with all
characters attached to it. Mechanism must reconcile with D99
archive-before-purge: the supervisor's taken-for-now reading is that the
cascade archives the creation and its attached characters as one restorable
set, and permanent purge from the archive view purges the set; the HA-11
design work pins the details. Unreferenced published content is deletable.

## D139 — OWNER: character export carries its OWN closure; library export is separate (2026-07-31)

Resolves D81's "all". A single-character export carries exactly the
character's homebrew reference closure — unrelated library content stays
home. A SEPARATE library-export feature allows exporting the whole library
or a selected subset of creations. CI-5's backup format and the HA
portability units implement both.

## D134 — OWNER: Focus Points print as a Remaining-field (2026-07-31)

Closes the S1 default. Monk focus_points joins lay_on_hands and
sorcery_points on the point-pool list: "Remaining: ____ / N" at every level.
Boxes-at-every-level list shrinks accordingly (D123 classification).

## D135 — OWNER: EVERY unit gets a codex review pass before merge (2026-07-31)

The gate ritual gains a mandatory step for the Opus supervision era: after
the supervisor's personal gates and before merge, codex reviews the unit
diff (read-only). Findings are arbitrated by verification; legitimate issues
go back as a fix dispatch; rejected findings are recorded with reasons.

## D136 — OWNER: no circuit breaker; stuck = multi-perspective analysis (2026-07-31)

No automatic strike limit. When the supervisor judges itself stuck, it must
FIRST run independent analyses from several perspectives (opus + sol
read-only agents with different lenses), reconcile them, and only then
decide: continue, re-dispatch, or stop and wait for the owner.

## D137 — OWNER: Opus attempts the WHOLE queue including HA/CI (2026-07-31)

No check-in gate before HA-1. The Opus supervisor drives the full queue to
the D106 gate per the handover plan.

## D122 — OWNER: print pins US Letter (2026-07-31)

The print stylesheet declares @page size: letter. Box grids stay inch-specified.

## D123 — OWNER: resource print SHAPE-BY-TYPE (2026-07-31)

Amends the D91 design's 30-box threshold and refines D120's tick-box letter.
Discrete-use resources (Rage, Channel Divinity, Bardic Inspiration, ...) print
numbered boxes at EVERY level. Point pools (Lay on Hands, Sorcery Points-style
totals) print "Remaining: ____ / N" at EVERY level. A resource never changes
print shape mid-career; boxes always mean uses, never points.

## D124 — OWNER: flavor share is ONE opt-in toggle + size guard (2026-07-31)

Amends the D104 design's verbatim/opt-in split. One "include my written text"
share option covers alignment/appearance/backstory/notes, default OFF (D37
generalized). The share flow shows an explicit error when the encoded link
exceeds workable size — never a silently truncated or broken link. Before
implementation: a Chromium experiment measuring practical URL capacity for
?param vs #fragment transports, results recorded.

## D125 — OWNER: print attribution = last page + origin line (2026-07-31)

Closes the finding that printed sheets carry NO SRD notice while our own
ATTRIBUTION.md requires one. The printout gains a notice block on the last
page plus "Printed from SRD-55 <build id>". The same fixlet corrects
legal.ts's false claim that spell text comes only from user-imported catalogs
(bundled since D43/D45).

## D126 — OWNER: code is MIT, SRD split stated (2026-07-31)

LICENSE = MIT for our code; LICENSE and README state explicitly that
docs/srd/** is CC-BY-4.0 with its own attribution obligations. One file must
never imply the SRD was relicensed.

## D127 — OWNER: public repo is a CURATED SQUASH (2026-07-31)

Publication = a fresh repo with one initial commit: code + docs/srd +
user-facing docs. The process record (.claude/, orchestration/, progress/,
internal design docs, full history) stays in the private repo. Reversible
upward only: more can be published later, never less.

## D128 — OWNER: the D121 sitting runs on ngrok-tunneled localhost (2026-07-31)

Publish prep creates NOTHING outward. The owner's manual walkthrough runs
against a local server exposed via ngrok (walkable from any device, including
a phone). Repo creation and the Cloudflare deploy happen only at the explicit
go, via direct upload — Git-integration auto-publish is never wired.

## D129 — OWNER: pre-alpha banner + NOINDEX until the flip (2026-07-31)

The published app carries a persistent one-line banner ("Pre-alpha. Updates
can break saved characters. Export a backup."), a visible build identifier in
the footer, and robots/noindex until the owner announces the D60 flip —
shareable by link, not discoverable.

## D130 — OWNER: Chromium on ANY viewport; responsive pass enters the queue (2026-07-31)

Resolves the D109/D98 contradiction toward support: a responsive unit for the
guided builder and sheet enters the queue before the gate. The PWA install
invitation stays honest; the ngrok phone walkthrough must work.

## D131 — OWNER: a SECOND walkthrough script gates the queued features (2026-07-31)

One added Playwright walkthrough — author a species, build a character with
it, archive, duplicate, print — becomes part of the acceptance instrument.
The D54/D112 script stays untouched.

## D132 — OWNER: issues ON, PRs NOT ACCEPTED (2026-07-31)

The public repo opens issues with a template (browser, build id, steps).
CONTRIBUTING states PRs are not accepted and why (supervised protocol; every
change needs a ruling). The app footer links to the repo. SRD stays pinned at
5.2.1 until the owner rules otherwise.

## D133 — OWNER: NO homebrew classes, ever in v1; subclasses stay (2026-07-31)

Full-class authoring is out of scope ("too much going on") — which the HA
design already pinned (classes bundled-only). Subclass authoring for existing
classes stays in v1. With that explicit, D106's whole-queue gate stands with
the HA chain as designed.

## D118 — OWNER: deferred Epic Boon = player's choice at Level Up (2026-07-31)

Supersedes the OQ-1 taken-default (resolve-first pass). On Level Up with a
deferred Epic Boon, present BOTH options: resolve it now, or proceed to the
next level with the warning intact. Neither is forced. W-A's epic_resolution
state variant needs rework: expose both availabilities; the UI offers a choice.

## D119 — OWNER: unknown hit die DISABLES the class in guided level-up (2026-07-31)

Supersedes the OQ-2 taken-default (allow with absent HP). A class with no
recorded hit die is NOT guideable: its option is disabled with the explanation
that fixed HP cannot be derived until the class is repaired/catalogued. The
never-display-a-guessed-die rule stands (D33). W-A rework required.

## D120 — OWNER: D91 EXTENDS to formula resources (2026-07-31)

Amends D91's scope. Beyond the eight level-table ladders, model typed formula
maxima so they too print numbered tick-boxes: ability-modifier forms
(Bardic Inspiration max(1, Cha mod), Tireless/Nature's Veil max(1, Wis mod)),
per-level forms (Lay on Hands 5 x Paladin level), and fixed feature counts in
the licensed inventory (design doc section 2.4). Computed-or-absent (D33)
still governs; nothing outside licensed sources. D91 design doc needs a
formula-vocabulary addendum before Unit M dispatches.

## D121 — OWNER: publish waits for the owner's manual walkthrough (2026-07-31)

After the D106 gate (queue drained + D112 walkthrough green), prep the D113
publish completely and STOP. The owner does a manual sitting first. Publishing
remains outward-facing and needs the explicit go.

## D117 — OWNER: v1-vs-v2 comparison = the SAME CHARACTER BUILT IN BOTH (2026-07-30)

When v2 is done, build an identical character in both and record every
divergence. Nothing else is produced for the comparison during v1. Not in the
v1 gate (needs v2).

## D116 — OWNER: backup nudge is a ONE-TIME HINT (2026-07-30)

One dismissible prompt after the first character completes level 1
("characters live only in this browser — download a backup"). Never repeats.
No staleness reminders. In the v1 gate (D106).

## D115 — OWNER: SRD 5.1 stays IMPORT-ONLY (2026-07-30)

Bundle 5.2 only; imported 2014 spells/subclasses supported and edition-tagged.
Closes the question D49 flagged.

## D114 — OWNER: the app is named SRD-55 (2026-07-30)

Manifest, title, package, public domain: **SRD-55**. "D&D"/"Dungeons &
Dragons" stay out of name/manifest/domain (CC-BY licenses content, not marks);
they appear only inside the required SRD attribution. Rename pass is in the
gate.

## D113 — OWNER: publish = CLOUDFLARE STATIC SITE, PUBLIC GITHUB REPO (2026-07-30)

Destination, not moment: push/publish remain owner-gated hard stops. Cloudflare
serves at root, so root-absolute SW registration works; `import.meta.env.
BASE_URL` registration fix taken anyway as a reversible default.

## D112 — OWNER: acceptance gate = the SCRIPTED WALKTHROUGH (2026-07-30)

An unassisted Playwright walkthrough of the five D54 items passing end-to-end
IS the acceptance gate. The owner's personal sitting is not required.

## D111 — OWNER: the planner is an ADVANCED DOOR (2026-07-30)

Fully functional, labelled/positioned as advanced. Guided flows and the sheet
are the primary surfaces.

## D110 — OWNER: D60 flips ONLY on explicit announcement (2026-07-30)

Pre-alpha data-loss tolerance holds regardless of deploys, sittings, or the
queue draining, until the owner explicitly announces the flip.

## D109 — OWNER: browser matrix is CHROMIUM ONLY, TESTED (2026-07-30)

No Firefox/WebKit project for v1. Firefox/Safari/mobile are explicitly
unsupported, not best-effort-implied.

## D108 — OWNER: a11y = KEYBOARD + LABELS, NO AUDIT (2026-07-30)

Keyboard-operable everything, labelled controls, focus trapped/restored in
modals, no colour-only signalling — built into new UI as written, not
retrofitted. No formal WCAG audit/tooling/screen-reader matrix in v1.

## D107 — OWNER: D54.3 AMENDED — planner-only multiclass satisfies v1 (2026-07-30)

Straight-class wizard satisfies the bar; multiclass entry stays a planner
operation for v1. D49's "wizard should handle multiclass, but warn" is
deferred beyond v1; "including a multiclass level" is struck from D54.3.

## D106 — OWNER: the v1 gate is the WHOLE QUEUE (2026-07-30)

v1 is done when every queued unit is merged — CI-2a..CI-8, wizard GF-0/GF-1 +
wizard, D90 Expertise, D91 maxima, D104 flavor, D99 archive/duplicate, D102
disclosure, D103 forms, plus D114 rename, D116 hint, D113 BASE_URL — AND the
D112 walkthrough passes. D54's "anything else is polish" no longer defines the
gate.

## D105 — OWNER: parallel worktrees, as many as needed (2026-07-30)

Parallel codex units in disjoint worktrees; one browser suite per worktree on
unique ports. NOT relaxed: wire mints serialize (one mint-carrying lane at a
time); every merge passes supervisor gates; the merge queue is serial.

## D104 — OWNER: flavor layer is TEXT FIELDS ONLY (2026-07-30)

Optional alignment/appearance/backstory/notes text — stored, exported, printed
when present. No portrait, no XP tracking (D88). Hostile-string discipline
(D4): rendered visibly, marked unverified, never entering structured facts.

## D103 — OWNER: v1 ships authoring FORMS for species, subclass, background (2026-07-30)

In-app forms over the template machinery. Classes stay SRD-only. Authored
content is homebrew-marked, carries derived identity (D82), uses the one
effect vocabulary (D72) — a field per effect kind, no free-numeric side
channels. Needs its own plan. JSON import not ruled in by this.

## D102 — OWNER: languages and tools NOT modelled in v1 (2026-07-30)

No structured facts, no choice steps, no sheet lines. Granting features' text
shows; the gap is stated per D33.

## D101 — OWNER: ASI levels offer the FULL feat choice (2026-07-30)

At every ASI level (per-class, from seeded data, D78): the ASI feat OR any
qualifying feat from all 17 sourced SRD feats; prerequisites from sourced
text; repeatable flags honoured. Numeric grants ride the existing effects
vocabulary; anything inexpressible renders as stated feature text absent from
the numbers (D33). ASI is one feat among equals.

## D100 — OWNER: no performance bar in v1 (2026-07-30)

No budget, floor, or harness. Revisit only if someone feels slowness.

## D99 — OWNER: archive before purge; the list gets Duplicate (2026-07-30)

Delete moves to a hidden restorable archive; permanent purge only inside the
archive view. Duplicate = the D62 export-import clone run locally, named
visibly.

## D98 — OWNER: v1 is an installable, offline PWA with eviction protection (2026-07-30)

Manifest (installable); service worker caching the app's own files with a
deliberate refresh-to-update pattern; `navigator.storage.persist()` requested
with HONEST UI when refused (D33 applies to durability claims).

## D97 — OWNER: level deletion without undo data = best-effort reconstruction (2026-07-30)

Without a stored inverse: remove what the level granted, then reconstruct via
the SAME reconciliation engine import uses (one engine, two callers). Total
character level never reaches 0 (deleting a secondary class's only level stays
legal — that is class removal). Multiclass skill keep-vs-lose resolved by
provenance; sole-grantor loss follows tombstone-and-warn (D70), never silent.

## D96 — OWNER: multiclass ability minimums WARN and ALLOW (2026-07-30)

Unmet sourced minimums permitted everywhere; permanent (D95) warning on wizard
step and sheet naming the unmet minimum. No grey-out, no refusal.

## D95 — OWNER: warnings are PERMANENT — no acknowledgment state (2026-07-30)

Full size for as long as the condition holds, on screen and in print. Zero
warning-state storage. A warning leaves only when its condition stops being
true.

## D94 — OWNER: undo-last-level-up lives in the DB, and ONLY the DB (2026-07-30)

Persisted inverse, repeatable back level by level. Share wire and portable
backups never carry it; an imported character's levels are facts. A raw DB
image naturally contains the stack; the audit accepts absent/present/partial.

## D93 — OWNER: the armadillo homebrews are TESTS ONLY (2026-07-30)

D79 fixtures stay in the test suite. No bundled demo pack.

## D92 — OWNER: attunement is THREE SCHEMA-ENFORCED SLOTS + replace modal (2026-07-30)

`slot_1/2/3_item_id` columns on a per-character table (owner explicitly chose
the three-column form over one-column; rejected), composite cross-character-
guarded FKs to `character_items`, NULL = empty. Fourth attunement is
unrepresentable. Attune-when-full opens a replace modal. The old `attuned`
boolean inverted into slot membership. Cap-raising is OUT for v1.

## D91 — OWNER: sheet prints resource maxima with empty tick-boxes (2026-07-30)

Maxima computed from seeded class tables (Rage, Focus, Channel Divinity,
multiclass slot table); spending is pencil work (D88). Computed-or-absent-and-
stated, never recited (D33).

## D90 — OWNER: Expertise is modelled, every granting class, chosen AFTER all skills (2026-07-30)

Sourced from the committed SRD, never memory. Ordering pinned: offered only
after species/class/background skills are settled. `no_expertise` disclosure
DELETED when it lands. Removed underlying proficiency follows tombstone/warn.

## D89 — OWNER: the v1 printout is a print stylesheet over the sheet route (2026-07-30)

One column, chrome suppressed, D88 empty current-HP box in print, browser
print-to-PDF. Classic two-page form is NOT v1. Hover-only content needs a
printable fallback or must state its absence.

## D88 — OWNER: play-state stays on paper — no current HP in v1 (2026-07-30)

Sheet prints max HP (D77) and an empty current-HP box. No current/temp
HP or death-save storage.

## D87 — OWNER: spells are IN v1's bar (2026-07-30)

Guided creation gains level-1 spell screens; the level-up wizard gains
new-level picks and swaps. Machinery = existing spell_selection_slots + grant
rules (one command layer, D71). D54.4 includes a caster's spell section.

## D86 — OWNER: character_items holds plain possessions, WITH quantity (2026-07-30)

Rows with zero effects are fine. `quantity` NOT NULL DEFAULT 1 CHECK ≥1; three
potions are one row. Still out: encumbrance, coins, weight, containers.
(Shipped: migration 0018, wire v12.)

## D85 — OWNER: the wizard is the Level-Up button (2026-07-30)

Sheet and character list carry a Level Up button entering the wizard, one
level per pass. Planner remains a full writer; both write through one command
layer (D71).

## D84 — OWNER: SRD matches by catalog key FIRST, fingerprint fallback only (2026-07-30)

Extraction fixes never change identity. Fingerprint consulted only when key
matching fails; fallback matches surface in the D82 modal.

## D83 — OWNER: ability_override; increases may pass 20; boons may SET (2026-07-30)

Three distinct mechanics: (1) `ability_override` SET-with-floor (highest
set-to wins, never lowers); (2) increase past 20 via the existing per-effect
`maximum` (1..30); (3) boon SET = same kind, source via source_instance_id.
Resolution order is exact: base → increases (each capped by its own maximum)
→ overrides (max of set-to, floored at the increased score). Shipped:
migration 0019, wire v13, merged `713bcc7`.

## D82 — OWNER: one identity rule for ALL content + match-review modal with clone (2026-07-30)

Derived identity covers imports, forks and hand-made homebrew alike. Import
shows a modal listing everything about to be adopted under an existing derived
identity, each offering "clone instead". Default = MATCH; the Nth import of
the same character converges to zero new rows and does not re-ask.

## D81 — OWNER: full JSON export carries non-SRD content; identity is DERIVED (2026-07-30)

The export carries the definitions choices point at. Identity = numeric/
logical properties + name normalised case-insensitively without
non-alphanumerics. Acceptance: two people import the same book; opening each
other's exports duplicates nothing. A derived key is a FROZEN CONTRACT (D41
discipline). Licensing unchanged: only what lands in git matters (D59).

## D80 — SUPERVISOR: the level-3 subclass refusal is STRUCK; D70 governs (2026-07-29)

Only two subclasses are seeded, so the refusal was a dead end for ten classes.
Level 3 proceeds; the unmade subclass is a D70 warning and a sheet gap.
Refusals: `class_not_held`, `level_not_adjacent`, `ability_increase_required`.

## D79 — OWNER: the homebrew species is an ARMADILLO, not a turtle (2026-07-29)

Tortle is published non-SRD content; a "turtle" homebrew invites confusion and
the wrong side of D59. Renames across the D72–D76 fixture set; mechanics
unchanged. Label: "Armadillo Shell (13 + DEX)".

## D78 — SUPERVISOR CORRECTION: ASI levels are PER-CLASS, not a union (2026-07-29)

4/8/12/16 for ten classes; Fighter adds 6 and 14; Rogue adds 10. ASI levels
are READ FROM SEEDED DATA, never hardcoded — that pin is what caught my wrong
union. (Sorcerer's table wraps "Ability Score / Improvement" across lines;
parsers must handle the wrap.)

## D77 — OWNER: FIXED HIT POINTS ONLY. REVERSES D66 (2026-07-29)

HP per level past first = die/2+1 + CON, always. No rolling offered, nothing
to record. `character_hit_point_rolls`/`SetHitPointRollCommand` are unused but
their retirement is a separate decision, not taken here.

## D76 — OWNER: warn on a STRICT AC reduction only; a tie is not a reduction (2026-07-29)

Warning predicate: new total < previous total, at equip time. The exclusion
DISCLOSURE (D74/D75) is a separate surface, always shown when a formula is
excluded. Wiring one to the other's predicate breaks both. Warning never
blocks (D49).

## D75 — OWNER: a shield can CHANGE THE BASE (2026-07-29)

The shield is part of ELIGIBILITY, not a late addend. The floor 10+DEX is
always eligible while unarmoured. Worked case: Monk DEX+3/WIS+3 with shield =
13+2 = **15**, not 18 — picking up a shield can make you worse and that is
correct. Sheet explains the exclusion; warn, never block.

## D74 — OWNER: a broken condition EXCLUDES a formula outright (2026-07-29)

Eligibility first, value second: discard formulas whose conditions fail
(armour worn, shield with allows_shield=false), then apply D73 to what
remains. A lower AC from the player's choice is legitimate and honoured. The
sheet names the excluded formula and why. Warn, never block or auto-swap.

## D73 — OWNER: AC resolver with a stated tie-break; proficiency counts (2026-07-29)

Highest eligible total wins; `armor_class_bonus` and shield apply on top.
Tie-break: worn armour → species → subclass → class → item, then label
alphabetically (stable under import id-remap). Ties are disclosed. Proficiency
does NOT gate armour AC — non-proficient armour keeps its AC with the SRD
penalty STATED; non-proficient weapons lose the proficiency bonus (label and
number must agree); attunement is a separate gate on the same row.

## D72 — OWNER: items are THINGS, effects are the ONE vocabulary (2026-07-29)

`character_armor`/`character_weapons` stay (they carry unique mechanics).
`character_items` is for things that only modify — no numeric columns; every
numeric change is a `character_effects` row. Kinds added: `armor_class_bonus`,
`armor_class_formula` (base + up to two abilities + allows_shield),
`attack_ability_override`, `weapon_attack_bonus`, `weapon_damage_bonus`.
Unarmoured defence formulas COMPETE, highest wins, loser disclosed.
`character_sheet_adjustments.armor_class_adjustment` retired into an effect.
New kinds are a migration + wire mint (D41) — the known tax.

## D71 — OWNER: double-submit is the UI's problem; unknown_origin stays one reason (2026-07-29)

Creation stays non-idempotent; the control is a disabled button. The
equipment re-confirm no-op stays (intent guard, not click guard). No
`origin_not_bundled` split.

## D70 — OWNER: an unmade choice is a SAVEABLE state; it WARNS in wizard AND sheet (2026-07-29)

Incomplete characters save, reload and share. Outstanding choices become
NAMED sheet gaps (not one "incomplete" flag), text derived from the one
completeness vocabulary (F22). A warning is never a block.

## D69 — OWNER: weapons carry NO provenance; anyone adds any weapon; warn on non-proficiency (2026-07-29)

Struck E-A's provenance stamp (weapons and armour). No gating; the
non-proficient warning already existed and stands. Equipment step still mints
package weapons/armour, arriving unowned. Option-switch no longer cleans up —
the player removes what they don't want. Skills provenance STANDS (a recorded
choice differs from an object on a list).

## D68 — OWNER: choosing background feat/ASI is NOT a house rule; mark the DEFAULTS (2026-07-29)

Amends D61: the SRD's printed pairing is the marked default; both are
selectable; nothing is labelled homebrew/departure — those labels are DELETED.
A comment at `src/builder/background-choices.ts` says so, by instruction.

## D67 — OWNER: sheet shows the FINAL NUMBER; sources on hover or touch (2026-07-29)

Every derived number carries a reveal naming the sources that summed to it —
hover for pointer, touch for touch; both are requirements. D33 stands: an
UNKNOWN says unknown on the face of the sheet, not only in a reveal.

## D66 — REVERSED by D77 (was: fixed HP default with per-level rolling)

## D65 — OWNER: starting equipment is a NAMED PACKAGE CHOICE, not owned items (2026-07-29)

The choice is recorded structurally; weapons/armour in the package still
become owned rows (the sheet computes from them); gear renders from the rules
tables, never owned; no gold (D56). The sheet SAYS gear is not itemised (D33).

## D64 — OWNER: standard array default, everything else WARNS; initiative must be correct (2026-07-28)

Point buy and manual entry warn, never block; all-10s is valid; weakness
warning when fewer than two abilities have modifier ≥ +2 (score 14+). Every
initiative-changing source is modelled — same additive-contribution shape as
abilities (D63), built once.

## D63 — OWNER: ability increases are an ADDITIVE LAYER; every species modelled (2026-07-28)

Scores = base + contributions, each knowing its source; base is never
overwritten; removing a source subtracts exactly what it added. All species
get domain modelling (elf's three lineages and spellcasting-ability choice,
dwarf HP, human extra feat/skill are examples, not the list).

## D62 — OWNER: import CLONES into a new character with a new UUID (2026-07-28)

The document's UUID is provenance only (the one guaranteed-unique attribute).
Import mints fresh; importing twice yields two clones, correctly.

## D61 — OWNER: background is REQUIRED; feat and ASI are the player's choice (2026-07-28)

No skip in the builder. The printed feat/increases remain visible as the
SRD's suggestion. (Labelling-as-departure struck by D68.)

## D60 — OWNER: no users, so backward compatibility is not a constraint (2026-07-28)

Zero users, zero exports: "this would break existing documents" is VOID until
a real person creates a character (flip condition: D110). Still forbidden on
their own terms: an export its own importer refuses; losing user data once
users exist.

## D59 — OWNER: the licensing test is AUTHORIZATION, not copyright (2026-07-28)

**Never commit a work we are not licensed to redistribute.** SRD 5.2 CC-BY
(attribution intact), MIT, Apache are fine. PHB text is not. Corrects D58's
wording.

## D58 — SUPERSEDED by D59's wording (was: "copyrighted content never committed"). Surviving rule: only what lands in git matters; user imports/exports/links are not a licensing concern.

## D57 — OWNER: the import ban is about what WE distribute (2026-07-28)

Imported rules text never reaches the repo, git, or dist. What the user
holds/imports/exports locally is their business. A share link we mint is on
our side (D3 governs it).

## D56 — OWNER: package-only equipment; lineage spells are real; straight before multiclass (2026-07-28)

No gold alternative. Lineage spells must actually be granted (seed
`species_definitions.grant_rules`, write a source instance, call the existing
generator). Straight-class level-up ships before multiclass entry (sequencing;
does not amend D49 — since deferred further by D107).

## D55 — OWNER: no Roll in Order; abilities after class; random character shelved (2026-07-28)

Roll in Order is gone everywhere (settles D47↔D50). Step order:
**class → abilities → species → background → skills → equipment.** The
abilities step allocates BASE scores and says so; background increases land on
top (D63).

## D54 — OWNER: v1 is NOT frozen; finish to USABLE (2026-07-28)

The bar — a person who knows D&D but not this app can, in one sitting,
without a dead end: (1) create class-first (D48); (2) finish level 1 (species,
background, skills, abilities, equipment); (3) level up [multiclass struck by
D107]; (4) read a right-numbered sheet, unknowns SAY unknown (D33), including
a caster's spell section (D87); (5) not lose the character on reload.
The SHIP GATE is now D106 (whole queue) + D112 (scripted walkthrough).
v1 must NOT be reshaped toward v2 — the comparison (D117) needs two genuinely
different things.

## D53 — OWNER: feats are two numbers plus a grouping (2026-07-28)

`min_level` (General 4, Epic Boon 19, Origin/Fighting Style none) and
`ability_points` (0/1/2; ASI's 2 is POINTS). Fighting Style gates via
`prerequisites`, not a category. The no-ASI warning drives off
`ability_points = 0`. Alert at level 4 is LEGAL ("another feat of your choice
for which you qualify") — my contrary premise was wrong.

## D52 — OWNER: the wizard refuses homebrew classes; no real characters exist (2026-07-28)

The wizard cannot prove proficiencies for an unseeded class, so it declines to
guide it; import/planner still hold it (D11). Fixture DATA may be rebuilt;
deleting a TEST to reach green remains forbidden.

## F27 — a citation is not a checksum (2026-07-28)

Class progression numbers carried an SRD citation but no extract, checksum, or
tying test. Rule: the builder must not enforce counts it cannot trace to a
committed source; extract + pin + assert before enforcement.

## D51 — OWNER: ASI is a feat; most feats are text; three kinds earn structure (2026-07-28)

Feats granting a fighting style, weapon mastery, or skills are modelled
(D26/D35 test); War Caster stays text. (Shape refined by D53; catalog by
D101.)

## D50 — SUPERSEDED by D55 (was: Roll in Order behind a random-character button).

## D49 — OWNER: 2014 is real for spells and subclasses; wizard multiclasses with a warning (2026-07-28)

Import-only for 2014 content (confirmed by D115). Complexity → WARN;
failed prerequisite → BLOCK (D11). The multiclass wizard itself is deferred
beyond v1 (D107).

## D48 — OWNER: CLASS IS THE FIRST STEP (2026-07-28)

The character row is created when the class is chosen; there is no pre-class
draft state to store. (Step order after class since fixed by D55.)

## D47 — OWNER: ability methods, and the house rule names NOBODY (2026-07-28)

Standard Array / Random Generation / Point Cost (the SRD's own names) are
sourced and checksummed. The fourth (roll-in-order house rule) was later
dropped entirely (D55). Standing rule kept: the variant names no person, and a
house rule is never dressed as SRD content.

## D46 — OWNER: a share link stays a REFERENCE; the export is complete (2026-07-28)

Links degrade missing spells to placeholders, no wire bump; the full JSON
export carries user-authored content (widened to ALL non-SRD content by D81).
Links and exports have DIFFERENT completeness guarantees and the UI must say
so at the moment of sharing.

## F26 — a truncated extract becomes fabricated data (2026-07-28)

Five classes' Starting Equipment cut mid-word in a merged extract. Binding:
Starting Equipment gets its own extract, wide enough, with per-class fixtures
asserting no line ends mid-word. A count of twelve is not evidence (F16).

## F25 — characterLevel() returns number | null; a mutation is not applied until PROVEN applied (2026-07-28)

Seven divergent total-level sites collapsed into one function; null = no class
rows, handled explicitly everywhere. Assert the replacement count or grep the
mutated file BEFORE running the suite (RULE 8: a mutation harness is an
instrument; "0 failed" is a zero).

## F24 — a freeze guard must pin FILE BYTES, not a derived object (2026-07-28)

Hashing the schema object let a type edit into a frozen module pass green.
Historical wire modules are pinned by content SHA. Never burn a wire version
on an unreviewed design; SRD prose never enters share URLs; a fork travels by
key exactly as imported homebrew does.

## F23 — merges run from the MAIN worktree (2026-07-28)

Merging from the branch's own worktree merges it into itself: "Already up to
date." from a merge you expect to do work is a FAILURE message. Remove a
worktree only after the merge is confirmed on main.

## D45 — OWNER: the SRD catalogue is read-only; customising FORKS it (2026-07-27)

SRD rows ship with `srd` provenance, refuse edit/delete, and survive user
imports. Customisation is copy-then-edit under a new name and identity —
a fork is an ordinary spell row, no layer resolution. The SRD layer is
replaceable on upgrade.

## D44 — OWNER: the player picks the multiclass skill; instruments are text (2026-07-27)

Choice offered in the UI from the closed skills vocabulary; Ranger/Rogue bound
to their class list, Bard unbounded — `multiclass_skill_choice_pool/count`
already model this. Already-held skills are excluded from the offer.

## F22 — one rule written twice drifts; ask for the mutation, not tidiness (2026-07-27)

"Do not duplicate the logic" is unreviewable — duplication hides at whatever
granularity wasn't named. Reviewable: mutating either expression of a rule
must fail a test. Also: capture suite output to a file (tail loses the exit
code and the detail); boundary fixtures must test the edges BETWEEN states.

## F21 — an unexercised ordering is unprotected (2026-07-27)

The migration runner's FK ordering survived every test because no test
migration rebuilt a RESTRICT parent. A fixture doing so is required before the
ordering counts as covered.

## D43 — OWNER: the app ships an SRD spell catalogue (2026-07-27)

Supersedes "repo ships NO spell catalog". SRD 5.2 spells are CC-BY like
everything else bundled; attribution intact. Homebrew import coexists.

## D42 — OWNER: the wizard is the front door; class is a precondition; the builder equips (2026-07-27)

Class-less characters are prevented, not rendered (undetermined only
mid-flow; import stays tolerant). The wizard REPLACES "New character". Level 1
first; a comprehensive per-level wizard is committed. The builder offers
weapons/armour (focus and packs are the table's problem); equipment sits after
abilities because the right kit depends on them; a new class re-opens the kit
SUGGESTION (never rewrites choices); weapons that only work with True Strike/
Shillelagh/Pact of the Blade get a NOTE. Legality blocks; suitability only
speaks.

## F20 — the SQLite rebuild dance, measured (2026-07-27)

drizzle-kit emits the rebuild for CHECK-bearing tables; drop-plus-add needs a
TTY so migrations are two generated steps with the data transform between.
`PRAGMA foreign_keys=OFF` is a silent no-op inside a transaction — set it
BEFORE `BEGIN`; run `PRAGMA foreign_key_check` before COMMIT.

## D41 — OWNER: the share wire is a FROZEN VERSIONED REGISTRY (2026-07-27)

One version per export on `root[1]`. Each version freezes exactly as shipped;
never edit an existing version; every change mints the next version with an
adjacent migration. Rejecting an old link is not a migration; a removed field
is mapped or discarded through a dedicated assertion. Legacy variants exist
only for migration and are unmintable by a fresh encode.

## F19 — a zero from an instrument pointed at nothing looks like a clean pass (2026-07-27)

`tsc` on the solution tsconfig compiles NOTHING and exits 0 — the compile gate
is `tsconfig.app.json`. The declaration-emit guard asserts diagnostics AND
>100 emitted files. `git checkout <path>` restores to HEAD, not to what you
were holding — revert mutations by inverting the exact edit.

## D40 — OWNER: the structured-values collisions, answered (2026-07-27)

Range text survives verbatim beside structure; area gets a nullable secondary
dimension; six area shapes (…+ Emanation, Cube); material cost = boolean +
verbatim text (no cp integer); `coin` kind DROPPED (a 50gp line item is text);
`armor` kind KEPT (AC needs it); parenthetical qualifiers verbatim; ranged
weapons carry near/far distances.

## D39 — weapon damage is a discriminated union (2026-07-27)

`dice | flat | custom | not_recorded`; versatile adds `not_applicable`. Free
text survives under `custom`. The production wire arity of the day must be
pinned by a frozen fixture minted from main's own encoder — a new constant
arriving green is where green means least.

## D38 — vocabularies are typed PER TABLE (2026-07-27)

CHECK-closed where only our seeder writes (species templates); branded
passthrough where a user can reach (catalog, character copies). One brand per
vocabulary so a custom damage type cannot flow into a school column.

## D37 — OWNER: character notes travel OPT-IN (2026-07-27)

Default OFF (existing links carry none). The portability map gained `opt_in`,
keyed by the ShareExportOptions flag name, proven by two round trips (flag on
and off). Rows-opt-in (loadouts, acknowledgements) stay `verbatim` columns.

## D36 — OWNER: upcasting is SLOT levels and the LIST is the point (2026-07-27)

A spell that upcasts every other slot level needs the list; bounds 1..9.
Cantrip Upgrade is a different mechanic: own table, CHARACTER level 1..20.
`upcastScale` is refused BY NAME, not silently dropped.

## D35 — OWNER: D26 AMENDED — structure if it changes a sheet number OR makes the catalog searchable (2026-07-27)

The second limb asks: would a player plausibly search or sort by this? Still
not a simulator; every D26 refusal was for being adjudication and stands.

## F18 — the structured-values revision (2026-07-27)

NUL bytes are written as `\u0000` escapes, never literal (F14). A partial
parse keeps what it read (`Self (…)` keeps `self`, stores no area). Fills
never overwrite and are all-or-nothing. Enum casts at the SQL boundary are
validated where they feed a no-default switch. Quantities live in one column.

## F17 — anchor into this file by D/F NUMBER, never by line (2026-07-27)

The log grows at the top, so every line anchor is invalidated by construction.
A D-reference must resolve to a real heading (stronger than line-bounding).

## F16 — verify the THING, not the shape of the thing (2026-07-27)

State the claim as a sentence about BEHAVIOUR, ask what would falsify it, and
read that. A count is not an enumeration; a validated instrument pointed at
the wrong question returns a confident wrong answer.

## F15 — agent-facing surfaces must be BOUND to live data (2026-07-27)

The agent reference under-claimed capabilities and a test pinned the false
claim. Gap lists are derived from `SHEET_GAPS` with a guard; an anchor
resolving says nothing about the claim being true.

## F14 — three source files were invisible to grep (2026-07-27)

Literal NUL separators made files read as `data`. The NUL separator is right;
its spelling is `\u0000`. `tests/unit/source-is-greppable.test.ts` guards all
tracked files (binary exemptions must stay tracked AND contain a NUL).

## D34 — DieSize exists; the martial-arts d4 was unsourced (2026-07-27)

`dieSizes = [4,6,8,10,12,20,100]`; `hitDieSizes` [6,8,10,12];
`martialArtsDieSizes` dropped the 4 — `1d4` occurs nowhere in the extract; the
4 was 2014 memory. Subsets stay separate declarations. Runtime checks live at
the boundary untrusted integers cross; a stored out-of-vocabulary die reads as
NO die with a stated assumption. The compile proof is a probe file that must
NOT compile.

## D33 — a DISCLOSED wrong number is still a wrong number (2026-07-27)

The proficiency bonus is WITHHELD from a not-proficient weapon (both screens
answer from one union). `category_not_stated` keeps the bonus with the
assumption printed (tightening would invent a new wrong number for imports).
Prototype-polluting object-literal lookups became Maps.

## D32 — multiclass entry grants are content (2026-07-27)

Twelve sourced rows: entry grants flagged per-row on the existing set tables
(subset invariant structural); skills as pool+count scalars with a CHECK
making incoherent pairs unstorable; a mis-parse fails the seed. The weapon
share tuple gained backward tolerance; `ADDED_ROW_COLUMNS` mirrors
`RETIRED_ROW_COLUMNS` for historical documents.

## F13 — the concentration/ritual regexes are gone (2026-07-27)

Both booleans are required fields, so the regex could only OVERRIDE an
explicit declaration — and only for one spelling. The declaration is
authoritative; the test pins the DECISION (a fixed regex also fails).

## F12 — the two die CHECKs are different DOMAINS (2026-07-27)

Hit die and martial-arts die are different subjects, not a disagreement.
(Corrected by D34: being different does not make either set correct — check
against the source.)

## D30 — column portability is a DECISION made in the diff that adds the column (2026-07-27)

Every share-table column is classified in a map keyed by
`ColumnNamesOf<N>` — an unclassified column is a compile error; a real
round-trip proves both directions. Backup/snapshot paths are generic
(`SELECT *` + `Object.keys`) and get a genericity proof instead of a map.

## F11 — the character's own level was the least-constrained level (2026-07-27)

`character_class_levels.level` is bounded by the row CONTRACT (`classLevel`
1..20), not a CHECK (a fixture inserts 21 deliberately). Combined total ≤ 20
is a sheet warning, never an import refusal (D11). Contracts gate export too:
no state exists where export emits what import refuses.

## D29 — the Laravel parity scaffolding is gone (2026-07-26)

Column TYPE is pinned as AFFINITY, not declared keyword. When removing
machinery, enumerate what it happened to cover and re-home each piece
deliberately — the fifth of five here was covered by accident and nothing
noticed for three commits.

## D28 — OWNER: warn rather than refuse; multiclass proficiency is a UNION (2026-07-26)

Anyone may CARRY any weapon; the app withholds the proficiency bonus and says
why. Rogue qualifier = martial AND (finesse OR light) — no predicate language.
The union runs over what each class ACTUALLY GRANTED this character (initial
vs multiclass entry differ per the sourced entry-grant clauses).

## D27 — OWNER: a character's weapon carries simple/martial (2026-07-26)

Amends D1b: group is a nullable copied VALUE (null = not stated; sheet keeps
its stated assumption), no template reference. Builder blocks, import
tolerates. Primary ability expression stays TEXT. Invocation selection is
built before prerequisites are parsed.

## D26 — OWNER: the sheet is a REFERENCE, not a simulator (2026-07-26)

**Amended by D35.** The table adjudicates. Structure only where the D35 test
passes; duration/casting time/components(text+copper)/tools stay text; no
gold, no inventory, no session state. The Lance is one-handed by stated
simplification.

## D25 — OWNER: pre-alpha, replace freely; rules engine in the type system (2026-07-26)

Replace/delete freely. NEVER: delete a test to reach green, regenerate an
expectation from our own output, lose user data. Types in value order:
absence as a type; branded ids; closed sets closed; ranges in the type;
exhaustive switches without default; value objects; relations in the type.
Where user content reaches: known-set-plus-passthrough, never a closed enum.

## F10 — machinery adopted to prove fidelity outlives the thing it proved (2026-07-26)

The tell is a comment justifying code by what it protects rather than what it
does. When the protected thing is retired, go looking for its protectors.

## F9 — the customType migration corrections (2026-07-26)

Native `integer({mode:'boolean'})` describes the DECODED value; the app sees
raw 0/1 (drizzle never runs at runtime) — contracts must map explicitly. A
frozen facts diff proves SCOPE, not correctness.

## F8 — 353 of 526 columns degraded to z.any() protecting a retired goal (2026-07-26)

Contracts stay correct via compile-forced refinements. Tighten: CLOSE where
the SRD closes and homebrew won't extend; OPEN (recognise + preserve) where a
user reaches; VALUE OBJECTS for structured strings.

## D24 — the character sheet exists; an assumption is never printed as a fact (2026-07-26)

`hit_die: number | null`; the assumption is made at the single production
point and warns, with a twin test whose identical total proves the warning
load-bearing. A roll above a KNOWN die counts in full and flags; an assumed
die convicts nothing.

## D23 — a subclass can be imported (2026-07-26)

A document declares its own kind (fixed the empty-file sweep bug). Cross-kind
imports don't delete each other; bundled SRD rows can't be targeted by
imports. Subclass REMOVAL still impossible — stated in user docs.

## F7 — the codec problem was an API shape, not 116 call sites (2026-07-26)

All call sites already passed codecs; the defect is the OPTIONAL codec param.
Fix = the omission becomes a compile error, proven by a deliberately
codec-less call failing to build.

## D22 — OWNER: effects belong to the CHARACTER; the trait is provenance (2026-07-26)

The sheet asks "what do I have"; only audits ask "where from" —
`character_source_instances` already answers that. A trait granting two
effects stops being a special case. (Built as `character_effects`.)

## D21 — Extra Attack from class, subclass, or named feature; scope reasons derived at ONE point (2026-07-26)

Bonded-weapon scope reason derived where the number is produced, exhaustive
switch, no pre-annotated grants. Naming a non-SRD subclass to say it is NOT
bundleable is CITATION, not content — over-redaction that rewrites the
owner's words inside quotes is the worse fault.

## D20 — attack profiles merged; one function per fact (2026-07-26)

The damage-type sentence and its `<select>` come from one function; "not
chosen" is a real option. Write boundary tests at levels where expectations
DISCRIMINATE (a test at level 5 passed for reasons unrelated to the code).

## D19 — Extra Attack is not keyed on (class, level) (2026-07-26)

Grants come from class, subclass, or named feature (Thirsting Blade is
SRD-bundleable today), may be WEAPON-SCOPED, and NEVER STACK — max, not sum;
Devouring Blade UPGRADES a grant. Count belongs with the attack profile.

## D18 — species and background templates merged (2026-07-26)

Dwarven Toughness totals exactly the character's level (the opening clause IS
the level-1 grant — data bug, tests had locked it in). Keep-both is only safe
for genuinely list-shaped merge conflicts. A known limitation is an ASSERTION
that fails when silently fixed, not a TODO.

## D17 — the sheet core landed; six numbers had no source until it (2026-07-26)

Extract BEFORE code (skills map, sheet math, multiclassing). Skills close on
the printed Skills table (18 — no class list contains Performance). Armor =
12 + Shield. Heavy armour is dex `none`, not cap 0 (min(dex,0) subtracts).
Extra Attack combines with max. `class_sheet_traits` row existence = "this
class was parsed", disambiguating genuine zero-row content.

## D16 — the claude-only AI bridge is merged, dev-only, provably unshipped (2026-07-26)

Zero bridge bytes in dist. Prompt on stdin; argv frozen (a stray token after
variadic `--tools` grants a tool). Codex stays dropped (F2). Slash commands
survive empty setting sources; containment is prompt POSITION (offset 0).

## D15 — OWNER: model Extra Attack and Martial Arts; Shillelagh unconditional (2026-07-26)

One family: things that modify a weapon attack profile (cantrips and class
features alike). Shillelagh shows for anyone knowing the cantrip, as a
DERIVED row — nothing written to `character_weapons` (D1b holds).

## D14 — cantrips that change how a weapon attack is rolled (2026-07-26)

True Strike (Bard/Sorcerer/Warlock/Wizard; replaces STR OR DEX; needs
proficiency with the weapon; damage type a CHOICE; scaled Radiant extra) and
Shillelagh (Druid; Club/Quarterstaff; STR only; die scales d8→d10→d12→2d6) —
sourced, not recalled. Weapons gain derived attack PROFILES; eligibility per
weapon. Shillelagh is treated as always active (owner's assumption, recorded).

## D13 — twenty-four CHECK constraints; the silent-no-op traps (2026-07-26)

Reserved words in CHECKs are parse errors — quote via helper. A bare `>= 0`
is TRUE for text — `typeof` limbs on bare bounds. `IS` not `=` where NULL can
disable a constraint. `state` stays unconstrained until its vocabulary is
declared in enums (a CHECK must read ONE source).

## D12 — OWNER: HP, armour, origins as templates, and the bridge (2026-07-26)

HP computed (fixed average) with the player's actual ROLL storable per level
[rolling since removed by D77]. Armour = SRD templates prefilling editable
fields. Species/backgrounds = templates; most traits FREE TEXT; a closed
compile-checked set of mechanical effect kinds (resistance, HP, speed,
granted spells). Q1: claude-only bridge approved; codex dropped.

## D11 — OWNER: derivable sheet core first; builder BLOCKS, import TOLERATES (2026-07-26)

Compute rather than store (HP, AC, DCs, modifiers, initiative). An
SRD-illegal choice is unavailable in the builder with the requirement stated;
anything arriving by import/share/catalog is accepted and flagged, never
rejected. A share link may carry a selection the builder would refuse — the
tolerant half working as intended.

## D10 — weapons merged; Q4 settled (2026-07-26)

Weapon "other properties" = eight known boolean toggles + free text, defaults
off. All 38 templates parse from the committed extract; no fabricated SRD
data. A retained oracle must still be able to FAIL — verified by mutating.

## D9 — EIGHT dead Laravel tables pruned; the oracle stayed an oracle (2026-07-26)

The schema signature is re-derived from the FROZEN pre-Drizzle fixture, never
regenerated from our own output. Tests whose subject is gone are deleted, not
adapted into shells.

## F6 — the SRD was never actually bundled; now it is (2026-07-26)

Official CC-BY SRD 5.2.1 PDF pinned by SHA-256; verbatim extracts under
`docs/srd/source/` with commands and pages in SOURCE.md. Mastery count has
TWO shapes (Barbarian/Fighter column; Paladin/Ranger/Rogue flat two in
feature text) — neither constant nor single column. CC-BY-SA fails the
owner's attribution-only test. An unevidenced assertion in a provenance doc
is the failure the doc exists to prevent.

## F5 — the attribution flake: Vite late-discovering zod (2026-07-26, RESOLVED)

The worker-only zod import was invisible to the dep scanner; cold caches
caused a mid-test page reload. Fixed: `optimizeDeps.include: ['zod']` +
per-checkout cacheDir. 0/60 after. Nothing suppressed — no retry, no skip, no
loosened assertion. Any future worker-graph-only runtime dep reintroduces
this; nothing guards it.

## D8 — contracts + audit merged; findings queued not fixed (2026-07-26)

Over-strictness is the highest-severity failure at the backup boundary — a
contract narrower than its column makes a user's own backup unrestorable.

## D7 — neither the Laravel app nor this code is worth preserving (2026-07-25)

Laravel schema fidelity, backward image compatibility, and current TS
structure are non-goals. STILL goals: the behavioural D&D-rule fixtures; a
retained test must still be able to fail (no regenerated expectations); the
untrusted-input boundary.

## D6d — scrutinise nulls in ALL types, not only columns (2026-07-25)

Sibling nullables sharing one cause become ONE optional relation, non-null
inside (`spell?: {id; name; level}`). Storage nullability does not dictate
domain nullability; resolve at the boundary.

## D6c — the defended nulls (2026-07-25)

A partially built character IS a valid steady-state entity — that resolves
the steady-state-witness tension in D6b's favour. Defended: unchosen
subclass, overrides meaning "derive normally", root parents, notes, optional
locators, action_type, the upcast facet, lifecycle timestamps.

## D6b — THE TEST for whether a null is legitimate (2026-07-25)

1. If nobody decided X yet and undecided must be allowed to build or import a
   character, it is truly optional. 2. If the SRD cannot be represented
   without the null, good sign. 3. If the builder flow needs it nullable,
   keep it — do NOT mangle the structure to delete a null the builder needs.
Only if all three are no: restructure or tighten. A nullable column that
completeness reports on is correctly nullable.

## D6 — nullability is a design smell to INVESTIGATE, not a type to declare (2026-07-25)

Before accepting a null: is the table two things? would a 1:0..1 table be
truer? a state machine wearing a timestamp? a default? transient
construction? a value object? A wrong tightening is a DATA-LOSS bug.

## F4 — historical: this was a spell planner, not a character model (2026-07-26)

The schema then held zero sheet concepts. Superseded by the sheet domain
(D17+), origins, the SRD catalogue (D43/D45) and everything since.

## F3 — two latent bugs (2026-07-25)

The payload validator's switch was not exhaustive-by-construction (a missing
arm shipped unvalidated payloads with clean types). Backup import wrote
`character_rule_overrides.value` verbatim with no validation.

## R1 — SUPERSEDED by D1b/D27 (was: model plan's weapon category/enhancement fields).

## F2 — `codex --sandbox read-only` is NOT containment (2026-07-25)

It executes commands and reads anywhere the user can (`~/.ssh`, credentials);
only writes are blocked. `-C` is a working directory, not a boundary.
`claude -p --tools ""` is capability-contained (verified adversarially).

## F1 — SRD-derived data ships and needs attribution IN THE RUNNING APP (2026-07-25)

CC-BY attaches to the distributed work: the notice must be reachable from any
screen rendering the content, in exports/printouts, and in agent-readable
blocks. (Shipped; `attribution.spec.ts` guards it.)

## F0 — historical: a fresh install had no class content (2026-07-25)

Only tests seeded classes. Superseded by bundled SRD content (D43/D45) and
the seeders that now run in production boot.

## D5 — multiclass stays with the planner (2026-07-25)

The guided builder covers single-class creation and hands off to the planner
for multiclass. (v1 posture confirmed by D107.)

## D4 — agent-readable content is collapsed, never hidden (2026-07-25)

`<details>` / `<script type="application/json">`, identical for humans and
machines. No CSS-hidden cloaking. Emit DATA, never instructions to an agent.

## D3 — SRD is bundled; other content stays imported (2026-07-25)

Bundle only licences whose sole obligation we meet is attribution. Imported
rules text never reaches dist, the repo, an export we author, or a share
link. (Distribution line refined by D57; spells added by D43.)

## D2 — completeness ships before the builder (2026-07-25)

Only what committed code can detect; the extension seam designed up front.
(Shipped.)

## D1b — SRD weapons ship as TEMPLATES; mastery is a per-character CHOICE (2026-07-25)

Templates pre-fill editable fields; the character stores VALUES, no template
reference. Custom weapons stay fully user-defined. Mastery count is
class/level-derived with two source shapes (F6); selection is a completeness
candidate.

## D1 — SUPERSEDED by D1b (was: weapons fully user-defined with no catalog at all).

## H1 — candidate-image hardening (2026-07-26)

Audit cycle detection is O(N) via a shared settled set; the guard counts Map
lookups, not wall-clock. Refuse only what no legitimate image can contain
(duplicate snapshot ids, fixed+current slot) — a stale-version save point IS
legitimate and stays restorable. No byte/row cap: the DoS was the algorithm;
there is no honest number.

---

## Numbering notes

Kept for reference resolution: D16/D17 were renumbered at merge (unrelated
entries, both kept); D32/D33 were written as D30/D31 on a branch and
renumbered; two entries were written as F17 concurrently — the
structured-values one became F18; D29 was renumbered from D27 at merge.
