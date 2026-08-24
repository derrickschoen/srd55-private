import type { Ability, CreatureSize, DamageType } from '../../domain/enums';
import {
  monsterStatblock,
  type ChallengeRating,
  type DecodedField,
  type MonsterAbilityLine,
  type MonsterAction,
  type MonsterDamageTerm,
  type MonsterOnHitEffect,
  type MonsterProvenance,
  type MonsterStatblock,
  type SourceSpan,
} from '../statblock';
import {
  abilityLines,
  baseDetails,
  conditionOnHit,
  damage,
  melee,
  present,
  savingThrowBonuses,
} from './monster-helpers';

export const HOMEBREW_BEAST_NAMESPACE = 'homebrew-beast' as const;

export const HOMEBREW_BEAST_CR_LADDER = ['1/4', '1/2', 1, 2, 3, 4, 5, 6] as const satisfies readonly ChallengeRating[];

export type HomebrewBeastFamily =
  | 'ursine'
  | 'arachnid'
  | 'saurian'
  | 'pterosaur'
  | 'aquatic'
  | 'raptor';

export interface HomebrewSignatureMetric {
  readonly mechanic: string;
  readonly magnitude: number;
  readonly standingInFor: string | null;
}

export interface HomebrewBeastDesignMetadata {
  readonly wildshapeEligible: true;
  readonly family: HomebrewBeastFamily;
  readonly challengeRating: (typeof HOMEBREW_BEAST_CR_LADDER)[number];
  readonly signatureDc: number;
  readonly signatures: readonly HomebrewSignatureMetric[];
  readonly druidLevelEquivalent: 'low-cr-flavor-or-scouting' | 3 | 6 | 9 | 12 | 15 | 18;
  readonly flyUnlock: 'not_applicable' | 'held_until_druid_level_8' | 'available_at_this_cr_step';
  readonly swimUnlock: 'not_applicable' | 'held_until_druid_level_4' | 'available_at_this_cr_step';
  readonly computedDpr: number;
}

type OriginalHomebrewProvenance = Extract<MonsterProvenance, { readonly kind: 'original_homebrew' }>;

export interface HomebrewBeastRosterRow {
  readonly id: `statblock:${typeof HOMEBREW_BEAST_NAMESPACE}/${string}`;
  readonly name: string;
  readonly namespace: typeof HOMEBREW_BEAST_NAMESPACE;
  readonly design: HomebrewBeastDesignMetadata;
  readonly provenance: OriginalHomebrewProvenance;
  readonly statblock: MonsterStatblock & { readonly provenance: OriginalHomebrewProvenance };
}

interface TierAnchor {
  readonly comparableName: string;
  readonly source: SourceSpan;
  readonly armorClass: number;
  readonly hitPoints: number;
  readonly comparableDpr: number;
  readonly allowedDpr: readonly [number, number];
  readonly targetDpr: number;
}

