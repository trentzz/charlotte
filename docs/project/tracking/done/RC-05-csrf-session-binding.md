# RC-05: Bind CSRF token to session

**Priority**: high  
**Epic**: REVIEW-CYCLE-2026-04-05

## Goal

The CSRF token should be tied to the current session so it is invalidated on logout and cannot be reused across sessions.

## Finding

The CSRF cookie is a standalone cookie unrelated to the session. Logging out and logging in as a different user reuses the same CSRF token. The double-submit cookie pattern weakens if an attacker can write cookies to the domain.

## Success Criteria

- [ ] On login, a fresh CSRF token is generated and stored (either derived from the session or stored server-side per session).
- [ ] On logout, the CSRF token is cleared/invalidated.
- [ ] The CSRF token changes between sessions for the same user.
- [ ] Existing CSRF validation logic still works correctly for authenticated requests.
- [ ] `/update` has been run after changes.
