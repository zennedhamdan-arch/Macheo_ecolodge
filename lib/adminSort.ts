/**
 * Ordering helpers shared by the dashboard's CRUD screens.
 *
 * Every list an admin manages is ordered BY THE DATABASE — `sort_order`
 * ascending, `created_at` descending as the tie-break — and a newly created
 * row is inserted at the TOP of that order. Nothing here relies on the
 * frontend shuffling an array into the shape it hopes the database has.
 */

/**
 * The `sort_order` a NEW row should be given so it appears first.
 *
 * `sort_order` ascending is the display order everywhere (admin lists and the
 * public pages read the same column), so the smallest value wins. The value
 * returned is one below the smaller of 0 and the lowest existing sort_order —
 * so it is always below every row that is already there (the seed starts at 0,
 * and a previous insert may already have gone negative) without renumbering or
 * otherwise disturbing the existing items. It stays at the top after a reload
 * because the database, not the component, decides the order.
 *
 * The value walks downwards (-1, -2, …) as items are added; that is fine for
 * an integer column, and the reorder buttons renumber the whole list back to
 * 0…n-1 the first time the owner moves anything.
 */
export function topSortOrder(rows: readonly { sort_order: number }[]): number {
  const lowest = rows.reduce((min, row) => Math.min(min, row.sort_order), 0);
  return lowest - 1;
}
