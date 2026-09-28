/**
 * THE TWELVE SRD 5.2.1 CLASSES, in the order every class extract prints them.
 *
 * One list for the readers that parse the class extracts and for the runtime
 * that reads their artifacts. It is vocabulary, not a parse: it imports no SRD
 * text and no generated artifact, so a reader may import it without reaching
 * the runtime (see `scripts/srd-artifacts.ts`). Each reader still checks that
 * its extract prints exactly these names.
 */
import {
  recordedContentKeys,
  type RecordedContentKey,
} from '../domain/recorded-content-keys';

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

/** A bundled class's content key as the build records it: one of twelve literals. */
export type BundledClassContentKeyText = `2024:class:${Lowercase<SrdClassName>}`;

/**
 * Each class's key, checked PER CLASS by the compiler: the mapped type admits
 * only the lower-cased name of the class it is keyed by.
 */
const BUNDLED_CLASS_CONTENT_KEY_TEXT = {
  Barbarian: '2024:class:barbarian',
  Bard: '2024:class:bard',
  Cleric: '2024:class:cleric',
  Druid: '2024:class:druid',
  Fighter: '2024:class:fighter',
  Monk: '2024:class:monk',
  Paladin: '2024:class:paladin',
  Ranger: '2024:class:ranger',
  Rogue: '2024:class:rogue',
  Sorcerer: '2024:class:sorcerer',
  Warlock: '2024:class:warlock',
  Wizard: '2024:class:wizard',
} as const satisfies {
  readonly [Name in SrdClassName]: `2024:class:${Lowercase<Name>}`;
};

/** The recorded key of one bundled class. */
export function bundledClassContentKeyText(
  className: SrdClassName,
): BundledClassContentKeyText {
  return BUNDLED_CLASS_CONTENT_KEY_TEXT[className];
}

const CLASS_KEYS = recordedContentKeys(
  'class',
  SRD_CLASS_NAMES.map(bundledClassContentKeyText),
);

/** A bundled class's content key, earned as a `ContentKey` by membership. */
export type BundledClassContentKey = RecordedContentKey<BundledClassContentKeyText>;

/** The twelve bundled class content keys, in source order. */
export const BUNDLED_CLASS_CONTENT_KEYS: readonly BundledClassContentKey[] =
  CLASS_KEYS.keys;

/** Whether `value` is one of the twelve bundled class content keys. */
export function isBundledClassContentKey(
  value: string,
): value is BundledClassContentKey {
  return CLASS_KEYS.has(value);
}

/**
 * The runtime's constructor for a class content key held as text: it must be
 * one of the twelve bundled keys.
 */
export function bundledClassContentKey(value: string): BundledClassContentKey {
  return CLASS_KEYS.key(value);
}
