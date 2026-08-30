import {
  agentSessionIdFromCli,
  type AgentFailureClassification,
  type AgentInvocation,
  type AgentSessionBinding,
  type AgentToolDescriptor,
  type AgentTurnResult,
  type AgentUsage,
} from '../agent-session';

export interface LocalOpenAiConfig {
  readonly baseUrl: string;
  readonly model: string;
  readonly thinkMode: LocalThinkMode;
  readonly apiKey?: string;
}

export type LocalThinkMode = 'on' | 'off';

export interface OpenAiFunctionTool {
  readonly type: 'function';
  readonly function: {
    readonly name: string;
    readonly description: string;
    readonly parameters: Readonly<Record<string, unknown>>;
  };
}

export interface LocalOpenAiAdapterOptions {
  readonly baseUrl: string;
  readonly thinkMode: LocalThinkMode;
  readonly apiKey?: string;
  readonly fetch?: typeof fetch;
  readonly maximumToolRounds?: number;
}

type LocalOpenAiErrorKind = 'authentication' | 'transport' | 'malformed_response';

export class LocalOpenAiAdapterError extends Error {
  constructor(readonly kind: LocalOpenAiErrorKind, message: string) {
    super(message);
    this.name = 'LocalOpenAiAdapterError';
  }
}

interface OpenAiToolCall {
  readonly id: string;
  readonly type: 'function';
  readonly function: { readonly name: string; readonly arguments: string };
}

type OpenAiMessage =
  | { readonly role: 'system' | 'user'; readonly content: string }
  | { readonly role: 'assistant'; readonly content: string | null; readonly tool_calls?: readonly OpenAiToolCall[] }
  | { readonly role: 'tool'; readonly tool_call_id: string; readonly content: string };

interface DecodedCompletion {
  readonly message: Extract<OpenAiMessage, { readonly role: 'assistant' }>;
  readonly usage: AgentUsage | null;
}

function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : null;
}

function nonNegativeInteger(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function usageFromResponse(value: unknown): AgentUsage | null {
  const usage = record(value);
  if (usage === null) return null;
  const promptDetails = record(usage['prompt_tokens_details']);
  const completionDetails = record(usage['completion_tokens_details']);
  const decoded = {
    inputTokens: nonNegativeInteger(usage['prompt_tokens']),
    cachedInputTokens: nonNegativeInteger(promptDetails?.['cached_tokens']),
    outputTokens: nonNegativeInteger(usage['completion_tokens']),
    reasoningTokens: nonNegativeInteger(completionDetails?.['reasoning_tokens']),
  };
  return Object.values(decoded).some((count) => count > 0) ? decoded : null;
}

function addUsage(total: AgentUsage | null, addition: AgentUsage | null): AgentUsage | null {
  if (addition === null) return total;
  if (total === null) return addition;
  return {
    inputTokens: total.inputTokens + addition.inputTokens,
    cachedInputTokens: total.cachedInputTokens + addition.cachedInputTokens,
    outputTokens: total.outputTokens + addition.outputTokens,
    reasoningTokens: total.reasoningTokens + addition.reasoningTokens,
  };
}

export function localOpenAiFunctionName(engineToolName: string): string {
  return engineToolName.replaceAll('.', '__');
}

export function openAiFunctionTools(tools: readonly AgentToolDescriptor[]): readonly OpenAiFunctionTool[] {
  const names = new Set<string>();
  return Object.freeze(tools.map((tool): OpenAiFunctionTool => {
    const name = localOpenAiFunctionName(tool.name);
    if (!/^[a-zA-Z0-9_-]{1,64}$/u.test(name)) {
      throw new TypeError(`Engine tool ${tool.name} cannot be represented as an OpenAI function name.`);
    }
    if (names.has(name)) throw new TypeError(`Engine tools collide on OpenAI function name ${name}.`);
    names.add(name);
    return Object.freeze({
      type: 'function',
      function: Object.freeze({
        name,
        description: tool.description,
        parameters: tool.inputSchema,
      }),
    });
  }));
}

function chatCompletionsUrl(baseUrl: string): string {
  let url: URL;
  try { url = new URL(baseUrl); }
  catch { throw new TypeError('Local OpenAI baseUrl must be an absolute HTTP(S) URL.'); }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new TypeError('Local OpenAI baseUrl must use HTTP or HTTPS.');
  }
  if (url.username.length > 0 || url.password.length > 0 || url.search.length > 0 || url.hash.length > 0) {
    throw new TypeError('Local OpenAI baseUrl cannot contain credentials, a query, or a fragment.');
  }
  url.pathname = `${url.pathname.replace(/\/+$/u, '')}/chat/completions`;
  return url.toString();
}

