/**
 * THE SKILLS STEP — dispatch S-C of
 * `docs/design/2026-07-29-skills-with-provenance.md` (§3.3, §3.7, §4).
 *
 * What this step is, stated so no rewrite can drift from it:
 *
 * - A person fills EXACTLY THEIR CHOICE GRANTS, each addressed by its own
 *   `grant_id` through the seam's `fillSkillGrant` — never "whichever grant
 *   is unfilled", which is §5's second trap (right totals, wrong provenance).
 * - Background and species skills that are already FILLED are shown as
 *   ALREADY GRANTED, with their source named, and are not choosable. A
 *   background's printed skills are facts and carry no clear control; a
 *   choice the person made here (class or species) can be cleared to change
 *   their mind — §3.3's null-selection CLEAR, the same operation the
 *   background-collision remedy relies on.
 * - THE STEP ADVANCES ONLY WHEN EVERY CLASS ORDINAL IS FILLED. The exit is
 *   not "the step advances": a Fighter with a background that granted two
 *   skills still owes two class choices, because a held skill never pays off
 *   a grant — it only leaves each grant's available list (§3.3).
 * - SPECIES CHOICES (Elf Keen Senses, Human Skillful) are choosable here —
 *   the species screen's unmade-choice disclosure was deleted because this
 *   step exists — but they never gate advancement (§4 pins class ordinals as
 *   the gate, and a species pool exhausted by other sources must not strand
 *   the step). An unfilled species choice stays visible in the planner's
 *   outstanding list.
 * - THE TWO §3.7 DISCLOSURES RENDER HERE, from result data, never inference:
 *   a source with an unconsumed `skill_proficiency` rule (the Skilled feat)
 *   and the level-1 Rogue's unmodelled Expertise both get a named sentence.
 * - §5's trap: nothing here links into the planner grid. Every successful
 *   write re-navigates to the build route, which re-derives the step from
 *   the database.
 */

import {
  guidedBuildPath,
  GUIDED_PANEL,
  GUIDED_PANEL_ATTRIBUTE,
  SKILL_STEP_ATTR,
  type GuidedFillSkillGrantResult,
  type GuidedSkillsStepState,
} from '../../../builder/contracts';
import type { Skill } from '../../../domain/enums';
import { SKILL_LABELS } from '../../../rules/skills';
import { RpcError } from '../../../rpc/protocol';
import { clear, element, listen, type Cleanup } from '../../dom';
import { characterListLink, guidedShell } from './guided-builder';
import { catalogLayerLabel } from '../../../catalog/catalog-disclosure';
import type { CatalogLayerDisclosure } from '../../../catalog/catalog-disclosure';
import { catalogControlDescription } from '../../catalog-control-disclosure';

/**
 * The seam's `SkillGrantRefusalData` on the wire: `handler_error` with a
 * structured reason. Translated to a sentence a person can act on; anything
 * else falls through to the raw message.
 */
export function fillSkillGrantRefusalMessage(error: unknown): string | null {
  if (!(error instanceof RpcError) || error.code !== 'handler_error') {
    return null;
  }
  const data: unknown = error.data;
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return null;
  }
  const record = data as Record<string, unknown>;
  const reason = record['reason'];
  const skill = record['skill'];
  const skillLabel =
    typeof skill === 'string' && skill in SKILL_LABELS
      ? SKILL_LABELS[skill as Skill]
      : null;
  switch (reason) {
    case 'grant_not_found':
      return (
        'That skill choice no longer exists on this character. Reload the ' +
        'page to refresh the step.'
      );
    case 'grant_already_filled':
      return (
        'That choice is already made. Clear it first if you want to change ' +
        'it.'
      );
    case 'skill_not_in_pool':
      return skillLabel === null
        ? 'That skill is not in this choice’s list.'
        : `${skillLabel} is not in this choice’s list.`;
    case 'skill_already_held':
      return skillLabel === null
        ? 'You already have that skill from another source.'
        : `You already have ${skillLabel} from another source, so choosing ` +
            'it again would waste this choice.';
    default:
      return null;
  }
}

