# RC12-01: Email verification fixes

**Priority**: critical
**Epic**: REVIEW-CYCLE-2026-04-05b

## Findings addressed

- **C-01**: Empty email stored in DB hits UNIQUE constraint — only one user can register without an email.
- **C-03**: Verification token never expires — tokens are valid forever.
- **H-01**: Verification email contains a relative URL (`/api/v1/verify-email?token=...`) — does not work in email clients.
- **L-03**: `Register()` does not rotate the CSRF token after auto-login (unlike `Login()`).

## Changes required

### Empty email uniqueness (C-01)
`internal/models/user.go` — change the `email` column behaviour: store `NULL` instead of `""` for missing email. Migration: `ALTER TABLE users ADD ...` is already done; need the INSERT to use `NULL` when email is blank. `GetUserByEmail` should never match `NULL`. Update `CreateUser` to pass `nil` when email is `""`.

### Token expiry (C-03)
- New migration: add `email_verify_token_expires_at INTEGER` column to `users`.
- `SetEmailVerifyToken` (models/user.go): set expiry to `time.Now().Add(24 * time.Hour).Unix()`.
- `GetUserByVerifyToken`: add `AND email_verify_token_expires_at > ?` with current unix timestamp.
- `VerifyEmail` handler: clear the expiry column when verifying.

### Absolute verification URL (H-01)
`internal/api/dash_profile.go`, `sendVerificationEmail()`: read `CHARLOTTE_BASE_URL` env var (e.g. `https://mysite.com`). Build link as `baseURL + "/api/v1/verify-email?token=" + token`. If `CHARLOTTE_BASE_URL` is unset, fall back to a relative URL but log a warning.

### CSRF rotation on registration (L-03)
`internal/api/auth.go`, `Register()`: after the auto-login block (where `SetSessionCookie` is called for the first admin), call `middleware.SetCSRFCookie(w)`.

## Success Criteria

- [ ] Registering without an email stores `NULL` not `""` in the DB; a second user can also register without email.
- [ ] Verification tokens expire after 24 hours; expired tokens return "invalid or expired token".
- [ ] Verification email link is absolute (uses `CHARLOTTE_BASE_URL`).
- [ ] `Register()` rotates the CSRF token after auto-login.
- [ ] `/update` has been run after changes.
