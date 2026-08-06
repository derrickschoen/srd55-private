CREATE TRIGGER catalog_content_supersessions_refuse_update_before_update
BEFORE UPDATE ON catalog_content_supersessions
BEGIN
  SELECT RAISE(ABORT, 'catalog content supersession lineage is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER catalog_content_supersessions_prevent_cycle_before_insert
BEFORE INSERT ON catalog_content_supersessions
WHEN NEW.superseded_content_key <> NEW.successor_content_key
 AND EXISTS (
  WITH RECURSIVE successor_chain(content_key) AS (
    SELECT NEW.successor_content_key
    UNION
    SELECT lineage.successor_content_key
    FROM catalog_content_supersessions AS lineage
    INNER JOIN successor_chain AS chain
      ON lineage.content_kind = NEW.content_kind
     AND lineage.superseded_content_key = chain.content_key
  )
  SELECT 1 FROM successor_chain
  WHERE content_key = NEW.superseded_content_key
)
BEGIN
  SELECT RAISE(ABORT, 'catalog content supersession would create a cycle');
END;
