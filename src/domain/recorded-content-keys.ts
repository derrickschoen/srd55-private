import type { ContentKey } from './ids';

/**
 * A CONTENT KEY THE BUILD RECORDED: its literal text AND the `ContentKey`
 * brand. `Text` is a closed literal union: for a generated SRD artifact, the
 * union the generator emits beside it (`BundledSrdSpellContentKeyText`, …),
 * so a key the SRD text does not print is not a value of the type.
 */
export type RecordedContentKey<Text extends string> = Text & ContentKey;

export class RecordedContentKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecordedContentKeyError';
  }
}

/** The closed set of one kind's recorded keys, and its only brand constructor. */
export interface RecordedContentKeys<Text extends string> {
  /** Every recorded key, branded, in the order the build recorded them. */
  readonly keys: readonly RecordedContentKey<Text>[];
  /** Whether `value` is one of the recorded keys. */
  has(value: string): value is RecordedContentKey<Text>;
  /** Mints a recorded key; refuses any text the build did not record. */
  key(value: string): RecordedContentKey<Text>;
}

/**
 * THE ONE PLACE A BUNDLED KEY EARNS THE `ContentKey` BRAND: by membership in
 * the keys the build recorded. There is no cast: `has` is a type predicate
 * over that set, so the brand is exactly as good as the membership check.
 */
export function recordedContentKeys<const Text extends string>(
  kind: string,
  recorded: readonly Text[],
): RecordedContentKeys<Text> {
  const members: ReadonlySet<string> = new Set<string>(recorded);
  if (members.size !== recorded.length) {
    throw new RecordedContentKeyError(`the bundled ${kind} content keys repeat a key.`);
  }
  const has = (value: string): value is RecordedContentKey<Text> =>
    members.has(value);
  const key = (value: string): RecordedContentKey<Text> => {
    if (!has(value)) {
      throw new RecordedContentKeyError(`${value} is not a bundled ${kind} content key.`);
    }
    return value;
  };
  return Object.freeze({
    keys: Object.freeze(recorded.map(key)),
    has,
    key,
  });
}
