package api_test

// testhelper_test.go — shared test utilities for the api package tests.
//
// Strategy: handlers are tested without the CSRF middleware to avoid needing
// X-CSRF-Token headers. For authenticated endpoints, a real session is created in
// the DB and the session cookie is attached to each request. The InjectUser
// middleware is applied so that UserFromContext works correctly inside handlers.

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/trentzz/charlotte/internal/api"
	"github.com/trentzz/charlotte/internal/auth"
	"github.com/trentzz/charlotte/internal/middleware"
	"github.com/trentzz/charlotte/internal/models"
	"github.com/trentzz/charlotte/internal/testutil"
)

// newApp creates an App with a fresh in-memory database.
func newApp(t *testing.T) (*api.App, *sql.DB) {
	t.Helper()
	db := testutil.NewTestDB(t)
	return &api.App{DB: db, DataDir: t.TempDir()}, db
}

// createUser registers a test user directly in the database.
// The first user created in a fresh DB becomes admin; subsequent users are active non-admins.
func createUser(t *testing.T, db *sql.DB, username, password string) *models.User {
	t.Helper()
	hash, err := auth.HashPassword(password)
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	count, _ := models.CountUsers(db)
	role := models.RoleUser
	status := models.StatusActive
	if count == 0 {
		role = models.RoleAdmin
	}
	u := &models.User{
		Username:        username,
		Email:           username + "@example.com",
		PasswordHash:    hash,
		Role:            role,
		Status:          status,
		FeatureBlog:     true,
		FeatureAbout:    true,
		FeatureGallery:  true,
		FeatureRecipes:  true,
		FeatureProjects: true,
	}
	id, err := models.CreateUser(db, u)
	if err != nil {
		t.Fatalf("create user: %v", err)
	}
	full, err := models.GetUserByID(db, id)
	if err != nil {
		t.Fatalf("get user: %v", err)
	}
	return full
}

// addSessionCookie creates a session for userID and sets the session cookie on req.
func addSessionCookie(t *testing.T, db *sql.DB, req *http.Request, userID int64) {
	t.Helper()
	rec := httptest.NewRecorder()
	sess, err := auth.NewSession(db, rec, userID)
	if err != nil {
		t.Fatalf("new session: %v", err)
	}
	req.AddCookie(&http.Cookie{
		Name:  auth.SessionCookieName,
		Value: sess.Token,
	})
}

// authHandler wraps h with InjectUser so that UserFromContext works inside handlers.
// It does NOT apply RequireAuth — that is done explicitly in tests that need it.
func authHandler(db *sql.DB, h http.Handler) http.Handler {
	return middleware.InjectUser(db, h)
}

// jsonBody encodes v as JSON and returns a ready reader plus Content-Type header setter.
func jsonBody(t *testing.T, v any) *bytes.Reader {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("marshal body: %v", err)
	}
	return bytes.NewReader(b)
}

// decodeData decodes the standard {"data": ...} envelope from a recorder and
// unmarshals the inner value into out.
func decodeData(t *testing.T, rec *httptest.ResponseRecorder, out any) {
	t.Helper()
	var env map[string]json.RawMessage
	if err := json.NewDecoder(strings.NewReader(rec.Body.String())).Decode(&env); err != nil {
		t.Fatalf("decode envelope: %v\nbody: %s", err, rec.Body.String())
	}
	raw, ok := env["data"]
	if !ok {
		t.Fatalf("no 'data' key in response: %s", rec.Body.String())
	}
	if err := json.Unmarshal(raw, out); err != nil {
		t.Fatalf("unmarshal data: %v", err)
	}
}

// assertStatus fails the test if the recorder status does not match want.
func assertStatus(t *testing.T, rec *httptest.ResponseRecorder, want int) {
	t.Helper()
	if rec.Code != want {
		t.Errorf("status = %d, want %d\nbody: %s", rec.Code, want, rec.Body.String())
	}
}
