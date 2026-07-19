/**
 * Run at most `limit` promises concurrently. When a promise settles it is
 * removed from the pool so the next task can start.
 */
export async function withLimit<T>(
  limit: number,
  pending: Set<Promise<unknown>>,
  fn: () => Promise<T>
): Promise<T> {
  while (pending.size >= limit) {
    await Promise.race(pending);
  }
  const p = fn().finally(() => {
    pending.delete(p);
  });
  pending.add(p);
  return p;
}
