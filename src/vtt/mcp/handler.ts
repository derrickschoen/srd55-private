export const MCP_PROTOCOL_VERSION = '2026-07-28' as const;
export const MCP_TOOL_RESULT_MAX_BYTES = 64 * 1024;
export const MCP_STATIC_LIST_TTL_MS = 300_000;

export const MCP_PROTOCOL_VERSION_META_KEY = 'io.modelcontextprotocol/protocolVersion' as const;
export const MCP_CLIENT_INFO_META_KEY = 'io.modelcontextprotocol/clientInfo' as const;
export const MCP_CLIENT_CAPABILITIES_META_KEY = 'io.modelcontextprotocol/clientCapabilities' as const;
export const MCP_SERVER_INFO_META_KEY = 'io.modelcontextprotocol/serverInfo' as const;

export type JsonRpcId = string | number | null;

export interface JsonRpcErrorObject {
  readonly code: number;
  readonly message: string;
  readonly data?: unknown;
}

export interface JsonRpcResponse {
  readonly jsonrpc: '2.0';
  readonly id: JsonRpcId;
  readonly result?: unknown;
  readonly error?: JsonRpcErrorObject;
}

export interface McpToolDescriptor {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly outputSchema: Readonly<Record<string, unknown>>;
}

export interface SchemaViolation {
  readonly path: string;
  readonly keyword?: string;
  readonly message: string;
}

export interface McpToolBinding {
  readonly descriptor: McpToolDescriptor;
  readonly validateArguments: (value: unknown) => readonly SchemaViolation[];
  readonly validateOutput: (value: unknown) => readonly SchemaViolation[];
  readonly execute: (value: unknown) => unknown;
}

export interface McpHandler {
  readonly handle: (message: unknown) => JsonRpcResponse | null;
}

interface JsonRpcRequest {
  readonly id: JsonRpcId;
  readonly method: string;
  readonly params?: unknown;
}

type ObjectParamsResult =
  | { readonly ok: true; readonly value: Readonly<Record<string, unknown>> }
  | { readonly ok: false; readonly response: JsonRpcResponse };

const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const UNSUPPORTED_PROTOCOL_VERSION = -32022;

const SERVER_INFO = Object.freeze({ name: 'dnd-wt-vtt-engine', version: '1.0.0' });
const RESPONSE_META = Object.freeze({ [MCP_SERVER_INFO_META_KEY]: SERVER_INFO });

