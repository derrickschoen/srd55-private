export type HandoffPrincipal =
  | { readonly role: 'dm' }
  | { readonly role: 'player'; readonly playerId: string };

export interface AuthorizedSeat {
  readonly playerId: string;
  readonly controlledTokenIds: readonly string[];
}

export type AuthorizationResult =
  | { readonly authorized: true }
  | { readonly authorized: false; readonly code: 'UNAUTHORIZED' | 'FORBIDDEN'; readonly message: string };

interface RegisteredSeat {
  readonly controlledTokenIds: ReadonlySet<string>;
}

export class SessionAuthorizer {
  readonly #seats = new Map<string, RegisteredSeat>();
  readonly #tokenOwners = new Map<string, string>();

  constructor(seats: readonly AuthorizedSeat[]) {
    for (const seat of seats) {
      if (this.#seats.has(seat.playerId)) {
        throw new TypeError(`Duplicate external player id ${seat.playerId}.`);
      }
      const controlledTokenIds = new Set(seat.controlledTokenIds);
      for (const tokenId of controlledTokenIds) {
        const owner = this.#tokenOwners.get(tokenId);
        if (owner !== undefined) {
          throw new TypeError(`Token ${tokenId} is assigned to both ${owner} and ${seat.playerId}.`);
        }
        this.#tokenOwners.set(tokenId, seat.playerId);
      }
      this.#seats.set(seat.playerId, { controlledTokenIds });
    }
  }

  authorizeOpen(
    principal: HandoffPrincipal,
    requestedRole: 'dm' | 'player',
    requestedPlayerId?: string,
  ): AuthorizationResult {
    if (principal.role !== requestedRole) {
      return {
        authorized: false,
        code: 'UNAUTHORIZED',
        message: 'The requested role does not match the authenticated principal.',
      };
    }
    if (principal.role === 'dm') {
      if (requestedPlayerId !== undefined) {
        return {
          authorized: false,
          code: 'UNAUTHORIZED',
          message: 'A DM principal cannot request a player identity.',
        };
      }
      return { authorized: true };
    }
    if (
      requestedPlayerId === undefined ||
      requestedPlayerId !== principal.playerId ||
      !this.#seats.has(principal.playerId)
    ) {
      return {
        authorized: false,
        code: 'UNAUTHORIZED',
        message: 'The requested player does not match a registered authenticated principal.',
      };
    }
    return { authorized: true };
  }

  authorizeToken(principal: HandoffPrincipal, tokenId: string): AuthorizationResult {
    if (principal.role !== 'player') {
      return {
        authorized: false,
        code: 'FORBIDDEN',
        message: 'A player seat is required to submit a token move.',
      };
    }
    const seat = this.#seats.get(principal.playerId);
    if (seat === undefined) {
      return { authorized: false, code: 'UNAUTHORIZED', message: 'The player seat is not registered.' };
    }
    if (!seat.controlledTokenIds.has(tokenId)) {
      return {
        authorized: false,
        code: 'FORBIDDEN',
        message: this.#tokenOwners.has(tokenId)
          ? 'The token belongs to another player seat.'
          : 'The token is not controlled by this player seat.',
      };
    }
    return { authorized: true };
  }
}
