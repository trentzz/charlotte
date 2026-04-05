# Review Cycle 2026-04-05

## Summary

Critical review of Charlotte platform conducted by Opus. 18 findings across critical, high, medium, and low severity.

## Findings

### Critical
1. Album deletion destroys shared photo files (data loss)
2. Project body content not sanitised before storage (stored XSS)

### High
3. Session cookie missing Secure flag
4. N+1 blog tag queries + missing tags in admin views
5. CSRF token not session-bound (weak double-submit cookie)

### Medium
6. Admin approve/suspend silently succeeds for non-existent users
7. SQL table name concatenated into query (SQL injection risk pattern)
8. Dead `site_theme_json` column on site_settings table
9. Multi-statement migration entries — fragile driver dependency
10. `GetOrCreateGeneralAlbum` dead code conflicts with `GetDefaultAlbum`
11. 200 MB body limit on all routes (DoS vector)
12. Homepage widget content/label not sanitised

### Low
13. `makeUniqueSlug` infinite loop (theoretical)
14. User links no max count enforcement
15. Registration ShowOnHomepage default mismatch
16. Email validation trivially weak
17. Inconsistent error response format (middleware vs handlers)
18. WebP images store width=0, height=0

## Tasks

- [RC-01] fix-album-delete-shared-photos.md
- [RC-02] sanitise-project-body.md
- [RC-03] session-cookie-secure-flag.md
- [RC-04] blog-tags-n1-query.md
- [RC-05] csrf-session-binding.md
- [RC-06] admin-user-status-not-found.md
- [RC-07] slug-unique-table-concat.md
- [RC-08] dead-site-theme-column.md
- [RC-09] dead-general-album.md
- [RC-10] body-size-limit.md
- [RC-11] webp-dimensions.md
