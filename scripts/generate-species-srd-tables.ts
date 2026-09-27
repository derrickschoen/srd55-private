/**
 * Writes `src/rules/generated/species-srd-tables.ts` from the SRD species
 * extract. Run: `npx vite-node scripts/generate-species-srd-tables.ts`.
 * The drift test `tests/unit/rules/species-srd-tables-generation.test.ts`
 * re-derives the same bytes and fails on any difference.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  readSpeciesSrdTables,
  renderSpeciesSrdTablesModule,
  SPECIES_EXTRACT_PATH,
  SPECIES_SRD_TABLES_PATH,
} from '../src/rules/species-srd-tables-reader';

const extract = readFileSync(SPECIES_EXTRACT_PATH, 'utf8');
writeFileSync(SPECIES_SRD_TABLES_PATH, renderSpeciesSrdTablesModule(readSpeciesSrdTables(extract)));
process.stdout.write(`wrote ${SPECIES_SRD_TABLES_PATH}\n`);
