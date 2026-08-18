import type {
  HomebrewDraft,
  SubclassAuthoringDraft,
  SubclassAuthoringDraftFeature,
  SubclassAuthoringDraftProgressionRow,
} from './contracts';
import type { HomebrewDraftItemUuid } from './ids';
import type { CharacterLevel } from '../domain/enums';
import type { ContentKey } from '../domain/ids';
import type { CatalogContentVisibility } from '../catalog/content-visibility';
import { characterLevels } from '../domain/enums';
import { MULTICLASS_SPELLCASTER_TABLE } from '../rules/spell-slots';
import { officialSpellKey } from '../catalog/catalog-key';

export interface BundledHomebrewCatalogEntry<
  D extends HomebrewDraft = HomebrewDraft,
> {
  /** Stable registry identity; unlike the published content key, it survives revisions. */
  readonly catalog_key: string;
  readonly visibility: CatalogContentVisibility;
  /**
   * Append-only authored history, oldest first. Keeping prior drafts lets the
   * installer distinguish a shipped revision from unrelated same-key content.
   */
  readonly revisions: readonly [D, ...D[]];
}

const itemUuid = (value: string): HomebrewDraftItemUuid =>
  value as HomebrewDraftItemUuid;

const zeroSlots = (): readonly number[] => [0, 0, 0, 0, 0, 0, 0, 0, 0];

/** D223: our stated third fraction applied to the SRD table, never a copied ladder. */
export function deriveThirdCasterSlotCounts(
  classLevel: CharacterLevel,
  table: typeof MULTICLASS_SPELLCASTER_TABLE = MULTICLASS_SPELLCASTER_TABLE,
): readonly number[] {
  return deriveThirdCasterSlotCountsForRounding(classLevel, 'down', table);
}

function maximumSpellLevel(slots: readonly number[]): number {
  for (let index = slots.length - 1; index >= 0; index -= 1) {
    if ((slots[index] ?? 0) > 0) return index + 1;
  }
  return 0;
}

function thirdCasterRows(input: {
  readonly cantripsKnown: (level: CharacterLevel) => number;
  readonly spellsKnown: (level: CharacterLevel) => number;
  readonly rounding?: 'up' | 'down';
  readonly grants?: (
    level: CharacterLevel,
  ) => SubclassAuthoringDraftProgressionRow['grants'];
}): readonly SubclassAuthoringDraftProgressionRow[] {
  return characterLevels.map((classLevel) => {
    const slots = deriveThirdCasterSlotCountsForRounding(
      classLevel,
      input.rounding ?? 'down',
    );
    return Object.freeze({
      class_level: classLevel,
      cantrips_known: input.cantripsKnown(classLevel),
      prepared_or_known_count: input.spellsKnown(classLevel),
      maximum_spell_level: maximumSpellLevel(slots),
      slot_counts: Object.freeze(slots),
      grants: Object.freeze(input.grants?.(classLevel) ?? []),
    });
  });
}

function deriveThirdCasterSlotCountsForRounding(
  classLevel: CharacterLevel,
  rounding: 'up' | 'down',
  table: typeof MULTICLASS_SPELLCASTER_TABLE = MULTICLASS_SPELLCASTER_TABLE,
): readonly number[] {
  // Barbed Court's later owner publication chooses up; both paths still apply
  // the stated fraction to the SRD table rather than transcribing a ladder.
  if (classLevel < 3) return zeroSlots();
  const fraction = classLevel / 3;
  const casterLevel = rounding === 'up' ? Math.ceil(fraction) : Math.floor(fraction);
  return casterLevel === 0 ? zeroSlots() : [...table[casterLevel - 1]!];
}

function fixedSpellGrant(
  spellName: string,
  ruleKey: string,
): NonNullable<SubclassAuthoringDraftProgressionRow['grants']>[number] {
  return Object.freeze({
    kind: 'fixed_spell' as const,
    draft_item_uuid: itemUuid(`bundled-barbed-grant-${ruleKey}`),
    rule_key: `barbed-court-${ruleKey}`,
    spell_content_key: officialSpellKey('2024', spellName) as ContentKey,
    always_prepared: true,
  });
}

function spellStudentChoiceGrant(
  classLevel: CharacterLevel,
  kind: 'cantrips' | 'spells',
  count: number,
  maximumSpellLevel: number,
  minimumSpellLevel?: number,
): NonNullable<SubclassAuthoringDraftProgressionRow['grants']>[number] {
  return Object.freeze({
    kind: 'choice_from_list' as const,
    draft_item_uuid: itemUuid(
      `bundled-spell-student-${kind}-${String(classLevel)}`,
    ),
    rule_key: `spell-student-${kind}`,
    list: 'Wizard',
    count,
    ...(minimumSpellLevel === undefined
      ? {}
      : { minimum_spell_level: minimumSpellLevel }),
    maximum_spell_level: maximumSpellLevel,
  });
}

function barbedCourtChoiceGrant(
  classLevel: CharacterLevel,
  kind: 'cantrips' | 'prepared-spells',
  count: number,
  maximumSpellLevel: number,
): NonNullable<SubclassAuthoringDraftProgressionRow['grants']>[number] {
  return Object.freeze({
    kind: 'choice_from_list' as const,
    draft_item_uuid: itemUuid(
      `bundled-barbed-${kind}-${String(classLevel)}`,
    ),
    rule_key: `barbed-court-${kind}`,
    list: 'Bard',
    count,
    minimum_spell_level: kind === 'cantrips' ? 0 : 1,
    maximum_spell_level: kind === 'cantrips' ? 0 : maximumSpellLevel,
  });
}

const barbedCourtGrants = Object.freeze(new Map<CharacterLevel, readonly NonNullable<
  SubclassAuthoringDraftProgressionRow['grants']
>[number][]>([
  [3, [
    fixedSpellGrant('Vicious Mockery', 'vicious-mockery'),
    fixedSpellGrant('Prestidigitation', 'prestidigitation'),
    fixedSpellGrant('Bane', 'bane'),
    fixedSpellGrant('Command', 'command'),
    fixedSpellGrant('Dissonant Whispers', 'dissonant-whispers'),
    fixedSpellGrant('Hideous Laughter', 'hideous-laughter'),
  ]],
  [7, [
    fixedSpellGrant('Enthrall', 'enthrall'),
    fixedSpellGrant('Suggestion', 'suggestion'),
  ]],
  [10, [fixedSpellGrant('Message', 'message')]],
  [13, [
    fixedSpellGrant('Hypnotic Pattern', 'hypnotic-pattern'),
    fixedSpellGrant('Tongues', 'tongues'),
  ]],
  [19, [
    fixedSpellGrant('Compulsion', 'compulsion'),
    fixedSpellGrant('Confusion', 'confusion'),
  ]],
]));

