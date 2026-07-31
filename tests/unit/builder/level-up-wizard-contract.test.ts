import { describe, expect, it } from 'vitest';
import {
  LEVEL_UP_PANEL,
  LEVEL_UP_RPC,
  LEVEL_UP_STEP_ORDER,
  LEVEL_UP_WARNING_KEYS,
  levelUpPath,
  levelUpWarningPresentation,
  matchesLevelUpRoute,
} from '../../../src/builder/contracts';

describe('level-up wizard seam', () => {
  it('pins the plan-ordered steps', () => {
    expect(LEVEL_UP_STEP_ORDER).toEqual([
      'class',
      'gains',
      'subclass',
      'feat',
      'epic_boon',
      'skills',
      'expertise',
      'spells',
      'review',
      'complete',
    ]);
  });

  it('pins the three read/preview RPC names', () => {
    expect(LEVEL_UP_RPC).toEqual({
      state: 'queries.characters.levelUpState',
      plannedEligibleSpells:
        'queries.characters.levelUpPlannedEligibleSpells',
      preview: 'queries.characters.previewLevelUp',
    });
  });

  it('round-trips only the exact positive-integer route', () => {
    expect(levelUpPath(42)).toBe('/characters/42/level-up');
    expect(matchesLevelUpRoute(levelUpPath(42))).toBe(42);
    for (const invalid of [
      '/characters/0/level-up',
      '/characters/-1/level-up',
      '/characters/42/level-up/',
      '/characters/42/planner',
    ]) {
      expect(matchesLevelUpRoute(invalid), invalid).toBeNull();
    }
  });

  it('pins one panel per route state and step', () => {
    expect(LEVEL_UP_PANEL).toEqual({
      notFound: 'not-found',
      maximumLevel: 'maximum-level',
      class: 'class',
      gains: 'gains',
      subclass: 'subclass',
      feat: 'feat',
      epicBoon: 'epic-boon',
      skills: 'skills',
      expertise: 'expertise',
      spells: 'spells',
      review: 'review',
      complete: 'complete',
    });
  });

  it('provides one presentation lookup for every warning key', () => {
    const values = Object.values(LEVEL_UP_WARNING_KEYS);
    expect(values).toHaveLength(13);
    expect(new Set(values).size).toBe(values.length);
    for (const key of values) {
      expect(levelUpWarningPresentation(key)).toMatchObject({ key });
      expect(levelUpWarningPresentation(key).title).not.toBe('');
    }
  });
});
