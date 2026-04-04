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
- **Gallery home**: single top nav only, then a "Gallery" section title, album grid (no rounded corners) and a recent photos grid. Only top-level albums (no parent) appear here.
- **Album page**: editorial, photography-first layout inspired by Sean Tucker's style. Centred title in the display font, muted photo count, optional italic description, then a full-width masonry photo grid (3 columns on desktop, 2 on tablet ≤900 px, 1 on mobile ≤600 px) with 10 px gap, original aspect ratios preserved, and no rounded corners. Back link at the bottom.
- Albums listed as direct links in the Gallery nav dropdown.
- **Lightbox**: click any photo to view full-size with prev/next navigation and keyboard support (arrow keys, Escape).
- **Sub-albums**: albums can be nested one level deep. Create a sub-album from inside an album's dashboard view using the "Sub-album" button. Sub-albums do not appear on the gallery home page.
- **Many-to-many photo membership**: a photo can belong to multiple albums simultaneously. In the dashboard album view, use "Add existing" to pick any of your photos and add them to the current album without re-uploading. Photos are stored once in `photos`; membership tracked in the `album_photos` join table (migrations 20–22).
- **Remove from album**: each photo in the dashboard album view has a "Remove from album" action that removes it from the album without deleting the file.
- **Dashboard album view tabs**: when an album has sub-albums, pill buttons appear at the top — "This album" (current album only), "All (inc. sub-albums)" (union of all photos), and one button per sub-album (navigates to that album).
- **Public album navigation**: when a public album has sub-albums, pill buttons appear below the album header — "All" (default, shows all photos across this album and sub-albums), the parent album name, and one button per sub-album.

### Recipes

- Create and edit recipes with a structured ingredient list and step-by-step method.
- Per-recipe visibility toggle (public / private).
- **Ingredient groups**: ingredients are organised into named sections (e.g. "For the sauce"). Each section has an optional heading and a list of items. Multiple sections can be added, removed, and reordered.
- **Method groups**: method steps are organised into named sections (e.g. "Prepare"). Each section has an optional heading and a list of steps. Multiple sections can be added, removed, and reordered.
- **Drag-and-drop reordering**: ingredients and method steps can be dragged to reorder within their section using `@dnd-kit`.
- **Variations**: a recipe can have named variations (e.g. "Vegan version"), each with a title and freeform notes. Variations are displayed on the public recipe page.
- **Attempts journal**: log cooking attempts on each recipe with a title and freeform notes, timestamped.
- **Recipe photos**: attach photos to a recipe (JPEG, PNG, WebP, GIF; up to 10 MB each; up to 20 per upload batch). Photos are managed from the recipe editor — thumbnails with delete buttons appear in the Photos section. Uploaded files are stored in the same `uploads/{userID}/` path as gallery photos.
- Data stored as JSON in three dedicated columns: `ingredients_json`, `method_json`, `variations_json`. Photo records stored in the `recipe_photos` table (migration 19). Legacy flat-text columns retained for backwards compatibility.
- Public recipe page renders grouped ingredients and method with section headings, displays variations below notes, and shows a masonry/grid photo layout below the description (1, 2, or 3 columns depending on photo count).

### Projects

- Showcase portfolio items as cards with a title, description, external link, and optional image.
- Per-project visibility toggle (public / private).
- Dashboard CRUD: create, edit, delete, publish/unpublish.
- Shown as a responsive grid on the user home page (up to 6 recent) and on a dedicated `/u/{username}/projects/` page.
- Feature flag: enable or disable from the dashboard features page.

### Homepage grid builder

- Each user has a fully customisable homepage at `/u/{username}/` built from a free-form widget grid.
- **Dashboard editor** at `/dashboard/homepage`: left panel lists available widget types (Profile card, Text block, Link, Blog post, Photo, Album, Recipe, Project). Clicking "Add" places a widget on the canvas.
- **Canvas**: 12-column grid with 80 px row height. Drag widgets by their top handle strip; resize via the bottom-right handle. Layout auto-compacts vertically.
- **Auto-save**: changes debounce for 1 second and then save silently to `PUT /api/v1/dashboard/homepage`.
- **Content-linked widgets** (blog post, photo, album, recipe, project): a picker dialog lists all available items so the user can choose which one to pin.
- **Text widget**: a dialog accepts plain text or markdown to display inline.
- **Link widget**: a dialog accepts a URL and optional label; renders as a clickable card.
- **Profile widget**: displays the user's avatar, display name, and bio snippet.
- **Public renderer**: if the user has at least one widget, the home page renders the custom grid (non-draggable, non-resizable). If no widgets are set, the default layout (recent posts) is shown as a fallback.
- Widget layout stored as JSON in the `homepage_json` column of the `users` table. Included in the `GET /api/v1/u/{username}` response under the `homepage` key.
- **Robustness**: the layout conversion guards against widgets missing a `layout` property (defaults to `{x:0, y:0, w:4, h:3}`). API errors show an Alert instead of a blank screen.

