import type { DprRequestContext } from './contracts';
import {
  DprRequestParseError,
  parseDprRequestContext,
} from './request';

const DPR_ROUTE_PARAMETER = 'dpr';
const DPR_ROUTE_VERSION = 1;

type DprRouteEnvelopeV1 = {
  readonly version: 1;
  readonly context: DprRequestContext;
};

/**
 * Returns the normalized query portion only, without a leading question mark.
 * URLSearchParams owns percent encoding; the payload stays a versioned exact
 * object and is parsed through the ordinary request constructors on read.
 */
export function serializeDprRouteContext(context: DprRequestContext): string {
  const parsed = parseDprRequestContext(context);
  const envelope: DprRouteEnvelopeV1 = {
    version: DPR_ROUTE_VERSION,
    context: parsed,
  };
  const parameters = new URLSearchParams();
  parameters.set(DPR_ROUTE_PARAMETER, JSON.stringify(envelope));
  return parameters.toString();
}

export function parseDprRouteContext(query: string): DprRequestContext {
  const parameters = new URLSearchParams(
    query.startsWith('?') ? query.slice(1) : query,
  );
  const values = parameters.getAll(DPR_ROUTE_PARAMETER);
  const keys = [...parameters.keys()];
  if (
    values.length !== 1 ||
    keys.length !== 1 ||
    keys[0] !== DPR_ROUTE_PARAMETER
  ) {
    throw new DprRequestParseError([
      `Route must contain exactly one ${DPR_ROUTE_PARAMETER} parameter.`,
    ]);
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(values[0] ?? '');
  } catch {
    throw new DprRequestParseError(['Route payload must be valid JSON.']);
  }

  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    Array.isArray(decoded) ||
    Object.keys(decoded).length !== 2 ||
    !Object.hasOwn(decoded, 'version') ||
    !Object.hasOwn(decoded, 'context')
  ) {
    throw new DprRequestParseError([
      'Route payload must be an exact versioned envelope.',
    ]);
  }
  const envelope = decoded as Readonly<Record<string, unknown>>;
  if (envelope.version !== DPR_ROUTE_VERSION) {
    throw new DprRequestParseError(['Unsupported DPR route version.']);
  }
  return parseDprRequestContext(envelope.context);
}
