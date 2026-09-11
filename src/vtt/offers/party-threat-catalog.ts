import { canonicalJson } from '../../commands/canonical-json';
import { combatantId, type CombatantId } from '../../combat/values';
import { sha256 } from '../../crypto/sha256';
import { abilities, type Ability } from '../../domain/enums';

export type PartyThreatRange =
  | { readonly kind: 'melee'; readonly reachFeet: number }
  | {
      readonly kind: 'ranged';
      readonly normalRangeFeet: number;
      readonly longRangeFeet: number | null;
    };

export type PartyThreatTargeting =
  | { readonly kind: 'direct'; readonly range: PartyThreatRange }
  | {
      readonly kind: 'area';
      readonly placementRangeFeet: number;
      readonly shape: 'cone' | 'cube' | 'cylinder' | 'line' | 'sphere';
      readonly sizeFeet: number;
      readonly secondarySizeFeet: number | null;
    };

export type PartyThreatResolution =
  | { readonly kind: 'attack_roll' }
  | { readonly kind: 'saving_throw'; readonly ability: Ability };

export interface PartyThreatCatalogEntry {
  readonly attackerId: CombatantId;
  readonly sourceId: string;
  readonly actionId: string;
  readonly targeting: PartyThreatTargeting;
  readonly resolution: PartyThreatResolution;
}

export type PartyThreatCatalogBody =
  | {
      readonly format: 'party-threat-catalog-v1';
      readonly representation: 'unrepresented';
      readonly entries: readonly [];
    }
  | {
      readonly format: 'party-threat-catalog-v1';
      readonly representation: 'represented';
      readonly entries: readonly PartyThreatCatalogEntry[];
    };

export type PartyThreatCatalog = PartyThreatCatalogBody & { readonly digest: string };

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function exactKeys(
  value: Readonly<Record<string, unknown>>,
  keys: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError(`${label} has an invalid shape.`);
  }
}

function boundedText(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() !== value || value.length < 1 || value.length > 200) {
    throw new TypeError(`${label} must be trimmed text between 1 and 200 characters.`);
  }
  return value;
}

function nonNegativeFeet(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new TypeError(`${label} must be finite, non-negative feet.`);
  }
  return value;
}

function decodeRange(value: unknown): PartyThreatRange {
  const range = record(value, 'party threat range');
  if (range['kind'] === 'melee') {
    exactKeys(range, ['kind', 'reachFeet'], 'party threat melee range');
    return { kind: 'melee', reachFeet: nonNegativeFeet(range['reachFeet'], 'party threat reach') };
  }
  if (range['kind'] === 'ranged') {
    exactKeys(range, ['kind', 'normalRangeFeet', 'longRangeFeet'], 'party threat ranged range');
    const normalRangeFeet = nonNegativeFeet(range['normalRangeFeet'], 'party threat normal range');
    const longRangeFeet = range['longRangeFeet'] === null
      ? null
      : nonNegativeFeet(range['longRangeFeet'], 'party threat long range');
    if (longRangeFeet !== null && longRangeFeet < normalRangeFeet) {
      throw new TypeError('Party threat long range cannot be shorter than normal range.');
    }
    return { kind: 'ranged', normalRangeFeet, longRangeFeet };
  }
  throw new TypeError('Party threat range kind is invalid.');
}

function decodeTargeting(value: unknown): PartyThreatTargeting {
  const targeting = record(value, 'party threat targeting');
  if (targeting['kind'] === 'direct') {
    exactKeys(targeting, ['kind', 'range'], 'party threat direct targeting');
    return { kind: 'direct', range: decodeRange(targeting['range']) };
  }
  if (targeting['kind'] === 'area') {
    exactKeys(
      targeting,
      ['kind', 'placementRangeFeet', 'shape', 'sizeFeet', 'secondarySizeFeet'],
      'party threat area targeting',
    );
    const shapes = ['cone', 'cube', 'cylinder', 'line', 'sphere'] as const;
    if (!shapes.some((shape) => shape === targeting['shape'])) {
      throw new TypeError('Party threat area shape is invalid.');
    }
    const shape = targeting['shape'] as Extract<PartyThreatTargeting, { readonly kind: 'area' }>['shape'];
    const secondarySizeFeet = targeting['secondarySizeFeet'] === null
      ? null
      : nonNegativeFeet(targeting['secondarySizeFeet'], 'party threat secondary size');
    return {
      kind: 'area',
      placementRangeFeet: nonNegativeFeet(targeting['placementRangeFeet'], 'party threat placement range'),
      shape,
      sizeFeet: nonNegativeFeet(targeting['sizeFeet'], 'party threat size'),
      secondarySizeFeet,
    };
  }
  throw new TypeError('Party threat targeting kind is invalid.');
}

