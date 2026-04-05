# Charlotte — Changelog

## Unreleased

### Added
- **Markdown rendering** for blog posts and about pages using goldmark with GFM extensions (tables, code blocks, blockquotes, strikethrough, autolinks, footnotes).
- **Inline editing** on public pages: blog posts, about page, and recipes now show an Edit button for the owner, allowing edits directly on the public URL (`?edit=1`) without navigating to the dashboard.
- **Gallery hero section**: the public gallery home page now shows a full-width hero image using the most recent photo, with a profile avatar, name, and feature navigation overlaid.
- **Lightbox**: clicking any photo in a gallery grid opens a full-screen lightbox overlay with prev/next navigation (arrow keys and on-screen buttons) and Escape to close.
- **Larger gallery grid** on album pages.
- **`docs/` folder**: project documentation for features, architecture, and changes.

### Changed
- Recipe "Attempts" renamed to "Variations" throughout (templates, flash messages, dashboard labels). Database schema unchanged.
- About page content is now stored as raw markdown and rendered via goldmark. Previously all HTML was stripped on save.
- `post-body` CSS class no longer applies `white-space: pre-wrap`; markdown-rendered content uses the new `prose-content` class instead.

### Routes added
- `POST /u/{username}/blog/{slug}` — inline blog post update (owner only, CSRF-protected).
- `POST /u/{username}/about` — inline about page save (owner only, CSRF-protected).
- `POST /u/{username}/recipes/{slug}` — inline recipe update (owner only, CSRF-protected).

---

## Initial release

### Added
- Multi-user personal website platform with per-user public sub-paths.
- Blog with tags and visibility toggle.
- About page.
- Photo gallery with albums, cover photos, multiple-file upload, and per-album visibility toggle.
- Recipe book with ingredient/step sections and variations journal.
- Dashboard for all content management.
- Admin panel: user approval, content moderation, site settings.
- Session-based auth with bcrypt passwords and CSRF protection.
- Rate limiting on login and register endpoints.
- File upload validation (MIME allowlist, 10 MB cap, path traversal prevention).
- Docker multi-stage build (distroless image).
- Kubernetes manifests (Deployment, ClusterIP Service, ReadWriteOnce PVC).
- SQLite in WAL mode with no CGO dependency.
