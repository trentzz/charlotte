# RC-08: Remove dead code — site_theme_json column and GetOrCreateGeneralAlbum

**Priority**: medium  
**Epic**: REVIEW-CYCLE-2026-04-05

## Goal

Remove two pieces of dead code that confuse the schema and codebase.

## Findings

1. Migration 27 adds a `site_theme_json TEXT` column to `site_settings`, but all code reads/writes the site theme via the existing `key`/`value` rows. The column is never used.
2. `GetOrCreateGeneralAlbum` in `internal/models/gallery.go` creates an album named "General" with slug "general", duplicating the purpose of `GetDefaultAlbum` ("Uploads"). It is never called.

## Success Criteria

- [ ] `GetOrCreateGeneralAlbum` is removed from `gallery.go`.
- [ ] A new migration is added that drops the unused `site_theme_json` column from `site_settings` (or a comment is added to migration 27 acknowledging it is intentionally unused, if dropping a column in SQLite is too disruptive — SQLite does not support DROP COLUMN before 3.35.0).
- [ ] No existing functionality is broken.
- [ ] `/update` has been run after changes.
