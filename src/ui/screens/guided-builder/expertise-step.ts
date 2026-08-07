import {
  guidedBuildPath,
  GUIDED_PANEL,
  GUIDED_PANEL_ATTRIBUTE,
  type GuidedExpertiseStepState,
} from '../../../builder/contracts';
import type { Skill } from '../../../domain/enums';
import { SKILL_LABELS } from '../../../rules/skills';
import { element, listen, type Cleanup } from '../../dom';
import { characterListLink, guidedShell } from './guided-builder';
import { catalogLayerLabel } from '../../../catalog/catalog-disclosure';

export function createExpertiseStep(options: {
  readonly characterId: number;
  readonly state: GuidedExpertiseStepState;
  readonly fill: (
    grantId: number,
    skill: Skill,
    operationUuid: string,
  ) => Promise<unknown>;
  readonly navigate: (path: string) => void;
}): { readonly element: HTMLElement; readonly cleanup: Cleanup } {
  const cleanups: Cleanup[] = [];
  const choices = options.state.choices.map((choice) => {
    const label =
      `${choice.source_name} — ` +
      `${catalogLayerLabel(choice.source_catalog_layer)} Expertise ` +
      String(choice.ordinal);
    const select = element(
      'select',
      { attributes: { 'aria-label': label } },
      [
        element('option', {
          text: 'Choose a proficient skill',
          attributes: { value: '' },
        }),
        ...choice.available.map((skill) =>
          element('option', {
            text: SKILL_LABELS[skill],
            attributes: { value: skill },
          }),
        ),
      ],
    );
    const button = element('button', {
      text: `Choose ${label}`,
      attributes: { type: 'button', 'data-expertise-fill': String(choice.grant_id) },
    });
    cleanups.push(
      listen(button, 'click', () => {
        if (select.value === '') return;
        button.disabled = true;
        void options
          .fill(
            choice.grant_id,
            select.value as Skill,
            crypto.randomUUID(),
          )
          .then(() => options.navigate(guidedBuildPath(options.characterId)))
          .catch(() => {
            button.disabled = false;
          });
      }),
    );
    return element('div', { className: 'guided-expertise-choice' }, [
      element('label', {}, [element('span', { text: label }), select]),
      button,
    ]);
  });
  const panel = element(
    'section',
    {
      className: 'guided-panel',
      attributes: {
        [GUIDED_PANEL_ATTRIBUTE]: GUIDED_PANEL.expertiseStep,
      },
    },
    [
      element('h2', { text: 'Choose Expertise' }),
      element('p', {
        text:
          'Expertise is offered only after every class, species, and ' +
          'background skill source is settled. Choose from skills in which ' +
          'this character is proficient.',
      }),
      ...choices,
      characterListLink(),
    ],
  );
  return {
    element: guidedShell('expertise', panel),
    cleanup: () => cleanups.forEach((cleanup) => cleanup()),
  };
}
