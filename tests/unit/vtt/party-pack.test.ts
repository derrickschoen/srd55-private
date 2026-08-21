import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { combatToken } from '../../../src/combat/combatant';
import { createEncounter, reduceEncounter } from '../../../src/combat/encounter';
import {
  externalPartyPackSchema,
  loadExternalPartyPack,
  loadExternalPartyPackBytes,
  loadedPartySpellCastCommand,
  type ExternalPartyPackV1,
  type ExternalPartyPackV2,
} from '../../../src/vtt/party-pack';

function memberBase(index: number): Omit<ExternalPartyPackV2['members'][number], 'spellcasting'> {
  return {
    combatantId: `combatant:pack-member-${String(index)}`,
    tokenId: `token:pack-member-${String(index)}`,
    characterId: 10_000 + index,
    classes: [{ classId: index % 2 === 0 ? 'Fighter' : 'Wizard', level: 7 }],
    abilities: {
      strength: 10 + index,
      dexterity: 12,
      constitution: 14,
      intelligence: 16,
      wisdom: 10,
      charisma: 8,
    },
    armorClass: 15 + index,
    hitPointMaximum: 30 + index,
    walkingSpeedFeet: 30,
    initiativeBonus: 2,
    savingThrowBonuses: {
      strength: 1,
      dexterity: 2,
      constitution: 3,
      intelligence: 4,
      wisdom: 0,
      charisma: -1,
    },
    attacksPerAction: index % 2 === 0 ? 2 : 1,
    attacks: [{
      attackId: `attack:pack-member-${String(index)}`,
      kind: 'melee',
      attackBonus: 6,
      criticalFloor: 20,
      reachFeet: 5,
      rangeFeet: 5,
      damage: [{ damageTypeId: 'Slashing', count: 1, sides: 8, modifier: 3 }],
    }],
    startingConditions: [],
  };
}

function v2Member(index: number): ExternalPartyPackV2['members'][number] {
  return {
    ...memberBase(index),
    ...(index % 2 === 0
      ? {}
      : {
          spellcasting: {
            ability: 'intelligence' as const,
            spellSaveDc: 15,
            spellAttackBonus: 7,
            preparedSpellIds: ['magic-missile'],
            knownSpellIds: ['sacred-flame', 'fire-bolt'],
            spellSlots: [{ level: 1 as const, count: 4, recharge: 'long_rest' as const }],
          },
        }),
  };
}

function pack(count = 3, allowPartial = false): ExternalPartyPackV2 {
  return externalPartyPackSchema.parse({
    schemaVersion: 2,
    partyId: 'party:generic-soak-fixture',
    allowPartial,
    members: Array.from({ length: count }, (_value, index) => v2Member(index + 1)),
  }) as ExternalPartyPackV2;
}

function v1Pack(): ExternalPartyPackV1 {
  return externalPartyPackSchema.parse({
    schemaVersion: 1,
    partyId: 'party:legacy-soak-fixture',
    allowPartial: false,
    members: Array.from({ length: 3 }, (_value, index) => ({
      ...memberBase(index + 1),
      spellSlots: index % 2 === 0 ? [{ level: 1, maximum: 4 }] : [],
      spellSelections: index % 2 === 0 ? ['magic-missile'] : [],
    })),
  }) as ExternalPartyPackV1;
}

