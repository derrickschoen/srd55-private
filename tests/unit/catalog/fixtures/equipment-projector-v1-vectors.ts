import {
  type ArmorContentAggregate,
  type EquipmentContentAggregate,
  type EquipmentProjectorPayloadV1,
  type ItemContentAggregate,
  type WeaponContentAggregate,
} from '../../../../src/catalog/equipment-content-projector-v1';
import {
  canonicalOpenPassthroughValue,
  canonicalRuleText,
  contentIdentitySequence,
} from '../../../../src/catalog/content-identity';
import { damageType } from '../../../../src/domain/enums';

const weaponAggregate: WeaponContentAggregate = {
  kind: 'weapon',
  name: 'Storm Pike',
  rules_edition: 'expanded',
  srd_group: 'martial_melee',
  damage: { kind: 'dice', dice: '1d8' },
  damage_type: damageType('Storm  Fire'),
  versatile_damage: { kind: 'dice', dice: '1d10' },
  finesse: false,
  heavy: false,
  light: false,
  loading: false,
  reach: true,
  thrown: true,
  two_handed: false,
  ammunition: false,
  ammunition_kind: null,
  range: { kind: 'ranged', near_feet: 20, far_feet: 60 },
  mastery_property: 'Vex',
  other_properties: 'Conductive.  \r\nOnly in storms.   \r\n',
};

const armorAggregate: ArmorContentAggregate = {
  kind: 'armor',
  name: 'Mirror Coat',
  rules_edition: 'expanded',
  category: 'medium',
  armor_class: 15,
  dex_bonus: 'capped',
  dex_bonus_max: 2,
  strength_requirement: 11,
  stealth_disadvantage: false,
};

const itemAggregate: ItemContentAggregate = {
  kind: 'item',
  name: 'Giant Belt',
  rules_edition: 'expanded',
  description: 'Raises strength.  \r\nWhile worn.   \r\n',
  requires_attunement: true,
  effects: [{
    kind: 'ability_override',
    sort_order: 1,
    ability: 'strength',
    maximum: 23,
    label: 'Giant strength',
    notes: 'Applies while worn.  \r\n',
  }],
};

const weaponPayload: EquipmentProjectorPayloadV1<'weapon'> = {
  srd_group: 'martial_melee',
  damage: { kind: 'dice', dice: '1d8' },
  damage_type: canonicalOpenPassthroughValue('Storm  Fire'),
  versatile_damage: { kind: 'dice', dice: '1d10' },
  finesse: false,
  heavy: false,
  light: false,
  loading: false,
  reach: true,
  thrown: true,
  two_handed: false,
  ammunition: false,
  ammunition_kind: null,
  range: { kind: 'ranged', near_feet: 20, far_feet: 60 },
  mastery_property: 'Vex',
  other_properties: canonicalRuleText(
    'Conductive.  \r\nOnly in storms.   \r\n',
  ),
};

const armorPayload: EquipmentProjectorPayloadV1<'armor'> = {
  category: 'medium',
  armor_class: 15,
  dex_bonus: 'capped',
  dex_bonus_max: 2,
  strength_requirement: 11,
  stealth_disadvantage: false,
};

const itemPayload: EquipmentProjectorPayloadV1<'item'> = {
  description: canonicalRuleText('Raises strength.  \r\nWhile worn.   \r\n'),
  requires_attunement: true,
  effects: contentIdentitySequence([{
    kind: 'ability_override',
    ability: 'strength',
    maximum: 23,
    label: 'Giant strength',
    notes: canonicalRuleText('Applies while worn.  \r\n'),
  }]),
};

export interface EquipmentProjectorVectorV1<
  K extends EquipmentContentAggregate['kind'],
> {
  readonly label: string;
  readonly kind: K;
  readonly aggregate: Extract<EquipmentContentAggregate, { readonly kind: K }>;
  readonly payload: EquipmentProjectorPayloadV1<K>;
  readonly canonicalJson: string;
  readonly sha256: string;
  readonly derivedKey: string;
}

/**
 * HAND-PINNED ORACLES. Payload objects below are hand-constructed from the
 * contract, then their reviewed canonical literals are hashed independently.
 * Production projector output is never used to create an expectation.
 */
export const equipmentProjectorV1Vectors = [
  {
    label: 'weapon includes every rules-bearing template value',
    kind: 'weapon',
    aggregate: weaponAggregate,
    payload: weaponPayload,
    canonicalJson: '{"edition":"expanded","kind":"weapon","normalizedName":"stormpike","payload":{"ammunition":false,"ammunition_kind":null,"damage":{"dice":"1d8","kind":"dice"},"damage_type":"Storm  Fire","finesse":false,"heavy":false,"light":false,"loading":false,"mastery_property":"Vex","other_properties":"Conductive.\\nOnly in storms.","range":{"far_feet":60,"kind":"ranged","near_feet":20},"reach":true,"srd_group":"martial_melee","thrown":true,"two_handed":false,"versatile_damage":{"dice":"1d10","kind":"dice"}},"scheme":"content-v1"}',
    sha256: 'cb4504cc1eda4f7a17bc453f3d0e12e670cdbff4c17591d7ed7dd7ba9001b612',
    derivedKey: 'expanded:content.v1:cb4504cc1eda4f7a17bc453f3d0e12e670cdbff4c17591d7ed7dd7ba9001b612',
  },
  {
    label: 'armor includes correlated Dexterity and Strength mechanics',
    kind: 'armor',
    aggregate: armorAggregate,
    payload: armorPayload,
    canonicalJson: '{"edition":"expanded","kind":"armor","normalizedName":"mirrorcoat","payload":{"armor_class":15,"category":"medium","dex_bonus":"capped","dex_bonus_max":2,"stealth_disadvantage":false,"strength_requirement":11},"scheme":"content-v1"}',
    sha256: 'e3345537bf120394ca7d9cd25de458c0e1187bb9034bed7142c1aa4d1b6ee0ed',
    derivedKey: 'expanded:content.v1:e3345537bf120394ca7d9cd25de458c0e1187bb9034bed7142c1aa4d1b6ee0ed',
  },
  {
    label: 'item includes attunement and the complete D83 effect',
    kind: 'item',
    aggregate: itemAggregate,
    payload: itemPayload,
    canonicalJson: '{"edition":"expanded","kind":"item","normalizedName":"giantbelt","payload":{"description":"Raises strength.\\nWhile worn.","effects":[{"ability":"strength","kind":"ability_override","label":"Giant strength","maximum":23,"notes":"Applies while worn."}],"requires_attunement":true},"scheme":"content-v1"}',
    sha256: 'a88a69f21ac82f188080dafb54bba2b508667d08087355dada89c9ab69f0bc75',
    derivedKey: 'expanded:content.v1:a88a69f21ac82f188080dafb54bba2b508667d08087355dada89c9ab69f0bc75',
  },
] as const;
