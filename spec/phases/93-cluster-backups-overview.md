# P93 · F56-B1 — Cluster Backups overview
- **Milestone:** M16
- **Covers:** F56-AC1
- **Discovery:** —
- **Status:** Building

## Demo
1. Open Kafka A's Backups tab: every backup is listed with state, location, last write, size and restore progress, and no action buttons.
2. Click `kafka3o-m10-verify`: its Backup tab opens.

## Tasks
- [x] **T93.1 Read-only overview with links** — Covers: F56-AC1
  - Files: src/components/BackupList.tsx, src/components/BackupList.test.tsx, src/components/ClusterBackups.tsx, src/components/ClusterBackups.test.tsx, src/components/StartBackup.tsx (removed), src/components/StartBackup.test.tsx (removed), src/groups/isConnectStorageTopic.ts (removed), src/groups/isConnectStorageTopic.test.ts (removed), src/pages/ClusterPage.tsx, src/App.tsx
  - Do: `BackupList` drops its actions and links each topic to `/clusters/:id/topics/:topic/backup`; `ClusterBackups` drops the Start form and says backups are started, changed and restored from each topic's Backup tab; the now-unused `StartBackup` and `isConnectStorageTopic` go; `ClusterPage` no longer takes backup actions.
  - Done when: `npx vitest run src/components/BackupList src/components/ClusterBackups src/pages/ClusterPage` passes covering the encoded link, no buttons, restore progress and failure rows, and the hint.

## Review