const veteranV1: SubclassAuthoringDraft = Object.freeze<SubclassAuthoringDraft>({
  kind: 'subclass',
  document_version: 1,
  name: 'Veteran',
  rules_edition: '2024',
  reference_text: [
    'Veterans survive through practiced technique, broad experience, and the ability to perform reliably under pressure. Some are retired soldiers, seasoned scouts, professional adventurers, bounty hunters, or survivors who have learned a little about nearly everything.',
    'A Veteran rarely relies on luck. Their attacks find vulnerable openings even when they fall short, and their years of experience eventually make them capable in almost any situation.',
  ].join('\n\n'),
  parent_class_content_key: '2024:class:rogue' as ContentKey,
  progression: { mode: 'inherit_parent' },
  features: [
    [3, 'Seasoned Professional', 'You gain proficiency in one skill of your choice.'],
    [3, 'Too Old for This', 'You can only deal Sneak Attack damage on your turn. You cannot apply Sneak Attack on reactions or any effect outside your turn.'],
    [3, 'Deuces Are Wild', 'When you roll damage for a weapon attack or Sneak Attack, you can reroll any damage die that shows a 2. You must use the new roll.'],
    [3, 'Sure Strike', [
      'Once per round, on your turn, when you miss a creature with an attack using a Finesse or Ranged weapon, you can deal your Sneak Attack damage to that target as if the attack had hit, provided all Sneak Attack requirements are met.',
      'You must be able to see the target, and the attack must not have been made with disadvantage. You must also satisfy all normal conditions for Sneak Attack (including that you have not already dealt Sneak Attack damage this turn).',
      "The damage dealt by this feature has the same type as the weapon's normal damage.",
    ].join('\n\n')],
    [9, "Veteran's Strike", [
      'Your Sneak Attack damage dice are doubled.',
      'For example, if your Sneak Attack is normally 5d6, it becomes 10d6.',
      'This applies to your Sneak Attack dice pool in all cases, with no exceptions.',
      'Using Cunning Action or any other bonus action feature does not increase the opportunity cost of Sneak Attack; you still only expend Sneak Attack once per turn as normal.',
    ].join('\n\n')],
    [9, 'Extensive Experience', [
      'You gain proficiency in two skills of your choice.',
      'In addition, choose two of your skill proficiencies. You gain Expertise in those skills.',
      'You can choose skills in which you gained proficiency from this feature.',
    ].join('\n\n')],
    [13, 'Veteran Reflexes', [
      'When a creature you can see hits you with an attack, you can use your reaction to increase your Armor Class by a number equal to your proficiency bonus, potentially causing the attack to miss.',
      'You can use this feature a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.',
    ].join('\n\n')],
    [13, 'Critical Instincts', 'Your weapon attacks score a critical hit on a roll of 19–20.'],
    [13, 'Fighting Style', "You adopt a particular style of fighting. Choose one Fighting Style option from the Fighter class. You can't take a Fighting Style option more than once, even if you later gain another."],
    [17, 'Master of Experience', [
      "You gain proficiency in every skill in which you don't already have proficiency. You gain Expertise in every skill in which you don't already have Expertise.",
    ].join('\n\n')],
    [17, 'Heightened Lethality', 'Your weapon attacks score a critical hit on a roll of 18–20. This replaces the Critical Instincts feature you gained at 13th level.'],
    [17, 'Blindsight', 'You gain blindsight out to a range of 10 feet.'],
  ].map(([level, name, description], index) => Object.freeze({
    draft_item_uuid: itemUuid(`bundled-veteran-feature-${String(index + 1)}`),
    class_level: level as CharacterLevel,
    name: String(name),
    description: String(description),
    effects: Object.freeze([]),
  })),
});

