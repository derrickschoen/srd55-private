import { SpellAccessBuilder } from '../access/spell-access-builder';
import type { DatabaseContext } from '../db/database';
import {
  abilities,
  creatureSizes,
  damageTypes,
  type Ability,
  type KnownCreatureSize,
  type KnownDamageType,
} from '../domain/enums';
import type { WeaponsPanel } from '../domain/read-models';
import type { AttackProfile, AbilityOption } from '../rules/attack-profiles';
import { AbilityScores } from '../rules/ability-scores';
import { SRD_CLASS_NAMES } from '../rules/class-traits-srd';
import type { SheetResourceMaximum } from '../rules/sheet';
import {
  CharacterSheetBuilder,
  type CharacterSheet,
} from '../queries/character-sheet-builder';
import { WeaponQueries } from '../queries/weapons';
import { SPELL_MANIFEST } from '../combat/spells/manifest';
import type {
  ExternalPartyPackMember,
  ExternalPartyPackV2,
} from './party-pack';

type ExternalPartyPackV2Member = ExternalPartyPackV2['members'][number];
type PartyPackSpellcastingSources = Extract<
  NonNullable<ExternalPartyPackV2Member['spellcasting']>,
  readonly unknown[]
>;
type PartyPackSpellcastingSource = PartyPackSpellcastingSources[number];
type PartyPackSpellSlotLevel = NonNullable<
  ExternalPartyPackV2Member['sharedSpellSlots']
>[number]['level'];
type PartyPackPactSlot = NonNullable<
  ExternalPartyPackV2Member['pactSpellSlots']
>[number];

export interface StoredCharacterPartyPackRefusal {
  readonly kind: 'stored_character_party_pack_refusal';
  /** Stable source/profile field whose required value could not be established. */
  readonly field: string;
  readonly detail: string;
}

export type StoredCharacterPartyPackExport =
  | {
      readonly status: 'exported';
      readonly displayName: string;
      readonly member: ExternalPartyPackMember;
    }
  | {
      readonly status: 'refused';
      readonly refusal: StoredCharacterPartyPackRefusal;
    };

function refused(
  field: string,
  detail: string,
): Extract<StoredCharacterPartyPackExport, { readonly status: 'refused' }> {
  return {
    status: 'refused',
    refusal: { kind: 'stored_character_party_pack_refusal', field, detail },
  };
}

function knownSize(
  sheet: CharacterSheet,
): KnownCreatureSize | null {
  const value = sheet.creature_classification.size;
  return creatureSizes.find((candidate) => candidate === value) ?? null;
}

function knownDamageType(value: string): KnownDamageType | null {
  return damageTypes.find((candidate) => candidate === value) ?? null;
}

function manifestId(name: string): string | null {
  const matches = SPELL_MANIFEST.filter(
    (spell) => spell.name === name && spell.status === 'implemented',
  );
  return matches.length === 1 ? matches[0]?.id ?? null : null;
}

function selectedAbility(
  profile: AttackProfile,
): AbilityOption | null {
  switch (profile.abilities.state) {
    case 'fixed':
    case 'recorded':
      return profile.abilities.options[0] ?? null;
    case 'choice':
    case 'undecided':
    case 'unavailable':
      return null;
  }
}

function dice(value: string): { readonly count: number; readonly sides: 4 | 6 | 8 | 10 | 12 | 20 } | null {
  const match = /^(\d+)d(4|6|8|10|12|20)$/u.exec(value);
  if (match === null) return null;
  const count = Number(match[1]);
  const sides = Number(match[2]);
  if (!Number.isSafeInteger(count) || count < 1) return null;
  if (sides !== 4 && sides !== 6 && sides !== 8 && sides !== 10 && sides !== 12 && sides !== 20) {
    return null;
  }
  return { count, sides };
}

