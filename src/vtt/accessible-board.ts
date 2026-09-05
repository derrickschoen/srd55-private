import {
  decodeProjectedCreatureSpace,
  minimumSpaceDistance,
} from '../combat/creature-space';
import type { CombatantId } from '../combat/values';
import { hpBandOf, type HpBand } from './board-chrome';
import type {
  EncounterBoardCombatant,
  EncounterBoardPlacedCombatant,
  EncounterBoardProjectionShape,
  EncounterBoardWorldObject,
} from './encounter-board';
import { stableRenderKey } from './stable-dom-render';

export const ACCESSIBLE_BOARD_VIEW_MODES = ['graphic', 'screen_reader'] as const;
export type AccessibleBoardViewMode = (typeof ACCESSIBLE_BOARD_VIEW_MODES)[number];
export type AccessibleBoardAudience = 'dm' | 'player';

export interface AccessibleBoardContext {
  readonly encounterName: string;
  readonly audience: AccessibleBoardAudience;
  readonly round: number;
  readonly activeCombatant: CombatantId | null;
  readonly board: EncounterBoardProjectionShape;
}

export const ACCESSIBLE_BOARD_COORDINATE_CONVENTION =
  'Coordinates are zero-based (column,row), the origin is at the top-left, and each cell represents 5 feet.';

const TERM_LEGEND = [
  ['Party', 'A player-character creature.'],
  ['Foe', 'A monster creature.'],
  ['HP band', 'Uninjured, bloodied, near death, or unknown; it is not an exact Hit Point total.'],
  ['Hidden from players', 'The DM knows this creature is hidden; player exports omit it and its current cell.'],
  ['Last known', 'A previously observed position, not the creature\'s current position.'],
  ['Difficult terrain', 'A projected terrain or area fact that increases movement cost.'],
  ['Obscurement', 'Light, heavy, or magical-darkness obscurement projected for a cell.'],
  ['Fog or concealed', 'The audience projection does not reveal the cell\'s contents.'],
  ['Blocked', 'The projection marks the cell as unavailable for movement.'],
  ['Adjacent', 'Creature spaces are within 5 feet, measured between their footprints.'],
] as const;

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function cellKey(cell: { readonly column: number; readonly row: number }): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

function cellText(cell: { readonly column: number; readonly row: number }): string {
  return `(${String(cell.column)},${String(cell.row)})`;
}

function creatureNumber(context: AccessibleBoardContext, id: CombatantId): number {
  const index = context.board.combatants.findIndex((combatant) => combatant.id === id);
  if (index < 0) throw new Error(`Accessible board cannot number unknown creature ${String(id)}.`);
  return index + 1;
}

function activeCreatureName(context: AccessibleBoardContext): string {
  if (context.activeCombatant === null) return 'None';
  return context.board.combatants.find((combatant) => combatant.id === context.activeCombatant)?.name ?? 'Not visible';
}

function projectedHpBand(combatant: EncounterBoardCombatant): HpBand {
  return hpBandOf(combatant.hitPointBand);
}

function footprintText(combatant: EncounterBoardPlacedCombatant): string {
  return [...combatant.footprint]
    .sort((left, right) => left.row - right.row || left.column - right.column)
    .map(cellText)
    .join(', ');
}

function statusText(combatant: EncounterBoardCombatant): string {
  if (combatant.lastKnown !== undefined) {
    return `Last known at ${cellText(combatant.lastKnown.cell)} in round ${String(combatant.lastKnown.round)}`;
  }
  if (combatant.hiddenFromPlayers === true) return 'Hidden from players';
  return 'Visible';
}

function conditionsText(combatant: EncounterBoardCombatant): string {
  const conditions = [...(combatant.conditions ?? [])].sort(compareText);
  return conditions.length === 0 ? 'None' : conditions.join(', ');
}