export function mcpRequestMeta(
  clientInfo: { readonly name: string; readonly version: string },
  clientCapabilities: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, unknown>> {
  return {
    [MCP_PROTOCOL_VERSION_META_KEY]: MCP_PROTOCOL_VERSION,
    [MCP_CLIENT_INFO_META_KEY]: clientInfo,
    [MCP_CLIENT_CAPABILITIES_META_KEY]: clientCapabilities,
  };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function responseError(
  id: JsonRpcId,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: { code, message, ...(data === undefined ? {} : { data }) },
  };
}

function invalidParams(id: JsonRpcId, violations: readonly SchemaViolation[]): JsonRpcResponse {
  return responseError(id, INVALID_PARAMS, 'Invalid params', {
    kind: 'schema_violation',
    violations,
  });
}

function invalidRequest(message: string): JsonRpcResponse {
  return responseError(null, INVALID_REQUEST, 'Invalid Request', {
    kind: 'request_violation',
    violations: [{ path: '$', message }],
  });
}

function parseRequest(message: unknown): JsonRpcRequest | JsonRpcResponse | null {
  if (!isRecord(message)) return invalidRequest('JSON-RPC message must be an object.');
  if (message['jsonrpc'] !== '2.0') return invalidRequest('jsonrpc must equal "2.0".');
  const method = message['method'];
  if (typeof method !== 'string' || method.length === 0) {
    return invalidRequest('method must be a non-empty string.');
  }
  if (message['id'] === undefined) {
    return method.startsWith('notifications/') ? null : invalidRequest('Request id is required.');
  }
  const id = message['id'];
  if (id !== null && typeof id !== 'string' &&
    (typeof id !== 'number' || !Number.isFinite(id))) {
    return invalidRequest('id must be a string, finite number, or null.');
  }
  return {
    id,
    method,
    ...(message['params'] === undefined ? {} : { params: message['params'] }),
  };
}

function objectParams(
  id: JsonRpcId,
  value: unknown,
  label: string,
): ObjectParamsResult {
  if (value === undefined) return { ok: true, value: {} };
  if (!isRecord(value)) {
    return {
      ok: false,
      response: invalidParams(id, [{ path: '$', message: `${label} must be an object.` }]),
    };
  }
  return { ok: true, value };
}

function hasOnlyKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function discoveryResult(): unknown {
  return {
    resultType: 'complete',
    supportedVersions: [MCP_PROTOCOL_VERSION],
    capabilities: {
      tools: { listChanged: false },
      resources: { subscribe: true, listChanged: true },
      prompts: { listChanged: true },
    },
    _meta: RESPONSE_META,
    ttlMs: MCP_STATIC_LIST_TTL_MS,
    cacheScope: 'public',
  };
}

function unsupportedProtocolVersion(id: JsonRpcId, requested: string): JsonRpcResponse {
  return responseError(id, UNSUPPORTED_PROTOCOL_VERSION, 'Unsupported protocol version', {
    supported: [MCP_PROTOCOL_VERSION],
    requested,
  });
}

function validateRequestMetadata(
  id: JsonRpcId,
  paramsValue: unknown,
): ObjectParamsResult {
  const decoded = objectParams(id, paramsValue, 'request params');
  if (!decoded.ok) return decoded;
  const params = decoded.value;
  const violations: SchemaViolation[] = [];
  const meta = params['_meta'];
  if (!isRecord(meta)) {
    violations.push({ path: '$._meta', message: 'must be an object.' });
  } else {
    const protocolVersion = meta[MCP_PROTOCOL_VERSION_META_KEY];
    if (typeof protocolVersion !== 'string' || protocolVersion.length === 0) {
      violations.push({
        path: `$._meta.${MCP_PROTOCOL_VERSION_META_KEY}`,
        message: 'must be a non-empty string.',
      });
    }
    const clientInfo = meta[MCP_CLIENT_INFO_META_KEY];
    if (!isRecord(clientInfo)) {
      violations.push({
        path: `$._meta.${MCP_CLIENT_INFO_META_KEY}`,
        message: 'must be an object.',
      });
    } else {
      if (typeof clientInfo['name'] !== 'string' || clientInfo['name'].length === 0) {
        violations.push({
          path: `$._meta.${MCP_CLIENT_INFO_META_KEY}.name`,
          message: 'must be a non-empty string.',
        });
      }
      if (typeof clientInfo['version'] !== 'string' || clientInfo['version'].length === 0) {
        violations.push({
          path: `$._meta.${MCP_CLIENT_INFO_META_KEY}.version`,
          message: 'must be a non-empty string.',
        });
      }
    }
    if (!isRecord(meta[MCP_CLIENT_CAPABILITIES_META_KEY])) {
      violations.push({
        path: `$._meta.${MCP_CLIENT_CAPABILITIES_META_KEY}`,
        message: 'must be an object.',
      });
    }
  }
  if (violations.length > 0) return { ok: false, response: invalidParams(id, violations) };
  if (!isRecord(meta)) {
    return { ok: false, response: invalidParams(id, violations) };
  }
  const protocolVersion = meta[MCP_PROTOCOL_VERSION_META_KEY];
  if (typeof protocolVersion === 'string' && protocolVersion !== MCP_PROTOCOL_VERSION) {
    return { ok: false, response: unsupportedProtocolVersion(id, protocolVersion) };
  }
  return { ok: true, value: params };
}

function toolResult(value: unknown, maximumBytes: number): unknown {
  const text = JSON.stringify(value);
  if (text === undefined) throw new TypeError('Tool result is not JSON serializable.');
  const bytes = new TextEncoder().encode(text).byteLength;
  if (bytes > maximumBytes) {
    return {
      resultType: 'complete',
      isError: true,
      content: [{
        type: 'text',
        text: `TOOL_RESULT_TOO_LARGE: ${bytes} UTF-8 bytes exceeds the ${maximumBytes}-byte limit.`,
      }],
      _meta: RESPONSE_META,
    };
  }
  return {
    resultType: 'complete',
    content: [{ type: 'text', text }],
    structuredContent: value,
    isError: false,
    _meta: RESPONSE_META,
  };
}

function toolExecutionError(error: unknown): unknown {
  return {
    resultType: 'complete',
    isError: true,
    content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
    _meta: RESPONSE_META,
  };
}

function invalidToolArguments(violations: readonly SchemaViolation[]): unknown {
  return toolExecutionError(`Invalid tool arguments: ${JSON.stringify({ violations })}`);
}

export function createMcpHandler(input: {
  readonly tools: readonly McpToolBinding[];
  readonly maximumToolResultBytes?: number;
}): McpHandler {
  const maximumToolResultBytes = input.maximumToolResultBytes ?? MCP_TOOL_RESULT_MAX_BYTES;
  if (!Number.isSafeInteger(maximumToolResultBytes) || maximumToolResultBytes < 1) {
    throw new TypeError('maximumToolResultBytes must be a positive safe integer.');
  }
  const toolsByName = new Map<string, McpToolBinding>();
  for (const binding of input.tools) {
    if (toolsByName.has(binding.descriptor.name)) {
      throw new TypeError(`Duplicate MCP tool name ${binding.descriptor.name}.`);
    }
    toolsByName.set(binding.descriptor.name, binding);
  }
  const descriptors = Object.freeze(input.tools.map((binding) => binding.descriptor));

  return Object.freeze({
    handle(message: unknown): JsonRpcResponse | null {
      const parsed = parseRequest(message);
      if (parsed === null || 'jsonrpc' in parsed) return parsed;
      const metadata = validateRequestMetadata(parsed.id, parsed.params);
      if (!metadata.ok) return metadata.response;
      const requestParams = metadata.value;
      switch (parsed.method) {
        case 'server/discover': {
          if (!hasOnlyKeys(requestParams, ['_meta'])) {
            return invalidParams(parsed.id, [{
              path: '$',
              message: 'server/discover params may contain only _meta.',
            }]);
          }
          return { jsonrpc: '2.0', id: parsed.id, result: discoveryResult() };
        }
        case 'ping': {
          if (!hasOnlyKeys(requestParams, ['_meta'])) {
            return invalidParams(parsed.id, [{ path: '$', message: 'ping params may contain only _meta.' }]);
          }
          return { jsonrpc: '2.0', id: parsed.id, result: { _meta: RESPONSE_META } };
        }
        case 'tools/list': {
          if (!hasOnlyKeys(requestParams, ['_meta', 'cursor'])) {
            return invalidParams(parsed.id, [{ path: '$', message: 'tools/list params contain an unknown property.' }]);
          }
          if (requestParams['cursor'] !== undefined) {
            return invalidParams(parsed.id, [{ path: '$.cursor', message: 'is not a valid cursor.' }]);
          }
          return {
            jsonrpc: '2.0',
            id: parsed.id,
            result: {
              resultType: 'complete',
              tools: descriptors,
              ttlMs: MCP_STATIC_LIST_TTL_MS,
              cacheScope: 'public',
              _meta: RESPONSE_META,
            },
          };
        }
        case 'tools/call': {
          const violations: SchemaViolation[] = [];
          if (!hasOnlyKeys(requestParams, ['_meta', 'name', 'arguments'])) {
            violations.push({ path: '$', message: 'tools/call params contain an unknown property.' });
          }
          const name = requestParams['name'];
          if (typeof name !== 'string' || name.length === 0) {
            violations.push({ path: '$.name', message: 'must be a non-empty string.' });
          }
          if (requestParams['arguments'] !== undefined && !isRecord(requestParams['arguments'])) {
            violations.push({ path: '$.arguments', message: 'must be an object.' });
          }
          if (violations.length > 0) return invalidParams(parsed.id, violations);
          if (typeof name !== 'string') return invalidParams(parsed.id, violations);
          const binding = toolsByName.get(name);
          if (binding === undefined) {
            return responseError(parsed.id, INVALID_PARAMS, `Unknown tool: ${name}`, {
              kind: 'unknown_tool',
              tool: name,
            });
          }
          const argumentsValue = requestParams['arguments'] ?? {};
          const argumentViolations = binding.validateArguments(argumentsValue);
          if (argumentViolations.length > 0) {
            return {
              jsonrpc: '2.0',
              id: parsed.id,
              result: invalidToolArguments(argumentViolations),
            };
          }
          try {
            const value = binding.execute(argumentsValue);
            const outputViolations = binding.validateOutput(value);
            if (outputViolations.length > 0) {
              return {
                jsonrpc: '2.0',
                id: parsed.id,
                result: toolExecutionError(
                  `Tool output violated outputSchema: ${JSON.stringify({ violations: outputViolations })}`,
                ),
              };
            }
            return {
              jsonrpc: '2.0',
              id: parsed.id,
              result: toolResult(value, maximumToolResultBytes),
            };
          } catch (error) {
            return {
              jsonrpc: '2.0',
              id: parsed.id,
              result: toolExecutionError(error),
            };
          }
        }
        default:
          return responseError(
            parsed.id,
            METHOD_NOT_FOUND,
            `Method not found: ${parsed.method}`,
          );
      }
    },
  });
}

export function jsonRpcParseError(): JsonRpcResponse {
  return responseError(null, -32700, 'Parse error');
}
