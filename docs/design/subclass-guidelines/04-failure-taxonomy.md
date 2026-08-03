Purpose: diagnose a draft with sixteen named failure classes, explain why each survives desk review, and prescribe a repair that preserves the subclass's identity where possible.

# Failure taxonomy

Use this file after the first complete draft and before `05-design-checklist.md`. Search the rules text and simulate play; do not diagnose from the pitch alone.

## F1. Compounding Punishment

**Recognize.** One failed roll causes several costs: the action fails, later attacks vanish, a future action is spent repairing the state, and a lingering penalty remains. Also flag failure checks made once per attack, because gaining more attacks then increases the chance of losing a turn.

**Why it slips past.** Each consequence appears modest when priced alone, and the trigger is considered per die rather than per turn or day. A dramatic mishap reads as flavor until repeated use reveals a stall loop.

**Repair.** Enforce one trigger, one consequence. If risk is essential, let the player knowingly accept one bounded cost to continue. Limit the event to once per turn and make the repair part of a normal action rather than consuming a later turn. A growing-risk meter needs a ceiling and cannot multiply punishment.

## F2. Imported Chassis Mismatch

**Recognize.** The feature resembles a subsystem built for different action counts, modifier ranges, recovery assumptions, or turn structure. Typical signs are upkeep every round, a separate stance procedure, rising target numbers, or spending a whole Action merely to clear a malfunction.

**Why it slips past.** Prior use makes the mechanic look proven. What was proven was the mechanic inside a different chassis; its costs and opportunities change when actions and accuracy change.

**Repair.** Re-express the desired experience with SRD primitives. Translate the original cost by value—a fraction of a turn, a frequency, an expected hit change—not by copying its literal procedure. If the new expression still needs its own turn structure, it is probably a class engine rather than a subclass feature.

## F3. Dip Bait

**Recognize.** Read class levels 3–5 as a purchase made by a level-17 outsider. Flag armor or weapon grants, attack-stat substitution, standalone accuracy, unrestricted defensive reactions, convertible resources, and riders whose value never depends on host-class level. If the opening package is the best part of the entire subclass to another class, it is dip bait.

**Why it slips past.** The author evaluates a complete career while the optimizer evaluates an exit point. Straight-class playtests never expose what another chassis can export.

**Repair.** Apply these tools in order:

1. Scale important numbers with levels in the host class, not character level or Proficiency Bonus. Step dice at host-class levels or size a pool from host-class level.
2. Make the level-3 loop multiply a native engine—Rage, Bardic Inspiration, Channel Divinity, Wild Shape, Focus Points, Sorcery Points, Pact Magic, a class spell, or another host permission—rather than stand alone.
3. Charge action real estate or concentration that the native class was designed to accommodate and an outsider already contests.
4. Delay portable consolidation such as attack-stat replacement or broad proficiency until a later host level, or require meaningful native-resource spending.
5. Place important rate improvements around host levels 5–7 where staying in class competes with the normal cost of leaving: delayed attacks, feats, slots, and later class features.
6. Re-run the outsider audit against several plausible chassis. Ask what three levels cost and whether the package beats that outsider's next three native levels.

Anti-dip design should reward commitment, not make the native character weak at level 3. A small, functional version can arrive at entry while its frequency, die, targets, or recovery grows only with host-class investment.

## F4. Farmable or Famine Triggers

**Recognize.** Recovery or power depends on an event the player can cheaply manufacture—dealing any damage, defeating any creature, entering combat—or on an event too rare or hostile to control, such as a critical hit or a specific enemy action. Estimate triggers per round and per session. Test harmless targets, repeated encounter entry, allies, summons, and objects where the wording permits them.

**Why it slips past.** The trigger tells a vivid story, so the author imagines its ideal scene rather than its driest and most exploitable readings.

**Repair.** Replace recovery with a per-rest pool, cap it once per turn or encounter, require a genuinely meaningful hostile target, and exclude allied manufacture. For famine triggers, add a deterministic fallback or let the player create the condition through ordinary play. A core loop cannot wait for a natural twenty.

## F5. The Advantage Faucet

**Recognize.** Advantage appears without a resource, position, duration, target restriction, or meaningful condition. Also flag an always-on accuracy bonus or a condition the character satisfies by doing exactly what they would do anyway.

**Why it slips past.** Advantage looks bounded and simple. Repetition changes its price: it improves critical frequency, offsets other accuracy tradeoffs, magnifies riders, and makes allies' advantage tools redundant.

