# Charlotte — Feature Documentation

## Core platform

Charlotte is a multi-user personal website platform. Each user gets a public sub-path at `/u/{username}/` and can enable or disable features through their dashboard. Multiple users can share one instance, but the platform is intentionally non-social — no user directory, no follows, no feeds.

---

## Features

### Blog

- Create, edit, and delete posts from the dashboard.
- **WYSIWYG editor** (react-quill): supports headings, lists, blockquotes, code blocks, inline images, and links. No markdown syntax required.
- **Image upload**: "Upload image" button in the editor uploads a file and inserts it into the post body at the cursor.
- **Pick from gallery**: "Pick from gallery" button opens a picker to select an existing gallery photo and insert it into the post body. No re-upload needed.
- Tag support (comma-separated).
- Per-post visibility toggle (public / private draft).
- **Inline editing**: owner can click Edit on the public post page and save directly without going to the dashboard.

### About page

- Single rich-text document rendered as a public about page. Edited via the `react-quill` WYSIWYG editor in the dashboard.
- **Inline editing**: owner can click Edit on the public about page and save directly.

### Gallery

- Upload photos (JPEG, PNG, WebP, GIF) up to 10 MB each; up to 20 files per batch.
- Photos belong to albums. A default album named "Uploads" is created automatically for unassigned photos.
- **Default album**: one album per user is marked as the default upload destination (star badge in the dashboard). When auto-created, this album is named "Uploads". Photos uploaded via blog image upload, or any upload that does not specify an album, go into this album. Set any album as default using the star button on the album card or inside the album view. The first album created for a user is automatically marked as the default. Migration 23.
- Per-album visibility toggle (public / private). Toggle from the album card or the album view header (eye icon). Unpublished albums are hidden from the public gallery.
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
- **Recipe photos**: attach photos to a recipe (JPEG, PNG, WebP, GIF; up to 10 MB each; up to 20 per upload batch). Photos are managed from the recipe editor — thumbnails with delete buttons appear in the Photos section. **Pick from gallery**: select an existing gallery photo and link it to the recipe without re-uploading. Uploaded files are stored in the same `uploads/{userID}/` path as gallery photos.
- Data stored as JSON in three dedicated columns: `ingredients_json`, `method_json`, `variations_json`. Photo records stored in the `recipe_photos` table (migration 19). Legacy flat-text columns retained for backwards compatibility.
- Public recipe page renders grouped ingredients and method with section headings, displays variations below notes, and shows a masonry/grid photo layout below the description (1, 2, or 3 columns depending on photo count).

### Projects

- Showcase portfolio items with a title, short description, external link, cover image, and a rich long-form body.
- Per-project visibility toggle (public / private).
- Dashboard CRUD: create, edit, delete, publish/unpublish.
- **Rich editor**: the dashboard project editor uses the same Quill WYSIWYG editor as blog posts for the long-form body. Supports headings, lists, blockquotes, code blocks, inline images (upload or pick from gallery), and links.
- **Cover image**: pick from gallery (no direct upload to cover — upload to gallery first).
- **Linked blog posts**: select related blog posts to attach to a project. They appear as a "Related posts" section on the public project page.
- **Slug**: each project gets a URL-safe slug derived from the title on create. Regenerated when the title changes.
- **Public project list**: responsive card grid at `/u/{username}/projects`. Each card links to the individual project page. Clicking a card navigates to the detail view.
- **Public project detail**: `/u/{username}/projects/{slug}` — cover image (if set), title, short description, external link button, full rendered body HTML, and a "Related posts" section listing linked blog posts.
- Shown as a responsive grid on the user home page (up to 6 recent) and on a dedicated projects list page.
- Feature flag: enable or disable from the dashboard features page.
- DB: `body TEXT NOT NULL DEFAULT ''` (migration 24), `slug TEXT NOT NULL DEFAULT ''` (migration 25), `project_post_links` join table (migration 26).

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
- **Robustness**: the layout conversion guards against widgets missing a `layout` property (defaults to `{x:0, y:0, w:4, h:3}`) and against null or empty `contentId` values on content-linked widgets. API errors show an Alert instead of a blank screen.

### User profile

- Display name, bio, avatar upload.
- Up to 10 external links (label + URL).
- Per-user feature toggles: Blog, About, Gallery, Recipes, Projects.
- **Show on homepage toggle**: users can opt in or out of appearing on the Charlotte landing page user grid. The toggle is in the Profile form. Default is on (show). Stored in `show_on_homepage` column on the `users` table (migration 28). The public `GET /api/v1/users` endpoint only returns users with `show_on_homepage = 1`.
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
- **Nav font**: Playfair Display (display font), uppercase, bold. Size configurable via Appearance settings (10–20 px slider). The Account button matches this style in both ProfileLayout and SettingsLayout.
- **Nav item spacing**: 16 px gap between nav items (MUI `gap: 2`).
- Charlotte branding appears only in the footer.

---

## Appearance (per-user theme)

Each user can fully customise the visual style of their public pages from Dashboard → Appearance:

- **Accent colour**: HSL colour picker for light and dark mode.
- **Background colour**: HSL colour picker for light and dark mode.
- **Body text colour**: HSL colour picker for light and dark mode. Applied to `palette.text.primary` in the MUI theme.
- **Heading text colour**: HSL colour picker for light and dark mode. Applied to h1–h6 typography variants.
- **Body font**: serif and sans-serif options with font cards; supports any Google Fonts name via the "Other" field.
- **Heading / display font**: Playfair Display (default), Cormorant Garamond, EB Garamond, Libre Baskerville, DM Serif Display, Inter.
- **UI font**: used for menus, buttons, and labels (best kept as a sans-serif).
- **Base font size**: slider 12–22 px.
- **Nav label size**: slider 10–20 px.
- Colours are tabbed by mode (Light / Dark). Auto-saves 800 ms after the last change.
- Settings stored as JSON per user in `theme_json`.

Default theme: sage green accent, warm cream background, dark warm body text (HSL 220, 15, 20), near-black headings (HSL 220, 20, 10), Playfair Display display and body font, Inter UI font, 16 px base size, 13 px nav labels. Dark mode defaults: light grey body text (HSL 220, 15, 85), near-white headings (HSL 220, 10, 92).

## Site appearance (admin)

Admins can configure the landing page's theme from Admin → Appearance (`/admin/appearance`):

- Same controls as the per-user Appearance page (colour pickers, font cards, size sliders).
- Saves to `PUT /api/v1/admin/appearance` and reads from `GET /api/v1/admin/appearance`.
- Theme stored as `site_theme_json` in the `site_settings` table (migration 27). Returned under `site_theme` in `GET /api/v1/settings`.
- The landing page uses `site_theme` from the settings response; falls back to the built-in default if none is set.

Default site theme: deep burgundy accent (H=340, S=50, L=35), warm ivory background (H=38, S=30, L=97), near-black text (H=220, S=20, L=15). Dark mode: warm amber accent (H=36, S=70, L=58), deep blue-black background (H=222, S=22, L=11), warm off-white text. Playfair Display display and body font, Inter UI font.

---

## Dashboard

- Overview page with quick links and content counts.
- **Homepage builder**: drag-and-drop grid editor for the public home page (see above).
- Profile editor: display name, bio, avatar, external links, "Show my profile on the Charlotte homepage" toggle.
- Dashboard content area has 48 px (pb: 6) bottom padding so content never runs flush to the viewport edge.
- **Appearance editor**: accent colour, background colour, fonts, font size, nav label size (HSL sliders, live preview).
- Feature toggles: Blog, About, Gallery, Recipes, Projects.
- Blog manager: list, create, edit, delete posts; toggle visibility. Blog editor includes "Upload image" (uploads and inserts into body) and "Pick from gallery" (select an existing photo and insert).
- About page editor (Quill rich text editor).
- Gallery manager: upload photos, manage albums, set covers, toggle album visibility, set default album.
- Recipes manager: list, create, edit, delete recipes; add/delete variations; toggle visibility. Recipe photo section includes "Pick from gallery" to link an existing photo.
- Projects manager: list, create, edit, delete projects; toggle visibility. Project image can be picked from gallery.

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

- Typography: Playfair Display for all h1–h5 headings, nav labels, and body text by default; Inter for UI chrome. All configurable per user.
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
- About — `react-quill` WYSIWYG editor (same as blog and projects).
- Gallery — album CRUD, photo upload (multi-file), lightbox view, delete.
- Recipes — form editor with grouped ingredients and method steps (drag-to-reorder within each section), multiple sections per recipe, and named variations.
- Projects — card grid with inline create/edit forms.
- Homepage builder — `react-grid-layout` drag-and-resize canvas with widget palette sidebar.

### Admin

- Users table with approve, suspend, and delete actions.
- Content moderation with tabbed view across posts, photos, and recipes.
- Site settings form (site name, description, registration toggle).
- **Site Appearance**: full theme editor at `/admin/appearance` — same colour pickers, font cards, and size sliders as the user Appearance page. Saves the site-wide landing page theme. Auto-saves 800 ms after the last change.

### Build

```
cd frontend && npm install && npm run build
```

Output goes to `frontend/dist/`. The Go binary serves `frontend/dist/index.html` for all non-API routes (SPA catch-all) and `frontend/dist/assets/` for static assets.

---

## Landing page

- Spider-web themed design with subtle decorative SVG web overlays (opacity 0.06) positioned in the hero section corners.
- Applies the site theme from `GET /api/v1/settings` (`site_theme` field). Falls back to the built-in default if none is stored.
- Light/dark mode toggle (same sun/moon icon used in ProfileLayout); mode is persisted in `localStorage` as `charlotte_theme_mode`.
- Top bar: Charlotte logo (display font) on the left; light/dark toggle, Log in, and Register (if registration open) on the right; Dashboard if logged in.
- Hero: large display-font site name, italic tagline ("Some website. Radiant." — a nod to Charlotte's Web), optional site description, CTA buttons.
- User grid below hero: flat cards (no Paper elevation) with avatar, display name, username, and truncated bio. Links to `/u/{username}`. Only shows users with `show_on_homepage = 1`. When there is exactly one user, the card is centred. The "Meet the authors" overline label is not shown.
- Footer: "Charlotte" centred, divider line.

---

## User profile footer

- A "Charlotte" footer link appears at the bottom of every public user page (ProfileLayout), linking back to `/`. Styled `text.secondary`, underline-free, with a hover to `text.primary`.

---

## Planned / in progress

- [ ] Per-user colour scheme live preview on the public page (currently requires saving to see full effect).
- [ ] Recipe attempt journal entry UI in the dashboard (API endpoints exist).
