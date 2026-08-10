/**
 * THE EQUIPMENT STEP — dispatch E-B of
 * `docs/design/2026-07-29-starting-equipment.md` (§0c, §3, §4, §7).
 *
 * What this step is, stated so no rewrite can drift from it:
 *
 * - MOSTLY A CONFIRMATION, NOT A CHOOSER. Gold-only options are suppressed
 *   server-side (D56, §0c), so 11 of 12 classes and every background arrive
 *   here with exactly ONE offerable option; Fighter is the only class with
 *   two. The render handles one option as the common case and several as the
 *   Fighter case — it does not assume two.
 * - NO COIN LINE EVER RENDERS. The contents lists arrive display-filtered
 *   ("and 4 GP" is a seeded gear row the read already removed); this module
 *   adds no second filter and must not re-introduce the line.
 * - GEAR IS DISPLAYED, NEVER TRACKED (D65). The not-itemised disclosure says
 *   so on the step, the same sentence discipline the sheet uses (D33).
 * - A RECORDED CHOICE STAYS CHANGEABLE. Confirming another offered option
 *   re-mints through the one E-A transaction; rows a person added by hand
 *   are never touched, and an occupied armour slot comes back as a NAMED
 *   refusal telling them exactly what collided.
 * - §5's trap: nothing here links into the planner grid. Every successful
 *   write re-navigates to the build route, which re-derives the step.
 */

import {
  guidedBuildPath,
  EQUIPMENT_STEP_ATTR,
  EQUIPMENT_STEP_PANEL,
  GUIDED_PANEL_ATTRIBUTE,
  type EquipmentSourceKind,
  type GuidedApplyEquipmentParams,
  type GuidedApplyOriginResult,
  type GuidedEquipmentItemLine,
  type GuidedEquipmentSourcePackage,
  type GuidedEquipmentStepState,
} from '../../../builder/contracts';
import { catalogLayerLabel } from '../../../catalog/catalog-disclosure';
import { RpcError } from '../../../rpc/protocol';
import { clear, element, listen, type Cleanup } from '../../dom';
import {
  createBackupHint,
  type BackupHintDeps,
} from './backup-hint';
import { characterListLink, guidedShell } from './guided-builder';

/**
 * The equipment refusals on the wire: `handler_error` with structured data.
 * The armour collision names the slot, the item and the holder so the
 * sentence can offer the remedy the plan pins (§3) — never a stack trace.
 */
export function applyEquipmentRefusalMessage(error: unknown): string | null {
  if (!(error instanceof RpcError) || error.code !== 'handler_error') {
    return null;
  }
  const data: unknown = error.data;
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return null;
  }
  const record = data as Record<string, unknown>;
  switch (record['reason']) {
    case 'armor_slot_occupied': {
      const item = typeof record['item'] === 'string' ? record['item'] : null;
      const holder =
        typeof record['holder'] === 'string' ? record['holder'] : null;
      const slot = typeof record['slot'] === 'string' ? record['slot'] : null;
      return item === null || holder === null || slot === null
        ? 'An armour slot this package needs is already occupied. Remove ' +
            'or reslot the existing item in the planner, then confirm the ' +
            'package again. Nothing was changed.'
        : `The ${slot} slot already holds ${holder}, so ${item} cannot be ` +
            `granted. Remove or reslot ${holder} first, then confirm the ` +
            'package again. Nothing was changed.';
    }
    case 'equipment_dependency_drift':
      return (
        'A weapon or armour definition used by this background changed after ' +
        'publication. Repair or republish the background before confirming ' +
        'its package. Nothing was changed.'
      );
    case 'equipment_option_not_offered':
      return (
        'That option is not offered. Equipment is the package only — the ' +
        'gold alternative is not part of this application.'
      );
    case 'equipment_source_mismatch':
      return (
        'That package does not belong to this character. Reload the page ' +
        'to refresh the step.'
      );
    default:
      return null;
  }
}

const SOURCE_LABELS: Readonly<Record<EquipmentSourceKind, string>> = {
  class: 'Class package',
  background: 'Background package',
};

/** "8 Javelin" prints as the extract does: count first, name verbatim. */
function lineText(line: GuidedEquipmentItemLine): string {
  return line.quantity === 1
    ? line.item_name
    : `${String(line.quantity)} ${line.item_name}`;
}

