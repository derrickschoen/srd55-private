import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { effectiveCombatRules } from '../../../src/combat/combat-rules';
import { monsterCombatantProfile } from '../../../src/combat/combatant';
import type { EncounterState } from '../../../src/combat/encounter';
import type {
  MonsterAttackAction, MonsterBonusAction, MonsterDamageTerm, MonsterMultiattackAction,
  MonsterSavingThrowAction, MonsterSpellcastingAction, MonsterStatblock,
} from '../../../src/combat/statblock';
import { BUNDLED_MONSTER_ROSTER } from '../../../src/combat/statblocks/roster';
import { spellDefinition } from '../../../src/combat/spells/definitions';
import {
  effectStackingIdentity, encounterEffectId, worldObjectId, type CombatantId,
} from '../../../src/combat/values';
import { sha256 } from '../../../src/crypto/sha256';
import {
  type BlindIngressRecord, assertBlindIngressSafe, assertNoForbiddenBlindStructure,
} from '../../../src/vtt/blind-model-ingress';
import {
  BLIND_LEGAL_MOVEMENT_VERSION, BLIND_SPELL_ESSENTIALS_FORMAT,
  BLIND_STATBLOCK_ESSENTIALS_FORMAT, blindTurnContextSchema, type BlindTurnContext,
} from '../../../src/vtt/blind-turn-context';
import {
  createEngineStateCapsuleForEnvironment, engineStateHandle, projectEngineEncounterState,
  type EngineCapsuleRequest, type EngineStateCapsule,
} from '../../../src/vtt/engine-state-capsule';
import { engineActionRegistryForEnvironment } from '../../../src/vtt/engine-query-port';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
import { projectFutureMonsterTurns } from '../../../src/vtt/monster-planning-state';
import { loadArenaFixture, type EngineMcpLauncherManifest } from '../../../src/vtt/mcp/entrypoint';
import { projectEngineSemanticBoard, semanticBoardPayload } from '../../../src/vtt/semantic-board-payload';
import {
  parseConversationArgs, runConversation, type ConversationBoardSnapshotService,
} from '../../../tools/ai-dm-conversation';
import type { BoardImageArtifact, BoardSnapshotCapture } from '../../../tools/ai-dm-board-snapshot';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from '../../helpers/test-filesystem';

type JsonPath = `$${string}`;
type StringClass = 'free_text' | 'id' | 'digest' | 'label' | 'enum' | 'approved_literal';
interface StringLeaf { readonly path: JsonPath; readonly value: string }
interface StringSourceBinding extends StringLeaf { readonly class: StringClass; readonly source: string }
interface StringFamilyWitness { readonly pathPattern: JsonPath; readonly populatedCase: string; readonly emptyCase?: string; readonly absentCase?: string }
interface RecordedBlindContextCase {
  readonly sourceState: EncounterState;
  readonly planningState: EncounterState;
  readonly records: readonly BlindIngressRecord[];
  readonly contexts: readonly BlindTurnContext[];
}
type ExpectedBlindActiveRules = ReturnType<typeof effectiveCombatRules> | Omit<ReturnType<typeof effectiveCombatRules>, 'hitPointMaximum' | 'spellSlots' | 'limitedResources'>;
interface CaseMetadata { readonly label: string; readonly capsule: EngineStateCapsule; readonly manifest: EngineMcpLauncherManifest }

const CASE_METADATA = new WeakMap<RecordedBlindContextCase, CaseMetadata>();
const ACCEPT_LINES = [
  'blindTurnContextSchema.parse: ACCEPT',
  'assertNoForbiddenBlindStructure: ACCEPT',
  'assertBlindIngressSafe: ACCEPT',
].join('\n');

// Test-owned reviewed literals: importing producer redaction metadata would make this oracle circular.
const TEST_STATBLOCK_DROPPED_FIELDS = Object.freeze([
  { path: 'provenance', reason: 'Source attribution is recorded once in creature_facts.provenance.rules_sources; design notes and modification prose are not rules.' },
  { path: 'sourceDetails.source', reason: 'Source spans are recorded once in creature_facts.provenance.rules_sources.' },
  { path: 'sourceDetails.classification.alignment', reason: 'Alignment is descriptive and does not change the combat rules engine.' },
  { path: 'sourceDetails.challenge', reason: 'Challenge rating, experience points, and proficiency provenance do not adjudicate the live creature.' },
  { path: 'sourceDetails.hitPointDice', reason: 'The sourced maximum HP is retained; construction dice are not live HP.' },
  { path: 'sourceDetails.abilities', reason: 'The requested saving throws and skills are retained; raw ability-score presentation is omitted.' },
  { path: 'sourceDetails.gear', reason: 'Inventory prose is omitted; every attack and reaction mechanic remains explicit.' },
  { path: 'sourceDetails.languages', reason: 'Language presentation is outside this combat-planning payload.' },
  { path: '*.average', reason: 'Redundant averages are omitted while their sourced damage or healing dice remain.' },
  { path: '*.source|*.execution|*.note', reason: 'Source locators, implementation status, and absence prose are provenance rather than game mechanics.' },
] as const);
const TEST_SPELL_DROPPED_FIELDS = Object.freeze([
  { path: 'name', reason: 'Referenced spells are keyed by their stable spell id.' },
  { path: 'source', reason: 'Source locator prose is not a spell mechanic.' },
  { path: 'components', reason: 'Monster spell use is already constrained by the typed engine action; component presentation is not needed here.' },
  { path: 'ritual', reason: 'The monster spell actions in this payload do not offer ritual casting.' },
] as const);

const FAMILY = {
  root: '$.{granularity,dm_mode,intent_contract}',
  state: '$.state_ref.{run_id,state_handle,state_digest}',
  request: '$.request.{request_id,phase}',
  requiredNames: '$.request.required_actors[*].name',
  display: '$.{roster,initiative}[*].{name,side,hp_band}',
  semanticRoot: '$.semantic_board.{format,audience,provenance.**}',
  coordinates: '$.semantic_board.coordinates.**',
  semanticProvenance: '$.semantic_board.{creatures,objects,light_sources,adjacency_pairs,doors.**}.provenance',
  cellFacts: '$.semantic_board.cells.**.{provenance,encoding}',
  partitions: '$.semantic_board.cells.{terrain.partition,light.**}',
  semanticCreatures: '$.semantic_board.creatures.items[*].**',
  semanticDoors: '$.semantic_board.doors.{open,closed}.items[*].**',
  semanticObjects: '$.semantic_board.{objects,light_sources}.items[*].**',
  adjacency: '$.semantic_board.adjacency_pairs.items[*].**',
  factsProvenance: '$.creature_facts.provenance.{kind,statblock_projection.format,spell_projection.format}',
  droppedFields: '$.creature_facts.provenance.{statblock_projection,spell_projection}.dropped_fields[*].**',
  rulesSources: '$.creature_facts.provenance.rules_sources[*].**',
  activeRules: '$.creature_facts.active_rules.<rules-ref>.**',
  statblockIdentity: '$.creature_facts.statblocks.<statblock-id>.statblock.{id,name}',
  statblockScalars: '$.creature_facts.statblocks.<statblock-id>.statblock.{speeds,size_type,senses,skills,damage_responses,condition_immunities}.**',
  attacks: '$.creature_facts.statblocks.<statblock-id>.statblock.attacks[*].**',
  multiAndSaves: '$.creature_facts.statblocks.<statblock-id>.statblock.{multiattacks,saving_throw_actions}[*].**',
  spellcasting: '$.creature_facts.statblocks.<statblock-id>.statblock.spellcasting[*].**',
  recursiveStatblock: '$.creature_facts.statblocks.<statblock-id>.statblock.{traits,bonus_actions,reactions,legendary_actions,legendary_resistance}.**',
  referencedSpells: '$.creature_facts.statblocks.<statblock-id>.referenced_spells.<spell-id>.**',
  factActors: '$.creature_facts.actors[*].{name,side,statblock_ref,active_rules_ref}',
  actorDetails: '$.creature_facts.actors[*].{conditions,hp_knowledge,remaining_resources}.**',
  movementProvenance: '$.legal_movement.provenance.**',
  movementNames: '$.legal_movement.actors[*].name',
  movementCells: '$.legal_movement.actors[*].cells[*].label',
  visuals: '$.visuals[*].{kind,primer_version,glyph_mode}',
} as const satisfies Readonly<Record<string, JsonPath>>;