function attacks(
  panel: WeaponsPanel,
):
  | { readonly status: 'exported'; readonly attacks: ExternalPartyPackMember['attacks'] }
  | { readonly status: 'refused'; readonly field: string; readonly detail: string } {
  const exported: ExternalPartyPackMember['attacks'][number][] = [];
  for (const weapon of panel.weapons) {
    const group = panel.attacks.weapons.find((candidate) => candidate.weapon_id === weapon.id);
    const profile = group?.profiles.find((candidate) => candidate.kind === 'normal');
    if (profile === undefined) {
      return {
        status: 'refused',
        field: `attacks.weapon.${String(weapon.id)}.profile`,
        detail: `${weapon.name} has no ordinary attack profile.`,
      };
    }
    const ability = selectedAbility(profile);
    if (ability?.attack_bonus === null || ability === null) {
      return {
        status: 'refused',
        field: `attacks.weapon.${String(weapon.id)}.ability`,
        detail: `${weapon.name} does not establish one attack ability and bonus.`,
      };
    }
    if (profile.damage.amount.kind !== 'dice') {
      return {
        status: 'refused',
        field: `attacks.weapon.${String(weapon.id)}.damage`,
        detail: `${weapon.name} does not have dice damage representable by the party-pack profile.`,
      };
    }
    const parsedDice = dice(profile.damage.amount.dice);
    if (parsedDice === null) {
      return {
        status: 'refused',
        field: `attacks.weapon.${String(weapon.id)}.damage.dice`,
        detail: `${weapon.name} has a damage die outside the combat engine vocabulary.`,
      };
    }
    if (profile.damage.extra.length > 0) {
      return {
        status: 'refused',
        field: `attacks.weapon.${String(weapon.id)}.damage.extra`,
        detail: `${weapon.name} has extra damage the member attack shape cannot preserve.`,
      };
    }
    const damageType = profile.damage.damage_type.state === 'weapon'
      ? knownDamageType(profile.damage.damage_type.damage_type)
      : null;
    if (damageType === null) {
      return {
        status: 'refused',
        field: `attacks.weapon.${String(weapon.id)}.damage.type`,
        detail: `${weapon.name} has no engine-known damage type.`,
      };
    }
    if (weapon.attack_kind === null || weapon.range.kind === 'legacy') {
      return {
        status: 'refused',
        field: `attacks.weapon.${String(weapon.id)}.range`,
        detail: `${weapon.name} has no unambiguous melee/ranged profile.`,
      };
    }
    exported.push({
      attackId: `attack:weapon-${String(weapon.id)}`,
      kind: weapon.attack_kind,
      attackBonus: ability.attack_bonus,
      criticalFloor: 20,
      reachFeet: weapon.reach ? 10 : 5,
      rangeFeet: weapon.range.kind === 'ranged' ? weapon.range.near_feet : 5,
      damage: [{
        damageTypeId: damageType,
        count: parsedDice.count,
        sides: parsedDice.sides,
        modifier: ability.damage_modifier,
      }],
    });
  }
  return { status: 'exported', attacks: exported };
}

function spellSlotPools(
  resources: CharacterSheet['resources'],
):
  | {
      readonly status: 'exported';
      readonly shared: NonNullable<ExternalPartyPackV2Member['sharedSpellSlots']>;
      readonly pact: NonNullable<ExternalPartyPackV2Member['pactSpellSlots']>;
    }
  | { readonly status: 'refused'; readonly field: string; readonly detail: string } {
  const absentProgression = resources.find(
    (resource): resource is Extract<SheetResourceMaximum, { readonly status: 'absent' }> =>
      resource.status === 'absent' && resource.reason === 'spell_progression_missing_or_invalid',
  );
  if (absentProgression !== undefined) {
    return {
      status: 'refused',
      field: 'sharedSpellSlots',
      detail: absentProgression.detail,
    };
  }
  const shared = resources.flatMap((resource) => {
    if (
      resource.status !== 'computed' ||
      resource.kind !== 'spell_slot' ||
      resource.spell_level === null
    ) return [];
    if (resource.spell_level < 1 || resource.spell_level > 9) return [];
    return [{
      level: resource.spell_level as PartyPackSpellSlotLevel,
      count: resource.maximum,
      recharge: 'long_rest' as const,
    }];
  });
  const pact: PartyPackPactSlot[] = resources.flatMap((resource) => {
    if (
      resource.status !== 'computed' ||
      resource.kind !== 'pact_slot' ||
      resource.spell_level === null ||
      resource.spell_level < 1 ||
      resource.spell_level > 9
    ) return [];
    return [{
      level: resource.spell_level as PartyPackSpellSlotLevel,
      count: resource.maximum,
      recharge: 'short_rest' as const,
    }];
  });
  return { status: 'exported', shared, pact };
}

