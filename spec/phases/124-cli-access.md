# P124 · F68-B4 — Access grants and group mappings
- **Milestone:** M22
- **Covers:** F68-AC4
- **Discovery:** —
- **Status:** Building

## Demo
1. `kafka3o access` lists identities (label, source, enabled, grants such as `all:ADMIN`) and the Cognito group mappings.
2. `kafka3o access grant kafka3o-cli-test kafka-a VIEWER` shows "none → VIEWER", asks, applies and prints the policy revision; `access` shows `kafka-a:VIEWER`; `access grant kafka3o-cli-test kafka-a none --yes` removes it; granting the same role again sends nothing; a group mapping change is canceled at the confirmation.

## Tasks
- [x] **T124.1 Access listing and changes** — Covers: F68-AC4
  - Files: Kafka3O-cli internal/access/access.go (new), internal/access/list_access.go (new), internal/access/list_access_test.go (new), internal/access/parse_role.go (new), internal/access/parse_role_test.go (new), internal/access/parse_scope.go (new), internal/access/parse_scope_test.go (new), internal/access/find_identity.go (new), internal/access/find_identity_test.go (new), internal/access/change_role_grant.go (new), internal/access/change_group_mapping.go (new), internal/access/change_access_test.go (new), internal/access/fake_console_test.go (new)
  - Do: `ListAccess` follows `nextCursor` (`limit=100`) for identities and keeps the first page's group mappings and truncation flag. `ParseRole` takes VIEWER, OPERATOR, ADMIN or none (case-insensitive; none = ""); `ParseScope` takes `all` (global, "") or a cluster id. `FindIdentity` matches the id exactly or the label case-insensitively (two labels alike → ask for the id). `ChangeRoleGrant` and `ChangeGroupMapping` put every field (`identityId|issuer+group`, `clusterId`, `expectedRole`, `role`) and require the answer's operation id and policy revision.
  - Done when: `go test ./internal/access/` passes covering paging, the role and scope rules, ambiguous and unknown identities, both request bodies and a missing answer.
- [ ] **T124.2 `kafka3o access`, `access grant` and `access map-group`** — Covers: F68-AC4
  - Files: internal/cli/new_access_command.go (new), internal/cli/new_access_command_test.go (new), internal/cli/run_access_change.go (new), cmd/kafka3o/main.go
  - Do: `access` prints `IDENTITY SOURCE ENABLED GRANTS ID` and `ISSUER GROUP SCOPE ROLE` (truncation noted) or JSON. `grant` and `map-group` read the listing, take the current role for that scope as the expected role, stop with "Nothing to change" when it already matches, confirm with subject, scope and old → new (and that roles add up across scopes), send, and print "Changed; policy revision N (operation X)."; refusals go through `adminError`.
  - Done when: `go test ./internal/cli/ -run AccessCommand` passes covering the listing, a grant, a removal, nothing to change, a mapping, cancel, a conflict, a self change and exit 4.

## Review
