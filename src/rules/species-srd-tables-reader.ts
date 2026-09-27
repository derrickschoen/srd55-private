/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * ---
 *
 * THE BUILD-TIME READER OF `src/rules/generated/species-srd-tables.ts` (D915,
 * D918 production rule G: generated, with a byte drift test).
 *
 * It is imported by the generator (`scripts/generate-species-srd-tables.ts`)
 * and by the drift test, NEVER by application code: application code imports
 * the generated module, which holds typed literals and no SRD text. The text
 * is a required argument, so the drift test can prove the check fails on an
 * edited extract.
 *
 * TWO FACTS, BOTH PRINTED AS DATA RATHER THAN PROSE:
 *
 *  - The Draconic Ancestors table (`species-descriptions.txt:63-71`): ten
 *    dragons and the damage type each determines. A table, so it is read
 *    cell by cell — never interpreted.
 *  - Each species' standing Darkvision range. Six species print a trait whose
 *    WHOLE text is the fixed sentence "You have Darkvision with a range of N
 *    feet."; that exact sentence is matched and nothing looser. The Drow's
 *    120 feet is a lineage OPTION, recorded with the Elven Lineage choice in
 *    `origin-definitions-srd.ts`, and is deliberately not read here.
 *
 * The species parse itself is `parseSrdSpeciesTemplates` (origins-srd-reader.ts) — the one
 * reconstruction of this two-column chapter's reading order — so the species
 * each Darkvision line belongs to is the parse's answer, not a column guess.
 * Every mismatch THROWS: a reader that skipped what it did not understand is
 * how an extraction change becomes a silently short table.
 */
import { damageTypes, isEnumValue, type KnownDamageType } from '../domain/enums';
import { parseSrdSpeciesTemplates, type SrdSpeciesTemplate } from './origins-srd-reader';

export const SPECIES_EXTRACT_PATH = 'docs/srd/source/species-descriptions.txt';
export const SPECIES_SRD_TABLES_PATH = 'src/rules/generated/species-srd-tables.ts';
export const SPECIES_SRD_TABLES_GENERATOR = 'npx vite-node scripts/generate-species-srd-tables.ts';
export const SPECIES_SRD_TABLES_DRIFT_TEST = 'tests/unit/rules/species-srd-tables-generation.test.ts';

export class SpeciesSrdTableError extends Error {
  override readonly name = 'SpeciesSrdTableError' as const;
}

export interface DraconicAncestorRow {
  readonly dragon: string;
  readonly damageType: KnownDamageType;
}

export interface SrdSpeciesDarkvision {
  readonly kind: 'darkvision';
  readonly rangeFeet: number;
}

export interface SpeciesSrdTables {
  /** 1-based extract lines from the table caption to its last row. */
  readonly draconicAncestorsSpan: readonly [number, number];
  readonly draconicAncestors: readonly DraconicAncestorRow[];
  /** Every SRD species, in printed order, with its standing senses. */
  readonly speciesSenses: readonly {
    readonly species: string;
    readonly senses: readonly SrdSpeciesDarkvision[];
  }[];
}

const DRACONIC_ANCESTORS_CAPTION = 'Draconic Ancestors';
const DRACONIC_ANCESTORS_HEADER = 'Dragon Damage Type Dragon Damage Type';
const DARKVISION_SENTENCE = /^You have Darkvision with a range of (?<feet>[1-9][0-9]*) feet\.$/u;

function traitNamed(template: SrdSpeciesTemplate, name: string) {
  const matches = template.traits.filter((trait) => trait.name === name);
  if (matches.length > 1) {
    throw new SpeciesSrdTableError(`${template.name} prints ${String(matches.length)} ${name} traits.`);
  }
  return matches[0] ?? null;
}

function knownDamageType(value: string): KnownDamageType {
  if (!isEnumValue(damageTypes, value)) {
    throw new SpeciesSrdTableError(`Draconic Ancestors names ${JSON.stringify(value)}, not an SRD damage type.`);
  }
  return value;
}

function draconicAncestors(templates: readonly SrdSpeciesTemplate[]): readonly DraconicAncestorRow[] {
  const dragonborn = templates.find((template) => template.name === 'Dragonborn');
  const ancestry = dragonborn === undefined ? null : traitNamed(dragonborn, 'Draconic Ancestry');
  if (ancestry === null) {
    throw new SpeciesSrdTableError('The Dragonborn has no Draconic Ancestry trait to carry its table.');
  }
  const bands = ancestry.description.split('\n\n')
    .filter((band) => band.split('\n')[0] === DRACONIC_ANCESTORS_CAPTION);
  const band = bands[0];
  if (bands.length !== 1 || band === undefined) {
    throw new SpeciesSrdTableError(
      `Draconic Ancestry must carry exactly one ${DRACONIC_ANCESTORS_CAPTION} table; found ${String(bands.length)}.`,
    );
  }
  const [, header, ...rows] = band.split('\n');
  if (header?.split(/\s+/u).join(' ') !== DRACONIC_ANCESTORS_HEADER) {
    throw new SpeciesSrdTableError(`The ${DRACONIC_ANCESTORS_CAPTION} header reads ${JSON.stringify(header)}.`);
  }
  // Two dragon/type pairs per printed row; the left column is read top to
  // bottom, then the right column — the table's own reading order.
  const left: DraconicAncestorRow[] = [];
  const right: DraconicAncestorRow[] = [];
  for (const row of rows) {
    const cells = row.trim().split(/\s+/u);
    const [leftDragon, leftType, rightDragon, rightType] = cells;
    if (
      cells.length !== 4 || leftDragon === undefined || leftType === undefined ||
      rightDragon === undefined || rightType === undefined
    ) {
      throw new SpeciesSrdTableError(`A ${DRACONIC_ANCESTORS_CAPTION} row does not hold two pairs: ${JSON.stringify(row)}.`);
    }
    left.push({ dragon: leftDragon, damageType: knownDamageType(leftType) });
    right.push({ dragon: rightDragon, damageType: knownDamageType(rightType) });
  }
  const table = [...left, ...right];
  if (table.length !== 10 || new Set(table.map((entry) => entry.dragon)).size !== table.length) {
    throw new SpeciesSrdTableError(
      `${DRACONIC_ANCESTORS_CAPTION} must print ten distinct dragons; found ${String(table.length)}.`,
    );
  }
  return table;
}

