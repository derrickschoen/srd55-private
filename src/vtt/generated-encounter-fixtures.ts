import { z } from 'zod';
import { assetIdSchema, type AssetId } from '../assets/ids';
import { STARTER_ART_MANIFEST } from '../assets/starter-art-manifest';
import { resolveStarterArt } from '../assets/starter-art-resolver';
import {
  AlgorithmController,
  ControllerRegistry,
} from '../combat/controllers';
import {
  TurnCoordinator,
  type TurnLegalActions,
} from '../combat/coordinator';
import {
  combatToken,
  monsterCombatantProfile,
  type CombatantProfile,
} from '../combat/combatant';
import {
  createEncounter,
  DEFAULT_ENCOUNTER_CONFIG,
  type EncounterConfig,
  type EncounterState,
} from '../combat/encounter';
import type { GridCell } from '../combat/grid';
import { mulberry32, type SerializableRng } from '../combat/random';
import type { ChallengeRating } from '../combat/statblock';
import { STARTER_MONSTER_ROSTER } from '../combat/statblocks/roster';
import {
  combatantId,
  tokenId,
  type CombatantId,
} from '../combat/values';
import { canonicalJson } from '../commands/canonical-json';
import { sha256 } from '../crypto/sha256';
import type { EncounterArtPackage } from './encounter-package';
import {
  isAttestedOwnerApproverIdentity,
  type OwnerApproverIdentity,
} from './encounter-owner-approval';
import {
  REFERENCE_PLAYER_IDS,
  referenceEncounterSetup,
} from './reference-encounter';
import { partySourceSchema } from './party-pack';

const nonEmptyTextSchema = z.string().min(1).refine(
  (value) => value.trim() === value,
  'Text must be trimmed.',
);
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const cellSchema = z.strictObject({
  column: z.number().int().nonnegative(),
  row: z.number().int().nonnegative(),
});
const encounterSectionSchema = z.enum(['roster', 'layout', 'tactics']);

export const encounterDifficultyRequestSchema = z.strictObject({
  rounds: z.union([z.literal(3), z.literal(4), z.literal(5)]),
  pressure: z.enum(['low', 'moderate', 'high']),
});

export const encounterGenerationRequestSchema = z.strictObject({
  schemaVersion: z.literal(1),
  partySource: partySourceSchema,
  difficulty: encounterDifficultyRequestSchema,
  brief: nonEmptyTextSchema,
});

const rosterEntrySchema = z.strictObject({
  combatantId: nonEmptyTextSchema,
  tokenId: nonEmptyTextSchema,
  statblockId: nonEmptyTextSchema,
  role: z.enum([
    'ambusher',
    'artillery',
    'bruiser',
    'controller',
    'defender',
    'leader',
    'skirmisher',
  ]),
});

const terrainEntrySchema = z.strictObject({
  id: z.string().regex(/^terrain:[a-z0-9-]+$/u),
  cell: cellSchema,
  kind: z.enum(['blocking', 'cover', 'difficult', 'hazard']),
  blocksMovement: z.boolean(),
  assetId: assetIdSchema,
});

const generatedRevisionSchema = z.strictObject({
  kind: z.literal('generated'),
  sections: z.tuple([
    z.literal('roster'),
    z.literal('layout'),
    z.literal('tactics'),
  ]),
  sessionId: nonEmptyTextSchema,
  exchangeId: nonEmptyTextSchema,
});

const targetedRevisionSchema = z.strictObject({
  kind: z.literal('targeted_regeneration'),
  sections: z.tuple([encounterSectionSchema]),
  sessionId: nonEmptyTextSchema,
  exchangeId: nonEmptyTextSchema,
});

const manualRevisionSchema = z.strictObject({
  kind: z.literal('manual_patch'),
  fields: z.array(nonEmptyTextSchema).min(1),
  author: nonEmptyTextSchema,
});

const provenanceRevisionSchema = z.discriminatedUnion('kind', [
  generatedRevisionSchema,
  targetedRevisionSchema,
  manualRevisionSchema,
]);

