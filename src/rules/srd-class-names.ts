/**
 * THE TWELVE SRD 5.2.1 CLASSES, in the order every class extract prints them.
 *
 * One list for the readers that parse the class extracts and for the runtime
 * that reads their artifacts. It is vocabulary, not a parse: it imports no SRD
 * text and no generated artifact, so a reader may import it without reaching
 * the runtime (see `scripts/srd-artifacts.ts`). Each reader still checks that
 * its extract prints exactly these names.
 */
export const SRD_CLASS_NAMES = [
  'Barbarian',
  'Bard',
  'Cleric',
  'Druid',
  'Fighter',
  'Monk',
  'Paladin',
  'Ranger',
  'Rogue',
  'Sorcerer',
  'Warlock',
  'Wizard',
] as const;

export type SrdClassName = (typeof SRD_CLASS_NAMES)[number];

export function isSrdClassName(value: string): value is SrdClassName {
  return (SRD_CLASS_NAMES as readonly string[]).includes(value);
}
