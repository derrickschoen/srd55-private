ALTER TABLE `character_weapons` ADD `range_kind` VARCHAR DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `character_weapons` ADD `range_near_feet` integer;--> statement-breakpoint
ALTER TABLE `character_weapons` ADD `range_far_feet` integer;--> statement-breakpoint
ALTER TABLE `weapon_templates` ADD `range_kind` VARCHAR DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `weapon_templates` ADD `range_near_feet` integer;--> statement-breakpoint
ALTER TABLE `weapon_templates` ADD `range_far_feet` integer;--> statement-breakpoint

CREATE TEMP TABLE `__weapon_range_preflight` (`message` TEXT NOT NULL);--> statement-breakpoint
CREATE TEMP TRIGGER `__weapon_range_preflight_abort`
BEFORE INSERT ON `__weapon_range_preflight`
BEGIN
  SELECT RAISE(ABORT, NEW.message);
END;--> statement-breakpoint

INSERT INTO `__weapon_range_preflight` (`message`)
SELECT 'character_weapons id ' || id || ' range_normal_feet=' ||
       quote(range_normal_feet) || ' is not an integer from 0 to 100000'
FROM `character_weapons`
WHERE range_normal_feet IS NOT NULL
  AND (typeof(range_normal_feet) <> 'integer'
       OR range_normal_feet < 0
       OR range_normal_feet > 100000)
ORDER BY id
LIMIT 1;--> statement-breakpoint
INSERT INTO `__weapon_range_preflight` (`message`)
SELECT 'character_weapons id ' || id || ' range_long_feet=' ||
       quote(range_long_feet) || ' is not an integer from 0 to 100000'
FROM `character_weapons`
WHERE range_long_feet IS NOT NULL
  AND (typeof(range_long_feet) <> 'integer'
       OR range_long_feet < 0
       OR range_long_feet > 100000)
ORDER BY id
LIMIT 1;--> statement-breakpoint
INSERT INTO `__weapon_range_preflight` (`message`)
SELECT 'weapon_templates id ' || id || ' range_normal_feet=' ||
       quote(range_normal_feet) || ' is not an integer from 0 to 100000'
FROM `weapon_templates`
WHERE range_normal_feet IS NOT NULL
  AND (typeof(range_normal_feet) <> 'integer'
       OR range_normal_feet < 0
       OR range_normal_feet > 100000)
ORDER BY id
LIMIT 1;--> statement-breakpoint
INSERT INTO `__weapon_range_preflight` (`message`)
SELECT 'weapon_templates id ' || id || ' range_long_feet=' ||
       quote(range_long_feet) || ' is not an integer from 0 to 100000'
FROM `weapon_templates`
WHERE range_long_feet IS NOT NULL
  AND (typeof(range_long_feet) <> 'integer'
       OR range_long_feet < 0
       OR range_long_feet > 100000)
ORDER BY id
LIMIT 1;--> statement-breakpoint

UPDATE `character_weapons`
SET range_kind = CASE
      WHEN range_normal_feet IS NULL AND range_long_feet IS NULL THEN 'none'
      WHEN range_normal_feet IS NOT NULL
        AND (range_long_feet IS NULL OR range_long_feet >= range_normal_feet)
        THEN 'ranged'
      ELSE 'legacy'
    END,
    range_near_feet = range_normal_feet,
    range_far_feet = range_long_feet;--> statement-breakpoint
UPDATE `weapon_templates`
SET range_kind = CASE
      WHEN range_normal_feet IS NULL AND range_long_feet IS NULL THEN 'none'
      WHEN range_normal_feet IS NOT NULL
        AND (range_long_feet IS NULL OR range_long_feet >= range_normal_feet)
        THEN 'ranged'
      ELSE 'legacy'
    END,
    range_near_feet = range_normal_feet,
    range_far_feet = range_long_feet;--> statement-breakpoint

DROP TRIGGER `__weapon_range_preflight_abort`;--> statement-breakpoint
DROP TABLE `__weapon_range_preflight`;