const packageShapeSchema = z.strictObject({
  schemaVersion: z.literal(1),
  request: encounterGenerationRequestSchema,
  generationPrompt: nonEmptyTextSchema,
  roster: z.array(rosterEntrySchema).min(4).max(6),
  layout: z.strictObject({
    map: z.strictObject({
      columns: z.number().int().min(5).max(64),
      rows: z.number().int().min(5).max(64),
      floorAssetId: assetIdSchema,
      wallAssetId: assetIdSchema,
      doorAssetId: assetIdSchema,
      doorCell: cellSchema,
    }),
    placement: z.array(z.strictObject({
      combatantId: nonEmptyTextSchema,
      cell: cellSchema,
    })).min(1),
    terrain: z.array(terrainEntrySchema),
    fog: z.strictObject({
      hiddenAssetId: assetIdSchema,
      unexploredAssetId: assetIdSchema,
      revealedAssetId: assetIdSchema,
      cells: z.array(cellSchema),
    }),
    ui: z.strictObject({
      activePcAssetId: assetIdSchema,
      adjudicatedAssetId: assetIdSchema,
    }),
    combatantTokens: z.record(nonEmptyTextSchema, assetIdSchema),
  }),
  tactics: z.strictObject({
    objective: nonEmptyTextSchema,
    exitConditions: z.array(nonEmptyTextSchema).min(1),
    notes: z.array(nonEmptyTextSchema).min(1),
    combatantPlans: z.array(z.strictObject({
      combatantId: nonEmptyTextSchema,
      priorities: z.array(nonEmptyTextSchema).min(1),
    })).min(4),
  }),
  provenance: z.strictObject({
    generator: z.literal('codex-dm'),
    model: nonEmptyTextSchema,
    effort: nonEmptyTextSchema,
    revisions: z.array(provenanceRevisionSchema).min(1),
  }),
});

const STARTER_STATBLOCKS: ReadonlyMap<
  string,
  (typeof STARTER_MONSTER_ROSTER)[number]
> = new Map(
  STARTER_MONSTER_ROSTER.map((row) => [row.id, row] as const),
);
const REFERENCE_PC_IDS = new Set<string>(REFERENCE_PLAYER_IDS);
const REFERENCE_PC_ASSETS: Readonly<Record<string, AssetId>> = {
  'combatant:fighter': assetIdSchema.parse('art.token.pc.fighter.v1'),
  'combatant:cleric': assetIdSchema.parse('art.token.pc.cleric.v1'),
  'combatant:wizard': assetIdSchema.parse('art.token.pc.wizard.v1'),
};

function cellKey(cell: GridCell): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

function challengeNumber(value: ChallengeRating): number {
  switch (value) {
    case '1/8': return 0.125;
    case '1/4': return 0.25;
    case '1/2': return 0.5;
    case 1: return 1;
    case 2: return 2;
    case 3: return 3;
    case 4: return 4;
    case 5: return 5;
    case 6: return 6;
  }
}

function statblockXp(id: string): number {
  const row = STARTER_STATBLOCKS.get(id);
  if (row === undefined) throw new Error(`Unknown approved starter statblock id ${id}.`);
  const challenge = row.statblock.sourceDetails.challenge;
  if (challenge.kind === 'absent') {
    throw new Error(`Approved starter statblock ${id} has no decoded XP.`);
  }
  return challenge.value.experiencePoints;
}

function statblockChallenge(id: string): number {
  const row = STARTER_STATBLOCKS.get(id);
  if (row === undefined) throw new Error(`Unknown approved starter statblock id ${id}.`);
  return challengeNumber(row.challengeRating);
}

function isInside(
  bounds: { readonly columns: number; readonly rows: number },
  cell: GridCell,
): boolean {
  return cell.column < bounds.columns && cell.row < bounds.rows;
}

function assertUnique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) throw new Error(`${label} must be unique.`);
}

function assertAssetKind(id: AssetId, expected: string): void {
  const resolved = resolveStarterArt(id);
  if (resolved.manifest.kind !== expected) {
    throw new Error(`Asset ${id} must be ${expected}, not ${resolved.manifest.kind}.`);
  }
}

export type EncounterDifficultyRequest = z.infer<typeof encounterDifficultyRequestSchema>;
export type EncounterGenerationRequest = z.infer<typeof encounterGenerationRequestSchema>;
export type GeneratedEncounterPackage = z.infer<typeof packageShapeSchema>;
export type EncounterPackageSection = z.infer<typeof encounterSectionSchema>;

