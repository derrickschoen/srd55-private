import type { ConversationRowPersisted } from '../../tools/ai-dm-conversation';
import type { ArenaConversationPart } from '../../tools/ai-dm-arena';

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

export type ArenaRowContractPins = ArenaConversationKeysMatchRunner;
