import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { reconcileBundledContentRegistryV1 } from '../../../src/catalog/bundled-content-registry-v1';
import { CatalogImporter } from '../../../src/catalog/catalog-importer';
import {
  assertSpellVersionCommandAllowed,
  SRD_SPELL_READ_ONLY_MESSAGE,
} from '../../../src/commands/srd-spell-policy';
import { DatabaseContext } from '../../../src/db/database';
import {
  parseSrdSpellDescriptions,
  parseSrdSpellList,
  parseSrdSpellListMemberships,
  seedSpellContent,
  type SrdSpellList,
} from '../../../src/rules/spells-srd';
import { assertContentImportPlan } from '../../helpers/content-import-plan';
import { openTestDatabase } from '../../helpers/open-db';

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
export const EXPECTED_SPELL_NAMES = `Acid Arrow
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

function catalogRecord(overrides: Record<string, unknown> = {}) {
  return {
    identityKey: 'user-spell',
    versionKey: '2024:user-spell',
    name: 'User Spell',
    edition: '2024',
    level: 1,
    school: 'Evocation',
    castingTime: 'Action',
    range: '60 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    attackModes: [],
    saveAbilities: [],
    effectReliabilityCategory: 'fixed_effect',
    spellLists: ['Wizard'],
    sourceBooks: ['User Catalog'],
    sourcePage: null,
    sourceSlug: 'user-spell',
    ...overrides,
  };
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

  it('parses every description against the independent enumerated oracle', () => {
    const spells = parseSrdSpellDescriptions();

    expect(spells.map((spell) => spell.name).sort()).toEqual(
      EXPECTED_SPELL_NAMES,
    );
    expect(
      spells.every(
        (spell) =>
          spell.content_key.startsWith('2024:') &&
          spell.description.length > 0,
      ),
    ).toBe(true);
  });

  it('parses every list row with per-list extract counts and the one known omission', () => {
    const memberships = parseSrdSpellListMemberships();
    const descriptions = new Set(EXPECTED_SPELL_NAMES);
    for (const [file, expectedCount] of Object.entries(SPELL_LIST_FILES)) {
      const spellListKey = file
        .replace('-spell-list.txt', '')
        .replace(/^./, (character) =>
          character.toUpperCase(),
        ) as SrdSpellList;
      const parsed = parseSrdSpellList(spellListKey);
      expect(parsed, file).toHaveLength(expectedCount);
      expect(parsed.map((entry) => entry.spell_name)).toEqual(
        classListNames(extract(file)),
      );
    }
    expect(
      new Set(memberships.map((entry) => entry.spell_name)),
    ).toEqual(
      new Set(
        EXPECTED_SPELL_NAMES.filter((name) => name !== 'Phantasmal Force'),
      ),
    );
    expect(
      memberships.filter(
        (entry) => entry.spell_name === 'Phantasmal Force',
      ),
    ).toEqual([]);
    expect(
      memberships.every((entry) => descriptions.has(entry.spell_name)),
    ).toBe(true);
  });

  it('fails loudly when either extract shape changes', () => {
    expect(() =>
      parseSrdSpellDescriptions(
        extract('spell-descriptions.txt').replace(
          'Casting Time: Action',
          'Cast Time: Action',
        ),
      ),
    ).toThrow('Acid Arrow expected Casting Time: after metadata.');
    expect(() =>
      parseSrdSpellList(
        'Bard',
        extract('bard-spell-list.txt').replace(
          'Dancing Lights                Illusion            C',
          'Dancing Lights                Unknown             C',
        ),
      ),
    ).toThrow(
      'Bard list has unrecognised line "Dancing Lights                Unknown             C".',
    );
  });

  it('seeds the enumerated catalogue, exact memberships, and no inferred Phantasmal Force rows', async () => {
    const connection = await openTestDatabase();
    const db = new DatabaseContext(connection);
    seedSpellContent(db);

    expect(
      db
        .allRaw(
          `SELECT display_name FROM spell_versions
           WHERE provenance = 'srd' ORDER BY display_name`,
        )
        .map((row) => String(row.display_name)),
    ).toEqual(EXPECTED_SPELL_NAMES);
    expect(
      db.scalar(
        `SELECT count(*) FROM spell_identities AS identity
         INNER JOIN spell_versions AS version
           ON version.spell_identity_id = identity.id
         WHERE version.provenance = 'srd'`,
      ),
    ).toBe(EXPECTED_SPELL_NAMES.length);

    for (const [file, expectedCount] of Object.entries(SPELL_LIST_FILES)) {
      const spellListKey = file
        .replace('-spell-list.txt', '')
        .replace(/^./, (character) =>
          character.toUpperCase(),
        ) as SrdSpellList;
      const stored = db
        .allRaw(
          `SELECT version.display_name
           FROM spell_list_memberships AS membership
           INNER JOIN spell_versions AS version
             ON version.id = membership.spell_version_id
           WHERE membership.spell_list_key = ?
           ORDER BY membership.id`,
          [spellListKey],
        )
        .map((row) => String(row.display_name));
      expect(stored, file).toHaveLength(expectedCount);
      expect(stored, file).toEqual(classListNames(extract(file)));
    }
    expect(
      db.scalar(
        `SELECT count(*)
         FROM spell_list_memberships AS membership
         INNER JOIN spell_versions AS version
           ON version.id = membership.spell_version_id
         WHERE version.display_name = 'Phantasmal Force'`,
      ),
    ).toBe(0);
    connection.close();
  });

  it('makes a second seed byte-for-byte inert', async () => {
    const connection = await openTestDatabase();
    const db = new DatabaseContext(connection);
    seedSpellContent(db);
    const before = {
      identities: db.allRaw('SELECT * FROM spell_identities ORDER BY id'),
      versions: db.allRaw('SELECT * FROM spell_versions ORDER BY id'),
      memberships: db.allRaw(
        'SELECT * FROM spell_list_memberships ORDER BY id',
      ),
    };

    seedSpellContent(db);

    expect({
      identities: db.allRaw('SELECT * FROM spell_identities ORDER BY id'),
      versions: db.allRaw('SELECT * FROM spell_versions ORDER BY id'),
      memberships: db.allRaw(
        'SELECT * FROM spell_list_memberships ORDER BY id',
      ),
    }).toEqual(before);
    connection.close();
  });

  it('keeps direct commands read-only, reviews SRD edits, and imports renamed clones', async () => {
    const connection = await openTestDatabase();
    const db = new DatabaseContext(connection);
    seedSpellContent(db);
    reconcileBundledContentRegistryV1(db);
    const acidArrowId = Number(
      db.scalar(
        "SELECT id FROM spell_versions WHERE content_key = '2024:acid-arrow'",
      ),
    );

    expect(() =>
      assertSpellVersionCommandAllowed(db, acidArrowId, 'edit'),
    ).toThrow(SRD_SPELL_READ_ONLY_MESSAGE);
    expect(() =>
      assertSpellVersionCommandAllowed(db, acidArrowId, 'delete'),
    ).toThrow(SRD_SPELL_READ_ONLY_MESSAGE);

    const importer = new CatalogImporter(db);
    const editResult = importer.import({
      documents: [
        JSON.stringify([
          catalogRecord({
            identityKey: 'fireball',
            versionKey: '2024:fireball',
            name: 'Fireball',
          }),
        ]),
      ],
    });
    assertContentImportPlan(
      editResult,
      'Expected the SRD edit to require content review.',
    );
    expect(editResult.reviews.map(({ id, kind, matchClass }) => ({
      id,
      kind,
      matchClass,
    }))).toEqual([{
      id: 'spell:2024:fireball',
      kind: 'spell',
      matchClass: 'key-collision',
    }]);
    const renamedImport = importer.import({
      documents: [
        JSON.stringify([
          catalogRecord({
            identityKey: 'acid-arrow',
            versionKey: 'expanded:user.homebrew:acidic-arrow',
            name: 'Renamed Acid Arrow',
            edition: 'expanded',
          }),
        ]),
      ],
    });
    expect(renamedImport).toMatchObject({
      created: 1,
      identities_created: 1,
    });
    expect(
      db.oneRaw(
        `SELECT display_name, provenance
         FROM spell_versions WHERE id = ?`,
        [acidArrowId],
      ),
    ).toEqual({ display_name: 'Acid Arrow', provenance: 'srd' });
    expect(
      db.oneRaw(
        `SELECT canonical_name, normalized_name
         FROM spell_identities WHERE content_key = 'acid-arrow'`,
      ),
    ).toEqual({
      canonical_name: 'Acid Arrow',
      normalized_name: 'acid arrow',
    });
    connection.close();
  });

  it('keeps every SRD row active while the same import sweep tombstones its import-provenance control', async () => {
    const connection = await openTestDatabase();
    const db = new DatabaseContext(connection);
    seedSpellContent(db);
    const importer = new CatalogImporter(db);
    importer.import({
      documents: [JSON.stringify([catalogRecord()])],
    });

    const summary = importer.import({
      documents: [
        JSON.stringify([
          catalogRecord({
            identityKey: 'replacement',
            versionKey: '2024:replacement',
            name: 'Replacement',
            sourceSlug: 'replacement',
          }),
        ]),
      ],
    });

    expect(summary.tombstoned).toBe(1);
    expect(
      db.oneRaw(
        `SELECT is_active, provenance FROM spell_versions
         WHERE content_key = '2024:user-spell'`,
      ),
    ).toEqual({ is_active: 0, provenance: 'import' });
    expect(
      db.scalar(
        `SELECT count(*) FROM spell_versions
         WHERE provenance = 'srd' AND is_active = 1`,
      ),
    ).toBe(EXPECTED_SPELL_NAMES.length);
    connection.close();
  });

  it('refuses a pre-existing imported collision instead of overwriting user data or silently skipping the SRD spell', async () => {
    const connection = await openTestDatabase();
    const db = new DatabaseContext(connection);
    const identityId = db.exec(
      `INSERT INTO spell_identities (
         content_key, canonical_name, normalized_name
      ) VALUES ('acid-arrow', 'Acid Arrow', 'acid arrow')`,
    ).lastInsertId;
    db.exec(
      `INSERT INTO catalog_content_identities (
         content_key, content_kind, key_kind, catalog_layer, normalized_name
       ) VALUES (
         '2024:acid-arrow', 'spell', 'asserted', 'external', 'user acid arrow'
       )`,
    );
    db.exec(
      `INSERT INTO spell_versions (
         content_key, spell_identity_id, display_name, rules_edition,
         level, school, provenance
       ) VALUES (
         '2024:acid-arrow', ?, 'User Acid Arrow', '2024',
         2, 'Evocation', 'import'
       )`,
      [identityId],
    );

    expect(() => seedSpellContent(db)).toThrow(
      'SRD spells: cannot seed 2024:acid-arrow: the key already belongs to provenance "import".',
    );
    expect(
      db.oneRaw(
        `SELECT display_name, provenance FROM spell_versions
         WHERE content_key = '2024:acid-arrow'`,
      ),
    ).toEqual({ display_name: 'User Acid Arrow', provenance: 'import' });
    expect(db.scalar('SELECT count(*) FROM spell_versions')).toBe(1);
    connection.close();
  });
});