function decodeToolCalls(value: unknown): readonly OpenAiToolCall[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new LocalOpenAiAdapterError('malformed_response', 'Local OpenAI tool_calls must be an array.');
  return value.map((candidate): OpenAiToolCall => {
    const call = record(candidate);
    const functionValue = record(call?.['function']);
    if (call?.['type'] !== 'function' || typeof call['id'] !== 'string' || call['id'].length === 0 ||
      typeof functionValue?.['name'] !== 'string' || typeof functionValue['arguments'] !== 'string') {
      throw new LocalOpenAiAdapterError('malformed_response', 'Local OpenAI returned a malformed function tool call.');
    }
    return {
      id: call['id'],
      type: 'function',
      function: { name: functionValue['name'], arguments: functionValue['arguments'] },
    };
  });
}

function decodeCompletion(value: unknown): DecodedCompletion {
  const root = record(value);
  const choices = root?.['choices'];
  const choice = Array.isArray(choices) ? record(choices[0]) : null;
  const message = record(choice?.['message']);
  const content = message?.['content'];
  if (message?.['role'] !== 'assistant' ||
    (content !== undefined && content !== null && typeof content !== 'string')) {
    throw new LocalOpenAiAdapterError('malformed_response', 'Local OpenAI response omitted choices[0].message.');
  }
  const toolCalls = decodeToolCalls(message['tool_calls']);
  return {
    message: {
      role: 'assistant',
      content: typeof content === 'string' ? content : null,
      ...(toolCalls.length === 0 ? {} : { tool_calls: toolCalls }),
    },
    usage: usageFromResponse(root?.['usage']),
  };
}

function toolResultText(value: unknown): string {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new TypeError('Engine tool result is not JSON serializable.');
  return serialized;
}

export class LocalOpenAiAgentSessionAdapter {
  readonly kind = 'local-openai' as const;
  readonly #endpoint: string;
  readonly #fetch: typeof fetch;
  readonly #maximumToolRounds: number;
  readonly #apiKey: string | undefined;
  readonly #thinkMode: LocalThinkMode;
  readonly #messages = new Map<string, OpenAiMessage[]>();
  #sessionSequence = 0;

