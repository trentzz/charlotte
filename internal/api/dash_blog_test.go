package api_test

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/trentzz/charlotte/internal/middleware"
	"github.com/trentzz/charlotte/internal/models"
)

// TestDashBlogListEmpty verifies that listing returns an empty array for a new user.
func TestDashBlogListEmpty(t *testing.T) {
	app, db := newApp(t)
	u := createUser(t, db, "alice", "hunter12")

	mux := http.NewServeMux()
	mux.Handle("GET /api/v1/dashboard/blog",
		middleware.AuthChain(db)(http.HandlerFunc(app.DashBlogList)))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/dashboard/blog", nil)
	addSessionCookie(t, db, req, u.ID)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusOK)

	var data []any
	decodeData(t, rec, &data)
	if len(data) != 0 {
		t.Errorf("expected empty list, got %d items", len(data))
	}
}

// TestDashBlogListRequiresAuth verifies that unauthenticated requests get 401.
func TestDashBlogListRequiresAuth(t *testing.T) {
	app, db := newApp(t)

	mux := http.NewServeMux()
	mux.Handle("GET /api/v1/dashboard/blog",
		middleware.AuthChain(db)(http.HandlerFunc(app.DashBlogList)))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/dashboard/blog", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusUnauthorized)
}

// TestDashBlogCreate verifies that creating a post returns 201 with the post data.
func TestDashBlogCreate(t *testing.T) {
	app, db := newApp(t)
	u := createUser(t, db, "alice", "hunter12")

	mux := http.NewServeMux()
	mux.Handle("POST /api/v1/dashboard/blog",
		middleware.AuthChain(db)(http.HandlerFunc(app.DashBlogCreate)))

	body := jsonBody(t, map[string]any{
		"title":     "My First Post",
		"body":      "Hello, world!",
		"published": false,
		"tags":      []string{"go", "testing"},
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/dashboard/blog", body)
	req.Header.Set("Content-Type", "application/json")
	addSessionCookie(t, db, req, u.ID)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusCreated)

	var data map[string]any
	decodeData(t, rec, &data)

	if data["title"] != "My First Post" {
		t.Errorf("title = %v, want 'My First Post'", data["title"])
	}
	if data["published"] != false {
		t.Errorf("published = %v, want false", data["published"])
	}
	if data["slug"] == "" {
		t.Error("slug should not be empty")
	}
}

// TestDashBlogCreateMissingTitle verifies that an empty title returns 422.
func TestDashBlogCreateMissingTitle(t *testing.T) {
	app, db := newApp(t)
	u := createUser(t, db, "alice", "hunter12")

	mux := http.NewServeMux()
	mux.Handle("POST /api/v1/dashboard/blog",
		middleware.AuthChain(db)(http.HandlerFunc(app.DashBlogCreate)))

	body := jsonBody(t, map[string]any{
		"title": "",
		"body":  "No title here.",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/dashboard/blog", body)
	req.Header.Set("Content-Type", "application/json")
	addSessionCookie(t, db, req, u.ID)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusUnprocessableEntity)
}

// TestDashBlogGet verifies that getting a single owned post works.
func TestDashBlogGet(t *testing.T) {
	app, db := newApp(t)
	u := createUser(t, db, "alice", "hunter12")

	postID, err := models.CreatePost(db, &models.Post{
		UserID:    u.ID,
		Title:     "Test Post",
		Slug:      "test-post",
		Body:      "Body text.",
		Published: false,
		Tags:      []string{},
	})
	if err != nil {
		t.Fatalf("create post: %v", err)
	}

	mux := http.NewServeMux()
	mux.Handle("GET /api/v1/dashboard/blog/{id}",
		middleware.AuthChain(db)(http.HandlerFunc(app.DashBlogGet)))

	req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/dashboard/blog/%d", postID), nil)
	addSessionCookie(t, db, req, u.ID)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusOK)

	var data map[string]any
	decodeData(t, rec, &data)
	if data["title"] != "Test Post" {
		t.Errorf("title = %v, want 'Test Post'", data["title"])
	}
}

// TestDashBlogGetNotOwned verifies that a user cannot get another user's post.
func TestDashBlogGetNotOwned(t *testing.T) {
	app, db := newApp(t)
	alice := createUser(t, db, "alice", "hunter12")
	bob := createUser(t, db, "bob", "hunter12")

	postID, err := models.CreatePost(db, &models.Post{
		UserID:    alice.ID,
		Title:     "Alice Post",
		Slug:      "alice-post",
		Body:      "Body.",
		Published: true,
		Tags:      []string{},
	})
	if err != nil {
		t.Fatalf("create post: %v", err)
	}

	mux := http.NewServeMux()
	mux.Handle("GET /api/v1/dashboard/blog/{id}",
		middleware.AuthChain(db)(http.HandlerFunc(app.DashBlogGet)))

	req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/dashboard/blog/%d", postID), nil)
	addSessionCookie(t, db, req, bob.ID)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	// Bob is not admin so should get forbidden.
	assertStatus(t, rec, http.StatusForbidden)
}

// TestDashBlogUpdate verifies that a post can be updated.
func TestDashBlogUpdate(t *testing.T) {
	app, db := newApp(t)
	u := createUser(t, db, "alice", "hunter12")

	postID, err := models.CreatePost(db, &models.Post{
		UserID:    u.ID,
		Title:     "Original Title",
		Slug:      "original-title",
		Body:      "Original body.",
		Published: false,
		Tags:      []string{},
	})
	if err != nil {
		t.Fatalf("create post: %v", err)
	}

	mux := http.NewServeMux()
	mux.Handle("PUT /api/v1/dashboard/blog/{id}",
		middleware.AuthChain(db)(http.HandlerFunc(app.DashBlogUpdate)))

	body := jsonBody(t, map[string]any{
		"title":     "Updated Title",
		"body":      "Updated body.",
		"published": true,
		"tags":      []string{"updated"},
	})
	req := httptest.NewRequest(http.MethodPut, fmt.Sprintf("/api/v1/dashboard/blog/%d", postID), body)
	req.Header.Set("Content-Type", "application/json")
	addSessionCookie(t, db, req, u.ID)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusOK)

	var data map[string]any
	decodeData(t, rec, &data)
	if data["title"] != "Updated Title" {
		t.Errorf("title = %v, want 'Updated Title'", data["title"])
	}
	if data["published"] != true {
		t.Errorf("published = %v, want true", data["published"])
	}
}