function spellcasting(
  sheet: CharacterSheet,
):
  | { readonly status: 'exported'; readonly sources: PartyPackSpellcastingSources }
  | { readonly status: 'refused'; readonly field: string; readonly detail: string } {
  const sources: PartyPackSpellcastingSource[] = [];
  const referenced = new Set<string>();
  for (const [index, group] of sheet.spells.entries()) {
    if (group.spells.length === 0) continue;
    if (group.statistics.length !== 1) {
      return {
        status: 'refused',
        field: `spellcasting.sources.${String(index)}.statistics`,
        detail: 'A castable spell source must establish exactly one spellcasting statistic set.',
      };
    }
    const statistic = group.statistics[0];
    if (statistic?.status !== 'computed') {
      return {
        status: 'refused',
        field: `spellcasting.sources.${String(index)}.ability`,
        detail: statistic?.detail ?? 'The spellcasting ability is absent.',
      };
    }
    const preparedSpellIds: string[] = [];
    const knownSpellIds: string[] = [];
    for (const spell of group.spells) {
      const id = manifestId(spell.name);
      if (id === null) {
        return {
          status: 'refused',
          field: `spellcasting.sources.${String(index)}.spells.${String(spell.spell_version_id)}`,
          detail: `${spell.name} is not a unique implemented combat-manifest spell.`,
        };
      }
      if (referenced.has(id)) {
        return {
          status: 'refused',
          field: `spellcasting.sources.${String(index)}.spells.${String(spell.spell_version_id)}`,
          detail: `${spell.name} is castable from more than one source, which the party-pack command cannot disambiguate.`,
        };
      }
      referenced.add(id);
      (spell.marker === 'prepared' ? preparedSpellIds : knownSpellIds).push(id);
    }
    sources.push({
      ability: statistic.ability,
      spellSaveDc: statistic.save_dc,
      spellAttackBonus: statistic.attack_bonus,
      preparedSpellIds,
      knownSpellIds,
    });
  }
  if (sources.length > 4) {
    return {
      status: 'refused',
      field: 'spellcasting.sources',
      detail: 'The party-pack member format supports at most four spellcasting sources.',
    };
  }
  return { status: 'exported', sources };
}