**Repair.** Limit it to the first eligible attack on the user's turn, require a real positional or resource cost, or make it expire after one roll. If the fantasy is reliability rather than accuracy, consider a bounded reroll, minimum die result, or damage benefit. Use `01-power-budget.md` heuristics 6–8 for the d20 budget.

## F6. Action-Type Congestion and Economy Multiplication

**Recognize.** Three or more subclass features compete for the same Bonus Action or Reaction, especially when the base class already spends it. At the opposite extreme, a feature grants another Action, Bonus Action, attack, or turn instead of improving an existing one.

**Why it slips past.** Features are reviewed one at a time rather than assembled into a turn. An extra attack is priced as one weapon die even though it carries every compatible class feature, spell, feat, and item rider.

**Repair.** Write an ordinary and a burst turn. Fold a new activation into an action the class already takes, turn one cost into a limited free rider, or move a defensive choice to an unoccupied Reaction. Replace extra attacks with once-per-turn damage or an effect on an existing hit. Any true extra turn needs whole-chassis and nova analysis.

## F7. Runaway Interaction Math

**Recognize.** Value or cost is multiplied by attacks, dice, targets, class level, advantage, or a stack that can grow. Search for `each`, `per`, and repeated `+1` clauses. Evaluate the expression at levels 5, 11, and 17 with the host's full number of attacks and ordinary support.

**Why it slips past.** The text looks linear and is tested at acquisition. The actual expression is rider × frequency × accuracy × other modifiers.

**Repair.** Use once-per-turn limits, fixed costs, scaling dice with explicit steps, one target, and written caps. When a feature must grow, tie one axis to host-class level and hold the other axes still. Do not let both frequency and magnitude scale automatically.

## F8. Stacking Blindness

**Recognize.** The balance case presents a naked character using the feature alone. Re-test with normal equipment, a common accuracy or defense buff, advantage, class riders, party support, and the strongest legal same-class turn. For resistance or immunity, count how often the relevant damage or condition appears rather than treating all types as equal.

**Why it slips past.** Isolation produces clean arithmetic. Real characters arrive pre-stacked, and the feature may be a multiplier instead of an additive bonus.

**Repair.** Benchmark the equipped, supported character at each tier. Prefer benefits that do not multiply accuracy or attack count—movement, temporary Hit Points, information, target control, or utility—when the stack is already crowded. Record the best legal combination in the review packet.

## F9. The Golden-Cage Benchmark

**Recognize.** The draft is defended against a weak sibling, or every feature is justified by a different donor while the assembled kit is never compared. Watch for arguments that prove only that each piece exists somewhere.

**Why it slips past.** Individual analogies are easy and can all be true. A permissive comparator hides the sum of several strong pieces.

**Repair.** Compare with the median posture and strongest relevant SRD sibling on the same class, at the same schedule slot, then compare whole kits at entry, tier 2, tier 3, and tier 4. Any imported structural benefit must displace budget elsewhere rather than accumulate for free.

## F10. The White-Room Day

**Recognize.** A balance claim depends on a particular number of encounters, predictable Short Rests, or average damage behaving like guaranteed damage. Ask what happens on a one-fight day, a no-Short-Rest day, and a resource-rich day. Inspect variance and the best round, not only the mean.

**Why it slips past.** A spreadsheet requires assumptions, and an author naturally selects the pacing under which the design behaves. Averages look precise while hiding burst and failure streaks.

**Repair.** Price the most favorable legal day as well as the ordinary one. Put explicit turn or encounter boundaries on spikes. Use long-rest pools that remain useful without Short Rests, with partial top-ups rather than total dependence if needed. Report hit distributions or representative outcomes beside averages.

## F11. Campaign-Contingent Payload

**Recognize.** More than one core feature depends on a creature family, damage type, terrain, condition supplied by another character, or campaign premise outside the player's control. Count how many features require the facilitator to arrange a matching scene.

**Why it slips past.** The imagined campaign matches the concept. Narrowness feels thematic, so the theme conceals the amount of dead time.

**Repair.** Give every narrow feature a useful general baseline and make the themed case an enhancement. Let the player initiate the non-combat trigger. If a narrow campaign promise truly cannot be generalized, disclose it before character choice and require a table conversation; arithmetic cannot guarantee campaign relevance.

## F12. Niche Trespass

**Recognize.** Name the class or party role whose player could become unnecessary beside the draft: skill specialist, healer, scout, defender, face, controller, or damage specialist. Shared keywords are harmless; replacing another character's whole value proposition is not.

**Why it slips past.** The author compares only with the parent class. The displaced role may not be present in the playtest, and efficiency looks like versatility from the subclass player's seat.