// TestDashBlogToggle verifies that toggle flips the published state.
func TestDashBlogToggle(t *testing.T) {
	app, db := newApp(t)
	u := createUser(t, db, "alice", "hunter12")

	postID, err := models.CreatePost(db, &models.Post{
		UserID:    u.ID,
		Title:     "Toggle Test",
		Slug:      "toggle-test",
		Body:      "Body.",
		Published: false,
		Tags:      []string{},
	})
	if err != nil {
		t.Fatalf("create post: %v", err)
	}

	mux := http.NewServeMux()
	mux.Handle("PATCH /api/v1/dashboard/blog/{id}/toggle",
		middleware.AuthChain(db)(http.HandlerFunc(app.DashBlogToggle)))

	req := httptest.NewRequest(http.MethodPatch, fmt.Sprintf("/api/v1/dashboard/blog/%d/toggle", postID), nil)
	addSessionCookie(t, db, req, u.ID)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusOK)

	var data map[string]any
	decodeData(t, rec, &data)
	if data["published"] != true {
		t.Errorf("published = %v after toggle, want true", data["published"])
	}
}

// TestDashBlogDelete verifies that a post can be deleted.
func TestDashBlogDelete(t *testing.T) {
	app, db := newApp(t)
	u := createUser(t, db, "alice", "hunter12")

	postID, err := models.CreatePost(db, &models.Post{
		UserID:    u.ID,
		Title:     "Delete Me",
		Slug:      "delete-me",
		Body:      "Body.",
		Published: false,
		Tags:      []string{},
	})
	if err != nil {
		t.Fatalf("create post: %v", err)
	}

	mux := http.NewServeMux()
	mux.Handle("DELETE /api/v1/dashboard/blog/{id}",
		middleware.AuthChain(db)(http.HandlerFunc(app.DashBlogDelete)))

	req := httptest.NewRequest(http.MethodDelete, fmt.Sprintf("/api/v1/dashboard/blog/%d", postID), nil)
	addSessionCookie(t, db, req, u.ID)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusOK)

	// Confirm the post no longer exists.
	_, err = models.GetPostByID(db, postID)
	if err == nil {
		t.Error("post still exists after delete")
	}
}

// TestDashBlogListIncludesDrafts verifies that listing returns both published and
// draft posts for the owner.
func TestDashBlogListIncludesDrafts(t *testing.T) {
	app, db := newApp(t)
	u := createUser(t, db, "alice", "hunter12")

	for _, title := range []string{"Published Post", "Draft Post"} {
		pub := title == "Published Post"
		_, err := models.CreatePost(db, &models.Post{
			UserID: u.ID, Title: title,
			Slug: title, Body: "Body.", Published: pub, Tags: []string{},
		})
		if err != nil {
			t.Fatalf("create post %q: %v", title, err)
		}
	}

	mux := http.NewServeMux()
	mux.Handle("GET /api/v1/dashboard/blog",
		middleware.AuthChain(db)(http.HandlerFunc(app.DashBlogList)))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/dashboard/blog", nil)
	addSessionCookie(t, db, req, u.ID)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	assertStatus(t, rec, http.StatusOK)

	var data []any
	decodeData(t, rec, &data)
	if len(data) != 2 {
		t.Errorf("expected 2 posts, got %d", len(data))
	}
}