function creatureRows(context: AccessibleBoardContext): string {
  return context.board.combatants.map((combatant) => {
    const placed = combatant.placementStatus === 'placed';
    const cell = placed ? cellText(combatant.position) : 'Placement pending';
    const size = placed ? combatant.effectiveSize : 'Unknown';
    const footprint = placed ? footprintText(combatant) : 'None';
    const side = combatant.kind === 'player_character' ? 'Party' : 'Foe';
    const life = combatant.life ?? 'living';
    const markers = [
      ...(combatant.id === context.activeCombatant ? ['Active'] : []),
      ...(combatant.id === context.board.highlightedCombatant ? ['Highlighted'] : []),
      ...(context.board.adjudicatedTargets.includes(combatant.id) ? ['Adjudicated target'] : []),
    ];
    const placement = placed
      ? combatant.placementMode.kind.replaceAll('_', ' ')
      : combatant.pendingReason.replaceAll('_', ' ');
    const cells = [
      String(creatureNumber(context, combatant.id)), combatant.name, side,
      combatant.creatureType ?? 'Not projected', cell, size, footprint, placement,
      projectedHpBand(combatant).replaceAll('_', ' '), life, conditionsText(combatant),
      statusText(combatant), markers.length === 0 ? 'None' : markers.join(', '),
    ];
    return `<tr data-creature-id="${escapeHtml(String(combatant.id))}">${cells.map((value) => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`;
  }).join('');
}

function objectFact(object: EncounterBoardWorldObject): string {
  const blocking = `movement ${object.blocking.movement ? 'blocked' : 'open'}, sight ${object.blocking.lineOfSight ? 'blocked' : 'open'}, cover ${object.blocking.cover.replaceAll('_', ' ')}`;
  const identity = `${object.name} (${String(object.id)}), anchor ${cellText(object.position)}`;
  switch (object.kind) {
    case 'door': return `Door: ${identity}; state ${object.blocking.movement ? 'closed' : 'open'}; ${blocking}`;
    case 'hazard': return `Hazard: ${identity}; ${blocking}`;
    case 'light-source': return `Light source: ${identity}; ${blocking}`;
    case 'barrier':
    case 'cover':
    case 'summoned-terrain':
    case 'generic': return `Object: ${identity}; kind ${object.kind.replaceAll('-', ' ')}; ${blocking}`;
  }
}

function cellFacts(context: AccessibleBoardContext): readonly {
  readonly column: number;
  readonly row: number;
  readonly facts: readonly string[];
}[] {
  const facts = new Map<string, { column: number; row: number; facts: string[] }>();
  const add = (cell: { readonly column: number; readonly row: number }, fact: string): void => {
    const key = cellKey(cell);
    const entry = facts.get(key) ?? { column: cell.column, row: cell.row, facts: [] };
    entry.facts.push(fact);
    facts.set(key, entry);
  };
  for (const cell of context.board.blockedCells ?? []) add(cell, 'Blocked');
  for (const region of context.board.difficultTerrainRegions ?? []) {
    for (const cell of region.cells) add(cell, `Difficult terrain: ${region.id}`);
  }
  for (const region of context.board.environmentLightRegions ?? []) {
    for (const cell of region.cells) add(cell, `Light level: ${region.level}`);
  }
  for (const region of context.board.obscurementRegions ?? []) {
    for (const cell of region.cells) add(cell, `Obscurement: ${region.obscurement.replaceAll('_', ' ')} (${region.id})`);
  }
  for (const cell of context.board.foggedCells ?? []) add(cell, 'Fogged');
  for (const cell of context.board.concealedCells ?? []) add(cell, 'Concealed from this audience');
  for (const object of context.board.worldObjects ?? []) {
    for (const cell of object.cells) add(cell, objectFact(object));
  }
  for (const area of context.board.areas ?? []) {
    const kind = area.kind === 'persistent' ? 'Persistent area' : 'Movement region';
    const entry = area.kind === 'movement_region' ? `; entry ${area.entry}` : '';
    const difficult = area.difficultTerrain ? '; difficult terrain' : '';
    for (const cell of area.cells) add(cell, `${kind}: ${String(area.id)}; shape ${area.shape.kind}; owner ${area.ownerName} (${String(area.owner)})${entry}${difficult}`);
  }
  for (const light of context.board.lightOverlays ?? []) {
    const source = `${light.label} (${String(light.id)}), source ${String(light.source)}, origin ${cellText(light.origin)}`;
    for (const cell of light.brightCells) add(cell, `Light source area: ${source}; bright within ${String(light.brightRadiusFeet)} ft`);
    for (const cell of light.dimCells) add(cell, `Light source area: ${source}; dim for ${String(light.additionalDimFeet)} additional ft`);
  }
  return [...facts.values()]
    .sort((left, right) => left.row - right.row || left.column - right.column)
    .map((entry) => ({ ...entry, facts: [...entry.facts].sort(compareText) }));
}