**Repair.** Rotate the ability toward the parent class's native strengths. Where overlap is central to the fantasy, make it cooperative: reveal opportunities for the specialist, amplify an ally, cover a temporary gap, or trade peak output for breadth. Confirm role boundaries with the actual table; this is partly a social repair.

## F13. The Bookkeeping Tax

**Recognize.** Say one turn aloud. Count quantities retained between turns, marks on creatures, durations, per-hit recalculations, menus scanned, and off-turn triggers watched. If the player may skip a beneficial feature to finish the turn sooner, the tax is already excessive.

**Why it slips past.** The author has the rule cached and cannot reproduce a cold reader's working memory late in a session. Complexity is paid repeatedly while rules text is reviewed once.

**Repair.** Permit one tracked subclass quantity. Make build choices at rest or level-up. Collapse menus into fewer simple options, use once-per-turn riders, attach triggers to the player's own roll or action, and precompute static numbers on the sheet. Test the fifth use, not the demonstration use.

## F14. The Bounced Flavor Cheque

**Recognize.** Write the one-sentence fantasy beside every schedule level. Mark where the player actually performs it. Also run the reverse audit: identify mechanics whose emotional tone or routine experience the pitch never promises.

**Why it slips past.** Evocative prose supplies the fantasy in the author's imagination even when the rules do not. Conversely, a mechanical drawback can look like balance text until players experience its tone every session.

**Repair.** Put a small but real version of the core fantasy at level 3 and make later features deepen it. Remove unrelated mechanics. State unavoidable tone in the pitch, or replace the mechanic if that tone is not the intended experience. Every level should cash either an identity or progression promise.

## F15. Dead-Air Progression

**Recognize.** Classify features as active or passive and by combat, exploration, and social use. A strong level 3 followed only by numeric passives, or an all-combat/all-self grid, predicts that the subclass stops creating new moments.

**Why it slips past.** Passive modifiers are easy to balance and hard to misuse. Boredom emerges across sessions, beyond a single draft review or encounter test.

**Repair.** Add at least one new verb or meaningful loop upgrade per tier, not necessarily per slot. Convert one passive into a limited active with comparable value. Give the subclass player-initiated presence outside combat, and use ribbons beside—not instead of—substantial progression.

## F16. The Untested Altitude

**Recognize.** Record which levels have seen play. If testing stops in tier 2, every feature at 11+ is provisional. Warning signs include a late subsystem, a capstone that only changes numbers, or interactions with high-level spells and equipment that no test assembled.

**Why it slips past.** Long campaigns rarely reach the upper tiers, so low-level feedback accumulates while late text remains untouched. Rarity of play becomes an excuse to substitute confidence for evidence.

**Repair.** Run focused sessions or one-shots at levels 11 and 17. Prefer late upgrades to an engine already tested at lower tiers. Test against routine high-tier capabilities and crowded turns. Label an untested final feature provisional in the review packet; do not present it as settled.

## Cross-cutting observations

### Frequency of relevance is the master variable

Feature size alone predicts little. Ask first: in how many rounds and scenes per session is the rule eligible, useful, noticed, and chosen? A modest resistance used every combat can outweigh a dramatic effect seen once in a campaign. Frequency also connects balance, memory, table speed, and satisfaction; record it for every playtest.

### Two failures are partly social

Campaign-Contingent Payload and Niche Trespass cannot always be repaired with numbers. The campaign must promise relevant scenes, and the party must accept role overlap. When the fantasy requires either, mandate a pre-play table conversation and record the agreement. Do not disguise a social dependency as a balanced universal option.

### Optimizers and rules-followers pay different prices

An optimizer searches for legal ways around a drawback; a good-faith reader accepts the intended cost. Test both readings. If carrying spare equipment, targeting an ally, resetting initiative, or another inventory or setup choice erases the downside, the downside does not balance the power. It taxes only the player who honors the fiction.

### Inventory-neutralized drawbacks are not drawbacks

A cost that vanishes after buying, carrying, or swapping an ordinary item is an equipment tax. Remove it, make the cost intrinsic and bounded, or lower the benefit directly. Never rely on inconvenience that the rules permit one player to ignore.

### Whole-kit and harmed-party review are mandatory

Mechanical interaction failures are easiest to see by assembling the strongest legal stack. Social and fantasy failures are easiest to see from another seat. Review once as the optimizer using the feature and once as the ally, facilitator, or niche-holder affected by it.

After repairs, rerun the affected entry here and every linked item in `05-design-checklist.md`; a repair to frequency, actions, or resources can create a different failure class.
