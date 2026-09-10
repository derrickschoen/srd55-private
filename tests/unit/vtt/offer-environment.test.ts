import { describe, expect, it } from 'vitest';
import { monsterCombatantProfile } from '../../../src/combat/combatant';
import { createEncounter } from '../../../src/combat/encounter';
import { BANDIT } from '../../../src/combat/statblocks/mercenary-company';
import { combatantId, encounterBranchId, encounterSessionId } from '../../../src/combat/values';
import { canonicalEngineQueryPort, engineActionRegistryForEnvironment } from '../../../src/vtt/engine-query-port';
import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
import {
  createDisabledEngineOfferFamilyPolicy,
  createEngineOptionEnvironment,
  createLegacyEngineOptionEnvironment,
  decodeEngineOptionEnvironmentBinding,
  type EngineOptionEnvironment,
} from '../../../src/vtt/offers/offer-environment';
import { ENGINE_OFFER_CAPABILITIES } from '../../../src/vtt/offers/offer-generator-registry';
import { createPartyThreatCatalog } from '../../../src/vtt/offers/party-threat-catalog';
import {
  createEngineMcpRuntime,
  decodeEngineMcpLauncherManifest,
  reconstructLauncherOfferEnvironment,
  type EngineMcpLauncherManifest,
} from '../../../src/vtt/mcp/entrypoint';
import { placedToken, playerProfile } from '../combat/fixtures';

const EXPECTED_DISABLED_POLICY_DIGEST = 'a1572528052c75afbc8578372ed8307b1a982afc77a1d71b5c908a1b8a5ee28a';
const EXPECTED_UNREPRESENTED_CATALOG_DIGEST = '0a892f9afb0bb2c0a6017de582b6756b1c604e57c816c91682feee1835d12d57';
const EXPECTED_LEGACY_ENVIRONMENT_DIGEST = 'fb1c39f00b4caeea7c5ad92af428132e1f3cb6c44a61a59ba6551d22c90c275b';
const EXPECTED_REPRESENTED_CATALOG_DIGEST = '31cec41a1f02589bb6c653877dc684f18ede160f882cee5f69e39961bde67061';
const EXPECTED_REPRESENTED_ENVIRONMENT_DIGEST = '0fd2d8c790331e2e4bc6a622dda69569607b3d7d5d8b3487e26f8d59aa311074';
const EXPECTED_PARENT_STANDARD_IDS = [
  'option:41:8026ca8a32f777ff915fee76e8cfd22407960121872d013c',
  'option:41:51155a2bdb36fd6034ba73d92ae9da75fe9a819cc648c434',
  'option:41:e1b9aed03111f06f1167f0d6aae4bbb800ac31ca5e187f34',
  'option:41:c93d5934b840c50f12437a00fe29324a4678c99932e6cdd6',
  'option:41:54bc820030b0ca978335e4eaee4c3a7fe40cf02f20ab11d7',
] as const;

function representedEnvironment() {
  const familyPolicy = createDisabledEngineOfferFamilyPolicy();
  const partyThreatCatalog = createPartyThreatCatalog({
    format: 'party-threat-catalog-v1',
    representation: 'represented',
    entries: [{
      attackerId: combatantId('combatant:catalog-cleric'),
      sourceId: 'source:sacred-flame',
      actionId: 'action:sacred-flame',
      targeting: {
        kind: 'direct',
        range: { kind: 'ranged', normalRangeFeet: 60, longRangeFeet: null },
      },
      resolution: { kind: 'saving_throw', ability: 'dexterity' },
    }],
  });
  return createEngineOptionEnvironment({
    queries: canonicalEngineQueryPort,
    mode: 'revision_bound',
    familyPolicy,
    partyThreatCatalog,
  });
}

function launcher(environment: EngineOptionEnvironment): EngineMcpLauncherManifest {
  return {
    format: 'engine-mcp-launcher-v1',
    fixturePath: '/tmp/offers-s2-fixture.json',
    proposalSpoolPath: '/tmp/offers-s2-proposals.jsonl',
    runId: encounterSessionId('encounter:offers-s2'),
    branchId: encounterBranchId('branch:offers-s2'),
    revision: 7,
    requestId: 'request:offers-s2',
    phase: 'initial',
    correctionNumber: 0,
    offerEnvironment: environment.binding,
    room: 1,
    historyKind: 'offers_s2_test',
  };
}

function mutableRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

