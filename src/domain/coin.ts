/**
 * COIN, IN COPPER PIECES.
 *
 * The owner ruled that a spell's material component is *"a cost in copper
 * pieces plus text"*, and copper is therefore the unit two different parsers
 * have to reach — the spell-component reader in `./spell-components.ts` and the
 * background-equipment reader in `../rules/origins-srd.ts`, whose packages all
 * end in coin. One conversion, declared once.
 *
 * THE EXCHANGE RATES ARE NOT SOURCED FROM A BUNDLED EXTRACT, AND SAYING SO IS
 * THE POINT. `docs/srd/source/` holds fourteen extracts and NONE of them is the
 * Coinage table: the weapons table prints prices in `CP`, `SP` and `GP`
 * (`docs/srd/source/weapons-table.txt`) and the backgrounds print `GP`
 * (`docs/srd/source/backgrounds.txt`), but neither states what a gold piece is
 * worth in copper. These five rates are therefore the standard 5e values
 * carried as a DECLARED CONSTANT, in the same posture `dieSizes` takes towards
 * the owner's die list — recorded as unsourced rather than dressed up with a
 * citation it does not have. If a rate is wrong, one edit here corrects every
 * derived value, and the `coin, in copper pieces` suite in
 * `tests/unit/domain/spell-components.test.ts` pins all five by name and rate,
 * so the edit cannot be silent. THE FILE NAME IS PART OF THE CLAIM: this
 * paragraph's whole argument is that unsourced constants are safe BECAUSE a
 * named test guards them, and it previously cited a `tests/unit/domain/
 * coin.test.ts` that does not exist — a reader who checked would have concluded
 * nothing guards them at all.
 *
 * `ep` AND `pp` OCCUR NOWHERE IN THIS REPOSITORY. They are here because this is
 * a DENOMINATION vocabulary rather than a census of the strings we hold, and
 * because the failure modes are not symmetric: a member we never write costs
 * nothing, while a MISSING member makes its parse fail and silently store no
 * cost at all.
 */
export const coinDenominations = ['cp', 'sp', 'ep', 'gp', 'pp'] as const;
export type CoinDenomination = (typeof coinDenominations)[number];

const COPPER_PER: Readonly<Record<CoinDenomination, number>> = {
  cp: 1,
  sp: 10,
  ep: 50,
  gp: 100,
  pp: 1000,
};

/** How many copper pieces one coin of this denomination is worth. */
export function copperPerCoin(denomination: CoinDenomination): number {
  return COPPER_PER[denomination];
}

/**
 * `amount` coins of `denomination`, in copper pieces.
 *
 * REFUSES A NON-INTEGER OR NEGATIVE AMOUNT rather than rounding one. Every
 * caller is a parser reading printed text, and a printed amount this cannot
 * represent must fall out as "no cost recorded" — which the callers spell as
 * `null` — instead of arriving downstream as a plausible number nobody printed.
 */
export function copperValue(
  amount: number,
  denomination: CoinDenomination,
): number | null {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    return null;
  }
  const copper = amount * copperPerCoin(denomination);
  return Number.isSafeInteger(copper) ? copper : null;
}

/**
 * The printed suffix (`CP`, `GP`, …) as a denomination, or `null`.
 *
 * Case-insensitive because the sources are not consistent: the weapons table
 * prints `5 CP` and a homebrew document may well write `5 cp`.
 */
export function coinDenominationOf(token: string): CoinDenomination | null {
  const lowered = token.toLowerCase();
  return (coinDenominations as readonly string[]).includes(lowered)
    ? (lowered as CoinDenomination)
    : null;
}
