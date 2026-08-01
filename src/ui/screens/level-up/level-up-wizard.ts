import {
  LEVEL_UP_ATTR,
  LEVEL_UP_STEP_ORDER,
  levelUpWarningPresentation,
  type LevelUpGuideableClassOption,
  type LevelUpWarningPresentation,
  type LevelUpStateResult,
  type LevelUpStep,
} from '../../../builder/level-up-wizard';
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

export interface LevelUpWizardController {
  readonly element: HTMLElement;
  readonly cleanup: Cleanup;
  focusInitial(): void;
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
}): LevelUpWizardController {
  const host = element('div', { className: 'level-up-route' });
  let currentCleanup: Cleanup = () => undefined;
  let initialFocusTarget: HTMLElement | null = null;
  let draft: FeatStepDraft = null;
  let error: string | null = null;
  let activeFrame: LevelUpFrame | null = null;

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

  const showStep = (step: 'epic_boon' | 'review'): void => {
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
            error = null;
            showStep('epic_boon');
            host.querySelector<HTMLInputElement>('[checked]')?.focus();
          },
        })
      : null;
    const panel = featView?.element ?? renderUnimplementedLevelUpStep('review');
    const frame = createLevelUpFrame({
      characterName: options.state.character.name,
      steps: orderedSteps(
        options.state.pending_epic_resolution.applicable_steps,
      ),
      currentStep: step,
      panel,
      navigation: {
        back: () => {
          if (step === 'epic_boon') showPrompt(true);
          else showStep('epic_boon');
        },
        cancel: options.cancel,
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
  };
}

/**
 * The W-B1 controller. Every mutable value below is page-memory only; it has
 * no query, command, storage, worker, or database dependency.
 */
export function createLevelUpWizard(options: {
  readonly state: LevelUpStateResult;
  readonly cancel: () => void;
}): LevelUpWizardController {
  if (isTerminalEpicState(options.state)) {
    return createTerminalEpicResolutionWizard({
      state: options.state,
      cancel: options.cancel,
    });
  }
  if (options.state.kind !== 'ready') {
    const view = renderLevelUpTerminalState(options.state);
    const routeHeading = view.querySelector('h1');
    return {
      element: view,
      cleanup: () => undefined,
      focusInitial: () => routeHeading?.focus(),
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
  let currentStep: LevelUpStep = 'class';
  let error: string | null = null;
  let applicableStepStatus: string | null = null;
  let frame: LevelUpFrame | null = null;
  const host = element('div', { className: 'level-up-route' });

  const selectedClass = (): LevelUpGuideableClassOption | null =>
    guideable.find(
      (candidate) => candidate.class_definition_id === selectedClassId,
    ) ?? null;

  const applicableSteps = (): readonly LevelUpStep[] => {
    if (
      pendingEpicPath === 'resolve_now' &&
      state.pending_epic_resolution !== null
    ) {
      return orderedSteps(state.pending_epic_resolution.applicable_steps);
    }
    const selected = selectedClass();
    return selected === null
      ? ['class']
      : orderedSteps(selected.applicable_steps);
  };

  const isEpicResolutionPass = (): boolean =>
    pendingEpicPath === 'resolve_now' && state.pending_epic_resolution !== null;

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
          error = null;
          applicableStepStatus = `${String(applicableSteps().length)} applicable level-up steps.`;
          render(false);
        },
        onSelectPendingEpicPath: (path) => {
          if (pendingEpicPath !== path && path === 'resolve_now') {
            epicResolutionDraft = null;
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
          error = null;
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
          error = null;
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
      currentStep === 'epic_boon';
    const hasNext = implementedStep &&
      (currentStep === 'class' ||
        (nextIndex > 0 && nextIndex < steps.length));
    frame = createLevelUpFrame({
      characterName: state.character.name,
      steps: displayedSteps,
      currentStep,
      panel: panel.element,
      navigation: {
        ...(currentStep === 'class' ? {} : { back }),
        ...(hasNext
          ? {
              next,
              ...(currentStep === 'subclass' &&
              selectedClass()?.subclass_choice?.options.length === 0
                ? { nextLabel: 'Continue' }
                : {}),
            }
          : {}),
        cancel: options.cancel,
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
  };
}
