package api_test

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/trentzz/charlotte/internal/middleware"
	"github.com/trentzz/charlotte/internal/models"
)

// TestDashCustomPageListEmpty verifies that listing returns an empty pages array.
func TestDashCustomPageListEmpty(t *testing.T) {
	app, db := newApp(t)
	u := createUser(t, db, "alice", "hunter12")

	mux := http.NewServeMux()
	mux.Handle("GET /api/v1/dashboard/custom-pages",
		middleware.AuthChain(db)(http.HandlerFunc(app.DashCustomPageList)))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/dashboard/custom-pages", nil)
	addSessionCookie(t, db, req, u.ID)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusOK)

	var data map[string]any
	decodeData(t, rec, &data)

	pages, ok := data["pages"].([]any)
	if !ok {
		t.Fatalf("pages not an array: %v", data)
	}
	if len(pages) != 0 {
		t.Errorf("expected 0 pages, got %d", len(pages))
	}
}

// TestDashCustomPageListRequiresAuth verifies that 401 is returned without a session.
func TestDashCustomPageListRequiresAuth(t *testing.T) {
	app, db := newApp(t)

	mux := http.NewServeMux()
	mux.Handle("GET /api/v1/dashboard/custom-pages",
		middleware.AuthChain(db)(http.HandlerFunc(app.DashCustomPageList)))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/dashboard/custom-pages", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusUnauthorized)
}

// TestDashCustomPageCreate verifies that a new custom page can be created.
func TestDashCustomPageCreate(t *testing.T) {
	app, db := newApp(t)
	u := createUser(t, db, "alice", "hunter12")

	mux := http.NewServeMux()
	mux.Handle("POST /api/v1/dashboard/custom-pages",
		middleware.AuthChain(db)(http.HandlerFunc(app.DashCustomPageCreate)))

	body := jsonBody(t, map[string]string{
		"kind":  "now",
		"title": "What I'm doing now",
		"slug":  "now",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/dashboard/custom-pages", body)
	req.Header.Set("Content-Type", "application/json")
	addSessionCookie(t, db, req, u.ID)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusCreated)

	var data map[string]any
	decodeData(t, rec, &data)

	page, ok := data["page"].(map[string]any)
	if !ok {
		t.Fatalf("page not an object: %v", data)
	}
	if page["kind"] != "now" {
		t.Errorf("kind = %v, want now", page["kind"])
	}
	if page["slug"] != "now" {
		t.Errorf("slug = %v, want now", page["slug"])
	}
}

// TestDashCustomPageCreateUnknownKind verifies that an unknown kind returns 400.
func TestDashCustomPageCreateUnknownKind(t *testing.T) {
	app, db := newApp(t)
	u := createUser(t, db, "alice", "hunter12")

	mux := http.NewServeMux()
	mux.Handle("POST /api/v1/dashboard/custom-pages",
		middleware.AuthChain(db)(http.HandlerFunc(app.DashCustomPageCreate)))

	body := jsonBody(t, map[string]string{
		"kind": "nonsense",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/dashboard/custom-pages", body)
	req.Header.Set("Content-Type", "application/json")
	addSessionCookie(t, db, req, u.ID)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusBadRequest)
}

// TestDashCustomPageGet verifies that fetching a page by ID works.
func TestDashCustomPageGet(t *testing.T) {
	app, db := newApp(t)
	u := createUser(t, db, "alice", "hunter12")

	pageID, err := models.CreateCustomPage(db, &models.CustomPage{
		UserID:   u.ID,
		Kind:     "now",
		Format:   "freeform",
		Slug:     "now",
		Title:    "Now",
		DataJSON: "{}",
	})
	if err != nil {
		t.Fatalf("create custom page: %v", err)
	}

	mux := http.NewServeMux()
	mux.Handle("GET /api/v1/dashboard/custom-pages/{id}",
		middleware.AuthChain(db)(http.HandlerFunc(app.DashCustomPageGet)))

	req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/dashboard/custom-pages/%d", pageID), nil)
	addSessionCookie(t, db, req, u.ID)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusOK)

	var data map[string]any
	decodeData(t, rec, &data)

	page, ok := data["page"].(map[string]any)
	if !ok {
		t.Fatalf("page not an object: %v", data)
	}
	if page["slug"] != "now" {
		t.Errorf("slug = %v, want now", page["slug"])
	}
}

// TestDashCustomPageGetNotOwned verifies that fetching another user's page returns 404.
func TestDashCustomPageGetNotOwned(t *testing.T) {
	app, db := newApp(t)
	alice := createUser(t, db, "alice", "hunter12")
	bob := createUser(t, db, "bob", "hunter12")

	pageID, err := models.CreateCustomPage(db, &models.CustomPage{
		UserID:   alice.ID,
		Kind:     "now",
		Format:   "freeform",
		Slug:     "now",
		Title:    "Now",
		DataJSON: "{}",
	})
	if err != nil {
		t.Fatalf("create custom page: %v", err)
	}

	mux := http.NewServeMux()
	mux.Handle("GET /api/v1/dashboard/custom-pages/{id}",
		middleware.AuthChain(db)(http.HandlerFunc(app.DashCustomPageGet)))

	req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/dashboard/custom-pages/%d", pageID), nil)
	addSessionCookie(t, db, req, bob.ID)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusNotFound)
}

