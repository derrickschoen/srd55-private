import { describe, expect, it } from 'vitest';
import fullSrd from '../../../docs/srd/full/srd-5.2.1.txt?raw';
import { srdReadingOrder } from '../../../scripts/srd/srd-columns';
import type { ActionCost } from '../../../src/combat/events';
import type { MonsterSavingThrowMechanic } from '../../../src/combat/statblock';
import type { AreaTemplate } from '../../../src/combat/templates';
import type { Feet as EngineFeet } from '../../../src/combat/values';
import type { ConditionName as EngineConditionName } from '../../../src/combat/conditions';
import type {
  DieSize as PlannerDieSize,
  KnownConditionType,
  KnownDamageType,
  SpellAreaShape,
} from '../../../src/domain/enums';
import {
  AREA_SHAPES,
  CONDITION_NAMES,
  DAMAGE_TYPES,
  DIE_SIZES,
  feet,
  miles,
  parseDiceExpression,
  PER_DAY_USES,
  RECHARGE_MINIMUMS,
  ROUNDS_PER_UNIT,
  SECONDS_PER_ROUND,
  toRounds,
  type AreaShape,
  type ConditionName,
  type DamageType,
  type DieSize,
  type EconomyCost,
  type Feet,
  type RechargeMinimum,
} from '../../../src/domain/srd-vocabulary';
import { SRD_RULE_IDS, SRD_RULE_INDEX, type SrdRuleId } from '../../../src/rules/srd/rule-index';

/**
 * SRD-VOCAB: each closed list is a transcription of a cited SRD span, re-read
 * here from the text; the duplicates the vocabulary replaces are pinned equal
 * to it at compile time until their owning units delete them.
 */

const LINES = fullSrd.split('\n');
const INDEX = SRD_RULE_INDEX as Readonly<Record<SrdRuleId, { readonly kind: string; readonly name: string; readonly spans: readonly string[] }>>;

function namesOfKind(kind: string): string[] {
  return SRD_RULE_IDS.filter((id) => INDEX[id].kind === kind).map((id) => INDEX[id].name);
}

type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;

describe('SRD-VOCAB transcriptions', () => {
  it('a round is the 6 seconds The Order of Combat prints', () => {
    expect(`${LINES[785] ?? ''} ${LINES[786] ?? ''}`).toMatch(/A round\s[\s\S]*represents about 6 seconds in the game world\./);
    expect(SECONDS_PER_ROUND).toBe(6);
    expect(ROUNDS_PER_UNIT).toEqual({ round: 1, minute: 10, hour: 600, day: 14_400 });
    expect(toRounds({ amount: 1, unit: 'minute' })).toBe(10);
    expect(toRounds({ amount: 8, unit: 'hour' })).toBe(4_800);
    expect(toRounds({ amount: 3, unit: 'round' })).toBe(3);
    expect(() => toRounds({ amount: -1, unit: 'minute' })).toThrow(RangeError);
  });

  it('the damage types are the rows of the glossary Damage Types table', () => {
    const rows = srdReadingOrder(fullSrd);
    const spans = INDEX['glossary.damage-types'].spans.map((span) => {
      const match = /:(\d+)-(\d+)@(left|right)$/.exec(span);
      return { from: Number(match?.[1]), to: Number(match?.[2]), column: match?.[3] };
    });
    const printed = rows
      .filter((row) => spans.some(({ from, to, column }) => row.column === column && row.line >= from && row.line <= to))
      .map((row) => /^([A-Z][a-z]+)\s{3,}[A-Z]/.exec(row.text)?.[1])
      .filter((type): type is string => type !== undefined && type !== 'Type');
    expect(printed).toEqual([...DAMAGE_TYPES]);
  });

  it('the conditions and area shapes are the glossary\'s own entries', () => {
    expect([...CONDITION_NAMES]).toEqual(namesOfKind('condition'));
    expect([...AREA_SHAPES]).toEqual(namesOfKind('area_of_effect').map((name) => name.toLowerCase()));
  });

  it('the die sizes, recharge minimums and per-day uses are every one the SRD prints', () => {
    const dice = new Set([...fullSrd.matchAll(/\b\d*d(\d+)\b/g)].map((match) => Number(match[1])));
    expect([...dice].sort((a, b) => a - b)).toEqual([...DIE_SIZES]);
    const recharges = new Set([...fullSrd.matchAll(/Recharge (\d)(?:–6)?\b/g)].map((match) => Number(match[1])));
    expect([...recharges].sort()).toEqual([...RECHARGE_MINIMUMS]);
    const perDay = new Set([...fullSrd.matchAll(/\b(\d)\/Day\b/g)].map((match) => Number(match[1])));
    expect([...perDay].sort()).toEqual([...PER_DAY_USES]);
  });

  it('a free object interaction is the one Interacting with Things grants', () => {
    const text = LINES.slice(795, 804).map((line) => line.slice(55)).join(' ');
    expect(text).toMatch(/interact with\s+one object or feature of the environment for free,\s+during either your move or action/);
  });
});