export interface EquipmentStepDeps {
  readonly characterId: number;
  readonly state: GuidedEquipmentStepState;
  readonly backupHint?: BackupHintDeps;
  readonly applyEquipment: (
    params: GuidedApplyEquipmentParams,
  ) => Promise<GuidedApplyOriginResult>;
  readonly navigate: (path: string) => void;
}

export interface EquipmentStep {
  readonly element: HTMLElement;
  readonly cleanup: Cleanup;
}

export function createEquipmentStep(deps: EquipmentStepDeps): EquipmentStep {
  const cleanups: Cleanup[] = [];
  const controls: HTMLButtonElement[] = [];
  let inFlight = false;

  const errorMount = element('div', { className: 'guided-error-mount' });
  const setError = (message: string | null): void => {
    clear(errorMount);
    if (message !== null) {
      errorMount.append(
        element('p', {
          className: 'guided-error',
          text: message,
          attributes: { role: 'alert' },
        }),
      );
    }
  };

  const setControlsDisabled = (disabled: boolean): void => {
    for (const control of controls) {
      control.disabled = disabled;
    }
  };

  const write = async (params: GuidedApplyEquipmentParams): Promise<void> => {
    if (inFlight) {
      return;
    }
    // The same UI-only double-submit guard every guided step uses: disable
    // before the await, re-enable only on failure.
    inFlight = true;
    setError(null);
    setControlsDisabled(true);
    try {
      await deps.applyEquipment(params);
      // The choice is recorded; the build route re-derives the step from the
      // database — this same step with the choice shown, or done.
      deps.navigate(guidedBuildPath(deps.characterId));
    } catch (error) {
      setError(
        applyEquipmentRefusalMessage(error) ??
          (error instanceof Error ? error.message : String(error)),
      );
      inFlight = false;
      setControlsDisabled(false);
    }
  };

  const contentsList = (
    contents: readonly GuidedEquipmentItemLine[],
  ): HTMLElement =>
    element(
      'ul',
      {
        className: 'guided-equipment-contents',
        attributes: { [EQUIPMENT_STEP_ATTR.contents]: '' },
      },
      contents.map((line) =>
        element('li', {
          text:
            lineText(line) +
            (line.catalog_layer === null
              ? ''
              : ` — ${catalogLayerLabel(line.catalog_layer)}`),
          className:
            line.item_kind === 'gear'
              ? 'guided-equipment-line guided-equipment-gear'
              : 'guided-equipment-line',
        }),
      ),
    );

  // The params builder is supplied per source so the class/background option
  // pairing stays PROVEN by the seam's discriminated union — no cast can put
  // a Fighter's option C on a background.
  const sourceSection = <Option extends string>(
    kind: EquipmentSourceKind,
    pack: GuidedEquipmentSourcePackage<Option>,
    makeParams: (option: Option) => GuidedApplyEquipmentParams,
  ): HTMLElement => {
    const children: HTMLElement[] = [
      element('h3', {
        text:
          `${SOURCE_LABELS[kind]} — ${pack.source_name} — ` +
          catalogLayerLabel(pack.catalog_layer),
      }),
    ];
    if (pack.chosen_option !== null) {
      children.push(
        element('p', {
          className: 'guided-equipment-recorded',
          text: `Recorded: option ${pack.chosen_option.toUpperCase()}.`,
          attributes: { [EQUIPMENT_STEP_ATTR.recorded]: pack.chosen_option },
        }),
      );
    }
    if (pack.offered.length === 0) {
      // The degenerate case, disclosed rather than rendered as an empty
      // chooser: a source the rules tables do not know offers nothing.
      children.push(
        element('p', {
          className: 'guided-equipment-empty',
          text:
            `This ${kind} has no installed equipment package, so there is ` +
            'nothing to confirm here.',
        }),
      );
    }
    for (const offered of pack.offered) {
      const isRecorded = offered.option === pack.chosen_option;
      const confirm = element('button', {
        className: 'guided-equipment-choose',
        text:
          pack.chosen_option === null
            ? pack.offered.length === 1
              ? 'Take this package'
              : `Take option ${offered.option.toUpperCase()}`
            : `Switch to option ${offered.option.toUpperCase()}`,
        attributes: {
          type: 'button',
          [EQUIPMENT_STEP_ATTR.choose]: offered.option,
        },
      });
      if (isRecorded) {
        confirm.disabled = true;
        confirm.textContent = `Option ${offered.option.toUpperCase()} is recorded`;
      } else {
        controls.push(confirm);
        cleanups.push(
          listen(confirm, 'click', () => void write(makeParams(offered.option))),
        );
      }
      children.push(
        element(
          'div',
          {
            className: isRecorded
              ? 'guided-equipment-option guided-equipment-option-recorded'
              : 'guided-equipment-option',
            attributes: { [EQUIPMENT_STEP_ATTR.option]: offered.option },
          },
          [
            element('h4', {
              text:
                pack.offered.length === 1
                  ? `Option ${offered.option.toUpperCase()} — the package`
                  : `Option ${offered.option.toUpperCase()}`,
            }),
            contentsList(offered.contents),
            confirm,
          ],
        ),
      );
    }
    return element(
      'section',
      {
        className: 'guided-equipment-source',
        attributes: { [EQUIPMENT_STEP_ATTR.source]: kind },
      },
      children,
    );
  };

  const sections: HTMLElement[] = [
    sourceSection('class', deps.state.class_package, (option) => ({
      character_id: deps.characterId,
      kind: 'class',
      content_key: deps.state.class_package.content_key,
      option,
    })),
  ];
  if (deps.state.background_package === null) {
    // D33: an unresolvable background is disclosed, never guessed. The step
    // cannot complete without it, and says why instead of showing nothing.
    sections.push(
      element(
        'section',
        {
          className: 'guided-equipment-source',
          attributes: { [EQUIPMENT_STEP_ATTR.source]: 'background' },
        },
        [
          element('h3', { text: 'Background package' }),
          element('p', {
            className: 'guided-equipment-unresolved',
            text:
              'This character’s background does not match one installed ' +
              'background, so its equipment package cannot be offered and ' +
              'this step cannot complete.',
          }),
        ],
      ),
    );
  } else {
    const backgroundPackage = deps.state.background_package;
    sections.push(
      sourceSection('background', backgroundPackage, (option) => ({
        character_id: deps.characterId,
        kind: 'background',
        content_key: backgroundPackage.content_key,
        option,
      })),
    );
  }

  const backupHint =
    deps.backupHint === undefined
      ? null
      : createBackupHint(deps.state.complete, deps.backupHint);
  if (backupHint !== null) {
    cleanups.push(backupHint.cleanup);
  }

  const panel = element(
    'section',
    {
      className: 'guided-panel',
      attributes: { [GUIDED_PANEL_ATTRIBUTE]: EQUIPMENT_STEP_PANEL },
    },
    [
      element('h2', { text: 'Confirm starting equipment' }),
      element('p', {
        text:
          'Each source below grants one equipment package. Weapons and ' +
          'armour from the confirmed package become tracked items on the ' +
          'character.',
      }),
      // D65's disclosure, in the same terms the sheet uses: gear renders
      // from the rules and is never owned; no gold is granted (D56).
      element('p', {
        className: 'guided-equipment-not-itemised',
        attributes: { [EQUIPMENT_STEP_ATTR.notItemised]: '' },
        text:
          'Gear is not tracked individually: the package’s other contents ' +
          'are shown from the rules and cannot be edited or spent. No gold ' +
          'is granted — equipment is the package only, with no gold ' +
          'alternative.',
      }),
      ...sections,
      ...(deps.state.complete
        ? [
            element('p', {
              className: 'guided-equipment-complete',
              attributes: { [EQUIPMENT_STEP_ATTR.complete]: '' },
              text:
                'Both equipment packages are recorded. Every level 1 step ' +
                'is complete.',
            }),
            ...(backupHint?.element === null ||
            backupHint?.element === undefined
              ? []
              : [backupHint.element]),
          ]
        : []),
      errorMount,
      characterListLink(),
    ],
  );

  return {
    element: guidedShell('equipment', panel, deps.characterId),
    cleanup: () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    },
  };
}