const BLIND_STRING_FAMILY_WITNESSES: readonly StringFamilyWitness[] = [
  { pathPattern: FAMILY.root, populatedCase: 'standard' },
  { pathPattern: FAMILY.state, populatedCase: 'standard' },
  { pathPattern: FAMILY.request, populatedCase: 'standard' },
  { pathPattern: FAMILY.requiredNames, populatedCase: 'standard' },
  { pathPattern: FAMILY.display, populatedCase: 'standard' },
  { pathPattern: FAMILY.semanticRoot, populatedCase: 'rich', absentCase: 'facts-off' },
  { pathPattern: FAMILY.coordinates, populatedCase: 'rich', absentCase: 'facts-off' },
  { pathPattern: FAMILY.semanticProvenance, populatedCase: 'rich', emptyCase: 'empty', absentCase: 'facts-off' },
  { pathPattern: FAMILY.cellFacts, populatedCase: 'rich', emptyCase: 'empty', absentCase: 'facts-off' },
  { pathPattern: FAMILY.partitions, populatedCase: 'rich', emptyCase: 'empty', absentCase: 'facts-off' },
  { pathPattern: FAMILY.semanticCreatures, populatedCase: 'rich', absentCase: 'facts-off' },
  { pathPattern: FAMILY.semanticDoors, populatedCase: 'rich', emptyCase: 'empty', absentCase: 'facts-off' },
  { pathPattern: FAMILY.semanticObjects, populatedCase: 'rich', emptyCase: 'empty', absentCase: 'facts-off' },
  { pathPattern: FAMILY.adjacency, populatedCase: 'rich', emptyCase: 'empty', absentCase: 'facts-off' },
  { pathPattern: FAMILY.factsProvenance, populatedCase: 'rich' },
  { pathPattern: FAMILY.droppedFields, populatedCase: 'rich' },
  { pathPattern: FAMILY.rulesSources, populatedCase: 'rich' },
  { pathPattern: FAMILY.activeRules, populatedCase: 'rich' },
  { pathPattern: FAMILY.statblockIdentity, populatedCase: 'rich' },
  { pathPattern: FAMILY.statblockScalars, populatedCase: 'rich', emptyCase: 'empty' },
  { pathPattern: FAMILY.attacks, populatedCase: 'rich', emptyCase: 'empty' },
  { pathPattern: FAMILY.multiAndSaves, populatedCase: 'rich', emptyCase: 'empty' },
  { pathPattern: FAMILY.spellcasting, populatedCase: 'rich', emptyCase: 'empty' },
  { pathPattern: FAMILY.recursiveStatblock, populatedCase: 'rich', emptyCase: 'empty' },
  { pathPattern: FAMILY.referencedSpells, populatedCase: 'rich', emptyCase: 'empty' },
  { pathPattern: FAMILY.factActors, populatedCase: 'rich' },
  { pathPattern: FAMILY.actorDetails, populatedCase: 'rich', emptyCase: 'empty' },
  { pathPattern: FAMILY.movementProvenance, populatedCase: 'standard' },
  { pathPattern: FAMILY.movementNames, populatedCase: 'standard' },
  { pathPattern: FAMILY.movementCells, populatedCase: 'standard' },
  { pathPattern: FAMILY.visuals, populatedCase: 'standard' },
];

class FakeBlindSnapshotService implements ConversationBoardSnapshotService {
  readonly outputDirectory = mkdtempSync(join(tmpdir(), 'dnd-source-binding-image-'));
  async capture(input: BoardSnapshotCapture): Promise<BoardImageArtifact> {
    const png = Buffer.alloc(96);
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
    png.writeUInt32BE(1, 16); png.writeUInt32BE(1, 20);
    Buffer.from(input.source.stateDigest).copy(png, 24, 0, 64);
    const pngDigest = createHash('sha256').update(png).digest('hex');
    const relativePath = `board-images/${pngDigest}.png` as const;
    mkdirSync(join(this.outputDirectory, 'board-images'), { recursive: true });
    writeFileSync(join(this.outputDirectory, relativePath), png);
    const html = Buffer.from('<!doctype html><main>independent source binding</main>\n');
    const htmlDigest = createHash('sha256').update(html).digest('hex');
    const htmlRelativePath = `board-html/${htmlDigest}/board.html` as const;
    mkdirSync(join(this.outputDirectory, 'board-html', htmlDigest), { recursive: true });
    writeFileSync(join(this.outputDirectory, htmlRelativePath), html);
    return {
      version: 'arena-board-image-v1', audience: 'dm', mimeType: 'image/png', relativePath,
      sha256: pngDigest, bytes: png.byteLength, width: 1, height: 1,
      capturedAtUnixMs: Date.now(), captureMs: 1, source: { ...input.source },
      chromiumVersion: 'SIMULATED Chromium',
      html: { relativePath: htmlRelativePath, sha256: htmlDigest, bytes: html.byteLength },
      blindState: {
        informationMode: 'blind_state', role: 'dm_board', ordinal: 1,
        primerVersion: 'd562-general-board-primer-v10', glyphMode: 'full', captureTilePx: 128,
        domEvidence: {
          optionSurfaceAbsent: true, nextEventPreviewAbsent: true, coordinateLabels: 1,
          creatureBadges: 1, rosterEntries: 1, hpBars: 1, legendEntries: 1,
          wallCells: 0, halfCoverCells: 0, threeQuartersCoverCells: 0, difficultCells: 0,
          obscuredCells: 0, illuminatedCells: 0, fogMarks: 0, doors: 0, objects: 0,
          hiddenMarks: 0, multiCellFootprints: 0,
        },
      },
    };
  }
  async close(): Promise<void> { return undefined; }
}

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
  return value as Readonly<Record<string, unknown>>;
}
function decodeManifest(value: unknown): EngineMcpLauncherManifest {
  const candidate = record(value, 'launcher manifest');
  if (candidate['format'] !== 'engine-mcp-launcher-v1' || typeof candidate['fixturePath'] !== 'string' || typeof candidate['blindIngressSpoolPath'] !== 'string') {
    throw new TypeError('Source-binding launcher is not a blind engine launcher.');
  }
  return candidate as unknown as EngineMcpLauncherManifest;
}
function decodeIngressRecords(source: string): readonly BlindIngressRecord[] {
  return source.split('\n').filter((line) => line.length > 0).map((line, index) => {
    const candidate = record(JSON.parse(line) as unknown, `ingress record ${String(index + 1)}`);
    if (candidate['ordinal'] !== index + 1 || typeof candidate['channel'] !== 'string' || typeof candidate['text'] !== 'string' ||
      typeof candidate['utf8Bytes'] !== 'number' || candidate['utf8Bytes'] !== new TextEncoder().encode(candidate['text']).byteLength ||
      typeof candidate['sha256'] !== 'string' || candidate['sha256'] !== sha256(candidate['text'])) {
      throw new TypeError(`Ingress record ${String(index + 1)} failed independent framing checks.`);
    }
    return candidate as unknown as BlindIngressRecord;
  });
}
function requiredMonsterIds(state: EncounterState): readonly CombatantId[] {
  return state.combatants.filter((combatant) => combatant.profile.kind === 'monster' && combatant.life !== 'dead')
    .map((combatant) => combatant.profile.id).sort((left, right) => String(left).localeCompare(String(right)));
}
function capsuleFor(sourceState: EncounterState, planningState: EncounterState, manifest: EngineMcpLauncherManifest): EngineStateCapsule {
  if (manifest.phase === 'speculative' || manifest.requestKind === 'plan_adjustment' || manifest.initiativeProjection === undefined) {
    throw new TypeError('Source-binding cases require an ordinary initiative-bound request.');
  }
  const request: EngineCapsuleRequest = {
    ...(manifest.requestKind === 'round_plan' ? { kind: 'round_plan' as const } : {}),
    requestId: manifest.requestId, phase: manifest.phase, correctionNumber: manifest.correctionNumber,
    actors: requiredMonsterIds(sourceState),
  };
  const offerEnvironment = buildOfferEnvironment({ kind: 'binding', binding: manifest.offerEnvironment });
  return createEngineStateCapsuleForEnvironment({
    runId: manifest.runId, branchId: manifest.branchId, revision: manifest.revision,
    generatedAt: '2026-08-27T12:00:00.000Z', request,
    projection: projectEngineEncounterState(
      planningState,
      engineActionRegistryForEnvironment(planningState, offerEnvironment, manifest.revision),
      manifest.initiativeProjection,
      manifest.room,
    ),
    historyDelta: [{ revision: manifest.revision, kind: manifest.historyKind, branchStatus: 'active', encounterRound: planningState.round }],
    offerEnvironment: offerEnvironment.binding,
  });
}
async function captureDeliveredBlindContexts(input: { readonly sourceState: EncounterState; readonly blindFacts: boolean; readonly sourceLabel: string }): Promise<RecordedBlindContextCase> {
  const directory = mkdtempSync(join(tmpdir(), `dnd-source-binding-${input.sourceLabel}-`));
  const launcherTokens: string[] = [];
  await runConversation(parseConversationArgs([
    '--fixtures', 'tests/fixtures/arena-basis', '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
    '--dry-run', '--dm-mode', 'blind', '--blind-facts', input.blindFacts ? 'on' : 'off',
    '--combat-model', 'monster_block_v1', '--initiative-profile', 'legacy',
  ]), {
    roomStates: [input.sourceState], boardSnapshotService: new FakeBlindSnapshotService(),
    exhaustInitial: ['room-1-round-1'],
    onPrimaryInvocation: (invocation) => { launcherTokens.push(invocation.launcherToken); },
  });
  if (launcherTokens.length !== 1) throw new Error(`Expected one delivered launcher for ${input.sourceLabel}; got ${String(launcherTokens.length)}.`);
  const launcherToken = launcherTokens[0];
  if (launcherToken === undefined) throw new Error('Source-binding launcher token disappeared.');
  const manifest = decodeManifest(JSON.parse(readFileSync(launcherToken, 'utf8')) as unknown);
  if (manifest.blindIngressSpoolPath === undefined) throw new Error('Blind ingress spool path disappeared.');
  const sourceState = await loadArenaFixture(manifest.fixturePath);
  const planningState = projectFutureMonsterTurns(sourceState, requiredMonsterIds(sourceState));
  const records = decodeIngressRecords(readFileSync(manifest.blindIngressSpoolPath, 'utf8'));
  const contexts = records.flatMap((entry) => entry.channel === 'turn_context' ? [blindTurnContextSchema.parse(JSON.parse(entry.text) as unknown)] : []);
  if (contexts.length === 0) throw new Error(`${input.sourceLabel} delivered no turn_context records.`);
  const evidence: RecordedBlindContextCase = { sourceState, planningState, records, contexts };
  CASE_METADATA.set(evidence, { label: input.sourceLabel, capsule: capsuleFor(sourceState, planningState, manifest), manifest });
  return evidence;
}

