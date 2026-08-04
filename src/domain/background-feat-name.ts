/**
 * Background templates store the SRD's printed feat label. Magic Initiate
 * carries its suggested list in parentheses, while the feat definition keeps
 * the base name. Both runtime suggestion and content projection must resolve
 * that stored label through this one seam.
 */
export function backgroundFeatBaseName(printedName: string): string {
  const parenthetical = /^(?<base>.*?)\s*\([^)]+\)$/u.exec(printedName)?.groups;
  return parenthetical?.base ?? printedName;
}