const TIER_ANCHORS = [
  { comparableName: 'Wolf', source: { path: 'docs/srd/full/srd-5.2.1.txt', lineStart: 24033, lineEnd: 24059 }, armorClass: 12, hitPoints: 11, comparableDpr: 5, allowedDpr: [4, 7], targetDpr: 6 },
  { comparableName: 'Black Bear', source: { path: 'docs/srd/full/srd-5.2.1.txt', lineStart: 22727, lineEnd: 22748 }, armorClass: 11, hitPoints: 19, comparableDpr: 10, allowedDpr: [7, 12], targetDpr: 10 },
  { comparableName: 'Brown Bear', source: { path: 'docs/srd/full/srd-5.2.1.txt', lineStart: 22811, lineEnd: 22833 }, armorClass: 11, hitPoints: 22, comparableDpr: 13, allowedDpr: [10, 16], targetDpr: 14 },
  { comparableName: 'Polar Bear', source: { path: 'docs/srd/full/srd-5.2.1.txt', lineStart: 23676, lineEnd: 23696 }, armorClass: 12, hitPoints: 42, comparableDpr: 18, allowedDpr: [14, 22], targetDpr: 19 },
  { comparableName: 'Giant Scorpion', source: { path: 'docs/srd/full/srd-5.2.1.txt', lineStart: 23287, lineEnd: 23312 }, armorClass: 15, hitPoints: 52, comparableDpr: 30, allowedDpr: [24, 34], targetDpr: 30 },
  { comparableName: 'Elephant', source: { path: 'docs/srd/full/srd-5.2.1.txt', lineStart: 22948, lineEnd: 22978 }, armorClass: 12, hitPoints: 76, comparableDpr: 30, allowedDpr: [25, 35], targetDpr: 31 },
  { comparableName: 'Giant Shark', source: { path: 'docs/srd/full/srd-5.2.1.txt', lineStart: 23285, lineEnd: 23310 }, armorClass: 13, hitPoints: 92, comparableDpr: 44, allowedDpr: [36, 48], targetDpr: 44 },
  { comparableName: 'Mammoth', source: { path: 'docs/srd/full/srd-5.2.1.txt', lineStart: 23581, lineEnd: 23602 }, armorClass: 13, hitPoints: 126, comparableDpr: 50, allowedDpr: [44, 56], targetDpr: 50 },
] as const satisfies readonly TierAnchor[];

const EXPERIENCE = [50, 100, 200, 450, 700, 1_100, 1_800, 2_300] as const;
const PROFICIENCY = [2, 2, 2, 2, 2, 2, 3, 3] as const;
const SIGNATURE_DC = [11, 12, 13, 14, 15, 16, 17, 18] as const;
const DRUID_LEVEL = ['low-cr-flavor-or-scouting', 'low-cr-flavor-or-scouting', 3, 6, 9, 12, 15, 18] as const;

const NAMES: Readonly<Record<HomebrewBeastFamily, readonly string[]>> = {
  ursine: ['Brush Bear', 'Cave Bear', 'Stonehide Bear', 'Ironmaw Bear', 'Deepwood Bear', 'Thunder Bear', 'Mountain King Bear', 'Ancient Crag Bear'],
  arachnid: ['Threadling Weaver', 'Ambush Weaver', 'Gloom Weaver', 'Ironweb Weaver', 'Dreadweb Weaver', 'Cavern Weaver', 'Titan Weaver', 'Elder Web Tyrant'],
  saurian: ['Ridge Runner', 'Crested Charger', 'Stonecrest Saurian', 'Thunderfoot Saurian', 'Razorcrest Saurian', 'Ironhorn Saurian', 'Earthshaker Saurian', 'Crownback Saurian'],
  pterosaur: ['Cliff Glider', 'Needlebeak Glider', 'Ridgewing Hunter', 'Stormwing Hunter', 'Razorsail Hunter', 'Skyspear Hunter', 'Tempest Pterosaur', 'Elder Stormsail'],
  aquatic: ['Reef Prowler', 'Kelp Hunter', 'Tide Predator', 'Grappling Cuttle', 'Deepwater Cuttle', 'Abyssal Cuttle', 'Titan Cuttle', 'Elder Trench Cuttle'],
  raptor: ['Brush Hawk', 'Crag Eagle', 'Storm Raptor', 'Harrier Eagle', 'Razortalon Raptor', 'Cloud Raptor', 'Sunblind Raptor', 'Elder Sky Raptor'],
};

const FAMILY_HP: Readonly<Record<HomebrewBeastFamily, readonly number[]>> = {
  ursine: [14, 23, 30, 50, 65, 88, 110, 138],
  arachnid: [9, 16, 23, 38, 50, 68, 88, 118],
  saurian: [11, 19, 25, 43, 55, 78, 100, 132],
  pterosaur: [8, 15, 22, 36, 48, 66, 86, 112],
  aquatic: [12, 20, 27, 45, 58, 80, 102, 134],
  raptor: [8, 15, 21, 35, 47, 65, 84, 110],
};

