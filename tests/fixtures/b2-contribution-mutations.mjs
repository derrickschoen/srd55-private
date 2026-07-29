import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const mutation = process.argv[3];
const action = process.argv[2];
const backupPath = resolve(
  '/tmp',
  `dnd-multiclass-spells-static-b2-${mutation ?? 'unknown'}.json`,
);

const edit = (path, from, to) => ({ path, from, to });

const mutations = {
  hp: [
    edit(
      'src/queries/character-sheet-builder.ts',
      'const hitPoints = hitPointMaximum({ classes, scores, rolls: rolls.map });',
      'const hitPoints = hitPointMaximum({ classes, scores: AbilityScores.fromArray(character.base_abilities), rolls: rolls.map });',
    ),
  ],
  'dc-spell-access': [
    edit(
      'src/access/spell-access-builder.ts',
      `scores: AbilityScores.fromArray(
        resolvedTotals(
          resolveCharacterAbilities(this.db, row.id, row.base),
        ),
      ),`,
      'scores: AbilityScores.fromArray(row.base),',
    ),
  ],
  'dc-workspace': [
    edit(
      'src/queries/character-workspace-builder.ts',
      'const scores = AbilityScores.fromArray(report.character.abilities);',
      'const scores = AbilityScores.fromArray(report.character.abilities_base);',
    ),
  ],
  cap: [
    edit(
      'src/rules/ability-contributions.ts',
      `running += Math.max(
          0,
          Math.min(running + contribution.amount, contribution.maximum) -
            running,
        );`,
      'running += contribution.amount;',
    ),
  ],
  edit: [
    edit(
      'src/ui/screens/planner/editors.ts',
      'const base = workspace.report.character.abilities_base[ability];',
      'const base = workspace.report.character.abilities[ability];',
    ),
  ],
  base: [
    edit(
      'tests/integration/rules/ability-contributions.test.ts',
      `    db.exec(
      \`INSERT INTO character_effects (
         character_id, sort_order, effect_kind, ability, amount, maximum,
         source_instance_id, label
       ) VALUES (?, 1, 'ability_increase', 'strength', 2, 20, ?, 'Training')\`,
      [characterId, sourceId],
    );`,
      `    db.exec(
      \`INSERT INTO character_effects (
         character_id, sort_order, effect_kind, ability, amount, maximum,
         source_instance_id, label
       ) VALUES (?, 1, 'ability_increase', 'strength', 2, 20, ?, 'Training')\`,
      [characterId, sourceId],
    );
    db.exec(
      'UPDATE characters SET strength = 17 WHERE id = ?',
      [characterId],
    );`,
    ),
  ],
  cascade: [
    edit(
      'tests/integration/rules/ability-contributions.test.ts',
      `    db.exec(
      \`INSERT INTO character_effects (
         character_id, sort_order, effect_kind, ability, amount, maximum,
         source_instance_id, label
       ) VALUES (?, 1, 'ability_increase', 'strength', 2, 20, ?, 'Training')\`,
      [characterId, sourceId],
    );`,
      `    db.exec(
      \`INSERT INTO character_effects (
         character_id, sort_order, effect_kind, ability, amount, maximum, label
       ) VALUES (?, 1, 'ability_increase', 'strength', 2, 20, 'Training')\`,
      [characterId],
    );`,
    ),
    edit(
      'src/db/schema.sql',
      `\tCONSTRAINT "character_effects_ability_increase_source_check" CHECK(effect_kind IS NOT 'ability_increase' OR source_instance_id IS NOT NULL),\n`,
      '',
    ),
  ],
  'share-ability': [
    edit(
      'src/sharing/codec.ts',
      '...EFFECT_WIRE_FIELDS.map((field) => effect[field] ?? null),',
      `...EFFECT_WIRE_FIELDS.map((field) =>
      field === 'ability' ? null : effect[field] ?? null),`,
    ),
  ],
  'share-amount': [
    edit(
      'src/sharing/codec.ts',
      '...EFFECT_WIRE_FIELDS.map((field) => effect[field] ?? null),',
      `...EFFECT_WIRE_FIELDS.map((field) =>
      field === 'amount' ? null : effect[field] ?? null),`,
    ),
  ],
  'share-maximum': [
    edit(
      'src/sharing/codec.ts',
      '...EFFECT_WIRE_FIELDS.map((field) => effect[field] ?? null),',
      `...EFFECT_WIRE_FIELDS.map((field) =>
      field === 'maximum' ? null : effect[field] ?? null),`,
    ),
  ],
  provenance: [
    edit(
      'src/sharing/character-share.ts',
      `      (row.source_type === 'feat' ||
        row.source_type === 'species' ||
        row.source_type === 'background'),`,
      `      (row.source_type === 'feat' ||
        row.source_type === 'species'),`,
    ),
  ],
};

if (mutation === undefined || !(mutation in mutations)) {
  throw new Error(
    `Unknown mutation. Choose one of: ${Object.keys(mutations).join(', ')}`,
  );
}

if (action === 'apply') {
  if (existsSync(backupPath)) {
    throw new Error(`Backup already exists: ${backupPath}`);
  }
  const originals = {};
  for (const change of mutations[mutation]) {
    const absolute = resolve(root, change.path);
    const original = readFileSync(absolute, 'utf8');
    if (original.split(change.from).length !== 2) {
      throw new Error(
        `${mutation}: expected exactly one target in ${change.path}`,
      );
    }
    originals[change.path] = original;
    writeFileSync(absolute, original.replace(change.from, change.to));
  }
  writeFileSync(backupPath, JSON.stringify(originals));
  process.stdout.write(`applied ${mutation}\n`);
} else if (action === 'restore') {
  if (!existsSync(backupPath)) {
    throw new Error(`No backup exists: ${backupPath}`);
  }
  const originals = JSON.parse(readFileSync(backupPath, 'utf8'));
  for (const [path, contents] of Object.entries(originals)) {
    writeFileSync(resolve(root, path), contents);
  }
  unlinkSync(backupPath);
  process.stdout.write(`restored ${mutation}\n`);
} else {
  throw new Error('Usage: node tests/fixtures/b2-contribution-mutations.mjs apply|restore NAME');
}
