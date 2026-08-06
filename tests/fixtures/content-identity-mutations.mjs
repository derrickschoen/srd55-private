import {
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const action = process.argv[2];
const mutationName = process.argv[3];
const backupPath = resolve(
  '/tmp',
  `srd55-ci8-content-identity-${mutationName ?? 'unknown'}.json`,
);

const edit = (path, from, to, expected = 1) => ({
  path,
  from,
  to,
  expected,
});

/**
 * CI-8 adversarial controls for every live content-v1 projector and every live
 * identity classification. Each projector mutation removes one rules-bearing
 * field from the production projection. The scheme mutations move the only
 * live fingerprint scheme or misclassify one of today's three key kinds.
 *
 * Removed `legacy-opaque` and hypothetical content-v2 paths are deliberately
 * absent: D205/0034 deleted the former, and CI-8 cannot test a transition that
 * does not exist. Apply/restore is saved-copy based. `apply` proves every exact
 * anchor count and proves the mutant marker exists; `restore` proves byte-exact
 * restoration before deleting the saved copy.
 */
const mutations = {
  class: {
    testFile: 'tests/unit/catalog/source-projector-v1-vectors.test.ts',
    testName: 'reproduces the hand-pinned complete class aggregate bytes and key',
    changes: [edit(
      'src/catalog/source-content-projector-v1.ts',
      '    supports_ritual_casting: aggregate.supports_ritual_casting,',
      '    // CI8_MUTANT class: supports_ritual_casting omitted',
    )],
  },
  feat: {
    testFile: 'tests/unit/catalog/source-projector-v1-vectors.test.ts',
    testName: 'reproduces the hand-pinned feat prose bytes and key',
    changes: [edit(
      'src/catalog/source-content-projector-v1.ts',
      '    repeatable: aggregate.repeatable,',
      '    // CI8_MUTANT feat: repeatable omitted',
    )],
  },
  species: {
    testFile: 'tests/unit/catalog/authored-projector-v1-vectors.test.ts',
    testName: 'CI-8 species projector includes its load-bearing field',
    changes: [edit(
      'src/catalog/stored-authored-content-projector-v1.ts',
      'walking_speed_feet: aggregate.walking_speed_feet,',
      '// CI8_MUTANT species: walking_speed_feet omitted',
      2,
    )],
  },
  background: {
    testFile: 'tests/unit/catalog/authored-projector-v1-vectors.test.ts',
    testName: 'CI-8 background projector includes its load-bearing field',
    changes: [edit(
      'src/catalog/stored-authored-content-projector-v1.ts',
      '    suggested_abilities: aggregate.suggested_abilities,',
      '    // CI8_MUTANT background: suggested_abilities omitted',
    )],
  },
  subclass: {
    testFile: 'tests/unit/catalog/authored-projector-v1-vectors.test.ts',
    testName: 'CI-8 subclass projector includes its load-bearing field',
    changes: [edit(
      'src/catalog/stored-authored-content-projector-v1.ts',
      '    parent_class: aggregate.parent_class,',
      '    // CI8_MUTANT subclass: parent_class omitted',
    )],
  },
  spell: {
    testFile: 'tests/unit/catalog/spell-projector-v1-vectors.test.ts',
    testName: 'CI-8 spell projector includes its load-bearing field',
    changes: [edit(
      'src/catalog/spell-content-projector-v1.ts',
      '    level: aggregate.level,',
      '    // CI8_MUTANT spell: level omitted',
    )],
  },
  weapon: {
    testFile: 'tests/unit/catalog/equipment-projector-v1-vectors.test.ts',
    testName: 'CI-8 weapon projector includes its load-bearing field',
    changes: [edit(
      'src/catalog/equipment-content-projector-v1.ts',
      '    finesse: aggregate.finesse,',
      '    // CI8_MUTANT weapon: finesse omitted',
    )],
  },
  armor: {
    testFile: 'tests/unit/catalog/equipment-projector-v1-vectors.test.ts',
    testName: 'CI-8 armor projector includes its load-bearing field',
    changes: [edit(
      'src/catalog/equipment-content-projector-v1.ts',
      '    armor_class: aggregate.armor_class,',
      '    // CI8_MUTANT armor: armor_class omitted',
    )],
  },
  item: {
    testFile: 'tests/unit/catalog/equipment-projector-v1-vectors.test.ts',
    testName: 'CI-8 item projector includes its load-bearing field',
    changes: [edit(
      'src/catalog/equipment-content-projector-v1.ts',
      '    requires_attunement: aggregate.requires_attunement,',
      '    // CI8_MUTANT item: requires_attunement omitted',
    )],
  },
  'content-v1': {
    testFile: 'tests/unit/catalog/content-identity-v1-vectors.test.ts',
    testName: 'CI-8 content-v1 fingerprint scheme stays frozen',
    changes: [edit(
      'src/catalog/content-identity.ts',
      "  'content-v1' as ContentFingerprintScheme;",
      "  'content-v0' as ContentFingerprintScheme; // CI8_MUTANT scheme",
    )],
  },
  'key-kind-derived': {
    testFile: 'tests/integration/catalog/content-registry.test.ts',
    testName: 'keeps new registration on the closed derived/asserted/bundled paths',
    changes: [edit(
      'src/catalog/content-registry.ts',
      ") VALUES (?, ?, 'derived', 'external', ?)",
      ") VALUES (?, ?, 'asserted', 'external', ?) /* CI8_MUTANT derived kind */",
    )],
  },
  'key-kind-asserted': {
    testFile: 'tests/integration/catalog/content-registry.test.ts',
    testName: 'keeps new registration on the closed derived/asserted/bundled paths',
    changes: [edit(
      'src/catalog/content-registry.ts',
      ") VALUES (?, ?, 'asserted', 'external', ?)",
      ") VALUES (?, ?, 'derived', 'external', ?) /* CI8_MUTANT asserted kind */",
    )],
  },
  'key-kind-bundled-stable': {
    testFile: 'tests/integration/catalog/content-registry.test.ts',
    testName: 'keeps new registration on the closed derived/asserted/bundled paths',
    changes: [edit(
      'src/catalog/content-registry.ts',
      ") VALUES (?, ?, 'bundled-stable', 'bundled', ?)",
      ") VALUES (?, ?, 'derived', 'bundled', ?) /* CI8_MUTANT bundled kind */",
    )],
  },
  'ui-preview-counts': {
    testFile: 'tests/unit/ui/content-adoption-dialog.test.ts',
    testName: 'CI-8 discloses real planner counts, every match reason, and both collision labels',
    changes: [edit(
      'src/ui/content-adoption-dialog.ts',
      '      newCount: portable.new_by_kind[kind],',
      '      newCount: portable.new_by_kind[kind] + 1, // CI8_MUTANT corrupt preview count',
    )],
  },
  'ui-preview-conflicts': {
    testFile: 'tests/unit/ui/content-adoption-dialog.test.ts',
    testName: 'CI-8 discloses real planner counts, every match reason, and both collision labels',
    changes: [edit(
      'src/ui/content-adoption-dialog.ts',
      `      : [element('p', {
          text: \`${String('${String(conflicts.length)}')} conflict\${conflicts.length === 1 ? '' : 's'} \` +
            'must be reviewed below.',
        })]),`,
      `      : [element('p', {
          text: 'Conflicts exist.', // CI8_MUTANT omit conflict count
        })]),`,
    )],
  },
  'ui-match-reason': {
    testFile: 'tests/unit/ui/content-adoption-dialog.test.ts',
    testName: 'CI-8 discloses real planner counts, every match reason, and both collision labels',
    changes: [edit(
      'src/ui/content-adoption-dialog.ts',
      `      return sameIdentityName(review)
        ? 'Same name, distinct rules content'
        : 'Alias points to distinct rules content';`,
      `      return sameIdentityName(review)
        ? 'Collision' // CI8_MUTANT hide same-name distinction
        : 'Alias points to distinct rules content';`,
    )],
  },
  'ui-same-name-guidance': {
    testFile: 'tests/unit/ui/content-adoption-dialog.test.ts',
    testName: 'CI-8 discloses real planner counts, every match reason, and both collision labels',
    changes: [edit(
      'src/ui/content-adoption-dialog.ts',
      "'The normalized name is already in use for different rules. Rename the private copy to keep both.'",
      "'Rename this entry.' /* CI8_MUTANT hide same-name-distinct guidance */",
    )],
  },
  'ui-refusal-block': {
    testFile: 'tests/unit/ui/content-adoption-dialog.test.ts',
    testName: 'CI-8 discloses real planner counts, every match reason, and both collision labels',
    changes: [edit(
      'src/ui/content-adoption-dialog.ts',
      `  commit.disabled = options.plan.outcomes.some(
    (outcome) => outcome.kind === 'refused',
  );`,
      '  commit.disabled = false; // CI8_MUTANT refused preview leaves commit enabled',
    )],
  },
  'ui-preview-before-commit': {
    testFile: 'tests/unit/ui/character-list.test.ts',
    testName: 'imports a zero-review, zero-refusal complete character JSON without a dialog',
    changes: [edit(
      'src/ui/screens/character-list/import-backup-controls.ts',
      `        if (prepared.plan.reviews.length === 0 && !hasRefusal) {
          const committed = await services.backup.commitCharacterImport(`,
      `        if (prepared.plan.reviews.length === 0 && !hasRefusal) {
          showAdoptionDialog(prepared.plan); // CI8_MUTANT needless trivial-import modal
          const committed = await services.backup.commitCharacterImport(`,
    )],
  },
  'ui-remembered-refresh': {
    testFile: 'tests/unit/ui/character-list.test.ts',
    testName: 'CI-8 forgets the selected remembered choice and refreshes its management list',
    changes: [edit(
      'src/ui/screens/character-list/import-backup-controls.ts',
      '      await refreshReceipts();',
      '      // CI8_MUTANT remembered-choice list left stale',
    )],
  },
  'ui-remembered-identity': {
    testFile: 'tests/unit/ui/character-list.test.ts',
    testName: 'CI-8 forgets the selected remembered choice and refreshes its management list',
    changes: [edit(
      'src/ui/screens/character-list/import-backup-controls.ts',
      `      text: \`${String('${receipt.kind}')}\: \${receipt.decision} → \${receipt.targetContentKey} \` +
        \`(\${receipt.scheme} \${receipt.digest.slice(0, 12)}…, reviewed \${receipt.reviewedAt})\`,`,
      `      text: \`${String('${receipt.kind}')}\: \${receipt.decision} → \${receipt.targetContentKey}\`, // CI8_MUTANT hide receipt identity`,
    )],
  },
  'ui-complete-backup-wording': {
    testFile: 'tests/unit/ui/character-list.test.ts',
    testName: 'imports a zero-review, zero-refusal complete character JSON without a dialog',
    changes: [edit(
      'src/ui/screens/character-list/import-backup-controls.ts',
      "      text: 'Character JSON backups include the character and its complete referenced external content. Share links are reference-only and do not include catalog definitions.',",
      "      text: 'Import or export a character.', // CI8_MUTANT hide complete backup wording",
    )],
  },
  'ui-reference-wording': {
    testFile: 'tests/unit/ui/character-list.test.ts',
    testName: 'CI-8 labels links as reference-only and directs complete content to character JSON',
    changes: [edit(
      'src/ui/screens/character-list/share-controls.ts',
      "          text: 'Share links are reference-only: they do not include catalog definitions. Use a complete character JSON backup when the recipient also needs external content.',",
      "          text: 'Only character choices are included.', // CI8_MUTANT hide channel distinction",
    )],
  },
};

const mutation = mutations[mutationName];
if (mutation === undefined) {
  throw new Error(
    `Unknown mutation. Choose one of: ${Object.keys(mutations).join(', ')}`,
  );
}

if (action === 'apply') {
  if (existsSync(backupPath)) {
    throw new Error(`Saved copy already exists: ${backupPath}`);
  }
  const originals = {};
  for (const change of mutation.changes) {
    const current = originals[change.path] ??
      readFileSync(resolve(root, change.path), 'utf8');
    const count = current.split(change.from).length - 1;
    if (count !== change.expected) {
      throw new Error(
        `${mutationName}: expected ${String(change.expected)} exact anchor(s) in ` +
          `${change.path}, found ${String(count)}`,
      );
    }
    originals[change.path] ??= current;
  }
  writeFileSync(backupPath, JSON.stringify(originals));
  const mutated = { ...originals };
  for (const change of mutation.changes) {
    mutated[change.path] = mutated[change.path].replaceAll(change.from, change.to);
  }
  for (const [path, contents] of Object.entries(mutated)) {
    writeFileSync(resolve(root, path), contents);
    const applied = readFileSync(resolve(root, path), 'utf8');
    if (!applied.includes('CI8_MUTANT') || applied === originals[path]) {
      throw new Error(`${mutationName}: mutation was not observed in ${path}`);
    }
  }
  process.stdout.write(
    `APPLIED ${mutationName}; detector: ${mutation.testFile} :: ${mutation.testName}\n`,
  );
} else if (action === 'restore') {
  if (!existsSync(backupPath)) {
    throw new Error(`No saved copy exists: ${backupPath}`);
  }
  const originals = JSON.parse(readFileSync(backupPath, 'utf8'));
  for (const [path, contents] of Object.entries(originals)) {
    writeFileSync(resolve(root, path), contents);
    if (readFileSync(resolve(root, path), 'utf8') !== contents) {
      throw new Error(`${mutationName}: byte-exact restoration failed for ${path}`);
    }
  }
  unlinkSync(backupPath);
  process.stdout.write(`RESTORED ${mutationName} byte-exactly\n`);
} else if (action === 'describe') {
  process.stdout.write(`${mutation.testFile} :: ${mutation.testName}\n`);
} else {
  throw new Error(
    'Usage: node tests/fixtures/content-identity-mutations.mjs apply|restore|describe NAME',
  );
}