const FAMILY_AC: Readonly<Record<HomebrewBeastFamily, readonly number[]>> = {
  ursine: [12, 12, 12, 13, 14, 14, 15, 15],
  arachnid: [13, 13, 13, 14, 15, 15, 15, 15],
  saurian: [12, 12, 12, 13, 14, 14, 15, 15],
  pterosaur: [12, 12, 12, 13, 14, 14, 15, 15],
  aquatic: [12, 12, 12, 13, 14, 14, 14, 15],
  raptor: [12, 12, 12, 13, 14, 14, 15, 15],
};

const absent = <T>(note: string): DecodedField<T> => ({ kind: 'absent', note });

function averageDice(average: number): MonsterDamageTerm['dice'] {
  const count = Math.max(1, Math.floor(average / 4));
  return { count, sides: 6, modifier: average - Math.floor(count * 3.5) };
}

function averageDamage(average: number, type: DamageType, trigger: MonsterDamageTerm['trigger'] = { kind: 'always' }): MonsterDamageTerm {
  return { average, dice: averageDice(average), type, trigger };
}

function ongoingSqueeze(average: number): MonsterOnHitEffect {
  return {
    kind: 'condition_bound_ongoing_damage', boundCondition: 'Grappled',
    damage: averageDamage(average, 'Bludgeoning'),
    event: { kind: 'event_trigger', hook: 'target_turn_start', frequency: 'once_per_turn' },
    endsWhen: { kind: 'condition_ends', condition: 'Grappled' },
  };
}

function baseAbilities(index: number): Readonly<Record<Ability, MonsterAbilityLine>> {
  const strength = 12 + index * 2;
  const dexterity = 12 + Math.min(index, 4);
  const constitution = 12 + index;
  return abilityLines(
    [strength, Math.floor((strength - 10) / 2), Math.floor((strength - 10) / 2)],
    [dexterity, Math.floor((dexterity - 10) / 2), Math.floor((dexterity - 10) / 2)],
    [constitution, Math.floor((constitution - 10) / 2), Math.floor((constitution - 10) / 2)],
    [3, -4, -4], [12, 1, 1], [6, -2, -2],
  );
}

function slug(name: string): string {
  return name.toLowerCase().replaceAll(' ', '-');
}

function conditionRider(condition: 'Blinded' | 'Poisoned' | 'Prone', dc: number, trigger: MonsterDamageTerm['trigger'] = { kind: 'always' }): MonsterOnHitEffect {
  return conditionOnHit(condition, null, {
    save: { ability: condition === 'Prone' ? 'strength' : 'constitution', dc },
    duration: 'until_end_of_target_next_turn', trigger,
  });
}

