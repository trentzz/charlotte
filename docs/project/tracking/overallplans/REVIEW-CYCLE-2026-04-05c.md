# Review Cycle 2026-04-05c (UI/UX polish + admin nav)

## Summary

User-requested UI fixes and review findings from third review pass. Focus on homepage
card styling, dashboard toggle behaviour, admin navigation, and a behaviour checklist
for future regression testing.

## Tasks

- RC13-01: Remove card borders on homepage, show album names under photo
- RC13-02: Remove "Unpublished" text label from gallery dashboard (keep toggle icon only)
- RC13-03: Fix Published/Draft toggle label width shift
- RC13-04: Add Appearance link to admin sidebar navigation
- RC13-05: Add behaviour checklist to tracking docs

## Review findings addressed

- H1: Admin Appearance page has no sidebar navigation link → RC13-04
- H2: Dashboard blog toggle label has no fixed width → RC13-03
- H3: Gallery "Unpublished" chip buried in card header → RC13-02
- M1: AlbumCard borderRadius: 0 creates visual inconsistency → RC13-01
- User request: album names under photo on homepage → RC13-01
- User request: behaviour checklist → RC13-05

## Deferred / Won't fix this cycle

- M2: Recipes list no status column — separate task if prioritised
- M3: Appearance page code duplication — large refactor, deferred
- M4: Inconsistent API response shapes — works via fallback, deferred
- M5: Blog toggle sends body that server ignores — low risk, deferred
- L1–L5: Low priority items, deferred
