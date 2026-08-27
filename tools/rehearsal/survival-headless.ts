import { RpcClient, type RpcTransport } from '../../src/rpc/client';
import type { RpcRequest, RpcResponse } from '../../src/rpc/protocol';
import { rpcRegistry } from '../../src/worker/registry';
import { loadD365SampleParty } from '../../src/vtt/d365-sample-party';
import {
  measureSurvivalFraction,
  SURVIVAL_MEASUREMENT_SEEDS,
  type SurvivalCampaignMode,
} from '../../src/vtt/survival-harness';
import type { HandlerContext } from '../../src/worker/handler';
import { createSeededRpcHarness } from '../../tests/helpers/rpc-harness';

class RegistryTransport implements RpcTransport {
  readonly #messages = new Set<(event: MessageEvent<RpcResponse>) => void>();
  readonly #errors = new Set<(event: ErrorEvent) => void>();

  constructor(private readonly context: HandlerContext) {}

  postMessage(message: RpcRequest): void {
    void rpcRegistry.dispatch(message, this.context).then((response) => {
      const event = new MessageEvent<RpcResponse>('message', { data: response });
      for (const listener of this.#messages) listener(event);
    }).catch((error: unknown) => {
      const event = new ErrorEvent('error', {
        message: error instanceof Error ? error.message : String(error),
      });
      for (const listener of this.#errors) listener(event);
    });
  }

  addEventListener(
    type: 'message' | 'error',
    listener: ((event: MessageEvent<RpcResponse>) => void) | ((event: ErrorEvent) => void),
  ): void {
    if (type === 'message') this.#messages.add(listener as (event: MessageEvent<RpcResponse>) => void);
    else this.#errors.add(listener as (event: ErrorEvent) => void);
  }

  removeEventListener(
    type: 'message' | 'error',
    listener: ((event: MessageEvent<RpcResponse>) => void) | ((event: ErrorEvent) => void),
  ): void {
    if (type === 'message') this.#messages.delete(listener as (event: MessageEvent<RpcResponse>) => void);
    else this.#errors.delete(listener as (event: ErrorEvent) => void);
  }
}

function modeFromArgs(args: readonly string[]): SurvivalCampaignMode {
  const value = args.find((argument) => argument.startsWith('--mode='))?.slice('--mode='.length) ?? 'survival_package';
  if (value !== 'rehearsal_baseline' && value !== 'survival_package') {
    throw new RangeError(`Unknown survival measurement mode ${value}.`);
  }
  return value;
}

const harness = await createSeededRpcHarness([]);
const rpc = new RpcClient(new RegistryTransport(harness.context));
try {
  const sample = await loadD365SampleParty(rpc);
  if (process.argv.includes('--describe-party')) {
    process.stdout.write(`${JSON.stringify(sample.party.members.map((member) => ({
      name: sample.displayNames.get(member.profile.characterId) ?? member.profile.name,
      classes: member.source.classes,
      abilities: member.source.abilities,
      armorClass: member.profile.rules.armorClass,
      hitPointMaximum: member.profile.rules.hitPointMaximum,
      attacks: member.attacks,
      spells: member.spells.map((spell) => spell.name),
      sharedSpellSlots: member.sharedSpellSlots,
      pactSpellSlots: member.pactSpellSlots,
      hitDice: member.hitDice,
    })), null, 2)}\n`);
  } else {
    const measurement = await measureSurvivalFraction(
      sample.party.members,
      sample.displayNames,
      SURVIVAL_MEASUREMENT_SEEDS,
      modeFromArgs(process.argv.slice(2)),
    );
    process.stdout.write(`${JSON.stringify(measurement, null, 2)}\n`);
  }
} finally {
  rpc.close();
  harness.close();
}