/** The human word for a grant key, shown beside the source name. */
function grantKeyLabel(grantKey: string): string {
  switch (grantKey) {
    case 'class_skill':
      return 'class skill';
    case 'multiclass_skill':
      return 'multiclass skill';
    case 'background_skill':
      return 'background skill';
    case 'species_keen_senses':
      return 'Keen Senses';
    case 'species_skillful':
      return 'Skillful';
    default:
      return 'skill grant';
  }
}

export interface SkillsStepDeps {
  readonly characterId: number;
  readonly state: GuidedSkillsStepState;
  readonly fillSkillGrant: (
    grantId: number,
    skill: Skill | null,
    operationUuid: string,
  ) => Promise<GuidedFillSkillGrantResult>;
  readonly navigate: (path: string) => void;
}

export interface SkillsStep {
  readonly element: HTMLElement;
  readonly cleanup: Cleanup;
}

export function createSkillsStep(deps: SkillsStepDeps): SkillsStep {
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

  const write = async (grantId: number, skill: Skill | null): Promise<void> => {
    if (inFlight) {
      return;
    }
    // The same UI-only double-submit guard every guided step uses: disable
    // before the await, re-enable only on failure.
    inFlight = true;
    setError(null);
    setControlsDisabled(true);
    try {
      await deps.fillSkillGrant(grantId, skill, crypto.randomUUID());
      // The grant is written; the build route re-derives the step from the
      // database — this same step with the choice recorded, or whatever
      // comes next once every class ordinal is filled.
      deps.navigate(guidedBuildPath(deps.characterId));
    } catch (error) {
      setError(
        fillSkillGrantRefusalMessage(error) ??
          (error instanceof Error ? error.message : String(error)),
      );
      inFlight = false;
      setControlsDisabled(false);
    }
  };

  const grantedSection = (): readonly HTMLElement[] => {
    if (deps.state.granted.length === 0) {
      return [];
    }
    return [
      element('h3', { text: 'Already granted' }),
      element(
        'ul',
        {
          className: 'guided-skills-granted',
          attributes: { 'aria-label': 'Skills already granted' },
        },
        deps.state.granted.map((grant) => {
          const children: HTMLElement[] = [
            element('span', {
              text:
                `${SKILL_LABELS[grant.skill]} — ${grant.source_name} ` +
                `— ${catalogLayerLabel(grant.source_catalog_layer)} ` +
                `(${grantKeyLabel(grant.grant_key)})`,
            }),
          ];
          if (grant.clearable) {
            const clearButton = element('button', {
              className: 'guided-skill-clear',
              text: `Clear ${SKILL_LABELS[grant.skill]}`,
              attributes: {
                type: 'button',
                [SKILL_STEP_ATTR.clear]: String(grant.grant_id),
              },
            });
            controls.push(clearButton);
            cleanups.push(
              listen(clearButton, 'click', () =>
                void write(grant.grant_id, null),
              ),
            );
            children.push(clearButton);
          }
          return element(
            'li',
            {
              className: 'guided-skill-granted',
              attributes: { [SKILL_STEP_ATTR.granted]: grant.skill },
            },
            children,
          );
        }),
      ),
    ];
  };

  const choiceForm = (options: {
    readonly grantId: number;
    readonly heading: string;
    readonly catalogLayer: CatalogLayerDisclosure;
    readonly available: readonly Skill[];
  }): HTMLElement => {
    const grantKey = String(options.grantId);
    const select = element(
      'select',
      {
        attributes: {
          [SKILL_STEP_ATTR.select]: grantKey,
          'aria-label': options.heading,
        },
      },
      [
        element('option', {
          text: 'Choose a skill',
          attributes: { value: '' },
        }),
        ...options.available.map((skill) =>
          element('option', {
            text: SKILL_LABELS[skill],
            attributes: { value: skill },
          }),
        ),
      ],
    );
    const fill = element('button', {
      className: 'guided-skill-fill',
      text: `Choose ${options.heading}`,
      attributes: {
        type: 'button',
        [SKILL_STEP_ATTR.fill]: grantKey,
      },
    });
    const disclosureId = `guided-skill-choice-${grantKey}-catalog-layer`;
    const disclosure = catalogControlDescription(
      select,
      disclosureId,
      options.catalogLayer,
    );
    fill.setAttribute('aria-describedby', disclosureId);
    if (options.available.length === 0) {
      select.disabled = true;
      fill.disabled = true;
    } else {
      controls.push(fill);
    }
    cleanups.push(
      listen(fill, 'click', () => {
        const skill = select.value;
        if (skill === '') {
          return;
        }
        void write(options.grantId, skill as Skill);
      }),
    );
    const children: HTMLElement[] = [
      element('label', { className: 'guided-skill-choice-label' }, [
        element('span', { text: options.heading }),
        select,
      ]),
      disclosure,
      fill,
    ];
    if (options.available.length === 0) {
      // The degenerate case the plan names: no obligation with an empty
      // remedy. Say WHY the list is empty rather than showing a dead picker.
      children.push(
        element('p', {
          className: 'guided-skill-choice-empty',
          text:
            'Every skill this choice offers is already held from another ' +
            'source, so there is nothing left to pick. Clearing one of the ' +
            'choices above would free a skill.',
        }),
      );
    }
    return element(
      'div',
      {
        className: 'guided-skill-choice',
        attributes: { [SKILL_STEP_ATTR.choice]: grantKey },
      },
      children,
    );
  };

  const classSection = (): readonly HTMLElement[] => {
    if (deps.state.class_choices.length === 0) {
      return [
        element('p', {
          className: 'guided-skills-class-complete',
          text: 'Every class skill choice is made.',
        }),
      ];
    }
    return [
      element('h3', { text: 'Class skill choices' }),
      element('p', {
        text:
          'These are required: the step completes only when every class ' +
          'choice is made. A skill you already have from your background or ' +
          'species never fills a class choice — it only leaves the list.',
      }),
      ...deps.state.class_choices.map((grant) =>
        choiceForm({
          grantId: grant.grant_id,
          // D33: a vanished class definition renders as unknown, not a guess.
          heading:
            `${grant.class_name ?? 'Unknown class'} skill ` +
            String(grant.ordinal),
          catalogLayer: grant.class_catalog_layer,
          available: grant.available,
        }),
      ),
    ];
  };

  const speciesSection = (): readonly HTMLElement[] => {
    if (deps.state.species_choices.length === 0) {
      return [];
    }
    return [
      element('h3', { text: 'Species skill choice' }),
      element('p', {
        text:
          'Your species grants an optional skill choice of its own. Decide ' +
          'whether to make it before the required class choices below. ' +
          'Skipping it does not hold this step up.',
      }),
      ...deps.state.species_choices.map((grant) =>
        choiceForm({
          grantId: grant.grant_id,
          heading:
            `${grant.source_name} ` +
            `${grantKeyLabel(grant.grant_key)} skill`,
          catalogLayer: grant.source_catalog_layer,
          available: grant.available,
        }),
      ),
    ];
  };

  const disclosures = (): readonly HTMLElement[] => {
    const rendered: HTMLElement[] = [];
    for (const source of deps.state.unmodelled_tool_alternative_sources) {
      rendered.push(
        element('p', {
          className: 'guided-skill-gap',
          attributes: { [SKILL_STEP_ATTR.toolAlternativeGap]: '' },
          text:
            `${source.source_name} — ` +
            `${catalogLayerLabel(source.source_catalog_layer)} allows each ` +
            'remaining choice to be a skill or a tool. ' +
            'No skill is owed for an unrecorded ordinal, and this application ' +
            'does not model tool choices; read the sourced feat text for that ' +
            'unmodelled benefit.',
        }),
      );
    }
    return rendered;
  };

  const panel = element(
    'section',
    {
      className: 'guided-panel',
      attributes: { [GUIDED_PANEL_ATTRIBUTE]: GUIDED_PANEL.skillsStep },
    },
    [
      element('h2', { text: 'Choose skills' }),
      element('p', {
        text:
          'Each choice below belongs to the source that granted it, and is ' +
          'recorded against exactly that source.',
      }),
      ...grantedSection(),
      ...speciesSection(),
      ...classSection(),
      ...disclosures(),
      errorMount,
      characterListLink(),
    ],
  );

  return {
    element: guidedShell('skills', panel, deps.characterId),
    cleanup: () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    },
  };
}
