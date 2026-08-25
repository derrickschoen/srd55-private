import {
  monsterStatblock,
  type MonsterProvenance,
  type MonsterStatblock,
  type SourceSpan,
} from '../statblock';
import {
  SRD_PATH,
  abilityLines,
  baseDetails,
  damage,
  melee,
  notListed,
  present,
  ranged,
  savingThrowBonuses,
} from './monster-helpers';

export const VANE_WARREN_MONSTER_NAMESPACE = 'vane-warren' as const;

const BUGBEAR_WARRIOR_SOURCE = {
  path: SRD_PATH,
  lineStart: 17728,
  lineEnd: 17761,
} as const satisfies SourceSpan;
const HOBGOBLIN_CAPTAIN_SOURCE = {
  path: SRD_PATH,
  lineStart: 19576,
  lineEnd: 19611,
} as const satisfies SourceSpan;
const PRIEST_SOURCE = {
  path: SRD_PATH,
  lineStart: 20742,
  lineEnd: 20766,
} as const satisfies SourceSpan;
const LEGENDARY_ACTION_SOURCE = {
  path: SRD_PATH,
  lineStart: 16703,
  lineEnd: 16716,
} as const satisfies SourceSpan;
const UNICORN_LEGENDARY_SOURCE = {
  path: SRD_PATH,
  lineStart: 21966,
  lineEnd: 22009,
} as const satisfies SourceSpan;

type OriginalHomebrewProvenance = Extract<
  MonsterProvenance,
  { readonly kind: 'original_homebrew' }
>;

function comparable(
  name: string,
  source: SourceSpan,
  armorClass: number,
  hitPoints: number,
  computedDpr: number,
): OriginalHomebrewProvenance['comparableAnchors'][number] {
  return {
    name,
    source,
    armorClass,
    hitPoints,
    computedDpr,
    allowedArmorClass: [armorClass - 3, armorClass + 3],
    allowedHitPoints: [Math.max(1, hitPoints - 40), hitPoints + 40],
    allowedDpr: [Math.max(1, computedDpr - 12), computedDpr + 12],
  };
}

const brutePriestProvenance: OriginalHomebrewProvenance = {
  kind: 'original_homebrew',
  comparableAnchors: [
    comparable('Bugbear Warrior', BUGBEAR_WARRIOR_SOURCE, 14, 33, 9),
    comparable('Priest', PRIEST_SOURCE, 13, 38, 22),
  ],
  designNote: 'Ashmaw is an original goblinoid brute-priest combining a front-line bludgeoning kit with SRD spell references; the cited creatures are balance comparables only.',
};

const brutePriestAbilities = abilityLines(
  [17, 3, 5],
  [12, 1, 1],
  [15, 2, 4],
  [10, 0, 0],
  [16, 3, 5],
  [11, 0, 0],
);

export const VANE_BRUTE_PRIEST = monsterStatblock({
  id: 'statblock:vane-warren/ashmaw-brute-priest',
  name: 'Ashmaw, Cinder Votary',
  armorClass: 15,
  hitPointMaximum: 82,
  speedFeet: 30,
  initiativeBonus: 1,
  savingThrowBonuses: savingThrowBonuses(brutePriestAbilities),
  attacksPerAction: 2,
  reachFeet: 10,
  usesDeathSaves: false,
  provenance: brutePriestProvenance,
  sourceDetails: {
    ...baseDetails(
      [BUGBEAR_WARRIOR_SOURCE, PRIEST_SOURCE],
      { sizes: ['Medium'], type: 'Fey', subtype: 'Goblinoid', alignment: 'Neutral Evil' },
      { rating: 4, experiencePoints: 1_100, proficiencyBonus: 2 },
      { count: 11, sides: 8, modifier: 33 },
      30,
      brutePriestAbilities,
    ),
    skills: present([{ name: 'Medicine', bonus: 5 }, { name: 'Religion', bonus: 4 }]),
    gear: present(['Cinder Maul', 'Hide Armor', 'War-drum Beater']),
    senses: present([{ kind: 'darkvision', rangeFeet: 60 }]),
    passivePerception: 13,
    languages: present([
      { kind: 'named', name: 'Common', canSpeak: true },
      { kind: 'named', name: 'Goblin', canSpeak: true },
    ]),
    damageResponses: notListed('damage vulnerabilities, resistances, or immunities'),
    conditionImmunities: notListed('condition immunities'),
    traits: present([{ kind: 'abduct', extraMovementCostWhileGrappling: false }]),
    actions: [
      {
        kind: 'multiattack',
        id: 'multiattack',
        count: 2,
        actionIds: ['cinder-maul'],
        combination: 'any',
      },
      melee('cinder-maul', 'Cinder Maul', 5, [
        damage(10, 2, 6, 3, 'Bludgeoning'),
      ], [], 10),
      {
        kind: 'spellcasting',
        id: 'war-prayers',
        actionEconomy: 'action',
        ability: 'wisdom',
        saveDc: present(13),
        spellAttackBonus: notListed('Ashmaw has no spell attack in this encounter kit.'),
        spells: [
          { id: 'command', availability: '3_per_day', manifestStatus: 'implemented' },
          { id: 'hold-person', availability: '1_per_day', manifestStatus: 'implemented' },
        ],
      },
    ],
    bonusActions: present([{
      kind: 'spellcasting',
      id: 'cinder-aid',
      actionEconomy: 'bonus_action',
      ability: 'wisdom',
      saveDc: present(13),
      spellAttackBonus: notListed('Healing Word has no spell attack roll.'),
      spells: [{ id: 'healing-word', availability: '3_per_day', manifestStatus: 'implemented' }],
    }]),
    reactions: notListed('reactions'),
  },
});