function expectedBlindActiveRules(state: EncounterState, combatantId: CombatantId): ExpectedBlindActiveRules {
  const combatant = state.combatants.find((candidate) => candidate.profile.id === combatantId);
  if (combatant === undefined) throw new Error(`Missing active-rules actor ${String(combatantId)}.`);
  const rules = effectiveCombatRules(state, combatantId);
  if (combatant.profile.kind === 'monster') return structuredClone(rules);
  const { hitPointMaximum: _hitPointMaximum, spellSlots: _spellSlots, limitedResources: _limitedResources, ...visibleRules } = rules;
  return structuredClone(visibleRules);
}

type MechanicalJson = null | boolean | number | string | readonly MechanicalJson[] | { readonly [key: string]: MechanicalJson };
function sourceMechanicalJson(value: unknown): MechanicalJson {
  if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(sourceMechanicalJson);
  if (typeof value !== 'object') throw new TypeError('Raw statblock mechanics are not JSON-compatible.');
  return Object.fromEntries(Object.entries(value).flatMap(([key, entry]) =>
    key === 'source' || key === 'execution' || key === 'note' || key === 'average' ? [] : [[key, sourceMechanicalJson(entry)] as const]));
}
function present<Value>(value: { readonly kind: 'present'; readonly value: Value } | { readonly kind: 'absent'; readonly note: string }, label: string): Value {
  if (value.kind === 'absent') throw new Error(`Raw statblock ${label} is absent.`);
  return value.value;
}
function sourceDamage(term: MonsterDamageTerm) { return { dice: structuredClone(term.dice), type: term.type, trigger: structuredClone(term.trigger) }; }
function sourceAttack(action: MonsterAttackAction) {
  return {
    id: action.id, name: action.name, attack_bonus: action.attackBonus, delivery: structuredClone(action.delivery),
    damage: action.damage.map(sourceDamage), attack_roll_advantage: structuredClone(action.attackRollAdvantage),
    on_hit: structuredClone(action.onHit), mechanics: sourceMechanicalJson(action.mechanics ?? null),
  };
}
function sourceMultiattack(action: MonsterMultiattackAction) {
  return { id: action.id, count: action.count, action_ids: [...action.actionIds], combination: action.combination, mechanics: sourceMechanicalJson(action.mechanics ?? null) };
}
function sourceSavingThrow(action: MonsterSavingThrowAction) {
  return {
    id: action.id, name: action.name, saving_throw: structuredClone(action.savingThrow), target: structuredClone(action.target),
    failure: { damage: action.failure.damage.map(sourceDamage), effects: structuredClone(action.failure.effects) },
    success: structuredClone(action.success), mechanics: sourceMechanicalJson(action.mechanics ?? null),
  };
}
function sourceSpellcasting(action: MonsterSpellcastingAction) {
  return {
    kind: 'spellcasting' as const, id: action.id, action_economy: action.actionEconomy, ability: action.ability,
    save_dc: action.saveDc.kind === 'present' ? action.saveDc.value : null,
    spell_attack_bonus: action.spellAttackBonus.kind === 'present' ? action.spellAttackBonus.value : null,
    spell_list: structuredClone(action.spells), mechanics: sourceMechanicalJson(action.mechanics ?? null),
  };
}
function sourceSpellChoice(action: Extract<MonsterBonusAction, { readonly kind: 'spell_choice' }>) {
  return {
    kind: 'spell_choice' as const, id: action.id, name: action.name, action_economy: 'bonus_action' as const,
    uses: action.uses, recharge: action.recharge, ability: action.ability, save_dc: null, spell_attack_bonus: null,
    spell_list: structuredClone(action.spells), mechanics: null,
  };
}
function sourceStatblock(statblock: MonsterStatblock) {
  const details = statblock.sourceDetails;
  const classification = present(details.classification, 'classification');
  const actions = present(details.actions, 'actions');
  const bonusActions = details.bonusActions.kind === 'present' ? details.bonusActions.value : null;
  const allSpellcasting = [...actions, ...(bonusActions ?? [])].filter((action): action is MonsterSpellcastingAction => action.kind === 'spellcasting');
  const choices = (bonusActions ?? []).filter((action): action is Extract<MonsterBonusAction, { readonly kind: 'spell_choice' }> => action.kind === 'spell_choice');
  return {
    id: statblock.id, name: statblock.name, armor_class: statblock.armorClass, hit_points_maximum: statblock.hitPointMaximum,
    speeds: structuredClone(present(details.movement, 'movement')),
    size_type: { sizes: structuredClone(classification.sizes), type: classification.type, subtype: classification.subtype },
    senses: structuredClone(statblock.senses), passive_perception: present(details.passivePerception, 'passive perception'),
    saving_throw_bonuses: structuredClone(statblock.savingThrowBonuses),
    skills: details.skills.kind === 'present' ? structuredClone(details.skills.value) : null,
    damage_responses: structuredClone(statblock.damageResponses), condition_immunities: [...statblock.conditionImmunities],
    attacks: actions.filter((action): action is MonsterAttackAction => action.kind === 'attack').map(sourceAttack),
    multiattacks: actions.filter((action): action is MonsterMultiattackAction => action.kind === 'multiattack').map(sourceMultiattack),
    saving_throw_actions: actions.filter((action): action is MonsterSavingThrowAction => action.kind === 'saving_throw').map(sourceSavingThrow),
    spellcasting: [...allSpellcasting.map(sourceSpellcasting), ...choices.map(sourceSpellChoice)],
    traits: details.traits.kind === 'present' ? sourceMechanicalJson(details.traits.value) : null,
    bonus_actions: bonusActions === null ? null : sourceMechanicalJson(bonusActions.filter((action) => action.kind !== 'spellcasting' && action.kind !== 'spell_choice')),
    reactions: details.reactions.kind === 'present' ? sourceMechanicalJson(details.reactions.value) : null,
    legendary_actions: details.legendaryActions.kind === 'present' ? sourceMechanicalJson(details.legendaryActions.value) : null,
    legendary_resistance: details.legendaryResistance.kind === 'present' ? sourceMechanicalJson(details.legendaryResistance.value) : null,
  };
}
function sourceReferencedSpells(statblock: MonsterStatblock): Readonly<Record<string, unknown>> {
  const actions = statblock.sourceDetails.actions.kind === 'present' ? statblock.sourceDetails.actions.value : [];
  const bonus = statblock.sourceDetails.bonusActions.kind === 'present' ? statblock.sourceDetails.bonusActions.value : [];
  const ids = [...new Set([...actions, ...bonus].flatMap((action) =>
    action.kind === 'spellcasting' || action.kind === 'spell_choice' ? action.spells.map((spell) => spell.id) : []))]
    .sort((left, right) => left.localeCompare(right));
  return Object.fromEntries(ids.map((id) => {
    const definition = spellDefinition(id);
    return [id, definition === null ? { availability: 'declared_by_statblock' as const, definition: null } : {
      level: definition.level, casting_time: definition.castingTime, targeting: structuredClone(definition.targeting), effect: structuredClone(definition.operation),
    }] as const;
  }));
}
function sourceEvidence(statblock: MonsterStatblock): readonly Readonly<Record<string, string>>[] {
  switch (statblock.provenance.kind) {
    case 'srd_5_2_1_decoded': return statblock.provenance.source.map((source) => ({ source_id: 'srd-5.2.1', license: 'CC-BY-4.0', page_or_entry: `${source.path}:${String(source.lineStart)}-${String(source.lineEnd)}` }));
    case 'adapted_cc_by': return [{ source_id: statblock.provenance.sourceId, license: statblock.provenance.attributionKey, page_or_entry: statblock.provenance.locator }];
    case 'original_homebrew': return [{ source_id: `project-original:${String(statblock.id)}`, license: 'project-original', page_or_entry: String(statblock.id) }];
    case 'external_import': return [{ source_id: statblock.provenance.sourceId, license: 'external-import', page_or_entry: String(statblock.id) }];
  }
}