// TestDashCustomPageUpdate verifies that a page's title and body can be updated.
func TestDashCustomPageUpdate(t *testing.T) {
	app, db := newApp(t)
	u := createUser(t, db, "alice", "hunter12")

	pageID, err := models.CreateCustomPage(db, &models.CustomPage{
		UserID:   u.ID,
		Kind:     "now",
		Format:   "freeform",
		Slug:     "now",
		Title:    "Now",
		DataJSON: "{}",
	})
	if err != nil {
		t.Fatalf("create custom page: %v", err)
	}

	mux := http.NewServeMux()
	mux.Handle("PUT /api/v1/dashboard/custom-pages/{id}",
		middleware.AuthChain(db)(http.HandlerFunc(app.DashCustomPageUpdate)))

	body := jsonBody(t, map[string]string{
		"title": "Updated Now",
		"body":  "Currently working on tests.",
	})
	req := httptest.NewRequest(http.MethodPut, fmt.Sprintf("/api/v1/dashboard/custom-pages/%d", pageID), body)
	req.Header.Set("Content-Type", "application/json")
	addSessionCookie(t, db, req, u.ID)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusOK)

	var data map[string]any
	decodeData(t, rec, &data)

	page, ok := data["page"].(map[string]any)
	if !ok {
		t.Fatalf("page not an object: %v", data)
	}
	if page["title"] != "Updated Now" {
		t.Errorf("title = %v, want 'Updated Now'", page["title"])
	}
}

// TestDashCustomPageToggle verifies that toggle flips the published state.
func TestDashCustomPageToggle(t *testing.T) {
	app, db := newApp(t)
	u := createUser(t, db, "alice", "hunter12")

	pageID, err := models.CreateCustomPage(db, &models.CustomPage{
		UserID:   u.ID,
		Kind:     "now",
		Format:   "freeform",
		Slug:     "now",
		Title:    "Now",
		DataJSON: "{}",
	})
	if err != nil {
		t.Fatalf("create custom page: %v", err)
	}

	mux := http.NewServeMux()
	mux.Handle("PATCH /api/v1/dashboard/custom-pages/{id}/toggle",
		middleware.AuthChain(db)(http.HandlerFunc(app.DashCustomPageToggle)))

	req := httptest.NewRequest(http.MethodPatch, fmt.Sprintf("/api/v1/dashboard/custom-pages/%d/toggle", pageID), nil)
	addSessionCookie(t, db, req, u.ID)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusOK)

	var data map[string]any
	decodeData(t, rec, &data)

	page, ok := data["page"].(map[string]any)
	if !ok {
		t.Fatalf("page not an object: %v", data)
	}
	// Default is unpublished so toggle should make it published.
	if page["published"] != true {
		t.Errorf("published = %v after toggle, want true", page["published"])
	}
}

// TestDashCustomPageDelete verifies that a page can be deleted.
func TestDashCustomPageDelete(t *testing.T) {
	app, db := newApp(t)
	u := createUser(t, db, "alice", "hunter12")

	pageID, err := models.CreateCustomPage(db, &models.CustomPage{
		UserID:   u.ID,
		Kind:     "now",
		Format:   "freeform",
		Slug:     "now",
		Title:    "Now",
		DataJSON: "{}",
	})
	if err != nil {
		t.Fatalf("create custom page: %v", err)
	}

	mux := http.NewServeMux()
	mux.Handle("DELETE /api/v1/dashboard/custom-pages/{id}",
		middleware.AuthChain(db)(http.HandlerFunc(app.DashCustomPageDelete)))

	req := httptest.NewRequest(http.MethodDelete, fmt.Sprintf("/api/v1/dashboard/custom-pages/%d", pageID), nil)
	addSessionCookie(t, db, req, u.ID)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusNoContent)

	// Confirm the page no longer exists.
	_, err = models.GetCustomPageByID(db, pageID)
	if err == nil {
		t.Error("custom page still exists after delete")
	}
}
