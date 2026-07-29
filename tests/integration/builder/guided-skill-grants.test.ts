import { afterEach, describe, expect, it } from 'vitest';
import {
  GUIDED_RPC,
  SKILL_GRANT_KEYS,
  SPECIES_SKILL_GRANT_PLANS,
  type SkillGrantRefusalData,
} from '../../../src/builder/contracts';
import { MAGIC_INITIATE_FEAT_CONTENT_KEY } from '../../../src/builder/background-choices';
import {
  applyGuidedBackgroundChoices,
  applyGuidedOrigin,
  createGuidedCharacter,
  listGuidedBackgroundChoiceOptions,
  listGuidedClassOptions,
  listGuidedOriginOptions,
} from '../../../src/builder/guided-creation';
import { CharacterCommandExecutor } from '../../../src/commands/character-command-executor';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { UpdateClassCommand } from '../../../src/commands/update-class';
import type { DatabaseContext } from '../../../src/db/database';
import type { Skill } from '../../../src/domain/enums';
import {
  activeGrantedSkills,
  resolveSkillGrants,
  SkillGrantRefusal,
} from '../../../src/grants/skill-grants';
import { skillFromLabel } from '../../../src/rules/skills';
import { rpcRegistry } from '../../../src/worker/registry';
import {
  createRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';

/**
 * THE S-B PRODUCERS (skills-with-provenance §4 S-B), against the full
 * application seed and the real guided applies:
 *
 *  - the BACKGROUND writes its two printed skills as FILLED grants under its
 *    own marker-tagged source instance, normalised from prose to verified
 *    `Skill` values (S-BACKGROUND's subject: S4 proved they were unapplied
 *    before this unit);
 *  - ELF and HUMAN get structured species grants — unfilled CHOICE slots
 *    minted by the generator's species arm — and HUMAN gains the species
 *    source instance S7 proved it lacked;
 *  - the §3.3 collision on a background whose printed skill is already held
 *    refuses with the NAMED `skill_already_held` and rolls the whole apply
 *    back;
 *  - producer-minted grants SURVIVE class-arm regeneration, because the two
 *    arms reconcile disjoint grant-key scopes.
 */
let harness: RpcHarness | undefined;

afterEach(() => {
  harness?.close();
  harness = undefined;
});

async function applicationDatabase(): Promise<RpcHarness> {
  harness = await createRpcHarness([]);
  return harness;
}

const integrity = () =>
  new CharacterCommandIntegrity('guided-skill-grants-test-key');

function createFighter(db: DatabaseContext, name: string): number {
  const fighter = listGuidedClassOptions(db).find(
    (option) => option.name === 'Fighter',
  );
  if (fighter === undefined) {
    throw new Error('The bundled class catalogue has no Fighter.');
  }
  return createGuidedCharacter(
    db,
    { name, class_content_key: fighter.content_key },
    integrity(),
  ).id;
}

function backgroundTemplateProse(db: DatabaseContext, contentKey: string) {
  const row = db.oneRaw(
    `SELECT name, skill_proficiency_1, skill_proficiency_2
     FROM background_templates WHERE content_key = ?`,
    [contentKey],
  );
  if (row === null) {
    throw new Error(`No background template for ${contentKey}.`);
  }
  return {
    name: String(row.name),
    printed: [
      String(row.skill_proficiency_1),
      String(row.skill_proficiency_2),
    ] as const,
  };
}

function nonMagicInitiateFeat(db: DatabaseContext): string {
  const feat = listGuidedBackgroundChoiceOptions(db).origin_feats.find(
    (candidate) => candidate.content_key !== MAGIC_INITIATE_FEAT_CONTENT_KEY,
  );
  if (feat === undefined) {
    throw new Error('The seeded Origin feat catalogue has no config-free feat.');
  }
  return feat.content_key;
}

function applyBackground(
  db: DatabaseContext,
  characterId: number,
  contentKey: string,
): void {
  applyGuidedBackgroundChoices(db, {
    character_id: characterId,
    content_key: contentKey,
    increases: [
      { ability: 'wisdom', amount: 2 },
      { ability: 'charisma', amount: 1 },
    ],
    origin_feat_content_key: nonMagicInitiateFeat(db),
    origin_feat_config: {},
  });
}

function backgroundSkillGrants(db: DatabaseContext, characterId: number) {
  return db.allRaw(
    `SELECT g.ordinal, g.skill, g.state, s.notes AS source_notes,
            s.source_type
     FROM character_skill_grants AS g
     INNER JOIN character_source_instances AS s
       ON s.id = g.source_instance_id
     WHERE g.character_id = ? AND g.grant_key = ?
     ORDER BY g.ordinal`,
    [characterId, SKILL_GRANT_KEYS.backgroundSkill],
  );
}

function speciesNamed(db: DatabaseContext, name: string) {
  const option = listGuidedOriginOptions(db, 'species').find(
    (candidate) => candidate.name === name,
  );
  if (option === undefined) {
    throw new Error(`The bundled species catalogue has no ${name}.`);
  }
  return option;
}

function applySpecies(
  db: DatabaseContext,
  characterId: number,
  name: string,
): void {
  applyGuidedOrigin(db, {
    character_id: characterId,
    kind: 'species',
    content_key: speciesNamed(db, name).content_key,
  });
}

function speciesSkillGrants(db: DatabaseContext, characterId: number) {
  return db.allRaw(
    `SELECT g.grant_key, g.ordinal, g.skill, g.state,
            s.display_name, s.notes AS source_notes
     FROM character_skill_grants AS g
     INNER JOIN character_source_instances AS s
       ON s.id = g.source_instance_id
     WHERE g.character_id = ?
       AND g.grant_key IN (?, ?)
     ORDER BY g.id`,
    [
      characterId,
      SKILL_GRANT_KEYS.speciesKeenSenses,
      SKILL_GRANT_KEYS.speciesSkillful,
    ],
  );
}

function projectionSkills(db: DatabaseContext, characterId: number): string[] {
  return db
    .allRaw(
      `SELECT skill FROM character_skill_proficiencies
       WHERE character_id = ? ORDER BY skill`,
      [characterId],
    )
    .map((row) => String(row.skill));
}

describe('the background producer', () => {
  it('writes the two printed skills as FILLED grants under its own marker-tagged source, normalised from prose', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const characterId = createFighter(db, 'Background Producer');
    const background = listGuidedBackgroundChoiceOptions(db).backgrounds[0];
    if (background === undefined) {
      throw new Error('The bundled background catalogue is empty.');
    }
    const prose = backgroundTemplateProse(db, background.content_key);
    const expected = prose.printed.map((label) => skillFromLabel(label));
    // FIXTURE-OBSERVABILITY GUARD: both printed skills must normalise, or the
    // grants below could not carry verified values at all.
    expect(expected[0]).not.toBeNull();
    expect(expected[1]).not.toBeNull();

    applyBackground(db, characterId, background.content_key);

    expect(backgroundSkillGrants(db, characterId)).toEqual([
      {
        ordinal: 1,
        skill: expected[0],
        state: 'active',
        source_notes: 'guided:background-apply',
        source_type: 'background',
      },
      {
        ordinal: 2,
        skill: expected[1],
        state: 'active',
        source_notes: 'guided:background-apply',
        source_type: 'background',
      },
    ]);
    // The sheet's read and the projection both carry them.
    const granted = activeGrantedSkills(db, characterId);
    expect(granted).toContain(expected[0]);
    expect(granted).toContain(expected[1]);
    expect(projectionSkills(db, characterId)).toEqual(
      [...(expected as readonly (Skill | null)[])].map(String).sort(),
    );
    // §3.3: held background skills never reduce the class's unfilled
    // ordinals — Fighter still owes exactly its two choices.
    expect(resolveSkillGrants(db, characterId).unfilledClassGrants).toHaveLength(
      2,
    );
  });

  it('normalises the printed prose of EVERY bundled background — no seeded skill escapes the vocabulary', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const backgrounds = listGuidedBackgroundChoiceOptions(db).backgrounds;
    expect(backgrounds.length).toBeGreaterThan(0);
    for (const background of backgrounds) {
      const prose = backgroundTemplateProse(db, background.content_key);
      for (const label of prose.printed) {
        expect(
          skillFromLabel(label),
          `${prose.name} prints ${JSON.stringify(label)}`,
        ).not.toBeNull();
      }
    }
  });

  it('REPLACES the previous background\'s grants when the background changes', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const characterId = createFighter(db, 'Background Switcher');
    const options = listGuidedBackgroundChoiceOptions(db).backgrounds;
    // Two backgrounds whose printed skill sets differ, so the replace is
    // observable.
    const [first, second] = (() => {
      for (const a of options) {
        for (const b of options) {
          const skillsOf = (key: string) =>
            backgroundTemplateProse(db, key).printed.join('|');
          if (
            a.content_key !== b.content_key &&
            skillsOf(a.content_key) !== skillsOf(b.content_key)
          ) {
            return [a, b] as const;
          }
        }
      }
      throw new Error('No two bundled backgrounds differ in printed skills.');
    })();

    applyBackground(db, characterId, first.content_key);
    applyBackground(db, characterId, second.content_key);

    const expected = backgroundTemplateProse(db, second.content_key).printed.map(
      (label) => skillFromLabel(label),
    );
    const grants = backgroundSkillGrants(db, characterId);
    expect(grants).toHaveLength(2);
    expect(grants.map((row) => row.skill)).toEqual(expected);
    // The projection follows: only the second background's skills remain.
    expect(projectionSkills(db, characterId)).toEqual(
      expected.map(String).sort(),
    );
  });

  it('refuses the §3.3 collision with the NAMED skill_already_held and rolls the whole apply back', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const characterId = createFighter(db, 'Collision Character');

    // Find a background whose printed skill sits in Fighter's pool, and fill
    // a Fighter class ordinal with it FIRST — the player's own choice.
    const resolved = resolveSkillGrants(db, characterId);
    const fighterGrant = resolved.unfilledClassGrants[0];
    if (fighterGrant === undefined) {
      throw new Error('Fighter minted no class grants.');
    }
    const candidates = listGuidedBackgroundChoiceOptions(db).backgrounds;
    const collision = (() => {
      for (const background of candidates) {
        const prose = backgroundTemplateProse(db, background.content_key);
        for (const label of prose.printed) {
          const skill = skillFromLabel(label);
          if (skill !== null && fighterGrant.available.includes(skill)) {
            return { background, skill };
          }
        }
      }
      throw new Error(
        'No bundled background prints a skill in the Fighter pool; the collision is unobservable.',
      );
    })();

    await new CharacterCommandExecutor(db, integrity()).execute({
      character_id: characterId,
      operation_uuid: crypto.randomUUID(),
      expected_revision: 0,
      command: {
        type: 'fill_skill_grant',
        grant_id: fighterGrant.grant_id,
        skill: collision.skill,
      },
    });

    let refusal: SkillGrantRefusal | null = null;
    try {
      applyBackground(db, characterId, collision.background.content_key);
    } catch (error) {
      if (!(error instanceof SkillGrantRefusal)) {
        throw error;
      }
      refusal = error;
    }
    if (refusal === null) {
      throw new Error('The colliding background apply did not refuse.');
    }
    expect(refusal.reason).toBe('skill_already_held');
    expect(refusal.skill).toBe(collision.skill);

    // ROLLED BACK WHOLE: no recorded background, no marker source, no
    // background grants — and the player's own class fill is untouched.
    expect(
      db.scalar(
        'SELECT count(*) FROM character_background WHERE character_id = ?',
        [characterId],
      ),
    ).toBe(0);
    expect(
      db.scalar(
        `SELECT count(*) FROM character_source_instances
         WHERE character_id = ? AND source_type = 'background'`,
        [characterId],
      ),
    ).toBe(0);
    expect(backgroundSkillGrants(db, characterId)).toEqual([]);
    expect(activeGrantedSkills(db, characterId)).toEqual([collision.skill]);
  });
});

