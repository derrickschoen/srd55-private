import {
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const action = process.argv[2];
const requestedKey = process.argv[3];

const edit = (path, anchor, replacement) => ({
  path,
  anchor,
  replacement,
});

/**
 * Mutation controls for Armor Class resolution
 * (`Armor Class, items, and one effect vocabulary` §8).
 *
 * Every entry names the exact test contract that must fail. Anchors are
 * matched exactly once against the current source, and all edits are validated
 * in memory before anything is written. A missing or duplicated anchor is a
 * hard failure: an unapplied mutation cannot count as a surviving mutant.
 */
const controls = {
  'AC-ELIGIBILITY': {
    key: 'AC-ELIGIBILITY',
    description:
      'Ranks an unarmoured formula against worn armour before deciding whether the broken unarmoured condition excludes it.',
    tests: [
      'tests/unit/rules/sheet.test.ts > armor class > discards every unarmoured formula outright while body armour is worn',
    ],
    edits: [
      edit(
        'src/rules/sheet.ts',
        `    if (wornArmorName !== undefined) {
      excluded.push({`,
        `    if (
      wornArmorName !== undefined &&
      eligible.some(
        (candidate) =>
          candidate.total >=
          formula.base +
            input.scores.score(formula.ability_1).modifier() +
            (formula.ability_2 === null
              ? 0
              : input.scores.score(formula.ability_2).modifier()),
      )
    ) {
      excluded.push({`,
      ),
    ],
  },
  'AC-SHIELD-BASE': {
    key: 'AC-SHIELD-BASE',
    description:
      'Treats the shield only as a late addend, leaving shield-forbidden formulas eligible for the base competition.',
    tests: [
      'tests/unit/rules/sheet.test.ts > armor class > re-runs formula eligibility before adding a shield',
    ],
    edits: [
      edit(
        'src/rules/sheet.ts',
        `    if (shieldName !== undefined && !formula.allows_shield) {`,
        `    if (
      shieldName !== undefined &&
      !formula.allows_shield &&
      false
    ) {`,
      ),
    ],
  },
  'AC-FLOOR': {
    key: 'AC-FLOOR',
    description:
      'Removes the always-present 10 + Dexterity floor from the unarmoured candidate list.',
    tests: [
      'tests/unit/rules/sheet.test.ts > armor class > keeps the floor when the only supplied formula is excluded by a shield',
    ],
    edits: [
      edit(
        'src/rules/sheet.ts',
        `  const unarmouredFormulas = [floor, ...input.formulas];`,
        `  const unarmouredFormulas = [...input.formulas];`,
      ),
    ],
  },
  'AC-TIE-STABLE': {
    key: 'AC-TIE-STABLE',
    description:
      'Replaces source-category-and-label ordering with database source_instance_id ordering.',
    tests: [
      'tests/integration/rules/armor-class-controls.test.ts > Armor Class mutation controls > keeps the source-and-label tie winner stable across a clone with inverted source ids',
    ],
    edits: [
      edit(
        'src/rules/sheet.ts',
        `  readonly source: Exclude<ArmorClassSourceCategory, 'worn_armor'>;
  readonly base: number;`,
        `  readonly source: Exclude<ArmorClassSourceCategory, 'worn_armor'>;
  readonly source_instance_id?: number | null;
  readonly base: number;`,
      ),
      edit(
        'src/queries/character-sheet-builder.ts',
        `        source: armorClassSource(effect),
        base: effect.base,`,
        `        source: armorClassSource(effect),
        source_instance_id: effect.source_instance_id,
        base: effect.base,`,
      ),
      edit(
        'src/rules/sheet.ts',
        `  const sourceDifference =
    ARMOR_CLASS_SOURCE_PRECEDENCE.indexOf(left.formula.source) -
    ARMOR_CLASS_SOURCE_PRECEDENCE.indexOf(right.formula.source);
  if (sourceDifference !== 0) {
    return sourceDifference;
  }
  if (left.formula.label < right.formula.label) {
    return -1;
  }
  if (left.formula.label > right.formula.label) {
    return 1;
  }
  return 0;`,
        `  const leftSourceId =
    left.formula.kind === 'ability_formula'
      ? (left.formula.source_instance_id ?? Number.MAX_SAFE_INTEGER)
      : Number.MAX_SAFE_INTEGER;
  const rightSourceId =
    right.formula.kind === 'ability_formula'
      ? (right.formula.source_instance_id ?? Number.MAX_SAFE_INTEGER)
      : Number.MAX_SAFE_INTEGER;
  return leftSourceId - rightSourceId;`,
      ),
    ],
  },
  'AC-PROFICIENCY': {
    key: 'AC-PROFICIENCY',
    description:
      'Filters equipped armour out of Armor Class unless one held class grants training in its category.',
    tests: [
      'tests/integration/queries/character-sheet.test.ts > the derived character sheet > keeps non-proficient armour AC and the armor_not_trained warning together',
    ],
    edits: [
      edit(
        'src/queries/character-sheet-builder.ts',
        `      equipment: armorRows.map(
        (row): EquippedArmor => ({`,
        `      equipment: armorRows
        .filter((row) =>
          classes.some((entry) =>
            entry.proficiencies.armor_training.some(
              (grant) => grant.grant === row.category,
            ),
          ),
        )
        .map(
        (row): EquippedArmor => ({`,
      ),
    ],
  },
  'AC-ATTUNEMENT': {
    key: 'AC-ATTUNEMENT',
    description:
      'Drops the item-attunement gate so a required but unattuned item grants its effects; the named four-state fixture also rejects dropping every item-owned effect.',
    tests: [
      'tests/integration/queries/character-sheet.test.ts > the derived character sheet > gates every mechanical effect reader through item attunement',
    ],
    edits: [
      edit(
        'src/rules/eligible-character-effects.ts',
        `  WHERE effect.character_id = ?
    AND (
      effect.character_item_id IS NULL
      OR item.requires_attunement = 0
      OR item.attuned = 1
    )\`;`,
        `  WHERE effect.character_id = ?\`;`,
      ),
    ],
  },
};

if (
  requestedKey === undefined ||
  !Object.prototype.hasOwnProperty.call(controls, requestedKey)
) {
  throw new Error(
    `Unknown control. Choose one of: ${Object.keys(controls).join(', ')}`,
  );
}

const control = controls[requestedKey];
if (control.key !== requestedKey) {
  throw new Error(`Control key mismatch for ${requestedKey}.`);
}
const backupPath = resolve(
  '/tmp',
  `dnd-multiclass-spells-static-armor-class-${control.key}.json`,
);

if (action === 'apply') {
  if (existsSync(backupPath)) {
    throw new Error(`Backup already exists: ${backupPath}`);
  }

  const originals = {};
  const mutated = {};
  for (const change of control.edits) {
    const absolute = resolve(root, change.path);
    const current =
      mutated[change.path] ?? readFileSync(absolute, 'utf8');
    const matches = current.split(change.anchor).length - 1;
    if (matches !== 1) {
      throw new Error(
        `${control.key}: expected exactly one anchor in ${change.path}; found ${String(matches)}`,
      );
    }
    originals[change.path] ??= current;
    mutated[change.path] = current.replace(
      change.anchor,
      change.replacement,
    );
  }

  writeFileSync(backupPath, JSON.stringify({ originals, mutated }));
  for (const [path, contents] of Object.entries(mutated)) {
    writeFileSync(resolve(root, path), contents);
  }
  process.stdout.write(
    `applied ${control.key}\n` +
      `description: ${control.description}\n` +
      `must fail: ${control.tests.join('; ')}\n`,
  );
} else if (action === 'revert') {
  if (!existsSync(backupPath)) {
    throw new Error(`No backup exists: ${backupPath}`);
  }
  const backup = JSON.parse(readFileSync(backupPath, 'utf8'));
  for (const [path, contents] of Object.entries(backup.mutated)) {
    const current = readFileSync(resolve(root, path), 'utf8');
    if (current !== contents) {
      throw new Error(
        `${control.key}: ${path} changed after mutation; refusing to overwrite it`,
      );
    }
  }
  for (const [path, contents] of Object.entries(backup.originals)) {
    writeFileSync(resolve(root, path), contents);
  }
  unlinkSync(backupPath);
  process.stdout.write(`reverted ${control.key}\n`);
} else {
  throw new Error(
    'Usage: node tests/fixtures/armor-class-mutations.mjs apply|revert CONTROL',
  );
}
