import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const VERBATIM_ATTRIBUTION = `This work includes material from the System Reference Document 5.2
("SRD 5.2") by Wizards of the Coast LLC, available at
https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
Commons Attribution 4.0 International License, available at
https://creativecommons.org/licenses/by/4.0/legalcode.`;

const SPELL_LIST_FILES = {
  'bard-spell-list.txt': 129,
  'cleric-spell-list.txt': 109,
  'druid-spell-list.txt': 124,
  'paladin-spell-list.txt': 38,
  'ranger-spell-list.txt': 48,
  'sorcerer-spell-list.txt': 138,
  'warlock-spell-list.txt': 72,
  'wizard-spell-list.txt': 217,
} as const;

const SCHOOL =
  'Abjuration|Conjuration|Divination|Enchantment|Evocation|Illusion|Necromancy|Transmutation';
const DESCRIPTION_METADATA = new RegExp(
  `^\\s*(?:Level [1-9] (?:${SCHOOL})|(?:${SCHOOL}) Cantrip) \\(`,
);
const SPELL_LIST_ROW = new RegExp(
  `^\\s*(?<name>.+?)\\s{2,}(?:${SCHOOL})\\s{2,}(?:[CRM](?:, [CRM])*|[—–])\\s*$`,
);

/**
 * Hand-enumerated from the 339 spell headings on printed pages 107-175.
 *
 * This literal is the oracle; it is not generated from the extract at test
 * time. The eight independently printed class lists below cross-check 338 of
 * the names. Phantasmal Force is the one source-document discrepancy: its
 * description names Bard, Sorcerer, and Wizard, but none of those lists include
 * it.
 */
const EXPECTED_SPELL_NAMES = `Acid Arrow
Acid Splash
Aid
Alarm
Alter Self
Animal Friendship
Animal Messenger
Animal Shapes
Animate Dead
Animate Objects
Antilife Shell
Antimagic Field
Antipathy/Sympathy
Arcane Eye
Arcane Hand
Arcane Lock
Arcane Sword
Arcanist’s Magic Aura
Astral Projection
Augury
Aura of Life
Awaken
Bane
Banishment
Barkskin
Beacon of Hope
Befuddlement
Bestow Curse
Black Tentacles
Blade Barrier
Bless
Blight
Blindness/Deafness
Blink
Blur
Burning Hands
Call Lightning
Calm Emotions
Chain Lightning
Charm Monster
Charm Person
Chill Touch
Chromatic Orb
Circle of Death
Clairvoyance
Clone
Cloudkill
Color Spray
Command
Commune
Commune with Nature
Comprehend Languages
Compulsion
Cone of Cold
Confusion
Conjure Animals
Conjure Celestial
Conjure Elemental
Conjure Fey
Conjure Minor Elementals
Conjure Woodland Beings
Contact Other Plane
Contagion
Contingency
Continual Flame
Control Water
Control Weather
Counterspell
Create Food and Water
Create Undead
Create or Destroy Water
Creation
Cure Wounds
Dancing Lights
Darkness
Darkvision
Daylight
Death Ward
Delayed Blast Fireball
Demiplane
Detect Evil and Good
Detect Magic
Detect Poison and Disease
Detect Thoughts
Dimension Door
Disguise Self
Disintegrate
Dispel Evil and Good
Dispel Magic
Dissonant Whispers
Divination
Divine Favor
Divine Smite
Divine Word
Dominate Beast
Dominate Monster
Dominate Person
Dragon’s Breath
Dream
Druidcraft
Earthquake
Eldritch Blast
Elementalism
Enhance Ability
Enlarge/Reduce
Ensnaring Strike
Entangle
Enthrall
Etherealness
Expeditious Retreat
Eyebite
Fabricate
Faerie Fire
Faithful Hound
False Life
Fear
Feather Fall
Find Familiar
Find Steed
Find Traps
Find the Path
Finger of Death
Fire Bolt
Fire Shield
Fire Storm
Fireball
Flame Blade
Flame Strike
Flaming Sphere
Flesh to Stone
Floating Disk
Fly
Fog Cloud
Forbiddance
Forcecage
Foresight
Freedom of Movement
Freezing Sphere
Gaseous Form
Gate
Geas
Gentle Repose
Giant Insect
Glibness
Globe of Invulnerability
Glyph of Warding
Goodberry
Grease
Greater Invisibility
Greater Restoration
Guardian of Faith
Guards and Wards
Guidance
Guiding Bolt
Gust of Wind
Hallow
Hallucinatory Terrain
Harm
Haste
Heal
Healing Word
Heat Metal
Hellish Rebuke
Heroes’ Feast
Heroism
Hex
Hideous Laughter
Hold Monster
Hold Person
Holy Aura
Hunter’s Mark
Hypnotic Pattern
Ice Knife
Ice Storm
Identify
Illusory Script
Imprisonment
Incendiary Cloud
Inflict Wounds
Insect Plague
Instant Summons
Invisibility
Irresistible Dance
Jump
Knock
Legend Lore
Lesser Restoration
Levitate
Light
Lightning Bolt
Locate Animals or Plants
Locate Creature
Locate Object
Longstrider
Mage Armor
Mage Hand
Magic Circle
Magic Jar
Magic Missile
Magic Mouth
Magic Weapon
Magnificent Mansion
Major Image
Mass Cure Wounds
Mass Heal
Mass Healing Word
Mass Suggestion
Maze
Meld into Stone
Mending
Message
Meteor Swarm
Mind Blank
Mind Spike
Minor Illusion
Mirage Arcane
Mirror Image
Mislead
Misty Step
Modify Memory
Moonbeam
Move Earth
Nondetection
Pass without Trace
Passwall
Phantasmal Force
Phantasmal Killer
Phantom Steed
Planar Ally
Planar Binding
Plane Shift
Plant Growth
Poison Spray
Polymorph
Power Word Heal
Power Word Kill
Power Word Stun
Prayer of Healing
Prestidigitation
Prismatic Spray
Prismatic Wall
Private Sanctum
Produce Flame
Programmed Illusion
Project Image
Protection from Energy
Protection from Evil and Good
Protection from Poison
Purify Food and Drink
Raise Dead
Ray of Enfeeblement
Ray of Frost
Ray of Sickness
Regenerate
Reincarnate
Remove Curse
Resilient Sphere
Resistance
Resurrection
Reverse Gravity
Revivify
Rope Trick
Sacred Flame
Sanctuary
Scorching Ray
Scrying
Searing Smite
Secret Chest
See Invisibility
Seeming
Sending
Sequester
Shapechange
Shatter
Shield
Shield of Faith
Shillelagh
Shining Smite
Shocking Grasp
Silence
Silent Image
Simulacrum
Sleep
Sleet Storm
Slow
Sorcerous Burst
Spare the Dying
Speak with Animals
Speak with Dead
Speak with Plants
Spider Climb
Spike Growth
Spirit Guardians
Spiritual Weapon
Starry Wisp
Stinking Cloud
Stone Shape
Stoneskin
Storm of Vengeance
Suggestion
Summon Dragon
Sunbeam
Sunburst
Symbol
Telekinesis
Telepathic Bond
Teleport
Teleportation Circle
Thaumaturgy
Thunderwave
Time Stop
Tiny Hut
Tongues
Transport via Plants
Tree Stride
True Polymorph
True Resurrection
True Seeing
True Strike
Tsunami
Unseen Servant
Vampiric Touch
Vicious Mockery
Vitriolic Sphere
Wall of Fire
Wall of Force
Wall of Ice
Wall of Stone
Wall of Thorns
Warding Bond
Water Breathing
Water Walk
Web
Weird
Wind Walk
Wind Wall
Wish
Word of Recall
Zone of Truth`.split('\n');

