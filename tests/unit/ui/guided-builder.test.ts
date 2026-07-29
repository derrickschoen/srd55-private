import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BACKGROUND_STEP_ATTR,
  MAGIC_INITIATE_FEAT_CONTENT_KEY,
  type GuidedBackgroundChoiceOptions,
} from '../../../src/builder/background-choices';
import {
  GUIDED_CHARACTER_ID_PATTERN,
  GUIDED_LEVEL_ONE_STEP_ORDER,
  GUIDED_NEW_ROUTE,
  GUIDED_PANEL,
  GUIDED_PANEL_ATTRIBUTE,
  GUIDED_RPC,
  LINEAGE_SPELL_SPECIES_CONTENT_KEYS,
  guidedBuildPath,
  matchesGuidedBuildRoute,
  type GuidedBuildStateResult,
  type GuidedClassOption,
  type GuidedOriginOption,
} from '../../../src/builder/contracts';
import type { CharacterRow } from '../../../src/domain/models';
import { RpcError } from '../../../src/rpc/protocol';
import { parseRoute } from '../../../src/ui/router';
import {
  createBackgroundStep,
} from '../../../src/ui/screens/guided-builder/background-step';
import {
  createClassChooser,
  guidedBuildPath as chooserGuidedBuildPath,
  hitDieLabel,
} from '../../../src/ui/screens/guided-builder/class-chooser';
import {
  renderGuidedBuildState,
} from '../../../src/ui/screens/guided-builder/guided-builder';
import { screen } from '../../../src/ui/screens/guided-builder/screen';
import { createSpeciesStep } from '../../../src/ui/screens/guided-builder/species-step';
import { screen as plannerScreen } from '../../../src/ui/screens/planner/screen';
import { rpcRegistry } from '../../../src/worker/registry';
import {
  elementsByTagName,
  elementsWithAttribute,
} from '../../fixtures/minimal-dom';
import {
  elementText,
  installInteractiveDocument,
  interactiveElement,
} from '../../fixtures/interactive-dom';
import {
  createRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';

let restoreDocument: (() => void) | undefined;
let harness: RpcHarness | undefined;

beforeEach(() => {
  restoreDocument = installInteractiveDocument();
});

afterEach(() => {
  restoreDocument?.();
  restoreDocument = undefined;
  harness?.close();
  harness = undefined;
});

function route(path: string) {
  return parseRoute(new URL(path, 'https://guided.test'));
}

function readyAt(stepIndex: number): GuidedBuildStateResult {
  const currentStep = GUIDED_LEVEL_ONE_STEP_ORDER[stepIndex];
  if (currentStep === undefined) {
    throw new Error(`The seam has no guided step at index ${stepIndex}.`);
  }
  return {
    kind: 'ready',
    character_id: 1,
    current_step: currentStep,
  };
}

function expectNoPlannerLinks(view: HTMLElement): void {
  for (const anchor of elementsByTagName(view, 'a')) {
    const href = anchor.getAttribute('href');
    expect(href).not.toBeNull();
    if (href !== null) {
      expect(plannerScreen.matches(route(href))).toBe(false);
    }
  }
}

function typescriptFilesUnder(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return typescriptFilesUnder(path);
    }
    return entry.isFile() && entry.name.endsWith('.ts') ? [path] : [];
  });
}

describe('guided-builder route matching', () => {
  it('matches the seam-defined new-character route', () => {
    expect(screen.matches(route(GUIDED_NEW_ROUTE))).toBe(true);
  });

  it('pins the build-route id grammar to positive canonical integers', () => {
    expect(GUIDED_CHARACTER_ID_PATTERN.test(String(1))).toBe(true);
    expect(GUIDED_CHARACTER_ID_PATTERN.test(String(0))).toBe(false);
    expect(GUIDED_CHARACTER_ID_PATTERN.test('007')).toBe(false);
  });

  it('round-trips every written build route through the seam matcher without changing its id', () => {
    for (const characterId of [1, 47, Number.MAX_SAFE_INTEGER]) {
      const path = guidedBuildPath(characterId);
      const parsed = route(path);

      expect(matchesGuidedBuildRoute(parsed.segments)).toBe(characterId);
      expect(chooserGuidedBuildPath(characterId)).toBe(path);
    }
  });
});

