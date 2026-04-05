# RC13-02: Remove "Unpublished" text label from gallery dashboard

**Priority:** medium
**Epic:** REVIEW-CYCLE-2026-04-05c

## Goal

Remove the "Unpublished" chip/text label from gallery album cards in the dashboard.
The visibility toggle icon is sufficient — the extra text label is redundant and
clutters the card header.

## Background

Review finding H3: the gallery dashboard renders an `<Chip label="Unpublished" />` on
album cards. The user wants only the toggle icon (VisibilityIcon / VisibilityOffIcon)
and no text label. Check all dashboard content types that show an "unpublished" text
label and remove them.

Relevant file:
- `frontend/src/pages/dashboard/Gallery.jsx` — renders the Unpublished chip

## Success Criteria

- [ ] The "Unpublished" chip/text is removed from gallery album cards in the dashboard
- [ ] The visibility toggle icon remains and functions correctly
- [ ] No other dashboard pages regressed (check Blog, Recipes, Projects for similar patterns)
- [ ] Docker container rebuilds and runs cleanly after the change
- [ ] /update has been run after changes
