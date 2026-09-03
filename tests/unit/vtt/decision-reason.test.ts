import { describe, expect, it } from 'vitest';
import { decisionReasonProblem } from '../../../src/vtt/decision-reason';

const RETRO_AUDIT_RUBBER_STAMPS = [
  '',
  'Advance the encounter objective.',
  'Corrected choice: take the offered defensive action.',
  'Use the offered defensive option.',
  'Complete legal round plan using offered options.',
  'Engine gap requires offered-option fallback.',
  'Full context did not expose executable details for every actor; use the offered play-bound revision-2 option.',
  'No additional override requested; use the offered revision-bound option.',
  'No alternate fallback selected.',
  'No override; use selected offered option.',
  'Offered correction option selected.',
  'Proceed with the offered option.',
  'Select the offered complete legal action.',
  'Select the offered legal fallback-compatible option for this actor.',
  'Select the offered legal option for this actor.',
  'Select the offered safe no-effect fallback for this initial round.',
  'Select the offered usable option.',
  'Selected offered option for complete round coverage.',
  'Selected offered option.',
  'Selected offered revision-bound option.',
  'The offered primary option is selected; the offered fallback is retained.',
  'The offered primary option is the intended selection.',
  'Use available complete turn.',
  'Use offered fallback if primary cannot resolve.',
  'Use offered fallback if primary is not executable.',
  'Use offered primary or fallback option.',
  'Use the offered advance option for this round.',
  'Use the offered advance option.',
  'Use the offered complete action.',
  'Use the offered complete option; no further tactical override.',
  'Use the offered complete turn option.',
  'Use the offered defensive fallback if the primary cannot resolve.',
  'Use the offered dominating option.',
  'Use the offered executable advance option.',
  'Use the offered executable option.',
  'Use the offered fallback if the primary cannot resolve.',
  'Use the offered fallback if the primary is unavailable.',
  'Use the offered higher-ranked complete option.',
  'Use the offered legal option for this actor.',
  'Use the offered legal option.',
  'Use the offered option.',
  'Use the offered primary and identical fallback.',
  'Use the offered primary option.',
  'Use the offered revision-bound fallback if the primary cannot resolve.',
  'Use the offered revision-bound option as the complete legal turn.',
  'Use the offered revision-bound option for this actor.',
  'Use the offered revision-bound option.',
  'Use the offered revision-bound primary option.',
  'Use the offered support option while preserving a legal fallback.',
  'Use the selected offered option as the complete actor plan.',
  'Use the selected offered option as the complete legal turn.',
  'Use the selected offered option as the complete round action.',
  'Use the selected offered option.',
  'Use the selected offered revision-bound option for this actor.',
  'Using the offered revision-bound option.',
] as const;

describe('decision reasons', () => {
  it('rejects all 55 independently audited rubber-stamp texts', () => {
    expect(RETRO_AUDIT_RUBBER_STAMPS).toHaveLength(55);
    const missed = RETRO_AUDIT_RUBBER_STAMPS.filter((reason) => decisionReasonProblem(reason) === null);
    expect(missed, JSON.stringify(missed)).toEqual([]);
  });

  it.each([
    'Retreat to protect the wounded ally from another melee attack.',
    'Spare the surrendering foe because the captain needs information.',
    'Conserve the last spell slot for the more dangerous next room.',
    'Hold this doorway so the injured scout can disengage safely.',
  ])('keeps a concrete decision motive: %s', (reason) => {
    expect(decisionReasonProblem(reason)).toBeNull();
  });
});