describe('the species producers', () => {
  it('mints Elf\'s Keen Senses as one UNFILLED choice grant under the guided species source', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const characterId = createFighter(db, 'Elf Producer');

    applySpecies(db, characterId, 'Elf');

    expect(speciesSkillGrants(db, characterId)).toEqual([
      {
        grant_key: SKILL_GRANT_KEYS.speciesKeenSenses,
        ordinal: 1,
        skill: null,
        state: 'active',
        display_name: 'Elf',
        source_notes: 'guided:species-apply',
      },
    ]);
    // An unfilled SPECIES grant is not a class obligation: the class's two
    // ordinals are the only unfilled CLASS grants the resolver reports.
    expect(
      resolveSkillGrants(db, characterId).unfilledClassGrants,
    ).toHaveLength(2);
  });

  it('mints Human\'s species source instance AND its unfilled Skillful grant — the source S7 proved was missing', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const characterId = createFighter(db, 'Human Producer');

    applySpecies(db, characterId, 'Human');

    // The definition row exists (seeded by origin-definitions-srd) and the
    // guided bridge minted a source from it.
    expect(
      db.allRaw(
        `SELECT source_type, display_name, notes
         FROM character_source_instances
         WHERE character_id = ? AND source_type = 'species'`,
        [characterId],
      ),
    ).toEqual([
      {
        source_type: 'species',
        display_name: 'Human',
        notes: 'guided:species-apply',
      },
    ]);
    expect(speciesSkillGrants(db, characterId)).toEqual([
      {
        grant_key: SKILL_GRANT_KEYS.speciesSkillful,
        ordinal: 1,
        skill: null,
        state: 'active',
        display_name: 'Human',
        source_notes: 'guided:species-apply',
      },
    ]);
    // Human grants no spells: the empty-rule definition minted no slots.
    expect(
      db.scalar(
        `SELECT count(*) FROM spell_selection_slots WHERE character_id = ?`,
        [characterId],
      ),
    ).toBe(0);
  });

  it('replaces species grants on switch, and leaves none (and a clean projection) for a species without a plan', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const characterId = createFighter(db, 'Species Switcher');

    applySpecies(db, characterId, 'Elf');
    // Fill Keen Senses so the switch has a PROJECTED skill to clean up.
    const keenSenses = speciesSkillGrants(db, characterId)[0];
    const grantId = Number(
      db.scalar(
        `SELECT id FROM character_skill_grants
         WHERE character_id = ? AND grant_key = ?`,
        [characterId, SKILL_GRANT_KEYS.speciesKeenSenses],
      ),
    );
    expect(keenSenses).toBeDefined();
    await new CharacterCommandExecutor(db, integrity()).execute({
      character_id: characterId,
      operation_uuid: crypto.randomUUID(),
      expected_revision: 0,
      command: {
        type: 'fill_skill_grant',
        grant_id: grantId,
        skill: 'perception',
      },
    });
    expect(projectionSkills(db, characterId)).toEqual(['perception']);

    applySpecies(db, characterId, 'Human');
    const afterHuman = speciesSkillGrants(db, characterId);
    expect(afterHuman).toHaveLength(1);
    expect(afterHuman[0]).toMatchObject({
      grant_key: SKILL_GRANT_KEYS.speciesSkillful,
      skill: null,
    });
    // Elf's filled Keen Senses went with its hard-deleted source, and the
    // projection was reconciled rather than left stale.
    expect(projectionSkills(db, characterId)).toEqual([]);

    // Dwarf has no definition and no plan: no species source, no species
    // grants, still a clean projection.
    applySpecies(db, characterId, 'Dwarf');
    expect(speciesSkillGrants(db, characterId)).toEqual([]);
    expect(projectionSkills(db, characterId)).toEqual([]);
  });

  it('keeps producer-minted grants alive through class-arm regeneration (disjoint scopes)', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const characterId = createFighter(db, 'Scope Keeper');
    applySpecies(db, characterId, 'Human');
    const background = listGuidedBackgroundChoiceOptions(db).backgrounds[0];
    if (background === undefined) {
      throw new Error('The bundled background catalogue is empty.');
    }
    applyBackground(db, characterId, background.content_key);

    // A class edit re-runs the generator over the class source — the class
    // arm reconciles ONLY the two class keys, so nothing here may orphan the
    // producers' grants.
    const fighterId = Number(
      db.scalar(`SELECT id FROM class_definitions WHERE name = 'Fighter'`),
    );
    new UpdateClassCommand(
      db,
      { type: 'update_class', class_definition_id: fighterId, level: 2 },
      integrity(),
    ).apply(characterId);

    expect(backgroundSkillGrants(db, characterId)).toHaveLength(2);
    expect(
      backgroundSkillGrants(db, characterId).every(
        (row) => row.state === 'active',
      ),
    ).toBe(true);
    expect(speciesSkillGrants(db, characterId)).toMatchObject([
      { state: 'active', skill: null },
    ]);
  });
});