export interface EncounterDifficultyAssessment {
  readonly status: 'deterministic_pass_calibration_pending';
  readonly request: EncounterDifficultyRequest;
  readonly deterministic: {
    readonly partyCount: 3;
    readonly partyLevels: readonly [7, 7, 7];
    readonly budgets: { readonly low: 2250; readonly moderate: 3900; readonly high: 5100 };
    readonly requestedBand: { readonly lowerExclusive: number | null; readonly upperInclusive: number };
    readonly encounterXp: number;
    readonly totalChallengeRating: number;
    readonly lazyDeadlyLine: 10;
    readonly dangerCrossCheck: boolean;
  };
  readonly simulation: {
    readonly terminalRoundDistribution: {
      readonly kind: 'unavailable';
      readonly residual: 'TODO(sim-calibration: rounds)';
    };
    readonly resourcePressureVector: {
      readonly kind: 'unavailable';
      readonly residual: 'TODO(sim-calibration: pressure)';
    };
    readonly materialOpportunityEvidence: {
      readonly kind: 'unavailable';
      readonly residual: 'TODO(sim-calibration: action economy and initiative)';
    };
  };
}

export const ENCOUNTER_CALIBRATION_RESIDUALS = [
  'TODO(sim-calibration: rounds)',
  'TODO(sim-calibration: pressure)',
  'TODO(sim-calibration: action economy and initiative)',
] as const;

export const REFERENCE_ENCOUNTER_XP_BUDGETS = {
  low: 2250,
  moderate: 3900,
  high: 5100,
} as const;

export const ENCOUNTER_MONSTER_COUNT_RANGE = {
  minimum: 4,
  maximum: 6,
} as const;

export function referenceEncounterXpBand(pressure: EncounterDifficultyRequest['pressure']): {
  readonly lowerExclusive: number | null;
  readonly upperInclusive: number;
} {
  switch (pressure) {
    case 'low': return { lowerExclusive: null, upperInclusive: REFERENCE_ENCOUNTER_XP_BUDGETS.low };
    case 'moderate': return {
      lowerExclusive: REFERENCE_ENCOUNTER_XP_BUDGETS.low,
      upperInclusive: REFERENCE_ENCOUNTER_XP_BUDGETS.moderate,
    };
    case 'high': return {
      lowerExclusive: REFERENCE_ENCOUNTER_XP_BUDGETS.moderate,
      upperInclusive: REFERENCE_ENCOUNTER_XP_BUDGETS.high,
    };
  }
}

function xpMatchesBand(xp: number, pressure: EncounterDifficultyRequest['pressure']): boolean {
  const band = referenceEncounterXpBand(pressure);
  return xp <= band.upperInclusive && (band.lowerExclusive === null || xp > band.lowerExclusive);
}

function requestIsBuildable(request: EncounterGenerationRequest): boolean {
  if (request.partySource !== 'reference') return false;
  const xpValues = [...new Set(STARTER_MONSTER_ROSTER.map((row) => statblockXp(row.id)))];
  const canFill = (count: number, total: number): boolean => {
    if (count === 0) return xpMatchesBand(total, request.difficulty.pressure);
    return xpValues.some((xp) => canFill(count - 1, total + xp));
  };
  return Array.from(
    { length: ENCOUNTER_MONSTER_COUNT_RANGE.maximum - ENCOUNTER_MONSTER_COUNT_RANGE.minimum + 1 },
    (_, index) => ENCOUNTER_MONSTER_COUNT_RANGE.minimum + index,
  ).some((count) => canFill(count, 0));
}

export function decodeEncounterGenerationRequest(value: unknown): EncounterGenerationRequest {
  const request = encounterGenerationRequestSchema.parse(value);
  if (request.partySource !== 'reference') {
    throw new Error(`External party pack ${request.partySource.packFile} requires the party-pack file loader.`);
  }
  if (!requestIsBuildable(request)) {
    throw new Error(`unbuildable_difficulty: ${request.difficulty.pressure}`);
  }
  return request;
}

export function buildEncounterGenerationPrompt(requestValue: unknown): string {
  const request = decodeEncounterGenerationRequest(requestValue);
  const band = referenceEncounterXpBand(request.difficulty.pressure);
  return canonicalJson({
    protocol: 'encounter-generation-v1',
    party: { source: 'reference', count: 3, levels: [7, 7, 7] },
    difficulty: request.difficulty,
    brief: request.brief,
    allowedStatblockIds: STARTER_MONSTER_ROSTER.map((row) => row.id),
    allowedAssetIds: STARTER_ART_MANIFEST.assets.map((asset) => asset.id),
    xpBand: band,
    lazyDeadlyLine: 10,
    constraints: {
      monsterCount: ENCOUNTER_MONSTER_COUNT_RANGE,
      roomCount: 1,
      completeSections: ['roster', 'layout', 'tactics'],
      mechanicsMustReferenceApprovedStatblocks: true,
      includeObjectivesExitConditionsTerrainFogAndRolePlans: true,
    },
  });
}

