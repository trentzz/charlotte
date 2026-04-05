# RC-09: Apply appropriate body size limits per route

**Priority**: medium  
**Epic**: REVIEW-CYCLE-2026-04-05

## Goal

Non-upload JSON API endpoints should have a small body limit (e.g. 2 MB). Only file upload endpoints need the large 200 MB limit.

## Finding

`LimitBody` is set to 200 MB globally. Every JSON endpoint (login, settings, blog create, etc.) accepts up to 200 MB. An attacker can send large bodies to force server memory allocation.

## Success Criteria

- [ ] A default body limit of 2 MB (or similar small value) is applied to all routes.
- [ ] Upload routes (photo upload, etc.) have the larger limit applied specifically, via a per-route middleware or handler wrapper.
- [ ] Normal API flows (login, profile save, blog create, etc.) are unaffected.
- [ ] `/update` has been run after changes.