function familyActions(family: HomebrewBeastFamily, index: number, dc: number, targetDpr: number): {
  readonly actions: readonly MonsterAction[];
  readonly bonusActions: DecodedField<readonly import('../statblock').MonsterBonusAction[]>;
  readonly attacksPerAction: number;
  readonly computedDpr: number;
  readonly signatures: readonly HomebrewSignatureMetric[];
} {
  const charge: MonsterDamageTerm['trigger'] = { kind: 'charge', minimumStraightFeet: 20, maximumTargetSize: 'Huge' };
  switch (family) {
    case 'ursine': {
      const squeeze = index + 2;
      const attack = melee('bear-hug', 'Bear Hug', 3 + index, [averageDamage(targetDpr - squeeze, 'Bludgeoning')], [
        conditionOnHit('Grappled', 'Huge', { escapeDc: dc, duration: 'until_escape' }), ongoingSqueeze(squeeze),
      ], 5 + (index >= 4 ? 5 : 0));
      return { actions: [attack], bonusActions: absent('This original beast has no bonus actions.'), attacksPerAction: 1, computedDpr: targetDpr,
        signatures: [{ mechanic: 'bear_hug', magnitude: dc, standingInFor: null }, { mechanic: 'ongoing_squeeze', magnitude: squeeze, standingInFor: null }, { mechanic: 'tank_hit_points', magnitude: FAMILY_HP.ursine[index] ?? 0, standingInFor: null }] };
    }
    case 'arachnid': {
      const poison = index + 1;
      const bite = melee('venom-bite', 'Venom Bite', 3 + index, [averageDamage(targetDpr - poison, 'Piercing'), averageDamage(poison, 'Poison')], [conditionRider('Poisoned', dc)]);
      const web: MonsterAction = { kind: 'saving_throw', id: 'web', name: 'Web', savingThrow: { ability: 'dexterity', dc }, target: { rangeFeet: 30 + index * 5, maximumSize: null, excludedKinds: [] }, failure: { damage: [], effects: [conditionOnHit('Restrained', null, { escapeDc: dc, duration: 'until_escape' })] }, success: { kind: 'none' } };
      return { actions: [bite, web], bonusActions: absent('This original beast has no bonus actions.'), attacksPerAction: 1, computedDpr: targetDpr,
        signatures: [{ mechanic: 'web', magnitude: dc, standingInFor: null }, { mechanic: 'venom', magnitude: poison, standingInFor: null }, { mechanic: 'spider_climb', magnitude: 20 + index * 5, standingInFor: 'web_sense' }] };
    }
    case 'saurian': {
      const count = index < 3 ? 1 : index < 6 ? 2 : 3;
      const chargeDamage = index + 2;
      const perAttack = Math.max(1, Math.floor((targetDpr - chargeDamage) / count));
      const computedDpr = perAttack * count + chargeDamage;
      const gore = melee('crest-gore', 'Crest Gore', 3 + index, [averageDamage(perAttack, 'Piercing'), averageDamage(chargeDamage, 'Piercing', charge)], [conditionRider('Prone', dc, charge)]);
      const actions: readonly MonsterAction[] = count === 1 ? [gore] : [{ kind: 'multiattack', id: 'multiattack', count, actionIds: Array.from({ length: count }, () => 'crest-gore'), combination: 'fixed' }, gore];
      return { actions, bonusActions: absent('This original beast has no bonus actions.'), attacksPerAction: count, computedDpr,
        signatures: [{ mechanic: 'charge_burst', magnitude: chargeDamage, standingInFor: null }, { mechanic: 'charge_prone', magnitude: dc, standingInFor: null }, { mechanic: 'multiattack_growth', magnitude: count, standingInFor: null }] };
    }
    case 'pterosaur': {
      const passDamage = index + 2;
      const beak = melee('raking-pass', 'Raking Pass', 3 + index, [averageDamage(targetDpr - passDamage, 'Piercing'), averageDamage(passDamage, 'Slashing', charge)], [conditionRider('Prone', dc, charge)]);
      return { actions: [beak], bonusActions: present([{ kind: 'nimble_escape', actions: ['Disengage', 'Hide'] }]), attacksPerAction: 1, computedDpr: targetDpr,
        signatures: [{ mechanic: 'fly_speed', magnitude: 30 + index * 5, standingInFor: null }, { mechanic: 'raking_pass', magnitude: passDamage, standingInFor: 'descent_triggered_dive' }, { mechanic: 'nimble_escape', magnitude: 1, standingInFor: 'flyby' }] };
    }
    case 'aquatic': {
      const grapple = index >= 3 ? [conditionOnHit('Grappled', 'Huge', { escapeDc: dc, duration: 'until_escape' })] : [];
      const bite = melee(index >= 3 ? 'tentacle' : 'bite', index >= 3 ? 'Tentacle' : 'Bite', 3 + index, [averageDamage(targetDpr, index >= 3 ? 'Bludgeoning' : 'Piercing')], grapple, 5 + (index >= 3 ? 5 : 0), { kind: 'target_not_full_hit_points' });
      return { actions: [bite], bonusActions: absent('This original beast has no bonus actions.'), attacksPerAction: 1, computedDpr: targetDpr,
        signatures: [{ mechanic: 'swim_speed', magnitude: 30 + index * 5, standingInFor: null }, { mechanic: 'blood_frenzy', magnitude: dc, standingInFor: null }, { mechanic: 'water_breathing', magnitude: 1, standingInFor: null }] };
    }
    case 'raptor': {
      const riders: MonsterOnHitEffect[] = [conditionRider('Prone', dc)];
      if (index >= 4) riders.push(conditionRider('Blinded', dc));
      const rake = melee('talon-rake', 'Talon Rake', 3 + index, [averageDamage(targetDpr, 'Slashing')], riders);
      return { actions: [rake], bonusActions: present([{ kind: 'nimble_escape', actions: ['Disengage', 'Hide'] }]), attacksPerAction: 1, computedDpr: targetDpr,
        signatures: [{ mechanic: 'fly_speed', magnitude: 35 + index * 5, standingInFor: null }, { mechanic: 'talon_rake', magnitude: targetDpr, standingInFor: null }, { mechanic: 'nimble_escape', magnitude: 1, standingInFor: 'flyby' }] };
    }
  }
}

