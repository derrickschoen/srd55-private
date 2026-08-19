import type { Ability } from '../../domain/enums';
import type { EffectPayload } from '../effects';
import type { AreaTemplate } from '../templates';
import type { CombatantId, DamageType } from '../values';

export type SpellLevel = 0 | 1 | 2 | 3 | 4;
export type SpellCastingTime = 'action' | 'bonus_action' | 'reaction' | 'minute';
export type SpellClassList = 'Cleric' | 'Wizard';

export interface SpellComponentsData {
  readonly verbal: boolean;
  readonly somatic: boolean;
  readonly material: null | {
    readonly text: string;
    readonly consumed: boolean;
  };
}

export interface ScaledDice {
  readonly baseCount: number;
  readonly sides: number;
  readonly modifier: number;
  readonly perSlotCount: number;
  readonly perSlotModifier: number;
  readonly cantripUpgrade: boolean;
}

export type SpellTargeting =
  | { readonly kind: 'self' }
  | {
      readonly kind: 'single';
      readonly rangeFeet: number;
      readonly willing: boolean;
    }
  | {
      readonly kind: 'multiple';
      readonly rangeFeet: number;
      readonly baseMaximum: number;
      readonly additionalPerSlot: number;
    }
  | {
      readonly kind: 'area';
      readonly rangeFeet: number;
      readonly shape: AreaTemplate['shape'];
    }
  | {
      readonly kind: 'utility';
      readonly rangeFeet: number;
    };

export interface EffectData {
  readonly payload: EffectPayload;
  readonly target: 'self' | 'targets';
  readonly concentration: boolean;
  readonly durationRounds: number | null;
  readonly expiresAt: 'source_start' | 'source_end' | 'target_start' | 'target_end';
}

export type SpellOperation =
  | {
      readonly kind: 'attack_damage';
      readonly attackKind: 'melee' | 'ranged';
      readonly damageType: DamageType;
      readonly dice: ScaledDice;
      readonly rider: EffectData | null;
    }
  | {
      readonly kind: 'save_damage';
      readonly ability: Ability;
      readonly onSuccess: 'none' | 'half';
      readonly damageType: DamageType;
      readonly dice: ScaledDice;
      readonly riderOnFailure: EffectData | null;
      readonly pushFeetOnFailure: number;
    }
  | {
      readonly kind: 'healing';
      readonly dice: ScaledDice;
      readonly addSpellcastingModifier: boolean;
    }
  | {
      readonly kind: 'temporary_hit_points';
      readonly dice: ScaledDice;
    }
  | {
      readonly kind: 'effect';
      readonly effect: EffectData;
    }
  | {
      readonly kind: 'save_effect';
      readonly ability: Ability;
      readonly rollMode: 'normal' | 'advantage' | 'disadvantage';
      readonly effect: EffectData;
    }
  | {
      readonly kind: 'magic_missiles';
      readonly baseDarts: number;
      readonly additionalPerSlot: number;
      readonly damageType: DamageType;
      readonly dice: ScaledDice;
    }
  | { readonly kind: 'stabilize' }
  | {
      readonly kind: 'weapon_attack';
      readonly extraDamage: ScaledDice;
      readonly extraDamageType: DamageType;
    }
  | {
      readonly kind: 'utility';
      readonly effect: Extract<EffectPayload, {
        readonly kind:
          | 'light_source'
          | 'conjured_hand'
          | 'communication_link'
          | 'illusion'
          | 'minor_magic'
          | 'object_repair';
      }>;
      readonly concentration: boolean;
      readonly durationRounds: number | null;
    };

export interface SpellDefinition {
  readonly id: string;
  readonly name: string;
  readonly level: SpellLevel;
  readonly source: string;
  readonly castingTime: SpellCastingTime;
  readonly components: SpellComponentsData;
  readonly targeting: SpellTargeting;
  readonly operation: SpellOperation;
}

export interface SpellCastCommand {
  readonly type: 'cast_spell';
  readonly actor: CombatantId;
  readonly spellId: string;
  readonly slotLevel: number | null;
  readonly casterLevel: number;
  readonly attackBonus: number;
  readonly saveDc: number;
  readonly spellcastingModifier: number;
  readonly targets: readonly CombatantId[];
  readonly area: AreaTemplate | null;
  readonly weaponAttack: null | {
    readonly attackBonus: number;
    readonly damageType: DamageType;
    readonly damageCount: number;
    readonly damageSides: number;
    readonly damageModifier: number;
  };
  readonly selectedOption: string | null;
}
