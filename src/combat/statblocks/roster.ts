import type { ChallengeRating, MonsterStatblock, SourceSpan } from '../statblock';
import { BANDIT_CAPTAIN, GOBLIN_WARRIOR, HOBGOBLIN_WARRIOR, OGRE, PRIEST, PRIEST_ACOLYTE, SKELETON, WOLF, ZOMBIE } from './monsters';

export interface StarterMonsterRosterRow {
  readonly id: string;
  readonly name: string;
  readonly challengeRating: ChallengeRating;
  readonly source: readonly SourceSpan[];
  readonly statblock: MonsterStatblock;
}

export const STARTER_MONSTER_ROSTER = [
  { id: 'statblock:goblin-warrior', name: 'Goblin Warrior', challengeRating: '1/4', source: [{ path: 'docs/srd/full/srd-5.2.1.txt', lineStart: 18985, lineEnd: 19018 }], statblock: GOBLIN_WARRIOR },
  { id: 'statblock:hobgoblin-warrior', name: 'Hobgoblin Warrior', challengeRating: '1/2', source: [{ path: 'docs/srd/full/srd-5.2.1.txt', lineStart: 19540, lineEnd: 19574 }], statblock: HOBGOBLIN_WARRIOR },
  { id: 'statblock:bandit-captain', name: 'Bandit Captain', challengeRating: 2, source: [{ path: 'docs/srd/full/srd-5.2.1.txt', lineStart: 17019, lineEnd: 17053 }], statblock: BANDIT_CAPTAIN },
  { id: 'statblock:ogre', name: 'Ogre', challengeRating: 2, source: [{ path: 'docs/srd/full/srd-5.2.1.txt', lineStart: 20448, lineEnd: 20469 }], statblock: OGRE },
  { id: 'statblock:priest-acolyte', name: 'Priest Acolyte', challengeRating: '1/4', source: [{ path: 'docs/srd/full/srd-5.2.1.txt', lineStart: 20706, lineEnd: 20740 }], statblock: PRIEST_ACOLYTE },
  { id: 'statblock:priest', name: 'Priest', challengeRating: 2, source: [{ path: 'docs/srd/full/srd-5.2.1.txt', lineStart: 20704, lineEnd: 20716 }, { path: 'docs/srd/full/srd-5.2.1.txt', lineStart: 20742, lineEnd: 20766 }], statblock: PRIEST },
  { id: 'statblock:skeleton', name: 'Skeleton', challengeRating: '1/4', source: [{ path: 'docs/srd/full/srd-5.2.1.txt', lineStart: 21374, lineEnd: 21400 }], statblock: SKELETON },
  { id: 'statblock:zombie', name: 'Zombie', challengeRating: '1/4', source: [{ path: 'docs/srd/full/srd-5.2.1.txt', lineStart: 22603, lineEnd: 22635 }], statblock: ZOMBIE },
  { id: 'statblock:wolf', name: 'Wolf', challengeRating: '1/4', source: [{ path: 'docs/srd/full/srd-5.2.1.txt', lineStart: 24033, lineEnd: 24059 }], statblock: WOLF },
] as const satisfies readonly StarterMonsterRosterRow[];
