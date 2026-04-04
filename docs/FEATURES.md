# Charlotte — Feature Documentation

## Core platform

Charlotte is a multi-user personal website platform. Each user gets a public sub-path at `/u/{username}/` and can enable or disable features through their dashboard. Multiple users can share one instance, but the platform is intentionally non-social — no user directory, no follows, no feeds.

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
- Photos belong to albums. A "General" album is created automatically for unassigned photos.
- Per-album visibility toggle (public / private).
- Album cover photo: set automatically on first upload; can be changed manually.
- **Gallery home**: single top nav only, then a "Gallery" section title, album grid (no rounded corners) and a recent photos grid.
- **Album page**: editorial, photography-first layout inspired by Sean Tucker's style. Centred title in the display font, muted photo count, optional italic description, then a full-width 3-column photo grid (2 on tablet, 1 on mobile) with 3 px gap and no rounded corners. Back link at the bottom.
- Albums listed as direct links in the Gallery nav dropdown.
- **Lightbox**: click any photo to view full-size with prev/next navigation and keyboard support (arrow keys, Escape).

### Recipes

- Create and edit recipes with ingredient list and step-by-step method (plain text, newline-delimited).
- Per-recipe visibility toggle (public / private).
- **Variations journal**: log named variations on each recipe with a title and freeform notes, timestamped.
- **Inline editing**: owner can click Edit on the public recipe page and save directly.

### Projects

- Showcase portfolio items as cards with a title, description, external link, and optional image.
- Per-project visibility toggle (public / private).
- Dashboard CRUD: create, edit, delete, publish/unpublish.
- Shown as a responsive grid on the user home page (up to 6 recent) and on a dedicated `/u/{username}/projects/` page.
- Feature flag: enable or disable from the dashboard features page.

### User profile

- Display name, bio, avatar upload.
- Up to 10 external links (label + URL).
- Per-user feature toggles: Blog, About, Gallery, Recipes, Projects.

---

## Navigation (user pages)

User public pages have **one nav bar only** — the sticky white top nav. No secondary nav bars or profile headers appear on section pages (blog, gallery, recipes, projects, about).

- **Logo**: user's display name, links to their home page.
- **Nav order**: Home | Blog ▾ | Projects ▾ | Gallery ▾ | Recipes ▾ | About
- **Blog dropdown**: up to 5 most recent published posts + "See all posts →".
- **Projects dropdown**: up to 5 most recent published projects + "See all →".
- **Gallery dropdown**: all published albums as direct links + "See all →".
- **Recipes dropdown**: up to 5 most recent published recipes + "See all →".
- **About**: plain link, no dropdown.
- **Account icon** (top right, all logged-in users): dropdown with My Page, Dashboard, Admin (if applicable), Log out.
- **All dropdowns open on click**, not on hover. Close on outside click or Escape.
- **Nav font**: DM Serif Display, uppercase, bold. Size configurable via Appearance settings (10–20 px slider).
- Charlotte branding appears only in the footer.

---

## Appearance (per-user theme)

Each user can fully customise the visual style of their public pages from Dashboard → Appearance:

- **Accent colour**: HSL sliders (hue 0–360, saturation 0–100, lightness 0–100).
- **Background colour**: HSL sliders for the page background.
- **Body font**: sans-serif (Inter, Lato, Source Sans Pro, Nunito, Open Sans, Roboto) and serif (EB Garamond, Cormorant Garamond, Libre Baskerville) options, grouped by type.
- **Heading / display font**: DM Serif Display (default), Playfair Display, Cormorant Garamond, EB Garamond, Libre Baskerville, Inter.
- **Base font size**: slider 12–22 px.
- **Nav label size**: slider 10–20 px.
- Live preview swatch shows accent and background colours before saving.
- Settings stored as JSON per user. Applied as CSS custom property overrides injected into `<head>` of every user page.

Default theme: sage green accent, warm cream background, DM Serif Display headings, EB Garamond body font, 16 px base size, 13 px nav labels.

---

## Dashboard

- Overview page with quick links and content counts.
- Profile editor: display name, bio, avatar, external links.
- **Appearance editor**: accent colour, background colour, fonts, font size, nav label size (HSL sliders, live preview).
- Feature toggles: Blog, About, Gallery, Recipes, Projects.
- Blog manager: list, create, edit, delete posts; toggle visibility.
- About page editor (Quill rich text editor).
- Gallery manager: upload photos, manage albums, set covers, toggle album visibility.
- Recipes manager: list, create, edit, delete recipes; add/delete variations; toggle visibility.
- Projects manager: list, create, edit, delete projects; toggle visibility.

