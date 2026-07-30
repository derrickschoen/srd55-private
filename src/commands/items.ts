import type { SqlValue } from '@sqlite.org/sqlite-wasm';
import type { DatabaseContext } from '../db/database';
import type {
  AddItemCommand as AddItemPayload,
  AttuneItemCommand as AttuneItemPayload,
  ItemFields,
  RemoveItemCommand as RemoveItemPayload,
  ReplaceAttunedItemCommand as ReplaceAttunedItemPayload,
  RestoreAttunementSlotCommand as RestoreAttunementSlotPayload,
  UnattuneItemCommand as UnattuneItemPayload,
  UpdateItemCommand as UpdateItemPayload,
} from '../domain/command-contracts';
import {
  attunementSlots,
  type AttunementOccupant,
  type AttunementSlot,
  type AttunementSlotsFullData,
} from '../domain/attunement';
import { rowContractError } from '../domain/contracts/rows';
import type { ResolvesInverseAfterApply } from './weapons';
import {
  readOwnedEffects,
  replaceOwnedEffects,
} from './equipment-effects';

const ITEM_COLUMNS = [
  'name',
  'description',
  'requires_attunement',
  'source_instance_id',
] as const;

interface ItemRow extends Record<string, unknown> {
  readonly id: number;
}

function nullableText(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function itemValues(item: ItemFields): Record<string, SqlValue> {
  return {
    name: item.name.trim(),
    description: nullableText(item.description),
    requires_attunement: item.requires_attunement ? 1 : 0,
    source_instance_id: item.source_instance_id,
  };
}

function fieldsFromRow(row: ItemRow): ItemFields {
  return {
    name: String(row.name),
    description:
      row.description === null ? null : String(row.description),
    requires_attunement: Number(row.requires_attunement) === 1,
    source_instance_id:
      row.source_instance_id === null
        ? null
        : Number(row.source_instance_id),
  };
}

const slotColumn = (slot: AttunementSlot) =>
  `slot_${String(slot)}_item_id` as const;

function itemAttunementSlot(
  db: DatabaseContext,
  characterId: number,
  itemId: number,
): AttunementSlot | null {
  const row = db.oneRaw(
    `SELECT slot_1_item_id, slot_2_item_id, slot_3_item_id
     FROM character_attunement_slots
     WHERE character_id = ?`,
    [characterId],
  );
  if (row === null) {
    return null;
  }
  return attunementSlots.find(
    (slot) => Number(row[slotColumn(slot)]) === itemId,
  ) ?? null;
}

function ensureSlotRow(db: DatabaseContext, characterId: number): void {
  db.exec(
    `INSERT OR IGNORE INTO character_attunement_slots (character_id)
     VALUES (?)`,
    [characterId],
  );
}

function restoreSlot(
  db: DatabaseContext,
  characterId: number,
  slot: AttunementSlot,
  itemId: number,
): void {
  readItem(db, characterId, itemId);
  if (itemAttunementSlot(db, characterId, itemId) !== null) {
    throw new TypeError('Item already holds an attunement slot.');
  }
  ensureSlotRow(db, characterId);
  const column = slotColumn(slot);
  const occupied = db.scalar(
    `SELECT ${column} FROM character_attunement_slots WHERE character_id = ?`,
    [characterId],
  );
  if (occupied !== null) {
    throw new TypeError('Attunement slot is already occupied.');
  }
  db.exec(
    `UPDATE character_attunement_slots SET ${column} = ?
     WHERE character_id = ?`,
    [itemId, characterId],
  );
}

function occupants(
  db: DatabaseContext,
  characterId: number,
): AttunementOccupant[] {
  const row = db.oneRaw(
    `SELECT slot_1_item_id, slot_2_item_id, slot_3_item_id
     FROM character_attunement_slots
     WHERE character_id = ?`,
    [characterId],
  );
  if (row === null) {
    return [];
  }
  return attunementSlots.flatMap((slot): AttunementOccupant[] => {
    const itemIdValue = row[slotColumn(slot)];
    if (itemIdValue === null || itemIdValue === undefined) {
      return [];
    }
    const itemId = Number(itemIdValue);
    const item = readItem(db, characterId, itemId);
    return [{
      slot,
      item_id: itemId,
      name: String(item.name),
    }];
  });
}

export class AttunementSlotsFull extends Error {
  readonly data: AttunementSlotsFullData;

  constructor(occupyingItems: readonly AttunementOccupant[]) {
    super('All three attunement slots are occupied.');
    this.name = 'AttunementSlotsFull';
    this.data = {
      reason: 'attunement_slots_full',
      occupants: occupyingItems,
    };
  }
}

function readItem(
  db: DatabaseContext,
  characterId: number,
  itemId: number,
): ItemRow {
  const row = db.oneRaw(
    `SELECT id, ${ITEM_COLUMNS.join(', ')}
     FROM character_items
     WHERE character_id = ? AND id = ?`,
    [characterId, itemId],
  );
  if (row === null) {
    throw new TypeError('Item does not belong to this character.');
  }
  return row as unknown as ItemRow;
}

function assertItemRow(
  values: Record<string, SqlValue>,
  characterId: number,
  timestamp: string,
): void {
  const error = rowContractError(
    'character_items',
    {
      id: 1,
      character_id: characterId,
      ...values,
      created_at: timestamp,
      updated_at: timestamp,
    },
    'Item',
  );
  if (error !== null) {
    throw new TypeError(error);
  }
}

export class AddItemCommand implements ResolvesInverseAfterApply {
  readonly actionType = 'add_item';
  readonly invertsAfterApply = true;

  #itemId: number | undefined;

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: AddItemPayload,
  ) {}

  apply(characterId: number): void {
    const timestamp = new Date().toISOString();
    const values = itemValues(this.payload.item);
    assertItemRow(values, characterId, timestamp);
    const columns = [
      'character_id',
      ...ITEM_COLUMNS,
      'created_at',
      'updated_at',
    ];
    const bindings: SqlValue[] = [
      characterId,
      ...ITEM_COLUMNS.map((column) => values[column] as SqlValue),
      timestamp,
      timestamp,
    ];
    if (this.payload.item_id !== undefined) {
      columns.unshift('id');
      bindings.unshift(this.payload.item_id);
    }
    const inserted = this.db.exec(
      `INSERT INTO character_items (${columns.join(', ')})
       VALUES (${columns.map(() => '?').join(', ')})`,
      bindings,
    );
    this.#itemId = this.payload.item_id ?? inserted.lastInsertId;
    if (this.payload.item.effects !== undefined) {
      replaceOwnedEffects(
        this.db,
        characterId,
        'character_item_id',
        this.#itemId,
        this.payload.item.source_instance_id,
        this.payload.item.effects,
      );
    }
    if (this.payload.attunement_slot !== undefined) {
      restoreSlot(
        this.db,
        characterId,
        this.payload.attunement_slot,
        this.#itemId,
      );
    }
  }

  inverse(): RemoveItemPayload {
    if (this.#itemId === undefined) {
      throw new Error('Cannot create an inverse before applying the command.');
    }
    return { type: 'remove_item', item_id: this.#itemId };
  }
}

export class UpdateItemCommand implements ResolvesInverseAfterApply {
  readonly actionType = 'update_item';
  readonly invertsAfterApply = true;

  #previous: ItemFields | undefined;

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: UpdateItemPayload,
  ) {}

  apply(characterId: number): void {
    const existing = readItem(this.db, characterId, this.payload.item_id);
    this.#previous = {
      ...fieldsFromRow(existing),
      effects: readOwnedEffects(
        this.db,
        characterId,
        'character_item_id',
        this.payload.item_id,
      ),
    };
    const timestamp = new Date().toISOString();
    const values = itemValues(this.payload.item);
    assertItemRow(values, characterId, timestamp);
    this.db.exec(
      `UPDATE character_items
       SET ${ITEM_COLUMNS.map((column) => `${column} = ?`).join(', ')},
           updated_at = ?
       WHERE character_id = ? AND id = ?`,
      [
        ...ITEM_COLUMNS.map((column) => values[column] as SqlValue),
        timestamp,
        characterId,
        this.payload.item_id,
      ],
    );
    if (this.payload.item.effects !== undefined) {
      replaceOwnedEffects(
        this.db,
        characterId,
        'character_item_id',
        this.payload.item_id,
        this.payload.item.source_instance_id,
        this.payload.item.effects,
      );
    } else {
      // Owned effects inherit the item's provenance on creation. Preserve that
      // invariant when an ordinary edit changes the item's source but elects
      // not to replace its effect list.
      this.db.exec(
        `UPDATE character_effects
         SET source_instance_id = ?, updated_at = ?
         WHERE character_id = ? AND character_item_id = ?`,
        [
          this.payload.item.source_instance_id,
          timestamp,
          characterId,
          this.payload.item_id,
        ],
      );
    }
  }

  inverse(): UpdateItemPayload {
    if (this.#previous === undefined) {
      throw new Error('Cannot create an inverse before applying the command.');
    }
    return {
      type: 'update_item',
      item_id: this.payload.item_id,
      item: this.#previous,
    };
  }
}