function draconicAncestorsSpan(extract: string, rows: readonly DraconicAncestorRow[]): readonly [number, number] {
  const lines = extract.split('\n');
  const captions = lines.flatMap((line, index) =>
    line.trimStart().startsWith(`${DRACONIC_ANCESTORS_CAPTION} `) || line.trim() === DRACONIC_ANCESTORS_CAPTION
      ? [index + 1]
      : []);
  const first = captions[0];
  const lastLeft = rows[4];
  const lastRight = rows[9];
  if (captions.length !== 1 || first === undefined || lastLeft === undefined || lastRight === undefined) {
    throw new SpeciesSrdTableError(`The ${DRACONIC_ANCESTORS_CAPTION} caption must begin exactly one extract line.`);
  }
  const lastRow = new RegExp(`^\\s*${lastLeft.dragon}\\s+${lastLeft.damageType}\\s+${lastRight.dragon}\\s+${lastRight.damageType}(\\s|$)`, 'u');
  const last = lines.findIndex((line, index) => index >= first && lastRow.test(line));
  if (last < 0) {
    throw new SpeciesSrdTableError(`The ${DRACONIC_ANCESTORS_CAPTION} last row is not on an extract line.`);
  }
  return [first, last + 1];
}

function speciesSenses(templates: readonly SrdSpeciesTemplate[]): SpeciesSrdTables['speciesSenses'] {
  return templates.map((template) => {
    const darkvision = traitNamed(template, 'Darkvision');
    if (darkvision === null) return { species: template.name, senses: [] };
    const feet = DARKVISION_SENTENCE.exec(darkvision.description)?.groups?.['feet'];
    if (feet === undefined) {
      throw new SpeciesSrdTableError(
        `${template.name}'s Darkvision trait is not the fixed range sentence: ${JSON.stringify(darkvision.description)}.`,
      );
    }
    return { species: template.name, senses: [{ kind: 'darkvision', rangeFeet: Number(feet) }] };
  });
}

export function readSpeciesSrdTables(extract: string): SpeciesSrdTables {
  const templates = parseSrdSpeciesTemplates(extract);
  const ancestors = draconicAncestors(templates);
  return {
    draconicAncestorsSpan: draconicAncestorsSpan(extract, ancestors),
    draconicAncestors: ancestors,
    speciesSenses: speciesSenses(templates),
  };
}

function literal(value: string): string {
  return `'${value.replaceAll('\\', '\\\\').replaceAll('\'', '\\\'')}'`;
}

/** The whole generated module, byte for byte; the drift test compares against it. */
export function renderSpeciesSrdTablesModule(tables: SpeciesSrdTables): string {
  const [first, last] = tables.draconicAncestorsSpan;
  return [
    '/**',
    ' * This work includes material from the System Reference Document 5.2.1',
    ' * ("SRD 5.2.1") by Wizards of the Coast LLC, available at',
    ' * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative',
    ' * Commons Attribution 4.0 International License, available at',
    ' * https://creativecommons.org/licenses/by/4.0/legalcode.',
    ' *',
    ` * GENERATED from ${SPECIES_EXTRACT_PATH} by \`${SPECIES_SRD_TABLES_GENERATOR}\`.`,
    ' * Never edit by hand: the reader is src/rules/species-srd-tables-reader.ts,',
    ` * and ${SPECIES_SRD_TABLES_DRIFT_TEST} fails on any byte difference.`,
    ' */',
    "import type { KnownDamageType } from '../../domain/enums';",
    '',
    `/** Draconic Ancestors, ${SPECIES_EXTRACT_PATH}:${String(first)}-${String(last)}; the left column, then the right. */`,
    'export const DRACONIC_ANCESTORS = [',
    ...tables.draconicAncestors.map((row) =>
      `  { dragon: ${literal(row.dragon)}, damageType: ${literal(row.damageType)} },`),
    '] as const satisfies readonly { readonly dragon: string; readonly damageType: KnownDamageType }[];',
    '',
    `export const DRACONIC_ANCESTORS_SPAN = '${SPECIES_EXTRACT_PATH}:${String(first)}-${String(last)}' as const;`,
    '',
    'export type DraconicAncestor = (typeof DRACONIC_ANCESTORS)[number][\'dragon\'];',
    '',
    '/**',
    ' * Each SRD species\' standing senses: its printed "Darkvision" trait, whose whole',
    ' * text is "You have Darkvision with a range of N feet.". An empty list is the',
    ' * species printing no such trait.',
    ' */',
    'export const SRD_SPECIES_SENSES = {',
    ...tables.speciesSenses.map((entry) =>
      `  ${entry.species}: [${entry.senses.map((sense) =>
        `{ kind: ${literal(sense.kind)}, rangeFeet: ${String(sense.rangeFeet)} }`).join(', ')}],`),
    '} as const satisfies Readonly<Record<string, readonly { readonly kind: \'darkvision\'; readonly rangeFeet: number }[]>>;',
    '',
    'export type SrdSpeciesName = keyof typeof SRD_SPECIES_SENSES;',
    '',
  ].join('\n');
}
