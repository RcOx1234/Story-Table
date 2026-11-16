# Firebase cloud preview (text only)

Project: storytable-preview-rcox1234. Branch: codex/storytable-sync-safety-preview.
Personal production and story-table-8f2b6 are not changed.

The web SDK config is fixed to the test project; inherited production environment
variables are ignored. Production builds remain blocked in vite.config.ts.
Storage is deliberately null: embedded uploads reject before a cloud save can
be acknowledged. No images are stripped or silently skipped. Export a local
copy if an embedded image blocks saving. Billing remains disabled.

Local persistence uses story-table-cloud-preview-v1. The previous local-demo
key is not deleted, imported or uploaded. Accounts must be registered in this
test project; existing personal logins are not shared.

Test with fictitious text only. Create a test account, add a world and save.
Open the same preview and account on a second device, or reload to fetch the
latest remote copy. There is no realtime remote subscription yet. Concurrent
edits are checked on save and may require reviewing the two copies.
Do not treat this preview as a verified backup or production release.