export function projectStoredCharacterPartyPackMember(
  sheet: CharacterSheet,
  weapons: WeaponsPanel,
): StoredCharacterPartyPackExport {
  const size = knownSize(sheet);
  if (size === null) {
    return refused('sizeCategory', 'The stored species does not establish an engine-known creature size.');
  }
  if (sheet.total_level === null || sheet.classes.length === 0) {
    return refused('classes', 'The character has no class levels.');
  }
  if (sheet.total_level > 20) {
    return refused('classes.totalLevel', 'The total character level is outside 1..20.');
  }
  const classes: ExternalPartyPackMember['classes'][number][] = [];
  const hitDiceBySides = new Map<6 | 8 | 10 | 12, number>();
  for (const [index, heldClass] of sheet.classes.entries()) {
    const classId = SRD_CLASS_NAMES.find((name) => name === heldClass.class_name);
    if (classId === undefined) {
      return refused(
        `classes.${String(index)}.classId`,
        `${heldClass.class_name} is not in the party-pack class vocabulary.`,
      );
    }
    if (heldClass.hit_die === null) {
      return refused(
        `classes.${String(index)}.hitDie`,
        `${heldClass.class_name} has no sourced Hit Point Die.`,
      );
    }
    classes.push({ classId, level: heldClass.level });
    hitDiceBySides.set(
      heldClass.hit_die,
      (hitDiceBySides.get(heldClass.hit_die) ?? 0) + heldClass.level,
    );
  }
  if (sheet.hit_point_maximum.value === null) {
    return refused('hitPointMaximum', 'The sheet Hit Point maximum is undetermined.');
  }
  if (sheet.walking_speed.kind === 'unknown') {
    return refused('walkingSpeedFeet', sheet.walking_speed.detail);
  }
  const savingThrowBonuses = {} as Record<Ability, number>;
  for (const ability of abilities) {
    const save = sheet.saves.find((candidate) => candidate.ability === ability);
    if (save?.value === null || save === undefined) {
      return refused(`savingThrowBonuses.${ability}`, `The ${ability} saving throw is undetermined.`);
    }
    savingThrowBonuses[ability] = save.value;
  }
  if (sheet.attacks_per_action.unresolved.length > 0) {
    return refused('attacksPerAction', 'The sheet has unresolved weapon-scoped Extra Attack grants.');
  }
  if (sheet.unchosen_damage_resistances.length > 0) {
    return refused('passives.damageResponses', 'A damage-resistance type remains unchosen.');
  }
  const damageResponses: Array<{ readonly damageTypeId: KnownDamageType; readonly response: 'resistant' }> = [];
  for (const value of sheet.damage_resistances) {
    const type = knownDamageType(value);
    if (type === null) {
      return refused('passives.damageResponses', `${value} is outside the combat damage-type vocabulary.`);
    }
    damageResponses.push({ damageTypeId: type, response: 'resistant' });
  }
  const exportedAttacks = attacks(weapons);
  if (exportedAttacks.status === 'refused') {
    return refused(exportedAttacks.field, exportedAttacks.detail);
  }
  const exportedSlots = spellSlotPools(sheet.resources);
  if (exportedSlots.status === 'refused') {
    return refused(exportedSlots.field, exportedSlots.detail);
  }
  const exportedSpellcasting = spellcasting(sheet);
  if (exportedSpellcasting.status === 'refused') {
    return refused(exportedSpellcasting.field, exportedSpellcasting.detail);
  }
  if (
    exportedSpellcasting.sources.length === 0 &&
    exportedSlots.shared.length + exportedSlots.pact.length > 0
  ) {
    return refused(
      'spellcasting.sources',
      'The character has spell slots but no selected castable spell source with sheet statistics.',
    );
  }
  const abilityScores = Object.fromEntries(
    sheet.ability_scores.map((score) => [score.ability, score.score]),
  ) as Record<Ability, number>;
  const passiveArmorClassBonus = sheet.armor_class.bonuses.reduce(
    (total, bonus) => total + bonus.amount,
    0,
  );
  const member: ExternalPartyPackV2Member = {
    combatantId: `combatant:character-${String(sheet.character_id)}`,
    tokenId: `token:character-${String(sheet.character_id)}`,
    characterId: sheet.character_id,
    classes,
    abilities: abilityScores,
    armorClass: sheet.armor_class.value - passiveArmorClassBonus,
    hitPointMaximum: sheet.hit_point_maximum.value,
    walkingSpeedFeet: sheet.walking_speed.value,
    initiativeBonus: sheet.initiative.value,
    savingThrowBonuses,
    attacksPerAction: sheet.attacks_per_action.count,
    sizeCategory: size,
    hitDice: [...hitDiceBySides]
      .sort(([left], [right]) => left - right)
      .map(([sides, maximum]) => ({ sides, maximum })),
    attacks: exportedAttacks.attacks,
    startingConditions: [],
    ...(exportedSpellcasting.sources.length === 0
      ? {}
      : {
          spellcasting: exportedSpellcasting.sources,
          sharedSpellSlots: exportedSlots.shared,
          ...(exportedSlots.pact.length === 0 ? {} : { pactSpellSlots: exportedSlots.pact }),
        }),
    ...(passiveArmorClassBonus === 0 && damageResponses.length === 0
      ? {}
      : {
          passives: {
            ...(passiveArmorClassBonus === 0
              ? {}
              : { armorClassBonus: passiveArmorClassBonus }),
            ...(damageResponses.length === 0 ? {} : { damageResponses }),
          },
        }),
  };
  return { status: 'exported', displayName: sheet.name, member };
}

export class StoredCharacterPartyPackExporter {
  constructor(private readonly db: DatabaseContext) {}

  export(characterId: number): StoredCharacterPartyPackExport {
    const sheet = new CharacterSheetBuilder(this.db).build(characterId);
    const scores = AbilityScores.fromArray(Object.fromEntries(
      sheet.ability_scores.map((entry) => [entry.ability, entry.score]),
    ));
    const weaponQueries = new WeaponQueries(this.db);
    const characterWeapons = weaponQueries.characterWeapons(characterId);
    const panel: WeaponsPanel = {
      weapons: characterWeapons,
      templates: [],
      allowance: { state: 'known', count: 0, classes: [] },
      selected_count: 0,
      attacks: weaponQueries.attacks(characterId, characterWeapons, {
        routes: new SpellAccessBuilder(this.db).buildForCharacter(characterId),
        scores,
        proficiency_bonus: sheet.proficiency_bonus.value,
      }),
    };
    return projectStoredCharacterPartyPackMember(sheet, panel);
  }
}
