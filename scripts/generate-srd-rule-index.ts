import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { composeSrdRuleIndexModule, SRD_RULE_INDEX_PATH } from './srd/rule-index.ts';

/**
 * The only writer of `src/rules/srd/generated/rule-index.ts`. Kept thin so the
 * drift test can import the composer from `srd/rule-index.ts` with no chance of
 * regenerating the file it checks.
 *
 * Run with `npm run srd:rule-index` after any edit to a corpus under docs/srd
 * or to the derivation, and commit the regenerated file with that edit. Adding
 * a unit to the index fails `RULE_STATUS` to compile until the new id has a
 * status (src/rules/srd/rule-status.ts): that is the point.
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const text = composeSrdRuleIndexModule((path) => readFileSync(resolve(root, path), 'utf8'));
const target = resolve(root, SRD_RULE_INDEX_PATH);
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, text, 'utf8');
process.stdout.write(`Wrote ${SRD_RULE_INDEX_PATH}\n`);