const barbedCourtV1: SubclassAuthoringDraft = Object.freeze<SubclassAuthoringDraft>({
  kind: 'subclass',
  document_version: 1,
  name: 'Warrior of the Barbed Court',
  rules_edition: '2024',
  reference_text: [
    'A Warrior of the Barbed Court turns an insult into supernatural pressure in order to make a foe choose between facing the monk and striking an ally through a cutting doubt. Its repeated visible verb is goad: in combat the monk names the weakness exposed by a failed spell, in exploration a needling whisper draws a watcher into revealing itself, and in social scenes a perfectly timed word punctures a bully\'s performance without drawing a weapon.',
    'The 3.5 SRD Psionic Fist is used only as open-content, concept-level precedent for the frame of a monk who develops supernatural casting; no wording or mechanical form is taken from it.',
  ].join('\n\n'),
  parent_class_content_key: '2024:class:monk' as ContentKey,
  // D224: full ordinary content. Spell Student alone owns exact slot-contract pins.
  progression: {
    mode: 'override',
    spellcasting_ability: 'wisdom',
    caster_contribution: 'third_down',
    rows: thirdCasterRows({
      cantripsKnown: (level) => level < 3 ? 0 : level < 10 ? 2 : 3,
      // Every leveled spell is a curated always-prepared grant, not a free choice.
      spellsKnown: () => 0,
      grants: (level) => barbedCourtGrants.get(level) ?? [],
    }),
  },
  features: [
    [3, 'Barbed Court Spellcasting', [
      'You know the cantrips shown on the Barbed Court curated list.',
      'You always have the spells in the Barbed Court curated list prepared when you reach the Monk levels shown there. These spells count as Monk spells for you.',
      'The Monk Third-Caster Spell Slots table shows how many spell slots you have to cast your level 1+ Monk spells. To cast one of those spells, you must expend a slot of the spell\'s level or higher. You regain all expended spell slots when you finish a Long Rest.',
      'Wisdom is your spellcasting ability for your Monk spells. Your spell save DC equals 8 plus your Wisdom modifier and Proficiency Bonus, and your spell attack modifier equals your Wisdom modifier plus your Proficiency Bonus.',
    ].join('\n\n')],
    [3, 'Barbed Goad', [
      'Once on each of your turns when one or more creatures fail a saving throw against a spell you cast that has a Verbal component, you can choose one of those creatures that can hear you. Until the start of your next turn, that creature is goaded by you. The first time before then that it makes an attack roll against a target other than you, it must subtract one roll of your Martial Arts die from the attack roll.',
      'When you goad a creature in this way, you can expend 1 Focus Point to sharpen the taunt. If you do, the creature must subtract one roll of your Martial Arts die from every attack roll it makes against a target other than you for the duration, rather than only the first such attack roll.',
    ].join('\n\n')],
    [6, 'Spellwoven Flurry', [
      "While you aren't holding a weapon, whenever you use Flurry of Blows, you can replace one of the Unarmed Strikes it grants with casting a cantrip you know that has a casting time of an action. The cantrip is cast as part of the Bonus Action you take to use Flurry of Blows, and you can't replace more than one Unarmed Strike in this way each time you use that Bonus Action.",
      'For this subclass, Vicious Mockery is the signature interaction. On a failed save, it can trigger Barbed Goad. It replaces one strike of the Focus-funded Flurry; it never adds a strike or a second cantrip.',
    ].join('\n\n')],
    [11, 'Scandalous Echo', [
      'When you goad a creature with Barbed Goad, you can expend 1 Focus Point to carry the taunt to a second creature of your choice within 30 feet of the goaded creature that can hear you. Until the start of your next turn, the second creature is also goaded by you. The first time before then that it makes an attack roll against a target other than you, it must subtract one roll of your Martial Arts die from the attack roll.',
      'If you also expend the Focus Point that sharpens Barbed Goad, the sharpened taunt applies to both goaded creatures. Thus carrying and sharpening the taunt costs a total of 2 Focus Points.',
    ].join('\n\n')],
    [17, 'Unanswerable Challenge', [
      "When you goad a creature with Barbed Goad, you can expend 3 Focus Points to issue an unanswerable challenge instead of using Barbed Goad's normal duration and Focus option. The creature is goaded by you for 1 minute. While goaded in this way, it must subtract one roll of your Martial Arts die from every attack roll it makes against a target other than you.",
      'At the end of each of its turns, the creature can make a Wisdom saving throw against your Focus Point save DC, ending the effect on itself on a success. The effect also ends early if you have the Incapacitated condition or the creature can no longer hear you. You can have only one creature goaded by this feature at a time; issuing another unanswerable challenge ends the first.',
    ].join('\n\n')],
  ].map(([level, name, description], index) => Object.freeze({
    draft_item_uuid: itemUuid(`bundled-barbed-feature-${String(index + 1)}`),
    class_level: level as CharacterLevel,
    name: String(name),
    description: String(description),
    effects: Object.freeze([]),
  })),
});

const veteranV2: SubclassAuthoringDraft = Object.freeze<SubclassAuthoringDraft>({
  kind: 'subclass',
  document_version: 1,
  name: 'Veteran',
  rules_edition: '2024',
  reference_text: 'Veterans survive through practiced technique, broad experience, and the ability to perform reliably under pressure. Some are retired soldiers, seasoned scouts, professional adventurers, bounty hunters, or survivors who have learned a little about nearly everything. A Veteran rarely relies on luck: their attacks find vulnerable openings even when they fall short, and their years of experience eventually make them capable in almost any situation.',
  parent_class_content_key: '2024:class:rogue' as ContentKey,
  progression: { mode: 'inherit_parent' },
  features: [
    [3, 'Seasoned Professional', 'You gain proficiency in one skill of your choice.'],
    [3, 'Old Training', 'You gain the Two-Weapon Fighting feat. For any feature or feat that requires the Fighting Style Feature as a prerequisite, this feature satisfies it.'],
    [3, 'Deeper Cuts', 'Your Sneak Attack deals one extra die of damage.'],
    [3, 'Old Reserves', [
      'When you deal Sneak Attack damage, you can draw on your reserves (no action required, after seeing the damage roll): add a number of d6s to that damage equal to half your Rogue level (round down). These dice are of the same damage type as the Sneak Attack, are doubled by a critical hit, and can be rerolled by Deuces Are Wild. Because Sure Strike is not Sneak Attack damage, Old Reserves can\'t be added to it. Once you use this feature, you can\'t use it again until you finish a Short or Long Rest.',
    ].join('\n\n')],
    [3, 'Too Old for This', 'You can deal Sneak Attack damage only on your turn. You can\'t apply Sneak Attack on Reactions or any effect outside your turn.'],
    [3, 'Deuces Are Wild', 'When you roll damage for a weapon attack, Sneak Attack, Old Reserves, or Sure Strike, you can reroll each damage die that shows a 2, once per die. You must use the new rolls.'],
    [3, 'Sure Strike', [
      'Once per turn, when you miss a creature with an attack using a Finesse or Ranged weapon, you can choose to expend your Sneak Attack for the turn (no action required): the target takes damage equal to half your Sneak Attack dice, rounded up, of the weapon\'s damage type.',
      'You must be able to see the target, and the attack must not have been made with Disadvantage. On any turn you can deal Sneak Attack damage or use Sure Strike, but never both — using either expends the turn\'s Sneak Attack.',
    ].join('\n\n')],
    [9, "Veteran's Strike", 'Your Sneak Attack dice equal your Rogue level (9d6 at 9th level, 20d6 at 20th). This replaces Deeper Cuts.'],
    [9, 'Extensive Experience', 'You gain proficiency in two skills of your choice. In addition, choose two of your skill proficiencies: you gain Expertise in those skills. You can choose skills in which you gained proficiency from this feature.'],
    [13, 'Veteran Reflexes', [
      'When a creature you can see hits you with an attack, you can take a Reaction to increase your Armor Class by an amount equal to your Proficiency Bonus against that attack, potentially causing it to miss.',
      'You can use this feature a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.',
    ].join('\n\n')],
    [13, 'Critical Instincts', 'Your weapon attacks score a critical hit on a roll of 19–20.'],
    [13, 'Fighting Style', 'You gain one Fighting Style feat of your choice. You can\'t take the same feat Old Training granted.'],
    [17, 'Master of Experience', 'You gain proficiency in every skill in which you don\'t already have proficiency. You gain Expertise in every skill in which you don\'t already have Expertise.'],
    [17, 'Heightened Lethality', 'Your weapon attacks score a critical hit on a roll of 18–20. This replaces Critical Instincts.'],
    [17, 'Blindsight', 'You gain Blindsight out to a range of 10 feet.'],
  ].map(([level, name, description], index) => Object.freeze({
    draft_item_uuid: itemUuid(`bundled-veteran-v2-feature-${String(index + 1)}`),
    class_level: level as CharacterLevel,
    name: String(name),
    description: String(description),
    effects: Object.freeze([]),
  })),
});

