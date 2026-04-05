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
- **Edit shortcut**: when the logged-in user views their own public blog post, a small edit icon button appears next to the title, linking directly to the dashboard editor for that post.
- **View page button**: the blog editor has a "View page" button next to Save that navigates to the public post page.
- **Table of contents**: posts with multiple headings get an auto-generated table of contents sidebar on the public page. The active section highlights as you scroll.

### About page

- Single rich-text document rendered as a public about page. Edited via the `react-quill` WYSIWYG editor in the dashboard.
- **Inline editing**: owner can click Edit on the public about page and save directly.

### Gallery

- Upload photos (JPEG, PNG, WebP, GIF) up to 10 MB each; up to 20 files per batch. Width and height are recorded on upload for all formats including WebP (RC-10).
- Photos belong to albums. A default album named "Uploads" is created automatically for unassigned photos.
- **Default album**: one album per user is marked as the default upload destination (star badge in the dashboard). When auto-created, this album is named "Uploads". Photos uploaded via blog image upload, or any upload that does not specify an album, go into this album. Set any album as default using the star button on the album card or inside the album view. The first album created for a user is automatically marked as the default. Migration 23.
- Per-album visibility toggle (public / private). Toggle from the album card or the album view header (eye icon). Unpublished albums are hidden from the public gallery. The album card in the dashboard shows only the eye toggle icon to indicate publish status — no "Unpublished" chip is shown.
- Album cover photo: set automatically on first upload; can be changed manually.
- **Gallery home**: single top nav only, then a "Gallery" section title, album grid (no rounded corners) and a recent photos grid. Only top-level albums (no parent) appear here.
- **Album page**: editorial, photography-first layout inspired by Sean Tucker's style. Centred title in the display font, muted photo count, optional italic description, then a full-width masonry photo grid (3 columns on desktop, 2 on tablet ≤900 px, 1 on mobile ≤600 px) with 10 px gap, original aspect ratios preserved, and no rounded corners. Back link at the bottom.
- Albums listed as direct links in the Gallery nav dropdown.
- **Lightbox**: click any photo to view full-size with prev/next navigation and keyboard support (arrow keys, Escape).
- **Sub-albums**: albums can be nested one level deep. Create a sub-album from inside an album's dashboard view using the "Sub-album" button. Sub-albums do not appear on the gallery home page.
- **Many-to-many photo membership**: a photo can belong to multiple albums simultaneously. In the dashboard album view, use "Add existing" to pick any of your photos and add them to the current album without re-uploading. Photos are stored once in `photos`; membership tracked in the `album_photos` join table (migrations 20–22).
- **Safe album deletion** (RC-01): when an album is deleted, any photo that still belongs to another album is re-homed rather than destroyed. Only photos exclusively in the deleted album have their files and DB rows removed. The join-table entries for the deleted album are always cleared.
- **Remove from album**: each photo in the dashboard album view has a "Remove from album" action that removes it from the album without deleting the file.
- **Dashboard album view tabs**: when an album has sub-albums, pill buttons appear at the top — "This album" (current album only), "All (inc. sub-albums)" (union of all photos), and one button per sub-album (navigates to that album). Each sub-album pill has a star icon button: filled star = current default landing view; outline star = click to set as default. Clicking the filled star clears the default.
- **Default sub-album**: a parent album can designate one sub-album as its default landing view. When a visitor navigates to the parent album URL, the page automatically redirects to the default sub-album instead. Set via the star icon button next to each sub-album pill in the dashboard album view. Stored as `default_child_id` on the `gallery_albums` table (migration 32). API: `PATCH /api/v1/dashboard/gallery/albums/{id}/default-child` with body `{"child_id": 123}` or `{"child_id": null}` to clear. The `default_child_id` and `default_child_slug` fields are included in all album JSON responses.
- **Public album navigation**: when a public album has sub-albums, pill buttons appear below the album header — "All" (default, shows all photos across this album and sub-albums), the parent album name, and one button per sub-album.
- **Nav dropdown fix**: the Gallery dropdown in the nav bar only shows top-level albums. Sub-albums no longer appear in the dropdown.
- **Edit shortcut**: when the logged-in user views their own public gallery home or album page, a small edit icon button links to the dashboard gallery.
- **Album thumbnail fallback**: if an album has no explicit cover photo set, the public gallery home page shows the first photo in the album as the thumbnail instead of a blank card. The API returns a `cover_url` field on each album that resolves this automatically.
- **Centred album titles**: on the public gallery home page, each album card shows the cover image filling the card, with the album title and photo count centred below. Cards have no border or elevation and blend into the background.

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
- **Step timers**: each method step and method group can have an optional timer duration set in the recipe editor using a compact "m:ss" field. On the public recipe page, steps and sections with a timer show a chip button. Clicking it starts a countdown. The active timer displays in a sticky bar below the recipe title, showing the step name and remaining time. Controls: Reset, +30s, +1 min. The bar turns red when the timer expires. Multiple timers can run simultaneously; the most recently started is shown in the bar. Timer state is in-memory only — not persisted.
- **Bottom whitespace**: extra padding below the last section in the recipe editor for breathing room at the bottom of long forms.
- **View page button**: the recipe editor has a "View page" button next to Save that navigates to the public recipe page.

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
- **Table of contents**: project pages with multiple headings get an auto-generated table of contents sidebar. The active section highlights as you scroll.
- **Edit shortcut**: when the logged-in user views their own public project page or project list, a small edit icon button links to the dashboard projects page.
- **View page button**: the project editor has a "View page" button next to Save that navigates to the public project page.
- Shown as a responsive grid on the user home page (up to 6 recent) and on a dedicated projects list page.
- Feature flag: enable or disable from the dashboard features page.
- DB: `body TEXT NOT NULL DEFAULT ''` (migration 24), `slug TEXT NOT NULL DEFAULT ''` (migration 25), `project_post_links` join table (migration 26).

