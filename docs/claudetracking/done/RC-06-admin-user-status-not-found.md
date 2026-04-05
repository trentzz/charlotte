# RC-06: Return 404 when admin approves/suspends non-existent user

**Priority**: medium  
**Epic**: REVIEW-CYCLE-2026-04-05

## Goal

`AdminUserApprove` and `AdminUserSuspend` must verify the target user exists and return a 404 if not.

## Finding

`UpdateUserStatus` runs `UPDATE ... WHERE id = ?` and returns no error when zero rows are affected. The admin receives a success response for non-existent user IDs.

## Success Criteria

- [ ] `UpdateUserStatus` (or the handlers) check `RowsAffected()` and return an error when 0.
- [ ] The admin API returns HTTP 404 with a clear message when the user ID does not exist.
- [ ] `/update` has been run after changes.
