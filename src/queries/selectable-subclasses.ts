/**
 * A superseded subclass remains resolvable for characters that already hold
 * it, but it is not a candidate for a new subclass selection. Both guided
 * level-up and the planner apply this predicate at their query seams.
 *
 * The definition alias is deliberately fixed as `subclass` so the one rule
 * cannot drift between its consumers.
 */
export const SELECTABLE_SUBCLASS_SQL = `NOT EXISTS (
  SELECT 1
    FROM catalog_content_supersessions AS supersession
   WHERE supersession.content_kind = 'subclass'
     AND supersession.superseded_content_key = subclass.content_key
)`;