### Custom pages

Users can create one-off pages that sit outside the main feature set (blog, gallery, etc.). Each page has a kind, a slug, a title, and a publish toggle.

**Kinds** (registered in `internal/models/custom_page_kinds.go`):

| Kind | Format | Default slug |
|------|--------|-------------|
| now | freeform | now |
| uses | freeform | uses |
| faq | structured | faq |
| books | list | books |
| movies | list | movies |
| games | list | games |
| travel | list | travel |
| bucketlist | list | bucket-list |
| resume | structured | resume |
| event | structured | event |

**Formats:**
- `freeform` — rich-text body rendered as HTML via the existing `renderContent` helper.
- `list` — a table of entries. Each entry has: title, subtitle, rating, status, entry_date, and a `fields_json` blob for kind-specific columns (defined by `ListColumns` in the kind registry).
- `structured` — reserved for future templated layouts.

**DB tables:** `custom_pages` and `custom_page_entries` (migrations 33). Cascade-delete ensures entries are removed when a page is deleted.

**Nav pin:** each page has a `nav_pinned` boolean (migration 34, `ALTER TABLE custom_pages ADD COLUMN nav_pinned INTEGER NOT NULL DEFAULT 0`). When true the page appears as a direct top-level nav button; when false it goes into the dropdown. Toggle from the pages list (pin icon column) or the page editor (pin switch in the header). The global `custom_nav_mode` setting still controls the dropdown label.

**User nav settings:** two new columns on `users` — `custom_nav_mode` (`grouped` | `individual`, default `grouped`) and `custom_nav_group_label` (default `More`). Updated via `PUT /api/v1/dashboard/custom-pages/nav`.

**Dashboard API** (all under `/api/v1/dashboard/custom-pages`):

| Method | Path | Handler |
|--------|------|---------|
| GET | `/` | `DashCustomPageList` — list pages + nav settings |
| GET | `/kinds` | `DashCustomPageKinds` — kind registry |
| POST | `/` | `DashCustomPageCreate` — create page |
| PUT | `/nav` | `DashCustomNav` — update nav mode/label |
| GET | `/{id}` | `DashCustomPageGet` — page + entries + kind_def |
| PUT | `/{id}` | `DashCustomPageUpdate` — edit page fields |
| PATCH | `/{id}/toggle` | `DashCustomPageToggle` — flip published |
| DELETE | `/{id}` | `DashCustomPageDelete` — delete page |
| POST | `/{id}/entries` | `DashEntryCreate` — add list entry |
| PUT | `/{id}/entries/{eid}` | `DashEntryUpdate` — edit list entry |
| DELETE | `/{id}/entries/{eid}` | `DashEntryDelete` — delete list entry |

