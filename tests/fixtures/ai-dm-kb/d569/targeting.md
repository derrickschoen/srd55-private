# Attacks, cover, hiding, and vision

## Cover and line of sight
Walls, trees, creatures, and other obstacles can grant cover only when they stand between attacker and target. Half Cover is given by an obstacle covering at least half the target; Three-Quarters Cover covers at least three quarters; Total Cover means the target is completely concealed and cannot be targeted directly by an attack or spell, though an area can sometimes reach it. Cover improves Armor Class and Dexterity saves at the lesser two grades. Multiple cover sources do not add; use the most protective one.

## Opportunity Attacks and Disengage
A creature can make an Opportunity Attack as a Reaction when a creature it can see leaves its reach using that creature's action, Bonus Action, Reaction, or movement. The attack occurs immediately before departure. Disengage prevents the mover's movement from provoking for that turn. Teleportation and movement performed without the departing creature's action economy do not provoke.

## Ranged attacks in melee and at long range
A ranged attack roll has Disadvantage when an enemy that can see the attacker and is not Incapacitated is within five feet of it. Beyond normal range the roll has Disadvantage, and beyond long range the attack cannot be made. Check both range and the nearby-enemy penalty before selecting a ranged plan.

## Hide and the Hidden and Invisible states
Hide is a Dexterity (Stealth) check made only when circumstances allow: the creature must be Heavily Obscured or behind Three-Quarters or Total Cover and outside every enemy's line of sight. Success gives the Invisible condition and records the check total as the difficulty to find it. The hidden state ends immediately after making a sound louder than a whisper, when an enemy finds it, after an attack roll, or after casting a spell with a Verbal component. Invisible means unseen without magic or special senses, grants Advantage on initiative and attacks, and gives attackers Disadvantage, while the creature's location may still be inferred from tracks or noise. An unseen attack gives away the attacker's location whether it hits or misses.

## Light, obscurement, and Darkvision
Bright Light allows normal sight. Dim Light is Lightly Obscured, imposing Disadvantage on sight-based Wisdom (Perception) checks. Darkness and opaque heavy fog or foliage are Heavily Obscured; a viewer has the Blinded condition while trying to see something there. Darkvision lets a creature see Darkness within its range as Dim Light and see Dim Light as Bright Light, but colors in Darkness appear only as shades of gray. The board separately marks light level and obscured terrain: a cyan obscured mark is not fog and does not by itself assert a particular light level.

The rules engine samples the target cell's last-authored overlapping light and obscurement regions, treats an unregioned cell as bright, and checks world-object line-of-sight blockers separately; an obscured cell crossed only along the viewing ray does not block sight. Its sourced Darkvision range can see a target in ordinary Darkness, while magical Darkness remains blocking unless a stronger supported sense applies.
