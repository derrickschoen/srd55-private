import { canonicalJson } from '../commands/canonical-json';
import type { EncounterState } from '../combat/encounter';
import type { GridCell } from '../combat/grid';
import type { EncounterIr } from './encounter-ir';
import {
  type AuthoredPartySeat,
  type GeneratedRoom,
  type RoomMonsterRosterEntry,
  type RoomSpec,
  type RoomTerrainFeature,
  type SampledPartySeat,
  type SampledSpellSlot,
} from './room-generator';
import { decodeEncounterStateV1 } from './encounter-state-codec';

type JsonRecord = Readonly<Record<string, unknown>>;

const ROOM_GRID_DIMENSIONS = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24] as const;
const PARTY_HIT_POINT_FRACTIONS = [1, 0.75, 0.5, 0.25, 0] as const;

function record(value: unknown, label: string): JsonRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
  return value as JsonRecord;
}

function array(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array.`);
  return value;
}

function exactOrOptionalKeys(value: JsonRecord, required: readonly string[], optional: readonly string[], label: string): void {
  const allowed = new Set([...required, ...optional]);
  const unknown = Object.keys(value).find((key) => !allowed.has(key));
  const missing = required.find((key) => !Object.hasOwn(value, key));
  if (unknown !== undefined || missing !== undefined) {
    throw new TypeError(`${label} has ${unknown === undefined ? `missing key ${String(missing)}` : `unknown key ${unknown}`}.`);
  }
}

function safeInteger(value: unknown, label: string, minimum = 0): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) throw new TypeError(`${label} must be a safe integer >= ${String(minimum)}.`);
  return value as number;
}

function stringValue(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) throw new TypeError(`${label} must be a non-empty trimmed string.`);
  return value;
}

function bool(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`${label} must be boolean.`);
  return value;
}

function decodeCell(value: unknown, label: string): GridCell {
  const cell = record(value, label);
  exactOrOptionalKeys(cell, ['column', 'row'], [], label);
  return { column: safeInteger(cell['column'], `${label}.column`), row: safeInteger(cell['row'], `${label}.row`) };
}

function decodeSpellSlots(value: unknown, label: string): readonly SampledSpellSlot[] {
  return array(value, label).map((entry) => {
    const slot = record(entry, `${label} entry`);
    exactOrOptionalKeys(slot, ['level', 'maximum', 'remaining', 'spent'], [], `${label} entry`);
    const level = safeInteger(slot['level'], `${label}.level`, 1);
    const maximum = safeInteger(slot['maximum'], `${label}.maximum`);
    const remaining = safeInteger(slot['remaining'], `${label}.remaining`);
    const spent = safeInteger(slot['spent'], `${label}.spent`);
    if (level > 9 || remaining + spent !== maximum) throw new TypeError(`${label} must reconcile maximum = remaining + spent.`);
    return { level, maximum, remaining, spent };
  });
}

function decodePartySeat(value: unknown, challenge: boolean): SampledPartySeat | AuthoredPartySeat {
  const seat = record(value, 'room spec party seat');
  const authored = seat['source'] === 'authored_exact';
  exactOrOptionalKeys(seat,
    authored
      ? ['source', 'combatantId', 'hitPoints', 'life', 'deathSaves', 'spellSlots', 'concentrating']
      : ['combatantId', 'hitPointFraction', 'hitPoints', 'life', 'deathSaves', 'spellSlots', 'concentrating'],
    [], 'room spec party seat');
  if (challenge !== authored) throw new TypeError(challenge
    ? 'Challenge fixtures require authored_exact party seats.'
    : 'Legacy bases must retain sampled party seats.');
  const hitPoints = safeInteger(seat['hitPoints'], 'room party hitPoints');
  const life = seat['life'];
  if (life !== 'living' && life !== 'dying' && (authored ? life !== 'dead' : true)) throw new TypeError('Room party life is invalid.');
  let deathSaves: null | { readonly successes: number; readonly failures: number } = null;
  if (seat['deathSaves'] !== null) {
    const saves = record(seat['deathSaves'], 'room party deathSaves');
    exactOrOptionalKeys(saves, ['successes', 'failures'], [], 'room party deathSaves');
    deathSaves = {
      successes: safeInteger(saves['successes'], 'room party death save successes'),
      failures: safeInteger(saves['failures'], 'room party death save failures'),
    };
  }
  const common = {
    combatantId: stringValue(seat['combatantId'], 'room party combatantId'),
    hitPoints,
    life,
    deathSaves,
    spellSlots: decodeSpellSlots(seat['spellSlots'], 'room party spellSlots'),
    concentrating: bool(seat['concentrating'], 'room party concentrating'),
  };
  if (authored) return { source: 'authored_exact', ...common } as AuthoredPartySeat;
  if (!PARTY_HIT_POINT_FRACTIONS.includes(seat['hitPointFraction'] as SampledPartySeat['hitPointFraction'])) {
    throw new TypeError('Generated room party hitPointFraction is outside the closed generator set.');
  }
  return { ...common, hitPointFraction: seat['hitPointFraction'] } as SampledPartySeat;
}

function decodeRosterEntry(value: unknown): RoomMonsterRosterEntry {
  const entry = record(value, 'room spec monster roster entry');
  exactOrOptionalKeys(entry, ['combatantId', 'tokenId', 'statblockId', 'challengeRating', 'challengeEighths'], [], 'room spec monster roster entry');
  const challengeRating = entry['challengeRating'];
  if (!['1/8', '1/4', '1/2', 1, 2, 3, 4, 5, 6, 11].includes(challengeRating as string | number)) {
    throw new TypeError('Room roster challenge rating is invalid.');
  }
  return {
    combatantId: stringValue(entry['combatantId'], 'room roster combatantId') as RoomMonsterRosterEntry['combatantId'],
    tokenId: stringValue(entry['tokenId'], 'room roster tokenId') as RoomMonsterRosterEntry['tokenId'],
    statblockId: stringValue(entry['statblockId'], 'room roster statblockId'),
    challengeRating: challengeRating as RoomMonsterRosterEntry['challengeRating'],
    challengeEighths: safeInteger(entry['challengeEighths'], 'room roster challengeEighths', 1),
  };
}

function decodeTerrain(value: unknown): readonly RoomTerrainFeature[] {
  return array(value, 'room spec terrain').map((entry) => {
    const feature = record(entry, 'room spec terrain feature');
    const kind = feature['kind'];
    if (kind === 'wall') {
      exactOrOptionalKeys(feature, ['kind', 'id', 'terrainKind', 'cells'], [], 'room wall');
      if (feature['terrainKind'] !== 'wall') throw new TypeError('Room wall terrainKind must be wall.');
    } else if (kind === 'cover-object') {
      exactOrOptionalKeys(feature, ['kind', 'object'], [], 'room cover object');
    } else if (kind === 'difficult-terrain-patch') {
      exactOrOptionalKeys(feature, ['kind', 'id', 'cells'], [], 'room difficult terrain');
    } else if (kind === 'hazard-object') {
      exactOrOptionalKeys(feature, ['kind', 'object'], [], 'room hazard object');
    } else if (kind === 'light-source') {
      exactOrOptionalKeys(feature, ['kind', 'object', 'level', 'cells'], [], 'room light source');
    } else if (kind === 'obscurement-patch') {
      exactOrOptionalKeys(feature, ['kind', 'id', 'obscurement', 'cells'], [], 'room obscurement');
    } else {
      throw new TypeError('Room terrain feature kind is invalid.');
    }
    return structuredClone(feature) as unknown as RoomTerrainFeature;
  });
}

function decodeSpec(value: unknown, challenge: boolean): RoomSpec {
  const spec = record(value, 'arena basis spec');
  exactOrOptionalKeys(spec, [
    'seed', 'dimensions', 'terrain', 'blockedCells', 'monsterRoster', 'challengeBudgetEighths',
    'challengeSpentEighths', 'partyState',
  ], ['difficultyProfile', 'terrainProfile', 'hardFeatures'], 'arena basis spec');
  const dimensions = record(spec['dimensions'], 'arena basis dimensions');
  exactOrOptionalKeys(dimensions, ['columns', 'rows'], [], 'arena basis dimensions');
  const columns = safeInteger(dimensions['columns'], 'arena basis columns', 1);
  const rows = safeInteger(dimensions['rows'], 'arena basis rows', 1);
  if (!ROOM_GRID_DIMENSIONS.includes(columns as RoomSpec['dimensions']['columns']) ||
    !ROOM_GRID_DIMENSIONS.includes(rows as RoomSpec['dimensions']['rows'])) {
    throw new TypeError('Arena basis dimensions must remain in the closed 12..24 range.');
  }
  if (challenge && (columns !== 15 || rows !== 12)) throw new TypeError('Challenge room dimensions must be 15x12.');
  const roster = array(spec['monsterRoster'], 'arena basis monsterRoster').map(decodeRosterEntry);
  const budget = safeInteger(spec['challengeBudgetEighths'], 'arena basis challengeBudgetEighths');
  const spent = safeInteger(spec['challengeSpentEighths'], 'arena basis challengeSpentEighths');
  const rosterSpent = roster.reduce((total, entry) => total + entry.challengeEighths, 0);
  if (spent !== rosterSpent || (challenge && budget !== spent)) throw new TypeError('Arena basis challenge budget does not agree with its roster.');
  return {
    seed: safeInteger(spec['seed'], 'arena basis seed'),
    ...(Object.hasOwn(spec, 'difficultyProfile') ? { difficultyProfile: spec['difficultyProfile'] as NonNullable<RoomSpec['difficultyProfile']> } : {}),
    ...(Object.hasOwn(spec, 'terrainProfile') ? { terrainProfile: spec['terrainProfile'] as NonNullable<RoomSpec['terrainProfile']> } : {}),
    dimensions: { columns: columns as RoomSpec['dimensions']['columns'], rows: rows as RoomSpec['dimensions']['rows'] },
    terrain: decodeTerrain(spec['terrain']),
    blockedCells: array(spec['blockedCells'], 'arena basis blockedCells').map((entry) => decodeCell(entry, 'arena basis blocked cell')),
    monsterRoster: roster,
    challengeBudgetEighths: budget,
    challengeSpentEighths: spent,
    partyState: array(spec['partyState'], 'arena basis partyState').map((entry) => decodePartySeat(entry, challenge)),
    ...(Object.hasOwn(spec, 'hardFeatures') ? { hardFeatures: structuredClone(spec['hardFeatures']) as NonNullable<RoomSpec['hardFeatures']> } : {}),
  };
}

function assertCanonicalEqual(left: unknown, right: unknown, label: string): void {
  if (canonicalJson(left) !== canonicalJson(right)) throw new TypeError(`${label} do not agree.`);
}

function validateSpecAgreement(room: GeneratedRoom, challenge: boolean): void {
  const { spec, encounter } = room;
  const state = encounter.state;
  assertCanonicalEqual(spec.dimensions, state.bounds, 'Arena basis spec dimensions and state bounds');
  assertCanonicalEqual(spec.blockedCells, state.blockedCells, 'Arena basis spec and state blocked cells');
  if (encounter.provenance.seed !== spec.seed) throw new TypeError('Arena basis spec seed and encounter provenance seed do not agree.');
  const stateMonsters = state.combatants.filter((entry) => entry.profile.kind === 'monster');
  if (stateMonsters.length !== spec.monsterRoster.length || spec.monsterRoster.some((entry) => {
    const stateEntry = stateMonsters.find((candidate) => candidate.profile.id === entry.combatantId);
    return stateEntry === undefined || stateEntry.profile.kind !== 'monster' ||
      stateEntry.profile.tokenId !== entry.tokenId || stateEntry.profile.statblockId !== entry.statblockId;
  })) throw new TypeError('Arena basis monster roster and state do not agree.');
  const party = state.combatants.filter((entry) => entry.profile.kind === 'player_character');
  if (party.length !== spec.partyState.length || spec.partyState.some((seat) => {
    const stateSeat = party.find((candidate) => candidate.profile.id === seat.combatantId);
    if (stateSeat === undefined || stateSeat.hitPoints !== seat.hitPoints || stateSeat.life !== seat.life ||
      canonicalJson(stateSeat.deathSaves) !== canonicalJson(seat.deathSaves)) return true;
    const slots = stateSeat.spellSlots.map((slot) => ({
      level: slot.level, maximum: slot.maximum, remaining: slot.remaining, spent: slot.maximum - slot.remaining,
    }));
    const concentrating = state.effects.some((effect) => effect.concentrationOwner === stateSeat.profile.id);
    return canonicalJson(slots) !== canonicalJson(seat.spellSlots) || concentrating !== seat.concentrating;
  })) throw new TypeError('Arena basis party state and RoomSpec do not agree.');
  for (const feature of spec.terrain) {
    if (feature.kind === 'wall') {
      if (feature.cells.some((cell) => !state.blockedCells.some((blocked) => canonicalJson(blocked) === canonicalJson(cell))) ||
        (challenge && !state.worldObjects.some((object) => String(object.id) === feature.id && object.blocking.cover === 'total' &&
          canonicalJson(object.footprint) === canonicalJson(feature.cells)))) {
        throw new TypeError(`Arena basis wall ${feature.id} does not agree with state terrain.`);
      }
    } else if (feature.kind === 'cover-object') {
      const object = state.worldObjects.find((candidate) => candidate.id === feature.object.id);
      if (object === undefined || canonicalJson(object) !== canonicalJson(feature.object)) {
        throw new TypeError(`Arena basis cover object ${String(feature.object.id)} does not agree with state terrain.`);
      }
    }
  }
  if (challenge) {
    if (state.rulesEdition !== '2024' || state.round !== 2 || state.revision !== 0 || state.config.initiativeMode !== 'per_combatant') {
      throw new TypeError('Challenge state must use 2024 rules, round 2, revision 0, and per-combatant initiative.');
    }
    const expectedBonuses = new Map([['combatant:fighter', 2], ['combatant:cleric', 1], ['combatant:wizard', 2]]);
    if ([...expectedBonuses].some(([id, bonus]) =>
      state.combatants.find((entry) => entry.profile.id === id)?.profile.rules.initiativeBonus !== bonus)) {
      throw new TypeError('Challenge state must use the derived_v1 reference-PC initiative bonuses.');
    }
    if (state.combatants.some((entry) => {
      const dexterity = entry.profile.rules.abilityScores?.dexterity;
      return dexterity === undefined || entry.profile.rules.initiativeBonus !== Math.floor((dexterity - 10) / 2);
    })) {
      throw new TypeError('Challenge state derived_v1 application must be byte-idempotent.');
    }
    const allCells = new Set(state.environment.lightRegions
      .filter((region) => region.level === 'bright')
      .flatMap((region) => region.cells.map((cell) => `${String(cell.column)},${String(cell.row)}`)));
    if (allCells.size !== state.bounds.columns * state.bounds.rows) throw new TypeError('Challenge state must expose complete bright lighting.');
  }
}

export function decodeArenaBasisEnvelopeV1(
  value: unknown,
  options: { readonly mode: 'legacy_basis' | 'challenge' },
): GeneratedRoom {
  const root = record(value, 'arena basis envelope');
  exactOrOptionalKeys(root, ['spec', 'encounter'], [], 'arena basis envelope');
  const challenge = options.mode === 'challenge';
  const spec = decodeSpec(root['spec'], challenge);
  const encounter = record(root['encounter'], 'arena basis encounter');
  exactOrOptionalKeys(encounter, ['schemaVersion', 'provenance', 'state'], [], 'arena basis encounter');
  if (encounter['schemaVersion'] !== 1) throw new TypeError('Arena basis encounter schemaVersion must be 1.');
  const provenance = record(encounter['provenance'], 'arena basis provenance');
  exactOrOptionalKeys(provenance, ['source', 'licenseTag', 'seed'], [], 'arena basis provenance');
  if (!['generated', 'watabou', 'imported'].includes(String(provenance['source'])) ||
    typeof provenance['licenseTag'] !== 'string' ||
    !(provenance['seed'] === null || Number.isSafeInteger(provenance['seed']))) {
    throw new TypeError('Arena basis provenance is malformed.');
  }
  const state = decodeEncounterStateV1(encounter['state'], options.mode);
  const room: GeneratedRoom = {
    spec,
    encounter: {
      schemaVersion: 1,
      provenance: structuredClone(provenance) as unknown as EncounterIr['provenance'],
      state,
    },
  };
  validateSpecAgreement(room, challenge);
  return room;
}

export function decodeSessionSnapshotV1(value: unknown): EncounterState {
  const root = record(value, 'engine session snapshot');
  exactOrOptionalKeys(root, ['encounter'], [], 'engine session snapshot');
  const encounter = record(root['encounter'], 'engine session snapshot encounter');
  exactOrOptionalKeys(encounter, ['state'], [], 'engine session snapshot encounter');
  return decodeEncounterStateV1(encounter['state'], 'session');
}

export function decodeEngineFixtureV1(value: unknown): EncounterState {
  const root = record(value, 'engine fixture');
  if (!Object.hasOwn(root, 'spec')) return decodeSessionSnapshotV1(root);
  const spec = record(root['spec'], 'engine fixture spec');
  if (Object.hasOwn(spec, 'seed')) {
    return decodeArenaBasisEnvelopeV1(root, { mode: 'legacy_basis' }).encounter.state;
  }
  const encounter = record(root['encounter'], 'engine fixture encounter');
  return decodeEncounterStateV1(encounter['state'], 'legacy_basis');
}
