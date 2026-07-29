import { afterEach, describe, expect, it } from 'vitest';
import {
  GUIDED_RPC,
  SKILL_GRANT_KEYS,
} from '../../../src/builder/contracts';
import { MAGIC_INITIATE_FEAT_CONTENT_KEY } from '../../../src/builder/background-choices';
import {
  allocateGuidedAbilities,
  applyGuidedBackgroundChoices,
  applyGuidedOrigin,
  createGuidedCharacter,
  guidedBuildState,
  guidedSkillsStepState,
  listGuidedBackgroundChoiceOptions,
  listGuidedClassOptions,
  listGuidedOriginOptions,
} from '../../../src/builder/guided-creation';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import type { DatabaseContext } from '../../../src/db/database';
import type { Skill } from '../../../src/domain/enums';
import {
  CharacterCompletenessQueries,
  type UnfilledSkillGrantsItem,
} from '../../../src/queries/character-completeness';
import { skillFromLabel } from '../../../src/rules/skills';
import { rpcRegistry } from '../../../src/worker/registry';
import {
  createRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';

/**
 * THE S-C EXIT, END TO END (skills-with-provenance §4 S-C, §5):
 *
 * **A Fighter with a background that grants two skills still owes two class
 * choices.** That sentence — not "the step advances" — is the exit, because
 * the trap is a count-shaped predicate that reports the Fighter complete the
 * moment the background hands them two skills. `S-SILENCE`'s mutation
 * rebuilds exactly that count on the new table, and the Acolyte-Fighter test
 * here is the one it must make fail.
 *
 * Everything runs against the full application seed through the REAL guided
 * applies and the REAL RPC surface, never hand-planted rows.
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
  new CharacterCommandIntegrity('guided-skills-step-test-key');

function createGuided(db: DatabaseContext, className: string): number {
  const option = listGuidedClassOptions(db).find(
    (candidate) => candidate.name === className,
  );
  if (option === undefined) {
    throw new Error(`The bundled class catalogue has no ${className}.`);
  }
  return createGuidedCharacter(
    db,
    { name: `${className} Hero`, class_content_key: option.content_key },
    integrity(),
  ).id;
}

function revision(db: DatabaseContext, characterId: number): number {
  return Number(
    db.scalar('SELECT revision FROM characters WHERE id = ?', [characterId]),
  );
}

async function allocateStandardArray(
  db: DatabaseContext,
  characterId: number,
): Promise<void> {
  await allocateGuidedAbilities(
    db,
    {
      character_id: characterId,
      method: 'standard_array',
      scores: {
        strength: 15,
        dexterity: 14,
        constitution: 13,
        intelligence: 12,
        wisdom: 10,
        charisma: 8,
      },
      operation_uuid: crypto.randomUUID(),
      expected_revision: revision(db, characterId),
    },
    integrity(),
  );
}

function applySpecies(
  db: DatabaseContext,
  characterId: number,
  name: string,
): void {
  const option = listGuidedOriginOptions(db, 'species').find(
    (candidate) => candidate.name === name,
  );
  if (option === undefined) {
    throw new Error(`The bundled species catalogue has no ${name}.`);
  }
  applyGuidedOrigin(db, {
    character_id: characterId,
    kind: 'species',
    content_key: option.content_key,
  });
}

function applyBackgroundNamed(
  db: DatabaseContext,
  characterId: number,
  backgroundName: string,
  featName?: string,
): void {
  const options = listGuidedBackgroundChoiceOptions(db);
  const background = options.backgrounds.find(
    (candidate) => candidate.name === backgroundName,
  );
  if (background === undefined) {
    throw new Error(`The bundled backgrounds have no ${backgroundName}.`);
  }
  const feat =
    featName === undefined
      ? options.origin_feats.find(
          (candidate) =>
            candidate.content_key !== MAGIC_INITIATE_FEAT_CONTENT_KEY &&
            candidate.name !== 'Skilled',
        )
      : options.origin_feats.find((candidate) => candidate.name === featName);
  if (feat === undefined) {
    throw new Error(
      `The seeded Origin feats have no ${featName ?? 'config-free candidate'}.`,
    );
  }
  applyGuidedBackgroundChoices(db, {
    character_id: characterId,
    content_key: background.content_key,
    increases: [
      { ability: 'wisdom', amount: 2 },
      { ability: 'intelligence', amount: 1 },
    ],
    origin_feat_content_key: feat.content_key,
    origin_feat_config: {},
  });
}

async function fillThroughRpc(
  rpcHarness: RpcHarness,
  characterId: number,
  grantId: number,
  skill: Skill | null,
): Promise<void> {
  const response = await rpcRegistry.dispatch(
    {
      id: 1,
      method: GUIDED_RPC.fillSkillGrant,
      params: {
        character_id: characterId,
        grant_id: grantId,
        skill,
        operation_uuid: crypto.randomUUID(),
        expected_revision: revision(rpcHarness.context.db, characterId),
      },
    },
    rpcHarness.context,
  );
  if (!('ok' in response) || response.ok !== true) {
    throw new Error(`The fill RPC refused: ${JSON.stringify(response)}`);
  }
}

function skillItems(db: DatabaseContext, characterId: number) {
  return new CharacterCompletenessQueries(db)
    .build(characterId)
    .items.filter(
      (item): item is UnfilledSkillGrantsItem =>
        item.kind === 'unfilled_skill_grants',
    );
}

describe('the S-C exit: a Fighter with a skill-granting background still owes two class choices', () => {
  it('holds the step, the completeness item and the derivation open until BOTH class ordinals fill', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const characterId = createGuided(db, 'Fighter');
    await allocateStandardArray(db, characterId);
    // HUMAN, deliberately: its Skillful choice grant proves species choices
    // are choosable-but-never-gating on the same character.
    applySpecies(db, characterId, 'Human');
    // ACOLYTE, the plan's §6 pinned fixture: Insight and Religion
    // (hand-transcribed from `docs/srd/source/backgrounds.txt`), with Insight
    // inside the Fighter's own printed pool — §3.3's worked case.
    applyBackgroundNamed(db, characterId, 'Acolyte');

    // FIXTURE-OBSERVABILITY GUARDS, asserted BEFORE anything else (§6
    // S-SILENCE): the background granted at least one FILLED skill AND the
    // class owes at least one unfilled ordinal — otherwise the mutated count
    // never exceeds the entitlement and the control is decorative.
    const state = guidedSkillsStepState(db, characterId);
    const backgroundGranted = state.granted.filter(
      (grant) => grant.grant_key === SKILL_GRANT_KEYS.backgroundSkill,
    );
    expect(backgroundGranted.map((grant) => grant.skill).sort()).toEqual([
      skillFromLabel('Insight'),
      skillFromLabel('Religion'),
    ]);
    expect(backgroundGranted.every((grant) => !grant.clearable)).toBe(true);

    // THE EXIT ASSERTION: two skills are held, and the Fighter STILL owes
    // exactly two class choices — per grant, never entitlement − count.
    expect(state.class_choices).toHaveLength(2);
    expect(guidedBuildState(db, characterId)).toMatchObject({
      current_step: 'skills',
    });
    const completeness = skillItems(db, characterId);
    const fighterItem = completeness.find(
      (item) => item.grant_key === SKILL_GRANT_KEYS.classSkill,
    );
    expect(fighterItem).toMatchObject({ chosen: 0, required: 2, missing: 2 });

    // §3.3's worked case: Insight leaves the AVAILABLE list (8 of the
    // Fighter's 9; Religion never was in the pool) without reducing the
    // ordinals owed.
    for (const choice of state.class_choices) {
      expect(choice.available).toHaveLength(8);
      expect(choice.available).not.toContain('insight');
      expect(choice.available).toContain('athletics');
    }
    // The species choice is REPORTED and CHOOSABLE, but separate.
    expect(state.species_choices).toMatchObject([
      { grant_key: SKILL_GRANT_KEYS.speciesSkillful },
    ]);

    // Fill ONE ordinal: still outstanding — a partial fill silences nothing.
    await fillThroughRpc(
      rpcHarness,
      characterId,
      state.class_choices[0]!.grant_id,
      'athletics',
    );
    expect(guidedBuildState(db, characterId)).toMatchObject({
      current_step: 'skills',
    });
    expect(
      skillItems(db, characterId).find(
        (item) => item.grant_key === SKILL_GRANT_KEYS.classSkill,
      ),
    ).toMatchObject({ chosen: 1, missing: 1 });

    // Fill the second: every class ordinal is filled, so the step advances —
    // even though the species Skillful choice is STILL unfilled (§4 pins
    // class ordinals as the gate) — and the planner keeps reporting the
    // species obligation rather than letting it vanish.
    const remaining = guidedSkillsStepState(db, characterId).class_choices;
    expect(remaining).toHaveLength(1);
    await fillThroughRpc(
      rpcHarness,
      characterId,
      remaining[0]!.grant_id,
      'perception',
    );
    expect(guidedBuildState(db, characterId)).toMatchObject({
      current_step: 'equipment',
    });
    expect(skillItems(db, characterId)).toMatchObject([
      { grant_key: SKILL_GRANT_KEYS.speciesSkillful, missing: 1 },
    ]);
  });

  it('serves the step state over the registered RPC with the seam validator', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const characterId = createGuided(db, 'Fighter');

    const response = await rpcRegistry.dispatch(
      {
        id: 1,
        method: GUIDED_RPC.skillsStep,
        params: { character_id: characterId },
      },
      rpcHarness.context,
    );
    expect(response).toMatchObject({
      ok: true,
      result: {
        character_id: characterId,
        revision: expect.any(Number) as number,
        class_choices: [
          { ordinal: 1, grant_id: expect.any(Number) as number },
          { ordinal: 2, grant_id: expect.any(Number) as number },
        ],
        species_choices: [],
        unapplied_skill_rule_sources: [],
        expertise_gap: false,
      },
    });

    expect(
      await rpcRegistry.dispatch(
        {
          id: 2,
          method: GUIDED_RPC.skillsStep,
          params: { character_id: characterId, extra: true },
        },
        rpcHarness.context,
      ),
    ).toMatchObject({ ok: false, error: { code: 'invalid_params' } });
  });
});

describe('the §3.7 disclosures, as step data', () => {
  it('names a source whose skill_proficiency rule nothing consumes — the Skilled feat', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const characterId = createGuided(db, 'Fighter');
    applyBackgroundNamed(db, characterId, 'Acolyte', 'Skilled');

    const state = guidedSkillsStepState(db, characterId);
    expect(state.unapplied_skill_rule_sources).toHaveLength(1);
    expect(state.unapplied_skill_rule_sources[0]).toContain('Skilled');
    // Detection is STRUCTURAL (the rule kind), so no Skilled feat means no
    // disclosure — the mirror-image lie the species step's derivation rule
    // exists to prevent.
    const plainId = createGuided(db, 'Wizard');
    applyBackgroundNamed(db, plainId, 'Acolyte');
    expect(
      guidedSkillsStepState(db, plainId).unapplied_skill_rule_sources,
    ).toEqual([]);
  });

  it('names the level-1 Rogue Expertise gap, and only for the pinned population', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const rogueId = createGuided(db, 'Rogue');
    expect(guidedSkillsStepState(db, rogueId).expertise_gap).toBe(true);

    const fighterId = createGuided(db, 'Fighter');
    expect(guidedSkillsStepState(db, fighterId).expertise_gap).toBe(false);
  });
});

describe('the retired legacy surface (§3.5, S-LEGACY)', () => {
  it('refuses set_skill_proficiency at the RPC surface as an UNKNOWN command', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const characterId = createGuided(db, 'Fighter');

    const response = await rpcRegistry.dispatch(
      {
        id: 1,
        method: 'commands.execute',
        params: {
          character_id: characterId,
          operation_uuid: crypto.randomUUID(),
          expected_revision: revision(db, characterId),
          command: {
            type: 'set_skill_proficiency',
            skill: 'stealth',
            proficient: true,
          },
        },
      },
      rpcHarness.context,
    );
    expect(response).toMatchObject({
      ok: false,
      error: { message: 'Unknown character command type.' },
    });
    // And nothing wrote the projection: the retired path is DELETED, not
    // left writing rows nobody reads.
    expect(
      db.scalar(
        'SELECT count(*) FROM character_skill_proficiencies WHERE character_id = ?',
        [characterId],
      ),
    ).toBe(0);
  });

  it('refuses choose_multiclass_skill the same way', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const characterId = createGuided(db, 'Fighter');

    expect(
      await rpcRegistry.dispatch(
        {
          id: 1,
          method: 'commands.execute',
          params: {
            character_id: characterId,
            operation_uuid: crypto.randomUUID(),
            expected_revision: revision(db, characterId),
            command: { type: 'choose_multiclass_skill', skill: 'performance' },
          },
        },
        rpcHarness.context,
      ),
    ).toMatchObject({
      ok: false,
      error: { message: 'Unknown character command type.' },
    });
  });
});
