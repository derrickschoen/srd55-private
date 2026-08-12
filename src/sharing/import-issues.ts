/**
 * Compatibility diagnostics for share import.
 *
 * A share document that passes `validateShareDocument` is well formed. It can
 * still fail to import because the recipient's catalog does not contain the
 * content it references, or contains a conflicting version of it. That is a
 * COMPATIBILITY failure, not a validation failure, and it is reported
 * separately so the UI can tell the user which of the two happened.
 *
 * Import stays atomic: a document with any issue creates nothing at all.
 * Repairing these automatically is deliberately out of scope for now — see
 * `docs/sharing/SCHEMA.md`.
 */
import { BUNDLED_HOMEBREW_CATALOG } from '../authoring/bundled-homebrew-catalog';
import { assertedExternalContentKey } from '../catalog/catalog-key';

export type ShareImportIssueCode =
  | 'missing_class'
  | 'missing_subclass'
  | 'missing_source'
  | 'ambiguous_content_reference'
  | 'unprojectable_content_reference'
  | 'subclass_class_mismatch'
  | 'source_not_repeatable'
  | 'selection_slot_missing'
  | 'selection_slot_ambiguous';

export interface ShareImportIssue {
  readonly code: ShareImportIssueCode;
  /** Catalog content keys this issue is about, in document order. */
  readonly contentKeys: readonly string[];
  /** One sentence naming what is wrong. Shown to the user verbatim. */
  readonly summary: string;
  /**
   * What the user can actually do about it. Must describe a real action —
   * never promise an in-app operation that does not exist.
   */
  readonly remedy: string;
  readonly remedyKind?: 'bundled-homebrew' | 'library-json';
  readonly contentName?: string;
  readonly ruleKey?: string;
  readonly ordinal?: number;
}

/**
 * Thrown when a well-formed share document cannot be applied to this catalog.
 *
 * Carries every independently-detected issue rather than only the first, so a
 * user fixing a multi-problem link does not have to discover them one import
 * at a time.
 *
 * Subclasses `TypeError` rather than `ShareValidationError`: the document is
 * not invalid, so callers that specifically catch validation failures must not
 * swallow this.
 */
export class ShareImportCompatibilityError extends TypeError {
  readonly issues: readonly ShareImportIssue[];

  constructor(issues: readonly ShareImportIssue[]) {
    super(
      issues.length === 1
        ? `Cannot import this character: ${issues[0]?.summary ?? ''}`
        : `Cannot import this character: ${issues.length} problems found.`,
    );
    this.name = 'ShareImportCompatibilityError';
    this.issues = issues;
  }

  /** JSON-safe projection for the RPC boundary. */
  toData(): { readonly issues: readonly ShareImportIssue[] } {
    return { issues: this.issues };
  }
}

const SOURCE_LABEL: Readonly<Record<string, string>> = {
  feat: 'feat',
  species: 'species',
  background: 'background',
};

/** One shared label for sender warnings and recipient import remedies. */
export function contentImportLabel(type: string, key: string): string {
  const label = type === 'class' || type === 'subclass' || type === 'spell'
    ? type
    : SOURCE_LABEL[type] ?? type;
  return `${label} '${key}'`;
}

export function missingClassIssue(classKey: string): ShareImportIssue {
  return missingPortableIssue('class', classKey);
}

function knownBundledHomebrewName(
  type: string,
  key: string,
): string | null {
  for (const entry of BUNDLED_HOMEBREW_CATALOG) {
    for (const [index, revision] of entry.revisions.entries()) {
      if (revision.kind !== type || revision.rules_edition === null) continue;
      const name = index === 0
        ? revision.name
        : `${revision.name} (Bundled revision ${String(index + 1)})`;
      if (
        assertedExternalContentKey(
          revision.kind,
          revision.rules_edition,
          name,
        ) === key
      ) {
        return name;
      }
    }
  }
  return null;
}

function missingPortableIssue(type: string, key: string): ShareImportIssue {
  const code = type === 'class'
    ? 'missing_class' as const
    : type === 'subclass'
      ? 'missing_subclass' as const
      : 'missing_source' as const;
  const knownName = knownBundledHomebrewName(type, key);
  const label = SOURCE_LABEL[type] ?? type;
  if (knownName !== null) {
    return {
      code,
      contentKeys: [key],
      contentName: knownName,
      summary: `This character uses ${knownName}, which is not in your library.`,
      remedy: 'Import bundled homebrew, then retry this share.',
      remedyKind: 'bundled-homebrew',
    };
  }
  return {
    code,
    contentKeys: [key],
    summary: `This character uses a ${label} that is not in your library.`,
    remedy: `Ask the sender for a library JSON containing this ${label}, import it, then retry this share.`,
    remedyKind: 'library-json',
  };
}

export function missingSubclassIssue(subclassKey: string): ShareImportIssue {
  return missingPortableIssue('subclass', subclassKey);
}

export function missingSourceIssue(
  type: string,
  key: string,
): ShareImportIssue {
  return missingPortableIssue(type, key);
}

export function ambiguousReferenceIssue(
  type: string,
  key: string,
  candidates: readonly string[],
): ShareImportIssue {
  const label = SOURCE_LABEL[type] ?? type;
  return {
    code: 'ambiguous_content_reference',
    contentKeys: [key, ...candidates],
    summary: `${label} reference '${key}' matches more than one local catalog entry.`,
    remedy:
      'Remove the ambiguous catalog alias or fingerprint registration, then open the link again.',
  };
}

export function unprojectableReferenceIssue(
  type: string,
  key: string,
): ShareImportIssue {
  const label = SOURCE_LABEL[type] ?? type;
  return {
    code: 'unprojectable_content_reference',
    contentKeys: [key],
    summary: `${label} reference '${key}' matched local content that cannot be reviewed safely.`,
    remedy:
      'Reload or repair the matching catalog content, then open the link again.',
  };
}

export function subclassMismatchIssue(
  subclassKey: string,
  classKey: string,
): ShareImportIssue {
  return {
    code: 'subclass_class_mismatch',
    contentKeys: [subclassKey, classKey],
    summary: `subclass '${subclassKey}' belongs to a different class than '${classKey}' in your catalog.`,
    remedy:
      'The sender and you have different versions of this content. Compare catalogs with whoever shared the link.',
  };
}

export function notRepeatableIssue(
  type: string,
  key: string,
  name: string,
): ShareImportIssue {
  const label = SOURCE_LABEL[type] ?? type;
  return {
    code: 'source_not_repeatable',
    contentKeys: [key],
    summary: `the link uses the ${label} '${name}' more than once, but your catalog marks it as not repeatable.`,
    remedy:
      'The sender may have a version that allows repeats. Compare catalogs with whoever shared the link.',
  };
}

export function selectionSlotIssue(
  ruleKey: string,
  ordinal: number,
  found: number,
): ShareImportIssue {
  return found === 0
    ? {
        code: 'selection_slot_missing',
        contentKeys: [],
        ruleKey,
        ordinal,
        summary: `a chosen spell no longer has a slot to occupy ('${ruleKey}' #${ordinal}).`,
        remedy:
          'Your catalog grants different choices than the sender’s for this source. Compare catalogs with whoever shared the link.',
      }
    : {
        code: 'selection_slot_ambiguous',
        contentKeys: [],
        ruleKey,
        ordinal,
        summary: `a chosen spell matches ${found} possible slots ('${ruleKey}' #${ordinal}), so it cannot be placed unambiguously.`,
        remedy:
          'Your catalog grants different choices than the sender’s for this source. Compare catalogs with whoever shared the link.',
      };
}
