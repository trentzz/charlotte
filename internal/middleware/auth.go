// Package middleware provides HTTP middleware for authentication, CSRF, and rate limiting.
package middleware

import (
	"context"
	"database/sql"
	"net/http"

	"github.com/trentzz/charlotte/internal/auth"
	"github.com/trentzz/charlotte/internal/models"
)

// ctxKey is the private context key type to avoid collisions.
type ctxKey string

const (
	// CtxUser is the context key for the authenticated *models.User (may be nil).
	CtxUser ctxKey = "user"
	// CtxSession is the context key for the active *models.Session (may be nil).
	CtxSession ctxKey = "session"
)

// UserFromContext returns the current user from the request context, or nil.
func UserFromContext(ctx context.Context) *models.User {
	u, _ := ctx.Value(CtxUser).(*models.User)
	return u
}

// InjectUser reads the session cookie and, if valid, injects the user and session
// into the request context. Safe to use on public routes.
func InjectUser(db *sql.DB, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sess, user, _ := auth.SessionFromRequest(db, r)
		ctx := context.WithValue(r.Context(), CtxUser, user)
		ctx = context.WithValue(ctx, CtxSession, sess)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireAuth returns a JSON 401 if there is no authenticated user in the context.
// It must be chained after InjectUser.
func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := UserFromContext(r.Context())
		if user == nil {
			w.Header().Set("Content-Type", "application/json")
			http.Error(w, `{"error":"authentication required"}`, http.StatusUnauthorized)
			return
		}
		if !user.IsActive() {
			w.Header().Set("Content-Type", "application/json")
			http.Error(w, `{"error":"your account is pending approval"}`, http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// RequireAdmin returns a JSON 403 if the user is not an admin.
// Must be chained after InjectUser and RequireAuth.
func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := UserFromContext(r.Context())
		if user == nil || !user.IsAdmin() {
			w.Header().Set("Content-Type", "application/json")
			http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// chain builds a middleware chain: chain(a, b, c)(h) == a(b(c(h))).
func chain(middlewares ...func(http.Handler) http.Handler) func(http.Handler) http.Handler {
	return func(final http.Handler) http.Handler {
		for i := len(middlewares) - 1; i >= 0; i-- {
			final = middlewares[i](final)
		}
		return final
	}
}

// AuthChain is a convenience chain for authenticated-only routes (InjectUser → RequireAuth).
func AuthChain(db *sql.DB) func(http.Handler) http.Handler {
	return chain(
		func(next http.Handler) http.Handler { return InjectUser(db, next) },
		RequireAuth,
	)
}

// AdminChain is a convenience chain for admin-only routes.
func AdminChain(db *sql.DB) func(http.Handler) http.Handler {
	return chain(
		func(next http.Handler) http.Handler { return InjectUser(db, next) },
		RequireAuth,
		RequireAdmin,
	)
}

// PublicChain wraps a handler with InjectUser only (no auth required).
func PublicChain(db *sql.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return InjectUser(db, next)
	}
}
