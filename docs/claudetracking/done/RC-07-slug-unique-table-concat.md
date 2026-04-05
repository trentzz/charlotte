# RC-07: Eliminate SQL table-name string concatenation in slugUnique

**Priority**: medium  
**Epic**: REVIEW-CYCLE-2026-04-05

## Goal

Replace the table-name string concatenation in `slugUnique()` with an approach that cannot accidentally introduce SQL injection if a future caller passes a non-literal value.

## Finding

`slugUnique()` in `internal/api/app.go` builds `"SELECT COUNT(*) FROM " + table`. All current callers pass string literals, but the function signature allows any string. A simple fix is to use a whitelist/switch over allowed table names.

## Success Criteria

- [ ] `slugUnique` validates the table parameter against an explicit whitelist (or uses a switch) and returns an error for unrecognised values.
- [ ] All existing call sites still work.
- [ ] `/update` has been run after changes.
