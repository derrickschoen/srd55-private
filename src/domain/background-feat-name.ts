/**
 * Background templates store the SRD's printed feat label. Magic Initiate
 * carries its suggested list in parentheses, while the feat definition keeps
 * the base name. Both runtime suggestion and content projection must resolve
 * that stored label through this one seam.
 */
export interface ParsedBackgroundFeatName {
  readonly base: string;
  readonly option: string | null;
}

export function backgroundFeatBaseName(
  printedName: string,
): ParsedBackgroundFeatName {
  const trimmedName = printedName.trim();
  const parenthetical = /^(?<base>.*?)\s*\((?<option>[^)]+)\)$/u.exec(
    trimmedName,
  )?.groups;
  return Object.freeze({
    base: parenthetical?.base ?? trimmedName,
    option: parenthetical?.option ?? null,
  });
}