export class RemoveItemCommand implements ResolvesInverseAfterApply {
  readonly actionType = 'remove_item';
  readonly invertsAfterApply = true;

  #removed: AddItemPayload | undefined;

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: RemoveItemPayload,
  ) {}

  apply(characterId: number): void {
    const existing = readItem(this.db, characterId, this.payload.item_id);
    const attunementSlot = itemAttunementSlot(
      this.db,
      characterId,
      this.payload.item_id,
    );
    this.#removed = {
      type: 'add_item',
      item_id: Number(existing.id),
      item: {
        ...fieldsFromRow(existing),
        effects: readOwnedEffects(
          this.db,
          characterId,
          'character_item_id',
          this.payload.item_id,
        ),
      },
      ...(attunementSlot === null
        ? {}
        : { attunement_slot: attunementSlot }),
    };
    this.db.exec(
      'DELETE FROM character_items WHERE character_id = ? AND id = ?',
      [characterId, this.payload.item_id],
    );
  }

  inverse(): AddItemPayload {
    if (this.#removed === undefined) {
      throw new Error('Cannot create an inverse before applying the command.');
    }
    return this.#removed;
  }
}

export class AttuneItemCommand implements ResolvesInverseAfterApply {
  readonly actionType = 'attune_item';
  readonly invertsAfterApply = true;

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: AttuneItemPayload,
  ) {}

  apply(characterId: number): void {
    readItem(this.db, characterId, this.payload.item_id);
    if (itemAttunementSlot(this.db, characterId, this.payload.item_id) !== null) {
      throw new TypeError('Item already holds an attunement slot.');
    }
    const held = occupants(this.db, characterId);
    const free = attunementSlots.find(
      (slot) => !held.some((occupant) => occupant.slot === slot),
    );
    if (free === undefined) {
      throw new AttunementSlotsFull(held);
    }
    restoreSlot(this.db, characterId, free, this.payload.item_id);
  }

  inverse(): UnattuneItemPayload {
    return { type: 'unattune_item', item_id: this.payload.item_id };
  }
}

