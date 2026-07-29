import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const mutation = process.argv[3];
const action = process.argv[2];
const backupPath = resolve(
  '/tmp',
  `dnd-multiclass-spells-static-level-up-${mutation ?? 'unknown'}.json`,
);

const edit = (path, from, to) => ({ path, from, to });

/**
 * Mutations for the straight-class level-up controls
 * (`docs/design/2026-07-29-straight-class-level-up.md` §8, reduced by D77's
 * fixed-hit-points-only ruling and D80's strike of the level-3 subclass
 * refusal). The unit under test is `src/commands/level-up-class.ts` and
 * `src/rules/class-asi-levels-srd.ts`, exercised by
 * `tests/integration/commands/level-up-class.test.ts`.
 *
 * Same apply/restore convention as `tests/fixtures/skills-provenance-mutations.mjs`:
 * assert exactly one match before editing, back up the pre-mutation source,
 * restore cleanly. Applied for a VITEST run only — a mutation is not
 * required to type-check (`asi-union` and `subclass-refusal` both write a
 * reason string outside `LevelUpRefusalReason`'s literal union, on the
 * `S-LEGACY` precedent of casting rather than widening the real type).
 *
 * `hp-fixed`, `straight` and `adjacent` are single mutations. `asi-single`
 * and `asi-union` are TWO SEPARATE mutations for one control (L-ASI-LEVELS,
 * §8): a hardcoded `[4]` alone passes every Fighter-6/Rogue-10 case by
 * accident of the SAME wrong literal appearing to work, and a hardcoded
 * union alone passes every "class has no ASI here" case by accident of the
 * union being a superset. Each must be applied and proven separately.
 */
const mutations = {
  // L-HP-FIXED (§8): drop the Constitution term from every level PAST THE
  // FIRST, leaving only the fixed die value. The fixture character is
  // Constitution 14 (+2, non-zero) and a Fighter (d10, fixed 6) — a level 2
  // total of 12 (level 1) + 6 (level 2, no Con) = 18 rather than the real
  // 20, so the mutation is observable rather than hidden behind a zero
  // modifier or a formula that happens to coincide with another one.
  'hp-fixed': [
    edit(
      'src/rules/sheet.ts',
      `      const base = roll ?? fixedHitPointsPerLevel(die);
      maximum += Math.max(1, base + conModifier);`,
      `      const base = roll ?? fixedHitPointsPerLevel(die);
      maximum += Math.max(1, base);`,
    ),
  ],
  // L-ASI-LEVELS, mutation 1 of 2 (§8): the seeded per-class table is
  // replaced by a hardcoded `[4]` for every class. Must fail: a Fighter
  // levelling 5 -> 6 stops requiring an increase, because Fighter's real
  // ASI levels are 4/6/8/12/14/16 and 6 is no longer among the hardcoded
  // set.
  'asi-single': [
    edit(
      'src/rules/class-asi-levels-srd.ts',
      `export function asiLevelsForClassName(
  className: string,
): ReadonlySet<number> | null {
  return ASI_LEVELS_BY_CLASS_NAME.get(className) ?? null;
}`,
      `export function asiLevelsForClassName(
  className: string,
): ReadonlySet<number> | null {
  void className;
  return new Set([4]);
}`,
    ),
  ],
  // L-ASI-LEVELS, mutation 2 of 2 (§8): the seeded per-class table is
  // replaced by the hardcoded UNION across all twelve tables — D78's own
  // mistake, made executable again. Must fail: a Wizard levelling 5 -> 6 is
  // wrongly REFUSED for an increase it does not grant, because the Wizard's
  // real ASI levels are 4/8/12/16 and 6 is only in Fighter's table.
  'asi-union': [
    edit(
      'src/rules/class-asi-levels-srd.ts',
      `export function asiLevelsForClassName(
  className: string,
): ReadonlySet<number> | null {
  return ASI_LEVELS_BY_CLASS_NAME.get(className) ?? null;
}`,
      `export function asiLevelsForClassName(
  className: string,
): ReadonlySet<number> | null {
  void className;
  return new Set([4, 6, 8, 10, 12, 14, 16]);
}`,
    ),
  ],
  // L-STRAIGHT (§8): the class-not-held guard never fires. Must fail: a
  // Wizard level-up refusal by name stops appearing for a character who
  // only holds a Fighter — `UpdateClassCommand` has no such guard, so
  // nothing else in the app would catch the regression.
  straight: [
    edit(
      'src/commands/level-up-class.ts',
      `    if (held === null) {
      refuse(
        LEVEL_UP_REFUSAL_REASONS.classNotHeld,
        \`This character has no \${definition.name} levels to advance.\`,
      );
    }`,
      `    if (false) {
      refuse(
        LEVEL_UP_REFUSAL_REASONS.classNotHeld,
        \`This character has no \${definition.name} levels to advance.\`,
      );
    }`,
    ),
  ],
  // L-ADJACENT (§8): the non-adjacent-level guard never fires. Must fail:
  // levelling a Fighter 2 -> 7 in one command stops being refused.
  adjacent: [
    edit(
      'src/commands/level-up-class.ts',
      `    if (targetLevel !== held.level + 1) {
      refuse(
        LEVEL_UP_REFUSAL_REASONS.levelNotAdjacent,`,
      `    if (false) {
      refuse(
        LEVEL_UP_REFUSAL_REASONS.levelNotAdjacent,`,
    ),
  ],
  // L-NO-SUBCLASS-REFUSAL (§8): the `subclass_required` refusal D80 struck
  // is put back. Must fail: a Wizard (unseeded subclass) levelling 2 -> 3
  // WITHOUT a subclass content key, which D70/D80 require to PROCEED, is
  // refused instead — proving the struck decision would stay struck only
  // because a control watches it.
  'subclass-refusal': [
    edit(
      'src/commands/level-up-class.ts',
      `    const subclassKey = this.payload.subclass_content_key ?? null;
    if (targetLevel !== LEVEL_UP_SUBCLASS_LEVEL && subclassKey !== null) {`,
      `    const subclassKey = this.payload.subclass_content_key ?? null;
    if (targetLevel === LEVEL_UP_SUBCLASS_LEVEL && subclassKey === null) {
      refuse(
        'subclass_required',
        \`\${definition.name} needs a subclass chosen at level \` +
          \`\${String(LEVEL_UP_SUBCLASS_LEVEL)}.\`,
      );
    }
    if (targetLevel !== LEVEL_UP_SUBCLASS_LEVEL && subclassKey !== null) {`,
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
    const current = readFileSync(absolute, 'utf8');
    if (current.split(change.from).length !== 2) {
      throw new Error(
        `${mutation}: expected exactly one target in ${change.path}`,
      );
    }
    originals[change.path] ??= current;
    writeFileSync(absolute, current.replace(change.from, change.to));
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
  throw new Error(
    'Usage: node tests/fixtures/level-up-mutations.mjs apply|restore NAME',
  );
}
