import type { ChallengeRating, MonsterProvenance, MonsterStatblock, SourceSpan } from '../statblock';
import {
  ARCHELON, BANDIT, BANDIT_CAPTAIN, BERSERKER, BLACK_BEAR, BLOOD_HAWK, BOAR, BROWN_BEAR, BUGBEAR_STALKER, BUGBEAR_WARRIOR,
  CAMEL, CROCODILE, DIRE_WOLF, ELEPHANT, GHAST, GHOUL, GIANT_CONSTRICTOR_SNAKE, GIANT_CROCODILE, GIANT_SCORPION, GIANT_SHARK, GIANT_SPIDER, GOBLIN_BOSS, GOBLIN_MINION, GOBLIN_WARRIOR, GUARD,
  HOBGOBLIN_CAPTAIN, HOBGOBLIN_WARRIOR, KNIGHT, LION, MINOTAUR_SKELETON, OGRE, OGRE_ZOMBIE,
  KILLER_WHALE, POLAR_BEAR, PRIEST, PRIEST_ACOLYTE, SABER_TOOTHED_TIGER, SCOUT, SKELETON, SPECTER, SPY, TIGER,
  TOUGH, WARHORSE_SKELETON, WIGHT, WOLF, ZOMBIE,
} from './monsters';
import { HOMEBREW_BEAST_ROSTER, type HomebrewBeastRosterRow } from './homebrew-beast-families';

export type StarterMonsterFamily = 'goblinoid_warband' | 'undead_crypt' | 'mercenary_company' | 'wild_beasts';

export interface StarterMonsterRosterRow {
  readonly id: string;
  readonly name: string;
  readonly family: StarterMonsterFamily;
  readonly challengeRating: ChallengeRating;
  readonly source: readonly SourceSpan[];
  readonly selectionNote: string | null;
  readonly provenance: Extract<MonsterProvenance, { readonly kind: 'srd_5_2_1_decoded' }>;
  readonly statblock: MonsterStatblock & { readonly provenance: Extract<MonsterProvenance, { readonly kind: 'srd_5_2_1_decoded' }> };
}

const SRD_PATH = 'docs/srd/full/srd-5.2.1.txt' as const;

