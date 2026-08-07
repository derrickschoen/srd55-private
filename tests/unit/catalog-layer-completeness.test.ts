import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

/**
 * Read models and wire/UI contracts that can carry names rendered by a route.
 * Longhand is deliberate: widening this boundary is a visible review diff.
 */
const CONTRACT_SOURCES = [
  'src/authoring/contracts.ts',
  'src/builder/background-choices.ts',
  'src/builder/contracts.ts',
  'src/builder/equipment-choices.ts',
  'src/builder/level-up-wizard.ts',
  'src/catalog/catalog-disclosure.ts',
  'src/catalog/content-adoption.ts',
  'src/domain/read-models.ts',
  'src/eligibility/eligible-spell-search.ts',
  'src/queries/character-completeness.ts',
  'src/queries/character-sheet-builder.ts',
  'src/rules/equipment-package-display.ts',
  'src/ui/screens/level-up/planned-choice-steps.ts',
  'src/ui/screens/level-up/review-complete.ts',
] as const;

const DISPLAY_FIELDS = new Set([
  'candidate_name',
  'class_name',
  'display_name',
  'feat_name',
  'item_name',
  'localName',
  'name',
  'printed_name',
  'source_name',
  'spell_name',
  'subclass_name',
]);

const CATALOG_TYPE_NAME =
  /(?:Armor|Background|Candidate|Catalog|Class|Definition|Equipment|Feat|Item|Origin|Review|Source|Species|Spell|Subclass|Weapon)/u;

/**
 * Exact source/type/field exemptions. These are values authored or copied onto
 * a character, labels from closed rules data, or internal projector inputs —
 * none claims to identify an installed catalog entry at the display boundary.
 */