function validatePackageMechanics(value: GeneratedEncounterPackage): EncounterDifficultyAssessment {
  const expectedPrompt = buildEncounterGenerationPrompt(value.request);
  if (value.generationPrompt !== expectedPrompt) {
    throw new Error('Generated package did not preserve the exact generation prompt.');
  }
  if (value.provenance.revisions[0]?.kind !== 'generated') {
    throw new Error('Package provenance must start with the complete generation event.');
  }

  assertUnique(value.roster.map((entry) => entry.combatantId), 'Monster combatant ids');
  assertUnique(value.roster.map((entry) => entry.tokenId), 'Monster token ids');
  for (const entry of value.roster) {
    statblockXp(entry.statblockId);
    combatantId(entry.combatantId);
    tokenId(entry.tokenId);
  }

  const bounds = value.layout.map;
  if (!isInside(bounds, bounds.doorCell)) throw new Error('The map door is outside the room.');
  const doorOnPerimeter =
    bounds.doorCell.column === 0 ||
    bounds.doorCell.row === 0 ||
    bounds.doorCell.column === bounds.columns - 1 ||
    bounds.doorCell.row === bounds.rows - 1;
  if (!doorOnPerimeter) throw new Error('The map door must be on the room perimeter.');
  assertAssetKind(bounds.floorAssetId, 'map');
  assertAssetKind(bounds.wallAssetId, 'map');
  assertAssetKind(bounds.doorAssetId, 'map');

  assertUnique(value.layout.terrain.map((entry) => entry.id), 'Terrain ids');
  assertUnique(value.layout.terrain.map((entry) => cellKey(entry.cell)), 'Terrain cells');
  for (const entry of value.layout.terrain) {
    if (!isInside(bounds, entry.cell)) throw new Error(`Terrain ${entry.id} is outside the room.`);
    if ((entry.kind === 'blocking') !== entry.blocksMovement) {
      throw new Error(`Terrain ${entry.id} has an invalid movement policy.`);
    }
    assertAssetKind(entry.assetId, 'terrain');
  }

  assertUnique(value.layout.fog.cells.map(cellKey), 'Fog cells');
  for (const cell of value.layout.fog.cells) {
    if (!isInside(bounds, cell)) throw new Error('Fog cells must be inside the room.');
  }
  assertAssetKind(value.layout.fog.hiddenAssetId, 'fog');
  assertAssetKind(value.layout.fog.unexploredAssetId, 'fog');
  assertAssetKind(value.layout.fog.revealedAssetId, 'fog');
  assertAssetKind(value.layout.ui.activePcAssetId, 'focus');
  assertAssetKind(value.layout.ui.adjudicatedAssetId, 'event');

  const expectedCombatants = new Set([
    ...REFERENCE_PLAYER_IDS,
    ...value.roster.map((entry) => entry.combatantId),
  ]);
  assertUnique(value.layout.placement.map((entry) => entry.combatantId), 'Placement combatant ids');
  assertUnique(value.layout.placement.map((entry) => cellKey(entry.cell)), 'Placement cells');
  if (
    value.layout.placement.length !== expectedCombatants.size ||
    value.layout.placement.some((entry) => !expectedCombatants.has(entry.combatantId)) ||
    [...expectedCombatants].some((id) => !value.layout.placement.some((entry) => entry.combatantId === id))
  ) {
    throw new Error('Placement must contain every reference PC and roster monster exactly once.');
  }
  const blocked = new Set(
    value.layout.terrain.filter((entry) => entry.blocksMovement).map((entry) => cellKey(entry.cell)),
  );
  for (const entry of value.layout.placement) {
    combatantId(entry.combatantId);
    if (!isInside(bounds, entry.cell)) throw new Error(`Placement for ${entry.combatantId} is outside the room.`);
    if (blocked.has(cellKey(entry.cell))) throw new Error(`Placement for ${entry.combatantId} occupies blocking terrain.`);
  }
  const fogged = new Set(value.layout.fog.cells.map(cellKey));
  for (const placement of value.layout.placement) {
    if (REFERENCE_PC_IDS.has(placement.combatantId) && fogged.has(cellKey(placement.cell))) {
      throw new Error(`Reference PC ${placement.combatantId} cannot start in hidden fog.`);
    }
  }

  const tokenMappings = Object.entries(value.layout.combatantTokens);
  if (
    tokenMappings.length !== expectedCombatants.size ||
    tokenMappings.some(([id]) => !expectedCombatants.has(id)) ||
    [...expectedCombatants].some((id) => value.layout.combatantTokens[id] === undefined)
  ) {
    throw new Error('Combatant token assets must map every placed combatant exactly once.');
  }
  for (const [id, asset] of tokenMappings) {
    assertAssetKind(asset, 'token');
    const expectedPcAsset = REFERENCE_PC_ASSETS[id];
    if (expectedPcAsset !== undefined && asset !== expectedPcAsset) {
      throw new Error(`Reference PC ${id} has the wrong stable token asset.`);
    }
  }

  assertUnique(value.tactics.combatantPlans.map((entry) => entry.combatantId), 'Tactics combatant ids');
  const monsterIds = new Set(value.roster.map((entry) => entry.combatantId));
  if (
    value.tactics.combatantPlans.length !== monsterIds.size ||
    value.tactics.combatantPlans.some((entry) => !monsterIds.has(entry.combatantId)) ||
    [...monsterIds].some((id) => !value.tactics.combatantPlans.some((entry) => entry.combatantId === id))
  ) {
    throw new Error('DM tactics must contain one plan for every roster monster.');
  }

  const encounterXp = value.roster.reduce((total, entry) => total + statblockXp(entry.statblockId), 0);
  if (!xpMatchesBand(encounterXp, value.request.difficulty.pressure)) {
    throw new Error(`Encounter XP ${String(encounterXp)} is outside the requested ${value.request.difficulty.pressure} band.`);
  }
  const totalChallengeRating = value.roster.reduce(
    (total, entry) => total + statblockChallenge(entry.statblockId),
    0,
  );
  return {
    status: 'deterministic_pass_calibration_pending',
    request: value.request.difficulty,
    deterministic: {
      partyCount: 3,
      partyLevels: [7, 7, 7],
      budgets: REFERENCE_ENCOUNTER_XP_BUDGETS,
      requestedBand: referenceEncounterXpBand(value.request.difficulty.pressure),
      encounterXp,
      totalChallengeRating,
      lazyDeadlyLine: 10,
      dangerCrossCheck: totalChallengeRating > 10,
    },
    simulation: {
      terminalRoundDistribution: {
        kind: 'unavailable',
        residual: 'TODO(sim-calibration: rounds)',
      },
      resourcePressureVector: {
        kind: 'unavailable',
        residual: 'TODO(sim-calibration: pressure)',
      },
      materialOpportunityEvidence: {
        kind: 'unavailable',
        residual: 'TODO(sim-calibration: action economy and initiative)',
      },
    },
  };
}

