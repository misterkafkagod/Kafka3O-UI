# P90 · F54-B3 — Pause, resume and delete from the topic
- **Milestone:** M16
- **Covers:** F54-AC3
- **Discovery:** —
- **Status:** Building

## Demo
1. On `kafka3o-m10-verify`'s Backup tab, pause the backup, then resume it: the state follows.
2. Delete the job of a probe topic's backup: the tab says "No backup for this topic." and the stored objects remain.
3. The audit lists backups.pause, backups.resume and backups.delete; on a Production cluster each needs ADMIN plus a reason.

## Tasks
- [ ] **T90.1 Topic backup actions** — Covers: F54-AC3
  - Files: src/components/TopicBackupActions.tsx (new), src/components/TopicBackupActions.test.tsx (new), src/components/TopicBackup.tsx, src/components/TopicBackup.test.tsx
  - Do: `TopicBackupActions` shows Pause (or Resume when paused) and Delete for the topic's backup with the same confirmations, request notices, error descriptions and delayed reload as the cluster tab (`actions.run`); hidden when `run` is absent or the job is gone ("NO JOB"). Roles, Production reason and audit stay in the existing write path (Console + Gateway), unchanged.
  - Done when: `npx vitest run src/components/TopicBackupActions src/components/TopicBackup` passes covering pause, resume, delete, cancel sends nothing, a Production cancel ("Canceled; nothing was sent."), a 403 denial, and no buttons without `run`.

## Review
