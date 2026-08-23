export interface MonsterKbEntry {
  readonly ruleId: `R-MONSTER-${string}`;
  readonly monsterId: string;
  readonly srdLocator: `docs/srd/full/srd-5.2.1.txt:${number}-${number}`;
  readonly rulingGuidance: string;
}

export const STARTER_MONSTER_KB = [
  { ruleId: 'R-MONSTER-001', monsterId: 'statblock:goblin-minion', srdLocator: 'docs/srd/full/srd-5.2.1.txt:18957-18983', rulingGuidance: 'Use Nimble Escape after the Dagger attack to Disengage or Hide.' },
  { ruleId: 'R-MONSTER-002', monsterId: 'statblock:goblin-warrior', srdLocator: 'docs/srd/full/srd-5.2.1.txt:18985-19018', rulingGuidance: 'Add the extra 1d4 only when the Scimitar or Shortbow attack roll had Advantage.' },
  { ruleId: 'R-MONSTER-003', monsterId: 'statblock:hobgoblin-warrior', srdLocator: 'docs/srd/full/srd-5.2.1.txt:19540-19574', rulingGuidance: 'Pack Tactics requires an active ally within 5 feet of the target.' },
  { ruleId: 'R-MONSTER-004', monsterId: 'statblock:goblin-boss', srdLocator: 'docs/srd/full/srd-5.2.1.txt:18957-18996', rulingGuidance: 'Make two Scimitar or Shortbow attacks and redirect a visible attack to a nearby eligible ally.' },
  { ruleId: 'R-MONSTER-005', monsterId: 'statblock:bugbear-warrior', srdLocator: 'docs/srd/full/srd-5.2.1.txt:17728-17761', rulingGuidance: 'Grab a Medium-or-smaller target, then gain Advantage with the Light Hammer while it remains grappled.' },
  { ruleId: 'R-MONSTER-006', monsterId: 'statblock:ogre', srdLocator: 'docs/srd/full/srd-5.2.1.txt:20448-20469', rulingGuidance: 'Use the Greatclub in reach and a Javelin when closing from range.' },
  { ruleId: 'R-MONSTER-007', monsterId: 'statblock:bugbear-stalker', srdLocator: 'docs/srd/full/srd-5.2.1.txt:17677-17720', rulingGuidance: 'Quick Grapple a Medium-or-smaller target, then exploit the Morningstar Advantage rider.' },
  { ruleId: 'R-MONSTER-008', monsterId: 'statblock:hobgoblin-captain', srdLocator: 'docs/srd/full/srd-5.2.1.txt:19576-19611', rulingGuidance: 'Keep active allies inside the 10-foot Aura of Authority for attack-roll and saving-throw Advantage.' },

  { ruleId: 'R-MONSTER-009', monsterId: 'statblock:skeleton', srdLocator: 'docs/srd/full/srd-5.2.1.txt:21374-21400', rulingGuidance: 'Choose Shortsword or Shortbow by distance and apply Bludgeoning vulnerability plus Poison immunity.' },
  { ruleId: 'R-MONSTER-010', monsterId: 'statblock:zombie', srdLocator: 'docs/srd/full/srd-5.2.1.txt:22603-22635', rulingGuidance: 'Resolve Undead Fortitude at 0 HP unless Radiant damage or a Critical Hit excludes it.' },
  { ruleId: 'R-MONSTER-011', monsterId: 'statblock:warhorse-skeleton', srdLocator: 'docs/srd/full/srd-5.2.1.txt:21402-21426', rulingGuidance: 'A 20-foot straight approach lets Hooves knock a Large-or-smaller target Prone.' },
  { ruleId: 'R-MONSTER-012', monsterId: 'statblock:ghoul', srdLocator: 'docs/srd/full/srd-5.2.1.txt:18820-18882', rulingGuidance: 'Multiattack uses Bite; Claw can paralyze a non-Undead, non-elf target that fails DC 10 Constitution.' },
  { ruleId: 'R-MONSTER-013', monsterId: 'statblock:specter', srdLocator: 'docs/srd/full/srd-5.2.1.txt:21482-21522', rulingGuidance: 'Life Drain reduces maximum HP by damage taken, and sunlight imposes Disadvantage on checks and attacks.' },
  { ruleId: 'R-MONSTER-014', monsterId: 'statblock:ghast', srdLocator: 'docs/srd/full/srd-5.2.1.txt:18758-18830', rulingGuidance: 'Stench poisons nearby failed saves and Claw can paralyze a non-Undead target.' },
  { ruleId: 'R-MONSTER-015', monsterId: 'statblock:minotaur-skeleton', srdLocator: 'docs/srd/full/srd-5.2.1.txt:21428-21457', rulingGuidance: 'After a 20-foot straight approach, Gore deals its extra 2d8 and knocks a Large-or-smaller target Prone.' },
  { ruleId: 'R-MONSTER-016', monsterId: 'statblock:ogre-zombie', srdLocator: 'docs/srd/full/srd-5.2.1.txt:22637-22669', rulingGuidance: 'Resolve Undead Fortitude at 0 HP unless Radiant damage or a Critical Hit excludes it.' },
  { ruleId: 'R-MONSTER-017', monsterId: 'statblock:wight', srdLocator: 'docs/srd/full/srd-5.2.1.txt:22435-22490', rulingGuidance: 'Replace at most one attack with Life Drain and enforce its maximum-HP reduction and Zombie creation rider.' },

  { ruleId: 'R-MONSTER-018', monsterId: 'statblock:bandit', srdLocator: 'docs/srd/full/srd-5.2.1.txt:16991-17017', rulingGuidance: 'Choose Scimitar in melee or Light Crossbow at range.' },
  { ruleId: 'R-MONSTER-019', monsterId: 'statblock:guard', srdLocator: 'docs/srd/full/srd-5.2.1.txt:19377-19398', rulingGuidance: 'The Spear uses its listed melee reach or 20/60-foot ranged profile.' },
  { ruleId: 'R-MONSTER-020', monsterId: 'statblock:priest-acolyte', srdLocator: 'docs/srd/full/srd-5.2.1.txt:20706-20740', rulingGuidance: 'Choose Mace or Radiant Flame and spend the single Divine Aid on a listed spell.' },
  { ruleId: 'R-MONSTER-021', monsterId: 'statblock:scout', srdLocator: 'docs/srd/full/srd-5.2.1.txt:21130-21164', rulingGuidance: 'Make two Shortsword or Longbow attacks in any combination.' },
  { ruleId: 'R-MONSTER-022', monsterId: 'statblock:tough', srdLocator: 'docs/srd/full/srd-5.2.1.txt:21807-21873', rulingGuidance: 'Use Pack Tactics with a nearby active ally, then choose Mace or Heavy Crossbow.' },
  { ruleId: 'R-MONSTER-023', monsterId: 'statblock:spy', srdLocator: 'docs/srd/full/srd-5.2.1.txt:21620-21650', rulingGuidance: 'Apply the Poison rider to either weapon and use Cunning Action to Dash, Disengage, or Hide.' },
  { ruleId: 'R-MONSTER-024', monsterId: 'statblock:bandit-captain', srdLocator: 'docs/srd/full/srd-5.2.1.txt:17019-17053', rulingGuidance: 'Make any two Scimitar or Pistol attacks and reserve Parry for a melee hit while armed.' },
  { ruleId: 'R-MONSTER-025', monsterId: 'statblock:berserker', srdLocator: 'docs/srd/full/srd-5.2.1.txt:17116-17139', rulingGuidance: 'While Bloodied, apply Advantage to the Berserker’s attack rolls and saving throws.' },
  { ruleId: 'R-MONSTER-026', monsterId: 'statblock:priest', srdLocator: 'docs/srd/full/srd-5.2.1.txt:20704-20766', rulingGuidance: 'Make two Mace or Radiant Flame attacks and resolve the listed spells with Wisdom DC 13.' },
  { ruleId: 'R-MONSTER-027', monsterId: 'statblock:knight', srdLocator: 'docs/srd/full/srd-5.2.1.txt:19755-19809', rulingGuidance: 'Make two Greatsword or Heavy Crossbow attacks and reserve Parry for a melee hit while armed.' },

  { ruleId: 'R-MONSTER-028', monsterId: 'statblock:boar', srdLocator: 'docs/srd/full/srd-5.2.1.txt:22782-22809', rulingGuidance: 'Bloodied Fury grants attack Advantage, and a 20-foot charge adds 1d6 and knocks eligible targets Prone.' },
  { ruleId: 'R-MONSTER-029', monsterId: 'statblock:wolf', srdLocator: 'docs/srd/full/srd-5.2.1.txt:24033-24059', rulingGuidance: 'Pack Tactics needs a nearby active ally, and Bite knocks a Medium-or-smaller target Prone.' },
  { ruleId: 'R-MONSTER-030', monsterId: 'statblock:black-bear', srdLocator: 'docs/srd/full/srd-5.2.1.txt:22727-22748', rulingGuidance: 'Multiattack makes two Rend attacks.' },
  { ruleId: 'R-MONSTER-031', monsterId: 'statblock:brown-bear', srdLocator: 'docs/srd/full/srd-5.2.1.txt:22768-22833', rulingGuidance: 'Multiattack makes one Bite and one Claw, and Claw knocks a Large-or-smaller target Prone.' },
  { ruleId: 'R-MONSTER-032', monsterId: 'statblock:dire-wolf', srdLocator: 'docs/srd/full/srd-5.2.1.txt:22865-22891', rulingGuidance: 'Pack Tactics needs a nearby active ally, and Bite knocks a Large-or-smaller target Prone.' },
  { ruleId: 'R-MONSTER-033', monsterId: 'statblock:lion', srdLocator: 'docs/srd/full/srd-5.2.1.txt:23518-23556', rulingGuidance: 'Make two Rend attacks or replace one with Roar; Pack Tactics requires a nearby active ally.' },
  { ruleId: 'R-MONSTER-034', monsterId: 'statblock:tiger', srdLocator: 'docs/srd/full/srd-5.2.1.txt:23968-23994', rulingGuidance: 'Rend knocks a Large-or-smaller target Prone, then Nimble Escape can Disengage or Hide.' },
  { ruleId: 'R-MONSTER-035', monsterId: 'statblock:polar-bear', srdLocator: 'docs/srd/full/srd-5.2.1.txt:23676-23696', rulingGuidance: 'Multiattack makes two Rend attacks and Cold damage is resisted.' },
  { ruleId: 'R-MONSTER-036', monsterId: 'statblock:saber-toothed-tiger', srdLocator: 'docs/srd/full/srd-5.2.1.txt:23754-23787', rulingGuidance: 'Make two Rend attacks, then use Nimble Escape to Disengage or Hide.' },
  { ruleId: 'R-MONSTER-037', monsterId: 'statblock:giant-scorpion', srdLocator: 'docs/srd/full/srd-5.2.1.txt:23287-23312', rulingGuidance: 'Multiattack makes two Claws and one Sting; each Claw can maintain one Large-or-smaller grapple.' },
  { ruleId: 'R-MONSTER-038', monsterId: 'statblock:blood-hawk', srdLocator: 'docs/srd/full/srd-5.2.1.txt:22750-22780', rulingGuidance: 'Pack Tactics grants attack Advantage, and Beak uses its Bloodied-target damage profile when applicable.' },
  { ruleId: 'R-MONSTER-039', monsterId: 'statblock:camel', srdLocator: 'docs/srd/full/srd-5.2.1.txt:22775-22793', rulingGuidance: 'Use the camel’s 50-foot Speed to close before making its Bite attack.' },
  { ruleId: 'R-MONSTER-040', monsterId: 'statblock:crocodile', srdLocator: 'docs/srd/full/srd-5.2.1.txt:22872-22899', rulingGuidance: 'Bite grapples and restrains an eligible target, while Hold Breath lasts one hour.' },
  { ruleId: 'R-MONSTER-041', monsterId: 'statblock:giant-spider', srdLocator: 'docs/srd/full/srd-5.2.1.txt:23313-23350', rulingGuidance: 'Choose the damaging Bite or the DC 13 Web that restrains its target until the web is destroyed.' },
  { ruleId: 'R-MONSTER-042', monsterId: 'statblock:giant-constrictor-snake', srdLocator: 'docs/srd/full/srd-5.2.1.txt:23066-23094', rulingGuidance: 'Multiattack combines Bite with DC 14 Constrict against a Large-or-smaller target.' },
  { ruleId: 'R-MONSTER-043', monsterId: 'statblock:killer-whale', srdLocator: 'docs/srd/full/srd-5.2.1.txt:23491-23515', rulingGuidance: 'The killer whale has a 60-foot Swim Speed, 120-foot Blindsight, and a heavy Bite.' },
  { ruleId: 'R-MONSTER-044', monsterId: 'statblock:archelon', srdLocator: 'docs/srd/full/srd-5.2.1.txt:22686-22720', rulingGuidance: 'The amphibious archelon swims 80 feet and makes two Bite attacks.' },
  { ruleId: 'R-MONSTER-045', monsterId: 'statblock:elephant', srdLocator: 'docs/srd/full/srd-5.2.1.txt:22948-22978', rulingGuidance: 'A 20-foot Gore approach knocks eligible targets Prone, enabling the Trample bonus action.' },
  { ruleId: 'R-MONSTER-046', monsterId: 'statblock:giant-crocodile', srdLocator: 'docs/srd/full/srd-5.2.1.txt:23060-23094', rulingGuidance: 'Bite grapples and restrains one target; Tail attacks a different eligible target and can knock it Prone.' },
  { ruleId: 'R-MONSTER-047', monsterId: 'statblock:giant-shark', srdLocator: 'docs/srd/full/srd-5.2.1.txt:23285-23310', rulingGuidance: 'Make two Bite attacks, with Advantage against a target missing any Hit Points.' },
] as const satisfies readonly MonsterKbEntry[];