function factRows(context: AccessibleBoardContext): string {
  return cellFacts(context).map((entry) =>
    `<tr data-cell="${String(entry.column)},${String(entry.row)}"><th scope="row">${cellText(entry)}</th><td><ul>${entry.facts.map((fact) => `<li>${escapeHtml(fact)}</li>`).join('')}</ul></td></tr>`,
  ).join('');
}

function placedCombatants(context: AccessibleBoardContext): readonly EncounterBoardPlacedCombatant[] {
  return context.board.combatants.filter(
    (combatant): combatant is EncounterBoardPlacedCombatant => combatant.placementStatus === 'placed',
  );
}

function distanceFeet(left: EncounterBoardPlacedCombatant, right: EncounterBoardPlacedCombatant): number {
  return minimumSpaceDistance(decodeProjectedCreatureSpace(left), decodeProjectedCreatureSpace(right));
}

function nearbyNames(
  context: AccessibleBoardContext,
  subject: EncounterBoardPlacedCombatant,
  maximumFeet: number,
): readonly string[] {
  return placedCombatants(context)
    .filter((candidate) => candidate.id !== subject.id && distanceFeet(subject, candidate) <= maximumFeet)
    .map((candidate) => `${String(creatureNumber(context, candidate.id))}. ${candidate.name}`);
}

function adjacencyLists(context: AccessibleBoardContext): string {
  return context.board.combatants.map((combatant) => {
    const names = combatant.placementStatus === 'placed' ? nearbyNames(context, combatant, 5) : [];
    const content = names.length === 0
      ? '<li>None</li>'
      : names.map((name) => `<li>${escapeHtml(name)}</li>`).join('');
    return `<section aria-labelledby="adjacency-${String(creatureNumber(context, combatant.id))}"><h3 id="adjacency-${String(creatureNumber(context, combatant.id))}">${escapeHtml(combatant.name)}</h3><ul>${content}</ul></section>`;
  }).join('');
}

function reachLists(context: AccessibleBoardContext): string {
  const rows = context.board.combatants.flatMap((combatant): readonly string[] => {
    if (combatant.placementStatus !== 'placed' || combatant.reachFeet === undefined) return [];
    const names = nearbyNames(context, combatant, combatant.reachFeet);
    return [`<section aria-labelledby="reach-${String(creatureNumber(context, combatant.id))}"><h3 id="reach-${String(creatureNumber(context, combatant.id))}">${escapeHtml(combatant.name)} — ${String(combatant.reachFeet)} ft reach</h3><ul>${names.length === 0 ? '<li>None</li>' : names.map((name) => `<li>${escapeHtml(name)}</li>`).join('')}</ul></section>`];
  });
  return rows.length === 0 ? '<p>No reach or range facts are exposed by this audience projection.</p>' : rows.join('');
}

