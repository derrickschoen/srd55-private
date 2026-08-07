import {
  LEVEL_UP_ATTR,
  LEVEL_UP_STEP_ORDER,
  levelUpWarningPresentation,
  type LevelUpPlannedChoiceProjection,
  type LevelUpPlannedEligibleSpellsParams,
  type LevelUpPlannedExpertiseProjection,
  type LevelUpFeatCandidate,
  type LevelUpGuideableClassOption,
  type LevelUpPlannedSkillProjection,
  type LevelUpPlannedSpellProjection,
  type LevelUpWarningPresentation,
  type LevelUpPreviewCommand,
  type LevelUpPreviewResult,
  type LevelUpStateResult,
  type LevelUpStep,
} from '../../../builder/level-up-wizard';
import type { LevelUpPlannedSubchoices } from '../../../domain/command-contracts';
import type { Skill } from '../../../domain/enums';
import type { CharacterRevision } from '../../../domain/ids';
import type { EligibleSpell } from '../../../domain/read-models';
import type { CharacterCommandRpcResult } from '../../../commands/character-command-executor';
import type { CharacterSheet } from '../../../queries/character-sheet-builder';
import { element, type Cleanup } from '../../dom';
import {
  createClassStep,
  createPendingEpicPathChoice,
  createSubclassStep,
  renderGainsStep,
  type PendingEpicPath,
  type SubclassDraft,
} from './class-gains-steps';
import {
  createLevelUpFrame,
  renderLevelUpTerminalState,
  renderUnimplementedLevelUpStep,
  type LevelUpFrame,
} from './level-up-shell';
import {
  createFeatStep,
  renderDeferredEpicWarning,
  type FeatStepDraft,
} from './feat-steps';
import {
  createPlannedExpertiseStep,
  createPlannedSkillsStep,
  createPlannedSpellsStep,
  EMPTY_PLANNED_SUBCHOICE_DRAFT,
  mergePlannedChoiceProjections,
  plannedGrantLocatorKey,
  type PlannedSpellDraft,
  type PlannedSubchoiceDraft,
  type SpellPickerFactory,
} from './planned-choice-steps';
import {
  appendSubmittingStatus,
  clearSubmittingStatus,
  renderComplete,
  renderReview,
  renderReviewFailure,
  renderReviewLoading,
  type LevelUpDraftReview,
} from './review-complete';

export interface LevelUpWizardController {
  readonly element: HTMLElement;
  readonly cleanup: Cleanup;
  focusInitial(): void;
  plannedSubchoices(): LevelUpPlannedSubchoices;
}

export interface LevelUpWizardServices {
  readonly preview?: (
    expectedRevision: CharacterRevision,
    command: LevelUpPreviewCommand,
  ) => Promise<LevelUpPreviewResult>;
  readonly submit?: (
    expectedRevision: CharacterRevision,
    command: LevelUpPreviewCommand,
    operationUuid: string,
  ) => Promise<CharacterCommandRpcResult>;
  readonly loadSheet?: () => Promise<CharacterSheet>;
  readonly reloadState?: () => void | Promise<void>;
  readonly randomUuid?: () => string;
}

interface PreviewCache {
  readonly draftFingerprint: string;
  readonly result: LevelUpPreviewResult;
  readonly draft: LevelUpDraftReview;
}

interface Completion {
  readonly preview: LevelUpPreviewResult;
  readonly sheet: CharacterSheet;
  readonly draft: LevelUpDraftReview;
}

function errorRecord(error: unknown): Readonly<Record<string, unknown>> | null {
  return typeof error === 'object' && error !== null
    ? error as Readonly<Record<string, unknown>>
    : null;
}

