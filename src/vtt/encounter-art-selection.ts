import type { AssetId } from '../assets/ids';
import type { EncounterBoardProjectionShape } from './encounter-board';
import type { EncounterArtPackage } from './encounter-package';
import { REFERENCE_ENCOUNTER_ART } from './reference-encounter-art';
import { VANE_WARREN_ART } from './vane-warren-art';

function withCombatantFallbacks(
  base: EncounterArtPackage,
  projection: EncounterBoardProjectionShape,
): EncounterArtPackage {
  const player = base.combatantTokens['combatant:fighter'];
  const monster = base.combatantTokens['combatant:training-brute'];
  if (player === undefined || monster === undefined) {
    throw new Error(`Encounter art package ${base.id} has incomplete fallback token art.`);
  }
  const combatantTokens: Record<string, AssetId> = { ...base.combatantTokens };
  for (const combatant of projection.combatants) {
    combatantTokens[combatant.id] = combatantTokens[combatant.id] ??
      (combatant.kind === 'player_character' ? player : monster);
  }
  return { ...base, combatantTokens };
}

function boundsMatch(
  projection: EncounterBoardProjectionShape,
  art: EncounterArtPackage,
): boolean {
  return projection.bounds.columns === art.room.columns &&
    projection.bounds.rows === art.room.rows;
}

function genericArt(
  projection: EncounterBoardProjectionShape,
): EncounterArtPackage {
  const base = REFERENCE_ENCOUNTER_ART;
  return withCombatantFallbacks({
    ...base,
    id: `encounter-art:generated-${String(projection.bounds.columns)}x${String(projection.bounds.rows)}:v1`,
    room: {
      ...base.room,
      columns: projection.bounds.columns,
      rows: projection.bounds.rows,
      doorCell: {
        column: Math.floor(projection.bounds.columns / 2),
        row: projection.bounds.rows - 1,
      },
    },
    terrain: [],
  }, projection);
}

/** Select authored art only for its authored encounter; generated rooms get bounds-matched neutral art. */
export function encounterArtForBoard(
  projection: EncounterBoardProjectionShape,
): EncounterArtPackage {
  const isReference = boundsMatch(projection, REFERENCE_ENCOUNTER_ART) &&
    projection.combatants.every((combatant) =>
      REFERENCE_ENCOUNTER_ART.combatantTokens[combatant.id] !== undefined);
  if (isReference) return REFERENCE_ENCOUNTER_ART;

  const isVaneWarren = boundsMatch(projection, VANE_WARREN_ART) &&
    projection.combatants.some((combatant) =>
      String(combatant.id).startsWith('combatant:vane-warren:'));
  if (isVaneWarren) return withCombatantFallbacks(VANE_WARREN_ART, projection);

  return genericArt(projection);
}
