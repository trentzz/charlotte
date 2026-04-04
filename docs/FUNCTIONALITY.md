# Charlotte — Functionality Checklist

This document lists every piece of functionality the platform should support. Use it for manual testing, regression checks, and tracking what is built vs. what is planned.

Status: **[x]** = implemented and tested, **[ ]** = planned or not yet built.

---

## Authentication

- [x] Register with username, email, and password
- [x] First registered user is automatically made admin (no approval needed)
- [x] Subsequent users require admin approval before they can log in (status defaults to `pending`)
- [x] Login with username or email + password
- [x] Logout invalidates session cookie
- [x] Session persists across page refreshes (HttpOnly session cookie, 30-day TTL)
- [x] Unauthenticated requests to protected endpoints return `401`
- [x] CSRF token issued via `GET /api/v1/auth/csrf`, readable from `charlotte_csrf` cookie
- [x] CSRF token required on all mutating requests (POST, PUT, DELETE)
- [x] Rate limiting on login and register endpoints
- [x] Passwords hashed with bcrypt (cost 12)
- [x] `GET /api/v1/auth/me` returns current user or `401`
- [ ] Password change from dashboard profile page
- [ ] Email verification on registration

---

## Public pages — landing and auth

- [x] Landing page at `/` (public, no login required)
- [x] Login page at `/login`
- [x] Register page at `/register`
- [x] Unauthenticated visitors can view all public user pages
- [x] Authenticated visitors see account icon in profile nav bar

---

## Public pages — user profile

All routes under `/u/:username/`. These use the per-user MUI theme.

### User home (`/u/:username/`)

- [x] Displays user display name and bio
- [x] Shows avatar if set
- [x] Shows external links (up to 10)
- [x] Shows up to 6 recent published projects as a card grid
- [x] Shows up to 5 recent published blog posts
- [x] Shows up to 6 recent photos in a photo grid
- [x] Shows up to 5 recent published recipes
- [x] Sections hidden if the corresponding feature is disabled
- [x] Returns `404`-equivalent if username does not exist

### Blog index (`/u/:username/blog`)

- [x] Lists all published posts (title, date, excerpt)
- [x] Owner can see unpublished (draft) posts
- [x] Clicking a post title navigates to the post page

### Blog post (`/u/:username/blog/:slug`)

- [x] Renders post body as HTML (Markdown rendered server-side via goldmark)
- [x] Shows tags
- [x] Shows created date
- [x] Owner sees draft posts; non-owner gets an error for drafts
- [ ] Inline editing: owner sees an Edit button; saves directly without going to the dashboard

### About page (`/u/:username/about`)

- [x] Renders Markdown content as HTML
- [x] Empty state when no content has been saved
- [ ] Inline editing: owner sees an Edit button; saves directly

### Gallery home (`/u/:username/gallery`)

- [x] Lists all published albums as a grid (no rounded corners)
- [x] Shows album cover photo and title
- [x] Shows a recent photos grid below the albums
- [x] Owner sees unpublished albums

### Gallery album (`/u/:username/gallery/:album`)

- [x] Shows album title, description, photo count
- [x] Displays all photos in a 3-column grid with 3 px gap, no rounded corners
- [x] Photos clickable to open lightbox
- [x] Owner sees photos in unpublished albums

### Recipes index (`/u/:username/recipes`)

- [x] Lists all published recipes (title, description)
- [x] Owner sees unpublished recipes
- [x] Clicking a recipe title navigates to the recipe page

### Recipe post (`/u/:username/recipes/:slug`)

- [x] Shows recipe title, description, ingredients, and method steps
- [x] Owner sees unpublished recipes
- [ ] Inline editing: owner sees an Edit button; saves directly
- [ ] Variation journal entries displayed on recipe page

### Projects (`/u/:username/projects`)

- [x] Displays all published projects as a card grid (title, description, link, optional image)
- [x] Owner sees unpublished projects

---

## Lightbox

- [x] Opens on clicking any photo in a gallery album (public and dashboard)
- [x] Shows full-size photo
- [x] Previous / next navigation via arrow buttons
- [x] Keyboard navigation: left/right arrow keys, Escape to close
- [x] Close button

---

## Navigation — public pages (ProfileLayout)

- [x] Sticky top AppBar with user display name as logo link to `/u/:username/`
- [x] Blog dropdown (click to open): up to 5 recent posts + "See all posts →"
- [x] Projects dropdown: up to 5 recent projects + "See all →"
- [x] Gallery dropdown: all published albums + "See all →"
- [x] Recipes dropdown: up to 5 recent recipes + "See all →"
- [x] About: plain nav button, no dropdown
- [x] Dropdowns open on click, close on outside click or item selection
- [x] Nav items hidden if the corresponding feature is disabled
- [x] Nav labels use display font (configurable), uppercase, bold
- [x] Account icon (top right) for logged-in users: My Page, Dashboard, Admin (if admin), Log out
- [x] Content area has `maxWidth: 1200` and centred with horizontal padding
- [x] Toolbar has `maxWidth: 1200` inner container for ultrawide screens

