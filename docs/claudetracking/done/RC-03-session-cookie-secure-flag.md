# RC-03: Set Secure flag on session cookie

**Priority**: high  
**Epic**: REVIEW-CYCLE-2026-04-05

## Goal

The session cookie must respect the same `CHARLOTTE_SECURE_COOKIES` environment variable that the CSRF cookie already uses.

## Finding

`SetSessionCookie()` in `internal/auth/session.go` never sets `Secure: true`. The CSRF cookie reads `CHARLOTTE_SECURE_COOKIES` env var, but the session cookie ignores it entirely. In production behind HTTPS, the session cookie will be sent over plain HTTP connections.

## Success Criteria

- [ ] `SetSessionCookie` reads `CHARLOTTE_SECURE_COOKIES` (same as CSRF middleware) and sets `Secure: true` when it is set.
- [ ] Pattern is consistent with the CSRF cookie implementation.
- [ ] `/update` has been run after changes.
