-- Browser-product invariants that Drizzle cannot represent.
--
-- These are NOT Laravel parity: they enforce, at the storage layer, that a
-- spell slot never holds both a fixed grant and a user selection. The named
-- CHECK constraint on spell_selection_slots covers INSERT/UPDATE of NULLs;
-- these triggers produce the specific error message the product surfaces.
--
-- This file is appended verbatim as the postlude of the generated schema by
-- scripts/compose-schema.ts.

CREATE TRIGGER spell_slots_exclusive_assignment_insert
    BEFORE INSERT ON spell_selection_slots
    WHEN NEW.fixed_spell_version_id IS NOT NULL
      AND NEW.current_spell_version_id IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'a spell slot cannot hold both a fixed grant and a user selection');
END;

-- D92's slot row uses composite ownership references. SQLite's SET NULL
-- action would null both columns in each composite key, including the
-- non-null character primary key, so clear only the matching item positions
-- before the item delete reaches foreign-key enforcement.
CREATE TRIGGER character_items_clear_attunement_slots_before_delete
    BEFORE DELETE ON character_items
BEGIN
    UPDATE character_attunement_slots
       SET slot_1_item_id = CASE
             WHEN slot_1_item_id = OLD.id THEN NULL ELSE slot_1_item_id END,
           slot_2_item_id = CASE
             WHEN slot_2_item_id = OLD.id THEN NULL ELSE slot_2_item_id END,
           slot_3_item_id = CASE
             WHEN slot_3_item_id = OLD.id THEN NULL ELSE slot_3_item_id END
     WHERE character_id = OLD.character_id
       AND OLD.id IN (slot_1_item_id, slot_2_item_id, slot_3_item_id);
END;

-- LU-1's feat pointer uses the same composite ownership guard. Clear only the
-- nullable source half before deletion; the character half remains the row's
-- non-null aggregate owner.
CREATE TRIGGER character_sources_clear_level_feat_choices_before_delete
    BEFORE DELETE ON character_source_instances
BEGIN
    UPDATE character_level_feat_choices
       SET feat_source_instance_id = NULL,
           updated_at = CURRENT_TIMESTAMP
     WHERE character_id = OLD.character_id
       AND feat_source_instance_id = OLD.id;
END;

CREATE TRIGGER spell_slots_exclusive_assignment_update
    BEFORE UPDATE ON spell_selection_slots
    WHEN NEW.fixed_spell_version_id IS NOT NULL
      AND NEW.current_spell_version_id IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'a spell slot cannot hold both a fixed grant and a user selection');
END;

-- CI-2a/CI-4 registry guards. Every aggregate root, including a spell, must
-- pass through the asserted/bundled registration seam first.
CREATE TRIGGER catalog_register_class_identity_before_insert
BEFORE INSERT ON class_definitions
BEGIN
  SELECT RAISE(ABORT, 'class content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'class'
  );
  SELECT RAISE(ABORT, 'class content key must be registered before insert')
  WHERE NOT EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind = 'class'
  );
END;

CREATE TRIGGER catalog_register_subclass_identity_before_insert
BEFORE INSERT ON subclass_definitions
BEGIN
  SELECT RAISE(ABORT, 'subclass content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'subclass'
  );
  SELECT RAISE(ABORT, 'subclass content key must be registered before insert')
  WHERE NOT EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind = 'subclass'
  );
END;

CREATE TRIGGER catalog_register_feat_identity_before_insert
BEFORE INSERT ON feat_definitions
BEGIN
  SELECT RAISE(ABORT, 'feat content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'feat'
  );
  SELECT RAISE(ABORT, 'feat content key must be registered before insert')
  WHERE NOT EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind = 'feat'
  );
END;

CREATE TRIGGER catalog_register_species_definition_identity_before_insert
BEFORE INSERT ON species_definitions
BEGIN
  SELECT RAISE(ABORT, 'species content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'species'
  );
  SELECT RAISE(ABORT, 'species content key must be registered before insert')
  WHERE NOT EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind = 'species'
  );
END;

CREATE TRIGGER catalog_register_background_definition_identity_before_insert
BEFORE INSERT ON background_definitions
BEGIN
  SELECT RAISE(ABORT, 'background content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'background'
  );
  SELECT RAISE(ABORT, 'background content key must be registered before insert')
  WHERE NOT EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind = 'background'
  );
END;

CREATE TRIGGER catalog_register_spell_identity_before_insert
BEFORE INSERT ON spell_versions
BEGIN
  SELECT RAISE(ABORT, 'spell content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'spell'
  );
  SELECT RAISE(ABORT, 'spell content key must be registered before insert')
  WHERE NOT EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind = 'spell'
  );
END;

CREATE TRIGGER catalog_register_species_template_identity_before_insert
BEFORE INSERT ON species_templates
BEGIN
  SELECT RAISE(ABORT, 'species content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'species'
  );
  SELECT RAISE(ABORT, 'species content key must be registered before insert')
  WHERE NOT EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind = 'species'
  );
END;

CREATE TRIGGER catalog_register_background_template_identity_before_insert
BEFORE INSERT ON background_templates
BEGIN
  SELECT RAISE(ABORT, 'background content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'background'
  );
  SELECT RAISE(ABORT, 'background content key must be registered before insert')
  WHERE NOT EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind = 'background'
  );
  SELECT RAISE(ABORT, 'background default Origin feat key must name an installed Origin feat')
  WHERE NEW.default_origin_feat_content_key IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM feat_definitions
      WHERE content_key = NEW.default_origin_feat_content_key
        AND category = 'origin'
    );
END;

CREATE TRIGGER background_default_origin_feat_before_update
BEFORE UPDATE OF default_origin_feat_content_key ON background_templates
BEGIN
  SELECT RAISE(ABORT, 'background default Origin feat key must name an installed Origin feat')
  WHERE NEW.default_origin_feat_content_key IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM feat_definitions
      WHERE content_key = NEW.default_origin_feat_content_key
        AND category = 'origin'
    );
END;

CREATE TRIGGER catalog_register_armor_identity_before_insert
BEFORE INSERT ON armor_templates
BEGIN
  SELECT RAISE(ABORT, 'armor content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'armor'
  );
  SELECT RAISE(ABORT, 'armor content key must be registered before insert')
  WHERE NOT EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind = 'armor'
  );
END;

CREATE TRIGGER catalog_register_weapon_identity_before_insert
BEFORE INSERT ON weapon_templates
BEGIN
  SELECT RAISE(ABORT, 'weapon content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'weapon'
  );
  SELECT RAISE(ABORT, 'weapon content key must be registered before insert')
  WHERE NOT EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind = 'weapon'
  );
END;

CREATE TRIGGER catalog_register_item_identity_before_insert
BEFORE INSERT ON item_definitions
BEGIN
  SELECT RAISE(ABORT, 'item content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'item'
  );
  SELECT RAISE(ABORT, 'item content key must be registered before insert')
  WHERE NOT EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind = 'item'
  );
END;