---

## Dashboard

Requires authentication. Routes under `/dashboard/`.

### Layout (DashboardLayout)

- [x] Persistent sidebar on desktop, temporary drawer on mobile
- [x] Mobile: hamburger menu icon in AppBar, user's display name shown in AppBar
- [x] Desktop: sidebar visible, AppBar shows nothing (no duplicate name)
- [x] Sidebar sections: Dashboard (Overview, Profile, Appearance, Features) and Content (Blog, About, Gallery, Recipes, Projects)
- [x] Admin section in sidebar (visible to admins only): Users, Content, Settings
- [x] Account icon in AppBar: My Page, Log out
- [x] Active nav item highlighted with accent-colour left border
- [x] Content area has `maxWidth: 900` and centred

### Overview (`/dashboard`)

- [x] Quick links to each section
- [x] Content counts (posts, albums, photos, recipes, projects)

### Profile (`/dashboard/profile`)

- [x] Edit display name and bio
- [x] Edit external links (add, reorder, delete; up to 10)
- [x] Avatar upload
- [x] Save button sends `PUT /api/v1/dashboard/profile`

### Appearance (`/dashboard/appearance`)

- [x] Accent colour HSL sliders (hue 0–360, saturation 0–100, lightness 0–100)
- [x] Background colour HSL sliders
- [x] Body font selector (serif and sans-serif groups)
- [x] Display/heading font selector
- [x] UI font selector
- [x] Base font size slider (12–22 px)
- [x] Nav label size slider (10–20 px)
- [x] Live preview swatch for accent and background colours
- [x] Save button sends `PUT /api/v1/dashboard/appearance`

### Features (`/dashboard/features`)

- [x] Toggle switches for: Blog, About, Gallery, Recipes, Projects
- [x] Save button sends `PUT /api/v1/dashboard/features`
- [x] Disabled features are hidden from the user's public nav and pages

### Blog (`/dashboard/blog`)

- [x] Table of all posts (title, status, date)
- [x] Create new post button → navigates to `/dashboard/blog/new`
- [x] Edit post button → navigates to `/dashboard/blog/:id`
- [x] Delete post with confirmation
- [x] Toggle published/draft

### Blog editor (`/dashboard/blog/:id`)

- [x] Title field
- [x] Body field (Markdown textarea or rich text editor)
- [x] Tags field (comma-separated)
- [x] Publish toggle
- [x] Save sends `PUT /api/v1/dashboard/blog/:id`
- [x] New post: save sends `POST /api/v1/dashboard/blog`

### About editor (`/dashboard/about`)

- [x] Markdown textarea for about page content
- [x] Save sends `PUT /api/v1/dashboard/about`
- [x] Preview rendered HTML shown below the editor

### Gallery (`/dashboard/gallery`)

- [x] List of albums with photo count and cover photo
- [x] Create album button (title, optional description, published toggle)
- [x] Click album → navigates to `/dashboard/gallery/albums/:id`
- [x] Delete album with confirmation
- [x] Toggle album published/unpublished

### Album view (`/dashboard/gallery/albums/:id`)

- [x] Shows album title and all photos in 3-column grid
- [x] Multi-file upload button (up to 20 files, JPEG/PNG/WebP/GIF, max 10 MB each)
- [x] Upload sends `POST /api/v1/dashboard/gallery/photos` as multipart form
- [x] CSRF token attached automatically via Axios interceptor (no manual `Content-Type` override)
- [x] Response parsed as `res.data.uploaded` after interceptor unwraps `{data: {...}}`
- [x] Hover over photo shows delete button
- [x] Delete photo with confirmation dialog
- [x] Back link to albums list
- [x] Lightbox on photo click

### Recipes (`/dashboard/recipes`)

- [x] Table of all recipes (title, status, date)
- [x] Create recipe button → navigates to `/dashboard/recipes/new`
- [x] Edit recipe → navigates to `/dashboard/recipes/:id`
- [x] Delete recipe with confirmation
- [x] Toggle published/unpublished

### Recipe editor (`/dashboard/recipes/:id`)

- [x] Title, description, ingredients (plain text), steps (plain text) fields
- [x] Publish toggle
- [x] Save sends `PUT /api/v1/dashboard/recipes/:id` or `POST /api/v1/dashboard/recipes`
- [ ] Variation journal UI: add named variation with notes; list existing variations; delete variation

### Projects (`/dashboard/projects`)

- [x] List of all projects (title, description, link, status)
- [x] Create project form (inline or modal): title, description, URL, published toggle
- [x] Edit project
- [x] Delete project with confirmation
- [x] Toggle published/unpublished
- [ ] Project image upload from dashboard

---

## Admin panel

Routes under `/admin/`, visible in sidebar to admin users only.

### Users (`/admin/users`)

- [x] Table of all users (username, email, role, status)
- [x] Approve pending users
- [x] Suspend active users
- [x] Delete users
- [ ] Promote/demote admin role

### Content moderation (`/admin/content`)

