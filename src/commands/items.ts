import type { SqlValue } from '@sqlite.org/sqlite-wasm';
import type { DatabaseContext } from '../db/database';
import type {
  AddItemCommand as AddItemPayload,
  ItemFields,
  RemoveItemCommand as RemoveItemPayload,
  UpdateItemCommand as UpdateItemPayload,
} from '../domain/command-contracts';
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
  'attuned',
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
    attuned: item.attuned ? 1 : 0,
    source_instance_id: item.source_instance_id,
  };
}

function fieldsFromRow(row: ItemRow): ItemFields {
  return {
    name: String(row.name),
    description:
      row.description === null ? null : String(row.description),
    requires_attunement: Number(row.requires_attunement) === 1,
    attuned: Number(row.attuned) === 1,
    source_instance_id:
      row.source_instance_id === null
        ? null
        : Number(row.source_instance_id),
  };
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
