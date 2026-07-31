import {
  LEVEL_UP_ATTR,
  LEVEL_UP_STEP_ORDER,
  type LevelUpGuideableClassOption,
  type LevelUpStateResult,
  type LevelUpStep,
} from '../../../builder/level-up-wizard';
import { element, type Cleanup } from '../../dom';
import {
  createClassStep,
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

/**
 * The W-B1 controller. Every mutable value below is page-memory only; it has
 * no query, command, storage, worker, or database dependency.
 */
export function createLevelUpWizard(options: {
  readonly state: LevelUpStateResult;
  readonly cancel: () => void;
}): LevelUpWizardController {
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
          error = null;
          applicableStepStatus = `${String(applicableSteps().length)} applicable level-up steps.`;
          render(false);
        },
        onSelectPendingEpicPath: (path) => {
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
    return {
      element: renderUnimplementedLevelUpStep(currentStep),
      cleanup: () => undefined,
    };
  };

  const render = (initial: boolean): void => {
    frame?.cleanup();
    const panel = renderPanel();
    const steps = applicableSteps();
    const displayedSteps =
      currentStep === 'class' && !steps.includes('class')
        ? orderedSteps(['class', ...steps])
        : steps;
    const nextIndex = steps.indexOf(currentStep) + 1;
    const implementedStep =
      currentStep === 'class' ||
      currentStep === 'gains' ||
      currentStep === 'subclass';
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
