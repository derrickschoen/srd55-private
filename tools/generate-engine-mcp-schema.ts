import { writeFileSync } from 'node:fs';
import { ENGINE_GET_TURN_CONTEXT_OUTPUT_SCHEMA } from '../src/vtt/mcp/schemas';

writeFileSync(
  'docs/specs/engine-get-turn-context-output.schema.json',
  `${JSON.stringify(ENGINE_GET_TURN_CONTEXT_OUTPUT_SCHEMA, null, 2)}\n`,
);
