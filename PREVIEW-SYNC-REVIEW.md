# Isolated synchronization preview

Base: d3d3d61c4498c0e2093f20c8d1be8b9bfcb6fd36.

This branch must not be merged wholesale. Firebase initialization is disabled, local storage uses a separate key, the CSP blocks external connections, and Vercel production builds fail deliberately. Only fictional seed data is used.

Changes: serialize manual/auto saves, clone each submitted snapshot, acknowledge its fingerprint only, keep later edits pending, reject stale account acknowledgements, clean up visibility/online listeners, retry pending work after reconnection, and offer a separate local recovery JSON including trash. Linked media files are not embedded in the recovery JSON.

Tests: npm test; npm run build. Preview browsing checks local editing/export only, not actual cloud synchronization.

Still pending: cross-device conflict control, safe orphan deletion/tombstones, non-destructive migrations, account-scoped durable persistence, upload deduplication, complete cloud backups and isolated restore, Storage quota diagnosis, authenticated image access, emulator/integration and iPhone Safari validation. Do not promote until these protections and recovery requirements are addressed.

## Sprint 2: read-only legacy loading and deletion protection

Ordinary saves no longer delete documents missing from a local snapshot. Soft-deleted entities can still be saved with isDeleted. Permanent removal needs a future explicit tombstone/deletion protocol: removing an item locally alone may let it reappear on a later pull.

Legacy libraries are returned without uploading, migrating, or deleting anything. Saving over a legacy/unknown root is blocked pending verified recovery and an explicit migration workflow. Unknown schemas fail visibly at the service boundary; hydration error presentation still needs improvement.

The toolbar exposes Guardar copia in the isolated preview. This downloads a local recovery JSON, not a cloud save. Existing cloud controls remain conditional on Firebase being configured.

New tests execute the actual service through a TypeScript-transpiled in-memory adapter. They are not Firebase emulator or live integration tests. One test documents the remaining stale-device overwrite problem; passing that reproduction does not mean conflicts are fixed. Cross-device version enforcement, atomic multi-document commits, real Storage quota diagnosis, backups and restore remain pending.
