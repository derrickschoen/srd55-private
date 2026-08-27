export const MCP_PROTOCOL_VERSION = '2026-07-28' as const;
export const MCP_TOOL_RESULT_MAX_BYTES = 64 * 1024;
export const MCP_RESOURCE_MAX_BYTES = 128 * 1024;
export const MCP_STATIC_LIST_TTL_MS = 300_000;

export const MCP_PROTOCOL_VERSION_META_KEY = 'io.modelcontextprotocol/protocolVersion' as const;
export const MCP_CLIENT_INFO_META_KEY = 'io.modelcontextprotocol/clientInfo' as const;
export const MCP_CLIENT_CAPABILITIES_META_KEY = 'io.modelcontextprotocol/clientCapabilities' as const;
export const MCP_SERVER_INFO_META_KEY = 'io.modelcontextprotocol/serverInfo' as const;

export type JsonRpcId = string | number | null;
export interface JsonRpcErrorObject { readonly code: number; readonly message: string; readonly data?: unknown }
export interface JsonRpcResponse { readonly jsonrpc: '2.0'; readonly id: JsonRpcId; readonly result?: unknown; readonly error?: JsonRpcErrorObject }
export interface JsonRpcNotification { readonly jsonrpc: '2.0'; readonly method: string; readonly params: Readonly<Record<string, unknown>> }
export interface McpToolDescriptor {
  readonly name: string; readonly description: string;
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly outputSchema: Readonly<Record<string, unknown>>;
  readonly annotations?: Readonly<Record<string, boolean>>;
}
export interface SchemaViolation { readonly path: string; readonly keyword?: string; readonly message: string }
export interface McpToolBinding {
  readonly descriptor: McpToolDescriptor;
  readonly validateArguments: (value: unknown) => readonly SchemaViolation[];
  readonly validateOutput: (value: unknown) => readonly SchemaViolation[];
  readonly execute: (value: unknown) => unknown;
}
export interface McpResourceDescriptor { readonly uri: string; readonly name: string; readonly description: string; readonly mimeType: 'application/json' }
export interface McpResourceTemplateDescriptor { readonly uriTemplate: string; readonly name: string; readonly description: string; readonly mimeType: 'application/json' }
export interface McpResourceContent { readonly uri: string; readonly mimeType: 'application/json'; readonly text: string }
export interface McpResourceProvider {
  readonly list: () => readonly McpResourceDescriptor[];
  readonly templates: () => readonly McpResourceTemplateDescriptor[];
  readonly read: (uri: string) => McpResourceContent;
  readonly subscribe: (uri: string, listener: (event: { readonly uri: string; readonly listChanged: boolean }) => void) => () => void;
}
export interface McpPromptDescriptor {
  readonly name: string; readonly description: string;
  readonly arguments: readonly { readonly name: string; readonly description: string; readonly required: boolean }[];
}
export interface McpPromptProvider { readonly list: () => readonly McpPromptDescriptor[]; readonly get: (name: string, argumentsValue: unknown) => unknown }
export interface McpHandler { readonly handle: (message: unknown) => JsonRpcResponse | null; readonly drainNotifications: () => readonly JsonRpcNotification[] }

interface JsonRpcRequest { readonly id: JsonRpcId; readonly method: string; readonly params?: unknown }
type ObjectParamsResult = { readonly ok: true; readonly value: Readonly<Record<string, unknown>> } | { readonly ok: false; readonly response: JsonRpcResponse };
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const UNSUPPORTED_PROTOCOL_VERSION = -32022;
const SERVER_INFO = Object.freeze({ name: 'dnd-wt-vtt-engine', version: '1.0.0' });
const RESPONSE_META = Object.freeze({ [MCP_SERVER_INFO_META_KEY]: SERVER_INFO });