const warlordProvenance: OriginalHomebrewProvenance = {
  kind: 'original_homebrew',
  comparableAnchors: [
    comparable('Hobgoblin Captain', HOBGOBLIN_CAPTAIN_SOURCE, 17, 58, 24),
    comparable('Unicorn', UNICORN_LEGENDARY_SOURCE, 12, 97, 20),
  ],
  designNote: 'Marshal Kett is an original goblinoid warlord. Its weapon and aura baseline is anchored to the SRD Hobgoblin Captain; only the landed SRD legendary timing and pool vocabulary is adapted from the Unicorn exemplar.',
};

const warlordAbilities = abilityLines(
  [17, 3, 5],
  [14, 2, 4],
  [16, 3, 5],
  [13, 1, 1],
  [12, 1, 3],
  [16, 3, 5],
);

/** The pool parameter is explicit so encounter-balance and mutation controls can inspect it. */
export function vaneWarlordStatblock(legendaryActionPool: number): MonsterStatblock {
  return monsterStatblock({
    id: 'statblock:vane-warren/marshal-kett',
    name: 'Marshal Kett, the Iron Voice',
    armorClass: 17,
    hitPointMaximum: 58,
    speedFeet: 30,
    initiativeBonus: 4,
    savingThrowBonuses: savingThrowBonuses(warlordAbilities),
    attacksPerAction: 1,
    usesDeathSaves: false,
    provenance: warlordProvenance,
    sourceDetails: {
      ...baseDetails(
        [HOBGOBLIN_CAPTAIN_SOURCE, LEGENDARY_ACTION_SOURCE, UNICORN_LEGENDARY_SOURCE],
        { sizes: ['Medium'], type: 'Fey', subtype: 'Goblinoid', alignment: 'Lawful Evil' },
        { rating: 5, experiencePoints: 1_800, proficiencyBonus: 3 },
        { count: 8, sides: 8, modifier: 22 },
        30,
        warlordAbilities,
      ),
      skills: present([{ name: 'Perception', bonus: 4 }]),
      gear: present(['Greatsword', 'Half Plate Armor', 'Longbow']),
      senses: present([{ kind: 'darkvision', rangeFeet: 60 }]),
      passivePerception: 14,
      languages: present([
        { kind: 'named', name: 'Common', canSpeak: true },
        { kind: 'named', name: 'Goblin', canSpeak: true },
      ]),
      damageResponses: notListed('damage vulnerabilities, resistances, or immunities'),
      conditionImmunities: notListed('condition immunities'),
      traits: present([{
        kind: 'aura_of_authority',
        emanationFeet: 10,
        grantsAdvantageOn: ['attack_rolls', 'saving_throws'],
        blockedByCondition: 'Incapacitated',
      }]),
      actions: [
        {
          kind: 'multiattack',
          id: 'multiattack',
          count: 1,
          actionIds: ['iron-greatsword', 'longbow'],
          combination: 'any',
        },
        melee('iron-greatsword', 'Iron Greatsword', 6, [
          damage(10, 2, 6, 3, 'Slashing'),
          damage(3, 1, 6, 0, 'Poison'),
        ]),
        ranged('longbow', 'Longbow', 5, [
          damage(7, 1, 8, 3, 'Piercing'),
          damage(5, 2, 4, 0, 'Poison'),
        ], 150, present(600)),
      ],
      bonusActions: notListed('bonus actions'),
      reactions: notListed('reactions'),
      legendaryResistance: present({
        maximumUses: 1,
        recharge: 'day',
        conversion: 'failed_save_to_success',
      }),
      legendaryActions: present({
        maximumUses: legendaryActionPool,
        refresh: 'start_of_each_turn',
        window: 'after_another_creature_turn',
        actions: [
          {
            kind: 'move_and_attack',
            id: 'press-the-line',
            name: 'Press the Line',
            cost: 1,
            movement: 'half_speed',
            avoidsOpportunityAttacks: true,
            attackId: 'iron-greatsword',
          },
          {
            kind: 'temporary_defense',
            id: 'shielding-order',
            name: 'Shielding Order',
            cost: 1,
            target: 'self_or_visible_creature',
            rangeFeet: 60,
            temporaryHitPoints: { count: 2, sides: 6, modifier: 0 },
            temporaryHitPointsAverage: 7,
            armorClassBonus: 2,
            expiresAt: 'end_of_monster_next_turn',
          },
        ],
      }),
    },
  });
}

export const VANE_WARLORD = vaneWarlordStatblock(1);

export interface VaneWarrenMonsterRosterRow {
  readonly id: `statblock:${typeof VANE_WARREN_MONSTER_NAMESPACE}/${string}`;
  readonly name: string;
  readonly family: typeof VANE_WARREN_MONSTER_NAMESPACE;
  readonly provenance: OriginalHomebrewProvenance;
  readonly statblock: MonsterStatblock;
}

export const VANE_WARREN_MONSTER_ROSTER = [
  {
    id: 'statblock:vane-warren/ashmaw-brute-priest',
    name: 'Ashmaw, Cinder Votary',
    family: VANE_WARREN_MONSTER_NAMESPACE,
    provenance: brutePriestProvenance,
    statblock: VANE_BRUTE_PRIEST,
  },
  {
    id: 'statblock:vane-warren/marshal-kett',
    name: 'Marshal Kett, the Iron Voice',
    family: VANE_WARREN_MONSTER_NAMESPACE,
    provenance: warlordProvenance,
    statblock: VANE_WARLORD,
  },
] as const satisfies readonly VaneWarrenMonsterRosterRow[];
