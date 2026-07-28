import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  GUIDED_CHARACTER_ID_PATTERN,
  GUIDED_LEVEL_ONE_STEP_ORDER,
  GUIDED_NEW_ROUTE,
  GUIDED_PANEL,
  GUIDED_PANEL_ATTRIBUTE,
  type GuidedBuildStateResult,
} from '../../../src/builder/contracts';
import { parseRoute } from '../../../src/ui/router';
import {
  renderGuidedBuildState,
} from '../../../src/ui/screens/guided-builder/guided-builder';
import { screen } from '../../../src/ui/screens/guided-builder/screen';
import { screen as plannerScreen } from '../../../src/ui/screens/planner/screen';
import {
  elementsByTagName,
  elementsWithAttribute,
  installMinimalDocument,
} from '../../fixtures/minimal-dom';

let restoreDocument: (() => void) | undefined;

beforeEach(() => {
  restoreDocument = installMinimalDocument();
});

afterEach(() => {
  restoreDocument?.();
  restoreDocument = undefined;
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

describe('guided-builder route matching', () => {
  it('matches the seam-defined new-character route', () => {
    expect(screen.matches(route(GUIDED_NEW_ROUTE))).toBe(true);
  });

  it('pins the build-route id grammar to positive canonical integers', () => {
    expect(GUIDED_CHARACTER_ID_PATTERN.test(String(1))).toBe(true);
    expect(GUIDED_CHARACTER_ID_PATTERN.test(String(0))).toBe(false);
    expect(GUIDED_CHARACTER_ID_PATTERN.test('007')).toBe(false);
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

describe('D48 guided-flow browser-storage ban', () => {
  it('contains no direct local-storage or session-storage access', () => {
    const guidedSources = [
      '../../../src/builder/contracts.ts',
      '../../../src/builder/guided-creation.ts',
      '../../../src/worker/handlers/guided.ts',
      '../../../src/queries/client.ts',
      '../../../src/ui/screens/guided-builder/screen.ts',
      '../../../src/ui/screens/guided-builder/guided-builder.ts',
    ];

    for (const source of guidedSources) {
      const contents = readFileSync(new URL(source, import.meta.url), 'utf8');
      expect(contents).not.toMatch(/(?:local|session)Storage/);
    }
  });
});