interface DisplaySource { readonly id: CombatantId; readonly name: string; readonly badge: number; readonly side: 'party' | 'foe'; readonly hpBand: 'UNINJURED' | 'BLOODIED' | 'NEAR DEATH' | 'UNKNOWN' }
function displayBand(hitPoints: number, maximum: number): DisplaySource['hpBand'] {
  if (maximum <= 0) return 'UNKNOWN';
  if (hitPoints >= maximum) return 'UNINJURED';
  return hitPoints * 4 <= maximum ? 'NEAR DEATH' : 'BLOODIED';
}
function independentDisplays(state: EncounterState): readonly DisplaySource[] {
  const initiativePosition = new Map(state.initiative.map((entry, index) => [entry.combatant, index] as const));
  return state.combatants.filter((combatant) => state.tokens.some((token) => token.combatantId === combatant.profile.id))
    .sort((left, right) => (initiativePosition.get(left.profile.id) ?? Number.MAX_SAFE_INTEGER) - (initiativePosition.get(right.profile.id) ?? Number.MAX_SAFE_INTEGER) || String(left.profile.id).localeCompare(String(right.profile.id)))
    .map((combatant, index) => ({
      id: combatant.profile.id, name: combatant.profile.name, badge: index + 1,
      side: combatant.profile.kind === 'player_character' ? 'party' as const : 'foe' as const,
      hpBand: displayBand(combatant.hitPoints, effectiveCombatRules(state, combatant.profile.id).hitPointMaximum),
    }));
}
function expectedCreatureFacts(evidence: RecordedBlindContextCase, capsule: EngineStateCapsule) {
  const displays = new Map(independentDisplays(evidence.planningState).map((entry) => [entry.id, entry] as const));
  const statblocks = new Map<string, { readonly statblock: unknown; readonly referenced_spells: Readonly<Record<string, unknown>> }>();
  const activeRules = new Map<string, ExpectedBlindActiveRules>();
  const rulesSources = new Map<string, Readonly<Record<string, string>>>();
  const actors = capsule.projection.combatants.map((projected) => {
    const stateActor = evidence.planningState.combatants.find((candidate) => candidate.profile.id === projected.id);
    const display = displays.get(projected.id);
    if (stateActor === undefined || display === undefined) throw new Error(`Expected actor ${String(projected.id)} is unplaced.`);
    const profile = stateActor.profile;
    const raw = profile.kind === 'monster' ? BUNDLED_MONSTER_ROSTER.find((entry) => entry.statblock.id === profile.statblockId)?.statblock : undefined;
    if (profile.kind === 'monster' && raw === undefined) throw new Error(`Missing raw statblock ${String(profile.statblockId)}.`);
    if (raw !== undefined && !statblocks.has(String(raw.id))) {
      statblocks.set(String(raw.id), { statblock: sourceStatblock(raw), referenced_spells: sourceReferencedSpells(raw) });
      for (const source of sourceEvidence(raw)) rulesSources.set(canonicalJson(source), source);
    }
    const rules = expectedBlindActiveRules(evidence.planningState, projected.id);
    const rulesReference = `rules:${sha256(canonicalJson(rules))}`;
    activeRules.set(rulesReference, rules);
    const common = {
      name: display.name, badge: display.badge, side: display.side, statblock_ref: raw?.id ?? null, active_rules_ref: rulesReference,
      action_economy: { action_available: projected.actionAvailable, bonus_action_available: projected.bonusActionAvailable, reaction_available: projected.reactionAvailable },
      movement_remaining_feet: projected.movementRemainingFeet, conditions: structuredClone(projected.planning.conditionFlags), concentration: projected.planning.concentrating,
    };
    if (profile.kind === 'player_character') return { ...common, hp_knowledge: { kind: 'displayed_band' as const, band: display.hpBand }, remaining_resources: null };
    return {
      ...common,
      hp_knowledge: { kind: 'exact' as const, current: projected.hitPoints, maximum: projected.hitPointMaximum, temporary: projected.planning.temporaryHitPoints },
      remaining_resources: {
        spell_slots: projected.planning.spellSlots.map((slot) => ({ ...slot })),
        limited_uses: (stateActor.limitedResources ?? []).map((resource) => ({ ...resource })),
        legendary_actions: projected.planning.legendaryActionUsesRemaining,
        legendary_resistances: projected.planning.legendaryResistanceUsesRemaining,
      },
    };
  });
  return {
    provenance: {
      kind: 'engine_fact',
      statblock_projection: { format: BLIND_STATBLOCK_ESSENTIALS_FORMAT, dropped_fields: TEST_STATBLOCK_DROPPED_FIELDS.map((field) => ({ ...field })) },
      spell_projection: { format: BLIND_SPELL_ESSENTIALS_FORMAT, dropped_fields: TEST_SPELL_DROPPED_FIELDS.map((field) => ({ ...field })) },
      rules_sources: [...rulesSources.values()],
    },
    statblocks: Object.fromEntries([...statblocks.entries()].sort(([left], [right]) => left.localeCompare(right))),
    active_rules: Object.fromEntries([...activeRules.entries()].sort(([left], [right]) => left.localeCompare(right))), actors,
  };
}

