# Review Cycle 2026-04-05b (second pass)

## Summary

Follow-up review after RC-01 through RC-11. 21 findings. Tasks created for actionable items.

## Tasks

- RC12-01: Email verification fixes (empty email constraint, token expiry, absolute URL)
- RC12-02: Feature flags not persisted on registration
- RC12-03: Font name validation (CSS injection)
- RC12-04: Admin project ownership check
- RC12-05: Quick fixes bundle (L-03, L-04, L-05, L-06, M-07)

## Deferred / Won't fix this cycle

- C-02: CSRF double-submit cookie architectural weakness — mitigated in RC-05 (token rotation on login/logout); full fix requires server-side session binding
- H-02: Admin audit trail — feature request, not a bug
- H-04: DashBlogList response shape inconsistency — works via fallback
- M-02: Multi-statement migration entries — existing pattern, risky to change without migration testing
- M-03: Recursive album delete for deeply nested albums — edge case, users can't create >1 level deep
- M-04: Homepage content picker silent errors — minor UX
- M-06: Suspended user sessions not invalidated — RequireAuth checks status on every request
- L-02: Recipe photos not batch-loaded in list view — no user-facing impact currently