function option(
  contentKey: string,
  name: string,
  hitDie: number | null,
): GuidedClassOption {
  return { content_key: contentKey, name, hit_die: hitDie };
}

function firstClassCard(view: HTMLElement) {
  const card = interactiveElement(view).querySelector(
    '[data-class-option]',
  );
  if (card === null) {
    throw new Error('The chooser rendered no class card.');
  }
  return card;
}

async function submitChooser(view: HTMLElement, name: string): Promise<void> {
  firstClassCard(view).click();
  const input = interactiveElement(view).querySelector('input');
  const form = interactiveElement(view).querySelector('form');
  if (input === null || form === null) {
    throw new Error('Selecting a class did not construct the name form.');
  }
  input.value = name;
  input.dispatchEvent(new Event('input'));
  form.dispatchEvent(new Event('submit', { cancelable: true }));
  await new Promise<void>((resolve) => {
    queueMicrotask(resolve);
  });
  await new Promise<void>((resolve) => {
    queueMicrotask(resolve);
  });
}

async function refusedGuidedCreate(
  rpcHarness: RpcHarness,
  name: string,
  classContentKey: string,
): Promise<CharacterRow> {
  const response = await rpcRegistry.dispatch(
    {
      id: 1,
      method: GUIDED_RPC.create,
      params: {
        name,
        class_content_key: classContentKey,
      },
    },
    rpcHarness.context,
  );
  if (!response.ok) {
    throw new RpcError(
      response.error.code,
      response.error.message,
      response.error.data,
    );
  }
  throw new Error('The refusal scenario unexpectedly created a character.');
}

describe('guided class chooser', () => {
  it('does not put a name input in the DOM until a class has been chosen', () => {
    const chooser = createClassChooser({
      options: [option('test:class:sentinel', 'Sentinel', 10)],
      createGuided: () => Promise.reject(new Error('not submitted')),
      navigate: () => undefined,
    });

    expect(chooser.element.querySelector('input')).toBeNull();

    firstClassCard(chooser.element).click();

    expect(chooser.element.querySelector('input')).not.toBeNull();
    chooser.cleanup();
  });

  it('renders a null hit die as unknown in the pure label and on the class card without inventing 8', () => {
    expect(hitDieLabel(null)).toBe('Hit die: unknown');

    const chooser = createClassChooser({
      options: [option('test:class:unrecorded-die', 'Unrecorded Die', null)],
      createGuided: () => Promise.reject(new Error('not submitted')),
      navigate: () => undefined,
    });
    const cardText = elementText(firstClassCard(chooser.element) as unknown as Node);

    expect(cardText).toContain('Hit die: unknown');
    expect(cardText).not.toContain('8');
    chooser.cleanup();
  });

  it('explains the real homebrew-class refusal honestly and does not navigate', async () => {
    harness = await createRpcHarness([]);
    const contentKey = 'test:class:homebrew-refusal';
    harness.context.db.exec(
      `INSERT INTO class_definitions (content_key, name, rules_edition)
       VALUES (?, ?, ?)`,
      [contentKey, 'Homebrew Refusal Class', '2024'],
    );
    const navigations: string[] = [];
    const chooser = createClassChooser({
      options: [option(contentKey, 'Homebrew Refusal Class', null)],
      createGuided: (name, selectedKey) =>
        refusedGuidedCreate(harness!, name, selectedKey),
      navigate: (path) => navigations.push(path),
    });

    await submitChooser(chooser.element, 'Refused Homebrew');

    expect(elementText(chooser.element)).toMatch(
      /not part of the bundled rules.*refuses to guide homebrew classes.*No character was created\./,
    );
    expect(navigations).toEqual([]);
    chooser.cleanup();
  });

  it('explains the real absent-class refusal honestly and does not navigate', async () => {
    harness = await createRpcHarness([]);
    const contentKey = 'test:class:absent-refusal';
    const navigations: string[] = [];
    const chooser = createClassChooser({
      options: [option(contentKey, 'Absent Refusal Class', null)],
      createGuided: (name, selectedKey) =>
        refusedGuidedCreate(harness!, name, selectedKey),
      navigate: (path) => navigations.push(path),
    });

    await submitChooser(chooser.element, 'Refused Unknown');

    expect(elementText(chooser.element)).toMatch(
      /not available in this database.*no character was created.*Reload the page/,
    );
    expect(navigations).toEqual([]);
    chooser.cleanup();
  });
});

