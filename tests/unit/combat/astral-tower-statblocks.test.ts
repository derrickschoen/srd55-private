import { describe, expect, it } from 'vitest';
import type { DecodedField, MonsterAction, MonsterDice } from '../../../src/combat/statblock';
import {
  AIR_ELEMENTAL,
  ANIMATED_ARMOR,
  BLACK_PUDDING,
  DOPPELGANGER,
  EARTH_ELEMENTAL,
  GARGOYLE,
  GHOST,
  GIANT_RAT,
  MIMIC,
  ROC,
  STIRGE,
  WILL_O_WISP,
  ASTRALDENDON,
  ASTRALMYCON,
  ANIMATED_BROOM,
  ANIMATED_STATUE,
  FAMILIAR,
  ASTRAL_TOWER_MONSTER_ROSTER,
  ASTRAL_TOWER_UNSUPPORTED_ENTRIES,
} from '../../../src/combat/statblocks/astral-tower';

function required<T>(field: DecodedField<T>, label: string): T {
  if (field.kind === 'absent') throw new Error(`${label} unexpectedly absent: ${field.note}`);
  return field.value;
}

function attack(statblock: { readonly sourceDetails: { readonly actions: DecodedField<readonly MonsterAction[]> } }, id: string) {
  const found = required(statblock.sourceDetails.actions, `${id} actions`).find((action) => action.kind === 'attack' && action.id === id);
  if (found?.kind !== 'attack') throw new Error(`Missing attack ${id}.`);
  return found;
}

function dice(die: MonsterDice): string {
  const modifier = die.modifier === 0 ? '' : die.modifier > 0 ? ` + ${String(die.modifier)}` : ` - ${String(Math.abs(die.modifier))}`;
  return `${String(die.count)}d${String(die.sides)}${modifier}`;
}

describe('Astral Tower SRD 5.2.1 statblocks', () => {
  const sourceOracles = [
    { name: 'Air Elemental', statblock: AIR_ELEMENTAL, armorClass: 15, hitPoints: 90, hitDice: '12d10 + 24', actionId: 'thunderous-slam', attackBonus: 8, damageAverage: 14, damageDice: '2d8 + 5', challenge: 5 },
    { name: 'Animated Armor', statblock: ANIMATED_ARMOR, armorClass: 18, hitPoints: 33, hitDice: '6d8 + 6', actionId: 'slam', attackBonus: 4, damageAverage: 5, damageDice: '1d6 + 2', challenge: 1 },
    { name: 'Black Pudding', statblock: BLACK_PUDDING, armorClass: 7, hitPoints: 68, hitDice: '8d10 + 24', actionId: 'dissolving-pseudopod', attackBonus: 5, damageAverage: 17, damageDice: '4d6 + 3', challenge: 4 },
    { name: 'Doppelganger', statblock: DOPPELGANGER, armorClass: 14, hitPoints: 52, hitDice: '8d8 + 16', actionId: 'slam', attackBonus: 6, damageAverage: 11, damageDice: '2d6 + 4', challenge: 3 },
    { name: 'Earth Elemental', statblock: EARTH_ELEMENTAL, armorClass: 17, hitPoints: 147, hitDice: '14d10 + 70', actionId: 'slam', attackBonus: 8, damageAverage: 14, damageDice: '2d8 + 5', challenge: 5 },
    { name: 'Ghost', statblock: GHOST, armorClass: 11, hitPoints: 45, hitDice: '10d8', actionId: 'withering-touch', attackBonus: 5, damageAverage: 19, damageDice: '3d10 + 3', challenge: 4 },
    { name: 'Mimic', statblock: MIMIC, armorClass: 12, hitPoints: 58, hitDice: '9d8 + 18', actionId: 'bite', attackBonus: 5, damageAverage: 7, damageDice: '1d8 + 3', challenge: 2 },
    { name: 'Stirge', statblock: STIRGE, armorClass: 13, hitPoints: 5, hitDice: '2d4', actionId: 'proboscis', attackBonus: 5, damageAverage: 6, damageDice: '1d6 + 3', challenge: '1/8' },
    { name: 'Will-o’-Wisp', statblock: WILL_O_WISP, armorClass: 19, hitPoints: 27, hitDice: '11d4', actionId: 'shock', attackBonus: 4, damageAverage: 11, damageDice: '2d8 + 2', challenge: 2 },
  ] as const;

  for (const oracle of sourceOracles) {
    it(`pins ${oracle.name} load-bearing values copied from the SRD text`, () => {
      const primary = attack(oracle.statblock, oracle.actionId);
      const challenge = required(oracle.statblock.sourceDetails.challenge, `${oracle.name} challenge`);
      expect({
        armorClass: oracle.statblock.armorClass,
        hitPoints: oracle.statblock.hitPointMaximum,
        hitDice: dice(required(oracle.statblock.sourceDetails.hitPointDice, `${oracle.name} Hit Dice`)),
        attackBonus: primary.attackBonus,
        damageAverage: primary.damage[0]?.average,
        damageDice: primary.damage[0] === undefined ? null : dice(primary.damage[0].dice),
        challenge: challenge.rating,
      }).toEqual({
        armorClass: oracle.armorClass,
        hitPoints: oracle.hitPoints,
        hitDice: oracle.hitDice,
        attackBonus: oracle.attackBonus,
        damageAverage: oracle.damageAverage,
        damageDice: oracle.damageDice,
        challenge: oracle.challenge,
      });
    });
  }

  it('pins the Roc combat values and explicitly preserves its out-of-vocabulary CR 11 transcript', () => {
    const beak = attack(ROC, 'beak');
    expect({ armorClass: ROC.armorClass, hitPoints: ROC.hitPointMaximum, hitDice: dice(required(ROC.sourceDetails.hitPointDice, 'Roc Hit Dice')), attackBonus: beak.attackBonus, damageAverage: beak.damage[0]?.average, damageDice: beak.damage[0] === undefined ? null : dice(beak.damage[0].dice) }).toEqual({
      armorClass: 15, hitPoints: 248, hitDice: '16d20 + 80', attackBonus: 13, damageAverage: 28, damageDice: '3d12 + 9',
    });
    expect(ROC.sourceDetails.challenge).toEqual({
      kind: 'absent',
      note: 'The source value is CR 11 (XP 7,200; PB +4), transcribed in ASTRAL_TOWER_UNSUPPORTED_ENTRIES because the shared ChallengeRating type currently ends at CR 6.',
    });
    expect(ASTRAL_TOWER_UNSUPPORTED_ENTRIES).toContainEqual(expect.objectContaining({
      monsterId: 'statblock:roc', category: 'challenge', unsupported: expect.stringContaining('CR 11 (XP 7,200; PB +4)'),
    }));
  });

  it('keeps all twelve requested SRD monsters in the Astral Tower registry family', () => {
    const requested = [AIR_ELEMENTAL, ANIMATED_ARMOR, BLACK_PUDDING, DOPPELGANGER, EARTH_ELEMENTAL, GARGOYLE, GHOST, GIANT_RAT, MIMIC, ROC, STIRGE, WILL_O_WISP];
    expect(ASTRAL_TOWER_MONSTER_ROSTER.filter((row) => row.provenance.kind === 'srd_5_2_1_decoded').map((row) => row.statblock)).toEqual(requested);
  });

  it('mutation control rejects a plausible one-point Ghost HP transcription error', () => {
    const retainedOracle = { armorClass: 11, hitPoints: 45, challenge: 4 };
    const plausibleMutation = { ...retainedOracle, hitPoints: 46 };
    const actual = { armorClass: GHOST.armorClass, hitPoints: GHOST.hitPointMaximum, challenge: required(GHOST.sourceDetails.challenge, 'Ghost challenge').rating };
    expect(actual).toEqual(retainedOracle);
    expect(actual).not.toEqual(plausibleMutation);
  });
});

