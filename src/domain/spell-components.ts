import { coinDenominationOf, copperValue } from './coin';
import { isEnumValue, materialCostKinds, type MaterialCostKind } from './enums';

/**
 * A SPELL'S MATERIAL COMPONENT: A COST IN COPPER PIECES PLUS TEXT.
 *
 * The owner's ruling verbatim: *"Spell components are a cost in copper pieces
 * plus text."* Two things about that ruling are worth stating before the code,
 * because both were raised against it and both are answered here rather than
 * silently:
 *
 * **THE RULING DESCRIBES ONE HALF OF THE PRINTED FIELD, AND THE OTHER HALF IS
 * NOT LOST.** Every components value in this repository is a V/S/M list —
 * `V`, `V, S`, `S, M (a rag and a little rosin)`, and from the bundled extract
 * `V, S, M (mistletoe)` (`docs/srd/source/weapon-attack-cantrips.txt:37`) and
 * `S, M (a weapon with which you have proficiency and that is worth 1+ CP)`
 * (`:16-17`). MOST CARRY NO COST AT ALL. If this replaced the field, the V/S/M
 * flags would be the part that got lost. It does not replace it:
 * `spell_versions.components` still holds the author's line VERBATIM and is
 * still what the printable card renders. This ADDS a typed cost and a typed
 * material clause beside it. Nothing is dropped and nothing is rejected — the
 * D12/Q4 passthrough is the column that was already there.
 *
 * **V/S/M IS NOT MODELLED, AND THAT IS D26 RATHER THAN AN OVERSIGHT.** A value
 * earns structure only if it changes a number on the sheet. The copper cost
 * qualifies on the owner's own reasoning — a component you cannot afford
 * changes whether you can cast. Whether the spell needs a gesture does not move
 * a number, so it stays in the printed line where the player reads it. This is
 * flagged rather than assumed: if the owner wants three booleans, they are
 * cheap and this is the place.
 *
 * **`consumed` IS NOT MODELLED EITHER.** The SRD's other standard form is
 * *"which the spell consumes"*, and it is a third fact the ruling does not
 * mention. It changes no number on the sheet, it survives verbatim in the
 * printed line, and inventing a column for it would be modelling the economy
 * the owner ruled out.
 */
export interface MaterialCost {
  /**
   * The price in COPPER PIECES. Absent rather than zero when nothing is
   * printed: `null` at the column, and this whole object absent in the type.
   */
  readonly copper: number;
  readonly kind: MaterialCostKind;
}

export interface SpellComponents {
  readonly cost: MaterialCost | null;
  /**
   * What is inside `M (…)`, verbatim and without the parentheses, or `null`
   * when the line names no material at all. This is the "plus text" half.
   */
  readonly material: string | null;
}

/** The three columns `spell_versions` stores a {@link SpellComponents} in. */
export interface SpellComponentColumns {
  readonly material_cost_copper: number | null;
  readonly material_cost_kind: MaterialCostKind | null;
  readonly material_component_summary: string | null;
}

export const ABSENT_SPELL_COMPONENTS: SpellComponentColumns = {
  material_cost_copper: null,
  material_cost_kind: null,
  material_component_summary: null,
};

/** `M (…)`, with the outermost parentheses balanced by taking the last `)`. */
const MATERIAL_CLAUSE = /(?:^|[,;]\s*)M\s*\((?<material>.*)\)\s*$/iu;
/**
 * `worth 300+ GP`, `worth 1+ CP`, `worth 25 GP`.
 *
 * `\+?` IS THE WHOLE REASON {@link MaterialCostKind} EXISTS. The bundled True
 * Strike component is `worth 1+ CP` — a FLOOR. An integer column alone stores
 * `1` and drops the `+`, and printing "1 cp" then states as a fact something
 * the source does not say.
 */
const WORTH =
  /\bworth\s+(?<amount>\d[\d,]*)\s*(?<plus>\+?)\s*(?<coin>cp|sp|ep|gp|pp)\b/iu;

/**
 * READ A PRINTED COMPONENTS LINE.
 *
 * CONSERVATIVE, AND THE TWO HALVES FAIL INDEPENDENTLY. A line with an `M (…)`
 * clause and no price yields a material and no cost; a line with neither yields
 * `{ cost: null, material: null }`, which stores three NULLs. Nothing is
 * guessed and nothing is rejected, because the verbatim line is still stored in
 * `spell_versions.components` and is still what prints.
 *
 * SAME STANDING AS `parseSpellRange` WITH RESPECT TO F13, and the same note
 * applies: the Tier 1 document format carries no structured cost field, so
 * there is no explicit author declaration for this to override. When one is
 * added it must WIN and this becomes the fallback.
 *
 * THE COST IS SOUGHT INSIDE THE MATERIAL CLAUSE ONLY. `worth` appearing in a
 * verbal component's description is not a material price, and reading the whole
 * line would let a homebrew flavour sentence mint one.
 */
export function parseSpellComponents(raw: string | null): SpellComponents {
  if (raw === null) {
    return { cost: null, material: null };
  }
  const material = MATERIAL_CLAUSE.exec(raw.trim())?.groups?.material?.trim();
  if (material === undefined || material === '') {
    return { cost: null, material: null };
  }
  return { cost: parseMaterialCost(material), material };
}

function parseMaterialCost(material: string): MaterialCost | null {
  const groups = WORTH.exec(material)?.groups;
  if (groups?.amount === undefined || groups.coin === undefined) {
    return null;
  }
  const denomination = coinDenominationOf(groups.coin);
  if (denomination === null) {
    return null;
  }
  const copper = copperValue(
    Number(groups.amount.replaceAll(',', '')),
    denomination,
  );
  if (copper === null) {
    return null;
  }
  return { copper, kind: groups.plus === '+' ? 'minimum' : 'exact' };
}

/** A {@link SpellComponents} as the three columns. */
export function encodeSpellComponents(
  components: SpellComponents,
): SpellComponentColumns {
  return {
    material_cost_copper: components.cost?.copper ?? null,
    material_cost_kind: components.cost?.kind ?? null,
    material_component_summary: components.material,
  };
}

/**
 * The three columns back into a {@link SpellComponents}.
 *
 * TOLERANT, for the reason `decodeSpellRange` is: these can come off an image
 * whose CHECK constraints were never applied. A copper amount with no kind, or
 * a kind this build does not know, reads as NO COST rather than half a cost.
 */
export function decodeSpellComponents(
  columns: SpellComponentColumns,
): SpellComponents {
  const { material_cost_copper: copper, material_cost_kind: kind } = columns;
  const cost =
    copper !== null &&
    Number.isSafeInteger(copper) &&
    copper >= 0 &&
    kind !== null &&
    isEnumValue(materialCostKinds, kind)
      ? ({ copper, kind } as const)
      : null;
  return { cost, material: columns.material_component_summary };
}
