import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

/**
 * Every TypeScript module under a catalog-facing source root participates.
 * Adding a contract file therefore cannot require a guard allowlist edit.
 */
const CONTRACT_ROOTS = [
  'src/access',
  'src/authoring',
  'src/builder',
  'src/catalog',
  'src/domain',
  'src/eligibility',
  'src/queries',
  'src/ui',
] as const;

function typescriptModules(directory: string): readonly string[] {
  return readdirSync(join(repoRoot, directory), { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return typescriptModules(path);
      return entry.isFile() && entry.name.endsWith('.ts') &&
          !entry.name.endsWith('.d.ts')
        ? [path]
        : [];
    });
}

const CONTRACT_SOURCES = CONTRACT_ROOTS.flatMap(typescriptModules).sort();

const program = ts.createProgram({
  rootNames: CONTRACT_SOURCES.map((file) => join(repoRoot, file)),
  options: {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    skipLibCheck: true,
    target: ts.ScriptTarget.ESNext,
  },
});
const checker = program.getTypeChecker();

/**
 * Exact source/type/field exemptions. These are values authored or copied onto
 * a character, labels from closed rules data, or internal projector inputs —
 * none claims to identify an installed catalog entry at the display boundary.
 */
const EXEMPTIONS = new Map<string, string>([
  ['src/authoring/contracts.ts::BackgroundAuthoringDraft::default_origin_feat_display_name', 'This is editable draft text before publication, not an assertion about an installed feat.'],
  ['src/authoring/contracts.ts::BackgroundAuthoringDraftEquipment::printed_name', 'Draft equipment text is user-authored before any catalog publication exists.'],
  ['src/authoring/contracts.ts::BackgroundContentEquipment::printed_name', 'An equipment line is child content of its disclosed background aggregate, not an independently installed entry.'],
  ['src/authoring/contracts.ts::BackgroundContentAggregate::default_origin_feat_display_name', 'This preserves authored aggregate text; the separately linked feat content key controls installed identity.'],
  ['src/authoring/contracts.ts::PublishDecision::clone_name', 'This is the requested name for content that does not exist until the publication command succeeds.'],
  ['src/authoring/contracts.ts::ContentUsage::character_name', 'Character names are character-owned text, not catalog content.'],
  ['src/authoring/contracts.ts::ArchiveSetCharacter::character_name', 'DEFENDED: Character names are character-owned text recorded in an archive membership manifest, not names of installed catalog content.'],
  ['src/access/spell-access-builder.ts::SpellAccessRoute::identity_name', 'The canonical identity name is mechanical deduplication input; spell_name is the rendered catalog value.'],
  ['src/builder/background-choices.ts::BackgroundPrintedPairing::background_name', 'The pairing is nested under GuidedBackgroundOption, whose catalog layer owns and accompanies this printed text.'],
  ['src/builder/armor-class-effects.ts::CharacterItemRow::name', 'Character item rows are editable character-owned values, not installed catalog references.'],
  ['src/catalog/catalog-schema.ts::CatalogSubclassRecord::name', 'An uninstalled catalog document has no publication layer until the publisher registers it.'],
  ['src/catalog/spell-fork.ts::ForkSpellResult::displayName', 'The command result repeats the submitted fork name; publication review carries the installed identity.'],
  ['src/domain/command-contracts.ts::ItemFields::name', 'Item command fields are editable character-owned values, not installed catalog references.'],
  ['src/domain/command-contracts.ts::SetHitPointRollCommand::class_name', 'This authenticated command locator is not rendered and does not claim a catalog identity.'],
  ['src/domain/models.ts::DefinitionRow::name', 'Raw database row models are persistence inputs, not rendered route or UI contracts.'],
  ['src/domain/models.ts::SpellIdentityRow::canonical_name', 'Canonical identity text is mechanical deduplication data, not a rendered catalog version name.'],
  ['src/domain/models.ts::SpellIdentityRow::normalized_name', 'Normalized identity text is mechanical deduplication data, not a rendered catalog version name.'],
  ['src/domain/models.ts::SpellVersionRow::display_name', 'Raw database row models are persistence inputs; consumer projections add catalog disclosure.'],
  ['src/domain/models.ts::ClassDefinitionRow::name', 'Raw database row models are persistence inputs; consumer projections add catalog disclosure.'],
  ['src/domain/models.ts::SubclassDefinitionRow::name', 'Raw database row models are persistence inputs; consumer projections add catalog disclosure.'],
  ['src/domain/models.ts::CharacterSourceInstanceRow::display_name', 'A source instance row stores copied character data and may have no resolvable catalog identity.'],
  ['src/domain/read-models.ts::CharacterItem::name', 'Character items are editable character-owned values, not installed catalog references.'],
  ['src/domain/read-models.ts::DuplicateAssessment::spell_name', 'Duplicate assessment metadata belongs to a selected spell disclosed by the workspace slot.'],
  ['src/domain/read-models.ts::OrderSource::class_name', 'OrderSource is mechanical option data; the enclosing workspace class entry carries the class disclosure.'],
  ['src/domain/read-models.ts::OrderSource::order_name', 'Divine Order and Primal Order are closed rules labels, not installed catalog entries.'],
  ['src/domain/read-models.ts::Workspace::configurable_sources.display_name', 'A configurable source can be an unlinked imported instance whose copied label has no asserted identity.'],
  ['src/queries/background-equipment.ts::BackgroundEquipmentItem::item_name', 'This is printed child content within a background equipment package, not an independently installed item.'],
  ['src/queries/background-equipment.ts::BackgroundEquipmentPackage::background_name', 'This internal equipment interpreter is not a route contract; guided background options carry the layer.'],
  ['src/queries/character-completeness.ts::UnchosenOptionItem::order_name', 'Divine Order and Primal Order are closed rules labels, not installed catalog entries.'],
  ['src/queries/character-completeness.ts::OrphanHitPointRollItem::class_name', 'An orphan roll deliberately has no resolvable class catalog identity to disclose.'],
  ['src/builder/level-up-wizard.ts::LevelUpPendingEpicResolution::deferred_choice.class_name', 'This authenticated command locator is not rendered; held-class cards carry the display disclosure.'],
  ['src/domain/read-models.ts::RemovableSource::display_name', 'A removable source may be an unlinked imported instance, so its copied character label has no asserted catalog layer.'],
  ['src/queries/character-sheet-builder.ts::SheetPrintedFeature::source_name', 'CharacterSheet.catalog_sources separately owns disclosure for the parent of copied feature text.'],
  ['src/queries/character-sheet-builder.ts::SheetHitPointRoll::class_name', 'CharacterSheet.catalog_sources separately owns disclosure for held classes; this is a copied roll label.'],
  ['src/queries/character-sheet-builder.ts::SheetClassLine::class_name', 'CharacterSheet.catalog_sources is the authoritative disclosure for this class summary line.'],
  ['src/queries/character-sheet-builder.ts::SheetClassLine::subclass_name', 'CharacterSheet.catalog_sources is the authoritative disclosure for this subclass summary line.'],
  ['src/queries/character-sheet-builder.ts::SheetProficiencies::weapon_proficiencies.class_name', 'CharacterSheet.catalog_sources discloses the class behind this mechanical proficiency grant.'],
  ['src/queries/character-sheet-builder.ts::SheetProficiencies::classes.class_name', 'CharacterSheet.catalog_sources discloses the class behind this mechanical proficiency grant.'],
  ['src/queries/character-sheet-builder.ts::CharacterSheet::martial_arts.class_name', 'CharacterSheet.catalog_sources discloses the class behind this mechanical value.'],
  ['src/queries/character-completeness.ts::UnfilledChoicesItem::source_name', 'Completeness narrates a source-instance obligation; linked catalog sources disclose in the workspace catalog list.'],
  ['src/queries/character-completeness.ts::UnchosenOptionItem::source_name', 'Completeness narrates a source-instance obligation; linked catalog sources disclose in the workspace catalog list.'],
  ['src/queries/character-completeness.ts::UnfilledSkillGrantsItem::source_name', 'Completeness may describe an unlinked imported source instance, not an asserted catalog entry.'],
  ['src/queries/character-completeness.ts::ExpertiseGrantItem::source_name', 'Completeness may describe an unlinked imported source instance, not an asserted catalog entry.'],
  ['src/ui/screens/planner/agent-reference.ts::ReferenceOutstandingItem::order_name', 'Divine Order and Primal Order are closed rules labels, not installed catalog entries.'],
  ['src/ui/screens/planner/agent-reference.ts::ReferenceOutstandingItem::class_name', 'This mirrors an orphan roll that deliberately has no resolvable class catalog identity.'],
  ['src/ui/screens/planner/agent-reference.ts::WithheldText::character_name', 'Character names are character-owned free text withheld from machine-readable output, not catalog content.'],
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
  const type = ts.isInterfaceDeclaration(node)
    ? checker.getDeclaredTypeOfSymbol(
        checker.getSymbolAtLocation(node.name) ??
          (() => { throw new Error(`Missing interface symbol in ${source.fileName}.`); })(),
      )
    : checker.getTypeAtLocation(node);
  return checker.getPropertiesOfType(type).map(
    (property) => property.name,
  );
}

function expectedLayerFields(displayField: string): readonly string[] {
  if (displayField === 'name') return ['catalog_layer'];
  if (displayField.endsWith('_name')) {
    return [
      `${displayField.slice(0, -'_name'.length)}_catalog_layer`,
      'catalog_layer',
    ];
  }
  if (displayField.endsWith('Name')) {
    return [
      `${displayField.slice(0, -'Name'.length)}CatalogLayer`,
      'catalog_layer',
    ];
  }
  return ['catalog_layer'];
}

/**
 * Shape rule: every exported snake-case `*_name` is display-capable. A bare
 * `name` or camel-case `*Name` is display-capable when its containing contract
 * also has a catalog locator or a layer field. Bare spell/feat name arrays are
 * rejected separately. Type-checker properties make imported `extends`
 * members participate when deciding whether the containing shape is catalogued.
 */
function isCatalogDisplayField(
  source: ts.SourceFile,
  property: ts.PropertySignature,
  name: string,
): boolean {
  if (isBareCatalogNameList(source, property, name)) return true;
  if (name.endsWith('_name')) return true;
  const fields = new Set(containerProperties(source, property.parent));
  const hasCatalogLocator = fields.has('content_key') ||
    fields.has('contentKey') ||
    [...fields].some((field) =>
      field.endsWith('_definition_id') || field.endsWith('_version_id') ||
      field.endsWith('_source_id') || field.endsWith('_instance_id') ||
      field.endsWith('DefinitionId') ||
      field.endsWith('VersionId') || field.endsWith('SourceId')
    );
  const hasLayerPair = expectedLayerFields(name).some((field) =>
    fields.has(field)
  );
  if (name !== 'name' && !name.endsWith('Name')) return false;
  return hasCatalogLocator || hasLayerPair;
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
  const source = program.getSourceFile(join(repoRoot, file));
  if (source === undefined) {
    throw new Error(`TypeScript did not load derived contract module ${file}.`);
  }
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
          const catalogDisplay = isCatalogDisplayField(source, node, name);
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
    expect(CONTRACT_SOURCES.length).toBeGreaterThan(150);
    expect(CONTRACT_SOURCES).toEqual(expect.arrayContaining([
      'src/access/spell-access-builder.ts',
      'src/builder/level-up-wizard.ts',
      'src/queries/character-spell-section-builder.ts',
    ]));
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
    expect(displays.map(({ key }) => key)).toEqual(expect.arrayContaining([
      'src/access/spell-access-builder.ts::SpellAccessRoute::spell_name',
      'src/builder/level-up-wizard.ts::FeatDefinitionForApplication::name',
      'src/builder/level-up-wizard.ts::LevelUpPlannedSpellProjection::current_spell_name',
      'src/queries/character-spell-section-builder.ts::SheetSpellbookEntry::name',
      // `class_definition_id` comes from an imported extended interface.
      'src/queries/level-up-planned-choices.ts::LevelUpPlannedChoiceContext::class_name',
    ]));
  });

  it('keeps every exemption exact, used, and justified', () => {
    const keys = new Set(displays.map(({ key }) => key));
    expect(
      [...EXEMPTIONS.keys()].filter((key) => !keys.has(key)),
    ).toEqual([]);
    for (const [key, reason] of EXEMPTIONS) {
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