const EXEMPTIONS = new Map<string, string>([
  ['src/authoring/contracts.ts::SpeciesAuthoringDraftTrait::name', 'Draft trait names are user-authored children, not installed catalog entries.'],
  ['src/authoring/contracts.ts::BackgroundAuthoringDraftEquipment::printed_name', 'Draft equipment text is user-authored before any catalog publication exists.'],
  ['src/authoring/contracts.ts::SubclassAuthoringDraftFeature::name', 'Draft feature names are user-authored children, not installed catalog entries.'],
  ['src/authoring/contracts.ts::SpeciesContentTrait::name', 'A trait is content inside one catalog aggregate and has no independent layer.'],
  ['src/authoring/contracts.ts::BackgroundContentEquipment::printed_name', 'A package line is content inside one background aggregate and has no independent layer.'],
  ['src/authoring/contracts.ts::SubclassContentFeature::name', 'A feature is content inside one subclass aggregate and has no independent layer.'],
  ['src/domain/read-models.ts::CharacterItem::name', 'Character items are editable character-owned values, not catalog references.'],
  ['src/queries/character-sheet-builder.ts::SheetArmorRow::name', 'Sheet armor rows are editable character-owned copies under D69.'],
  ['src/queries/character-sheet-builder.ts::SheetItemRow::name', 'Sheet item rows are editable character-owned values.'],
  ['src/queries/character-sheet-builder.ts::SheetPrintedFeature::name', 'Feature headings are children of a separately disclosed catalog source.'],
  ['src/builder/level-up-wizard.ts::FeatDefinitionForApplication::name', 'The enclosing LevelUpFeatCandidate carries the one authoritative layer for this definition.'],
  ['src/builder/level-up-wizard.ts::LevelUpPendingEpicResolution::deferred_choice.class_name', 'This authenticated command locator is not rendered; held-class cards carry the display disclosure.'],
  ['src/domain/read-models.ts::SpellRoute::spell_name', 'Build-report catalog_sources separately discloses every selected spell represented by this mechanical route.'],
  ['src/domain/read-models.ts::SpellRoute::source_name', 'Build-report catalog_sources separately discloses the catalog source; this field describes mechanics.'],
  ['src/domain/read-models.ts::DuplicateAssessment::spell_name', 'The assessment is mechanical metadata for a selected spell disclosed by the workspace slot.'],
  ['src/domain/read-models.ts::RemovableSource::display_name', 'A removable source may be an unlinked imported instance, so its copied character label has no asserted catalog layer.'],
  ['src/domain/read-models.ts::OrderSource::class_name', 'OrderSource is mechanical option data; the enclosing workspace class entry carries the class layer.'],
  ['src/domain/read-models.ts::BuildReport::wizard.spellbook.spell_name', 'BuildReport.catalog_sources is the authoritative disclosure for these spellbook mechanics.'],
  ['src/domain/read-models.ts::BuildReport::wizard.prepared.spell_name', 'BuildReport.catalog_sources is the authoritative disclosure for these prepared-spell mechanics.'],
  ['src/domain/read-models.ts::BuildReport::wizard.ritual_only.spell_name', 'BuildReport.catalog_sources is the authoritative disclosure for these ritual mechanics.'],
  ['src/domain/read-models.ts::Workspace::configurable_sources.display_name', 'A configurable source can be an unlinked imported instance; the label is character-owned copied data.'],
  ['src/queries/character-completeness.ts::UnfilledChoicesItem::source_name', 'Completeness narrates a source-instance obligation; linked catalog sources disclose in the workspace catalog list.'],
  ['src/queries/character-completeness.ts::UnchosenOptionItem::source_name', 'Completeness narrates a source-instance obligation; linked catalog sources disclose in the workspace catalog list.'],
  ['src/queries/character-completeness.ts::OrphanHitPointRollItem::class_name', 'An orphan roll deliberately has no resolvable class catalog identity to disclose.'],
  ['src/queries/character-completeness.ts::UnfilledSkillGrantsItem::source_name', 'Completeness may describe an unlinked imported source instance, not an asserted catalog entry.'],
  ['src/queries/character-completeness.ts::ExpertiseGrantItem::source_name', 'Completeness may describe an unlinked imported source instance, not an asserted catalog entry.'],
  ['src/queries/character-sheet-builder.ts::SheetPrintedFeature::source_name', 'CharacterSheet.catalog_sources separately discloses the parent source for copied printed feature text.'],
  ['src/queries/character-sheet-builder.ts::SheetHitPointRoll::class_name', 'CharacterSheet.catalog_sources separately discloses held classes; this is a copied roll label.'],
  ['src/queries/character-sheet-builder.ts::SheetClassLine::class_name', 'CharacterSheet.catalog_sources is the authoritative layer disclosure for the class summary line.'],
  ['src/queries/character-sheet-builder.ts::SheetClassLine::subclass_name', 'CharacterSheet.catalog_sources is the authoritative layer disclosure for the subclass summary line.'],
  ['src/queries/character-sheet-builder.ts::SheetProficiencies::weapon_proficiencies.class_name', 'CharacterSheet.catalog_sources separately discloses the class behind this mechanical grant.'],
  ['src/queries/character-sheet-builder.ts::SheetProficiencies::classes.class_name', 'CharacterSheet.catalog_sources separately discloses the class behind this mechanical grant.'],
  ['src/queries/character-sheet-builder.ts::CharacterSheet::martial_arts.class_name', 'CharacterSheet.catalog_sources separately discloses the class behind this mechanical value.'],
]);

interface DisplayOccurrence {
  readonly key: string;
  readonly line: number;
  readonly layered: boolean;
}

function propertyName(
  source: ts.SourceFile,
  property: ts.PropertySignature,
): string | null {
  if (property.name === undefined) return null;
  if (
    ts.isIdentifier(property.name) ||
    ts.isStringLiteral(property.name) ||
    ts.isNumericLiteral(property.name)
  ) {
    return property.name.text;
  }
  return property.name.getText(source);
}

function containerProperties(
  source: ts.SourceFile,
  node: ts.Node,
): readonly string[] {
  if (!ts.isInterfaceDeclaration(node) && !ts.isTypeLiteralNode(node)) {
    return [];
  }
  return node.members.flatMap((member) => {
    if (!ts.isPropertySignature(member)) return [];
    const name = propertyName(source, member);
    return name === null ? [] : [name];
  });
}

