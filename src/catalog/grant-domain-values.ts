import {
  domainSourceTypes,
  isEnumValue,
  skills,
  type DomainSourceType,
  type Skill,
} from '../domain/enums';

export type GrantDomainValueRefusal = (message: string) => never;

/**
 * One normalization boundary for grant-rule skill names. Stored JSON and
 * incoming documents both pass through this function before identity bytes
 * are constructed, so case and printed spaces cannot create a transient key.
 */
export function normalizedGrantSkill(
  value: unknown,
  label: string,
  refuse: GrantDomainValueRefusal,
): Skill {
  if (typeof value !== 'string') {
    return refuse(`${label} '${String(value)}' is not a skill.`);
  }
  const normalized = value.trim().toLowerCase().replaceAll(' ', '_');
  if (!isEnumValue(skills, normalized)) {
    return refuse(`${label} '${value}' is not a skill.`);
  }
  return normalized;
}

/** The runtime source-definition table switch is closed to these values. */
export function normalizedGrantSourceType(
  value: unknown,
  label: string,
  refuse: GrantDomainValueRefusal,
): DomainSourceType {
  if (typeof value !== 'string' || !isEnumValue(domainSourceTypes, value)) {
    return refuse(`${label} '${String(value)}' is not a domain source type.`);
  }
  return value;
}
