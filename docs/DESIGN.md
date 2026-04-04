# Charlotte — Design Reference

This document records all design decisions and preferences given during development.
Add to it whenever new feedback is given.

---

## Typography

Three distinct font roles:

| Role | Purpose | Default | Options |
|------|---------|---------|---------|
| **Display** | Headings (h1–h6) and nav labels | Playfair Display | Playfair Display, EB Garamond, Cormorant Garamond, Libre Baskerville, DM Serif Display |
| **Body** | Reading content (blog posts, recipes, about page) | Playfair Display | Same serifs as display, plus all sans-serif options |
| **UI** | Interface chrome: menus, buttons, dropdowns, sidebar, form labels | Inter | Inter, Lato, Source Sans 3, Nunito, Open Sans, Roboto |

Inspiration: claude.com — clean editorial serif for headings/content, modern sans-serif for UI elements.

All three fonts are configurable per user in Dashboard → Appearance.

---

## Nav bar

- **Single top nav only.** No secondary nav bars, no pill buttons, no profile header on section pages.
- **Background**: same as the page background (`background.default`). No colour change, no card/paper colour.
- **Separator**: a single 1 px bottom border (`divider` colour). No drop shadow, no elevation.
- **Horizontal padding**: comfortable padding on both sides (`px: { xs: 3, md: 6 }`). Name is not flush to the edge.
- **Logo**: user display name, links to home. Uses display font, bold.
- **Nav items**: right-aligned. Spacer between logo and nav links pushes them to the right.
- **Nav font**: display font, uppercase, bold, configurable size (10–20 px).
- **Dropdowns**: click to open, not hover. Close on outside click or Escape.
- **Nav order**: Home | Blog▾ | Projects▾ | Gallery▾ | Recipes▾ | About
- **Account icon**: top right, always visible when logged in. Dropdown: My Page, Dashboard, Admin (if admin), Log out.

---

## Colour defaults

- **Accent**: HSL(150, 20%, 63%) — muted sage green
- **Background**: HSL(35, 60%, 97%) — warm cream
- **Text**: dark warm (MUI default text.primary on the cream background)

All colours are configurable per user via HSL sliders in Dashboard → Appearance.

---

## Dashboard

- Same background and fonts as the user's public pages. Fully cohesive — not a separate visual style.
- No "Charlotte" branding in the sidebar header.
- No card/paper background blocks. Everything sits on the page background.
- Sections divided by thin lines, not boxes.
- Top bar: same as public nav — transparent background, 1 px bottom border only.
- Inspired by claude.com's clean minimal admin aesthetic.

---

## Colour picker

- Dashboard → Appearance uses a proper colour picker (MUI colour picker component) rather than raw HSL sliders.
- User can use a colour wheel or type values.
- Separate pickers for accent colour and background colour.
- HSL values are still stored internally.

---

## Gallery

- **Editorial / photography-first** aesthetic inspired by seantucker.photography/street.
- Album page: centred title in display font, muted photo count, optional italic description, thin divider, then grid.
- Photo grid: 3 columns, 3 px gap, **no rounded corners** anywhere in the gallery.
- Lightbox on photo click with keyboard navigation (arrow keys, Escape).
- Gallery home: album grid (no rounded corners) and recent photos grid.

---

## Dark / light mode

- Each user stores separate colour themes for light mode and dark mode.
- A sun/moon toggle appears in the top nav bar on all public pages.
- Visitors can also toggle — their preference is stored in `localStorage`.
- The toggle is also available in the dashboard nav.
- Appearance settings page has two tabs or a toggle: "Light mode" and "Dark mode", each with their own colour pickers.

---

## Font picker UI

- Font selection uses visual "Aa" cards (like Claude's chat font picker), not a dropdown list.
- Each card shows "Aa" rendered in that font, with the font name below.
- Selected card has a highlighted border (accent colour).
- An "Other" option opens a text field where the user can type any Google Font name.
- Typing in "Other" triggers a live preview: loads the font from Google Fonts and re-renders the "Aa" sample.
- Applies to all three font roles: display, body, UI.

---

## Account button in nav

- The account button in the top-right of the nav bar shows an icon and the word "Account" as a label.
- The dropdown menu is wide enough (min-width ~200px) so it does not overflow off the right edge.
- Anchored to the right so it opens to the left / downward and stays within the viewport.

---

## Dashboard layout

- The dashboard is NOT a separate shell with its own AppBar/Drawer. It is a normal page, just like Blog or Gallery.
- It uses the same top nav bar as public pages (same ProfileLayout or equivalent). Accessible via Account → Dashboard.
- Inside the page: two-column layout — narrow left nav list (section links: Profile, Appearance, Features, Blog, About, Gallery, Recipes, Projects, Admin) and wide right content area.
- This is exactly like Claude's settings page aesthetic.
- **Typography rule**: only the main section heading (e.g. "Profile", "Appearance") uses the display/serif font. Everything else — labels, descriptions, form fields, buttons, nav items — uses the UI/sans-serif font.
- No card/paper backgrounds. Dividers separate sections.
- Content has a comfortable max-width (~860px) in the right column.
- The left nav column is separated from content by a vertical line (divider), not a box.

---

## General

- No rounded corners on photo/gallery grids. Project cards may have rounded corners.
- Spacing follows an 8 px grid.
- Section pages (blog, gallery, recipes, projects, about) start with a clean serif section title — no avatar, no secondary identity block.
- Charlotte branding appears only in the footer of public pages.