describe('external party-pack boundary', () => {
  it('loads generated valid 3-5 member packs into branded combat profiles', () => {
    for (let count = 3; count <= 5; count += 1) {
      for (let sample = 0; sample < 20; sample += 1) {
        const candidate = structuredClone(pack(count));
        candidate.members.forEach((entry, index) => {
          entry.armorClass = 10 + ((sample + index) % 21);
          entry.hitPointMaximum = 1 + sample * 10 + index;
          entry.abilities.strength = 1 + ((sample + index) % 30);
        });
        const result = loadExternalPartyPack(candidate);

        expect(result.status).toBe('loaded');
        if (result.status !== 'loaded') throw new Error('Valid generated pack was refused.');
        expect(result.gaps).toEqual([]);
        expect(result.party.members).toHaveLength(count);
        expect(result.party.members.map((entry) => entry.profile.rules.armorClass)).toEqual(
          candidate.members.map((entry) => entry.armorClass),
        );
        expect(result.party.members.flatMap((entry) => entry.spells.map((spell) => spell.id)))
          .toEqual(candidate.members.flatMap((entry) => [
            ...(entry.spellcasting?.preparedSpellIds ?? []),
            ...(entry.spellcasting?.knownSpellIds ?? []),
          ]));
      }
    }
  });

  it('slots_not_decremented wires a referenced v2 spell through the existing resolver and spends its slot', () => {
    const result = loadExternalPartyPack(pack());
    expect(result.status).toBe('loaded');
    if (result.status !== 'loaded') throw new Error('Valid v2 caster pack was refused.');
    const caster = result.party.members[0]!;
    const target = result.party.members[1]!;
    expect(caster.spellcasting).toMatchObject({
      ability: 'intelligence',
      spellSaveDc: 15,
      spellAttackBonus: 7,
      spellcastingModifier: 3,
      casterLevel: 7,
      spellSlots: [{ level: 1, maximum: 4, recharge: 'long_rest' }],
    });
    let state = createEncounter({
      bounds: { columns: 4, rows: 3 },
      combatants: [caster.profile, target.profile],
      tokens: [
        combatToken(caster.profile, { column: 0, row: 1 }),
        combatToken(target.profile, { column: 1, row: 1 }),
      ],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    const cast = reduceEncounter(state, loadedPartySpellCastCommand(caster, 'magic-missile', {
      slotLevel: 1,
      castAsRitual: false,
      targets: [target.profile.id, target.profile.id, target.profile.id],
      area: null,
      weaponAttack: null,
      selectedOption: null,
    }), () => 0);

    expect(cast.events).toContainEqual(expect.objectContaining({
      type: 'spell_cast',
      caster: caster.profile.id,
      spellId: 'magic-missile',
      slotLevel: 1,
    }));
    expect(cast.state.combatants[0]?.spellSlots).toContainEqual({
      level: 1,
      maximum: 4,
      remaining: 3,
    });
    expect(() => loadedPartySpellCastCommand(caster, 'ray-of-frost', {
      slotLevel: null,
      castAsRitual: false,
      targets: [target.profile.id],
      area: null,
      weaponAttack: null,
      selectedOption: null,
    })).toThrow(expect.objectContaining({ reason: 'spell_not_referenced' }));
  });

  it('pack_spell_save_dc_boundary drives failure below DC and success at DC through encounter resolution', () => {
    const resolveAtD20 = (d20: 12 | 13) => {
      const loaded = loadExternalPartyPack(pack());
      expect(loaded.status).toBe('loaded');
      if (loaded.status !== 'loaded') throw new Error('Valid v2 caster pack was refused.');
      const caster = loaded.party.members[0]!;
      const target = loaded.party.members[1]!;
      let state = createEncounter({
        bounds: { columns: 4, rows: 3 },
        combatants: [caster.profile, target.profile],
        tokens: [
          combatToken(caster.profile, { column: 0, row: 1 }),
          combatToken(target.profile, { column: 1, row: 1 }),
        ],
      });
      state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
      const result = reduceEncounter(state, loadedPartySpellCastCommand(caster, 'sacred-flame', {
        slotLevel: null,
        castAsRitual: false,
        targets: [target.profile.id],
        area: null,
        weaponAttack: null,
        selectedOption: null,
      }), () => (d20 - 1) / 20);
      const save = result.events.find((event) => event.type === 'save_resolved');
      if (save?.type !== 'save_resolved') throw new Error('Sacred Flame emitted no saving throw.');
      return save.save;
    };

    expect(resolveAtD20(12)).toEqual({
      outcome: 'failure',
      roll: { mode: 'normal', faces: [12], chosen: 12 },
      total: 14,
    });
    expect(resolveAtD20(13)).toEqual({
      outcome: 'success',
      roll: { mode: 'normal', faces: [13], chosen: 13 },
      total: 15,
    });
  });

  it('pack_spell_attack_bonus_boundary drives miss below AC and hit at AC through encounter resolution', () => {
    const resolveAtD20 = (d20: 9 | 10) => {
      const loaded = loadExternalPartyPack(pack());
      expect(loaded.status).toBe('loaded');
      if (loaded.status !== 'loaded') throw new Error('Valid v2 caster pack was refused.');
      const caster = loaded.party.members[0]!;
      const target = loaded.party.members[1]!;
      let state = createEncounter({
        bounds: { columns: 4, rows: 3 },
        combatants: [caster.profile, target.profile],
        tokens: [
          combatToken(caster.profile, { column: 0, row: 1 }),
          combatToken(target.profile, { column: 1, row: 1 }),
        ],
      });
      state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
      const result = reduceEncounter(state, loadedPartySpellCastCommand(caster, 'fire-bolt', {
        slotLevel: null,
        castAsRitual: false,
        targets: [target.profile.id],
        area: null,
        weaponAttack: null,
        selectedOption: null,
      }), () => (d20 - 1) / 20);
      const attack = result.events.find((event) => event.type === 'attack_resolved');
      if (attack?.type !== 'attack_resolved') throw new Error('Fire Bolt emitted no attack roll.');
      return attack.attack;
    };

    expect(resolveAtD20(10)).toEqual({
      outcome: 'hit',
      roll: { mode: 'normal', faces: [10], chosen: 10 },
      total: 17,
    });
    expect(resolveAtD20(9)).toEqual({
      outcome: 'miss',
      roll: { mode: 'normal', faces: [9], chosen: 9 },
      total: 16,
    });
  });

  it('unknown_spell_id_dropped refuses an unknown v2 spell id even when partial loading is allowed', () => {
    const candidate = structuredClone(pack(3, true));
    candidate.members[0]!.spellcasting!.preparedSpellIds = ['not-in-the-175-spell-manifest'];

    expect(loadExternalPartyPack(candidate)).toMatchObject({
      status: 'refused',
      refusal: { kind: 'external_party_pack_refusal', reason: 'unknown_spell_id' },
      gaps: [{ engineRefusalReason: 'value_not_in_engine_vocabulary' }],
    });
  });

  it('v1_rejected keeps unchanged v1 packs inside the loader version window', () => {
    const legacy = v1Pack();
    const result = loadExternalPartyPack(legacy);

    expect(result.status).toBe('loaded');
    if (result.status !== 'loaded') throw new Error('Legacy v1 pack was refused.');
    expect(result.party.pack).toEqual(legacy);
    expect(result.party.members[0]?.spellcasting).toBeNull();
    expect(result.party.members[0]?.profile.rules.spellSlots).toEqual([{ level: 1, maximum: 4 }]);
    expect(result.party.members[0]?.spells.map((spell) => spell.id)).toEqual(['magic-missile']);
  });

  it('gap_report_swallowed reports and strips every out-of-vocabulary feature', () => {
    const candidate = structuredClone(pack(3, true)) as unknown as {
      members: Array<Record<string, unknown>>;
    };
    candidate.members[1]!.feature = { kind: 'unmapped-capability', prose: 'must not survive' };
    const result = loadExternalPartyPack(candidate);

    expect(result.status).toBe('loaded');
    if (result.status !== 'loaded') throw new Error('allowPartial pack should retain its mapped party.');
    expect(result.gaps).toContainEqual({
      packEntry: 'combatant:pack-member-2',
      featurePath: 'members.1.feature',
      requestedCapability: 'field:members.1.feature',
      engineRefusalReason: 'field_not_in_engine_vocabulary',
    });
    expect(JSON.stringify(result.party)).not.toContain('unmapped-capability');
    expect(JSON.stringify(result.party)).not.toContain('must not survive');
  });

  it('enforces allowPartial by refusing the whole pack when any gap exists', () => {
    const candidate = structuredClone(pack()) as unknown as {
      members: Array<Record<string, unknown>>;
    };
    candidate.members[0]!.feature = { kind: 'unsupported' };
    const result = loadExternalPartyPack(candidate);

    expect(result).toMatchObject({
      status: 'refused',
      refusal: { kind: 'external_party_pack_refusal', reason: 'gaps_not_allowed' },
      gaps: [{
        packEntry: 'combatant:pack-member-1',
        featurePath: 'members.0.feature',
        engineRefusalReason: 'field_not_in_engine_vocabulary',
      }],
    });
    expect('party' in result).toBe(false);
  });

  it('pack_smuggles_raw_text refuses narration fields and never carries their value forward', () => {
    const candidate = structuredClone(pack(3, true)) as unknown as Record<string, unknown>;
    candidate.narration = 'Imported prose sentinel must never enter a log.';
    const result = loadExternalPartyPack(candidate);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe('loaded');
    expect(result.gaps).toContainEqual(expect.objectContaining({
      featurePath: 'narration',
      engineRefusalReason: 'field_not_in_engine_vocabulary',
    }));
    expect(serialized).not.toContain('Imported prose sentinel');
  });

  it('own_duplicate_engine_id refuses identity collisions even when partial loading is allowed', () => {
    const candidate = structuredClone(pack(3, true));
    candidate.members[1]!.combatantId = candidate.members[0]!.combatantId;
    const result = loadExternalPartyPack(candidate);

    expect(result).toMatchObject({
      status: 'refused',
      refusal: { reason: 'invalid_structure' },
      gaps: [{ featurePath: 'members', engineRefusalReason: 'value_not_in_engine_vocabulary' }],
    });
  });

  it('refuses malformed JSON with a typed report and publishes a closed JSON schema', () => {
    expect(loadExternalPartyPackBytes('{')).toEqual({
      status: 'refused',
      refusal: { kind: 'external_party_pack_refusal', reason: 'invalid_json' },
      gaps: [{
        packEntry: 'party-pack:root',
        featurePath: 'json',
        requestedCapability: 'field:json',
        engineRefusalReason: 'invalid_party_pack_structure',
      }],
    });
    const schema: unknown = JSON.parse(
      readFileSync('docs/specs/external-party-pack.schema.json', 'utf8'),
    );
    expect(schema).toMatchObject({
      oneOf: [
        { properties: { schemaVersion: { const: 1 } } },
        { properties: { schemaVersion: { const: 2 } } },
      ],
    });
  });
});
