# Charlotte — Feature Documentation

## Core platform

Charlotte is a multi-user personal website platform. Each user gets a public sub-path at `/u/{username}/` and can enable or disable features through their dashboard.

---

## Features

### Blog

- Create, edit, and delete posts from the dashboard.
- Markdown rendering with full GFM support: code blocks, tables, blockquotes, strikethrough, autolinks, footnotes.
- Embed images in post body using standard markdown syntax: `![alt text](/uploads/{userID}/filename.jpg)`.
- Tag support (comma-separated).
- Per-post visibility toggle (public / private draft).
- **Inline editing**: owner can click Edit on the public post page and save directly without going to the dashboard.

### About page

- Single markdown document rendered as a public about page.
- **Inline editing**: owner can click Edit on the public about page and save directly.
- Supports the same GFM markdown as the blog.

### Gallery

- Upload photos (JPEG, PNG, WebP, GIF) up to 10 MB each; up to 20 files per batch.
- Photos belong to albums. A "General" album is created automatically for photos not assigned to a named album.
- Per-album visibility toggle (public / private).
- Album cover photo: set automatically on first upload; can be changed manually.
- **Public gallery home**: full-width hero section showing the most recent photo, feature navigation overlay, album grid, and recent photos grid.
- **Lightbox**: click any photo in the gallery grid to view full-size with prev/next navigation and keyboard support (arrow keys, Escape).

### Recipes

- Create and edit recipes with ingredient list and step-by-step method (plain text, newline-delimited).
- Per-recipe visibility toggle (public / private).
- **Variations journal**: log named variations (formerly "attempts") on each recipe with a title and freeform notes, timestamped. Displayed in a sidebar on the public recipe page.
- **Inline editing**: owner can click Edit on the public recipe page and save directly.

### User profile

- Display name, bio, avatar upload.
- Up to 10 external links (label + URL).
- Per-user feature toggles: Blog, About, Gallery, Recipes.

---

## Dashboard

- Overview page with post/photo/recipe counts and recent uploads.
- Profile editor: display name, bio, avatar, links.
- Feature toggles page.
- Blog manager: list, create, edit, delete posts; toggle visibility inline.
- About page editor.
- Gallery manager: upload photos, manage albums, set covers, toggle album visibility.
- Recipes manager: list, create, edit, delete recipes; add/delete variations; toggle visibility.

---

## Admin panel

- User management: approve, suspend, delete accounts.
- Content moderation: view and delete any post, photo, or recipe.
- Site settings: site name, registration open/closed, site description.

---

## Authentication and security

- bcrypt passwords (cost 12).
- Session tokens (32-byte random, HttpOnly secure cookie, 30-day TTL).
- CSRF tokens on all POST forms.
- Rate limiting on login and register endpoints (in-memory token bucket per IP).
- File upload validation: MIME sniffing + allowlist (jpeg/png/webp/gif) + 10 MB cap.
- Path traversal prevention on file serving.
- Markdown rendered via goldmark with unsafe HTML disabled (prevents XSS).
- Admin bootstrap: first registration becomes admin when no users exist.

---

## Deployment

- Single Go binary, no CGO, no external services.
- SQLite database in WAL mode.
- Files stored under a mounted `/data` volume.
- Docker multi-stage build → distroless image.
- Kubernetes: single replica (SQLite single-writer), ClusterIP service, ReadWriteOnce PVC.
- Reverse proxy (nginx/traefik) handles TLS; app speaks plain HTTP on `:8080` (or `PORT` env var).
