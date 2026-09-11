export const TRANSPORT_CONFORMANCE_SCENARIO_NAMES = [
  'correlation ids',
  'lawful structural values',
  'structural validation failures',
  'authoritative role mismatch',
  'initial snapshot',
  'token move result and snapshot',
  'canonical door change and same-state no-op',
  'unsupported light mutation',
  'five terminal intent outcomes',
  'reconnect full resnapshot',
  'late subscription',
  'visible-to-hidden entity removal',
  'duplicate mutation id',
  'malformed transport beside empty id',
  'subscription and disposal cleanup',
  'no retry after unknown mutation outcome',
] as const;

export type TransportConformanceScenarioName = typeof TRANSPORT_CONFORMANCE_SCENARIO_NAMES[number];
