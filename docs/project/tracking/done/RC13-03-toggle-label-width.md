# RC13-03: Fix Published/Draft toggle label width shift

**Priority:** high
**Epic:** REVIEW-CYCLE-2026-04-05c

## Goal

Fix the layout shift caused by toggling between "Published" and "Draft" states. The
label changes length and causes the toggle switch to move horizontally.

## Background

Review finding H2: `BlogEdit.jsx`, `RecipeEdit.jsx`, and `Projects.jsx` all use a
`FormControlLabel` or similar with a text label that switches between "Published" (9
chars) and "Draft" (5 chars). The different lengths shift the surrounding layout.

Fix: give the label a fixed minimum width (e.g. `minWidth: '6rem'`) so the toggle
position stays constant regardless of the text shown.

Relevant files:
- `frontend/src/pages/dashboard/BlogEdit.jsx`
- `frontend/src/pages/dashboard/RecipeEdit.jsx`
- `frontend/src/pages/dashboard/Projects.jsx`

## Success Criteria

- [ ] Toggling published state on a blog post does not shift the position of the switch
- [ ] Same fix applied consistently in RecipeEdit and Projects pages
- [ ] The label text ("Published" / "Draft") is still readable and clearly visible
- [ ] Docker container rebuilds and runs cleanly after the change
- [ ] /update has been run after changes
