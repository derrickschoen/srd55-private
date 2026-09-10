import type { EncounterState } from '../combat/encounter';
import { isEncounterParticipant } from '../combat/alerting';
import type { CombatToken, CombatantProfile } from '../combat/combatant';
import { creatureSizes, type KnownCreatureSize } from '../domain/enums';
import { BUNDLED_MONSTER_ROSTER } from '../combat/statblocks/roster';
import {
  combatantId,
  tokenId,
  type CombatantId,
} from '../combat/values';
import type { EncounterEnvironment } from '../combat/world-objects';
import {
  creatureSpace,
  placementFromSerialized,
  sizedCombatantState,
  spaceFitsBounds,
  spacesIntersect,
} from '../combat/creature-space';

export type EncounterStateDecodeMode = 'legacy_basis' | 'session' | 'challenge';

type JsonRecord = Record<string, unknown>;

const REQUIRED_STATE_KEYS = [
  'config', 'phase', 'rulesEdition', 'hiddenRolls', 'revision', 'nextEventSequence',
  'nextDecisionSequence', 'nextEffectSequence', 'bounds', 'blockedCells', 'worldObjects',
  'nextWorldObjectSequence', 'environment', 'foggedCells', 'dmNotes', 'combatants',
  'tokens', 'sharedSpaceRelations', 'adjudicationPending', 'initiative', 'activeCombatant',
  'activeInitiativeIndex', 'round', 'effects', 'persistentAreas', 'nextPersistentAreaSequence',
  'eventLog', 'hiddenCombatants', 'observationHistory', 'pendingDecisions', 'reactionPolicies',
] as const;

const OPTIONAL_STATE_KEYS = [
  'absentTokens', 'initiativeBeforeDelays', 'reevaluatedBranches', 'searchMemories', 'alerting',
  'contentPacks', 'equipment', 'groundItems', 'itemContacts',
] as const;

export const LEGACY_BASIS_V1_NORMALIZED_OMISSIONS = [
  'combatants[].profile.rules.sizeCategory for the three reference PCs and bundled monsters',
  'tokens[].placementMode',
  'environment.narrowOpeningRegions',
  'sharedSpaceRelations',
  'adjudicationPending',
  'observationHistory',
] as const;

function record(value: unknown, label: string): JsonRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as JsonRecord;
}

function own(value: JsonRecord, key: string): boolean {
  return Object.hasOwn(value, key);
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array.`);
  return value;
}

function finite(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${label} must be finite.`);
  return value;
}

function safeInteger(value: unknown, label: string, minimum = 0): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new TypeError(`${label} must be a safe integer >= ${String(minimum)}.`);
  }
  return value as number;
}

