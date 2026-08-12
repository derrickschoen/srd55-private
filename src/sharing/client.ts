import type { RpcClient } from '../rpc/client';
import type {
  ShareImportCommitResult,
  ShareExportOptions,
  ShareImportResult,
  SharePreview,
} from './character-share';
import type {
  ContentImportChoices,
  ContentImportDisclosure,
  ContentImportPlanToken,
} from '../catalog/content-adoption';
import { externalContentDisclosure } from '../catalog/content-adoption';
import {
  encodeShareFragment,
  tryEncodeShareFragment,
  tryEncodeReferenceOnlyShareFragment,
  type ShareEncodeResult,
} from './codec';
import type { CharacterShareDocument } from './schema';
import type { ContentKind } from '../catalog/content-identity';

export interface OmittedShareContent {
  readonly kind: ContentKind;
  readonly contentKey: string;
  readonly name: string;
}

export type ShareFragmentResult =
  | Exclude<ShareEncodeResult, { readonly kind: 'encoded' }>
  | {
      readonly kind: 'encoded';
      readonly fragment: string;
      readonly embeddedContent: readonly ContentImportDisclosure[];
      readonly omittedContent?: readonly OmittedShareContent[];
    };

export interface ShareClient {
  exportDebug(
    characterId: number,
    options?: ShareExportOptions,
  ): Promise<CharacterShareDocument>;
  createFragment(
    characterId: number,
    options?: ShareExportOptions,
  ): Promise<string>;
  createFragmentResult(
    characterId: number,
    options?: ShareExportOptions,
  ): Promise<ShareFragmentResult>;
  preview(
    fragment: string,
    choices?: ContentImportChoices,
  ): Promise<SharePreview>;
  importCharacter(fragment: string): Promise<ShareImportResult>;
  commitCharacter(
    fragment: string,
    token: ContentImportPlanToken,
    choices: ContentImportChoices,
  ): Promise<ShareImportCommitResult>;
}

export function createShareClient(rpc: RpcClient): ShareClient {
  const exportDebug = (
    characterId: number,
    options: ShareExportOptions = {},
  ) =>
    rpc.call<
      {
        characterId: number;
        acknowledgements: boolean;
        loadouts: boolean;
        writtenText: boolean;
      },
      CharacterShareDocument
    >('share.exportCharacter', {
      characterId,
      acknowledgements: options.acknowledgements === true,
      loadouts: options.loadouts === true,
      writtenText: options.writtenText === true,
    });
  return Object.freeze({
    exportDebug,
    createFragment: async (
      characterId: number,
      options: ShareExportOptions = {},
    ) => encodeShareFragment(await exportDebug(characterId, options)),
    createFragmentResult: async (
      characterId: number,
      options: ShareExportOptions = {},
    ) => {
      const document = await exportDebug(characterId, options);
      if (document.portableContent === undefined) {
        const encoded = await tryEncodeReferenceOnlyShareFragment(document);
        return encoded.kind === 'encoded'
          ? Object.freeze({ ...encoded, embeddedContent: Object.freeze([]) })
          : encoded;
      }
      const embedded = await tryEncodeShareFragment(document);
      if (embedded.kind === 'encoded') {
        return Object.freeze({
          ...embedded,
          embeddedContent: embeddedPortableDisclosures(document),
        });
      }
      const referenceOnlyDocument = withCarriedSourceNames(document);
      const fallback = await tryEncodeReferenceOnlyShareFragment(
        referenceOnlyDocument,
      );
      if (fallback.kind === 'too_large') return fallback;
      return Object.freeze({
        ...fallback,
        embeddedContent: Object.freeze([]),
        omittedContent: omittedPortableReferences(document),
      });
    },
    preview: (fragment: string, choices = Object.freeze({})) =>
      rpc.call<
        { fragment: string; choices: ContentImportChoices },
        SharePreview
      >('share.preview', { fragment, choices }),
    importCharacter: (fragment: string) =>
      rpc.call<{ fragment: string }, ShareImportResult>(
        'share.importCharacter',
        { fragment },
      ),
    commitCharacter: (
      fragment: string,
      token: ContentImportPlanToken,
      choices: ContentImportChoices,
    ) => rpc.call<
      {
        fragment: string;
        token: ContentImportPlanToken;
        choices: ContentImportChoices;
      },
      ShareImportCommitResult
    >('share.importCharacter', { fragment, token, choices }),
  });
}

function embeddedPortableDisclosures(
  document: CharacterShareDocument,
): readonly ContentImportDisclosure[] {
  return Object.freeze((document.portableContent?.content ?? []).map((entry) =>
    externalContentDisclosure({
      id: `portable:${entry.kind}:${entry.content_key}`,
      kind: entry.kind,
      name: entry.aggregate.name,
      ...(entry.provenance === undefined
        ? {}
        : { provenance: entry.provenance }),
    })
  ));
}

function omittedPortableReferences(
  document: CharacterShareDocument,
): readonly OmittedShareContent[] {
  const carried = new Map((document.portableContent?.content ?? []).map(
    (entry) => [
      `${entry.kind}\u0000${entry.content_key}`,
      String(entry.aggregate.name),
    ],
  ));
  const references: Omit<OmittedShareContent, 'name'>[] = [];
  for (const item of document.classes) {
    references.push({ kind: 'class', contentKey: item.classKey });
    if (item.subclassKey !== undefined) {
      references.push({ kind: 'subclass', contentKey: item.subclassKey });
    }
  }
  for (const item of document.sources) {
    if (item.generated !== true && item.key !== undefined) {
      references.push({ kind: item.type, contentKey: item.key });
    }
  }
  const spellKeys = [
    ...document.selections.map((item) => item.spellKey),
    ...document.spellbook.flatMap((item) =>
      item.spellKey === undefined ? [] : [item.spellKey]
    ),
    ...document.preferences.map((item) => item.spellKey),
    ...(document.loadouts ?? []).flatMap((loadout) =>
      loadout.entries.map((item) => item.spellKey)
    ),
  ];
  references.push(...spellKeys.map((contentKey) => ({
    kind: 'spell' as const,
    contentKey,
  })));
  const seen = new Set<string>();
  return Object.freeze(references.flatMap((reference) => {
    const marker = `${reference.kind}\u0000${reference.contentKey}`;
    const name = carried.get(marker);
    if (name === undefined || seen.has(marker)) return [];
    seen.add(marker);
    return [{ ...reference, name }];
  }));
}

/**
 * A v17 fallback cannot carry the aggregate, but its frozen source tuple does
 * have an optional display-name slot. Preserve an authored name there so both
 * ends can speak about the missing content without promoting its internal key
 * to the player-facing label.
 */
function withCarriedSourceNames(
  document: CharacterShareDocument,
): CharacterShareDocument {
  const carriedNames = new Map((document.portableContent?.content ?? []).map(
    (entry) => [
      `${entry.kind}\u0000${entry.content_key}`,
      String(entry.aggregate.name),
    ],
  ));
  return {
    ...document,
    sources: document.sources.map((source) => {
      if (source.generated === true || source.key === undefined) return source;
      const name = carriedNames.get(`${source.type}\u0000${source.key}`);
      return name === undefined || source.name !== undefined
        ? source
        : { ...source, name };
    }),
  };
}
