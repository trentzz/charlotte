# RC13-04: Add Appearance link to admin sidebar navigation

**Priority:** high
**Epic:** REVIEW-CYCLE-2026-04-05c

## Goal

Add "Appearance" to the admin sidebar navigation so admins can reach
`/admin/appearance` without typing the URL manually.

## Background

Review finding H1: the route `/admin/appearance` exists and the `AdminAppearance`
component is registered in `App.jsx` (line 107), but `ADMIN_NAV` in `SettingsLayout.jsx`
(lines 33–37) only lists Users, Content, and Settings. Appearance is absent.

Relevant file:
- `frontend/src/layouts/SettingsLayout.jsx` — add `{ label: 'Appearance', href: '/admin/appearance' }` to `ADMIN_NAV`

## Success Criteria

- [ ] "Appearance" appears in the admin sidebar navigation
- [ ] Clicking it navigates to `/admin/appearance`
- [ ] The page loads and functions (colour/font settings work)
- [ ] Other admin nav items are unaffected
- [ ] Docker container rebuilds and runs cleanly after the change
- [ ] /update has been run after changes