function sustainedEffects(context: AccessibleBoardContext): string {
  const effects = context.board.sustainedEffects ?? [];
  if (effects.length === 0) return '<p>No sustained-effect target facts are exposed by this audience projection.</p>';
  const rows = effects.map((effect) => {
    const targets = effect.boundTargets.length === 0
      ? 'None; targets are reselected on activation'
      : effect.boundTargets.map((target) => `${target.name} at ${cellText(target.position)}`).join(', ');
    return `<tr><th scope="row">${escapeHtml(effect.ownerName)} (${escapeHtml(String(effect.owner))})</th><td>${escapeHtml(String(effect.effectId))}</td><td>${escapeHtml(effect.spellId)}</td><td>${escapeHtml(effect.badge)}</td><td>${escapeHtml(effect.targetBinding.replaceAll('_', ' '))}</td><td>${escapeHtml(targets)}</td><td>${effect.activationAvailable ? 'Yes' : 'No'}</td></tr>`;
  }).join('');
  return `<table><caption>Sustained effects and their projected targets</caption><thead><tr><th scope="col">Owner</th><th scope="col">Effect ID</th><th scope="col">Spell ID</th><th scope="col">Effect</th><th scope="col">Binding</th><th scope="col">Targets</th><th scope="col">Activation available</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function targetConnections(context: AccessibleBoardContext): string {
  const lines = context.board.targetLines ?? [];
  if (lines.length === 0) return '<p>No target-connection geometry is exposed by this audience projection.</p>';
  const rows = lines.map((line) =>
    `<tr><th scope="row">${escapeHtml(String(line.effectId))}</th><td>(${String(line.from.x)},${String(line.from.y)})</td><td>(${String(line.to.x)},${String(line.to.y)})</td><td>${escapeHtml(String(line.target))}</td></tr>`,
  ).join('');
  return `<table><caption>Projected target connections</caption><thead><tr><th scope="col">Effect ID</th><th scope="col">From point</th><th scope="col">To point</th><th scope="col">Target ID</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function legend(): string {
  return `<dl>${TERM_LEGEND.map(([term, definition]) => `<dt>${escapeHtml(term)}</dt><dd>${escapeHtml(definition)}</dd>`).join('')}</dl>`;
}

function boardArticle(context: AccessibleBoardContext): string {
  const title = `${context.encounterName} screen-reader board`;
  return `<article class="accessible-board" lang="en" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}" data-board-audience="${context.audience}"><header aria-label="Encounter summary"><h1>${escapeHtml(context.encounterName)}</h1><p>Round: ${String(context.round)}</p><p>Active creature: ${escapeHtml(activeCreatureName(context))}</p><p>Audience: ${context.audience === 'dm' ? 'Dungeon Master' : 'Player'}</p><p>Board dimensions: ${String(context.board.bounds.columns)} columns by ${String(context.board.bounds.rows)} rows</p></header><section aria-labelledby="creatures-heading"><h2 id="creatures-heading">Creatures</h2><table><caption>Creature positions and states</caption><thead><tr><th scope="col">Number</th><th scope="col">Name</th><th scope="col">Side</th><th scope="col">Creature type</th><th scope="col">Cell</th><th scope="col">Size</th><th scope="col">Footprint cells</th><th scope="col">Placement</th><th scope="col">HP band</th><th scope="col">Life</th><th scope="col">Conditions</th><th scope="col">Hidden or last-known status</th><th scope="col">Markers</th></tr></thead><tbody>${creatureRows(context)}</tbody></table></section><section aria-labelledby="cells-heading"><h2 id="cells-heading">Cells carrying facts</h2><table><caption>Only cells with projected board facts</caption><thead><tr><th scope="col">Cell</th><th scope="col">Facts</th></tr></thead><tbody>${factRows(context)}</tbody></table></section><section aria-labelledby="adjacency-heading"><h2 id="adjacency-heading">Creatures within 5 feet</h2>${adjacencyLists(context)}</section><section aria-labelledby="reach-heading"><h2 id="reach-heading">Reach and range</h2>${reachLists(context)}</section><section aria-labelledby="effects-heading"><h2 id="effects-heading">Sustained effects</h2>${sustainedEffects(context)}</section><section aria-labelledby="connections-heading"><h2 id="connections-heading">Target connections</h2>${targetConnections(context)}</section><aside aria-labelledby="legend-heading"><h2 id="legend-heading">Legend of terms</h2>${legend()}</aside><footer aria-label="Coordinate convention"><h2>Coordinate convention</h2><p>${ACCESSIBLE_BOARD_COORDINATE_CONVENTION}</p></footer></article>`;
}

export function serializeAccessibleBoard(context: AccessibleBoardContext): string {
  const title = `${context.encounterName} screen-reader board`;
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head><body><main aria-label="Screen-reader encounter board">${boardArticle(context)}</main></body></html>\n`;
}

export function renderAccessibleBoard(context: AccessibleBoardContext): HTMLElement {
  const parsed = new DOMParser().parseFromString(serializeAccessibleBoard(context), 'text/html');
  const article = parsed.querySelector<HTMLElement>('article.accessible-board');
  if (article === null) throw new Error('Accessible board serializer did not produce its article landmark.');
  const imported = document.importNode(article, true);
  imported.dataset.renderKey = stableRenderKey(context.audience, 'screen-reader-board');
  return imported;
}

function isAccessibleBoardViewMode(value: string | null): value is AccessibleBoardViewMode {
  return value !== null && ACCESSIBLE_BOARD_VIEW_MODES.some((mode) => mode === value);
}

function viewModeStorageKey(audience: AccessibleBoardAudience): string {
  return `srd55:vtt:board-view:${audience}`;
}

export function readAccessibleBoardViewMode(
  storage: Pick<Storage, 'getItem'>,
  audience: AccessibleBoardAudience,
): AccessibleBoardViewMode {
  const stored = storage.getItem(viewModeStorageKey(audience));
  return isAccessibleBoardViewMode(stored) ? stored : 'graphic';
}

export function writeAccessibleBoardViewMode(
  storage: Pick<Storage, 'setItem'>,
  audience: AccessibleBoardAudience,
  mode: AccessibleBoardViewMode,
): void {
  storage.setItem(viewModeStorageKey(audience), mode);
}
