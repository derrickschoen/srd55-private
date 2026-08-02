import type { DatabaseContext } from '../db/database';
import type { GrantRuleKey } from '../domain/ids';
import { spellReplacementPolicyForClassName } from '../rules/class-choice-entitlements-srd';
import { levelFeatSpellReplacementEntitlement } from './level-feat-choice';

/** One sourced replacement-entitlement reader shared by planning and apply. */
export function levelUpSpellReplacementAllowed(
  db: DatabaseContext,
  sourceId: number,
  ruleKey: string,
  ordinal: number,
): boolean {
  const source = db.oneRaw(
    `SELECT source.source_type, class.name AS class_name,
            feat.content_key AS feat_content_key, slot.bucket
     FROM character_source_instances AS source
     LEFT JOIN class_definitions AS class
       ON source.source_type = 'class'
      AND class.id = source.source_definition_id
     LEFT JOIN feat_definitions AS feat
       ON source.source_type = 'feat'
      AND feat.id = source.source_definition_id
     LEFT JOIN spell_selection_slots AS slot
       ON slot.source_instance_id = source.id
      AND slot.rule_key = ? AND slot.ordinal = ?
     WHERE source.id = ?`,
    [ruleKey, ordinal, sourceId],
  );
  if (source === null) return false;
  if (source.source_type === 'class' && typeof source.class_name === 'string') {
    const policy = spellReplacementPolicyForClassName(source.class_name);
    return policy?.on_class_level.some(
      (entry) => entry.bucket === source.bucket,
    ) ?? false;
  }
  if (
    source.source_type === 'feat' &&
    typeof source.feat_content_key === 'string'
  ) {
    return levelFeatSpellReplacementEntitlement(
      db,
      source.feat_content_key,
    )?.rule_keys.includes(ruleKey as GrantRuleKey) ?? false;
  }
  return false;
}
