import { it } from 'vitest';
import { reviewedSaveSuccessClauses } from '../../../src/simulation/coverage';

it('scratch dump', () => {
  const rows = Object.entries(reviewedSaveSuccessClauses).map(([key, clause]) => ({
    key,
    id: clause.id,
    kind: clause.kind,
    ability: clause.ability,
    sigs: clause.failed_damage_signatures,
    span: clause.source_span,
  }));
  console.log(JSON.stringify(rows, null, 1));
});
