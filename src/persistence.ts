/** Drain changes made while previous snapshots are in flight before leaving a room. */
export async function flushLatest<T>(
  current: () => T | null,
  saved: () => T | null,
  save: (snapshot: T) => Promise<void>,
) {
  let snapshot = current();
  while (snapshot !== null && snapshot !== saved()) {
    await save(snapshot);
    snapshot = current();
  }
}