**Public API:** `GET /api/v1/u/{username}/pages/{slug}` — returns the page, entries (for list format), kind_def, and rendered body HTML (for freeform). Returns 404 for unpublished pages.

**Profile API:** `GET /api/v1/u/{username}` now includes `custom_pages` (published-only for public visitors, all for the owner) and `custom_nav` (mode + label).

**Slug sanitisation:** slugs are cleaned through `slug.Make` (the existing slug package) on create and update.

### Homepage grid builder

- Each user has a fully customisable homepage at `/u/{username}/` built from a free-form widget grid.
- **Dashboard editor** at `/dashboard/homepage`: left panel lists available widget types (Profile card, Text block, Link, Blog post, Photo, Album, Recipe, Project). Clicking "Add" places a widget on the canvas.
- **Canvas**: 12-column grid with 80 px row height. Drag widgets by their top handle strip; resize via the bottom-right handle. Layout auto-compacts vertically.
- **Auto-save**: changes debounce for 1 second and then save silently to `PUT /api/v1/dashboard/homepage`.
- **Content-linked widgets** (blog post, photo, album, recipe, project): a picker dialog lists all available items so the user can choose which one to pin.
- **Text widget**: a dialog with a ReactQuill rich-text editor (bold, italic, bullet list, ordered list, link). Content is stored as HTML and rendered as HTML on the public page.
- **Link widget**: a dialog accepts a URL and optional label; renders as a clickable card.
- **Profile widget**: displays the user's avatar, display name, and bio snippet.
- **Public renderer**: if the user has at least one widget, the home page renders the custom grid (non-draggable, non-resizable). If no widgets are set, the default layout (recent posts) is shown as a fallback.
- **Homepage card style**: widget cards on the public homepage have no visible border, no background, and no colour strip — they blend seamlessly into the page background. The dashboard editor retains the coloured accent strip for identification.
- **Album widget label**: album widgets on the public homepage display the album name as a text label below the cover photo.
- **Album widget fix**: the public profile endpoint now returns all albums (not just top-level) so sub-albums pinned as widgets are resolved correctly.
- Widget layout stored as JSON in the `homepage_json` column of the `users` table. Included in the `GET /api/v1/u/{username}` response under the `homepage` key.
- **Robustness**: the layout conversion guards against widgets missing a `layout` property (defaults to `{x:0, y:0, w:4, h:3}`) and against null or empty `contentId` values on content-linked widgets. API errors show an Alert instead of a blank screen.

### User profile

- Display name, bio, avatar upload.
- Up to 10 external links (label + URL).
- Per-user feature toggles: Blog, About, Gallery, Recipes, Projects.
- **Show on homepage toggle**: users can opt in or out of appearing on the Charlotte landing page user grid. The toggle is in the Profile form. Default is on (show). Stored in `show_on_homepage` column on the `users` table (migration 28). The public `GET /api/v1/users` endpoint only returns users with `show_on_homepage = 1`.
- **Live avatar update**: after a successful avatar upload, the dashboard nav bar refreshes its profile data immediately without requiring a page reload.
- **Email optional with proper validation** (RC-11): email is optional at registration and on the profile page. A blank email is accepted. If a non-blank email is provided, it must match `^[^@\s]+@[^@\s]+\.[^@\s]{2,}$` (two-or-more character TLD required, no whitespace). The same validation applies on the profile update endpoint.
- **Email verification** (RC-11, RC12-01): the Profile page shows the email address with a "Verify email" button when the address is not yet verified, or a green "Verified" chip when it is. Clicking "Verify email" calls `POST /api/v1/dashboard/send-verification`, which emails a link to `GET /api/v1/verify-email?token=TOKEN`. The link sets `email_verified = 1` and redirects to `/dashboard/profile?verified=1`, where a snackbar confirms success. If SMTP is not configured (`CHARLOTTE_SMTP_HOST` unset), the endpoint returns a clear "SMTP is not configured on this server" error. Changing the email address resets verification. Verification tokens expire after 24 hours. The verification link is absolute when `CHARLOTTE_BASE_URL` is set; a warning is logged if it is not. Blank email is stored as NULL (not empty string) so multiple users can register without an email. DB: `email_verified INTEGER NOT NULL DEFAULT 0`, `email_verify_token TEXT`, `email_verify_token_expires_at INTEGER` on the `users` table (migrations 29–31). SMTP configured via env vars: `CHARLOTTE_SMTP_HOST`, `CHARLOTTE_SMTP_PORT` (default 587), `CHARLOTTE_SMTP_USER`, `CHARLOTTE_SMTP_PASS`, `CHARLOTTE_SMTP_FROM`.
- **All features enabled by default** (RC12-02): newly registered users have Blog, About, Gallery, Recipes, and Projects all enabled. No manual toggle required after registration.

