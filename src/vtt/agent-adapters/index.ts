import type { AgentCliKind, AgentSessionAdapter } from '../agent-session';
import { ClaudeCodeAgentSessionAdapter } from './claude-code';
import { CodexAgentSessionAdapter } from './codex';
import { OpenCodeAgentSessionAdapter } from './opencode';
import { PiAgentSessionAdapter } from './pi';
import type { AgentAdapterOptions } from './process';

export function resolveAgentAdapter(
  kind: AgentCliKind,
  options: AgentAdapterOptions = {},
): AgentSessionAdapter {
  switch (kind) {
    case 'codex': return new CodexAgentSessionAdapter(options);
    case 'opencode': return new OpenCodeAgentSessionAdapter(options);
    case 'pi': return new PiAgentSessionAdapter(options);
    case 'claude-code': return new ClaudeCodeAgentSessionAdapter(options);
  }
}

export type { AgentAdapterOptions, AgentProcessOutput, AgentProcessRunner, AgentProcessSpec } from './process';
export { AgentAdapterError, AGENT_ADAPTER_VERSION } from './process';
