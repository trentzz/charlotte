package api_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// TestUserProfileFound verifies that a profile for an existing active user is returned.
func TestUserProfileFound(t *testing.T) {
	app, db := newApp(t)
	createUser(t, db, "alice", "hunter12")

	mux := http.NewServeMux()
	mux.Handle("GET /api/v1/u/{username}",
		authHandler(db, http.HandlerFunc(app.UserProfile)))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/u/alice", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusOK)

	var data map[string]any
	decodeData(t, rec, &data)

	profile, ok := data["profile"].(map[string]any)
	if !ok {
		t.Fatalf("profile missing or wrong type in response: %v", data)
	}
	if profile["username"] != "alice" {
		t.Errorf("profile.username = %v, want alice", profile["username"])
	}
}

// TestUserProfileShape verifies that all expected top-level keys are present.
func TestUserProfileShape(t *testing.T) {
	app, db := newApp(t)
	createUser(t, db, "alice", "hunter12")

	mux := http.NewServeMux()
	mux.Handle("GET /api/v1/u/{username}",
		authHandler(db, http.HandlerFunc(app.UserProfile)))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/u/alice", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusOK)

	var data map[string]any
	decodeData(t, rec, &data)

	expectedKeys := []string{
		"profile", "recent_posts", "recent_photos", "albums",
		"recent_recipes", "recent_projects", "custom_pages",
	}
	for _, k := range expectedKeys {
		if _, ok := data[k]; !ok {
			t.Errorf("response missing key %q", k)
		}
	}
}

// TestUserProfileNotFound verifies that an unknown username returns 404.
func TestUserProfileNotFound(t *testing.T) {
	app, db := newApp(t)

	mux := http.NewServeMux()
	mux.Handle("GET /api/v1/u/{username}",
		authHandler(db, http.HandlerFunc(app.UserProfile)))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/u/nobody", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusNotFound)
}

// TestUserProfilePendingUserHidden verifies that a pending user's profile is not public.
func TestUserProfilePendingUserHidden(t *testing.T) {
	app, db := newApp(t)
	// First user is admin.
	createUser(t, db, "alice", "hunter12")
	// Second user is active initially.
	bob := createUser(t, db, "bob", "hunter12")
	// Force to pending.
	if _, err := db.Exec(`UPDATE users SET status = 'pending' WHERE id = ?`, bob.ID); err != nil {
		t.Fatalf("force pending: %v", err)
	}

	mux := http.NewServeMux()
	mux.Handle("GET /api/v1/u/{username}",
		authHandler(db, http.HandlerFunc(app.UserProfile)))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/u/bob", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusNotFound)
}

// TestUserProfileEmptyLists verifies that list fields are arrays (not null)
// when there is no content.
func TestUserProfileEmptyLists(t *testing.T) {
	app, db := newApp(t)
	createUser(t, db, "alice", "hunter12")

	mux := http.NewServeMux()
	mux.Handle("GET /api/v1/u/{username}",
		authHandler(db, http.HandlerFunc(app.UserProfile)))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/u/alice", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusOK)

	var data map[string]any
	decodeData(t, rec, &data)

	for _, k := range []string{"recent_posts", "recent_photos", "albums", "recent_recipes", "recent_projects", "custom_pages"} {
		val, ok := data[k]
		if !ok {
			t.Errorf("missing key %q", k)
			continue
		}
		if _, isSlice := val.([]any); !isSlice {
			t.Errorf("key %q is not an array: %T", k, val)
		}
	}
}
