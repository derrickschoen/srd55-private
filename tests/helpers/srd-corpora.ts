/**
 * EVERY SRD CORPUS IN THE REPOSITORY, AS TEXT, for the tests that read them:
 * the artifact drift tests and the dist scan's per-corpus injection test.
 *
 * Static `?raw` imports, not a directory read, so each corpus is an import-graph
 * dependency of every test that uses this helper and the affected-test runner
 * re-runs those tests when a corpus changes. `srd-artifacts.test.ts` checks
 * that this list is exactly the `.txt` files under `docs/srd/`.
 */
import fullSrd from '../../docs/srd/full/srd-5.2.1.txt?raw';
import abilityScoreGeneration from '../../docs/srd/source/ability-score-generation.txt?raw';
import armorTable from '../../docs/srd/source/armor-table.txt?raw';
import attackClassFeatures from '../../docs/srd/source/attack-class-features.txt?raw';
import backgrounds from '../../docs/srd/source/backgrounds.txt?raw';
import bardSpellList from '../../docs/srd/source/bard-spell-list.txt?raw';
import classCoreTraits from '../../docs/srd/source/class-core-traits.txt?raw';
import classExpertise from '../../docs/srd/source/class-expertise.txt?raw';
import classLevelTables from '../../docs/srd/source/class-level-tables.txt?raw';
import classSpellReplacement from '../../docs/srd/source/class-spell-replacement.txt?raw';
import classStartingEquipment from '../../docs/srd/source/class-starting-equipment.txt?raw';
import clericSpellList from '../../docs/srd/source/cleric-spell-list.txt?raw';
import domainVocabularies from '../../docs/srd/source/domain-vocabularies.txt?raw';
import draconicResilience from '../../docs/srd/source/draconic-resilience.txt?raw';
import druidSpellList from '../../docs/srd/source/druid-spell-list.txt?raw';
import extraAttackOtherSources from '../../docs/srd/source/extra-attack-other-sources.txt?raw';
import feats from '../../docs/srd/source/feats.txt?raw';
import multiclassEntryGrants from '../../docs/srd/source/multiclass-entry-grants.txt?raw';
import multiclassing from '../../docs/srd/source/multiclassing.txt?raw';
import paladinSpellList from '../../docs/srd/source/paladin-spell-list.txt?raw';
import rangerSpellList from '../../docs/srd/source/ranger-spell-list.txt?raw';
import sheetMath from '../../docs/srd/source/sheet-math.txt?raw';
import skillsTable from '../../docs/srd/source/skills-table.txt?raw';
import sorcererSpellList from '../../docs/srd/source/sorcerer-spell-list.txt?raw';
import speciesDescriptions from '../../docs/srd/source/species-descriptions.txt?raw';
import spellDescriptions from '../../docs/srd/source/spell-descriptions.txt?raw';
import subclasses from '../../docs/srd/source/subclasses.txt?raw';
import unarmoredDefense from '../../docs/srd/source/unarmored-defense.txt?raw';
import warlockSpellList from '../../docs/srd/source/warlock-spell-list.txt?raw';
import weaponAttackCantrips from '../../docs/srd/source/weapon-attack-cantrips.txt?raw';
import weaponMasteryFlatClasses from '../../docs/srd/source/weapon-mastery-flat-classes.txt?raw';
import weaponMasteryProgression from '../../docs/srd/source/weapon-mastery-progression.txt?raw';
import weaponsTable from '../../docs/srd/source/weapons-table.txt?raw';
import wizardSpellList from '../../docs/srd/source/wizard-spell-list.txt?raw';
import { srdCorpusTexts, type SrdCorpusReader } from '../../scripts/srd-artifacts';

/** Each corpus's text by its repository-relative path. */
export const SRD_CORPUS_TEXTS: Readonly<Record<string, string>> = {
  'docs/srd/full/srd-5.2.1.txt': fullSrd,
  'docs/srd/source/ability-score-generation.txt': abilityScoreGeneration,
  'docs/srd/source/armor-table.txt': armorTable,
  'docs/srd/source/attack-class-features.txt': attackClassFeatures,
  'docs/srd/source/backgrounds.txt': backgrounds,
  'docs/srd/source/bard-spell-list.txt': bardSpellList,
  'docs/srd/source/class-core-traits.txt': classCoreTraits,
  'docs/srd/source/class-expertise.txt': classExpertise,
  'docs/srd/source/class-level-tables.txt': classLevelTables,
  'docs/srd/source/class-spell-replacement.txt': classSpellReplacement,
  'docs/srd/source/class-starting-equipment.txt': classStartingEquipment,
  'docs/srd/source/cleric-spell-list.txt': clericSpellList,
  'docs/srd/source/domain-vocabularies.txt': domainVocabularies,
  'docs/srd/source/draconic-resilience.txt': draconicResilience,
  'docs/srd/source/druid-spell-list.txt': druidSpellList,
  'docs/srd/source/extra-attack-other-sources.txt': extraAttackOtherSources,
  'docs/srd/source/feats.txt': feats,
  'docs/srd/source/multiclass-entry-grants.txt': multiclassEntryGrants,
  'docs/srd/source/multiclassing.txt': multiclassing,
  'docs/srd/source/paladin-spell-list.txt': paladinSpellList,
  'docs/srd/source/ranger-spell-list.txt': rangerSpellList,
  'docs/srd/source/sheet-math.txt': sheetMath,
  'docs/srd/source/skills-table.txt': skillsTable,
  'docs/srd/source/sorcerer-spell-list.txt': sorcererSpellList,
  'docs/srd/source/species-descriptions.txt': speciesDescriptions,
  'docs/srd/source/spell-descriptions.txt': spellDescriptions,
  'docs/srd/source/subclasses.txt': subclasses,
  'docs/srd/source/unarmored-defense.txt': unarmoredDefense,
  'docs/srd/source/warlock-spell-list.txt': warlockSpellList,
  'docs/srd/source/weapon-attack-cantrips.txt': weaponAttackCantrips,
  'docs/srd/source/weapon-mastery-flat-classes.txt': weaponMasteryFlatClasses,
  'docs/srd/source/weapon-mastery-progression.txt': weaponMasteryProgression,
  'docs/srd/source/weapons-table.txt': weaponsTable,
  'docs/srd/source/wizard-spell-list.txt': wizardSpellList,
};

/** A corpus reader over the committed texts, or over `edits` layered on them. */
export function srdCorpora(
  edits: Readonly<Record<string, string>> = {},
): SrdCorpusReader {
  return srdCorpusTexts({ ...SRD_CORPUS_TEXTS, ...edits });
}