  constructor(options: LocalOpenAiAdapterOptions) {
    this.#endpoint = chatCompletionsUrl(options.baseUrl);
    this.#fetch = options.fetch ?? fetch;
    this.#maximumToolRounds = options.maximumToolRounds ?? 16;
    this.#thinkMode = options.thinkMode;
    if (!Number.isSafeInteger(this.#maximumToolRounds) || this.#maximumToolRounds < 1) {
      throw new TypeError('maximumToolRounds must be a positive safe integer.');
    }
    if (options.apiKey !== undefined && (options.apiKey.length === 0 || options.apiKey.trim() !== options.apiKey)) {
      throw new TypeError('Local OpenAI apiKey must be a non-empty trimmed string when supplied.');
    }
    this.#apiKey = options.apiKey;
  }

  probe(): Promise<{ readonly present: boolean; readonly version: string | null }> {
    return Promise.resolve({ present: true, version: 'openai-compatible-http' });
  }

  start(invocation: AgentInvocation, signal: AbortSignal): Promise<AgentTurnResult> {
    this.#sessionSequence += 1;
    const sessionId = agentSessionIdFromCli(
      `local-openai:${invocation.runId}:${String(this.#sessionSequence)}`,
    );
    const messages: OpenAiMessage[] = [];
    if (invocation.instructions !== undefined && invocation.instructions !== null) {
      messages.push({ role: 'system', content: invocation.instructions });
    }
    this.#messages.set(sessionId, messages);
    return this.#invoke(sessionId, invocation, signal);
  }

  resume(
    binding: AgentSessionBinding,
    invocation: AgentInvocation,
    signal: AbortSignal,
  ): Promise<AgentTurnResult> {
    if (!this.#messages.has(binding.sessionId)) {
      return Promise.reject(new LocalOpenAiAdapterError(
        'malformed_response',
        `Local OpenAI in-memory conversation ${binding.sessionId} does not exist.`,
      ));
    }
    return this.#invoke(binding.sessionId, invocation, signal);
  }

  classifyFailure(error: unknown): AgentFailureClassification {
    if (!(error instanceof LocalOpenAiAdapterError)) return 'unknown';
    if (error.kind === 'authentication') return 'authentication';
    if (error.kind === 'transport') return 'transport';
    return 'agent_exit';
  }

  async #invoke(
    sessionId: import('../../combat/values').AgentSessionId,
    invocation: AgentInvocation,
    signal: AbortSignal,
  ): Promise<AgentTurnResult> {
    const toolSession = invocation.toolSession;
    if (toolSession === undefined) {
      throw new LocalOpenAiAdapterError('malformed_response', 'Local OpenAI invocation omitted its in-process engine tool session.');
    }
    const messages = this.#messages.get(sessionId);
    if (messages === undefined) throw new Error('Local OpenAI conversation disappeared during dispatch.');
    messages.push({ role: 'user', content: invocation.prompt });
    const tools = openAiFunctionTools(toolSession.tools);
    const engineNamesByFunction = new Map(toolSession.tools.map((tool) => [
      localOpenAiFunctionName(tool.name),
      tool.name,
    ]));
    let usage: AgentUsage | null = null;
    let finalText = '';
    for (let toolRound = 0; toolRound < this.#maximumToolRounds; toolRound += 1) {
      const completion = await this.#completion(
        invocation.model,
        invocation.reasoningEffort,
        messages,
        tools,
        signal,
        invocation.timeoutMs,
      );
      usage = addUsage(usage, completion.usage);
      messages.push(completion.message);
      finalText = completion.message.content ?? finalText;
      const toolCalls = completion.message.tool_calls ?? [];
      if (toolCalls.length === 0) {
        return { resumeSessionId: sessionId, sessionId: null, finalText, usage, exit: 'completed' };
      }
      for (const call of toolCalls) {
        const engineName = engineNamesByFunction.get(call.function.name);
        let result: unknown;
        if (engineName === undefined) {
          result = { error: `Unknown engine function ${call.function.name}.` };
        } else {
          try {
            const argumentsValue: unknown = JSON.parse(call.function.arguments);
            if (record(argumentsValue) === null) throw new TypeError('Function arguments must decode to an object.');
            result = toolSession.execute(engineName, argumentsValue);
          } catch (error) {
            result = { error: error instanceof Error ? error.message : String(error) };
          }
        }
        messages.push({ role: 'tool', tool_call_id: call.id, content: toolResultText(result) });
        const status = record(result)?.['status'];
        if ((engineName === 'engine.submit_round_proposals' && status === 'proposed') ||
          (engineName === 'engine.submit_plan_adjustment' && (status === 'proposed' || status === 'rejected'))) {
          return { resumeSessionId: sessionId, sessionId: null, finalText, usage, exit: 'completed' };
        }
      }
    }
    return {
      resumeSessionId: sessionId,
      sessionId: null,
      finalText: finalText.length > 0 ? finalText : 'LOCAL_OPENAI_TOOL_ROUND_LIMIT',
      usage,
      exit: 'completed',
    };
  }

  async #completion(
    model: string,
    reasoningEffort: AgentInvocation['reasoningEffort'],
    messages: readonly OpenAiMessage[],
    tools: readonly OpenAiFunctionTool[],
    signal: AbortSignal,
    timeoutMs: number | null,
  ): Promise<DecodedCompletion> {
    const controller = new AbortController();
    const abort = (): void => { controller.abort(signal.reason); };
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
    const timer = timeoutMs === null ? null : setTimeout(() => {
      controller.abort(new Error(`Local OpenAI request timed out after ${String(timeoutMs)} ms.`));
    }, timeoutMs);
    try {
      let response: Response;
      try {
        response = await this.#fetch(this.#endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(this.#apiKey === undefined ? {} : { authorization: `Bearer ${this.#apiKey}` }),
          },
          body: JSON.stringify({
            model,
            messages,
            tools,
            tool_choice: 'auto',
            stream: false,
            reasoning_effort: this.#thinkMode === 'off'
              ? 'none'
              : reasoningEffort === 'xhigh' ? 'high' : reasoningEffort,
          }),
          signal: controller.signal,
        });
      } catch (error) {
        const detail = controller.signal.aborted && timeoutMs !== null
          ? `Local OpenAI request timed out or was aborted after ${String(timeoutMs)} ms.`
          : `Local OpenAI transport failed: ${error instanceof Error ? error.message : String(error)}`;
        throw new LocalOpenAiAdapterError('transport', detail);
      }
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 500);
        const kind: LocalOpenAiErrorKind = response.status === 401 || response.status === 403
          ? 'authentication'
          : 'transport';
        throw new LocalOpenAiAdapterError(
          kind,
          `Local OpenAI endpoint returned HTTP ${String(response.status)}${detail.length === 0 ? '' : `: ${detail}`}`,
        );
      }
      let decoded: unknown;
      try { decoded = await response.json() as unknown; }
      catch {
        throw new LocalOpenAiAdapterError('malformed_response', 'Local OpenAI endpoint returned non-JSON content.');
      }
      return decodeCompletion(decoded);
    } finally {
      if (timer !== null) clearTimeout(timer);
      signal.removeEventListener('abort', abort);
    }
  }
}