function errorData(error: unknown): Readonly<Record<string, unknown>> | null {
  const data = errorRecord(error)?.['data'];
  return typeof data === 'object' && data !== null
    ? data as Readonly<Record<string, unknown>>
    : null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isAmbiguousTransportError(error: unknown): boolean {
  return errorRecord(error)?.['code'] === 'transport_error';
}

function titleCaseIdentifier(value: string): string {
  return value
    .split('_')
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function plannedSubchoiceRefusalMessage(error: unknown): string | null {
  const data = errorData(error);
  if (data?.['reason'] !== 'planned_subchoice_refused') return null;
  const locator = errorRecord(data['locator']);
  const source = errorRecord(locator?.['source']);
  const sourceKind = source?.['kind'];
  const sourceText = sourceKind === 'existing_source'
    ? `existing_source(${String(source?.['source_instance_id'])})`
    : String(sourceKind);
  return (
    'Planned subchoice refused — ' +
    `subchoice_kind: ${String(data['subchoice_kind'])}; ` +
    `index: ${String(data['index'])}; ` +
    `issue: ${String(data['issue'])}; ` +
    'locator: ' +
    `source=${sourceText}, ` +
    `rule_key=${String(locator?.['rule_key'])}, ` +
    `ordinal=${String(locator?.['ordinal'])}.`
  );
}

function selectedFeatName(
  draft: FeatStepDraft,
  candidates: readonly LevelUpFeatCandidate[],
): string | null {
  if (draft?.kind !== 'selected') return null;
  const key = draft.application.selection.feat_content_key;
  return candidates.find(
    (candidate) => candidate.definition.content_key === key,
  )?.definition.name ?? String(key);
}

function orderedSteps(steps: readonly LevelUpStep[]): readonly LevelUpStep[] {
  const returned = new Set(steps);
  return LEVEL_UP_STEP_ORDER.filter((step) => returned.has(step));
}

function guideableOptions(
  state: Extract<LevelUpStateResult, { readonly kind: 'ready' }>,
): readonly LevelUpGuideableClassOption[] {
  return state.class_options.filter(
    (option): option is LevelUpGuideableClassOption =>
      option.guideability === 'guideable',
  );
}

type TerminalEpicState = Extract<
  LevelUpStateResult,
  { readonly kind: 'no_guideable_class' | 'maximum_level' }
> & { readonly pending_epic_resolution: NonNullable<
  Extract<
    LevelUpStateResult,
    { readonly kind: 'no_guideable_class' | 'maximum_level' }
  >['pending_epic_resolution']
> };

function isTerminalEpicState(
  state: LevelUpStateResult,
): state is TerminalEpicState {
  return (
    (state.kind === 'no_guideable_class' ||
      state.kind === 'maximum_level') &&
    state.pending_epic_resolution !== null
  );
}

function createTerminalEpicResolutionWizard(options: {
  readonly state: TerminalEpicState;
  readonly cancel: () => void;
} & LevelUpWizardServices): LevelUpWizardController {
  const host = element('div', { className: 'level-up-route' });
  let currentCleanup: Cleanup = () => undefined;
  let initialFocusTarget: HTMLElement | null = null;
  let draft: FeatStepDraft = null;
  let error: string | null = null;
  let activeFrame: LevelUpFrame | null = null;
  let preview: LevelUpPreviewResult | null = null;
  let previewGeneration = 0;
  let previewRequested = false;
  let operationUuid: string | null = null;
  let stale = false;
  let submitting = false;
  let completion: Completion | null = null;

  const draftReview = (): LevelUpDraftReview => {
    const feat = selectedFeatName(
      draft,
      options.state.pending_epic_resolution.candidates,
    );
    return {
      subclass: null,
      feats: feat === null ? [] : [feat],
      skills: [],
      expertise: [],
      spells: [],
      new_class_features: { kind: 'sourced', feature_names: [] },
    };
  };

  const command = (): LevelUpPreviewCommand | null =>
    draft?.kind === 'selected'
      ? {
          type: 'resolve_level_feat_choice',
          character_level_feat_choice_id:
            options.state.pending_epic_resolution.deferred_choice
              .character_level_feat_choice_id,
          feat_choice: draft.application.selection,
        }
      : null;

  const reloadLevelUpState = (): void => {
    void options.reloadState?.();
  };

  const showPrompt = (focusPanel: boolean): void => {
    currentCleanup();
    const choice = createPendingEpicPathChoice({
      pending: options.state.pending_epic_resolution,
      selectedPath: 'resolve_now',
      allowNextLevel: false,
      onSelect: () => undefined,
    });
    const continueButton = element('button', {
      text: 'Continue to Epic Boon',
      attributes: { type: 'button', [LEVEL_UP_ATTR.next]: '' },
    });
    const continueCleanup = (() => {
      const listener = (): void => showEpicStep();
      continueButton.addEventListener('click', listener);
      return () => continueButton.removeEventListener('click', listener);
    })();
    const surface = element('section', { className: 'level-up-terminal-resolution' }, [
      choice.element,
      element(
        'nav',
        { attributes: { 'aria-label': 'Deferred Epic Boon navigation' } },
        [continueButton],
      ),
    ]);
    const view = renderLevelUpTerminalState(options.state, [surface]);
    host.replaceChildren(view);
    initialFocusTarget = view.querySelector('h1');
    currentCleanup = () => {
      choice.cleanup();
      continueCleanup();
    };
    if (focusPanel) view.querySelector('h2')?.focus();
  };

  const showStep = (step: 'epic_boon' | 'review' | 'complete'): void => {
    currentCleanup();
    const featView = step === 'epic_boon'
      ? createFeatStep({
          step: 'epic_boon',
          candidates: options.state.pending_epic_resolution.candidates,
          draft,
          allowDefer: false,
          deferredWarning: options.state.pending_epic_resolution.warning,
          onSelect: (selection) => {
            draft = selection;
            previewGeneration += 1;
            preview = null;
            previewRequested = false;
            operationUuid = null;
            stale = false;
            completion = null;
            error = null;
            showStep('epic_boon');
            host.querySelector<HTMLInputElement>('[checked]')?.focus();
          },
        })
      : null;
    const selectedCommand = command();
    let panelCleanup: Cleanup = () => undefined;
    let panel: HTMLElement;
    if (featView !== null) {
      panel = featView.element;
    } else if (step === 'complete' && completion !== null) {
      panel = renderComplete({
        preview: completion.preview,
        draft: completion.draft,
        sheet: completion.sheet,
        resolution: true,
        retainedWarnings: options.state.character.warnings,
      });
    } else if (preview !== null) {
      const review = renderReview({
        preview,
        draft: draftReview(),
        retainedWarnings: options.state.character.warnings,
        stale,
        reloadState: reloadLevelUpState,
      });
      panel = review.element;
      panelCleanup = review.cleanup;
    } else if (step === 'review' && error !== null && previewRequested) {
      const failure = renderReviewFailure({
        stale,
        reloadState: reloadLevelUpState,
        retryPreview: () => {
          previewRequested = false;
          error = null;
          showStep('review');
        },
      });
      panel = failure.element;
      panelCleanup = failure.cleanup;
    } else {
      panel = renderReviewLoading();
      if (
        step === 'review' &&
        selectedCommand !== null &&
        options.preview !== undefined &&
        !previewRequested
      ) {
        previewRequested = true;
        const generation = ++previewGeneration;
        void options.preview(
          options.state.character.revision,
          selectedCommand,
        ).then((result) => {
          if (generation !== previewGeneration) return;
          preview = result;
          error = null;
          showStep('review');
        }).catch((previewError: unknown) => {
          if (generation !== previewGeneration) return;
          stale = typeof errorData(previewError)?.['current_revision'] === 'number';
          error = stale
            ? 'This character changed elsewhere. Reload level-up state before confirming.'
            : plannedSubchoiceRefusalMessage(previewError) ??
              `The Epic Boon preview could not be prepared: ${errorMessage(previewError)}`;
          showStep('review');
          activeFrame?.alert?.focus();
        });
      }
    }
    const confirmResolution = (): void => {
      if (
        submitting ||
        stale ||
        preview === null ||
        selectedCommand === null ||
        options.submit === undefined ||
        options.loadSheet === undefined
      ) {
        return;
      }
      appendSubmittingStatus(host);
      submitting = true;
      operationUuid ??= options.randomUuid?.() ?? crypto.randomUUID();
      const confirmedOperationUuid = operationUuid;
      const confirmedPreview = preview;
      const confirmedDraft = draftReview();
      void options.submit(
        options.state.character.revision,
        selectedCommand,
        confirmedOperationUuid,
      ).then(async () => {
        const sheet = await options.loadSheet?.();
        if (sheet === undefined) {
          throw new Error('Fresh character sheet data was unavailable.');
        }
        completion = {
          preview: confirmedPreview,
          sheet,
          draft: confirmedDraft,
        };
        submitting = false;
        clearSubmittingStatus(host);
        error = null;
        showStep('complete');
      }).catch((submitError: unknown) => {
        submitting = false;
        clearSubmittingStatus(host);
        stale = typeof errorData(submitError)?.['current_revision'] === 'number';
        if (stale) {
          error =
            'This character changed elsewhere. Your Epic Boon draft was kept; reload level-up state before confirming it.';
        } else if (isAmbiguousTransportError(submitError)) {
          error =
            'The result of the submission is unknown. Retry submission to check the same operation safely.';
        } else {
          operationUuid = null;
          error = plannedSubchoiceRefusalMessage(submitError) ??
            `The Epic Boon was not applied: ${errorMessage(submitError)}`;
        }
        showStep('review');
        activeFrame?.alert?.focus();
      });
    };
    const frame = createLevelUpFrame({
      characterName: options.state.character.name,
      steps: orderedSteps(
        options.state.pending_epic_resolution.applicable_steps,
      ),
      currentStep: step,
      panel,
      navigation: {
        ...(step === 'complete'
          ? {}
          : {
              back: () => {
                error = null;
                if (step === 'review') {
                  previewRequested = false;
                  stale = false;
                }
                if (step === 'epic_boon') showPrompt(true);
                else showStep('epic_boon');
              },
              cancel: options.cancel,
            }),
        ...(step === 'epic_boon'
          ? {
              next: () => {
                if (
                  draft?.kind !== 'selected' ||
                  draft.application.plan.eligibility.status !== 'qualified'
                ) {
                  error = 'Choose an Epic Boon to resolve the deferred choice.';
                  showStep('epic_boon');
                  activeFrame?.alert?.focus();
                  return;
                }
                error = null;
                showStep('review');
                activeFrame?.stepHeading.focus();
              },
            }
          : step === 'review' && preview !== null && !stale
            ? {
                next: confirmResolution,
                nextLabel: operationUuid === null
                  ? 'Confirm Epic Boon'
                  : 'Retry submission',
                nextKind: 'confirm' as const,
              }
            : {}),
      },
      applicableStepStatus: null,
      error,
    });
    host.replaceChildren(frame.element);
    activeFrame = frame;
    initialFocusTarget = frame.routeHeading;
    currentCleanup = () => {
      featView?.cleanup();
      panelCleanup();
      frame.cleanup();
    };
    frame.stepHeading.focus();
  };

  const showEpicStep = (): void => showStep('epic_boon');

  showPrompt(false);
  return {
    element: host,
    cleanup: () => currentCleanup(),
    focusInitial: () => initialFocusTarget?.focus(),
    plannedSubchoices: () => ({ skills: [], expertise: [], spells: [] }),
  };
}

/**
 * The W-D controller. Every mutable draft value below is page-memory only.
 * Planned spell search is injected as a read; no command, storage, worker, or
 * database writer crosses this UI boundary.
 */
export function createLevelUpWizard(options: {
  readonly state: LevelUpStateResult;
  readonly cancel: () => void;
  readonly searchPlannedSpells?: (
    params: LevelUpPlannedEligibleSpellsParams,
  ) => Promise<readonly EligibleSpell[]>;
  readonly spellPickerFactory?: SpellPickerFactory;
} & LevelUpWizardServices): LevelUpWizardController {
  if (isTerminalEpicState(options.state)) {
    return createTerminalEpicResolutionWizard({
      state: options.state,
      cancel: options.cancel,
      ...(options.preview === undefined ? {} : { preview: options.preview }),
      ...(options.submit === undefined ? {} : { submit: options.submit }),
      ...(options.loadSheet === undefined ? {} : { loadSheet: options.loadSheet }),
      ...(options.reloadState === undefined ? {} : { reloadState: options.reloadState }),
      ...(options.randomUuid === undefined ? {} : { randomUuid: options.randomUuid }),
    });
  }
  if (options.state.kind !== 'ready') {
    const view = renderLevelUpTerminalState(options.state);
    const routeHeading = view.querySelector('h1');
    return {
      element: view,
      cleanup: () => undefined,
      focusInitial: () => routeHeading?.focus(),
      plannedSubchoices: () => ({ skills: [], expertise: [], spells: [] }),
    };
  }

  const state = options.state;
  const guideable = guideableOptions(state);
  const initiallySelected = guideable.length === 1 ? guideable[0] : undefined;
  let selectedClassId = initiallySelected?.class_definition_id ?? null;
  let pendingEpicPath: PendingEpicPath | null =
    state.pending_epic_resolution === null ? 'next_level' : null;
  let subclassDraft: SubclassDraft = { kind: 'decide_later' };
  let levelFeatDraft: FeatStepDraft = null;
  let epicResolutionDraft: FeatStepDraft = null;
  let plannedDraft: PlannedSubchoiceDraft = EMPTY_PLANNED_SUBCHOICE_DRAFT;
  let replacementLocators = new Set<string>();
  let currentStep: LevelUpStep = 'class';
  let error: string | null = null;
  let applicableStepStatus: string | null = null;
  let frame: LevelUpFrame | null = null;
  let previewCache: PreviewCache | null = null;
  let previewRequestFingerprint: string | null = null;
  let previewGeneration = 0;
  let operationUuid: string | null = null;
  let submitting = false;
  let stale = false;
  let completion: Completion | null = null;
  const host = element('div', { className: 'level-up-route' });

  const selectedClass = (): LevelUpGuideableClassOption | null =>
    guideable.find(
      (candidate) => candidate.class_definition_id === selectedClassId,
    ) ?? null;

  const selectedSubclassProjection = (
    selected: LevelUpGuideableClassOption,
  ): LevelUpPlannedChoiceProjection | undefined => {
    if (subclassDraft.kind !== 'selected') return undefined;
    const subclassDefinitionId = subclassDraft.subclass_definition_id;
    return selected.subclass_choice?.options.find(
      (option) =>
        option.subclass_definition_id === subclassDefinitionId,
    )?.planned_choices;
  };

  const selectedFeatProjection = (): LevelUpPlannedChoiceProjection | undefined =>
    levelFeatDraft?.kind === 'selected'
      ? levelFeatDraft.application.planned_choices
      : undefined;

  const plannedProjection = (): LevelUpPlannedChoiceProjection => {
    const selected = selectedClass();
    if (selected === null) {
      return mergePlannedChoiceProjections([]);
    }
    return mergePlannedChoiceProjections([
      selected.planned_choices,
      selectedSubclassProjection(selected),
      selectedFeatProjection(),
    ]);
  };

  const plannedSubchoices = (): LevelUpPlannedSubchoices => ({
    skills: plannedDraft.skills,
    expertise: plannedDraft.expertise,
    spells: plannedDraft.spells.map((entry) => entry.choice),
  });

  const commandForDraft = (): LevelUpPreviewCommand | null => {
    if (isEpicResolutionPass()) {
      if (
        epicResolutionDraft?.kind !== 'selected' ||
        state.pending_epic_resolution === null
      ) {
        return null;
      }
      return {
        type: 'resolve_level_feat_choice',
        character_level_feat_choice_id:
          state.pending_epic_resolution.deferred_choice
            .character_level_feat_choice_id,
        feat_choice: epicResolutionDraft.application.selection,
      };
    }
    const selected = selectedClass();
    if (selected === null) return null;
    const selectedSubclassId = subclassDraft.kind === 'selected'
      ? subclassDraft.subclass_definition_id
      : null;
    const subclass = selectedSubclassId === null
      ? undefined
      : selected.subclass_choice?.options.find(
          (option) =>
            option.subclass_definition_id ===
            selectedSubclassId,
        );
    const featChoice = levelFeatDraft?.kind === 'selected'
      ? levelFeatDraft.application.selection
      : levelFeatDraft?.kind === 'defer_epic_boon'
        ? { kind: 'defer_epic_boon' as const }
        : undefined;
    const projection = plannedProjection();
    const hasPlannedWork =
      projection.skills.length > 0 ||
      projection.expertise.length > 0 ||
      projection.spells.length > 0;
    return {
      type: 'level_up_class',
      class_definition_id: selected.class_definition_id,
      target_level: selected.target_level,
      ...(subclass === undefined
        ? {}
        : { subclass_content_key: subclass.content_key }),
      ...(featChoice === undefined ? {} : { feat_choice: featChoice }),
      ...(hasPlannedWork ? { planned_subchoices: plannedSubchoices() } : {}),
    };
  };

  const draftFingerprint = (): string | null => {
    const command = commandForDraft();
    return command === null ? null : JSON.stringify(command);
  };

  const invalidatePreview = (): void => {
    previewGeneration += 1;
    previewCache = null;
    previewRequestFingerprint = null;
    operationUuid = null;
    stale = false;
    completion = null;
  };

  const applicableSteps = (): readonly LevelUpStep[] => {
    if (
      pendingEpicPath === 'resolve_now' &&
      state.pending_epic_resolution !== null
    ) {
      return orderedSteps(state.pending_epic_resolution.applicable_steps);
    }
    const selected = selectedClass();
    if (selected === null) return ['class'];
    const planned = plannedProjection();
    return orderedSteps([
      ...selected.applicable_steps.filter(
        (step) =>
          step !== 'skills' && step !== 'expertise' && step !== 'spells',
      ),
      ...(planned.skills.length > 0 ? ['skills' as const] : []),
      ...(planned.expertise.length > 0 ? ['expertise' as const] : []),
      ...(planned.spells.length > 0 ? ['spells' as const] : []),
    ]);
  };

  const isEpicResolutionPass = (): boolean =>
    pendingEpicPath === 'resolve_now' && state.pending_epic_resolution !== null;

  const draftReview = (): LevelUpDraftReview => {
    if (isEpicResolutionPass()) {
      const feat = selectedFeatName(
        epicResolutionDraft,
        state.pending_epic_resolution?.candidates ?? [],
      );
      return {
        subclass: null,
        feats: feat === null ? [] : [feat],
        skills: [],
        expertise: [],
        spells: [],
        new_class_features: { kind: 'sourced', feature_names: [] },
      };
    }
    const selected = selectedClass();
    if (selected === null) {
      return {
        subclass: null,
        feats: [],
        skills: [],
        expertise: [],
        spells: [],
        new_class_features: { kind: 'unavailable' },
      };
    }
    const projection = plannedProjection();
    const sourceLabel = (
      locator: LevelUpPlannedSkillProjection['locator'],
      choices: readonly {
        readonly locator: LevelUpPlannedSkillProjection['locator'];
        readonly source_label: string;
      }[],
    ): string => choices.find(
      (choice) =>
        plannedGrantLocatorKey(choice.locator) ===
        plannedGrantLocatorKey(locator),
    )?.source_label ?? 'Unknown granting source';
    const feat = selectedFeatName(
      levelFeatDraft,
      selected.feat_occurrence?.candidates ?? [],
    );
    const selectedSubclassId = subclassDraft.kind === 'selected'
      ? subclassDraft.subclass_definition_id
      : null;
    const subclass = selected.subclass_choice === null
      ? null
      : selectedSubclassId !== null
        ? {
            kind: 'selected' as const,
            name: selected.subclass_choice.options.find(
              (option) =>
                option.subclass_definition_id ===
                selectedSubclassId,
            )?.name ?? `Subclass ${String(selectedSubclassId)}`,
            catalog_layer: selected.subclass_choice.options.find(
              (option) =>
                option.subclass_definition_id === selectedSubclassId,
            )?.catalog_layer ?? 'unknown',
          }
        : {
            kind: 'deferred' as const,
            class_name: selected.name,
            target_level: selected.target_level,
          };
    return {
      subclass,
      feats: feat === null ? [] : [feat],
      skills: plannedDraft.skills.map(
        (choice) =>
          `${titleCaseIdentifier(choice.skill)} — ${sourceLabel(choice.locator, projection.skills)}`,
      ),
      expertise: plannedDraft.expertise.map(
        (choice) =>
          `${titleCaseIdentifier(choice.skill)} — ${sourceLabel(choice.locator, projection.expertise)}`,
      ),
      spells: plannedDraft.spells.map((entry) =>
        `${entry.spell_name} — ${sourceLabel(entry.choice.locator, projection.spells)}`,
      ),
      new_class_features: selected.gains.target_features,
    };
  };

  const activeFeatDraft = (): FeatStepDraft =>
    isEpicResolutionPass() ? epicResolutionDraft : levelFeatDraft;

  const selectedFeatIsQualified = (draft: FeatStepDraft): boolean =>
    draft?.kind === 'selected' &&
    draft.application.plan.eligibility.status === 'qualified';

  const deferredEpicWarning = (): LevelUpWarningPresentation | null => {
    if (
      pendingEpicPath === 'next_level' &&
      state.pending_epic_resolution !== null
    ) {
      return state.pending_epic_resolution.warning;
    }
    if (levelFeatDraft?.kind === 'defer_epic_boon') {
      return levelUpWarningPresentation('epic_boon_deferred');
    }
    return null;
  };

  const clearAllPlannedChoices = (): void => {
    plannedDraft = EMPTY_PLANNED_SUBCHOICE_DRAFT;
    replacementLocators = new Set<string>();
    invalidatePreview();
  };

  const replaceSkillChoice = (
    projection: LevelUpPlannedSkillProjection,
    skill: Skill | null,
  ): void => {
    const key = plannedGrantLocatorKey(projection.locator);
    const current = plannedDraft.skills.find(
      (choice) => plannedGrantLocatorKey(choice.locator) === key,
    )?.skill ?? null;
    if (current === skill) return;
    plannedDraft = {
      skills: [
        ...plannedDraft.skills.filter(
          (choice) => plannedGrantLocatorKey(choice.locator) !== key,
        ),
        ...(skill === null ? [] : [{ locator: projection.locator, skill }]),
      ],
      expertise: [],
      spells: [],
    };
    replacementLocators = new Set<string>();
    invalidatePreview();
  };

  const replaceExpertiseChoice = (
    projection: LevelUpPlannedExpertiseProjection,
    skill: Skill | null,
  ): void => {
    const key = plannedGrantLocatorKey(projection.locator);
    const current = plannedDraft.expertise.find(
      (choice) => plannedGrantLocatorKey(choice.locator) === key,
    )?.skill ?? null;
    if (current === skill) return;
    plannedDraft = {
      skills: plannedDraft.skills,
      expertise: [
        ...plannedDraft.expertise.filter(
          (choice) => plannedGrantLocatorKey(choice.locator) !== key,
        ),
        ...(skill === null ? [] : [{ locator: projection.locator, skill }]),
      ],
      spells: [],
    };
    replacementLocators = new Set<string>();
    invalidatePreview();
  };

  const replaceSpellChoice = (
    projection: LevelUpPlannedSpellProjection,
    spell: PlannedSpellDraft | null,
  ): void => {
    const key = plannedGrantLocatorKey(projection.locator);
    plannedDraft = {
      ...plannedDraft,
      spells: [
        ...plannedDraft.spells.filter(
          (entry) => plannedGrantLocatorKey(entry.choice.locator) !== key,
        ),
        ...(spell === null ? [] : [spell]),
      ],
    };
    invalidatePreview();
  };

  const moveTo = (step: LevelUpStep): void => {
    currentStep = step;
    error = null;
    render(false);
    frame?.stepHeading.focus();
  };

  const showError = (message: string): void => {
    error = message;
    render(false);
    frame?.alert?.focus();
  };

  const beginPreview = (
    command: LevelUpPreviewCommand,
    fingerprint: string,
  ): void => {
    if (
      options.preview === undefined ||
      previewRequestFingerprint === fingerprint
    ) {
      return;
    }
    const generation = ++previewGeneration;
    const reviewedDraft = draftReview();
    previewRequestFingerprint = fingerprint;
    error = null;
    void options.preview(state.character.revision, command).then((result) => {
      if (
        generation !== previewGeneration ||
        draftFingerprint() !== fingerprint
      ) {
        return;
      }
      previewCache = {
        draftFingerprint: fingerprint,
        result,
        draft: reviewedDraft,
      };
      error = null;
      if (currentStep === 'review') render(false);
    }).catch((previewError: unknown) => {
      if (
        generation !== previewGeneration ||
        draftFingerprint() !== fingerprint
      ) {
        return;
      }
      const currentRevision = errorData(previewError)?.['current_revision'];
      stale = typeof currentRevision === 'number';
      error = stale
        ? 'This character changed elsewhere. Reload level-up state to review the draft against the current character.'
        : plannedSubchoiceRefusalMessage(previewError) ??
          `The level-up preview could not be prepared: ${errorMessage(previewError)}`;
      if (currentStep === 'review') {
        render(false);
        frame?.alert?.focus();
      }
    });
  };

  const reloadLevelUpState = (): void => {
    void options.reloadState?.();
  };

  const confirm = (): void => {
    if (submitting || stale) return;
    const command = commandForDraft();
    const fingerprint = draftFingerprint();
    const cached = previewCache;
    if (
      command === null ||
      fingerprint === null ||
      cached === null ||
      cached.draftFingerprint !== fingerprint
    ) {
      showError('Prepare a fresh review before confirming this draft.');
      return;
    }
    if (options.submit === undefined || options.loadSheet === undefined) {
      showError('Level-up submission is unavailable.');
      return;
    }

    appendSubmittingStatus(host);
    submitting = true;
    operationUuid ??= options.randomUuid?.() ?? crypto.randomUUID();
    const confirmedOperationUuid = operationUuid;
    void options.submit(
      state.character.revision,
      command,
      confirmedOperationUuid,
    ).then(async () => {
      const sheet = await options.loadSheet?.();
      if (sheet === undefined) {
        throw new Error('Fresh character sheet data was unavailable.');
      }
      completion = {
        preview: cached.result,
        sheet,
        draft: cached.draft,
      };
      submitting = false;
      clearSubmittingStatus(host);
      currentStep = 'complete';
      error = null;
      render(false);
      frame?.stepHeading.focus();
    }).catch((submitError: unknown) => {
      submitting = false;
      clearSubmittingStatus(host);
      const data = errorData(submitError);
      const currentRevision = data?.['current_revision'];
      const reason = data?.['reason'];
      if (typeof currentRevision === 'number') {
        stale = true;
        error =
          'This character changed elsewhere. Your draft was kept; reload level-up state before confirming it.';
      } else if (isAmbiguousTransportError(submitError)) {
        error =
          'The result of the submission is unknown. Retry submission to check the same operation safely.';
      } else {
        operationUuid = null;
        if (reason === 'class_not_held' || reason === 'level_not_adjacent') {
          stale = true;
          error =
            'The selected class level is no longer current. Reload level-up state.';
        } else {
          error = reason === 'ability_increase_required'
            ? 'Choose a feat for this class level.'
            : plannedSubchoiceRefusalMessage(submitError) ??
              `The level up was not applied: ${errorMessage(submitError)}`;
        }
      }
      render(false);
      frame?.alert?.focus();
    });
  };

  const focusSpellControl = (locatorKey: string, label: string): void => {
    const card = Array.from(
      host.querySelectorAll<HTMLElement>(`[${LEVEL_UP_ATTR.spellChoice}]`),
    ).find(
      (candidate) =>
        candidate.getAttribute(LEVEL_UP_ATTR.spellChoice) === locatorKey,
    );
    Array.from(card?.querySelectorAll<HTMLElement>('[aria-label]') ?? []).find(
      (control) => control.getAttribute('aria-label') === label,
    )?.focus();
  };

  const next = (): void => {
    if (currentStep === 'class') {
      if (pendingEpicPath === null) {
        showError('Choose whether to resolve the deferred Epic Boon now or proceed to the next level.');
        return;
      }
      if (pendingEpicPath === 'next_level' && selectedClass() === null) {
        showError('Choose a guideable held class to advance.');
        return;
      }
      const first = applicableSteps()[0];
      if (first === undefined) {
        showError('No applicable level-up step was returned.');
        return;
      }
      moveTo(first === 'class' ? applicableSteps()[1] ?? 'class' : first);
      return;
    }
    if (currentStep === 'feat' && !selectedFeatIsQualified(levelFeatDraft)) {
      showError('Choose a feat for this class level.');
      return;
    }
    if (currentStep === 'epic_boon') {
      const draft = activeFeatDraft();
      if (isEpicResolutionPass()) {
        if (!selectedFeatIsQualified(draft)) {
          showError('Choose an Epic Boon to resolve the deferred choice.');
          return;
        }
      } else if (
        draft === null ||
        (draft.kind === 'selected' && !selectedFeatIsQualified(draft))
      ) {
        showError('Choose an Epic Boon or choose Decide later.');
        return;
      }
    }
    const steps = applicableSteps();
    const index = steps.indexOf(currentStep);
    const following = index < 0 ? undefined : steps[index + 1];
    if (following !== undefined) moveTo(following);
  };

  const back = (): void => {
    if (
      currentStep === 'review' &&
      previewCache === null &&
      previewRequestFingerprint !== null
    ) {
      previewRequestFingerprint = null;
      stale = false;
    }
    const steps = applicableSteps();
    const index = steps.indexOf(currentStep);
    const previous = index <= 0 ? undefined : steps[index - 1];
    moveTo(previous ?? 'class');
  };

  const renderPanel = (): { readonly element: HTMLElement; readonly cleanup: Cleanup } => {
    if (currentStep === 'class') {
      return createClassStep({
        state,
        selectedClassId,
        pendingEpicPath,
        onSelectClass: (classDefinitionId) => {
          selectedClassId = classDefinitionId;
          subclassDraft = { kind: 'decide_later' };
          levelFeatDraft = null;
          clearAllPlannedChoices();
          error = null;
          applicableStepStatus = `${String(applicableSteps().length)} applicable level-up steps.`;
          render(false);
        },
        onSelectPendingEpicPath: (path) => {
          if (pendingEpicPath !== path) {
            if (path === 'resolve_now') epicResolutionDraft = null;
            subclassDraft = { kind: 'decide_later' };
            levelFeatDraft = null;
            clearAllPlannedChoices();
          }
          pendingEpicPath = path;
          error = null;
          applicableStepStatus = `${String(applicableSteps().length)} applicable level-up steps.`;
          render(false);
          host.querySelector<HTMLInputElement>(`[value="${path}"]`)?.focus();
        },
      });
    }
    const selected = selectedClass();
    if (currentStep === 'gains') {
      if (selected === null) {
        throw new Error('The Gains step requires a selected guideable class.');
      }
      return { element: renderGainsStep(selected), cleanup: () => undefined };
    }
    if (currentStep === 'subclass') {
      if (selected === null) {
        throw new Error('The Subclass step requires a selected guideable class.');
      }
      return createSubclassStep({
        selectedClass: selected,
        draft: subclassDraft,
        warnings: state.character.warnings,
        onSelect: (draft) => {
          subclassDraft = draft;
          levelFeatDraft = null;
          clearAllPlannedChoices();
          error = null;
          applicableStepStatus = `${String(applicableSteps().length)} applicable level-up steps.`;
          render(false);
          const focusValue = draft.kind === 'selected'
            ? String(draft.subclass_definition_id)
            : 'decide_later';
          host.querySelector<HTMLInputElement>(`[value="${focusValue}"]`)?.focus();
        },
      });
    }
    if (currentStep === 'feat') {
      if (
        selected?.feat_occurrence === null ||
        selected?.feat_occurrence.kind !== 'asi_level_feat'
      ) {
        throw new Error('The Feat step requires a returned ASI feat occurrence.');
      }
      return createFeatStep({
        step: 'feat',
        candidates: selected.feat_occurrence.candidates,
        draft: levelFeatDraft,
        allowDefer: false,
        deferredWarning: levelUpWarningPresentation('epic_boon_deferred'),
        onSelect: (draft) => {
          levelFeatDraft = draft;
          clearAllPlannedChoices();
          error = null;
          applicableStepStatus = `${String(applicableSteps().length)} applicable level-up steps.`;
          render(false);
          if (draft.kind === 'selected') {
            host.querySelector<HTMLInputElement>('[checked]')?.focus();
          }
        },
      });
    }
    if (currentStep === 'epic_boon') {
      const resolution = isEpicResolutionPass();
      const occurrence = selected?.feat_occurrence;
      if (
        !resolution &&
        (occurrence === null || occurrence === undefined || occurrence.kind !== 'epic_boon')
      ) {
        throw new Error('The Epic Boon step requires a returned Epic Boon occurrence.');
      }
      const warning = state.pending_epic_resolution?.warning ??
        levelUpWarningPresentation('epic_boon_deferred');
      return createFeatStep({
        step: 'epic_boon',
        candidates: resolution
          ? state.pending_epic_resolution?.candidates ?? []
          : occurrence?.candidates ?? [],
        draft: resolution ? epicResolutionDraft : levelFeatDraft,
        allowDefer: !resolution,
        deferredWarning: warning,
        onSelect: (draft) => {
          if (resolution) epicResolutionDraft = draft;
          else levelFeatDraft = draft;
          clearAllPlannedChoices();
          error = null;
          render(false);
          const value = draft.kind === 'selected'
            ? String(draft.application.selection.feat_content_key)
            : null;
          if (value === null) {
            host.querySelector<HTMLInputElement>('[value="defer_epic_boon"]')?.focus();
          } else {
            host.querySelector<HTMLInputElement>('[checked]')?.focus();
          }
        },
      });
    }
    if (currentStep === 'skills') {
      return createPlannedSkillsStep({
        projections: plannedProjection().skills,
        draft: plannedDraft,
        onSelect: replaceSkillChoice,
      });
    }
    if (currentStep === 'expertise') {
      return createPlannedExpertiseStep({
        projections: plannedProjection().expertise,
        draft: plannedDraft,
        onSelect: replaceExpertiseChoice,
      });
    }
    if (currentStep === 'spells') {
      if (selected === null) {
        throw new Error('The Spells step requires a selected guideable class.');
      }
      const search = options.searchPlannedSpells ?? (() =>
        Promise.reject(new Error('Planned spell search is unavailable.')));
      const selectedSubclassId = subclassDraft.kind === 'selected'
        ? subclassDraft.subclass_definition_id
        : null;
      const selectedSubclass = selectedSubclassId === null
        ? undefined
        : selected.subclass_choice?.options.find(
            (option) => option.subclass_definition_id === selectedSubclassId,
          );
      return createPlannedSpellsStep({
        projections: plannedProjection().spells,
        draft: plannedDraft,
        replacementLocators,
        searchParams: {
          character_id: state.character.character_id,
          expected_revision: state.character.revision,
          class_definition_id: selected.class_definition_id,
          target_class_level: selected.target_level,
          ...(selectedSubclass === undefined
            ? {}
            : { subclass_content_key: selectedSubclass.content_key }),
          ...(levelFeatDraft?.kind === 'selected'
            ? { feat_choice: levelFeatDraft.application.selection }
            : {}),
        },
        search,
        onSelect: replaceSpellChoice,
        onReplacementMode: (projection, replacing) => {
          const key = plannedGrantLocatorKey(projection.locator);
          replacementLocators = new Set(replacementLocators);
          if (replacing) replacementLocators.add(key);
          else {
            replacementLocators.delete(key);
            replaceSpellChoice(projection, null);
          }
          invalidatePreview();
          render(false);
          focusSpellControl(
            key,
            replacing
              ? `Replace ${projection.current_spell_name}`
              : `Keep ${projection.current_spell_name}`,
          );
        },
        ...(options.spellPickerFactory === undefined
          ? {}
          : { pickerFactory: options.spellPickerFactory }),
      });
    }
    if (currentStep === 'review') {
      const command = commandForDraft();
      const fingerprint = draftFingerprint();
      if (command === null || fingerprint === null) {
        return {
          element: renderReviewLoading(),
          cleanup: () => undefined,
        };
      }
      if (
        previewCache !== null &&
        previewCache.draftFingerprint === fingerprint
      ) {
        return renderReview({
          preview: previewCache.result,
          draft: previewCache.draft,
          retainedWarnings: state.character.warnings,
          stale,
          reloadState: reloadLevelUpState,
        });
      }
      if (
        error !== null &&
        previewRequestFingerprint === fingerprint
      ) {
        return renderReviewFailure({
          stale,
          reloadState: reloadLevelUpState,
          retryPreview: () => {
            previewRequestFingerprint = null;
            error = null;
            render(false);
            frame?.stepHeading.focus();
          },
        });
      }
      beginPreview(command, fingerprint);
      return {
        element: renderReviewLoading(),
        cleanup: () => undefined,
      };
    }
    if (currentStep === 'complete' && completion !== null) {
      return {
        element: renderComplete({
          preview: completion.preview,
          draft: completion.draft,
          sheet: completion.sheet,
          resolution: isEpicResolutionPass(),
          retainedWarnings: state.character.warnings,
        }),
        cleanup: () => undefined,
      };
    }
    return {
      element: renderUnimplementedLevelUpStep(currentStep),
      cleanup: () => undefined,
    };
  };

  const render = (initial: boolean): void => {
    frame?.cleanup();
    const panel = renderPanel();
    const warning = deferredEpicWarning();
    if (
      currentStep !== 'class' &&
      warning !== null &&
      panel.element.querySelector(
        `[${LEVEL_UP_ATTR.warning}="${warning.key}"]`,
      ) === null
    ) {
      panel.element.append(renderDeferredEpicWarning(warning));
    }
    const steps = applicableSteps();
    const displayedSteps =
      currentStep === 'class' && !steps.includes('class')
        ? orderedSteps(['class', ...steps])
        : steps;
    const nextIndex = steps.indexOf(currentStep) + 1;
    const implementedStep =
      currentStep === 'class' ||
      currentStep === 'gains' ||
      currentStep === 'subclass' ||
      currentStep === 'feat' ||
      currentStep === 'epic_boon' ||
      currentStep === 'skills' ||
      currentStep === 'expertise' ||
      currentStep === 'spells' ||
      currentStep === 'review' ||
      currentStep === 'complete';
    const reviewReady =
      currentStep === 'review' &&
      previewCache !== null &&
      previewCache.draftFingerprint === draftFingerprint() &&
      !stale;
    const hasNext = implementedStep &&
      (currentStep === 'class' ||
        (nextIndex > 0 && nextIndex < steps.length));
    frame = createLevelUpFrame({
      characterName: state.character.name,
      steps: displayedSteps,
      currentStep,
      panel: panel.element,
      navigation: {
        ...(currentStep === 'class' || currentStep === 'complete'
          ? {}
          : { back }),
        ...(reviewReady
          ? {
              next: confirm,
              nextLabel: operationUuid === null ? 'Confirm level up' : 'Retry submission',
              nextKind: 'confirm' as const,
            }
          : hasNext && currentStep !== 'review' && currentStep !== 'complete'
          ? {
              next,
              ...(currentStep === 'subclass' &&
              selectedClass()?.subclass_choice?.options.length === 0
                ? { nextLabel: 'Continue' }
                : {}),
            }
          : {}),
        ...(currentStep === 'complete' ? {} : { cancel: options.cancel }),
      },
      applicableStepStatus,
      error,
    });
    const frameCleanup = frame.cleanup;
    frame = { ...frame, cleanup: () => {
      panel.cleanup();
      frameCleanup();
    } };
    host.replaceChildren(frame.element);
    if (!initial && currentStep === 'class') {
      const selectedControl = selectedClassId === null
        ? null
        : host.querySelector<HTMLInputElement>(
            `[${LEVEL_UP_ATTR.classOption}="${String(selectedClassId)}"]`,
          );
      selectedControl?.focus();
    }
  };

  render(true);
  return {
    element: host,
    cleanup: () => {
      frame?.cleanup();
      frame = null;
    },
    focusInitial: () => frame?.routeHeading.focus(),
    plannedSubchoices: () => ({
      ...plannedSubchoices(),
    }),
  };
}