export function mcpRequestMeta(clientInfo: { readonly name: string; readonly version: string }, clientCapabilities: Readonly<Record<string, unknown>> = {}): Readonly<Record<string, unknown>> {
  return { [MCP_PROTOCOL_VERSION_META_KEY]: MCP_PROTOCOL_VERSION, [MCP_CLIENT_INFO_META_KEY]: clientInfo, [MCP_CLIENT_CAPABILITIES_META_KEY]: clientCapabilities };
}
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> { return typeof value === 'object' && value !== null && !Array.isArray(value) }
function responseError(id: JsonRpcId, code: number, message: string, data?: unknown): JsonRpcResponse { return { jsonrpc: '2.0', id, error: { code, message, ...(data === undefined ? {} : { data }) } } }
function invalidParams(id: JsonRpcId, violations: readonly SchemaViolation[]): JsonRpcResponse { return responseError(id, INVALID_PARAMS, 'Invalid params', { kind: 'schema_violation', violations }) }
function invalidRequest(message: string): JsonRpcResponse { return responseError(null, INVALID_REQUEST, 'Invalid Request', { kind: 'request_violation', violations: [{ path: '$', message }] }) }
function parseRequest(message: unknown): JsonRpcRequest | JsonRpcResponse | null {
  if (!isRecord(message)) return invalidRequest('JSON-RPC message must be an object.');
  if (message['jsonrpc'] !== '2.0') return invalidRequest('jsonrpc must equal "2.0".');
  const method = message['method'];
  if (typeof method !== 'string' || method.length === 0) return invalidRequest('method must be a non-empty string.');
  if (message['id'] === undefined) return method.startsWith('notifications/') ? null : invalidRequest('Request id is required.');
  const id = message['id'];
  if (id !== null && typeof id !== 'string' && (typeof id !== 'number' || !Number.isFinite(id))) return invalidRequest('id must be a string, finite number, or null.');
  return { id, method, ...(message['params'] === undefined ? {} : { params: message['params'] }) };
}
function objectParams(id: JsonRpcId, value: unknown, label: string): ObjectParamsResult {
  if (value === undefined) return { ok: true, value: {} };
  return isRecord(value) ? { ok: true, value } : { ok: false, response: invalidParams(id, [{ path: '$', message: `${label} must be an object.` }]) };
}
function hasOnlyKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean { return Object.keys(value).every((key) => keys.includes(key)) }
function validateRequestMetadata(id: JsonRpcId, paramsValue: unknown): ObjectParamsResult {
  const decoded = objectParams(id, paramsValue, 'request params');
  if (!decoded.ok) return decoded;
  const params = decoded.value;
  const violations: SchemaViolation[] = [];
  const meta = params['_meta'];
  if (!isRecord(meta)) violations.push({ path: '$._meta', message: 'must be an object.' });
  else {
    const version = meta[MCP_PROTOCOL_VERSION_META_KEY];
    if (typeof version !== 'string' || version.length === 0) violations.push({ path: `$._meta.${MCP_PROTOCOL_VERSION_META_KEY}`, message: 'must be a non-empty string.' });
    const clientInfo = meta[MCP_CLIENT_INFO_META_KEY];
    if (!isRecord(clientInfo)) violations.push({ path: `$._meta.${MCP_CLIENT_INFO_META_KEY}`, message: 'must be an object.' });
    else {
      if (typeof clientInfo['name'] !== 'string' || clientInfo['name'].length === 0) violations.push({ path: `$._meta.${MCP_CLIENT_INFO_META_KEY}.name`, message: 'must be a non-empty string.' });
      if (typeof clientInfo['version'] !== 'string' || clientInfo['version'].length === 0) violations.push({ path: `$._meta.${MCP_CLIENT_INFO_META_KEY}.version`, message: 'must be a non-empty string.' });
    }
    if (!isRecord(meta[MCP_CLIENT_CAPABILITIES_META_KEY])) violations.push({ path: `$._meta.${MCP_CLIENT_CAPABILITIES_META_KEY}`, message: 'must be an object.' });
  }
  if (violations.length > 0) return { ok: false, response: invalidParams(id, violations) };
  if (!isRecord(meta)) return { ok: false, response: invalidParams(id, violations) };
  const version = meta[MCP_PROTOCOL_VERSION_META_KEY];
  return typeof version === 'string' && version !== MCP_PROTOCOL_VERSION
    ? { ok: false, response: responseError(id, UNSUPPORTED_PROTOCOL_VERSION, 'Unsupported protocol version', { supported: [MCP_PROTOCOL_VERSION], requested: version }) }
    : { ok: true, value: params };
}
function completeList(field: string, values: readonly unknown[], nextCursor: string | null): unknown {
  return { resultType: 'complete', [field]: values, ...(nextCursor === null ? {} : { nextCursor }), ttlMs: MCP_STATIC_LIST_TTL_MS, cacheScope: 'public', _meta: RESPONSE_META };
}
function toolResult(value: unknown, maximumBytes: number): unknown {
  const text = JSON.stringify(value);
  if (text === undefined) throw new TypeError('Tool result is not JSON serializable.');
  const bytes = new TextEncoder().encode(text).byteLength;
  if (bytes > maximumBytes) return { resultType: 'complete', isError: true, content: [{ type: 'text', text: `TOOL_RESULT_TOO_LARGE: ${bytes} UTF-8 bytes exceeds the ${maximumBytes}-byte limit.` }], _meta: RESPONSE_META };
  return { resultType: 'complete', content: [{ type: 'text', text }], structuredContent: value, isError: false, _meta: RESPONSE_META };
}
function toolExecutionError(error: unknown): unknown { return { resultType: 'complete', isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }], _meta: RESPONSE_META } }
function listPage(kind: string, values: readonly unknown[], cursor: unknown, pageSize: number, issued: Map<string, { readonly kind: string; readonly offset: number }>): { readonly values: readonly unknown[]; readonly nextCursor: string | null } | null {
  let offset = 0;
  if (cursor !== undefined) {
    if (typeof cursor !== 'string') return null;
    const entry = issued.get(cursor);
    if (entry === undefined || entry.kind !== kind) return null;
    offset = entry.offset;
  }
  const page = values.slice(offset, offset + pageSize);
  const nextOffset = offset + page.length;
  if (nextOffset >= values.length) return { values: page, nextCursor: null };
  const nextCursor = `mcp:${kind}:${String(nextOffset)}:${String(values.length)}`;
  issued.set(nextCursor, { kind, offset: nextOffset });
  return { values: page, nextCursor };
}