- [x] Tabbed view: Posts, Photos, Recipes
- [x] View any user's content
- [x] Delete any post, photo, or recipe

### Site settings (`/admin/settings`)

- [x] Site name
- [x] Site description
- [x] Toggle registration open/closed
- [x] Save sends `PUT /api/v1/admin/settings`

---

## Photo upload

- [x] Accepts JPEG, PNG, WebP, GIF
- [x] Max 10 MB per file
- [x] Max 20 files per batch
- [x] MIME type validated server-side (sniffed, not just extension)
- [x] Files stored under `/data/uploads/:userID/` with random filename
- [x] URL returned in upload response for immediate display
- [x] Photo dimensions stored (width, height)
- [x] Album cover updated automatically on first upload
- [x] Path traversal prevention on file serving

---

## Theme system

- [x] Per-user theme stored as JSON (HSL accent, HSL background, font families, font sizes)
- [x] `buildProfileTheme.js` converts stored theme to MUI `createTheme()` call
- [x] Display font applied to h1–h6
- [x] Body font applied to `body1`, `body2` typography variants
- [x] UI font applied to base `fontFamily` plus `subtitle1`, `subtitle2`, `caption`, `overline`, `button`
- [x] Dashboard uses the logged-in user's own theme
- [x] Public pages use the profile owner's theme

---

## Inline editing (planned — not yet built)

- [ ] Blog post: owner sees Edit button on public page; can edit and save without leaving the page
- [ ] About page: owner sees Edit button; can edit markdown inline and save
- [ ] Recipe: owner sees Edit button; can edit and save inline

The API already returns `is_owner: true` on blog, gallery, recipes, and projects public endpoints when the viewer is the owner. Frontend profile pages do not yet consume this field.

---

## API summary

All endpoints are under `/api/v1/`. All responses are JSON wrapped as `{"data": <payload>}` on success or `{"error": "<message>"}` on failure.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/auth/csrf` | — | Issue CSRF token |
| POST | `/auth/register` | — | Register new user |
| POST | `/auth/login` | — | Log in |
| POST | `/auth/logout` | session | Log out |
| GET | `/auth/me` | session | Current user info |
| GET | `/u/:username` | optional | Public profile + nav data |
| GET | `/u/:username/blog` | optional | Blog post list |
| GET | `/u/:username/blog/:slug` | optional | Single blog post |
| GET | `/u/:username/about` | optional | About page content |
| GET | `/u/:username/gallery` | optional | Album list + recent photos |
| GET | `/u/:username/gallery/:slug` | optional | Album + photo list |
| GET | `/u/:username/recipes` | optional | Recipe list |
| GET | `/u/:username/recipes/:slug` | optional | Single recipe |
| GET | `/u/:username/projects` | optional | Projects list |
| GET | `/dashboard/profile` | session | Own profile |
| PUT | `/dashboard/profile` | session | Update profile |
| GET | `/dashboard/appearance` | session | Own theme |
| PUT | `/dashboard/appearance` | session | Update theme |
| GET | `/dashboard/features` | session | Feature flags |
| PUT | `/dashboard/features` | session | Update feature flags |
| GET | `/dashboard/about` | session | About content |
| PUT | `/dashboard/about` | session | Save about content |
| GET | `/dashboard/blog` | session | Own post list |
| POST | `/dashboard/blog` | session | Create post |
| GET | `/dashboard/blog/:id` | session | Single post |
| PUT | `/dashboard/blog/:id` | session | Update post |
| DELETE | `/dashboard/blog/:id` | session | Delete post |
| GET | `/dashboard/gallery` | session | Album list |
| POST | `/dashboard/gallery/albums` | session | Create album |
| GET | `/dashboard/gallery/albums/:id` | session | Album + photos |
| PUT | `/dashboard/gallery/albums/:id` | session | Update album |
| DELETE | `/dashboard/gallery/albums/:id` | session | Delete album |
| POST | `/dashboard/gallery/photos` | session | Upload photos (multipart) |
| DELETE | `/dashboard/gallery/photos/:id` | session | Delete photo |
| GET | `/dashboard/recipes` | session | Recipe list |
| POST | `/dashboard/recipes` | session | Create recipe |
| GET | `/dashboard/recipes/:id` | session | Single recipe |
| PUT | `/dashboard/recipes/:id` | session | Update recipe |
| DELETE | `/dashboard/recipes/:id` | session | Delete recipe |
| GET | `/dashboard/projects` | session | Project list |
| POST | `/dashboard/projects` | session | Create project |
| PUT | `/dashboard/projects/:id` | session | Update project |
| DELETE | `/dashboard/projects/:id` | session | Delete project |
| GET | `/admin/users` | admin | All users |
| PUT | `/admin/users/:id` | admin | Update user (approve/suspend/delete) |
| GET | `/admin/content` | admin | All content |
| DELETE | `/admin/content/:type/:id` | admin | Delete any content |
| GET | `/admin/settings` | admin | Site settings |
| PUT | `/admin/settings` | admin | Update site settings |
