/**
 * Stage 4 of the study pipeline (plan r5 §3.7; D898 R3): one blinded packet and answer key per tag, built by the
 * FROZEN packet builder's exported `buildRerunPacket` with the registered protocol and shuffle seed, then scanned for
 * any token that names the model, an effort or an arm.
 */
import { canonicalJson } from '../../src/commands/canonical-json';
import { D569IntegrityStop } from '../../src/vtt/d569-integrity';
import {
  BRUTAL_10_PROTOCOL,
  buildRerunPacket,
  R1_10_PROTOCOL,
  type JudgePacket,
  type RerunAnswerKey,
  type RerunProtocol,
} from '../ai-dm-rerun-packet';
import type { JsonRecord } from './ingest';
import {
  luna6Tags,
  type Luna6EffortStudyRegistration,
  type Luna6Stratum,
  type Luna6Tag,
} from './registration';

/** Tokens that would unblind a judge (§3.7 stage 4, M78), searched in the packet's canonical JSON. */
export const LUNA6_FORBIDDEN_PACKET_TOKENS = [
  'gpt-6-luna', 'xhigh', 'reasoningEffort', '"effort"', 'gpt-6-luna-high', 'gpt-6-luna-xhigh',
] as const;

export function luna6PacketLeakViolations(tag: Luna6Tag, packet: unknown): readonly string[] {
  const text = canonicalJson(packet);
  return LUNA6_FORBIDDEN_PACKET_TOKENS
    .filter((token) => text.includes(token))
    .map((token) => `packet ${tag} contains forbidden token ${token}`);
}

/** D898 R3: hard `R1_10_PROTOCOL`; brutal `{ ...BRUTAL_10_PROTOCOL, reps: 3 }`; the second family by its seed list. */
export function luna6PacketProtocol(stratum: Luna6Stratum): RerunProtocol {
  const protocol: RerunProtocol = (() => {
    switch (stratum.id) {
      case 'hard': return R1_10_PROTOCOL;
      case 'brutal': return { ...BRUTAL_10_PROTOCOL, reps: 3 };
      case 'hard2':
      case 'brutal2':
        return { seeds: stratum.seeds, reps: stratum.reps };
    }
  })();
  if (canonicalJson(protocol.seeds) !== canonicalJson(stratum.seeds) || protocol.reps !== stratum.reps) {
    throw new TypeError(`The ${stratum.id} packet protocol does not match the registered cohort.`);
  }
  return protocol;
}

export interface Luna6TagPacket {
  readonly packet: JudgePacket;
  readonly answerKey: RerunAnswerKey;
}

type PacketRegistration = Pick<Luna6EffortStudyRegistration, 'arms' | 'modes' | 'strata'>;

/** Stage 4: every tag's packet and key, and every violation (a `D569IntegrityStop` is marked STOP). */
export function buildLuna6Packets(
  registration: PacketRegistration,
  normalized: Readonly<Partial<Record<Luna6Tag, readonly JsonRecord[]>>>,
  shuffleSeeds: Readonly<Record<Luna6Tag, number>>,
): { readonly packets: Readonly<Partial<Record<Luna6Tag, Luna6TagPacket>>>; readonly violations: readonly string[] } {
  const packets: Partial<Record<Luna6Tag, Luna6TagPacket>> = {};
  const violations: string[] = [];
  for (const tag of luna6Tags(registration)) {
    const stratumId = tag.slice(tag.indexOf('-') + 1);
    const stratum = registration.strata.find((candidate) => candidate.id === stratumId);
    const rows = normalized[tag];
    if (stratum === undefined || rows === undefined) {
      violations.push(`packet ${tag}: normalized rows are missing`);
      continue;
    }
    let built: Luna6TagPacket;
    try {
      built = buildRerunPacket(rows, shuffleSeeds[tag], luna6PacketProtocol(stratum));
    } catch (error) {
      const stop = error instanceof D569IntegrityStop ? 'STOP: ' : '';
      violations.push(`packet ${tag}: ${stop}${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    const expected = stratum.seeds.length * stratum.reps;
    if (built.packet.entries.length !== expected * 2) {
      violations.push(`packet ${tag}: has ${String(built.packet.entries.length)} entries; registered ${String(expected * 2)}`);
    }
    for (const arm of registration.arms) {
      const count = built.answerKey.entries.filter((entry) => entry.arm === arm.id).length;
      if (count !== expected) violations.push(`answer key for ${tag}: has ${String(count)} ${arm.id} entries; registered ${String(expected)}`);
    }
    const leaks = luna6PacketLeakViolations(tag, built.packet);
    violations.push(...leaks);
    packets[tag] = built;
  }
  return { packets, violations };
}
