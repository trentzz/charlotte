# Review Cycle — 2026-04-05

## Summary

Full codebase review by Opus. No vision directory exists. Review covered security,
correctness, usability, code quality, docs, and test coverage.

## High priority tasks
- RC14-01: Sanitise homepage widget content (H1 — stored XSS)
- RC14-02: Fix custom pages — sanitise body, 409 on slug collision, validate data_json, fix partial update wipe (H3a/b/c, L11)
- RC14-03: Show owner's draft posts/recipes in homepage widget lookup (M1)
- RC14-04: Log DB errors in profile endpoint instead of swallowing (M13)
- RC14-05: Add basic security headers (L12)
- RC14-06: Remove dead recipe UI fields (L1)
- RC14-07: Fix update scripts docker logs command (L14)
- RC14-08: Fix README upload limit documentation (L15)
- RC14-09: Replace deprecated MUI ListItem button in NavConfig (L20)
