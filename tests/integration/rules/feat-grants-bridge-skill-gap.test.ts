import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CatalogImporter } from '../../../src/catalog/catalog-importer';
import { DatabaseContext } from '../../../src/db/database';
import { GrantRuleSlotGenerator } from '../../../src/grants/grant-rule-slot-generator';
import { activeGrantedSkills } from '../../../src/grants/skill-grants';
import { constructSkillProficiencyGrant } from '../../../tools/scrape/feat-grants-bridge';
import { featProjectorV1Vector } from '../../unit/catalog/fixtures/source-projector-v1-vectors';
import { openTestDatabase } from '../../helpers/open-db';

function document(kind: string, aggregate: object): string {
  return JSON.stringify([{ kind, aggregate }]);
}

/**
 * PINS THE GAP `feat-grants-bridge.ts`'s file comment names "THE SKILL GAP":
 * a `skill_proficiency` `GrantRule` naming a SPECIFIC skill is
 * `catalog.import`-valid, and once imported and applied to a character it
 * grants NOTHING, because two independent app modules both ignore the fixed
 * skill list on a feat grant —
 *
 *  - `src/queries/level-up-planned-choices.ts` (`forSelectedFeat`) builds
 *    its offered-skill list from every unheld skill and never reads
 *    `rule.skills` at all;
 *  - `src/grants/grant-rule-slot-generator.ts`'s `skill_proficiency` arm
 *    only materialises anything when `allows_tool_instead` is `true`, which
 *    this shape's grant never sets.
 *
 * `feat-grants-bridge.ts`'s `bridgeFeatProse` therefore does NOT wire
 * `constructSkillProficiencyGrant` into its `grants` output (codex round-1,
 * F2) — this test is the receipt for why: it goes through the REAL importer
 * (`CatalogImporter`, exactly the path `catalog.import` uses) and the REAL
 * apply pipeline (`character_source_instances` + `GrantRuleSlotGenerator`,
 * the same materialiser `applyLevelFeatSelection` in
 * `src/commands/level-feat-choice.ts` calls), then reads the skill back
 * through `activeGrantedSkills` — the sheet's own source-of-truth read (see
 * `skill-grants.ts`'s file comment). This is a PINNED-CURRENT-BEHAVIOUR
 * test: if the app ever starts reading `grant.skills` somewhere, this test
 * should start failing, and `bridgeFeatProse` should be updated to wire the
 * shape back in when it does.
 */
describe('GAP(feat-skill-apply)', () => {
  let connection: Database;
  let db: DatabaseContext;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
  });

  afterEach(() => connection.close());

  it('an imported fixed skill grant on a feat is accepted by the importer and ignored on apply', () => {
    const skillGrant = constructSkillProficiencyGrant('survival', 1);
    const aggregate = {
      ...featProjectorV1Vector.aggregate,
      name: 'Bridged Tracker (GAP fixture)',
      grants: [skillGrant],
    };

    // Step 1: the REAL importer accepts the document. This grant IS
    // catalog.import-valid — GrantRule.fromObject already proved that at
    // construction time, and this proves the aggregate-level validation
    // (parseSourceCatalogRecord -> projectFeatContentV1) agrees.
    new CatalogImporter(db).import({ documents: [document('feat', aggregate)] });

    const row = db.oneRaw(
      `SELECT id, content_key, grant_rules FROM feat_definitions WHERE name = ?`,
      [aggregate.name],
    );
    if (row === null) {
      throw new Error('Imported feat fixture is missing from feat_definitions.');
    }
    const featDefinitionId = Number(row.id);
    // The named skill really did round-trip into the stored row.
    expect(String(row.grant_rules)).toContain('"skills":["survival"]');

    // Step 2: apply the feat to a character — the same
    // character_source_instances + GrantRuleSlotGenerator pipeline
    // `applyLevelFeatSelection` (src/commands/level-feat-choice.ts) drives.
    const characterId = db.exec(
      "INSERT INTO characters (name) VALUES ('Gap Tester')",
    ).lastInsertId;
    const sourceId = db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config
       ) VALUES (?, ?, 'feat', ?, ?, '{}')`,
      [characterId, crypto.randomUUID(), featDefinitionId, aggregate.name],
    ).lastInsertId;

    new GrantRuleSlotGenerator(db).generateForSource(sourceId);

    // THE GAP: the character has an active feat source carrying a
    // skill_proficiency rule naming 'survival', and yet the sheet's own
    // source-of-truth read for granted skills comes back EMPTY. Nothing
    // grants Survival — not because the bridge under-recognised the
    // sentence, but because the app has no path from a fixed named-skill
    // feat grant to a character's skills today.
    expect(activeGrantedSkills(db, characterId)).toEqual([]);

    // And the row-level table `rebuildSkillProjection` derives from —
    // character_skill_grants — carries nothing for this source either, so
    // this is not a projection-staleness artefact.
    expect(
      Number(
        db.scalar(
          `SELECT count(*) FROM character_skill_grants WHERE character_id = ?`,
          [characterId],
        ),
      ),
    ).toBe(0);
  });
});