---

## Admin panel

- User management: approve, suspend, delete accounts.
- Content moderation: view and delete any post, photo, or recipe.
- Site settings: site name, registration open/closed, site description.

---

## Authentication and security

- bcrypt passwords (cost 12).
- Session tokens (32-byte random, HttpOnly secure cookie, 30-day TTL).
- CSRF tokens on all POST forms (GET routes for forms must also run CSRF middleware).
- Rate limiting on login and register endpoints (in-memory token bucket per IP).
- File upload validation: MIME sniffing + allowlist (jpeg/png/webp/gif) + 10 MB cap.
- Path traversal prevention on file serving.
- Markdown rendered via goldmark with unsafe HTML disabled (prevents XSS).
- Admin bootstrap: first registration becomes admin when no users exist.

---

## Design system

- Typography: DM Serif Display for all h1–h5 headings and nav labels; EB Garamond for body text. Both configurable per user.
- Colour palette: warm cream background, sage green accent, dark warm text — all overridable via the theme system.
- Gallery and photo grids: no rounded corners (editorial/photography aesthetic). Project cards: rounded corners (card layout).
- Layouts use an 8 px spacing grid and CSS custom properties throughout.
- Section pages (blog, gallery, recipes, projects, about) start with a clean serif section title and then content — no avatars or secondary identity blocks.

---

## Deployment

- Single Go binary, no CGO, no external services.
- SQLite database in WAL mode.
- Files stored under a mounted `/data` volume.
- Docker multi-stage build → distroless image; `docker-compose.yml` provided for local development.
- Kubernetes: single replica (SQLite single-writer), ClusterIP service, ReadWriteOnce PVC.
- Reverse proxy (nginx/traefik) handles TLS; app speaks plain HTTP on the configured `PORT` (default 9271).

---

## React SPA frontend

The frontend is a React 18 + Material UI 5 single-page application built with Vite, served from `frontend/dist/` by the Go binary. All pages communicate with the Go backend via the JSON REST API at `/api/v1/`.

### Architecture

- `frontend/src/api/client.js` — Axios instance with CSRF interceptor (reads `charlotte_csrf` cookie) and 401 event dispatch.
- `frontend/src/context/AuthContext.jsx` — User session state, hydrated from `GET /api/v1/auth/me` on mount.
- `frontend/src/theme/buildProfileTheme.js` — Converts a user's stored theme object into a MUI `createTheme()` call. HSL colours, font families, and font sizes all applied.
- `frontend/src/layouts/ProfileLayout.jsx` — Per-user public page layout: fetches profile, builds per-user MUI theme, renders sticky nav with click-open dropdowns.
- `frontend/src/layouts/DashboardLayout.jsx` — Persistent sidebar nav layout for all dashboard and admin pages.

### Public pages

All routes under `/u/:username/` use the per-user theme. Nav has click-open dropdowns for Blog, Projects, Gallery, and Recipes with the most recent items plus a "See all" link.

### Dashboard

- Overview, Profile, Appearance, Features — site and profile management.
- Blog — table of posts, `react-quill` rich text editor for body content.
- About — raw Markdown textarea (server renders to HTML).
- Gallery — album CRUD, photo upload (multi-file), lightbox view, delete.
- Recipes — form editor with ingredient and step list management.
- Projects — card grid with inline create/edit forms.

### Admin

- Users table with approve, suspend, and delete actions.
- Content moderation with tabbed view across posts, photos, and recipes.
- Site settings form (site name, description, registration toggle).

### Build

```
cd frontend && npm install && npm run build
```

Output goes to `frontend/dist/`. The Go binary serves `frontend/dist/index.html` for all non-API routes (SPA catch-all) and `frontend/dist/assets/` for static assets.

---

## Planned / in progress

- [ ] Blog editor upgrade: replace react-quill with Tiptap for better image handling and a cleaner API.
- [ ] Per-user colour scheme live preview on the public page (currently requires saving to see full effect).
- [ ] Project image upload from the dashboard (currently projects only support a title, description, and URL).
- [ ] Recipe attempt/variation journal from the dashboard UI (API endpoints exist).
