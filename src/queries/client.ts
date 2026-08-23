import type { CharacterRow } from '../domain/models';
import {
  EQUIPMENT_RPC,
  GUIDED_RPC,
  REQUIRED_FIGHTER_CHOICES_RPC,
  type GuidedAbilityDraft,
  type GuidedAllocateAbilitiesParams,
  type GuidedAllocateAbilitiesResult,
  isGuidedAllocateAbilitiesResult,
  type GuidedApplyEquipmentParams,
  type GuidedBuildStateParams,
  type GuidedBuildStateResult,
  type GuidedChooseSpeciesLineageParams,
  type GuidedChooseSpeciesLineageResult,
  isGuidedChooseSpeciesLineageResult,
  type GuidedClassOption,
  type GuidedCreateParams,
  type GuidedEquipmentStepState,
  type GuidedRequiredFighterChoicesState,
  type GuidedFillSkillGrantParams,
  type GuidedFillSkillGrantResult,
  isGuidedFillSkillGrantResult,
  type GuidedExpertiseStepState,
  type GuidedFillExpertiseGrantParams,
  type GuidedSpellsStepState,
  type GuidedAssignSpellParams,
  type GuidedEligibleSpellsParams,
  type GuidedEligibleSpellsResult,
  type GuidedOriginOption,
  type GuidedOriginOptionsParams,
  type GuidedOriginParams,
  type GuidedSaveAbilityDraftParams,
  type GuidedSkillsStepState,
  type GuidedSpeciesChoiceStateResult,
  type OriginKind,
} from '../builder/contracts';
import {
  BACKGROUND_RPC,
  type GuidedApplyBackgroundParams,
  type GuidedBackgroundChoiceOptions,
} from '../builder/background-choices';
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
import type {
  PrintAppendixKind,
  PrintAppendixPreferences,
} from './print-appendix-preferences';
import {
  LEVEL_UP_RPC,
  type LevelUpPlannedEligibleSpellsParams,
  type LevelUpPlannedEligibleSpellsResult,
  type LevelUpPreviewParams,
  type LevelUpPreviewResult,
  isLevelUpPreviewResult,
  type LevelUpWizardProgress,
  type SaveLevelUpWizardProgressParams,
  type LevelUpStateParams,
  type LevelUpStateResult,
} from '../builder/level-up-wizard';
import { decodeOutcome } from '../refusals/decode';
import type { DecodedOutcome } from '../refusals/outcome';
import type { StoredCharacterPartyPackExport } from '../vtt/stored-character-party-member';

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
  levelUpPlannedEligibleSpells(
    params: LevelUpPlannedEligibleSpellsParams,
  ): Promise<LevelUpPlannedEligibleSpellsResult>;
  levelUpState(characterId: number): Promise<LevelUpStateResult>;
  levelUpProgress(characterId: number): Promise<LevelUpWizardProgress | null>;
  saveLevelUpProgress(
    params: SaveLevelUpWizardProgressParams,
  ): Promise<LevelUpWizardProgress | null>;
  previewLevelUp(
    params: LevelUpPreviewParams,
  ): Promise<DecodedOutcome<LevelUpPreviewResult>>;
  createSavePoint(
    characterId: number,
    label: string,
  ): Promise<Workspace>;
  buildReport(characterId: number): Promise<BuildReportResult>;
  sheet(characterId: number): Promise<CharacterSheet>;
  partyPackMember(characterId: number): Promise<StoredCharacterPartyPackExport>;
  setPrintAppendixPreference(
    characterId: number,
    kind: PrintAppendixKind,
    enabled: boolean,
  ): Promise<PrintAppendixPreferences>;
  operationHistory(characterId: number): Promise<OperationHistory>;
  buildState(characterId: number): Promise<GuidedBuildStateResult>;
  speciesChoiceState(
    characterId: number,
  ): Promise<GuidedSpeciesChoiceStateResult>;
  chooseSpeciesLineage(
    params: GuidedChooseSpeciesLineageParams,
  ): Promise<DecodedOutcome<GuidedChooseSpeciesLineageResult>>;
  abilityDraft(characterId: number): Promise<GuidedAbilityDraft | null>;
  saveAbilityDraft(
    params: GuidedSaveAbilityDraftParams,
  ): Promise<GuidedAbilityDraft>;
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
  allocateAbilities(
    params: GuidedAllocateAbilitiesParams,
  ): Promise<DecodedOutcome<GuidedAllocateAbilitiesResult>>;
  backgroundChoiceOptions(): Promise<GuidedBackgroundChoiceOptions>;
  applyBackground(
    params: GuidedApplyBackgroundParams,
  ): Promise<GuidedApplyOriginResult>;
  skillsStep(characterId: number): Promise<GuidedSkillsStepState>;
  fillSkillGrant(
    params: GuidedFillSkillGrantParams,
  ): Promise<DecodedOutcome<GuidedFillSkillGrantResult>>;
  expertiseStep(characterId: number): Promise<GuidedExpertiseStepState>;
  fillExpertiseGrant(
    params: GuidedFillExpertiseGrantParams,
  ): Promise<GuidedFillSkillGrantResult>;
  spellsStep(characterId: number): Promise<GuidedSpellsStepState>;
  guidedEligibleSpells(
    params: GuidedEligibleSpellsParams,
  ): Promise<GuidedEligibleSpellsResult>;
  assignGuidedSpell(
    params: GuidedAssignSpellParams,
  ): Promise<GuidedFillSkillGrantResult>;
  equipmentStep(characterId: number): Promise<GuidedEquipmentStepState>;
  applyEquipment(
    params: GuidedApplyEquipmentParams,
  ): Promise<GuidedApplyOriginResult>;
  requiredFighterChoices(
    characterId: number,
  ): Promise<GuidedRequiredFighterChoicesState>;
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
    levelUpPlannedEligibleSpells: (
      params: LevelUpPlannedEligibleSpellsParams,
    ) =>
      rpc.call<
        LevelUpPlannedEligibleSpellsParams,
        LevelUpPlannedEligibleSpellsResult
      >(LEVEL_UP_RPC.plannedEligibleSpells, params),
    levelUpState: (characterId: number) =>
      rpc.call<LevelUpStateParams, LevelUpStateResult>(
        LEVEL_UP_RPC.state,
        characterParams(characterId) as LevelUpStateParams,
      ),
    levelUpProgress: (characterId: number) =>
      rpc.call<LevelUpStateParams, LevelUpWizardProgress | null>(
        LEVEL_UP_RPC.progress,
        characterParams(characterId) as LevelUpStateParams,
      ),
    saveLevelUpProgress: (params: SaveLevelUpWizardProgressParams) =>
      rpc.call<
        SaveLevelUpWizardProgressParams,
        LevelUpWizardProgress | null
      >(LEVEL_UP_RPC.saveProgress, params),
    previewLevelUp: (params: LevelUpPreviewParams) =>
      rpc.call<LevelUpPreviewParams, unknown>(
        LEVEL_UP_RPC.preview,
        params,
      ).then((value) => decodeOutcome(value, isLevelUpPreviewResult)),
    createSavePoint: (characterId: number, label: string) =>
      rpc.call<
        { character_id: number; label: string },
        Workspace
      >('queries.savePoints.create', {
        character_id: characterId,
        label,
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
    partyPackMember: (characterId: number) =>
      rpc.call<{ character_id: number }, StoredCharacterPartyPackExport>(
        'queries.characters.partyPackMember',
        characterParams(characterId),
      ),
    setPrintAppendixPreference: (
      characterId: number,
      kind: PrintAppendixKind,
      enabled: boolean,
    ) =>
      rpc.call<
        {
          character_id: number;
          kind: PrintAppendixKind;
          enabled: boolean;
        },
        PrintAppendixPreferences
      >('queries.characters.setPrintAppendixPreference', {
        character_id: characterId,
        kind,
        enabled,
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
    speciesChoiceState: (characterId: number) =>
      rpc.call<GuidedBuildStateParams, GuidedSpeciesChoiceStateResult>(
        GUIDED_RPC.speciesChoiceState,
        characterParams(characterId),
      ),
    chooseSpeciesLineage: (params: GuidedChooseSpeciesLineageParams) =>
      rpc.call<
        GuidedChooseSpeciesLineageParams,
        unknown
      >(GUIDED_RPC.chooseSpeciesLineage, params).then((value) =>
        decodeOutcome(value, isGuidedChooseSpeciesLineageResult)
      ),
    abilityDraft: (characterId: number) =>
      rpc.call<GuidedBuildStateParams, GuidedAbilityDraft | null>(
        GUIDED_RPC.abilityDraft,
        characterParams(characterId),
      ),
    saveAbilityDraft: (params: GuidedSaveAbilityDraftParams) =>
      rpc.call<GuidedSaveAbilityDraftParams, GuidedAbilityDraft>(
        GUIDED_RPC.saveAbilityDraft,
        params,
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
    allocateAbilities: (params: GuidedAllocateAbilitiesParams) =>
      rpc.call<GuidedAllocateAbilitiesParams, unknown>(
        GUIDED_RPC.allocateAbilities,
        params,
      ).then((value) => decodeOutcome(value, isGuidedAllocateAbilitiesResult)),
    backgroundChoiceOptions: () =>
      rpc.call<Record<string, never>, GuidedBackgroundChoiceOptions>(
        BACKGROUND_RPC.choiceOptions,
        {},
      ),
    applyBackground: (params: GuidedApplyBackgroundParams) =>
      rpc.call<GuidedApplyBackgroundParams, GuidedApplyOriginResult>(
        BACKGROUND_RPC.applyBackground,
        params,
      ),
    skillsStep: (characterId: number) =>
      rpc.call<GuidedBuildStateParams, GuidedSkillsStepState>(
        GUIDED_RPC.skillsStep,
        characterParams(characterId),
      ),
    fillSkillGrant: (params: GuidedFillSkillGrantParams) =>
      rpc.call<GuidedFillSkillGrantParams, unknown>(
        GUIDED_RPC.fillSkillGrant,
        params,
      ).then((value) => decodeOutcome(value, isGuidedFillSkillGrantResult)),
    expertiseStep: (characterId: number) =>
      rpc.call<GuidedBuildStateParams, GuidedExpertiseStepState>(
        GUIDED_RPC.expertiseStep,
        characterParams(characterId),
      ),
    fillExpertiseGrant: (params: GuidedFillExpertiseGrantParams) =>
      rpc.call<GuidedFillExpertiseGrantParams, GuidedFillSkillGrantResult>(
        GUIDED_RPC.fillExpertiseGrant,
        params,
      ),
    spellsStep: (characterId: number) =>
      rpc.call<GuidedBuildStateParams, GuidedSpellsStepState>(
        GUIDED_RPC.spellsStep,
        characterParams(characterId),
      ),
    guidedEligibleSpells: (params: GuidedEligibleSpellsParams) =>
      rpc.call<GuidedEligibleSpellsParams, GuidedEligibleSpellsResult>(
        GUIDED_RPC.guidedEligibleSpells,
        params,
      ),
    assignGuidedSpell: (params: GuidedAssignSpellParams) =>
      rpc.call<GuidedAssignSpellParams, GuidedFillSkillGrantResult>(
        GUIDED_RPC.assignSpell,
        params,
      ),
    equipmentStep: (characterId: number) =>
      rpc.call<GuidedBuildStateParams, GuidedEquipmentStepState>(
        EQUIPMENT_RPC.equipmentStep,
        characterParams(characterId),
      ),
    applyEquipment: (params: GuidedApplyEquipmentParams) =>
      rpc.call<GuidedApplyEquipmentParams, GuidedApplyOriginResult>(
        EQUIPMENT_RPC.applyEquipment,
        params,
      ),
    requiredFighterChoices: (characterId: number) =>
      rpc.call<GuidedBuildStateParams, GuidedRequiredFighterChoicesState>(
        REQUIRED_FIGHTER_CHOICES_RPC.state,
        characterParams(characterId),
      ),
  });
}