### User profile

- Display name, bio, avatar upload.
- Up to 10 external links (label + URL).
- Per-user feature toggles: Blog, About, Gallery, Recipes, Projects.
- **Live avatar update**: after a successful avatar upload, the dashboard nav bar refreshes its profile data immediately without requiring a page reload.

---

## Navigation (user pages)

User public pages have **one nav bar only** — the sticky white top nav. No secondary nav bars or profile headers appear on section pages (blog, gallery, recipes, projects, about).

- **Logo**: user's display name, links to their home page.
- **Nav order**: Home | Blog ▾ | Projects ▾ | Gallery ▾ | Recipes ▾ | About
- **Blog dropdown**: up to 5 most recent published posts + "See all posts →".
- **Projects dropdown**: up to 5 most recent published projects + "See all →".
- **Gallery dropdown**: all published albums as direct links + "See all →". Albums are fetched from `GET /api/v1/u/{username}` and returned in the `albums` field alongside `recent_photos`.
- **Recipes dropdown**: up to 5 most recent published recipes + "See all →".
- **About**: plain link, no dropdown.
- **Account icon** (top right, all logged-in users): dropdown with My Page, Dashboard, Admin (if applicable), Log out.
- **All dropdowns open on click**, not on hover. Close on outside click or Escape.
- **Nav font**: DM Serif Display, uppercase, bold. Size configurable via Appearance settings (10–20 px slider). The Account button matches this style in both ProfileLayout and SettingsLayout.
- **Nav item spacing**: 16 px gap between nav items (MUI `gap: 2`).
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
- **Homepage builder**: drag-and-drop grid editor for the public home page (see above).
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
- `frontend/src/context/AuthContext.jsx` — User session state, hydrated from `GET /api/v1/auth/me` on mount. Exposes `refresh()` to re-fetch the current user.
- `frontend/src/context/NavDataContext.jsx` — Provides `navData` and `reloadNavData` to dashboard pages so child pages can trigger a nav refresh without remounting the layout.
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
- Recipes — form editor with grouped ingredients and method steps (drag-to-reorder within each section), multiple sections per recipe, and named variations.
- Projects — card grid with inline create/edit forms.
- Homepage builder — `react-grid-layout` drag-and-resize canvas with widget palette sidebar.

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

## Landing page

- Spider-web themed design with subtle decorative SVG web overlays (opacity 0.06) positioned in the hero section corners.
- Applies the first admin user's configured theme (colours, fonts) via `buildProfileTheme`. Falls back to the default theme if no admin exists.
- Light/dark mode toggle (same sun/moon icon used in ProfileLayout); mode is persisted in `localStorage` as `charlotte_theme_mode`.
- Top bar: Charlotte logo (display font) on the left; light/dark toggle, Log in, and Register (if registration open) on the right; Dashboard if logged in.
- Hero: large display-font site name, italic tagline ("Some website. Radiant." — a nod to Charlotte's Web), optional site description, CTA buttons.
- User grid below hero: flat cards (no Paper elevation) with avatar, display name, username, and truncated bio. Links to `/u/{username}`.
- Footer: "Charlotte" centred, divider line.
- `GET /api/v1/settings` now includes `admin_theme` — the first active admin's theme object — so the landing page can adopt it without a separate API call.

---

## User profile footer

- A "Charlotte" footer link appears at the bottom of every public user page (ProfileLayout), linking back to `/`. Styled `text.secondary`, underline-free, with a hover to `text.primary`.

---

## Planned / in progress

- [ ] Blog editor upgrade: replace react-quill with Tiptap for better image handling and a cleaner API.
- [ ] Per-user colour scheme live preview on the public page (currently requires saving to see full effect).
- [ ] Project image upload from the dashboard (currently projects only support a title, description, and URL).
- [ ] Recipe attempt journal entry UI in the dashboard (API endpoints exist).