const veteranV3: SubclassAuthoringDraft = Object.freeze<SubclassAuthoringDraft>({
  ...veteranV2,
  features: Object.freeze(veteranV2.features.map((feature) => {
    switch (feature.name) {
      case 'Deeper Cuts':
        return Object.freeze({
          ...feature,
          contributions: Object.freeze([Object.freeze({
            kind: 'feature_value_contribution' as const,
            draft_item_uuid: itemUuid('bundled-veteran-v3-deeper-cuts'),
            contribution_key: 'deeper-cuts',
            label: 'Deeper Cuts',
            target: Object.freeze({
              kind: 'feature_dice_count' as const,
              key: 'sneak_attack' as const,
            }),
            op: 'add' as const,
            active_from_level: 3,
            active_to_level: 20,
            value: Object.freeze({ kind: 'constant' as const, amount: 1 }),
            supersedes_contribution_key: null,
          })]),
        });
      case "Veteran's Strike":
        return Object.freeze({
          ...feature,
          contributions: Object.freeze([Object.freeze({
            kind: 'feature_value_contribution' as const,
            draft_item_uuid: itemUuid('bundled-veteran-v3-veterans-strike'),
            contribution_key: 'veterans-strike',
            label: "Veteran's Strike",
            target: Object.freeze({
              kind: 'feature_dice_count' as const,
              key: 'sneak_attack' as const,
            }),
            op: 'add' as const,
            active_from_level: 9,
            active_to_level: 20,
            value: Object.freeze({
              kind: 'class_level_scale' as const,
              multiply: 1,
              divide: 2,
              round: 'floor' as const,
            }),
            supersedes_contribution_key: 'deeper-cuts',
          })]),
        });
      case 'Veteran Reflexes':
        return Object.freeze({
          ...feature,
          contributions: Object.freeze([Object.freeze({
            kind: 'feature_value_contribution' as const,
            draft_item_uuid: itemUuid('bundled-veteran-v3-veteran-reflexes'),
            contribution_key: 'veteran-reflexes',
            label: 'Veteran Reflexes',
            target: Object.freeze({
              kind: 'resource_maximum' as const,
              display_label: 'Veteran Reflexes',
              marking_shape: 'boxes' as const,
            }),
            op: 'add' as const,
            active_from_level: 13,
            active_to_level: 20,
            value: Object.freeze({
              kind: 'preserved' as const,
              expression: Object.freeze({
                kind: 'ref' as const,
                source: Object.freeze({ kind: 'proficiency_bonus' as const }),
              }),
            }),
            supersedes_contribution_key: null,
          })]),
        });
      default:
        return feature;
    }
  })),
});

const barbedCourtV2FixedGrants = Object.freeze(new Map<CharacterLevel, readonly NonNullable<
  SubclassAuthoringDraftProgressionRow['grants']
>[number][]>([
  [3, [
    fixedSpellGrant('Shocking Grasp', 'shocking-grasp'),
    fixedSpellGrant('Chill Touch', 'chill-touch'),
    fixedSpellGrant('Ray of Frost', 'ray-of-frost'),
    fixedSpellGrant('Vicious Mockery', 'vicious-mockery'),
    fixedSpellGrant('Mage Hand', 'mage-hand'),
    fixedSpellGrant('Guidance', 'guidance'),
    fixedSpellGrant('Shield', 'shield'),
    fixedSpellGrant('Dissonant Whispers', 'dissonant-whispers'),
  ]],
  [6, [
    fixedSpellGrant('Mirror Image', 'mirror-image'),
    fixedSpellGrant('Blur', 'blur'),
    fixedSpellGrant('Hold Person', 'hold-person'),
  ]],
  [11, [
    fixedSpellGrant('Slow', 'slow'),
    fixedSpellGrant('Fear', 'fear'),
  ]],
  [17, [fixedSpellGrant('Compulsion', 'compulsion')]],
]));

const barbedCourtChosenSpellCounts = Object.freeze(new Map<CharacterLevel, number>([
  [3, 4], [4, 5], [5, 6], [6, 6], [7, 7], [8, 7], [9, 9], [10, 9],
  [11, 10], [12, 10], [13, 11], [14, 11], [15, 12], [16, 12],
  [17, 14], [18, 14], [19, 15], [20, 15],
]));

