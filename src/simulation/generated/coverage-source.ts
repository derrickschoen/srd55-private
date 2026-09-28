// GENERATED FILE — DO NOT EDIT BY HAND.
// Source of truth, read by src/simulation/coverage-source.ts, each source pinned by its sha256:
//   docs/srd/full/srd-5.2.1.txt sha256=d2425fa863247509c9af77cd4856e254a9ad4216661b948fc99daa67db69c918
//   docs/srd/source/spell-descriptions.txt sha256=81c213de67213734b27d65c791b18686770ed3404dd0443d346ec72290057829
// Regenerate with `npm run srd:artifacts`.
// tests/unit/simulation/coverage-source-generation.test.ts fails if it drifts, or if any byte of a source changes.
/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 */
import { deepFreeze } from '../../domain/deep-freeze';
import type { BundledCoverageSource } from '../coverage-source';

export const BUNDLED_COVERAGE_SOURCE = deepFreeze({
  "reviewed_headings_in_bundled_srd": [
    "Acid Splash",
    "Advantage/Disadvantage",
    "Attack Rolls",
    "Arcane Hand",
    "Befuddlement",
    "Bestow Curse",
    "Black Tentacles",
    "Blade Barrier",
    "Blight",
    "Burning Hands",
    "Call Lightning",
    "Chain Lightning",
    "Circle of Death",
    "Cloudkill",
    "Cone of Cold",
    "Conjure Animals",
    "Conjure Celestial",
    "Conjure Elemental",
    "Conjure Woodland Beings",
    "Contagion",
    "Contact Other Plane",
    "Control Water",
    "Critical Hits",
    "Damage Rolls",
    "Delayed Blast Fireball",
    "Disintegrate",
    "Dissonant Whispers",
    "Dragon’s Breath",
    "Dream",
    "Earthquake",
    "Enlarge/Reduce",
    "Ensnaring Strike",
    "Faithful Hound",
    "Finger of Death",
    "Fireball",
    "Fire Storm",
    "Flame Strike",
    "Flaming Sphere",
    "Freezing Sphere",
    "Glyph of Warding",
    "Geas",
    "Guardian of Faith",
    "Half Damage",
    "Harm",
    "Hellish Rebuke",
    "Ice Knife",
    "Ice Storm",
    "Incendiary Cloud",
    "Inflict Wounds",
    "Immunity",
    "Insect Plague",
    "Level 1: Rage",
    "Level 2: Channel Divinity",
    "Level 2: Font of Magic",
    "Level 3: Improved Critical",
    "Level 15: Superior Critical",
    "Lightning Bolt",
    "Meteor Swarm",
    "Mind Spike",
    "Moonbeam",
    "Order of Application",
    "Phantasmal Killer",
    "Phantasmal Force",
    "Prismatic Spray",
    "Prismatic Wall",
    "Ray of Enfeeblement",
    "Resistance and Vulnerability",
    "Rolling 20 or 1",
    "Sacred Flame",
    "Searing Smite",
    "Saving Throws",
    "Shatter",
    "Spirit Guardians",
    "Level 5: Sorcerous Restoration",
    "Storm of Vengeance",
    "Summon Dragon",
    "Sunbeam",
    "Sunburst",
    "Symbol",
    "Thunderwave",
    "Tsunami",
    "Vicious Mockery",
    "Vitriolic Sphere",
    "Wall of Fire",
    "Wall of Ice",
    "Wall of Thorns",
    "Weird",
    "Wind Wall"
  ],
  "clauses_by_heading": [
    [
      "Acid Arrow",
      []
    ],
    [
      "Acid Splash",
      [
        {
          "span": "Each creature in that Sphere must succeed on a Dexterity saving throw or take 1d6 Acid damage. Cantrip Upgrade. The damage increases by 1d6 when you reach levels 5 (2d6), 11 (3d6), and 17 (4d6).",
          "start": 212,
          "end": 406,
          "save_start": 259,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "none"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 1,
              "die": 6,
              "damage_type": "Acid"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 1,
              "die": 6,
              "damage_type": "Acid",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 290,
              "end": 305,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Aid",
      []
    ],
    [
      "Alarm",
      []
    ],
    [
      "Alter Self",
      []
    ],
    [
      "Animal Friendship",
      []
    ],
    [
      "Animal Messenger",
      []
    ],
    [
      "Animal Shapes",
      []
    ],
    [
      "Animate Dead",
      []
    ],
    [
      "Animate Objects",
      []
    ],
    [
      "Antilife Shell",
      []
    ],
    [
      "Antimagic Field",
      []
    ],
    [
      "Antipathy/Sympathy",
      []
    ],
    [
      "Arcane Eye",
      []
    ],
    [
      "Arcane Hand",
      [
        {
          "span": "The target must succeed on a Dexterity saving throw, or the target has the Grappled condition, with an escape DC equal to your spell save DC. While the hand grapples the target, you can take a Bonus Action to cause the hand to crush it, dealing Bludgeoning damage to the target equal to 4d6 plus your spellcasting ability modifier.",
          "start": 1236,
          "end": 1567,
          "save_start": 1265,
          "ability": "dexterity",
          "success": {
            "status": "unavailable",
            "reason": "The save gates another effect; the source does not make the numeric expression failed-save damage."
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [],
          "damage_occurrences": []
        }
      ]
    ],
    [
      "Arcane Lock",
      []
    ],
    [
      "Arcane Sword",
      []
    ],
    [
      "Arcanist’s Magic Aura",
      []
    ],
    [
      "Astral Projection",
      []
    ],
    [
      "Augury",
      []
    ],
    [
      "Aura of Life",
      []
    ],
    [
      "Awaken",
      []
    ],
    [
      "Bane",
      []
    ],
    [
      "Banishment",
      []
    ],
    [
      "Barkskin",
      []
    ],
    [
      "Beacon of Hope",
      []
    ],
    [
      "Befuddlement",
      [
        {
          "span": "The target makes an Intelligence saving throw. On a failed save, the target takes 10d12 Psychic damage and can’t cast spells or take the Magic action. At the end of every 30 days, the target repeats the save, ending the effect on a success. The effect can also be ended by the Greater Restoration, Heal, or Wish spell. On a successful save, the target takes half as much damage only.",
          "start": 222,
          "end": 605,
          "save_start": 242,
          "ability": "intelligence",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 10,
              "die": 12,
              "damage_type": "Psychic"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 10,
              "die": 12,
              "damage_type": "Psychic",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 304,
              "end": 324,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Bestow Curse",
      [
        {
          "span": "Level 3 Necromancy (Bard, Cleric, Wizard) Casting Time: Action Range: Touch Components: V, S Duration: Concentration, up to 1 minute You touch a creature, which must succeed on a Wisdom saving throw or become cursed for the duration. Until the curse ends, the target suffers one of the following effects of your choice: • Choose one ability. The target has Disadvantage on ability checks and saving throws made with that ability. • The target has Disadvantage on attack rolls against you. • In combat, the target must succeed on a Wisdom saving throw at the start of each of its turns or be forced to take the Dodge action on that turn. • If you deal damage to the target with an attack roll or a spell, the target takes an extra 1d8 Necrotic damage.",
          "start": 0,
          "end": 750,
          "save_start": 179,
          "ability": "wisdom",
          "success": {
            "status": "unavailable",
            "reason": "The save gates another effect; the source does not make the numeric expression failed-save damage."
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [],
          "damage_occurrences": []
        }
      ]
    ],
    [
      "Black Tentacles",
      [
        {
          "span": "Each creature in that area makes a Strength saving throw. On a failed save, it takes 3d6 Bludgeoning damage, and it has the Restrained condition until the spell ends. A creature also makes that save if it enters the area or ends it turn there. A creature makes that save only once per turn. A Restrained creature can take an action to make a Strength (Athletics) check against your spell save DC, ending the condition on itself on a success.",
          "start": 315,
          "end": 756,
          "save_start": 350,
          "ability": "strength",
          "success": {
            "status": "available",
            "kind": "none"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "once_per_turn",
            "turn": "target"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 3,
              "die": 6,
              "damage_type": "Bludgeoning"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 3,
              "die": 6,
              "damage_type": "Bludgeoning",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 400,
              "end": 422,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Blade Barrier",
      [
        {
          "span": "Any creature in the wall’s space makes a Dexterity saving throw, taking 6d10 Force damage on a failed save or half as much damage on a successful one. A creature also makes that save if it enters the wall’s space or ends it turn there. A creature makes that save only once per turn.",
          "start": 471,
          "end": 753,
          "save_start": 512,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "once_per_turn",
            "turn": "target"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 6,
              "die": 10,
              "damage_type": "Force"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 6,
              "die": 10,
              "damage_type": "Force",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 543,
              "end": 560,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Bless",
      []
    ],
    [
      "Blight",
      [
        {
          "span": "Level 4 Necromancy (Druid, Sorcerer, Warlock, Wizard) Casting Time: Action Range: 30 feet Components: V, S Duration: Instantaneous A creature that you can see within range makes a Constitution saving throw, taking 8d8 Necrotic damage on a failed save or half as much damage on a successful one. A Plant creature automatically fails the save. Alternatively, target a nonmagical plant that isn’t a creature, such as a tree or shrub. It doesn’t make a save; it simply withers and dies. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 4.",
          "start": 0,
          "end": 578,
          "save_start": 180,
          "ability": "constitution",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 8,
              "die": 8,
              "damage_type": "Necrotic"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 8,
              "die": 8,
              "damage_type": "Necrotic",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 214,
              "end": 233,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Blindness/Deafness",
      []
    ],
    [
      "Blink",
      []
    ],
    [
      "Blur",
      []
    ],
    [
      "Burning Hands",
      [
        {
          "span": "Each creature in a 15-foot Cone makes a Dexterity saving throw, taking 3d6 Fire damage on a failed save or half as much damage on a successful one. Flammable objects in the Cone that aren’t being worn or carried start burning. Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 1.",
          "start": 157,
          "end": 479,
          "save_start": 197,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 3,
              "die": 6,
              "damage_type": "Fire"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 3,
              "die": 6,
              "damage_type": "Fire",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 228,
              "end": 243,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Call Lightning",
      [
        {
          "span": "Each creature within 5 feet of that point makes a Dexterity saving throw, taking 3d10 Lightning damage on a failed save or half as much damage on a successful one. Until the spell ends, you can take a Magic action to call down lightning in that way again, targeting the same point or a different one. If you’re outdoors in a storm when you cast this spell, the spell gives you control over that storm instead of creating a new one. Under such conditions, the spell’s damage increases by 1d10. Using a Higher-Level Spell Slot. The damage increases by 1d10 for each spell slot level above 3.",
          "start": 403,
          "end": 992,
          "save_start": 453,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 3,
              "die": 10,
              "damage_type": "Lightning"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 3,
              "die": 10,
              "damage_type": "Lightning",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 484,
              "end": 505,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Calm Emotions",
      []
    ],
    [
      "Chain Lightning",
      [
        {
          "span": "Each target makes a Dexterity saving throw, taking 10d8 Lightning damage on a failed save or half as much damage on a successful one. Using a Higher-Level Spell Slot. One additional bolt leaps from the first target to another target for each spell slot level above 6.",
          "start": 441,
          "end": 708,
          "save_start": 461,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 10,
              "die": 8,
              "damage_type": "Lightning"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 10,
              "die": 8,
              "damage_type": "Lightning",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 492,
              "end": 513,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Charm Monster",
      []
    ],
    [
      "Charm Person",
      []
    ],
    [
      "Chill Touch",
      []
    ],
    [
      "Chromatic Orb",
      []
    ],
    [
      "Circle of Death",
      [
        {
          "span": "Each creature in that area makes a Constitution saving throw, taking 8d8 Necrotic damage on a failed save or half as much damage on a successful one. Using a Higher-Level Spell Slot. The damage increases by 2d8 for each spell slot level above 6.",
          "start": 273,
          "end": 518,
          "save_start": 308,
          "ability": "constitution",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 8,
              "die": 8,
              "damage_type": "Necrotic"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 8,
              "die": 8,
              "damage_type": "Necrotic",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 342,
              "end": 361,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Clairvoyance",
      []
    ],
    [
      "Clone",
      []
    ],
    [
      "Cloudkill",
      [
        {
          "span": "Each creature in the Sphere makes a Constitution saving throw, taking 5d8 Poison damage on a failed save or half as much damage on a successful one. A creature must also make this save when the Sphere moves into its space and when it enters the Sphere or ends its turn there. A creature makes this save only once per turn. The Sphere moves 10 feet away from you at the start of each of your turns. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 5.",
          "start": 380,
          "end": 873,
          "save_start": 416,
          "ability": "constitution",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "once_per_turn",
            "turn": "target"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 5,
              "die": 8,
              "damage_type": "Poison"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 5,
              "die": 8,
              "damage_type": "Poison",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 450,
              "end": 467,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Color Spray",
      []
    ],
    [
      "Command",
      []
    ],
    [
      "Commune",
      []
    ],
    [
      "Commune with Nature",
      []
    ],
    [
      "Comprehend Languages",
      []
    ],
    [
      "Compulsion",
      []
    ],
    [
      "Cone of Cold",
      [
        {
          "span": "Each creature in a 60-foot Cone originating from you makes a Constitution saving throw, taking 8d8 Cold damage on a failed save or half as much damage on a successful one. A creature killed by this spell becomes a frozen statue until it thaws. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 5.",
          "start": 186,
          "end": 525,
          "save_start": 247,
          "ability": "constitution",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 8,
              "die": 8,
              "damage_type": "Cold"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 8,
              "die": 8,
              "damage_type": "Cold",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 281,
              "end": 296,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Confusion",
      []
    ],
    [
      "Conjure Animals",
      [
        {
          "span": "Whenever the pack moves within 10 feet of a creature you can see and whenever a creature you can see enters a space within 10 feet of the pack or ends its turn there, you can force that creature to make a Dexterity saving throw. On a failed save, the creature takes 3d10 Slashing damage. A creature makes this save only once per turn. Using a Higher-Level Spell Slot. The damage increases by 1d10 for each spell slot level above 3.",
          "start": 571,
          "end": 1002,
          "save_start": 776,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "none"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "once_per_turn",
            "turn": "target"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 3,
              "die": 10,
              "damage_type": "Slashing"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 3,
              "die": 10,
              "damage_type": "Slashing",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 837,
              "end": 857,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Conjure Celestial",
      [
        {
          "span": "The target makes a Dexterity saving throw, taking 6d12 Radiant damage on a failed save or half as much damage on a successful one. Until the spell ends, Bright Light fills the Cylinder, and when you move on your turn, you can also move the Cylinder up to 30 feet. Whenever the Cylinder moves into the space of a creature you can see and whenever a creature you can see enters the Cylinder or ends its turn there, you can bathe it in one of the lights. A creature can be affected by this spell only once per turn. Using a Higher-Level Spell Slot. The healing and damage increase by 1d12 for each spell slot level above 7.",
          "start": 487,
          "end": 1107,
          "save_start": 506,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "once_per_turn",
            "turn": "target"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 6,
              "die": 12,
              "damage_type": "Radiant"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 6,
              "die": 12,
              "damage_type": "Radiant",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 537,
              "end": 556,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Conjure Elemental",
      [
        {
          "span": "Whenever a creature you can see enters the spirit’s space or starts its turn within 5 feet of the spirit, you can force that creature to make a Dexterity saving throw if the spirit has no creature Restrained. On failed save, the target takes 8d8 damage of the spirit’s type, and the target has the Restrained condition until the spell ends. At the start of each of its turns, the Restrained target",
          "start": 408,
          "end": 805,
          "save_start": 552,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "none"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 8,
              "die": 8,
              "damage_type": null
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 8,
              "die": 8,
              "damage_type": null,
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 650,
              "end": 660,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        },
        {
          "span": "At the start of each of its turns, the Restrained target repeats the save. On a failed save, the target takes 4d8 damage of the spirit’s type. On a successful save, the target isn’t Restrained by the spirit. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 5.",
          "start": 749,
          "end": 1052,
          "save_start": 806,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "none"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "once_per_turn",
            "turn": "target"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 4,
              "die": 8,
              "damage_type": null
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 4,
              "die": 8,
              "damage_type": null,
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 859,
              "end": 869,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Conjure Fey",
      []
    ],
    [
      "Conjure Minor Elementals",
      []
    ],
    [
      "Conjure Woodland Beings",
      [
        {
          "span": "Whenever the Emanation enters the space of a creature you can see and whenever a creature you can see enters the Emanation or ends its turn there, you can force that creature to make a Wisdom saving throw. The creature takes 5d8 Force damage on a failed save or half as much damage on a successful one. A creature makes this save only once per turn. In addition, you can take the Disengage action as a Bonus Action for the spell’s duration. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 4.",
          "start": 217,
          "end": 753,
          "save_start": 402,
          "ability": "wisdom",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "once_per_turn",
            "turn": "target"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 5,
              "die": 8,
              "damage_type": "Force"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 5,
              "die": 8,
              "damage_type": "Force",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 442,
              "end": 458,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Contact Other Plane",
      [
        {
          "span": "When you cast this spell, make a DC 15 Intelligence saving throw. On a successful save, you can ask the entity up to five questions. You must ask your questions before the spell ends. The GM answers each question with one word, such as “yes,” “no,” “maybe,” “never,” “irrelevant,” or “unclear” (if the entity doesn’t know the answer to the question). If a one-word answer would be misleading, the GM might instead offer a short phrase as an answer. On a failed save, you take 6d6 Psychic damage and have the Incapacitated condition until you finish a Long Rest. A Greater Restoration spell cast on you ends this effect.",
          "start": 297,
          "end": 916,
          "save_start": 336,
          "ability": "intelligence",
          "success": {
            "status": "available",
            "kind": "none"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": 15
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 6,
              "die": 6,
              "damage_type": "Psychic"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 6,
              "die": 6,
              "damage_type": "Psychic",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 773,
              "end": 791,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Contagion",
      [
        {
          "span": "The target must succeed on a Constitution saving throw or take 11d8 Necrotic damage and have the Poisoned condition. Also, choose one ability when you cast the spell. While Poisoned, the target has Disadvantage on saving throws made with the chosen ability. The target must repeat the saving throw at the end of each of its turns until it gets three successes or failures. If the target succeeds on three of these saves, the spell ends on the target. If the target fails three of the saves, the spell lasts for 7 days on it. Whenever the Poisoned target receives an effect that would end the Poisoned condition, the target must succeed on a Constitution saving throw, or the Poisoned condition doesn’t end on it.",
          "start": 143,
          "end": 855,
          "save_start": 172,
          "ability": "constitution",
          "success": {
            "status": "available",
            "kind": "none"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 11,
              "die": 8,
              "damage_type": "Necrotic"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 11,
              "die": 8,
              "damage_type": "Necrotic",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 206,
              "end": 226,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Contingency",
      []
    ],
    [
      "Continual Flame",
      []
    ],
    [
      "Control Water",
      [
        {
          "span": "When a creature enters the whirlpool for the first time on a turn or ends its turn there, it makes a Strength saving throw. On a failed save, the creature takes 2d8 Bludgeoning damage. On a successful save, the creature takes half as much damage. A creature can swim away from the whirlpool only if it first takes an action to pull away and succeeds on a Strength (Athletics) check against your spell save DC.",
          "start": 2192,
          "end": 2601,
          "save_start": 2293,
          "ability": "strength",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "once_per_turn",
            "turn": "target"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 2,
              "die": 8,
              "damage_type": "Bludgeoning"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 2,
              "die": 8,
              "damage_type": "Bludgeoning",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 2353,
              "end": 2375,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Control Weather",
      []
    ],
    [
      "Counterspell",
      []
    ],
    [
      "Create Food and Water",
      []
    ],
    [
      "Create or Destroy Water",
      []
    ],
    [
      "Create Undead",
      []
    ],
    [
      "Creation",
      []
    ],
    [
      "Cure Wounds",
      []
    ],
    [
      "Dancing Lights",
      []
    ],
    [
      "Darkness",
      []
    ],
    [
      "Darkvision",
      []
    ],
    [
      "Daylight",
      []
    ],
    [
      "Death Ward",
      []
    ],
    [
      "Delayed Blast Fireball",
      [
        {
          "span": "When the spell ends, the bead explodes, and each creature in a 20-foot-radius Sphere centered on that point makes a Dexterity saving throw. A creature takes Fire damage equal to the total accumulated damage on a failed save or half as much damage on a successful one. The spell’s base damage is 12d6, and the damage increases by 1d6 whenever your turn ends and the spell hasn’t ended. If a creature touches the glowing bead before the spell ends, that creature makes a Dexterity saving throw. On a failed save, the spell ends, causing the bead to explode. On a successful save, the creature can throw the bead up to 40 feet. If the thrown bead enters a creature’s space or collides with a solid object, the spell ends, and the bead explodes. When the bead explodes, flammable objects in the explosion that aren’t being worn or carried start burning. Using a Higher-Level Spell Slot. The base damage increases by 1d6 for each spell slot level above 7.",
          "start": 290,
          "end": 1240,
          "save_start": 406,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 12,
              "die": 6,
              "damage_type": "Fire"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 12,
              "die": 6,
              "damage_type": "Fire",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 585,
              "end": 589,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Demiplane",
      []
    ],
    [
      "Detect Evil and Good",
      []
    ],
    [
      "Detect Magic",
      []
    ],
    [
      "Detect Poison and Disease",
      []
    ],
    [
      "Detect Thoughts",
      []
    ],
    [
      "Dimension Door",
      []
    ],
    [
      "Disguise Self",
      []
    ],
    [
      "Disintegrate",
      [
        {
          "span": "A creature targeted by this spell makes a Dexterity saving throw. On a failed save, the target takes 10d6 + 40 Force damage. If this damage reduces it to 0 Hit Points, it and everything nonmagical it is wearing and carrying are disintegrated into gray dust. The target can be revived only by a True Resurrection or a Wish spell. This spell automatically disintegrates a Large or smaller nonmagical object or a creation of magical force. If such a target is Huge or larger, this spell disintegrates a 10-foot-Cube portion of it. Using a Higher-Level Spell Slot. The damage increases by 3d6 for each spell slot level above 6.",
          "start": 331,
          "end": 954,
          "save_start": 373,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "none"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 10,
              "die": 6,
              "damage_type": "Force"
            },
            {
              "kind": "flat",
              "amount": 40,
              "damage_type": "Force"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 10,
              "die": 6,
              "damage_type": "Force",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 432,
              "end": 454,
              "slot_index": 0,
              "roll_index": 0
            },
            {
              "kind": "flat",
              "amount": 40,
              "damage_type": "Force",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 439,
              "end": 454,
              "slot_index": 1,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Dispel Evil and Good",
      []
    ],
    [
      "Dispel Magic",
      []
    ],
    [
      "Dissonant Whispers",
      [
        {
          "span": "The target makes a Wisdom saving throw. On a failed save, it takes 3d6 Psychic damage and must immediately use its Reaction, if available, to move as far away from you as it can, using the safest route. On a successful save, the target takes half as much damage only. Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 1.",
          "start": 198,
          "end": 561,
          "save_start": 217,
          "ability": "wisdom",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 3,
              "die": 6,
              "damage_type": "Psychic"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 3,
              "die": 6,
              "damage_type": "Psychic",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 265,
              "end": 283,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Divination",
      []
    ],
    [
      "Divine Favor",
      []
    ],
    [
      "Divine Smite",
      []
    ],
    [
      "Divine Word",
      []
    ],
    [
      "Dominate Beast",
      []
    ],
    [
      "Dominate Monster",
      []
    ],
    [
      "Dominate Person",
      []
    ],
    [
      "Dragon’s Breath",
      [
        {
          "span": "Each creature in that area makes a Dexterity saving throw, taking 3d6 damage of the chosen type on a failed save or half as much damage on a successful one. Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 2.",
          "start": 322,
          "end": 574,
          "save_start": 357,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 3,
              "die": 6,
              "damage_type": null
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 3,
              "die": 6,
              "damage_type": null,
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 388,
              "end": 398,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Dream",
      [
        {
          "span": "If you do so, the messenger can deliver a message of no more than ten words, and then the target makes a Wisdom saving throw. On a failed save, the target gains no benefit from its rest, and it takes 3d6 Psychic damage when it wakes up.",
          "start": 1001,
          "end": 1237,
          "save_start": 1106,
          "ability": "wisdom",
          "success": {
            "status": "available",
            "kind": "none"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": "The damage occurs when the target wakes; that delayed timing is not representable.",
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 3,
              "die": 6,
              "damage_type": "Psychic"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 3,
              "die": 6,
              "damage_type": "Psychic",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 1201,
              "end": 1219,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Druidcraft",
      []
    ],
    [
      "Earthquake",
      [
        {
          "span": "A creature within a distance from a collapsing structure equal to half the structure’s height makes a Dexterity saving throw. On a failed save, the creature takes 12d6 Bludgeoning damage, has the Prone condition, and is buried in the rubble, requiring a DC 20 Strength (Athletics) check as an action to escape. On a successful save, the creature takes half as much damage only.",
          "start": 1351,
          "end": 1728,
          "save_start": 1453,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 12,
              "die": 6,
              "damage_type": "Bludgeoning"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 12,
              "die": 6,
              "damage_type": "Bludgeoning",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 1514,
              "end": 1537,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Eldritch Blast",
      []
    ],
    [
      "Elementalism",
      []
    ],
    [
      "Enhance Ability",
      []
    ],
    [
      "Enlarge/Reduce",
      [
        {
          "span": "If the target is an unwilling creature, it can make a Constitution saving throw. On a successful save, the spell has no effect. Everything that a targeted creature is wearing and carrying changes size with it. Any item it drops returns to normal size at once. A thrown weapon or piece of ammunition returns to normal size immediately after it hits or misses a target. Enlarge. The target’s size increases by one category—from Medium to Large, for example. The target also has Advantage on Strength checks and Strength saving throws. The target’s attacks with its enlarged weapons or Unarmed Strikes deal an extra 1d4 damage on a hit.",
          "start": 357,
          "end": 990,
          "save_start": 411,
          "ability": "constitution",
          "success": {
            "status": "unavailable",
            "reason": "The save gates another effect; the source does not make the numeric expression failed-save damage."
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [],
          "damage_occurrences": []
        }
      ]
    ],
    [
      "Ensnaring Strike",
      [
        {
          "span": "Level 1 Conjuration (Ranger) Casting Time: Bonus Action, which you take immediately after hitting a creature with a weapon Range: Self Components: V Duration: Concentration, up to 1 minute As you hit the target, grasping vines appear on it, and it makes a Strength saving throw. A Large or larger creature has Advantage on this save. On a failed save, the target has the Restrained condition until the spell ends. On a successful save, the vines shrivel away, and the spell ends. While Restrained, the target takes 1d6 Piercing damage at the start of each of its turns. The target or a creature within reach of it can take an action to make a Strength (Athletics) check against your spell save DC. On a success, the spell ends. Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 1.",
          "start": 0,
          "end": 823,
          "save_start": 256,
          "ability": "strength",
          "success": {
            "status": "unavailable",
            "reason": "The source clause does not prove the successful-save damage arm."
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 1,
              "die": 6,
              "damage_type": "Piercing"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 1,
              "die": 6,
              "damage_type": "Piercing",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 515,
              "end": 534,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Entangle",
      []
    ],
    [
      "Enthrall",
      []
    ],
    [
      "Etherealness",
      []
    ],
    [
      "Expeditious Retreat",
      []
    ],
    [
      "Eyebite",
      []
    ],
    [
      "Fabricate",
      []
    ],
    [
      "Faerie Fire",
      []
    ],
    [
      "Faithful Hound",
      [
        {
          "span": "That enemy must succeed on a Dexterity saving throw or take 4d8 Force damage. On your later turns, you can take a Magic action to move the hound up to 30 feet.",
          "start": 699,
          "end": 858,
          "save_start": 728,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "none"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 4,
              "die": 8,
              "damage_type": "Force"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 4,
              "die": 8,
              "damage_type": "Force",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 759,
              "end": 775,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "False Life",
      []
    ],
    [
      "Fear",
      []
    ],
    [
      "Feather Fall",
      []
    ],
    [
      "Find Familiar",
      []
    ],
    [
      "Find Steed",
      []
    ],
    [
      "Find the Path",
      []
    ],
    [
      "Find Traps",
      []
    ],
    [
      "Finger of Death",
      [
        {
          "span": "The target makes a Constitution saving throw, taking 7d8 + 30 Necrotic damage on a failed save or half as much damage on a successful one. A Humanoid killed by this spell rises at the start of your next turn as a Zombie (see “Monsters”) that follows your verbal orders.",
          "start": 196,
          "end": 465,
          "save_start": 215,
          "ability": "constitution",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 7,
              "die": 8,
              "damage_type": "Necrotic"
            },
            {
              "kind": "flat",
              "amount": 30,
              "damage_type": "Necrotic"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 7,
              "die": 8,
              "damage_type": "Necrotic",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 249,
              "end": 273,
              "slot_index": 0,
              "roll_index": 0
            },
            {
              "kind": "flat",
              "amount": 30,
              "damage_type": "Necrotic",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 255,
              "end": 273,
              "slot_index": 1,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Fireball",
      [
        {
          "span": "Each creature in a 20-foot-radius Sphere centered on that point makes a Dexterity saving throw, taking 8d6 Fire damage on a failed save or half as much damage on a successful one. Flammable objects in the area that aren’t being worn or carried start burning. Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 3.",
          "start": 277,
          "end": 631,
          "save_start": 349,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 8,
              "die": 6,
              "damage_type": "Fire"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 8,
              "die": 6,
              "damage_type": "Fire",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 380,
              "end": 395,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Fire Bolt",
      []
    ],
    [
      "Fire Shield",
      []
    ],
    [
      "Fire Storm",
      [
        {
          "span": "Each creature in the area makes a Dexterity saving throw, taking 7d10 Fire damage on a failed save or half as much damage on a successful one. Flammable objects in the area that aren’t being worn or carried start burning.",
          "start": 309,
          "end": 530,
          "save_start": 343,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 7,
              "die": 10,
              "damage_type": "Fire"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 7,
              "die": 10,
              "damage_type": "Fire",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 374,
              "end": 390,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Flame Blade",
      []
    ],
    [
      "Flame Strike",
      [
        {
          "span": "Each creature in a 10-foot-radius, 40-foot-high Cylinder centered on a point within range makes a Dexterity saving throw, taking 5d6 Fire damage and 5d6 Radiant damage on a failed save or half as much damage on a successful one. Using a Higher-Level Spell Slot. The Fire damage and the Radiant damage increase by 1d6 for each spell slot level above 5.",
          "start": 186,
          "end": 537,
          "save_start": 284,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 5,
              "die": 6,
              "damage_type": "Fire"
            },
            {
              "kind": "dice",
              "count": 5,
              "die": 6,
              "damage_type": "Radiant"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 5,
              "die": 6,
              "damage_type": "Fire",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 315,
              "end": 330,
              "slot_index": 0,
              "roll_index": 0
            },
            {
              "kind": "dice",
              "count": 5,
              "die": 6,
              "damage_type": "Radiant",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 335,
              "end": 353,
              "slot_index": 1,
              "roll_index": 1
            }
          ]
        }
      ]
    ],
    [
      "Flaming Sphere",
      [
        {
          "span": "Any creature that ends its turn within 5 feet of the sphere makes a Dexterity saving throw, taking 2d6 Fire damage on a failed save or half as much damage on a successful one. As a Bonus Action, you can move the sphere up to 30 feet, rolling it along the ground. If you move the sphere into a creature’s space, that creature makes the save against the sphere, and the sphere stops moving for the turn. When you move the sphere, you can direct it over barriers up to 5 feet tall and jump it across pits up to 10 feet wide. Flammable objects that aren’t being worn or carried start burning if touched by the sphere, and it sheds Bright Light in a 20-foot radius and Dim Light for an additional 20 feet. Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 2.",
          "start": 280,
          "end": 1076,
          "save_start": 348,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 2,
              "die": 6,
              "damage_type": "Fire"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 2,
              "die": 6,
              "damage_type": "Fire",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 379,
              "end": 394,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Flesh to Stone",
      []
    ],
    [
      "Floating Disk",
      []
    ],
    [
      "Fly",
      []
    ],
    [
      "Fog Cloud",
      []
    ],
    [
      "Forbiddance",
      []
    ],
    [
      "Forcecage",
      []
    ],
    [
      "Foresight",
      []
    ],
    [
      "Freedom of Movement",
      []
    ],
    [
      "Freezing Sphere",
      [
        {
          "span": "Each creature in that area makes a Constitution saving throw, taking 10d6 Cold damage on failed save or half as much damage on a successful one. If the globe strikes a body of water, it freezes the water to a depth of 6 inches over an area 30 feet square. This ice lasts for 1 minute. Creatures that were swimming on the surface of frozen water are trapped in the ice and have the Restrained condition. A trapped creature can take an action to make a Strength (Athletics) check against your spell save DC to break free. You can refrain from firing the globe after completing the spell’s casting. If you do so, a globe about the size of a sling bullet, cool to the touch, appears in your hand. At any time, you or a creature you give the globe to can throw the globe (to a range of 40 feet) or hurl it with a sling (to the sling’s normal range). It shatters on impact, with the same effect as a normal casting of the spell. You can also set the globe down without shattering it. After 1 minute, if the globe hasn’t already shattered, it explodes. Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 6.",
          "start": 265,
          "end": 1406,
          "save_start": 300,
          "ability": "constitution",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 10,
              "die": 6,
              "damage_type": "Cold"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 10,
              "die": 6,
              "damage_type": "Cold",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 334,
              "end": 350,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Gaseous Form",
      []
    ],
    [
      "Gate",
      []
    ],
    [
      "Geas",
      [
        {
          "span": "The target must succeed on a Wisdom saving throw or have the Charmed condition for the duration. The target automatically succeeds if it can’t understand your command. While Charmed, the creature takes 5d10 Psychic damage if it acts in a manner directly counter to your command.",
          "start": 303,
          "end": 581,
          "save_start": 332,
          "ability": "wisdom",
          "success": {
            "status": "unavailable",
            "reason": "The save gates another effect; the source does not make the numeric expression failed-save damage."
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [],
          "damage_occurrences": []
        }
      ]
    ],
    [
      "Gentle Repose",
      []
    ],
    [
      "Giant Insect",
      []
    ],
    [
      "Glibness",
      []
    ],
    [
      "Globe of Invulnerability",
      []
    ],
    [
      "Glyph of Warding",
      [
        {
          "span": "Each creature in the area makes a Dexterity saving throw. A creature takes 5d8 Acid, Cold, Fire, Lightning, or Thunder damage (your choice when you create the glyph) on a failed save or half as much damage on a successful one. Spell Glyph. You can store a prepared spell of level 3 or lower in the glyph by casting it as part of creating the glyph. The spell must target a single creature or an area. The spell being stored has no immediate effect when cast in this way. When the glyph is triggered, the stored spell takes effect. If the spell has a target, it targets the creature that triggered the glyph. If the spell affects an area, the area is centered on that creature. If the spell summons Hostile creatures or creates harmful objects or traps, they appear as close as possible to the intruder and attack it. If the spell requires Concentration, it lasts until the end of its full duration. Using a Higher-Level Spell Slot. The damage of an explosive rune increases by 1d8 for each spell slot level above 3. If you create a spell glyph, you can store any spell of up to the same level as the spell slot you use for the Glyph of Warding.",
          "start": 1660,
          "end": 2804,
          "save_start": 1694,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 5,
              "die": 8,
              "damage_type": "Acid"
            },
            {
              "kind": "dice",
              "count": 5,
              "die": 8,
              "damage_type": "Cold"
            },
            {
              "kind": "dice",
              "count": 5,
              "die": 8,
              "damage_type": "Fire"
            },
            {
              "kind": "dice",
              "count": 5,
              "die": 8,
              "damage_type": "Lightning"
            },
            {
              "kind": "dice",
              "count": 5,
              "die": 8,
              "damage_type": "Thunder"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 5,
              "die": 8,
              "damage_type": "Acid",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 1735,
              "end": 1785,
              "slot_index": 0,
              "roll_index": 0
            },
            {
              "kind": "dice",
              "count": 5,
              "die": 8,
              "damage_type": "Cold",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 1735,
              "end": 1785,
              "slot_index": 0,
              "roll_index": 0
            },
            {
              "kind": "dice",
              "count": 5,
              "die": 8,
              "damage_type": "Fire",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 1735,
              "end": 1785,
              "slot_index": 0,
              "roll_index": 0
            },
            {
              "kind": "dice",
              "count": 5,
              "die": 8,
              "damage_type": "Lightning",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 1735,
              "end": 1785,
              "slot_index": 0,
              "roll_index": 0
            },
            {
              "kind": "dice",
              "count": 5,
              "die": 8,
              "damage_type": "Thunder",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 1735,
              "end": 1785,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Goodberry",
      []
    ],
    [
      "Grease",
      []
    ],
    [
      "Greater Invisibility",
      []
    ],
    [
      "Greater Restoration",
      []
    ],
    [
      "Guardian of Faith",
      [
        {
          "span": "Any enemy that moves to a space within 10 feet of the guardian for the first time on a turn or starts its turn there makes a Dexterity saving throw, taking 20 Radiant damage on a failed save or half as much damage on a successful one. The guardian vanishes when it has dealt a total of 60 damage.",
          "start": 332,
          "end": 628,
          "save_start": 457,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "once_per_turn",
            "turn": "target"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "flat",
              "amount": 20,
              "damage_type": "Radiant"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "flat",
              "amount": 20,
              "damage_type": "Radiant",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 488,
              "end": 505,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Guards and Wards",
      []
    ],
    [
      "Guidance",
      []
    ],
    [
      "Guiding Bolt",
      []
    ],
    [
      "Gust of Wind",
      []
    ],
    [
      "Hallow",
      []
    ],
    [
      "Hallucinatory Terrain",
      []
    ],
    [
      "Harm",
      [
        {
          "span": "The target makes a Constitution saving throw. On a failed save, it takes 14d6 Necrotic damage, and its Hit Point maximum is reduced by an amount equal to the Necrotic damage it took. On a successful save, it takes half as much damage only. This spell can’t reduce a target’s Hit Point maximum below 1.",
          "start": 172,
          "end": 473,
          "save_start": 191,
          "ability": "constitution",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 14,
              "die": 6,
              "damage_type": "Necrotic"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 14,
              "die": 6,
              "damage_type": "Necrotic",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 245,
              "end": 265,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Haste",
      []
    ],
    [
      "Heal",
      []
    ],
    [
      "Healing Word",
      []
    ],
    [
      "Heat Metal",
      []
    ],
    [
      "Hellish Rebuke",
      [
        {
          "span": "It makes a Dexterity saving throw, taking 2d10 Fire damage on a failed save or half as much damage on a successful one. Using a Higher-Level Spell Slot. The damage increases by 1d10 for each spell slot level above 1.",
          "start": 285,
          "end": 501,
          "save_start": 296,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 2,
              "die": 10,
              "damage_type": "Fire"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 2,
              "die": 10,
              "damage_type": "Fire",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 327,
              "end": 343,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Heroes’ Feast",
      []
    ],
    [
      "Heroism",
      []
    ],
    [
      "Hex",
      []
    ],
    [
      "Hideous Laughter",
      []
    ],
    [
      "Hold Monster",
      []
    ],
    [
      "Hold Person",
      []
    ],
    [
      "Holy Aura",
      []
    ],
    [
      "Hunter’s Mark",
      []
    ],
    [
      "Hypnotic Pattern",
      []
    ],
    [
      "Ice Knife",
      [
        {
          "span": "The target and each creature within 5 feet of it must succeed on a Dexterity saving throw or take 2d6 Cold damage. Using a Higher-Level Spell Slot. The Cold damage increases by 1d6 for each spell slot level above 1.",
          "start": 362,
          "end": 577,
          "save_start": 429,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "none"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 2,
              "die": 6,
              "damage_type": "Cold"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 2,
              "die": 6,
              "damage_type": "Cold",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 460,
              "end": 475,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Ice Storm",
      [
        {
          "span": "Each creature in the Cylinder makes a Dexterity saving throw. A creature takes 2d10 Bludgeoning damage and 4d6 Cold damage on a failed save or half as much damage on a successful one. Hailstones turn ground in the Cylinder into Difficult Terrain until the end of your next turn. Using a Higher-Level Spell Slot. The Bludgeoning damage increases by 1d10 for each spell slot level above 4.",
          "start": 224,
          "end": 611,
          "save_start": 262,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 2,
              "die": 10,
              "damage_type": "Bludgeoning"
            },
            {
              "kind": "dice",
              "count": 4,
              "die": 6,
              "damage_type": "Cold"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 2,
              "die": 10,
              "damage_type": "Bludgeoning",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 303,
              "end": 326,
              "slot_index": 0,
              "roll_index": 0
            },
            {
              "kind": "dice",
              "count": 4,
              "die": 6,
              "damage_type": "Cold",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 331,
              "end": 346,
              "slot_index": 1,
              "roll_index": 1
            }
          ]
        }
      ]
    ],
    [
      "Identify",
      []
    ],
    [
      "Illusory Script",
      []
    ],
    [
      "Imprisonment",
      []
    ],
    [
      "Incendiary Cloud",
      [
        {
          "span": "When the cloud appears, each creature in it makes a Dexterity saving throw, taking 10d8 Fire damage on a failed save or half as much damage on a successful one. A creature must also make this save when the Sphere moves into its space and when it enters the Sphere or ends its turn there. A creature makes this save only once per turn. The cloud moves 10 feet away from you in a direction you choose at the start of each of your turns.",
          "start": 378,
          "end": 812,
          "save_start": 430,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "once_per_turn",
            "turn": "target"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 10,
              "die": 8,
              "damage_type": "Fire"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 10,
              "die": 8,
              "damage_type": "Fire",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 461,
              "end": 477,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Inflict Wounds",
      [
        {
          "span": "Level 1 Necromancy (Cleric) Casting Time: Action Range: Touch Components: V, S Duration: Instantaneous A creature you touch makes a Constitution saving throw, taking 2d10 Necrotic damage on a failed save or half as much damage on a successful one. Using a Higher-Level Spell Slot. The damage increases by 1d10 for each spell slot level above 1.",
          "start": 0,
          "end": 344,
          "save_start": 132,
          "ability": "constitution",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 2,
              "die": 10,
              "damage_type": "Necrotic"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 2,
              "die": 10,
              "damage_type": "Necrotic",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 166,
              "end": 186,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Insect Plague",
      [
        {
          "span": "When the swarm appears, each creature in it makes a Constitution saving throw, taking 4d10 Piercing damage on a failed save or half as much damage on a successful one. A creature also makes this save when it enters the spell’s area for the first time on a turn or ends its turn there. A creature makes this save only once per turn. Using a Higher-Level Spell Slot. The damage increases by 1d10 for each spell slot level above 5.",
          "start": 340,
          "end": 768,
          "save_start": 392,
          "ability": "constitution",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "once_per_turn",
            "turn": "target"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 4,
              "die": 10,
              "damage_type": "Piercing"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 4,
              "die": 10,
              "damage_type": "Piercing",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 426,
              "end": 446,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Instant Summons",
      []
    ],
    [
      "Irresistible Dance",
      []
    ],
    [
      "Invisibility",
      []
    ],
    [
      "Jump",
      []
    ],
    [
      "Knock",
      []
    ],
    [
      "Legend Lore",
      []
    ],
    [
      "Lesser Restoration",
      []
    ],
    [
      "Levitate",
      []
    ],
    [
      "Light",
      []
    ],
    [
      "Lightning Bolt",
      [
        {
          "span": "Each creature in the Line makes a Dexterity saving throw, taking 8d6 Lightning damage on a failed save or half as much damage on a successful one. Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 3.",
          "start": 258,
          "end": 500,
          "save_start": 292,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 8,
              "die": 6,
              "damage_type": "Lightning"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 8,
              "die": 6,
              "damage_type": "Lightning",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 323,
              "end": 343,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Locate Animals or Plants",
      []
    ],
    [
      "Locate Creature",
      []
    ],
    [
      "Locate Object",
      []
    ],
    [
      "Longstrider",
      []
    ],
    [
      "Mage Armor",
      []
    ],
    [
      "Mage Hand",
      []
    ],
    [
      "Magic Circle",
      []
    ],
    [
      "Magic Jar",
      []
    ],
    [
      "Magic Missile",
      []
    ],
    [
      "Magic Mouth",
      []
    ],
    [
      "Magic Weapon",
      []
    ],
    [
      "Magnificent Mansion",
      []
    ],
    [
      "Major Image",
      []
    ],
    [
      "Mass Cure Wounds",
      []
    ],
    [
      "Mass Heal",
      []
    ],
    [
      "Mass Healing Word",
      []
    ],
    [
      "Mass Suggestion",
      []
    ],
    [
      "Maze",
      []
    ],
    [
      "Meld into Stone",
      []
    ],
    [
      "Mending",
      []
    ],
    [
      "Message",
      []
    ],
    [
      "Meteor Swarm",
      [
        {
          "span": "Each creature in a 40-foot-radius Sphere centered on each of those points makes a Dexterity saving throw. A creature takes 20d6 Fire damage and 20d6 Bludgeoning damage on a failed save or half as much damage on a successful one. A creature in the area of more than one fiery Sphere is affected only once. A nonmagical object that isn’t being worn or carried also takes the damage if it’s in the spell’s area, and the object starts burning if it’s flammable.",
          "start": 207,
          "end": 664,
          "save_start": 289,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 20,
              "die": 6,
              "damage_type": "Fire"
            },
            {
              "kind": "dice",
              "count": 20,
              "die": 6,
              "damage_type": "Bludgeoning"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 20,
              "die": 6,
              "damage_type": "Fire",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 330,
              "end": 346,
              "slot_index": 0,
              "roll_index": 0
            },
            {
              "kind": "dice",
              "count": 20,
              "die": 6,
              "damage_type": "Bludgeoning",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 351,
              "end": 374,
              "slot_index": 1,
              "roll_index": 1
            }
          ]
        }
      ]
    ],
    [
      "Mind Blank",
      []
    ],
    [
      "Mind Spike",
      [
        {
          "span": "The target makes a Wisdom saving throw, taking 3d8 Psychic damage on a failed save or half as much damage on a successful one. On a failed save, you also always know the target’s location until the spell ends, but only while the two of you are on the same plane of existence. While you have this knowledge, the target can’t become hidden from you, and if it has the Invisible condition, it gains no benefit from that condition against you. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 2.",
          "start": 228,
          "end": 763,
          "save_start": 247,
          "ability": "wisdom",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 3,
              "die": 8,
              "damage_type": "Psychic"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 3,
              "die": 8,
              "damage_type": "Psychic",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 275,
              "end": 293,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Minor Illusion",
      []
    ],
    [
      "Mirage Arcane",
      []
    ],
    [
      "Mirror Image",
      []
    ],
    [
      "Mislead",
      []
    ],
    [
      "Misty Step",
      []
    ],
    [
      "Modify Memory",
      []
    ],
    [
      "Moonbeam",
      [
        {
          "span": "When the Cylinder appears, each creature in it makes a Constitution saving throw. On a failed save, a creature takes 2d10 Radiant damage, and if the creature is shape-shifted (as a result of the Polymorph spell, for example), it reverts to its true form and can’t shape-shift until it leaves the Cylinder. On a successful save, a creature takes half as much damage only. A creature also makes this save when the spell’s area moves into its space and when it enters the spell’s area or ends its turn there. A creature makes this save only once per turn. Using a Higher-Level Spell Slot. The damage increases by 1d10 for each spell slot level above 2.",
          "start": 393,
          "end": 1042,
          "save_start": 448,
          "ability": "constitution",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "once_per_turn",
            "turn": "target"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 2,
              "die": 10,
              "damage_type": "Radiant"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 2,
              "die": 10,
              "damage_type": "Radiant",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 510,
              "end": 529,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Move Earth",
      []
    ],
    [
      "Nondetection",
      []
    ],
    [
      "Passwall",
      []
    ],
    [
      "Pass without Trace",
      []
    ],
    [
      "Phantasmal Force",
      [
        {
          "span": "The target makes an Intelligence saving throw. On a failed save, you create a phantasmal object, creature, or other phenomenon that is no larger than a 10-foot Cube and that is perceivable only to the target for the duration. The phantasm includes sound, temperature, and other stimuli. The target can take a Study action to examine the phantasm with an Intelligence (Investigation) check against your spell save DC. If the check succeeds, the target realizes that the phantasm is an illusion, and the spell ends. While affected by the spell, the target treats the phantasm as if it were real and rationalizes any illogical outcomes from interacting with it. For example, if the target steps through a phantasmal bridge and survives the fall, it believes the bridge exists and something else caused it to fall. An affected target can even take damage from the illusion if the phantasm represents a dangerous creature or hazard. On each of your turns, such a phantasm can deal 2d8 Psychic damage to the target if it is in the phantasm’s area or within 5 feet of the phantasm.",
          "start": 241,
          "end": 1315,
          "save_start": 261,
          "ability": "intelligence",
          "success": {
            "status": "unavailable",
            "reason": "The save gates another effect; the source does not make the numeric expression failed-save damage."
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [],
          "damage_occurrences": []
        }
      ]
    ],
    [
      "Phantasmal Killer",
      [
        {
          "span": "The target makes a Wisdom saving throw. On a failed save, the target takes 4d10 Psychic damage and has Disadvantage on ability checks and attack rolls for the duration. On a successful save, the target takes half as much damage, and the spell ends. For the duration, the target makes a",
          "start": 269,
          "end": 554,
          "save_start": 288,
          "ability": "wisdom",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 4,
              "die": 10,
              "damage_type": "Psychic"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 4,
              "die": 10,
              "damage_type": "Psychic",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 344,
              "end": 363,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        },
        {
          "span": "For the duration, the target makes a Wisdom saving throw at the end of each of its turns. On a failed save, it takes the Psychic damage again. On a successful save, the spell ends. Using a Higher-Level Spell Slot. The damage increases by 1d10 for each spell slot level above 4.",
          "start": 518,
          "end": 795,
          "save_start": 555,
          "ability": "wisdom",
          "success": {
            "status": "available",
            "kind": "none"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "once_per_turn",
            "turn": "target"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 1,
              "die": 10,
              "damage_type": "Psychic"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 4,
              "die": 10,
              "damage_type": "Psychic",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 344,
              "end": 363,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Phantom Steed",
      []
    ],
    [
      "Planar Ally",
      []
    ],
    [
      "Planar Binding",
      []
    ],
    [
      "Plane Shift",
      []
    ],
    [
      "Plant Growth",
      []
    ],
    [
      "Poison Spray",
      []
    ],
    [
      "Polymorph",
      []
    ],
    [
      "Power Word Heal",
      []
    ],
    [
      "Power Word Kill",
      []
    ],
    [
      "Power Word Stun",
      []
    ],
    [
      "Prayer of Healing",
      []
    ],
    [
      "Prestidigitation",
      []
    ],
    [
      "Prismatic Spray",
      [
        {
          "span": "Each creature in the Cone makes a Dexterity saving throw. For each target, roll 1d8 to determine which color ray affects it, consulting the Prismatic Rays table. Prismatic Rays 1d8 Ray 1   Red. Failed Save: 12d6 Fire damage. Successful Save: Half as much damage. 2   Orange. Failed Save: 12d6 Acid damage. Successful Save: Half as much damage. 3   Yellow. Failed Save: 12d6 Lightning damage. Successful Save: Half as much damage. 4   Green. Failed Save: 12d6 Poison damage. Successful Save: Half as much damage. 1d8 Ray 5   Blue. Failed Save: 12d6 Cold damage. Successful Save: Half as much damage. 6   Indigo. Failed Save: The target has the Restrained condition and makes a Constitution saving throw at the end of each of its turns. If it successfully saves three times, the condition ends. If it fails three times, it has the Petrified condition until it is freed by an effect like the Greater Restoration spell. The successes and failures needn’t be consecutive; keep track of both until the target collects three of a kind. 7   Violet. Failed Save: The target has the Blinded condition and makes a Wisdom saving throw at the start of your next turn. On a successful save, the condition ends. On a failed save, the condition ends, and the creature teleports to another plane of existence (GM’s choice). 8   Special. The target is struck by two rays. Roll twice, rerolling any 8.",
          "start": 171,
          "end": 1553,
          "save_start": 205,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "unavailable",
            "reason": "The random ray selection and conditional two-ray branch are not representable."
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 12,
              "die": 6,
              "damage_type": "Fire"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 12,
              "die": 6,
              "damage_type": "Fire",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 378,
              "end": 394,
              "slot_index": 0,
              "roll_index": 0
            },
            {
              "kind": "dice",
              "count": 12,
              "die": 6,
              "damage_type": "Acid",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 459,
              "end": 475,
              "slot_index": 0,
              "roll_index": 0
            },
            {
              "kind": "dice",
              "count": 12,
              "die": 6,
              "damage_type": "Lightning",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 540,
              "end": 561,
              "slot_index": 0,
              "roll_index": 0
            },
            {
              "kind": "dice",
              "count": 12,
              "die": 6,
              "damage_type": "Poison",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 625,
              "end": 643,
              "slot_index": 0,
              "roll_index": 0
            },
            {
              "kind": "dice",
              "count": 12,
              "die": 6,
              "damage_type": "Cold",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 714,
              "end": 730,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Prismatic Wall",
      [
        {
          "span": "Each layer forces the creature to make a Dexterity saving throw or be affected by that layer’s properties as described in the Prismatic Layers table. The wall, which has AC 10, can be destroyed one layer at a time, in order from red to violet, by means specific to each layer. If a layer is destroyed, it is gone for the duration. Antimagic Field has no effect on the wall, and Dispel Magic can affect only the violet layer. Prismatic Layers Order   Effects 1     Red. Failed Save: 12d6 Fire damage. Successful Save: Half as much damage. Additional Effects: Nonmagical ranged attacks can’t pass through this layer, which is destroyed if it takes at least 25 Cold damage. 2     Orange. Failed Save: 12d6 Acid damage. Successful Save: Half as much damage. Additional Effects: Magical ranged attacks can’t pass through this layer, which is destroyed by a strong wind (such as the one created by Gust of Wind). 3     Yellow. Failed Save: 12d6 Lightning damage. Successful Save: Half as much damage. Additional Effects: The layer is destroyed if it takes at least 60 Force damage. 4     Green. Failed Save: 12d6 Poison damage. Successful Save: Half as much damage. Additional Effects: A Passwall spell, or another spell of equal or greater level that can open a portal on a solid surface, destroys this layer. 5     Blue. Failed Save: 12d6 Cold damage. Successful Save: Half as much damage. Additional Effects: The layer is destroyed if it takes at least 25 Fire damage. 6     Indigo. Failed Save: The target has the Restrained condition and makes a Constitution saving throw at the end of each of its turns. If it successfully saves three times, the condition ends. If it fails three times, it has the Petrified condition until it is freed by an effect like the Greater Restoration spell. The successes and failures needn’t be consecutive; keep track of both until the target collects three of a kind. Additional Effects: Spells can’t be cast through this layer, which is destroyed by Bright Light shed by the Daylight spell. 7     Violet. Failed Save: The target has the Blinded condition and makes a Wisdom saving throw at the start of your next turn. On a successful save, the condition ends. On a failed save, the condition ends, and the creature teleports to another plane of existence (GM’s choice). Additional Effects: This layer is destroyed by Dispel Magic.",
          "start": 1071,
          "end": 3433,
          "save_start": 1112,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 12,
              "die": 6,
              "damage_type": "Fire"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 12,
              "die": 6,
              "damage_type": "Fire",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 1553,
              "end": 1569,
              "slot_index": 0,
              "roll_index": 0
            },
            {
              "kind": "dice",
              "count": 12,
              "die": 6,
              "damage_type": "Acid",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 1769,
              "end": 1785,
              "slot_index": 0,
              "roll_index": 0
            },
            {
              "kind": "dice",
              "count": 12,
              "die": 6,
              "damage_type": "Lightning",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 2005,
              "end": 2026,
              "slot_index": 0,
              "roll_index": 0
            },
            {
              "kind": "dice",
              "count": 12,
              "die": 6,
              "damage_type": "Poison",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 2173,
              "end": 2191,
              "slot_index": 0,
              "roll_index": 0
            },
            {
              "kind": "dice",
              "count": 12,
              "die": 6,
              "damage_type": "Cold",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 2401,
              "end": 2417,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Private Sanctum",
      []
    ],
    [
      "Produce Flame",
      []
    ],
    [
      "Programmed Illusion",
      []
    ],
    [
      "Project Image",
      []
    ],
    [
      "Protection from Energy",
      []
    ],
    [
      "Protection from Evil and Good",
      []
    ],
    [
      "Protection from Poison",
      []
    ],
    [
      "Purify Food and Drink",
      []
    ],
    [
      "Raise Dead",
      []
    ],
    [
      "Ray of Enfeeblement",
      [
        {
          "span": "The target must make a Constitution saving throw. On a successful save, the target has Disadvantage on the next attack roll it makes until the start of your next turn. On a failed save, the target has Disadvantage on Strength-based D20 Tests for the duration. During that time, it also subtracts 1d8 from all its damage rolls. The target repeats the save at the end of each of its turns, ending the spell on a success.",
          "start": 206,
          "end": 624,
          "save_start": 229,
          "ability": "constitution",
          "success": {
            "status": "unavailable",
            "reason": "The source clause does not prove the successful-save damage arm."
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 1,
              "die": 8,
              "damage_type": null
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 1,
              "die": 8,
              "damage_type": null,
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 502,
              "end": 525,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Ray of Frost",
      []
    ],
    [
      "Regenerate",
      []
    ],
    [
      "Ray of Sickness",
      []
    ],
    [
      "Reincarnate",
      []
    ],
    [
      "Remove Curse",
      []
    ],
    [
      "Resilient Sphere",
      []
    ],
    [
      "Resistance",
      []
    ],
    [
      "Resurrection",
      []
    ],
    [
      "Reverse Gravity",
      []
    ],
    [
      "Revivify",
      []
    ],
    [
      "Rope Trick",
      []
    ],
    [
      "Sacred Flame",
      [
        {
          "span": "The target must succeed on a Dexterity saving throw or take 1d8 Radiant damage. The target gains no benefit from Half Cover or Three-Quarters Cover for this save. Cantrip Upgrade. The damage increases by 1d8 when you reach levels 5 (2d8), 11 (3d8), and 17 (4d8).",
          "start": 178,
          "end": 440,
          "save_start": 207,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "none"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 1,
              "die": 8,
              "damage_type": "Radiant"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 1,
              "die": 8,
              "damage_type": "Radiant",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 238,
              "end": 256,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Sanctuary",
      []
    ],
    [
      "Scorching Ray",
      []
    ],
    [
      "Scrying",
      []
    ],
    [
      "Searing Smite",
      [
        {
          "span": "Level 1 Evocation (Paladin) Casting Time: Bonus Action, which you take immediately after hitting a target with a Melee weapon or an Unarmed Strike Range: Self Component: V Duration: 1 minute As you hit the target, it takes an extra 1d6 Fire damage from the attack. At the start of each of its turns until the spell ends, the target takes 1d6 Fire damage and then makes a Constitution saving throw. On a failed save, the spell continues. On a successful save, the spell ends.",
          "start": 0,
          "end": 474,
          "save_start": 371,
          "ability": "constitution",
          "success": {
            "status": "unavailable",
            "reason": "The save gates another effect; the source does not make the numeric expression failed-save damage."
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "once_per_turn",
            "turn": "target"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [],
          "damage_occurrences": []
        }
      ]
    ],
    [
      "Secret Chest",
      []
    ],
    [
      "See Invisibility",
      []
    ],
    [
      "Seeming",
      []
    ],
    [
      "Sending",
      []
    ],
    [
      "Sequester",
      []
    ],
    [
      "Shapechange",
      []
    ],
    [
      "Shatter",
      [
        {
          "span": "Each creature in a 10-foot-radius Sphere centered there makes a Constitution saving throw, taking 3d8 Thunder damage on a failed save or half as much damage on a successful one. A Construct has Disadvantage on the save. A nonmagical object that isn’t being worn or carried also takes the damage if it’s in the spell’s area. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 2.",
          "start": 202,
          "end": 621,
          "save_start": 266,
          "ability": "constitution",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 3,
              "die": 8,
              "damage_type": "Thunder"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 3,
              "die": 8,
              "damage_type": "Thunder",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 300,
              "end": 318,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Shield",
      []
    ],
    [
      "Shield of Faith",
      []
    ],
    [
      "Shillelagh",
      []
    ],
    [
      "Shining Smite",
      []
    ],
    [
      "Shocking Grasp",
      []
    ],
    [
      "Silence",
      []
    ],
    [
      "Silent Image",
      []
    ],
    [
      "Simulacrum",
      []
    ],
    [
      "Sleep",
      []
    ],
    [
      "Sleet Storm",
      []
    ],
    [
      "Slow",
      []
    ],
    [
      "Sorcerous Burst",
      []
    ],
    [
      "Spare the Dying",
      []
    ],
    [
      "Speak with Animals",
      []
    ],
    [
      "Speak with Dead",
      []
    ],
    [
      "Speak with Plants",
      []
    ],
    [
      "Spider Climb",
      []
    ],
    [
      "Spike Growth",
      []
    ],
    [
      "Spirit Guardians",
      [
        {
          "span": "Any other creature’s Speed is halved in the Emanation, and whenever the Emanation enters a creature’s space and whenever a creature enters the Emanation or ends its turn there, the creature must make a Wisdom saving throw. On a failed save, the creature takes 3d8 Radiant damage (if you are good or neutral) or 3d8 Necrotic damage (if you are evil). On a successful save, the creature takes half as much damage. A creature makes this save only once per turn. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 3.",
          "start": 421,
          "end": 975,
          "save_start": 623,
          "ability": "wisdom",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "once_per_turn",
            "turn": "target"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 3,
              "die": 8,
              "damage_type": "Radiant"
            },
            {
              "kind": "dice",
              "count": 3,
              "die": 8,
              "damage_type": "Necrotic"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 3,
              "die": 8,
              "damage_type": "Radiant",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 681,
              "end": 699,
              "slot_index": 0,
              "roll_index": 0
            },
            {
              "kind": "dice",
              "count": 3,
              "die": 8,
              "damage_type": "Necrotic",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 732,
              "end": 751,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Spiritual Weapon",
      []
    ],
    [
      "Starry Wisp",
      []
    ],
    [
      "Stinking Cloud",
      []
    ],
    [
      "Stone Shape",
      []
    ],
    [
      "Stoneskin",
      []
    ],
    [
      "Storm of Vengeance",
      [
        {
          "span": "Each creature under the cloud when it appears must succeed on a Constitution saving throw or take 2d6 Thunder damage and have the Deafened condition for the duration. At the start of each of your later turns, the storm produces different effects, as detailed below. Turn 2. Acidic rain falls. Each creature and object under the cloud takes 4d6 Acid damage. Turn 3. You call six bolts of lightning from the cloud to strike six different creatures or objects beneath it. Each target makes a",
          "start": 239,
          "end": 727,
          "save_start": 303,
          "ability": "constitution",
          "success": {
            "status": "available",
            "kind": "none"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 2,
              "die": 6,
              "damage_type": "Thunder"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 2,
              "die": 6,
              "damage_type": "Thunder",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 337,
              "end": 355,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        },
        {
          "span": "Each target makes a Dexterity saving throw, taking 10d6 Lightning damage on a failed save or half as much damage on a successful one. Turn 4. Hailstones rain down. Each creature under the cloud takes 2d6 Bludgeoning damage. Turns 5–10. Gusts and freezing rain assail the area under the cloud. Each creature there takes 1d6 Cold damage. Until the spell ends, the area is Difficult Terrain and Heavily Obscured, ranged attacks with weapons are impossible there, and strong wind blows through the area.",
          "start": 708,
          "end": 1207,
          "save_start": 728,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 10,
              "die": 6,
              "damage_type": "Lightning"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 10,
              "die": 6,
              "damage_type": "Lightning",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 759,
              "end": 780,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Suggestion",
      []
    ],
    [
      "Summon Dragon",
      [
        {
          "span": "Dexterity Saving Throw: DC equals your spell save DC, each creature in a 30-foot Cone. Failure: 2d6 damage of a type this spirit has Resistance to (your choice when you cast the spell). Success: Half damage.",
          "start": 1802,
          "end": 2009,
          "save_start": 1802,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 2,
              "die": 6,
              "damage_type": null
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 2,
              "die": 6,
              "damage_type": null,
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 1898,
              "end": 1908,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Sunbeam",
      [
        {
          "span": "Each creature in the Line makes a Constitution saving throw. On a failed save, a creature takes 6d8 Radiant damage and has the Blinded condition until the start of your next turn. On a successful save, it takes half as much damage only. Until the spell ends, you can take a Magic action to create a new Line of radiance. For the duration, a mote of brilliant radiance shines above you. It sheds Bright Light in a 30-foot radius and Dim Light for an additional 30 feet. This light is sunlight.",
          "start": 224,
          "end": 716,
          "save_start": 258,
          "ability": "constitution",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 6,
              "die": 8,
              "damage_type": "Radiant"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 6,
              "die": 8,
              "damage_type": "Radiant",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 320,
              "end": 338,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Sunburst",
      [
        {
          "span": "Each creature in the Sphere makes a Constitution saving throw. On a failed save, a creature takes 12d6 Radiant damage and has the Blinded condition for 1 minute. On a successful save, it takes half as much damage only. A creature Blinded by this spell makes another Constitution saving throw at the end of each of its turns, ending the effect on itself on a success. This spell dispels Darkness in its area that was created by any spell.",
          "start": 254,
          "end": 691,
          "save_start": 290,
          "ability": "constitution",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 12,
              "die": 6,
              "damage_type": "Radiant"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 12,
              "die": 6,
              "damage_type": "Radiant",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 352,
              "end": 371,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Symbol",
      [
        {
          "span": "Each target makes a Constitution saving throw, taking 10d10 Necrotic damage on a failed save or half as much damage on a successful save. Discord. Each target makes a Wisdom saving throw. On a failed save, a target argues with other creatures for 1 minute. During this time, it is incapable of meaningful communication and has Disadvantage on attack rolls and ability checks. Fear. Each target must succeed on a Wisdom saving throw or have the Frightened condition for 1 minute. While Frightened, the target must move at least 30 feet away from the glyph on each of its turns, if able. Pain. Each target must succeed on a Constitution saving throw or have the Incapacitated condition for 1 minute. Sleep. Each target must succeed on a Wisdom saving throw or have the Unconscious condition for 10 minutes. A creature awakens if it takes damage or if someone takes an action to shake it awake. Stunning. Each target must succeed on a Wisdom saving throw or have the Stunned condition for 1 minute.",
          "start": 1859,
          "end": 2854,
          "save_start": 1879,
          "ability": "constitution",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "once_per_turn",
            "turn": "target"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 10,
              "die": 10,
              "damage_type": "Necrotic"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 10,
              "die": 10,
              "damage_type": "Necrotic",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 1913,
              "end": 1934,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Telekinesis",
      []
    ],
    [
      "Telepathic Bond",
      []
    ],
    [
      "Teleport",
      []
    ],
    [
      "Teleportation Circle",
      []
    ],
    [
      "Thaumaturgy",
      []
    ],
    [
      "Thunderwave",
      [
        {
          "span": "Each creature in a 15-foot Cube originating from you makes a Constitution saving throw. On a failed save, a creature takes 2d8 Thunder damage and is pushed 10 feet away from you. On a successful save, a creature takes half as much damage only. In addition, unsecured objects that are entirely within the Cube are pushed 10 feet away from you, and a thunderous boom is audible within 300 feet. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 1.",
          "start": 165,
          "end": 653,
          "save_start": 226,
          "ability": "constitution",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 2,
              "die": 8,
              "damage_type": "Thunder"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 2,
              "die": 8,
              "damage_type": "Thunder",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 288,
              "end": 306,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Time Stop",
      []
    ],
    [
      "Tiny Hut",
      []
    ],
    [
      "Tongues",
      []
    ],
    [
      "Transport via Plants",
      []
    ],
    [
      "Tree Stride",
      []
    ],
    [
      "True Polymorph",
      []
    ],
    [
      "True Resurrection",
      []
    ],
    [
      "True Seeing",
      []
    ],
    [
      "True Strike",
      []
    ],
    [
      "Tsunami",
      [
        {
          "span": "When the wall appears, each creature in its area makes a Strength saving throw, taking 6d10 Bludgeoning damage on a failed save or half as much damage on a successful one. At the start of each of your turns after the wall appears, the wall, along with any creatures in it, moves 50 feet away from you. Any Huge or smaller creature inside the wall or whose space the wall enters when it moves must succeed on a",
          "start": 307,
          "end": 716,
          "save_start": 364,
          "ability": "strength",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 6,
              "die": 10,
              "damage_type": "Bludgeoning"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 6,
              "die": 10,
              "damage_type": "Bludgeoning",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 394,
              "end": 417,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        },
        {
          "span": "Any Huge or smaller creature inside the wall or whose space the wall enters when it moves must succeed on a Strength saving throw or take 5d10 Bludgeoning damage. A creature can take this damage only once per round. At the end of the turn, the wall’s height is reduced by 50 feet, and the damage the wall deals on later rounds is reduced by 1d10. When the wall reaches 0 feet in height, the spell ends. A creature caught in the wall can move by swimming. Because of the wave’s force, though, the creature must succeed on a Strength (Athletics) check against your spell save DC to move at all. If it fails the check, it can’t move. A creature that moves out of the wall falls to the ground.",
          "start": 609,
          "end": 1298,
          "save_start": 717,
          "ability": "strength",
          "success": {
            "status": "available",
            "kind": "none"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "once_per_round"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 5,
              "die": 10,
              "damage_type": "Bludgeoning"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 5,
              "die": 10,
              "damage_type": "Bludgeoning",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 747,
              "end": 770,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Unseen Servant",
      []
    ],
    [
      "Vampiric Touch",
      []
    ],
    [
      "Vicious Mockery",
      [
        {
          "span": "The target must succeed on a Wisdom saving throw or take 1d6 Psychic damage and have Disadvantage on the next attack roll it makes before the end of its next turn. Cantrip Upgrade. The damage increases by 1d6 when you reach levels 5 (2d6), 11 (3d6), and 17 (4d6).",
          "start": 214,
          "end": 477,
          "save_start": 243,
          "ability": "wisdom",
          "success": {
            "status": "available",
            "kind": "none"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 1,
              "die": 6,
              "damage_type": "Psychic"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 1,
              "die": 6,
              "damage_type": "Psychic",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 271,
              "end": 289,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Vitriolic Sphere",
      [
        {
          "span": "Each creature in that area makes a Dexterity saving throw. On a failed save, a creature takes 10d4 Acid damage and another 5d4 Acid damage at the end of its next turn. On a successful save, a creature takes half the initial damage only. Using a Higher-Level Spell Slot. The initial damage increases by 2d4 for each spell slot level above 4.",
          "start": 272,
          "end": 612,
          "save_start": 307,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "sourced_damage"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "includes_delayed_damage",
            "delayed_until": "end_of_target_next_turn"
          },
          "timing_unavailable_reason": "The delayed damage occurs at the end of the target’s next turn; round scheduling is not representable.",
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 10,
              "die": 4,
              "damage_type": "Acid"
            },
            {
              "kind": "dice",
              "count": 5,
              "die": 4,
              "damage_type": "Acid"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 10,
              "die": 4,
              "damage_type": "Acid",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 366,
              "end": 382,
              "slot_index": 0,
              "roll_index": 0
            },
            {
              "kind": "dice",
              "count": 5,
              "die": 4,
              "damage_type": "Acid",
              "arm": "failure",
              "timing": "end_of_target_next_turn",
              "roll_transform": "none",
              "start": 395,
              "end": 410,
              "slot_index": 1,
              "roll_index": 1
            },
            {
              "kind": "dice",
              "count": 10,
              "die": 4,
              "damage_type": "Acid",
              "arm": "success",
              "timing": "on_save_resolution",
              "roll_transform": "floor_half",
              "start": 479,
              "end": 507,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Wall of Fire",
      [
        {
          "span": "When the wall appears, each creature in its area makes a Dexterity saving throw, taking 5d8 Fire damage on a failed save or half as much damage on a successful one. One side of the wall, selected by you when you cast this spell, deals 5d8 Fire damage to each creature that ends its turn within 10 feet of that side or inside the wall. A creature takes the same damage when it enters the wall for the first time on a turn or ends its turn there. The other side of the wall deals no damage. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 4.",
          "start": 419,
          "end": 1003,
          "save_start": 476,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 5,
              "die": 8,
              "damage_type": "Fire"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 5,
              "die": 8,
              "damage_type": "Fire",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 507,
              "end": 522,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Wall of Force",
      []
    ],
    [
      "Wall of Ice",
      [
        {
          "span": "If the wall cuts through a creature’s space when it appears, the creature is pushed to one side of the wall (you choose which side) and makes a Dexterity saving throw, taking 10d6 Cold damage on a failed save or half as much damage on a successful one. The wall is an object that can be damaged and thus breached. It has AC 12 and 30 Hit Points per 10-foot section, and it has Immunity to Cold, Poison, and Psychic damage and Vulnerability to Fire damage. Reducing a 10-foot section of wall to 0 Hit Points destroys it and leaves behind a sheet of frigid air in the space the wall occupied. A creature moving through the sheet of frigid air for the first time on a turn makes a",
          "start": 475,
          "end": 1152,
          "save_start": 619,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 10,
              "die": 6,
              "damage_type": "Cold"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 10,
              "die": 6,
              "damage_type": "Cold",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 650,
              "end": 666,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        },
        {
          "span": "A creature moving through the sheet of frigid air for the first time on a turn makes a Constitution saving throw, taking 5d6 Cold damage on a failed save or half as much damage on a successful one. Using a Higher-Level Spell Slot. The damage the wall deals when it appears increases by 2d6 and the damage from passing through the sheet of frigid air increases by 1d6 for each spell slot level above 6.",
          "start": 1066,
          "end": 1467,
          "save_start": 1153,
          "ability": "constitution",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "once_per_turn",
            "turn": "target"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 5,
              "die": 6,
              "damage_type": "Cold"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 5,
              "die": 6,
              "damage_type": "Cold",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 1187,
              "end": 1202,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Wall of Stone",
      []
    ],
    [
      "Wall of Thorns",
      [
        {
          "span": "When the wall appears, each creature in its area makes a Dexterity saving throw, taking 7d8 Piercing damage on a failed save or half as much damage on a successful one. A creature can move through the wall, albeit slowly and painfully. For every 1 foot a creature moves through the wall, it must spend 4 feet of movement. Furthermore, the first time a creature enters a space in the wall on a turn or ends its turn there, the creature makes a",
          "start": 491,
          "end": 933,
          "save_start": 548,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 7,
              "die": 8,
              "damage_type": "Piercing"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 7,
              "die": 8,
              "damage_type": "Piercing",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 579,
              "end": 598,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        },
        {
          "span": "Furthermore, the first time a creature enters a space in the wall on a turn or ends its turn there, the creature makes a Dexterity saving throw, taking 7d8 Slashing damage on a failed save or half as much damage on a successful one. A creature makes this save only once per turn. Using a Higher-Level Spell Slot. Both types of damage increase by 1d8 for each spell slot level above 6.",
          "start": 813,
          "end": 1197,
          "save_start": 934,
          "ability": "dexterity",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "once_per_turn",
            "turn": "target"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 7,
              "die": 8,
              "damage_type": "Slashing"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 7,
              "die": 8,
              "damage_type": "Slashing",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 965,
              "end": 984,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Warding Bond",
      []
    ],
    [
      "Water Breathing",
      []
    ],
    [
      "Water Walk",
      []
    ],
    [
      "Web",
      []
    ],
    [
      "Weird",
      [
        {
          "span": "Each creature of your choice in a 30-foot-radius Sphere centered on a point within range makes a Wisdom saving throw. On a failed save, a target takes 10d10 Psychic damage and has the Frightened condition for the duration. On a successful save, a target takes half as much damage only. A Frightened target makes a",
          "start": 182,
          "end": 495,
          "save_start": 279,
          "ability": "wisdom",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 10,
              "die": 10,
              "damage_type": "Psychic"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 10,
              "die": 10,
              "damage_type": "Psychic",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 333,
              "end": 353,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        },
        {
          "span": "A Frightened target makes a Wisdom saving throw at the end of each of its turns. On a failed save, it takes 5d10 Psychic damage. On a successful save, the spell ends on that target.",
          "start": 468,
          "end": 649,
          "save_start": 496,
          "ability": "wisdom",
          "success": {
            "status": "available",
            "kind": "none"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "once_per_turn",
            "turn": "target"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 5,
              "die": 10,
              "damage_type": "Psychic"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 5,
              "die": 10,
              "damage_type": "Psychic",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 576,
              "end": 595,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Wind Walk",
      []
    ],
    [
      "Wind Wall",
      [
        {
          "span": "When the wall appears, each creature in its area makes a Strength saving throw, taking 4d8 Bludgeoning damage on a failed save or half as much damage on a successful one. The strong wind keeps fog, smoke, and other gases at bay. Small or smaller flying creatures or objects can’t pass through the wall. Loose, lightweight materials brought into the wall fly upward. Arrows, bolts, and other ordinary projectiles launched at targets behind the wall are deflected upward and miss automatically. Boulders hurled by Giants or siege engines, and similar projectiles, are unaffected. Creatures in gaseous form can’t pass through it.",
          "start": 443,
          "end": 1069,
          "save_start": 500,
          "ability": "strength",
          "success": {
            "status": "available",
            "kind": "half"
          },
          "fixed_save_dc": {
            "status": "available",
            "value": null
          },
          "frequency": {
            "kind": "each_declared_event"
          },
          "duration": {
            "kind": "instantaneous"
          },
          "timing_unavailable_reason": null,
          "repetitions": {
            "status": "available",
            "minimum": 1,
            "maximum": 1
          },
          "failed_damage_signatures": [
            {
              "kind": "dice",
              "count": 4,
              "die": 8,
              "damage_type": "Bludgeoning"
            }
          ],
          "damage_occurrences": [
            {
              "kind": "dice",
              "count": 4,
              "die": 8,
              "damage_type": "Bludgeoning",
              "arm": "failure",
              "timing": "on_save_resolution",
              "roll_transform": "none",
              "start": 530,
              "end": 552,
              "slot_index": 0,
              "roll_index": 0
            }
          ]
        }
      ]
    ],
    [
      "Wish",
      []
    ],
    [
      "Word of Recall",
      []
    ],
    [
      "Zone of Truth",
      []
    ]
  ],
  "raw_clause_count": 81,
  "broad_suspects": [
    {
      "heading": "Acid Splash",
      "span": "Evocation Cantrip (Sorcerer, Wizard) Casting Time: Action Range: 60 feet Components: V, S Duration: Instantaneous You create an acidic bubble at a point within range, where it explodes in a 5-foot-radius Sphere. Each creature in that Sphere must succeed on a Dexterity saving throw or take 1d6 Acid damage. Cantrip Upgrade. The damage increases by 1d6 when you reach levels 5 (2d6), 11 (3d6), and 17 (4d6).",
      "start": 0,
      "end": 406
    },
    {
      "heading": "Arcane Hand",
      "span": "The hand attempts to push a Huge or smaller creature within 5 feet of it. The target must succeed on a Strength saving throw, or the hand pushes the target up to 5 feet plus a number of feet equal to five times your spellcasting ability modifier. The hand moves with the target, remaining within 5 feet of it. Grasping Hand. The hand attempts to grapple a Huge or smaller creature within 5 feet of it. The target must succeed on a Dexterity saving throw, or the target has the Grappled condition, with an escape DC equal to your spell save DC. While the hand grapples the target, you can take a Bonus Action to cause the hand to crush it, dealing Bludgeoning damage to the target equal to 4d6 plus your spellcasting ability modifier. Interposing Hand. The hand grants you Half Cover against attacks and other effects that originate from its space or that pass through it. In addition, its space counts as Difficult Terrain for your enemies. Using a Higher-Level Spell Slot. The damage of the Clenched Fist increases by 2d8 and the damage of the Grasping Hand increases by 2d6 for each spell slot level above 5.",
      "start": 833,
      "end": 1944
    },
    {
      "heading": "Arcane Hand",
      "span": "The hand attempts to grapple a Huge or smaller creature within 5 feet of it. The target must succeed on a Dexterity saving throw, or the target has the Grappled condition, with an escape DC equal to your spell save DC. While the hand grapples the target, you can take a Bonus Action to cause the hand to crush it, dealing Bludgeoning damage to the target equal to 4d6 plus your spellcasting ability modifier. Interposing Hand. The hand grants you Half Cover against attacks and other effects that originate from its space or that pass through it. In addition, its space counts as Difficult Terrain for your enemies. Using a Higher-Level Spell Slot. The damage of the Clenched Fist increases by 2d8 and the damage of the Grasping Hand increases by 2d6 for each spell slot level above 5.",
      "start": 1158,
      "end": 1944
    },
    {
      "heading": "Befuddlement",
      "span": "Level 8 Enchantment (Bard, Druid, Warlock, Wizard) Casting Time: Action Range: 150 feet Components: V, S, M (a key ring with no keys) Duration: Instantaneous You blast the mind of a creature that you can see within range. The target makes an Intelligence saving throw. On a failed save, the target takes 10d12 Psychic damage and can’t cast spells or take the Magic action. At the end of every 30 days, the target repeats the save, ending the effect on a success. The effect can also be ended by the Greater Restoration, Heal, or Wish spell. On a successful save, the target takes half as much damage only.",
      "start": 0,
      "end": 605
    },
    {
      "heading": "Bestow Curse",
      "span": "Level 3 Necromancy (Bard, Cleric, Wizard) Casting Time: Action Range: Touch Components: V, S Duration: Concentration, up to 1 minute You touch a creature, which must succeed on a Wisdom saving throw or become cursed for the duration. Until the curse ends, the target suffers one of the following effects of your choice: • Choose one ability. The target has Disadvantage on ability checks and saving throws made with that ability. • The target has Disadvantage on attack rolls against you. • In combat, the target must succeed on a Wisdom saving throw at the start of each of its turns or be forced to take the Dodge action on that turn. • If you deal damage to the target with an attack roll or a spell, the target takes an extra 1d8 Necrotic damage. Using a Higher-Level Spell Slot. If you cast this spell using a level 4 spell slot, you can maintain Concentration on it for up to 10 minutes. If you use a level 5+ spell slot, the spell doesn’t require Concentration, and the duration becomes 8 hours (level 5–6 slot) or 24 hours (level 7–8 slot). If you use a level 9 spell slot, the spell lasts until dispelled.",
      "start": 0,
      "end": 1114
    },
    {
      "heading": "Bestow Curse",
      "span": "Until the curse ends, the target suffers one of the following effects of your choice: • Choose one ability. The target has Disadvantage on ability checks and saving throws made with that ability. • The target has Disadvantage on attack rolls against you. • In combat, the target must succeed on a Wisdom saving throw at the start of each of its turns or be forced to take the Dodge action on that turn. • If you deal damage to the target with an attack roll or a spell, the target takes an extra 1d8 Necrotic damage. Using a Higher-Level Spell Slot. If you cast this spell using a level 4 spell slot, you can maintain Concentration on it for up to 10 minutes. If you use a level 5+ spell slot, the spell doesn’t require Concentration, and the duration becomes 8 hours (level 5–6 slot) or 24 hours (level 7–8 slot). If you use a level 9 spell slot, the spell lasts until dispelled.",
      "start": 233,
      "end": 1114
    },
    {
      "heading": "Bestow Curse",
      "span": "• The target has Disadvantage on attack rolls against you. • In combat, the target must succeed on a Wisdom saving throw at the start of each of its turns or be forced to take the Dodge action on that turn. • If you deal damage to the target with an attack roll or a spell, the target takes an extra 1d8 Necrotic damage. Using a Higher-Level Spell Slot. If you cast this spell using a level 4 spell slot, you can maintain Concentration on it for up to 10 minutes. If you use a level 5+ spell slot, the spell doesn’t require Concentration, and the duration becomes 8 hours (level 5–6 slot) or 24 hours (level 7–8 slot). If you use a level 9 spell slot, the spell lasts until dispelled.",
      "start": 429,
      "end": 1114
    },
    {
      "heading": "Black Tentacles",
      "span": "For the duration, these tentacles turn the ground in that area into Difficult Terrain. Each creature in that area makes a Strength saving throw. On a failed save, it takes 3d6 Bludgeoning damage, and it has the Restrained condition until the spell ends. A creature also makes that save if it enters the area or ends it turn there. A creature makes that save only once per turn. A Restrained creature can take an action to make a Strength (Athletics) check against your spell save DC, ending the condition on itself on a success.",
      "start": 227,
      "end": 756
    },
    {
      "heading": "Blade Barrier",
      "span": "The wall provides Three-Quarters Cover, and its space is Difficult Terrain. Any creature in the wall’s space makes a Dexterity saving throw, taking 6d10 Force damage on a failed save or half as much damage on a successful one. A creature also makes that save if it enters the wall’s space or ends it turn there. A creature makes that save only once per turn.",
      "start": 394,
      "end": 753
    },
    {
      "heading": "Blight",
      "span": "Level 4 Necromancy (Druid, Sorcerer, Warlock, Wizard) Casting Time: Action Range: 30 feet Components: V, S Duration: Instantaneous A creature that you can see within range makes a Constitution saving throw, taking 8d8 Necrotic damage on a failed save or half as much damage on a successful one. A Plant creature automatically fails the save. Alternatively, target a nonmagical plant that isn’t a creature, such as a tree or shrub. It doesn’t make a save; it simply withers and dies. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 4.",
      "start": 0,
      "end": 578
    },
    {
      "heading": "Burning Hands",
      "span": "Level 1 Evocation (Sorcerer, Wizard) Casting Time: Action Range: Self Components: V, S Duration: Instantaneous A thin sheet of flames shoots forth from you. Each creature in a 15-foot Cone makes a Dexterity saving throw, taking 3d6 Fire damage on a failed save or half as much damage on a successful one. Flammable objects in the Cone that aren’t being worn or carried start burning. Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 1.",
      "start": 0,
      "end": 479
    },
    {
      "heading": "Call Lightning",
      "span": "A lightning bolt shoots from the cloud to that point. Each creature within 5 feet of that point makes a Dexterity saving throw, taking 3d10 Lightning damage on a failed save or half as much damage on a successful one. Until the spell ends, you can take a Magic action to call down lightning in that way again, targeting the same point or a different one. If you’re outdoors in a storm when you cast this spell, the spell gives you control over that storm instead of creating a new one. Under such conditions, the spell’s damage increases by 1d10. Using a Higher-Level Spell Slot. The damage increases by 1d10 for each spell slot level above 3.",
      "start": 348,
      "end": 992
    },
    {
      "heading": "Chain Lightning",
      "span": "A target can be a creature or an object and can be targeted by only one of the bolts. Each target makes a Dexterity saving throw, taking 10d8 Lightning damage on a failed save or half as much damage on a successful one. Using a Higher-Level Spell Slot. One additional bolt leaps from the first target to another target for each spell slot level above 6.",
      "start": 354,
      "end": 708
    },
    {
      "heading": "Circle of Death",
      "span": "Level 6 Necromancy (Sorcerer, Warlock, Wizard) Casting Time: Action Range: 150 feet Components: V, S, M (the powder of a crushed black pearl worth 500+ GP) Duration: Instantaneous Negative energy ripples out in a 60-foot-radius Sphere from a point you choose within range. Each creature in that area makes a Constitution saving throw, taking 8d8 Necrotic damage on a failed save or half as much damage on a successful one. Using a Higher-Level Spell Slot. The damage increases by 2d8 for each spell slot level above 6.",
      "start": 0,
      "end": 518
    },
    {
      "heading": "Cloudkill",
      "span": "Its area is Heavily Obscured. Each creature in the Sphere makes a Constitution saving throw, taking 5d8 Poison damage on a failed save or half as much damage on a successful one. A creature must also make this save when the Sphere moves into its space and when it enters the Sphere or ends its turn there. A creature makes this save only once per turn. The Sphere moves 10 feet away from you at the start of each of your turns. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 5.",
      "start": 349,
      "end": 873
    },
    {
      "heading": "Cone of Cold",
      "span": "Level 5 Evocation (Druid, Sorcerer, Wizard) Casting Time: Action Range: Self Components: V, S, M (a small crystal or glass cone) Duration: Instantaneous You unleash a blast of cold air. Each creature in a 60-foot Cone originating from you makes a Constitution saving throw, taking 8d8 Cold damage on a failed save or half as much damage on a successful one. A creature killed by this spell becomes a frozen statue until it thaws. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 5.",
      "start": 0,
      "end": 525
    },
    {
      "heading": "Conjure Animals",
      "span": "The pack lasts for the duration, and you choose the spirits’ animal form, such as wolves, serpents, or birds. You have Advantage on Strength saving throws while you’re within 5 feet of the pack, and when you move on your turn, you can also move the pack up to 30 feet to an unoccupied space you can see. Whenever the pack moves within 10 feet of a creature you can see and whenever a creature you can see enters a space within 10 feet of the pack or ends its turn there, you can force that creature to make a Dexterity saving throw. On a failed save, the creature takes 3d10 Slashing damage. A creature makes this save only once per turn. Using a Higher-Level Spell Slot. The damage increases by 1d10 for each spell slot level above 3.",
      "start": 266,
      "end": 1002
    },
    {
      "heading": "Conjure Animals",
      "span": "You have Advantage on Strength saving throws while you’re within 5 feet of the pack, and when you move on your turn, you can also move the pack up to 30 feet to an unoccupied space you can see. Whenever the pack moves within 10 feet of a creature you can see and whenever a creature you can see enters a space within 10 feet of the pack or ends its turn there, you can force that creature to make a Dexterity saving throw. On a failed save, the creature takes 3d10 Slashing damage. A creature makes this save only once per turn. Using a Higher-Level Spell Slot. The damage increases by 1d10 for each spell slot level above 3.",
      "start": 376,
      "end": 1002
    },
    {
      "heading": "Conjure Celestial",
      "span": "Searing Light. The target makes a Dexterity saving throw, taking 6d12 Radiant damage on a failed save or half as much damage on a successful one. Until the spell ends, Bright Light fills the Cylinder, and when you move on your turn, you can also move the Cylinder up to 30 feet. Whenever the Cylinder moves into the space of a creature you can see and whenever a creature you can see enters the Cylinder or ends its turn there, you can bathe it in one of the lights. A creature can be affected by this spell only once per turn. Using a Higher-Level Spell Slot. The healing and damage increase by 1d12 for each spell slot level above 7.",
      "start": 471,
      "end": 1107
    },
    {
      "heading": "Conjure Elemental",
      "span": "The spirit lasts for the duration. Whenever a creature you can see enters the spirit’s space or starts its turn within 5 feet of the spirit, you can force that creature to make a Dexterity saving throw if the spirit has no creature Restrained. On failed save, the target takes 8d8 damage of the spirit’s type, and the target has the Restrained condition until the spell ends. At the start of each of its turns, the Restrained target repeats the save. On a failed save, the target takes 4d8 damage of the spirit’s type. On a successful save, the target isn’t Restrained by the spirit. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 5.",
      "start": 372,
      "end": 1052
    },
    {
      "heading": "Conjure Woodland Beings",
      "span": "Level 4 Conjuration (Druid, Ranger) Casting Time: Action Range: Self Components: V, S Duration: Concentration, up to 10 minutes You conjure nature spirits that flit around you in a 10-foot Emanation for the duration. Whenever the Emanation enters the space of a creature you can see and whenever a creature you can see enters the Emanation or ends its turn there, you can force that creature to make a Wisdom saving throw. The creature takes 5d8 Force damage on a failed save or half as much damage on a successful one. A creature makes this save only once per turn. In addition, you can take the Disengage action as a Bonus Action for the spell’s duration. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 4.",
      "start": 0,
      "end": 753
    },
    {
      "heading": "Contact Other Plane",
      "span": "Contacting this otherworldly intelligence can break your mind. When you cast this spell, make a DC 15 Intelligence saving throw. On a successful save, you can ask the entity up to five questions. You must ask your questions before the spell ends. The GM answers each question with one word, such as “yes,” “no,” “maybe,” “never,” “irrelevant,” or “unclear” (if the entity doesn’t know the answer to the question). If a one-word answer would be misleading, the GM might instead offer a short phrase as an answer. On a failed save, you take 6d6 Psychic damage and have the Incapacitated condition until you finish a Long Rest. A Greater Restoration spell cast on you ends this effect.",
      "start": 233,
      "end": 916
    },
    {
      "heading": "Contagion",
      "span": "Level 5 Necromancy (Cleric, Druid) Casting Time: Action Range: Touch Component: V, S Duration: 7 days Your touch inflicts a magical contagion. The target must succeed on a Constitution saving throw or take 11d8 Necrotic damage and have the Poisoned condition. Also, choose one ability when you cast the spell. While Poisoned, the target has Disadvantage on saving throws made with the chosen ability. The target must repeat the saving throw at the end of each of its turns until it gets three successes or failures. If the target succeeds on three of these saves, the spell ends on the target. If the target fails three of the saves, the spell lasts for 7 days on it. Whenever the Poisoned target receives an effect that would end the Poisoned condition, the target must succeed on a Constitution saving throw, or the Poisoned condition doesn’t end on it.",
      "start": 0,
      "end": 855
    },
    {
      "heading": "Control Water",
      "span": "Any creature in the water and within 25 feet of the whirlpool is pulled 10 feet toward it. When a creature enters the whirlpool for the first time on a turn or ends its turn there, it makes a Strength saving throw. On a failed save, the creature takes 2d8 Bludgeoning damage. On a successful save, the creature takes half as much damage. A creature can swim away from the whirlpool only if it first takes an action to pull away and succeeds on a Strength (Athletics) check against your spell save DC.",
      "start": 2100,
      "end": 2601
    },
    {
      "heading": "Delayed Blast Fireball",
      "span": "Level 7 Evocation (Sorcerer, Wizard) Casting Time: Action Range: 150 feet Components: V, S, M (a ball of bat guano and sulfur) Duration: Concentration, up to 1 minute A beam of yellow light flashes from you, then condenses at a chosen point within range as a glowing bead for the duration. When the spell ends, the bead explodes, and each creature in a 20-foot-radius Sphere centered on that point makes a Dexterity saving throw. A creature takes Fire damage equal to the total accumulated damage on a failed save or half as much damage on a successful one. The spell’s base damage is 12d6, and the damage increases by 1d6 whenever your turn ends and the spell hasn’t ended. If a creature touches the glowing bead before the spell ends, that creature makes a Dexterity saving throw. On a failed save, the spell ends, causing the bead to explode. On a successful save, the creature can throw the bead up to 40 feet. If the thrown bead enters a creature’s space or collides with a solid object, the spell ends, and the bead explodes. When the bead explodes, flammable objects in the explosion that aren’t being worn or carried start burning. Using a Higher-Level Spell Slot. The base damage increases by 1d6 for each spell slot level above 7.",
      "start": 0,
      "end": 1240
    },
    {
      "heading": "Delayed Blast Fireball",
      "span": "The spell’s base damage is 12d6, and the damage increases by 1d6 whenever your turn ends and the spell hasn’t ended. If a creature touches the glowing bead before the spell ends, that creature makes a Dexterity saving throw. On a failed save, the spell ends, causing the bead to explode. On a successful save, the creature can throw the bead up to 40 feet. If the thrown bead enters a creature’s space or collides with a solid object, the spell ends, and the bead explodes. When the bead explodes, flammable objects in the explosion that aren’t being worn or carried start burning. Using a Higher-Level Spell Slot. The base damage increases by 1d6 for each spell slot level above 7.",
      "start": 557,
      "end": 1240
    },
    {
      "heading": "Disintegrate",
      "span": "The target can be a creature, a nonmagical object, or a creation of magical force, such as the wall created by Wall of Force. A creature targeted by this spell makes a Dexterity saving throw. On a failed save, the target takes 10d6 + 40 Force damage. If this damage reduces it to 0 Hit Points, it and everything nonmagical it is wearing and carrying are disintegrated into gray dust. The target can be revived only by a True Resurrection or a Wish spell. This spell automatically disintegrates a Large or smaller nonmagical object or a creation of magical force. If such a target is Huge or larger, this spell disintegrates a 10-foot-Cube portion of it. Using a Higher-Level Spell Slot. The damage increases by 3d6 for each spell slot level above 6.",
      "start": 204,
      "end": 954
    },
    {
      "heading": "Dissonant Whispers",
      "span": "Level 1 Enchantment (Bard) Casting Time: Action Range: 60 feet Components: V Duration: Instantaneous One creature of your choice that you can see within range hears a discordant melody in its mind. The target makes a Wisdom saving throw. On a failed save, it takes 3d6 Psychic damage and must immediately use its Reaction, if available, to move as far away from you as it can, using the safest route. On a successful save, the target takes half as much damage only. Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 1.",
      "start": 0,
      "end": 561
    },
    {
      "heading": "Dragon’s Breath",
      "span": "Until the spell ends, the target can take a Magic action to exhale a 15-foot Cone. Each creature in that area makes a Dexterity saving throw, taking 3d6 damage of the chosen type on a failed save or half as much damage on a successful one. Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 2.",
      "start": 238,
      "end": 574
    },
    {
      "heading": "Dream",
      "span": "You can make the messenger terrifying to the target. If you do so, the messenger can deliver a message of no more than ten words, and then the target makes a Wisdom saving throw. On a failed save, the target gains no benefit from its rest, and it takes 3d6 Psychic damage when it wakes up.",
      "start": 947,
      "end": 1237
    },
    {
      "heading": "Earthquake",
      "span": "The ground there is Difficult Terrain. When you cast this spell and at the end of each of your turns for the duration, each creature on the ground in the area makes a Dexterity saving throw. On a failed save, a creature has the Prone condition, and its Concentration is broken. You can also cause the effects below. Fissures. A total of 1d6 fissures open in the spell’s area at the end of the turn you cast it. You choose the fissures’ locations, which can’t be under structures. Each fissure is 1d10 × 10 feet deep and 10 feet wide, and it extends from one edge of the spell’s area to another edge. A creature in the same space as a fissure must succeed on a Dexterity saving throw or fall in. A creature that successfully saves moves with the fissure’s edge as it opens. Structures. The tremor deals 50 Bludgeoning damage to any structure in contact with the ground in the area when you cast the spell and at the end of each of your turns until the spell ends. If a structure drops to 0 Hit Points, it collapses. A creature within a distance from a collapsing structure equal to half the structure’s height makes a Dexterity saving throw. On a failed save, the creature takes 12d6 Bludgeoning damage, has the Prone condition, and is buried in the rubble, requiring a DC 20 Strength (Athletics) check as an action to escape. On a successful save, the creature takes half as much damage only.",
      "start": 335,
      "end": 1728
    },
    {
      "heading": "Earthquake",
      "span": "Each fissure is 1d10 × 10 feet deep and 10 feet wide, and it extends from one edge of the spell’s area to another edge. A creature in the same space as a fissure must succeed on a Dexterity saving throw or fall in. A creature that successfully saves moves with the fissure’s edge as it opens. Structures. The tremor deals 50 Bludgeoning damage to any structure in contact with the ground in the area when you cast the spell and at the end of each of your turns until the spell ends. If a structure drops to 0 Hit Points, it collapses. A creature within a distance from a collapsing structure equal to half the structure’s height makes a Dexterity saving throw. On a failed save, the creature takes 12d6 Bludgeoning damage, has the Prone condition, and is buried in the rubble, requiring a DC 20 Strength (Athletics) check as an action to escape. On a successful save, the creature takes half as much damage only.",
      "start": 815,
      "end": 1728
    },
    {
      "heading": "Earthquake",
      "span": "If a structure drops to 0 Hit Points, it collapses. A creature within a distance from a collapsing structure equal to half the structure’s height makes a Dexterity saving throw. On a failed save, the creature takes 12d6 Bludgeoning damage, has the Prone condition, and is buried in the rubble, requiring a DC 20 Strength (Athletics) check as an action to escape. On a successful save, the creature takes half as much damage only.",
      "start": 1298,
      "end": 1728
    },
    {
      "heading": "Enlarge/Reduce",
      "span": "A targeted object must be neither worn nor carried. If the target is an unwilling creature, it can make a Constitution saving throw. On a successful save, the spell has no effect. Everything that a targeted creature is wearing and carrying changes size with it. Any item it drops returns to normal size at once. A thrown weapon or piece of ammunition returns to normal size immediately after it hits or misses a target. Enlarge. The target’s size increases by one category—from Medium to Large, for example. The target also has Advantage on Strength checks and Strength saving throws. The target’s attacks with its enlarged weapons or Unarmed Strikes deal an extra 1d4 damage on a hit. Reduce. The target’s size decreases by one category—from Medium to Small, for example. The target also has Disadvantage on Strength checks and Strength saving throws. The target’s attacks with its reduced weapons or Unarmed Strikes deal 1d4 less damage on a hit (this can’t reduce the damage below 1).",
      "start": 304,
      "end": 1292
    },
    {
      "heading": "Ensnaring Strike",
      "span": "Level 1 Conjuration (Ranger) Casting Time: Bonus Action, which you take immediately after hitting a creature with a weapon Range: Self Components: V Duration: Concentration, up to 1 minute As you hit the target, grasping vines appear on it, and it makes a Strength saving throw. A Large or larger creature has Advantage on this save. On a failed save, the target has the Restrained condition until the spell ends. On a successful save, the vines shrivel away, and the spell ends. While Restrained, the target takes 1d6 Piercing damage at the start of each of its turns. The target or a creature within reach of it can take an action to make a Strength (Athletics) check against your spell save DC. On a success, the spell ends. Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 1.",
      "start": 0,
      "end": 823
    },
    {
      "heading": "Faithful Hound",
      "span": "At the start of each of your turns, the hound attempts to bite one enemy within 5 feet of it. That enemy must succeed on a Dexterity saving throw or take 4d8 Force damage. On your later turns, you can take a Magic action to move the hound up to 30 feet.",
      "start": 604,
      "end": 858
    },
    {
      "heading": "Finger of Death",
      "span": "Level 7 Necromancy (Sorcerer, Warlock, Wizard) Casting Time: Action Range: 60 feet Components: V, S Duration: Instantaneous You unleash negative energy toward a creature you can see within range. The target makes a Constitution saving throw, taking 7d8 + 30 Necrotic damage on a failed save or half as much damage on a successful one. A Humanoid killed by this spell rises at the start of your next turn as a Zombie (see “Monsters”) that follows your verbal orders.",
      "start": 0,
      "end": 465
    },
    {
      "heading": "Fireball",
      "span": "Level 3 Evocation (Sorcerer, Wizard) Casting Time: Action Range: 150 feet Components: V, S, M (a ball of bat guano and sulfur) Duration: Instantaneous A bright streak flashes from you to a point you choose within range and then blossoms with a low roar into a fiery explosion. Each creature in a 20-foot-radius Sphere centered on that point makes a Dexterity saving throw, taking 8d6 Fire damage on a failed save or half as much damage on a successful one. Flammable objects in the area that aren’t being worn or carried start burning. Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 3.",
      "start": 0,
      "end": 631
    },
    {
      "heading": "Fire Storm",
      "span": "Each Cube must be contiguous with at least one other Cube. Each creature in the area makes a Dexterity saving throw, taking 7d10 Fire damage on a failed save or half as much damage on a successful one. Flammable objects in the area that aren’t being worn or carried start burning.",
      "start": 249,
      "end": 530
    },
    {
      "heading": "Flame Strike",
      "span": "Level 5 Evocation (Cleric) Casting Time: Action Range: 60 feet Components: V, S, M (a pinch of sulfur) Duration: Instantaneous A vertical column of brilliant fire roars down from above. Each creature in a 10-foot-radius, 40-foot-high Cylinder centered on a point within range makes a Dexterity saving throw, taking 5d6 Fire damage and 5d6 Radiant damage on a failed save or half as much damage on a successful one. Using a Higher-Level Spell Slot. The Fire damage and the Radiant damage increase by 1d6 for each spell slot level above 5.",
      "start": 0,
      "end": 537
    },
    {
      "heading": "Flaming Sphere",
      "span": "It lasts for the duration. Any creature that ends its turn within 5 feet of the sphere makes a Dexterity saving throw, taking 2d6 Fire damage on a failed save or half as much damage on a successful one. As a Bonus Action, you can move the sphere up to 30 feet, rolling it along the ground. If you move the sphere into a creature’s space, that creature makes the save against the sphere, and the sphere stops moving for the turn. When you move the sphere, you can direct it over barriers up to 5 feet tall and jump it across pits up to 10 feet wide. Flammable objects that aren’t being worn or carried start burning if touched by the sphere, and it sheds Bright Light in a 20-foot radius and Dim Light for an additional 20 feet. Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 2.",
      "start": 252,
      "end": 1076
    },
    {
      "heading": "Freezing Sphere",
      "span": "Level 6 Evocation (Sorcerer, Wizard) Casting Time: Action Range: 300 feet Components: V, S, M (a miniature crystal sphere) Duration: Instantaneous A frigid globe streaks from you to a point of your choice within range, where it explodes in a 60-foot-radius Sphere. Each creature in that area makes a Constitution saving throw, taking 10d6 Cold damage on failed save or half as much damage on a successful one. If the globe strikes a body of water, it freezes the water to a depth of 6 inches over an area 30 feet square. This ice lasts for 1 minute. Creatures that were swimming on the surface of frozen water are trapped in the ice and have the Restrained condition. A trapped creature can take an action to make a Strength (Athletics) check against your spell save DC to break free. You can refrain from firing the globe after completing the spell’s casting. If you do so, a globe about the size of a sling bullet, cool to the touch, appears in your hand. At any time, you or a creature you give the globe to can throw the globe (to a range of 40 feet) or hurl it with a sling (to the sling’s normal range). It shatters on impact, with the same effect as a normal casting of the spell. You can also set the globe down without shattering it. After 1 minute, if the globe hasn’t already shattered, it explodes. Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 6.",
      "start": 0,
      "end": 1406
    },
    {
      "heading": "Geas",
      "span": "Level 5 Enchantment (Bard, Cleric, Druid, Paladin, Wizard) Casting Time: 1 minute Range: 60 feet Components: V Duration: 30 days You give a verbal command to a creature that you can see within range, ordering it to carry out some service or refrain from an action or a course of activity as you decide. The target must succeed on a Wisdom saving throw or have the Charmed condition for the duration. The target automatically succeeds if it can’t understand your command. While Charmed, the creature takes 5d10 Psychic damage if it acts in a manner directly counter to your command. It takes this damage no more than once each day. You can issue any command you choose, short of an activity that would result in certain death. Should you issue a suicidal command, the spell ends. A Remove Curse, Greater Restoration, or Wish spell ends this spell. Using a Higher-Level Spell Slot. If you use a level 7 or 8 spell slot, the duration is 365 days. If you use a level 9 spell slot, the spell lasts until it is ended by one of the spells mentioned above.",
      "start": 0,
      "end": 1048
    },
    {
      "heading": "Glyph of Warding",
      "span": "When triggered, the glyph erupts with magical energy in a 20-foot-radius Sphere centered on the glyph. Each creature in the area makes a Dexterity saving throw. A creature takes 5d8 Acid, Cold, Fire, Lightning, or Thunder damage (your choice when you create the glyph) on a failed save or half as much damage on a successful one. Spell Glyph. You can store a prepared spell of level 3 or lower in the glyph by casting it as part of creating the glyph. The spell must target a single creature or an area. The spell being stored has no immediate effect when cast in this way. When the glyph is triggered, the stored spell takes effect. If the spell has a target, it targets the creature that triggered the glyph. If the spell affects an area, the area is centered on that creature. If the spell summons Hostile creatures or creates harmful objects or traps, they appear as close as possible to the intruder and attack it. If the spell requires Concentration, it lasts until the end of its full duration. Using a Higher-Level Spell Slot. The damage of an explosive rune increases by 1d8 for each spell slot level above 3. If you create a spell glyph, you can store any spell of up to the same level as the spell slot you use for the Glyph of Warding.",
      "start": 1556,
      "end": 2804
    },
    {
      "heading": "Guardian of Faith",
      "span": "The guardian occupies that space and is invulnerable, and it appears in a form appropriate for your deity or pantheon. Any enemy that moves to a space within 10 feet of the guardian for the first time on a turn or starts its turn there makes a Dexterity saving throw, taking 20 Radiant damage on a failed save or half as much damage on a successful one. The guardian vanishes when it has dealt a total of 60 damage.",
      "start": 212,
      "end": 628
    },
    {
      "heading": "Harm",
      "span": "Level 6 Necromancy (Cleric) Casting Time: Action Range: 60 feet Components: V, S Duration: Instantaneous You unleash virulent magic on a creature you can see within range. The target makes a Constitution saving throw. On a failed save, it takes 14d6 Necrotic damage, and its Hit Point maximum is reduced by an amount equal to the Necrotic damage it took. On a successful save, it takes half as much damage only. This spell can’t reduce a target’s Hit Point maximum below 1.",
      "start": 0,
      "end": 473
    },
    {
      "heading": "Heat Metal",
      "span": "Until the spell ends, you can take a Bonus Action on each of your later turns to deal this damage again if the object is within range. If a creature is holding or wearing the object and takes the damage from it, the creature must succeed on a Constitution saving throw or drop the object if it can. If it doesn’t drop the object, it has Disadvantage on attack rolls and ability checks until the start of your next turn. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 2.",
      "start": 427,
      "end": 943
    },
    {
      "heading": "Hellish Rebuke",
      "span": "Level 1 Evocation (Warlock) Casting Time: Reaction, which you take in response to taking damage from a creature that you can see within 60 feet of yourself Range: 60 feet Components: V, S Duration: Instantaneous The creature that damaged you is momentarily surrounded by green flames. It makes a Dexterity saving throw, taking 2d10 Fire damage on a failed save or half as much damage on a successful one. Using a Higher-Level Spell Slot. The damage increases by 1d10 for each spell slot level above 1.",
      "start": 0,
      "end": 501
    },
    {
      "heading": "Ice Knife",
      "span": "Hit or miss, the shard then explodes. The target and each creature within 5 feet of it must succeed on a Dexterity saving throw or take 2d6 Cold damage. Using a Higher-Level Spell Slot. The Cold damage increases by 1d6 for each spell slot level above 1.",
      "start": 323,
      "end": 577
    },
    {
      "heading": "Ice Storm",
      "span": "Level 4 Evocation (Druid, Sorcerer, Wizard) Casting Time: Action Range: 300 feet Components: V, S, M (a mitten) Duration: Instantaneous Hail falls in a 20-foot-radius, 40-foot-high Cylinder centered on a point within range. Each creature in the Cylinder makes a Dexterity saving throw. A creature takes 2d10 Bludgeoning damage and 4d6 Cold damage on a failed save or half as much damage on a successful one. Hailstones turn ground in the Cylinder into Difficult Terrain until the end of your next turn. Using a Higher-Level Spell Slot. The Bludgeoning damage increases by 1d10 for each spell slot level above 4.",
      "start": 0,
      "end": 611
    },
    {
      "heading": "Incendiary Cloud",
      "span": "It lasts for the duration or until a strong wind (like that created by Gust of Wind) disperses it. When the cloud appears, each creature in it makes a Dexterity saving throw, taking 10d8 Fire damage on a failed save or half as much damage on a successful one. A creature must also make this save when the Sphere moves into its space and when it enters the Sphere or ends its turn there. A creature makes this save only once per turn. The cloud moves 10 feet away from you in a direction you choose at the start of each of your turns.",
      "start": 278,
      "end": 812
    },
    {
      "heading": "Inflict Wounds",
      "span": "Level 1 Necromancy (Cleric) Casting Time: Action Range: Touch Components: V, S Duration: Instantaneous A creature you touch makes a Constitution saving throw, taking 2d10 Necrotic damage on a failed save or half as much damage on a successful one. Using a Higher-Level Spell Slot. The damage increases by 1d10 for each spell slot level above 1.",
      "start": 0,
      "end": 344
    },
    {
      "heading": "Insect Plague",
      "span": "The Sphere remains for the duration, and its area is Lightly Obscured and Difficult Terrain. When the swarm appears, each creature in it makes a Constitution saving throw, taking 4d10 Piercing damage on a failed save or half as much damage on a successful one. A creature also makes this save when it enters the spell’s area for the first time on a turn or ends its turn there. A creature makes this save only once per turn. Using a Higher-Level Spell Slot. The damage increases by 1d10 for each spell slot level above 5.",
      "start": 246,
      "end": 768
    },
    {
      "heading": "Lightning Bolt",
      "span": "Level 3 Evocation (Sorcerer, Wizard) Casting Time: Action Range: Self Components: V, S, M (a bit of fur and a crystal rod) Duration: Instantaneous A stroke of lightning forming a 100-foot-long, 5-foot-wide Line blasts out from you in a direction you choose. Each creature in the Line makes a Dexterity saving throw, taking 8d6 Lightning damage on a failed save or half as much damage on a successful one. Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 3.",
      "start": 0,
      "end": 500
    },
    {
      "heading": "Meteor Swarm",
      "span": "Level 9 Evocation (Sorcerer, Wizard) Casting Time: Action Range: 1 mile Components: V, S Duration: Instantaneous Blazing orbs of fire plummet to the ground at four different points you can see within range. Each creature in a 40-foot-radius Sphere centered on each of those points makes a Dexterity saving throw. A creature takes 20d6 Fire damage and 20d6 Bludgeoning damage on a failed save or half as much damage on a successful one. A creature in the area of more than one fiery Sphere is affected only once. A nonmagical object that isn’t being worn or carried also takes the damage if it’s in the spell’s area, and the object starts burning if it’s flammable.",
      "start": 0,
      "end": 664
    },
    {
      "heading": "Mind Spike",
      "span": "Level 2 Divination (Sorcerer, Warlock, Wizard) Casting Time: Action Range: 120 feet Components: S Duration: Concentration, up to 1 hour You drive a spike of psionic energy into the mind of one creature you can see within range. The target makes a Wisdom saving throw, taking 3d8 Psychic damage on a failed save or half as much damage on a successful one. On a failed save, you also always know the target’s location until the spell ends, but only while the two of you are on the same plane of existence. While you have this knowledge, the target can’t become hidden from you, and if it has the Invisible condition, it gains no benefit from that condition against you. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 2.",
      "start": 0,
      "end": 763
    },
    {
      "heading": "Moonbeam",
      "span": "Until the spell ends, Dim Light fills the Cylinder, and you can take a Magic action on later turns to move the Cylinder up to 60 feet. When the Cylinder appears, each creature in it makes a Constitution saving throw. On a failed save, a creature takes 2d10 Radiant damage, and if the creature is shape-shifted (as a result of the Polymorph spell, for example), it reverts to its true form and can’t shape-shift until it leaves the Cylinder. On a successful save, a creature takes half as much damage only. A creature also makes this save when the spell’s area moves into its space and when it enters the spell’s area or ends its turn there. A creature makes this save only once per turn. Using a Higher-Level Spell Slot. The damage increases by 1d10 for each spell slot level above 2.",
      "start": 257,
      "end": 1042
    },
    {
      "heading": "Phantasmal Force",
      "span": "Level 2 Illusion (Bard, Sorcerer, Wizard) Casting Time: Action Range: 60 feet Components: V, S, M (a bit of fleece) Duration: Concentration, up to 1 minute You attempt to craft an illusion in the mind of a creature you can see within range. The target makes an Intelligence saving throw. On a failed save, you create a phantasmal object, creature, or other phenomenon that is no larger than a 10-foot Cube and that is perceivable only to the target for the duration. The phantasm includes sound, temperature, and other stimuli. The target can take a Study action to examine the phantasm with an Intelligence (Investigation) check against your spell save DC. If the check succeeds, the target realizes that the phantasm is an illusion, and the spell ends. While affected by the spell, the target treats the phantasm as if it were real and rationalizes any illogical outcomes from interacting with it. For example, if the target steps through a phantasmal bridge and survives the fall, it believes the bridge exists and something else caused it to fall. An affected target can even take damage from the illusion if the phantasm represents a dangerous creature or hazard. On each of your turns, such a phantasm can deal 2d8 Psychic damage to the target if it is in the phantasm’s area or within 5 feet of the phantasm. The target perceives the damage as a type appropriate to the illusion.",
      "start": 0,
      "end": 1386
    },
    {
      "heading": "Phantasmal Killer",
      "span": "Level 4 Illusion (Bard, Wizard) Casting Time: Action Range: 120 feet Components: V, S Duration: Concentration, up to 1 minute You tap into the nightmares of a creature you can see within range and create an illusion of its deepest fears, visible only to that creature. The target makes a Wisdom saving throw. On a failed save, the target takes 4d10 Psychic damage and has Disadvantage on ability checks and attack rolls for the duration. On a successful save, the target takes half as much damage, and the spell ends. For the duration, the target makes a Wisdom saving throw at the end of each of its turns. On a failed save, it takes the Psychic damage again. On a successful save, the spell ends. Using a Higher-Level Spell Slot. The damage increases by 1d10 for each spell slot level above 4.",
      "start": 0,
      "end": 795
    },
    {
      "heading": "Phantasmal Killer",
      "span": "On a successful save, the target takes half as much damage, and the spell ends. For the duration, the target makes a Wisdom saving throw at the end of each of its turns. On a failed save, it takes the Psychic damage again. On a successful save, the spell ends. Using a Higher-Level Spell Slot. The damage increases by 1d10 for each spell slot level above 4.",
      "start": 437,
      "end": 795
    },
    {
      "heading": "Prismatic Spray",
      "span": "Level 7 Evocation (Bard, Sorcerer, Wizard) Casting Time: Action Range: Self Components: V, S Duration: Instantaneous Eight rays of light flash from you in a 60-foot Cone. Each creature in the Cone makes a Dexterity saving throw. For each target, roll 1d8 to determine which color ray affects it, consulting the Prismatic Rays table. Prismatic Rays 1d8 Ray 1   Red. Failed Save: 12d6 Fire damage. Successful Save: Half as much damage. 2   Orange. Failed Save: 12d6 Acid damage. Successful Save: Half as much damage. 3   Yellow. Failed Save: 12d6 Lightning damage. Successful Save: Half as much damage. 4   Green. Failed Save: 12d6 Poison damage. Successful Save: Half as much damage. 1d8 Ray 5   Blue. Failed Save: 12d6 Cold damage. Successful Save: Half as much damage. 6   Indigo. Failed Save: The target has the Restrained condition and makes a Constitution saving throw at the end of each of its turns. If it successfully saves three times, the condition ends. If it fails three times, it has the Petrified condition until it is freed by an effect like the Greater Restoration spell. The successes and failures needn’t be consecutive; keep track of both until the target collects three of a kind. 7   Violet. Failed Save: The target has the Blinded condition and makes a Wisdom saving throw at the start of your next turn. On a successful save, the condition ends. On a failed save, the condition ends, and the creature teleports to another plane of existence (GM’s choice). 8   Special. The target is struck by two rays. Roll twice, rerolling any 8.",
      "start": 0,
      "end": 1553
    },
    {
      "heading": "Prismatic Wall",
      "span": "You and creatures you designate when you cast the spell can pass through and be near the wall without harm. If another creature that can see the wall moves within 20 feet of it or starts its turn there, the creature must succeed on a Constitution saving throw or have the Blinded condition for 1 minute. The wall consists of seven layers, each with a different color. When a creature reaches into or passes through the wall, it does so one layer at a time through all the layers. Each layer forces the creature to make a Dexterity saving throw or be affected by that layer’s properties as described in the Prismatic Layers table. The wall, which has AC 10, can be destroyed one layer at a time, in order from red to violet, by means specific to each layer. If a layer is destroyed, it is gone for the duration. Antimagic Field has no effect on the wall, and Dispel Magic can affect only the violet layer. Prismatic Layers Order   Effects 1     Red. Failed Save: 12d6 Fire damage. Successful Save: Half as much damage. Additional Effects: Nonmagical ranged attacks can’t pass through this layer, which is destroyed if it takes at least 25 Cold damage. 2     Orange. Failed Save: 12d6 Acid damage. Successful Save: Half as much damage. Additional Effects: Magical ranged attacks can’t pass through this layer, which is destroyed by a strong wind (such as the one created by Gust of Wind). 3     Yellow. Failed Save: 12d6 Lightning damage. Successful Save: Half as much damage. Additional Effects: The layer is destroyed if it takes at least 60 Force damage. 4     Green. Failed Save: 12d6 Poison damage. Successful Save: Half as much damage. Additional Effects: A Passwall spell, or another spell of equal or greater level that can open a portal on a solid surface, destroys this layer. 5     Blue.",
      "start": 590,
      "end": 2387
    },
    {
      "heading": "Prismatic Wall",
      "span": "When a creature reaches into or passes through the wall, it does so one layer at a time through all the layers. Each layer forces the creature to make a Dexterity saving throw or be affected by that layer’s properties as described in the Prismatic Layers table. The wall, which has AC 10, can be destroyed one layer at a time, in order from red to violet, by means specific to each layer. If a layer is destroyed, it is gone for the duration. Antimagic Field has no effect on the wall, and Dispel Magic can affect only the violet layer. Prismatic Layers Order   Effects 1     Red. Failed Save: 12d6 Fire damage. Successful Save: Half as much damage. Additional Effects: Nonmagical ranged attacks can’t pass through this layer, which is destroyed if it takes at least 25 Cold damage. 2     Orange. Failed Save: 12d6 Acid damage. Successful Save: Half as much damage. Additional Effects: Magical ranged attacks can’t pass through this layer, which is destroyed by a strong wind (such as the one created by Gust of Wind). 3     Yellow. Failed Save: 12d6 Lightning damage. Successful Save: Half as much damage. Additional Effects: The layer is destroyed if it takes at least 60 Force damage. 4     Green. Failed Save: 12d6 Poison damage. Successful Save: Half as much damage. Additional Effects: A Passwall spell, or another spell of equal or greater level that can open a portal on a solid surface, destroys this layer. 5     Blue. Failed Save: 12d6 Cold damage. Successful Save: Half as much damage. Additional Effects: The layer is destroyed if it takes at least 25 Fire damage. 6     Indigo. Failed Save: The target has the Restrained condition and makes a Constitution saving throw at the end of each of its turns. If it successfully saves three times, the condition ends.",
      "start": 958,
      "end": 2732
    },
    {
      "heading": "Ray of Enfeeblement",
      "span": "Level 2 Necromancy (Warlock, Wizard) Casting Time: Action Range: 60 feet Components: V, S Duration: Concentration, up to 1 minute A beam of enervating energy shoots from you toward a creature within range. The target must make a Constitution saving throw. On a successful save, the target has Disadvantage on the next attack roll it makes until the start of your next turn. On a failed save, the target has Disadvantage on Strength-based D20 Tests for the duration. During that time, it also subtracts 1d8 from all its damage rolls. The target repeats the save at the end of each of its turns, ending the spell on a success.",
      "start": 0,
      "end": 624
    },
    {
      "heading": "Sacred Flame",
      "span": "Evocation Cantrip (Cleric) Casting Time: Action Range: 60 feet Components: V, S Duration: Instantaneous Flame-like radiance descends on a creature that you can see within range. The target must succeed on a Dexterity saving throw or take 1d8 Radiant damage. The target gains no benefit from Half Cover or Three-Quarters Cover for this save. Cantrip Upgrade. The damage increases by 1d8 when you reach levels 5 (2d8), 11 (3d8), and 17 (4d8).",
      "start": 0,
      "end": 440
    },
    {
      "heading": "Searing Smite",
      "span": "Level 1 Evocation (Paladin) Casting Time: Bonus Action, which you take immediately after hitting a target with a Melee weapon or an Unarmed Strike Range: Self Component: V Duration: 1 minute As you hit the target, it takes an extra 1d6 Fire damage from the attack. At the start of each of its turns until the spell ends, the target takes 1d6 Fire damage and then makes a Constitution saving throw. On a failed save, the spell continues. On a successful save, the spell ends. Using a Higher-Level Spell Slot. All the damage increases by 1d6 for each spell slot level above 1.",
      "start": 0,
      "end": 574
    },
    {
      "heading": "Shatter",
      "span": "Level 2 Evocation (Bard, Sorcerer, Wizard) Casting Time: Action Range: 60 feet Components: V, S, M (a chip of mica) Duration: Instantaneous A loud noise erupts from a point of your choice within range. Each creature in a 10-foot-radius Sphere centered there makes a Constitution saving throw, taking 3d8 Thunder damage on a failed save or half as much damage on a successful one. A Construct has Disadvantage on the save. A nonmagical object that isn’t being worn or carried also takes the damage if it’s in the spell’s area. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 2.",
      "start": 0,
      "end": 621
    },
    {
      "heading": "Sleep",
      "span": "Level 1 Enchantment (Bard, Sorcerer, Wizard) Casting Time: Action Range: 60 feet Components: V, S, M (a pinch of sand or rose petals) Duration: Concentration, up to 1 minute Each creature of your choice in a 5-foot-radius Sphere centered on a point within range must succeed on a Wisdom saving throw or have the Incapacitated condition until the end of its next turn, at which point it must repeat the save. If the target fails the second save, the target has the Unconscious condition for the duration. The spell ends on a target if it takes damage or someone within 5 feet of it takes an action to shake it out of the spell’s effect. Creatures that don’t sleep, such as elves, or that have Immunity to the Exhaustion condition automatically succeed on saves against this spell.",
      "start": 0,
      "end": 779
    },
    {
      "heading": "Spirit Guardians",
      "span": "When you cast this spell, you can designate creatures to be unaffected by it. Any other creature’s Speed is halved in the Emanation, and whenever the Emanation enters a creature’s space and whenever a creature enters the Emanation or ends its turn there, the creature must make a Wisdom saving throw. On a failed save, the creature takes 3d8 Radiant damage (if you are good or neutral) or 3d8 Necrotic damage (if you are evil). On a successful save, the creature takes half as much damage. A creature makes this save only once per turn. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 3.",
      "start": 342,
      "end": 975
    },
    {
      "heading": "Storm of Vengeance",
      "span": "Level 9 Conjuration (Druid) Casting Time: Action Range: 1 mile Components: V, S Duration: Concentration, up to 1 minute A churning storm cloud forms for the duration, centered on a point within range and spreading to a radius of 300 feet. Each creature under the cloud when it appears must succeed on a Constitution saving throw or take 2d6 Thunder damage and have the Deafened condition for the duration. At the start of each of your later turns, the storm produces different effects, as detailed below. Turn 2. Acidic rain falls. Each creature and object under the cloud takes 4d6 Acid damage. Turn 3. You call six bolts of lightning from the cloud to strike six different creatures or objects beneath it. Each target makes a Dexterity saving throw, taking 10d6 Lightning damage on a failed save or half as much damage on a successful one. Turn 4. Hailstones rain down. Each creature under the cloud takes 2d6 Bludgeoning damage. Turns 5–10. Gusts and freezing rain assail the area under the cloud. Each creature there takes 1d6 Cold damage. Until the spell ends, the area is Difficult Terrain and Heavily Obscured, ranged attacks with weapons are impossible there, and strong wind blows through the area.",
      "start": 0,
      "end": 1207
    },
    {
      "heading": "Storm of Vengeance",
      "span": "You call six bolts of lightning from the cloud to strike six different creatures or objects beneath it. Each target makes a Dexterity saving throw, taking 10d6 Lightning damage on a failed save or half as much damage on a successful one. Turn 4. Hailstones rain down. Each creature under the cloud takes 2d6 Bludgeoning damage. Turns 5–10. Gusts and freezing rain assail the area under the cloud. Each creature there takes 1d6 Cold damage. Until the spell ends, the area is Difficult Terrain and Heavily Obscured, ranged attacks with weapons are impossible there, and strong wind blows through the area.",
      "start": 603,
      "end": 1207
    },
    {
      "heading": "Summon Dragon",
      "span": "Breath Weapon. Dexterity Saving Throw: DC equals your spell save DC, each creature in a 30-foot Cone. Failure: 2d6 damage of a type this spirit has Resistance to (your choice when you cast the spell). Success: Half damage.",
      "start": 1786,
      "end": 2009
    },
    {
      "heading": "Sunbeam",
      "span": "Level 6 Evocation (Cleric, Druid, Sorcerer, Wizard) Casting Time: Action Range: Self Components: V, S, M (a magnifying glass) Duration: Concentration, up to 1 minute You launch a sunbeam in a 5-foot-wide, 60-foot-long Line. Each creature in the Line makes a Constitution saving throw. On a failed save, a creature takes 6d8 Radiant damage and has the Blinded condition until the start of your next turn. On a successful save, it takes half as much damage only. Until the spell ends, you can take a Magic action to create a new Line of radiance. For the duration, a mote of brilliant radiance shines above you. It sheds Bright Light in a 30-foot radius and Dim Light for an additional 30 feet. This light is sunlight.",
      "start": 0,
      "end": 716
    },
    {
      "heading": "Sunburst",
      "span": "Level 8 Evocation (Cleric, Druid, Sorcerer, Wizard) Casting Time: Action Range: 150 feet Components: V, S, M (a piece of sunstone) Duration: Instantaneous Brilliant sunlight flashes in a 60-foot-radius Sphere centered on a point you choose within range. Each creature in the Sphere makes a Constitution saving throw. On a failed save, a creature takes 12d6 Radiant damage and has the Blinded condition for 1 minute. On a successful save, it takes half as much damage only. A creature Blinded by this spell makes another Constitution saving throw at the end of each of its turns, ending the effect on itself on a success. This spell dispels Darkness in its area that was created by any spell.",
      "start": 0,
      "end": 691
    },
    {
      "heading": "Symbol",
      "span": "Death. Each target makes a Constitution saving throw, taking 10d10 Necrotic damage on a failed save or half as much damage on a successful save. Discord. Each target makes a Wisdom saving throw. On a failed save, a target argues with other creatures for 1 minute. During this time, it is incapable of meaningful communication and has Disadvantage on attack rolls and ability checks. Fear. Each target must succeed on a Wisdom saving throw or have the Frightened condition for 1 minute. While Frightened, the target must move at least 30 feet away from the glyph on each of its turns, if able. Pain. Each target must succeed on a Constitution saving throw or have the Incapacitated condition for 1 minute. Sleep. Each target must succeed on a Wisdom saving throw or have the Unconscious condition for 10 minutes. A creature awakens if it takes damage or if someone takes an action to shake it awake. Stunning. Each target must succeed on a Wisdom saving throw or have the Stunned condition for 1 minute.",
      "start": 1851,
      "end": 2854
    },
    {
      "heading": "Thunderwave",
      "span": "Level 1 Evocation (Bard, Druid, Sorcerer, Wizard) Casting Time: Action Range: Self Components: V, S Duration: Instantaneous You unleash a wave of thunderous energy. Each creature in a 15-foot Cube originating from you makes a Constitution saving throw. On a failed save, a creature takes 2d8 Thunder damage and is pushed 10 feet away from you. On a successful save, a creature takes half as much damage only. In addition, unsecured objects that are entirely within the Cube are pushed 10 feet away from you, and a thunderous boom is audible within 300 feet. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 1.",
      "start": 0,
      "end": 653
    },
    {
      "heading": "Tsunami",
      "span": "The wall lasts for the duration. When the wall appears, each creature in its area makes a Strength saving throw, taking 6d10 Bludgeoning damage on a failed save or half as much damage on a successful one. At the start of each of your turns after the wall appears, the wall, along with any creatures in it, moves 50 feet away from you. Any Huge or smaller creature inside the wall or whose space the wall enters when it moves must succeed on a Strength saving throw or take 5d10 Bludgeoning damage. A creature can take this damage only once per round. At the end of the turn, the wall’s height is reduced by 50 feet, and the damage the wall deals on later rounds is reduced by 1d10. When the wall reaches 0 feet in height, the spell ends. A creature caught in the wall can move by swimming. Because of the wave’s force, though, the creature must succeed on a Strength (Athletics) check against your spell save DC to move at all. If it fails the check, it can’t move. A creature that moves out of the wall falls to the ground.",
      "start": 273,
      "end": 1298
    },
    {
      "heading": "Tsunami",
      "span": "At the start of each of your turns after the wall appears, the wall, along with any creatures in it, moves 50 feet away from you. Any Huge or smaller creature inside the wall or whose space the wall enters when it moves must succeed on a Strength saving throw or take 5d10 Bludgeoning damage. A creature can take this damage only once per round. At the end of the turn, the wall’s height is reduced by 50 feet, and the damage the wall deals on later rounds is reduced by 1d10. When the wall reaches 0 feet in height, the spell ends. A creature caught in the wall can move by swimming. Because of the wave’s force, though, the creature must succeed on a Strength (Athletics) check against your spell save DC to move at all. If it fails the check, it can’t move. A creature that moves out of the wall falls to the ground.",
      "start": 478,
      "end": 1298
    },
    {
      "heading": "Vicious Mockery",
      "span": "Enchantment Cantrip (Bard) Casting Time: Action Range: 60 feet Components: V Duration: Instantaneous You unleash a string of insults laced with subtle enchantments at one creature you can see or hear within range. The target must succeed on a Wisdom saving throw or take 1d6 Psychic damage and have Disadvantage on the next attack roll it makes before the end of its next turn. Cantrip Upgrade. The damage increases by 1d6 when you reach levels 5 (2d6), 11 (3d6), and 17 (4d6).",
      "start": 0,
      "end": 477
    },
    {
      "heading": "Vitriolic Sphere",
      "span": "Level 4 Evocation (Sorcerer, Wizard) Casting Time: Action Range: 150 feet Components: V, S, M (a drop of bile) Duration: Instantaneous You point at a location within range, and a glowing, 1-foot-diameter ball of acid streaks there and explodes in a 20-foot-radius Sphere. Each creature in that area makes a Dexterity saving throw. On a failed save, a creature takes 10d4 Acid damage and another 5d4 Acid damage at the end of its next turn. On a successful save, a creature takes half the initial damage only. Using a Higher-Level Spell Slot. The initial damage increases by 2d4 for each spell slot level above 4.",
      "start": 0,
      "end": 612
    },
    {
      "heading": "Wall of Fire",
      "span": "The wall is opaque and lasts for the duration. When the wall appears, each creature in its area makes a Dexterity saving throw, taking 5d8 Fire damage on a failed save or half as much damage on a successful one. One side of the wall, selected by you when you cast this spell, deals 5d8 Fire damage to each creature that ends its turn within 10 feet of that side or inside the wall. A creature takes the same damage when it enters the wall for the first time on a turn or ends its turn there. The other side of the wall deals no damage. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 4.",
      "start": 371,
      "end": 1003
    },
    {
      "heading": "Wall of Ice",
      "span": "In any form, the wall is 1 foot thick and lasts for the duration. If the wall cuts through a creature’s space when it appears, the creature is pushed to one side of the wall (you choose which side) and makes a Dexterity saving throw, taking 10d6 Cold damage on a failed save or half as much damage on a successful one. The wall is an object that can be damaged and thus breached. It has AC 12 and 30 Hit Points per 10-foot section, and it has Immunity to Cold, Poison, and Psychic damage and Vulnerability to Fire damage. Reducing a 10-foot section of wall to 0 Hit Points destroys it and leaves behind a sheet of frigid air in the space the wall occupied. A creature moving through the sheet of frigid air for the first time on a turn makes a Constitution saving throw, taking 5d6 Cold damage on a failed save or half as much damage on a successful one. Using a Higher-Level Spell Slot. The damage the wall deals when it appears increases by 2d6 and the damage from passing through the sheet of frigid air increases by 1d6 for each spell slot level above 6.",
      "start": 408,
      "end": 1467
    },
    {
      "heading": "Wall of Ice",
      "span": "Reducing a 10-foot section of wall to 0 Hit Points destroys it and leaves behind a sheet of frigid air in the space the wall occupied. A creature moving through the sheet of frigid air for the first time on a turn makes a Constitution saving throw, taking 5d6 Cold damage on a failed save or half as much damage on a successful one. Using a Higher-Level Spell Slot. The damage the wall deals when it appears increases by 2d6 and the damage from passing through the sheet of frigid air increases by 1d6 for each spell slot level above 6.",
      "start": 930,
      "end": 1467
    },
    {
      "heading": "Wall of Stone",
      "span": "If the wall cuts through a creature’s space when it appears, the creature is pushed to one side of the wall (you choose which side). If a creature would be surrounded on all sides by the wall (or the wall and another solid surface), that creature can make a Dexterity saving throw. On a success, it can use its Reaction to move up to its Speed so that it is no longer enclosed by the wall. The wall can have any shape you desire, though it can’t occupy the same space as a creature or object. The wall doesn’t need to be vertical or rest on a firm foundation. It must, however, merge with and be solidly supported by existing stone. Thus, you can use this spell to bridge a chasm or create a ramp. If you create a span greater than 20 feet in length, you must halve the size of each panel to create supports. You can crudely shape the wall to create battlements and the like. The wall is an object made of stone that can be damaged and thus breached. Each panel has AC 15 and 30 Hit Points per inch of thickness, and it has Immunity to Poison and Psychic damage. Reducing a panel to 0 Hit Points destroys it and might cause connected panels to collapse at the GM’s discretion. If you maintain your Concentration on this spell for its full duration, the wall becomes permanent and can’t be dispelled. Otherwise, the wall disappears when the spell ends.",
      "start": 468,
      "end": 1820
    },
    {
      "heading": "Wall of Thorns",
      "span": "The wall blocks line of sight. When the wall appears, each creature in its area makes a Dexterity saving throw, taking 7d8 Piercing damage on a failed save or half as much damage on a successful one. A creature can move through the wall, albeit slowly and painfully. For every 1 foot a creature moves through the wall, it must spend 4 feet of movement. Furthermore, the first time a creature enters a space in the wall on a turn or ends its turn there, the creature makes a Dexterity saving throw, taking 7d8 Slashing damage on a failed save or half as much damage on a successful one. A creature makes this save only once per turn. Using a Higher-Level Spell Slot. Both types of damage increase by 1d8 for each spell slot level above 6.",
      "start": 459,
      "end": 1197
    },
    {
      "heading": "Wall of Thorns",
      "span": "For every 1 foot a creature moves through the wall, it must spend 4 feet of movement. Furthermore, the first time a creature enters a space in the wall on a turn or ends its turn there, the creature makes a Dexterity saving throw, taking 7d8 Slashing damage on a failed save or half as much damage on a successful one. A creature makes this save only once per turn. Using a Higher-Level Spell Slot. Both types of damage increase by 1d8 for each spell slot level above 6.",
      "start": 726,
      "end": 1197
    },
    {
      "heading": "Warding Bond",
      "span": "Level 2 Abjuration (Cleric, Paladin) Casting Time: Action Range: Touch Components: V, S, M (a pair of platinum rings worth 50+ GP each, which you and the target must wear for the duration) Duration: 1 hour You touch another creature that is willing and create a mystic connection between you and the target until the spell ends. While the target is within 60 feet of you, it gains a +1 bonus to AC and saving throws, and it has Resistance to all damage. Also, each time it takes damage, you take the same amount of damage. The spell ends if you drop to 0 Hit Points or if you and the target become separated by more than 60 feet. It also ends if the spell is cast again on either of the connected creatures.",
      "start": 0,
      "end": 707
    },
    {
      "heading": "Web",
      "span": "Webs layered over a flat surface have a depth of 5 feet. The first time a creature enters the webs on a turn or starts its turn there, it must succeed on a Dexterity saving throw or have the Restrained condition while in the webs or until it breaks free. A creature Restrained by the webs can take an action to make a Strength (Athletics) check against your spell save DC. If it succeeds, it is no longer Restrained. The webs are flammable. Any 5-foot Cube of webs exposed to fire burns away in 1 round, dealing 2d4 Fire damage to any creature that starts its turn in the fire.",
      "start": 549,
      "end": 1127
    },
    {
      "heading": "Weird",
      "span": "Level 9 Illusion (Warlock, Wizard) Casting Time: Action Range: 120 feet Components: V, S Duration: Concentration, up to 1 minute You try to create illusory terrors in others’ minds. Each creature of your choice in a 30-foot-radius Sphere centered on a point within range makes a Wisdom saving throw. On a failed save, a target takes 10d10 Psychic damage and has the Frightened condition for the duration. On a successful save, a target takes half as much damage only. A Frightened target makes a Wisdom saving throw at the end of each of its turns. On a failed save, it takes 5d10 Psychic damage. On a successful save, the spell ends on that target.",
      "start": 0,
      "end": 649
    },
    {
      "heading": "Weird",
      "span": "On a successful save, a target takes half as much damage only. A Frightened target makes a Wisdom saving throw at the end of each of its turns. On a failed save, it takes 5d10 Psychic damage. On a successful save, the spell ends on that target.",
      "start": 404,
      "end": 649
    },
    {
      "heading": "Wind Wall",
      "span": "The wall lasts for the duration. When the wall appears, each creature in its area makes a Strength saving throw, taking 4d8 Bludgeoning damage on a failed save or half as much damage on a successful one. The strong wind keeps fog, smoke, and other gases at bay. Small or smaller flying creatures or objects can’t pass through the wall. Loose, lightweight materials brought into the wall fly upward. Arrows, bolts, and other ordinary projectiles launched at targets behind the wall are deflected upward and miss automatically. Boulders hurled by Giants or siege engines, and similar projectiles, are unaffected. Creatures in gaseous form can’t pass through it.",
      "start": 409,
      "end": 1069
    },
    {
      "heading": "Wish",
      "span": "Reality reshapes itself to accommodate the new result. For example, a Wish spell could undo an ally’s failed saving throw or a foe’s Critical Hit. You can force the reroll to be made with Advantage or Disadvantage, and you choose whether to use the reroll or the original roll. Reshape Reality. You may wish for something not included in any of the other effects. To do so, state your wish to the GM as precisely as possible. The GM has great latitude in ruling what occurs in such an instance; the greater the wish, the greater the likelihood that something goes wrong. This spell might simply fail, the effect you desire might be achieved only in part, or you might suffer an unforeseen consequence as a result of how you worded the wish. For example, wishing that a villain were dead might propel you forward in time to a period when that villain is no longer alive, effectively removing you from the game. Similarly, wishing for a Legendary magic item or an Artifact might instantly transport you to the presence of the item’s current owner. If your wish is granted and its effects have consequences for a whole community, region, or world, you are likely to attract powerful foes. If your wish would affect a god, the god’s divine servants might instantly intervene to prevent it or to encourage you to craft the wish in a particular way. If your wish would undo the multiverse itself, your wish fails. The stress of casting Wish to produce any effect other than duplicating another spell weakens you. After enduring that stress, each time you cast a spell until you finish a Long Rest, you take 1d10 Necrotic damage per level of that spell. This damage can’t be reduced or prevented in any way. In addition, your Strength score becomes 3 for 2d4 days.",
      "start": 1563,
      "end": 3321
    }
  ]
} as const satisfies BundledCoverageSource);