export class UnattuneItemCommand implements ResolvesInverseAfterApply {
  readonly actionType = 'unattune_item';
  readonly invertsAfterApply = true;

  #slot: AttunementSlot | undefined;

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: UnattuneItemPayload,
  ) {}

  apply(characterId: number): void {
    readItem(this.db, characterId, this.payload.item_id);
    const slot = itemAttunementSlot(this.db, characterId, this.payload.item_id);
    if (slot === null) {
      throw new TypeError('Item does not hold an attunement slot.');
    }
    this.#slot = slot;
    this.db.exec(
      `UPDATE character_attunement_slots
       SET ${slotColumn(slot)} = NULL
       WHERE character_id = ?`,
      [characterId],
    );
  }

  inverse(): RestoreAttunementSlotPayload {
    if (this.#slot === undefined) {
      throw new Error('Cannot create an inverse before applying the command.');
    }
    return {
      type: 'restore_attunement_slot',
      slot: this.#slot,
      item_id: this.payload.item_id,
    };
  }
}

export class RestoreAttunementSlotCommand implements ResolvesInverseAfterApply {
  readonly actionType = 'restore_attunement_slot';
  readonly invertsAfterApply = true;

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: RestoreAttunementSlotPayload,
  ) {}

  apply(characterId: number): void {
    restoreSlot(
      this.db,
      characterId,
      this.payload.slot,
      this.payload.item_id,
    );
  }

  inverse(): UnattuneItemPayload {
    return { type: 'unattune_item', item_id: this.payload.item_id };
  }
}

export class ReplaceAttunedItemCommand implements ResolvesInverseAfterApply {
  readonly actionType = 'replace_attuned_item';
  readonly invertsAfterApply = true;

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: ReplaceAttunedItemPayload,
  ) {}

  apply(characterId: number): void {
    readItem(this.db, characterId, this.payload.item_id);
    readItem(this.db, characterId, this.payload.replaced_item_id);
    if (itemAttunementSlot(this.db, characterId, this.payload.item_id) !== null) {
      throw new TypeError('Replacement item already holds an attunement slot.');
    }
    const slot = itemAttunementSlot(
      this.db,
      characterId,
      this.payload.replaced_item_id,
    );
    if (slot === null) {
      throw new TypeError('Item chosen for replacement is no longer attuned.');
    }
    this.db.exec(
      `UPDATE character_attunement_slots
       SET ${slotColumn(slot)} = ?
       WHERE character_id = ? AND ${slotColumn(slot)} = ?`,
      [this.payload.item_id, characterId, this.payload.replaced_item_id],
    );
  }

  inverse(): ReplaceAttunedItemPayload {
    return {
      type: 'replace_attuned_item',
      item_id: this.payload.replaced_item_id,
      replaced_item_id: this.payload.item_id,
    };
  }
}
