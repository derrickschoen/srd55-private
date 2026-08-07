import type {
  HomebrewDraft,
  SubclassAuthoringDraft,
  SubclassAuthoringDraftProgressionRow,
} from './contracts';
import type { HomebrewDraftItemUuid } from './ids';
import type { CharacterLevel } from '../domain/enums';
import type { ContentKey } from '../domain/ids';
import { characterLevels } from '../domain/enums';
import { MULTICLASS_SPELLCASTER_TABLE } from '../rules/spell-slots';
import { officialSpellKey } from '../catalog/catalog-key';

export interface BundledHomebrewCatalogEntry<
  D extends HomebrewDraft = HomebrewDraft,
> {
  /** Stable registry identity; unlike the published content key, it survives revisions. */
  readonly catalog_key: string;
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
  const casterLevel = Math.floor(classLevel / 3);
  return casterLevel === 0 ? zeroSlots() : [...table[casterLevel - 1]!];
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
  readonly grants?: (
    level: CharacterLevel,
  ) => SubclassAuthoringDraftProgressionRow['grants'];
}): readonly SubclassAuthoringDraftProgressionRow[] {
  return characterLevels.map((classLevel) => {
    const slots = deriveThirdCasterSlotCounts(classLevel);
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

const veteran: SubclassAuthoringDraft = Object.freeze<SubclassAuthoringDraft>({
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

const barbedCourt: SubclassAuthoringDraft = Object.freeze<SubclassAuthoringDraft>({
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

const spellStudent: SubclassAuthoringDraft = Object.freeze<SubclassAuthoringDraft>({
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

export const BUNDLED_HOMEBREW_CATALOG = Object.freeze([
  Object.freeze({ catalog_key: 'veteran', revisions: Object.freeze([veteran] as const) }),
  Object.freeze({ catalog_key: 'warrior-of-the-barbed-court', revisions: Object.freeze([barbedCourt] as const) }),
  Object.freeze({ catalog_key: 'spell-student', revisions: Object.freeze([spellStudent] as const) }),
] as const satisfies readonly BundledHomebrewCatalogEntry<SubclassAuthoringDraft>[]);
