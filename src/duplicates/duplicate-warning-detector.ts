import type {
  DuplicateCategory,
  RulesEdition,
} from '../domain/enums';
import { sha256 } from '../crypto/sha256';

export interface DuplicateWarningRoute {
  spell_identity_id: number;
  spell_version_id: number;
  identity_name: string;
  spell_name: string;
  spell_content_key: string;
  rules_edition: RulesEdition;
  source_name: string;
  selection_key: string | null;
  counts_against_limit: boolean;
  is_selection: boolean;
}

export interface DuplicateWarningVersion {
  spell_version_id: number;
  content_key: string;
  edition: RulesEdition;
  label: string;
}

export interface DuplicateWarningAssessment {
  spell_identity_id: number;
  spell_name: string;
  category: DuplicateCategory;
  selection_count: number;
  sources: string[];
  slots: string[];
  versions: DuplicateWarningVersion[];
  warning_fingerprint: string | null;
  explanation: string;
}

function uniqueBy<T, K>(
  values: readonly T[],
  keyFor: (value: T) => K,
): T[] {
  const seen = new Set<K>();
  return values.filter((value) => {
    const key = keyFor(value);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function compareStrings(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

function categoryFor(
  selections: readonly DuplicateWarningRoute[],
): DuplicateCategory {
  if (selections.length < 2) {
    return 'none';
  }
  if (
    new Set(selections.map((route) => route.spell_version_id)).size > 1
  ) {
    return 'conflicting_version';
  }
  if (selections.filter((route) => route.counts_against_limit).length > 1) {
    return 'wasteful';
  }
  return 'redundant_intentional';
}

function explanationFor(
  name: string,
  category: DuplicateCategory,
  versions: readonly DuplicateWarningVersion[],
): string {
  switch (category) {
    case 'wasteful':
      return `${name} consumes limits in more than one selection.`;
    case 'redundant_intentional':
      return `${name} has overlapping access, but fewer than two routes consume limits.`;
    case 'conflicting_version':
      return `${name} has conflicting versions selected: ${versions
        .map((version) => version.label)
        .join(' and ')}.`;
    case 'none':
      return `${name} has no duplicate selection.`;
  }
}

export class DuplicateWarningDetector {
  classify(
    routes: readonly DuplicateWarningRoute[],
  ): DuplicateWarningAssessment[] {
    const groups = new Map<number, DuplicateWarningRoute[]>();
    for (const route of routes) {
      const identityRoutes = groups.get(route.spell_identity_id);
      if (identityRoutes === undefined) {
        groups.set(route.spell_identity_id, [route]);
      } else {
        identityRoutes.push(route);
      }
    }

    const assessments: DuplicateWarningAssessment[] = [];
    for (const [identityId, identityRoutes] of groups) {
      const selections = identityRoutes.filter((route) => route.is_selection);
      const versions = uniqueBy(
        selections,
        (route) => route.spell_version_id,
      )
        .map((route): DuplicateWarningVersion => ({
          spell_version_id: route.spell_version_id,
          content_key: route.spell_content_key,
          edition: route.rules_edition,
          label: `${route.spell_name} (${route.rules_edition})`,
        }))
        .sort((left, right) => compareStrings(left.edition, right.edition));
      const category = categoryFor(selections);
      const name = identityRoutes[0]!.identity_name;

      assessments.push({
        spell_identity_id: identityId,
        spell_name: name,
        category,
        selection_count: selections.length,
        sources: uniqueBy(identityRoutes, (route) => route.source_name).map(
          (route) => route.source_name,
        ),
        slots: selections
          .map((route) => route.selection_key)
          .filter((key): key is string => Boolean(key)),
        versions,
        warning_fingerprint:
          category === 'conflicting_version'
            ? `conflicting_versions:${sha256(
                `${identityId}:${versions
                  .map((version) => version.content_key)
                  .join(':')}`,
              )}`
            : null,
        explanation: explanationFor(name, category, versions),
      });
    }

    return assessments.sort((left, right) =>
      compareStrings(left.spell_name, right.spell_name),
    );
  }
}

export function classifyDuplicateWarnings(
  routes: readonly DuplicateWarningRoute[],
): DuplicateWarningAssessment[] {
  return new DuplicateWarningDetector().classify(routes);
}
