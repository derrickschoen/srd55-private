import type { DatabaseContext } from '../db/database';
import type {
  CharacterCommandPayload,
  FillSkillGrantCommand as FillSkillGrantPayload,
} from '../domain/command-contracts';
import { fillSkillGrant } from '../grants/skill-grants';
import { reconcileCharacterSkillExpertise } from '../grants/skill-expertise-grants';

/**
 * THE GUIDED SKILLS STEP'S ONE WRITE (skills-with-provenance §3.3/§3.6).
 *
 * Fills — or, with `skill: null`, CLEARS — the grant the payload ADDRESSES by
 * its stable id. All validation and every named refusal
 * (`grant_not_found`, `grant_already_filled`, `skill_not_in_pool`,
 * `skill_already_held` — the seam's `SkillGrantRefusalReason`) live in
 * `fillSkillGrant` in `src/grants/skill-grants.ts`, beside the resolver whose
 * per-grant `available` list the refusals mirror, so the command and any
 * future producer cannot enforce two different pools.
 *
 * WHAT THIS COMMAND MUST NEVER DO is fill "whichever grant is unfilled": with
 * two entered classes whose pools overlap that produces the right skill
 * totals, the right outstanding count, and a faithful round trip of the WRONG
 * provenance (§5's second trap; `S-GRANT-IDENTITY` is written against it).
 * The addressed-id locator is the whole defence.
 */
export class FillSkillGrantCommand {
  readonly actionType = 'fill_skill_grant';

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: FillSkillGrantPayload,
  ) {}

  apply(characterId: number): void {
    fillSkillGrant(
      this.db,
      characterId,
      this.payload.grant_id,
      this.payload.skill,
    );
    reconcileCharacterSkillExpertise(this.db, characterId);
  }

  /**
   * Never called by the executor: `prepareInverse` resolves the PRECISE
   * inverse — the same command with the displaced selection — from the
   * before-snapshot, so undo of a fill is a clear and undo of a clear
   * restores the fill. Present because the constructed-command shape requires
   * it; throwing keeps a future caller from mistaking it for a real inverse.
   */
  inverse(): CharacterCommandPayload {
    throw new Error(
      'fill_skill_grant uses the precise inverse prepared by the executor.',
    );
  }
}