export function validateGeneratedEncounterPackage(value: unknown): {
  readonly package: GeneratedEncounterPackage;
  readonly assessment: EncounterDifficultyAssessment;
} {
  const decoded = packageShapeSchema.parse(value);
  if (decoded.request.partySource !== 'reference') {
    throw new Error(`External party pack ${decoded.request.partySource.packFile} requires the party-pack file loader.`);
  }
  return { package: decoded, assessment: validatePackageMechanics(decoded) };
}

export interface EncounterGenerationExchange {
  generate(input: {
    readonly request: EncounterGenerationRequest;
    readonly prompt: string;
  }): Promise<unknown>;
}

export async function generateEncounterCandidate(
  requestValue: unknown,
  exchange: EncounterGenerationExchange,
): Promise<GeneratedEncounterPackage> {
  const request = decodeEncounterGenerationRequest(requestValue);
  const prompt = buildEncounterGenerationPrompt(request);
  const response = await exchange.generate({ request, prompt });
  const validated = validateGeneratedEncounterPackage(response);
  if (canonicalJson(validated.package.request) !== canonicalJson(request)) {
    throw new Error('Generated package request does not match the submitted request.');
  }
  return validated.package;
}

export interface EncounterSectionRegenerationExchange {
  regenerate(input: {
    readonly section: EncounterPackageSection;
    readonly package: GeneratedEncounterPackage;
  }): Promise<unknown>;
}

export async function regenerateEncounterSection(
  currentValue: unknown,
  section: EncounterPackageSection,
  exchange: EncounterSectionRegenerationExchange,
  metadata: { readonly sessionId: string; readonly exchangeId: string },
): Promise<GeneratedEncounterPackage> {
  const current = validateGeneratedEncounterPackage(currentValue).package;
  const replacement = await exchange.regenerate({ section, package: current });
  const candidate: GeneratedEncounterPackage = {
    ...current,
    [section]: replacement,
    provenance: {
      ...current.provenance,
      revisions: [...current.provenance.revisions, {
        kind: 'targeted_regeneration',
        sections: [section],
        sessionId: metadata.sessionId,
        exchangeId: metadata.exchangeId,
      }],
    },
  };
  return validateGeneratedEncounterPackage(candidate).package;
}

