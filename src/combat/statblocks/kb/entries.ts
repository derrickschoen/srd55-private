export interface MonsterKbEntry {
  readonly ruleId: `R-MONSTER-${string}`;
  readonly monsterId: string;
  readonly srdLocator: `docs/srd/full/srd-5.2.1.txt:${number}-${number}`;
  readonly rulingGuidance: string;
}

export const STARTER_MONSTER_KB = [
  { ruleId: 'R-MONSTER-001', monsterId: 'statblock:goblin-warrior', srdLocator: 'docs/srd/full/srd-5.2.1.txt:18985-19018', rulingGuidance: 'Use Nimble Escape to reposition, and add the extra 1d4 only when the attack roll had Advantage.' },
  { ruleId: 'R-MONSTER-002', monsterId: 'statblock:hobgoblin-warrior', srdLocator: 'docs/srd/full/srd-5.2.1.txt:19540-19574', rulingGuidance: 'Seek an adjacent active ally for Pack Tactics, then choose Longsword or the poison-bearing Longbow.' },
  { ruleId: 'R-MONSTER-003', monsterId: 'statblock:bandit-captain', srdLocator: 'docs/srd/full/srd-5.2.1.txt:17019-17053', rulingGuidance: 'Make any two Scimitar or Pistol attacks and reserve Parry for a melee hit while armed.' },
  { ruleId: 'R-MONSTER-004', monsterId: 'statblock:ogre', srdLocator: 'docs/srd/full/srd-5.2.1.txt:20448-20469', rulingGuidance: 'Use the Greatclub in reach and the Javelin when closing from range.' },
  { ruleId: 'R-MONSTER-005', monsterId: 'statblock:priest-acolyte', srdLocator: 'docs/srd/full/srd-5.2.1.txt:20706-20740', rulingGuidance: 'Choose Mace or Radiant Flame for damage and spend the single Divine Aid on its listed spell options.' },
  { ruleId: 'R-MONSTER-006', monsterId: 'statblock:priest', srdLocator: 'docs/srd/full/srd-5.2.1.txt:20704-20766', rulingGuidance: 'Make two Mace or Radiant Flame attacks, while treating the listed spells as Wisdom DC 13 casts.' },
  { ruleId: 'R-MONSTER-007', monsterId: 'statblock:skeleton', srdLocator: 'docs/srd/full/srd-5.2.1.txt:21374-21400', rulingGuidance: 'Choose Shortsword or Shortbow by distance and apply Bludgeoning vulnerability plus Poison immunity.' },
  { ruleId: 'R-MONSTER-008', monsterId: 'statblock:zombie', srdLocator: 'docs/srd/full/srd-5.2.1.txt:22603-22635', rulingGuidance: 'When reduced to 0 HP, resolve Undead Fortitude unless Radiant damage or a Critical Hit excludes it.' },
  { ruleId: 'R-MONSTER-009', monsterId: 'statblock:wolf', srdLocator: 'docs/srd/full/srd-5.2.1.txt:24033-24059', rulingGuidance: 'Seek an adjacent active ally for Pack Tactics, and knock a Medium-or-smaller Bite target Prone on a hit.' },
] as const satisfies readonly MonsterKbEntry[];