function bool(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`${label} must be boolean.`);
  return value;
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty trimmed string.`);
  }
  return value;
}

function exactOrOptionalKeys(
  value: JsonRecord,
  required: readonly string[],
  optional: readonly string[],
  label: string,
): void {
  const allowed = new Set([...required, ...optional]);
  const unknown = Object.keys(value).find((key) => !allowed.has(key));
  const missing = required.find((key) => !own(value, key));
  if (unknown !== undefined || missing !== undefined) {
    throw new TypeError(`${label} has ${unknown === undefined ? `missing key ${String(missing)}` : `unknown key ${unknown}`}.`);
  }
}

function assertJsonGraph(value: unknown, label: string): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertJsonGraph(entry, `${label}[${String(index)}]`));
    return;
  }
  if (typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) assertJsonGraph(entry, `${label}.${key}`);
    return;
  }
  throw new TypeError(`${label} contains a non-JSON value.`);
}

function unique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) throw new TypeError(`${label} must be unique.`);
}

function decodeCell(value: unknown, label: string): { readonly column: number; readonly row: number } {
  const cell = record(value, label);
  exactOrOptionalKeys(cell, ['column', 'row'], [], label);
  return {
    column: safeInteger(cell['column'], `${label}.column`),
    row: safeInteger(cell['row'], `${label}.row`),
  };
}

function legacyMechanicalSize(profile: JsonRecord): KnownCreatureSize | undefined {
  const id = typeof profile['id'] === 'string' ? profile['id'] : '';
  if (id === 'combatant:fighter' || id === 'combatant:cleric' || id === 'combatant:wizard') return 'Medium';
  const statblockId = typeof profile['statblockId'] === 'string' ? profile['statblockId'] : '';
  const classification = BUNDLED_MONSTER_ROSTER.find((entry) => entry.id === statblockId)
    ?.statblock.sourceDetails.classification;
  const size = classification?.kind === 'present' ? classification.value.sizes[0] : undefined;
  return size !== undefined && creatureSizes.includes(size as KnownCreatureSize)
    ? size as KnownCreatureSize
    : undefined;
}

function normalizeLegacyOmissions(source: JsonRecord): JsonRecord {
  const normalized = structuredClone(source);
  const combatants = array(normalized['combatants'], 'legacy arena combatants').map((entry) => {
    const combatant = record(entry, 'legacy arena combatant');
    const profile = record(combatant['profile'], 'legacy arena combatant profile');
    const rules = record(profile['rules'], 'legacy arena combatant rules');
    if (own(rules, 'sizeCategory')) return combatant;
    const sizeCategory = legacyMechanicalSize(profile);
    if (sizeCategory === undefined) {
      throw new TypeError(`Legacy arena combatant ${String(profile['id'])} has no documented mechanical-size default.`);
    }
    return { ...combatant, profile: { ...profile, rules: { ...rules, sizeCategory } } };
  });
  const sizes = new Map(combatants.map((entry) => {
    const profile = record(entry['profile'], 'legacy normalized profile');
    const rules = record(profile['rules'], 'legacy normalized rules');
    return [String(profile['id']), rules['sizeCategory']] as const;
  }));
  const tokens = array(normalized['tokens'], 'legacy arena tokens').map((entry) => {
    const token = record(entry, 'legacy arena token');
    if (own(token, 'placementMode')) return token;
    const size = sizes.get(String(token['combatantId']));
    if (typeof size !== 'string' || !creatureSizes.includes(size as KnownCreatureSize)) {
      throw new TypeError(`Legacy arena token ${String(token['id'])} has no documented placement default.`);
    }
    return { ...token, placementMode: { kind: 'normal', actual: size } };
  });
  const environment = record(normalized['environment'], 'legacy arena environment');
  return {
    ...normalized,
    combatants,
    tokens,
    environment: own(environment, 'narrowOpeningRegions')
      ? environment
      : { ...environment, narrowOpeningRegions: [] },
    ...(own(normalized, 'sharedSpaceRelations') ? {} : { sharedSpaceRelations: [] }),
    ...(own(normalized, 'adjudicationPending') ? {} : { adjudicationPending: [] }),
    ...(own(normalized, 'observationHistory') ? {} : { observationHistory: [] }),
  };
}

function validateRules(value: unknown, label: string): void {
  const rules = record(value, label);
  exactOrOptionalKeys(rules, [
    'armorClass', 'hitPointMaximum', 'speed', 'initiativeBonus', 'savingThrowBonuses',
    'attacksPerAction', 'reach', 'damageResponses', 'conditionImmunities', 'usesDeathSaves',
    'senses', 'passivePerception', 'detectionTraits', 'contactMedium', 'sizeCategory', 'spellSlots',
  ], [
    'abilityScores', 'proficiencyBonus', 'creatureType', 'limitedResources', 'featureEffects',
    'skillBonuses', 'legendary', 'magicResistance',
  ], label);
  finite(rules['armorClass'], `${label}.armorClass`);
  safeInteger(rules['hitPointMaximum'], `${label}.hitPointMaximum`, 1);
  finite(rules['speed'], `${label}.speed`);
  finite(rules['initiativeBonus'], `${label}.initiativeBonus`);
  safeInteger(rules['attacksPerAction'], `${label}.attacksPerAction`, 1);
  finite(rules['reach'], `${label}.reach`);
  bool(rules['usesDeathSaves'], `${label}.usesDeathSaves`);
  safeInteger(rules['passivePerception'], `${label}.passivePerception`);
  if (!creatureSizes.includes(rules['sizeCategory'] as KnownCreatureSize)) {
    throw new TypeError(`${label}.sizeCategory must be a known creature size.`);
  }
  if (!['surface', 'liquid', 'air'].includes(String(rules['contactMedium']))) {
    throw new TypeError(`${label}.contactMedium is invalid.`);
  }
  for (const key of ['damageResponses', 'conditionImmunities', 'senses', 'detectionTraits', 'spellSlots'] as const) {
    array(rules[key], `${label}.${key}`);
  }
  const saves = record(rules['savingThrowBonuses'], `${label}.savingThrowBonuses`);
  exactOrOptionalKeys(saves, ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'], [], `${label}.savingThrowBonuses`);
  Object.values(saves).forEach((entry) => finite(entry, `${label}.savingThrowBonuses value`));
}

function decodeProfiles(values: unknown[]): readonly CombatantProfile[] {
  const profiles = values.map((entry, index) => {
    const combatant = record(entry, `state.combatants[${String(index)}]`);
    exactOrOptionalKeys(combatant, [
      'profile', 'hitPoints', 'life', 'deathSaves', 'deathAt', 'turn', 'temporaryHitPoints',
      'wildShapeUses', 'spellSlots',
    ], ['wildShape', 'form', 'limitedResources', 'legendary'], `state.combatants[${String(index)}]`);
    const profile = record(combatant['profile'], `state.combatants[${String(index)}].profile`);
    const kind = profile['kind'];
    const identityKey = kind === 'player_character' ? 'characterId' : kind === 'monster' ? 'statblockId' : null;
    if (identityKey === null) throw new TypeError('Combatant profile kind must be player_character or monster.');
    exactOrOptionalKeys(profile,
      kind === 'player_character'
        ? ['kind', 'id', 'tokenId', 'name', identityKey, 'wildShape', 'rules']
        : ['kind', 'id', 'tokenId', 'name', identityKey, 'rules'],
      [], `state.combatants[${String(index)}].profile`);
    combatantId(text(profile['id'], 'combatant profile id'));
    tokenId(text(profile['tokenId'], 'combatant profile tokenId'));
    text(profile['name'], 'combatant profile name');
    validateRules(profile['rules'], `state.combatants[${String(index)}].profile.rules`);
    safeInteger(combatant['hitPoints'], 'combatant hitPoints');
    const maximum = safeInteger(record(profile['rules'], 'combatant rules')['hitPointMaximum'], 'combatant maximum', 1);
    if ((combatant['hitPoints'] as number) > maximum) throw new TypeError('Combatant hitPoints exceed maximum.');
    if (!['living', 'dying', 'dead'].includes(String(combatant['life']))) throw new TypeError('Combatant life state is invalid.');
    if (combatant['life'] === 'living' && combatant['hitPoints'] === 0) throw new TypeError('A living combatant must have hit points.');
    if (combatant['life'] !== 'living' && combatant['hitPoints'] !== 0) throw new TypeError('A nonliving combatant must have zero hit points.');
    if (combatant['deathSaves'] !== null) {
      const saves = record(combatant['deathSaves'], 'combatant deathSaves');
      exactOrOptionalKeys(saves, ['successes', 'failures'], [], 'combatant deathSaves');
      const successes = safeInteger(saves['successes'], 'death save successes');
      const failures = safeInteger(saves['failures'], 'death save failures');
      if (successes > 2 || failures > 2) throw new TypeError('Active death-save counts cannot exceed 2.');
    }
    if (combatant['deathAt'] !== null) assertJsonGraph(combatant['deathAt'], 'combatant deathAt');
    safeInteger(combatant['temporaryHitPoints'], 'combatant temporaryHitPoints');
    const turn = record(combatant['turn'], 'combatant turn');
    exactOrOptionalKeys(turn, [
      'action', 'bonusActionAvailable', 'reactionAvailable', 'movement', 'disengaging', 'dodging',
    ], [
      'bonusAttacksRemaining', 'bonusAttackGrantEffectId', 'usedDamageRiderEffectIds',
      'usedDamageReductionEffectIds', 'usedSpellDamageModifierEffectIds',
      'additionalLeveledSpellActionsRemaining', 'objectInteractionsUsed',
    ], 'combatant turn');
    const action = record(turn['action'], 'combatant action resource');
    if (!['available', 'attack_sequence', 'spent'].includes(String(action['kind']))) throw new TypeError('Combatant action resource kind is invalid.');
    exactOrOptionalKeys(action, action['kind'] === 'attack_sequence' ? ['kind', 'attacksRemaining'] : ['kind'], [], 'combatant action resource');
    if (action['kind'] === 'attack_sequence') safeInteger(action['attacksRemaining'], 'attacksRemaining', 1);
    bool(turn['bonusActionAvailable'], 'bonusActionAvailable');
    bool(turn['reactionAvailable'], 'reactionAvailable');
    bool(turn['disengaging'], 'disengaging');
    bool(turn['dodging'], 'dodging');
    const movement = record(turn['movement'], 'combatant movement');
    exactOrOptionalKeys(movement, ['remaining', 'speed', 'spent'], [], 'combatant movement');
    for (const amount of Object.values(movement)) finite(amount, 'combatant movement value');
    array(combatant['spellSlots'], 'combatant spellSlots').forEach((slotValue) => {
      const slot = record(slotValue, 'combatant spell slot');
      exactOrOptionalKeys(slot, ['level', 'maximum', 'remaining'], ['recharge'], 'combatant spell slot');
      const level = safeInteger(slot['level'], 'spell slot level', 1);
      const max = safeInteger(slot['maximum'], 'spell slot maximum');
      const remaining = safeInteger(slot['remaining'], 'spell slot remaining');
      if (level > 9 || remaining > max) throw new TypeError('Combatant spell slot is out of range.');
    });
    return structuredClone(profile);
  });
  unique(profiles.map((profile) => String(profile['id'])), 'Combatant ids');
  unique(profiles.map((profile) => String(profile['tokenId'])), 'Combatant token ids');
  return profiles as unknown as readonly CombatantProfile[];
}

function decodeTokens(values: unknown[], profiles: readonly CombatantProfile[]): readonly CombatToken[] {
  const tokens = values.map((entry, index) => {
    const token = record(entry, `state.tokens[${String(index)}]`);
    exactOrOptionalKeys(token, ['id', 'combatantId', 'position', 'placementMode'], [], `state.tokens[${String(index)}]`);
    const id = tokenId(text(token['id'], 'token id'));
    const owner = combatantId(text(token['combatantId'], 'token combatantId'));
    const position = decodeCell(token['position'], 'token position');
    const placement = record(token['placementMode'], 'token placementMode');
    const kind = placement['kind'];
    exactOrOptionalKeys(placement, ['kind', 'actual'], kind === 'squeezed' ? ['sizedFor'] : [], 'token placementMode');
    if (kind !== 'normal' && kind !== 'squeezed') throw new TypeError('Token placementMode kind is invalid.');
    if (!creatureSizes.includes(placement['actual'] as KnownCreatureSize) ||
      (kind === 'squeezed' && !creatureSizes.includes(placement['sizedFor'] as KnownCreatureSize))) {
      throw new TypeError('Token placementMode size is invalid.');
    }
    const profile = profiles.find((candidate) => candidate.id === owner);
    if (profile === undefined || profile.tokenId !== id) throw new TypeError('Token does not match one combatant profile.');
    return structuredClone(token);
  });
  unique(tokens.map((entry) => String(entry['id'])), 'Token ids');
  unique(tokens.map((entry) => String(entry['combatantId'])), 'Token combatant ids');
  return tokens as unknown as readonly CombatToken[];
}

function decodeEnvironment(value: unknown): EncounterEnvironment {
  const environment = record(value, 'state.environment');
  exactOrOptionalKeys(environment, [
    'lightRegions', 'difficultTerrainRegions', 'obscurementRegions', 'narrowOpeningRegions',
  ], ['movementRegions'], 'state.environment');
  for (const key of ['lightRegions', 'difficultTerrainRegions', 'obscurementRegions', 'narrowOpeningRegions'] as const) {
    array(environment[key], `state.environment.${key}`).forEach((entry) => assertJsonGraph(entry, `state.environment.${key} entry`));
  }
  if (own(environment, 'movementRegions')) array(environment['movementRegions'], 'state.environment.movementRegions');
  return structuredClone(environment) as unknown as EncounterEnvironment;
}

function assertRecordArray(value: unknown, label: string): void {
  array(value, label).forEach((entry, index) => {
    record(entry, `${label}[${String(index)}]`);
    assertJsonGraph(entry, `${label}[${String(index)}]`);
  });
}

function validateSequences(state: JsonRecord): void {
  const collections = [
    ['eventLog', 'nextEventSequence'],
    ['effects', 'nextEffectSequence'],
    ['persistentAreas', 'nextPersistentAreaSequence'],
  ] as const;
  for (const [collectionKey, nextKey] of collections) {
    const collection = array(state[collectionKey], `state.${collectionKey}`);
    const sequenceValues = collection.flatMap((entry) => {
      const item = record(entry, `state.${collectionKey} entry`);
      return typeof item['sequence'] === 'number' ? [safeInteger(item['sequence'], `${collectionKey} sequence`, 1)] : [];
    });
    unique(sequenceValues.map(String), `${collectionKey} sequences`);
    const next = safeInteger(state[nextKey], `state.${nextKey}`, 1);
    if (sequenceValues.some((sequence) => sequence >= next)) throw new TypeError(`${nextKey} must exceed existing sequences.`);
  }
}

function validateInitiative(state: JsonRecord, mode: EncounterStateDecodeMode, ids: readonly CombatantId[]): void {
  const initiative = array(state['initiative'], 'state.initiative').map((entry, index) => {
    const row = record(entry, `state.initiative[${String(index)}]`);
    exactOrOptionalKeys(row, ['combatant', 'total', 'roll', 'bonus', 'slot'], [], `state.initiative[${String(index)}]`);
    const combatant = combatantId(text(row['combatant'], 'initiative combatant'));
    finite(row['total'], 'initiative total');
    finite(row['roll'], 'initiative roll');
    finite(row['bonus'], 'initiative bonus');
    safeInteger(row['slot'], 'initiative slot');
    if ((row['roll'] as number) + (row['bonus'] as number) !== row['total']) {
      throw new TypeError('Initiative total must equal roll plus bonus.');
    }
    return combatant;
  });
  unique(initiative, 'Initiative combatants');
  const active = state['activeCombatant'];
  const activeIndex = state['activeInitiativeIndex'];
  if (initiative.length === 0) {
    if (active !== null || activeIndex !== null) throw new TypeError('Empty initiative requires null active combatant and index.');
    if (mode === 'challenge') throw new TypeError('Challenge mode requires nonempty complete initiative.');
    return;
  }
  if (typeof active !== 'string' || !Number.isSafeInteger(activeIndex) || (activeIndex as number) < 0 ||
    (activeIndex as number) >= initiative.length || initiative[activeIndex as number] !== active) {
    throw new TypeError('Active initiative combatant and index are inconsistent.');
  }
  const alerting = own(state, 'alerting') ? state['alerting'] as EncounterState['alerting'] : undefined;
  const expected = mode === 'challenge'
    ? ids
    : ids.filter((id) => isEncounterParticipant(alerting, id));
  if (initiative.length !== expected.length || expected.some((id) => !initiative.includes(id))) {
    throw new TypeError(`${mode} initiative must contain every encounter participant exactly once.`);
  }
}

export function decodeEncounterStateV1(value: unknown, mode: EncounterStateDecodeMode): EncounterState {
  const input = record(value, 'encounter state');
  const state = mode === 'legacy_basis' ? normalizeLegacyOmissions(input) : structuredClone(input);
  exactOrOptionalKeys(state, REQUIRED_STATE_KEYS, OPTIONAL_STATE_KEYS, 'encounter state');
  const config = record(state['config'], 'state.config');
  exactOrOptionalKeys(config, ['initiativeMode'], ['optionalRules'], 'state.config');
  if (!['per_combatant', 'shared_enemy', 'side_alternating'].includes(String(config['initiativeMode'])) ||
    (own(config, 'optionalRules') && !Array.isArray(config['optionalRules']))) {
    throw new TypeError('Encounter state config is invalid.');
  }
  const phase = record(state['phase'], 'state.phase');
  text(phase['kind'], 'state.phase.kind');
  if (state['rulesEdition'] !== '2014' && state['rulesEdition'] !== '2024') throw new TypeError('Encounter rulesEdition is invalid.');
  array(state['hiddenRolls'], 'state.hiddenRolls').forEach((entry) => text(entry, 'hidden roll category'));
  safeInteger(state['revision'], 'state.revision');
  safeInteger(state['round'], 'state.round');
  const bounds = record(state['bounds'], 'state.bounds');
  exactOrOptionalKeys(bounds, ['columns', 'rows'], [], 'state.bounds');
  safeInteger(bounds['columns'], 'state.bounds.columns', 1);
  safeInteger(bounds['rows'], 'state.bounds.rows', 1);
  const combatants = array(state['combatants'], 'state.combatants');
  if (combatants.length === 0) throw new TypeError('Encounter state requires at least one combatant.');
  const profiles = decodeProfiles(combatants);
  const tokens = decodeTokens(array(state['tokens'], 'state.tokens'), profiles);
  decodeEnvironment(state['environment']);
  const cells = (key: 'blockedCells' | 'foggedCells') => array(state[key], `state.${key}`).map((entry, index) =>
    decodeCell(entry, `state.${key}[${String(index)}]`));
  const blockedCells = cells('blockedCells');
  const foggedCells = cells('foggedCells');
  unique(blockedCells.map((cell) => `${String(cell.column)},${String(cell.row)}`), 'Blocked cells');
  unique(foggedCells.map((cell) => `${String(cell.column)},${String(cell.row)}`), 'Fogged cells');
  const worldObjects = array(state['worldObjects'], 'state.worldObjects');
  assertRecordArray(worldObjects, 'state.worldObjects');
  array(state['dmNotes'], 'state.dmNotes').forEach((entry) => text(entry, 'DM note'));
  for (const key of [
    'sharedSpaceRelations', 'adjudicationPending', 'effects', 'persistentAreas', 'eventLog',
    'hiddenCombatants', 'observationHistory', 'pendingDecisions', 'reactionPolicies',
  ] as const) assertRecordArray(state[key], `state.${key}`);
  for (const key of ['nextEventSequence', 'nextDecisionSequence', 'nextEffectSequence', 'nextWorldObjectSequence', 'nextPersistentAreaSequence'] as const) {
    safeInteger(state[key], `state.${key}`, 1);
  }
  validateSequences(state);
  const ids = profiles.map((profile) => profile.id);
  validateInitiative(state, mode, ids);
  if (mode === 'challenge') {
    const decodedBounds = { columns: bounds['columns'] as number, rows: bounds['rows'] as number };
    const spaces = tokens.map((token) => {
      const profile = profiles.find((candidate) => candidate.id === token.combatantId);
      if (profile?.rules.sizeCategory === undefined) throw new TypeError('Challenge token has no mechanical size.');
      const sized = sizedCombatantState(profile.rules.sizeCategory);
      const space = creatureSpace(sized, placementFromSerialized(sized, {
        anchor: token.position,
        mode: token.placementMode,
      }));
      if (!spaceFitsBounds(space, decodedBounds) || space.cells.some((cell) =>
        blockedCells.some((blocked) => blocked.column === cell.column && blocked.row === cell.row))) {
        throw new TypeError(`Challenge token ${String(token.id)} has an illegal footprint.`);
      }
      return { id: token.combatantId, space };
    });
    for (let left = 0; left < spaces.length; left += 1) {
      for (let right = left + 1; right < spaces.length; right += 1) {
        const leftSpace = spaces[left];
        const rightSpace = spaces[right];
        if (leftSpace !== undefined && rightSpace !== undefined && spacesIntersect(leftSpace.space, rightSpace.space)) {
          throw new TypeError(`Challenge combatants ${String(leftSpace.id)} and ${String(rightSpace.id)} have illegal occupancy.`);
        }
      }
    }
  }
  return state as unknown as EncounterState;
}
