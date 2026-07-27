import { spawnSync } from 'node:child_process';
import { execPath } from 'node:process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  sqlVersatileWeaponDamage,
  sqlWeaponDamage,
} from '../../../src/db/codecs';
import {
  migrateLegacyWeaponDamageRow,
  versatileWeaponDamageFromLegacy,
  weaponDamageFromLegacy,
} from '../../../src/domain/weapon-damage';

describe('legacy weapon damage migration', () => {
  it.each([
    ['2d6', { kind: 'dice', dice: '2d6' }],
    ['0', { kind: 'flat', amount: 0 }],
    ['ability modifier + 2', { kind: 'custom', text: 'ability modifier + 2' }],
    [null, { kind: 'not_recorded' }],
  ] as const)('maps %s into its explicit primary case', (legacy, expected) => {
    expect(weaponDamageFromLegacy(legacy)).toEqual(expected);
  });

  it('keeps an unparseable value byte-for-byte as custom text', () => {
    const legacy = '  table roll: d6 + level  ';
    expect(weaponDamageFromLegacy(legacy)).toEqual({
      kind: 'custom',
      text: legacy,
    });
  });

  it('maps a legacy versatile NULL to not_applicable, not unknown or zero', () => {
    expect(versatileWeaponDamageFromLegacy(null)).toEqual({
      kind: 'not_applicable',
    });
  });

  it('migrates a full legacy row without trimming custom text', () => {
    const custom = '  damage from the campaign table  ';
    expect(
      migrateLegacyWeaponDamageRow({
        id: 7,
        damage_dice: custom,
        versatile_damage_dice: null,
      }),
    ).toEqual({
      id: 7,
      damage_kind: 'custom',
      damage_dice: null,
      damage_flat: null,
      damage_custom: custom,
      versatile_damage_kind: 'not_applicable',
      versatile_damage_dice: null,
      versatile_damage_flat: null,
      versatile_damage_custom: null,
    });
  });
});

describe('weapon damage row codecs', () => {
  it.each([
    [
      { damage_kind: 'dice', damage_dice: '2d6' },
      { kind: 'dice', dice: '2d6' },
    ],
    [{ damage_kind: 'flat', damage_flat: 0 }, { kind: 'flat', amount: 0 }],
    [
      { damage_kind: 'custom', damage_custom: 'level + 2' },
      { kind: 'custom', text: 'level + 2' },
    ],
    [{ damage_kind: 'not_recorded' }, { kind: 'not_recorded' }],
  ] as const)(
    'decodes a primary SQL row without reading another case payload',
    (row, expected) => {
      expect(sqlWeaponDamage(row)).toEqual(expected);
    },
  );

  it.each([
    [
      {
        versatile_damage_kind: 'dice',
        versatile_damage_dice: '1d10',
      },
      { kind: 'dice', dice: '1d10' },
    ],
    [
      { versatile_damage_kind: 'flat', versatile_damage_flat: 0 },
      { kind: 'flat', amount: 0 },
    ],
    [
      {
        versatile_damage_kind: 'custom',
        versatile_damage_custom: 'double level',
      },
      { kind: 'custom', text: 'double level' },
    ],
    [{ versatile_damage_kind: 'not_applicable' }, { kind: 'not_applicable' }],
  ] as const)(
    'decodes a versatile SQL row without reading another case payload',
    (row, expected) => {
      expect(sqlVersatileWeaponDamage(row)).toEqual(expected);
    },
  );
});

describe('weapon damage compile-time separation', () => {
  it('rejects every non-applicable payload read', () => {
    const root = fileURLToPath(new URL('../../..', import.meta.url));
    const probe = 'docs/type-probes/weapon-damage.probe.ts';
    const result = spawnSync(
      execPath,
      [
        fileURLToPath(
          new URL(
            '../../../node_modules/typescript/bin/tsc',
            import.meta.url,
          ),
        ),
        '--noEmit',
        '--strict',
        '--target',
        'ES2022',
        '--module',
        'ESNext',
        '--moduleResolution',
        'Bundler',
        '--skipLibCheck',
        probe,
      ],
      { cwd: root, encoding: 'utf8' },
    );
    const output = `${result.stdout}${result.stderr}`;
    expect(result.status).not.toBe(0);
    for (const line of [20, 21, 22, 23, 24]) {
      expect(output).toContain(`weapon-damage.probe.ts(${String(line)},`);
    }
    expect(output.match(/Property 'dice' does not exist/gu)).toHaveLength(3);
    expect(output.match(/Property 'amount' does not exist/gu)).toHaveLength(2);
  });
});