function expectedContext(evidence: RecordedBlindContextCase): Readonly<Record<string, unknown>> {
  const metadata = CASE_METADATA.get(evidence);
  if (metadata === undefined) throw new Error('Recorded evidence lost its source metadata.');
  const { capsule, manifest } = metadata;
  const request = capsule.request;
  if (request === null || request.phase === 'speculative') throw new Error('Expected an ordinary capsule request.');
  const displays = independentDisplays(evidence.planningState);
  const displayById = new Map(displays.map((entry) => [entry.id, entry] as const));
  const delayedById = new Map(manifest.initiativeProjection?.timeline.initiative.map((entry) => [entry.combatant, entry.delayedThisRound] as const) ?? []);
  const semanticProjection = manifest.blindFacts === true ? projectEngineSemanticBoard(evidence.planningState, capsule.revision) : null;
  const offerEnvironment = buildOfferEnvironment({ kind: 'binding', binding: manifest.offerEnvironment });
  const semantic = semanticProjection === null ? undefined : (() => {
    const payload = semanticBoardPayload(semanticProjection);
    const { reach_range_summaries: _reachRangeSummaries, ...retained } = payload;
    return { provenance: { kind: 'engine_fact', format: payload.format, state_digest: capsule.digest }, ...retained, audience: 'dm' };
  })();
  const requiredDisplays = request.actors.map((actorId) => {
    const display = displayById.get(actorId);
    if (display === undefined) throw new Error(`Required actor ${String(actorId)} has no independent badge.`);
    return display;
  });
  const movementActors = request.actors.map((actorId) => {
    const display = displayById.get(actorId);
    const projected = capsule.projection.combatants.find((candidate) => candidate.id === actorId);
    if (display === undefined || projected === undefined) throw new Error(`Movement actor ${String(actorId)} is unbound.`);
    const cells = Array.from({ length: evidence.planningState.bounds.rows }, (_row, row) =>
      Array.from({ length: evidence.planningState.bounds.columns }, (_column, column) => ({ column, row }))).flat().flatMap((destination) => {
      const result = offerEnvironment.queries.path(evidence.planningState, {
        actorId,
        destination,
        movement: 'normal',
        maximumFeet: projected.movementRemainingFeet,
      });
      return result.legal ? [{ label: `${String(destination.column)},${String(destination.row)}`, cost_feet: result.costFeet }] : [];
    });
    return { name: display.name, badge: display.badge, movement_budget_feet: projected.movementRemainingFeet, cells };
  });
  return {
    granularity: 'full', dm_mode: 'blind',
    state_ref: { run_id: capsule.runId, state_handle: engineStateHandle(capsule), expected_revision: capsule.revision, state_digest: capsule.digest },
    request: { request_id: request.requestId, phase: request.phase, required_actors: requiredDisplays.map((display) => ({ name: display.name, badge: display.badge })) },
    round: evidence.planningState.round,
    initiative: evidence.planningState.initiative.map((entry) => {
      const display = displayById.get(entry.combatant);
      if (display === undefined) throw new Error(`Initiative actor ${String(entry.combatant)} has no badge.`);
      return { name: display.name, badge: display.badge, side: display.side, hp_band: display.hpBand, current: evidence.planningState.activeCombatant === entry.combatant, delayed: delayedById.get(entry.combatant) ?? false };
    }),
    roster: displays.map((display) => ({ name: display.name, badge: display.badge, side: display.side, hp_band: display.hpBand })),
    ...(semantic === undefined ? {} : { semantic_board: semantic }),
    creature_facts: expectedCreatureFacts(evidence, capsule),
    legal_movement: { provenance: { kind: 'engine_fact', query: BLIND_LEGAL_MOVEMENT_VERSION, state_digest: capsule.digest }, actors: movementActors },
    visuals: [{ kind: 'dm_board', ordinal: 1, primer_version: 'd562-general-board-primer-v10', glyph_mode: 'full', capture_tile_px: 128 }],
    intent_contract: 'blind-round-intent-v1',
  };
}

