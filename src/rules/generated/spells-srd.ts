// GENERATED FILE — DO NOT EDIT BY HAND.
// Source of truth, read by src/rules/spells-srd-reader.ts, each source pinned by its sha256:
//   docs/srd/source/spell-descriptions.txt sha256=81c213de67213734b27d65c791b18686770ed3404dd0443d346ec72290057829
//   docs/srd/source/bard-spell-list.txt sha256=7cdca733e61177a5d73606c918b905647bf793681ab9a648577c09c1f40ad9ad
//   docs/srd/source/cleric-spell-list.txt sha256=8a91ee63ab3ee4ef39c54e066c3ba255cdfb6a2ef39ab7391d8d92e051d2a547
//   docs/srd/source/druid-spell-list.txt sha256=054589b1545c8eb3b7e7d7c1b215816790cef44091d75b944a9fc398957667f4
//   docs/srd/source/paladin-spell-list.txt sha256=783040fafe3f1b7266cda2739c4f6ccb9357d0e026aafee9730111f4e46f3d75
//   docs/srd/source/ranger-spell-list.txt sha256=dd1ab7523bce6cf483f8977088185994b4a67389279bfe48389cef4099c090b2
//   docs/srd/source/sorcerer-spell-list.txt sha256=2f5571a173d92e4ca53e931009564483fa2fbe91e2b140871d2c3f5e106ea394
//   docs/srd/source/warlock-spell-list.txt sha256=43d0c57d27e3580d8f2ff6b0174fb778f1eb43251ec91e182f126fcbb14621e1
//   docs/srd/source/wizard-spell-list.txt sha256=8400870a0b7a789fc9f8cf94ea5e9faed9c1682c9bfa9bcc9fd4ee748a713926
// Regenerate with `npm run srd:artifacts`.
// tests/unit/rules/spells-srd-generation.test.ts fails if it drifts, or if any byte of a source changes.
/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 */
import { deepFreeze } from '../../domain/deep-freeze';
import type { SrdSpellCatalogArtifact } from '../spells-srd-reader';

/** Every spell version key this artifact records: the closed set the runtime mints `ContentKey` from. */
export type BundledSrdSpellContentKeyText =
  | "2024:acid-arrow"
  | "2024:acid-splash"
  | "2024:aid"
  | "2024:alarm"
  | "2024:alter-self"
  | "2024:animal-friendship"
  | "2024:animal-messenger"
  | "2024:animal-shapes"
  | "2024:animate-dead"
  | "2024:animate-objects"
  | "2024:antilife-shell"
  | "2024:antimagic-field"
  | "2024:antipathy-sympathy"
  | "2024:arcane-eye"
  | "2024:arcane-hand"
  | "2024:arcane-lock"
  | "2024:arcane-sword"
  | "2024:arcanist-s-magic-aura"
  | "2024:astral-projection"
  | "2024:augury"
  | "2024:aura-of-life"
  | "2024:awaken"
  | "2024:bane"
  | "2024:banishment"
  | "2024:barkskin"
  | "2024:beacon-of-hope"
  | "2024:befuddlement"
  | "2024:bestow-curse"
  | "2024:black-tentacles"
  | "2024:blade-barrier"
  | "2024:bless"
  | "2024:blight"
  | "2024:blindness-deafness"
  | "2024:blink"
  | "2024:blur"
  | "2024:burning-hands"
  | "2024:call-lightning"
  | "2024:calm-emotions"
  | "2024:chain-lightning"
  | "2024:charm-monster"
  | "2024:charm-person"
  | "2024:chill-touch"
  | "2024:chromatic-orb"
  | "2024:circle-of-death"
  | "2024:clairvoyance"
  | "2024:clone"
  | "2024:cloudkill"
  | "2024:color-spray"
  | "2024:command"
  | "2024:commune"
  | "2024:commune-with-nature"
  | "2024:comprehend-languages"
  | "2024:compulsion"
  | "2024:cone-of-cold"
  | "2024:confusion"
  | "2024:conjure-animals"
  | "2024:conjure-celestial"
  | "2024:conjure-elemental"
  | "2024:conjure-fey"
  | "2024:conjure-minor-elementals"
  | "2024:conjure-woodland-beings"
  | "2024:contact-other-plane"
  | "2024:contagion"
  | "2024:contingency"
  | "2024:continual-flame"
  | "2024:control-water"
  | "2024:control-weather"
  | "2024:counterspell"
  | "2024:create-food-and-water"
  | "2024:create-or-destroy-water"
  | "2024:create-undead"
  | "2024:creation"
  | "2024:cure-wounds"
  | "2024:dancing-lights"
  | "2024:darkness"
  | "2024:darkvision"
  | "2024:daylight"
  | "2024:death-ward"
  | "2024:delayed-blast-fireball"
  | "2024:demiplane"
  | "2024:detect-evil-and-good"
  | "2024:detect-magic"
  | "2024:detect-poison-and-disease"
  | "2024:detect-thoughts"
  | "2024:dimension-door"
  | "2024:disguise-self"
  | "2024:disintegrate"
  | "2024:dispel-evil-and-good"
  | "2024:dispel-magic"
  | "2024:dissonant-whispers"
  | "2024:divination"
  | "2024:divine-favor"
  | "2024:divine-smite"
  | "2024:divine-word"
  | "2024:dominate-beast"
  | "2024:dominate-monster"
  | "2024:dominate-person"
  | "2024:dragon-s-breath"
  | "2024:dream"
  | "2024:druidcraft"
  | "2024:earthquake"
  | "2024:eldritch-blast"
  | "2024:elementalism"
  | "2024:enhance-ability"
  | "2024:enlarge-reduce"
  | "2024:ensnaring-strike"
  | "2024:entangle"
  | "2024:enthrall"
  | "2024:etherealness"
  | "2024:expeditious-retreat"
  | "2024:eyebite"
  | "2024:fabricate"
  | "2024:faerie-fire"
  | "2024:faithful-hound"
  | "2024:false-life"
  | "2024:fear"
  | "2024:feather-fall"
  | "2024:find-familiar"
  | "2024:find-steed"
  | "2024:find-the-path"
  | "2024:find-traps"
  | "2024:finger-of-death"
  | "2024:fireball"
  | "2024:fire-bolt"
  | "2024:fire-shield"
  | "2024:fire-storm"
  | "2024:flame-blade"
  | "2024:flame-strike"
  | "2024:flaming-sphere"
  | "2024:flesh-to-stone"
  | "2024:floating-disk"
  | "2024:fly"
  | "2024:fog-cloud"
  | "2024:forbiddance"
  | "2024:forcecage"
  | "2024:foresight"
  | "2024:freedom-of-movement"
  | "2024:freezing-sphere"
  | "2024:gaseous-form"
  | "2024:gate"
  | "2024:geas"
  | "2024:gentle-repose"
  | "2024:giant-insect"
  | "2024:glibness"
  | "2024:globe-of-invulnerability"
  | "2024:glyph-of-warding"
  | "2024:goodberry"
  | "2024:grease"
  | "2024:greater-invisibility"
  | "2024:greater-restoration"
  | "2024:guardian-of-faith"
  | "2024:guards-and-wards"
  | "2024:guidance"
  | "2024:guiding-bolt"
  | "2024:gust-of-wind"
  | "2024:hallow"
  | "2024:hallucinatory-terrain"
  | "2024:harm"
  | "2024:haste"
  | "2024:heal"
  | "2024:healing-word"
  | "2024:heat-metal"
  | "2024:hellish-rebuke"
  | "2024:heroes-feast"
  | "2024:heroism"
  | "2024:hex"
  | "2024:hideous-laughter"
  | "2024:hold-monster"
  | "2024:hold-person"
  | "2024:holy-aura"
  | "2024:hunter-s-mark"
  | "2024:hypnotic-pattern"
  | "2024:ice-knife"
  | "2024:ice-storm"
  | "2024:identify"
  | "2024:illusory-script"
  | "2024:imprisonment"
  | "2024:incendiary-cloud"
  | "2024:inflict-wounds"
  | "2024:insect-plague"
  | "2024:instant-summons"
  | "2024:irresistible-dance"
  | "2024:invisibility"
  | "2024:jump"
  | "2024:knock"
  | "2024:legend-lore"
  | "2024:lesser-restoration"
  | "2024:levitate"
  | "2024:light"
  | "2024:lightning-bolt"
  | "2024:locate-animals-or-plants"
  | "2024:locate-creature"
  | "2024:locate-object"
  | "2024:longstrider"
  | "2024:mage-armor"
  | "2024:mage-hand"
  | "2024:magic-circle"
  | "2024:magic-jar"
  | "2024:magic-missile"
  | "2024:magic-mouth"
  | "2024:magic-weapon"
  | "2024:magnificent-mansion"
  | "2024:major-image"
  | "2024:mass-cure-wounds"
  | "2024:mass-heal"
  | "2024:mass-healing-word"
  | "2024:mass-suggestion"
  | "2024:maze"
  | "2024:meld-into-stone"
  | "2024:mending"
  | "2024:message"
  | "2024:meteor-swarm"
  | "2024:mind-blank"
  | "2024:mind-spike"
  | "2024:minor-illusion"
  | "2024:mirage-arcane"
  | "2024:mirror-image"
  | "2024:mislead"
  | "2024:misty-step"
  | "2024:modify-memory"
  | "2024:moonbeam"
  | "2024:move-earth"
  | "2024:nondetection"
  | "2024:passwall"
  | "2024:pass-without-trace"
  | "2024:phantasmal-force"
  | "2024:phantasmal-killer"
  | "2024:phantom-steed"
  | "2024:planar-ally"
  | "2024:planar-binding"
  | "2024:plane-shift"
  | "2024:plant-growth"
  | "2024:poison-spray"
  | "2024:polymorph"
  | "2024:power-word-heal"
  | "2024:power-word-kill"
  | "2024:power-word-stun"
  | "2024:prayer-of-healing"
  | "2024:prestidigitation"
  | "2024:prismatic-spray"
  | "2024:prismatic-wall"
  | "2024:private-sanctum"
  | "2024:produce-flame"
  | "2024:programmed-illusion"
  | "2024:project-image"
  | "2024:protection-from-energy"
  | "2024:protection-from-evil-and-good"
  | "2024:protection-from-poison"
  | "2024:purify-food-and-drink"
  | "2024:raise-dead"
  | "2024:ray-of-enfeeblement"
  | "2024:ray-of-frost"
  | "2024:regenerate"
  | "2024:ray-of-sickness"
  | "2024:reincarnate"
  | "2024:remove-curse"
  | "2024:resilient-sphere"
  | "2024:resistance"
  | "2024:resurrection"
  | "2024:reverse-gravity"
  | "2024:revivify"
  | "2024:rope-trick"
  | "2024:sacred-flame"
  | "2024:sanctuary"
  | "2024:scorching-ray"
  | "2024:scrying"
  | "2024:searing-smite"
  | "2024:secret-chest"
  | "2024:see-invisibility"
  | "2024:seeming"
  | "2024:sending"
  | "2024:sequester"
  | "2024:shapechange"
  | "2024:shatter"
  | "2024:shield"
  | "2024:shield-of-faith"
  | "2024:shillelagh"
  | "2024:shining-smite"
  | "2024:shocking-grasp"
  | "2024:silence"
  | "2024:silent-image"
  | "2024:simulacrum"
  | "2024:sleep"
  | "2024:sleet-storm"
  | "2024:slow"
  | "2024:sorcerous-burst"
  | "2024:spare-the-dying"
  | "2024:speak-with-animals"
  | "2024:speak-with-dead"
  | "2024:speak-with-plants"
  | "2024:spider-climb"
  | "2024:spike-growth"
  | "2024:spirit-guardians"
  | "2024:spiritual-weapon"
  | "2024:starry-wisp"
  | "2024:stinking-cloud"
  | "2024:stone-shape"
  | "2024:stoneskin"
  | "2024:storm-of-vengeance"
  | "2024:suggestion"
  | "2024:summon-dragon"
  | "2024:sunbeam"
  | "2024:sunburst"
  | "2024:symbol"
  | "2024:telekinesis"
  | "2024:telepathic-bond"
  | "2024:teleport"
  | "2024:teleportation-circle"
  | "2024:thaumaturgy"
  | "2024:thunderwave"
  | "2024:time-stop"
  | "2024:tiny-hut"
  | "2024:tongues"
  | "2024:transport-via-plants"
  | "2024:tree-stride"
  | "2024:true-polymorph"
  | "2024:true-resurrection"
  | "2024:true-seeing"
  | "2024:true-strike"
  | "2024:tsunami"
  | "2024:unseen-servant"
  | "2024:vampiric-touch"
  | "2024:vicious-mockery"
  | "2024:vitriolic-sphere"
  | "2024:wall-of-fire"
  | "2024:wall-of-force"
  | "2024:wall-of-ice"
  | "2024:wall-of-stone"
  | "2024:wall-of-thorns"
  | "2024:warding-bond"
  | "2024:water-breathing"
  | "2024:water-walk"
  | "2024:web"
  | "2024:weird"
  | "2024:wind-walk"
  | "2024:wind-wall"
  | "2024:wish"
  | "2024:word-of-recall"
  | "2024:zone-of-truth";

export const BUNDLED_SRD_SPELL_CATALOG = {
  "descriptions": [
    {
      "name": "Acid Arrow",
      "identity_key": "acid-arrow",
      "content_key": "2024:acid-arrow",
      "level": 2,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "90 feet",
      "components": "V, S, M (powdered rhubarb leaf)",
      "duration": "Instantaneous",
      "description": "A shimmering green arrow streaks toward a target\n      within range and bursts in a spray of acid. Make a\n      ranged spell attack against the target. On a hit, the\n\n      target takes 4d4 Acid damage and 2d4 Acid damage at the end of its next turn. On a miss, the arrow\n      splashes the target with acid for half as much of the\n      initial damage only.\n        Using a Higher-Level Spell Slot. The damage\n      (both initial and later) increases by 1d4 for each\n      spell slot level above 2.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 90,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "powdered rhubarb leaf",
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Acid Splash",
      "identity_key": "acid-splash",
      "content_key": "2024:acid-splash",
      "level": 0,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "You create an acidic bubble at a point within range,\n      where it explodes in a 5-foot-radius Sphere. Each\n      creature in that Sphere must succeed on a Dexterity\n      saving throw or take 1d6 Acid damage.\n        Cantrip Upgrade. The damage increases by 1d6\n      when you reach levels 5 (2d6), 11 (3d6), and 17\n      (4d6).",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Aid",
      "identity_key": "aid",
      "content_key": "2024:aid",
      "level": 2,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S, M (a strip of white cloth)",
      "duration": "8 hours",
      "description": "Choose up to three creatures within range. Each\n\n      target’s Hit Point maximum and current Hit Points\n\n      increase by 5 for the duration.\n\n        Using a Higher-Level Spell Slot. Each target’s Hit\n\n      Points increase by 5 for each spell slot level above 2.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a strip of white cloth",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 8,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Alarm",
      "identity_key": "alarm",
      "content_key": "2024:alarm",
      "level": 1,
      "school": "Abjuration",
      "ritual": true,
      "concentration": false,
      "casting_time": "1 minute or Ritual",
      "action_type": null,
      "range": "30 feet",
      "components": "V, S, M (a bell and silver wire)",
      "duration": "8 hours",
      "description": "You set an alarm against intrusion. Choose a door,\n\n      a window, or an area within range that is no larger\n\n      than a 20-foot Cube. Until the spell ends, an alarm\n\n\nalerts you whenever a creature touches or enters\nthe warded area. When you cast the spell, you can\ndesignate creatures that won’t set off the alarm. You\nalso choose whether the alarm is audible or mental:\nAudible Alarm. The alarm produces the sound of\n a handbell for 10 seconds within 60 feet of the\n warded area.\nMental Alarm. You are alerted by a mental ping\n if you are within 1 mile of the warded area. This\n ping awakens you if you’re asleep.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": true
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a bell and silver wire",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 8,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Alter Self",
      "identity_key": "alter-self",
      "content_key": "2024:alter-self",
      "level": 2,
      "school": "Transmutation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S",
      "duration": "Concentration, up to 1 hour",
      "description": "You alter your physical form. Choose one of the\nfollowing options. Its effects last for the duration,\n\nduring which you can take a Magic action to replace\n\nthe option you chose with a different one.\n   Aquatic Adaptation. You sprout gills and grow\nwebs between your fingers. You can breathe underwater and gain a Swim Speed equal to your Speed.\n   Change Appearance. You alter your appearance. You decide what you look like, including your\nheight, weight, facial features, sound of your voice,\nhair length, coloration, and other distinguishing\ncharacteristics. You can make yourself appear as\na member of another species, though none of your\nstatistics change. You can’t appear as a creature of a\ndifferent size, and your basic shape stays the same;\nif you’re bipedal, you can’t use this spell to become\nquadrupedal, for instance. For the duration, you can\ntake a Magic action to change your appearance in\nthis way again.\n   Natural Weapons. You grow claws (Slashing),\nfangs (Piercing), horns (Piercing), or hooves (Bludgeoning). When you use your Unarmed Strike to\ndeal damage with that new growth, it deals 1d6\ndamage of the type in parentheses instead of dealing the normal damage for your Unarmed Strike,\n\nand you use your spellcasting ability modifier\n\nfor the attack and damage rolls rather than using\n\nStrength.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Animal Friendship",
      "identity_key": "animal-friendship",
      "content_key": "2024:animal-friendship",
      "level": 1,
      "school": "Enchantment",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S, M (a morsel of food)",
      "duration": "24 hours",
      "description": "Target a Beast that you can see within range. The\n\ntarget must succeed on a Wisdom saving throw or\n\nhave the Charmed condition for the duration. If you\n\n\n      or one of your allies deals damage to the target, the\n      spells ends.\n        Using a Higher-Level Spell Slot. You can target\n      one additional Beast for each spell slot level above 1.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a morsel of food",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 24,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Animal Messenger",
      "identity_key": "animal-messenger",
      "content_key": "2024:animal-messenger",
      "level": 2,
      "school": "Enchantment",
      "ritual": true,
      "concentration": false,
      "casting_time": "Action or Ritual",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S, M (a morsel of food)",
      "duration": "24 hours",
      "description": "A Tiny Beast of your choice that you can see within\n      range must succeed on a Charisma saving throw,\n      or it attempts to deliver a message for you (if the\n      target’s Challenge Rating isn’t 0, it automatically\n      succeeds). You specify a location you have visited\n      and a recipient who matches a general description, such as “a person dressed in the uniform of\n      the town guard” or “a red-haired dwarf wearing a\n      pointed hat.” You also communicate a message of\n      up to twenty-five words. The Beast travels for the\n      duration toward the specified location, covering\n      about 25 miles per 24 hours or 50 miles if the Beast\n      can fly.\n        When the Beast arrives, it delivers your message\n      to the creature that you described, mimicking your\n      communication. If the Beast doesn’t reach its destination before the spell ends, the message is lost, and\n      the Beast returns to where you cast the spell.\n        Using a Higher-Level Spell Slot. The spell’s duration increases by 48 hours for each spell slot level\n      above 2.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": true
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a morsel of food",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 24,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Animal Shapes",
      "identity_key": "animal-shapes",
      "content_key": "2024:animal-shapes",
      "level": 8,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S",
      "duration": "24 hours",
      "description": "Choose any number of willing creatures that you\n      can see within range. Each target shape-shifts into\n      a Large or smaller Beast of your choice that has a\n      Challenge Rating of 4 or lower. You can choose a different form for each target. On later turns, you can\n      take a Magic action to transform the targets again.\n        A target’s game statistics are replaced by the\n\n      chosen Beast’s statistics, but the target retains its\n\n      creature type; Hit Points; Hit Point Dice; alignment;\n\n      ability to communicate; and Intelligence, Wisdom,\n\n      and Charisma scores. The target’s actions are limited by the Beast form’s anatomy, and it can’t cast\n      spells. The target’s equipment melds into the new\n      form, and the target can’t use any of that equipment\n      while in that form.\n        The target gains a number of Temporary Hit\n      Points equal to the Hit Points of the first form into\n\n\nwhich it shape-shifts. These Temporary Hit Points\nvanish if any remain when the spell ends. The transformation lasts for the duration or until the target\nends it as a Bonus Action.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 24,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Animate Dead",
      "identity_key": "animate-dead",
      "content_key": "2024:animate-dead",
      "level": 3,
      "school": "Necromancy",
      "ritual": false,
      "concentration": false,
      "casting_time": "1 minute",
      "action_type": null,
      "range": "10 feet",
      "components": "V, S, M (a drop of blood, a piece of flesh, and a pinch of bone dust)",
      "duration": "Instantaneous",
      "description": "Choose a pile of bones or a corpse of a Medium or\nSmall Humanoid within range. The target becomes\nan Undead creature: a Skeleton if you chose bones\nor a Zombie if you chose a corpse (see “Monsters”\nfor the stat blocks).\n  On each of your turns, you can take a Bonus Action to mentally command any creature you made\nwith this spell if the creature is within 60 feet of\nyou (if you control multiple creatures, you can\ncommand any of them at the same time, issuing the\nsame command to each one). You decide what action\nthe creature will take and where it will move on\nits next turn, or you can issue a general command,\nsuch as to guard a chamber or corridor. If you issue\nno commands, the creature takes the Dodge action\nand moves only to avoid harm. Once given an order,\nthe creature continues to follow it until its task is\ncomplete.\n  The creature is under your control for 24 hours,\nafter which it stops obeying any command you’ve\ngiven it. To maintain control of the creature for another 24 hours, you must cast this spell on the creature again before the current 24-hour period ends.\nThis use of the spell reasserts your control over up\nto four creatures you have animated with this spell\nrather than animating a new creature.\n  Using a Higher-Level Spell Slot. You animate or\nreassert control over two additional Undead creatures for each spell slot level above 3. Each of the\ncreatures must come from a different corpse or pile\nof bones.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 10,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a drop of blood, a piece of flesh, and a pinch of bone dust",
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Animate Objects",
      "identity_key": "animate-objects",
      "content_key": "2024:animate-objects",
      "level": 5,
      "school": "Transmutation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "V, S",
      "duration": "Concentration, up to 1 minute",
      "description": "Objects animate at your command. Choose a number of nonmagical objects within range that aren’t\nbeing worn or carried, aren’t fixed to a surface, and\naren’t Gargantuan. The maximum number of objects\nis equal to your spellcasting ability modifier; for\nthis number, a Medium or smaller target counts as\n\n\n      one object, a Large target counts as two, and a Huge\n      target counts as three.\n        Each target animates, sprouts legs, and becomes\n      a Construct that uses the Animated Object stat\n      block; this creature is under your control until the\n      spell ends or until it is reduced to 0 Hit Points. Each\n      creature you make with this spell is an ally to you\n      and your allies. In combat, it shares your Initiative\n      count and takes its turn immediately after yours.\n        Until the spell ends, you can take a Bonus Action\n      to mentally command any creature you made with\n      this spell if the creature is within 500 feet of you (if\n      you control multiple creatures, you can command\n      any of them at the same time, issuing the same\n      command to each one). If you issue no commands,\n      the creature takes the Dodge action and moves only\n      to avoid harm. When the creature drops to 0 Hit\n      Points, it reverts to its object form, and any remaining damage carries over to that form.\n        Using a Higher-Level Spell Slot. The creature’s\n      Slam damage increases by 1d4 (Medium or smaller),\n      1d6 (Large), or 1d12 (Huge) for each spell slot level\n      above 5.\n\n      Animated Object\n      Huge or Smaller Construct, Unaligned\n      AC 15\n      HP 10 (Medium or smaller), 20 (Large), 40 (Huge)\n      Speed 30 ft.\n                MOD SAVE           MOD SAVE              MOD SAVE\n\n      Str 16 +3 +3         Dex 10 +0 +0       Con 10 +0 +0\n\n      Int 3 −4 −4          Wis 3 −4 −4        Cha 1 −5 −5\n      Immunities Poison, Psychic; Charmed, Exhaustion,\n        Frightened, Paralyzed, Poisoned\n      Senses Blindsight 30 ft.; Passive Perception 6\n      Languages Understands the languages you know\n      CR None (XP 0; PB equals your Proficiency Bonus)\n\n      Actions\n\n      Slam. Melee Attack Roll: Bonus equals your spell attack\n      modifier, reach 5 ft. Hit: Force damage equal to 1d4\n      + 3 (Medium or smaller), 2d6 + 3 + your spellcasting\n      ability modifier (Large), or 2d12 + 3 + your spellcasting\n      ability modifier (Huge).",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Antilife Shell",
      "identity_key": "antilife-shell",
      "content_key": "2024:antilife-shell",
      "level": 5,
      "school": "Abjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S",
      "duration": "Concentration, up to 1 hour",
      "description": "An aura extends from you in a 10-foot Emanation\n      for the duration. The aura prevents creatures other\n      than Constructs and Undead from passing or reaching through it. An affected creature can cast spells\n\n\nor make attacks with Ranged or Reach weapons\nthrough the barrier.\n  If you move so that an affected creature is forced\nto pass through the barrier, the spell ends.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Antimagic Field",
      "identity_key": "antimagic-field",
      "content_key": "2024:antimagic-field",
      "level": 8,
      "school": "Abjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S, M (iron filings)",
      "duration": "Concentration, up to 1 hour",
      "description": "An aura of antimagic surrounds you in 10-foot Emanation. No one can cast spells, take Magic actions,\nor create other magical effects inside the aura, and\nthose things can’t target or otherwise affect anything inside it. Magical properties of magic items\ndon’t work inside the aura or on anything inside it.\n  Areas of effect created by spells or other magic\ncan’t extend into the aura, and no one can teleport\ninto or out of it or use planar travel there. Portals\nclose temporarily while in the aura.\n  Ongoing spells, except those cast by an Artifact or\na deity, are suppressed in the area. While an effect\nis suppressed, it doesn’t function, but the time it\nspends suppressed counts against its duration.\n  Dispel Magic has no effect on the aura, and the auras created by different Antimagic Field spells don’t\nnullify each other.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "iron filings",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Antipathy/Sympathy",
      "identity_key": "antipathy-sympathy",
      "content_key": "2024:antipathy-sympathy",
      "level": 8,
      "school": "Enchantment",
      "ritual": false,
      "concentration": false,
      "casting_time": "1 hour",
      "action_type": null,
      "range": "60 feet",
      "components": "V, S, M (a mix of vinegar and honey)",
      "duration": "10 days",
      "description": "As you cast the spell, choose whether it creates\nantipathy or sympathy, and target one creature or\nobject that is Huge or smaller. Then specify a kind of\ncreature, such as red dragons, goblins, or vampires.\n\nA creature of the chosen kind makes a Wisdom\nsaving throw when it comes within 120 feet of the\ntarget. Your choice of antipathy or sympathy determines what happens to a creature when it fails that\nsave:\n\nAntipathy. The creature has the Frightened condition. The Frightened creature must use its movement on its turns to get as far away as possible\n from the target, moving by the safest route.\nSympathy. The creature has the Charmed condition. The Charmed creature must use its movement on its turns to get as close as possible to the\n target, moving by the safest route. If the creature\n is within 5 feet of the target, the creature can’t\n willingly move away. If the target damages the\n Charmed creature, that creature can make a\n\n\n       Wisdom saving throw to end the effect, as described below.\n\n        Ending the Effect. If the Frightened or Charmed\n\n      creature ends its turn more than 120 feet away\n\n      from the target, the creature makes a Wisdom saving throw. On a successful save, the creature is no\n\n      longer affected by the target. A creature that successfully saves against this effect is immune to it for\n\n      1 minute, after which it can be affected again.",
      "casting_time_value": {
        "options": [
          {
            "unit": "hour",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a mix of vinegar and honey",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "day",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Arcane Eye",
      "identity_key": "arcane-eye",
      "content_key": "2024:arcane-eye",
      "level": 4,
      "school": "Divination",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S, M (a bit of bat fur)",
      "duration": "Concentration, up to 1 hour",
      "description": "You create an Invisible, invulnerable eye within\n      range that hovers for the duration. You mentally\n      receive visual information from the eye, which can\n      see in every direction. It also has Darkvision with a\n      range of 30 feet.\n\n        As a Bonus Action, you can move the eye up to 30\n\n      feet in any direction. A solid barrier blocks the eye’s\n\n      movement, but the eye can pass through an opening\n\n      as small as 1 inch in diameter.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a bit of bat fur",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Arcane Hand",
      "identity_key": "arcane-hand",
      "content_key": "2024:arcane-hand",
      "level": 5,
      "school": "Evocation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "V, S, M (an eggshell and a glove)",
      "duration": "Concentration, up to 1 minute",
      "description": "You create a Large hand of shimmering magical energy in an unoccupied space that you can see within\n      range. The hand lasts for the duration, and it moves\n      at your command, mimicking the movements of\n\n      your own hand.\n\n        The hand is an object that has AC 20 and Hit\n\n      Points equal to your Hit Point maximum. If it drops\n\n      to 0 Hit Points, the spell ends. The hand doesn’t occupy its space.\n        When you cast the spell and as a Bonus Action on\n      your later turns, you can move the hand up to 60\n      feet and then cause one of the following effects:\n\n      Clenched Fist. The hand strikes a target within 5\n\n        feet of it. Make a melee spell attack. On a hit, the\n\n        target takes 5d8 Force damage.\n\n      Forceful Hand. The hand attempts to push a Huge\n\n        or smaller creature within 5 feet of it. The target\n\n        must succeed on a Strength saving throw, or the\n\n        hand pushes the target up to 5 feet plus a number\n        of feet equal to five times your spellcasting ability\n        modifier. The hand moves with the target, remaining within 5 feet of it.\n\n\nGrasping Hand. The hand attempts to grapple a\n  Huge or smaller creature within 5 feet of it. The\n  target must succeed on a Dexterity saving throw,\n\n  or the target has the Grappled condition, with an\n\n  escape DC equal to your spell save DC. While the\n\n  hand grapples the target, you can take a Bonus\n\n  Action to cause the hand to crush it, dealing Bludgeoning damage to the target equal to 4d6 plus\n\n  your spellcasting ability modifier.\n\nInterposing Hand. The hand grants you Half Cover\n  against attacks and other effects that originate\n  from its space or that pass through it. In addition, its space counts as Difficult Terrain for your\n  enemies.\n  Using a Higher-Level Spell Slot. The damage of\nthe Clenched Fist increases by 2d8 and the damage\nof the Grasping Hand increases by 2d6 for each spell\nslot level above 5.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "an eggshell and a glove",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Arcane Lock",
      "identity_key": "arcane-lock",
      "content_key": "2024:arcane-lock",
      "level": 2,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S, M (gold dust worth 25+ GP, which the spell consumes)",
      "duration": "Until dispelled",
      "description": "You touch a closed door, window, gate, container,\nor hatch and magically lock it for the duration. This\nlock can’t be unlocked by any nonmagical means.\nYou and any creatures you designate when you cast\nthe spell can open and close the object despite the\nlock. You can also set a password that, when spoken\nwithin 5 feet of the object, unlocks it for 1 minute.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "gold dust worth 25+ GP, which the spell consumes",
        "cost": {
          "copper": 2500,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "until_dispelled",
        "or_triggered": false
      }
    },
    {
      "name": "Arcane Sword",
      "identity_key": "arcane-sword",
      "content_key": "2024:arcane-sword",
      "level": 7,
      "school": "Evocation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "90 feet",
      "components": "V, S, M (a miniature sword worth 250+ GP)",
      "duration": "Concentration, up to 1 minute",
      "description": "You create a spectral sword that hovers within\nrange. It lasts for the duration.\n  When the sword appears, you make a melee spell\nattack against a target within 5 feet of the sword.\n\nOn a hit, the target takes Force damage equal to\n\n4d12 plus your spellcasting ability modifier.\n\n  On your later turns, you can take a Bonus Action\n\nto move the sword up to 30 feet to a spot you can\n\nsee and repeat the attack against the same target or\n\na different one.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 90,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a miniature sword worth 250+ GP",
        "cost": {
          "copper": 25000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Arcanist’s Magic Aura",
      "identity_key": "arcanist-s-magic-aura",
      "content_key": "2024:arcanist-s-magic-aura",
      "level": 2,
      "school": "Illusion",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S, M (a small square of silk)",
      "duration": "24 hours",
      "description": "With a touch, you place an illusion on a willing creature or an object that isn’t being worn or carried. A\n      creature gains the Mask effect below, and an object\n      gains the False Aura effect below. The effect lasts\n\n      for the duration. If you cast the spell on the same\n\n      target every day for 30 days, the illusion lasts until\n      dispelled.\n        Mask (Creature). Choose a creature type other\n      than the target’s actual type. Spells and other magical effects treat the target as if it were a creature of\n      the chosen type.\n        False Aura (Object). You change the way the target appears to spells and magical effects that detect\n      magical auras, such as Detect Magic. You can make\n      a nonmagical object appear magical, make a magic\n      item appear nonmagical, or change the object’s aura\n      so that it appears to belong to a school of magic you\n      choose.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a small square of silk",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 24,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Astral Projection",
      "identity_key": "astral-projection",
      "content_key": "2024:astral-projection",
      "level": 9,
      "school": "Necromancy",
      "ritual": false,
      "concentration": false,
      "casting_time": "1 hour",
      "action_type": null,
      "range": "10 feet",
      "components": "V, S, M (for each of the spell’s targets, one jacinth worth 1,000+ GP and one silver bar worth 100+ GP, all of which the spell consumes)",
      "duration": "Until dispelled",
      "description": "You and up to eight willing creatures within range\n      project your astral bodies into the Astral Plane\n      (the spell ends instantly if you are already on that\n      plane). Each target’s body is left behind in a state of\n      suspended animation; it has the Unconscious condition, doesn’t need food or air, and doesn’t age.\n        A target’s astral form resembles its body in almost\n      every way, replicating its game statistics and possessions. The principal difference is the addition of\n      a silvery cord that trails from between the shoulder\n      blades of the astral form. The cord fades from view\n      after 1 foot. If the cord is cut—which happens only\n      when an effect states that it does so—the target’s\n      body and astral form both die.\n        A target’s astral form can travel through the Astral Plane. The moment an astral form leaves that\n      plane, the target’s body and possessions travel\n      along the silver cord, causing the target to re-enter\n\n      its body on the new plane.\n\n        Any damage or other effects that apply to an astral form have no effect on the target’s body and\n\n      vice versa. If a target’s body or astral form drops to\n      0 Hit Points, the spell ends for that target. The spell\n      ends for all the targets if you take a Magic action to\n      dismiss it.\n\n\n  When the spell ends for a target who isn’t dead,\nthe target reappears in its body and exits the state\nof suspended animation.",
      "casting_time_value": {
        "options": [
          {
            "unit": "hour",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 10,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "for each of the spell’s targets, one jacinth worth 1,000+ GP and one silver bar worth 100+ GP, all of which the spell consumes",
        "cost": {
          "copper": 100000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "until_dispelled",
        "or_triggered": false
      }
    },
    {
      "name": "Augury",
      "identity_key": "augury",
      "content_key": "2024:augury",
      "level": 2,
      "school": "Divination",
      "ritual": true,
      "concentration": false,
      "casting_time": "1 minute or Ritual",
      "action_type": null,
      "range": "Self",
      "components": "V, S, M (specially marked sticks, bones, cards, or other divinatory tokens worth 25+ GP)",
      "duration": "Instantaneous",
      "description": "You receive an omen from an otherworldly entity\nabout the results of a course of action that you plan\nto take within the next 30 minutes. The GM chooses\nthe omen from the Omens table.\n\nOmens\n Omen              For Results That Will Be …\nWeal              Good\n\nWoe               Bad\nWeal and woe      Good and bad\nIndifference      Neither good nor bad\n\nThe spell doesn’t account for circumstances, such as\nother spells, that might change the results.\n  If you cast the spell more than once before finishing a Long Rest, there is a cumulative 25 percent\nchance for each casting after the first that you get\nno answer.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": true
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "specially marked sticks, bones, cards, or other divinatory tokens worth 25+ GP",
        "cost": {
          "copper": 2500,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Aura of Life",
      "identity_key": "aura-of-life",
      "content_key": "2024:aura-of-life",
      "level": 4,
      "school": "Abjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V",
      "duration": "Concentration, up to 10 minutes",
      "description": "An aura radiates from you in a 30-foot Emanation\nfor the duration. While in the aura, you and your\nallies have Resistance to Necrotic damage, and your\nHit Point maximums can’t be reduced. If an ally with\n0 Hit Points starts its turn in the aura, that ally regains 1 Hit Point.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Awaken",
      "identity_key": "awaken",
      "content_key": "2024:awaken",
      "level": 5,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "8 hours",
      "action_type": null,
      "range": "Touch",
      "components": "V, S, M (an agate worth 1,000+ GP, which the spell consumes)",
      "duration": "Instantaneous",
      "description": "You spend the casting time tracing magical pathways within a precious gemstone, and then touch\nthe target. The target must be either a Beast or\nPlant creature with an Intelligence of 3 or less or a\nnatural plant that isn’t a creature. The target gains\n\n\n      an Intelligence of 10 and the ability to speak one\n      language you know. If the target is a natural plant,\n      it becomes a Plant creature and gains the ability to\n\n      move its limbs, roots, vines, creepers, and so forth,\n\n      and it gains senses similar to a human’s. The GM\n\n      chooses statistics appropriate for the awakened\n\n      Plant, such as the statistics for the Awakened\n      Shrub or Awakened Tree in “Monsters.”\n         The awakened target has the Charmed condition\n      for 30 days or until you or your allies deal damage\n      to it. When that condition ends, the awakened creature chooses its attitude toward you.",
      "casting_time_value": {
        "options": [
          {
            "unit": "hour",
            "amount": 8,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "an agate worth 1,000+ GP, which the spell consumes",
        "cost": {
          "copper": 100000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Bane",
      "identity_key": "bane",
      "content_key": "2024:bane",
      "level": 1,
      "school": "Enchantment",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S, M (a drop of blood)",
      "duration": "Concentration, up to 1 minute",
      "description": "Up to three creatures of your choice that you can\n      see within range must each make a Charisma saving\n      throw. Whenever a target that fails this save makes\n      an attack roll or a saving throw before the spell\n      ends, the target must subtract 1d4 from the attack\n      roll or save.\n        Using a Higher-Level Spell Slot. You can target\n      one additional creature for each spell slot level\n      above 1.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a drop of blood",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Banishment",
      "identity_key": "banishment",
      "content_key": "2024:banishment",
      "level": 4,
      "school": "Abjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S, M (a pentacle)",
      "duration": "Concentration, up to 1 minute",
      "description": "One creature that you can see within range must\n      succeed on a Charisma saving throw or be transported to a harmless demiplane for the duration.\n      While there, the target has the Incapacitated condition. When the spell ends, the target reappears in\n      the space it left or in the nearest unoccupied space\n      if that space is occupied.\n         If the target is an Aberration, a Celestial, an Elemental, a Fey, or a Fiend, the target doesn’t return\n      if the spell lasts for 1 minute. The target is instead\n      transported to a random location on a plane (GM’s\n      choice) associated with its creature type.\n         Using a Higher-Level Spell Slot. You can target\n      one additional creature for each spell slot level\n      above 4.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a pentacle",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Barkskin",
      "identity_key": "barkskin",
      "content_key": "2024:barkskin",
      "level": 2,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Bonus Action",
      "action_type": "Bonus Action",
      "range": "Touch",
      "components": "V, S, M (a handful of bark)",
      "duration": "1 hour",
      "description": "You touch a willing creature. Until the spell ends,\n\nthe target’s skin assumes a bark-like appearance,\n\nand the target has an Armor Class of 17 if its AC is\n\nlower than that.",
      "casting_time_value": {
        "options": [
          {
            "unit": "bonus_action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a handful of bark",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Beacon of Hope",
      "identity_key": "beacon-of-hope",
      "content_key": "2024:beacon-of-hope",
      "level": 3,
      "school": "Abjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S",
      "duration": "Concentration, up to 1 minute",
      "description": "Choose any number of creatures within range. For\nthe duration, each target has Advantage on Wisdom\nsaving throws and Death Saving Throws and regains the maximum number of Hit Points possible\nfrom any healing.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Befuddlement",
      "identity_key": "befuddlement",
      "content_key": "2024:befuddlement",
      "level": 8,
      "school": "Enchantment",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "150 feet",
      "components": "V, S, M (a key ring with no keys)",
      "duration": "Instantaneous",
      "description": "You blast the mind of a creature that you can see\nwithin range. The target makes an Intelligence saving throw.\n  On a failed save, the target takes 10d12 Psychic\ndamage and can’t cast spells or take the Magic action. At the end of every 30 days, the target repeats\nthe save, ending the effect on a success. The effect\ncan also be ended by the Greater Restoration, Heal,\nor Wish spell.\n  On a successful save, the target takes half as much\ndamage only.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 150,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a key ring with no keys",
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Bestow Curse",
      "identity_key": "bestow-curse",
      "content_key": "2024:bestow-curse",
      "level": 3,
      "school": "Necromancy",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S",
      "duration": "Concentration, up to 1 minute",
      "description": "You touch a creature, which must succeed on a Wisdom saving throw or become cursed for the duration. Until the curse ends, the target suffers one of\nthe following effects of your choice:\n• Choose one ability. The target has Disadvantage\n  on ability checks and saving throws made with\n  that ability.\n• The target has Disadvantage on attack rolls\n  against you.\n\n• In combat, the target must succeed on a Wisdom\n  saving throw at the start of each of its turns or be\n  forced to take the Dodge action on that turn.\n\n\n      • If you deal damage to the target with an attack\n        roll or a spell, the target takes an extra 1d8 Necrotic damage.\n\n        Using a Higher-Level Spell Slot. If you cast this\n      spell using a level 4 spell slot, you can maintain\n      Concentration on it for up to 10 minutes. If you use\n      a level 5+ spell slot, the spell doesn’t require Concentration, and the duration becomes 8 hours (level\n      5–6 slot) or 24 hours (level 7–8 slot). If you use a\n      level 9 spell slot, the spell lasts until dispelled.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Black Tentacles",
      "identity_key": "black-tentacles",
      "content_key": "2024:black-tentacles",
      "level": 4,
      "school": "Conjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "90 feet",
      "components": "V, S, M (a tentacle)",
      "duration": "Concentration, up to 1 minute",
      "description": "Squirming, ebony tentacles fill a 20-foot square on\n      ground that you can see within range. For the duration, these tentacles turn the ground in that area\n      into Difficult Terrain.\n         Each creature in that area makes a Strength saving throw. On a failed save, it takes 3d6 Bludgeoning\n      damage, and it has the Restrained condition until\n      the spell ends. A creature also makes that save if\n      it enters the area or ends it turn there. A creature\n      makes that save only once per turn.\n         A Restrained creature can take an action to make\n      a Strength (Athletics) check against your spell save\n      DC, ending the condition on itself on a success.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 90,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a tentacle",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Blade Barrier",
      "identity_key": "blade-barrier",
      "content_key": "2024:blade-barrier",
      "level": 6,
      "school": "Evocation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "90 feet",
      "components": "V, S",
      "duration": "Concentration, up to 10 minutes",
      "description": "You create a wall of whirling blades made of magical\n      energy. The wall appears within range and lasts for\n      the duration. You make a straight wall up to 100\n      feet long, 20 feet high, and 5 feet thick, or a ringed\n      wall up to 60 feet in diameter, 20 feet high, and 5\n      feet thick. The wall provides Three-Quarters Cover,\n      and its space is Difficult Terrain.\n        Any creature in the wall’s space makes a Dexterity saving throw, taking 6d10 Force damage on a\n      failed save or half as much damage on a successful\n      one. A creature also makes that save if it enters the\n      wall’s space or ends it turn there. A creature makes\n      that save only once per turn.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 90,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Bless",
      "identity_key": "bless",
      "content_key": "2024:bless",
      "level": 1,
      "school": "Enchantment",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S, M (a Holy Symbol worth 5+ GP)",
      "duration": "Concentration, up to 1 minute",
      "description": "You bless up to three creatures within range. Whenever a target makes an attack roll or a saving throw\nbefore the spell ends, the target adds 1d4 to the attack roll or save.\n  Using a Higher-Level Spell Slot. You can target\none additional creature for each spell slot level\nabove 1.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a Holy Symbol worth 5+ GP",
        "cost": {
          "copper": 500,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Blight",
      "identity_key": "blight",
      "content_key": "2024:blight",
      "level": 4,
      "school": "Necromancy",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "A creature that you can see within range makes\na Constitution saving throw, taking 8d8 Necrotic\ndamage on a failed save or half as much damage\non a successful one. A Plant creature automatically\nfails the save.\n  Alternatively, target a nonmagical plant that isn’t\na creature, such as a tree or shrub. It doesn’t make a\nsave; it simply withers and dies.\n  Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 4.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Blindness/Deafness",
      "identity_key": "blindness-deafness",
      "content_key": "2024:blindness-deafness",
      "level": 2,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "V",
      "duration": "1 minute",
      "description": "One creature that you can see within range must\n\nsucceed on a Constitution saving throw, or it has\n\nthe Blinded or Deafened condition (your choice)\nfor the duration. At the end of each of its turns, the\ntarget repeats the save, ending the spell on itself on\na success.\n  Using a Higher-Level Spell Slot. You can target\none additional creature for each spell slot level\nabove 2.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Blink",
      "identity_key": "blink",
      "content_key": "2024:blink",
      "level": 3,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S",
      "duration": "1 minute",
      "description": "Roll 1d6 at the end of each of your turns for the\nduration. On a roll of 4–6, you vanish from your current plane of existence and appear in the Ethereal\n\nPlane (the spell ends instantly if you are already on\n\nthat plane). While on the Ethereal Plane, you can\n\n\n      perceive the plane you left, which is cast in shades\n      of gray, but you can’t see anything there more than\n      60 feet away. You can affect and be affected only\n      by other creatures on the Ethereal Plane, and creatures on the other plane can’t perceive you unless\n      they have a special ability that lets them perceive\n      things on the Ethereal Plane.\n        You return to the other plane at the start of your\n      next turn and when the spell ends if you are on the\n      Ethereal Plane. You return to an unoccupied space\n      of your choice that you can see within 10 feet of the\n      space you left. If no unoccupied space is available\n      within that range, you appear in the nearest unoccupied space.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Blur",
      "identity_key": "blur",
      "content_key": "2024:blur",
      "level": 2,
      "school": "Illusion",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V",
      "duration": "Concentration, up to 1 minute",
      "description": "Your body becomes blurred. For the duration, any\n\n      creature has Disadvantage on attack rolls against\n\n      you. An attacker is immune to this effect if it perceives you with Blindsight or Truesight.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Burning Hands",
      "identity_key": "burning-hands",
      "content_key": "2024:burning-hands",
      "level": 1,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "A thin sheet of flames shoots forth from you. Each\n      creature in a 15-foot Cone makes a Dexterity saving\n      throw, taking 3d6 Fire damage on a failed save or\n      half as much damage on a successful one.\n        Flammable objects in the Cone that aren’t being\n\n      worn or carried start burning.\n\n        Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 1.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Call Lightning",
      "identity_key": "call-lightning",
      "content_key": "2024:call-lightning",
      "level": 3,
      "school": "Conjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "V, S",
      "duration": "Concentration, up to 10 minutes",
      "description": "A storm cloud appears at a point within range that\n      you can see above yourself. It takes the shape of a\n      Cylinder that is 10 feet tall with a 60-foot radius.\n        When you cast the spell, choose a point you can\n      see under the cloud. A lightning bolt shoots from the\n      cloud to that point. Each creature within 5 feet of\n      that point makes a Dexterity saving throw, taking\n      3d10 Lightning damage on a failed save or half as\n      much damage on a successful one.\n\n\n  Until the spell ends, you can take a Magic action to\ncall down lightning in that way again, targeting the\nsame point or a different one.\n  If you’re outdoors in a storm when you cast this\nspell, the spell gives you control over that storm instead of creating a new one. Under such conditions,\nthe spell’s damage increases by 1d10.\n  Using a Higher-Level Spell Slot. The damage increases by 1d10 for each spell slot level above 3.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Calm Emotions",
      "identity_key": "calm-emotions",
      "content_key": "2024:calm-emotions",
      "level": 2,
      "school": "Enchantment",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S",
      "duration": "Concentration, up to 1 minute",
      "description": "Each Humanoid in a 20-foot-radius Sphere centered\n\non a point you choose within range must succeed\n\non a Charisma saving throw or be affected by one of\n\nthe following effects (choose for each creature):\n\n• The creature has Immunity to the Charmed and\n\n  Frightened conditions until the spell ends. If the\n\n  creature was already Charmed or Frightened,\n\n  those conditions are suppressed for the duration.\n\n• The creature becomes Indifferent about creatures of your choice that it’s Hostile toward. This\n  indifference ends if the target takes damage or\n  witnesses its allies taking damage. When the spell\n\n  ends, the creature’s attitude returns to normal.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Chain Lightning",
      "identity_key": "chain-lightning",
      "content_key": "2024:chain-lightning",
      "level": 6,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "150 feet",
      "components": "V, S, M (three silver pins)",
      "duration": "Instantaneous",
      "description": "You launch a lightning bolt toward a target you can\n\nsee within range. Three bolts then leap from that\n\ntarget to as many as three other targets of your\n\nchoice, each of which must be within 30 feet of the\nfirst target. A target can be a creature or an object\nand can be targeted by only one of the bolts.\n  Each target makes a Dexterity saving throw, taking 10d8 Lightning damage on a failed save or half\n\n\nas much damage on a successful one.\n  Using a Higher-Level Spell Slot. One additional\nbolt leaps from the first target to another target for\neach spell slot level above 6.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 150,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "three silver pins",
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Charm Monster",
      "identity_key": "charm-monster",
      "content_key": "2024:charm-monster",
      "level": 4,
      "school": "Enchantment",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S",
      "duration": "1 hour",
      "description": "One creature you can see within range makes a\n      Wisdom saving throw. It does so with Advantage\n      if you or your allies are fighting it. On a failed save,\n      the target has the Charmed condition until the\n      spell ends or until you or your allies damage it. The\n      Charmed creature is Friendly to you. When the spell\n      ends, the target knows it was Charmed by you.\n         Using a Higher-Level Spell Slot. You can target\n      one additional creature for each spell slot level\n      above 4.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Charm Person",
      "identity_key": "charm-person",
      "content_key": "2024:charm-person",
      "level": 1,
      "school": "Enchantment",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S",
      "duration": "1 hour",
      "description": "One Humanoid you can see within range makes a\n      Wisdom saving throw. It does so with Advantage\n      if you or your allies are fighting it. On a failed save,\n      the target has the Charmed condition until the\n      spell ends or until you or your allies damage it. The\n      Charmed creature is Friendly to you. When the spell\n      ends, the target knows it was Charmed by you.\n         Using a Higher-Level Spell Slot. You can target\n\n      one additional creature for each spell slot level\n      above 1.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Chill Touch",
      "identity_key": "chill-touch",
      "content_key": "2024:chill-touch",
      "level": 0,
      "school": "Necromancy",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "Channeling the chill of the grave, make a melee spell\n      attack against a target within reach. On a hit, the\n      target takes 1d10 Necrotic damage, and it can’t regain Hit Points until the end of your next turn.\n        Cantrip Upgrade. The damage increases by 1d10\n      when you reach levels 5 (2d10), 11 (3d10), and 17\n      (4d10).",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Chromatic Orb",
      "identity_key": "chromatic-orb",
      "content_key": "2024:chromatic-orb",
      "level": 1,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "90 feet",
      "components": "V, S, M (a diamond worth 50+ GP)",
      "duration": "Instantaneous",
      "description": "You hurl an orb of energy at a target within range.\n      Choose Acid, Cold, Fire, Lightning, Poison, or Thunder for the type of orb you create, and then make a\n      ranged spell attack against the target. On a hit, the\n      target takes 3d8 damage of the chosen type.\n        If you roll the same number on two or more of\n      the d8s, the orb leaps to a different target of your\n\n\nchoice within 30 feet of the target. Make an attack\nroll against the new target, and make a new damage\nroll. The orb can’t leap again unless you cast the\nspell with a level 2+ spell slot.\n  Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 1. The\norb can leap a maximum number of times equal to\nthe level of the slot expended, and a creature can be\ntargeted only once by each casting of this spell.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 90,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a diamond worth 50+ GP",
        "cost": {
          "copper": 5000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Circle of Death",
      "identity_key": "circle-of-death",
      "content_key": "2024:circle-of-death",
      "level": 6,
      "school": "Necromancy",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "150 feet",
      "components": "V, S, M (the powder of a crushed black pearl worth 500+ GP)",
      "duration": "Instantaneous",
      "description": "Negative energy ripples out in a 60-foot-radius\nSphere from a point you choose within range. Each\ncreature in that area makes a Constitution saving\nthrow, taking 8d8 Necrotic damage on a failed save\nor half as much damage on a successful one.\n  Using a Higher-Level Spell Slot. The damage increases by 2d8 for each spell slot level above 6.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 150,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "the powder of a crushed black pearl worth 500+ GP",
        "cost": {
          "copper": 50000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Clairvoyance",
      "identity_key": "clairvoyance",
      "content_key": "2024:clairvoyance",
      "level": 3,
      "school": "Divination",
      "ritual": false,
      "concentration": true,
      "casting_time": "10 minutes",
      "action_type": null,
      "range": "1 mile",
      "components": "V, S, M (a focus worth 100+ GP, either a jeweled horn for hearing or a glass eye for seeing)",
      "duration": "Concentration, up to 10 minutes",
      "description": "You create an Invisible sensor within range in a\nlocation familiar to you (a place you have visited\nor seen before) or in an obvious location that is\nunfamiliar to you (such as behind a door, around a\ncorner, or in a grove of trees). The intangible, invulnerable sensor remains in place for the duration.\n   When you cast the spell, choose seeing or hearing.\nYou can use the chosen sense through the sensor as\nif you were in its space. As a Bonus Action, you can\nswitch between seeing and hearing.\n   A creature that sees the sensor (such as a creature\nbenefiting from See Invisibility or Truesight) sees a\nluminous orb about the size of your fist.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 10,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 5280,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a focus worth 100+ GP, either a jeweled horn for hearing or a glass eye for seeing",
        "cost": {
          "copper": 10000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Clone",
      "identity_key": "clone",
      "content_key": "2024:clone",
      "level": 8,
      "school": "Necromancy",
      "ritual": false,
      "concentration": false,
      "casting_time": "1 hour",
      "action_type": null,
      "range": "Touch",
      "components": "V, S, M (a diamond worth 1,000+ GP, which the spell consumes, and a sealable vessel worth 2,000+ GP that is large enough to hold the creature being cloned)",
      "duration": "Instantaneous",
      "description": "You touch a creature or at least 1 cubic inch of its\n      flesh. An inert duplicate of that creature forms\n      inside the vessel used in the spell’s casting and finishes growing after 120 days; you choose whether\n\n      the finished clone is the same age as the creature or\n\n      younger. The clone remains inert and endures indefinitely while its vessel remains undisturbed.\n        If the original creature dies after the clone finishes forming, the creature’s soul transfers to the\n      clone if the soul is free and willing to return. The\n      clone is physically identical to the original and has\n      the same personality, memories, and abilities, but\n      none of the original’s equipment. The creature’s\n      original remains, if any, become inert and can’t be\n      revived, since the creature’s soul is elsewhere.",
      "casting_time_value": {
        "options": [
          {
            "unit": "hour",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a diamond worth 1,000+ GP, which the spell consumes, and a sealable vessel worth 2,000+ GP that is large enough to hold the creature being cloned",
        "cost": {
          "copper": 100000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Cloudkill",
      "identity_key": "cloudkill",
      "content_key": "2024:cloudkill",
      "level": 5,
      "school": "Conjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "V, S",
      "duration": "Concentration, up to 10 minutes",
      "description": "You create a 20-foot-radius Sphere of yellow-green\n      fog centered on a point within range. The fog lasts\n      for the duration or until strong wind (such as the\n      one created by Gust of Wind) disperses it, ending the\n      spell. Its area is Heavily Obscured.\n        Each creature in the Sphere makes a Constitution\n      saving throw, taking 5d8 Poison damage on a failed\n      save or half as much damage on a successful one. A\n      creature must also make this save when the Sphere\n      moves into its space and when it enters the Sphere\n      or ends its turn there. A creature makes this save\n      only once per turn.\n        The Sphere moves 10 feet away from you at the\n      start of each of your turns.\n        Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 5.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Color Spray",
      "identity_key": "color-spray",
      "content_key": "2024:color-spray",
      "level": 1,
      "school": "Illusion",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S, M (a pinch of colorful sand)",
      "duration": "Instantaneous",
      "description": "You launch a dazzling array of flashing, colorful\n      light. Each creature in a 15-foot Cone originating\n      from you must succeed on a Constitution saving\n      throw or have the Blinded condition until the end of\n      your next turn.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a pinch of colorful sand",
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Command",
      "identity_key": "command",
      "content_key": "2024:command",
      "level": 1,
      "school": "Enchantment",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V",
      "duration": "Instantaneous",
      "description": "You speak a one-word command to a creature you\n\ncan see within range. The target must succeed on a\n\nWisdom saving throw or follow the command on its\n\nnext turn. Choose the command from these options:\n\nApproach. The target moves toward you by the\n  shortest and most direct route, ending its turn if it\n  moves within 5 feet of you.\nDrop. The target drops whatever it is holding and\n  then ends its turn.\nFlee. The target spends its turn moving away from\n  you by the fastest available means.\nGrovel. The target has the Prone condition and then\n  ends its turn.\nHalt. On its turn, the target doesn’t move and takes\n  no action or Bonus Action.\n\n  Using a Higher-Level Spell Slot. You can affect\n\none additional creature for each spell slot level\n\nabove 1.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Commune",
      "identity_key": "commune",
      "content_key": "2024:commune",
      "level": 5,
      "school": "Divination",
      "ritual": true,
      "concentration": false,
      "casting_time": "1 minute or Ritual",
      "action_type": null,
      "range": "Self",
      "components": "V, S, M (incense)",
      "duration": "1 minute",
      "description": "You contact a deity or a divine proxy and ask up\nto three questions that can be answered with yes\nor no. You must ask your questions before the\nspell ends. You receive a correct answer for each\nquestion.\n  Divine beings aren’t necessarily omniscient, so\nyou might receive “unclear” as an answer if a question pertains to information that lies beyond the deity’s knowledge. In a case where a one-word answer\ncould be misleading or contrary to the deity’s interests, the GM might offer a short phrase as an answer\ninstead.\n  If you cast the spell more than once before finishing a Long Rest, there is a cumulative 25 percent\n\nchance for each casting after the first that you get\n\nno answer.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": true
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "incense",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Commune with Nature",
      "identity_key": "commune-with-nature",
      "content_key": "2024:commune-with-nature",
      "level": 5,
      "school": "Divination",
      "ritual": true,
      "concentration": false,
      "casting_time": "1 minute or Ritual",
      "action_type": null,
      "range": "Self",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "You commune with nature spirits and gain knowledge of the surrounding area. In the outdoors, the\n\nspell gives you knowledge of the area within 3 miles\n\nof you. In caves and other natural underground\nsettings, the radius is limited to 300 feet. The spell\n\n\n      doesn’t function where nature has been replaced by\n      construction, such as in castles and settlements.\n        Choose three of the following facts; you learn\n      those facts as they pertain to the spell’s area:\n\n      • Locations of settlements\n\n      • Locations of portals to other planes of existence\n      • Location of one Challenge Rating 10+ creature\n        (GM’s choice) that is a Celestial, an Elemental, a\n        Fey, a Fiend, or an Undead\n\n      • The most prevalent kind of plant, mineral, or\n\n        Beast (you choose which to learn)\n      • Locations of bodies of water\n      For example, you could determine the location of a\n\n      powerful monster in the area, the locations of bodies of water, and the locations of any towns.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": true
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Comprehend Languages",
      "identity_key": "comprehend-languages",
      "content_key": "2024:comprehend-languages",
      "level": 1,
      "school": "Divination",
      "ritual": true,
      "concentration": false,
      "casting_time": "Action or Ritual",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S, M (a pinch of soot and salt)",
      "duration": "1 hour",
      "description": "For the duration, you understand the literal meaning of any language that you hear or see signed. You\n      also understand any written language that you see,\n      but you must be touching the surface on which the\n      words are written. It takes about 1 minute to read\n      one page of text. This spell doesn’t decode symbols\n      or secret messages.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": true
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a pinch of soot and salt",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Compulsion",
      "identity_key": "compulsion",
      "content_key": "2024:compulsion",
      "level": 4,
      "school": "Enchantment",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S",
      "duration": "Concentration, up to 1 minute",
      "description": "Each creature of your choice that you can see within\n      range must succeed on a Wisdom saving throw or\n      have the Charmed condition until the spell ends.\n        For the duration, you can take a Bonus Action to\n      designate a direction that is horizontal to you. Each\n      Charmed target must use as much of its movement\n      as possible to move in that direction on its next\n      turn, taking the safest route. After moving in this\n      way, a target repeats the save, ending the spell on\n      itself on a success.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Cone of Cold",
      "identity_key": "cone-of-cold",
      "content_key": "2024:cone-of-cold",
      "level": 5,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S, M (a small crystal or glass cone)",
      "duration": "Instantaneous",
      "description": "You unleash a blast of cold air. Each creature in\n      a 60-foot Cone originating from you makes a\n\n\nConstitution saving throw, taking 8d8 Cold damage\non a failed save or half as much damage on a successful one. A creature killed by this spell becomes\na frozen statue until it thaws.\n  Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 5.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a small crystal or glass cone",
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Confusion",
      "identity_key": "confusion",
      "content_key": "2024:confusion",
      "level": 4,
      "school": "Enchantment",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "90 feet",
      "components": "V, S, M (three nut shells)",
      "duration": "Concentration, up to 1 minute",
      "description": "Each creature in a 10-foot-radius Sphere centered\n\non a point you choose within range must succeed on\n\na Wisdom saving throw, or that target can’t take Bonus Actions or Reactions and must roll 1d10 at the\nstart of each of its turns to determine its behavior\nfor that turn, consulting the table below.\n\n 1d10 Behavior for the Turn\n  1    The target doesn’t take an action, and it uses all\n       its movement to move. Roll 1d4 for the direction: 1, north; 2, east; 3, south; or 4, west.\n 2–6   The target doesn’t move or take actions.\n 7–8   The target doesn’t move, and it takes the Attack action to make one melee attack against\n       a random creature within reach. If none are\n       within reach, the target takes no action.\n\n 9–10 The target chooses its behavior.\n\n  At the end of each of its turns, an affected target\nrepeats the save, ending the spell on itself on a\nsuccess.\n\n  Using a Higher-Level Spell Slot. The Sphere’s\n\nradius increases by 5 feet for each spell slot level\n\nabove 4.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 90,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "three nut shells",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Conjure Animals",
      "identity_key": "conjure-animals",
      "content_key": "2024:conjure-animals",
      "level": 3,
      "school": "Conjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S",
      "duration": "Concentration, up to 10 minutes",
      "description": "You conjure nature spirits that appear as a Large\npack of spectral, intangible animals in an unoccupied space you can see within range. The pack lasts\nfor the duration, and you choose the spirits’ animal\nform, such as wolves, serpents, or birds.\n  You have Advantage on Strength saving throws\nwhile you’re within 5 feet of the pack, and when you\n\nmove on your turn, you can also move the pack up\n\nto 30 feet to an unoccupied space you can see.\n\n  Whenever the pack moves within 10 feet of a creature you can see and whenever a creature you can\nsee enters a space within 10 feet of the pack or ends\n\n\n      its turn there, you can force that creature to make\n      a Dexterity saving throw. On a failed save, the creature takes 3d10 Slashing damage. A creature makes\n      this save only once per turn.\n        Using a Higher-Level Spell Slot. The damage increases by 1d10 for each spell slot level above 3.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Conjure Celestial",
      "identity_key": "conjure-celestial",
      "content_key": "2024:conjure-celestial",
      "level": 7,
      "school": "Conjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "90 feet",
      "components": "V, S",
      "duration": "Concentration, up to 10 minutes",
      "description": "You conjure a spirit from the Upper Planes, which\n      manifests as a pillar of light in a 10-foot-radius,\n      40-foot-high Cylinder centered on a point within\n      range. For each creature you can see in the Cylinder,\n      choose which of these lights shines on it:\n\n      Healing Light. The target regains Hit Points equal\n\n       to 4d12 plus your spellcasting ability modifier.\n\n      Searing Light. The target makes a Dexterity saving\n\n       throw, taking 6d12 Radiant damage on a failed\n\n       save or half as much damage on a successful one.\n\n      Until the spell ends, Bright Light fills the Cylinder,\n      and when you move on your turn, you can also move\n      the Cylinder up to 30 feet.\n        Whenever the Cylinder moves into the space of a\n      creature you can see and whenever a creature you\n      can see enters the Cylinder or ends its turn there,\n      you can bathe it in one of the lights. A creature can\n      be affected by this spell only once per turn.\n        Using a Higher-Level Spell Slot. The healing and\n      damage increase by 1d12 for each spell slot level\n      above 7.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 90,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Conjure Elemental",
      "identity_key": "conjure-elemental",
      "content_key": "2024:conjure-elemental",
      "level": 5,
      "school": "Conjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S",
      "duration": "Concentration, up to 10 minutes",
      "description": "You conjure a Large, intangible spirit from the Elemental Planes that appears in an unoccupied space\n      within range. Choose the spirit’s element, which\n      determines its damage type: air (Lightning), earth\n      (Thunder), fire (Fire), or water (Cold). The spirit\n      lasts for the duration.\n         Whenever a creature you can see enters the spirit’s space or starts its turn within 5 feet of the spirit,\n      you can force that creature to make a Dexterity saving throw if the spirit has no creature Restrained.\n      On failed save, the target takes 8d8 damage of the\n      spirit’s type, and the target has the Restrained\n\n      condition until the spell ends. At the start of each\n\n      of its turns, the Restrained target repeats the save.\n\n\nOn a failed save, the target takes 4d8 damage of the\nspirit’s type. On a successful save, the target isn’t\nRestrained by the spirit.\n  Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 5.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Conjure Fey",
      "identity_key": "conjure-fey",
      "content_key": "2024:conjure-fey",
      "level": 6,
      "school": "Conjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S",
      "duration": "Concentration, up to 10 minutes",
      "description": "You conjure a Medium spirit from the Feywild in\nan unoccupied space you can see within range.\nThe spirit lasts for the duration, and it looks like\na Fey creature of your choice. When the spirit appears, you can make one melee spell attack against\na creature within 5 feet of it. On a hit, the target\ntakes Psychic damage equal to 3d12 plus your\n\nspellcasting ability modifier, and the target has the\n\nFrightened condition until the start of your next\n\nturn, with both you and the spirit as the source of\n\nthe fear.\n\n  As a Bonus Action on your later turns, you can\nteleport the spirit to an unoccupied space you can\nsee within 30 feet of the space it left and make the\nattack against a creature within 5 feet of it.\n  Using a Higher-Level Spell Slot. The damage increases by 1d12 for each spell slot level above 6.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Conjure Minor Elementals",
      "identity_key": "conjure-minor-elementals",
      "content_key": "2024:conjure-minor-elementals",
      "level": 4,
      "school": "Conjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S",
      "duration": "Concentration, up to 10 minutes",
      "description": "You conjure spirits from the Elemental Planes that\nflit around you in a 15-foot Emanation for the duration. Until the spell ends, any attack you make deals\n\nan extra 2d8 damage when you hit a creature in the\n\nEmanation. This damage is Acid, Cold, Fire, or Lightning (your choice when you make the attack).\n   In addition, the ground in the Emanation is Difficult Terrain for your enemies.\n   Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 4.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Conjure Woodland Beings",
      "identity_key": "conjure-woodland-beings",
      "content_key": "2024:conjure-woodland-beings",
      "level": 4,
      "school": "Conjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S",
      "duration": "Concentration, up to 10 minutes",
      "description": "You conjure nature spirits that flit around you in a\n\n10-foot Emanation for the duration. Whenever the\n\nEmanation enters the space of a creature you can\n\n\n      see and whenever a creature you can see enters\n      the Emanation or ends its turn there, you can force\n      that creature to make a Wisdom saving throw. The\n\n      creature takes 5d8 Force damage on a failed save or\n      half as much damage on a successful one. A creature\n      makes this save only once per turn.\n        In addition, you can take the Disengage action as a\n      Bonus Action for the spell’s duration.\n        Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 4.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Contact Other Plane",
      "identity_key": "contact-other-plane",
      "content_key": "2024:contact-other-plane",
      "level": 5,
      "school": "Divination",
      "ritual": true,
      "concentration": false,
      "casting_time": "1 minute or Ritual",
      "action_type": null,
      "range": "Self",
      "components": "V",
      "duration": "1 minute",
      "description": "You mentally contact a demigod, the spirit of a long-dead sage, or some other knowledgeable entity\n\n      from another plane. Contacting this otherworldly\n\n      intelligence can break your mind. When you cast\n\n      this spell, make a DC 15 Intelligence saving throw.\n\n      On a successful save, you can ask the entity up to\n\n      five questions. You must ask your questions before\n\n      the spell ends. The GM answers each question with\n\n      one word, such as “yes,” “no,” “maybe,” “never,” “irrelevant,” or “unclear” (if the entity doesn’t know\n\n      the answer to the question). If a one-word answer\n      would be misleading, the GM might instead offer a\n      short phrase as an answer.\n        On a failed save, you take 6d6 Psychic damage and\n      have the Incapacitated condition until you finish a\n      Long Rest. A Greater Restoration spell cast on you\n      ends this effect.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": true
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Contagion",
      "identity_key": "contagion",
      "content_key": "2024:contagion",
      "level": 5,
      "school": "Necromancy",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S",
      "duration": "7 days",
      "description": "Your touch inflicts a magical contagion. The target\n      must succeed on a Constitution saving throw or\n      take 11d8 Necrotic damage and have the Poisoned\n      condition. Also, choose one ability when you cast\n      the spell. While Poisoned, the target has Disadvantage on saving throws made with the chosen ability.\n        The target must repeat the saving throw at the\n      end of each of its turns until it gets three successes\n      or failures. If the target succeeds on three of these\n      saves, the spell ends on the target. If the target fails\n      three of the saves, the spell lasts for 7 days on it.\n        Whenever the Poisoned target receives an effect\n      that would end the Poisoned condition, the target\n      must succeed on a Constitution saving throw, or the\n      Poisoned condition doesn’t end on it.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 7,
        "unit": "day",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Contingency",
      "identity_key": "contingency",
      "content_key": "2024:contingency",
      "level": 6,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "10 minutes",
      "action_type": null,
      "range": "Self",
      "components": "V, S, M (a gem-encrusted statuette of yourself worth 1,500+ GP)",
      "duration": "10 days",
      "description": "Choose a spell of level 5 or lower that you can cast,\nthat has a casting time of an action, and that can\ntarget you. You cast that spell—called the contingent spell—as part of casting Contingency, expending spell slots for both, but the contingent spell\ndoesn’t come into effect. Instead, it takes effect\nwhen a certain trigger occurs. You describe that\ntrigger when you cast the two spells. For example,\na Contingency cast with Water Breathing might stipulate that Water Breathing comes into effect when\n\nyou are engulfed in water or a similar liquid.\n\n   The contingent spell takes effect immediately after the trigger occurs for the first time, whether or\n\nnot you want it to, and then Contingency ends.\n\n   The contingent spell takes effect only on you, even\n\nif it can normally target others. You can use only\n\none Contingency spell at a time. If you cast this spell\n\nagain, the effect of another Contingency spell on you\n\nends. Also, Contingency ends on you if its material\n\ncomponent is ever not on your person.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 10,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a gem-encrusted statuette of yourself worth 1,500+ GP",
        "cost": {
          "copper": 150000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "day",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Continual Flame",
      "identity_key": "continual-flame",
      "content_key": "2024:continual-flame",
      "level": 2,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S, M (ruby dust worth 50+ GP, which the spell consumes)",
      "duration": "Until dispelled",
      "description": "A flame springs from an object that you touch. The\neffect casts Bright Light in a 20-foot radius and Dim\nLight for an additional 20 feet. It looks like a regular\nflame, but it creates no heat and consumes no fuel.\nThe flame can be covered or hidden but not smothered or quenched.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "ruby dust worth 50+ GP, which the spell consumes",
        "cost": {
          "copper": 5000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "until_dispelled",
        "or_triggered": false
      }
    },
    {
      "name": "Control Water",
      "identity_key": "control-water",
      "content_key": "2024:control-water",
      "level": 4,
      "school": "Transmutation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "300 feet",
      "components": "V, S, M (a mixture of water and dust)",
      "duration": "Concentration, up to 10 minutes",
      "description": "Until the spell ends, you control any water inside\nan area you choose that is a Cube up to 100 feet on\na side, using one of the following effects. As a Magic\naction on your later turns, you can repeat the same\neffect or choose a different one.\n  Flood. You cause the water level of all standing\nwater in the area to rise by as much as 20 feet. If you\n\n\n      choose an area in a large body of water, you instead\n      create a 20-foot tall wave that travels from one side\n      of the area to the other and then crashes. Any Huge\n      or smaller vehicles in the wave’s path are carried\n      with it to the other side. Any Huge or smaller vehicles struck by the wave have a 25 percent chance of\n      capsizing.\n        The water level remains elevated until the spell\n      ends or you choose a different effect. If this effect\n      produced a wave, the wave repeats on the start of\n      your next turn while the flood effect lasts.\n        Part Water. You part water in the area and create a trench. The trench extends across the spell’s\n      area, and the separated water forms a wall to either\n      side. The trench remains until the spell ends or you\n      choose a different effect. The water then slowly fills\n      in the trench over the course of the next round until\n      the normal water level is restored.\n        Redirect Flow. You cause flowing water in the\n      area to move in a direction you choose, even if the\n      water has to flow over obstacles, up walls, or in\n      other unlikely directions. The water in the area\n      moves as you direct it, but once it moves beyond the\n      spell’s area, it resumes its flow based on the terrain.\n      The water continues to move in the direction you\n      chose until the spell ends or you choose a different\n\n      effect.\n        Whirlpool. You cause a whirlpool to form in the\n      center of the area, which must be at least 50 feet\n      square and 25 feet deep. The whirlpool lasts until\n\n\n      you choose a different effect or the spell ends. The\n      whirlpool is 5 feet wide at the base, up to 50 feet\n      wide at the top, and 25 feet tall. Any creature in the\n      water and within 25 feet of the whirlpool is pulled\n      10 feet toward it. When a creature enters the whirlpool for the first time on a turn or ends its turn\n      there, it makes a Strength saving throw. On a failed\n      save, the creature takes 2d8 Bludgeoning damage. On a successful save, the creature takes half\n      as much damage. A creature can swim away from\n      the whirlpool only if it first takes an action to pull\n      away and succeeds on a Strength (Athletics) check\n      against your spell save DC.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 300,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a mixture of water and dust",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Control Weather",
      "identity_key": "control-weather",
      "content_key": "2024:control-weather",
      "level": 8,
      "school": "Transmutation",
      "ritual": false,
      "concentration": true,
      "casting_time": "10 minutes",
      "action_type": null,
      "range": "Self",
      "components": "V, S, M (burning incense)",
      "duration": "Concentration, up to 8 hours",
      "description": "You take control of the weather within 5 miles of\n      you for the duration. You must be outdoors to cast\n      this spell, and it ends early if you go indoors.\n        When you cast the spell, you change the current\n      weather conditions, which are determined by the\n      GM. You can change precipitation, temperature,\n      and wind. It takes 1d4 × 10 minutes for the new\n\n\nconditions to take effect. Once they do so, you can\nchange the conditions again. When the spell ends,\nthe weather gradually returns to normal.\n  When you change the weather conditions, find\na current condition on the following tables and\nchange its stage by one, up or down. When changing\nthe wind, you can change its direction.\n\nPrecipitation\n Stage   Condition\n   1     Clear\n\n   2     Light clouds\n\n   3     Overcast or ground fog\n   4     Rain, hail, or snow\n   5     Torrential rain, driving hail, or blizzard\n\n\nTemperature                    Wind\n Stage   Condition              Stage    Condition\n   1     Heat wave                 1     Calm\n\n   2     Hot                       2     Moderate wind\n   3     Warm                      3     Strong wind\n   4     Cool                      4     Gale\n\n   5     Cold                      5     Storm\n\n   6     Freezing",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 10,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "burning incense",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 8,
        "unit": "hour",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Counterspell",
      "identity_key": "counterspell",
      "content_key": "2024:counterspell",
      "level": 3,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Reaction, which you take when you see a creature within 60 feet of yourself casting a spell with Verbal, Somatic, or Material components",
      "action_type": "Reaction",
      "range": "60 feet",
      "components": "S",
      "duration": "Instantaneous",
      "description": "You attempt to interrupt a creature in the process of\ncasting a spell. The creature makes a Constitution\nsaving throw. On a failed save, the spell dissipates\nwith no effect, and the action, Bonus Action, or Reaction used to cast it is wasted. If that spell was cast\nwith a spell slot, the slot isn’t expended.",
      "casting_time_value": {
        "options": [
          {
            "unit": "reaction",
            "trigger": "which you take when you see a creature within 60 feet of yourself casting a spell with Verbal, Somatic, or Material components",
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": false,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Create Food and Water",
      "identity_key": "create-food-and-water",
      "content_key": "2024:create-food-and-water",
      "level": 3,
      "school": "Conjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "You create 45 pounds of food and 30 gallons of\nfresh water on the ground or in containers within\nrange—both useful in fending off the hazards of\nmalnutrition and dehydration. The food is bland but\nnourishing and looks like a food of your choice, and\nthe water is clean. The food spoils after 24 hours if\nuneaten.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Create or Destroy Water",
      "identity_key": "create-or-destroy-water",
      "content_key": "2024:create-or-destroy-water",
      "level": 1,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S, M (a mix of water and sand)",
      "duration": "Instantaneous",
      "description": "You do one of the following:\n\n      Create Water. You create up to 10 gallons of clean\n\n       water within range in an open container. Alternatively, the water falls as rain in a 30-foot Cube\n       within range, extinguishing exposed flames there.\n      Destroy Water. You destroy up to 10 gallons of\n       water in an open container within range. Alternatively, you destroy fog in a 30-foot Cube within\n       range.\n        Using a Higher-Level Spell Slot. You create or\n      destroy 10 additional gallons of water, or the size of\n      the Cube increases by 5 feet, for each spell slot level\n      above 1.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a mix of water and sand",
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Create Undead",
      "identity_key": "create-undead",
      "content_key": "2024:create-undead",
      "level": 6,
      "school": "Necromancy",
      "ritual": false,
      "concentration": false,
      "casting_time": "1 minute",
      "action_type": null,
      "range": "10 feet",
      "components": "V, S, M (one 150+ GP black onyx stone for each corpse)",
      "duration": "Instantaneous",
      "description": "You can cast this spell only at night. Choose up\n      to three corpses of Medium or Small Humanoids\n      within range. Each one becomes a Ghoul under your\n\n      control (see “Monsters” for its stat block).\n        As a Bonus Action on each of your turns, you can\n      mentally command any creature you animated with\n      this spell if the creature is within 120 feet of you (if\n      you control multiple creatures, you can command\n      any of them at the same time, issuing the same command to them). You decide what action the creature\n      will take and where it will move on its next turn, or\n      you can issue a general command, such as to guard\n      a particular place. If you issue no commands, the\n      creature takes the Dodge action and moves only to\n      avoid harm. Once given an order, the creature continues to follow the order until its task is complete.\n        The creature is under your control for 24 hours,\n      after which it stops obeying any command you’ve\n      given it. To maintain control of the creature for another 24 hours, you must cast this spell on the creature before the current 24-hour period ends. This\n      use of the spell reasserts your control over up to\n      three creatures you have animated with this spell\n\n      rather than animating new ones.\n\n        Using a Higher-Level Spell Slot. If you use a level\n\n      7 spell slot, you can animate or reassert control\n\n      over four Ghouls. If you use a level 8 spell slot, you\n      can animate or reassert control over five Ghouls\n\n\nor two Ghasts or Wights. If you use a level 9 spell\nslot, you can animate or reassert control over six\nGhouls, three Ghasts or Wights, or two Mummies.\n\n\nSee “Monsters” for these stat blocks.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 10,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "one 150+ GP black onyx stone for each corpse",
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Creation",
      "identity_key": "creation",
      "content_key": "2024:creation",
      "level": 5,
      "school": "Illusion",
      "ritual": false,
      "concentration": false,
      "casting_time": "1 minute",
      "action_type": null,
      "range": "30 feet",
      "components": "V, S, M (a paintbrush)",
      "duration": "Special",
      "description": "You pull wisps of shadow material from the Shadowfell to create an object within range. It is either\nan object of vegetable matter (soft goods, rope,\nwood, and the like) or mineral matter (stone, crystal, metal, and the like). The object must be no\nlarger than a 5-foot Cube, and the object must be of\na form and material that you have seen.\n  The spell’s duration depends on the object’s material, as shown in the Materials table. If the object\nis composed of multiple materials, use the shortest\nduration. Using any object created by this spell as\nanother spell’s Material component causes the other\nspell to fail.\n\nMaterials\n Material                   Duration\nVegetable matter           24 hours\nStone or crystal           12 hours\nPrecious metals            1 hour\n\nGems                       10 minutes\n\nAdamantine or mithral      1 minute\n  Using a Higher-Level Spell Slot. The Cube increases by 5 feet for each spell slot level above 5.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a paintbrush",
        "cost": null
      },
      "duration_value": {
        "kind": "special"
      }
    },
    {
      "name": "Cure Wounds",
      "identity_key": "cure-wounds",
      "content_key": "2024:cure-wounds",
      "level": 1,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "A creature you touch regains a number of Hit Points\nequal to 2d8 plus your spellcasting ability modifier.\n  Using a Higher-Level Spell Slot. The healing increases by 2d8 for each spell slot level above 1.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Dancing Lights",
      "identity_key": "dancing-lights",
      "content_key": "2024:dancing-lights",
      "level": 0,
      "school": "Illusion",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "V, S, M (a bit of phosphorus)",
      "duration": "Concentration, up to 1 minute",
      "description": "You create up to four torch-size lights within range,\n      making them appear as torches, lanterns, or glowing orbs that hover for the duration. Alternatively,\n      you combine the four lights into one glowing Medium form that is vaguely humanlike. Whichever\n      form you choose, each light sheds Dim Light in a 10-\n      foot radius.\n        As a Bonus Action, you can move the lights up\n      to 60 feet to a space within range. A light must be\n      within 20 feet of another light created by this spell,\n      and a light vanishes if it exceeds the spell’s range.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a bit of phosphorus",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Darkness",
      "identity_key": "darkness",
      "content_key": "2024:darkness",
      "level": 2,
      "school": "Evocation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, M (bat fur and a piece of coal)",
      "duration": "Concentration, up to 10 minutes",
      "description": "For the duration, magical Darkness spreads from a\n      point within range and fills a 15-foot-radius Sphere.\n      Darkvision can’t see through it, and nonmagical\n      light can’t illuminate it.\n        Alternatively, you cast the spell on an object that\n      isn’t being worn or carried, causing the Darkness\n      to fill a 15-foot Emanation originating from that\n      object. Covering that object with something opaque,\n      such as a bowl or helm, blocks the Darkness.\n        If any of this spell’s area overlaps with an area of\n      Bright Light or Dim Light created by a spell of level\n      2 or lower, that other spell is dispelled.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": "bat fur and a piece of coal",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Darkvision",
      "identity_key": "darkvision",
      "content_key": "2024:darkvision",
      "level": 2,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S, M (a dried carrot)",
      "duration": "8 hours",
      "description": "For the duration, a willing creature you touch has\n      Darkvision with a range of 150 feet.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a dried carrot",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 8,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Daylight",
      "identity_key": "daylight",
      "content_key": "2024:daylight",
      "level": 3,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S",
      "duration": "1 hour",
      "description": "For the duration, sunlight spreads from a point\n      within range and fills a 60-foot-radius Sphere. The\n      sunlight’s area is Bright Light and sheds Dim Light\n      for an additional 60 feet.\n        Alternatively, you cast the spell on an object that\n\n      isn’t being worn or carried, causing the sunlight\n\n      to fill a 60-foot Emanation originating from that\n\n\nobject. Covering that object with something opaque,\nsuch as a bowl or helm, blocks the sunlight.\n  If any of this spell’s area overlaps with an area of\nDarkness created by a spell of level 3 or lower, that\nother spell is dispelled.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Death Ward",
      "identity_key": "death-ward",
      "content_key": "2024:death-ward",
      "level": 4,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S",
      "duration": "8 hours",
      "description": "You touch a creature and grant it a measure of protection from death. The first time the target would\n\ndrop to 0 Hit Points before the spell ends, the target\n\ninstead drops to 1 Hit Point, and the spell ends.\n\n  If the spell is still in effect when the target is subjected to an effect that would kill it instantly without dealing damage, that effect is negated against\nthe target, and the spell ends.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 8,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Delayed Blast Fireball",
      "identity_key": "delayed-blast-fireball",
      "content_key": "2024:delayed-blast-fireball",
      "level": 7,
      "school": "Evocation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "150 feet",
      "components": "V, S, M (a ball of bat guano and sulfur)",
      "duration": "Concentration, up to 1 minute",
      "description": "A beam of yellow light flashes from you, then condenses at a chosen point within range as a glowing\nbead for the duration. When the spell ends, the bead\nexplodes, and each creature in a 20-foot-radius\nSphere centered on that point makes a Dexterity\nsaving throw. A creature takes Fire damage equal\nto the total accumulated damage on a failed save or\n\nhalf as much damage on a successful one.\n\n  The spell’s base damage is 12d6, and the damage\n\nincreases by 1d6 whenever your turn ends and the\n\nspell hasn’t ended.\n  If a creature touches the glowing bead before the\nspell ends, that creature makes a Dexterity saving\nthrow. On a failed save, the spell ends, causing the\nbead to explode. On a successful save, the creature\ncan throw the bead up to 40 feet. If the thrown bead\nenters a creature’s space or collides with a solid object, the spell ends, and the bead explodes.\n  When the bead explodes, flammable objects in the\nexplosion that aren’t being worn or carried start\nburning.\n  Using a Higher-Level Spell Slot. The base damage\nincreases by 1d6 for each spell slot level above 7.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 150,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a ball of bat guano and sulfur",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Demiplane",
      "identity_key": "demiplane",
      "content_key": "2024:demiplane",
      "level": 8,
      "school": "Conjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "S",
      "duration": "1 hour",
      "description": "You create a shadowy Medium door on a flat solid\n      surface that you can see within range. This door can\n      be opened and closed, and it leads to a demiplane\n      that is an empty room 30 feet in each dimension,\n      made of wood or stone (your choice).\n        When the spell ends, the door vanishes, and any\n      objects inside the demiplane remain there. Any\n      creatures inside also remain unless they opt to be\n      shunted through the door as it vanishes, landing\n      with the Prone condition in the unoccupied spaces\n      closest to the door’s former space.\n        Each time you cast this spell, you can create a\n      new demiplane or connect the shadowy door to a\n      demiplane you created with a previous casting of\n      this spell. Additionally, if you know the nature and\n      contents of a demiplane created by a casting of this\n      spell by another creature, you can connect the shadowy door to that demiplane instead.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": false,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Detect Evil and Good",
      "identity_key": "detect-evil-and-good",
      "content_key": "2024:detect-evil-and-good",
      "level": 1,
      "school": "Divination",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S",
      "duration": "Concentration, up to 10 minutes",
      "description": "For the duration, you sense the location of any Aberration, Celestial, Elemental, Fey, Fiend, or Undead\n      within 30 feet of yourself. You also sense whether\n      the Hallow spell is active there and, if so, where.\n        The spell is blocked by 1 foot of stone, dirt, or\n      wood; 1 inch of metal; or a thin sheet of lead.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Detect Magic",
      "identity_key": "detect-magic",
      "content_key": "2024:detect-magic",
      "level": 1,
      "school": "Divination",
      "ritual": true,
      "concentration": true,
      "casting_time": "Action or Ritual",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S",
      "duration": "Concentration, up to 10 minutes",
      "description": "For the duration, you sense the presence of magical\n      effects within 30 feet of yourself. If you sense such\n      effects, you can take the Magic action to see a faint\n\n      aura around any visible creature or object in the\n\n      area that bears the magic, and if an effect was created by a spell, you learn the spell’s school of magic.\n\n        The spell is blocked by 1 foot of stone, dirt, or\n      wood; 1 inch of metal; or a thin sheet of lead.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": true
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Detect Poison and Disease",
      "identity_key": "detect-poison-and-disease",
      "content_key": "2024:detect-poison-and-disease",
      "level": 1,
      "school": "Divination",
      "ritual": true,
      "concentration": true,
      "casting_time": "Action or Ritual",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S, M (a yew leaf)",
      "duration": "Concentration, up to 10 minutes",
      "description": "For the duration, you sense the location of poisons,\n      poisonous or venomous creatures, and magical\n\n\ncontagions within 30 feet of yourself. You sense the\nkind of poison, creature, or contagion in each case.\n  The spell is blocked by 1 foot of stone, dirt, or\nwood; 1 inch of metal; or a thin sheet of lead.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": true
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a yew leaf",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Detect Thoughts",
      "identity_key": "detect-thoughts",
      "content_key": "2024:detect-thoughts",
      "level": 2,
      "school": "Divination",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S, M (1 Copper Piece)",
      "duration": "Concentration, up to 1 minute",
      "description": "You activate one of the effects below. Until the spell\nends, you can activate either effect as a Magic action\non your later turns.\n  Sense Thoughts. You sense the presence of\nthoughts within 30 feet of yourself that belong to\ncreatures that know languages or are telepathic.\nYou don’t read the thoughts, but you know that a\nthinking creature is present.\n  The spell is blocked by 1 foot of stone, dirt, or\nwood; 1 inch of metal; or a thin sheet of lead.\n\n  Read Thoughts. Target one creature you can see\n\nwithin 30 feet of yourself or one creature within\n\n30 feet of yourself that you detected with the Sense\n\nThoughts option. You learn what is most on the target’s mind right now. If the target doesn’t know any\nlanguages and isn’t telepathic, you learn nothing.\n  As a Magic action on your next turn, you can try\nto probe deeper into the target’s mind. If you probe\ndeeper, the target makes a Wisdom saving throw.\nOn a failed save, you discern the target’s reasoning,\nemotions, and something that looms large in its\nmind (such as a worry, love, or hate). On a successful\nsave, the spell ends. Either way, the target knows\nthat you are probing into its mind, and until you\nshift your attention away from the target’s mind,\nthe target can take an action on its turn to make an\nIntelligence (Arcana) check against your spell save\nDC, ending the spell on a success.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "1 Copper Piece",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Dimension Door",
      "identity_key": "dimension-door",
      "content_key": "2024:dimension-door",
      "level": 4,
      "school": "Conjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "500 feet",
      "components": "V",
      "duration": "Instantaneous",
      "description": "You teleport to a location within range. You arrive\nat exactly the spot desired. It can be a place you can\nsee, one you can visualize, or one you can describe\nby stating distance and direction, such as “200 feet\nstraight downward” or “300 feet upward to the\nnorthwest at a 45-degree angle.”\n  You can also teleport one willing creature. The\ncreature must be within 5 feet of you when you teleport, and it teleports to a space within 5 feet of your\ndestination space.\n\n\n        If you, the other creature, or both would arrive in\n      a space occupied by a creature or completely filled\n      by one or more objects, you and any creature traveling with you each take 4d6 Force damage, and the\n\n      teleportation fails.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 500,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Disguise Self",
      "identity_key": "disguise-self",
      "content_key": "2024:disguise-self",
      "level": 1,
      "school": "Illusion",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S",
      "duration": "1 hour",
      "description": "You make yourself—including your clothing, armor,\n      weapons, and other belongings on your person—\n      look different until the spell ends. You can seem\n      1 foot shorter or taller and can appear heavier or\n      lighter. You must adopt a form that has the same\n      basic arrangement of limbs as you have. Otherwise,\n      the extent of the illusion is up to you.\n        The changes wrought by this spell fail to hold\n      up to physical inspection. For example, if you use\n      this spell to add a hat to your outfit, objects pass\n      through the hat, and anyone who touches it would\n      feel nothing.\n        To discern that you are disguised, a creature must\n      take the Study action to inspect your appearance\n      and succeed on an Intelligence (Investigation) check\n\n      against your spell save DC.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Disintegrate",
      "identity_key": "disintegrate",
      "content_key": "2024:disintegrate",
      "level": 6,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S, M (a lodestone and dust)",
      "duration": "Instantaneous",
      "description": "You launch a green ray at a target you can see\n      within range. The target can be a creature, a nonmagical object, or a creation of magical force, such\n      as the wall created by Wall of Force.\n        A creature targeted by this spell makes a Dexterity saving throw. On a failed save, the target takes\n      10d6 + 40 Force damage. If this damage reduces it\n      to 0 Hit Points, it and everything nonmagical it is\n      wearing and carrying are disintegrated into gray\n\n      dust. The target can be revived only by a True Resurrection or a Wish spell.\n\n        This spell automatically disintegrates a Large or\n\n      smaller nonmagical object or a creation of magical\n\n      force. If such a target is Huge or larger, this spell\n\n      disintegrates a 10-foot-Cube portion of it.\n\n        Using a Higher-Level Spell Slot. The damage increases by 3d6 for each spell slot level above 6.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a lodestone and dust",
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Dispel Evil and Good",
      "identity_key": "dispel-evil-and-good",
      "content_key": "2024:dispel-evil-and-good",
      "level": 5,
      "school": "Abjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S, M (powdered silver and iron)",
      "duration": "Concentration, up to 1 minute",
      "description": "For the duration, Celestials, Elementals, Fey, Fiends,\n\nand Undead have Disadvantage on attack rolls\n\nagainst you. You can end the spell early by using either of the following special functions.\n  Break Enchantment. As a Magic action, you touch\na creature that is possessed by or has the Charmed\n\nor Frightened condition from one or more creatures\n\nof the types above. The target is no longer possessed, Charmed, or Frightened by such creatures.\n  Dismissal. As a Magic action, you target one creature you can see within 5 feet of you that has one of\nthe creature types above. The target must succeed\non a Charisma saving throw or be sent back to its\nhome plane if it isn’t there already. If they aren’t on\ntheir home plane, Undead are sent to the Shadowfell, and Fey are sent to the Feywild.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "powdered silver and iron",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Dispel Magic",
      "identity_key": "dispel-magic",
      "content_key": "2024:dispel-magic",
      "level": 3,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "Choose one creature, object, or magical effect\n\nwithin range. Any ongoing spell of level 3 or lower\non the target ends. For each ongoing spell of level 4\nor higher on the target, make an ability check using\nyour spellcasting ability (DC 10 plus that spell’s\n\nlevel). On a successful check, the spell ends.\n\n  Using a Higher-Level Spell Slot. You automatically end a spell on the target if the spell’s level is\nequal to or less than the level of the spell slot you\nuse.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Dissonant Whispers",
      "identity_key": "dissonant-whispers",
      "content_key": "2024:dissonant-whispers",
      "level": 1,
      "school": "Enchantment",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V",
      "duration": "Instantaneous",
      "description": "One creature of your choice that you can see within\n\nrange hears a discordant melody in its mind. The\n\ntarget makes a Wisdom saving throw. On a failed\n\nsave, it takes 3d6 Psychic damage and must immediately use its Reaction, if available, to move as far\n\naway from you as it can, using the safest route. On a\n\nsuccessful save, the target takes half as much damage only.\n\n  Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 1.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Divination",
      "identity_key": "divination",
      "content_key": "2024:divination",
      "level": 4,
      "school": "Divination",
      "ritual": true,
      "concentration": false,
      "casting_time": "Action or Ritual",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S, M (incense worth 25+ GP, which the spell consumes)",
      "duration": "Instantaneous",
      "description": "This spell puts you in contact with a god or a god’s\n      servants. You ask one question about a specific goal,\n      event, or activity to occur within 7 days. The GM offers a truthful reply, which might be a short phrase\n      or cryptic rhyme. The spell doesn’t account for circumstances that might change the answer, such as\n      the casting of other spells.\n\n        If you cast the spell more than once before finishing a Long Rest, there is a cumulative 25 percent\n      chance for each casting after the first that you get\n      no answer.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": true
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "incense worth 25+ GP, which the spell consumes",
        "cost": {
          "copper": 2500,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Divine Favor",
      "identity_key": "divine-favor",
      "content_key": "2024:divine-favor",
      "level": 1,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Bonus Action",
      "action_type": "Bonus Action",
      "range": "Self",
      "components": "V, S",
      "duration": "1 minute",
      "description": "Until the spell ends, your attacks with weapons deal\n      an extra 1d4 Radiant damage on a hit.",
      "casting_time_value": {
        "options": [
          {
            "unit": "bonus_action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Divine Smite",
      "identity_key": "divine-smite",
      "content_key": "2024:divine-smite",
      "level": 1,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Bonus Action, which you take immedi- ately after hitting a target with a Melee weapon or an Unarmed Strike",
      "action_type": "Bonus Action",
      "range": "Self",
      "components": "V",
      "duration": "Instantaneous",
      "description": "The target takes an extra 2d8 Radiant damage from\n\n      the attack. The damage increases by 1d8 if the target is a Fiend or an Undead.\n\n        Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 1.",
      "casting_time_value": {
        "options": [
          {
            "unit": "bonus_action",
            "trigger": "which you take immedi- ately after hitting a target with a Melee weapon or an Unarmed Strike",
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Divine Word",
      "identity_key": "divine-word",
      "content_key": "2024:divine-word",
      "level": 7,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Bonus Action",
      "action_type": "Bonus Action",
      "range": "30 feet",
      "components": "V",
      "duration": "Instantaneous",
      "description": "You utter a word imbued with power from the Upper Planes. Each creature of your choice in range\n\n      makes a Charisma saving throw. On a failed save,\n\n      a target that has 50 Hit Points or fewer suffers an\n\n      effect based on its current Hit Points, as shown in\n\n      the Divine Word Effects table. Regardless of its Hit\n\n      Points, a Celestial, an Elemental, a Fey, or a Fiend\n\n\ntarget that fails its save is forced back to its plane of\norigin (if it isn’t there already) and can’t return to\nthe current plane for 24 hours by any means short\n\n\nof a Wish spell.\n\nDivine Word Effects\n\n Hit Points Effect\n   0–20      The target dies.\n\n   21–30     The target has the Blinded, Deafened, and\n             Stunned conditions for 1 hour.\n   31–40     The target has the Blinded and Deafened\n             conditions for 10 minutes.\n   41–50     The target has the Deafened condition for\n\n             1 minute.",
      "casting_time_value": {
        "options": [
          {
            "unit": "bonus_action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Dominate Beast",
      "identity_key": "dominate-beast",
      "content_key": "2024:dominate-beast",
      "level": 4,
      "school": "Enchantment",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S",
      "duration": "Concentration, up to 1 minute",
      "description": "One Beast you can see within range must succeed\non a Wisdom saving throw or have the Charmed\ncondition for the duration. The target has Advantage on the save if you or your allies are fighting it.\nWhenever the target takes damage, it repeats the\nsave, ending the spell on itself on a success.\n  You have a telepathic link with the Charmed target while the two of you are on the same plane of\nexistence. On your turn, you can use this link to\nissue commands to the target (no action required),\nsuch as “Attack that creature,” “Move over there,” or\n“Fetch that object.” The target does its best to obey\non its turn. If it completes an order and doesn’t receive further direction from you, it acts and moves\nas it likes, focusing on protecting itself.\n\n  You can command the target to take a Reaction\n\nbut must take your own Reaction to do so.\n\n  Using a Higher-Level Spell Slot. Your Concentration can last longer with a spell slot of level 5 (up to\n\n10 minutes), 6 (up to 1 hour), or 7+ (up to 8 hours).",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Dominate Monster",
      "identity_key": "dominate-monster",
      "content_key": "2024:dominate-monster",
      "level": 8,
      "school": "Enchantment",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S",
      "duration": "Concentration, up to 1 hour",
      "description": "One creature you can see within range must\n\nsucceed on a Wisdom saving throw or have the\n\nCharmed condition for the duration. The target has\n\nAdvantage on the save if you or your allies are fighting it. Whenever the target takes damage, it repeats\n\nthe save, ending the spell on itself on a success.\n\n\n        You have a telepathic link with the Charmed target while the two of you are on the same plane of\n      existence. On your turn, you can use this link to\n      issue commands to the target (no action required),\n      such as “Attack that creature,” “Move over there,” or\n      “Fetch that object.” The target does its best to obey\n      on its turn. If it completes an order and doesn’t receive further direction from you, it acts and moves\n      as it likes, focusing on protecting itself.\n        You can command the target to take a Reaction\n      but must take your own Reaction to do so.\n        Using a Higher-Level Spell Slot. Your Concentration can last longer with a level 9 spell slot (up to 8\n      hours).",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Dominate Person",
      "identity_key": "dominate-person",
      "content_key": "2024:dominate-person",
      "level": 5,
      "school": "Enchantment",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S",
      "duration": "Concentration, up to 1 minute",
      "description": "One Humanoid you can see within range must\n      succeed on a Wisdom saving throw or have the\n      Charmed condition for the duration. The target has\n      Advantage on the save if you or your allies are fighting it. Whenever the target takes damage, it repeats\n      the save, ending the spell on itself on a success.\n        You have a telepathic link with the Charmed target while the two of you are on the same plane of\n      existence. On your turn, you can use this link to\n      issue commands to the target (no action required),\n      such as “Attack that creature,” “Move over there,” or\n      “Fetch that object.” The target does its best to obey\n      on its turn. If it completes an order and doesn’t receive further direction from you, it acts and moves\n      as it likes, focusing on protecting itself.\n        You can command the target to take a Reaction\n      but must take your own Reaction to do so.\n        Using a Higher-Level Spell Slot. Your Concentration can last longer with a spell slot of level 6 (up to\n      10 minutes), 7 (up to 1 hour), or 8+ (up to 8 hours).",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Dragon’s Breath",
      "identity_key": "dragon-s-breath",
      "content_key": "2024:dragon-s-breath",
      "level": 2,
      "school": "Transmutation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Bonus Action",
      "action_type": "Bonus Action",
      "range": "Touch",
      "components": "V, S, M (a hot pepper)",
      "duration": "Concentration, up to 1 minute",
      "description": "You touch one willing creature, and choose Acid,\n      Cold, Fire, Lightning, or Poison. Until the spell\n      ends, the target can take a Magic action to exhale\n      a 15-foot Cone. Each creature in that area makes a\n      Dexterity saving throw, taking 3d6 damage of the\n      chosen type on a failed save or half as much damage\n      on a successful one.\n\n\n  Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 2.",
      "casting_time_value": {
        "options": [
          {
            "unit": "bonus_action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a hot pepper",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Dream",
      "identity_key": "dream",
      "content_key": "2024:dream",
      "level": 5,
      "school": "Illusion",
      "ritual": false,
      "concentration": false,
      "casting_time": "1 minute",
      "action_type": null,
      "range": "Special",
      "components": "V, S, M (a handful of sand)",
      "duration": "8 hours",
      "description": "You target a creature you know on the same plane\nof existence. You or a willing creature you touch\nenters a trance state to act as a dream messenger.\nWhile in the trance, the messenger is Incapacitated\nand has a Speed of 0.\n  If the target is asleep, the messenger appears in\nthe target’s dreams and can converse with the target as long as it remains asleep, through the spell’s\n\nduration. The messenger can also shape the dream’s\n\nenvironment, creating landscapes, objects, and\n\nother images. The messenger can emerge from the\n\ntrance at any time, ending the spell. The target recalls the dream perfectly upon waking.\n  If the target is awake when you cast the spell, the\nmessenger knows it and can either end the trance\n(and the spell) or wait for the target to sleep, at\nwhich point the messenger enters its dreams.\n  You can make the messenger terrifying to the target. If you do so, the messenger can deliver a message of no more than ten words, and then the target\nmakes a Wisdom saving throw. On a failed save, the\ntarget gains no benefit from its rest, and it takes\n3d6 Psychic damage when it wakes up.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "special",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a handful of sand",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 8,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Druidcraft",
      "identity_key": "druidcraft",
      "content_key": "2024:druidcraft",
      "level": 0,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "Whispering to the spirits of nature, you create one\nof the following effects within range.\n  Weather Sensor. You create a Tiny, harmless sensory effect that predicts what the weather will be at\nyour location for the next 24 hours. The effect might\n\nmanifest as a golden orb for clear skies, a cloud for\n\nrain, falling snowflakes for snow, and so on. This\n\neffect persists for 1 round.\n\n  Bloom. You instantly make a flower blossom, a\nseed pod open, or a leaf bud bloom.\n  Sensory Effect. You create a harmless sensory effect, such as falling leaves, spectral dancing fairies,\na gentle breeze, the sound of an animal, or the faint\nodor of skunk. The effect must fit in a 5-foot Cube.\n  Fire Play. You light or snuff out a candle, a torch,\nor a campfire.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Earthquake",
      "identity_key": "earthquake",
      "content_key": "2024:earthquake",
      "level": 8,
      "school": "Transmutation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "500 feet",
      "components": "V, S, M (a fractured rock)",
      "duration": "Concentration, up to 1 minute",
      "description": "Choose a point on the ground that you can see\n      within range. For the duration, an intense tremor\n      rips through the ground in a 100-foot-radius circle\n      centered on that point. The ground there is Difficult\n      Terrain.\n        When you cast this spell and at the end of each of\n      your turns for the duration, each creature on the\n      ground in the area makes a Dexterity saving throw.\n      On a failed save, a creature has the Prone condition,\n      and its Concentration is broken.\n        You can also cause the effects below.\n        Fissures. A total of 1d6 fissures open in the spell’s\n      area at the end of the turn you cast it. You choose\n      the fissures’ locations, which can’t be under structures. Each fissure is 1d10 × 10 feet deep and 10\n      feet wide, and it extends from one edge of the spell’s\n      area to another edge. A creature in the same space\n      as a fissure must succeed on a Dexterity saving\n      throw or fall in. A creature that successfully saves\n      moves with the fissure’s edge as it opens.\n        Structures. The tremor deals 50 Bludgeoning\n      damage to any structure in contact with the ground\n      in the area when you cast the spell and at the end of\n      each of your turns until the spell ends. If a structure\n      drops to 0 Hit Points, it collapses.\n        A creature within a distance from a collapsing\n      structure equal to half the structure’s height makes\n      a Dexterity saving throw. On a failed save, the creature takes 12d6 Bludgeoning damage, has the Prone\n      condition, and is buried in the rubble, requiring a\n      DC 20 Strength (Athletics) check as an action to escape. On a successful save, the creature takes half as\n      much damage only.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 500,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a fractured rock",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Eldritch Blast",
      "identity_key": "eldritch-blast",
      "content_key": "2024:eldritch-blast",
      "level": 0,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "You hurl a beam of crackling energy. Make a ranged\n      spell attack against one creature or object in range.\n      On a hit, the target takes 1d10 Force damage.\n        Cantrip Upgrade. The spell creates two beams at\n      level 5, three beams at level 11, and four beams at\n      level 17. You can direct the beams at the same target\n      or at different ones. Make a separate attack roll for\n      each beam.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Elementalism",
      "identity_key": "elementalism",
      "content_key": "2024:elementalism",
      "level": 0,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "You exert control over the elements, creating one of\nthe following effects within range.\n  Beckon Air. You create a breeze strong enough to\nripple cloth, stir dust, rustle leaves, and close open\ndoors and shutters, all in a 5-foot Cube. Doors and\nshutters being held open by someone or something\naren’t affected.\n  Beckon Earth. You create a thin shroud of dust or\nsand that covers surfaces in a 5-foot-square area, or\nyou cause a single word to appear in your handwriting in a patch of dirt or sand.\n  Beckon Fire. You create a thin cloud of harmless\nembers and colored, scented smoke in a 5-foot Cube.\nYou choose the color and scent, and the embers can\nlight candles, torches, or lamps in that area. The\nsmoke’s scent lingers for 1 minute.\n  Beckon Water. You create a spray of cool mist that\nlightly dampens creatures and objects in a 5-foot\nCube. Alternatively, you create 1 cup of clean water\neither in an open container or on a surface, and the\nwater evaporates in 1 minute.\n  Sculpt Element. You cause dirt, sand, fire, smoke,\nmist, or water that can fit in a 1-foot Cube to assume\na crude shape (such as that of a creature) for 1 hour.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Enhance Ability",
      "identity_key": "enhance-ability",
      "content_key": "2024:enhance-ability",
      "level": 2,
      "school": "Transmutation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S, M (fur or a feather)",
      "duration": "Concentration, up to 1 hour",
      "description": "You touch a creature and choose Strength, Dexterity, Intelligence, Wisdom, or Charisma. For the\nduration, the target has Advantage on ability checks\nusing the chosen ability.\n\n  Using a Higher-Level Spell Slot. You can target\n\none additional creature for each spell slot level\n\nabove 2. You can choose a different ability for each\n\ntarget.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "fur or a feather",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Enlarge/Reduce",
      "identity_key": "enlarge-reduce",
      "content_key": "2024:enlarge-reduce",
      "level": 2,
      "school": "Transmutation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S, M (a pinch of powdered iron)",
      "duration": "Concentration, up to 1 minute",
      "description": "For the duration, the spell enlarges or reduces a\ncreature or an object you can see within range (see\n\n\n      the chosen effect below). A targeted object must\n      be neither worn nor carried. If the target is an unwilling creature, it can make a Constitution saving\n      throw. On a successful save, the spell has no effect.\n        Everything that a targeted creature is wearing\n      and carrying changes size with it. Any item it drops\n      returns to normal size at once. A thrown weapon or\n      piece of ammunition returns to normal size immediately after it hits or misses a target.\n        Enlarge. The target’s size increases by one category—from Medium to Large, for example. The\n      target also has Advantage on Strength checks and\n      Strength saving throws. The target’s attacks with\n      its enlarged weapons or Unarmed Strikes deal an\n      extra 1d4 damage on a hit.\n        Reduce. The target’s size decreases by one category—from Medium to Small, for example. The target also has Disadvantage on Strength checks and\n      Strength saving throws. The target’s attacks with\n      its reduced weapons or Unarmed Strikes deal 1d4\n      less damage on a hit (this can’t reduce the damage\n      below 1).",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a pinch of powdered iron",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Ensnaring Strike",
      "identity_key": "ensnaring-strike",
      "content_key": "2024:ensnaring-strike",
      "level": 1,
      "school": "Conjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Bonus Action, which you take immedi- ately after hitting a creature with a weapon",
      "action_type": "Bonus Action",
      "range": "Self",
      "components": "V",
      "duration": "Concentration, up to 1 minute",
      "description": "As you hit the target, grasping vines appear on it,\n      and it makes a Strength saving throw. A Large or\n      larger creature has Advantage on this save. On a\n      failed save, the target has the Restrained condition\n      until the spell ends. On a successful save, the vines\n      shrivel away, and the spell ends.\n        While Restrained, the target takes 1d6 Piercing\n      damage at the start of each of its turns. The target\n      or a creature within reach of it can take an action to\n      make a Strength (Athletics) check against your spell\n      save DC. On a success, the spell ends.\n        Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 1.",
      "casting_time_value": {
        "options": [
          {
            "unit": "bonus_action",
            "trigger": "which you take immedi- ately after hitting a creature with a weapon",
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Entangle",
      "identity_key": "entangle",
      "content_key": "2024:entangle",
      "level": 1,
      "school": "Conjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "90 feet",
      "components": "V, S",
      "duration": "Concentration, up to 1 minute",
      "description": "Grasping plants sprout from the ground in a 20-foot\n      square within range. For the duration, these plants\n      turn the ground in the area into Difficult Terrain.\n      They disappear when the spell ends.\n        Each creature (other than you) in the area when\n      you cast the spell must succeed on a Strength\n\n\nsaving throw or have the Restrained condition until\nthe spell ends. A Restrained creature can take an\naction to make a Strength (Athletics) check against\nyour spell save DC. On a success, it frees itself from\nthe grasping plants and is no longer Restrained by\nthem.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 90,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Enthrall",
      "identity_key": "enthrall",
      "content_key": "2024:enthrall",
      "level": 2,
      "school": "Enchantment",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S",
      "duration": "Concentration, up to 1 minute",
      "description": "You weave a distracting string of words, causing\ncreatures of your choice that you can see within\nrange to make a Wisdom saving throw. Any creature you or your companions are fighting automatically succeeds on this save. On a failed save, a target\nhas a −10 penalty to Wisdom (Perception) checks\nand Passive Perception until the spell ends.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Etherealness",
      "identity_key": "etherealness",
      "content_key": "2024:etherealness",
      "level": 7,
      "school": "Conjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S",
      "duration": "Up to 8 hours",
      "description": "You step into the border regions of the Ethereal\nPlane, where it overlaps with your current plane.\nYou remain in the Border Ethereal for the duration.\nDuring this time, you can move in any direction. If\nyou move up or down, every foot of movement costs\nan extra foot. You can perceive the plane you left,\nwhich looks gray, and you can’t see anything there\nmore than 60 feet away.\n  While on the Ethereal Plane, you can affect and\nbe affected only by creatures, objects, and effects\non that plane. Creatures that aren’t on the Ethereal\nPlane can’t perceive or interact with you unless a\nfeature gives them the ability to do so.\n  When the spell ends, you return to the plane you\nleft in the spot that corresponds to your space in the\nBorder Ethereal. If you appear in an occupied space,\nyou are shunted to the nearest unoccupied space\nand take Force damage equal to twice the number\n\nof feet you are moved.\n\n  This spell ends instantly if you cast it while you\n\nare on the Ethereal Plane or a plane that doesn’t\n\nborder it, such as one of the Outer Planes.\n  Using a Higher-Level Spell Slot. You can target up\nto three willing creatures (including yourself) for\neach spell slot level above 7. The creatures must be\nwithin 10 feet of you when you cast the spell.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 8,
        "unit": "hour",
        "concentration": false,
        "up_to": true
      }
    },
    {
      "name": "Expeditious Retreat",
      "identity_key": "expeditious-retreat",
      "content_key": "2024:expeditious-retreat",
      "level": 1,
      "school": "Transmutation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Bonus Action",
      "action_type": "Bonus Action",
      "range": "Self",
      "components": "V, S",
      "duration": "Concentration, up to 10 minutes",
      "description": "You take the Dash action, and until the spell ends,\n      you can take that action again as a Bonus Action.",
      "casting_time_value": {
        "options": [
          {
            "unit": "bonus_action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Eyebite",
      "identity_key": "eyebite",
      "content_key": "2024:eyebite",
      "level": 6,
      "school": "Necromancy",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S",
      "duration": "Concentration, up to 1 minute",
      "description": "For the duration, your eyes become an inky void.\n      One creature of your choice within 60 feet of you\n      that you can see must succeed on a Wisdom saving\n      throw or be affected by one of the following effects\n      of your choice for the duration.\n         On each of your turns until the spell ends, you can\n      take a Magic action to target another creature but\n      can’t target a creature again if it has succeeded on a\n      save against this casting of the spell.\n         Asleep. The target has the Unconscious condition.\n      It wakes up if it takes any damage or if another\n      creature takes an action to shake it awake.\n\n         Panicked. The target has the Frightened condition. On each of its turns, the Frightened target\n\n      must take the Dash action and move away from you\n\n      by the safest and shortest route available. If the target moves to a space at least 60 feet away from you\n\n      where it can’t see you, this effect ends.\n\n         Sickened. The target has the Poisoned condition.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Fabricate",
      "identity_key": "fabricate",
      "content_key": "2024:fabricate",
      "level": 4,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "10 minutes",
      "action_type": null,
      "range": "120 feet",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "You convert raw materials into products of the same\n      material. For example, you can fabricate a wooden\n      bridge from a clump of trees, a rope from a patch of\n      hemp, or clothes from flax or wool.\n        Choose raw materials that you can see within\n      range. You can fabricate a Large or smaller object\n      (contained within a 10-foot Cube or eight connected\n      5-foot Cubes) given a sufficient quantity of material. If you’re working with metal, stone, or another\n\n      mineral substance, however, the fabricated object\n\n      can be no larger than Medium (contained within a\n\n      5-foot Cube). The quality of any fabricated objects is\n\n      based on the quality of the raw materials.\n\n\n  Creatures and magic items can’t be created by\nthis spell. You also can’t use it to create items that\nrequire a high degree of skill—such as weapons and\n\n\narmor—unless you have proficiency with the type\nof Artisan’s Tools used to craft such objects.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 10,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Faerie Fire",
      "identity_key": "faerie-fire",
      "content_key": "2024:faerie-fire",
      "level": 1,
      "school": "Evocation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V",
      "duration": "Concentration, up to 1 minute",
      "description": "Objects in a 20-foot Cube within range are outlined\nin blue, green, or violet light (your choice). Each\ncreature in the Cube is also outlined if it fails a Dexterity saving throw. For the duration, objects and\naffected creatures shed Dim Light in a 10-foot radius and can’t benefit from the Invisible condition.\n  Attack rolls against an affected creature or object\nhave Advantage if the attacker can see it.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Faithful Hound",
      "identity_key": "faithful-hound",
      "content_key": "2024:faithful-hound",
      "level": 4,
      "school": "Conjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S, M (a silver whistle)",
      "duration": "8 hours",
      "description": "You conjure a phantom watchdog in an unoccupied\n\nspace that you can see within range. The hound\n\nremains for the duration or until the two of you are\n\nmore than 300 feet apart from each other.\n\n  No one but you can see the hound, and it is intangible and invulnerable. When a Small or larger\n\ncreature comes within 30 feet of it without first\n\nspeaking the password that you specify when you\ncast this spell, the hound starts barking loudly. The\nhound has Truesight with a range of 30 feet.\n  At the start of each of your turns, the hound attempts to bite one enemy within 5 feet of it. That\nenemy must succeed on a Dexterity saving throw or\ntake 4d8 Force damage.\n  On your later turns, you can take a Magic action to\nmove the hound up to 30 feet.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a silver whistle",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 8,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "False Life",
      "identity_key": "false-life",
      "content_key": "2024:false-life",
      "level": 1,
      "school": "Necromancy",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S, M (a drop of alcohol)",
      "duration": "Instantaneous",
      "description": "You gain 2d4 + 4 Temporary Hit Points.\n\n  Using a Higher-Level Spell Slot. You gain 5 additional Temporary Hit Points for each spell slot level\n\nabove 1.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a drop of alcohol",
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Fear",
      "identity_key": "fear",
      "content_key": "2024:fear",
      "level": 3,
      "school": "Illusion",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S, M (a white feather)",
      "duration": "Concentration, up to 1 minute",
      "description": "Each creature in a 30-foot Cone must succeed on a\n      Wisdom saving throw or drop whatever it is holding\n      and have the Frightened condition for the duration.\n        A Frightened creature takes the Dash action and\n      moves away from you by the safest route on each\n      of its turns unless there is nowhere to move. If the\n      creature ends its turn in a space where it doesn’t\n      have line of sight to you, the creature makes a Wisdom saving throw. On a successful save, the spell\n      ends on that creature.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a white feather",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Feather Fall",
      "identity_key": "feather-fall",
      "content_key": "2024:feather-fall",
      "level": 1,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Reaction, which you take when you or a creature you can see within 60 feet of you falls",
      "action_type": "Reaction",
      "range": "60 feet",
      "components": "V, M (a small feather or piece of down)",
      "duration": "1 minute",
      "description": "Choose up to five falling creatures within range. A\n      falling creature’s rate of descent slows to 60 feet per\n      round until the spell ends. If a creature lands before\n      the spell ends, the creature takes no damage from\n      the fall, and the spell ends for that creature.",
      "casting_time_value": {
        "options": [
          {
            "unit": "reaction",
            "trigger": "which you take when you or a creature you can see within 60 feet of you falls",
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": "a small feather or piece of down",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Find Familiar",
      "identity_key": "find-familiar",
      "content_key": "2024:find-familiar",
      "level": 1,
      "school": "Conjuration",
      "ritual": true,
      "concentration": false,
      "casting_time": "1 hour or Ritual",
      "action_type": null,
      "range": "10 feet",
      "components": "V, S, M (burning incense worth 10+ GP, which the spell consumes)",
      "duration": "Instantaneous",
      "description": "You gain the service of a familiar, a spirit that takes\n      an animal form you choose: Bat, Cat, Frog, Hawk,\n      Lizard, Octopus, Owl, Rat, Raven, Spider, Weasel,\n      or another Beast that has a Challenge Rating of 0.\n      Appearing in an unoccupied space within range, the\n      familiar has the statistics of the chosen form (see\n      “Monsters”), though it is a Celestial, Fey, or Fiend\n      (your choice) instead of a Beast. Your familiar acts\n      independently of you, but it obeys your commands.\n        Telepathic Connection. While your familiar is\n      within 100 feet of you, you can communicate with it\n      telepathically. Additionally, as a Bonus Action, you\n      can see through the familiar’s eyes and hear what it\n      hears until the start of your next turn, gaining the\n      benefits of any special senses it has.\n        Finally, when you cast a spell with a range of\n      touch, your familiar can deliver the touch. Your familiar must be within 100 feet of you, and it must\n\n\ntake a Reaction to deliver the touch when you cast\nthe spell.\n  Combat. The familiar is an ally to you and your\n\n\nallies. It rolls its own Initiative and acts on its own\nturn. A familiar can’t attack, but it can take other\nactions as normal.\n  Disappearance of the Familiar. When the familiar drops to 0 Hit Points, it disappears. It reappears\nafter you cast this spell again. As a Magic action,\nyou can temporarily dismiss the familiar to a pocket\ndimension. Alternatively, you can dismiss it forever.\nAs a Magic action while it is temporarily dismissed,\nyou can cause it to reappear in an unoccupied space\nwithin 30 feet of you. Whenever the familiar drops\nto 0 Hit Points or disappears into the pocket dimension, it leaves behind in its space anything it was\nwearing or carrying.\n  One Familiar Only. You can’t have more than one\n\nfamiliar at a time. If you cast this spell while you\n\nhave a familiar, you instead cause it to adopt a new\neligible form.",
      "casting_time_value": {
        "options": [
          {
            "unit": "hour",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": true
      },
      "range_value": {
        "kind": "ranged",
        "feet": 10,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "burning incense worth 10+ GP, which the spell consumes",
        "cost": {
          "copper": 1000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Find Steed",
      "identity_key": "find-steed",
      "content_key": "2024:find-steed",
      "level": 2,
      "school": "Conjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "You summon an otherworldly being that appears as\na loyal steed in an unoccupied space of your choice\nwithin range. This creature uses the Otherworldly\n\nSteed stat block. If you already have a steed from\n\nthis spell, the steed is replaced by the new one.\n   The steed resembles a Large, rideable animal of\nyour choice, such as a horse, a camel, a dire wolf,\nor an elk. Whenever you cast the spell, choose the\nsteed’s creature type—Celestial, Fey, or Fiend—\n\nwhich determines certain traits in the stat block.\n   Combat. The steed is an ally to you and your allies. In combat, it shares your Initiative count, and\nit functions as a controlled mount while you ride it\n(as defined in the rules on mounted combat). If you\nhave the Incapacitated condition, the steed takes\nits turn immediately after yours and acts independently, focusing on protecting you.\n   Disappearance of the Steed. The steed disappears if it drops to 0 Hit Points or if you die. When\nit disappears, it leaves behind anything it was\nwearing or carrying. If you cast this spell again, you\ndecide whether you summon the steed that disappeared or a different one.\n   Using a Higher-Level Spell Slot. Use the spell\nslot’s level for the spell’s level in the stat block.\n\n\n      Otherworldly Steed\n\n      Large Celestial, Fey, or Fiend (Your Choice), Neutral\n      AC 10 + 1 per spell level\n      HP 5 + 10 per spell level (the steed has a number of Hit\n       Dice [d10s] equal to the spell’s level)\n      Speed 60 ft., Fly 60 ft. (requires level 4+ spell)\n                MOD SAVE             MOD SAVE            MOD SAVE\n      Str 18 +4 +4         Dex 12 +1 +1         Con 14 +2 +2\n      Int 6 −2 −2          Wis 12 +1 +1         Cha 8 −1 −1\n      Senses Passive Perception 11\n      Languages Telepathy 1 mile (works only with you)\n      CR None (XP 0; PB equals your Proficiency Bonus)\n\n      Traits\n      Life Bond. When you regain Hit Points from a level 1+\n      spell, the steed regains the same number of Hit Points if\n      you’re within 5 feet of it.\n\n      Actions\n      Otherworldly Slam. Melee Attack Roll: Bonus equals\n      your spell attack modifier, reach 5 ft. Hit: 1d8 plus the\n\n      spell’s level of Radiant (Celestial), Psychic (Fey), or Necrotic (Fiend) damage.\n\n      Bonus Actions\n      Fell Glare (Fiend Only; Recharges after a Long Rest).\n      Wisdom Saving Throw: DC equals your spell save DC,\n      one creature within 60 feet the steed can see. Failure:\n      The target has the Frightened condition until the end of\n      your next turn.\n      Fey Step (Fey Only; Recharges after a Long Rest). The\n      steed teleports, along with its rider, to an unoccupied\n      space of your choice up to 60 feet away from itself.\n\n      Healing Touch (Celestial Only; Recharges after a Long\n      Rest). One creature within 5 feet of the steed regains a\n      number of Hit Points equal to 2d8 plus the spell’s level.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Find the Path",
      "identity_key": "find-the-path",
      "content_key": "2024:find-the-path",
      "level": 6,
      "school": "Divination",
      "ritual": false,
      "concentration": true,
      "casting_time": "1 minute",
      "action_type": null,
      "range": "Self",
      "components": "V, S, M (a set of divination tools—such as cards or runes—worth 100+ GP)",
      "duration": "Concentration, up to 1 day",
      "description": "You magically sense the most direct physical route\n\n      to a location you name. You must be familiar with\n\n      the location, and the spell fails if you name a destination on another plane of existence, a moving destination (such as a mobile fortress), or an unspecific\n\n      destination (such as “a green dragon’s lair”).\n\n        For the duration, as long as you are on the same\n\n      plane of existence as the destination, you know how\n      far it is and in what direction it lies. Whenever you\n\n\nface a choice of paths along the way there, you know\nwhich path is the most direct.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a set of divination tools—such as cards or runes—worth 100+ GP",
        "cost": {
          "copper": 10000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "day",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Find Traps",
      "identity_key": "find-traps",
      "content_key": "2024:find-traps",
      "level": 2,
      "school": "Divination",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "You sense any trap within range that is within line\nof sight. A trap, for the purpose of this spell, includes any object or mechanism that was created\nto cause damage or other danger. Thus, the spell\nwould sense the Alarm or Glyph of Warding spell or a\nmechanical pit trap, but it wouldn’t reveal a natural\nweakness in the floor, an unstable ceiling, or a hidden sinkhole.\n  This spell reveals that a trap is present but not its\nlocation. You do learn the general nature of the danger posed by a trap you sense.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Finger of Death",
      "identity_key": "finger-of-death",
      "content_key": "2024:finger-of-death",
      "level": 7,
      "school": "Necromancy",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "You unleash negative energy toward a creature you\ncan see within range. The target makes a Constitution saving throw, taking 7d8 + 30 Necrotic damage\non a failed save or half as much damage on a successful one.\n  A Humanoid killed by this spell rises at the start\nof your next turn as a Zombie (see “Monsters”) that\nfollows your verbal orders.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Fireball",
      "identity_key": "fireball",
      "content_key": "2024:fireball",
      "level": 3,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "150 feet",
      "components": "V, S, M (a ball of bat guano and sulfur)",
      "duration": "Instantaneous",
      "description": "A bright streak flashes from you to a point you\nchoose within range and then blossoms with a\nlow roar into a fiery explosion. Each creature in a\n20-foot-radius Sphere centered on that point makes\n\na Dexterity saving throw, taking 8d6 Fire damage\n\non a failed save or half as much damage on a successful one.\n\n  Flammable objects in the area that aren’t being\n\nworn or carried start burning.\n\n  Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 3.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 150,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a ball of bat guano and sulfur",
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Fire Bolt",
      "identity_key": "fire-bolt",
      "content_key": "2024:fire-bolt",
      "level": 0,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "You hurl a mote of fire at a creature or an object\n      within range. Make a ranged spell attack against the\n      target. On a hit, the target takes 1d10 Fire damage.\n      A flammable object hit by this spell starts burning if\n      it isn’t being worn or carried.\n         Cantrip Upgrade. The damage increases by 1d10\n      when you reach levels 5 (2d10), 11 (3d10), and 17\n      (4d10).",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Fire Shield",
      "identity_key": "fire-shield",
      "content_key": "2024:fire-shield",
      "level": 4,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S, M (a bit of phosphorus or a firefly)",
      "duration": "10 minutes",
      "description": "Wispy flames wreathe your body for the duration,\n      shedding Bright Light in a 10-foot radius and Dim\n      Light for an additional 10 feet.\n        The flames provide you with a warm shield or a\n      chill shield, as you choose. The warm shield grants\n      you Resistance to Cold damage, and the chill shield\n      grants you Resistance to Fire damage.\n        In addition, whenever a creature within 5 feet\n      of you hits you with a melee attack roll, the shield\n      erupts with flame. The attacker takes 2d8 Fire damage from a warm shield or 2d8 Cold damage from a\n      chill shield.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a bit of phosphorus or a firefly",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Fire Storm",
      "identity_key": "fire-storm",
      "content_key": "2024:fire-storm",
      "level": 7,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "150 feet",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "A storm of fire appears within range. The area of\n      the storm consists of up to ten 10-foot Cubes, which\n      you arrange as you like. Each Cube must be contiguous with at least one other Cube. Each creature\n      in the area makes a Dexterity saving throw, taking\n      7d10 Fire damage on a failed save or half as much\n      damage on a successful one.\n        Flammable objects in the area that aren’t being\n      worn or carried start burning.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 150,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Flame Blade",
      "identity_key": "flame-blade",
      "content_key": "2024:flame-blade",
      "level": 2,
      "school": "Evocation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Bonus Action",
      "action_type": "Bonus Action",
      "range": "Self",
      "components": "V, S, M (a sumac leaf)",
      "duration": "Concentration, up to 10 minutes",
      "description": "You evoke a fiery blade in your free hand. The blade\nis similar in size and shape to a scimitar, and it lasts\nfor the duration. If you let go of the blade, it disappears, but you can evoke it again as a Bonus Action.\n  As a Magic action, you can make a melee spell attack with the fiery blade. On a hit, the target takes\nFire damage equal to 3d6 plus your spellcasting\nability modifier.\n  The flaming blade sheds Bright Light in a 10-foot\nradius and Dim Light for an additional 10 feet.\n  Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 2.",
      "casting_time_value": {
        "options": [
          {
            "unit": "bonus_action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a sumac leaf",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Flame Strike",
      "identity_key": "flame-strike",
      "content_key": "2024:flame-strike",
      "level": 5,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S, M (a pinch of sulfur)",
      "duration": "Instantaneous",
      "description": "A vertical column of brilliant fire roars down from\nabove. Each creature in a 10-foot-radius, 40-foot-high Cylinder centered on a point within range\nmakes a Dexterity saving throw, taking 5d6 Fire\ndamage and 5d6 Radiant damage on a failed save or\nhalf as much damage on a successful one.\n  Using a Higher-Level Spell Slot. The Fire damage\nand the Radiant damage increase by 1d6 for each\nspell slot level above 5.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a pinch of sulfur",
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Flaming Sphere",
      "identity_key": "flaming-sphere",
      "content_key": "2024:flaming-sphere",
      "level": 2,
      "school": "Conjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S, M (a ball of wax)",
      "duration": "Concentration, up to 1 minute",
      "description": "You create a 5-foot-diameter sphere of fire in an unoccupied space on the ground within range. It lasts\n\n\nfor the duration. Any creature that ends its turn\nwithin 5 feet of the sphere makes a Dexterity saving\nthrow, taking 2d6 Fire damage on a failed save or\nhalf as much damage on a successful one.\n  As a Bonus Action, you can move the sphere up to\n30 feet, rolling it along the ground. If you move the\nsphere into a creature’s space, that creature makes\nthe save against the sphere, and the sphere stops\nmoving for the turn.\n  When you move the sphere, you can direct it over\nbarriers up to 5 feet tall and jump it across pits up\nto 10 feet wide. Flammable objects that aren’t being worn or carried start burning if touched by the\nsphere, and it sheds Bright Light in a 20-foot radius\n\nand Dim Light for an additional 20 feet.\n\n  Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 2.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a ball of wax",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Flesh to Stone",
      "identity_key": "flesh-to-stone",
      "content_key": "2024:flesh-to-stone",
      "level": 6,
      "school": "Transmutation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S, M (a cockatrice feather)",
      "duration": "Concentration, up to 1 minute",
      "description": "You attempt to turn one creature that you can see\n      within range into stone. The target makes a Constitution saving throw. On a failed save, it has the Restrained condition for the duration. On a successful\n      save, its Speed is 0 until the start of your next turn.\n      Constructs automatically succeed on the save.\n        A Restrained target makes another Constitution\n      saving throw at the end of each of its turns. If it\n\n      successfully saves against this spell three times,\n\n      the spell ends. If it fails its saves three times, it is\n\n      turned to stone and has the Petrified condition for\n\n      the duration. The successes and failures needn’t be\n\n      consecutive; keep track of both until the target collects three of a kind.\n\n        If you maintain your Concentration on this spell\n      for the entire possible duration, the target is Petrified until the condition is ended by Greater Restoration or similar magic.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a cockatrice feather",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Floating Disk",
      "identity_key": "floating-disk",
      "content_key": "2024:floating-disk",
      "level": 1,
      "school": "Conjuration",
      "ritual": true,
      "concentration": false,
      "casting_time": "Action or Ritual",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S, M (a drop of mercury)",
      "duration": "1 hour",
      "description": "This spell creates a circular, horizontal plane of\n\n      force, 3 feet in diameter and 1 inch thick, that floats\n\n      3 feet above the ground in an unoccupied space\n\n      of your choice that you can see within range. The\n\n      disk remains for the duration and can hold up to\n\n      500 pounds. If more weight is placed on it, the spell\n\n      ends, and everything on the disk falls to the ground.\n\n         The disk is immobile while you are within 20 feet\n\n      of it. If you move more than 20 feet away from it, the\n\n      disk follows you so that it remains within 20 feet of\n\n      you. It can move across uneven terrain, up or down\n\n      stairs, slopes and the like, but it can’t cross an elevation change of 10 feet or more. For example, the\n\n      disk can’t move across a 10-foot-deep pit, nor could\n\n      it leave such a pit if it was created at the bottom.\n\n         If you move more than 100 feet from the disk (typically because it can’t move around an obstacle to\n\n      follow you), the spell ends.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": true
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a drop of mercury",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Fly",
      "identity_key": "fly",
      "content_key": "2024:fly",
      "level": 3,
      "school": "Transmutation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S, M (a feather)",
      "duration": "Concentration, up to 10 minutes",
      "description": "You touch a willing creature. For the duration, the\ntarget gains a Fly Speed of 60 feet and can hover.\nWhen the spell ends, the target falls if it is still aloft\n\n\nunless it can stop the fall.\n  Using a Higher-Level Spell Slot. You can target\none additional creature for each spell slot level\nabove 3.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a feather",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Fog Cloud",
      "identity_key": "fog-cloud",
      "content_key": "2024:fog-cloud",
      "level": 1,
      "school": "Conjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "V, S",
      "duration": "Concentration, up to 1 hour",
      "description": "You create a 20-foot-radius Sphere of fog centered\n\non a point within range. The Sphere is Heavily Obscured. It lasts for the duration or until a strong\n\nwind (such as one created by Gust of Wind) disperses it.\n\n  Using a Higher-Level Spell Slot. The fog’s radius\n\nincreases by 20 feet for each spell slot level above 1.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Forbiddance",
      "identity_key": "forbiddance",
      "content_key": "2024:forbiddance",
      "level": 6,
      "school": "Abjuration",
      "ritual": true,
      "concentration": false,
      "casting_time": "10 minutes or Ritual",
      "action_type": null,
      "range": "Touch",
      "components": "V, S, M (ruby dust worth 1,000+ GP)",
      "duration": "1 day",
      "description": "You create a ward against magical travel that protects up to 40,000 square feet of floor space to a\nheight of 30 feet above the floor. For the duration,\ncreatures can’t teleport into the area or use portals,\n\nsuch as those created by the Gate spell, to enter the\n\narea. The spell proofs the area against planar travel,\n\nand therefore prevents creatures from accessing\n\nthe area by way of the Astral Plane, the Ethereal\n\nPlane, the Feywild, the Shadowfell, or the Plane Shift\n\nspell.\n\n  In addition, the spell damages types of creatures\n\nthat you choose when you cast it. Choose one or\n\nmore of the following: Aberrations, Celestials, Elementals, Fey, Fiends, and Undead. When a creature\n\nof a chosen type enters the spell’s area for the first\n\ntime on a turn or ends its turn there, the creature\n\ntakes 5d10 Radiant or Necrotic damage (your\n\nchoice when you cast this spell).\n\n  You can designate a password when you cast the\n\nspell. A creature that speaks the password as it enters the area takes no damage from the spell.\n\n  The spell’s area can’t overlap with the area of\nanother Forbiddance spell. If you cast Forbiddance\nevery day for 30 days in the same location, the spell\nlasts until it is dispelled, and the Material components are consumed on the last casting.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 10,
            "mode": null
          }
        ],
        "ritual": true
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "ruby dust worth 1,000+ GP",
        "cost": {
          "copper": 100000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "day",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Forcecage",
      "identity_key": "forcecage",
      "content_key": "2024:forcecage",
      "level": 7,
      "school": "Evocation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "100 feet",
      "components": "V, S, M (ruby dust worth 1,500+ GP, which the spell consumes)",
      "duration": "Concentration, up to 1 hour",
      "description": "An immobile, Invisible, Cube-shaped prison composed of magical force springs into existence\n      around an area you choose within range. The prison\n      can be a cage or a solid box, as you choose.\n         A prison in the shape of a cage can be up to 20 feet\n      on a side and is made from 1/2-inch diameter bars\n      spaced 1/2 inch apart. A prison in the shape of a box\n      can be up to 10 feet on a side, creating a solid barrier that prevents any matter from passing through\n      it and blocking any spells cast into or out from the\n\n      area.\n\n         When you cast the spell, any creature that is completely inside the cage’s area is trapped. Creatures\n\n      only partially within the area, or those too large to\n\n      fit inside it, are pushed away from the center of the\n\n      area until they are completely outside it.\n\n         A creature inside the cage can’t leave it by nonmagical means. If the creature tries to use teleportation or interplanar travel to leave, it must first\n\n      make a Charisma saving throw. On a successful\n\n      save, the creature can use that magic to exit the\n\n      cage. On a failed save, the creature doesn’t exit the\n\n      cage and wastes the spell or effect. The cage also\n\n      extends into the Ethereal Plane, blocking ethereal\n\n      travel.\n\n         This spell can’t be dispelled by Dispel Magic.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 100,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "ruby dust worth 1,500+ GP, which the spell consumes",
        "cost": {
          "copper": 150000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Foresight",
      "identity_key": "foresight",
      "content_key": "2024:foresight",
      "level": 9,
      "school": "Divination",
      "ritual": false,
      "concentration": false,
      "casting_time": "1 minute",
      "action_type": null,
      "range": "Touch",
      "components": "V, S, M (a hummingbird feather)",
      "duration": "8 hours",
      "description": "You touch a willing creature and bestow a limited\n      ability to see into the immediate future. For the duration, the target has Advantage on D20 Tests, and\n      other creatures have Disadvantage on attack rolls\n      against it. The spell ends early if you cast it again.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a hummingbird feather",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 8,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Freedom of Movement",
      "identity_key": "freedom-of-movement",
      "content_key": "2024:freedom-of-movement",
      "level": 4,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S, M (a leather strap)",
      "duration": "1 hour",
      "description": "You touch a willing creature. For the duration,\n      the target’s movement is unaffected by Difficult\n      Terrain, and spells and other magical effects can\n\n\nneither reduce the target’s Speed nor cause the target to have the Paralyzed or Restrained conditions.\nThe target also has a Swim Speed equal to its Speed.\n\n\n  In addition, the target can spend 5 feet of movement to automatically escape from nonmagical\nrestraints, such as manacles or a creature imposing\nthe Grappled condition on it.\n  Using a Higher-Level Spell Slot. You can target\none additional creature for each spell slot level\nabove 4.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a leather strap",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Freezing Sphere",
      "identity_key": "freezing-sphere",
      "content_key": "2024:freezing-sphere",
      "level": 6,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "300 feet",
      "components": "V, S, M (a miniature crystal sphere)",
      "duration": "Instantaneous",
      "description": "A frigid globe streaks from you to a point of\n\nyour choice within range, where it explodes in a\n\n60-foot-radius Sphere. Each creature in that area\n\nmakes a Constitution saving throw, taking 10d6\n\nCold damage on failed save or half as much damage\n\non a successful one.\n\n  If the globe strikes a body of water, it freezes the\n\nwater to a depth of 6 inches over an area 30 feet\n\nsquare. This ice lasts for 1 minute. Creatures that\n\nwere swimming on the surface of frozen water are\n\ntrapped in the ice and have the Restrained condition. A trapped creature can take an action to make\n\na Strength (Athletics) check against your spell save\n\nDC to break free.\n\n  You can refrain from firing the globe after completing the spell’s casting. If you do so, a globe about\n\nthe size of a sling bullet, cool to the touch, appears\nin your hand. At any time, you or a creature you\ngive the globe to can throw the globe (to a range of\n\n40 feet) or hurl it with a sling (to the sling’s normal\nrange). It shatters on impact, with the same effect\nas a normal casting of the spell. You can also set the\nglobe down without shattering it. After 1 minute, if\nthe globe hasn’t already shattered, it explodes.\n  Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 6.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 300,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a miniature crystal sphere",
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Gaseous Form",
      "identity_key": "gaseous-form",
      "content_key": "2024:gaseous-form",
      "level": 3,
      "school": "Transmutation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S, M (a bit of gauze)",
      "duration": "Concentration, up to 1 hour",
      "description": "A willing creature you touch shape-shifts, along\nwith everything it’s wearing and carrying, into a\nmisty cloud for the duration. The spell ends on the\ntarget if it drops to 0 Hit Points or if it takes a Magic\naction to end the spell on itself.\n\n\n        While in this form, the target’s only method\n      of movement is a Fly Speed of 10 feet, and it can\n      hover. The target can enter and occupy the space\n      of another creature. The target has Resistance to\n      Bludgeoning, Piercing, and Slashing damage; it has\n      Immunity to the Prone condition; and it has Advantage on Strength, Dexterity, and Constitution saving\n      throws. The target can pass through narrow openings, but it treats liquids as though they were solid\n      surfaces.\n        The target can’t talk or manipulate objects, and\n      any objects it was carrying or holding can’t be\n      dropped, used, or otherwise interacted with. Finally, the target can’t attack or cast spells.\n        Using a Higher-Level Spell Slot. You can target\n      one additional creature for each spell slot level\n      above 3.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a bit of gauze",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Gate",
      "identity_key": "gate",
      "content_key": "2024:gate",
      "level": 9,
      "school": "Conjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S, M (a diamond worth 5,000+ GP)",
      "duration": "Concentration, up to 1 minute",
      "description": "You conjure a portal linking an unoccupied space\n\n      you can see within range to a precise location on a\n\n      different plane of existence. The portal is a circular\n\n      opening, which you can make 5 to 20 feet in diameter. You can orient the portal in any direction you\n      choose. The portal lasts for the duration, and the\n      portal’s destination is visible through it.\n        The portal has a front and a back on each plane\n      where it appears. Travel through the portal is possible only by moving through its front. Anything that\n      does so is instantly transported to the other plane,\n      appearing in the unoccupied space nearest to the\n      portal.\n        Deities and other planar rulers can prevent portals created by this spell from opening in their presence or anywhere within their domains.\n        When you cast this spell, you can speak the name\n      of a specific creature (a pseudonym, title, or nickname doesn’t work). If that creature is on a plane\n      other than the one you are on, the portal opens\n      next to the named creature and transports it to the\n      nearest unoccupied space on your side of the portal.\n      You gain no special power over the creature, and it\n      is free to act as the GM deems appropriate. It might\n      leave, attack you, or help you.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a diamond worth 5,000+ GP",
        "cost": {
          "copper": 500000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Geas",
      "identity_key": "geas",
      "content_key": "2024:geas",
      "level": 5,
      "school": "Enchantment",
      "ritual": false,
      "concentration": false,
      "casting_time": "1 minute",
      "action_type": null,
      "range": "60 feet",
      "components": "V",
      "duration": "30 days",
      "description": "You give a verbal command to a creature that you\ncan see within range, ordering it to carry out some\nservice or refrain from an action or a course of activity as you decide. The target must succeed on a\nWisdom saving throw or have the Charmed condition for the duration. The target automatically succeeds if it can’t understand your command.\n  While Charmed, the creature takes 5d10 Psychic\ndamage if it acts in a manner directly counter to\nyour command. It takes this damage no more than\nonce each day.\n  You can issue any command you choose, short\nof an activity that would result in certain death.\nShould you issue a suicidal command, the spell\nends.\n  A Remove Curse, Greater Restoration, or Wish spell\nends this spell.\n  Using a Higher-Level Spell Slot. If you use a level\n7 or 8 spell slot, the duration is 365 days. If you use\na level 9 spell slot, the spell lasts until it is ended by\none of the spells mentioned above.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 30,
        "unit": "day",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Gentle Repose",
      "identity_key": "gentle-repose",
      "content_key": "2024:gentle-repose",
      "level": 2,
      "school": "Necromancy",
      "ritual": true,
      "concentration": false,
      "casting_time": "Action or Ritual",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S, M (2 Copper Pieces, which the spell consumes)",
      "duration": "10 days",
      "description": "You touch a corpse or other remains. For the duration, the target is protected from decay and can’t\nbecome Undead.\n  The spell also effectively extends the time limit on\nraising the target from the dead, since days spent\nunder the influence of this spell don’t count against\nthe time limit of spells such as Raise Dead.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": true
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "2 Copper Pieces, which the spell consumes",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "day",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Giant Insect",
      "identity_key": "giant-insect",
      "content_key": "2024:giant-insect",
      "level": 4,
      "school": "Conjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S",
      "duration": "Concentration, up to 10 minutes",
      "description": "You summon a giant centipede, spider, or wasp (chosen when you cast the spell). It manifests in an unoccupied space you can see within range and uses\nthe Giant Insect stat block. The form you choose\ndetermines certain details in its stat block. The\ncreature disappears when it drops to 0 Hit Points or\nwhen the spell ends.\n  The creature is an ally to you and your allies. In\ncombat, the creature shares your Initiative count,\nbut it takes its turn immediately after yours. It\nobeys your verbal commands (no action required by\n\nyou). If you don’t issue any, it takes the Dodge action\n\nand uses its movement to avoid danger.\n\n\n        Using a Higher-Level Spell Slot. Use the spell\n      slot’s level for the spell’s level in the stat block.\n\n      Giant Insect\n      Large Beast, Unaligned\n      AC 11 + the spell’s level\n      HP 30 + 10 for each spell level above 4\n      Speed 40 ft., Climb 40 ft., Fly 40 ft. (Wasp only)\n                MOD SAVE             MOD SAVE              MOD SAVE\n      Str 17 +3 +3         Dex 13 +1 +1         Con 15 +2 +2\n      Int 4 −3 −3          Wis 14 +2 +2         Cha 3 −4 −4\n\n      Senses Darkvision 60 ft.; Passive Perception 12\n      Languages Understands the languages you know\n      CR None (XP 0; PB equals your Proficiency Bonus)\n\n      Traits\n      Spider Climb. The insect can climb difficult surfaces,\n      including along ceilings, without needing to make an\n      ability check.\n\n      Actions\n      Multiattack. The insect makes a number of attacks\n\n      equal to half this spell’s level (round down).\n\n      Poison Jab. Melee Attack Roll: Bonus equals your spell\n      attack modifier, reach 10 ft. Hit: 1d6 + 3 plus the spell’s\n      level Piercing damage plus 1d4 Poison damage.\n      Web Bolt (Spider Only). Ranged Attack Roll: Bonus\n      equals your spell attack modifier, range 60 ft. Hit: 1d10\n      + 3 plus the spell’s level Bludgeoning damage, and the\n      target’s Speed is reduced to 0 until the start of the insect’s next turn.\n\n      Bonus Actions\n      Venomous Spew (Centipede Only). Constitution Saving\n      Throw: Your spell save DC, one creature the insect can\n      see within 10 feet. Failure: The target has the Poisoned\n      condition until the start of the insect’s next turn.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Glibness",
      "identity_key": "glibness",
      "content_key": "2024:glibness",
      "level": 8,
      "school": "Enchantment",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V",
      "duration": "1 hour",
      "description": "Until the spell ends, when you make a Charisma\n\n      check, you can replace the number you roll with a\n\n      15. Additionally, no matter what you say, magic that\n\n      would determine if you are telling the truth indicates that you are being truthful.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Globe of Invulnerability",
      "identity_key": "globe-of-invulnerability",
      "content_key": "2024:globe-of-invulnerability",
      "level": 6,
      "school": "Abjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S, M (a glass bead)",
      "duration": "Concentration, up to 1 minute",
      "description": "An immobile, shimmering barrier appears in a 10-\nfoot Emanation around you and remains for the\nduration.\n  Any spell of level 5 or lower cast from outside the\nbarrier can’t affect anything within it. Such a spell\ncan target creatures and objects within the barrier,\nbut the spell has no effect on them. Similarly, the\narea within the barrier is excluded from areas of\neffect created by such spells.\n  Using a Higher-Level Spell Slot. The barrier\nblocks spells of 1 level higher for each spell slot level\nabove 6.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a glass bead",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Glyph of Warding",
      "identity_key": "glyph-of-warding",
      "content_key": "2024:glyph-of-warding",
      "level": 3,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "1 hour",
      "action_type": null,
      "range": "Touch",
      "components": "V, S, M (powdered diamond worth 200+ GP, which the spell consumes)",
      "duration": "Until dispelled or triggered",
      "description": "You inscribe a glyph that later unleashes a magical\n\neffect. You inscribe it either on a surface (such as a\ntable or a section of floor) or within an object that\ncan be closed (such as a book or chest) to conceal\nthe glyph. The glyph can cover an area no larger\nthan 10 feet in diameter. If the surface or object is\nmoved more than 10 feet from where you cast this\nspell, the glyph is broken, and the spell ends without being triggered.\n   The glyph is nearly imperceptible and requires a\nsuccessful Wisdom (Perception) check against your\nspell save DC to notice.\n   When you inscribe the glyph, you set its trigger\nand choose whether it’s an explosive rune or a spell\nglyph, as explained below.\n   Set the Trigger. You decide what triggers the\nglyph when you cast the spell. For glyphs inscribed\non a surface, common triggers include touching or\nstepping on the glyph, removing another object covering it, or approaching within a certain distance of\nit. For glyphs inscribed within an object, common\ntriggers include opening that object or seeing the\nglyph. Once a glyph is triggered, this spell ends.\n   You can refine the trigger so that only creatures\n\nof certain types activate it (for example, the glyph\n\ncould be set to affect Aberrations). You can also set\n\nconditions for creatures that don’t trigger the glyph,\n\nsuch as those who say a certain password.\n\n   Explosive Rune. When triggered, the glyph erupts\nwith magical energy in a 20-foot-radius Sphere centered on the glyph. Each creature in the area makes\n\na Dexterity saving throw. A creature takes 5d8 Acid,\nCold, Fire, Lightning, or Thunder damage (your\n\n\n      choice when you create the glyph) on a failed save\n      or half as much damage on a successful one.\n        Spell Glyph. You can store a prepared spell of\n      level 3 or lower in the glyph by casting it as part of\n      creating the glyph. The spell must target a single\n      creature or an area. The spell being stored has no\n      immediate effect when cast in this way.\n        When the glyph is triggered, the stored spell\n      takes effect. If the spell has a target, it targets the\n      creature that triggered the glyph. If the spell affects\n      an area, the area is centered on that creature. If the\n      spell summons Hostile creatures or creates harmful\n      objects or traps, they appear as close as possible to\n      the intruder and attack it. If the spell requires Concentration, it lasts until the end of its full duration.\n        Using a Higher-Level Spell Slot. The damage of\n      an explosive rune increases by 1d8 for each spell\n      slot level above 3. If you create a spell glyph, you can\n      store any spell of up to the same level as the spell\n      slot you use for the Glyph of Warding.",
      "casting_time_value": {
        "options": [
          {
            "unit": "hour",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "powdered diamond worth 200+ GP, which the spell consumes",
        "cost": {
          "copper": 20000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "until_dispelled",
        "or_triggered": true
      }
    },
    {
      "name": "Goodberry",
      "identity_key": "goodberry",
      "content_key": "2024:goodberry",
      "level": 1,
      "school": "Conjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S, M (a sprig of mistletoe)",
      "duration": "24 hours",
      "description": "Ten berries appear in your hand and are infused\n      with magic for the duration. A creature can take a\n      Bonus Action to eat one berry. Eating a berry restores 1 Hit Point, and the berry provides enough\n      nourishment to sustain a creature for one day.\n        Uneaten berries disappear when the spell ends.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a sprig of mistletoe",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 24,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Grease",
      "identity_key": "grease",
      "content_key": "2024:grease",
      "level": 1,
      "school": "Conjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S, M (a bit of pork rind or butter)",
      "duration": "1 minute",
      "description": "Nonflammable grease covers the ground in a 10-\n      foot square centered on a point within range and\n      turns it into Difficult Terrain for the duration.\n        When the grease appears, each creature standing in its area must succeed on a Dexterity saving\n      throw or have the Prone condition. A creature that\n      enters the area or ends its turn there must also succeed on that save or fall Prone.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a bit of pork rind or butter",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Greater Invisibility",
      "identity_key": "greater-invisibility",
      "content_key": "2024:greater-invisibility",
      "level": 4,
      "school": "Illusion",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S",
      "duration": "Concentration, up to 1 minute",
      "description": "A creature you touch has the Invisible condition until the spell ends.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Greater Restoration",
      "identity_key": "greater-restoration",
      "content_key": "2024:greater-restoration",
      "level": 5,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S, M (diamond dust worth 100+ GP, which the spell consumes)",
      "duration": "Instantaneous",
      "description": "You touch a creature and magically remove one of\nthe following effects from it:\n\n• 1 Exhaustion level\n• The Charmed or Petrified condition\n• A curse, including the target’s Attunement to a\n  cursed magic item\n• Any reduction to one of the target’s ability scores\n• Any reduction to the target’s Hit Point maximum",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "diamond dust worth 100+ GP, which the spell consumes",
        "cost": {
          "copper": 10000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Guardian of Faith",
      "identity_key": "guardian-of-faith",
      "content_key": "2024:guardian-of-faith",
      "level": 4,
      "school": "Conjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V",
      "duration": "8 hours",
      "description": "A Large spectral guardian appears and hovers for\nthe duration in an unoccupied space that you can\nsee within range. The guardian occupies that space\nand is invulnerable, and it appears in a form appropriate for your deity or pantheon.\n  Any enemy that moves to a space within 10 feet of\nthe guardian for the first time on a turn or starts its\nturn there makes a Dexterity saving throw, taking\n20 Radiant damage on a failed save or half as much\ndamage on a successful one. The guardian vanishes\nwhen it has dealt a total of 60 damage.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 8,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Guards and Wards",
      "identity_key": "guards-and-wards",
      "content_key": "2024:guards-and-wards",
      "level": 6,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "1 hour",
      "action_type": null,
      "range": "Touch",
      "components": "V, S, M (a silver rod worth 10+ GP)",
      "duration": "24 hours",
      "description": "You create a ward that protects up to 2,500 square\nfeet of floor space. The warded area can be up to\n20 feet tall, and you shape it as one 50-foot square,\none hundred 5-foot squares that are contiguous, or\ntwenty-five 10-foot squares that are contiguous.\n  When you cast this spell, you can specify individuals that are unaffected by the spell’s effects. You can\nalso specify a password that, when spoken aloud\nwithin 5 feet of the warded area, makes the speaker\nimmune to its effects.\n\n\n        The spell creates the effects below within the\n      warded area. Dispel Magic has no effect on Guards\n      and Wards itself, but each of the following effects\n      can be dispelled. If all four are dispelled, Guards and\n      Wards ends. If you cast the spell every day for 365\n      days on the same area, the spell thereafter lasts until all its effects are dispelled.\n        Corridors. Fog fills all the warded corridors,\n      making them Heavily Obscured. In addition, at each\n      intersection or branching passage offering a choice\n      of direction, there is a 50 percent chance that a\n      creature other than you believes it is going in the\n      opposite direction from the one it chooses.\n        Doors. All doors in the warded area are magically\n      locked, as if sealed by the Arcane Lock spell. In addition, you can cover up to ten doors with an illusion\n      to make them appear as plain sections of wall.\n        Stairs. Webs fill all stairs in the warded area from\n      top to bottom, as in the Web spell. These strands\n      regrow in 10 minutes if they are destroyed while\n      Guards and Wards lasts.\n        Other Spell Effect. Place one of the following magical effects within the warded area:\n      • Dancing Lights in four corridors, with a simple\n        program that the lights repeat as long as Guards\n        and Wards lasts\n      • Magic Mouth in two locations\n      • Stinking Cloud in two locations (the vapors return\n        within 10 minutes if dispersed while Guards and\n        Wards lasts)\n\n      • Gust of Wind in one corridor or room (the wind\n\n        blows continuously while the spell lasts)\n      • Suggestion in one 5-foot square; any creature\n        that enters that square receives the suggestion\n        mentally",
      "casting_time_value": {
        "options": [
          {
            "unit": "hour",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a silver rod worth 10+ GP",
        "cost": {
          "copper": 1000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "timed",
        "amount": 24,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Guidance",
      "identity_key": "guidance",
      "content_key": "2024:guidance",
      "level": 0,
      "school": "Divination",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S",
      "duration": "Concentration, up to 1 minute",
      "description": "You touch a willing creature and choose a skill. Until\n      the spell ends, the creature adds 1d4 to any ability\n      check using the chosen skill.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Guiding Bolt",
      "identity_key": "guiding-bolt",
      "content_key": "2024:guiding-bolt",
      "level": 1,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "V, S",
      "duration": "1 round",
      "description": "You hurl a bolt of light toward a creature within\n      range. Make a ranged spell attack against the target. On a hit, it takes 4d6 Radiant damage, and the\n\n\nnext attack roll made against it before the end of\nyour next turn has Advantage.\n  Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 1.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "round",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Gust of Wind",
      "identity_key": "gust-of-wind",
      "content_key": "2024:gust-of-wind",
      "level": 2,
      "school": "Evocation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S, M (a legume seed)",
      "duration": "Concentration, up to 1 minute",
      "description": "A Line of strong wind 60 feet long and 10 feet wide\nblasts from you in a direction you choose for the\nduration. Each creature in the Line must succeed on\na Strength saving throw or be pushed 15 feet away\nfrom you in a direction following the Line. A creature that ends its turn in the Line must make the\nsame save.\n  Any creature in the Line must spend 2 feet of\nmovement for every 1 foot it moves when moving\ncloser to you.\n  The gust disperses gas or vapor, and it extinguishes candles and similar unprotected flames in\nthe area. It causes protected flames, such as those\nof lanterns, to dance wildly and has a 50 percent\nchance to extinguish them.\n  As a Bonus Action on your later turns, you can\nchange the direction in which the Line blasts from\nyou.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a legume seed",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Hallow",
      "identity_key": "hallow",
      "content_key": "2024:hallow",
      "level": 5,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "24 hours",
      "action_type": null,
      "range": "Touch",
      "components": "V, S, M (incense worth 1,000+ GP, which the spell consumes)",
      "duration": "Until dispelled",
      "description": "You touch a point and infuse an area around it with\nholy or unholy power. The area can have a radius up\nto 60 feet, and the spell fails if the radius includes\nan area already under the effect of Hallow. The affected area has the following effects.\n  Hallowed Ward. Choose any of these creature\ntypes: Aberration, Celestial, Elemental, Fey, Fiend,\nor Undead. Creatures of the chosen types can’t\nwillingly enter the area, and any creature that is\npossessed by or that has the Charmed or Frightened condition from such creatures isn’t possessed,\nCharmed, or Frightened by them while in the area.\n  Extra Effect. You bind an extra effect to the area\nfrom the list below:\n\nCourage. Creatures of any types you choose can’t\n gain the Frightened condition while in the area.\nDarkness. Darkness fills the area. Normal light, as\n well as magical light created by spells of a level\n lower than this spell, can’t illuminate the area.\n\n\n      Daylight. Bright light fills the area. Magical Darkness created by spells of a level lower than this\n        spell can’t extinguish the light.\n      Peaceful Rest. Dead bodies interred in the area\n        can’t be turned into Undead.\n      Extradimensional Interference. Creatures of any\n        types you choose can’t enter or exit the area using\n        teleportation or interplanar travel.\n      Fear. Creatures of any types you choose have the\n        Frightened condition while in the area.\n      Resistance. Creatures of any types you choose have\n        Resistance to one damage type of your choice\n        while in the area.\n      Silence. No sound can emanate from within the\n        area, and no sound can reach into it.\n      Tongues. Creatures of any types you choose can\n        communicate with any other creature in the area\n        even if they don’t share a common language.\n      Vulnerability. Creatures of any types you choose\n        have Vulnerability to one damage type of your\n        choice while in the area.",
      "casting_time_value": {
        "options": [
          {
            "unit": "hour",
            "amount": 24,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "incense worth 1,000+ GP, which the spell consumes",
        "cost": {
          "copper": 100000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "until_dispelled",
        "or_triggered": false
      }
    },
    {
      "name": "Hallucinatory Terrain",
      "identity_key": "hallucinatory-terrain",
      "content_key": "2024:hallucinatory-terrain",
      "level": 4,
      "school": "Illusion",
      "ritual": false,
      "concentration": false,
      "casting_time": "10 minutes",
      "action_type": null,
      "range": "300 feet",
      "components": "V, S, M (a mushroom)",
      "duration": "24 hours",
      "description": "You make natural terrain in a 150-foot Cube in\n      range look, sound, and smell like another sort of\n      natural terrain. Thus, open fields or a road can be\n      made to resemble a swamp, hill, crevasse, or some\n      other difficult or impassable terrain. A pond can be\n      made to seem like a grassy meadow, a precipice like\n      a gentle slope, or a rock-strewn gully like a wide and\n      smooth road. Manufactured structures, equipment,\n      and creatures within the area aren’t changed.\n         The tactile characteristics of the terrain are unchanged, so creatures entering the area are likely\n      to notice the illusion. If the difference isn’t obvious\n      by touch, a creature examining the illusion can take\n      the Study action to make an Intelligence (Investigation) check against your spell save DC to disbelieve\n      it. If a creature discerns that the terrain is illusory,\n      the creature sees a vague image superimposed on\n      the real terrain.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 10,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 300,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a mushroom",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 24,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Harm",
      "identity_key": "harm",
      "content_key": "2024:harm",
      "level": 6,
      "school": "Necromancy",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "You unleash virulent magic on a creature you can\n      see within range. The target makes a Constitution saving throw. On a failed save, it takes 14d6\n\n\nNecrotic damage, and its Hit Point maximum is reduced by an amount equal to the Necrotic damage\nit took. On a successful save, it takes half as much\ndamage only. This spell can’t reduce a target’s Hit\nPoint maximum below 1.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Haste",
      "identity_key": "haste",
      "content_key": "2024:haste",
      "level": 3,
      "school": "Transmutation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S, M (a shaving of licorice root)",
      "duration": "Concentration, up to 1 minute",
      "description": "Choose a willing creature that you can see within\nrange. Until the spell ends, the target’s Speed is\ndoubled, it gains a +2 bonus to Armor Class, it has\nAdvantage on Dexterity saving throws, and it gains\nan additional action on each of its turns. That action can be used to take only the Attack (one attack\nonly), Dash, Disengage, Hide, or Utilize action.\n  When the spell ends, the target is Incapacitated\nand has a Speed of 0 until the end of its next turn, as\na wave of lethargy washes over it.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a shaving of licorice root",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Heal",
      "identity_key": "heal",
      "content_key": "2024:heal",
      "level": 6,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "Choose a creature that you can see within range.\nPositive energy washes through the target, restoring 70 Hit Points. This spell also ends the Blinded,\nDeafened, and Poisoned conditions on the target.\n  Using a Higher-Level Spell Slot. The healing increases by 10 for each spell slot level above 6.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Healing Word",
      "identity_key": "healing-word",
      "content_key": "2024:healing-word",
      "level": 1,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Bonus Action",
      "action_type": "Bonus Action",
      "range": "60 feet",
      "components": "V",
      "duration": "Instantaneous",
      "description": "A creature of your choice that you can see within\nrange regains Hit Points equal to 2d4 plus your\nspellcasting ability modifier.\n  Using a Higher-Level Spell Slot. The healing increases by 2d4 for each spell slot level above 1.",
      "casting_time_value": {
        "options": [
          {
            "unit": "bonus_action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Heat Metal",
      "identity_key": "heat-metal",
      "content_key": "2024:heat-metal",
      "level": 2,
      "school": "Transmutation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S, M (a piece of iron and a flame)",
      "duration": "Concentration, up to 1 minute",
      "description": "Choose a manufactured metal object, such as a\n      metal weapon or a suit of Heavy or Medium metal\n      armor, that you can see within range. You cause\n\n      the object to glow red-hot. Any creature in physical\n\n      contact with the object takes 2d8 Fire damage when\n\n      you cast the spell. Until the spell ends, you can take\n\n      a Bonus Action on each of your later turns to deal\n\n      this damage again if the object is within range.\n\n        If a creature is holding or wearing the object and\n\n      takes the damage from it, the creature must succeed on a Constitution saving throw or drop the\n      object if it can. If it doesn’t drop the object, it has\n      Disadvantage on attack rolls and ability checks until the start of your next turn.\n        Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 2.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a piece of iron and a flame",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Hellish Rebuke",
      "identity_key": "hellish-rebuke",
      "content_key": "2024:hellish-rebuke",
      "level": 1,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Reaction, which you take in response to taking damage from a creature that you can see within 60 feet of yourself",
      "action_type": "Reaction",
      "range": "60 feet",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "The creature that damaged you is momentarily surrounded by green flames. It makes a Dexterity saving throw, taking 2d10 Fire damage on a failed save\n\n      or half as much damage on a successful one.\n\n        Using a Higher-Level Spell Slot. The damage increases by 1d10 for each spell slot level above 1.",
      "casting_time_value": {
        "options": [
          {
            "unit": "reaction",
            "trigger": "which you take in response to taking damage from a creature that you can see within 60 feet of yourself",
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Heroes’ Feast",
      "identity_key": "heroes-feast",
      "content_key": "2024:heroes-feast",
      "level": 6,
      "school": "Conjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "10 minutes",
      "action_type": null,
      "range": "Self",
      "components": "V, S, M (a gem-encrusted bowl worth 1,000+ GP, which the spell consumes)",
      "duration": "Instantaneous",
      "description": "You conjure a feast that appears on a surface in\n      an unoccupied 10-foot Cube next to you. The feast\n      takes 1 hour to consume and disappears at the end\n      of that time, and the beneficial effects don’t set in\n      until this hour is over. Up to twelve creatures can\n      partake of the feast.\n        A creature that partakes gains several benefits,\n      which last for 24 hours. The creature has Resistance to Poison damage, and it has Immunity to the\n      Frightened and Poisoned conditions. Its Hit Point\n      maximum also increases by 2d10, and it gains the\n      same number of Hit Points.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 10,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a gem-encrusted bowl worth 1,000+ GP, which the spell consumes",
        "cost": {
          "copper": 100000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Heroism",
      "identity_key": "heroism",
      "content_key": "2024:heroism",
      "level": 1,
      "school": "Enchantment",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S",
      "duration": "Concentration, up to 1 minute",
      "description": "A willing creature you touch is imbued with bravery. Until the spell ends, the creature is immune to\n\nthe Frightened condition and gains Temporary Hit\n\nPoints equal to your spellcasting ability modifier at\n\nthe start of each of its turns.\n\n  Using a Higher-Level Spell Slot. You can target\n\none additional creature for each spell slot level\n\nabove 1.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Hex",
      "identity_key": "hex",
      "content_key": "2024:hex",
      "level": 1,
      "school": "Enchantment",
      "ritual": false,
      "concentration": true,
      "casting_time": "Bonus Action",
      "action_type": "Bonus Action",
      "range": "90 feet",
      "components": "V, S, M (the petrified eye of a newt)",
      "duration": "Concentration, up to 1 hour",
      "description": "You place a curse on a creature that you can see\nwithin range. Until the spell ends, you deal an extra\n1d6 Necrotic damage to the target whenever you hit\nit with an attack roll. Also, choose one ability when\nyou cast the spell. The target has Disadvantage on\nability checks made with the chosen ability.\n   If the target drops to 0 Hit Points before this spell\nends, you can take a Bonus Action on a later turn to\n\ncurse a new creature.\n\n   Using a Higher-Level Spell Slot. Your Concentration can last longer with a spell slot of level 2 (up to\n\n4 hours), 3–4 (up to 8 hours), or 5+ (24 hours).",
      "casting_time_value": {
        "options": [
          {
            "unit": "bonus_action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 90,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "the petrified eye of a newt",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Hideous Laughter",
      "identity_key": "hideous-laughter",
      "content_key": "2024:hideous-laughter",
      "level": 1,
      "school": "Enchantment",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S, M (a tart and a feather)",
      "duration": "Concentration, up to 1 minute",
      "description": "One creature of your choice that you can see within\nrange makes a Wisdom saving throw. On a failed\nsave, it has the Prone and Incapacitated conditions\nfor the duration. During that time, it laughs uncontrollably if it’s capable of laughter, and it can’t end\nthe Prone condition on itself.\n  At the end of each of its turns and each time it\ntakes damage, it makes another Wisdom saving\nthrow. The target has Advantage on the save if the\nsave is triggered by damage. On a successful save,\nthe spell ends.\n  Using a Higher-Level Spell Slot. You can target\none additional creature for each spell slot level\nabove 1.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a tart and a feather",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Hold Monster",
      "identity_key": "hold-monster",
      "content_key": "2024:hold-monster",
      "level": 5,
      "school": "Enchantment",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "90 feet",
      "components": "V, S, M (a straight piece of iron)",
      "duration": "Concentration, up to 1 minute",
      "description": "Choose a creature that you can see within range.\n\n      The target must succeed on a Wisdom saving throw\n\n      or have the Paralyzed condition for the duration. At\n\n      the end of each of its turns, the target repeats the\n      save, ending the spell on itself on a success.\n        Using a Higher-Level Spell Slot. You can target\n      one additional creature for each spell slot level\n\n      above 5.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 90,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a straight piece of iron",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Hold Person",
      "identity_key": "hold-person",
      "content_key": "2024:hold-person",
      "level": 2,
      "school": "Enchantment",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S, M (a straight piece of iron)",
      "duration": "Concentration, up to 1 minute",
      "description": "Choose a Humanoid that you can see within range.\n\n      The target must succeed on a Wisdom saving throw\n\n      or have the Paralyzed condition for the duration. At\n\n      the end of each of its turns, the target repeats the\n\n      save, ending the spell on itself on a success.\n        Using a Higher-Level Spell Slot. You can target\n      one additional Humanoid for each spell slot level\n      above 2.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a straight piece of iron",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Holy Aura",
      "identity_key": "holy-aura",
      "content_key": "2024:holy-aura",
      "level": 8,
      "school": "Abjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S, M (a reliquary worth 1,000+ GP)",
      "duration": "Concentration, up to 1 minute",
      "description": "For the duration, you emit an aura in a 30-foot Emanation. While in the aura, creatures of your choice\n\n      have Advantage on all saving throws, and other\n\n      creatures have Disadvantage on attack rolls against\n\n      them. In addition, when a Fiend or an Undead hits\n\n      an affected creature with a melee attack roll, the attacker must succeed on a Constitution saving throw\n      or have the Blinded condition until the end of its\n      next turn.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a reliquary worth 1,000+ GP",
        "cost": {
          "copper": 100000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Hunter’s Mark",
      "identity_key": "hunter-s-mark",
      "content_key": "2024:hunter-s-mark",
      "level": 1,
      "school": "Divination",
      "ritual": false,
      "concentration": true,
      "casting_time": "Bonus Action",
      "action_type": "Bonus Action",
      "range": "90 feet",
      "components": "V",
      "duration": "Concentration, up to 1 hour",
      "description": "You magically mark one creature you can see within\n\n      range as your quarry. Until the spell ends, you deal\n\n      an extra 1d6 Force damage to the target whenever\n\n      you hit it with an attack roll. You also have Advantage on any Wisdom (Perception or Survival) check\n      you make to find it.\n\n\n  If the target drops to 0 Hit Points before this spell\nends, you can take a Bonus Action to move the mark\nto a new creature you can see within range.\n\n  Using a Higher-Level Spell Slot. Your Concentration can last longer with a spell slot of level 3–4 (up\n\nto 8 hours) or 5+ (up to 24 hours).",
      "casting_time_value": {
        "options": [
          {
            "unit": "bonus_action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 90,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Hypnotic Pattern",
      "identity_key": "hypnotic-pattern",
      "content_key": "2024:hypnotic-pattern",
      "level": 3,
      "school": "Illusion",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "S, M (a pinch of confetti)",
      "duration": "Concentration, up to 1 minute",
      "description": "You create a twisting pattern of colors in a 30-foot\nCube within range. The pattern appears for a moment and vanishes. Each creature in the area who\ncan see the pattern must succeed on a Wisdom\nsaving throw or have the Charmed condition for the\nduration. While Charmed, the creature has the Incapacitated condition and a Speed of 0.\n\n  The spell ends for an affected creature if it takes\n\nany damage or if someone else uses an action to\n\nshake the creature out of its stupor.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": false,
        "somatic": true,
        "material": "a pinch of confetti",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Ice Knife",
      "identity_key": "ice-knife",
      "content_key": "2024:ice-knife",
      "level": 1,
      "school": "Conjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "S, M (a drop of water or a piece of ice)",
      "duration": "Instantaneous",
      "description": "You create a shard of ice and fling it at one creature\nwithin range. Make a ranged spell attack against\nthe target. On a hit, the target takes 1d10 Piercing\ndamage. Hit or miss, the shard then explodes. The\n\ntarget and each creature within 5 feet of it must\n\nsucceed on a Dexterity saving throw or take 2d6\n\nCold damage.\n\n  Using a Higher-Level Spell Slot. The Cold damage\n\nincreases by 1d6 for each spell slot level above 1.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": false,
        "somatic": true,
        "material": "a drop of water or a piece of ice",
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Ice Storm",
      "identity_key": "ice-storm",
      "content_key": "2024:ice-storm",
      "level": 4,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "300 feet",
      "components": "V, S, M (a mitten)",
      "duration": "Instantaneous",
      "description": "Hail falls in a 20-foot-radius, 40-foot-high Cylinder\ncentered on a point within range. Each creature\nin the Cylinder makes a Dexterity saving throw. A\ncreature takes 2d10 Bludgeoning damage and 4d6\n\nCold damage on a failed save or half as much damage on a successful one.\n\n  Hailstones turn ground in the Cylinder into Difficult Terrain until the end of your next turn.\n\n\n        Using a Higher-Level Spell Slot. The Bludgeoning\n      damage increases by 1d10 for each spell slot level\n      above 4.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 300,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a mitten",
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Identify",
      "identity_key": "identify",
      "content_key": "2024:identify",
      "level": 1,
      "school": "Divination",
      "ritual": true,
      "concentration": false,
      "casting_time": "1 minute or Ritual",
      "action_type": null,
      "range": "Touch",
      "components": "V, S, M (a pearl worth 100+ GP)",
      "duration": "Instantaneous",
      "description": "You touch an object throughout the spell’s casting.\n      If the object is a magic item or some other magical object, you learn its properties and how to use\n      them, whether it requires Attunement, and how\n      many charges it has, if any. You learn whether any\n      ongoing spells are affecting the item and what they\n      are. If the item was created by a spell, you learn that\n      spell’s name.\n         If you instead touch a creature throughout the\n      casting, you learn which ongoing spells, if any, are\n      currently affecting it.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": true
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a pearl worth 100+ GP",
        "cost": {
          "copper": 10000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Illusory Script",
      "identity_key": "illusory-script",
      "content_key": "2024:illusory-script",
      "level": 1,
      "school": "Illusion",
      "ritual": true,
      "concentration": false,
      "casting_time": "1 minute or Ritual",
      "action_type": null,
      "range": "Touch",
      "components": "S, M (ink worth 10+ GP, which the spell consumes)",
      "duration": "10 days",
      "description": "You write on parchment, paper, or another suitable\n      material and imbue it with an illusion that lasts for\n      the duration. To you and any creatures you designate when you cast the spell, the writing appears\n      normal, seems to be written in your hand, and\n      conveys whatever meaning you intended when you\n      wrote the text. To all others, the writing appears as\n      if it were written in an unknown or magical script\n      that is unintelligible. Alternatively, the illusion can\n      alter the meaning, handwriting, and language of the\n      text, though the language must be one you know.\n         If the spell is dispelled, the original script and the\n      illusion both disappear.\n         A creature that has Truesight can read the hidden\n      message.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": true
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": false,
        "somatic": true,
        "material": "ink worth 10+ GP, which the spell consumes",
        "cost": {
          "copper": 1000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "day",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Imprisonment",
      "identity_key": "imprisonment",
      "content_key": "2024:imprisonment",
      "level": 9,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "1 minute",
      "action_type": null,
      "range": "30 feet",
      "components": "V, S, M (a statuette of the target worth 5,000+ GP)",
      "duration": "Until dispelled",
      "description": "You create a magical restraint to hold a creature\n      that you can see within range. The target must\n      make a Wisdom saving throw. On a successful save,\n      the target is unaffected, and it is immune to this\n\n\nspell for the next 24 hours. On a failed save, the\ntarget is imprisoned. While imprisoned, the target\ndoesn’t need to breathe, eat, or drink, and it doesn’t\nage. Divination spells can’t locate or perceive the\nimprisoned target, and the target can’t teleport.\n  Until the spell ends, the target is also affected by\none of the following effects of your choice:\n\n\nBurial. The target is entombed beneath the earth\n  in a hollow globe of magical force that is just large\n  enough to contain the target. Nothing can pass\n  into or out of the globe.\nChaining. Chains firmly rooted in the ground hold\n  the target in place. The target has the Restrained\n  condition and can’t be moved by any means.\nHedged Prison. The target is trapped in a demiplane that is warded against teleportation and\n  planar travel. The demiplane is your choice of a\n  labyrinth, a cage, a tower, or the like.\nMinimus Containment. The target becomes 1 inch\n  tall and is trapped inside an indestructible gemstone or a similar object. Light can pass through\n  the gemstone (allowing the target to see out and\n\n  other creatures to see in), but nothing else can\n\n  pass through by any means.\nSlumber. The target has the Unconscious condition\n  and can’t be awoken.\n\n  Ending the Spell. When you cast the spell, specify\na trigger that will end it. The trigger can be as simple or as elaborate as you choose, but the GM must\nagree that it has a high likelihood of happening\nwithin the next decade. The trigger must be an observable action, such as someone making a particular offering at the temple of your god, saving your\ntrue love, or defeating a specific monster.\n  A Dispel Magic spell can end the spell only if it is\ncast with a level 9 spell slot, targeting either the\nprison or the component used to create it.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a statuette of the target worth 5,000+ GP",
        "cost": {
          "copper": 500000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "until_dispelled",
        "or_triggered": false
      }
    },
    {
      "name": "Incendiary Cloud",
      "identity_key": "incendiary-cloud",
      "content_key": "2024:incendiary-cloud",
      "level": 8,
      "school": "Conjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "150 feet",
      "components": "V, S",
      "duration": "Concentration, up to 1 minute",
      "description": "A swirling cloud of embers and smoke fills a\n20-foot-radius Sphere centered on a point within\nrange. The cloud’s area is Heavily Obscured. It lasts\nfor the duration or until a strong wind (like that\ncreated by Gust of Wind) disperses it.\n  When the cloud appears, each creature in it makes\na Dexterity saving throw, taking 10d8 Fire damage\non a failed save or half as much damage on a successful one. A creature must also make this save\nwhen the Sphere moves into its space and when it\nenters the Sphere or ends its turn there. A creature\nmakes this save only once per turn.\n\n\n        The cloud moves 10 feet away from you in a direction you choose at the start of each of your turns.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 150,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Inflict Wounds",
      "identity_key": "inflict-wounds",
      "content_key": "2024:inflict-wounds",
      "level": 1,
      "school": "Necromancy",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "A creature you touch makes a Constitution saving\n\n      throw, taking 2d10 Necrotic damage on a failed save\n\n      or half as much damage on a successful one.\n\n        Using a Higher-Level Spell Slot. The damage increases by 1d10 for each spell slot level above 1.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Insect Plague",
      "identity_key": "insect-plague",
      "content_key": "2024:insect-plague",
      "level": 5,
      "school": "Conjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "300 feet",
      "components": "V, S, M (a locust)",
      "duration": "Concentration, up to 10 minutes",
      "description": "Swarming locusts fill a 20-foot-radius Sphere\n      centered on a point you choose within range. The\n      Sphere remains for the duration, and its area is\n      Lightly Obscured and Difficult Terrain.\n        When the swarm appears, each creature in it\n      makes a Constitution saving throw, taking 4d10\n      Piercing damage on a failed save or half as much\n\n      damage on a successful one. A creature also makes\n\n      this save when it enters the spell’s area for the first\n\n      time on a turn or ends its turn there. A creature\n\n      makes this save only once per turn.\n\n        Using a Higher-Level Spell Slot. The damage increases by 1d10 for each spell slot level above 5.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 300,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a locust",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Instant Summons",
      "identity_key": "instant-summons",
      "content_key": "2024:instant-summons",
      "level": 6,
      "school": "Conjuration",
      "ritual": true,
      "concentration": false,
      "casting_time": "1 minute or Ritual",
      "action_type": null,
      "range": "Touch",
      "components": "V, S, M (a sapphire worth 1,000+ GP)",
      "duration": "Until dispelled",
      "description": "You touch the sapphire used in the casting and an\n      object weighing 10 pounds or less whose longest\n\n      dimension is 6 feet or less. The spell leaves an Invisible mark on that object and invisibly inscribes the\n\n      object’s name on the sapphire. Each time you cast\n\n      this spell, you must use a different sapphire.\n\n        Thereafter, you can take a Magic action to speak\n\n      the object’s name and crush the sapphire. The object instantly appears in your hand regardless of\n      physical or planar distances, and the spell ends.\n        If another creature is holding or carrying the object, crushing the sapphire doesn’t transport it, but\n      instead you learn who that creature is and where\n      that creature is currently located.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": true
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a sapphire worth 1,000+ GP",
        "cost": {
          "copper": 100000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "until_dispelled",
        "or_triggered": false
      }
    },
    {
      "name": "Irresistible Dance",
      "identity_key": "irresistible-dance",
      "content_key": "2024:irresistible-dance",
      "level": 6,
      "school": "Enchantment",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V",
      "duration": "Concentration, up to 1 minute",
      "description": "One creature that you can see within range must\nmake a Wisdom saving throw. On a successful save,\nthe target dances comically until the end of its next\n\nturn, during which it must spend all its movement\n\nto dance in place.\n\n  On a failed save, the target has the Charmed condition for the duration. While Charmed, the target\n\ndances comically, must use all its movement to\ndance in place, and has Disadvantage on Dexterity\nsaving throws and attack rolls, and other creatures\nhave Advantage on attack rolls against it. On each\n\nof its turns, the target can take an action to collect\nitself and repeat the save, ending the spell on itself\non a success.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Invisibility",
      "identity_key": "invisibility",
      "content_key": "2024:invisibility",
      "level": 2,
      "school": "Illusion",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S, M (an eyelash in gum arabic)",
      "duration": "Concentration, up to 1 hour",
      "description": "A creature you touch has the Invisible condition until the spell ends. The spell ends early immediately\n\nafter the target makes an attack roll, deals damage,\n\nor casts a spell.\n\n  Using a Higher-Level Spell Slot. You can target\n\none additional creature for each spell slot level\n\nabove 2.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "an eyelash in gum arabic",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Jump",
      "identity_key": "jump",
      "content_key": "2024:jump",
      "level": 1,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Bonus Action",
      "action_type": "Bonus Action",
      "range": "Touch",
      "components": "V, S, M (a grasshopper’s hind leg)",
      "duration": "1 minute",
      "description": "You touch a willing creature. Once on each of its\n\nturns until the spell ends, that creature can jump up\n\nto 30 feet by spending 10 feet of movement.\n\n  Using a Higher-Level Spell Slot. You can target\n\none additional creature for each spell slot level\n\nabove 1.",
      "casting_time_value": {
        "options": [
          {
            "unit": "bonus_action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a grasshopper’s hind leg",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Knock",
      "identity_key": "knock",
      "content_key": "2024:knock",
      "level": 2,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V",
      "duration": "Instantaneous",
      "description": "Choose an object that you can see within range. The\n      object can be a door, a box, a chest, a set of manacles, a padlock, or another object that contains a\n      mundane or magical means that prevents access.\n        A target that is held shut by a mundane lock or\n      that is stuck or barred becomes unlocked, unstuck,\n      or unbarred. If the object has multiple locks, only\n      one of them is unlocked.\n        If the target is held shut by Arcane Lock, that spell\n      is suppressed for 10 minutes, during which time the\n      target can be opened and closed.\n        When you cast the spell, a loud knock, audible up\n      to 300 feet away, emanates from the target.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Legend Lore",
      "identity_key": "legend-lore",
      "content_key": "2024:legend-lore",
      "level": 5,
      "school": "Divination",
      "ritual": false,
      "concentration": false,
      "casting_time": "10 minutes",
      "action_type": null,
      "range": "Self",
      "components": "V, S, M (incense worth 250+ GP, which the spell consumes, and four ivory strips worth 50+ GP each)",
      "duration": "Instantaneous",
      "description": "Name or describe a famous person, place, or object.\n      The spell brings to your mind a brief summary of\n      the significant lore about that famous thing, as described by the GM.\n        The lore might consist of important details, amusing revelations, or even secret lore that has never\n      been widely known. The more information you\n      already know about the thing, the more precise and\n      detailed the information you receive is. That information is accurate but might be couched in figurative language or poetry, as determined by the GM.\n        If the famous thing you chose isn’t actually famous, you hear sad musical notes played on a trombone, and the spell fails.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 10,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "incense worth 250+ GP, which the spell consumes, and four ivory strips worth 50+ GP each",
        "cost": {
          "copper": 25000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Lesser Restoration",
      "identity_key": "lesser-restoration",
      "content_key": "2024:lesser-restoration",
      "level": 2,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Bonus Action",
      "action_type": "Bonus Action",
      "range": "Touch",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "You touch a creature and end one condition on it:\n      Blinded, Deafened, Paralyzed, or Poisoned.",
      "casting_time_value": {
        "options": [
          {
            "unit": "bonus_action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Levitate",
      "identity_key": "levitate",
      "content_key": "2024:levitate",
      "level": 2,
      "school": "Transmutation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S, M (a metal spring)",
      "duration": "Concentration, up to 10 minutes",
      "description": "One creature or loose object of your choice that you\n      can see within range rises vertically up to 20 feet\n      and remains suspended there for the duration. The\n\n\nspell can levitate an object that weighs up to 500\npounds. An unwilling creature that succeeds on a\nConstitution saving throw is unaffected.\n  The target can move only by pushing or pulling\nagainst a fixed object or surface within reach (such\nas a wall or a ceiling), which allows it to move as if it\nwere climbing. You can change the target’s altitude\nby up to 20 feet in either direction on your turn. If\nyou are the target, you can move up or down as part\nof your move. Otherwise, you can take a Magic action to move the target, which must remain within\nthe spell’s range.\n  When the spell ends, the target floats gently to the\nground if it is still aloft.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a metal spring",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Light",
      "identity_key": "light",
      "content_key": "2024:light",
      "level": 0,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, M (a firefly or phosphorescent moss)",
      "duration": "1 hour",
      "description": "You touch one Large or smaller object that isn’t\nbeing worn or carried by someone else. Until the\nspell ends, the object sheds Bright Light in a 20-foot\nradius and Dim Light for an additional 20 feet. The\nlight can be colored as you like.\n  Covering the object with something opaque blocks\nthe light. The spell ends if you cast it again.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": "a firefly or phosphorescent moss",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Lightning Bolt",
      "identity_key": "lightning-bolt",
      "content_key": "2024:lightning-bolt",
      "level": 3,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S, M (a bit of fur and a crystal rod)",
      "duration": "Instantaneous",
      "description": "A stroke of lightning forming a 100-foot-long,\n5-foot-wide Line blasts out from you in a direction\nyou choose. Each creature in the Line makes a Dexterity saving throw, taking 8d6 Lightning damage\non a failed save or half as much damage on a successful one.\n\n  Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 3.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a bit of fur and a crystal rod",
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Locate Animals or Plants",
      "identity_key": "locate-animals-or-plants",
      "content_key": "2024:locate-animals-or-plants",
      "level": 2,
      "school": "Divination",
      "ritual": true,
      "concentration": false,
      "casting_time": "Action or Ritual",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S, M (fur from a bloodhound)",
      "duration": "Instantaneous",
      "description": "Describe or name a specific kind of Beast, Plant\n\ncreature, or nonmagical plant. You learn the direction and distance to the closest creature or plant of\nthat kind within 5 miles, if any are present.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": true
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "fur from a bloodhound",
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Locate Creature",
      "identity_key": "locate-creature",
      "content_key": "2024:locate-creature",
      "level": 4,
      "school": "Divination",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S, M (fur from a bloodhound)",
      "duration": "Concentration, up to 1 hour",
      "description": "Describe or name a creature that is familiar to you.\n      You sense the direction to the creature’s location\n      if that creature is within 1,000 feet of you. If the\n      creature is moving, you know the direction of its\n      movement.\n         The spell can locate a specific creature known to\n      you or the nearest creature of a specific kind (such\n      as a human or a unicorn) if you have seen such a\n      creature up close—within 30 feet—at least once.\n      If the creature you described or named is in a different form, such as under the effects of a Flesh to\n      Stone or Polymorph spell, this spell doesn’t locate\n      the creature.\n         This spell can’t locate a creature if any thickness\n      of lead blocks a direct path between you and the\n      creature.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "fur from a bloodhound",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Locate Object",
      "identity_key": "locate-object",
      "content_key": "2024:locate-object",
      "level": 2,
      "school": "Divination",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S, M (a forked twig)",
      "duration": "Concentration, up to 10 minutes",
      "description": "Describe or name an object that is familiar to you.\n      You sense the direction to the object’s location if\n      that object is within 1,000 feet of you. If the object is\n      in motion, you know the direction of its movement.\n         The spell can locate a specific object known to you\n      if you have seen it up close—within 30 feet—at least\n      once. Alternatively, the spell can locate the nearest\n      object of a particular kind, such as a certain kind of\n      apparel, jewelry, furniture, tool, or weapon.\n         This spell can’t locate an object if any thickness\n      of lead blocks a direct path between you and the\n      object.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a forked twig",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Longstrider",
      "identity_key": "longstrider",
      "content_key": "2024:longstrider",
      "level": 1,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S, M (a pinch of dirt)",
      "duration": "1 hour",
      "description": "You touch a creature. The target’s Speed increases\n      by 10 feet until the spell ends.\n        Using a Higher-Level Spell Slot. You can target\n      one additional creature for each spell slot level\n      above 1.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a pinch of dirt",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Mage Armor",
      "identity_key": "mage-armor",
      "content_key": "2024:mage-armor",
      "level": 1,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S, M (a piece of cured leather)",
      "duration": "8 hours",
      "description": "You touch a willing creature who isn’t wearing\narmor. Until the spell ends, the target’s base AC becomes 13 plus its Dexterity modifier. The spell ends\nearly if the target dons armor.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a piece of cured leather",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 8,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Mage Hand",
      "identity_key": "mage-hand",
      "content_key": "2024:mage-hand",
      "level": 0,
      "school": "Conjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S",
      "duration": "1 minute",
      "description": "A spectral, floating hand appears at a point you\nchoose within range. The hand lasts for the duration. The hand vanishes if it is ever more than 30\nfeet away from you or if you cast this spell again.\n  When you cast the spell, you can use the hand to\nmanipulate an object, open an unlocked door or\ncontainer, stow or retrieve an item from an open\ncontainer, or pour the contents out of a vial.\n  As a Magic action on your later turns, you can control the hand thus again. As part of that action, you\n\ncan move the hand up to 30 feet.\n\n  The hand can’t attack, activate magic items, or\n\ncarry more than 10 pounds.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Magic Circle",
      "identity_key": "magic-circle",
      "content_key": "2024:magic-circle",
      "level": 3,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "1 minute",
      "action_type": null,
      "range": "10 feet",
      "components": "V, S, M (salt and powdered silver worth 100+ GP, which the spell consumes)",
      "duration": "1 hour",
      "description": "You create a 10-foot-radius, 20-foot-tall Cylinder of\nmagical energy centered on a point on the ground\nthat you can see within range. Glowing runes appear wherever the Cylinder intersects with the floor\nor other surface.\n  Choose one or more of the following types of creatures: Celestials, Elementals, Fey, Fiends, or Undead.\nThe circle affects a creature of the chosen type in\nthe following ways:\n\n• The creature can’t willingly enter the Cylinder\n  by nonmagical means. If the creature tries to use\n  teleportation or interplanar travel to do so, it\n  must first succeed on a Charisma saving throw.\n• The creature has Disadvantage on attack rolls\n  against targets within the Cylinder.\n\n\n      • Targets within the Cylinder can’t be possessed\n        by or gain the Charmed or Frightened condition\n        from the creature.\n        Each time you cast this spell, you can cause its\n      magic to operate in the reverse direction, preventing a creature of the specified type from leaving the\n\n      Cylinder and protecting targets outside it.\n\n        Using a Higher-Level Spell Slot. The duration increases by 1 hour for each spell slot level above 3.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 10,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "salt and powdered silver worth 100+ GP, which the spell consumes",
        "cost": {
          "copper": 10000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Magic Jar",
      "identity_key": "magic-jar",
      "content_key": "2024:magic-jar",
      "level": 6,
      "school": "Necromancy",
      "ritual": false,
      "concentration": false,
      "casting_time": "1 minute",
      "action_type": null,
      "range": "Self",
      "components": "V, S, M (a gem, crystal, or reliquary worth 500+ GP)",
      "duration": "Until dispelled",
      "description": "Your body falls into a catatonic state as your soul\n      leaves it and enters the container you used for the\n      spell’s Material component. While your soul inhabits the container, you are aware of your surroundings as if you were in the container’s space. You\n\n      can’t move or take Reactions. The only action you\n\n      can take is to project your soul up to 100 feet out of\n      the container, either returning to your living body\n      (and ending the spell) or attempting to possess a\n      Humanoid’s body.\n         You can attempt to possess any Humanoid within\n      100 feet of you that you can see (creatures warded\n      by a Protection from Evil and Good or Magic Circle\n      spell can’t be possessed). The target makes a Charisma saving throw. On a failed save, your soul enters the target’s body, and the target’s soul becomes\n      trapped in the container. On a successful save, the\n      target resists your efforts to possess it, and you\n      can’t attempt to possess it again for 24 hours.\n         Once you possess a creature’s body, you control it.\n      Your Hit Points, Hit Point Dice, Strength, Dexterity,\n      Constitution, Speed, and senses are replaced by the\n      creature’s. You otherwise keep your game statistics.\n         Meanwhile, the possessed creature’s soul can perceive from the container using its own senses, but it\n      can’t move and it is Incapacitated.\n         While possessing a body, you can take a Magic action to return from the host body to the container if\n      it is within 100 feet of you, returning the host creature’s soul to its body. If the host body dies while\n      you’re in it, the creature dies, and you make a Charisma saving throw against your own spellcasting\n      DC. On a success, you return to the container if it is\n      within 100 feet of you. Otherwise, you die.\n\n         If the container is destroyed or the spell ends,\n\n      your soul returns to your body. If your body is more\n\n      than 100 feet away from you or if your body is dead,\n      you die. If another creature’s soul is in the container\n      when it is destroyed, the creature’s soul returns to\n\n\nits body if the body is alive and within 100 feet. Otherwise, that creature dies.\n  When the spell ends, the container is destroyed.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a gem, crystal, or reliquary worth 500+ GP",
        "cost": {
          "copper": 50000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "until_dispelled",
        "or_triggered": false
      }
    },
    {
      "name": "Magic Missile",
      "identity_key": "magic-missile",
      "content_key": "2024:magic-missile",
      "level": 1,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "You create three glowing darts of magical force.\nEach dart strikes a creature of your choice that you\ncan see within range. A dart deals 1d4 + 1 Force\ndamage to its target. The darts all strike simultaneously, and you can direct them to hit one creature or\nseveral.\n  Using a Higher-Level Spell Slot. The spell creates\none more dart for each spell slot level above 1.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Magic Mouth",
      "identity_key": "magic-mouth",
      "content_key": "2024:magic-mouth",
      "level": 2,
      "school": "Illusion",
      "ritual": true,
      "concentration": false,
      "casting_time": "1 minute or Ritual",
      "action_type": null,
      "range": "30 feet",
      "components": "V, S, M (jade dust worth 10+ GP, which the spell consumes)",
      "duration": "Until dispelled",
      "description": "You implant a message within an object in range—a\nmessage that is uttered when a trigger condition is\nmet. Choose an object that you can see and that isn’t\nbeing worn or carried by another creature. Then\nspeak the message, which must be 25 words or\nfewer, though it can be delivered over as long as 10\nminutes. Finally, determine the circumstance that\nwill trigger the spell to deliver your message.\n  When that trigger occurs, a magical mouth appears on the object and recites the message in your\nvoice and at the same volume you spoke. If the object you chose has a mouth or something that looks\nlike a mouth (for example, the mouth of a statue),\nthe magical mouth appears there, so the words\nappear to come from the object’s mouth. When you\ncast this spell, you can have the spell end after it\ndelivers its message, or it can remain and repeat its\nmessage whenever the trigger occurs.\n  The trigger can be as general or as detailed as you\nlike, though it must be based on visual or audible\nconditions that occur within 30 feet of the object.\nFor example, you could instruct the mouth to speak\nwhen any creature moves within 30 feet of the object or when a silver bell rings within 30 feet of it.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": true
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "jade dust worth 10+ GP, which the spell consumes",
        "cost": {
          "copper": 1000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "until_dispelled",
        "or_triggered": false
      }
    },
    {
      "name": "Magic Weapon",
      "identity_key": "magic-weapon",
      "content_key": "2024:magic-weapon",
      "level": 2,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Bonus Action",
      "action_type": "Bonus Action",
      "range": "Touch",
      "components": "V, S",
      "duration": "1 hour",
      "description": "You touch a nonmagical weapon. Until the spell\n\n      ends, that weapon becomes a magic weapon with a\n\n      +1 bonus to attack rolls and damage rolls. The spell\n\n      ends early if you cast it again.\n\n        Using a Higher-Level Spell Slot. The bonus increases to +2 with a level 3–5 spell slot. The bonus\n\n      increases to +3 with a level 6+ spell slot.",
      "casting_time_value": {
        "options": [
          {
            "unit": "bonus_action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Magnificent Mansion",
      "identity_key": "magnificent-mansion",
      "content_key": "2024:magnificent-mansion",
      "level": 7,
      "school": "Conjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "1 minute",
      "action_type": null,
      "range": "300 feet",
      "components": "V, S, M (a miniature door worth 15+ GP)",
      "duration": "24 hours",
      "description": "You conjure a shimmering door in range that lasts\n      for the duration. The door leads to an extradimensional dwelling and is 5 feet wide and 10 feet tall.\n      You and any creature you designate when you cast\n      the spell can enter the extradimensional dwelling\n      as long as the door remains open. You can open or\n      close it (no action required) if you are within 30 feet\n      of it. While closed, the door is imperceptible.\n        Beyond the door is a magnificent foyer with\n      numerous chambers beyond. The dwelling’s atmosphere is clean, fresh, and warm.\n        You can create any floor plan you like for the\n      dwelling, but it can’t exceed 50 contiguous 10-foot\n      Cubes. The place is furnished and decorated as you\n      choose. It contains sufficient food to serve a nine-course banquet for up to 100 people. Furnishings\n      and other objects created by this spell dissipate into\n      smoke if removed from it.\n\n        A staff of 100 near-transparent servants attends\n\n      all who enter. You determine the appearance of\n\n      these servants and their attire. They are invulnerable and obey your commands. Each servant can\n\n      perform tasks that a human could perform, but they\n\n      can’t attack or take any action that would directly\n\n      harm another creature. Thus the servants can fetch\n      things, clean, mend, fold clothes, light fires, serve\n      food, pour wine, and so on. The servants can’t leave\n      the dwelling.\n\n        When the spell ends, any creatures or objects left\n\n      inside the extradimensional space are expelled into\n      the unoccupied spaces nearest to the entrance.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 300,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a miniature door worth 15+ GP",
        "cost": {
          "copper": 1500,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "timed",
        "amount": 24,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Major Image",
      "identity_key": "major-image",
      "content_key": "2024:major-image",
      "level": 3,
      "school": "Illusion",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "V, S, M (a bit of fleece)",
      "duration": "Concentration, up to 10 minutes",
      "description": "You create the image of an object, a creature, or\n      some other visible phenomenon that is no larger\n\n\nthan a 20-foot Cube. The image appears at a spot\nthat you can see within range and lasts for the duration. It seems real, including sounds, smells, and\n\ntemperature appropriate to the thing depicted, but\n\nit can’t deal damage or cause conditions.\n\n   If you are within range of the illusion, you can\n\ntake a Magic action to cause the image to move to\n\nany other spot within range. As the image changes\n\nlocation, you can alter its appearance so that its\n\nmovements appear natural for the image. For example, if you create an image of a creature and move\nit, you can alter the image so that it appears to be\n\nwalking. Similarly, you can cause the illusion to\nmake different sounds at different times, even making it carry on a conversation, for example.\n   Physical interaction with the image reveals it to\nbe an illusion, for things can pass through it. A creature that takes a Study action to examine the image\ncan determine that it is an illusion with a successful Intelligence (Investigation) check against your\nspell save DC. If a creature discerns the illusion for\nwhat it is, the creature can see through the image,\nand its other sensory qualities become faint to the\ncreature.\n   Using a Higher-Level Spell Slot. The spell lasts\nuntil dispelled, without requiring Concentration, if\ncast with a level 4+ spell slot.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a bit of fleece",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Mass Cure Wounds",
      "identity_key": "mass-cure-wounds",
      "content_key": "2024:mass-cure-wounds",
      "level": 5,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "A wave of healing energy washes out from a point\n\nyou can see within range. Choose up to six creatures in a 30-foot-radius Sphere centered on that\n\npoint. Each target regains Hit Points equal to 5d8\n\nplus your spellcasting ability modifier.\n\n  Using a Higher-Level Spell Slot. The healing increases by 1d8 for each spell slot level above 5.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Mass Heal",
      "identity_key": "mass-heal",
      "content_key": "2024:mass-heal",
      "level": 9,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "A flood of healing energy flows from you into\ncreatures around you. You restore up to 700 Hit\nPoints, divided as you choose among any number of\ncreatures that you can see within range. Creatures\nhealed by this spell also have the Blinded, Deafened,\nand Poisoned conditions removed from them.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Mass Healing Word",
      "identity_key": "mass-healing-word",
      "content_key": "2024:mass-healing-word",
      "level": 3,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Bonus Action",
      "action_type": "Bonus Action",
      "range": "60 feet",
      "components": "V",
      "duration": "Instantaneous",
      "description": "Up to six creatures of your choice that you can see\n      within range regain Hit Points equal to 2d4 plus\n      your spellcasting ability modifier.\n        Using a Higher-Level Spell Slot. The healing increases by 1d4 for each spell slot level above 3.",
      "casting_time_value": {
        "options": [
          {
            "unit": "bonus_action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Mass Suggestion",
      "identity_key": "mass-suggestion",
      "content_key": "2024:mass-suggestion",
      "level": 6,
      "school": "Enchantment",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, M (a snake’s tongue)",
      "duration": "24 hours",
      "description": "You suggest a course of activity—described in no\n      more than 25 words—to twelve or fewer creatures\n      you can see within range that can hear and understand you. The suggestion must sound achievable\n      and not involve anything that would obviously deal\n      damage to any of the targets or their allies. For\n      example, you could say, “Walk to the village down\n      that road, and help the villagers there harvest crops\n      until sunset.” Or you could say, “Now is not the time\n      for violence. Drop your weapons, and dance! Stop in\n      an hour.”\n        Each target must succeed on a Wisdom saving\n      throw or have the Charmed condition for the duration or until you or your allies deal damage to the\n      target. Each Charmed target pursues the suggestion\n      to the best of its ability. The suggested activity can\n      continue for the entire duration, but if the suggested activity can be completed in a shorter time,\n      the spell ends for a target upon completing it.\n        Using a Higher-Level Spell Slot. The duration is\n      longer with a spell slot of level 7 (10 days), 8 (30\n      days), or 9 (366 days).",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": "a snake’s tongue",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 24,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Maze",
      "identity_key": "maze",
      "content_key": "2024:maze",
      "level": 8,
      "school": "Conjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S",
      "duration": "Concentration, up to 10 minutes",
      "description": "You banish a creature that you can see within range\n      into a labyrinthine demiplane. The target remains\n      there for the duration or until it escapes the maze.\n        The target can take a Study action to try to escape. When it does so, it makes a DC 20 Intelligence\n      (Investigation) check. If it succeeds, it escapes, and\n      the spell ends.\n\n\n  When the spell ends, the target reappears in the\nspace it left or, if that space is occupied, in the nearest unoccupied space.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Meld into Stone",
      "identity_key": "meld-into-stone",
      "content_key": "2024:meld-into-stone",
      "level": 3,
      "school": "Transmutation",
      "ritual": true,
      "concentration": false,
      "casting_time": "Action or Ritual",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S",
      "duration": "8 hours",
      "description": "You step into a stone object or surface large enough\n\nto fully contain your body, merging yourself and\nyour equipment with the stone for the duration.\nYou must touch the stone to do so. Nothing of your\npresence remains visible or otherwise detectable by\n\n\nnonmagical senses.\n  While merged with the stone, you can’t see what\noccurs outside it, and any Wisdom (Perception)\nchecks you make to hear sounds outside it are made\nwith Disadvantage. You remain aware of the passage of time and can cast spells on yourself while\nmerged in the stone. You can use 5 feet of movement\nto leave the stone where you entered it, which ends\nthe spell. You otherwise can’t move.\n  Minor physical damage to the stone doesn’t harm\nyou, but its partial destruction or a change in its\nshape (to the extent that you no longer fit within it)\nexpels you and deals 6d6 Force damage to you. The\nstone’s complete destruction (or transmutation into\na different substance) expels you and deals 50 Force\ndamage to you. If expelled, you move into an unoccupied space closest to where you first entered and\nhave the Prone condition.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": true
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 8,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Mending",
      "identity_key": "mending",
      "content_key": "2024:mending",
      "level": 0,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "1 minute",
      "action_type": null,
      "range": "Touch",
      "components": "V, S, M (two lodestones)",
      "duration": "Instantaneous",
      "description": "This spell repairs a single break or tear in an object\nyou touch, such as a broken chain link, two halves of\na broken key, a torn cloak, or a leaking wineskin. As\n\n\nlong as the break or tear is no larger than 1 foot in\nany dimension, you mend it, leaving no trace of the\nformer damage.\n   This spell can physically repair a magic item, but\nit can’t restore magic to such an object.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "two lodestones",
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Message",
      "identity_key": "message",
      "content_key": "2024:message",
      "level": 0,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "S, M (a copper wire)",
      "duration": "1 round",
      "description": "You point toward a creature within range and\n      whisper a message. The target (and only the target)\n      hears the message and can reply in a whisper that\n      only you can hear.\n        You can cast this spell through solid objects if you\n      are familiar with the target and know it is beyond\n      the barrier. Magical silence; 1 foot of stone, metal,\n      or wood; or a thin sheet of lead blocks the spell.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": false,
        "somatic": true,
        "material": "a copper wire",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "round",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Meteor Swarm",
      "identity_key": "meteor-swarm",
      "content_key": "2024:meteor-swarm",
      "level": 9,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "1 mile",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "Blazing orbs of fire plummet to the ground at four\n      different points you can see within range. Each\n      creature in a 40-foot-radius Sphere centered on\n      each of those points makes a Dexterity saving\n      throw. A creature takes 20d6 Fire damage and 20d6\n      Bludgeoning damage on a failed save or half as\n      much damage on a successful one. A creature in the\n      area of more than one fiery Sphere is affected only\n      once.\n        A nonmagical object that isn’t being worn or carried also takes the damage if it’s in the spell’s area,\n      and the object starts burning if it’s flammable.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 5280,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Mind Blank",
      "identity_key": "mind-blank",
      "content_key": "2024:mind-blank",
      "level": 8,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S",
      "duration": "24 hours",
      "description": "Until the spell ends, one willing creature you touch\n      has Immunity to Psychic damage and the Charmed\n      condition. The target is also unaffected by anything\n      that would sense its emotions or alignment, read\n      its thoughts, or magically detect its location, and\n\n      no spell—not even Wish—can gather information\n\n      about the target, observe it remotely, or control its\n\n      mind.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 24,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Mind Spike",
      "identity_key": "mind-spike",
      "content_key": "2024:mind-spike",
      "level": 2,
      "school": "Divination",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "S",
      "duration": "Concentration, up to 1 hour",
      "description": "You drive a spike of psionic energy into the mind of\n      one creature you can see within range. The target\n      makes a Wisdom saving throw, taking 3d8 Psychic\n      damage on a failed save or half as much damage on\n      a successful one. On a failed save, you also always\n      know the target’s location until the spell ends, but\n      only while the two of you are on the same plane\n\n\nof existence. While you have this knowledge, the\ntarget can’t become hidden from you, and if it has\nthe Invisible condition, it gains no benefit from that\ncondition against you.\n  Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 2.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": false,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Minor Illusion",
      "identity_key": "minor-illusion",
      "content_key": "2024:minor-illusion",
      "level": 0,
      "school": "Illusion",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "S, M (a bit of fleece)",
      "duration": "1 minute",
      "description": "You create a sound or an image of an object within\n\nrange that lasts for the duration. See the descriptions below for the effects of each. The illusion ends\nif you cast this spell again.\n   If a creature takes a Study action to examine the\nsound or image, the creature can determine that it\nis an illusion with a successful Intelligence (Investigation) check against your spell save DC. If a creature discerns the illusion for what it is, the illusion\nbecomes faint to the creature.\n   Sound. If you create a sound, its volume can range\nfrom a whisper to a scream. It can be your voice,\nsomeone else’s voice, a lion’s roar, a beating of\ndrums, or any other sound you choose. The sound\ncontinues unabated throughout the duration, or you\ncan make discrete sounds at different times before\nthe spell ends.\n   Image. If you create an image of an object—such\nas a chair, muddy footprints, or a small chest—it\nmust be no larger than a 5-foot Cube. The image\ncan’t create sound, light, smell, or any other sensory\neffect. Physical interaction with the image reveals it\nto be an illusion, since things can pass through it.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": false,
        "somatic": true,
        "material": "a bit of fleece",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Mirage Arcane",
      "identity_key": "mirage-arcane",
      "content_key": "2024:mirage-arcane",
      "level": 7,
      "school": "Illusion",
      "ritual": false,
      "concentration": false,
      "casting_time": "10 minutes",
      "action_type": null,
      "range": "Sight",
      "components": "V, S",
      "duration": "10 days",
      "description": "You make terrain in an area up to 1 mile square\nlook, sound, smell, and even feel like some other\nsort of terrain. Open fields or a road could be made\nto resemble a swamp, hill, crevasse, or some other\nrough or impassable terrain. A pond can be made to\nseem like a grassy meadow, a precipice like a gentle\nslope, or a rock-strewn gully like a wide and smooth\nroad.\n  Similarly, you can alter the appearance of structures or add them where none are present. The spell\ndoesn’t disguise, conceal, or add creatures.\n  The illusion includes audible, visual, tactile, and\nolfactory elements, so it can turn clear ground\n\n\n      into Difficult Terrain (or vice versa) or otherwise\n      impede movement through the area. Any piece\n      of the illusory terrain (such as a rock or stick)\n      that is removed from the spell’s area disappears\n      immediately.\n        Creatures with Truesight can see through the illusion to the terrain’s true form; however, all other elements of the illusion remain, so while the creature\n      is aware of the illusion’s presence, the creature can\n      still physically interact with the illusion.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 10,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "sight",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "day",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Mirror Image",
      "identity_key": "mirror-image",
      "content_key": "2024:mirror-image",
      "level": 2,
      "school": "Illusion",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S",
      "duration": "1 minute",
      "description": "Three illusory duplicates of yourself appear in your\n      space. Until the spell ends, the duplicates move with\n      you and mimic your actions, shifting position so it’s\n      impossible to track which image is real.\n        Each time a creature hits you with an attack roll\n      during the spell’s duration, roll a d6 for each of\n      your remaining duplicates. If any of the d6s rolls\n      a 3 or higher, one of the duplicates is hit instead of\n      you, and the duplicate is destroyed. The duplicates\n      otherwise ignore all other damage and effects. The\n      spell ends when all three duplicates are destroyed.\n        A creature is unaffected by this spell if it has the\n      Blinded condition, Blindsight, or Truesight.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Mislead",
      "identity_key": "mislead",
      "content_key": "2024:mislead",
      "level": 5,
      "school": "Illusion",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "S",
      "duration": "Concentration, up to 1 hour",
      "description": "You gain the Invisible condition at the same time\n      that an illusory double of you appears where you\n      are standing. The double lasts for the duration, but\n      the invisibility ends immediately after you make an\n      attack roll, deal damage, or cast a spell.\n        As a Magic action, you can move the illusory double up to twice your Speed and make it gesture,\n      speak, and behave in whatever way you choose. It is\n      intangible and invulnerable.\n        You can see through its eyes and hear through its\n      ears as if you were located where it is.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": false,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Misty Step",
      "identity_key": "misty-step",
      "content_key": "2024:misty-step",
      "level": 2,
      "school": "Conjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Bonus Action",
      "action_type": "Bonus Action",
      "range": "Self",
      "components": "V",
      "duration": "Instantaneous",
      "description": "Briefly surrounded by silvery mist, you teleport up\nto 30 feet to an unoccupied space you can see.",
      "casting_time_value": {
        "options": [
          {
            "unit": "bonus_action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Modify Memory",
      "identity_key": "modify-memory",
      "content_key": "2024:modify-memory",
      "level": 5,
      "school": "Enchantment",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S",
      "duration": "Concentration, up to 1 minute",
      "description": "You attempt to reshape another creature’s memories. One creature that you can see within range\nmakes a Wisdom saving throw. If you are fighting\nthe creature, it has Advantage on the save. On a\n\nfailed save, the target has the Charmed condition\n\nfor the duration. While Charmed in this way, the\n\ntarget also has the Incapacitated condition and is\n\nunaware of its surroundings, though it can hear\nyou. If it takes any damage or is targeted by another\nspell, this spell ends, and no memories are modified.\n  While this charm lasts, you can affect the target’s\nmemory of an event that it experienced within the\nlast 24 hours and that lasted no more than 10 minutes. You can permanently eliminate all memory of\nthe event, allow the target to recall the event with\nperfect clarity, change its memory of the event’s details, or create a memory of some other event.\n  You must speak to the target to describe how its\nmemories are affected, and it must be able to understand your language for the modified memories to\ntake root. Its mind fills in any gaps in the details of\nyour description. If the spell ends before you finish\ndescribing the modified memories, the creature’s\nmemory isn’t altered. Otherwise, the modified\nmemories take hold when the spell ends.\n  A modified memory doesn’t necessarily affect\nhow a creature behaves, particularly if the memory contradicts the creature’s natural inclinations,\nalignment, or beliefs. An illogical modified memory,\nsuch as a false memory of how much the creature\nenjoyed swimming in acid, is dismissed as a bad\ndream. The GM might deem a modified memory too\nnonsensical to affect a creature.\n  A Remove Curse or Greater Restoration spell cast\non the target restores the creature’s true memory.\n  Using a Higher-Level Spell Slot. You can alter the\ntarget’s memories of an event that took place up to\n7 days ago (level 6 spell slot), 30 days ago (level 7\nspell slot), 365 days ago (level 8 spell slot), or any\ntime in the creature’s past (level 9 spell slot).",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Moonbeam",
      "identity_key": "moonbeam",
      "content_key": "2024:moonbeam",
      "level": 2,
      "school": "Evocation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "V, S, M (a moonseed leaf)",
      "duration": "Concentration, up to 1 minute",
      "description": "A silvery beam of pale light shines down in a\n      5-foot-radius, 40-foot-high Cylinder centered on a\n      point within range. Until the spell ends, Dim Light\n      fills the Cylinder, and you can take a Magic action on\n\n      later turns to move the Cylinder up to 60 feet.\n\n         When the Cylinder appears, each creature in it\n\n      makes a Constitution saving throw. On a failed save,\n\n      a creature takes 2d10 Radiant damage, and if the\n\n      creature is shape-shifted (as a result of the Polymorph spell, for example), it reverts to its true form\n      and can’t shape-shift until it leaves the Cylinder.\n      On a successful save, a creature takes half as much\n      damage only. A creature also makes this save when\n      the spell’s area moves into its space and when it\n      enters the spell’s area or ends its turn there. A creature makes this save only once per turn.\n         Using a Higher-Level Spell Slot. The damage increases by 1d10 for each spell slot level above 2.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a moonseed leaf",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Move Earth",
      "identity_key": "move-earth",
      "content_key": "2024:move-earth",
      "level": 6,
      "school": "Transmutation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "V, S, M (a miniature shovel)",
      "duration": "Concentration, up to 2 hours",
      "description": "Choose an area of terrain no larger than 40 feet on\n\n      a side within range. You can reshape dirt, sand, or\n      clay in the area in any manner you choose for the\n      duration. You can raise or lower the area’s elevation, create or fill in a trench, erect or flatten a wall,\n      or form a pillar. The extent of any such changes\n      can’t exceed half the area’s largest dimension. For\n      example, if you affect a 40-foot square, you can\n      create a pillar up to 20 feet high, raise or lower the\n      square’s elevation by up to 20 feet, dig a trench up\n      to 20 feet deep, and so on. It takes 10 minutes for\n      these changes to complete. Because the terrain’s\n      transformation occurs slowly, creatures in the area\n      can’t usually be trapped or injured by the ground’s\n      movement.\n\n        At the end of every 10 minutes you spend concentrating on the spell, you can choose a new area of\n      terrain to affect within range.\n        This spell can’t manipulate natural stone or stone\n\n      construction. Rocks and structures shift to accommodate the new terrain. If the way you shape the\n      terrain would make a structure unstable, it might\n      collapse.\n        Similarly, this spell doesn’t directly affect plant\n      growth. The moved earth carries any plants along\n      with it.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a miniature shovel",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 2,
        "unit": "hour",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Nondetection",
      "identity_key": "nondetection",
      "content_key": "2024:nondetection",
      "level": 3,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S, M (a pinch of diamond dust worth 25+ GP, which the spell consumes)",
      "duration": "8 hours",
      "description": "For the duration, you hide a target that you touch\n\nfrom Divination spells. The target can be a willing\n\ncreature, or it can be a place or an object no larger\n\nthan 10 feet in any dimension. The target can’t\n\nbe targeted by any Divination spell or perceived\n\nthrough magical scrying sensors.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a pinch of diamond dust worth 25+ GP, which the spell consumes",
        "cost": {
          "copper": 2500,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "timed",
        "amount": 8,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Passwall",
      "identity_key": "passwall",
      "content_key": "2024:passwall",
      "level": 5,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S, M (a pinch of sesame seeds)",
      "duration": "1 hour",
      "description": "A passage appears at a point that you can see on a\nwooden, plaster, or stone surface (such as a wall,\nceiling, or floor) within range and lasts for the duration. You choose the opening’s dimensions: up to 5\nfeet wide, 8 feet tall, and 20 feet deep. The passage\ncreates no instability in a structure surrounding it.\n  When the opening disappears, any creatures or\nobjects still in the passage created by the spell are\nsafely ejected to an unoccupied space nearest to the\n\nsurface on which you cast the spell.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a pinch of sesame seeds",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Pass without Trace",
      "identity_key": "pass-without-trace",
      "content_key": "2024:pass-without-trace",
      "level": 2,
      "school": "Abjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S, M (ashes from burned mistletoe)",
      "duration": "Concentration, up to 1 hour",
      "description": "You radiate a concealing aura in a 30-foot Emanation for the duration. While in the aura, you and\neach creature you choose have a +10 bonus to Dexterity (Stealth) checks and leave no tracks.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "ashes from burned mistletoe",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Phantasmal Force",
      "identity_key": "phantasmal-force",
      "content_key": "2024:phantasmal-force",
      "level": 2,
      "school": "Illusion",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S, M (a bit of fleece)",
      "duration": "Concentration, up to 1 minute",
      "description": "You attempt to craft an illusion in the mind of a\ncreature you can see within range. The target\nmakes an Intelligence saving throw. On a failed\nsave, you create a phantasmal object, creature, or\nother phenomenon that is no larger than a 10-foot\nCube and that is perceivable only to the target for\nthe duration. The phantasm includes sound, temperature, and other stimuli.\n  The target can take a Study action to examine the\nphantasm with an Intelligence (Investigation) check\nagainst your spell save DC. If the check succeeds,\n\n\n      the target realizes that the phantasm is an illusion,\n      and the spell ends.\n        While affected by the spell, the target treats the\n\n      phantasm as if it were real and rationalizes any illogical outcomes from interacting with it. For example, if the target steps through a phantasmal bridge\n      and survives the fall, it believes the bridge exists\n      and something else caused it to fall.\n        An affected target can even take damage from\n      the illusion if the phantasm represents a dangerous\n      creature or hazard. On each of your turns, such a\n      phantasm can deal 2d8 Psychic damage to the target if it is in the phantasm’s area or within 5 feet of\n      the phantasm. The target perceives the damage as a\n      type appropriate to the illusion.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a bit of fleece",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Phantasmal Killer",
      "identity_key": "phantasmal-killer",
      "content_key": "2024:phantasmal-killer",
      "level": 4,
      "school": "Illusion",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "V, S",
      "duration": "Concentration, up to 1 minute",
      "description": "You tap into the nightmares of a creature you can\n\n      see within range and create an illusion of its deepest fears, visible only to that creature. The target\n\n      makes a Wisdom saving throw. On a failed save, the\n\n      target takes 4d10 Psychic damage and has Disadvantage on ability checks and attack rolls for the\n\n      duration. On a successful save, the target takes half\n\n      as much damage, and the spell ends.\n\n        For the duration, the target makes a Wisdom saving throw at the end of each of its turns. On a failed\n\n      save, it takes the Psychic damage again. On a successful save, the spell ends.\n\n        Using a Higher-Level Spell Slot. The damage increases by 1d10 for each spell slot level above 4.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Phantom Steed",
      "identity_key": "phantom-steed",
      "content_key": "2024:phantom-steed",
      "level": 3,
      "school": "Illusion",
      "ritual": true,
      "concentration": false,
      "casting_time": "1 minute or Ritual",
      "action_type": null,
      "range": "30 feet",
      "components": "V, S",
      "duration": "1 hour",
      "description": "A Large, quasi-real, horselike creature appears on\n      the ground in an unoccupied space of your choice\n      within range. You decide the creature’s appearance,\n      and it is equipped with a saddle, bit, and bridle. Any\n      of the equipment created by the spell vanishes in a\n      puff of smoke if it is carried more than 10 feet away\n      from the steed.\n        For the duration, you or a creature you choose\n      can ride the steed. The steed uses the Riding Horse\n      stat block (see “Monsters”), except it has a Speed of\n      100 feet and can travel 13 miles in an hour. When\n      the spell ends, the steed gradually fades, giving the\n      rider 1 minute to dismount. The spell ends early if\n      the steed takes any damage.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": true
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Planar Ally",
      "identity_key": "planar-ally",
      "content_key": "2024:planar-ally",
      "level": 6,
      "school": "Conjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "10 minutes",
      "action_type": null,
      "range": "60 feet",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "You beseech an otherworldly entity for aid. The being must be known to you: a god, a demon prince, or\nsome other being of cosmic power. That entity sends\na Celestial, an Elemental, or a Fiend loyal to it to aid\nyou, making the creature appear in an unoccupied\nspace within range. If you know a specific creature’s\nname, you can speak that name when you cast this\nspell to request that creature, though you might get\na different creature anyway (GM’s choice).\n   When the creature appears, it is under no compulsion to behave a particular way. You can ask it\nto perform a service in exchange for payment, but\nit isn’t obliged to do so. The requested task could\nrange from simple (fly us across the chasm, or help\nus fight a battle) to complex (spy on our enemies, or\nprotect us during our foray into the dungeon). You\n\nmust be able to communicate with the creature to\n\nbargain for its services.\n\n   Payment can take a variety of forms. A Celestial\n\nmight require a sizable donation of gold or magic\n\nitems to an allied temple, while a Fiend might demand a living sacrifice or a gift of treasure. Some\n\ncreatures might exchange their service for a quest\n\nundertaken by you.\n\n   A task that can be measured in minutes requires a\n\npayment worth 100 GP per minute. A task measured\n\nin hours requires 1,000 GP per hour. And a task\n\nmeasured in days (up to 10 days) requires 10,000\n\nGP per day. The GM can adjust these payments\n\nbased on the circumstances under which you cast\nthe spell. If the task is aligned with the creature’s\nethos, the payment might be halved or even waived.\nNonhazardous tasks typically require only half the\n\nsuggested payment, while especially dangerous\ntasks might require a greater gift. Creatures rarely\naccept tasks that seem suicidal.\n   After the creature completes the task, or when the\nagreed-upon duration of service expires, the creature returns to its home plane after reporting back\nto you if possible. If you are unable to agree on a\nprice for the creature’s service, the creature immediately returns to its home plane.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 10,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Planar Binding",
      "identity_key": "planar-binding",
      "content_key": "2024:planar-binding",
      "level": 5,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "1 hour",
      "action_type": null,
      "range": "60 feet",
      "components": "V, S, M (a jewel worth 1,000+ GP, which the spell consumes)",
      "duration": "24 hours",
      "description": "You attempt to bind a Celestial, an Elemental, a\n      Fey, or a Fiend to your service. The creature must\n      be within range for the entire casting of the spell.\n      (Typically, the creature is first summoned into the\n      center of the inverted version of the Magic Circle\n      spell to trap it while this spell is cast.) At the completion of the casting, the target must succeed on\n      a Charisma saving throw or be bound to serve you\n      for the duration. If the creature was summoned or\n      created by another spell, that spell’s duration is extended to match the duration of this spell.\n        A bound creature must follow your commands\n      to the best of its ability. You might command the\n      creature to accompany you on an adventure, to\n      guard a location, or to deliver a message. If the\n      creature is Hostile, it strives to twist your commands to achieve its own objectives. If the creature\n      carries out your commands completely before the\n      spell ends, it travels to you to report this fact if you\n      are on the same plane of existence. If you are on a\n      different plane, it returns to the place where you\n      bound it and remains there until the spell ends.\n        Using a Higher-Level Spell Slot. The duration\n      increases with a spell slot of level 6 (10 days), 7 (30\n      days), 8 (180 days), and 9 (366 days).",
      "casting_time_value": {
        "options": [
          {
            "unit": "hour",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a jewel worth 1,000+ GP, which the spell consumes",
        "cost": {
          "copper": 100000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "timed",
        "amount": 24,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Plane Shift",
      "identity_key": "plane-shift",
      "content_key": "2024:plane-shift",
      "level": 7,
      "school": "Conjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S, M (a forked, metal rod worth 250+ GP and attuned to a plane of existence)",
      "duration": "Instantaneous",
      "description": "You and up to eight willing creatures who link\n      hands in a circle are transported to a different plane\n      of existence. You can specify a target destination in\n      general terms, such as a specific city on the Elemental Plane of Fire or palace on the second level of the\n      Nine Hells, and you appear in or near that destination, as determined by the GM.\n        Alternatively, if you know the sigil sequence of a\n      teleportation circle on another plane of existence,\n      this spell can take you to that circle. If the teleportation circle is too small to hold all the creatures you\n      transported, they appear in the closest unoccupied\n      spaces next to the circle.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a forked, metal rod worth 250+ GP and attuned to a plane of existence",
        "cost": {
          "copper": 25000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Plant Growth",
      "identity_key": "plant-growth",
      "content_key": "2024:plant-growth",
      "level": 3,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action (Overgrowth) or 8 hours (Enrichment)",
      "action_type": "Action",
      "range": "150 feet",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "This spell channels vitality into plants. The casting\ntime you use determines whether the spell has the\nOvergrowth or the Enrichment effect below.\n  Overgrowth. Choose a point within range. All\nnormal plants in a 100-foot-radius Sphere centered\non that point become thick and overgrown. A creature moving through that area must spend 4 feet of\nmovement for every 1 foot it moves. You can exclude\none or more areas of any size within the spell’s area\nfrom being affected.\n  Enrichment. All plants in a half-mile radius centered on a point within range become enriched for\n365 days. The plants yield twice the normal amount\nof food when harvested. They can benefit from only\none Plant Growth per year.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": "Overgrowth"
          },
          {
            "unit": "hour",
            "amount": 8,
            "mode": "Enrichment"
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 150,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Poison Spray",
      "identity_key": "poison-spray",
      "content_key": "2024:poison-spray",
      "level": 0,
      "school": "Necromancy",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "You spray toxic mist at a creature within range.\nMake a ranged spell attack against the target. On a\nhit, the target takes 1d12 Poison damage.\n  Cantrip Upgrade. The damage increases by 1d12\nwhen you reach levels 5 (2d12), 11 (3d12), and 17\n(4d12).",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Polymorph",
      "identity_key": "polymorph",
      "content_key": "2024:polymorph",
      "level": 4,
      "school": "Transmutation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S, M (a caterpillar cocoon)",
      "duration": "Concentration, up to 1 hour",
      "description": "You attempt to transform a creature that you can\nsee within range into a Beast. The target must succeed on a Wisdom saving throw or shape-shift into\na Beast form for the duration. That form can be any\nBeast you choose that has a Challenge Rating equal\nto or less than the target’s (or the target’s level if\nit doesn’t have a Challenge Rating). The target’s\ngame statistics are replaced by the stat block of the\nchosen Beast, but the target retains its alignment,\npersonality, creature type, Hit Points, and Hit Point\nDice. See the “Animals” section of “Monsters” for a\nsample of Beast stat blocks.\n   The target gains a number of Temporary Hit\nPoints equal to the Hit Points of the Beast form.\n\nThese Temporary Hit Points vanish if any remain\n\nwhen the spell ends. The spell ends early on the target if it has no Temporary Hit Points left.\n\n   The target is limited in the actions it can perform\nby the anatomy of its new form, and it can’t speak or\ncast spells.\n\n\n        The target’s gear melds into the new form. The\n      creature can’t use or otherwise benefit from any of\n      that equipment.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a caterpillar cocoon",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Power Word Heal",
      "identity_key": "power-word-heal",
      "content_key": "2024:power-word-heal",
      "level": 9,
      "school": "Enchantment",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V",
      "duration": "Instantaneous",
      "description": "A wave of healing energy washes over one creature\n      you can see within range. The target regains all its\n      Hit Points. If the creature has the Charmed, Frightened, Paralyzed, Poisoned, or Stunned condition,\n      the condition ends. If the creature has the Prone\n      condition, it can use its Reaction to stand up.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Power Word Kill",
      "identity_key": "power-word-kill",
      "content_key": "2024:power-word-kill",
      "level": 9,
      "school": "Enchantment",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V",
      "duration": "Instantaneous",
      "description": "You compel one creature you can see within range\n      to die. If the target has 100 Hit Points or fewer, it\n      dies. Otherwise, it takes 12d12 Psychic damage.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Power Word Stun",
      "identity_key": "power-word-stun",
      "content_key": "2024:power-word-stun",
      "level": 8,
      "school": "Enchantment",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V",
      "duration": "Instantaneous",
      "description": "You overwhelm the mind of one creature you can\n      see within range. If the target has 150 Hit Points or\n      fewer, it has the Stunned condition. Otherwise, its\n      Speed is 0 until the start of your next turn.\n        The Stunned target makes a Constitution saving\n      throw at the end of each of its turns, ending the condition on itself on a success.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Prayer of Healing",
      "identity_key": "prayer-of-healing",
      "content_key": "2024:prayer-of-healing",
      "level": 2,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "10 minutes",
      "action_type": null,
      "range": "30 feet",
      "components": "V",
      "duration": "Instantaneous",
      "description": "Up to five creatures of your choice who remain\n      within range for the spell’s entire casting gain the\n\n      benefits of a Short Rest and also regain 2d8 Hit\n      Points. A creature can’t be affected by this spell\n      again until that creature finishes a Long Rest.\n\n\n  Using a Higher-Level Spell Slot. The healing increases by 1d8 for each spell slot level above 2.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 10,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Prestidigitation",
      "identity_key": "prestidigitation",
      "content_key": "2024:prestidigitation",
      "level": 0,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "10 feet",
      "components": "V, S",
      "duration": "Up to 1 hour",
      "description": "You create a magical effect within range. Choose\nthe effect from the options below. If you cast this\nspell multiple times, you can have up to three of its\nnon-instantaneous effects active at a time.\n  Sensory Effect. You create an instantaneous,\nharmless sensory effect, such as a shower of sparks,\na puff of wind, faint musical notes, or an odd odor.\n  Fire Play. You instantaneously light or snuff out a\ncandle, a torch, or a small campfire.\n  Clean or Soil. You instantaneously clean or soil an\nobject no larger than 1 cubic foot.\n  Minor Sensation. You chill, warm, or flavor up to\n1 cubic foot of nonliving material for 1 hour.\n  Magic Mark. You make a color, a small mark, or a\nsymbol appear on an object or a surface for 1 hour.\n  Minor Creation. You create a nonmagical trinket\nor an illusory image that can fit in your hand. It\nlasts until the end of your next turn. A trinket can\ndeal no damage and has no monetary worth.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 10,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": false,
        "up_to": true
      }
    },
    {
      "name": "Prismatic Spray",
      "identity_key": "prismatic-spray",
      "content_key": "2024:prismatic-spray",
      "level": 7,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "Eight rays of light flash from you in a 60-foot Cone.\nEach creature in the Cone makes a Dexterity saving\nthrow. For each target, roll 1d8 to determine which\ncolor ray affects it, consulting the Prismatic Rays\ntable.\n\nPrismatic Rays\n 1d8 Ray\n  1   Red. Failed Save: 12d6 Fire damage. Successful\n      Save: Half as much damage.\n\n  2   Orange. Failed Save: 12d6 Acid damage. Successful\n\n      Save: Half as much damage.\n\n  3   Yellow. Failed Save: 12d6 Lightning damage. Successful Save: Half as much damage.\n\n  4   Green. Failed Save: 12d6 Poison damage. Successful Save: Half as much damage.\n\n\n       1d8 Ray\n\n        5   Blue. Failed Save: 12d6 Cold damage. Successful\n\n            Save: Half as much damage.\n        6   Indigo. Failed Save: The target has the Restrained\n            condition and makes a Constitution saving throw\n            at the end of each of its turns. If it successfully\n            saves three times, the condition ends. If it fails\n            three times, it has the Petrified condition until it\n            is freed by an effect like the Greater Restoration\n            spell. The successes and failures needn’t be consecutive; keep track of both until the target collects three of a kind.\n\n        7   Violet. Failed Save: The target has the Blinded\n            condition and makes a Wisdom saving throw at\n            the start of your next turn. On a successful save,\n            the condition ends. On a failed save, the condition ends, and the creature teleports to another\n            plane of existence (GM’s choice).\n\n        8   Special. The target is struck by two rays. Roll\n            twice, rerolling any 8.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Prismatic Wall",
      "identity_key": "prismatic-wall",
      "content_key": "2024:prismatic-wall",
      "level": 9,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S",
      "duration": "10 minutes",
      "description": "A shimmering, multicolored plane of light forms\n\n      a vertical opaque wall—up to 90 feet long, 30 feet\n\n      high, and 1 inch thick—centered on a point within\n\n      range. Alternatively, you shape the wall into a globe\n      up to 30 feet in diameter centered on a point within\n      range. The wall lasts for the duration. If you position the wall in a space occupied by a creature, the\n      spell ends instantly without effect.\n        The wall sheds Bright Light within 100 feet and\n      Dim Light for an additional 100 feet. You and creatures you designate when you cast the spell can\n      pass through and be near the wall without harm. If\n      another creature that can see the wall moves within\n      20 feet of it or starts its turn there, the creature\n      must succeed on a Constitution saving throw or\n      have the Blinded condition for 1 minute.\n        The wall consists of seven layers, each with a\n\n      different color. When a creature reaches into or\n\n      passes through the wall, it does so one layer at a\n\n      time through all the layers. Each layer forces the\n      creature to make a Dexterity saving throw or be affected by that layer’s properties as described in the\n      Prismatic Layers table.\n        The wall, which has AC 10, can be destroyed one\n      layer at a time, in order from red to violet, by means\n\n\nspecific to each layer. If a layer is destroyed, it is\ngone for the duration. Antimagic Field has no effect\n\non the wall, and Dispel Magic can affect only the violet layer.\n\nPrismatic Layers\n Order   Effects\n   1     Red. Failed Save: 12d6 Fire damage. Successful\n         Save: Half as much damage. Additional Effects:\n         Nonmagical ranged attacks can’t pass through\n         this layer, which is destroyed if it takes at\n         least 25 Cold damage.\n\n   2     Orange. Failed Save: 12d6 Acid damage. Successful Save: Half as much damage. Additional\n         Effects: Magical ranged attacks can’t pass\n         through this layer, which is destroyed by a\n         strong wind (such as the one created by Gust\n         of Wind).\n\n   3     Yellow. Failed Save: 12d6 Lightning damage.\n         Successful Save: Half as much damage. Additional Effects: The layer is destroyed if it takes\n         at least 60 Force damage.\n\n   4     Green. Failed Save: 12d6 Poison damage. Successful Save: Half as much damage. Additional\n\n         Effects: A Passwall spell, or another spell of\n\n         equal or greater level that can open a portal\n\n         on a solid surface, destroys this layer.\n   5     Blue. Failed Save: 12d6 Cold damage. Successful Save: Half as much damage. Additional Effects: The layer is destroyed if it takes at least\n\n         25 Fire damage.\n\n   6     Indigo. Failed Save: The target has the Restrained condition and makes a Constitution\n         saving throw at the end of each of its turns. If\n         it successfully saves three times, the condition\n         ends. If it fails three times, it has the Petrified\n         condition until it is freed by an effect like the\n         Greater Restoration spell. The successes and\n         failures needn’t be consecutive; keep track of\n         both until the target collects three of a kind.\n         Additional Effects: Spells can’t be cast through\n         this layer, which is destroyed by Bright Light\n         shed by the Daylight spell.\n\n   7     Violet. Failed Save: The target has the Blinded\n\n         condition and makes a Wisdom saving throw\n\n         at the start of your next turn. On a successful\n\n         save, the condition ends. On a failed save, the\n         condition ends, and the creature teleports\n         to another plane of existence (GM’s choice).\n         Additional Effects: This layer is destroyed by\n         Dispel Magic.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Private Sanctum",
      "identity_key": "private-sanctum",
      "content_key": "2024:private-sanctum",
      "level": 4,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "10 minutes",
      "action_type": null,
      "range": "120 feet",
      "components": "V, S, M (a thin sheet of lead)",
      "duration": "24 hours",
      "description": "You make an area within range magically secure.\n      The area is a Cube that can be as small as 5 feet to\n      as large as 100 feet on each side. The spell lasts for\n      the duration.\n        When you cast the spell, you decide what sort of\n      security the spell provides, choosing any of the following properties:\n\n      • Sound can’t pass through the barrier at the edge\n        of the warded area.\n      • The barrier of the warded area appears dark and\n        foggy, preventing vision (including Darkvision)\n        through it.\n      • Sensors created by Divination spells can’t appear\n        inside the protected area or pass through the barrier at its perimeter.\n      • Creatures in the area can’t be targeted by Divination spells.\n      • Nothing can teleport into or out of the warded\n        area.\n      • Planar travel is blocked within the warded area.\n        Casting this spell on the same spot every day for\n      365 days makes the spell last until dispelled.\n        Using a Higher-Level Spell Slot. You can increase\n      the size of the Cube by 100 feet for each spell slot\n      level above 4.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 10,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a thin sheet of lead",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 24,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Produce Flame",
      "identity_key": "produce-flame",
      "content_key": "2024:produce-flame",
      "level": 0,
      "school": "Conjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Bonus Action",
      "action_type": "Bonus Action",
      "range": "Self",
      "components": "V, S",
      "duration": "10 minutes",
      "description": "A flickering flame appears in your hand and remains there for the duration. While there, the flame\n      emits no heat and ignites nothing, and it sheds\n      Bright Light in a 20-foot radius and Dim Light for an\n      additional 20 feet. The spell ends if you cast it again.\n        Until the spell ends, you can take a Magic action to\n      hurl fire at a creature or an object within 60 feet of\n      you. Make a ranged spell attack. On a hit, the target\n      takes 1d8 Fire damage.\n        Cantrip Upgrade. The damage increases by 1d8\n      when you reach levels 5 (2d8), 11 (3d8), and 17\n      (4d8).",
      "casting_time_value": {
        "options": [
          {
            "unit": "bonus_action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Programmed Illusion",
      "identity_key": "programmed-illusion",
      "content_key": "2024:programmed-illusion",
      "level": 6,
      "school": "Illusion",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "V, S, M (jade dust worth 25+ GP)",
      "duration": "Until dispelled",
      "description": "You create an illusion of an object, a creature, or\nsome other visible phenomenon within range that\nactivates when a specific trigger occurs. The illusion is imperceptible until then. It must be no larger\nthan a 30-foot Cube, and you decide when you cast\nthe spell how the illusion behaves and what sounds\nit makes. This scripted performance can last up to 5\nminutes.\n   When the trigger you specify occurs, the illusion\nsprings into existence and performs in the manner\nyou described. Once the illusion finishes performing, it disappears and remains dormant for 10 minutes, after which the illusion can be activated again.\n   The trigger can be as general or as detailed as you\nlike, though it must be based on visual or audible\nphenomena that occur within 30 feet of the area.\nFor example, you could create an illusion of yourself\nto appear and warn off others who attempt to open\na trapped door.\n   Physical interaction with the image reveals it\nto be illusory, since things can pass through it. A\ncreature that takes the Study action to examine\nthe image can determine that it is an illusion with a\nsuccessful Intelligence (Investigation) check against\nyour spell save DC. If a creature discerns the illusion for what it is, the creature can see through the\nimage, and any noise it makes sounds hollow to the\ncreature.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "jade dust worth 25+ GP",
        "cost": {
          "copper": 2500,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "until_dispelled",
        "or_triggered": false
      }
    },
    {
      "name": "Project Image",
      "identity_key": "project-image",
      "content_key": "2024:project-image",
      "level": 7,
      "school": "Illusion",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "500 miles",
      "components": "V, S, M (a statuette of yourself worth 5+ GP)",
      "duration": "Concentration, up to 1 day",
      "description": "You create an illusory copy of yourself that lasts for\nthe duration. The copy can appear at any location\nwithin range that you have seen before, regardless\nof intervening obstacles. The illusion looks and\nsounds like you, but it is intangible. If the illusion\ntakes any damage, it disappears, and the spell ends.\n  You can see through the illusion’s eyes and hear\nthrough its ears as if you were in its space. As a\nMagic action, you can move it up to 60 feet and\nmake it gesture, speak, and behave in whatever way\nyou choose. It mimics your mannerisms perfectly.\n  Physical interaction with the image reveals it\nto be illusory, since things can pass through it. A\ncreature that takes the Study action to examine\nthe image can determine that it is an illusion with a\nsuccessful Intelligence (Investigation) check against\nyour spell save DC. If a creature discerns the illusion for what it is, the creature can see through the\n\n\n      image, and any noise it makes sounds hollow to the\n      creature.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 2640000,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a statuette of yourself worth 5+ GP",
        "cost": {
          "copper": 500,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "day",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Protection from Energy",
      "identity_key": "protection-from-energy",
      "content_key": "2024:protection-from-energy",
      "level": 3,
      "school": "Abjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S",
      "duration": "Concentration, up to 1 hour",
      "description": "For the duration, the willing creature you touch has\n\n      Resistance to one damage type of your choice: Acid,\n\n      Cold, Fire, Lightning, or Thunder.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Protection from Evil and Good",
      "identity_key": "protection-from-evil-and-good",
      "content_key": "2024:protection-from-evil-and-good",
      "level": 1,
      "school": "Abjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S, M (a flask of Holy Water worth 25+ GP, which the spell consumes)",
      "duration": "Concentration up to 10 minutes",
      "description": "Until the spell ends, one willing creature you touch\n      is protected against creatures that are Aberrations,\n      Celestials, Elementals, Fey, Fiends, or Undead.\n      The protection grants several benefits. Creatures\n      of those types have Disadvantage on attack rolls\n      against the target. The target also can’t be possessed by or gain the Charmed or Frightened conditions from them. If the target is already possessed,\n\n      Charmed, or Frightened by such a creature, the target has Advantage on any new saving throw against\n\n      the relevant effect.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a flask of Holy Water worth 25+ GP, which the spell consumes",
        "cost": {
          "copper": 2500,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Protection from Poison",
      "identity_key": "protection-from-poison",
      "content_key": "2024:protection-from-poison",
      "level": 2,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S",
      "duration": "1 hour",
      "description": "You touch a creature and end the Poisoned condition on it. For the duration, the target has Advantage on saving throws to avoid or end the Poisoned\n      condition, and it has Resistance to Poison damage.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Purify Food and Drink",
      "identity_key": "purify-food-and-drink",
      "content_key": "2024:purify-food-and-drink",
      "level": 1,
      "school": "Transmutation",
      "ritual": true,
      "concentration": false,
      "casting_time": "Action or Ritual",
      "action_type": "Action",
      "range": "10 feet",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "You remove poison and rot from nonmagical food\n      and drink in a 5-foot-radius Sphere centered on a\n      point within range.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": true
      },
      "range_value": {
        "kind": "ranged",
        "feet": 10,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Raise Dead",
      "identity_key": "raise-dead",
      "content_key": "2024:raise-dead",
      "level": 5,
      "school": "Necromancy",
      "ritual": false,
      "concentration": false,
      "casting_time": "1 hour",
      "action_type": null,
      "range": "Touch",
      "components": "V, S, M (a diamond worth 500+ GP, which the spell consumes)",
      "duration": "Instantaneous",
      "description": "With a touch, you revive a dead creature if it has\nbeen dead no longer than 10 days and it wasn’t Undead when it died.\n\n  The creature returns to life with 1 Hit Point. This\n\nspell also neutralizes any poisons that affected the\n\ncreature at the time of death.\n  This spell closes all mortal wounds, but it doesn’t\nrestore missing body parts. If the creature is lacking body parts or organs integral for its survival—\nits head, for instance—the spell automatically fails.\n\n  Coming back from the dead is an ordeal. The target takes a −4 penalty to D20 Tests. Every time the\ntarget finishes a Long Rest, the penalty is reduced\nby 1 until it becomes 0.",
      "casting_time_value": {
        "options": [
          {
            "unit": "hour",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a diamond worth 500+ GP, which the spell consumes",
        "cost": {
          "copper": 50000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Ray of Enfeeblement",
      "identity_key": "ray-of-enfeeblement",
      "content_key": "2024:ray-of-enfeeblement",
      "level": 2,
      "school": "Necromancy",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S",
      "duration": "Concentration, up to 1 minute",
      "description": "A beam of enervating energy shoots from you toward a creature within range. The target must\n\nmake a Constitution saving throw. On a successful\n\nsave, the target has Disadvantage on the next attack\n\nroll it makes until the start of your next turn.\n  On a failed save, the target has Disadvantage on\nStrength-based D20 Tests for the duration. During\nthat time, it also subtracts 1d8 from all its damage\n\nrolls. The target repeats the save at the end of each\nof its turns, ending the spell on a success.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Ray of Frost",
      "identity_key": "ray-of-frost",
      "content_key": "2024:ray-of-frost",
      "level": 0,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "A frigid beam of blue-white light streaks toward a\ncreature within range. Make a ranged spell attack\n\nagainst the target. On a hit, it takes 1d8 Cold damage, and its Speed is reduced by 10 feet until the\nstart of your next turn.\n  Cantrip Upgrade. The damage increases by 1d8\nwhen you reach levels 5 (2d8), 11 (3d8), and 17\n(4d8).",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Regenerate",
      "identity_key": "regenerate",
      "content_key": "2024:regenerate",
      "level": 7,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "1 minute",
      "action_type": null,
      "range": "Touch",
      "components": "V, S, M (a prayer wheel)",
      "duration": "1 hour",
      "description": "A creature you touch regains 4d8 + 15 Hit Points.\n      For the duration, the target regains 1 Hit Point at\n      the start of each of its turns, and any severed body\n      parts regrow after 2 minutes.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a prayer wheel",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Ray of Sickness",
      "identity_key": "ray-of-sickness",
      "content_key": "2024:ray-of-sickness",
      "level": 1,
      "school": "Necromancy",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "You shoot a greenish ray at a creature within range.\n      Make a ranged spell attack against the target. On a\n      hit, the target takes 2d8 Poison damage and has the\n      Poisoned condition until the end of your next turn.\n        Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 1.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Reincarnate",
      "identity_key": "reincarnate",
      "content_key": "2024:reincarnate",
      "level": 5,
      "school": "Necromancy",
      "ritual": false,
      "concentration": false,
      "casting_time": "1 hour",
      "action_type": null,
      "range": "Touch",
      "components": "V, S, M (rare oils worth 1,000+ GP, which the spell consumes)",
      "duration": "Instantaneous",
      "description": "You touch a dead Humanoid or a piece of one. If the\n      creature has been dead no longer than 10 days,\n      the spell forms a new body for it and calls the soul\n      to enter that body. Roll 1d10 and consult the table\n      below to determine the body’s species, or the GM\n      chooses another playable species.\n\n        1d10     Species               1d10    Species\n\n          1     Roll again.              6     Goliath\n          2     Dragonborn               7     Halfling\n\n          3     Dwarf                    8     Human\n          4     Elf                      9     Orc\n          5     Gnome                   10     Tiefling\n\n        The reincarnated creature makes any choices that\n      a species’ description offers, and the creature recalls its former life. It retains the capabilities it had\n      in its original form, except it loses the traits of its\n\n      previous species and gains the traits of its new one.",
      "casting_time_value": {
        "options": [
          {
            "unit": "hour",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "rare oils worth 1,000+ GP, which the spell consumes",
        "cost": {
          "copper": 100000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Remove Curse",
      "identity_key": "remove-curse",
      "content_key": "2024:remove-curse",
      "level": 3,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "At your touch, all curses affecting one creature\nor object end. If the object is a cursed magic item,\nits curse remains, but the spell breaks its owner’s\nAttunement to the object so it can be removed or\ndiscarded.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Resilient Sphere",
      "identity_key": "resilient-sphere",
      "content_key": "2024:resilient-sphere",
      "level": 4,
      "school": "Abjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S, M (a glass sphere)",
      "duration": "Concentration, up to 1 minute",
      "description": "A shimmering sphere encloses a Large or smaller\ncreature or object within range. An unwilling creature must succeed on a Dexterity saving throw or\nbe enclosed for the duration.\n   Nothing—not physical objects, energy, or other\nspell effects—can pass through the barrier, in or\nout, though a creature in the sphere can breathe\nthere. The sphere is immune to all damage, and a\ncreature or object inside can’t be damaged by attacks or effects originating from outside, nor can a\ncreature inside the sphere damage anything outside\nit.\n   The sphere is weightless and just large enough to\ncontain the creature or object inside. An enclosed\ncreature can take an action to push against the\nsphere’s walls and thus roll the sphere at up to half\nthe creature’s Speed. Similarly, the globe can be\npicked up and moved by other creatures.\n   A Disintegrate spell targeting the globe destroys it\nwithout harming anything inside.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a glass sphere",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Resistance",
      "identity_key": "resistance",
      "content_key": "2024:resistance",
      "level": 0,
      "school": "Abjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S",
      "duration": "Concentration, up to 1 minute",
      "description": "You touch a willing creature and choose a damage\ntype: Acid, Bludgeoning, Cold, Fire, Lightning, Necrotic, Piercing, Poison, Radiant, Slashing, or Thunder. When the creature takes damage of the chosen\ntype before the spell ends, the creature reduces the\ntotal damage taken by 1d4. A creature can benefit\nfrom this spell only once per turn.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Resurrection",
      "identity_key": "resurrection",
      "content_key": "2024:resurrection",
      "level": 7,
      "school": "Necromancy",
      "ritual": false,
      "concentration": false,
      "casting_time": "1 hour",
      "action_type": null,
      "range": "Touch",
      "components": "V, S, M (a diamond worth 1,000+ GP, which the spell consumes)",
      "duration": "Instantaneous",
      "description": "With a touch, you revive a dead creature that has\n      been dead for no more than a century, didn’t die of\n      old age, and wasn’t Undead when it died.\n        The creature returns to life with all its Hit Points.\n      This spell also neutralizes any poisons that affected\n      the creature at the time of death. This spell closes\n      all mortal wounds and restores any missing body\n      parts.\n        Coming back from the dead is an ordeal. The target takes a −4 penalty to D20 Tests. Every time the\n      target finishes a Long Rest, the penalty is reduced\n      by 1 until it becomes 0.\n        Casting this spell to revive a creature that has\n      been dead for 365 days or longer taxes you. Until\n      you finish a Long Rest, you can’t cast spells again,\n      and you have Disadvantage on D20 Tests.",
      "casting_time_value": {
        "options": [
          {
            "unit": "hour",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a diamond worth 1,000+ GP, which the spell consumes",
        "cost": {
          "copper": 100000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Reverse Gravity",
      "identity_key": "reverse-gravity",
      "content_key": "2024:reverse-gravity",
      "level": 7,
      "school": "Transmutation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "100 feet",
      "components": "V, S, M (a lodestone and iron filings)",
      "duration": "Concentration, up to 1 minute",
      "description": "This spell reverses gravity in a 50-foot-radius, 100-\n      foot high Cylinder centered on a point within range.\n      All creatures and objects in that area that aren’t\n      anchored to the ground fall upward and reach the\n      top of the Cylinder. A creature can make a Dexterity\n      saving throw to grab a fixed object it can reach, thus\n      avoiding the fall upward.\n        If a ceiling or an anchored object is encountered\n      in this upward fall, creatures and objects strike it\n      just as they would during a downward fall. If an affected creature or object reaches the Cylinder’s top\n      without striking anything, it hovers there for the\n      duration. When the spell ends, affected objects and\n      creatures fall downward.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 100,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a lodestone and iron filings",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Revivify",
      "identity_key": "revivify",
      "content_key": "2024:revivify",
      "level": 3,
      "school": "Necromancy",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S, M (a diamond worth 300+ GP, which the spell consumes)",
      "duration": "Instantaneous",
      "description": "You touch a creature that has died within the last\n      minute. That creature revives with 1 Hit Point. This\n      spell can’t revive a creature that has died of old age,\n      nor does it restore any missing body parts.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a diamond worth 300+ GP, which the spell consumes",
        "cost": {
          "copper": 30000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Rope Trick",
      "identity_key": "rope-trick",
      "content_key": "2024:rope-trick",
      "level": 2,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S, M (a segment of rope)",
      "duration": "1 hour",
      "description": "You touch a rope. One end of it hovers upward until\nthe rope hangs perpendicular to the ground or the\nrope reaches a ceiling. At the rope’s upper end, an\nInvisible 3-foot-by-5-foot portal opens to an extra­\ndimensional space that lasts until the spell ends.\nThat space can be reached by climbing the rope,\nwhich can be pulled into or dropped out of it.\n   The space can hold up to eight Medium or smaller\ncreatures. Attacks, spells, and other effects can’t\npass into or out of the space, but creatures inside\nit can see through the portal. Anything inside the\nspace drops out when the spell ends.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a segment of rope",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Sacred Flame",
      "identity_key": "sacred-flame",
      "content_key": "2024:sacred-flame",
      "level": 0,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "Flame-like radiance descends on a creature that you\n\ncan see within range. The target must succeed on\n\na Dexterity saving throw or take 1d8 Radiant damage. The target gains no benefit from Half Cover or\nThree-Quarters Cover for this save.\n  Cantrip Upgrade. The damage increases by 1d8\nwhen you reach levels 5 (2d8), 11 (3d8), and 17\n(4d8).",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Sanctuary",
      "identity_key": "sanctuary",
      "content_key": "2024:sanctuary",
      "level": 1,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Bonus Action",
      "action_type": "Bonus Action",
      "range": "30 feet",
      "components": "V, S, M (a shard of glass from a mirror)",
      "duration": "1 minute",
      "description": "You ward a creature within range. Until the spell\nends, any creature who targets the warded creature with an attack roll or a damaging spell must\nsucceed on a Wisdom saving throw or either choose\na new target or lose the attack or spell. This spell\ndoesn’t protect the warded creature from areas of\n\neffect. The spell ends if the warded creature makes\n\nan attack roll, casts a spell, or deals damage.",
      "casting_time_value": {
        "options": [
          {
            "unit": "bonus_action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a shard of glass from a mirror",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Scorching Ray",
      "identity_key": "scorching-ray",
      "content_key": "2024:scorching-ray",
      "level": 2,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "You hurl three fiery rays. You can hurl them at one\ntarget within range or at several. Make a ranged\nspell attack for each ray. On a hit, the target takes\n\n2d6 Fire damage.\n\n  Using a Higher-Level Spell Slot. You create one\n\nadditional ray for each spell slot level above 2.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Scrying",
      "identity_key": "scrying",
      "content_key": "2024:scrying",
      "level": 5,
      "school": "Divination",
      "ritual": false,
      "concentration": true,
      "casting_time": "10 minutes",
      "action_type": null,
      "range": "Self",
      "components": "V, S, M (a focus worth 1,000+ GP, such as a crystal ball, mirror, or water-filled font)",
      "duration": "Concentration, up to 10 minutes",
      "description": "You can see and hear a creature you choose that is\n      on the same plane of existence as you. The target\n      makes a Wisdom saving throw, which is modified\n      (see the tables below) by how well you know the\n      target and the sort of physical connection you have\n      to it. The target doesn’t know what it is making the\n      save against, only that it feels uneasy.\n\n       Your Knowledge of the Target Is …        Save Modifier\n\n      Secondhand (heard of the target)               +5\n      Firsthand (met the target)                     +0\n      Extensive (know the target well)               −5\n\n       You Have the Target’s …                  Save Modifier\n      Picture or other likeness                      −2\n\n\n      Garment or other possession                    −4\n      Body part, lock of hair, or bit of nail        −10\n        On a successful save, the target isn’t affected, and\n      you can’t use this spell on it again for 24 hours.\n        On a failed save, the spell creates an Invisible,\n      intangible sensor within 10 feet of the target. You\n      can see and hear through the sensor as if you were\n      there. The sensor moves with the target, remaining\n      within 10 feet of it for the duration. If something\n      can see the sensor, it appears as a luminous orb\n      about the size of your fist.\n        Instead of targeting a creature, you can target a\n      location you have seen. When you do so, the sensor\n      appears at that location and doesn’t move.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 10,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a focus worth 1,000+ GP, such as a crystal ball, mirror, or water-filled font",
        "cost": {
          "copper": 100000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Searing Smite",
      "identity_key": "searing-smite",
      "content_key": "2024:searing-smite",
      "level": 1,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Bonus Action, which you take immedi- ately after hitting a target with a Melee weapon or an Unarmed Strike",
      "action_type": "Bonus Action",
      "range": "Self",
      "components": "V",
      "duration": "1 minute",
      "description": "As you hit the target, it takes an extra 1d6 Fire damage from the attack. At the start of each of its turns\n      until the spell ends, the target takes 1d6 Fire damage and then makes a Constitution saving throw.\n      On a failed save, the spell continues. On a successful\n      save, the spell ends.\n        Using a Higher-Level Spell Slot. All the damage\n      increases by 1d6 for each spell slot level above 1.",
      "casting_time_value": {
        "options": [
          {
            "unit": "bonus_action",
            "trigger": "which you take immedi- ately after hitting a target with a Melee weapon or an Unarmed Strike",
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Secret Chest",
      "identity_key": "secret-chest",
      "content_key": "2024:secret-chest",
      "level": 4,
      "school": "Conjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S, M (a chest, 3 feet by 2 feet by 2 feet, constructed from rare materials worth 5,000+ GP, and a Tiny replica of the chest made from the same materi- als worth 50+ GP)",
      "duration": "Until dispelled",
      "description": "You hide a chest and all its contents on the Ethereal\nPlane. You must touch the chest and the miniature\nreplica that serve as Material components for the\nspell. The chest can contain up to 12 cubic feet of\nnonliving material (3 feet by 2 feet by 2 feet).\n  While the chest remains on the Ethereal Plane,\nyou can take a Magic action and touch the replica to\n\nrecall the chest. It appears in an unoccupied space\non the ground within 5 feet of you. You can send the\nchest back to the Ethereal Plane by taking a Magic\naction to touch the chest and the replica.\n  After 60 days, there is a cumulative 5 percent\nchance at the end of each day that the spell ends.\n\nThe spell also ends if you cast this spell again or if\nthe Tiny replica chest is destroyed. If the spell ends\nand the larger chest is on the Ethereal Plane, the\nchest remains there for you or someone else to find.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a chest, 3 feet by 2 feet by 2 feet, constructed from rare materials worth 5,000+ GP, and a Tiny replica of the chest made from the same materi- als worth 50+ GP",
        "cost": {
          "copper": 500000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "until_dispelled",
        "or_triggered": false
      }
    },
    {
      "name": "See Invisibility",
      "identity_key": "see-invisibility",
      "content_key": "2024:see-invisibility",
      "level": 2,
      "school": "Divination",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S, M (a pinch of talc)",
      "duration": "1 hour",
      "description": "For the duration, you see creatures and objects that\nhave the Invisible condition as if they were visible,\nand you can see into the Ethereal Plane. Creatures\nand objects there appear ghostly.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a pinch of talc",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Seeming",
      "identity_key": "seeming",
      "content_key": "2024:seeming",
      "level": 5,
      "school": "Illusion",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S",
      "duration": "8 hours",
      "description": "You give an illusory appearance to each creature of\nyour choice that you can see within range. An unwilling target can make a Charisma saving throw,\nand if it succeeds, it is unaffected by this spell.\n  You can give the same appearance or different\nones to the targets. The spell can change the appearance of the targets’ bodies and equipment.\nYou can make each creature seem 1 foot shorter or\ntaller and appear heavier or lighter. A target’s new\nappearance must have the same basic arrangement\nof limbs as the target, but the extent of the illusion\n\n\n      is otherwise up to you. The spell lasts for the\n      duration.\n        The changes wrought by this spell fail to hold up\n\n      to physical inspection. For example, if you use this\n      spell to add a hat to a creature’s outfit, objects pass\n      through the hat.\n        A creature that takes the Study action to examine\n      a target can make an Intelligence (Investigation)\n      check against your spell save DC. If it succeeds, it\n      becomes aware that the target is disguised.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 8,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Sending",
      "identity_key": "sending",
      "content_key": "2024:sending",
      "level": 3,
      "school": "Divination",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Unlimited",
      "components": "V, S, M (a copper wire)",
      "duration": "Instantaneous",
      "description": "You send a short message of 25 words or fewer to\n\n      a creature you have met or a creature described to\n\n      you by someone who has met it. The target hears\n\n      the message in its mind, recognizes you as the\n\n      sender if it knows you, and can answer in a like\n\n      manner immediately. The spell enables targets to\n\n      understand the meaning of your message.\n\n        You can send the message across any distance and\n\n      even to other planes of existence, but if the target\n\n      is on a different plane than you, there is a 5 percent\n\n      chance that the message doesn’t arrive. You know if\n      the delivery fails.\n        Upon receiving your message, a creature can\n      block your ability to reach it again with this spell for\n\n      8 hours. If you try to send another message during\n      that time, you learn that you are blocked, and the\n      spell fails.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "unlimited",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a copper wire",
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Sequester",
      "identity_key": "sequester",
      "content_key": "2024:sequester",
      "level": 7,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S, M (gem dust worth 5,000+ GP, which the spell consumes)",
      "duration": "Until dispelled",
      "description": "With a touch, you magically sequester an object or a\n\n      willing creature. For the duration, the target has the\n\n      Invisible condition and can’t be targeted by Divination spells, detected by magic, or viewed remotely\n      with magic.\n        If the target is a creature, it enters a state of suspended animation; it has the Unconscious condition,\n\n      doesn’t age, and doesn’t need food, water, or air.\n        You can set a condition for the spell to end early.\n      The condition can be anything you choose, but it\n      must occur or be visible within 1 mile of the target.\n      Examples include “after 1,000 years” or “when the\n      tarrasque awakens.” This spell also ends if the target takes any damage.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "gem dust worth 5,000+ GP, which the spell consumes",
        "cost": {
          "copper": 500000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "until_dispelled",
        "or_triggered": false
      }
    },
    {
      "name": "Shapechange",
      "identity_key": "shapechange",
      "content_key": "2024:shapechange",
      "level": 9,
      "school": "Transmutation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S, M (a jade circlet worth 1,500+ GP)",
      "duration": "Concentration, up to 1 hour",
      "description": "You shape-shift into another creature for the duration or until you take a Magic action to shape-shift\ninto a different eligible form. The new form must be\nof a creature that has a Challenge Rating no higher\nthan your level or Challenge Rating. You must have\nseen the sort of creature before, and it can’t be a\nConstruct or an Undead.\n  When you cast the spell, you gain a number of\nTemporary Hit Points equal to the Hit Points of the\nfirst form into which you shape-shift. These Temporary Hit Points vanish if any remain when the spell\n\nends.\n\n  Your game statistics are replaced by the stat block\n\nof the chosen form, but you retain your creature\n\ntype; alignment; personality; Intelligence, Wisdom,\n\nand Charisma scores; Hit Points; Hit Point Dice; proficiencies; and ability to communicate. If you have\n\nthe Spellcasting feature, you retain it too.\n\n  Upon shape-shifting, you determine whether your\n\nequipment drops to the ground or changes in size\n\nand shape to fit the new form while you’re in it.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a jade circlet worth 1,500+ GP",
        "cost": {
          "copper": 150000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Shatter",
      "identity_key": "shatter",
      "content_key": "2024:shatter",
      "level": 2,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S, M (a chip of mica)",
      "duration": "Instantaneous",
      "description": "A loud noise erupts from a point of your choice\nwithin range. Each creature in a 10-foot-radius\nSphere centered there makes a Constitution saving\nthrow, taking 3d8 Thunder damage on a failed save\nor half as much damage on a successful one. A Construct has Disadvantage on the save.\n  A nonmagical object that isn’t being worn or carried also takes the damage if it’s in the spell’s area.\n\n  Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 2.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a chip of mica",
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Shield",
      "identity_key": "shield",
      "content_key": "2024:shield",
      "level": 1,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Reaction, which you take when you are hit by an attack roll or targeted by the Magic Missile spell",
      "action_type": "Reaction",
      "range": "Self",
      "components": "V, S",
      "duration": "1 round",
      "description": "An imperceptible barrier of magical force protects\nyou. Until the start of your next turn, you have a +5\n\n\n      bonus to AC, including against the triggering attack,\n      and you take no damage from Magic Missile.",
      "casting_time_value": {
        "options": [
          {
            "unit": "reaction",
            "trigger": "which you take when you are hit by an attack roll or targeted by the Magic Missile spell",
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "round",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Shield of Faith",
      "identity_key": "shield-of-faith",
      "content_key": "2024:shield-of-faith",
      "level": 1,
      "school": "Abjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Bonus Action",
      "action_type": "Bonus Action",
      "range": "60 feet",
      "components": "V, S, M (a prayer scroll)",
      "duration": "Concentration, up to 10 minutes",
      "description": "A shimmering field surrounds a creature of your\n\n      choice within range, granting it a +2 bonus to AC for\n\n      the duration.",
      "casting_time_value": {
        "options": [
          {
            "unit": "bonus_action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a prayer scroll",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Shillelagh",
      "identity_key": "shillelagh",
      "content_key": "2024:shillelagh",
      "level": 0,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Bonus Action",
      "action_type": "Bonus Action",
      "range": "Self",
      "components": "V, S, M (mistletoe)",
      "duration": "1 minute",
      "description": "A Club or Quarterstaff you are holding is imbued\n      with nature’s power. For the duration, you can use\n      your spellcasting ability instead of Strength for the\n      attack and damage rolls of melee attacks using that\n      weapon, and the weapon’s damage die becomes\n\n      a d8. If the attack deals damage, it can be Force\n\n      damage or the weapon’s normal damage type (your\n\n      choice).\n\n        The spell ends early if you cast it again or if you let\n      go of the weapon.\n        Cantrip Upgrade. The damage die changes when\n      you reach levels 5 (d10), 11 (d12), and 17 (2d6).",
      "casting_time_value": {
        "options": [
          {
            "unit": "bonus_action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "mistletoe",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Shining Smite",
      "identity_key": "shining-smite",
      "content_key": "2024:shining-smite",
      "level": 2,
      "school": "Transmutation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Bonus Action, which you take immedi- ately after hitting a creature with a Melee weapon or an Unarmed Strike",
      "action_type": "Bonus Action",
      "range": "Self",
      "components": "V",
      "duration": "Concentration, up to 1 minute",
      "description": "The target hit by the strike takes an extra 2d6 Radiant damage from the attack. Until the spell ends, the\n      target sheds Bright Light in a 5-foot radius, attack\n      rolls against it have Advantage, and it can’t benefit\n      from the Invisible condition.\n        Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 2.",
      "casting_time_value": {
        "options": [
          {
            "unit": "bonus_action",
            "trigger": "which you take immedi- ately after hitting a creature with a Melee weapon or an Unarmed Strike",
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Shocking Grasp",
      "identity_key": "shocking-grasp",
      "content_key": "2024:shocking-grasp",
      "level": 0,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "Lightning springs from you to a creature that you\n      try to touch. Make a melee spell attack against the\n\n\ntarget. On a hit, the target takes 1d8 Lightning damage, and it can’t make Opportunity Attacks until the\nstart of its next turn.\n  Cantrip Upgrade. The damage increases by 1d8\nwhen you reach levels 5 (2d8), 11 (3d8), and 17\n(4d8).",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Silence",
      "identity_key": "silence",
      "content_key": "2024:silence",
      "level": 2,
      "school": "Illusion",
      "ritual": true,
      "concentration": true,
      "casting_time": "Action or Ritual",
      "action_type": "Action",
      "range": "120 feet",
      "components": "V, S",
      "duration": "Concentration, up to 10 minutes",
      "description": "For the duration, no sound can be created within\nor pass through a 20-foot-radius Sphere centered\non a point you choose within range. Any creature\nor object entirely inside the Sphere has Immunity\nto Thunder damage, and creatures have the Deafened condition while entirely inside it. Casting a\nspell that includes a Verbal component is impossible\nthere.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": true
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Silent Image",
      "identity_key": "silent-image",
      "content_key": "2024:silent-image",
      "level": 1,
      "school": "Illusion",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S, M (a bit of fleece)",
      "duration": "Concentration, up to 10 minutes",
      "description": "You create the image of an object, a creature, or\nsome other visible phenomenon that is no larger\nthan a 15-foot Cube. The image appears at a spot\nwithin range and lasts for the duration. The image\nis purely visual; it isn’t accompanied by sound,\nsmell, or other sensory effects.\n  As a Magic action, you can cause the image\nto move to any spot within range. As the image\nchanges location, you can alter its appearance so\nthat its movements appear natural for the image.\nFor example, if you create an image of a creature\nand move it, you can alter the image so that it appears to be walking.\n  Physical interaction with the image reveals it to\nbe an illusion, since things can pass through it. A\ncreature that takes a Study action to examine the\nimage can determine that it is an illusion with a\nsuccessful Intelligence (Investigation) check against\nyour spell save DC. If a creature discerns the illusion for what it is, the creature can see through the\nimage.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a bit of fleece",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Simulacrum",
      "identity_key": "simulacrum",
      "content_key": "2024:simulacrum",
      "level": 7,
      "school": "Illusion",
      "ritual": false,
      "concentration": false,
      "casting_time": "12 hours",
      "action_type": null,
      "range": "Touch",
      "components": "V, S, M (powdered ruby worth 1,500+ GP, which the spell consumes)",
      "duration": "Until dispelled",
      "description": "You create a simulacrum of one Beast or Humanoid\n      that is within 10 feet of you for the entire casting of\n      the spell. You finish the casting by touching both the\n      creature and a pile of ice or snow that is the same\n      size as that creature, and the pile turns into the\n      simulacrum, which is a creature. It uses the game\n      statistics of the original creature at the time of casting, except it is a Construct, its Hit Point maximum\n      is half as much, and it can’t cast this spell.\n        The simulacrum is Friendly to you and creatures\n      you designate. It obeys your commands and acts on\n      your turn in combat. The simulacrum can’t gain levels, and it can’t take Short or Long Rests.\n        If the simulacrum takes damage, the only way\n      to restore its Hit Points is to repair it as you take a\n      Long Rest, during which you expend components\n      worth 100 GP per Hit Point restored. The simulacrum must stay within 5 feet of you for the repair.\n        The simulacrum lasts until it drops to 0 Hit Points,\n      at which point it reverts to snow and melts away. If\n      you cast this spell again, any simulacrum you created with this spell is instantly destroyed.",
      "casting_time_value": {
        "options": [
          {
            "unit": "hour",
            "amount": 12,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "powdered ruby worth 1,500+ GP, which the spell consumes",
        "cost": {
          "copper": 150000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "until_dispelled",
        "or_triggered": false
      }
    },
    {
      "name": "Sleep",
      "identity_key": "sleep",
      "content_key": "2024:sleep",
      "level": 1,
      "school": "Enchantment",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S, M (a pinch of sand or rose petals)",
      "duration": "Concentration, up to 1 minute",
      "description": "Each creature of your choice in a 5-foot-radius\n      Sphere centered on a point within range must succeed on a Wisdom saving throw or have the Incapacitated condition until the end of its next turn,\n      at which point it must repeat the save. If the target\n      fails the second save, the target has the Unconscious\n      condition for the duration. The spell ends on a target if it takes damage or someone within 5 feet of it\n      takes an action to shake it out of the spell’s effect.\n        Creatures that don’t sleep, such as elves, or that\n      have Immunity to the Exhaustion condition automatically succeed on saves against this spell.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a pinch of sand or rose petals",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Sleet Storm",
      "identity_key": "sleet-storm",
      "content_key": "2024:sleet-storm",
      "level": 3,
      "school": "Conjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "150 feet",
      "components": "V, S, M (a miniature umbrella)",
      "duration": "Concentration, up to 1 minute",
      "description": "Until the spell ends, sleet falls in a 40-foot-tall,\n      20-foot-radius Cylinder centered on a point you\n      choose within range. The area is Heavily Obscured,\n      and exposed flames in the area are doused.\n        Ground in the Cylinder is Difficult Terrain. When\n      a creature enters the Cylinder for the first time on\n      a turn or starts its turn there, it must succeed on a\n\n\nDexterity saving throw or have the Prone condition\nand lose Concentration.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 150,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a miniature umbrella",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Slow",
      "identity_key": "slow",
      "content_key": "2024:slow",
      "level": 3,
      "school": "Transmutation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "V, S, M (a drop of molasses)",
      "duration": "Concentration, up to 1 minute",
      "description": "You alter time around up to six creatures of your\nchoice in a 40-foot Cube within range. Each target\nmust succeed on a Wisdom saving throw or be affected by this spell for the duration.\n   An affected target’s Speed is halved, it takes a −2\npenalty to AC and Dexterity saving throws, and it\ncan’t take Reactions. On its turns, it can take either\nan action or a Bonus Action, not both, and it can\nmake only one attack if it takes the Attack action. If\nit casts a spell with a Somatic component, there is\na 25 percent chance the spell fails as a result of the\ntarget making the spell’s gestures too slowly.\n   An affected target repeats the save at the end\nof each of its turns, ending the spell on itself on a\nsuccess.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a drop of molasses",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Sorcerous Burst",
      "identity_key": "sorcerous-burst",
      "content_key": "2024:sorcerous-burst",
      "level": 0,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "You cast sorcerous energy at one creature or object\nwithin range. Make a ranged spell attack against the\ntarget. On a hit, the target takes 1d8 damage of a\ntype you choose: Acid, Cold, Fire, Lightning, Poison,\nPsychic, or Thunder.\n  If you roll an 8 on a d8 for this spell, you can roll\nanother d8, and add it to the damage. When you cast\nthis spell, the maximum number of these d8s you\ncan add to the spell’s damage equals your spellcasting ability modifier.\n  Cantrip Upgrade. The damage increases by 1d8\nwhen you reach levels 5 (2d8), 11 (3d8), and 17\n(4d8).",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Spare the Dying",
      "identity_key": "spare-the-dying",
      "content_key": "2024:spare-the-dying",
      "level": 0,
      "school": "Necromancy",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "15 feet",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "Choose a creature within range that has 0 Hit Points\nand isn’t dead. The creature becomes Stable.\n  Cantrip Upgrade. The range doubles when you\nreach levels 5 (30 feet), 11 (60 feet), and 17 (120\nfeet).",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 15,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Speak with Animals",
      "identity_key": "speak-with-animals",
      "content_key": "2024:speak-with-animals",
      "level": 1,
      "school": "Divination",
      "ritual": true,
      "concentration": false,
      "casting_time": "Action or Ritual",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S",
      "duration": "10 minutes",
      "description": "For the duration, you can comprehend and verbally\n      communicate with Beasts, and you can use any of\n      the Influence action’s skill options with them.\n         Most Beasts have little to say about topics that\n      don’t pertain to survival or companionship, but at\n      minimum, a Beast can give you information about\n      nearby locations and monsters, including whatever\n      it has perceived within the past day.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": true
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Speak with Dead",
      "identity_key": "speak-with-dead",
      "content_key": "2024:speak-with-dead",
      "level": 3,
      "school": "Necromancy",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "10 feet",
      "components": "V, S, M (burning incense)",
      "duration": "10 minutes",
      "description": "You grant the semblance of life to a corpse of your\n      choice within range, allowing it to answer questions you pose. The corpse must have a mouth, and\n      this spell fails if the deceased creature was Undead\n      when it died. The spell also fails if the corpse was\n      the target of this spell within the past 10 days.\n        Until the spell ends, you can ask the corpse up to\n      five questions. The corpse knows only what it knew\n\n      in life, including the languages it knew. Answers are\n\n      usually brief, cryptic, or repetitive, and the corpse\n\n      is under no compulsion to offer a truthful answer if\n\n      you are antagonistic toward it or it recognizes you\n\n      as an enemy. This spell doesn’t return the creature’s\n\n      soul to its body, only its animating spirit. Thus, the\n\n      corpse can’t learn new information, doesn’t comprehend anything that has happened since it died, and\n\n      can’t speculate about future events.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 10,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "burning incense",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Speak with Plants",
      "identity_key": "speak-with-plants",
      "content_key": "2024:speak-with-plants",
      "level": 3,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S",
      "duration": "10 minutes",
      "description": "You imbue plants in an immobile 30-foot Emanation\n      with limited sentience and animation, giving them\n      the ability to communicate with you and follow your\n\n      simple commands. You can question plants about\n\n      events in the spell’s area within the past day, gaining information about creatures that have passed,\n\n      weather, and other circumstances.\n\n        You can also turn Difficult Terrain caused by plant\n\n      growth (such as thickets and undergrowth) into\n\n      ordinary terrain that lasts for the duration. Or you\n\n\ncan turn ordinary terrain where plants are present\ninto Difficult Terrain that lasts for the duration.\n  The spell doesn’t enable plants to uproot themselves and move about, but they can move their\nbranches, tendrils, and stalks for you.\n  If a Plant creature is in the area, you can communicate with it as if you shared a common language.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Spider Climb",
      "identity_key": "spider-climb",
      "content_key": "2024:spider-climb",
      "level": 2,
      "school": "Transmutation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S, M (a drop of bitumen and a spider)",
      "duration": "Concentration, up to 1 hour",
      "description": "Until the spell ends, one willing creature you touch\ngains the ability to move up, down, and across\nvertical surfaces and along ceilings, while leaving\nits hands free. The target also gains a Climb Speed\n\n\nequal to its Speed.\n  Using a Higher-Level Spell Slot. You can target\none additional creature for each spell slot level\nabove 2.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a drop of bitumen and a spider",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Spike Growth",
      "identity_key": "spike-growth",
      "content_key": "2024:spike-growth",
      "level": 2,
      "school": "Transmutation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "150 feet",
      "components": "V, S, M (seven thorns)",
      "duration": "Concentration, up to 10 minutes",
      "description": "The ground in a 20-foot-radius Sphere centered\n\non a point within range sprouts hard spikes and\n\nthorns. The area becomes Difficult Terrain for the\n\nduration. When a creature moves into or within the\n\narea, it takes 2d4 Piercing damage for every 5 feet it\n\ntravels.\n\n  The transformation of the ground is camouflaged\n\nto look natural. Any creature that can’t see the area\n\nwhen the spell is cast must take a Search action\n\nand succeed on a Wisdom (Perception or Survival)\ncheck against your spell save DC to recognize the\nterrain as hazardous before entering it.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 150,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "seven thorns",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Spirit Guardians",
      "identity_key": "spirit-guardians",
      "content_key": "2024:spirit-guardians",
      "level": 3,
      "school": "Conjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S, M (a prayer scroll)",
      "duration": "Concentration, up to 10 minutes",
      "description": "Protective spirits flit around you in a 15-foot Emanation for the duration. If you are good or neutral,\n\ntheir spectral form appears angelic or fey (your\n\nchoice). If you are evil, they appear fiendish.\n\n  When you cast this spell, you can designate creatures to be unaffected by it. Any other creature’s\n\nSpeed is halved in the Emanation, and whenever the\n\nEmanation enters a creature’s space and whenever\n\n\n      a creature enters the Emanation or ends its turn\n      there, the creature must make a Wisdom saving\n      throw. On a failed save, the creature takes 3d8 Radiant damage (if you are good or neutral) or 3d8 Necrotic damage (if you are evil). On a successful save,\n      the creature takes half as much damage. A creature\n      makes this save only once per turn.\n        Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 3.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a prayer scroll",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Spiritual Weapon",
      "identity_key": "spiritual-weapon",
      "content_key": "2024:spiritual-weapon",
      "level": 2,
      "school": "Evocation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Bonus Action",
      "action_type": "Bonus Action",
      "range": "60 feet",
      "components": "V, S",
      "duration": "Concentration, up to 1 minute",
      "description": "You create a floating, spectral force that resembles\n      a weapon of your choice and lasts for the duration.\n      The force appears within range in a space of your\n      choice, and you can immediately make one melee\n      spell attack against one creature within 5 feet of the\n      force. On a hit, the target takes Force damage equal\n      to 1d8 plus your spellcasting ability modifier.\n        As a Bonus Action on your later turns, you can\n      move the force up to 20 feet and repeat the attack\n      against a creature within 5 feet of it.\n        Using a Higher-Level Spell Slot. The damage increases by 1d8 for every slot level above 2.",
      "casting_time_value": {
        "options": [
          {
            "unit": "bonus_action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Starry Wisp",
      "identity_key": "starry-wisp",
      "content_key": "2024:starry-wisp",
      "level": 0,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "You launch a mote of light at one creature or object\n      within range. Make a ranged spell attack against the\n      target. On a hit, the target takes 1d8 Radiant damage, and until the end of your next turn, it emits Dim\n      Light in a 10-foot radius and can’t benefit from the\n      Invisible condition.\n        Cantrip Upgrade. The damage increases by 1d8\n      when you reach levels 5 (2d8), 11 (3d8), and 17\n      (4d8).",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Stinking Cloud",
      "identity_key": "stinking-cloud",
      "content_key": "2024:stinking-cloud",
      "level": 3,
      "school": "Conjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "90 feet",
      "components": "V, S, M (a rotten egg)",
      "duration": "Concentration, up to 1 minute",
      "description": "You create a 20-foot-radius Sphere of yellow, nauseating gas centered on a point within range. The\n      cloud is Heavily Obscured. The cloud lingers in the\n      air for the duration or until a strong wind (such as\n      the one created by Gust of Wind) disperses it.\n\n\n  Each creature that starts its turn in the Sphere\nmust succeed on a Constitution saving throw or\nhave the Poisoned condition until the end of the current turn. While Poisoned in this way, the creature\ncan’t take an action or a Bonus Action.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 90,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a rotten egg",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Stone Shape",
      "identity_key": "stone-shape",
      "content_key": "2024:stone-shape",
      "level": 4,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S, M (soft clay)",
      "duration": "Instantaneous",
      "description": "You touch a stone object of Medium size or smaller\n\nor a section of stone no more than 5 feet in any dimension and form it into any shape you like. For example, you could shape a large rock into a weapon,\nstatue, or coffer, or you could make a small passage\nthrough a wall that is 5 feet thick. You could also\nshape a stone door or its frame to seal the door shut.\nThe object you create can have up to two hinges and\na latch, but finer mechanical detail isn’t possible.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "soft clay",
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Stoneskin",
      "identity_key": "stoneskin",
      "content_key": "2024:stoneskin",
      "level": 4,
      "school": "Transmutation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S, M (diamond dust worth 100+ GP, which the spell consumes)",
      "duration": "Concentration, up to 1 hour",
      "description": "Until the spell ends, one willing creature you touch\nhas Resistance to Bludgeoning, Piercing, and Slashing damage.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "diamond dust worth 100+ GP, which the spell consumes",
        "cost": {
          "copper": 10000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Storm of Vengeance",
      "identity_key": "storm-of-vengeance",
      "content_key": "2024:storm-of-vengeance",
      "level": 9,
      "school": "Conjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "1 mile",
      "components": "V, S",
      "duration": "Concentration, up to 1 minute",
      "description": "A churning storm cloud forms for the duration,\ncentered on a point within range and spreading to\na radius of 300 feet. Each creature under the cloud\nwhen it appears must succeed on a Constitution\nsaving throw or take 2d6 Thunder damage and have\nthe Deafened condition for the duration.\n  At the start of each of your later turns, the storm\nproduces different effects, as detailed below.\n\n  Turn 2. Acidic rain falls. Each creature and object\n\nunder the cloud takes 4d6 Acid damage.\n\n  Turn 3. You call six bolts of lightning from the\ncloud to strike six different creatures or objects\nbeneath it. Each target makes a Dexterity saving\nthrow, taking 10d6 Lightning damage on a failed\nsave or half as much damage on a successful one.\n\n\n        Turn 4. Hailstones rain down. Each creature under the cloud takes 2d6 Bludgeoning damage.\n\n        Turns 5–10. Gusts and freezing rain assail the\n      area under the cloud. Each creature there takes 1d6\n      Cold damage. Until the spell ends, the area is Difficult Terrain and Heavily Obscured, ranged attacks\n      with weapons are impossible there, and strong\n\n      wind blows through the area.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 5280,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Suggestion",
      "identity_key": "suggestion",
      "content_key": "2024:suggestion",
      "level": 2,
      "school": "Enchantment",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, M (a drop of honey)",
      "duration": "Concentration, up to 8 hours",
      "description": "You suggest a course of activity—described in no\n      more than 25 words—to one creature you can see\n      within range that can hear and understand you.\n      The suggestion must sound achievable and not involve anything that would obviously deal damage\n      to the target or its allies. For example, you could\n      say, “Fetch the key to the cult’s treasure vault, and\n      give the key to me.” Or you could say, “Stop fighting,\n      leave this library peacefully, and don’t return.”\n        The target must succeed on a Wisdom saving\n      throw or have the Charmed condition for the duration or until you or your allies deal damage to the\n      target. The Charmed target pursues the suggestion\n      to the best of its ability. The suggested activity\n      can continue for the entire duration, but if the suggested activity can be completed in a shorter time,\n      the spell ends for the target upon completing it.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": "a drop of honey",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 8,
        "unit": "hour",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Summon Dragon",
      "identity_key": "summon-dragon",
      "content_key": "2024:summon-dragon",
      "level": 5,
      "school": "Conjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S, M (an object with the image of a dragon engraved on it worth 500+ GP)",
      "duration": "Concentration, up to 1 hour",
      "description": "You call forth a Dragon spirit. It manifests in an unoccupied space that you can see within range and\n      uses the Draconic Spirit stat block. The creature\n      disappears when it drops to 0 Hit Points or when\n      the spell ends.\n        The creature is an ally to you and your allies. In\n      combat, the creature shares your Initiative count,\n      but it takes its turn immediately after yours. It\n      obeys your verbal commands (no action required by\n      you). If you don’t issue any, it takes the Dodge action\n      and uses its movement to avoid danger.\n        Using a Higher-Level Spell Slot. Use the spell\n      slot’s level for the spell’s level in the stat block.\n\n\nDraconic Spirit\n\nLarge Dragon, Neutral\n\nAC 14 + the spell’s level\nHP 50 + 10 for each spell level above 5\nSpeed 30 ft., Fly 60 ft., Swim 30 ft.\n          MOD SAVE           MOD SAVE            MOD SAVE\n\nStr 19 +4 +4         Dex 14 +2 +2         Con 17 +3 +3\nInt 10 +0 +0         Wis 14 +2 +2         Cha 14 +2 +2\n\nResistances Acid, Cold, Fire, Lightning, Poison\nImmunities Charmed, Frightened, Poisoned\nSenses Blindsight 30 ft., Darkvision 60 ft.;\n  Passive Perception 12\nLanguages Draconic, understands the languages you know\nCR None (XP 0; PB equals your Proficiency Bonus)\n\nTraits\nShared Resistances. When you summon the spirit,\nchoose one of its Resistances. You have Resistance to\nthe chosen damage type until the spell ends.\n\nActions\nMultiattack. The spirit makes a number of Rend attacks\nequal to half the spell’s level (round down), and it uses\nBreath Weapon.\n\nRend. Melee Attack Roll: Bonus equals your spell attack\nmodifier, reach 10 feet. Hit: 1d6 + 4 + the spell’s level\nPiercing damage.\nBreath Weapon. Dexterity Saving Throw: DC equals\nyour spell save DC, each creature in a 30-foot Cone.\nFailure: 2d6 damage of a type this spirit has Resistance\nto (your choice when you cast the spell). Success:\nHalf damage.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "an object with the image of a dragon engraved on it worth 500+ GP",
        "cost": {
          "copper": 50000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Sunbeam",
      "identity_key": "sunbeam",
      "content_key": "2024:sunbeam",
      "level": 6,
      "school": "Evocation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S, M (a magnifying glass)",
      "duration": "Concentration, up to 1 minute",
      "description": "You launch a sunbeam in a 5-foot-wide, 60-foot-long\nLine. Each creature in the Line makes a Constitution\nsaving throw. On a failed save, a creature takes 6d8\nRadiant damage and has the Blinded condition until\nthe start of your next turn. On a successful save, it\ntakes half as much damage only.\n  Until the spell ends, you can take a Magic action to\ncreate a new Line of radiance.\n  For the duration, a mote of brilliant radiance\nshines above you. It sheds Bright Light in a 30-foot\nradius and Dim Light for an additional 30 feet. This\nlight is sunlight.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a magnifying glass",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Sunburst",
      "identity_key": "sunburst",
      "content_key": "2024:sunburst",
      "level": 8,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "150 feet",
      "components": "V, S, M (a piece of sunstone)",
      "duration": "Instantaneous",
      "description": "Brilliant sunlight flashes in a 60-foot-radius Sphere\n      centered on a point you choose within range. Each\n      creature in the Sphere makes a Constitution saving\n      throw. On a failed save, a creature takes 12d6 Radiant damage and has the Blinded condition for 1\n      minute. On a successful save, it takes half as much\n      damage only.\n        A creature Blinded by this spell makes another\n      Constitution saving throw at the end of each of its\n      turns, ending the effect on itself on a success.\n        This spell dispels Darkness in its area that was\n      created by any spell.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 150,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a piece of sunstone",
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Symbol",
      "identity_key": "symbol",
      "content_key": "2024:symbol",
      "level": 7,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "1 minute",
      "action_type": null,
      "range": "Touch",
      "components": "V, S, M (powdered diamond worth 1,000+ GP, which the spell consumes)",
      "duration": "Until dispelled or triggered",
      "description": "You inscribe a harmful glyph either on a surface\n      (such as a section of floor or wall) or within an object that can be closed (such as a book or chest). The\n\n      glyph can cover an area no larger than 10 feet in\n      diameter. If you choose an object, it must remain in\n      place; if it is moved more than 10 feet from where\n      you cast this spell, the glyph is broken, and the spell\n      ends without being triggered.\n         The glyph is nearly imperceptible and requires a\n      successful Wisdom (Perception) check against your\n      spell save DC to notice.\n         When you inscribe the glyph, you set its trigger\n      and choose which effect the symbol bears: Death,\n      Discord, Fear, Pain, Sleep, or Stunning. Each one is\n      explained below.\n         Set the Trigger. You decide what triggers the\n      glyph when you cast the spell. For glyphs inscribed\n      on a surface, common triggers include touching or\n      stepping on the glyph, removing another object covering it, or approaching within a certain distance of\n      it. For glyphs inscribed within an object, common\n      triggers include opening that object or seeing the\n      glyph.\n         You can refine the trigger so that only creatures\n      of certain types activate it (for example, the glyph\n      could be set to affect Aberrations). You can also set\n      conditions for creatures that don’t trigger the glyph,\n      such as those who say a certain password.\n         Once triggered, the glyph glows, filling a\n      60-foot-radius Sphere with Dim Light for 10\n\n\nminutes, after which time the spell ends. Each\ncreature in the Sphere when the glyph activates is\ntargeted by its effect, as is a creature that enters the\n\n\nSphere for the first time on a turn or ends its turn\nthere. A creature is targeted only once per turn.\n  Death. Each target makes a Constitution saving\nthrow, taking 10d10 Necrotic damage on a failed\nsave or half as much damage on a successful save.\n  Discord. Each target makes a Wisdom saving\nthrow. On a failed save, a target argues with other\ncreatures for 1 minute. During this time, it is incapable of meaningful communication and has Disadvantage on attack rolls and ability checks.\n  Fear. Each target must succeed on a Wisdom\nsaving throw or have the Frightened condition for\n1 minute. While Frightened, the target must move\nat least 30 feet away from the glyph on each of its\nturns, if able.\n  Pain. Each target must succeed on a Constitution\nsaving throw or have the Incapacitated condition\n\nfor 1 minute.\n\n  Sleep. Each target must succeed on a Wisdom saving throw or have the Unconscious condition for 10\nminutes. A creature awakens if it takes damage or if\nsomeone takes an action to shake it awake.\n  Stunning. Each target must succeed on a Wisdom\nsaving throw or have the Stunned condition for 1\nminute.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "powdered diamond worth 1,000+ GP, which the spell consumes",
        "cost": {
          "copper": 100000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "until_dispelled",
        "or_triggered": true
      }
    },
    {
      "name": "Telekinesis",
      "identity_key": "telekinesis",
      "content_key": "2024:telekinesis",
      "level": 5,
      "school": "Transmutation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S",
      "duration": "Concentration, up to 10 minutes",
      "description": "You gain the ability to move or manipulate creatures or objects by thought. When you cast the spell\nand as a Magic action on your later turns before the\nspell ends, you can exert your will on one creature\nor object that you can see within range, causing the\nappropriate effect below. You can affect the same\ntarget round after round or choose a new one at any\ntime. If you switch targets, the prior target is no\nlonger affected by the spell.\n  Creature. You can try to move a Huge or smaller\ncreature. The target must succeed on a Strength\nsaving throw, or you move it up to 30 feet in any\ndirection within the spell’s range. Until the end of\nyour next turn, the creature has the Restrained condition, and if you lift it into the air, it is suspended\nthere. It falls at the end of your next turn unless you\nuse this option on it again and it fails the save.\n  Object. You can try to move a Huge or smaller\nobject. If the object isn’t being worn or carried, you\nautomatically move it up to 30 feet in any direction\nwithin the spell’s range.\n\n\n        If the object is worn or carried by a creature, that\n      creature must succeed on a Strength saving throw,\n      or you pull the object away and move it up to 30 feet\n\n      in any direction within the spell’s range.\n\n        You can exert fine control on objects with your\n\n      telekinetic grip, such as manipulating a simple tool,\n\n      opening a door or a container, stowing or retrieving an item\n      from an open container, or pouring the contents from a vial.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Telepathic Bond",
      "identity_key": "telepathic-bond",
      "content_key": "2024:telepathic-bond",
      "level": 5,
      "school": "Divination",
      "ritual": true,
      "concentration": false,
      "casting_time": "Action or Ritual",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S, M (two eggs)",
      "duration": "1 hour",
      "description": "You forge a telepathic link among up to eight willing\n      creatures of your choice within range, psychically\n      linking each creature to all the others for the duration. Creatures that can’t communicate in any languages aren’t affected by this spell.\n        Until the spell ends, the targets can communicate\n      telepathically through the bond whether or not they\n      share a language. The communication is possible\n\n      over any distance, though it can’t extend to other\n\n      planes of existence.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": true
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "two eggs",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Teleport",
      "identity_key": "teleport",
      "content_key": "2024:teleport",
      "level": 7,
      "school": "Conjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "10 feet",
      "components": "V",
      "duration": "Instantaneous",
      "description": "This spell instantly transports you and up to eight\n      willing creatures that you can see within range, or a\n      single object that you can see within range, to a destination you select. If you target an object, it must\n      be Large or smaller, and it can’t be held or carried\n      by an unwilling creature.\n        The destination you choose must be known to\n      you, and it must be on the same plane of existence\n      as you. Your familiarity with the destination determines whether you arrive there successfully. The\n      GM rolls 1d100 and consults the Teleportation Outcome table and the explanations after it.\n\n      Teleportation Outcome\n                                   Similar    Off      On\n      Familiarity         Mishap    Area     Target   Target\n      Permanent circle      —        —        —       01–00\n      Linked object         —        —        —       01–00\n      Very familiar       01–05    06–13     14–24    25–00\n\n      Seen casually       01–33    34–43     44–53    54–00\n\n      Viewed once or      01–43    44–53     54–73    74–00\n      described\n      False destination   01–50    51–00      —        —\n\n\n  Familiarity. Here are the meanings of the terms\nin the table’s Familiarity column:\n\n• “Permanent circle” means a permanent teleportation circle whose sigil sequence you know.\n\n• “Linked object” means you possess an object taken\n\n  from the desired destination within the last six\n  months, such as a book from a wizard’s library.\n• “Very familiar” is a place you have visited often,\n  a place you have carefully studied, or a place you\n\n  can see when you cast the spell.\n\n\n• “Seen casually” is a place you have seen more\n  than once but with which you aren’t very familiar.\n• “Viewed once or described” is a place you have\n  seen once, possibly using magic, or a place you\n  know through someone else’s description, perhaps from a map.\n• “False destination” is a place that doesn’t exist.\n  Perhaps you tried to scry an enemy’s sanctum but\n  instead viewed an illusion, or you are attempting\n  to teleport to a location that no longer exists.\n\n  Mishap. The spell’s unpredictable magic results in\n\na difficult journey. Each teleporting creature (or the\n\ntarget object) takes 3d10 Force damage, and the GM\nrerolls on the table to see where you wind up (multiple mishaps can occur, dealing damage each time).\n  Similar Area. You and your group (or the target\nobject) appear in a different area that’s visually or\nthematically similar to the target area. You appear\nin the closest similar place. If you are heading for\nyour home laboratory, for example, you might appear in another person’s laboratory in the same city.\n  Off Target. You and your group (or the target object) appear 2d12 miles away from the destination\nin a random direction. Roll 1d8 for the direction: 1,\neast; 2, southeast; 3, south; 4, southwest; 5, west; 6,\nnorthwest; 7, north; or 8, northeast.\n  On Target. You and your group (or the target object) appear where you intended.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 10,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Teleportation Circle",
      "identity_key": "teleportation-circle",
      "content_key": "2024:teleportation-circle",
      "level": 5,
      "school": "Conjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "1 minute",
      "action_type": null,
      "range": "10 feet",
      "components": "V, M (rare inks worth 50+ GP, which the spell consumes)",
      "duration": "1 round",
      "description": "As you cast the spell, you draw a 5-foot-radius circle\non the ground inscribed with sigils that link your\nlocation to a permanent teleportation circle of your\nchoice whose sigil sequence you know and that is\n\non the same plane of existence as you. A shimmering portal opens within the circle you drew and\nremains open until the end of your next turn. Any\ncreature that enters the portal instantly appears\nwithin 5 feet of the destination circle or in the nearest unoccupied space if that space is occupied.\n\n\n        Many major temples, guildhalls, and other important places have permanent teleportation circles.\n      Each circle includes a unique sigil sequence—a\n      string of runes arranged in a particular pattern.\n        When you first gain the ability to cast this spell,\n      you learn the sigil sequences for two destinations\n      on the Material Plane, determined by the GM. You\n      might learn additional sigil sequences during your\n      adventures. You can commit a new sigil sequence to\n      memory after studying it for 1 minute.\n        You can create a permanent teleportation circle\n      by casting this spell in the same location every day\n      for 365 days.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 10,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": "rare inks worth 50+ GP, which the spell consumes",
        "cost": {
          "copper": 5000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "round",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Thaumaturgy",
      "identity_key": "thaumaturgy",
      "content_key": "2024:thaumaturgy",
      "level": 0,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V",
      "duration": "Up to 1 minute",
      "description": "You manifest a minor wonder within range. You create one of the effects below within range. If you cast\n      this spell multiple times, you can have up to three of\n      its 1-minute effects active at a time.\n        Altered Eyes. You alter the appearance of your\n      eyes for 1 minute.\n        Booming Voice. Your voice booms up to three\n      times as loud as normal for 1 minute. For the duration, you have Advantage on Charisma (Intimidation) checks.\n        Fire Play. You cause flames to flicker, brighten,\n      dim, or change color for 1 minute.\n        Invisible Hand. You instantaneously cause an unlocked door or window to fly open or slam shut.\n        Phantom Sound. You create an instantaneous\n      sound that originates from a point of your choice\n      within range, such as a rumble of thunder, the cry of\n      a raven, or ominous whispers.\n        Tremors. You cause harmless tremors in the\n      ground for 1 minute.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": false,
        "up_to": true
      }
    },
    {
      "name": "Thunderwave",
      "identity_key": "thunderwave",
      "content_key": "2024:thunderwave",
      "level": 1,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S",
      "duration": "Instantaneous",
      "description": "You unleash a wave of thunderous energy. Each\n      creature in a 15-foot Cube originating from you\n      makes a Constitution saving throw. On a failed\n      save, a creature takes 2d8 Thunder damage and is\n      pushed 10 feet away from you. On a successful save,\n      a creature takes half as much damage only.\n        In addition, unsecured objects that are entirely\n      within the Cube are pushed 10 feet away from you,\n      and a thunderous boom is audible within 300 feet.\n\n\n  Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 1.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Time Stop",
      "identity_key": "time-stop",
      "content_key": "2024:time-stop",
      "level": 9,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V",
      "duration": "Instantaneous",
      "description": "You briefly stop the flow of time for everyone but\nyourself. No time passes for other creatures, while\nyou take 1d4 + 1 turns in a row, during which you\ncan use actions and move as normal.\n  This spell ends if one of the actions you use during\nthis period, or any effects that you create during it,\naffects a creature other than you or an object being\n\nworn or carried by someone other than you. In addition, the spell ends if you move to a place more than\n\n1,000 feet from the location where you cast it.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Tiny Hut",
      "identity_key": "tiny-hut",
      "content_key": "2024:tiny-hut",
      "level": 3,
      "school": "Evocation",
      "ritual": true,
      "concentration": false,
      "casting_time": "1 minute or Ritual",
      "action_type": null,
      "range": "Self",
      "components": "V, S, M (a crystal bead)",
      "duration": "8 hours",
      "description": "A 10-foot Emanation springs into existence around\nyou and remains stationary for the duration. The\nspell fails when you cast it if the Emanation isn’t big\nenough to fully encapsulate all creatures in its area.\n   Creatures and objects within the Emanation\nwhen you cast the spell can move through it freely.\nAll other creatures and objects are barred from\npassing through it. Spells of level 3 or lower can’t be\ncast through it, and the effects of such spells can’t\nextend into it.\n   The atmosphere inside the Emanation is comfortable and dry, regardless of the weather outside. Until\nthe spell ends, you can command the interior to have\nDim Light or Darkness (no action required). The Emanation is opaque from the outside and of any color\nyou choose, but it’s transparent from the inside.\n   The spell ends early if you leave the Emanation or\n\nif you cast it again.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": true
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a crystal bead",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 8,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Tongues",
      "identity_key": "tongues",
      "content_key": "2024:tongues",
      "level": 3,
      "school": "Divination",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, M (a miniature ziggurat)",
      "duration": "1 hour",
      "description": "This spell grants the creature you touch the ability\nto understand any spoken or signed language that\nit hears or sees. Moreover, when the target communicates by speaking or signing, any creature that\n\n\n      knows at least one language can understand it if\n      that creature can hear the speech or see the signing.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": "a miniature ziggurat",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Transport via Plants",
      "identity_key": "transport-via-plants",
      "content_key": "2024:transport-via-plants",
      "level": 6,
      "school": "Conjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "10 feet",
      "components": "V, S",
      "duration": "1 minute",
      "description": "This spell creates a magical link between a Large\n      or larger inanimate plant within range and another\n      plant, at any distance, on the same plane of existence. You must have seen or touched the destination plant at least once before. For the duration, any\n      creature can step into the target plant and exit from\n      the destination plant by using 5 feet of movement.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 10,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Tree Stride",
      "identity_key": "tree-stride",
      "content_key": "2024:tree-stride",
      "level": 5,
      "school": "Conjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S",
      "duration": "Concentration, up to 1 minute",
      "description": "You gain the ability to enter a tree and move from\n      inside it to inside another tree of the same kind\n      within 500 feet. Both trees must be living and at\n      least the same size as you. You must use 5 feet of\n      movement to enter a tree. You instantly know the\n      location of all other trees of the same kind within\n      500 feet and, as part of the move used to enter the\n      tree, can either pass into one of those trees or step\n      out of the tree you’re in. You appear in a spot of your\n      choice within 5 feet of the destination tree, using\n      another 5 feet of movement. If you have no movement left, you appear within 5 feet of the tree you\n      entered.\n        You can use this transportation ability only once\n      on each of your turns. You must end each turn outside a tree.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "True Polymorph",
      "identity_key": "true-polymorph",
      "content_key": "2024:true-polymorph",
      "level": 9,
      "school": "Transmutation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S, M (a drop of mercury, a dollop of gum arabic, and a wisp of smoke)",
      "duration": "Concentration, up to 1 hour",
      "description": "Choose one creature or nonmagical object that you\n      can see within range. The creature shape-shifts into\n      a different creature or a nonmagical object, or the\n      object shape-shifts into a creature (the object must\n      be neither worn nor carried). The transformation\n      lasts for the duration or until the target dies or is\n      destroyed, but if you maintain Concentration on\n      this spell for the full duration, the spell lasts until\n      dispelled.\n\n\n  An unwilling creature can make a Wisdom saving\nthrow, and if it succeeds, it isn’t affected by this spell.\n  Creature into Creature. If you turn a creature\ninto another kind of creature, the new form can be\nany kind you choose that has a Challenge Rating\nequal to or less than the target’s Challenge Rating\nor level. The target’s game statistics are replaced by\nthe stat block of the new form, but it retains its Hit\nPoints, Hit Point Dice, alignment, and personality.\n  The target gains a number of Temporary Hit\nPoints equal to the Hit Points of the new form.\nThese Temporary Hit Points vanish if any remain\nwhen the spell ends.\n  The target is limited in the actions it can perform\nby the anatomy of its new form, and it can’t speak or\ncast spells.\n  The target’s gear melds into the new form. The\ncreature can’t use or otherwise benefit from any of\nthat equipment.\n  Object into Creature. You can turn an object into\nany kind of creature, as long as the creature’s size\nis no larger than the object’s size and the creature\nhas a Challenge Rating of 9 or lower. The creature is\nFriendly to you and your allies. In combat, it takes\nits turns immediately after yours, and it obeys your\ncommands.\n  If the spell lasts more than an hour, you no longer\ncontrol the creature. It might remain Friendly to\nyou, depending on how you have treated it.\n  Creature into Object. If you turn a creature into\nan object, it transforms along with whatever it is\nwearing and carrying into that form, as long as the\nobject’s size is no larger than the creature’s size. The\ncreature’s statistics become those of the object, and\nthe creature has no memory of time spent in this\nform after the spell ends and it returns to normal.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a drop of mercury, a dollop of gum arabic, and a wisp of smoke",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "True Resurrection",
      "identity_key": "true-resurrection",
      "content_key": "2024:true-resurrection",
      "level": 9,
      "school": "Necromancy",
      "ritual": false,
      "concentration": false,
      "casting_time": "1 hour",
      "action_type": null,
      "range": "Touch",
      "components": "V, S, M (diamonds worth 25,000+ GP, which the spell consumes)",
      "duration": "Instantaneous",
      "description": "You touch a creature that has been dead for no\nlonger than 200 years and that died for any reason\nexcept old age. The creature is revived with all its\nHit Points.\n   This spell closes all wounds, neutralizes any\npoison, cures all magical contagions, and lifts any\ncurses affecting the creature when it died. The spell\nreplaces damaged or missing organs and limbs.\nIf the creature was Undead, it is restored to its\nnon-Undead form.\n   The spell can provide a new body if the original\nno longer exists, in which case you must speak the\n\n\n      creature’s name. The creature then appears in an\n      unoccupied space you choose within 10 feet of you.",
      "casting_time_value": {
        "options": [
          {
            "unit": "hour",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "diamonds worth 25,000+ GP, which the spell consumes",
        "cost": {
          "copper": 2500000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "True Seeing",
      "identity_key": "true-seeing",
      "content_key": "2024:true-seeing",
      "level": 6,
      "school": "Divination",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S, M (mushroom powder worth 25+ GP, which the spell consumes)",
      "duration": "1 hour",
      "description": "For the duration, the willing creature you touch has\n\n      Truesight with a range of 120 feet.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "mushroom powder worth 25+ GP, which the spell consumes",
        "cost": {
          "copper": 2500,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "True Strike",
      "identity_key": "true-strike",
      "content_key": "2024:true-strike",
      "level": 0,
      "school": "Divination",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "S, M (a weapon with which you have profi- ciency and that is worth 1+ CP)",
      "duration": "Instantaneous",
      "description": "Guided by a flash of magical insight, you make one\n      attack with the weapon used in the spell’s casting.\n      The attack uses your spellcasting ability for the attack and damage rolls instead of using Strength or\n      Dexterity. If the attack deals damage, it can be Radiant damage or the weapon’s normal damage type\n      (your choice).\n        Cantrip Upgrade. Whether you deal Radiant damage or the weapon’s normal damage type, the attack\n      deals extra Radiant damage when you reach levels 5\n      (1d6), 11 (2d6), and 17 (3d6).",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": false,
        "somatic": true,
        "material": "a weapon with which you have profi- ciency and that is worth 1+ CP",
        "cost": {
          "copper": 1,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Tsunami",
      "identity_key": "tsunami",
      "content_key": "2024:tsunami",
      "level": 8,
      "school": "Conjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "1 minute",
      "action_type": null,
      "range": "1 mile",
      "components": "V, S",
      "duration": "Concentration, up to 6 rounds",
      "description": "A wall of water springs into existence at a point you\n      choose within range. You can make the wall up to\n      300 feet long, 300 feet high, and 50 feet thick. The\n      wall lasts for the duration.\n        When the wall appears, each creature in its area\n      makes a Strength saving throw, taking 6d10 Bludgeoning damage on a failed save or half as much\n      damage on a successful one.\n        At the start of each of your turns after the wall\n      appears, the wall, along with any creatures in it,\n      moves 50 feet away from you. Any Huge or smaller\n      creature inside the wall or whose space the wall\n      enters when it moves must succeed on a Strength\n      saving throw or take 5d10 Bludgeoning damage. A\n      creature can take this damage only once per round.\n\n      At the end of the turn, the wall’s height is reduced\n      by 50 feet, and the damage the wall deals on later\n\n\nrounds is reduced by 1d10. When the wall reaches 0\nfeet in height, the spell ends.\n  A creature caught in the wall can move by swimming. Because of the wave’s force, though, the creature must succeed on a Strength (Athletics) check\nagainst your spell save DC to move at all. If it fails\nthe check, it can’t move. A creature that moves out\nof the wall falls to the ground.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 5280,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 6,
        "unit": "round",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Unseen Servant",
      "identity_key": "unseen-servant",
      "content_key": "2024:unseen-servant",
      "level": 1,
      "school": "Conjuration",
      "ritual": true,
      "concentration": false,
      "casting_time": "Action or Ritual",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S, M (a bit of string and of wood)",
      "duration": "1 hour",
      "description": "This spell creates an Invisible, mindless, shapeless,\nMedium force that performs simple tasks at your\ncommand until the spell ends. The servant springs\ninto existence in an unoccupied space on the\nground within range. It has AC 10, 1 Hit Point, and a\nStrength of 2, and it can’t attack. If it drops to 0 Hit\nPoints, the spell ends.\n  Once on each of your turns as a Bonus Action, you\ncan mentally command the servant to move up to\n15 feet and interact with an object. The servant can\nperform simple tasks that a human could do, such as\nfetching things, cleaning, mending, folding clothes,\nlighting fires, serving food, and pouring drinks.\nOnce you give the command, the servant performs\nthe task to the best of its ability until it completes\nthe task, then waits for your next command.\n  If you command the servant to perform a task that\nwould move it more than 60 feet away from you, the\nspell ends.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": true
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a bit of string and of wood",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Vampiric Touch",
      "identity_key": "vampiric-touch",
      "content_key": "2024:vampiric-touch",
      "level": 3,
      "school": "Necromancy",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V, S",
      "duration": "Concentration, up to 1 minute",
      "description": "The touch of your shadow-wreathed hand can siphon life force from others to heal your wounds.\nMake a melee spell attack against one creature\nwithin reach. On a hit, the target takes 3d6 Necrotic\ndamage, and you regain Hit Points equal to half the\namount of Necrotic damage dealt.\n  Until the spell ends, you can make the attack again\non each of your turns as a Magic action, targeting\nthe same creature or a different one.\n  Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 3.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Vicious Mockery",
      "identity_key": "vicious-mockery",
      "content_key": "2024:vicious-mockery",
      "level": 0,
      "school": "Enchantment",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V",
      "duration": "Instantaneous",
      "description": "You unleash a string of insults laced with subtle\n      enchantments at one creature you can see or hear\n      within range. The target must succeed on a Wisdom\n      saving throw or take 1d6 Psychic damage and have\n      Disadvantage on the next attack roll it makes before\n      the end of its next turn.\n        Cantrip Upgrade. The damage increases by 1d6\n      when you reach levels 5 (2d6), 11 (3d6), and 17\n      (4d6).",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Vitriolic Sphere",
      "identity_key": "vitriolic-sphere",
      "content_key": "2024:vitriolic-sphere",
      "level": 4,
      "school": "Evocation",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "150 feet",
      "components": "V, S, M (a drop of bile)",
      "duration": "Instantaneous",
      "description": "You point at a location within range, and a glowing, 1-foot-diameter ball of acid streaks there and\n      explodes in a 20-foot-radius Sphere. Each creature\n      in that area makes a Dexterity saving throw. On a\n      failed save, a creature takes 10d4 Acid damage and\n      another 5d4 Acid damage at the end of its next turn.\n      On a successful save, a creature takes half the initial\n      damage only.\n         Using a Higher-Level Spell Slot. The initial damage increases by 2d4 for each spell slot level above\n      4.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 150,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a drop of bile",
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Wall of Fire",
      "identity_key": "wall-of-fire",
      "content_key": "2024:wall-of-fire",
      "level": 4,
      "school": "Evocation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "V, S, M (a piece of charcoal)",
      "duration": "Concentration, up to 1 minute",
      "description": "You create a wall of fire on a solid surface within\n      range. You can make the wall up to 60 feet long, 20\n      feet high, and 1 foot thick, or a ringed wall up to 20\n      feet in diameter, 20 feet high, and 1 foot thick. The\n      wall is opaque and lasts for the duration.\n        When the wall appears, each creature in its area\n      makes a Dexterity saving throw, taking 5d8 Fire\n      damage on a failed save or half as much damage on\n      a successful one.\n        One side of the wall, selected by you when you\n      cast this spell, deals 5d8 Fire damage to each creature that ends its turn within 10 feet of that side or\n      inside the wall. A creature takes the same damage\n      when it enters the wall for the first time on a turn or\n      ends its turn there. The other side of the wall deals\n      no damage.\n        Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 4.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a piece of charcoal",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Wall of Force",
      "identity_key": "wall-of-force",
      "content_key": "2024:wall-of-force",
      "level": 5,
      "school": "Evocation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "V, S, M (a shard of glass)",
      "duration": "Concentration, up to 10 minutes",
      "description": "An Invisible wall of force springs into existence at\na point you choose within range. The wall appears\nin any orientation you choose, as a horizontal or\nvertical barrier or at an angle. It can be free floating\nor resting on a solid surface. You can form it into a\nhemispherical dome or a globe with a radius of up\nto 10 feet, or you can shape a flat surface made up\nof ten 10-foot-by-10-foot panels. Each panel must\n\nbe contiguous with another panel. In any form, the\n\nwall is 1/4 inch thick and lasts for the duration. If\n\nthe wall cuts through a creature’s space when it appears, the creature is pushed to one side of the wall\n(you choose which side).\n  Nothing can physically pass through the wall. It\nis immune to all damage and can’t be dispelled by\nDispel Magic. A Disintegrate spell destroys the wall\ninstantly, however. The wall also extends into the\nEthereal Plane and blocks ethereal travel through\nthe wall.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a shard of glass",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Wall of Ice",
      "identity_key": "wall-of-ice",
      "content_key": "2024:wall-of-ice",
      "level": 6,
      "school": "Evocation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "V, S, M (a piece of quartz)",
      "duration": "Concentration, up to 10 minutes",
      "description": "You create a wall of ice on a solid surface within\n\nrange. You can form it into a hemispherical dome\n\nor a globe with a radius of up to 10 feet, or you can\n\nshape a flat surface made up of ten 10-foot-square\npanels. Each panel must be contiguous with another\npanel. In any form, the wall is 1 foot thick and lasts\nfor the duration.\n   If the wall cuts through a creature’s space when\nit appears, the creature is pushed to one side of the\nwall (you choose which side) and makes a Dexterity\nsaving throw, taking 10d6 Cold damage on a failed\nsave or half as much damage on a successful one.\n   The wall is an object that can be damaged and\nthus breached. It has AC 12 and 30 Hit Points per\n10-foot section, and it has Immunity to Cold, Poison, and Psychic damage and Vulnerability to Fire\ndamage. Reducing a 10-foot section of wall to 0 Hit\nPoints destroys it and leaves behind a sheet of frigid\nair in the space the wall occupied.\n   A creature moving through the sheet of frigid air\nfor the first time on a turn makes a Constitution\nsaving throw, taking 5d6 Cold damage on a failed\nsave or half as much damage on a successful one.\n\n\n        Using a Higher-Level Spell Slot. The damage the\n      wall deals when it appears increases by 2d6 and the\n      damage from passing through the sheet of frigid air\n      increases by 1d6 for each spell slot level above 6.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a piece of quartz",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Wall of Stone",
      "identity_key": "wall-of-stone",
      "content_key": "2024:wall-of-stone",
      "level": 5,
      "school": "Evocation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "V, S, M (a cube of granite)",
      "duration": "Concentration, up to 10 minutes",
      "description": "A nonmagical wall of solid stone springs into existence at a point you choose within range. The wall\n      is 6 inches thick and is composed of ten 10-foot-by-\n      10-foot panels. Each panel must be contiguous with\n      another panel. Alternatively, you can create 10-foot-by-20-foot panels that are only 3 inches thick.\n         If the wall cuts through a creature’s space when\n      it appears, the creature is pushed to one side of the\n      wall (you choose which side). If a creature would\n      be surrounded on all sides by the wall (or the wall\n      and another solid surface), that creature can make\n\n      a Dexterity saving throw. On a success, it can use its\n\n      Reaction to move up to its Speed so that it is no longer enclosed by the wall.\n\n         The wall can have any shape you desire, though it\n\n      can’t occupy the same space as a creature or object.\n      The wall doesn’t need to be vertical or rest on a firm\n      foundation. It must, however, merge with and be\n      solidly supported by existing stone. Thus, you can\n      use this spell to bridge a chasm or create a ramp.\n         If you create a span greater than 20 feet in length,\n      you must halve the size of each panel to create supports. You can crudely shape the wall to create battlements and the like.\n         The wall is an object made of stone that can be\n      damaged and thus breached. Each panel has AC 15\n      and 30 Hit Points per inch of thickness, and it has\n      Immunity to Poison and Psychic damage. Reducing\n      a panel to 0 Hit Points destroys it and might cause\n      connected panels to collapse at the GM’s discretion.\n\n         If you maintain your Concentration on this spell\n      for its full duration, the wall becomes permanent\n      and can’t be dispelled. Otherwise, the wall disappears when the spell ends.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a cube of granite",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Wall of Thorns",
      "identity_key": "wall-of-thorns",
      "content_key": "2024:wall-of-thorns",
      "level": 6,
      "school": "Conjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "V, S, M (a handful of thorns)",
      "duration": "Concentration, up to 10 minutes",
      "description": "You create a wall of tangled brush bristling with\n\n      needle-sharp thorns. The wall appears within range\n      on a solid surface and lasts for the duration. You\n      choose to make the wall up to 60 feet long, 10 feet\n\n\nhigh, and 5 feet thick or a circle that has a 20-foot\ndiameter and is up to 20 feet high and 5 feet thick.\nThe wall blocks line of sight.\n  When the wall appears, each creature in its area\nmakes a Dexterity saving throw, taking 7d8 Piercing damage on a failed save or half as much damage\non a successful one.\n  A creature can move through the wall, albeit\nslowly and painfully. For every 1 foot a creature\nmoves through the wall, it must spend 4 feet of\nmovement. Furthermore, the first time a creature\nenters a space in the wall on a turn or ends its turn\nthere, the creature makes a Dexterity saving throw,\ntaking 7d8 Slashing damage on a failed save or half\nas much damage on a successful one. A creature\nmakes this save only once per turn.\n  Using a Higher-Level Spell Slot. Both types of\ndamage increase by 1d8 for each spell slot level\nabove 6.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a handful of thorns",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Warding Bond",
      "identity_key": "warding-bond",
      "content_key": "2024:warding-bond",
      "level": 2,
      "school": "Abjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Touch",
      "components": "V, S, M (a pair of platinum rings worth 50+ GP each, which you and the target must wear for the duration)",
      "duration": "1 hour",
      "description": "You touch another creature that is willing and\ncreate a mystic connection between you and the\ntarget until the spell ends. While the target is\nwithin 60 feet of you, it gains a +1 bonus to AC and\nsaving throws, and it has Resistance to all damage.\nAlso, each time it takes damage, you take the same\namount of damage.\n  The spell ends if you drop to 0 Hit Points or if you\nand the target become separated by more than 60\nfeet. It also ends if the spell is cast again on either of\nthe connected creatures.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "touch",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a pair of platinum rings worth 50+ GP each, which you and the target must wear for the duration",
        "cost": {
          "copper": 5000,
          "kind": "minimum"
        }
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Water Breathing",
      "identity_key": "water-breathing",
      "content_key": "2024:water-breathing",
      "level": 3,
      "school": "Transmutation",
      "ritual": true,
      "concentration": false,
      "casting_time": "Action or Ritual",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S, M (a short reed)",
      "duration": "24 hours",
      "description": "This spell grants up to ten willing creatures of your\nchoice within range the ability to breathe underwater until the spell ends. Affected creatures also\n\nretain their normal mode of respiration.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": true
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a short reed",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 24,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Water Walk",
      "identity_key": "water-walk",
      "content_key": "2024:water-walk",
      "level": 3,
      "school": "Transmutation",
      "ritual": true,
      "concentration": false,
      "casting_time": "Action or Ritual",
      "action_type": "Action",
      "range": "30 feet",
      "components": "V, S, M (a piece of cork)",
      "duration": "1 hour",
      "description": "This spell grants the ability to move across any liquid\n\n      surface—such as water, acid, mud, snow, quicksand,\n      or lava—as if it were harmless solid ground (creatures crossing molten lava can still take damage\n      from the heat). Up to ten willing creatures of your\n\n      choice within range gain this ability for the duration.\n\n        An affected target must take a Bonus Action to\n      pass from the liquid’s surface into the liquid itself\n      and vice versa, but if the target falls into the liquid,\n      the target passes through the surface into the liquid\n      below.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": true
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a piece of cork",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Web",
      "identity_key": "web",
      "content_key": "2024:web",
      "level": 2,
      "school": "Conjuration",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S, M (a bit of spiderweb)",
      "duration": "Concentration, up to 1 hour",
      "description": "You conjure a mass of sticky webbing at a point\n\n      within range. The webs fill a 20-foot Cube there for\n\n      the duration. The webs are Difficult Terrain, and the\n\n      area within them is Lightly Obscured.\n\n        If the webs aren’t anchored between two solid\n\n      masses (such as walls or trees) or layered across\n\n      a floor, wall, or ceiling, the web collapses on itself,\n\n      and the spell ends at the start of your next turn.\n      Webs layered over a flat surface have a depth of 5\n      feet.\n        The first time a creature enters the webs on a\n\n      turn or starts its turn there, it must succeed on a\n\n      Dexterity saving throw or have the Restrained condition while in the webs or until it breaks free.\n        A creature Restrained by the webs can take an\n      action to make a Strength (Athletics) check against\n      your spell save DC. If it succeeds, it is no longer\n      Restrained.\n        The webs are flammable. Any 5-foot Cube of webs\n      exposed to fire burns away in 1 round, dealing 2d4\n      Fire damage to any creature that starts its turn in\n      the fire.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a bit of spiderweb",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "hour",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Weird",
      "identity_key": "weird",
      "content_key": "2024:weird",
      "level": 9,
      "school": "Illusion",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "V, S",
      "duration": "Concentration, up to 1 minute",
      "description": "You try to create illusory terrors in others’ minds.\n\n      Each creature of your choice in a 30-foot-radius\n\n      Sphere centered on a point within range makes a\n\n      Wisdom saving throw. On a failed save, a target\n\n      takes 10d10 Psychic damage and has the Frightened\n\n      condition for the duration. On a successful save, a\n      target takes half as much damage only.\n\n\n  A Frightened target makes a Wisdom saving\nthrow at the end of each of its turns. On a failed\nsave, it takes 5d10 Psychic damage. On a successful\n\nsave, the spell ends on that target.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Wind Walk",
      "identity_key": "wind-walk",
      "content_key": "2024:wind-walk",
      "level": 6,
      "school": "Transmutation",
      "ritual": false,
      "concentration": false,
      "casting_time": "1 minute",
      "action_type": null,
      "range": "30 feet",
      "components": "V, S, M (a candle)",
      "duration": "8 hours",
      "description": "You and up to ten willing creatures of your choice\nwithin range assume gaseous forms for the duration, appearing as wisps of cloud. While in this\ncloud form, a target has a Fly Speed of 300 feet and\ncan hover; it has Immunity to the Prone condition;\nand it has Resistance to Bludgeoning, Piercing, and\nSlashing damage. The only actions a target can take\nin this form are the Dash action or a Magic action to\nbegin reverting to its normal form. Reverting takes\n1 minute, during which the target has the Stunned\n\ncondition. Until the spell ends, the target can revert\n\nto cloud form, which also requires a Magic action\n\nfollowed by a 1-minute transformation.\n\n  If a target is in cloud form and flying when the effect ends, the target descends 60 feet per round for\n\n1 minute until it lands, which it does safely. If it can’t\n\nland after 1 minute, it falls the remaining distance.",
      "casting_time_value": {
        "options": [
          {
            "unit": "minute",
            "amount": 1,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 30,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a candle",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 8,
        "unit": "hour",
        "concentration": false,
        "up_to": false
      }
    },
    {
      "name": "Wind Wall",
      "identity_key": "wind-wall",
      "content_key": "2024:wind-wall",
      "level": 3,
      "school": "Evocation",
      "ritual": false,
      "concentration": true,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "120 feet",
      "components": "V, S, M (a fan and a feather)",
      "duration": "Concentration, up to 1 minute",
      "description": "A wall of strong wind rises from the ground at a\npoint you choose within range. You can make the\nwall up to 50 feet long, 15 feet high, and 1 foot\nthick. You can shape the wall in any way you choose\nso long as it makes one continuous path along the\nground. The wall lasts for the duration.\n  When the wall appears, each creature in its area\nmakes a Strength saving throw, taking 4d8 Bludgeoning damage on a failed save or half as much\ndamage on a successful one.\n  The strong wind keeps fog, smoke, and other\ngases at bay. Small or smaller flying creatures or\nobjects can’t pass through the wall. Loose, lightweight materials brought into the wall fly upward.\nArrows, bolts, and other ordinary projectiles\n\nlaunched at targets behind the wall are deflected\n\nupward and miss automatically. Boulders hurled by\n\nGiants or siege engines, and similar projectiles, are\n\nunaffected. Creatures in gaseous form can’t pass\n\nthrough it.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 120,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": "a fan and a feather",
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 1,
        "unit": "minute",
        "concentration": true,
        "up_to": true
      }
    },
    {
      "name": "Wish",
      "identity_key": "wish",
      "content_key": "2024:wish",
      "level": 9,
      "school": "Conjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "Self",
      "components": "V",
      "duration": "Instantaneous",
      "description": "Wish is the mightiest spell a mortal can cast. By\n      simply speaking aloud, you can alter reality itself.\n        The basic use of this spell is to duplicate any other\n      spell of level 8 or lower. If you use it this way, you\n      don’t need to meet any requirements to cast that\n      spell, including costly components. The spell simply\n      takes effect.\n        Alternatively, you can create one of the following\n      effects of your choice:\n\n      Object Creation. You create one object of up to\n        25,000 GP in value that isn’t a magic item. The\n        object can be no more than 300 feet in any dimension, and it appears in an unoccupied space that\n        you can see on the ground.\n      Instant Health. You allow yourself and up to\n        twenty creatures that you can see to regain all Hit\n        Points, and you end all effects on them listed in\n        the Greater Restoration spell.\n      Resistance. You grant up to ten creatures that you\n        can see Resistance to one damage type that you\n        choose. This Resistance is permanent.\n      Spell Immunity. You grant up to ten creatures you\n        can see immunity to a single spell or other magical effect for 8 hours.\n\n      Sudden Learning. You replace one of your feats with\n\n        another feat for which you are eligible. You lose all\n\n        the benefits of the old feat and gain the benefits of\n\n        the new one. You can’t replace a feat that is a prerequisite for any of your other feats or features.\n\n      Roll Redo. You undo a single recent event by forcing\n\n        a reroll of any die roll made within the last round\n\n        (including your last turn). Reality reshapes itself to\n        accommodate the new result. For example, a Wish\n        spell could undo an ally’s failed saving throw or a\n        foe’s Critical Hit. You can force the reroll to be made\n\n        with Advantage or Disadvantage, and you choose\n        whether to use the reroll or the original roll.\n      Reshape Reality. You may wish for something not\n        included in any of the other effects. To do so, state\n        your wish to the GM as precisely as possible. The\n        GM has great latitude in ruling what occurs in\n        such an instance; the greater the wish, the greater\n        the likelihood that something goes wrong. This\n        spell might simply fail, the effect you desire might\n        be achieved only in part, or you might suffer an\n        unforeseen consequence as a result of how you\n        worded the wish. For example, wishing that a\n        villain were dead might propel you forward in\n        time to a period when that villain is no longer\n        alive, effectively removing you from the game.\n\n\n Similarly, wishing for a Legendary magic item or\n an Artifact might instantly transport you to the\n presence of the item’s current owner. If your wish\n\n\n is granted and its effects have consequences for a\n whole community, region, or world, you are likely\n to attract powerful foes. If your wish would affect\n a god, the god’s divine servants might instantly intervene to prevent it or to encourage you to craft\n the wish in a particular way. If your wish would\n undo the multiverse itself, your wish fails.\n\nThe stress of casting Wish to produce any effect\nother than duplicating another spell weakens you.\nAfter enduring that stress, each time you cast a\nspell until you finish a Long Rest, you take 1d10\nNecrotic damage per level of that spell. This damage\ncan’t be reduced or prevented in any way. In addition, your Strength score becomes 3 for 2d4 days.\nFor each of those days that you spend resting and\ndoing nothing more than light activity, your remaining recovery time decreases by 2 days. Finally, there\nis a 33 percent chance that you are unable to cast\nWish ever again if you suffer this stress.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "self",
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Word of Recall",
      "identity_key": "word-of-recall",
      "content_key": "2024:word-of-recall",
      "level": 6,
      "school": "Conjuration",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "5 feet",
      "components": "V",
      "duration": "Instantaneous",
      "description": "You and up to five willing creatures within 5 feet\n\nof you instantly teleport to a previously designated\n\nsanctuary. You and any creatures that teleport with\n\nyou appear in the nearest unoccupied space to the\n\nspot you designated when you prepared your sanctuary (see below). If you cast this spell without first\n\npreparing a sanctuary, the spell has no effect.\n\n  You must designate a location, such as a temple, as\n\na sanctuary by casting this spell there.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 5,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": false,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "instantaneous"
      }
    },
    {
      "name": "Zone of Truth",
      "identity_key": "zone-of-truth",
      "content_key": "2024:zone-of-truth",
      "level": 2,
      "school": "Enchantment",
      "ritual": false,
      "concentration": false,
      "casting_time": "Action",
      "action_type": "Action",
      "range": "60 feet",
      "components": "V, S",
      "duration": "10 minutes",
      "description": "You create a magical zone that guards against deception in a 15-foot-radius Sphere centered on a\npoint within range. Until the spell ends, a creature\nthat enters the spell’s area for the first time on a\nturn or starts its turn there makes a Charisma saving throw. On a failed save, a creature can’t speak a\ndeliberate lie while in the radius. You know whether\na creature succeeds or fails on this save.\n  An affected creature is aware of the spell and\ncan avoid answering questions to which it would\nnormally respond with a lie. Such a creature can be\nevasive yet must be truthful.",
      "casting_time_value": {
        "options": [
          {
            "unit": "action",
            "trigger": null,
            "mode": null
          }
        ],
        "ritual": false
      },
      "range_value": {
        "kind": "ranged",
        "feet": 60,
        "area": null
      },
      "components_value": {
        "verbal": true,
        "somatic": true,
        "material": null,
        "cost": null
      },
      "duration_value": {
        "kind": "timed",
        "amount": 10,
        "unit": "minute",
        "concentration": false,
        "up_to": false
      }
    }
  ],
  "memberships": [
    {
      "spell_name": "Dancing Lights",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Light",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Mage Hand",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Mending",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Message",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Minor Illusion",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Prestidigitation",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Starry Wisp",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "True Strike",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Vicious Mockery",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Animal Friendship",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Bane",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Charm Person",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Color Spray",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Command",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Comprehend Languages",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Cure Wounds",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Detect Magic",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Disguise Self",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Dissonant Whispers",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Faerie Fire",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Feather Fall",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Healing Word",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Heroism",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Hideous Laughter",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Identify",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Illusory Script",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Longstrider",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Silent Image",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Sleep",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Speak with Animals",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Thunderwave",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Unseen Servant",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Aid",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Animal Messenger",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Blindness/Deafness",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Calm Emotions",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Detect Thoughts",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Enhance Ability",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Enlarge/Reduce",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Enthrall",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Heat Metal",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Hold Person",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Invisibility",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Knock",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Lesser Restoration",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Locate Animals or Plants",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Locate Object",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Magic Mouth",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Mirror Image",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "See Invisibility",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Shatter",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Silence",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Suggestion",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Zone of Truth",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Bestow Curse",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Clairvoyance",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Dispel Magic",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Fear",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Glyph of Warding",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Hypnotic Pattern",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Major Image",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Mass Healing Word",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Nondetection",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Plant Growth",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Sending",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Slow",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Speak with Dead",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Speak with Plants",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Stinking Cloud",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Tiny Hut",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Tongues",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Charm Monster",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Compulsion",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Confusion",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Dimension Door",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Freedom of Movement",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Greater Invisibility",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Hallucinatory Terrain",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Locate Creature",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Phantasmal Killer",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Polymorph",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Animate Objects",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Awaken",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Dominate Person",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Dream",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Geas",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Greater Restoration",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Hold Monster",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Legend Lore",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Mass Cure Wounds",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Mislead",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Modify Memory",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Planar Binding",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Raise Dead",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Scrying",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Seeming",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Telepathic Bond",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Teleportation Circle",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Eyebite",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Find the Path",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Guards and Wards",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Heroes’ Feast",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Irresistible Dance",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Mass Suggestion",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Programmed Illusion",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "True Seeing",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Arcane Sword",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Etherealness",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Forcecage",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Magnificent Mansion",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Mirage Arcane",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Prismatic Spray",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Project Image",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Regenerate",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Resurrection",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Symbol",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Teleport",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Antipathy/Sympathy",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Befuddlement",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Dominate Monster",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Glibness",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Mind Blank",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Power Word Stun",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Foresight",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Power Word Heal",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Power Word Kill",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Prismatic Wall",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "True Polymorph",
      "spell_list_key": "Bard"
    },
    {
      "spell_name": "Guidance",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Light",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Mending",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Resistance",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Sacred Flame",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Spare the Dying",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Thaumaturgy",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Bane",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Bless",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Command",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Create or Destroy Water",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Cure Wounds",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Detect Evil and Good",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Detect Magic",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Detect Poison and Disease",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Guiding Bolt",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Healing Word",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Inflict Wounds",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Protection from Evil and Good",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Purify Food and Drink",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Sanctuary",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Shield of Faith",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Aid",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Augury",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Blindness/Deafness",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Calm Emotions",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Continual Flame",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Enhance Ability",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Find Traps",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Gentle Repose",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Hold Person",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Lesser Restoration",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Locate Object",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Prayer of Healing",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Protection from Poison",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Silence",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Spiritual Weapon",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Warding Bond",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Zone of Truth",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Animate Dead",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Beacon of Hope",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Bestow Curse",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Clairvoyance",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Create Food and Water",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Daylight",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Dispel Magic",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Glyph of Warding",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Magic Circle",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Mass Healing Word",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Meld into Stone",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Protection from Energy",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Remove Curse",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Revivify",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Sending",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Speak with Dead",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Spirit Guardians",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Tongues",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Water Walk",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Aura of Life",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Banishment",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Control Water",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Death Ward",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Divination",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Freedom of Movement",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Guardian of Faith",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Locate Creature",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Stone Shape",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Commune",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Contagion",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Dispel Evil and Good",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Flame Strike",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Geas",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Greater Restoration",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Hallow",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Insect Plague",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Legend Lore",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Mass Cure Wounds",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Planar Binding",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Raise Dead",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Scrying",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Blade Barrier",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Create Undead",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Find the Path",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Forbiddance",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Harm",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Heal",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Heroes’ Feast",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Planar Ally",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Sunbeam",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "True Seeing",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Word of Recall",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Conjure Celestial",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Divine Word",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Etherealness",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Fire Storm",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Plane Shift",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Regenerate",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Resurrection",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Symbol",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Antimagic Field",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Control Weather",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Earthquake",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Holy Aura",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Sunburst",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Astral Projection",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Gate",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Mass Heal",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Power Word Heal",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "True Resurrection",
      "spell_list_key": "Cleric"
    },
    {
      "spell_name": "Druidcraft",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Elementalism",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Guidance",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Mending",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Message",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Poison Spray",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Produce Flame",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Resistance",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Shillelagh",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Spare the Dying",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Starry Wisp",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Animal Friendship",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Charm Person",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Create or Destroy Water",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Cure Wounds",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Detect Magic",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Detect Poison and Disease",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Entangle",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Faerie Fire",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Fog Cloud",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Goodberry",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Healing Word",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Ice Knife",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Jump",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Longstrider",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Protection from Evil and Good",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Purify Food and Drink",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Speak with Animals",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Thunderwave",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Aid",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Animal Messenger",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Augury",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Barkskin",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Continual Flame",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Darkvision",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Enhance Ability",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Enlarge/Reduce",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Find Traps",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Flame Blade",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Flaming Sphere",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Gust of Wind",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Heat Metal",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Hold Person",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Lesser Restoration",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Locate Animals or Plants",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Locate Object",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Moonbeam",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Pass without Trace",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Protection from Poison",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Spike Growth",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Call Lightning",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Conjure Animals",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Daylight",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Dispel Magic",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Meld into Stone",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Plant Growth",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Protection from Energy",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Revivify",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Sleet Storm",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Speak with Plants",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Water Breathing",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Water Walk",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Wind Wall",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Blight",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Charm Monster",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Confusion",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Conjure Minor Elementals",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Conjure Woodland Beings",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Control Water",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Divination",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Dominate Beast",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Fire Shield",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Freedom of Movement",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Giant Insect",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Hallucinatory Terrain",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Ice Storm",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Locate Creature",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Polymorph",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Stone Shape",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Stoneskin",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Wall of Fire",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Antilife Shell",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Awaken",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Commune with Nature",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Cone of Cold",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Conjure Elemental",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Contagion",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Geas",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Greater Restoration",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Insect Plague",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Mass Cure Wounds",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Planar Binding",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Reincarnate",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Scrying",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Tree Stride",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Wall of Stone",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Conjure Fey",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Find the Path",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Flesh to Stone",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Heal",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Heroes’ Feast",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Move Earth",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Sunbeam",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Transport via Plants",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Wall of Thorns",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Wind Walk",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Fire Storm",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Mirage Arcane",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Plane Shift",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Regenerate",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Reverse Gravity",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Symbol",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Animal Shapes",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Antipathy/Sympathy",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Befuddlement",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Control Weather",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Earthquake",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Incendiary Cloud",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Sunburst",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Tsunami",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Foresight",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Shapechange",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Storm of Vengeance",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "True Resurrection",
      "spell_list_key": "Druid"
    },
    {
      "spell_name": "Bless",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Command",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Cure Wounds",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Detect Evil and Good",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Detect Magic",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Detect Poison and Disease",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Divine Favor",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Divine Smite",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Heroism",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Protection from Evil and Good",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Purify Food and Drink",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Searing Smite",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Shield of Faith",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Aid",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Find Steed",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Gentle Repose",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Lesser Restoration",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Locate Object",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Magic Weapon",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Prayer of Healing",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Protection from Poison",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Shining Smite",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Warding Bond",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Zone of Truth",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Create Food and Water",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Daylight",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Dispel Magic",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Magic Circle",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Remove Curse",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Revivify",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Aura of Life",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Banishment",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Death Ward",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Locate Creature",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Dispel Evil and Good",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Geas",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Greater Restoration",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Raise Dead",
      "spell_list_key": "Paladin"
    },
    {
      "spell_name": "Alarm",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Animal Friendship",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Cure Wounds",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Detect Magic",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Detect Poison and Disease",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Ensnaring Strike",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Entangle",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Fog Cloud",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Goodberry",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Hunter’s Mark",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Jump",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Longstrider",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Speak with Animals",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Aid",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Animal Messenger",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Barkskin",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Darkvision",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Enhance Ability",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Find Traps",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Gust of Wind",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Lesser Restoration",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Locate Animals or Plants",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Locate Object",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Magic Weapon",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Pass without Trace",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Protection from Poison",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Silence",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Spike Growth",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Conjure Animals",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Daylight",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Dispel Magic",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Meld into Stone",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Nondetection",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Plant Growth",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Protection from Energy",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Revivify",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Speak with Plants",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Water Breathing",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Water Walk",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Wind Wall",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Conjure Woodland Beings",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Dominate Beast",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Freedom of Movement",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Locate Creature",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Stoneskin",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Commune with Nature",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Greater Restoration",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Tree Stride",
      "spell_list_key": "Ranger"
    },
    {
      "spell_name": "Acid Splash",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Chill Touch",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Dancing Lights",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Elementalism",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Fire Bolt",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Light",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Mage Hand",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Mending",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Message",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Minor Illusion",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Poison Spray",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Prestidigitation",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Ray of Frost",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Shocking Grasp",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Sorcerous Burst",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "True Strike",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Burning Hands",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Charm Person",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Chromatic Orb",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Color Spray",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Comprehend Languages",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Detect Magic",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Disguise Self",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Expeditious Retreat",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "False Life",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Feather Fall",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Fog Cloud",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Grease",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Ice Knife",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Jump",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Mage Armor",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Magic Missile",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Ray of Sickness",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Shield",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Silent Image",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Sleep",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Thunderwave",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Alter Self",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Blindness/Deafness",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Blur",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Darkness",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Darkvision",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Detect Thoughts",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Dragon’s Breath",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Enhance Ability",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Enlarge/Reduce",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Flame Blade",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Flaming Sphere",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Gust of Wind",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Hold Person",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Invisibility",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Knock",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Levitate",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Magic Weapon",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Mirror Image",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Misty Step",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Scorching Ray",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "See Invisibility",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Shatter",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Spider Climb",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Suggestion",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Web",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Blink",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Clairvoyance",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Counterspell",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Daylight",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Dispel Magic",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Fear",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Fireball",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Fly",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Gaseous Form",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Haste",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Hypnotic Pattern",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Lightning Bolt",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Major Image",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Protection from Energy",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Sleet Storm",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Slow",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Stinking Cloud",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Tongues",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Vampiric Touch",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Water Breathing",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Water Walk",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Banishment",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Blight",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Charm Monster",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Confusion",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Dimension Door",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Dominate Beast",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Fire Shield",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Greater Invisibility",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Ice Storm",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Polymorph",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Stoneskin",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Vitriolic Sphere",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Wall of Fire",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Animate Objects",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Arcane Hand",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Cloudkill",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Cone of Cold",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Creation",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Dominate Person",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Hold Monster",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Insect Plague",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Seeming",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Telekinesis",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Teleportation Circle",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Wall of Stone",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Chain Lightning",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Circle of Death",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Disintegrate",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Eyebite",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Flesh to Stone",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Freezing Sphere",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Globe of Invulnerability",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Mass Suggestion",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Move Earth",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Sunbeam",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "True Seeing",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Delayed Blast Fireball",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Etherealness",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Finger of Death",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Fire Storm",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Plane Shift",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Prismatic Spray",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Reverse Gravity",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Teleport",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Demiplane",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Dominate Monster",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Earthquake",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Incendiary Cloud",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Power Word Stun",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Sunburst",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Gate",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Meteor Swarm",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Power Word Kill",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Time Stop",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Wish",
      "spell_list_key": "Sorcerer"
    },
    {
      "spell_name": "Chill Touch",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Eldritch Blast",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Mage Hand",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Minor Illusion",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Poison Spray",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Prestidigitation",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "True Strike",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Bane",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Charm Person",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Comprehend Languages",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Detect Magic",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Expeditious Retreat",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Hellish Rebuke",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Hex",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Hideous Laughter",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Illusory Script",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Protection from Evil and Good",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Speak with Animals",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Unseen Servant",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Darkness",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Enthrall",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Hold Person",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Invisibility",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Mind Spike",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Mirror Image",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Misty Step",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Ray of Enfeeblement",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Spider Climb",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Suggestion",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Counterspell",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Dispel Magic",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Fear",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Fly",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Gaseous Form",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Hypnotic Pattern",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Magic Circle",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Major Image",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Remove Curse",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Tongues",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Vampiric Touch",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Banishment",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Blight",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Charm Monster",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Dimension Door",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Hallucinatory Terrain",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Contact Other Plane",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Dream",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Hold Monster",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Mislead",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Planar Binding",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Scrying",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Teleportation Circle",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Circle of Death",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Create Undead",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Eyebite",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "True Seeing",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Etherealness",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Finger of Death",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Forcecage",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Plane Shift",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Befuddlement",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Demiplane",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Dominate Monster",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Glibness",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Power Word Stun",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Astral Projection",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Foresight",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Gate",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Imprisonment",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Power Word Kill",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "True Polymorph",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Weird",
      "spell_list_key": "Warlock"
    },
    {
      "spell_name": "Acid Splash",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Chill Touch",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Dancing Lights",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Elementalism",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Fire Bolt",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Light",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Mage Hand",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Mending",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Message",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Minor Illusion",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Poison Spray",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Prestidigitation",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Ray of Frost",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Shocking Grasp",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "True Strike",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Alarm",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Burning Hands",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Charm Person",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Chromatic Orb",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Color Spray",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Comprehend Languages",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Detect Magic",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Disguise Self",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Expeditious Retreat",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "False Life",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Feather Fall",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Find Familiar",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Floating Disk",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Fog Cloud",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Grease",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Hideous Laughter",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Ice Knife",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Identify",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Illusory Script",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Jump",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Longstrider",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Mage Armor",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Magic Missile",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Protection from Evil and Good",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Ray of Sickness",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Shield",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Silent Image",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Sleep",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Thunderwave",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Unseen Servant",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Acid Arrow",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Alter Self",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Arcane Lock",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Arcanist’s Magic Aura",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Augury",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Blindness/Deafness",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Blur",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Continual Flame",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Darkness",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Darkvision",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Detect Thoughts",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Dragon’s Breath",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Enhance Ability",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Enlarge/Reduce",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Flaming Sphere",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Gentle Repose",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Gust of Wind",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Hold Person",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Invisibility",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Knock",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Levitate",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Locate Object",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Magic Mouth",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Magic Weapon",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Mind Spike",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Mirror Image",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Misty Step",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Ray of Enfeeblement",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Rope Trick",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Scorching Ray",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "See Invisibility",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Shatter",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Spider Climb",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Suggestion",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Web",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Animate Dead",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Bestow Curse",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Blink",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Clairvoyance",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Counterspell",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Dispel Magic",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Fear",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Fireball",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Fly",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Gaseous Form",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Glyph of Warding",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Haste",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Hypnotic Pattern",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Lightning Bolt",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Magic Circle",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Major Image",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Nondetection",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Phantom Steed",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Protection from Energy",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Remove Curse",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Sending",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Sleet Storm",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Slow",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Speak with Dead",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Stinking Cloud",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Tiny Hut",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Tongues",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Vampiric Touch",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Water Breathing",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Arcane Eye",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Banishment",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Black Tentacles",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Blight",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Charm Monster",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Confusion",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Conjure Minor Elementals",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Control Water",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Dimension Door",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Divination",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Fabricate",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Faithful Hound",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Fire Shield",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Greater Invisibility",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Hallucinatory Terrain",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Ice Storm",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Locate Creature",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Phantasmal Killer",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Polymorph",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Private Sanctum",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Resilient Sphere",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Secret Chest",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Stone Shape",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Stoneskin",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Vitriolic Sphere",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Wall of Fire",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Animate Objects",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Arcane Hand",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Cloudkill",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Cone of Cold",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Conjure Elemental",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Contact Other Plane",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Creation",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Dominate Person",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Dream",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Geas",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Hold Monster",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Legend Lore",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Mislead",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Modify Memory",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Passwall",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Planar Binding",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Scrying",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Seeming",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Summon Dragon",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Telekinesis",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Telepathic Bond",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Teleportation Circle",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Wall of Force",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Wall of Stone",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Chain Lightning",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Circle of Death",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Contingency",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Create Undead",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Disintegrate",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Eyebite",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Flesh to Stone",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Freezing Sphere",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Globe of Invulnerability",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Guards and Wards",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Instant Summons",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Irresistible Dance",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Magic Jar",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Mass Suggestion",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Move Earth",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Programmed Illusion",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Sunbeam",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "True Seeing",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Wall of Ice",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Arcane Sword",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Delayed Blast Fireball",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Etherealness",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Finger of Death",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Forcecage",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Magnificent Mansion",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Mirage Arcane",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Plane Shift",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Prismatic Spray",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Project Image",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Reverse Gravity",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Sequester",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Simulacrum",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Symbol",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Teleport",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Antimagic Field",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Antipathy/Sympathy",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Befuddlement",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Clone",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Control Weather",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Demiplane",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Dominate Monster",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Incendiary Cloud",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Maze",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Mind Blank",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Power Word Stun",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Sunburst",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Astral Projection",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Foresight",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Gate",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Imprisonment",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Meteor Swarm",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Power Word Kill",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Prismatic Wall",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Shapechange",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Time Stop",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "True Polymorph",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Weird",
      "spell_list_key": "Wizard"
    },
    {
      "spell_name": "Wish",
      "spell_list_key": "Wizard"
    }
  ]
} as const satisfies SrdSpellCatalogArtifact<BundledSrdSpellContentKeyText>;
deepFreeze(BUNDLED_SRD_SPELL_CATALOG);
