package api_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// TestRegisterFirstUser verifies that the first registration creates an admin
// account and returns the user in the response.
func TestRegisterFirstUser(t *testing.T) {
	app, _ := newApp(t)

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/auth/register", app.Register)

	body := jsonBody(t, map[string]string{
		"username": "alice",
		"email":    "alice@example.com",
		"password": "hunter12",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusCreated)

	var data map[string]any
	decodeData(t, rec, &data)

	if data["username"] != "alice" {
		t.Errorf("username = %v, want alice", data["username"])
	}
	if data["role"] != "admin" {
		t.Errorf("role = %v, want admin", data["role"])
	}
}

// TestRegisterSecondUserPending verifies that a second registration results in a
// pending account (no session cookie, message-only response).
func TestRegisterSecondUserPending(t *testing.T) {
	app, db := newApp(t)
	createUser(t, db, "alice", "hunter12")

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/auth/register", app.Register)

	body := jsonBody(t, map[string]string{
		"username": "bob",
		"email":    "bob@example.com",
		"password": "hunter12",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusCreated)

	var data map[string]string
	decodeData(t, rec, &data)
	if data["message"] == "" {
		t.Error("expected pending message, got empty string")
	}
}

// TestRegisterValidation verifies that invalid input returns 422.
func TestRegisterValidation(t *testing.T) {
	cases := []struct {
		name     string
		username string
		email    string
		password string
	}{
		{"short username", "ab", "a@b.com", "hunter12"},
		{"bad email", "charlie", "not-an-email", "hunter12"},
		{"short password", "charlie", "c@b.com", "abc"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			app, _ := newApp(t)
			mux := http.NewServeMux()
			mux.HandleFunc("POST /api/v1/auth/register", app.Register)

			body := jsonBody(t, map[string]string{
				"username": tc.username,
				"email":    tc.email,
				"password": tc.password,
			})
			req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", body)
			req.Header.Set("Content-Type", "application/json")
			rec := httptest.NewRecorder()
			mux.ServeHTTP(rec, req)

			assertStatus(t, rec, http.StatusUnprocessableEntity)
		})
	}
}

// TestRegisterDuplicate verifies that registering with an existing username
// returns 409 Conflict.
func TestRegisterDuplicate(t *testing.T) {
	app, db := newApp(t)
	createUser(t, db, "alice", "hunter12")

	// Re-open registration for second user (first user is admin, site settings absent → open).
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/auth/register", app.Register)

	body := jsonBody(t, map[string]string{
		"username": "alice",
		"email":    "alice2@example.com",
		"password": "hunter12",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusConflict)
}

// TestLoginSuccess verifies that correct credentials return the user.
func TestLoginSuccess(t *testing.T) {
	app, db := newApp(t)
	createUser(t, db, "alice", "hunter12")

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/auth/login", app.Login)

	body := jsonBody(t, map[string]string{
		"identifier": "alice",
		"password":   "hunter12",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusOK)

	var data map[string]any
	decodeData(t, rec, &data)
	if data["username"] != "alice" {
		t.Errorf("username = %v, want alice", data["username"])
	}
	// The response must include email.
	if _, ok := data["email"]; !ok {
		t.Error("response missing 'email' field")
	}
}

// TestLoginByEmail verifies that an email can be used as the identifier.
func TestLoginByEmail(t *testing.T) {
	app, db := newApp(t)
	createUser(t, db, "alice", "hunter12")

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/auth/login", app.Login)

	body := jsonBody(t, map[string]string{
		"identifier": "alice@example.com",
		"password":   "hunter12",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusOK)
}

// TestLoginWrongPassword verifies that a wrong password returns 401.
func TestLoginWrongPassword(t *testing.T) {
	app, db := newApp(t)
	createUser(t, db, "alice", "hunter12")

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/auth/login", app.Login)

	body := jsonBody(t, map[string]string{
		"identifier": "alice",
		"password":   "wrongpassword",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusUnauthorized)
}

// TestLoginUnknownUser verifies that an unknown username returns 401.
func TestLoginUnknownUser(t *testing.T) {
	app, _ := newApp(t)

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/auth/login", app.Login)

	body := jsonBody(t, map[string]string{
		"identifier": "nobody",
		"password":   "hunter12",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusUnauthorized)
}

// TestLogout verifies that the logout endpoint always returns 200.
func TestLogout(t *testing.T) {
	app, db := newApp(t)
	u := createUser(t, db, "alice", "hunter12")

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/auth/logout", app.Logout)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", nil)
	addSessionCookie(t, db, req, u.ID)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusOK)

	var data map[string]string
	decodeData(t, rec, &data)
	if data["message"] == "" {
		t.Error("expected logout message")
	}
}

// TestMeRequiresAuth verifies that /me returns 401 without a session.
func TestMeRequiresAuth(t *testing.T) {
	app, db := newApp(t)

	mux := http.NewServeMux()
	mux.Handle("GET /api/v1/auth/me",
		authHandler(db, http.HandlerFunc(app.Me)))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusUnauthorized)
}

// TestMeReturnsUser verifies that /me returns the authenticated user.
func TestMeReturnsUser(t *testing.T) {
	app, db := newApp(t)
	u := createUser(t, db, "alice", "hunter12")

	mux := http.NewServeMux()
	mux.Handle("GET /api/v1/auth/me",
		authHandler(db, http.HandlerFunc(app.Me)))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	addSessionCookie(t, db, req, u.ID)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusOK)

	var data map[string]any
	decodeData(t, rec, &data)
	if data["username"] != "alice" {
		t.Errorf("username = %v, want alice", data["username"])
	}
}

// TestLoginSetsCookie verifies that a successful login sets the session cookie.
func TestLoginSetsCookie(t *testing.T) {
	app, db := newApp(t)
	createUser(t, db, "alice", "hunter12")

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/auth/login", app.Login)

	body := jsonBody(t, map[string]string{
		"identifier": "alice",
		"password":   "hunter12",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	found := false
	for _, c := range rec.Result().Cookies() {
		if c.Name == "charlotte_session" {
			found = true
			break
		}
	}
	if !found {
		t.Error("session cookie not set after login")
	}
}

// TestLoginPendingUser verifies that a pending account cannot log in.
func TestLoginPendingUser(t *testing.T) {
	app, db := newApp(t)
	// First user is admin/active.
	createUser(t, db, "alice", "hunter12")

	// Second user is pending.
	second := createUser(t, db, "bob", "hunter12")
	// Force pending status.
	_, err := db.Exec(`UPDATE users SET status = 'pending' WHERE id = ?`, second.ID)
	if err != nil {
		t.Fatalf("force pending: %v", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/auth/login", app.Login)

	body := jsonBody(t, map[string]string{
		"identifier": "bob",
		"password":   "hunter12",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusForbidden)
}
