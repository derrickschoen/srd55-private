import type { SpellAccessRoute } from '../access/spell-access-builder';
import type { DuplicateWarningAssessment } from '../duplicates/duplicate-warning-detector';

function compareText(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

function compareNullableText(
  left: string | null,
  right: string | null,
): number {
  return compareText(left ?? '', right ?? '');
}

function compareNumber(left: number, right: number): number {
  return left - right;
}

export interface OrderedBuildClass {
  readonly name: string;
  readonly subclass: string | null;
  readonly class_level: number;
}

export function compareBuildClasses(
  left: OrderedBuildClass,
  right: OrderedBuildClass,
): number {
  return (
    compareText(left.name, right.name) ||
    compareNullableText(left.subclass, right.subclass) ||
    compareNumber(left.class_level, right.class_level)
  );
}

export function compareAccessRoutes(
  left: SpellAccessRoute,
  right: SpellAccessRoute,
): number {
  return (
    compareText(left.spell_name, right.spell_name) ||
    compareText(left.origin, right.origin) ||
    compareNullableText(left.selection_key, right.selection_key) ||
    compareText(left.source_name, right.source_name) ||
    compareNumber(left.slot_id ?? 0, right.slot_id ?? 0) ||
    compareNumber(
      left.spellbook_entry_id ?? 0,
      right.spellbook_entry_id ?? 0,
    ) ||
    compareNumber(left.spell_version_id, right.spell_version_id)
  );
}

export interface OrderedWizardEntry {
  readonly spellbook_entry_id: number;
  readonly spell_version_id: number;
  readonly spell_name: string;
}

export function compareWizardSpellbookEntries(
  left: OrderedWizardEntry,
  right: OrderedWizardEntry,
): number {
  return (
    compareText(left.spell_name, right.spell_name) ||
    compareNumber(left.spell_version_id, right.spell_version_id) ||
    compareNumber(left.spellbook_entry_id, right.spellbook_entry_id)
  );
}

export interface OrderedSpellEntry {
  readonly spell_version_id: number;
  readonly spell_name: string;
  readonly level: number;
}

export function compareSpellEntries(
  left: OrderedSpellEntry,
  right: OrderedSpellEntry,
): number {
  return (
    compareNumber(left.level, right.level) ||
    compareText(left.spell_name, right.spell_name) ||
    compareNumber(left.spell_version_id, right.spell_version_id)
  );
}

export interface OrderedRitualEntry extends OrderedSpellEntry {
  readonly spellbook_entry_id: number;
}

export function compareRitualEntries(
  left: OrderedRitualEntry,
  right: OrderedRitualEntry,
): number {
  return (
    compareSpellEntries(left, right) ||
    compareNumber(left.spellbook_entry_id, right.spellbook_entry_id)
  );
}

export function compareDuplicateAssessments(
  left: DuplicateWarningAssessment,
  right: DuplicateWarningAssessment,
): number {
  return (
    compareText(left.spell_name, right.spell_name) ||
    compareNumber(left.spell_identity_id, right.spell_identity_id)
  );
}

export interface OrderedInvalidSelection {
  readonly source: string;
  readonly sort_order: number;
  readonly id: number;
}

export function compareInvalidSelections(
  left: OrderedInvalidSelection,
  right: OrderedInvalidSelection,
): number {
  return (
    compareText(left.source, right.source) ||
    compareNumber(left.sort_order, right.sort_order) ||
    compareNumber(left.id, right.id)
  );
}
