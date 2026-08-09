/**
 * Reads the immutable template key recorded when guided content was copied to
 * a character. Invalid or legacy config has no asserted provenance.
 */
export function recordedSourceContentKey(config: string | null): string | null {
  if (config === null || config === '') return null;
  try {
    const decoded: unknown = JSON.parse(config);
    if (
      decoded === null ||
      typeof decoded !== 'object' ||
      Array.isArray(decoded) ||
      !Object.hasOwn(decoded, 'source_content_key')
    ) {
      return null;
    }
    const contentKey = Reflect.get(decoded, 'source_content_key');
    return typeof contentKey === 'string' && contentKey !== ''
      ? contentKey
      : null;
  } catch {
    return null;
  }
}
