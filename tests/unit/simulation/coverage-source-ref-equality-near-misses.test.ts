import { afterEach, describe, expect, it, vi } from 'vitest';
import { damageType } from '../../../src/domain/enums';
import type {
  CharacterWeaponId,
  ContentKey,
  SourceInstanceId,
} from '../../../src/domain/ids';
import {
  BUNDLED_SRD_5_2_1_PATH,
  positiveDiceCount,
  projectOwnedSourcePath,
  sourceStableKey,
  type AttackDamageInstance,
  type BundledSrdHeading,
  type BundledSrdPath,
  type ProjectOwnedSourcePath,
  type PublicSourceRef,
  type SourceRef,
} from '../../../src/simulation/contracts';
import {
  attackDamageSourcesFailureReason,
  criticalHitHasEvidence,
  publicProbabilityCoverageManifest,
} from '../../../src/simulation/coverage';

/**
 * Near-miss pairs for the two private source-identity comparisons in
 * `src/simulation/coverage.ts`: `samePublicSource` (citation identity) and
 * `sameSourceRef` (effect identity). Both are field-by-field equality
 * functions, so every assertion below is a PAIR that differs in exactly one
 * field — the arm under test — while every other field is held equal. A test
 * that varied two fields at once would still be red for the wrong reason and
 * would not pin the individual comparison.
 *
 * Neither function is exported. `sameSourceRef` is driven through
 * `attackDamageSourcesFailureReason`, which compares each damage instance's
 * source against the attack event's source. `samePublicSource` is driven
 * through `criticalHitHasEvidence`, whose right-hand side is always the
 * reviewed `publicProbabilityCoverageManifest.critical_hit` citation.
 */

const ATTACK_DAMAGE_SOURCE_REASON =
  'Every attack damage instance must use the attack event source; unreviewed rider sources are unavailable.';

function weaponSource(weaponId: number, stableKey: string): SourceRef {
  return {
    kind: 'character_weapon',
    weapon_id: weaponId as CharacterWeaponId,
    stable_key: sourceStableKey(stableKey),
  };
}

function characterSource(instanceId: number, stableKey: string): SourceRef {
  return {
    kind: 'character_source',
    source_instance_id: instanceId as SourceInstanceId,
    stable_key: sourceStableKey(stableKey),
  };
}

function catalogSource(contentKey: string, stableKey: string): SourceRef {
  return {
    kind: 'catalog_content',
    content_key: contentKey as ContentKey,
    stable_key: sourceStableKey(stableKey),
  };
}

/** One well-formed damage instance whose only interesting field is `source`. */
function damageFrom(source: SourceRef): readonly AttackDamageInstance[] {
  return [
    {
      source,
      damage_type: damageType('Fire'),
      components: [
        {
          kind: 'dice',
          pool: { count: positiveDiceCount(1), die: 6 },
          trigger: 'hit',
        },
      ],
    },
  ];
}

describe('sameSourceRef near-miss pairs, through attackDamageSourcesFailureReason', () => {
  it('accepts an equal structural copy of the attack source', () => {
    expect(
      attackDamageSourcesFailureReason(
        weaponSource(1801, 'character-weapon:1801'),
        damageFrom(weaponSource(1801, 'character-weapon:1801')),
      ),
    ).toBeNull();
  });

  it('refuses a damage source whose stable key alone differs', () => {
    // Identical kind and identical weapon_id: only the stable key moves. The
    // arm under test is the `stable_key` half of the leading guard; without it
    // the weapon arm below would report these two sources as the same source.
    expect(
      attackDamageSourcesFailureReason(
        weaponSource(1801, 'character-weapon:1801'),
        damageFrom(weaponSource(1801, 'character-weapon:1801:renamed')),
      ),
    ).toBe(ATTACK_DAMAGE_SOURCE_REASON);
  });

  it('refuses a damage source whose weapon id alone differs', () => {
    // Identical kind and identical stable key: the leading guard passes and the
    // `character_weapon` arm is the only comparison left standing.
    expect(
      attackDamageSourcesFailureReason(
        weaponSource(1801, 'character-weapon:shared-key'),
        damageFrom(weaponSource(1802, 'character-weapon:shared-key')),
      ),
    ).toBe(ATTACK_DAMAGE_SOURCE_REASON);
  });

  it('accepts two catalog sources that agree on kind, stable key and content key', () => {
    expect(
      attackDamageSourcesFailureReason(
        catalogSource('srd-5.2.1:spell:fireball', 'catalog:fireball'),
        damageFrom(catalogSource('srd-5.2.1:spell:fireball', 'catalog:fireball')),
      ),
    ).toBeNull();
  });

  it('refuses a catalog damage source whose content key alone differs', () => {
    // Identical kind and identical stable key: the `catalog_content` arm is the
    // only comparison that can separate these two citations.
    expect(
      attackDamageSourcesFailureReason(
        catalogSource('srd-5.2.1:spell:fireball', 'catalog:shared-key'),
        damageFrom(catalogSource('srd-5.2.1:spell:scorching-ray', 'catalog:shared-key')),
      ),
    ).toBe(ATTACK_DAMAGE_SOURCE_REASON);
  });

  it('accepts two character sources that agree on kind, stable key and instance id', () => {
    expect(
      attackDamageSourcesFailureReason(
        characterSource(31, 'character-source:31'),
        damageFrom(characterSource(31, 'character-source:31')),
      ),
    ).toBeNull();
  });

  it('refuses a character damage source whose source instance id alone differs', () => {
    // Identical kind and identical stable key: the `character_source` arm is
    // the only comparison that can separate these two instances.
    expect(
      attackDamageSourcesFailureReason(
        characterSource(31, 'character-source:shared-key'),
        damageFrom(characterSource(32, 'character-source:shared-key')),
      ),
    ).toBe(ATTACK_DAMAGE_SOURCE_REASON);
  });

  it('refuses a damage source of another kind that reuses the attack stable key', () => {
    // Cross-kind pair with an identical stable key. Documented as a behaviour,
    // not as a mutant kill: the per-kind arms each re-check the right-hand
    // kind, so removing the leading `kind` comparison cannot change this
    // result (see the SKIPPED-EQUIVALENT note in the lane report).
    expect(
      attackDamageSourcesFailureReason(
        weaponSource(1801, 'shared-stable-key'),
        damageFrom(catalogSource('srd-5.2.1:spell:fireball', 'shared-stable-key')),
      ),
    ).toBe(ATTACK_DAMAGE_SOURCE_REASON);
  });
});