---

## Navigation (user pages)

User public pages have **one nav bar only** — the sticky white top nav. No secondary nav bars or profile headers appear on section pages (blog, gallery, recipes, projects, about).

- **Logo**: user's display name, links to their home page.
- **Default nav order**: Home | Blog ▾ | Projects ▾ | Gallery ▾ | Recipes ▾ | About (configurable, see below).
- **Blog dropdown**: up to 5 most recent published posts, or pinned items if configured + "See all posts →".
- **Projects dropdown**: up to 5 most recent published projects, or pinned items if configured.
- **Gallery dropdown**: all top-level published albums, or pinned items if configured + "See all →".
- **Recipes dropdown**: up to 5 most recent published recipes, or pinned items if configured + "See all →".
- **About**: plain link, no dropdown.

### Nav configuration

Dashboard → Navigation (`/dashboard/nav-config`) lets users customise the top nav:

- **Reorder sections**: use ↑/↓ buttons to change the order of Home, About, Blog, Projects, Gallery, Recipes, and Custom pages in the nav bar.
- **Pin items**: for each dropdown section (Blog, Projects, Gallery, Recipes), open the picker to select specific items to pin. Pinned items appear in the dropdown instead of the default recent content. Up to 8 items can be pinned per section. If no items are pinned for a section, the nav falls back to showing the 5 most recent items.
- **Custom pages nav mode**: choose between showing custom pages as individual top-level nav items or grouped under a configurable dropdown label (e.g. "More"). Set the group label in the nav settings.
- **Reorder custom pages**: change the order in which custom pages appear in the nav.
- Changes save automatically after each action.
- Config stored as JSON in the `nav_config` column on the `users` table, returned as `nav_config` in `GET /api/v1/u/{username}`.
- API: `GET /api/v1/dashboard/nav-config` returns the config string and available content lists; `PUT /api/v1/dashboard/nav-config` accepts `{ "nav_config": "...JSON string..." }`.
- **Account icon** (top right, all logged-in users): dropdown with My Page, Dashboard, Admin (if applicable), Log out.
- **Search button**: magnifying-glass icon button in the navbar (to the left of the dark/light toggle). Clicking it opens the search modal. Keyboard shortcut: Ctrl+K (or Cmd+K on macOS).
- **Search modal**: full-screen dimmed overlay with a centred search box at the top and live results below. Results are grouped by type (Blog, Project, Recipe, Album) and shown as a scrollable list. Keyboard navigation: arrow keys move the selection, Enter follows the selected result, Escape closes the modal. Results are fetched from `GET /api/v1/u/{username}/search?q=...` with a 300 ms debounce. Only searches published content. Minimum query length: 2 characters.
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
- Blog manager: list, create, edit, delete posts; toggle visibility. Blog editor includes "Upload image" (uploads and inserts into body) and "Pick from gallery" (select an existing photo and insert). The Published/Draft toggle label has a fixed minimum width so the switch does not shift position when toggled. The same fixed-width label is applied in the Recipe and Projects editors.
- About page editor (Quill rich text editor).
- Gallery manager: upload photos, manage albums, set covers, toggle album visibility, set default album.
- Recipes manager: list, create, edit, delete recipes; add/delete variations; toggle visibility. Recipe photo section includes "Pick from gallery" to link an existing photo.
- Projects manager: list, create, edit, delete projects; toggle visibility. Project image can be picked from gallery.
- **View page button**: the blog post editor, recipe editor, and project editor each show a "View page" button next to Save. Clicking it opens the published public page for that content in a new tab.
- **Edit button on public pages**: when logged in and viewing your own content (blog posts, recipes, gallery, projects), an "Edit" button appears on the page. Clicking it takes you directly to the dashboard editor for that content.

