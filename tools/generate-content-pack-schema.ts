import { writeFileSync } from 'node:fs';
import { z } from 'zod';
import { publishedContentPackV1Schema } from '../src/content/content-pack';

const generated = z.toJSONSchema(publishedContentPackV1Schema, {
  target: 'draft-2020-12',
  unrepresentable: 'any',
});

writeFileSync(
  'docs/specs/content-pack.schema.json',
  `${JSON.stringify(generated, null, 2)}\n`,
);
