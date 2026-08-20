import { z } from 'zod';
import {
  STARTER_ART_ATTRIBUTION,
  STARTER_ART_CREATOR,
  STARTER_ART_LICENSE,
  STARTER_ART_LICENSE_URL,
  STARTER_ART_TITLE,
} from './attribution';
import { assetIdSchema, type AssetId } from './ids';
import {
  STARTER_ART_GENERATOR_ID,
  STARTER_ART_GENERATOR_VERSION,
  STARTER_ART_INPUT_SET_ID,
  STARTER_ART_INPUTS,
} from './starter-art-inputs';

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const outputPathSchema = z.string().regex(
  /^assets\/art\/[a-z0-9]+(?:[.-][a-z0-9]+)*\.svg$/u,
  'Bundled starter-art outputs must stay under assets/art/.',
);

const artLicenseSchema = z.strictObject({
  spdx: z.literal(STARTER_ART_LICENSE),
  version: z.literal('4.0 International'),
  authorizationUrl: z.literal(STARTER_ART_LICENSE_URL),
  attributionRequired: z.literal(true),
  bundledLicenseOutput: z.literal('licenses/CC-BY-4.0.txt'),
});

const artManifestAssetSchema = z.strictObject({
  id: assetIdSchema,
  title: z.string().min(1),
  kind: z.enum(['token', 'map', 'terrain', 'fog', 'focus', 'event']),
  license: artLicenseSchema,
  attributionText: z.literal(STARTER_ART_ATTRIBUTION),
  source: z.strictObject({
    type: z.literal('procedural'),
    creator: z.literal(STARTER_ART_CREATOR),
    collectionTitle: z.literal(STARTER_ART_TITLE),
    generatorId: z.literal(STARTER_ART_GENERATOR_ID),
    generatorVersion: z.literal(STARTER_ART_GENERATOR_VERSION),
    inputSetId: z.literal(STARTER_ART_INPUT_SET_ID),
    inputId: assetIdSchema,
    fixedInputsSha256: sha256Schema,
  }),
  output: z.strictObject({
    path: outputPathSchema,
    mediaType: z.literal('image/svg+xml'),
    width: z.literal(64),
    height: z.literal(64),
    sha256: sha256Schema,
  }),
});

export const artManifestSchema = z.strictObject({
  schemaVersion: z.literal(1),
  generator: z.strictObject({
    id: z.literal(STARTER_ART_GENERATOR_ID),
    version: z.literal(STARTER_ART_GENERATOR_VERSION),
    fixedInputSet: z.literal(STARTER_ART_INPUT_SET_ID),
    fixedInputsSha256: sha256Schema,
  }),
  assets: z.array(artManifestAssetSchema).min(1),
}).superRefine((manifest, context) => {
  const ids = new Set<string>();
  const paths = new Set<string>();
  for (const [index, asset] of manifest.assets.entries()) {
    if (ids.has(asset.id)) {
      context.addIssue({ code: 'custom', path: ['assets', index, 'id'], message: `Duplicate asset id ${asset.id}.` });
    }
    if (paths.has(asset.output.path)) {
      context.addIssue({ code: 'custom', path: ['assets', index, 'output', 'path'], message: `Duplicate art output ${asset.output.path}.` });
    }
    if (asset.id !== asset.source.inputId) {
      context.addIssue({ code: 'custom', path: ['assets', index, 'source', 'inputId'], message: 'A manifest row must point to the fixed input with the same stable id.' });
    }
    ids.add(asset.id);
    paths.add(asset.output.path);
  }
});

export type ArtManifest = z.infer<typeof artManifestSchema>;
export type ArtManifestAsset = ArtManifest['assets'][number];

const FIXED_INPUTS_SHA256 =
  'd9cff02ebf9d1b985d223979e0798458c1cde26abf53e4ffafdd2c1a09fdec47';

const output = (
  path: `assets/art/${string}.svg`,
  sha256: string = '0000000000000000000000000000000000000000000000000000000000000000',
) => ({ path, sha256 });

