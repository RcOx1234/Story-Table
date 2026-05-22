/** Ordena entradas de una línea temporal (menor timelineSortOrder = primero). */
export function sortByTimelineOrder<T extends { id: string; timelineSortOrder?: number; createdAt?: string }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const ao = a.timelineSortOrder;
    const bo = b.timelineSortOrder;
    if (ao != null && bo != null) return ao - bo;
    if (ao != null) return -1;
    if (bo != null) return 1;
    return (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
  });
}

export function reorderTimelineItems<T extends { id: string }>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function applyTimelineSortOrders<T extends { id: string }>(items: T[]): { id: string; timelineSortOrder: number }[] {
  return items.map((item, index) => ({ id: item.id, timelineSortOrder: index }));
}
