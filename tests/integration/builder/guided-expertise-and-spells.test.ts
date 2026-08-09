import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GUIDED_RPC, type GuidedExpertiseStepState } from '../../../src/builder/contracts';
import {
  allocateGuidedAbilities,
  applyGuidedBackgroundChoices,
  applyGuidedOrigin,
  assignGuidedSpell,
  createGuidedCharacter,
  fillGuidedExpertiseGrant,
  fillGuidedSkillGrant,
  guidedBuildState,
  guidedEligibleSpells,
  guidedExpertiseStepState,
  guidedSkillsStepState,
  guidedSpellsStepState,
  listGuidedBackgroundChoiceOptions,
  listGuidedClassOptions,
  listGuidedOriginOptions,
} from '../../../src/builder/guided-creation';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import type { DatabaseContext } from '../../../src/db/database';
import type { Skill } from '../../../src/domain/enums';
import { createExpertiseStep } from '../../../src/ui/screens/guided-builder/expertise-step';
import { createSpellsStep } from '../../../src/ui/screens/guided-builder/spells-step';
import { rpcRegistry } from '../../../src/worker/registry';
import {
  elementText,
  installInteractiveDocument,
  interactiveElement,
} from '../../fixtures/interactive-dom';
import {
  createRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';

let harness: RpcHarness | undefined;
let restoreDocument: (() => void) | undefined;

beforeEach(() => {
  restoreDocument = installInteractiveDocument();
});

afterEach(() => {
  restoreDocument?.();
  restoreDocument = undefined;
  harness?.close();
  harness = undefined;
});

const integrity = () =>
  new CharacterCommandIntegrity('guided-expertise-spells-test-key');

function revision(db: DatabaseContext, characterId: number): number {
  return Number(
    db.scalar('SELECT revision FROM characters WHERE id = ?', [characterId]),
  );
}

async function characterReadyForSkills(
  db: DatabaseContext,
  className: 'Rogue' | 'Wizard',
): Promise<number> {
  const classOption = listGuidedClassOptions(db).find(
    (candidate) => candidate.name === className,
  );
  const species = listGuidedOriginOptions(db, 'species').find(
    (candidate) => candidate.name === 'Dwarf',
  );
  const backgroundOptions = listGuidedBackgroundChoiceOptions(db);
  const background = backgroundOptions.backgrounds.find(
    (candidate) => candidate.name === 'Acolyte',
  );
  const feat = backgroundOptions.origin_feats.find(
    (candidate) => candidate.name === 'Alert',
  );
  if (
    classOption === undefined ||
    species === undefined ||
    background === undefined ||
    feat === undefined
  ) {
    throw new Error('A required bundled guided option is absent.');
  }
  const characterId = createGuidedCharacter(
    db,
    {
      name: `${className} Guided Hero`,
      class_content_key: classOption.content_key,
    },
    integrity(),
  ).id;
  await allocateGuidedAbilities(
    db,
    {
      character_id: characterId,
      method: 'standard_array',
      scores: {
        strength: 8,
        dexterity: 15,
        constitution: 14,
        intelligence: 13,
        wisdom: 12,
        charisma: 10,
      },
      operation_uuid: crypto.randomUUID(),
      expected_revision: revision(db, characterId),
    },
    integrity(),
  );
  applyGuidedOrigin(db, {
    character_id: characterId,
    kind: 'species',
    content_key: species.content_key,
  });
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
  return characterId;
}

async function fillAllSkills(
  db: DatabaseContext,
  characterId: number,
): Promise<void> {
  while (true) {
    const state = guidedSkillsStepState(db, characterId);
    const choice = [...state.class_choices, ...state.species_choices][0];
    if (choice === undefined) return;
    const skill = choice.available[0];
    if (skill === undefined) {
      throw new Error('A guided skill choice has no available skill.');
    }
    await fillGuidedSkillGrant(
      db,
      {
        character_id: characterId,
        grant_id: choice.grant_id,
        skill: skill as Skill,
        operation_uuid: crypto.randomUUID(),
        expected_revision: revision(db, characterId),
      },
      integrity(),
    );
  }
}

describe('GF-2 guided Expertise and spell adoption', () => {
  it('places Rogue Expertise after every skill source and fills sourced grants', async () => {
    harness = await createRpcHarness([]);
    const db = harness.context.db;
    const characterId = await characterReadyForSkills(db, 'Rogue');

    expect(guidedBuildState(db, characterId)).toMatchObject({
      current_step: 'skills',
    });
    await fillAllSkills(db, characterId);
    expect(guidedBuildState(db, characterId)).toMatchObject({
      current_step: 'expertise',
    });

    const hostile = '</span><img data-ha10-expertise-source src=x>';
    const source = db.oneRaw(
      `SELECT source.id, definition.content_key
       FROM character_source_instances AS source
       JOIN class_definitions AS definition
         ON definition.id = source.source_definition_id
       WHERE source.character_id = ? AND source.source_type = 'class'`,
      [characterId],
    );
    if (source === null) throw new Error('Rogue source fixture is missing.');
    db.exec(
      'UPDATE character_source_instances SET display_name = ? WHERE id = ?',
      [hostile, Number(source.id)],
    );
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec(
      `DELETE FROM catalog_content_identities
       WHERE content_kind = 'class' AND content_key = ?`,
      [String(source.content_key)],
    );
    db.exec('PRAGMA foreign_keys = ON');
    const response = await rpcRegistry.dispatch(
      {
        id: 1,
        method: GUIDED_RPC.expertiseStep,
        params: { character_id: characterId },
      },
      harness.context,
    );
    if (!response.ok) throw new Error(response.error.message);
    const routedState = response.result as GuidedExpertiseStepState;
    expect(routedState.choices[0]).toMatchObject({
      source_name: hostile,
      source_catalog_layer: 'unknown',
    });
    const step = createExpertiseStep({
      characterId,
      state: routedState,
      fill: () => Promise.reject(new Error('not submitted')),
      navigate: () => undefined,
    });
    const expertiseSelect = interactiveElement(step.element).querySelector('select');
    expect(expertiseSelect?.getAttribute('aria-label')).toBe(
      `${hostile} Expertise 1`,
    );
    const describedBy = expertiseSelect?.getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    expect(
      interactiveElement(step.element).querySelector(
        `[id="${describedBy}"]`,
      )?.textContent,
    ).toBe('Unknown catalog layer');
    expect(
      interactiveElement(step.element).querySelector(
        '[data-ha10-expertise-source]',
      ),
    ).toBeNull();
    step.cleanup();

    while (true) {
      const state = guidedExpertiseStepState(db, characterId);
      const choice = state.choices[0];
      if (choice === undefined) break;
      const skill = choice.available[0];
      if (skill === undefined) {
        throw new Error('A guided Expertise choice has no available skill.');
      }
      fillGuidedExpertiseGrant(db, {
        character_id: characterId,
        grant_id: choice.grant_id,
        skill,
        operation_uuid: crypto.randomUUID(),
        expected_revision: state.revision,
      });
    }

    expect(
      db.allRaw(
        `SELECT skill, state FROM character_skill_expertise_grants
         WHERE character_id = ? ORDER BY ordinal`,
        [characterId],
      ),
    ).toHaveLength(2);
    expect(guidedBuildState(db, characterId)).toMatchObject({
      current_step: 'equipment',
    });
  });

  it('records every level-1 Wizard spell choice through the shared durable assignment writer', async () => {
    harness = await createRpcHarness([]);
    const db = harness.context.db;
    const characterId = await characterReadyForSkills(db, 'Wizard');
    await fillAllSkills(db, characterId);

    expect(guidedBuildState(db, characterId)).toMatchObject({
      current_step: 'spells',
    });
    const owed = guidedSpellsStepState(db, characterId).choices.length;
    expect(owed).toBeGreaterThan(0);
    expect(guidedSpellsStepState(db, characterId).choices.map((choice) => choice.label))
      .toEqual([
        'Wizard cantrip 1 of 3',
        'Wizard prepared spell 1 of 4',
        'Wizard cantrip 2 of 3',
        'Wizard prepared spell 2 of 4',
        'Wizard cantrip 3 of 3',
        'Wizard prepared spell 3 of 4',
        'Wizard prepared spell 4 of 4',
        'Wizard spellbook spell 1 of 6',
        'Wizard spellbook spell 2 of 6',
        'Wizard spellbook spell 3 of 6',
        'Wizard spellbook spell 4 of 6',
        'Wizard spellbook spell 5 of 6',
        'Wizard spellbook spell 6 of 6',
      ]);

    while (true) {
      const state = guidedSpellsStepState(db, characterId);
      const choice = state.choices.find(
        (candidate) => candidate.selected_spell_name === null,
      );
      if (choice === undefined) break;
      const eligible = guidedEligibleSpells(db, {
        character_id: characterId,
        address: { kind: choice.kind, id: choice.id },
        query: '',
      });
      const spell = eligible[0];
      if (spell === undefined) {
        throw new Error(`No eligible spell exists for ${choice.label}.`);
      }
      assignGuidedSpell(db, {
        character_id: characterId,
        address: { kind: choice.kind, id: choice.id },
        spell_version_id: spell.id,
        operation_uuid: crypto.randomUUID(),
        expected_revision: state.revision,
      });
    }

    const filledState = guidedSpellsStepState(db, characterId);
    expect(filledState.choices).toHaveLength(owed);
    expect(
      filledState.choices.every(
        (choice) =>
          choice.selected_spell_name !== null &&
          choice.selected_spell_catalog_layer !== null,
      ),
    ).toBe(true);
    const step = createSpellsStep({
      characterId,
      state: filledState,
      search: () => Promise.resolve([]),
      assign: () => Promise.reject(new Error('not submitted')),
      navigate: () => undefined,
    });
    const rendered = interactiveElement(step.element);
    expect(rendered.querySelectorAll('.guided-spell-summary')).toHaveLength(owed);
    expect(elementText(rendered as unknown as Node)).toContain(
      `${filledState.choices[0]?.selected_spell_name ?? ''} — Wizard cantrip 1 of 3`,
    );
    const firstChange = rendered.querySelector('.guided-spell-change');
    firstChange?.click();
    const replacement = rendered.querySelector('.spell-picker-input');
    expect(replacement?.getAttribute('aria-label')).toBe(
      'Wizard cantrip 1 of 3',
    );
    expect(document.activeElement).toBe(replacement);
    expect(elementText(rendered as unknown as Node)).toContain(
      'Choose a replacement for',
    );
    step.cleanup();
    const recorded = Number(
      db.scalar(
        `SELECT
           (SELECT count(*) FROM spell_selection_slots
            WHERE character_id = ? AND current_spell_version_id IS NOT NULL) +
           (SELECT count(*) FROM wizard_spellbook_entries
            WHERE character_id = ? AND spell_version_id IS NOT NULL)`,
        [characterId, characterId],
      ),
    );
    expect(recorded).toBe(owed);
    expect(guidedBuildState(db, characterId)).toMatchObject({
      current_step: 'equipment',
    });
  });
});
