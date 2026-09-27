import { describe, expect, it } from 'vitest';
import srdFullText from '../../../docs/srd/full/srd-5.2.1.txt?raw';
import { sha256 } from '../../../src/crypto/sha256';
import { weaponMasteryProperties } from '../../../src/domain/enums';
import {
  sourcedNotExecutedMastery,
  toppleSaveDc,
  WEAPON_MASTERY_CAPABILITY_OWNER,
  WEAPON_MASTERY_STATUS,
} from '../../../src/rules/weapon-mastery-status';

const srdLines = srdFullText.split('\n');

function spanLines(span: string): readonly string[] {
  const match = /^docs\/srd\/full\/srd-5\.2\.1\.txt:(\d+)-(\d+)$/u.exec(span);
  if (match === null) throw new Error(`Not a full-SRD span: ${span}`);
  return srdLines.slice(Number(match[1]) - 1, Number(match[2]));
}

describe('weapon mastery status (rule H: hand-typed from cited spans)', () => {
  it('gives every mastery property exactly one status', () => {
    expect(Object.keys(WEAPON_MASTERY_STATUS).sort()).toEqual([...weaponMasteryProperties].sort());
  });

  it('executes exactly Slow and Topple, the engine attack command\'s two riders', () => {
    // src/combat/events.ts attack `weaponMastery`: { property: 'Slow' } | { property: 'Topple'; saveDc }.
    expect(Object.entries(WEAPON_MASTERY_STATUS)
      .filter(([, status]) => status.status === 'executed')
      .map(([property]) => property)).toEqual(['Slow', 'Topple']);
    expect(WEAPON_MASTERY_CAPABILITY_OWNER).toEqual({ weapon_mastery_execution: 'WEAPON-EXEC' });
  });

  it('cites each property\'s own definition, whose heading opens the span', () => {
    // The right column of docs/srd/full/srd-5.2.1.txt:5426-5480 prints each
    // property as a heading line followed by its rule text.
    for (const [property, status] of Object.entries(WEAPON_MASTERY_STATUS)) {
      const [heading] = spanLines(status.span);
      expect(heading?.trim().split(/\s{2,}/u).at(-1), property).toBe(property);
    }
  });

  it('pins the cited text, so an edited SRD span forces the statuses to be re-read', () => {
    const pins = Object.fromEntries(Object.entries(WEAPON_MASTERY_STATUS)
      .map(([property, status]) => [property, sha256(spanLines(status.span).join('\n'))]));
    expect(pins).toEqual({
      Cleave: '3f8307d4989d7c7bcf28a003e391fdab5cbd36736e5f73e5294f3d2854f7b613',
      Graze: 'c7332d5e3f93c1ece116fa0e9fc446335b73b5356c7fa60bc32d54229e48c2c2',
      Nick: 'a49a4e265aa6e71df76fc61ea903062aba90bb70c84d7eec10b4952d0f20b709',
      Push: 'c64940b1113508d88866e6dd60d471944c68c3b290ff0a7619f00015322aaf44',
      Sap: '4db7c6ca6180725e2092b67fe1a8a01071c9cb240bdeaf0f5cec3b982aa69d0f',
      Slow: '9768083b5d1f16d5d0c8f53a22c0ed783f426499eb54138b7974f723185527c1',
      Topple: '6c6e6a5cb22141bac3abea506df7227bfd59f5c494e98a6869f9e44f393564b4',
      Vex: '56df68e262a97467c1e18794782e970e83709e64a6f47901fb0bdd38761538cf',
    });
  });

  it('carries a non-executed mastery as sourced, naming the capability it awaits', () => {
    expect(sourcedNotExecutedMastery('Sap')).toEqual({
      property: 'Sap',
      status: 'sourced_not_executed',
      awaiting: 'weapon_mastery_execution',
    });
  });

  it('computes Topple\'s DC from the attack ability modifier and the Proficiency Bonus only', () => {
    // "DC 8 plus the ability modifier used to make the attack roll and your
    // Proficiency Bonus" (the Topple span pinned above). Dex +3 at PB +4: 15.
    expect(toppleSaveDc({ attackAbilityModifier: 3, proficiencyBonus: 4 })).toBe(15);
    // A negative modifier lowers it: Str −1 at PB +2 is 9.
    expect(toppleSaveDc({ attackAbilityModifier: -1, proficiencyBonus: 2 })).toBe(9);
    expect(spanLines(WEAPON_MASTERY_STATUS.Topple.span).join('\n'))
      .toContain('(DC 8 plus the ability modifier used to make the');
  });
});
