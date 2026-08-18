export const attunementSlots = [1, 2, 3] as const;

export type AttunementSlot = (typeof attunementSlots)[number];

export interface AttunementOccupant {
  readonly slot: AttunementSlot;
  readonly item_id: number;
  readonly name: string;
}
