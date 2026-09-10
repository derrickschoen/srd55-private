import type { SerializableRng } from '../../src/combat/random';
import type {
  CompletedSessionCommandTrial,
  RolledBackSessionCommandTrial,
  SessionCommandProgramPort,
  SessionCommandTrialCore,
  SessionCommandTrialOutcome,
} from '../../src/vtt/session-command-transaction';

type Assert<Condition extends true> = Condition;

type Exact<Left, Right> =
  (<Generic>() => Generic extends Left ? 1 : 2) extends
  (<Generic>() => Generic extends Right ? 1 : 2)
    ? true
    : false;

type TestOutcome = SessionCommandTrialOutcome<'program-value', SerializableRng>;
type CompletedArm = Extract<TestOutcome, { readonly kind: 'completed' }>;
type RolledBackArm = Extract<TestOutcome, { readonly kind: 'rolled_back' }>;
type SessionCommitInput = CompletedSessionCommandTrial<unknown, SerializableRng>;

type _ProgramPortExposesExactlyTwoOperations = Assert<
  Exact<keyof SessionCommandProgramPort, 'currentState' | 'apply'>
>;

type _CoreExposesOnlyOwnershipNeutralTrialOperations = Assert<
  Exact<
    keyof SessionCommandTrialCore<SerializableRng>,
    'currentState' | 'resolveBoundary' | 'apply' | 'snapshot'
  >
>;

type _CoreHasNoForkCheckpointOrTerminalOperation = Assert<
  Extract<
    keyof SessionCommandTrialCore<SerializableRng>,
    'fork' | 'checkpoint' | 'restoreCheckpoint' | 'complete' | 'rollback' | 'commit'
  > extends never ? true : false
>;

type _RolledBackContractHasNoCommitPayload = Assert<
  Exact<keyof RolledBackSessionCommandTrial, 'kind' | 'error'>
>;

type _OutcomeRolledBackArmRetainsExactContract = Assert<
  Exact<RolledBackArm, RolledBackSessionCommandTrial>
>;

type _CompletedArmIsACommitInput = Assert<
  CompletedArm extends SessionCommitInput ? true : false
>;

type _RolledBackArmIsNotACommitInput = Assert<
  RolledBackArm extends SessionCommitInput ? false : true
>;

function narrowedCommitInput(outcome: TestOutcome): SessionCommitInput | null {
  if (outcome.kind === 'completed') return outcome;
  return null;
}

export type SessionCommandTransactionTypeProof = [
  _ProgramPortExposesExactlyTwoOperations,
  _CoreExposesOnlyOwnershipNeutralTrialOperations,
  _CoreHasNoForkCheckpointOrTerminalOperation,
  _RolledBackContractHasNoCommitPayload,
  _OutcomeRolledBackArmRetainsExactContract,
  _CompletedArmIsACommitInput,
  _RolledBackArmIsNotACommitInput,
  ReturnType<typeof narrowedCommitInput>,
];
