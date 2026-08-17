# Wrong priors already caught — READ BEFORE ASSERTING A RULE

Every row is a rule a model stated confidently from memory and got WRONG, where
the correct answer was sitting in `docs/srd/` the whole time.

This file is the only content in this library that is not retrievable from
source. Everything else can be re-derived by reading the SRD; this cannot,
because it records what a model *believes* versus what is true. That makes it the
highest-value file here and the one most worth extending.

**Recording rule: an error goes in the moment it is caught, including — especially
— your own.** A caught error that is silently corrected teaches nothing and will
recur next session.

| # | The wrong belief | The truth | Where it was | Caught by |
|---|---|---|---|---|
| E1 | Paladin/Ranger multiclass caster levels round DOWN, so a 1-level dip gives no slots | Round **UP**. A 1-level dip = a full caster level | R-MC-001 | fable lane |
| E2 | Channel Divinity fully recharges on a Short Rest (→ 8 uses/day across 4 combats) | Regain **ONE** expended use per Short Rest → **5**/day | R-REST-001 | sol lane |
| E3 | Magic Missile upcast to a 4th-level slot = 7 darts | 3 base + 1 per slot level above 1st = **6** darts | R-SPELL-003 | sol lane |
| E4 | 2024 ability score bonuses come from species | They come from **BACKGROUND** | R-ABIL-003 | — |
| E5 | Cantrip damage scales on the level of the class that granted it | **Total character level** | R-SPELL-001 | — |
| E6 | A Warlock 3 chassis is competitive because pact slots recharge on Short Rests | The pact math is right; the SLOT-TABLE COST was never subtracted. Warlock is **ABSENT** from the shared-slot enumeration, so Warlock 3 = caster level 4, not 7 | R-MC-008 | owner |

## The pattern in E1-E3

All three were caught by a *different agent*, never by the one who made the
error. All three were grep-able in this repo in under a minute. All three came
from 2014-edition priors or from arithmetic done in the head instead of read off
the page.

E1 is the worst of them, and worth understanding rather than just recording: the
claim was written into a section headed `[VERIFIED]` where only *part* of the
section had actually been verified. The header laundered an unverified claim into
a verified-looking one, and it then propagated into three separate agent briefs
before anyone questioned it.

**Two operational consequences:**

1. A `[VERIFIED]` marker applies to exactly the sentence it is attached to, never
   to a block, a section, or a document.
2. When another agent contradicts you on a rule, **check the source before
   defending your answer.** In every case above, the other agent was right.

## The 2024-vs-2014 trap specifically

Training data is dominated by 2014 rules. This repo is SRD **5.2.1 (2024)**.
Known divergences that recall gets wrong, all confirmed above or in the topic
files: half-caster multiclass rounding (E1); ability bonuses from background not
species (E4); weapon mastery existing at all; Channel Divinity counts and
recovery (E2).

Assume any rule you "remember" about character building is the 2014 version
until you have read the 2024 text.
