# RC13-01: Homepage card borders and album name display

**Priority:** medium
**Epic:** REVIEW-CYCLE-2026-04-05c

## Goal

Remove visible borders/outlines from homepage cards so they blend seamlessly into the
background. Also display the album name below the cover photo on homepage album widgets.

## Background

Review finding M1: `AlbumCard` in `GalleryHome.jsx` sets `borderRadius: 0`, making cards
visually inconsistent. User request: homepage cards should have no visible border and
album names should appear under the representative photo.

Relevant files:
- `frontend/src/pages/profile/GalleryHome.jsx` — public gallery page (AlbumCard component)
- `frontend/src/pages/dashboard/Homepage.jsx` — homepage widget builder (widget card rendering)

## Success Criteria

- [ ] Homepage widget cards have no visible border or box shadow that distinguishes them
      from the page background
- [ ] Album widget on homepage shows the album name in text below the cover image
- [ ] AlbumCard on the public gallery page uses consistent border radius (not hardcoded 0)
- [ ] No visual regressions on other card-based pages
- [ ] Docker container rebuilds and runs cleanly after the change
- [ ] /update has been run after changes
