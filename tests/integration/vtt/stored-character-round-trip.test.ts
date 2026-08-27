import { afterEach, describe, expect, it } from 'vitest';
import type { RpcResponse } from '../../../src/rpc/protocol';
import type { Outcome } from '../../../src/refusals/outcome';
import type { GuidedAllocateAbilitiesResult } from '../../../src/builder/contracts';
import { reduceEncounter } from '../../../src/combat/encounter';
import {
  loadedPartyAttackCommand,
  loadedPartySpellCastCommand,
  loadExternalPartyPack,
} from '../../../src/vtt/party-pack';
import { composeStoredCharacterEncounter } from '../../../src/vtt/stored-character-encounter';
import {
  capturePartySessionState,
  enterNextRoom,
} from '../../../src/vtt/party-session-state';
import type { StoredCharacterPartyPackExport } from '../../../src/vtt/stored-character-party-member';
import { handlers as guidedHandlers } from '../../../src/worker/handlers/guided';
import { handlers as queryHandlers } from '../../../src/worker/handlers/queries';
import {
  createSeededRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';

async function result<P, R>(
  harness: RpcHarness,
  method: string,
  params: P,
): Promise<R> {
  const response: RpcResponse<R> = await harness.call<P, R>(method, params);
  if (!response.ok) throw new Error(`${method}: ${response.error.message}`);
  return response.result;
}

interface CreatedCharacter {
  readonly id: number;
  readonly name: string;
  readonly classContentKey: string;
}

async function createGuided(
  harness: RpcHarness,
  name: string,
  className: 'Fighter' | 'Wizard',
  humanContentKey: string,
): Promise<CreatedCharacter> {
  const classes = await result<
    Record<string, never>,
    readonly { readonly content_key: string; readonly name: string }[]
  >(harness, 'queries.characters.guidedClassOptions', {});
  const heldClass = classes.find((candidate) => candidate.name === className);
  if (heldClass === undefined) throw new Error(`Bundled ${className} is missing.`);
  const character = await result<
    { readonly name: string; readonly class_content_key: string },
    { readonly id: number; readonly name: string }
  >(harness, 'queries.characters.createGuided', {
    name,
    class_content_key: heldClass.content_key,
  });
  await result(harness, 'queries.characters.applyOrigin', {
    character_id: character.id,
    kind: 'species',
    content_key: humanContentKey,
  });
  return { ...character, classContentKey: heldClass.content_key };
}

describe('stored character authoring-to-encounter round trip', () => {
  let harness: RpcHarness | null = null;

  afterEach(() => {
    harness?.close();
    harness = null;
  });

  it('negative_modifier_flipped: RPC-authored export preserves negative saving-throw, initiative, attack, and damage modifiers', async () => {
    harness = await createSeededRpcHarness([
      ...guidedHandlers,
      ...queryHandlers,
    ]);
    const origins = await result<
      { readonly kind: 'species' },
      readonly { readonly content_key: string; readonly name: string }[]
    >(harness, 'queries.characters.originOptions', { kind: 'species' });
    const human = origins.find((candidate) => candidate.name === 'Human');
    if (human === undefined) throw new Error('Bundled Human is missing.');

    const fighter = await createGuided(
      harness,
      'RPC Negative Modifiers Fighter',
      'Fighter',
      human.content_key,
    );
    const allocated = await result<
      Readonly<Record<string, unknown>>,
      Outcome<GuidedAllocateAbilitiesResult>
    >(harness, 'queries.characters.allocateAbilities', {
      character_id: fighter.id,
      method: 'manual',
      scores: {
        strength: 1,
        dexterity: 1,
        constitution: 1,
        intelligence: 1,
        wisdom: 1,
        charisma: 1,
      },
      operation_uuid: crypto.randomUUID(),
      expected_revision: 0,
    });
    expect(allocated.kind).toBe('ok');

    const equipment = await result<
      { readonly character_id: number },
      {
        readonly class_package: {
          readonly content_key: string;
          readonly offered: readonly { readonly option: 'a' | 'b' | 'c' }[];
        };
      }
    >(harness, 'queries.characters.equipmentStep', { character_id: fighter.id });
    const equipmentOption = equipment.class_package.offered[0];
    if (equipmentOption === undefined) throw new Error('Fighter equipment package is missing.');
    await result(harness, 'queries.characters.applyEquipment', {
      character_id: fighter.id,
      kind: 'class',
      content_key: equipment.class_package.content_key,
      option: equipmentOption.option,
    });

    const exported = await result<
      { readonly character_id: number },
      StoredCharacterPartyPackExport
    >(harness, 'queries.characters.partyPackMember', {
      character_id: fighter.id,
    });
    expect(exported.status).toBe('exported');
    if (exported.status !== 'exported') {
      throw new Error(`${exported.refusal.field}: ${exported.refusal.detail}`);
    }

    expect(exported.member.savingThrowBonuses).toEqual({
      strength: -3,
      dexterity: -5,
      constitution: -3,
      intelligence: -5,
      wisdom: -5,
      charisma: -5,
    });
    expect(exported.member.initiativeBonus).toBe(-5);
    expect(exported.member.attacks[0]?.attackBonus).toBe(-3);
    expect(exported.member.attacks[0]?.damage[0]?.modifier).toBe(-5);
  });

  it('controller_not_dm: authors through RPC, exports, moves and attacks, then spends an imported spell slot', async () => {
    harness = await createSeededRpcHarness([
      ...guidedHandlers,
      ...queryHandlers,
    ]);
    const origins = await result<
      { readonly kind: 'species' },
      readonly { readonly content_key: string; readonly name: string }[]
    >(harness, 'queries.characters.originOptions', { kind: 'species' });
    const human = origins.find((candidate) => candidate.name === 'Human');
    if (human === undefined) throw new Error('Bundled Human is missing.');

    const wizard = await createGuided(
      harness,
      'RPC Bridge Wizard',
      'Wizard',
      human.content_key,
    );
    const fighterOne = await createGuided(
      harness,
      'RPC Bridge Fighter One',
      'Fighter',
      human.content_key,
    );
    const fighterTwo = await createGuided(
      harness,
      'RPC Bridge Fighter Two',
      'Fighter',
      human.content_key,
    );
    const allocated = await result<
      Readonly<Record<string, unknown>>,
      Outcome<GuidedAllocateAbilitiesResult>
    >(harness, 'queries.characters.allocateAbilities', {
      character_id: wizard.id,
      method: 'manual',
      scores: {
        strength: 8,
        dexterity: 15,
        constitution: 14,
        intelligence: 13,
        wisdom: 12,
        charisma: 10,
      },
      operation_uuid: crypto.randomUUID(),
      expected_revision: 0,
    });
    expect(allocated.kind).toBe('ok');

    let spellState = await result<
      { readonly character_id: number },
      {
        readonly revision: number;
        readonly choices: readonly {
          readonly kind: 'slot_selection' | 'spellbook_acquisition';
          readonly id: number;
          readonly label: string;
        }[];
      }
    >(harness, 'queries.characters.spellsStep', { character_id: wizard.id });
    for (const kind of ['spellbook_acquisition', 'slot_selection'] as const) {
      let selectedChoice: typeof spellState.choices[number] | undefined;
      let magicMissile: { readonly id: number; readonly name: string } | undefined;
      for (const choice of spellState.choices.filter(
        (candidate) => candidate.kind === kind,
      )) {
        const eligible = await result<
          Readonly<Record<string, unknown>>,
          readonly { readonly id: number; readonly name: string }[]
        >(harness, 'queries.characters.guidedEligibleSpells', {
          character_id: wizard.id,
          address: { kind: choice.kind, id: choice.id },
          query: 'Magic Missile',
        });
        const candidate = eligible.find((spell) => spell.name === 'Magic Missile');
        if (candidate !== undefined) {
          selectedChoice = choice;
          magicMissile = candidate;
          break;
        }
      }
      if (selectedChoice === undefined || magicMissile === undefined) {
        throw new Error(`Magic Missile has no eligible Wizard ${kind} choice.`);
      }
      await result(harness, 'queries.characters.assignGuidedSpell', {
        character_id: wizard.id,
        address: { kind: selectedChoice.kind, id: selectedChoice.id },
        spell_version_id: magicMissile.id,
        operation_uuid: crypto.randomUUID(),
        expected_revision: spellState.revision,
      });
      spellState = await result(
        harness,
        'queries.characters.spellsStep',
        { character_id: wizard.id },
      );
    }

    const equipment = await result<
      { readonly character_id: number },
      {
        readonly class_package: {
          readonly content_key: string;
          readonly offered: readonly { readonly option: 'a' | 'b' | 'c' }[];
        };
      }
    >(harness, 'queries.characters.equipmentStep', { character_id: wizard.id });
    const equipmentOption = equipment.class_package.offered[0];
    if (equipmentOption === undefined) throw new Error('Wizard equipment package is missing.');
    await result(harness, 'queries.characters.applyEquipment', {
      character_id: wizard.id,
      kind: 'class',
      content_key: equipment.class_package.content_key,
      option: equipmentOption.option,
    });

    const exports = await Promise.all(
      [wizard, fighterOne, fighterTwo].map((character) =>
        result<
          { readonly character_id: number },
          StoredCharacterPartyPackExport
        >(harness!, 'queries.characters.partyPackMember', {
          character_id: character.id,
        })),
    );
    for (const exported of exports) {
      expect(exported.status).toBe('exported');
      if (exported.status !== 'exported') {
        throw new Error(`${exported.refusal.field}: ${exported.refusal.detail}`);
      }
    }
    const successful = exports.flatMap((entry) =>
      entry.status === 'exported' ? [entry] : [],
    );
    const loaded = loadExternalPartyPack({
      schemaVersion: 2,
      partyId: 'party:rpc-round-trip',
      allowPartial: false,
      members: successful.map((entry) => entry.member),
    });
    expect(loaded.status).toBe('loaded');
    if (loaded.status !== 'loaded') {
      throw new Error(`Exported RPC party refused: ${loaded.refusal.reason}.`);
    }
    const wizardMember = loaded.party.members.find(
      (member) => member.profile.characterId === wizard.id,
    );
    if (wizardMember === undefined) throw new Error('Exported Wizard is missing.');
    expect(wizardMember.attacks).not.toHaveLength(0);
    expect(wizardMember.spellcasting[0]?.preparedSpells.map((spell) => spell.id))
      .toContain('magic-missile');

    const names = new Map(successful.map((entry) => [
      entry.member.characterId,
      entry.displayName,
    ]));
    const composed = composeStoredCharacterEncounter(loaded.party.members, names);
    expect(composed.controllers.filter(
      (identity) => identity.combatantId === wizardMember.profile.id,
    )).toEqual([expect.objectContaining({ kind: 'human' })]);
    let state = reduceEncounter(
      composed.state,
      { type: 'roll_initiative' },
      () => 0.5,
    ).state;
    expect(state.activeCombatant).toBe(wizardMember.profile.id);
    const monster = state.combatants.find((subject) => subject.profile.kind === 'monster');
    if (monster === undefined) throw new Error('Composed encounter monster is missing.');
    state = reduceEncounter(state, {
      type: 'move',
      actor: wizardMember.profile.id,
      path: [{ column: 2, row: 1 }, { column: 3, row: 1 }],
      cause: 'voluntary',
    }, () => 0.5).state;
    const firstAttack = wizardMember.attacks[0];
    if (firstAttack === undefined) throw new Error('Stored Wizard attack is missing.');
    const attack = loadedPartyAttackCommand(
      wizardMember,
      firstAttack.attackId,
      monster.profile.id,
    );
    const attacked = reduceEncounter(state, attack, () => 0.5);
    expect(attacked.events).toContainEqual(expect.objectContaining({
      type: 'attack_resolved',
      actor: wizardMember.profile.id,
    }));
    state = reduceEncounter(attacked.state, {
      type: 'end_turn',
      actor: wizardMember.profile.id,
    }, () => 0.5).state;
    while (state.activeCombatant !== wizardMember.profile.id) {
      const actor = state.activeCombatant;
      if (actor === null) throw new Error('Encounter lost its active combatant.');
      state = reduceEncounter(state, { type: 'end_turn', actor }, () => 0.5).state;
    }
    const beforeSlots = state.combatants.find(
      (subject) => subject.profile.id === wizardMember.profile.id,
    )?.spellSlots;
    expect(beforeSlots).toContainEqual({ level: 1, maximum: 2, remaining: 2 });
    const cast = reduceEncounter(state, loadedPartySpellCastCommand(
      wizardMember,
      'magic-missile',
      {
        slotLevel: 1,
        castAsRitual: false,
        targets: [monster.profile.id, monster.profile.id, monster.profile.id],
        area: null,
        weaponAttack: null,
        selectedOption: null,
      },
    ), () => 0);
    expect(cast.events).toContainEqual(expect.objectContaining({
      type: 'spell_cast',
      caster: wizardMember.profile.id,
      spellId: 'magic-missile',
      slotLevel: 1,
    }));
    expect(cast.state.combatants.find(
      (subject) => subject.profile.id === wizardMember.profile.id,
    )?.spellSlots).toContainEqual({ level: 1, maximum: 2, remaining: 1 });
    const damaged = reduceEncounter(cast.state, {
      type: 'adjudicate',
      target: wizardMember.profile.id,
      subject: 'integration:room-one-damage',
      reasoning: 'Room one damage must carry into room two.',
      consequence: { kind: 'hit_point_delta', amount: -5 },
    }, () => 0.5).state;
    if (composed.partyState === null) {
      throw new Error('RPC-authored stored characters did not create party session state.');
    }
    const captured = capturePartySessionState(composed.partyState, damaged);
    const roomTwo = composeStoredCharacterEncounter(
      loaded.party.members,
      names,
      enterNextRoom(captured),
    );
    const roomTwoWizard = roomTwo.state.combatants.find(
      (subject) => subject.profile.id === wizardMember.profile.id,
    );
    expect(roomTwoWizard?.hitPoints).toBe(
      wizardMember.profile.rules.hitPointMaximum - 5,
    );
    expect(roomTwoWizard?.spellSlots).toContainEqual({
      level: 1,
      maximum: 2,
      remaining: 1,
    });
    expect(roomTwo.partyState).toMatchObject({ rulesEdition: '2024', room: 2 });
  });
});
