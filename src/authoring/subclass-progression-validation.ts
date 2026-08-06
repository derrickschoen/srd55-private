import type {
  AuthoringValidationIssue,
  SubclassAuthoringDraft,
} from './contracts';

function issue(
  issues: AuthoringValidationIssue[],
  path: readonly (string | number)[],
  message: string,
): void {
  issues.push(Object.freeze({
    path: Object.freeze(path),
    code: 'invalid_value',
    message,
  }));
}

/** Schedule rules shared by the authoritative publisher and inline form feedback. */
export function subclassProgressionScheduleIssues(
  progression: SubclassAuthoringDraft['progression'],
): readonly AuthoringValidationIssue[] {
  if (progression.mode !== 'override') return [];
  const issues: AuthoringValidationIssue[] = [];
  progression.rows.forEach((current, index) => {
    const path = ['progression', 'rows', index] as const;
    const prior = index === 0 ? undefined : progression.rows[index - 1];
    if (prior !== undefined) {
      const monotonic: readonly {
        readonly key: 'cantrips_known' | 'prepared_or_known_count' | 'maximum_spell_level';
        readonly label: string;
      }[] = [
        { key: 'cantrips_known', label: 'Cantrips known' },
        { key: 'prepared_or_known_count', label: 'Prepared or known count' },
        { key: 'maximum_spell_level', label: 'Maximum spell level' },
      ];
      for (const field of monotonic) {
        const before = prior[field.key];
        const after = current[field.key];
        if (before !== null && after !== null && after < before) {
          issue(
            issues,
            [...path, field.key],
            `${field.label} cannot decrease at class level ${String(current.class_level)}.`,
          );
        }
      }
      for (const [slotIndex, count] of current.slot_counts.entries()) {
        const previousCount = prior.slot_counts[slotIndex];
        if (previousCount !== undefined && count < previousCount) {
          issue(
            issues,
            [...path, 'slot_counts'],
            `${String(slotIndex + 1)}-level spell slots cannot decrease at class level ${String(current.class_level)}.`,
          );
        }
      }
    }
    if (current.slot_counts.length !== 9 || current.maximum_spell_level === null) return;
    const highestSlot = current.slot_counts.reduce(
      (highest, count, slotIndex) => count > 0 ? slotIndex + 1 : highest,
      0,
    );
    if (highestSlot !== current.maximum_spell_level) {
      issue(
        issues,
        [...path, 'slot_counts'],
        `Class level ${String(current.class_level)} maximum spell level must match its highest non-zero slot level.`,
      );
    }
    if (
      highestSlot > 0 &&
      current.slot_counts.slice(0, highestSlot).some((count) => count === 0)
    ) {
      issue(
        issues,
        [...path, 'slot_counts'],
        `Class level ${String(current.class_level)} slot levels must be contiguous through level ${String(highestSlot)}.`,
      );
    }
  });
  return Object.freeze(issues);
}