function extract(file: string): string {
  return readFileSync(
    new URL(`../../../docs/srd/source/${file}`, import.meta.url),
    'utf8',
  );
}

function descriptionNames(source: string): string[] {
  const lines = source.split('\n');
  const names: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!DESCRIPTION_METADATA.test(lines[index] ?? '')) continue;
    let heading = index - 1;
    while (heading >= 0 && (lines[heading] ?? '').trim() === '') heading -= 1;
    const name = lines[heading]?.trim();
    if (name === undefined || name === '') {
      throw new Error(`Description metadata at line ${index + 1} has no heading.`);
    }
    names.push(name);
  }
  return names;
}

function classListNames(source: string): string[] {
  return source.split('\n').flatMap((line) => {
    const name = line.match(SPELL_LIST_ROW)?.groups?.name;
    return name === undefined ? [] : [name.trim()];
  });
}

describe('SRD spell extracts', () => {
  it('carries the required attribution verbatim in every extract', () => {
    const files = ['spell-descriptions.txt', ...Object.keys(SPELL_LIST_FILES)];
    for (const file of files) {
      expect(extract(file), file).toMatch(
        new RegExp(`^${VERBATIM_ATTRIBUTION.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\n\n--- Verbatim extract:`),
      );
    }
  });

  it('enumerates all 339 description headings by their actual names', () => {
    const actual = descriptionNames(extract('spell-descriptions.txt'));
    expect(actual).toHaveLength(339);
    expect(new Set(actual).size).toBe(actual.length);
    expect([...actual].sort()).toEqual(EXPECTED_SPELL_NAMES);
  });

  it('resolves every independently printed class-list entry to a description', () => {
    const descriptions = new Set(
      descriptionNames(extract('spell-descriptions.txt')),
    );

    for (const [file, expectedCount] of Object.entries(SPELL_LIST_FILES)) {
      const names = classListNames(extract(file));
      expect(names, file).toHaveLength(expectedCount);
      expect(new Set(names).size, `${file} contains a duplicate`).toBe(
        names.length,
      );
      for (const name of names) {
        expect(descriptions.has(name), `${file}: ${name}`).toBe(true);
      }
    }
  });

  it('records the sole reverse mismatch instead of inventing a class-list row', () => {
    const descriptions = descriptionNames(extract('spell-descriptions.txt'));
    const classListUnion = new Set(
      Object.keys(SPELL_LIST_FILES).flatMap((file) =>
        classListNames(extract(file)),
      ),
    );

    expect(classListUnion.size).toBe(338);
    expect(descriptions.filter((name) => !classListUnion.has(name))).toEqual([
      'Phantasmal Force',
    ]);
    expect(extract('spell-descriptions.txt')).toMatch(
      /Phantasmal Force\s+Level 2 Illusion \(Bard, Sorcerer, Wizard\)/,
    );
  });
});
