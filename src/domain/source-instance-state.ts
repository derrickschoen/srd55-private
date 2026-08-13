/**
 * THE VOCABULARY OF `character_source_instances.state`, IN A MODULE OF ITS OWN.
 *
 * It would sit perfectly well among the other vocabularies in `enums.ts`, and
 * it is re-exported from there so every reader still finds it in the expected
 * place. It lives here for ONE reason, and the reason is D226.
 *
 * `src/grants/source-rule-reader.ts` is a frozen behavioural source of the
 * `reconcile_species_lineage_content_v2` catalog data migration
 * (`src/catalog/catalog-data-migrations.ts`), and since R4 its decode THROWS on
 * a state outside this array — so the array is now part of that migration's
 * behaviour. D226: *"a checksum-frozen migration's checksum covers the
 * TRANSITIVE source it depends on, not just its own file."* The freeze
 * therefore has to reach the vocabulary.
 *
 * Freezing `enums.ts` whole would have done it, and would have been the wrong
 * trade: that file holds dozens of unrelated vocabularies, so the migration's
 * checksum would churn every time a spell school or a weapon property moved,
 * and a pin that moves for unrelated reasons stops meaning anything — the
 * failure mode D226 itself warns about from the other direction. One module
 * holding one vocabulary keeps the freeze exactly as wide as the dependency.
 *
 * The two named literals are here rather than at their call sites because the
 * sweep that put them into every query (R4 round 2) needs ONE typed home: a
 * bound `ACTIVE_SOURCE_INSTANCE_STATE` cannot be misspelt, where the
 * `source.state = 'active'` it replaced could be, silently, in ninety places.
 */
export const sourceInstanceStates = ['active', 'tombstoned'] as const;
export type SourceInstanceState = (typeof sourceInstanceStates)[number];

/**
 * The state every reader gates on. Bound as a query parameter rather than
 * written into a SQL string: a typo in `state = 'activ'` compiles, runs,
 * matches no row and silently empties a result set, which is the failure R4
 * found in `src/rules/eligible-character-effects.ts` and swept out of the rest.
 */
export const ACTIVE_SOURCE_INSTANCE_STATE: SourceInstanceState = 'active';

/** What removal writes. Never revived — a re-take writes `active` back. */
export const TOMBSTONED_SOURCE_INSTANCE_STATE: SourceInstanceState =
  'tombstoned';
