import type { RpcClient } from '../rpc/client';
import type {
  ShareImportCommitResult,
  ShareExportOptions,
  ShareImportResult,
  SharePreview,
} from './character-share';
import type {
  ContentImportChoices,
  ContentImportPlanToken,
} from '../catalog/content-adoption';
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
}

export type ShareFragmentResult =
  | ShareEncodeResult
  | {
      readonly kind: 'encoded';
      readonly fragment: string;
      readonly omittedContent: readonly OmittedShareContent[];
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
        return tryEncodeReferenceOnlyShareFragment(document);
      }
      const embedded = await tryEncodeShareFragment(document);
      if (embedded.kind === 'encoded') return embedded;
      const fallback = await tryEncodeReferenceOnlyShareFragment(document);
      if (fallback.kind === 'too_large') return fallback;
      return Object.freeze({
        ...fallback,
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

function omittedPortableReferences(
  document: CharacterShareDocument,
): readonly OmittedShareContent[] {
  const carried = new Set((document.portableContent?.content ?? []).map(
    (entry) => `${entry.kind}\u0000${entry.content_key}`,
  ));
  const references: OmittedShareContent[] = [];
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
  return Object.freeze(references.filter((reference) => {
    const marker = `${reference.kind}\u0000${reference.contentKey}`;
    if (!carried.has(marker) || seen.has(marker)) return false;
    seen.add(marker);
    return true;
  }));
}