export function createMcpHandler(input: {
  readonly tools: readonly McpToolBinding[]; readonly resources?: McpResourceProvider; readonly prompts?: McpPromptProvider;
  readonly maximumToolResultBytes?: number; readonly maximumResourceBytes?: number; readonly listPageSize?: number;
}): McpHandler {
  const maximumToolResultBytes = input.maximumToolResultBytes ?? MCP_TOOL_RESULT_MAX_BYTES;
  const maximumResourceBytes = input.maximumResourceBytes ?? MCP_RESOURCE_MAX_BYTES;
  const listPageSize = input.listPageSize ?? 100;
  for (const [label, value] of Object.entries({ maximumToolResultBytes, maximumResourceBytes, listPageSize })) if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${label} must be a positive safe integer.`);
  const toolsByName = new Map<string, McpToolBinding>();
  for (const binding of input.tools) {
    if (toolsByName.has(binding.descriptor.name)) throw new TypeError(`Duplicate MCP tool name ${binding.descriptor.name}.`);
    toolsByName.set(binding.descriptor.name, binding);
  }
  const descriptors = Object.freeze(input.tools.map((binding) => binding.descriptor));
  const cursors = new Map<string, { readonly kind: string; readonly offset: number }>();
  const notifications: JsonRpcNotification[] = [];
  const unsubscribe = new Map<string, () => void>();
  function listed(id: JsonRpcId, params: Readonly<Record<string, unknown>>, kind: string, field: string, values: readonly unknown[]): JsonRpcResponse {
    if (!hasOnlyKeys(params, ['_meta', 'cursor'])) return invalidParams(id, [{ path: '$', message: `${kind}/list params contain an unknown property.` }]);
    const page = listPage(kind, values, params['cursor'], listPageSize, cursors);
    return page === null ? invalidParams(id, [{ path: '$.cursor', message: 'is not a valid cursor.' }]) : { jsonrpc: '2.0', id, result: completeList(field, page.values, page.nextCursor) };
  }
  return Object.freeze({
    drainNotifications(): readonly JsonRpcNotification[] { return notifications.splice(0, notifications.length) },
    handle(message: unknown): JsonRpcResponse | null {
      const parsed = parseRequest(message);
      if (parsed === null || 'jsonrpc' in parsed) return parsed;
      const metadata = validateRequestMetadata(parsed.id, parsed.params);
      if (!metadata.ok) return metadata.response;
      const params = metadata.value;
      switch (parsed.method) {
        case 'server/discover':
          if (!hasOnlyKeys(params, ['_meta'])) return invalidParams(parsed.id, [{ path: '$', message: 'server/discover params may contain only _meta.' }]);
          return { jsonrpc: '2.0', id: parsed.id, result: { resultType: 'complete', supportedVersions: [MCP_PROTOCOL_VERSION], capabilities: { tools: { listChanged: false }, resources: { subscribe: input.resources !== undefined, listChanged: input.resources !== undefined }, prompts: { listChanged: input.prompts !== undefined } }, _meta: RESPONSE_META, ttlMs: MCP_STATIC_LIST_TTL_MS, cacheScope: 'public' } };
        case 'ping': return !hasOnlyKeys(params, ['_meta']) ? invalidParams(parsed.id, [{ path: '$', message: 'ping params may contain only _meta.' }]) : { jsonrpc: '2.0', id: parsed.id, result: { _meta: RESPONSE_META } };
        case 'tools/list': return listed(parsed.id, params, 'tools', 'tools', descriptors);
        case 'resources/list': return input.resources === undefined ? responseError(parsed.id, METHOD_NOT_FOUND, 'Method not found: resources/list') : listed(parsed.id, params, 'resources', 'resources', input.resources.list());
        case 'resources/templates/list': return input.resources === undefined ? responseError(parsed.id, METHOD_NOT_FOUND, 'Method not found: resources/templates/list') : listed(parsed.id, params, 'resource-templates', 'resourceTemplates', input.resources.templates());
        case 'prompts/list': return input.prompts === undefined ? responseError(parsed.id, METHOD_NOT_FOUND, 'Method not found: prompts/list') : listed(parsed.id, params, 'prompts', 'prompts', input.prompts.list());
        case 'resources/read': {
          if (input.resources === undefined) return responseError(parsed.id, METHOD_NOT_FOUND, 'Method not found: resources/read');
          if (!hasOnlyKeys(params, ['_meta', 'uri']) || typeof params['uri'] !== 'string') return invalidParams(parsed.id, [{ path: '$.uri', message: 'must be the sole non-metadata string property.' }]);
          try {
            const content = input.resources.read(params['uri']);
            const bytes = new TextEncoder().encode(content.text).byteLength;
            if (bytes > maximumResourceBytes) throw new RangeError(`RESOURCE_TOO_LARGE: ${String(bytes)} UTF-8 bytes.`);
            return { jsonrpc: '2.0', id: parsed.id, result: { resultType: 'complete', contents: [content], _meta: RESPONSE_META } };
          } catch (error) { return responseError(parsed.id, INVALID_PARAMS, error instanceof Error ? error.message : String(error), { kind: 'invalid_resource_uri', uri: params['uri'] }); }
        }
        case 'subscriptions/listen': {
          if (input.resources === undefined) return responseError(parsed.id, METHOD_NOT_FOUND, 'Method not found: subscriptions/listen');
          if (!hasOnlyKeys(params, ['_meta', 'uri']) || typeof params['uri'] !== 'string') return invalidParams(parsed.id, [{ path: '$.uri', message: 'must be the sole non-metadata string property.' }]);
          try {
            unsubscribe.get(params['uri'])?.();
            unsubscribe.set(params['uri'], input.resources.subscribe(params['uri'], (event) => {
              notifications.push({ jsonrpc: '2.0', method: 'notifications/resources/updated', params: { uri: event.uri } });
              if (event.listChanged) notifications.push({ jsonrpc: '2.0', method: 'notifications/resources/list_changed', params: {} });
            }));
            return { jsonrpc: '2.0', id: parsed.id, result: { resultType: 'complete', uri: params['uri'], _meta: RESPONSE_META } };
          } catch (error) { return responseError(parsed.id, INVALID_PARAMS, error instanceof Error ? error.message : String(error)); }
        }
        case 'prompts/get': {
          if (input.prompts === undefined) return responseError(parsed.id, METHOD_NOT_FOUND, 'Method not found: prompts/get');
          if (!hasOnlyKeys(params, ['_meta', 'name', 'arguments']) || typeof params['name'] !== 'string' || (params['arguments'] !== undefined && !isRecord(params['arguments']))) return invalidParams(parsed.id, [{ path: '$', message: 'prompts/get requires name and optional object arguments.' }]);
          try { return { jsonrpc: '2.0', id: parsed.id, result: input.prompts.get(params['name'], params['arguments'] ?? {}) }; }
          catch (error) { return responseError(parsed.id, INVALID_PARAMS, error instanceof Error ? error.message : String(error)); }
        }
        case 'tools/call': {
          const violations: SchemaViolation[] = [];
          if (!hasOnlyKeys(params, ['_meta', 'name', 'arguments'])) violations.push({ path: '$', message: 'tools/call params contain an unknown property.' });
          const name = params['name'];
          if (typeof name !== 'string' || name.length === 0) violations.push({ path: '$.name', message: 'must be a non-empty string.' });
          if (params['arguments'] !== undefined && !isRecord(params['arguments'])) violations.push({ path: '$.arguments', message: 'must be an object.' });
          if (violations.length > 0 || typeof name !== 'string') return invalidParams(parsed.id, violations);
          const binding = toolsByName.get(name);
          if (binding === undefined) return responseError(parsed.id, INVALID_PARAMS, `Unknown tool: ${name}`, { kind: 'unknown_tool', tool: name });
          const argumentsValue = params['arguments'] ?? {};
          const argumentViolations = binding.validateArguments(argumentsValue);
          if (argumentViolations.length > 0) return { jsonrpc: '2.0', id: parsed.id, result: toolExecutionError(`Invalid tool arguments: ${JSON.stringify({ violations: argumentViolations })}`) };
          try {
            const value = binding.execute(argumentsValue);
            const outputViolations = binding.validateOutput(value);
            return outputViolations.length > 0
              ? { jsonrpc: '2.0', id: parsed.id, result: toolExecutionError(`Tool output violated outputSchema: ${JSON.stringify({ violations: outputViolations })}`) }
              : { jsonrpc: '2.0', id: parsed.id, result: toolResult(value, maximumToolResultBytes) };
          } catch (error) { return { jsonrpc: '2.0', id: parsed.id, result: toolExecutionError(error) }; }
        }
        default: return responseError(parsed.id, METHOD_NOT_FOUND, `Method not found: ${parsed.method}`);
      }
    },
  });
}

export function jsonRpcParseError(): JsonRpcResponse { return responseError(null, -32700, 'Parse error') }
