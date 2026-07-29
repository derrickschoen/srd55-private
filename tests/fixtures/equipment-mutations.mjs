import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const mutation = process.argv[3];
const action = process.argv[2];
const backupPath = resolve(
  '/tmp',
  `dnd-multiclass-spells-static-equipment-${mutation ?? 'unknown'}.json`,
);

const edit = (path, from, to) => ({ path, from, to });

/**
 * Mutations for the starting-equipment controls (plan
 * `docs/design/2026-07-29-starting-equipment.md` §6), dispatch E-A:
 * E-SOURCE, E-PRESERVE, E-NO-GEAR, E-PLURAL. The E-B-dependent controls
 * (E-NO-GOLD-SHOWN, E-NO-GOLD-OFFERED, E-COMPLETE) have no code site until
 * the step exists and are deliberately absent — a mutation that lands in
 * nothing is the trap §6's own retargeting history warns about.
 *
 * Same apply/restore convention as
 * `tests/fixtures/skills-provenance-mutations.mjs`. Applied for a VITEST run
 * only; a mutation is not required to type-check.
 */
const mutations = {
  // E-SOURCE (§6): the mint drops the source stamp — the §5 trap made
  // executable: every count is right, the AC is right, and only provenance
  // is gone. Must fail: a granted Greatsword is asserted DISTINGUISHABLE
  // from a hand-added one on `source_instance_id`, not on any count.
  source: [
    edit(
      'src/grants/equipment-grants.ts',
      `  const row: Record<string, unknown> = {
    character_id: characterId,
    source_instance_id: sourceInstanceId,
    proficiency_category: weaponProficiencyCategoryOf(group as SrdWeaponGroup),`,
      `  const row: Record<string, unknown> = {
    character_id: characterId,
    source_instance_id: null,
    proficiency_category: weaponProficiencyCategoryOf(group as SrdWeaponGroup),`,
    ),
  ],
  // E-PRESERVE (§6): the option-change cleanup removes by `character_id`
  // alone — the species-cleanup trap re-created. Must fail: the fixture's
  // hand-added weapon COLLIDES by name with a granted one and must survive
  // the switch from option A to option B.
  preserve: [
    edit(
      'src/grants/equipment-grants.ts',
      `  db.exec(
    \`DELETE FROM character_weapons
     WHERE character_id = ? AND source_instance_id = ?\`,
    [characterId, sourceInstanceId],
  );
  db.exec(
    \`DELETE FROM character_armor
     WHERE character_id = ? AND source_instance_id = ?\`,
    [characterId, sourceInstanceId],
  );`,
      `  db.exec(
    \`DELETE FROM character_weapons
     WHERE character_id = ?\`,
    [characterId],
  );
  db.exec(
    \`DELETE FROM character_armor
     WHERE character_id = ?\`,
    [characterId],
  );`,
    ),
  ],
  // E-NO-GEAR (§6): the mint also creates owned rows for `gear` items.
  // Must fail: a Dungeoneer's Pack (and the trailing GP line, which IS a
  // gear row) produces no owned row.
  gear: [
    edit(
      'src/grants/equipment-grants.ts',
      `      // \`gear\` mints NOTHING (D65): a Dungeoneer's Pack and a trailing GP
      // line render from the rules tables and are never owned.
    }`,
      `      else {
        for (let count = 0; count < item.quantity; count += 1) {
          db.exec(
            \`INSERT INTO character_weapons (
               character_id, source_instance_id, name
             ) VALUES (?, ?, ?)\`,
            [params.character_id, sourceInstanceId, item.item_name],
          );
        }
      }
    }`,
    ),
  ],
  // E-PLURAL (§0b, §6): the seed classification reverts to leaving plural
  // bundles as gear — the sinker that silently disarmed the Bard. Emptying
  // the declared map is the whole mutation: the exercised-entries guard
  // iterates its entries, so with none declared it has nothing to defend and
  // the parse quietly produces gear again, exactly the pre-fix state.
  plural: [
    edit(
      'src/rules/class-equipment-srd.ts',
      `const DECLARED_WEAPON_EQUIPMENT = new Map<string, string>([
  ['Daggers', 'Dagger'],
  ['Handaxes', 'Handaxe'],
  ['Javelins', 'Javelin'],
]);`,
      `const DECLARED_WEAPON_EQUIPMENT = new Map<string, string>([]);`,
    ),
  ],
};

const selected = mutations[mutation];
if (selected === undefined) {
  console.error(
    `Unknown mutation "${mutation}". Known: ${Object.keys(mutations).join(', ')}`,
  );
  process.exit(1);
}

if (action === 'apply') {
  const backup = {};
  for (const { path } of selected) {
    backup[path] = readFileSync(resolve(root, path), 'utf8');
  }
  writeFileSync(backupPath, JSON.stringify(backup));
  for (const { path, from, to } of selected) {
    const source = readFileSync(resolve(root, path), 'utf8');
    if (!source.includes(from)) {
      console.error(`Mutation target not found in ${path}.`);
      process.exit(1);
    }
    writeFileSync(resolve(root, path), source.replace(from, to));
  }
  console.log(`Applied ${mutation}.`);
} else if (action === 'restore') {
  if (!existsSync(backupPath)) {
    console.error(`No backup for ${mutation}; nothing to restore.`);
    process.exit(1);
  }
  const backup = JSON.parse(readFileSync(backupPath, 'utf8'));
  for (const [path, content] of Object.entries(backup)) {
    writeFileSync(resolve(root, path), content);
  }
  unlinkSync(backupPath);
  console.log(`Restored ${mutation}.`);
} else {
  console.error('Usage: node equipment-mutations.mjs <apply|restore> <name>');
  process.exit(1);
}
