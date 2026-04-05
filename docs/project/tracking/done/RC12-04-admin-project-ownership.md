# RC12-04: Admin project ownership check

**Priority**: high
**Epic**: REVIEW-CYCLE-2026-04-05b

## Finding

`getOwnedProject` in `internal/api/dash_projects.go` checks `proj.UserID != user.ID` with no admin bypass. `getOwnedPost` and `getOwnedRecipe` both include `&& !user.IsAdmin()` so admins can manage any user's content. Projects break this pattern.

## Success Criteria

- [ ] `getOwnedProject` includes `&& !user.IsAdmin()` so admin users can edit/delete any project.
- [ ] Pattern matches `getOwnedPost` and `getOwnedRecipe` exactly.
- [ ] `/update` has been run after changes.