const barbedCourtV2: SubclassAuthoringDraft = Object.freeze<SubclassAuthoringDraft>({
  kind: 'subclass',
  document_version: 1,
  name: 'Warrior of the Barbed Court',
  rules_edition: '2024',
  reference_text: 'Somewhere between a duelist\'s salon and a haunted etiquette lesson lies the Barbed Court, a monastic tradition that treats the insult as a martial form. Its monks fight surrounded by an invisible retinue — spectral hands that slap, beckon, and humiliate — and every technique is a provocation: the goad that makes ignoring you unbearable, the duel that binds an enemy\'s pride to your fists, the barbed word that lands harder than the blow. A Warrior of the Barbed Court wins by being impossible to disregard. Enemies who attack you meet mirror-images, warded air, and a wall of unseen palms; enemies who dare attack anyone else are slapped back into line.',
  parent_class_content_key: '2024:class:monk' as ContentKey,
  progression: {
    mode: 'override',
    spellcasting_ability: 'wisdom',
    caster_contribution: 'third_up',
    rows: thirdCasterRows({
      rounding: 'up',
      cantripsKnown: (level) => level < 3 ? 0 : 8,
      spellsKnown: (level) => barbedCourtChosenSpellCounts.get(level) ?? 0,
      grants: (level) => {
        if (level < 3) return [];
        const slots = deriveThirdCasterSlotCountsForRounding(level, 'up');
        return [
          barbedCourtChoiceGrant(level, 'cantrips', 2, 0),
          barbedCourtChoiceGrant(
            level,
            'prepared-spells',
            barbedCourtChosenSpellCounts.get(level) ?? 0,
            maximumSpellLevel(slots),
          ),
          ...(barbedCourtV2FixedGrants.get(level) ?? []),
        ];
      },
    }),
  },
  features: [
    [3, 'Barbed Court Spellcasting', [
      'You have learned to cast spells through the discipline of the Court. See the rules on spellcasting; the information below details how you use them with this subclass.',
      'Cantrips. You know Shocking Grasp, Chill Touch, Ray of Frost, Vicious Mockery, Mage Hand, and Guidance, plus two Bard cantrips of your choice.',
      'Spell Slots. The Barbed Court Spellcasting table shows how many spell slots you have to cast your level 1+ spells. You regain all expended slots when you finish a Long Rest.',
      'Prepared Spells. Choose spells from the Bard spell list. The Chosen Spells column shows how many you can have prepared; they must be of a level for which you have spell slots. Whenever you finish a Long Rest, you can change your list of prepared spells. Whenever you finish a Short Rest, you can replace one prepared spell.',
      'Court Spells. You always have the spells on the Court Spells table prepared once you reach the listed level; they don\'t count against your Chosen Spells.',
      'Ritual Casting. You can cast a prepared spell as a Ritual if it has the Ritual tag.',
      'Spellcasting Ability. Wisdom is your spellcasting ability for these spells. Your spell save DC is your Focus save DC; your spell attack modifier is your Wisdom modifier + your Proficiency Bonus.',
    ].join('\n\n')],
    [3, 'Court Cantrips', 'When you spend one or more Focus Points, you can cast one cantrip you know that has a casting time of an Action as part of that expenditure (no action required). You can cast a cantrip this way only once per turn.'],
    [3, 'Barbed Goad', [
      'When you hit a creature with a melee attack, you can spend 1 Focus Point to goad it into a duel — an insult spoken aloud, or delivered as a slap, sneer, or gesture. For 1 minute, the goaded creature has Disadvantage on attack rolls against creatures other than you. When it tries to move more than 30 feet away from you, it must first succeed on a Wisdom saving throw against your Focus save DC; on a failed save, it can\'t willingly move more than 30 feet away from you until the start of its next turn.',
      'The effect ends early on a goaded creature if you attack a creature you have not goaded, if one of your allies damages it or targets it with a harmful spell, or when it succeeds on the withdrawal save. You can have more than one creature goaded at a time.',
    ].join('\n\n')],
    [3, 'Faces of the Court', 'You can cast Mirror Image without expending a spell slot, using Wisdom as the spellcasting ability, a number of times equal to your Proficiency Bonus. You regain all expended uses when you finish a Long Rest.'],
    [3, 'Wisdom-Guided Strikes', 'You can use your Wisdom modifier in place of Strength or Dexterity for the attack and damage rolls of your Unarmed Strikes.'],
    [3, "Courtier's Slap", [
      'Once on each of your turns when you take the Attack action and make an Unarmed Strike, you can also have a spectral hand appear and slap one creature within 10 feet of you as part of that action; the hand then vanishes. If the target is within 5 feet of you, the slap is an Unarmed Strike; against a farther target, it is a ranged weapon attack that uses your Wisdom modifier for its attack and damage rolls. On a hit, the target takes Psychic damage equal to one roll of your Martial Arts die + your Wisdom modifier, and its Speed is reduced by 10 feet until the start of your next turn.',
      'The slap works whether or not your Mage Hand is present and doesn\'t require your Bonus Action.',
    ].join('\n\n')],
    [3, 'The Standing Hand', 'When you cast Mage Hand, its duration is 8 hours, and the hand can deliver your insults — a goad\'s slap, sneer, or gesture can visibly come from the hand. While your Mage Hand is present, the Unarmed Strikes you make as part of the Attack action have a reach of 10 feet, delivered by the hand.'],
    [3, 'Innate Sorcery of the Court', 'You can spend 2 Focus Points (no action required) to unleash the Court\'s simmering magic for 1 minute: the spell save DC of your Barbed Court spells increases by 1, and you have Advantage on the attack rolls of Barbed Court spells you cast. The effect doesn\'t stack with itself; activating it again restarts the duration.'],
    [6, 'Warding Image', 'An illusory after-image attends you: you gain a +2 bonus to Armor Class.'],
    [6, 'Unshaken Aim', 'Being within 5 feet of an enemy doesn\'t impose Disadvantage on your ranged attack rolls.'],
    [6, 'Barbed Fists', 'Your Unarmed Strikes gain a +1 bonus to attack and damage rolls. The bonus becomes +2 at Monk level 11 and +3 at Monk level 17. If a magic item gives your Unarmed Strike a bonus to the same roll, use the higher bonus.'],
    [6, 'Focus Refresh', 'You can spend Focus Points to regain one of your expended spell slots (no action required). The cost is 2 Focus Points per level of the slot regained.'],
    [11, 'Hands of the Barbed Court', [
      'As a Bonus Action, you can spend 4 Focus Points to manifest the full court — a 15-foot Emanation of invisible slapping hands — for up to 10 minutes. The effect requires Concentration. While the court is manifested, when you hit a creature in the Emanation with an attack, the hands add Psychic damage equal to your Wisdom modifier to the hit.',
      'At Monk level 17 the court matures: the hands\' extra damage increases to twice your Wisdom modifier, and the court guides your aim — you have Advantage on attack rolls against creatures in the Emanation.',
    ].join('\n\n')],
    [17, 'Focus-Casting', 'You can cast any spell you have prepared that has a casting time of an Action by spending Focus Points equal to the spell\'s level instead of a spell slot. A spell cast by spending Focus Points is always cast at its base level.'],
    [17, 'The Rebuking Shield', [
      'When you roll Initiative, you can manifest the Hands of the Barbed Court as a Reaction (spending its normal 4 Focus Points; manifesting as a Bonus Action remains available).',
      'Whenever you manifest the Hands — at Initiative or as a Bonus Action — you can spend 3 additional Focus Points to raise the Rebuking Shield: for as long as the court remains manifested, a creature that hits you with a melee attack takes 2d8 Psychic damage, and you are immune to the Charmed and Frightened conditions and to Psychic damage. The shield is visible only as a shimmer of affronted dignity. This is a subclass feature, not spellcasting — no spell slot, no components, and it can\'t be counterspelled. The shield ends when the manifestation ends (including if your Concentration is broken).',
    ].join('\n\n')],
  ].map(([level, name, description], index) => Object.freeze({
    draft_item_uuid: itemUuid(`bundled-barbed-v2-feature-${String(index + 1)}`),
    class_level: level as CharacterLevel,
    name: String(name),
    description: String(description),
    effects: name === 'Warding Image'
      ? Object.freeze([Object.freeze({
          kind: 'armor_class_bonus' as const,
          draft_item_uuid: itemUuid('bundled-barbed-v2-warding-image-ac'),
          label: 'Warding Image',
          notes: null,
          amount: 2,
        })])
      : Object.freeze([]),
  })),
});