function decodeResolution(value: unknown): PartyThreatResolution {
  const resolution = record(value, 'party threat resolution');
  if (resolution['kind'] === 'attack_roll') {
    exactKeys(resolution, ['kind'], 'party threat attack-roll resolution');
    return { kind: 'attack_roll' };
  }
  if (resolution['kind'] === 'saving_throw') {
    exactKeys(resolution, ['kind', 'ability'], 'party threat saving-throw resolution');
    if (!abilities.some((ability) => ability === resolution['ability'])) {
      throw new TypeError('Party threat saving-throw ability is invalid.');
    }
    return { kind: 'saving_throw', ability: resolution['ability'] as Ability };
  }
  throw new TypeError('Party threat resolution kind is invalid.');
}

function decodeEntry(value: unknown): PartyThreatCatalogEntry {
  const entry = record(value, 'party threat catalog entry');
  exactKeys(entry, ['attackerId', 'sourceId', 'actionId', 'targeting', 'resolution'], 'party threat catalog entry');
  return {
    attackerId: combatantId(boundedText(entry['attackerId'], 'party threat attacker id')),
    sourceId: boundedText(entry['sourceId'], 'party threat source id'),
    actionId: boundedText(entry['actionId'], 'party threat action id'),
    targeting: decodeTargeting(entry['targeting']),
    resolution: decodeResolution(entry['resolution']),
  };
}

function entryKey(entry: PartyThreatCatalogEntry): string {
  return `${entry.attackerId}\u0000${entry.sourceId}`;
}

function digestBody(body: PartyThreatCatalogBody): string {
  return sha256(canonicalJson(body));
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

export function decodePartyThreatCatalog(value: unknown): PartyThreatCatalog {
  const catalog = record(value, 'party threat catalog');
  exactKeys(catalog, ['format', 'representation', 'entries', 'digest'], 'party threat catalog');
  if (catalog['format'] !== 'party-threat-catalog-v1' ||
    (catalog['representation'] !== 'unrepresented' && catalog['representation'] !== 'represented') ||
    !Array.isArray(catalog['entries']) || typeof catalog['digest'] !== 'string' ||
    !/^[0-9a-f]{64}$/u.test(catalog['digest'])) {
    throw new TypeError('Party threat catalog header is invalid.');
  }
  const entries = catalog['entries'].map(decodeEntry);
  if (catalog['representation'] === 'unrepresented' && entries.length !== 0) {
    throw new TypeError('An unrepresented party threat catalog must be empty.');
  }
  if (catalog['representation'] === 'represented' && entries.length === 0) {
    throw new TypeError('A represented party threat catalog must contain at least one entry.');
  }
  const keys = entries.map(entryKey);
  if (new Set(keys).size !== keys.length || keys.some((key, index) => index > 0 && key <= (keys[index - 1] ?? ''))) {
    throw new TypeError('Party threat catalog entries must be unique and canonically ordered.');
  }
  const body: PartyThreatCatalogBody = catalog['representation'] === 'unrepresented'
    ? { format: 'party-threat-catalog-v1', representation: 'unrepresented', entries: [] }
    : { format: 'party-threat-catalog-v1', representation: 'represented', entries };
  if (catalog['digest'] !== digestBody(body)) {
    throw new TypeError('Party threat catalog digest is invalid.');
  }
  return deepFreeze({ ...body, digest: catalog['digest'] });
}

export function createPartyThreatCatalog(body: PartyThreatCatalogBody): PartyThreatCatalog {
  return decodePartyThreatCatalog({ ...structuredClone(body), digest: digestBody(body) });
}

export function createUnrepresentedPartyThreatCatalog(): PartyThreatCatalog {
  return createPartyThreatCatalog({
    format: 'party-threat-catalog-v1',
    representation: 'unrepresented',
    entries: [],
  });
}