describe('guided-builder panels', () => {
  it('renders only the classless panel for a character with no class and never links to the planner', () => {
    const view = renderGuidedBuildState(readyAt(0));

    expect(
      elementsWithAttribute(
        view,
        GUIDED_PANEL_ATTRIBUTE,
        GUIDED_PANEL.classless,
      ),
    ).toHaveLength(1);
    expect(
      elementsWithAttribute(
        view,
        GUIDED_PANEL_ATTRIBUTE,
        GUIDED_PANEL.stepNotBuilt,
      ),
    ).toHaveLength(0);
    expectNoPlannerLinks(view);
  });

  it('renders only the terminal panel for the next unbuilt step and never links to the planner', () => {
    const view = renderGuidedBuildState(readyAt(1));

    expect(
      elementsWithAttribute(
        view,
        GUIDED_PANEL_ATTRIBUTE,
        GUIDED_PANEL.stepNotBuilt,
      ),
    ).toHaveLength(1);
    expect(
      elementsWithAttribute(
        view,
        GUIDED_PANEL_ATTRIBUTE,
        GUIDED_PANEL.classless,
      ),
    ).toHaveLength(0);
    expectNoPlannerLinks(view);
  });
});

function originOption(
  contentKey: string,
  name: string,
  grantsLineageSpells: boolean,
): GuidedOriginOption {
  return {
    content_key: contentKey,
    name,
    grants_lineage_spells: grantsLineageSpells,
  };
}

function lineageKeyEndingIn(suffix: string): string {
  const key = [...LINEAGE_SPELL_SPECIES_CONTENT_KEYS].find((candidate) =>
    candidate.endsWith(suffix),
  );
  if (key === undefined) {
    throw new Error(`The seam lineage set has no key ending in ${suffix}.`);
  }
  return key;
}

describe('guided species step', () => {
  it('does not retain the deleted abilities-skipped disclosure', () => {
    const step = createSpeciesStep({
      characterId: 1,
      options: [],
      applyOrigin: () => Promise.reject(new Error('not submitted')),
      navigate: () => undefined,
    });

    expect(elementText(step.element)).not.toContain('abilities step is not built');
    expect(elementText(step.element)).not.toContain('no scores have been asked');
    step.cleanup();
  });

  it('names every unmade Elf choice required by the plan', () => {
    const elfKey = lineageKeyEndingIn(':species:elf');
    const step = createSpeciesStep({
      characterId: 1,
      options: [originOption(elfKey, 'Elf', true)],
      applyOrigin: () => Promise.reject(new Error('not submitted')),
      navigate: () => undefined,
    });
    const text = elementText(step.element);

    expect(text).toContain(
      'Required choices this step cannot make yet — applying this species records none of them:',
    );
    expect(text).toContain('an Elven Lineage (Drow, High Elf, or Wood Elf)');
    expect(text).toContain(
      'a spellcasting ability for its spells (Intelligence, Wisdom, or Charisma)',
    );
    // The Keen Senses entry is DELETED, not reworded (skills-with-provenance
    // S-C): the choice is a tracked grant the skills step makes choosable, so
    // disclosing it as unmakeable here would be false.
    expect(text).not.toContain('a Keen Senses skill');
    step.cleanup();
  });

  it('says Elf and Gnome lineage spells arrive when their unchosen lineage does', () => {
    const options = [
      originOption(lineageKeyEndingIn(':species:elf'), 'Elf', true),
      originOption(lineageKeyEndingIn(':species:gnome'), 'Gnome', true),
      originOption(lineageKeyEndingIn(':species:tiefling'), 'Tiefling', true),
    ];
    const step = createSpeciesStep({
      characterId: 1,
      options,
      applyOrigin: () => Promise.reject(new Error('not submitted')),
      navigate: () => undefined,
    });

    const cards = interactiveElement(step.element)
      .querySelectorAll('li')
      .filter((element) => element.className === 'guided-species-card');
    const cardText = (speciesName: string): string => {
      const card = cards.find((candidate) =>
        elementText(candidate as unknown as Node).includes(speciesName),
      );
      if (card === undefined) {
        throw new Error(`The species step has no ${speciesName} card.`);
      }
      return elementText(card as unknown as Node);
    };

    expect(cardText('Elf')).toMatch(
      /lineage spells.*arrive.*choose.*lineage/i,
    );
    expect(cardText('Gnome')).toMatch(
      /lineage spells.*arrive.*choose.*lineage/i,
    );
    expect(cardText('Tiefling')).not.toMatch(
      /lineage spells.*arrive.*choose.*lineage/i,
    );
    step.cleanup();
  });

  it('renders the seam species panel without any link into the planner', () => {
    const step = createSpeciesStep({
      characterId: 1,
      options: [
        originOption(
          lineageKeyEndingIn(':species:elf'),
          'Elf',
          true,
        ),
      ],
      applyOrigin: () => Promise.reject(new Error('not submitted')),
      navigate: () => undefined,
    });

    expect(
      elementsWithAttribute(
        step.element,
        GUIDED_PANEL_ATTRIBUTE,
        GUIDED_PANEL.speciesStep,
      ),
    ).toHaveLength(1);
    expectNoPlannerLinks(step.element);
    step.cleanup();
  });
});