const barbedCourtV3: SubclassAuthoringDraft = Object.freeze<SubclassAuthoringDraft>({
  ...barbedCourtV2,
  progression: barbedCourtV2.progression.mode === 'override'
    ? Object.freeze({
        ...barbedCourtV2.progression,
        rows: Object.freeze(barbedCourtV2.progression.rows.map((row) => Object.freeze({
          ...row,
          grants: Object.freeze(row.grants.map((grant) =>
            grant.kind === 'choice_from_list' &&
              grant.rule_key === 'barbed-court-prepared-spells'
              ? Object.freeze({ ...grant, bucket: 'prepared' as const })
              : grant)),
        }))),
      })
    : barbedCourtV2.progression,
});

const barbedCourtV4: SubclassAuthoringDraft = Object.freeze<SubclassAuthoringDraft>({
  ...barbedCourtV3,
  features: Object.freeze(barbedCourtV3.features.map((feature) =>
    feature.name === 'Hands of the Barbed Court'
      ? Object.freeze({
          ...feature,
          description: [
            'As a Bonus Action, you can spend 4 Focus Points to manifest the full court — a 15-foot Emanation of invisible slapping hands — for up to 10 minutes. The effect requires Concentration. While the court is manifested, when you hit a creature in the Emanation with an attack, the hands add Psychic damage equal to your Wisdom modifier to the hit.',
            'The hands also hold what you seize: while the court is manifested, you can grapple creatures up to two sizes larger than you (one size beyond the usual limit).',
            'At Monk level 17 the court matures: the hands\' extra damage increases to twice your Wisdom modifier, and the court guides your aim — you have Advantage on attack rolls against creatures in the Emanation.',
          ].join('\n\n'),
        })
      : feature)),
});

const barbedCourtV5: SubclassAuthoringDraft = Object.freeze<SubclassAuthoringDraft>({
  ...barbedCourtV4,
  features: Object.freeze(barbedCourtV4.features.filter((feature) =>
    feature.name !== 'Innate Sorcery of the Court' &&
      feature.name !== 'Unshaken Aim').map((feature) =>
    feature.name === 'Hands of the Barbed Court'
      ? Object.freeze({
          ...feature,
          description: [
            'As a Bonus Action, you can spend 4 Focus Points to manifest the full court — a 15-foot Emanation of invisible slapping hands — for up to 10 minutes. The effect requires Concentration. While the court is manifested, when you hit a creature in the Emanation with an attack, the hands add Psychic damage equal to your Wisdom modifier to the hit.',
            'At Monk level 17 the court matures: the hands\' extra damage increases to twice your Wisdom modifier, and the court guides your aim — you have Advantage on attack rolls against creatures in the Emanation.',
          ].join('\n\n'),
        })
      : feature.name === 'The Standing Hand'
      ? Object.freeze({
          ...feature,
          description: [
            'When you cast Mage Hand, its duration is 8 hours, and the hand can deliver your insults — a goad\'s slap, sneer, or gesture can visibly come from the hand. While your Mage Hand is present, the Unarmed Strikes you make as part of the Attack action have a reach of 10 feet, delivered by the hand.',
            'The hand also holds what you seize: while your Mage Hand is present, you can grapple creatures up to two sizes larger than you (one size beyond the usual limit).',
          ].join('\n\n'),
        })
      : feature.name === "Courtier's Slap"
      ? Object.freeze({
          ...feature,
          description: [
            'Once on each of your turns when you take the Attack action, you can also have a spectral hand appear and make an unarmed strike against one creature within 10 feet of you as part of that action; the hand then vanishes. On a hit, the target takes Psychic damage equal to one roll of your Martial Arts die + your Wisdom modifier, and its Speed is reduced by 10 feet until the start of your next turn.',
            'The slap works whether or not your Mage Hand is present and doesn\'t require your Bonus Action.',
          ].join('\n\n'),
        })
      : feature)),
});

function spellStudentRevision(
  explicitSpellLevels: boolean,
): SubclassAuthoringDraft {
  return Object.freeze<SubclassAuthoringDraft>({
    kind: 'subclass',
    document_version: 1,
    name: 'Spell Student',
    rules_edition: '2024',
    reference_text: 'A Spell Student learns a small amount of practical magic alongside martial training.',
    parent_class_content_key: '2024:class:fighter' as ContentKey,
    progression: {
      mode: 'override',
      spellcasting_ability: 'intelligence',
      caster_contribution: 'third_down',
      rows: thirdCasterRows({
        cantripsKnown: (level) => level < 3 ? 0 : level < 11 ? 1 : 2,
        // Owner-authored choice: one spell at 3, then one more every four levels.
        spellsKnown: (level) => level < 3 ? 0 : 1 + Math.floor((level - 3) / 4),
        grants: (level) => {
          if (level < 3) return [];
          const cantrips = level < 11 ? 1 : 2;
          const spells = 1 + Math.floor((level - 3) / 4);
          const spellLevel = maximumSpellLevel(deriveThirdCasterSlotCounts(level));
          return [
            spellStudentChoiceGrant(
              level,
              'cantrips',
              cantrips,
              0,
              explicitSpellLevels ? 0 : undefined,
            ),
            spellStudentChoiceGrant(
              level,
              'spells',
              spells,
              spellLevel,
              explicitSpellLevels ? 1 : undefined,
            ),
          ];
        },
      }),
    },
    features: [{
      draft_item_uuid: itemUuid('bundled-spell-student-feature-1'),
      class_level: 3,
      name: 'Basic Spellcasting',
      description: 'You learn a limited selection of spells and cast them using Intelligence.',
      effects: Object.freeze([]),
    }],
  });
}

