# RC12-03: Font name validation (CSS injection)

**Priority**: high
**Epic**: REVIEW-CYCLE-2026-04-05b

## Finding

`FontBody`, `FontDisplay`, `FontUI` are accepted as arbitrary strings and stored verbatim. They are interpolated into CSS `font-family` declarations. A value like `"Inter'; } body { display:none; } .x { font-family: '"` could inject arbitrary CSS on public profile pages.

**Where**: `internal/api/dash_profile.go` `DashAppearanceSave()`, `internal/api/landing.go` `AdminSiteAppearanceSave()`.

## Fix

Validate font names against an allowlist of known safe values, or apply a strict regex: `^[A-Za-z0-9 \-]+$` (letters, digits, spaces, hyphens only — covers all common Google Fonts names). Reject any font name that doesn't match with a 400 error. Apply the same validation to all three font fields in both handlers.

## Success Criteria

- [ ] Font name fields validated with `^[A-Za-z0-9 \-]+$` regex in `DashAppearanceSave`.
- [ ] Same validation in `AdminSiteAppearanceSave`.
- [ ] Requests with invalid font names return HTTP 400.
- [ ] Valid font names (e.g. "Playfair Display", "EB Garamond", "Inter") still save correctly.
- [ ] `/update` has been run after changes.