function patchRecordField(target: unknown, path: readonly string[], value: unknown): void {
  if (path.length === 0) throw new Error('Manual patch field path must be non-empty.');
  let cursor: unknown = target;
  for (const segment of path.slice(0, -1)) {
    if (
      typeof cursor !== 'object' ||
      cursor === null ||
      Array.isArray(cursor) ||
      !Object.hasOwn(cursor, segment)
    ) {
      throw new Error(`Manual patch path does not exist: ${path.join('.')}.`);
    }
    cursor = (cursor as Readonly<Record<string, unknown>>)[segment];
  }
  const field = path.at(-1);
  if (
    field === undefined ||
    typeof cursor !== 'object' ||
    cursor === null ||
    Array.isArray(cursor) ||
    !Object.hasOwn(cursor, field)
  ) {
    throw new Error(`Manual patch path does not exist: ${path.join('.')}.`);
  }
  (cursor as Record<string, unknown>)[field] = value;
}

export function manuallyPatchEncounterPackage(
  currentValue: unknown,
  patch: { readonly fieldPath: string; readonly value: unknown; readonly author: string },
): GeneratedEncounterPackage {
  const current = validateGeneratedEncounterPackage(currentValue).package;
  if (patch.fieldPath === 'provenance' || patch.fieldPath.startsWith('provenance.')) {
    throw new Error('Manual patches cannot rewrite provenance.');
  }
  const candidate: unknown = structuredClone(current);
  patchRecordField(candidate, patch.fieldPath.split('.'), patch.value);
  const record = candidate as Record<string, unknown>;
  const provenance = current.provenance;
  record.provenance = {
    ...provenance,
    revisions: [...provenance.revisions, {
      kind: 'manual_patch',
      fields: [patch.fieldPath],
      author: patch.author,
    }],
  };
  return validateGeneratedEncounterPackage(candidate).package;
}

const fixtureIdSchema = z.string().regex(/^encounter-fixture:sha256:[a-f0-9]{64}$/u);
const approvalEvidenceSchema = {
  packageSha256: sha256Schema,
  acknowledgedResiduals: z.tuple([
    z.literal('TODO(sim-calibration: rounds)'),
    z.literal('TODO(sim-calibration: pressure)'),
    z.literal('TODO(sim-calibration: action economy and initiative)'),
  ]),
} as const;
const approvalSchema = z.discriminatedUnion('status', [
  z.strictObject({
    status: z.literal('test_approved_with_calibration_residuals'),
    approver: z.strictObject({
      kind: z.literal('test'),
      approvalId: nonEmptyTextSchema,
    }),
    ...approvalEvidenceSchema,
  }),
  z.strictObject({
    status: z.literal('owner_approved_with_calibration_residuals'),
    approver: z.strictObject({
      kind: z.literal('owner'),
      approvalId: nonEmptyTextSchema,
    }),
    ...approvalEvidenceSchema,
  }),
]);
const approvedFixtureShapeSchema = z.strictObject({
  schemaVersion: z.literal(1),
  fixtureId: fixtureIdSchema,
  package: packageShapeSchema,
  assessment: z.custom<EncounterDifficultyAssessment>(),
  approval: approvalSchema,
});

export type EncounterFixtureId = z.infer<typeof fixtureIdSchema>;
export type ApprovedEncounterFixture = z.infer<typeof approvedFixtureShapeSchema>;

export interface TestApproverIdentity {
  readonly kind: 'test';
  readonly approvalId: string;
}

export type ApproverIdentity = TestApproverIdentity | OwnerApproverIdentity;

export function testApproverIdentity(approvalId: string): TestApproverIdentity {
  if (
    approvalId.trim() !== approvalId ||
    !approvalId.startsWith('test:') ||
    approvalId.length <= 5
  ) {
    throw new Error('Test approval ids must be trimmed and start with test:.');
  }
  return Object.freeze({ kind: 'test', approvalId });
}

