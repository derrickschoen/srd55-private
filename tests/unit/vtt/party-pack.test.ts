import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  externalPartyPackSchema,
  loadExternalPartyPack,
  loadExternalPartyPackBytes,
  type ExternalPartyPack,
} from '../../../src/vtt/party-pack';

function member(index: number): ExternalPartyPack['members'][number] {
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
    spellSlots: index % 2 === 0 ? [] : [{ level: 1, maximum: 4 }],
    attacks: [{
      attackId: `attack:pack-member-${String(index)}`,
      kind: 'melee',
      attackBonus: 6,
      criticalFloor: 20,
      reachFeet: 5,
      rangeFeet: 5,
      damage: [{ damageTypeId: 'Slashing', count: 1, sides: 8, modifier: 3 }],
    }],
    spellSelections: index % 2 === 0 ? [] : ['fire-bolt'],
    startingConditions: [],
  };
}

function pack(count = 3, allowPartial = false): ExternalPartyPack {
  return externalPartyPackSchema.parse({
    schemaVersion: 1,
    partyId: 'party:generic-soak-fixture',
    allowPartial,
    members: Array.from({ length: count }, (_value, index) => member(index + 1)),
  });
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
          .toEqual(candidate.members.flatMap((entry) => entry.spellSelections));
      }
    }
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
      type: 'object',
      additionalProperties: false,
      properties: { schemaVersion: { const: 1 } },
    });
  });
});