function movements(family: HomebrewBeastFamily, index: number) {
  if (family === 'arachnid') return [{ kind: 'climb' as const, feet: 20 + index * 5, hover: false }];
  if (family === 'pterosaur') return [{ kind: 'fly' as const, feet: 30 + index * 5, hover: false }];
  if (family === 'raptor') return [{ kind: 'fly' as const, feet: 35 + index * 5, hover: false }];
  if (family === 'aquatic') return [{ kind: 'swim' as const, feet: 30 + index * 5, hover: false }];
  return [];
}

function traits(family: HomebrewBeastFamily) {
  switch (family) {
    case 'arachnid': return present([{ kind: 'spider_climb' as const }, { kind: 'web_walker' as const }]);
    case 'aquatic': return present([{ kind: 'water_breathing' as const, onlyUnderwater: true as const }]);
    default: return absent<readonly import('../statblock').MonsterTrait[]>('This original beast has no additional traits.');
  }
}

function originalStatblock(family: HomebrewBeastFamily, index: number): HomebrewBeastRosterRow {
  const anchor = TIER_ANCHORS[index];
  const challengeRating = HOMEBREW_BEAST_CR_LADDER[index];
  const name = NAMES[family][index];
  const hitPoints = FAMILY_HP[family][index];
  const armorClass = FAMILY_AC[family][index];
  const dc = SIGNATURE_DC[index];
  if (anchor === undefined || challengeRating === undefined || name === undefined || hitPoints === undefined || armorClass === undefined || dc === undefined) {
    throw new RangeError(`Incomplete ${family} tier ${String(index)}.`);
  }
  const actionKit = familyActions(family, index, dc, anchor.targetDpr);
  const provenance: OriginalHomebrewProvenance = {
    kind: 'original_homebrew',
    comparableAnchors: [{
      name: anchor.comparableName, source: anchor.source, armorClass: anchor.armorClass, hitPoints: anchor.hitPoints,
      computedDpr: anchor.comparableDpr,
      allowedArmorClass: [Math.max(1, anchor.armorClass - 4), anchor.armorClass + 4],
      allowedHitPoints: [Math.floor(anchor.hitPoints * 0.6), Math.ceil(anchor.hitPoints * 1.35)],
      allowedDpr: anchor.allowedDpr,
    }],
    designNote: `${name} is original clean-room homebrew. Its AC ${String(armorClass)}, HP ${String(hitPoints)}, and computed DPR ${String(actionKit.computedDpr)} are checked against the same-CR ${anchor.comparableName}; the cited SRD span is a balance comparable only, not copied statblock material.`,
  };
  const abilities = baseAbilities(index);
  const walkSpeed = family === 'aquatic' ? 5 : family === 'pterosaur' || family === 'raptor' ? 10 : 30 + index * 2;
  const statblock = monsterStatblock({
    id: `statblock:${HOMEBREW_BEAST_NAMESPACE}/${slug(name)}`, name, armorClass, hitPointMaximum: hitPoints,
    speedFeet: walkSpeed, initiativeBonus: abilities.dexterity.modifier, savingThrowBonuses: savingThrowBonuses(abilities),
    attacksPerAction: actionKit.attacksPerAction, usesDeathSaves: false, provenance,
    sourceDetails: {
      ...baseDetails([anchor.source], { sizes: [index < 2 ? 'Medium' : index < 5 ? 'Large' : 'Huge'], type: 'Beast', subtype: family === 'saurian' || family === 'pterosaur' ? 'Dinosaur' : null, alignment: 'Unaligned' }, { rating: challengeRating, experiencePoints: EXPERIENCE[index] ?? 50, proficiencyBonus: PROFICIENCY[index] ?? 2 }, absent('Original homebrew HP are authored directly rather than decoded from source Hit Dice.'), walkSpeed, abilities, movements(family, index)),
      skills: family === 'raptor' ? present([{ name: 'Perception', bonus: 3 + index }]) : absent('This original beast does not declare skills.'),
      gear: absent('Beasts carry no authored gear.'), senses: present([]), passivePerception: family === 'raptor' ? 13 + index : 11,
      languages: present([]), damageResponses: absent('This original beast has no damage responses.'), conditionImmunities: absent('This original beast has no condition immunities.'),
      traits: traits(family), actions: actionKit.actions, bonusActions: actionKit.bonusActions, reactions: absent('This original beast has no reactions.'),
    },
  });
  const design: HomebrewBeastDesignMetadata = {
    wildshapeEligible: true, family, challengeRating, signatureDc: dc, signatures: actionKit.signatures,
    druidLevelEquivalent: DRUID_LEVEL[index] ?? 'low-cr-flavor-or-scouting',
    flyUnlock: family !== 'pterosaur' && family !== 'raptor' ? 'not_applicable' : index < 3 ? 'held_until_druid_level_8' : 'available_at_this_cr_step',
    swimUnlock: family !== 'aquatic' ? 'not_applicable' : index < 2 ? 'held_until_druid_level_4' : 'available_at_this_cr_step',
    computedDpr: actionKit.computedDpr,
  };
  return {
    id: `statblock:${HOMEBREW_BEAST_NAMESPACE}/${slug(name)}`, name, namespace: HOMEBREW_BEAST_NAMESPACE,
    design, provenance, statblock: { ...statblock, provenance },
  };
}

const FAMILIES = ['ursine', 'arachnid', 'saurian', 'pterosaur', 'aquatic', 'raptor'] as const satisfies readonly HomebrewBeastFamily[];

export const HOMEBREW_BEAST_ROSTER: readonly HomebrewBeastRosterRow[] = FAMILIES.flatMap((family) =>
  HOMEBREW_BEAST_CR_LADDER.map((_, index) => originalStatblock(family, index)));

export const HOMEBREW_BEAST_FAMILY_SIGNATURES: Readonly<Record<HomebrewBeastFamily, readonly string[]>> = {
  ursine: ['bear_hug', 'ongoing_squeeze', 'tank_hit_points'],
  arachnid: ['web', 'venom', 'spider_climb'],
  saurian: ['charge_burst', 'charge_prone', 'multiattack_growth'],
  pterosaur: ['fly_speed', 'raking_pass', 'nimble_escape'],
  aquatic: ['swim_speed', 'blood_frenzy', 'water_breathing'],
  raptor: ['fly_speed', 'talon_rake', 'nimble_escape'],
};
