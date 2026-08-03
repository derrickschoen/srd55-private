import type { PartyPublicationId } from '../domain/ids';
import type { Forge } from './storage/contracts';

export const PARTY_FORGES = [
  'github',
  'gitlab',
  'codeberg',
] as const satisfies readonly Forge[];

export const PARTY_DOCUMENT_KINDS = ['library', 'character'] as const;
export type PartyDocumentKind = (typeof PARTY_DOCUMENT_KINDS)[number];

export const PARTY_OBSERVATION_STATES = [
  'Never published',
  'Unpublished local changes',
  'Published at revision N from this device',
  'Published; refresh required before another publish',
  'No longer published',
  'Never refreshed',
  'Last refreshed successfully',
  'Latest refresh attempt',
] as const;
export type PartyObservationState = (typeof PARTY_OBSERVATION_STATES)[number];

export type PartyObservationStateKind = 'publication' | 'refresh';

export function observationStateKind(
  state: PartyObservationState,
): PartyObservationStateKind {
  switch (state) {
    case 'Never published':
    case 'Unpublished local changes':
    case 'Published at revision N from this device':
    case 'Published; refresh required before another publish':
    case 'No longer published':
      return 'publication';
    case 'Never refreshed':
    case 'Last refreshed successfully':
    case 'Latest refresh attempt':
      return 'refresh';
  }
}

export function mintPartyPublicationId(): PartyPublicationId {
  return crypto.randomUUID() as PartyPublicationId;
}