const SRD_STARTER_MONSTER_ROWS = [
  { id: 'statblock:goblin-minion', name: 'Goblin Minion', family: 'goblinoid_warband', challengeRating: '1/8', source: [{ path: SRD_PATH, lineStart: 18957, lineEnd: 18983 }], selectionNote: null, statblock: GOBLIN_MINION },
  { id: 'statblock:goblin-warrior', name: 'Goblin Warrior', family: 'goblinoid_warband', challengeRating: '1/4', source: [{ path: SRD_PATH, lineStart: 18985, lineEnd: 19018 }], selectionNote: null, statblock: GOBLIN_WARRIOR },
  { id: 'statblock:hobgoblin-warrior', name: 'Hobgoblin Warrior', family: 'goblinoid_warband', challengeRating: '1/2', source: [{ path: SRD_PATH, lineStart: 19540, lineEnd: 19574 }], selectionNote: null, statblock: HOBGOBLIN_WARRIOR },
  { id: 'statblock:goblin-boss', name: 'Goblin Boss', family: 'goblinoid_warband', challengeRating: 1, source: [{ path: SRD_PATH, lineStart: 18957, lineEnd: 18996 }], selectionNote: null, statblock: GOBLIN_BOSS },
  { id: 'statblock:bugbear-warrior', name: 'Bugbear Warrior', family: 'goblinoid_warband', challengeRating: 1, source: [{ path: SRD_PATH, lineStart: 17728, lineEnd: 17761 }], selectionNote: null, statblock: BUGBEAR_WARRIOR },
  { id: 'statblock:ogre', name: 'Ogre', family: 'goblinoid_warband', challengeRating: 2, source: [{ path: SRD_PATH, lineStart: 20448, lineEnd: 20469 }], selectionNote: 'The SRD has seven Goblinoid statblocks in this ladder; Ogre is the closest SRD warband brute.', statblock: OGRE },
  { id: 'statblock:bugbear-stalker', name: 'Bugbear Stalker', family: 'goblinoid_warband', challengeRating: 3, source: [{ path: SRD_PATH, lineStart: 17677, lineEnd: 17720 }], selectionNote: null, statblock: BUGBEAR_STALKER },
  { id: 'statblock:hobgoblin-captain', name: 'Hobgoblin Captain', family: 'goblinoid_warband', challengeRating: 3, source: [{ path: SRD_PATH, lineStart: 19576, lineEnd: 19611 }], selectionNote: null, statblock: HOBGOBLIN_CAPTAIN },

  { id: 'statblock:skeleton', name: 'Skeleton', family: 'undead_crypt', challengeRating: '1/4', source: [{ path: SRD_PATH, lineStart: 21374, lineEnd: 21400 }], selectionNote: null, statblock: SKELETON },
  { id: 'statblock:zombie', name: 'Zombie', family: 'undead_crypt', challengeRating: '1/4', source: [{ path: SRD_PATH, lineStart: 22603, lineEnd: 22635 }], selectionNote: null, statblock: ZOMBIE },
  { id: 'statblock:warhorse-skeleton', name: 'Warhorse Skeleton', family: 'undead_crypt', challengeRating: '1/2', source: [{ path: SRD_PATH, lineStart: 21402, lineEnd: 21426 }], selectionNote: null, statblock: WARHORSE_SKELETON },
  { id: 'statblock:ghoul', name: 'Ghoul', family: 'undead_crypt', challengeRating: 1, source: [{ path: SRD_PATH, lineStart: 18820, lineEnd: 18830 }, { path: SRD_PATH, lineStart: 18860, lineEnd: 18882 }], selectionNote: null, statblock: GHOUL },
  { id: 'statblock:specter', name: 'Specter', family: 'undead_crypt', challengeRating: 1, source: [{ path: SRD_PATH, lineStart: 21482, lineEnd: 21522 }], selectionNote: null, statblock: SPECTER },
  { id: 'statblock:ghast', name: 'Ghast', family: 'undead_crypt', challengeRating: 2, source: [{ path: SRD_PATH, lineStart: 18758, lineEnd: 18782 }, { path: SRD_PATH, lineStart: 18809, lineEnd: 18818 }, { path: SRD_PATH, lineStart: 18820, lineEnd: 18830 }], selectionNote: null, statblock: GHAST },
  { id: 'statblock:minotaur-skeleton', name: 'Minotaur Skeleton', family: 'undead_crypt', challengeRating: 2, source: [{ path: SRD_PATH, lineStart: 21428, lineEnd: 21457 }], selectionNote: null, statblock: MINOTAUR_SKELETON },
  { id: 'statblock:ogre-zombie', name: 'Ogre Zombie', family: 'undead_crypt', challengeRating: 2, source: [{ path: SRD_PATH, lineStart: 22637, lineEnd: 22669 }], selectionNote: null, statblock: OGRE_ZOMBIE },
  { id: 'statblock:wight', name: 'Wight', family: 'undead_crypt', challengeRating: 3, source: [{ path: SRD_PATH, lineStart: 22435, lineEnd: 22490 }], selectionNote: null, statblock: WIGHT },

  { id: 'statblock:bandit', name: 'Bandit', family: 'mercenary_company', challengeRating: '1/8', source: [{ path: SRD_PATH, lineStart: 16991, lineEnd: 17017 }], selectionNote: null, statblock: BANDIT },
  { id: 'statblock:guard', name: 'Guard', family: 'mercenary_company', challengeRating: '1/8', source: [{ path: SRD_PATH, lineStart: 19377, lineEnd: 19398 }], selectionNote: null, statblock: GUARD },
  { id: 'statblock:priest-acolyte', name: 'Priest Acolyte', family: 'mercenary_company', challengeRating: '1/4', source: [{ path: SRD_PATH, lineStart: 20706, lineEnd: 20740 }], selectionNote: null, statblock: PRIEST_ACOLYTE },
  { id: 'statblock:scout', name: 'Scout', family: 'mercenary_company', challengeRating: '1/2', source: [{ path: SRD_PATH, lineStart: 21130, lineEnd: 21164 }], selectionNote: null, statblock: SCOUT },
  { id: 'statblock:tough', name: 'Tough', family: 'mercenary_company', challengeRating: '1/2', source: [{ path: SRD_PATH, lineStart: 21807, lineEnd: 21832 }, { path: SRD_PATH, lineStart: 21867, lineEnd: 21873 }], selectionNote: 'The SRD 5.2.1 statblock for the thug-equivalent mercenary rung is named Tough.', statblock: TOUGH },
  { id: 'statblock:spy', name: 'Spy', family: 'mercenary_company', challengeRating: 1, source: [{ path: SRD_PATH, lineStart: 21620, lineEnd: 21650 }], selectionNote: null, statblock: SPY },
  { id: 'statblock:bandit-captain', name: 'Bandit Captain', family: 'mercenary_company', challengeRating: 2, source: [{ path: SRD_PATH, lineStart: 17019, lineEnd: 17053 }], selectionNote: null, statblock: BANDIT_CAPTAIN },
  { id: 'statblock:berserker', name: 'Berserker', family: 'mercenary_company', challengeRating: 2, source: [{ path: SRD_PATH, lineStart: 17116, lineEnd: 17139 }], selectionNote: null, statblock: BERSERKER },
  { id: 'statblock:priest', name: 'Priest', family: 'mercenary_company', challengeRating: 2, source: [{ path: SRD_PATH, lineStart: 20704, lineEnd: 20716 }, { path: SRD_PATH, lineStart: 20742, lineEnd: 20766 }], selectionNote: null, statblock: PRIEST },
  { id: 'statblock:knight', name: 'Knight', family: 'mercenary_company', challengeRating: 3, source: [{ path: SRD_PATH, lineStart: 19755, lineEnd: 19779 }, { path: SRD_PATH, lineStart: 19802, lineEnd: 19809 }], selectionNote: null, statblock: KNIGHT },

  { id: 'statblock:blood-hawk', name: 'Blood Hawk', family: 'wild_beasts', challengeRating: '1/8', source: [{ path: SRD_PATH, lineStart: 22750, lineEnd: 22780 }], selectionNote: null, statblock: BLOOD_HAWK },
  { id: 'statblock:camel', name: 'Camel', family: 'wild_beasts', challengeRating: '1/8', source: [{ path: SRD_PATH, lineStart: 22775, lineEnd: 22793 }], selectionNote: null, statblock: CAMEL },
  { id: 'statblock:boar', name: 'Boar', family: 'wild_beasts', challengeRating: '1/4', source: [{ path: SRD_PATH, lineStart: 22782, lineEnd: 22809 }], selectionNote: null, statblock: BOAR },
  { id: 'statblock:wolf', name: 'Wolf', family: 'wild_beasts', challengeRating: '1/4', source: [{ path: SRD_PATH, lineStart: 24033, lineEnd: 24059 }], selectionNote: null, statblock: WOLF },
  { id: 'statblock:black-bear', name: 'Black Bear', family: 'wild_beasts', challengeRating: '1/2', source: [{ path: SRD_PATH, lineStart: 22727, lineEnd: 22748 }], selectionNote: null, statblock: BLACK_BEAR },
  { id: 'statblock:crocodile', name: 'Crocodile', family: 'wild_beasts', challengeRating: '1/2', source: [{ path: SRD_PATH, lineStart: 22872, lineEnd: 22899 }], selectionNote: null, statblock: CROCODILE },
  { id: 'statblock:brown-bear', name: 'Brown Bear', family: 'wild_beasts', challengeRating: 1, source: [{ path: SRD_PATH, lineStart: 22768, lineEnd: 22771 }, { path: SRD_PATH, lineStart: 22811, lineEnd: 22833 }], selectionNote: null, statblock: BROWN_BEAR },
  { id: 'statblock:dire-wolf', name: 'Dire Wolf', family: 'wild_beasts', challengeRating: 1, source: [{ path: SRD_PATH, lineStart: 22865, lineEnd: 22891 }], selectionNote: null, statblock: DIRE_WOLF },
  { id: 'statblock:lion', name: 'Lion', family: 'wild_beasts', challengeRating: 1, source: [{ path: SRD_PATH, lineStart: 23518, lineEnd: 23556 }], selectionNote: null, statblock: LION },
  { id: 'statblock:tiger', name: 'Tiger', family: 'wild_beasts', challengeRating: 1, source: [{ path: SRD_PATH, lineStart: 23968, lineEnd: 23994 }], selectionNote: null, statblock: TIGER },
  { id: 'statblock:giant-spider', name: 'Giant Spider', family: 'wild_beasts', challengeRating: 1, source: [{ path: SRD_PATH, lineStart: 23313, lineEnd: 23350 }], selectionNote: null, statblock: GIANT_SPIDER },
  { id: 'statblock:polar-bear', name: 'Polar Bear', family: 'wild_beasts', challengeRating: 2, source: [{ path: SRD_PATH, lineStart: 23676, lineEnd: 23696 }], selectionNote: null, statblock: POLAR_BEAR },
  { id: 'statblock:saber-toothed-tiger', name: 'Saber-Toothed Tiger', family: 'wild_beasts', challengeRating: 2, source: [{ path: SRD_PATH, lineStart: 23754, lineEnd: 23787 }], selectionNote: null, statblock: SABER_TOOTHED_TIGER },
  { id: 'statblock:giant-constrictor-snake', name: 'Giant Constrictor Snake', family: 'wild_beasts', challengeRating: 2, source: [{ path: SRD_PATH, lineStart: 23066, lineEnd: 23094 }], selectionNote: null, statblock: GIANT_CONSTRICTOR_SNAKE },
  { id: 'statblock:giant-scorpion', name: 'Giant Scorpion', family: 'wild_beasts', challengeRating: 3, source: [{ path: SRD_PATH, lineStart: 23287, lineEnd: 23312 }], selectionNote: null, statblock: GIANT_SCORPION },
  { id: 'statblock:killer-whale', name: 'Killer Whale', family: 'wild_beasts', challengeRating: 3, source: [{ path: SRD_PATH, lineStart: 23491, lineEnd: 23515 }], selectionNote: null, statblock: KILLER_WHALE },
  { id: 'statblock:archelon', name: 'Archelon', family: 'wild_beasts', challengeRating: 4, source: [{ path: SRD_PATH, lineStart: 22686, lineEnd: 22720 }], selectionNote: null, statblock: ARCHELON },
  { id: 'statblock:elephant', name: 'Elephant', family: 'wild_beasts', challengeRating: 4, source: [{ path: SRD_PATH, lineStart: 22948, lineEnd: 22978 }], selectionNote: null, statblock: ELEPHANT },
  { id: 'statblock:giant-crocodile', name: 'Giant Crocodile', family: 'wild_beasts', challengeRating: 5, source: [{ path: SRD_PATH, lineStart: 23060, lineEnd: 23094 }], selectionNote: null, statblock: GIANT_CROCODILE },
  { id: 'statblock:giant-shark', name: 'Giant Shark', family: 'wild_beasts', challengeRating: 5, source: [{ path: SRD_PATH, lineStart: 23285, lineEnd: 23310 }], selectionNote: null, statblock: GIANT_SHARK },
] as const;

export const STARTER_MONSTER_ROSTER = SRD_STARTER_MONSTER_ROWS.map((row) => {
  const provenance = { kind: 'srd_5_2_1_decoded' as const, source: row.source };
  return { ...row, provenance, statblock: { ...row.statblock, provenance } };
}) satisfies readonly StarterMonsterRosterRow[];

export type BundledMonsterRosterRow = StarterMonsterRosterRow | HomebrewBeastRosterRow;

/** SRD-decoded and clean-room homebrew rows share one bundled lookup surface. */
export const BUNDLED_MONSTER_ROSTER: readonly BundledMonsterRosterRow[] = [
  ...STARTER_MONSTER_ROSTER,
  ...HOMEBREW_BEAST_ROSTER,
];