function expectedLayerFields(displayField: string): readonly string[] {
  switch (displayField) {
    case 'candidate_name':
      return ['candidate_catalog_layer', 'catalog_layer'];
    case 'class_name':
      return ['class_catalog_layer', 'catalog_layer'];
    case 'item_name':
      return ['item_catalog_layer', 'catalog_layer'];
    case 'localName':
      return ['localCatalogLayer', 'catalog_layer'];
    case 'source_name':
      return ['source_catalog_layer', 'catalog_layer'];
    case 'spell_name':
      return ['spell_catalog_layer', 'catalog_layer'];
    case 'subclass_name':
      return ['subclass_catalog_layer', 'catalog_layer'];
    default:
      return ['catalog_layer'];
  }
}

function isBareCatalogNameList(
  source: ts.SourceFile,
  property: ts.PropertySignature,
  name: string,
): boolean {
  if (name !== 'feats' && name !== 'spells') return false;
  const text = property.type?.getText(source) ?? '';
  return /(?:readonly\s+)?string\[\]|ReadonlyArray<string>/u.test(text);
}

function occurrences(file: string): readonly DisplayOccurrence[] {
  const source = ts.createSourceFile(
    file,
    readFileSync(join(repoRoot, file), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const found: DisplayOccurrence[] = [];
  for (const declaration of source.statements) {
    if (
      !ts.isInterfaceDeclaration(declaration) &&
      !ts.isTypeAliasDeclaration(declaration)
    ) {
      continue;
    }
    if (
      !declaration.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      )
    ) {
      continue;
    }
    const declarationName = declaration.name.text;
    const path: string[] = [];
    const visit = (node: ts.Node): void => {
      if (ts.isPropertySignature(node)) {
        const name = propertyName(source, node);
        if (name !== null) {
          path.push(name);
          const catalogDisplay =
            isBareCatalogNameList(source, node, name) ||
            DISPLAY_FIELDS.has(name) &&
              (name !== 'name' || CATALOG_TYPE_NAME.test(declarationName));
          if (catalogDisplay) {
            const parentFields = new Set(containerProperties(source, node.parent));
            const layered = isBareCatalogNameList(source, node, name)
              ? false
              : expectedLayerFields(name).some((field) => parentFields.has(field));
            found.push({
              key: `${file}::${declarationName}::${path.join('.')}`,
              line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
              layered,
            });
          }
          ts.forEachChild(node, visit);
          path.pop();
          return;
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(declaration);
  }
  return found;
}

describe('catalog display contracts disclose their publication layer', () => {
  const displays = CONTRACT_SOURCES.flatMap(occurrences);

  it('enumerates the live read-model and contract boundary non-vacuously', () => {
    expect(displays.length).toBeGreaterThan(30);
    expect(displays.map(({ key }) => key)).toContain(
      'src/domain/read-models.ts::ItemDefinition::name',
    );
    expect(displays.map(({ key }) => key)).toContain(
      'src/ui/screens/level-up/planned-choice-steps.ts::PlannedSpellDraft::spell_name',
    );
    expect(displays.map(({ key }) => key)).toContain(
      'src/builder/contracts.ts::GuidedGrantedSkillDisplay::source_name',
    );
  });

  it('keeps every exemption exact, used, and justified', () => {
    const keys = new Set(displays.map(({ key }) => key));
    for (const [key, reason] of EXEMPTIONS) {
      expect(keys, key).toContain(key);
      expect(reason.trim().length, key).toBeGreaterThan(20);
    }
  });

  it('reports no catalog display name without its matching layer field', () => {
    const omissions = displays
      .filter(({ layered, key }) => !layered && !EXEMPTIONS.has(key))
      .map(({ key, line }) => `${key} (line ${String(line)})`);
    expect(omissions).toEqual([]);
  });
});
