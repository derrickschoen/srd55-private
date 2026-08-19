import { z } from 'zod';
import type { DprRequestContext } from './contracts';
import {
  DprRequestParseError,
  parseDprRequestContext,
} from './request';

const DPR_ROUTE_PARAMETER = 'dpr';
const DPR_ROUTE_VERSION = 1;

type DprRouteEnvelopeV1 = {
  readonly version: typeof DPR_ROUTE_VERSION;
  readonly context: DprRequestContext;
};

/**
 * The wire envelope is exact: object, not array, not null, exactly the two
 * declared keys, and a version that can only ever be the literal 1. Every one
 * of those used to be a hand-rolled conditional; the schema is now the single
 * statement of the shape, and `z.literal` makes the version a type, not a
 * comparison. `context` stays `unknown` here on purpose — the request parsers
 * own its shape — but `strictObject` still requires the key to be present.
 */
const routeEnvelopeSchema = z.strictObject({
  version: z.literal(DPR_ROUTE_VERSION, {
    error: 'Unsupported DPR route version.',
  }),
  context: z.unknown(),
});

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

  const result = routeEnvelopeSchema.safeParse(decoded);
  if (!result.success) {
    throw new DprRequestParseError(
      result.error.issues.map((issue) => issue.message),
    );
  }

  const envelope: DprRouteEnvelopeV1 = {
    version: result.data.version,
    context: parseDprRequestContext(result.data.context),
  };
  return envelope.context;
}