describe('samePublicSource near-miss pairs, through criticalHitHasEvidence', () => {
  it('accepts an equal structural copy of the reviewed critical-hit citation', () => {
    const reviewed = publicProbabilityCoverageManifest.critical_hit;
    expect(
      criticalHitHasEvidence({
        kind: 'bundled_srd',
        path: reviewed.path,
        heading: reviewed.heading,
      }),
    ).toBe(true);
  });

  it('refuses a bundled citation whose heading alone differs', () => {
    const reviewed = publicProbabilityCoverageManifest.critical_hit;
    expect(
      criticalHitHasEvidence({
        kind: 'bundled_srd',
        path: reviewed.path,
        heading: 'Critical Hit' as BundledSrdHeading,
      }),
    ).toBe(false);
  });

  it('refuses a project-owned citation in place of the reviewed bundled one', () => {
    // The kind/path guard must return before the tail expression, whose first
    // arm answers `true` for any project-owned left-hand side.
    expect(
      criticalHitHasEvidence({
        kind: 'project_owned',
        path: projectOwnedSourcePath('src/simulation/contracts.ts'),
      }),
    ).toBe(false);
  });
});

/**
 * `snapshotPublicSourceRef` admits exactly one bundled path and two registered
 * project-owned paths, so through the public API a citation's `kind` and its
 * `path` can never disagree: same kind implies same path family, and different
 * kinds imply different paths. That upstream registry is what makes the
 * `kind`/`path` halves of `samePublicSource`'s guard look interchangeable.
 *
 * The comparison itself must not depend on the registry — it is the value
 * identity of a citation, and the registry is free to grow a second bundled
 * path or a project-owned path that shadows one. The block below re-imports
 * coverage with `snapshotPublicSourceRef` replaced by a structurally faithful
 * snapshot that keeps the shape, the field order and the freezing and drops
 * only the path-registry check, which is the one thing standing between these
 * pairs and the comparison under test.
 */
type Contracts = typeof import('../../../src/simulation/contracts');
type Coverage = typeof import('../../../src/simulation/coverage');

const CONTRACTS_PATH = '../../../src/simulation/contracts';

const OTHER_BUNDLED_PATH = 'docs/srd/full/srd-5.1.txt' as BundledSrdPath;

function structuralPublicSourceSnapshot(source: PublicSourceRef): PublicSourceRef {
  return source.kind === 'bundled_srd'
    ? Object.freeze({
        kind: source.kind,
        path: source.path,
        heading: source.heading,
      })
    : Object.freeze({ kind: source.kind, path: source.path });
}

async function importCoverageWithoutPathRegistry(): Promise<Coverage> {
  vi.resetModules();
  vi.doMock(CONTRACTS_PATH, async () => {
    const actual = await vi.importActual<Contracts>(CONTRACTS_PATH);
    return {
      ...actual,
      snapshotPublicSourceRef: structuralPublicSourceSnapshot,
    };
  });
  return await import('../../../src/simulation/coverage');
}

describe('samePublicSource does not lean on the path registry', () => {
  afterEach(() => {
    vi.doUnmock(CONTRACTS_PATH);
    vi.resetModules();
  });

  it('still accepts the reviewed citation when the registry is relaxed', async () => {
    const coverage = await importCoverageWithoutPathRegistry();
    const reviewed = coverage.publicProbabilityCoverageManifest.critical_hit;
    expect(
      coverage.criticalHitHasEvidence({
        kind: 'bundled_srd',
        path: reviewed.path,
        heading: reviewed.heading,
      }),
    ).toBe(true);
  });

  it('refuses a bundled citation whose path alone differs', async () => {
    // Same kind, same heading: only the path moves. Without the `path` half of
    // the guard the tail expression answers `true`, because the right-hand side
    // is bundled and the headings agree.
    const coverage = await importCoverageWithoutPathRegistry();
    const reviewed = coverage.publicProbabilityCoverageManifest.critical_hit;
    expect(
      coverage.criticalHitHasEvidence({
        kind: 'bundled_srd',
        path: OTHER_BUNDLED_PATH,
        heading: reviewed.heading,
      }),
    ).toBe(false);
  });

  it('refuses a project-owned citation that shadows the bundled path', async () => {
    // Same path, different kind — the pair that isolates the `kind` half of the
    // guard. The cast is the point of the fixture: the registry is what
    // normally makes this value unconstructible.
    const coverage = await importCoverageWithoutPathRegistry();
    const reviewed = coverage.publicProbabilityCoverageManifest.critical_hit;
    expect(reviewed.path).toBe(BUNDLED_SRD_5_2_1_PATH);
    expect(
      coverage.criticalHitHasEvidence({
        kind: 'project_owned',
        path: BUNDLED_SRD_5_2_1_PATH as unknown as ProjectOwnedSourcePath,
      }),
    ).toBe(false);
  });
});
