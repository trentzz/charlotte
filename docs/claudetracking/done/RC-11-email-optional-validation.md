# RC-11: Make email optional with proper format validation

**Priority**: medium  
**Epic**: REVIEW-CYCLE-2026-04-05

## Goal

Email should be optional at registration and in profile settings. If provided, it must pass proper format validation (not just an `@` check). Add an email verification flow so users can confirm their address.

## Changes required

### Backend
- `internal/api/auth.go`: allow blank email in `Register`; if non-blank, validate with a proper regex (RFC 5321-ish, e.g. `^[^@\s]+@[^@\s]+\.[^@\s]+$`)
- `internal/models/user.go`: add `email_verified BOOLEAN DEFAULT 0` and `email_verify_token TEXT` columns via a new migration
- `internal/api/dash_profile.go`: same validation rule when updating profile email
- `internal/api/auth.go` or new handler: `GET /api/v1/verify-email?token=...` sets `email_verified = 1`
- `internal/api/dash_profile.go`: `POST /api/v1/dashboard/send-verification` sends verification email if SMTP is configured; returns a clear error if SMTP is not configured
- SMTP config read from env vars: `CHARLOTTE_SMTP_HOST`, `CHARLOTTE_SMTP_PORT`, `CHARLOTTE_SMTP_USER`, `CHARLOTTE_SMTP_PASS`, `CHARLOTTE_SMTP_FROM`

### Frontend
- Registration form: email field marked optional
- Profile settings: show "Verify email" button next to email field if email is set and not yet verified; show a verified badge if verified
- After clicking verify, show a toast: "Verification email sent" or "SMTP is not configured on this server"

## Success Criteria

- [ ] Registration succeeds with no email provided.
- [ ] Registration fails with a clear error if an invalid email format is provided.
- [ ] Profile update similarly accepts blank or valid email, rejects invalid format.
- [ ] New migration adds `email_verified` and `email_verify_token` columns.
- [ ] `GET /api/v1/verify-email?token=...` marks the email verified and redirects to the dashboard with a success message.
- [ ] `POST /api/v1/dashboard/send-verification` sends email if SMTP is configured, returns a friendly error if not.
- [ ] Frontend profile settings shows verified badge / verify button appropriately.
- [ ] `/update` has been run after changes.