// The first revision remains byte-exact registry history. The second fixes the
// declared one-cantrip-plus-one-leveled-spell progression without rewriting an
// already-installed user's immutable content.
const spellStudentV1 = spellStudentRevision(false);
const spellStudentV2 = spellStudentRevision(true);

function lightweightTestMechanicsSubclass(input: {
  readonly fixtureKey: string;
  readonly name: string;
  readonly parentClassKey: ContentKey;
  readonly referenceText: string;
  readonly features: readonly Omit<
    SubclassAuthoringDraftFeature,
    'draft_item_uuid'
  >[];
}): SubclassAuthoringDraft {
  return Object.freeze<SubclassAuthoringDraft>({
    kind: 'subclass',
    document_version: 1,
    name: input.name,
    rules_edition: '2024',
    reference_text: input.referenceText,
    parent_class_content_key: input.parentClassKey,
    progression: { mode: 'inherit_parent' },
    features: Object.freeze(input.features.map((feature, index) => Object.freeze({
      ...feature,
      draft_item_uuid: itemUuid(
        `bundled-${input.fixtureKey}-feature-${String(index + 1)}`,
      ),
    }))),
  });
}

const longGrudgeV1 = lightweightTestMechanicsSubclass({
  fixtureKey: 'long-grudge',
  name: 'Oath of the Long Grudge',
  parentClassKey: '2024:class:paladin' as ContentKey,
  referenceText: 'A compact, UI-hidden mechanics fixture, not a complete subclass schedule. Level 5 is the first validated snapshot; it does not establish the original acquisition level.',
  features: [{
    class_level: 5,
    name: 'Long Grudge',
    description: 'The fixture tracks one bonded target. Once on each of your turns, the first qualifying hit against that target deals one extra damage die: d6 at level 5, d8 at level 11, and d10 at level 17. A critical hit doubles the rider dice. Bond application, lifetime, damage type, and attack restrictions are intentionally unspecified.',
    effects: Object.freeze([]),
  }],
});

const anchorPointV1 = lightweightTestMechanicsSubclass({
  fixtureKey: 'anchor-point',
  name: 'Anchor Point',
  parentClassKey: '2024:class:fighter' as ContentKey,
  referenceText: 'A compact, UI-hidden subclass carrier for a recovered feat mechanic. This carrier exists because bundled homebrew authoring does not yet publish feats; it does not assert that Anchor Point is a subclass or establish an acquisition level.',
  features: [{
    class_level: 5,
    name: 'Anchor Point',
    description: 'On the first qualifying hit each turn, the target takes a damage rider, has Speed 0, and cannot take reactions for that turn. The rider is 1d8 at levels 5 and 11, then 2d8 at level 17; a critical hit doubles the rider dice. Attack restrictions, damage type, and exact control-effect end timing are intentionally unspecified.',
    effects: Object.freeze([]),
  }],
});

const patientVolleyV1 = lightweightTestMechanicsSubclass({
  fixtureKey: 'patient-volley',
  name: 'Patient Volley',
  parentClassKey: '2024:class:ranger' as ContentKey,
  referenceText: 'A compact, UI-hidden Ranger mechanics fixture. The exact owning content kind and acquisition level are not recovered; level 5 is only the first validated snapshot.',
  features: [{
    class_level: 5,
    name: 'Patient Volley',
    description: 'The rider is eligible against a target that has not acted on the first turn, or when the attacker hit on the immediately preceding turn. On an eligible turn, the first qualifying hit deals the rider once: 1d8 at level 5 and 2d8 at levels 11 and 17. A critical hit doubles the rider dice. A later turn remembers whether any attack hit on the preceding turn, even if that turn was ineligible.',
    effects: Object.freeze([]),
  }],
});

const cuttingChorusV1 = lightweightTestMechanicsSubclass({
  fixtureKey: 'cutting-chorus',
  name: 'College of the Cutting Chorus',
  parentClassKey: '2024:class:bard' as ContentKey,
  referenceText: 'A compact, UI-hidden mechanics fixture, not a complete subclass schedule. It intentionally makes no net-damage claim.',
  features: [{
    class_level: 5,
    name: 'Cutting Chorus',
    description: 'Before making an attack roll, you can spend one of your own Inspiration dice and add it to that roll. This fixture permits one self-use per turn at levels 5 and 6 and two per turn at levels 11 and 17. Qualifying attack types and unrecovered replenishment interactions are intentionally unspecified.',
    effects: Object.freeze([]),
  }, {
    class_level: 6,
    name: 'Extra Attack',
    description: 'You can attack twice, instead of once, whenever you take the Attack action on your turn.',
    effects: Object.freeze([Object.freeze({
      kind: 'extra_attack' as const,
      draft_item_uuid: itemUuid('bundled-cutting-chorus-extra-attack'),
      label: 'Cutting Chorus Extra Attack',
      notes: null,
      attack_count: 2,
      weapon_scope: 'any_weapon' as const,
    })]),
  }],
});

function ambushPrimitiveV1(input: {
  readonly fixtureKey: 'vanward-conclave' | 'cold-open';
  readonly name: 'Vanward Conclave' | 'Cold Open';
  readonly parentClassKey: ContentKey;
  readonly dieSize: 'd8' | 'd6';
}): SubclassAuthoringDraft {
  return lightweightTestMechanicsSubclass({
    fixtureKey: input.fixtureKey,
    name: input.name,
    parentClassKey: input.parentClassKey,
    referenceText: 'One of two compact, UI-hidden carriers for the shared Ambush Primitive. Level 5 is the first validated snapshot; this fixture does not supply the remainder of a subclass schedule.',
    features: [{
      class_level: 5,
      name: 'Ambush Primitive',
      description: `Only on the first turn, the first qualifying hit against a target that has not acted deals ${input.dieSize} rider dice. The rider uses one die at level 5, two at level 11, and three at level 17; a critical hit doubles those dice. The primitive is then spent for the combat. Damage type, attack restrictions, reset timing, and initiative ties are intentionally unspecified.`,
      effects: Object.freeze([]),
    }],
  });
}