function collectStringLeaves(value: unknown, path: JsonPath = '$'): readonly StringLeaf[] {
  if (typeof value === 'string') return [{ path, value }];
  if (Array.isArray(value)) return value.flatMap((entry, index) => collectStringLeaves(entry, `${path}[${String(index)}]`));
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value).flatMap(([key, entry]) => collectStringLeaves(entry, `${path}.${key}`));
}
function normalizedPath(path: JsonPath): JsonPath {
  return path.replace(/\[\d+\]/gu, '[*]').replace(/(\.active_rules\.)[^.]+/u, '$1<rules-ref>')
    .replace(/(\.statblocks\.)[^.]+/u, '$1<statblock-id>').replace(/(\.referenced_spells\.)[^.]+/u, '$1<spell-id>') as JsonPath;
}
function familyForPath(path: JsonPath): JsonPath | null {
  const normalized = normalizedPath(path);
  if (normalized === '$.granularity' || normalized === '$.dm_mode' || normalized === '$.intent_contract') return FAMILY.root;
  if (normalized.startsWith('$.state_ref.')) return FAMILY.state;
  if (normalized === '$.request.request_id' || normalized === '$.request.phase') return FAMILY.request;
  if (normalized === '$.request.required_actors[*].name') return FAMILY.requiredNames;
  if (normalized.startsWith('$.roster[*].') || normalized.startsWith('$.initiative[*].')) return FAMILY.display;
  if (normalized.startsWith('$.semantic_board.provenance.') || normalized === '$.semantic_board.format' || normalized === '$.semantic_board.audience') return FAMILY.semanticRoot;
  if (normalized.startsWith('$.semantic_board.coordinates.')) return FAMILY.coordinates;
  if (normalized.endsWith('.provenance') && (normalized.startsWith('$.semantic_board.creatures.') || normalized.startsWith('$.semantic_board.objects.') || normalized.startsWith('$.semantic_board.light_sources.') || normalized.startsWith('$.semantic_board.adjacency_pairs.') || normalized.startsWith('$.semantic_board.doors.'))) return FAMILY.semanticProvenance;
  if (normalized.startsWith('$.semantic_board.cells.')) {
    if (normalized.endsWith('.partition') || normalized.endsWith('.default_light') || normalized.endsWith('.default_applies_to')) return FAMILY.partitions;
    return FAMILY.cellFacts;
  }
  if (normalized.startsWith('$.semantic_board.creatures.items[*].')) return FAMILY.semanticCreatures;
  if (normalized.startsWith('$.semantic_board.doors.') && normalized.includes('.items[*].')) return FAMILY.semanticDoors;
  if (normalized.startsWith('$.semantic_board.objects.items[*].') || normalized.startsWith('$.semantic_board.light_sources.items[*].')) return FAMILY.semanticObjects;
  if (normalized.startsWith('$.semantic_board.adjacency_pairs.items[*].')) return FAMILY.adjacency;
  if (normalized === '$.creature_facts.provenance.kind' || normalized.endsWith('_projection.format')) return FAMILY.factsProvenance;
  if (normalized.includes('_projection.dropped_fields[*].')) return FAMILY.droppedFields;
  if (normalized.startsWith('$.creature_facts.provenance.rules_sources[*].')) return FAMILY.rulesSources;
  if (normalized.startsWith('$.creature_facts.active_rules.<rules-ref>.')) return FAMILY.activeRules;
  const statblockPrefix = '$.creature_facts.statblocks.<statblock-id>.statblock.';
  if (normalized === `${statblockPrefix}id` || normalized === `${statblockPrefix}name`) return FAMILY.statblockIdentity;
  if (normalized.startsWith(`${statblockPrefix}attacks[*].`)) return FAMILY.attacks;
  if (normalized.startsWith(`${statblockPrefix}multiattacks[*].`) || normalized.startsWith(`${statblockPrefix}saving_throw_actions[*].`)) return FAMILY.multiAndSaves;
  if (normalized.startsWith(`${statblockPrefix}spellcasting[*].`)) return FAMILY.spellcasting;
  if (['traits', 'bonus_actions', 'reactions', 'legendary_actions', 'legendary_resistance'].some((key) =>
    normalized.startsWith(`${statblockPrefix}${key}.`) || normalized.startsWith(`${statblockPrefix}${key}[`) || normalized === `${statblockPrefix}${key}`)) return FAMILY.recursiveStatblock;
  if (normalized.startsWith(`${statblockPrefix}speeds[*].`) || normalized.startsWith(`${statblockPrefix}size_type.`) || normalized.startsWith(`${statblockPrefix}senses[*].`) || normalized.startsWith(`${statblockPrefix}skills[*].`) || normalized.startsWith(`${statblockPrefix}damage_responses[*].`) || normalized.startsWith(`${statblockPrefix}condition_immunities[*]`)) return FAMILY.statblockScalars;
  if (normalized.startsWith('$.creature_facts.statblocks.<statblock-id>.referenced_spells.<spell-id>.')) return FAMILY.referencedSpells;
  if (normalized.startsWith('$.creature_facts.actors[*].conditions[*].') || normalized.startsWith('$.creature_facts.actors[*].hp_knowledge.') || normalized.startsWith('$.creature_facts.actors[*].remaining_resources.')) return FAMILY.actorDetails;
  if (normalized.startsWith('$.creature_facts.actors[*].')) return FAMILY.factActors;
  if (normalized.startsWith('$.legal_movement.provenance.')) return FAMILY.movementProvenance;
  if (normalized === '$.legal_movement.actors[*].name') return FAMILY.movementNames;
  if (normalized === '$.legal_movement.actors[*].cells[*].label') return FAMILY.movementCells;
  if (normalized.startsWith('$.visuals[*].')) return FAMILY.visuals;
  return null;
}
function stringClass(path: JsonPath): StringClass {
  const normalized = normalizedPath(path);
  if (normalized.endsWith('.state_digest') || normalized.endsWith('.state_handle') || normalized.includes('.active_rules_ref')) return 'digest';
  if (normalized.endsWith('.label')) return 'label';
  if (normalized.endsWith('.name') || normalized.endsWith('.reason') || normalized.endsWith('.page_or_entry')) return 'free_text';
  if (normalized.endsWith('.id') || normalized.endsWith('_id') || normalized.endsWith('.statblock_ref') || normalized.endsWith('.source')) return 'id';
  if (familyForPath(path) === FAMILY.root || familyForPath(path) === FAMILY.coordinates || familyForPath(path) === FAMILY.partitions) return 'approved_literal';
  return 'enum';
}
function sourceForFamily(pattern: JsonPath): string {
  if (pattern === FAMILY.root || pattern === FAMILY.coordinates || pattern === FAMILY.partitions || pattern === FAMILY.visuals || pattern === FAMILY.factsProvenance || pattern === FAMILY.droppedFields) return 'test-owned approved literal';
  if (pattern === FAMILY.state || pattern === FAMILY.request || pattern === FAMILY.movementProvenance) return 'independently reconstructed engine capsule';
  if (pattern === FAMILY.requiredNames || pattern === FAMILY.display || pattern === FAMILY.factActors || pattern === FAMILY.actorDetails || pattern === FAMILY.movementNames) return 'badge to planning-state combatant id';
  if (pattern === FAMILY.movementCells) return 'canonical path query over the planning state';
  if (pattern === FAMILY.activeRules) return 'actor-kind switched effective combat rules';
  if (pattern === FAMILY.statblockIdentity || pattern === FAMILY.statblockScalars || pattern === FAMILY.attacks || pattern === FAMILY.multiAndSaves || pattern === FAMILY.spellcasting || pattern === FAMILY.recursiveStatblock || pattern === FAMILY.rulesSources) return 'raw bundled statblock id and source index';
  if (pattern === FAMILY.referencedSpells) return 'raw spell id and spellDefinition(id)';
  return 'semantic projection independently derived from planning state';
}
function emptyWitnessProved(pattern: JsonPath, context: BlindTurnContext): boolean {
  const blocks = context.creature_facts.statblocks;
  const goblin = blocks['statblock:goblin-minion'];
  const ghost = blocks['statblock:ghost'];
  if (pattern === FAMILY.semanticProvenance || pattern === FAMILY.semanticDoors || pattern === FAMILY.semanticObjects) {
    return context.semantic_board?.doors.open.items.length === 0 && context.semantic_board.doors.closed.items.length === 0 &&
      context.semantic_board.objects.items.length === 0 && context.semantic_board.light_sources.items.length === 0;
  }
  if (pattern === FAMILY.cellFacts || pattern === FAMILY.partitions) {
    return context.semantic_board?.cells.blocked.items.length === 0 && context.semantic_board.cells.fogged.items.length === 0;
  }
  if (pattern === FAMILY.adjacency) return context.semantic_board?.adjacency_pairs.items.length === 0;
  if (pattern === FAMILY.statblockScalars) return ghost?.statblock.size_type.subtype === null;
  if (pattern === FAMILY.attacks) return ghost?.statblock.attacks.some((attack) => attack.on_hit.length === 0 && attack.mechanics === null) === true;
  if (pattern === FAMILY.multiAndSaves) return goblin?.statblock.multiattacks.length === 0 && goblin.statblock.saving_throw_actions.length === 0;
  if (pattern === FAMILY.spellcasting) return goblin?.statblock.spellcasting.length === 0;
  if (pattern === FAMILY.recursiveStatblock) return ghost?.statblock.bonus_actions === null && ghost.referenced_spells !== undefined;
  if (pattern === FAMILY.referencedSpells) return goblin !== undefined && Object.keys(goblin.referenced_spells).length === 0;
  if (pattern === FAMILY.actorDetails) return context.creature_facts.actors.some((actor) =>
    actor.side === 'party' && actor.remaining_resources === null && actor.conditions.length === 0);
  return false;
}
function assertContextSourceBound(actual: BlindTurnContext, expected: Readonly<Record<string, unknown>>): readonly StringSourceBinding[] {
  const expectedRevision = record(record(expected, 'expected context')['state_ref'], 'expected state ref')['expected_revision'];
  if (!Number.isSafeInteger(actual.state_ref.expected_revision) || actual.state_ref.expected_revision < 1 || actual.state_ref.expected_revision !== expectedRevision) {
    throw new Error(`Expected revision is not the positive source capsule revision: ${String(actual.state_ref.expected_revision)} versus ${String(expectedRevision)}.`);
  }
  const expectedLeaves = new Map(collectStringLeaves(expected).map((leaf) => [leaf.path, leaf.value] as const));
  const consumed = new Set<JsonPath>();
  const bindings: StringSourceBinding[] = [];
  for (const leaf of collectStringLeaves(actual)) {
    const pattern = familyForPath(leaf.path);
    const sourceValue = expectedLeaves.get(leaf.path);
    if (pattern === null || sourceValue === undefined) throw new Error(`${ACCEPT_LINES}\nUNBOUND free-text at ${leaf.path}: ${JSON.stringify(leaf.value)}`);
    if (consumed.has(leaf.path)) throw new Error(`String leaf consumed twice at ${leaf.path}.`);
    if (sourceValue !== leaf.value) throw new Error([ACCEPT_LINES, `SOURCE_BINDING_MISMATCH ${leaf.path}`, `source: ${sourceForFamily(pattern)}`, `expected: ${JSON.stringify(sourceValue)}`, `received: ${JSON.stringify(leaf.value)}`].join('\n'));
    consumed.add(leaf.path);
    bindings.push({ ...leaf, class: stringClass(leaf.path), source: sourceForFamily(pattern) });
  }
  const missing = [...expectedLeaves.keys()].filter((path) => !consumed.has(path));
  if (missing.length > 0) throw new Error(`MISSING_SOURCE_MEMBER ${missing[0]}`);
  return bindings;
}
function assertRecordedBlindContextSourceBound(evidence: RecordedBlindContextCase): readonly StringSourceBinding[] {
  for (const context of evidence.contexts) { blindTurnContextSchema.parse(context); assertNoForbiddenBlindStructure(context); }
  assertBlindIngressSafe(evidence.records);
  const expected = expectedContext(evidence);
  return evidence.contexts.flatMap((context) => assertContextSourceBound(context, expected));
}