describe('immutable offer environment', () => {
  it('binds strict family-policy catalog and environment digests to independent expected values', () => {
    const environment = representedEnvironment();
    expect(environment.familyPolicy.digest).toBe(EXPECTED_DISABLED_POLICY_DIGEST);
    expect(environment.partyThreatCatalog.digest).toBe(EXPECTED_REPRESENTED_CATALOG_DIGEST);
    expect(environment.digest).toBe(EXPECTED_REPRESENTED_ENVIRONMENT_DIGEST);
    expect(Object.isFrozen(environment)).toBe(true);
    expect(Object.isFrozen(environment.binding)).toBe(true);
    expect(Object.isFrozen(environment.familyPolicy)).toBe(true);
    expect(Object.isFrozen(environment.partyThreatCatalog.entries)).toBe(true);

    const changedPolicy = structuredClone(environment.binding) as unknown;
    const binding = mutableRecord(changedPolicy, 'offer environment');
    const familyPolicy = mutableRecord(binding['familyPolicy'], 'family policy');
    familyPolicy['helpAttack'] = 'enabled';
    expect(() => decodeEngineOptionEnvironmentBinding(changedPolicy)).toThrow(
      'Engine offer family policy digest is invalid.',
    );
  });

  it('external MCP reconstructs the same immutable environment', () => {
    const environment = representedEnvironment();
    const decoded = decodeEngineMcpLauncherManifest(launcher(environment));
    if (decoded === null) throw new Error('Valid offer-bound launcher was not decoded.');
    const reconstructed = reconstructLauncherOfferEnvironment(decoded);
    expect(reconstructed).not.toBe(environment);
    expect(reconstructed.binding.mode).toBe('revision_bound');
    expect(reconstructed.queries).toBe(canonicalEngineQueryPort);
    expect(reconstructed.binding).toEqual(environment.binding);
    expect(reconstructed.digest).toBe(EXPECTED_REPRESENTED_ENVIRONMENT_DIGEST);

    const actor = monsterCombatantProfile(BANDIT, {
      combatantId: 'combatant:external-environment-bandit',
      tokenId: 'token:external-environment-bandit',
    });
    const target = playerProfile('external-environment-target', { hitPoints: 30 });
    const state = createEncounter({
      bounds: { columns: 8, rows: 3 },
      combatants: [actor, target],
      tokens: [placedToken(actor, 0, 1), placedToken(target, 4, 1)],
    });
    const runtime = createEngineMcpRuntime(state, {
      offerEnvironment: reconstructed,
      revision: 7,
      requestedActorIds: [actor.id],
    });
    expect(runtime.feed.current().offerEnvironment).toEqual(environment.binding);

    const corrupted = structuredClone(launcher(environment)) as unknown;
    const corruptedLauncher = mutableRecord(corrupted, 'launcher');
    const corruptedEnvironment = mutableRecord(corruptedLauncher['offerEnvironment'], 'offer environment');
    const corruptedCatalog = mutableRecord(corruptedEnvironment['partyThreatCatalog'], 'party threat catalog');
    const entries = corruptedCatalog['entries'];
    if (!Array.isArray(entries) || entries.length !== 1) throw new Error('Catalog fixture is malformed.');
    const entry = mutableRecord(entries[0], 'party threat entry');
    entry['sourceId'] = 'source:guiding-bolt';
    expect(() => decodeEngineMcpLauncherManifest(corrupted)).toThrow(
      'Party threat catalog digest is invalid.',
    );
  });

  it('legacy standard ids remain unchanged under explicit legacy environment', () => {
    const environment = createLegacyEngineOptionEnvironment(canonicalEngineQueryPort);
    expect(environment.familyPolicy.digest).toBe(EXPECTED_DISABLED_POLICY_DIGEST);
    expect(environment.partyThreatCatalog.digest).toBe(EXPECTED_UNREPRESENTED_CATALOG_DIGEST);
    expect(environment.digest).toBe(EXPECTED_LEGACY_ENVIRONMENT_DIGEST);

    const launcherWithoutBinding = structuredClone(launcher(representedEnvironment())) as {
      offerEnvironment?: unknown;
    };
    delete launcherWithoutBinding.offerEnvironment;
    expect(() => decodeEngineMcpLauncherManifest(launcherWithoutBinding)).toThrow(
      new TypeError('Engine MCP launcher requires an explicit offer environment binding.'),
    );

    const decodedLegacyLauncher = decodeEngineMcpLauncherManifest(launcher(environment));
    if (decodedLegacyLauncher === null) throw new Error('Valid legacy launcher was not decoded.');
    const reconstructedLegacy = reconstructLauncherOfferEnvironment(decodedLegacyLauncher);
    expect(reconstructedLegacy.binding.mode).toBe('legacy_standard');
    expect(reconstructedLegacy.partyThreatCatalog.representation).toBe('unrepresented');
    expect(reconstructedLegacy.digest).toBe(EXPECTED_LEGACY_ENVIRONMENT_DIGEST);
    expect(Object.isFrozen(reconstructedLegacy.binding)).toBe(true);

    const actor = monsterCombatantProfile(BANDIT, {
      combatantId: 'combatant:standard-generator-bandit',
      tokenId: 'token:standard-generator-bandit',
    });
    const target = playerProfile('standard-generator-target', { hitPoints: 200 });
    const state = freshMonsterPlanningState(createEncounter({
      bounds: { columns: 20, rows: 5 },
      combatants: [actor, target],
      tokens: [placedToken(actor, 0, 2), placedToken(target, 5, 2)],
    }));
    const options = engineActionRegistryForEnvironment(state, environment, 41).optionsFor(actor.id);
    expect(options.map((option) => option.optionId)).toEqual(EXPECTED_PARENT_STANDARD_IDS);
    expect(JSON.stringify(options)).not.toContain('offerEnvironment');
    expect(JSON.stringify(options)).not.toContain('binding');
    expect(ENGINE_OFFER_CAPABILITIES.map((capability) => capability.kind)).toEqual(['standard']);
  });
});
