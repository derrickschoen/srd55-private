import { describe, expect, it } from 'vitest';
import {
  parseSrdBackgroundTemplates,
  parseSrdSpeciesTemplates,
} from '../../../src/rules/origins-srd';

/**
 * THE ORACLE IS THE EXTRACT, READ BY A HUMAN — NOT THE PARSER'S OUTPUT.
 *
 * Every expectation below was transcribed by reading
 * `docs/srd/source/species-descriptions.txt` and
 * `docs/srd/source/backgrounds.txt` by eye. None of it was produced by running
 * the parser and pasting the result, and it must never be maintained that way:
 * a test that asserts the seeder produced what the seeder produced cannot fail.
 * The rule is `tests/unit/rules/weapons-srd.test.ts`'s and it is binding here.
 *
 * ORIGINS GETS THREE INDEPENDENT ORACLES INSIDE THE SAME DOCUMENT, which the
 * weapons table did not have, and all three are used below:
 *
 *  1. The SRD's own prose list in the character-creation chapter — "Dragonborn,
 *     Dwarf, Elf, Gnome, Goliath, Halfling, Human, Orc, and Tiefling" — a
 *     DIFFERENT page naming the nine.
 *  2. The table of contents, which lists four backgrounds under `Character
 *     Backgrounds ... 83` and nothing else, and puts `Feats` immediately after
 *     `Tiefling` — which is also what proves the species chapter ENDS there.
 *  3. Hand-counted per-species trait totals: 5/4/5/3/3/4/3/3/3 = 33. A
 *     two-column mis-join shows up as a wrong count before it shows up as
 *     wrong text.
 *
 * The individual cases are the awkward ones. Each is here because it breaks a
 * different naive implementation.
 */

const species = parseSrdSpeciesTemplates();
const backgrounds = parseSrdBackgroundTemplates();

function speciesNamed(name: string) {
  const found = species.find((entry) => entry.name === name);
  if (found === undefined) {
    throw new Error(`No parsed species named ${name}.`);
  }
  return found;
}

function traitNamed(speciesName: string, traitName: string) {
  const found = speciesNamed(speciesName).traits.find(
    (trait) => trait.name === traitName,
  );
  if (found === undefined) {
    throw new Error(`No ${speciesName} trait named ${traitName}.`);
  }
  return found;
}

function backgroundNamed(name: string) {
  const found = backgrounds.find((entry) => entry.name === name);
  if (found === undefined) {
    throw new Error(`No parsed background named ${name}.`);
  }
  return found;
}

