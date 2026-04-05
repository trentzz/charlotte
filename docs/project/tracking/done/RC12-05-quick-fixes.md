# RC12-05: Quick fixes bundle

**Priority**: low-medium
**Epic**: REVIEW-CYCLE-2026-04-05b

## Fixes

### L-04: AdminPhotoDelete ignores error from DeletePhoto
`internal/api/admin.go` `AdminPhotoDelete()`: currently `if err == nil && deleted != nil` — if `err != nil`, falls through and returns "photo deleted". Fix: check `err != nil` first and return 500.

### L-05: Slug variable shadows slug package import
`internal/api/dash_projects.go` line 51: `slug := makeUniqueSlug(...)` shadows the `slug` package import. Rename the local variable to `projectSlug`.

### L-06: Autocomplete inputValue hard-coded to "" in ProjectEditor
`frontend/src/pages/dashboard/Projects.jsx`: the linked-posts Autocomplete has `inputValue=""` and `onInputChange` is a no-op. Add proper `inputValue` state so users can type to filter the post list.

### M-07: Body limit path check is fragile in main.go
`cmd/charlotte/main.go`: the recipe photo upload path check uses slice indexing without adequate bounds. Replace with `strings.HasPrefix` and `strings.HasSuffix` (import `strings` if not already imported).

### L-01: DashboardLayout is dead code
`frontend/src/App.jsx` imports `DashboardLayout` but all dashboard routes use `SettingsLayout`. Remove the import and delete `frontend/src/layouts/DashboardLayout.jsx`.

## Success Criteria

- [ ] `AdminPhotoDelete` returns 500 when `DeletePhoto` fails.
- [ ] Slug local var renamed to `projectSlug` in `DashProjectCreate`.
- [ ] ProjectEditor Autocomplete has working input state for filtering linked posts.
- [ ] Recipe photo path check uses `strings.HasPrefix`/`HasSuffix`.
- [ ] `DashboardLayout.jsx` removed and its import removed from `App.jsx`.
- [ ] `/update` has been run after changes.
