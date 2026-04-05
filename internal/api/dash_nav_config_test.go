package api_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/trentzz/charlotte/internal/middleware"
)

// TestDashNavConfigGetRequiresAuth verifies that an unauthenticated request returns 401.
func TestDashNavConfigGetRequiresAuth(t *testing.T) {
	app, db := newApp(t)

	mux := http.NewServeMux()
	mux.Handle("GET /api/v1/dashboard/nav-config",
		middleware.AuthChain(db)(http.HandlerFunc(app.DashNavConfigGet)))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/dashboard/nav-config", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusUnauthorized)
}

// TestDashNavConfigGet verifies that the nav config endpoint returns the expected shape.
func TestDashNavConfigGet(t *testing.T) {
	app, db := newApp(t)
	u := createUser(t, db, "alice", "hunter12")

	mux := http.NewServeMux()
	mux.Handle("GET /api/v1/dashboard/nav-config",
		middleware.AuthChain(db)(http.HandlerFunc(app.DashNavConfigGet)))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/dashboard/nav-config", nil)
	addSessionCookie(t, db, req, u.ID)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusOK)

	var data map[string]any
	decodeData(t, rec, &data)

	if _, ok := data["nav_config"]; !ok {
		t.Error("response missing 'nav_config' field")
	}
	available, ok := data["available"].(map[string]any)
	if !ok {
		t.Fatal("response missing 'available' field or wrong type")
	}
	for _, key := range []string{"blog", "projects", "gallery", "recipes"} {
		if _, ok := available[key]; !ok {
			t.Errorf("available missing key %q", key)
		}
	}
}

// TestDashNavConfigSave verifies that a valid nav config JSON can be saved.
func TestDashNavConfigSave(t *testing.T) {
	app, db := newApp(t)
	u := createUser(t, db, "alice", "hunter12")

	mux := http.NewServeMux()
	mux.Handle("PUT /api/v1/dashboard/nav-config",
		middleware.AuthChain(db)(http.HandlerFunc(app.DashNavConfigSave)))

	body := jsonBody(t, map[string]string{
		"nav_config": `{"pinned":[]}`,
	})
	req := httptest.NewRequest(http.MethodPut, "/api/v1/dashboard/nav-config", body)
	req.Header.Set("Content-Type", "application/json")
	addSessionCookie(t, db, req, u.ID)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusNoContent)
}

// TestDashNavConfigSaveInvalidJSON verifies that malformed JSON returns 400.
func TestDashNavConfigSaveInvalidJSON(t *testing.T) {
	app, db := newApp(t)
	u := createUser(t, db, "alice", "hunter12")

	mux := http.NewServeMux()
	mux.Handle("PUT /api/v1/dashboard/nav-config",
		middleware.AuthChain(db)(http.HandlerFunc(app.DashNavConfigSave)))

	body := jsonBody(t, map[string]string{
		"nav_config": `{not valid json`,
	})
	req := httptest.NewRequest(http.MethodPut, "/api/v1/dashboard/nav-config", body)
	req.Header.Set("Content-Type", "application/json")
	addSessionCookie(t, db, req, u.ID)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusBadRequest)
}

// TestDashNavConfigSaveRequiresAuth verifies that an unauthenticated PUT returns 401.
func TestDashNavConfigSaveRequiresAuth(t *testing.T) {
	app, db := newApp(t)

	mux := http.NewServeMux()
	mux.Handle("PUT /api/v1/dashboard/nav-config",
		middleware.AuthChain(db)(http.HandlerFunc(app.DashNavConfigSave)))

	body := jsonBody(t, map[string]string{
		"nav_config": `{}`,
	})
	req := httptest.NewRequest(http.MethodPut, "/api/v1/dashboard/nav-config", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusUnauthorized)
}

// TestDashNavConfigRoundTrip verifies that a saved config is reflected in the GET response.
func TestDashNavConfigRoundTrip(t *testing.T) {
	app, db := newApp(t)
	u := createUser(t, db, "alice", "hunter12")

	saveMux := http.NewServeMux()
	saveMux.Handle("PUT /api/v1/dashboard/nav-config",
		middleware.AuthChain(db)(http.HandlerFunc(app.DashNavConfigSave)))

	saveBody := jsonBody(t, map[string]string{
		"nav_config": `{"pinned":["blog"]}`,
	})
	saveReq := httptest.NewRequest(http.MethodPut, "/api/v1/dashboard/nav-config", saveBody)
	saveReq.Header.Set("Content-Type", "application/json")
	addSessionCookie(t, db, saveReq, u.ID)
	saveRec := httptest.NewRecorder()
	saveMux.ServeHTTP(saveRec, saveReq)
	assertStatus(t, saveRec, http.StatusNoContent)

	getMux := http.NewServeMux()
	getMux.Handle("GET /api/v1/dashboard/nav-config",
		middleware.AuthChain(db)(http.HandlerFunc(app.DashNavConfigGet)))

	getReq := httptest.NewRequest(http.MethodGet, "/api/v1/dashboard/nav-config", nil)
	addSessionCookie(t, db, getReq, u.ID)
	getRec := httptest.NewRecorder()
	getMux.ServeHTTP(getRec, getReq)
	assertStatus(t, getRec, http.StatusOK)

	var data map[string]any
	decodeData(t, getRec, &data)

	if data["nav_config"] != `{"pinned":["blog"]}` {
		t.Errorf("nav_config = %v, want {\"pinned\":[\"blog\"]}", data["nav_config"])
	}
}