describe('SRD species descriptions', () => {
  it('yields exactly the nine species the document names elsewhere', () => {
    expect(species.map((entry) => entry.name)).toEqual([
      'Dragonborn',
      'Dwarf',
      'Elf',
      'Gnome',
      'Goliath',
      'Halfling',
      'Human',
      'Orc',
      'Tiefling',
    ]);
    // Aasimar appears in the 2024 Player's Handbook and NOT in SRD 5.2.1 — zero
    // occurrences in the whole document. Assuming ten and shipping nine is the
    // failure `docs/srd/source/` exists to prevent.
    expect(species.map((entry) => entry.name)).not.toContain('Aasimar');
  });

  it('reads 33 traits, counted by hand per species', () => {
    // 5/4/5/3/3/4/3/3/3. Transcribed by reading the extract's columns, not by
    // asking the parser. A mis-join across the gutter changes one of these.
    expect(
      species.map((entry) => [entry.name, entry.traits.length]),
    ).toEqual([
      ['Dragonborn', 5],
      ['Dwarf', 4],
      ['Elf', 5],
      ['Gnome', 3],
      ['Goliath', 3],
      ['Halfling', 4],
      ['Human', 3],
      ['Orc', 3],
      ['Tiefling', 3],
    ]);
    expect(
      species.reduce((total, entry) => total + entry.traits.length, 0),
    ).toBe(33);
  });

  /**
   * THE REGRESSION TEST FOR THE TRUNCATED EXTRACT, AND THE MOST IMPORTANT
   * ASSERTION IN THIS FILE.
   *
   * `docs/srd/source/species-descriptions.txt` was committed missing the first
   * thirteen lines of printed page 84 — the right column's continuation of
   * Dragonborn — so the file carried three Dragonborn traits where the source
   * prints five. The PDF's SHA-256 matched throughout, because a checksum over
   * the PDF says nothing about the range someone sliced out of it. A parser
   * written against that file would have been provably correct against a wrong
   * source.
   */
  it('carries both Dragonborn traits the truncated extract had lost', () => {
    expect(speciesNamed('Dragonborn').traits.map((trait) => trait.name)).toEqual([
      'Draconic Ancestry',
      'Breath Weapon',
      'Damage Resistance',
      'Darkvision',
      'Draconic Flight',
    ]);
    expect(traitNamed('Dragonborn', 'Darkvision').description).toBe(
      'You have Darkvision with a range of 60 feet.',
    );
    expect(traitNamed('Dragonborn', 'Draconic Flight').description).toContain(
      'you have a Fly Speed equal to your Speed',
    );
  });

  it("reads the Goliath's 35 feet, the only species that is not 30", () => {
    // Catches "the Elf is the only speed problem": a Speed defaulted to 30
    // ships the Goliath silently wrong, and nothing else in the extract would
    // disagree.
    expect(speciesNamed('Goliath').base_speed_feet).toBe(35);
    for (const entry of species) {
      expect([entry.name, entry.base_speed_feet]).toEqual([
        entry.name,
        entry.name === 'Goliath' ? 35 : 30,
      ]);
    }
  });

  it("keeps the Wood Elf's 35 feet on the lineage, not on the Elf", () => {
    // The base Elf walks 30. The 35 belongs to ONE of three lineage
    // sub-choices, printed in the Elven Lineages table, and flattening it onto
    // the species would give every Elf a Speed two of the three do not have.
    expect(speciesNamed('Elf').base_speed_feet).toBe(30);
    expect(traitNamed('Elf', 'Elven Lineage').description).toContain(
      'Your Speed increases to 35 feet',
    );
    expect(traitNamed('Elf', 'Elven Lineage').effects).toEqual([]);
  });

  it('reads a chosen size as two options, and a fixed one as one', () => {
    // Human and Tiefling print "Medium (about ...) or Small (about ...), chosen
    // when you select this species". A `size` column that assumes one value
    // silently drops the choice.
    expect(speciesNamed('Human')).toMatchObject({
      size: 'Medium',
      alternate_size: 'Small',
    });
    expect(speciesNamed('Tiefling')).toMatchObject({
      size: 'Medium',
      alternate_size: 'Small',
    });
    expect(speciesNamed('Gnome')).toMatchObject({
      size: 'Small',
      alternate_size: null,
    });
    expect(speciesNamed('Dwarf')).toMatchObject({
      size: 'Medium',
      alternate_size: null,
    });
    // The printed height ranges are flavour and are deliberately not modelled.
    for (const entry of species) {
      expect(entry.size, entry.name).not.toContain('about');
      expect(entry.creature_type, entry.name).toBe('Humanoid');
    }
  });

  /**
   * HALFLING IS THE PROOF THE FREE-TEXT MAJORITY IS REAL.
   *
   * Four traits, zero mechanics, no work. This pins that as a FACT about the
   * source, so a later change that starts modelling everything fails here
   * rather than passing quietly.
   */
  it('gives the Halfling four traits and not one mechanical effect', () => {
    const halfling = speciesNamed('Halfling');
    expect(halfling.traits.map((trait) => trait.name)).toEqual([
      'Brave',
      'Halfling Nimbleness',
      'Luck',
      'Naturally Stealthy',
    ]);
    // NO ROWS, where this used to assert five nulls per trait. The inversion
    // turned "this trait grants nothing" from a row of nulls into the absence
    // of a row, which is the same fact with nothing to misread.
    for (const trait of halfling.traits) {
      expect(trait.effects, trait.name).toEqual([]);
    }
  });

  it('leaves 30 of the 33 traits free text, and declares four effects across three', () => {
    const mechanical = species.flatMap((entry) =>
      entry.traits.flatMap((trait) =>
        trait.effects.map(
          (effect) =>
            `${entry.name}: ${trait.name} (${effect.effect_kind})`,
        ),
      ),
    );
    // Transcribed from the reading of the source, not from the parse. Every
    // other trait is prose and is meant to stay prose.
    //
    // THREE ENTRIES WENT AND ONE ARRIVED, and both movements are the point.
    // `Elven Lineage`, `Gnomish Lineage` and `Otherworldly Presence` declared
    // `granted_spells` — a marker with no payload whose only consumer no
    // production code read; the spells come from
    // `species_definitions.grant_rules` through `src/grants/` and are surfaced
    // with their provenance by `SpellAccessBuilder`, so a second record here
    // was the parallel storage the design forbids. `Fiendish Legacy` arrived as
    // what its paragraph actually grants: a Resistance whose type the chosen
    // legacy names. That resistance was recorded NOWHERE before, because the
    // trait carried the spell marker in the one column it had.
    expect(mechanical).toEqual([
      'Dragonborn: Damage Resistance (damage_resistance)',
      'Dwarf: Dwarven Resilience (damage_resistance)',
      'Dwarf: Dwarven Toughness (hp_modifier)',
      'Tiefling: Fiendish Legacy (damage_resistance)',
    ]);
    const mechanicalTraits = species.flatMap((entry) =>
      entry.traits.filter((trait) => trait.effects.length > 0),
    );
    expect(mechanicalTraits).toHaveLength(4);
    expect(33 - mechanicalTraits.length).toBe(29);
  });

  it('types the Dwarf resistance and leaves the Dragonborn one unchosen', () => {
    // "You have Resistance to Poison damage" names its type; "the damage type
    // determined by your Draconic Ancestry trait" does not, and a null there is
    // a real state rather than a gap.
    expect(traitNamed('Dwarf', 'Dwarven Resilience').effects).toEqual([
      {
        effect_kind: 'damage_resistance',
        damage_type: 'Poison',
        hit_points_flat: null,
        hit_points_per_level: null,
        speed_bonus_feet: null,
      },
    ]);
    expect(traitNamed('Dragonborn', 'Damage Resistance').effects[0]).toMatchObject(
      { effect_kind: 'damage_resistance', damage_type: null },
    );
    // ...and the Tiefling's, which is structurally identical and used to be
    // recorded nowhere at all.
    expect(traitNamed('Tiefling', 'Fiendish Legacy').effects[0]).toMatchObject({
      effect_kind: 'damage_resistance',
      damage_type: null,
    });
  });

  it('seeds Dwarven Toughness as PER LEVEL only, with no flat half', () => {
    // "Your Hit Point maximum increases by 1, and it increases by 1 again
    // whenever you gain a level." The opening clause IS the level-1 grant, so
    // the total is the character's level and the flat half is ZERO. This was
    // seeded 1 and 1 until the review caught it, which gave a level-1 Dwarf +2
    // from a trait whose printed text says +1.
    expect(traitNamed('Dwarf', 'Dwarven Toughness').effects[0]).toMatchObject({
      effect_kind: 'hp_modifier',
      hit_points_flat: 0,
      hit_points_per_level: 1,
    });
  });

  it("leaves the Orc's Temporary Hit Points free text", () => {
    // Temporary Hit Points are NOT Hit Point maximum. Folding Adrenaline Rush
    // into `hp_modifier` would be wrong in a way nobody notices on a sheet.
    const trait = traitNamed('Orc', 'Adrenaline Rush');
    expect(trait.description).toContain('Temporary Hit Points');
    expect(trait.effects).toEqual([]);
  });

  it("leaves the Goliath's Large Form and the Dragonborn's flight free text", () => {
    // Both change a Speed, and both are level-gated and time-limited. `speed`
    // means a STANDING bonus to walking Speed; neither is one.
    expect(traitNamed('Goliath', 'Large Form').description).toContain(
      'your Speed increases by 10 feet',
    );
    expect(traitNamed('Goliath', 'Large Form').effects).toEqual([]);
    expect(traitNamed('Dragonborn', 'Draconic Flight').effects).toEqual([]);
  });

  it('leaves the four-hour Trance exactly as prose', () => {
    const trance = traitNamed('Elf', 'Trance');
    expect(trance.effects).toEqual([]);
    expect(trance.description).toContain('You can finish a Long Rest in 4 hours');
  });

  it('heals hyphens broken across a line', () => {
    // `Trem-/orsense`, `Presti-/digitation`, `Intelli-/gence` and `sav-/ing`
    // all break across lines in the extract. Without de-hyphenation a sheet
    // renders `Trem- orsense`.
    expect(traitNamed('Dwarf', 'Stonecunning').description).toContain(
      'Tremorsense',
    );
    expect(traitNamed('Dwarf', 'Stonecunning').description).not.toContain(
      'Trem- orsense',
    );
    expect(traitNamed('Gnome', 'Gnomish Lineage').description).toContain(
      'Prestidigitation',
    );
    expect(traitNamed('Gnome', 'Gnomish Cunning').description).toBe(
      'You have Advantage on Intelligence, Wisdom, and Charisma saving throws.',
    );
    expect(traitNamed('Dwarf', 'Dwarven Resilience').description).toContain(
      'saving throws',
    );
  });

  it('carries each choice table intact, inside the trait that names it', () => {
    // The three printed tables. Each must land on the trait whose OWN prose
    // points at it — the Fiendish Legacies table is printed at the foot of page
    // 86, after the Tiefling's last trait, so attaching by position puts it on
    // `Otherworldly Presence`, which is about Thaumaturgy.
    const ancestry = traitNamed('Dragonborn', 'Draconic Ancestry').description;
    expect(ancestry).toContain('Draconic Ancestors');
    expect(ancestry).toContain('Black     Acid');
    expect(ancestry).toContain('White     Cold');

    const lineage = traitNamed('Elf', 'Elven Lineage').description;
    expect(lineage).toContain('Elven Lineages');
    expect(lineage).toContain('Faerie Fire');
    expect(lineage).toContain('Pass without Trace');

    const legacy = traitNamed('Tiefling', 'Fiendish Legacy').description;
    expect(legacy).toContain('Fiendish Legacies');
    expect(legacy).toContain('Ray of Sickness');
    expect(legacy).toContain('Hold Person');
    // ...and NOT on the Tiefling's other traits.
    expect(traitNamed('Tiefling', 'Otherworldly Presence').description).not.toContain(
      'Ray of Sickness',
    );
    expect(traitNamed('Tiefling', 'Darkvision').description).toBe(
      'You have Darkvision with a range of 60 feet.',
    );
  });

  it('keeps the Gnome lineage sub-options inside their trait, not beside it', () => {
    // `Forest Gnome.` and `Rock Gnome.` are Title Case followed by a period and
    // look exactly like trait leads. They sit at their column's BASE indent,
    // which is what tells them apart — an indentation-only rule promotes them
    // and yields 37 traits where the source prints 33.
    expect(speciesNamed('Gnome').traits.map((trait) => trait.name)).toEqual([
      'Darkvision',
      'Gnomish Cunning',
      'Gnomish Lineage',
    ]);
    const lineage = traitNamed('Gnome', 'Gnomish Lineage').description;
    expect(lineage).toContain('Forest Gnome.');
    expect(lineage).toContain('Rock Gnome.');
  });

  it('keeps the wrapped Dwarven Resilience sentence out of the trait list', () => {
    // `You have Resistance to / Poison damage. You also...` wraps so that the
    // second line begins with a Title Case word and a period. It is not a trait.
    expect(speciesNamed('Dwarf').traits.map((trait) => trait.name)).toEqual([
      'Darkvision',
      'Dwarven Resilience',
      'Dwarven Toughness',
      'Stonecunning',
    ]);
  });

  /**
   * THE NEGATIVE TEST, and the failure most likely to look fine on a spot
   * check: a band mis-detection leaks page furniture into a trait description,
   * and the description still reads like English.
   */
  it('leaks no page furniture into any trait description', () => {
    for (const entry of species) {
      for (const trait of entry.traits) {
        const label = `${entry.name}: ${trait.name}`;
        expect(trait.description, label).not.toContain('Character Origins');
        expect(trait.description, label).not.toContain(
          'System Reference Document',
        );
        expect(trait.description, label).not.toContain('Species Descriptions');
        expect(trait.description, label).not.toContain('Parts of a Species');
        expect(trait.description, label).not.toMatch(/^\s*8[456]\s/);
        expect(trait.description.trim(), label).not.toBe('');
        // The zero width space in the Drow row would survive into the text and
        // be invisible in every diff that followed.
        expect(trait.description, label).not.toContain('​');
      }
    }
  });

  it('leaks no trait of one species into another', () => {
    // The two-column layout puts two species on the same physical line
    // throughout. A gutter one column out moves whole sentences between them.
    // Verbatim, cross-reference included: a trait's prose is the source's, and
    // only the BACKGROUND `Feat:` field strips `(see "Feats")` — there the
    // value has to be a feat's name, here it is a sentence.
    expect(traitNamed('Human', 'Versatile').description).toBe(
      'You gain an Origin feat of your choice (see \u201cFeats\u201d). ' +
        'Skilled is recommended.',
    );
    expect(traitNamed('Orc', 'Darkvision').description).toBe(
      'You have Darkvision with a range of 120 feet.',
    );
    expect(traitNamed('Elf', 'Darkvision').description).toBe(
      'You have Darkvision with a range of 60 feet.',
    );
    // Six of the nine print a trait called Darkvision, with three ranges
    // between them. A cross-column leak shows up here as a wrong range.
    const darkvision = species
      .flatMap((entry) =>
        entry.traits
          .filter((trait) => trait.name === 'Darkvision')
          .map((trait) => `${entry.name}: ${trait.description}`),
      )
      .sort();
    expect(darkvision).toEqual([
      'Dragonborn: You have Darkvision with a range of 60 feet.',
      'Dwarf: You have Darkvision with a range of 120 feet.',
      'Elf: You have Darkvision with a range of 60 feet.',
      'Gnome: You have Darkvision with a range of 60 feet.',
      'Orc: You have Darkvision with a range of 120 feet.',
      'Tiefling: You have Darkvision with a range of 60 feet.',
    ]);
  });

  it('mints one content key per species, edition-scoped', () => {
    expect(species.map((entry) => entry.content_key)).toEqual([
      '2024:species:dragonborn',
      '2024:species:dwarf',
      '2024:species:elf',
      '2024:species:gnome',
      '2024:species:goliath',
      '2024:species:halfling',
      '2024:species:human',
      '2024:species:orc',
      '2024:species:tiefling',
    ]);
  });
});

