/** Serialize ordinary saves and reviewed resolutions through the same lane. */
export function createSnapshotSaveQueue<T>(options: {
  read: () => T;
  write: (owner: string, snapshot: T) => Promise<void>;
  acknowledge: (snapshot: T) => void;
  isOwnerActive: (owner: string) => boolean;
}) {
  let tail: Promise<void> = Promise.resolve();
  const runExclusive = (operation: () => Promise<void>): Promise<void> => {
    const result = tail.then(operation);
    tail = result.catch(() => undefined);
    return result;
  };
  const save = (owner: string): Promise<void> => runExclusive(async () => {
    if (!options.isOwnerActive(owner)) throw new Error('La sesión cambió. El guardado sigue pendiente.');
    const snapshot = structuredClone(options.read());
    await options.write(owner, snapshot);
    if (!options.isOwnerActive(owner)) throw new Error('La sesión cambió durante el guardado. Revisa la sincronización.');
    options.acknowledge(snapshot);
  });
  return Object.assign(save, { runExclusive });
}