function richState(base: EncounterState): EncounterState {
  const rawIds = ['statblock:vane-warren/marshal-kett', 'statblock:wight', 'statblock:goblin-minion'] as const;
  const raws = rawIds.map((id) => {
    const raw = BUNDLED_MONSTER_ROSTER.find((entry) => entry.statblock.id === id)?.statblock;
    if (raw === undefined) throw new Error(`Missing rich source statblock ${id}.`);
    return raw;
  });
  let monsterIndex = 0;
  const baseCombatants = base.combatants.map((combatant) => {
    if (combatant.profile.kind !== 'monster') return combatant;
    const raw = raws[monsterIndex]; monsterIndex += 1;
    if (raw === undefined) throw new Error('Rich state has more monsters than source statblocks.');
    const generated = monsterCombatantProfile(raw, { combatantId: String(combatant.profile.id), tokenId: String(combatant.profile.tokenId) });
    const profileWithoutLegendary = (() => {
      if (monsterIndex !== 1) return generated;
      const { legendary: _legendary, ...rules } = generated.rules;
      return { ...generated, rules };
    })();
    const profile = monsterIndex === 3 ? { ...profileWithoutLegendary, name: 'Guiding Bolt, Scout 2' } : profileWithoutLegendary;
    const limitedResources = profile.rules.limitedResources?.map((resource) => ({ ...resource, remaining: resource.maximum }));
    return {
      ...combatant, profile, hitPoints: raw.hitPointMaximum, spellSlots: [],
      ...(limitedResources === undefined ? {} : { limitedResources }),
    };
  });
  const templateCombatant = baseCombatants.find((combatant) => combatant.profile.kind === 'monster');
  const templateToken = base.tokens.find((token) => token.combatantId === templateCombatant?.profile.id);
  if (templateCombatant === undefined || templateToken === undefined) throw new Error('Rich state lacks a monster template.');
  const appended = [
    { statblockId: 'statblock:priest', combatantId: 'combatant:source-binding-priest', tokenId: 'token:source-binding-priest', position: { column: 13, row: 3 } },
    { statblockId: 'statblock:ghost', combatantId: 'combatant:source-binding-ghost', tokenId: 'token:source-binding-ghost', position: { column: 15, row: 3 } },
    { statblockId: 'statblock:knight', combatantId: 'combatant:source-binding-knight', tokenId: 'token:source-binding-knight', position: { column: 17, row: 3 } },
  ] as const;
  const appendedProfiles = appended.map((entry) => {
    const raw = BUNDLED_MONSTER_ROSTER.find((candidate) => candidate.statblock.id === entry.statblockId)?.statblock;
    if (raw === undefined) throw new Error(`Missing appended rich statblock ${entry.statblockId}.`);
    const profile = monsterCombatantProfile(raw, { combatantId: entry.combatantId, tokenId: entry.tokenId });
    return { entry, raw, profile };
  });
  const combatants = [
    ...baseCombatants,
    ...appendedProfiles.map(({ raw, profile }) => ({
      ...templateCombatant,
      profile,
      hitPoints: raw.hitPointMaximum,
      spellSlots: [],
      ...(profile.rules.limitedResources === undefined ? {} : {
        limitedResources: profile.rules.limitedResources.map((resource) => ({ ...resource, remaining: resource.maximum })),
      }),
    })),
  ].map((combatant) => combatant.profile.kind === 'monster' && combatant.profile.name !== 'Guiding Bolt, Scout 2'
    ? { ...combatant, hitPoints: 0, life: 'dead' as const, deathSaves: null, deathAt: { round: 1, initiativeIndex: 0 } }
    : combatant);
  const monsterTarget = combatants.find((combatant) => combatant.profile.name === 'Guiding Bolt, Scout 2');
  const playerSource = combatants.find((combatant) => combatant.profile.kind === 'player_character');
  const [closedSource, openSource, lightSource] = base.worldObjects;
  if (monsterTarget === undefined || playerSource === undefined || closedSource === undefined || openSource === undefined || lightSource === undefined) throw new Error('Standard source lacks rich-state ingredients.');
  const monsterPositions = [{ column: 12, row: 1 }, { column: 13, row: 1 }, { column: 16, row: 1 }] as const;
  let monsterTokenIndex = 0;
  const tokens = base.tokens.map((token) => {
    const combatant = combatants.find((candidate) => candidate.profile.id === token.combatantId);
    if (combatant?.profile.kind !== 'monster') return token;
    const position = monsterPositions[monsterTokenIndex];
    monsterTokenIndex += 1;
    if (position === undefined || combatant.profile.rules.sizeCategory === undefined) throw new Error('Rich monster placement is incomplete.');
    return { ...token, position, placementMode: { kind: 'normal' as const, actual: combatant.profile.rules.sizeCategory } };
  }).concat(appendedProfiles.map(({ entry, profile }) => ({
    ...templateToken,
    id: profile.tokenId,
    combatantId: profile.id,
    position: entry.position,
    placementMode: { kind: 'normal' as const, actual: profile.rules.sizeCategory ?? 'Medium' as const },
  })));
  return {
    ...base, combatants, tokens,
    effects: [...base.effects, {
      id: encounterEffectId('effect:source-binding-blinded'), source: playerSource.profile.id, targets: [monsterTarget.profile.id],
      createdRevision: base.revision, duration: { kind: 'permanent' }, concentrationOwner: null,
      stackingIdentity: effectStackingIdentity('source-binding:blinded'), stacking: 'replace_same_source',
      repeatedSave: null, damageBreak: null, payload: { kind: 'condition', condition: 'Blinded' },
    }],
    worldObjects: [
      { ...closedSource, kind: 'door', name: 'Closed Gate', blocking: { movement: true, lineOfSight: true, cover: 'total' } },
      { ...openSource, kind: 'door', name: 'Open Gate', blocking: { movement: false, lineOfSight: false, cover: 'none' } },
      lightSource,
      { ...closedSource, id: worldObjectId('world-object:source-binding-generic'), kind: 'generic', name: 'Ancient Lever, 2', position: { column: 10, row: 10 }, footprint: [{ column: 10, row: 10 }], blocking: { movement: false, lineOfSight: false, cover: 'half' } },
    ],
  };
}
function emptyState(rich: EncounterState): EncounterState {
  const monsterPositions = [
    { column: 8, row: 1 }, { column: 10, row: 1 }, { column: 12, row: 1 },
    { column: 14, row: 1 }, { column: 16, row: 1 }, { column: 10, row: 4 },
  ] as const;
  let monsterIndex = 0;
  return {
    ...rich, blockedCells: [], worldObjects: [], foggedCells: [], effects: [],
    tokens: rich.tokens.map((token) => {
      const combatant = rich.combatants.find((candidate) => candidate.profile.id === token.combatantId);
      if (combatant?.profile.kind !== 'monster') return token;
      const position = monsterPositions[monsterIndex];
      monsterIndex += 1;
      if (position === undefined) throw new Error('Empty witness monster placement is incomplete.');
      return { ...token, position };
    }),
    environment: { lightRegions: [], difficultTerrainRegions: [], obscurementRegions: [], narrowOpeningRegions: [], movementRegions: [] },
  };
}
function mutateRecordedName(evidence: RecordedBlindContextCase): RecordedBlindContextCase {
  const contexts = evidence.contexts.map((context, index) => index !== 0 ? context : {
    ...context,
    request: { ...context.request, required_actors: context.request.required_actors.map((actor, actorIndex) => actorIndex === 0 ? { ...actor, name: `${actor.name} (unbound source phrase)` } : actor) },
  });
  let contextIndex = 0;
  const records = evidence.records.map((entry) => {
    if (entry.channel !== 'turn_context') return entry;
    const context = contexts[contextIndex]; contextIndex += 1;
    if (context === undefined) throw new Error('Mutated context/record cardinality diverged.');
    const text = canonicalJson(context);
    return { ...entry, text, utf8Bytes: new TextEncoder().encode(text).byteLength, sha256: sha256(text) };
  });
  const mutated: RecordedBlindContextCase = { ...evidence, records, contexts };
  const metadata = CASE_METADATA.get(evidence);
  if (metadata === undefined) throw new Error('Cannot mutate evidence without source metadata.');
  CASE_METADATA.set(mutated, metadata);
  return mutated;
}

