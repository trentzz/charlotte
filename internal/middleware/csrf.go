package middleware

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"os"
)

const (
	// CSRFFieldName is the form field name for the CSRF token.
	CSRFFieldName = "_csrf"
	// csrfCookieName is the cookie that stores the token.
	csrfCookieName = "charlotte_csrf"
	// csrfCtxKey holds the token in the request context.
	csrfCtxKey ctxKey = "csrf"
)

// CSRFMiddleware generates a per-session CSRF token (stored in a cookie),
// injects it into the request context, and validates it on mutating requests.
func CSRFMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := csrfTokenFromRequest(r)
		if token == "" {
			token = generateCSRFToken()
			secure := os.Getenv("CHARLOTTE_SECURE_COOKIES") == "true"
			http.SetCookie(w, &http.Cookie{
				Name:     csrfCookieName,
				Value:    token,
				Path:     "/",
				HttpOnly: false, // JS does not need it; readable by forms via the cookie
				SameSite: http.SameSiteLaxMode,
				Secure:   secure,
			})
		}

		ctx := context.WithValue(r.Context(), csrfCtxKey, token)
		r = r.WithContext(ctx)

		// Validate on state-changing methods. The SPA sends the token via the
		// X-CSRF-Token header only — form field fallback is not supported.
		switch r.Method {
		case http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
			submitted := r.Header.Get("X-CSRF-Token")
			if submitted != token {
				w.Header().Set("Content-Type", "application/json")
				http.Error(w, `{"error":"invalid CSRF token"}`, http.StatusForbidden)
				return
			}
		}

		next.ServeHTTP(w, r)
	})
}

// CSRFToken returns the CSRF token from the request context.
// Returns "" if called outside of CSRFMiddleware.
func CSRFToken(r *http.Request) string {
	t, _ := r.Context().Value(csrfCtxKey).(string)
	return t
}

func csrfTokenFromRequest(r *http.Request) string {
	c, err := r.Cookie(csrfCookieName)
	if err != nil {
		return ""
	}
	return c.Value
}

func generateCSRFToken() string {
	b := make([]byte, 24)
	_, _ = rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}
