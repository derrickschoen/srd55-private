# Questions for the owner

These are ordered by the amount of committed work they block or could cause to
be built twice. I found seven questions worth the owner's time. That is fewer
than the apparent gaps in the guided-builder design: D46, D47, D48, F26, and
the current `main` branch have already settled or completed several items that
the design still calls missing. Straight implementation defects, such as plural
class-package weapons failing to link to their templates, are also excluded;
there is no defensible product case for asking the owner whether `8 Javelins`
should stop being weapons.

## 1. Should the level-up wizard enforce the score-13 multiclass prerequisites for bundled classes, amending D27's text-only ruling, or merely display the rule and let the player decide?

**Why it is live.** D27 binds `primary_ability_expression` to text only because
it did not change a sheet number
([`.claude/decisions.md:3198`](../../.claude/decisions.md#L3198)). D42 later
commits a comprehensive level-up wizard
([`.claude/decisions.md:825`](../../.claude/decisions.md#L825)), while the SRD
makes a score of at least 13 in the new and current classes' primary abilities
a prerequisite
([`docs/srd/source/multiclassing.txt:20`](../srd/source/multiclassing.txt#L20)).
Fighter proves that this is an expression rather than one scalar ability:
“Strength or Dexterity”
([`docs/srd/source/class-core-traits.txt:119`](../srd/source/class-core-traits.txt#L119)).
The design itself calls the collision blocking
([`docs/design/guided-builder.md:584`](guided-builder.md#L584)), and the bundled
class writer currently omits even the existing text column
([`src/rules/class-progression-lookup.ts:305`](../../src/rules/class-progression-lookup.ts#L305)).

**Options.**

- **Enforce bundled classes; degrade unknown content to “cannot determine.”**
  This buys correct SRD legality in the ordinary path without inventing rules
  for user-authored classes. It costs a real mechanical meaning for bundled
  primary-ability expressions and a distinct unknown state.
- **Keep every primary-ability prerequisite advisory.** This preserves D27
  literally and keeps the table as adjudicator. It costs the wizard one of the
  few multiclass choices the SRD explicitly makes ineligible.
- **Require every selectable class to provide an enforceable prerequisite.**
  This buys uniform behaviour. It costs tolerance: a class whose catalog
  metadata is incomplete cannot be selected in guided level-up.

**What I would pick.** Enforce it for bundled classes and report “cannot
determine” for anything the app cannot prove. It composes D11's
builder-blocks/boundary-tolerates split with the type-system rule against
turning absence into a guess.

**What breaks if answered the other way.** Advisory-only makes
“comprehensive” knowingly permit an SRD-ineligible multiclass choice. Requiring
structured prerequisites from every class turns missing or user-authored
catalog content into a hard refusal, contrary to the project's tolerant
boundary.

## 2. When a user-authored class occupies the same name and rules edition as a bundled class, should the bundled class remain separately available, be displaced completely, or lend its SRD mechanics to the user row?

**Why it is live.** The class seeder deliberately yields the
`(name, rules_edition)` slot to a different content key, explicitly using a
user-authored “Wizard” as its example
([`src/rules/class-progression-lookup.ts:280`](../../src/rules/class-progression-lookup.ts#L280)).
The sheet-content seeder then resolves classes by **name**, not bundled content
key, and attaches parsed SRD traits to whichever row holds that name
([`src/rules/sheet-srd.ts:312`](../../src/rules/sheet-srd.ts#L312)). The result
is an undocumented hybrid: user-owned class identity/progression with
SRD-derived hit die, skills, saves, armour, weapons, and multiclass grants.
D45 explicitly rejected that shadow/overlay shape for spells in favour of a
read-only original plus a distinct fork
([`.claude/decisions.md:441`](../../.claude/decisions.md#L441)), but no ruling
extends that policy to classes. D48 makes this urgent because class is now the
front door and is persisted first
([`.claude/decisions.md:18`](../../.claude/decisions.md#L18)).

**Options.**

- **Keep the bundled class separately available and require customization to
  be a distinct copy.** This buys stable sourced mechanics and matches D45's
  spell policy. It costs changing the current same-name collision semantics.
- **Let the user-authored class displace the bundled class completely.** This
  buys unambiguous user priority and never attributes SRD mechanics to a row
  the SRD did not create. It costs access to the standard class while the
  collision exists.
- **Keep the current name-based hybrid.** This buys convenient partial
  customization. It costs honest provenance: changing only a content key or
  progression silently inherits a large mechanical ruleset by name.

**What I would pick.** Keep the bundled class separately available and make a
customized class distinct. A content key, not a display name, should decide
whether mechanics are licensed by the bundled extract.

**What breaks if answered the other way.** Complete displacement can make a
standard class vanish from the mandatory first step. The current hybrid can
print plausible but unsourced numbers for user content and makes later seed
changes silently rewrite that content's mechanics.

## 3. If Roll in Order produces scores that do not suit the class already selected under D48, may the player change class, reroll again, or must they keep both the class and the valid roll?

**Why it is live.** D48 says class is first, materializes the character at that
choice, and leaves ability scores until later
([`.claude/decisions.md:18`](../../.claude/decisions.md#L18),
[`.claude/decisions.md:33`](../../.claude/decisions.md#L33)). D47 says Roll in
Order fixes scores to Strength through Charisma and rerolls only when the set
lacks two scores of 15 or higher
([`.claude/decisions.md:92`](../../.claude/decisions.md#L92)). Those rules do
not ensure either high score lands in the chosen class's primary ability. D47
even uses a Wizard with Intelligence 8 as the failure the gate is meant to
soften, but the recorded gate does not give that Wizard recourse when two other
abilities are 15+
([`.claude/decisions.md:99`](../../.claude/decisions.md#L99)).

**Options.**

- **Allow class reselection after seeing the ordered roll.** This buys the
  discovery-driven point of rolling in order without adding another reroll
  rule. It costs treating the first persisted class as revisable during the
  build.
- **Allow another full reroll when the chosen class's primary ability is too
  low.** This preserves the player's class concept. It costs adding a second
  house-rule gate that D47 does not currently state.
- **Keep both once the recorded two-15 gate passes.** This is the most literal
  composition of D47 and D48. It costs trapping a player in a class/score
  mismatch that the method's fixed order makes impossible to repair.

**What I would pick.** Allow class reselection, not extra rerolls. Roll in
Order is most coherent when the roll can inform the class, and this preserves
the exact roll rule the owner already supplied.

**What breaks if answered the other way.** Extra rerolls silently change the
house rule's probability and need a new threshold. Locking both makes D47's
claim that the two-15 gate provides recourse false for the chosen class.

## 4. Exactly when should the wizard label a weapon “Relies on True Strike, Shillelagh, or Pact of the Blade” rather than merely showing that the feature applies?

**Why it is live.** D42 requires the wizard to flag weapons that “only work
well” with one of those mechanics, while keeping the flag advisory
([`.claude/decisions.md:911`](../../.claude/decisions.md#L911)). No SRD rule
defines “works well.” The guided-builder design acknowledges that its proposed
test—magical ability modifier strictly greater than the best ordinary
modifier—is a product guess
([`docs/design/guided-builder.md:509`](guided-builder.md#L509)). The choice is
load-bearing for the large kit suggestion query
([`docs/design/guided-builder.md:639`](guided-builder.md#L639)).

**Options.**

- **Flag only when the magical ability modifier is strictly higher.** This buys
  a small, explainable, stable threshold and keeps ties neutral. It costs
  ignoring other attack differences and can make a one-point edge sound more
  essential than it is.
- **Flag every applicable weapon whenever the character selected the relevant
  spell or feature.** This buys a purely factual badge with no optimization
  claim. It costs losing the distinction between “applies” and “only works
  well with.”
- **Flag only a weapon the player explicitly marks as dependent on the
  feature.** This buys fidelity to player intent. It costs the proactive warning
  D42 asked the wizard to provide.

**What I would pick.** Use the strict modifier comparison, but phrase the badge
as “better with …,” not “only works with ….” It is the narrowest inference
supported by facts the app already intends to know.

**What breaks if answered the other way.** Flagging every applicable weapon
turns the warning into noise. Requiring an explicit player designation means
the builder cannot catch the mistaken weak-ability selection D42 describes.

## 5. Should a class-package item printed as `Druidic Focus (Quarterstaff)` or `Arcane Focus (Quarterstaff)` create a Quarterstaff weapon on the character, or remain wholly untracked as a spell focus?

**Why it is live.** The licensed packages contain those exact compound items
for Druid and Wizard
([`docs/srd/source/class-starting-equipment.txt:19`](../srd/source/class-starting-equipment.txt#L19),
[`docs/srd/source/class-starting-equipment.txt:43`](../srd/source/class-starting-equipment.txt#L43)).
D42 says the builder stores weapons but not spell focuses
([`.claude/decisions.md:836`](../../.claude/decisions.md#L836)). The current
parser resolves exact names only and deliberately classifies both compounds as
ordinary `gear`
([`src/rules/class-equipment-srd.ts:56`](../../src/rules/class-equipment-srd.ts#L56));
the integration test pins that choice
([`tests/integration/rules/class-equipment.test.ts:315`](../../tests/integration/rules/class-equipment.test.ts#L315)).
That means the projection would discard the Quarterstaff aspect too, even
though it changes attacks and is specifically relevant to Shillelagh
([`docs/design/guided-builder.md:501`](guided-builder.md#L501)).

**Options.**

- **Record the Quarterstaff weapon aspect and leave only the focus aspect
  untracked.** This buys a complete attack-facing kit and makes Shillelagh
  reasoning possible. It costs recognizing one source item as serving two
  roles.
- **Treat the entire item as an untracked focus.** This buys a literal,
  uniform reading of D42's focus exclusion. It costs silently omitting a named
  weapon from two starting packages.
- **Ask the player whether to record its Quarterstaff aspect during equipment
  review.** This buys explicit intent. It costs turning a printed package fact
  into an extra decision for only these compound items.

**What I would pick.** Record the Quarterstaff as a weapon and state that its
focus function is not tracked. The builder's boundary is about which mechanics
the app records, and the weapon half plainly affects mechanics it does record.

**What breaks if answered the other way.** Dropping the whole item
under-equips Druid and Wizard package A and makes Shillelagh advice incomplete.
Prompting makes identical source packages produce different stored kits based
on an app-invented confirmation.

## 6. Does “musical instruments are text” mean the Bard's chosen instrument proficiency is stored as app-owned free text, or only mentioned as an untracked grant?

**Why it is live.** D44 records the owner's wording that the player makes the
multiclass skill choice and “the music instruments are just text,” then
interprets that as text rather than a sourced vocabulary
([`.claude/decisions.md:503`](../../.claude/decisions.md#L503)). The overnight
autonomy decision made a further, reversible choice: state the instrument grant
but store no choice
([`.claude/pending-questions/overnight-2026-07-28.md:145`](../../.claude/pending-questions/overnight-2026-07-28.md#L145)).
It correctly rejected `characters.notes` because notes are user-owned,
opt-in to sharing, and deletable independently
([`.claude/pending-questions/overnight-2026-07-28.md:150`](../../.claude/pending-questions/overnight-2026-07-28.md#L150)),
but that proves only that notes are the wrong home, not that the choice should
evaporate.

**Options.**

- **Store the chosen instrument as app-owned free text.** This buys a durable
  record of a proficiency the player actually chose without inventing an
  instrument vocabulary. It costs making that text part of the character's
  portability and editing contract.
- **Mention the grant but do not store the choice.** This buys the narrowest
  reading of D26/D35 and matches the overnight decision. It costs losing a real
  player choice immediately after asking them to resolve the adjacent skill
  choice.

**What I would pick.** Store it as app-owned free text. “Text, not an enum” is
the natural reading of D44, and a reference sheet should retain a proficiency
the character has even when it changes no computed modifier.

**What breaks if answered the other way.** Not storing it leaves the
multiclass event permanently incomplete as a record: the app can say the Bard
was granted a choice but can never say what the player chose. Storing it, if the
owner intended “untracked,” expands the reference sheet and every portability
channel beyond D26's current line.

## 7. Should a fork permanently retain “based on [bundled spell]” ancestry, or become indistinguishable from ordinary user-authored content after it is copied?

**Why it is live.** D45 explicitly listed ancestry as not decided
([`.claude/decisions.md:476`](../../.claude/decisions.md#L476)). The overnight
grant chose to retain it because it cannot be reconstructed after rename
([`.claude/pending-questions/overnight-2026-07-28.md:41`](../../.claude/pending-questions/overnight-2026-07-28.md#L41)),
and `main` now has `forked_from_content_key`
([`db/schema/catalog-spells.ts:273`](../../db/schema/catalog-spells.ts#L273)).
D46 settles how user-authored spell content travels, but does not settle whether
this ancestry is a product fact.

**Options.**

- **Retain ancestry permanently.** This buys “based on Fireball,” auditability,
  and future filtering. It costs carrying provenance that may become less
  meaningful after extensive edits.
- **Discard ancestry after copying.** This buys a simpler notion that every
  fork is just an independent homebrew spell. It costs information that cannot
  be recovered later and makes a fork indistinguishable from hand-authored
  content.

**What I would pick.** Retain it permanently. Provenance describes where the
work began, not how similar it remains, and preserving information is cheaper
than trying to infer it later.

**What breaks if answered the other way.** Discarding it removes the only basis
for “based on” UI and makes the already-created ancestry field misleading or
dead. Retaining it against the owner's intended “independent copy” model would
invite the UI to imply an ongoing relationship that does not exist.
