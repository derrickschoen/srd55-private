import { describe, expect, it } from 'vitest';
import abilityScoreGenerationText from '../../../src/rules/generated/ability-score-generation-srd.ts?raw';
import armorText from '../../../src/rules/generated/armor-srd.ts?raw';
import classChoiceEntitlementsText from '../../../src/rules/generated/class-choice-entitlements-srd.ts?raw';
import classEquipmentText from '../../../src/rules/generated/class-equipment-srd.ts?raw';
import classLevelFeaturesText from '../../../src/rules/generated/class-level-features-srd.ts?raw';
import classResourcesText from '../../../src/rules/generated/class-resources-srd.ts?raw';
import classTraitsText from '../../../src/rules/generated/class-traits-srd.ts?raw';
import draconicResilienceText from '../../../src/rules/generated/draconic-resilience-srd.ts?raw';
import extraAttackText from '../../../src/rules/generated/extra-attack-srd.ts?raw';
import featsText from '../../../src/rules/generated/feats-srd.ts?raw';
import multiclassEntryText from '../../../src/rules/generated/multiclass-entry-srd.ts?raw';
import originsText from '../../../src/rules/generated/origins-srd.ts?raw';
import skillsText from '../../../src/rules/generated/skills.ts?raw';
import spellsText from '../../../src/rules/generated/spells-srd.ts?raw';
import subclassesText from '../../../src/rules/generated/srd-subclasses.ts?raw';
import unarmoredDefenseText from '../../../src/rules/generated/unarmored-defense-srd.ts?raw';
import weaponsText from '../../../src/rules/generated/weapons-srd.ts?raw';
import coverageSourceText from '../../../src/simulation/generated/coverage-source.ts?raw';
import { BUNDLED_SRD_ABILITY_SCORE_GENERATION } from '../../../src/rules/generated/ability-score-generation-srd';
import { BUNDLED_SRD_ARMOR_TEMPLATES } from '../../../src/rules/generated/armor-srd';
import { BUNDLED_SRD_CLASS_CHOICE_ENTITLEMENTS } from '../../../src/rules/generated/class-choice-entitlements-srd';
import { BUNDLED_SRD_CLASS_EQUIPMENT } from '../../../src/rules/generated/class-equipment-srd';
import { BUNDLED_SRD_CLASS_TRAITS } from '../../../src/rules/generated/class-traits-srd';
import { BUNDLED_SRD_DRACONIC_RESILIENCE } from '../../../src/rules/generated/draconic-resilience-srd';
import { BUNDLED_SRD_NAMED_EXTRA_ATTACK_FEATURES } from '../../../src/rules/generated/extra-attack-srd';
import { BUNDLED_SRD_FEAT_DEFINITIONS } from '../../../src/rules/generated/feats-srd';
import { BUNDLED_SRD_MULTICLASS_ENTRY_GRANTS } from '../../../src/rules/generated/multiclass-entry-srd';
import { BUNDLED_SRD_ORIGINS } from '../../../src/rules/generated/origins-srd';
import { BUNDLED_SRD_SKILL_ABILITIES } from '../../../src/rules/generated/skills';
import { BUNDLED_SRD_SUBCLASS_MANIFEST } from '../../../src/rules/generated/srd-subclasses';
import { BUNDLED_SRD_UNARMORED_DEFENSE_FEATURES } from '../../../src/rules/generated/unarmored-defense-srd';
import { BUNDLED_SRD_WEAPONS } from '../../../src/rules/generated/weapons-srd';
import {
  assertSrdArtifactFresh,
  assertSrdArtifactSourcesPinned,
  SRD_ARTIFACTS,
  SrdArtifactError,
  type SrdArtifact,
} from '../../../scripts/srd-artifacts';
import { srdCorpora, SRD_CORPUS_TEXTS } from '../../helpers/srd-corpora';

/**
 * GENERATION FRESHNESS for every SRD artifact without a dedicated drift test,
 * and THE SOURCE PIN for every artifact.
 *
 * It imports the composer and never the writer, so it cannot make itself pass.
 * For each artifact it proves the committed text is byte for byte what its
 * reader derives from the committed corpora now, and that the literal in it
 * evaluates to exactly the derived value. For every source of every artifact it
 * proves the check fails on a byte change the parse cannot see: a doubled space
 * inside the attribution notice. Before the header pinned each source's sha256,
 * that edit left every artifact byte-identical and every drift test green.
 */
const THIS_TEST = 'tests/unit/tools/srd-artifacts-fresh.test.ts';

const COMMITTED: Readonly<Record<string, string>> = {
  'src/rules/generated/class-level-features-srd.ts': classLevelFeaturesText,
  'src/rules/generated/class-resources-srd.ts': classResourcesText,
  'src/rules/generated/spells-srd.ts': spellsText,
  'src/simulation/generated/coverage-source.ts': coverageSourceText,
  'src/rules/generated/ability-score-generation-srd.ts': abilityScoreGenerationText,
  'src/rules/generated/armor-srd.ts': armorText,
  'src/rules/generated/class-choice-entitlements-srd.ts': classChoiceEntitlementsText,
  'src/rules/generated/class-equipment-srd.ts': classEquipmentText,
  'src/rules/generated/class-traits-srd.ts': classTraitsText,
  'src/rules/generated/draconic-resilience-srd.ts': draconicResilienceText,
  'src/rules/generated/extra-attack-srd.ts': extraAttackText,
  'src/rules/generated/feats-srd.ts': featsText,
  'src/rules/generated/multiclass-entry-srd.ts': multiclassEntryText,
  'src/rules/generated/origins-srd.ts': originsText,
  'src/rules/generated/skills.ts': skillsText,
  'src/rules/generated/srd-subclasses.ts': subclassesText,
  'src/rules/generated/unarmored-defense-srd.ts': unarmoredDefenseText,
  'src/rules/generated/weapons-srd.ts': weaponsText,
};