const BASE_STATE = await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');
const RICH_INPUT_STATE = richState(BASE_STATE);
const EMPTY_INPUT_STATE = emptyState(RICH_INPUT_STATE);
const [STANDARD_CASE, RICH_CASE, EMPTY_CASE, FACTS_OFF_CASE] = await Promise.all([
  captureDeliveredBlindContexts({ sourceState: BASE_STATE, blindFacts: true, sourceLabel: 'standard' }),
  captureDeliveredBlindContexts({ sourceState: RICH_INPUT_STATE, blindFacts: true, sourceLabel: 'rich' }),
  captureDeliveredBlindContexts({ sourceState: EMPTY_INPUT_STATE, blindFacts: true, sourceLabel: 'empty' }),
  captureDeliveredBlindContexts({ sourceState: EMPTY_INPUT_STATE, blindFacts: false, sourceLabel: 'facts-off' }),
]);
const ALL_CASES = [STANDARD_CASE, RICH_CASE, EMPTY_CASE, FACTS_OFF_CASE] as const;
const BINDINGS_BY_CASE = new Map(ALL_CASES.map((evidence) => {
  const metadata = CASE_METADATA.get(evidence);
  if (metadata === undefined) throw new Error('Prepared evidence lost metadata.');
  return [metadata.label, assertRecordedBlindContextSourceBound(evidence)] as const;
}));

describe('blind delivered context source binding', () => {
  it('binds every delivered blind ingress string to its exact source identity and path', () => {
    for (const evidence of ALL_CASES) {
      const metadata = CASE_METADATA.get(evidence);
      if (metadata === undefined) throw new Error('Case metadata missing.');
      expect(evidence.contexts, metadata.label).toHaveLength(3);
      expect(BINDINGS_BY_CASE.get(metadata.label)?.length, metadata.label).toBe(evidence.contexts.reduce((count, context) => count + collectStringLeaves(context).length, 0));
      const expected = expectedContext(evidence);
      const expectedRequest = record(expected['request'], 'expected request');
      const expectedFacts = record(expected['creature_facts'], 'expected creature facts');
      const expectedMovement = record(expected['legal_movement'], 'expected movement');
      for (const context of evidence.contexts) {
        expect(context.request.required_actors).toEqual(expectedRequest['required_actors']);
        expect(context.roster).toEqual(expected['roster']);
        expect(context.initiative).toEqual(expected['initiative']);
        expect(context.creature_facts.actors).toEqual(expectedFacts['actors']);
        expect(context.legal_movement.actors).toEqual(expectedMovement['actors']);
      }
    }
    const standardLeaves = collectStringLeaves(STANDARD_CASE.contexts[0]);
    expect(standardLeaves).toHaveLength(493);
    expect(new Set(standardLeaves.map((leaf) => normalizedPath(leaf.path)))).toHaveLength(131);
  });

  it('binds player active rules to an independently redacted digest while keeping monster rules complete', () => {
    for (const evidence of ALL_CASES) {
      const expected = record(expectedContext(evidence)['creature_facts'], 'expected facts');
      const expectedRules = record(expected['active_rules'], 'expected active rules');
      const displays = independentDisplays(evidence.planningState);
      for (const context of evidence.contexts) {
        const actualRules = context.creature_facts.active_rules;
        expect(Object.keys(actualRules).sort()).toEqual(Object.keys(expectedRules).sort());
        for (const actor of context.creature_facts.actors) {
          const sourceId = displays.find((display) => display.badge === actor.badge)?.id;
          const sourceActor = evidence.planningState.combatants.find((candidate) => candidate.profile.id === sourceId);
          if (sourceActor === undefined) throw new Error(`Rules actor ${actor.name} is not source-bound.`);
          const expectedValue = expectedBlindActiveRules(evidence.planningState, sourceActor.profile.id);
          expect(actor.active_rules_ref).toBe(`rules:${sha256(canonicalJson(expectedValue))}`);
          expect(actualRules[actor.active_rules_ref]).toEqual(expectedValue);
          if (sourceActor.profile.kind === 'player_character') {
            expect(actualRules[actor.active_rules_ref]).not.toHaveProperty('hitPointMaximum');
            expect(actualRules[actor.active_rules_ref]).not.toHaveProperty('spellSlots');
            expect(actualRules[actor.active_rules_ref]).not.toHaveProperty('limitedResources');
          } else {
            expect(actualRules[actor.active_rules_ref]).toEqual(effectiveCombatRules(evidence.planningState, sourceActor.profile.id));
          }
        }
      }
    }
  });

  it('binds optional empty and recursively nested string families without exemptions', () => {
    const registered = new Set(BLIND_STRING_FAMILY_WITNESSES.map((entry) => entry.pathPattern));
    expect(registered.size).toBe(BLIND_STRING_FAMILY_WITNESSES.length);
    for (const bindings of BINDINGS_BY_CASE.values()) for (const binding of bindings) {
      const pattern = familyForPath(binding.path);
      expect(pattern, binding.path).not.toBeNull();
      expect(registered.has(pattern ?? '$')).toBe(true);
    }
    for (const witness of BLIND_STRING_FAMILY_WITNESSES) {
      const populated = BINDINGS_BY_CASE.get(witness.populatedCase) ?? [];
      expect(populated.some((binding) => familyForPath(binding.path) === witness.pathPattern), witness.pathPattern).toBe(true);
      if (witness.emptyCase !== undefined) {
        const emptyContext = EMPTY_CASE.contexts[0];
        if (emptyContext === undefined) throw new Error('Empty witness case delivered no context.');
        expect(emptyWitnessProved(witness.pathPattern, emptyContext), `${witness.pathPattern} empty witness`).toBe(true);
      }
      if (witness.absentCase !== undefined) {
        expect(FACTS_OFF_CASE.contexts.every((context) => context.semantic_board === undefined), `${witness.pathPattern} absent witness`).toBe(true);
      }
    }
    for (const context of EMPTY_CASE.contexts) {
      expect(context.semantic_board?.doors.open.items).toEqual([]);
      expect(context.semantic_board?.doors.closed.items).toEqual([]);
      expect(context.semantic_board?.objects.items).toEqual([]);
      expect(context.semantic_board?.light_sources.items).toEqual([]);
      expect(context.creature_facts.actors.filter((actor) => actor.side === 'party').every((actor) => actor.remaining_resources === null && actor.conditions.length === 0)).toBe(true);
    }
    for (const context of FACTS_OFF_CASE.contexts) expect(context.semantic_board).toBeUndefined();
    const richBlocks = RICH_CASE.contexts[0]?.creature_facts.statblocks;
    if (richBlocks === undefined) throw new Error('Rich case lost sourced statblocks.');
    const marshal = richBlocks['statblock:vane-warren/marshal-kett'];
    const wight = richBlocks['statblock:wight'];
    const knight = richBlocks['statblock:knight'];
    const priest = richBlocks['statblock:priest'];
    if (marshal === undefined || wight === undefined || knight === undefined || priest === undefined) throw new Error('Rich action-family manifest is incomplete.');
    expect(marshal.statblock.legendary_actions).not.toBeNull();
    expect(knight.statblock.reactions).not.toBeNull();
    expect(priest.statblock.spellcasting.length).toBeGreaterThan(0);
    expect(wight.statblock.saving_throw_actions.some((action) =>
      action.failure.damage.some((damage) => damage.type === 'Necrotic' && record(damage.trigger, 'failure damage trigger')['kind'] === 'always'))).toBe(true);
    const spellEntries = Object.values(richBlocks)
      .flatMap((entry) => Object.values(entry.referenced_spells));
    expect(spellEntries.some((definition) => 'availability' in definition)).toBe(true);
    expect(spellEntries.some((definition) => !('availability' in definition))).toBe(true);
    for (const definition of spellEntries) expect(definition).not.toHaveProperty('name');
  });

  it('accepts source-owned Guiding Bolt, digits, and commas without a content scan', () => {
    for (const context of RICH_CASE.contexts) {
      expect(context.roster.some((actor) => actor.name === 'Guiding Bolt, Scout 2')).toBe(true);
      expect(context.creature_facts.actors.some((actor) => actor.name === 'Guiding Bolt, Scout 2')).toBe(true);
      expect(context.legal_movement.actors.some((actor) => actor.name === 'Guiding Bolt, Scout 2')).toBe(true);
    }
  });

  it('reports all three legacy guard acceptances before rejecting an unbound delivered string', () => {
    expect(() => assertRecordedBlindContextSourceBound(mutateRecordedName(STANDARD_CASE))).toThrow(`${ACCEPT_LINES}\nSOURCE_BINDING_MISMATCH $.request.required_actors[0].name`);
  });
});
