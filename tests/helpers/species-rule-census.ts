import {
  ConfiguredChoiceRule,
  parseSourceGrantRules,
} from '../../src/grants/configured-choice-rule';

/**
 * Count the material semantics represented by a species rule document.
 *
 * A configured-choice descriptor is only a container: its option grants are
 * the material rules that replaced the old flat rows. A replaceable spell
 * choice also represents one material spell grant even though it is stored in
 * its own typed field. Ordinary top-level rules each remain one semantic rule.
 */
export function speciesRuleSemanticCount(value: unknown): number {
  return parseSourceGrantRules(value).reduce((total, rule) => {
    if (!(rule instanceof ConfiguredChoiceRule)) {
      return total + 1;
    }
    return total + rule.options.reduce(
      (optionTotal, option) =>
        optionTotal + option.grants.length +
        (option.replaceableSpellChoice === null ? 0 : 1),
      0,
    );
  }, 0);
}

export function speciesRuleSemanticCountFromJson(value: unknown): number {
  if (typeof value !== 'string') {
    throw new TypeError('Stored species grant rules must be JSON text.');
  }
  return speciesRuleSemanticCount(JSON.parse(value));
}