export function approveEncounterPackage(
  packageValue: unknown,
  approver: ApproverIdentity,
): ApprovedEncounterFixture {
  const validated = validateGeneratedEncounterPackage(packageValue);
  const packageSha256 = sha256(canonicalJson(validated.package));
  if (
    approver.kind === 'owner' &&
    !isAttestedOwnerApproverIdentity(approver, packageSha256)
  ) {
    throw new Error('Owner approval identity lacks a trusted UI attestation for this package.');
  }
  return decodeApprovedEncounterFixture({
    schemaVersion: 1,
    fixtureId: `encounter-fixture:sha256:${packageSha256}`,
    package: validated.package,
    assessment: validated.assessment,
    approval: approver.kind === 'owner' ? {
      status: 'owner_approved_with_calibration_residuals',
      approver: { kind: approver.kind, approvalId: approver.approvalId },
      packageSha256,
      acknowledgedResiduals: ENCOUNTER_CALIBRATION_RESIDUALS,
    } : {
      status: 'test_approved_with_calibration_residuals',
      approver: { kind: approver.kind, approvalId: approver.approvalId },
      packageSha256,
      acknowledgedResiduals: ENCOUNTER_CALIBRATION_RESIDUALS,
    },
  });
}

export function decodeApprovedEncounterFixture(value: unknown): ApprovedEncounterFixture {
  const fixture = approvedFixtureShapeSchema.parse(value);
  const validated = validateGeneratedEncounterPackage(fixture.package);
  const packageSha256 = sha256(canonicalJson(validated.package));
  if (
    fixture.fixtureId !== `encounter-fixture:sha256:${packageSha256}` ||
    fixture.approval.packageSha256 !== packageSha256
  ) {
    throw new Error('Approved fixture identity does not match its exact package bytes.');
  }
  if (canonicalJson(fixture.assessment) !== canonicalJson(validated.assessment)) {
    throw new Error('Approved fixture difficulty assessment does not match the package.');
  }
  return fixture;
}

export interface ApprovedEncounterFixtureStore {
  put(fixtureId: EncounterFixtureId, bytes: string): void;
  get(fixtureId: EncounterFixtureId): string | null;
}

export class MemoryApprovedEncounterFixtureStore implements ApprovedEncounterFixtureStore {
  readonly #fixtures = new Map<EncounterFixtureId, string>();

  put(fixtureId: EncounterFixtureId, bytes: string): void {
    const existing = this.#fixtures.get(fixtureId);
    if (existing !== undefined && existing !== bytes) {
      throw new Error(`Content-addressed fixture ${fixtureId} cannot be overwritten.`);
    }
    this.#fixtures.set(fixtureId, bytes);
  }

  get(fixtureId: EncounterFixtureId): string | null {
    return this.#fixtures.get(fixtureId) ?? null;
  }
}

export function persistApprovedEncounterFixture(
  store: ApprovedEncounterFixtureStore,
  fixtureValue: unknown,
): string {
  const fixture = decodeApprovedEncounterFixture(fixtureValue);
  const bytes = canonicalJson(fixture);
  store.put(fixture.fixtureId, bytes);
  return bytes;
}

export function loadApprovedEncounterFixture(
  store: ApprovedEncounterFixtureStore,
  fixtureIdValue: string,
): { readonly fixture: ApprovedEncounterFixture; readonly bytes: string } {
  const fixtureId = fixtureIdSchema.parse(fixtureIdValue);
  const bytes = store.get(fixtureId);
  if (bytes === null) throw new Error(`Approved encounter fixture ${fixtureId} is not available offline.`);
  const parsed: unknown = JSON.parse(bytes);
  if (canonicalJson(parsed) !== bytes) throw new Error('Approved fixture bytes are not canonical.');
  const fixture = decodeApprovedEncounterFixture(parsed);
  if (fixture.fixtureId !== fixtureId) throw new Error('Approved fixture store returned the wrong identity.');
  return { fixture, bytes };
}

export function encounterArtFromApprovedFixture(
  fixtureValue: unknown,
): EncounterArtPackage {
  const fixture = decodeApprovedEncounterFixture(fixtureValue);
  const layout = fixture.package.layout;
  return {
    schemaVersion: 1,
    id: `encounter-art:fixture-${fixture.approval.packageSha256.slice(0, 12)}:v1`,
    room: {
      columns: layout.map.columns,
      rows: layout.map.rows,
      floor: layout.map.floorAssetId,
      wall: layout.map.wallAssetId,
      door: layout.map.doorAssetId,
      doorCell: layout.map.doorCell,
    },
    terrain: layout.terrain.map((entry) => ({ cell: entry.cell, asset: entry.assetId })),
    fog: {
      hidden: layout.fog.hiddenAssetId,
      unexplored: layout.fog.unexploredAssetId,
      revealed: layout.fog.revealedAssetId,
    },
    ui: {
      activePc: layout.ui.activePcAssetId,
      adjudicated: layout.ui.adjudicatedAssetId,
    },
    combatantTokens: layout.combatantTokens,
  };
}

