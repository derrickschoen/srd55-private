/**
 * Negative compile probes for HA-0's closed authoring unions. Every exported
 * statement is a wrong program and must produce a diagnostic.
 */
import type {
  AuthoringErrorData,
  HomebrewDraft,
  PublishableHomebrew,
  PublishPlanToken,
  PublishTokenFacts,
  ReplacementPlan,
  ReplacementPlanToken,
  ReplacementTokenFacts,
  SpeciesAuthoringDraft,
  SubclassContentProgression,
} from '../../src/authoring/contracts';

export const classDraft: HomebrewDraft = { kind: 'class' };
export const classPublish: PublishableHomebrew = { kind: 'class' };
export const classReplacement: ReplacementPlan = { kind: 'class' };
export const unknownError: AuthoringErrorData = { reason: 'other' };

declare const speciesDraft: SpeciesAuthoringDraft;
export const unknownDraftVersion: SpeciesAuthoringDraft = { ...speciesDraft, document_version: 2 };
export const partialProgression: SubclassContentProgression = { mode: 'partial' };

declare const publishToken: PublishPlanToken;
declare const replacementToken: ReplacementPlanToken;
export const replacementFromPublish: ReplacementPlanToken = publishToken;
export const publishFromReplacement: PublishPlanToken = replacementToken;

declare const publishFacts: PublishTokenFacts;
declare const replacementFacts: ReplacementTokenFacts;
export const replacementFactsFromPublish: ReplacementTokenFacts = publishFacts;
export const publishFactsFromReplacement: PublishTokenFacts = replacementFacts;