describe('SRD character backgrounds', () => {
  it('yields exactly the four SRD 5.2.1 backgrounds, not the PHB sixteen', () => {
    expect(backgrounds.map((entry) => entry.name)).toEqual([
      'Acolyte',
      'Criminal',
      'Sage',
      'Soldier',
    ]);
    // The 2024 Player's Handbook prints Charlatan, Entertainer, Guide and the
    // rest. They are not licensed here and hand-typing them would be inventing
    // content the document does not carry.
    for (const absent of ['Charlatan', 'Entertainer', 'Guide', 'Noble']) {
      expect(backgrounds.map((entry) => entry.name)).not.toContain(absent);
    }
  });

  /**
   * THE CRIMINAL IS THE AWKWARD ROW, AND IT WAS WRONG FIRST TIME.
   *
   * The Sage's name heading sits ONE SPACE further right than its own key
   * lines, so it reads as an indented continuation of whatever came before it —
   * the Criminal's equipment list. The Sage's five key lines then overwrote the
   * Criminal's one by one, producing a row called Criminal carrying the Sage's
   * abilities, feat, skills, tool and equipment, with nothing reporting a
   * problem anywhere.
   */
  it('gives the Criminal its own five parts and not the Sage’s', () => {
    expect(backgroundNamed('Criminal')).toEqual({
      content_key: '2024:background:criminal',
      name: 'Criminal',
      ability_score_1: 'Dexterity',
      ability_score_2: 'Constitution',
      ability_score_3: 'Intelligence',
      feat_name: 'Alert',
      skill_proficiency_1: 'Sleight of Hand',
      skill_proficiency_2: 'Stealth',
      tool_proficiency: 'Thieves’ Tools',
      equipment_option_a:
        '2 Daggers, Thieves’ Tools, Crowbar, 2 Pouches, Traveler’s Clothes, 16 GP',
      equipment_option_b: '50 GP',
      // The printed line above, SPLIT — transcribed from
      // `docs/srd/source/backgrounds.txt:91` by reading it, not by running the
      // parser and copying what came out. Three facts here are each a decision
      // the parse could have got wrong in a plausible-looking way: `2 Daggers`
      // keeps its printed plural as the NAME while carrying a quantity of 2 and
      // a link to the singular `Dagger` template; `2 Pouches` is a quantity and
      // NOT a weapon; and `16 GP` is quantity 1 rather than quantity 16.
      equipment_items: [
        {
          option: 'a',
          sort_order: 1,
          quantity: 2,
          item_name: '2 Daggers',
          item_kind: 'weapon',
          weapon_content_key: '2024:weapon:dagger',
          armor_content_key: null,
          coin_copper: null,
        },
        {
          option: 'a',
          sort_order: 2,
          quantity: 1,
          item_name: 'Thieves’ Tools',
          item_kind: 'gear',
          weapon_content_key: null,
          armor_content_key: null,
          coin_copper: null,
        },
        {
          option: 'a',
          sort_order: 3,
          quantity: 1,
          item_name: 'Crowbar',
          item_kind: 'gear',
          weapon_content_key: null,
          armor_content_key: null,
          coin_copper: null,
        },
        {
          option: 'a',
          sort_order: 4,
          quantity: 2,
          item_name: '2 Pouches',
          item_kind: 'gear',
          weapon_content_key: null,
          armor_content_key: null,
          coin_copper: null,
        },
        {
          option: 'a',
          sort_order: 5,
          quantity: 1,
          item_name: 'Traveler’s Clothes',
          item_kind: 'gear',
          weapon_content_key: null,
          armor_content_key: null,
          coin_copper: null,
        },
        {
          option: 'a',
          sort_order: 6,
          quantity: 1,
          item_name: '16 GP',
          item_kind: 'coin',
          weapon_content_key: null,
          armor_content_key: null,
          coin_copper: 1600,
        },
        {
          option: 'b',
          sort_order: 1,
          quantity: 1,
          item_name: '50 GP',
          item_kind: 'coin',
          weapon_content_key: null,
          armor_content_key: null,
          coin_copper: 5000,
        },
      ],
    });
  });

  it('splits a two-word skill name on the right "and"', () => {
    // "Sleight of Hand and Stealth" has one ` and `; "Insight and Religion" has
    // one too. A split on the word `and` alone would cut "Sleight of Hand".
    expect(backgroundNamed('Criminal').skill_proficiency_1).toBe(
      'Sleight of Hand',
    );
    expect(backgroundNamed('Acolyte')).toMatchObject({
      skill_proficiency_1: 'Insight',
      skill_proficiency_2: 'Religion',
    });
  });

  it('keeps the Soldier’s tool choice as the sentence the source prints', () => {
    // "Choose one kind of Gaming Set" is the printed value, and it wraps onto a
    // second line. A `tool_is_choice` boolean would be this project re-deciding
    // what the document already wrote down.
    expect(backgroundNamed('Soldier').tool_proficiency).toBe(
      'Choose one kind of Gaming Set',
    );
    expect(backgroundNamed('Sage').tool_proficiency).toBe(
      'Calligrapher’s Supplies',
    );
  });

  it('splits every Equipment line into its two printed options', () => {
    for (const entry of backgrounds) {
      expect(entry.equipment_option_b, entry.name).toBe('50 GP');
      expect(entry.equipment_option_a, entry.name).not.toContain('or (B)');
      expect(entry.equipment_option_a, entry.name).not.toContain('Choose A or B');
    }
    expect(backgroundNamed('Soldier').equipment_option_a).toBe(
      'Spear, Shortbow, 20 Arrows, Gaming Set (same as above), Healer’s Kit, ' +
        'Quiver, Traveler’s Clothes, 14 GP',
    );
  });

  it('strips the cross-reference from a feat name so it can be matched', () => {
    // The printed value is `Magic Initiate (Cleric) (see “Feats”)`. The
    // parenthetical is a page pointer, not part of the feat's name.
    expect(backgrounds.map((entry) => entry.feat_name)).toEqual([
      'Magic Initiate (Cleric)',
      'Alert',
      'Magic Initiate (Wizard)',
      'Savage Attacker',
    ]);
    for (const entry of backgrounds) {
      expect(entry.feat_name, entry.name).not.toContain('see');
    }
  });

  it('names three ability scores per background and applies none of them', () => {
    // The template SUGGESTS: "Increase one by 2 and another one by 1, or
    // increase all three by 1" is the user's choice, and `characters.strength`
    // through `charisma` stay the user's values. Nothing here writes them.
    expect(backgroundNamed('Sage')).toMatchObject({
      ability_score_1: 'Constitution',
      ability_score_2: 'Intelligence',
      ability_score_3: 'Wisdom',
    });
    for (const entry of backgrounds) {
      for (const ability of [
        entry.ability_score_1,
        entry.ability_score_2,
        entry.ability_score_3,
      ]) {
        expect(
          [
            'Strength',
            'Dexterity',
            'Constitution',
            'Intelligence',
            'Wisdom',
            'Charisma',
          ],
          `${entry.name}: ${ability}`,
        ).toContain(ability);
      }
    }
  });

  it('leaks no chapter prose into the last background', () => {
    // The Soldier is the last entry in the right column and the `Character
    // Species` chapter heading follows it immediately. Reading "until the next
    // background" would have swallowed the whole opening of that chapter.
    for (const entry of backgrounds) {
      for (const value of Object.values(entry)) {
        expect(String(value), entry.name).not.toContain('Character Species');
        expect(String(value), entry.name).not.toContain(
          'System Reference Document',
        );
      }
    }
  });
});