const vanwardConclaveV1 = ambushPrimitiveV1({
  fixtureKey: 'vanward-conclave',
  name: 'Vanward Conclave',
  parentClassKey: '2024:class:ranger' as ContentKey,
  dieSize: 'd8',
});

const coldOpenV1 = ambushPrimitiveV1({
  fixtureKey: 'cold-open',
  name: 'Cold Open',
  parentClassKey: '2024:class:rogue' as ContentKey,
  dieSize: 'd6',
});

const brokenToothV1 = lightweightTestMechanicsSubclass({
  fixtureKey: 'broken-tooth',
  name: 'Circle of the Broken Tooth',
  parentClassKey: '2024:class:druid' as ContentKey,
  referenceText: 'A compact, UI-hidden Wild Shape package fixture, not a complete subclass schedule. Level 5 is the first validated snapshot and does not establish acquisition timing.',
  features: [{
    class_level: 5,
    name: 'Broken Tooth Form',
    description: 'While this test form is active, it supplies two natural-weapon attacks using Wisdom for the attack and damage rolls. Each attack deals one die plus Wisdom: d8 at level 5, d10 at level 11, and d12 at level 17. Entering the form grants temporary Hit Points equal to Druid level. Action, duration, uses, damage type, and interaction with another form are intentionally unspecified.',
    effects: Object.freeze([]),
  }],
});

const cuttingMomentumV1 = lightweightTestMechanicsSubclass({
  fixtureKey: 'cutting-momentum',
  name: 'Cutting Momentum',
  parentClassKey: '2024:class:fighter' as ContentKey,
  referenceText: 'A compact, UI-hidden Fighter mechanics fixture. The exact owning content kind and acquisition level are not recovered; level 5 is only the first validated snapshot.',
  features: [{
    class_level: 5,
    name: 'Cutting Momentum',
    description: 'The first qualifying hit each turn deals 2 extra damage, increasing to 3 at level 13. If that first hit is a critical hit, later attacks in the same turn score a critical hit on an 18–20 roll. The expanded range ends with that turn. Attack restrictions, damage type, and interactions with other critical-range modifiers are intentionally unspecified.',
    effects: Object.freeze([]),
  }],
});

const brokenTempoV1 = lightweightTestMechanicsSubclass({
  fixtureKey: 'broken-tempo',
  name: 'Discipline of the Broken Tempo',
  parentClassKey: '2024:class:fighter' as ContentKey,
  referenceText: 'A compact, UI-hidden Fighter mechanics fixture. The exact owning content kind and acquisition level are not recovered; level 5 is only the first validated snapshot.',
  features: [{
    class_level: 5,
    name: 'Broken Tempo',
    description: 'The maneuver-die pool has a maximum equal to Proficiency Bonus. Once per turn on a qualifying hit, one die can be spent for extra damage: d6 at level 5, d8 at level 11, and d10 at level 17; a critical hit doubles the spent die. Using Second Wind restores one expended die, and one critical hit per combat can also restore one expended die, each only up to the pool maximum. Normal recovery, damage type, and reset timing are intentionally unspecified.',
    effects: Object.freeze([]),
    contributions: Object.freeze([Object.freeze({
      kind: 'feature_value_contribution' as const,
      draft_item_uuid: itemUuid('bundled-broken-tempo-maneuver-pool'),
      contribution_key: 'maneuver-dice',
      label: 'Maneuver Dice',
      target: Object.freeze({
        kind: 'resource_maximum' as const,
        display_label: 'Maneuver Dice',
        marking_shape: 'remaining' as const,
      }),
      op: 'add' as const,
      active_from_level: 5,
      active_to_level: 20,
      value: Object.freeze({
        kind: 'preserved' as const,
        expression: Object.freeze({
          kind: 'ref' as const,
          source: Object.freeze({ kind: 'proficiency_bonus' as const }),
        }),
      }),
      supersedes_contribution_key: null,
    })]),
  }],
});

export const BUNDLED_HOMEBREW_CATALOG = Object.freeze([
  Object.freeze({
    catalog_key: 'veteran',
    visibility: 'listed',
    revisions: Object.freeze([veteranV1, veteranV2, veteranV3] as const),
  }),
  Object.freeze({
    catalog_key: 'warrior-of-the-barbed-court',
    visibility: 'listed',
    revisions: Object.freeze([barbedCourtV1, barbedCourtV2, barbedCourtV3, barbedCourtV4, barbedCourtV5] as const),
  }),
  Object.freeze({
    catalog_key: 'spell-student',
    visibility: 'listed',
    revisions: Object.freeze([spellStudentV1, spellStudentV2] as const),
  }),
  Object.freeze({
    catalog_key: 'long-grudge',
    visibility: 'ui_hidden',
    revisions: Object.freeze([longGrudgeV1] as const),
  }),
  Object.freeze({
    catalog_key: 'anchor-point',
    visibility: 'ui_hidden',
    revisions: Object.freeze([anchorPointV1] as const),
  }),
  Object.freeze({
    catalog_key: 'patient-volley',
    visibility: 'ui_hidden',
    revisions: Object.freeze([patientVolleyV1] as const),
  }),
  Object.freeze({
    catalog_key: 'cutting-chorus',
    visibility: 'ui_hidden',
    revisions: Object.freeze([cuttingChorusV1] as const),
  }),
  Object.freeze({
    catalog_key: 'vanward-conclave',
    visibility: 'ui_hidden',
    revisions: Object.freeze([vanwardConclaveV1] as const),
  }),
  Object.freeze({
    catalog_key: 'cold-open',
    visibility: 'ui_hidden',
    revisions: Object.freeze([coldOpenV1] as const),
  }),
  Object.freeze({
    catalog_key: 'broken-tooth',
    visibility: 'ui_hidden',
    revisions: Object.freeze([brokenToothV1] as const),
  }),
  Object.freeze({
    catalog_key: 'cutting-momentum',
    visibility: 'ui_hidden',
    revisions: Object.freeze([cuttingMomentumV1] as const),
  }),
  Object.freeze({
    catalog_key: 'broken-tempo',
    visibility: 'ui_hidden',
    revisions: Object.freeze([brokenTempoV1] as const),
  }),
] as const satisfies readonly BundledHomebrewCatalogEntry<SubclassAuthoringDraft>[]);
