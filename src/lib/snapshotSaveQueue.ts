/** Serialize callers and acknowledge only the immutable snapshot actually written. */
export function createSnapshotSaveQueue<T>(options: {
  read: () => T;
  write: (owner: string, snapshot: T) => Promise<void>;
  acknowledge: (snapshot: T) => void;
  isOwnerActive: (owner: string) => boolean;
}) {
  let tail: Promise<void> = Promise.resolve();
  return (owner: string): Promise<void> => {
    const operation = tail.then(async () => {
      if (!options.isOwnerActive(owner)) throw new Error('La sesi�n cambi�. El guardado sigue pendiente.');
      const snapshot = structuredClone(options.read());
      await options.write(owner, snapshot);
      if (!options.isOwnerActive(owner)) throw new Error('La sesi�n cambi� durante el guardado. Revisa la sincronizaci�n.');
      options.acknowledge(snapshot);
    });
    tail = operation.catch(() => undefined);
    return operation;
  };
}
