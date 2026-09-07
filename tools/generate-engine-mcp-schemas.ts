import { rmSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import {
  engineSchemaInternals,
  proposalContractRefusalCodeSchema,
} from '../src/vtt/mcp/schemas';

function writeSchema(path: string, schema: z.ZodType<unknown>): void {
  const generated = z.toJSONSchema(schema, {
    target: 'draft-2020-12',
    io: 'output',
    reused: 'ref',
  });
  writeFileSync(path, `${JSON.stringify(generated, null, 2)}\n`);
}

rmSync('docs/specs/engine-get-turn-context-output.schema.json', { force: true });
writeSchema('docs/specs/engine-turn-context.schema.json', engineSchemaInternals.turnContextOutput);
writeSchema(
  'docs/specs/engine-proposal-contract-refusal-code.schema.json',
  proposalContractRefusalCodeSchema,
);
writeSchema(
  'docs/specs/engine-blind-round-intent.schema.json',
  engineSchemaInternals.blindRoundIntentEnvelopeSchema,
);
