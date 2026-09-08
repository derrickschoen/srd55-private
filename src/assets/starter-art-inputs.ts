import { assetId, type AssetId } from './ids';
import {
  BAND_SIDES,
  DOOR_STATES,
  FLOOR_VARIANTS,
  FOG_STATES,
  OVERLAY_EFFECTS,
  TERRAIN_OBJECTS,
  TOKEN_ARCHETYPES,
  TOKEN_SIDES,
  WALL_PIECES,
  type ArtRecipe,
  type TokenArchetype,
  type TokenSide,
  terrainRecipe,
  tokenRecipe,
} from './pixel-art';

export const STARTER_ART_GENERATOR_ID = 'starter-pixel-art' as const;
/** Native 128×128 recipes with typed material response and directional light. */
export const STARTER_ART_GENERATOR_VERSION = '4.0.0' as const;
export const STARTER_ART_INPUT_SET_ID = 'starter-art-inputs-v4' as const;

export type StarterArtKind =
  | 'token'
  | 'map'
  | 'terrain'
  | 'fog'
  | 'focus'
  | 'event';

export interface StarterArtInput {
  readonly id: AssetId;
  readonly title: string;
  readonly kind: StarterArtKind;
  /** The whole fixed input: the generator is a pure function of this value. */
  readonly recipe: ArtRecipe;
}

function input(id: string, title: string, kind: StarterArtKind, recipe: ArtRecipe): StarterArtInput {
  return Object.freeze({ id: assetId(id), title, kind, recipe });
}

const SIDE_TITLES = { n: 'north', s: 'south', w: 'west', e: 'east' } as const;

const floors: readonly StarterArtInput[] = FLOOR_VARIANTS.map((variant) => input(
  variant === 0 ? 'art.map.floor.stone.v1' : `art.map.floor.stone-${String(variant)}.v1`,
  `Stone floor, slab layout ${String(variant + 1)}`,
  'map',
  { kind: 'floor', material: 'stone', variant },
));

const walls: readonly StarterArtInput[] = WALL_PIECES.map((piece) => input(
  piece === 'n' ? 'art.map.wall.stone.v1' : `art.map.wall.stone-${piece}.v1`,
  `Stone wall band, ${piece} piece`,
  'map',
  { kind: 'wall', material: 'stone', piece },
));

const doors: readonly StarterArtInput[] = DOOR_STATES.flatMap((state) => BAND_SIDES.map((side) => input(
  state === 'closed'
    ? side === 'n' ? 'art.map.door.wood.v1' : `art.map.door.wood-${side}.v1`
    : `art.map.door.wood-open-${side}.v1`,
  `Wooden door, ${state}, ${SIDE_TITLES[side]} wall`,
  'map',
  { kind: 'door', material: 'wood', side, state },
)));

const shades: readonly StarterArtInput[] = BAND_SIDES.map((side) => input(
  `art.map.shade.${side}.v1`,
  `Ambient-occlusion band below a ${SIDE_TITLES[side]} wall`,
  'map',
  { kind: 'shade', material: 'shadow', side },
));

const overlays: readonly StarterArtInput[] = OVERLAY_EFFECTS.map((effect) => input(
  `art.map.overlay.${effect}.v1`,
  `Mechanical overlay: ${effect.replaceAll('-', ' ')}`,
  'map',
  { kind: 'overlay', material: 'semantic', effect },
));

const terrain: readonly StarterArtInput[] = TERRAIN_OBJECTS.map((object) => input(
  `art.terrain.${object}.v1`,
  `${object[0]!.toUpperCase()}${object.slice(1)} terrain`,
  'terrain',
  terrainRecipe(object),
));

const fog: readonly StarterArtInput[] = FOG_STATES.map((state) => input(
  `art.fog.${state}.v1`,
  `${state[0]!.toUpperCase()}${state.slice(1)} fog`,
  'fog',
  { kind: 'fog', material: 'fog', state },
));

const ui: readonly StarterArtInput[] = [
  input('art.focus.active-pc.v1', 'Active combatant focus ring', 'focus', { kind: 'focus', material: 'semantic', mark: 'active' }),
  input('art.focus.hidden.v1', 'Hidden-from-players dashed ring', 'focus', { kind: 'focus', material: 'semantic', mark: 'hidden' }),
  input('art.event.adjudicated.v1', 'ADJUDICATED highlight', 'event', { kind: 'event', material: 'semantic', mark: 'adjudicated' }),
];

function tokenInput(id: string, title: string, archetype: TokenArchetype, side: TokenSide): StarterArtInput {
  return input(id, title, 'token', tokenRecipe(archetype, side));
}

/** Ids the approved fixtures already name; each now renders an archetype bust. */
const namedTokens: readonly StarterArtInput[] = [
  tokenInput('art.token.pc.fighter.v1', 'Fighter bust', 'fighter', 'party'),
  tokenInput('art.token.pc.cleric.v1', 'Cleric bust', 'cleric', 'party'),
  tokenInput('art.token.pc.wizard.v1', 'Wizard bust', 'wizard', 'party'),
  tokenInput('art.token.pc.rogue.v1', 'Rogue bust', 'rogue', 'party'),
  tokenInput('art.token.monster.goblin-warrior.v1', 'Goblin Warrior bust', 'brute', 'foe'),
  tokenInput('art.token.monster.hobgoblin-warrior.v1', 'Hobgoblin Warrior bust', 'fighter', 'foe'),
  tokenInput('art.token.monster.bandit-captain.v1', 'Bandit Captain bust', 'fighter', 'foe'),
  tokenInput('art.token.monster.ogre.v1', 'Ogre bust', 'brute', 'foe'),
  tokenInput('art.token.monster.priest-acolyte.v1', 'Priest Acolyte bust', 'cleric', 'foe'),
  tokenInput('art.token.monster.priest.v1', 'Priest bust', 'cleric', 'foe'),
  tokenInput('art.token.monster.skeleton.v1', 'Skeleton bust', 'undead', 'foe'),
  tokenInput('art.token.monster.zombie.v1', 'Zombie bust', 'undead', 'foe'),
  tokenInput('art.token.monster.wolf.v1', 'Wolf bust', 'beast', 'foe'),
];

export function archetypeTokenAssetId(archetype: TokenArchetype, side: TokenSide): AssetId {
  return assetId(`art.token.${side}.${archetype}.v1`);
}

const archetypeTokens: readonly StarterArtInput[] = TOKEN_SIDES.flatMap((side) => TOKEN_ARCHETYPES.map((archetype) =>
  tokenInput(
    archetypeTokenAssetId(archetype, side),
    `${archetype[0]!.toUpperCase()}${archetype.slice(1)} bust, ${side} plate`,
    archetype,
    side,
  )));

export const DEAD_TOKEN_ASSET_ID: AssetId = assetId('art.token.dead.v1');

const deadToken = input(DEAD_TOKEN_ASSET_ID, 'Prone silhouette on a desaturated plate', 'token', { kind: 'token-dead', material: 'bone' });

export const STARTER_ART_INPUTS: readonly StarterArtInput[] = Object.freeze([
  ...namedTokens,
  ...archetypeTokens,
  deadToken,
  ...floors,
  ...walls,
  ...doors,
  ...shades,
  ...overlays,
  ...terrain,
  ...fog,
  ...ui,
]);

export const STARTER_ART_INPUTS_BY_ID: ReadonlyMap<AssetId, StarterArtInput> =
  new Map(STARTER_ART_INPUTS.map((entry) => [entry.id, entry] as const));
