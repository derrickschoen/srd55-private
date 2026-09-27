import { skills, type Skill } from '../../src/domain/enums';

/**
 * The stated fields every party-pack member must carry (PC-EXPORT-TRUTH fix 1:
 * `skillBonuses`, `senses` and `senseFeatures` are required, and a pack that
 * omits them is refused as `unstated_skills_or_senses`).
 *
 * Hand-built test members whose subject is NOT skills or senses state them
 * with this: +0 in every skill, normal sight only, no sense features. That is
 * an explicit statement by the fixture, equal to what those tests were written
 * against (the loader used to read an unstated member as exactly this), so the
 * tests keep proving their own subject. A test ABOUT skills or senses states
 * its own values instead.
 */
export function statedPlainMemberFields(): {
  skillBonuses: Record<Skill, number>;
  senses: { kind: 'normal_sight' }[];
  senseFeatures: never[];
} {
  return {
    skillBonuses: Object.fromEntries(skills.map((skill) => [skill, 0])) as Record<Skill, number>,
    senses: [{ kind: 'normal_sight' }],
    senseFeatures: [],
  };
}
