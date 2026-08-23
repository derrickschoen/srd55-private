export const EXPECTED_STATBLOCK_VALUES = {
  'statblock:goblin-minion': {
    armorClass: 12, hitPoints: { average: 7, dice: '2d6+0' }, speeds: ['walk:30'], scores: [8, 15, 10, 10, 8, 8], modifiers: [-1, 2, 0, 0, -1, -1],
    attackBonuses: { dagger: 4 }, damageDice: { dagger: ['4:1d4+2:Piercing:always'] }, saveDcs: [], traits: [],
  },
  'statblock:goblin-warrior': {
    armorClass: 15, hitPoints: { average: 10, dice: '3d6+0' }, speeds: ['walk:30'], scores: [8, 15, 10, 10, 8, 8], modifiers: [-1, 2, 0, 0, -1, -1],
    attackBonuses: { scimitar: 4, shortbow: 4 }, damageDice: { scimitar: ['5:1d6+2:Slashing:always', '2:1d4+0:Slashing:attack_roll_advantage'], shortbow: ['5:1d6+2:Piercing:always', '2:1d4+0:Piercing:attack_roll_advantage'] }, saveDcs: [], traits: [],
  },
  'statblock:hobgoblin-warrior': {
    armorClass: 18, hitPoints: { average: 11, dice: '2d8+2' }, speeds: ['walk:30'], scores: [13, 12, 12, 10, 10, 9], modifiers: [1, 1, 1, 0, 0, -1],
    attackBonuses: { longsword: 3, longbow: 3 }, damageDice: { longsword: ['12:2d10+1:Slashing:always'], longbow: ['5:1d8+1:Piercing:always', '7:3d4+0:Poison:always'] }, saveDcs: [], traits: [{ kind: 'pack_tactics', allyDistanceFeet: 5, blockedByCondition: 'Incapacitated', appliesTo: 'attack_rolls' }],
  },
  'statblock:goblin-boss': {
    armorClass: 17, hitPoints: { average: 21, dice: '6d6+0' }, speeds: ['walk:30'], scores: [10, 15, 10, 10, 8, 10], modifiers: [0, 2, 0, 0, -1, 0],
    attackBonuses: { scimitar: 4, shortbow: 4 }, damageDice: { scimitar: ['5:1d6+2:Slashing:always', '2:1d4+0:Slashing:attack_roll_advantage'], shortbow: ['5:1d6+2:Piercing:always', '2:1d4+0:Piercing:attack_roll_advantage'] }, saveDcs: [], traits: [],
  },
  'statblock:bugbear-warrior': {
    armorClass: 14, hitPoints: { average: 33, dice: '6d8+6' }, speeds: ['walk:30'], scores: [15, 14, 13, 8, 11, 9], modifiers: [2, 2, 1, -1, 0, -1],
    attackBonuses: { grab: 4, 'light-hammer': 4 }, damageDice: { grab: ['9:2d6+2:Bludgeoning:always'], 'light-hammer': ['9:3d4+2:Bludgeoning:always'] }, saveDcs: [], traits: [{ kind: 'abduct', extraMovementCostWhileGrappling: false }],
  },
  'statblock:ogre': {
    armorClass: 11, hitPoints: { average: 68, dice: '8d10+24' }, speeds: ['walk:40'], scores: [19, 8, 16, 5, 7, 7], modifiers: [4, -1, 3, -3, -2, -2],
    attackBonuses: { greatclub: 6, javelin: 6 }, damageDice: { greatclub: ['13:2d8+4:Bludgeoning:always'], javelin: ['11:2d6+4:Piercing:always'] }, saveDcs: [], traits: [],
  },
  'statblock:bugbear-stalker': {
    armorClass: 15, hitPoints: { average: 65, dice: '10d8+20' }, speeds: ['walk:30'], scores: [17, 14, 14, 11, 12, 11], modifiers: [3, 2, 2, 0, 1, 0],
    attackBonuses: { javelin: 5, morningstar: 5 }, damageDice: { javelin: ['13:3d6+3:Piercing:always'], morningstar: ['12:2d8+3:Piercing:always'] }, saveDcs: [13], traits: [{ kind: 'abduct', extraMovementCostWhileGrappling: false }],
  },
  'statblock:hobgoblin-captain': {
    armorClass: 17, hitPoints: { average: 58, dice: '9d8+18' }, speeds: ['walk:30'], scores: [15, 14, 14, 12, 10, 13], modifiers: [2, 2, 2, 1, 0, 1],
    attackBonuses: { greatsword: 4, longbow: 4 }, damageDice: { greatsword: ['9:2d6+2:Slashing:always', '3:1d6+0:Poison:always'], longbow: ['6:1d8+2:Piercing:always', '5:2d4+0:Poison:always'] }, saveDcs: [], traits: [{ kind: 'aura_of_authority', emanationFeet: 10, grantsAdvantageOn: ['attack_rolls', 'saving_throws'], blockedByCondition: 'Incapacitated' }],
  },

  'statblock:skeleton': {
    armorClass: 14, hitPoints: { average: 13, dice: '2d8+4' }, speeds: ['walk:30'], scores: [10, 16, 15, 6, 8, 5], modifiers: [0, 3, 2, -2, -1, -3],
    attackBonuses: { shortsword: 5, shortbow: 5 }, damageDice: { shortsword: ['6:1d6+3:Piercing:always'], shortbow: ['6:1d6+3:Piercing:always'] }, saveDcs: [], traits: [],
  },
  'statblock:zombie': {
    armorClass: 8, hitPoints: { average: 15, dice: '2d8+6' }, speeds: ['walk:20'], scores: [13, 6, 16, 3, 6, 5], modifiers: [1, -2, 3, -4, -2, -3],
    attackBonuses: { slam: 3 }, damageDice: { slam: ['5:1d8+1:Bludgeoning:always'] }, saveDcs: [], traits: [{ kind: 'undead_fortitude', saveAbility: 'constitution', dcBase: 5, addDamageTaken: true, excludedDamageType: 'Radiant', excludedCriticalHits: true, successHitPoints: 1 }],
  },
  'statblock:warhorse-skeleton': {
    armorClass: 13, hitPoints: { average: 22, dice: '3d10+6' }, speeds: ['walk:60'], scores: [18, 12, 15, 2, 8, 5], modifiers: [4, 1, 2, -4, -1, -3],
    attackBonuses: { hooves: 6 }, damageDice: { hooves: ['7:1d6+4:Bludgeoning:always'] }, saveDcs: [], traits: [],
  },
  'statblock:ghoul': {
    armorClass: 12, hitPoints: { average: 22, dice: '5d8+0' }, speeds: ['walk:30'], scores: [13, 15, 10, 7, 10, 6], modifiers: [1, 2, 0, -2, 0, -2],
    attackBonuses: { bite: 4, claw: 4 }, damageDice: { bite: ['5:1d6+2:Piercing:always', '3:1d6+0:Necrotic:always'], claw: ['4:1d4+2:Slashing:always'] }, saveDcs: [], traits: [],
  },
  'statblock:specter': {
    armorClass: 12, hitPoints: { average: 22, dice: '5d8+0' }, speeds: ['walk:30', 'fly:50'], scores: [1, 14, 11, 10, 10, 11], modifiers: [-5, 2, 0, 0, 0, 0],
    attackBonuses: { 'life-drain': 4 }, damageDice: { 'life-drain': ['7:2d6+0:Necrotic:always'] }, saveDcs: [], traits: [{ kind: 'incorporeal_movement', difficultTerrain: true, endingInObjectDamage: { average: 5, dice: { count: 1, sides: 10, modifier: 0 }, type: 'Force', trigger: { kind: 'always' } } }, { kind: 'sunlight_sensitivity', disadvantageOn: ['ability_checks', 'attack_rolls'] }],
  },
  'statblock:ghast': {
    armorClass: 13, hitPoints: { average: 36, dice: '8d8+0' }, speeds: ['walk:30'], scores: [16, 17, 10, 11, 10, 8], modifiers: [3, 3, 0, 0, 0, -1],
    attackBonuses: { bite: 5, claw: 5 }, damageDice: { bite: ['7:1d8+3:Piercing:always', '9:2d8+0:Necrotic:always'], claw: ['10:2d6+3:Slashing:always'] }, saveDcs: [], traits: [{ kind: 'stench', emanationFeet: 5, savingThrow: { ability: 'constitution', dc: 10 }, condition: 'Poisoned', duration: 'until_start_of_monster_next_turn', successImmunityHours: 24 }],
  },
  'statblock:minotaur-skeleton': {
    armorClass: 12, hitPoints: { average: 45, dice: '6d10+12' }, speeds: ['walk:40'], scores: [18, 11, 15, 6, 8, 5], modifiers: [4, 0, 2, -2, -1, -3],
    attackBonuses: { gore: 6, slam: 6 }, damageDice: { gore: ['11:2d6+4:Piercing:always', '9:2d8+0:Piercing:charge:20:Large'], slam: ['15:2d10+4:Bludgeoning:always'] }, saveDcs: [], traits: [],
  },
  'statblock:ogre-zombie': {
    armorClass: 8, hitPoints: { average: 85, dice: '9d10+36' }, speeds: ['walk:30'], scores: [19, 6, 18, 3, 6, 5], modifiers: [4, -2, 4, -4, -2, -3],
    attackBonuses: { slam: 6 }, damageDice: { slam: ['13:2d8+4:Bludgeoning:always'] }, saveDcs: [], traits: [{ kind: 'undead_fortitude', saveAbility: 'constitution', dcBase: 5, addDamageTaken: true, excludedDamageType: 'Radiant', excludedCriticalHits: true, successHitPoints: 1 }],
  },
  'statblock:wight': {
    armorClass: 14, hitPoints: { average: 82, dice: '11d8+33' }, speeds: ['walk:30'], scores: [15, 14, 16, 10, 13, 15], modifiers: [2, 2, 3, 0, 1, 2],
    attackBonuses: { 'necrotic-sword': 4, 'necrotic-bow': 4 }, damageDice: { 'necrotic-sword': ['6:1d8+2:Slashing:always', '4:1d8+0:Necrotic:always'], 'necrotic-bow': ['6:1d8+2:Piercing:always', '4:1d8+0:Necrotic:always'] }, saveDcs: [13], traits: [{ kind: 'sunlight_sensitivity', disadvantageOn: ['ability_checks', 'attack_rolls'] }],
  },

  'statblock:bandit': {
    armorClass: 12, hitPoints: { average: 11, dice: '2d8+2' }, speeds: ['walk:30'], scores: [11, 12, 12, 10, 10, 10], modifiers: [0, 1, 1, 0, 0, 0],
    attackBonuses: { scimitar: 3, 'light-crossbow': 3 }, damageDice: { scimitar: ['4:1d6+1:Slashing:always'], 'light-crossbow': ['5:1d8+1:Piercing:always'] }, saveDcs: [], traits: [],
  },
  'statblock:guard': {
    armorClass: 16, hitPoints: { average: 11, dice: '2d8+2' }, speeds: ['walk:30'], scores: [13, 12, 12, 10, 11, 10], modifiers: [1, 1, 1, 0, 0, 0],
    attackBonuses: { spear: 3 }, damageDice: { spear: ['4:1d6+1:Piercing:always'] }, saveDcs: [], traits: [],
  },
  'statblock:priest-acolyte': {
    armorClass: 13, hitPoints: { average: 11, dice: '2d8+2' }, speeds: ['walk:30'], scores: [14, 10, 12, 10, 14, 11], modifiers: [2, 0, 1, 0, 2, 0],
    attackBonuses: { mace: 4, 'radiant-flame': 4 }, damageDice: { mace: ['5:1d6+2:Bludgeoning:always'], 'radiant-flame': ['7:2d6+0:Radiant:always'] }, saveDcs: [], traits: [],
  },
  'statblock:scout': {
    armorClass: 13, hitPoints: { average: 16, dice: '3d8+3' }, speeds: ['walk:30'], scores: [11, 14, 12, 11, 13, 11], modifiers: [0, 2, 1, 0, 1, 0],
    attackBonuses: { shortsword: 4, longbow: 4 }, damageDice: { shortsword: ['5:1d6+2:Piercing:always'], longbow: ['6:1d8+2:Piercing:always'] }, saveDcs: [], traits: [],
  },
  'statblock:tough': {
    armorClass: 12, hitPoints: { average: 32, dice: '5d8+10' }, speeds: ['walk:30'], scores: [15, 12, 14, 10, 10, 11], modifiers: [2, 1, 2, 0, 0, 0],
    attackBonuses: { mace: 4, 'heavy-crossbow': 3 }, damageDice: { mace: ['5:1d6+2:Bludgeoning:always'], 'heavy-crossbow': ['6:1d10+1:Piercing:always'] }, saveDcs: [], traits: [{ kind: 'pack_tactics', allyDistanceFeet: 5, blockedByCondition: 'Incapacitated', appliesTo: 'attack_rolls' }],
  },
  'statblock:spy': {
    armorClass: 12, hitPoints: { average: 27, dice: '6d8+0' }, speeds: ['walk:30', 'climb:30'], scores: [10, 15, 10, 12, 14, 16], modifiers: [0, 2, 0, 1, 2, 3],
    attackBonuses: { shortsword: 4, 'hand-crossbow': 4 }, damageDice: { shortsword: ['5:1d6+2:Piercing:always', '7:2d6+0:Poison:always'], 'hand-crossbow': ['5:1d6+2:Piercing:always', '7:2d6+0:Poison:always'] }, saveDcs: [], traits: [],
  },
  'statblock:bandit-captain': {
    armorClass: 15, hitPoints: { average: 52, dice: '8d8+16' }, speeds: ['walk:30'], scores: [15, 16, 14, 14, 11, 14], modifiers: [2, 3, 2, 2, 0, 2],
    attackBonuses: { scimitar: 5, pistol: 5 }, damageDice: { scimitar: ['6:1d6+3:Slashing:always'], pistol: ['8:1d10+3:Piercing:always'] }, saveDcs: [], traits: [],
  },
  'statblock:berserker': {
    armorClass: 13, hitPoints: { average: 67, dice: '9d8+27' }, speeds: ['walk:30'], scores: [16, 12, 17, 9, 11, 9], modifiers: [3, 1, 3, -1, 0, -1],
    attackBonuses: { greataxe: 5 }, damageDice: { greataxe: ['9:1d12+3:Slashing:always'] }, saveDcs: [], traits: [{ kind: 'bloodied_frenzy', grantsAdvantageOn: ['attack_rolls', 'saving_throws'] }],
  },
  'statblock:priest': {
    armorClass: 13, hitPoints: { average: 38, dice: '7d8+7' }, speeds: ['walk:30'], scores: [16, 10, 12, 13, 16, 13], modifiers: [3, 0, 1, 1, 3, 1],
    attackBonuses: { mace: 5, 'radiant-flame': 5 }, damageDice: { mace: ['6:1d6+3:Bludgeoning:always', '5:2d4+0:Radiant:always'], 'radiant-flame': ['11:2d10+0:Radiant:always'] }, saveDcs: [13, 13], traits: [],
  },
  'statblock:knight': {
    armorClass: 18, hitPoints: { average: 52, dice: '8d8+16' }, speeds: ['walk:30'], scores: [16, 11, 14, 11, 11, 15], modifiers: [3, 0, 2, 0, 0, 2],
    attackBonuses: { greatsword: 5, 'heavy-crossbow': 2 }, damageDice: { greatsword: ['10:2d6+3:Slashing:always', '4:1d8+0:Radiant:always'], 'heavy-crossbow': ['11:2d10+0:Piercing:always', '4:1d8+0:Radiant:always'] }, saveDcs: [], traits: [],
  },

  'statblock:boar': {
    armorClass: 11, hitPoints: { average: 13, dice: '2d8+4' }, speeds: ['walk:40'], scores: [13, 11, 14, 2, 9, 5], modifiers: [1, 0, 2, -4, -1, -3],
    attackBonuses: { gore: 3 }, damageDice: { gore: ['4:1d6+1:Piercing:always', '3:1d6+0:Piercing:charge:20:Medium'] }, saveDcs: [], traits: [{ kind: 'bloodied_fury', grantsAdvantageOn: ['attack_rolls'] }],
  },
  'statblock:blood-hawk': {
    armorClass: 12, hitPoints: { average: 7, dice: '2d6+0' }, speeds: ['walk:10', 'fly:60'], scores: [6, 14, 10, 3, 14, 5], modifiers: [-2, 2, 0, -4, 2, -3],
    attackBonuses: { beak: 4 }, damageDice: { beak: ['4:1d4+2:Piercing:always', '6:1d8+2:Piercing:replaces_base_when_target_bloodied'] }, saveDcs: [], traits: [{ kind: 'pack_tactics', allyDistanceFeet: 5, blockedByCondition: 'Incapacitated', appliesTo: 'attack_rolls' }],
  },
  'statblock:camel': {
    armorClass: 10, hitPoints: { average: 17, dice: '2d10+6' }, speeds: ['walk:50'], scores: [15, 8, 17, 2, 11, 5], modifiers: [2, -1, 3, -4, 0, -3],
    attackBonuses: { bite: 4 }, damageDice: { bite: ['4:1d4+2:Bludgeoning:always'] }, saveDcs: [], traits: [],
  },
  'statblock:wolf': {
    armorClass: 12, hitPoints: { average: 11, dice: '2d8+2' }, speeds: ['walk:40'], scores: [14, 15, 12, 3, 12, 6], modifiers: [2, 2, 1, -4, 1, -2],
    attackBonuses: { bite: 4 }, damageDice: { bite: ['5:1d6+2:Piercing:always'] }, saveDcs: [], traits: [{ kind: 'pack_tactics', allyDistanceFeet: 5, blockedByCondition: 'Incapacitated', appliesTo: 'attack_rolls' }],
  },
  'statblock:black-bear': {
    armorClass: 11, hitPoints: { average: 19, dice: '3d8+6' }, speeds: ['walk:30', 'climb:30', 'swim:30'], scores: [15, 12, 14, 2, 12, 7], modifiers: [2, 1, 2, -4, 1, -2],
    attackBonuses: { rend: 4 }, damageDice: { rend: ['5:1d6+2:Slashing:always'] }, saveDcs: [], traits: [],
  },
  'statblock:crocodile': {
    armorClass: 12, hitPoints: { average: 13, dice: '2d10+2' }, speeds: ['walk:20', 'swim:30'], scores: [15, 10, 13, 2, 10, 5], modifiers: [2, 0, 1, -4, 0, -3],
    attackBonuses: { bite: 4 }, damageDice: { bite: ['6:1d8+2:Piercing:always'] }, saveDcs: [], traits: [{ kind: 'hold_breath', minutes: 60 }],
  },
  'statblock:brown-bear': {
    armorClass: 11, hitPoints: { average: 22, dice: '3d10+6' }, speeds: ['walk:40', 'climb:30'], scores: [17, 12, 15, 2, 13, 7], modifiers: [3, 1, 2, -4, 1, -2],
    attackBonuses: { bite: 5, claw: 5 }, damageDice: { bite: ['7:1d8+3:Piercing:always'], claw: ['5:1d4+3:Slashing:always'] }, saveDcs: [], traits: [],
  },
  'statblock:dire-wolf': {
    armorClass: 14, hitPoints: { average: 22, dice: '3d10+6' }, speeds: ['walk:50'], scores: [17, 15, 15, 3, 12, 7], modifiers: [3, 2, 2, -4, 1, -2],
    attackBonuses: { bite: 5 }, damageDice: { bite: ['8:1d10+3:Piercing:always'] }, saveDcs: [], traits: [{ kind: 'pack_tactics', allyDistanceFeet: 5, blockedByCondition: 'Incapacitated', appliesTo: 'attack_rolls' }],
  },
  'statblock:lion': {
    armorClass: 12, hitPoints: { average: 22, dice: '4d10+0' }, speeds: ['walk:50'], scores: [17, 15, 11, 3, 12, 8], modifiers: [3, 2, 0, -4, 1, -1],
    attackBonuses: { rend: 5 }, damageDice: { rend: ['7:1d8+3:Slashing:always'] }, saveDcs: [11], traits: [{ kind: 'pack_tactics', allyDistanceFeet: 5, blockedByCondition: 'Incapacitated', appliesTo: 'attack_rolls' }, { kind: 'running_leap', runningStartFeet: 10, longJumpFeet: 25 }],
  },
  'statblock:tiger': {
    armorClass: 13, hitPoints: { average: 30, dice: '4d10+8' }, speeds: ['walk:40'], scores: [17, 16, 14, 3, 12, 8], modifiers: [3, 3, 2, -4, 1, -1],
    attackBonuses: { rend: 5 }, damageDice: { rend: ['10:2d6+3:Slashing:always'] }, saveDcs: [], traits: [],
  },
  'statblock:giant-spider': {
    armorClass: 14, hitPoints: { average: 26, dice: '4d10+4' }, speeds: ['walk:30', 'climb:30'], scores: [14, 16, 12, 2, 11, 4], modifiers: [2, 3, 1, -4, 0, -3],
    attackBonuses: { bite: 5 }, damageDice: { bite: ['7:1d8+3:Piercing:always', '7:2d6+0:Poison:always'] }, saveDcs: [13], traits: [{ kind: 'spider_climb' }, { kind: 'web_walker' }],
  },
  'statblock:polar-bear': {
    armorClass: 12, hitPoints: { average: 42, dice: '5d10+15' }, speeds: ['walk:40', 'swim:40'], scores: [20, 14, 16, 2, 13, 7], modifiers: [5, 2, 3, -4, 1, -2],
    attackBonuses: { rend: 7 }, damageDice: { rend: ['9:1d8+5:Slashing:always'] }, saveDcs: [], traits: [],
  },
  'statblock:saber-toothed-tiger': {
    armorClass: 13, hitPoints: { average: 52, dice: '7d10+14' }, speeds: ['walk:40'], scores: [18, 17, 15, 3, 12, 8], modifiers: [4, 3, 2, -4, 1, -1],
    attackBonuses: { rend: 6 }, damageDice: { rend: ['11:2d6+4:Slashing:always'] }, saveDcs: [], traits: [{ kind: 'running_leap', runningStartFeet: 10, longJumpFeet: 25 }],
  },
  'statblock:giant-constrictor-snake': {
    armorClass: 12, hitPoints: { average: 60, dice: '8d12+8' }, speeds: ['walk:30', 'swim:30'], scores: [19, 14, 12, 1, 10, 3], modifiers: [4, 2, 1, -5, 0, -4],
    attackBonuses: { bite: 6 }, damageDice: { bite: ['11:2d6+4:Piercing:always'] }, saveDcs: [14], traits: [],
  },
  'statblock:giant-scorpion': {
    armorClass: 15, hitPoints: { average: 52, dice: '7d10+14' }, speeds: ['walk:40'], scores: [16, 13, 15, 1, 9, 3], modifiers: [3, 1, 2, -5, -1, -4],
    attackBonuses: { claw: 5, sting: 5 }, damageDice: { claw: ['6:1d6+3:Bludgeoning:always'], sting: ['7:1d8+3:Piercing:always', '11:2d10+0:Poison:always'] }, saveDcs: [], traits: [],
  },
  'statblock:killer-whale': {
    armorClass: 12, hitPoints: { average: 90, dice: '12d12+12' }, speeds: ['walk:5', 'swim:60'], scores: [19, 14, 13, 3, 12, 7], modifiers: [4, 2, 1, -4, 1, -2],
    attackBonuses: { bite: 6 }, damageDice: { bite: ['21:5d6+4:Piercing:always'] }, saveDcs: [], traits: [{ kind: 'hold_breath', minutes: 30 }],
  },
  'statblock:archelon': {
    armorClass: 17, hitPoints: { average: 90, dice: '12d12+12' }, speeds: ['walk:20', 'swim:80'], scores: [18, 16, 13, 4, 14, 6], modifiers: [4, 3, 1, -3, 2, -2],
    attackBonuses: { bite: 6 }, damageDice: { bite: ['14:3d6+4:Piercing:always'] }, saveDcs: [], traits: [{ kind: 'amphibious' }],
  },
  'statblock:elephant': {
    armorClass: 12, hitPoints: { average: 76, dice: '8d12+24' }, speeds: ['walk:40'], scores: [22, 9, 17, 3, 11, 6], modifiers: [6, -1, 3, -4, 0, -2],
    attackBonuses: { gore: 8 }, damageDice: { gore: ['15:2d8+6:Piercing:always'] }, saveDcs: [16], traits: [],
  },
  'statblock:giant-crocodile': {
    armorClass: 14, hitPoints: { average: 85, dice: '9d12+27' }, speeds: ['walk:30', 'swim:50'], scores: [21, 9, 17, 2, 10, 7], modifiers: [5, -1, 3, -4, 0, -2],
    attackBonuses: { bite: 8, tail: 8 }, damageDice: { bite: ['21:3d10+5:Piercing:always'], tail: ['18:3d8+5:Bludgeoning:always'] }, saveDcs: [], traits: [{ kind: 'hold_breath', minutes: 60 }],
  },
  'statblock:giant-shark': {
    armorClass: 13, hitPoints: { average: 92, dice: '8d12+40' }, speeds: ['walk:5', 'swim:60'], scores: [23, 11, 21, 1, 10, 5], modifiers: [6, 0, 5, -5, 0, -3],
    attackBonuses: { bite: 9 }, damageDice: { bite: ['22:3d10+6:Piercing:always'] }, saveDcs: [], traits: [{ kind: 'water_breathing', onlyUnderwater: true }],
  },
} as const;