function encounterProfiles(encounterPackage: GeneratedEncounterPackage): readonly CombatantProfile[] {
  const referencePcs = referenceEncounterSetup().combatants.filter(
    (profile) => profile.kind === 'player_character',
  );
  const monsters = encounterPackage.roster.map((entry) => {
    const row = STARTER_STATBLOCKS.get(entry.statblockId);
    if (row === undefined) throw new Error(`Unknown approved starter statblock id ${entry.statblockId}.`);
    return monsterCombatantProfile(row.statblock, {
      combatantId: entry.combatantId,
      tokenId: entry.tokenId,
    });
  });
  return [...referencePcs, ...monsters];
}

export function encounterStateFromApprovedFixture(
  fixtureValue: unknown,
  config: EncounterConfig = DEFAULT_ENCOUNTER_CONFIG,
): EncounterState {
  const fixture = decodeApprovedEncounterFixture(fixtureValue);
  const encounterPackage = fixture.package;
  const profiles = encounterProfiles(encounterPackage);
  const profileById = new Map(profiles.map((profile) => [profile.id, profile] as const));
  const tokens = encounterPackage.layout.placement.map((placement) => {
    const profile = profileById.get(combatantId(placement.combatantId));
    if (profile === undefined) throw new Error(`Placement references unknown combatant ${placement.combatantId}.`);
    return combatToken(profile, placement.cell);
  });
  return createEncounter({
    config,
    bounds: {
      columns: encounterPackage.layout.map.columns,
      rows: encounterPackage.layout.map.rows,
    },
    combatants: profiles,
    tokens,
    blockedCells: encounterPackage.layout.terrain
      .filter((entry) => entry.blocksMovement)
      .map((entry) => entry.cell),
    foggedCells: encounterPackage.layout.fog.cells,
    dmNotes: [
      encounterPackage.tactics.objective,
      ...encounterPackage.tactics.exitConditions,
      ...encounterPackage.tactics.notes,
      ...encounterPackage.tactics.combatantPlans.flatMap((plan) => plan.priorities),
    ],
  });
}

export const approvedFixtureTurnLegalActions: TurnLegalActions = (_state, actor) => ({
  actions: [{ type: 'end_turn', actor }],
});

export interface ApprovedFixtureSession {
  readonly fixtureId: EncounterFixtureId;
  readonly coordinator: TurnCoordinator;
}

export function approvedFixtureSession(
  fixtureValue: unknown,
  rng: SerializableRng = mulberry32(0x314009),
): ApprovedFixtureSession {
  const fixture = decodeApprovedEncounterFixture(fixtureValue);
  const state = encounterStateFromApprovedFixture(fixture);
  const registry = new ControllerRegistry(state.combatants.map((subject) => ({
    combatantId: subject.profile.id,
    controller: new AlgorithmController(),
    controllerId: `${subject.profile.id}:fixture-algorithm`,
  })));
  return {
    fixtureId: fixture.fixtureId,
    coordinator: new TurnCoordinator(state, registry, rng, {
      turnLegalActions: approvedFixtureTurnLegalActions,
    }),
  };
}

export interface PlayerEncounterFixtureProjection {
  readonly audience: 'player';
  readonly fixtureId: EncounterFixtureId;
  readonly difficulty: EncounterDifficultyRequest;
  readonly map: GeneratedEncounterPackage['layout']['map'];
  readonly terrain: GeneratedEncounterPackage['layout']['terrain'];
}

export interface DmEncounterFixtureProjection {
  readonly audience: 'dm';
  readonly fixtureId: EncounterFixtureId;
  readonly package: GeneratedEncounterPackage;
  readonly assessment: EncounterDifficultyAssessment;
}

export function projectApprovedFixtureForPlayer(
  fixtureValue: unknown,
): PlayerEncounterFixtureProjection {
  const fixture = decodeApprovedEncounterFixture(fixtureValue);
  return {
    audience: 'player',
    fixtureId: fixture.fixtureId,
    difficulty: fixture.package.request.difficulty,
    map: fixture.package.layout.map,
    terrain: fixture.package.layout.terrain,
  };
}

export function projectApprovedFixtureForDm(
  fixtureValue: unknown,
): DmEncounterFixtureProjection {
  const fixture = decodeApprovedEncounterFixture(fixtureValue);
  return {
    audience: 'dm',
    fixtureId: fixture.fixtureId,
    package: fixture.package,
    assessment: fixture.assessment,
  };
}

export function serializePlayerEncounterFixture(
  projection: PlayerEncounterFixtureProjection,
): string {
  return canonicalJson(projection);
}