/** The value each artifact module exports, as the runtime imports it. */
const EXPORTED: Readonly<Record<string, unknown>> = {
  'src/rules/generated/ability-score-generation-srd.ts': BUNDLED_SRD_ABILITY_SCORE_GENERATION,
  'src/rules/generated/armor-srd.ts': BUNDLED_SRD_ARMOR_TEMPLATES,
  'src/rules/generated/class-choice-entitlements-srd.ts': BUNDLED_SRD_CLASS_CHOICE_ENTITLEMENTS,
  'src/rules/generated/class-equipment-srd.ts': BUNDLED_SRD_CLASS_EQUIPMENT,
  'src/rules/generated/class-traits-srd.ts': BUNDLED_SRD_CLASS_TRAITS,
  'src/rules/generated/draconic-resilience-srd.ts': BUNDLED_SRD_DRACONIC_RESILIENCE,
  'src/rules/generated/extra-attack-srd.ts': BUNDLED_SRD_NAMED_EXTRA_ATTACK_FEATURES,
  'src/rules/generated/feats-srd.ts': BUNDLED_SRD_FEAT_DEFINITIONS,
  'src/rules/generated/multiclass-entry-srd.ts': BUNDLED_SRD_MULTICLASS_ENTRY_GRANTS,
  'src/rules/generated/origins-srd.ts': BUNDLED_SRD_ORIGINS,
  'src/rules/generated/skills.ts': BUNDLED_SRD_SKILL_ABILITIES,
  'src/rules/generated/srd-subclasses.ts': BUNDLED_SRD_SUBCLASS_MANIFEST,
  'src/rules/generated/unarmored-defense-srd.ts': BUNDLED_SRD_UNARMORED_DEFENSE_FEATURES,
  'src/rules/generated/weapons-srd.ts': BUNDLED_SRD_WEAPONS,
};

const read = srdCorpora();

function committed(artifact: SrdArtifact): string {
  const text = COMMITTED[artifact.path];
  if (text === undefined) {
    throw new Error(`${artifact.path} has no committed text imported here.`);
  }
  return text;
}

const checkedHere = SRD_ARTIFACTS.filter((artifact) => artifact.driftTest === THIS_TEST);

describe('SRD artifacts without a dedicated drift test', () => {
  it('are the fourteen converted in fix round 1, each imported here', () => {
    expect(checkedHere.map((artifact) => artifact.path).sort()).toEqual(
      Object.keys(EXPORTED).sort(),
    );
  });

  describe.each(checkedHere)('$path', (artifact) => {
    it('is byte for byte what its reader derives from the committed corpora', () => {
      expect(() => assertSrdArtifactFresh(artifact, read, committed(artifact))).not.toThrow();
    });

    it('exports a literal that evaluates to exactly the derived value, key order included', () => {
      const derived = artifact.derive(read);
      expect(EXPORTED[artifact.path]).toStrictEqual(derived);
      expect(JSON.stringify(EXPORTED[artifact.path])).toBe(JSON.stringify(derived));
    });
  });
});

/** One byte more, where no reader looks: a doubled space in the attribution notice. */
function invisibleEdit(text: string): string {
  const edited = text.replace('This work includes', 'This  work includes');
  if (edited === text) {
    throw new Error('the corpus has no attribution notice to edit.');
  }
  return edited;
}

describe('every source of every SRD artifact is pinned by its whole-text sha256', () => {
  const pairs = SRD_ARTIFACTS.flatMap((artifact) =>
    artifact.sources.map((source) => ({ artifact, path: artifact.path, source })),
  );

  it('covers every source of every artifact, 36 pairs', () => {
    expect(pairs).toHaveLength(36);
    for (const { source } of pairs) {
      expect(SRD_CORPUS_TEXTS[source], source).toBeDefined();
    }
  });

  it.each(pairs)('$path is stale when $source changes where its reader never looks', ({ artifact, source }) => {
    const edited = srdCorpora({
      [source]: invisibleEdit(SRD_CORPUS_TEXTS[source] as string),
    });
    expect(() => assertSrdArtifactSourcesPinned(artifact, read, committed(artifact))).not.toThrow();
    // The parse cannot see the edit: the derived value is unchanged, so the
    // artifact's data lines would be byte-identical without the pin.
    expect(artifact.derive(edited)).toStrictEqual(artifact.derive(read));
    expect(() => assertSrdArtifactFresh(artifact, edited, committed(artifact))).toThrow(
      SrdArtifactError,
    );
    expect(() => assertSrdArtifactFresh(artifact, edited, committed(artifact))).toThrow(
      `${artifact.path} is stale: ${source} is not the corpus it was generated from`,
    );
  });
});
