import { z } from 'zod';
import {
  STARTER_ART_ATTRIBUTION,
  STARTER_ART_CREATOR,
  STARTER_ART_LICENSE,
  STARTER_ART_LICENSE_URL,
  STARTER_ART_TITLE,
} from './attribution';
import { assetIdSchema, type AssetId } from './ids';
import { TILE_SIZE } from './pixel-art';
import {
  STARTER_ART_GENERATOR_ID,
  STARTER_ART_GENERATOR_VERSION,
  STARTER_ART_INPUT_SET_ID,
  STARTER_ART_INPUTS,
} from './starter-art-inputs';
import { STARTER_ART_OUTPUT_SHA256 } from './starter-art-output-hashes';

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const outputPathSchema = z.string().regex(
  /^assets\/art\/[a-z0-9]+(?:[.-][a-z0-9]+)*\.png$/u,
  'Bundled starter-art outputs must stay under assets/art/.',
);

const artLicenseSchema = z.strictObject({
  spdx: z.literal(STARTER_ART_LICENSE),
  version: z.literal('1.0 Universal'),
  authorizationUrl: z.literal(STARTER_ART_LICENSE_URL),
  attributionRequired: z.literal(false),
  bundledLicenseOutput: z.literal('LICENSE-ART'),
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
    mediaType: z.literal('image/png'),
    width: z.literal(TILE_SIZE),
    height: z.literal(TILE_SIZE),
    sha256: sha256Schema,
  }),
});

export const artManifestSchema = z.strictObject({
  schemaVersion: z.literal(2),
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

/** sha256 of src/assets/starter-art-inputs.ts; the fixed-input identity of this manifest. */
export const FIXED_INPUTS_SHA256 = STARTER_ART_OUTPUT_SHA256.fixedInputs;

/** `art.token.pc.fighter.v1` → `assets/art/token-pc-fighter-v1.png`. */
export function starterArtOutputPath(id: AssetId): `assets/art/${string}.png` {
  const slug = String(id).replace(/^art\./u, '').replaceAll('.', '-');
  return `assets/art/${slug}.png`;
}

const rawManifest = {
  schemaVersion: 2,
  generator: {
    id: STARTER_ART_GENERATOR_ID,
    version: STARTER_ART_GENERATOR_VERSION,
    fixedInputSet: STARTER_ART_INPUT_SET_ID,
    fixedInputsSha256: FIXED_INPUTS_SHA256,
  },
  assets: STARTER_ART_INPUTS.map((entry) => {
    const sha256 = STARTER_ART_OUTPUT_SHA256.outputs[entry.id];
    if (sha256 === undefined) throw new Error(`No output digest is declared for ${entry.id}.`);
    return {
      id: entry.id,
      title: entry.title,
      kind: entry.kind,
      license: {
        spdx: STARTER_ART_LICENSE,
        version: '1.0 Universal',
        authorizationUrl: STARTER_ART_LICENSE_URL,
        attributionRequired: false,
        bundledLicenseOutput: 'LICENSE-ART',
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
        path: starterArtOutputPath(entry.id),
        mediaType: 'image/png',
        width: TILE_SIZE,
        height: TILE_SIZE,
        sha256,
      },
    };
  }),
};

export function decodeArtManifest(value: unknown): ArtManifest {
  return artManifestSchema.parse(value);
}

export const STARTER_ART_MANIFEST = decodeArtManifest(rawManifest);