---

## Admin panel

- User management: approve, suspend, delete accounts.
- Content moderation: view and delete any post, photo, or recipe.
- Site settings: site name, registration open/closed, site description.
- **Appearance link**: the admin sidebar navigation includes an "Appearance" link to `/admin/appearance`.

---

## Authentication and security

- bcrypt passwords (cost 12).
- Session tokens (32-byte random, HttpOnly secure cookie, 30-day TTL).
- CSRF tokens on all POST forms (GET routes for forms must also run CSRF middleware).
- **CSRF token lifecycle** (RC-05): the CSRF cookie is regenerated on every login, binding a fresh token to each new session. On logout, the CSRF cookie is cleared. This prevents token reuse across sessions and across different users on the same browser.
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

### Update scripts

Two helper scripts are provided for keeping a deployment up to date:

- **`scripts/update-latest.sh`**: pulls the latest `main` branch, runs the test suite, then rebuilds the Docker image.
- **`scripts/update-release.sh`**: checks out the latest tagged release, runs the test suite, then rebuilds the Docker image.

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

- Spider-web themed design with subtle decorative SVG web overlays (opacity 0.06) positioned in the hero section corners. The `SpiderWeb` component lives at `frontend/src/components/SpiderWeb.jsx` and is shared with the login and register pages.
- Applies the site theme from `GET /api/v1/settings` (`site_theme` field). Falls back to the built-in default if none is stored.
- Light/dark mode toggle (same sun/moon icon used in ProfileLayout); mode is persisted in `localStorage` as `charlotte_theme_mode`.
- Top bar: Charlotte logo (display font) on the left; light/dark toggle, Log in, and Register (if registration open) on the right; Dashboard if logged in.
- Hero: large display-font site name, italic tagline ("Some website. Radiant." — a nod to Charlotte's Web), optional site description, CTA buttons.
- User grid below hero: flat cards (no Paper elevation) with avatar, display name, username, and truncated bio. Links to `/u/{username}`. Only shows users with `show_on_homepage = 1`. When there is exactly one user, the card is centred. The "Meet the authors" overline label is not shown.
- Footer: "Charlotte" centred, divider line.

## Login and register pages

- Both pages match the landing page visual style: same `ThemeModeProvider` + `ThemeProvider` wrapping with `buildProfileTheme` and `DEFAULT_SITE_THEME`, same AppBar (Charlotte logo on the left, light/dark toggle on the right), and the same `SpiderWeb` decorative SVG overlays in the background corners.
- Background uses the site theme colours (warm beige in light mode, deep blue-dark in dark mode).
- The form sits centred on the page with no Paper card — clean text fields, a contained submit button, and a plain footer link.
- Login form: Username, Password, submit button, "No account? Register" link.
- Register form: Username (with helper text), Email, Password, submit button, "Already have an account? Log in" link. Registration-closed state is also styled consistently (no Paper card).
- Auth logic is unchanged; only the presentation changed.

---

## User profile footer

- A "Charlotte" footer link appears at the bottom of every public user page (ProfileLayout), linking back to `/`. Styled `text.secondary`, underline-free, with a hover to `text.primary`.

---

## Testing

A manual regression checklist lives at `docs/project/tracking/BEHAVIOURS.md`. It covers key user-visible behaviours across the platform and should be run before each release.

The automated test suite covers all model functions and API handlers. Tests use a real in-memory SQLite database, not mocks. As of the current release, the suite contains 201 tests.

---

## Planned / in progress

- [ ] Per-user colour scheme live preview on the public page (currently requires saving to see full effect).
- [ ] Recipe attempt journal entry UI in the dashboard (API endpoints exist).