describe('guided background step', () => {
  const backgroundChoices: GuidedBackgroundChoiceOptions = {
    backgrounds: [
      {
        content_key: 'test:background:honesty',
        name: 'Honesty Background',
        pairing: {
          background_name: 'Honesty Background',
          printed_abilities: ['Intelligence', 'Wisdom', 'Charisma'],
          printed_feat: 'Magic Initiate (Cleric)',
          suggested_abilities: ['intelligence', 'wisdom', 'charisma'],
          suggested_feat_content_key: MAGIC_INITIATE_FEAT_CONTENT_KEY,
          suggested_magic_initiate_list: 'Cleric',
        },
      },
    ],
    origin_feats: [
      {
        content_key: MAGIC_INITIATE_FEAT_CONTENT_KEY,
        name: 'Magic Initiate',
      },
      {
        content_key: '2024:feat:lucky',
        name: 'Lucky',
      },
    ],
  };

  it('B3-HONESTY says what background apply now does and discloses only the three remaining gaps', () => {
    const step = createBackgroundStep({
      characterId: 1,
      options: backgroundChoices,
      applyBackground: () => Promise.reject(new Error('not submitted')),
      navigate: () => undefined,
    });
    const text = elementText(step.element);
    const disclosure = elementsByTagName(step.element, 'div').find(
      (element) => element.className === 'guided-background-unapplied',
    );
    if (disclosure === undefined) {
      throw new Error('The background step rendered no unapplied disclosure.');
    }
    const disclosureList = disclosure.children.find(
      (element) => element.tagName === 'ul',
    );
    if (disclosureList === undefined) {
      throw new Error('The unapplied disclosure rendered no list.');
    }
    const unapplied = disclosureList.children.map((element) =>
      elementText(element as unknown as Node),
    );

    expect(text).toContain(
      'Choosing a background records its printed text, applies your ability ' +
        'increases as additions on top of the scores you allocated, and adds ' +
        'your chosen Origin feat to the character.',
    );
    // D68: nothing on this step may call the player's feat/increase choice a
    // house rule, homebrew, or a departure.
    expect(text).not.toMatch(/house rule|homebrew|departure/i);
    // RETARGETED WITH E-B: the equipment entry's "not built yet" clause
    // expired when the equipment step was built; the disclosure now points
    // at the step instead of at a gap.
    expect(unapplied).toEqual([
      'the two skill proficiencies',
      'the tool proficiency',
      'the starting equipment package — equipment is the package only, with ' +
        'no gold alternative, and the package is chosen and applied at the ' +
        'equipment step',
    ]);
    step.cleanup();
  });

  it('renders the seam background panel without any link into the planner', () => {
    const step = createBackgroundStep({
      characterId: 1,
      options: backgroundChoices,
      applyBackground: () => Promise.reject(new Error('not submitted')),
      navigate: () => undefined,
    });

    expect(
      elementsWithAttribute(
        step.element,
        GUIDED_PANEL_ATTRIBUTE,
        GUIDED_PANEL.backgroundStep,
      ),
    ).toHaveLength(1);
    expectNoPlannerLinks(step.element);
    step.cleanup();
  });

  it('marks the printed pairing as the background default and never labels a change (D68)', () => {
    const step = createBackgroundStep({
      characterId: 1,
      options: backgroundChoices,
      applyBackground: () => Promise.reject(new Error('not submitted')),
      navigate: () => undefined,
    });
    const background = elementsWithAttribute(
      step.element,
      BACKGROUND_STEP_ATTR.option,
      'test:background:honesty',
    )[0];
    if (background === undefined) {
      throw new Error('The background option was not rendered.');
    }
    const backgroundInput = interactiveElement(
      background as unknown as Node,
    );
    backgroundInput.checked = true;
    backgroundInput.dispatchEvent(new Event('change'));

    // The pairing line identifies the printed pairing as the BACKGROUND'S OWN
    // default — never as a rule and never as anything the player deviates from.
    const suggestion = elementsWithAttribute(
      step.element,
      BACKGROUND_STEP_ATTR.suggestion,
      '',
    )[0];
    if (suggestion === undefined) {
      throw new Error('The printed-default line was not rendered.');
    }
    const suggestionText = elementText(suggestion as unknown as Node);
    expect(suggestionText).toContain("Honesty Background's printed default");
    expect(suggestionText).toContain('Intelligence, Wisdom, Charisma');
    expect(suggestionText).toContain('Magic Initiate (Cleric)');

    // The feat select marks exactly the printed feat as the default and
    // preselects it; the other feats carry no mark.
    const feat = elementsWithAttribute(
      step.element,
      BACKGROUND_STEP_ATTR.feat,
      '',
    )[0];
    if (feat === undefined) {
      throw new Error('The Origin feat selector was not rendered.');
    }
    const featOptionText = (contentKey: string): string => {
      const option = elementsByTagName(feat as unknown as Node, 'option').find(
        (candidate) => candidate.getAttribute('value') === contentKey,
      );
      if (option === undefined) {
        throw new Error(`No Origin feat option for ${contentKey}.`);
      }
      return elementText(option as unknown as Node);
    };
    expect(featOptionText(MAGIC_INITIATE_FEAT_CONTENT_KEY)).toBe(
      'Magic Initiate (default)',
    );
    expect(featOptionText('2024:feat:lucky')).toBe('Lucky');

    // Each ability select marks exactly the three printed abilities.
    const slot = elementsWithAttribute(
      step.element,
      BACKGROUND_STEP_ATTR.increaseAbility,
      '0',
    )[0];
    if (slot === undefined) {
      throw new Error('The first increase select was not rendered.');
    }
    const abilityLabels = elementsByTagName(
      slot as unknown as Node,
      'option',
    ).map((option) => elementText(option as unknown as Node));
    expect(abilityLabels).toContain('Intelligence (default)');
    expect(abilityLabels).toContain('Wisdom (default)');
    expect(abilityLabels).toContain('Charisma (default)');
    expect(abilityLabels).toContain('Strength');
    expect(abilityLabels).not.toContain('Strength (default)');

    // Leaving the default is ordinary use: after choosing a different feat,
    // the defaults stay marked and NOTHING labels the choice a house rule,
    // homebrew, or a departure (D68).
    const featSelect = interactiveElement(feat as unknown as Node);
    featSelect.value = '2024:feat:lucky';
    featSelect.dispatchEvent(new Event('change'));
    expect(featOptionText(MAGIC_INITIATE_FEAT_CONTENT_KEY)).toBe(
      'Magic Initiate (default)',
    );
    expect(elementText(step.element)).not.toMatch(
      /house rule|homebrew|departure/i,
    );
    step.cleanup();
  });
});

describe('D48 guided-flow browser-storage ban', () => {
  it('contains no direct local-storage or session-storage access', () => {
    const guidedDirectory = fileURLToPath(
      new URL('../../../src/ui/screens/guided-builder/', import.meta.url),
    );
    const guidedSources = [
      fileURLToPath(
        new URL('../../../src/builder/contracts.ts', import.meta.url),
      ),
      fileURLToPath(
        new URL('../../../src/builder/guided-creation.ts', import.meta.url),
      ),
      fileURLToPath(
        new URL('../../../src/worker/handlers/guided.ts', import.meta.url),
      ),
      fileURLToPath(
        new URL('../../../src/queries/client.ts', import.meta.url),
      ),
      ...typescriptFilesUnder(guidedDirectory),
    ];

    for (const source of guidedSources) {
      const contents = readFileSync(source, 'utf8');
      expect(contents).not.toMatch(/(?:local|session)Storage/);
    }
  });
});
