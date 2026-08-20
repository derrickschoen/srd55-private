# Increment 4 spell audit disposition

Source of findings: `.tmp-audit-findings.log`. `FIXED` includes either executable semantics or an honest typed-partial residual where the required world/summon/perception system does not exist.

## Critical

| Row id | Disposition | Resolution |
|---|---|---|
| ray-of-frost | CONTESTED | `spell-descriptions.txt:6437-6438`: Speed is reduced “until the start of your next turn”; the caster/source-start clock was already correct. |
| shocking-grasp | FIXED | Rider now expires at target start, per lines 7020-7021. |
| guiding-bolt | FIXED | Rider now expires at source end with two source-end boundaries, per lines 4023-4024. |
| spare-the-dying | FIXED | Removed unsupported willingness and typed all four caster-level range tiers. |
| cure-wounds | FIXED | Removed unsupported willingness. |
| healing-word | FIXED | Removed unsupported willingness. |
| sanctuary | FIXED | Removed unsupported willingness. |
| shield-of-faith | FIXED | Removed unsupported willingness. |
| lesser-restoration | FIXED | Removed unsupported willingness. |
| protection-from-poison | FIXED | Removed unsupported willingness. |
| remove-curse | FIXED | Removed unsupported willingness. |
| revivify | FIXED | Removed unsupported willingness while retaining dead-target legality. |
| tongues | FIXED | Removed unsupported willingness. |
| death-ward | FIXED | Removed unsupported willingness. |
| greater-invisibility | FIXED | Removed unsupported willingness. |
| fire-bolt | FIXED | Demoted to typed partial for unattended-object ignition. |
| burning-hands | FIXED | Demoted to typed partial for unattended-object ignition. |
| sacred-flame | FIXED | Demoted to typed partial for half/three-quarters-cover bypass. |
| bane | FIXED | Demoted to typed partial for visible-target filtering. |
| magic-missile | FIXED | Demoted to typed partial for visible-target filtering. |
| blindness-deafness | FIXED | Demoted to typed partial for visible-target filtering. |
| shield | FIXED | Typed and pinned the hit-or-Magic-Missile reaction trigger. |
| thunderwave | FIXED | Demoted to typed partial for unsecured-object push and the 300-foot boom. |
| elementalism | FIXED | Removed the invented one-active cap and corrected KB guidance. |
| charm-person | FIXED | Removed unconditional Advantage; conditional hostile-combat Advantage is an honest partial pending hostility state. |
| grease | FIXED | Typed the template as a ground-square projection. |
| black-tentacles | FIXED | Typed the template as a ground-square projection. |
| darkness | FIXED | Typed dispelling rather than suppression and corrected KB guidance. |
| web | FIXED | Removed the unsupported cast-time save; the zone effect owns later entry/start saves. |
| zone-of-truth | FIXED | Removed the unsupported cast-time save; the zone effect owns later entry/start saves. |
| bestow-curse | FIXED | Implemented and boundary-tested the exact slot 4/5/7/9 duration and concentration tiers. |
| spirit-guardians | FIXED | Replaced free damage choice with the typed caster-alignment mapping. |
| resilient-sphere | FIXED | Willing selection now bypasses the save; unwilling creatures still save. |
| secret-chest | FIXED | Replaced flat daily risk with cumulative percentage-points-per-day data and corrected KB guidance. |

## Major

