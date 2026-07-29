import type { CharacterCommandPayload } from '../domain/command-contracts';
import type { CharacterRow } from '../domain/models';
import {
  GUIDED_RPC,
  type GuidedBuildStateParams,
  type GuidedBuildStateResult,
  type GuidedClassOption,
  type GuidedCreateParams,
  type GuidedOriginOption,
  type GuidedOriginOptionsParams,
  type GuidedOriginParams,
  type OriginKind,
} from '../builder/contracts';
import type { GuidedApplyOriginResult } from '../builder/guided-creation';
import {
  createCatalogClient,
  type CatalogClient,
} from '../catalog/client';
import type {
  CharacterSummary,
  EligibleSpell,
  Workspace,
} from '../domain/read-models';
import type { RpcClient } from '../rpc/client';
import type {
  BuildReportResult,
} from '../reports/build-report-builder';
import type {
  PrintableSpellList,
  PrintableVariant,
} from '../reports/printable-spell-list-builder';
import type { CatalogSnapshot } from './catalog-queries';
import type {
  CompletenessCount,
  CompletenessResult,
} from './character-completeness';
import type {
  CreateCharacterInput,
  DeleteCharacterResult,
} from './character-crud';
import type { OperationHistory } from './operation-history';
import type { CharacterSheet } from './character-sheet-builder';

export interface QueriesClient extends CatalogClient {
  listCharacters(): Promise<CharacterSummary[]>;
  getCharacter(characterId: number): Promise<CharacterRow>;
  createCharacter(name: string): Promise<CharacterRow>;
  deleteCharacter(characterId: number): Promise<DeleteCharacterResult>;
  workspace(characterId: number): Promise<Workspace>;
  completeness(characterId: number): Promise<CompletenessResult>;
  outstandingCounts(): Promise<CompletenessCount[]>;
  catalog(): Promise<CatalogSnapshot>;
  eligibleSpells(
    characterId: number,
    slotId: number,
    query?: string,
  ): Promise<EligibleSpell[]>;
  createSavePoint(
    characterId: number,
    label: string,
  ): Promise<Workspace>;
  savePointRestoreCommand(
    characterId: number,
    savePointId: number,
  ): Promise<CharacterCommandPayload>;
  buildReport(characterId: number): Promise<BuildReportResult>;
  sheet(characterId: number): Promise<CharacterSheet>;
  printable(
    characterId: number,
    variant?: PrintableVariant,
  ): Promise<PrintableSpellList>;
  operationHistory(characterId: number): Promise<OperationHistory>;
  buildState(characterId: number): Promise<GuidedBuildStateResult>;
  guidedClassOptions(): Promise<readonly GuidedClassOption[]>;
  createGuided(
    name: string,
    classContentKey: string,
  ): Promise<CharacterRow>;
  originOptions(kind: OriginKind): Promise<readonly GuidedOriginOption[]>;
  applyOrigin(
    characterId: number,
    kind: OriginKind,
    contentKey: string,
  ): Promise<GuidedApplyOriginResult>;
}

export function createQueriesClient(rpc: RpcClient): QueriesClient {
  const characterParams = (characterId: number) => ({
    character_id: characterId,
  });

  return Object.freeze({
    ...createCatalogClient(rpc),
    listCharacters: () =>
      rpc.call<Record<string, never>, CharacterSummary[]>(
        'queries.characters.list',
        {},
      ),
    getCharacter: (characterId: number) =>
      rpc.call<{ character_id: number }, CharacterRow>(
        'queries.characters.get',
        characterParams(characterId),
      ),
    createCharacter: (name: string) =>
      rpc.call<CreateCharacterInput, CharacterRow>(
        'queries.characters.create',
        { name },
      ),
    deleteCharacter: (characterId: number) =>
      rpc.call<{ character_id: number }, DeleteCharacterResult>(
        'queries.characters.delete',
        characterParams(characterId),
      ),
    workspace: (characterId: number) =>
      rpc.call<{ character_id: number }, Workspace>(
        'queries.characters.workspace',
        characterParams(characterId),
      ),
    completeness: (characterId: number) =>
      rpc.call<{ character_id: number }, CompletenessResult>(
        'queries.characters.completeness',
        characterParams(characterId),
      ),
    outstandingCounts: () =>
      rpc.call<Record<string, never>, CompletenessCount[]>(
        'queries.characters.outstanding',
        {},
      ),
    catalog: () =>
      rpc.call<Record<string, never>, CatalogSnapshot>(
        'queries.catalog.read',
        {},
      ),
    eligibleSpells: (
      characterId: number,
      slotId: number,
      query = '',
    ) =>
      rpc.call<
        { character_id: number; slot_id: number; query: string },
        EligibleSpell[]
      >('queries.eligibleSpells.search', {
        character_id: characterId,
        slot_id: slotId,
        query,
      }),
    createSavePoint: (characterId: number, label: string) =>
      rpc.call<
        { character_id: number; label: string },
        Workspace
      >('queries.savePoints.create', {
        character_id: characterId,
        label,
      }),
    savePointRestoreCommand: (
      characterId: number,
      savePointId: number,
    ) =>
      rpc.call<
        { character_id: number; save_point_id: number },
        CharacterCommandPayload
      >('queries.savePoints.restoreCommand', {
        character_id: characterId,
        save_point_id: savePointId,
      }),
    buildReport: (characterId: number) =>
      rpc.call<{ character_id: number }, BuildReportResult>(
        'queries.reports.build',
        characterParams(characterId),
      ),
    sheet: (characterId: number) =>
      rpc.call<{ character_id: number }, CharacterSheet>(
        'queries.characters.sheet',
        characterParams(characterId),
      ),
    printable: (
      characterId: number,
      variant: PrintableVariant = 'reference',
    ) =>
      rpc.call<
        { character_id: number; variant: PrintableVariant },
        PrintableSpellList
      >('queries.reports.printable', {
        character_id: characterId,
        variant,
      }),
    operationHistory: (characterId: number) =>
      rpc.call<{ character_id: number }, OperationHistory>(
        'queries.history.read',
        characterParams(characterId),
      ),
    buildState: (characterId: number) =>
      rpc.call<GuidedBuildStateParams, GuidedBuildStateResult>(
        GUIDED_RPC.buildState,
        characterParams(characterId),
      ),
    guidedClassOptions: () =>
      rpc.call<Record<string, never>, readonly GuidedClassOption[]>(
        GUIDED_RPC.classOptions,
        {},
      ),
    createGuided: (name: string, classContentKey: string) =>
      rpc.call<GuidedCreateParams, CharacterRow>(GUIDED_RPC.create, {
        name,
        class_content_key: classContentKey,
      }),
    originOptions: (kind: OriginKind) =>
      rpc.call<GuidedOriginOptionsParams, readonly GuidedOriginOption[]>(
        GUIDED_RPC.originOptions,
        { kind },
      ),
    applyOrigin: (
      characterId: number,
      kind: OriginKind,
      contentKey: string,
    ) =>
      rpc.call<GuidedOriginParams, GuidedApplyOriginResult>(
        GUIDED_RPC.applyOrigin,
        {
          character_id: characterId,
          kind,
          content_key: contentKey,
        },
      ),
  });
}
