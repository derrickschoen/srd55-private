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

-- CI-2a registry guards. Aggregate roots cannot outrun their content-key
-- parent. These BEFORE INSERT triggers are the SQL boundary for the existing
-- seed/import writers while CI-3x replaces those writers with semantic
-- projectors. Every identity minted here is deliberately legacy-opaque:
-- neither a key's spelling nor a legacy row's source metadata proves its
-- provenance, and these triggers create no fingerprint.
CREATE TRIGGER catalog_register_class_identity_before_insert
BEFORE INSERT ON class_definitions
BEGIN
  SELECT RAISE(ABORT, 'class content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'class'
  );
  INSERT OR IGNORE INTO catalog_content_identities (
    content_key, content_kind, key_kind, catalog_layer, normalized_name
  ) VALUES (
    NEW.content_key, 'class', 'legacy-opaque', 'external',
    lower(NEW.name)
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
  INSERT OR IGNORE INTO catalog_content_identities (
    content_key, content_kind, key_kind, catalog_layer, normalized_name
  ) VALUES (
    NEW.content_key, 'subclass', 'legacy-opaque', 'external',
    lower(NEW.name)
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
  INSERT OR IGNORE INTO catalog_content_identities (
    content_key, content_kind, key_kind, catalog_layer, normalized_name
  ) VALUES (
    NEW.content_key, 'feat', 'legacy-opaque', 'external',
    lower(NEW.name)
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
  INSERT OR IGNORE INTO catalog_content_identities (
    content_key, content_kind, key_kind, catalog_layer, normalized_name
  ) VALUES (
    NEW.content_key, 'species', 'legacy-opaque', 'external',
    lower(NEW.name)
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
  INSERT OR IGNORE INTO catalog_content_identities (
    content_key, content_kind, key_kind, catalog_layer, normalized_name
  ) VALUES (
    NEW.content_key, 'background', 'legacy-opaque', 'external',
    lower(NEW.name)
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
  INSERT OR IGNORE INTO catalog_content_identities (
    content_key, content_kind, key_kind, catalog_layer, normalized_name
  )
  SELECT
    NEW.content_key, 'spell', 'legacy-opaque', 'external',
    normalized_name
  FROM spell_identities
  WHERE id = NEW.spell_identity_id;
END;

CREATE TRIGGER catalog_register_species_template_identity_before_insert
BEFORE INSERT ON species_templates
BEGIN
  SELECT RAISE(ABORT, 'species content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'species'
  );
  INSERT OR IGNORE INTO catalog_content_identities (
    content_key, content_kind, key_kind, catalog_layer, normalized_name
  ) VALUES (
    NEW.content_key, 'species', 'legacy-opaque', 'external', lower(NEW.name)
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
  INSERT OR IGNORE INTO catalog_content_identities (
    content_key, content_kind, key_kind, catalog_layer, normalized_name
  ) VALUES (
    NEW.content_key, 'background', 'legacy-opaque', 'external', lower(NEW.name)
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
  INSERT OR IGNORE INTO catalog_content_identities (
    content_key, content_kind, key_kind, catalog_layer, normalized_name
  ) VALUES (
    NEW.content_key, 'armor', 'legacy-opaque', 'external', lower(NEW.name)
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
  INSERT OR IGNORE INTO catalog_content_identities (
    content_key, content_kind, key_kind, catalog_layer, normalized_name
  ) VALUES (
    NEW.content_key, 'weapon', 'legacy-opaque', 'external', lower(NEW.name)
  );
END;