| Row id | Disposition | Resolution |
|---|---|---|
| dancing-lights | FIXED | Residual now names combined form and adjacency constraint. |
| light | FIXED | Residual now names color selection and recast expiry. |
| mage-hand | FIXED | Residual now names prohibited actions and recast expiry. |
| minor-illusion | FIXED | Residual now names physical-interaction and sensory limitations. |
| prestidigitation | FIXED | Residual now names option-specific durations. |
| thaumaturgy | FIXED | Residual now names booming-voice Intimidation Advantage. |
| alarm | FIXED | Residual now names the ten-second audible duration. |
| find-familiar | FIXED | Residual now names spirit type, one/reform, and no-attack rules. |
| hideous-laughter | FIXED | Residual now names prevention of voluntary Prone removal. |
| jump | FIXED | Willing-target restriction is typed, pinned, and documented. |
| silent-image | FIXED | Residual now names sensory and physical-interaction limits. |
| unseen-servant | FIXED | Residual now names Invisible, Medium, and no-attack traits. |
| arcanists-magic-aura | FIXED | Residual now names target eligibility. |
| enhance-ability | FIXED | Constitution exclusion is typed and pinned. |
| silence | FIXED | Deafened is now explicit typed payload data and pinned. |
| spider-climb | FIXED | Willing-target restriction is typed, pinned, and documented. |
| clairvoyance | FIXED | Sensor eligibility, intangibility, and invulnerability are typed and pinned. |
| counterspell | FIXED | Visible caster with components trigger is typed and pinned. |
| gaseous-form | FIXED | Residual now names speech, object, liquid, and space restrictions. |
| sending | FIXED | Residual now names recipient identity qualification. |
| arcane-eye | FIXED | All-direction sight, hover, and solid barriers are typed and pinned. |
| control-water | FIXED | Whirlpool Strength save and Strength (Athletics) escape are typed and pinned. |
| dimension-door | FIXED | Willing-passenger requirement is typed and pinned. |
| faithful-hound | FIXED | Small+ trigger, intangibility, and invulnerability are typed and pinned. |
| guardian-of-faith | FIXED | Invulnerability is typed and pinned. |
| polymorph | FIXED | Retained statistics are typed and pinned. |
| stone-shape | FIXED | Medium-object constraint is typed and pinned. |
| wall-of-fire | FIXED | Solid-surface requirement is typed and pinned. |

## Minor

| Row id | Disposition | Resolution |
|---|---|---|
| aid | FIXED | Residual now acknowledges expiry removal and isolates only current-HP clamping. |
| alter-self | FIXED | Residual no longer overclaims natural-weapon fidelity. |
| floating-disk | FIXED | One-inch thickness is typed and pinned. |
| identify | FIXED | Residual now says ongoing spells affecting the creature. |
| divination | FIXED | Definition, KB, and pin use the header at line 2312. |

## Systemic Wizard-list locator finding

All 135 manifest rows with `list: 'Wizard'` are **FIXED** by moving their locators back 219 lines to the actual class-list rows. This covers 15 cantrips, 30 level-1, 35 level-2, 29 level-3, and 26 level-4 rows. The class-list citation-integrity test reads every cited source line and requires it to contain that manifest row’s spell name.

- Level 0 — FIXED: acid-splash, chill-touch, dancing-lights, elementalism, fire-bolt, light, mage-hand, mending, message, minor-illusion, poison-spray, prestidigitation, ray-of-frost, shocking-grasp, true-strike.
- Level 1 — FIXED: alarm, burning-hands, charm-person, chromatic-orb, color-spray, comprehend-languages, detect-magic, disguise-self, expeditious-retreat, false-life, feather-fall, find-familiar, floating-disk, fog-cloud, grease, hideous-laughter, ice-knife, identify, illusory-script, jump, longstrider, mage-armor, magic-missile, protection-from-evil-and-good, ray-of-sickness, shield, silent-image, sleep, thunderwave, unseen-servant.
- Level 2 — FIXED: acid-arrow, alter-self, arcane-lock, arcanists-magic-aura, augury, blindness-deafness, blur, continual-flame, darkness, darkvision, detect-thoughts, dragons-breath, enhance-ability, enlarge-reduce, flaming-sphere, gentle-repose, gust-of-wind, hold-person, invisibility, knock, levitate, locate-object, magic-mouth, magic-weapon, mind-spike, mirror-image, misty-step, ray-of-enfeeblement, rope-trick, scorching-ray, see-invisibility, shatter, spider-climb, suggestion, web.
- Level 3 — FIXED: animate-dead, bestow-curse, blink, clairvoyance, counterspell, dispel-magic, fear, fireball, fly, gaseous-form, glyph-of-warding, haste, hypnotic-pattern, lightning-bolt, magic-circle, major-image, nondetection, phantom-steed, protection-from-energy, remove-curse, sending, sleet-storm, slow, speak-with-dead, stinking-cloud, tiny-hut, tongues, vampiric-touch, water-breathing.
- Level 4 — FIXED: arcane-eye, banishment, black-tentacles, blight, charm-monster, confusion, conjure-minor-elementals, control-water, dimension-door, divination, fabricate, faithful-hound, fire-shield, greater-invisibility, hallucinatory-terrain, ice-storm, locate-creature, phantasmal-killer, polymorph, private-sanctum, resilient-sphere, secret-chest, stone-shape, stoneskin, vitriolic-sphere, wall-of-fire.
