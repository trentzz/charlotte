# RC-02: Sanitise project body content before storage

**Priority**: critical  
**Epic**: REVIEW-CYCLE-2026-04-05

## Goal

Project body HTML must be sanitised before being written to the database, consistent with how blog post and about page content is handled.

## Finding

`DashProjectCreate` and `DashProjectUpdate` store `body.Body` raw without calling `sanitizeContent()`. Blog and about page handlers sanitise on write. The output path sanitises via `renderContent()`, but the raw unsanitised source is returned by the API and could be rendered directly by any future change.

## Success Criteria

- [ ] `DashProjectCreate` calls `sanitizeContent()` on the body before insertion.
- [ ] `DashProjectUpdate` calls `sanitizeContent()` on the body before update.
- [ ] Pattern matches `DashBlogCreate` / `DashBlogUpdate` exactly.
- [ ] `/update` has been run after changes.
