type HasDuplicate<
  Values extends readonly PropertyKey[],
  Seen extends PropertyKey = never,
> = Values extends readonly [
  infer Head extends PropertyKey,
  ...infer Tail extends readonly PropertyKey[],
]
  ? Head extends Seen
    ? true
    : HasDuplicate<Tail, Seen | Head>
  : false;

type CompleteValues<
  Required extends PropertyKey,
  Values extends readonly Required[],
> = HasDuplicate<Values> extends true
  ? never
  : Exclude<Required, Values[number]> extends never
    ? unknown
    : never;

/**
 * Authors one non-empty, duplicate-free tuple containing every member of a
 * closed vocabulary. The required union is independent from the tuple, so an
 * omitted, repeated, or foreign value is a compile error.
 */
export function exactValues<Required extends PropertyKey>() {
  return <const Values extends readonly [Required, ...Required[]]>(
    ...values: Values & CompleteValues<Required, Values>
  ): Values => values;
}

type CompleteOrder<
  Table extends object,
  Order extends readonly (keyof Table)[],
> = HasDuplicate<Order> extends true
  ? never
  : Exclude<keyof Table, Order[number]> extends never
    ? unknown
    : never;

type OrderedValues<
  Table extends object,
  Order extends readonly (keyof Table)[],
> = {
  readonly [Index in keyof Order]: Table[Order[Index]];
};

/**
 * Projects an exact keyed table through an independently authored order. The
 * order must contain every table key exactly once and cannot name another key.
 */
export function exactOrder<
  const Table extends object,
  const Order extends readonly (keyof Table)[],
>(
  table: Table,
  order: Order & CompleteOrder<Table, Order>,
): OrderedValues<Table, Order> {
  return order.map((key) => table[key]) as unknown as OrderedValues<Table, Order>;
}
