# Isolated synchronization preview

Base: d3d3d61c4498c0e2093f20c8d1be8b9bfcb6fd36.

This branch must not be merged wholesale. Firebase initialization is disabled, local storage uses a separate key, the CSP blocks external connections, and Vercel production builds fail deliberately. Only fictional seed data is used.

Changes: serialize manual/auto saves, clone each submitted snapshot, acknowledge its fingerprint only, keep later edits pending, reject stale account acknowledgements, clean up visibility/online listeners, retry pending work after reconnection, and offer a separate local recovery JSON including trash. Linked media files are not embedded in the recovery JSON.

Tests: npm test; npm run build. Preview browsing checks local editing/export only, not actual cloud synchronization.

Still pending: cross-device conflict control, safe orphan deletion/tombstones, non-destructive migrations, account-scoped durable persistence, upload deduplication, complete cloud backups and isolated restore, Storage quota diagnosis, authenticated image access, emulator/integration and iPhone Safari validation. Do not promote until these protections and recovery requirements are addressed.