const OUTPUT_ROWS: readonly (readonly [string, ReturnType<typeof output>])[] = [
  ['art.token.pc.fighter.v1', output('assets/art/pc-fighter-v1.svg', 'f89bb8e2e60d0bea64281fba52f64768400c9a9a55dbd79ca6da2355924ccf8c')],
  ['art.token.pc.cleric.v1', output('assets/art/pc-cleric-v1.svg', '72e518c752f0cc7c87333b462c1b9fcc32073204a42c048796f94743bf295666')],
  ['art.token.pc.wizard.v1', output('assets/art/pc-wizard-v1.svg', '6727c9ad4dbac9a693c14dc41e79330099bc81923e4ba4b46993c10678ae3f12')],
  ['art.token.pc.rogue.v1', output('assets/art/pc-rogue-v1.svg', '325ab717045c426edbed576a811255efc867865447b1c29ba8a64f0132e97646')],
  ['art.token.monster.goblin-warrior.v1', output('assets/art/monster-goblin-warrior-v1.svg', '23b3e6f4cbaf3534e19f21c3b369e3b26c80fd2eb44f046a82a4740910f923e2')],
  ['art.token.monster.hobgoblin-warrior.v1', output('assets/art/monster-hobgoblin-warrior-v1.svg', 'b5e40faee7d9815d6e2adcaa0d96695c0854092b9e93d6c00e1368aa9edeecf9')],
  ['art.token.monster.bandit-captain.v1', output('assets/art/monster-bandit-captain-v1.svg', '412cfba96a8facab063751c6d4dacacf45c39e72cf8e8d655156bd64b7e7cbbe')],
  ['art.token.monster.ogre.v1', output('assets/art/monster-ogre-v1.svg', 'c971dff76bfd1da3d86c8e1981b127907d51000dab111ac530450c6c2647c4a1')],
  ['art.token.monster.priest-acolyte.v1', output('assets/art/monster-priest-acolyte-v1.svg', 'b720b50a9e2d8cfd12312dc46147d9441d3376c7498cc4fb6f8c311daf0c0a32')],
  ['art.token.monster.priest.v1', output('assets/art/monster-priest-v1.svg', 'af7e8bc515de0128e2df3494e2fdb985d23519cb4de12d1ce03c3ca8ae3ca126')],
  ['art.token.monster.skeleton.v1', output('assets/art/monster-skeleton-v1.svg', '53e905e2360ba2e1b473eda08e760383a9cb4c43d387f66c61243f588e1517eb')],
  ['art.token.monster.zombie.v1', output('assets/art/monster-zombie-v1.svg', '0b903ae8cf7fa7119493f46acc64241cbcd206108189bc18e5fd1b276abd5c73')],
  ['art.token.monster.wolf.v1', output('assets/art/monster-wolf-v1.svg', '6b233e785d3b123780954e03a8a6b9b2a3d8c6271b31cc891f3d14da96973be7')],
  ['art.map.floor.stone.v1', output('assets/art/map-floor-stone-v1.svg', '00321d465ecc64f86255a6b5d5f136cfab8086da354c648b3fcf26e9620e3ddb')],
  ['art.map.wall.stone.v1', output('assets/art/map-wall-stone-v1.svg', 'fee533481dce13be592dc07c75c352c8a4c59cab128d14352e474465c6364952')],
  ['art.map.door.wood.v1', output('assets/art/map-door-wood-v1.svg', '0fda459bc613fd25c6aa185fc31a15aa663ec2aad87de83c044e62b571ad3941')],
  ['art.terrain.rubble.v1', output('assets/art/terrain-rubble-v1.svg', 'a370f67bd4556c619ffa8f3a7bf0211e1bc5326b8106e3855567ac1365912f04')],
  ['art.terrain.crate.v1', output('assets/art/terrain-crate-v1.svg', 'f880dd75b623f48cbd1f420a76ed43769f60f2ced80b6fddedef8c8ce1ccdd79')],
  ['art.terrain.pillar.v1', output('assets/art/terrain-pillar-v1.svg', '890d056d9db7c4e473a12c5a9a73f0961cd054ff6a948e6dd8faed8d38eb4be6')],
  ['art.terrain.hazard.v1', output('assets/art/terrain-hazard-v1.svg', '0c9f9caab30ff99ed7308598c56f7efa5f958ff1f65a4cd81e13b5955bf20439')],
  ['art.fog.hidden.v1', output('assets/art/fog-hidden-v1.svg', 'cce6585b26d50b6b787de4dd59d11fdc8b4fc5670cc7e889fcbdd20e078b56f5')],
  ['art.fog.unexplored.v1', output('assets/art/fog-unexplored-v1.svg', '35a18d5ca8a0907e6006d848564e6959d2e9ab32a89ed189e7d1857e8b076e55')],
  ['art.fog.revealed.v1', output('assets/art/fog-revealed-v1.svg', '32c3ddad76335862f3598c33ff591446a5dac85b16adedeff82d2dc68112313b')],
  ['art.focus.active-pc.v1', output('assets/art/focus-active-pc-v1.svg', '3a881e66a865725da560c9a21d1dcfc92f524382c836146f817e59264b00354d')],
  ['art.event.adjudicated.v1', output('assets/art/event-adjudicated-v1.svg', '86456cb35ce7cbdbc228cf751c8908c6c1da6d4ea83022c29c7b027ef1c6f0a4')],
];

const OUTPUT_BY_ID: ReadonlyMap<AssetId, ReturnType<typeof output>> = new Map(
  OUTPUT_ROWS.map(([id, value]) => [assetIdSchema.parse(id), value] as const),
);

const rawManifest = {
  schemaVersion: 1,
  generator: {
    id: STARTER_ART_GENERATOR_ID,
    version: STARTER_ART_GENERATOR_VERSION,
    fixedInputSet: STARTER_ART_INPUT_SET_ID,
    fixedInputsSha256: FIXED_INPUTS_SHA256,
  },
  assets: STARTER_ART_INPUTS.map((entry) => {
    const generatedOutput = OUTPUT_BY_ID.get(entry.id);
    if (generatedOutput === undefined) throw new Error(`No output is declared for ${entry.id}.`);
    return {
      id: entry.id,
      title: entry.title,
      kind: entry.kind,
      license: {
        spdx: STARTER_ART_LICENSE,
        version: '4.0 International',
        authorizationUrl: STARTER_ART_LICENSE_URL,
        attributionRequired: true,
        bundledLicenseOutput: 'licenses/CC-BY-4.0.txt',
      },
      attributionText: STARTER_ART_ATTRIBUTION,
      source: {
        type: 'procedural',
        creator: STARTER_ART_CREATOR,
        collectionTitle: STARTER_ART_TITLE,
        generatorId: STARTER_ART_GENERATOR_ID,
        generatorVersion: STARTER_ART_GENERATOR_VERSION,
        inputSetId: STARTER_ART_INPUT_SET_ID,
        inputId: entry.id,
        fixedInputsSha256: FIXED_INPUTS_SHA256,
      },
      output: {
        path: generatedOutput.path,
        mediaType: 'image/svg+xml',
        width: 64,
        height: 64,
        sha256: generatedOutput.sha256,
      },
    };
  }),
};

export function decodeArtManifest(value: unknown): ArtManifest {
  return artManifestSchema.parse(value);
}

export const STARTER_ART_MANIFEST = decodeArtManifest(rawManifest);
