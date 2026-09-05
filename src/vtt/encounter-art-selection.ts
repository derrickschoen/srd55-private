import type { AssetId } from '../assets/ids';
import { tokenAssetFor } from '../assets/token-archetypes';
import type { EncounterBoardProjectionShape } from './encounter-board';
import type { EncounterArtPackage } from './encounter-package';
import { REFERENCE_ENCOUNTER_ART } from './reference-encounter-art';
import { VANE_WARREN_ART } from './vane-warren-art';

/**
 * Combatants the package does not name get an archetype bust chosen from the
 * profile's creature type (D516): a typed resolution, never a display-name match.
 */
function withCombatantFallbacks(
  base: EncounterArtPackage,
  projection: EncounterBoardProjectionShape,
): EncounterArtPackage {
  const combatantTokens: Record<string, AssetId> = { ...base.combatantTokens };
  for (const combatant of projection.combatants) {
    combatantTokens[combatant.id] = combatantTokens[combatant.id] ?? tokenAssetFor({
      kind: combatant.kind,
      ...(combatant.creatureType === undefined ? {} : { creatureType: combatant.creatureType }),
    });
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
    combatantTokens: {},
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