describe('SRD-VOCAB values', () => {
  it('reads printed dice expressions, and only sizes the SRD prints', () => {
    expect(parseDiceExpression('1d3')).toEqual({ dice: [{ count: 1, sides: 3 }], modifier: 0 });
    expect(parseDiceExpression('2d6 + 3')).toEqual({ dice: [{ count: 2, sides: 6 }], modifier: 3 });
    expect(parseDiceExpression('1d8 + 1d6 − 1')).toEqual({ dice: [{ count: 1, sides: 8 }, { count: 1, sides: 6 }], modifier: -1 });
    expect(parseDiceExpression('1d7')).toBeNull();
    expect(parseDiceExpression('3')).toBeNull();
    expect(parseDiceExpression('1d6 - 1d4')).toBeNull();
  });

  it('refuses a negative or non-finite distance', () => {
    expect(feet(30)).toBe(30);
    expect(miles(24)).toBe(24);
    expect(() => feet(-5)).toThrow(RangeError);
    expect(() => miles(Number.NaN)).toThrow(RangeError);
  });
});

describe('the duplicates SRD-VOCAB replaces', () => {
  it('are the vocabulary itself where they became aliases now', () => {
    const feetIsTheVocabulary: Equal<EngineFeet, Feet> = true;
    const conditionsAreTheVocabulary: Equal<EngineConditionName, ConditionName> = true;
    const knownConditionsAreTheVocabulary: Equal<KnownConditionType, ConditionName> = true;
    const knownDamageTypesAreTheVocabulary: Equal<KnownDamageType, DamageType> = true;
    expect([feetIsTheVocabulary, conditionsAreTheVocabulary, knownConditionsAreTheVocabulary, knownDamageTypesAreTheVocabulary])
      .toEqual([true, true, true, true]);
  });

  it('are pinned equal to it where their owning unit merges them later', () => {
    const templateShapes: Equal<AreaTemplate['shape'], AreaShape> = true;
    const actionCosts: Equal<ActionCost, Exclude<EconomyCost, 'object_interaction'>> = true;
    const statblockRecharges: [Extract<MonsterSavingThrowMechanic, { readonly recharge: unknown }>['recharge']['minimumRoll']] extends [RechargeMinimum] ? true : never = true;
    expect([templateShapes, actionCosts, statblockRecharges]).toEqual([true, true, true]);
  });

  it('differ from it only where an owner decision or a later unit says they do', () => {
    // The planner's owner-chosen dice (D34) lack the d3 the SRD prints 19 times.
    const plannerLacksD3: Equal<Exclude<DieSize, PlannerDieSize>, 3> = true;
    // The database's spell areas have four shapes; the Part A rule asks for six.
    const databaseLacksTwoShapes: Equal<Exclude<AreaShape, SpellAreaShape>, 'cube' | 'emanation'> = true;
    expect([plannerLacksD3, databaseLacksTwoShapes]).toEqual([true, true]);
  });
});
