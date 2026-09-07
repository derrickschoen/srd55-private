import type { ConversationRowPersisted } from '../../tools/ai-dm-conversation';
import type { ArenaConversationPart } from '../../tools/ai-dm-arena';
import type { BlindMaxAttempts, BlindRepairArm, DmMode } from '../../src/vtt/blind-dm-contract';
import type { BlindIngressAuditSummary } from '../../src/vtt/blind-model-ingress';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2)
    ? (<Value>() => Value extends Right ? 1 : 2) extends
      (<Value>() => Value extends Left ? 1 : 2)
        ? true
        : false
    : false;

type Assert<Condition extends true> = Condition;

type ArenaConversationKeysMatchRunner = Assert<
  Equal<keyof ArenaConversationPart, keyof ConversationRowPersisted>
>;

type DmModeMatches = Assert<Equal<ConversationRowPersisted['dmMode'], DmMode | undefined>>;
type RepairArmMatches = Assert<
  Equal<ConversationRowPersisted['blindRepairArm'], BlindRepairArm | undefined>
>;
type AttemptCapMatches = Assert<
  Equal<ConversationRowPersisted['blindMaxAttempts'], BlindMaxAttempts | undefined>
>;
type IngressAuditMatches = Assert<
  Equal<ConversationRowPersisted['blindIngressAudit'], BlindIngressAuditSummary | undefined>
>;
type FirstTokenNullable = Assert<Equal<
  NonNullable<ConversationRowPersisted['blindAttempts']>[number]['modelFirstTokenMs'],
  number | null
>>;

export type ArenaRowContractPins =
  | ArenaConversationKeysMatchRunner
  | DmModeMatches
  | RepairArmMatches
  | AttemptCapMatches
  | IngressAuditMatches
  | FirstTokenNullable;