describe('the fill RPC over species choice grants', () => {
  it('fills Keen Senses from its three-way pool and refuses outside it, both through the real RPC', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const characterId = createFighter(db, 'Keen Senses Filler');
    applySpecies(db, characterId, 'Elf');
    const grantId = Number(
      db.scalar(
        `SELECT id FROM character_skill_grants
         WHERE character_id = ? AND grant_key = ?`,
        [characterId, SKILL_GRANT_KEYS.speciesKeenSenses],
      ),
    );
    const plan = Object.values(SPECIES_SKILL_GRANT_PLANS).find(
      (candidate) => candidate.grant_key === SKILL_GRANT_KEYS.speciesKeenSenses,
    );
    if (plan === undefined || plan.pool === 'any_skill') {
      throw new Error('The seam has no bounded Keen Senses pool.');
    }

    const outside = await rpcRegistry.dispatch(
      {
        id: 1,
        method: GUIDED_RPC.fillSkillGrant,
        params: {
          character_id: characterId,
          grant_id: grantId,
          skill: 'athletics',
          operation_uuid: crypto.randomUUID(),
          expected_revision: 0,
        },
      },
      rpcHarness.context,
    );
    expect(outside).toMatchObject({
      ok: false,
      error: {
        code: 'handler_error',
        data: {
          reason: 'skill_not_in_pool',
          skill: 'athletics',
        } satisfies SkillGrantRefusalData,
      },
    });

    const inside = await rpcRegistry.dispatch(
      {
        id: 2,
        method: GUIDED_RPC.fillSkillGrant,
        params: {
          character_id: characterId,
          grant_id: grantId,
          skill: plan.pool[0],
          operation_uuid: crypto.randomUUID(),
          expected_revision: 0,
        },
      },
      rpcHarness.context,
    );
    expect(inside).toMatchObject({
      ok: true,
      result: { character_id: characterId },
    });
    expect(activeGrantedSkills(db, characterId)).toContain(plan.pool[0]);
  });
});