describe('Astral Tower clean-room homebrew statblocks', () => {
  const homebrew = [ASTRALDENDON, ASTRALMYCON, ANIMATED_BROOM, ANIMATED_STATUE, FAMILIAR] as const;

  it('marks every clean-room block with a homebrew id and original-homebrew provenance', () => {
    for (const statblock of homebrew) {
      expect(statblock.id).toMatch(/^homebrew:escape-the-astral-tower\//);
      expect(statblock.provenance.kind).toBe('original_homebrew');
      if (statblock.provenance.kind !== 'original_homebrew') throw new Error(`${statblock.name} lost clean-room provenance.`);
      expect(statblock.provenance.designNote).toContain('original clean-room homebrew');
      expect(statblock.provenance.designNote).toContain('numeric balance skeleton only');
    }
  });

  it('keeps each authored AC, HP, and primary DPR inside its same-CR SRD skeleton bounds', () => {
    for (const statblock of homebrew) {
      if (statblock.provenance.kind !== 'original_homebrew') throw new Error(`${statblock.name} lost clean-room provenance.`);
      const anchor = statblock.provenance.comparableAnchors[0];
      if (anchor === undefined) throw new Error(`${statblock.name} has no numeric skeleton.`);
      const primary = required(statblock.sourceDetails.actions, `${statblock.name} actions`).find((action) => action.kind === 'attack');
      if (primary?.kind !== 'attack') throw new Error(`${statblock.name} has no primary attack.`);
      const attacksPerAction = statblock.attacksPerAction;
      const primaryDpr = primary.damage.reduce((total, term) => total + term.average, 0) * attacksPerAction;
      expect(statblock.armorClass, `${statblock.name} AC`).toBeGreaterThanOrEqual(anchor.allowedArmorClass[0]);
      expect(statblock.armorClass, `${statblock.name} AC`).toBeLessThanOrEqual(anchor.allowedArmorClass[1]);
      expect(statblock.hitPointMaximum, `${statblock.name} HP`).toBeGreaterThanOrEqual(anchor.allowedHitPoints[0]);
      expect(statblock.hitPointMaximum, `${statblock.name} HP`).toBeLessThanOrEqual(anchor.allowedHitPoints[1]);
      expect(primaryDpr, `${statblock.name} DPR`).toBeGreaterThanOrEqual(anchor.allowedDpr[0]);
      expect(primaryDpr, `${statblock.name} DPR`).toBeLessThanOrEqual(anchor.allowedDpr[1]);
    }
  });

  it('matches the mechanical roles visible in the imported fixtures', () => {
    expect(required(ASTRALDENDON.sourceDetails.challenge, 'Astraldendon challenge').rating).toBe('1/8');
    expect(required(ASTRALMYCON.sourceDetails.challenge, 'Astralmycon challenge').rating).toBe('1/8');
    expect(required(ANIMATED_BROOM.sourceDetails.movement, 'Animated Broom movement')).toContainEqual({ kind: 'fly', feet: 40, hover: true });
    expect(ANIMATED_STATUE.hitPointMaximum).toBeGreaterThanOrEqual(40);
    expect(FAMILIAR.hitPointMaximum).toBeLessThanOrEqual(12);
  });
});
