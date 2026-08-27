import { describe, expect, it } from 'vitest';
import { isAgentEncounterCommandType } from '../../../src/combat/controllers';
import { isSpellManifestId } from '../../../src/combat/spells/manifest';
import { isFeatureEffectKind } from '../../../src/vtt/party-pack';

describe('closed VTT predicates', () => {
  it.each([
    ['attack', true],
    ['world_operation', false],
    ['', false],
    [42, false],
  ] as const)('classifies agent command type %j', (value, expected) => {
    expect(isAgentEncounterCommandType(value)).toBe(expected);
  });

  it.each([
    ['magic-missile', true],
    ['hold-monster', true],
    ['chronomancy-burst', false],
    ['', false],
  ] as const)('classifies manifest spell id %j', (value, expected) => {
    expect(isSpellManifestId(value)).toBe(expected);
  });

  it.each([
    ['damage_operation', true],
    ['persistent_area', true],
    ['homebrew_passthrough_label', false],
    ['', false],
  ] as const)('classifies feature effect kind %j', (value, expected) => {
    expect(isFeatureEffectKind(value)).toBe(expected);
  });
});
